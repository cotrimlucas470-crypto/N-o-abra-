/**
 * Desenho do que o jogador montou (parte Phaser), por chunk: paredes,
 * portas, janelas, cercas, tábuas pregadas, piso, telhado (fica
 * transparente com o jogador embaixo), móveis, fogueira e fogão a lenha
 * (chama tremula), coletor de chuva (nível da água) e canteiro (planta
 * conforme cresce). Cada peça sólida ganha um colisor da física enquanto o
 * chunk está carregado. Também desenha a PRÉVIA do modo construir.
 */
import Phaser from 'phaser';
import { cropStage, CROP_COLOR } from '../../build/Farm';
import { fuelLeft, isBurning, strength } from '../../build/Fire';
import { STRUCTURE_DEFS, type StructureDef, type StructureType } from '../../build/StructureCatalog';
import { rectAt, rectOf, solidOf } from '../../build/StructureGeometry';
import type { Structure } from '../../build/Structures';
import { DEPTH } from '../../config/GameConfig';
import type { WorldState } from '../../sim/WorldState';
import type { Rect } from '../MapTypes';
import type { WorldRenderer } from './WorldRenderer';

interface View {
  s: Structure;
  g: Phaser.GameObjects.Graphics;
  zone: Phaser.GameObjects.Zone | null;
}

const DOOR_OPEN_ALPHA = 0.95;

function depthOf(d: StructureDef): number {
  switch (d.layer) {
    case 'floor':
      return DEPTH.decal + 1;
    case 'roof':
      return DEPTH.overhead + 1;
    case 'edge':
      return d.kind === 'porta' ? DEPTH.door : DEPTH.wall;
    default:
      // Tábuas pregadas ficam por cima da janela/porta do mapa.
      if (d.kind === 'barricada') return DEPTH.wall + 1;
      return d.kind === 'fogo' && !d.solid ? DEPTH.floorProp + 1 : DEPTH.object;
  }
}

