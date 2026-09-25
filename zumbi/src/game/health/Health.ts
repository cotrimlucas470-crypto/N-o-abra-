/**
 * SAÚDE por parte do corpo: cada ferimento sangra, dói, suja, pode
 * infeccionar e sara com o tempo — mais rápido e sem complicação quando
 * tratado do jeito certo (atadura limpa, desinfetante, sutura, tala,
 * pomada, tirar o caco). Remédios agem por algumas horas (analgésico,
 * antibiótico). Puro; implementa `InjuryModel` do Survivor.
 *
 * Regras principais (por hora de jogo):
 * - SANGRAMENTO tira vida; atadura segura quase tudo, mas corte fundo sem
 *   sutura continua vazando. Ferida pequena estanca sozinha.
 * - SUJEIRA acumula em ferida aberta (menos com desinfetante e atadura
 *   limpa; mais com atadura suja ou caco dentro). Chegou a 1: INFECÇÃO,
 *   que cresce, dá febre, dor e tira vida — antibiótico faz recuar.
 * - CURA avança sozinha, mais rápida dormindo e bem alimentado; para com
 *   infecção ou caco dentro; fica muito mais lenta sem sutura/tala.
 */
import { clamp } from '../core/math';
import type { Body, BodyState } from '../survival/Body';
import type { InjuryEffects } from '../survival/Effects';
import type { InjuryModel } from '../survival/Survivor';
import { PART_INFO, WOUND_INFO, isOpen, type BodyPart, type WoundKind } from './Wounds';

export interface Wound {
  id: number;
  part: BodyPart;
  kind: WoundKind;
  /** Gravidade 0..1. */
  sev: number;
  /** Sangramento atual 0..1. */
  bleed: number;
  /** Atadura: limpa ou suja, e há quanto tempo (min). */
  bandage?: { clean: boolean; age: number };
  /** Minutos de proteção do desinfetante que ainda restam. */
  disinfected?: number;
  sutured?: boolean;
  splinted?: boolean;
  /** Pomada aplicada (queimadura). */
  ointment?: boolean;
  /** Caco/farpa ainda dentro. */
  glass?: boolean;
  /** Sujeira acumulada (≥1 vira infecção). */
  dirt: number;
  /** Infecção 0..1. */
  infection: number;
  /** Cura 0..1. */
  heal: number;
}

export interface HealthSave {
  version: 1;
  wounds: Wound[];
  nextId: number;
  painkiller: number;
  painkillerPower: number;
  antibiotic: number;
  /** Infecção zumbi: minutos desde que pegou e duração total até matar. */
  zombie?: { t: number; dur: number; src?: string };
}

/**
 * Infecção ZUMBI (da mordida, às vezes de corte/arranhão): não tem cura.
 * Fica escondida algumas horas, depois febre, fraqueza, delírio — e mata
 * em 1,5 a 3 dias de jogo. O jogador só descobre pelos sintomas.
 */
export interface ZombieInfection {
  t: number;
  dur: number;
  /** De onde veio ("Mordida no braço esquerdo"): para o relatório da morte. */
  src?: string;
}

/** Atadura limpa fica suja depois deste tempo (min). */
export const BANDAGE_DIRTY_AFTER = 12 * 60;

export class Health implements InjuryModel {
  wounds: Wound[] = [];
  private nextId = 1;
  /** Minutos de analgésico agindo e quanto ele tira de dor. */
  painkiller = 0;
  painkillerPower = 0;
  /** Minutos de antibiótico agindo. */
  antibiotic = 0;
  /** Infecção zumbi (null = limpo). */
  zombie: ZombieInfection | null = null;
  private cache: InjuryEffects | null = null;

  /** Pegou a infecção zumbi (se já tinha, nada muda). */
  infectZombie(rng: () => number = Math.random, src?: string): void {
    if (this.zombie) return;
    this.zombie = { t: 0, dur: (36 + rng() * 36) * 60, ...(src ? { src } : {}) };
    this.cache = null;
  }

  /** 0 limpo … 1 fim. */
  get zombieProgress(): number {
    return this.zombie ? Math.min(1, this.zombie.t / this.zombie.dur) : 0;
  }

