/** Prévia da arte dos zumbis (só desenvolvimento: npx vite → /dev/zombies.html). */
import { drawCorpse, drawZombieSheet } from '../src/game/assets/procedural/zombieArt';
import { ARCHETYPES, type ArchId } from '../src/game/zombies/Archetypes';
import { difficultyFrom, ZOMBIE_PRESETS } from '../src/game/zombies/Difficulty';
import { createZombie } from '../src/game/zombies/ZombieFactory';

const diff = difficultyFrom(ZOMBIE_PRESETS.sobrevivencia.settings);
const params = new URLSearchParams(location.search);
const scale = Number(params.get('s') ?? 2);
const one = params.get('one');
const archs = Object.keys(ARCHETYPES) as ArchId[];
const canvas = document.getElementById('c') as HTMLCanvasElement;
const cols = 6;
const cell = 110;
const rows = Math.ceil(archs.length * 2 / cols);
canvas.width = cols * cell * scale;
canvas.height = (rows * cell + 260) * scale;
const ctx = canvas.getContext('2d')!;
ctx.scale(scale, scale);
ctx.fillStyle = '#3a3d36';
ctx.fillRect(0, 0, canvas.width, canvas.height);
let i = 0;
for (const arch of one ? [one as ArchId, one as ArchId, one as ArchId] : archs) {
  for (let k = 0; k < 2; k++) {
    const z = createZombie({ id: 'p', seed: 1000 + i * 17, arch, x: 0, y: 0, collapseDays: k * 20 }, diff);
    if (i % 5 === 3) { z.parts.bracoE = 0; z.parts.maoE = 0; }
    if (i % 7 === 2) z.hits.push({ part: 'tronco', kind: 'tiro' }, { part: 'cabeca', kind: 'corte' });
    const { canvas: sheet, layout } = drawZombieSheet(z);
    const cx = (i % cols) * cell + cell / 2;
    const cy = Math.floor(i / cols) * cell + cell / 2;
    const f = (n: string) => layout.frames[n]!;
    const R = 1.5;
    const put = (n: string, x: number, y: number, rot: number) => {
      const fr = f(n);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.drawImage(sheet, fr.x, fr.y, fr.w, fr.h, -fr.w * fr.ox / R, -fr.h * fr.oy / R, fr.w / R, fr.h / R);
      ctx.restore();
    };
    const face = -Math.PI / 2;
    put('legs1', cx, cy, face);
    const W = 16 * z.look.scale;
    for (const [n, sy] of [['armL', -1], ['armR', 1]] as const) {
      if (z.parts[n === 'armL' ? 'bracoE' : 'bracoD'] <= 0) continue;
      put(n, cx + Math.cos(face + Math.PI / 2) * sy * W * 0.8, cy + Math.sin(face + Math.PI / 2) * sy * W * 0.8, face + sy * 0.12);
    }
    put('torso', cx, cy, face);
    put('head', cx + Math.cos(face) * 3, cy + Math.sin(face) * 3, face);
    ctx.fillStyle = '#ddd';
    ctx.font = '8px sans-serif';
    ctx.fillText(`${arch} ${z.look.female ? 'F' : 'M'}${z.look.age} d${z.look.decay.toFixed(1)}`, cx - 50, cy + 48);
    i++;
  }
}
// Corpos e folha crua de um.
const y0 = rows * cell + 10;
for (let k = 0; k < 5; k++) {
  const z = createZombie({ id: 'c', seed: 77 + k * 31, arch: archs[k * 3]!, x: 0, y: 0, collapseDays: 10 }, diff);
  if (k === 1) z.parts.cabeca = 0;
  if (k === 3) z.parts.pernaD = 0;
  const c = drawCorpse(z);
  ctx.drawImage(c, 10 + k * 130, y0, c.width / 1.5, c.height / 1.5);
}
const z = createZombie({ id: 's', seed: 5, arch: 'policial', x: 0, y: 0, collapseDays: 0 }, diff);
const { canvas: sheet } = drawZombieSheet(z);
ctx.drawImage(sheet, 10, y0 + 70, sheet.width / 1.5, sheet.height / 1.5);
(window as unknown as { done: boolean }).done = true;
