/**
 * FICHA DO PERSONAGEM (pura): os espaços do corpo com o que está vestido ou
 * carregado e o que cada coisa faz (proteção, calor, durabilidade, peso,
 * mobilidade, estado, acessórios), e todos os estados do corpo em barras e
 * palavras. A tela (ui/CharacterScreen) só desenha isto.
 */
import { STATE_LEVELS } from '../config/SurvivalTuning';
import { condition, conditionTags, isBroken, wearFactors, type ItemState } from '../items/condition';
import { itemDef } from '../items/ItemCatalog';
import type { ItemDef, WearSlot } from '../items/ItemTypes';
import type { PlayerInventory } from '../items/PlayerInventory';
import { PART_INFO, WOUND_INFO } from '../health/Wounds';
import type { Health } from '../health/Health';
import { NEED_LABELS, needStage, type Body } from './Body';

export type SheetSlotId = WearSlot | 'mochila' | 'mao' | 'coldre' | 'acessorios';

export interface SheetSlot {
  id: SheetSlotId;
  label: string;
  def: ItemDef | null;
  st?: ItemState;
  /** Linhas do cartão (o que o item faz). */
  lines: string[];
  /** Acessórios presos (lanterna no capacete...). */
  extras: string[];
}

export type SheetTone = 'ok' | 'info' | 'warn' | 'bad';

export interface SheetStat {
  id: string;
  label: string;
  /** 0..1 (1 = bem). */
  value: number;
  text: string;
  tone: SheetTone;
}

const SLOT_LABEL: Record<SheetSlotId, string> = {
  cabeca: 'Cabeça',
  rosto: 'Rosto',
  pescoco: 'Pescoço',
  tronco: 'Torso',
  'tronco-externo': 'Agasalho',
  maos: 'Mãos',
  pernas: 'Pernas',
  pes: 'Pés',
  mochila: 'Mochila',
  mao: 'Na mão',
  coldre: 'Coldre',
  acessorios: 'Acessórios',
};

export const SHEET_SLOTS: readonly SheetSlotId[] = ['cabeca', 'rosto', 'pescoco', 'tronco', 'tronco-externo', 'maos', 'pernas', 'pes', 'mochila', 'mao', 'coldre', 'acessorios'];

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** O que um item faz, em linhas curtas (proteção, calor, durabilidade, peso, mobilidade, estado). */
export function itemLines(def: ItemDef, st: ItemState | undefined, now: number): string[] {
  const out: string[] = [];
  if (def.wear) {
    const f = wearFactors(def, st);
    out.push(`Proteção: mordida ${pct(f.bite)} · arranhão ${pct(f.scratch)}`);
    out.push(`Isolamento térmico: ${f.insulation < 0.1 ? 'quase nada' : f.insulation < 0.35 ? 'pouco' : f.insulation < 0.7 ? 'bom' : 'muito'} (${f.insulation.toFixed(2).replace('.', ',')})`);
    // Roupa pesada/grossa atrapalha um pouco o movimento (e esquenta).
    out.push(`Mobilidade: ${def.weight >= 2.5 ? 'reduz um pouco' : def.weight >= 1.2 ? 'normal' : 'livre'}`);
  }
  if (def.melee) out.push(`Arma: dano ${def.melee.damage} · ${def.melee.kind === 'corte' ? 'corta' : def.melee.kind === 'perfuracao' ? 'perfura' : 'pancada'}`);
  if (def.gun) out.push(`Arma de fogo: ${st?.am ?? 0}/${def.gun.capacity} balas · dano ${def.gun.damage}`);
  if (def.bag) out.push(`Leva ${def.bag.capacity} kg`);
  const k = def.condition;
  if (k === 'durable' || k === 'clothing' || k === 'device') out.push(`Durabilidade: ${isBroken(def, st) ? 'quebrado' : pct(condition(st))}`);
  out.push(`Peso: ${def.weight.toFixed(def.weight < 1 ? 2 : 1).replace('.', ',')} kg`);
  const tags = conditionTags(def, st, now).filter((t) => t.tone !== 'ok');
  if (tags.length) out.push(`Estado: ${tags.map((t) => t.text).join(', ')}`);
  return out;
}

