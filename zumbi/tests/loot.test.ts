import { describe, expect, it } from 'vitest';
import { Random } from '../src/game/core/Random';
import { Flag, freshness } from '../src/game/items/condition';
import { itemDef, itemsWithTag } from '../src/game/items/ItemCatalog';
import { RARITY_INFO } from '../src/game/items/ItemTypes';
import { CONTAINER_DEFS, PROP_CONTAINERS } from '../src/game/loot/containers';
import { DEFAULT_LOOT, generateLoot } from '../src/game/loot/generate';
import { LootSystem } from '../src/game/loot/LootSystem';
import type { ContainerKind } from '../src/game/loot/LootTypes';
import { tableFor } from '../src/game/loot/rules';
import { LOOT_TABLES, lootTable } from '../src/game/loot/tables';
import { WorldState } from '../src/game/sim/WorldState';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';

const TABLES = LOOT_TABLES as Record<string, (typeof LOOT_TABLES)[keyof typeof LOOT_TABLES]>;

function sample(tableId: string, n: number, settings = DEFAULT_LOOT) {
  const t = lootTable(tableId)!;
  const out: { defId: string; count: number; st?: import('../src/game/items/condition').ItemState }[][] = [];
  for (let k = 0; k < n; k++) out.push(generateLoot(t, new Random(1000 + k), { capacity: 200, settings }));
  return out;
}

describe('tabelas de loot', () => {
  it('só citam itens e etiquetas que existem (e nada só-de-fabricação)', () => {
    for (const [id, t] of Object.entries(TABLES)) {
      expect(t.rolls[0], id).toBeLessThanOrEqual(t.rolls[1]);
      expect(t.empty >= 0 && t.empty < 1, id).toBe(true);
      for (const e of t.entries) {
        expect(e.w, `${id}`).toBeGreaterThan(0);
        if (e.n) expect(e.n[0] >= 1 && e.n[0] <= e.n[1], `${id} ${e.item}`).toBe(true);
        if (e.item) {
          const d = itemDef(e.item);
          expect(d, `${id}: ${e.item}`).not.toBeNull();
          expect(d!.craftOnly, `${id}: ${e.item} é só de fabricação`).toBeFalsy();
        } else expect(itemsWithTag(e.tag!).length, `${id}: #${e.tag}`).toBeGreaterThan(0);
      }
    }
  });

  it('todo recipiente tem tabela em todo contexto onde aparece', () => {
    const kinds = new Set<ContainerKind>(Object.values(PROP_CONTAINERS).flatMap((l) => l!.map((s) => s.kind)));
    const buildings = ['house', 'store', 'garage', 'shelter', 'pharmacy', 'restaurant', 'clothing', 'warehouse', null] as const;
    for (const kind of kinds) {
      expect(CONTAINER_DEFS[kind], kind).toBeDefined();
      for (const b of buildings) {
        const t = tableFor(kind, { building: b, room: null, zone: 'residencial' });
        expect(t && lootTable(t), `${kind} em ${b}`).toBeTruthy();
      }
    }
  });

  it('nada fora de lugar: arma não sai de geladeira, despensa, banheiro, farmácia, loja de roupas ou lixo', () => {
    const noGuns = ['geladeira-casa', 'geladeira-restaurante', 'despensa', 'despensa-restaurante', 'banheiro', 'farmacia-prateleira', 'farmacia-balcao', 'loja-roupas', 'lixo-casa', 'lixo-comercial', 'lixo-rua', 'mercado-geladeira', 'fogao'];
    for (const id of noGuns) {
      for (const e of TABLES[id]!.entries) {
        const d = e.item ? itemDef(e.item) : null;
        expect(d?.gun || d?.category === 'municao', `${id}: ${e.item}`).toBeFalsy();
      }
    }
  });

  it('geladeira só tem comida e bebida', () => {
    for (const stacks of sample('geladeira-casa', 300)) {
      for (const s of stacks) expect(['comida', 'bebida'], s.defId).toContain(itemDef(s.defId)!.category);
    }
  });

  it('farmácia é principalmente remédio e curativo; oficina, ferramenta e material', () => {
    const share = (id: string, cats: string[]) => {
      let yes = 0;
      let all = 0;
      for (const stacks of sample(id, 300)) {
        for (const s of stacks) {
          all++;
          if (cats.includes(itemDef(s.defId)!.category)) yes++;
        }
      }
      return yes / all;
    };
    expect(share('farmacia-prateleira', ['medicina'])).toBeGreaterThan(0.6);
    expect(share('oficina-prateleira', ['ferramenta', 'material', 'roupa', 'eletronico'])).toBeGreaterThan(0.85);
    expect(share('loja-roupas', ['roupa', 'mochila'])).toBe(1);
  });

  it('raro é raro (mas possível); comum é comum', () => {
    const count: Record<string, number> = {};
    let total = 0;
    for (const stacks of sample('guarda-roupa', 4000)) {
      for (const s of stacks) {
        const r = itemDef(s.defId)!.rarity;
        count[r] = (count[r] ?? 0) + 1;
        total++;
      }
    }
    expect((count.comum ?? 0) / total).toBeGreaterThan(0.75);
    expect(count.raro ?? 0).toBeGreaterThan(0);
    expect((count.raro ?? 0) / total).toBeLessThan(0.06);
    expect((count['muito-raro'] ?? 0) / total).toBeLessThan(0.01);
  });

  it('quantidade varia entre recipientes; parte já está vazia', () => {
    const sizes = sample('despensa', 500).map((st) => st.reduce((a, s) => a + s.count, 0));
    const empty = sizes.filter((n) => n === 0).length / sizes.length;
    expect(empty).toBeGreaterThan(0.05);
    expect(empty).toBeLessThan(0.25);
    expect(new Set(sizes).size).toBeGreaterThan(5);
  });

  it('abundância e raros ajustáveis pela partida', () => {
    const items = (settings: typeof DEFAULT_LOOT) => sample('mercado-prateleira', 300, settings).reduce((a, st) => a + st.length, 0);
    expect(items({ ...DEFAULT_LOOT, abundance: 0.2 })).toBeLessThan(items(DEFAULT_LOOT) * 0.4);
    const noRare = sample('guarda-roupa', 1500, { ...DEFAULT_LOOT, rareMultiplier: 0 }).flat();
    expect(noRare.some((s) => RARITY_INFO[itemDef(s.defId)!.rarity].weight < 0.3)).toBe(false);
  });
});

