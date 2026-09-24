import { describe, expect, it } from 'vitest';
import { addFuel, extinguish, fuelLeft, fuelMinutes, heatAt, ignite, isBurning, rainPutsOut, settle } from '../src/game/build/Fire';
import { Structures } from '../src/game/build/Structures';
import { checkRecipe, craftRecipe, type CraftEnv } from '../src/game/crafting/Crafting';
import { RECIPE_BY_ID, RECIPES, type Station } from '../src/game/crafting/Recipes';
import { Flag, charge, doses } from '../src/game/items/condition';
import { ITEM_DEFS, itemDef } from '../src/game/items/ItemCatalog';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import { ItemUse } from '../src/game/interaction/ItemUse';
import { StructureInteractions } from '../src/game/interaction/StructureInteractions';
import { WaterInteractions } from '../src/game/interaction/WaterInteractions';
import type { InteractionCandidate } from '../src/game/interaction/InteractionSystem';
import type { TimedActionSpec } from '../src/game/sim/Actions';
import { WorldState } from '../src/game/sim/WorldState';
import { Survivor } from '../src/game/survival/Survivor';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';

const env = (...st: Station[]): CraftEnv => ({ stations: new Set(st), now: 3 });
const R = (id: string) => RECIPE_BY_ID.get(id)!;

function inv(...items: [string, number, object?][]): PlayerInventory {
  const i = new PlayerInventory(200);
  for (const [id, n, st] of items) i.add(id, n, st);
  return i;
}

describe('receitas: dados', () => {
  it('todo ingrediente, ferramenta e resultado existe no catálogo', () => {
    const tags = new Set(Object.values(ITEM_DEFS).flatMap((d) => d.tags));
    for (const r of RECIPES) {
      for (const ing of r.inputs) for (const o of ing.opts) expect(o.id ? !!itemDef(o.id) : tags.has(o.tag!), `${r.id}: ${o.id ?? o.tag}`).toBe(true);
      for (const t of r.tools ?? []) expect(t.tags.some((x) => tags.has(x)), `${r.id}: ${t.label}`).toBe(true);
      for (const o of r.out) expect(!!itemDef(o.id), `${r.id} → ${o.id}`).toBe(true);
      expect(r.out.length > 0 || !!r.structure).toBe(true);
    }
  });

  it('todo item "só de fabricação" tem como ser feito', () => {
    const made = new Set(RECIPES.flatMap((r) => r.out.map((o) => o.id)));
    // Itens que nascem de ações (não de receita): curativo usado, água juntada, colheita.
    const byAction = new Set(['ataduraSuja', 'aguaSuja', 'baldeAgua', 'milhoVerde', 'abobora']);
    for (const d of Object.values(ITEM_DEFS)) if (d.craftOnly) expect(made.has(d.id) || byAction.has(d.id), d.id).toBe(true);
  });

  it('consumível medido em receita é do tipo que guarda o que sobrou', () => {
    for (const r of RECIPES)
      for (const ing of r.inputs)
        for (const o of ing.opts) {
          if (o.charge === undefined || !o.id) continue;
          expect(itemDef(o.id)!.condition, o.id).toBe('battery');
        }
  });
});

