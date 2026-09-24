/**
 * Ícones de comida natural: frutas (cada uma com forma própria), verduras,
 * carnes, peixe, ovos, queijo, pães, cogumelos.
 */
import { circle, rgba } from '../canvas';
import { OUTLINE, box, c1, c2, disc, ellipse, poly, rotated, stroke, shade, type IconDrawer } from './kit';

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number, color = '#4a8a3a'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ellipse(ctx, len / 2, 0, len / 2, len / 4.5, color, 'rgba(20,40,10,0.7)');
  stroke(ctx, [[1, 0], [len - 2, 0]], shade(color, -0.3), 0.8);
  ctx.restore();
}

export const fruit: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#c8342a');
  const k = spec.k ?? 'round';
  const cx = s / 2;
  const cy = s * 0.54;
  switch (k) {
    case 'apple': {
      disc(ctx, cx - 4, cy, s * 0.25, col);
      disc(ctx, cx + 4, cy, s * 0.25, col, null);
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.27, 0, Math.PI * 2);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      stroke(ctx, [[cx, cy - s * 0.2], [cx + 2, cy - s * 0.34]], '#5a3a1a', 2.2);
      leaf(ctx, cx + 2, cy - s * 0.3, s * 0.2, -0.5);
      circle(ctx, cx - s * 0.1, cy - s * 0.08, s * 0.05, 'rgba(255,255,255,0.35)');
      return;
    }
    case 'mango':
      rotated(ctx, s, -30, () => {
        ellipse(ctx, cx, cy, s * 0.3, s * 0.22, col);
        const g = ctx.createRadialGradient(cx + s * 0.1, cy + s * 0.05, 1, cx, cy, s * 0.3);
        g.addColorStop(0, rgba('#d8542a', 0.7));
        g.addColorStop(1, rgba('#d8542a', 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * 0.3, s * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        stroke(ctx, [[cx - s * 0.29, cy - 2], [cx - s * 0.36, cy - 5]], '#5a3a1a', 2);
      });
      return;
    case 'lemon':
      ellipse(ctx, cx, cy, s * 0.26, s * 0.2, col);
      ellipse(ctx, cx - s * 0.27, cy, 3, 2, shade(col, -0.1), OUTLINE);
      ellipse(ctx, cx + s * 0.27, cy, 3, 2, shade(col, -0.1), OUTLINE);
      circle(ctx, cx - s * 0.08, cy - s * 0.07, s * 0.05, 'rgba(255,255,255,0.4)');
      return;
    case 'banana':
      rotated(ctx, s, 10, () => {
        ctx.beginPath();
        ctx.moveTo(s * 0.16, s * 0.34);
        ctx.quadraticCurveTo(s * 0.46, s * 0.86, s * 0.86, s * 0.42);
        ctx.quadraticCurveTo(s * 0.5, s * 0.66, s * 0.22, s * 0.3);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1.3;
        ctx.stroke();
        stroke(ctx, [[s * 0.14, s * 0.3], [s * 0.2, s * 0.33]], '#3a2a1a', 3);
        stroke(ctx, [[s * 0.84, s * 0.42], [s * 0.88, s * 0.4]], '#3a2a1a', 3);
      });
      return;
    case 'avocado':
      rotated(ctx, s, 20, () => {
        ellipse(ctx, cx, cy + 2, s * 0.24, s * 0.3, col);
        ellipse(ctx, cx, cy + 4, s * 0.16, s * 0.2, '#d8e08a', null);
        disc(ctx, cx, cy + 6, s * 0.1, '#7a4a2a', 'rgba(0,0,0,0.4)');
      });
      return;
    case 'berries': {
      const dots: [number, number][] = [
        [0.4, 0.42], [0.56, 0.4], [0.48, 0.54], [0.34, 0.58], [0.62, 0.56], [0.5, 0.68], [0.42, 0.7], [0.6, 0.7],
      ];
      leaf(ctx, s * 0.5, s * 0.34, s * 0.26, -2.4, '#4a7a3a');
      for (const [x, y] of dots) disc(ctx, s * x, s * y, s * 0.085, col, 'rgba(10,5,10,0.8)', 1);
      for (const [x, y] of dots) circle(ctx, s * x - 1.3, s * y - 1.3, 1, 'rgba(255,255,255,0.5)');
      return;
    }
    case 'onion':
      poly(ctx, [[cx, cy - s * 0.32], [cx + s * 0.22, cy - s * 0.02], [cx + s * 0.16, cy + s * 0.22], [cx - s * 0.16, cy + s * 0.22], [cx - s * 0.22, cy - s * 0.02]], col);
      stroke(ctx, [[cx, cy - s * 0.3], [cx, cy + s * 0.2]], rgba(shade(col, -0.35), 0.6), 1);
      stroke(ctx, [[cx - s * 0.08, cy - s * 0.2], [cx - s * 0.1, cy + s * 0.2]], rgba(shade(col, -0.35), 0.5), 1);
      stroke(ctx, [[cx + s * 0.08, cy - s * 0.2], [cx + s * 0.1, cy + s * 0.2]], rgba(shade(col, -0.35), 0.5), 1);
      return;
    case 'potato':
      ellipse(ctx, cx, cy, s * 0.3, s * 0.21, col, OUTLINE, 0.3);
      for (const [x, y] of [[-0.1, -0.05], [0.12, 0.04], [0.02, 0.1]] as const) circle(ctx, cx + s * x, cy + s * y, 1.4, shade(col, -0.35));
      return;
    default: {
      disc(ctx, cx, cy, s * 0.27, col);
      if (col === '#d8342a' || col === '#f0922a') {
        // tomate/laranja: sépala ou pontinho
        for (let i = 0; i < 5; i++) leaf(ctx, cx, cy - s * 0.24, s * 0.12, (i / 5) * Math.PI * 2, '#3a7a2a');
      } else {
        stroke(ctx, [[cx, cy - s * 0.24], [cx + 1, cy - s * 0.32]], '#5a3a1a', 2);
      }
      circle(ctx, cx - s * 0.1, cy - s * 0.09, s * 0.05, 'rgba(255,255,255,0.35)');
    }
  }
};

