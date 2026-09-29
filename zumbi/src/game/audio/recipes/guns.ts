/**
 * ARMAS DE FOGO: cada disparo é feito de camadas que acontecem de verdade:
 * - estalo supersônico (onda em N, milissegundos);
 * - estouro da boca (gás saindo: ruído com ataque instantâneo);
 * - grave do corpo da explosão (desce de tom), com saturação (peso);
 * - mecânica da arma (ferrolho, tambor, bomba da espingarda);
 * - um rabo curto do ar; o eco da rua/cômodo entra depois (reverberação).
 * Calibres diferentes mudam tudo: 12 é um estrondo largo, .308 um estalo
 * seco enorme, .22 quase um tapa.
 */
import { burst, buffer, finish, modes, type Rng, soft, thump, trim } from '../dsp';
import { click } from './doors';

type Recipe = (rng: Rng, sr: number) => Float32Array;

export type GunClass = 'pistola9' | 'pistola40' | 'revolver' | 'espingarda' | 'dupla' | 'rifle22' | 'rifle308' | 'smg';
export const GUN_CLASSES: readonly GunClass[] = ['pistola9', 'pistola40', 'revolver', 'espingarda', 'dupla', 'rifle22', 'rifle308', 'smg'];

interface GunSpec {
  crack: number;
  bright: number;
  blast: number;
  blastTau: number;
  boom: number;
  boomF: number;
  boomDur: number;
  drive: number;
  tail: number;
  mech: 'slide' | 'revolver' | 'pump' | 'none' | 'bolt' | 'smg';
}

const SPEC: Record<GunClass, GunSpec> = {
  pistola9: { crack: 0.9, bright: 5200, blast: 1, blastTau: 0.02, boom: 0.7, boomF: 110, boomDur: 0.14, drive: 2.4, tail: 0.5, mech: 'slide' },
  pistola40: { crack: 0.95, bright: 4800, blast: 1, blastTau: 0.024, boom: 0.8, boomF: 100, boomDur: 0.16, drive: 2.6, tail: 0.55, mech: 'slide' },
  revolver: { crack: 0.8, bright: 4200, blast: 1, blastTau: 0.028, boom: 0.9, boomF: 95, boomDur: 0.18, drive: 2.6, tail: 0.6, mech: 'revolver' },
  espingarda: { crack: 0.6, bright: 3200, blast: 1, blastTau: 0.05, boom: 1, boomF: 75, boomDur: 0.3, drive: 3, tail: 0.9, mech: 'pump' },
  dupla: { crack: 0.6, bright: 3000, blast: 1, blastTau: 0.055, boom: 1, boomF: 72, boomDur: 0.32, drive: 3, tail: 0.95, mech: 'none' },
  rifle22: { crack: 0.7, bright: 6500, blast: 0.55, blastTau: 0.012, boom: 0.3, boomF: 150, boomDur: 0.08, drive: 1.6, tail: 0.25, mech: 'bolt' },
  rifle308: { crack: 1, bright: 6000, blast: 1, blastTau: 0.04, boom: 1, boomF: 85, boomDur: 0.28, drive: 3.2, tail: 1, mech: 'bolt' },
  smg: { crack: 0.85, bright: 5600, blast: 0.9, blastTau: 0.016, boom: 0.6, boomF: 120, boomDur: 0.11, drive: 2.2, tail: 0.4, mech: 'smg' },
};

/** Onda em N (estalo de bala supersônica / frente de choque). */
function nWave(out: Float32Array, sr: number, at: number, ms: number, gain: number): void {
  const s = Math.round(at * sr);
  const n = Math.max(3, Math.round((ms / 1000) * sr));
  for (let i = 0; i < n && s + i < out.length; i++) out[s + i] = out[s + i]! + gain * (1 - (2 * i) / (n - 1));
}

