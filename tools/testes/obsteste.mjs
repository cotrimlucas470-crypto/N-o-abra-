/* §57 — o Observador.

   Ele inverte o verbo central do jogo. Todas as seis criaturas atuais
   recompensam olhar; nele, olhar MUDA ELE DE LUGAR e aumenta o interesse
   dele por você. Ignorar — a jogada que o jogo nunca premiou — é a única
   saída.

   Isso só é justo se o jogador puder rastreá-lo sem olhar e puder
   aprender a regra, então o harness cobra as duas coisas: os sinais dele
   em canal que não é olhar, e o aviso toda vez que uma olhada mexe nele.

   E cobra a integração com o §53, porque foi ali que eu quase entreguei
   fiação morta: a primeira versão lia `cena.anom`, um campo que eu
   inventei sem querer — as três referências eram minhas e o campo nunca
   existiu no jogo. Mesmo defeito que este código já teve duas vezes. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Obs'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=5; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);
await p.evaluate(()=>{
  window.__obs=()=>{
    S.saveId='obsteste'; S.dia=6; delete S.rngEstado; semearRNG();
    cena.casa={voce:0,monstro:8,monstro2:null,visivel:false};
    const bicho=BICHOS.find(x=>x.id==='observador');
    const I={bicho,memoria:0,ruidoEm:null,bloqueio:null,bloqTurnos:0,
      acompanha:[],escondidos:[],folego:9,escondido:false};
    anomIniciar(I);
    return I;
  };
});

console.log('\n1. ELE EXISTE COMO CRIATURA DE VERDADE');
{
  const d=await p.evaluate(()=>{
    const e=observadorEstado(__obs());
    const t=Sinais.daCriatura('observador');
    return {naTabela:e.naTabela, temRegra:e.temRegra, canais:e.canais,
      sinais:t.length, canaisSinal:[...new Set(t.map(x=>x.canal))],
      temIminencia:t.some(x=>x.fase==='iminencia'),
      dica:REGRA.observador.dica,
      /* o de iminência dele NÃO pode ser de canal "olhar": a regra dele
         é que olhar não serve, então rastreá-lo tem de dar por outro
         sentido, senão é armadilha sem saída */
      iminenciaCanal:t.filter(x=>x.fase==='iminencia').map(x=>x.canal)};
  });
  console.log('    na tabela de bichos: '+d.naTabela+' · tem REGRA: '+d.temRegra);
  console.log('    canais que ele percebe: '+JSON.stringify(d.canais));
  console.log('    sinais dele: '+d.sinais+' em '+d.canaisSinal.join(', ')
    +' · iminência em '+d.iminenciaCanal.join(', '));
  console.log('    a dica: "'+d.dica+'"');
  ok('ele é uma criatura da tabela',        d.naTabela&&d.temRegra);
  ok('sinaliza em pelo menos dois canais',  d.canaisSinal.length>=2);
  ok('e tem sinal de iminência',            d.temIminencia);
  ok('a iminência dele NÃO depende de olhar',
     d.iminenciaCanal.every(c=>c!=='visual'));
  ok('e ele é o primeiro a ler a memória entre noites', d.canais.lembra===true);
}

console.log('\n2. OLHAR MUDA ELE DE LUGAR — E O JOGO DIZ QUE FOI POR ISSO');
{
  const d=await p.evaluate(()=>{
    const I=__obs();
    limpar();
    const posicoes=[], saltos=[];
    for(let k=0;k<6;k++){
      const antes=cena.casa.monstro;
      obsOlhado(I,'teste');
      const dep=cena.casa.monstro;
      posicoes.push(antes+'→'+dep);
      saltos.push(typeof distancia==='function'?distancia(antes,dep):null);
    }
    const ditas=Array.from(T.querySelectorAll('p:not(.passado)')).map(e=>e.textContent);
    return {posicoes, saltos, avisos:ditas.filter(t=>/olha/i.test(t)).length,
      exemplo:ditas.find(t=>/olha/i.test(t))||'',
      minSalto:Math.min(...saltos.filter(x=>x!=null)),
      exigido:observadorEstado(I).cfg.saltoMinimo};
  });
  console.log('    ele saltou: '+d.posicoes.join(' · '));
  console.log('    distância dos saltos: '+d.saltos.join(', ')+' (mínimo exigido '+d.exigido+')');
  console.log('    "'+d.exemplo+'"');
  ok('toda olhada muda ele de lugar',  d.posicoes.every(x=>x.split('→')[0]!==x.split('→')[1]));
  ok('e ele salta longe, não pro lado', d.minSalto>=d.exigido);
  ok('e cada olhada é avisada',         d.avisos>=6);
}

