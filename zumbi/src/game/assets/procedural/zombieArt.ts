/**
 * ARTE DOS ZUMBIS, desenhada em código para CADA indivíduo (nada de
 * "modelo repetido com outra cor"): a pele dele com a decomposição dele, o
 * cabelo, a roupa do que ele era (com costura, gola, botão, estampa,
 * bolso), acessórios, sujeira, o sangue de quando morreu e o de cada golpe
 * que levou, mordidas, rasgos, tiros, membros arrancados.
 *
 * Visto de cima, olhando para +x. Partes separadas para animar no jogo:
 *  - pernas: 6 quadros de passada (a perna ferida arrasta);
 *  - tronco (roupa, colete, avental, mochila, feridas);
 *  - braço esquerdo e direito (pivô no ombro: esticam, balançam, agarram);
 *  - cabeça (cabelo, chapéu, óculos, feridas);
 *  - corpo deitado (caído/rastejando; braços à parte) e o CORPO morto
 *    (textura própria e pequena, com braços numa pose e o sangue).
 *
 * Luz vem de cima-esquerda, como no resto do jogo. Unidades em px de mundo;
 * a folha é desenhada em ZOMBIE_RES px por px de mundo (nítido no celular).
 */
import { Random } from '../../core/Random';
import type { BodyPart } from '../../health/Wounds';
import type { TopKind } from '../../zombies/Archetypes';
import type { Zombie } from '../../zombies/Zombie';
import { makeCanvas, mix, rgba, shade, type Ctx } from './canvas';

export const ZOMBIE_RES = 1.5;
export const LEG_FRAMES = 6;

/** Tamanho de cada parte em px de mundo (antes da escala da folha). */
const SIZE = {
  legs: [68, 54],
  torso: [62, 62],
  head: [40, 40],
  arm: [48, 18],
  lying: [132, 64],
} as const;

export interface SheetFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Origem (fração do quadro): centro, ou o ombro no caso do braço. */
  ox: number;
  oy: number;
}

export interface ZombieSheetLayout {
  w: number;
  h: number;
  frames: Record<string, SheetFrame>;
}

/** Onde cada quadro fica na folha (igual para todo zumbi). */
export function sheetLayout(): ZombieSheetLayout {
  const R = ZOMBIE_RES;
  const px = (v: number) => Math.ceil(v * R);
  const frames: Record<string, SheetFrame> = {};
  const lw = px(SIZE.legs[0]);
  const lh = px(SIZE.legs[1]);
  for (let i = 0; i < LEG_FRAMES; i++) frames[`legs${i}`] = { x: i * lw, y: 0, w: lw, h: lh, ox: 0.5, oy: 0.5 };
  let x = 0;
  const y2 = lh;
  frames.lying = { x, y: y2, w: px(SIZE.lying[0]), h: px(SIZE.lying[1]), ox: 0.5, oy: 0.5 };
  x += px(SIZE.lying[0]);
  frames.torso = { x, y: y2, w: px(SIZE.torso[0]), h: px(SIZE.torso[1]), ox: 0.5, oy: 0.5 };
  x += px(SIZE.torso[0]);
  frames.head = { x, y: y2, w: px(SIZE.head[0]), h: px(SIZE.head[1]), ox: 0.5, oy: 0.5 };
  x += px(SIZE.head[0]);
  frames.armL = { x, y: y2, w: px(SIZE.arm[0]), h: px(SIZE.arm[1]), ox: 2 / SIZE.arm[0], oy: 0.5 };
  frames.armR = { x, y: y2 + px(SIZE.arm[1]), w: px(SIZE.arm[0]), h: px(SIZE.arm[1]), ox: 2 / SIZE.arm[0], oy: 0.5 };
  x += px(SIZE.arm[0]);
  return { w: Math.max(lw * LEG_FRAMES, x), h: y2 + Math.max(px(SIZE.lying[1]), px(SIZE.torso[1])), frames };
}

// ============================================================================ cores

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

interface Palette {
  skin: string;
  skinDark: string;
  skinLight: string;
  flesh: string;
  blood: string;
  bloodOld: string;
  bone: string;
  vein: string;
  top: string;
  bottom: string;
  hair: string;
}

function paletteOf(z: Zombie): Palette {
  const L = z.look;
  const d = L.decay;
  // Pele morta: puxa para cinza-esverdeado; muito podre, arroxeado nas manchas.
  const dead = mix(hex(L.skin), '#8c957a', 0.28 + d * 0.42);
  const skin = mix(dead, '#9aa28e', 0.1);
  return {
    skin,
    skinDark: shade(mix(skin, '#4a3a4a', 0.25 + d * 0.2), -0.18),
    skinLight: shade(skin, 0.14),
    flesh: mix('#8a2a24', '#5a2a2a', d * 0.5),
    blood: mix('#6e0f0c', '#3a0e0a', d * 0.6),
    bloodOld: mix('#4a1a10', '#2e1a10', d * 0.5),
    bone: mix('#e8e0c8', '#b8ac88', d),
    vein: rgba('#3a3a5a', 0.25 + d * 0.3),
    top: mix(hex(L.top.color), '#5a5044', L.dirt * 0.35 + d * 0.1),
    bottom: mix(hex(L.bottom.color), '#4a4034', L.dirt * 0.3),
    hair: mix(hex(L.hair.color), '#5a5a50', d * 0.2),
  };
}

// ============================================================================ utilidades

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

/** Preenchimento com luz de cima-esquerda. */
function lit(ctx: Ctx, color: string, x0: number, y0: number, x1: number, y1: number, amount = 0.16): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, shade(color, amount));
  g.addColorStop(1, shade(color, -amount * 1.3));
  return g;
}

function stroke(ctx: Ctx, color: string, w: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Mancha de sangue irregular com respingos. */
function splat(ctx: Ctx, r: Random, x: number, y: number, size: number, color: string, alpha = 0.9): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = size * r.range(0.55, 1.05);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * r.range(0.7, 1);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  const drops = r.int(1, 4);
  for (let i = 0; i < drops; i++) {
    const a = r.range(0, Math.PI * 2);
    const dd = size * r.range(1.1, 1.9);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * dd, y + Math.sin(a) * dd, size * r.range(0.08, 0.2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Escorrido de sangue (fio). */
function drip(ctx: Ctx, r: Random, x: number, y: number, len: number, dir: number, color: string, w = 1.1): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  let cx = x;
  let cy = y;
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    cx += Math.cos(dir + r.range(-0.4, 0.4)) * (len / steps);
    cy += Math.sin(dir + r.range(-0.4, 0.4)) * (len / steps);
    ctx.lineTo(cx, cy);
  }
  stroke(ctx, color, w);
}

/** Sujeira/manchas dentro da forma atual (clip já feito). */
function grime(ctx: Ctx, r: Random, cx: number, cy: number, rx: number, ry: number, amount: number, color: string): void {
  const n = Math.round(amount * 26);
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = r.range(0.06, 0.2) * (0.5 + amount);
    ctx.fillStyle = color;
    ellipse(ctx, cx + r.range(-rx, rx), cy + r.range(-ry, ry), r.range(0.8, 3.2), r.range(0.6, 2.2), r.range(0, 3));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Mordida: arco de dentes com carne exposta. */
function biteMark(ctx: Ctx, r: Random, x: number, y: number, s: number, p: Palette): void {
  ctx.fillStyle = p.flesh;
  ellipse(ctx, x, y, 3.2 * s, 2.4 * s, r.range(0, Math.PI));
  ctx.fill();
  ctx.fillStyle = p.blood;
  ellipse(ctx, x + 0.4 * s, y, 2 * s, 1.4 * s, 0);
  ctx.fill();
  // Marcas dos dentes em volta.
  ctx.fillStyle = shade(p.flesh, -0.35);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.fillRect(x + Math.cos(a) * 3.6 * s - 0.4, y + Math.sin(a) * 2.8 * s - 0.4, 0.9, 0.9);
  }
  splat(ctx, r, x + r.range(-2, 2), y + r.range(-2, 2), 3.6 * s, p.blood, 0.55);
}

/** Rasgo na roupa mostrando pele/carne. */
function tear(ctx: Ctx, r: Random, x: number, y: number, s: number, p: Palette, deep: boolean): void {
  ctx.beginPath();
  const n = 8;
  const a0 = r.range(0, Math.PI);
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * Math.PI * 2;
    const rr = (i % 2 ? 2.2 : 4.2) * s * r.range(0.8, 1.2);
    const px = x + Math.cos(a) * rr * 1.3;
    const py = y + Math.sin(a) * rr * 0.8;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = deep ? p.flesh : p.skinDark;
  ctx.fill();
  stroke(ctx, rgba('#1a0a08', 0.5), 0.6);
  if (deep) splat(ctx, r, x, y, 2.4 * s, p.blood, 0.7);
}

/** Corte (talho). */
function slash(ctx: Ctx, r: Random, x: number, y: number, s: number, p: Palette): void {
  const a = r.range(-1.2, 1.2);
  const l = r.range(4, 7) * s;
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l);
  ctx.quadraticCurveTo(x + r.range(-1, 1), y + r.range(-1, 1), x + Math.cos(a) * l, y + Math.sin(a) * l);
  stroke(ctx, p.flesh, 1.8 * s);
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(a) * l * 0.8, y - Math.sin(a) * l * 0.8);
  ctx.lineTo(x + Math.cos(a) * l * 0.8, y + Math.sin(a) * l * 0.8);
  stroke(ctx, p.blood, 0.8 * s);
  drip(ctx, r, x, y, 4 * s, Math.PI / 2 + r.range(-0.6, 0.6), p.blood, 0.8);
}

