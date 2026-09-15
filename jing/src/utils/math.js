export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (a, b, v) => {
  const t = clamp(invLerp(a, b, v), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Lerp independente de framerate. `smoothing` = fração restante após 1 segundo.
 * damp(a, b, 0.001, dt) converge igual a 60fps ou a 144fps.
 */
export const damp = (a, b, smoothing, dt) => lerp(a, b, 1 - Math.pow(smoothing, dt));

/** PRNG determinístico — a cena é idêntica a cada carregamento. */
export function makeRandom(seed = 1337) {
  let s = seed >>> 0;
  return function random() {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export const randRange = (rnd, a, b) => a + (b - a) * rnd();
export const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
export const round = (v, casas = 0) => {
  const m = Math.pow(10, casas);
  return Math.round(v * m) / m;
};
