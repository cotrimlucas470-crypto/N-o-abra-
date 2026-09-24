/**
 * Natureza procedural: árvores frutíferas (cada espécie com copa própria e
 * fruto reconhecível), árvores comuns, secas, pinheiros, palmeiras, arbustos,
 * pedras, tocos, troncos caídos, sucata; decalques de capim, flores, pedrinhas
 * e lixo; montinhos de recurso (galhos, pedras, cogumelos).
 *
 * Os frutos são uma camada SEPARADA (overlay) por cima da copa: somem quando
 * colhidos e voltam aos poucos (ver nature/NatureCatalog.ts).
 */
import { Random } from '../../core/Random';
import { ball, circle, line, mix, rgba, roundRect, shade } from './canvas';
import type { PropDrawer } from './props';

interface CanopyStyle {
  base: string;
  lobes: number;
  /** Tamanho dos lóbulos (fração do raio) e quão "recortada" é a borda. */
  lobe: number;
  jag: number;
  /** Folhinhas por px de raio (textura). */
  leaves: number;
  leafSize: number;
  /** Raio útil (fração do canvas). */
  radius?: number;
}

function canopy(st: CanopyStyle): PropDrawer {
  return (ctx, w, h, rng) => {
    const cx = w / 2;
    const cy = h / 2;
    const R = (Math.min(w, h) / 2 - 4) * (st.radius ?? 1);
    for (let i = 0; i < st.lobes; i++) {
      const a = (i / st.lobes) * Math.PI * 2 + rng.range(-st.jag, st.jag);
      const d = R * rng.range(0.32, 0.55);
      const r = R * rng.range(st.lobe * 0.85, st.lobe * 1.1);
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, shade(st.base, 0.12));
      g.addColorStop(0.7, st.base);
      g.addColorStop(1, shade(st.base, -0.3));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const gc = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R * 0.6);
    gc.addColorStop(0, shade(st.base, 0.2));
    gc.addColorStop(1, shade(st.base, -0.05));
    ctx.fillStyle = gc;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < R * st.leaves; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = Math.sqrt(rng.next()) * R * 0.95;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const lit = (x - cx + (y - cy)) / (R * 2);
      ctx.fillStyle = lit < 0 ? rgba(shade(st.base, 0.3), 0.55) : rgba(shade(st.base, -0.38), 0.5);
      ctx.beginPath();
      ctx.ellipse(x, y, rng.range(1.5, 3.5) * st.leafSize, rng.range(1, 2.2) * st.leafSize, a, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

/** Frutos espalhados pela copa (camada que some ao colher). */
function fruits(color: string, count: number, size: number, shape: 'round' | 'long' | 'bunch' | 'dark', seed: number, radius = 0.8): PropDrawer {
  return (ctx, w, h) => {
    const rng = new Random(seed);
    const cx = w / 2;
    const cy = h / 2;
    const R = (Math.min(w, h) / 2 - 6) * radius;
    if (shape === 'bunch') {
      // cacho de bananas perto do centro
      for (let i = 0; i < 7; i++) {
        const a = -0.9 + i * 0.3;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * 8, cy + 4 + Math.sin(a) * 8);
        ctx.rotate(a + 1.4);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.6, size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,40,10,0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
      return;
    }
    for (let i = 0; i < count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = Math.sqrt(rng.range(0.05, 1)) * R;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      if (shape === 'long') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rng.range(0, Math.PI));
        const g = ctx.createRadialGradient(-size * 0.4, -size * 0.3, 1, 0, 0, size * 1.3);
        g.addColorStop(0, shade(color, 0.3));
        g.addColorStop(1, shade(color, -0.2));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.35, size * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,30,10,0.55)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      } else if (shape === 'dark') {
        circle(ctx, x, y, size, color);
        circle(ctx, x - size * 0.35, y - size * 0.35, size * 0.3, 'rgba(255,255,255,0.35)');
      } else {
        ball(ctx, x, y, size, color, false);
        ctx.strokeStyle = 'rgba(30,20,10,0.45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };
}

const banana: PropDrawer = (ctx, w, h, rng) => {
  const cx = w / 2;
  const cy = h / 2;
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const len = Math.min(w, h) * rng.range(0.4, 0.48);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, '#4f7a2e');
    g.addColorStop(1, '#6f9a3e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.22, len, -2);
    ctx.quadraticCurveTo(len * 0.5, len * 0.2, 0, 0);
    ctx.fill();
    ctx.strokeStyle = rgba('#2a4a1a', 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();
    line(ctx, 0, 0, len * 0.95, -1, rgba('#c8d88a', 0.6), 1);
    // folha rasgada
    for (let k = 0; k < 4; k++) line(ctx, len * (0.35 + k * 0.15), -len * 0.12, len * (0.37 + k * 0.15), -len * 0.02, rgba('#2a4a1a', 0.5), 1);
    ctx.restore();
  }
  circle(ctx, cx, cy, 7, '#6a5a2e', rgba('#2a2a1a', 0.7));
};

const palm: PropDrawer = (ctx, w, h, rng) => {
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + rng.range(-0.1, 0.1);
    const len = Math.min(w, h) * rng.range(0.4, 0.49);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    line(ctx, 0, 0, len, 0, '#4a6a2a', 2);
    for (let k = 4; k < len; k += 4) {
      const f = 1 - k / len;
      line(ctx, k, 0, k + 4, -9 * f - 2, '#5f8a36', 2);
      line(ctx, k, 0, k + 4, 9 * f + 2, '#557d30', 2);
    }
    ctx.restore();
  }
  for (let i = 0; i < 4; i++) ball(ctx, cx + rng.range(-5, 5), cy + rng.range(-5, 5), 4, '#6a4a2a', false);
};

const pine: PropDrawer = (ctx, w, h, rng) => {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2 - 4;
  for (let layer = 0; layer < 3; layer++) {
    const r = R * (1 - layer * 0.28);
    const color = shade('#2f5a38', layer * 0.1);
    ctx.fillStyle = color;
    ctx.beginPath();
    const spikes = 14 - layer * 3;
    for (let i = 0; i <= spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 + layer * 0.3;
      const rr = i % 2 === 0 ? r : r * rng.range(0.62, 0.72);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba('#12261a', 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (let i = 0; i < R * 3; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.sqrt(rng.next()) * R * 0.9;
    line(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, cx + Math.cos(a) * (d + 4), cy + Math.sin(a) * (d + 4), rgba('#7aa86a', 0.35), 1);
  }
  circle(ctx, cx, cy, 3, '#4a3020');
};

function deadTree(seed: number): PropDrawer {
  return (ctx, w, h) => {
    const rng = new Random(seed);
    const cx = w / 2;
    const cy = h / 2;
    const branch = (x: number, y: number, a: number, len: number, width: number, depth: number) => {
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;
      line(ctx, x, y, x2, y2, '#3a2a1c', width + 1.5);
      line(ctx, x, y, x2, y2, '#6a4e36', width);
      if (depth <= 0) return;
      const n = rng.int(2, 3);
      for (let i = 0; i < n; i++) branch(x2, y2, a + rng.range(-0.7, 0.7), len * rng.range(0.55, 0.75), Math.max(1, width * 0.6), depth - 1);
    };
    const n = rng.int(4, 6);
    for (let i = 0; i < n; i++) branch(cx, cy, (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3), Math.min(w, h) * rng.range(0.18, 0.24), 4, 2);
    circle(ctx, cx, cy, 7, '#5a4030', '#2a1a10', 1.5);
  };
}

function bushBerries(base: string, berry: string): PropDrawer {
  const leafy = canopy({ base, lobes: 5, lobe: 0.5, jag: 0.3, leaves: 5, leafSize: 0.9 });
  return (ctx, w, h, rng) => {
    leafy(ctx, w, h, rng);
    if (!berry) return;
    for (let i = 0; i < 16; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = Math.sqrt(rng.next()) * (Math.min(w, h) / 2 - 10);
      circle(ctx, w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, rng.range(2.2, 3.2), berry, rgba('#1a0a14', 0.6), 0.8);
    }
  };
}

function flowerBush(petal: string): PropDrawer {
  const leafy = canopy({ base: '#4a7040', lobes: 5, lobe: 0.5, jag: 0.35, leaves: 4, leafSize: 0.8 });
  return (ctx, w, h, rng) => {
    leafy(ctx, w, h, rng);
    for (let i = 0; i < 12; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = Math.sqrt(rng.next()) * (Math.min(w, h) / 2 - 10);
      const x = w / 2 + Math.cos(a) * d;
      const y = h / 2 + Math.sin(a) * d;
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        circle(ctx, x + Math.cos(pa) * 2.6, y + Math.sin(pa) * 2.6, 2.3, petal);
      }
      circle(ctx, x, y, 1.4, '#f2d24a');
    }
  };
}

function rock(seed: number, color: string): PropDrawer {
  return (ctx, w, h) => {
    const rng = new Random(seed);
    const cx = w / 2;
    const cy = h / 2;
    const n = 9;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * (w / 2 - 4) * rng.range(0.75, 1), cy + Math.sin(a) * (h / 2 - 4) * rng.range(0.75, 1)]);
    }
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, shade(color, 0.25));
    g.addColorStop(1, shade(color, -0.3));
    ctx.fillStyle = g;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba('#1a1a18', 0.7);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    line(ctx, cx - w * 0.15, cy - h * 0.1, cx + w * 0.1, cy + h * 0.05, rgba('#2a2a28', 0.5), 1.2);
    for (let i = 0; i < 6; i++) circle(ctx, cx + rng.range(-w * 0.3, w * 0.3), cy + rng.range(-h * 0.3, h * 0.3), rng.range(1, 3), rgba('#6a8a4a', 0.5));
  };
}

