/**
 * DIRIGIR (puro): física simples de carro visto de cima — acelera, freia,
 * dá ré, vira pela velocidade (modelo de bicicleta: parado não gira), gasta
 * gasolina, e bate: a lataria é uma fileira de círculos contra a geometria
 * exata do mundo (paredes, postes, carros, portas fechadas).
 *
 * Controle de celular: o polegar aponta PARA ONDE quer ir. Apontou para
 * trás do carro → ré (primeiro freia se estiver andando para a frente).
 * Motor fraco, pneu ruim e lataria amassada deixam o carro mais lento.
 */
import { angleDelta, clamp } from '../core/math';
import type { TaggedSolid } from '../sim/SolidIndex';

export const DRIVE_TUNING = {
  /** px/s² acelerando e freando; desaceleração sem pé (motor segurando). */
  accel: 240,
  brake: 560,
  coast: 120,
  /** Velocidade máxima (px/s): 470 ≈ 34 km/h na escala do jogo; ré bem menor. */
  maxSpeed: 470,
  reverseMax: 150,
  /** Entre-eixos (px) e esterço máximo (rad). */
  wheelBase: 120,
  maxSteer: 0.62,
  /** Litros por px andado (tanque de 45 L ≈ 10 km) e parado ligado (L/s). */
  fuelPerPx: 0.00008,
  idleFuel: 0.0004,
  /** Batida: velocidade que já amassa (px/s) e quanto a lataria perde por px/s acima disso. */
  crashSpeed: 90,
  crashDamage: 0.0012,
  /** Atropelo: velocidade mínima para derrubar/ferir (px/s). */
  hitSpeed: 70,
  // Defeitos: carro não quebra fácil. 1 km ≈ 49 mil px (1 tile = 1,3 m).
  /** Motor gasta ~1% a cada km rodado (um tanque cheio ≈ 10%). */
  engineWearPerPx: 0.0000002,
  /** Pneu fura (chance por pneu, por px): ~1% por km com os 4 bons, ~2% gastos; e às vezes numa batida forte. */
  flatPerPx: 0.0000001,
  flatOnCrash: 0.25,
  /** Condição do pneu que furou (abaixo de 0,1 o carro não sai do lugar de novo). */
  flatLeft: 0.05,
  /** Motor fraco (abaixo disso) pode morrer andando: chance por segundo = (weakEngine − motor) × stallRate. */
  weakEngine: 0.35,
  stallRate: 0.25,
  /** Morreu: cada tentativa de pegar de novo (segundos acelerando). */
  restartEvery: 2,
  /** Partida: motor a partir disso pega sempre; no limite (15%) pega 1 em 4; abaixo, não pega. */
  sureStart: 0.5,
  startMin: 0.25,
  deadEngine: 0.15,
} as const;

/** Conserto no capô aberto (peças que já existem no mundo). */
export const CAR_REPAIR = {
  /** Peças de motor + chave inglesa: minutos, chance (+ por nível de Mecânica), quanto sobe. */
  engine: { minutes: 30, chance: 0.5, chancePerLevel: 0.1, gain: 0.25, gainPerLevel: 0.05, loseOnFail: 0.5 },
  /** Vela nova: faz o motor pegar, não conserta motor gasto (teto). */
  plug: { minutes: 10, gain: 0.1, cap: 0.6 },
  /** Troca de óleo (um frasco inteiro): alivia o motor, com teto. */
  oil: { minutes: 15, gain: 0.1, cap: 0.7, minCharge: 0.5 },
  /** Remendo do pneu furado (borracha + cola). */
  patch: { minutes: 15, chance: 0.6, chancePerLevel: 0.08, result: 0.5 },
  /** Desmontar carro inutilizado (chave inglesa): minutos e o que sai (mínimo–máximo). */
  strip: {
    minutes: 45,
    yields: { pecasMotor: [0, 2], sucata: [3, 6], parafusos: [6, 14], fioEletrico: [1, 2], chapaMetal: [0, 1] } as Record<string, readonly [number, number]>,
  },
} as const;

