/**
 * CATÁLOGO DE SONS (puro): cada som é uma receita física + como tocar.
 *
 * - `variants`: quantos "tons" diferentes são gerados (sementes diferentes).
 *   Na hora de tocar ainda entra altura e volume sorteados: nunca repete.
 * - `range`: distância (px de mundo) em que o som some de vez.
 * - `reverb`: quanto do eco do lugar entra (rua ou cômodo).
 * - `pitch`: variação de altura a cada toque (0,05 = ±5%).
 */
import type { Rng } from './dsp';
import { bodyFall, fleshHit, objectHit, whoosh } from './recipes/combat';
import { barricadeHit, carDoor, doorBang, doorClose, doorOpen, doorPushed, forceDoor, lockedRattle, rollingGate, trunk } from './recipes/doors';
import { carGlass, glassKnock, windowBreak } from './recipes/glass';
import { bulletImpact, casing, dryFire, GUN_CLASSES, gunshot, jam, reload } from './recipes/guns';
import { footstep, GAITS, SURFACES } from './recipes/steps';
import { crash, engineStart, horn, runOver, starter, tireBlow } from './recipes/vehicles';
import { axe, cabinet, demolish, dismantle, drawer, fridge, hammer, pickaxe, planks, rummage, sheetMetal } from './recipes/work';

export type SoundCategory = 'sfx' | 'voz' | 'ui' | 'amb';

export interface SoundDef {
  id: string;
  make: (rng: Rng, sr: number) => Float32Array;
  variants: number;
  /** Taxa de amostragem da geração (graves podem usar menos: menos memória). */
  sr: number;
  gain: number;
  range: number;
  reverb: number;
  pitch: number;
  cat: SoundCategory;
  maxVoices: number;
}

const DEF = { variants: 6, sr: 32000, gain: 1, range: 900, reverb: 0.5, pitch: 0.05, cat: 'sfx' as SoundCategory, maxVoices: 4 };

export const SOUNDS = new Map<string, SoundDef>();

function add(id: string, make: SoundDef['make'], o: Partial<Omit<SoundDef, 'id' | 'make'>> = {}): void {
  SOUNDS.set(id, { ...DEF, ...o, id, make });
}

// ---------------------------------------------------------------- passos
for (const s of SURFACES)
  for (const g of GAITS)
    add(`passo.${s}.${g}`, footstep(s, g), {
      variants: 8,
      gain: g === 'furtivo' ? 0.35 : g === 'corrida' ? 0.85 : 0.6,
      range: g === 'furtivo' ? 260 : g === 'corrida' ? 700 : 480,
      reverb: 0.35,
      pitch: 0.06,
      maxVoices: 3,
    });

// ---------------------------------------------------------------- portas e vidro
add('porta.abrir', doorOpen, { range: 520, gain: 0.7 });
add('porta.fechar', doorClose, { range: 700, gain: 0.85 });
add('porta.trancada', lockedRattle, { range: 380, gain: 0.7 });
add('porta.portao', rollingGate, { range: 900, gain: 0.8, variants: 4 });
add('porta.empurrada', doorPushed, { range: 600, gain: 0.7 });
add('porta.batida', doorBang(false), { range: 1000, gain: 1 });
add('porta.batidaMetal', doorBang(true), { range: 1100, gain: 1 });
add('porta.barricada', barricadeHit, { range: 900, gain: 0.95 });
add('porta.arrombar', forceDoor, { range: 900, gain: 1, variants: 4 });
add('carro.porta', carDoor, { range: 520, gain: 0.8 });
add('carro.portaMalas', trunk, { range: 420, gain: 0.7, variants: 4 });
add('vidro.janela', windowBreak, { range: 1300, gain: 1, variants: 5, maxVoices: 3 });
add('vidro.carro', carGlass, { range: 1100, gain: 1, variants: 4 });
add('vidro.batida', glassKnock, { range: 700, gain: 0.8 });