/** Buraco de bala. */
function bulletHole(ctx: Ctx, r: Random, x: number, y: number, s: number, p: Palette): void {
  splat(ctx, r, x, y, 3.4 * s, p.blood, 0.6);
  ctx.fillStyle = '#140606';
  ellipse(ctx, x, y, 1.2 * s, 1.1 * s);
  ctx.fill();
  ctx.strokeStyle = p.flesh;
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

/** Hematoma/afundado de pancada. */
function bruise(ctx: Ctx, r: Random, x: number, y: number, s: number, p: Palette): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, 5 * s);
  g.addColorStop(0, rgba('#2a0c14', 0.75));
  g.addColorStop(1, rgba('#2a0c14', 0));
  ctx.fillStyle = g;
  ellipse(ctx, x, y, 5 * s, 4 * s, r.range(0, 3));
  ctx.fill();
  splat(ctx, r, x, y, 2 * s, p.blood, 0.45);
}

function charred(ctx: Ctx, r: Random, x: number, y: number, s: number): void {
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = rgba(r.pick(['#1a1410', '#2a1e14', '#3a2a1a']), 0.8);
    ellipse(ctx, x + r.range(-4, 4) * s, y + r.range(-3, 3) * s, r.range(1.5, 3.5) * s, r.range(1, 2.5) * s, r.range(0, 3));
    ctx.fill();
  }
}

type HitKind = Zombie['hits'][number]['kind'];

function hitMark(ctx: Ctx, r: Random, kind: HitKind, x: number, y: number, s: number, p: Palette): void {
  if (kind === 'tiro') bulletHole(ctx, r, x, y, s, p);
  else if (kind === 'impacto') bruise(ctx, r, x, y, s, p);
  else if (kind === 'queimado') charred(ctx, r, x, y, s);
  else slash(ctx, r, x, y, s, p);
}

// ============================================================================ medidas do corpo

export interface Dims {
  s: number;
  /** Meia largura dos ombros e profundidade do tronco. */
  W: number;
  D: number;
  headR: number;
  armLen: number;
  armW: number;
  legY: number;
  legW: number;
}

export function zombieDims(z: Zombie): Dims {
  const L = z.look;
  const s = Math.min(1.14, Math.max(0.84, L.scale));
  const b = L.build;
  const fem = L.female ? 0.93 : 1;
  return {
    s,
    W: 19.2 * (0.84 + b * 0.32) * s * fem,
    D: 10.6 * (0.88 + b * 0.42) * s,
    headR: 8.1 * s * (L.female ? 0.96 : 1),
    armLen: 33 * s,
    armW: 7.6 * (0.85 + b * 0.35) * s,
    legY: 6.8 * (0.9 + b * 0.25) * s,
    legW: 7.9 * (0.85 + b * 0.35) * s,
  };
}

const LONG_SLEEVE: ReadonlySet<TopKind> = new Set(['jaqueta', 'casaco', 'moletom', 'terno', 'jaleco', 'doma', 'macacao', 'camuflado', 'cardiga', 'pijama', 'camisa', 'uniforme']);
const NO_SLEEVE: ReadonlySet<TopKind> = new Set(['regata', 'vestido']);

// ============================================================================ tronco

function torsoPath(ctx: Ctx, d: Dims, inset = 0): void {
  const W = d.W - inset;
  const D = d.D - inset * 0.6;
  ctx.beginPath();
  ctx.moveTo(D * 0.9, -W * 0.55);
  ctx.bezierCurveTo(D * 1.15, -W * 0.2, D * 1.15, W * 0.2, D * 0.9, W * 0.55);
  ctx.bezierCurveTo(D * 0.7, W * 0.95, D * 0.1, W * 1.02, -D * 0.35, W * 0.96);
  ctx.bezierCurveTo(-D * 1.05, W * 0.85, -D * 1.1, W * 0.35, -D * 1.05, 0);
  ctx.bezierCurveTo(-D * 1.1, -W * 0.35, -D * 1.05, -W * 0.85, -D * 0.35, -W * 0.96);
  ctx.bezierCurveTo(D * 0.1, -W * 1.02, D * 0.7, -W * 0.95, D * 0.9, -W * 0.55);
  ctx.closePath();
}

function drawTorso(ctx: Ctx, z: Zombie, p: Palette, d: Dims): void {
  const L = z.look;
  const r = new Random(z.seed ^ 0x70f50);
  const kind = L.top.kind;
  const { W, D } = d;
  // Mochila (atrás).
  if (L.backpack !== undefined) {
    const c = hex(L.backpack);
    ctx.fillStyle = lit(ctx, c, -D - 8, -10, -D + 4, 10);
    ctx.beginPath();
    ctx.roundRect(-D - 9, -W * 0.62, 12, W * 1.24, 4);
    ctx.fill();
    stroke(ctx, shade(c, -0.5), 1);
    ctx.fillStyle = shade(c, -0.18);
    ctx.fillRect(-D - 8.5, -W * 0.3, 5, W * 0.6);
    ctx.fillStyle = shade(c, 0.25);
    ctx.fillRect(-D - 7.5, -W * 0.52, 1.2, W * 1.04);
  }
  // Ombros de pele (regata/vestido deixam à mostra).
  if (NO_SLEEVE.has(kind)) {
    torsoPath(ctx, d);
    ctx.fillStyle = lit(ctx, p.skin, -D, -W, D, W, 0.12);
    ctx.fill();
    stroke(ctx, p.skinDark, 1);
  }
  // Roupa.
  const inset = NO_SLEEVE.has(kind) ? 3.2 : 0;
  torsoPath(ctx, d, inset);
  ctx.fillStyle = lit(ctx, p.top, -D, -W, D * 0.8, W, kind === 'jaqueta' ? 0.24 : 0.16);
  ctx.fill();
  ctx.save();
  torsoPath(ctx, d, inset);
  ctx.clip();
  topDetails(ctx, z, p, d, r);
  // Vinco/costura das costas e sombra do lado de baixo.
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#000';
  ellipse(ctx, -D * 0.2, W * 0.75, D * 1.4, W * 0.45);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Colete e avental por cima da roupa.
  if (L.vest) vest(ctx, L.vest, d, r);
  if (L.apron !== undefined) apron(ctx, hex(L.apron), d, L.dirt, r);
  grime(ctx, r, 0, 0, D, W, L.dirt, '#3a2a1a');
  // Sangue de quando morreu: escorrido da frente/pescoço.
  const blood = L.blood;
  const nb = Math.round(2 + blood * 7);
  for (let i = 0; i < nb; i++) {
    const front = r.chance(0.65);
    splat(ctx, r, front ? r.range(D * 0.1, D * 1.1) : r.range(-D, D), r.range(-W * 0.7, W * 0.7), r.range(1.6, 4.6) * (0.6 + blood), r.chance(0.6) ? p.bloodOld : p.blood, r.range(0.35, 0.8));
  }
  for (let i = 0; i < Math.round(blood * 5); i++) drip(ctx, r, r.range(0, D), r.range(-W * 0.4, W * 0.4), r.range(4, 10), r.range(Math.PI * 0.6, Math.PI * 1.4), p.bloodOld, 1.2);
  // Marcas de morte (tronco e pescoço) e ferimentos de jogo.
  for (const m of L.marks) {
    if (m.part === 'tronco') {
      const x = r.range(-D * 0.6, D * 0.8);
      const y = r.range(-W * 0.6, W * 0.6);
      if (m.kind === 'mordida') biteMark(ctx, r, x, y, 1, p);
      else if (m.kind === 'rasgo') tear(ctx, r, x, y, 1.2, p, true);
      else if (m.kind === 'queimado') charred(ctx, r, x, y, 1.3);
      else slash(ctx, r, x, y, 1, p);
    }
  }
  const hr = new Random(z.seed ^ 0x417);
  for (const h of z.hits) if (h.part === 'tronco') hitMark(ctx, hr, h.kind, hr.range(-D * 0.7, D * 0.8), hr.range(-W * 0.65, W * 0.65), 1, p);
  ctx.restore();
  torsoPath(ctx, d, inset);
  stroke(ctx, rgba('#0e0a08', 0.55), 0.8);
  // Alças da mochila por cima dos ombros.
  if (L.backpack !== undefined) {
    const c = shade(hex(L.backpack), -0.25);
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-D * 0.9, sy * W * 0.55);
      ctx.quadraticCurveTo(0, sy * W * 0.62, D * 0.7, sy * W * 0.42);
      stroke(ctx, c, 2.4);
    }
  }
  // Sombra da cabeça no ombro (volume).
  const sh = ctx.createRadialGradient(0, 2, 2, 0, 2, 11 * d.s);
  sh.addColorStop(0, rgba('#000000', 0.35));
  sh.addColorStop(1, rgba('#000000', 0));
  ctx.fillStyle = sh;
  ellipse(ctx, 0, 2, 11 * d.s, 11 * d.s);
  ctx.fill();
  // Pescoço (a cabeça vem por cima, um pouco à frente).
  const neck = z.parts.pescoco;
  ctx.fillStyle = lit(ctx, p.skin, -4, -4, 4, 4, 0.1);
  ellipse(ctx, 1.5 * d.s, 0, 4.4 * d.s, 4.8 * d.s);
  ctx.fill();
  if (neck < 0.7 || L.marks.some((m) => m.part === 'pescoco')) {
    const nr = new Random(z.seed ^ 0x9ec);
    biteMark(ctx, nr, 3 * d.s, nr.range(-3, 3) * d.s, 0.9, p);
    for (let i = 0; i < 3; i++) drip(ctx, nr, 2 * d.s, nr.range(-3, 3), nr.range(5, 11), nr.range(Math.PI * 0.7, Math.PI * 1.3), p.blood, 1.4);
  }
  // Tocos dos braços arrancados.
  for (const [side, part] of [[-1, 'bracoE'], [1, 'bracoD']] as const) {
    if (z.parts[part] > 0) continue;
    const y = side * W * 0.86;
    splat(ctx, r, -1, y, 4.2, p.blood, 0.9);
    ctx.fillStyle = p.flesh;
    ellipse(ctx, -1, y, 3.4, 2.8);
    ctx.fill();
    ctx.fillStyle = p.bone;
    ellipse(ctx, -0.6, y, 1.2, 1.1);
    ctx.fill();
  }
}

