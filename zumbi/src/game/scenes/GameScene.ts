/**
 * Cena do mundo: mapa, jogador, câmera, física, e o laço da sobrevivência
 * (corpo, clima, ações com tempo). A interface (HUD + controles) roda por
 * cima, na HudScene. Regras ficam nos módulos puros; aqui só se liga tudo.
 */
import Phaser from 'phaser';
import { SCENES } from '../config/GameConfig';
import { DEBUG } from '../core/Debug';
import { services, type GameServices } from '../core/Services';
import { Player, type HeldLook } from '../entities/player/Player';
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
import { InteractionSystem, type InteractionOption, type InteractionResult, type Interactor } from '../interaction/InteractionSystem';
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
import { loadGame, saveGame, type GameSave } from '../save/SaveGame';
import { ActionRunner, type ActionOutcome } from '../sim/Actions';
import { Calendar } from '../sim/Calendar';
import { Weather } from '../sim/Weather';
import { restAction } from '../survival/Sleep';
import { Hazards } from '../survival/Hazards';
import { treatmentsFor } from '../health/Treatments';
import { woundTitle, type HealthSave } from '../health/Health';
import { BODY_PARTS, type BodyPart, type WoundKind } from '../health/Wounds';
import { SurvivalLoop } from '../survival/SurvivalLoop';
import { Survivor } from '../survival/Survivor';
import { Atmosphere, type LightSource } from '../world/render/Atmosphere';
import { Combat, type AttackResult } from '../combat/Combat';
import { CombatFx } from '../world/render/CombatFx';
import { WindowViews } from '../world/render/WindowViews';
import { ToolInteractions, WindowInteractions, type WorldActionHooks } from '../interaction/ToolInteractions';
import { VehicleInteractions } from '../interaction/VehicleInteractions';
import { VehicleViews } from '../world/render/VehicleViews';
import { StructureViews } from '../world/render/StructureViews';
import { FireSystem } from '../build/FireSystem';
import { PowerSystem } from '../build/PowerSystem';
import { POWER_TUNING } from '../build/Power';
import { CraftService } from '../crafting/CraftService';
import { RECIPE_BY_ID } from '../crafting/Recipes';
import { StructureInteractions } from '../interaction/StructureInteractions';
import { DemolishInteractions } from '../interaction/DemolishInteractions';
import { BuildSystem } from '../build/BuildSystem';
import { STRUCTURE_DEFS } from '../build/StructureCatalog';
import type { SleepPlace } from '../survival/Sleep';
import { WaterInteractions } from '../interaction/WaterInteractions';
import { isSheltered } from '../world/shelter';
import type { SkillsSave } from '../skills/Skills';
import { DoorViews } from '../world/render/DoorViews';
import { InteractionHighlight } from '../world/render/InteractionHighlight';
import { ItemViews } from '../world/render/ItemViews';
import { buildCity } from '../world/districts/CityGenerator';
import { addUpperFloors } from '../world/floors/UpperFloors';
import { bridgeNoise } from '../world/floors/NoiseBridge';
import type { FloorData, RegionData, StairPlacement } from '../world/MapTypes';
import { FloorCamera } from '../world/render/FloorCamera';
import { StairViews } from '../world/render/StairViews';
import { levelName, StairInteractions } from '../interaction/StairInteractions';
import { WorldModel } from '../world/WorldModel';
import { WorldRenderer, type Upstairs } from '../world/render/WorldRenderer';
import { NOISE_RADIUS } from '../config/NoiseTuning';
import { kindFromSource, NoiseSystem } from '../sim/Noise';
import { ZombieSystem } from '../zombies/ZombieSystem';
import { difficultyFrom } from '../zombies/Difficulty';
import { generatePopulation } from '../zombies/Population';
import { resolveAttack, type AttackKind, type AttackOutcome, type PlayerDefense } from '../zombies/Assault';
import type { LightEnv, PlayerSense } from '../zombies/Senses';
import type { Zombie } from '../zombies/Zombie';
import type { ZombieStoreSave } from '../zombies/ZombieStore';
import { bodyRadius } from '../zombies/ZombieMotion';
import { PART_NAME } from '../zombies/Wounding';
import { ZombieViews } from '../world/render/ZombieViews';
import { ARCHETYPES, type ArchId } from '../zombies/Archetypes';
import { createZombie } from '../zombies/ZombieFactory';
import { corpseLoot } from '../zombies/CorpseLoot';
import { explainDeath } from '../survival/Death';
import { DriveSession } from '../vehicles/DriveSession';
import { VEHICLE_SPECS, type VehicleType } from '../vehicles/Vehicles';
import type { SleepOptions } from '../survival/Sleep';

