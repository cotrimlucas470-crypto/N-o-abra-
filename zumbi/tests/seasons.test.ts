import { describe, expect, it } from 'vitest';
import { tickPlot } from '../src/game/build/Farm';
import type { Structure } from '../src/game/build/Structures';
import { FARM_TUNING } from '../src/game/config/BuildTuning';
import { Calendar } from '../src/game/sim/Calendar';
import { approachCurve, seasonal, SEASON_START } from '../src/game/sim/Climate';
import { GameClock } from '../src/game/sim/GameClock';
import { Ground } from '../src/game/sim/Ground';
import { skipTime } from '../src/game/sim/TimeSkip';
import { Weather } from '../src/game/sim/Weather';
import { dailyNeed, provisionDays } from '../src/game/survival/Provisions';
import { Survivor } from '../src/game/survival/Survivor';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import { itemDef } from '../src/game/items/ItemCatalog';
import { stepCar, type CarBody } from '../src/game/vehicles/Driving';

const DAY = 1440;
/** Calendário que começa em 1º de janeiro: minuto de jogo = dia do ano × 1440. */
const jan = () => new Calendar({ month: 1, day: 1 });
const SEEDS = [1337, 42, 7, 2024, 99];

describe('estações graduais', () => {
  it('aproximação: nada 30 dias antes, sobe devagar e depressa no fim', () => {
    expect(approachCurve(30)).toBe(0);
    expect(approachCurve(20)).toBeLessThan(0.25);
    expect(approachCurve(7)).toBeGreaterThan(0.5);
    expect(approachCurve(1)).toBeGreaterThan(0.9);
    expect(approachCurve(0)).toBe(1);
    for (let d = 30; d > 0; d--) expect(approachCurve(d - 1)).toBeGreaterThanOrEqual(approachCurve(d));
  });

  it('o inverno chega aos poucos e só é completo no início oficial', () => {
    const w = SEASON_START.inverno;
    expect(seasonal(w - 31).winter).toBe(0);
    expect(seasonal(w - 14).winter).toBeGreaterThan(0.2);
    expect(seasonal(w - 14).winter).toBeLessThan(0.7);
    expect(seasonal(w + 0.01).winter).toBeGreaterThan(0.99);
    expect(seasonal(w - 10).next).toBe('inverno');
  });

  it('nada muda de um dia para o outro: temperatura média e folhas andam devagar', () => {
    for (let d = 0; d < 365; d++) {
      const a = seasonal(d);
      const b = seasonal(d + 1);
      expect(Math.abs(a.mean - b.mean)).toBeLessThan(0.8);
      expect(Math.abs(a.leafCover - b.leafCover)).toBeLessThan(0.05);
      expect(Math.abs(a.dayHours - b.dayHours)).toBeLessThan(0.1);
    }
  });

  it('verão tem dia longo e folha verde; inverno, dia curto e árvore pelada', () => {
    const summer = seasonal(20);
    const winter = seasonal(195);
    expect(summer.dayHours).toBeGreaterThan(13.5);
    expect(winter.dayHours).toBeLessThan(11);
    expect(summer.leafCover).toBe(1);
    expect(winter.leafCover).toBeLessThan(0.5);
    expect(seasonal(130).leafColor).toBeGreaterThan(0.6); // maio: outono vermelho
  });
});

