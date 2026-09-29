/**
 * Conferência do prédio na GRADE DOS ZUMBIS (células de meio tile), que é
 * mais grossa que a grade do jogador usada pelo mobiliador: uma cadeira e
 * um lixo podem deixar o jogador passar e ainda assim fechar a passagem
 * para a IA. Monta o prédio sozinho (mesmo MapBuilder do mapa, origem em
 * tile inteiro — a grade de meio tile fica alinhada com a do mundo) e tira
 * o móvel que fecha a passagem até todo cômodo ser alcançável de fora.
 */
import { propSolids } from '../../collision';
import { MapBuilder } from '../../MapBuilder';
import { Ground, type MapData } from '../../MapTypes';
import { PROP_DEFS } from '../../PropCatalog';
import { NavGrid } from '../../nav/NavGrid';
import type { BuildingTemplate } from '../BuildingTemplate';

interface NavState {
  map: MapData;
  grid: NavGrid;
  reach: Uint8Array;
  /** Célula-alvo de cada cômodo (livre, dentro dele; alcançável se houver). */
  targets: ({ cx: number; cy: number } | null)[];
  bad: number[];
}

function navState(tpl: BuildingTemplate, from?: readonly [number, number]): NavState {
  const b = new MapBuilder('nav', 'nav', tpl.w + 2, tpl.h + 2, 1, Ground.Grass);
  b.building(tpl, 1, 1, { id: 'n' });
  const map = b.build();
  const grid = NavGrid.fromMap(map);
  const start = from ? grid.cellOf((1 + from[0]) * 64, (1 + from[1]) * 64) : { cx: 0, cy: 0 };
  const reach = grid.reachableFrom(start.cx, start.cy);
  // Célula-alvo de cada cômodo: a livre mais perto do meio que a rua alcança (ou, se nenhuma, a livre mais perto do meio).
  const targets = tpl.floors.map((f) => {
    const [x, y, w, h] = f.rect;
    const mx = (1 + x + w / 2) * 64;
    const my = (1 + y + h / 2) * 64;
    let best: { cx: number; cy: number } | null = null;
    let bestD = Infinity;
    let bestReach = false;
    for (let cy = Math.ceil(((1 + y) * 64) / grid.cell); (cy + 0.5) * grid.cell < (1 + y + h) * 64; cy++) {
      for (let cx = Math.ceil(((1 + x) * 64) / grid.cell); (cx + 0.5) * grid.cell < (1 + x + w) * 64; cx++) {
        if (grid.isBlocked(cx, cy)) continue;
        const r = reach[cy * grid.cols + cx] === 1;
        const d = ((cx + 0.5) * grid.cell - mx) ** 2 + ((cy + 0.5) * grid.cell - my) ** 2;
        if ((r && !bestReach) || (r === bestReach && d < bestD)) {
          best = { cx, cy };
          bestD = d;
          bestReach = r;
        }
      }
    }
    return best;
  });
  const bad: number[] = [];
  targets.forEach((t, i) => {
    if (!t || !reach[t.cy * grid.cols + t.cx]) bad.push(i);
  });
  return { map, grid, reach, targets, bad };
}

/**
 * Cômodos (índices) em que a grade dos zumbis não alcança nenhuma parte a
 * partir da rua (ou de `from`, ponto local: a escada de um andar de cima).
 * Mesa no meio da sala não conta: o zumbi chega no resto do cômodo.
 */
export function navBlockedRooms(tpl: BuildingTemplate, from?: readonly [number, number]): number[] {
  return navState(tpl, from).bad;
}

/**
 * Tira móveis até todo cômodo ficar alcançável. Acha o "bolsão" onde o
 * cômodo ficou preso e tira, dos móveis que encostam nele, o que está mais
 * perto da parte alcançável (é ele que faz a parede de móveis).
 */
export function openForNav(tpl: BuildingTemplate, from?: readonly [number, number]): BuildingTemplate {
  let props = [...tpl.props];
  for (let k = 0; k < 40; k++) {
    const st = navState({ ...tpl, props }, from);
    if (!st.bad.length) break;
    const { grid, reach } = st;
    const n = grid.cols * grid.rows;
    // Distância (em células, atravessando tudo) até a parte alcançável.
    const dist = new Int32Array(n).fill(-1);
    const queue: number[] = [];
    for (let i = 0; i < n; i++) {
      if (reach[i]) {
        dist[i] = 0;
        queue.push(i);
      }
    }
    for (let q = 0; q < queue.length; q++) {
      const c = queue[q]!;
      const cx = c % grid.cols;
      const cy = (c - cx) / grid.cols;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!grid.inBounds(nx, ny)) continue;
        const j = ny * grid.cols + nx;
        if (dist[j]! >= 0) continue;
        dist[j] = dist[c]! + 1;
        queue.push(j);
      }
    }
    // Bolsão do cômodo preso: o pedaço livre dele mais perto da parte alcançável (em
    // geral o da porta). Cômodo todo tomado: a célula mais perto do meio.
    const [x, y, w, h] = tpl.floors[st.bad[0]!]!.rect;
    let t = st.targets[st.bad[0]!] ?? grid.cellOf((1 + x + w / 2) * 64, (1 + y + h / 2) * 64);
    let tBest = Infinity;
    for (let cy = Math.ceil(((1 + y) * 64) / grid.cell); (cy + 0.5) * grid.cell < (1 + y + h) * 64; cy++) {
      for (let cx = Math.ceil(((1 + x) * 64) / grid.cell); (cx + 0.5) * grid.cell < (1 + x + w) * 64; cx++) {
        const d = dist[cy * grid.cols + cx]!;
        if (!grid.isBlocked(cx, cy) && d >= 0 && d < tBest) {
          tBest = d;
          t = { cx, cy };
        }
      }
    }
    const pocket = grid.isBlocked(t.cx, t.cy) ? new Uint8Array(n) : grid.reachableFrom(t.cx, t.cy);
    pocket[t.cy * grid.cols + t.cx] = 1;
    // Móveis que encostam no bolsão; sai o mais perto do lado alcançável.
    let worst = -1;
    let best = Infinity;
    st.map.props.forEach((p, i) => {
      if (PROP_DEFS[p.type].collider.shape === 'none') return;
      let touches = false;
      let score = Infinity;
      for (const s of propSolids(p)) {
        const [x0, y0, x1, y1] = s.kind === 'rect' ? [s.x, s.y, s.x + s.w, s.y + s.h] : [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r];
        for (let cy = Math.floor(y0 / grid.cell) - 1; cy <= Math.floor(y1 / grid.cell) + 1; cy++) {
          for (let cx = Math.floor(x0 / grid.cell) - 1; cx <= Math.floor(x1 / grid.cell) + 1; cx++) {
            if (!grid.inBounds(cx, cy)) continue;
            const j = cy * grid.cols + cx;
            if (pocket[j]) touches = true;
            if (dist[j]! >= 0) score = Math.min(score, dist[j]!);
          }
        }
      }
      if (touches && score < best) {
        best = score;
        worst = i;
      }
    });
    if (worst < 0) break;
    props = props.filter((_, i) => i !== worst);
  }
  return props.length === tpl.props.length ? tpl : { ...tpl, props };
}
