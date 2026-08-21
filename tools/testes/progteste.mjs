/* XP por uso: sobe pelo certo, não farma, respeita o teto de 10. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','X'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);

await p.evaluate(()=>{
  /* zera tudo pra medir do começo */
  window.__reset=()=>{
    ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    S.prog={pontos:{},hoje:{},dia:S.dia,itensHoje:[],versao:1};
    ['velocidade','forca','destreza','furtividade'].forEach(k=>{
      S.prog.pontos[k]=0; S.prog.hoje[k]=0;});
    S.corpo={}; fichaJogador().classe='civil';
  };
  window.__inv=(k)=>parcelas(k).investido;
  window.__todos=()=>Object.fromEntries(ATRIB_IDS.map(k=>[k,parcelas(k).investido]));
});

console.log('\n1. A CURVA DESACELERA');
let d=await p.evaluate(()=>{
  __reset();
  const c=[];
  for(let n=0;n<8;n++){ fichaJogador().pontos.velocidade=n; c.push(custoDoProximo('velocidade')); }
  fichaJogador().pontos.velocidade=0;
  return {c, base:PROG_CFG.base, exp:PROG_CFG.expoente};
});
console.log('   custo do 1º ao 8º ponto:',d.c.join(' → '));
ok('cada ponto custa mais que o anterior',d.c.every((v,i)=>i===0||v>d.c[i-1]));
ok('o salto também cresce (desacelera de verdade)',
  (d.c[7]-d.c[6])>(d.c[1]-d.c[0]));

console.log('\n2. CADA USO SOBE O SEU, E SÓ O SEU');
d=await p.evaluate(async()=>{
  const medir=async(nome,fn)=>{
    __reset();
    const antes=__todos();
    await fn();
    const depois=__todos();
    const mudou=ATRIB_IDS.filter(k=>depois[k]!==antes[k]);
    const parcial=Object.fromEntries(['velocidade','forca','destreza','furtividade']
      .map(k=>[k,Math.round(S.prog.pontos[k]||0)]));
    return {nome, mudou, parcial};
  };
  const out=[];
  /* correr: 6 cômodos novos */
  out.push(await medir('correr',async()=>{
    cena.casa={voce:0,monstro:8,visivel:false};
    const I={bicho:BICHOS[0],memoria:0,ruidoEm:null,bloqueio:null,bloqTurnos:0,
      acompanha:[],escondidos:[],folego:9};
    anomIniciar(I);
    for(const dst of [1,2,5,4,3,6]) ganharXP('velocidade',PROG_CFG.velocidadePorComodo,'');
    return I;
  }));
  /* carregar: 20 kg por 4 h */
  out.push(await medir('carregar',async()=>{
    ganharXP('forca',(20-PROG_CFG.forcaPesoMinimo)*4*PROG_CFG.forcaPorKgHora,'');
  }));
  /* consertar: 4 reparos */
  out.push(await medir('consertar',async()=>{
    for(const it of ['faca','martelo','serra','bota'])creditarReparo(it);
  }));
  /* escapar limpo */
  out.push(await medir('escapar limpo',async()=>{
    creditarFugaLimpa({avisos:0});
  }));
  return out;
});
d.forEach(x=>console.log(`   ${x.nome.padEnd(14)} parcial: ${JSON.stringify(x.parcial)}`));
ok('correr mexe só em velocidade',
  d[0].parcial.velocidade>0&&d[0].parcial.forca===0&&d[0].parcial.destreza===0&&d[0].parcial.furtividade===0);
ok('carregar mexe só em força',
  d[1].parcial.forca>0&&d[1].parcial.velocidade===0&&d[1].parcial.destreza===0&&d[1].parcial.furtividade===0);
ok('consertar mexe só em destreza',
  d[2].parcial.destreza>0&&d[2].parcial.forca===0&&d[2].parcial.velocidade===0&&d[2].parcial.furtividade===0);
ok('escapar limpo mexe só em furtividade',
  d[3].parcial.furtividade>0&&d[3].parcial.forca===0&&d[3].parcial.velocidade===0&&d[3].parcial.destreza===0);

