/**
 * Desenho procedural dos objetos do mundo (arte provisória).
 * Cada função recebe um canvas do tamanho definido em world/PropCatalog.ts.
 *
 * Convenções: carros "olham" para +x (frente à direita); móveis têm o
 * fundo encostado no topo (norte). Luz vem de cima/esquerda.
 *
 * Para substituir por arte final: coloque o PNG em public/assets/ e
 * registre o id em public/assets/overrides.json — este arquivo continua
 * servindo de reserva para o que ainda não tiver arte.
 */
import { Random, hashString } from '../../core/Random';
import { ball, blob, circle, line, mix, rgba, roundRect, shade, shadedBox, speckle, type Ctx } from './canvas';
import { NATURE_PROP_DRAWERS } from './nature';

export type PropDrawer = (ctx: Ctx, w: number, h: number, rng: Random) => void;

// ------------------------------------------------------------------ veículos

function car(color: string, wrecked = false): PropDrawer {
  return (ctx, w, h, rng) => {
    const body = wrecked ? '#3d3935' : color;
    // rodas aparecendo dos lados
    ctx.fillStyle = '#1b1b1d';
    for (const fx of [0.2, 0.74]) {
      roundRect(ctx, w * fx - 15, 2, 30, 12, 4);
      ctx.fill();
      roundRect(ctx, w * fx - 15, h - 14, 30, 12, 4);
      ctx.fill();
    }
    // carroceria
    shadedBox(ctx, 6, 7, w - 12, h - 14, 20, body, { light: 0.16 });
    // capô com vinco
    ctx.strokeStyle = rgba(shade(body, -0.35), 0.6);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(w * 0.7, h * 0.32);
    ctx.lineTo(w - 16, h * 0.36);
    ctx.moveTo(w * 0.7, h * 0.68);
    ctx.lineTo(w - 16, h * 0.64);
    ctx.stroke();
    // para-brisa
    const glass = wrecked ? '#4a4d52' : '#26303b';
    const gGrad = ctx.createLinearGradient(w * 0.56, 0, w * 0.66, 0);
    gGrad.addColorStop(0, shade(glass, 0.25));
    gGrad.addColorStop(1, glass);
    ctx.fillStyle = gGrad;
    ctx.beginPath();
    ctx.moveTo(w * 0.555, 15);
    ctx.lineTo(w * 0.665, 21);
    ctx.lineTo(w * 0.665, h - 21);
    ctx.lineTo(w * 0.555, h - 15);
    ctx.closePath();
    ctx.fill();
    // teto
    shadedBox(ctx, w * 0.3, 16, w * 0.255, h - 32, 8, shade(body, 0.04), { light: 0.1, outline: rgba('#000000', 0.25) });
    // janelas laterais
    ctx.fillStyle = glass;
    ctx.fillRect(w * 0.3, 11.5, w * 0.255, 4.5);
    ctx.fillRect(w * 0.3, h - 16, w * 0.255, 4.5);
    // vidro traseiro
    ctx.beginPath();
    ctx.moveTo(w * 0.3, 16);
    ctx.lineTo(w * 0.2, 21);
    ctx.lineTo(w * 0.2, h - 21);
    ctx.lineTo(w * 0.3, h - 16);
    ctx.closePath();
    ctx.fillStyle = glass;
    ctx.fill();
    // faróis e lanternas
    ctx.fillStyle = wrecked ? '#6b6258' : '#efe6c0';
    roundRect(ctx, w - 15, 13, 7, 13, 3);
    ctx.fill();
    roundRect(ctx, w - 15, h - 26, 7, 13, 3);
    ctx.fill();
    ctx.fillStyle = wrecked ? '#4a2c28' : '#9e2f2c';
    roundRect(ctx, 8, 13, 5, 12, 2);
    ctx.fill();
    roundRect(ctx, 8, h - 25, 5, 12, 2);
    ctx.fill();
    // retrovisores
    ctx.fillStyle = shade(body, -0.2);
    roundRect(ctx, w * 0.58, 1, 9, 7, 2);
    ctx.fill();
    roundRect(ctx, w * 0.58, h - 8, 9, 7, 2);
    ctx.fill();
    // abandono: poeira, folhas, ferrugem
    speckle(ctx, w, h, 90, ['rgba(60,50,40,0.35)', 'rgba(120,110,90,0.25)'], 1, 3, rng);
    if (wrecked) {
      for (let i = 0; i < 6; i++) blob(ctx, rng.range(20, w - 20), rng.range(14, h - 14), rng.range(6, 14), rgba('#6b3e22', 0.55), rng, 10, 2);
      for (let i = 0; i < 4; i++) blob(ctx, rng.range(20, w - 20), rng.range(14, h - 14), rng.range(8, 16), 'rgba(15,12,10,0.55)', rng, 10, 3);
      ctx.strokeStyle = 'rgba(200,210,220,0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const cx = w * 0.61;
        const cy = h / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + rng.range(-10, 10), cy + rng.range(-24, 24));
        ctx.stroke();
      }
    }
  };
}

