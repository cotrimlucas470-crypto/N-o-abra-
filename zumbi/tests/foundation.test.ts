import { describe, expect, it } from 'vitest';
import { SANDBOX_DEFAULTS, SANDBOX_PRESETS, sandboxFromUrl, sanitizeSandbox } from '../src/game/config/Sandbox';
import { CHUNK_PX, chunkKey, chunkKeyAt, chunkRing, chunksInRect, keyToChunk } from '../src/game/sim/ChunkGrid';
import { GameClock, MINUTES_PER_DAY } from '../src/game/sim/GameClock';

describe('opções de mundo (sandbox)', () => {
  it('valores fora da faixa são trazidos para dentro', () => {
    const s = sanitizeSandbox({ world: { sectorsX: 99, sectorsY: -3, seed: 1.7 }, time: { dayLengthMinutes: 0 }, player: { walkSpeedMultiplier: Number.NaN } });
    expect(s.world.sectorsX).toBe(9);
    expect(s.world.sectorsY).toBe(1);
    expect(s.world.seed).toBe(2);
    expect(s.time.dayLengthMinutes).toBe(2);
    expect(s.player.walkSpeedMultiplier).toBe(1);
  });

  it('entrada vazia vira o padrão; presets são válidos', () => {
    expect(sanitizeSandbox(undefined)).toEqual(SANDBOX_DEFAULTS);
    for (const p of Object.values(SANDBOX_PRESETS)) expect(sanitizeSandbox(p.settings)).toEqual(p.settings);
  });

  it('ajustes de teste pela URL', () => {
    const s = sandboxFromUrl('?setores=2x4&semente=42&hora=21.5&dia=10');
    expect([s.world.sectorsX, s.world.sectorsY, s.world.seed]).toEqual([2, 4, 42]);
    expect(s.time.startHour).toBe(21.5);
    expect(s.time.dayLengthMinutes).toBe(10);
    expect(sandboxFromUrl('?setores=lixo')).toEqual(SANDBOX_DEFAULTS);
  });
});

describe('relógio do jogo', () => {
  it('começa no dia e hora configurados', () => {
    const c = new GameClock({ dayLengthMinutes: 48, startDay: 3, startHour: 8.5 });
    expect(c.day).toBe(3);
    expect(c.timeLabel()).toBe('08:30');
  });

  it('um dia de jogo dura dayLengthMinutes reais', () => {
    const c = new GameClock({ dayLengthMinutes: 48, startDay: 1, startHour: 0 });
    for (let i = 0; i < 48 * 60; i++) c.update(1);
    expect(c.day).toBe(2);
    expect(c.minuteOfDay).toBeCloseTo(0, 4);
  });

  it('virada de dia, timeScale e snapshot', () => {
    const c = new GameClock({ dayLengthMinutes: 24, startDay: 1, startHour: 23.9 });
    c.timeScale = 0;
    c.update(100);
    expect(c.day).toBe(1);
    c.timeScale = 1;
    c.advance(30);
    expect(c.day).toBe(2);
    const copy = new GameClock({ dayLengthMinutes: 24, startDay: 1, startHour: 0 });
    copy.restore(c.snapshot());
    expect(copy.minutes).toBe(c.minutes);
    expect(copy.minutes).toBeLessThan(2 * MINUTES_PER_DAY);
  });
});

describe('chunks', () => {
  it('chave vai e volta, inclusive negativos', () => {
    for (const [x, y] of [[0, 0], [5, 9], [-3, 7], [300, -2]] as const) {
      expect(keyToChunk(chunkKey(x, y))).toEqual({ cx: x, cy: y });
    }
  });

  it('ponto → chunk e anel', () => {
    expect(chunkKeyAt(CHUNK_PX * 2 + 1, 5)).toBe(chunkKey(2, 0));
    expect(chunkRing(chunkKey(1, 1), chunkKey(4, 0))).toBe(3);
  });

  it('retângulo → chunks, limitado ao mundo', () => {
    const keys = chunksInRect(-500, -500, CHUNK_PX * 1.5, CHUNK_PX * 0.5, CHUNK_PX * 3, CHUNK_PX * 3);
    expect(keys.sort()).toEqual([chunkKey(0, 0), chunkKey(1, 0)].sort());
  });
});
