/**
 * Ícones de embalagens: lata, pacote, garrafa, pote, caixa, caixinha, saco,
 * balde, barra, copinho.
 */
import { circle, rgba } from '../canvas';
import { OUTLINE, box, c1, c2, disc, ellipse, label, poly, rotated, shine, stroke, shade, type IconDrawer } from './kit';

export const can: IconDrawer = (ctx, s, spec) => {
  const body = c1(spec, '#9aa0a6');
  const lab = c2(spec, '#c8342a');
  if (spec.k === 'flat') {
    // lata baixa (sardinha, atum): vista de cima, oval com anel de abrir
    ellipse(ctx, s * 0.5, s * 0.52, s * 0.34, s * 0.24, shade(body, 0.05));
    ellipse(ctx, s * 0.5, s * 0.52, s * 0.28, s * 0.18, lab, null);
    ellipse(ctx, s * 0.5, s * 0.5, s * 0.22, s * 0.13, shade(body, 0.15), 'rgba(0,0,0,0.3)');
    ctx.strokeStyle = shade(body, -0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s * 0.32, s * 0.5, s * 0.05, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  const big = spec.big ? 0.06 : 0;
  const soda = spec.k === 'soda';
  const w = s * (soda ? 0.36 : 0.44 + big);
  const h = s * (soda ? 0.64 : 0.58 + big);
  const x = (s - w) / 2;
  const y = s * 0.2 - big * s * 0.5;
  box(ctx, x, y, w, h, 5, soda ? lab : body);
  if (soda) {
    ctx.fillStyle = rgba(shade(body, 0.2), 0.9);
    ctx.fillRect(x, y + h * 0.4, w, h * 0.16);
  } else {
    label(ctx, x, y + h * 0.18, w, h * 0.55, lab);
  }
  shine(ctx, x + w * 0.14, y + 2, w * 0.1, h - 4, 0.25);
  ellipse(ctx, s / 2, y + 1.5, w / 2, s * 0.05, shade('#b8bcc0', 0.1), '#6b6f73');
  if (soda) circle(ctx, s / 2 + 2, y + 1.5, 1.8, '#7d8185');
};

export const bag: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#d9922e');
  const lab = c2(spec, '#f3dfa9');
  const big = spec.big;
  const w = s * (big ? 0.56 : 0.5);
  const h = s * (big ? 0.66 : 0.56);
  const x = (s - w) / 2;
  const y = (s - h) / 2 + 1;
  rotated(ctx, s, big ? 0 : -12, () => {
    // pacote com bordas seladas serrilhadas em cima e embaixo
    poly(
      ctx,
      [
        [x + 2, y],
        [x + w - 2, y],
        [x + w, y + h * 0.12],
        [x + w - 1, y + h * 0.88],
        [x + w - 2, y + h],
        [x + 2, y + h],
        [x, y + h * 0.88],
        [x + 1, y + h * 0.12],
      ],
      col,
    );
    ctx.fillStyle = shade(col, -0.25);
    ctx.fillRect(x + 1, y + 1, w - 2, 3);
    ctx.fillRect(x + 1, y + h - 4, w - 2, 3);
    box(ctx, x + w * 0.18, y + h * 0.3, w * 0.64, h * 0.38, 3, lab, 'rgba(0,0,0,0.3)', 1);
    shine(ctx, x + w * 0.1, y + 5, 2, h - 10, 0.22);
  });
};

export const bar: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#4a2a1a');
  const wrap = c2(spec, '#c8342a');
  rotated(ctx, s, -25, () => {
    box(ctx, s * 0.14, s * 0.36, s * 0.72, s * 0.28, 3, col);
    if (wrap !== col) box(ctx, s * 0.14, s * 0.36, s * 0.36, s * 0.28, 3, wrap, null);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(s * (0.5 + i * 0.09), s * 0.38);
      ctx.lineTo(s * (0.5 + i * 0.09), s * 0.62);
      ctx.stroke();
    }
    shine(ctx, s * 0.18, s * 0.39, s * 0.6, 2, 0.25);
  });
};