const van: PropDrawer = (ctx, w, h, rng) => {
  const body = '#c4c0b4';
  ctx.fillStyle = '#1b1b1d';
  for (const fx of [0.18, 0.8]) {
    roundRect(ctx, w * fx - 16, 2, 32, 12, 4);
    ctx.fill();
    roundRect(ctx, w * fx - 16, h - 14, 32, 12, 4);
    ctx.fill();
  }
  shadedBox(ctx, 5, 7, w - 10, h - 14, 12, body);
  // teto longo com rack
  shadedBox(ctx, 14, 16, w * 0.66, h - 32, 5, shade(body, 0.05), { light: 0.08, outline: rgba('#000000', 0.2) });
  ctx.strokeStyle = 'rgba(60,60,60,0.55)';
  ctx.lineWidth = 2;
  for (let x = 30; x < w * 0.66; x += 26) line(ctx, x, 20, x, h - 20, 'rgba(70,70,70,0.45)', 2);
  // cabine
  ctx.fillStyle = '#26303b';
  ctx.beginPath();
  ctx.moveTo(w * 0.76, 14);
  ctx.lineTo(w * 0.86, 20);
  ctx.lineTo(w * 0.86, h - 20);
  ctx.lineTo(w * 0.76, h - 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#efe6c0';
  roundRect(ctx, w - 12, 14, 6, 14, 2);
  ctx.fill();
  roundRect(ctx, w - 12, h - 28, 6, 14, 2);
  ctx.fill();
  ctx.fillStyle = '#9e2f2c';
  ctx.fillRect(6, 14, 4, 12);
  ctx.fillRect(6, h - 26, 4, 12);
  speckle(ctx, w, h, 140, ['rgba(60,50,40,0.35)', 'rgba(110,100,80,0.3)'], 1, 3, rng);
  blob(ctx, w * 0.3, h * 0.65, 12, 'rgba(90,20,18,0.55)', rng, 12, 4);
};

const bus: PropDrawer = (ctx, w, h, rng) => {
  const body = '#6f8573';
  ctx.fillStyle = '#1b1b1d';
  for (const fx of [0.15, 0.8]) {
    roundRect(ctx, w * fx - 18, 2, 36, 12, 4);
    ctx.fill();
    roundRect(ctx, w * fx - 18, h - 14, 36, 12, 4);
    ctx.fill();
  }
  shadedBox(ctx, 4, 6, w - 8, h - 12, 12, body, { light: 0.1 });
  ctx.fillStyle = shade(body, 0.06);
  roundRect(ctx, 16, 16, w - 40, h - 32, 6);
  ctx.fill();
  // unidades de ar e escotilhas
  for (const x of [w * 0.25, w * 0.6]) {
    shadedBox(ctx, x - 26, h / 2 - 20, 52, 40, 4, '#9aa0a3');
    circle(ctx, x - 10, h / 2, 11, '#4b5054');
    circle(ctx, x + 12, h / 2, 11, '#4b5054');
  }
  shadedBox(ctx, w * 0.43 - 14, h / 2 - 14, 28, 28, 3, '#8a9092');
  ctx.fillStyle = '#26303b';
  ctx.fillRect(w - 18, 14, 10, h - 28);
  ctx.fillStyle = 'rgba(40,40,40,0.7)';
  ctx.fillRect(20, 8, w - 50, 4);
  ctx.fillRect(20, h - 12, w - 50, 4);
  speckle(ctx, w, h, 400, ['rgba(60,50,40,0.35)', 'rgba(120,110,90,0.3)', 'rgba(107,62,34,0.35)'], 1, 4, rng);
  for (let i = 0; i < 5; i++) blob(ctx, rng.range(40, w - 40), rng.range(20, h - 20), rng.range(8, 16), 'rgba(20,16,14,0.45)', rng, 10, 3);
};

// ------------------------------------------------------------------ rua

const barricade: PropDrawer = (ctx, w, h) => {
  ctx.fillStyle = '#2a2a2c';
  roundRect(ctx, 10, 0, 10, h, 3);
  ctx.fill();
  roundRect(ctx, w - 20, 0, 10, h, 3);
  ctx.fill();
  const y = h / 2 - 7;
  ctx.save();
  roundRect(ctx, 2, y, w - 4, 14, 3);
  ctx.clip();
  ctx.fillStyle = '#e8e3d6';
  ctx.fillRect(0, y, w, 14);
  ctx.fillStyle = '#d4682e';
  for (let x = -20; x < w + 20; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, y + 14);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x + 20, y);
    ctx.lineTo(x + 10, y + 14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 2, y, w - 4, 14, 3);
  ctx.stroke();
  circle(ctx, 16, y + 7, 3.5, '#f2c84b', '#6b5a20', 1);
  circle(ctx, w - 16, y + 7, 3.5, '#f2c84b', '#6b5a20', 1);
};

