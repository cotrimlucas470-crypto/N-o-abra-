/**
 * Desenho procedural dos objetos da expansão do mapa: casa (cômoda,
 * estante, beliche...), comércio (gôndola, vitrine, arara...), trabalho
 * (porta-paletes, torno, armário de metal...) e serviços (carteira, banco
 * de igreja, maca...). Mesmas convenções de props.ts: fundo encostado no
 * topo (norte), luz de cima/esquerda.
 */
import { ball, circle, line, rgba, roundRect, shade, shadedBox, speckle } from './canvas';
import type { PropDrawer } from './props';

const WOOD = '#7a5a3c';
const METAL = '#7d8286';
const ITEM_COLORS = ['#b8433a', '#d8a73c', '#4f7a9a', '#6d8a4a', '#d9d4c8', '#7a4f82', '#c46b33'];

// ------------------------------------------------------------------ casa

const dresser: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, shade(WOOD, 0.04), { light: 0.12 });
  for (let i = 1; i < 3; i++) line(ctx, 4, (h * i) / 3, w - 4, (h * i) / 3, 'rgba(40,28,18,0.55)', 1.5);
  for (let i = 0; i < 3; i++) {
    const y = (h * (i + 0.5)) / 3;
    circle(ctx, w * 0.3, y, 2, '#c9b27a');
    circle(ctx, w * 0.7, y, 2, '#c9b27a');
  }
  shadedBox(ctx, w * 0.62, 3, 18, 10, 2, '#d8d3c6', { light: 0.05 });
};

const bookshelf: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, shade(WOOD, -0.1));
  let x = 5;
  while (x < w - 7) {
    const bw = rng.range(3, 7);
    if (rng.chance(0.12)) {
      x += bw + 2;
      continue;
    }
    ctx.fillStyle = shade(rng.pick(ITEM_COLORS), rng.range(-0.25, 0));
    ctx.fillRect(x, 4 + rng.range(0, 3), bw, h - 9);
    x += bw + 0.6;
  }
};

const bunkBed: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, shade(WOOD, -0.1));
  shadedBox(ctx, 5, 12, w - 10, h - 18, 4, '#dcd8cf', { light: 0.05 });
  shadedBox(ctx, 5, 16, w - 10, 20, 6, '#eeebe4', { light: 0.08 });
  shadedBox(ctx, 4, h * 0.36, w - 8, h * 0.6, 5, '#3f5a78', { light: 0.12 });
  // escada lateral e grade do andar de cima
  for (let y = 18; y < h - 10; y += 16) line(ctx, w - 4, y, w - 12, y, shade(WOOD, -0.3), 2);
  for (const [x0, y0] of [[3, 3], [w - 7, 3], [3, h - 7], [w - 7, h - 7]] as const) shadedBox(ctx, x0, y0, 5, 5, 1, shade(WOOD, -0.25));
};

const crib: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#e4ddd0', { light: 0.1 });
  shadedBox(ctx, 6, 6, w - 12, h - 12, 3, '#c9dbe4', { light: 0.1 });
  for (let x = 6; x < w - 4; x += 7) {
    line(ctx, x, 2, x, 6, '#bdb4a3', 1.5);
    line(ctx, x, h - 6, x, h - 2, '#bdb4a3', 1.5);
  }
  ball(ctx, w * 0.62, h * 0.35, 7, '#d9b44a');
};

const washer: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 4, '#e2e1dc', { light: 0.1 });
  line(ctx, 4, 12, w - 4, 12, '#b5b4ae', 1.5);
  circle(ctx, w / 2, h / 2 + 5, 17, '#5b6770', '#8e969c', 3);
  circle(ctx, w / 2 - 5, h / 2, 5, 'rgba(200,220,235,0.35)');
  for (let i = 0; i < 3; i++) circle(ctx, 10 + i * 9, 6.5, 2.2, '#5a5e62');
};

const laundrySink: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#bdbab2', { light: 0.1 });
  shadedBox(ctx, 6, 8, w - 12, h - 14, 4, '#8e969c', { light: -0.15 });
  for (let y = 12; y < h - 8; y += 5) line(ctx, 9, y, w - 9, y, 'rgba(60,64,68,0.4)', 1);
  circle(ctx, w / 2, 5, 3, '#6a7074');
};

