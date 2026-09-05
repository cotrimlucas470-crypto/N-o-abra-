/* §47 — som mais perto da realidade. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Som'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. O CONTEXTO DE ÁUDIO CONTINUA UM SÓ');
{
  const d=await p.evaluate(()=>({ativo:!!A.ctx, estado:A.ctx?A.ctx.state:null,
    barramentos:Object.keys(A.mix.gan||{}), reverb:!!A.conv,
    umContextoSo:(function(){let n=0;for(const k in window)
      {try{if(window[k] instanceof (window.AudioContext||function(){}))n++;}catch(e){}}return n;})()}));
  console.log('    '+JSON.stringify(d));
  ok('o AudioContext existe e roda',        d.ativo&&d.estado==='running');
  ok('os 5 barramentos continuam de pé',    d.barramentos.length===5);
  ok('o reverb continua lá',                d.reverb);
}

console.log('\n2. DISTÂNCIA: O AR COME O AGUDO');
{
  const d=await p.evaluate(()=>som47Estado());
  d.corte.forEach(c=>console.log('    '+c.comodos+' cômodo(s) → corte em '+c.hz+' Hz'));
  ok('perto é transparente',                d.corte[0].hz>=15000);
  ok('e a curva cai a cada cômodo',         d.corte.every((c,i)=>i===0||c.hz<d.corte[i-1].hz));
  ok('longe fica realmente abafado',        d.corte[3].hz<2000);
}
{
  const d=await p.evaluate(()=>{
    /* conta os nós criados: com distância entra um filtro a mais */
    let criados=0;
    const orig=A.ctx.createBiquadFilter.bind(A.ctx);
    A.ctx.createBiquadFilter=function(){criados++;return orig();};
    const g1=A.ctx.createGain(); saida(g1,{pan:0,rev:.4});
    const semDist=criados; criados=0;
    const g2=A.ctx.createGain(); saida(g2,{pan:0,rev:.4,dist:2});
    const comDist=criados;
    A.ctx.createBiquadFilter=orig;
    return {semDist,comDist};
  });
  console.log('    filtros criados: sem distância '+d.semDist+' · com distância '+d.comDist);
  ok('sem dist, o caminho é o de antes (nada a mais)', d.semDist===0);
  ok('com dist, entra o filtro de ar',                 d.comDist===1);
}

console.log('\n3. O PASSO TEM DUAS BATIDAS E MATERIAL');
{
  const d=await p.evaluate(()=>{
    const disparos=[];
    const orig=A.ctx.createBufferSource.bind(A.ctx);
    A.ctx.createBufferSource=function(){
      const s=orig(); const st=s.start.bind(s);
      s.start=function(t){disparos.push(+(t-A.ctx.currentTime).toFixed(4));return st(t);};
      return s;
    };
    passo(1,0,'tabua');
    A.ctx.createBufferSource=orig;
    disparos.sort((a,b)=>a-b);
    const gap=disparos.length>=2?+(disparos[1]-disparos[0]).toFixed(4):null;
    return {disparos:disparos.length, gap, faixa:SOM_CFG.passoDuplo};
  });
  console.log('    disparos: '+d.disparos+' · intervalo calcanhar→peso: '+(d.gap*1000).toFixed(0)+' ms');
  ok('o passo dispara pelo menos duas batidas', d.disparos>=2);
  ok('e o intervalo está na faixa humana (45–75ms)',
     d.gap>=d.faixa[0]-0.002 && d.gap<=d.faixa[1]+0.002);
}
{
  const d=await p.evaluate(()=>{
    const cortes=[];
    const orig=A.ctx.createBiquadFilter.bind(A.ctx);
    A.ctx.createBiquadFilter=function(){
      const f=orig();
      setTimeout(()=>{},0);
      cortes.push(f); return f;
    };
    const pega=piso=>{cortes.length=0; passo(1,0,piso);
      return cortes.map(f=>Math.round(f.frequency.value)).sort((a,b)=>b-a)[0];};
    const r={tabua:pega('tabua'), ladrilho:pega('ladrilho'), terra:pega('terra'), pano:pega('pano')};
    A.ctx.createBiquadFilter=orig;
    return {r, materiais:Object.keys(MATERIAL_SOM), pisos:PISO_DO_COMODO};
  });
  console.log('    corte mais alto por piso: '+JSON.stringify(d.r));
  ok('há seis materiais de piso',           d.materiais.length===6);
  ok('todo cômodo tem piso declarado',      Object.keys(d.pisos).length===9);
  ok('ladrilho é mais agudo que terra',     d.r.ladrilho>d.r.terra);
  ok('e terra é mais agudo que colchão',    d.r.terra>d.r.pano);
}
{
  const d=await p.evaluate(()=>{
    /* variação: dois passos seguidos não podem ser idênticos */
    const cap=()=>{const v=[];const orig=A.ctx.createBiquadFilter.bind(A.ctx);
      A.ctx.createBiquadFilter=function(){const f=orig();v.push(f);return f;};
      passo(1,0,'tabua'); A.ctx.createBiquadFilter=orig;
      return v.map(f=>+f.frequency.value.toFixed(2)).join(',');};
    const a=cap(), b2=cap(), c=cap();
    return {iguais:(a===b2&&b2===c), amostra:[a.slice(0,40),b2.slice(0,40)]};
  });
  console.log('    passo 1: '+d.amostra[0]);
  console.log('    passo 2: '+d.amostra[1]);
  ok('dois passos seguidos NÃO são idênticos', d.iguais===false);
}

