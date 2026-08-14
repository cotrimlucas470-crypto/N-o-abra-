/**
 * Tipos do subsistema ANOMALY.
 *
 * Os blocos de §1, §5, §6, §11, §13 e §14 do documento estão aqui sem
 * alteração. O que veio só como tabela em prosa (estados, contato, ecologia)
 * virou tipo aqui, e está marcado no cabeçalho do módulo que o usa.
 *
 * §0 regra 2 — a anomalia é um conjunto de regras de percepção. Não existe
 * campo de vida, de dano ou de ataque em lugar nenhum deste arquivo, e isso
 * é proposital: não há onde escrever "derrotar".
 */

// ---------- §1: o modelo central ----------

export type Stimulus =
  | 'SOM' | 'MOVIMENTO' | 'CHEIRO' | 'LUZ'
  | 'CALOR' | 'METAL' | 'VOZ' | 'SANGUE' | 'MEMORIA';

export interface SenseProfile {
  stimulus: Stimulus;
  weight: number;      // 0..1 — quanto contribui para detecção
  threshold: number;   // 0..100 — abaixo disso, ignora
  range: number;       // em metros narrativos (1..40)
  decay: number;       // quanto o rastro persiste por tick
}

export interface AnomalyDef {
  id: string;
  name: string;            // nome interno, NUNCA exibido ao jogador
  publicHint: string;      // como o jogador aprende a chamá-la
  senses: SenseProfile[];
  blindTo: Stimulus[];     // ignora totalmente — a fraqueza
  speed: 1 | 2 | 3 | 4 | 5;
  persistence: number;     // quantos ticks caça após perder o rastro
  delayResistance: number; // 0..1 — quanto reduz o atraso de arma branca
  contactTableId: string;
  telegraphs: TelegraphSet;
  territory: TerritoryRule;
  mutationPool: string[];
  sanityOnSight: number;
  sanityOnBlock: number;
  canBeFaked: boolean;     // pode aparecer como ilusão?

  // --- comportamentos que a tabela de §2 descreve em português e que
  // --- precisam de campo para existirem em código ---
  /** A06_PARADA: ocupa, não persegue. Não migra, não se aproxima. */
  estatica?: boolean;
  /** A08_MARE: só existe com este clima. */
  exigeClima?: string;
  /** A12_PORTA: só aparece no abrigo. */
  soNoAbrigo?: boolean;
  /** A10_GEMEA: instancia mais de uma; uma delas é falsa. */
  spawnCount?: number;
  /** A10_GEMEA: uma das cópias não existe. */
  umaEhFalsa?: boolean;

  /** texto da tela de encontro (§6, composeSceneText) */
  encounterText: string[];
  fonte: 'spec' | 'projetado';
}

export interface TerritoryRule {
  prefers: string[];
  avoids: string[];
  migrationChance: number;
}

/**
 * O rastro que o jogador deixa. §13 fala em `trace.metal` e `trace.som`, então
 * as chaves são minúsculas e `mapKey` traduz do estímulo para elas.
 */
export interface PlayerTrace {
  som: number;
  movimento: number;
  cheiro: number;
  luz: number;
  calor: number;
  metal: number;
  voz: number;
  sangue: number;
  memoria: number;
}

export type TraceKey = keyof PlayerTrace;

export interface EnvModifiers {
  modifiers: Partial<Record<Stimulus, number>>;
}

// ---------- §4: máquina de estados ----------

export type AnomalyState =
  | 'DORMENTE' | 'ALERTA' | 'BUSCA'
  | 'RASTRO' | 'CACA' | 'CONTATO' | 'PERDEU';

export interface AnomalyInstance {
  instanceId: string;
  defId: string;
  state: AnomalyState;
  distance: number;
  cooldown: number;
  huntTicks: number;