const shoeRack: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, shade(WOOD, 0.05));
  for (let x = 5; x < w - 12; x += 13) {
    if (rng.chance(0.25)) continue;
    const c = rng.pick(['#2a2a2e', '#6b4a2c', '#c8c4ba', '#3a5d8a', '#a33a2e']);
    shadedBox(ctx, x, 5, 5, h - 10, 2, c, { lineWidth: 1 });
    shadedBox(ctx, x + 6, 5, 5, h - 10, 2, c, { lineWidth: 1 });
  }
};

const shower: PropDrawer = (ctx, w, h) => {
  ctx.globalAlpha = 0.9;
  shadedBox(ctx, 2, 2, w - 4, h - 4, 3, '#c6d2d6', { light: -0.05, outline: '#97a3a7' });
  for (let x = 8; x < w - 4; x += 8) line(ctx, x, 4, x, h - 4, 'rgba(120,135,140,0.35)', 1);
  for (let y = 8; y < h - 4; y += 8) line(ctx, 4, y, w - 4, y, 'rgba(120,135,140,0.35)', 1);
  circle(ctx, w / 2, h / 2, 4, '#6e787c', '#4e585c', 1);
  circle(ctx, w / 2, 8, 6, '#9aa2a6', '#6a7276', 1.5);
  ctx.globalAlpha = 1;
};

const chest: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 5, shade(WOOD, -0.15), { light: 0.14 });
  for (const x of [8, w - 12]) shadedBox(ctx, x, 1, 4, h - 2, 1, '#5d6166');
  shadedBox(ctx, w / 2 - 5, h - 12, 10, 9, 2, '#c9b27a');
};

function plantPot(leaf: string): PropDrawer {
  return (ctx, w, h, rng) => {
    circle(ctx, w / 2, h / 2, w / 2 - 5, '#a4583a', '#6e3a26', 1.5);
    for (let i = 0; i < 9; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(4, w / 2 - 2);
      ball(ctx, w / 2 + Math.cos(a) * r * 0.7, h / 2 + Math.sin(a) * r * 0.7, rng.range(4, 7), shade(leaf, rng.range(-0.15, 0.1)), false);
    }
  };
}

const freezer: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 4, '#e6e6e2', { light: 0.1 });
  shadedBox(ctx, 6, 6, w - 12, h - 16, 3, 'rgba(170,200,215,0.7)', { light: 0.1, lineWidth: 1 });
  line(ctx, w / 2, 6, w / 2, h - 10, '#b9bdc0', 2);
  line(ctx, w * 0.3, h - 5, w * 0.7, h - 5, '#8f9396', 3);
};

const ironingBoard: PropDrawer = (ctx, w, h) => {
  ctx.fillStyle = '#5f7f8f';
  ctx.beginPath();
  ctx.moveTo(4, h / 2 - 9);
  ctx.lineTo(w - 26, h / 2 - 11);
  ctx.quadraticCurveTo(w - 2, h / 2, w - 26, h / 2 + 11);
  ctx.lineTo(4, h / 2 + 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3e5460';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  shadedBox(ctx, 12, h / 2 - 6, 22, 12, 3, '#d8d6d0', { lineWidth: 1 });
};

// ------------------------------------------------------------------ comércio

const gondola: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#9aa0a4', { light: 0.1 });
  line(ctx, 3, h / 2, w - 3, h / 2, '#5c6064', 3);
  // dois lados de prateleira (gôndola dupla, corredor dos dois lados)
  for (const [y0, rowH] of [[4, h / 2 - 7], [h / 2 + 3, h / 2 - 7]] as const) {
    let x = 5;
    while (x < w - 10) {
      const iw = rng.range(6, 13);
      if (rng.chance(0.22)) {
        x += iw;
        continue;
      }
      ctx.fillStyle = shade(rng.pick(ITEM_COLORS), rng.range(-0.1, 0.1));
      roundRect(ctx, x, y0 + rng.range(0, 3), iw - 2, rowH - rng.range(0, 4), 2);
      ctx.fill();
      x += iw;
    }
  }
  shadedBox(ctx, 1, 1, 8, h - 2, 2, '#c8342a');
  shadedBox(ctx, w - 9, 1, 8, h - 2, 2, '#c8342a');
};

