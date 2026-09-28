/**
 * SESSÃO DE DIREÇÃO (pura): o jogador ao volante de um carro do mundo.
 * Junta a física (Driving.ts), o estado do carro (gasolina, motor, pneus,
 * lataria, vidros), o mundo (colisão exata, a pose vai para o estado e o
 * save) e os zumbis (atropelo derruba e quebra; parado, eles cercam, batem
 * na lataria, estouram o vidro e agarram pela janela).
 *
 * Quem chama (a cena) cuida do jogador escondido, da câmera, dos controles e
 * das mensagens — aqui só a regra.
 */
import { DRIVE_TUNING as T, collideCar, driveControls, startChance, stepCar, carCircles, type CarBody } from './Driving';
import { VEHICLE_SPECS, toWorld, type VehicleSpec, type VehicleState, type VehicleType } from './Vehicles';
import type { SolidIndex } from '../sim/SolidIndex';
import type { WorldState } from '../sim/WorldState';
import type { NoiseKind } from '../sim/Noise';
import type { ZombieSystem } from '../zombies/ZombieSystem';
import { bodyRadius } from '../zombies/ZombieMotion';
import type { Zombie } from '../zombies/Zombie';

const DEG = Math.PI / 180;

export interface DriveEvents {
  noise(x: number, y: number, kind: NoiseKind, radius: number, source: string): void;
  message(text: string, tone: 'info' | 'warn' | 'bad' | 'ok'): void;
  /** Atropelou (efeito de sangue). */
  ranOver?(z: Zombie, killed: boolean, x: number, y: number, dir: number): void;
  /** Batida forte: machuca quem dirige (px/s da batida). */
  crash?(impact: number): void;
}

export class DriveSession {
  readonly car: CarBody;
  readonly spec: VehicleSpec;
  private engineT = 0;
  private hornT = 0;
  private fuelWarned = false;
  /** Motor fraco morreu andando: acelerar tenta pegar de novo de tempos em tempos. */
  stalled = false;
  private restartT = 0;
  private readonly near: Zombie[] = [];

  constructor(
    readonly id: string,
    private readonly state: WorldState,
    private readonly solids: SolidIndex,
    private readonly zombies: ZombieSystem,
    private readonly ev: DriveEvents,
    private readonly rng: () => number = Math.random,
  ) {
    const p = state.vehicles.vehicle(id)!;
    this.spec = VEHICLE_SPECS[p.type as VehicleType];
    // O desenho do carro espelhado olha para -x.
    const a = p.angle * DEG + (p.flipX ? Math.PI : 0);
    this.car = { x: p.x, y: p.y, a, speed: 0 };
    // Entrou: fecha a porta do motorista; o carro sai do lugar do mapa.
    const s = this.st;
    const d = s.doors['motorista'];
    if (d) d.open = false;
    state.vehicles.touch(id);
    this.sync(false);
  }

  get st(): VehicleState {
    return this.state.vehicles.state(this.id)!;
  }

  /** km/h na escala do jogo (1 tile = 1,3 m). */
  get kmh(): number {
    return Math.round(((Math.abs(this.car.speed) / 64) * 1.3 * 3.6));
  }

  /** Grava a pose no estado (parado = obstáculo de navegação de novo). */
  sync(parked: boolean): void {
    const p = this.state.vehicles.original(this.id)!;
    const deg = (this.car.a - (p.flipX ? Math.PI : 0)) / DEG;
    this.state.moveVehicle(this.id, this.car.x, this.car.y, deg, parked);
  }

  /** Buzina: MUITO barulho (distrai a horda — ou chama). */
  horn(): void {
    if (this.hornT > 0) return;
    this.hornT = 0.7;
    this.ev.noise(this.car.x, this.car.y, 'buzina', 1600, 'buzina');
  }

