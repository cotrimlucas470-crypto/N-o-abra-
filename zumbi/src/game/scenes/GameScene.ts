/**
 * Cena do mundo: mapa, jogador, câmera, física, e o laço da sobrevivência
 * (corpo, clima, ações com tempo). A interface (HUD + controles) roda por
 * cima, na HudScene. Regras ficam nos módulos puros; aqui só se liga tudo.
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
import { GameClock, MINUTES_PER_DAY } from '../sim/GameClock';
import { WorldState } from '../sim/WorldState';
import { INTERACTION_TUNING } from '../config/WorldTuning';
import { PLAYER_TUNING } from '../config/PlayerTuning';
import { DoorInteractions } from '../interaction/DoorInteractions';
import { InteractionSystem, type InteractionOption, type Interactor } from '../interaction/InteractionSystem';
import { ItemInteractions } from '../interaction/ItemInteractions';
import { ContainerInteractions } from '../interaction/ContainerInteractions';
import { FurnitureInteractions } from '../interaction/FurnitureInteractions';
import { ItemUse } from '../interaction/ItemUse';
import { LootActions } from '../interaction/LootActions';
import { NatureInteractions } from '../interaction/NatureInteractions';
import type { ItemResult } from '../interaction/itemActions/types';
import { NatureViews } from '../world/render/NatureViews';
import { allItemIds, itemDef } from '../items/ItemCatalog';
import { PlayerInventory } from '../items/PlayerInventory';
import { saveGame, type GameSave } from '../save/SaveGame';
import { ActionRunner, type ActionOutcome } from '../sim/Actions';
import { Calendar } from '../sim/Calendar';
import { Weather } from '../sim/Weather';
import { restAction } from '../survival/Sleep';
import { SurvivalLoop } from '../survival/SurvivalLoop';
import { Survivor } from '../survival/Survivor';
import { Atmosphere, type LightSource } from '../world/render/Atmosphere';
import { DoorViews } from '../world/render/DoorViews';
import { InteractionHighlight } from '../world/render/InteractionHighlight';
import { ItemViews } from '../world/render/ItemViews';
import { buildCity } from '../world/districts/CityGenerator';
import type { RegionData } from '../world/MapTypes';
import { WorldModel } from '../world/WorldModel';
import { WorldRenderer } from '../world/render/WorldRenderer';

/** Roupa com que o personagem começa (é dele, não é loot). */
const STARTING_OUTFIT = ['camiseta', 'calcaJeans', 'meias', 'tenis'] as const;
/** Salvamento automático (s reais). */
const AUTOSAVE_SECONDS = 90;

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
  private survivor!: Survivor;
  private loop!: SurvivalLoop;
  private atmosphere!: Atmosphere;
  private itemUse!: ItemUse;
  private options: InteractionOption[] = [];
  private readonly lightSources: LightSource[] = [];
  private scanTimer = 0;
  private autosaveTimer = AUTOSAVE_SECONDS;
  private readonly interactor: Interactor = { x: 0, y: 0, radius: PLAYER_TUNING.bodyRadius, facing: 0 };

  constructor() {
    super(SCENES.game);
  }

  create(): void {
    this.s = services(this.game);
    const s = this.s;
    const assets = s.assets;
    if (!assets) throw new Error('Assets não carregados');
    const load: GameSave | null = s.session.pendingLoad;
    s.session.pendingLoad = null;

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
    if (load) this.clock.restore(load.clock);
    s.session.clock = this.clock;

    // Estado do mundo + o que o jogador carrega. Restaurados ANTES de criar os
    // desenhos: portas, itens e recipientes já nascem no estado salvo.
    this.state = new WorldState(this.model, { loot: s.settings.loot, nature: s.settings.nature });
    if (load) this.state.restore(load.world);
    this.inventory = new PlayerInventory();
    if (load) this.inventory.restore(load.inventory);
    else for (const id of STARTING_OUTFIT) this.inventory.putOn(id);
    s.session.inventory = this.inventory;

    // Corpo, clima e ações com tempo.
    const sv = s.settings.survival;
    this.survivor = new Survivor(this.player.stats, this.inventory, { hunger: sv.hungerRate, thirst: sv.thirstRate, fatigue: sv.fatigueRate });
    if (load) {
      this.survivor.body.restore(load.body);
      this.player.restore(load.player);
    }
    const calendar = new Calendar({ month: s.settings.time.startMonth, day: s.settings.time.startDayOfMonth });
    const weather = new Weather(s.settings.world.seed, calendar, s.settings.climate);
    this.loop = new SurvivalLoop(this.clock, calendar, weather, this.survivor, new ActionRunner(), this.model, {
      outcome: (o) => this.outcome(o),
    });
    s.session.survival = this.loop;

    const nowDays = () => this.clock.minutes / MINUTES_PER_DAY;
    s.session.nowDays = nowDays;
    this.doors = new DoorViews(this, this.state, this.world);
    this.items = new ItemViews(this, this.state, this.world, assets);
    this.nature = new NatureViews(this, this.state, this.world, assets, nowDays);
    this.itemActions = new ItemInteractions(this.state, this.inventory);
    this.lootActions = new LootActions(this.state, this.inventory);
    this.itemUse = new ItemUse({
      inventory: this.inventory,
      survivor: this.survivor,
      state: this.state,
      now: nowDays,
      openContainerId: () => s.session.openContainer?.id ?? null,
      position: () => ({ x: this.player.x, y: this.player.y }),
      hooks: {
        noise: (radius, source) => s.bus.emit('world:noise', { x: this.player.x, y: this.player.y, radius, source }),
        drop: (defId, count, st) => this.lootActions.dropLoose(defId, count, st, this.player.x, this.player.y),
      },
    });
    s.session.itemUse = this.itemUse;
    const playerBody = this.interactor;
    this.interaction = new InteractionSystem([
      new DoorInteractions(this.state, s.bus, () => [playerBody]),
      this.itemActions,
      new ContainerInteractions(this.state, s.bus),
      new NatureInteractions(this.state, this.inventory, nowDays),
      new FurnitureInteractions(this.state, {
        sleep: (place) => {
          const why = this.loop.sleep({ place, blanket: this.inventory.hasTag('aquecer') });
          return why ? { ok: false, message: why } : { ok: true };
        },
        rest: (where) => {
          this.loop.start(restAction(this.survivor, (f) => (this.player.stats.stamina = Math.min(this.player.stats.maxStamina, this.player.stats.stamina + f * this.player.stats.maxStamina)), where));
          return { ok: true };
        },
      }),
    ]);
    this.highlight = new InteractionHighlight(this);
    this.atmosphere = new Atmosphere(this, this.world.shadows);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.world.widthPx, this.world.heightPx);
    cam.setBackgroundColor('#15161a');
    this.director = new CameraDirector(cam, this.player);
    this.director.setZoom(s.viewport.worldZoom());
    if (load) this.teleport(load.player.x, load.player.y);
    this.director.snap();
    this.loadAroundPlayer();
    cam.fadeIn(600, 10, 10, 12);

    this.keyboardMouse = new KeyboardMouseInput(this);
    this.input.keyboard?.on('keydown-E', () => this.interact());
    this.input.keyboard?.on('keydown-Q', () => this.requestOptions());

    // Depois da física: alinhar visuais, câmera e mundo com a posição final do frame.
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.afterPhysics, this);

    const offs = [
      s.bus.on('viewport:changed', () => {
        cam.setSize(this.scale.width, this.scale.height);
        this.director.setZoom(s.viewport.worldZoom());
        this.loadAroundPlayer();
      }),
      s.bus.on('input:interact', () => this.interact()),
      s.bus.on('ui:container-open', (e) => this.openContainer(e.id)),
      s.bus.on('ui:container-close', () => (s.session.openContainer = null)),
      s.bus.on('loot:take', (e) => this.itemResult(e.all ? this.lootActions.takeAll(this.openId()) : this.lootActions.take(this.openId(), e.index))),
      s.bus.on('item:action', (e) => this.itemResult(this.itemUse.run(e.action, e.loc))),
      s.bus.on('interaction:options', () => this.requestOptions()),
      s.bus.on('interaction:option', (e) => this.chooseOption(e.index)),
      s.bus.on('action:cancel', () => this.loop.cancelAction()),
      s.bus.on('body:sleep', (e) => {
        const why = this.loop.sleep({ place: e.place, blanket: this.inventory.hasTag('aquecer'), ...(e.wakeAt !== undefined ? { wakeAt: e.wakeAt } : {}) });
        if (why) this.outcome({ ok: false, message: why, tone: 'warn' });
      }),
      s.bus.on('game:save-request', () => this.save()),
      s.bus.on('game:paused', () => this.save()),
    ];
    this.events.on(Phaser.Scenes.Events.PAUSE, () => this.keyboardMouse.reset(s.keyboardMouse));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offs.forEach((u) => u());
      s.session.inventory = null;
      s.session.openContainer = null;
      s.session.interaction = null;
      s.session.survival = null;
      s.session.itemUse = null;
      s.session.options = null;
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
    const s = this.s;
    this.keyboardMouse.read(s.keyboardMouse, this.player.x, this.player.y, this.cameras.main, s.session.pointerOverUi);
    const intent = resolveIntent(s.touch, s.keyboardMouse);
    const moving = Math.hypot(intent.moveX, intent.moveY) > 0.15;
    this.loop.frame(delta / 1000, { x: this.player.x, y: this.player.y, moving, sprinting: this.player.isSprinting });
    // Dormindo: o corpo fica parado; o resto do estado físico vira velocidade e fôlego.
    this.player.frozen = this.loop.sleeping || this.loop.runner.current?.id === 'descansar';
    const fx = this.loop.effects;
    this.player.setMoveEffects(fx.walk, fx.run);
    this.player.stats.setBodyEffects(fx);
    this.player.update(this.dt, intent);

    this.autosaveTimer -= delta / 1000;
    if (this.autosaveTimer <= 0 && !this.loop.runner.active) this.save();
  }

  private afterPhysics(): void {
    this.player.syncVisuals();
    this.director.update(this.dt);
    // Região antes do mundo: o aviso da região sai antes do aviso da construção.
    this.trackRegion();
    this.world.update(this.cameras.main, this.player.x, this.player.y, this.dt);
    this.doors.update(this.dt);
    this.nature.update(this.dt);
    this.atmosphere.update(this.dt, this.cameras.main, {
      minuteOfDay: this.clock.minuteOfDay,
      weather: this.loop.weather,
      sheltered: this.loop.sheltered,
      player: { x: this.player.x, y: this.player.y },
      flashlight: this.flashlight(),
      lights: this.lightSources,
    });
    this.scanTimer -= this.dt;
    if (this.scanTimer <= 0) {
      this.scanTimer = 1 / INTERACTION_TUNING.scanHz;
      this.scanInteraction();
    }
    this.highlight.update(this.dt);
    this.debugLayer?.update(this.player.x, this.player.y, this.dt);
  }

  /** Lanterna ligada na mão ou na cabeça: facho para onde o jogador olha. */
  private flashlight(): { angle: number; range: number } | null {
    const h = this.inventory.hand;
    const hd = this.inventory.handDef;
    const lit = (h?.st?.on && hd?.tags.includes('luz')) || [...this.inventory.worn.values()].some((w) => w.st?.on && itemDef(w.defId)?.tags.includes('luz'));
    if (!lit) return null;
    const phone = hd?.id === 'celular' && h?.st?.on;
    return { angle: this.player.facingAngle, range: phone ? 230 : 420 };
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

  /** Mensagem de uma ação na tela. */
  private outcome(r: ActionOutcome): void {
    if (r.message) {
      const tone = r.tone ?? (r.ok ? 'ok' : 'warn');
      this.s.bus.emit('player:feedback', { text: r.message, tone: tone === 'bad' ? 'warn' : tone });
    }
    this.s.bus.emit('ui:container-refresh', {});
  }

  private itemResult(r: ItemResult | { ok: boolean; message?: string; tone?: 'ok' | 'info' | 'warn' | 'bad' }): void {
    if ('timed' in r && r.timed) this.loop.start(r.timed);
    this.outcome(r);
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

  /** Botão "⋯" / tecla Q: monta a lista de ações por perto. */
  private requestOptions(): void {
    if (this.s.session.paused) return;
    this.options = this.interaction.options(this.syncInteractor());
    this.s.session.options = this.options.map((o) => ({ label: o.label, enabled: o.enabled }));
    this.s.bus.emit('ui:options-ready', {});
  }

  private chooseOption(index: number): void {
    const o = this.options[index];
    this.s.session.options = null;
    if (!o) return;
    const r = o.perform();
    this.scanInteraction();
    if (r.message) this.s.bus.emit('player:feedback', { text: r.message, tone: r.ok ? 'ok' : 'warn' });
  }

  // ---------------------------------------------------------------- save

  private gatherSave(): Omit<GameSave, 'version' | 'savedAt' | 'game'> {
    return {
      settings: this.s.settings,
      clock: this.clock.snapshot(),
      player: this.player.snapshot(),
      body: this.survivor.body.snapshot(),
      inventory: this.inventory.serialize(),
      world: this.state.serialize(),
    };
  }

  /** Salva agora (automático, pausa, menu). */
  save(): boolean {
    this.autosaveTimer = AUTOSAVE_SECONDS;
    const ok = saveGame(this.gatherSave());
    this.s.bus.emit('game:saved', { ok });
    return ok;
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
    const b = this.survivor.body;
    const w = this.loop.weather;
    return (
      `portas ${this.doors.count} (${this.doors.colliderCount()} fech.) · itens ${this.items.count}/${this.state.itemCount} · ${this.inventory.weight.toFixed(2)} kg` +
      `\nrecipientes ${this.state.loot.containerCount} · recursos ${this.nature.count}${open ? ` · aberto: ${open.name}` : ''}` +
      `\nfome ${b.hunger.toFixed(0)} sede ${b.thirst.toFixed(0)} sono ${b.fatigue.toFixed(0)} · ${b.temp.toFixed(1)}°C · ar ${w.temp.toFixed(1)}°C ${w.sky}${this.loop.sheltered ? ' (abrigo)' : ''}` +
      (target ? `\nalvo: ${target.label}` : '')
    );
  }

  /** Carrega de uma vez os chunks da tela (início, teleporte, mudança de tamanho de tela). */
  private loadAroundPlayer(): void {
    const cam = this.cameras.main;
    this.world.ensureLoadedAround(this.player.x, this.player.y, cam.width / cam.zoom, cam.height / cam.zoom);
  }

  /** Teleporta o jogador (debug, carregar jogo) com os chunks do destino já carregados. */
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
      player: () => ({ x: this.player.x, y: this.player.y, t: this.elapsed, sprinting: this.player.isSprinting, stamina: this.player.stats.stamina, health: this.player.stats.health }),
      culler: () => this.world.culler.stats(),
      world: () => this.world.stats(),
      buildingAt: (x: number, y: number) => this.world.roofs.buildingAt(x, y)?.name ?? null,
      teleport: (x: number, y: number) => this.teleport(x, y),
      map: this.model.map,
      model: this.model,
      state: this.state,
      inventory: this.inventory,
      survivor: this.survivor,
      loop: this.loop,
      clock: this.clock,
      atmosphere: () => ({ darkness: this.atmosphere.darkness }),
      itemUse: this.itemUse,
      save: () => this.save(),
      interaction: () => this.interaction.current,
      interact: () => this.interact(),
      views: () => ({ doors: this.doors.count, doorColliders: this.doors.colliderCount(), items: this.items.count }),
    };
  }
}

function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}
