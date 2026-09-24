/**
 * Painel de debug — só existe com ?debug na URL, separado do jogo normal.
 * Roda por cima do HUD (px CSS). Botão "DBG" abre/fecha (ou tecla F2).
 *
 * Ferramentas da Fase 1: colisões, grade de navegação, chunks, linha de
 * visão e rota até um ponto tocado, mapa para teleportar, controle de hora.
 * Cada fase nova acrescenta as suas (zumbis, ruído, loot...).
 */
import Phaser from 'phaser';
import { SCENES, TILE } from '../config/GameConfig';
import { services, type GameServices } from '../core/Services';
import { drawDebugMap } from '../debug/DebugMapTexture';
import type { DebugState } from '../debug/DebugState';
import { chunkKeyAt, keyToChunk } from '../sim/ChunkGrid';
import { UiButton } from '../ui/UiButton';
import { UI, textStyle } from '../ui/theme';
import type { GameScene } from './GameScene';

const MAP_TEX = 'debug.map';
const TIME_SCALES = [1, 10, 60, 0] as const;
/** Botões em duas colunas: cabe em celular deitado (390 px de altura) com o texto de informação. */
const BTN_W = 124;
const BTN_H = 26;
/** Colunas de botões: 3 deitado (cabe o texto de informação embaixo), 2 em pé. */
const panelW = (cols: number) => BTN_W * cols + 8 + (cols - 1) * 2 + 8;

export class DebugScene extends Phaser.Scene {
  private s!: GameServices;
  private state!: DebugState;
  private game_!: GameScene;
  private open = false;
  private toggle!: UiButton;
  private panel!: Phaser.GameObjects.Container;
  private panelBg!: Phaser.GameObjects.Rectangle;
  private buttons: { btn: UiButton; label: () => string }[] = [];
  private info!: Phaser.GameObjects.Text;
  private infoTimer = 0;
  private picking = false;
  private pickZone!: Phaser.GameObjects.Zone;
  private pickHint!: Phaser.GameObjects.Text;
  private mapLayer: Phaser.GameObjects.Container | null = null;
  private timeScaleIndex = 0;

  constructor() {
    super(SCENES.debug);
  }

  create(): void {
    this.s = services(this.game);
    const dpr = this.s.viewport.dpr;
    this.cameras.main.setOrigin(0, 0).setZoom(dpr);
    this.game_ = this.scene.get(SCENES.game) as GameScene;
    const state = this.game_.debugState;
    if (!state) return;
    this.state = state;

    this.toggle = new UiButton(this, 'DBG', 54, 30, () => this.setOpen(!this.open), false, dpr);
    this.toggle.setDepth(300);

    // Área que captura UM toque no mundo para marcar o alvo (bloqueia os joysticks só nesse momento).
    this.pickZone = this.add.zone(0, 0, 10, 10).setOrigin(0, 0).setInteractive().setDepth(250);
    this.pickZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (p: Phaser.Input.Pointer) => this.pickAt(p));
    this.pickZone.setVisible(false).disableInteractive();
    this.pickHint = this.add
      .text(0, 0, 'Toque no mapa para marcar o alvo', textStyle(13, '#ffd166', '700'))
      .setOrigin(0.5, 0)
      .setResolution(dpr)
      .setDepth(260)
      .setBackgroundColor('rgba(0,0,0,0.6)')
      .setPadding(8, 4, 8, 4)
      .setVisible(false);