const stump: PropDrawer = (ctx, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    line(ctx, cx, cy, cx + Math.cos(a) * w * 0.46, cy + Math.sin(a) * h * 0.46, '#5a3e28', 5);
  }
  circle(ctx, cx, cy, w * 0.33, '#6a4a30', '#2a1a10', 1.5);
  circle(ctx, cx, cy, w * 0.25, '#c8a070');
  for (const r of [0.18, 0.11, 0.05]) {
    ctx.strokeStyle = rgba('#8a6038', 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, w * r, 0, Math.PI * 2);
    ctx.stroke();
  }
};

const fallenLog: PropDrawer = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 4, 0, h - 4);
  g.addColorStop(0, '#8a6444');
  g.addColorStop(1, '#4a3222');
  ctx.fillStyle = g;
  roundRect(ctx, 8, 5, w - 16, h - 10, (h - 10) / 2);
  ctx.fill();
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  for (let x = 20; x < w - 20; x += 14) line(ctx, x, 8, x + 8, h - 9, rgba('#2a1a10', 0.35), 1);
  ctx.fillStyle = '#c8a070';
  ctx.beginPath();
  ctx.ellipse(w - 9, h / 2, 5, h / 2 - 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 5; i++) circle(ctx, 20 + i * 24, 8 + (i % 2) * 18, 3, rgba('#5a8a3a', 0.6));
};