  /**
   * Um quadro dirigindo. `stick` = direção desejada (joystick/teclado) e
   * intensidade; `held` = agarrado pela janela (não dá para dirigir direito).
   */
  update(dt: number, stick: { x: number; y: number; mag: number }, held: boolean): void {
    const s = this.st;
    this.hornT = Math.max(0, this.hornT - dt);
    const tires = s.tires.map((t) => t ?? 0);
    const cond = { engine: this.stalled ? 0 : s.engine, tires: tires.reduce((a, b) => a + b, 0) / 4, body: s.body, fuel: s.fuel };
    const want = held ? { throttle: 0, steer: 0 } : driveControls(this.car, stick.x, stick.y, stick.mag);
    // Motor morto: ainda dá para esterçar, mas não acelera.
    const ctl = this.stalled ? { throttle: 0, steer: want.steer } : want;
    const before = { x: this.car.x, y: this.car.y };
    const used = stepCar(this.car, ctl, cond, dt);
    s.fuel = Math.max(0, s.fuel - used.fuel);
    if (used.dist > 0) this.wear(used.dist);
    this.engineTrouble(dt, want.throttle !== 0);
    if (s.fuel <= 0.5 && !this.fuelWarned) {
      this.fuelWarned = true;
      this.ev.message(s.fuel <= 0 ? 'Acabou a gasolina.' : 'Gasolina na reserva.', 'warn');
    }
    // Bateu em algo?
    const c = collideCar(this.car, this.spec.half, this.solids, this.id);
    if (c.hit && c.impact > T.crashSpeed) {
      const dmg = (c.impact - T.crashSpeed) * T.crashDamage;
      s.body = Math.max(0, s.body - dmg);
      s.engine = Math.max(0, s.engine - dmg * 0.4);
      // Bateu de frente com força: o vidro da frente estoura.
      if (c.impact > 300 && !s.broken.includes('frente')) s.broken.push('frente');
      this.ev.noise(this.car.x, this.car.y, 'batida', 500 + c.impact * 1.5, 'batida de carro');
      if (c.impact > 200) {
        this.ev.crash?.(c.impact);
        if (this.rng() < T.flatOnCrash) this.flat();
      }
    }
    // Não sair do mapa.
    const W = this.state.model.widthPx;
    const H = this.state.model.heightPx;
    this.car.x = Math.min(Math.max(this.car.x, 60), W - 60);
    this.car.y = Math.min(Math.max(this.car.y, 60), H - 60);
    this.hitZombies(dt);
    // Motor: barulho contínuo, mais alto acelerando.
    this.engineT -= dt;
    if (this.engineT <= 0 && s.fuel > 0 && s.engine > 0.05 && !this.stalled) {
      this.engineT = 1.2;
      this.ev.noise(this.car.x, this.car.y, 'motor', 520 + Math.abs(this.car.speed) * 0.9, 'motor');
    }
    if (Math.hypot(this.car.x - before.x, this.car.y - before.y) > 0.05 || used.dist > 0) this.sync(false);
  }

  /** Desgaste por km rodado: o motor cansa devagar; às vezes um pneu fura (gasto fura mais). */
  private wear(dist: number): void {
    const s = this.st;
    s.engine = Math.max(0, s.engine - dist * T.engineWearPerPx);
    for (let i = 0; i < s.tires.length; i++) {
      const t = s.tires[i];
      if (t === null || t === undefined || t < 0.15) continue;
      if (this.rng() < dist * T.flatPerPx * (1.5 - t)) {
        this.flat(i);
        return;
      }
    }
  }

  /** Um pneu fura (o indicado ou um bom qualquer). */
  private flat(i?: number): void {
    const s = this.st;
    const idx = i ?? s.tires.findIndex((t) => t !== null && t >= 0.15);
    if (idx < 0) return;
    s.tires[idx] = T.flatLeft;
    this.ev.noise(this.car.x, this.car.y, 'impacto', 380, 'pneu estourando');
    this.ev.message('Um pneu furou! O carro perde velocidade.', 'bad');
  }

