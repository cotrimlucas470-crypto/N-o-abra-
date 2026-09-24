/**
 * Ícones de materiais, remédios, eletrônicos, natureza e objetos variados.
 */
import { circle, rgba } from '../canvas';
import { OUTLINE, bar, box, c1, c2, disc, ellipse, label, poly, rotated, shine, stroke, shade, type IconDrawer } from './kit';

export const bits: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#9aa1a8');
  switch (spec.k) {
    case 'nails':
    case 'screws':
      for (const [x, y, a] of [[0.3, 0.34, 20], [0.52, 0.3, -30], [0.66, 0.5, 70], [0.4, 0.6, -60], [0.58, 0.7, 10], [0.28, 0.52, 95]] as const) {
        ctx.save();
        ctx.translate(s * x, s * y);
        ctx.rotate((a * Math.PI) / 180);
        stroke(ctx, [[0, -s * 0.12], [0, s * 0.12]], OUTLINE, 3);
        stroke(ctx, [[0, -s * 0.12], [0, s * 0.12]], col, 1.8);
        if (spec.k === 'screws') for (let i = -2; i <= 2; i++) stroke(ctx, [[-2, i * 3], [2, i * 3 + 1]], shade(col, -0.4), 0.8);
        stroke(ctx, [[-s * 0.045, -s * 0.12], [s * 0.045, -s * 0.12]], shade(col, -0.3), 2.2);
        ctx.restore();
      }
      return;
    case 'hinge':
      box(ctx, s * 0.14, s * 0.3, s * 0.34, s * 0.4, 2, col);
      box(ctx, s * 0.52, s * 0.3, s * 0.34, s * 0.4, 2, col);
      box(ctx, s * 0.46, s * 0.26, s * 0.08, s * 0.48, 3, shade(col, -0.2));
      for (const [x, y] of [[0.26, 0.4], [0.26, 0.6], [0.74, 0.4], [0.74, 0.6]] as const) circle(ctx, s * x, s * y, 2, shade(col, -0.45));
      return;
    case 'shards':
      for (const [x, y, r] of [[0.36, 0.4, 0], [0.62, 0.5, 1.2], [0.44, 0.66, 2.2]] as const) {
        ctx.save();
        ctx.translate(s * x, s * y);
        ctx.rotate(r);
        poly(ctx, [[-8, -6], [8, -3], [2, 9]], 'rgba(191,224,232,0.8)', 'rgba(60,90,100,0.9)');
        ctx.restore();
      }
      return;
    case 'scrap':
      poly(ctx, [[s * 0.16, s * 0.4], [s * 0.5, s * 0.24], [s * 0.62, s * 0.44], [s * 0.36, s * 0.62]], '#8a8278');
      poly(ctx, [[s * 0.46, s * 0.58], [s * 0.84, s * 0.5], [s * 0.78, s * 0.8], [s * 0.5, s * 0.78]], '#7a5a44');
      stroke(ctx, [[s * 0.3, s * 0.3], [s * 0.72, s * 0.72]], '#6a6f74', 3);
      return;
    case 'gears':
      for (const [x, y, r] of [[0.4, 0.44, 0.2], [0.66, 0.64, 0.14]] as const) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          box(ctx, s * x + Math.cos(a) * s * r - 3, s * y + Math.sin(a) * s * r - 3, 6, 6, 1, col, OUTLINE, 1);
        }
        disc(ctx, s * x, s * y, s * r, col);
        disc(ctx, s * x, s * y, s * r * 0.35, '#2a2a2a', null);
      }
      return;
    case 'plug':
      rotated(ctx, s, -35, () => {
        box(ctx, s * 0.42, s * 0.14, s * 0.16, s * 0.34, 3, '#f2f2f2');
        box(ctx, s * 0.4, s * 0.48, s * 0.2, s * 0.12, 1, '#8a8a8a');
        stroke(ctx, [[s * 0.5, s * 0.6], [s * 0.5, s * 0.86]], '#9aa0a6', 3);
      });
      return;
    case 'tire':
      disc(ctx, s / 2, s / 2, s * 0.38, '#1b1b1d');
      disc(ctx, s / 2, s / 2, s * 0.2, '#6a6d70');
      disc(ctx, s / 2, s / 2, s * 0.08, '#2a2a2a', null);
      return;
    case 'padlock':
      ctx.beginPath();
      ctx.arc(s / 2, s * 0.38, s * 0.14, Math.PI, 0);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = '#b8bcc0';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      box(ctx, s * 0.28, s * 0.38, s * 0.44, s * 0.4, 4, col);
      circle(ctx, s / 2, s * 0.56, 2.4, '#2a2a2a');
      return;
    case 'knob':
      disc(ctx, s * 0.5, s * 0.42, s * 0.22, col);
      box(ctx, s * 0.44, s * 0.6, s * 0.12, s * 0.2, 2, shade(col, -0.2));
      return;
    case 'worms':
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(s * 0.2, s * (0.3 + i * 0.12));
        ctx.bezierCurveTo(s * 0.4, s * (0.2 + i * 0.12), s * 0.6, s * (0.44 + i * 0.12), s * 0.8, s * (0.32 + i * 0.12));
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      return;
    default:
      disc(ctx, s / 2, s / 2, s * 0.2, col);
  }
};

