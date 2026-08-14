/**
 * Tipos do subsistema SANITY.
 *
 * O bloco de §1 do documento está aqui sem alteração. O resto foi derivado
 * dos entregáveis declarados em §0 — a especificação chegou cortada em §3.3,
 * então tudo que não está em §1 é projetado e está marcado como tal no
 * cabeçalho do módulo correspondente.
 */

export type SanityStage =
  | 'LUCIDO' | 'TENSO' | 'FISSURADO'
  | 'RACHADO' | 'DESFEITO' | 'RUPTURA';

export interface Anchor {
  id: string;
  label: string;           // "Foto da Clara", "Rádio do pai"
  integrity: number;       // 0..100
  status: 'INTACTA' | 'CONTAMINADA' | 'DESTRUIDA';
  bondValue: number;       // 1..5 — peso emocional
}

export type MentalSequela =
  | 'TREMOR' | 'HIPERVIGILANCIA' | 'MUTISMO'
  | 'COMPULSAO' | 'ECO' | 'AGORAFOBIA' | 'NEGACAO';

export interface SanityState {
  sanity: number;          // 0..100
  stressBuffer: number;    // 0..20
  paranoia: number;        // 0..100
  realityDebt: number;     // 0..100
  stage: SanityStage;
  softCap: number;         // teto condicional (ver §6)
  anchors: Anchor[];
  sequelae: MentalSequela[];
  drugState: DrugState;
  illusionPity: number;    // rodadas sem ilusão significativa
  lastCheckTick: number;
  log: SanityLogEntry[];

  // --- derivado dos entregáveis, não consta de §1 ---
  daySeed: number;
  day: number;
  period: number;              // período dentro do dia
  tick: number;                // relógio monotônico do subsistema
  pending: PendingLoss[];      // perdas com delayPeriods
  onceUsed: string[];          // ids de cadence UNICO_RUN já gastos
  activeIllusion: ActiveIllusion | null;
  seenTells: string[];         // tells que o jogador já identificou
  hoursAwake: number;
}

export interface SanityLogEntry {
  tick: number;
  delta: number;
  cause: string;
  absorbed: number;
}

export interface PendingLoss {
  id: string;
  amount: number;
  cause: string;
  duePeriod: number;
}

// ---------- estágios ----------

export interface StageEffects {
  noise: number;
  stamina: number;
  lootRead: number;
  uiLie: number;
}

export interface StageDef {
  id: SanityStage;
  min: number;
  max: number;
  illusionChance: number;
  uiReliability: number;
  voz: string;
  efeitos: StageEffects;
}

// ---------- perdas ----------

export type Cadence = 'PERIODO' | 'DIA' | 'CINCO_MIN' | 'UNICO_RUN' | 'EVENTO';

export interface LossDef {
  id: string;
  rotulo: string;
  amount: number;
  cadence: Cadence;
  paranoia?: number;
  realityDebt?: number;
  delayPeriods?: number;
  modifier?: string;
  fonte: 'spec' | 'projetado';
}

/** Contexto que resolve os modificadores textuais do documento. */
export interface LossContext {
  sozinho?: boolean;
}

// ---------- ganhos ----------

export interface GainDef {
  id: string;
  rotulo: string;
  sanity: number;
  buffer: number;
  cadence: Cadence;
  debtRelief?: number;
  fonte: 'spec' | 'projetado';
}

// ---------- fármacos ----------

export type DrugId = 'ANSIOLITICO' | 'ESTIMULANTE' | 'ANALGESICO' | 'DESTILADO';

export interface WithdrawalDef {
  sanityPorPeriodo: number;
  paranoiaPorPeriodo: number;
  illusionMult: number;
  duracao: number;
}

export interface DrugDef {
  id: DrugId;
  rotulo: string;
  descricao: string;
  onset: number;
  duration: number;
  sanityImediata: number;
  bufferImediato: number;
  illusionMult: number;
  uiLieMult: number;
  paranoiaDelta?: number;
  noiseDelta?: number;
  insoniaSuprimida?: boolean;
  suprimeFerimento?: boolean;
  toleranceStep: number;
  dependenciaEm: number;
  withdrawal: WithdrawalDef;
  fonte: 'spec' | 'projetado';
}

export interface DrugTrack {
  tolerance: number;        // 0..100 — quanto o efeito já perdeu força
  doses: number;            // doses tomadas na run
  activeUntilPeriod: number;
  onsetAtPeriod: number;
  dependent: boolean;
  withdrawalUntilPeriod: number;
}

export type DrugState = Record<DrugId, DrugTrack>;

// ---------- ilusões ----------

export type IllusionTone = 'HOSTIL' | 'MELANCOLICA';
export type TellChannel = 'VISUAL' | 'SOM' | 'TEMPO' | 'CONTAGEM' | 'CHEIRO';

export interface IllusionDef {
  id: string;
  minStage: SanityStage;
  tone: IllusionTone;
  tellChannel: TellChannel;
  text: string;
  tell: string;
  verifyCost: { minutes: number; noise: number };
  whenReal: string | null;
  whenFalse: string;
  onIgnore: string;
  ignoreDebt: number;
  ignoreSanity: number;
  canBeReal: boolean;
}

export interface ActiveIllusion {
  def: IllusionDef;
  isReal: boolean;
  raisedAtPeriod: number;
  text: string;
}

// ---------- vozes noturnas ----------

export interface VoiceOutcome {
  sanity: number;
  paranoia: number;
  realityDebt: number;
}

export interface VoiceDef {
  id: string;
  tone: IllusionTone;
  paranoiaMin: number;
  text: string;
  tell: string;
  answerable: boolean;
  seResponder?: VoiceOutcome;
  seIgnorar: VoiceOutcome;
}

export interface ActiveVoice {
  def: VoiceDef;
  text: string;
  tell: string;
}

// ---------- verificação de realidade ----------

export type CheckMethod = 'CONTAR' | 'TOCAR' | 'COMPARAR' | 'PERGUNTAR';

export interface CheckResult {
  method: CheckMethod;
  conclusive: boolean;
  tellFound: boolean;
  text: string;
  debtRelief: number;
  sanityDelta: number;
  minutes: number;
  noise: number;
}