    this.panelBg = this.add.rectangle(0, 0, 10, 10, 0x0b0c0f, 0.84).setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.18).setInteractive();
    this.panel = this.add.container(0, 0, [this.panelBg]).setDepth(280).setVisible(false);
    const add = (label: () => string, onTap: () => void) => {
      const btn = new UiButton(this, label(), BTN_W, BTN_H, () => {
        onTap();
        this.refreshLabels();
      }, false, dpr);
      this.buttons.push({ btn, label });
      this.panel.add(btn);
    };
    const onOff = (v: boolean) => (v ? '✓' : '·');
    add(() => `${onOff(this.state.colliders)} Colisões`, () => (this.state.colliders = !this.state.colliders));
    add(() => `${onOff(this.state.nav)} Navegação`, () => (this.state.nav = !this.state.nav));
    add(() => `${onOff(this.state.chunks)} Chunks`, () => (this.state.chunks = !this.state.chunks));
    add(
      () => (this.state.target ? 'Limpar alvo' : 'Alvo: visão/rota'),
      () => {
        if (this.state.target) this.state.target = null;
        else this.setPicking(true);
      },
    );
    add(() => 'Mapa/teleporte', () => this.openMap());
    add(() => 'Hora +1', () => this.s.session.clock?.advance(60));
    add(
      () => `Tempo: ${TIME_SCALES[this.timeScaleIndex] === 0 ? 'parado' : `x${TIME_SCALES[this.timeScaleIndex]}`}`,
      () => {
        this.timeScaleIndex = (this.timeScaleIndex + 1) % TIME_SCALES.length;
        const clock = this.s.session.clock;
        if (clock) clock.timeScale = TIME_SCALES[this.timeScaleIndex]!;
      },
    );
    // Fase 1 · interação (no fim: os anteriores mantêm a posição)
    add(() => `${onOff(this.state.doors)} Portas`, () => (this.state.doors = !this.state.doors));
    add(() => `${onOff(this.state.noise)} Ruído`, () => (this.state.noise = !this.state.noise));
    add(() => 'Gerar item', () => this.flash(`item: ${this.game_.debugSpawnItem()}`));
    add(() => 'Trancar porta', () => this.flash(this.game_.debugToggleLock()));
    // Loot e natureza
    add(() => `${onOff(this.state.loot)} Loot`, () => (this.state.loot = !this.state.loot));
    add(() => 'Dia +1', () => this.s.session.clock?.advance(24 * 60));
    this.info = this.add.text(0, 0, '', textStyle(10, '#bfe8bf', '600')).setResolution(dpr);
    this.panel.add(this.info);

    this.input.keyboard?.on('keydown-F2', () => this.setOpen(!this.open));
    const off = this.s.bus.on('viewport:changed', () => this.layout());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
    this.layout();
  }

  private setOpen(v: boolean): void {
    this.open = v;
    this.panel.setVisible(v);
    if (!v) this.setPicking(false);
    this.refreshLabels();
  }

  private setPicking(v: boolean): void {
    this.picking = v;
    this.pickZone.setVisible(v);
    if (v) this.pickZone.setInteractive();
    else this.pickZone.disableInteractive();
    this.pickHint.setVisible(v);
  }

  private pickAt(p: Phaser.Input.Pointer): void {
    if (!this.picking) return;
    const cam = this.game_.cameras.main;
    const w = cam.getWorldPoint(p.x, p.y);
    this.state.target = { x: w.x, y: w.y };
    this.setPicking(false);
    this.refreshLabels();
  }

  /** Mensagem curta do debug na linha de aviso do jogo. */
  private flash(text: string): void {
    this.s.bus.emit('player:feedback', { text: `[debug] ${text}`, tone: 'info' });
  }

  private refreshLabels(): void {
    for (const b of this.buttons) b.btn.setLabel(b.label());
  }

  // ---------------------------------------------------------------- mapa / teleporte

  private openMap(): void {
    if (this.mapLayer) return;
    const model = this.game_.worldModel;
    if (!this.textures.exists(MAP_TEX)) {
      const tex = this.textures.addCanvas(MAP_TEX, drawDebugMap(model.map));
      tex?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const w = this.s.viewport.cssWidth;
    const h = this.s.viewport.cssHeight;
    const mw = model.map.widthTiles;
    const mh = model.map.heightTiles;
    const scale = Math.min((w * 0.92) / mw, (h * 0.84) / mh);
    const x0 = (w - mw * scale) / 2;
    const y0 = (h - mh * scale) / 2 + 10;

    const dim = this.add.rectangle(0, 0, w, h, 0x000000, 0.75).setOrigin(0, 0).setInteractive();
    const img = this.add.image(x0, y0, MAP_TEX).setOrigin(0, 0).setScale(scale).setInteractive();
    const marks = this.add.graphics();
    const title = this.add
      .text(w / 2, y0 - 8, 'Toque para teleportar · fora do mapa para fechar', textStyle(12, UI.text, '700'))
      .setOrigin(0.5, 1)
      .setResolution(this.s.viewport.dpr);
    // regiões e jogador
    marks.lineStyle(1, 0xffffff, 0.35);
    for (const r of model.map.regions) marks.strokeRect(x0 + (r.rect.x / TILE) * scale, y0 + (r.rect.y / TILE) * scale, (r.rect.w / TILE) * scale, (r.rect.h / TILE) * scale);
    const p = this.game_.playerPosition();
    marks.fillStyle(0xffd166, 1).fillCircle(x0 + (p.x / TILE) * scale, y0 + (p.y / TILE) * scale, 4);
    const labels = model.map.regions.map((r) =>
      this.add
        .text(x0 + ((r.rect.x + r.rect.w / 2) / TILE) * scale, y0 + ((r.rect.y + r.rect.h / 2) / TILE) * scale, r.name, textStyle(9, '#ffffff', '700'))
        .setOrigin(0.5)
        .setResolution(this.s.viewport.dpr)
        .setAlpha(0.85)
        .setShadow(0, 1, '#000', 3, false, true),
    );

    this.mapLayer = this.add.container(0, 0, [dim, img, marks, title, ...labels]).setDepth(400);
    dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.closeMap());
    img.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (ptr: Phaser.Input.Pointer) => {
      const dpr = this.s.viewport.dpr;
      const tx = (ptr.x / dpr - x0) / scale;
      const ty = (ptr.y / dpr - y0) / scale;
      this.closeMap();
      this.game_.teleport(tx * TILE, ty * TILE);
    });
  }

  private closeMap(): void {
    this.mapLayer?.destroy();
    this.mapLayer = null;
  }

  // ---------------------------------------------------------------- layout e info

  private layout(): void {
    const s = this.s;
    const w = s.viewport.cssWidth;
    const h = s.viewport.cssHeight;
    const ins = s.viewport.insets;
    this.cameras.main.setSize(this.scale.width, this.scale.height).setZoom(s.viewport.dpr);
    this.toggle.setPosition(w - ins.right - 40, ins.top + 88);
    this.pickZone.setSize(w, h);
    this.pickZone.input?.hitArea.setTo(0, 0, w, h);
    this.pickHint.setPosition(w / 2, ins.top + 12);

    const cols = w > h ? 3 : 2;
    const PANEL_W = panelW(cols);
    this.info.setWordWrapWidth(PANEL_W - 16);
    const px = w - ins.right - PANEL_W - 4;
    const py = ins.top + 108;
    this.panel.setPosition(px, py);
    this.buttons.forEach((b, i) => b.btn.setPosition(8 + BTN_W / 2 + (i % cols) * (BTN_W + 2), 6 + BTN_H / 2 + Math.floor(i / cols) * (BTN_H + 4)));
    const infoY = 8 + Math.ceil(this.buttons.length / cols) * (BTN_H + 4);
    this.info.setPosition(8, infoY);
    const panelH = Math.min(h - py - 6, infoY + 112);
    this.panelBg.setSize(PANEL_W, panelH);
    this.panelBg.input?.hitArea.setTo(0, 0, PANEL_W, panelH);
  }

  override update(_t: number, delta: number): void {
    if (!this.state || !this.open) return;
    this.infoTimer -= delta / 1000;
    if (this.infoTimer > 0) return;
    this.infoTimer = 0.25;
    const g = this.game_;
    const p = g.playerPosition();
    const model = g.worldModel;
    const { cx, cy } = keyToChunk(chunkKeyAt(p.x, p.y));
    const st = g.worldStats();
    const building = g.buildingAtPlayer();
    const clock = this.s.session.clock;
    this.info.setText(
      [
        `pos ${(p.x / TILE).toFixed(1)}, ${(p.y / TILE).toFixed(1)} · chunk ${cx},${cy} · ${model.regionAt(p.x, p.y)?.name ?? '—'}${building ? ` · ${building}` : ''}`,
        `chunks ${st.chunks} · colisores ${st.colliders} · objetos ${st.culled.visible}/${st.culled.total}`,
        `mapa ${model.map.widthTiles}×${model.map.heightTiles} · ${model.map.buildings.length} constr. · ${model.map.doors.length} portas`,
        g.interactionStats(),
        clock ? `dia ${clock.day} ${clock.timeLabel()} · ${clock.rate.toFixed(2)} min/s` : '',
        g.debugInfo(),
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
}
