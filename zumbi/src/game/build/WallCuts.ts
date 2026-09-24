/**
 * Vãos abertos em paredes e cercas do MAPA (puro). A parede do mapa é um
 * retângulo comprido; derrubar abre um trecho (≈ 1 tile) no ponto escolhido.
 * Guardamos só os trechos cortados (intervalos ao longo do comprimento) e
 * a parede vira os pedaços que sobraram. Sobra estreita demais some junto
 * (nada de "fiapo" de parede).
 */
import type { Rect, WallPiece } from '../world/MapTypes';

export type Interval = [number, number];

/** Sobra menor que isto some junto com o corte (px). */
export const MIN_REMNANT = 18;
/** Largura do vão aberto (px): passa uma pessoa com folga. */
export const CUT_WIDTH = 64;

export function wallLength(w: Rect): number {
  return Math.max(w.w, w.h);
}

/** Posição (px, ao longo da parede) do ponto mais perto de (x, y). */
export function alongOf(w: Rect, x: number, y: number): number {
  const horiz = w.w >= w.h;
  const t = horiz ? x - w.x : y - w.y;
  return Math.max(0, Math.min(wallLength(w), t));
}

/** Junta um corte centrado em `at`; devolve a lista nova (ordenada, sem sobreposição). */
export function addCut(cuts: readonly Interval[], at: number, len: number, width = CUT_WIDTH): Interval[] {
  let a = Math.max(0, at - width / 2);
  let b = Math.min(len, at + width / 2);
  // Encostado na ponta: abre do tamanho certo a partir dela.
  if (b - a < width) {
    if (a === 0) b = Math.min(len, width);
    else a = Math.max(0, len - width);
  }
  const all: Interval[] = [...cuts.map((c): Interval => [c[0], c[1]]), [a, b] as Interval].sort((p, q) => p[0] - q[0]);
  const merged: Interval[] = [];
  for (const c of all) {
    const last = merged[merged.length - 1];
    // Sobra estreita entre dois cortes também some.
    if (last && c[0] - last[1] < MIN_REMNANT) last[1] = Math.max(last[1], c[1]);
    else merged.push([c[0], c[1]]);
  }
  const first = merged[0];
  if (first && first[0] < MIN_REMNANT) first[0] = 0;
  const end = merged[merged.length - 1];
  if (end && len - end[1] < MIN_REMNANT) end[1] = len;
  return merged;
}

/** O que sobrou da parede depois dos cortes. */
export function piecesOf(w: WallPiece, cuts: readonly Interval[] | undefined): Rect[] {
  if (!cuts || !cuts.length) return [{ x: w.x, y: w.y, w: w.w, h: w.h }];
  const horiz = w.w >= w.h;
  const len = wallLength(w);
  const out: Rect[] = [];
  let pos = 0;
  const push = (a: number, b: number) => {
    if (b - a <= 0.5) return;
    out.push(horiz ? { x: w.x + a, y: w.y, w: b - a, h: w.h } : { x: w.x, y: w.y + a, w: w.w, h: b - a });
  };
  for (const [a, b] of cuts) {
    push(pos, a);
    pos = Math.max(pos, b);
  }
  push(pos, len);
  return out;
}

/** Id estável da parede do mapa (centro), como o das janelas. */
export function wallId(w: WallPiece): string {
  return `parede@${Math.round(w.x + w.w / 2)},${Math.round(w.y + w.h / 2)}`;
}
