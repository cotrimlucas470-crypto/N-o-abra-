import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSanityState, refresh, computeSoftCap } from '../../core/sanity/state.ts';
import { applyCatalogLoss, applyLoss, flushPending } from '../../core/sanity/loss.ts';
import { applyCatalogGain, sleep } from '../../core/sanity/gain.ts';
import { takeDose, isActive, inWithdrawal, illusionMultiplier, efficacy, tickWithdrawal } from '../../core/sanity/drugs.ts';
import { verificarRealidade, metodosQueEnxergam } from '../../core/sanity/realityCheck.ts';
import { talvezIlusao, chanceDeSerReal, pesoDoTom } from '../../core/sanity/illusions.ts';
import { advancePeriod, LIMIAR_RUPTURA, MAX_SEQUELAS } from '../../core/sanity/engine.ts';

test('stressBuffer absorve antes da sanidade, como no corpo de §3.1', () => {
  const s = createSanityState();          // buffer começa em 20
  applyLoss(s, 8, 'teste');
  assert.equal(s.sanity, 100, 'perda menor que o buffer não deve tocar a sanidade');
  assert.equal(s.stressBuffer, 12);
  assert.equal(s.log[0]?.absorbed, 8);

  applyLoss(s, 20, 'teste2');             // 12 absorvidos, 8 viram dano
  assert.equal(s.stressBuffer, 0);
  assert.equal(s.sanity, 92);
});

test('UNICO_RUN só entra uma vez', () => {
  const s = createSanityState();
  s.stressBuffer = 0;
  const a = applyCatalogLoss(s, 'CADAVER_CRIANCA');
  const b = applyCatalogLoss(s, 'CADAVER_CRIANCA');
  assert.equal(a.applied, true);
  assert.equal(b.applied, false);
  assert.equal(b.reason, 'JA_GASTA_NA_RUN');
});

test('alívio tardio cobra um período depois, não na hora', () => {
  const s = createSanityState();
  s.stressBuffer = 0;
  const r = applyCatalogLoss(s, 'ALIVIO_TARDIO');
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'ADIADA');
  assert.equal(s.sanity, 100, 'não pode cobrar no mesmo período');

  s.period += 1;
  const total = flushPending(s);
  assert.equal(total, 3);
  assert.equal(s.sanity, 97);
});

test('hipervigilância corta pela metade o susto à distância', () => {
  const semSequela = createSanityState(); semSequela.stressBuffer = 0;
  applyCatalogLoss(semSequela, 'ANOMALIA_DISTANCIA');

  const comSequela = createSanityState(); comSequela.stressBuffer = 0;
  comSequela.sequelae = ['HIPERVIGILANCIA'];
  applyCatalogLoss(comSequela, 'ANOMALIA_DISTANCIA');

  // medir pelo log: a sanidade final embutiria também a queda de softCap
  // que a própria sequela provoca, e isso não é o modificador de §3.2
  assert.equal(semSequela.log[0]?.delta, -4);
  assert.equal(comSequela.log[0]?.delta, -2);
});

test('sozinho multiplica por 1.5 a saída bloqueada', () => {
  const s = createSanityState(); s.stressBuffer = 0;
  applyCatalogLoss(s, 'ANOMALIA_BLOQUEIA', { sozinho: true });
  assert.equal(100 - s.sanity, 13.5);
});

test('o softCap segura a recuperação enquanto a causa continua', () => {
  const s = createSanityState({ sanity: 50 });
  s.sequelae = ['TREMOR', 'ECO'];
  refresh(s, { infeccaoAtiva: true });
  const cap = computeSoftCap(s, { infeccaoAtiva: true });
  assert.equal(cap, 100 - 20 - 15);
  for (let i = 0; i < 20; i++) applyCatalogGain(s, 'NOITE_INTEIRA', { infeccaoAtiva: true });
  assert.equal(s.sanity, cap, 'dormir não pode passar do teto condicional');
});

test('dormir devolve 2 de buffer por hora (§1)', () => {
  const s = createSanityState({ sanity: 60 });
  s.stressBuffer = 0;
  const r = sleep(s, 5, false);
  assert.equal(r.bufferGanho, 10);
});

test('tolerância corrói o alívio a cada dose', () => {
  const s = createSanityState({ sanity: 40 });
  const d1 = takeDose(s, 'ANSIOLITICO');
  const d2 = takeDose(s, 'ANSIOLITICO');
  assert.equal(d1.eficacia, 1);
  assert.ok(d2.eficacia < d1.eficacia, 'segunda dose tem de render menos');
});

