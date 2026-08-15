import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tick, vaiEncostar, emitTraces, contact, spawnEncounter, checarRealidade,
  TETO_DE_APRENDIZADO, CHECAGEM,
} from '../../core/v9/anomaly.ts';
import { estadoInicial } from '../../core/v9/sanity.ts';
import type { AnomalyDef, PlayerState } from '../../core/v9/types.ts';
import { makeRng } from '../../core/sanity/rng.ts';

const rng = (c = 'v9a') => makeRng(909, c);

function bicho(over: Partial<AnomalyDef> = {}): AnomalyDef {
  return {
    id: 'coisa', nickname: 'a coisa do porão',
    senses: { SOM: 1, ODOR: 0.5, VISUAL: 0.8, METAL: 1.2, PRESENCA: 0.4 },
    blindTo: [], threshold: 40, decay: 3, memory: {},
    ...over,
  };
}
function jogador(over: Partial<PlayerState> = {}): PlayerState {
  return {
    moveSpeed: 0, radioOn: false, bleeding: false, daysUnwashed: 0,
    flashlightOn: false, inventory: [], marked: false, weapon: null, overload: 0,
    ...over,
  };
}

test('o rastro soma; parar de emitir deixa o esquecimento comer', () => {
  const a = bicho();
  let heat = 0;
  const andando = emitTraces(jogador({ moveSpeed: 2 }));
  for (let i = 0; i < 5; i++) heat = tick(a, heat, andando);
  assert.ok(heat > 0, 'andar acumula');
  const pico = heat;
  const parado = emitTraces(jogador());
  for (let i = 0; i < 5; i++) heat = tick(a, heat, parado);
  assert.ok(heat < pico, 'parar derruba a conta');
});

test('o calor nunca fica negativo', () => {
  const a = bicho({ decay: 50 });
  assert.equal(tick(a, 2, emitTraces(jogador())), 0);
});

test('o ponto cego é absoluto: o rastro cego não entra por mais forte que seja', () => {
  const surda = bicho({ blindTo: ['METAL'] });
  const p = jogador({ inventory: [{ id: 'pe-de-cabra', metalNoise: 30 }] });
  const so = emitTraces(p).filter((t) => t.kind === 'METAL');
  assert.equal(so.length, 1);
  assert.equal(tick(surda, 0, so), 0, 'metal não somou nada');
  const normal = bicho();
  assert.ok(tick(normal, 0, so) > 0, 'e para quem escuta, soma');
});

test('não existe desaparecer: parado, no escuro e sem ferro, PRESENCA continua', () => {
  const t = emitTraces(jogador());
  assert.deepEqual(t.map((x) => x.kind), ['PRESENCA']);
  assert.equal(t[0]!.power, 3);
});

test('estar marcado quadruplica a presença', () => {
  const normal = emitTraces(jogador()).find((t) => t.kind === 'PRESENCA')!;
  const marcado = emitTraces(jogador({ marked: true })).find((t) => t.kind === 'PRESENCA')!;
  assert.equal(normal.power, 3);
  assert.equal(marcado.power, 12);
});

test('sangrar entra no cheiro somado aos dias sem lavar', () => {
  const t = emitTraces(jogador({ bleeding: true, daysUnwashed: 4 }));
  assert.equal(t.find((x) => x.kind === 'ODOR')!.power, 13);
});

test('o contato só acontece quando a conta chega no limiar', () => {
  const a = bicho({ threshold: 40 });
  assert.equal(vaiEncostar(a, 39.9), false);
  assert.equal(vaiEncostar(a, 40), true);
});

test('a mesma tática perde força até o teto de 45 pontos', () => {
  const a = bicho();
  const p = jogador();
  const r = rng('aprende');
  for (let i = 0; i < 3; i++) contact(a, p, 'correr pro porão', r);
  assert.equal(a.memory['correr pro porão'], 3);
  // usada 3x -> aprendizado 0.45, que é o teto
  const a2 = bicho({ memory: { x: 3 } });
  const a3 = bicho({ memory: { x: 99 } });
  const escapou = (def: AnomalyDef) => {
    let n = 0;
    const rr = rng('conta');
    for (let i = 0; i < 3000; i++) {
      const d = { ...def, memory: { ...def.memory } };
      if (contact(d, p, 'x', rr).out === 'FUGA') n++;
    }
    return n / 3000;
  };
  const tres = escapou(a2), muitas = escapou(a3);
  assert.ok(Math.abs(tres - muitas) < 0.04,
    `o teto não segurou: 3 usos ${tres}, 99 usos ${muitas}`);
  assert.equal(TETO_DE_APRENDIZADO, 0.45);
});

test('a lâmina não mata — compra segundos', () => {
  const p0 = jogador();
  const p1 = jogador({ weapon: { id: 'facao', delaySec: 4 } });
  const taxa = (p: PlayerState) => {
    let n = 0;
    const r = rng('lamina');
    for (let i = 0; i < 3000; i++) {
      const a = bicho();
      if (contact(a, p, 'encarar', r).out === 'FUGA') n++;
    }
    return n / 3000;
  };
  const sem = taxa(p0), com = taxa(p1);
  assert.ok(com > sem + 0.15, `a lâmina não ajudou: ${sem} -> ${com}`);
  // e nunca existe "matar a anomalia": nenhuma saída é vitória
  const saidas = new Set<string>();
  const r = rng('saidas');
  for (let i = 0; i < 3000; i++) saidas.add(contact(bicho(), p0, 't', r).out);
  assert.deepEqual([...saidas].sort(), ['FUGA', 'FUGA_CARA', 'MARCADO', 'MORTE']);
});

