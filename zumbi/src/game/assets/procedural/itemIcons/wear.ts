/**
 * Ícones de roupa, calçado, chapéu, bolsa, mochila, tecido e cama/banho.
 * Roupas aparecem "dobradas de frente" — silhueta reconhecível em 30 px.
 */
import { circle, rgba } from '../canvas';
import { OUTLINE, box, c1, disc, ellipse, poly, rotated, stroke, shade, type IconDrawer } from './kit';

export const shirt: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#6a8ab0');
  const k = spec.k;
  const sleeve = k === 'tank' ? 0 : k === 'collar' || k === 'plaid' || k === 'hood' ? 0.2 : 0.12;
  const pts: [number, number][] = [
    [0.36, 0.16], [0.64, 0.16],
    [0.64 + sleeve + 0.06, 0.22], [0.9, 0.22 + sleeve * 1.6],
    [0.8, 0.28 + sleeve * 1.6], [0.72, 0.3],
    [0.72, 0.86], [0.28, 0.86], [0.28, 0.3],
    [0.2, 0.28 + sleeve * 1.6], [0.1, 0.22 + sleeve * 1.6],
    [0.36 - sleeve - 0.06, 0.22],
  ];
  if (k === 'tank') poly(ctx, [[0.36, 0.14], [0.44, 0.14], [0.5, 0.26], [0.56, 0.14], [0.64, 0.14], [0.7, 0.3], [0.7, 0.86], [0.3, 0.86], [0.3, 0.3]].map(([x, y]) => [s * x!, s * y!] as const), col);
  else poly(ctx, pts.map(([x, y]) => [s * x, s * y] as const), col);
  if (k === 'plaid') {
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 5; i++) {
      stroke(ctx, [[s * (0.3 + i * 0.1), s * 0.3], [s * (0.3 + i * 0.1), s * 0.84]], '#1a1a1a', 1.5);
      stroke(ctx, [[s * 0.3, s * (0.36 + i * 0.1)], [s * 0.7, s * (0.36 + i * 0.1)]], '#1a1a1a', 1.5);
    }
    ctx.restore();
  }
  if (k === 'collar') {
    poly(ctx, [[s * 0.4, s * 0.16], [s * 0.5, s * 0.28], [s * 0.6, s * 0.16]], shade(col, 0.25));
    for (let i = 0; i < 4; i++) circle(ctx, s * 0.5, s * (0.36 + i * 0.12), 1.3, shade(col, -0.4));
  } else if (k === 'hood') {
    ellipse(ctx, s * 0.5, s * 0.18, s * 0.16, s * 0.08, shade(col, -0.25), OUTLINE);
    box(ctx, s * 0.36, s * 0.6, s * 0.28, s * 0.14, 3, shade(col, -0.12), 'rgba(0,0,0,0.3)', 1);
  } else if (k !== 'tank') {
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.16, s * 0.1, 0, Math.PI);
    ctx.strokeStyle = shade(col, -0.35);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
};

export const jacket: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#3a5a8a');
  const k = spec.k;
  const long = k === 'coat' || k === 'rain';
  const bottom = long ? 0.92 : 0.84;
  poly(
    ctx,
    [[0.34, 0.14], [0.66, 0.14], [0.86, 0.24], [0.94, 0.62], [0.82, 0.64], [0.76, 0.36], [0.74, bottom], [0.26, bottom], [0.24, 0.36], [0.18, 0.64], [0.06, 0.62], [0.14, 0.24]].map(([x, y]) => [s * x!, s * y!] as const),
    col,
  );
  stroke(ctx, [[s * 0.5, s * 0.18], [s * 0.5, s * bottom]], shade(col, -0.4), 1.6);
  poly(ctx, [[s * 0.38, s * 0.14], [s * 0.5, s * 0.34], [s * 0.62, s * 0.14]], shade(col, 0.2));
  if (k === 'puffer') for (let i = 0; i < 4; i++) stroke(ctx, [[s * 0.26, s * (0.34 + i * 0.12)], [s * 0.74, s * (0.34 + i * 0.12)]], shade(col, -0.3), 1.2);
  else {
    box(ctx, s * 0.3, s * 0.56, s * 0.14, s * 0.1, 2, shade(col, -0.12), 'rgba(0,0,0,0.3)', 1);
    box(ctx, s * 0.56, s * 0.56, s * 0.14, s * 0.1, 2, shade(col, -0.12), 'rgba(0,0,0,0.3)', 1);
  }
};