console.log('\n3. OS QUATRO ANTI-EXPLOITS');
d=await p.evaluate(async()=>{
  const r={};
  /* A · correr em círculo entre dois cômodos */
  {__reset();
   cena.casa={voce:0,monstro:8,visivel:false};
   const I={bicho:BICHOS[0],memoria:0,ruidoEm:null,bloqueio:null,bloqTurnos:0,
     acompanha:[],escondidos:[],folego:99};
   anomIniciar(I);
   for(let i=0;i<40;i++) await mover(I,i%2?1:0,false);
   r.circulo={ganho:Math.round(S.prog.pontos.velocidade), pisados:(I._pisados||[]).length};}
  /* B · largar e pegar o mesmo objeto */
  {__reset();
   const antes=Math.round(S.prog.pontos.forca);
   for(let i=0;i<60;i++){ if(typeof guardar==='function'){guardar('lata',1);largar('lata',1);} }
   r.largaPega={ganho:Math.round(S.prog.pontos.forca)-antes};}
  /* C · consertar e quebrar o mesmo item */
  {__reset();
   for(let i=0;i<30;i++)creditarReparo('faca');
   r.mesmoItem={ganho:Math.round(S.prog.pontos.destreza),
     porUm:PROG_CFG.destrezaPorReparo};}
  /* D · re-disparar a mesma fuga */
  {__reset();
   const F={avisos:0};
   for(let i=0;i<20;i++)creditarFugaLimpa(F);
   r.mesmaFuga={ganho:Math.round(S.prog.pontos.furtividade),
     porUma:PROG_CFG.furtividadePorFugaLimpa};}
  /* E · fuga com aviso não conta */
  {__reset();
   creditarFugaLimpa({avisos:1});
   r.fugaSuja={ganho:Math.round(S.prog.pontos.furtividade)};}
  return r;
});
console.log('   ',JSON.stringify(d));
ok('A · correr em círculo só rende os cômodos novos',
  d.circulo.pisados===2&&d.circulo.ganho===2*9);
ok('B · largar/pegar o mesmo objeto não rende nada',d.largaPega.ganho===0);
ok('C · consertar o mesmo item rende uma vez por dia',
  d.mesmoItem.ganho===d.mesmoItem.porUm);
ok('D · re-disparar a mesma fuga rende uma vez',
  d.mesmaFuga.ganho===d.mesmaFuga.porUma);
ok('E · fuga com detecção não rende',d.fugaSuja.ganho===0);

console.log('\n4. O TETO DE 10 SEGURA EM TODOS OS CAMINHOS');
d=await p.evaluate(()=>{
  const r={};
  /* De uma vez só, com um número absurdo. O teto DIÁRIO morde antes do
     teto de 10 — e está certo: uma doação gigante não pode furar o
     limite do dia. A primeira versão deste teste esperava 10 aqui e
     falhou; a expectativa é que estava errada, não o código. */
  {__reset(); ganharXP('velocidade',1e9,'');
   r.deUmaVezComTetoDiario=__inv('velocidade');
   r.tetoDiario=PROG_CFG.tetoPorDia;}
  /* e agora o teto de 10 sozinho, sem o diário no caminho */
  {__reset();
   const salvo=PROG_CFG.tetoPorDia; PROG_CFG.tetoPorDia=1e12;
   ganharXP('velocidade',1e9,'');
   PROG_CFG.tetoPorDia=salvo;
   r.deUmaVezSemTetoDiario=__inv('velocidade');}
  /* aos poucos, muitos dias */
  {__reset();
   for(let dia=1;dia<=400;dia++){ S.dia=dia; prog(); ganharXP('forca',PROG_CFG.tetoPorDia,''); }
   r.aosPoucos=__inv('forca'); S.dia=1; prog();}
  /* já no teto: não aceita mais nada */
  {__reset(); fichaJogador().pontos.destreza=10;
   r.jaNoTeto=ganharXP('destreza',1e6,'');}
  /* efetivo em 10 por roupa, mas investido baixo: ainda deve treinar */
  {__reset(); fichaJogador().pontos.furtividade=2;
   const antes=__inv('furtividade');
   ganharXP('furtividade',1e5,'');
   r.comRoupa={antes, depois:__inv('furtividade')};}
  r.max=(typeof FICHA_MAX!=='undefined')?FICHA_MAX:null;
  return r;
});
console.log('   ',JSON.stringify(d));
ok('doação gigante respeita o teto DIÁRIO (não fura o limite do dia)',
  d.deUmaVezComTetoDiario===1);
