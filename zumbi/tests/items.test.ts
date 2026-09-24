import { describe, expect, it } from 'vitest';
import { hasIconFamily } from '../src/game/assets/procedural/itemIcons';
import { ITEM_DRAWERS } from '../src/game/assets/procedural/items';
import {
  Flag,
  conditionTags,
  drinkEffect,
  effectiveness,
  foodEffect,
  freshness,
  jamChance,
  medHeal,
  normalizeState,
  sameState,
  unitWeight,
  wearFactors,
} from '../src/game/items/condition';
import { allItems, itemDef, itemsWithTag } from '../src/game/items/ItemCatalog';
import { ItemContainer } from '../src/game/items/ItemContainer';
import { CATEGORY_INFO, RARITY_INFO, type ItemCategory } from '../src/game/items/ItemTypes';

const def = (id: string) => {
  const d = itemDef(id);
  if (!d) throw new Error(`item ${id} não existe`);
  return d;
};

describe('catálogo de itens', () => {
  const all = allItems();

  it('tem centenas de itens em todas as categorias', () => {
    expect(all.length).toBeGreaterThanOrEqual(300);
    const minPerCat: Partial<Record<ItemCategory, number>> = { comida: 50, roupa: 25, ferramenta: 25, medicina: 20, material: 20 };
    for (const cat of Object.keys(CATEGORY_INFO) as ItemCategory[]) {
      const n = all.filter((d) => d.category === cat).length;
      expect(n, cat).toBeGreaterThanOrEqual(minPerCat[cat] ?? 5);
    }
  });

  it('todo item tem dados válidos e ícone', () => {
    for (const d of all) {
      expect(d.name.length, d.id).toBeGreaterThan(1);
      expect(d.description.length, d.id).toBeGreaterThan(3);
      expect(d.weight, d.id).toBeGreaterThan(0);
      expect(d.volume, d.id).toBeGreaterThan(0);
      expect(d.stack, d.id).toBeGreaterThanOrEqual(1);
      expect(RARITY_INFO[d.rarity], d.id).toBeDefined();
      expect(ITEM_DRAWERS[d.icon] || hasIconFamily(d.iconSpec), `${d.id} sem ícone (${d.iconSpec.f})`).toBeTruthy();
      expect(/^[a-zA-Z0-9]+$/.test(d.id), d.id).toBe(true);
    }
  });

  it('propriedades batem com o perfil de condição', () => {
    for (const d of all) {
      if (d.condition === 'perishable') expect(d.food?.spoil, d.id).toBeDefined();
      if (d.condition === 'drink') expect(d.drink?.doses, d.id).toBeGreaterThan(0);
      if (d.category === 'arma-de-fogo') expect(d.gun, d.id).toBeDefined();
      if (d.category === 'mochila') expect(d.bag?.capacity, d.id).toBeGreaterThan(0);
      if (d.category === 'roupa') expect(d.wear, d.id).toBeDefined();
      if (d.tool) expect(d.tool.uses.length, d.id).toBeGreaterThan(0);
    }
  });

  it('toda arma de fogo tem munição do seu calibre no catálogo', () => {
    for (const g of all.filter((d) => d.gun)) {
      const ammo = all.filter((d) => d.ammo?.caliber === g.gun!.caliber && d.ammo.rounds > 0);
      expect(ammo.length, g.id).toBeGreaterThan(0);
    }
  });

  it('etiquetas úteis para receitas existem', () => {
    for (const tag of ['martelar', 'serrar', 'madeira', 'pregos', 'tecido', 'corda', 'abridor', 'curativo', 'desinfetante', 'recipiente-agua', 'semente', 'combustivel']) {
      expect(itemsWithTag(tag).length, tag).toBeGreaterThan(0);
    }
  });
});

