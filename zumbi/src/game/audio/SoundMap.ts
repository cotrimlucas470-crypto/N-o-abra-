/**
 * Que som toca para cada coisa do jogo (puro, testável): barulho do mundo
 * (`world:noise`), chão debaixo do pé, arma na mão, recipiente aberto.
 */
import type { NoiseKind } from '../sim/Noise';
import type { GunClass } from './recipes/guns';
import type { Gait, Surface } from './recipes/steps';
import type { Weight } from './recipes/combat';
import { Ground as G } from '../world/MapTypes';

/** Barulhos cujo som sai de outro lugar (com mais detalhe): passo, golpe e tiro. */
const DIRECT = new Set(['passos', 'golpe', 'tiro']);

export interface NoiseSound {
  id: string;
  /** Repetir (passos na escada). */
  repeat?: number;
  every?: number;
  rate?: number;
}

/** Som de um barulho do mundo (null = nada, ou já tocado por outro caminho). */
export function soundForNoise(source: string, _kind: NoiseKind | undefined, radius: number, hint?: string): NoiseSound | null {
  if (hint) return { id: hint };
  const s = source.toLowerCase();
  if (DIRECT.has(s)) return null;
  const table: [string, NoiseSound][] = [
    ['maçaneta', { id: 'porta.trancada' }],
    ['porta empurrada', { id: 'porta.empurrada' }],
    ['batida na porta', { id: radius >= 500 ? 'porta.batidaMetal' : 'porta.batida' }],
    ['porta arrombada', { id: 'porta.arrombar' }],
    ['vidro da porta', { id: 'vidro.janela' }],
    ['batida na barricada', { id: 'porta.barricada' }],
    ['batida no vidro', { id: 'vidro.batida' }],
    ['vidro do carro', { id: 'vidro.carro' }],
    ['vidro de carro', { id: 'vidro.carro' }],
    ['janela quebrada', { id: 'vidro.janela' }],
    ['vidro', { id: 'vidro.janela' }],
    ['porta-malas', { id: 'carro.portaMalas' }],
    ['porta de carro', { id: 'carro.porta' }],
    ['portão', { id: 'porta.portao' }],
    ['porta', { id: 'porta.fechar' }],
    ['batida no carro', { id: 'acerto.lataria' }],
    ['lataria', { id: 'acerto.lataria' }],
    ['batida de carro', { id: 'carro.batida' }],
    ['pneu estourando', { id: 'carro.pneu' }],
    ['motor de arranque', { id: 'carro.arranque' }],
    ['partida do gerador', { id: 'carro.partida', rate: 1.35 }],
    ['buzina', { id: 'carro.buzina' }],
    ['atropelo', { id: 'carro.atropelo' }],
    ['arrombamento', { id: 'porta.arrombar' }],
    ['martelo', { id: 'obra.martelo' }],
    ['machado', { id: 'obra.machado' }],
    ['picareta', { id: 'obra.picareta' }],
    ['tábuas', { id: 'obra.tabuas' }],
    ['demoli', { id: 'obra.demolicao' }],
    [' caiu', { id: 'obra.demolicao' }],
    ['desmonte', { id: 'obra.desmonte' }],
    ['tombo', { id: 'corpo.queda' }],
    ['queda', { id: 'corpo.queda' }],
    ['escada', { id: 'passo.escada.passo', repeat: 3, every: 0.22 }],
    ['alarme', { id: 'carro.alarme' }],
    ['trovão', { id: 'clima.trovao' }],
    // 'gemido': a voz sai pelo gancho do zumbi (cada um com a sua), não pelo barulho.
    // 'gerador' (motor ligado, pulsos a cada poucos segundos): o som é o laço ao vivo.
  ];
  for (const [k, v] of table) if (s.includes(k)) return v;
  // Motor ligado (pulso de barulho a cada ~1 s) vira o ronco ao vivo, não um som solto.
  // Recipiente aberto: o som sai do `ui:container-open` (não repete aqui).
  return null;
}

/** Abrindo um recipiente, pelo nome/tipo. */
export function soundForContainer(name: string): string | null {
  const s = name.toLowerCase();
  if (/gaveta|criado|c[oô]moda|escrivaninha|mesa/.test(s)) return 'objeto.gaveta';
  if (/geladeira|freezer|frigobar/.test(s)) return 'objeto.geladeira';
  if (/arm[aá]rio|guarda|estante|cristaleira|prateleira|balc[aã]o|gabinete/.test(s)) return 'objeto.armario';
  if (/porta-malas/.test(s)) return 'carro.portaMalas';
  if (/caixa|saco|lixo|mochila|bolsa|sacola|pilha|entulho|corpo|cad[aá]ver/.test(s)) return 'objeto.revirar';
  return 'objeto.revirar';
}

/** Superfície de passo pelo tipo de chão, neve (0..1 e cm) e água. */
export function surfaceFor(ground: number, o: { outdoor: boolean; snow: number; snowCm: number; wet: number; upstairs: boolean }): Surface {
  if (o.outdoor && o.snow > 0.35) return o.snowCm > 8 ? 'neveFunda' : 'neve';
  const wet = o.outdoor && o.wet > 0.35;
  switch (ground) {
    case G.Grass:
    case G.GrassDark:
      return wet && o.wet > 0.8 ? 'agua' : 'grama';
    case G.Dirt:
      return wet && o.wet > 0.7 ? 'agua' : 'terra';
    case G.Gravel:
      return 'cascalho';
    case G.Asphalt:
    case G.Parking:
      return wet ? 'molhado' : 'asfalto';
    case G.Sidewalk:
    case G.Concrete:
      return wet ? 'molhado' : 'calcada';
    case G.WoodFloor:
      return 'madeira';
    case G.TileFloor:
      return 'ceramica';
    case G.Carpet:
      return 'carpete';
    case G.GarageFloor:
      return 'garagem';
    default:
      return o.upstairs ? 'madeira' : 'calcada';
  }
}

/** Andar pela força do passo que o jogador emite (0 furtivo, 1 andando, 2 correndo). */
export function gaitFor(loudness: number): Gait {
  return loudness >= 2 ? 'corrida' : loudness < 1 ? 'furtivo' : 'passo';
}

/** Classe de som da arma de fogo (pelo desenho e calibre do catálogo). */
export function gunClassFor(iconKind: string | undefined, caliber: string): GunClass {
  switch (iconKind) {
    case 'revolver':
      return 'revolver';
    case 'shotgun':
      return 'espingarda';
    case 'double':
      return 'dupla';
    case 'smg':
      return 'smg';
    case 'rifle':
      return caliber === '22' ? 'rifle22' : 'rifle308';
    default:
      return caliber === '40' ? 'pistola40' : 'pistola9';
  }
}

/** Peso do golpe pelo peso da arma (kg). */
export function swingWeight(kg: number | undefined): Weight {
  if (!kg || kg < 0.6) return 'leve';
  return kg < 2 ? 'medio' : 'pesado';
}
