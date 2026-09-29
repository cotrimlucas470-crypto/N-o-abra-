/**
 * VEÍCULOS (puro): cada carro, van ou carcaça do mapa tem um ESTADO —
 * portas abertas/trancadas/emperradas, porta-malas, capô, vidros, gasolina,
 * bateria, motor, pneus, lataria, alarme e (às vezes) a chave no contato.
 *
 * O estado nasce da semente (mesmo mundo = mesmos carros) e só vai para o
 * save o carro que alguém mexeu. Os compartimentos (porta-luvas, bancos,
 * porta-malas) são recipientes do loot; aqui se decide QUANDO dá para
 * alcançá-los (porta aberta, vidro quebrado, porta-malas aberto).
 *
 * Pronto para dirigir numa etapa futura: combustível, bateria, motor e
 * pneus já existem, dá para tirar/pôr bateria e pneu e tirar gasolina.
 */
import { hashString, Random } from '../core/Random';
import { CAR_REPAIR, DRIVE_TUNING } from './Driving';
import type { PropPlacement } from '../world/MapTypes';
import type { PropType } from '../world/PropCatalog';

export type VehicleType = 'car' | 'van' | 'carWreck';

export interface DoorSpec {
  id: string;
  label: string;
  /** Ponto de acesso (referencial do desenho: frente = +x, motorista = -y). */
  at: readonly [number, number];
  /** Dobradiça e comprimento da folha (para desenhar aberta). */
  hinge: readonly [number, number];
  length: number;
  /** Lado: -1 = esquerdo (-y), +1 = direito. */
  side: -1 | 1;
  /** Que bancos esta porta alcança. */
  reaches: readonly ('bancoF' | 'bancoT' | 'luvas')[];
  /** Porta de correr (van): desliza em vez de girar. */
  sliding?: boolean;
}

export interface VehicleSpec {
  name: string;
  doors: readonly DoorSpec[];
  trunk: readonly [number, number];
  hood: readonly [number, number];
  /** Meio comprimento e meia largura (px). */
  half: readonly [number, number];
  tankLiters: number;
}

const CAR_DOORS: DoorSpec[] = [
  { id: 'motorista', label: 'porta do motorista', at: [20, -52], hinge: [45, -44], length: 48, side: -1, reaches: ['bancoF', 'luvas'] },
  { id: 'passageiro', label: 'porta do passageiro', at: [20, 52], hinge: [45, 44], length: 48, side: 1, reaches: ['bancoF', 'luvas'] },
  { id: 'traseiraE', label: 'porta de trás (esquerda)', at: [-30, -52], hinge: [-6, -44], length: 44, side: -1, reaches: ['bancoT'] },
  { id: 'traseiraD', label: 'porta de trás (direita)', at: [-30, 52], hinge: [-6, 44], length: 44, side: 1, reaches: ['bancoT'] },
];

export const VEHICLE_SPECS: Record<VehicleType, VehicleSpec> = {
  car: { name: 'carro', doors: CAR_DOORS, trunk: [-100, 0], hood: [100, 0], half: [92, 44], tankLiters: 45 },
  van: {
    name: 'van',
    doors: [
      { id: 'motorista', label: 'porta do motorista', at: [60, -58], hinge: [88, -50], length: 50, side: -1, reaches: ['bancoF', 'luvas'] },
      { id: 'passageiro', label: 'porta do passageiro', at: [60, 58], hinge: [88, 50], length: 50, side: 1, reaches: ['bancoF', 'luvas'] },
      { id: 'lateral', label: 'porta lateral', at: [0, 58], hinge: [30, 50], length: 60, side: 1, reaches: ['bancoT'], sliding: true },
    ],
    trunk: [-120, 0],
    hood: [118, 0],
    half: [111, 50],
    tankLiters: 70,
  },
  carWreck: { name: 'carro destruído', doors: CAR_DOORS.slice(0, 2), trunk: [-100, 0], hood: [100, 0], half: [92, 44], tankLiters: 45 },
};

export function isVehicle(t: PropType): t is VehicleType {
  return t === 'car' || t === 'van' || t === 'carWreck';
}

