/**
 * Números do MAPA (minimapa, mapa completo, explorado, marcadores).
 */
export const MAP_TUNING = {
  /** Célula do explorado (tiles): 4×4 tiles ≈ 5 m. */
  exploreCell: 4,
  /** Raio que o jogador "vê" para o mapa (px): de dia na rua, dentro de casa menos. */
  exploreRadius: 520,
  exploreIndoor: 260,
  /** De quanto em quanto tempo marca o explorado (s). */
  exploreEvery: 0.5,
  /** Pixels do mapa por tile na imagem gerada. */
  imagePxPerTile: 2,
  /** Minimapa: lado (px CSS) e quantos tiles mostra de lado. */
  miniSize: 112,
  miniTiles: 44,
  /** Nome de marcador: máximo de letras. */
  nameMax: 28,
  /** Tocar no mapa: raio (px de mundo) para pegar um marcador existente. */
  pickRadius: 260,
} as const;
