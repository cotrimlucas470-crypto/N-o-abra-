/**
 * RUÍDO (puro). Todo som é um evento com posição, alcance ao ar livre, tipo
 * e hora. Quem ouve (zumbi) recebe só um PALPITE do lugar: longe ou através
 * de parede o palpite é pior. Paredes e portas fechadas abafam (contadas na
 * grade de visão, que é o que separa um cômodo do outro); chuva forte e
 * vento encobrem sons fracos.
 *
 * O barramento de eventos (`world:noise`) continua sendo a porta de entrada:
 * tudo o que já fazia barulho (porta, vidro, tiro, alarme, obra) chega aqui
 * sem mudar quem emite.
 */
import { NOISE_RADIUS, NOISE_TUNING } from '../config/NoiseTuning';
import type { SightGrid } from '../world/nav/SightGrid';

export type NoiseKind =
  | 'passo'
  | 'furtivo'
  | 'corrida'
  | 'queda'
  | 'porta'
  | 'macaneta'
  | 'vidro'
  | 'golpe'
  | 'impacto'
  | 'tiro'
  | 'alarme'
  | 'motor'
  | 'buzina'
  | 'batida'
  | 'construcao'
  | 'demolicao'
  | 'gerador'
  | 'grito'
  | 'zumbi'
  | 'radio'
  | 'outro';

export interface NoiseEvent {
  id: number;
  x: number;
  y: number;
  /** Alcance ao ar livre (px). */
  radius: number;
  kind: NoiseKind;
  /** Texto de origem ("porta", "tiro"...). */
  source: string;
  /** Segundos de simulação em que aconteceu. */
  t: number;
  /** Andar (0 = térreo). */
  floor: number;
  /** Feito pelo jogador (passos, tiros...) — zumbis não "sabem" disso, é só para o debug. */
  byPlayer: boolean;
}

export interface Heard {
  /** 0..1: quanto sobrou do som ao chegar. */
  strength: number;
  /** Paredes no caminho. */
  walls: number;
  /** Onde o ouvinte ACHA que foi (com erro). */
  x: number;
  y: number;
}

/** Tipo do som a partir do texto de origem (emissores antigos não mandam tipo). */
export function kindFromSource(source: string): NoiseKind {
  const s = source.toLowerCase();
  if (s.includes('tiro')) return 'tiro';
  if (s.includes('vidro') || s.includes('janela')) return 'vidro';
  if (s.includes('alarme')) return 'alarme';
  if (s.includes('maçaneta')) return 'macaneta';
  if (s.includes('porta') || s.includes('portão')) return 'porta';
  if (s.includes('demoli') || s.includes('arromba')) return 'demolicao';
  if (s.includes('martel') || s.includes('tábua') || s.includes('serr')) return 'construcao';
  if (s.includes('golpe')) return 'golpe';
  if (s.includes('tombo') || s.includes('queda')) return 'queda';
  if (s.includes('motor')) return 'motor';
  if (s.includes('buzina')) return 'buzina';
  if (s.includes('batida')) return 'batida';
  if (s.includes('gerador')) return 'gerador';
  if (s.includes('grito')) return 'grito';
  if (s.includes('zumbi')) return 'zumbi';
  if (s.includes('rádio') || s.includes('radio')) return 'radio';
  return 'outro';
}

export class NoiseSystem {
  private readonly events: NoiseEvent[] = [];
  private readonly listeners = new Set<(e: NoiseEvent) => void>();
  private nextId = 1;
  /** Relógio de simulação (s). */
  now = 0;

  constructor(
    private readonly sight: SightGrid,
    /** Tempo lá fora: chuva e vento encobrem. */
    private readonly weather: () => { rain: number; wind: number } = () => ({ rain: 0, wind: 0 }),
    private readonly rng: () => number = Math.random,
  ) {}

  /** Um som aconteceu. */
  emit(x: number, y: number, kind: NoiseKind, opts: { radius?: number; source?: string; floor?: number; byPlayer?: boolean } = {}): NoiseEvent {
    const e: NoiseEvent = {
      id: this.nextId++,
      x,
      y,
      radius: opts.radius ?? NOISE_RADIUS[kind],
      kind,
      source: opts.source ?? kind,
      t: this.now,
      floor: opts.floor ?? 0,
      byPlayer: opts.byPlayer ?? false,
    };
    this.events.push(e);
    for (const fn of [...this.listeners]) fn(e);
    return e;
  }

  onNoise(fn: (e: NoiseEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Avança o relógio e esquece os sons velhos. */
  update(dt: number): void {
    this.now += dt;
    const limit = this.now - NOISE_TUNING.memorySeconds;
    let i = 0;
    while (i < this.events.length && this.events[i]!.t < limit) i++;
    if (i) this.events.splice(0, i);
  }

  /** Sons ainda "no ar". */
  recent(): readonly NoiseEvent[] {
    return this.events;
  }

  /** Paredes (trechos opacos) entre dois pontos, contadas na grade de visão. */
  wallsBetween(ax: number, ay: number, bx: number, by: number, max = 6): number {
    const s = this.sight;
    const c = s.cell;
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(len / (c * 0.75)));
    let walls = 0;
    let inside = false;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const op = s.isOpaque(Math.floor((ax + (bx - ax) * t) / c), Math.floor((ay + (by - ay) * t) / c));
      if (op && !inside) {
        walls++;
        if (walls >= max) return walls;
      }
      inside = op;
    }
    return walls;
  }

  /**
   * O ouvinte em (lx, ly) ouve o som? `hearing` = acuidade (1 = normal).
   * Devolve a força que chegou e um PALPITE do lugar (nunca a posição exata
   * de quem fez o barulho, a não ser de muito perto).
   */
  heard(e: NoiseEvent, lx: number, ly: number, hearing = 1, floor = 0): Heard | null {
    const d = Math.hypot(e.x - lx, e.y - ly);
    const w = this.weather();
    const mask = 1 - NOISE_TUNING.rainMask * w.rain - NOISE_TUNING.windMask * w.wind;
    // Outro andar: a escada/laje abafa como duas paredes.
    const floorWalls = Math.abs((e.floor ?? 0) - floor) * 2;
    let reach = e.radius * hearing * Math.max(0.4, mask);
    if (d >= reach) return null;
    const walls = this.wallsBetween(lx, ly, e.x, e.y) + floorWalls;
    for (let i = 0; i < walls; i++) reach = reach * (1 - NOISE_TUNING.wallDamp) - NOISE_TUNING.wallFlat;
    if (d >= reach) return null;
    const strength = (reach - d) / reach;
    const err = d * NOISE_TUNING.errorPerDistance * (1 - strength * 0.6) + walls * NOISE_TUNING.errorPerWall;
    const a = this.rng() * Math.PI * 2;
    const r = this.rng() * err;
    return { strength, walls, x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r };
  }
}
