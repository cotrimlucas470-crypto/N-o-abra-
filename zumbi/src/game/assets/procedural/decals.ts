/** Desenho procedural das marcas no chão (world/DecalCatalog.ts). */
import { Random } from '../../core/Random';
import { blob, circle, line, rgba, roundRect, shade, shadedBox, speckle } from './canvas';
import type { PropDrawer } from './props';
import { NATURE_DECAL_DRAWERS } from './nature';

function blood(seed: number): PropDrawer {
  return (ctx, w, h) => {
    const rng = new Random(seed);
    blob(ctx, w / 2, h / 2, w * 0.3, 'rgba(98,18,16,0.82)', rng, 16, 9);
    blob(ctx, w / 2 + rng.range(-6, 6), h / 2 + rng.range(-6, 6), w * 0.16, 'rgba(70,10,10,0.75)', rng, 10, 0);
  };
}

const bloodTrail: PropDrawer = (ctx, w, h, rng) => {
  for (let x = 12; x < w - 10; x += 9) {
    const t = x / w;
    blob(ctx, x, h / 2 + rng.range(-3, 3), (1 - t * 0.6) * h * 0.26, 'rgba(92,16,14,0.5)', rng, 9, 1);
  }
};

const oil: PropDrawer = (ctx, w, h, rng) => {
  blob(ctx, w / 2, h / 2, Math.min(w, h) * 0.4, 'rgba(12,12,16,0.55)', rng, 14, 4);
  ctx.globalAlpha = 0.18;
  blob(ctx, w / 2 - 5, h / 2 - 4, Math.min(w, h) * 0.18, '#5a4a8a', rng, 8, 0);
  ctx.globalAlpha = 1;
};

function crack(seed: number): PropDrawer {
  return (ctx, w, h) => {
    const rng = new Random(seed);
    const walk = (x: number, y: number, dir: number, len: number, width: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let i = 0; i < len; i++) {
        dir += rng.range(-0.5, 0.5);
        x += Math.cos(dir) * 7;
        y += Math.sin(dir) * 7;
        ctx.lineTo(x, y);
        if (rng.chance(0.18) && width > 0.8) walk(x, y, dir + rng.range(-1.2, 1.2), Math.floor(len / 2), width * 0.6);
      }
      ctx.strokeStyle = 'rgba(20,20,22,0.7)';
      ctx.lineWidth = width;
      ctx.stroke();
    };
    walk(8, h / 2, 0, Math.floor(w / 8), 1.8);
  };
}

function leaves(seed: number): PropDrawer {
  return (ctx, w, h) => {
    const rng = new Random(seed);
    const colors = ['#8a6a2e', '#a0582c', '#6d6a34', '#7a4a26', '#9a8a4a'];
    for (let i = 0; i < 26; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = Math.sqrt(rng.next()) * w * 0.45;
      const x = w / 2 + Math.cos(a) * d;
      const y = h / 2 + Math.sin(a) * d;
      ctx.fillStyle = rgba(rng.pick(colors), rng.range(0.6, 0.95));
      ctx.beginPath();
      ctx.ellipse(x, y, rng.range(3, 5.5), rng.range(1.6, 3), rng.range(0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

function paper(seed: number): PropDrawer {
  return (ctx, w, h) => {
    const rng = new Random(seed);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rng.range(-0.4, 0.4));
    ctx.fillStyle = seed % 2 ? '#dcd6c6' : '#cfc7b0';
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, -h * 0.35);
    ctx.lineTo(w * 0.38, -h * 0.4);
    ctx.lineTo(w * 0.42, h * 0.3);
    ctx.lineTo(-w * 0.36, h * 0.38);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 4; i++) line(ctx, -w * 0.28, -h * 0.2 + i * 5, w * 0.25, -h * 0.22 + i * 5, 'rgba(90,90,90,0.4)', 1);
    ctx.restore();
  };
}

const manhole: PropDrawer = (ctx, w, h) => {
  circle(ctx, w / 2, h / 2, w / 2 - 1, '#3b3d40', '#27282a', 2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2);
  ctx.clip();
  for (let i = -w; i < w; i += 7) line(ctx, i, 0, i + w, h, 'rgba(90,92,96,0.55)', 1.5);
  ctx.restore();
  circle(ctx, w / 2, h / 2, 5, '#2e3032');
};

const drain: PropDrawer = (ctx, w, h) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, '#3a3c3f');
  for (let x = 6; x < w - 4; x += 6) line(ctx, x, 4, x, h - 4, '#151617', 2.5, 'butt');
};

