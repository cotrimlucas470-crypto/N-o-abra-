import { describe, expect, it } from 'vitest';
import { Rng } from '../src/game/audio/dsp';
import { bulletSound, objectSound, zombieVoiceOf } from '../src/game/audio/GameAudio';
import { GAITS, SURFACES } from '../src/game/audio/recipes/steps';
import { SOUNDS, soundDef, variantSeed } from '../src/game/audio/SoundCatalog';
import { actionSound, gaitFor, gunClassFor, soundForContainer, soundForNoise, surfaceFor, swingWeight } from '../src/game/audio/SoundMap';
import { RECIPES } from '../src/game/crafting/Recipes';
import { pickVariant, placeSound, playVariation } from '../src/game/audio/spatial';
import { nextVolume, volumeLabel } from '../src/game/audio/Volume';
import { Ambience, engineRpm, gearOf, type AmbienceState } from '../src/game/audio/Ambience';
import type { AudioEngine } from '../src/game/audio/AudioEngine';
import { AMBIENCE_TUNING } from '../src/game/config/AudioTuning';
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
        // Laços e trovão são longos de propósito; o resto é curto.
        const max = d.loop || id.startsWith('clima.') ? 9 : 4;
        if (!finite || peak > 1 || peak < 0.05 || sec < 0.02 || sec > max) bad.push(`${id}#${v}: pico ${peak.toFixed(3)}, ${sec.toFixed(2)} s${finite ? '' : ', NaN'}`);
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

  it('laços dão a volta sem emenda (sem estalo na virada)', () => {
    for (const d of SOUNDS.values()) {
      if (!d.loop) continue;
      const a = render(d.id, 0);
      let maxStep = 0;
      for (let i = 1; i < a.length; i++) maxStep = Math.max(maxStep, Math.abs(a[i]! - a[i - 1]!));
      const seam = Math.abs(a[0]! - a[a.length - 1]!);
      expect(seam, d.id).toBeLessThanOrEqual(maxStep + 1e-6);
    }
  });

  it('cada som tem várias variações e limites de voz', () => {
    for (const d of SOUNDS.values()) {
      expect(d.variants, d.id).toBeGreaterThanOrEqual(d.loop ? 2 : 3);
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
      ['alarme de carro', 950],
    ];
    const missing = sources.filter(([s, r]) => !has(soundForNoise(s, undefined, r)?.id)).map(([s]) => s);
    expect(missing).toEqual([]);
  });

  it('som exato pedido por quem emite existe (porta abrindo/fechando, partida do carro)', () => {
    for (const id of ['porta.abrir', 'porta.fechar', 'porta.portao', 'carro.arranque', 'carro.partida']) expect(has(soundForNoise('porta', 'porta', 260, id)?.id), id).toBe(true);
  });

  it('passo, golpe e tiro não tocam pelo barulho (saem direto, com mais detalhe)', () => {
    for (const s of ['passos', 'golpe', 'tiro']) expect(soundForNoise(s, undefined, 300)).toBeNull();
    // Motor ligado e gerador são contínuos (laço ao vivo), não um som solto a cada pulso.
    expect(soundForNoise('motor', 'motor', 700)).toBeNull();
    expect(soundForNoise('gerador', 'gerador', 900)).toBeNull();
    // Gemido: a voz sai pelo gancho do zumbi (cada um com a sua), não pelo barulho.
    expect(soundForNoise('gemido', 'zumbi', 300)).toBeNull();
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

describe('sons: ambiente ao vivo', () => {
  function fake() {
    const live = new Map<string, { gain: number; rate: number; alive: boolean }>();
    const shots: string[] = [];
    const engine = {
      muted: false,
      loop: (id: string) => {
        const v = { gain: 0, rate: 1, alive: true };
        live.set(id, v);
        return {
          get alive() {
            return v.alive;
          },
          set: (o: { gain?: number; rate?: number }) => {
            if (o.gain !== undefined) v.gain = o.gain;
            if (o.rate !== undefined) v.rate = o.rate;
          },
          stop: () => {
            v.alive = false;
            v.gain = 0;
          },
        };
      },
    } as unknown as AudioEngine;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const amb = new Ambience(
      engine,
      {
        listener: () => ({ x: 0, y: 0 }),
        place: () => ({ gain: 0.8, pan: 0, cutoff: 8000, wet: 0.2, room: 'rua' }),
        at: (id) => shots.push(id),
        near: (id) => shots.push(id),
      },
      rnd,
    );
    const gain = (id: string) => (live.get(id)?.alive ? live.get(id)!.gain : 0);
    return { amb, gain, live, shots };
  }
  const base: AmbienceState = { rain: 0, snow: 0, wind: 0, thunder: 0, temp: 22, minuteOfDay: 600, dayHours: 12, winter: 0, summer: 0.6, sheltered: false, busy: false, fires: [], generators: [], engine: null };
  const run = (f: ReturnType<typeof fake>, st: AmbienceState, sec = 2) => {
    for (let t = 0; t < sec; t += 0.05) f.amb.update(0.05, st);
  };

  it('chuva lá fora x no telhado (dentro de casa)', () => {
    const f = fake();
    run(f, { ...base, rain: 0.9 });
    expect(f.gain('amb.chuvaForte')).toBeGreaterThan(0.3);
    expect(f.gain('amb.chuvaTelhado')).toBe(0);
    run(f, { ...base, rain: 0.9, sheltered: true });
    expect(f.gain('amb.chuvaTelhado')).toBeGreaterThan(0.3);
    expect(f.gain('amb.chuvaForte')).toBeLessThan(0.2);
    // Garoa usa o laço de gotas soltas, não o do temporal.
    const g = fake();
    run(g, { ...base, rain: 0.15 });
    expect(g.gain('amb.chuvaFraca')).toBeGreaterThan(0);
    expect(g.gain('amb.chuvaForte')).toBe(0);
  });

  it('grilos só em noite quente; pássaros de dia; nada com tempo acelerado', () => {
    const night = fake();
    run(night, { ...base, minuteOfDay: 1380 });
    expect(night.gain('amb.grilos')).toBeGreaterThan(0.05);
    const cold = fake();
    run(cold, { ...base, minuteOfDay: 1380, temp: 4, winter: 0.9 });
    expect(cold.gain('amb.grilos')).toBe(0);
    const day = fake();
    run(day, { ...base, minuteOfDay: 420 }, 120);
    expect(day.shots.filter((s) => s === 'bicho.passaro').length).toBeGreaterThan(5);
    const busy = fake();
    run(busy, { ...base, minuteOfDay: 420, busy: true }, 120);
    expect(busy.shots.filter((s) => s === 'bicho.passaro').length).toBe(0);
  });

  it('vento forte assobia; fogo e gerador perto tocam', () => {
    const f = fake();
    run(f, { ...base, wind: 0.95, fires: [{ x: 100, y: 0, power: 1 }], generators: [{ x: 300, y: 0 }] }, 6);
    expect(f.gain('amb.vento')).toBeGreaterThan(0);
    expect(f.live.has('amb.ventoAssobio')).toBe(true);
    expect(f.gain('amb.fogo')).toBeGreaterThan(0.2);
    expect(f.gain('amb.gerador')).toBeGreaterThan(0.2);
    expect(f.shots.filter((s) => s === 'fogo.estalo').length).toBeGreaterThan(3);
  });

  it('motor: giro sobe na marcha, cai na troca, nunca passa do máximo', () => {
    expect(engineRpm(0)).toBe(AMBIENCE_TUNING.idleRpm);
    expect(engineRpm(15)).toBeGreaterThan(engineRpm(5));
    const g = AMBIENCE_TUNING.gears;
    expect(engineRpm(g[1]! + 1)).toBeLessThan(engineRpm(g[1]! - 1));
    for (let v = 0; v < 200; v += 5) expect(engineRpm(v)).toBeLessThanOrEqual(AMBIENCE_TUNING.maxRpm);
    const f = fake();
    run(f, { ...base, engine: { kmh: 50, stalled: false } });
    expect(f.gain('amb.motor')).toBeGreaterThan(0.2);
    expect(f.live.get('amb.motor')!.rate).toBeCloseTo(engineRpm(50) / 1000, 1);
    run(f, { ...base, engine: { kmh: 0, stalled: true } });
    expect(f.gain('amb.motor')).toBe(0);
  });
});

describe('sons: zumbis e corpo', () => {
  it('cada zumbi tem a sua voz (fixa pela identidade) e as vozes variam entre eles', () => {
    const v1 = zombieVoiceOf('z-123');
    expect(zombieVoiceOf('z-123')).toEqual(v1);
    const voices = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const v = zombieVoiceOf(`z-${i}`);
      expect(v.a).not.toBe(v.b);
      expect(v.rate).toBeGreaterThanOrEqual(0.84);
      expect(v.rate).toBeLessThanOrEqual(1.16);
      voices.add(`${v.a}-${v.b}-${Math.round(v.rate * 50)}`);
    }
    expect(voices.size).toBeGreaterThan(150);
  });

  it('todos os sons de zumbi e do corpo existem', () => {
    for (const id of ['zumbi.gemido', 'zumbi.rosnado', 'zumbi.ataque', 'zumbi.morte', 'zumbi.mordida', 'zumbi.agarrao', 'zumbi.passo', 'zumbi.rastejar', 'corpo.dor', 'corpo.respira', 'corpo.coracao', 'corpo.comer', 'corpo.beber', 'ui.ziper', 'ui.pegar']) expect(SOUNDS.has(id), id).toBe(true);
  });
});

describe('sons: ações, itens e sintomas', () => {
  it('toda ação demorada com som toca sons que existem (e fabricar usa a habilidade)', () => {
    const ids = ['tratar', 'rasgar', 'ler', 'lavar', 'encherAgua', 'cozinhar', 'sifao', 'afiar', 'pneu', 'motor', 'cortar', 'quebrar', 'pregarTabuas', 'plantar', 'acenderFogo', 'pular', 'arrombar', 'derrubarParede'];
    for (const id of ids) {
      const a = actionSound(id);
      expect(a, id).not.toBeNull();
      for (const s of a!.ids) expect(SOUNDS.has(s), `${id} → ${s}`).toBe(true);
    }
    for (const r of RECIPES) for (const s of actionSound(`fabricar:${r.id}`)!.ids) expect(SOUNDS.has(s), r.id).toBe(true);
    expect(actionSound('dormir')).toBeNull();
    expect(actionSound(null)).toBeNull();
  });

  it('porta soa pelo material (madeira, metal, vidro)', () => {
    for (const id of ['porta.abrir', 'porta.fechar', 'porta.abrirMetal', 'porta.fecharMetal', 'porta.abrirVidro', 'porta.fecharVidro']) expect(SOUNDS.has(id), id).toBe(true);
  });

  it('sons de sintomas, casa, estrada e itens existem', () => {
    for (const id of ['corpo.barriga', 'corpo.tosse', 'corpo.tremor', 'corpo.bocejo', 'corpo.vomito', 'corpo.zumbido', 'amb.casa', 'amb.geladeira', 'amb.cigarras', 'amb.rodagem', 'amb.rangido', 'bicho.cachorro', 'carro.derrapar', 'carro.marcha', 'item.largarLeve', 'item.largarPesado', 'item.sacar', 'acao.equipamento']) expect(SOUNDS.has(id), id).toBe(true);
  });

  it('marcha pela velocidade', () => {
    expect(gearOf(0)).toBe(0);
    expect(gearOf(10)).toBe(1);
    expect(gearOf(30)).toBe(2);
    expect(gearOf(200)).toBe(5);
  });
});