describe('estado dos itens encontrados', () => {
  it('loja tem coisa nova; lixo tem coisa gasta e suja', () => {
    const shop = sample('loja-roupas', 200).flat();
    const newShare = shop.filter((s) => !s.st?.c).length / shop.length;
    expect(newShare).toBeGreaterThan(0.8);
    const trash = sample('lixo-comercial', 400).flat().filter((s) => itemDef(s.defId)!.condition === 'durable' || itemDef(s.defId)!.condition === 'clothing');
    expect(trash.length).toBeGreaterThan(10);
    expect(trash.every((s) => (s.st?.c ?? 1) <= 0.5)).toBe(true);
    expect(trash.filter((s) => (s.st?.f ?? 0) & Flag.Sujo).length / trash.length).toBeGreaterThan(0.4);
  });

  it('comida da geladeira estraga conforme o tempo desde o colapso', () => {
    const fresh = sample('geladeira-casa', 200).flat().filter((s) => itemDef(s.defId)!.condition === 'perishable');
    const old = sample('geladeira-casa', 200, { ...DEFAULT_LOOT, collapseAgeDays: 30 }).flat().filter((s) => itemDef(s.defId)!.condition === 'perishable');
    const spoiled = (list: typeof fresh) => list.filter((s) => ['estragado', 'podre'].includes(freshness(itemDef(s.defId)!, s.st, 0.4) ?? '')).length / list.length;
    expect(spoiled(fresh)).toBeLessThan(0.35);
    expect(spoiled(old)).toBeGreaterThan(0.9);
  });

  it('remédio pode vir vencido, mas a maioria está na validade no início', () => {
    const meds = sample('farmacia-prateleira', 300).flat().filter((s) => s.st?.exp !== undefined);
    const expired = meds.filter((s) => s.st!.exp! < 0.4).length / meds.length;
    expect(expired).toBeGreaterThan(0.02);
    expect(expired).toBeLessThan(0.35);
  });
});