/** Controle de celular: volante (−1..1) e pedais (0..1). Freio com o carro parado vira ré; os dois juntos = freio. */
export function pedalControls(steer: number, gas: number, brake: number): { throttle: number; steer: number } {
  const t = brake > 0.05 ? -clamp(brake, 0, 1) : gas > 0.05 ? clamp(gas, 0, 1) : 0;
  return { throttle: t, steer: clamp(steer, -1, 1) };
}

/** Volante de toque: quanto o dedo andou para o lado (px) desde que encostou → −1..1. */
export function wheelSteer(dx: number, radius: number): number {
  const v = clamp(dx / Math.max(1, radius * 0.85), -1, 1);
  // Zona morta pequena no meio: o carro anda reto sem tremer.
  return Math.abs(v) < 0.06 ? 0 : v;
}

/** Chance de o motor pegar numa tentativa de partida. */
export function startChance(engine: number): number {
  const T = DRIVE_TUNING;
  if (engine < T.deadEngine) return 0;
  if (engine >= T.sureStart) return 1;
  return T.startMin + (1 - T.startMin) * ((engine - T.deadEngine) / (T.sureStart - T.deadEngine));
}

export interface CarBody {
  x: number;
  y: number;
  /** Direção (rad). */
  a: number;
  /** px/s, positivo = para a frente. */
  speed: number;
}

export interface CarCondition {
  engine: number;
  /** Média dos pneus (0..1). */
  tires: number;
  body: number;
  fuel: number;
  /** Aderência do chão (1 seco; molhado, neve e gelo menos): acelera, freia e vira pior. */
  grip?: number;
}

/** Joystick → acelerador (-1..1) e direção (-1..1). */
export function driveControls(car: CarBody, dx: number, dy: number, mag: number): { throttle: number; steer: number } {
  if (mag < 0.2) return { throttle: 0, steer: 0 };
  const want = Math.atan2(dy, dx);
  const diff = angleDelta(car.a, want);
  const m = clamp((mag - 0.2) / 0.8, 0, 1);
  // Aponta para a frente (até ~110°): acelera e vira para lá.
  if (Math.abs(diff) < 1.9 || car.speed > 60) return { throttle: Math.abs(diff) < 1.9 ? m : -m, steer: clamp(diff / 0.6, -1, 1) };
  // Aponta para trás: ré, girando a traseira para o lado apontado.
  const back = angleDelta(car.a + Math.PI, want);
  return { throttle: -m * 0.8, steer: clamp(-back / 0.6, -1, 1) };
}

/** Avança a física. Devolve a gasolina gasta (L) e a distância (px). */
export function stepCar(car: CarBody, ctl: { throttle: number; steer: number }, cond: CarCondition, dt: number): { fuel: number; dist: number } {
  const T = DRIVE_TUNING;
  const running = cond.fuel > 0 && cond.engine > 0.05;
  const throttle = running ? ctl.throttle : 0;
  const grip = cond.grip ?? 1;
  const maxF = T.maxSpeed * (0.55 + 0.45 * cond.engine) * (0.55 + 0.45 * cond.tires) * (0.8 + 0.2 * cond.body);
  let v = car.speed;
  if (throttle > 0) {
    if (v < 0) v = Math.min(0, v + T.brake * dt);
    else v += T.accel * grip * throttle * (0.5 + 0.5 * cond.engine) * Math.max(0, 1 - v / maxF) * dt;
  } else if (throttle < 0) {
    if (v > 0) v = Math.max(0, v - T.brake * (0.35 + 0.65 * grip) * -throttle * dt);
    else v -= T.accel * 0.6 * -throttle * Math.max(0, 1 + v / T.reverseMax) * dt;
  } else {
    // Sem pé: o motor segura e o carro para.
    const c = T.coast * dt * (running ? 1 : 1.6);
    v = Math.abs(v) <= c ? 0 : v - Math.sign(v) * c;
  }
  v = clamp(v, -T.reverseMax, maxF);
  // Direção: rápido esterça menos (não capota de lado).
  const steer = ctl.steer * T.maxSteer * (0.55 + 0.45 * grip) * (1 - Math.min(0.55, (Math.abs(v) / T.maxSpeed) * 0.55));
  car.a += (v / T.wheelBase) * Math.tan(steer) * dt;
  const dist = v * dt;
  car.x += Math.cos(car.a) * dist;
  car.y += Math.sin(car.a) * dist;
  car.speed = v;
  const fuel = running ? Math.abs(dist) * T.fuelPerPx * (0.7 + 0.3 * Math.abs(throttle)) + T.idleFuel * dt : 0;
  return { fuel, dist: Math.abs(dist) };
}

