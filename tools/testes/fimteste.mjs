/* §33 — o final: encaixe, os dois caminhos, e o pular. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8900/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','N'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);

console.log('\n1. A CENA ESTÁ INTEIRA E ENCAIXADA');
let d=await p.evaluate(()=>({...fimEstado(),
  temFalas:FIM_CENA.filter(l=>l.f!==undefined).map(l=>l.t),
  cartao:FIM_CENA.filter(l=>l.c).length,
  ultima:FIM_CENA[FIM_CENA.length-1].t.slice(-40),
  atalho:typeof S.debug.final==='function'}));
console.log('   ',JSON.stringify({linhas:d.linhas,falas:d.falas,cartao:d.cartao,
  duracaoTexto:d.duracaoTexto,encaixado:d.encaixado,atalho:d.atalho}));
ok('a cena tem as 37 linhas',d.linhas===37);
ok('as 8 falas de personagem estão lá',d.falas===8);
ok('o cartão de ato está lá',d.cartao===1);
ok('as 8 falas estão na ordem da história',
  JSON.stringify(d.temFalas)===JSON.stringify([
    'A comida tá acabando. Eu vou buscar suprimento.',
    'Eu também vou.','É perigoso. Eu vou sozinha.','Mas…','Mais nada.',
    'Eu volto. Eu sempre volto.','Eu voltei.','Hora de acordar.']));
ok('termina na frase de fechamento',/pensamento só\.$/.test(d.ultima));
ok('está encaixado no fim do Opala',d.encaixado);
ok('tem atalho de depuração',d.atalho);

console.log('\n2. CAMINHO EM TEXTO — QUANDO A PASTA NÃO ESTÁ DO LADO');
d=await p.evaluate(async()=>{
  FIM_CFG.pasta='pasta-que-nao-existe/';
  FIM_CFG.esperaMs=900;
  FIM_CFG.msPorLetra=2; FIM_CFG.msMinimo=30; FIM_CFG.pularApos=0.2;
  const t0=Date.now();
  const via=await finalNarrado();
  return {via, seg:+((Date.now()-t0)/1000).toFixed(1),
    limpou:!document.getElementById('cena-fim'),
    semBotao:!document.getElementById('fim-pular')};
});
console.log('   ',JSON.stringify(d));
ok('sem a pasta, cai pro texto em vez de tela em branco',d.via==='texto');
ok('a cena roda até o fim',d.seg>2);
ok('e limpa tudo depois',d.limpou&&d.semBotao);

console.log('\n3. O PULAR FUNCIONA');
d=await p.evaluate(async()=>{
  FIM_CFG.msPorLetra=200; FIM_CFG.msMinimo=4000; FIM_CFG.pularApos=0.1;
  const t0=Date.now();
  const pr=finalNarrado();
  await new Promise(r=>setTimeout(r,700));
  const tinha=!!document.getElementById('fim-pular');
  document.getElementById('fim-pular').click();
  await pr;
  return {tinha, seg:+((Date.now()-t0)/1000).toFixed(1),
    limpou:!document.getElementById('cena-fim')};
});
console.log('   ',JSON.stringify(d));
ok('o botão de pular aparece',d.tinha);
ok('e encerra na hora, sem esperar os 2 minutos',d.seg<8);
ok('e limpa a tela',d.limpou);

console.log('\n4. CAMINHO COMPLETO — COM A PASTA DO LADO');
d=await p.evaluate(async()=>{
  FIM_CFG.pasta='final/'; FIM_CFG.esperaMs=9000; FIM_CFG.pularApos=0.1;
  const pr=finalNarrado();
  await new Promise(r=>setTimeout(r,5000));
  const ifr=document.getElementById('fim-cena');
  const achou=!!ifr;
  const bt=document.getElementById('fim-pular');
  if(bt)bt.click();
  const via=await pr;
  return {achou, via};
});
console.log('   ',JSON.stringify(d));
ok('com a pasta, a cena filmada carrega',d.achou&&d.via==='cena');

console.log('\n5. NÃO RODA DUAS VEZES AO MESMO TEMPO');
d=await p.evaluate(async()=>{
  FIM_CFG.pasta='pasta-que-nao-existe/'; FIM_CFG.esperaMs=400;
  FIM_CFG.msPorLetra=200; FIM_CFG.msMinimo=4000; FIM_CFG.pularApos=0.1;
  const a=finalNarrado();
  await new Promise(r=>setTimeout(r,900));
  const b=await finalNarrado();          /* a segunda tem de sair na hora */
  const caixas=document.querySelectorAll('#cena-fim').length;
  document.getElementById('fim-pular').click();
  await a;
  return {segunda:b, caixas};
});
console.log('   ',JSON.stringify(d));
ok('a segunda chamada não abre outra cena por cima',d.segunda===undefined&&d.caixas===1);

console.log('\n6. NADA QUEBROU');
console.log('    erros de página:',erros.length?erros.slice(0,5):'nenhum');
ok('nenhum erro de página',erros.length===0);
await b.close();