function topDetails(ctx: Ctx, z: Zombie, p: Palette, d: Dims, r: Random): void {
  const { W, D } = d;
  const k = z.look.top.kind;
  const dark = shade(p.top, -0.35);
  const light = shade(p.top, 0.22);
  const collar = (color: string) => {
    ctx.beginPath();
    ctx.ellipse(1.5 * d.s, 0, 6.2 * d.s, 6.8 * d.s, 0, 0, Math.PI * 2);
    stroke(ctx, color, 1.4);
  };
  switch (k) {
    case 'camiseta':
    case 'regata':
      collar(dark);
      // Estampa no peito às vezes.
      if (r.chance(0.35)) {
        ctx.fillStyle = rgba(r.pick(['#e8e0d0', '#1a1a1a', '#c8342a', '#e8c84a']), 0.7);
        ctx.fillRect(D * 0.35, -W * 0.28, 3, W * 0.56);
      }
      break;
    case 'polo':
    case 'scrub':
      collar(dark);
      ctx.beginPath();
      ctx.moveTo(5 * d.s, 0);
      ctx.lineTo(D * 1.05, 0);
      stroke(ctx, dark, 1);
      if (k === 'polo') for (const t of [0.55, 0.8]) {
        ctx.fillStyle = light;
        ellipse(ctx, D * t + 2, 0, 0.8, 0.8);
        ctx.fill();
      } else {
        ctx.fillStyle = dark;
        ctx.fillRect(D * 0.3, W * 0.25, 3.5, 4);
      }
      break;
    case 'camisa':
    case 'uniforme':
    case 'pijama': {
      if (k === 'pijama') {
        // Listras.
        ctx.globalAlpha = 0.35;
        for (let y = -W; y < W; y += 3.2) {
          ctx.fillStyle = y % 6.4 < 3.2 ? light : dark;
          ctx.fillRect(-D * 1.2, y, D * 2.4, 1.3);
        }
        ctx.globalAlpha = 1;
      }
      collar(dark);
      // Gola de camisa (duas pontas) e carreira de botões.
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(1 * d.s, sy * 5.5 * d.s);
        ctx.lineTo(6.5 * d.s, sy * 1.5);
        ctx.lineTo(3 * d.s, sy * 6.5 * d.s);
        ctx.closePath();
        ctx.fillStyle = light;
        ctx.fill();
        stroke(ctx, dark, 0.7);
      }
      ctx.beginPath();
      ctx.moveTo(6 * d.s, 0);
      ctx.lineTo(D * 1.1, 0);
      stroke(ctx, dark, 0.8);
      for (let t = 0.5; t < 1.05; t += 0.22) {
        ctx.fillStyle = light;
        ellipse(ctx, D * t + 1.5, 0.9, 0.55, 0.55);
        ctx.fill();
      }
      if (k === 'uniforme') {
        // Platinas nos ombros, distintivo, rádio.
        ctx.fillStyle = shade(p.top, -0.2);
        for (const sy of [-1, 1]) ctx.fillRect(-2, sy * W * 0.78 - 1.6, 6, 3.2);
        ctx.fillStyle = '#d8b440';
        ellipse(ctx, D * 0.55, -W * 0.38, 1.7, 1.5);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(D * 0.3, W * 0.4, 3.5, 2.4);
      }
      break;
    }
    case 'moletom': {
      // Capuz nas costas e cordões.
      ctx.fillStyle = shade(p.top, -0.12);
      ellipse(ctx, -D * 0.85, 0, 5.5 * d.s, 7.5 * d.s);
      ctx.fill();
      stroke(ctx, dark, 0.9);
      collar(dark);
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(5 * d.s, sy * 2.2);
        ctx.lineTo(D * 1.05, sy * 3);
        stroke(ctx, '#d8d0c0', 0.8);
      }
      // Bolso canguru.
      ctx.beginPath();
      ctx.roundRect(D * 0.45, -W * 0.35, D * 0.55, W * 0.7, 2);
      stroke(ctx, dark, 0.8);
      break;
    }
    case 'jaqueta':
    case 'casaco':
    case 'camuflado': {
      if (k === 'camuflado') {
        for (let i = 0; i < 26; i++) {
          ctx.fillStyle = rgba(r.pick(['#3a4a2a', '#5a6a3a', '#6a5a3a', '#2a3a22']), 0.75);
          ellipse(ctx, r.range(-D * 1.2, D * 1.2), r.range(-W, W), r.range(1.5, 4), r.range(1, 2.6), r.range(0, 3));
          ctx.fill();
        }
      }
      // Gola levantada e zíper.
      ctx.beginPath();
      ctx.ellipse(1 * d.s, 0, 7.2 * d.s, 8 * d.s, 0, -Math.PI * 0.55, Math.PI * 0.55);
      stroke(ctx, k === 'casaco' ? shade(p.top, 0.3) : dark, k === 'casaco' ? 3 : 2);
      ctx.beginPath();
      ctx.moveTo(7 * d.s, 0);
      ctx.lineTo(D * 1.12, 0);
      stroke(ctx, '#8a8a8a', 0.9);
      // Costuras/brilho (couro).
      if (k === 'jaqueta') {
        ctx.globalAlpha = 0.35;
        ellipse(ctx, -D * 0.2, -W * 0.45, D * 0.5, W * 0.2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-D * 0.5, sy * W * 0.5);
        ctx.lineTo(D * 0.6, sy * W * 0.45);
        stroke(ctx, rgba('#000000', 0.25), 0.8);
      }
      break;
    }
    case 'terno': {
      // Camisa branca em V, gravata, lapelas.
      ctx.beginPath();
      ctx.moveTo(2 * d.s, -5 * d.s);
      ctx.lineTo(D * 1.1, -1.5);
      ctx.lineTo(D * 1.1, 1.5);
      ctx.lineTo(2 * d.s, 5 * d.s);
      ctx.closePath();
      ctx.fillStyle = '#e8e4da';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(5 * d.s, 0);
      ctx.lineTo(D * 1.1, 0);
      stroke(ctx, r.pick(['#8a1a1a', '#1a2a5a', '#3a3a3a', '#6a4a1a']), 1.8);
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(2 * d.s, sy * 5 * d.s);
        ctx.lineTo(D * 0.9, sy * 3.5);
        stroke(ctx, light, 1);
      }
      break;
    }
    case 'jaleco':
    case 'doma': {
      collar(dark);
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(2 * d.s, sy * 5.5 * d.s);
        ctx.lineTo(D * 1.05, sy * (k === 'doma' ? 4 : 1.2));
        stroke(ctx, shade(p.top, -0.18), 1);
      }
      if (k === 'doma') {
        for (const sy of [-3.2, 3.2]) for (let t = 0.45; t < 1.05; t += 0.2) {
          ctx.fillStyle = '#cfc8b8';
          ellipse(ctx, D * t + 1, sy, 0.8, 0.8);
          ctx.fill();
        }
      } else {
        // Bolso com caneta.
        ctx.beginPath();
        ctx.rect(D * 0.45, -W * 0.5, 3.6, 4.5);
        stroke(ctx, shade(p.top, -0.2), 0.7);
        ctx.beginPath();
        ctx.moveTo(D * 0.5 + 1, -W * 0.5 - 1);
        ctx.lineTo(D * 0.5 + 1, -W * 0.5 + 2);
        stroke(ctx, '#2a4a9a', 0.8);
      }
      break;
    }
    case 'macacao': {
      ctx.beginPath();
      ctx.moveTo(6 * d.s, 0);
      ctx.lineTo(D * 1.12, 0);
      stroke(ctx, '#9a9a9a', 1);
      ctx.beginPath();
      ctx.rect(D * 0.35, W * 0.2, 4, 4.5);
      stroke(ctx, dark, 0.8);
      // Graxa.
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = rgba('#141008', 0.35);
        ellipse(ctx, r.range(-D, D), r.range(-W, W), r.range(1.5, 4), r.range(1, 2.5), r.range(0, 3));
        ctx.fill();
      }
      collar(dark);
      break;
    }
    case 'vestido': {
      // Estampa florida/bolinhas e alças.
      const dots = r.pick(['#f2f0e8', '#e8c84a', '#1a1a1a', '#c8342a']);
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = rgba(dots, 0.55);
        ellipse(ctx, r.range(-D * 1.2, D * 1.2), r.range(-W, W), 0.9, 0.9);
        ctx.fill();
      }
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-D * 0.5, sy * W * 0.55);
        ctx.lineTo(D * 0.6, sy * W * 0.5);
        stroke(ctx, dark, 1.4);
      }
      break;
    }
    case 'cardiga': {
      ctx.globalAlpha = 0.28;
      for (let x = -D * 1.2; x < D * 1.2; x += 1.8) {
        ctx.beginPath();
        ctx.moveTo(x, -W);
        ctx.lineTo(x, W);
        stroke(ctx, dark, 0.6);
      }
      ctx.globalAlpha = 1;
      collar(dark);
      ctx.beginPath();
      ctx.moveTo(6 * d.s, 0);
      ctx.lineTo(D * 1.1, 0);
      stroke(ctx, dark, 0.9);
      for (let t = 0.5; t < 1.05; t += 0.2) {
        ctx.fillStyle = '#d8ccb0';
        ellipse(ctx, D * t + 1.5, 1.4, 0.7, 0.7);
        ctx.fill();
      }
      break;
    }
  }
}