export const pants: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#3a5a8a');
  const short = spec.k === 'short';
  const overall = spec.k === 'overall';
  const b = short ? 0.62 : 0.92;
  if (overall) {
    box(ctx, s * 0.34, s * 0.08, s * 0.32, s * 0.22, 3, col);
    stroke(ctx, [[s * 0.36, s * 0.1], [s * 0.3, s * 0.02]], col, 3);
    stroke(ctx, [[s * 0.64, s * 0.1], [s * 0.7, s * 0.02]], col, 3);
  }
  poly(ctx, [[0.26, 0.26], [0.74, 0.26], [0.8, b], [0.56, b], [0.5, 0.44], [0.44, b], [0.2, b]].map(([x, y]) => [s * x!, s * y!] as const), col);
  box(ctx, s * 0.26, s * 0.24, s * 0.48, s * 0.07, 1, shade(col, -0.25), OUTLINE, 1);
  stroke(ctx, [[s * 0.34, s * 0.3], [s * 0.4, s * 0.38]], rgba(shade(col, 0.4), 0.7), 1.2);
  stroke(ctx, [[s * 0.66, s * 0.3], [s * 0.6, s * 0.38]], rgba(shade(col, 0.4), 0.7), 1.2);
};

export const vest: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#e8e03a');
  poly(ctx, [[0.3, 0.14], [0.42, 0.14], [0.5, 0.34], [0.58, 0.14], [0.7, 0.14], [0.78, 0.3], [0.76, 0.86], [0.24, 0.86], [0.22, 0.3]].map(([x, y]) => [s * x!, s * y!] as const), col);
  if (spec.k === 'reflective') {
    stroke(ctx, [[s * 0.25, s * 0.56], [s * 0.75, s * 0.56]], '#d8d8d8', 3);
    stroke(ctx, [[s * 0.25, s * 0.7], [s * 0.75, s * 0.7]], '#d8d8d8', 3);
  } else {
    box(ctx, s * 0.3, s * 0.44, s * 0.4, s * 0.32, 3, shade(col, 0.1), 'rgba(0,0,0,0.5)', 1);
    stroke(ctx, [[s * 0.34, s * 0.52], [s * 0.66, s * 0.52]], '#5a5a5a', 1.5);
  }
};

export const shoes: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#e8e8e0');
  const k = spec.k;
  if (k === 'socks') {
    for (const dx of [-0.12, 0.12]) {
      poly(ctx, [[0.38, 0.14], [0.56, 0.14], [0.56, 0.62], [0.66, 0.78], [0.56, 0.88], [0.4, 0.8], [0.38, 0.6]].map(([x, y]) => [s * (x! + dx), s * y!] as const), col);
      stroke(ctx, [[s * (0.38 + dx), s * 0.2], [s * (0.56 + dx), s * 0.2]], '#8a8a8a', 2);
    }
    return;
  }
  for (const dx of [-0.13, 0.13]) {
    rotated(ctx, s, dx < 0 ? -6 : 6, () => {
      if (k === 'flip') {
        ellipse(ctx, s * (0.5 + dx), s * 0.52, s * 0.12, s * 0.3, col);
        stroke(ctx, [[s * (0.44 + dx), s * 0.44], [s * (0.5 + dx), s * 0.32], [s * (0.56 + dx), s * 0.44]], '#f2f2f2', 1.8);
        return;
      }
      ellipse(ctx, s * (0.5 + dx), s * 0.54, s * 0.12, s * 0.32, col);
      ellipse(ctx, s * (0.5 + dx), s * 0.64, s * 0.09, s * 0.16, shade(col, -0.25), null);
      if (k === 'boot') box(ctx, s * (0.39 + dx), s * 0.62, s * 0.22, s * 0.28, 4, shade(col, -0.1));
      for (let i = 0; i < 3; i++) stroke(ctx, [[s * (0.46 + dx), s * (0.36 + i * 0.07)], [s * (0.54 + dx), s * (0.36 + i * 0.07)]], '#f2f2f2', 1);
    });
  }
};

export const gloves: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#c8a06a');
  const thin = spec.k === 'thin';
  for (const [dx, rot] of [[-0.12, -12], [0.12, 12]] as const) {
    rotated(ctx, s, rot, () => {
      const cx = s * (0.5 + dx);
      box(ctx, cx - s * 0.12, s * 0.38, s * 0.24, s * 0.3, 5, col, thin ? 'rgba(120,150,170,0.8)' : OUTLINE);
      for (let i = 0; i < 4; i++) box(ctx, cx - s * 0.12 + i * s * 0.062, s * 0.2 + (i === 0 || i === 3 ? 4 : 0), s * 0.055, s * 0.22, 2.5, col, thin ? 'rgba(120,150,170,0.8)' : OUTLINE, 1);
      box(ctx, cx - s * 0.12, s * 0.66, s * 0.24, s * 0.12, 2, shade(col, -0.2), thin ? null : OUTLINE, 1);
    });
  }
};