const scrap: PropDrawer = (ctx, w, h, rng) => {
  const colors = ['#7a7068', '#8a5a3a', '#5a6068', '#9a8a70', '#6a4a3a'];
  for (let i = 0; i < 9; i++) {
    const x = rng.range(w * 0.2, w * 0.8);
    const y = rng.range(h * 0.25, h * 0.75);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng.range(0, Math.PI));
    const c = rng.pick(colors);
    ctx.fillStyle = c;
    ctx.fillRect(-rng.range(8, 16), -rng.range(3, 8), rng.range(16, 30), rng.range(6, 14));
    ctx.strokeStyle = rgba('#1a1a1a', 0.7);
    ctx.lineWidth = 1;
    ctx.strokeRect(-8, -4, 18, 8);
    ctx.restore();
  }
  line(ctx, w * 0.15, h * 0.7, w * 0.8, h * 0.3, '#5a5a5a', 3);
};

// ------------------------------------------------------------------ decalques (chão)

function grassTuft(seed: number, color: string): PropDrawer {
  return (ctx, w, h) => {
    const rng = new Random(seed);
    for (let i = 0; i < 16; i++) {
      const x = w / 2 + rng.range(-w * 0.3, w * 0.3);
      const y = h * 0.8;
      const a = -Math.PI / 2 + rng.range(-0.7, 0.7);
      const len = rng.range(h * 0.35, h * 0.7);
      line(ctx, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, rgba(i % 2 ? color : shade(color, -0.2), 0.9), 1.6);
    }
  };
}

function flowerPatch(seed: number, petal: string): PropDrawer {
  return (ctx, w, h) => {
    const rng = new Random(seed);
    for (let i = 0; i < 10; i++) line(ctx, rng.range(6, w - 6), rng.range(6, h - 6), rng.range(6, w - 6), rng.range(6, h - 6), rgba('#4a7a3a', 0.5), 1);
    for (let i = 0; i < 7; i++) {
      const x = rng.range(8, w - 8);
      const y = rng.range(8, h - 8);
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        circle(ctx, x + Math.cos(pa) * 2.4, y + Math.sin(pa) * 2.4, 2.2, petal);
      }
      circle(ctx, x, y, 1.3, '#f2d24a');
    }
  };
}

