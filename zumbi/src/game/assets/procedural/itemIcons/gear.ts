/**
 * Ícones de ferramentas, armas, munição, panelas, louça e talheres.
 * Itens compridos ficam na diagonal (cabo embaixo à esquerda).
 */
import { circle } from '../canvas';
import { OUTLINE, bar, box, c1, disc, ellipse, poly, rotated, stroke, shade, type IconDrawer } from './kit';

const WOOD = '#9a6a3c';
const STEEL = '#aeb4ba';
const DARK = '#3a3d42';

export const tool: IconDrawer = (ctx, s, spec) => {
  const k = spec.k ?? 'hammer';
  const col = spec.c;
  switch (k) {
    case 'hammer':
    case 'stonehammer':
      rotated(ctx, s, 40, () => {
        bar(ctx, [[s * 0.5, s * 0.92], [s * 0.5, s * 0.3]], k === 'stonehammer' ? '#8a6a4a' : WOOD, 5);
        if (k === 'stonehammer') {
          disc(ctx, s * 0.5, s * 0.24, s * 0.14, '#8a8a82');
          stroke(ctx, [[s * 0.4, s * 0.3], [s * 0.6, s * 0.34]], '#c8a06a', 2);
        } else {
          box(ctx, s * 0.26, s * 0.14, s * 0.48, s * 0.15, 3, '#7c8288');
          poly(ctx, [[s * 0.74, s * 0.15], [s * 0.86, s * 0.1], [s * 0.82, s * 0.2], [s * 0.74, s * 0.28]], '#5a5f64');
        }
      });
      return;
    case 'sledge':
      rotated(ctx, s, 40, () => {
        bar(ctx, [[s * 0.5, s * 0.94], [s * 0.5, s * 0.3]], WOOD, 5);
        box(ctx, s * 0.22, s * 0.1, s * 0.56, s * 0.24, 3, DARK);
      });
      return;
    case 'saw':
      rotated(ctx, s, -40, () => {
        poly(ctx, [[s * 0.3, s * 0.34], [s * 0.94, s * 0.44], [s * 0.94, s * 0.52], [s * 0.3, s * 0.62]], STEEL);
        for (let i = 0; i < 9; i++) poly(ctx, [[s * (0.34 + i * 0.066), s * 0.62 - i * 0.9], [s * (0.37 + i * 0.066), s * 0.66 - i * 0.9], [s * (0.4 + i * 0.066), s * 0.61 - i * 0.9]], STEEL, null);
        box(ctx, s * 0.06, s * 0.3, s * 0.26, s * 0.36, 6, col ?? '#c8342a');
        box(ctx, s * 0.12, s * 0.4, s * 0.12, s * 0.14, 3, '#1a1a1a', null);
      });
      return;
    case 'hacksaw':
      rotated(ctx, s, -30, () => {
        stroke(ctx, [[s * 0.2, s * 0.62], [s * 0.2, s * 0.34], [s * 0.86, s * 0.34], [s * 0.86, s * 0.62]], OUTLINE, 5);
        stroke(ctx, [[s * 0.2, s * 0.62], [s * 0.2, s * 0.34], [s * 0.86, s * 0.34], [s * 0.86, s * 0.62]], '#3a6ab0', 3);
        stroke(ctx, [[s * 0.2, s * 0.6], [s * 0.86, s * 0.6]], STEEL, 2);
        box(ctx, s * 0.08, s * 0.58, s * 0.14, s * 0.26, 4, '#2a2a2a');
      });
      return;
    case 'axe':
    case 'hatchet':
    case 'stoneaxe':
      rotated(ctx, s, 38, () => {
        const long = k === 'axe';
        bar(ctx, [[s * 0.5, s * (long ? 0.96 : 0.88)], [s * 0.5, s * 0.16]], k === 'stoneaxe' ? '#8a6a4a' : long ? '#c89a5a' : WOOD, long ? 5 : 4.5);
        if (k === 'stoneaxe') poly(ctx, [[s * 0.5, s * 0.14], [s * 0.82, s * 0.1], [s * 0.86, s * 0.34], [s * 0.5, s * 0.3]], '#7a7a74');
        else {
          poly(ctx, [[s * 0.44, s * 0.14], [s * 0.7, s * 0.1], [s * 0.86, s * 0.02], [s * 0.86, s * 0.44], [s * 0.7, s * 0.34], [s * 0.44, s * 0.32]], long ? '#c8342a' : '#7c8288');
          stroke(ctx, [[s * 0.84, s * 0.06], [s * 0.84, s * 0.4]], '#d8dde2', 2);
        }
      });
      return;
    case 'screwdriver':
    case 'tweezers':
      rotated(ctx, s, -45, () => {
        if (k === 'tweezers') {
          stroke(ctx, [[s * 0.46, s * 0.12], [s * 0.42, s * 0.88]], STEEL, 3);
          stroke(ctx, [[s * 0.54, s * 0.12], [s * 0.58, s * 0.88]], STEEL, 3);
          return;
        }
        stroke(ctx, [[s * 0.5, s * 0.1], [s * 0.5, s * 0.52]], OUTLINE, 5);
        stroke(ctx, [[s * 0.5, s * 0.1], [s * 0.5, s * 0.52]], STEEL, 3);
        box(ctx, s * 0.4, s * 0.5, s * 0.2, s * 0.4, 7, col ?? '#e3c02d');
      });
      return;
    case 'wrench':
    case 'lug':
      rotated(ctx, s, 45, () => {
        bar(ctx, [[s * 0.5, s * 0.9], [s * 0.5, s * 0.3]], k === 'lug' ? DARK : STEEL, 5);
        if (k === 'lug') bar(ctx, [[s * 0.2, s * 0.9], [s * 0.8, s * 0.9]], DARK, 4);
        disc(ctx, s * 0.5, s * 0.22, s * 0.15, k === 'lug' ? DARK : STEEL);
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(s * 0.44, s * 0.06, s * 0.12, s * 0.16);
      });
      return;
    case 'pliers':
      rotated(ctx, s, -40, () => {
        bar(ctx, [[s * 0.38, s * 0.92], [s * 0.48, s * 0.48], [s * 0.46, s * 0.1]], col ?? '#3a6ab0', 4);
        bar(ctx, [[s * 0.62, s * 0.92], [s * 0.52, s * 0.48], [s * 0.54, s * 0.1]], col ?? '#3a6ab0', 4);
        stroke(ctx, [[s * 0.47, s * 0.46], [s * 0.46, s * 0.1]], STEEL, 3);
        stroke(ctx, [[s * 0.53, s * 0.46], [s * 0.54, s * 0.1]], STEEL, 3);
        disc(ctx, s * 0.5, s * 0.48, 2.5, '#6a6a6a');
      });
      return;
    case 'shovel':
    case 'hoe':
    case 'rake':
    case 'scythe':
    case 'pickaxe':
      rotated(ctx, s, 40, () => {
        bar(ctx, [[s * 0.5, s * 0.98], [s * 0.5, s * 0.2]], '#c89a5a', 3.5);
        if (k === 'shovel') poly(ctx, [[s * 0.34, s * 0.02], [s * 0.66, s * 0.02], [s * 0.64, s * 0.24], [s * 0.5, s * 0.32], [s * 0.36, s * 0.24]], '#7c8288');
        if (k === 'hoe') poly(ctx, [[s * 0.5, s * 0.14], [s * 0.82, s * 0.12], [s * 0.82, s * 0.26], [s * 0.5, s * 0.22]], '#7c8288');
        if (k === 'rake') {
          bar(ctx, [[s * 0.26, s * 0.16], [s * 0.74, s * 0.16]], '#7c8288', 2.5);
          for (let i = 0; i < 6; i++) stroke(ctx, [[s * (0.28 + i * 0.09), s * 0.16], [s * (0.28 + i * 0.09), s * 0.05]], '#6a6f74', 2);
        }
        if (k === 'scythe') {
          ctx.beginPath();
          ctx.moveTo(s * 0.5, s * 0.2);
          ctx.quadraticCurveTo(s * 0.9, s * 0.05, s * 0.96, s * 0.36);
          ctx.quadraticCurveTo(s * 0.8, s * 0.16, s * 0.5, s * 0.26);
          ctx.closePath();
          ctx.fillStyle = STEEL;
          ctx.fill();
          ctx.strokeStyle = OUTLINE;
          ctx.stroke();
        }
        if (k === 'pickaxe') {
          ctx.beginPath();
          ctx.moveTo(s * 0.08, s * 0.28);
          ctx.quadraticCurveTo(s * 0.5, s * 0.04, s * 0.92, s * 0.28);
          ctx.quadraticCurveTo(s * 0.5, s * 0.14, s * 0.08, s * 0.28);
          ctx.fillStyle = '#6a6f74';
          ctx.fill();
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }
      });
      return;
    case 'crowbar':
      rotated(ctx, s, 40, () => {
        bar(ctx, [[s * 0.5, s * 0.94], [s * 0.5, s * 0.18], [s * 0.36, s * 0.06]], '#b8322a', 4);
        stroke(ctx, [[s * 0.5, s * 0.94], [s * 0.58, s * 0.98]], '#7c2019', 4);
      });
      return;
    case 'tape':
      box(ctx, s * 0.2, s * 0.24, s * 0.52, s * 0.52, 12, '#e8c84a');
      disc(ctx, s * 0.46, s * 0.5, s * 0.12, '#2a2a2a');
      box(ctx, s * 0.7, s * 0.66, s * 0.18, s * 0.08, 1, '#d8d2b0');
      return;
    case 'boxcutter':
      rotated(ctx, s, -40, () => {
        box(ctx, s * 0.4, s * 0.34, s * 0.2, s * 0.56, 4, '#e8c84a');
        poly(ctx, [[s * 0.44, s * 0.34], [s * 0.56, s * 0.34], [s * 0.56, s * 0.14], [s * 0.44, s * 0.22]], STEEL);
      });
      return;
    case 'scissors':
      rotated(ctx, s, -40, () => {
        stroke(ctx, [[s * 0.44, s * 0.52], [s * 0.54, s * 0.08]], STEEL, 3);
        stroke(ctx, [[s * 0.56, s * 0.52], [s * 0.46, s * 0.08]], STEEL, 3);
        ctx.lineWidth = 3.5;
        for (const x of [0.38, 0.62]) {
          ctx.beginPath();
          ctx.arc(s * x, s * 0.7, s * 0.12, 0, Math.PI * 2);
          ctx.strokeStyle = OUTLINE;
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#c8342a';
          ctx.stroke();
          ctx.lineWidth = 3.5;
        }
      });
      return;
    case 'opener':
      rotated(ctx, s, -35, () => {
        box(ctx, s * 0.42, s * 0.4, s * 0.16, s * 0.48, 5, '#2a2a2a');
        poly(ctx, [[s * 0.42, s * 0.4], [s * 0.58, s * 0.4], [s * 0.6, s * 0.16], [s * 0.5, s * 0.1], [s * 0.4, s * 0.2]], STEEL);
        disc(ctx, s * 0.5, s * 0.28, 3, '#6a6a6a');
      });
      return;
    case 'drill':
      box(ctx, s * 0.14, s * 0.24, s * 0.56, s * 0.24, 6, '#e8c84a');
      box(ctx, s * 0.34, s * 0.46, s * 0.2, s * 0.32, 4, '#2a2a2a');
      box(ctx, s * 0.3, s * 0.74, s * 0.28, s * 0.12, 2, '#e8c84a');
      stroke(ctx, [[s * 0.7, s * 0.36], [s * 0.92, s * 0.36]], STEEL, 3);
      return;
    case 'file':
      rotated(ctx, s, -40, () => {
        box(ctx, s * 0.44, s * 0.08, s * 0.12, s * 0.56, 2, '#6a6f74');
        for (let i = 0; i < 8; i++) stroke(ctx, [[s * 0.45, s * (0.12 + i * 0.06)], [s * 0.55, s * (0.14 + i * 0.06)]], '#3a3d42', 0.8);
        box(ctx, s * 0.42, s * 0.62, s * 0.16, s * 0.3, 5, WOOD);
      });
      return;
    case 'trowel':
      rotated(ctx, s, -35, () => {
        poly(ctx, [[s * 0.5, s * 0.06], [s * 0.72, s * 0.44], [s * 0.28, s * 0.44]], STEEL);
        stroke(ctx, [[s * 0.5, s * 0.44], [s * 0.5, s * 0.58]], OUTLINE, 3);
        box(ctx, s * 0.42, s * 0.56, s * 0.16, s * 0.34, 5, WOOD);
      });
      return;
    case 'sewing':
      box(ctx, s * 0.14, s * 0.3, s * 0.72, s * 0.44, 6, '#c86a8a');
      for (const [x, c] of [[0.32, '#c8342a'], [0.5, '#3a6ab0'], [0.68, '#e8c84a']] as const) {
        disc(ctx, s * x, s * 0.52, s * 0.08, c, 'rgba(0,0,0,0.5)', 1);
      }
      stroke(ctx, [[s * 0.2, s * 0.26], [s * 0.6, s * 0.12]], STEEL, 1.5);
      return;
    case 'lighter':
      rotated(ctx, s, -20, () => {
        box(ctx, s * 0.36, s * 0.34, s * 0.28, s * 0.5, 4, col ?? '#c8342a');
        box(ctx, s * 0.36, s * 0.24, s * 0.28, s * 0.12, 2, STEEL);
        ellipse(ctx, s * 0.5, s * 0.14, 3, 5, '#f0a030', null);
      });
      return;
    case 'matches':
      box(ctx, s * 0.18, s * 0.3, s * 0.64, s * 0.4, 3, '#e8c84a');
      box(ctx, s * 0.18, s * 0.3, s * 0.64, s * 0.12, 2, '#6a3a2a');
      for (let i = 0; i < 3; i++) {
        stroke(ctx, [[s * (0.3 + i * 0.1), s * 0.62], [s * (0.36 + i * 0.1), s * 0.86]], '#e8d0a0', 2);
        circle(ctx, s * (0.3 + i * 0.1), s * 0.62, 2, '#c8342a');
      }
      return;
    case 'jack':
      box(ctx, s * 0.14, s * 0.62, s * 0.72, s * 0.16, 3, '#c8342a');
      box(ctx, s * 0.36, s * 0.3, s * 0.2, s * 0.34, 3, '#c8342a');
      box(ctx, s * 0.32, s * 0.22, s * 0.28, s * 0.1, 2, DARK);
      bar(ctx, [[s * 0.56, s * 0.56], [s * 0.92, s * 0.4]], STEEL, 2.5);
      return;
    case 'stoneknife':
      rotated(ctx, s, -35, () => {
        poly(ctx, [[s * 0.5, s * 0.06], [s * 0.6, s * 0.5], [s * 0.42, s * 0.5]], '#6a6a66');
        bar(ctx, [[s * 0.5, s * 0.54], [s * 0.5, s * 0.9]], '#8a6a4a', 5);
        stroke(ctx, [[s * 0.44, s * 0.56], [s * 0.56, s * 0.62]], '#c8a06a', 1.5);
      });
      return;
    default:
      tool(ctx, s, { f: 'tool', k: 'hammer' });
  }
};