export const hat: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#c8342a');
  switch (spec.k) {
    case 'beanie':
      ctx.beginPath();
      ctx.moveTo(s * 0.18, s * 0.66);
      ctx.quadraticCurveTo(s * 0.5, s * 0.02, s * 0.82, s * 0.66);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
      box(ctx, s * 0.16, s * 0.6, s * 0.68, s * 0.16, 4, shade(col, -0.15));
      disc(ctx, s * 0.5, s * 0.2, s * 0.07, shade(col, 0.2));
      return;
    case 'hardhat':
    case 'helmet':
      disc(ctx, s * 0.5, s * 0.5, s * 0.3, col);
      if (spec.k === 'hardhat') {
        ellipse(ctx, s * 0.5, s * 0.66, s * 0.4, s * 0.1, shade(col, -0.1), OUTLINE);
        stroke(ctx, [[s * 0.5, s * 0.22], [s * 0.5, s * 0.56]], shade(col, 0.2), 3);
      } else {
        poly(ctx, [[s * 0.28, s * 0.44], [s * 0.72, s * 0.44], [s * 0.7, s * 0.62], [s * 0.3, s * 0.62]], '#2a3a4a');
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(s * 0.32, s * 0.47, s * 0.2, 2);
      }
      return;
    case 'goggles':
      stroke(ctx, [[s * 0.1, s * 0.5], [s * 0.9, s * 0.5]], '#2a2a2a', 3);
      for (const x of [0.34, 0.66]) ellipse(ctx, s * x, s * 0.5, s * 0.15, s * 0.12, 'rgba(191,224,232,0.85)', OUTLINE);
      return;
    default:
      // boné: copa + aba
      ellipse(ctx, s * 0.5, s * 0.66, s * 0.2, s * 0.12, shade(col, -0.2), OUTLINE);
      disc(ctx, s * 0.5, s * 0.44, s * 0.26, col);
      disc(ctx, s * 0.5, s * 0.44, 2.2, shade(col, -0.3), null);
  }
};

export const handbag: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#7a5a3a');
  switch (spec.k) {
    case 'plastic':
      poly(ctx, [[0.24, 0.3], [0.76, 0.3], [0.82, 0.86], [0.18, 0.86]].map(([x, y]) => [s * x!, s * y!] as const), 'rgba(242,242,242,0.9)', 'rgba(80,80,80,0.8)');
      for (const x of [0.32, 0.62]) {
        ctx.beginPath();
        ctx.arc(s * (x + 0.03), s * 0.3, s * 0.08, Math.PI, 0);
        ctx.strokeStyle = 'rgba(80,80,80,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      return;
    case 'pouch':
      stroke(ctx, [[s * 0.04, s * 0.52], [s * 0.96, s * 0.52]], '#1a1a1a', 3);
      box(ctx, s * 0.26, s * 0.36, s * 0.48, s * 0.3, 8, col);
      stroke(ctx, [[s * 0.3, s * 0.46], [s * 0.7, s * 0.46]], '#8a8a8a', 1.2);
      return;
    case 'suitcase':
    case 'toolbox':
      box(ctx, s * 0.12, s * 0.32, s * 0.76, s * 0.5, 5, col);
      stroke(ctx, [[s * 0.38, s * 0.32], [s * 0.38, s * 0.2], [s * 0.62, s * 0.2], [s * 0.62, s * 0.32]], OUTLINE, 3.5);
      if (spec.k === 'toolbox') box(ctx, s * 0.44, s * 0.46, s * 0.12, s * 0.08, 1, '#c8c8c0');
      else stroke(ctx, [[s * 0.12, s * 0.56], [s * 0.88, s * 0.56]], shade(col, -0.35), 1.5);
      return;
    case 'duffel':
      box(ctx, s * 0.08, s * 0.38, s * 0.84, s * 0.4, 12, col);
      stroke(ctx, [[s * 0.3, s * 0.4], [s * 0.5, s * 0.2], [s * 0.7, s * 0.4]], OUTLINE, 3);
      stroke(ctx, [[s * 0.14, s * 0.46], [s * 0.86, s * 0.46]], '#c8c8c0', 1.2);
      return;
    case 'shopping':
      poly(ctx, [[0.22, 0.34], [0.78, 0.34], [0.74, 0.86], [0.26, 0.86]].map(([x, y]) => [s * x!, s * y!] as const), col);
      for (const x of [0.36, 0.64]) stroke(ctx, [[s * (x - 0.06), s * 0.36], [s * x, s * 0.18], [s * (x + 0.06), s * 0.36]], OUTLINE, 2.5);
      return;
    default:
      // bolsa lateral: alça atravessada
      stroke(ctx, [[s * 0.16, s * 0.1], [s * 0.72, s * 0.5]], '#3a2a1a', 3);
      box(ctx, s * 0.36, s * 0.4, s * 0.48, s * 0.4, 5, col);
      box(ctx, s * 0.36, s * 0.4, s * 0.48, s * 0.18, 5, shade(col, -0.15));
  }
};

