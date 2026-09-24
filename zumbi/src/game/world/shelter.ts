/**
 * Abrigo: o ponto está debaixo de um telhado? (dentro de uma construção do
 * mapa ou, depois, debaixo de uma cobertura construída pelo jogador).
 * Chuva não molha, vento não esfria e dentro de casa o ar é mais ameno.
 * Puro, sem Phaser.
 */
import type { BuildingData } from './MapTypes';
import type { WorldModel } from './WorldModel';

export function buildingAtPoint(model: WorldModel, x: number, y: number): BuildingData | null {
  for (const b of model.index.buildingsNear(x, y)) {
    const r = b.bounds;
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return b;
  }
  return null;
}

/** Algo extra que também cobre (telhados construídos): devolve true se cobre o ponto. */
export type ExtraCover = (x: number, y: number) => boolean;

export function isSheltered(model: WorldModel, x: number, y: number, extra?: ExtraCover): boolean {
  return buildingAtPoint(model, x, y) !== null || (extra?.(x, y) ?? false);
}