const concreteBarrier: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 6, '#a5a39c', { light: 0.12 });
  shadedBox(ctx, 5, h / 2 - 6, w - 10, 12, 4, '#b8b6ae', { light: 0.1, outline: rgba('#000000', 0.15) });
  speckle(ctx, w, h, 60, ['rgba(60,58,54,0.4)', 'rgba(255,255,255,0.15)'], 1, 3, rng);
  ctx.fillStyle = 'rgba(80,78,72,0.6)';
  ctx.fillRect(w / 2 - 1, 2, 2, h - 4);
  // pichação discreta
  ctx.strokeStyle = 'rgba(140,40,50,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(18, h - 9);
  ctx.bezierCurveTo(26, 6, 36, h - 4, 44, 8);
  ctx.stroke();
};

const cone: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 4, '#c85a26', { light: 0.1 });
  ball(ctx, w / 2, h / 2, w * 0.34, '#e37232');
  circle(ctx, w / 2, h / 2, w * 0.22, '#eeeae0');
  circle(ctx, w / 2, h / 2, w * 0.13, '#e37232');
  circle(ctx, w / 2, h / 2, 2, '#3a2a20');
};

const lamp: PropDrawer = (ctx, w, h) => {
  const poleX = 14;
  // braço
  line(ctx, poleX, h / 2, w - 18, h / 2, '#4b4e52', 5);
  line(ctx, poleX, h / 2 - 1, w - 18, h / 2 - 1, '#6b6e72', 1.5);
  // luminária
  shadedBox(ctx, w - 30, h / 2 - 8, 28, 16, 6, '#5a5d61');
  ctx.fillStyle = '#d9d2b0';
  roundRect(ctx, w - 26, h / 2 - 4, 20, 8, 3);
  ctx.fill();
  // poste (base)
  ball(ctx, poleX, h / 2, 9, '#55585c');
  circle(ctx, poleX, h / 2, 4, '#3a3c40');
};

const hydrant: PropDrawer = (ctx, w, h) => {
  circle(ctx, w / 2 - 10, h / 2, 4.5, '#8f2622', '#4a1412', 1);
  circle(ctx, w / 2 + 10, h / 2, 4.5, '#8f2622', '#4a1412', 1);
  ball(ctx, w / 2, h / 2, 10, '#b3332c');
  ball(ctx, w / 2, h / 2, 5, '#c9463c');
};

const trashBags: PropDrawer = (ctx, w, h, rng) => {
  const bag = (x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, 1, x, y, r);
    g.addColorStop(0, '#5b5f66');
    g.addColorStop(0.35, '#2b2e33');
    g.addColorStop(1, '#16171a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.88, rng.range(0, 3), 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, x + r * 0.5, y - r * 0.55, 3.5, '#202226');
  };
  bag(w * 0.34, h * 0.56, 19);
  bag(w * 0.68, h * 0.44, 17);
  bag(w * 0.62, h * 0.74, 12);
};

