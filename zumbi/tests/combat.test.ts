import { describe, expect, it } from 'vitest';
import { Combat } from '../src/game/combat/Combat';
import { ItemUse } from '../src/game/interaction/ItemUse';
import { ToolInteractions, WindowInteractions, type WorldActionHooks } from '../src/game/interaction/ToolInteractions';
import { Flag } from '../src/game/items/condition';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import type { TimedActionSpec } from '../src/game/sim/Actions';
import { WorldState } from '../src/game/sim/WorldState';
import { Skills } from '../src/game/skills/Skills';
import { Survivor } from '../src/game/survival/Survivor';
import { propSolids } from '../src/game/world/collision';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { PROP_DURABILITY } from '../src/game/world/PropDurability';
import { WorldModel } from '../src/game/world/WorldModel';

function setup(rng: () => number = () => 0.99) {
  const model = new WorldModel(buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 }));
  const state = new WorldState(model);
  const inv = new PlayerInventory();
  const stats = { health: 100, maxHealth: 100, stamina: 100, setHealth(v: number) { this.health = v; } };
  const sv = new Survivor(stats, inv);
  const combat = new Combat(state, sv, inv, { stamina: () => stats.stamina, spendStamina: (n) => (stats.stamina -= n) }, rng);
  const started: TimedActionSpec[] = [];
  const dropped: { defId: string; count: number }[] = [];
  const hooks: WorldActionHooks = { start: (s) => started.push(s), drop: (items) => dropped.push(...items), noise: () => undefined, moveTo: () => undefined, now: () => 0, rng };
  const tools = new ToolInteractions(state, inv, sv, hooks);
  const windows = new WindowInteractions(state, inv, sv, hooks);
  return { model, state, inv, stats, sv, combat, started, dropped, tools, windows, hooks };
}

/** Ponto de onde olhar para um objeto: ao lado dele, virado para ele. */
function facing(p: { x: number; y: number }, from: { x: number; y: number }) {
  return Math.atan2(p.y - from.y, p.x - from.x);
}

function standBeside(t: ReturnType<typeof setup>, prop: { x: number; y: number; id: string }) {
  const p = t.state.propById(prop.id)!;
  const s = propSolids(p)[0]!;
  const r = s.kind === 'circle' ? s.r : Math.max(s.w, s.h) / 2;
  for (let a = 0; a < 16; a++) {
    const ang = (a * Math.PI) / 8;
    const x = p.x + Math.cos(ang) * (r + 24);
    const y = p.y + Math.sin(ang) * (r + 24);
    const cell = t.model.nav.cellOf(x, y);
    if (!t.model.nav.isBlocked(cell.cx, cell.cy)) return { x, y };
  }
  return { x: p.x + r + 24, y: p.y };
}

describe('combate corpo a corpo', () => {
  it('bater num caixote quebra, some da navegação e deixa lenha', () => {
    const t = setup();
    const crate = t.model.map.props.find((p) => p.type === 'crate')!;
    const at = standBeside(t, crate);
    t.inv.add('machado', 1);
    t.inv.equipHand(t.inv.carried, 0);
    let r;
    for (let i = 0; i < 20; i++) {
      t.stats.stamina = 100;
      r = t.combat.melee(at.x, at.y, facing(crate, at));
      if (r.hit?.destroyed) break;
    }
    expect(r!.hit?.destroyed).toBe(true);
    expect(t.state.isPropRemoved(crate.id)).toBe(true);
    expect(r!.drops!.some((d) => d.defId === 'lenha')).toBe(true);
    expect(t.inv.hand!.st?.c).toBeLessThan(1); // machado gastou
    const save = JSON.parse(JSON.stringify(t.state.serialize()));
    const again = new WorldState(new WorldModel(buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 })));
    again.restore(save);
    expect(again.isPropRemoved(crate.id)).toBe(true);
  });

  it('soco em coisa dura pode machucar a mão; gasta fôlego', () => {
    const t = setup(() => 0.01);
    const shelf = t.model.map.props.find((p) => p.type === 'storeShelf')!;
    const at = standBeside(t, shelf);
    const before = t.stats.stamina;
    const r = t.combat.melee(at.x, at.y, facing(shelf, at));
    expect(r.hit).toBeDefined();
    expect(t.stats.stamina).toBeLessThan(before);
    expect(t.sv.health.wounds.some((w) => w.kind === 'contusao')).toBe(true);
  });

  it('porta fechada cede depois de apanhar e fica aberta de vez', () => {
    const t = setup();
    const d = t.model.map.doors.find((x) => x.material === 'wood' && !t.state.doorState(x.id)!.open)!;
    t.inv.add('marreta', 1);
    t.inv.equipHand(t.inv.carried, 0);
    const from = d.vertical ? { x: d.x - 30, y: d.y } : { x: d.x, y: d.y - 30 };
    for (let i = 0; i < 20 && !t.state.doorState(d.id)!.broken; i++) {
      t.stats.stamina = 100;
      t.combat.melee(from.x, from.y, facing(d, from));
    }
    expect(t.state.doorState(d.id)!.broken).toBe(true);
    expect(t.state.setDoorOpen(d.id, false)).toBe(false);
  });
});