const pebbles: PropDrawer = (ctx, w, h, rng) => {
  for (let i = 0; i < 9; i++) ball(ctx, rng.range(6, w - 6), rng.range(6, h - 6), rng.range(2, 4.5), mix('#8a8a82', '#a89a80', rng.next()), false);
};

function litter(seed: number): PropDrawer {
  return (ctx, w, h) => {
    const rng = new Random(seed);
    for (let i = 0; i < 4; i++) {
      const x = rng.range(8, w - 8);
      const y = rng.range(8, h - 8);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rng.range(0, Math.PI * 2));
      const kind = i % 3;
      if (kind === 0) {
        ctx.fillStyle = rng.pick(['#c8352c', '#3a6ab0', '#e8c84a']);
        ctx.fillRect(-6, -3, 12, 6);
      } else if (kind === 1) {
        ctx.fillStyle = 'rgba(200,230,240,0.7)';
        ctx.fillRect(-8, -2.5, 16, 5);
      } else {
        ctx.fillStyle = '#e8e4d8';
        ctx.fillRect(-5, -4, 10, 8);
      }
      ctx.restore();
    }
  };
}

function weeds(seed: number): PropDrawer {
  return (ctx, w, h) => {
    const rng = new Random(seed);
    for (let i = 0; i < 28; i++) {
      const x = rng.range(6, w - 6);
      const y = rng.range(h * 0.4, h - 4);
      const a = -Math.PI / 2 + rng.range(-0.5, 0.5);
      const len = rng.range(8, 18);
      line(ctx, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, rgba(rng.pick(['#7a8a3a', '#9a9a4a', '#6a7a2e']), 0.85), 1.4);
    }
  };
}

// ------------------------------------------------------------------ montinhos de recurso

const branchPile: PropDrawer = (ctx, w, h, rng) => {
  for (let i = 0; i < 6; i++) {
    const x = rng.range(w * 0.2, w * 0.8);
    const y = rng.range(h * 0.3, h * 0.7);
    const a = rng.range(0, Math.PI);
    const len = rng.range(14, 22);
    line(ctx, x - Math.cos(a) * len, y - Math.sin(a) * len, x + Math.cos(a) * len, y + Math.sin(a) * len, '#3a2a1a', 4.4);
    line(ctx, x - Math.cos(a) * len, y - Math.sin(a) * len, x + Math.cos(a) * len, y + Math.sin(a) * len, '#8a6444', 3);
  }
};

const stonePile: PropDrawer = (ctx, w, h, rng) => {
  for (let i = 0; i < 7; i++) ball(ctx, rng.range(w * 0.25, w * 0.75), rng.range(h * 0.3, h * 0.7), rng.range(4, 7), mix('#7a7a74', '#9a9488', rng.next()));
};

function mushrooms(cap: string, spots: boolean): PropDrawer {
  return (ctx, w, h, rng) => {
    for (let i = 0; i < 5; i++) {
      const x = rng.range(w * 0.25, w * 0.75);
      const y = rng.range(h * 0.3, h * 0.7);
      const r = rng.range(4, 7);
      circle(ctx, x, y, r, cap, rgba('#2a1a10', 0.7), 1);
      circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.35, rgba('#ffffff', 0.3));
      if (spots) for (let k = 0; k < 3; k++) circle(ctx, x + rng.range(-r * 0.5, r * 0.5), y + rng.range(-r * 0.5, r * 0.5), 1.1, '#f7f2e8');
    }
  };
}

// ------------------------------------------------------------------ registro

const APPLE = { base: '#5a8040', lobes: 7, lobe: 0.52, jag: 0.25, leaves: 5, leafSize: 1 };
const ORANGE = { base: '#3f6a34', lobes: 9, lobe: 0.46, jag: 0.12, leaves: 6, leafSize: 0.8 };
const MANGO = { base: '#2f5230', lobes: 10, lobe: 0.5, jag: 0.2, leaves: 6, leafSize: 1.3 };
const LEMON = { base: '#46743a', lobes: 8, lobe: 0.5, jag: 0.15, leaves: 7, leafSize: 0.7 };
const GUAVA = { base: '#6a8a48', lobes: 6, lobe: 0.55, jag: 0.4, leaves: 4, leafSize: 1.1 };
const AVOCADO = { base: '#355a36', lobes: 9, lobe: 0.52, jag: 0.3, leaves: 5, leafSize: 1.4 };
const JABUTICABA = { base: '#3a5a34', lobes: 8, lobe: 0.48, jag: 0.2, leaves: 9, leafSize: 0.6 };