export const backpack: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#3a6ab0');
  const big = spec.big;
  const w = big ? 0.64 : 0.56;
  const x = (1 - w) / 2;
  stroke(ctx, [[s * 0.38, s * 0.2], [s * 0.42, s * 0.08], [s * 0.58, s * 0.08], [s * 0.62, s * 0.2]], OUTLINE, 3);
  box(ctx, s * x, s * 0.18, s * w, s * 0.7, 9, col);
  box(ctx, s * (x + 0.08), s * 0.52, s * (w - 0.16), s * 0.26, 5, shade(col, -0.15));
  stroke(ctx, [[s * (x + 0.1), s * 0.58], [s * (x + w - 0.1), s * 0.58]], '#c8c8c0', 1.2);
  if (big) box(ctx, s * (x - 0.04), s * 0.8, s * (w + 0.08), s * 0.1, 4, '#5a4a3a');
};

export const towel: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#3a8ab0');
  if (spec.k === 'pillow') {
    box(ctx, s * 0.12, s * 0.26, s * 0.76, s * 0.48, 14, col);
    return;
  }
  for (let i = 2; i >= 0; i--) box(ctx, s * 0.14, s * (0.3 + i * 0.12), s * 0.72, s * 0.2, 4, shade(col, -i * 0.08));
  if (spec.k !== 'sheet') stroke(ctx, [[s * 0.16, s * 0.36], [s * 0.84, s * 0.36]], shade(col, 0.3), 1.2);
};

export const cloth: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#c8b8a0');
  switch (spec.k) {
    case 'rag':
      poly(ctx, [[0.2, 0.32], [0.46, 0.22], [0.8, 0.3], [0.86, 0.6], [0.66, 0.8], [0.3, 0.76], [0.14, 0.56]].map(([x, y]) => [s * x!, s * y!] as const), col);
      stroke(ctx, [[s * 0.3, s * 0.4], [s * 0.7, s * 0.6]], rgba(shade(col, -0.3), 0.6), 1.2);
      return;
    case 'leather':
      poly(ctx, [[0.16, 0.3], [0.5, 0.2], [0.84, 0.32], [0.8, 0.72], [0.5, 0.82], [0.2, 0.7]].map(([x, y]) => [s * x!, s * y!] as const), col);
      return;
    case 'tarp':
      box(ctx, s * 0.12, s * 0.3, s * 0.76, s * 0.42, 3, col);
      for (const [x, y] of [[0.18, 0.36], [0.82, 0.36], [0.18, 0.66], [0.82, 0.66]] as const) circle(ctx, s * x, s * y, 2, '#c8c8c0');
      return;
    case 'plasticbag':
      poly(ctx, [[0.22, 0.26], [0.78, 0.3], [0.8, 0.8], [0.2, 0.78]].map(([x, y]) => [s * x!, s * y!] as const), 'rgba(242,242,242,0.85)', 'rgba(90,90,90,0.8)');
      return;
    case 'rubber':
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.28, 0, Math.PI * 2);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 6;
      ctx.stroke();
      return;
    case 'mask':
      box(ctx, s * 0.22, s * 0.34, s * 0.56, s * 0.32, 6, col);
      for (const y of [0.44, 0.52, 0.6]) stroke(ctx, [[s * 0.26, s * y], [s * 0.74, s * y]], shade(col, -0.2), 1);
      stroke(ctx, [[s * 0.22, s * 0.4], [s * 0.1, s * 0.5]], '#f2f2f2', 1.5);
      stroke(ctx, [[s * 0.78, s * 0.4], [s * 0.9, s * 0.5]], '#f2f2f2', 1.5);
      return;
    case 'scarf':
      rotated(ctx, s, -30, () => {
        box(ctx, s * 0.1, s * 0.4, s * 0.8, s * 0.18, 4, col);
        for (let i = 0; i < 5; i++) stroke(ctx, [[s * (0.84 + i * 0.01), s * (0.42 + i * 0.035)], [s * 0.96, s * (0.42 + i * 0.035)]], col, 1.5);
      });
      return;
    default:
      for (let i = 2; i >= 0; i--) box(ctx, s * 0.18, s * (0.3 + i * 0.1), s * 0.64, s * 0.2, 3, shade(col, -i * 0.1));
  }
};