function vest(ctx: Ctx, kind: NonNullable<Zombie['look']['vest']>, d: Dims, r: Random): void {
  const { W, D } = d;
  if (kind === 'balistico') {
    torsoPath(ctx, d, 3.2);
    ctx.fillStyle = lit(ctx, '#34393d', -D, -W, D, W, 0.14);
    ctx.fill();
    stroke(ctx, rgba('#0a0c0e', 0.5), 0.6);
    // Faixas MOLLE e bolsos.
    for (let x = -D * 0.6; x < D * 0.9; x += 2.6) {
      ctx.beginPath();
      ctx.moveTo(x, -W * 0.55);
      ctx.lineTo(x, W * 0.55);
      stroke(ctx, rgba('#000000', 0.3), 0.6);
    }
    ctx.fillStyle = '#23272a';
    ctx.fillRect(D * 0.3, -W * 0.5, 4.2, 5);
    ctx.fillRect(D * 0.3, W * 0.2, 4.2, 5);
    if (r.chance(0.6)) {
      ctx.fillStyle = '#d8d0b0';
      ctx.fillRect(-D * 0.8, -3, 2, 6);
    }
  } else if (kind === 'refletivo') {
    torsoPath(ctx, d, 2.6);
    ctx.fillStyle = lit(ctx, '#e8762a', -D, -W, D, W, 0.14);
    ctx.fill();
    stroke(ctx, '#a84a14', 0.8);
    for (const x of [-D * 0.2, D * 0.45]) {
      ctx.fillStyle = '#d8dcd8';
      ctx.fillRect(x, -W, 2, W * 2);
      ctx.fillStyle = rgba('#ffffff', 0.5);
      ctx.fillRect(x, -W, 0.7, W * 2);
    }
  } else {
    torsoPath(ctx, d, 3);
    ctx.fillStyle = lit(ctx, '#1c1c20', -D, -W, D, W, 0.1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, -6);
    ctx.lineTo(D * 1.1, 0);
    ctx.lineTo(2, 6);
    ctx.fillStyle = '#e8e4da';
    ctx.fill();
    for (let t = 0.55; t < 1; t += 0.2) {
      ctx.fillStyle = '#6a6a6a';
      ellipse(ctx, D * t, 2.5, 0.6, 0.6);
      ctx.fill();
    }
  }
}

function apron(ctx: Ctx, color: string, d: Dims, dirt: number, r: Random): void {
  const { W, D } = d;
  ctx.beginPath();
  ctx.moveTo(D * 0.05, -W * 0.62);
  ctx.lineTo(D * 1.12, -W * 0.5);
  ctx.lineTo(D * 1.12, W * 0.5);
  ctx.lineTo(D * 0.05, W * 0.62);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, color, 0, -W, D, W, 0.1);
  ctx.fill();
  stroke(ctx, shade(color, -0.4), 0.8);
  // Cordão no pescoço e nas costas.
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(D * 0.1, sy * W * 0.6);
    ctx.lineTo(-D * 0.9, sy * W * 0.35);
    stroke(ctx, shade(color, -0.2), 0.8);
  }
  for (let i = 0; i < 3 + dirt * 8; i++) {
    ctx.fillStyle = rgba(r.pick(['#5a3a1a', '#3a2a1a', '#6a1a10']), 0.3);
    ellipse(ctx, r.range(D * 0.2, D), r.range(-W * 0.45, W * 0.45), r.range(1, 3), r.range(0.8, 2), r.range(0, 3));
    ctx.fill();
  }
}

// ============================================================================ cabeça

function drawHead(ctx: Ctx, z: Zombie, p: Palette, d: Dims, opts: { back?: boolean } = {}): void {
  const L = z.look;
  const R = d.headR;
  const r = new Random(z.seed ^ 0x4ead);
  const style = L.hair.style;
  const hair = p.hair;
  const hairDark = shade(hair, -0.35);
  // Cabelo comprido cai para trás.
  if (style === 'longo') {
    ctx.fillStyle = lit(ctx, hair, -R * 2, -R, 0, R, 0.12);
    ellipse(ctx, -R * 0.9, 0, R * 1.35, R * 1.05);
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      const y = r.range(-R, R);
      ctx.moveTo(-R * 0.2, y * 0.8);
      ctx.quadraticCurveTo(-R * 1.4, y * 1.05, -R * 2.1, y * 1.1 + r.range(-2, 2));
      stroke(ctx, hairDark, 0.7);
    }
  } else if (style === 'rabo') {
    ctx.fillStyle = lit(ctx, hair, -R * 2, -3, -R, 3, 0.12);
    ellipse(ctx, -R * 1.45, 0, R * 0.7, R * 0.35, r.range(-0.3, 0.3));
    ctx.fill();
    stroke(ctx, hairDark, 0.7);
  }
  // Orelhas.
  for (const sy of [-1, 1]) {
    ctx.fillStyle = p.skin;
    ellipse(ctx, R * 0.05, sy * R * 0.95, R * 0.26, R * 0.2);
    ctx.fill();
    stroke(ctx, p.skinDark, 0.6);
  }
  // Crânio.
  ellipse(ctx, 0, 0, R * 1.04, R * 0.94);
  const g = ctx.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.1, 0, 0, R * 1.1);
  g.addColorStop(0, p.skinLight);
  g.addColorStop(1, p.skinDark);
  ctx.fillStyle = g;
  ctx.fill();
  // Rosto aparecendo na frente: sobrancelha, órbitas fundas, nariz.
  if (!opts.back) {
    ctx.fillStyle = rgba('#1a1010', 0.35 + L.decay * 0.35);
    for (const sy of [-1, 1]) {
      ellipse(ctx, R * 0.72, sy * R * 0.34, R * 0.2, R * 0.16);
      ctx.fill();
    }
    ctx.fillStyle = p.skin;
    ellipse(ctx, R * 1.03, 0, R * 0.2, R * 0.13);
    ctx.fill();
    stroke(ctx, p.skinDark, 0.5);
    // Boca aberta (queixo caído) — só a pontinha aparece de cima.
    ctx.fillStyle = rgba('#2a0a08', 0.6);
    ellipse(ctx, R * 1.02, 0, R * 0.08, R * 0.26);
    ctx.fill();
  }
  // Manchas de decomposição e veias.
  const nd = Math.round(L.decay * 7);
  for (let i = 0; i < nd; i++) {
    ctx.fillStyle = rgba(r.pick(['#4a5a3a', '#5a4a5a', '#3a3a2a']), 0.25 + L.decay * 0.25);
    ellipse(ctx, r.range(-R * 0.8, R * 0.8), r.range(-R * 0.7, R * 0.7), r.range(1, 2.6), r.range(0.8, 2), r.range(0, 3));
    ctx.fill();
  }
  // Cabelo.
  hairOn(ctx, z, d, r, hair, hairDark, !!opts.back);
  // Pedaços sem cabelo (podre) e sangue empapado.
  if (L.decay > 0.55 && style !== 'careca') {
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = p.skinDark;
      ellipse(ctx, r.range(-R * 0.6, R * 0.2), r.range(-R * 0.5, R * 0.5), r.range(1.2, 2.4), r.range(1, 2), r.range(0, 3));
      ctx.fill();
    }
  }
  if (L.decay > 0.78) {
    ctx.fillStyle = p.bone;
    ellipse(ctx, r.range(-R * 0.4, R * 0.2), r.range(-R * 0.4, R * 0.4), 1.6, 1.2, r.range(0, 3));
    ctx.fill();
  }
  // Chapéu / capacete.
  if (L.hat) hat(ctx, L.hat.kind, hex(L.hat.color), R, r);
  // Óculos (tortos às vezes).
  if (L.glasses && !opts.back) {
    const tilt = r.range(-0.12, 0.12);
    ctx.save();
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.moveTo(R * 0.86, -R * 0.62);
    ctx.lineTo(R * 0.86, R * 0.62);
    stroke(ctx, '#1a1a1a', 1.1);
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(R * 0.86, sy * R * 0.62);
      ctx.lineTo(R * 0.05, sy * R * 0.98);
      stroke(ctx, '#2a2a2a', 0.6);
    }
    ctx.restore();
  }
  // Feridas na cabeça (morte e jogo) e sangue escorrendo.
  const hr = new Random(z.seed ^ 0xca5);
  for (const m of L.marks) {
    if (m.part !== 'cabeca') continue;
    const x = hr.range(-R * 0.5, R * 0.5);
    const y = hr.range(-R * 0.5, R * 0.5);
    if (m.kind === 'mordida') biteMark(ctx, hr, x, y, 0.7, p);
    else if (m.kind === 'queimado') charred(ctx, hr, x, y, 0.8);
    else slash(ctx, hr, x, y, 0.7, p);
  }
  for (const h of z.hits) if (h.part === 'cabeca') hitMark(ctx, hr, h.kind, hr.range(-R * 0.6, R * 0.6), hr.range(-R * 0.6, R * 0.6), 0.75, p);
  if (L.blood > 0.5) for (let i = 0; i < 2; i++) drip(ctx, hr, hr.range(0, R), hr.range(-R * 0.6, R * 0.6), hr.range(3, 7), hr.range(-0.5, 0.5), p.blood, 0.8);
  // Contorno.
  ellipse(ctx, 0, 0, R * 1.04, R * 0.94);
  stroke(ctx, rgba('#140c0a', 0.55), 0.8);
}

