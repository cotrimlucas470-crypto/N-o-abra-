import { describe, expect, it } from 'vitest';
import { Health } from '../src/game/health/Health';
import { NoiseSystem } from '../src/game/sim/Noise';
import { WorldState } from '../src/game/sim/WorldState';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';
import { FlowField } from '../src/game/world/nav/FlowField';
import { circleHitsSolid } from '../src/game/world/collision';
import { resolveAttack, type PlayerDefense } from '../src/game/zombies/Assault';
import { difficultyFrom, ZOMBIE_PRESETS } from '../src/game/zombies/Difficulty';
import { generatePopulation } from '../src/game/zombies/Population';
import { sightRate, type LightEnv, type PlayerSense } from '../src/game/zombies/Senses';
import { hitZombie } from '../src/game/zombies/Wounding';
import { canGrab, isCrawler, type Zombie } from '../src/game/zombies/Zombie';
import { createZombie } from '../src/game/zombies/ZombieFactory';
import { ZombieStore } from '../src/game/zombies/ZombieStore';
import { ZombieSystem } from '../src/game/zombies/ZombieSystem';
import { bodyRadius } from '../src/game/zombies/ZombieMotion';
import { physicalEffects } from '../src/game/survival/Effects';
import { Body } from '../src/game/survival/Body';
import { ZOMBIE_TUNING } from '../src/game/config/ZombieTuning';

const DIFF = difficultyFrom(ZOMBIE_PRESETS.sobrevivencia.settings);
const DAY: LightEnv = { ambient: 1, beam: null, glow: 0, rain: 0, fog: 0 };
const NIGHT: LightEnv = { ambient: 0.05, beam: null, glow: 0, rain: 0, fog: 0 };

function seeded(seed = 7): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function player(x: number, y: number, extra: Partial<PlayerSense> = {}): PlayerSense {
  return { x, y, floor: 0, vx: 0, vy: 0, radius: 15, posture: 'andando', inVehicle: false, alive: true, down: false, ...extra };
}

function world() {
  const model = new WorldModel(buildStarterDistrict());
  const state = new WorldState(model);
  const noise = new NoiseSystem(model.sight, () => ({ rain: 0, wind: 0 }), seeded(3));
  const attacks: string[] = [];
  const sys = new ZombieSystem(model, state, noise, DIFF, {
    attack: (_z, kind) => {
      attacks.push(kind);
      return { kind, landed: true, text: kind, tone: 'warn' };
    },
    noise: (x, y, kind, radius, source) => noise.emit(x, y, kind, { ...(radius ? { radius } : {}), ...(source ? { source } : {}) }),
  }, seeded(11));
  return { model, state, noise, sys, attacks };
}

/** Ponto livre com uma faixa livre para a direita (x-80 … x+ahead, y±side) e visão livre. */
function openSpot(model: WorldModel, ahead = 300, side = 70): { x: number; y: number } {
  const map = model.map;
  for (let y = 200; y < map.heightTiles * 64 - 200; y += 32) {
    for (let x = 200; x < map.widthTiles * 64 - ahead - 100; x += 32) {
      let ok = true;
      for (let dy = -side; dy <= side && ok; dy += 16) for (let dx = -80; dx <= ahead && ok; dx += 16) if (!model.nav.isWalkableAt(x + dx, y + dy)) ok = false;
      if (ok && model.sight.hasLineOfSight(x, y, x + ahead, y)) return { x, y };
    }
  }
  throw new Error('sem área aberta');
}

function zombieAt(sys: ZombieSystem, x: number, y: number, seed = 5, patch: (z: Zombie) => void = () => undefined): Zombie {
  const z = createZombie({ id: `t${seed}`, seed, arch: 'morador', x, y, collapseDays: 0 }, DIFF);
  // Teste previsível: inteiro, anda normal.
  for (const k of Object.keys(z.parts) as (keyof typeof z.parts)[]) z.parts[k] = 1;
  patch(z);
  sys.add(z);
  return z;
}

function run(sys: ZombieSystem, p: PlayerSense, seconds: number, light = DAY, each?: () => void): void {
  const dt = 1 / 30;
  for (let t = 0; t < seconds; t += dt) {
    sys.update({ dt, player: p, light });
    each?.();
  }
}