  /** Novo ferimento (gravidade 0..1). Devolve o ferimento criado. */
  add(part: BodyPart, kind: WoundKind, sev: number): Wound {
    const info = WOUND_INFO[kind];
    const s = clamp(sev, 0.05, 1);
    const w: Wound = { id: this.nextId++, part, kind, sev: s, bleed: info.bleed * (0.5 + 0.5 * s), dirt: 0, infection: 0, heal: 0 };
    if (kind === 'estilhaco') w.glass = true;
    // Mordida vem suja de saída.
    if (kind === 'mordida') w.dirt = 0.5;
    this.wounds.push(w);
    this.cache = null;
    return w;
  }

  byId(id: number): Wound | null {
    return this.wounds.find((w) => w.id === id) ?? null;
  }

  update(minutes: number, ctx: { sleeping: boolean; body: Body }): number {
    let hp = 0;
    let left = minutes;
    while (left > 0) {
      const step = Math.min(10, left);
      hp += this.step(step, ctx);
      left -= step;
    }
    this.cache = null;
    return hp;
  }

  private step(min: number, ctx: { sleeping: boolean; body: Body }): number {
    const h = min / 60;
    let hp = 0;
    if (this.zombie) {
      this.zombie.t += min;
      const z = this.zombieProgress;
      // Últimas horas: o corpo apaga.
      if (z > 0.85) hp -= (z >= 1 ? 400 : 14 + (z - 0.85) * 300) * h;
    }
    this.painkiller = Math.max(0, this.painkiller - min);
    if (this.painkiller <= 0) this.painkillerPower = 0;
    this.antibiotic = Math.max(0, this.antibiotic - min);
    for (const w of this.wounds) {
      const info = WOUND_INFO[w.kind];
      // Atadura envelhece e suja.
      if (w.bandage) {
        w.bandage.age += min;
        if (w.bandage.clean && w.bandage.age > BANDAGE_DIRTY_AFTER) w.bandage.clean = false;
      }
      if (w.disinfected) w.disinfected = Math.max(0, w.disinfected - min);
      // Sangramento: atadura segura; corte fundo sem sutura vaza pela atadura.
      if (w.bleed > 0) {
        let hold = 1;
        if (w.bandage) hold = info.needs === 'sutura' && !w.sutured ? 0.3 : 0.08;
        if (w.sutured) hold = Math.min(hold, 0.05);
        hp -= w.bleed * info.bleedHp * hold * h;
        const clot = (w.bandage ? Math.max(info.clot, 0.3) : info.clot) * (w.sutured ? 3 : 1);
        w.bleed = Math.max(0, w.bleed - clot * h * (w.bandage ? 1.5 : 1));
        if (w.bleed < 0.02) w.bleed = 0;
      }
      // Sujeira → infecção (só ferida aberta e ainda não sarada).
      if (isOpen(w.kind) && w.heal < 0.9) {
        let risk = info.contamination;
        if ((w.disinfected ?? 0) > 0) risk *= 0.08;
        if (w.bandage) risk *= w.bandage.clean ? 0.5 : 2.2;
        if (w.glass) risk *= 2.5;
        if (w.kind === 'queimadura' && w.ointment) risk *= 0.3;
        if (w.infection <= 0) {
          w.dirt += risk * h;
          if (w.dirt >= 1) w.infection = 0.05;
        }
      }
      if (w.infection > 0) {
        if (this.antibiotic > 0) w.infection = Math.max(0, w.infection - 0.1 * h);
        else w.infection = Math.min(1, w.infection + (w.bandage?.clean ? 0.03 : 0.05) * h);
        if (w.infection <= 0) w.dirt = 0.3;
        hp -= 2.5 * w.infection * w.infection * h;
      }
      // Cura.
      let speed = 1 / info.healHours;
      if (info.needs === 'sutura' && !w.sutured) speed *= 0.3;
      if (info.needs === 'tala' && !w.splinted) speed *= 0.35;
      if (info.needs === 'pomada' && !w.ointment) speed *= 0.6;
      if (w.glass) speed = 0;
      if (w.infection > 0.2) speed = 0;
      if (w.bleed > 0.3) speed *= 0.3;
      if (w.bandage?.clean) speed *= 1.2;
      if (ctx.sleeping) speed *= 1.6;
      if (ctx.body.hunger > 80 || ctx.body.thirst > 80) speed *= 0.4;
      w.heal = Math.min(1, w.heal + speed * h);
    }
    // Sarou: some (queimadura e fratura sarando também param de doer).
    const before = this.wounds.length;
    this.wounds = this.wounds.filter((w) => w.heal < 1);
    if (this.wounds.length !== before) this.cache = null;
    return hp;
  }