export const veg: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#7ac84a');
  switch (spec.k) {
    case 'carrot':
      rotated(ctx, s, -40, () => {
        poly(ctx, [[s * 0.4, s * 0.28], [s * 0.6, s * 0.28], [s * 0.52, s * 0.9], [s * 0.48, s * 0.9]], col);
        for (let i = 0; i < 3; i++) stroke(ctx, [[s * 0.44, s * (0.4 + i * 0.12)], [s * 0.5, s * (0.4 + i * 0.12)]], shade(col, -0.35), 1);
        for (const a of [-0.5, 0, 0.5]) leaf(ctx, s * 0.5, s * 0.28, s * 0.2, -Math.PI / 2 + a, '#4a8a3a');
      });
      return;
    case 'long':
      rotated(ctx, s, -35, () => {
        box(ctx, s * 0.14, s * 0.4, s * 0.72, s * 0.2, 7, col);
        box(ctx, s * 0.08, s * 0.45, s * 0.08, s * 0.1, 2, '#6a8a3a');
      });
      return;
    case 'cabbage':
      disc(ctx, s / 2, s * 0.52, s * 0.32, col);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(s / 2, s * 0.52, s * (0.08 + i * 0.06), -2.6 + i * 0.3, -0.4 - i * 0.2);
        ctx.strokeStyle = rgba(shade(col, -0.3), 0.7);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      return;
    case 'root':
      rotated(ctx, s, -30, () => {
        poly(ctx, [[s * 0.2, s * 0.44], [s * 0.7, s * 0.36], [s * 0.86, s * 0.5], [s * 0.7, s * 0.62], [s * 0.2, s * 0.56]], col);
        ellipse(ctx, s * 0.2, s * 0.5, 3, 5, '#f2e8d0', OUTLINE);
      });
      return;
    case 'herb':
      stroke(ctx, [[s * 0.5, s * 0.88], [s * 0.5, s * 0.3]], '#4a6a2a', 2);
      for (let i = 0; i < 5; i++) leaf(ctx, s * 0.5, s * (0.34 + i * 0.1), s * 0.2, i % 2 ? -0.5 : Math.PI + 0.5, col);
      return;
    case 'grass':
      for (let i = 0; i < 9; i++) stroke(ctx, [[s * (0.3 + i * 0.05), s * 0.85], [s * (0.2 + i * 0.07), s * (0.2 + (i % 3) * 0.06)]], i % 2 ? col : shade(col, -0.2), 2);
      stroke(ctx, [[s * 0.28, s * 0.66], [s * 0.72, s * 0.66]], '#8a6a3a', 3);
      return;
    case 'leaves':
      for (let i = 0; i < 5; i++) leaf(ctx, s * (0.3 + (i % 3) * 0.16), s * (0.36 + Math.floor(i / 2) * 0.16), s * 0.26, i * 1.3, i % 2 ? col : shade(col, -0.2));
      return;
    default: {
      // alface: folhas em roseta
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        disc(ctx, s / 2 + Math.cos(a) * s * 0.16, s / 2 + Math.sin(a) * s * 0.16, s * 0.18, shade(col, -0.1), 'rgba(30,60,20,0.6)', 1);
      }
      disc(ctx, s / 2, s / 2, s * 0.17, shade(col, 0.15), 'rgba(30,60,20,0.6)', 1);
    }
  }
};

