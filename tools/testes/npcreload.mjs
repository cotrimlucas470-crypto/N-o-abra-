/* Fase 0 — a prova honesta: RECARREGAR A PAGINA, nao so chamar carregar(). */
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

const antes=await p.evaluate(()=>{
  S.abrigo=PESSOAS.slice(0,4).map(x=>({...x,moral:60,lacos:{},doente:0,local:4}));
  S.dia=12;
  S.tarefas={}; S.abrigo.forEach((x,i)=>S.tarefas[x.n]=['porta','cozinha','agua','vigia'][i]);
  S.objetivos=[{dono:S.abrigo[0].n,n:'a foto',local:'ferrovelho',feito:false,ignorado:4}];
  S.vigiou={tipo:'monstro'};
  S.infiltrado=S.abrigo[1]; S.infiltrado.falso=true; S.infiltradoDesde=10;
  S.abrigo[0].lacos[S.abrigo[1].n]=55;
  S.abrigo[2].doente=2;
  salvar();
  return {tarefas:Object.keys(S.tarefas).length, objetivos:S.objetivos.length,
    objIgnorado:S.objetivos[0].ignorado, vigiou:!!S.vigiou,
    infiltradoNome:S.infiltrado.n, laco:S.abrigo[0].lacos[S.abrigo[1].n],
    doente:S.abrigo[2].doente, moral:S.abrigo[0].moral};
});

/* RELOAD DE VERDADE */
await p.reload(); await p.waitForTimeout(1200);
{const x=await p.$('#btn-voltar')||await p.$('#btn-boot'); if(x)await x.click();}
await p.waitForTimeout(2500);
const depois=await p.evaluate(()=>{
  if(typeof carregar==='function')carregar();
  return {tarefas:Object.keys(S.tarefas||{}).length, objetivos:(S.objetivos||[]).length,
    objIgnorado:(S.objetivos&&S.objetivos[0]||{}).ignorado, vigiou:!!S.vigiou,
    infiltradoNome:S.infiltrado?S.infiltrado.n:null,
    infiltradoRecuperavel:!!(S.abrigo||[]).find(x=>x.falso),
    laco:S.abrigo&&S.abrigo[0]&&S.abrigo[0].lacos?S.abrigo[0].lacos[Object.keys(S.abrigo[0].lacos)[0]]:undefined,
    doente:S.abrigo&&S.abrigo[2]?S.abrigo[2].doente:undefined,
    moral:S.abrigo&&S.abrigo[0]?S.abrigo[0].moral:undefined};
});
console.log('ANTES  '+JSON.stringify(antes));
console.log('DEPOIS '+JSON.stringify(depois));
console.log('\nPERDIDO NO RECARREGAMENTO:');
Object.keys(antes).forEach(k=>{
  const a=JSON.stringify(antes[k]), d=JSON.stringify(depois[k]);
  if(a!==d)console.log(`  ${k.padEnd(16)} ${a}  ->  ${d}`);
});
console.log('\nerros: '+(erros.length?erros.join(' | '):'nenhum'));
await b.close();
