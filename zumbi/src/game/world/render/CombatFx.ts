/**
 * Efeitos do combate (parte Phaser): arco do golpe, rastro e clarão do
 * tiro, poeira no impacto e uma barrinha de resistência sobre o alvo que
 * apanhou (some sozinha). Tudo curto e barato: um Graphics redesenhado.
 *
 * O que FICA no chão (respingo de sangue, furo de bala na parede) são
 * decalques com limite fixo: os mais velhos somem. Só visual — não vai para
 * o save. Texturas geradas em canvas (nada importado).
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { TEX } from '../../assets/AssetKeys';

interface Fx {
  kind: 'swing' | 'tracer' | 'flash' | 'bar' | 'casing';
  t: number;
  life: number;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  angle?: number;
  reach?: number;
  frac?: number;
  vx?: number;
  vy?: number;
  spin?: number;
}

/** Estilo do texto que sobe: onde pegou, cabeça, crítico, morte. */
export type NoteStyle = 'part' | 'head' | 'crit' | 'kill';

const NOTE_STYLE: Record<NoteStyle, { color: string; size: number; life: number }> = {
  part: { color: '#e4dccb', size: 13, life: 0.9 },
  head: { color: '#ff5a48', size: 18, life: 1.1 },
  crit: { color: '#ffd24a', size: 17, life: 1.2 },
  kill: { color: '#ff3a2a', size: 21, life: 1.5 },
};

const SPLAT_KEY = 'fx.splatter';
const SPLAT_VARIANTS = 4;
const HOLE_KEY = 'fx.bullethole';
/** Quantos respingos/furos ficam no mundo ao mesmo tempo. */
const MAX_SPLATS = 160;
const MAX_HOLES = 60;

