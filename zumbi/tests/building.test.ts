import { describe, expect, it } from 'vitest';
import { BuildSystem } from '../src/game/build/BuildSystem';
import { cropStage, harvest, plant, tickPlot, waterPlot } from '../src/game/build/Farm';
import { placementFor, rectOf, sizeOf } from '../src/game/build/StructureGeometry';
import { addCut, MIN_REMNANT, piecesOf, wallId } from '../src/game/build/WallCuts';
import { CraftService } from '../src/game/crafting/CraftService';
import { RECIPE_BY_ID } from '../src/game/crafting/Recipes';
import { DemolishInteractions } from '../src/game/interaction/DemolishInteractions';
import type { InteractionCandidate } from '../src/game/interaction/InteractionSystem';
import { StructureInteractions } from '../src/game/interaction/StructureInteractions';
import { WindowInteractions, type WorldActionHooks } from '../src/game/interaction/ToolInteractions';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import type { TimedActionSpec } from '../src/game/sim/Actions';
import { WorldState } from '../src/game/sim/WorldState';
import { Survivor } from '../src/game/survival/Survivor';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { Ground } from '../src/game/world/MapTypes';
import { WorldModel } from '../src/game/world/WorldModel';

function setup() {
  const model = new WorldModel(buildStarterDistrict());
  const state = new WorldState(model);
  const inv = new PlayerInventory(500);
  const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = v; } };
  const sv = new Survivor(stats, inv);
  const started: TimedActionSpec[] = [];
  let pos = { x: 0, y: 0, facing: 0 };
  let minutes = 1000;
  const cs = new CraftService(state, inv, sv, {
    start: (s) => started.push(s),
    drop: () => undefined,
    where: () => pos,
    minutes: () => minutes,
    days: () => minutes / 1440,
    gasOn: () => true,
  });
  const hooks: WorldActionHooks = { start: (s) => started.push(s), drop: () => undefined, noise: () => undefined, moveTo: () => undefined, now: () => minutes / 1440, rng: () => 0.5 };
  const finish = () => started.at(-1)!.done();
  /** Um tile de grama livre, longe de tudo (para testes de encaixe). */
  const freeTile = (need = 2) => {
    const m = model.map;
    for (let ty = 2; ty < m.heightTiles - 2; ty++) {
      for (let tx = 2; tx < m.widthTiles - 2; tx++) {
        let ok = true;
        for (let dy = -need; dy <= need && ok; dy++)
          for (let dx = -need; dx <= need && ok; dx++) {
            const g = m.ground[(ty + dy) * m.widthTiles + tx + dx];
            const x = (tx + dx) * 64 + 32;
            const y = (ty + dy) * 64 + 32;
            if ((g !== Ground.Grass && g !== Ground.GrassDark && g !== Ground.Dirt) || !model.nav.isWalkableAt(x - 30, y - 30) || !model.nav.isWalkableAt(x + 30, y + 30) || !model.nav.isWalkableAt(x, y)) ok = false;
          }
        if (ok && !state.coveredAt(tx * 64 + 32, ty * 64 + 32)) return { tx, ty, x: tx * 64 + 32, y: ty * 64 + 32 };
      }
    }
    throw new Error('sem tile livre');
  };
  return { model, state, inv, sv, cs, hooks, started, finish, freeTile, setPos: (p: typeof pos) => (pos = p), setMinutes: (m: number) => (minutes = m) };
}

