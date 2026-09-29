/**
 * Materiais batidos: cada um vibra em modos com razões e quedas típicas.
 * Madeira = grave e curta (oco); metal = parciais desafinadas e longas;
 * vidro = agudo e cristalino; cerâmica = estalo agudo e seco; concreto =
 * quase só baque; lataria = chapa grande (grave, meio abafada).
 * `size` > 1 = peça maior (mais grave, soa mais tempo).
 */
import { burst, modes, type Mode, type Rng } from '../dsp';

export type Material = 'madeira' | 'metal' | 'vidro' | 'ceramica' | 'concreto' | 'lataria' | 'plastico' | 'latao';

const RATIOS: Record<Material, readonly number[]> = {
  // Tábua/porta: modos de placa de madeira.
  madeira: [1, 2.27, 3.86, 5.3, 7.1],
  // Barra/cano de aço livre (quase a série de Euler-Bernoulli).
  metal: [1, 2.76, 5.4, 8.93, 13.34],
  vidro: [1, 2.32, 3.1, 4.7, 6.2],
  ceramica: [1, 1.93, 3.2, 4.4],
  concreto: [1, 1.6, 2.4],
  lataria: [1, 1.41, 1.87, 2.33, 2.98, 3.6],
  plastico: [1, 2.1, 3.4],
  // Cápsula de bala: tubinho de latão.
  latao: [1, 2.71, 5.1, 8.2],
};

const BASE: Record<Material, { f: number; d: number; hfd: number }> = {
  madeira: { f: 160, d: 0.1, hfd: 0.35 },
  metal: { f: 520, d: 0.9, hfd: 0.6 },
  vidro: { f: 1800, d: 0.18, hfd: 0.5 },
  ceramica: { f: 1700, d: 0.05, hfd: 0.4 },
  concreto: { f: 140, d: 0.035, hfd: 0.3 },
  lataria: { f: 120, d: 0.22, hfd: 0.4 },
  plastico: { f: 700, d: 0.03, hfd: 0.4 },
  latao: { f: 3600, d: 0.07, hfd: 0.5 },
};

/** Modos de uma peça do material, tamanho e amortecimento (0..1 = segurada/abafada). */
export function materialModes(rng: Rng, m: Material, size = 1, damp = 0): Mode[] {
  const b = BASE[m];
  const f0 = rng.vary(b.f / Math.pow(size, 0.8), 0.12);
  const out: Mode[] = [];
  RATIOS[m].forEach((r, k) => {
    const f = f0 * r * rng.vary(1, m === 'metal' || m === 'lataria' ? 0.04 : 0.02);
    const a = rng.vary(1 / (1 + k * 0.9), 0.3);
    // Agudos morrem antes; peça maior soa mais; mão/pano segurando abafa.
    const d = b.d * Math.pow(size, 0.5) * Math.pow(b.hfd, k) * (1 - damp * 0.8) * rng.vary(1, 0.2);
    out.push({ f, a, d: Math.max(0.004, d) });
  });
  return out;
}

/**
 * Uma batida no material: estalo de contato (ruído curto) + a peça vibrando.
 * `hard` = o que bate é duro (metal, pedra) → estalo mais agudo.
 */
export function hit(
  out: Float32Array,
  sr: number,
  rng: Rng,
  o: { at: number; m: Material; gain: number; size?: number; damp?: number; hard?: number },
): void {
  const hard = o.hard ?? 0.5;
  const size = o.size ?? 1;
  // Contato: quanto mais duro, mais curto e agudo.
  burst(out, sr, rng, {
    at: o.at,
    dur: 0.012 + (1 - hard) * 0.02,
    tau: 0.001 + (1 - hard) * 0.004,
    gain: o.gain * (0.35 + hard * 0.4),
    type: 'bandpass',
    freq: rng.vary(1200 + hard * 3500, 0.2),
    q: 0.6,
  });
  // Corpo grave do contato (o peso da pancada).
  burst(out, sr, rng, { at: o.at, dur: 0.04 * size, tau: 0.008 * size, gain: o.gain * 0.45, type: 'lowpass', freq: BASE[o.m].f * 2.2, q: 0.7 });
  modes(out, sr, o.at, materialModes(rng, o.m, size, o.damp ?? 0), o.gain * 0.5, rng);
}
