/**
 * POPULAÇÃO inicial: quem estava onde quando tudo acabou. Gerada UMA vez
 * por partida (semente do mapa), depois só o save manda — ninguém nasce de
 * novo, ninguém aparece perto do jogador.
 *
 * - Dentro dos prédios: pelo tipo (casa tem moradores; mercado, clientes e
 *   caixas; oficina, mecânicos), espalhados pelos cômodos.
 * - Na rua: sozinhos ou em bandos pequenos, de todo tipo de gente.
 * - Alguns corpos antigos (já mortos de vez) pelas ruas.
 * - Nada num raio em volta do ponto de partida, nem no abrigo inicial.
 */
import { hashString, Random } from '../core/Random';
import { ZOMBIE_TUNING } from '../config/ZombieTuning';
import type { BuildingData, BuildingKind, MapData } from '../world/MapTypes';
import type { NavGrid } from '../world/nav/NavGrid';
import { ARCH_BY_BUILDING, ARCH_STREET, type ArchId } from './Archetypes';
import type { ZombieSpawn } from './ZombieFactory';

/** Zumbis por 100 tiles de área construída, por tipo de prédio. */
const PER_100_TILES: Record<BuildingKind, number> = {
  house: 1.25,
  store: 2.3,
  pharmacy: 1.9,
  restaurant: 2.5,
  clothing: 2.1,
  garage: 1.3,
  warehouse: 1.1,
  shelter: 0,
};
/** Na rua: por 100 tiles de chão livre fora dos prédios. */
const STREET_PER_100_TILES = 0.42;
/** Corpos antigos (fração da população de rua). */
const OLD_CORPSES = 0.12;

export interface PopulationSpawn extends ZombieSpawn {
  /** Já morto de vez (cenário). */
  corpse?: boolean;
}

export interface PopulationOptions {
  /** Multiplicador (dificuldade × opção). */
  population: number;
  collapseDays: number;
  /** Ninguém a menos deste raio daqui (ponto de partida, ou onde o jogador está num save antigo). */
  safe: { x: number; y: number; r?: number };
}

function inside(b: BuildingData, x: number, y: number): boolean {
  const r = b.bounds;
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/** Contagem com a média certa (parte inteira + sorteio da fração). */
function count(r: Random, mean: number): number {
  const base = Math.floor(mean);
  return base + (r.chance(mean - base) ? 1 : 0);
}

export function generatePopulation(map: MapData, nav: NavGrid, opts: PopulationOptions): PopulationSpawn[] {
  const r = new Random(hashString(`${map.seed}:populacao`));
  const out: PopulationSpawn[] = [];
  const safeR = opts.safe.r ?? ZOMBIE_TUNING.spawnSafeRadius;
  const tile = map.tileSize;
  let n = 0;
  const shelters = map.buildings.filter((b) => b.kind === 'shelter');
  const ok = (x: number, y: number) =>
    nav.isWalkableAt(x, y) && Math.hypot(x - opts.safe.x, y - opts.safe.y) > safeR && !shelters.some((b) => inside(b, x, y));
  const add = (arch: ArchId, x: number, y: number, corpse = false) => {
    const id = `z${n++}`;
    out.push({ id, seed: hashString(`${map.seed}:zumbi:${id}`), arch, x: Math.round(x), y: Math.round(y), collapseDays: opts.collapseDays, ...(corpse ? { corpse: true } : {}) });
  };

  // ---------------------------------------------------------------- prédios
  for (const b of map.buildings) {
    const weights = ARCH_BY_BUILDING[b.kind];
    if (!weights.length || !b.rooms.length) continue;
    const area = b.rooms.reduce((s, room) => s + (room.rect.w * room.rect.h) / (tile * tile), 0);
    const mean = (area / 100) * PER_100_TILES[b.kind] * opts.population;
    const k = count(r, mean * r.range(0.4, 1.6));
    for (let i = 0; i < k; i++) {
      const room = r.pick(b.rooms);
      // Algumas tentativas de achar chão livre no cômodo.
      for (let t = 0; t < 8; t++) {
        const x = room.rect.x + r.range(20, Math.max(21, room.rect.w - 20));
        const y = room.rect.y + r.range(20, Math.max(21, room.rect.h - 20));
        if (!ok(x, y)) continue;
        add(r.weighted(weights), x, y);
        break;
      }
    }
  }

  // ---------------------------------------------------------------- rua
  const w = map.widthTiles * tile;
  const h = map.heightTiles * tile;
  let open = 0;
  // Área livre fora dos prédios (amostragem).
  const samples = 4000;
  for (let i = 0; i < samples; i++) {
    const x = r.range(0, w);
    const y = r.range(0, h);
    if (nav.isWalkableAt(x, y) && !map.buildings.some((b) => inside(b, x, y))) open++;
  }
  const openTiles = (open / samples) * (w * h) / (tile * tile);
  let street = count(r, (openTiles / 100) * STREET_PER_100_TILES * opts.population);
  let guard = street * 30 + 200;
  while (street > 0 && guard-- > 0) {
    const cx = r.range(tile, w - tile);
    const cy = r.range(tile, h - tile);
    if (!ok(cx, cy) || map.buildings.some((b) => inside(b, cx, cy))) continue;
    // Bando: a maioria anda sozinha ou em dupla; às vezes um grupinho.
    const size = Math.min(street, r.weighted<number>([[1, 5], [2, 3], [3, 1.6], [4, 0.9], [6, 0.35]]));
    const corpse = r.chance(OLD_CORPSES);
    let placed = 0;
    for (let t = 0; t < size * 6 && placed < size; t++) {
      const x = cx + r.range(-90, 90);
      const y = cy + r.range(-90, 90);
      if (!ok(x, y) || map.buildings.some((b) => inside(b, x, y))) continue;
      add(r.weighted(ARCH_STREET), x, y, corpse && placed === 0);
      placed++;
    }
    street -= Math.max(1, placed);
  }
  return out;
}