export interface VehicleState {
  doors: Record<string, { open: boolean; locked: boolean; jammed?: boolean }>;
  trunk: { open: boolean; locked: boolean; jammed?: boolean };
  hood: boolean;
  /** Vidros quebrados (id da porta, 'frente', 'tras'). */
  broken: string[];
  /** Litros no tanque. */
  fuel: number;
  /** Carga da bateria 0..1 (null = bateria retirada). */
  battery: number | null;
  engine: number;
  /** Condição dos 4 pneus (null = pneu retirado). */
  tires: (number | null)[];
  /** Lataria 0..1. */
  body: number;
  alarm: boolean;
  /** Alarme tocando: segundos restantes. */
  alarmLeft?: number;
  keyInside: boolean;
  /** Fiação feita (ligação direta): pega sem chave. */
  hotwired?: boolean;
  /** Já foi desmontado (peças tiradas). */
  stripped?: boolean;
  /** Saiu do lugar onde estava no mapa: onde está agora (px, graus). */
  pose?: { x: number; y: number; a: number };
}

export interface VehicleSettings {
  /** Dias desde o colapso: gasolina evapora, bateria descarrega. */
  collapseAgeDays: number;
}

/** Estado inicial determinístico (semente + id do veículo). */
export function initialState(seed: number, v: PropPlacement, settings: VehicleSettings = { collapseAgeDays: 0 }): VehicleState {
  const r = new Random(hashString(`${seed}:veiculo:${v.id}`));
  const type = v.type as VehicleType;
  const spec = VEHICLE_SPECS[type];
  const wreck = type === 'carWreck';
  const locked = !wreck && r.chance(0.45);
  const doors: VehicleState['doors'] = {};
  for (const d of spec.doors) doors[d.id] = { open: !locked && !wreck && r.chance(0.08), locked, ...(wreck ? { jammed: r.chance(0.7) } : {}) };
  const age = Math.max(0, settings.collapseAgeDays);
  const broken: string[] = [];
  if (wreck) broken.push('frente', ...(r.chance(0.6) ? ['motorista'] : []));
  else if (r.chance(0.12)) broken.push(r.pick(spec.doors).id);
  return {
    doors,
    trunk: { open: !locked && !wreck && r.chance(0.05), locked, ...(wreck ? { jammed: r.chance(0.5) } : {}) },
    hood: wreck && r.chance(0.3),
    broken,
    fuel: wreck ? r.range(0, 3) : Math.max(0, spec.tankLiters * r.range(0.02, 0.75) - age * 0.05),
    battery: wreck ? (r.chance(0.3) ? r.range(0, 0.2) : null) : Math.max(0, r.range(0.15, 1) - age * 0.01),
    engine: wreck ? r.range(0, 0.25) : r.range(0.4, 1),
    tires: [0, 1, 2, 3].map(() => (wreck && r.chance(0.3) ? null : r.chance(0.1) ? r.range(0, 0.15) : r.range(0.45, 1))),
    body: wreck ? r.range(0.05, 0.3) : r.range(0.55, 1),
    alarm: locked && r.chance(0.35),
    keyInside: !locked && !wreck && r.chance(0.1),
  };
}

const DEG = Math.PI / 180;

/** Ponto do desenho → mundo (gira com o carro). */
export function toWorld(v: PropPlacement, lx: number, ly: number): { x: number; y: number } {
  const flip = v.flipX ? -1 : 1;
  const c = Math.cos(v.angle * DEG);
  const s = Math.sin(v.angle * DEG);
  const ax = lx * flip;
  return { x: v.x + ax * c - ly * s, y: v.y + ax * s + ly * c };
}

export class Vehicles {
  private readonly states = new Map<string, VehicleState>();
  private readonly touched = new Set<string>();
  private readonly byId = new Map<string, PropPlacement>();
  private readonly listeners = new Set<(id: string) => void>();
  /** Carros que saíram do lugar e a posição de agora (cópia da colocação do mapa). */
  private readonly movedPlacements = new Map<string, PropPlacement>();

  constructor(
    private readonly seed: number,
    props: readonly PropPlacement[],
    private readonly settings: VehicleSettings = { collapseAgeDays: 0 },
  ) {
    for (const p of props) if (isVehicle(p.type)) this.byId.set(p.id, p);
  }

  get count(): number {
    return this.byId.size;
  }

  /** Onde o veículo ESTÁ (a colocação do mapa ou a pose depois de dirigido). */
  vehicle(id: string): PropPlacement | null {
    return this.movedPlacements.get(id) ?? this.byId.get(id) ?? null;
  }