export function gunshot(c: GunClass): Recipe {
  const g = SPEC[c];
  return (rng, sr) => {
    const out = buffer(1.6, sr);
    const t0 = c === 'revolver' ? 0.02 : 0.004;
    // Revólver: o cão cai antes do tiro.
    if (c === 'revolver') click(out, sr, rng, 0.004, 0.12, 0.9);
    nWave(out, sr, t0, rng.vary(0.5, 0.2), g.crack);
    burst(out, sr, rng, { at: t0, dur: 0.006, tau: 0.0012, gain: g.crack * 0.8, type: 'highpass', freq: 2200, q: 0.7 });
    // Estouro: gás saindo da boca.
    burst(out, sr, rng, { at: t0, dur: g.blastTau * 6, tau: g.blastTau, gain: g.blast, attack: 0.0004, type: 'lowpass', freq: rng.vary(g.bright, 0.1), q: 0.5 });
    burst(out, sr, rng, { at: t0, dur: g.blastTau * 6, tau: g.blastTau * 1.3, gain: g.blast * 0.6, attack: 0.0005, type: 'bandpass', freq: rng.vary(700, 0.15), q: 0.5, color: 'pink' });
    thump(out, sr, t0, g.boomF * 1.7 * rng.vary(1, 0.08), g.boomF * 0.55, g.boomDur, g.boom);
    soft(out, g.drive);
    // Rabo do ar (antes do eco do lugar).
    burst(out, sr, rng, { at: t0 + 0.01, dur: 0.4 + g.tail * 0.6, tau: 0.1 + g.tail * 0.2, gain: 0.1 + g.tail * 0.06, type: 'lowpass', freq: 1300, q: 0.6, color: 'pink' });
    // Mecânica (mais baixa que o tiro, mas perto do ouvido).
    const m = 0.07;
    switch (g.mech) {
      case 'slide':
        click(out, sr, rng, t0 + rng.range(0.04, 0.06), m, 1);
        click(out, sr, rng, t0 + rng.range(0.07, 0.09), m * 0.8, 0.8);
        break;
      case 'smg':
        click(out, sr, rng, t0 + 0.035, m * 0.8, 1.1);
        break;
      case 'revolver':
        click(out, sr, rng, t0 + rng.range(0.12, 0.2), m * 0.6, 0.7);
        break;
      case 'pump': {
        const p = rng.range(0.38, 0.5);
        burst(out, sr, rng, { at: p, dur: 0.08, tau: 0.03, gain: m * 1.4, type: 'bandpass', freq: 1800, q: 1.2, color: 'pink' });
        click(out, sr, rng, p + 0.07, m * 1.2, 0.7);
        burst(out, sr, rng, { at: p + 0.13, dur: 0.07, tau: 0.025, gain: m * 1.3, type: 'bandpass', freq: 2100, q: 1.2, color: 'pink' });
        click(out, sr, rng, p + 0.19, m * 1.5, 0.8);
        break;
      }
      case 'bolt': {
        const p = rng.range(0.45, 0.6);
        click(out, sr, rng, p, m, 0.8);
        burst(out, sr, rng, { at: p + 0.05, dur: 0.07, tau: 0.03, gain: m, type: 'bandpass', freq: 2400, q: 1.4, color: 'pink' });
        click(out, sr, rng, p + 0.14, m * 1.1, 0.9);
        break;
      }
      case 'none':
        break;
    }
    return trim(finish(out, sr, 0.97), sr);
  };
}

/** Cápsula de latão caindo e quicando no chão duro. */
export const casing: Recipe = (rng, sr) => {
  const out = buffer(0.8, sr);
  let t = 0.005;
  let g = 1;
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++) {
    const f = rng.range(3200, 6200);
    modes(out, sr, t, [
      { f, a: 1, d: rng.range(0.04, 0.09) },
      { f: f * 2.71, a: 0.5, d: 0.03 },
      { f: f * 5.1, a: 0.25, d: 0.015 },
    ], g, rng);
    t += rng.range(0.07, 0.16) * g;
    g *= rng.range(0.4, 0.6);
  }
  return trim(finish(out, sr, 0.6), sr);
};

/** Gatilho sem bala: o cão cai no vazio. */
export const dryFire: Recipe = (rng, sr) => {
  const out = buffer(0.2, sr);
  click(out, sr, rng, 0.004, 1, 1.1);
  click(out, sr, rng, rng.range(0.03, 0.05), 0.3, 0.8);
  return trim(finish(out, sr, 0.5), sr);
};

/** Arma emperrando: clique seco e o ferrolho travando no meio. */
export const jam: Recipe = (rng, sr) => {
  const out = buffer(0.4, sr);
  click(out, sr, rng, 0.004, 1, 0.9);
  burst(out, sr, rng, { at: 0.03, dur: 0.05, tau: 0.02, gain: 0.4, type: 'bandpass', freq: 1800, q: 1.2, color: 'pink' });
  click(out, sr, rng, 0.08, 0.7, 0.6);
  return trim(finish(out, sr, 0.55), sr);
};

