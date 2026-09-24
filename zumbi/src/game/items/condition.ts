/**
 * ESTADO e CONDIÇÃO dos itens — regras puras, por perfil (`ItemDef.condition`).
 *
 * O estado mora na pilha (`ItemStack.st`) e só guarda o que difere do "novo":
 * item sem estado = novo, cheio, lacrado, fresco de hoje. Assim pilhas iguais
 * continuam se juntando e o save fica pequeno.
 *
 * Cada perfil tem suas regras — nada de "enferrujado" em comida ou "podre" em
 * martelo — e a condição muda o USO de verdade: ferramenta gasta rende menos
 * e quebra; arma danificada falha; comida estragada faz mal; remédio vencido
 * rende metade; roupa molhada não esquenta; pilha fraca dura menos.
 */
import type { ItemDef } from './ItemTypes';

/** Tempo do jogo em DIAS (fração), contado do mesmo jeito que o GameClock (minutos / 1440). */
export type GameDay = number;

export interface ItemState {
  /** Condição 0..1 (1 = novo). 0 = quebrado/inutilizável. */
  c?: number;
  /** Dia em que foi produzido/colhido/estocado (perecíveis). */
  born?: GameDay;
  /** Dia de validade (remédios). */
  exp?: GameDay;
  /** Doses restantes (bebida aberta, frasco, kit). */
  dose?: number;
  /** Lacre rompido. */
  open?: 1;
  /** Carga 0..1 (pilha, bateria, isqueiro, vela, combustível). */
  ch?: number;
  /** Marcas: ver `Flag`. */
  f?: number;
  /** Cartuchos dentro da arma de fogo. */
  am?: number;
  /** Aparelho ligado (lanterna, rádio). */
  on?: 1;
  /** Chave: id do que ela abre (prédio ou veículo). */
  key?: string;
}

export const Flag = {
  Sujo: 1,
  Molhado: 2,
  Enferrujado: 4,
  Contaminado: 8,
  Rasgado: 16,
  Ensanguentado: 32,
  /** Arma de fogo travada: precisa destravar antes de atirar. */
  Emperrada: 64,
} as const;

export type Tone = 'ok' | 'info' | 'warn' | 'bad';

export interface ConditionTag {
  text: string;
  tone: Tone;
}

const has = (st: ItemState | undefined, flag: number) => ((st?.f ?? 0) & flag) !== 0;

// ------------------------------------------------------------------ normalização

const q = (v: number, step: number) => Math.round(v / step) * step;

/**
 * Deixa só o que faz sentido para o perfil do item, arredondado (pilhas de
 * itens "praticamente iguais" se juntam). Devolve undefined se o item está novo.
 */
export function normalizeState(def: ItemDef, st: ItemState | undefined): ItemState | undefined {
  if (!st) return undefined;
  const out: ItemState = {};
  const k = def.condition;
  const durable = k === 'durable' || k === 'clothing' || k === 'device';
  if (durable && st.c !== undefined) {
    const c = Math.min(1, Math.max(0, q(st.c, 0.01)));
    if (c < 1) out.c = c;
  }
  if (k === 'perishable' && st.born !== undefined) out.born = q(st.born, 0.25);
  if (k === 'medicine' && st.exp !== undefined) out.exp = Math.round(st.exp);
  const maxDose = def.drink?.doses ?? def.med?.doses;
  if ((k === 'drink' || k === 'medicine') && maxDose && st.dose !== undefined && st.dose < maxDose) out.dose = Math.max(0, Math.round(st.dose));
  if (k === 'drink' && (st.open || out.dose !== undefined)) out.open = 1;
  if ((k === 'battery' || k === 'device') && st.ch !== undefined) {
    const ch = Math.min(1, Math.max(0, q(st.ch, 0.01)));
    if (ch < 1) out.ch = ch;
  }
  if (def.gun && st.am !== undefined) {
    const am = Math.max(0, Math.min(def.gun.capacity, Math.round(st.am)));
    if (am > 0) out.am = am;
  }
  if (st.on && def.power && (k === 'device' || k === 'battery')) out.on = 1;
  if (st.key && def.tags.includes('chave')) out.key = String(st.key).slice(0, 80);
  let f = st.f ?? 0;
  // Só as marcas que existem para o perfil.
  const allowed =
    k === 'clothing'
      ? Flag.Sujo | Flag.Molhado | Flag.Rasgado | Flag.Ensanguentado
      : k === 'durable' || k === 'device'
        ? Flag.Sujo | Flag.Molhado | (def.metal ? Flag.Enferrujado : 0) | Flag.Ensanguentado | (def.gun ? Flag.Emperrada : 0)
        : k === 'drink' || k === 'perishable'
          ? Flag.Contaminado
          : 0;
  f &= allowed;
  if (f) out.f = f;
  return Object.keys(out).length ? out : undefined;
}

