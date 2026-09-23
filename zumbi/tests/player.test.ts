import { describe, expect, it } from 'vitest';
import { PLAYER_TUNING, STAMINA_TUNING } from '../src/game/config/PlayerTuning';
import { stepVelocity, targetVelocity } from '../src/game/entities/player/PlayerMotor';
import { PlayerStats } from '../src/game/entities/player/PlayerStats';

const len = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);

describe('PlayerMotor', () => {
  it('diagonal não é mais rápida que reto', () => {
    const straight = targetVelocity({ x: 1, y: 0, sprint: false }, true);
    const diag = targetVelocity({ x: 1, y: 1, sprint: false }, true);
    expect(len(diag)).toBeCloseTo(len(straight), 5);
    expect(len(straight)).toBeCloseTo(PLAYER_TUNING.walkSpeed, 5);
  });

  it('joystick pouco inclinado anda devagar, mas anda', () => {
    const slow = targetVelocity({ x: 0.2, y: 0, sprint: false }, true);
    expect(len(slow)).toBeGreaterThan(PLAYER_TUNING.walkSpeed * PLAYER_TUNING.minAnalogSpeedFactor - 1);
    expect(len(slow)).toBeLessThan(PLAYER_TUNING.walkSpeed * 0.6);
  });

  it('correr só vale com fôlego e joystick bem inclinado', () => {
    expect(len(targetVelocity({ x: 1, y: 0, sprint: true }, true))).toBeCloseTo(PLAYER_TUNING.runSpeed, 5);
    expect(len(targetVelocity({ x: 1, y: 0, sprint: true }, false))).toBeCloseTo(PLAYER_TUNING.walkSpeed, 5);
    expect(len(targetVelocity({ x: 0.3, y: 0, sprint: true }, true))).toBeLessThan(PLAYER_TUNING.walkSpeed);
  });

  it('acelera suave e chega na velocidade alvo', () => {
    let v = { x: 0, y: 0 };
    const target = { x: PLAYER_TUNING.walkSpeed, y: 0 };
    v = stepVelocity(v, target, 1 / 60);
    expect(v.x).toBeCloseTo(PLAYER_TUNING.accel / 60, 5);
    for (let i = 0; i < 60; i++) v = stepVelocity(v, target, 1 / 60);
    expect(v.x).toBeCloseTo(target.x, 5);
  });

  it('para mais rápido do que acelera', () => {
    let v: { x: number; y: number } = { x: PLAYER_TUNING.walkSpeed, y: 0 };
    v = stepVelocity(v, { x: 0, y: 0 }, 1 / 60);
    expect(PLAYER_TUNING.walkSpeed - v.x).toBeCloseTo(PLAYER_TUNING.decel / 60, 5);
  });

  it('resultado não depende do FPS', () => {
    const run = (fps: number) => {
      let v = { x: 0, y: 0 };
      let x = 0;
      const dt = 1 / fps;
      for (let t = 0; t < 1; t += dt) {
        v = stepVelocity(v, { x: 200, y: 0 }, dt);
        x += v.x * dt;
      }
      return x;
    };
    expect(Math.abs(run(30) - run(120))).toBeLessThan(8);
  });
});

describe('PlayerStats', () => {
  it('correr gasta fôlego e parar recupera depois da espera', () => {
    const s = new PlayerStats();
    s.update(1, true);
    expect(s.stamina).toBeCloseTo(STAMINA_TUNING.max - STAMINA_TUNING.drainPerSecond, 5);
    const after = s.stamina;
    s.update(STAMINA_TUNING.regenDelay * 0.5, false);
    expect(s.stamina).toBe(after); // ainda esperando
    s.update(STAMINA_TUNING.regenDelay, false);
    s.update(1, false);
    expect(s.stamina).toBeGreaterThan(after);
  });

  it('ao zerar fica exausto e só corre de novo após recuperar a fração mínima', () => {
    const s = new PlayerStats();
    for (let i = 0; i < 200 && !s.exhausted; i++) s.update(0.1, true);
    expect(s.exhausted).toBe(true);
    expect(s.canSprint()).toBe(false);
    for (let i = 0; i < 400 && s.exhausted; i++) s.update(0.1, false);
    expect(s.exhausted).toBe(false);
    expect(s.stamina).toBeGreaterThanOrEqual(STAMINA_TUNING.max * STAMINA_TUNING.exhaustedRecoverFraction - 0.001);
  });

  it('snapshot/restore preserva o estado (base do save)', () => {
    const s = new PlayerStats();
    s.update(2, true);
    s.setHealth(42);
    const copy = new PlayerStats();
    copy.restore(s.snapshot());
    expect(copy.snapshot()).toEqual(s.snapshot());
  });
});