const bakeryCounter: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#d8d2c2', { light: 0.1 });
  ctx.fillStyle = 'rgba(170,200,215,0.55)';
  ctx.fillRect(5, h * 0.35, w - 10, h * 0.55);
  for (let x = 12; x < w - 12; x += 11) {
    if (rng.chance(0.35)) continue;
    ball(ctx, x, h * 0.62 + rng.range(-3, 3), rng.range(4, 6), rng.pick(['#c98a44', '#e0b872', '#8a4f2a', '#f0e0c0']), false);
  }
  line(ctx, 5, h * 0.35, w - 5, h * 0.35, '#8a9092', 2);
};

const clothesRack: PropDrawer = (ctx, w, h, rng) => {
  line(ctx, 4, h / 2, w - 4, h / 2, '#9aa0a4', 3);
  for (const x of [5, w - 5]) circle(ctx, x, h / 2, 4, '#5c6064');
  let x = 10;
  while (x < w - 10) {
    if (rng.chance(0.2)) {
      x += 9;
      continue;
    }
    const c = shade(rng.pick(ITEM_COLORS), rng.range(-0.2, 0.1));
    shadedBox(ctx, x, h / 2 - rng.range(14, 19), 6, rng.range(28, 36), 2, c, { lineWidth: 1 });
    x += 7;
  }
};

const mannequin: PropDrawer = (ctx, w, h) => {
  circle(ctx, w / 2, h / 2, 13, '#5f5a54', '#3c3834', 1);
  shadedBox(ctx, 5, h / 2 - 8, w - 10, 16, 7, '#d9c9b0', { light: 0.1 });
  ball(ctx, w / 2, h / 2, 6, '#e8dccb');
};

const vending: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#b8342c', { light: 0.1 });
  shadedBox(ctx, 5, 16, w * 0.62, h - 22, 2, '#2a2c30', { light: 0.15 });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      if (rng.chance(0.3)) continue;
      circle(ctx, 11 + c * 9.5, 22 + r * 10, 3, rng.pick(ITEM_COLORS));
    }
  }
  shadedBox(ctx, w * 0.72, 18, 12, 18, 2, '#d8d6d0', { lineWidth: 1 });
  line(ctx, 6, 8, w - 6, 8, 'rgba(255,255,255,0.4)', 3);
};

const barCounter: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 4, shade(WOOD, -0.18), { light: 0.12 });
  shadedBox(ctx, 1, h - 12, w - 2, 11, 3, shade(WOOD, 0.1));
  for (let x = 12; x < w - 12; x += 18) {
    if (rng.chance(0.4)) continue;
    circle(ctx, x, 14, 4, rng.pick(['#2d6a4a', '#8a5a2a', '#d8c060', '#e8e4dc']), '#333', 1);
  }
  for (let x = 20; x < w; x += 44) circle(ctx, x, h + 10, 9, '#3a2a20');
};

const shopCounter: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#8a8580', { light: 0.1 });
  shadedBox(ctx, w * 0.62, 8, 36, 26, 3, '#3c3f44');
  ctx.fillStyle = '#7fb0a0';
  ctx.fillRect(w * 0.62 + 5, 12, 26, 7);
  shadedBox(ctx, 12, 10, 30, 22, 1, '#e3dfd4', { light: 0.03 });
};

const fuelPump: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 4, '#d8d6d0', { light: 0.1 });
  shadedBox(ctx, 5, 5, w - 10, 16, 2, '#c8342a');
  shadedBox(ctx, 8, 26, w - 16, 12, 1, '#2a3a30', { light: 0.1 });
  line(ctx, w - 6, 40, w - 6, h - 8, '#2a2a2a', 3);
  shadedBox(ctx, w - 12, h - 14, 9, 10, 2, '#3a3a3a');
};

// ------------------------------------------------------------------ trabalho