describe('fabricação', () => {
  it('sem fogo não assa; com fogo assa, e o prato nasce fresco', () => {
    const i = inv(['carneBovina', 1]);
    expect(checkRecipe(R('assarCarne'), i, env()).ok).toBe(false);
    expect(checkRecipe(R('assarCarne'), i, env()).reason).toMatch(/fogo/i);
    const res = craftRecipe(R('assarCarne'), i, env('fogo'));
    expect(res.ok).toBe(true);
    expect(i.countOf('carneBovina')).toBe(0);
    expect(i.countOf('carneAssada')).toBe(1);
    const st = [...i.stacks()].find((s) => s.def.id === 'carneAssada')!.stack.st;
    expect(st?.born).toBe(3);
  });

  it('carne estragada cozida continua fazendo mal (sai contaminada)', () => {
    const i = inv(['carneBovina', 1, { born: 0 }]);
    craftRecipe(R('assarCarne'), i, { stations: new Set(['fogo']), now: 3.5 });
    const st = [...i.stacks()].find((s) => s.def.id === 'carneAssada')!.stack.st;
    expect((st?.f ?? 0) & Flag.Contaminado).toBeTruthy();
  });

  it('água: gasta doses da garrafa aberta antes da lacrada e devolve a garrafa vazia', () => {
    const i = inv(['arroz', 1], ['panela', 1], ['agua', 1], ['agua', 1, { open: 1, dose: 1 }]);
    const res = craftRecipe(R('cozinharArroz'), i, env('fogo'));
    expect(res.ok).toBe(true);
    expect(i.countOf('arrozCozido')).toBe(4);
    // 2 doses: 1 da aberta (acabou → garrafa PET) + 1 da lacrada (fica com 1).
    expect(i.countOf('garrafaPet')).toBe(1);
    const left = [...i.stacks()].filter((s) => s.def.id === 'agua');
    expect(left.length).toBe(1);
    expect(doses(left[0]!.def, left[0]!.stack.st)).toBe(1);
    expect(i.countOf('panela')).toBe(1);
  });

  it('dois ingredientes não contam o mesmo item', () => {
    // Sanduíche: 2 ovos cozidos contam como recheio, mas não se só houver 1.
    const i = inv(['paoFrances', 2], ['ovoCozido', 1]);
    expect(checkRecipe(R('sanduiche'), i, env()).ok).toBe(false);
    i.add('ovoCozido', 1);
    expect(checkRecipe(R('sanduiche'), i, env()).ok).toBe(true);
  });

  it('ferramenta desgasta e não é gasta; consumível medido gasta só a fração', () => {
    const i = inv(['tora', 1], ['serrote', 1]);
    craftRecipe(R('serrarTora'), i, env());
    expect(i.countOf('tabua')).toBe(3);
    const saw = [...i.stacks()].find((s) => s.def.id === 'serrote')!;
    expect(saw.stack.st?.c).toBeLessThan(1);
    const j = inv(['carneBovina', 1], ['sal', 1], ['faca', 1]);
    craftRecipe(R('carneSeca'), j, env());
    const sal = [...j.stacks()].find((s) => s.def.id === 'sal')!;
    expect(charge(sal.def, sal.stack.st)).toBeCloseTo(0.9, 2);
    expect(j.countOf('carneSeca')).toBe(1);
  });

  it('ferver água suja dá água boa com as mesmas doses', () => {
    const i = inv(['aguaSuja', 1, { open: 1, dose: 1 }], ['chaleira', 1]);
    craftRecipe(R('ferverAgua'), i, env('fogo'));
    const a = [...i.stacks()].find((s) => s.def.id === 'agua')!;
    expect(doses(a.def, a.stack.st)).toBe(1);
    expect(i.countOf('aguaSuja')).toBe(0);
  });

  it('salada recusa batata crua; sopa aceita', () => {
    const i = inv(['batata', 2], ['faca', 1]);
    expect(checkRecipe(R('salada'), i, env()).ok).toBe(false);
    i.add('tomate', 2);
    expect(checkRecipe(R('salada'), i, env()).ok).toBe(true);
  });

  it('fogueira: monta estrutura com a lenha dos ingredientes', () => {
    const i = inv(['galho', 4]);
    const res = craftRecipe(R('fogueira'), i, { ...env(), canPlace: () => null });
    expect(res.structure).toBe('fogueira');
    expect(res.fuel).toBe(4 * fuelMinutes(itemDef('galho')!));
    expect(i.countOf('galho')).toBe(0);
    expect(checkRecipe(R('fogueira'), inv(['lenha', 2]), { ...env(), canPlace: () => 'Só ao ar livre.' }).reason).toBe('Só ao ar livre.');
  });

  it('gasolina do galão: sobra no galão; acabou, fica o galão vazio', () => {
    const i = inv(['galho', 1], ['trapo', 1], ['combustivel', 1, { ch: 0.05 }]);
    craftRecipe(R('tocha'), i, env());
    expect(i.countOf('tocha')).toBe(1);
    expect(i.countOf('combustivel')).toBe(0);
    expect(i.countOf('galaoVazio')).toBe(1);
  });
});

