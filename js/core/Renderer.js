import { DEG, rgbaString, mixHex, hexToRgb } from './MathUtils.js';

/**
 * Renderer Canvas2D.
 *
 * Por que Canvas2D e não WebGL: no editor a maior parte do custo é UI + gizmos, e o
 * caminho 2D acelerado do Chrome no Android cobre com folga o volume de sprites deste
 * app, sem o custo de manter shaders/atlas. O renderer aplica as mesmas ideias de um
 * pipeline: culling, ordenação estável, batch por estado e contagem de draw calls.
 * (Fallback e limitações no README.)
 */
export class Renderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.assets = assets;
    this.resolutionScale = 1;
    this.dpr = 1;
    this.width = 0; this.height = 0;      // pixels do backbuffer
    this.cssWidth = 0; this.cssHeight = 0;
    this.quality = { shadows: 'low', antiAlias: 'medium', maxLights: 8 };
    this.stats = { drawCalls: 0, objects: 0, culled: 0, ms: 0 };
    this._sortable = [];
    this._lights = [];
    this._uiHit = [];
  }

  /** Ajusta o backbuffer ao tamanho CSS × DPR × resolutionScale. */
  resize(dpr = window.devicePixelRatio || 1) {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const scale = this.resolutionScale;
    const w = Math.max(1, Math.round(cssW * dpr * scale));
    const h = Math.max(1, Math.round(cssH * dpr * scale));
    this.cssWidth = cssW; this.cssHeight = cssH; this.dpr = dpr;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.width = w; this.height = h;
      return true;
    }
    this.width = w; this.height = h;
    return false;
  }

  setResolutionScale(s) {
    if (Math.abs(s - this.resolutionScale) < 0.01) return false;
    this.resolutionScale = s;
    return this.resize(this.dpr);
  }

  /** Converte pixels de tela (CSS) para coordenadas de mundo. */
  screenToWorld(px, py, view) {
    const ppu = view.ppu;
    return {
      x: view.x + (px - this.cssWidth / 2) / ppu,
      y: view.y - (py - this.cssHeight / 2) / ppu,
    };
  }

  worldToScreen(wx, wy, view) {
    const ppu = view.ppu;
    return {
      x: (wx - view.x) * ppu + this.cssWidth / 2,
      y: this.cssHeight / 2 - (wy - view.y) * ppu,
    };
  }

  /**
   * Desenha a cena.
   * @param {Scene} scene
   * @param {{x:number,y:number,ppu:number}} view
   * @param {object} opts { grid, gizmos, selection, ui, background }
   */
  render(scene, view, opts = {}) {
    const t0 = performance.now();
    const ctx = this.ctx;
    const stats = this.stats;
    stats.drawCalls = 0; stats.objects = 0; stats.culled = 0;

    const bufScale = (this.width / Math.max(1, this.cssWidth));
    ctx.setTransform(bufScale, 0, 0, bufScale, 0, 0);
    ctx.imageSmoothingEnabled = this.quality.antiAlias !== 'off';

    const W = this.cssWidth, H = this.cssHeight;
    ctx.fillStyle = opts.background || (scene && scene.settings.backgroundColor) || '#12141a';
    ctx.fillRect(0, 0, W, H);

    if (!scene) { stats.ms = performance.now() - t0; return; }

    if (opts.grid) this._drawGrid(ctx, view, W, H);

    /* --- coleta e ordenação --- */
    const list = this._sortable;
    list.length = 0;
    collectRenderables(scene, list);
    list.sort(sortRenderables);

    /* --- luzes --- */
    const lights = this._lights;
    lights.length = 0;
    for (const l of scene.components('Light')) {
      if (l.enabled && l.gameObject.activeInHierarchy) lights.push(l);
      if (lights.length >= this.quality.maxLights) break;
    }
    const ambient = scene.settings.ambientIntensity ?? 0.85;

    /* --- culling + desenho --- */
    const margin = 2;
    const half = { w: W / (2 * view.ppu) + margin, h: H / (2 * view.ppu) + margin };
    const pos = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const t = r.transform;
      t.getWorldPosition(pos);
      const b = r.getLocalBounds();
      if (pos.x + b.w < view.x - half.w || pos.x - b.w > view.x + half.w ||
          pos.y + b.h < view.y - half.h || pos.y - b.h > view.y + half.h) { stats.culled++; continue; }

      const s = this.worldToScreen(pos.x, pos.y, view);
      const rot = t.getWorldRotationZ();
      const scale = t.getWorldScale();
      ctx.save();
      ctx.translate(s.x, s.y);
      if (rot) ctx.rotate(-rot * DEG);

      if (r.type === 'SpriteRenderer') this._drawSprite(ctx, r, scale, view.ppu);
      else this._drawMesh(ctx, r, scale, view.ppu, lights, ambient, pos);

      ctx.restore();
      stats.objects++;
    }

    /* --- gizmos do editor --- */
    if (opts.gizmos) this._drawGizmos(ctx, scene, view, opts);

    /* --- UI em screen space --- */
    if (opts.ui !== false) this._drawUI(ctx, scene, W, H, opts);

    stats.ms = performance.now() - t0;
  }

  _drawGrid(ctx, view, W, H) {
    const ppu = view.ppu;
    let step = 1;
    while (step * ppu < 24) step *= 2;
    while (step * ppu > 120) step /= 2;
    const originX = W / 2 - view.x * ppu;
    const originY = H / 2 + view.y * ppu;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.beginPath();
    const startX = Math.floor((0 - originX) / (step * ppu)) * step * ppu + originX;
    for (let x = startX; x < W; x += step * ppu) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
    const startY = Math.floor((0 - originY) / (step * ppu)) * step * ppu + originY;
    for (let y = startY; y < H; y += step * ppu) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
    ctx.stroke();
    this.stats.drawCalls++;

    /* eixos */
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,107,107,0.55)';
    ctx.moveTo(0, originY); ctx.lineTo(W, originY); ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(107,212,127,0.55)';
    ctx.moveTo(originX, 0); ctx.lineTo(originX, H); ctx.stroke();
    this.stats.drawCalls += 2;
  }

  _drawSprite(ctx, sr, scale, ppu) {
    const w = Math.abs(sr.size.x * scale.x) * ppu;
    const h = Math.abs(sr.size.y * scale.y) * ppu;
    const img = sr.sprite ? this.assets.getImage(sr.sprite) : null;
    ctx.globalAlpha = sr.opacity;
    if (sr.flipX || sr.flipY) ctx.scale(sr.flipX ? -1 : 1, sr.flipY ? -1 : 1);

    if (img) {
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = sr.color;
      switch (sr.shape) {
        case 'circle':
          ctx.beginPath(); ctx.arc(0, 0, Math.min(w, h) / 2, 0, Math.PI * 2); ctx.fill(); break;
        case 'triangle':
          ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath(); ctx.fill(); break;
        case 'capsule': {
          const r = Math.min(w, h) / 2;
          roundRect(ctx, -w / 2, -h / 2, w, h, r); ctx.fill(); break;
        }
        default:
          ctx.fillRect(-w / 2, -h / 2, w, h);
      }
    }
    if (sr.outline) {
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = Math.max(1, ppu * 0.02);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    }
    ctx.globalAlpha = 1;
    this.stats.drawCalls++;
  }

  _drawMesh(ctx, mr, scale, ppu, lights, ambient, worldPos) {
    const mat = mr.material ? this.assets.get(mr.material) : null;
    const baseColor = (mat && mat.data && mat.data.color) || mr.color;
    const alpha = (mat && mat.data && mat.data.opacity != null) ? mat.data.opacity : 1;
    const emission = (mat && mat.data && mat.data.emission) || 0;
    const w = Math.abs(mr.size.x * scale.x) * ppu;
    const h = Math.abs(mr.size.y * scale.y) * ppu;
    const depth = Math.abs(mr.size.z * scale.z) * ppu * 0.4;

    let lightFactor = ambient + emission;
    if (mr.receiveLight) {
      for (const l of lights) {
        if (l.lightType === 'ambient') { lightFactor += l.intensity * 0.5; continue; }
        if (l.lightType === 'directional') { lightFactor += l.intensity * 0.35; continue; }
        const lp = l.transform.getWorldPosition();
        const d = Math.hypot(lp.x - worldPos.x, lp.y - worldPos.y);
        if (d < l.range) lightFactor += l.intensity * (1 - d / l.range) * 0.9;
      }
    } else {
      lightFactor = 1;
    }
    lightFactor = Math.max(0.15, Math.min(2.2, lightFactor));

    const tex = (mat && mat.data && mat.data.texture) ? this.assets.getImage(mat.data.texture) : null;
    ctx.globalAlpha = alpha;

    if (mr.mesh === 'sphere') {
      const r = Math.min(w, h) / 2;
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      g.addColorStop(0, mixHex(baseColor, lightFactor * 1.25));
      g.addColorStop(1, mixHex(baseColor, lightFactor * 0.6));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      this.stats.drawCalls++;
    } else if (mr.mesh === 'pyramid') {
      ctx.fillStyle = mixHex(baseColor, lightFactor);
      ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = mixHex(baseColor, lightFactor * 0.7);
      ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(-w / 2, h / 2); ctx.lineTo(-w / 2 + depth, h / 2 - depth); ctx.closePath(); ctx.fill();
      this.stats.drawCalls += 2;
    } else if (mr.mesh === 'plane') {
      ctx.fillStyle = tex ? ctx.createPattern(tex, 'repeat') : mixHex(baseColor, lightFactor);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      this.stats.drawCalls++;
    } else {
      /* cube: face frontal + duas faces em perspectiva oblíqua */
      if (depth > 1) {
        ctx.fillStyle = mixHex(baseColor, lightFactor * 0.72);
        ctx.beginPath();
        ctx.moveTo(w / 2, -h / 2); ctx.lineTo(w / 2 + depth, -h / 2 - depth);
        ctx.lineTo(w / 2 + depth, h / 2 - depth); ctx.lineTo(w / 2, h / 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = mixHex(baseColor, lightFactor * 1.18);
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2 + depth, -h / 2 - depth);
        ctx.lineTo(w / 2 + depth, -h / 2 - depth); ctx.lineTo(w / 2, -h / 2);
        ctx.closePath(); ctx.fill();
        this.stats.drawCalls += 2;
      }
      if (tex) ctx.drawImage(tex, -w / 2, -h / 2, w, h);
      else { ctx.fillStyle = mixHex(baseColor, lightFactor); ctx.fillRect(-w / 2, -h / 2, w, h); }
      this.stats.drawCalls++;
    }
    ctx.globalAlpha = 1;
  }

  _drawGizmos(ctx, scene, view, opts) {
    const sel = opts.selection || [];
    const ppu = view.ppu;

    /* colliders */
    if (opts.showColliders !== false) {
      ctx.strokeStyle = 'rgba(61,220,132,0.5)';
      ctx.lineWidth = 1;
      for (const col of scene.components('Collider')) {
        if (!col.enabled || !col.gameObject.activeInHierarchy) continue;
        const b = col.updateBounds();
        const p = this.worldToScreen(b.cx, b.cy, view);
        if (col.shape === 'circle') {
          ctx.beginPath(); ctx.arc(p.x, p.y, b.hw * ppu, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.strokeRect(p.x - b.hw * ppu, p.y - b.hh * ppu, b.hw * 2 * ppu, b.hh * 2 * ppu);
        }
        this.stats.drawCalls++;
      }
    }

    /* câmeras e luzes */
    for (const cam of scene.components('Camera')) {
      if (!cam.gameObject.activeInHierarchy) continue;
      const p = cam.transform.getWorldPosition();
      const s = this.worldToScreen(p.x, p.y, view);
      const halfH = cam.orthographicSize * ppu;
      const halfW = halfH * (this.cssWidth / Math.max(1, this.cssHeight));
      ctx.strokeStyle = 'rgba(74,168,255,0.7)';
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(s.x - halfW, s.y - halfH, halfW * 2, halfH * 2);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(74,168,255,0.9)';
      ctx.fillText('▣ ' + cam.gameObject.name, s.x - halfW + 4, s.y - halfH + 12);
      this.stats.drawCalls += 2;
    }
    for (const l of scene.components('Light')) {
      if (!l.gameObject.activeInHierarchy) continue;
      const p = l.transform.getWorldPosition();
      const s = this.worldToScreen(p.x, p.y, view);
      ctx.strokeStyle = rgbaString(l.color, 0.5);
      ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(6, l.range * ppu), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = l.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
      this.stats.drawCalls += 2;
    }

    /* seleção */
    for (const go of sel) {
      if (!go || go._destroyed) continue;
      const p = go.transform.getWorldPosition();
      const s = this.worldToScreen(p.x, p.y, view);
      const r = go.getComponent('SpriteRenderer') || go.getComponent('MeshRenderer');
      const sc = go.transform.getWorldScale();
      const w = (r ? Math.abs(r.size.x * sc.x) : 1) * ppu;
      const h = (r ? Math.abs(r.size.y * sc.y) : 1) * ppu;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(-go.transform.getWorldRotationZ() * DEG);
      ctx.strokeStyle = '#ff7a3d';
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#ff7a3d';
      for (const [hx, hy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.fillRect(hx * w / 2 - 3, hy * h / 2 - 3, 6, 6);
      }
      ctx.restore();

      /* eixos de movimento */
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ff6b6b';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 42, s.y); ctx.stroke();
      ctx.strokeStyle = '#6bd47f';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y - 42); ctx.stroke();
      this.stats.drawCalls += 3;
    }
  }

  /** Desenha UIElements e devolve a lista para hit-test. */
  _drawUI(ctx, scene, W, H, opts) {
    const hits = this._uiHit;
    hits.length = 0;
    const items = [];
    for (const ui of scene.components('UIElement')) {
      if (!ui.enabled || !ui.gameObject.activeInHierarchy) continue;
      items.push(ui);
    }
    if (!items.length) return hits;
    items.sort((a, b) => (a.gameObject.transform.position.z || 0) - (b.gameObject.transform.position.z || 0));

    const outlineOnly = opts.ui === 'outline';

    for (const ui of items) {
      const r = ui.computeRect(W, H);
      hits.push(ui);

      if (outlineOnly) {
        /* Na Scene View a UI aparece como moldura + nome: assim ela não cobre as
           ferramentas do editor, e continua sendo desenhada de verdade na Game View. */
        ctx.save();
        ctx.strokeStyle = 'rgba(255,122,61,0.5)';
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,122,61,0.75)';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText(`${ui.kind}: ${ui.gameObject.name}`, r.x + 4, r.y + 3, Math.max(40, r.w - 8));
        ctx.restore();
        this.stats.drawCalls += 2;
        continue;
      }
      ctx.save();
      ctx.globalAlpha = ui.opacity;

      const bg = ui.kind === 'text' ? null : ui.background;
      if (bg) {
        ctx.fillStyle = ui._pressed ? mixHex(bg, 1.35) : bg;
        roundRect(ctx, r.x, r.y, r.w, r.h, ui.radius);
        ctx.fill();
        this.stats.drawCalls++;
      }

      if (ui.kind === 'image' && ui.image) {
        const img = this.assets.getImage(ui.image);
        if (img) { ctx.drawImage(img, r.x, r.y, r.w, r.h); this.stats.drawCalls++; }
      }

      if (ui.kind === 'slider') {
        const t = (ui.value - ui.min) / Math.max(1e-6, ui.max - ui.min);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        roundRect(ctx, r.x + 8, r.y + r.h / 2 - 3, r.w - 16, 6, 3); ctx.fill();
        ctx.fillStyle = '#ff7a3d';
        roundRect(ctx, r.x + 8, r.y + r.h / 2 - 3, (r.w - 16) * t, 6, 3); ctx.fill();
        ctx.beginPath(); ctx.arc(r.x + 8 + (r.w - 16) * t, r.y + r.h / 2, 9, 0, Math.PI * 2); ctx.fill();
        this.stats.drawCalls += 3;
      }

      if (ui.kind === 'toggle') {
        const on = ui.value >= 0.5;
        ctx.fillStyle = on ? '#3ddc84' : 'rgba(255,255,255,0.16)';
        roundRect(ctx, r.x + 6, r.y + r.h / 2 - 11, 42, 22, 11); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(r.x + 6 + (on ? 31 : 11), r.y + r.h / 2, 9, 0, Math.PI * 2); ctx.fill();
        this.stats.drawCalls += 2;
      }

      if (ui.text && ui.kind !== 'image') {
        ctx.fillStyle = ui.color;
        ctx.font = `${ui.kind === 'button' ? '600 ' : ''}${ui.fontSize}px system-ui, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = ui.align === 'center' ? 'center' : ui.align === 'right' ? 'right' : 'left';
        const tx = ui.align === 'center' ? r.x + r.w / 2 : ui.align === 'right' ? r.x + r.w - 10 : r.x + (ui.kind === 'text' ? 0 : 12) + (ui.kind === 'toggle' ? 52 : 0);
        const label = ui.kind === 'input' ? (ui.text || '') : ui.text;
        ctx.fillText(label, tx, r.y + r.h / 2, r.w);
        this.stats.drawCalls++;
      }

      if (opts.gizmos) {
        ctx.strokeStyle = 'rgba(255,122,61,0.35)';
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
    return hits;
  }

  get uiHitList() { return this._uiHit; }
}

function collectRenderables(scene, out) {
  for (const c of scene.components('SpriteRenderer')) {
    if (c.enabled && c.gameObject.activeInHierarchy) out.push(c);
  }
  for (const c of scene.components('MeshRenderer')) {
    if (c.enabled && c.gameObject.activeInHierarchy) out.push(c);
  }
  return out;
}

function sortRenderables(a, b) {
  if (a.sortingOrder !== b.sortingOrder) return a.sortingOrder - b.sortingOrder;
  const az = a.transform.position.z, bz = b.transform.position.z;
  if (az !== bz) return az - bz;
  return b.transform.position.y - a.transform.position.y;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export { roundRect, hexToRgb };
