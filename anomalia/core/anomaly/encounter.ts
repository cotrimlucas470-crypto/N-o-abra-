/**
 * Tela de encontro — §6. UMA tela, 3 a 5 opções, uma escolha.
 *
 * `buildEncounter` monta o pool exatamente na ordem de §6. Duas coisas que o
 * bloco original usava sem declarar:
 *
 *   - `ctx`, que aparece em `ctx.hasLockableRoom` mas não está na assinatura.
 *     Virou parâmetro.
 *   - `sanity.stage >= 'RACHADO'`, que numa união de literais compara
 *     alfabeticamente e daria o resultado errado ('DESFEITO' < 'RACHADO' em
 *     texto). Virou comparação de posto, em sanityLink.ts.
 *
 * §0 regra 4: nada aqui espera turno, alvo ou segunda rodada. A opção é
 * resolvida na hora e a tela fecha.
 *
 * Três das condições do pool vêm de §14, não de §6: sacar exige `quickSlots`,
 * e largar a mochila exige a sobrecarga acima de 0.90 que a seção pede. É
 * aqui que a escolha de mochila deixa de ser planilha e vira consequência.
 */

import type {
  AnomalyDef, AnomalyInstance, EncounterContext, EncounterOption,
  EncounterScreen, Inventory, PlayerTrace, Stimulus, TraceKey,
} from './types.ts';
import type { SanityState } from '../sanity/types.ts';
import { OPTIONS, PHANTOM_OPTIONS, OPTION_BY_ID } from './catalog.ts';
import { clamp, roll, type Rng } from './rng.ts';
import { resolveBladeDelay, invisivelPara } from './delay.ts';
import { ofereceDescarte, podeSacarNoEncontro } from './carry.ts';
import { avisouAsTresCamadas } from './stateMachine.ts';
import {
  ehRuptura, erroDeDistancia, permitePhantom,
} from './sanityLink.ts';

export const MIN_OPCOES = 3;
export const MAX_OPCOES = 5;

function opcao(id: string): EncounterOption {
  const o = OPTION_BY_ID.get(id);
  if (!o) throw new Error(`opção desconhecida: ${id}`);
  return o;
}

export const OPT_IMOVEL = () => opcao('OPT_IMOVEL');
export const OPT_CORRER = () => opcao('OPT_CORRER');
export const OPT_ARREMESSAR = () => opcao('OPT_ARREMESSAR');
export const OPT_CORTAR_PASSAGEM = () => opcao('OPT_CORTAR_PASSAGEM');
export const OPT_LARGAR_MOCHILA = () => opcao('OPT_LARGAR_MOCHILA');
export const OPT_TRANCAR = () => opcao('OPT_TRANCAR');
export const OPT_EMPURRAR = () => opcao('OPT_EMPURRAR');

export function temLamina(inv: Inventory): boolean {
  return inv.blades.some((b) => !b.sucata && b.durability > 0);
}

export function temArremessavel(inv: Inventory): boolean {
  return inv.throwables > 0;
}

/**
 * §14 — ter a lâmina não é o mesmo que alcançá-la. `quickSlots` é o "acesso
 * em encontro" da seção, e quem carrega sacola de pano tem zero: a arma está
 * no fundo, e a tela dura uma escolha só.
 */
export function podeCortar(inv: Inventory): boolean {
  return temLamina(inv) && podeSacarNoEncontro(inv);
}

export function podeArremessar(inv: Inventory): boolean {
  return temArremessavel(inv) && podeSacarNoEncontro(inv);
}

/**
 * §14 — "na tela de encontro, com sobrecarga acima de 0.90, aparece a opção".
 * Largar a mochila é o que a sobrecarga cobra, não um botão de sempre: quem
 * saiu leve não tem esse arrependimento para vender.
 */
export function podeLargarAMochila(inv: Inventory): boolean {
  return inv.backpackValue > 0 && ofereceDescarte(inv);
}

export function makePhantomOption(rng: Rng): EncounterOption {
  return rng.pick(PHANTOM_OPTIONS);
}

export function composeSceneText(def: AnomalyDef, rng: Rng): string {
  return rng.pick(def.encounterText);
}

export function buildEncounter(
  def: AnomalyDef,
  inv: Inventory,
  sanity: SanityState,
  rng: Rng,
  ctx: EncounterContext,
  inst?: AnomalyInstance,
): EncounterScreen {
  const pool: EncounterOption[] = [];

  pool.push(OPT_IMOVEL());                       // sempre disponível
  pool.push(OPT_CORRER());                       // sempre disponível
  if (podeArremessar(inv))     pool.push(OPT_ARREMESSAR());
  if (podeCortar(inv))         pool.push(OPT_CORTAR_PASSAGEM());
  if (podeLargarAMochila(inv)) pool.push(OPT_LARGAR_MOCHILA());
  if (ctx.hasLockableRoom)     pool.push(OPT_TRANCAR());
  if (!podeCortar(inv))        pool.push(OPT_EMPURRAR());

  // sanidade baixa injeta uma opção FALSA que parece boa
  if (permitePhantom(sanity.stage) && def.canBeFaked) {
    pool.push(makePhantomOption(rng));
  }

  const real = inst?.distance ?? 0;
  const screen: EncounterScreen = {
    text: composeSceneText(def, rng),
    options: trim(pool, MIN_OPCOES, MAX_OPCOES, rng),
    distanciaExibida: Math.max(0, real + erroDeDistancia(sanity.stage, rng)),
    semFuga: ehRuptura(sanity.stage),
  };

  // §12, última linha: em Ruptura o encontro é com o jogador. Sem fuga.
  if (screen.semFuga) {
    screen.options = screen.options.map((o) => ({ ...o, baseSuccess: 0 }));
  }
  return screen;
}

