import { describe, expect, it } from 'vitest';
import { PLAYER_TUNING } from '../src/game/config/PlayerTuning';
import { INTERACTION_TUNING } from '../src/game/config/WorldTuning';
import { EventBus } from '../src/game/core/EventBus';
import { hashString } from '../src/game/core/Random';
import { DoorInteractions, type Body } from '../src/game/interaction/DoorInteractions';
import { InteractionSystem, type Interactor } from '../src/game/interaction/InteractionSystem';
import { ItemInteractions } from '../src/game/interaction/ItemInteractions';
import { allItemIds, formatKg, itemDef } from '../src/game/items/ItemCatalog';
import { ItemContainer } from '../src/game/items/ItemContainer';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import { WorldState } from '../src/game/sim/WorldState';
import { mapSolids } from '../src/game/world/collision';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { doorGapRect, doorLeaves, leafTip } from '../src/game/world/doors';
import type { DoorPlacement, MapData } from '../src/game/world/MapTypes';
import { Pathfinder } from '../src/game/world/nav/Pathfinder';
import { WorldModel } from '../src/game/world/WorldModel';
import { flood, walkableGrid } from './support/reach';

const R = PLAYER_TUNING.bodyRadius;

function fingerprint(m: MapData): string {
  const layout = JSON.stringify([m.walls, m.props, m.decals, m.markings, m.buildings, m.regions, m.spawn]);
  return `${hashString(Array.from(m.ground).join(''))}-${hashString(layout)}-${layout.length}`;
}

// ------------------------------------------------------------------ mapa

describe('mapa expandido preservado', () => {
  // Impressão digital do traçado (chão, paredes, objetos, construções, regiões).
  // Portas e itens NÃO entram: são camadas novas por cima do mesmo mapa.
  // Se um dia o mapa mudar DE PROPÓSITO, atualize estes valores no mesmo commit.
  const FROZEN: [number, number, number, string][] = [
    [1337, 3, 3, '921084530-3613928651-412103'],
    [90210, 3, 3, '3480679881-2820778737-413327'],
    [4242, 2, 4, '1972651309-2826438151-370269'],
    [1337, 1, 1, '1634556890-733842999-58613'],
  ];
  for (const [seed, sx, sy, fp] of FROZEN) {
    it(`cidade ${sx}x${sy} semente ${seed} tem o mesmo traçado`, () => {
      expect(fingerprint(buildCity({ seed, sectorsX: sx, sectorsY: sy }))).toBe(fp);
    });
  }
});

describe('portas como dados do mapa', () => {
  const map = buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 });

  it('toda porta externa de construção virou uma porta com id', () => {
    const byPos = new Map(map.doors.map((d) => [`${Math.round(d.x)},${Math.round(d.y)}`, d]));
    for (const b of map.buildings) {
      for (const bd of b.doors) {
        const d = byPos.get(`${Math.round(bd.x)},${Math.round(bd.y)}`);
        expect(d, `${b.id} porta em ${bd.x},${bd.y}`).toBeDefined();
        expect(d!.exterior).toBe(true);
        expect(d!.buildingId).toBe(b.id);
      }
    }
  });

  it('ids únicos e estáveis entre gerações', () => {
    const ids = map.doors.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 }).doors).toEqual(map.doors);
  });

  it('a porta cabe no vão: nenhuma parede invade o vão', () => {
    for (const d of map.doors) {
      const g = doorGapRect(d);
      for (const w of map.walls) {
        const overlapX = Math.min(g.x + g.w, w.x + w.w) - Math.max(g.x, w.x);
        const overlapY = Math.min(g.y + g.h, w.y + w.h) - Math.max(g.y, w.y);
        if (overlapX > 1 && overlapY > 1) throw new Error(`parede dentro do vão da ${d.id}`);
      }
    }
  });

  it('porta da rua abre para dentro da construção', () => {
    const bounds = new Map(map.buildings.map((b) => [b.id, b.bounds]));
    for (const d of map.doors.filter((x) => x.exterior && x.style !== 'rolling')) {
      const b = bounds.get(d.buildingId!)!;
      for (const leaf of doorLeaves(d)) {
        const tip = leafTip(leaf, leaf.openAngle);
        const mid = { x: (leaf.hx + tip.x) / 2, y: (leaf.hy + tip.y) / 2 };
        expect(mid.x > b.x && mid.x < b.x + b.w && mid.y > b.y && mid.y < b.y + b.h, d.id).toBe(true);
      }
    }
  });

  it('folha fechada cobre o vão', () => {
    for (const d of map.doors.filter((x) => x.style !== 'rolling')) {
      const leaves = doorLeaves(d);
      const total = leaves.reduce((s, l) => s + l.length, 0);
      expect(total).toBeCloseTo(d.length, 3);
      for (const l of leaves) {
        const tip = leafTip(l, l.closedAngle);
        const g = doorGapRect(d);
        expect(tip.x).toBeGreaterThanOrEqual(g.x - 0.01);
        expect(tip.x).toBeLessThanOrEqual(g.x + g.w + 0.01);
        expect(tip.y).toBeGreaterThanOrEqual(g.y - 0.01);
        expect(tip.y).toBeLessThanOrEqual(g.y + g.h + 0.01);
      }
    }
  });

  it('tem portas de todos os tipos esperados', () => {
    const kinds = new Set(map.doors.map((d) => `${d.style}/${d.material}`));
    for (const k of ['single/wood', 'double/glass', 'single/metal', 'rolling/metal']) expect(kinds.has(k), k).toBe(true);
    // passagem larga entre sala e cozinha das casas não tem porta
    expect(map.doors.some((d) => !d.exterior && d.length > 1.8 * 64)).toBe(false);
  });
});

