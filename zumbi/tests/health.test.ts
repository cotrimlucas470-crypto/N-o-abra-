import { describe, expect, it } from 'vitest';
import { Health } from '../src/game/health/Health';
import { mostUrgent, treatmentsFor } from '../src/game/health/Treatments';
import { ItemUse } from '../src/game/interaction/ItemUse';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import { WorldState } from '../src/game/sim/WorldState';
import { Body } from '../src/game/survival/Body';
import { physicalEffects } from '../src/game/survival/Effects';
import { Hazards } from '../src/game/survival/Hazards';
import { Survivor } from '../src/game/survival/Survivor';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';

const ctx = () => ({ sleeping: false, body: new Body() });
const run = (h: Health, minutes: number) => h.update(minutes, ctx());

describe('ferimentos', () => {
  it('corte sangra e tira vida; atadura segura; arranhão estanca sozinho', () => {
    const a = new Health();
    a.add('bracoE', 'corte', 0.8);
    const free = run(a, 30);
    const b = new Health();
    const w = b.add('bracoE', 'corte', 0.8);
    b.bandage(w.id, true);
    const held = run(b, 30);
    expect(free).toBeLessThan(-1);
    expect(held).toBeGreaterThan(free / 4);
    const s = new Health();
    const sc = s.add('maoD', 'arranhao', 0.5);
    run(s, 120);
    expect(s.byId(sc.id)!.bleed).toBe(0);
  });

  it('corte fundo sem sutura continua vazando pela atadura; suturado para', () => {
    const a = new Health();
    const w = a.add('pernaD', 'laceracao', 1);
    a.bandage(w.id, true);
    const leak = run(a, 60);
    const b = new Health();
    const v = b.add('pernaD', 'laceracao', 1);
    b.bandage(v.id, true);
    b.suture(v.id);
    const stop = run(b, 60);
    expect(leak).toBeLessThan(stop - 1);
  });

  it('ferida suja infecciona; desinfetar evita; antibiótico faz a infecção recuar', () => {
    const dirty = new Health();
    const w = dirty.add('tronco', 'corte', 0.6);
    run(dirty, 30 * 60);
    expect(dirty.byId(w.id)!.infection).toBeGreaterThan(0);
    expect(dirty.fever()).toBeGreaterThan(0);
    const clean = new Health();
    const c = clean.add('tronco', 'corte', 0.6);
    clean.disinfect(c.id);
    clean.bandage(c.id, true);
    run(clean, 20 * 60);
    expect(clean.byId(c.id)?.infection ?? 0).toBe(0);
    const inf = dirty.byId(w.id)!.infection;
    dirty.takeAntibiotic(24);
    run(dirty, 6 * 60);
    expect(dirty.byId(w.id)!.infection).toBeLessThan(inf);
  });

  it('atadura fica suja com o tempo', () => {
    const h = new Health();
    const w = h.add('bracoD', 'corte', 0.4);
    h.bandage(w.id, true);
    run(h, 13 * 60);
    expect(h.byId(w.id)!.bandage!.clean).toBe(false);
    expect(h.states().map((s) => s.id)).toContain('atadura');
  });

  it('fratura na perna manca e impede correr; tala melhora; sara com o tempo', () => {
    const h = new Health();
    const w = h.add('pernaE', 'fratura', 0.9);
    const e = h.effects();
    expect(e.legFracture).toBe(true);
    const fx = physicalEffects(new Body(), 0, 10, e);
    expect(fx.canSprint).toBe(false);
    expect(fx.walk).toBeLessThan(0.75);
    const pain = h.pain;
    h.splint(w.id);
    expect(h.pain).toBeLessThan(pain);
    run(h, 30 * 24 * 60);
    expect(h.byId(w.id)).toBeNull();
  });

  it('caco dentro não sara até tirar (e deixado muito tempo, infecciona)', () => {
    const late = new Health();
    const l = late.add('peE', 'estilhaco', 0.4);
    run(late, 24 * 60);
    expect(late.byId(l.id)!.infection).toBeGreaterThan(0);
    const h = new Health();
    const w = h.add('peD', 'estilhaco', 0.4);
    run(h, 2 * 60);
    expect(h.byId(w.id)!.heal).toBe(0);
    h.removeGlass(w.id);
    expect(h.byId(w.id)!.kind).toBe('corte');
    h.disinfect(w.id);
    h.bandage(w.id, true);
    run(h, 24 * 60);
    expect(h.byId(w.id)!.heal).toBeGreaterThan(0.1);
  });

  it('analgésico tira a dor por algumas horas', () => {
    const h = new Health();
    h.add('bracoE', 'queimadura', 0.8);
    const p = h.pain;
    h.takePainkiller(30, 4);
    expect(h.pain).toBeLessThan(p - 20);
    run(h, 5 * 60);
    expect(h.painkiller).toBe(0);
  });

  it('save/restore', () => {
    const h = new Health();
    const w = h.add('maoE', 'corte', 0.5);
    h.bandage(w.id, true);
    h.takeAntibiotic(10);
    const g = new Health();
    g.restore(JSON.parse(JSON.stringify(h.serialize())));
    expect(g.wounds).toEqual(h.wounds);
    expect(g.antibiotic).toBe(h.antibiotic);
    expect(g.add('peE', 'contusao', 0.3).id).toBeGreaterThan(w.id);
  });
});

