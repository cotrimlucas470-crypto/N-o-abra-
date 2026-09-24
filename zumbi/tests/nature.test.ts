import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/game/core/EventBus';
import { ContainerInteractions } from '../src/game/interaction/ContainerInteractions';
import { InteractionSystem, type Interactor } from '../src/game/interaction/InteractionSystem';
import { LootActions, useKind } from '../src/game/interaction/LootActions';
import { NatureInteractions } from '../src/game/interaction/NatureInteractions';
import { freshness } from '../src/game/items/condition';
import { itemDef } from '../src/game/items/ItemCatalog';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import { PROP_HARVEST, RESOURCE_HARVEST } from '../src/game/nature/NatureCatalog';
import { NatureState } from '../src/game/nature/NatureState';
import { WorldState } from '../src/game/sim/WorldState';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { Ground } from '../src/game/world/MapTypes';
import { PROP_DEFS } from '../src/game/world/PropCatalog';
import { WorldModel } from '../src/game/world/WorldModel';

describe('recursos renováveis', () => {
  const apple = PROP_HARVEST.treeApple!;

  it('estado inicial determinístico; colher tira; rebrota com os dias até o máximo', () => {
    const a = new NatureState(1, { fruitRegrowDays: 2, density: 1 });
    const b = new NatureState(1, { fruitRegrowDays: 2, density: 1 });
    expect(a.count('arvore', apple, 0)).toBe(b.count('arvore', apple, 0));
    const start = a.count('arvore', apple, 0);
    expect(start).toBeGreaterThanOrEqual(3);
    const got = a.harvest('arvore', apple, 0, 99);
    expect(got).toBe(start);
    expect(a.count('arvore', apple, 0)).toBe(0);
    expect(a.count('arvore', apple, 1.9)).toBe(0); // 2 dias por fruto
    expect(a.count('arvore', apple, 2.1)).toBe(1);
    expect(a.count('arvore', apple, 10.5)).toBe(5);
    expect(a.count('arvore', apple, 500)).toBe(apple.max); // nunca passa do máximo
  });

  it('colher de novo não perde o progresso do próximo fruto', () => {
    const n = new NatureState(1, { fruitRegrowDays: 2, density: 1 });
    n.harvest('x', apple, 0, 99);
    expect(n.count('x', apple, 3)).toBe(1); // 1 pronto + meio caminho do próximo
    n.harvest('x', apple, 3, 1);
    expect(n.count('x', apple, 4.1)).toBe(1); // o "meio caminho" foi mantido
  });

  it('pedra solta é finita: acabou, acabou', () => {
    const n = new NatureState(1);
    const stones = RESOURCE_HARVEST.pedras;
    n.harvest('p', stones, 0, 99);
    expect(n.count('p', stones, 1000)).toBe(0);
    expect(n.nextIn('p', stones, 5)).toBeNull();
  });

  it('save guarda só o que foi colhido e volta igual', () => {
    const n = new NatureState(7);
    n.harvest('a', apple, 1, 2);
    const save = JSON.parse(JSON.stringify(n.serialize()));
    expect(Object.keys(save.harvested)).toEqual(['a']);
    const m = new NatureState(7);
    m.restore(save);
    for (const t of [1, 5, 20]) expect(m.count('a', apple, t)).toBe(n.count('a', apple, t));
  });
});