console.log('\n3. OLHAR ALIMENTA, IGNORAR ESVAZIA');
{
  const d=await p.evaluate(()=>{
    const I=__obs();
    const inicio=observadorEstado(I).interesse;
    /* jogador que olha */
    const olhando=[];
    for(let k=0;k<4;k++){ obsOlhado(I,'t'); anomAvancar(I); olhando.push(observadorEstado(I).interesse); }
    /* jogador que ignora */
    const J=__obs();
    const ignorando=[];
    for(let k=0;k<12;k++){ anomAvancar(J); ignorando.push(observadorEstado(J).interesse); }
    return {inicio, olhando, ignorando,
      limiarCaca:observadorEstado(I).cfg.limiarCaca,
      faseOlhando:I.fase, faseIgnorando:J.fase,
      desistiu:observadorEstado(J).foiEmbora};
  });
  console.log('    interesse inicial: '+d.inicio);
  console.log('    quem olha:   '+d.olhando.join(' → ')+'   (vira caça em '+d.limiarCaca+')');
  console.log('    quem ignora: '+d.ignorando.join(' → '));
  console.log('    fase de quem olhou: '+d.faseOlhando+' · de quem ignorou: '+d.faseIgnorando
    +' · desistiu: '+d.desistiu);
  ok('olhar aumenta o interesse',   d.olhando[d.olhando.length-1]>d.inicio);
  ok('ignorar derruba o interesse', d.ignorando[d.ignorando.length-1]<d.inicio);
  ok('quem olha demais vira caça',  d.faseOlhando==='CACA');
  /* a asserção certa é o FATO (ele desistiu), não a fase do momento:
     depois de desistir ele passa por RECUANDO e volta a vagar sem
     ameaçar. Cobrar a fase transitória prendia o teste a um detalhe. */
  ok('e quem ignora faz ele desistir',  d.desistiu===true);
  ok('e ele para de caçar',             d.faseIgnorando!=='CACA');
}

console.log('\n4. QUANDO ELE CAÇA, ELE VAI EM VOCÊ — E NÃO ANTES');
{
  const d=await p.evaluate(()=>{
    const I=__obs();
    cena.casa.voce=3;
    I.ruidoEm=7;
    const calmo=REGRA.observador.alvo(I,cena.casa);
    /* LAÇO COM TETO. A primeira versão tinha `while` sem limite aqui e
       na seção 6, e quando eu plantei a regressão que tira o decaimento
       o harness TRAVOU em vez de reprovar. Teste que pendura não diz
       nada: pior que reprovar é não responder. */
    let g=0;
    while(observadorEstado(I).interesse<observadorEstado(I).cfg.limiarCaca&&g++<200)obsOlhado(I,'t');
    const bravo=REGRA.observador.alvo(I,cena.casa);
    return {calmo, bravo, voce:cena.casa.voce, ruido:I.ruidoEm,
      interesse:observadorEstado(I).interesse};
  });
  console.log('    com interesse baixo o alvo é '+d.calmo+' (você está em '+d.voce+')');
  console.log('    com interesse '+d.interesse+' o alvo é '+d.bravo);
  ok('interesse baixo: ele não vai em você', d.calmo!==d.voce);
  ok('interesse alto: ele vai',              d.bravo===d.voce);
}