describe('zumbi: indivíduo', () => {
  it('mesma semente = mesma pessoa; sementes diferentes variam', () => {
    const a = createZombie({ id: 'a', seed: 42, arch: 'morador', x: 0, y: 0, collapseDays: 3 }, DIFF);
    const b = createZombie({ id: 'a', seed: 42, arch: 'morador', x: 0, y: 0, collapseDays: 3 }, DIFF);
    expect(JSON.stringify(a.look)).toBe(JSON.stringify(b.look));
    expect(a.traits).toEqual(b.traits);
    const looks = new Set<string>();
    for (let i = 0; i < 40; i++) looks.add(JSON.stringify(createZombie({ id: 'x', seed: i, arch: 'cliente', x: 0, y: 0, collapseDays: 0 }, DIFF).look));
    expect(looks.size).toBe(40);
  });

  it('policial usa colete (proteção no tronco); idoso é lento e quase nunca corre', () => {
    let vest = 0;
    let oldSprint = 0;
    let oldWalk = 0;
    let youngWalk = 0;
    for (let i = 0; i < 200; i++) {
      const p = createZombie({ id: 'p', seed: i, arch: 'policial', x: 0, y: 0, collapseDays: 0 }, DIFF);
      if (p.look.vest === 'balistico') {
        vest++;
        expect(p.look.armor.tronco).toBeGreaterThan(0.5);
      }
      const o = createZombie({ id: 'o', seed: i, arch: 'idoso', x: 0, y: 0, collapseDays: 0 }, DIFF);
      if (o.traits.sprint > 0) oldSprint++;
      oldWalk += o.traits.walk;
      youngWalk += createZombie({ id: 'e', seed: i, arch: 'estudante', x: 0, y: 0, collapseDays: 0 }, DIFF).traits.walk;
    }
    expect(vest).toBeGreaterThan(130);
    expect(oldSprint).toBeLessThan(3);
    expect(oldWalk).toBeLessThan(youngWalk);
  });

  it('corredores são raros no padrão e mais comuns no Extinção', () => {
    const ext = difficultyFrom(ZOMBIE_PRESETS.extincao.settings);
    let normal = 0;
    let hard = 0;
    for (let i = 0; i < 600; i++) {
      if (createZombie({ id: 'c', seed: i, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, DIFF).traits.sprint > 0) normal++;
      if (createZombie({ id: 'c', seed: i, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, ext).traits.sprint > 0) hard++;
    }
    expect(normal).toBeGreaterThan(3);
    expect(normal).toBeLessThan(80);
    expect(hard).toBeGreaterThan(normal * 2);
  });
});

describe('zumbi: corpo por partes (sem barra de vida)', () => {
  it('cabeça destruída mata; golpes no tronco demoram muito mais', () => {
    const z = createZombie({ id: 'h', seed: 1, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, DIFF);
    const r = hitZombie(z, { kind: 'impacto', damage: 60, dir: 0, part: 'cabeca' }, 0, seeded());
    expect(r.killed).toBe(true);
    const t = createZombie({ id: 't', seed: 1, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, DIFF);
    const r2 = hitZombie(t, { kind: 'impacto', damage: 60, dir: 0, part: 'tronco' }, 0, seeded());
    expect(r2.killed).toBe(false);
  });

  it('perna destruída faz rastejar; braço destruído tira o agarrão daquele lado', () => {
    const z = createZombie({ id: 'l', seed: 2, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, DIFF);
    for (const k of Object.keys(z.parts) as (keyof typeof z.parts)[]) z.parts[k] = 1;
    hitZombie(z, { kind: 'corte', damage: 200, dir: 0, part: 'pernaE' }, 0, seeded());
    expect(isCrawler(z)).toBe(true);
    expect(canGrab(z)).toBe(false);
    const a = createZombie({ id: 'b', seed: 3, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, DIFF);
    for (const k of Object.keys(a.parts) as (keyof typeof a.parts)[]) a.parts[k] = 1;
    hitZombie(a, { kind: 'corte', damage: 300, dir: 0, part: 'bracoE' }, 0, seeded());
    hitZombie(a, { kind: 'corte', damage: 300, dir: 0, part: 'bracoD' }, 0, seeded());
    expect(canGrab(a)).toBe(false);
  });

  it('capacete segura pancada na cabeça', () => {
    const plain = createZombie({ id: 'p', seed: 9, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, DIFF);
    const helm = createZombie({ id: 'm', seed: 9, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, DIFF);
    plain.parts.cabeca = 1;
    helm.parts.cabeca = 1;
    helm.look.armor.cabeca = 0.6;
    hitZombie(plain, { kind: 'impacto', damage: 10, dir: 0, part: 'cabeca' }, 0, seeded());
    hitZombie(helm, { kind: 'impacto', damage: 10, dir: 0, part: 'cabeca' }, 0, seeded());
    expect(helm.parts.cabeca).toBeGreaterThan(plain.parts.cabeca);
  });
});

describe('zumbi: população e save', () => {
  it('ninguém nasce perto do ponto de partida nem no abrigo; tudo em chão livre', () => {
    const model = new WorldModel(buildStarterDistrict());
    const spawns = generatePopulation(model.map, model.nav, { population: 1, collapseDays: 0, safe: model.map.spawn });
    expect(spawns.length).toBeGreaterThan(5);
    for (const s of spawns) {
      expect(Math.hypot(s.x - model.map.spawn.x, s.y - model.map.spawn.y)).toBeGreaterThan(ZOMBIE_TUNING.spawnSafeRadius);
      expect(model.nav.isWalkableAt(s.x, s.y)).toBe(true);
      for (const b of model.map.buildings.filter((b) => b.kind === 'shelter')) {
        const r = b.bounds;
        expect(s.x >= r.x && s.x < r.x + r.w && s.y >= r.y && s.y < r.y + r.h).toBe(false);
      }
    }
    const again = generatePopulation(model.map, model.nav, { population: 1, collapseDays: 0, safe: model.map.spawn });
    expect(again).toEqual(spawns);
    const none = generatePopulation(model.map, model.nav, { population: 0, collapseDays: 0, safe: model.map.spawn });
    expect(none.length).toBe(0);
  });

  it('save guarda posição, estado, partes e mortos; volta igual', () => {
    const store = new ZombieStore(4000, 4000);
    store.populate([
      { id: 'z0', seed: 1, arch: 'morador', x: 100, y: 100, collapseDays: 2 },
      { id: 'z1', seed: 2, arch: 'policial', x: 300, y: 200, collapseDays: 2, corpse: true },
    ], DIFF);
    const z = store.get('z0')!;
    z.x = 150;
    z.parts.pernaE = 0.25;
    z.mind.state = 'WANDER';
    z.hits.push({ part: 'bracoD', kind: 'corte' });
    const save = JSON.parse(JSON.stringify(store.serialize(2)));
    const back = new ZombieStore(4000, 4000);
    back.restore(save, DIFF, 0);
    const b = back.get('z0')!;
    expect(b.x).toBe(150);
    expect(b.parts.pernaE).toBeCloseTo(0.25, 2);
    expect(b.mind.state).toBe('WANDER');
    expect(b.look).toEqual(z.look);
    expect(b.hits).toEqual([{ part: 'bracoD', kind: 'corte' }]);
    expect(back.get('z1')!.dead).toBe(true);
  });
});

describe('zumbi: sentidos', () => {
  it('não enxerga através de parede; enxerga em campo aberto', () => {
    const { model } = world();
    const o = openSpot(model);
    const z = createZombie({ id: 's', seed: 4, arch: 'morador', x: o.x, y: o.y, collapseDays: 0 }, DIFF);
    z.facing = 0;
    expect(sightRate(z, player(o.x + 200, o.y), DAY, model.sight)).toBeGreaterThan(0);
    // Parede opaca do mapa com espaço dos dois lados.
    const wall = model.map.walls.find((w) => w.kind === 'wall' && w.w > 150 && w.h < 20 && model.nav.isWalkableAt(w.x + w.w / 2, w.y - 40) && model.nav.isWalkableAt(w.x + w.w / 2, w.y + w.h + 40))!;
    expect(wall).toBeTruthy();
    const w = createZombie({ id: 'w', seed: 4, arch: 'morador', x: wall.x + wall.w / 2, y: wall.y - 40, collapseDays: 0 }, DIFF);
    w.facing = Math.PI / 2;
    expect(sightRate(w, player(wall.x + wall.w / 2, wall.y + wall.h + 40), DAY, model.sight)).toBe(0);
  });

  it('noite, agachado e de costas: muito mais difícil de ser visto', () => {
    const { model } = world();
    const o = openSpot(model);
    const z = createZombie({ id: 'n', seed: 4, arch: 'morador', x: o.x, y: o.y, collapseDays: 0 }, DIFF);
    z.facing = 0;
    const p = player(o.x + 240, o.y);
    const day = sightRate(z, p, DAY, model.sight);
    const night = sightRate(z, p, NIGHT, model.sight);
    const sneak = sightRate(z, { ...p, posture: 'furtivo' }, DAY, model.sight);
    z.facing = Math.PI;
    const behind = sightRate(z, p, DAY, model.sight);
    expect(night).toBeLessThan(day);
    expect(sneak).toBeLessThan(day);
    expect(behind).toBe(0);
  });
});

describe('zumbi: comportamento no mundo', () => {
  it('vê o jogador, persegue, chega perto e ataca (sem atravessar nada)', () => {
    const { model, sys, attacks } = world();
    const o = openSpot(model);
    const z = zombieAt(sys, o.x, o.y, 5, (z) => {
      z.facing = 0;
      z.traits.walk = 80;
      z.traits.sprint = 0;
    });
    const p = player(o.x + 220, o.y);
    run(sys, p, 12);
    expect(['CHASE', 'ATTACK', 'GRAB', 'BITE']).toContain(z.mind.state);
    expect(Math.hypot(z.x - p.x, z.y - p.y)).toBeLessThan(80);
    expect(attacks.length).toBeGreaterThan(0);
  });

  it('nunca fica dentro de parede ou objeto andando por aí', () => {
    const { model, sys } = world();
    const spawns = generatePopulation(model.map, model.nav, { population: 1.5, collapseDays: 0, safe: { x: -9999, y: -9999, r: 1 } });
    sys.store.populate(spawns.slice(0, 40), DIFF);
    for (const z of sys.store.all) for (const k of Object.keys(z.parts) as (keyof typeof z.parts)[]) z.parts[k] = Math.max(z.parts[k], 0.5);
    // Jogador longe de todos: ninguém persegue; todos perto o bastante para simular completo.
    const p = player(model.map.spawn.x, model.map.spawn.y, { alive: false });
    const bad: string[] = [];
    run(sys, p, 20, DAY, () => {
      for (const z of sys.store.all) {
        if (z.dead || z.lod !== 0 || z.mind.climb) continue;
        const r = bodyRadius(z) - 3;
        for (const t of sys.solids.query(z.x, z.y, r)) if (circleHitsSolid(z.x, z.y, r, t.s)) bad.push(`${z.id} em ${t.kind}`);
      }
    });
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('tiro longe chama zumbis para investigar (sem saberem onde o jogador está)', () => {
    const { model, sys, noise } = world();
    const o = openSpot(model, 950, 40);
    const z = zombieAt(sys, o.x, o.y, 6, (z) => (z.facing = Math.PI));
    run(sys, player(-5000, -5000, { alive: false }), 0.5);
    noise.emit(o.x + 900, o.y, 'tiro', { byPlayer: true });
    run(sys, player(-5000, -5000, { alive: false }), 0.2);
    expect(z.mind.state).toBe('INVESTIGATE');
    const d0 = Math.hypot(z.x - (o.x + 900), z.y - o.y);
    run(sys, player(-5000, -5000, { alive: false }), 5);
    expect(Math.hypot(z.x - (o.x + 900), z.y - o.y)).toBeLessThan(d0 - 100);
  });

  it('porta trancada: batem até quebrar; mais zumbis quebram mais rápido', () => {
    const time = (n: number): number => {
      const { model, state, sys } = world();
      const door = model.map.doors.find((d) => d.exterior && d.material === 'wood' && d.style === 'single')!;
      state.setDoorOpen(door.id, false);
      state.setDoorLocked(door.id, true);
      // Jogador de um lado, zumbis do outro, colados na porta.
      const off = (s: number) => (door.vertical ? { x: door.x + s * 60, y: door.y } : { x: door.x, y: door.y + s * 60 });
      const inside = off(door.swing);
      const outside = off(-door.swing);
      for (let i = 0; i < n; i++) {
        const z = zombieAt(sys, outside.x + (door.vertical ? -i * 10 : (i - n / 2) * 22), outside.y + (door.vertical ? (i - n / 2) * 22 : -i * 10), 100 + i);
        z.mind.state = 'CHASE';
        z.mind.lastSeen = { x: inside.x, y: inside.y, t: 0 };
        z.traits.memory = 999;
        z.traits.strength = 1;
        z.traits.aggression = 1;
      }
      const p = player(inside.x, inside.y, { posture: 'parado' });
      let t = 0;
      const dt = 1 / 30;
      while (t < 400 && !state.doorState(door.id)!.broken) {
        // O jogador faz barulho de vez em quando (eles sabem que ele está ali).
        for (const z of sys.store.all) if (z.mind.lastSeen) z.mind.lastSeen.t = sys.now;
        sys.update({ dt, player: p, light: DAY });
        t += dt;
      }
      return t;
    };
    const one = time(1);
    const four = time(4);
    expect(one).toBeLessThan(400);
    expect(four).toBeLessThan(one * 0.6);
  });
});

describe('ataques no jogador', () => {
  const defense = (h: Health, prot = 0): PlayerDefense => ({
    health: h,
    protection: () => ({ bite: prot, scratch: prot }),
    stamina: 1,
    fx: physicalEffects(new Body(), 0, 20),
    load: 0.2,
    fleeing: false,
    down: false,
    grabbed: 0,
    crowd: 1,
  });

  it('mordida sem proteção fere e (quase sempre) infecta', () => {
    const z = createZombie({ id: 'a', seed: 1, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, DIFF);
    let infected = 0;
    for (let i = 0; i < 50; i++) {
      const h = new Health();
      const out = resolveAttack(z, 'bite', defense(h), DIFF, seeded(i + 1));
      expect(out.wound).toBe('mordida');
      expect(h.wounds.length).toBe(1);
      if (out.infected) infected++;
    }
    expect(infected).toBeGreaterThan(35);
  });

  it('roupa grossa segura parte das mordidas', () => {
    const z = createZombie({ id: 'a', seed: 1, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, DIFF);
    let blocked = 0;
    for (let i = 0; i < 100; i++) if (resolveAttack(z, 'bite', defense(new Health(), 0.6), DIFF, seeded(i + 5)).blocked) blocked++;
    expect(blocked).toBeGreaterThan(40);
  });

  it('cercado, cansado e pesado cai muito mais fácil', () => {
    const z = createZombie({ id: 'a', seed: 1, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, DIFF);
    let calm = 0;
    let bad = 0;
    for (let i = 0; i < 300; i++) {
      if (resolveAttack(z, 'push', { ...defense(new Health()), crowd: 1 }, DIFF, seeded(i + 1)).knockdown) calm++;
      if (resolveAttack(z, 'push', { ...defense(new Health()), crowd: 4, stamina: 0.1, load: 1.1 }, DIFF, seeded(i + 1)).knockdown) bad++;
    }
    expect(bad).toBeGreaterThan(calm * 3);
  });

  it('infecção zumbi progride e mata em 1,5–3 dias', () => {
    const h = new Health();
    h.infectZombie(() => 0.5);
    const body = new Body();
    let hp = 0;
    for (let m = 0; m < 24 * 60; m += 60) hp += h.update(60, { sleeping: false, body });
    expect(hp).toBe(0);
    expect(h.states().some((s) => s.id === 'zumbi')).toBe(true);
    for (let m = 0; m < 3 * 24 * 60; m += 60) hp += h.update(60, { sleeping: false, body });
    expect(hp).toBeLessThan(-100);
  });
});

describe('campo de fluxo', () => {
  it('leva até o alvo contornando paredes', () => {
    const { model } = world();
    const o = openSpot(model, 420, 120);
    const f = new FlowField(model.nav, 30);
    f.build(o.x, o.y);
    let x = o.x + 400;
    let y = o.y + 100;
    if (!model.nav.isWalkableAt(x, y)) {
      x = o.x + 150;
      y = o.y;
    }
    for (let i = 0; i < 200; i++) {
      const n = f.next(x, y);
      if (!n) break;
      x = n.x;
      y = n.y;
    }
    expect(Math.hypot(x - o.x, y - o.y)).toBeLessThan(40);
  });
});

describe('corpos', () => {
  it('bolsos e roupas: itens existentes, sempre iguais para o mesmo zumbi, pelo arquétipo', async () => {
    const { corpseLoot, CORPSE_TABLES } = await import('../src/game/zombies/CorpseLoot');
    const { itemDef } = await import('../src/game/items/ItemCatalog');
    for (const t of CORPSE_TABLES) for (const e of t.entries) if (e.item) expect(itemDef(e.item), e.item).toBeTruthy();
    const z = createZombie({ id: 'c', seed: 77, arch: 'policial', x: 0, y: 0, collapseDays: 0 }, DIFF);
    expect(corpseLoot(z)).toEqual(corpseLoot(z));
    let police = 0;
    let bloody = 0;
    for (let s = 0; s < 60; s++) {
      const p = createZombie({ id: 'p', seed: s, arch: 'policial', x: 0, y: 0, collapseDays: 0 }, DIFF);
      const loot = corpseLoot(p);
      if (loot.some((x) => ['cassetete', 'municao40', 'radioComunicador', 'carregador40', 'pistola40'].includes(x.defId))) police++;
      if (loot.some((x) => ((x.st?.f ?? 0) & 32) !== 0)) bloody++;
    }
    expect(police).toBeGreaterThan(18);
    expect(bloody).toBeGreaterThan(20);
  });
});