console.log('\n4. A PORTA QUE JÁ EXISTIA, AGORA COM DISTÂNCIA');
{
  const d=await p.evaluate(()=>{
    /* MEDIR O FILTRO DE AR, NAO O MAXIMO DE TODOS OS FILTROS.
       A primeira versao deste teste comparava o corte mais alto entre
       TODOS os filtros criados — e como os filtros proprios da porta sao
       mais agudos que o filtro de ar, o maximo mal se movia. A assercao
       passava por acaso. Agora conto os filtros lowpass de Q baixo, que
       e a assinatura do filtro de ar do §47. */
    const captura=(op)=>{
      let fontes=0; const filtros=[];
      const oS=A.ctx.createBufferSource.bind(A.ctx), oO=A.ctx.createOscillator.bind(A.ctx);
      const oF=A.ctx.createBiquadFilter.bind(A.ctx);
      A.ctx.createBufferSource=()=>{fontes++;return oS();};
      A.ctx.createOscillator=()=>{fontes++;return oO();};
      A.ctx.createBiquadFilter=()=>{const f=oF();filtros.push(f);return f;};
      somPortaAbrindo(op);
      A.ctx.createBufferSource=oS; A.ctx.createOscillator=oO; A.ctx.createBiquadFilter=oF;
      const ar=filtros.filter(f=>f.type==='lowpass'&&Math.abs(f.Q.value-0.4)<0.01);
      return {fontes, filtrosDeAr:ar.length,
        corteDoAr:ar.length?Math.round(ar[0].frequency.value):null};
    };
    const perto=captura({pan:0});
    const longe=captura({pan:0,dist:3});
    const meio =captura({pan:0,dist:1});
    return {perto,meio,longe, jaExistia:som47Estado().portaJaExistia,
      ambienteZerado:som47Estado().distanciaAmbiente===0};
  });
  console.log('    perto:       '+d.perto.fontes+' fontes · filtros de ar: '+d.perto.filtrosDeAr);
  console.log('    1 cômodo:    '+d.meio.fontes+' fontes · ar em '+d.meio.corteDoAr+' Hz');
  console.log('    3 cômodos:   '+d.longe.fontes+' fontes · ar em '+d.longe.corteDoAr+' Hz');
  ok('a porta do jogo já existia e não foi reescrita', d.jaExistia===true);
  ok('ela toca várias camadas',                        d.perto.fontes>=4);
  ok('perto NÃO recebe filtro de ar nenhum',           d.perto.filtrosDeAr===0);
  ok('longe recebe filtro de ar em toda camada',       d.longe.filtrosDeAr===d.longe.fontes);
  ok('longe NÃO perde camada — perde brilho',          d.longe.fontes===d.perto.fontes);
  ok('e o corte cai de 1 pra 3 cômodos',               d.longe.corteDoAr<d.meio.corteDoAr);
  ok('a janela de distância fecha depois de usada',    d.ambienteZerado===true);
}

console.log('\n5. O CUSTO — MEDIDO, NÃO ESTIMADO');
{
  const d=await p.evaluate(()=>{
    const med=(fn,n)=>{const t=performance.now();for(let i=0;i<n;i++)fn();
      return +((performance.now()-t)/n).toFixed(3);};
    return {passo:med(()=>passo(1,0),200),
      passoLonge:med(()=>passo(.3,0),200),
      porta:med(()=>somPortaAbrindo({pan:0}),60),
      portaLonge:med(()=>somPortaAbrindo({pan:0,dist:3}),60),
      batida:med(()=>batida(1,1,0),100),
      saidaSem:med(()=>{const g=A.ctx.createGain();saida(g,{pan:0,rev:.4});},300),
      saidaCom:med(()=>{const g=A.ctx.createGain();saida(g,{pan:0,rev:.4,dist:2});},300)};
  });
  console.log('    passo    '+d.passo+' ms   (antes: 0,921)');
  console.log('    porta    '+d.porta+' ms');
  console.log('    batida   '+d.batida+' ms   (antes: 0,329)');
  console.log('    saida    '+d.saidaSem+' ms sem distância · '+d.saidaCom+' ms com  (antes: 0,142)');
  ok('o passo continua dentro do orçamento de 2ms', d.passo<2);
  /* a porta ja custava o que custa — 10 fontes, cinco camadas. Nao e
     regressao minha, e nao vou fingir que virou barata. O que eu tenho de
     provar e que a distancia nao a encareceu muito. */
  ok('a distância não encarece a porta em mais de 40%',
     d.portaLonge < d.porta*1.4);
  ok('saida sem distância não ficou mais cara',     d.saidaSem<0.30);
  ok('e com distância o custo extra é pequeno',     d.saidaCom-d.saidaSem<0.25);
}

console.log('\n6. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
