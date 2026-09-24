/**
 * A cidade: uma grade de setores (72 × 56 tiles cada) ligados pela mesma
 * malha de avenidas, ruas e becos. O setor inicial (abrigo) fica no centro;
 * os outros recebem um tipo de zona e são gerados a partir das plantas.
 *
 * Tudo determinístico pela semente. Cada setor usa um gerador aleatório
 * próprio (semente + posição): mexer num setor não muda os outros.
 */
import { Random, hashString } from '../../core/Random';
import { MapBuilder } from '../MapBuilder';
import { Ground, type MapData } from '../MapTypes';
import { fillBlock, type BlockZone } from './SectorBlocks';
import { SectorBuilder } from './SectorBuilder';
import { AV_Y, QUADRANTS, ROAD, SECTOR_H, SECTOR_W, SIDEWALK, ST_X } from './SectorLayout';
import { buildBackFences, buildRoadSkeleton } from './SectorRoads';
import { buildStarterSector } from './StarterDistrict';

export interface CityOptions {
  seed: number;
  sectorsX: number;
  sectorsY: number;
}

export type SectorZone = 'starter' | BlockZone;

export interface SectorPlan {
  sx: number;
  sy: number;
  zone: SectorZone;
  name: string;
  id: string;
}

const DIRS: Record<string, string> = {
  '0,-1': 'Norte',
  '0,1': 'Sul',
  '1,0': 'Leste',
  '-1,0': 'Oeste',
  '1,-1': 'Nordeste',
  '-1,-1': 'Noroeste',
  '1,1': 'Sudeste',
  '-1,1': 'Sudoeste',
};

/** Decide o tipo de cada setor: comércio perto do centro, indústria e parques mais afastados. */
export function planCity(opts: CityOptions): SectorPlan[] {
  const rng = new Random(hashString(`plano:${opts.seed}`));
  const cx = Math.floor(opts.sectorsX / 2);
  const cy = Math.floor(opts.sectorsY / 2);
  const plans: SectorPlan[] = [];
  for (let sy = 0; sy < opts.sectorsY; sy++) {
    for (let sx = 0; sx < opts.sectorsX; sx++) {
      const ring = Math.max(Math.abs(sx - cx), Math.abs(sy - cy));
      let zone: SectorZone;
      if (ring === 0) zone = 'starter';
      else if (ring === 1)
        zone = rng.weighted([
          ['residential', 4],
          ['commercial', 4],
          ['park', 1.5],
          ['industrial', 1],
        ] as const);
      else
        zone = rng.weighted([
          ['residential', 4],
          ['industrial', 3.5],
          ['commercial', 1.5],
          ['park', 1],
        ] as const);
      plans.push({ sx, sy, zone, name: '', id: `s${sx}-${sy}` });
    }
  }
  // Garante pelo menos um setor de cada tipo quando a cidade tem espaço.
  const others = plans.filter((p) => p.zone !== 'starter');
  const required: BlockZone[] = ['commercial', 'industrial', 'park'];
  for (const z of required) {
    if (others.length < 4 || others.some((p) => p.zone === z)) continue;
    const counts = (zone: SectorZone) => others.filter((p) => p.zone === zone).length;
    // Só "doa" um setor de uma zona que tenha mais de um. Comércio vai para perto
    // do centro; indústria e parque, para longe.
    const donors = others.filter((p) => counts(p.zone) > 1).sort((a, b) => ring(a, cx, cy) - ring(b, cx, cy));
    const target = z === 'commercial' ? donors[0] : donors[donors.length - 1];
    if (target) target.zone = z;
  }
  // Nomes: residenciais numerados, os outros pela direção a partir do centro.
  let residentialN = 2;
  for (const p of plans) {
    const dx = Math.sign(p.sx - cx);
    const dy = Math.sign(p.sy - cy);
    const dir = DIRS[`${dx},${dy}`] ?? '';
    if (p.zone === 'starter') p.name = 'Zona Residencial · Setor 1';
    else if (p.zone === 'residential') p.name = `Zona Residencial · Setor ${residentialN++}`;
    else if (p.zone === 'commercial') p.name = `Zona Comercial ${dir}`.trim();
    else if (p.zone === 'industrial') p.name = `Zona Industrial ${dir}`.trim();
    else p.name = `Parque ${dir}`.trim();
  }
  return plans;
}

