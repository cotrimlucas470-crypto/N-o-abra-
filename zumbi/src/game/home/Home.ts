/**
 * MORADIA como sistema (puro): o resumo do que a casa escolhida tem de
 * verdade, lido do estado do mundo. Comida e água guardadas (só recipientes
 * já abertos e o que está no chão, sem gerar nada) e por quantos dias
 * seguram, camas, fogão, energia, portas/janelas trancadas ou reforçadas,
 * oficina, armas, remédios, coletores e canteiros. Nada aqui muda o mundo.
 */
import { HOME_TUNING as T } from '../config/HomeTuning';
import { STRUCTURE_DEFS } from '../build/StructureCatalog';
import { itemDef } from '../items/ItemCatalog';
import type { ItemState } from '../items/condition';
import type { ItemDef } from '../items/ItemTypes';
import type { WorldState } from '../sim/WorldState';
import { dailyNeed, drinkValue, foodValue, type Supply } from '../survival/Provisions';
import type { BuildingData, Rect } from '../world/MapTypes';
import { buildingAtPoint } from '../world/shelter';
import { BUILDING_LABEL } from '../world/render/MapImage';

export interface HomeWorld {
  state: WorldState;
  isPowered(buildingId: string): boolean;
  /** Ainda tem gás no fogão da cidade. */
  gasOn: boolean;
  /** Dia de jogo (fração), para a validade da comida. */
  now: number;
  /** O jogador tem a ferramenta (abridor de lata...). */
  hasTag(tag: string): boolean;
}

export interface HomeSummary {
  name: string;
  building: string | null;
  /** Quanto de fome/sede o guardado tira (pontos) e por quantos dias segura. */
  food: number;
  water: number;
  foodDays: number;
  waterDays: number;
  /** Recipientes dentro da casa e quantos ainda não foram vasculhados. */
  containers: number;
  unsearched: number;
  beds: number;
  sofas: number;
  cook: string | null;
  power: boolean;
  fridge: boolean;
  doors: number;
  doorsSafe: number;
  windows: number;
  windowsSafe: number;
  windowsBroken: number;
  boarded: number;
  workshop: boolean;
  weapons: number;
  ammo: number;
  medical: number;
  waterSources: number;
  planters: number;
  /** 0..1: quão fechada a casa está para a rua. */
  security: number;
}

export interface SummaryRow {
  label: string;
  value: string;
  tone: 'ok' | 'warn' | 'bad' | 'info';
}

interface Area {
  rects: Rect[];
  circle: { x: number; y: number; r: number } | null;
}

function inside(a: Area, x: number, y: number, pad = 0): boolean {
  if (a.circle) return Math.hypot(x - a.circle.x, y - a.circle.y) <= a.circle.r + pad;
  return a.rects.some((r) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad);
}

/** Pontos de consulta (centro de cada área) e raio que cobre cada uma. */
function probes(a: Area): { x: number; y: number; r: number }[] {
  if (a.circle) return [a.circle];
  return a.rects.map((r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, r: Math.hypot(r.w, r.h) / 2 + 40 }));
}

function areaOf(w: HomeWorld, home: { x: number; y: number }): { area: Area; b: BuildingData | null } {
  const b = buildingAtPoint(w.state.model, home.x, home.y);
  if (!b) return { area: { rects: [], circle: { x: home.x, y: home.y, r: T.campRadius } }, b: null };
  const rects: Rect[] = [b.bounds];
  const floors = w.state.model.floors;
  for (let lv = 1; lv <= floors.top(b.id); lv++) {
    const f = floors.floorOf(b.id, lv);
    if (f) rects.push(f.bounds);
  }
  return { area: { rects, circle: null }, b };
}

function tally(s: HomeSummary, def: ItemDef, st: ItemState | undefined, count: number, w: HomeWorld): void {
  const sup: Supply = { def, count, ...(st ? { st } : {}) };
  s.food += foodValue(sup, w.now, (t) => w.hasTag(t)) * count;
  s.water += drinkValue(sup) * count;
  if (def.category === 'arma-branca' || def.category === 'arma-de-fogo') s.weapons += count;
  if (def.ammo) s.ammo += def.ammo.rounds * count;
  if (def.category === 'medicina') s.medical += count;
}