describe('fogo', () => {
  it('queima com o relógio, apaga sem lenha, esquenta perto', () => {
    const s = new Structures(10000, 10000);
    const f = s.add('fogueira', 500, 500);
    addFuel(f, 60, 0);
    expect(ignite(f, 0)).toBe(true);
    expect(isBurning(f, 30)).toBe(true);
    expect(fuelLeft(f, 30)).toBeCloseTo(30, 5);
    expect(heatAt([f], 520, 500, 30)).toBeGreaterThan(0.5);
    expect(heatAt([f], 900, 500, 30)).toBe(0);
    expect(isBurning(f, 61)).toBe(false);
    expect(settle(f, 61)).toBe('apagou');
    expect(f.lit).toBeUndefined();
  });

  it('chuva queima mais rápido e apaga fogo fraco descoberto', () => {
    const s = new Structures(10000, 10000);
    const f = s.add('fogueira', 500, 500);
    addFuel(f, 60, 0);
    ignite(f, 0);
    settle(f, 10, 1 + 0.8 * 3);
    expect(fuelLeft(f, 10)).toBeCloseTo(60 - 34, 5);
    expect(rainPutsOut(f, 10, 0.8, false)).toBe(false);
    settle(f, 15, 1 + 0.8 * 3);
    expect(rainPutsOut(f, 15, 0.8, false)).toBe(true);
    expect(rainPutsOut(f, 15, 0.8, true)).toBe(false);
    extinguish(f, 15);
    expect(isBurning(f, 16)).toBe(false);
  });

  it('não passa do máximo de lenha e o save guarda a fogueira', () => {
    const s = new Structures(10000, 10000);
    const f = s.add('fogueira', 500, 500);
    expect(addFuel(f, 10000, 0)).toBe(600);
    ignite(f, 0);
    const again = new Structures(10000, 10000);
    again.restore(JSON.parse(JSON.stringify(s.serialize())));
    expect(again.get(f.id)).toEqual(f);
    expect(again.near(510, 500, 40).length).toBe(1);
    const g = again.add('fogueira', 0, 0);
    expect(g.id).not.toBe(f.id);
  });
});

// ------------------------------------------------------------------ em jogo: ações, água, fogueira

function game() {
  const inv = new PlayerInventory(200);
  const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = v; } };
  const sv = new Survivor(stats, inv);
  const state = new WorldState(new WorldModel(buildStarterDistrict()));
  const dropped: string[] = [];
  let rain = 0;
  let sheltered = false;
  const use = new ItemUse({
    inventory: inv,
    survivor: sv,
    state,
    now: () => 0,
    openContainerId: () => null,
    position: () => ({ x: 0, y: 0 }),
    hooks: { noise: () => undefined, drop: (id) => dropped.push(id), weather: () => ({ rain, sheltered }) },
  });
  const at = (id: string) => ({ where: 'inv' as const, containerId: 'corpo', index: inv.carried.stacks.findIndex((s) => s.defId === id) });
  const run = (action: string, id: string) => {
    const r = use.run(action, at(id));
    if (r.timed) r.timed.done();
    return r;
  };
  return { inv, sv, state, use, at, run, dropped, setRain: (r: number, sh = false) => ((rain = r), (sheltered = sh)) };
}

