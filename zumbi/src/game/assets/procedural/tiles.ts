/**
 * Tileset procedural do chão: 1 linha por tipo de chão (MapTypes.Ground),
 * 4 colunas de variação. Tiles de 64 px, sem margem/espaçamento.
 *
 * Para trocar por arte própria: um PNG com a MESMA grade
 * (4 colunas x 12 linhas de 64 px) em assets/overrides.json -> "tiles".
 */
import { TILE } from '../../config/GameConfig';
import { PALETTE } from '../../config/Palette';
import { Random } from '../../core/Random';
import { Ground, GROUND_COUNT, GROUND_VARIANTS, type GroundId } from '../../world/MapTypes';
import { grain, line, makeCanvas, rgba, shade, speckle, type Ctx } from './canvas';

type TileDrawer = (ctx: Ctx, variant: number, rng: Random) => void;

const S = TILE;

const flat = (ctx: Ctx, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);
};

function grass(base: string): TileDrawer {
  return (ctx, v, rng) => {
    flat(ctx, base);
    grain(ctx, S, S, 18, rng, false);
    speckle(ctx, S, S, 120, [shade(base, -0.18), shade(base, 0.12), shade(base, -0.28)], 1, 2.4, rng, 0.8);
    // tufos
    for (let i = 0; i < 16; i++) {
      const x = rng.range(0, S);
      const y = rng.range(0, S);
      line(ctx, x, y, x + rng.range(-2, 2), y - rng.range(2, 5), shade(base, rng.range(-0.25, 0.18)), 1.2);
    }
    if (v === 3) {
      speckle(ctx, S, S, 6, ['#d8cf9a', '#c9b6c9', '#e6e0c8'], 1.5, 2.5, rng);
      ctx.fillStyle = 'rgba(90,70,50,0.25)';
      ctx.beginPath();
      ctx.ellipse(rng.range(16, 48), rng.range(16, 48), 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

const dirt: TileDrawer = (ctx, v, rng) => {
  flat(ctx, PALETTE.dirt);
  grain(ctx, S, S, 22, rng, false);
  speckle(ctx, S, S, 40, [shade(PALETTE.dirt, -0.25), shade(PALETTE.dirt, 0.2), '#8a8176'], 1.5, 3.5, rng);
  if (v >= 2) speckle(ctx, S, S, 10, [PALETTE.grassDark], 2, 4, rng, 0.6);
};

const gravel: TileDrawer = (ctx, _v, rng) => {
  flat(ctx, PALETTE.gravel);
  grain(ctx, S, S, 20, rng);
  speckle(ctx, S, S, 180, [shade(PALETTE.gravel, -0.3), shade(PALETTE.gravel, 0.25), '#948d80', '#5f5a52'], 1.5, 3.5, rng);
};

function asphalt(base: string): TileDrawer {
  return (ctx, v, rng) => {
    flat(ctx, base);
    grain(ctx, S, S, 16, rng);
    speckle(ctx, S, S, 70, [shade(base, 0.18), shade(base, -0.2)], 1, 1.8, rng, 0.8);
    if (v === 1) {
      // mancha de desgaste, irregular e discreta (retângulo parecia defeito)
      ctx.fillStyle = rgba(shade(base, -0.25), 0.22);
      ctx.beginPath();
      ctx.ellipse(rng.range(22, 42), rng.range(22, 42), rng.range(10, 16), rng.range(6, 11), rng.range(0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
    if (v === 3) {
      // rachadura fina
      ctx.strokeStyle = shade(base, -0.35);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let x = rng.range(8, 20);
      let y = rng.range(8, 20);
      ctx.moveTo(x, y);
      for (let i = 0; i < 5; i++) {
        x += rng.range(4, 10);
        y += rng.range(-2, 9);
        ctx.lineTo(Math.min(x, S - 4), Math.min(y, S - 4));
      }
      ctx.stroke();
    }
  };
}

const sidewalk: TileDrawer = (ctx, v, rng) => {
  flat(ctx, PALETTE.sidewalk);
  grain(ctx, S, S, 14, rng);
  // lajotas 32x32 com rejunte
  for (let i = 0; i < 4; i++) {
    const x = (i % 2) * 32;
    const y = Math.floor(i / 2) * 32;
    ctx.fillStyle = shade(PALETTE.sidewalk, rng.range(-0.05, 0.05));
    ctx.fillRect(x + 1, y + 1, 30, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + 1, y + 1, 30, 2);
  }
  ctx.fillStyle = PALETTE.sidewalkJoint;
  ctx.fillRect(0, 0, S, 1);
  ctx.fillRect(0, 32, S, 1.5);
  ctx.fillRect(0, 0, 1, S);
  ctx.fillRect(32, 0, 1.5, S);
  grain(ctx, S, S, 10, rng);
  if (v === 3) line(ctx, 36, 36, 58, 50, shade(PALETTE.sidewalk, -0.35), 1);
  if (v === 2) speckle(ctx, S, S, 8, ['#5d7249', '#6b5f4b'], 1.5, 3, rng, 0.8);
};

const concrete: TileDrawer = (ctx, v, rng) => {
  flat(ctx, PALETTE.concrete);
  grain(ctx, S, S, 16, rng);
  ctx.fillStyle = shade(PALETTE.concrete, -0.18);
  ctx.fillRect(0, 0, S, 1.2);
  ctx.fillRect(0, 0, 1.2, S);
  if (v === 2) {
    ctx.fillStyle = 'rgba(40,35,30,0.12)';
    ctx.beginPath();
    ctx.ellipse(rng.range(20, 44), rng.range(20, 44), 14, 9, rng.range(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  if (v === 3) line(ctx, 10, 50, 30, 38, shade(PALETTE.concrete, -0.3), 1);
};

const parking: TileDrawer = (ctx, v, rng) => {
  asphalt(PALETTE.parking)(ctx, v === 3 ? 3 : 0, rng);
  if (v === 2) {
    ctx.fillStyle = 'rgba(15,15,20,0.25)';
    ctx.beginPath();
    ctx.ellipse(32, 32, 12, 8, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
};

const wood: TileDrawer = (ctx, v, rng) => {
  const plank = 16;
  for (let row = 0; row < S / plank; row++) {
    const y = row * plank;
    const offset = ((row + v) % 2) * 32 + rng.int(-4, 4);
    for (let x = -64; x < S + 64; x += 64) {
      const c = shade(PALETTE.woodFloor, rng.range(-0.08, 0.08));
      ctx.fillStyle = c;
      ctx.fillRect(x + offset, y, 64, plank);
      // veios
      ctx.strokeStyle = shade(c, -0.12);
      ctx.lineWidth = 0.8;
      for (let k = 0; k < 2; k++) {
        const gy = y + rng.range(3, plank - 3);
        ctx.beginPath();
        ctx.moveTo(x + offset, gy);
        ctx.bezierCurveTo(x + offset + 20, gy + rng.range(-2, 2), x + offset + 40, gy + rng.range(-2, 2), x + offset + 64, gy);
        ctx.stroke();
      }
      ctx.fillStyle = PALETTE.woodFloorDark;
      ctx.fillRect(x + offset, y, 1.2, plank);
    }
    ctx.fillStyle = PALETTE.woodFloorDark;
    ctx.fillRect(0, y, S, 1.2);
  }
  grain(ctx, S, S, 10, rng);
};

const ceramic: TileDrawer = (ctx, v, rng) => {
  flat(ctx, PALETTE.tileFloorJoint);
  for (let i = 0; i < 4; i++) {
    const x = (i % 2) * 32;
    const y = Math.floor(i / 2) * 32;
    const c = shade(PALETTE.tileFloor, rng.range(-0.04, 0.03));
    ctx.fillStyle = c;
    ctx.fillRect(x + 1, y + 1, 30, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x + 1, y + 1, 30, 3);
  }
  grain(ctx, S, S, 8, rng);
  if (v === 3) line(ctx, 4, 20, 26, 6, shade(PALETTE.tileFloor, -0.35), 1);
  if (v === 2) speckle(ctx, S, S, 10, ['rgba(80,70,60,0.5)'], 1, 3, rng);
};

const carpet: TileDrawer = (ctx, v, rng) => {
  flat(ctx, PALETTE.carpet);
  grain(ctx, S, S, 22, rng);
  speckle(ctx, S, S, 60, [shade(PALETTE.carpet, 0.1), shade(PALETTE.carpet, -0.12)], 1, 1.5, rng, 0.8);
  if (v === 3) {
    ctx.fillStyle = 'rgba(40,30,30,0.18)';
    ctx.beginPath();
    ctx.ellipse(40, 24, 10, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
};

const garage: TileDrawer = (ctx, v, rng) => {
  concrete(ctx, v === 3 ? 3 : 0, rng);
  ctx.fillStyle = 'rgba(40,42,44,0.28)';
  ctx.fillRect(0, 0, S, S);
  if (v === 1 || v === 2) {
    ctx.fillStyle = 'rgba(10,10,12,0.28)';
    ctx.beginPath();
    ctx.ellipse(rng.range(20, 44), rng.range(20, 44), rng.range(8, 14), rng.range(5, 9), rng.range(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
};

const DRAWERS: Record<GroundId, TileDrawer> = {
  [Ground.Grass]: grass(PALETTE.grass),
  [Ground.GrassDark]: grass(PALETTE.grassDark),
  [Ground.Dirt]: dirt,
  [Ground.Gravel]: gravel,
  [Ground.Asphalt]: asphalt(PALETTE.asphalt),
  [Ground.Sidewalk]: sidewalk,
  [Ground.Concrete]: concrete,
  [Ground.Parking]: parking,
  [Ground.WoodFloor]: wood,
  [Ground.TileFloor]: ceramic,
  [Ground.Carpet]: carpet,
  [Ground.GarageFloor]: garage,
};

export function drawTileset(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(S * GROUND_VARIANTS, S * GROUND_COUNT);
  const tile = makeCanvas(S, S);
  for (let g = 0; g < GROUND_COUNT; g++) {
    for (let v = 0; v < GROUND_VARIANTS; v++) {
      tile.ctx.clearRect(0, 0, S, S);
      DRAWERS[g as GroundId](tile.ctx, v, new Random(1000 + g * 31 + v * 7));
      ctx.drawImage(tile.canvas, v * S, g * S);
    }
  }
  return canvas;
}