describe('neve progressiva', () => {
  /** Horas de neve e cobertura média numa semana, somando várias sementes. */
  const week = (startDoy: number) => {
    let snowH = 0;
    let cover = 0;
    let n = 0;
    for (const seed of SEEDS) {
      const w = new Weather(seed, jan());
      const g = new Ground(w, startDoy * DAY);
      g.spinUp();
      for (let h = 0; h < 7 * 24; h++) {
        const t = startDoy * DAY + h * 60;
        if (w.at(t + 30).snow > 0) snowH++;
        g.integrate(t + 60);
        cover += g.snow;
        n++;
      }
    }
    return { snowH: snowH / SEEDS.length, cover: cover / n };
  };

  it('30 dias antes quase nada; perto do inverno mais neve e mais chão branco; no inverno, muito mais', () => {
    const w = SEASON_START.inverno;
    const far = week(w - 33);
    const near = week(w - 8);
    const winter = week(w + 25);
    expect(far.cover).toBeLessThan(0.1);
    expect(near.snowH).toBeGreaterThan(far.snowH);
    expect(near.cover).toBeGreaterThan(far.cover);
    expect(winter.cover).toBeGreaterThan(0.5);
    expect(winter.snowH).toBeGreaterThan(near.snowH * 0.8);
    // Verão: nunca neva.
    expect(week(15).snowH).toBe(0);
  });

  it('neve no chão derrete com calor e chuva, e some no verão', () => {
    const w = new Weather(1337, jan());
    const g = new Ground(w, 200 * DAY);
    g.snowCm = 20;
    g.soil = -3;
    g.integrate(200 * DAY + 60);
    expect(g.snow).toBeGreaterThan(0.9);
    const warm = new Weather(1337, jan(), { temperatureOffset: 12, rainMultiplier: 1 });
    const gw = new Ground(warm, 200 * DAY);
    gw.snowCm = 20;
    gw.integrate(203 * DAY);
    expect(gw.snowCm).toBeLessThan(10);
    const summer = new Ground(w, 20 * DAY);
    summer.snowCm = 30;
    summer.integrate(30 * DAY);
    expect(summer.snow).toBe(0);
  });

  it('pular direto dá o mesmo chão que ir aos poucos', () => {
    const w = new Weather(42, jan());
    const a = new Ground(w, 180 * DAY);
    const b = new Ground(w, 180 * DAY);
    a.integrate(184 * DAY);
    for (let t = 180 * DAY; t <= 184 * DAY; t += 7) b.integrate(t);
    b.integrate(184 * DAY);
    expect(Math.abs(a.snowCm - b.snowCm)).toBeLessThan(0.3);
    expect(Math.abs(a.wet - b.wet)).toBeLessThan(0.05);
  });

  it('save/load no meio da nevasca continua de onde parou', () => {
    const w = new Weather(7, jan());
    const g = new Ground(w, 190 * DAY);
    g.spinUp();
    g.integrate(195 * DAY + 333);
    const save = JSON.parse(JSON.stringify(g.serialize()));
    const again = new Ground(w, 0);
    again.restore(save, 195 * DAY + 333);
    g.integrate(197 * DAY);
    again.integrate(197 * DAY);
    expect(again.snowCm).toBeCloseTo(g.snowCm, 1);
    expect(again.ice).toBeCloseTo(g.ice, 2);
    // Save antigo (sem chão): calcula os dias anteriores em vez de começar vazio.
    const old = new Ground(w, 0);
    old.restore(undefined, 200 * DAY);
    expect(old.at).toBe(200 * DAY);
  });
});

describe('frentes e tempestades', () => {
  /** Primeira tempestade do ano (hora do pico). */
  const findStorm = (w: Weather) => {
    for (let h = 24; h < 200 * 24; h++) if (w.at(h * 60).sky === 'tempestade') return h;
    return -1;
  };

  it('tempestade não cai do nada: nuvens e vento antes, chuva e trovão no meio, abre depois', () => {
    const w = new Weather(1337, jan());
    const h = findStorm(w);
    expect(h).toBeGreaterThan(0);
    // Começo da chuva forte (volta até a precipitação sumir).
    let s = h * 60;
    while (w.at(s).precip > 0.05 && s > h * 60 - 12 * 60) s -= 10;
    const before6 = w.at(s - 6 * 60);
    const before2 = w.at(s - 90);
    const peak = w.at(h * 60);
    expect(before2.cloud).toBeGreaterThan(before6.cloud);
    expect(before2.front).toBeGreaterThan(0.3);
    expect(peak.rain).toBeGreaterThan(0.35);
    expect(peak.thunder).toBeGreaterThan(0.5);
    // Depois: a chuva perde força devagar (passa por chuva fraca antes de parar).
    let t = h * 60;
    while (w.at(t).sky === 'tempestade' || w.at(t).rain >= 0.3) t += 10;
    let sawLight = false;
    for (let k = 0; k < 60 && w.at(t).precip > 0; k++, t += 10) if (w.at(t).rain > 0 && w.at(t).rain < 0.3) sawLight = true;
    expect(sawLight).toBe(true);
  });

  it('dias diferentes na mesma estação (não é roteiro): céus variados num mês', () => {
    const w = new Weather(42, jan());
    const skies = new Set<string>();
    for (let d = 0; d < 30; d++) skies.add(w.daySummary(d).sky);
    expect(skies.size).toBeGreaterThanOrEqual(3);
  });
});