const dumpster: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 5, '#3f5b47', { light: 0.1 });
  shadedBox(ctx, 5, 5, w / 2 - 7, h - 10, 3, '#4d6b55', { light: 0.12 });
  shadedBox(ctx, w / 2 + 2, 5, w / 2 - 7, h - 10, 3, '#4a6852', { light: 0.12 });
  for (const x of [w * 0.25, w * 0.75]) line(ctx, x - 10, h - 9, x + 10, h - 9, '#2b3d30', 3);
  speckle(ctx, w, h, 80, ['rgba(107,62,34,0.45)', 'rgba(30,30,30,0.35)'], 1, 4, rng);
};

const trashCan: PropDrawer = (ctx, w, h) => {
  ball(ctx, w / 2, h / 2, w / 2 - 2, '#5d6166');
  circle(ctx, w / 2, h / 2, w / 2 - 6, '#4a4e52', '#3a3d40', 1);
  line(ctx, w / 2 - 6, h / 2, w / 2 + 6, h / 2, '#303235', 3);
};

const bench: PropDrawer = (ctx, w, h) => {
  ctx.fillStyle = '#2f3134';
  ctx.fillRect(6, 2, 6, h - 4);
  ctx.fillRect(w - 12, 2, 6, h - 4);
  for (let i = 0; i < 4; i++) shadedBox(ctx, 2, 3 + i * 9.5, w - 4, 7, 2, i === 0 ? '#6b4f36' : '#7d5d40', { light: 0.1, lineWidth: 1 });
};

const tire: PropDrawer = (ctx, w, h) => {
  circle(ctx, w / 2, h / 2, w / 2 - 1, '#1e1f21', '#0d0d0e', 1);
  ctx.strokeStyle = '#2d2f32';
  ctx.lineWidth = 2;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    line(ctx, w / 2 + Math.cos(a) * (w / 2 - 6), h / 2 + Math.sin(a) * (w / 2 - 6), w / 2 + Math.cos(a) * (w / 2 - 2), h / 2 + Math.sin(a) * (w / 2 - 2), '#34363a', 2);
  }
  circle(ctx, w / 2, h / 2, w * 0.24, '#555a60', '#111', 1);
};

const tires: PropDrawer = (ctx, w, h, rng) => {
  tire(ctx, w, h, rng);
  circle(ctx, w / 2, h / 2, w * 0.24, '#0f1011');
  ctx.strokeStyle = '#3a3c40';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
  ctx.stroke();
};

const pallet: PropDrawer = (ctx, w, h, rng) => {
  for (let i = 0; i < 5; i++) {
    shadedBox(ctx, 2, 3 + i * ((h - 6) / 5), w - 4, (h - 6) / 5 - 4, 1, shade('#a58459', rng.range(-0.1, 0.05)), { light: 0.08, lineWidth: 1 });
  }
  ctx.fillStyle = 'rgba(70,52,34,0.8)';
  for (const x of [6, w / 2 - 4, w - 14]) ctx.fillRect(x, 1, 8, h - 2);
};

const crate: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#8f6a42', { light: 0.14 });
  ctx.strokeStyle = '#6a4c2d';
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  line(ctx, 8, 8, w - 8, h - 8, '#6a4c2d', 5);
  line(ctx, 8, 8, w - 8, h - 8, '#a07a4f', 2);
};

const box: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, '#b08a5a', { light: 0.12 });
  ctx.fillStyle = 'rgba(220,210,180,0.6)';
  ctx.fillRect(w / 2 - 3, 1, 6, h - 2);
  line(ctx, 2, h / 2, w - 2, h / 2, 'rgba(90,65,40,0.5)', 1);
};

const boxes: PropDrawer = (ctx, w, h, rng) => {
  const b = (x: number, y: number, bw: number, bh: number) => {
    ctx.save();
    ctx.translate(x, y);
    box(ctx, bw, bh, rng);
    ctx.restore();
  };
  b(2, h * 0.36, w * 0.5, h * 0.6);
  b(w * 0.46, h * 0.42, w * 0.5, h * 0.55);
  b(w * 0.2, 2, w * 0.56, h * 0.5);
};

const drum: PropDrawer = (ctx, w, h, rng) => {
  const color = rng.pick(['#3f5f7a', '#8a3a2e', '#4d5c3a']);
  ball(ctx, w / 2, h / 2, w / 2 - 1, color);
  ctx.strokeStyle = shade(color, -0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, w / 2 + 7, h / 2 - 6, 3.5, shade(color, -0.35));
  speckle(ctx, w, h, 30, ['rgba(107,62,34,0.5)'], 1, 3, rng);
};