describe('itens do setor inicial', () => {
  const map = buildStarterDistrict();
  const model = new WorldModel(map);

  it('usam itens do catálogo e têm ids únicos', () => {
    expect(map.items.length).toBeGreaterThan(10);
    for (const it of map.items) expect(itemDef(it.defId), it.defId).not.toBeNull();
    expect(new Set(map.items.map((i) => i.id)).size).toBe(map.items.length);
  });

  it('todo item pode ser pego: alguma posição alcançável do jogador o vê e o alcança', () => {
    const CELL = 8;
    const grid = walkableGrid(map, mapSolids(map), CELL);
    const reach = flood(grid, map.spawn.x, map.spawn.y, CELL);
    const maxD = INTERACTION_TUNING.itemReach - 4;
    for (const it of map.items) {
      let ok = false;
      for (let y = it.y - maxD; y <= it.y + maxD && !ok; y += CELL) {
        for (let x = it.x - maxD; x <= it.x + maxD; x += CELL) {
          const cx = Math.floor(x / CELL);
          const cy = Math.floor(y / CELL);
          if (!reach[cy * grid.cols + cx]) continue;
          const px = cx * CELL + CELL / 2;
          const py = cy * CELL + CELL / 2;
          if (Math.hypot(px - it.x, py - it.y) > maxD) continue;
          if (!model.sight.hasLineOfSight(px, py, it.x, it.y)) continue;
          ok = true;
          break;
        }
      }
      expect(ok, `${it.id} fora de alcance`).toBe(true);
    }
  });
});

// ------------------------------------------------------------------ itens e recipientes

describe('ItemContainer', () => {
  it('empilha até o limite do item e abre pilha nova', () => {
    const c = new ItemContainer('t', 't', 100);
    expect(c.add('agua', 6)).toBe(6);
    expect(c.stacks.map((s) => s.count)).toEqual([4, 2]);
    expect(c.add('agua', 1)).toBe(1);
    expect(c.stacks.map((s) => s.count)).toEqual([4, 3]);
    expect(c.countOf('agua')).toBe(7);
  });

  it('limita pelo peso e soma sem erro de arredondamento', () => {
    const c = new ItemContainer('t', 't', 1);
    expect(c.add('peDeCabra', 1)).toBe(0);
    expect(c.add('atadura', 3)).toBe(3);
    expect(c.weight).toBe(0.15);
    expect(c.room('agua')).toBe(1);
    expect(c.add('agua', 5)).toBe(1);
  });

  it('retira de uma pilha e remove a pilha vazia', () => {
    const c = new ItemContainer('t', 't', 10);
    c.add('pregos', 10);
    expect(c.take(0, 4)).toEqual({ defId: 'pregos', count: 4 });
    expect(c.take(0, 99)).toEqual({ defId: 'pregos', count: 6 });
    expect(c.isEmpty).toBe(true);
    expect(c.take(0, 1)).toBeNull();
  });

  it('save: volta igual e ignora item que não existe mais', () => {
    const c = new ItemContainer('t', 't', 10);
    c.add('feijao', 2);
    c.add('faca', 1);
    const save = c.serialize();
    const d = new ItemContainer('t', 't', 10);
    d.restore({ ...save, stacks: [...save.stacks, { defId: 'item-removido', count: 3 }] });
    expect(d.stacks).toEqual(c.stacks);
  });

  it('todo item do catálogo tem peso, pilha e ícone', () => {
    for (const id of allItemIds()) {
      const d = itemDef(id)!;
      expect(d.weight).toBeGreaterThan(0);
      expect(d.stack).toBeGreaterThanOrEqual(1);
      expect(d.icon).toBe(`item.${id}`);
    }
    expect(formatKg(0.55)).toBe('0,55 kg');
  });
});

