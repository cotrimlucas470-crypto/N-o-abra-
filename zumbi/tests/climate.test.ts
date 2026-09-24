import { describe, expect, it } from 'vitest';
import { Calendar, periodOf, seasonOf } from '../src/game/sim/Calendar';
import { daylight, Weather } from '../src/game/sim/Weather';

const DAY = 1440;

describe('calendário', () => {
  it('conta os dias a partir da data inicial, virando o mês', () => {
    const c = new Calendar({ month: 5, day: 30 });
    expect(c.dateOf(0)).toMatchObject({ day: 30, month: 5 });
    expect(c.dateOf(1)).toMatchObject({ day: 31, month: 5 });
    expect(c.dateOf(2)).toMatchObject({ day: 1, month: 6 });
    expect(c.label(2)).toMatch(/1 de junho$/);
  });

  it('dias da semana andam de um em um', () => {
    const c = new Calendar({ month: 1, day: 1 });
    for (let i = 0; i < 10; i++) expect((c.dateOf(i + 1).weekday - c.dateOf(i).weekday + 7) % 7).toBe(1);
  });

  it('estações do hemisfério sul', () => {
    expect(seasonOf(1, 10)).toBe('verao');
    expect(seasonOf(4, 10)).toBe('outono');
    expect(seasonOf(7, 10)).toBe('inverno');
    expect(seasonOf(10, 10)).toBe('primavera');
    expect(seasonOf(12, 25)).toBe('verao');
  });

  it('dia inválido é ajustado (30 de fevereiro vira 28)', () => {
    expect(new Calendar({ month: 2, day: 30 }).dateOf(0)).toMatchObject({ day: 28, month: 2 });
  });

  it('período do dia', () => {
    expect(periodOf(3 * 60)).toBe('Madrugada');
    expect(periodOf(9 * 60)).toBe('Manhã');
    expect(periodOf(14 * 60)).toBe('Tarde');
    expect(periodOf(21 * 60)).toBe('Noite');
  });
});

describe('clima', () => {
  const summer = new Weather(1337, new Calendar({ month: 1, day: 1 }));
  const winter = new Weather(1337, new Calendar({ month: 7, day: 1 }));

  it('é determinístico (mesma semente, mesmo clima)', () => {
    const a = new Weather(42, new Calendar({ month: 5, day: 3 }));
    const b = new Weather(42, new Calendar({ month: 5, day: 3 }));
    for (let t = 0; t < 10 * DAY; t += 97) expect(a.at(t)).toEqual(b.at(t));
  });

  it('muda devagar: de um minuto para o outro quase nada', () => {
    for (let t = 0; t < 5 * DAY; t += 61) {
      const x = summer.at(t);
      const y = summer.at(t + 1);
      expect(Math.abs(x.temp - y.temp)).toBeLessThan(0.3);
      expect(Math.abs(x.cloud - y.cloud)).toBeLessThan(0.02);
    }
  });

  it('inverno é mais frio que verão; madrugada mais fria que a tarde', () => {
    const avg = (w: Weather, hour: number) => {
      let s = 0;
      for (let d = 0; d < 30; d++) s += w.at(d * DAY + hour * 60).temp;
      return s / 30;
    };
    expect(avg(winter, 15)).toBeLessThan(avg(summer, 15) - 6);
    expect(avg(winter, 4)).toBeLessThan(avg(winter, 15) - 6);
    expect(avg(winter, 4)).toBeLessThan(12);
    expect(avg(summer, 15)).toBeGreaterThan(25);
  });

  it('chove mais no verão; chove de vez em quando, não sempre', () => {
    const rainyHours = (w: Weather) => {
      let n = 0;
      for (let h = 0; h < 60 * 24; h++) if (w.at(h * 60).rain > 0) n++;
      return n / (60 * 24);
    };
    const s = rainyHours(summer);
    const w = rainyHours(winter);
    expect(s).toBeGreaterThan(w);
    expect(s).toBeGreaterThan(0.05);
    expect(s).toBeLessThan(0.45);
  });

  it('sem chuva no sandbox, nunca chove', () => {
    const dry = new Weather(1337, new Calendar({ month: 1, day: 1 }), { temperatureOffset: 0, rainMultiplier: 0 });
    for (let h = 0; h < 20 * 24; h++) expect(dry.at(h * 60).rain).toBe(0);
  });

  it('ajuste de temperatura do sandbox soma em tudo', () => {
    const cold = new Weather(1337, new Calendar({ month: 1, day: 1 }), { temperatureOffset: -10, rainMultiplier: 1 });
    expect(cold.at(700).temp).toBeCloseTo(summer.at(700).temp - 10, 5);
  });

  it('resumo do dia tem mínima ≤ máxima e céu válido', () => {
    for (let d = 0; d < 10; d++) {
      const r = winter.daySummary(d);
      expect(r.min).toBeLessThanOrEqual(r.max);
      expect(r.rainHours).toBeGreaterThanOrEqual(0);
    }
  });

  it('luz do dia: noite escura, meio-dia claro', () => {
    expect(daylight(2 * 60)).toBe(0);
    expect(daylight(12 * 60)).toBe(1);
    expect(daylight(6 * 60)).toBeGreaterThan(0);
    expect(daylight(6 * 60)).toBeLessThan(1);
    expect(daylight(23 * 60)).toBe(0);
  });
});