function ring(p: SectorPlan, cx: number, cy: number): number {
  return Math.max(Math.abs(p.sx - cx), Math.abs(p.sy - cy));
}

/** Mistura de quarteirões dentro de um setor (nem todo setor é 100% igual). */
function quadrantZones(zone: BlockZone, rng: Random): BlockZone[] {
  const mix: Record<BlockZone, BlockZone[]> = {
    residential: ['residential', 'residential', 'residential', rng.weighted([['residential', 6], ['commercial', 2], ['park', 2]] as const)],
    commercial: ['commercial', 'commercial', 'commercial', rng.weighted([['residential', 5], ['park', 2], ['commercial', 3]] as const)],
    industrial: ['industrial', 'industrial', 'industrial', rng.weighted([['industrial', 5], ['residential', 3], ['park', 1]] as const)],
    park: ['park', 'park', 'residential', 'residential'],
  };
  const list = [...mix[zone]];
  // embaralha (Fisher–Yates com o gerador do setor)
  for (let i = list.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}

export function buildCity(opts: CityOptions): MapData {
  const W = SECTOR_W * opts.sectorsX;
  const H = SECTOR_H * opts.sectorsY;
  const b = new MapBuilder('cidade', 'Cidade', W, H, opts.seed, Ground.Grass);

  for (const plan of planCity(opts)) {
    const rng = new Random(hashString(`${opts.seed}:${plan.sx}:${plan.sy}`));
    const sb = new SectorBuilder(b, plan.sx * SECTOR_W, plan.sy * SECTOR_H, plan.id, rng);
    buildRoadSkeleton(sb, plan.zone === 'starter' ? 'fixed' : 'varied');
    buildBackFences(sb);
    if (plan.zone === 'starter') {
      buildStarterSector(sb);
      continue;
    }
    sb.region(plan.id, plan.name, 0, 0, SECTOR_W, SECTOR_H);
    const zones = quadrantZones(plan.zone, rng);
    (['nw', 'ne', 'sw', 'se'] as const).forEach((q, i) => fillBlock(sb, QUADRANTS[q], zones[i]!, `${plan.id}-${q}`));
    streetLife(sb, plan.zone);
  }

  worldEdges(b, opts);
  return b.build();
}

/** Carros largados, cones e sujeira nas vias de um setor gerado. */
function streetLife(b: SectorBuilder, zone: BlockZone): void {
  const rng = b.rng;
  const cars: { x: number; y: number }[] = [];
  const free = (x: number, y: number) => cars.every((c) => Math.abs(c.x - x) > 3.6 || Math.abs(c.y - y) > 1.6);
  const avenueLanes = [AV_Y + 1.4, AV_Y + ROAD - 1.4];
  const n = zone === 'commercial' ? rng.int(3, 5) : rng.int(1, 4);
  for (let i = 0; i < n * 3 && cars.length < n; i++) {
    const x = rng.chance(0.5) ? rng.range(4, ST_X - 4) : rng.range(ST_X + ROAD + 4, SECTOR_W - 4);
    const y = rng.pick(avenueLanes) + rng.range(-0.3, 0.3);
    if (!free(x, y)) continue;
    cars.push({ x, y });
    b.prop(rng.chance(0.25) ? 'carWreck' : 'car', x, y, (rng.chance(0.5) ? 0 : 180) + rng.range(-12, 12));
  }
  const streetCars = rng.int(0, 2);
  for (let i = 0; i < streetCars; i++) {
    const y = rng.chance(0.5) ? rng.range(4, AV_Y - 5) : rng.range(AV_Y + ROAD + 5, SECTOR_H - 4);
    const x = ST_X + (rng.chance(0.5) ? 1.4 : ROAD - 1.4);
    b.prop(rng.chance(0.3) ? 'carWreck' : 'car', x, y, (rng.chance(0.5) ? 90 : -90) + rng.range(-10, 10));
  }
  if (rng.chance(0.4)) {
    const x = rng.range(6, SECTOR_W - 6);
    b.prop('cone', x, AV_Y + 2.8);
    b.prop('cone', x + 0.9, AV_Y + 3.3);
  }
  b.prop('trashBags', rng.range(3, ST_X - 4), AV_Y - SIDEWALK + 0.5, rng.range(0, 360));
  b.scatterDecals(['crack'], 12, 0, AV_Y, SECTOR_W, ROAD, [0.8, 1.3], [0.45, 0.8]);
  b.scatterDecals(['crack'], 8, ST_X, 0, ROAD, SECTOR_H, [0.8, 1.3], [0.45, 0.8]);
  b.scatterDecals(['paper', 'leaves'], 14, 0, AV_Y - SIDEWALK, SECTOR_W, ROAD + 2 * SIDEWALK, [0.7, 1.1], [0.6, 1]);
  b.scatterDecals(['paper', 'leaves'], 10, ST_X - SIDEWALK, 0, ROAD + 2 * SIDEWALK, SECTOR_H, [0.7, 1.1], [0.6, 1]);
  if (rng.chance(0.5)) b.scatterDecals(['blood', 'bloodTrail'], 2, 0, AV_Y, SECTOR_W, ROAD, [0.7, 1.1], [0.6, 0.85]);
}

/**
 * Bordas da cidade: cerca no oeste e no norte (sul e leste já têm as cercas de
 * fundo dos setores) e bloqueios onde as vias saem do mapa — a cidade parece
 * continuar além deles (as próximas regiões podem "abrir" essas saídas).
 */
function worldEdges(b: MapBuilder, opts: CityOptions): void {
  const W = SECTOR_W * opts.sectorsX;
  const H = SECTOR_H * opts.sectorsY;
  const rng = new Random(hashString(`bordas:${opts.seed}`));

  // Cercas oeste/norte com vão onde passam avenida e rua.
  for (let sy = 0; sy < opts.sectorsY; sy++) {
    const y0 = sy * SECTOR_H;
    b.wall(0.25, y0, 0.25, y0 + AV_Y - SIDEWALK, 'fence');
    b.wall(0.25, y0 + AV_Y + ROAD + SIDEWALK, 0.25, y0 + SECTOR_H, 'fence');
  }
  for (let sx = 0; sx < opts.sectorsX; sx++) {
    const x0 = sx * SECTOR_W;
    b.wall(x0, 0.25, x0 + ST_X - SIDEWALK, 0.25, 'fence');
    b.wall(x0 + ST_X + ROAD + SIDEWALK, 0.25, x0 + SECTOR_W, 0.25, 'fence');
  }

  // Avenidas bloqueadas: oeste com muretas e carros queimados, leste com ônibus atravessado.
  for (let sy = 0; sy < opts.sectorsY; sy++) {
    const a = sy * SECTOR_H + AV_Y;
    for (const dy of [1, 3, 5]) b.prop('concreteBarrier', 1.1, a + dy, 90);
    b.prop('carWreck', 3.6, a + 1.6, 105);
    b.prop('carWreck', 4.4, a + 4.3, 75);
    b.decal('debris', 6, a + 3);
    b.prop('bus', W - 2.2, a + 3, 90);
    b.prop('barricade', W - 5.6, a + 1.4, 80);
    b.prop('barricade', W - 5.8, a + 4.8, 100);
    b.decal('glass', W - 4.6, a + 3.2);
  }
  // Ruas bloqueadas: norte com muretas e uma van, sul com cavaletes e um carro.
  for (let sx = 0; sx < opts.sectorsX; sx++) {
    const s = sx * SECTOR_W + ST_X;
    for (const dx of [1, 3, 5]) b.prop('concreteBarrier', s + dx, 1.1, 0);
    b.prop('van', s + 3, 3.4, 8);
    for (const dx of [1.2, 3, 4.8]) b.prop('barricade', s + dx, H - 1.4, rng.range(-5, 5));
    b.prop('car', s + 1.6, H - 4, 70, 1);
    b.prop('cone', s + 3.8, H - 3.4);
    b.prop('cone', s + 4.6, H - 3.9);
  }
}