export const meat: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#b83a3a');
  if (spec.k === 'sausage') {
    for (let i = 0; i < 3; i++) {
      rotated(ctx, s, -30 + i * 8, () => box(ctx, s * 0.14, s * (0.3 + i * 0.14), s * 0.72, s * 0.14, 6, col));
    }
    return;
  }
  if (spec.k === 'slices') {
    for (let i = 0; i < 3; i++) disc(ctx, s * (0.36 + i * 0.12), s * (0.44 + i * 0.06), s * 0.22, shade(col, i * 0.05), 'rgba(90,30,30,0.8)');
    return;
  }
  if (spec.k === 'bone') {
    // coxa de frango
    rotated(ctx, s, -35, () => {
      ellipse(ctx, s * 0.42, s * 0.5, s * 0.26, s * 0.2, col);
      box(ctx, s * 0.62, s * 0.46, s * 0.22, s * 0.08, 3, '#f2ead8');
      disc(ctx, s * 0.86, s * 0.47, s * 0.05, '#f2ead8');
      disc(ctx, s * 0.86, s * 0.53, s * 0.05, '#f2ead8');
    });
    return;
  }
  // bife: carne com gordura na borda (bandeja)
  box(ctx, s * 0.14, s * 0.24, s * 0.72, s * 0.54, 5, '#e8e8e0');
  poly(ctx, [[s * 0.22, s * 0.36], [s * 0.66, s * 0.3], [s * 0.78, s * 0.5], [s * 0.6, s * 0.7], [s * 0.26, s * 0.66]], col, 'rgba(70,20,20,0.8)');
  stroke(ctx, [[s * 0.28, s * 0.62], [s * 0.58, s * 0.66], [s * 0.74, s * 0.5]], c2(spec, '#f2e2d2'), 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(s * 0.14, s * 0.24, s * 0.72, s * 0.08);
};

export const fish: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#8aa0b0');
  rotated(ctx, s, -25, () => {
    poly(ctx, [[s * 0.1, s * 0.5], [s * 0.3, s * 0.34], [s * 0.66, s * 0.36], [s * 0.78, s * 0.5], [s * 0.66, s * 0.64], [s * 0.3, s * 0.66]], col);
    poly(ctx, [[s * 0.76, s * 0.5], [s * 0.94, s * 0.34], [s * 0.9, s * 0.5], [s * 0.94, s * 0.66]], shade(col, -0.15));
    circle(ctx, s * 0.24, s * 0.46, 2, '#1a1a1a');
    stroke(ctx, [[s * 0.34, s * 0.4], [s * 0.34, s * 0.6]], rgba(shade(col, -0.4), 0.8), 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(s * 0.36, s * 0.42, s * 0.3, 2);
  });
};

