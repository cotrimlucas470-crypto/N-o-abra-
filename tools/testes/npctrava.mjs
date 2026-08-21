/* Fase 0 — riscos de travamento: existe estado em que o NPC nao tem o que fazer? */
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
  /* 1 · faixa de moral SEM rotina alcancavel, ignorando os gates `precisa` */
  const semNada=[];
  for(let m=0;m<=100;m++){
    const v=ROTINAS.filter(r=>m>=r.moral[0]&&m<=r.moral[1]);
    if(!v.length)semNada.push(m);
  }
  out.moralSemRotinaNenhuma=semNada;

  /* 2 · pior caso REAL: sem avaria, sem canteiro, sem comida, sem outro NPC */
  S.abrigo=[{...PESSOAS[0],moral:60,lacos:{},doente:0,local:4}];
  S.comida=0; S.agua=0;
  const pior=[];
  for(let m=0;m<=100;m++){
    S.abrigo[0].moral=m;
    let nulos=0;
    for(let i=0;i<40;i++){ if(rotinaDe(S.abrigo[0])===null)nulos++; }
    if(nulos===40)pior.push(m);
  }
  out.moralOndeRotinaDeSempreDaNull=pior.length?{de:pior[0],ate:pior[pior.length-1],quantos:pior.length}:'nenhuma';

  /* 3 · objetivo orfao: o dono saiu do abrigo */
  S.abrigo=PESSOAS.slice(0,3).map(x=>({...x,moral:60,lacos:{},doente:0,local:4}));
  S.objetivos=[{dono:'Rafael',n:'a foto',local:'ferrovelho',feito:false,ignorado:0}];
  S.abrigo=S.abrigo.filter(x=>x.n!=='Rafael');
  let orfao='ok';
  try{ cobrarObjetivos(); }catch(e){ orfao='LANCOU: '+e.message; }
  out.objetivoOrfao={sobrouNaLista:S.objetivos.length, resultado:orfao,
    nota:'cobrarObjetivos faz return se o dono sumiu — o objetivo fica na lista pra sempre, sem dono e sem fim'};

  /* 4 · tarefa apontando pra quem morreu */
  S.abrigo=PESSOAS.slice(0,2).map(x=>({...x,moral:60,lacos:{},doente:0,local:4}));
  S.tarefas={'Rafael':'porta','FantasmaQueMorreu':'cozinha'};
  let tar='ok';
  try{ resolverTarefas(); }catch(e){ tar='LANCOU: '+e.message; }
  out.tarefaDeMorto={resultado:tar};

  /* 5 · pessoa sem local valido: some da casa mas continua viva */
  S.abrigo=[{...PESSOAS[0],moral:60,lacos:{},doente:0,local:99}];
  out.pessoaEmLocalInvalido={
    apareceEmAlgumComodo:[0,1,2,3,4,5,6,7,8].some(id=>S.abrigo.filter(x=>x.local===id).length>0),
    nota:'local so e saneado no carregar(); quem entra com local invalido em partida corrente fica invisivel'
  };

  /* 6 · watchdog existe? */
  const fonte=String(rotinaDe)+String(cobrarObjetivos)+String(espalharGente);
  out.watchdog={temTetoDeTurnos:/turnosNo|watchdog|teto/i.test(fonte), nota:'nenhum: nao existe estado por NPC pra vigiar'};
  return out;
});
console.log(JSON.stringify(r,null,1));
console.log('\nerros: '+(erros.length?erros.join(' | '):'nenhum'));
await b.close();
