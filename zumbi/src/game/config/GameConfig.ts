/**
 * Constantes globais do jogo. Tudo que é "número mágico" compartilhado
 * entre sistemas mora aqui — mude aqui, muda no jogo inteiro.
 */

export const GAME_TITLE = 'Toque de Recolher';
export const GAME_VERSION = '0.2.0';
export const GAME_STAGE = 'Etapa 1 + 2';

/** Tamanho de um tile do mapa, em pixels de mundo. */
export const TILE = 64;

export const VIEW = {
  /**
   * Quanto do mundo aparece no lado MENOR da tela, em pixels de mundo.
   * O valor final é cssMenorLado * perCssPixel, limitado entre min e max:
   * celular (~390 css) vê ~610px de mundo (~9,5 tiles); tablet/PC vê até 900px.
   */
  perCssPixel: 1.56,
  minWorldShortSide: 580,
  maxWorldShortSide: 900,
  /** Limite de devicePixelRatio: acima de 2 o custo de GPU sobe muito e o ganho visual é mínimo. */
  maxDpr: 2,
} as const;

/**
 * Camadas de desenho (depth). Quanto maior, mais na frente.
 * Deixe espaço entre os números para encaixar coisas novas no futuro.
 */
export const DEPTH = {
  ground: 0,
  groundMarkings: 2,
  decal: 4,
  shadow: 8,
  floorProp: 10,
  object: 20,
  playerShadow: 28,
  playerLegs: 29,
  player: 30,
  wallShadow: 34,
  wall: 40,
  overhead: 50,
  roofShadow: 55,
  roof: 60,
  fx: 70,
  atmosphere: 80,
} as const;

/** Nomes das cenas (evita erro de digitação ao trocar de cena). */
export const SCENES = {
  boot: 'Boot',
  preload: 'Preload',
  title: 'Title',
  game: 'Game',
  hud: 'Hud',
} as const;