export function homeSummary(home: { x: number; y: number; name: string }, w: HomeWorld, current = { hunger: 0, thirst: 0 }): HomeSummary {
  const { area, b } = areaOf(w, home);
  const s: HomeSummary = {
    name: home.name || (b ? BUILDING_LABEL[b.kind] : 'Acampamento'),
    building: b?.id ?? null,
    food: 0, water: 0, foodDays: 0, waterDays: 0,
    containers: 0, unsearched: 0,
    beds: 0, sofas: 0, cook: null,
    power: b ? w.isPowered(b.id) : false,
    fridge: false,
    doors: 0, doorsSafe: 0, windows: 0, windowsSafe: 0, windowsBroken: 0, boarded: 0,
    workshop: false, weapons: 0, ammo: 0, medical: 0, waterSources: 0, planters: 0,
    security: 0,
  };
  const st = w.state;
  const seenRef = new Set<string>();
  const seenProp = new Set<string>();
  const seenStruct = new Set<string>();
  const seenItem = new Set<string>();
  let cookRank = 0;
  const cook = (rank: number, label: string) => {
    if (rank > cookRank) {
      cookRank = rank;
      s.cook = label;
    }
  };
  for (const p of probes(area)) {
    // Recipientes: só o que já foi aberto (sem gerar loot novo ao olhar o resumo).
    for (const { ref } of st.loot.refsNear(p.x, p.y, p.r)) {
      if (seenRef.has(ref.id) || !inside(area, ref.x, ref.y, 8) || ref.kind === 'corpo') continue;
      seenRef.add(ref.id);
      s.containers++;
      // Móvel construído começa vazio: o que tem dentro foi o jogador que pôs.
      if (ref.kind !== 'construido' && !st.loot.isSearched(ref.id)) {
        s.unsearched++;
        continue;
      }
      for (const stack of st.loot.peek(ref.id)?.stacks ?? []) {
        const def = itemDef(stack.defId);
        if (def) tally(s, def, stack.st, stack.count, w);
      }
    }
    for (const it of st.itemsNear(p.x, p.y, Math.min(p.r, 1000))) {
      if (seenItem.has(it.id) || !inside(area, it.x, it.y)) continue;
      seenItem.add(it.id);
      const def = itemDef(it.defId);
      if (def) tally(s, def, it.st, it.count, w);
    }
    for (const { prop } of st.propsNear(p.x, p.y, p.r)) {
      if (seenProp.has(prop.id) || !inside(area, prop.x, prop.y)) continue;
      seenProp.add(prop.id);
      if (prop.type === 'bedDouble' || prop.type === 'bedSingle') s.beds++;
      else if (prop.type === 'sofa') s.sofas++;
      else if (prop.type === 'stove') cook(w.gasOn ? 3 : 1, w.gasOn ? 'Fogão a gás' : 'Fogão (sem gás)');
      else if (prop.type === 'workbench') s.workshop = true;
      else if (prop.type === 'fridge') s.fridge = true;
    }
    for (const x of st.structures.near(p.x, p.y, p.r)) {
      if (seenStruct.has(x.id) || !inside(area, x.x, x.y, 8)) continue;
      seenStruct.add(x.id);
      const d = STRUCTURE_DEFS[x.type];
      if (d.seat?.sleep === 'cama') s.beds++;
      if (d.station === 'bancada') s.workshop = true;
      if (x.type === 'fogaoLenha') cook(4, 'Fogão a lenha');
      else if (x.type === 'fogueira') cook(2, 'Fogueira');
      if (d.kind === 'agua') s.waterSources++;
      if (d.kind === 'canteiro') s.planters++;
    }
  }
  if (!s.power) s.fridge = false;

  // Portas e janelas que dão para a rua.
  const sf = T.safety;
  let safety = 0;
  let openings = 0;
  if (b) {
    for (const d of st.model.map.doors) {
      if (d.buildingId !== b.id || !d.exterior) continue;
      s.doors++;
      const ds = st.doorState(d.id);
      const boarded = !!st.boardedOn(d.id);
      if (boarded) s.boarded++;
      const v = boarded ? sf.boarded : !ds || ds.broken ? sf.broken : ds.locked && !ds.open ? sf.locked : !ds.open ? sf.closed : sf.open;
      if (v >= sf.locked) s.doorsSafe++;
      safety += v;
      openings++;
    }
    const r = b.bounds;
    const seenWin = new Set<string>();
    for (const { id, wall } of st.windowsNear(r.x + r.w / 2, r.y + r.h / 2, Math.hypot(r.w, r.h) / 2 + 40)) {
      const cx = wall.x + wall.w / 2;
      const cy = wall.y + wall.h / 2;
      if (seenWin.has(id) || !inside({ rects: [r], circle: null }, cx, cy, 20)) continue;
      seenWin.add(id);
      s.windows++;
      const boarded = !!st.boardedOn(id);
      const broken = st.isWindowBroken(id);
      if (boarded) s.boarded++;
      if (broken && !boarded) s.windowsBroken++;
      const v = boarded ? sf.boarded : broken ? sf.broken : sf.intactWindow;
      if (boarded) s.windowsSafe++;
      safety += v;
      openings++;
    }
  }
  s.security = openings ? safety / openings : 0;

  const need = dailyNeed();
  s.foodDays = Math.max(0, (s.food - Math.max(0, current.hunger)) / need.hunger);
  s.waterDays = Math.max(0, (s.water - Math.max(0, current.thirst)) / need.thirst);
  return s;
}