/** Como o jogador descreve o que ouviu. */
const HEARD_LABEL: Partial<Record<import('../sim/Noise').NoiseKind, string>> = {
  zumbi: 'gemido',
  batida: 'batidas',
  demolicao: 'algo cedeu',
  vidro: 'vidro quebrando',
  tiro: 'tiro',
  alarme: 'alarme',
  porta: 'porta',
  motor: 'motor',
  buzina: 'buzina',
  gerador: 'gerador',
  grito: 'grito',
  queda: 'algo caiu',
  golpe: 'pancada',
  impacto: 'pancada',
};

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
  private hazards!: Hazards;
  private combat!: Combat;
  private combatFx!: CombatFx;
  private attackCooldown = 0;
  private vehicleViews!: VehicleViews;
  private structureViews!: StructureViews;
  private fires!: FireSystem;
  /** Andar de cima em que o jogador está (null = térreo/cidade). */
  private floor: FloorData | null = null;
  private floorCam!: FloorCamera;
  private power!: PowerSystem;
  private powerTimer = 0;
  /** Fumaça de gerador respirada (0..1, cai devagar no ar limpo) e o último aviso. */
  private fumes = 0;
  private fumesWarn = 0;
  private crafting!: CraftService;
  private builds!: BuildSystem;
  private fireTimer = 0;
  private buildTimer = 0;
  /** Modo construir: receita escolhida (a prévia segue o jogador). */
  private buildRecipe: string | null = null;
  private alarmTimer = 0;
  private options: InteractionOption[] = [];
  private readonly lightSources: LightSource[] = [];
  private scanTimer = 0;
  private autosaveTimer = AUTOSAVE_SECONDS;
  private readonly interactor: Interactor = { x: 0, y: 0, radius: PLAYER_TUNING.bodyRadius, facing: 0 };
  private noise!: NoiseSystem;
  private zombies!: ZombieSystem;
  private zombieViews!: ZombieViews;
  /** Morreu: nada mais salva nem responde; a tela de morte assume. */
  private dead = false;
  /** Barulhos fortes do jogador (tiro, vidro...) nos últimos minutos: explicam a morte. */
  private readonly loudNoises: { t: number; source: string }[] = [];
  private dangerTimer = 0;
  /** Ao volante (null = a pé). */
  private drive: DriveSession | null = null;

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
    s.session.floor = null;

    const t0 = performance.now();
    // Cidade + andares de cima (camada numa faixa fora da cidade: o traçado não muda).
    this.model = new WorldModel(addUpperFloors(buildCity({ ...s.settings.world, ambience: s.settings.nature.density })));
    if (DEBUG.enabled) console.info(`[mundo] cidade ${s.settings.world.sectorsX}x${s.settings.world.sectorsY} gerada em ${Math.round(performance.now() - t0)} ms`);
    const map = this.model.map;
    // Estado do mundo antes do desenho: portas, itens, recipientes e objetos
    // quebrados já nascem no estado salvo.
    this.state = new WorldState(this.model, { loot: s.settings.loot, nature: s.settings.nature });
    if (load) this.state.restore(load.world);
    this.world = new WorldRenderer(this, this.model, assets, s.bus, { isPropRemoved: (id) => this.state.isPropHidden(id), wallPieces: (i) => this.state.wallPieces(i) });
    this.physics.world.setBounds(0, 0, this.world.widthPx, this.model.floors.cityHeightPx);

    this.player = new Player(this, map.spawn.x, map.spawn.y, assets, s.bus, this.world.shadows, s.settings.player);
    this.physics.add.collider(this.player.sprite, this.world.solids);
    s.session.stats = this.player.stats;
    this.clock = new GameClock(s.settings.time);
    if (load) this.clock.restore(load.clock);
    s.session.clock = this.clock;

    this.inventory = new PlayerInventory();
    if (load) this.inventory.restore(load.inventory);
    else for (const id of STARTING_OUTFIT) this.inventory.putOn(id);
    s.session.inventory = this.inventory;

    // Corpo, clima e ações com tempo.
    const sv = s.settings.survival;
    this.survivor = new Survivor(this.player.stats, this.inventory, { hunger: sv.hungerRate, thirst: sv.thirstRate, fatigue: sv.fatigueRate });
    if (load) {
      this.survivor.body.restore(load.body);
      this.survivor.health.restore(load.modules?.['health'] as HealthSave | undefined);
      this.survivor.skills.restore(load.modules?.['skills'] as SkillsSave | undefined);
      this.player.restore(load.player);
    }
    const calendar = new Calendar({ month: s.settings.time.startMonth, day: s.settings.time.startDayOfMonth });
    const weather = new Weather(s.settings.world.seed, calendar, s.settings.climate);
    // Fogos do mundo: calor no corpo, luz, cozinha.
    const covered = (x: number, y: number) => isSheltered(this.model, x, y, (cx, cy) => this.state.coveredAt(cx, cy));
    this.fires = new FireSystem(this.state, covered);
    // Geradores: energia para um prédio, barulho que chama zumbi, fumaça em lugar fechado.
    this.power = new PowerSystem(this.state, this.state.loot, {
      noise: (x, y, radius) => s.bus.emit('world:noise', { x, y, radius, source: 'gerador', kind: 'gerador' }),
    });
    this.builds = new BuildSystem(this.state, covered, s.settings.farming.growthSpeed);
    this.loop = new SurvivalLoop(this.clock, calendar, weather, this.survivor, new ActionRunner(), this.model, {
      outcome: (o) => this.outcome(o),
      fireHeat: (x, y) => this.fires.heat(x, y, this.clock.minutes),
      extraCover: (x, y) => this.state.coveredAt(x, y),
    });
    if (typeof load?.modules?.['radioDay'] === 'number') this.loop.radioDay = load.modules['radioDay'] as number;
    s.session.survival = this.loop;
    const util = s.settings.utilities;
    const waterOn = () => this.clock.day <= util.waterDays;
    const gasOn = () => this.clock.day <= util.gasDays;

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
        reload: () => this.combat.reload(this.survivor.skills.speed('armas') * this.loop.effects.actionTime),
        unjam: () => this.combat.unjam(),
        light: () => this.lightLevel(),
        radioHeard: () => (this.loop.radioDay = this.clock.day),
        time: () => ({ minuteOfDay: this.clock.minuteOfDay, day: this.clock.day }),
        show: (kind, data) => {
          if (kind === 'mapa') s.bus.emit('ui:map', { annotated: !!(data as { annotated?: boolean } | undefined)?.annotated });
        },
        craft: (id) => this.crafting.start(id),
        craftReady: (id) => {
          const r = RECIPE_BY_ID.get(id);
          if (!r) return 'Receita desconhecida.';
          const c = this.crafting.check(r);
          return c.ok ? true : (c.reason ?? 'Não dá agora.');
        },
        weather: () => ({ rain: this.loop.weather.rain, sheltered: this.loop.sheltered }),
      },
    });
    s.session.itemUse = this.itemUse;
    this.hazards = new Hazards(this.state, this.survivor, this.inventory);
    this.combat = new Combat(this.state, this.survivor, this.inventory, {
      stamina: () => this.player.stats.stamina,
      spendStamina: (n) => this.player.stats.spend(n),
      creatures: {
        melee: (x, y, f, reach) => {
          const z = this.zombies.meleeTarget(x, y, f, reach);
          return z ? { id: z.id, dist: Math.max(0, Math.hypot(z.x - x, z.y - y) - bodyRadius(z)), x: z.x, y: z.y } : null;
        },
        ray: (x, y, a, max) => {
          const r = this.zombies.rayTarget(x, y, a, max);
          return r ? { id: r.z.id, dist: r.dist, x: r.z.x, y: r.z.y } : null;
        },
        hit: (id, h) => {
          const z = this.zombies.store.get(id);
          if (!z || z.dead) return null;
          const r = this.zombies.hit(z, h);
          const life = Math.max(0, Math.min(z.parts.cabeca, z.parts.pescoco, z.parts.tronco));
          return { x: z.x, y: z.y, killed: r.killed, frac: r.after, part: r.part, life, crit: r.fall || r.severed, ...(r.note ? { note: r.note } : {}) };
        },
      },
    });
    // Ruído e zumbis: tudo que faz barulho passa pelo barramento e chega aqui.
    this.noise = new NoiseSystem(this.model.sight, () => ({ rain: this.loop.weather.rain, wind: this.loop.weather.wind }));
    const diff = difficultyFrom(s.settings.zombies);
    this.zombies = new ZombieSystem(this.model, this.state, this.noise, diff, {
      attack: (z, kind) => this.zombieAttack(z, kind),
      noise: (x, y, kind, radius, source) => s.bus.emit('world:noise', { x, y, radius: radius ?? NOISE_RADIUS[kind], source: source ?? kind, kind }),
      killed: (z) => {
        this.registerCorpse(z);
        // Qualquer morte (golpe, tiro, atropelo): estouro de sangue e pedaços.
        this.combatFx?.kill(z.x, z.y, z.corpseAngle ?? 0);
      },
      vehicleBang: (z) => this.vehicleBang(z),
    });
    const zsave = load?.modules?.['zombies'] as (ZombieStoreSave & { kills?: number }) | undefined;
    if (!this.zombies.restore(zsave)) {
      // Jogo novo (ou save de antes dos zumbis): ninguém perto de onde o jogador está.
      const safe = load ? { x: load.player.x, y: load.player.y } : map.spawn;
      this.zombies.populate(generatePopulation(map, this.model.nav, { population: diff.population, collapseDays: s.settings.loot.collapseAgeDays, safe }));
    } else if (this.model.floors.any && !this.zombies.store.all.some((z) => this.model.floors.spaceAt(z.x, z.y) > 0)) {
      // Save de antes dos andares: os andares de cima ganham a população deles (ids próprios).
      const upper = generatePopulation(map, this.model.nav, { population: diff.population, collapseDays: s.settings.loot.collapseAgeDays, safe: { x: -9999, y: -9999 } })
        .filter((sp) => this.model.floors.spaceAt(sp.x, sp.y) > 0)
        .map((sp) => ({ ...sp, id: `andar-${sp.id}` }));
      this.zombies.populate(upper);
    }
    // Corpos viram recipientes (REVISTAR); o que já foi mexido volta do save.
    for (const z of this.zombies.store.all) if (z.dead) this.registerCorpse(z);
    const lootSave = load?.world.loot;
    if (lootSave) {
      const corpse = (id: string) => id.startsWith('corpo:');
      this.state.loot.restore({ searched: (lootSave.searched ?? []).filter(corpse), containers: Object.fromEntries(Object.entries(lootSave.containers ?? {}).filter(([id]) => corpse(id))) });
    }
    const worldHooks: WorldActionHooks = {
      start: (spec) => this.loop.start(spec),
      drop: (items, x, y) => {
        for (const it of items) this.lootActions.dropLoose(it.defId, it.count, it.st, x, y);
      },
      noise: (x, y, radius, source) => s.bus.emit('world:noise', { x, y, radius, source }),
      moveTo: (x, y) => this.teleport(x, y),
      now: nowDays,
      damage: (n) => this.player.stats.setHealth(this.player.stats.health - n),
    };
    this.crafting = new CraftService(this.state, this.inventory, this.survivor, {
      start: (spec) => this.loop.start(spec),
      drop: worldHooks.drop,
      where: () => ({ x: this.player.x, y: this.player.y, facing: this.player.facingAngle }),
      minutes: () => this.clock.minutes,
      days: nowDays,
      gasOn,
    });
    s.session.crafting = this.crafting;
    const tools = new ToolInteractions(this.state, this.inventory, this.survivor, worldHooks);
    const windows = new WindowInteractions(this.state, this.inventory, this.survivor, worldHooks);
    // Objeto quebrado/removido: o chunk é redesenhado (colisão e desenho somem juntos).
    const offProps = this.state.onChange((c) => {
      if ((c.type === 'prop' && c.removed) || c.type === 'wall') this.world.refreshChunk(this.model.index.chunkOfPoint(c.x, c.y));
      // Carro saiu do lugar do mapa: o chunk de onde ele estava é redesenhado sem ele.
      if (c.type === 'vehicle' && c.first) {
        const o = this.state.vehicles.original(c.id);
        if (o) this.world.refreshChunk(this.model.index.chunkOfPoint(o.x, o.y));
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offProps);
    const playerBody = this.interactor;
    this.interaction = new InteractionSystem([
      new DoorInteractions(
        this.state,
        s.bus,
        () => [playerBody, ...this.zombies.store.aliveNear(this.player.x, this.player.y, 260).map((z) => ({ x: z.x, y: z.y, radius: bodyRadius(z), facing: z.facing }))],
        (d, who) => tools.doorOptions(d, who),
      ),
      this.itemActions,
      new ContainerInteractions(this.state, s.bus),
      new NatureInteractions(this.state, this.inventory, nowDays),
      new FurnitureInteractions(this.state, {
        sleep: (place: SleepPlace) => {
          const why = this.trySleep({ place, blanket: this.inventory.hasTag('aquecer') });
          return why ? { ok: false, message: why } : { ok: true };
        },
        rest: (where) => {
          this.loop.start(restAction(this.survivor, (f) => (this.player.stats.stamina = Math.min(this.player.stats.maxStamina, this.player.stats.stamina + f * this.player.stats.maxStamina)), where));
          return { ok: true };
        },
      }),
    ]);
    this.interaction.add(tools);
    this.interaction.add(windows);
    this.interaction.add(
      new VehicleInteractions(this.state, this.inventory, this.survivor, {
        ...worldHooks,
        openContainer: (id) => {
          if (!this.state.openContainer(id)) return;
          s.bus.emit('ui:container-open', { id });
        },
        info: (title, lines) => s.bus.emit('ui:info', { title, lines }),
        drive: (prop) => this.startDriving(prop.id),
      }),
    );
    this.interaction.add(
      new StructureInteractions(this.state, this.inventory, this.survivor, {
        start: (spec) => this.loop.start(spec),
        minutes: () => this.clock.minutes,
        openCraft: () => s.bus.emit('ui:tab', { tab: 'fabricar' }),
        sleep: (place) => {
          const why = this.trySleep({ place, blanket: this.inventory.hasTag('aquecer') });
          return why ? { ok: false, message: why } : { ok: true };
        },
        rest: (where) => {
          this.loop.start(restAction(this.survivor, (f) => (this.player.stats.stamina = Math.min(this.player.stats.maxStamina, this.player.stats.stamina + f * this.player.stats.maxStamina)), where));
          return { ok: true };
        },
        noise: worldHooks.noise,
        drop: (defId, count, st, x, y) => this.lootActions.dropLoose(defId, count, st, x, y),
      }),
    );
    this.interaction.add(new DemolishInteractions(this.state, this.inventory, this.survivor, worldHooks));
    this.interaction.add(
      new WaterInteractions(this.state, this.inventory, this.survivor, {
        start: (spec) => this.loop.start(spec),
        waterOn,
        drop: (defId, count, st) => this.lootActions.dropLoose(defId, count, st, this.player.x, this.player.y),
      }),
    );
    this.vehicleViews = new VehicleViews(this, this.state, this.world, assets);
    this.structureViews = new StructureViews(this, this.state, this.world, () => this.clock.minutes, () => ({ x: this.player.x, y: this.player.y }));
    this.highlight = new InteractionHighlight(this);
    new WindowViews(this, this.state, this.world);
    this.combatFx = new CombatFx(this);
    this.zombieViews = new ZombieViews(this, this.zombies, this.world.shadows);
    this.atmosphere = new Atmosphere(this, this.world.shadows);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.world.widthPx, this.model.floors.cityHeightPx);
    cam.setBackgroundColor('#15161a');
    // Andares: escadas, a vista da rua lá de cima e a troca de andar.
    new StairViews(this, this.model, this.world);
    this.floorCam = new FloorCamera(this, '#15161a', () => this.atmosphere.screenObjects());
    this.interaction.add(new StairInteractions(this.model, { go: (st, level) => this.useStairs(st, level) }));
    this.director = new CameraDirector(cam, this.player);
    this.director.setZoom(s.viewport.worldZoom());
    if (load) this.teleport(load.player.x, load.player.y);
    this.director.snap();
    this.loadAroundPlayer();
    cam.fadeIn(600, 10, 10, 12);

    this.keyboardMouse = new KeyboardMouseInput(this);
    this.input.keyboard?.on('keydown-E', () => this.interact());
    this.input.keyboard?.on('keydown-Q', () => this.requestOptions());
    this.input.keyboard?.on('keydown-F', () => this.attack());
    this.input.keyboard?.on('keydown-SPACE', () => this.attack());
    this.input.keyboard?.on('keydown-R', () => this.reload());
    this.input.keyboard?.on('keydown-G', () => this.shove());
    this.input.keyboard?.on('keydown-C', () => this.toggleSneak());

    // Depois da física: alinhar visuais, câmera e mundo com a posição final do frame.
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.afterPhysics, this);

    const offs = [
      s.bus.on('viewport:changed', () => {
        // A tela pode mudar de tamanho com a cena parando/recomeçando: sem câmera, nada a fazer.
        if (!this.sys.isActive() || !this.cameras.main) return;
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
        const why = this.trySleep({ place: e.place, blanket: this.inventory.hasTag('aquecer'), ...(e.wakeAt !== undefined ? { wakeAt: e.wakeAt } : {}) });
        if (why) this.outcome({ ok: false, message: why, tone: 'warn' });
      }),
      s.bus.on('health:treat', (e) => this.treat(e.wound, e.option)),
      s.bus.on('build:start', (e) => {
        this.buildRecipe = e.recipe;
        this.crafting.buildRot = 0;
      }),
      s.bus.on('build:confirm', () => this.confirmBuild()),
      s.bus.on('build:rotate', () => (this.crafting.buildRot = (this.crafting.buildRot + 1) % 4)),
      s.bus.on('build:cancel', () => (this.buildRecipe = null)),
      s.bus.on('craft:start', (e) => {
        const why = this.crafting.start(e.recipe);
        if (why) this.outcome({ ok: false, message: why, tone: 'warn' });
      }),
      s.bus.on('input:attack', () => this.attack()),
      s.bus.on('input:shove', () => this.shove()),
      s.bus.on('input:sneak', () => this.toggleSneak()),
      s.bus.on('world:noise', (e) => this.onNoise(e)),
      s.bus.on('player:footstep', (e) => {
        if (this.dead) return;
        this.emitNoise(e.x, e.y, e.loudness >= 2 ? 'corrida' : e.loudness < 1 ? 'furtivo' : 'passo', undefined, 'passos', true);
      }),
      s.bus.on('input:reload', () => this.reload()),
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
      s.session.crafting = null;
      s.session.build = null;
      s.session.threat = null;
      s.session.driving = null;
      s.session.options = null;
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.afterPhysics, this);
      s.session.stats = null;
      s.session.clock = null;
    });

    this.scene.launch(SCENES.hud);
    if (DEBUG.enabled) {
      this.debugState = createDebugState();
      this.debugLayer = new DebugWorldLayer(this, this.model, this.debugState, () => this.world.loadedChunkKeys(), this.state, s.bus, () => this.clock.minutes / MINUTES_PER_DAY);
      this.debugLayer.zombies = this.zombies;
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
    const hz = this.hazards.frame(delta / 1000, { x: this.player.x, y: this.player.y, moving, sprinting: this.player.isSprinting }, fx);
    if (hz) {
      this.outcome({ ok: false, message: hz.message, tone: 'bad' });
      if (hz.noise) s.bus.emit('world:noise', { x: this.player.x, y: this.player.y, radius: hz.noise, source: 'tombo' });
      this.loop.runner.cancel();
    }
    const burn = this.hazards.burn(delta / 1000, this.fires.inFire(this.player.x, this.player.y, this.clock.minutes));
    if (burn) {
      this.outcome({ ok: false, message: burn.message, tone: 'bad' });
      this.loop.runner.cancel();
    }
    this.fireTimer -= delta / 1000;
    if (this.fireTimer <= 0) {
      this.fireTimer = 1;
      for (const f of this.fires.tick(this.clock.minutes, this.loop.weather.rain, this.player.x, this.player.y)) {
        const fd = STRUCTURE_DEFS[f.type];
        if (Math.hypot(f.x - this.player.x, f.y - this.player.y) < 500) this.outcome({ ok: false, message: `${fd.masc ? 'O' : 'A'} ${fd.name.toLowerCase()} apagou.`, tone: 'info' });
      }
    }
    this.powerTimer -= delta / 1000;
    if (this.powerTimer <= 0) {
      const dt = 0.5 - this.powerTimer;
      this.powerTimer = 0.5;
      const pt = this.power.tick(this.clock.minutes, dt, this.player.x, this.player.y);
      if (pt.stopped.length) this.outcome({ ok: false, message: 'O gerador parou: acabou a gasolina.', tone: 'warn' });
      this.breatheFumes(pt.fumes, dt);
    }
    this.buildTimer -= delta / 1000;
    if (this.buildTimer <= 0) {
      this.buildTimer = 2;
      for (const p of this.builds.tick(this.clock.minutes, this.loop.weather.rain, this.loop.weather.temp)) {
        if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < 600) this.outcome({ ok: false, message: 'Uma planta da horta morreu.', tone: 'warn' });
      }
    }
    this.player.setMoveEffects(fx.walk, fx.run);
    this.player.stats.setBodyEffects(fx);
    const th = this.zombies.threat;
    this.player.drag = th.moveFactor();
    if (th.down || this.dead) this.player.frozen = true;
    if (this.drive) this.updateDriving(this.dt, intent);
    else this.player.update(this.dt, intent);
    this.updateZombies(delta / 1000, moving);

    this.attackCooldown = Math.max(0, this.attackCooldown - delta / 1000);
    // Alarme de carro: barulho alto de tempos em tempos enquanto toca.
    this.alarmTimer -= delta / 1000;
    const alarms = this.state.vehicles.tickAlarms(delta / 1000);
    if (alarms.length && this.alarmTimer <= 0) {
      this.alarmTimer = 1.5;
      for (const v of alarms) s.bus.emit('world:noise', { x: v.x, y: v.y, radius: 950, source: 'alarme de carro' });
    }
    this.autosaveTimer -= delta / 1000;
    if (this.autosaveTimer <= 0 && !this.loop.runner.active && !this.zombies.threat.grabbed) this.save();
    if (!this.dead && this.player.stats.health <= 0) this.die();
  }

  private afterPhysics(): void {
    this.player.setHeld(this.heldLook());
    this.player.syncVisuals();
    this.director.update(this.dt);
    // Região antes do mundo: o aviso da região sai antes do aviso da construção.
    this.trackRegion();
    this.floorCam.sync(this.atmosphere.darkness);
    this.world.update(this.cameras.main, this.player.x, this.player.y, this.dt, this.upstairs());
    this.doors.update(this.dt);
    this.nature.update(this.dt);
    this.updateHeldLight();
    this.combatFx.update(this.dt);
    this.zombieViews.update(this.cameras.main, this.upstairs());
    this.vehicleViews.update(this.dt, this.cameras.main);
    this.structureViews.update(this.dt);
    this.updateBuildPreview();
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

  /** Chama na mão (vela, tocha) e fogueiras acesas: luz em volta (tremendo). */
  private updateHeldLight(): void {
    this.lightSources.length = 0;
    const h = this.inventory.hand;
    if (h?.st?.on && h.defId === 'vela') this.lightSources.push({ x: this.player.x, y: this.player.y, radius: 190, intensity: 0.85, flicker: true });
    if (h?.st?.on && h.defId === 'tocha') this.lightSources.push({ x: this.player.x, y: this.player.y, radius: 300, intensity: 0.95, flicker: true });
    this.fires.lights(this.clock.minutes, this.lightSources);
    this.power.lights(this.player.x, this.player.y, this.lightSources);
  }

  /**
   * Gerador ligado no mesmo prédio: monóxido de carbono. Enjoa, dá dor de
   * cabeça e, com o tempo (dormindo, por exemplo), mata. Ar limpo: passa devagar.
   */
  private breatheFumes(minutes: number, dt: number): void {
    this.fumesWarn = Math.max(0, this.fumesWarn - dt);
    if (minutes <= 0) {
      this.fumes = Math.max(0, this.fumes - dt * 0.004);
      return;
    }
    this.fumes = Math.min(1, this.fumes + minutes * 0.02);
    const body = this.survivor.body;
    body.sickness = Math.min(1, body.sickness + minutes * POWER_TUNING.fumesPerMinute);
    if (this.fumes > 0.3) this.player.stats.setHealth(this.player.stats.health - minutes * 0.5 * Math.min(1, (this.fumes - 0.3) / 0.7));
    if (this.fumesWarn <= 0) {
      this.fumesWarn = 60;
      this.outcome({ ok: false, message: this.fumes > 0.5 ? 'Fumaça do gerador: a cabeça gira, falta ar. SAIA DAQUI!' : 'Cheiro forte de fumaça do gerador: dor de cabeça. Não fique aqui dentro.', tone: 'bad' });
    }
  }

  /** Luz em volta do jogador (0 breu .. 1 dia): para ler. */
  private lightLevel(): number {
    const lit = !!this.flashlight() || this.lightSources.some((l) => Math.hypot(l.x - this.player.x, l.y - this.player.y) < l.radius);
    return Math.max(1 - this.atmosphere.darkness, lit ? 0.85 : 0);
  }

  // ---------------------------------------------------------------- modo construir

  /** Prévia verde/vermelha na frente do jogador e o texto da barra. */
  private updateBuildPreview(): void {
    const s = this.s;
    if (!this.buildRecipe) {
      this.structureViews.hideGhost();
      s.session.build = null;
      return;
    }
    const p = this.crafting.preview(this.buildRecipe);
    if (!p) {
      this.buildRecipe = null;
      return;
    }
    const d = STRUCTURE_DEFS[p.type];
    // Peça que é um item (gerador): montou o único que tinha → sai do modo construir.
    if (d.pickup && !this.loop.runner.active && !p.ok && p.reason?.startsWith('Falta')) {
      this.buildRecipe = null;
      this.structureViews.hideGhost();
      s.session.build = null;
      return;
    }
    if (this.loop.runner.active) this.structureViews.hideGhost();
    else this.structureViews.showGhost(p.type, p.at.x, p.at.y, p.at.rot, p.ok);
    s.session.build = { name: p.recipe.name, ok: p.ok, reason: p.reason, rotates: d.place === 'tile' && !!d.tiles && d.tiles[0] !== d.tiles[1] };
  }

  private confirmBuild(): void {
    if (!this.buildRecipe || this.loop.runner.active) return;
    const why = this.crafting.start(this.buildRecipe);
    if (why) this.outcome({ ok: false, message: why, tone: 'warn' });
  }

  // ---------------------------------------------------------------- combate

  /** Botão Atacar / F / espaço: golpe ou tiro para onde o jogador olha. */
  attack(): void {
    if (this.drive) {
      this.drive.horn();
      return;
    }
    if (this.s.session.paused || this.attackCooldown > 0 || this.loop.sleeping || this.dead || this.zombies.threat.down) return;
    if (this.inventory.arms > 0) {
      this.outcome({ ok: false, message: `Braços ocupados com ${this.inventory.handDef?.name.toLowerCase() ?? 'peso'}: largue para lutar (ou empurre).`, tone: 'warn' });
      this.attackCooldown = 0.6;
      return;
    }
    if (this.loop.runner.active) this.loop.cancelAction();
    const gun = !!this.inventory.handDef?.gun;
    const facing = this.attackAngle();
    const r: AttackResult = gun ? this.combat.shoot(this.player.x, this.player.y, facing) : this.combat.melee(this.player.x, this.player.y, facing);
    this.attackCooldown = r.cooldown;
    if (r.swing) {
      this.combatFx.swing(r.swing.x, r.swing.y, r.swing.angle, r.swing.reach);
      this.player.strike();
    }
    if (r.tracer) this.combatFx.shot(r.tracer.x1, r.tracer.y1, r.tracer.x2, r.tracer.y2, r.tracer.wall);
    if (r.hit) this.combatFx.impact(r.hit.x, r.hit.y, r.hit.hp, r.hit.max);
    if (r.creature) {
      const c = r.creature;
      // Acerto se sente: tranco curto na tela, sangue no ar e no chão; na morte, mais de tudo.
      this.combatFx.blood(c.x, c.y, c.dir, c.killed ? 26 : 9);
      this.combatFx.splat(c.x, c.y, c.dir, c.killed ? 1.1 : 0.55);
      this.cameras.main.shake(c.killed ? 140 : 70, c.killed ? 0.005 : 0.0025);
      // Quanto falta para cair (a parte vital mais estragada) + onde pegou.
      this.combatFx.status(c.x, c.y, c.killed ? 0 : (c.life ?? c.frac));
      const head = c.part === 'cabeca' || c.part === 'pescoco';
      if (c.killed) this.combatFx.note(c.x, c.y, (c.note ?? 'morto').toUpperCase(), 'kill');
      else if (c.crit && c.note) this.combatFx.note(c.x, c.y, `${c.note.toUpperCase()}!`, 'crit');
      else if (head) this.combatFx.note(c.x, c.y, 'CABEÇA!', 'head');
      else this.combatFx.note(c.x, c.y, PART_NAME[c.part as BodyPart] ?? c.part, 'part');
    }
    if (r.noise) this.s.bus.emit('world:noise', r.noise);
    for (const d of r.drops ?? []) this.lootActions.dropLoose(d.defId, d.count, d.st, d.x, d.y);
    if (r.message) this.outcome({ ok: r.ok, message: r.message, ...(r.tone ? { tone: r.tone } : {}) });
    this.scanInteraction();
  }

  /**
   * Para onde vai o golpe/tiro. Sem mira no analógico, o tronco olha para onde anda: recuando, o golpe
   * iria para trás. Então o golpe vira para o zumbi mais perto AO ALCANCE (qualquer lado); o tiro só
   * corrige dentro de um cone à frente (não atira nas costas).
   */
  private attackAngle(): number {
    const { x, y, facingAngle: f } = this.player;
    if (this.player.isAiming) return f;
    const g = this.inventory.handDef?.gun;
    const z = g ? this.zombies.meleeTarget(x, y, f, Math.min(g.range * 64, 520), 0.5) : this.zombies.meleeTarget(x, y, f, this.combat.meleeReach(), Math.PI);
    if (!z) return f;
    const a = Math.atan2(z.y - y, z.x - x);
    this.player.face(a);
    return a;
  }

  /** Arma na mão para o desenho do jogador (comprimento pelo tipo/alcance). */
  private heldLook(): HeldLook | null {
    const d = this.inventory.arms > 0 ? null : this.inventory.handDef;
    if (d?.gun) return { gun: true, len: d.sub === 'rifle' || d.sub === 'espingarda' ? 30 : d.sub === 'automatica' ? 22 : 14 };
    if (d?.melee) return { gun: false, len: 12 + d.melee.reach * 26, blade: d.melee.kind !== 'impacto' };
    return null;
  }

  reload(): void {
    if (this.s.session.paused) return;
    const r = this.combat.reload(this.survivor.skills.speed('armas') * this.loop.effects.actionTime);
    if (typeof r === 'string') this.outcome({ ok: false, message: r, tone: 'warn' });
    else this.loop.start(r);
  }

  /** Lanterna ligada na mão ou na cabeça: facho para onde o jogador olha. */
  private flashlight(): { angle: number; range: number } | null {
    // Dirigindo à noite: faróis (se a bateria aguenta).
    if (this.drive) {
      const on = this.atmosphere.darkness > 0.35 && (this.drive.st.battery ?? 0) > 0.05;
      this.vehicleViews.headlights = on;
      return on ? { angle: this.drive.car.a, range: 620 } : null;
    }
    const h = this.inventory.hand;
    const hd = this.inventory.handDef;
    // Chama (vela, tocha) ilumina em volta, não em facho.
    const beam = (d: ReturnType<typeof itemDef>) => !!d?.tags.includes('luz') && !d.tags.includes('chama');
    const lit = (h?.st?.on && beam(hd)) || [...this.inventory.worn.values()].some((w) => w.st?.on && beam(itemDef(w.defId)));
    if (!lit) return null;
    const phone = hd?.id === 'celular' && h?.st?.on;
    return { angle: this.player.facingAngle, range: phone ? 230 : 420 };
  }

  // ---------------------------------------------------------------- zumbis

  /** Um quadro dos zumbis (com tempo acelerado em passos) e o que isso faz no jogador. */
  private updateZombies(dtReal: number, moving: boolean): void {
    const s = this.s;
    const th = this.zombies.threat;
    const body = this.player.body;
    const car = this.drive?.car;
    const sense: PlayerSense = {
      x: this.player.x,
      y: this.player.y,
      floor: this.floor?.level ?? 0,
      vx: car ? Math.cos(car.a) * car.speed : body.velocity.x,
      vy: car ? Math.sin(car.a) * car.speed : body.velocity.y,
      radius: PLAYER_TUNING.bodyRadius,
      posture: this.player.sneaking ? 'furtivo' : this.player.isSprinting ? 'correndo' : moving ? 'andando' : 'parado',
      inVehicle: !!this.drive,
      alive: !this.dead,
      down: th.down,
    };
    const indoor = !!this.world.roofs.buildingAt(this.player.x, this.player.y);
    const beam = this.flashlight();
    const light: LightEnv = {
      ambient: (1 - this.atmosphere.darkness) * (indoor ? 0.6 : 1),
      beam: beam ? { angle: beam.angle, range: beam.range } : null,
      glow: this.lightSources.some((l) => Math.hypot(l.x - this.player.x, l.y - this.player.y) < l.radius) ? 0.9 : 0,
      rain: this.loop.weather.rain,
      fog: this.loop.weather.fog,
    };
    // Tempo acelerado (ação demorada, dormir): o mundo anda junto, em passos.
    const accel = this.loop.runner.active ? this.clock.timeScale / Math.max(0.01, this.clock.userScale) : 1;
    let left = Math.min(dtReal * accel, 2);
    let push = { x: 0, y: 0 };
    while (left > 1e-4) {
      const step = Math.min(left, 0.1);
      left -= step;
      const p = this.zombies.update({ dt: step, player: sense, light });
      push = { x: push.x + p.x, y: push.y + p.y };
    }
    if (push.x || push.y) {
      this.player.sprite.x += push.x;
      this.player.sprite.y += push.y;
    }
    // Agarrado: puxar (andar) ajuda a soltar; parado quase não.
    if (th.grabbed > 0) {
      if (moving) this.player.stats.spend(7 * dtReal);
      if (this.zombies.struggle(dtReal, this.defense(null), moving ? 'puxando' : 'parado')) this.outcome({ ok: true, message: 'Soltou-se!', tone: 'ok' });
    }
    s.session.threat = { sneaking: this.player.sneaking, grabbed: th.grabbed, down: th.down, escape: th.escape };
    // Perigo perto: acorda / interrompe o que estiver fazendo.
    this.dangerTimer -= dtReal;
    if (this.dangerTimer <= 0 && this.loop.runner.active) {
      this.dangerTimer = 0.4;
      const sleeping = this.loop.sleeping;
      const n = this.zombies.dangerNear(this.player.x, this.player.y, sleeping ? 700 : 420);
      if (n > 0) {
        this.loop.cancelAction();
        this.outcome({ ok: false, message: sleeping ? 'Acordou com barulho: tem zumbi por perto!' : 'Zumbi chegando!', tone: 'bad' });
      }
    }
  }

  // ---------------------------------------------------------------- dirigir

  /** Entrar no banco do motorista (o motor já pegou). */
  private startDriving(id: string): { ok: boolean; message?: string } {
    if (this.drive || this.dead) return { ok: false };
    if (this.zombies.threat.grabbed) return { ok: false, message: 'Solte-se antes!' };
    if (this.loop.runner.active) this.loop.cancelAction();
    const s = this.s;
    this.drive = new DriveSession(id, this.state, this.zombies.solids, this.zombies, {
      noise: (x, y, kind, radius, source) => s.bus.emit('world:noise', { x, y, radius, source, kind, byPlayer: true }),
      message: (text, tone) => this.outcome({ ok: tone === 'ok' || tone === 'info', message: text, tone }),
      ranOver: (_z, killed, x, y, dir) => {
        this.combatFx.blood(x, y, dir, killed ? 14 : 8);
        this.cameras.main.shake(90, 0.003);
      },
      crash: (impact) => {
        this.cameras.main.shake(180, 0.006);
        // Batida forte machuca quem dirige (sem cinto, cidade em colapso).
        if (impact > 320) {
          this.survivor.health.add(Math.random() < 0.5 ? 'cabeca' : 'tronco', 'contusao', Math.min(1, (impact - 300) / 300));
          this.player.stats.setHealth(this.player.stats.health - (impact - 300) * 0.03);
          this.outcome({ ok: false, message: 'Bateu forte!', tone: 'bad' });
        }
      },
    });
    this.vehicleViews.driving = id;
    this.vehicleViews.refreshColliders(id);
    this.player.setHidden(true);
    this.player.sneaking = false;
    this.player.placeAt(this.drive.car.x, this.drive.car.y, this.drive.car.a);
    const spec = VEHICLE_SPECS[this.state.vehicles.vehicle(id)!.type as VehicleType];
    return { ok: true, message: `Ao volante do ${spec.name}. Aponte para onde quer ir; para trás é ré.` };
  }

  private updateDriving(dt: number, intent: ReturnType<typeof resolveIntent>): void {
    const d = this.drive!;
    const mag = Math.min(1, Math.hypot(intent.moveX, intent.moveY));
    const held = this.zombies.threat.grabbed > 0 || this.zombies.threat.down || this.dead || this.s.session.paused;
    d.update(dt, { x: intent.moveX, y: intent.moveY, mag }, held);
    this.player.placeAt(d.car.x, d.car.y, d.car.a);
    const st = d.st;
    this.s.session.driving = { kmh: d.kmh, fuel: st.fuel, tank: d.spec.tankLiters, body: st.body };
  }

  /** Sair do carro (parado ou quase). */
  private stopDriving(force = false): void {
    const d = this.drive;
    if (!d) return;
    if (!force && Math.abs(d.car.speed) > 45) {
      this.outcome({ ok: false, message: 'Pare o carro antes de sair.', tone: 'warn' });
      return;
    }
    const q = d.exitPoint();
    if (!q && !force) {
      this.outcome({ ok: false, message: 'Não dá para abrir a porta: tem coisa (ou zumbi) encostada.', tone: 'warn' });
      return;
    }
    d.car.speed = 0;
    d.sync(true);
    const out = q ?? { x: d.car.x, y: d.car.y + 90 };
    this.drive = null;
    this.vehicleViews.driving = null;
    this.vehicleViews.headlights = false;
    this.vehicleViews.refreshColliders(d.id);
    this.player.setHidden(false);
    this.teleport(out.x, out.y);
    this.s.session.driving = null;
    this.s.bus.emit('world:noise', { x: out.x, y: out.y, radius: 160, source: 'porta de carro', kind: 'porta', byPlayer: true });
  }

  /** Zumbi socando o carro: amassa, estoura o vidro do lado dele, agarra pela janela quebrada. */
  private vehicleBang(z: Zombie): void {
    const d = this.drive;
    if (!d) return;
    const st = d.st;
    const str = z.traits.strength * this.zombies.diff.destruction;
    st.body = Math.max(0, st.body - 0.004 * str);
    const door = d.sideDoorOf(z.x, z.y);
    this.s.bus.emit('world:noise', { x: z.x, y: z.y, radius: 360, source: 'batida no carro', kind: 'batida' });
    if (!st.broken.includes(door)) {
      if (Math.random() < 0.16 * str) {
        this.state.vehicles.breakWindow(d.id, door);
        this.s.bus.emit('world:noise', { x: z.x, y: z.y, radius: 700, source: 'vidro do carro', kind: 'vidro' });
        this.outcome({ ok: false, message: door === 'motorista' ? 'Estouraram o vidro do seu lado!' : 'Estouraram um vidro do carro!', tone: 'bad' });
      } else this.state.vehicles.touch(d.id);
      return;
    }
    // Vidro quebrado: a mão entra. Do lado do motorista, pega você.
    const chance = door === 'motorista' ? 0.55 : 0.18;
    if (Math.random() < chance) this.zombieAttack(z, door === 'motorista' && Math.random() < 0.6 ? 'grab' : 'swipe');
  }

  /** Corpo de zumbi = recipiente com o que a pessoa carregava (gerado ao revistar). */
  private registerCorpse(z: Zombie): void {
    const id = `corpo:${z.id}`;
    if (this.state.loot.ref(id)) return;
    this.state.loot.addRef({
      id,
      kind: 'corpo',
      name: `Corpo (${ARCHETYPES[z.arch].label.toLowerCase()})`,
      verb: 'REVISTAR',
      table: null,
      capacity: 25,
      x: z.x,
      y: z.y,
      rect: null,
      gen: () => corpseLoot(z, this.s.settings.loot),
    });
  }

  /** Dormir só sem zumbis atrás de você. */
  private trySleep(opts: SleepOptions): string | null {
    if (this.zombies.dangerNear(this.player.x, this.player.y, 900) > 0) return 'Não dá para dormir: tem zumbi atrás de você.';
    return this.loop.sleep(opts);
  }

  /** O que o ataque de um zumbi precisa saber do jogador agora. */
  private defense(z: Zombie | null): PlayerDefense {
    const st = this.player.stats;
    const v = this.player.body.velocity;
    let fleeing = false;
    if (z) {
      const dx = this.player.x - z.x;
      const dy = this.player.y - z.y;
      const d = Math.hypot(dx, dy) || 1;
      fleeing = (v.x * dx + v.y * dy) / d > 90;
    }
    return {
      health: this.survivor.health,
      protection: (slots) => this.inventory.protection(slots),
      stamina: st.stamina / st.maxStamina,
      fx: this.loop.effects,
      load: this.inventory.capacity > 0 ? this.inventory.effectiveLoad / this.inventory.capacity : 0,
      fleeing,
      down: this.zombies.threat.down,
      grabbed: this.zombies.threat.grabbed,
      crowd: this.zombies.crowdAround(this.player.x, this.player.y),
    };
  }

  /** Um zumbi alcançou o jogador: resolve, aplica e mostra. */
  private zombieAttack(z: Zombie, kind: AttackKind): AttackOutcome | null {
    if (this.dead) return null;
    const out = resolveAttack(z, kind, this.defense(z), this.zombies.diff);
    const st = this.player.stats;
    if (out.trauma) st.setHealth(st.health - out.trauma);
    if (out.stamina) st.spend(out.stamina * st.maxStamina);
    if (out.infected) this.survivor.health.infectZombie(Math.random, out.text.replace(/[!.]+$/, '').replace(/^MORDIDA NO PESCOÇO$/, 'Mordida no pescoço'));
    const a = Math.atan2(this.player.y - z.y, this.player.x - z.x);
    if (out.push) {
      const b = this.player.body;
      b.velocity.x += Math.cos(a) * out.push * 9;
      b.velocity.y += Math.sin(a) * out.push * 9;
    }
    if (out.landed && !out.blocked && out.wound) this.combatFx.blood(this.player.x, this.player.y, a, out.wound === 'mordida' ? 10 : 5);
    if (out.landed) {
      if (this.loop.runner.active) this.loop.cancelAction();
      if (out.knockdown || out.wound === 'mordida') this.cameras.main.shake(140, 0.005);
    }
    if (out.landed || kind === 'grab' || kind === 'lunge') this.outcome({ ok: false, message: out.text, tone: out.tone === 'bad' ? 'bad' : out.tone === 'warn' ? 'warn' : 'info' });
    return out;
  }

  /** Empurrão (botão/tecla G): afasta quem está na frente e ajuda a se soltar. */
  shove(): void {
    if (this.s.session.paused || this.attackCooldown > 0 || this.loop.sleeping || this.dead || this.zombies.threat.down || this.drive) return;
    if (this.loop.runner.active) this.loop.cancelAction();
    const st = this.player.stats;
    if (st.stamina < 4) {
      this.outcome({ ok: false, message: 'Sem fôlego para empurrar.', tone: 'warn' });
      return;
    }
    st.spend(6);
    const strength = this.loop.effects.melee * (0.55 + 0.45 * (st.stamina / st.maxStamina));
    const r = this.zombies.shove(this.player.x, this.player.y, this.player.facingAngle, strength, this.defense(null));
    this.combatFx.swing(this.player.x, this.player.y, this.player.facingAngle, 40);
    this.attackCooldown = 0.75;
    if (r.freed) this.outcome({ ok: true, message: 'Soltou-se!', tone: 'ok' });
  }

  private toggleSneak(): void {
    if (this.dead) return;
    this.player.sneaking = !this.player.sneaking;
    this.outcome({ ok: true, message: this.player.sneaking ? 'Andando agachado: mais devagar, quase sem barulho.' : 'De pé.', tone: 'info' });
  }

  /** Todo barulho do mundo chega aos ouvidos dos zumbis. */
  private onNoise(e: { x: number; y: number; radius: number; source: string; kind?: import('../sim/Noise').NoiseKind; byPlayer?: boolean }): void {
    const kind = e.kind ?? kindFromSource(e.source);
    const near = Math.hypot(e.x - this.player.x, e.y - this.player.y) < 120;
    const byPlayer = e.byPlayer ?? (near && kind !== 'zumbi' && kind !== 'batida');
    this.emitNoise(e.x, e.y, kind, e.radius, e.source, byPlayer);
    if (byPlayer && e.radius >= 700) {
      this.loudNoises.push({ t: this.zombies.now, source: e.source });
      if (this.loudNoises.length > 8) this.loudNoises.shift();
    }
  }

  /**
   * Solta um som no mundo: no andar onde aconteceu e, pela escada, nos
   * outros andares do prédio (abafado). O jogador também ouve (o HUD mostra
   * a direção) — do outro andar, vem da escada.
   */
  private emitNoise(x: number, y: number, kind: import('../sim/Noise').NoiseKind, radius: number | undefined, source: string, byPlayer: boolean): void {
    const floors = this.model.floors;
    const level = floors.levelAt(x, y);
    const events = [this.noise.emit(x, y, kind, { ...(radius !== undefined ? { radius } : {}), source, byPlayer, floor: level })];
    const r0 = events[0]!.radius;
    for (const b of bridgeNoise(floors, x, y, r0)) events.push(this.noise.emit(b.x, b.y, kind, { radius: b.radius, source, byPlayer, floor: b.floor, via: b.via }));
    if (byPlayer || this.dead) return;
    const pl = this.floor?.level ?? 0;
    const ps = floors.spaceAt(this.player.x, this.player.y);
    for (const ev of events) {
      if (floors.spaceAt(ev.x, ev.y) !== ps) continue;
      const h = this.noise.heard(ev, this.player.x, this.player.y, 1.15, pl);
      if (h && h.strength > 0.08) {
        const label = HEARD_LABEL[kind] ?? source;
        const danger = kind === 'zumbi' || kind === 'batida' || kind === 'demolicao' || kind === 'vidro';
        this.s.bus.emit('player:heard', { angle: Math.atan2(h.y - this.player.y, h.x - this.player.x), strength: h.strength, label: ev.via ? `${label} (${ev.via.level > pl ? 'em cima' : 'embaixo'})` : label, danger });
        break;
      }
    }
  }

  /** Vida acabou: relatório da causa e tela de morte (o save de antes fica). */
  private die(): void {
    this.dead = true;
    this.player.frozen = true;
    this.loop.cancelAction();
    const th = this.zombies.threat;
    const st = this.player.stats;
    const report = explainDeath({
      health: this.survivor.health,
      body: this.survivor.body,
      log: th.log,
      now: this.zombies.now,
      lastHarm: th.lastHarm,
      grabbed: th.grabbed,
      down: th.down,
      crowd: this.zombies.crowdAround(this.player.x, this.player.y),
      load: this.inventory.capacity > 0 ? this.inventory.effectiveLoad / this.inventory.capacity : 0,
      stamina: st.stamina / st.maxStamina,
      darkness: this.atmosphere.darkness,
      loudNoises: this.loudNoises.filter((n) => this.zombies.now - n.t < 180).map((n) => n.source),
      day: this.clock.day,
      kills: this.zombies.kills,
      fumes: this.fumes,
    });
    this.s.session.death = report;
    this.player.sprite.setTint(0x8a5050);
    this.cameras.main.shake(300, 0.008);
    this.cameras.main.fade(2400, 30, 4, 4, true);
    this.s.bus.emit('player:died', { report });
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
    // Ao volante: o botão de interagir é SAIR.
    if (this.drive) {
      const t = { key: 'dirigindo', kind: 'vehicle', x: this.player.x, y: this.player.y, radius: 0, verb: 'SAIR', label: 'Sair do carro', enabled: Math.abs(this.drive.car.speed) <= 45 };
      this.s.session.interaction = t;
      this.highlight.set(null);
      return;
    }
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
    if (this.s.session.paused || this.dead || this.zombies.threat.down) return;
    if (this.drive) {
      this.stopDriving();
      return;
    }
    const r = this.interaction.perform(this.syncInteractor());
    this.s.session.interaction = this.interaction.current;
    this.highlight.set(this.interaction.current);
    if (r?.message) this.s.bus.emit('player:feedback', { text: r.message, tone: r.ok ? 'ok' : 'warn' });
  }

  /** Botão "⋯" / tecla Q: monta a lista de ações por perto. */
  private requestOptions(): void {
    if (this.s.session.paused || this.dead || this.drive) return;
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

  /** Tratamento escolhido na aba CORPO: ação com tempo; gasta o item no fim. */
  private treat(woundId: number, optionId: string): void {
    const h = this.survivor.health;
    const w = h.byId(woundId);
    if (!w) return;
    const opt = treatmentsFor(w, h, this.inventory, this.clock.minutes / MINUTES_PER_DAY).find((o) => o.id === optionId);
    if (!opt) return;
    if (!opt.enabled) {
      this.outcome({ ok: false, message: opt.reason ?? 'Não dá.', tone: 'warn' });
      return;
    }
    this.loop.start({
      id: 'tratar',
      label: `Tratando: ${woundTitle(w).toLowerCase()}`,
      minutes: opt.minutes * this.loop.effects.actionTime,
      done: () => ({ ok: true, message: opt.run(), tone: 'ok' }),
    });
  }

  /** Debug: ferimento aleatório. */
  debugHurt(): string {
    const kinds: WoundKind[] = ['arranhao', 'corte', 'laceracao', 'perfuracao', 'fratura', 'entorse', 'queimadura', 'contusao', 'estilhaco'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
    const part = BODY_PARTS[Math.floor(Math.random() * BODY_PARTS.length)]!;
    const w = this.survivor.health.add(part, kind, 0.4 + Math.random() * 0.5);
    return woundTitle(w);
  }

  debugHealAll(): string {
    this.survivor.health.wounds = [];
    this.player.stats.setHealth(this.player.stats.maxHealth);
    const b = this.survivor.body;
    b.hunger = 5;
    b.thirst = 5;
    b.fatigue = 5;
    b.sickness = 0;
    b.temp = 37;
    b.wet = 0;
    return 'curado';
  }

  // ---------------------------------------------------------------- save

  private gatherSave(): Omit<GameSave, 'version' | 'savedAt' | 'game'> {
    const player = this.player.snapshot();
    // Salvando ao volante: o carro fica onde está; o jogador volta ao lado dele.
    if (this.drive) {
      this.drive.sync(true);
      const q = this.drive.exitPoint() ?? { x: this.drive.car.x, y: this.drive.car.y + 90 };
      player.x = q.x;
      player.y = q.y;
    }
    return {
      settings: this.s.settings,
      clock: this.clock.snapshot(),
      player,
      body: this.survivor.body.snapshot(),
      inventory: this.inventory.serialize(),
      world: this.state.serialize(),
      modules: {
        health: this.survivor.health.serialize(),
        skills: this.survivor.skills.serialize(),
        radioDay: this.loop.radioDay,
        zombies: this.zombies.serialize(this.s.settings.loot.collapseAgeDays),
      },
    };
  }

  /** Salva agora (automático, pausa, menu). */
  save(): boolean {
    this.autosaveTimer = AUTOSAVE_SECONDS;
    // Morto não salva: o último save (de antes) continua lá para carregar.
    if (this.dead) return false;
    const ok = saveGame(this.gatherSave());
    this.s.bus.emit('game:saved', { ok });
    return ok;
  }

  // ---------------------------------------------------------------- consultas (debug, testes)

  get worldModel(): WorldModel {
    return this.model;
  }

  /** Onde o jogador está na cidade (num andar de cima: o ponto lá embaixo). */
  playerPosition(): { x: number; y: number } {
    return this.model.floors.toReal(this.player.x, this.player.y);
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

  /** Debug: um zumbi num ponto (não existe no jogo normal — a população é fixa). */
  debugSpawnZombie(x: number, y: number, arch?: ArchId): string {
    const archs = Object.keys(ARCHETYPES) as ArchId[];
    const a = arch ?? archs[Math.floor(Math.random() * archs.length)]!;
    const id = `dbg${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
    const z = createZombie({ id, seed: Math.floor(Math.random() * 1e9), arch: a, x, y, collapseDays: this.s.settings.loot.collapseAgeDays }, this.zombies.diff);
    this.zombies.add(z);
    return `${ARCHETYPES[a].label} (${id})`;
  }

  /** Debug: bando atrás do jogador, longe, fora da vista (teste de horda). */
  debugHorde(n = 12): string {
    const a = this.player.facingAngle + Math.PI;
    for (let i = 0; i < n; i++) {
      const r = 650 + Math.random() * 250;
      const b = a + (Math.random() - 0.5) * 0.9;
      const x = this.player.x + Math.cos(b) * r;
      const y = this.player.y + Math.sin(b) * r;
      if (this.model.nav.isWalkableAt(x, y)) this.debugSpawnZombie(x, y);
    }
    return `${n} zumbis`;
  }

  zombiesFrozen(): boolean {
    return this.zombies.frozen;
  }

  toggleZombiesFrozen(): void {
    this.zombies.frozen = !this.zombies.frozen;
  }

  /** Linha de zumbis para o painel de debug. */
  zombieInfo(): string {
    const st = this.zombies.stats();
    const states = Object.entries(st.states)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .map(([k, n]) => `${k.toLowerCase()} ${n}`)
      .join(' · ');
    const th = this.zombies.threat;
    const fl = this.model.floors;
    const upstairs = fl.any ? this.zombies.store.all.filter((z) => !z.dead && fl.spaceAt(z.x, z.y) > 0).length : 0;
    const here = this.floor ? `${this.floor.id} (dx ${this.floor.dx}, dy ${this.floor.dy})` : 'térreo';
    return `zumbis ${st.alive} vivos, ${st.dead} corpos · LOD ${st.lod.join('/')} · rotas ${st.paths}/s · fluxo ${st.flow}/s · abatidos ${this.zombies.kills}\n${states}\n${this.zombieViews.textureStats} · vistos ${this.zombieViews.count}${th.grabbed ? ` · AGARRADO ${th.grabbed}` : ''}\nandares ${fl.list.length} · escadas ${fl.stairs.length} · zumbis nos andares ${upstairs} · aqui: ${here} · geradores com energia ${this.power.poweredCount}`;
  }

  /** Debug: todo zumbi perto morre. */
  debugKillNear(r = 500): string {
    let n = 0;
    for (const z of this.zombies.store.aliveNear(this.player.x, this.player.y, r)) {
      this.zombies.hit(z, { kind: 'impacto', damage: 999, dir: 0, part: 'cabeca' });
      n++;
    }
    return `${n} abatidos`;
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
    if (!cam) return;
    this.world.ensureLoadedAround(this.player.x, this.player.y, cam.width / cam.zoom, cam.height / cam.zoom, this.upstairs());
  }

  /** Teleporta o jogador (debug, carregar jogo) com os chunks do destino já carregados. */
  teleport(x: number, y: number): void {
    this.syncFloor(x, y);
    this.player.sprite.setPosition(x, y);
    this.player.body.reset(x, y);
    this.director.snap();
    this.loadAroundPlayer();
  }

  // ---------------------------------------------------------------- andares

  /** Andar de cima atual como o desenho precisa (retângulo e deslocamento até a rua). */
  private upstairs(): Upstairs | null {
    const f = this.floor;
    return f ? { floor: f.bounds, dx: f.dx, dy: f.dy } : null;
  }

  /** O ponto está noutro andar? Troca limites da física e da câmera, a vista de baixo e o chão. */
  private syncFloor(x: number, y: number): void {
    const f = this.model.floors.floorAt(x, y);
    if ((f?.id ?? null) === (this.floor?.id ?? null)) return;
    this.floor = f;
    const W = this.world.widthPx;
    const H = this.model.floors.cityHeightPx;
    if (f) {
      this.physics.world.setBounds(f.bounds.x - 32, f.bounds.y - 32, f.bounds.w + 64, f.bounds.h + 64);
      // A câmera anda como se estivesse na cidade (a vista de baixo fica alinhada).
      this.cameras.main.setBounds(f.dx, f.dy, W, H);
    } else {
      this.physics.world.setBounds(0, 0, W, H);
      this.cameras.main.setBounds(0, 0, W, H);
    }
    this.floorCam.set(f);
    this.world.showFloorGround(f);
    this.s.session.floor = f ? { level: f.level, name: levelName(f.level) } : null;
  }

  /** Subir/descer a escada: chega no mesmo vão do outro andar, do lado de onde se sai. */
  private useStairs(st: StairPlacement, level: number): InteractionResult {
    if (this.zombies.threat.grabbed || this.zombies.threat.down) return { ok: false, message: 'Solte-se antes!' };
    if (this.drive) return { ok: false };
    const floors = this.model.floors;
    const to = floors.stair(st.building, level);
    if (!to) return { ok: false, message: 'A escada não leva a lugar nenhum.' };
    // Posição relativa ao vão, preservada; um passo para fora dele.
    const cx = to.x + to.w / 2;
    const cy = to.y + to.h / 2;
    const long = to.h >= to.w;
    const rx = long ? this.player.x - (st.x + st.w / 2) : 0;
    const ry = long ? 0 : this.player.y - (st.y + st.h / 2);
    const out = long ? { x: cx + Math.sign(rx || 1) * (to.w / 2 + 26), y: cy } : { x: cx, y: cy + Math.sign(ry || 1) * (to.h / 2 + 26) };
    const spot = this.zombies.solids.free(out.x, out.y, 15) ? out : { x: cx, y: cy };
    this.loop.cancelAction();
    this.cameras.main.fadeOut(140, 8, 8, 10);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.teleport(spot.x, spot.y);
      this.cameras.main.fadeIn(220, 8, 8, 10);
    });
    // Degraus rangem (os dois andares ouvem).
    this.s.bus.emit('world:noise', { x: st.x + st.w / 2, y: st.y + st.h / 2, radius: 170, source: 'escada', kind: 'passo', byPlayer: true });
    return { ok: true, message: level > st.level ? `Subiu: ${levelName(level)}.` : `Desceu: ${levelName(level)}.` };
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
      combat: this.combat,
      attack: () => this.attack(),
      save: () => this.save(),
      interaction: () => this.interaction.current,
      interact: () => this.interact(),
      views: () => ({ doors: this.doors.count, doorColliders: this.doors.colliderCount(), items: this.items.count }),
      crafting: this.crafting,
      fires: this.fires,
      builds: this.builds,
      build: (recipe: string | null) => (this.buildRecipe = recipe),
      confirmBuild: () => this.confirmBuild(),
      options: () => (this.requestOptions(), this.options.map((o) => o.label)),
      choose: (i: number) => this.chooseOption(i),
      zombies: this.zombies,
      zombieViews: () => ({ views: this.zombieViews.count, corpses: this.zombieViews.corpseCount }),
      spawnZombie: (x?: number, y?: number, arch?: ArchId) => this.debugSpawnZombie(x ?? this.player.x + 300, y ?? this.player.y, arch),
      shove: () => this.shove(),
      sneak: () => this.toggleSneak(),
      dead: () => this.dead,
      drive: (id: string) => this.startDriving(id),
      exitCar: (force?: boolean) => this.stopDriving(force),
      /** Carrega o último save como o botão da tela de morte. */
      power: this.power,
      floor: () => this.floor,
      stairs: (level: number) => {
        const t = this.interaction.current;
        void level;
        return t?.key.startsWith('escada:') ? t.label : null;
      },
      loadLast: () => {
        const save = loadGame();
        if (!save) return false;
        this.s.settings = save.settings;
        this.s.session.pendingLoad = save;
        const hud = this.scene.get(SCENES.hud);
        hud.scene.stop(SCENES.debug);
        hud.scene.stop(SCENES.game);
        hud.scene.start(SCENES.game);
        return true;
      },
      driving: () => (this.drive ? { id: this.drive.id, ...this.drive.car, kmh: this.drive.kmh, st: this.drive.st } : null),
    };
  }
}

function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}
