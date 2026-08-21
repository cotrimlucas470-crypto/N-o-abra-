/* Fase 0 — o que sobrevive a salvar/carregar, e o que quebra por identidade. */
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
  S.abrigo=PESSOAS.slice(0,4).map(x=>({...x,moral:60,lacos:{},doente:0,local:4}));
  S.dia=12;
  /* monta um estado de NPC rico */
  S.tarefas={}; S.abrigo.forEach((x,i)=>S.tarefas[x.n]=['porta','cozinha','agua','vigia'][i]);
  S.objetivos=[{dono:S.abrigo[0].n,n:'a foto',local:'ferrovelho',feito:false,ignorado:4}];
  S.vigiou={tipo:'monstro'};
  S.infiltrado=S.abrigo[1]; S.infiltrado.falso=true; S.infiltradoDesde=10;
  S.abrigo[0].lacos[S.abrigo[1].n]=55;

  const antes={
    tarefas:Object.keys(S.tarefas).length,
    objetivos:(S.objetivos||[]).length,
    objIgnorado:(S.objetivos[0]||{}).ignorado,
    vigiou:!!S.vigiou,
    infiltradoEhObjetoDoAbrigo:S.abrigo.includes(S.infiltrado),
    infiltradoNome:S.infiltrado&&S.infiltrado.n,
    laco:S.abrigo[0].lacos[S.abrigo[1].n]
  };
  salvar(); carregar();
  const depois={
    tarefas:Object.keys(S.tarefas||{}).length,
    objetivos:(S.objetivos||[]).length,
    objIgnorado:(S.objetivos&&S.objetivos[0]||{}).ignorado,
    vigiou:!!S.vigiou,
    infiltradoEhObjetoDoAbrigo:!!(S.infiltrado&&S.abrigo.includes(S.infiltrado)),
    infiltradoNome:S.infiltrado&&S.infiltrado.n,
    laco:S.abrigo[0]&&S.abrigo[0].lacos?S.abrigo[0].lacos[S.abrigo[1].n]:undefined
  };
  out.saveLoad={antes,depois};
  out.perdido=Object.keys(antes).filter(k=>JSON.stringify(antes[k])!==JSON.stringify(depois[k]));

  /* nome e chave primaria: da pra ter dois iguais? */
  const nomes=PESSOAS.map(x=>x.n);
  out.nomeComoChave={
    pessoasUnicas:new Set(nomes).size===nomes.length,
    ondeNomeEhChave:['S.tarefas[p.n]','o.dono','p.lacos[outro.n]','infiltradoNome','S.mortos por n'],
    risco:'mortoDeAntes() traz gente de partida anterior pelo nome; visitante `conhecido` copia um nome do pool'
  };
  /* quanto pesa o estado de NPC no save hoje */
  const cru=localStorage.getItem(CHAVE);
  const d=JSON.parse(cru);
  out.pesoNoSave={
    saveTotalKB:+(cru.length/1024).toFixed(1),
    abrigoKB:+(JSON.stringify(d.abrigo||[]).length/1024).toFixed(1),
    poolKB:+(JSON.stringify(d.pool||[]).length/1024).toFixed(1),
    mortosKB:+(JSON.stringify(d.mortos||[]).length/1024).toFixed(1)
  };
  return out;
});
console.log(JSON.stringify(r,null,1));
console.log('\nerros: '+(erros.length?erros.join(' | '):'nenhum'));
await b.close();
