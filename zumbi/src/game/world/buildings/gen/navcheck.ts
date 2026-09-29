/**
 * Conferência do prédio na GRADE DOS ZUMBIS (células de meio tile), que é
 * mais grossa que a grade do jogador usada pelo mobiliador: uma cadeira e
 * um lixo podem deixar o jogador passar e ainda assim fechar a passagem
 * para a IA. Monta o prédio sozinho (mesmo MapBuilder do mapa, origem em
 * tile inteiro — a grade de meio tile fica alinhada com a do mundo) e tira
 * o móvel que fecha a passagem até todo cômodo ser alcançável de fora.
 */
import { MapBuilder } from '../../MapBuilder';
import { Ground } from '../../MapTypes';
import { PROP_DEFS } from '../../PropCatalog';
import { NavGrid } from '../../nav/NavGrid';
import type { BuildingTemplate } from '../BuildingTemplate';

type TplProp = BuildingTemplate['props'][number];

/**
 * Cômodos (índices) que a grade dos zumbis não alcança a partir da rua
 * (ou de `from`, ponto local: a escada de um andar de cima).
 */
export function navBlockedRooms(tpl: BuildingTemplate, from?: readonly [number, number]): number[] {
  const b = new MapBuilder('nav', 'nav', tpl.w + 2, tpl.h + 2, 1, Ground.Grass);
  b.building(tpl, 1, 1, { id: 'n' });
  const map = b.build();
  const grid = NavGrid.fromMap(map);
  const start = from ? grid.cellOf((1 + from[0]) * 64, (1 + from[1]) * 64) : { cx: 0, cy: 0 };
  const reach = grid.reachableFrom(start.cx, start.cy);
  const out: number[] = [];
  tpl.floors.forEach((f, i) => {
    const [x, y, w, h] = f.rect;
    // Como o A*: o alvo (meio do cômodo) vira a célula livre mais próxima; ela precisa estar ligada.
    const c = grid.cellOf((1 + x + w / 2) * 64, (1 + y + h / 2) * 64);
    const t = grid.nearestWalkable(c.cx, c.cy, 3);
    if (!t || !reach[t.cy * grid.cols + t.cx]) out.push(i);
  });
  return out;
}

/**
 * Tira móveis até todo cômodo ficar alcançável: primeiro os do cômodo
 * fechado mais perto das passagens (portas) dele; em último caso, dos vizinhos.
 */
export function openForNav(tpl: BuildingTemplate, doors: readonly (readonly [number, number])[], from?: readonly [number, number]): BuildingTemplate {
  let props = [...tpl.props];
  for (let k = 0; k < 24; k++) {
    const bad = navBlockedRooms({ ...tpl, props }, from);
    if (!bad.length) break;
    const f = tpl.floors[bad[0]!]!;
    const [x, y, w, h] = f.rect;
    const inRoom = (p: TplProp, pad: number) => p.at[0] >= x - pad && p.at[0] <= x + w + pad && p.at[1] >= y - pad && p.at[1] <= y + h + pad;
    const solid = (p: TplProp) => PROP_DEFS[p.type].collider.shape !== 'none';
    const near = doors.filter(([dx, dy]) => dx >= x - 0.1 && dx <= x + w + 0.1 && dy >= y - 0.1 && dy <= y + h + 0.1);
    const cx = x + w / 2;
    const cy = y + h / 2;
    // Distância ao trajeto porta → meio do cômodo (o que a IA precisa percorrer).
    const score = (p: TplProp) => Math.min(...(near.length ? near : [[cx, cy] as const]).map(([dx, dy]) => segDist(p.at[0], p.at[1], dx, dy, cx, cy)));
    const pool = props.filter((p) => solid(p) && inRoom(p, 0));
    const cands = pool.length ? pool : props.filter((p) => solid(p) && inRoom(p, 1.2));
    if (!cands.length) break;
    const worst = cands.reduce((a, c) => (score(c) < score(a) ? c : a));
    props = props.filter((p) => p !== worst);
  }
  return props.length === tpl.props.length ? tpl : { ...tpl, props };
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const l = vx * vx + vy * vy;
  const t = l > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}
