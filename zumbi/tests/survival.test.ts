import { describe, expect, it } from 'vitest';
import { Flag, foodEffect } from '../src/game/items/condition';
import { itemDef } from '../src/game/items/ItemCatalog';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import { ActionRunner } from '../src/game/sim/Actions';
import { Body, DEFAULT_CONTEXT, feltTemperature, type BodyContext } from '../src/game/survival/Body';
import { physicalEffects } from '../src/game/survival/Effects';
import { Survivor, type Environment } from '../src/game/survival/Survivor';
import type { WeatherSample } from '../src/game/sim/Weather';

const ctx = (o: Partial<BodyContext> = {}): BodyContext => ({ ...DEFAULT_CONTEXT, ...o });
const sky = (o: Partial<WeatherSample> = {}): WeatherSample => ({ temp: 22, cloud: 0, rain: 0, fog: 0, wind: 0, sky: 'limpo', ...o });

describe('corpo: necessidades', () => {
  it('fome, sede e cansaço sobem com o tempo; sede mais rápido que fome', () => {
    const b = new Body();
    b.hunger = 0;
    b.thirst = 0;
    b.fatigue = 0;
    b.update(12 * 60, ctx());
    expect(b.thirst).toBeGreaterThan(b.hunger);
    expect(b.hunger).toBeGreaterThan(25);
    expect(b.fatigue).toBeGreaterThan(55);
  });

  it('correr gasta mais; dormir recupera o cansaço e gasta menos', () => {
    const a = new Body();
    const r = new Body();
    a.update(120, ctx({ activity: 'walk' }));
    r.update(120, ctx({ activity: 'run' }));
    expect(r.thirst).toBeGreaterThan(a.thirst);
    const s = new Body();
    s.fatigue = 80;
    s.update(8 * 60, ctx({ sleeping: true }));
    expect(s.fatigue).toBeLessThan(5);
  });

  it('sem comer nem beber por dias, perde vida; bem cuidado recupera', () => {
    const b = new Body();
    b.hunger = 96;
    b.thirst = 96;
    expect(b.update(60, ctx())).toBeLessThan(-5);
    const ok = new Body();
    expect(ok.update(60, ctx())).toBeGreaterThan(0);
  });

  it('comer e beber aliviam; comida estragada deixa doente e a doença tira vida com o tempo', () => {
    const b = new Body();
    b.hunger = 60;
    b.consume(foodEffect(itemDef('biscoito')!, undefined, 0)!);
    expect(b.hunger).toBeLessThan(60);
    const sick = new Body();
    sick.consume(foodEffect(itemDef('frango')!, { born: -10 }, 0)!);
    expect(sick.sickness).toBeGreaterThan(0.3);
    expect(sick.update(120, ctx())).toBeLessThan(0);
    // passa sozinha
    sick.update(24 * 60, ctx());
    expect(sick.sickness).toBe(0);
  });

  it('estados aparecem por faixa', () => {
    const b = new Body();
    b.hunger = 60;
    b.thirst = 80;
    b.temp = 34.8;
    const ids = b.states().map((s) => `${s.id}:${s.level}`);
    expect(ids).toContain('fome:2');
    expect(ids).toContain('sede:3');
    expect(ids).toContain('frio:3');
  });

  it('save/restore', () => {
    const b = new Body();
    b.hunger = 33;
    b.temp = 36.1;
    const c = new Body();
    c.restore(JSON.parse(JSON.stringify(b.snapshot())));
    expect(c.snapshot()).toEqual(b.snapshot());
    c.restore({ hunger: Number.NaN, temp: 99 });
    expect(c.hunger).toBe(33);
    expect(c.temp).toBe(43);
  });
});

