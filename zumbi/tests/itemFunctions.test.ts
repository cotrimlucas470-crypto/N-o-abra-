/**
 * ITENS: todo item tem uma função; proteção que gasta e rasga; a ficha mostra
 * os atributos; funções simples (higiene, prato/talher, lembrança, travesseiro,
 * recarga de munição) fazem o que prometem.
 */
import { describe, expect, it } from 'vitest';
import { fuelMinutes } from '../src/game/build/Fire';
import { CLOTHING_WEAR } from '../src/game/config/PlayerTuning';
import { checkRecipe, craftRecipe } from '../src/game/crafting/Crafting';
import { RECIPE_BY_ID, RECIPES } from '../src/game/crafting/Recipes';
import { PART_INFO } from '../src/game/health/Wounds';
import { ItemUse } from '../src/game/interaction/ItemUse';
import { Flag, condition, wearFactors } from '../src/game/items/condition';
import { itemStats } from '../src/game/items/describe';
import { ITEM_DEFS, itemDef } from '../src/game/items/ItemCatalog';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import { WorldState } from '../src/game/sim/WorldState';
import { sleepAction } from '../src/game/survival/Sleep';
import { Survivor } from '../src/game/survival/Survivor';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';

const STATE = new WorldState(new WorldModel(buildStarterDistrict()));

function game() {
  const inv = new PlayerInventory(200);
  const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = v; } };
  const sv = new Survivor(stats, inv);
  const use = new ItemUse({ inventory: inv, survivor: sv, state: STATE, now: () => 0, openContainerId: () => null, position: () => ({ x: 0, y: 0 }), hooks: { noise: () => undefined, drop: () => undefined, time: () => ({ day: 1, minuteOfDay: 480 }) } as never });
  const at = (id: string) => ({ where: 'inv' as const, containerId: inv.carried.id, index: inv.carried.stacks.findIndex((s) => s.defId === id) });
  const run = (action: string, id: string) => {
    const r = use.run(action, at(id));
    if (r.timed) return r.timed.done();
    return r;
  };
  return { inv, sv, use, at, run };
}

// Usados por outros sistemas (não por ação no item nem por receita): onde.
const USED_ELSEWHERE: Record<string, string> = {
  couro: 'remendar roupa', borracha: 'desmontar/peças', mangueira: 'tirar gasolina do carro', cola: 'consertar', colaMadeira: 'consertar',
  galaoVazio: 'tirar/pôr gasolina', pneu: 'trocar pneu', cadeado: 'trancar porta construída', fioEletrico: 'desmontar/peças',
  componentes: 'desmontar/peças', placaCircuito: 'desmontar/peças', adubo: 'adubar a horta', fertilizante: 'adubar a horta',
  detergente: 'lavar (sabão)', aguaSanitaria: 'purificar água', sabaoBarra: 'lavar (sabão)', cadeiraDobravel: 'móvel (receita)',
  relogioPulso: 'ver as horas', chaveCarro: 'abrir/ligar carro', chaveCasa: 'destrancar porta', pecasMotor: 'conserto do carro',
  velaIgnicao: 'conserto do carro', pastaDentes: 'escovar os dentes (com a escova)',
};
// Materiais de construção sem sistema ainda (sugestões ao usuário) e ouro/anel (sem uso de propósito).
const NO_USE_YET = new Set(['tinta', 'gesso', 'arameFarpado', 'telaArame', 'corrente', 'macaneta', 'sacoVazio', 'lampada', 'carregadorCelular', 'regador', 'anelOuro', 'ouro']);
// Efeito passivo lido por um sistema (prato/talher ao comer, travesseiro ao dormir).
const PASSIVE_TAGS = ['utensilio', 'travesseiro'];
const GENERIC = new Set(['pegar', 'largar', 'paraMochila', 'paraBolsos', 'guardarRecipiente', 'porNoRecipiente', 'guardarMao', 'segurar']);

describe('todo item tem função', () => {
  it('cada item do catálogo faz algo (ou está na lista explícita)', () => {
    const used = new Set<string>();
    const usedTags = new Set<string>();
    for (const r of RECIPES) {
      for (const i of r.inputs) for (const o of i.opts) {
        if (o.id) used.add(o.id);
        if (o.tag) usedTags.add(o.tag);
      }
      for (const t of r.tools ?? []) for (const g of t.tags) usedTags.add(g);
    }
    const missing: string[] = [];
    for (const d of Object.values(ITEM_DEFS)) {
      if (d.food || d.drink || d.med || d.tool || d.melee || d.gun || d.ammo || d.wear || d.bag || d.power || d.seed || d.read) continue;
      if (used.has(d.id) || d.tags.some((t) => usedTags.has(t)) || fuelMinutes(d) > 0) continue;
      if (USED_ELSEWHERE[d.id] || NO_USE_YET.has(d.id) || d.tags.some((t) => PASSIVE_TAGS.includes(t))) continue;
      const t = game();
      t.inv.add(d.id, 1);
      if (t.use.actionsFor(t.at(d.id)).some((a) => !GENERIC.has(a.id))) continue;
      missing.push(d.id);
    }
    expect(missing).toEqual([]);
  });
});