export class StructureViews {
  private readonly byChunk = new Map<number, View[]>();
  private readonly byId = new Map<string, View>();
  private readonly unsubs: (() => void)[] = [];
  private readonly ghost: Phaser.GameObjects.Graphics;
  private t = 0;
  private frameTimer = 0;
  private roofAlpha = 0.9;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: WorldState,
    private readonly renderer: WorldRenderer,
    private readonly minutes: () => number,
    private readonly player: () => { x: number; y: number },
  ) {
    this.ghost = scene.add.graphics().setDepth(DEPTH.fx - 1).setVisible(false);
    this.unsubs.push(
      renderer.onChunk({ load: (k) => this.load(k), unload: (k) => this.unload(k) }),
      state.structures.onChange(({ s, removed }) => this.changed(s, removed)),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubs.forEach((u) => u()));
  }

  get count(): number {
    return this.byId.size;
  }

  // ---------------------------------------------------------------- streaming

  private load(key: number): void {
    const list: View[] = [];
    for (const s of this.state.structures.inChunk(key)) list.push(this.make(s));
    if (list.length) this.byChunk.set(key, list);
  }

  private unload(key: number): void {
    for (const v of this.byChunk.get(key) ?? []) this.destroy(v);
    this.byChunk.delete(key);
  }

  private destroy(v: View): void {
    v.g.destroy();
    if (v.zone) this.renderer.solids.remove(v.zone, true, true);
    this.byId.delete(v.s.id);
  }

  private make(s: Structure): View {
    const g = this.scene.add.graphics().setDepth(depthOf(STRUCTURE_DEFS[s.type]));
    const v: View = { s, g, zone: null };
    this.byId.set(s.id, v);
    this.syncZone(v);
    this.draw(v);
    return v;
  }

  /** Colisor da física igual ao corpo sólido (porta aberta não tem). */
  private syncZone(v: View): void {
    const solid = solidOf(v.s);
    if (v.zone) {
      this.renderer.solids.remove(v.zone, true, true);
      v.zone = null;
    }
    if (!solid || solid.kind !== 'rect') return;
    const z = this.scene.add.zone(solid.x + solid.w / 2, solid.y + solid.h / 2, solid.w, solid.h);
    this.scene.physics.add.existing(z, true);
    this.renderer.solids.add(z);
    v.zone = z;
  }

  private changed(s: Structure, removed: boolean): void {
    const v = this.byId.get(s.id);
    if (removed) {
      if (!v) return;
      this.destroy(v);
      for (const [k, list] of this.byChunk) {
        const i = list.indexOf(v);
        if (i < 0) continue;
        list.splice(i, 1);
        if (!list.length) this.byChunk.delete(k);
      }
      return;
    }
    if (v) {
      v.s = s;
      this.syncZone(v);
      this.draw(v);
      return;
    }
    // Nova num chunk já carregado: cria agora.
    const key = this.state.model.index.chunkOfPoint(s.x, s.y);
    if (!this.renderer.isChunkLoaded(key)) return;
    const list = this.byChunk.get(key) ?? [];
    list.push(this.make(s));
    this.byChunk.set(key, list);
  }

  // ---------------------------------------------------------------- desenho

  private draw(v: View): void {
    const { s, g } = v;
    const d = STRUCTURE_DEFS[s.type];
    const r = rectOf(s);
    g.clear();
    switch (d.kind) {
      case 'fogo':
        if (d.solid) this.drawStove(g, s, r);
        else this.drawCampfire(g, s);
        return;
      case 'parede':
        return this.drawWall(g, s, d, r);
      case 'porta':
        return this.drawDoor(g, s, d, r);
      case 'janela':
        return this.drawWindow(g, d, r);
      case 'barricada':
        return this.drawBoards(g, s, d, r);
      case 'piso':
        return this.drawFloor(g, d, r);
      case 'telhado':
        return this.drawRoof(g, d, r);
      case 'agua':
        return this.drawCollector(g, s, d, r);
      case 'canteiro':
        return this.drawPlot(g, s, d, r);
      default:
        return this.drawFurniture(g, s, r);
    }
  }

  private drawWall(g: Phaser.GameObjects.Graphics, s: Structure, d: StructureDef, r: Rect): void {
    const horiz = r.w >= r.h;
    if (!d.opaque) {
      // Cerca: mourões e duas ripas (dá para ver através).
      g.fillStyle(d.color2 ?? d.color, 1);
      for (const t of [0.1, 0.5, 0.9]) g.fillRect(horiz ? r.x + r.w * t - 4 : r.x - 2, horiz ? r.y - 2 : r.y + r.h * t - 4, horiz ? 8 : r.w + 4, horiz ? r.h + 4 : 8);
      g.fillStyle(d.color, 1);
      if (horiz) {
        g.fillRect(r.x, r.y + 1, r.w, 2.5);
        g.fillRect(r.x, r.y + r.h - 3.5, r.w, 2.5);
      } else {
        g.fillRect(r.x + 1, r.y, 2.5, r.h);
        g.fillRect(r.x + r.w - 3.5, r.y, 2.5, r.h);
      }
      return;
    }
    g.fillStyle(d.color, 1).fillRect(r.x, r.y, r.w, r.h);
    g.lineStyle(1, d.color2 ?? 0x000000, 0.8);
    const len = horiz ? r.w : r.h;
    const step = d.material === 'tijolo' ? 12 : d.material === 'metal' ? 32 : 16;
    for (let t = step; t < len; t += step) {
      if (horiz) g.lineBetween(r.x + t, r.y, r.x + t, r.y + r.h);
      else g.lineBetween(r.x, r.y + t, r.x + r.w, r.y + t);
    }
    if (d.material === 'tijolo') {
      if (horiz) g.lineBetween(r.x, r.y + r.h / 2, r.x + r.w, r.y + r.h / 2);
      else g.lineBetween(r.x + r.w / 2, r.y, r.x + r.w / 2, r.y + r.h);
    }
    g.lineStyle(2, 0x16181b, 0.9).strokeRect(r.x, r.y, r.w, r.h);
    this.damage(g, s, d, r);
  }

  /** Rachaduras quando a peça está bem danificada. */
  private damage(g: Phaser.GameObjects.Graphics, s: Structure, d: StructureDef, r: Rect): void {
    if (s.hp >= d.hp * 0.5) return;
    g.lineStyle(1.5, 0x101010, 0.8);
    g.lineBetween(r.x + r.w * 0.3, r.y, r.x + r.w * 0.45, r.y + r.h);
    if (s.hp < d.hp * 0.25) g.lineBetween(r.x + r.w * 0.7, r.y, r.x + r.w * 0.6, r.y + r.h);
  }

  private drawDoor(g: Phaser.GameObjects.Graphics, s: Structure, d: StructureDef, r: Rect): void {
    const horiz = r.w >= r.h;
    // Batentes nas duas pontas.
    g.fillStyle(0x3a2a1c, 1);
    if (horiz) {
      g.fillRect(r.x, r.y - 1, 5, r.h + 2);
      g.fillRect(r.x + r.w - 5, r.y - 1, 5, r.h + 2);
    } else {
      g.fillRect(r.x - 1, r.y, r.w + 2, 5);
      g.fillRect(r.x - 1, r.y + r.h - 5, r.w + 2, 5);
    }
    if (s.open) {
      // Folha girada 90° na dobradiça (ponta de cima/esquerda).
      g.fillStyle(d.color, DOOR_OPEN_ALPHA);
      const leaf = (horiz ? r.w : r.h) - 10;
      if (horiz) g.fillRect(r.x + 5, r.y + r.h / 2, 7, leaf);
      else g.fillRect(r.x + r.w / 2, r.y + 5, leaf, 7);
      g.lineStyle(1.5, 0x16181b, 0.9);
      if (horiz) g.strokeRect(r.x + 5, r.y + r.h / 2, 7, leaf);
      else g.strokeRect(r.x + r.w / 2, r.y + 5, leaf, 7);
      return;
    }
    g.fillStyle(d.color, 1).fillRect(r.x + 5 * (horiz ? 1 : 0), r.y + 5 * (horiz ? 0 : 1), horiz ? r.w - 10 : r.w, horiz ? r.h : r.h - 10);
    g.fillStyle(d.color2 ?? 0xc8a24a, 1).fillCircle(horiz ? r.x + r.w - 14 : r.x + r.w / 2, horiz ? r.y + r.h / 2 : r.y + r.h - 14, 2.5);
    g.lineStyle(1.5, 0x16181b, 0.9).strokeRect(r.x, r.y, r.w, r.h);
    if (s.locked) {
      g.fillStyle(0xc8a24a, 1).fillRect(horiz ? r.x + r.w - 20 : r.x + r.w / 2 - 3, horiz ? r.y + r.h / 2 - 3 : r.y + r.h - 20, 6, 6);
    }
  }

  private drawWindow(g: Phaser.GameObjects.Graphics, d: StructureDef, r: Rect): void {
    const horiz = r.w >= r.h;
    g.fillStyle(d.color, 1).fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle(d.color2 ?? 0xbfe0e8, 0.85);
    if (horiz) g.fillRect(r.x + 6, r.y + 2.5, r.w - 12, r.h - 5);
    else g.fillRect(r.x + 2.5, r.y + 6, r.w - 5, r.h - 12);
    g.lineStyle(1.5, 0x16181b, 0.9).strokeRect(r.x, r.y, r.w, r.h);
  }

  private drawBoards(g: Phaser.GameObjects.Graphics, s: Structure, d: StructureDef, r: Rect): void {
    const horiz = r.w >= r.h;
    const len = horiz ? r.w : r.h;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    // Três tábuas cruzando a abertura, levemente tortas.
    for (const [off, tilt] of [[-0.3, 0.12], [0, -0.08], [0.3, 0.1]] as const) {
      const a = (horiz ? 0 : Math.PI / 2) + tilt;
      const ox = horiz ? off * len : 0;
      const oy = horiz ? 0 : off * len;
      const hw = len * 0.28;
      const hh = 5;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const pts = [
        [-hw, -hh],
        [hw, -hh],
        [hw, hh],
        [-hw, hh],
      ].map(([x, y]) => new Phaser.Math.Vector2(cx + ox + x! * cos - y! * sin, cy + oy + x! * sin + y! * cos));
      g.fillStyle(d.color, 1).fillPoints(pts, true);
      g.lineStyle(1, d.color2 ?? 0x000000, 1).strokePoints(pts, true);
    }
    this.damage(g, s, d, r);
  }

  private drawFloor(g: Phaser.GameObjects.Graphics, d: StructureDef, r: Rect): void {
    g.fillStyle(d.color, 0.92).fillRect(r.x, r.y, r.w, r.h);
    g.lineStyle(1, d.color2 ?? 0x000000, 0.6);
    for (let y = r.y + 16; y < r.y + r.h; y += 16) g.lineBetween(r.x, y, r.x + r.w, y);
    for (let i = 0; i < 4; i++) {
      const x = r.x + ((i * 23) % r.w);
      const y = r.y + i * 16;
      g.lineBetween(x, y, x, y + 16);
    }
  }

  private drawRoof(g: Phaser.GameObjects.Graphics, d: StructureDef, r: Rect): void {
    g.fillStyle(d.color2 ?? d.color, 1).fillRect(r.x, r.y, r.w, r.h);
    g.lineStyle(1.5, d.color, 0.9);
    for (let y = r.y + 8; y < r.y + r.h; y += 10) g.lineBetween(r.x, y, r.x + r.w, y);
    g.lineStyle(1, 0x2a1a10, 0.6).strokeRect(r.x, r.y, r.w, r.h);
    g.setAlpha(this.roofAlpha);
  }

  private drawCollector(g: Phaser.GameObjects.Graphics, s: Structure, d: StructureDef, r: Rect): void {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const rad = Math.min(r.w, r.h) / 2 - 10;
    g.fillStyle(0x2a3a5a, 1).fillCircle(cx, cy, rad + 4);
    const max = d.water?.max ?? 1;
    const lvl = Math.min(1, (s.water ?? 0) / max);
    g.fillStyle(d.color, 1).fillCircle(cx, cy, rad);
    if (lvl > 0) g.fillStyle(s.dirty ? 0x7a8a6a : (d.color2 ?? 0x8fc3dc), 0.9).fillCircle(cx, cy, rad * (0.3 + 0.7 * lvl));
    // Lona em funil.
    g.lineStyle(2, 0x3a6ab0, 1);
    for (const [ax, ay] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) g.lineBetween(cx + ax * (rad + 8), cy + ay * (rad + 8), cx + ax * rad * 0.5, cy + ay * rad * 0.5);
  }

  private drawPlot(g: Phaser.GameObjects.Graphics, s: Structure, d: StructureDef, r: Rect): void {
    g.fillStyle(d.color, 1).fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    g.lineStyle(2, 0x3a2414, 0.9);
    for (let i = 1; i < 4; i++) g.lineBetween(r.x + 6, r.y + (r.h * i) / 4, r.x + r.w - 6, r.y + (r.h * i) / 4);
    const c = s.crop;
    if (!c) return;
    const stage = cropStage(s, this.minutes());
    const fruit = CROP_COLOR[c.seed] ?? 0xd8342a;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const x = r.x + r.w * (0.22 + 0.28 * i);
        const y = r.y + r.h * (0.3 + 0.4 * j);
        if (stage === 'morta') {
          g.fillStyle(0x6a5a3a, 1).fillCircle(x, y, 4);
          continue;
        }
        const size = stage === 'broto' ? 3 : stage === 'crescendo' ? 6 : 8;
        g.fillStyle(stage === 'passou' ? 0x8a8a3a : 0x5a9a3a, 1).fillCircle(x, y, size);
        if (stage === 'madura' || stage === 'passou') g.fillStyle(stage === 'passou' ? 0x6a4a2a : fruit, 1).fillCircle(x + 2, y + 2, 3);
      }
    }
  }

  private drawFurniture(g: Phaser.GameObjects.Graphics, s: Structure, r: Rect): void {
    const d = STRUCTURE_DEFS[s.type];
    const k = d.inset ?? 0;
    const b = { x: r.x + k, y: r.y + k, w: r.w - 2 * k, h: r.h - 2 * k };
    const dark = d.color2 ?? 0x000000;
    g.fillStyle(0x000000, 0.25).fillRect(b.x + 3, b.y + 4, b.w, b.h);
    switch (s.type) {
      case 'camaMadeira': {
        const vert = b.h >= b.w;
        g.fillStyle(d.color, 1).fillRect(b.x, b.y, b.w, b.h);
        g.fillStyle(0xe8e0f0, 1).fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
        g.fillStyle(0x8a3a3a, 0.9);
        if (vert) g.fillRect(b.x + 4, b.y + b.h * 0.4, b.w - 8, b.h * 0.6 - 4);
        else g.fillRect(b.x + b.w * 0.4, b.y + 4, b.w * 0.6 - 4, b.h - 8);
        g.fillStyle(0xf8f8f8, 1);
        if (vert) g.fillRoundedRect(b.x + 8, b.y + 8, b.w - 16, 18, 5);
        else g.fillRoundedRect(b.x + 8, b.y + 8, 18, b.h - 16, 5);
        break;
      }
      case 'cadeiraMadeira':
        g.fillStyle(d.color, 1).fillRect(b.x, b.y, b.w, b.h);
        g.fillStyle(dark, 1).fillRect(b.x, b.y, b.w, 7);
        break;
      case 'estante':
        g.fillStyle(d.color, 1).fillRect(b.x, b.y, b.w, b.h);
        for (let i = 0; i < 8; i++) g.fillStyle([0xa83a5a, 0x3a6ab0, 0xe8c84a, 0x3a8a4a][i % 4]!, 1).fillRect(b.x + 6 + i * ((b.w - 12) / 8), b.y + 4, (b.w - 12) / 8 - 2, b.h - 8);
        break;
      case 'bancadaMadeira':
        g.fillStyle(d.color, 1).fillRect(b.x, b.y, b.w, b.h);
        g.fillStyle(0x5a5a5a, 1).fillRect(b.x + 6, b.y + 6, 14, 10);
        g.fillStyle(0x9aa0a6, 1).fillRect(b.x + b.w - 40, b.y + b.h / 2 - 3, 28, 5);
        break;
      default:
        g.fillStyle(d.color, 1).fillRect(b.x, b.y, b.w, b.h);
    }
    g.lineStyle(1.5, 0x1a140e, 0.9).strokeRect(b.x, b.y, b.w, b.h);
    if (s.type === 'caixote' || s.type === 'mesaMadeira') {
      g.lineStyle(1, dark, 0.8);
      for (let y = b.y + 10; y < b.y + b.h; y += 12) g.lineBetween(b.x + 2, y, b.x + b.w - 2, y);
    }
  }

  private drawCampfire(g: Phaser.GameObjects.Graphics, s: Structure): void {
    const now = this.minutes();
    const lit = isBurning(s, now);
    const fuel = fuelLeft(s, now);
    g.fillStyle(0x1c1a18, 0.55).fillCircle(s.x, s.y, 21);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      g.fillStyle(i % 2 ? 0x8a8a82 : 0x6f6f68, 1).fillCircle(s.x + Math.cos(a) * 19, s.y + Math.sin(a) * 19, 5);
    }
    if (fuel > 0) {
      const wood = lit ? 0x6a4428 : 0x4a3424;
      for (const [a, len] of [[0.5, 26], [2.1, 24], [3.7, 22]] as const) {
        const cx = Math.cos(a) * len * 0.5;
        const cy = Math.sin(a) * len * 0.5;
        g.lineStyle(6, wood, 1).lineBetween(s.x - cx, s.y - cy, s.x + cx, s.y + cy);
      }
    } else {
      g.fillStyle(0x6a6660, 0.9).fillCircle(s.x, s.y, 10);
      g.fillStyle(0x8a8580, 0.8).fillCircle(s.x - 3, s.y + 2, 5);
    }
    if (lit) this.flame(g, s.x, s.y, strength(s, now), s.x + s.y);
  }

  private drawStove(g: Phaser.GameObjects.Graphics, s: Structure, r: Rect): void {
    const d = STRUCTURE_DEFS[s.type];
    const k = d.inset ?? 0;
    const b = { x: r.x + k, y: r.y + k, w: r.w - 2 * k, h: r.h - 2 * k };
    g.fillStyle(d.color, 1).fillRect(b.x, b.y, b.w, b.h);
    g.lineStyle(1, 0xd8c8b0, 0.6);
    for (let y = b.y + 8; y < b.y + b.h; y += 8) g.lineBetween(b.x, y, b.x + b.w, y);
    g.fillStyle(0x2a2a2a, 1).fillRect(b.x + 5, b.y + 5, b.w - 10, b.h * 0.45);
    g.fillStyle(0x151515, 1).fillCircle(b.x + b.w * 0.3, b.y + 5 + b.h * 0.22, 7).fillCircle(b.x + b.w * 0.7, b.y + 5 + b.h * 0.22, 7);
    g.fillStyle(0x3a3a3a, 1).fillRect(b.x + b.w - 14, b.y - 6, 10, 12);
    g.lineStyle(1.5, 0x16181b, 0.9).strokeRect(b.x, b.y, b.w, b.h);
    const now = this.minutes();
    // Portinha da fornalha: brilha com fogo aceso.
    const lit = isBurning(s, now);
    g.fillStyle(lit ? 0xff7a20 : 0x1a1a1a, lit ? 0.9 + 0.1 * Math.sin(this.t * 11) : 1).fillRect(b.x + b.w * 0.3, b.y + b.h * 0.65, b.w * 0.4, b.h * 0.22);
  }

  private flame(g: Phaser.GameObjects.Graphics, x: number, y: number, k: number, seed: number): void {
    const f = Math.sin(this.t * 13 + seed) * 0.5 + Math.sin(this.t * 7.3 + seed * 0.7) * 0.5;
    g.fillStyle(0xff5a1a, 0.35).fillCircle(x, y, 16 + 3 * k);
    g.fillStyle(0xff7a20, 0.9).fillEllipse(x, y - 3 - f, (13 + f * 2) * k + 5, (18 + f * 3) * k + 6);
    g.fillStyle(0xffc84a, 0.95).fillEllipse(x, y - 2 - f * 0.5, (7 + f) * k + 3, (11 + f * 2) * k + 3);
    g.fillStyle(0xfff2c0, 0.9).fillEllipse(x, y, 4 * k + 2, 5 * k + 2);
  }

  // ---------------------------------------------------------------- prévia (modo construir)

  showGhost(type: StructureType, x: number, y: number, rot: number, valid: boolean, len?: number): void {
    const g = this.ghost;
    const r = rectAt(type, x, y, rot, len);
    const c = valid ? 0x7fc86a : 0xe0604a;
    g.clear().setVisible(true);
    g.fillStyle(c, 0.3).fillRect(r.x, r.y, r.w, r.h);
    g.lineStyle(2, c, 0.95).strokeRect(r.x, r.y, r.w, r.h);
    const d = STRUCTURE_DEFS[type];
    // Móvel: o corpo sólido tracejado por dentro.
    if (d.inset) g.lineStyle(1, c, 0.7).strokeRect(r.x + d.inset, r.y + d.inset, r.w - 2 * d.inset, r.h - 2 * d.inset);
  }

  hideGhost(): void {
    this.ghost.clear().setVisible(false);
  }

  // ---------------------------------------------------------------- por quadro

  /** Chamas (~20 quadros/s) e telhados (transparentes com o jogador embaixo). */
  update(dt: number): void {
    this.t += dt;
    this.frameTimer -= dt;
    if (this.frameTimer > 0) return;
    this.frameTimer = 0.05;
    const now = this.minutes();
    const p = this.player();
    const under = this.state.coveredAt(p.x, p.y);
    const want = under ? 0.18 : 0.92;
    const roofChanged = Math.abs(want - this.roofAlpha) > 0.01;
    if (roofChanged) this.roofAlpha += (want - this.roofAlpha) * 0.5;
    for (const v of this.byId.values()) {
      const d = STRUCTURE_DEFS[v.s.type];
      if (d.fire && (v.s.lit || isBurning(v.s, now))) this.draw(v);
      else if (d.kind === 'telhado' && roofChanged) v.g.setAlpha(this.roofAlpha);
    }
  }
}