// ------------------------------------------------------------------ estado do mundo

function starterWorld() {
  const map = buildStarterDistrict();
  const model = new WorldModel(map);
  const state = new WorldState(model);
  return { map, model, state };
}

const shelterDoor = (map: MapData): DoorPlacement => map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior)!;

describe('WorldState: portas', () => {
  it('estado inicial determinístico e abrigo fechado', () => {
    const a = starterWorld();
    const b = starterWorld();
    for (const d of a.map.doors) expect(a.state.doorState(d.id)).toEqual(b.state.doorState(d.id));
    for (const d of a.map.doors.filter((x) => x.buildingId === 'abrigo')) expect(a.state.doorState(d.id)!.open).toBe(false);
    const open = a.map.doors.filter((d) => a.state.doorState(d.id)!.open).length;
    expect(open).toBeGreaterThan(0);
    expect(open).toBeLessThan(a.map.doors.length);
  });

  it('porta fechada bloqueia a rota e a visão; aberta libera', () => {
    const { map, model, state } = starterWorld();
    const d = shelterDoor(map);
    const pf = new Pathfinder(model.nav);
    const out = { x: d.x, y: d.y + 3 * 64 };
    expect(pf.find(map.spawn.x, map.spawn.y, out.x, out.y, { maxExpanded: 20000 }).found).toBe(false);
    expect(model.sight.hasLineOfSight(d.x, d.y - 40, d.x, d.y + 40)).toBe(false);
    expect(state.setDoorOpen(d.id, true)).toBe(true);
    expect(pf.find(map.spawn.x, map.spawn.y, out.x, out.y, { maxExpanded: 20000 }).found).toBe(true);
    expect(model.sight.hasLineOfSight(d.x, d.y - 40, d.x, d.y + 40)).toBe(true);
    expect(state.setDoorOpen(d.id, false)).toBe(true);
    expect(pf.find(map.spawn.x, map.spawn.y, out.x, out.y, { maxExpanded: 20000 }).found).toBe(false);
  });

  it('porta de vidro fechada barra a passagem mas não a visão', () => {
    const { map, model, state } = starterWorld();
    const d = map.doors.find((x) => x.material === 'glass')!;
    state.setDoorOpen(d.id, false);
    const [a, b] = d.vertical ? [{ x: d.x - 40, y: d.y }, { x: d.x + 40, y: d.y }] : [{ x: d.x, y: d.y - 40 }, { x: d.x, y: d.y + 40 }];
    expect(model.sight.hasLineOfSight(a.x, a.y, b.x, b.y)).toBe(true);
    const cell = model.nav.cellOf(d.x, d.y);
    expect(model.nav.isBlocked(cell.cx, cell.cy)).toBe(true);
  });

  it('trancada não abre; abrir/fechar repetido não acumula bloqueio', () => {
    const { map, model, state } = starterWorld();
    const d = shelterDoor(map);
    expect(state.setDoorLocked(d.id, true)).toBe(true);
    expect(state.setDoorOpen(d.id, true)).toBe(false);
    state.setDoorLocked(d.id, false);
    for (let i = 0; i < 5; i++) {
      state.setDoorOpen(d.id, true);
      state.setDoorOpen(d.id, false);
    }
    state.setDoorOpen(d.id, true);
    const cell = model.nav.cellOf(d.x, d.y);
    expect(model.nav.isBlocked(cell.cx, cell.cy)).toBe(false);
  });

  it('save guarda só o que mudou e restaura num mundo novo', () => {
    const a = starterWorld();
    const d = shelterDoor(a.map);
    expect(a.state.serialize().doors).toEqual({});
    a.state.setDoorOpen(d.id, true);
    const other = a.map.doors.find((x) => x.id !== d.id && !a.state.doorState(x.id)!.open)!;
    a.state.setDoorLocked(other.id, true);
    const save = JSON.parse(JSON.stringify(a.state.serialize()));
    expect(Object.keys(save.doors).sort()).toEqual([d.id, other.id].sort());

    const b = starterWorld();
    b.state.restore(save);
    expect(b.state.doorState(d.id)).toEqual({ open: true, locked: false });
    expect(b.state.doorState(other.id)).toEqual({ open: false, locked: true });
    const cell = b.model.nav.cellOf(d.x, d.y);
    expect(b.model.nav.isBlocked(cell.cx, cell.cy)).toBe(false);
  });
});

