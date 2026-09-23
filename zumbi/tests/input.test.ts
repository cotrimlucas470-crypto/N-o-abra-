import { describe, expect, it } from 'vitest';
import { KeyboardMouseState, TouchInputState, resolveIntent } from '../src/game/input/InputState';
import { DEFAULT_LAYOUT, placementFor, resolvePlacement, uiScaleFor } from '../src/game/input/touch/ControlsLayout';
import { clampKnob, computeStick } from '../src/game/input/touch/joystickMath';

describe('joystick', () => {
  it('zona morta ignora tremidas do polegar', () => {
    expect(computeStick(5, 0, 60, 0.12).magnitude).toBe(0);
  });

  it('resposta começa em 0 logo após a zona morta e satura em 1', () => {
    const justOut = computeStick(60 * 0.13, 0, 60, 0.12);
    expect(justOut.magnitude).toBeGreaterThan(0);
    expect(justOut.magnitude).toBeLessThan(0.05);
    expect(computeStick(500, 0, 60, 0.12).magnitude).toBe(1);
  });

  it('direção preservada', () => {
    const v = computeStick(0, -60, 60, 0.1);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.y).toBeCloseTo(-1, 6);
  });

  it('pino fica preso dentro do raio', () => {
    const k = clampKnob(300, 400, 50);
    expect(Math.hypot(k.x, k.y)).toBeCloseTo(50, 6);
  });
});

describe('intenção do jogador', () => {
  it('toque tem prioridade sobre teclado no movimento', () => {
    const t = new TouchInputState();
    const k = new KeyboardMouseState();
    k.moveX = 1;
    t.move = { x: 0, y: 0.5, magnitude: 0.5, active: true };
    const i = resolveIntent(t, k);
    expect(i.moveX).toBe(0);
    expect(i.moveY).toBe(0.5);
  });

  it('teclado diagonal é normalizado', () => {
    const k = new KeyboardMouseState();
    k.moveX = 1;
    k.moveY = 1;
    const i = resolveIntent(new TouchInputState(), k);
    expect(Math.hypot(i.moveX, i.moveY)).toBeCloseTo(1, 6);
  });

  it('mira de toque ativa só com o joystick fora da zona morta', () => {
    const t = new TouchInputState();
    t.aim = { x: 0, y: 0, magnitude: 0, active: true };
    expect(resolveIntent(t, new KeyboardMouseState()).aiming).toBe(false);
    t.aim = { x: 0.6, y: 0, magnitude: 0.6, active: true };
    const i = resolveIntent(t, new KeyboardMouseState());
    expect(i.aiming).toBe(true);
    expect(i.aimX).toBeCloseTo(1, 6);
  });

  it('correr: Shift ou botão de toque', () => {
    const t = new TouchInputState();
    t.sprintToggled = true;
    expect(resolveIntent(t, new KeyboardMouseState()).sprint).toBe(true);
  });
});

describe('layout dos controles', () => {
  const insets = { left: 0, right: 0, top: 0, bottom: 0 };

  it('respeita âncora e área segura', () => {
    const p = resolvePlacement({ anchor: 'bottom-right', x: 100, y: 50, size: 20 }, 800, 400, { ...insets, right: 30 }, 1);
    expect(p.x).toBe(800 - 30 - 100);
    expect(p.y).toBe(350);
    expect(p.radius).toBe(20);
  });

  it('nenhum controle sai da tela nem se sobrepõe em telas comuns', () => {
    for (const [w, h] of [[640, 360], [844, 390], [915, 412], [1280, 800], [390, 844], [360, 740]] as const) {
      const scale = uiScaleFor(w, h);
      const ids = Object.keys(DEFAULT_LAYOUT.controls) as (keyof typeof DEFAULT_LAYOUT.controls)[];
      const rs = ids.map((id) => ({ id, ...resolvePlacement(placementFor(DEFAULT_LAYOUT, id, h > w), w, h, insets, scale) }));
      for (const r of rs) {
        expect(r.x - r.radius, `${r.id} ${w}x${h}`).toBeGreaterThanOrEqual(0);
        expect(r.y - r.radius, `${r.id} ${w}x${h}`).toBeGreaterThanOrEqual(0);
        expect(r.x + r.radius, `${r.id} ${w}x${h}`).toBeLessThanOrEqual(w);
        expect(r.y + r.radius, `${r.id} ${w}x${h}`).toBeLessThanOrEqual(h);
      }
      for (let i = 0; i < rs.length; i++) {
        for (let j = i + 1; j < rs.length; j++) {
          const a = rs[i]!;
          const b = rs[j]!;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          expect(d, `${a.id} x ${b.id} em ${w}x${h}`).toBeGreaterThanOrEqual(a.radius + b.radius);
        }
      }
    }
  });
});
