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
import { barricadeHit, carDoor, doorBang, doorClose, doorOpen, doorPushed, forceDoor, glassDoor, lockedRattle, metalDoorClose, metalDoorOpen, rollingGate, trunk } from './recipes/doors';
import { cicadas, climb, cloth, cook, cough, dig, dog, draw, drop, fridgeHum, gear, gearShift, glug, houseCreak, match, page, road, roomTone, sharpen, shiver, skid, stomach, tear, tinnitus, tool, vomit, water, yawn } from './recipes/actions';
import { carGlass, glassKnock, windowBreak } from './recipes/glass';
import { bulletImpact, casing, dryFire, GUN_CLASSES, gunshot, jam, reload } from './recipes/guns';
import { footstep, GAITS, SURFACES } from './recipes/steps';
import { crash, engineStart, horn, runOver, starter, tireBlow } from './recipes/vehicles';
import { zombieBite, zombieCrawl, zombieGrab, zombieStep, zombieVoice } from './recipes/zombie';
import { breath, drink, eat, heartbeat, pain, pickup, zipper } from './recipes/body';
import { bird, carAlarm, carEngine, crickets, crow, fireCrackle, fireRoar, generator, rain, roofRain, thunder, wind, windWhistle } from './recipes/ambience';
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
  /** Som contínuo (laço sem emenda): chuva, vento, fogo, motor. */
  loop?: boolean;
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
add('porta.abrirMetal', metalDoorOpen, { range: 600, gain: 0.75 });
add('porta.fecharMetal', metalDoorClose, { range: 900, gain: 0.9 });
add('porta.abrirVidro', glassDoor(false), { range: 480, gain: 0.65 });
add('porta.fecharVidro', glassDoor(true), { range: 650, gain: 0.8 });
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

// ---------------------------------------------------------------- clima e ambiente
// Laços: 2 variações (são longos), taxa menor (economiza memória), sem eco próprio.
const LOOP = { loop: true, variants: 2, cat: 'amb' as SoundCategory, reverb: 0, pitch: 0, maxVoices: 2, range: 1200 };
add('amb.chuvaFraca', rain(0), { ...LOOP, sr: 22050 });
add('amb.chuvaForte', rain(1), { ...LOOP, sr: 22050 });
add('amb.chuvaTelhado', roofRain, { ...LOOP, sr: 22050 });
add('amb.vento', wind, { ...LOOP, sr: 16000 });
add('amb.ventoAssobio', windWhistle, { ...LOOP, sr: 16000 });
add('amb.grilos', crickets, { ...LOOP, sr: 22050 });
add('amb.fogo', fireRoar, { ...LOOP, sr: 22050, range: 520, reverb: 0.2 });
add('amb.gerador', generator, { ...LOOP, sr: 22050, range: 1000, reverb: 0.4 });
add('amb.motor', carEngine, { ...LOOP, sr: 22050 });
add('clima.trovao', thunder(false), { cat: 'amb', sr: 22050, variants: 4, range: 8000, reverb: 0.2, pitch: 0.06, maxVoices: 2 });
add('clima.trovaoPerto', thunder(true), { cat: 'amb', sr: 22050, variants: 3, range: 8000, reverb: 0.3, pitch: 0.04, maxVoices: 2 });
add('bicho.passaro', bird, { cat: 'amb', variants: 8, range: 1400, reverb: 0.5, pitch: 0.04, maxVoices: 3, gain: 0.5 });
add('bicho.corvo', crow, { cat: 'amb', sr: 22050, variants: 4, range: 1800, reverb: 0.6, pitch: 0.05, maxVoices: 2, gain: 0.6 });
add('fogo.estalo', fireCrackle, { cat: 'amb', variants: 8, range: 460, reverb: 0.2, pitch: 0.1, maxVoices: 4, gain: 0.55 });
add('carro.alarme', carAlarm, { cat: 'sfx', sr: 22050, variants: 4, range: 1800, reverb: 0.8, pitch: 0, maxVoices: 3, gain: 0.8 });

// ---------------------------------------------------------------- zumbis
// A voz de cada zumbi: o diretor escolhe as variações e a altura pelo indivíduo (pitch 0 aqui).
const VOZ = { cat: 'voz' as SoundCategory, sr: 24000, variants: 8, pitch: 0, reverb: 0.5, maxVoices: 4 };
add('zumbi.gemido', zombieVoice('gemido'), { ...VOZ, range: 700, gain: 0.7 });
add('zumbi.rosnado', zombieVoice('rosnado'), { ...VOZ, range: 950, gain: 0.85 });
add('zumbi.ataque', zombieVoice('ataque'), { ...VOZ, range: 550, gain: 0.8, maxVoices: 3 });
add('zumbi.morte', zombieVoice('morte'), { ...VOZ, variants: 6, range: 650, gain: 0.8, maxVoices: 3 });
add('zumbi.mordida', zombieBite, { variants: 5, range: 420, gain: 1, reverb: 0.2, maxVoices: 2 });
add('zumbi.agarrao', zombieGrab, { variants: 5, range: 420, gain: 0.9, reverb: 0.2, maxVoices: 2 });
add('zumbi.passo', zombieStep, { sr: 24000, variants: 8, range: 430, gain: 0.45, reverb: 0.3, pitch: 0.08, maxVoices: 6 });
add('zumbi.rastejar', zombieCrawl, { sr: 24000, variants: 5, range: 380, gain: 0.5, reverb: 0.3, maxVoices: 3 });