const cart: PropDrawer = (ctx, w, h) => {
  ctx.strokeStyle = '#9ea3a8';
  ctx.lineWidth = 2;
  roundRect(ctx, 3, 3, w - 14, h - 6, 3);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(170,176,182,0.8)';
  for (let x = 9; x < w - 12; x += 6) line(ctx, x, 4, x, h - 4, 'rgba(160,166,172,0.7)', 1);
  for (let y = 9; y < h - 4; y += 6) line(ctx, 4, y, w - 12, y, 'rgba(160,166,172,0.7)', 1);
  line(ctx, w - 6, 4, w - 6, h - 4, '#c0442f', 4);
};

// ------------------------------------------------------------------ vegetação

function canopy(base: string, lobes: number): PropDrawer {
  return (ctx, w, h, rng) => {
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 - 4;
    // massa escura de base
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const d = R * rng.range(0.35, 0.55);
      const r = R * rng.range(0.42, 0.55);
      const g = ctx.createRadialGradient(cx + Math.cos(a) * d - r * 0.3, cy + Math.sin(a) * d - r * 0.35, r * 0.1, cx + Math.cos(a) * d, cy + Math.sin(a) * d, r);
      g.addColorStop(0, shade(base, 0.12));
      g.addColorStop(0.7, base);
      g.addColorStop(1, shade(base, -0.28));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const gc = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R * 0.6);
    gc.addColorStop(0, shade(base, 0.2));
    gc.addColorStop(1, shade(base, -0.05));
    ctx.fillStyle = gc;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
    ctx.fill();
    // folhas: pontinhos claros no lado da luz, escuros no lado oposto
    for (let i = 0; i < R * 5; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = Math.sqrt(rng.next()) * R * 0.95;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const lit = (x - cx + (y - cy)) / (R * 2);
      ctx.fillStyle = lit < 0 ? rgba(shade(base, 0.28), 0.55) : rgba(shade(base, -0.35), 0.5);
      ctx.beginPath();
      ctx.ellipse(x, y, rng.range(1.5, 3.5), rng.range(1, 2.2), a, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

const hedge: PropDrawer = (ctx, w, h, rng) => {
  const base = '#4a6a3c';
  shadedBox(ctx, 1, 1, w - 2, h - 2, h / 2 - 2, base, { light: 0.16, outline: rgba('#1e2b18', 0.6) });
  for (let i = 0; i < 160; i++) {
    const x = rng.range(4, w - 4);
    const y = rng.range(4, h - 4);
    ctx.fillStyle = y < h / 2 ? rgba(shade(base, 0.3), 0.5) : rgba(shade(base, -0.35), 0.5);
    ctx.beginPath();
    ctx.ellipse(x, y, 2.5, 1.6, rng.range(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
};

// ------------------------------------------------------------------ interiores

const WOOD = '#7a5a3c';
const FABRIC = '#6d7f86';

function bed(pillows: number, blanket: string): PropDrawer {
  return (ctx, w, h) => {
    shadedBox(ctx, 1, 1, w - 2, h - 2, 4, WOOD);
    shadedBox(ctx, 1, 1, w - 2, 14, 3, shade(WOOD, -0.2));
    shadedBox(ctx, 6, 14, w - 12, h - 20, 5, '#dcd8cf', { light: 0.06 });
    const pw = (w - 12 - (pillows - 1) * 6) / pillows;
    for (let i = 0; i < pillows; i++) shadedBox(ctx, 6 + i * (pw + 6), 19, pw, 24, 7, '#eeebe4', { light: 0.08 });
    shadedBox(ctx, 4, h * 0.38, w - 8, h * 0.6 - 4, 6, blanket, { light: 0.12 });
    ctx.fillStyle = shade(blanket, 0.15);
    ctx.fillRect(4, h * 0.38, w - 8, 8);
    line(ctx, 10, h * 0.7, w - 12, h * 0.74, rgba(shade(blanket, -0.35), 0.6), 1.5);
  };
}

function seat(cushions: number): PropDrawer {
  return (ctx, w, h) => {
    shadedBox(ctx, 1, 1, w - 2, h - 2, 8, FABRIC);
    shadedBox(ctx, 1, 1, w - 2, h * 0.34, 7, shade(FABRIC, -0.12));
    shadedBox(ctx, 1, 3, 14, h - 6, 6, shade(FABRIC, -0.06));
    shadedBox(ctx, w - 15, 3, 14, h - 6, 6, shade(FABRIC, -0.06));
    const cw = (w - 32) / cushions;
    for (let i = 0; i < cushions; i++) shadedBox(ctx, 16 + i * cw, h * 0.34, cw - 2, h * 0.6, 5, shade(FABRIC, 0.06), { light: 0.12 });
  };
}

const coffeeTable: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 5, shade(WOOD, 0.08));
  shadedBox(ctx, w * 0.55, 10, 22, 16, 1, '#c9c2b0', { light: 0.05 });
  circle(ctx, w * 0.3, h * 0.55, 6, '#e8e4dc', '#9a948a', 1);
};

const tv: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, h * 0.25, w - 2, h * 0.75 - 1, 3, shade(WOOD, -0.08));
  shadedBox(ctx, 10, 2, w - 20, 9, 2, '#18191b', { light: 0.15 });
  ctx.fillStyle = 'rgba(160,190,210,0.35)';
  ctx.fillRect(12, 3, w * 0.3, 2);
};

function rug(color: string, border: string): PropDrawer {
  return (ctx, w, h, rng) => {
    ctx.globalAlpha = 0.92;
    roundRect(ctx, 2, 2, w - 4, h - 4, 4);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    roundRect(ctx, 9, 9, w - 18, h - 18, 3);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = shade(border, 0.2);
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.22, h * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    speckle(ctx, w, h, 80, ['rgba(40,30,30,0.25)'], 1, 2, rng);
  };
}

const diningTable: PropDrawer = (ctx, w, h) => {
  const tw = 112;
  const th = 80;
  const tx = (w - tw) / 2;
  const ty = (h - th) / 2;
  const chair = (x: number, y: number) => shadedBox(ctx, x - 13, y - 13, 26, 26, 4, shade(WOOD, -0.15));
  chair(w / 2 - 28, ty - 4);
  chair(w / 2 + 28, ty - 4);
  chair(w / 2 - 28, ty + th + 4);
  chair(w / 2 + 28, ty + th + 4);
  chair(tx - 2, h / 2);
  shadedBox(ctx, tx, ty, tw, th, 6, shade(WOOD, 0.1), { light: 0.12 });
  circle(ctx, tx + 30, ty + 26, 9, '#e8e4dc', '#9a948a', 1);
  circle(ctx, tx + 78, ty + 50, 7, '#d8d2c6', '#9a948a', 1);
};

const counter: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, '#b9b6ad', { light: 0.1 });
  ctx.fillStyle = shade(WOOD, -0.1);
  ctx.fillRect(1, h - 7, w - 2, 6);
  // pia
  shadedBox(ctx, w * 0.35, 7, 44, h - 18, 5, '#8e969c', { light: -0.15 });
  circle(ctx, w * 0.35 + 22, 10, 3, '#5a6064');
  for (let x = 0; x < w; x += 41) line(ctx, x, h - 7, x, h - 1, 'rgba(40,30,20,0.6)', 1);
};