const palletRack: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 1, '#3f5b6e', { light: 0.05 });
  for (let x = 2; x < w; x += 92) shadedBox(ctx, x, 1, 6, h - 2, 1, '#e08a2a');
  let x = 10;
  while (x < w - 60) {
    if (rng.chance(0.25)) {
      x += 90;
      continue;
    }
    shadedBox(ctx, x, 6, 76, h - 12, 2, '#b08a5a', { light: 0.1 });
    shadedBox(ctx, x + 6, 10, 64, h - 20, 2, rng.pick(['#c8b48a', '#d9d4c8', '#8a9a6a', '#6a7a8a']), { light: 0.12 });
    line(ctx, x + 6, h / 2, x + 70, h / 2, 'rgba(60,40,20,0.4)', 1.5);
    x += 92;
  }
};

const lathe: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 8, w - 2, h - 16, 3, '#3f6e5a', { light: 0.1 });
  shadedBox(ctx, 4, 2, 34, h - 4, 3, '#355c4b', { light: 0.1 });
  line(ctx, 40, h / 2, w - 30, h / 2, '#b9bdc0', 5);
  shadedBox(ctx, w - 30, 10, 24, h - 20, 3, '#355c4b');
  circle(ctx, 22, h / 2, 9, '#8a9296', '#4a5256', 1.5);
};

const compressor: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 4, 6, w - 8, h - 12, 12, '#c8342a', { light: 0.15 });
  shadedBox(ctx, w * 0.25, 2, w * 0.5, 16, 3, '#3a3a3a');
  circle(ctx, w * 0.35, 10, 4, '#d8d6d0', '#555', 1);
  circle(ctx, 8, h - 6, 4, '#222');
  circle(ctx, w - 8, h - 6, 4, '#222');
};

const welder: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#2f4a8a', { light: 0.12 });
  shadedBox(ctx, 6, 6, 18, 12, 1, '#1a1c20', { light: 0.1 });
  circle(ctx, w - 12, 12, 5, '#d8d6d0', '#444', 1);
  line(ctx, 8, h - 6, w - 8, h - 8, '#1a1a1a', 3);
};

const toolbox: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#b8342c', { light: 0.14 });
  for (let i = 1; i < 4; i++) line(ctx, 4, (h * i) / 4, w - 4, (h * i) / 4, 'rgba(40,10,10,0.5)', 1.5);
  line(ctx, w * 0.3, h - 5, w * 0.7, h - 5, '#d8d6d0', 2);
};

const locker: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, '#5d7a8a', { light: 0.1 });
  for (let x = w / 3; x < w - 2; x += w / 3) line(ctx, x, 3, x, h - 3, '#3e5460', 1.5);
  for (let i = 0; i < 3; i++) {
    const x0 = (w * i) / 3;
    for (let y = 6; y < 16; y += 3) line(ctx, x0 + 6, y, x0 + w / 3 - 6, y, 'rgba(30,40,48,0.5)', 1);
    circle(ctx, x0 + w / 3 - 6, h - 9, 2, '#c9c2b0');
  }
};

const fileCabinet: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, METAL, { light: 0.1 });
  for (let i = 1; i < 4; i++) line(ctx, 3, (h * i) / 4, w - 3, (h * i) / 4, '#555a5e', 1.5);
  for (let i = 0; i < 4; i++) line(ctx, w / 2 - 5, (h * (i + 0.5)) / 4, w / 2 + 5, (h * (i + 0.5)) / 4, '#3a3e42', 2);
};

function cargoContainer(color: string): PropDrawer {
  return (ctx, w, h, rng) => {
    shadedBox(ctx, 1, 1, w - 2, h - 2, 2, color, { light: 0.08 });
    for (let x = 10; x < w - 6; x += 9) line(ctx, x, 4, x, h - 4, rgba(shade(color, -0.35), 0.55), 2);
    shadedBox(ctx, 1, 1, w - 2, 8, 1, shade(color, -0.15));
    shadedBox(ctx, 1, h - 9, w - 2, 8, 1, shade(color, -0.15));
    speckle(ctx, w, h, 60, ['rgba(120,70,40,0.4)', 'rgba(60,40,30,0.35)'], 1, 4, rng);
  };
}

// ------------------------------------------------------------------ serviços

const schoolDesk: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h * 0.55, 3, '#c9a86a', { light: 0.1 });
  shadedBox(ctx, 8, h * 0.58, w - 16, h * 0.4, 4, '#3f5b6e');
  line(ctx, 10, 8, 24, 10, '#2a2a2a', 1.5);
};

