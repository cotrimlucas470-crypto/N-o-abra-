import { bus } from '../core/EventBus.js';
import { DEG } from '../core/MathUtils.js';

/**
 * Scene View — viewport de edição: pan, pinch zoom, seleção por toque e
 * ferramentas de mover / rotacionar / escalar.
 *
 * Performance: só redesenha quando algo muda (dirty flag). Parado, o editor
 * consome ~0% de GPU. Durante o arrasto, se `editorPriority` estiver ligado,
 * a resolução interna cai temporariamente para manter o toque responsivo.
 */
export class SceneView {
  constructor({ canvas, renderer, app }) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.app = app;
    this.view = { x: 0, y: 0, ppu: 48 };
    this.tool = 'select';
    this.dirty = true;
    this.showGrid = true;
    this.showGizmos = true;
    this._pointers = new Map();
    this._pinch = null;
    this._drag = null;
    this._lowResDuringDrag = false;

    canvas.addEventListener('pointerdown', (e) => this._onDown(e));
    canvas.addEventListener('pointermove', (e) => this._onMove(e));
    canvas.addEventListener('pointerup', (e) => this._onUp(e));
    canvas.addEventListener('pointercancel', (e) => this._onUp(e));
    canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    bus.on('scene:changed', () => this.markDirty());
  }

  markDirty() { this.dirty = true; }
  setTool(t) { this.tool = t; this.markDirty(); }

  resize() {
    if (this.renderer.resize(window.devicePixelRatio || 1)) this.markDirty();
  }

  frameSelection(objects) {
    let list = (objects && objects.length) ? objects : (this.app.scene ? Array.from(this.app.scene.byId.values()) : []);
    /* objetos só de UI não têm posição no mundo que valha enquadrar */
    const withBody = list.filter((go) => go.getComponent('SpriteRenderer') || go.getComponent('MeshRenderer'));
    if (withBody.length) list = withBody;
    if (!list.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const go of list) {
      const p = go.transform.getWorldPosition();
      const r = go.getComponent('SpriteRenderer') || go.getComponent('MeshRenderer');
      const s = go.transform.getWorldScale();
      const hw = r ? Math.abs(r.size.x * s.x) / 2 : 0.5;
      const hh = r ? Math.abs(r.size.y * s.y) / 2 : 0.5;
      minX = Math.min(minX, p.x - hw); maxX = Math.max(maxX, p.x + hw);
      minY = Math.min(minY, p.y - hh); maxY = Math.max(maxY, p.y + hh);
    }
    this.view.x = (minX + maxX) / 2;
    this.view.y = (minY + maxY) / 2;
    const w = Math.max(2, maxX - minX), h = Math.max(2, maxY - minY);
    const ppuX = this.renderer.cssWidth / w, ppuY = this.renderer.cssHeight / h;
    this.view.ppu = Math.max(14, Math.min(160, Math.min(ppuX, ppuY) * 0.85));
    this.markDirty();
  }

  zoom(factor, cx, cy) {
    const before = this.renderer.screenToWorld(cx ?? this.renderer.cssWidth / 2, cy ?? this.renderer.cssHeight / 2, this.view);
    this.view.ppu = Math.max(6, Math.min(400, this.view.ppu * factor));
    const after = this.renderer.screenToWorld(cx ?? this.renderer.cssWidth / 2, cy ?? this.renderer.cssHeight / 2, this.view);
    this.view.x += before.x - after.x;
    this.view.y += before.y - after.y;
    this.markDirty();
  }

  resetView() { this.view.x = 0; this.view.y = 0; this.view.ppu = 48; this.markDirty(); }

  /* ------------------------------ input ------------------------------ */

  _local(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _onDown(e) {
    this.canvas.setPointerCapture(e.pointerId);
    const p = this._local(e);
    this._pointers.set(e.pointerId, p);

    if (this._pointers.size === 2) {
      const [a, b] = Array.from(this._pointers.values());
      this._pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        view: { ...this.view },
      };
      this._drag = null;
      return;
    }

    const world = this.renderer.screenToWorld(p.x, p.y, this.view);
    const hit = this.hitTest(world.x, world.y);

    if (hit && this.tool !== 'pan') {
      this.app.select(hit.id, { additive: false });
      const t = hit.transform;
      this._drag = {
        mode: this.tool === 'select' ? 'move' : this.tool,
        go: hit,
        startWorld: world,
        startPos: { ...t.position },
        startRot: t.rotation.z,
        startScale: { ...t.scale },
        moved: false,
      };
      this._beginInteractive();
    } else {
      this._drag = { mode: 'pan', startScreen: p, startView: { ...this.view } };
      this._beginInteractive();
    }
  }

  _onMove(e) {
    if (!this._pointers.has(e.pointerId)) return;
    const p = this._local(e);
    this._pointers.set(e.pointerId, p);

    if (this._pinch && this._pointers.size >= 2) {
      const [a, b] = Array.from(this._pointers.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const scale = dist / Math.max(1, this._pinch.dist);
      this.view.ppu = Math.max(6, Math.min(400, this._pinch.view.ppu * scale));
      const dx = (center.x - this._pinch.center.x) / this.view.ppu;
      const dy = (center.y - this._pinch.center.y) / this.view.ppu;
      this.view.x = this._pinch.view.x - dx;
      this.view.y = this._pinch.view.y + dy;
      this.markDirty();
      return;
    }

    const d = this._drag;
    if (!d) return;

    if (d.mode === 'pan') {
      const dx = (p.x - d.startScreen.x) / this.view.ppu;
      const dy = (p.y - d.startScreen.y) / this.view.ppu;
      this.view.x = d.startView.x - dx;
      this.view.y = d.startView.y + dy;
      this.markDirty();
      return;
    }

    const world = this.renderer.screenToWorld(p.x, p.y, this.view);
    const t = d.go.transform;
    d.moved = true;

    if (d.mode === 'move') {
      const nx = d.startPos.x + (world.x - d.startWorld.x);
      const ny = d.startPos.y + (world.y - d.startWorld.y);
      t.position.x = e.shiftKey ? Math.round(nx * 2) / 2 : nx;
      t.position.y = e.shiftKey ? Math.round(ny * 2) / 2 : ny;
    } else if (d.mode === 'rotate') {
      const c = d.startPos;
      const a0 = Math.atan2(d.startWorld.y - c.y, d.startWorld.x - c.x);
      const a1 = Math.atan2(world.y - c.y, world.x - c.x);
      t.rotation.z = d.startRot + (a1 - a0) / DEG;
    } else if (d.mode === 'scale') {
      const d0 = Math.hypot(d.startWorld.x - d.startPos.x, d.startWorld.y - d.startPos.y) || 0.001;
      const d1 = Math.hypot(world.x - d.startPos.x, world.y - d.startPos.y);
      const f = Math.max(0.05, d1 / d0);
      t.scale.x = d.startScale.x * f;
      t.scale.y = d.startScale.y * f;
    }
    this.markDirty();
    this.app.inspector.syncValues();
  }

  _onUp(e) {
    this._pointers.delete(e.pointerId);
    if (this._pointers.size < 2) this._pinch = null;
    const d = this._drag;
    if (d && d.go && d.moved) {
      const t = d.go.transform;
      this.app.pushTransformUndo(d.go, {
        position: d.startPos, rotation: { ...t.rotation, z: d.startRot }, scale: d.startScale,
      });
      this.app.onSceneEdited();
    }
    this._drag = null;
    this._endInteractive();
  }

  _onWheel(e) {
    e.preventDefault();
    const p = this._local(e);
    this.zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, p.x, p.y);
  }

  _beginInteractive() {
    const q = this.app.quality.settings;
    if (!q.editorPriority || this._lowResDuringDrag) return;
    this._lowResDuringDrag = true;
    this.renderer.setResolutionScale(Math.max(0.6, this.renderer.resolutionScale * 0.75));
  }

  _endInteractive() {
    if (!this._lowResDuringDrag) return;
    this._lowResDuringDrag = false;
    const q = this.app.quality.settings;
    this.renderer.setResolutionScale(q.resolutionScale * (this.app.perf ? this.app.perf.dynScale : 1));
    this.markDirty();
  }

  /** Retorna o GameObject sob o ponto (topo primeiro). */
  hitTest(wx, wy) {
    const scene = this.app.scene;
    if (!scene) return null;
    const candidates = [];
    for (const type of ['SpriteRenderer', 'MeshRenderer']) {
      for (const r of scene.components(type)) {
        if (!r.enabled || !r.gameObject.activeInHierarchy) continue;
        candidates.push(r);
      }
    }
    candidates.sort((a, b) => (b.sortingOrder - a.sortingOrder) || (b.transform.position.z - a.transform.position.z));
    for (const r of candidates) {
      const t = r.transform;
      const p = t.getWorldPosition();
      const s = t.getWorldScale();
      const w = Math.abs(r.size.x * s.x) / 2;
      const h = Math.abs(r.size.y * s.y) / 2;
      const rot = -t.getWorldRotationZ() * DEG;
      const dx = wx - p.x, dy = wy - p.y;
      const c = Math.cos(-rot), sn = Math.sin(-rot);
      const lx = dx * c - dy * sn, ly = dx * sn + dy * c;
      if (Math.abs(lx) <= w && Math.abs(ly) <= h) return r.gameObject;
    }
    /* objetos sem renderer: tolerância fixa ao redor da origem */
    for (const go of scene.byId.values()) {
      if (go.getComponent('SpriteRenderer') || go.getComponent('MeshRenderer')) continue;
      const p = go.transform.getWorldPosition();
      if (Math.hypot(p.x - wx, p.y - wy) < 24 / this.view.ppu) return go;
    }
    return null;
  }

  render(force = false) {
    if (!this.dirty && !force) return false;
    this.dirty = false;
    this.renderer.render(this.app.scene, this.view, {
      grid: this.showGrid,
      gizmos: this.showGizmos,
      ui: 'outline',
      selection: this.app.selection,
      background: this.app.scene ? this.app.scene.settings.backgroundColor : '#12141a',
    });
    return true;
  }
}
