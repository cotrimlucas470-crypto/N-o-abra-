/**
 * ONDE O SOM ESTÁ (puro, testável): volume pela distância, lado (estéreo),
 * abafado por parede e quanto eco entra, a partir da posição relativa ao
 * jogador. O motor de áudio só aplica esses números nos nós do Web Audio.
 */
import { AUDIO_TUNING as T } from '../config/AudioTuning';

export type Room = 'rua' | 'comodo';

export interface Placement {
  /** 0..1 (multiplica o volume do som). */
  gain: number;
  /** -1 esquerda .. 1 direita. */
  pan: number;
  /** Corte do passa-baixa (Hz): parede e distância tiram o agudo. */
  cutoff: number;
  /** 0..1: quanto vai para o eco. */
  wet: number;
  room: Room;
}

export interface PlaceInput {
  /** Posição do som menos a do jogador (px de mundo). */
  dx: number;
  dy: number;
  /** Distância em que o som some (px). */
  range: number;
  /** Paredes (ou lajes) entre o som e o jogador. */
  walls: number;
  /** Quanto eco o próprio som leva (catálogo). */
  reverb: number;
  /** Jogador dentro de um prédio: o eco é de cômodo. */
  indoor: boolean;
}

/** null = longe demais (nem toca). */
export function placeSound(p: PlaceInput): Placement | null {
  const d = Math.hypot(p.dx, p.dy);
  // Parede encurta o alcance (o som morre antes) além de abafar.
  const walls = Math.max(0, Math.min(p.walls, 6));
  const range = p.range * Math.pow(T.wallRange, walls);
  if (d >= range) return null;
  const x = d / range;
  // Queda suave: perto é cheio, some sem "degrau" na borda do alcance.
  let gain = Math.pow(1 - x, T.rolloff);
  // Muito perto não estoura: o próprio pé/golpe/tiro já vem no volume certo.
  gain *= Math.pow(T.wallGain, walls);
  if (gain < T.silent) return null;
  // Estéreo: lado em relação ao jogador; perto do centro, quase no meio.
  const pan = Math.max(-T.maxPan, Math.min(T.maxPan, p.dx / (Math.abs(p.dx) + T.panNear)));
  // Ar tira o agudo com a distância; cada parede tira muito mais.
  let cutoff = T.airCutoff * Math.exp(-d / T.airFalloff);
  if (walls > 0) cutoff = Math.min(cutoff, T.wallCutoff / walls);
  cutoff = Math.max(T.minCutoff, Math.min(T.maxCutoff, cutoff));
  // Longe ouve-se mais eco do que som direto (e atrás da parede também).
  const wet = Math.min(1, p.reverb * (T.wetNear + (1 - T.wetNear) * x) + walls * T.wetPerWall);
  return { gain, pan, cutoff, wet, room: p.indoor ? 'comodo' : 'rua' };
}

/** Variação a cada toque: altura (±pitch) e volume (±dB), nunca igual. */
export function playVariation(r: () => number, pitch: number): { rate: number; gain: number } {
  const rate = 1 + (r() * 2 - 1) * pitch;
  const db = (r() * 2 - 1) * T.gainJitterDb;
  return { rate, gain: Math.pow(10, db / 20) };
}

/** Próxima variação sem repetir a última (entre as que já estão prontas). */
export function pickVariant(ready: readonly number[], last: number, r: () => number): number {
  if (ready.length === 0) return -1;
  if (ready.length === 1) return ready[0]!;
  const pool = ready.filter((v) => v !== last);
  return pool[Math.floor(r() * pool.length)]!;
}