function hairOn(ctx: Ctx, z: Zombie, d: Dims, r: Random, hair: string, hairDark: string, back: boolean): void {
  const R = d.headR;
  const style = z.look.hair.style;
  if (style === 'careca') {
    // Brilho e manchas senis.
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffffff';
    ellipse(ctx, -R * 0.3, -R * 0.35, R * 0.35, R * 0.22, -0.5);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  if (style === 'raspado') {
    ctx.fillStyle = rgba(hair, 0.55);
    for (let i = 0; i < 90; i++) {
      const a = r.range(0, Math.PI * 2);
      const rr = Math.sqrt(r.next()) * R * 0.9;
      const x = Math.cos(a) * rr;
      if (!back && x > R * 0.45) continue;
      ctx.fillRect(x, Math.sin(a) * rr * 0.9, 0.7, 0.7);
    }
    return;
  }
  const volume = style === 'crespo' ? 1.26 : style === 'medio' ? 1.14 : style === 'longo' ? 1.12 : 1.06;
  // Linha do cabelo na testa: o rosto aparece na frente (a não ser de costas).
  const front = back ? R * 1.2 : R * (style === 'curto' ? 0.42 : 0.3);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-R * 2, -R * 2, R * 2 + front, R * 4);
  ctx.clip();
  if (style === 'crespo') {
    ctx.fillStyle = hair;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      ellipse(ctx, Math.cos(a) * R * 1.02, Math.sin(a) * R * 0.95, R * 0.34, R * 0.34);
      ctx.fill();
    }
    ellipse(ctx, 0, 0, R * 1.05, R * 1);
    ctx.fill();
    ctx.fillStyle = rgba('#000000', 0.25);
    for (let i = 0; i < 40; i++) {
      const a = r.range(0, Math.PI * 2);
      const rr = Math.sqrt(r.next()) * R;
      ctx.fillRect(Math.cos(a) * rr, Math.sin(a) * rr, 0.9, 0.9);
    }
  } else {
    ellipse(ctx, -R * 0.06, 0, R * volume, R * volume * 0.93);
    ctx.fillStyle = lit(ctx, hair, -R, -R, R, R, 0.18);
    ctx.fill();
    // Fios (despenteado).
    const n = style === 'curto' ? 14 : 22;
    for (let i = 0; i < n; i++) {
      const y = r.range(-R * 0.9, R * 0.9);
      ctx.beginPath();
      ctx.moveTo(front - 1, y * 0.6);
      ctx.quadraticCurveTo(-R * 0.3, y, -R * volume * r.range(0.8, 1.1), y * r.range(0.9, 1.2));
      stroke(ctx, i % 3 ? hairDark : shade(hair, 0.25), 0.55);
    }
    // Mechas soltas saindo.
    for (let i = 0; i < 4; i++) {
      const a = r.range(0, Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8);
      ctx.lineTo(Math.cos(a) * R * r.range(1.1, 1.35), Math.sin(a) * R * r.range(1.1, 1.35));
      stroke(ctx, hairDark, 0.7);
    }
  }
  ctx.restore();
  // Borda da franja.
  if (!back) {
    ctx.beginPath();
    ctx.moveTo(front, -R * 0.8);
    ctx.quadraticCurveTo(front + R * 0.12, 0, front, R * 0.8);
    stroke(ctx, hairDark, 0.7);
  }
  // Sangue empapado no cabelo.
  if (z.look.blood > 0.45) {
    ctx.fillStyle = rgba('#3a0c08', 0.55);
    ellipse(ctx, r.range(-R * 0.6, 0), r.range(-R * 0.5, R * 0.5), R * 0.35, R * 0.25, r.range(0, 3));
    ctx.fill();
  }
}

function hat(ctx: Ctx, kind: NonNullable<Zombie['look']['hat']>['kind'], color: string, R: number, r: Random): void {
  switch (kind) {
    case 'bone': {
      // Aba para a frente.
      ctx.fillStyle = shade(color, -0.12);
      ctx.beginPath();
      ctx.ellipse(R * 0.95, 0, R * 0.7, R * 0.8, 0, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      stroke(ctx, shade(color, -0.45), 0.8);
      ellipse(ctx, -R * 0.08, 0, R * 1.02, R * 0.96);
      ctx.fillStyle = lit(ctx, color, -R, -R, R, R, 0.2);
      ctx.fill();
      stroke(ctx, shade(color, -0.45), 0.9);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(R * 0.4, 0);
        ctx.lineTo(-R * 0.95, (i - 1) * R * 0.65);
        stroke(ctx, rgba('#000000', 0.2), 0.6);
      }
      ctx.fillStyle = shade(color, -0.3);
      ellipse(ctx, -R * 0.1, 0, 1.1, 1.1);
      ctx.fill();
      break;
    }
    case 'capacete':
    case 'capaceteObra': {
      const c = color;
      ellipse(ctx, 0, 0, R * 1.2, R * 1.12);
      ctx.fillStyle = lit(ctx, c, -R, -R, R, R, 0.25);
      ctx.fill();
      stroke(ctx, shade(c, -0.5), 1);
      if (kind === 'capaceteObra') {
        ctx.beginPath();
        ctx.moveTo(-R * 1.1, 0);
        ctx.lineTo(R * 1.1, 0);
        stroke(ctx, shade(c, 0.25), 1.6);
        ctx.fillStyle = shade(c, -0.1);
        ctx.beginPath();
        ctx.ellipse(R * 1.05, 0, R * 0.35, R * 0.9, 0, -Math.PI / 2, Math.PI / 2);
        ctx.fill();
      } else {
        // Capa de tecido camuflado e tira.
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = rgba(r.pick(['#3a4a2a', '#5a6a3a', '#2a3a22']), 0.6);
          ellipse(ctx, r.range(-R * 0.8, R * 0.8), r.range(-R * 0.8, R * 0.8), r.range(1, 2.5), r.range(0.8, 1.8), r.range(0, 3));
          ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(R * 0.2, -R * 1.1);
        ctx.lineTo(R * 0.2, R * 1.1);
        stroke(ctx, '#2a2a22', 0.8);
      }
      break;
    }
    case 'touca':
      ellipse(ctx, -R * 0.1, 0, R * 1.08, R * 1.0);
      ctx.fillStyle = lit(ctx, color, -R, -R, R, R, 0.16);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      for (let a = 0; a < Math.PI * 2; a += 0.35) {
        ctx.beginPath();
        ctx.moveTo(-R * 0.1, 0);
        ctx.lineTo(-R * 0.1 + Math.cos(a) * R, Math.sin(a) * R);
        stroke(ctx, shade(color, -0.4), 0.6);
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.ellipse(-R * 0.1, 0, R * 1.08, R * 1.0, 0, -Math.PI * 0.4, Math.PI * 0.4);
      stroke(ctx, shade(color, 0.2), 2);
      break;
    case 'chapeu':
      ellipse(ctx, 0, 0, R * 1.75, R * 1.7);
      ctx.fillStyle = lit(ctx, color, -R * 1.5, -R * 1.5, R, R, 0.14);
      ctx.fill();
      stroke(ctx, shade(color, -0.4), 0.9);
      ellipse(ctx, -R * 0.05, 0, R * 0.95, R * 0.9);
      ctx.fillStyle = shade(color, 0.08);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-R * 0.05, 0, R * 0.98, R * 0.93, 0, 0, Math.PI * 2);
      stroke(ctx, '#2a2018', 1.1);
      break;
    case 'quepe':
      ctx.fillStyle = '#141414';
      ctx.beginPath();
      ctx.ellipse(R * 0.95, 0, R * 0.55, R * 0.85, 0, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ellipse(ctx, -R * 0.05, 0, R * 1.18, R * 1.1);
      ctx.fillStyle = lit(ctx, color, -R, -R, R, R, 0.2);
      ctx.fill();
      stroke(ctx, shade(color, -0.5), 1);
      ctx.fillStyle = '#d8b440';
      ellipse(ctx, R * 0.7, 0, 1.4, 1.2);
      ctx.fill();
      break;
    case 'toucaChef':
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        ellipse(ctx, Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55, R * 0.62, R * 0.62);
        ctx.fillStyle = '#f2f0ea';
        ctx.fill();
        stroke(ctx, '#c8c4b8', 0.6);
      }
      ellipse(ctx, 0, 0, R * 0.7, R * 0.7);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      break;
    case 'lenco':
      ellipse(ctx, -R * 0.1, 0, R * 1.05, R * 0.98);
      ctx.fillStyle = lit(ctx, color, -R, -R, R, R, 0.15);
      ctx.fill();
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = rgba('#f2f0ea', 0.6);
        ellipse(ctx, r.range(-R * 0.8, R * 0.6), r.range(-R * 0.7, R * 0.7), 0.7, 0.7);
        ctx.fill();
      }
      ctx.fillStyle = shade(color, -0.1);
      ellipse(ctx, -R * 1.15, R * 0.2, R * 0.35, R * 0.22, 0.6);
      ctx.fill();
      break;
  }
}