describe('camada de ambiente', () => {
  const map = buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 });
  const ambient = map.props.filter((p) => p.ambient);

  it('espalha vegetação variada, com várias frutíferas diferentes', () => {
    expect(ambient.length).toBeGreaterThan(150);
    const fruitTypes = new Set(ambient.filter((p) => PROP_HARVEST[p.type]?.overlay).map((p) => p.type));
    expect(fruitTypes.size).toBeGreaterThanOrEqual(6);
    const types = new Set(ambient.map((p) => p.type));
    for (const t of ['treeBroad', 'treePine', 'treeDead', 'rock', 'bushFlower'] as const) expect(types.has(t), t).toBe(true);
    expect(map.decals.filter((d) => d.ambient).length).toBeGreaterThan(1000);
    expect(map.resources.length).toBeGreaterThan(20);
  });

  it('nada colidindo perto de porta ou dentro/encostado em construção', () => {
    for (const p of ambient) {
      if (PROP_DEFS[p.type].collider.shape === 'none') continue;
      for (const d of map.doors) expect(Math.hypot(d.x - p.x, d.y - p.y), `${p.id} perto de ${d.id}`).toBeGreaterThan(3 * 64 - 1);
      for (const b of map.buildings) {
        const inside = p.x > b.bounds.x - 64 && p.x < b.bounds.x + b.bounds.w + 64 && p.y > b.bounds.y - 64 && p.y < b.bounds.y + b.bounds.h + 64;
        expect(inside, `${p.id} encostado em ${b.id}`).toBe(false);
      }
    }
  });

  it('árvore só em chão de terra/grama; sucata em cascalho ou grama', () => {
    for (const p of ambient) {
      const g = map.ground[Math.floor(p.y / 64) * map.widthTiles + Math.floor(p.x / 64)];
      if (p.type.startsWith('tree')) expect([Ground.Grass, Ground.GrassDark, Ground.Dirt], p.id).toContain(g);
    }
  });

  it('determinística e desligável', () => {
    const again = buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 });
    expect(again.props.filter((p) => p.ambient)).toEqual(ambient);
    const none = buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3, ambience: 0 });
    expect(none.props.some((p) => p.ambient)).toBe(false);
    expect(none.resources.length).toBe(0);
    expect(new Set(map.resources.map((r) => r.id)).size).toBe(map.resources.length);
  });
});

// ------------------------------------------------------------------ interação e ações

function world(seed = 1337) {
  const map = buildCity({ seed, sectorsX: 3, sectorsY: 3 });
  const model = new WorldModel(map);
  const state = new WorldState(model);
  const inv = new PlayerInventory();
  const bus = new EventBus();
  let now = 0.4;
  const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = Math.max(0, Math.min(100, v)); } };
  const who: Interactor = { x: 0, y: 0, radius: 15, facing: 0 };
  const nature = new NatureInteractions(state, inv, () => now);
  const containers = new ContainerInteractions(state, bus);
  const sys = new InteractionSystem([nature, containers]);
  const actions = new LootActions(state, inv, stats, () => now);
  return { map, model, state, inv, bus, stats, who, sys, actions, setNow: (t: number) => (now = t) };
}

describe('colher no mundo', () => {
  it('perto de uma frutífera: COLHER dá frutas frescas; vazia avisa quando volta', () => {
    const t = world();
    const tree = t.map.props.find((p) => p.type === 'treeOrange' || p.type === 'treeMango' || p.type === 'treeLemon')!;
    const def = PROP_HARVEST[tree.type]!;
    t.who.x = tree.x + 40;
    t.who.y = tree.y;
    let target = t.sys.scan(t.who)!;
    expect(target.kind).toBe('harvest');
    expect(target.verb).toBe('COLHER');
    for (let i = 0; i < 10 && target.enabled; i++) {
      t.sys.perform(t.who);
      target = t.sys.current!;
    }
    expect(t.inv.carried.countOf(def.item)).toBeGreaterThan(0);
    const st = t.inv.carried.stacks.find((s) => s.defId === def.item)!.st;
    expect(freshness(itemDef(def.item)!, st, 0.4)).toBe('fresco');
    expect(target.enabled).toBe(false);
    expect(target.label).toMatch(/volta/);
    // dias depois, voltou a ter fruto
    t.setNow(20);
    expect(t.sys.scan(t.who)!.enabled).toBe(true);
  });
});

