/**
 * ARMA NA MÃO e EQUIPAMENTO VESTIDO, vistos de cima (procedural).
 *
 * - Arma/ferramenta: desenhada deitada apontando para +x, com a pega (onde a
 *   mão segura) em `grip`. Tamanho em px de mundo; a textura sai em escala
 *   HELD_RES para ficar nítida com zoom.
 * - Capacete/boné/gorro e colete: desenhados no mesmo quadro de 64 px do
 *   tronco (olhando para +x), então vão por cima dele com a mesma posição,
 *   rotação e escala.
 */
import type { IconSpec, ItemDef } from '../../items/ItemTypes';
import { makeCanvas, shade } from './canvas';

type Ctx = CanvasRenderingContext2D;

export const HELD_RES = 2;
/** Arma na mão desenhada 35% maior que o tamanho-base: lê bem na tela do celular (espingarda ~1,4× os ombros). */
export const HELD_DISPLAY = 1.35;

/** Pose do tronco com a arma: duas mãos na arma longa, braços estendidos na pistola. */
export type HeldPose = 'long' | 'pistol' | 'melee';

export interface HeldSpec {
  /** Comprimento (px de mundo). */
  len: number;
  /** Onde a mão segura (px a partir da traseira). */
  grip: number;
  /** Largura do desenho (px de mundo). */
  h: number;
  pose: HeldPose;
  draw(ctx: Ctx, s: HeldSpec, c: IconSpec): void;
}

// ------------------------------------------------------------------ pincéis

const STEEL = '#8e949c';
const DARK = '#26282c';

function bar(ctx: Ctx, x0: number, x1: number, r0: number, r1: number, fill: string, edge = shade(fill, -0.45)): void {
  ctx.beginPath();
  ctx.moveTo(x0, -r0);
  ctx.lineTo(x1, -r1);
  ctx.lineTo(x1, r1);
  ctx.lineTo(x0, r0);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = edge;
  ctx.stroke();
  // Brilho de cima (volume).
  ctx.strokeStyle = shade(fill, 0.35);
  ctx.lineWidth = Math.max(0.35, Math.min(r0, r1) * 0.35);
  ctx.beginPath();
  ctx.moveTo(x0 + 0.5, -Math.min(r0, r1) * 0.35);
  ctx.lineTo(x1 - 0.5, -Math.min(r0, r1) * 0.35);
  ctx.stroke();
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = shade(fill, -0.45);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);
}

function grain(ctx: Ctx, x0: number, x1: number, r: number, color: string): void {
  ctx.strokeStyle = shade(color, -0.22);
  ctx.lineWidth = 0.35;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x0 + 1, i * r * 0.45);
    ctx.bezierCurveTo((x0 + x1) / 2, i * r * 0.45 + 0.6, (x0 + x1) / 2, i * r * 0.45 - 0.6, x1 - 1, i * r * 0.4);
    ctx.stroke();
  }
}

function blade(ctx: Ctx, x0: number, x1: number, back: number, edge: number, color = '#c9ccd2'): void {
  const g = ctx.createLinearGradient(0, -back, 0, edge);
  g.addColorStop(0, shade(color, -0.25));
  g.addColorStop(0.55, shade(color, 0.15));
  g.addColorStop(1, '#f4f6f8');
  ctx.beginPath();
  ctx.moveTo(x0, -back);
  ctx.lineTo(x1 - 3, -back * 0.8);
  ctx.lineTo(x1, 0);
  ctx.quadraticCurveTo(x1 - 4, edge, x0, edge);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(color, -0.5);
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

// ------------------------------------------------------------------ armas de fogo

function stock(ctx: Ctx, x0: number, x1: number, color: string): void {
  ctx.beginPath();
  ctx.moveTo(x0, -3.6);
  ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.4, -3.1, x1, -2.2);
  ctx.lineTo(x1, 2.2);
  ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.4, 3.1, x0, 3.6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = shade(color, -0.5);
  ctx.lineWidth = 0.6;
  ctx.stroke();
  grain(ctx, x0, x1, 2.6, color);
  // Soleira de borracha.
  rect(ctx, x0 - 0.6, -3.4, 1.2, 6.8, '#1a1a1a');
}

