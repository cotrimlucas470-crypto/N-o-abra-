/**
 * Texturas repetíveis (TileSprite): faixas de rua, telhados, cercas.
 * Cada uma é uma textura própria (não vai para o atlas) porque precisa
 * repetir sem costura.
 */
import { PALETTE } from '../../config/Palette';
import { Random } from '../../core/Random';
import { grain, makeCanvas, shade, speckle } from './canvas';

export interface PatternDef {
  key: string;
  draw: () => HTMLCanvasElement;
}

/** Desgaste: apaga pontinhos aleatórios da tinta. */
function wear(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Random, count: number): void {
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rng.range(0.2, 0.7)})`;
    ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(1, 4), rng.range(1, 3));
  }
  ctx.globalCompositeOperation = 'source-over';
}

export const PATTERNS: PatternDef[] = [
  {
    // tracejado branco: 56 px de traço, 72 de vão (período 128)
    key: 'pattern.lane.dash',
    draw: () => {
      const { canvas, ctx } = makeCanvas(128, 8);
      ctx.fillStyle = PALETTE.laneWhite;
      ctx.fillRect(0, 1, 56, 6);
      wear(ctx, 128, 8, new Random(11), 90);
      return canvas;
    },
  },
  {
    key: 'pattern.lane.double',
    draw: () => {
      const { canvas, ctx } = makeCanvas(64, 16);
      ctx.fillStyle = PALETTE.laneYellow;
      ctx.fillRect(0, 2, 64, 4);
      ctx.fillRect(0, 10, 64, 4);
      wear(ctx, 64, 16, new Random(12), 50);
      return canvas;
    },
  },
  {
    // faixa de pedestre: uma barra a cada 64 px ao longo do comprimento da faixa
    // (atravessando a via); cada barra ocupa toda a largura da faixa
    key: 'pattern.crosswalk',
    draw: () => {
      const { canvas, ctx } = makeCanvas(64, 64);
      ctx.fillStyle = PALETTE.laneWhite;
      ctx.fillRect(14, 0, 36, 64);
      wear(ctx, 64, 64, new Random(13), 140);
      return canvas;
    },
  },
  {
    key: 'pattern.curb',
    draw: () => {
      const { canvas, ctx } = makeCanvas(64, 8);
      ctx.fillStyle = PALETTE.curb;
      ctx.fillRect(0, 0, 64, 8);
      ctx.fillStyle = shade(PALETTE.curb, 0.2);
      ctx.fillRect(0, 0, 64, 2);
      ctx.fillStyle = shade(PALETTE.curb, -0.3);
      ctx.fillRect(0, 7, 64, 1);
      ctx.fillRect(0, 0, 1, 8);
      grain(ctx, 64, 8, 18, new Random(14));
      return canvas;
    },
  },
  {
    // vaga de estacionamento: uma linha a cada 144 px
    key: 'pattern.stall',
    draw: () => {
      const { canvas, ctx } = makeCanvas(144, 64);
      ctx.fillStyle = PALETTE.laneWhite;
      ctx.fillRect(0, 0, 5, 64);
      wear(ctx, 144, 64, new Random(15), 40);
      return canvas;
    },
  },
  shingle('pattern.roof.shingle-a', PALETTE.roofShingle, 21),
  shingle('pattern.roof.shingle-b', '#4a4c55', 22),
  {
    key: 'pattern.roof.flat',
    draw: () => {
      const { canvas, ctx } = makeCanvas(128, 128);
      const rng = new Random(23);
      ctx.fillStyle = PALETTE.roofFlat;
      ctx.fillRect(0, 0, 128, 128);
      grain(ctx, 128, 128, 22, rng);
      speckle(ctx, 128, 128, 260, [shade(PALETTE.roofFlat, 0.18), shade(PALETTE.roofFlat, -0.2)], 1, 2.5, rng);
      ctx.strokeStyle = shade(PALETTE.roofFlat, -0.14);
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, 127, 127);
      return canvas;
    },
  },
  {
    key: 'pattern.fence',
    draw: () => {
      const { canvas, ctx } = makeCanvas(32, 8);
      const rng = new Random(24);
      ctx.fillStyle = shade(PALETTE.fence, -0.25);
      ctx.fillRect(0, 0, 32, 8);
      for (let x = 0; x < 32; x += 8) {
        ctx.fillStyle = shade(PALETTE.fence, rng.range(-0.08, 0.1));
        ctx.fillRect(x + 1, 0.5, 6, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 1, 0.5, 6, 1.5);
      }
      return canvas;
    },
  },
];

function shingle(key: string, base: string, seed: number): PatternDef {
  return {
    key,
    draw: () => {
      const { canvas, ctx } = makeCanvas(128, 128);
      const rng = new Random(seed);
      ctx.fillStyle = shade(base, -0.25);
      ctx.fillRect(0, 0, 128, 128);
      const rowH = 16;
      for (let row = 0; row < 128 / rowH; row++) {
        const y = row * rowH;
        // período 32 px (divide 128): repete sem costura nos dois eixos
        const off = (row % 2) * 16;
        for (let x = -32; x < 128 + 32; x += 32) {
          const c = shade(base, rng.range(-0.1, 0.08));
          ctx.fillStyle = c;
          ctx.fillRect(x + off + 1, y + 1, 30, rowH - 2);
          ctx.fillStyle = shade(c, 0.12);
          ctx.fillRect(x + off + 1, y + 1, 30, 2);
          ctx.fillStyle = shade(c, -0.2);
          ctx.fillRect(x + off + 1, y + rowH - 3, 30, 2);
        }
      }
      grain(ctx, 128, 128, 14, rng);
      return canvas;
    },
  };
}