/** Recarga por tipo (dura ~o tempo da ação no jogo). */
export function reload(c: GunClass): Recipe {
  return (rng, sr) => {
    const out = buffer(2, sr);
    const slide = (at: number, g: number, f = 2400) => burst(out, sr, rng, { at, dur: 0.08, tau: 0.03, gain: g, type: 'bandpass', freq: rng.vary(f, 0.15), q: 1.2, color: 'pink' });
    const clack = (at: number, g: number) => {
      burst(out, sr, rng, { at, dur: 0.02, tau: 0.005, gain: g * 0.7, type: 'lowpass', freq: 1500, q: 0.8 });
      modes(out, sr, at, [{ f: rng.range(1100, 1800), a: 1, d: 0.03 }, { f: rng.range(2800, 3600), a: 0.5, d: 0.02 }], g * 0.4, rng);
      click(out, sr, rng, at + 0.002, g * 0.5, 0.9);
    };
    switch (c) {
      case 'pistola9':
      case 'pistola40':
      case 'smg': {
        click(out, sr, rng, 0.05, 0.6, 1);
        slide(0.1, 0.35);
        const t = rng.range(0.5, 0.65);
        slide(t - 0.06, 0.3);
        clack(t, 0.9);
        const s = t + rng.range(0.25, 0.35);
        click(out, sr, rng, s, 0.9, 0.9);
        slide(s + 0.01, 0.4, 2800);
        clack(s + 0.07, 0.8);
        break;
      }
      case 'revolver': {
        click(out, sr, rng, 0.05, 0.6, 0.8);
        for (let i = 0; i < 6; i++) modes(out, sr, 0.25 + rng.range(0, 0.12), [{ f: rng.range(3500, 6000), a: 1, d: 0.05 }], 0.18, rng);
        for (let i = 0; i < 6; i++) {
          const t = 0.55 + i * rng.range(0.11, 0.15);
          click(out, sr, rng, t, 0.3, rng.range(1.1, 1.3));
          slide(t - 0.03, 0.1, 3200);
        }
        click(out, sr, rng, 1.45, 0.9, 0.8);
        break;
      }
      case 'espingarda': {
        for (let i = 0; i < 4; i++) {
          const t = 0.08 + i * rng.range(0.24, 0.3);
          slide(t, 0.25, 1600);
          click(out, sr, rng, t + 0.07, 0.5, 0.75);
        }
        slide(1.25, 0.45, 1800);
        clack(1.32, 0.8);
        slide(1.4, 0.4, 2100);
        clack(1.47, 1);
        break;
      }
      case 'dupla': {
        clack(0.05, 0.7);
        burst(out, sr, rng, { at: 0.12, dur: 0.05, tau: 0.02, gain: 0.3, type: 'lowpass', freq: 900, q: 0.7 });
        for (let i = 0; i < 2; i++) modes(out, sr, 0.3 + i * 0.08, [{ f: rng.range(900, 1400), a: 1, d: 0.04 }], 0.3, rng);
        for (let i = 0; i < 2; i++) {
          slide(0.6 + i * 0.25, 0.25, 1500);
          burst(out, sr, rng, { at: 0.68 + i * 0.25, dur: 0.03, tau: 0.01, gain: 0.4, type: 'lowpass', freq: 800, q: 0.8 });
        }
        clack(1.2, 1);
        break;
      }
      case 'rifle22':
      case 'rifle308': {
        click(out, sr, rng, 0.05, 0.7, 0.8);
        slide(0.12, 0.4, 2300);
        for (let i = 0; i < 4; i++) click(out, sr, rng, 0.4 + i * 0.15, 0.4, 1.1);
        slide(1.05, 0.4, 2500);
        clack(1.15, 0.9);
        break;
      }
    }
    return trim(finish(out, sr, 0.6), sr);
  };
}

/** Bala acertando: parede (reboco voando), madeira, metal (com ricochete às vezes) ou carne. */
export function bulletImpact(m: 'parede' | 'madeira' | 'metal'): Recipe {
  return (rng, sr) => {
    const out = buffer(0.9, sr);
    burst(out, sr, rng, { at: 0.003, dur: 0.008, tau: 0.0015, gain: 0.9, type: 'highpass', freq: 1800, q: 0.7 });
    if (m === 'parede') {
      burst(out, sr, rng, { at: 0.004, dur: 0.12, tau: 0.025, gain: 0.45, type: 'highpass', freq: 1400, q: 0.6 });
      thump(out, sr, 0.004, 180, 90, 0.05, 0.35);
      for (let i = 0; i < 14; i++) {
        const f = rng.range(1200, 4500);
        modes(out, sr, 0.02 + Math.pow(rng.next(), 1.4) * 0.3, [{ f, a: 1, d: 0.006 }], rng.range(0.04, 0.12), rng);
      }
    } else if (m === 'madeira') {
      thump(out, sr, 0.004, 160, 90, 0.06, 0.5);
      for (let i = 0; i < 6; i++) burst(out, sr, rng, { at: 0.005 + rng.range(0, 0.02), dur: 0.005, tau: 0.0012, gain: rng.range(0.2, 0.5), type: 'highpass', freq: 2500, q: 0.7 });
    } else {
      const f = rng.range(1500, 3400);
      modes(out, sr, 0.004, [{ f, a: 1, d: rng.range(0.15, 0.4) }, { f: f * 2.76, a: 0.4, d: 0.1 }], 0.5, rng);
      if (rng.chance(0.45)) {
        // Ricochete: o assobio da bala desviando, caindo de tom.
        const s = Math.round(0.02 * sr);
        const n = Math.round(rng.range(0.25, 0.45) * sr);
        const f0 = rng.range(3200, 4600);
        const f1 = f0 * rng.range(0.35, 0.5);
        let ph = 0;
        for (let i = 0; i < n && s + i < out.length; i++) {
          const t = i / n;
          const f2 = f0 * Math.pow(f1 / f0, t) * (1 + 0.02 * Math.sin(t * 60));
          ph += (2 * Math.PI * f2) / sr;
          out[s + i] = out[s + i]! + Math.sin(ph) * Math.pow(1 - t, 2) * Math.min(1, t * 30) * 0.35;
        }
      }
    }
    return trim(finish(out, sr, 0.8), sr);
  };
}