describe('armas de fogo', () => {
  it('sem bala: clique; com bala: gasta e faz barulho; recarregar usa munição do calibre', () => {
    const t = setup();
    t.inv.add('revolver38', 1);
    t.inv.equipHand(t.inv.carried, 0);
    expect(t.combat.shoot(500, 500, 0).message).toMatch(/Sem bala/);
    t.inv.add('municao38', 10);
    const spec = t.combat.reload() as TimedActionSpec;
    expect(typeof spec).toBe('object');
    spec.done();
    expect(t.inv.hand!.st?.am).toBe(6);
    expect(t.inv.countOf('municao38')).toBe(4);
    const r = t.combat.shoot(500, 500, 0);
    expect(r.ok).toBe(true);
    expect(r.noise!.radius).toBeGreaterThan(1000);
    expect(t.inv.hand!.st?.am).toBe(5);
  });

  it('munição de outro calibre não serve; arma pode emperrar e destravar', () => {
    const t = setup(() => 0);
    t.inv.add('pistola9', 1, { am: 3 });
    t.inv.equipHand(t.inv.carried, 0);
    t.inv.add('municao38', 20);
    expect(t.combat.reload()).toMatch(/Sem munição/);
    const r = t.combat.shoot(500, 500, 0); // rng 0: emperra
    expect(r.message).toMatch(/Emperrou/);
    expect((t.inv.hand!.st?.f ?? 0) & Flag.Emperrada).toBeTruthy();
    const u = t.combat.unjam() as TimedActionSpec;
    u.done();
    expect((t.inv.hand!.st?.f ?? 0) & Flag.Emperrada).toBeFalsy();
  });
});

