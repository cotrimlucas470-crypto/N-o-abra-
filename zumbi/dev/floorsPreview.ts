/** Prévia das plantas dos andares (só desenvolvimento: npx vite → /dev/floors.html?n=12). */
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { addUpperFloors } from '../src/game/world/floors/UpperFloors';
import { PROP_DEFS } from '../src/game/world/PropCatalog';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 1337);
const n = Number(params.get('n') ?? 12);
const city = buildCity({ seed, sectorsX: 3, sectorsY: 3 });
const map = addUpperFloors(city);
const S = 0.42;
const cols = 4;
const cellW = 17 * 64 * S;
const cellH = 14 * 64 * S;
const list = map.floors!.slice(0, n);
// Térreo de cada prédio junto (primeira coluna do par).
const canvas = document.getElementById('c') as HTMLCanvasElement;
canvas.width = cols * 2 * cellW;
canvas.height = Math.ceil(list.length / cols) * cellH + 20;
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#1c1d1f';
ctx.fillRect(0, 0, canvas.width, canvas.height);
function draw(bx: number, by: number, rect: { x: number; y: number; w: number; h: number }, ox: number, oy: number, label: string, level: number, building: string): void {
  ctx.save();
  ctx.translate(ox - rect.x * S + 10, oy - rect.y * S + 18);
  ctx.scale(S, S);
  const b = map.buildings.find((q) => q.bounds.x === rect.x && q.bounds.y === rect.y)!;
  for (const r of b.rooms) {
    ctx.fillStyle = r.name === 'Banheiro' ? '#3a4a55' : r.name === 'Cozinha' ? '#4a4a3a' : r.name === 'Quarto' ? '#4a3a4a' : '#3d3a33';
    ctx.fillRect(r.rect.x, r.rect.y, r.rect.w, r.rect.h);
    ctx.fillStyle = '#aaa';
    ctx.font = '26px sans-serif';
    ctx.fillText(r.name, r.rect.x + 8, r.rect.y + 30);
  }
  const inR = (x: number, y: number) => x >= rect.x - 8 && x <= rect.x + rect.w + 8 && y >= rect.y - 8 && y <= rect.y + rect.h + 8;
  for (const p of map.props) {
    if (!inR(p.x, p.y) || p.ambient) continue;
    const d = PROP_DEFS[p.type];
    const q = Math.abs(p.angle) % 180 === 90;
    const w = q ? d.height : d.width;
    const h = q ? d.width : d.height;
    ctx.fillStyle = d.layer === 'floor' ? 'rgba(160,120,80,0.35)' : 'rgba(200,170,120,0.85)';
    ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h);
    ctx.fillStyle = '#111';
    ctx.font = '18px sans-serif';
    ctx.fillText(p.type, p.x - w / 2 + 2, p.y);
  }
  for (const w of map.walls) {
    if (!inR(w.x + w.w / 2, w.y + w.h / 2)) continue;
    ctx.fillStyle = w.kind === 'window' ? '#7ac' : '#ddd';
    ctx.fillRect(w.x, w.y, w.w, w.h);
  }
  for (const d of map.doors) {
    if (!inR(d.x, d.y)) continue;
    ctx.fillStyle = '#c84';
    ctx.beginPath();
    ctx.arc(d.x, d.y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  const s = map.stairs!.find((q) => q.building === building && q.level === level)!;
  ctx.fillStyle = 'rgba(120,220,120,0.6)';
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.restore();
  ctx.fillStyle = '#eee';
  ctx.font = '12px sans-serif';
  ctx.fillText(label, ox + 10, oy + 12);
}
list.forEach((f, i) => {
  const ox = (i % cols) * 2 * cellW;
  const oy = Math.floor(i / cols) * cellH;
  const g = city.buildings.find((b) => b.id === f.building)!;
  draw(0, 0, g.bounds, ox, oy, `${g.name} térreo`, 0, f.building);
  draw(0, 0, f.bounds, ox + cellW, oy, `${f.id}`, f.level, f.building);
});
(window as unknown as { done: boolean }).done = true;
