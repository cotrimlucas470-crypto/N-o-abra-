/**
 * Que som toca para cada coisa do jogo (puro, testável): barulho do mundo
 * (`world:noise`), chão debaixo do pé, arma na mão, recipiente aberto.
 */
import type { NoiseKind } from '../sim/Noise';
import type { GunClass } from './recipes/guns';
import type { Gait, Surface } from './recipes/steps';
import type { Weight } from './recipes/combat';
import { Ground as G } from '../world/MapTypes';
import { RECIPES } from '../crafting/Recipes';

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

/** Som que se repete enquanto uma ação demorada acontece (ids do catálogo e intervalo em s). */
export interface ActionSound {
  ids: readonly string[];
  every: readonly [number, number];
  gain: number;
}

const ACTION_SOUNDS: Record<string, ActionSound> = {
  tratar: { ids: ['acao.pano', 'acao.rasgar'], every: [1.1, 2], gain: 0.8 },
  rasgar: { ids: ['acao.rasgar'], every: [0.8, 1.3], gain: 0.9 },
  costura: { ids: ['acao.pano'], every: [1.2, 2], gain: 0.7 },
  remendar: { ids: ['acao.pano'], every: [1.2, 2], gain: 0.7 },
  vestir: { ids: ['acao.pano'], every: [0.8, 1.4], gain: 0.8 },
  tirar: { ids: ['acao.pano'], every: [0.8, 1.4], gain: 0.8 },
  ler: { ids: ['acao.pagina'], every: [3, 6], gain: 0.8 },
  lavar: { ids: ['acao.agua'], every: [1, 1.8], gain: 0.8 },
  higiene: { ids: ['acao.agua'], every: [1.2, 2.2], gain: 0.7 },
  beberTorneira: { ids: ['acao.agua'], every: [1, 1.6], gain: 0.8 },
  encherAgua: { ids: ['acao.agua'], every: [0.9, 1.4], gain: 0.9 },
  juntarChuva: { ids: ['acao.agua'], every: [2, 3.5], gain: 0.5 },
  purificar: { ids: ['acao.agua', 'acao.cozinhar'], every: [1.5, 2.5], gain: 0.6 },
  cozinhar: { ids: ['acao.cozinhar'], every: [1.2, 1.8], gain: 0.8 },
  sifao: { ids: ['acao.combustivel'], every: [1.2, 1.8], gain: 0.8 },
  abastecer: { ids: ['acao.combustivel'], every: [1.2, 1.8], gain: 0.8 },
  'abastecer-gerador': { ids: ['acao.combustivel'], every: [1.2, 1.8], gain: 0.8 },
  afiar: { ids: ['acao.afiar'], every: [0.55, 0.85], gain: 0.8 },
  consertar: { ids: ['acao.ferramenta'], every: [1, 2], gain: 0.8 },
  bateria: { ids: ['acao.ferramenta'], every: [1, 1.8], gain: 0.8 },
  pneu: { ids: ['acao.ferramenta'], every: [0.9, 1.6], gain: 0.9 },
  motor: { ids: ['acao.ferramenta'], every: [0.9, 1.6], gain: 0.9 },
  vela: { ids: ['acao.ferramenta'], every: [1, 1.8], gain: 0.8 },
  oleo: { ids: ['acao.ferramenta', 'acao.combustivel'], every: [1.2, 2], gain: 0.7 },
  'remendo-pneu': { ids: ['acao.ferramenta'], every: [1, 1.8], gain: 0.8 },
  'ligacao-direta': { ids: ['acao.ferramenta'], every: [1.2, 2.2], gain: 0.6 },
  extensao: { ids: ['acao.ferramenta'], every: [1.4, 2.4], gain: 0.6 },
  'recolher-gerador': { ids: ['acao.ferramenta'], every: [1.4, 2.4], gain: 0.6 },
  desmontar: { ids: ['acao.ferramenta', 'obra.desmonte'], every: [1.2, 2], gain: 0.7 },
  cortar: { ids: ['obra.machado'], every: [1.3, 1.8], gain: 0.7 },
  quebrar: { ids: ['obra.picareta'], every: [1.3, 1.9], gain: 0.7 },
  derrubar: { ids: ['obra.demolicao', 'acerto.madeira'], every: [2, 3], gain: 0.6 },
  derrubarParede: { ids: ['obra.picareta', 'obra.demolicao'], every: [1.6, 2.6], gain: 0.6 },
  pregarTabuas: { ids: ['obra.martelo'], every: [1.6, 2.4], gain: 0.7 },
  arrancarTabuas: { ids: ['obra.tabuas', 'acao.ferramenta'], every: [1.3, 2], gain: 0.7 },
  plantar: { ids: ['acao.cavar'], every: [1.2, 1.8], gain: 0.8 },
  cacos: { ids: ['objeto.revirar', 'vidro.batida'], every: [1, 1.6], gain: 0.4 },
  acenderFogo: { ids: ['acao.fosforo'], every: [3, 5], gain: 0.9 },
  pular: { ids: ['acao.escalar'], every: [99, 99], gain: 1 },
  'pular-andar': { ids: ['acao.escalar'], every: [99, 99], gain: 1 },
  arrombar: { ids: ['acao.ferramenta', 'porta.trancada'], every: [0.9, 1.5], gain: 0.8 },
};

/** Fabricar: o som pela habilidade da receita (serrar/martelar, cozinhar, costurar...). */
const SKILL_SOUNDS: Record<string, ActionSound> = {
  carpintaria: { ids: ['obra.martelo', 'acao.ferramenta', 'obra.tabuas'], every: [1.3, 2.2], gain: 0.55 },
  culinaria: { ids: ['acao.cozinhar'], every: [1.2, 1.8], gain: 0.8 },
  medicina: { ids: ['acao.pano', 'acao.rasgar'], every: [1.2, 2], gain: 0.7 },
  costura: { ids: ['acao.pano', 'acao.rasgar'], every: [1.2, 2], gain: 0.7 },
  mecanica: { ids: ['acao.ferramenta'], every: [1, 1.8], gain: 0.8 },
  armas: { ids: ['acao.ferramenta'], every: [1.2, 2], gain: 0.6 },
};
const CRAFT_DEFAULT: ActionSound = { ids: ['objeto.revirar', 'acao.ferramenta'], every: [1.4, 2.4], gain: 0.6 };

export function actionSound(id: string | null | undefined): ActionSound | null {
  if (!id) return null;
  if (id.startsWith('fabricar:')) {
    const r = RECIPES.find((x) => x.id === id.slice(9));
    return (r?.skill && SKILL_SOUNDS[r.skill.id]) || CRAFT_DEFAULT;
  }
  return ACTION_SOUNDS[id] ?? null;
}