/**
 * §6: 3 a 5 opções. As duas sempre disponíveis e a fantasma nunca são
 * cortadas — a fantasma porque cortá-la a tornaria detectável por ausência,
 * que é o oposto do que §12 pede dela.
 */
export function trim(
  pool: readonly EncounterOption[],
  min: number,
  max: number,
  rng: Rng,
): EncounterOption[] {
  const fixas = pool.filter((o) => o.fantasma || o.id === 'OPT_IMOVEL' || o.id === 'OPT_CORRER');
  const resto = rng.shuffle(pool.filter((o) => !fixas.includes(o)));

  const alvo = clamp(min + rng.int(max - min + 1), Math.max(min, fixas.length), max);
  const out = [...fixas];
  for (const o of resto) {
    if (out.length >= alvo) break;
    out.push(o);
  }
  return rng.shuffle(out);
}

// ---------- resolução ----------

export interface OptionResolution {
  optionId: string;
  escapou: boolean;
  chance: number;
  outcome: string;
  texto: string;
  minutos: number;
  sanidade: number;
  ruido: number;
  atrasoTicks: number;
  perdeuMochila: boolean;
  armaPerdida: boolean;
  armaQuebrada: boolean;
  levaAContato: boolean;
}

function casaComModificador(quando: string, def: AnomalyDef): boolean {
  if (quando.startsWith('anomaly:')) return def.id === quando.slice(8);
  if (quando.startsWith('blind:')) {
    return def.blindTo.includes(quando.slice(6) as Stimulus);
  }
  if (quando.startsWith('sense:')) {
    const alvo = quando.slice(6) as Stimulus;
    return def.senses.some((s) => s.stimulus === alvo);
  }
  if (quando.startsWith('speed<=')) return def.speed <= Number(quando.slice(7));
  if (quando.startsWith('speed>=')) return def.speed >= Number(quando.slice(7));
  throw new Error(`modificador de opção não reconhecido: "${quando}"`);
}

export function chanceDaOpcao(opt: EncounterOption, def: AnomalyDef): number {
  if (opt.fantasma) return 0;
  let c = opt.baseSuccess;
  for (const m of opt.modifiers) {
    if (casaComModificador(m.quando, def)) c += m.successDelta;
  }
  return clamp(c, 0, 0.98);
}

export function resolveOption(
  opt: EncounterOption,
  def: AnomalyDef,
  inst: AnomalyInstance,
  inv: Inventory,
  trace: PlayerTrace,
  rng: Rng,
  semFuga = false,
): OptionResolution {
  const chance = semFuga ? 0 : chanceDaOpcao(opt, def);
  const escapou = rng.chance(chance);

  let atraso = opt.delayTicks ?? 0;
  let armaPerdida = false;
  let armaQuebrada = false;
  let outcome = escapou ? 'ESCAPE_LIMPO' : roll(opt.outcomes, rng);

  // §7 — quando a opção usa a lâmina, quem decide o desfecho é a tabela de lá
  if (opt.usaLamina) {
    const lamina = inv.blades.find((b) => !b.sucata && b.durability > 0);
    if (lamina) {
      const r = resolveBladeDelay(lamina, def, rng);
      atraso = r.ticks;
      outcome = r.outcome;
      armaPerdida = r.outcome === 'PERDEU_ARMA';
      armaQuebrada = r.bladeBroken;
      if (armaQuebrada) lamina.sucata = true;
    }
  }

  aplicarNoRastro(opt, trace);

  if (opt.distanceDelta) inst.distance += opt.distanceDelta;
  if (atraso > 0) inst.distance += atraso * 0.5;

  return {
    optionId: opt.id,
    escapou: outcome === 'ESCAPE_LIMPO',
    chance,
    outcome,
    texto: opt.texto,
    minutos: opt.timeCost,
    sanidade: -opt.sanityCost,
    ruido: opt.noiseGenerated,
    atrasoTicks: atraso,
    perdeuMochila: opt.perdeMochila === true,
    armaPerdida,
    armaQuebrada,
    levaAContato: outcome === 'CONTATO',
  };
}

function aplicarNoRastro(opt: EncounterOption, trace: PlayerTrace): void {
  for (const k of opt.traceZera ?? []) trace[k] = 0;
  for (const [k, v] of Object.entries(opt.traceDelta ?? {})) {
    const chave = k as TraceKey;
    trace[chave] = Math.max(0, trace[chave] + (v ?? 0));
  }
}

/**
 * §13 — o metal que o jogador carrega vira rastro. Uma lâmina que a anomalia
 * não enxerga (vidro-osso contra A05) não conta.
 */
export function metalCarregado(inv: Inventory, anomalyId: string): number {
  let total = 0;
  for (const b of inv.blades) {
    if (b.sucata) continue;
    if (invisivelPara(b, anomalyId)) continue;
    total += b.enrolada ? Math.round(b.metalNoise * 0.7) : b.metalNoise;
  }
  return total;
}

/** §0 regra 3, na porta do encontro: sem as três camadas, isto é um bug. */
export function podeAbrirEncontro(inst: AnomalyInstance): boolean {
  return avisouAsTresCamadas(inst);
}

export { OPTIONS, PHANTOM_OPTIONS };