  /** A colocação original do mapa (não muda). */
  original(id: string): PropPlacement | null {
    return this.byId.get(id) ?? null;
  }

  isMoved(id: string): boolean {
    return this.movedPlacements.has(id);
  }

  /** Veículos fora do lugar original (posição atual). */
  moved(): IterableIterator<PropPlacement> {
    return this.movedPlacements.values();
  }

  /** Moveu (dirigindo): nova pose. Vai para o save. */
  setPose(id: string, x: number, y: number, angleDeg: number): PropPlacement | null {
    const base = this.byId.get(id);
    const s = this.state(id);
    if (!base || !s) return null;
    s.pose = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, a: Math.round(angleDeg * 100) / 100 };
    this.touched.add(id);
    let p = this.movedPlacements.get(id);
    if (!p) {
      p = { ...base };
      this.movedPlacements.set(id, p);
    }
    p.x = s.pose.x;
    p.y = s.pose.y;
    p.angle = s.pose.a;
    return p;
  }

  all(): IterableIterator<PropPlacement> {
    return this.byId.values();
  }

  state(id: string): VehicleState | null {
    const v = this.byId.get(id);
    if (!v) return null;
    let s = this.states.get(id);
    if (!s) {
      s = initialState(this.seed, v, this.settings);
      this.states.set(id, s);
    }
    return s;
  }

  spec(id: string): VehicleSpec | null {
    const v = this.byId.get(id);
    return v ? VEHICLE_SPECS[v.type as VehicleType] : null;
  }

  /** Mexeu: passa a ir para o save (e o desenho é avisado). */
  touch(id: string): void {
    if (!this.byId.has(id)) return;
    this.touched.add(id);
    for (const fn of [...this.listeners]) fn(id);
  }

  onChange(fn: (id: string) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Alarme tocando agora? */
  alarming(id: string): boolean {
    return (this.states.get(id)?.alarmLeft ?? 0) > 0;
  }

  /**
   * Dá para alcançar o compartimento `slot` (luvas, bancoF, bancoT, malas)?
   * Devolve null (pode) ou o motivo.
   */
  access(vehicleId: string, slot: string): string | null {
    const s = this.state(vehicleId);
    const spec = this.spec(vehicleId);
    if (!s || !spec) return null;
    if (slot === 'malas') return s.trunk.open ? null : s.trunk.locked ? 'Porta-malas trancado.' : 'Abra o porta-malas primeiro.';
    const doors = spec.doors.filter((d) => d.reaches.includes(slot as 'bancoF'));
    if (doors.some((d) => s.doors[d.id]?.open || s.broken.includes(d.id))) return null;
    return doors.every((d) => s.doors[d.id]?.locked) ? 'Carro trancado. Chave, pé de cabra ou quebrar o vidro.' : 'Abra a porta primeiro.';
  }

  /** Abre/fecha uma porta. Devolve o motivo se não der. */
  toggleDoor(vehicleId: string, doorId: string): string | null {
    const s = this.state(vehicleId);
    const d = s?.doors[doorId];
    if (!s || !d) return 'Porta inexistente.';
    if (d.jammed) return 'Emperrada. Só com pé de cabra.';
    if (d.locked && !d.open) return 'Trancada.';
    d.open = !d.open;
    this.touch(vehicleId);
    return null;
  }

  toggleTrunk(vehicleId: string): string | null {
    const s = this.state(vehicleId);
    if (!s) return 'Sem porta-malas.';
    if (s.trunk.jammed) return 'Emperrado. Só com pé de cabra.';
    if (s.trunk.locked && !s.trunk.open) return 'Trancado.';
    s.trunk.open = !s.trunk.open;
    this.touch(vehicleId);
    return null;
  }

  toggleHood(vehicleId: string): string | null {
    const s = this.state(vehicleId);
    if (!s) return 'Sem capô.';
    // Capô abre por dentro: precisa de uma porta da frente aberta ou vidro quebrado.
    if (!s.hood && this.access(vehicleId, 'bancoF')) return 'A alavanca do capô fica lá dentro.';
    s.hood = !s.hood;
    this.touch(vehicleId);
    return null;
  }

  /** Destranca tudo (chave, ou por dentro depois de entrar). */
  unlockAll(vehicleId: string): void {
    const s = this.state(vehicleId);
    if (!s) return;
    for (const d of Object.values(s.doors)) d.locked = false;
    s.trunk.locked = false;
    s.alarmLeft = 0;
    this.touch(vehicleId);
  }

  /** Força uma porta ou o porta-malas (pé de cabra): destrava, abre, e pode disparar o alarme. */
  force(vehicleId: string, part: string): boolean {
    const s = this.state(vehicleId);
    if (!s) return false;
    const p = part === 'malas' ? s.trunk : s.doors[part];
    if (!p) return false;
    p.locked = false;
    delete p.jammed;
    p.open = true;
    s.body = Math.max(0, s.body - 0.05);
    this.trigger(s);
    this.touch(vehicleId);
    return true;
  }

  /** Quebra um vidro: dá para alcançar por dentro; alarme dispara. */
  breakWindow(vehicleId: string, doorId: string): boolean {
    const s = this.state(vehicleId);
    if (!s || s.broken.includes(doorId)) return false;
    s.broken.push(doorId);
    this.trigger(s);
    this.touch(vehicleId);
    return true;
  }

  private trigger(s: VehicleState): void {
    if (s.alarm && (s.battery ?? 0) > 0.05) s.alarmLeft = 90;
  }

  /** Segundos de jogo reais passando: alarmes tocando. Devolve os carros que apitam agora. */
  tickAlarms(dt: number): PropPlacement[] {
    const out: PropPlacement[] = [];
    for (const id of this.touched) {
      const s = this.states.get(id);
      if (!s?.alarmLeft) continue;
      s.alarmLeft = Math.max(0, s.alarmLeft - dt);
      const v = this.byId.get(id);
      if (v) out.push(v);
    }
    return out;
  }

  // ---------------------------------------------------------------- peças

  /** Tira gasolina (litros); devolve quanto saiu. */
  siphon(vehicleId: string, liters: number): number {
    const s = this.state(vehicleId);
    if (!s) return 0;
    const n = Math.min(liters, s.fuel);
    s.fuel -= n;
    this.touch(vehicleId);
    return n;
  }

  /** Põe gasolina (litros); devolve quanto entrou. */
  refuel(vehicleId: string, liters: number): number {
    const s = this.state(vehicleId);
    const spec = this.spec(vehicleId);
    if (!s || !spec) return 0;
    const n = Math.min(liters, spec.tankLiters - s.fuel);
    s.fuel += n;
    this.touch(vehicleId);
    return n;
  }

  takeBattery(vehicleId: string): number | null {
    const s = this.state(vehicleId);
    if (!s || s.battery === null) return null;
    const ch = s.battery;
    s.battery = null;
    s.alarmLeft = 0;
    this.touch(vehicleId);
    return ch;
  }

  putBattery(vehicleId: string, charge: number): boolean {
    const s = this.state(vehicleId);
    if (!s || s.battery !== null) return false;
    s.battery = charge;
    this.touch(vehicleId);
    return true;
  }

  takeTire(vehicleId: string, i: number): number | null {
    const s = this.state(vehicleId);
    const t = s?.tires[i];
    if (!s || t === null || t === undefined) return null;
    s.tires[i] = null;
    this.touch(vehicleId);
    return t;
  }

  putTire(vehicleId: string, i: number, condition: number): boolean {
    const s = this.state(vehicleId);
    if (!s || s.tires[i] !== null) return false;
    s.tires[i] = condition;
    this.touch(vehicleId);
    return true;
  }

  /** O que falta para andar (etapa de veículos): lista de motivos. */
  cannotDrive(vehicleId: string, hasKey: boolean): string[] {
    const s = this.state(vehicleId);
    if (!s) return ['Não é um veículo.'];
    const why: string[] = [];
    if (!hasKey && !s.keyInside && !s.hotwired) why.push('sem chave');
    if (s.battery === null) why.push('sem bateria');
    else if (s.battery < 0.15) why.push('bateria fraca');
    if (s.fuel < 0.5) why.push('sem gasolina');
    if (s.engine < DRIVE_TUNING.deadEngine) why.push('motor destruído');
    const bad = s.tires.filter((t) => t === null || t < 0.1).length;
    if (bad) why.push(`${bad} pneu${bad > 1 ? 's' : ''} ruim${bad > 1 ? 's' : ''}`);
    return why;
  }

  /** O que está ruim e como se conserta (para o "Examinar"). */
  problems(vehicleId: string): string[] {
    const s = this.state(vehicleId);
    if (!s) return [];
    const T = DRIVE_TUNING;
    const out: string[] = [];
    if (s.engine < T.deadEngine) out.push('Motor destruído: peças de motor + chave inglesa (capô aberto).');
    else if (s.engine < T.sureStart) out.push('Motor fraco: engasga e pode morrer. Peças de motor, vela nova ou óleo.');
    const flat = s.tires.filter((t) => t !== null && t < 0.15).length;
    if (flat) out.push(`${flat > 1 ? `${flat} pneus furados` : 'Pneu furado'}: remendar (borracha + cola) ou trocar (macaco + chave de roda).`);
    if (s.tires.some((t) => t === null)) out.push('Falta pneu: pneu + macaco + chave de roda.');
    if (s.battery === null) out.push('Sem bateria: bateria de carro + chave inglesa.');
    else if (s.battery < 0.15) out.push('Bateria fraca: troque por uma carregada.');
    if (s.fuel < 0.5) out.push('Tanque vazio: galão de gasolina.');
    return out;
  }

  serialize(): Record<string, VehicleState> {
    const out: Record<string, VehicleState> = {};
    for (const id of this.touched) {
      const s = this.states.get(id);
      if (s) out[id] = JSON.parse(JSON.stringify(s)) as VehicleState;
    }
    return out;
  }

  restore(save: Record<string, VehicleState> | undefined): void {
    for (const [id, s] of Object.entries(save ?? {})) {
      if (!this.byId.has(id) || !s || typeof s !== 'object') continue;
      const st = JSON.parse(JSON.stringify(s)) as VehicleState;
      this.states.set(id, st);
      this.touched.add(id);
      const pose = st.pose;
      if (pose && Number.isFinite(pose.x) && Number.isFinite(pose.y) && Number.isFinite(pose.a)) this.setPose(id, pose.x, pose.y, pose.a);
      else delete st.pose;
    }
  }
}

