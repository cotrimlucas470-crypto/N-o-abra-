/**
 * Geometria das portas — pura, sem Phaser. A mesma conta alimenta a
 * colisão, as grades de navegação/visão, o desenho e os testes.
 */
import type { DoorPlacement, Rect } from './MapTypes';

/** Retângulo do vão (fechado = sólido deste tamanho). */
export function doorGapRect(d: DoorPlacement): Rect {
  return d.vertical
    ? { x: d.x - d.thickness / 2, y: d.y - d.length / 2, w: d.thickness, h: d.length }
    : { x: d.x - d.length / 2, y: d.y - d.thickness / 2, w: d.length, h: d.thickness };
}

export interface DoorLeaf {
  /** Dobradiça (px). */
  hx: number;
  hy: number;
  length: number;
  /** Ângulo (graus, horário) com a porta fechada e aberta. */
  closedAngle: number;
  openAngle: number;
}

/**
 * Folhas de uma porta de abrir (simples = 1, dupla = 2). Portão de enrolar
 * não tem folha: sobe inteiro.
 *
 * Parede horizontal: a folha fechada corre em x; aberta, gira 90° para o lado
 * de `swing` (+1 = para +y). Parede vertical: fechada corre em y; aberta gira
 * para +x (swing +1) ou -x.
 */
export function doorLeaves(d: DoorPlacement): DoorLeaf[] {
  if (d.style === 'rolling') return [];
  const s = d.swing;
  const half = d.length / 2;
  if (!d.vertical) {
    const x0 = d.x - half;
    const x1 = d.x + half;
    if (d.style === 'single') return [{ hx: x0, hy: d.y, length: d.length, closedAngle: 0, openAngle: s * 90 }];
    return [
      { hx: x0, hy: d.y, length: half, closedAngle: 0, openAngle: s * 90 },
      { hx: x1, hy: d.y, length: half, closedAngle: 180, openAngle: 180 - s * 90 },
    ];
  }
  const y0 = d.y - half;
  const y1 = d.y + half;
  if (d.style === 'single') return [{ hx: d.x, hy: y0, length: d.length, closedAngle: 90, openAngle: 90 - s * 90 }];
  return [
    { hx: d.x, hy: y0, length: half, closedAngle: 90, openAngle: 90 - s * 90 },
    { hx: d.x, hy: y1, length: half, closedAngle: -90, openAngle: -90 + s * 90 },
  ];
}

/** Ponta livre de uma folha num ângulo (graus). */
export function leafTip(l: DoorLeaf, angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: l.hx + Math.cos(a) * l.length, y: l.hy + Math.sin(a) * l.length };
}

/** Distância de um ponto até um retângulo (0 se dentro). */
export function distToRect(px: number, py: number, r: Rect): number {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** Nome da porta para a interface. */
export function doorLabel(d: DoorPlacement): string {
  if (d.style === 'rolling') return 'portão';
  if (d.material === 'glass') return 'porta de vidro';
  return d.style === 'double' ? 'porta dupla' : 'porta';
}