// ============================================================================ braços

function drawArm(ctx: Ctx, z: Zombie, p: Palette, d: Dims, side: 'E' | 'D'): void {
  const L = z.look;
  const r = new Random(z.seed ^ (side === 'E' ? 0xa4e : 0xa4d));
  const arm = z.parts[side === 'E' ? 'bracoE' : 'bracoD'];
  const hand = z.parts[side === 'E' ? 'maoE' : 'maoD'];
  const len = d.armLen;
  const w = d.armW;
  const elbow = len * 0.48;
  const wrist = len * 0.86;
  const flip = side === 'E' ? -1 : 1;
  const kind = L.top.kind;
  const sleeve = NO_SLEEVE.has(kind) ? 0 : LONG_SLEEVE.has(kind) ? wrist : elbow * 0.75;
  // Braço (pele) afinando até o pulso.
  ctx.beginPath();
  ctx.moveTo(0, -w / 2);
  ctx.quadraticCurveTo(elbow, -w * 0.46, wrist, -w * 0.34);
  ctx.lineTo(wrist, w * 0.34);
  ctx.quadraticCurveTo(elbow, w * 0.46, 0, w / 2);
  ctx.closePath();
  ctx.fillStyle = lit(ctx, p.skin, 0, -w, len, w, 0.12);
  ctx.fill();
  stroke(ctx, p.skinDark, 0.7);
  // Veias e manchas no antebraço.
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(elbow + r.range(0, 4), r.range(-1.5, 1.5));
    ctx.lineTo(wrist - r.range(0, 3), r.range(-1.5, 1.5));
    stroke(ctx, p.vein, 0.5);
  }
  ctx.globalAlpha = 1;
  // Manga.
  if (sleeve > 0) {
    const sw = w * 1.18;
    ctx.beginPath();
    ctx.moveTo(-1, -sw / 2);
    ctx.lineTo(sleeve, -sw * 0.44);
    ctx.lineTo(sleeve, sw * 0.44);
    ctx.lineTo(-1, sw / 2);
    ctx.closePath();
    ctx.fillStyle = lit(ctx, p.top, 0, -sw, sleeve, sw, 0.16);
    ctx.fill();
    stroke(ctx, shade(p.top, -0.5), 0.8);
    if (kind === 'camuflado') {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = rgba(r.pick(['#3a4a2a', '#5a6a3a', '#2a3a22']), 0.7);
        ellipse(ctx, r.range(0, sleeve), r.range(-sw * 0.35, sw * 0.35), r.range(1, 2.5), r.range(0.8, 1.6), r.range(0, 3));
        ctx.fill();
      }
    }
    if (kind === 'pijama') {
      ctx.globalAlpha = 0.35;
      for (let x = 1; x < sleeve; x += 3) {
        ctx.fillStyle = shade(p.top, 0.25);
        ctx.fillRect(x, -sw * 0.4, 1.2, sw * 0.8);
      }
      ctx.globalAlpha = 1;
    }
    // Punho.
    ctx.beginPath();
    ctx.moveTo(sleeve, -sw * 0.44);
    ctx.lineTo(sleeve, sw * 0.44);
    stroke(ctx, shade(p.top, -0.3), 1.2);
    if (L.vest === 'refletivo' && sleeve > 6) {
      // nada: colete não tem manga
    }
    // Rasgado se o braço está ferido.
    if (arm < 0.6) tear(ctx, r, sleeve * 0.55, r.range(-1, 1), 0.7, p, arm < 0.35);
  }
  // Mão (dedos abertos, unhas escuras) ou toco.
  if (hand > 0) {
    const hx = wrist + 2.2;
    ctx.fillStyle = lit(ctx, p.skin, hx - 3, -3, hx + 3, 3, 0.12);
    ellipse(ctx, hx, 0, 3.1 * d.s, 2.7 * d.s);
    ctx.fill();
    stroke(ctx, p.skinDark, 0.6);
    for (let i = 0; i < 4; i++) {
      const fy = (i - 1.5) * 1.35 * d.s;
      const a = (i - 1.5) * 0.18 * flip * -1;
      ctx.beginPath();
      ctx.moveTo(hx + 2, fy * 0.8);
      ctx.lineTo(hx + 2 + Math.cos(a) * 4.2 * d.s, fy + Math.sin(a) * 4.2 * d.s);
      stroke(ctx, p.skin, 1.25 * d.s);
      ctx.fillStyle = rgba('#2a1a14', 0.8);
      ctx.fillRect(hx + 1.6 + Math.cos(a) * 4.2 * d.s, fy + Math.sin(a) * 4.2 * d.s - 0.4, 0.9, 0.8);
    }
    // Polegar.
    ctx.beginPath();
    ctx.moveTo(hx, flip * -2.2 * d.s);
    ctx.lineTo(hx + 2.8 * d.s, flip * -3.6 * d.s);
    stroke(ctx, p.skin, 1.3 * d.s);
    // Mão suja de sangue (de quem já mordeu/agarrou).
    if (L.blood > 0.3) splat(ctx, r, hx + 1.5, r.range(-1.5, 1.5), 2.2, p.bloodOld, 0.55);
  } else {
    splat(ctx, r, wrist, 0, 2.8, p.blood, 0.9);
    ctx.fillStyle = p.flesh;
    ellipse(ctx, wrist, 0, 1.6, 2.2);
    ctx.fill();
    ctx.fillStyle = p.bone;
    ellipse(ctx, wrist + 0.4, 0, 0.7, 0.7);
    ctx.fill();
  }
  // Marcas de morte e golpes no braço/mão.
  for (const m of L.marks) {
    if (m.part === `braco${side}` || m.part === `mao${side}`) {
      const x = m.part.startsWith('mao') ? wrist : r.range(elbow * 0.6, wrist * 0.9);
      if (m.kind === 'mordida') biteMark(ctx, r, x, 0, 0.62, p);
      else if (m.kind === 'queimado') charred(ctx, r, x, 0, 0.6);
      else tear(ctx, r, x, 0, 0.6, p, true);
    }
  }
  const hr = new Random(z.seed ^ (side === 'E' ? 0xb1 : 0xb2));
  for (const h of z.hits) if (h.part === `braco${side}` || h.part === `mao${side}`) hitMark(ctx, hr, h.kind, hr.range(4, wrist), hr.range(-1.2, 1.2), 0.55, p);
  if (arm < 0.3) {
    // Osso à mostra.
    ctx.beginPath();
    ctx.moveTo(elbow - 3, 0);
    ctx.lineTo(elbow + 4, 0.5);
    stroke(ctx, p.bone, 1.3);
    splat(ctx, r, elbow, 0, 2.6, p.blood, 0.75);
  }
  grime(ctx, r, len * 0.5, 0, len * 0.45, w * 0.4, L.dirt * 0.8, '#3a2a1a');
}