// ---------------------------------------------------------------- corpo do jogador e mochila
const CORPO = { cat: 'voz' as SoundCategory, range: 300, reverb: 0.15, maxVoices: 1, pitch: 0.03 };
add('corpo.dor', pain, { ...CORPO, variants: 8, gain: 0.8 });
add('corpo.respira', breath, { ...CORPO, sr: 24000, variants: 6, gain: 0.35, reverb: 0.05 });
add('corpo.coracao', heartbeat, { ...CORPO, sr: 16000, variants: 3, gain: 0.6, reverb: 0, pitch: 0.02 });
add('corpo.comer', eat, { ...CORPO, variants: 5, gain: 0.6 });
add('corpo.beber', drink, { ...CORPO, variants: 4, gain: 0.6 });
add('ui.ziper', zipper, { cat: 'ui', variants: 5, range: 200, gain: 0.5, reverb: 0.1, maxVoices: 1, pitch: 0.06 });
add('ui.pegar', pickup, { cat: 'ui', variants: 6, range: 200, gain: 0.55, reverb: 0.1, maxVoices: 2, pitch: 0.08 });

// ---------------------------------------------------------------- ações, itens, sintomas
const ACAO = { cat: 'sfx' as SoundCategory, range: 320, reverb: 0.25, pitch: 0.06, maxVoices: 2, sr: 24000 };
add('acao.pano', cloth, { ...ACAO, variants: 8, gain: 0.5 });
add('acao.rasgar', tear, { ...ACAO, variants: 6, gain: 0.6 });
add('acao.pagina', page, { ...ACAO, variants: 6, gain: 0.4, range: 200 });
add('acao.cozinhar', cook, { ...ACAO, variants: 5, gain: 0.5 });
add('acao.ferramenta', tool, { ...ACAO, variants: 8, gain: 0.55, range: 420 });
add('acao.agua', water, { ...ACAO, variants: 5, gain: 0.5 });
add('acao.combustivel', glug, { ...ACAO, variants: 4, gain: 0.5 });
add('acao.afiar', sharpen, { ...ACAO, variants: 6, gain: 0.45 });
add('acao.fosforo', match, { ...ACAO, variants: 5, gain: 0.55, maxVoices: 1 });
add('acao.cavar', dig, { ...ACAO, variants: 6, gain: 0.55 });
add('acao.escalar', climb, { ...ACAO, variants: 4, gain: 0.7, range: 500, maxVoices: 1 });
add('acao.equipamento', gear, { ...ACAO, variants: 8, gain: 0.35, range: 260, maxVoices: 2, pitch: 0.1 });
add('item.largarLeve', drop(false), { ...ACAO, variants: 6, gain: 0.5 });
add('item.largarPesado', drop(true), { ...ACAO, variants: 6, gain: 0.75, range: 500 });
add('item.sacar', draw, { ...ACAO, variants: 6, gain: 0.5 });
const SINTOMA = { cat: 'voz' as SoundCategory, range: 260, reverb: 0.15, pitch: 0.04, maxVoices: 1, sr: 24000 };
add('corpo.barriga', stomach, { ...SINTOMA, variants: 5, gain: 0.45, sr: 16000 });
add('corpo.tosse', cough, { ...SINTOMA, variants: 6, gain: 0.6, range: 420 });
add('corpo.tremor', shiver, { ...SINTOMA, variants: 4, gain: 0.4 });
add('corpo.bocejo', yawn, { ...SINTOMA, variants: 4, gain: 0.45 });
add('corpo.vomito', vomit, { ...SINTOMA, variants: 3, gain: 0.7, range: 420 });
add('corpo.zumbido', tinnitus, { ...SINTOMA, variants: 3, gain: 0.35, reverb: 0, pitch: 0.03 });
// Casa e rua
add('amb.casa', roomTone, { ...LOOP, sr: 16000 });
add('amb.geladeira', fridgeHum, { ...LOOP, sr: 16000, range: 500 });
add('amb.cigarras', cicadas, { ...LOOP, sr: 22050 });
add('amb.rodagem', road, { ...LOOP, sr: 16000 });
add('amb.rangido', houseCreak, { cat: 'amb', sr: 16000, variants: 6, range: 700, reverb: 0.4, pitch: 0.08, maxVoices: 1, gain: 0.45 });
add('bicho.cachorro', dog, { cat: 'amb', sr: 22050, variants: 6, range: 2500, reverb: 0.7, pitch: 0.05, maxVoices: 1, gain: 0.45 });
add('carro.derrapar', skid, { cat: 'sfx', sr: 22050, variants: 4, range: 900, reverb: 0.4, pitch: 0.08, maxVoices: 1, gain: 0.6 });
add('carro.marcha', gearShift, { cat: 'sfx', sr: 22050, variants: 4, range: 200, reverb: 0.1, pitch: 0.06, maxVoices: 1, gain: 0.5 });

export function soundDef(id: string): SoundDef | undefined {
  return SOUNDS.get(id);
}

/** Semente fixa de uma variação (mesmo som, mesma variação → mesmo áudio). */
export function variantSeed(id: string, v: number): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h ^ Math.imul(v + 1, 0x9e3779b1)) >>> 0;
}