/** Acessórios presos a um item (lanterna com fita no capacete, na arma...). */
function extrasOf(st: ItemState | undefined): string[] {
  const att = (st as { att?: { defId: string }[] } | undefined)?.att ?? [];
  return att.map((a) => itemDef(a.defId)?.name ?? a.defId);
}

export function sheetSlots(inv: PlayerInventory, now: number): SheetSlot[] {
  const mk = (id: SheetSlotId, e: { defId: string; st?: ItemState } | null | undefined): SheetSlot => {
    const def = e ? itemDef(e.defId) : null;
    return { id, label: SLOT_LABEL[id], def, ...(e?.st ? { st: e.st } : {}), lines: def ? itemLines(def, e?.st, now) : [], extras: extrasOf(e?.st) };
  };
  const out: SheetSlot[] = [];
  for (const id of SHEET_SLOTS) {
    if (id === 'mochila') out.push(mk(id, inv.bag));
    else if (id === 'mao') out.push(mk(id, inv.arms > 0 ? null : inv.hand));
    else if (id === 'coldre') {
      // Arma reserva: a primeira arma nos bolsos/mochila (fora da mão).
      let spare: { defId: string; st?: ItemState } | null = null;
      for (const c of inv.containers) {
        for (const s of c.stacks) {
          const d = itemDef(s.defId);
          if (d && (d.gun || d.melee)) {
            spare = s;
            break;
          }
        }
        if (spare) break;
      }
      out.push(mk(id, spare));
    } else if (id === 'acessorios') {
      // Relógio, rádio, celular, lanterna carregados: o que se usa sem pegar na mão.
      let acc: { defId: string; st?: ItemState } | null = null;
      for (const c of inv.containers) {
        for (const s of c.stacks) {
          const d = itemDef(s.defId);
          if (d && (d.tags.includes('relogio') || d.tags.includes('radio') || d.tags.includes('luz'))) {
            acc = s;
            break;
          }
        }
        if (acc) break;
      }
      out.push(mk(id, acc));
    } else out.push(mk(id, inv.wornIn(id)));
  }
  return out;
}

const toneOf = (stage: number): SheetTone => (stage === 0 ? 'ok' : stage === 1 ? 'info' : stage === 2 ? 'warn' : 'bad');