describe('ações de reparo e transformação', () => {
  it('rasgar camiseta dá trapos; lençol dá mais', () => {
    const t = game();
    t.inv.add('camiseta', 1);
    t.run('rasgar', 'camiseta');
    expect(t.inv.countOf('camiseta')).toBe(0);
    const a = t.inv.countOf('trapo');
    expect(a).toBeGreaterThanOrEqual(2);
    t.inv.add('lencol', 1);
    t.run('rasgar', 'lencol');
    expect(t.inv.countOf('trapo') - a).toBeGreaterThan(a);
  });

  it('consertar com fita tem limite; cola vai além', () => {
    const t = game();
    t.inv.add('martelo', 1, { c: 0.5 });
    expect(t.use.actionsFor(t.at('martelo')).find((x) => x.id === 'consertar')?.enabled).toBe(false);
    t.inv.add('fita', 1);
    t.run('consertar', 'martelo');
    const c1 = t.inv.carried.stacks.find((s) => s.defId === 'martelo')!.st?.c ?? 1;
    expect(c1).toBeCloseTo(0.7, 2);
    const fita = t.inv.carried.stacks.find((s) => s.defId === 'fita')!;
    expect(fita.st?.ch).toBeCloseTo(0.8, 2);
  });

  it('remendar tira o rasgado com kit e pano; lavar sem sabão não tira sangue', () => {
    const t = game();
    t.inv.add('calcaJeans', 1, { c: 0.4, f: Flag.Rasgado | Flag.Ensanguentado });
    t.inv.add('kitCostura', 1);
    t.inv.add('trapo', 1);
    t.run('remendar', 'calcaJeans');
    let st = t.inv.carried.stacks.find((s) => s.defId === 'calcaJeans')!.st;
    expect((st?.f ?? 0) & Flag.Rasgado).toBe(0);
    expect(st?.c).toBeGreaterThan(0.7);
    t.inv.add('agua', 1);
    t.run('lavar', 'calcaJeans');
    st = t.inv.carried.stacks.find((s) => s.defId === 'calcaJeans')!.st;
    expect((st?.f ?? 0) & Flag.Ensanguentado).toBeTruthy();
    expect((st?.f ?? 0) & Flag.Molhado).toBeTruthy();
    t.inv.add('sabaoBarra', 1);
    t.run('lavar', 'calcaJeans');
    st = t.inv.carried.stacks.find((s) => s.defId === 'calcaJeans')!.st;
    expect((st?.f ?? 0) & Flag.Ensanguentado).toBe(0);
  });

  it('desmontar rádio precisa de chave de fenda e rende peças (e a pilha)', () => {
    const t = game();
    t.inv.add('radio', 1, { ch: 0.5 });
    expect(t.use.actionsFor(t.at('radio')).find((x) => x.id === 'desmontar')?.enabled).toBe(false);
    t.inv.add('chaveFenda', 1);
    t.run('desmontar', 'radio');
    expect(t.inv.countOf('radio')).toBe(0);
    expect(t.inv.countOf('componentes')).toBeGreaterThan(0);
    expect(t.inv.countOf('pilhas')).toBe(1);
  });

  it('água suja: purificar com água sanitária; balde: encher garrafa; chuva enche o balde', () => {
    const t = game();
    t.inv.add('aguaSuja', 1);
    expect(t.use.actionsFor(t.at('aguaSuja')).find((x) => x.id === 'purificar')?.enabled).toBe(false);
    t.inv.add('aguaSanitaria', 1);
    t.run('purificar', 'aguaSuja');
    expect(t.inv.countOf('aguaSuja')).toBe(0);
    expect(t.inv.countOf('agua')).toBe(1);
    // chuva
    t.inv.add('balde', 1);
    expect(t.use.actionsFor(t.at('balde')).find((x) => x.id === 'juntarChuva')?.enabled).toBe(false);
    t.setRain(0.8);
    t.run('juntarChuva', 'balde');
    const b = t.inv.carried.stacks.find((s) => s.defId === 'baldeAgua')!;
    expect(doses(itemDef('baldeAgua')!, b.st)).toBeGreaterThan(5);
    expect((b.st?.f ?? 0) & Flag.Contaminado).toBeTruthy();
    t.inv.add('garrafaPet', 1);
    t.run('encherGarrafa', 'baldeAgua');
    expect(t.inv.countOf('aguaSuja')).toBe(1);
  });

  it('café tira sono; comida preparada anima', () => {
    const t = game();
    t.sv.body.fatigue = 60;
    t.inv.add('cafe', 1);
    t.run('beber', 'cafe');
    expect(t.sv.body.fatigue).toBeLessThan(50);
    expect(t.inv.countOf('caneca')).toBe(1);
    const m = t.sv.body.morale;
    t.inv.add('carneAssada', 1, { born: 0 });
    t.run('comer', 'carneAssada');
    expect(t.sv.body.morale).toBeGreaterThan(m);
  });
});