test('dependência instala e a abstinência termina — regra 5', () => {
  const s = createSanityState({ sanity: 60 });
  let virou = false;
  for (let i = 0; i < 3; i++) virou = takeDose(s, 'ANSIOLITICO').ficouDependente || virou;
  assert.ok(virou, 'três doses instalam dependência');
  assert.ok(s.drugState.ANSIOLITICO.dependent);

  const fim = s.drugState.ANSIOLITICO.withdrawalUntilPeriod;
  s.period = fim - 1;
  assert.ok(inWithdrawal(s, 'ANSIOLITICO'), 'antes do fim, em abstinência');
  s.period = fim + 1;
  assert.equal(inWithdrawal(s, 'ANSIOLITICO'), false, 'a abstinência precisa acabar');
});

test('o ansiolítico esconde a ilusão sem consertar a mentira da UI', async () => {
  const s = createSanityState({ sanity: 30 });
  refresh(s);
  takeDose(s, 'ANSIOLITICO');
  s.period = s.drugState.ANSIOLITICO.onsetAtPeriod;
  assert.ok(isActive(s, 'ANSIOLITICO'));
  assert.ok(illusionMultiplier(s) < 1, 'chance de ilusão tem de cair');

  const { readout } = await import('../../core/sanity/engine.ts');
  const antes = readout(createSanityState({ sanity: 30 })).uiLie;
  assert.equal(readout(s).uiLie, antes, 'a UI continua mentindo o mesmo tanto');
});

test('a chance de ser real cai quando a cabeça piora', () => {
  const def = { canBeReal: true } as Parameters<typeof chanceDeSerReal>[1];
  const bom = createSanityState({ sanity: 90 });  refresh(bom);
  const ruim = createSanityState({ sanity: 5 });  refresh(ruim);
  assert.ok(chanceDeSerReal(bom, def) > chanceDeSerReal(ruim, def));
});

test('paranoia inverte o tom sem nunca zerar o outro lado (§1)', () => {
  const calmo = createSanityState(); calmo.paranoia = 0;
  const surtado = createSanityState(); surtado.paranoia = 100;
  assert.ok(pesoDoTom(calmo, 'MELANCOLICA') > pesoDoTom(calmo, 'HOSTIL'));
  assert.ok(pesoDoTom(surtado, 'HOSTIL') > pesoDoTom(surtado, 'MELANCOLICA'));
  assert.ok(pesoDoTom(surtado, 'MELANCOLICA') > 0, 'o outro tom nunca some');
});

test('método certo para o canal certo acha mais o tell', () => {
  assert.deepEqual(metodosQueEnxergam('CONTAGEM').sort(), ['CONTAR', 'PERGUNTAR']);
  const s = createSanityState({ sanity: 40, daySeed: 5 });
  refresh(s); s.illusionPity = 99;
  const il = talvezIlusao(s);
  assert.ok(il);
  const r = verificarRealidade(s, 'CONTAR');
  assert.ok(r.minutes > 0);
  assert.ok(r.debtRelief > 0, 'verificar sempre alivia alguma dívida');
});

test('a ruptura cobra, zera a dívida e não mata', () => {
  const s = createSanityState({ sanity: 40, daySeed: 11 });
  s.realityDebt = LIMIAR_RUPTURA + 10;
  refresh(s);
  const r = advancePeriod(s);
  assert.ok(r.ruptura, 'acima do limiar a dívida tem de cobrar');
  assert.equal(s.realityDebt, 0);
  assert.ok(s.sanity > 0, 'ruptura não mata — regra 1');
  assert.ok(s.sequelae.length <= MAX_SEQUELAS);
});

test('uma run inteira não trava nem produz número inválido', () => {
  const s = createSanityState({ sanity: 100, daySeed: 4242 });
  refresh(s);
  for (let d = 0; d < 30; d++) {
    for (let p = 0; p < 4; p++) {
      advancePeriod(s, {
        exposicao: ['FORA_ABRIGO', 'FOME_CRITICA'],
        horasAcordado: 6, ehNoite: p === 3, mortos: ['Clara'], moradores: ['Rui'],
      });
      assert.ok(s.sanity >= 0 && s.sanity <= 100, `sanidade ${s.sanity}`);
      assert.ok(s.realityDebt >= 0 && s.realityDebt <= 100);
      assert.ok(s.paranoia >= 0 && s.paranoia <= 100);
      assert.ok(s.stressBuffer >= 0 && s.stressBuffer <= 20);
      assert.ok(s.sequelae.length <= MAX_SEQUELAS);
    }
    tickWithdrawal(s);
    sleep(s, 7, true);
  }
  assert.ok(s.log.length > 0);
});