/** Todos os estados do corpo, do mais básico ao mais grave, com palavra e barra. */
export function sheetStats(body: Body, health: Health | null, vital: { health: number; maxHealth: number; stamina: number; maxStamina: number }, load: { kg: number; cap: number }): SheetStat[] {
  const L = STATE_LEVELS;
  const out: SheetStat[] = [];
  const hp = vital.health / Math.max(1, vital.maxHealth);
  out.push({ id: 'vida', label: 'Vida', value: hp, text: `${Math.round(vital.health)}`, tone: hp > 0.6 ? 'ok' : hp > 0.35 ? 'warn' : 'bad' });
  const need = (id: string, label: string, v: number, th: readonly number[], words: readonly string[], rich: string) => {
    const s = needStage(v, th);
    out.push({ id, label, value: Math.max(0, Math.min(1, 1 - v / 100)), text: v < 0 ? rich : words[s]!, tone: toneOf(s) });
  };
  need('fome', 'Fome', body.hunger, L.hunger, NEED_LABELS.fome, 'Bem alimentado');
  need('sede', 'Sede', body.thirst, L.thirst, NEED_LABELS.sede, 'Bem hidratado');
  need('sono', 'Sono', body.fatigue, L.fatigue, NEED_LABELS.sono, 'Descansado');
  const st = vital.stamina / Math.max(1, vital.maxStamina);
  out.push({ id: 'folego', label: 'Energia (fôlego)', value: st, text: st > 0.6 ? 'Disposto' : st > 0.3 ? 'Ofegante' : 'Sem fôlego', tone: st > 0.6 ? 'ok' : st > 0.3 ? 'info' : 'warn' });
  const t = body.temp;
  const cold = t <= L.coldTemp[0];
  const hot = t >= L.hotTemp[0];
  out.push({
    id: 'temp',
    label: 'Temperatura',
    value: Math.max(0, Math.min(1, 1 - Math.abs(t - 37) / 3)),
    text: `${t.toFixed(1).replace('.', ',')} °C · ${t < L.coldTemp[2] ? 'hipotermia' : t < L.coldTemp[1] ? 'frio intenso' : cold ? 'com frio' : t > L.hotTemp[2] ? 'hipertermia' : t > L.hotTemp[1] ? 'calor intenso' : hot ? 'com calor' : 'normal'}`,
    tone: t < L.coldTemp[2] || t > L.hotTemp[2] ? 'bad' : cold || hot ? 'warn' : 'ok',
  });
  if (body.wet > 0.02) out.push({ id: 'molhado', label: 'Molhado', value: 1 - body.wet, text: pct(body.wet), tone: body.wet > 0.55 ? 'warn' : 'info' });
  const h = health;
  const pain = h?.pain ?? 0;
  out.push({ id: 'dor', label: 'Dor', value: 1 - pain / 100, text: pain < 12 ? 'Sem dor' : pain < 30 ? 'Dolorido' : pain < 60 ? 'Dor' : 'Dor forte', tone: pain < 12 ? 'ok' : pain < 30 ? 'info' : pain < 60 ? 'warn' : 'bad' });
  const bleed = h?.bleeding ?? 0;
  out.push({ id: 'sangramento', label: 'Sangramento', value: Math.max(0, 1 - bleed / 10), text: bleed < 0.3 ? 'Nenhum' : bleed < 3 ? 'Sangrando' : bleed < 8 ? 'Sangrando muito' : 'Hemorragia', tone: bleed < 0.3 ? 'ok' : bleed < 3 ? 'warn' : 'bad' });
  const inf = Math.max(0, ...(h?.wounds.map((w) => w.infection) ?? [0]));
  out.push({ id: 'infeccao', label: 'Infecção', value: 1 - inf, text: inf <= 0 ? 'Nenhuma' : inf > 0.5 ? 'Grave' : 'Começando', tone: inf <= 0 ? 'ok' : inf > 0.5 ? 'bad' : 'warn' });
  const stress = 1 - body.morale / 100;
  out.push({ id: 'estresse', label: 'Estresse', value: body.morale / 100, text: body.morale > 60 ? 'Calmo' : body.morale > 35 ? 'Tenso' : body.morale > 22 ? 'Estressado' : 'No limite', tone: body.morale > 60 ? 'ok' : body.morale > 35 ? 'info' : stress > 0.78 ? 'bad' : 'warn' });
  out.push({ id: 'nausea', label: 'Náusea', value: 1 - body.sickness, text: body.sickness < 0.1 ? 'Nenhuma' : body.sickness < 0.4 ? 'Enjoado' : body.sickness < 0.7 ? 'Doente' : 'Intoxicado', tone: body.sickness < 0.1 ? 'ok' : body.sickness < 0.4 ? 'info' : 'bad' });
  const z = h?.zombieProgress ?? 0;
  if (z > 0.15) out.push({ id: 'febre', label: 'Febre estranha', value: 1 - z, text: z > 0.8 ? 'Delirando' : z > 0.5 ? 'Muito doente' : 'Febril', tone: 'bad' });
  const lr = load.kg / Math.max(0.1, load.cap);
  out.push({ id: 'carga', label: 'Carga', value: 1 - Math.min(1, lr), text: `${load.kg.toFixed(1).replace('.', ',')} / ${load.cap.toFixed(0)} kg`, tone: lr < 0.7 ? 'ok' : lr < 0.9 ? 'warn' : 'bad' });
  return out;
}

/** Ferimentos em linhas curtas ("Arranhão no braço esquerdo · com atadura"). */
export function sheetWounds(health: Health | null): { text: string; tone: SheetTone }[] {
  if (!health) return [];
  return health.wounds.map((w) => {
    const info = WOUND_INFO[w.kind];
    const care = [w.bandage ? (w.bandage.clean ? 'atadura' : 'atadura suja') : '', w.sutured ? 'suturado' : '', w.splinted ? 'tala' : '', w.bleed > 0.3 && !w.bandage ? 'sangrando' : '', w.infection > 0 ? 'infeccionando' : ''].filter(Boolean);
    return { text: `${info.label} ${PART_INFO[w.part].where}${care.length ? ` · ${care.join(', ')}` : ''}`, tone: w.infection > 0 || (w.bleed > 0.3 && !w.bandage) ? 'bad' : w.sev > 0.5 ? 'warn' : 'info' };
  });
}

