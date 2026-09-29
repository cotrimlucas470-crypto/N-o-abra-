import { describe, expect, it } from 'vitest';
import { Rng } from '../src/game/audio/dsp';
import { bulletSound, objectSound } from '../src/game/audio/GameAudio';
import { GAITS, SURFACES } from '../src/game/audio/recipes/steps';
import { SOUNDS, soundDef, variantSeed } from '../src/game/audio/SoundCatalog';
import { gaitFor, gunClassFor, soundForContainer, soundForNoise, surfaceFor, swingWeight } from '../src/game/audio/SoundMap';
import { pickVariant, placeSound, playVariation } from '../src/game/audio/spatial';
import { nextVolume, volumeLabel } from '../src/game/audio/Volume';
import { VOLUME_STEPS } from '../src/game/config/AudioTuning';
import { allItems } from '../src/game/items/ItemCatalog';
import { Ground as G } from '../src/game/world/MapTypes';

function render(id: string, v: number): Float32Array {
  const d = soundDef(id)!;
  return d.make(new Rng(variantSeed(id, v)), d.sr);
}

describe('sons: receitas', () => {
  it('todo som do catálogo gera áudio limpo (finito, sem estourar, audível, duração certa)', () => {
    const bad: string[] = [];
    let worst = 0;
    for (const [id, d] of SOUNDS) {
      for (const v of [0, 1]) {
        const t0 = performance.now();
        const a = d.make(new Rng(variantSeed(id, v)), d.sr);
        worst = Math.max(worst, performance.now() - t0);
        let peak = 0;
        let finite = true;
        for (const x of a) {
          if (!Number.isFinite(x)) finite = false;
          peak = Math.max(peak, Math.abs(x));
        }
        const sec = a.length / d.sr;
        if (!finite || peak > 1 || peak < 0.05 || sec < 0.02 || sec > 4) bad.push(`${id}#${v}: pico ${peak.toFixed(3)}, ${sec.toFixed(2)} s${finite ? '' : ', NaN'}`);
      }
    }
    expect(bad).toEqual([]);
    // Gerar uma variação não pode travar o jogo.
    expect(worst).toBeLessThan(120);
  });

  it('mesma semente = mesmo som; outra semente = outro tom', () => {
    const ids = ['passo.neve.passo', 'porta.fechar', 'vidro.janela', 'tiro.espingarda', 'acerto.carne.contundente', 'obra.martelo'];
    for (const id of ids) {
      const a = render(id, 0);
      const b = render(id, 0);
      expect(a).toEqual(b);
      const c = render(id, 1);
      const differs = a.length !== c.length || a.some((x, i) => Math.abs(x - c[i]!) > 1e-4);
      expect(differs, id).toBe(true);
    }
  });

  it('cada som tem várias variações e limites de voz', () => {
    for (const d of SOUNDS.values()) {
      expect(d.variants, d.id).toBeGreaterThanOrEqual(3);
      expect(d.maxVoices, d.id).toBeGreaterThanOrEqual(1);
      expect(d.range, d.id).toBeGreaterThan(100);
    }
  });
});