export const egg: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#f2e6d0');
  box(ctx, s * 0.14, s * 0.4, s * 0.72, s * 0.34, 3, '#b8a888');
  for (let i = 0; i < 3; i++) ellipse(ctx, s * (0.28 + i * 0.22), s * 0.44, s * 0.1, s * 0.13, col);
};

export const cheese: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#f0c84a');
  poly(ctx, [[s * 0.14, s * 0.62], [s * 0.78, s * 0.3], [s * 0.86, s * 0.44], [s * 0.86, s * 0.74], [s * 0.14, s * 0.78]], col);
  poly(ctx, [[s * 0.14, s * 0.62], [s * 0.78, s * 0.3], [s * 0.86, s * 0.44], [s * 0.2, s * 0.66]], shade(col, 0.2));
  for (const [x, y, r] of [[0.4, 0.7, 0.05], [0.66, 0.62, 0.04], [0.54, 0.72, 0.03]] as const) circle(ctx, s * x, s * y, s * r, shade(col, -0.25));
};

export const bread: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#d8983a');
  switch (spec.k) {
    case 'loaf':
      box(ctx, s * 0.14, s * 0.34, s * 0.72, s * 0.42, 9, col);
      for (let i = 0; i < 4; i++) stroke(ctx, [[s * (0.26 + i * 0.14), s * 0.38], [s * (0.3 + i * 0.14), s * 0.46]], shade(col, -0.3), 1.2);
      box(ctx, s * 0.12, s * 0.5, s * 0.76, s * 0.3, 3, 'rgba(230,240,250,0.35)', 'rgba(0,0,0,0.2)', 1);
      return;
    case 'cake':
      poly(ctx, [[s * 0.5, s * 0.3], [s * 0.86, s * 0.5], [s * 0.86, s * 0.7], [s * 0.5, s * 0.82], [s * 0.14, s * 0.7], [s * 0.14, s * 0.5]], col);
      poly(ctx, [[s * 0.5, s * 0.3], [s * 0.86, s * 0.5], [s * 0.5, s * 0.62], [s * 0.14, s * 0.5]], shade('#f2e0c8', 0));
      return;
    case 'sandwich':
      poly(ctx, [[s * 0.16, s * 0.3], [s * 0.84, s * 0.3], [s * 0.16, s * 0.8]], '#e8d0a0');
      stroke(ctx, [[s * 0.2, s * 0.33], [s * 0.78, s * 0.33]], '#7ac84a', 3);
      stroke(ctx, [[s * 0.2, s * 0.36], [s * 0.2, s * 0.74]], '#e8a0a0', 3);
      return;
    default:
      rotated(ctx, s, -20, () => {
        ellipse(ctx, s / 2, s / 2, s * 0.3, s * 0.18, col);
        stroke(ctx, [[s * 0.28, s * 0.46], [s * 0.72, s * 0.5]], shade(col, -0.35), 2);
        stroke(ctx, [[s * 0.3, s * 0.45], [s * 0.7, s * 0.49]], shade(col, 0.35), 1);
      });
  }
};

export const mushroom: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#c8a07a');
  box(ctx, s * 0.42, s * 0.46, s * 0.16, s * 0.36, 4, '#efe6d2');
  ctx.beginPath();
  ctx.moveTo(s * 0.16, s * 0.52);
  ctx.quadraticCurveTo(s * 0.5, s * 0.02, s * 0.84, s * 0.52);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  if (spec.c2 === 'spots') for (const [x, y] of [[0.36, 0.38], [0.56, 0.3], [0.66, 0.44], [0.46, 0.46]] as const) circle(ctx, s * x, s * y, s * 0.04, '#f7f2e8');
  else circle(ctx, s * 0.4, s * 0.34, s * 0.05, 'rgba(255,255,255,0.3)');
};