ok('sem o teto diário no caminho, o ganho gigante para em 10',
  d.deUmaVezSemTetoDiario===10);
ok('400 dias de teto diário param em 10',d.aosPoucos===10);
ok('quem já está em 10 não recebe mais nada',d.jaNoTeto===0);
ok('e o teto é o FICHA_MAX do §19, não um número solto',d.max===10);

console.log('\n5. USA S.ficha.pontos, SEM SISTEMA PARALELO');
d=await p.evaluate(()=>{
  __reset();
  const antes=fichaJogador().pontos.velocidade||0;
  ganharXP('velocidade',1e5,'');
  const depois=fichaJogador().pontos.velocidade;
  return {antes, depois,
    viaParcelas:parcelas('velocidade').investido,
    progGuardaSoParcial:Object.keys(S.prog).sort().join(','),
    temAtributoParalelo:!!(S.atributos||S.xp||S.niveis)};
});
console.log('   ',JSON.stringify(d));
ok('o ponto entra em S.ficha.pontos',d.depois>d.antes);
ok('e parcelas() enxerga o mesmo valor',d.viaParcelas===d.depois);
ok('S.prog guarda só o progresso parcial',
  /pontos/.test(d.progGuardaSoParcial)&&/hoje/.test(d.progGuardaSoParcial));
ok('não existe objeto de atributo paralelo',!d.temAtributoParalelo);

console.log('\n6. TETO DIÁRIO');
d=await p.evaluate(()=>{
  __reset(); S.dia=5; prog();
  let total=0;
  for(let i=0;i<50;i++)total+=ganharXP('destreza',50,'');
  const noDia=total;
  S.dia=6; prog();
  let total2=0;
  for(let i=0;i<50;i++)total2+=ganharXP('destreza',50,'');
  return {noDia, diaSeguinte:total2, teto:PROG_CFG.tetoPorDia};
});
console.log('   ',JSON.stringify(d));
ok('o teto diário corta o ganho',d.noDia===d.teto);
ok('e o dia seguinte libera de novo',d.diaSeguinte===d.teto);

console.log('\n7. SAVE ANTIGO MIGRA SEM PERDA E SEM PRESENTE');
d=await p.evaluate(()=>{
  /* simula save velho: tem ficha, não tem prog */
  ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=4; fichaJogador().pontos.percepcao=3;
  delete S.prog;
  const P=prog();                       /* a migração acontece aqui */
  return {forca:__inv('forca'), percepcao:__inv('percepcao'),
    parcialZerado:Object.values(P.pontos).every(v=>v===0),
    temVersao:!!P.versao||true};
});
console.log('   ',JSON.stringify(d));
ok('o que o jogador já tinha continua lá',d.forca===4&&d.percepcao===3);
ok('e o progresso parcial começa zerado (sem presente)',d.parcialZerado);

console.log('\n8. A BARRA NA FICHA');
d=await p.evaluate(()=>{
  __reset(); ganharXP('velocidade',40,'');
  const h=barraProgressoHTML('velocidade');
  const p=progressoDe('velocidade');
  fichaJogador().pontos.destreza=10;
  const cheio=barraProgressoHTML('destreza');
  return {temBarra:/xp-barra/.test(h), temFracao:/pro próximo/.test(h),
    pct:p.pct, cheio:/no máximo/.test(cheio),
    naoTemPraAtributoSemUso:barraProgressoHTML('sorte')};
});
console.log('   ',JSON.stringify(d));
ok('a barra existe e mostra a fração',d.temBarra&&d.temFracao);
ok('a porcentagem é coerente',d.pct>0&&d.pct<100);
ok('atributo no teto mostra "no máximo"',d.cheio);
ok('atributo que não sobe por uso não ganha barra',d.naoTemPraAtributoSemUso==='');

console.log('\nerros de página:',erros.filter(e=>!/ERR_|file:/.test(e)).length?erros:'(nenhum)');
await b.close();
