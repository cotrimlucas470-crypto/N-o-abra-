/**
 * As regras inegociáveis de §0 como teste executável.
 * Se alguma destas falha, o subsistema saiu da especificação.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSanityState, refresh, stageFor, STAGES } from '../../core/sanity/state.ts';
import { applyCatalogLoss, applyLoss, LOSSES } from '../../core/sanity/loss.ts';
import { ILLUSIONS, assertCatalogSano, talvezIlusao, ignorar } from '../../core/sanity/illusions.ts';
import { assertCatalogoVozesSano, VOICES } from '../../core/sanity/nightVoices.ts';
import { advancePeriod } from '../../core/sanity/engine.ts';
import { makeRng } from '../../core/sanity/rng.ts';

test('regra 1: sanidade nunca vai abaixo de zero nem mata', () => {
  const s = createSanityState({ sanity: 5 });
  s.stressBuffer = 0;
  applyLoss(s, 999, 'teste');
  assert.equal(s.sanity, 0);
  assert.ok(Number.isFinite(s.sanity));
});

test('regra 3: toda perda vira entrada de log com causa', () => {
  const s = createSanityState();
  s.stressBuffer = 0;
  applyCatalogLoss(s, 'ANOMALIA_CONTATO');
  assert.equal(s.log.length, 1);
  assert.equal(s.log[0]?.cause, 'Contato físico com anomalia');
  assert.equal(s.log[0]?.delta, -18);
});

test('regra 4: nenhuma ilusão e nenhuma voz sem tell', () => {
  assert.doesNotThrow(assertCatalogSano);
  assert.doesNotThrow(assertCatalogoVozesSano);
  assert.ok(ILLUSIONS.length > 0);
  assert.ok(VOICES.length > 0);
  for (const i of ILLUSIONS) assert.ok(i.tell.length >= 12, i.id);
});

test('regra 5: pity garante ilusão depois de uma seca longa', () => {
  const s = createSanityState({ sanity: 100, daySeed: 7 });   // LUCIDO: 2% por período
  refresh(s);
  s.illusionPity = 99;
  const r = talvezIlusao(s);
  assert.ok(r !== null, 'com pity estourado a ilusão tem de vir');
});

test('regra 5: sequelas têm teto e o softCap tem piso', () => {
  const s = createSanityState();
  s.sequelae = ['TREMOR', 'ECO', 'MUTISMO', 'NEGACAO', 'COMPULSAO', 'AGORAFOBIA'];
  s.realityDebt = 100;
  refresh(s, { infeccaoAtiva: true, ferimentoAberto: true, semAbrigo: true });
  assert.ok(s.softCap >= 35, `softCap ${s.softCap} caiu abaixo do piso`);
});

test('regra 6: o mesmo daySeed reproduz o mesmo dia', () => {
  const roda = () => {
    const s = createSanityState({ sanity: 30, daySeed: 12345 });
    refresh(s);
    const saida: string[] = [];
    for (let i = 0; i < 20; i++) {
      const r = advancePeriod(s, { exposicao: ['FORA_ABRIGO'], ehNoite: i % 2 === 0, mortos: ['Clara'] });
      saida.push(`${r.ilusao?.def.id ?? '-'}|${r.ilusao?.isReal ?? '-'}|${r.voz?.def.id ?? '-'}|${s.sanity}`);
    }
    return saida.join(';');
  };
  assert.equal(roda(), roda());
});

test('regra 6: sementes diferentes divergem', () => {
  const roda = (seed: number) => {
    const s = createSanityState({ sanity: 30, daySeed: seed });
    refresh(s);
    const saida: string[] = [];
    for (let i = 0; i < 20; i++) {
      const r = advancePeriod(s, { exposicao: ['FORA_ABRIGO'], ehNoite: true, mortos: ['Clara'] });
      saida.push(r.ilusao?.def.id ?? '-');
    }
    return saida.join(';');
  };
  assert.notEqual(roda(1), roda(2));
});

test('regra 6: canais não se correlacionam', () => {
  // mudar quantas vezes o canal de checagem foi puxado não pode mexer nas ilusões
  const a = makeRng(99, 'ilusao:1:1');
  const b = makeRng(99, 'ilusao:1:1');
  const c = makeRng(99, 'voz:1:1');
  assert.equal(a.next(), b.next());
  assert.notEqual(makeRng(99, 'ilusao:1:1').next(), c.next());
});

test('as seis faixas de §2 cobrem 0..100 sem buraco e sem sobreposição', () => {
  for (let v = 0; v <= 100; v++) {
    const st = stageFor(v);
    assert.ok(v >= st.min && v <= st.max, `sanidade ${v} caiu em ${st.id} (${st.min}..${st.max})`);
  }
  assert.equal(STAGES.length, 6);
});

test('uiLie é o complemento da confiabilidade declarada em §2', () => {
  for (const st of STAGES) {
    assert.ok(Math.abs((1 - st.uiReliability) - st.efeitos.uiLie) < 1e-9, st.id);
  }
});

test('o catálogo de perdas bate com os números do documento', () => {
  assert.equal(LOSSES.get('ANOMALIA_CONTATO')?.amount, 18);
  assert.equal(LOSSES.get('CADAVER_CRIANCA')?.amount, 15);
  assert.equal(LOSSES.get('CADAVER_CRIANCA')?.cadence, 'UNICO_RUN');
  assert.equal(LOSSES.get('MATOU_HUMANO')?.paranoia, 15);
  assert.equal(LOSSES.get('MATOU_HUMANO')?.realityDebt, 10);
  assert.equal(LOSSES.get('ALIVIO_TARDIO')?.delayPeriods, 1);
  assert.equal(LOSSES.get('INSONIA_48H')?.amount, 12);
});

test('ignorar ilusão acumula dívida de realidade', () => {
  const s = createSanityState({ sanity: 20, daySeed: 3 });
  refresh(s);
  s.illusionPity = 99;
  const il = talvezIlusao(s);
  assert.ok(il);
  const antes = s.realityDebt;
  ignorar(s);
  assert.ok(s.realityDebt > antes, 'ignorar tem de custar dívida');
});