  // --- derivado das seções §5, §9, §10; não consta do bloco de §4 ---
  /** rastro retido pela anomalia; decai por `SenseProfile.decay` */
  residual: PlayerTrace;
  /** camadas de aviso já emitidas nesta aproximação — §0 regra 3 */
  avisos: TelegraphLayer[];
  /** ids de §10 aplicados a esta instância */
  mutacoes: string[];
  locationId: string;
  /** §9: a outra anomalia recuou e esta ganhou pressa */
  approachBonus: number;
  /** A10_GEMEA: esta cópia não existe */
  ehCopiaFalsa: boolean;
  /** §12: a anomalia inteira é ilusão de sanidade baixa */
  ehFalsa: boolean;
  /** §10: campo que MUT_LENTA_FALSA usa e nenhuma outra */
  burstSpeed?: number;
}

// ---------- §5: telegraph ----------

export type TelegraphLayer = 'ambient' | 'audio' | 'direct';

export interface TelegraphSet {
  ambient: string[];  // camada 1 — 3 a 5 ticks antes. Vago, sensorial
  audio: string[];    // camada 2 — 1 a 2 ticks antes. Direcional
  direct: string[];   // camada 3 — imediato. Ela sabe que você existe
}

// ---------- §6: encontro ----------

export interface OptionModifier {
  /** id da anomalia ou `blind:ESTIMULO` / `sense:ESTIMULO` */
  quando: string;
  successDelta: number;
  nota?: string;
}

export interface WeightedOutcome {
  r: number;
  out: string;
}

export interface EncounterOption {
  id: string;
  label: string;
  requires?: { item?: string; stat?: string; min?: number };
  baseSuccess: number;      // 0..1
  modifiers: OptionModifier[];
  outcomes: WeightedOutcome[];
  timeCost: number;         // minutos de run
  sanityCost: number;
  noiseGenerated: number;

  // --- efeito mecânico da opção, que a tabela de §6 descreve em prosa ---
  traceDelta?: Partial<PlayerTrace>;
  traceZera?: TraceKey[];
  distanceDelta?: number;
  delayTicks?: number;
  perdeMochila?: boolean;
  usaLamina?: boolean;
  /** §6/§12: opção fantasma de sanidade baixa. Nunca marcada na tela. */
  fantasma?: boolean;
  texto: string;
}

export interface EncounterScreen {
  text: string;
  options: EncounterOption[];
  /** §12: a distância que a UI mostra pode não ser a real */
  distanciaExibida: number;
  semFuga: boolean;
}

export interface EncounterContext {
  hasLockableRoom: boolean;
  sozinho: boolean;
  chuva: boolean;
}

// ---------- §7: atraso ----------

export type BladeClass = 'LEVE' | 'MEDIA' | 'PESADA' | 'IMPROVISADA' | 'UTIL';
export type DelayClass = 'LEVE' | 'MEDIA' | 'PESADA';

export type DelayOutcome =
  | 'ESCAPE_LIMPO' | 'ESCAPE_ARRASTADO' | 'PERDEU_ARMA' | 'CONTATO';

export interface DelayResult {
  ticks: number;
  outcome: DelayOutcome;
  bladeBroken: boolean;
}

// ---------- §8: contato ----------

export type ContactResultId =
  | 'ESCAPE_ARRASTADO' | 'FERIDO_GRAVE' | 'MARCADO' | 'AGONIA' | 'MORTE';

export interface ContactRow {
  range: [number, number];
  result: ContactResultId;
  loot?: number;
  blade?: 'PERDIDA' | 'DANIFICADA';
  sanity?: number;
  wound?: string;
  mark?: boolean;
  hpLock?: number;
  epilogue?: string;
  text: string;
}

export interface ContactTable {
  id: string;
  roll: ContactRow[];
}

// ---------- §9: ecologia ----------

export interface Location {
  id: string;
  type: string;
  /** condição do lugar: ALAGADO, QUEIMADA, INTACTO... */
  condition: string;
  weather: string;
  danger: number;
  neighbors: string[];
}

export interface MigrationRecord {
  day: number;
  anomalyId: string;
  from: string;
  to: string;
}

// ---------- §10: mutações ----------

export interface MutationDef {
  id: string;
  hint: string;
  patch: Record<string, string | number>;
}

// ---------- §11: memória ----------