export const coil: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#c8a06a');
  const k = spec.k;
  if (k === 'chain') {
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(s * (0.2 + i * 0.15), s * (0.3 + i * 0.1));
      ctx.rotate(i % 2 ? 0.8 : -0.4);
      ellipse(ctx, 0, 0, s * 0.1, s * 0.06, 'rgba(0,0,0,0)', OUTLINE);
      ctx.lineWidth = 3;
      ctx.strokeStyle = col;
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  const w = k === 'thin' || k === 'cable' ? 2.5 : 4.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(s * 0.5, s * 0.5, s * (0.3 - i * 0.05), s * (0.22 - i * 0.035), 0, 0, Math.PI * 2);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = w + 1.6;
    ctx.stroke();
    ctx.strokeStyle = i % 2 ? shade(col, -0.12) : col;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  if (k === 'barbed') for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = s * 0.5 + Math.cos(a) * s * 0.3;
    const y = s * 0.5 + Math.sin(a) * s * 0.22;
    stroke(ctx, [[x - 3, y - 3], [x + 3, y + 3]], '#6a6a6a', 1.5);
  }
  if (k === 'cable') box(ctx, s * 0.7, s * 0.62, s * 0.16, s * 0.12, 2, '#f2f2f2');
};

export const sheet: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#9aa0a6');
  rotated(ctx, s, -12, () => {
    if (spec.k === 'glass') {
      box(ctx, s * 0.14, s * 0.2, s * 0.72, s * 0.6, 2, 'rgba(191,224,232,0.75)', 'rgba(60,90,100,0.9)');
      stroke(ctx, [[s * 0.26, s * 0.3], [s * 0.4, s * 0.7]], 'rgba(255,255,255,0.7)', 2);
      return;
    }
    box(ctx, s * 0.14, s * 0.24, s * 0.72, s * 0.52, 2, col);
    if (spec.k === 'mesh') {
      ctx.save();
      ctx.globalAlpha = 0.6;
      for (let i = 1; i < 8; i++) stroke(ctx, [[s * (0.14 + i * 0.09), s * 0.24], [s * (0.14 + i * 0.09), s * 0.76]], '#5a5a5a', 1);
      for (let i = 1; i < 6; i++) stroke(ctx, [[s * 0.14, s * (0.24 + i * 0.087)], [s * 0.86, s * (0.24 + i * 0.087)]], '#5a5a5a', 1);
      ctx.restore();
    } else {
      stroke(ctx, [[s * 0.2, s * 0.32], [s * 0.8, s * 0.32]], 'rgba(255,255,255,0.35)', 2);
      for (const [x, y] of [[0.2, 0.3], [0.8, 0.3], [0.2, 0.7], [0.8, 0.7]] as const) circle(ctx, s * x, s * y, 1.6, shade(col, -0.45));
    }
  });
};

export const roll: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#9ea3a8');
  const k = spec.k;
  disc(ctx, s * 0.48, s * 0.48, s * 0.3, col);
  disc(ctx, s * 0.48, s * 0.48, s * (k === 'paper' ? 0.08 : 0.14), k === 'bandage' ? '#cfc8b8' : '#c9b48a', 'rgba(0,0,0,0.4)', 1);
  if (k === 'bandage') poly(ctx, [[s * 0.64, s * 0.64], [s * 0.88, s * 0.76], [s * 0.84, s * 0.86], [s * 0.58, s * 0.72]], shade(col, -0.04));
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(s * 0.48, s * 0.48, s * 0.24, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
};

