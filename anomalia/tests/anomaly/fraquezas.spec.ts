/**
 * A coluna "fraqueza explorável" da tabela de §2, uma linha de cada vez.
 *
 * §0 regra 5 diz que a fraqueza é descobrível por observação e nunca
 * explicada por tutorial. Isso só é verdade se ela existir de fato no motor —
 * uma fraqueza que só está escrita na tabela é promessa, não mecânica. Cada
 * teste aqui é a promessa de uma linha, executada.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { anomaly } from '../../core/anomaly/catalog.ts';
import {
  computeDetection, traceVazio, atualizarResidual, limparRastro, ENV_PRESETS,
} from '../../core/anomaly/perception.ts';
import { criarInstancia, updateDistance } from '../../core/anomaly/stateMachine.ts';
import { assignDailyAnomalies, estaAtiva } from '../../core/anomaly/ecology.ts';
import { rngDoTick } from '../../core/anomaly/rng.ts';
import { locais, rastroDeQuemAnda } from './ajuda.ts';

const SECO = ENV_PRESETS.SECO ?? { modifiers: {} };

/** Quantos ticks até ela perder o rastro depois que o jogador para. */
function ticksAteZerar(defId: string, inicial: Partial<ReturnType<typeof traceVazio>>): number {
  const def = anomaly(defId);
  const inst = criarInstancia(defId, 'L1', 'i1', 5);
  atualizarResidual(inst, def, { ...traceVazio(), ...inicial });

  for (let t = 1; t <= 80; t++) {
    atualizarResidual(inst, def, traceVazio());
    if (computeDetection(def, inst.residual, 5, SECO) === 0) return t;
  }
  return Infinity;
}

test('A01: andar devagar em silêncio total funciona sempre', () => {
  const def = anomaly('A01_ESCUTA');
  // sem som e sem voz — mas se mexendo, com luz acesa, cheirando e quente
  const trace = { ...rastroDeQuemAnda(), som: 0, voz: 0, luz: 100, movimento: 100 };
  for (let d = 1; d <= 40; d++) {
    assert.equal(computeDetection(def, trace, d, SECO), 0, `distância ${d}`);
  }
});

test('A02: ficar imóvel vinte segundos a zera', () => {
  // um tick é 10s (perception.TICK_SEGUNDOS), então vinte segundos são dois
  assert.equal(ticksAteZerar('A02_LATEJO', { movimento: 45, calor: 40 }), 2);
});

test('A02: correr e depois congelar não salva — o corpo continua quente', () => {
  const def = anomaly('A02_LATEJO');
  const inst = criarInstancia(def.id, 'L1', 'i1', 5);
  // calor 70 é quem acabou de correr; o limiar de CALOR dela é 45
  atualizarResidual(inst, def, { ...traceVazio(), movimento: 90, calor: 70 });
  atualizarResidual(inst, def, { ...traceVazio(), calor: 70 });
  atualizarResidual(inst, def, { ...traceVazio(), calor: 70 });
  assert.ok(
    computeDetection(def, inst.residual, 5, SECO) > 0,
    'parar depois de correr devia continuar sendo visto pelo calor',
  );
});

test('A03: ferimento tratado = invisível', () => {
  const def = anomaly('A03_FARO');
  const inst = criarInstancia(def.id, 'L1', 'i1', 8);
  const trace = { ...traceVazio(), sangue: 90, cheiro: 40 };

  atualizarResidual(inst, def, trace);
  assert.ok(computeDetection(def, inst.residual, 8, SECO) > 0, 'sangrando ela tem de achar');

  // o bisturi de §13: trata o ferimento e limpa o que ficou para trás
  limparRastro(inst, trace, 'sangue', 'cheiro');
  atualizarResidual(inst, def, trace);
  assert.equal(computeDetection(def, inst.residual, 8, SECO), 0);
});