describe('tratamentos com itens', () => {
  it('opções dependem do que você carrega; tratar gasta o item', () => {
    const h = new Health();
    const inv = new PlayerInventory();
    const w = h.add('bracoE', 'laceracao', 0.8);
    let opts = treatmentsFor(w, h, inv, 0);
    expect(opts.find((o) => o.id === 'atadura')?.enabled).toBe(false);
    expect(opts.find((o) => o.id === 'suturar')?.enabled).toBe(false);
    inv.add('atadura', 2);
    inv.add('alcool70', 1);
    inv.add('kitSutura', 1);
    opts = treatmentsFor(w, h, inv, 0);
    opts.find((o) => o.id === 'atadura')!.run();
    expect(inv.countOf('atadura')).toBe(1);
    expect(h.byId(w.id)!.bandage?.clean).toBe(true);
    treatmentsFor(w, h, inv, 0).find((o) => o.id === 'desinfetar')!.run();
    expect(inv.carried.stacks.find((s) => s.defId === 'alcool70')!.st?.dose).toBe(9);
    treatmentsFor(w, h, inv, 0).find((o) => o.id === 'suturar')!.run();
    expect(h.byId(w.id)!.sutured).toBe(true);
    // tirar atadura devolve uma atadura usada
    treatmentsFor(w, h, inv, 0).find((o) => o.id === 'tirarAtadura')!.run();
    expect(inv.countOf('ataduraSuja')).toBe(1);
  });

  it('trapo enfaixa, mas sujo', () => {
    const h = new Health();
    const inv = new PlayerInventory();
    inv.add('trapo', 1);
    const w = h.add('pernaD', 'corte', 0.5);
    treatmentsFor(w, h, inv, 0).find((o) => o.id === 'trapo')!.run();
    expect(h.byId(w.id)!.bandage?.clean).toBe(false);
  });

  it('mais urgente = o que sangra mais', () => {
    const h = new Health();
    h.add('pernaD', 'contusao', 0.5);
    const cut = h.add('bracoE', 'laceracao', 0.9);
    expect(mostUrgent(h)?.id).toBe(cut.id);
  });

  it('pelo inventário: TOMAR analgésico, TRATAR com atadura (ação com tempo), INJETAR com seringa', () => {
    const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = v; } };
    const inv = new PlayerInventory();
    const sv = new Survivor(stats, inv);
    const state = new WorldState(new WorldModel(buildStarterDistrict()));
    const use = new ItemUse({ inventory: inv, survivor: sv, state, now: () => 0, openContainerId: () => null, position: () => ({ x: 0, y: 0 }), hooks: { noise: () => undefined, drop: () => undefined } });
    const at = (id: string) => ({ where: 'inv' as const, containerId: 'corpo', index: inv.carried.stacks.findIndex((s) => s.defId === id) });
    sv.health.add('bracoE', 'corte', 0.7);
    inv.add('analgesico', 1);
    expect(use.run('tomar', at('analgesico')).ok).toBe(true);
    expect(sv.health.painkiller).toBeGreaterThan(0);
    inv.add('atadura', 1);
    const r = use.run('tratar', at('atadura'));
    expect(r.timed).toBeDefined();
    r.timed!.done();
    expect(sv.health.wounds[0]!.bandage).toBeDefined();
    inv.add('antibiotico', 1);
    expect(use.actionsFor(at('antibiotico')).find((a) => a.id === 'injetar')?.enabled).toBe(false);
    inv.add('seringa', 1);
    expect(use.run('injetar', at('antibiotico')).ok).toBe(true);
    expect(sv.health.antibiotic).toBe(24 * 60);
  });
});

describe('perigos', () => {
  function setup(rngValues: number[]) {
    const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = v; } };
    const inv = new PlayerInventory();
    const sv = new Survivor(stats, inv);
    const state = new WorldState(new WorldModel(buildStarterDistrict()));
    let i = 0;
    const hz = new Hazards(state, sv, inv, () => rngValues[i++ % rngValues.length]!);
    return { inv, sv, state, hz };
  }

  it('caco no chão fere o pé descalço; sapato protege', () => {
    const t = setup([0.1]);
    t.state.addGlass(500, 500);
    const fx = physicalEffects(new Body(), 0, 10);
    const ev = t.hz.frame(0.3, { x: 500, y: 500, moving: true, sprinting: false }, fx);
    expect(ev?.message).toMatch(/caco/);
    expect(t.sv.health.wounds[0]!.kind).toBe('estilhaco');
    const s = setup([0.1]);
    s.inv.putOn('tenis');
    s.state.addGlass(500, 500);
    expect(s.hz.frame(0.3, { x: 500, y: 500, moving: true, sprinting: false }, fx)).toBeNull();
  });

  it('correndo exausto pode tropeçar e torcer o pé', () => {
    const t = setup([0, 0.2, 0.5, 0.5]);
    const b = new Body();
    b.fatigue = 95;
    const fx = physicalEffects(b, 0, 10);
    const ev = t.hz.frame(1, { x: 0, y: 0, moving: true, sprinting: true }, fx);
    expect(ev?.message).toMatch(/Tropeçou/);
    expect(t.sv.health.wounds.length).toBe(1);
  });

  it('cacos de jogo vão para o save e podem ser varridos', () => {
    const t = setup([0.1]);
    t.state.addGlass(10, 20);
    const g = t.state.glassNear(10, 20, 5)!;
    const s2 = new WorldState(new WorldModel(buildStarterDistrict()));
    s2.restore(JSON.parse(JSON.stringify(t.state.serialize())));
    expect(s2.glassNear(10, 20, 5)).not.toBeNull();
    s2.clearGlass(g.key);
    expect(s2.glassNear(10, 20, 5)).toBeNull();
  });
});
