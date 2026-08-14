/**
 * §14 inteira, executada. "Peso + volume + ruído: três limites que brigam
 * entre si" — os três, e a briga.
 *
 * A tabela de mochilas e a de módulos são fáceis de escrever e fáceis de
 * deixar mortas: um custo oculto que ninguém lê é uma linha de planilha.
 * Cada teste aqui pega um custo da tabela e mostra onde ele dói.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  sistemaDeCarga, capacidadeDeVolume, volumeUsado, slotsLivres, cabe,
  revistaHumana, penalidadeDeDuto, podeSacarNoEncontro, exposicaoVisual,
  ruidoCarregado, rasgou, derrubouAlgo, ofereceDescarte, pesoTotal,
  laminasNoVolume, VOLUME_APERTADO,
} from '../../core/anomaly/carry.ts';
import {
  buildEncounter, podeCortar, podeArremessar, podeLargarAMochila, temLamina,
  OPT_LARGAR_MOCHILA,
} from '../../core/anomaly/encounter.ts';
import { anomaly, blade, BACKPACKS, MODULES } from '../../core/anomaly/catalog.ts';
import { computeDetection, traceVazio, ENV_PRESETS } from '../../core/anomaly/perception.ts';
import { viraSucata } from '../../core/anomaly/blades.ts';
import { rngDoEncontro } from '../../core/anomaly/rng.ts';
import { createSanityState, refresh } from '../../core/sanity/state.ts';
import { inventarioBasico, inventarioSemNada } from './ajuda.ts';

const SECO = ENV_PRESETS.SECO ?? { modifiers: {} };
const CTX = { hasLockableRoom: false, sozinho: true, chuva: false };

// ---------- volume: o limite que não existia ----------

test('§14: a lâmina ocupa espaço, e a sucata de §13 também', () => {
  const semArma = { ...inventarioBasico(), blades: [] };
  const comArma = { ...semArma, blades: [blade('BL_FACAO')] };
  const comSucata = { ...semArma, blades: [viraSucata(blade('BL_FACAO'))] };

  assert.equal(volumeUsado(comArma), volumeUsado(semArma) + 1);
  assert.equal(volumeUsado(comSucata), volumeUsado(comArma),
    'o cabo quebrado continua ocupando o bolso');
});

test('§14: slots são teto de verdade — a mochila enche', () => {
  const inv = { ...inventarioBasico(), blades: [], slotsUsados: 9 };  // escolar: 10
  assert.equal(slotsLivres(inv), 1);
  assert.equal(cabe(inv), true);
  assert.equal(cabe(inv, 2), false);

  const cheia = { ...inv, slotsUsados: 10 };
  assert.equal(cabe(cheia), false);
  assert.ok(slotsLivres({ ...cheia, blades: [blade('BL_FACAO')] }) < 0,
    'entrar armado numa mochila cheia estoura o volume');
});

test('§14: o bolso lateral dá espaço; o forro de espuma cobra em espaço', () => {
  const base = { ...inventarioBasico(), blades: [] };
  assert.equal(
    capacidadeDeVolume({ ...base, modules: ['MOD_BOLSO_LATERAL'] }),
    capacidadeDeVolume(base) + 2,
  );
  assert.equal(
    capacidadeDeVolume({ ...base, modules: ['MOD_FORRO_ESPUMA'] }),
    capacidadeDeVolume(base) - 2,
  );
});

// ---------- coldre: espaço trocado por visibilidade ----------

test('§14: o coldre tira a lâmina do volume e a põe à mostra', () => {
  const semColdre = { ...inventarioBasico(), blades: [blade('BL_FACAO')], modules: [] };
  const comColdre = { ...semColdre, modules: ['MOD_COLDRE'] };

  assert.equal(laminasNoVolume(semColdre), 1);
  assert.equal(laminasNoVolume(comColdre), 0, 'a arma sai do slot');
  assert.equal(volumeUsado(comColdre), volumeUsado(semColdre) - 1);

  assert.equal(exposicaoVisual(semColdre), 0);
  assert.equal(exposicaoVisual(comColdre), 15, '+15 visual é o preço da tabela');
});

test('§14: a lâmina pendurada dá o que ler para quem lê luz', () => {
  const def = anomaly('A04_VITRE');  // cega para tudo menos luz
  const comColdre = {
    ...inventarioBasico(), blades: [blade('BL_FACAO')], modules: ['MOD_COLDRE'],
    lanternaAcesa: false,
  };
  const semColdre = { ...comColdre, modules: [] };

  const lido = (inv: typeof comColdre) =>
    computeDetection(def, { ...traceVazio(), luz: ruidoCarregado(inv).luz }, 8, SECO);

  assert.equal(lido(semColdre), 0, 'lanterna apagada e nada pendurado: ela não vê');
  assert.ok(lido(comColdre) > 0, 'com a arma por fora, apagar a lanterna deixa de bastar');
});

test('§14: coldre sem lâmina não expõe coisa nenhuma', () => {
  const vazio = { ...inventarioBasico(), blades: [], modules: ['MOD_COLDRE'] };
  assert.equal(exposicaoVisual(vazio), 0);
  assert.equal(ruidoCarregado(vazio).luz, 0);
});

// ---------- compartimento oculto ----------

test('§14: o compartimento oculto esconde 2 slots de revista humana', () => {
  const base = { ...inventarioBasico(), blades: [], slotsUsados: 6 };
  const oculto = { ...base, modules: ['MOD_COMPARTIMENTO_OCULTO'] };

  assert.deepEqual(revistaHumana(base), { visiveis: 6, ocultos: 0 });
  assert.deepEqual(revistaHumana(oculto), { visiveis: 4, ocultos: 2 });
  assert.equal(capacidadeDeVolume(oculto), capacidadeDeVolume(base) + 2);
});

test('§14: o que está no coldre a revista sempre acha', () => {
  const inv = {
    ...inventarioBasico(), slotsUsados: 2, blades: [blade('BL_FACAO')],
    modules: ['MOD_COMPARTIMENTO_OCULTO', 'MOD_COLDRE'],
  };
  const r = revistaHumana(inv);
  assert.equal(r.ocultos, 2);
  assert.equal(r.visiveis, 1, 'a arma no corpo não se esconde');
});

test('§14: o compartimento oculto custa 1 quick — e pode custar a tela toda', () => {
  const base = { ...inventarioBasico(), backpackId: 'BP_ESCOLAR', modules: [] };
  assert.equal(sistemaDeCarga(base).quickSlots, 1);

  const oculto = { ...base, modules: ['MOD_COMPARTIMENTO_OCULTO'] };
  assert.equal(sistemaDeCarga(oculto).quickSlots, 0);
  assert.equal(podeSacarNoEncontro(oculto), false,
    'escondeu tão bem que não alcança mais nada no encontro');
});

// ---------- quickSlots: a mochila decide o que aparece na tela ----------

test('§14: com zero quick slots a lâmina existe e não serve', () => {
  const sacola = {
    ...inventarioBasico(), backpackId: 'BP_SACOLA',
    blades: [blade('BL_FACAO')], throwables: 2,
  };
  assert.equal(temLamina(sacola), true, 'a faca está lá');
  assert.equal(podeCortar(sacola), false, 'no fundo da sacola, não a tempo');
  assert.equal(podeArremessar(sacola), false);
});

test('§14: quem não alcança a lâmina recebe empurrar — nunca fica sem saída', () => {
  const s = createSanityState({ sanity: 100 });
  refresh(s);
  const sacola = {
    ...inventarioBasico(), backpackId: 'BP_SACOLA', blades: [blade('BL_FACAO')],
  };

  const vistos = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    const tela = buildEncounter(anomaly('A02_LATEJO'), sacola, s,
      rngDoEncontro(seed, `${seed}`), CTX);
    assert.ok(tela.options.length >= 3 && tela.options.length <= 5, '§6: 3 a 5 opções');
    for (const o of tela.options) vistos.add(o.id);
  }
  assert.ok(vistos.has('OPT_EMPURRAR'));
  assert.ok(!vistos.has('OPT_CORTAR_PASSAGEM'));
});

test('§14: o cinto de carga devolve o acesso que a sacola não tem', () => {
  const sacola = { ...inventarioBasico(), backpackId: 'BP_SACOLA', modules: [] };
  assert.equal(podeSacarNoEncontro(sacola), false);
  assert.equal(podeSacarNoEncontro({ ...sacola, modules: ['MOD_CINTO_CARGA'] }), true);
});

// ---------- duto ----------

test('§14: volume alto não passa por duto', () => {
  const trilha = { ...inventarioBasico(), backpackId: 'BP_TRILHA', modules: [] };
  const escolar = { ...trilha, backpackId: 'BP_ESCOLAR' };
  assert.equal(penalidadeDeDuto(escolar), 0);
  assert.equal(penalidadeDeDuto(trilha), -10);
});

test('§14: e o cargueiro não passa melhor que a trilha', () => {
  // a tabela só escreve o custo na linha da trilha; tomado ao pé da letra, as
  // mochilas maiores passariam livres. A regra é volumétrica.
  for (const id of ['BP_TATICA', 'BP_CARGUEIRO', 'BP_COSTURADA']) {
    const inv = { ...inventarioBasico(), backpackId: id, modules: [] };
    assert.ok(capacidadeDeVolume(inv) >= VOLUME_APERTADO, id);
    assert.ok(penalidadeDeDuto(inv) <= -10, `${id} passou pelo duto folgado`);
  }
});

test('§14: o forro de espuma afina o vulto o bastante para caber no duto', () => {
  const trilha = { ...inventarioBasico(), backpackId: 'BP_TRILHA', modules: [] };
  const comEspuma = { ...trilha, modules: ['MOD_FORRO_ESPUMA'] };
  assert.equal(penalidadeDeDuto(comEspuma), 0, '14 - 2 slots já cabe');
  assert.ok(ruidoCarregado(comEspuma).som < ruidoCarregado(trilha).som,
    'e ainda é o módulo que cala a mochila');
});

// ---------- rasgo, descarte, sobrecarga ----------

test('§14: a sacola de pano rasga em 4% das saídas; a alça reforçada não', () => {
  const sacola = { ...inventarioSemNada(), backpackId: 'BP_SACOLA' };
  let rasgos = 0;
  for (let seed = 1; seed <= 2000; seed++) {
    if (rasgou(sacola, rngDoEncontro(seed, `s${seed}`))) rasgos++;
  }
  assert.ok(rasgos > 40 && rasgos < 120, `${rasgos} de 2000 — devia rondar 4%`);

  const reforcada = { ...sacola, modules: ['MOD_ALCA_REFORCADA'] };
  for (let seed = 1; seed <= 500; seed++) {
    assert.equal(rasgou(reforcada, rngDoEncontro(seed, `r${seed}`)), false);
  }
  assert.equal(rasgou({ ...sacola, backpackId: 'BP_ESCOLAR' }, rngDoEncontro(1, 'e')), false);
});

test('§14: acima do teto de peso, o dia começa a cair no chão', () => {
  const inv = { ...inventarioBasico(), blades: [], cargaKg: 20 };  // escolar: 12kg
  assert.ok(pesoTotal(inv) / 12 > 1);

  let caiu = 0;
  for (let seed = 1; seed <= 1000; seed++) {
    if (derrubouAlgo(inv, rngDoEncontro(seed, `d${seed}`))) caiu++;
  }
  assert.ok(caiu > 150 && caiu < 260, `${caiu} de 1000 — devia rondar 20%`);

  const leve = { ...inv, cargaKg: 5 };
  assert.equal(derrubouAlgo(leve, rngDoEncontro(1, 'l')), false, 'quem saiu leve não perde nada');
});

test('§14: largar a mochila só aparece com sobrecarga acima de 0.90', () => {
  const s = createSanityState({ sanity: 100 });
  refresh(s);
  const leve = { ...inventarioBasico(), blades: [], cargaKg: 6, backpackValue: 80 };
  const estufada = { ...leve, cargaKg: 11.5 };

  assert.equal(ofereceDescarte(leve), false);
  assert.equal(podeLargarAMochila(leve), false, 'com loot mas leve, não há o que largar ainda');
  assert.equal(podeLargarAMochila(estufada), true);
  assert.equal(podeLargarAMochila({ ...estufada, backpackValue: 0 }), false,
    'mochila vazia e estufada é contradição, mas se acontecer não vira opção');

  const ids = (inv: typeof leve) => {
    const vistos = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const t = buildEncounter(anomaly('A02_LATEJO'), inv, s, rngDoEncontro(seed, `${seed}`), CTX);
      for (const o of t.options) vistos.add(o.id);
    }
    return vistos;
  };
  assert.ok(!ids(leve).has('OPT_LARGAR_MOCHILA'));
  assert.ok(ids(estufada).has('OPT_LARGAR_MOCHILA'));
});

test('§14: largar a mochila devolve os +3 de velocidade que a seção promete', () => {
  assert.equal(OPT_LARGAR_MOCHILA().distanceDelta, 3);
  assert.equal(OPT_LARGAR_MOCHILA().perdeMochila, true);
});

// ---------- a tabela inteira, coerente ----------

test('§14: mais espaço custa mais ruído — e só a lendária escapa da linha', () => {
  // "Mais espaço = mais peso = mais ruído = mais lento na fuga." A tabela
  // cumpre isso em fila, de 6 slots a 24. A costurada à mão é a única que
  // quebra a fila: 20 slots com ruído zero. Ela paga em outra moeda — é
  // âncora, e perdê-la custa 30 de sanidade. Uma exceção é design; duas
  // seriam a seção se desmentindo.
  const porVolume = [...BACKPACKS].sort((a, b) => a.slots - b.slots);
  const foraDaLinha = porVolume.filter((b, i) => {
    const anterior = porVolume[i - 1];
    return anterior !== undefined && b.noiseFloor <= anterior.noiseFloor;
  });

  assert.equal(foraDaLinha.length, 1, foraDaLinha.map((b) => b.id).join(', '));
  assert.equal(foraDaLinha[0]?.ehAncora, true, 'quem sai da linha tem de pagar em outro lugar');
  assert.equal(foraDaLinha[0]?.sanityOnDestroy, 30);
});

test('§14: todo módulo da tabela muda algum número que alguém lê', () => {
  // uma sacola de pano com uma lâmina: o único inventário em que dá para
  // medir os seis módulos de uma vez — inclusive o rasgo e o coldre.
  const assinatura = (modules: string[]): string => {
    const inv = {
      ...inventarioBasico(), backpackId: 'BP_SACOLA',
      blades: [blade('BL_FACAO')], slotsUsados: 2, modules,
    };
    const s = sistemaDeCarga(inv);
    let rasgos = 0;
    for (let seed = 1; seed <= 300; seed++) {
      if (rasgou(inv, rngDoEncontro(seed, `t${seed}`))) rasgos++;
    }
    return [
      capacidadeDeVolume(inv), s.weightMax, s.quickSlots, s.noiseFloor, s.metalNoise,
      volumeUsado(inv), revistaHumana(inv).ocultos, exposicaoVisual(inv), rasgos,
    ].join('/');
  };

  const base = assinatura([]);
  for (const m of MODULES) {
    assert.notEqual(assinatura([m.id]), base, `${m.id} não muda nada`);
  }
});
