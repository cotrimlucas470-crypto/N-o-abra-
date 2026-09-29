import { describe, expect, it } from 'vitest';
import { homeAdvice, homeRows, homeSummary, type HomeWorld } from '../src/game/home/Home';
import { planExpedition, type ExpeditionInput } from '../src/game/home/Expedition';
import { itemDef } from '../src/game/items/ItemCatalog';
import { WorldState } from '../src/game/sim/WorldState';
import type { WeatherSample } from '../src/game/sim/Weather';
import { DEFAULT_CONTEXT } from '../src/game/survival/Body';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';

function world() {
  const state = new WorldState(new WorldModel(buildStarterDistrict()));
  const house = state.model.map.buildings.find((b) => b.kind === 'house' && b.rooms.length >= 3 && !b.floorOf)!;
  const w: HomeWorld = { state, isPowered: () => false, gasOn: false, now: 1, hasTag: () => true };
  const r = house.bounds;
  return { state, house, w, c: { x: r.x + r.w / 2, y: r.y + r.h / 2, name: '' } };
}

describe('moradia: resumo pelo estado do mundo', () => {
  it('conta comida e água guardadas (dias), cama, fogão, oficina e armas', () => {
    const { state, w, c } = world();
    const before = homeSummary(c, w);
    expect(before.name).toBe('Casa');
    state.dropItem('agua', 6, c.x, c.y);
    state.dropItem('feijao', 6, c.x + 10, c.y);
    state.dropItem('faca', 1, c.x, c.y + 10);
    state.structures.add('camaMadeira', c.x, c.y + 40);
    state.structures.add('fogaoLenha', c.x - 64, c.y);
    state.structures.add('bancadaMadeira', c.x + 64, c.y + 64);
    const s = homeSummary(c, w);
    expect(s.water).toBeGreaterThan(before.water);
    expect(s.waterDays).toBeGreaterThan(before.waterDays);
    expect(s.foodDays).toBeGreaterThan(before.foodDays);
    expect(s.beds).toBe(before.beds + 1);
    expect(s.cook).toBe('Fogão a lenha');
    expect(s.workshop).toBe(true);
    expect(s.weapons).toBeGreaterThanOrEqual(1);
    const rows = homeRows(s);
    expect(rows.find((r) => r.label === 'Onde dormir')!.tone).toBe('ok');
    expect(rows.some((r) => r.label === 'Segurança')).toBe(true);
  });

  it('só conta recipientes já abertos (olhar o resumo não gera loot)', () => {
    const { state, house, w, c } = world();
    const s = homeSummary(c, w);
    expect(s.containers).toBeGreaterThan(0);
    expect(s.unsearched).toBe(s.containers);
    const r = house.bounds;
    const inside = state.loot.refsNear(c.x, c.y, 900).filter(({ ref }) => ref.x >= r.x && ref.x <= r.x + r.w && ref.y >= r.y && ref.y <= r.y + r.h);
    expect(inside.length).toBeGreaterThan(0);
    for (const { ref } of inside) expect(state.loot.peek(ref.id)).toBeNull();
    state.loot.open(inside[0]!.ref.id);
    expect(homeSummary(c, w).unsearched).toBe(s.unsearched - 1);
  });

  it('janelas quebradas e portas abertas baixam a segurança; tábuas sobem', () => {
    const { state, house, w, c } = world();
    const base = homeSummary(c, w);
    expect(base.windows).toBeGreaterThan(0);
    const r = house.bounds;
    const wins = state.windowsNear(c.x, c.y, Math.hypot(r.w, r.h) / 2 + 40).filter(({ wall }) => {
      const x = wall.x + wall.w / 2;
      const y = wall.y + wall.h / 2;
      return x >= r.x - 20 && x <= r.x + r.w + 20 && y >= r.y - 20 && y <= r.y + r.h + 20;
    });
    state.breakWindow(wins[0]!.wall);
    const broken = homeSummary(c, w);
    expect(broken.windowsBroken).toBe(1);
    expect(broken.security).toBeLessThan(base.security);
    expect(homeAdvice(broken)).toMatch(/janelas quebradas/);
    for (const { id, wall } of wins) state.structures.add('tabuasPregadas', wall.x + wall.w / 2, wall.y + wall.h / 2, 0, { on: id });
    const boarded = homeSummary(c, w);
    expect(boarded.windowsSafe).toBe(boarded.windows);
    expect(boarded.security).toBeGreaterThan(base.security);
  });

  it('fora de prédio: acampamento, sem segurança', () => {
    const { w, house } = world();
    const s = homeSummary({ x: house.bounds.x - 600, y: house.bounds.y - 600, name: '' }, w);
    expect(s.building).toBeNull();
    expect(s.name).toBe('Acampamento');
    expect(homeRows(s).find((r) => r.label === 'Segurança')!.value).toBe('ao ar livre');
  });
});