export const knife: IconDrawer = (ctx, s, spec) => {
  const k = spec.k ?? 'kitchen';
  rotated(ctx, s, -38, () => {
    const len = k === 'machete' ? 0.62 : k === 'folding' ? 0.34 : 0.44;
    const wide = k === 'machete' || k === 'hunting' ? 0.1 : 0.07;
    const top = 0.5 - len;
    poly(ctx, [[s * (0.5 - wide), s * 0.54], [s * (0.5 - wide), s * (top + 0.08)], [s * 0.5, s * top], [s * (0.5 + wide), s * (top + 0.14)], [s * (0.5 + wide), s * 0.54]], '#d4d9de');
    stroke(ctx, [[s * (0.5 - wide + 2 / s), s * 0.52], [s * (0.5 - wide + 2 / s), s * (top + 0.1)]], 'rgba(255,255,255,0.7)', 1);
    if (k === 'hunting') for (let i = 0; i < 4; i++) stroke(ctx, [[s * (0.5 + wide), s * (0.2 + i * 0.05)], [s * (0.5 + wide - 0.03), s * (0.22 + i * 0.05)]], '#7d848b', 1);
    stroke(ctx, [[s * 0.36, s * 0.55], [s * 0.64, s * 0.55]], OUTLINE, 3);
    box(ctx, s * 0.43, s * 0.56, s * 0.14, s * (k === 'folding' ? 0.26 : 0.34), 4, k === 'kitchen' ? '#26282b' : k === 'folding' ? '#c8342a' : '#6a4a2a');
  });
};

