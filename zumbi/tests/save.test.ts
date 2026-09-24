import { beforeEach, describe, expect, it } from 'vitest';
import { SANDBOX_DEFAULTS } from '../src/game/config/Sandbox';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import { archiveCurrent, loadGame, saveGame, saveSummary } from '../src/game/save/SaveGame';
import { WorldState } from '../src/game/sim/WorldState';
import { Body } from '../src/game/survival/Body';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';

class FakeStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

let store: FakeStorage;
beforeEach(() => {
  store = new FakeStorage();
  (globalThis as unknown as { localStorage: FakeStorage }).localStorage = store;
});

function sample(minutes: number) {
  const model = new WorldModel(buildStarterDistrict());
  const state = new WorldState(model);
  const inv = new PlayerInventory();
  inv.putOn('camiseta');
  inv.add('agua', 2);
  const body = new Body();
  body.hunger = 42;
  return {
    settings: SANDBOX_DEFAULTS,
    clock: { minutes },
    player: { x: 100, y: 200, facing: 1, stats: { health: 80, stamina: 50, exhausted: false } },
    body: body.snapshot(),
    inventory: inv.serialize(),
    world: state.serialize(),
  };
}

describe('save no aparelho', () => {
  it('grava, carrega e resume', () => {
    expect(loadGame()).toBeNull();
    expect(saveGame(sample(1440 * 2 + 60))).toBe(true);
    const g = loadGame()!;
    expect(g.version).toBe(1);
    expect(g.body.hunger).toBe(42);
    expect(g.inventory.worn?.tronco?.defId).toBe('camiseta');
    expect(saveSummary()?.day).toBe(3);
  });

  it('o save anterior vira backup; save estragado cai no backup', () => {
    saveGame(sample(100));
    saveGame(sample(200));
    expect(JSON.parse(store.getItem('tdr.save.slot1.bak')!).clock.minutes).toBe(100);
    store.setItem('tdr.save.slot1', '{quebrado');
    expect(loadGame()?.clock.minutes).toBe(100);
  });

  it('jogo novo não apaga o antigo: arquiva', () => {
    saveGame(sample(500));
    archiveCurrent();
    expect(JSON.parse(store.getItem('tdr.save.slot1.old')!).clock.minutes).toBe(500);
    expect(loadGame()?.clock.minutes).toBe(500);
  });

  it('restaurar o inventário e o corpo devolve o mesmo estado', () => {
    saveGame(sample(10));
    const g = loadGame()!;
    const inv = new PlayerInventory();
    inv.restore(g.inventory);
    expect(inv.countOf('agua')).toBe(2);
    expect(inv.wornIn('tronco')?.defId).toBe('camiseta');
    const b = new Body();
    b.restore(g.body);
    expect(b.hunger).toBe(42);
  });
});