describe('corpo: temperatura, roupa e chuva', () => {
  it('noite fria de inverno sem agasalho: esfria até ficar com frio; com casaco, não', () => {
    const cold = new Body();
    cold.update(6 * 60, ctx({ airTemp: 7, sheltered: false, insulation: 0.65 }));
    expect(cold.temp).toBeLessThan(36);
    const warm = new Body();
    warm.update(6 * 60, ctx({ airTemp: 7, sheltered: false, insulation: 0.65 + 0.8 }));
    expect(warm.temp).toBeGreaterThan(36.4);
  });

  it('dentro de casa o ar frio fica mais ameno', () => {
    expect(feltTemperature(ctx({ airTemp: 6, sheltered: true }), 0)).toBeGreaterThan(feltTemperature(ctx({ airTemp: 6, sheltered: false }), 0) + 4);
  });

  it('chuva molha lá fora, não debaixo do teto; capa de chuva protege; molhado esfria', () => {
    const out = new Body();
    out.update(60, ctx({ rain: 0.8, sheltered: false }));
    const inside = new Body();
    inside.update(60, ctx({ rain: 0.8, sheltered: true }));
    const coat = new Body();
    coat.update(60, ctx({ rain: 0.8, sheltered: false, raincoat: true }));
    expect(out.wet).toBeGreaterThan(0.6);
    expect(inside.wet).toBe(0);
    expect(coat.wet).toBeLessThan(0.2);
    expect(feltTemperature(ctx(), 1)).toBeLessThan(feltTemperature(ctx(), 0) - 5);
    // e seca depois
    out.update(6 * 60, ctx({ sheltered: true }));
    expect(out.wet).toBe(0);
  });

  it('calor forte com roupa pesada correndo esquenta demais', () => {
    const b = new Body();
    b.update(4 * 60, ctx({ airTemp: 34, sheltered: false, insulation: 1.4, activity: 'run' }));
    expect(b.temp).toBeGreaterThan(38);
  });
});

describe('efeitos do estado físico', () => {
  it('exausto não corre e anda mais devagar; carga pesada pesa', () => {
    const b = new Body();
    b.fatigue = 95;
    const e = physicalEffects(b, 1, 10);
    expect(e.canSprint).toBe(false);
    expect(e.walk).toBeLessThan(0.9);
    const heavy = physicalEffects(new Body(), 10, 10);
    const light = physicalEffects(new Body(), 2, 10);
    expect(heavy.walk).toBeLessThan(light.walk);
    expect(heavy.staminaDrain).toBeGreaterThan(light.staminaDrain);
  });

  it('perna ferida atrapalha andar; braço ferido atrapalha golpe e ações', () => {
    const b = new Body();
    const leg = physicalEffects(b, 0, 10, { legs: 0.8, arms: 0, pain: 0, legFracture: false });
    expect(leg.walk).toBeLessThan(0.7);
    expect(leg.canSprint).toBe(false);
    const arm = physicalEffects(b, 0, 10, { legs: 0, arms: 0.8, pain: 0, legFracture: false });
    expect(arm.melee).toBeLessThan(0.7);
    expect(arm.actionTime).toBeGreaterThan(1.3);
  });
});

describe('roupas e mão', () => {
  it('vestir tira da mochila, troca a do mesmo lugar e bolsos aumentam a capacidade', () => {
    const inv = new PlayerInventory();
    inv.add('calcaJeans', 1);
    inv.add('bermuda', 1);
    const cap = inv.capacity;
    expect(inv.wear(inv.carried, 0)).toBeNull();
    expect(inv.wornIn('pernas')?.defId).toBe('calcaJeans');
    expect(inv.capacity).toBe(cap + 1);
    expect(inv.wear(inv.carried, inv.carried.stacks.findIndex((s) => s.defId === 'bermuda'))).toBeNull();
    expect(inv.wornIn('pernas')?.defId).toBe('bermuda');
    expect(inv.carried.countOf('calcaJeans')).toBe(1);
    expect(inv.capacity).toBe(cap);
  });

  it('isolamento soma; roupa molhada isola menos; tirar volta para o inventário', () => {
    const inv = new PlayerInventory();
    inv.putOn('camiseta');
    inv.putOn('casacoInverno');
    const dry = inv.insulation();
    expect(dry).toBeCloseTo(0.9, 5);
    inv.updateWorn('tronco-externo', { f: Flag.Molhado });
    expect(inv.insulation()).toBeLessThan(dry - 0.4);
    expect(inv.takeOff('tronco-externo')).toBeNull();
    expect(inv.carried.countOf('casacoInverno')).toBe(1);
  });

  it('não tira a roupa se o que está nos bolsos dela não couber', () => {
    const inv = new PlayerInventory();
    inv.putOn('macacao'); // +2 kg de bolsos
    expect(inv.add('tijolo', 4)).toBe(4); // 10 kg: só cabe com os bolsos do macacão
    expect(inv.takeOff('tronco-externo')).toMatch(/Esvazie/);
  });

  it('segurar na mão e guardar; o que estava na mão volta', () => {
    const inv = new PlayerInventory();
    inv.add('martelo', 1);
    inv.add('faca', 1);
    expect(inv.equipHand(inv.carried, 0)).toBeNull();
    expect(inv.hand?.defId).toBe('martelo');
    expect(inv.hasTag('martelar')).toBe(true);
    expect(inv.equipHand(inv.carried, inv.carried.stacks.findIndex((s) => s.defId === 'faca'))).toBeNull();
    expect(inv.hand?.defId).toBe('faca');
    expect(inv.carried.countOf('martelo')).toBe(1);
    expect(inv.unequipHand()).toBeNull();
    expect(inv.hand).toBeNull();
  });

  it('mochila alivia o peso sentido; save guarda roupas e mão', () => {
    const inv = new PlayerInventory();
    inv.add('mochilaMilitar', 1);
    inv.equipBag(inv.carried, 0);
    inv.bag!.container.add('tijolo', 4);
    expect(inv.effectiveLoad).toBeLessThan(inv.weight - 4);
    inv.putOn('tenis');
    inv.add('lanterna', 1);
    inv.equipHand(inv.carried, 0);
    const again = new PlayerInventory();
    again.restore(JSON.parse(JSON.stringify(inv.serialize())));
    expect(again.wornIn('pes')?.defId).toBe('tenis');
    expect(again.hand?.defId).toBe('lanterna');
    expect(again.weight).toBeCloseTo(inv.weight, 5);
  });
});