export const tube: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#f2f2f2');
  rotated(ctx, s, -35, () => {
    poly(ctx, [[s * 0.36, s * 0.22], [s * 0.64, s * 0.22], [s * 0.6, s * 0.8], [s * 0.4, s * 0.8]], col);
    box(ctx, s * 0.36, s * 0.14, s * 0.28, s * 0.1, 1, shade(col, -0.2));
    box(ctx, s * 0.44, s * 0.8, s * 0.12, s * 0.1, 2, c2(spec, '#c8342a'));
    label(ctx, s * 0.38, s * 0.36, s * 0.24, s * 0.2, c2(spec, '#c8342a'));
  });
};

export const brick: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#b8543a');
  if (spec.k === 'tile') {
    ctx.beginPath();
    ctx.moveTo(s * 0.18, s * 0.72);
    ctx.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.82, s * 0.72);
    ctx.lineTo(s * 0.7, s * 0.72);
    ctx.quadraticCurveTo(s * 0.5, s * 0.28, s * 0.3, s * 0.72);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    return;
  }
  poly(ctx, [[s * 0.14, s * 0.42], [s * 0.3, s * 0.3], [s * 0.86, s * 0.3], [s * 0.7, s * 0.42]], shade(col, 0.2));
  poly(ctx, [[s * 0.7, s * 0.42], [s * 0.86, s * 0.3], [s * 0.86, s * 0.6], [s * 0.7, s * 0.72]], shade(col, -0.25));
  box(ctx, s * 0.14, s * 0.42, s * 0.56, s * 0.3, 1, col);
  for (const x of [0.26, 0.42, 0.58]) disc(ctx, s * (x + 0.05), s * 0.36, 2, shade(col, -0.4), null);
};

export const plank: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#b38652');
  rotated(ctx, s, -38, () => {
    const w = spec.k === 'splint' ? 0.16 : 0.28;
    box(ctx, s * (0.5 - w / 2), s * 0.04, s * w, s * 0.92, 2, col);
    ctx.strokeStyle = 'rgba(90,58,26,0.45)';
    ctx.lineWidth = 1;
    for (const x of [-0.07, 0, 0.07].slice(0, spec.k === 'splint' ? 1 : 3)) {
      ctx.beginPath();
      ctx.moveTo(s * (0.5 + x), s * 0.08);
      ctx.bezierCurveTo(s * (0.52 + x), s * 0.35, s * (0.48 + x), s * 0.6, s * (0.5 + x), s * 0.92);
      ctx.stroke();
    }
    if (spec.k === 'splint') for (const y of [0.3, 0.7]) stroke(ctx, [[s * 0.38, s * y], [s * 0.62, s * y]], '#f2f2f2', 3);
  });
};

export const log: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#7a5232');
  const split = spec.k === 'split';
  rotated(ctx, s, -25, () => {
    const n = split ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const y = split ? 0.3 + i * 0.16 : 0.34;
      const h = split ? 0.14 : 0.32;
      box(ctx, s * 0.14, s * y, s * 0.64, s * h, 3, col);
      ellipse(ctx, s * 0.8, s * (y + h / 2), s * 0.06, s * h * 0.5, '#d8b88a', OUTLINE);
      if (!split) {
        ellipse(ctx, s * 0.8, s * (y + h / 2), s * 0.03, s * h * 0.26, 'rgba(0,0,0,0)', 'rgba(120,80,40,0.8)');
        for (let j = 0; j < 3; j++) stroke(ctx, [[s * (0.2 + j * 0.16), s * (y + 0.06)], [s * (0.3 + j * 0.16), s * (y + 0.06)]], rgba(shade(col, -0.4), 0.7), 1);
      }
    }
  });
};

export const stick: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#7a5232');
  if (spec.k === 'bamboo') {
    rotated(ctx, s, -40, () => {
      bar(ctx, [[s * 0.5, s * 0.04], [s * 0.5, s * 0.96]], col, 6, 'butt');
      for (const y of [0.3, 0.6]) stroke(ctx, [[s * 0.44, s * y], [s * 0.56, s * y]], shade(col, -0.4), 2);
    });
    return;
  }
  bar(ctx, [[s * 0.14, s * 0.84], [s * 0.52, s * 0.46], [s * 0.86, s * 0.16]], col, 4);
  bar(ctx, [[s * 0.52, s * 0.46], [s * 0.72, s * 0.52]], col, 2.5);
  bar(ctx, [[s * 0.36, s * 0.62], [s * 0.3, s * 0.42]], col, 2);
};