describe('encaixe das peças', () => {
  it('parede vai na borda do tile para onde o jogador olha', () => {
    // Olhando para leste, no tile (3, 5): parede em pé na borda x = 4 tiles.
    const p = placementFor('paredeMadeira', 3 * 64 + 20, 5 * 64 + 40, 0);
    expect(p).toEqual({ x: 4 * 64, y: 5 * 64 + 32, rot: 1 });
    // Olhando para o norte: parede deitada na borda de cima.
    const n = placementFor('paredeMadeira', 3 * 64 + 20, 5 * 64 + 40, -Math.PI / 2);
    expect(n).toEqual({ x: 3 * 64 + 32, y: 5 * 64, rot: 0 });
    expect(sizeOf('paredeMadeira', 1)).toEqual({ w: 12, h: 64 });
  });

  it('móvel ocupa os tiles à frente; girar troca o comprido', () => {
    const a = placementFor('mesaMadeira', 3 * 64 + 32, 5 * 64 + 32, Math.PI / 2, 0);
    // Para o sul, 2×1: tiles (3..4, 6).
    expect(a).toEqual({ x: 4 * 64, y: 6 * 64 + 32, rot: 0 });
    const b = placementFor('mesaMadeira', 3 * 64 + 32, 5 * 64 + 32, Math.PI / 2, 1);
    expect(b).toEqual({ x: 3 * 64 + 32, y: 7 * 64, rot: 1 });
  });
});