/** Aleatório com semente (a textura sai igual toda vez). */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Respingo visto de cima: mancha no ponto do golpe e gotas espirrando para +x. */
function drawSplatter(ctx: CanvasRenderingContext2D, ox: number, size: number, seed: number): void {
  const r = seeded(seed);
  const cy = size / 2;
  const cx = ox + size * 0.3;
  const blob = (x: number, y: number, rad: number, a: number) => {
    ctx.fillStyle = `rgba(${95 + Math.floor(r() * 40)},${8 + Math.floor(r() * 10)},${6 + Math.floor(r() * 6)},${a})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  };
  // Mancha principal: vários círculos sobrepostos (borda irregular).
  for (let i = 0; i < 9; i++) blob(cx + (r() - 0.5) * size * 0.14, cy + (r() - 0.5) * size * 0.14, size * (0.05 + r() * 0.07), 0.75);
  // Gotas espirradas na direção do golpe, cada vez menores e mais longe.
  for (let i = 0; i < 16; i++) {
    const d = size * (0.08 + r() * 0.6);
    const a = (r() - 0.5) * 0.9 * (1 - d / size);
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    const rad = Math.max(0.8, size * 0.035 * (1 - d / size) * (0.5 + r()));
    // Gota alongada (rastro) na direção do voo.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.scale(1 + r() * 1.6, 1);
    blob(0, 0, rad, 0.65 + r() * 0.3);
    ctx.restore();
  }
}

function drawHole(ctx: CanvasRenderingContext2D, s: number): void {
  const c = s / 2;
  ctx.strokeStyle = 'rgba(40,38,36,0.55)';
  ctx.lineWidth = 1;
  const r = seeded(7);
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 3, c + Math.sin(a) * 3);
    ctx.lineTo(c + Math.cos(a) * (5 + r() * 3), c + Math.sin(a) * (5 + r() * 3));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(150,146,138,0.55)';
  ctx.beginPath();
  ctx.arc(c, c, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(14,13,12,0.95)';
  ctx.beginPath();
  ctx.arc(c, c, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function ensureTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(SPLAT_KEY)) {
    const size = 96;
    const c = document.createElement('canvas');
    c.width = size * SPLAT_VARIANTS;
    c.height = size;
    const ctx = c.getContext('2d')!;
    for (let i = 0; i < SPLAT_VARIANTS; i++) drawSplatter(ctx, i * size, size, 4100 + i * 31);
    const tex = scene.textures.addCanvas(SPLAT_KEY, c)!;
    for (let i = 0; i < SPLAT_VARIANTS; i++) tex.add(String(i), 0, i * size, 0, size, size);
  }
  if (!scene.textures.exists(HOLE_KEY)) {
    const c = document.createElement('canvas');
    c.width = c.height = 18;
    drawHole(c.getContext('2d')!, 18);
    scene.textures.addCanvas(HOLE_KEY, c);
  }
}

export class CombatFx {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly list: Fx[] = [];
  private readonly bloodFx: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Pedaços na morte (carne escura e osso claro). */
  private readonly gibs: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly splats: Phaser.GameObjects.Image[] = [];
  private readonly holes: Phaser.GameObjects.Image[] = [];
  private splatNo = 0;

  constructor(private readonly scene: Phaser.Scene) {
    ensureTextures(scene);
    this.g = scene.add.graphics().setDepth(DEPTH.fx);
    this.dust = scene.add.particles(0, 0, TEX.dust, {
      lifespan: { min: 250, max: 500 },
      speed: { min: 30, max: 110 },
      scale: { start: 0.9, end: 0.2 },
      alpha: { start: 0.7, end: 0 },
      emitting: false,
    });
    this.dust.setDepth(DEPTH.fx);
    // Sangue: gotas escuras que espirram na direção do golpe.
    this.bloodFx = scene.add.particles(0, 0, TEX.dust, {
      lifespan: { min: 180, max: 420 },
      speed: { min: 60, max: 190 },
      scale: { start: 0.55, end: 0.15 },
      alpha: { start: 0.95, end: 0 },
      tint: [0x7a0e0a, 0x5a0a08, 0x9a1a12],
      emitting: false,
    });
    this.bloodFx.setDepth(DEPTH.fx - 1);
    this.gibs = scene.add.particles(0, 0, TEX.dust, {
      lifespan: { min: 420, max: 820 },
      speed: { min: 70, max: 230 },
      scale: { start: 0.5, end: 0.3 },
      alpha: { start: 1, end: 0 },
      tint: [0x4a0806, 0x6a1210, 0x3a0a08, 0xd8cfbf],
      emitting: false,
    });
    this.gibs.setDepth(DEPTH.fx - 1);
  }

  /** Espirro de sangue (golpe/tiro/mordida) na direção `dir`. */
  blood(x: number, y: number, dir: number, amount = 6): void {
    this.bloodFx.setConfig({
      lifespan: { min: 180, max: 420 },
      speed: { min: 60, max: 190 },
      angle: { min: (dir * 180) / Math.PI - 35, max: (dir * 180) / Math.PI + 35 },
      scale: { start: 0.55, end: 0.15 },
      alpha: { start: 0.95, end: 0 },
      tint: [0x7a0e0a, 0x5a0a08, 0x9a1a12],
      emitting: false,
    });
    this.bloodFx.emitParticleAt(x, y, amount);
  }

  /** Respingo que fica no chão, espirrado na direção do golpe (`size` ~0,5 pequeno … 1,4 grande). */
  splat(x: number, y: number, dir: number, size = 1): void {
    const n = this.splatNo++;
    const img = this.scene.add
      .image(x + Math.cos(dir) * 10, y + Math.sin(dir) * 10, SPLAT_KEY, String(n % SPLAT_VARIANTS))
      .setDepth(DEPTH.decal + 1.4)
      .setOrigin(0.3, 0.5)
      .setRotation(dir + ((n * 0.37) % 0.5) - 0.25)
      .setScale(0.55 * size, 0.55 * size * (0.8 + ((n * 0.21) % 0.4)))
      .setAlpha(0.9);
    this.splats.push(img);
    if (this.splats.length > MAX_SPLATS) this.splats.shift()!.destroy();
  }

  /** Morte: estouro de sangue, pedaços, poeira e mancha grande no chão. */
  kill(x: number, y: number, dir: number): void {
    const deg = (dir * 180) / Math.PI;
    this.gibs.setConfig({
      lifespan: { min: 420, max: 820 },
      speed: { min: 70, max: 230 },
      angle: { min: deg - 70, max: deg + 70 },
      scale: { start: 0.5, end: 0.3 },
      alpha: { start: 1, end: 0 },
      tint: [0x4a0806, 0x6a1210, 0x3a0a08, 0xd8cfbf],
      emitting: false,
    });
    this.gibs.emitParticleAt(x, y, 14);
    this.blood(x, y, dir, 18);
    this.dust.emitParticleAt(x, y, 6);
    this.splat(x, y, dir, 1.4);
    this.splat(x - Math.cos(dir) * 8, y - Math.sin(dir) * 8, dir + 2.4, 0.8);
  }

  /** Texto curto que sobe no lugar ("CABEÇA!", "braço", "cabeça esmagada"). */
  note(x: number, y: number, text: string, style: NoteStyle = 'part'): void {
    // Vários textos no mesmo alvo: empilha para não sobrepor.
    const stack = this.notes.filter((n) => n.t < 0.5 && Math.abs(n.x - x) < 40 && Math.abs(n.y - y) < 40).length;
    this.notes.push({ x, y: y - stack * 18, text, t: 0, style });
  }

  private readonly notes: { x: number; y: number; text: string; t: number; style: NoteStyle; obj?: Phaser.GameObjects.Text }[] = [];

  swing(x: number, y: number, angle: number, reach: number): void {
    this.list.push({ kind: 'swing', t: 0, life: 0.18, x, y, angle, reach });
  }

  /** Tiro: rastro, clarão na boca, fumaça, cápsula ejetada e (se parou na parede) furo. */
  shot(x1: number, y1: number, x2: number, y2: number, wall = false): void {
    const a = Math.atan2(y2 - y1, x2 - x1);
    this.list.push({ kind: 'tracer', t: 0, life: 0.12, x: x1, y: y1, x2, y2 });
    this.list.push({ kind: 'flash', t: 0, life: 0.08, x: x1, y: y1, angle: a });
    this.dust.emitParticleAt(x1 + Math.cos(a) * 8, y1 + Math.sin(a) * 8, 3);
    this.dust.emitParticleAt(x2, y2, wall ? 7 : 5);
    // Cápsula: sai pela direita da arma, gira, cai e fica um pouco no chão.
    const side = a + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    const sp = 110 + Math.random() * 60;
    this.list.push({ kind: 'casing', t: 0, life: 1.8, x: x1 - Math.cos(a) * 12, y: y1 - Math.sin(a) * 12, vx: Math.cos(side) * sp - Math.cos(a) * 30, vy: Math.sin(side) * sp - Math.sin(a) * 30, angle: Math.random() * 3, spin: 14 + Math.random() * 10 });
    if (wall) {
      const hole = this.scene.add.image(x2, y2, HOLE_KEY).setDepth(DEPTH.wall + 1).setRotation(Math.random() * 6);
      this.holes.push(hole);
      if (this.holes.length > MAX_HOLES) this.holes.shift()!.destroy();
    }
  }

  impact(x: number, y: number, hp: number, max: number): void {
    this.dust.emitParticleAt(x, y, 4);
    // Uma barrinha por alvo: a nova substitui a antiga no mesmo lugar.
    const i = this.list.findIndex((f) => f.kind === 'bar' && Math.abs(f.x - x) < 4 && Math.abs(f.y - y) < 4);
    if (i >= 0) this.list.splice(i, 1);
    this.list.push({ kind: 'bar', t: 0, life: 1.6, x, y, frac: Math.max(0, Math.min(1, hp / max)) });
  }

  /** Barra de estado de quem anda (zumbi): quanto falta para cair. Substitui a barra dele por perto. */
  status(x: number, y: number, frac: number): void {
    const i = this.list.findIndex((f) => f.kind === 'bar' && Math.abs(f.x - x) < 60 && Math.abs(f.y - y) < 60);
    if (i >= 0) this.list.splice(i, 1);
    this.dust.emitParticleAt(x, y, 3);
    this.list.push({ kind: 'bar', t: 0, life: 2.2, x, y, frac: Math.max(0, Math.min(1, frac)) });
  }

  update(dt: number): void {
    const g = this.g;
    g.clear();
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i]!;
      const st = NOTE_STYLE[n.style];
      n.t += dt;
      if (!n.obj) {
        n.obj = this.g.scene.add.text(n.x, n.y - 56, n.text, { fontFamily: 'system-ui, sans-serif', fontSize: `${st.size}px`, color: st.color, fontStyle: '900' }).setOrigin(0.5).setDepth(DEPTH.fx + 1);
        n.obj.setShadow(0, 1.5, 'rgba(0,0,0,0.95)', 3, true, true);
        n.obj.setStroke('#1a0806', n.style === 'part' ? 2 : 4);
      }
      // Estoura um pouco maior e assenta (como nas folhas de referência).
      const pop = n.t < 0.12 ? 1.35 - (n.t / 0.12) * 0.35 : 1;
      n.obj.setPosition(n.x, n.y - 56 - n.t * 22).setScale(pop).setAlpha(Math.max(0, 1 - Math.max(0, n.t - st.life * 0.5) / (st.life * 0.5)));
      if (n.t > st.life) {
        n.obj.destroy();
        this.notes.splice(i, 1);
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i]!;
      f.t += dt;
      if (f.t >= f.life) {
        this.list.splice(i, 1);
        continue;
      }
      const a = 1 - f.t / f.life;
      if (f.kind === 'swing') {
        // Rastro: três arcos que se apagam atrás da ponta da arma.
        const r = f.reach! + 14;
        const p = f.t / f.life;
        for (let k = 0; k < 3; k++) {
          const lag = k * 0.18;
          g.lineStyle(6 - k * 2, 0xf2ead6, (0.6 - k * 0.18) * a);
          g.beginPath();
          g.arc(f.x, f.y, r - k * 3, f.angle! - 0.9 + Math.max(0, p - lag) * 0.6, f.angle! + 0.35 + Math.max(0, p - lag) * 0.6);
          g.strokePath();
        }
      } else if (f.kind === 'tracer') {
        g.lineStyle(2, 0xffe6a0, 0.85 * a);
        g.lineBetween(f.x, f.y, f.x2!, f.y2!);
      } else if (f.kind === 'flash') {
        // Clarão em estrela na boca do cano.
        const ang = f.angle ?? 0;
        g.fillStyle(0xfff2c0, 0.95 * a).fillCircle(f.x, f.y, 9 + 9 * a);
        g.fillStyle(0xffc860, 0.7 * a).fillCircle(f.x + Math.cos(ang) * 10, f.y + Math.sin(ang) * 10, 7 + 6 * a);
        g.lineStyle(3, 0xfff2c0, 0.9 * a);
        for (const s of [0, 0.5, -0.5, Math.PI / 2, -Math.PI / 2]) {
          const len = (s === 0 ? 30 : 14) * a;
          g.lineBetween(f.x, f.y, f.x + Math.cos(ang + s) * len, f.y + Math.sin(ang + s) * len);
        }
      } else if (f.kind === 'casing') {
        // Voa ~0,25 s girando, depois fica parada no chão e some.
        if (f.t < 0.25) {
          f.x += f.vx! * dt;
          f.y += f.vy! * dt;
          f.vx! *= 0.9;
          f.vy! *= 0.9;
          f.angle! += f.spin! * dt;
        }
        const fade = Math.min(1, (f.life - f.t) / 0.5);
        const ca = Math.cos(f.angle!);
        const sa = Math.sin(f.angle!);
        g.lineStyle(2.4, 0xd8b04a, fade).lineBetween(f.x - ca * 2.6, f.y - sa * 2.6, f.x + ca * 2.6, f.y + sa * 2.6);
      } else {
        const w = 44;
        const y = f.y - 38;
        const fade = Math.min(1, (f.life - f.t) / 0.4);
        g.fillStyle(0x000000, 0.6 * fade).fillRoundedRect(f.x - w / 2 - 2, y - 2, w + 4, 8, 3);
        g.fillStyle(f.frac! > 0.5 ? 0x9fd88a : f.frac! > 0.2 ? 0xf0b060 : 0xf07a6a, 0.95 * fade).fillRoundedRect(f.x - w / 2, y, Math.max(2, w * f.frac!), 4, 2);
      }
    }
  }
}
