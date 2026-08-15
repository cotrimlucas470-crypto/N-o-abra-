import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES, stageOf, stageName, sanidadeEfetiva, applyLoss, corrupt, perceive,
  MEDS, takeMed, passarNoite, estadoInicial, NOITES_PARA_SEQUELA,
} from '../../core/v9/sanity.ts';
import { makeRng } from '../../core/sanity/rng.ts';

const rng = (canal = 'v9') => makeRng(4242, canal);

test('a tabela de estágios é a do documento', () => {
  assert.deepEqual(STAGES.map((r) => r[0]),
    ['LUCIDO', 'TENSO', 'FISSURADO', 'RACHADO', 'DESFEITO', 'RUPTURA']);
  assert.deepEqual(STAGES.map((r) => r[1]), [90, 70, 45, 20, 1, 0]);
  assert.deepEqual(STAGES.map((r) => r[2]), [0, 0.08, 0.22, 0.40, 0.65, 1.00]);
  assert.deepEqual(STAGES.map((r) => r[3]), [0, 0.02, 0.12, 0.28, 0.50, 0.90]);
});

test('a dívida e a abstinência descontam da sanidade antes do estágio', () => {
  const s = estadoInicial();
  s.sanity = 80;
  assert.equal(stageName(s), 'TENSO');
  s.realityDebt = 40;                       // 40 * 0.3 = 12
  assert.equal(sanidadeEfetiva(s), 68);
  assert.equal(stageName(s), 'FISSURADO');
  s.withdrawal = 60;                        // + 60 * 0.2 = 12
  assert.equal(sanidadeEfetiva(s), 56);
  assert.equal(stageName(s), 'FISSURADO');
});

test('o escudo absorve antes da verdade, mas a paranoia sobe pelo golpe inteiro', () => {
  const s = estadoInicial();
  s.stressBuffer = 10;
  applyLoss(s, 6, 'SUSTO');
  assert.equal(s.sanity, 100, 'o escudo comeu tudo');
  assert.equal(s.stressBuffer, 4);
  assert.equal(s.paranoia, 6 * 0.4, 'a paranoia não é absorvida');
});

test('o que passa do escudo morde a sanidade', () => {
  const s = estadoInicial();
  s.stressBuffer = 4;
  applyLoss(s, 10, 'SUSTO');
  assert.equal(s.stressBuffer, 0);
  assert.equal(s.sanity, 94);
});

test('só o contato com anomalia acumula dívida de realidade', () => {
  const a = estadoInicial(); a.stressBuffer = 0;
  applyLoss(a, 10, 'SUSTO');
  assert.equal(a.realityDebt, 0);
  const b = estadoInicial(); b.stressBuffer = 0;
  applyLoss(b, 10, 'ANOMALY_CONTACT');
  assert.equal(b.realityDebt, 6);
});

test('lúcido não mente: nada passa corrompido', () => {
  const s = estadoInicial();
  const r = rng();
  for (let i = 0; i < 200; i++) {
    assert.equal(perceive(12, s, r).tipo, 'VERDADE');
  }
});

test('sem alucinação declarada, só a interface mente', () => {
  // a ilusão precisa de quem a construa: som, sombra, voz. Sem esse
  // callback sobra a mentira de número, que o filtro faz sozinho.
  const s = estadoInicial();
  s.sanity = 15;                          // DESFEITO: uiLie .50, ilusao .65
  assert.equal(stageName(s), 'DESFEITO');
  const r = rng('so-ui');
  let mentiu = 0;
  for (let i = 0; i < 4000; i++) if (perceive(10, s, r).tipo !== 'VERDADE') mentiu++;
  const taxa = mentiu / 4000;
  assert.ok(taxa > 0.46 && taxa < 0.54, `esperava ~.50 de mentira de UI, deu ${taxa}`);
});

test('desfeito deixa passar pouca verdade quando há alucinação a construir', () => {
  const s = estadoInicial();
  s.sanity = 15; s.paranoia = 80;
  const r = rng('mentira');
  const alucinar = (t: number) => t * 2;
  let verdade = 0;
  for (let i = 0; i < 4000; i++) if (perceive(10, s, r, alucinar).tipo === 'VERDADE') verdade++;
  const taxa = verdade / 4000;
  // .50 de UI + .50 restantes * .65 de ilusao => ~.175 de verdade
  assert.ok(taxa > 0.14 && taxa < 0.21, `esperava ~.175 de verdade, deu ${taxa}`);
});

