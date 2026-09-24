/**
 * Ruas, calçadas, becos e mobiliário urbano comuns a todo setor.
 * (Extraído do setor inicial: todos os setores compartilham a mesma malha.)
 */
import { Ground } from '../MapTypes';
import type { SectorBuilder } from './SectorBuilder';
import { ALLEY, AV_Y, FENCE_E, FENCE_S, ROAD, SECTOR_H, SECTOR_W, SIDEWALK, ST_X } from './SectorLayout';

const W = SECTOR_W;
const H = SECTOR_H;

/**
 * `furniture`: 'fixed' repete o desenho do setor inicial (postes e árvores nos
 * mesmos pontos); 'varied' sorteia as árvores e o lixo para cada setor ter cara própria.
 */
export function buildRoadSkeleton(b: SectorBuilder, furniture: 'fixed' | 'varied'): void {
  const rng = b.rng;
  // becos primeiro (asfalto velho); calçadas e vias passam por cima nos cruzamentos
  b.fill(0, 0, ALLEY, H, Ground.Asphalt);
  b.fill(0, 0, W, ALLEY, Ground.Asphalt);
  b.fill(0, AV_Y - SIDEWALK, W, SIDEWALK, Ground.Sidewalk);
  b.fill(0, AV_Y + ROAD, W, SIDEWALK, Ground.Sidewalk);
  b.fill(ST_X - SIDEWALK, 0, SIDEWALK, H, Ground.Sidewalk);
  b.fill(ST_X + ROAD, 0, SIDEWALK, H, Ground.Sidewalk);
  b.fill(0, AV_Y, W, ROAD, Ground.Asphalt);
  b.fill(ST_X, 0, ROAD, H, Ground.Asphalt);

  const cy = AV_Y + ROAD / 2;
  const cx = ST_X + ROAD / 2;
  const westEnd = ST_X - 2.2;
  const eastStart = ST_X + ROAD + 2.2;
  const northEnd = AV_Y - 2.2;
  const southStart = AV_Y + ROAD + 2.2;

  // Avenida: faixa dupla amarela + tracejado das pistas
  for (const [x1, x2] of [[0, westEnd], [eastStart, W]] as const) {
    b.marking('lane-double', x1, cy, x2, cy, 14);
    b.marking('lane-dash', x1, cy - 1.5, x2, cy - 1.5, 6);
    b.marking('lane-dash', x1, cy + 1.5, x2, cy + 1.5, 6);
  }
  // Rua
  for (const [y1, y2] of [[0, northEnd], [southStart, H]] as const) {
    b.marking('lane-double', cx, y1, cx, y2, 14);
    b.marking('lane-dash', cx - 1.5, y1, cx - 1.5, y2, 6);
    b.marking('lane-dash', cx + 1.5, y1, cx + 1.5, y2, 6);
  }
  // Faixas de pedestres
  b.marking('crosswalk', ST_X - 1, AV_Y, ST_X - 1, AV_Y + ROAD, 96);
  b.marking('crosswalk', ST_X + ROAD + 1, AV_Y, ST_X + ROAD + 1, AV_Y + ROAD, 96);
  b.marking('crosswalk', ST_X, AV_Y - 1, ST_X + ROAD, AV_Y - 1, 96);
  b.marking('crosswalk', ST_X, AV_Y + ROAD + 1, ST_X + ROAD, AV_Y + ROAD + 1, 96);

  // Meio-fio
  const curb = 7;
  for (const [x1, x2] of [[0, ST_X - 2], [ST_X + ROAD + 2, W]] as const) {
    b.marking('curb', x1, AV_Y - 0.05, x2, AV_Y - 0.05, curb);
    b.marking('curb', x1, AV_Y + ROAD + 0.05, x2, AV_Y + ROAD + 0.05, curb);
  }
  for (const [y1, y2] of [[0, AV_Y - 2], [AV_Y + ROAD + 2, H]] as const) {
    b.marking('curb', ST_X - 0.05, y1, ST_X - 0.05, y2, curb);
    b.marking('curb', ST_X + ROAD + 0.05, y1, ST_X + ROAD + 0.05, y2, curb);
  }

  // Bueiros e tampas
  b.decal('manhole', 20, cy + 0.2, 0);
  b.decal('manhole', 52, cy - 0.3, 0);
  b.decal('manhole', cx + 0.3, 12, 0);
  b.decal('manhole', cx - 0.2, 46, 0);
  for (const x of [6, 17, 28, 47, 58, 68]) {
    b.decal('drain', x, AV_Y + 0.22, 0);
    b.decal('drain', x + 3, AV_Y + ROAD - 0.22, 180);
  }
  for (const y of [5, 16, 38, 50]) {
    b.decal('drain', ST_X + 0.22, y, 90);
    b.decal('drain', ST_X + ROAD - 0.22, y + 3, -90);
  }

  // Postes (o braço aponta para a pista)
  for (const x of [4, 14, 24, 46, 56, 66]) {
    b.prop('lampPost', x, AV_Y - 1.4 + 0.5625, 90);
    b.prop('lampPost', x + 5, AV_Y + ROAD + 1.4 - 0.5625, -90);
  }
  for (const y of [5, 15, 42, 52]) {
    b.prop('lampPost', ST_X - 1.4 + 0.5625, y, 0);
    b.prop('lampPost', ST_X + ROAD + 1.4 - 0.5625, y + 5, 180);
  }

  // Árvores nas calçadas (em "berços" de terra)
  const northTrees = furniture === 'fixed' ? [9, 19, 29.5, 51, 61] : pickSpots(rng, [9, 19, 29.5, 51, 61, 44, 69], 4);
  const southTrees = furniture === 'fixed' ? [3, 27, 52, 66] : pickSpots(rng, [3, 12, 27, 52, 60, 66], 3);
  for (const x of northTrees) {
    b.decal('treePit', x, AV_Y - 1, 0);
    b.prop('treeLarge', x, AV_Y - 1);
  }
  for (const x of southTrees) {
    b.decal('treePit', x, AV_Y + ROAD + 1, 0);
    b.prop('treeSmall', x, AV_Y + ROAD + 1);
  }
  b.prop('hydrant', 31.2, AV_Y - 0.6);
  b.prop('hydrant', 42.8, AV_Y + ROAD + 0.6);
  b.prop('trashCan', 16.4, AV_Y - 1.6);
  b.prop('trashCan', 48.6, AV_Y + ROAD + 1.6);

  // Sujeira nos becos
  b.scatterDecals(['crack', 'oil', 'paper'], 6, 0, ALLEY, ALLEY, H - ALLEY - 2, [0.5, 0.8], [0.4, 0.8]);
  b.scatterDecals(['crack', 'oil', 'paper'], 6, ALLEY, 0, W - ALLEY - 2, ALLEY, [0.5, 0.8], [0.4, 0.8]);
}

/** Cercas de fundo (sul) e lateral (leste): dão para os becos dos setores vizinhos. */
export function buildBackFences(b: SectorBuilder): void {
  b.wall(ALLEY, FENCE_S, ST_X - SIDEWALK, FENCE_S, 'fence');
  b.wall(ST_X + ROAD + SIDEWALK, FENCE_S, W, FENCE_S, 'fence');
  b.wall(FENCE_E, ALLEY, FENCE_E, AV_Y - SIDEWALK, 'fence');
  b.wall(FENCE_E, AV_Y + ROAD + SIDEWALK, FENCE_E, FENCE_S, 'fence');
}

function pickSpots(rng: { next(): number }, spots: number[], n: number): number[] {
  const pool = [...spots];
  const out: number[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]!);
  return out;
}
