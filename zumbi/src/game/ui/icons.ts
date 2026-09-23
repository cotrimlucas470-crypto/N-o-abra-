/**
 * Ícones vetoriais da interface, desenhados com Graphics (nítidos em
 * qualquer tamanho, zero arquivos). Centro em (x, y), tamanho ~ r.
 */
import type Phaser from 'phaser';

type G = Phaser.GameObjects.Graphics;

export function iconPause(g: G, x: number, y: number, r: number, color: number, alpha = 1): void {
  const w = r * 0.32;
  const h = r * 1.1;
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x - r * 0.42, y - h / 2, w, h, w * 0.3);
  g.fillRoundedRect(x + r * 0.1, y - h / 2, w, h, w * 0.3);
}

export function iconFullscreen(g: G, x: number, y: number, r: number, color: number, active: boolean, alpha = 1): void {
  const s = r * 0.62;
  const l = r * 0.36;
  g.lineStyle(Math.max(2, r * 0.16), color, alpha);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    // Fora da tela cheia: cantos nas bordas, abrindo para fora.
    // Em tela cheia: cantos recolhidos perto do centro (= "sair").
    const cx = x + sx * (active ? s * 0.35 : s);
    const cy = y + sy * (active ? s * 0.35 : s);
    const dir = active ? 1 : -1;
    g.beginPath();
    g.moveTo(cx + dir * sx * l, cy);
    g.lineTo(cx, cy);
    g.lineTo(cx, cy + dir * sy * l);
    g.strokePath();
  }
}

/** Bonequinho correndo (botão Correr). */
export function iconRun(g: G, x: number, y: number, r: number, color: number, alpha = 1): void {
  const u = r / 10;
  g.fillStyle(color, alpha);
  g.fillCircle(x + 2.4 * u, y - 6.4 * u, 1.9 * u);
  g.lineStyle(2.1 * u, color, alpha);
  const path = (pts: [number, number][]) => {
    g.beginPath();
    g.moveTo(x + pts[0]![0] * u, y + pts[0]![1] * u);
    for (let i = 1; i < pts.length; i++) g.lineTo(x + pts[i]![0] * u, y + pts[i]![1] * u);
    g.strokePath();
  };
  path([[1.2, -3.6], [-1.2, 1.8]]); // tronco
  path([[-1.2, 1.8], [1.8, 4.2], [0.8, 8]]); // perna da frente
  path([[-1.2, 1.8], [-3.4, 4.8], [-6.4, 5.2]]); // perna de trás
  path([[1, -2.8], [4.4, -0.6], [6.2, -2.4]]); // braço da frente
  path([[0.4, -2.6], [-2.8, -1.6], [-4.8, 1]]); // braço de trás
}

export function iconCrosshair(g: G, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.lineStyle(Math.max(1.5, r * 0.12), color, alpha);
  g.strokeCircle(x, y, r * 0.5);
  const a = r * 0.25;
  const b = r * 0.85;
  g.lineBetween(x - b, y, x - a, y);
  g.lineBetween(x + a, y, x + b, y);
  g.lineBetween(x, y - b, x, y - a);
  g.lineBetween(x, y + a, x, y + b);
}