const fridge: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 4, '#d7d6d0', { light: 0.1 });
  line(ctx, 6, h - 8, w - 6, h - 8, '#9d9c96', 2);
  line(ctx, w - 12, h - 6, w - 12, h - 2, '#7a7974', 2);
};

const stove: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#c9c8c2');
  shadedBox(ctx, 5, 5, w - 10, h - 16, 2, '#2c2d30', { light: 0.1 });
  for (const [x, y] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.65], [0.7, 0.65]] as const) {
    circle(ctx, w * x, (h - 12) * y + 3, 7, '#1a1a1c', '#555', 1.5);
  }
  for (let i = 0; i < 4; i++) circle(ctx, 12 + i * 12, h - 5, 2.5, '#444');
};

const toilet: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 2, 1, w - 4, 14, 3, '#e7e5df');
  ctx.fillStyle = '#e4e2dc';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.62, w / 2 - 3, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a9a7a0';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#b9c9cf';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.64, w / 2 - 9, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
};

const bathtub: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 12, '#e3e1db', { light: 0.08 });
  shadedBox(ctx, 9, 9, w - 18, h - 18, 16, '#b6c4c9', { light: -0.12, outline: '#9aa5a8' });
  circle(ctx, w - 16, h / 2, 4, '#8a9296');
  line(ctx, w - 16, h / 2 - 10, w - 16, h / 2 + 10, '#9aa2a6', 3);
};