const GUNS: Record<string, Omit<HeldSpec, 'draw'> & { draw(ctx: Ctx, s: HeldSpec, c: IconSpec): void }> = {
  pistol: {
    len: 22, grip: 5, h: 8, pose: 'pistol',
    draw(ctx) {
      rect(ctx, 0, -3, 8, 6, '#1f2023'); // cabo (polímero)
      bar(ctx, 1, 21, 2.1, 2.1, '#34373c'); // ferrolho
      ctx.strokeStyle = '#1a1b1e';
      ctx.lineWidth = 0.4;
      for (let x = 2; x < 6; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x, -2);
        ctx.lineTo(x, 2);
        ctx.stroke();
      }
      rect(ctx, 19.5, -0.5, 1.5, 1, '#111'); // alça de mira
      rect(ctx, 21, -0.8, 1, 1.6, '#0c0c0c'); // boca
    },
  },
  revolver: {
    len: 25, grip: 4, h: 9, pose: 'pistol',
    draw(ctx) {
      bar(ctx, 0, 7, 2.6, 2.2, '#6a4630'); // cabo de madeira
      grain(ctx, 0, 7, 2.2, '#6a4630');
      rect(ctx, 6, -2.2, 5, 4.4, '#3a3d42'); // armação
      ctx.beginPath();
      ctx.arc(12, 0, 3.6, 0, Math.PI * 2); // tambor
      ctx.fillStyle = '#4a4e55';
      ctx.fill();
      ctx.strokeStyle = '#1c1e21';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(12 + Math.cos(a) * 2.1, Math.sin(a) * 2.1, 0.7, 0, Math.PI * 2);
        ctx.fillStyle = '#202225';
        ctx.fill();
      }
      bar(ctx, 15, 25, 1.3, 1.2, '#50545b'); // cano
      rect(ctx, 23.5, -0.4, 1.2, 0.8, '#111');
      rect(ctx, 4.5, -0.7, 2, 1.4, '#222'); // cão
    },
  },
  shotgun: {
    len: 60, grip: 21, h: 10, pose: 'long',
    draw(ctx) {
      stock(ctx, 0, 19, '#7a4f2e');
      bar(ctx, 19, 30, 2.4, 2.2, '#2e3034'); // caixa
      bar(ctx, 30, 60, 1.3, 1.2, '#4a4e55'); // cano
      bar(ctx, 34, 47, 2.4, 2.2, '#6d4529'); // telha (pump)
      ctx.strokeStyle = '#3e2716';
      ctx.lineWidth = 0.5;
      for (let x = 36; x < 46; x += 1.6) {
        ctx.beginPath();
        ctx.moveTo(x, -2);
        ctx.lineTo(x, 2);
        ctx.stroke();
      }
      rect(ctx, 58.8, -0.5, 1.2, 1, '#caa84a'); // massa de mira
    },
  },
  double: {
    len: 58, grip: 20, h: 10, pose: 'long',
    draw(ctx) {
      stock(ctx, 0, 18, '#8a5a34');
      bar(ctx, 18, 27, 2.8, 2.6, '#6a6e76'); // báscula gravada
      ctx.strokeStyle = '#9aa0a8';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.arc(22.5, 0, 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.translate(0, -1.4);
      bar(ctx, 27, 58, 1.2, 1.1, '#3a3d42');
      ctx.restore();
      ctx.save();
      ctx.translate(0, 1.4);
      bar(ctx, 27, 58, 1.2, 1.1, '#3a3d42');
      ctx.restore();
      bar(ctx, 28, 40, 2.9, 2.7, '#7a4f2e'); // telha
    },
  },
  rifle: {
    len: 64, grip: 24, h: 10, pose: 'long',
    draw(ctx, _s, c) {
      stock(ctx, 0, 22, c.c ?? '#7a4f2e');
      bar(ctx, 22, 34, 2.2, 2, '#2e3034');
      bar(ctx, 30, 48, 2.5, 2.2, shade(c.c ?? '#7a4f2e', -0.05));
      bar(ctx, 34, 64, 1.1, 0.9, '#43474d');
      rect(ctx, 25, -0.6, 3, 1.2, '#15161a'); // ferrolho
      if (c.c2 === 'scope') {
        bar(ctx, 23, 41, 1.9, 1.9, '#1d1f22');
        ctx.fillStyle = '#6fa0c8';
        ctx.fillRect(40.5, -1.4, 0.8, 2.8);
        ctx.fillRect(22.8, -1.2, 0.6, 2.4);
      }
    },
  },
  smg: {
    len: 36, grip: 13, h: 10, pose: 'long',
    draw(ctx) {
      ctx.strokeStyle = '#1e1f22';
      ctx.lineWidth = 0.9;
      ctx.strokeRect(0.5, -2.2, 8, 4.4); // coronha de arame
      bar(ctx, 8, 27, 3, 2.8, '#2a2c30');
      rect(ctx, 11, -0.8, 6, 1.6, '#17181b'); // janela de ejeção
      bar(ctx, 27, 36, 1.5, 1.4, '#3c3f45'); // cano com capa
      ctx.fillStyle = '#111';
      for (let x = 28; x < 35; x += 2) ctx.fillRect(x, -1.4, 0.8, 0.6);
    },
  },
};