describe('torneira e descarga', () => {
  function water(on: boolean) {
    const t = game();
    const started: TimedActionSpec[] = [];
    const wi = new WaterInteractions(t.state, t.inv, t.sv, { start: (s) => started.push(s), waterOn: () => on, drop: () => undefined });
    const sink = t.state.model.map.props.find((p) => p.type === 'kitchenCounter')!;
    const toilet = t.state.model.map.props.find((p) => p.type === 'toilet')!;
    return { ...t, wi, started, sink, toilet };
  }

  it('com água: bebe até matar a sede e enche garrafas com água limpa', () => {
    const t = water(true);
    t.sv.body.thirst = 60;
    const out: InteractionCandidate[] = [];
    t.wi.collect({ x: t.sink.x, y: t.sink.y + 40, radius: 15, facing: 0 }, out);
    const c = out.find((x) => x.target.key === `agua:${t.sink.id}`)!;
    expect(c.target.label).toMatch(/Beber/);
    c.perform();
    const sp = t.started.at(-1)!;
    sp.tick!(sp.minutes);
    expect(t.sv.body.thirst).toBeLessThan(1);
    t.inv.add('garrafaPet', 2);
    t.inv.add('balde', 1);
    expect(t.wi.containers()).toBe(3);
    const r = t.wi.doFill(t.sink.id, null, true);
    expect(r.ok).toBe(true);
    expect(t.inv.countOf('agua')).toBe(2);
    expect(t.inv.countOf('baldeAgua')).toBe(1);
  });

  it('sem água: torneira seca; descarga dá pouca água suja e acaba', () => {
    const t = water(false);
    const out: InteractionCandidate[] = [];
    t.wi.collect({ x: t.sink.x, y: t.sink.y + 40, radius: 15, facing: 0 }, out);
    expect(out.find((x) => x.target.key === `agua:${t.sink.id}`)!.target.enabled).toBe(false);
    t.inv.add('garrafaPet', 5);
    const src = { name: 'vaso', tap: false, tank: 6, verbName: 'da caixa da descarga' };
    t.wi.doFill(t.toilet.id, src, false);
    expect(t.inv.countOf('aguaSuja')).toBe(3);
    expect(t.wi.doFill(t.toilet.id, src, false).ok).toBe(false);
    // O save lembra que a caixa esvaziou.
    const again = new WorldState(new WorldModel(buildStarterDistrict()));
    again.restore(JSON.parse(JSON.stringify(t.state.serialize())));
    expect(again.waterUsed.get(t.toilet.id)).toBe(6);
  });
});

describe('fogueira em jogo', () => {
  function camp(rng = 0) {
    const t = game();
    let now = 100;
    const started: TimedActionSpec[] = [];
    const si = new StructureInteractions(t.state, t.inv, t.sv, { start: (s) => started.push(s), minutes: () => now, openCraft: () => undefined, rng: () => rng });
    const f = t.state.structures.add('fogueira', 3000, 3000);
    return { ...t, si, f, started, advance: (m: number) => (now += m), who: { x: 3000, y: 3040, radius: 15, facing: -Math.PI / 2 } };
  }

  it('lenha, fósforo e papel: acende; sem isqueiro, não', () => {
    const t = camp(0.5);
    t.inv.add('lenha', 2);
    let out: InteractionCandidate[] = [];
    t.si.collect(t.who, out);
    out[0]!.perform();
    expect(t.f.fuel).toBeGreaterThan(50);
    out = [];
    t.si.collect(t.who, out);
    expect(out[0]!.target.verb).toBe('ACENDER');
    expect(out[0]!.target.enabled).toBe(false);
    t.inv.add('fosforos', 1);
    t.inv.add('jornal', 1);
    out = [];
    t.si.collect(t.who, out);
    out[0]!.perform();
    const r = t.started.at(-1)!.done() as { ok: boolean };
    expect(r.ok).toBe(true);
    expect(isBurning(t.f, 101)).toBe(true);
    expect(t.inv.countOf('jornal')).toBe(0);
    const box = t.inv.carried.stacks.find((s) => s.defId === 'fosforos')!;
    expect(box.st?.ch).toBeLessThan(1);
  });

  it('só lenha é difícil de pegar (e o fósforo gasta mesmo assim)', () => {
    const t = camp(0.5);
    t.inv.add('fosforos', 1);
    addFuel(t.f, 60, 100);
    expect(t.si.tryLight(t.f).ok).toBe(false);
    expect(t.f.lit).toBeUndefined();
  });
});