const bathSink: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 4, shade(WOOD, 0.05));
  ctx.fillStyle = '#e8e6e0';
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2 + 2, w * 0.34, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, w / 2, 6, 2.5, '#8a9296');
};

const wardrobe: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, shade(WOOD, -0.05), { light: 0.12 });
  line(ctx, w / 2, 3, w / 2, h - 3, 'rgba(40,28,18,0.6)', 1.5);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(3, 3, w - 6, 4);
};

const nightstand: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, WOOD);
  ball(ctx, w / 2, h / 2, 9, '#d8cfae');
};

const desk: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, shade(WOOD, 0.05));
  shadedBox(ctx, w * 0.12, 6, 40, 14, 2, '#26282b');
  shadedBox(ctx, w * 0.55, 16, 30, 22, 1, '#e3dfd4', { light: 0.03 });
  shadedBox(ctx, w * 0.6, 20, 30, 22, 1, '#d8d3c6', { light: 0.03 });
};

const chair: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 5, 8, w - 10, h - 12, 5, '#3d3f44');
  shadedBox(ctx, 5, 2, w - 10, 8, 3, '#2d2f33');
};

const storeShelf: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, '#8d9296', { light: 0.1 });
  const colors = ['#b8433a', '#d8a73c', '#4f7a9a', '#6d8a4a', '#d9d4c8', '#7a4f82', '#c46b33'];
  for (const [y0, rowH] of [[4, h / 2 - 6], [h / 2 + 2, h / 2 - 6]] as const) {
    let x = 5;
    while (x < w - 10) {
      const iw = rng.range(6, 14);
      if (rng.chance(0.18)) {
        x += iw; // espaço vazio: prateleira saqueada
        continue;
      }
      ctx.fillStyle = shade(rng.pick(colors), rng.range(-0.1, 0.1));
      roundRect(ctx, x, y0 + rng.range(0, 3), iw - 2, rowH - rng.range(0, 3), 2);
      ctx.fill();
      x += iw;
    }
  }
  line(ctx, 2, h / 2, w - 2, h / 2, '#5c6064', 2);
};

const checkout: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#6d6a66');
  shadedBox(ctx, 6, h / 2 - 9, w * 0.55, 18, 2, '#222326', { light: 0.1 });
  shadedBox(ctx, w * 0.68, 8, 36, 30, 3, '#3c3f44');
  ctx.fillStyle = '#7fb0a0';
  ctx.fillRect(w * 0.68 + 6, 13, 24, 8);
};

const displayFridge: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#c9cdd0');
  ctx.fillStyle = 'rgba(150,190,210,0.55)';
  ctx.fillRect(6, h * 0.45, w - 12, h * 0.48);
  for (let x = 10; x < w - 10; x += 9) {
    if (rng.chance(0.3)) continue;
    circle(ctx, x, h * 0.68, 3.5, rng.pick(['#2d6a4a', '#a33a2e', '#3a5d8a', '#d0a23c']));
  }
  for (let x = w / 4; x < w; x += w / 4) line(ctx, x, h * 0.45, x, h - 4, '#8a9092', 2);
};

const workbench: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#8a6a46', { light: 0.12 });
  // martelo
  line(ctx, 20, 30, 48, 18, '#6b4a2c', 4);
  shadedBox(ctx, 42, 10, 12, 16, 2, '#5d6166');
  // chave inglesa
  line(ctx, 70, 34, 100, 30, '#9aa0a5', 4);
  circle(ctx, 102, 30, 5, '#9aa0a5');
  // morsa
  shadedBox(ctx, w - 34, 6, 26, 22, 3, '#3f5b6e');
  ctx.fillStyle = 'rgba(40,30,20,0.4)';
  ctx.fillRect(10, h - 10, 20, 4);
};