  // ---------------------------------------------------------------- leitura

  /** Dor de um ferimento agora (0..100, antes do analgésico). */
  woundPain(w: Wound): number {
    const info = WOUND_INFO[w.kind];
    let p = info.pain * (0.4 + 0.6 * w.sev) * (1 - w.heal * 0.75);
    if (w.kind === 'fratura' && w.splinted) p *= 0.6;
    if (w.kind === 'queimadura' && w.ointment) p *= 0.6;
    return p + w.infection * 40;
  }

  get rawPain(): number {
    let sum = 0;
    let max = this.zombieProgress > 0.3 ? (this.zombieProgress - 0.3) * 50 : 0;
    for (const w of this.wounds) {
      const p = this.woundPain(w);
      sum += p;
      max = Math.max(max, p);
    }
    // A maior dor domina; as outras somam menos.
    return clamp(max + (sum - max) * 0.4, 0, 100);
  }

  get pain(): number {
    return clamp(this.rawPain - this.painkillerPower, 0, 100);
  }

  /** Quanto um ferimento atrapalha a parte (0..1). */
  impairment(w: Wound): number {
    const info = WOUND_INFO[w.kind];
    let x = info.impair * (0.4 + 0.6 * w.sev) * (1 - w.heal * 0.8);
    if (w.kind === 'fratura' && w.splinted) x *= 0.6;
    return x;
  }

  effects(): InjuryEffects {
    if (this.cache) return this.cache;
    let legs = 0;
    let arms = 0;
    let legFracture = false;
    for (const w of this.wounds) {
      const g = PART_INFO[w.part].group;
      const x = this.impairment(w);
      if (g === 'perna') {
        legs += x;
        if (w.kind === 'fratura' && w.heal < 0.8) legFracture = true;
      } else if (g === 'braco') arms += x;
    }
    this.cache = { legs: clamp(legs, 0, 1), arms: clamp(arms, 0, 1), pain: this.pain, legFracture };
    return this.cache;
  }

  /** Febre: infecção sobe o "termostato" (°C). */
  fever(): number {
    let max = 0;
    for (const w of this.wounds) max = Math.max(max, w.infection);
    const z = this.zombieProgress;
    return Math.max(max * 2.4, z > 0.15 ? Math.min(3.2, (z - 0.15) * 5) : 0);
  }

  get bleeding(): number {
    let b = 0;
    for (const w of this.wounds) {
      let hold = 1;
      if (w.bandage) hold = WOUND_INFO[w.kind].needs === 'sutura' && !w.sutured ? 0.3 : 0.08;
      b += w.bleed * hold * WOUND_INFO[w.kind].bleedHp;
    }
    return b;
  }

  blocksRegen(): boolean {
    return this.bleeding > 0.5 || this.wounds.some((w) => w.infection > 0.15);
  }

  states(): BodyState[] {
    const out: BodyState[] = [];
    const b = this.bleeding;
    if (b > 0.3) out.push({ id: 'sangrando', label: b > 8 ? 'Hemorragia' : b > 3 ? 'Sangrando muito' : 'Sangrando', level: b > 8 ? 3 : b > 3 ? 2 : 1, tone: b > 3 ? 'bad' : 'warn' });
    const p = this.pain;
    if (p > 12) out.push({ id: 'dor', label: p > 60 ? 'Dor forte' : p > 30 ? 'Dor' : 'Dolorido', level: p > 60 ? 3 : p > 30 ? 2 : 1, tone: p > 30 ? 'bad' : 'warn' });
    const inf = Math.max(0, ...this.wounds.map((w) => w.infection));
    if (inf > 0) out.push({ id: 'infeccao', label: inf > 0.5 ? 'Infecção grave' : 'Infecção', level: inf > 0.5 ? 3 : 2, tone: 'bad' });
    const e = this.effects();
    if (e.legs > 0.25) out.push({ id: 'mancando', label: e.legFracture ? 'Perna quebrada' : 'Mancando', level: e.legFracture ? 3 : 2, tone: e.legFracture ? 'bad' : 'warn' });
    if (this.wounds.some((w) => w.bandage && !w.bandage.clean)) out.push({ id: 'atadura', label: 'Atadura suja', level: 1, tone: 'warn' });
    // Infecção zumbi: só os sintomas aparecem (nunca o nome).
    const z = this.zombieProgress;
    if (z > 0.15) out.push({ id: 'zumbi', label: z > 0.8 ? 'Delirando' : z > 0.5 ? 'Muito doente' : 'Febre estranha', level: z > 0.5 ? 3 : 2, tone: 'bad' });
    return out;
  }