describe('construir no mundo', () => {
  it('parede construída bloqueia zumbi (navegação) e visão; desmontar libera', () => {
    const t = setup();
    const f = t.freeTile();
    const s = t.state.structures.add('paredeMadeira', f.x + 32, f.y, 1);
    expect(t.model.nav.isWalkableAt(f.x + 32, f.y)).toBe(false);
    expect(t.model.sight.hasLineOfSight(f.x - 40, f.y, f.x + 100, f.y)).toBe(false);
    t.state.removeStructure(s.id);
    expect(t.model.nav.isWalkableAt(f.x + 32, f.y)).toBe(true);
    expect(t.model.sight.hasLineOfSight(f.x - 40, f.y, f.x + 100, f.y)).toBe(true);
  });

  it('porta construída: fechada bloqueia, aberta passa', () => {
    const t = setup();
    const f = t.freeTile();
    const door = t.state.structures.add('portaMadeira', f.x + 32, f.y, 1);
    expect(t.model.nav.isWalkableAt(f.x + 32, f.y)).toBe(false);
    const si = new StructureInteractions(t.state, t.inv, t.sv, { start: () => undefined, minutes: () => 0, openCraft: () => undefined });
    const out: InteractionCandidate[] = [];
    si.collect({ x: f.x, y: f.y, radius: 15, facing: 0 }, out);
    const c = out.find((x) => x.target.key === `estrutura:${door.id}`)!;
    expect(c.target.label).toMatch(/Abrir/);
    c.perform();
    expect(door.open).toBe(1);
    expect(t.model.nav.isWalkableAt(f.x + 32, f.y)).toBe(true);
  });

  it('modo construir: lugar ruim explica; com material monta onde a prévia mostrou', () => {
    const t = setup();
    const f = t.freeTile();
    t.setPos({ x: f.x, y: f.y, facing: 0 });
    const pv = t.cs.preview('paredeMadeira')!;
    expect(pv.ok).toBe(false);
    expect(pv.reason).toMatch(/Falta/);
    t.inv.add('tabua', 3);
    t.inv.add('pregos', 6);
    t.inv.add('martelo', 1);
    expect(t.cs.preview('paredeMadeira')!.ok).toBe(true);
    expect(t.cs.start('paredeMadeira')).toBeNull();
    // Virou durante a ação: a peça vai onde foi escolhida no começo.
    t.setPos({ x: f.x, y: f.y, facing: Math.PI });
    const r = t.finish() as { ok: boolean };
    expect(r.ok).toBe(true);
    const wall = [...t.state.structures.list('paredeMadeira')][0]!;
    expect(wall.x).toBe((f.tx + 1) * 64);
    expect(t.inv.countOf('tabua')).toBe(0);
    // Mesmo lugar de novo: ocupado.
    t.setPos({ x: f.x, y: f.y, facing: 0 });
    expect(t.cs.canPlace('paredeMadeira')).toMatch(/Já tem/);
  });

  it('fecha um cômodo: quatro paredes em volta do tile (cantos se encontram)', () => {
    const t = setup();
    const f = t.freeTile();
    t.setPos({ x: f.x, y: f.y, facing: 0 });
    for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      t.setPos({ x: f.x, y: f.y, facing });
      expect(t.cs.canPlace('paredeMadeira'), `olhando ${facing}`).toBeNull();
      const p = t.cs.spot('paredeMadeira');
      t.state.structures.add('paredeMadeira', p.x, p.y, p.rot);
    }
    // Preso: não dá para sair por nenhum lado (a navegação vê o cômodo fechado).
    for (const [dx, dy] of [[40, 0], [-40, 0], [0, 40], [0, -40]] as const) expect(t.model.sight.hasLineOfSight(f.x, f.y, f.x + dx * 2, f.y + dy * 2)).toBe(false);
  });

  it('telhado cobre (abriga da chuva); fogueira não pode embaixo', () => {
    const t = setup();
    const f = t.freeTile();
    t.state.structures.add('telhado', f.x + 64, f.y, 0);
    expect(t.state.coveredAt(f.x + 64, f.y)).toBe(true);
    t.setPos({ x: f.x, y: f.y, facing: 0 });
    expect(t.cs.canPlaceAt('fogueira', { x: f.x + 64, y: f.y, rot: 0 })).toMatch(/ar livre/);
    expect(t.cs.canPlaceAt('telhado', { x: f.x + 64, y: f.y, rot: 0 })).toMatch(/coberto/);
  });

  it('canteiro só na terra/grama; bancada construída vira estação', () => {
    const t = setup();
    const road = t.model.map.ground.findIndex((g) => g === Ground.Asphalt);
    const rx = (road % t.model.map.widthTiles) * 64 + 32;
    const ry = Math.floor(road / t.model.map.widthTiles) * 64 + 32;
    expect(t.cs.canPlaceAt('canteiro', { x: rx, y: ry, rot: 0 })).toMatch(/grama/);
    const f = t.freeTile();
    t.setPos({ x: f.x, y: f.y, facing: 0 });
    expect(t.cs.stations().has('bancada')).toBe(false);
    t.state.structures.add('bancadaMadeira', f.x + 96, f.y, 0);
    expect(t.cs.stations().has('bancada')).toBe(true);
  });

  it('caixote construído guarda coisas e o save lembra (peça e conteúdo)', () => {
    const t = setup();
    const f = t.freeTile();
    const box = t.state.structures.add('caixote', f.x + 64, f.y, 0);
    const c = t.state.openContainer(box.id)!;
    expect(c.capacity).toBe(40);
    c.add('tabua', 3);
    t.state.containerChanged(box.id);
    const save = JSON.parse(JSON.stringify(t.state.serialize()));
    const again = new WorldState(new WorldModel(buildStarterDistrict()));
    again.restore(save);
    expect(again.structures.get(box.id)?.type).toBe('caixote');
    expect(again.loot.peek(box.id)?.countOf('tabua')).toBe(3);
    expect(again.model.nav.isWalkableAt(f.x + 64, f.y)).toBe(false);
    // Destruído: o conteúdo cai no chão.
    again.removeStructure(box.id);
    expect(again.itemsNear(f.x + 64, f.y, 10).some((i) => i.defId === 'tabua')).toBe(true);
  });

  it('desmontar com martelo devolve material', () => {
    const t = setup();
    const f = t.freeTile();
    const s = t.state.structures.add('cadeiraMadeira', f.x + 64, f.y, 0);
    t.inv.add('martelo', 1);
    t.inv.equipHand(t.inv.carried, t.inv.carried.stacks.findIndex((x) => x.defId === 'martelo'));
    const si = new StructureInteractions(t.state, t.inv, t.sv, { start: (x) => t.started.push(x), minutes: () => 0, openCraft: () => undefined });
    const out: InteractionCandidate[] = [];
    si.collect({ x: f.x, y: f.y, radius: 15, facing: 0 }, out);
    const c = out.find((x) => x.target.key === `estrutura:${s.id}`)!;
    c.more!().find((o) => o.label.startsWith('Desmontar'))!.perform();
    t.finish();
    expect(t.state.structures.get(s.id)).toBeNull();
    expect(t.inv.countOf('tabua')).toBe(1);
  });
});