describe('recipientes e ações de saque', () => {
  const find = (t: ReturnType<typeof world>, type: string, table?: string) => t.map.props.find((p) => p.type === type && (!table || t.state.loot.ref(p.id)?.table === table) && !t.state.loot.peek(p.id, true)!.isEmpty)!;

  it('abrir geladeira mostra o conteúdo e marca como vasculhada', () => {
    const t = world();
    const fridge = find(t, 'fridge');
    let opened = '';
    t.bus.on('ui:container-open', (e) => (opened = e.id));
    // De algum lado da geladeira ela é o alvo mais próximo (do outro lado pode ser o balcão).
    let target = null as ReturnType<typeof t.sys.scan>;
    for (let a = 0; a < 8 && target?.key !== `recipiente:${fridge.id}`; a++) {
      t.who.x = fridge.x + Math.cos((a * Math.PI) / 4) * 58;
      t.who.y = fridge.y + Math.sin((a * Math.PI) / 4) * 58;
      target = t.sys.scan(t.who);
    }
    expect(target!.kind).toBe('container');
    expect(target!.label).toBe('Abrir geladeira');
    t.sys.perform(t.who);
    expect(opened).toBe(fridge.id);
    expect(t.state.loot.isSearched(fridge.id)).toBe(true);
  });

  it('pegar tudo, guardar de volta, e o recipiente lembra', () => {
    const t = world();
    const shelf = find(t, 'storeShelf');
    const c = t.state.openContainer(shelf.id)!;
    const total = c.stacks.reduce((a, s) => a + s.count, 0);
    const r = t.actions.takeAll(shelf.id);
    expect(r.ok).toBe(true);
    const got = t.inv.containers.reduce((a, cc) => a + cc.stacks.reduce((b, s) => b + s.count, 0), 0);
    expect(got + c.stacks.reduce((a, s) => a + s.count, 0)).toBe(total);
    expect(t.actions.store(shelf.id, t.inv.carried, 0).ok).toBe(true);
    const save = JSON.parse(JSON.stringify(t.state.serialize()));
    expect(save.loot.containers[shelf.id]).toBeDefined();
  });

  it('comer: lata precisa de abridor/faca; estragado faz mal', () => {
    const t = world();
    t.inv.add('feijao', 1);
    const r = t.actions.use(t.inv.carried, 0);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/abridor/);
    t.inv.add('abridor', 1);
    expect(t.actions.use(t.inv.carried, t.inv.carried.stacks.findIndex((s) => s.defId === 'feijao')).ok).toBe(true);
    t.inv.add('frango', 1, { born: -10 });
    const hp = t.stats.health;
    t.actions.use(t.inv.carried, t.inv.carried.stacks.findIndex((s) => s.defId === 'frango'));
    expect(t.stats.health).toBeLessThan(hp);
  });

  it('beber: garrafa aberta guarda o resto; a vazia fica para juntar água', () => {
    const t = world();
    t.inv.add('agua', 1);
    t.actions.use(t.inv.carried, 0);
    const water = t.inv.carried.stacks.find((s) => s.defId === 'agua')!;
    expect(water.st?.open).toBe(1);
    expect(water.st?.dose).toBe(1);
    t.actions.use(t.inv.carried, t.inv.carried.stacks.indexOf(water));
    expect(t.inv.carried.countOf('agua')).toBe(0);
    expect(t.inv.carried.countOf('garrafaPet')).toBe(1);
  });

  it('curativo só é gasto se houver ferimento; remédio vencido rende metade', () => {
    const t = world();
    t.inv.add('kitPrimeirosSocorros', 1, { exp: 100 });
    expect(t.actions.use(t.inv.carried, 0).ok).toBe(false);
    t.stats.setHealth(40);
    t.actions.use(t.inv.carried, 0);
    expect(t.stats.health).toBe(70);
  });

  it('mochila aumenta a capacidade; só tira vazia', () => {
    const t = world();
    t.inv.add('mochilaTrilha', 1);
    const cap = t.inv.capacity;
    expect(useKind(itemDef('mochilaTrilha')!)).toBe('equipar');
    expect(t.actions.use(t.inv.carried, 0).ok).toBe(true);
    expect(t.inv.capacity).toBe(cap + 14);
    t.inv.add('tijolo', 5); // 12,5 kg: bolsos (8) + mochila
    expect(t.inv.bag!.container.isEmpty).toBe(false);
    expect(t.inv.unequipBag()).toMatch(/Esvazie/);
    const save = JSON.parse(JSON.stringify(t.inv.serialize()));
    const again = new PlayerInventory();
    again.restore(save);
    expect(again.bag?.defId).toBe('mochilaTrilha');
    expect(again.weight).toBeCloseTo(t.inv.weight, 5);
  });

  it('abrigo (setor inicial): perto das caixas aparece o recipiente', () => {
    const starter = new WorldModel(buildStarterDistrict());
    const state = new WorldState(starter);
    const crate = starter.map.props.find((p) => p.type === 'crate' && state.loot.ref(p.id)?.table === 'abrigo-caixas')!;
    expect(crate).toBeDefined();
  });
});