const SKY: WeatherSample = { temp: 20, cloud: 0.2, rain: 0, snow: 0, precip: 0, fog: 0, wind: 0.1, humidity: 0.5, thunder: 0, front: 0, sky: 'limpo' };

function trip(o: Partial<ExpeditionInput> = {}): ExpeditionInput {
  return {
    from: { x: 0, y: 0 },
    to: { x: 64 * 200, y: 0, name: 'Mercado' },
    back: null,
    walkPx: 185,
    gameMinPerSec: 1.6,
    minuteOfDay: 8 * 60,
    dayHours: 12.6,
    body: { hunger: 20, thirst: 20, fatigue: 20, wet: 0, sickness: 0, temp: 37 },
    ctx: { ...DEFAULT_CONTEXT, sheltered: false, load: 0.3 },
    weatherNow: SKY,
    weatherBack: SKY,
    carried: [],
    now: 1,
    hasTag: () => true,
    weight: 6,
    capacity: 20,
    gun: null,
    melee: 'Faca',
    light: false,
    health: { bleeding: false, infection: false, pain: 0, limp: false },
    ...o,
  };
}

describe('expedição: preparar antes de sair', () => {
  it('distância e tempo crescem com o destino; ida e volta', () => {
    const near = planExpedition(trip({ to: { x: 64 * 60, y: 0, name: 'Perto' } }));
    const far = planExpedition(trip());
    expect(far.total).toBeCloseTo(far.out * 2, 5);
    expect(far.minutesTotal).toBeGreaterThan(near.minutesTotal);
    expect(far.returnAt).toBeGreaterThan(8 * 60);
  });

  it('sem água numa viagem longa: aviso; levando água resolve', () => {
    const long = trip({ to: { x: 64 * 900, y: 0, name: 'Longe' }, body: { hunger: 20, thirst: 40, fatigue: 10, wet: 0, sickness: 0, temp: 37 } });
    const dry = planExpedition(long);
    expect(dry.rows.find((r) => r.label === 'Água')!.tone).toBe('bad');
    expect(dry.warnings.some((w) => /água/.test(w))).toBe(true);
    const water = planExpedition({ ...long, carried: [{ def: itemDef('agua')!, count: 6 }] });
    expect(water.rows.find((r) => r.label === 'Água')!.tone).toBe('ok');
    expect(water.waterHours).toBeGreaterThan(0);
  });

  it('volta depois de escurecer sem lanterna é arriscado; sangrando também', () => {
    const late = planExpedition(trip({ minuteOfDay: 17.5 * 60 }));
    expect(late.darkOnReturn).toBe(true);
    expect(late.rows.find((r) => r.label === 'Tempo')!.tone).toBe('bad');
    expect(late.verdict.tone).toBe('bad');
    const lit = planExpedition(trip({ minuteOfDay: 17.5 * 60, light: true }));
    expect(lit.rows.find((r) => r.label === 'Tempo')!.tone).toBe('warn');
    const bleed = planExpedition(trip({ health: { bleeding: true, infection: false, pain: 30, limp: false } }));
    expect(bleed.warnings[0]).toMatch(/Sangrando/);
    expect(bleed.verdict.tone).toBe('bad');
  });

  it('peso e carga contam: mais pesado gasta mais sede', () => {
    const light = planExpedition(trip());
    const heavy = planExpedition(trip({ weight: 19, ctx: { ...DEFAULT_CONTEXT, sheltered: false, load: 0.95 } }));
    expect(heavy.thirstEnd).toBeGreaterThan(light.thirstEnd);
    expect(heavy.rows.find((r) => r.label === 'Peso')!.tone).toBe('warn');
  });

  it('bem preparado de manhã: pronto para sair', () => {
    const p = planExpedition(trip({ to: { x: 64 * 80, y: 0, name: 'Perto' }, carried: [{ def: itemDef('agua')!, count: 2 }, { def: itemDef('feijao')!, count: 1 }], gun: { name: 'Revólver', loaded: 6, capacity: 6, spare: 12 } }));
    expect(p.verdict.tone).toBe('ok');
    expect(p.warnings).toHaveLength(0);
  });
});