describe('derrubar parede do mapa e pregar tábuas', () => {
  it('vão de 1 tile: sobra fininha some junto, pedaços certos', () => {
    const w = { kind: 'wall' as const, x: 100, y: 500, w: 300, h: 14 };
    const cuts = addCut([], 150, 300);
    expect(cuts).toEqual([[118, 182]]);
    expect(piecesOf(w, cuts)).toEqual([
      { x: 100, y: 500, w: 118, h: 14 },
      { x: 282, y: 500, w: 118, h: 14 },
    ]);
    // Perto da ponta: não deixa fiapo.
    const end = addCut([], 290, 300);
    expect(end[0]![1]).toBe(300);
    const near = addCut(cuts, 150 + 64 + MIN_REMNANT - 5, 300);
    expect(near.length).toBe(1);
  });

  it('com marreta na mão: derruba, libera passagem e o save guarda o vão', () => {
    const t = setup();
    // Um ponto de parede comprida que só ela bloqueia (sem móvel encostado dos dois lados).
    let i = -1;
    let cx = 0;
    let cy = 0;
    let horiz = true;
    for (let k = 0; k < t.model.map.walls.length && i < 0; k++) {
      const w = t.model.map.walls[k]!;
      if (w.kind !== 'wall' || Math.max(w.w, w.h) < 150) continue;
      const hz = w.w >= w.h;
      t.model.nav.removeSolid({ ...w, kind: 'rect' });
      for (let a = 60; a < Math.max(w.w, w.h) - 60; a += 16) {
        const x = hz ? w.x + a : w.x + w.w / 2;
        const y = hz ? w.y + w.h / 2 : w.y + a;
        const free = [-6, 6].every((o) => t.model.nav.isWalkableAt(hz ? x : x + o, hz ? y + o : y));
        if (free) {
          i = k;
          cx = x;
          cy = y;
          horiz = hz;
          break;
        }
      }
      t.model.nav.addSolid({ ...w, kind: 'rect' });
    }
    const w = t.model.map.walls[i]!;
    expect(w).toBeDefined();
    expect(t.model.nav.isWalkableAt(cx, cy)).toBe(false);
    const who = { x: horiz ? cx : cx - 30, y: horiz ? cy - 30 : cy, radius: 15, facing: 0 };
    const di = new DemolishInteractions(t.state, t.inv, t.sv, t.hooks);
    let out: InteractionCandidate[] = [];
    di.collect(who, out);
    expect(out.length).toBe(0);
    t.inv.add('marreta', 1);
    t.inv.equipHand(t.inv.carried, t.inv.carried.stacks.findIndex((x) => x.defId === 'marreta'));
    out = [];
    di.collect(who, out);
    const c = out.find((x) => x.target.key.startsWith(`parede:${wallId(w)}:`))!;
    c.perform();
    const r = t.finish() as { ok: boolean; message?: string };
    expect(r.message).toMatch(/aberta/);
    for (const o of [-6, 6]) expect(t.model.nav.isWalkableAt(horiz ? cx : cx + o, horiz ? cy + o : cy)).toBe(true);
    expect(t.inv.countOf('tijolo')).toBe(3);
    expect(t.state.wallPieces(i).length).toBeGreaterThanOrEqual(1);
    const again = new WorldState(new WorldModel(buildStarterDistrict()));
    again.restore(JSON.parse(JSON.stringify(t.state.serialize())));
    expect(again.model.nav.isWalkableAt(horiz ? cx : cx + 6, horiz ? cy + 6 : cy)).toBe(true);
    expect(again.wallPieces(i)).toEqual(t.state.wallPieces(i));
  });

  it('pregar tábuas na janela: vira barricada; não dá mais para pular', () => {
    const t = setup();
    const w = t.state.windowsNear(t.model.map.spawn.x, t.model.map.spawn.y, 4000)[0]!;
    t.state.breakWindow(w.wall);
    const wi = new WindowInteractions(t.state, t.inv, t.sv, t.hooks);
    const cx = w.wall.x + w.wall.w / 2;
    const cy = w.wall.y + w.wall.h / 2;
    const who = { x: cx + (w.wall.h > w.wall.w ? 25 : 0), y: cy + (w.wall.h > w.wall.w ? 0 : 25), radius: 15, facing: 0 };
    t.inv.add('tabua', 2);
    t.inv.add('pregos', 4);
    t.inv.add('martelo', 1);
    let out: InteractionCandidate[] = [];
    wi.collect(who, out);
    const c = out.find((x) => x.target.key === `janela:${w.id}`)!;
    c.more!().find((o) => o.label.startsWith('Pregar'))!.perform();
    t.finish();
    expect(t.state.boardedOn(w.id)).not.toBeNull();
    expect(t.inv.countOf('tabua')).toBe(0);
    out = [];
    wi.collect(who, out);
    const again = out.find((x) => x.target.key === `janela:${w.id}`)!;
    expect(again.target.label).toMatch(/Arrancar/);
    expect(again.more!().some((o) => o.label.startsWith('Pular'))).toBe(false);
  });
});