const blackboard: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 1, '#6b4a2c');
  ctx.fillStyle = '#2f4a3a';
  ctx.fillRect(4, 2, w - 8, h - 5);
  line(ctx, 20, 6, 60, 6, 'rgba(230,230,220,0.6)', 1);
  line(ctx, 80, 5, 140, 7, 'rgba(230,230,220,0.5)', 1);
};

const pew: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, 12, 3, shade(WOOD, -0.2));
  shadedBox(ctx, 1, 11, w - 2, h - 13, 3, shade(WOOD, 0.02), { light: 0.12 });
  for (const x of [2, w - 8]) shadedBox(ctx, x, 1, 6, h - 2, 2, shade(WOOD, -0.25));
};

const altar: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#e8e2d4', { light: 0.1 });
  shadedBox(ctx, 6, h * 0.3, w - 12, h * 0.4, 1, '#8a2a3a');
  line(ctx, w / 2, 8, w / 2, 26, '#c9a44a', 3);
  line(ctx, w / 2 - 7, 14, w / 2 + 7, 14, '#c9a44a', 3);
  for (const x of [16, w - 16]) {
    shadedBox(ctx, x - 3, 8, 6, 14, 1, '#f2eee4', { lineWidth: 1 });
    circle(ctx, x, 7, 2, '#f0b84a');
  }
};

const stretcher: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 4, '#b9bdc0', { light: 0.1 });
  shadedBox(ctx, 6, 6, w - 12, h - 12, 5, '#dfe8ec', { light: 0.06 });
  shadedBox(ctx, 10, 10, w - 20, 22, 6, '#f2f2ee', { light: 0.08 });
  line(ctx, 8, h * 0.55, w - 8, h * 0.55, '#6a8a9a', 3);
};

const medCabinet: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, '#e8e8e4', { light: 0.1 });
  ctx.fillStyle = 'rgba(170,200,215,0.5)';
  ctx.fillRect(5, 5, w - 10, h - 10);
  for (let x = 8; x < w - 8; x += 7) {
    if (rng.chance(0.35)) continue;
    shadedBox(ctx, x, 8, 5, h - 16, 1, rng.pick(['#f2f2ee', '#d8342a', '#4a8ac8', '#e8c84a']), { lineWidth: 0.8 });
  }
  line(ctx, w / 2, 3, w / 2, h - 3, '#9aa2a6', 1.5);
  ctx.fillStyle = '#d8342a';
  ctx.fillRect(w / 2 - 1.5, 1, 3, 4);
};

const treadmill: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 5, '#3a3c40', { light: 0.1 });
  shadedBox(ctx, 10, 26, w - 20, h - 34, 3, '#1f2023', { light: 0.05 });
  shadedBox(ctx, 4, 3, w - 8, 18, 4, '#55585d');
  ctx.fillStyle = '#4ab07a';
  ctx.fillRect(w / 2 - 10, 8, 20, 6);
};

const weightBench: PropDrawer = (ctx, w, h) => {
  line(ctx, 4, 20, w - 4, 20, '#9aa0a4', 4);
  for (const x of [6, w - 6]) circle(ctx, x, 20, 7, '#2a2a2a', '#555', 1);
  shadedBox(ctx, w / 2 - 12, 30, 24, h - 36, 6, '#2a2a2e', { light: 0.12 });
};

const dumbbellRack: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, '#4a4d52');
  for (let x = 10; x < w - 10; x += 20) {
    line(ctx, x, h / 2, x + 12, h / 2, '#b9bdc0', 3);
    circle(ctx, x, h / 2, 5, '#1f1f22');
    circle(ctx, x + 12, h / 2, 5, '#1f1f22');
  }
};

// ------------------------------------------------------------------ miudezas

const floorLamp: PropDrawer = (ctx, w, h) => {
  circle(ctx, w / 2, h / 2, w / 2 - 1, '#e8dcb8', '#b8a878', 1.5);
  circle(ctx, w / 2, h / 2, 4, '#fff6d8');
};

const stool: PropDrawer = (ctx, w, h) => {
  circle(ctx, w / 2, h / 2, w / 2 - 2, shade(WOOD, 0.08), shade(WOOD, -0.3), 1.5);
  circle(ctx, w / 2, h / 2, w / 4, shade(WOOD, 0.18));
};