test('a fórmula tem um degrau: a partir de delaySec 2 a morte sai da mesa', () => {
  // escape = .55 + delaySec*.05. MORTE exige r >= escape + .35, e r < 1,
  // então escape >= .65 torna a morte impossível — e escape >= .75 tira
  // também o MARCADO. Com delaySec 2 já se chega em .65.
  const conta = (delaySec: number, tactic = 't') => {
    const p = jogador({ weapon: delaySec ? { id: 'l', delaySec } : null });
    const r = rng('degrau' + delaySec);
    const saidas = new Set<string>();
    for (let i = 0; i < 6000; i++) saidas.add(contact(bicho(), p, tactic, r).out);
    return [...saidas].sort();
  };
  assert.ok(conta(0).includes('MORTE'), 'de mãos vazias a morte existe');
  assert.ok(!conta(2).includes('MORTE'), 'com delaySec 2 a morte já é impossível');
  assert.ok(!conta(4).includes('MARCADO'), 'com delaySec 4 sobra só fugir');
  assert.deepEqual(conta(4), ['FUGA', 'FUGA_CARA']);
});

test('mas a memória devolve a morte: a faca não protege quem repete a tática', () => {
  const p = jogador({ weapon: { id: 'faca', delaySec: 2 } });
  const r = rng('memoria-morte');
  const saidas = new Set<string>();
  for (let i = 0; i < 6000; i++) {
    // usada muitas vezes: aprendizado 0.45 derruba escape para 0.20
    const a = bicho({ memory: { t: 99 } });
    saidas.add(contact(a, p, 't', r).out);
  }
  assert.ok(saidas.has('MORTE'), 'repetir com faca na mão volta a poder matar');
});

test('a mochila cheia atrapalha a fuga', () => {
  const taxa = (overload: number) => {
    let n = 0;
    const r = rng('carga');
    const p = jogador({ overload });
    for (let i = 0; i < 3000; i++) if (contact(bicho(), p, 't', r).out === 'FUGA') n++;
    return n / 3000;
  };
  assert.ok(taxa(0) > taxa(1) + 0.05, 'carregar tudo devia custar');
});

test('a chance de fuga tem piso e teto', () => {
  const desesperado = jogador({ overload: 1 });
  const a = bicho({ memory: { t: 99 } });
  let fugas = 0;
  const r = rng('piso');
  for (let i = 0; i < 4000; i++) {
    const d = { ...a, memory: { ...a.memory } };
    if (contact(d, desesperado, 't', r).out === 'FUGA') fugas++;
  }
  // 0.55 - 0.45 - 0.10 = 0.00, travado no piso de 0.05
  assert.ok(fugas / 4000 > 0.02 && fugas / 4000 < 0.09, `piso furado: ${fugas / 4000}`);
});

test('sem nada lá, a cabeça constrói — e só quando a cabeça está ruim', () => {
  const lucido = estadoInicial();
  const r1 = rng('fantasma-a');
  for (let i = 0; i < 500; i++) {
    assert.equal(spawnEncounter(lucido, null, r1, () => bicho()), null);
  }
  const ruim = estadoInicial();
  ruim.sanity = 15;                       // DESFEITO: ilusao .65 -> .39 de fantasma
  const r2 = rng('fantasma-b');
  let n = 0;
  for (let i = 0; i < 3000; i++) if (spawnEncounter(ruim, null, r2, () => bicho())) n++;
  const taxa = n / 3000;
  assert.ok(taxa > 0.35 && taxa < 0.44, `esperava ~.39, deu ${taxa}`);
});

test('havendo coisa real, ela vem — e vem marcada como real', () => {
  const ruim = estadoInicial(); ruim.sanity = 5;
  const r = rng('real');
  const real = bicho();
  for (let i = 0; i < 300; i++) {
    const e = spawnEncounter(ruim, real, r, () => bicho({ id: 'fantasma' }))!;
    assert.equal(e.fake, false);
    assert.equal(e.def.id, 'coisa');
  }
});

test('o fantasma chega com os mesmos avisos: nada no encontro o denuncia', () => {
  const ruim = estadoInicial(); ruim.sanity = 5;
  const r = rng('igual');
  let e = null;
  while (!e) e = spawnEncounter(ruim, null, r, () => bicho());
  assert.deepEqual(Object.keys(e.def).sort(), Object.keys(bicho()).sort());
});

test('a checagem custa 8s e 4 de estresse e acerta 80% das vezes', () => {
  assert.equal(CHECAGEM.segundos, 8);
  assert.equal(CHECAGEM.estresse, 4);
  const r = rng('checa');
  const e = { def: bicho(), fake: true };
  let certos = 0;
  for (let i = 0; i < 4000; i++) if (checarRealidade(e, r).correto) certos++;
  const taxa = certos / 4000;
  assert.ok(taxa > 0.77 && taxa < 0.83, `esperava ~.80, deu ${taxa}`);
});

test('quando a checagem erra, ela mente com a mesma cara de certeza', () => {
  const r = rng('erra');
  const e = { def: bicho(), fake: true };
  const res: string[] = [];
  for (let i = 0; i < 400; i++) res.push(checarRealidade(e, r).respondeu);
  assert.ok(res.includes('FALSO') && res.includes('REAL'),
    'a checagem devia às vezes dizer REAL sobre um fantasma');
  // e nunca existe uma terceira resposta do tipo "não sei"
  assert.deepEqual([...new Set(res)].sort(), ['FALSO', 'REAL']);
});