describe('condição dos itens', () => {
  it('comida perecível passa, estraga e apodrece com os dias', () => {
    const maca = def('maca'); // [8, 15, 22]
    expect(freshness(maca, { born: 0 }, 1)).toBe('fresco');
    expect(freshness(maca, { born: 0 }, 10)).toBe('passado');
    expect(freshness(maca, { born: 0 }, 16)).toBe('estragado');
    expect(freshness(maca, { born: 0 }, 30)).toBe('podre');
    expect(conditionTags(maca, { born: 0 }, 1).map((t) => t.text)).toContain('Maduro');
    expect(freshness(def('feijao'), undefined, 999)).toBeNull(); // enlatado não estraga
  });

  it('comer estragado ou cru faz mal; fresco alimenta', () => {
    const maca = def('maca');
    expect(foodEffect(maca, { born: 0 }, 1)!.health).toBe(0);
    expect(foodEffect(maca, { born: 0 }, 30)!.health).toBeLessThan(0);
    expect(foodEffect(maca, { born: 0 }, 30)!.kcal).toBe(0);
    expect(foodEffect(def('frango'), { born: 0 }, 0.5)!.health).toBeLessThan(0); // cru
    expect(foodEffect(def('cogumeloVenenoso'), { born: 0 }, 0)!.health).toBeLessThan(-20);
  });

  it('água contaminada faz mal; lacrada não', () => {
    expect(drinkEffect(def('agua'), undefined)!.health).toBe(0);
    expect(drinkEffect(def('agua'), { f: Flag.Contaminado })!.health).toBeLessThan(0);
    expect(drinkEffect(def('aguaSuja'), undefined)!.health).toBeLessThan(0);
  });

  it('ferramenta gasta rende menos; quebrada não serve', () => {
    const m = def('martelo');
    expect(effectiveness(m, undefined)).toBe(1);
    expect(effectiveness(m, { c: 0.3 })).toBeLessThan(0.75);
    expect(effectiveness(m, { c: 0.3, f: Flag.Enferrujado })).toBeLessThan(effectiveness(m, { c: 0.3 }));
    expect(effectiveness(m, { c: 0 })).toBe(0);
    expect(conditionTags(m, { c: 0.3 }, 0)[0]!.text).toBe('Desgastado');
    expect(conditionTags(m, { c: 0 }, 0)[0]!.text).toBe('Quebrado');
  });

  it('arma danificada falha mais', () => {
    const p = def('pistola9');
    expect(jamChance(p, undefined)).toBeLessThan(0.02);
    expect(jamChance(p, { c: 0.2 })).toBeGreaterThan(0.2);
    expect(jamChance(p, { c: 0 })).toBe(1);
  });

  it('roupa molhada não esquenta, rasgada protege menos', () => {
    const c = def('casacoInverno');
    expect(wearFactors(c, { f: Flag.Molhado }).insulation).toBeLessThan(wearFactors(c, undefined).insulation * 0.5);
    const j = def('jaquetaCouro');
    expect(wearFactors(j, { f: Flag.Rasgado }).bite).toBeLessThan(wearFactors(j, undefined).bite);
  });

  it('remédio vencido rende metade', () => {
    const k = def('kitPrimeirosSocorros');
    expect(medHeal(k, { exp: 100 }, 50)).toBe(30);
    expect(medHeal(k, { exp: 100 }, 150)).toBe(15);
    expect(conditionTags(k, { exp: 100 }, 150).some((t) => t.text === 'Vencido')).toBe(true);
  });

  it('só guarda estado que faz sentido para o item', () => {
    expect(normalizeState(def('martelo'), { f: Flag.Contaminado })).toBeUndefined();
    expect(normalizeState(def('maca'), { c: 0.3, f: Flag.Enferrujado })).toBeUndefined();
    expect(normalizeState(def('faca'), { f: Flag.Enferrujado })).toEqual({ f: Flag.Enferrujado }); // metal
    expect(normalizeState(def('camiseta'), { f: Flag.Enferrujado })).toBeUndefined();
    expect(normalizeState(def('martelo'), { c: 1 })).toBeUndefined(); // novo = sem estado
  });

  it('bebida aberta pela metade pesa menos e não empilha com a lacrada', () => {
    const agua = def('agua');
    expect(unitWeight(agua, { dose: 1, open: 1 })).toBeLessThan(agua.weight);
    const c = new ItemContainer('t', 't', 10);
    c.add('agua', 2);
    c.add('agua', 1, { dose: 1, open: 1 });
    expect(c.stacks.length).toBe(2);
    expect(sameState(agua, undefined, { dose: 1, open: 1 })).toBe(false);
    // abrir uma da pilha lacrada separa só uma unidade
    const idx = c.updateOne(0, { open: 1 });
    expect(c.stacks[0]!.count + (c.stacks[idx]?.count ?? 0)).toBeGreaterThanOrEqual(1);
    expect(c.countOf('agua')).toBe(3);
  });

  it('frutas colhidas no mesmo dia empilham; de dias diferentes, não', () => {
    const c = new ItemContainer('t', 't', 10);
    c.add('laranja', 3, { born: 2 });
    c.add('laranja', 2, { born: 2.1 });
    expect(c.stacks.length).toBe(1);
    c.add('laranja', 1, { born: 5 });
    expect(c.stacks.length).toBe(2);
  });

  it('bateria descarregada aparece como tal', () => {
    expect(conditionTags(def('pilhas'), { ch: 0 }, 0)[0]!.text).toBe('Descarregado');
    expect(conditionTags(def('pilhas'), undefined, 0)[0]!.text).toBe('Carregado');
  });
});