export function sameState(def: ItemDef, a: ItemState | undefined, b: ItemState | undefined): boolean {
  const na = normalizeState(def, a);
  const nb = normalizeState(def, b);
  if (!na || !nb) return !na && !nb;
  return JSON.stringify(na) === JSON.stringify(nb);
}

// ------------------------------------------------------------------ leitura do estado

export type Freshness = 'fresco' | 'passado' | 'estragado' | 'podre';

export function freshness(def: ItemDef, st: ItemState | undefined, now: GameDay): Freshness | null {
  const spoil = def.food?.spoil;
  if (def.condition !== 'perishable' || !spoil) return null;
  const age = now - (st?.born ?? now);
  if (age < spoil[0]) return 'fresco';
  if (age < spoil[1]) return 'passado';
  if (age < spoil[2]) return 'estragado';
  return 'podre';
}

export function condition(st: ItemState | undefined): number {
  return st?.c ?? 1;
}

export function isBroken(def: ItemDef, st: ItemState | undefined): boolean {
  const k = def.condition;
  return (k === 'durable' || k === 'clothing' || k === 'device') && condition(st) <= 0;
}

export function charge(def: ItemDef, st: ItemState | undefined): number {
  return def.condition === 'battery' || def.condition === 'device' ? (st?.ch ?? 1) : 1;
}

export function doses(def: ItemDef, st: ItemState | undefined): number {
  const max = def.drink?.doses ?? def.med?.doses ?? 1;
  return st?.dose ?? max;
}

export function isExpired(def: ItemDef, st: ItemState | undefined, now: GameDay): boolean {
  return def.condition === 'medicine' && st?.exp !== undefined && now > st.exp;
}

export function durabilityLabel(c: number): { text: string; tone: Tone } {
  if (c <= 0) return { text: 'Quebrado', tone: 'bad' };
  if (c < 0.2) return { text: 'Danificado', tone: 'bad' };
  if (c < 0.45) return { text: 'Desgastado', tone: 'warn' };
  if (c < 0.8) return { text: 'Usado', tone: 'info' };
  if (c < 1) return { text: 'Bom estado', tone: 'ok' };
  return { text: 'Novo', tone: 'ok' };
}