test('A03: sem tratar, o rastro de sangue é o mais caro do catálogo', () => {
  // decay 0.92: ela ainda tem 92% do seu rastro um tick depois de você parar
  // de sangrar. Sair de 90 e cair abaixo do limiar leva 35 ticks — quase seis
  // minutos in-game com ela sabendo por onde você foi. É o preço de não tratar.
  const sangue = ticksAteZerar('A03_FARO', { sangue: 90 });
  assert.equal(sangue, 35);
  assert.ok(Number.isFinite(sangue), 'e ainda assim tem de acabar (regra 5)');

  // e a fome guarda por mais tempo ainda: decay 0.95
  assert.ok(ticksAteZerar('A11_FOME', { sangue: 90 }) > sangue);
});

test('A04: apagar a lanterna. Só isso', () => {
  const def = anomaly('A04_VITRE');
  const trace = { ...rastroDeQuemAnda(), luz: 0 };
  for (let d = 1; d <= 34; d++) {
    assert.equal(computeDetection(def, trace, d, SECO), 0, `distância ${d}`);
  }
  // e o que ela guarda da luz apagada é o que some mais rápido no catálogo
  assert.ok(ticksAteZerar('A04_VITRE', { luz: 90 }) <= 2);
});

test('A05: largar a arma branca = passar livre', () => {
  const def = anomaly('A05_METALICA');
  const armado = { ...rastroDeQuemAnda(), metal: 65 };
  assert.ok(computeDetection(def, armado, 10, SECO) > 0, 'armado ela tem de achar');

  const desarmado = { ...armado, metal: 0 };
  assert.equal(computeDetection(def, desarmado, 1, SECO), 0);
  assert.ok(ticksAteZerar('A05_METALICA', { metal: 65 }) <= 3, 'e o metal larga rápido');
});

test('A05: a lâmina de vidro-osso passa por ela sem largar nada', () => {
  const def = anomaly('A05_METALICA');
  // metalNoise 0 em §13: para quem só lê metal, ela não existe
  const comVidroOsso = { ...rastroDeQuemAnda(), metal: 0 };
  assert.equal(computeDetection(def, comVidroOsso, 1, SECO), 0);
});

test('A06: não persegue. Ocupa', () => {
  const def = anomaly('A06_PARADA');
  const inst = criarInstancia(def.id, 'L1', 'i1', 12);
  const rng = rngDoTick(1, 'i1', 0);
  for (let t = 0; t < 30; t++) {
    inst.distance = updateDistance(inst, def, 'CACA', rng);
  }
  assert.equal(inst.distance, 12, 'ela andou, e ela não anda');
  // e não lê nada: o jogador inteiro passa despercebido
  assert.equal(computeDetection(def, rastroDeQuemAnda(), 1, SECO), 0);
});

test('A07: nunca falar, nunca chamar nome', () => {
  const def = anomaly('A07_ECO');
  const calado = { ...rastroDeQuemAnda(), voz: 0, memoria: 0 };
  for (let d = 1; d <= 40; d++) {
    assert.equal(computeDetection(def, calado, d, SECO), 0, `distância ${d}`);
  }
  const falou = { ...calado, voz: 50 };
  assert.ok(computeDetection(def, falou, 10, SECO) > 0);
});

test('A07: o que ela guarda de um nome dito dura muito', () => {
  const t = ticksAteZerar('A07_ECO', { memoria: 80 });
  assert.ok(t >= 6, `memória sumiu em ${t} ticks`);
});

test('A08: só ativa com chuva. Espere passar', () => {
  const def = anomaly('A08_MARE');
  const seco = { ...locais()[1]!, weather: 'SECO' };
  const chovendo = { ...seco, weather: 'CHUVA' };
  assert.equal(estaAtiva(def, seco), false);
  assert.equal(estaAtiva(def, chovendo), true);

  // e a ecologia não a coloca no mapa em dia seco, em dia nenhum
  for (let dia = 1; dia <= 40; dia++) {
    const mundo = assignDailyAnomalies(locais(), dia, 4242);
    for (const [, insts] of mundo.porLocal) {
      assert.ok(!insts.some((i) => i.defId === 'A08_MARE'), `dia ${dia}`);
    }
  }
});