export const stone: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#8a8a82');
  if (spec.k === 'shard') {
    poly(ctx, [[s * 0.2, s * 0.62], [s * 0.56, s * 0.2], [s * 0.82, s * 0.36], [s * 0.5, s * 0.8]], col);
    stroke(ctx, [[s * 0.56, s * 0.22], [s * 0.52, s * 0.76]], shade(col, 0.3), 1);
    return;
  }
  poly(ctx, [[s * 0.2, s * 0.56], [s * 0.3, s * 0.3], [s * 0.6, s * 0.22], [s * 0.82, s * 0.42], [s * 0.76, s * 0.72], [s * 0.4, s * 0.8]], col);
  circle(ctx, s * 0.44, s * 0.4, s * 0.06, rgba(shade(col, 0.4), 0.5));
};

export const blister: IconDrawer = (ctx, s, spec) => {
  const col = c2(spec, '#c8342a');
  rotated(ctx, s, -18, () => {
    box(ctx, s * 0.18, s * 0.26, s * 0.64, s * 0.48, 5, '#c9ced3');
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) disc(ctx, s * (0.28 + c * 0.15), s * (0.4 + r * 0.2), s * 0.05, r === 1 && c === 3 ? '#9aa0a6' : c1(spec, '#f2f2f2'), 'rgba(0,0,0,0.4)', 1);
    box(ctx, s * 0.18, s * 0.26, s * 0.64, s * 0.06, 2, col, null);
  });
};

export const pill: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#f2f2f2');
  box(ctx, s * 0.3, s * 0.3, s * 0.4, s * 0.52, 6, col);
  box(ctx, s * 0.28, s * 0.18, s * 0.44, s * 0.14, 3, c2(spec, '#8a3ab0'));
  label(ctx, s * 0.3, s * 0.46, s * 0.4, s * 0.2, c2(spec, '#8a3ab0'));
  shine(ctx, s * 0.34, s * 0.34, 2, s * 0.44, 0.35);
};

export const kit: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#c8342a');
  const small = spec.k === 'small';
  const w = small ? 0.5 : 0.68;
  const x = (1 - w) / 2;
  box(ctx, s * x, s * 0.3, s * w, s * (small ? 0.4 : 0.5), 6, col);
  if (!small) stroke(ctx, [[s * 0.4, s * 0.3], [s * 0.4, s * 0.2], [s * 0.6, s * 0.2], [s * 0.6, s * 0.3]], OUTLINE, 3);
  const cy = s * (small ? 0.5 : 0.55);
  box(ctx, s * 0.44, cy - s * 0.14, s * 0.12, s * 0.28, 1, '#f7f7f7', null);
  box(ctx, s * 0.36, cy - s * 0.06, s * 0.28, s * 0.12, 1, '#f7f7f7', null);
};

export const syringe: IconDrawer = (ctx, s) => {
  rotated(ctx, s, -40, () => {
    box(ctx, s * 0.42, s * 0.3, s * 0.16, s * 0.44, 2, 'rgba(230,240,245,0.9)');
    stroke(ctx, [[s * 0.5, s * 0.3], [s * 0.5, s * 0.08]], '#aeb4ba', 1.4);
    stroke(ctx, [[s * 0.5, s * 0.74], [s * 0.5, s * 0.88]], OUTLINE, 3);
    stroke(ctx, [[s * 0.4, s * 0.88], [s * 0.6, s * 0.88]], OUTLINE, 3);
    for (let i = 0; i < 4; i++) stroke(ctx, [[s * 0.44, s * (0.38 + i * 0.08)], [s * 0.5, s * (0.38 + i * 0.08)]], '#3a8ab0', 1);
  });
};

