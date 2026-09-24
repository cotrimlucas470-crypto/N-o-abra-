/**
 * Desenhos de debug no MUNDO (dentro da cena do jogo): grade de navegação,
 * chunks, linha de visão e rota A* até um ponto. Tudo com Graphics
 * redesenhado por quadro — só roda com ?debug, então custo não importa muito,
 * mas mesmo assim só desenha o que está perto da câmera.
 */
import Phaser from 'phaser';
import type { EventBus } from '../core/EventBus';
import { CHUNK_PX, chunkKey } from '../sim/ChunkGrid';
import type { WorldState } from '../sim/WorldState';
import { doorGapRect } from '../world/doors';
import { PROP_HARVEST, RESOURCE_HARVEST } from '../nature/NatureCatalog';
import { Pathfinder } from '../world/nav/Pathfinder';
import type { WorldModel } from '../world/WorldModel';
import type { DebugState } from './DebugState';

export class DebugWorldLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly pathfinder: Pathfinder;
  private path: { x: number; y: number }[] = [];
  private pathInfo = '';
  private repathIn = 0;
  private lastTarget: { x: number; y: number } | null = null;
  /** Barulhos recentes (anel que some em NOISE_LIFE s). */
  private noises: { x: number; y: number; radius: number; age: number }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly model: WorldModel,
    private readonly state: DebugState,
    private readonly loadedChunks: () => number[],
    private readonly world: WorldState,
    bus: EventBus,
    /** Agora, em dias de jogo (quanto as árvores têm). */
    private readonly nowDays: () => number = () => 0,
  ) {
    this.g = scene.add.graphics().setDepth(500);
    this.pathfinder = new Pathfinder(model.nav);
    const off = bus.on('world:noise', (n) => {
      if (this.state.noise) this.noises.push({ x: n.x, y: n.y, radius: n.radius, age: 0 });
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  /** Texto curto sobre a última rota (mostrado no painel). */
  get info(): string {
    return this.pathInfo;
  }

  update(px: number, py: number, dt: number): void {
    const s = this.state;
    const world = this.scene.physics.world;
    if (s.colliders && !world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = s.colliders;
    if (!s.colliders) world.debugGraphic?.clear();

    const g = this.g;
    g.clear();
    const view = this.scene.cameras.main.worldView;

    if (s.chunks) this.drawChunks(view);
    if (s.nav) this.drawNav(view);
    if (s.doors) this.drawDoors(view);
    if (s.loot) this.drawLoot(view);
    this.drawNoises(dt);
    if (s.target) this.drawTarget(px, py, dt);
    else {
      this.path = [];
      this.pathInfo = '';
    }
  }

  private drawChunks(view: Phaser.Geom.Rectangle): void {
    const g = this.g;
    const loaded = new Set(this.loadedChunks());
    const cx0 = Math.max(0, Math.floor(view.x / CHUNK_PX));
    const cy0 = Math.max(0, Math.floor(view.y / CHUNK_PX));
    const cx1 = Math.floor((view.x + view.width) / CHUNK_PX);
    const cy1 = Math.floor((view.y + view.height) / CHUNK_PX);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const on = loaded.has(chunkKey(cx, cy));
        g.lineStyle(3, on ? 0x5fd35f : 0xd35f5f, 0.8);
        g.strokeRect(cx * CHUNK_PX, cy * CHUNK_PX, CHUNK_PX, CHUNK_PX);
      }
    }
  }

  private drawDoors(view: Phaser.Geom.Rectangle): void {
    const g = this.g;
    const idx = this.model.index;
    const cx0 = Math.max(0, Math.floor(view.x / CHUNK_PX) - 1);
    const cy0 = Math.max(0, Math.floor(view.y / CHUNK_PX) - 1);
    const cx1 = Math.floor((view.x + view.width) / CHUNK_PX) + 1;
    const cy1 = Math.floor((view.y + view.height) / CHUNK_PX) + 1;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        for (const i of idx.get(chunkKey(cx, cy))?.doors ?? []) {
          const d = this.model.map.doors[i]!;
          const st = this.world.doorState(d.id);
          const color = st?.locked ? 0xffd166 : st?.open ? 0x5fe07a : 0xe05f5f;
          const r = doorGapRect(d);
          g.fillStyle(color, 0.55).fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
        }
      }
    }
  }

  private drawLoot(view: Phaser.Geom.Rectangle): void {
    const g = this.g;
    const idx = this.model.index;
    const map = this.model.map;
    const now = this.nowDays();
    const cx0 = Math.max(0, Math.floor(view.x / CHUNK_PX) - 1);
    const cy0 = Math.max(0, Math.floor(view.y / CHUNK_PX) - 1);
    const cx1 = Math.floor((view.x + view.width) / CHUNK_PX) + 1;
    const cy1 = Math.floor((view.y + view.height) / CHUNK_PX) + 1;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const key = chunkKey(cx, cy);
        for (const ref of this.world.loot.refsInChunk(key)) {
          const searched = this.world.loot.isSearched(ref.id);
          const empty = searched && (this.world.loot.peek(ref.id)?.isEmpty ?? false);
          const color = !searched ? 0x5fb8ff : empty ? 0x777777 : 0xffd166;
          g.fillStyle(color, 0.9).fillCircle(ref.x, ref.y, 9);
          g.lineStyle(2, 0x000000, 0.8).strokeCircle(ref.x, ref.y, 9);
        }
        const content = idx.get(key);
        if (!content) continue;
        const bar = (x: number, y: number, frac: number) => {
          g.fillStyle(0x000000, 0.7).fillRect(x - 22, y - 34, 44, 8);
          g.fillStyle(frac > 0 ? 0x7fd35f : 0xd35f5f, 1).fillRect(x - 21, y - 33, Math.max(2, 42 * frac), 6);
        };
        for (const i of content.props) {
          const p = map.props[i]!;
          const def = PROP_HARVEST[p.type];
          if (def) bar(p.x, p.y, this.world.nature.count(p.id, def, now) / def.max);
        }
        for (const i of content.resources) {
          const r = map.resources[i]!;
          const def = RESOURCE_HARVEST[r.type];
          bar(r.x, r.y, this.world.nature.count(r.id, def, now) / def.max);
        }
      }
    }
  }

  private drawNoises(dt: number): void {
    const LIFE = 1.4;
    const g = this.g;
    this.noises = this.noises.filter((n) => (n.age += dt) < LIFE);
    for (const n of this.noises) {
      const k = n.age / LIFE;
      g.lineStyle(4, 0xff9f43, 0.9 * (1 - k));
      g.strokeCircle(n.x, n.y, n.radius * Math.min(1, 0.25 + k * 1.5));
      g.lineStyle(1.5, 0xff9f43, 0.35 * (1 - k));
      g.strokeCircle(n.x, n.y, n.radius);
    }
  }

  private drawNav(view: Phaser.Geom.Rectangle): void {
    const nav = this.model.nav;
    const c = nav.cell;
    const g = this.g;
    g.fillStyle(0xff3030, 0.28);
    const cx0 = Math.max(0, Math.floor(view.x / c));
    const cy0 = Math.max(0, Math.floor(view.y / c));
    const cx1 = Math.min(nav.cols - 1, Math.floor((view.x + view.width) / c));
    const cy1 = Math.min(nav.rows - 1, Math.floor((view.y + view.height) / c));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (nav.isBlocked(cx, cy)) g.fillRect(cx * c + 1, cy * c + 1, c - 2, c - 2);
      }
    }
  }

  private drawTarget(px: number, py: number, dt: number): void {
    const t = this.state.target!;
    const g = this.g;
    // linha de visão: verde se enxerga, vermelha até onde bateu
    const hit = { x: t.x, y: t.y };
    const visible = this.model.sight.hasLineOfSight(px, py, t.x, t.y, hit);
    g.lineStyle(3, visible ? 0x5fe07a : 0xe05f5f, 0.9);
    g.lineBetween(px, py, visible ? t.x : hit.x, visible ? t.y : hit.y);
    if (!visible) {
      g.lineStyle(2, 0xe05f5f, 0.35);
      g.lineBetween(hit.x, hit.y, t.x, t.y);
      g.fillStyle(0xe05f5f, 1).fillCircle(hit.x, hit.y, 7);
    }
    g.lineStyle(3, 0xffd166, 1).strokeCircle(t.x, t.y, 16);

    // rota A* recalculada a cada 0,4 s (ou quando o alvo muda)
    this.repathIn -= dt;
    if (this.repathIn <= 0 || this.lastTarget !== t) {
      this.repathIn = 0.4;
      this.lastTarget = t;
      const t0 = performance.now();
      const r = this.pathfinder.find(px, py, t.x, t.y, { maxExpanded: 20000 });
      const ms = performance.now() - t0;
      this.path = r.points;
      this.pathInfo = `rota: ${r.found ? 'ok' : r.partial ? 'parcial' : 'sem caminho'} · ${r.points.length} pontos · ${r.expanded} células · ${ms.toFixed(1)} ms · visão: ${visible ? 'sim' : 'bloqueada'}`;
    }
    if (this.path.length) {
      g.lineStyle(4, 0x66b3ff, 0.85);
      g.beginPath();
      g.moveTo(px, py);
      for (const p of this.path) g.lineTo(p.x, p.y);
      g.strokePath();
      g.fillStyle(0x66b3ff, 1);
      for (const p of this.path) g.fillCircle(p.x, p.y, 5);
    }
  }
}
