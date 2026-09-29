/**
 * Volume do botão SOM (pausa): 100% → 60% → 30% → desligado, salvo no aparelho.
 */
import { VOLUME_STEPS } from '../config/AudioTuning';
import { readJson, writeJson } from '../core/Storage';

const KEY = 'som';

export function loadVolume(): number {
  const v = readJson<number>(KEY, 1);
  return typeof v === 'number' && VOLUME_STEPS.includes(v as (typeof VOLUME_STEPS)[number]) ? v : 1;
}

export function saveVolume(v: number): void {
  writeJson(KEY, v);
}

/** Próximo passo do botão (depois de desligado volta para 100%). */
export function nextVolume(v: number): number {
  const i = VOLUME_STEPS.findIndex((s) => s === v);
  return VOLUME_STEPS[(i + 1) % VOLUME_STEPS.length]!;
}

export function volumeLabel(v: number): string {
  return v <= 0 ? 'SOM: DESLIGADO' : `SOM: ${Math.round(v * 100)}%`;
}
