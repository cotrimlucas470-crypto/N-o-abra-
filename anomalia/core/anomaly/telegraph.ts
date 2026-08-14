/**
 * Telegraph — §5. Nenhuma anomalia aparece sem aviso. Nunca.
 *
 * `emitTelegraph` é o bloco de §5 sem alteração.
 *
 * O contrato de escrita da mesma seção virou `assertContratoDeTelegraph()`,
 * que roda nos testes: linha longa demais, adjetivo emocional ou nome da
 * anomalia no texto quebram o build. Contrato que não é verificado é sugestão.
 *
 * Uma nota sobre a contagem: §5 pede no máximo 12 palavras por linha, mas a
 * linha `direct` de A03 — que é do próprio documento, em §2 — tem 14. Os
 * quatro exemplos que §5 dá como aprovados são todos de uma ou duas frases
 * curtas, então a contagem aqui é por frase, e o limite de 12 vale para cada
 * uma. Com essa leitura a linha transcrita passa e nenhum dos exemplos muda
 * de veredito.
 *
 * §12 entra aqui: de Tenso para baixo, parte dos telegraphs é falsa. Um
 * telegraph falso é indistinguível de um verdadeiro na leitura — a única
 * forma de separar é a Checagem de Realidade do V7.
 */

import type {
  AnomalyDef, AnomalyState, TelegraphLayer,
} from './types.ts';
import type { SanityStage } from '../sanity/types.ts';
import type { Rng } from './rng.ts';
import { ANOMALIES } from './catalog.ts';
import { MENTIRA_POR_ESTAGIO } from './sanityLink.ts';

/**
 * §10 apaga a camada de áudio de quem tem MUT_SILENCIOSA, e §0 regra 3 diz
 * que o aviso é inegociável. As duas coisas só cabem juntas de um jeito: o
 * que a mutação tira é o canal, não o aviso. Sem o arrastar, o que chega no
 * lugar é a camada vaga — pior de ler, e é esse o ponto da mutação.
 */
function pick(items: readonly string[], reserva: readonly string[], rng: Rng): string | null {
  if (items.length > 0) return rng.pick(items);
  if (reserva.length > 0) return rng.pick(reserva);
  return null;
}

export function emitTelegraph(
  def: AnomalyDef,
  state: AnomalyState,
  rng: Rng,
): string | null {
  const t = def.telegraphs;
  switch (state) {
    case 'ALERTA': return pick(t.ambient, t.direct, rng);
    case 'BUSCA':  return pick(t.audio, t.ambient, rng);
    case 'RASTRO':
    case 'CACA':   return pick(t.direct, t.ambient, rng);
    default:       return null;
  }
}

/** Qual das três camadas cada estado emite. */
export function camadaDe(state: AnomalyState): TelegraphLayer | null {
  switch (state) {
    case 'ALERTA': return 'ambient';
    case 'BUSCA':  return 'audio';
    case 'RASTRO':
    case 'CACA':   return 'direct';
    default:       return null;
  }
}

// ---------- §12: a sanidade mente sobre o aviso ----------

export interface TelegraphEmitido {
  texto: string;
  camada: TelegraphLayer;
  /** o jogador não vê este campo. É o que a Checagem de Realidade descobre. */
  falso: boolean;
}

/**
 * O que o jogador lê. Um telegraph falso vem de uma anomalia que não está
 * ali; o texto sai do mesmo catálogo e tem a mesma cara.
 */
export function telegraphParaOJogador(
  def: AnomalyDef,
  state: AnomalyState,
  stage: SanityStage,
  rng: Rng,
): TelegraphEmitido | null {
  const camada = camadaDe(state);
  if (!camada) return null;

  if (rng.chance(MENTIRA_POR_ESTAGIO[stage])) {
    const outra = rng.pick(ANOMALIES.filter((a) => a.id !== def.id && a.canBeFaked));
    const texto = emitTelegraph(outra, state, rng);
    if (texto) return { texto, camada, falso: true };
  }

  const texto = emitTelegraph(def, state, rng);
  if (!texto) return null;
  return { texto, camada, falso: false };
}

// ---------- o contrato de §5, como verificação ----------

/** §5: "Sem adjetivo emocional". A lista é o que a proibição quer dizer. */
const ADJETIVOS_PROIBIDOS: readonly string[] = [
  'assustador', 'assustadora', 'horrível', 'horrivel', 'horrendo',
  'aterrorizante', 'medonho', 'medonha', 'macabro', 'macabra',
  'sinistro', 'sinistra', 'terrível', 'terrivel', 'pavoroso', 'pavorosa',
  'hediondo', 'hedionda', 'monstruoso', 'monstruosa', 'apavorante',
  'horripilante', 'tenebroso', 'tenebrosa', 'lúgubre', 'lugubre',
  'grotesco', 'grotesca', 'repulsivo', 'repulsiva', 'aterrador',
];

/** §5: "Nunca nomeia a anomalia". */
const PALAVRAS_QUE_NOMEIAM: readonly string[] = [
  'anomalia', 'criatura', 'monstro', 'bicho-papão', 'entidade', 'demônio',
];

export const LIMITE_DE_PALAVRAS = 12;

function frases(linha: string): string[] {
  return linha.split(/[.!?]+/).map((f) => f.trim()).filter((f) => f.length > 0);
}

function palavras(frase: string): string[] {
  return frase.split(/\s+/).filter((p) => p.length > 0);
}

export function violacoesDoContrato(def: AnomalyDef): string[] {
  const erros: string[] = [];
  const linhas: [TelegraphLayer, string][] = [
    ...def.telegraphs.ambient.map((l) => ['ambient', l] as [TelegraphLayer, string]),
    ...def.telegraphs.audio.map((l) => ['audio', l] as [TelegraphLayer, string]),
    ...def.telegraphs.direct.map((l) => ['direct', l] as [TelegraphLayer, string]),
  ];

  const nomeEmMinusculas = def.name.toLowerCase();

  for (const [camada, linha] of linhas) {
    const baixa = linha.toLowerCase();

    for (const frase of frases(linha)) {
      const n = palavras(frase).length;
      if (n > LIMITE_DE_PALAVRAS) {
        erros.push(`${def.id}/${camada}: frase de ${n} palavras — "${frase}"`);
      }
    }

    for (const adj of ADJETIVOS_PROIBIDOS) {
      if (baixa.includes(adj)) {
        erros.push(`${def.id}/${camada}: adjetivo emocional "${adj}"`);
      }
    }

    for (const nome of PALAVRAS_QUE_NOMEIAM) {
      if (baixa.includes(nome)) {
        erros.push(`${def.id}/${camada}: nomeia a coisa ("${nome}")`);
      }
    }

    if (baixa.includes(nomeEmMinusculas)) {
      erros.push(`${def.id}/${camada}: usa o nome interno "${def.name}"`);
    }
  }

  return erros;
}

export function assertContratoDeTelegraph(): void {
  const erros = ANOMALIES.flatMap(violacoesDoContrato);
  if (erros.length > 0) {
    throw new Error(`Contrato de telegraph (§5) violado:\n  ${erros.join('\n  ')}`);
  }
}