console.log('\n5. ELE LEMBRA ONDE TE PERDEU (a memória da etapa 2, usada)');
{
  const d=await p.evaluate(()=>{
    S.ameaca={}; S.dia=6;
    const I=__obs();
    ameAnotar(I,{perdeuEm:7, noite:true});
    S.dia=7;                       /* noite seguinte */
    const J=__obs();
    /* a memoria diz PRA ONDE ele vai, e nao onde ele nasce: escrever
       na cena de dentro do inicializador quebrava a reprodutibilidade */
    return {comecou:J.obsPouso, lembrado:7,
      memoria:ameacaEstado().memoria.observador,
      leitura:!!ameLembra('observador')};
  });
  console.log('    memória: '+JSON.stringify(d.memoria));
  console.log('    na noite seguinte ele vai direto pra '+d.comecou+' (te perdeu em '+d.lembrado+')');
  ok('a memória dele é lida de verdade', d.leitura);
  ok('e ele vai pra onde te perdeu',     d.comecou===d.lembrado);
}

console.log('\n6. ELE É A PRESENÇA DENTRO DA CASA (§53) — a fiação que eu quase entreguei morta');
{
  const d=await p.evaluate(()=>{
    S.sanidade=100; S.lanterna=true; S.hora=12;
    /* a linha de base tem de ser LIMPA: as seções anteriores deixaram um
       encontro de pé, e a primeira versão desta seção mediu "sem ele"
       com ele ainda ativo. Começar outra criatura é o que o jogo faz. */
    (function(){ const J={bicho:BICHOS.find(x=>x.id==='magro'),trilha:[]};
      cena.casa={voce:0,monstro:8}; anomIniciar(J); })();
    try{ const C=cerco(); C.ativo=false; C.dentro=[]; }catch(e){}
    try{ costEstado().desfeitos.length=0; }catch(e){}
    const semEle=vigiaLer(3);
    const I=__obs();
    const comEle=vigiaLer(3);
    /* e some quando ele desiste */
    let g2=0;
    while(I.fase!=='RECUANDO'&&observadorEstado(I).interesse>0&&g2++<300)anomAvancar(I);
    const depoisDeIrEmbora=vigiaLer(3);
    return {semEle:semEle.fonte, comEle:comEle.fonte, forca:comEle.forca,
      quem:comEle.quem||null, depois:depoisDeIrEmbora.fonte};
  });
  console.log('    sem ele na casa: '+d.semEle+' · com ele: '+d.comEle
    +' (força '+d.forca+', fonte "'+d.quem+'")');
  console.log('    depois que ele desiste: '+d.depois);
  ok('sem ele, nada de presença',        d.semEle===null);
  ok('com ele, a presença é DENTRO',     d.comEle==='DENTRO');
  ok('e ela é atribuída a ele',          d.quem==='observador');
  ok('e some quando ele vai embora',     d.depois!=='DENTRO');
}

console.log('\n7. 2000 TURNOS SEM TRAVAR');
{
  const d=await p.evaluate(()=>{
    const I=__obs();
    const conta={}; let travou=null, seguidos=0, ultima=I.fase;
    for(let t=0;t<2000;t++){
      if(t%11===0)obsOlhado(I,'t');
      if(t%5===0){ cena.casa.voce=(t*7+3)%9; anomPisou(I,cena.casa.voce); }
      if(t%7===0)anomOuviu(I,(t*5+1)%9,1);
      anomAvancar(I);
      cena.casa.monstro=moverMonstro(cena.casa.monstro,I);
      conta[I.fase]=(conta[I.fase]||0)+1;
      if(I.fase===ultima)seguidos++; else {seguidos=0;ultima=I.fase;}
      if(seguidos>250)travou='preso em '+I.fase;
      if(!isFinite(cena.casa.monstro)||cena.casa.monstro==null)travou='saiu da planta';
    }
    return {conta, travou, interesse:observadorEstado(I).interesse};
  });
  console.log('    turnos por fase: '+JSON.stringify(d.conta));
  ok('não trava',                d.travou===null);
  ok('e o interesse fica na faixa', d.interesse>=0&&d.interesse<=100);
}

console.log('\n8. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