/** Centros e raio dos círculos da lataria (referencial do mundo). */
export function carCircles(car: CarBody, half: readonly [number, number]): { x: number; y: number; r: number }[] {
  const [hl, hw] = half;
  const r = hw * 0.95;
  const n = Math.max(2, Math.ceil((hl * 2) / r));
  const c = Math.cos(car.a);
  const s = Math.sin(car.a);
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    const lx = -hl + r * 0.6 + ((hl * 2 - r * 1.2) * i) / (n - 1);
    out.push({ x: car.x + lx * c, y: car.y + lx * s, r });
  }
  return out;
}

export interface SolidQuery {
  query(x: number, y: number, r: number, out?: TaggedSolid[]): TaggedSolid[];
}

/**
 * Tira a lataria de dentro das coisas (2 passadas). Devolve a força da
 * batida (px/s na direção da parede) e em que bateu.
 */
export function collideCar(car: CarBody, half: readonly [number, number], solids: SolidQuery, ignoreId: string): { impact: number; hit: TaggedSolid | null } {
  let impact = 0;
  let hit: TaggedSolid | null = null;
  const buf: TaggedSolid[] = [];
  for (let pass = 0; pass < 2; pass++) {
    let px = 0;
    let py = 0;
    let n = 0;
    for (const c of carCircles(car, half)) {
      for (const t of solids.query(c.x, c.y, c.r + 2, buf)) {
        if (t.id === ignoreId) continue;
        const sd = t.s;
        let dx: number;
        let dy: number;
        let pen: number;
        if (sd.kind === 'rect') {
          const nx = Math.max(sd.x, Math.min(c.x, sd.x + sd.w));
          const ny = Math.max(sd.y, Math.min(c.y, sd.y + sd.h));
          dx = c.x - nx;
          dy = c.y - ny;
          const d = Math.hypot(dx, dy);
          if (d >= c.r) continue;
          if (d < 1e-3) {
            // Centro dentro: empurra para fora pelo lado mais perto.
            const cx = sd.x + sd.w / 2;
            const cy = sd.y + sd.h / 2;
            dx = c.x - cx;
            dy = c.y - cy;
            const dd = Math.hypot(dx, dy) || 1;
            dx /= dd;
            dy /= dd;
            pen = c.r;
          } else {
            dx /= d;
            dy /= d;
            pen = c.r - d;
          }
        } else {
          dx = c.x - sd.x;
          dy = c.y - sd.y;
          const d = Math.hypot(dx, dy);
          const rr = c.r + sd.r;
          if (d >= rr) continue;
          const dd = d || 1;
          dx /= dd;
          dy /= dd;
          pen = rr - d;
        }
        px += dx * pen;
        py += dy * pen;
        n++;
        hit = t;
        // Componente da velocidade contra a parede.
        const into = -(Math.cos(car.a) * car.speed * dx + Math.sin(car.a) * car.speed * dy);
        impact = Math.max(impact, into);
      }
    }
    if (!n) break;
    car.x += px / n;
    car.y += py / n;
  }
  if (hit) car.speed *= impact > 60 ? -0.2 : 0.4;
  return { impact, hit };
}