test('o número corrompido é plausível: o erro é proporcional ao valor', () => {
  const r = rng('drift');
  for (const v of [4, 40, 400]) {
    const vistos = new Set<number>();
    for (let i = 0; i < 60; i++) vistos.add(corrupt(v, 100, r) as number);
    for (const x of vistos) {
      assert.ok(Math.abs(x - v) <= Math.ceil(v * 0.3), `${x} longe demais de ${v}`);
    }
  }
});

test('paranoia zero não desloca nada', () => {
  const r = rng('sem-vies');
  for (let i = 0; i < 50; i++) assert.equal(corrupt(9, 0, r), 9);
});

test('cada dose vale menos que a anterior', () => {
  const s = estadoInicial();
  s.sanity = 0;
  const ganhos: number[] = [];
  for (let i = 0; i < 4; i++) {
    const antes = s.sanity;
    takeMed(s, 'CHA_RAIZ');
    ganhos.push(s.sanity - antes);
  }
  for (let i = 1; i < ganhos.length; i++) {
    assert.ok(ganhos[i]! < ganhos[i - 1]!, `dose ${i} não perdeu força: ${ganhos}`);
  }
});

test('o amarelo cura muito e cobra caro — e o corpo passa a somar dívida', () => {
  const s = estadoInicial();
  s.sanity = 10;
  assert.equal(takeMed(s, 'AMARELO'), 'ilusao_garantida');
  assert.equal(s.withdrawal, 35);
  assert.equal(s.realityDebt, 0, 'ainda não passou de 70');
  takeMed(s, 'AMARELO');
  assert.equal(s.withdrawal, 70);
  assert.equal(s.realityDebt, 0, '70 não é "acima de 70"');
  takeMed(s, 'AMARELO');
  assert.ok(s.withdrawal > 70);
  assert.equal(s.realityDebt, 10, 'agora o corpo cobra');
});

test('curar demais quebra: a barra cheia com o corpo destruído lê pior que a barra em 95', () => {
  // o desenho só morde quando a sanidade nao tem mais para onde subir:
  // a barra trava em 100 e a tolerancia continua cobrando.
  const s = estadoInicial();
  s.sanity = 95;
  assert.equal(stageName(s), 'LUCIDO');
  for (let i = 0; i < 6; i++) takeMed(s, 'AMARELO');
  assert.equal(s.sanity, 100, 'a barra está cheia');
  assert.equal(s.withdrawal, 100);
  assert.ok(s.realityDebt >= 30, `a dívida acumulou: ${s.realityDebt}`);
  assert.ok(sanidadeEfetiva(s) < 95, `mas a percepção piorou: ${sanidadeEfetiva(s)}`);
  assert.notEqual(stageName(s), 'LUCIDO');
});

test('o estimulante piora a cabeça enquanto dá energia', () => {
  const s = estadoInicial();
  s.sanity = 60;
  const antesPar = s.paranoia;
  assert.equal(takeMed(s, 'ESTIMULANTE'), 'paranoia_up');
  assert.ok(s.sanity < 60, 'ele não cura');
  assert.ok(s.paranoia > antesPar);
});

test('três noites abaixo de 20 travam uma sequela permanente', () => {
  const s = estadoInicial();
  s.sanity = 15;
  assert.equal(passarNoite(s), null);
  assert.equal(passarNoite(s), null);
  assert.equal(passarNoite(s), 'TREMOR');
  assert.deepEqual(s.scars, ['TREMOR']);
});

test('uma noite boa zera a contagem', () => {
  const s = estadoInicial();
  s.sanity = 15;
  passarNoite(s); passarNoite(s);
  s.sanity = 90;
  assert.equal(passarNoite(s), null);
  assert.equal(s.nightsLow, 0);
  s.sanity = 15;
  passarNoite(s); passarNoite(s);
  assert.equal(s.scars.length, 0, 'a contagem recomeçou do zero');
});

test('as sequelas se acumulam e nunca saem', () => {
  const s = estadoInicial();
  s.sanity = 5;
  const pegas: string[] = [];
  for (let i = 0; i < NOITES_PARA_SEQUELA * 4; i++) {
    const nova = passarNoite(s);
    if (nova) pegas.push(nova);
  }
  assert.deepEqual(pegas, ['TREMOR', 'SURDEZ_PARCIAL', 'CEGUEIRA_NOTURNA']);
  assert.equal(s.scars.length, 3);
});