// ============================================================================ pernas

/** Um quadro da passada (0..5). A perna mais ferida arrasta. */
function drawLegs(ctx: Ctx, z: Zombie, p: Palette, d: Dims, frame: number): void {
  const L = z.look;
  const r = new Random(z.seed ^ 0x1e6);
  const ph = (frame / LEG_FRAMES) * Math.PI * 2;
  const bad: 'E' | 'D' | null = z.parts.pernaE < 0.65 || z.parts.peE < 0.5 ? 'E' : z.parts.pernaD < 0.65 || z.parts.peD < 0.5 ? 'D' : null;
  const stride = 14.5 * d.s;
  const kind = L.bottom.kind;
  const bare = L.shoes === null;
  const shoe = bare ? p.skin : mix(hex(L.shoes!), '#3a3026', L.dirt * 0.3);
  const legColor = p.bottom;
  // Saia: forma por cima do quadril (desenhada no fim).
  const leg = (side: 'E' | 'D', sy: number, sx: number, lifted: boolean) => {
    const drag = bad === side;
    const fx = drag ? sx * 0.45 - 3 : sx;
    const fy = sy * d.legY + (drag ? sy * 1.2 : 0);
    const len = Math.abs(fx);
    const hip = -1.5;
    // Perna: pano até onde a roupa vai; o resto, pele.
    const clothTo = kind === 'calca' ? 1 : kind === 'bermuda' ? 0.55 : kind === 'short' ? 0.3 : 0;
    const w = d.legW * (lifted ? 1.05 : 1);
    ctx.beginPath();
    ctx.moveTo(hip, fy);
    ctx.lineTo(fx, fy);
    stroke(ctx, p.skinDark, w);
    ctx.beginPath();
    ctx.moveTo(hip, fy);
    ctx.lineTo(fx, fy);
    stroke(ctx, p.skin, w - 1.4);
    if (clothTo > 0) {
      const cx = hip + (fx - hip) * clothTo;
      ctx.beginPath();
      ctx.moveTo(hip, fy);
      ctx.lineTo(clothTo >= 1 ? fx : cx, fy);
      stroke(ctx, shade(legColor, -0.45), w + 0.8);
      ctx.beginPath();
      ctx.moveTo(hip, fy);
      ctx.lineTo(clothTo >= 1 ? fx : cx, fy);
      stroke(ctx, lifted ? shade(legColor, 0.1) : legColor, w - 0.6);
      // Costura da calça.
      if (kind === 'calca' && len > 3) {
        ctx.beginPath();
        ctx.moveTo(hip, fy + sy * w * 0.28);
        ctx.lineTo(fx, fy + sy * w * 0.28);
        stroke(ctx, rgba('#000000', 0.18), 0.5);
      }
    }
    // Sangue na perna ferida.
    const part = side === 'E' ? 'pernaE' : 'pernaD';
    if (z.parts[part] < 0.8) splat(ctx, r, (hip + fx) / 2, fy, 2.8, p.blood, 0.7);
    for (const h of z.hits) if (h.part === part) hitMark(ctx, r, h.kind, (hip + fx) / 2 + r.range(-2, 2), fy, 0.55, p);
    // Pé: sapato com sola e cadarço, ou pé descalço com dedos.
    const foot = z.parts[side === 'E' ? 'peE' : 'peD'];
    const toe = drag ? 0.35 * -sy : 0;
    ctx.save();
    ctx.translate(fx + 3.5, fy);
    ctx.rotate(toe);
    const fl = (lifted ? 12.5 : 11.5) * d.s;
    const fw = 6.4 * d.s;
    if (foot <= 0) {
      splat(ctx, r, -2, 0, 2.8, p.blood, 0.9);
    } else if (bare) {
      ctx.fillStyle = lit(ctx, p.skin, -fl / 2, -fw / 2, fl / 2, fw / 2, 0.12);
      ellipse(ctx, 0, 0, fl * 0.46, fw * 0.45);
      ctx.fill();
      stroke(ctx, p.skinDark, 0.6);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = p.skin;
        ellipse(ctx, fl * 0.46, (i - 1.5) * 1.3, 0.9, 0.7);
        ctx.fill();
      }
      ctx.fillStyle = rgba('#3a2a1a', 0.35 + L.dirt * 0.3);
      ellipse(ctx, 0, 0, fl * 0.4, fw * 0.36);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(-fl / 2, -fw / 2, fl, fw, fw / 2);
      ctx.fillStyle = lit(ctx, shoe, -fl / 2, -fw / 2, fl / 2, fw / 2, 0.14);
      ctx.fill();
      stroke(ctx, shade(shoe, -0.55), 0.8);
      ctx.beginPath();
      ctx.moveTo(-fl * 0.1, 0);
      ctx.lineTo(fl * 0.3, 0);
      stroke(ctx, rgba(L.shoes === 0xe6e4de ? '#8a8a8a' : '#e8e4da', 0.5), 0.6);
    }
    ctx.restore();
  };
  const s = Math.sin(ph);
  leg('E', -1, s * stride, Math.cos(ph) > 0.2);
  leg('D', 1, -s * stride, Math.cos(ph) < -0.2);
  if (kind === 'saia') {
    ctx.beginPath();
    ctx.moveTo(-6 * d.s, -d.legY - 5);
    ctx.lineTo(6 * d.s, -d.legY - 4);
    ctx.lineTo(6 * d.s, d.legY + 4);
    ctx.lineTo(-6 * d.s, d.legY + 5);
    ctx.closePath();
    ctx.fillStyle = lit(ctx, p.bottom, -6, -8, 6, 8, 0.14);
    ctx.fill();
    stroke(ctx, shade(p.bottom, -0.5), 0.8);
  }
}

// ============================================================================ deitado (de bruços)

/**
 * Corpo deitado de bruços, cabeça para +x. Sem braços (animados à parte) —
 * o corpo morto chama com `arms` para desenhar os braços numa pose.
 */
