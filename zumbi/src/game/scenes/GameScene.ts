/**
 * Cena do mundo: mapa, jogador, câmera, física.
 * A interface (HUD + controles) roda por cima, na HudScene.
 */
import Phaser from 'phaser';
import { SCENES } from '../config/GameConfig';
import { DEBUG } from '../core/Debug';
import { services, type GameServices } from '../core/Services';
import { Player } from '../entities/player/Player';
import { resolveIntent } from '../input/InputState';
import { KeyboardMouseInput } from '../input/KeyboardMouseInput';
import { CameraDirector } from '../systems/CameraDirector';
import { createDebugState, type DebugState } from '../debug/DebugState';
import { DebugWorldLayer } from '../debug/DebugWorldLayer';
import { GameClock } from '../sim/GameClock';
import { buildCity } from '../world/districts/CityGenerator';
import type { RegionData } from '../world/MapTypes';
import { WorldModel } from '../world/WorldModel';
import { WorldRenderer } from '../world/render/WorldRenderer';

export class GameScene extends Phaser.Scene {
  private s!: GameServices;
  private model!: WorldModel;
  private world!: WorldRenderer;
  private player!: Player;
  private director!: CameraDirector;
  private keyboardMouse!: KeyboardMouseInput;
  private dt = 1 / 60;
  private region: RegionData | null = null;
  private clock!: GameClock;
  /** Só existe com ?debug. */
  debugState: DebugState | null = null;
  private debugLayer: DebugWorldLayer | null = null;
  /** Tempo de jogo acumulado (s) — soma dos deltas que a física usou. */
  private elapsed = 0;

  constructor() {
    super(SCENES.game);
  }

  create(): void {
    this.s = services(this.game);
    const s = this.s;
    const assets = s.assets;
    if (!assets) throw new Error('Assets não carregados');

    const t0 = performance.now();
    this.model = new WorldModel(buildCity(s.settings.world));
    if (DEBUG.enabled) console.info(`[mundo] cidade ${s.settings.world.sectorsX}x${s.settings.world.sectorsY} gerada em ${Math.round(performance.now() - t0)} ms`);
    const map = this.model.map;
    this.world = new WorldRenderer(this, this.model, assets, s.bus);
    this.physics.world.setBounds(0, 0, this.world.widthPx, this.world.heightPx);

    this.player = new Player(this, map.spawn.x, map.spawn.y, assets, s.bus, this.world.shadows, s.settings.player);
    this.physics.add.collider(this.player.sprite, this.world.solids);
    s.session.stats = this.player.stats;
    this.clock = new GameClock(s.settings.time);
    s.session.clock = this.clock;

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.world.widthPx, this.world.heightPx);
    cam.setBackgroundColor('#15161a');
    this.director = new CameraDirector(cam, this.player);
    this.director.setZoom(s.viewport.worldZoom());
    this.director.snap();
    this.loadAroundPlayer();
    cam.fadeIn(600, 10, 10, 12);

    this.keyboardMouse = new KeyboardMouseInput(this);

    // Depois da física: alinhar visuais, câmera e mundo com a posição final do frame.
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.afterPhysics, this);

    const offViewport = s.bus.on('viewport:changed', () => {
      cam.setSize(this.scale.width, this.scale.height);
      this.director.setZoom(s.viewport.worldZoom());
      this.loadAroundPlayer();
    });
    this.events.on(Phaser.Scenes.Events.PAUSE, () => this.keyboardMouse.reset(s.keyboardMouse));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offViewport();
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.afterPhysics, this);
      s.session.stats = null;
      s.session.clock = null;
    });

    this.scene.launch(SCENES.hud);
    if (DEBUG.enabled) {
      this.debugState = createDebugState();
      this.debugLayer = new DebugWorldLayer(this, this.model, this.debugState, () => this.world.loadedChunkKeys());
      this.scene.launch(SCENES.debug);
    }

    if (DEBUG.enabled) this.exposeDebugHandle();
  }

  override update(_time: number, delta: number): void {
    // dt limitado: depois de uma travada longa o personagem não "salta" de velocidade.
    this.dt = Math.min(delta / 1000, 0.1);
    this.elapsed += delta / 1000;
    this.clock.update(delta / 1000);
    const s = this.s;
    this.keyboardMouse.read(s.keyboardMouse, this.player.x, this.player.y, this.cameras.main);
    const intent = resolveIntent(s.touch, s.keyboardMouse);
    this.player.update(this.dt, intent);
  }

  private afterPhysics(): void {
    this.player.syncVisuals();
    this.director.update(this.dt);
    // Região antes do mundo: o aviso da região sai antes do aviso da construção.
    this.trackRegion();
    this.world.update(this.cameras.main, this.player.x, this.player.y, this.dt);
    this.debugLayer?.update(this.player.x, this.player.y, this.dt);
  }

  // ---------------------------------------------------------------- consultas (debug, testes)

  get worldModel(): WorldModel {
    return this.model;
  }

  playerPosition(): { x: number; y: number } {
    return { x: this.player.x, y: this.player.y };
  }

  worldStats(): ReturnType<WorldRenderer['stats']> {
    return this.world.stats();
  }

  buildingAtPlayer(): string | null {
    return this.world.roofs.buildingAt(this.player.x, this.player.y)?.name ?? null;
  }

  debugInfo(): string {
    return this.debugLayer?.info ?? '';
  }

  /** Carrega de uma vez os chunks da tela (início, teleporte, mudança de tamanho de tela). */
  private loadAroundPlayer(): void {
    const cam = this.cameras.main;
    this.world.ensureLoadedAround(this.player.x, this.player.y, cam.width / cam.zoom, cam.height / cam.zoom);
  }

  /** Teleporta o jogador (debug) com os chunks do destino já carregados. */
  teleport(x: number, y: number): void {
    this.player.sprite.setPosition(x, y);
    this.player.body.reset(x, y);
    this.director.snap();
    this.loadAroundPlayer();
  }

  /** Avisa quando o jogador muda de região. */
  private trackRegion(): void {
    const { x, y } = this.player;
    if (this.region && inRect(x, y, this.region.rect)) return;
    const next = this.model.regionAt(x, y);
    if (next && next !== this.region) this.s.bus.emit('world:region-entered', { regionId: next.id, name: next.name });
    this.region = next;
  }

  /** window.__TDR__ para testes automatizados e depuração (?debug). */
  private exposeDebugHandle(): void {
    (window as unknown as Record<string, unknown>).__TDR__ = {
      scene: this,
      player: () => ({ x: this.player.x, y: this.player.y, t: this.elapsed, sprinting: this.player.isSprinting, stamina: this.player.stats.stamina }),
      culler: () => this.world.culler.stats(),
      world: () => this.world.stats(),
      buildingAt: (x: number, y: number) => this.world.roofs.buildingAt(x, y)?.name ?? null,
      teleport: (x: number, y: number) => this.teleport(x, y),
      map: this.model.map,
      model: this.model,
    };
  }
}

function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}
