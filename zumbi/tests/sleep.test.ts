import { describe, expect, it } from 'vitest';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import { restAfter, sleepAction, sleepComfort } from '../src/game/survival/Sleep';
import { Survivor, type Environment } from '../src/game/survival/Survivor';
import type { WeatherSample } from '../src/game/sim/Weather';

const sky = (o: Partial<WeatherSample> = {}): WeatherSample => ({ temp: 22, cloud: 0, rain: 0, snow: 0, precip: 0, fog: 0, wind: 0, humidity: 0.5, thunder: 0, front: 0, sky: 'limpo', ...o });
const base = { feltTemp: 22, blanket: false, hunger: 10, thirst: 10, pain: 0, bleeding: false };

function survivor() {
  const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = v; } };
  return new Survivor(stats, new PlayerInventory(200));
}

describe('sono: horas escolhidas e qualidade', () => {
  it('recupera proporcional às horas; 8 h na cama zeram o cansaço', () => {
    expect(restAfter(100, 8, 1)).toBe(100);
    const two = restAfter(100, 2, 1);
    expect(two).toBeGreaterThan(20);
    expect(two).toBeLessThan(35);
    expect(restAfter(100, 4, 1)).toBeGreaterThan(two * 1.8);
    // Dormir pior rende menos nas mesmas horas.
    expect(restAfter(100, 6, 0.55)).toBeLessThan(restAfter(100, 6, 1));
  });

  it('frio, fome, sede, dor e sangue atrapalham; cobertor e moradia ajudam', () => {
    expect(sleepComfort(base).factor).toBe(1);
    const cold = sleepComfort({ ...base, feltTemp: 8 });
    expect(cold.factor).toBeLessThan(0.7);
    expect(cold.reasons).toContain('frio');
    expect(sleepComfort({ ...base, feltTemp: 8, blanket: true }).factor).toBeGreaterThan(cold.factor);
    const bad = sleepComfort({ ...base, hunger: 70, thirst: 60, pain: 40, bleeding: true });
    expect(bad.reasons).toEqual(['fome', 'sede', 'dor', 'sangrando']);
    expect(bad.factor).toBeLessThan(0.55);
    expect(sleepComfort({ ...base, home: true }).factor).toBeGreaterThan(1);
  });

  it('dormir as horas escolhidas (1–10) e não precisar dormir de novo logo depois', () => {
    const sv = survivor();
    sv.body.fatigue = 90;
    const spec = sleepAction(sv, {} as never, { place: 'cama', blanket: true, hours: 8 }, () => undefined);
    expect(spec.minutes).toBe(8 * 60);
    expect(sleepAction(sv, {} as never, { place: 'cama', blanket: true, hours: 15 }, () => undefined).minutes).toBe(10 * 60);
    const env: Environment = { weather: sky(), sheltered: true, activity: 'idle', fireHeat: 0, sleep: { quality: 1, blanket: true } };
    sv.update(8 * 60, env);
    expect(sv.body.fatigue).toBeLessThan(5);
    expect(sv.cantSleep()).toMatch(/sono/);
    // ~9 h acordado parado ainda não dá sono de novo.
    sv.update(9 * 60, { ...env, sleep: null });
    expect(sv.cantSleep()).toMatch(/sono/);
  });

  it('dormindo com fome e frio recupera menos', () => {
    const a = survivor();
    const b = survivor();
    a.body.fatigue = b.body.fatigue = 90;
    b.body.hunger = 70;
    const env: Environment = { weather: sky(), sheltered: true, activity: 'idle', fireHeat: 0, sleep: { quality: 1, blanket: true } };
    a.update(4 * 60, env);
    b.update(4 * 60, { ...env, weather: sky({ temp: -2 }), sleep: { quality: 1, blanket: false } });
    expect(b.body.fatigue).toBeGreaterThan(a.body.fatigue + 10);
  });
});