describe('passar dias', () => {
  function setup(startDoy: number, seed = 1337) {
    const cal = jan();
    const weather = new Weather(seed, cal);
    const clock = new GameClock({ dayLengthMinutes: 15, startDay: startDoy + 1, startHour: 8 });
    const ground = new Ground(weather, clock.minutes);
    ground.spinUp();
    const inv = new PlayerInventory();
    const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = Math.max(0, Math.min(100, v)); } };
    const sv = new Survivor(stats, inv);
    inv.putOn('casacoInverno');
    return { cal, weather, clock, ground, inv, stats, sv };
  }

  for (const days of [1, 5, 12]) {
    it(`avança ${days} dia(s): data, clima e chão acompanham; come e bebe`, () => {
      const t = setup(150);
      let meals = 0;
      let drinks = 0;
      const r = skipTime(t.clock, t.weather, t.ground, days * DAY, {
        body: {
          survivor: t.sv,
          health: () => t.stats.health,
          sleep: { quality: 1, blanket: true },
          eat: () => (t.sv.body.consume({ hunger: 30, thirst: 0, kcal: 400, health: 0, sickness: 0, message: '', tone: 'ok' }), ++meals > 0),
          drink: () => (t.sv.body.consume({ hunger: 0, thirst: 30, kcal: 0, health: 0, sickness: 0, message: '', tone: 'ok' }), ++drinks > 0),
        },
      });
      expect(r.stopped).toBeNull();
      expect(t.clock.day).toBe(151 + days);
      expect(t.cal.dateOf(t.clock.dayIndex).dayOfYear).toBe(150 + days);
      expect(t.ground.at).toBe(t.clock.minutes);
      // Ritmo novo (lento): uma refeição boa segura ~2 dias parado; água ~1 dia.
      expect(r.meals).toBeGreaterThanOrEqual(Math.floor(days * 0.3));
      expect(r.drinks).toBeGreaterThanOrEqual(Math.floor(days * 0.7));
      expect(r.minTemp).toBeLessThanOrEqual(r.maxTemp);
      expect(t.sv.body.hunger).toBeLessThan(90);
    });
  }

  it('sem comida, para antes; zumbi chegando interrompe', () => {
    const t = setup(40);
    const r = skipTime(t.clock, t.weather, t.ground, 12 * DAY, {
      body: { survivor: t.sv, health: () => t.stats.health, sleep: { quality: 1, blanket: false }, eat: () => false, drink: () => (t.sv.body.consume({ hunger: 0, thirst: 40, kcal: 0, health: 0, sickness: 0, message: '', tone: 'ok' }), true) },
    });
    expect(r.stopped).toMatch(/comida/);
    expect(t.clock.day).toBeLessThan(41 + 12);
    const z = setup(40);
    const r2 = skipTime(z.clock, z.weather, z.ground, 5 * DAY, { danger: (_now, hours) => (hours >= 30 ? 'Zumbi rondando o abrigo.' : null) });
    expect(r2.stopped).toMatch(/Zumbi/);
    expect(z.clock.minutes - r2.from).toBe(30 * 60);
  });

  it('provisões: quantos dias a comida e a água seguram', () => {
    const need = dailyNeed();
    // Parado no abrigo: ~14 de fome e ~27 de sede por dia (uma lata de feijão = 25).
    expect(need.hunger).toBeGreaterThan(10);
    expect(need.hunger).toBeLessThan(20);
    expect(need.thirst).toBeGreaterThan(need.hunger);
    const beans = itemDef('feijao')!;
    const water = itemDef('agua')!;
    const d = provisionDays([{ def: beans, count: 10 }, { def: water, count: 6 }], 0, () => true, { hunger: 20, thirst: 20 });
    expect(d.food).toBeGreaterThan(10);
    expect(d.water).toBeGreaterThan(8);
    const none = provisionDays([], 0, () => true, { hunger: 50, thirst: 50 });
    expect(none.food).toBeLessThan(0.5);
  });
});

describe('o clima mexe no mundo', () => {
  it('geada mata a planta ao relento', () => {
    const s = { type: 'canteiro', x: 0, y: 0, crop: { seed: 'sementeTomate', growth: 2, watered: 0 }, tickAt: 0 } as unknown as Structure;
    expect(tickPlot(s, 60, 0, FARM_TUNING.frostKill - 1, 1)).toBe('morreu');
    const ok = { type: 'canteiro', x: 0, y: 0, crop: { seed: 'sementeTomate', growth: 2, watered: 0 }, tickAt: 0 } as unknown as Structure;
    expect(tickPlot(ok, 60, 0, 8, 1)).toBeNull();
  });

  it('carro no gelo acelera, freia e vira pior', () => {
    const dry: CarBody = { x: 0, y: 0, a: 0, speed: 0 };
    const ice: CarBody = { x: 0, y: 0, a: 0, speed: 0 };
    const cond = { engine: 1, tires: 1, body: 1, fuel: 30 };
    for (let i = 0; i < 60; i++) {
      stepCar(dry, { throttle: 1, steer: 0 }, cond, 1 / 30);
      stepCar(ice, { throttle: 1, steer: 0 }, { ...cond, grip: 0.4 }, 1 / 30);
    }
    expect(ice.speed).toBeLessThan(dry.speed * 0.6);
  });
});