describe('WorldState: itens', () => {
  it('pegar, largar e salvar sem duplicar nem sumir', () => {
    const a = starterWorld();
    const total = a.state.itemCount;
    const water = a.map.items.find((i) => i.defId === 'agua' && i.count === 2)!;
    expect(a.state.takeItem(water.id, 1)).toEqual({ defId: 'agua', count: 1 });
    expect(a.state.itemById(water.id)!.count).toBe(1);
    const dropped = a.state.dropItem('faca', 1, 1000, 1000)!;
    expect(a.state.itemCount).toBe(total + 1);
    expect(a.state.itemsNear(1000, 1000, 10).map((i) => i.id)).toEqual([dropped.id]);
    const knife = a.map.items.find((i) => i.defId === 'faca')!;
    a.state.takeItem(knife.id);
    expect(a.state.itemById(knife.id)).toBeNull();

    const save = JSON.parse(JSON.stringify(a.state.serialize()));
    const b = starterWorld();
    b.state.restore(save);
    expect(b.state.itemCount).toBe(a.state.itemCount);
    expect(b.state.itemById(water.id)!.count).toBe(1);
    expect(b.state.itemById(knife.id)).toBeNull();
    expect(b.state.itemById(dropped.id)).toMatchObject({ defId: 'faca', x: 1000, y: 1000 });
    // restaurar de novo não duplica
    b.state.restore(save);
    expect(b.state.itemCount).toBe(a.state.itemCount);
    // o próximo item largado não reaproveita id
    expect(b.state.dropItem('faca', 1, 0, 0)!.id).not.toBe(dropped.id);
  });

  it('avisa quem desenha o chunk que mudou', () => {
    const { state } = starterWorld();
    const seen: string[] = [];
    state.onChange((c) => seen.push(c.type));
    state.dropItem('agua', 1, 500, 500);
    expect(seen).toEqual(['items']);
  });
});

// ------------------------------------------------------------------ interação

function interactionWorld() {
  const w = starterWorld();
  const bus = new EventBus();
  const inv = new PlayerInventory();
  const noises: { radius: number; source: string }[] = [];
  bus.on('world:noise', (n) => noises.push(n));
  const player: Interactor & Body = { x: w.map.spawn.x, y: w.map.spawn.y, radius: R, facing: Math.PI / 2 };
  const items = new ItemInteractions(w.state, inv);
  const sys = new InteractionSystem([new DoorInteractions(w.state, bus, () => [player]), items]);
  return { ...w, bus, inv, noises, player, items, sys };
}