export const blunt: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, WOOD);
  const k = spec.k ?? 'bat';
  rotated(ctx, s, 40, () => {
    switch (k) {
      case 'bat':
      case 'batnails':
        poly(ctx, [[s * 0.47, s * 0.96], [s * 0.53, s * 0.96], [s * 0.6, s * 0.1], [s * 0.4, s * 0.1]], col);
        ellipse(ctx, s * 0.5, s * 0.1, s * 0.1, s * 0.04, shade(col, 0.1), OUTLINE);
        if (k === 'batnails') for (let i = 0; i < 5; i++) stroke(ctx, [[s * 0.4, s * (0.14 + i * 0.07)], [s * 0.3, s * (0.12 + i * 0.07)]], '#9aa1a8', 1.6);
        stroke(ctx, [[s * 0.47, s * 0.92], [s * 0.53, s * 0.92]], '#2a2a2a', 3);
        return;
      case 'spear':
      case 'woodspear':
        bar(ctx, [[s * 0.5, s * 0.98], [s * 0.5, s * 0.26]], col, 3.5);
        if (k === 'spear') {
          poly(ctx, [[s * 0.44, s * 0.3], [s * 0.5, s * 0.02], [s * 0.56, s * 0.3]], '#d4d9de');
          stroke(ctx, [[s * 0.44, s * 0.3], [s * 0.56, s * 0.36]], '#c8c8c0', 3);
        } else poly(ctx, [[s * 0.46, s * 0.28], [s * 0.5, s * 0.06], [s * 0.54, s * 0.28]], shade(col, 0.2));
        return;
      case 'plank':
        box(ctx, s * 0.4, s * 0.04, s * 0.2, s * 0.92, 2, col);
        for (let i = 0; i < 4; i++) stroke(ctx, [[s * 0.6, s * (0.1 + i * 0.07)], [s * 0.7, s * (0.08 + i * 0.07)]], '#9aa1a8', 1.6);
        return;
      default: {
        const w = k === 'rebar' ? 3.5 : k === 'broom' || k === 'cue' ? 3 : 4.5;
        bar(ctx, [[s * 0.5, s * 0.97], [s * 0.5, s * 0.04]], col, w, 'butt');
        if (k === 'rebar') for (let i = 0; i < 9; i++) stroke(ctx, [[s * 0.46, s * (0.08 + i * 0.1)], [s * 0.54, s * (0.11 + i * 0.1)]], shade(col, -0.35), 1);
        if (k === 'baton') stroke(ctx, [[s * 0.5, s * 0.6], [s * 0.66, s * 0.6]], OUTLINE, 5);
        if (k === 'cue') stroke(ctx, [[s * 0.5, s * 0.97], [s * 0.5, s * 0.66]], '#2a2a2a', 4);
        if (k === 'pipe') {
          box(ctx, s * 0.42, s * 0.02, s * 0.16, s * 0.08, 2, shade(col, -0.2));
          box(ctx, s * 0.42, s * 0.9, s * 0.16, s * 0.08, 2, shade(col, -0.2));
        }
      }
    }
  });
};