const dirt: PropDrawer = (ctx, w, h, rng) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, Math.min(w, h) / 2);
  g.addColorStop(0, 'rgba(92,74,52,0.55)');
  g.addColorStop(1, 'rgba(92,74,52,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  speckle(ctx, w, h, 50, ['rgba(70,56,40,0.5)'], 1, 3, rng);
};

const doormat: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 3, '#6b5a44', { light: 0.05 });
  ctx.strokeStyle = shade('#6b5a44', -0.3);
  ctx.lineWidth = 2;
  roundRect(ctx, 5, 5, w - 10, h - 10, 2);
  ctx.stroke();
  speckle(ctx, w, h, 60, ['rgba(40,30,20,0.35)'], 1, 2, rng);
};

const skid: PropDrawer = (ctx, w, h) => {
  for (const y of [h * 0.28, h * 0.72]) {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(15,15,15,0)');
    g.addColorStop(0.3, 'rgba(15,15,15,0.5)');
    g.addColorStop(1, 'rgba(15,15,15,0.65)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(4, y);
    ctx.quadraticCurveTo(w / 2, y + 5, w - 4, y - 3);
    ctx.stroke();
  }
};

const debris: PropDrawer = (ctx, w, h, rng) => {
  for (let i = 0; i < 14; i++) {
    const s = rng.range(4, 11);
    ctx.save();
    ctx.translate(rng.range(8, w - 8), rng.range(8, h - 8));
    ctx.rotate(rng.range(0, 3));
    shadedBox(ctx, -s / 2, -s / 2, s, s * rng.range(0.6, 1), 1, rng.pick(['#8a857c', '#9b5a44', '#6f6b64', '#a8a39a']), { lineWidth: 0.8 });
    ctx.restore();
  }
};

const glass: PropDrawer = (ctx, w, h, rng) => {
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = `rgba(200,225,235,${rng.range(0.35, 0.8)})`;
    ctx.save();
    ctx.translate(rng.range(4, w - 4), rng.range(4, h - 4));
    ctx.rotate(rng.range(0, 3));
    const s = rng.range(2, 5);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, s * 0.6);
    ctx.lineTo(-s * 0.6, s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

const treePit: PropDrawer = (ctx, w, h, rng) => {
  shadedBox(ctx, 1, 1, w - 2, h - 2, 2, '#8b8880', { light: 0.08 });
  ctx.fillStyle = '#3f3428';
  ctx.fillRect(7, 7, w - 14, h - 14);
  speckle(ctx, w - 14, h - 14, 40, ['#56473a', '#2e261d', '#5a6a40'], 1, 3, rng);
};

const planks: PropDrawer = (ctx, w, h, rng) => {
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(w / 2 + rng.range(-8, 8), h / 2 + rng.range(-8, 8));
    ctx.rotate(rng.range(0, 3));
    shadedBox(ctx, -24, -5, 48, 10, 1, shade('#8a6a46', rng.range(-0.1, 0.1)), { lineWidth: 1 });
    ctx.restore();
  }
};

export const DECAL_DRAWERS: Record<string, PropDrawer> = {
  'decal.blood.a': blood(1),
  'decal.blood.b': blood(2),
  'decal.blood.c': blood(3),
  'decal.bloodtrail': bloodTrail,
  'decal.oil': oil,
  'decal.crack.a': crack(4),
  'decal.crack.b': crack(5),
  'decal.leaves.a': leaves(6),
  'decal.leaves.b': leaves(7),
  'decal.paper.a': paper(8),
  'decal.paper.b': paper(9),
  'decal.manhole': manhole,
  'decal.drain': drain,
  'decal.dirt': dirt,
  'decal.doormat': doormat,
  'decal.skid': skid,
  'decal.debris': debris,
  'decal.glass': glass,
  'decal.treepit': treePit,
  'decal.planks': planks,
  ...NATURE_DECAL_DRAWERS,
};

