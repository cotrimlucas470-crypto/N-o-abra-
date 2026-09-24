/**
 * Geometria de colisão do mapa, em px de mundo — pura, sem Phaser.
 * O mesmo cálculo alimenta a física (WorldRenderer) e os testes
 * (acessibilidade dos cômodos), então o que o teste aprova é o que o jogo usa.
 *
 * A física Arcade só entende retângulos alinhados e círculos. Objetos
 * girados em ângulos "tortos" (carro batido a 28°) viram uma fileira de
 * círculos ao longo do comprimento — colisão justa, sem caixa gigante.
 */
import type { MapData, PropPlacement } from './MapTypes';
import { PROP_DEFS } from './PropCatalog';

export type Solid =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'circle'; x: number; y: number; r: number };

const DEG = Math.PI / 180;

function rotate(x: number, y: number, deg: number): [number, number] {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [x * c - y * s, x * s + y * c];
}

/** Ângulo é múltiplo de 90° (com tolerância)? Devolve 0/1/2/3 ou null. */
function quarterTurns(deg: number): number | null {
  const q = deg / 90;
  const r = Math.round(q);
  return Math.abs(q - r) < 0.02 ? ((r % 4) + 4) % 4 : null;
}

export function propSolids(p: PropPlacement): Solid[] {
  const def = PROP_DEFS[p.type];
  const col = def.collider;
  if (col.shape === 'none') return [];
  const flip = p.flipX ? -1 : 1;
  const [ox, oy] = rotate((col.ox ?? 0) * flip, col.oy ?? 0, p.angle);
  const cx = p.x + ox;
  const cy = p.y + oy;

  if (col.shape === 'circle') return [{ kind: 'circle', x: cx, y: cy, r: col.r }];

  const q = quarterTurns(p.angle);
  if (q !== null) {
    const swap = q % 2 === 1;
    const w = swap ? col.h : col.w;
    const h = swap ? col.w : col.h;
    return [{ kind: 'rect', x: cx - w / 2, y: cy - h / 2, w, h }];
  }

  // Ângulo livre: fileira de círculos ao longo do eixo maior.
  const long = Math.max(col.w, col.h);
  const short = Math.min(col.w, col.h);
  const alongX = col.w >= col.h;
  const r = short / 2;
  const count = Math.max(1, Math.ceil(long / short));
  const span = long - short;
  const out: Solid[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : -span / 2 + (span * i) / (count - 1);
    const [dx, dy] = rotate(alongX ? t : 0, alongX ? 0 : t, p.angle);
    out.push({ kind: 'circle', x: cx + dx, y: cy + dy, r });
  }
  return out;
}

export function mapSolids(map: MapData, walls = true): Solid[] {
  const out: Solid[] = [];
  if (walls) for (const w of map.walls) out.push({ kind: 'rect', x: w.x, y: w.y, w: w.w, h: w.h });
  for (const p of map.props) out.push(...propSolids(p));
  return out;
}

/** Um círculo de raio `r` em (x,y) encosta em algum sólido? */
export function circleHitsSolid(x: number, y: number, r: number, s: Solid): boolean {
  if (s.kind === 'circle') {
    const dx = x - s.x;
    const dy = y - s.y;
    const rr = r + s.r;
    return dx * dx + dy * dy < rr * rr;
  }
  const nx = Math.max(s.x, Math.min(x, s.x + s.w));
  const ny = Math.max(s.y, Math.min(y, s.y + s.h));
  const dx = x - nx;
  const dy = y - ny;
  return dx * dx + dy * dy < r * r;
}
