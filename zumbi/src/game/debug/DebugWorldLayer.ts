/**
 * Desenhos de debug no MUNDO (dentro da cena do jogo): grade de navegação,
 * chunks, linha de visão e rota A* até um ponto. Tudo com Graphics
 * redesenhado por quadro — só roda com ?debug, então custo não importa muito,
 * mas mesmo assim só desenha o que está perto da câmera.
 */
import Phaser from 'phaser';
import { CHUNK_PX, chunkKey } from '../sim/ChunkGrid';
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

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly model: WorldModel,
    private readonly state: DebugState,
    private readonly loadedChunks: () => number[],
  ) {
    this.g = scene.add.graphics().setDepth(500);
    this.pathfinder = new Pathfinder(model.nav);
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
