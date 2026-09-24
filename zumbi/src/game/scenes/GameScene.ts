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
import { WorldState } from '../sim/WorldState';
import { INTERACTION_TUNING } from '../config/WorldTuning';
import { PLAYER_TUNING } from '../config/PlayerTuning';
import { DoorInteractions } from '../interaction/DoorInteractions';
import { InteractionSystem, type Interactor } from '../interaction/InteractionSystem';
import { ItemInteractions } from '../interaction/ItemInteractions';
import { ContainerInteractions } from '../interaction/ContainerInteractions';
import { LootActions } from '../interaction/LootActions';
import { NatureInteractions } from '../interaction/NatureInteractions';
import { NatureViews } from '../world/render/NatureViews';
import { MINUTES_PER_DAY } from '../sim/GameClock';
import { allItemIds, itemDef } from '../items/ItemCatalog';
import { PlayerInventory } from '../items/PlayerInventory';
import { DoorViews } from '../world/render/DoorViews';
import { InteractionHighlight } from '../world/render/InteractionHighlight';
import { ItemViews } from '../world/render/ItemViews';
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
  private state!: WorldState;
  private inventory!: PlayerInventory;
  private doors!: DoorViews;
  private items!: ItemViews;
  private itemActions!: ItemInteractions;
  private lootActions!: LootActions;
  private nature!: NatureViews;
  private interaction!: InteractionSystem;
  private highlight!: InteractionHighlight;
  private scanTimer = 0;
  private readonly interactor: Interactor = { x: 0, y: 0, radius: PLAYER_TUNING.bodyRadius, facing: 0 };

  constructor() {
    super(SCENES.game);
  }

  create(): void {
    this.s = services(this.game);
    const s = this.s;
    const assets = s.assets;
    if (!assets) throw new Error('Assets não carregados');

    const t0 = performance.now();
    this.model = new WorldModel(buildCity({ ...s.settings.world, ambience: s.settings.nature.density }));
    if (DEBUG.enabled) console.info(`[mundo] cidade ${s.settings.world.sectorsX}x${s.settings.world.sectorsY} gerada em ${Math.round(performance.now() - t0)} ms`);
    const map = this.model.map;
    this.world = new WorldRenderer(this, this.model, assets, s.bus);
    this.physics.world.setBounds(0, 0, this.world.widthPx, this.world.heightPx);

    this.player = new Player(this, map.spawn.x, map.spawn.y, assets, s.bus, this.world.shadows, s.settings.player);
    this.physics.add.collider(this.player.sprite, this.world.solids);
    s.session.stats = this.player.stats;
    this.clock = new GameClock(s.settings.time);
    s.session.clock = this.clock;

    // Estado do mundo (portas, itens) + o que o jogador carrega + interação.
    // Criados antes de carregar os chunks: o desenho de portas/itens entra junto.
    this.state = new WorldState(this.model, { loot: s.settings.loot, nature: s.settings.nature });
    this.inventory = new PlayerInventory();
    s.session.inventory = this.inventory;
    const nowDays = () => this.clock.minutes / MINUTES_PER_DAY;
    s.session.nowDays = nowDays;
    this.doors = new DoorViews(this, this.state, this.world);
    this.items = new ItemViews(this, this.state, this.world, assets);
    this.nature = new NatureViews(this, this.state, this.world, assets, nowDays);
    this.itemActions = new ItemInteractions(this.state, this.inventory);
    this.lootActions = new LootActions(this.state, this.inventory, this.player.stats, nowDays);
    const playerBody = this.interactor;
    this.interaction = new InteractionSystem([
      new DoorInteractions(this.state, s.bus, () => [playerBody]),
      this.itemActions,
      new ContainerInteractions(this.state, s.bus),
      new NatureInteractions(this.state, this.inventory, nowDays),
    ]);
    this.highlight = new InteractionHighlight(this);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.world.widthPx, this.world.heightPx);
    cam.setBackgroundColor('#15161a');
    this.director = new CameraDirector(cam, this.player);
    this.director.setZoom(s.viewport.worldZoom());
    this.director.snap();
    this.loadAroundPlayer();
    cam.fadeIn(600, 10, 10, 12);

    this.keyboardMouse = new KeyboardMouseInput(this);
    this.input.keyboard?.on('keydown-E', () => this.interact());

    // Depois da física: alinhar visuais, câmera e mundo com a posição final do frame.
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.afterPhysics, this);

    const offViewport = s.bus.on('viewport:changed', () => {
      cam.setSize(this.scale.width, this.scale.height);
      this.director.setZoom(s.viewport.worldZoom());
      this.loadAroundPlayer();
    });
    const offInteract = s.bus.on('input:interact', () => this.interact());
    const offDrop = s.bus.on('inventory:drop', (e) => this.drop(e.containerId, e.index, e.count));
    const offLoot = [
      s.bus.on('ui:container-open', (e) => this.openContainer(e.id)),
      s.bus.on('ui:container-close', () => (s.session.openContainer = null)),
      s.bus.on('loot:take', (e) => this.lootResult(e.all ? this.lootActions.takeAll(this.openId()) : this.lootActions.take(this.openId(), e.index))),
      s.bus.on('loot:store', (e) => {
        const from = this.inventory.container(e.containerId);
        if (from) this.lootResult(this.lootActions.store(this.openId(), from, e.index));
      }),
      s.bus.on('inventory:use', (e) => {
        const from = this.inventory.container(e.containerId);
        if (from) this.lootResult(this.lootActions.use(from, e.index));
      }),
      s.bus.on('inventory:unequip', () => {
        const err = this.inventory.unequipBag();
        this.lootResult(err ? { ok: false, message: err, tone: 'warn' } : { ok: true, message: 'Tirou a mochila.', tone: 'info' });
      }),
    ];
    this.events.on(Phaser.Scenes.Events.PAUSE, () => this.keyboardMouse.reset(s.keyboardMouse));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offViewport();
      offInteract();
      offDrop();
      offLoot.forEach((u) => u());
      s.session.inventory = null;
      s.session.openContainer = null;
      s.session.interaction = null;
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.afterPhysics, this);
      s.session.stats = null;
      s.session.clock = null;
    });

    this.scene.launch(SCENES.hud);
    if (DEBUG.enabled) {
      this.debugState = createDebugState();
      this.debugLayer = new DebugWorldLayer(this, this.model, this.debugState, () => this.world.loadedChunkKeys(), this.state, s.bus, () => this.clock.minutes / MINUTES_PER_DAY);
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
    this.keyboardMouse.read(s.keyboardMouse, this.player.x, this.player.y, this.cameras.main, s.session.pointerOverUi);
    const intent = resolveIntent(s.touch, s.keyboardMouse);
    this.player.update(this.dt, intent);
  }

  private afterPhysics(): void {
    this.player.syncVisuals();
    this.director.update(this.dt);
    // Região antes do mundo: o aviso da região sai antes do aviso da construção.
    this.trackRegion();
    this.world.update(this.cameras.main, this.player.x, this.player.y, this.dt);
    this.doors.update(this.dt);
    this.nature.update(this.dt);
    this.scanTimer -= this.dt;
    if (this.scanTimer <= 0) {
      this.scanTimer = 1 / INTERACTION_TUNING.scanHz;
      this.scanInteraction();
    }
    this.highlight.update(this.dt);
    this.debugLayer?.update(this.player.x, this.player.y, this.dt);
  }

  // ---------------------------------------------------------------- interação

  private syncInteractor(): Interactor {
    const i = this.interactor;
    i.x = this.player.x;
    i.y = this.player.y;
    i.facing = this.player.facingAngle;
    return i;
  }

  private scanInteraction(): void {
    const target = this.interaction.scan(this.syncInteractor());
    this.s.session.interaction = target;
    this.highlight.set(target);
    // Recipiente aberto fica para trás quando o jogador se afasta.
    const open = this.s.session.openContainer;
    if (open) {
      const ref = this.state.loot.ref(open.id);
      const far = !ref || this.state.loot.refsNear(this.player.x, this.player.y, INTERACTION_TUNING.doorReach + 70).every((r) => r.ref.id !== open.id);
      if (far) {
        this.s.session.openContainer = null;
        this.s.bus.emit('ui:container-close', {});
      }
    }
  }

  private openId(): string {
    return this.s.session.openContainer?.id ?? '';
  }

  private openContainer(id: string): void {
    const c = this.state.loot.peek(id);
    const ref = this.state.loot.ref(id);
    if (!c || !ref) return;
    this.s.session.openContainer = { id, name: ref.name, container: c };
  }

  private lootResult(r: { ok: boolean; message?: string; tone?: 'ok' | 'info' | 'warn' | 'bad' }): void {
    if (r.message) this.s.bus.emit('player:feedback', { text: r.message, tone: r.tone === 'bad' ? 'warn' : (r.tone ?? (r.ok ? 'ok' : 'warn')) });
    this.s.bus.emit('ui:container-refresh', {});
    this.scanInteraction();
  }

  /** Botão Interagir / tecla E. */
  interact(): void {
    if (this.s.session.paused) return;
    const r = this.interaction.perform(this.syncInteractor());
    this.s.session.interaction = this.interaction.current;
    this.highlight.set(this.interaction.current);
    if (r?.message) this.s.bus.emit('player:feedback', { text: r.message, tone: r.ok ? 'ok' : 'warn' });
  }

  private drop(containerId: string, index: number, count: number): void {
    const c = this.inventory.containers.find((x) => x.id === containerId);
    if (!c) return;
    this.lootResult(this.lootActions.drop(c, index, count, this.player.x, this.player.y));
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

  /** Debug: larga um item qualquer do catálogo aos pés do jogador (não existe no jogo normal). */
  debugSpawnItem(): string {
    const ids = allItemIds();
    const id = ids[Math.floor(Math.random() * ids.length)]!;
    this.state.dropItem(id, 1, this.player.x + (Math.random() - 0.5) * 20, this.player.y + (Math.random() - 0.5) * 20);
    this.scanInteraction();
    return itemDef(id)?.name ?? id;
  }

  /** Debug: tranca/destranca a porta que está no alvo de interação. */
  debugToggleLock(): string {
    const t = this.interaction.current;
    if (!t || t.kind !== 'door') return 'chegue perto de uma porta';
    const id = t.key.slice('porta:'.length);
    const st = this.state.doorState(id);
    if (!st) return 'porta desconhecida';
    if (st.open) return 'feche a porta antes';
    this.state.setDoorLocked(id, !st.locked);
    this.scanInteraction();
    return st.locked ? 'trancada' : 'destrancada';
  }

  /** Números de portas/itens para o painel de debug. */
  interactionStats(): string {
    const target = this.interaction.current;
    const open = this.s.session.openContainer;
    return `portas ${this.doors.count} (${this.doors.colliderCount()} fech.) · itens ${this.items.count}/${this.state.itemCount} · ${this.inventory.weight.toFixed(2)} kg` + `\nrecipientes ${this.state.loot.containerCount} · recursos ${this.nature.count}${open ? ` · aberto: ${open.name}` : ''}` + (target ? `\nalvo: ${target.label}` : '');
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
      state: this.state,
      inventory: this.inventory,
      interaction: () => this.interaction.current,
      interact: () => this.interact(),
      views: () => ({ doors: this.doors.count, doorColliders: this.doors.colliderCount(), items: this.items.count }),
    };
  }
}

function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}
