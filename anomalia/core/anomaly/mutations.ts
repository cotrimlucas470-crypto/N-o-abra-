/**
 * Mutações — §10. A mesma coisa, pior.
 *
 * §10 escreve os patches como texto: `"+6"`, `"x2"`, `"+30%"`, `"REMOVER"`,
 * `"+LUZ"`, `"1.0"`. Isso é bom para ler e ruim para aplicar sem inventar
 * regra, então o interpretador aqui reconhece um conjunto fechado de chaves e
 * **falha** em qualquer outra. Uma mutação nova com chave que ninguém sabe
 * aplicar quebra o build em vez de virar no-op silencioso no jogo.
 *
 * Entrada: a partir do dia 12, 18% por instância, +3% por dia, teto de 45%.
 */

import type {
  AnomalyDef, AnomalyInstance, MutationDef, Stimulus,
} from './types.ts';
import { MUTATION_BY_ID, MUTATION_ENTRADA } from './catalog.ts';
import { clamp, type Rng } from './rng.ts';

export function chanceDeMutacao(day: number): number {
  const { diaInicial, chanceInicial, chancePorDia, chanceMaxima } = MUTATION_ENTRADA;
  if (day < diaInicial) return 0;
  return Math.min(chanceMaxima, chanceInicial + chancePorDia * (day - diaInicial));
}

function comoNumero(v: string | number): number {
  return typeof v === 'number' ? v : Number(v);
}

/** `"+6"`, `"-1"`, `"x2"`, `"+30%"`, `"1.0"` — as formas que §10 usa. */
function aplicarValor(atual: number, patch: string | number): number {
  if (typeof patch === 'number') return patch;
  const t = patch.trim();
  if (t.startsWith('x')) return atual * Number(t.slice(1));
  if (t.endsWith('%')) {
    const pct = Number(t.slice(0, -1));
    return atual * (1 + pct / 100);
  }
  if (t.startsWith('+') || t.startsWith('-')) return atual + Number(t);
  return Number(t);
}

export interface MutacaoAplicada {
  def: AnomalyDef;
  spawnCount: number;
  burstSpeed: number | null;
  hints: string[];
}

export function aplicarMutacoes(
  base: AnomalyDef,
  ids: readonly string[],
): MutacaoAplicada {
  let def: AnomalyDef = {
    ...base,
    senses: base.senses.map((s) => ({ ...s })),
    blindTo: [...base.blindTo],
    telegraphs: {
      ambient: [...base.telegraphs.ambient],
      audio: [...base.telegraphs.audio],
      direct: [...base.telegraphs.direct],
    },
  };

  let spawnCount = base.spawnCount ?? 1;
  let burstSpeed: number | null = null;
  const hints: string[] = [];

  for (const id of ids) {
    const mut = MUTATION_BY_ID.get(id);
    if (!mut) throw new Error(`mutação desconhecida: ${id}`);
    hints.push(mut.hint);

    for (const [chave, valor] of Object.entries(mut.patch)) {
      switch (chave) {
        case 'telegraphs.audio':
          if (valor !== 'REMOVER') throw new Error(`${id}: só REMOVER em telegraphs.audio`);
          def.telegraphs.audio = [];
          break;

        case 'sanityOnSight':
          def.sanityOnSight = aplicarValor(def.sanityOnSight, valor);
          break;

        case 'sanityOnBlock':
          def.sanityOnBlock = aplicarValor(def.sanityOnBlock, valor);
          break;

        case 'spawnCount':
          spawnCount = comoNumero(valor);
          break;

        case 'speed':
          def.speed = clamp(aplicarValor(def.speed, valor), 1, 5) as AnomalyDef['speed'];
          break;

        case 'burstSpeed':
          burstSpeed = comoNumero(valor);
          break;

        case 'persistence':
          def.persistence = Math.round(aplicarValor(def.persistence, valor));
          break;

        case 'range':
          def.senses = def.senses.map((s) => ({
            ...s, range: clamp(aplicarValor(s.range, valor), 1, 40),
          }));
          break;

        case 'blindTo': {
          const texto = String(valor);
          if (!texto.startsWith('+')) throw new Error(`${id}: só "+ESTIMULO" em blindTo`);
          const estimulo = texto.slice(1) as Stimulus;
          if (!def.blindTo.includes(estimulo)) def.blindTo.push(estimulo);
          break;
        }

        default: {
          // `senses.<ESTIMULO>.<campo>` — a forma que MUT_CEGA usa
          const m = /^senses\.([A-Z]+)\.(weight|threshold|range|decay)$/.exec(chave);
          if (!m) throw new Error(`§10: chave de patch não reconhecida "${chave}" em ${id}`);
          const estimulo = m[1] as Stimulus;
          const campo = m[2] as 'weight' | 'threshold' | 'range' | 'decay';
          const alvo = def.senses.find((s) => s.stimulus === estimulo);
          if (alvo) alvo[campo] = aplicarValor(alvo[campo], valor);
          break;
        }
      }
    }
  }

  // MUT_CEGA pode ter posto LUZ em blindTo; um sentido cego não pode continuar
  // na lista de sentidos, senão o catálogo passa a se contradizer.
  def = { ...def, senses: def.senses.filter((s) => !def.blindTo.includes(s.stimulus)) };

  return { def, spawnCount, burstSpeed, hints };
}

/** Sorteia mutações para uma instância nova, respeitando o pool da anomalia. */
export function sortearMutacoes(
  def: AnomalyDef,
  day: number,
  rng: Rng,
): string[] {
  if (def.mutationPool.length === 0) return [];
  if (!rng.chance(chanceDeMutacao(day))) return [];
  return [rng.pick(def.mutationPool)];
}

export function mutacoesDaInstancia(inst: AnomalyInstance): readonly MutationDef[] {
  return inst.mutacoes.flatMap((id) => {
    const m = MUTATION_BY_ID.get(id);
    return m ? [m] : [];
  });
}