describe('ferramentas e janelas', () => {
  it('desmontar exige ferramenta e recipiente vazio; rende materiais', () => {
    const t = setup();
    const chair = t.model.map.props.find((p) => p.type === 'chair')!;
    let opt = t.tools.propOptions(chair).find((o) => o.label.startsWith('Desmontar'))!;
    expect(opt.enabled).toBe(false);
    t.inv.add('martelo', 1);
    opt = t.tools.propOptions(chair).find((o) => o.label.startsWith('Desmontar'))!;
    expect(opt.enabled).toBe(true);
    opt.perform();
    const msg = t.started[0]!.done();
    expect(msg && msg.ok).toBe(true);
    expect(t.state.isPropRemoved(chair.id)).toBe(true);
    expect(t.inv.countOf('tabua') + t.inv.countOf('pregos')).toBeGreaterThan(0);
    expect(t.sv.skills.level('carpintaria')).toBe(0);
  });

  it('cortar árvore com machado derruba e dá madeira', () => {
    const t = setup();
    const tree = t.model.map.props.find((p) => PROP_DURABILITY[p.type]?.cut && p.type === 'treeLarge')!;
    t.inv.add('machado', 1);
    const opt = t.tools.propOptions(tree).find((o) => o.label.startsWith('Cortar'))!;
    opt.perform();
    t.started[0]!.done();
    expect(t.state.isPropRemoved(tree.id)).toBe(true);
    expect(t.dropped.some((d) => d.defId === 'tora')).toBe(true);
  });

  it('porta trancada: chave certa destranca; pé de cabra arromba; por dentro dá para trancar', () => {
    const t = setup();
    const d = t.model.map.doors.find((x) => t.state.doorState(x.id)!.locked && x.material !== 'metal')!;
    expect(d).toBeDefined();
    const who = { x: d.x + 200, y: d.y + 200, radius: 15, facing: 0 };
    expect(t.tools.doorOptions(d, who).find((o) => o.label.startsWith('Destrancar'))).toBeUndefined();
    t.inv.add('chaveCasa', 1, { key: d.buildingId! });
    const key = t.tools.doorOptions(d, who).find((o) => o.label.startsWith('Destrancar'))!;
    key.perform();
    expect(t.state.doorState(d.id)!.locked).toBe(false);
    // de novo trancada: pé de cabra
    t.state.setDoorLocked(d.id, true);
    t.inv.add('peDeCabra', 1);
    t.tools.doorOptions(d, who).find((o) => o.label.startsWith('Arrombar'))!.perform();
    t.started.at(-1)!.done();
    expect(t.state.doorState(d.id)!.open).toBe(true);
  });

  it('janela: quebrar espalha cacos; pular com cacos no batente pode cortar; tirar os cacos resolve', () => {
    const t = setup(() => 0.1);
    const w = t.model.map.walls.find((x) => x.kind === 'window')!;
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h / 2;
    const who = { x: cx + (w.h > w.w ? -30 : 0), y: cy + (w.h > w.w ? 0 : -30), radius: 15, facing: 0 };
    const cands: import('../src/game/interaction/InteractionSystem').InteractionCandidate[] = [];
    t.windows.collect(who, cands);
    expect(cands[0]!.target.label).toMatch(/Quebrar/);
    t.inv.add('martelo', 1);
    t.inv.equipHand(t.inv.carried, 0);
    cands[0]!.perform();
    expect(t.state.isWindowBroken(WorldState.windowId(w))).toBe(true);
    expect(t.state.glassNear(cx, cy, 30)).not.toBeNull();
    const again: typeof cands = [];
    t.windows.collect(who, again);
    expect(again[0]!.target.label).toMatch(/Pular/);
    again[0]!.perform();
    t.started.at(-1)!.done();
    expect(t.sv.health.wounds.length).toBeGreaterThan(0);
  });
});

describe('habilidades e leitura', () => {
  it('manual sobe um nível uma vez; praticar depois rende o dobro', () => {
    const s = new Skills();
    expect(s.readBook('livroCarpintaria', 'carpintaria')).toBe(1);
    expect(s.readBook('livroCarpintaria', 'carpintaria')).toBeNull();
    const a = new Skills();
    a.gain('carpintaria', 30);
    const b = new Skills();
    b.readBook('livroCarpintaria', 'carpintaria');
    const before = b.progress('carpintaria');
    b.gain('carpintaria', 30);
    expect(b.progress('carpintaria') - before).toBeGreaterThan(0);
    expect(a.level('carpintaria')).toBe(0);
    const c = new Skills();
    c.restore(JSON.parse(JSON.stringify(b.serialize())));
    expect(c.level('carpintaria')).toBe(b.level('carpintaria'));
  });

  it('LER no escuro não dá; com luz, o manual ensina', () => {
    const t = setup();
    let light = 0.1;
    const use = new ItemUse({ inventory: t.inv, survivor: t.sv, state: t.state, now: () => 0, openContainerId: () => null, position: () => ({ x: 0, y: 0 }), hooks: { noise: () => undefined, drop: () => undefined, light: () => light } });
    t.inv.add('livroMecanica', 1);
    const at = { where: 'inv' as const, containerId: 'corpo', index: 0 };
    expect(use.run('ler', at).ok).toBe(false);
    light = 1;
    const r = use.run('ler', at);
    expect(r.timed).toBeDefined();
    r.timed!.done();
    expect(t.sv.skills.level('mecanica')).toBe(1);
  });

  it('chave achada em loot abre algo que existe por perto', () => {
    const t = setup();
    let found = 0;
    for (const p of t.model.map.props) {
      const ref = t.state.loot.ref(p.id);
      if (!ref) continue;
      const c = t.state.loot.peek(p.id, true)!;
      for (const s of c.stacks) {
        if (s.defId !== 'chaveCasa' && s.defId !== 'chaveCarro') continue;
        found++;
        const k = s.st?.key;
        expect(k).toBeTruthy();
        const ok = s.defId === 'chaveCasa' ? t.model.map.buildings.some((b) => b.id === k) : t.model.map.props.some((x) => x.id === k);
        expect(ok).toBe(true);
      }
    }
    expect(found).toBeGreaterThan(0);
  });
});