export const gun: IconDrawer = (ctx, s, spec) => {
  const k = spec.k ?? 'pistol';
  const metal = '#2e3136';
  const wood = spec.c ?? '#7a4a2a';
  switch (k) {
    case 'pistol':
      poly(ctx, [[s * 0.12, s * 0.3], [s * 0.86, s * 0.3], [s * 0.86, s * 0.44], [s * 0.46, s * 0.44], [s * 0.42, s * 0.82], [s * 0.24, s * 0.82], [s * 0.28, s * 0.44], [s * 0.12, s * 0.44]], metal);
      stroke(ctx, [[s * 0.16, s * 0.34], [s * 0.8, s * 0.34]], 'rgba(255,255,255,0.25)', 1.5);
      ctx.beginPath();
      ctx.arc(s * 0.5, s * 0.5, s * 0.07, 0, Math.PI);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    case 'revolver':
      box(ctx, s * 0.42, s * 0.3, s * 0.48, s * 0.1, 2, metal);
      disc(ctx, s * 0.38, s * 0.4, s * 0.12, '#4a4d52');
      poly(ctx, [[s * 0.18, s * 0.36], [s * 0.3, s * 0.34], [s * 0.34, s * 0.5], [s * 0.3, s * 0.84], [s * 0.14, s * 0.8], [s * 0.2, s * 0.5]], wood);
      circle(ctx, s * 0.38, s * 0.4, 2, '#1a1a1a');
      return;
    case 'smg':
      box(ctx, s * 0.14, s * 0.32, s * 0.7, s * 0.16, 3, metal);
      box(ctx, s * 0.84, s * 0.36, s * 0.1, s * 0.06, 1, metal);
      box(ctx, s * 0.44, s * 0.46, s * 0.1, s * 0.4, 2, '#1a1a1a');
      poly(ctx, [[s * 0.2, s * 0.46], [s * 0.3, s * 0.46], [s * 0.28, s * 0.7], [s * 0.18, s * 0.7]], metal);
      return;
    default: {
      // armas longas: na diagonal
      rotated(ctx, s, -35, () => {
        const double = k === 'double';
        const shotgun = k === 'shotgun' || double;
        stroke(ctx, [[s * 0.02, s * 0.46], [s * 0.6, s * 0.46]], OUTLINE, double ? 7 : 5);
        stroke(ctx, [[s * 0.02, s * 0.46], [s * 0.6, s * 0.46]], metal, double ? 5 : 3);
        if (shotgun && !double) box(ctx, s * 0.18, s * 0.49, s * 0.24, s * 0.08, 3, wood);
        poly(ctx, [[s * 0.5, s * 0.41], [s * 0.7, s * 0.41], [s * 0.98, s * 0.46], [s * 0.98, s * 0.6], [s * 0.72, s * 0.54], [s * 0.6, s * 0.62], [s * 0.54, s * 0.52], [s * 0.5, s * 0.52]], wood);
        if (spec.c2 === 'scope') box(ctx, s * 0.36, s * 0.34, s * 0.24, s * 0.07, 2, '#1a1a1a');
      });
    }
  }
};

