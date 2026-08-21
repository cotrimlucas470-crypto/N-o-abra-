/* Fase 0 — custo real do processamento de NPC. Mede, nao estima. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Medidor'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

const r=await p.evaluate(async()=>{
  /* casa cheia: 8 pessoas, que e o caso realista de meio de campanha */
  S.abrigo=PESSOAS.slice(0,8).map(x=>({...x,moral:60,lacos:{},doente:0,local:4}));
  S.pool=PESSOAS.slice(8).map(x=>({...x,moral:70,lacos:{}}));
  S.dia=14;

  const M={}; const alvo=['espalharGente','rotinaDe','vidaDaCasa','memoriaDaCasa',
    'cobrarObjetivos','pistaDoDia','resolverTarefas','aproximar','mexerMoral','moralMedia'];
  for(const nome of alvo){
    if(typeof window[nome]!=='function'){ M[nome]={ausente:true}; continue; }
    const orig=window[nome]; M[nome]={ms:0,n:0};
    window[nome]=function(){ const t=performance.now(); const v=orig.apply(this,arguments);
      if(v&&typeof v.then==='function')return v.finally(()=>{M[nome].ms+=performance.now()-t;M[nome].n++;});
      M[nome].ms+=performance.now()-t; M[nome].n++; return v; };
  }
  /* 200 turnos de casa: e o que o jogo faz por dia, sem as pausas de leitura */
  const T=200, t0=performance.now();
  for(let i=0;i<T;i++){
    S.dia=14+i;
    espalharGente();
    S.abrigo.forEach(x=>rotinaDe(x));
    cobrarObjetivos();
    moralMedia();
  }
  const total=performance.now()-t0;

  /* quanto do estado de NPC sobrevive a um ida-e-volta por JSON */
  const antes=JSON.parse(JSON.stringify(S.abrigo));
  const campos=new Set(); S.abrigo.forEach(x=>Object.keys(x).forEach(k=>campos.add(k)));
  const funcs=[]; S.abrigo.forEach(x=>Object.keys(x).forEach(k=>{
    if(typeof x[k]==='function')funcs.push(k);}));

  return {
    turnos:T, totalMs:+total.toFixed(1), porTurnoMs:+(total/T).toFixed(3),
    pessoas:S.abrigo.length,
    porFuncao:Object.fromEntries(Object.entries(M).map(([k,v])=>
      [k, v.ausente?'AUSENTE':{n:v.n, ms:+v.ms.toFixed(1), porChamada:+(v.ms/Math.max(1,v.n)).toFixed(4)}])),
    camposDePessoa:[...campos].sort(),
    funcoesNoEstado:[...new Set(funcs)],
    bytesPorPessoa:Math.round(JSON.stringify(antes).length/antes.length)
  };
});
console.log(JSON.stringify(r,null,1));
console.log('\nerros de pagina: '+(erros.length?erros.join(' | '):'nenhum'));
await b.close();
