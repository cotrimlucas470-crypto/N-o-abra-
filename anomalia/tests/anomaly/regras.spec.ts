/**
 * As sete regras inegociáveis de §0 como teste executável.
 * Se alguma destas falha, o subsistema saiu da especificação.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ANOMALIES, BLADES, OPTIONS, PHANTOM_OPTIONS, assertCatalogoSano, anomaly,
} from '../../core/anomaly/catalog.ts';
import {
  computeDetection, traceVazio, ENV_PRESETS, stateFromScore, atualizarResidual,
} from '../../core/anomaly/perception.ts';
import {
  tick, criarInstancia, avisouAsTresCamadas,
} from '../../core/anomaly/stateMachine.ts';
import {
  assertContratoDeTelegraph, emitTelegraph, violacoesDoContrato,
} from '../../core/anomaly/telegraph.ts';
import { buildEncounter, chanceDaOpcao } from '../../core/anomaly/encounter.ts';
import { resolveContact } from '../../core/anomaly/contact.ts';
import { rngDoEncontro, rngDoTick } from '../../core/anomaly/rng.ts';
import { createSanityState, refresh } from '../../core/sanity/state.ts';
import { inventarioBasico } from './ajuda.ts';

const SECO = ENV_PRESETS.SECO ?? { modifiers: {} };

test('regra 1: não existe onde escrever "derrotar"', () => {
  // A anomalia não tem vida, dano nem estado de morte. Se algum dia alguém
  // acrescentar um, este teste é o que avisa.
  for (const a of ANOMALIES) {
    const campos = Object.keys(a);
    for (const proibido of ['hp', 'health', 'vida', 'dano', 'damage', 'armor']) {
      assert.ok(!campos.includes(proibido), `${a.id} ganhou campo ${proibido}`);
    }
  }
  // e a arma branca só compra tempo: toda arma tem atraso e uso secundário
  for (const b of BLADES) {
    assert.ok(b.delayTicks > 0, `${b.id} não compra tempo nenhum`);
    assert.ok(b.secondaryUse.length > 0, `${b.id} sem uso secundário`);
  }
});

test('regra 2: toda anomalia é um conjunto de regras de percepção', () => {
  assert.doesNotThrow(assertCatalogoSano);
  for (const a of ANOMALIES) {
    // o que ela percebe e o que ela ignora não se cruzam
    for (const s of a.senses) {
      assert.ok(!a.blindTo.includes(s.stimulus), `${a.id}: ${s.stimulus} nos dois lados`);
    }
  }
});

test('regra 2: o que ela ignora, ela ignora de verdade', () => {
  for (const a of ANOMALIES) {
    for (const cego of a.blindTo) {
      const trace = traceVazio();
      // estímulo no talo, no colo dela
      const chave = cego.toLowerCase() as keyof typeof trace;
      trace[chave] = 100;
      const score = computeDetection(a, trace, 1, SECO);
      assert.equal(score, 0, `${a.id} reagiu a ${cego}, para o que é cega`);
    }
  }
});

test('regra 3: as três camadas de aviso sempre vêm antes do encontro', () => {
  for (const def of ANOMALIES) {
    if (def.estatica) continue;
    const inst = criarInstancia(def.id, 'L1', 'i1', 30);
    const rng = rngDoTick(1, 'i1', 0);

    // detecção no talo desde o primeiro tick: o pior caso possível
    for (let t = 0; t < 12; t++) {
      tick(inst, def, 100, rng);
      if (inst.state === 'CACA' || inst.state === 'CONTATO') break;
    }

    assert.equal(inst.state === 'DORMENTE', false, `${def.id} nunca subiu`);
    assert.ok(
      avisouAsTresCamadas(inst),
      `${def.id} chegou em ${inst.state} com avisos [${inst.avisos.join(',')}]`,
    );
  }
});

test('regra 3: o contrato de escrita de §5 vale para todas as linhas', () => {
  assert.doesNotThrow(assertContratoDeTelegraph);
  for (const a of ANOMALIES) {
    assert.deepEqual(violacoesDoContrato(a), [], a.id);
  }
});

test('regra 3: o contrato pega quem fura', () => {
  const falsa = {
    ...anomaly('A01_ESCUTA'),
    id: 'FAKE',
    telegraphs: {
      ambient: ['Uma criatura horrível espreita no corredor comprido e escuro sem parar nunca mais'],
      audio: ['ok'],
      direct: ['ok'],
    },
  };
  const erros = violacoesDoContrato(falsa);
  assert.ok(erros.some((e) => e.includes('adjetivo emocional')), erros.join('|'));
  assert.ok(erros.some((e) => e.includes('nomeia a coisa')), erros.join('|'));
  assert.ok(erros.some((e) => e.includes('palavras')), erros.join('|'));
});

test('regra 4: a tela de encontro tem 3 a 5 opções e resolve numa escolha', () => {
  const s = createSanityState({ sanity: 100, daySeed: 5 });
  refresh(s);
  for (const def of ANOMALIES) {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = rngDoEncontro(seed, `${def.id}:${seed}`);
      const tela = buildEncounter(def, inventarioBasico(), s, rng, {
        hasLockableRoom: seed % 2 === 0, sozinho: true, chuva: false,
      });
      assert.ok(tela.options.length >= 3, `${def.id}: ${tela.options.length} opções`);
      assert.ok(tela.options.length <= 5, `${def.id}: ${tela.options.length} opções`);
      assert.ok(tela.text.length > 0);
      const ids = new Set(tela.options.map((o) => o.id));
      assert.equal(ids.size, tela.options.length, `${def.id}: opção repetida`);
    }
  }
});

test('regra 5: toda anomalia tem fraqueza de comportamento, e ela funciona', () => {
  for (const def of ANOMALIES) {
    if (def.id === 'A11_FOME') continue;   // §2 declara a exceção
    assert.ok(def.blindTo.length > 0, `${def.id} sem fraqueza`);

    // não fazer nenhum dos estímulos que ela percebe = não ser percebido
    const trace = traceVazio();
    assert.equal(computeDetection(def, trace, 1, SECO), 0, def.id);
  }
});

test('regra 5: a fraqueza nunca é explicada — não existe campo de tutorial', () => {
  for (const a of ANOMALIES) {
    const campos = Object.keys(a);
    for (const proibido of ['tutorial', 'weakness', 'fraqueza', 'dica', 'howTo']) {
      assert.ok(!campos.includes(proibido), `${a.id} explica a fraqueza em ${proibido}`);
    }
    // publicHint é como o jogador APRENDE A CHAMAR, não como ele vence
    assert.ok(!a.publicHint.includes(a.blindTo[0] ?? '__'), a.id);
  }
});

test('regra 6: o mesmo daySeed + encounterId reproduz o encontro', () => {
  const roda = () => {
    const s = createSanityState({ sanity: 40, daySeed: 909 });
    refresh(s);
    const saida: string[] = [];
    for (const def of ANOMALIES) {
      const rng = rngDoEncontro(909, `${def.id}:3`);
      const tela = buildEncounter(def, inventarioBasico(), s, rng, {
        hasLockableRoom: true, sozinho: true, chuva: false,
      });
      saida.push(`${def.id}|${tela.text}|${tela.options.map((o) => o.id).join(',')}`);
    }
    return saida.join(';');
  };
  assert.equal(roda(), roda());
});

test('regra 6: sementes diferentes divergem', () => {
  const roda = (seed: number) => {
    const rng = rngDoEncontro(seed, 'A03_FARO:1');
    const s = createSanityState({ sanity: 40, daySeed: seed });
    refresh(s);
    const tela = buildEncounter(anomaly('A03_FARO'), inventarioBasico(), s, rng, {
      hasLockableRoom: true, sozinho: true, chuva: false,
    });
    return `${tela.text}|${tela.options.map((o) => o.id).join(',')}`;
  };
  const amostras = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(roda));
  assert.ok(amostras.size > 1, 'sementes diferentes deram tudo igual');
});

test('regra 7: nenhuma frase que o jogador lê nasce em código', () => {
  // as opções, os textos de encontro e os telegraphs vêm todos do JSON
  for (const o of [...OPTIONS, ...PHANTOM_OPTIONS]) {
    assert.ok(o.label.length > 0 && o.texto.length > 0, o.id);
  }
  for (const a of ANOMALIES) {
    assert.ok(a.encounterText.length > 0, a.id);
  }
});

test('§3: a tabela de limiares cobre 0..100 sem buraco', () => {
  const esperado = (v: number) =>
    v >= 90 ? 'CACA' : v >= 70 ? 'RASTRO' : v >= 45 ? 'BUSCA' : v >= 20 ? 'ALERTA' : 'DORMENTE';
  for (let v = 0; v <= 100; v++) {
    assert.equal(stateFromScore(v), esperado(v), `score ${v}`);
  }
});

test('§8: a rolagem de contato cai sempre numa faixa, em 1..100', () => {
  for (const def of ANOMALIES) {
    for (let seed = 1; seed <= 200; seed++) {
      const out = resolveContact(def.contactTableId, rngDoEncontro(seed, `ct:${seed}`));
      assert.ok(out.rolagem >= 1 && out.rolagem <= 100);
      assert.ok(out.texto.length > 0, `${def.contactTableId} sem texto`);
      if (out.morreu) assert.ok(out.epilogo, 'MORTE sem epílogo');
    }
  }
});

test('§1: proximidade pesa — a mesma coisa de longe detecta menos', () => {
  const def = anomaly('A03_FARO');
  const trace = { ...traceVazio(), sangue: 80 };
  const perto = computeDetection(def, trace, 3, SECO);
  const longe = computeDetection(def, trace, 35, SECO);
  assert.ok(perto > longe, `perto ${perto} não é maior que longe ${longe}`);
  assert.equal(computeDetection(def, trace, 41, SECO), 0, 'fora de alcance devia dar zero');
});

test('§3: o ambiente muda o que ela consegue ler', () => {
  const def = anomaly('A03_FARO');
  const trace = { ...traceVazio(), sangue: 80, cheiro: 60 };
  const seco = computeDetection(def, trace, 10, SECO);
  const chuva = computeDetection(def, trace, 10, ENV_PRESETS.CHUVA ?? SECO);
  assert.ok(chuva < seco, `chuva ${chuva} devia abafar sangue e cheiro (seco ${seco})`);
});

test('§1: o decay é da anomalia — ela retém o rastro depois que ele acaba', () => {
  const def = anomaly('A03_FARO');       // SANGUE decay 0.92
  const inst = criarInstancia(def.id, 'L1', 'i1', 10);
  atualizarResidual(inst, def, { ...traceVazio(), sangue: 100 });
  assert.equal(inst.residual.sangue, 100);
  atualizarResidual(inst, def, traceVazio());
  assert.equal(inst.residual.sangue, 92, 'devia ter guardado 92% do rastro');
});

test('emitTelegraph devolve a camada certa e nada nos estados mudos', () => {
  const def = anomaly('A01_ESCUTA');
  const rng = rngDoTick(1, 'i1', 1);
  assert.ok(def.telegraphs.ambient.includes(emitTelegraph(def, 'ALERTA', rng) ?? ''));
  assert.ok(def.telegraphs.audio.includes(emitTelegraph(def, 'BUSCA', rng) ?? ''));
  assert.ok(def.telegraphs.direct.includes(emitTelegraph(def, 'RASTRO', rng) ?? ''));
  assert.equal(emitTelegraph(def, 'DORMENTE', rng), null);
  assert.equal(emitTelegraph(def, 'PERDEU', rng), null);
});

test('§6: as opções de falha total contra A03 e A05 realmente falham', () => {
  const arremessar = OPTIONS.find((o) => o.id === 'OPT_ARREMESSAR');
  assert.ok(arremessar);
  assert.equal(chanceDaOpcao(arremessar, anomaly('A03_FARO')), 0);
  assert.equal(chanceDaOpcao(arremessar, anomaly('A05_METALICA')), 0);
  assert.ok(chanceDaOpcao(arremessar, anomaly('A02_LATEJO')) > 0);
});