export const ammo: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#c9a24a');
  const k = spec.k ?? 'round';
  if (k === 'mag') {
    rotated(ctx, s, 15, () => {
      poly(ctx, [[s * 0.38, s * 0.14], [s * 0.6, s * 0.14], [s * 0.66, s * 0.86], [s * 0.44, s * 0.86]], col);
      box(ctx, s * 0.4, s * 0.1, s * 0.18, s * 0.08, 2, '#c9a24a');
    });
    return;
  }
  const n = k === 'shell' ? 3 : k === 'rifle' ? 3 : 4;
  for (let i = 0; i < n; i++) {
    const x = s * (0.22 + i * (0.56 / (n - 1 || 1)));
    if (k === 'shell') {
      box(ctx, x - 5, s * 0.34, 10, s * 0.36, 2, col);
      box(ctx, x - 5, s * 0.62, 10, s * 0.12, 1, '#c9a24a');
    } else if (k === 'casing') {
      box(ctx, x - 3.5, s * 0.46, 7, s * 0.3, 1.5, col);
      ellipse(ctx, x, s * 0.46, 3.5, 1.5, '#3a3020', OUTLINE);
    } else {
      const h = k === 'rifle' ? 0.5 : 0.36;
      box(ctx, x - 3.5, s * (0.78 - h * 0.6), 7, s * h * 0.6, 1.5, col);
      poly(ctx, [[x - 3.5, s * (0.78 - h * 0.6)], [x, s * (0.78 - h)], [x + 3.5, s * (0.78 - h * 0.6)]], '#b87a4a');
    }
  }
};