describe('sobrevivente', () => {
  const env = (o: Partial<Environment> = {}): Environment => ({ weather: sky(), sheltered: true, activity: 'idle', fireHeat: 0, sleep: null, ...o });

  it('chuva molha a roupa vestida e ela seca depois', () => {
    const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = v; } };
    const inv = new PlayerInventory();
    inv.putOn('moletom');
    const s = new Survivor(stats, inv);
    s.update(90, env({ weather: sky({ rain: 1 }), sheltered: false }));
    expect((inv.wornIn('tronco-externo')!.st?.f ?? 0) & Flag.Molhado).toBeTruthy();
    s.update(8 * 60, env());
    expect((inv.wornIn('tronco-externo')!.st?.f ?? 0) & Flag.Molhado).toBeFalsy();
  });

  it('lanterna ligada gasta pilha e desliga quando acaba', () => {
    const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = v; } };
    const inv = new PlayerInventory();
    inv.add('lanterna', 1, { on: 1, ch: 0.1 });
    inv.equipHand(inv.carried, 0);
    const s = new Survivor(stats, inv);
    s.update(10, env());
    expect(inv.hand!.st?.ch).toBeLessThan(0.1);
    s.update(60, env());
    expect(inv.hand!.st?.on).toBeUndefined();
  });

  it('não dorme sem sono, com fome demais ou com frio demais', () => {
    const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = v; } };
    const s = new Survivor(stats, new PlayerInventory());
    s.body.fatigue = 10;
    expect(s.cantSleep()).toMatch(/sono/);
    s.body.fatigue = 70;
    expect(s.cantSleep()).toBeNull();
    s.body.hunger = 90;
    expect(s.cantSleep()).toMatch(/Fome/);
  });
});

describe('ações com tempo', () => {
  it('acelera o relógio para durar poucos segundos e termina com os minutos certos', () => {
    const r = new ActionRunner();
    let done = false;
    let ticked = 0;
    r.start({ id: 'x', label: 'Teste', minutes: 30, tick: (m) => (ticked += m), done: () => void (done = true) });
    const scale = r.timeScale(0.5);
    expect(scale).toBeGreaterThan(5);
    // 30 min de jogo em passos de 7
    for (let i = 0; i < 10 && r.active; i++) r.advance(7);
    expect(done).toBe(true);
    expect(ticked).toBeCloseTo(30, 5);
  });

  it('andar cancela (se a ação deixa); até() termina antes', () => {
    const r = new ActionRunner();
    let cancelled = false;
    r.start({ id: 'x', label: 'x', minutes: 10, done: () => undefined, cancelled: () => void (cancelled = true) });
    r.onMove();
    expect(cancelled).toBe(true);
    expect(r.active).toBe(false);
    let stop = false;
    r.start({ id: 's', label: 'Dormindo', minutes: 600, interruptible: false, until: () => stop, done: () => ({ ok: true, message: 'acordou' }) });
    expect(r.onMove()).toBeNull();
    r.advance(30);
    stop = true;
    expect(r.advance(1)?.message).toBe('acordou');
  });
});