export const device: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#3a3a3a');
  switch (spec.k) {
    case 'flashlight':
    case 'headlamp':
      if (spec.k === 'headlamp') {
        ctx.beginPath();
        ctx.ellipse(s * 0.5, s * 0.52, s * 0.32, s * 0.22, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 4;
        ctx.stroke();
        box(ctx, s * 0.36, s * 0.22, s * 0.28, s * 0.18, 4, '#3a3a3a');
        disc(ctx, s * 0.5, s * 0.31, s * 0.06, '#fdf6d8');
        return;
      }
      rotated(ctx, s, -40, () => {
        box(ctx, s * 0.4, s * 0.3, s * 0.2, s * 0.58, 4, col);
        box(ctx, s * 0.34, s * 0.1, s * 0.32, s * 0.24, 4, '#e0b43c');
        circle(ctx, s * 0.5, s * 0.14, s * 0.1, '#fdf6d8', '#9a8a4a', 1);
      });
      return;
    case 'radio':
      box(ctx, s * 0.12, s * 0.3, s * 0.76, s * 0.46, 5, col);
      stroke(ctx, [[s * 0.76, s * 0.3], [s * 0.86, s * 0.08]], '#aeb4ba', 2);
      disc(ctx, s * 0.32, s * 0.53, s * 0.13, '#1a1a1a');
      for (let i = 0; i < 3; i++) stroke(ctx, [[s * 0.24, s * (0.47 + i * 0.05)], [s * 0.4, s * (0.47 + i * 0.05)]], '#5a5a5a', 1);
      box(ctx, s * 0.52, s * 0.4, s * 0.28, s * 0.12, 1, '#c8d890', null);
      disc(ctx, s * 0.6, s * 0.64, s * 0.05, '#aeb4ba');
      disc(ctx, s * 0.74, s * 0.64, s * 0.05, '#aeb4ba');
      return;
    case 'walkie':
      box(ctx, s * 0.34, s * 0.24, s * 0.32, s * 0.62, 5, col);
      stroke(ctx, [[s * 0.42, s * 0.24], [s * 0.42, s * 0.06]], '#1a1a1a', 4);
      box(ctx, s * 0.4, s * 0.32, s * 0.2, s * 0.12, 1, '#c8d890', null);
      for (let i = 0; i < 3; i++) stroke(ctx, [[s * 0.4, s * (0.54 + i * 0.07)], [s * 0.6, s * (0.54 + i * 0.07)]], '#5a5a5a', 1.2);
      return;
    case 'phone':
      rotated(ctx, s, -15, () => {
        box(ctx, s * 0.32, s * 0.14, s * 0.36, s * 0.72, 5, col);
        box(ctx, s * 0.35, s * 0.2, s * 0.3, s * 0.56, 2, '#2a3a4a', null);
        shine(ctx, s * 0.38, s * 0.22, s * 0.06, s * 0.5, 0.18);
      });
      return;
    case 'powerbank':
      box(ctx, s * 0.24, s * 0.2, s * 0.52, s * 0.6, 6, col);
      for (let i = 0; i < 4; i++) disc(ctx, s * (0.36 + i * 0.09), s * 0.32, 2, i < 3 ? '#5fd35f' : '#3a3a3a', null);
      return;
    case 'multimeter':
      box(ctx, s * 0.26, s * 0.14, s * 0.48, s * 0.72, 5, col);
      box(ctx, s * 0.32, s * 0.2, s * 0.36, s * 0.18, 2, '#c8d890');
      disc(ctx, s * 0.5, s * 0.58, s * 0.12, '#2a2a2a');
      return;
    case 'thermometer':
      rotated(ctx, s, -40, () => {
        box(ctx, s * 0.44, s * 0.12, s * 0.12, s * 0.66, 5, '#f2f2f2');
        disc(ctx, s * 0.5, s * 0.8, s * 0.08, '#c8342a');
        stroke(ctx, [[s * 0.5, s * 0.78], [s * 0.5, s * 0.46]], '#c8342a', 2);
      });
      return;
    case 'generator':
      box(ctx, s * 0.1, s * 0.3, s * 0.8, s * 0.5, 4, col);
      stroke(ctx, [[s * 0.1, s * 0.3], [s * 0.2, s * 0.16], [s * 0.8, s * 0.16], [s * 0.9, s * 0.3]], '#1a1a1a', 3);
      disc(ctx, s * 0.34, s * 0.55, s * 0.13, '#3a3a3a');
      box(ctx, s * 0.56, s * 0.42, s * 0.24, s * 0.26, 2, '#2a2a2a');
      return;
    default:
      box(ctx, s * 0.24, s * 0.24, s * 0.52, s * 0.52, 5, col);
  }
};

export const battery: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#2a2c30');
  const band = c2(spec, '#d98b2b');
  switch (spec.k) {
    case 'car':
      box(ctx, s * 0.14, s * 0.3, s * 0.72, s * 0.5, 3, col);
      box(ctx, s * 0.22, s * 0.2, s * 0.12, s * 0.1, 1, band);
      box(ctx, s * 0.66, s * 0.2, s * 0.12, s * 0.1, 1, '#2a2a2a');
      label(ctx, s * 0.14, s * 0.46, s * 0.72, s * 0.14, band);
      return;
    case '9v':
      box(ctx, s * 0.32, s * 0.24, s * 0.36, s * 0.56, 3, col);
      box(ctx, s * 0.32, s * 0.24, s * 0.36, s * 0.2, 3, band, null);
      disc(ctx, s * 0.42, s * 0.2, 3, '#b8bcc0');
      box(ctx, s * 0.52, s * 0.16, 7, 6, 1, '#b8bcc0');
      return;
    case 'pack':
      box(ctx, s * 0.2, s * 0.3, s * 0.6, s * 0.4, 4, col);
      box(ctx, s * 0.3, s * 0.22, s * 0.4, s * 0.1, 2, band);
      for (let i = 0; i < 3; i++) disc(ctx, s * (0.36 + i * 0.1), s * 0.5, 2, '#5fd35f', null);
      return;
    default:
      for (const [dx, rot] of [[-0.12, -12], [0.12, 8]] as const) {
        ctx.save();
        ctx.translate(s * (0.5 + dx), s * 0.5);
        ctx.rotate((rot * Math.PI) / 180);
        box(ctx, -s * 0.09, -s * 0.3, s * 0.18, s * 0.6, 3, col);
        ctx.fillStyle = band;
        ctx.fillRect(-s * 0.09 + 1, -s * 0.3 + 1, s * 0.18 - 2, s * 0.2);
        ctx.fillStyle = '#b8bcc0';
        ctx.fillRect(-s * 0.04, -s * 0.35, s * 0.08, s * 0.05);
        ctx.restore();
      }
  }
};