export type VehicleCondition = 'FUNCIONANDO' | 'DANIFICADO' | 'INUTILIZADO';

/**
 * Estado geral do veículo: FUNCIONANDO (liga e anda), DANIFICADO (tem
 * conserto: pneu, bateria, motor fraco, lataria) ou INUTILIZADO (carcaça,
 * motor destruído ou já desmontado: só serve para tirar peças). Gasolina
 * vazia não é defeito: vai nos motivos.
 */
export function vehicleCondition(s: VehicleState, type: string): { label: VehicleCondition; why: string[] } {
  const T = DRIVE_TUNING;
  if (type === 'carWreck') return { label: 'INUTILIZADO', why: ['carcaça queimada'] };
  if (s.stripped) return { label: 'INUTILIZADO', why: ['desmontado'] };
  if (s.engine < T.deadEngine) return { label: 'INUTILIZADO', why: ['motor destruído'] };
  const why: string[] = [];
  if (s.engine < T.sureStart) why.push('motor fraco');
  const bad = s.tires.filter((t) => t === null || t < 0.15).length;
  if (bad) why.push(bad > 1 ? `${bad} pneus ruins` : 'pneu ruim');
  if (s.battery === null) why.push('sem bateria');
  else if (s.battery < 0.15) why.push('bateria fraca');
  if (s.body < 0.4) why.push('lataria amassada');
  const label: VehicleCondition = why.length ? 'DANIFICADO' : 'FUNCIONANDO';
  if (s.fuel < 0.5) why.push('tanque vazio');
  return { label, why };
}

/** Peças que saem ao desmontar (sorteio com o rng; motor ruim dá menos peça boa). */
export function stripYield(s: VehicleState, rng: () => number): { id: string; n: number }[] {
  const out: { id: string; n: number }[] = [];
  for (const [id, [lo, hi]] of Object.entries(CAR_REPAIR.strip.yields)) {
    let n = lo + Math.floor(rng() * (hi - lo + 1));
    if (id === 'pecasMotor' && s.engine < DRIVE_TUNING.deadEngine * 0.5) n = Math.min(n, 1);
    if (id === 'chapaMetal' && s.body < 0.2) n = 0;
    if (n > 0) out.push({ id, n });
  }
  return out;
}