// ---------------------------------------------------------------- combate
add('golpe.ar.leve', whoosh('leve'), { range: 260, gain: 0.45, pitch: 0.1, reverb: 0.15 });
add('golpe.ar.medio', whoosh('medio'), { range: 300, gain: 0.55, pitch: 0.1, reverb: 0.15 });
add('golpe.ar.pesado', whoosh('pesado'), { range: 340, gain: 0.65, pitch: 0.08, reverb: 0.15 });
add('acerto.carne.contundente', fleshHit('contundente'), { range: 600, gain: 0.9, variants: 8 });
add('acerto.carne.corte', fleshHit('corte'), { range: 500, gain: 0.8, variants: 8 });
add('acerto.carne.perfuracao', fleshHit('perfuracao'), { range: 500, gain: 0.8 });
add('acerto.soco', fleshHit('soco'), { range: 400, gain: 0.7 });
add('acerto.madeira', objectHit('madeira'), { range: 700, gain: 0.85 });
add('acerto.metal', objectHit('metal', 0.8), { range: 1000, gain: 0.8 });
add('acerto.concreto', objectHit('concreto'), { range: 600, gain: 0.8 });
add('acerto.plastico', objectHit('plastico'), { range: 500, gain: 0.7 });
add('acerto.ceramica', objectHit('ceramica', 0.8), { range: 700, gain: 0.8 });
add('acerto.lataria', sheetMetal, { range: 900, gain: 0.85 });
add('corpo.queda', bodyFall, { range: 520, gain: 0.8 });

// ---------------------------------------------------------------- armas de fogo
for (const g of GUN_CLASSES) {
  add(`tiro.${g}`, gunshot(g), { range: 3200, gain: 1, variants: 5, pitch: 0.035, reverb: 1, maxVoices: 4 });
  add(`recarga.${g}`, reload(g), { range: 300, gain: 0.55, variants: 3, pitch: 0.03, reverb: 0.2, maxVoices: 1 });
}
add('arma.capsula', casing, { range: 260, gain: 0.35, pitch: 0.08, reverb: 0.2, maxVoices: 4 });
add('arma.seca', dryFire, { range: 220, gain: 0.5, reverb: 0.2 });
add('arma.emperrou', jam, { range: 240, gain: 0.55, reverb: 0.2 });
add('bala.parede', bulletImpact('parede'), { range: 700, gain: 0.7 });
add('bala.madeira', bulletImpact('madeira'), { range: 650, gain: 0.7 });
add('bala.metal', bulletImpact('metal'), { range: 900, gain: 0.7 });

// ---------------------------------------------------------------- trabalho e objetos
add('obra.martelo', hammer, { range: 900, gain: 0.9, variants: 4 });
add('obra.machado', axe, { range: 900, gain: 0.95, variants: 5 });
add('obra.picareta', pickaxe, { range: 900, gain: 0.95, variants: 5 });
add('obra.tabuas', planks, { range: 600, gain: 0.8 });
add('obra.demolicao', demolish, { range: 1400, gain: 1, variants: 4 });
add('obra.desmonte', dismantle, { range: 600, gain: 0.8, variants: 4 });
add('objeto.gaveta', drawer, { range: 320, gain: 0.6 });
add('objeto.armario', cabinet, { range: 320, gain: 0.6 });
add('objeto.geladeira', fridge, { range: 320, gain: 0.6, variants: 4 });
add('objeto.revirar', rummage, { range: 280, gain: 0.5 });

// ---------------------------------------------------------------- carros
add('carro.buzina', horn, { range: 2400, gain: 0.9, variants: 3, pitch: 0.01, maxVoices: 1 });
add('carro.batida', crash, { range: 1500, gain: 1, variants: 4 });
add('carro.pneu', tireBlow, { range: 1100, gain: 1, variants: 3 });
add('carro.arranque', starter, { range: 700, gain: 0.8, variants: 4, maxVoices: 1 });
add('carro.partida', engineStart, { range: 900, gain: 0.9, variants: 4, maxVoices: 1 });
add('carro.atropelo', runOver, { range: 700, gain: 0.95 });

export function soundDef(id: string): SoundDef | undefined {
  return SOUNDS.get(id);
}

/** Semente fixa de uma variação (mesmo som, mesma variação → mesmo áudio). */
export function variantSeed(id: string, v: number): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h ^ Math.imul(v + 1, 0x9e3779b1)) >>> 0;
}