describe('proteção que gasta', () => {
  it('jaqueta segura a unhada e gasta; atravessou, pode rasgar e passa a proteger menos', () => {
    const inv = new PlayerInventory(200);
    inv.putOn('jaquetaCouro');
    const before = inv.protection(['tronco-externo']).scratch;
    expect(inv.wearDown(PART_INFO.bracoE.slots, CLOTHING_WEAR.scratchBlocked, 0, () => 0.99)).toBeNull();
    const e = inv.wornIn('tronco-externo')!;
    expect(condition(e.st)).toBeLessThan(1);
    const torn = inv.wearDown(PART_INFO.bracoE.slots, CLOTHING_WEAR.biteThrough, 1, () => 0);
    expect(torn).toBe(itemDef('jaquetaCouro')!.name);
    expect(inv.wornIn('tronco-externo')!.st!.f! & Flag.Rasgado).toBeTruthy();
    expect(inv.protection(['tronco-externo']).scratch).toBeLessThan(before);
  });

  it('camada de fora gasta mais que a de baixo; peça mais protetora gasta mais devagar', () => {
    const inv = new PlayerInventory(200);
    inv.putOn('camiseta');
    inv.putOn('moletom');
    inv.wearDown(PART_INFO.tronco.slots, 0.1, 0, () => 0.99);
    const outer = 1 - condition(inv.wornIn('tronco-externo')!.st);
    const inner = 1 - condition(inv.wornIn('tronco')!.st);
    expect(outer).toBeGreaterThan(inner);
    const armor = new PlayerInventory(200);
    armor.putOn('coleteBalistico');
    armor.wearDown(PART_INFO.tronco.slots, 0.1, 0, () => 0.99);
    expect(1 - condition(armor.wornIn('tronco-externo')!.st)).toBeLessThan(outer);
  });
});

describe('ficha do item', () => {
  it('mostra proteção da roupa, dano da arma branca e calibre da arma de fogo', () => {
    expect(itemStats(itemDef('coleteBalistico')!, undefined)).toMatch(/mordida 60% · arranhão 70%/);
    expect(itemStats(itemDef('facao')!, undefined)).toMatch(/Dano 16 · alcance médio/);
    expect(itemStats(itemDef('revolver38')!, { am: 4 })).toMatch(/Calibre \.38 · 4\/6 balas/);
    expect(itemStats(itemDef('pistola9')!, undefined)).toMatch(/Calibre 9 mm/);
    // Rasgada protege menos (e a ficha mostra o número de agora).
    const torn = wearFactors(itemDef('jaquetaCouro')!, { f: Flag.Rasgado });
    expect(itemStats(itemDef('jaquetaCouro')!, { f: Flag.Rasgado })).toContain(`arranhão ${Math.round(torn.scratch * 100)}%`);
  });
});

describe('funções simples', () => {
  it('escovar os dentes: precisa de pasta e água, gasta, levanta o ânimo até um teto', () => {
    const t = game();
    t.inv.add('escovaDentes', 1);
    expect(t.use.actionsFor(t.at('escovaDentes')).find((a) => a.id === 'higiene')!.enabled).toBe(false);
    t.inv.add('pastaDentes', 1);
    t.inv.add('agua', 1, { open: 1, dose: 3 });
    t.sv.body.morale = 40;
    t.run('higiene', 'escovaDentes');
    expect(t.sv.body.morale).toBeGreaterThan(40);
    t.sv.body.morale = 80;
    t.run('higiene', 'escovaDentes');
    expect(t.sv.body.morale).toBe(80);
  });

  it('lembrança dá um pouco de ânimo, sem passar do teto', () => {
    const t = game();
    t.inv.add('alianca', 1);
    t.sv.body.morale = 50;
    t.run('olharFoto', 'alianca');
    expect(t.sv.body.morale).toBe(53);
    t.sv.body.morale = 75;
    t.run('olharFoto', 'alianca');
    expect(t.sv.body.morale).toBe(75);
  });

  it('comida feita com prato/talher anima mais', () => {
    const a = game();
    a.inv.add('arrozCozido', 1);
    a.sv.body.morale = 40;
    a.sv.body.hunger = 60;
    a.run('comer', 'arrozCozido');
    const plain = a.sv.body.morale;
    const b = game();
    b.inv.add('arrozCozido', 1);
    b.inv.add('garfo', 1);
    b.sv.body.morale = 40;
    b.sv.body.hunger = 60;
    b.run('comer', 'arrozCozido');
    expect(b.sv.body.morale).toBeGreaterThan(plain);
  });

  it('travesseiro: o sono rende mais e acorda de melhor humor', () => {
    const t = game();
    const clock = {} as never; // sem alarme: o relógio não é usado
    t.sv.body.morale = 40;
    const spec = sleepAction(t.sv, clock, { place: 'cama', blanket: false, pillow: true }, () => undefined);
    spec.done();
    expect(t.sv.body.morale).toBe(46);
  });

  it('recarga de munição: estojos + espoletas + pólvora, só na bancada', () => {
    const inv = new PlayerInventory(200);
    inv.add('estojos', 10);
    inv.add('espoletas', 1);
    inv.add('polvora', 1);
    const r = RECIPE_BY_ID.get('recarregar38')!;
    expect(checkRecipe(r, inv, { stations: new Set(), now: 0 }).reason).toMatch(/bancada/i);
    expect(craftRecipe(r, inv, { stations: new Set(['bancada']), now: 0 }).ok).toBe(true);
    expect(inv.countOf('municao38')).toBe(10);
    expect(inv.countOf('estojos')).toBe(0);
    expect(inv.countOf('polvora')).toBe(1);
  });
});