export const pot: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#9aa0a6');
  const k = spec.k ?? 'pot';
  if (k === 'pan') {
    rotated(ctx, s, -30, () => {
      disc(ctx, s * 0.4, s * 0.5, s * 0.26, col);
      disc(ctx, s * 0.4, s * 0.5, s * 0.2, shade(col, 0.1), null);
      bar(ctx, [[s * 0.64, s * 0.5], [s * 0.96, s * 0.5]], '#1a1a1a', 4);
    });
    return;
  }
  if (k === 'kettle') {
    ellipse(ctx, s * 0.5, s * 0.58, s * 0.28, s * 0.22, col);
    stroke(ctx, [[s * 0.74, s * 0.52], [s * 0.9, s * 0.36]], OUTLINE, 5);
    stroke(ctx, [[s * 0.74, s * 0.52], [s * 0.9, s * 0.36]], col, 3);
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.42, s * 0.18, Math.PI, 0);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.stroke();
    return;
  }
  // panela vista de cima (pressão tem alça longa e válvula)
  disc(ctx, s * 0.5, s * 0.52, s * 0.28, col);
  disc(ctx, s * 0.5, s * 0.52, s * 0.22, shade(col, -0.12), null);
  if (k === 'pressure') {
    bar(ctx, [[s * 0.5, s * 0.5], [s * 0.94, s * 0.34]], '#1a1a1a', 4);
    disc(ctx, s * 0.5, s * 0.52, 3, '#1a1a1a');
  } else {
    bar(ctx, [[s * 0.14, s * 0.52], [s * 0.2, s * 0.52]], '#1a1a1a', 4);
    bar(ctx, [[s * 0.8, s * 0.52], [s * 0.86, s * 0.52]], '#1a1a1a', 4);
  }
};