export const board: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#2a7a4a');
  rotated(ctx, s, -10, () => {
    box(ctx, s * 0.14, s * 0.24, s * 0.72, s * 0.52, 2, col);
    stroke(ctx, [[s * 0.2, s * 0.4], [s * 0.5, s * 0.4], [s * 0.5, s * 0.6], [s * 0.8, s * 0.6]], '#c8a24a', 1.2);
    box(ctx, s * 0.26, s * 0.3, s * 0.18, s * 0.14, 1, '#1a1a1a', null);
    box(ctx, s * 0.58, s * 0.3, s * 0.2, s * 0.2, 1, '#1a1a1a', null);
    for (let i = 0; i < 4; i++) box(ctx, s * (0.22 + i * 0.1), s * 0.62, 4, 6, 1, i % 2 ? '#c8342a' : '#3a6ab0', null);
  });
};

export const bulb: IconDrawer = (ctx, s) => {
  disc(ctx, s * 0.5, s * 0.42, s * 0.24, 'rgba(250,245,210,0.9)');
  box(ctx, s * 0.4, s * 0.62, s * 0.2, s * 0.2, 2, '#aeb4ba');
  for (let i = 0; i < 3; i++) stroke(ctx, [[s * 0.4, s * (0.68 + i * 0.05)], [s * 0.6, s * (0.66 + i * 0.05)]], '#6a6f74', 1);
  stroke(ctx, [[s * 0.44, s * 0.52], [s * 0.48, s * 0.4], [s * 0.52, s * 0.52], [s * 0.56, s * 0.4]], '#c8a24a', 1);
};

export const seeds: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#d8342a');
  rotated(ctx, s, -10, () => {
    box(ctx, s * 0.24, s * 0.16, s * 0.52, s * 0.68, 3, '#f2ead0');
    disc(ctx, s * 0.5, s * 0.42, s * 0.16, col, 'rgba(0,0,0,0.4)', 1);
    for (let i = 0; i < 3; i++) stroke(ctx, [[s * (0.42 + i * 0.08), s * 0.3], [s * (0.44 + i * 0.08), s * 0.24]], '#3a8a2a', 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(s * 0.3, s * 0.66, s * 0.4, 2);
    ctx.fillRect(s * 0.3, s * 0.72, s * 0.3, 2);
  });
};

export const candle: IconDrawer = (ctx, s) => {
  box(ctx, s * 0.38, s * 0.34, s * 0.24, s * 0.52, 3, '#f2ead8');
  stroke(ctx, [[s * 0.5, s * 0.34], [s * 0.5, s * 0.26]], '#2a2a2a', 1.5);
  ellipse(ctx, s * 0.5, s * 0.2, 3, 6, '#f0a030', null);
  ellipse(ctx, s * 0.5, s * 0.22, 1.5, 3, '#fdf6d8', null);
};

export const chair: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#6a6a72');
  stroke(ctx, [[s * 0.24, s * 0.9], [s * 0.66, s * 0.14]], OUTLINE, 5);
  stroke(ctx, [[s * 0.76, s * 0.9], [s * 0.34, s * 0.14]], OUTLINE, 5);
  stroke(ctx, [[s * 0.24, s * 0.9], [s * 0.66, s * 0.14]], col, 3);
  stroke(ctx, [[s * 0.76, s * 0.9], [s * 0.34, s * 0.14]], col, 3);
  box(ctx, s * 0.22, s * 0.4, s * 0.56, s * 0.14, 3, '#3a5a8a');
};