/** Etiquetas de condição para a interface ("Usado", "Enferrujado", "Passado", "Lacrada"...). */
export function conditionTags(def: ItemDef, st: ItemState | undefined, now: GameDay): ConditionTag[] {
  const tags: ConditionTag[] = [];
  const k = def.condition;
  if (k === 'durable' || k === 'clothing' || k === 'device') tags.push(durabilityLabel(condition(st)));
  if (k === 'perishable') {
    const fr = freshness(def, st, now);
    if (fr) {
      const fruit = def.tags.includes('fruta') || def.tags.includes('verdura');
      tags.push(
        fr === 'fresco'
          ? { text: fruit ? 'Maduro' : 'Fresco', tone: 'ok' }
          : fr === 'passado'
            ? { text: 'Passado', tone: 'warn' }
            : fr === 'estragado'
              ? { text: 'Estragado', tone: 'bad' }
              : { text: 'Podre', tone: 'bad' },
      );
    }
    if (def.food?.raw) tags.push({ text: 'Cru', tone: 'info' });
  }
  if (k === 'drink') {
    const d = doses(def, st);
    const max = def.drink?.doses ?? 1;
    if (!st?.open) tags.push({ text: def.tags.includes('agua') || max === 1 ? 'Lacrada' : 'Fechada', tone: 'ok' });
    else if (d <= 0) tags.push({ text: 'Vazia', tone: 'bad' });
    else tags.push({ text: d >= max ? 'Aberta' : `Aberta · ${Math.round((d / max) * 100)}%`, tone: 'info' });
  }
  if (k === 'medicine') {
    if (st?.exp !== undefined) tags.push(now > st.exp ? { text: 'Vencido', tone: 'bad' } : { text: 'Na validade', tone: 'ok' });
    const max = def.med?.doses;
    if (max && max > 1 && st?.dose !== undefined) tags.push({ text: `${st.dose}/${max} doses`, tone: 'info' });
  }
  if (k === 'battery' || k === 'device') {
    const ch = charge(def, st);
    if (k === 'battery' || def.power) tags.push(ch <= 0.02 ? { text: 'Descarregado', tone: 'bad' } : ch < 0.5 ? { text: `Carga ${Math.round(ch * 100)}%`, tone: 'warn' } : { text: ch >= 1 ? 'Carregado' : `Carga ${Math.round(ch * 100)}%`, tone: 'ok' });
  }
  if (has(st, Flag.Sujo)) tags.push({ text: 'Sujo', tone: 'warn' });
  if (has(st, Flag.Molhado)) tags.push({ text: 'Molhado', tone: 'warn' });
  if (has(st, Flag.Enferrujado)) tags.push({ text: 'Enferrujado', tone: 'warn' });
  if (has(st, Flag.Rasgado)) tags.push({ text: 'Rasgado', tone: 'warn' });
  if (has(st, Flag.Ensanguentado)) tags.push({ text: 'Ensanguentado', tone: 'warn' });
  if (has(st, Flag.Contaminado)) tags.push({ text: 'Contaminado', tone: 'bad' });
  if (has(st, Flag.Emperrada)) tags.push({ text: 'Emperrada', tone: 'bad' });
  if (def.gun) tags.push({ text: `${st?.am ?? 0}/${def.gun.capacity} balas`, tone: (st?.am ?? 0) > 0 ? 'info' : 'warn' });
  if (st?.on) tags.push({ text: 'Ligado', tone: 'ok' });
  return tags;
}

// ------------------------------------------------------------------ efeitos no uso

/**
 * Quanto a ferramenta/arma rende (1 = nova). Ferrugem e sujeira atrapalham;
 * quebrada não serve (0).
 */
export function effectiveness(def: ItemDef, st: ItemState | undefined): number {
  if (isBroken(def, st)) return 0;
  let e = 0.55 + 0.45 * condition(st);
  if (has(st, Flag.Enferrujado)) e *= 0.85;
  if (has(st, Flag.Sujo)) e *= 0.95;
  return e;
}

/** Chance de a arma de fogo falhar num disparo (cresce rápido com o desgaste). */
export function jamChance(def: ItemDef, st: ItemState | undefined): number {
  if (!def.gun) return 0;
  if (isBroken(def, st)) return 1;
  const wear = 1 - condition(st);
  let j = def.gun.jam + wear * wear * 0.35;
  if (has(st, Flag.Enferrujado)) j += 0.05;
  if (has(st, Flag.Sujo)) j += 0.03;
  return Math.min(0.95, j);
}