export const dish: IconDrawer = (ctx, s, spec) => {
  const col = c1(spec, '#f2f2f2');
  switch (spec.k) {
    case 'bowl':
      disc(ctx, s / 2, s / 2, s * 0.3, col);
      disc(ctx, s / 2, s / 2, s * 0.2, shade(col, -0.08), null);
      return;
    case 'mug':
      disc(ctx, s * 0.46, s * 0.52, s * 0.24, col);
      disc(ctx, s * 0.46, s * 0.52, s * 0.17, '#3a2418', null);
      stroke(ctx, [[s * 0.7, s * 0.44], [s * 0.82, s * 0.44], [s * 0.82, s * 0.6], [s * 0.7, s * 0.6]], OUTLINE, 4);
      stroke(ctx, [[s * 0.7, s * 0.44], [s * 0.82, s * 0.44], [s * 0.82, s * 0.6], [s * 0.7, s * 0.6]], col, 2);
      return;
    case 'cup':
      disc(ctx, s / 2, s / 2, s * 0.2, 'rgba(191,224,232,0.7)');
      disc(ctx, s / 2, s / 2, s * 0.14, 'rgba(255,255,255,0.4)', null);
      return;
    case 'box':
      box(ctx, s * 0.16, s * 0.3, s * 0.68, s * 0.42, 6, col);
      box(ctx, s * 0.14, s * 0.26, s * 0.72, s * 0.1, 3, '#3a8ab0');
      return;
    default:
      disc(ctx, s / 2, s / 2, s * 0.34, col);
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.24, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
  }
};

export const cutlery: IconDrawer = (ctx, s, spec) => {
  const k = spec.k ?? 'fork';
  rotated(ctx, s, -35, () => {
    if (k === 'toothbrush') {
      bar(ctx, [[s * 0.5, s * 0.92], [s * 0.5, s * 0.16]], c1(spec, '#3a8ab0'), 3);
      box(ctx, s * 0.44, s * 0.08, s * 0.1, s * 0.16, 2, '#f2f2f2');
      return;
    }
    bar(ctx, [[s * 0.5, s * 0.92], [s * 0.5, s * 0.4]], STEEL, 3);
    if (k === 'fork') {
      box(ctx, s * 0.42, s * 0.28, s * 0.16, s * 0.12, 2, STEEL);
      for (let i = 0; i < 4; i++) stroke(ctx, [[s * (0.43 + i * 0.047), s * 0.28], [s * (0.43 + i * 0.047), s * 0.1]], OUTLINE, 1.6);
    } else ellipse(ctx, s * 0.5, s * (k === 'ladle' ? 0.24 : 0.28), s * (k === 'ladle' ? 0.14 : 0.09), s * (k === 'ladle' ? 0.13 : 0.13), STEEL);
  });
};