  // ---------------------------------------------------------------- tratamentos (efeito puro)

  bandage(id: number, clean: boolean): boolean {
    const w = this.byId(id);
    if (!w || !isOpen(w.kind)) return false;
    w.bandage = { clean, age: 0 };
    this.cache = null;
    return true;
  }

  /** Tira a atadura (volta a sangrar o que ainda sangra). */
  unbandage(id: number): boolean {
    const w = this.byId(id);
    if (!w?.bandage) return false;
    delete w.bandage;
    this.cache = null;
    return true;
  }

  /** Desinfeta: limpa a sujeira e protege por 24 h; infecção no começo recua um pouco. */
  disinfect(id: number, power = 1): boolean {
    const w = this.byId(id);
    if (!w || !isOpen(w.kind)) return false;
    w.dirt = 0;
    w.disinfected = 24 * 60 * power;
    if (w.infection > 0) w.infection = Math.max(0, w.infection - 0.15 * power);
    this.cache = null;
    return true;
  }

  suture(id: number): boolean {
    const w = this.byId(id);
    if (!w || (w.kind !== 'laceracao' && w.kind !== 'corte' && w.kind !== 'perfuracao' && w.kind !== 'mordida') || w.sutured) return false;
    w.sutured = true;
    w.bleed = Math.min(w.bleed, 0.1);
    this.cache = null;
    return true;
  }

  splint(id: number): boolean {
    const w = this.byId(id);
    if (!w || (w.kind !== 'fratura' && w.kind !== 'entorse') || w.splinted) return false;
    w.splinted = true;
    this.cache = null;
    return true;
  }

  applyOintment(id: number): boolean {
    const w = this.byId(id);
    if (!w || (w.kind !== 'queimadura' && w.kind !== 'arranhao' && w.kind !== 'corte')) return false;
    w.ointment = true;
    w.heal = Math.min(1, w.heal + 0.05);
    this.cache = null;
    return true;
  }

  /** Tira o caco: a ferida vira um corte que agora sara. */
  removeGlass(id: number): boolean {
    const w = this.byId(id);
    if (!w?.glass) return false;
    delete w.glass;
    w.kind = 'corte';
    w.bleed = Math.max(w.bleed, 0.4);
    this.cache = null;
    return true;
  }

  takePainkiller(power: number, hours: number): void {
    this.painkillerPower = Math.max(this.painkillerPower, power);
    this.painkiller = Math.max(this.painkiller, hours * 60);
    this.cache = null;
  }

  takeAntibiotic(hours = 12): void {
    this.antibiotic = Math.max(this.antibiotic, hours * 60);
  }

  // ---------------------------------------------------------------- save

  serialize(): HealthSave {
    return {
      version: 1,
      wounds: this.wounds.map((w) => ({ ...w, ...(w.bandage ? { bandage: { ...w.bandage } } : {}) })),
      nextId: this.nextId,
      painkiller: this.painkiller,
      painkillerPower: this.painkillerPower,
      antibiotic: this.antibiotic,
      ...(this.zombie ? { zombie: { ...this.zombie } } : {}),
    };
  }

  restore(s: HealthSave | undefined): void {
    if (!s || s.version !== 1) return;
    this.wounds = (s.wounds ?? []).filter((w) => w && PART_INFO[w.part] && WOUND_INFO[w.kind]).map((w) => ({ ...w }));
    this.nextId = Math.max(s.nextId ?? 1, ...this.wounds.map((w) => w.id + 1));
    this.painkiller = s.painkiller ?? 0;
    this.painkillerPower = s.painkillerPower ?? 0;
    this.antibiotic = s.antibiotic ?? 0;
    this.zombie = s.zombie && Number.isFinite(s.zombie.t) && Number.isFinite(s.zombie.dur) ? { ...s.zombie } : null;
    this.cache = null;
  }
}

/** "Corte no braço esquerdo" */
export function woundTitle(w: Wound): string {
  return `${WOUND_INFO[w.kind].label} ${PART_INFO[w.part].where}`;
}