  /**
   * Motor fraco pode morrer andando (raro com motor bom: nunca acima de
   * `weakEngine`). Morto, cada tanto acelerando tenta pegar de novo — faz
   * barulho de arranque e pode não pegar.
   */
  private engineTrouble(dt: number, pushing: boolean): void {
    const s = this.st;
    if (!pushing || s.fuel <= 0) return;
    if (!this.stalled) {
      if (s.engine < T.weakEngine && this.rng() < (T.weakEngine - s.engine) * T.stallRate * dt) {
        this.stalled = true;
        this.restartT = T.restartEvery;
        const dead = s.engine < T.deadEngine;
        this.ev.message(dead ? 'O motor morreu de vez. Precisa de conserto.' : 'O motor morreu! Continue acelerando para dar a partida.', 'bad');
      }
      return;
    }
    if (s.engine < T.deadEngine) return;
    this.restartT -= dt;
    if (this.restartT > 0) return;
    this.restartT = T.restartEvery;
    this.ev.noise(this.car.x, this.car.y, 'motor', 380, 'motor de arranque');
    if (this.rng() < startChance(s.engine)) {
      this.stalled = false;
      this.ev.message('O motor pegou de novo.', 'ok');
    }
  }

  /** Atropelo e empurrão dos zumbis na frente da lataria. */
  private hitZombies(dt: number): void {
    const car = this.car;
    const circles = carCircles(car, this.spec.half);
    const speed = Math.abs(car.speed);
    const dir = car.a + (car.speed < 0 ? Math.PI : 0);
    for (const z of this.zombies.store.aliveNear(car.x, car.y, this.spec.half[0] + 40, this.near)) {
      let hit: { x: number; y: number; r: number } | null = null;
      for (const c of circles) {
        const rr = c.r + bodyRadius(z);
        if ((z.x - c.x) ** 2 + (z.y - c.y) ** 2 < rr * rr) {
          hit = c;
          break;
        }
      }
      if (!hit) continue;
      if (speed > T.hitSpeed && z.mind.state !== 'FALL') {
        // Atropelo: pancada nas pernas/tronco, joga para o lado e para a frente.
        const part = speed > 250 ? (Math.random() < 0.5 ? 'tronco' : 'pernaE') : Math.random() < 0.5 ? 'pernaE' : 'pernaD';
        const r = this.zombies.hit(z, { kind: 'atropelo', damage: speed * 0.14, dir, part });
        const push = Math.min(90, speed * 0.25);
        z.x += Math.cos(dir) * push + Math.cos(dir + Math.PI / 2) * (Math.random() - 0.5) * 30;
        z.y += Math.sin(dir) * push + Math.sin(dir + Math.PI / 2) * (Math.random() - 0.5) * 30;
        car.speed *= speed > 250 ? 0.85 : 0.7;
        const s = this.st;
        s.body = Math.max(0, s.body - 0.006);
        if (speed > 260 && !s.broken.includes('frente') && Math.random() < 0.2) s.broken.push('frente');
        this.ev.noise(z.x, z.y, 'impacto', 420, 'atropelo');
        this.ev.ranOver?.(z, r.killed, z.x, z.y, dir);
      } else {
        // Devagar: empurra para fora da lataria (não passa por cima).
        const dx = z.x - hit.x;
        const dy = z.y - hit.y;
        const d = Math.hypot(dx, dy) || 1;
        const pen = hit.r + bodyRadius(z) - d;
        z.x += (dx / d) * pen;
        z.y += (dy / d) * pen;
        // Um cercado de zumbis segura o carro.
        car.speed *= Math.max(0, 1 - dt * 3);
      }
    }
  }

  /**
   * Lugar para sair (porta do motorista; se não couber, a outra). null =
   * sem espaço (cercado ou encostado).
   */
  exitPoint(): { x: number; y: number } | null {
    const p = this.state.vehicles.vehicle(this.id)!;
    for (const d of this.spec.doors) {
      const q = toWorld(p, d.at[0], d.at[1] + d.side * 10);
      if (this.solids.free(q.x, q.y, 15) && !this.zombies.store.aliveNear(q.x, q.y, 22).length) return q;
    }
    return null;
  }

  /** Vidro do lado do zumbi (a porta mais perto dele). */
  sideDoorOf(zx: number, zy: number): string {
    const p = this.state.vehicles.vehicle(this.id)!;
    let best = this.spec.doors[0]!.id;
    let bd = Infinity;
    for (const d of this.spec.doors) {
      const q = toWorld(p, d.at[0], d.at[1]);
      const dd = Math.hypot(q.x - zx, q.y - zy);
      if (dd < bd) {
        bd = dd;
        best = d.id;
      }
    }
    return best;
  }
}