describe('horta e coletor', () => {
  it('planta cresce com água, seca sem, colhe madura', () => {
    const t = setup();
    const f = t.freeTile();
    const s = t.state.structures.add('canteiro', f.x, f.y, 0);
    expect(plant(s, 'sementeTomate', 0)).toBe(true);
    expect(cropStage(s, 0)).toBe('broto');
    // Regada todo dia: 15 dias com velocidade 4 (60 dias / 4).
    for (let d = 1; d <= 15; d++) {
      waterPlot(s, d * 1440 - 10);
      tickPlot(s, d * 1440, 0, 22, 4);
    }
    expect(cropStage(s, 0)).toBe('madura');
    const got = harvest(s, () => 0);
    expect(got.find((x) => x.id === 'tomate')?.n).toBe(6);
    expect(got.find((x) => x.id === 'sementeTomate')?.n).toBeGreaterThanOrEqual(1);
    expect(s.crop).toBeUndefined();
  });

  it('sem água morre; chuva rega', () => {
    const t = setup();
    const f = t.freeTile();
    const s = t.state.structures.add('canteiro', f.x, f.y, 0);
    plant(s, 'sementeAlface', 0);
    tickPlot(s, 3 * 1440, 0, 22, 4);
    const g = s.crop!.growth;
    expect(g).toBeLessThan(3 * 4);
    tickPlot(s, 6 * 1440, 0, 22, 4);
    expect(cropStage(s, 0)).toBe('morta');
    const s2 = t.state.structures.add('canteiro', f.x + 64, f.y, 0);
    plant(s2, 'sementeAlface', 0);
    tickPlot(s2, 1440, 0.8, 22, 4);
    expect(s2.crop!.watered).toBe(1440);
  });

  it('coletor junta chuva ao ar livre (água suja)', () => {
    const t = setup();
    const f = t.freeTile();
    const c = t.state.structures.add('coletorChuva', f.x, f.y, 0);
    const bs = new BuildSystem(t.state, () => false, 4);
    bs.tick(0, 0, 20);
    bs.tick(120, 1, 20);
    expect(c.water).toBeGreaterThan(15);
    expect(c.dirty).toBe(1);
    expect(rectOf(c).w).toBe(64);
  });

  it('receitas de construção pedem o material certo', () => {
    const r = RECIPE_BY_ID.get('paredeTijolo')!;
    expect(r.structure).toBe('paredeTijolo');
    expect(r.inputs.some((i) => i.opts.some((o) => o.id === 'cimento' && o.charge))).toBe(true);
  });
});