export const box_: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#e8c84a');
  const lab = c2(spec, '#c8342a');
  if (spec.k === 'flat') {
    rotated(ctx, s, -15, () => {
      box(ctx, s * 0.18, s * 0.32, s * 0.64, s * 0.36, 3, col);
      box(ctx, s * 0.24, s * 0.38, s * 0.3, s * 0.24, 2, lab, null);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(s * 0.6, s * 0.4, s * 0.16, 2);
      ctx.fillRect(s * 0.6, s * 0.46, s * 0.12, 2);
    });
    return;
  }
  if (spec.k === 'tray' || spec.k === 'pizza') {
    box(ctx, s * 0.14, s * 0.22, s * 0.72, s * 0.56, 4, col);
    if (spec.k === 'pizza') {
      disc(ctx, s * 0.5, s * 0.5, s * 0.2, '#e8b04a', 'rgba(0,0,0,0.3)');
      for (const [dx, dy] of [[-0.08, -0.05], [0.07, -0.06], [0, 0.08], [0.09, 0.06]] as const) circle(ctx, s * (0.5 + dx), s * (0.5 + dy), s * 0.035, '#c8342a');
    } else {
      box(ctx, s * 0.22, s * 0.3, s * 0.56, s * 0.4, 3, lab, 'rgba(0,0,0,0.3)', 1);
      shine(ctx, s * 0.26, s * 0.34, s * 0.4, 2, 0.35);
    }
    return;
  }
  // caixa em pé (cereal, remédio, munição)
  const w = s * 0.46;
  const h = s * 0.62;
  const x = (s - w) / 2 - 2;
  const y = (s - h) / 2;
  poly(ctx, [[x + w, y], [x + w + 6, y + 4], [x + w + 6, y + h + 3], [x + w, y + h]], shade(col, -0.35));
  poly(ctx, [[x, y], [x + 6, y - 4], [x + w + 6, y - 4], [x + w, y]], shade(col, 0.2));
  box(ctx, x, y, w, h, 2, col);
  box(ctx, x + w * 0.15, y + h * 0.25, w * 0.7, h * 0.4, 3, lab, null);
  shine(ctx, x + 3, y + 3, 2, h - 6, 0.3);
};

export const carton: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#f0922a');
  const lab = c2(spec, '#3a8a4a');
  const big = spec.big;
  const w = s * (big ? 0.42 : 0.34);
  const h = s * (big ? 0.64 : 0.5);
  const x = (s - w) / 2;
  const y = s * 0.24;
  poly(ctx, [[x, y], [x + w / 2, y - s * 0.1], [x + w, y]], shade(col, 0.15));
  box(ctx, x, y, w, h, 2, col);
  label(ctx, x, y + h * 0.35, w, h * 0.35, lab);
  if (!big) stroke(ctx, [[x + w * 0.7, y - 2], [x + w * 0.9, y - s * 0.16]], '#f2f2f2', 2);
  shine(ctx, x + 3, y + 2, 2, h - 4, 0.3);
};

export const bottle: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#8fc3dc');
  const cap = c2(spec, '#2f78c4');
  const k = spec.k ?? '';
  const big = spec.big;
  if (k === 'jug') {
    // galão com alça
    box(ctx, s * 0.22, s * 0.26, s * 0.56, s * 0.6, 8, col);
    stroke(ctx, [[s * 0.56, s * 0.28], [s * 0.72, s * 0.14], [s * 0.78, s * 0.3]], OUTLINE, 5);
    stroke(ctx, [[s * 0.56, s * 0.28], [s * 0.72, s * 0.14], [s * 0.78, s * 0.3]], shade(col, 0.1), 3);
    box(ctx, s * 0.3, s * 0.12, s * 0.16, s * 0.16, 2, cap);
    shine(ctx, s * 0.27, s * 0.32, 3, s * 0.46, 0.35);
    return;
  }
  if (k === 'thermos') {
    rotated(ctx, s, -20, () => {
      box(ctx, s * 0.36, s * 0.24, s * 0.28, s * 0.66, 6, col);
      box(ctx, s * 0.34, s * 0.1, s * 0.32, s * 0.16, 4, cap);
      shine(ctx, s * 0.4, s * 0.28, 2, s * 0.56, 0.3);
    });
    return;
  }
  const glass = k === 'glass';
  const pet = k === 'pet' || k === 'emptyPet' || k === 'pump';
  const small = k === 'small';
  const empty = k === 'empty' || k === 'emptyPet';
  rotated(ctx, s, big ? -15 : -28, () => {
    const w = s * (small ? 0.24 : big ? 0.32 : 0.28);
    const h = s * (small ? 0.4 : big ? 0.58 : 0.52);
    const x = (s - w) / 2;
    const y = s * (small ? 0.4 : 0.36);
    const neck = glass ? s * 0.1 : s * 0.07;
    // ombro + gargalo
    poly(ctx, [[x, y + 4], [x + w * 0.3, y - s * 0.08], [x + w * 0.7, y - s * 0.08], [x + w, y + 4]], empty ? rgba(col, 0.55) : col, OUTLINE);
    box(ctx, s / 2 - neck / 2, y - s * 0.08 - s * 0.1, neck, s * 0.11, 1.5, empty ? rgba(col, 0.55) : col);
    box(ctx, x, y, w, h, pet ? 5 : 4, empty ? rgba(col, 0.45) : col);
    if (!empty && k !== 'milk') label(ctx, x, y + h * 0.3, w, h * 0.34, glass ? shade(cap, 0.1) : shade(col, -0.25));
    if (k === 'milk') label(ctx, x, y + h * 0.35, w, h * 0.3, cap);
    if (k === 'pump') stroke(ctx, [[s / 2, y - s * 0.2], [s / 2, y - s * 0.28], [s / 2 + 6, y - s * 0.28]], '#2a2a2a', 3);
    else box(ctx, s / 2 - neck / 2 - 1, y - s * 0.22, neck + 2, s * 0.06, 1, glass ? '#c8a24a' : cap);
    shine(ctx, x + w * 0.18, y + 3, 2, h - 6, glass ? 0.2 : 0.35);
  });
};

