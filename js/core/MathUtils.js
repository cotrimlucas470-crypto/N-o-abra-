/** Utilidades matemáticas e de vetor. Objetos simples {x,y,z} para serialização barata. */

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const Mathf = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  clamp01: (v) => (v < 0 ? 0 : v > 1 ? 1 : v),
  lerp: (a, b, t) => a + (b - a) * Mathf.clamp01(t),
  lerpUnclamped: (a, b, t) => a + (b - a) * t,
  moveTowards(a, b, maxDelta) {
    const d = b - a;
    return Math.abs(d) <= maxDelta ? b : a + Math.sign(d) * maxDelta;
  },
  sign: Math.sign,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  sqrt: Math.sqrt,
  pow: Math.pow,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sin: Math.sin,
  cos: Math.cos,
  atan2: Math.atan2,
  PI: Math.PI,
  deg2Rad: DEG,
  rad2Deg: RAD,
  repeat: (t, len) => Mathf.clamp(t - Math.floor(t / len) * len, 0, len),
  pingPong(t, len) { const v = Mathf.repeat(t, len * 2); return len - Math.abs(v - len); },
  approximately: (a, b, eps = 1e-5) => Math.abs(a - b) < eps,
};

export function vec3(x = 0, y = 0, z = 0) { return { x, y, z }; }
export function copyVec(dst, src) { dst.x = src.x; dst.y = src.y; dst.z = src.z ?? 0; return dst; }
export function cloneVec(v) { return { x: v.x, y: v.y, z: v.z ?? 0 }; }

/** Vetor 2D exposto aos scripts do usuário (funções puras, sem alocação escondida em loops). */
export const Vec2 = {
  create: (x = 0, y = 0) => ({ x, y }),
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (a, s) => ({ x: a.x * s, y: a.y * s }),
  dot: (a, b) => a.x * b.x + a.y * b.y,
  length: (a) => Math.hypot(a.x, a.y),
  sqrLength: (a) => a.x * a.x + a.y * a.y,
  distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  normalize(a) { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
  lerp: (a, b, t) => ({ x: Mathf.lerp(a.x, b.x, t), y: Mathf.lerp(a.y, b.y, t) }),
  zero: () => ({ x: 0, y: 0 }),
  one: () => ({ x: 1, y: 1 }),
  up: () => ({ x: 0, y: 1 }),
  right: () => ({ x: 1, y: 0 }),
};

/** Gerador de ids curtos, estável dentro da sessão e serializável. */
let _seq = 0;
export function uid(prefix = 'o') {
  _seq = (_seq + 1) % 1e6;
  return `${prefix}${Date.now().toString(36).slice(-5)}${_seq.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** Cores: aceita "#rrggbb". Conversões usadas por renderer/inspector. */
export function hexToRgb(hex) {
  const h = (hex || '#ffffff').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
export function rgbaString(hex, alpha = 1) {
  if (alpha >= 1) return hex;
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
export function mixHex(hex, factor) {
  // factor > 1 clareia, < 1 escurece. Usado na iluminação simplificada.
  const { r, g, b } = hexToRgb(hex);
  const c = (v) => Math.round(Mathf.clamp(v * factor, 0, 255));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

/** AABB helpers */
export function aabbOverlap(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}
