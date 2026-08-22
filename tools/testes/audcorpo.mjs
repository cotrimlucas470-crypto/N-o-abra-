import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Auditor'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

const r=await p.evaluate(()=>{
  const out={};
  /* ---- CUSTO POR TURNO dos sistemas que os modulos vao tocar ---- */
  const M={};
  const alvo=['custoSaude','saude','passarSaude','pesoFerido','vasculharCasa','irPara',
    'riscoDaArea','moverAmeacas','sararUmPouco'];
  alvo.forEach(n=>{ let f; try{f=eval(n);}catch(e){return;}
    if(typeof f!=='function'){M[n]='ausente';return;}
    M[n]={ms:0,n:0}; const orig=f;
    try{ eval(n+'=function(){const t=performance.now();const v=orig.apply(this,arguments);'
      +'M2["'+n+'"].ms+=performance.now()-t;M2["'+n+'"].n++;return v;}'); }catch(e){ M[n]='nao-embrulhavel'; }
  });
  window.M2=M;
  S.males=[{id:'corte',dias:4,tratado:0,porque:'teste'},{id:'torcao',dias:6,tratado:0,porque:'teste'}];
  const T=500,t0=performance.now();
  for(let i=0;i<T;i++){ custoSaude(); saude(); pesoFerido(); }
  const total=performance.now()-t0;
  out.custoPorTurno={turnos:T,totalMs:+total.toFixed(1),porTurnoMs:+(total/T).toFixed(4),
    detalhe:Object.fromEntries(Object.entries(M).map(([k,v])=>[k,
      (v&&v.n)?{n:v.n,ms:+v.ms.toFixed(2)}:v]))};

  /* ---- SOFTLOCK: o corpo consegue travar o jogador? ---- */
  const piores=Object.keys(MALES);
  S.males=piores.map(id=>({id,dias:MALES[id].dias,tratado:0,porque:'pior caso'}));
  S.ferido=99; S.doenteJog=9;
  const c=custoSaude();
  out.piorCaso={
    quantosMales:S.males.length, custo:c,
    forcaSobrou:+(1-c.forca).toFixed(2), fugaSobrou:+(1-c.fuga).toFixed(2),
    horasPerdidas:c.horas,
    aindaAnda:(()=>{try{irPara(4,true);return true;}catch(e){return 'LANCOU: '+e.message;}})(),
    temTelaDeMorte:typeof fim==='function',
    nota:'nenhum mal zera acao: custoSaude tem trava em .65/.60/.55 e horas<=3'
  };
  /* mata: algum mal mata? */
  out.maisQueMatam=Object.entries(MALES).filter(([k,v])=>v.mata).map(([k,v])=>({id:k,mata:v.mata}));
  out.maisQuePegam=Object.entries(MALES).filter(([k,v])=>v.pega).map(([k,v])=>k);
  S.males=[]; S.ferido=0; S.doenteJog=0;

  /* ---- TELLS: quantas fontes de dano tem sinal previo ---- */
  out.tells={
    ameacasDeRua:{total:Object.keys(AMEACAS).length,
      comAviso:Object.values(AMEACAS).filter(a=>a.aviso).length,
      comSom:Object.values(AMEACAS).filter(a=>a.som).length},
    bichosDaCasa:{total:BICHOS.length,
      comAparencia:BICHOS.filter(x=>x.ap).length,
      comFraqueza:BICHOS.filter(x=>x.fraco).length,
      comRegra:BICHOS.filter(x=>typeof REGRA!=='undefined'&&REGRA[x.id]).length,
      comDica:BICHOS.filter(x=>typeof REGRA!=='undefined'&&REGRA[x.id]&&REGRA[x.id].dica).length,
      sentidos:BICHOS.map(x=>(typeof REGRA!=='undefined'&&REGRA[x.id])?REGRA[x.id].sentido:null)},
    trilhaDoJogador:Array.isArray(S.trilha),
    nota:'aviso existe em AMEACAS (rua) e dica em REGRA (casa). Nao ha antecedencia em turnos declarada.'
  };

  /* ---- o que precisa migrar ---- */
  const cru=localStorage.getItem(CHAVE); const d=cru?JSON.parse(cru):{};
  out.migracao={
    jaNoSave:['males','med','ferido','doenteJog','corpo','exped','vistos','trilha']
      .filter(k=>k in d),
    faltaNoSave:['males','med','ferido','doenteJog','corpo','exped','vistos','trilha']
      .filter(k=>!(k in d)),
    nomesLivres:['exploracao','conhecimento','pressao','atencaoDaCasa','rastroSangue']
      .filter(k=>S[k]===undefined),
    nomesOCUPADOS:['corpo'].filter(k=>S[k]!==undefined)
  };
  return out;
});
console.log(JSON.stringify(r,null,1));
console.log('\nerros: '+(erros.length?erros.join(' | '):'nenhum'));
await b.close();