describe('sons: o que toca para cada coisa', () => {
  const has = (id: string | null | undefined) => !!id && SOUNDS.has(id);

  it('todo barulho do jogo que já tem som mapeia para um som que existe', () => {
    const sources: [string, number][] = [
      ['maçaneta', 140],
      ['porta', 260],
      ['portão', 400],
      ['porta empurrada', 260],
      ['batida na porta', 420],
      ['batida na porta', 520],
      ['batida na barricada', 440],
      ['batida no vidro', 300],
      ['janela quebrada', 900],
      ['vidro', 900],
      ['vidro do carro', 700],
      ['vidro de carro', 520],
      ['vidro da porta', 900],
      ['porta arrombada', 900],
      ['porta de carro', 160],
      ['porta-malas', 180],
      ['lataria', 450],
      ['batida no carro', 360],
      ['batida de carro', 800],
      ['pneu estourando', 380],
      ['motor de arranque', 380],
      ['buzina', 1600],
      ['atropelo', 420],
      ['arrombamento', 420],
      ['martelo', 420],
      ['machado', 380],
      ['picareta', 420],
      ['tábuas', 300],
      ['demolição', 760],
      ['desmonte', 260],
      ['tombo', 220],
      ['queda', 380],
      ['escada', 170],
      ['partida do gerador', 420],
      ['barricada caiu', 800],
    ];
    const missing = sources.filter(([s, r]) => !has(soundForNoise(s, undefined, r)?.id)).map(([s]) => s);
    expect(missing).toEqual([]);
  });

  it('som exato pedido por quem emite existe (porta abrindo/fechando, partida do carro)', () => {
    for (const id of ['porta.abrir', 'porta.fechar', 'porta.portao', 'carro.arranque', 'carro.partida']) expect(has(soundForNoise('porta', 'porta', 260, id)?.id), id).toBe(true);
  });

  it('passo, golpe e tiro não tocam pelo barulho (saem direto, com mais detalhe)', () => {
    for (const s of ['passos', 'golpe', 'tiro']) expect(soundForNoise(s, undefined, 300)).toBeNull();
    // Motor ligado é contínuo (ao vivo), não um som solto a cada pulso.
    expect(soundForNoise('motor', 'motor', 700)).toBeNull();
  });

  it('todo chão × andar tem passo', () => {
    for (const s of SURFACES) for (const g of GAITS) expect(has(`passo.${s}.${g}`), `${s}.${g}`).toBe(true);
  });

  it('chão debaixo do pé: neve, neve funda, molhado, dentro de casa', () => {
    const o = { outdoor: true, snow: 0, snowCm: 0, wet: 0, upstairs: false };
    expect(surfaceFor(G.Asphalt, o)).toBe('asfalto');
    expect(surfaceFor(G.Asphalt, { ...o, wet: 0.6 })).toBe('molhado');
    expect(surfaceFor(G.Grass, { ...o, snow: 0.6, snowCm: 4 })).toBe('neve');
    expect(surfaceFor(G.Grass, { ...o, snow: 0.9, snowCm: 20 })).toBe('neveFunda');
    // Dentro de casa não tem neve nem poça.
    expect(surfaceFor(G.WoodFloor, { ...o, outdoor: false, snow: 0.9, snowCm: 20, wet: 1 })).toBe('madeira');
    expect(surfaceFor(G.TileFloor, { ...o, outdoor: false })).toBe('ceramica');
    expect(surfaceFor(G.Carpet, { ...o, outdoor: false })).toBe('carpete');
    expect(surfaceFor(G.Gravel, o)).toBe('cascalho');
    expect(gaitFor(0.5)).toBe('furtivo');
    expect(gaitFor(1)).toBe('passo');
    expect(gaitFor(2)).toBe('corrida');
  });

  it('toda arma de fogo do catálogo tem tiro e recarga próprios', () => {
    const guns = allItems().filter((d) => d.gun);
    expect(guns.length).toBeGreaterThan(0);
    for (const d of guns) {
      const c = gunClassFor(d.iconSpec.k, d.gun!.caliber);
      expect(has(`tiro.${c}`), d.id).toBe(true);
      expect(has(`recarga.${c}`), d.id).toBe(true);
    }
    // Armas diferentes soam diferentes.
    const classes = new Set(guns.map((d) => gunClassFor(d.iconSpec.k, d.gun!.caliber)));
    expect(classes.size).toBeGreaterThanOrEqual(6);
  });

  it('golpe pelo peso da arma; acerto por material', () => {
    expect(swingWeight(undefined)).toBe('leve');
    expect(swingWeight(1)).toBe('medio');
    expect(swingWeight(3)).toBe('pesado');
    for (const w of ['leve', 'medio', 'pesado']) expect(has(`golpe.ar.${w}`)).toBe(true);
    for (const m of ['madeira', 'metal', 'vidro', 'plastico', 'tecido', 'pedra', 'planta', 'ceramica'] as const) {
      expect(has(objectSound(m).id), m).toBe(true);
      expect(has(bulletSound(m)), m).toBe(true);
    }
  });

  it('recipiente aberto tem som pelo tipo do móvel', () => {
    expect(soundForContainer('Gaveta da cômoda')).toBe('objeto.gaveta');
    expect(soundForContainer('Geladeira')).toBe('objeto.geladeira');
    expect(soundForContainer('Armário da cozinha')).toBe('objeto.armario');
    expect(has(soundForContainer('Caixa de papelão'))).toBe(true);
    expect(has(soundForContainer('qualquer coisa'))).toBe(true);
  });
});

describe('sons: espaço', () => {
  const base = { dx: 0, dy: 0, range: 1000, walls: 0, reverb: 0.5, indoor: false };

  it('longe = mais baixo, mais eco, menos agudo; fora do alcance nem toca', () => {
    const near = placeSound({ ...base, dx: 50 })!;
    const far = placeSound({ ...base, dx: 700 })!;
    expect(near.gain).toBeGreaterThan(far.gain);
    expect(far.wet).toBeGreaterThan(near.wet);
    expect(far.cutoff).toBeLessThan(near.cutoff);
    expect(placeSound({ ...base, dx: 1001 })).toBeNull();
  });

  it('parede abafa (volume e agudo) e encurta o alcance', () => {
    const open = placeSound({ ...base, dx: 300 })!;
    const wall = placeSound({ ...base, dx: 300, walls: 1 })!;
    expect(wall.gain).toBeLessThan(open.gain * 0.6);
    expect(wall.cutoff).toBeLessThan(2000);
    expect(placeSound({ ...base, dx: 800, walls: 3 })).toBeNull();
  });

  it('lado certo no estéreo; dentro de casa, eco de cômodo', () => {
    expect(placeSound({ ...base, dx: 400 })!.pan).toBeGreaterThan(0.3);
    expect(placeSound({ ...base, dx: -400 })!.pan).toBeLessThan(-0.3);
    expect(Math.abs(placeSound({ ...base, dy: 400 })!.pan)).toBeLessThan(0.01);
    expect(placeSound({ ...base, indoor: true })!.room).toBe('comodo');
  });

  it('variação a cada toque: nunca repete a última e muda altura/volume', () => {
    let seed = 1;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let last = -1;
    for (let i = 0; i < 200; i++) {
      const v = pickVariant([0, 1, 2, 3], last, r);
      expect(v).not.toBe(last);
      last = v;
    }
    expect(pickVariant([2], 2, r)).toBe(2);
    const rates = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const p = playVariation(r, 0.05);
      expect(p.rate).toBeGreaterThanOrEqual(0.95);
      expect(p.rate).toBeLessThanOrEqual(1.05);
      rates.add(Math.round(p.rate * 1000));
    }
    expect(rates.size).toBeGreaterThan(10);
  });

  it('botão SOM: 100% → 60% → 30% → desligado → 100%', () => {
    const seen = [VOLUME_STEPS[0] as number];
    for (let i = 0; i < 4; i++) seen.push(nextVolume(seen[seen.length - 1]!));
    expect(seen).toEqual([1, 0.6, 0.3, 0, 1]);
    expect(volumeLabel(0)).toBe('SOM: DESLIGADO');
    expect(volumeLabel(0.6)).toBe('SOM: 60%');
  });
});
