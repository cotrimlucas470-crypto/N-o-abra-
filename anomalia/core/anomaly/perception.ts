/**
 * Motor de percepção — §3.
 *
 * `computeDetection` e `ENV_PRESETS` são o bloco de §3 sem alteração. Duas
 * coisas que o trecho deixava implícitas e que sem elas o motor não fecha:
 *
 *   - `mapKey` traduz o estímulo para a chave do rastro. §13 fala em
 *     `trace.metal` e `trace.som`, então as chaves são minúsculas.
 *   - o quinto parâmetro `bias` não consta da assinatura de §3, mas §8 exige
 *     que o estado MARCADO some +25 em toda detecção contra o jogador. É
 *     opcional, então a chamada de quatro argumentos escrita no documento
 *     continua válida palavra por palavra.
 *
 * O `decay` de §1 ("quanto o rastro persiste por tick") é da anomalia, não do
 * mundo: é o quanto ELA ainda tem do seu rastro depois que você parou de
 * produzi-lo. Por isso mora em `AnomalyInstance.residual` e não no jogador —
 * é o que faz ficar imóvel levar dois ticks contra quem lê movimento e não
 * levar nenhum contra quem lê luz.
 */

import type {
  AnomalyDef, AnomalyInstance, AnomalyState, EnvModifiers,
  PlayerTrace, Stimulus, TraceKey,
} from './types.ts';
import { clamp } from './rng.ts';

/** Um tick é a unidade de tempo do subsistema. §2 fala em "ficar imóvel 20s". */
export const TICK_SEGUNDOS = 10;

export function mapKey(s: Stimulus): TraceKey {
  switch (s) {
    case 'SOM': return 'som';
    case 'MOVIMENTO': return 'movimento';
    case 'CHEIRO': return 'cheiro';
    case 'LUZ': return 'luz';
    case 'CALOR': return 'calor';
    case 'METAL': return 'metal';
    case 'VOZ': return 'voz';
    case 'SANGUE': return 'sangue';
    case 'MEMORIA': return 'memoria';
  }
}

export function traceVazio(): PlayerTrace {
  return {
    som: 0, movimento: 0, cheiro: 0, luz: 0,
    calor: 0, metal: 0, voz: 0, sangue: 0, memoria: 0,
  };
}

export function computeDetection(
  def: AnomalyDef,
  trace: PlayerTrace,
  distance: number,
  env: EnvModifiers,
  bias = 0,
): number {
  let score = 0;

  for (const sense of def.senses) {
    if (def.blindTo.includes(sense.stimulus)) continue;
    if (distance > sense.range) continue;

    const raw = trace[mapKey(sense.stimulus)];
    if (raw < sense.threshold) continue;

    // proximidade: perto pesa mais, queda quadrática suave
    const prox = 1 - (distance / sense.range) ** 1.5;

    // ambiente: chuva abafa som, vento espalha cheiro, névoa mata luz
    const envMod = env.modifiers[sense.stimulus] ?? 1.0;

    score += (raw - sense.threshold) * sense.weight * prox * envMod;
  }

  // O bônus de MARCADO amplifica um rastro que já existe; não inventa um.
  // Somar antes do teste destruiria as fraquezas de §2: um jogador marcado e
  // parado no escuro seria achado por quem só lê movimento.
  return clamp(score + (score > 0 ? bias : 0), 0, 100);
}

export const ENV_PRESETS: Record<string, EnvModifiers> = {
  CHUVA:   { modifiers: { SOM: 0.55, CHEIRO: 0.40, SANGUE: 0.35, LUZ: 1.20 } },
  VENTO:   { modifiers: { CHEIRO: 1.45, SOM: 0.80 } },
  NEVOA:   { modifiers: { LUZ: 0.30, MOVIMENTO: 0.50, SOM: 1.25 } },
  SECO:    { modifiers: {} },
  NOITE:   { modifiers: { LUZ: 1.80, MOVIMENTO: 0.70, SOM: 1.15 } },
  CALOR:   { modifiers: { CHEIRO: 1.60, CALOR: 0.70 } },
};

/** Noite com chuva é as duas coisas. Multiplicar mantém o sinal de cada uma. */
export function combinarEnv(...nomes: readonly string[]): EnvModifiers {
  const out: EnvModifiers = { modifiers: {} };
  for (const nome of nomes) {
    const preset = ENV_PRESETS[nome];
    if (!preset) continue;
    for (const [k, v] of Object.entries(preset.modifiers)) {
      const chave = k as Stimulus;
      out.modifiers[chave] = (out.modifiers[chave] ?? 1) * (v ?? 1);
    }
  }
  return out;
}

/** Limiares de detecção — a tabela de §3, literal. */
export function stateFromScore(score: number): AnomalyState {
  if (score >= 90) return 'CACA';
  if (score >= 70) return 'RASTRO';
  if (score >= 45) return 'BUSCA';
  if (score >= 20) return 'ALERTA';
  return 'DORMENTE';
}

/**
 * O rastro que a anomalia retém. O que o jogador produz agora entra inteiro;
 * o que ele produziu antes encolhe por `decay`. Só os estímulos que ela
 * percebe são retidos — ela não guarda o que não sente.
 */
export function atualizarResidual(
  inst: AnomalyInstance,
  def: AnomalyDef,
  trace: PlayerTrace,
): PlayerTrace {
  for (const sense of def.senses) {
    if (def.blindTo.includes(sense.stimulus)) continue;
    const k = mapKey(sense.stimulus);
    const agora = trace[k];
    const lembranca = inst.residual[k] * sense.decay;
    inst.residual[k] = Math.max(agora, lembranca);
  }
  return inst.residual;
}

/**
 * Apagar um rastro dos dois lados: o que o jogador produz e o que a anomalia
 * lembra. É o que o bisturi de §13 faz com SANGUE, e o que o banho de §8 faz
 * com a marca — limpar sem tirar a lembrança não limparia nada.
 */
export function limparRastro(
  inst: AnomalyInstance,
  trace: PlayerTrace,
  ...chaves: readonly TraceKey[]
): void {
  for (const k of chaves) {
    trace[k] = 0;
    inst.residual[k] = 0;
  }
}

/**
 * §12 — de Fissurado para baixo a distância exibida erra em até dois metros.
 * A distância real nunca é tocada; só a leitura da UI.
 */
export function distanciaExibida(real: number, erro: number): number {
  return Math.max(0, real + erro);
}

/** Estado MARCADO de §8: a anomalia guarda o rastro por 3 dias. */
export const BONUS_MARCADO = 25;
export const DIAS_MARCADO = 3;