export const NATURE_PROP_DRAWERS: Record<string, PropDrawer> = {
  'prop.tree.apple': canopy(APPLE),
  'prop.tree.orange': canopy(ORANGE),
  'prop.tree.mango': canopy(MANGO),
  'prop.tree.lemon': canopy(LEMON),
  'prop.tree.guava': canopy(GUAVA),
  'prop.tree.avocado': canopy(AVOCADO),
  'prop.tree.jabuticaba': canopy(JABUTICABA),
  'prop.tree.banana': banana,
  'prop.tree.broad.a': canopy({ base: '#5a7a3a', lobes: 11, lobe: 0.42, jag: 0.35, leaves: 5, leafSize: 1.1 }),
  'prop.tree.broad.b': canopy({ base: '#7a7a3e', lobes: 9, lobe: 0.46, jag: 0.4, leaves: 5, leafSize: 1 }),
  'prop.tree.young': canopy({ base: '#6a9a4a', lobes: 5, lobe: 0.55, jag: 0.3, leaves: 5, leafSize: 0.8 }),
  'prop.tree.pine.a': pine,
  'prop.tree.pine.b': pine,
  'prop.tree.dead.a': deadTree(11),
  'prop.tree.dead.b': deadTree(23),
  'prop.tree.palm': palm,
  'prop.bush.berry': bushBerries('#3f6a3a', '#3a1030'),
  'prop.bush.flower.a': flowerBush('#e0507a'),
  'prop.bush.flower.b': flowerBush('#f2e8f0'),
  'prop.bush.round': bushBerries('#5a8a44', ''),
  'prop.rock.a': rock(31, '#8a8a82'),
  'prop.rock.b': rock(37, '#9a9080'),
  'prop.stump': stump,
  'prop.log': fallenLog,
  'prop.scrap': scrap,
};

export const NATURE_DECAL_DRAWERS: Record<string, PropDrawer> = {
  'decal.grass.a': grassTuft(41, '#6a9a44'),
  'decal.grass.b': grassTuft(43, '#7aa04a'),
  'decal.grass.c': grassTuft(47, '#8a9a4a'),
  'decal.flowers.red': flowerPatch(51, '#d8405a'),
  'decal.flowers.yellow': flowerPatch(53, '#f0c83a'),
  'decal.flowers.white': flowerPatch(57, '#f2f0e8'),
  'decal.flowers.purple': flowerPatch(59, '#9a6ad8'),
  'decal.pebbles': pebbles,
  'decal.litter.a': litter(61),
  'decal.litter.b': litter(67),
  'decal.weeds.a': weeds(71),
  'decal.weeds.b': weeds(73),
};

/**
 * Camadas de fruto (mesmo tamanho da copa), em duas densidades: cheia e
 * "poucos" (metade dos frutos). E os montinhos de recurso.
 */
const FRUIT_LAYERS: Record<string, [string, number, number, 'round' | 'long' | 'bunch' | 'dark', number, number?]> = {
  apple: ['#c8342a', 14, 4.2, 'round', 81],
  orange: ['#f0922a', 16, 4.2, 'round', 83],
  mango: ['#e8a83a', 12, 4.6, 'long', 85, 0.75],
  lemon: ['#9ad83a', 18, 3.2, 'round', 87],
  guava: ['#c8d85a', 12, 4, 'round', 89],
  avocado: ['#2a4a1a', 10, 5, 'long', 91, 0.7],
  jabuticaba: ['#1a0a1a', 30, 2.6, 'dark', 93, 0.55],
  banana: ['#f0d24a', 1, 5, 'bunch', 95],
  berry: ['#4a1a3a', 16, 2.8, 'dark', 97, 0.75],
};

export const NATURE_OVERLAY_DRAWERS: Record<string, PropDrawer> = {
  ...Object.fromEntries(
    Object.entries(FRUIT_LAYERS).flatMap(([k, [c, n, size, shape, seed, r]]) => [
      [`fruit.${k}`, fruits(c, n, size, shape, seed, r)],
      [`fruit.${k}.few`, fruits(c, Math.max(1, Math.round(n / 2.5)), size, shape === 'bunch' ? 'round' : shape, seed + 1, r)],
    ]),
  ),
  'res.branches': branchPile,
  'res.stones': stonePile,
  'res.mushrooms': mushrooms('#c8a07a', false),
  'res.mushrooms.bad': mushrooms('#c8342a', true),
};