function daysLabel(d: number): string {
  if (d < 0.5) return 'menos de meio dia';
  if (d < 1.5) return '≈ 1 dia';
  return `≈ ${Math.floor(d)} dias`;
}

/** Linhas do painel MORADIA (texto curto, com cor pelo que importa). */
export function homeRows(s: HomeSummary): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const stock = (d: number) => (d >= 5 ? 'ok' : d >= 2 ? 'warn' : 'bad') as SummaryRow['tone'];
  rows.push({ label: 'Comida guardada', value: s.food > 0 ? daysLabel(s.foodDays) : 'nada', tone: stock(s.foodDays) });
  rows.push({ label: 'Água guardada', value: s.water > 0 ? daysLabel(s.waterDays) : 'nada', tone: stock(s.waterDays) });
  if (s.containers) rows.push({ label: 'Armários', value: s.unsearched ? `${s.containers} (${s.unsearched} sem vasculhar)` : `${s.containers}, todos vistos`, tone: s.unsearched ? 'info' : 'ok' });
  rows.push({ label: 'Onde dormir', value: s.beds ? `${s.beds} cama${s.beds > 1 ? 's' : ''}${s.sofas ? ` · ${s.sofas} sofá` : ''}` : s.sofas ? `${s.sofas} sofá` : 'só o chão', tone: s.beds ? 'ok' : s.sofas ? 'warn' : 'bad' });
  rows.push({ label: 'Cozinhar', value: s.cook ?? 'sem fogo', tone: s.cook && s.cook !== 'Fogão (sem gás)' ? 'ok' : 'warn' });
  rows.push({ label: 'Energia e luz', value: s.power ? (s.fridge ? 'ligada · geladeira gelando' : 'ligada') : 'sem energia', tone: s.power ? 'ok' : 'info' });
  if (s.building) {
    const sec = Math.round(s.security * 100);
    rows.push({ label: 'Segurança', value: `${sec}%`, tone: sec >= 75 ? 'ok' : sec >= 45 ? 'warn' : 'bad' });
    rows.push({ label: 'Portas p/ a rua', value: s.doors ? `${s.doorsSafe}/${s.doors} trancadas ou pregadas` : 'nenhuma', tone: s.doorsSafe >= s.doors ? 'ok' : 'warn' });
    rows.push({ label: 'Janelas', value: s.windows ? `${s.windowsSafe}/${s.windows} com tábuas${s.windowsBroken ? ` · ${s.windowsBroken} quebrada${s.windowsBroken > 1 ? 's' : ''}` : ''}` : 'nenhuma', tone: s.windowsBroken ? 'bad' : s.windowsSafe >= s.windows ? 'ok' : 'warn' });
  } else rows.push({ label: 'Segurança', value: 'ao ar livre', tone: 'bad' });
  rows.push({ label: 'Oficina', value: s.workshop ? 'bancada' : 'nenhuma', tone: s.workshop ? 'ok' : 'info' });
  rows.push({ label: 'Armas guardadas', value: s.weapons ? `${s.weapons}${s.ammo ? ` · ${s.ammo} balas` : ''}` : s.ammo ? `${s.ammo} balas` : 'nenhuma', tone: s.weapons ? 'ok' : 'info' });
  rows.push({ label: 'Remédios', value: s.medical ? `${s.medical}` : 'nenhum', tone: s.medical >= 3 ? 'ok' : s.medical ? 'warn' : 'bad' });
  if (s.waterSources || s.planters) rows.push({ label: 'Produção', value: [s.waterSources ? `${s.waterSources} coletor${s.waterSources > 1 ? 'es' : ''}` : '', s.planters ? `${s.planters} canteiro${s.planters > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · '), tone: 'ok' });
  return rows;
}

/** O que falta, em uma linha (o painel mostra embaixo). */
export function homeAdvice(s: HomeSummary): string | null {
  if (s.building && s.windowsBroken) return 'Pregue tábuas nas janelas quebradas: é por onde eles entram.';
  if (s.water <= 0 || s.waterDays < 1) return 'Traga água para casa (ou monte um coletor de chuva).';
  if (s.food <= 0 || s.foodDays < 1) return 'Guarde comida aqui: um estoque segura dias sem sair.';
  if (s.building && s.doorsSafe < s.doors) return 'Tranque ou pregue as portas da rua.';
  if (!s.beds) return 'Uma cama (ou fabricar uma) faz o sono render mais.';
  if (!s.cook) return 'Sem fogo: monte uma fogueira ou um fogão a lenha.';
  return null;
}