export const jar: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#e8a42a');
  const lid = c2(spec, '#c8a24a');
  box(ctx, s * 0.26, s * 0.3, s * 0.48, s * 0.52, 7, col);
  box(ctx, s * 0.24, s * 0.18, s * 0.52, s * 0.14, 3, lid);
  label(ctx, s * 0.26, s * 0.46, s * 0.48, s * 0.18, '#f2ead8');
  shine(ctx, s * 0.32, s * 0.34, 3, s * 0.42, 0.35);
};

export const cup: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#f2f2f2');
  const lab = c2(spec, '#e84a8a');
  poly(ctx, [[s * 0.28, s * 0.26], [s * 0.72, s * 0.26], [s * 0.66, s * 0.8], [s * 0.34, s * 0.8]], col);
  ctx.fillStyle = lab;
  ctx.fillRect(s * 0.31, s * 0.42, s * 0.38, s * 0.18);
  ellipse(ctx, s / 2, s * 0.26, s * 0.23, s * 0.06, shade('#e8e8e8', 0.1), OUTLINE);
};

export const sack: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#9a9a9a');
  const lab = c2(spec, '#2a5aa0');
  const empty = spec.k === 'empty';
  if (empty) {
    rotated(ctx, s, -20, () => {
      poly(ctx, [[s * 0.18, s * 0.34], [s * 0.82, s * 0.3], [s * 0.86, s * 0.66], [s * 0.2, s * 0.7]], col);
      stroke(ctx, [[s * 0.3, s * 0.4], [s * 0.7, s * 0.38]], 'rgba(0,0,0,0.2)', 1);
    });
    return;
  }
  poly(
    ctx,
    [
      [s * 0.22, s * 0.2],
      [s * 0.78, s * 0.2],
      [s * 0.84, s * 0.5],
      [s * 0.8, s * 0.84],
      [s * 0.2, s * 0.84],
      [s * 0.16, s * 0.5],
    ],
    col,
  );
  stroke(ctx, [[s * 0.22, s * 0.24], [s * 0.78, s * 0.24]], shade(col, -0.35), 2);
  box(ctx, s * 0.3, s * 0.4, s * 0.4, s * 0.26, 2, lab, null);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(s * 0.34, s * 0.48, s * 0.3, 2);
};

export const bucket: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#3a6ab0');
  const k = spec.k;
  if (k === 'jerrycan') {
    box(ctx, s * 0.2, s * 0.22, s * 0.6, s * 0.64, 5, col);
    stroke(ctx, [[s * 0.3, s * 0.36], [s * 0.7, s * 0.72]], shade(col, -0.3), 3);
    stroke(ctx, [[s * 0.7, s * 0.36], [s * 0.3, s * 0.72]], shade(col, -0.3), 3);
    box(ctx, s * 0.62, s * 0.12, s * 0.12, s * 0.12, 2, '#2a2a2a');
    box(ctx, s * 0.26, s * 0.14, s * 0.3, s * 0.08, 2, shade(col, -0.2));
    return;
  }
  if (k === 'watering') {
    box(ctx, s * 0.22, s * 0.36, s * 0.42, s * 0.44, 5, col);
    stroke(ctx, [[s * 0.62, s * 0.5], [s * 0.86, s * 0.26]], OUTLINE, 5);
    stroke(ctx, [[s * 0.62, s * 0.5], [s * 0.86, s * 0.26]], col, 3);
    ellipse(ctx, s * 0.87, s * 0.24, 4, 2.5, shade(col, 0.2), OUTLINE, -0.8);
    stroke(ctx, [[s * 0.26, s * 0.36], [s * 0.42, s * 0.18], [s * 0.6, s * 0.36]], OUTLINE, 3);
    return;
  }
  poly(ctx, [[s * 0.22, s * 0.3], [s * 0.78, s * 0.3], [s * 0.7, s * 0.84], [s * 0.3, s * 0.84]], k === 'paint' ? c1(spec, '#f2f2f2') : col);
  if (k === 'paint') label(ctx, s * 0.26, s * 0.46, s * 0.48, s * 0.2, c2(spec, '#3a8ab0'));
  ellipse(ctx, s / 2, s * 0.3, s * 0.28, s * 0.07, shade(k === 'paint' ? c2(spec, '#3a8ab0') : col, -0.3), OUTLINE);
  ctx.beginPath();
  ctx.arc(s / 2, s * 0.32, s * 0.3, Math.PI * 1.05, Math.PI * 1.95);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();
};
