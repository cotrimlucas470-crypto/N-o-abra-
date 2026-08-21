/* Fase 0 — o NPC decide quantas vezes por dia, e o jogador ve quantas coisas? */
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

const r=await p.evaluate(()=>{
  const out={};
  /* 1 · quantas rotinas existem, e quantas sao alcancaveis por faixa de moral */
  out.rotinas=ROTINAS.length;
  const faixas=[[10,'desesperado'],[30,'baixo'],[50,'medio'],[70,'bom'],[90,'alto']];
  out.porMoral=faixas.map(([m,nome])=>({moral:m,nome,
    alcancaveis:ROTINAS.filter(r=>m>=r.moral[0]&&m<=r.moral[1]).length,
    ids:ROTINAS.filter(r=>m>=r.moral[0]&&m<=r.moral[1]).map(r=>r.id)}));

  /* 2 · quantas o jogador VE numa campanha de 30 dias — vidaDaCasa mostra 1 ou 2/dia */
  S.abrigo=PESSOAS.slice(0,8).map(x=>({...x,moral:60,lacos:{},doente:0,local:4}));
  const vistas={}; let mostradas=0;
  for(let dia=1;dia<=30;dia++){
    S.dia=dia;
    const quantos=Math.min(S.abrigo.length,1+(chance(.55)?1:0));
    for(let i=0;i<quantos;i++){
      const pes=sortear(S.abrigo); const rt=rotinaDe(pes);
      if(rt){ vistas[rt.id]=(vistas[rt.id]||0)+1; mostradas++; }
    }
  }
  out.campanha30={cenasMostradas:mostradas, rotinasDistintas:Object.keys(vistas).length,
    deQuantas:ROTINAS.length, detalhe:vistas};

  /* 3 · quantas DECISOES um NPC toma por dia hoje */
  out.decisoesPorNpcPorDia={
    rotina:'0 ou 1 (so 1-2 pessoas da casa inteira agem por dia)',
    tarefa:'1, e quem escolhe e o JOGADOR, nao o NPC',
    movimento:'1 teleporte em espalharGente, sem rota',
    total:'menos de 2 — e nenhuma e sobre o que ELE quer'
  };

  /* 4 · o NPC tem local? ele se move? */
  const antes=S.abrigo.map(x=>x.local);
  espalharGente();
  const dep=S.abrigo.map(x=>x.local);
  out.movimento={antes,depois:dep,
    saltosImpossiveis:antes.filter((v,i)=>{
      try{ return v!=null&&dep[i]!=null&&v!==dep[i]&&(typeof distancia==='function'?distancia(v,dep[i])>1:true); }
      catch(e){ return true; }
    }).length};

  /* 5 · o NPC percebe anomalia / criatura / sanidade? */
  const fonte=String(rotinaDe)+ROTINAS.map(r=>String(r.faz)).join('');
  out.consciencia={
    citaAnomalia:/avaria|anomal/i.test(fonte),
    citaCriatura:/criatura|monstro|ameaca|ameaça|imitador|magro/i.test(fonte),
    citaSanidade:/sanidade|san\(\)|sanEfetiva|estagio/i.test(fonte),
    citaOrquestrador:/orq|orcamento|orçamento/i.test(fonte),
    citaMemoriaDaCasa:/casaMemoria|memCasa|MEM_CFG/i.test(fonte)
  };
  return out;
});
console.log(JSON.stringify(r,null,1));
console.log('\nerros: '+(erros.length?erros.join(' | '):'nenhum'));
await b.close();