const toolShelf: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, '#6f7478');
  let x = 6;
  while (x < w - 12) {
    const bw = rng.range(12, 24);
    shadedBox(ctx, x, 6, bw - 3, h - 12, 2, rng.pick(['#a33a2e', '#3a5d8a', '#b08a5a', '#4d5c3a', '#c46b33']), { light: 0.1, lineWidth: 1 });
    x += bw;
  }
};

const cabinet: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, '#7d8286');
  line(ctx, 4, h / 2, w - 4, h / 2, '#5a5e62', 1.5);
  line(ctx, w / 2 - 6, h - 6, w / 2 + 6, h - 6, '#4a4e52', 2);
};

// ------------------------------------------------------------------ telhado

const roofAc: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#a2a7aa');
  circle(ctx, w / 2, h / 2, Math.min(w, h) / 2 - 6, '#50565a', '#3a3f42', 1.5);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) line(ctx, w / 2, h / 2, w / 2 + Math.cos(a) * 14, h / 2 + Math.sin(a) * 14, '#7b8185', 2);
};

const roofVent: PropDrawer = (ctx, w, h) => {
  ball(ctx, w / 2, h / 2, w / 2 - 2, '#8b9093');
  circle(ctx, w / 2, h / 2, w / 4, '#54595c');
};

// ------------------------------------------------------------------ registro

const CAR_COLORS: Record<string, string> = {
  'prop.car.red': '#8e3b35',
  'prop.car.blue': '#3e5b78',
  'prop.car.white': '#c7c4bb',
  'prop.car.green': '#56684a',
  'prop.car.gray': '#6a6d70',
};

export const PROP_DRAWERS: Record<string, PropDrawer> = {
  ...Object.fromEntries(Object.entries(CAR_COLORS).map(([id, c]) => [id, car(c)])),
  'prop.car.wreck': car('#3d3935', true),
  'prop.van': van,
  'prop.bus': bus,
  'prop.barricade': barricade,
  'prop.barrier': concreteBarrier,
  'prop.cone': cone,
  'prop.lamp': lamp,
  'prop.hydrant': hydrant,
  'prop.trashbags': trashBags,
  'prop.dumpster': dumpster,
  'prop.trashcan': trashCan,
  'prop.bench': bench,
  'prop.tire': tire,
  'prop.tires': tires,
  'prop.pallet': pallet,
  'prop.crate': crate,
  'prop.box': box,
  'prop.boxes': boxes,
  'prop.drum': drum,
  'prop.cart': cart,
  'prop.tree.large.a': canopy('#4f6b3c', 7),
  'prop.tree.large.b': canopy('#667046', 8),
  'prop.tree.small': canopy('#587845', 6),
  'prop.bush.a': canopy('#4a6a3c', 5),
  'prop.bush.b': canopy(mix('#4a6a3c', '#7a6a3a', 0.4), 5),
  'prop.hedge': hedge,
  'prop.bed.double': bed(2, '#6b4f5e'),
  'prop.bed.single': bed(1, '#4f6a5e'),
  'prop.sofa': seat(3),
  'prop.armchair': seat(1),
  'prop.coffeetable': coffeeTable,
  'prop.tv': tv,
  'prop.rug.a': rug('#7a4a3e', '#c9a86a'),
  'prop.rug.b': rug('#3f5566', '#a9b3a0'),
  'prop.diningtable': diningTable,
  'prop.counter': counter,
  'prop.fridge': fridge,
  'prop.stove': stove,
  'prop.toilet': toilet,
  'prop.bathtub': bathtub,
  'prop.bathsink': bathSink,
  'prop.wardrobe': wardrobe,
  'prop.nightstand': nightstand,
  'prop.desk': desk,
  'prop.chair': chair,
  'prop.shelf.store': storeShelf,
  'prop.checkout': checkout,
  'prop.fridge.display': displayFridge,
  'prop.workbench': workbench,
  'prop.toolshelf': toolShelf,
  'prop.cabinet': cabinet,
  ...NATURE_PROP_DRAWERS,
  'roof.ac': roofAc,
  'roof.vent': roofVent,
};

/** Objetos do telhado (não estão no catálogo do mundo; o RoofSystem os usa). */
export const ROOF_PROPS = [
  { id: 'roof.ac', width: 62, height: 52 },
  { id: 'roof.vent', width: 30, height: 30 },
] as const;

/** Semente estável por id: o mesmo objeto sai sempre igual. */
export function seedFor(id: string): Random {
  return new Random(hashString(id));
}