// ------------------------------------------------------------------ armas brancas e ferramentas

const MELEE: Record<string, Omit<HeldSpec, 'pose'>> = {
  kitchen: {
    len: 27, grip: 5, h: 7,
    draw(ctx) {
      bar(ctx, 0, 10, 1.7, 1.8, '#1f1f1f');
      ctx.fillStyle = '#cfd3d8';
      for (const x of [2.5, 5.5, 8.5]) ctx.fillRect(x - 0.4, -0.4, 0.8, 0.8);
      rect(ctx, 10, -2, 1.2, 4, '#9aa0a6');
      blade(ctx, 11, 27, 2.2, 1.4);
    },
  },
  hunting: {
    len: 27, grip: 5, h: 8,
    draw(ctx) {
      bar(ctx, 0, 10, 2, 2, '#5a3a22');
      grain(ctx, 0, 10, 2, '#5a3a22');
      rect(ctx, 10, -2.8, 1.4, 5.6, '#7d838a');
      blade(ctx, 11.4, 27, 2.6, 1.8, '#b8bec6');
      ctx.strokeStyle = '#4c5156';
      ctx.lineWidth = 0.4;
      for (let x = 13; x < 19; x += 1.2) {
        ctx.beginPath();
        ctx.moveTo(x, -2.6);
        ctx.lineTo(x + 0.6, -2.1);
        ctx.stroke();
      }
    },
  },
  folding: {
    len: 19, grip: 4, h: 6,
    draw(ctx) {
      bar(ctx, 0, 9, 1.8, 1.6, '#a8302a');
      blade(ctx, 9, 19, 1.6, 1.1);
    },
  },
  machete: {
    len: 42, grip: 5, h: 10,
    draw(ctx) {
      bar(ctx, 0, 10, 2, 2.1, '#262626');
      blade(ctx, 10, 42, 2.6, 3.4, '#b0b6be');
      ctx.strokeStyle = '#6a7078';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(11, -1.8);
      ctx.lineTo(38, -1.4);
      ctx.stroke();
    },
  },
  stoneknife: {
    len: 19, grip: 5, h: 6,
    draw(ctx) {
      bar(ctx, 0, 10, 1.6, 1.6, '#7a5a3a');
      ctx.strokeStyle = '#c8b27a';
      ctx.lineWidth = 0.6;
      for (let x = 7; x < 10; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x, -1.8);
        ctx.lineTo(x + 0.5, 1.8);
        ctx.stroke();
      }
      blade(ctx, 10, 19, 1.8, 1.8, '#7c7f86');
    },
  },
  bat: {
    len: 46, grip: 6, h: 9,
    draw(ctx, _s, c) {
      const col = c.c ?? '#b8864a';
      bar(ctx, 1.5, 46, 1.4, 3.4, col);
      grain(ctx, 12, 45, 2.6, col);
      rect(ctx, 2, -1.6, 10, 3.2, '#2a2a2a'); // fita
      ctx.beginPath();
      ctx.arc(1.2, 0, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = shade(col, -0.2);
      ctx.fill();
    },
  },
  batnails: {
    len: 46, grip: 6, h: 12,
    draw(ctx, s, c) {
      MELEE.bat!.draw(ctx, s, c);
      ctx.strokeStyle = '#b8bcc2';
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 8; i++) {
        const x = 26 + i * 2.4;
        const side = i % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x, side * 2.4);
        ctx.lineTo(x + 0.8, side * 5.4);
        ctx.stroke();
      }
    },
  },
  pipe: {
    len: 40, grip: 6, h: 8,
    draw(ctx) {
      bar(ctx, 0, 40, 2.1, 2.1, '#8a9096');
      rect(ctx, 35, -3, 5, 6, '#6d737a'); // luva de encanamento
      ctx.fillStyle = 'rgba(140,70,30,0.6)';
      for (const [x, y] of [[9, 0.8], [18, -1], [27, 1.1], [31, -0.4]] as const) {
        ctx.beginPath();
        ctx.arc(x, y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  rebar: {
    len: 46, grip: 6, h: 6,
    draw(ctx) {
      bar(ctx, 0, 46, 1.5, 1.5, '#6a5a4a');
      ctx.strokeStyle = '#4a3a2c';
      ctx.lineWidth = 0.5;
      for (let x = 2; x < 45; x += 2.2) {
        ctx.beginPath();
        ctx.moveTo(x, -1.5);
        ctx.lineTo(x + 1, 1.5);
        ctx.stroke();
      }
    },
  },
  baton: {
    len: 32, grip: 5, h: 8,
    draw(ctx) {
      bar(ctx, 0, 32, 1.8, 1.6, '#232323');
      rect(ctx, 8, 1.6, 2, 3.4, '#1a1a1a'); // pega lateral
    },
  },
  cue: {
    len: 58, grip: 9, h: 6,
    draw(ctx) {
      bar(ctx, 0, 20, 1.9, 1.5, '#3a2618');
      bar(ctx, 20, 58, 1.5, 0.8, '#d6b07a');
      rect(ctx, 57, -0.8, 1.2, 1.6, '#e8e8e8');
    },
  },
  broom: {
    len: 48, grip: 8, h: 6,
    draw(ctx) {
      bar(ctx, 0, 48, 1.2, 1.2, '#c8a06a');
      grain(ctx, 2, 46, 0.9, '#c8a06a');
    },
  },
  spear: {
    len: 66, grip: 22, h: 7,
    draw(ctx) {
      bar(ctx, 0, 54, 1.3, 1.2, '#a8784a');
      ctx.strokeStyle = '#d8c88a';
      ctx.lineWidth = 0.6;
      for (let x = 50; x < 55; x += 0.9) {
        ctx.beginPath();
        ctx.moveTo(x, -1.6);
        ctx.lineTo(x + 0.4, 1.6);
        ctx.stroke();
      }
      blade(ctx, 53, 66, 1.8, 1.8);
    },
  },
  woodspear: {
    len: 62, grip: 22, h: 6,
    draw(ctx) {
      bar(ctx, 0, 54, 1.3, 1.2, '#a8784a');
      ctx.beginPath();
      ctx.moveTo(54, -1.2);
      ctx.lineTo(62, 0);
      ctx.lineTo(54, 1.2);
      ctx.closePath();
      ctx.fillStyle = '#e0c49a';
      ctx.fill();
    },
  },
  plank: {
    len: 46, grip: 6, h: 12,
    draw(ctx) {
      rect(ctx, 0, -3, 46, 6, '#b38652');
      grain(ctx, 1, 45, 2.6, '#b38652');
      ctx.strokeStyle = '#b8bcc2';
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * 2.6;
        const side = i % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x, side * 3);
        ctx.lineTo(x + 0.6, side * 5.6);
        ctx.stroke();
      }
    },
  },
  hammer: {
    len: 27, grip: 5, h: 12,
    draw(ctx) {
      bar(ctx, 0, 23, 1.4, 1.3, '#9a6a3a');
      rect(ctx, 22, -5, 4, 10, '#4a4e55'); // cabeça atravessada
      ctx.fillStyle = '#35383d';
      ctx.fillRect(22.5, 4, 3, 2.4); // unha
    },
  },
  stonehammer: {
    len: 27, grip: 5, h: 12,
    draw(ctx) {
      bar(ctx, 0, 24, 1.4, 1.3, '#7a5a3a');
      ctx.beginPath();
      ctx.ellipse(24, 0, 3.4, 5.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#7c7f86';
      ctx.fill();
      ctx.strokeStyle = '#c8b27a';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(21, -1.6);
      ctx.lineTo(27, 1.6);
      ctx.stroke();
    },
  },
  sledge: {
    len: 46, grip: 7, h: 14,
    draw(ctx) {
      bar(ctx, 0, 40, 1.8, 1.8, '#9a6a3a');
      rect(ctx, 38, -6.5, 8, 13, '#3a3d42');
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(38.5, -6, 7, 2);
    },
  },
  axe: {
    len: 42, grip: 6, h: 16,
    draw(ctx) {
      bar(ctx, 0, 40, 1.6, 1.5, '#a0703e');
      grain(ctx, 2, 38, 1.2, '#a0703e');
      ctx.beginPath(); // lâmina para um lado
      ctx.moveTo(35, -1.5);
      ctx.lineTo(41, -1.5);
      ctx.lineTo(43, 7.5);
      ctx.quadraticCurveTo(38, 9, 34, 7);
      ctx.closePath();
      ctx.fillStyle = '#7d838a';
      ctx.fill();
      ctx.strokeStyle = '#e8ecef';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(34.2, 7);
      ctx.quadraticCurveTo(38, 9, 43, 7.5);
      ctx.stroke();
      rect(ctx, 36, -3.4, 4, 2, '#5d636a'); // olho/costas
    },
  },
  hatchet: {
    len: 30, grip: 5, h: 12,
    draw(ctx) {
      bar(ctx, 0, 28, 1.4, 1.3, '#a0703e');
      ctx.beginPath();
      ctx.moveTo(24, -1.3);
      ctx.lineTo(29, -1.3);
      ctx.lineTo(30, 5.5);
      ctx.quadraticCurveTo(26, 6.5, 23.5, 5);
      ctx.closePath();
      ctx.fillStyle = '#7d838a';
      ctx.fill();
      ctx.strokeStyle = '#e8ecef';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    },
  },
  stoneaxe: {
    len: 34, grip: 6, h: 12,
    draw(ctx) {
      bar(ctx, 0, 32, 1.5, 1.4, '#7a5a3a');
      ctx.beginPath();
      ctx.moveTo(27, -1.5);
      ctx.lineTo(32, -1.5);
      ctx.lineTo(33, 6);
      ctx.lineTo(26, 5);
      ctx.closePath();
      ctx.fillStyle = '#6e7178';
      ctx.fill();
    },
  },
  crowbar: {
    len: 40, grip: 12, h: 10,
    draw(ctx) {
      bar(ctx, 2, 36, 1.4, 1.4, '#2e3a55');
      ctx.strokeStyle = '#2e3a55';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(36, 0);
      ctx.quadraticCurveTo(41, 0, 40, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2.5, 0);
      ctx.lineTo(0, -1.6);
      ctx.stroke();
    },
  },
  wrench: {
    len: 25, grip: 5, h: 10,
    draw(ctx) {
      bar(ctx, 0, 19, 1.4, 1.6, '#9aa0a8');
      ctx.fillStyle = '#80868e';
      ctx.fillRect(18, -4.2, 6, 8.4);
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.clearRect(21, -1.6, 4, 3.2); // boca aberta
    },
  },
  lug: {
    len: 30, grip: 5, h: 12,
    draw(ctx) {
      bar(ctx, 0, 28, 1.4, 1.4, '#5a5f66');
      rect(ctx, 26, -5.5, 4, 11, '#4a4e55'); // soquete atravessado
    },
  },
  screwdriver: {
    len: 21, grip: 4, h: 6,
    draw(ctx) {
      bar(ctx, 0, 9, 2, 1.7, '#d8a82a');
      bar(ctx, 9, 21, 0.6, 0.5, STEEL);
    },
  },
  boxcutter: {
    len: 15, grip: 4, h: 6,
    draw(ctx) {
      bar(ctx, 0, 11, 1.8, 1.6, '#e8c82a');
      blade(ctx, 11, 15, 1, 0.8);
    },
  },
  shovel: {
    len: 58, grip: 9, h: 14,
    draw(ctx) {
      bar(ctx, 2, 46, 1.4, 1.4, '#a0703e');
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1;
      ctx.strokeRect(0, -2.6, 3, 5.2); // pega em D
      ctx.beginPath();
      ctx.moveTo(45, -5);
      ctx.lineTo(55, -5);
      ctx.quadraticCurveTo(59, 0, 55, 5);
      ctx.lineTo(45, 5);
      ctx.closePath();
      ctx.fillStyle = '#7d838a';
      ctx.fill();
      ctx.strokeStyle = '#4a4e55';
      ctx.stroke();
    },
  },
  hoe: {
    len: 54, grip: 9, h: 14,
    draw(ctx) {
      bar(ctx, 0, 52, 1.3, 1.3, '#a0703e');
      rect(ctx, 50, -1, 4, 8, '#6d737a');
    },
  },
  scythe: {
    len: 58, grip: 12, h: 22,
    draw(ctx) {
      bar(ctx, 0, 56, 1.3, 1.3, '#a0703e');
      ctx.beginPath();
      ctx.moveTo(55, 0);
      ctx.quadraticCurveTo(52, 10, 38, 11);
      ctx.quadraticCurveTo(50, 7, 53, 0);
      ctx.closePath();
      ctx.fillStyle = '#b0b6be';
      ctx.fill();
    },
  },
  pickaxe: {
    len: 50, grip: 8, h: 22,
    draw(ctx) {
      bar(ctx, 0, 48, 1.6, 1.6, '#a0703e');
      ctx.beginPath();
      ctx.moveTo(46, -10);
      ctx.quadraticCurveTo(50, 0, 46, 10);
      ctx.lineTo(48.5, 10);
      ctx.quadraticCurveTo(52.5, 0, 48.5, -10);
      ctx.closePath();
      ctx.fillStyle = '#5d636a';
      ctx.fill();
    },
  },
  pan: {
    len: 34, grip: 5, h: 18,
    draw(ctx) {
      bar(ctx, 0, 16, 1.5, 1.4, '#1f1f1f');
      ctx.beginPath();
      ctx.arc(25, 0, 8.5, 0, Math.PI * 2);
      ctx.fillStyle = '#2d2f33';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(25, 0, 6.8, 0, Math.PI * 2);
      ctx.fillStyle = '#44474d';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(25, 0, 6, Math.PI * 1.1, Math.PI * 1.6);
      ctx.stroke();
    },
  },
};

export const HELD_KINDS: readonly string[] = [...Object.keys(GUNS), ...Object.keys(MELEE)];

/** Desenho para o item na mão (null = não é arma nem ferramenta de golpe). */
export function heldKind(def: ItemDef): string | null {
  const k = def.iconSpec.k ?? '';
  if (def.gun) return GUNS[k] ? k : def.gun.capacity > 8 ? 'smg' : 'pistol';
  if (!def.melee) return null;
  if (def.iconSpec.f === 'pot') return 'pan';
  if (MELEE[k]) return k;
  return def.melee.kind === 'impacto' ? 'pipe' : 'kitchen';
}

export function heldSpec(kind: string): HeldSpec {
  const g = GUNS[kind];
  if (g) return g;
  const m = MELEE[kind] ?? MELEE.kitchen!;
  return { ...m, pose: 'melee' };
}

/** Textura da arma deitada (+x), com margem de 1 px; a pega fica em (grip+1, h/2). */
export function drawHeld(kind: string, spec: IconSpec = { f: '' }): HTMLCanvasElement {
  const s = heldSpec(kind);
  const w = Math.ceil((s.len + 2) * HELD_RES);
  const h = Math.ceil(s.h * HELD_RES);
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.scale(HELD_RES, HELD_RES);
  ctx.translate(1, s.h / 2);
  ctx.lineJoin = 'round';
  s.draw(ctx, s, spec);
  return canvas;
}

// ------------------------------------------------------------------ vestido (no quadro do tronco)

const FRAME = 64;

/** Capacete, boné, gorro ou colete no quadro de 64 px do tronco; null se não se desenha. */
export function drawWorn(def: ItemDef): HTMLCanvasElement | null {
  const spec = def.iconSpec;
  const col = spec.c ?? '#555';
  const { canvas, ctx } = makeCanvas(FRAME, FRAME);
  const c = FRAME / 2;
  if (def.wear?.slot === 'cabeca' && spec.f === 'hat') {
    const hx = c + 1.5;
    if (spec.k === 'cap') {
      // Aba para a frente, copa redonda com costuras.
      ctx.beginPath();
      ctx.ellipse(hx + 8.5, c, 5, 7.5, 0, -Math.PI / 2, Math.PI / 2);
      ctx.fillStyle = shade(col, -0.2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx, c, 9.4, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = shade(col, -0.4);
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(hx, c);
        ctx.lineTo(hx + Math.cos(a) * 9.4, c + Math.sin(a) * 9.4);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(hx, c, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = shade(col, -0.3);
      ctx.fill();
    } else if (spec.k === 'beanie') {
      ctx.beginPath();
      ctx.arc(hx, c, 9.8, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = shade(col, 0.18);
      ctx.lineWidth = 0.8;
      for (let r = 2.5; r < 9.5; r += 2.2) {
        ctx.beginPath();
        ctx.arc(hx, c, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(hx - 1, c, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = shade(col, 0.3);
      ctx.fill();
    } else {
      // Capacete (obra ou moto): casco com borda e brilho; o de moto tem viseira na frente.
      const moto = spec.k === 'helmet';
      const r = moto ? 11 : 10.4;
      if (!moto) {
        ctx.beginPath();
        ctx.arc(hx, c, r + 1.8, 0, Math.PI * 2);
        ctx.fillStyle = shade(col, -0.18);
        ctx.fill();
      }
      const g = ctx.createRadialGradient(hx - 3, c - 3, 1, hx, c, r);
      g.addColorStop(0, shade(col, 0.35));
      g.addColorStop(1, shade(col, -0.15));
      ctx.beginPath();
      ctx.arc(hx, c, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = shade(col, -0.5);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      if (moto) {
        ctx.beginPath();
        ctx.arc(hx, c, r - 0.8, -0.9, 0.9);
        ctx.strokeStyle = '#11151a';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.strokeStyle = shade(col, -0.3);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hx - r + 1, c);
        ctx.lineTo(hx + r - 1, c);
        ctx.stroke();
      }
    }
    return canvas;
  }
  if (def.wear?.slot === 'tronco-externo' && spec.f === 'vest') {
    // Colete sobre os ombros e o peito; a cabeça fica de fora.
    ctx.beginPath();
    ctx.ellipse(c - 1, c, 10.5, 17, 0, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = shade(col, -0.45);
    ctx.lineWidth = 1;
    ctx.stroke();
    if (spec.k === 'armor') {
      ctx.fillStyle = shade(col, 0.12);
      for (const y of [-11, -4, 4, 11]) ctx.fillRect(c + 3.5, c + y - 2.4, 4.2, 4.8); // bolsos na frente
      ctx.fillStyle = shade(col, -0.25);
      ctx.fillRect(c - 9, c - 1, 5, 2); // alça nas costas
    } else {
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 2;
      for (const y of [-9, 9]) {
        ctx.beginPath();
        ctx.moveTo(c - 9, c + y);
        ctx.lineTo(c + 8, c + y);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(c + 2, c, 9.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    return canvas;
  }
  return null;
}

/** Id da textura do item vestido (capacete/boné/gorro/colete), ou null. */
export function wornArtId(def: ItemDef): string | null {
  if (def.wear?.slot === 'cabeca' && def.iconSpec.f === 'hat') return `wear.${def.id}`;
  if (def.wear?.slot === 'tronco-externo' && def.iconSpec.f === 'vest') return `wear.${def.id}`;
  return null;
}

