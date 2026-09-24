/**
 * Esqueleto comum a todo setor da cidade (72 × 56 tiles):
 *
 *   x: 0–2 beco | 2–32 quarteirão | 32–34 calçada | 34–40 RUA | 40–42 calçada | 42–71 quarteirão | 71,5 cerca
 *   y: 0–2 beco | 2–24 quarteirão | 24–26 calçada | 26–32 AVENIDA | 32–34 calçada | 34–55 quarteirão | 55 cerca
 *
 * Como todo setor tem a avenida e a rua no mesmo lugar, elas continuam de um
 * setor para o outro e formam a malha da cidade. Os becos (norte e oeste de
 * cada setor) encostam nas cercas de fundo (sul e leste) do setor vizinho.
 */
export const SECTOR_W = 72;
export const SECTOR_H = 56;

export const AV_Y = 26;
export const ST_X = 34;
export const ROAD = 6;
export const SIDEWALK = 2;
export const ALLEY = 2;

/** Linha da cerca de fundo (sul) e lateral (leste) de cada setor. */
export const FENCE_S = 55;
export const FENCE_E = 71.5;

export type Front = 'n' | 's';

export interface BlockArea {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Lado que dá para a avenida (onde ficam as fachadas). */
  front: Front;
}

/** Os quatro quarteirões de um setor, em tiles locais. */
export const QUADRANTS: Record<'nw' | 'ne' | 'sw' | 'se', BlockArea> = {
  nw: { x0: ALLEY, y0: ALLEY, x1: ST_X - SIDEWALK, y1: AV_Y - SIDEWALK, front: 's' },
  ne: { x0: ST_X + ROAD + SIDEWALK, y0: ALLEY, x1: 71, y1: AV_Y - SIDEWALK, front: 's' },
  sw: { x0: ALLEY, y0: AV_Y + ROAD + SIDEWALK, x1: ST_X - SIDEWALK, y1: FENCE_S, front: 'n' },
  se: { x0: ST_X + ROAD + SIDEWALK, y0: AV_Y + ROAD + SIDEWALK, x1: 71, y1: FENCE_S, front: 'n' },
};