export const book: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#a83a5a');
  const k = spec.k;
  switch (k) {
    case 'magazine':
    case 'newspaper':
      rotated(ctx, s, -10, () => {
        box(ctx, s * 0.2, s * 0.14, s * 0.6, s * 0.72, 1.5, k === 'newspaper' ? '#e8e4d8' : col);
        if (k === 'newspaper') {
          ctx.fillStyle = '#2a2a2a';
          ctx.fillRect(s * 0.26, s * 0.2, s * 0.48, s * 0.07);
          for (let i = 0; i < 6; i++) ctx.fillRect(s * 0.26, s * (0.34 + i * 0.07), s * (i % 2 ? 0.2 : 0.48), 1.5);
          box(ctx, s * 0.5, s * 0.34, s * 0.24, s * 0.18, 1, '#9a9a9a', null);
        } else {
          box(ctx, s * 0.26, s * 0.3, s * 0.48, s * 0.34, 2, shade(col, 0.3), null);
          ctx.fillStyle = '#f2f2f2';
          ctx.fillRect(s * 0.26, s * 0.2, s * 0.48, s * 0.06);
        }
      });
      return;
    case 'map':
    case 'mapmark':
      rotated(ctx, s, -8, () => {
        poly(ctx, [[s * 0.12, s * 0.24], [s * 0.38, s * 0.18], [s * 0.62, s * 0.26], [s * 0.88, s * 0.2], [s * 0.88, s * 0.76], [s * 0.62, s * 0.82], [s * 0.38, s * 0.74], [s * 0.12, s * 0.8]], col);
        stroke(ctx, [[s * 0.38, s * 0.2], [s * 0.38, s * 0.74]], 'rgba(0,0,0,0.2)', 1);
        stroke(ctx, [[s * 0.62, s * 0.26], [s * 0.62, s * 0.8]], 'rgba(0,0,0,0.2)', 1);
        stroke(ctx, [[s * 0.18, s * 0.5], [s * 0.5, s * 0.44], [s * 0.82, s * 0.56]], '#3a6ab0', 1.5);
        stroke(ctx, [[s * 0.3, s * 0.3], [s * 0.34, s * 0.72]], '#8a8a8a', 1.5);
        if (k === 'mapmark') {
          ctx.beginPath();
          ctx.arc(s * 0.64, s * 0.46, s * 0.08, 0, Math.PI * 2);
          ctx.strokeStyle = '#c8342a';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
      return;
    case 'note':
      rotated(ctx, s, -12, () => {
        box(ctx, s * 0.24, s * 0.2, s * 0.52, s * 0.6, 1, col);
        ctx.fillStyle = '#3a3a8a';
        for (let i = 0; i < 5; i++) ctx.fillRect(s * 0.3, s * (0.3 + i * 0.09), s * (i === 4 ? 0.2 : 0.4), 1.4);
      });
      return;
    case 'id':
      box(ctx, s * 0.16, s * 0.28, s * 0.68, s * 0.44, 3, col);
      box(ctx, s * 0.22, s * 0.36, s * 0.18, s * 0.24, 1, '#d8c0a0', null);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 3; i++) ctx.fillRect(s * 0.46, s * (0.4 + i * 0.07), s * 0.3, 1.6);
      return;
    case 'photo':
      rotated(ctx, s, 8, () => {
        box(ctx, s * 0.2, s * 0.22, s * 0.6, s * 0.56, 1, '#f7f7f2');
        box(ctx, s * 0.25, s * 0.27, s * 0.5, s * 0.36, 0, '#7aa0c0', null);
        disc(ctx, s * 0.4, s * 0.46, 4, '#e8c0a0', null);
        disc(ctx, s * 0.56, s * 0.44, 4, '#c8a080', null);
      });
      return;
    case 'cards':
      for (let i = 0; i < 3; i++) {
        rotated(ctx, s, -20 + i * 15, () => box(ctx, s * 0.32, s * 0.2, s * 0.36, s * 0.52, 3, '#f7f7f2'));
      }
      rotated(ctx, s, 10, () => {
        ctx.fillStyle = col;
        ctx.font = `bold ${Math.round(s * 0.22)}px sans-serif`;
        ctx.fillText('♥', s * 0.42, s * 0.52);
      });
      return;
    default: {
      // livro: capa + páginas
      const manual = k === 'manual';
      rotated(ctx, s, -8, () => {
        box(ctx, s * 0.26, s * 0.16, s * 0.52, s * 0.68, 2, '#f2ead8');
        box(ctx, s * 0.22, s * 0.14, s * 0.52, s * 0.68, 2, col);
        box(ctx, s * 0.22, s * 0.14, s * 0.08, s * 0.68, 1, shade(col, -0.3), null);
        if (manual) {
          box(ctx, s * 0.36, s * 0.26, s * 0.3, s * 0.2, 2, '#f2f2f2', null);
          ctx.fillStyle = shade(col, -0.2);
          ctx.fillRect(s * 0.4, s * 0.34, s * 0.22, 2);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillRect(s * 0.36, s * 0.3, s * 0.3, 2);
          ctx.fillRect(s * 0.36, s * 0.36, s * 0.22, 2);
        }
      });
    }
  }
};

export const jewel: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#e8c84a');
  switch (spec.k) {
    case 'money':
      for (let i = 0; i < 3; i++) {
        rotated(ctx, s, -15 + i * 12, () => {
          box(ctx, s * 0.14, s * 0.32, s * 0.72, s * 0.36, 2, i === 2 ? '#7ab86a' : '#5a9a5a');
          disc(ctx, s * 0.5, s * 0.5, s * 0.08, 'rgba(255,255,255,0.4)', null);
        });
      }
      return;
    case 'wallet':
      box(ctx, s * 0.16, s * 0.3, s * 0.68, s * 0.42, 5, '#3a2a1a');
      box(ctx, s * 0.5, s * 0.36, s * 0.34, s * 0.2, 3, '#5a3a24');
      disc(ctx, s * 0.72, s * 0.46, 2, '#c8a24a', null);
      return;
    case 'ring':
      ctx.beginPath();
      ctx.arc(s * 0.5, s * 0.56, s * 0.2, 0, Math.PI * 2);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      if (col === '#e8c84a') poly(ctx, [[s * 0.42, s * 0.36], [s * 0.5, s * 0.26], [s * 0.58, s * 0.36], [s * 0.5, s * 0.42]], '#bfe0f8');
      return;
    case 'necklace':
      ctx.beginPath();
      ctx.arc(s * 0.5, s * 0.36, s * 0.28, 0.2, Math.PI - 0.2);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      poly(ctx, [[s * 0.5, s * 0.6], [s * 0.6, s * 0.72], [s * 0.5, s * 0.84], [s * 0.4, s * 0.72]], '#c8342a');
      return;
    case 'watch':
      box(ctx, s * 0.42, s * 0.1, s * 0.16, s * 0.8, 3, col === '#e8c84a' ? '#3a2a1a' : '#2a2a2a');
      disc(ctx, s * 0.5, s * 0.5, s * 0.17, col);
      disc(ctx, s * 0.5, s * 0.5, s * 0.12, '#f7f7f2', null);
      stroke(ctx, [[s * 0.5, s * 0.5], [s * 0.5, s * 0.42]], '#1a1a1a', 1.4);
      stroke(ctx, [[s * 0.5, s * 0.5], [s * 0.56, s * 0.52]], '#1a1a1a', 1.2);
      return;
    case 'carkey':
      box(ctx, s * 0.2, s * 0.3, s * 0.3, s * 0.34, 6, '#1a1a1a');
      stroke(ctx, [[s * 0.5, s * 0.47], [s * 0.86, s * 0.47]], '#b8bcc0', 4);
      return;
    case 'key':
      ctx.beginPath();
      ctx.arc(s * 0.34, s * 0.4, s * 0.14, 0, Math.PI * 2);
      ctx.strokeStyle = '#8a8a8a';
      ctx.lineWidth = 2;
      ctx.stroke();
      for (const [rot, c] of [[0.4, '#c8a24a'], [1.1, '#b8bcc0']] as const) {
        ctx.save();
        ctx.translate(s * 0.34, s * 0.4);
        ctx.rotate(rot);
        disc(ctx, s * 0.16, 0, s * 0.07, c);
        stroke(ctx, [[s * 0.2, 0], [s * 0.48, 0]], c, 3);
        stroke(ctx, [[s * 0.42, 0], [s * 0.42, 4]], c, 2);
        ctx.restore();
      }
      return;
    case 'goldbar':
      poly(ctx, [[s * 0.2, s * 0.64], [s * 0.3, s * 0.4], [s * 0.8, s * 0.4], [s * 0.86, s * 0.64]], col);
      poly(ctx, [[s * 0.3, s * 0.4], [s * 0.36, s * 0.32], [s * 0.74, s * 0.32], [s * 0.8, s * 0.4]], shade(col, 0.3));
      return;
    default:
      disc(ctx, s / 2, s / 2, s * 0.2, col);
  }
};