const sideTable: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, shade(WOOD, 0.02), { light: 0.12 });
  circle(ctx, w * 0.62, h * 0.4, 5, '#d8cfae', '#8a7a58', 1);
  line(ctx, 6, h - 6, 16, h - 6, '#c9b27a', 2);
};

const laundryBasket: PropDrawer = (ctx, w, h, rng) => {
  circle(ctx, w / 2, h / 2, Math.min(w, h) / 2 - 1, '#c9b48a', '#8a7450', 1.5);
  for (let i = 0; i < 4; i++) ball(ctx, w / 2 + rng.range(-6, 6), h / 2 + rng.range(-5, 5), rng.range(4, 6), rng.pick(ITEM_COLORS), false);
};

const wallShelf: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 1, shade(WOOD, -0.05));
  let x = 5;
  while (x < w - 10) {
    const bw = rng.range(6, 12);
    if (!rng.chance(0.25)) shadedBox(ctx, x, 3, bw - 2, h - 7, 1, rng.pick(ITEM_COLORS), { lineWidth: 0.8 });
    x += bw;
  }
};

const coatRack: PropDrawer = (ctx, w, h) => {
  circle(ctx, w / 2, h / 2, w / 2 - 2, '#3a3028', '#1f1a15', 1);
  for (const [dx, dy, c] of [[-6, -4, '#3f5a78'], [5, -5, '#6b4f5e'], [0, 7, '#5f6a4a']] as const) ball(ctx, w / 2 + dx, h / 2 + dy, 6, c, false);
  circle(ctx, w / 2, h / 2, 3, '#6b4a2c');
};

const toyBox: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 4, '#3f7ab0', { light: 0.15 });
  ball(ctx, w * 0.3, h * 0.45, 5, '#e8c84a');
  shadedBox(ctx, w * 0.55, h * 0.25, 12, 10, 2, '#c8342a', { lineWidth: 0.8 });
};

// ------------------------------------------------------------------ quintal e rua

const clothesline: PropDrawer = (ctx, w, h, rng) => {
  for (const x of [4, w - 4]) circle(ctx, x, h / 2, 3.5, '#6f7478', '#3a3e42', 1);
  line(ctx, 4, h / 2, w - 4, h / 2, 'rgba(220,220,210,0.9)', 1.2);
  let x = 16;
  while (x < w - 22) {
    const cw = rng.range(12, 20);
    if (!rng.chance(0.2)) {
      ctx.fillStyle = rgba(rng.pick(ITEM_COLORS), 0.95);
      roundRect(ctx, x, h / 2 - 2, cw, rng.range(10, 16), 2);
      ctx.fill();
    }
    x += cw + rng.range(3, 7);
  }
};

const grill: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#7a6a5a', { light: 0.1 });
  shadedBox(ctx, 6, 6, w - 12, h - 14, 2, '#2a2624');
  for (let x = 10; x < w - 8; x += 6) line(ctx, x, 8, x, h - 10, '#8a8680', 1.2);
  speckle(ctx, w, h, 10, ['rgba(40,30,25,0.5)'], 1, 2, rng);
};

const waterTank: PropDrawer = (ctx, w, h) => {
  circle(ctx, w / 2, h / 2, w / 2 - 2, '#3f6fa0', '#27496b', 2);
  circle(ctx, w / 2, h / 2, w / 2 - 12, '#4a7fb3', '#355f88', 1.5);
  circle(ctx, w / 2, h / 2, 8, '#2f5a84', '#1f3f60', 1.5);
};

const doghouse: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#8a4a2e', { light: 0.12 });
  line(ctx, w / 2, 2, w / 2, h - 2, '#5e3220', 2);
  shadedBox(ctx, w / 2 - 9, h - 14, 18, 12, 6, '#2a1a12');
};