/** Isolamento e proteção efetivos de uma roupa. */
export function wearFactors(def: ItemDef, st: ItemState | undefined): { insulation: number; bite: number; scratch: number } {
  const w = def.wear;
  if (!w || isBroken(def, st)) return { insulation: 0, bite: 0, scratch: 0 };
  const c = condition(st);
  const wet = has(st, Flag.Molhado) ? 0.3 : 1;
  const torn = has(st, Flag.Rasgado) ? 0.6 : 1;
  return { insulation: w.insulation * wet * (0.6 + 0.4 * c), bite: w.bite * torn * c, scratch: w.scratch * torn * (0.5 + 0.5 * c) };
}

export interface ConsumeEffect {
  hunger: number;
  thirst: number;
  kcal: number;
  /** Variação de vida (negativo = passou mal). */
  health: number;
  /** Doença alimentar (etapa de sobrevivência/ferimentos). */
  sickness: number;
  message: string;
  tone: Tone;
}

/** O que acontece ao comer UMA unidade agora. */
export function foodEffect(def: ItemDef, st: ItemState | undefined, now: GameDay): ConsumeEffect | null {
  const f = def.food;
  if (!f) return null;
  const fr = freshness(def, st, now) ?? 'fresco';
  const mult = fr === 'fresco' ? 1 : fr === 'passado' ? 0.8 : fr === 'estragado' ? 0.4 : 0;
  let sickness = fr === 'estragado' ? 0.5 : fr === 'podre' ? 1 : 0;
  if (f.raw) sickness = Math.max(sickness, def.tags.includes('carne') || def.tags.includes('peixe') ? 0.6 : 0.2);
  if (f.toxic) sickness = 1;
  if (has(st, Flag.Contaminado)) sickness = Math.max(sickness, 0.7);
  const health = sickness > 0 ? -Math.round(sickness * (f.toxic ? 35 : 18)) : 0;
  const kcal = Math.round(f.kcal * mult);
  const message =
    f.toxic
      ? 'Isso não caiu bem. Nada bem.'
      : fr === 'podre'
        ? 'Estava podre. Você passou mal.'
        : fr === 'estragado'
          ? 'Tinha gosto de estragado.'
          : f.raw && sickness >= 0.5
            ? 'Cru. O estômago reclamou.'
            : fr === 'passado'
              ? `Passado, mas desceu. +${kcal} kcal`
              : `+${kcal} kcal`;
  return { hunger: f.hunger * mult, thirst: f.thirst, kcal, health, sickness, message, tone: health < 0 ? 'bad' : 'ok' };
}

/** O que acontece ao beber UMA dose. */
export function drinkEffect(def: ItemDef, st: ItemState | undefined): ConsumeEffect | null {
  const d = def.drink;
  if (!d) return null;
  const dirty = has(st, Flag.Contaminado) || def.tags.includes('contaminada');
  const sickness = dirty ? 0.6 : 0;
  const health = dirty ? -12 : 0;
  const kcal = d.kcal ?? 0;
  return {
    hunger: kcal > 0 ? Math.min(6, kcal / 40) : 0,
    thirst: d.thirst,
    kcal,
    health,
    sickness,
    message: dirty ? 'Água ruim. A barriga vai reclamar.' : d.alcohol ? 'Esquenta por dentro. Dá sede depois.' : 'Matou a sede.',
    tone: dirty ? 'bad' : 'ok',
  };
}

/** Vida recuperada por UMA aplicação (remédio vencido rende metade). */
export function medHeal(def: ItemDef, st: ItemState | undefined, now: GameDay): number {
  const heal = def.med?.heal ?? 0;
  return Math.round(heal * (isExpired(def, st, now) ? 0.5 : 1));
}

/** Peso real de UMA unidade: bebida pela metade pesa menos. */
export function unitWeight(def: ItemDef, st: ItemState | undefined): number {
  if (def.condition === 'drink' && st?.dose !== undefined && def.drink) {
    const frac = Math.max(0, Math.min(1, st.dose / def.drink.doses));
    return def.weight * (0.12 + 0.88 * frac);
  }
  return def.weight;
}