function drawLying(ctx: Ctx, z: Zombie, p: Palette, d: Dims, arms: boolean): void {
  const L = z.look;
  const r = new Random(z.seed ^ 0x17e);
  const s = d.s;
  const W = d.W * 0.92;
  const headX = 39 * s;
  const hipX = -6 * s;
  const footX = -47 * s;
  const kind = L.bottom.kind;
  // Pernas (levemente abertas), sola dos sapatos para cima.
  for (const sy of [-1, 1]) {
    const part = sy < 0 ? 'pernaE' : 'pernaD';
    if (z.parts[part] <= 0) {
      splat(ctx, r, hipX - 6, sy * 5 * s, 4, p.blood, 0.9);
      continue;
    }
    const spread = sy * (5.5 + r.range(0, 4)) * s;
    const lw = d.legW * 1.15;
    ctx.beginPath();
    ctx.moveTo(hipX, sy * 4 * s);
    ctx.lineTo(footX, spread);
    stroke(ctx, p.skinDark, lw);
    ctx.beginPath();
    ctx.moveTo(hipX, sy * 4 * s);
    ctx.lineTo(footX, spread);
    stroke(ctx, p.skin, lw - 1.4);
    const clothTo = kind === 'calca' ? 1 : kind === 'bermuda' ? 0.55 : kind === 'short' ? 0.3 : 0.4;
    ctx.beginPath();
    ctx.moveTo(hipX, sy * 4 * s);
    ctx.lineTo(hipX + (footX - hipX) * clothTo, sy * 4 * s + (spread - sy * 4 * s) * clothTo);
    stroke(ctx, p.bottom, lw);
    if (z.parts[part] < 0.8) splat(ctx, r, (hipX + footX) / 2, spread * 0.8, 3, p.blood, 0.7);
    // Sola.
    const foot = z.parts[sy < 0 ? 'peE' : 'peD'];
    if (foot > 0) {
      ctx.fillStyle = L.shoes === null ? p.skinDark : '#24201c';
      ellipse(ctx, footX - 2.5 * s, spread, 4.6 * s, 3.3 * s);
      ctx.fill();
    }
  }
  if (kind === 'saia' || L.top.kind === 'vestido') {
    ctx.beginPath();
    ctx.moveTo(hipX + 6, -W * 0.7);
    ctx.lineTo(hipX - 16 * s, -W * 0.75);
    ctx.lineTo(hipX - 16 * s, W * 0.75);
    ctx.lineTo(hipX + 6, W * 0.7);
    ctx.closePath();
    ctx.fillStyle = kind === 'saia' ? p.bottom : p.top;
    ctx.fill();
  }
  // Tronco (costas).
  ctx.save();
  ctx.translate(hipX + 16 * s, 0);
  const tl = 22 * s;
  ctx.beginPath();
  ctx.roundRect(-tl * 0.55, -W * 0.82, tl * 1.35, W * 1.64, W * 0.55);
  ctx.fillStyle = lit(ctx, p.top, -tl, -W, tl, W, 0.14);
  ctx.fill();
  stroke(ctx, shade(p.top, -0.55), 1);
  ctx.save();
  ctx.clip();
  if (L.top.kind === 'camuflado') {
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = rgba(r.pick(['#3a4a2a', '#5a6a3a', '#2a3a22']), 0.7);
      ellipse(ctx, r.range(-tl, tl), r.range(-W, W), r.range(1.5, 4), r.range(1, 2.5), r.range(0, 3));
      ctx.fill();
    }
  }
  if (L.top.kind === 'pijama') {
    ctx.globalAlpha = 0.35;
    for (let y = -W; y < W; y += 3.2) {
      ctx.fillStyle = y % 6.4 < 3.2 ? shade(p.top, 0.22) : shade(p.top, -0.3);
      ctx.fillRect(-tl, y, tl * 2, 1.3);
    }
    ctx.globalAlpha = 1;
  }
  if (L.vest === 'balistico') {
    ctx.fillStyle = '#2a2e32';
    ctx.fillRect(-tl * 0.4, -W * 0.6, tl * 1.1, W * 1.2);
  } else if (L.vest === 'refletivo') {
    ctx.fillStyle = '#e8762a';
    ctx.fillRect(-tl * 0.45, -W * 0.7, tl * 1.2, W * 1.4);
    ctx.fillStyle = '#d8dcd8';
    ctx.fillRect(-tl * 0.45, -W * 0.7, tl * 1.2, 2);
    ctx.fillRect(-tl * 0.45, W * 0.3, tl * 1.2, 2);
  }
  if (L.top.kind === 'moletom') {
    ctx.fillStyle = shade(p.top, -0.15);
    ellipse(ctx, tl * 0.6, 0, 5 * s, 7 * s);
    ctx.fill();
  }
  grime(ctx, r, 0, 0, tl, W, L.dirt, '#3a2a1a');
  const nb = Math.round(2 + L.blood * 6);
  for (let i = 0; i < nb; i++) splat(ctx, r, r.range(-tl * 0.5, tl * 0.8), r.range(-W * 0.7, W * 0.7), r.range(2, 5) * (0.6 + L.blood), r.chance(0.5) ? p.bloodOld : p.blood, r.range(0.4, 0.8));
  for (const h of z.hits) if (h.part === 'tronco') hitMark(ctx, r, h.kind, r.range(-tl * 0.5, tl * 0.8), r.range(-W * 0.6, W * 0.6), 1, p);
  ctx.restore();
  if (L.backpack !== undefined) {
    const c = hex(L.backpack);
    ctx.beginPath();
    ctx.roundRect(-tl * 0.2, -W * 0.5, tl * 0.8, W, 3);
    ctx.fillStyle = lit(ctx, c, -tl, -W, tl, W, 0.16);
    ctx.fill();
    stroke(ctx, shade(c, -0.5), 1);
  }
  if (L.apron !== undefined) {
    // Laço do avental nas costas.
    ctx.beginPath();
    ctx.moveTo(-tl * 0.5, -W * 0.3);
    ctx.lineTo(-tl * 0.3, 0);
    ctx.lineTo(-tl * 0.5, W * 0.3);
    stroke(ctx, hex(L.apron), 1.2);
  }
  ctx.restore();
  // Braços do corpo morto: um junto da cabeça, outro ao longo do corpo (varia).
  if (arms) {
    for (const [side, sy] of [['E', -1], ['D', 1]] as const) {
      if (z.parts[side === 'E' ? 'bracoE' : 'bracoD'] <= 0) continue;
      const up = r.chance(0.5);
      ctx.save();
      ctx.translate(hipX + 28 * s, sy * W * 0.85);
      ctx.rotate(up ? sy * r.range(0.15, 0.6) : Math.PI - sy * r.range(0.1, 0.4));
      drawArm(ctx, z, p, d, side);
      ctx.restore();
    }
  }
  // Pescoço e cabeça (de costas: nuca e cabelo).
  if (z.parts.pescoco <= 0 || z.parts.cabeca <= 0 && z.parts.pescoco <= 0.05) {
    splat(ctx, r, headX - 6 * s, 0, 7, p.blood, 0.95);
    ctx.fillStyle = p.flesh;
    ellipse(ctx, headX - 8 * s, 0, 3.5 * s, 4.2 * s);
    ctx.fill();
    ctx.fillStyle = p.bone;
    ellipse(ctx, headX - 7.5 * s, 0, 1.3, 1.3);
    ctx.fill();
    return;
  }
  ctx.fillStyle = p.skin;
  ellipse(ctx, headX - 8 * s, 0, 4.4 * s, 4.4 * s);
  ctx.fill();
  ctx.save();
  ctx.translate(headX, r.range(-2, 2));
  ctx.rotate(r.range(-0.4, 0.4));
  if (z.parts.cabeca <= 0) {
    // Cabeça esmagada.
    splat(ctx, r, 0, 0, d.headR * 1.4, p.blood, 0.95);
    ctx.fillStyle = p.flesh;
    ellipse(ctx, 0, 0, d.headR * 0.9, d.headR * 0.7, r.range(0, 3));
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = p.bone;
      ellipse(ctx, r.range(-4, 4), r.range(-4, 4), r.range(0.8, 1.8), r.range(0.6, 1.2), r.range(0, 3));
      ctx.fill();
    }
    if (z.look.hair.style !== 'careca') {
      ctx.fillStyle = rgba(p.hair, 0.8);
      ellipse(ctx, -d.headR * 0.5, r.range(-3, 3), d.headR * 0.5, d.headR * 0.35);
      ctx.fill();
    }
  } else drawHead(ctx, z, p, d, { back: true });
  ctx.restore();
}

// ============================================================================ folhas

/** Desenha a folha inteira do zumbi (reaproveita o canvas se vier um). */
export function drawZombieSheet(z: Zombie, target?: HTMLCanvasElement): { canvas: HTMLCanvasElement; layout: ZombieSheetLayout } {
  const layout = sheetLayout();
  let canvas = target;
  if (!canvas) canvas = makeCanvas(layout.w, layout.h).canvas;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const p = paletteOf(z);
  const d = zombieDims(z);
  const at = (name: string, draw: () => void) => {
    const f = layout.frames[name]!;
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x, f.y, f.w, f.h);
    ctx.clip();
    ctx.translate(f.x + f.w * f.ox, f.y + f.h * f.oy);
    ctx.scale(ZOMBIE_RES, ZOMBIE_RES);
    draw();
    ctx.restore();
  };
  for (let i = 0; i < LEG_FRAMES; i++) at(`legs${i}`, () => drawLegs(ctx, z, p, d, i));
  at('torso', () => drawTorso(ctx, z, p, d));
  at('head', () => drawHead(ctx, z, p, d));
  at('armL', () => drawArm(ctx, z, p, d, 'E'));
  at('armR', () => drawArm(ctx, z, p, d, 'D'));
  at('lying', () => drawLying(ctx, z, p, d, false));
  return { canvas, layout };
}

/** Tamanho (px de textura) da imagem do corpo morto. */
export const CORPSE_SIZE = { w: Math.ceil(140 * ZOMBIE_RES), h: Math.ceil(92 * ZOMBIE_RES) };

/** Corpo morto (de bruços, com braços numa pose), textura pequena própria. */
export function drawCorpse(z: Zombie, target?: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = target ?? makeCanvas(CORPSE_SIZE.w, CORPSE_SIZE.h).canvas;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(ZOMBIE_RES, ZOMBIE_RES);
  drawLying(ctx, z, paletteOf(z), zombieDims(z), true);
  return canvas;
}

/** Poça de sangue (compartilhada, pintada em cinza-vermelho e tingida no jogo). */
export function drawBloodPool(seed: number, size = 96): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size, size);
  const r = new Random(seed);
  const c = size / 2;
  for (let i = 0; i < 4; i++) splat(ctx, r, c + r.range(-size * 0.12, size * 0.12), c + r.range(-size * 0.12, size * 0.12), size * r.range(0.16, 0.3), i ? '#4a0c0a' : '#3a0a08', r.range(0.55, 0.85));
  // Brilho úmido.
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, c - size * 0.08, c - size * 0.08, size * 0.08, size * 0.04, -0.6);
  ctx.fill();
  ctx.globalAlpha = 1;
  return canvas;
}

/** Parte do corpo → região do desenho (para efeitos de impacto). */
export function partOffset(part: BodyPart): { along: number; side: number } {
  switch (part) {
    case 'cabeca':
    case 'pescoco':
      return { along: 4, side: 0 };
    case 'bracoE':
    case 'maoE':
      return { along: 10, side: -12 };
    case 'bracoD':
    case 'maoD':
      return { along: 10, side: 12 };
    case 'pernaE':
    case 'peE':
      return { along: 0, side: -6 };
    case 'pernaD':
    case 'peD':
      return { along: 0, side: 6 };
    default:
      return { along: 0, side: 0 };
  }
}
