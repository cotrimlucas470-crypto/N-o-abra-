/**
 * Climas forçados do painel de debug (?debug): para ver e fotografar cada
 * aparência sem esperar o clima de verdade. Só mexe no que se vê/sente agora.
 */
import type { WeatherSample } from '../sim/Weather';

const calm = { rain: 0, snow: 0, precip: 0, fog: 0, thunder: 0, front: 0 };

export const WEATHER_PRESETS: readonly { name: string; w: Partial<WeatherSample> | null }[] = [
  { name: 'real', w: null },
  { name: 'sol', w: { ...calm, cloud: 0.05, wind: 0.12, sky: 'limpo' } },
  { name: 'poucas nuvens', w: { ...calm, cloud: 0.48, wind: 0.3, sky: 'poucas-nuvens' } },
  { name: 'nublado', w: { ...calm, cloud: 0.85, wind: 0.35, front: 0.4, sky: 'nublado' } },
  { name: 'garoa', w: { ...calm, cloud: 0.9, rain: 0.18, precip: 0.18, wind: 0.25, sky: 'chuva-fraca' } },
  { name: 'chuva', w: { ...calm, cloud: 0.95, rain: 0.5, precip: 0.5, wind: 0.45, sky: 'chuva' } },
  { name: 'chuva forte', w: { ...calm, cloud: 1, rain: 0.8, precip: 0.8, wind: 0.6, front: 1, sky: 'chuva' } },
  { name: 'tempestade', w: { ...calm, cloud: 1, rain: 0.95, precip: 0.95, wind: 0.9, thunder: 0.95, front: 1, sky: 'tempestade' } },
  { name: 'neblina', w: { ...calm, cloud: 0.6, fog: 0.75, wind: 0.05, sky: 'neblina' } },
  { name: 'neblina densa', w: { ...calm, cloud: 0.7, fog: 1, wind: 0.02, sky: 'neblina' } },
  { name: 'ventania', w: { ...calm, cloud: 0.4, wind: 0.95, sky: 'poucas-nuvens' } },
  { name: 'neve fraca', w: { ...calm, cloud: 0.9, snow: 0.2, precip: 0.2, wind: 0.2, temp: -1, sky: 'neve-fraca' } },
  { name: 'neve', w: { ...calm, cloud: 0.95, snow: 0.55, precip: 0.55, wind: 0.35, temp: -4, sky: 'neve' } },
  { name: 'nevasca', w: { ...calm, cloud: 1, snow: 0.95, precip: 0.95, wind: 0.9, temp: -9, sky: 'nevasca' } },
];