export interface AnomalyMemory {
  anomalyId: string;
  playerEscapes: Record<string, number>; // qual tática o jogador usou
  adaptation: number;                    // 0..100
  /** §8: a marca dura 3 dias e vale +25 de detecção */
  markedUntilDay: number;
  /** §9: perdeu o jogador 3 vezes no mesmo local → migra amanhã */
  perdasPorLocal: Record<string, number>;
}

export interface Adaptation {
  senseBoosts: { stimulus: Stimulus; delta: number }[];
  persistenceDelta: number;
}

// ---------- §13: armas brancas ----------

export type Rarity = 'COMUM' | 'INCOMUM' | 'RARO' | 'EPICO' | 'LENDARIO';

export interface RepairCost {
  recipe: string;
  in: string[];
  restore: number;
  time: number;
}

export interface BladeItem {
  id: string;
  name: string;
  class: BladeClass;
  rarity: Rarity;
  durability: number;
  maxDurability: number;
  delayTicks: number;
  metalNoise: number;      // alimenta trace.metal → detecta A05
  swingNoise: number;      // alimenta trace.som ao usar
  secondaryUse: string;    // TODA arma tem função de utilidade
  repairCost: RepairCost;
  flavor: string;

  weightKg: number;
  /** enrolada em pano: -30% de metal, -1 durabilidade por uso */
  enrolada?: boolean;
  /** §13: baioneta — recuo real de 2 ticks */
  recuoExtra?: number;
  /** §13: vidro-osso — A05 não a enxerga */
  invisivelPara?: string[];
  /** quebrada não some: vira sucata e ocupa espaço */
  sucata?: boolean;
}

export interface CraftRecipe {
  id: string;
  in: string[];
  time: number;
  noise?: number;
  restore?: number;
  sanity?: number;
  note?: string;
}

// ---------- §14: mochilas ----------

export interface CarrySystem {
  slots: number;         // volume — quantos objetos cabem
  weightMax: number;     // peso em kg — afeta velocidade e fadiga
  noiseFloor: number;    // ruído base do que você carrega
  quickSlots: number;    // acesso em encontro (1 rolagem = 1 item)
}

export interface BackpackDef extends CarrySystem {
  id: string;
  name: string;
  rarity: Rarity;
  /** custo oculto da tabela de §14 */
  tearChance?: number;
  metalNoise?: number;
  furtividadeEmDuto?: number;
  velocidadeFuga?: number;
  /** a costurada à mão é âncora (V5): destruída custa 30 de sanidade */
  ehAncora?: boolean;
  sanityOnDestroy?: number;
  custoOculto: string;
}

export interface ModuleDef {
  id: string;
  name: string;
  slots?: number;
  weightMax?: number;
  quickSlots?: number;
  noiseFloorPct?: number;
  metalNoise?: number;
  visual?: number;
  laminaForaDoSlot?: boolean;
  removeRasgo?: boolean;
  compartimentoOculto?: number;
  in: string[];
  risco: string;
}

/** A mochila depois que os módulos entraram. */
export interface SistemaDeCarga extends CarrySystem {
  metalNoise: number;
  /** slots que uma revista humana não encontra — MOD_COMPARTIMENTO_OCULTO */
  compartimentoOculto: number;
  /** quantas lâminas saem do volume por estarem no coldre — e ficam à mostra */
  laminasForaDoSlot: number;
  /** o preço do coldre: arma exposta */
  visual: number;
}

/** O que um humano acha em você, e o que ele não acha. */
export interface RevistaHumana {
  visiveis: number;
  ocultos: number;
}

/** O rastro que o inventário produz sozinho, antes de qualquer ação. */
export interface RuidoCarregado {
  som: number;
  metal: number;
  /** a lâmina no coldre reflete o que houver de luz */
  luz: number;
}

export interface OverloadPenalty {
  speed: number;
  fatigue: number;
  noise: number;
  sanity?: number;
  dropChance?: number;
  text?: string;
}

export interface Inventory {
  backpackId: string;
  modules: string[];
  blades: BladeItem[];
  /** peso do que não é arma, em kg */
  cargaKg: number;
  slotsUsados: number;
  backpackValue: number;
  throwables: number;
  lanternaAcesa: boolean;
  ferimentoAberto: boolean;
}