const bicycle: PropDrawer = (ctx, w, h) => {
  for (const x of [16, w - 16]) {
    ctx.strokeStyle = '#1f1f22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, h / 2, 14, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  line(ctx, 16, h / 2, w - 16, h / 2, '#b8342c', 3);
  line(ctx, w / 2 - 6, h / 2 - 2, w / 2 - 12, h / 2 - 9, '#b8342c', 2.5);
  shadedBox(ctx, w / 2 - 20, h / 2 - 12, 12, 6, 2, '#2a2a2a', { lineWidth: 0.8 });
  line(ctx, w - 18, h / 2 - 2, w - 22, h / 2 - 11, '#6f7478', 2);
};

const gardenBed: PropDrawer = (ctx, w, h, rng) => {
  ctx.globalAlpha = 0.95;
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#5a4230', { light: -0.05, outline: '#6b4a2c' });
  for (let row = 0; row < 3; row++) {
    const y = 10 + row * ((h - 20) / 2);
    for (let x = 10; x < w - 8; x += 13) if (!rng.chance(0.2)) ball(ctx, x + rng.range(-2, 2), y, rng.range(4, 6), rng.pick(['#4a7a3c', '#6a8a3a', '#3f6a30']), false);
  }
  ctx.globalAlpha = 1;
};

const busStop: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, 18, 2, 'rgba(150,180,195,0.7)', { light: 0.1, outline: '#5a6a72' });
  shadedBox(ctx, 10, 22, w - 20, 12, 3, '#6f7478');
  for (const x of [4, w - 8]) shadedBox(ctx, x, 1, 4, h - 6, 1, '#3a3e42');
  shadedBox(ctx, w - 30, h - 20, 22, 16, 2, '#d8a73c', { lineWidth: 0.8 });
};

const newsstand: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#2f6a4a', { light: 0.12 });
  shadedBox(ctx, 6, h - 26, w - 12, 20, 2, '#d8d2c2');
  for (let x = 10; x < w - 14; x += 12) shadedBox(ctx, x, h - 23, 9, 13, 1, rng.pick(ITEM_COLORS), { lineWidth: 0.6 });
  line(ctx, 6, 14, w - 6, 14, 'rgba(255,255,255,0.35)', 3);
};

export const MORE_PROP_DRAWERS: Record<string, PropDrawer> = {
  'prop.clothesline': clothesline,
  'prop.grill': grill,
  'prop.watertank': waterTank,
  'prop.doghouse': doghouse,
  'prop.bicycle': bicycle,
  'prop.gardenbed': gardenBed,
  'prop.busstop': busStop,
  'prop.newsstand': newsstand,
  'prop.floorlamp': floorLamp,
  'prop.stool': stool,
  'prop.sidetable': sideTable,
  'prop.laundrybasket': laundryBasket,
  'prop.wallshelf': wallShelf,
  'prop.coatrack': coatRack,
  'prop.toybox': toyBox,
  'prop.dresser': dresser,
  'prop.bookshelf': bookshelf,
  'prop.bunkbed': bunkBed,
  'prop.crib': crib,
  'prop.washer': washer,
  'prop.laundrysink': laundrySink,
  'prop.shoerack': shoeRack,
  'prop.shower': shower,
  'prop.chest': chest,
  'prop.plantpot.a': plantPot('#4a7a3c'),
  'prop.plantpot.b': plantPot('#6a8a3a'),
  'prop.freezer': freezer,
  'prop.ironingboard': ironingBoard,
  'prop.gondola': gondola,
  'prop.bakerycounter': bakeryCounter,
  'prop.clothesrack': clothesRack,
  'prop.mannequin': mannequin,
  'prop.vending': vending,
  'prop.barcounter': barCounter,
  'prop.shopcounter': shopCounter,
  'prop.fuelpump': fuelPump,
  'prop.palletrack': palletRack,
  'prop.lathe': lathe,
  'prop.compressor': compressor,
  'prop.welder': welder,
  'prop.toolbox': toolbox,
  'prop.locker': locker,
  'prop.filecabinet': fileCabinet,
  'prop.container.a': cargoContainer('#8a4a2e'),
  'prop.container.b': cargoContainer('#2e5a7a'),
  'prop.schooldesk': schoolDesk,
  'prop.blackboard': blackboard,
  'prop.pew': pew,
  'prop.altar': altar,
  'prop.stretcher': stretcher,
  'prop.medcabinet': medCabinet,
  'prop.treadmill': treadmill,
  'prop.weightbench': weightBench,
  'prop.dumbbellrack': dumbbellRack,
};