describe('loot no mundo', () => {
  const map = buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 });
  const model = new WorldModel(map);

  it('acha recipientes nos objetos do mapa, com tabela coerente com o cômodo', () => {
    const loot = new LootSystem(model, 1337);
    expect(loot.containerCount).toBeGreaterThan(400);
    const fridges = map.props.filter((p) => p.type === 'fridge').map((p) => loot.ref(p.id)!);
    expect(fridges.every((r) => r.table?.startsWith('geladeira'))).toBe(true);
    const cars = map.props.filter((p) => p.type === 'car');
    expect(loot.ref(`${cars[0]!.id}:malas`)?.table).toBe('porta-malas');
    expect(loot.ref(`${cars[0]!.id}:luvas`)?.table).toBe('porta-luvas');
  });

  it('mesmo recipiente, mesmo conteúdo (sem sortear de novo ao voltar ou recarregar)', () => {
    const a = new LootSystem(model, 1337);
    const b = new LootSystem(model, 1337);
    const ids = map.props.filter((p) => p.type === 'wardrobe' || p.type === 'storeShelf').map((p) => p.id);
    for (const id of ids) expect(a.open(id)!.stacks).toEqual(b.open(id)!.stacks);
    // cidades diferentes, conteúdos diferentes
    const other = new LootSystem(model, 999);
    const diff = ids.filter((id) => JSON.stringify(other.open(id)!.stacks) !== JSON.stringify(a.open(id)!.stacks)).length;
    expect(diff).toBeGreaterThan(ids.length / 2);
  });

  it('saquear persiste: o que foi pego não volta ao salvar e carregar', () => {
    const w1 = new WorldState(model);
    const id = map.props.find((p) => p.type === 'storeShelf' && !w1.loot.open(p.id)!.isEmpty)!.id;
    const c = w1.openContainer(id)!;
    const before = c.stacks.length;
    expect(before).toBeGreaterThan(0);
    c.take(0, c.stacks[0]!.count);
    w1.containerChanged(id);
    const save = JSON.parse(JSON.stringify(w1.serialize()));
    expect(save.version).toBe(2);
    expect(Object.keys(save.loot.containers)).toEqual([id]);
    const w2 = new WorldState(model);
    w2.restore(save);
    expect(w2.loot.peek(id)!.stacks.length).toBe(before - 1);
    expect(w2.loot.isSearched(id)).toBe(true);
    // recipiente não mexido não vai para o save e continua igual
    const untouched = map.props.find((p) => p.type === 'fridge')!.id;
    expect(save.loot.containers[untouched]).toBeUndefined();
    expect(w2.loot.open(untouched)!.stacks).toEqual(new WorldState(model).loot.open(untouched)!.stacks);
  });

  it('save antigo (versão 1, sem loot) continua carregando', () => {
    const w = new WorldState(model);
    w.restore({ version: 1, doors: {}, mapItems: {}, items: [], nextItem: 1 });
    expect(w.loot.containerCount).toBeGreaterThan(0);
  });

  it('itens soltos no chão: dentro de cômodos, em lugar livre, longe das portas, e somem ao pegar', () => {
    const w = new WorldState(model);
    const floor = w.loot.floorItems;
    expect(floor.length).toBeGreaterThan(30);
    for (const f of floor) {
      const cell = model.nav.cellOf(f.x, f.y);
      expect(model.nav.isBlocked(cell.cx, cell.cy), f.id).toBe(false);
      expect(map.doors.some((d) => Math.hypot(d.x - f.x, d.y - f.y) < 56), f.id).toBe(false);
      expect(map.buildings.some((b) => f.x > b.bounds.x && f.x < b.bounds.x + b.bounds.w && f.y > b.bounds.y && f.y < b.bounds.y + b.bounds.h), f.id).toBe(true);
    }
    const first = floor[0]!;
    w.takeItem(first.id);
    const save = JSON.parse(JSON.stringify(w.serialize()));
    expect(save.mapItems[first.id]).toBe(0);
    const w2 = new WorldState(model);
    w2.restore(save);
    expect(w2.itemById(first.id)).toBeNull();
  });

  it('gerar todos os recipientes da cidade é rápido', () => {
    const t0 = performance.now();
    const loot = new LootSystem(model, 1337);
    for (const p of map.props) loot.open(p.id);
    expect(performance.now() - t0).toBeLessThan(400);
  });

  it('setor inicial: o abrigo tem recipientes e o mapa continua com os itens feitos à mão', () => {
    const starter = new WorldModel(buildStarterDistrict());
    const w = new WorldState(starter);
    const shelter = starter.map.buildings.find((b) => b.id === 'abrigo')!;
    const inShelter = starter.map.props.filter((p) => p.x > shelter.bounds.x && p.x < shelter.bounds.x + shelter.bounds.w && p.y > shelter.bounds.y && p.y < shelter.bounds.y + shelter.bounds.h && w.loot.ref(p.id));
    expect(inShelter.length).toBeGreaterThanOrEqual(3);
    expect(w.itemById(starter.map.items[0]!.id)).not.toBeNull();
  });
});
