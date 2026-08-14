/**
 * Vozes noturnas.
 *
 * nightVoices.ts é entregável declarado em §0; a seção veio depois do corte.
 * Projetado sob as mesmas regras: o texto nunca rotula a voz como falsa
 * (regra 2) e toda voz carrega um tell (regra 4).
 *
 * A diferença para as ilusões: a voz não tem "verificar". Ela tem responder
 * ou não responder, e as duas coisas custam. Responder tira dívida de
 * realidade — você encarou — mas custa mais sanidade. Ignorar é barato agora
 * e caro depois. É o mesmo trade do documento em §1, aplicado à noite.
 */

import voiceData from '../../data/sanity/voices.json' with { type: 'json' };
import type { ActiveVoice, SanityState, VoiceDef, VoiceOutcome } from './types.ts';
import { clamp, refresh, stageFor, type CapConditions } from './state.ts';
import { pesoDoTom } from './illusions.ts';
import { makeRng } from './rng.ts';

export const VOICES: readonly VoiceDef[] = voiceData.vozes as VoiceDef[];

export function assertCatalogoVozesSano(): void {
  for (const v of VOICES) {
    if (!v.tell || v.tell.trim().length < 12) {
      throw new Error(`Voz sem tell utilizável: ${v.id} (regra 4 de §0)`);
    }
    if (v.answerable && !v.seResponder) {
      throw new Error(`Voz ${v.id}: answerable=true exige seResponder`);
    }
    if (!v.answerable && v.seResponder) {
      throw new Error(`Voz ${v.id}: answerable=false não pode ter seResponder`);
    }
  }
}

export interface VoiceContext {
  ehNoite: boolean;
  mortos?: readonly string[];
  moradores?: readonly string[];
}

/** Interpola {morto} e {morador} sem deixar chave crua escapar para a tela. */
function preencher(texto: string, ctx: VoiceContext, rng: ReturnType<typeof makeRng>): string {
  let out = texto;
  if (out.includes('{morto}')) {
    const nome = ctx.mortos && ctx.mortos.length ? rng.pick(ctx.mortos) : 'alguém que você conheceu';
    out = out.replaceAll('{morto}', nome);
  }
  if (out.includes('{morador}')) {
    const nome = ctx.moradores && ctx.moradores.length ? rng.pick(ctx.moradores) : 'alguém da casa';
    out = out.replaceAll('{morador}', nome);
  }
  return out;
}

/** Só de noite, e só a partir de TENSO. Em LUCIDO a noite é só noite. */
export function talvezVoz(s: SanityState, ctx: VoiceContext): ActiveVoice | null {
  if (!ctx.ehNoite) return null;
  if (s.stage === 'LUCIDO') return null;

  const rng = makeRng(s.daySeed, `voz:${s.day}:${s.period}`);
  const chance = clamp(stageFor(s.sanity).illusionChance * 0.8, 0, 0.9);
  if (!rng.chance(chance)) return null;

  const pool = VOICES.filter((v) => s.paranoia >= v.paranoiaMin);
  if (pool.length === 0) return null;

  const def = rng.weighted(pool, (v) => pesoDoTom(s, v.tone));
  return {
    def,
    text: preencher(def.text, ctx, rng),
    tell: def.tell,
  };
}

function aplicar(s: SanityState, o: VoiceOutcome, causa: string, cond: CapConditions): void {
  s.sanity = clamp(s.sanity + o.sanity, 0, s.softCap);
  s.paranoia = clamp(s.paranoia + o.paranoia, 0, 100);
  s.realityDebt = clamp(s.realityDebt + o.realityDebt, 0, 100);
  s.log.push({ tick: s.tick, delta: o.sanity, cause: causa, absorbed: 0 });
  refresh(s, cond);
}

export function responder(s: SanityState, voz: ActiveVoice, cond: CapConditions = {}): boolean {
  if (!voz.def.answerable || !voz.def.seResponder) return false;
  aplicar(s, voz.def.seResponder, `Respondeu: ${voz.def.id}`, cond);
  return true;
}

export function ignorarVoz(s: SanityState, voz: ActiveVoice, cond: CapConditions = {}): void {
  aplicar(s, voz.def.seIgnorar, `Não respondeu: ${voz.def.id}`, cond);
}