test('A09: velocidade 1. Sempre dá pra andar', () => {
  const lenta = anomaly('A09_LENTA');
  const fome = anomaly('A11_FOME');
  const rng = rngDoTick(7, 'i1', 0);

  const fechamento = (def: typeof lenta) => {
    const inst = criarInstancia(def.id, 'L1', 'i1', 30);
    let total = 0;
    for (let t = 0; t < 10; t++) {
      const antes = inst.distance;
      inst.distance = updateDistance(inst, def, 'CACA', rng);
      total += antes - inst.distance;
    }
    return total / 10;
  };

  const passoDoJogadorAndando = 2;
  assert.ok(fechamento(lenta) < passoDoJogadorAndando, 'devia dar pra andar embora dela');
  assert.ok(fechamento(fome) > passoDoJogadorAndando, 'da fome, não');
});

test('A10: duas entidades. Uma é falsa', () => {
  const def = anomaly('A10_GEMEA');
  assert.equal(def.spawnCount, 2);
  assert.equal(def.umaEhFalsa, true);

  let achou = false;
  for (let dia = 1; dia <= 60 && !achou; dia++) {
    const mundo = assignDailyAnomalies(locais(), dia, 31337);
    for (const [, insts] of mundo.porLocal) {
      const gemeas = insts.filter((i) => i.defId === 'A10_GEMEA');
      if (gemeas.length === 0) continue;
      achou = true;
      assert.equal(gemeas.length, 2, 'devia instanciar duas');
      assert.equal(gemeas.filter((g) => g.ehCopiaFalsa).length, 1, 'e uma só é falsa');
    }
  }
  assert.ok(achou, 'as gêmeas não apareceram em sessenta dias');
});

test('A11: sem fraqueza. Fuga pura', () => {
  const def = anomaly('A11_FOME');
  assert.deepEqual(def.blindTo, []);

  // ficar parado não adianta: ela não lê movimento, lê corpo
  const parado = { ...traceVazio(), calor: 40, cheiro: 30 };
  assert.ok(computeDetection(def, parado, 10, SECO) > 0);

  // e o preço de fugir dela é o mais alto do catálogo
  assert.ok(def.persistence >= 20, 'insiste');
  assert.ok(def.delayResistance >= 0.5, 'a lâmina compra menos tempo');
});

test('A12: só aparece no abrigo, na porta', () => {
  const def = anomaly('A12_PORTA');
  for (const loc of locais()) {
    assert.equal(estaAtiva(def, loc), loc.type === 'ABRIGO', loc.id);
  }
  for (let dia = 1; dia <= 40; dia++) {
    const mundo = assignDailyAnomalies(locais(), dia, 777);
    for (const [locId, insts] of mundo.porLocal) {
      if (insts.some((i) => i.defId === 'A12_PORTA')) {
        assert.equal(locId, 'L_ABRI', `apareceu em ${locId}`);
      }
    }
  }
});

test('a tabela de §2 não tem duas anomalias com a mesma leitura do mundo', () => {
  const assinaturas = new Map<string, string>();
  for (const id of ['A01_ESCUTA', 'A02_LATEJO', 'A03_FARO', 'A04_VITRE', 'A05_METALICA',
    'A07_ECO', 'A08_MARE', 'A09_LENTA', 'A10_GEMEA', 'A11_FOME', 'A12_PORTA']) {
    const def = anomaly(id);
    const chave = [...def.senses.map((s) => s.stimulus).sort(),
      '|', ...[...def.blindTo].sort()].join(',');
    const jaTem = assinaturas.get(chave);
    assert.equal(jaTem, undefined, `${id} lê o mundo igualzinho a ${jaTem}`);
    assinaturas.set(chave, id);
  }
});