describe('InteractionSystem', () => {
  it('nada ao alcance no ponto de nascimento; perto da porta: ABRIR → FECHAR, com barulho', () => {
    const t = interactionWorld();
    expect(t.sys.scan(t.player)).toBeNull();
    const d = shelterDoor(t.map);
    t.player.x = d.x;
    t.player.y = d.y - 7 - R - 20;
    const target = t.sys.scan(t.player)!;
    expect(target.kind).toBe('door');
    expect(target.verb).toBe('ABRIR');
    expect(t.sys.perform(t.player)!.ok).toBe(true);
    expect(t.state.doorState(d.id)!.open).toBe(true);
    expect(t.noises.length).toBe(1);
    expect(t.sys.current!.verb).toBe('FECHAR');
  });

  it('não fecha com alguém no vão', () => {
    const t = interactionWorld();
    const d = shelterDoor(t.map);
    t.state.setDoorOpen(d.id, true);
    t.player.x = d.x;
    t.player.y = d.y;
    t.sys.scan(t.player);
    const r = t.sys.perform(t.player)!;
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/caminho/);
    expect(t.state.doorState(d.id)!.open).toBe(true);
  });

  it('trancada: avisa, não abre, faz um barulho menor', () => {
    const t = interactionWorld();
    const d = shelterDoor(t.map);
    t.state.setDoorLocked(d.id, true);
    t.player.x = d.x;
    t.player.y = d.y - 40;
    const target = t.sys.scan(t.player)!;
    expect(target.enabled).toBe(false);
    expect(target.verb).toBe('TRANCADA');
    expect(t.sys.perform(t.player)!.message).toBe('Trancada.');
    expect(t.state.doorState(d.id)!.open).toBe(false);
    expect(t.noises[0]!.source).toBe('maçaneta');
  });

  it('pega item ao alcance e respeita o peso; larga aos pés', () => {
    const t = interactionWorld();
    const hammer = t.map.items.find((i) => i.defId === 'martelo')!;
    t.player.x = hammer.x + 10;
    t.player.y = hammer.y - 40;
    const target = t.sys.scan(t.player)!;
    expect(target.kind).toBe('item');
    expect(target.label).toBe('Pegar Martelo');
    expect(t.sys.perform(t.player)!.ok).toBe(true);
    expect(t.inv.carried.countOf('martelo')).toBe(1);
    expect(t.state.itemById(hammer.id)).toBeNull();

    // Largar e pegar de novo: mesmo item, nada duplica.
    const before = t.state.itemCount;
    const r = t.items.drop(t.inv.carried, 0, 1, t.player.x, t.player.y);
    expect(r.ok).toBe(true);
    expect(t.inv.carried.isEmpty).toBe(true);
    expect(t.state.itemCount).toBe(before + 1);
    t.sys.scan(t.player);
    expect(t.sys.current!.label).toBe('Pegar Martelo');
    t.sys.perform(t.player);
    expect(t.inv.carried.countOf('martelo')).toBe(1);
    expect(t.state.itemCount).toBe(before);
  });

  it('pesado demais não entra e o item fica no chão', () => {
    const t = interactionWorld();
    t.inv.carried.capacity = 0.1;
    const hammer = t.map.items.find((i) => i.defId === 'martelo')!;
    t.player.x = hammer.x + 10;
    t.player.y = hammer.y - 40;
    t.sys.scan(t.player);
    const r = t.sys.perform(t.player)!;
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Pesado/);
    expect(t.state.itemById(hammer.id)).not.toBeNull();
  });

  it('não pega item do outro lado da parede', () => {
    const t = interactionWorld();
    const d = shelterDoor(t.map);
    const outside = t.state.dropItem('agua', 1, d.x - 128, d.y + 30)!; // do lado de fora, rente à parede
    t.player.x = d.x - 128;
    t.player.y = d.y - 30; // do lado de dentro
    t.sys.scan(t.player);
    expect(t.sys.current?.key).not.toBe(`item:${outside.id}`);
    // do mesmo lado, pega
    t.player.y = d.y + 70;
    t.sys.scan(t.player);
    expect(t.sys.current?.key).toBe(`item:${outside.id}`);
  });

  it('inventário do jogador: save e aviso de mudança', () => {
    const inv = new PlayerInventory();
    let changes = 0;
    inv.onChange(() => changes++);
    inv.add('agua', 2);
    inv.add('martelo', 1);
    expect(changes).toBe(2);
    const save = JSON.parse(JSON.stringify(inv.serialize()));
    const other = new PlayerInventory();
    other.restore(save);
    expect(other.carried.stacks).toEqual(inv.carried.stacks);
    expect(other.weight).toBeCloseTo(0.55 * 2 + 0.8, 5);
  });
});
