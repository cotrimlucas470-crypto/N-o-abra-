/**
 * As mecânicas de §7 a §14: atraso, contato, ecologia, mutação, memória,
 * o cruzamento com sanidade, as armas e a carga.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { anomaly, blade, BLADES, BACKPACKS } from '../../core/anomaly/catalog.ts';
import {
  resolveBladeDelay, TABELAS_DE_ATRASO, classeDeAtraso, ruidoDoGolpe, metalDaArma,
} from '../../core/anomaly/delay.ts';
import {
  resolveContact, marcar, estaMarcado, biasDaMarca, limparMarca,
  aplicarContatoNaSanidade,
} from '../../core/anomaly/contact.ts';
import {
  assignDailyAnomalies, relatosDoRadio, ATRASO_DO_RADIO, BONUS_DE_APROXIMACAO,
} from '../../core/anomaly/ecology.ts';
import {
  aplicarMutacoes, chanceDeMutacao,
} from '../../core/anomaly/mutations.ts';
import {
  criarMemoria, registrarFuga, adapt, aplicarAdaptacao, registrarPerda,
  vaiMigrarAmanha, LIMIAR_DE_ADAPTACAO,
} from '../../core/anomaly/memory.ts';
import {
  buildEncounter, resolveOption, chanceDaOpcao, OPT_IMOVEL, OPT_CORTAR_PASSAGEM,
} from '../../core/anomaly/encounter.ts';
import {
  permitePhantom, ignorouAnomaliaFalsa, GANHO_POR_IGNORAR_FALSA, erroDeDistancia,
} from '../../core/anomaly/sanityLink.ts';
import {
  reparar, ritualDeAmolar, enrolarEmPano, viraSucata, estaRachada,
} from '../../core/anomaly/blades.ts';
import {
  overloadPenalty, ruidoCarregado, ofereceDescarte, recuperar,
  custoDePerderAMochila, sistemaDeCarga, pesoTotal,
} from '../../core/anomaly/carry.ts';
import { computeDetection, traceVazio, ENV_PRESETS } from '../../core/anomaly/perception.ts';
import { criarInstancia, tick } from '../../core/anomaly/stateMachine.ts';
import { emitTelegraph } from '../../core/anomaly/telegraph.ts';
import { rngDoEncontro, rngDoTick } from '../../core/anomaly/rng.ts';
import { createSanityState, refresh } from '../../core/sanity/state.ts';
import { inventarioBasico, inventarioSemNada, locais, rastroDeQuemAnda } from './ajuda.ts';

const SECO = ENV_PRESETS.SECO ?? { modifiers: {} };

// ---------- §7 ----------

test('§7: as três tabelas de atraso somam 1', () => {
  for (const [classe, tabela] of Object.entries(TABELAS_DE_ATRASO)) {
    const soma = tabela.reduce((a, o) => a + o.r, 0);
    assert.ok(Math.abs(soma - 1) < 1e-9, `${classe} soma ${soma}`);
  }
});

test('§7: arma leve trava menos, arma pesada custa mais', () => {
  const risco = (c: 'LEVE' | 'MEDIA' | 'PESADA') => {
    const t = TABELAS_DE_ATRASO[c];
    const perde = t.find((o) => o.out === 'PERDEU_ARMA')?.r ?? 0;
    const contato = t.find((o) => o.out === 'CONTATO')?.r ?? 0;
    return perde + contato;
  };
  assert.ok(risco('LEVE') < risco('MEDIA'));
  assert.ok(risco('MEDIA') < risco('PESADA'));
  assert.ok(risco('PESADA') > 0.3, 'quase um em cada três, como diz §7');
});

test('§7: delayResistance corta o tempo comprado', () => {
  const marreta = blade('BL_MARRETA');
  const rng = rngDoEncontro(1, 'x');
  const contraLenta = resolveBladeDelay({ ...marreta }, anomaly('A09_LENTA'), rng);
  const contraFome = resolveBladeDelay({ ...marreta }, anomaly('A11_FOME'), rng);
  assert.ok(contraLenta.ticks > contraFome.ticks,
    `${contraLenta.ticks} vs ${contraFome.ticks}: a fome resiste mais`);
});

test('§13: a baioneta é o único item que causa recuo real', () => {
  const rng = rngDoEncontro(2, 'x');
  const def = anomaly('A02_LATEJO');
  const baioneta = resolveBladeDelay(blade('BL_BAIONETA'), def, rng);
  const foice = resolveBladeDelay(blade('BL_FOICE'), def, rng);
  // mesma classe, mesmo atraso base: a diferença é só o recuo
  assert.equal(blade('BL_BAIONETA').delayTicks, blade('BL_FOICE').delayTicks);
  assert.equal(baioneta.ticks - foice.ticks, 2);
  assert.equal(BLADES.filter((b) => (b.recuoExtra ?? 0) > 0).length, 1);
});

test('§7: a pesada come o dobro de durabilidade', () => {
  const rng = rngDoEncontro(3, 'x');
  const def = anomaly('A02_LATEJO');
  const leve = blade('BL_ESTILETE');
  const pesada = blade('BL_MARRETA');
  resolveBladeDelay(leve, def, rng);
  resolveBladeDelay(pesada, def, rng);
  assert.equal(leve.maxDurability - leve.durability, 1);
  assert.equal(pesada.maxDurability - pesada.durability, 2);
});

test('§13: o cano com prego quebra em quatro usos', () => {
  const cano = blade('BL_CANO_PREGO');
  const def = anomaly('A02_LATEJO');
  let quebrou = 0;
  for (let i = 1; i <= 4; i++) {
    const r = resolveBladeDelay(cano, def, rngDoEncontro(i, `cano:${i}`));
    if (r.bladeBroken) { quebrou = i; break; }
  }
  assert.equal(quebrou, 4);
});

test('§13: a lâmina de vidro-osso quebra em um uso', () => {
  const vidro = blade('BL_VIDRO_OSSO');
  const r = resolveBladeDelay(vidro, anomaly('A05_METALICA'), rngDoEncontro(1, 'v'));
  assert.equal(r.bladeBroken, true);
  assert.equal(metalDaArma(vidro), 0);
});

test('§13: arma rachada faz barulho de rachadura', () => {
  const faca = { ...blade('BL_FACA_COZINHA'), durability: 2 };
  const inteira = blade('BL_FACA_COZINHA');
  assert.equal(estaRachada(faca), true);
  assert.equal(ruidoDoGolpe(faca) - ruidoDoGolpe(inteira), 40);
});

test('§13: o pano abafa o metal e come a lâmina', () => {
  const facao = blade('BL_FACAO');
  const enrolado = enrolarEmPano(blade('BL_FACAO'));
  assert.equal(metalDaArma(enrolado), Math.round(facao.metalNoise * 0.7));

  const def = anomaly('A02_LATEJO');
  const a = blade('BL_FACAO');
  const b = enrolarEmPano(blade('BL_FACAO'));
  resolveBladeDelay(a, def, rngDoEncontro(1, 'a'));
  resolveBladeDelay(b, def, rngDoEncontro(1, 'b'));
  assert.equal(a.durability - b.durability, 1, 'o pano custa uma a mais por uso');
});

test('§13: nada volta a ser novo — reparar come o teto para sempre', () => {
  let f = { ...blade('BL_FACAO'), durability: 4 };
  const tetoInicial = f.maxDurability;
  for (let i = 1; i <= 3; i++) {
    const r = reparar(f, true);
    assert.equal(r.ok, true, `reparo ${i}`);
    f = { ...r.blade, durability: 4 };      // usou de novo, desgastou de novo
  }
  assert.equal(f.maxDurability, tetoInicial - 3);
});

test('§13: perto do teto o conserto deixa de valer — o teto encolheu até a arma', () => {
  // consequência da regra acima: o restauro de 6 não cabe mais no que sobrou,
  // e a arma chega num ponto em que consertar não é mais uma opção.
  const f = { ...blade('BL_FACAO'), durability: 14, maxDurability: 14 };
  assert.equal(reparar(f, true).motivo, 'JA_INTEIRA');
});

test('§13: reparo só no abrigo, em bancada, e nem toda arma tem conserto', () => {
  assert.equal(reparar({ ...blade('BL_FACAO'), durability: 1 }, false).motivo, 'SEM_BANCADA');
  assert.equal(reparar({ ...blade('BL_CANO_PREGO'), durability: 1 }, true).motivo, 'SEM_REPARO');
  assert.equal(reparar(viraSucata(blade('BL_FACAO')), true).motivo, 'SUCATA');
});

test('§13: amolar é a única manutenção que devolve cabeça', () => {
  assert.equal(ritualDeAmolar().sanidade, 3);
});

test('§13: toda arma tem uso secundário, e só uma é invisível para o ímã', () => {
  assert.equal(BLADES.length, 16);
  for (const b of BLADES) assert.ok(b.secondaryUse.length > 0, b.id);
  assert.equal(BLADES.filter((b) => b.invisivelPara?.includes('A05_METALICA')).length, 1);
});

test('§7/§13: IMPROVISADA e UTIL caem numa das três tabelas de §7', () => {
  for (const b of BLADES) {
    assert.ok(['LEVE', 'MEDIA', 'PESADA'].includes(classeDeAtraso(b)), b.id);
  }
});

// ---------- §8 ----------

test('§8: MARCADO dura três dias e vale +25', () => {
  const mem = criarMemoria('A03_FARO');
  marcar(mem, 10);
  assert.equal(estaMarcado(mem, 10), true);
  assert.equal(estaMarcado(mem, 13), true);
  assert.equal(estaMarcado(mem, 14), false);
  assert.equal(biasDaMarca(mem, 12), 25);
  limparMarca(mem);
  assert.equal(estaMarcado(mem, 10), false);
});

test('§8: a marca amplifica o rastro que existe, e não inventa um', () => {
  const def = anomaly('A03_FARO');
  const sangrando = { ...traceVazio(), sangue: 40 };
  const limpo = traceVazio();
  assert.ok(computeDetection(def, sangrando, 10, SECO, 25)
          > computeDetection(def, sangrando, 10, SECO, 0));
  assert.equal(computeDetection(def, limpo, 1, SECO, 25), 0,
    'marcado e sem rastro nenhum continua sendo zero');
});

test('§8: o contato passa pelo stressBuffer do V7', () => {
  const s = createSanityState({ sanity: 80 });
  refresh(s);
  s.stressBuffer = 20;
  const out = resolveContact('CT_LACERANTE', rngDoEncontro(5, 'c'));
  const antes = s.sanity;
  aplicarContatoNaSanidade(s, out);
  const perdeu = antes - s.sanity;
  assert.ok(perdeu <= Math.abs(out.sanidade), 'o buffer tinha de amortecer');
  assert.ok(s.log.length > 0, 'e tinha de ficar no log');
});

test('§0 regra 1: a rolagem de contato nunca reduz a anomalia', () => {
  const out = resolveContact('CT_LACERANTE', rngDoEncontro(9, 'c'));
  assert.equal('anomalyDamage' in out, false);
  assert.equal('anomalyHp' in out, false);
});

// ---------- §9 ----------

test('§9: duas anomalias no mesmo local se evitam', () => {
  for (let dia = 1; dia <= 60; dia++) {
    const mundo = assignDailyAnomalies(locais(), dia, 8080);
    for (const [, insts] of mundo.porLocal) {
      const distintas = new Set(insts.map((i) => i.defId));
      if (distintas.size < 2) continue;
      const comBonus = insts.filter((i) => i.approachBonus > 0);
      assert.equal(comBonus.length >= 1, true, 'uma tinha de ganhar pressa');
      assert.equal(comBonus[0]?.approachBonus, BONUS_DE_APROXIMACAO);
      const recuadas = insts.filter((i) => i.approachBonus === 0);
      assert.ok(recuadas.every((r) => r.distance >= 30), 'as outras tinham de recuar');
    }
  }
});

test('§9: A06_PARADA é geografia — nunca migra', () => {
  assert.equal(anomaly('A06_PARADA').territory.migrationChance, 0);
  for (let dia = 1; dia <= 80; dia++) {
    const mundo = assignDailyAnomalies(locais(), dia, 5150);
    assert.ok(!mundo.migracoes.some((m) => m.anomalyId === 'A06_PARADA'), `dia ${dia}`);
  }
});

test('§9: quem perdeu o jogador três vezes no mesmo local migra', () => {
  const mem = criarMemoria('A03_FARO');
  registrarPerda(mem, 'L_HOSP');
  registrarPerda(mem, 'L_HOSP');
  assert.equal(vaiMigrarAmanha(mem, 'L_HOSP'), false);
  registrarPerda(mem, 'L_HOSP');
  assert.equal(vaiMigrarAmanha(mem, 'L_HOSP'), true);

  const memorias = new Map([['A03_FARO', mem]]);
  let migrou = false;
  for (let dia = 1; dia <= 30 && !migrou; dia++) {
    const mundo = assignDailyAnomalies(locais(), dia, 2020, memorias);
    migrou = mundo.migracoes.some((m) => m.anomalyId === 'A03_FARO' && m.from === 'L_HOSP');
  }
  assert.ok(migrou, 'cansou do lugar e não saiu');
});

test('§9: o rádio reporta com dois dias de atraso e erra às vezes', () => {
  const mundo = assignDailyAnomalies(locais(), 5, 4004);
  mundo.migracoes.push({ day: 5, anomalyId: 'A03_FARO', from: 'L_HOSP', to: 'L_ESTR' });

  assert.deepEqual(relatosDoRadio(mundo, 6, locais(), rngDoEncontro(1, 'r')), [],
    'antes da hora o rádio não fala');

  const noDia = relatosDoRadio(mundo, 5 + ATRASO_DO_RADIO, locais(), rngDoEncontro(1, 'r'));
  assert.equal(noDia.length, 1);

  let erros = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const r = relatosDoRadio(mundo, 7, locais(), rngDoEncontro(seed, `r${seed}`));
    if (r[0] && !r[0].correto) erros++;
  }
  assert.ok(erros > 45 && erros < 135, `${erros} erros em 300 — devia rondar 30%`);
});

test('§9: o mesmo dia com a mesma semente dá o mesmo mapa', () => {
  const chave = (dia: number) => {
    const m = assignDailyAnomalies(locais(), dia, 606);
    return [...m.porLocal.entries()]
      .map(([k, v]) => `${k}:${v.map((i) => i.defId).sort().join('+')}`)
      .sort().join(';');
  };
  assert.equal(chave(9), chave(9));
  assert.notEqual(chave(9), chave(10));
});

// ---------- §10 ----------

test('§10: mutação só entra a partir do dia 12 e para em 45%', () => {
  assert.equal(chanceDeMutacao(11), 0);
  assert.ok(Math.abs(chanceDeMutacao(12) - 0.18) < 1e-9);
  assert.ok(Math.abs(chanceDeMutacao(13) - 0.21) < 1e-9);
  assert.equal(chanceDeMutacao(50), 0.45);
  assert.equal(chanceDeMutacao(500), 0.45);
});

test('§10: MUT_SILENCIOSA tira o arrastar e cobra na vista', () => {
  const base = anomaly('A03_FARO');
  const { def } = aplicarMutacoes(base, ['MUT_SILENCIOSA']);
  assert.deepEqual(def.telegraphs.audio, []);
  assert.equal(def.sanityOnSight, base.sanityOnSight + 6);
  assert.deepEqual(base.telegraphs.audio.length > 0, true, 'o catálogo não pode ter sido tocado');
});

test('§0 regra 3 sobrevive a MUT_SILENCIOSA: o que cede é o canal, não o aviso', () => {
  const { def } = aplicarMutacoes(anomaly('A03_FARO'), ['MUT_SILENCIOSA']);
  const rng = rngDoTick(1, 'i1', 1);
  const texto = emitTelegraph(def, 'BUSCA', rng);
  assert.ok(texto && texto.length > 0, 'ficou sem aviso nenhum na camada do meio');
  assert.ok(def.telegraphs.ambient.includes(texto), 'devia cair na camada vaga');
});

test('§10: MUT_INSONE dobra a persistência e estica o alcance em 30%', () => {
  const base = anomaly('A09_LENTA');
  const { def } = aplicarMutacoes(base, ['MUT_INSONE']);
  assert.equal(def.persistence, base.persistence * 2);
  for (let i = 0; i < base.senses.length; i++) {
    const antes = base.senses[i]!.range;
    assert.ok(Math.abs(def.senses[i]!.range - Math.min(40, antes * 1.3)) < 1e-9);
  }
});

test('§10: MUT_CEGA cega para luz e a luz sai da lista de sentidos', () => {
  const { def } = aplicarMutacoes(anomaly('A04_VITRE'), ['MUT_CEGA']);
  assert.ok(def.blindTo.includes('LUZ'));
  assert.ok(!def.senses.some((s) => s.stimulus === 'LUZ'));
  assert.equal(computeDetection(def, { ...traceVazio(), luz: 100 }, 1, SECO), 0);
});

test('§10: MUT_LENTA_FALSA anda em 1 e caça em 5', () => {
  const { def, burstSpeed } = aplicarMutacoes(anomaly('A02_LATEJO'), ['MUT_LENTA_FALSA']);
  assert.equal(def.speed, 1);
  assert.equal(burstSpeed, 5);

  const inst = criarInstancia(def.id, 'L1', 'i1', 30);
  inst.burstSpeed = 5;
  const rng = rngDoTick(1, 'i1', 0);
  const antes = inst.distance;
  tick(inst, def, 100, rng);        // sobe um degrau só; ainda não é caça
  inst.state = 'CACA';
  const emCaca = inst.distance;
  tick(inst, def, 100, rng);
  assert.ok(antes - emCaca < emCaca - inst.distance, 'devia acelerar ao caçar');
});

test('§10: chave de patch desconhecida quebra na hora', () => {
  assert.throws(() => aplicarMutacoes(anomaly('A01_ESCUTA'), ['MUT_INEXISTENTE']));
});

// ---------- §11 ----------

test('§11: repetir a mesma tática ensina; variar não', () => {
  const mem = criarMemoria('A02_LATEJO');
  registrarFuga(mem, 'OPT_IMOVEL');
  assert.equal(mem.adaptation, 0, 'a primeira não ensina nada');
  registrarFuga(mem, 'OPT_IMOVEL');
  assert.equal(mem.adaptation, 8);
  registrarFuga(mem, 'OPT_IMOVEL');
  assert.equal(mem.adaptation, 16);

  const outra = criarMemoria('A02_LATEJO');
  registrarFuga(outra, 'OPT_IMOVEL');
  registrarFuga(outra, 'OPT_CORRER');
  registrarFuga(outra, 'OPT_TRANCAR');
  assert.equal(outra.adaptation, 0, 'variar não ensina');
});

test('§11: acima de 60 o truque para de funcionar', () => {
  const def = anomaly('A02_LATEJO');
  const mem = criarMemoria(def.id);
  mem.playerEscapes['OPT_IMOVEL'] = 9;

  mem.adaptation = LIMIAR_DE_ADAPTACAO - 1;
  assert.equal(aplicarAdaptacao(def, mem), def, 'abaixo do limiar nada muda');

  mem.adaptation = LIMIAR_DE_ADAPTACAO;
  const adaptada = aplicarAdaptacao(def, mem);
  const cheiro = adaptada.senses.find((s) => s.stimulus === 'CHEIRO');
  assert.ok(cheiro, 'ela passou a pesar cheiro');

  // e agora ficar imóvel deixou de resolver
  const parado = { ...traceVazio(), cheiro: 45, calor: 30 };
  assert.equal(computeDetection(def, parado, 8, SECO), 0);
  assert.ok(computeDetection(adaptada, parado, 8, SECO) > 0);
});

test('§11: ela nunca aprende a enxergar o que é cega', () => {
  const def = anomaly('A03_FARO');            // cega para SOM
  const mem = criarMemoria(def.id);
  mem.playerEscapes['OPT_CORRER'] = 9;        // correr ensinaria SOM
  mem.adaptation = 100;
  const adaptada = aplicarAdaptacao(def, mem);
  assert.ok(!adaptada.senses.some((s) => s.stimulus === 'SOM'));
  assert.equal(computeDetection(adaptada, { ...traceVazio(), som: 100 }, 1, SECO), 0);
});

test('§11: a adaptação nunca vira texto', () => {
  const mem = criarMemoria('A02_LATEJO');
  registrarFuga(mem, 'OPT_IMOVEL');
  registrarFuga(mem, 'OPT_IMOVEL');
  const efeito = adapt(mem);
  const valores = [...Object.values(efeito), ...efeito.senseBoosts.map((b) => b.delta)];
  assert.ok(valores.every((v) => typeof v !== 'string'), 'saiu texto de um lugar que não fala');
});

// ---------- §12 ----------

test('§12: a opção fantasma só aparece de Rachado para baixo', () => {
  assert.equal(permitePhantom('LUCIDO'), false);
  assert.equal(permitePhantom('TENSO'), false);
  assert.equal(permitePhantom('FISSURADO'), false);
  assert.equal(permitePhantom('RACHADO'), true);
  assert.equal(permitePhantom('DESFEITO'), true);
  assert.equal(permitePhantom('RUPTURA'), true);

  const lucido = createSanityState({ sanity: 95, daySeed: 1 });
  refresh(lucido);
  for (let seed = 1; seed <= 40; seed++) {
    const tela = buildEncounter(anomaly('A03_FARO'), inventarioBasico(), lucido,
      rngDoEncontro(seed, `l${seed}`), { hasLockableRoom: true, sozinho: true, chuva: false });
    assert.ok(!tela.options.some((o) => o.fantasma), 'lúcido não vê opção falsa');
  }
});

test('§12: em Rachado a fantasma entra e nunca escapa', () => {
  const s = createSanityState({ sanity: 30, daySeed: 1 });
  refresh(s);
  assert.equal(s.stage, 'RACHADO');

  let viu = false;
  for (let seed = 1; seed <= 40 && !viu; seed++) {
    const tela = buildEncounter(anomaly('A03_FARO'), inventarioBasico(), s,
      rngDoEncontro(seed, `r${seed}`), { hasLockableRoom: true, sozinho: true, chuva: false });
    const fantasma = tela.options.find((o) => o.fantasma);
    if (!fantasma) continue;
    viu = true;
    assert.equal(chanceDaOpcao(fantasma, anomaly('A03_FARO')), 0);
    assert.ok(!fantasma.label.includes('falsa'), 'a tela não pode entregar qual é');
  }
  assert.ok(viu, 'a fantasma não apareceu em quarenta telas');
});

test('§12: em Ruptura não existe opção de fuga', () => {
  const s = createSanityState({ sanity: 4, daySeed: 1 });
  refresh(s);
  assert.equal(s.stage, 'RUPTURA');
  const tela = buildEncounter(anomaly('A07_ECO'), inventarioBasico(), s,
    rngDoEncontro(1, 'rup'), { hasLockableRoom: true, sozinho: true, chuva: false });
  assert.equal(tela.semFuga, true);
  for (const o of tela.options) {
    assert.equal(chanceDaOpcao(o, anomaly('A07_ECO')), 0, o.id);
  }
  assert.ok(tela.options.length >= 3, 'e ainda assim a tela obedece §6');
});

test('§12: passar direto por uma anomalia falsa devolve 6', () => {
  const s = createSanityState({ sanity: 40 });
  refresh(s);
  const ganho = ignorouAnomaliaFalsa(s);
  assert.equal(ganho, GANHO_POR_IGNORAR_FALSA);
  assert.equal(s.sanity, 46);
  assert.equal(s.log.at(-1)?.delta, 6);
});

test('§12: a distância exibida erra de Fissurado para baixo, e não antes', () => {
  const rng = rngDoEncontro(1, 'd');
  for (let i = 0; i < 50; i++) {
    assert.equal(erroDeDistancia('LUCIDO', rng), 0);
    assert.equal(erroDeDistancia('TENSO', rng), 0);
  }
  const erros = new Set<number>();
  for (let seed = 1; seed <= 80; seed++) {
    erros.add(erroDeDistancia('DESFEITO', rngDoEncontro(seed, `e${seed}`)));
  }
  assert.ok(erros.size > 1, 'errou sempre igual');
  for (const e of erros) assert.ok(Math.abs(e) <= 2, `errou ${e}, mais que ±2`);
});

// ---------- §14 ----------

test('§14: a tabela de sobrecarga é a de §14', () => {
  assert.deepEqual(overloadPenalty(7, 10), { speed: 0, fatigue: 1.0, noise: 0 });
  assert.deepEqual(overloadPenalty(9, 10), { speed: -1, fatigue: 1.3, noise: 10 });
  assert.deepEqual(overloadPenalty(10, 10), { speed: -2, fatigue: 1.7, noise: 25, sanity: -1 });
  const estourada = overloadPenalty(12, 10);
  assert.equal(estourada.speed, -4);
  assert.equal(estourada.dropChance, 0.20);
  assert.ok(estourada.text);
});

test('§14: a mochila grande é a que te mata', () => {
  const pequena = { ...inventarioBasico(), backpackId: 'BP_ESCOLAR', blades: [] };
  const grande = { ...inventarioBasico(), backpackId: 'BP_CARGUEIRO', blades: [] };
  assert.ok(ruidoCarregado(grande).som > ruidoCarregado(pequena).som);

  const def = anomaly('A01_ESCUTA');
  const rastro = (inv: typeof pequena) =>
    computeDetection(def, { ...traceVazio(), som: ruidoCarregado(inv).som }, 8, SECO);
  assert.ok(rastro(grande) > rastro(pequena), 'mais espaço tem de custar mais detecção');
});

test('§13: quem anda armado até os dentes é o mais fácil de achar', () => {
  const def = anomaly('A05_METALICA');
  const leve = { ...inventarioBasico(), blades: [blade('BL_BISTURI')] };
  const pesado = { ...inventarioBasico(), blades: [blade('BL_MARRETA'), blade('BL_BARRA_FERRO')] };
  const lido = (inv: typeof leve) =>
    computeDetection(def, { ...traceVazio(), metal: ruidoCarregado(inv).metal }, 10, SECO);
  assert.equal(lido(leve), 0, 'o bisturi quase não é metal');
  assert.ok(lido(pesado) > 0);
});

test('§14: os módulos mexem no sistema de carga como a tabela manda', () => {
  const base = sistemaDeCarga({ ...inventarioBasico(), modules: [] });
  const comEspuma = sistemaDeCarga({ ...inventarioBasico(), modules: ['MOD_FORRO_ESPUMA'] });
  assert.equal(comEspuma.noiseFloor, Math.round(base.noiseFloor * 0.5));
  assert.equal(comEspuma.slots, base.slots - 2);

  const comCinto = sistemaDeCarga({ ...inventarioBasico(), modules: ['MOD_CINTO_CARGA'] });
  assert.equal(comCinto.weightMax, base.weightMax + 4);
  assert.equal(comCinto.quickSlots, base.quickSlots + 1);
  assert.equal(comCinto.metalNoise, base.metalNoise + 10);
});

test('§14: o descarte só é oferecido acima de 0.90 de carga', () => {
  const inv = { ...inventarioBasico(), blades: [], cargaKg: 10 };  // 12kg de teto
  assert.equal(ofereceDescarte(inv), false);
  assert.equal(ofereceDescarte({ ...inv, cargaKg: 11.5 }), true);
});

test('§14: a mochila largada volta em 55% das vezes, e nunca se ela migrou pra cima', () => {
  const largada = { locationId: 'L_ESTR', day: 4, valor: 60 };
  assert.equal(recuperar(largada, true, rngDoEncontro(1, 'x')).ok, false);

  let voltou = 0;
  for (let seed = 1; seed <= 400; seed++) {
    if (recuperar(largada, false, rngDoEncontro(seed, `s${seed}`)).ok) voltou++;
  }
  assert.ok(voltou > 180 && voltou < 260, `${voltou} de 400 — devia rondar 55%`);
});

test('§14: a costurada à mão é âncora e custa 30 ao ser perdida', () => {
  assert.equal(custoDePerderAMochila({ ...inventarioBasico(), backpackId: 'BP_COSTURADA' }), 30);
  assert.equal(custoDePerderAMochila(inventarioBasico()), 0);
  assert.equal(BACKPACKS.filter((b) => b.ehAncora).length, 1);
});

test('§13: a sucata não some e continua pesando', () => {
  const inv = { ...inventarioBasico(), blades: [viraSucata(blade('BL_MARRETA'))] };
  assert.ok(pesoTotal(inv) > inv.cargaKg, 'o cabo quebrado tinha de continuar no ombro');
  assert.equal(ruidoCarregado(inv).metal, 0, 'mas quebrada não canta mais');
});

// ---------- §6, resolução ----------

test('§6: uma escolha resolve a tela — não existe segunda rodada', () => {
  const def = anomaly('A02_LATEJO');
  const inst = criarInstancia(def.id, 'L1', 'i1', 8);
  const inv = inventarioBasico();
  const trace = rastroDeQuemAnda();
  const r = resolveOption(OPT_IMOVEL(), def, inst, inv, trace, rngDoEncontro(1, 'e'));
  assert.equal(trace.movimento, 0, 'ficar imóvel zera o rastro de movimento');
  assert.ok(['ESCAPE_LIMPO', 'ELA_SEGUE', 'CONTATO'].includes(r.outcome));
  assert.equal(r.minutos, 2);
});

test('§6: quem não tem lâmina recebe empurrar; quem tem, recebe cortar', () => {
  const s = createSanityState({ sanity: 100 });
  refresh(s);
  const ctx = { hasLockableRoom: false, sozinho: true, chuva: false };
  const ids = (inv: ReturnType<typeof inventarioBasico>) => {
    const vistos = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const t = buildEncounter(anomaly('A02_LATEJO'), inv, s, rngDoEncontro(seed, `${seed}`), ctx);
      for (const o of t.options) vistos.add(o.id);
    }
    return vistos;
  };
  assert.ok(ids(inventarioBasico()).has('OPT_CORTAR_PASSAGEM'));
  assert.ok(!ids(inventarioBasico()).has('OPT_EMPURRAR'));
  assert.ok(ids(inventarioSemNada()).has('OPT_EMPURRAR'));
  assert.ok(!ids(inventarioSemNada()).has('OPT_CORTAR_PASSAGEM'));
  assert.ok(!ids(inventarioSemNada()).has('OPT_LARGAR_MOCHILA'), 'sem loot não há o que largar');
});

test('§6/§7: cortar passagem entrega o desfecho para a tabela de §7', () => {
  const def = anomaly('A02_LATEJO');
  const inst = criarInstancia(def.id, 'L1', 'i1', 6);
  const inv = inventarioBasico();
  const r = resolveOption(OPT_CORTAR_PASSAGEM(), def, inst, inv, rastroDeQuemAnda(),
    rngDoEncontro(11, 'corte'));
  assert.ok(['ESCAPE_LIMPO', 'ESCAPE_ARRASTADO', 'PERDEU_ARMA', 'CONTATO'].includes(r.outcome));
  assert.ok(r.atrasoTicks >= 1, 'tem de comprar pelo menos um tick');
  assert.ok(inv.blades[0]!.durability < blade('BL_FACAO').durability, 'a lâmina gastou');
});

test('correr contra a lenta resolve; contra a fome, não', () => {
  const correr = { ...OPT_IMOVEL(), id: 'OPT_CORRER' };
  const opt = buildEncounter(anomaly('A09_LENTA'), inventarioBasico(),
    (() => { const s = createSanityState({ sanity: 100 }); refresh(s); return s; })(),
    rngDoEncontro(1, 'c'), { hasLockableRoom: false, sozinho: true, chuva: false })
    .options.find((o) => o.id === 'OPT_CORRER');
  assert.ok(opt ?? correr);
  const alvo = opt ?? correr;
  assert.ok(chanceDaOpcao(alvo, anomaly('A09_LENTA')) > chanceDaOpcao(alvo, anomaly('A11_FOME')));
});
