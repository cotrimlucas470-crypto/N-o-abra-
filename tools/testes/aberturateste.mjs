/* A ABERTURA NARRADA — e a guarda que a protege.
   Ela sumiu por um caminho que não dá erro nenhum: um bloco novo chamou
   marcarSujo() durante a carga, o save debounced gravou um save fantasma
   antes de o jogador digitar o nome, e o boot passou a mostrar "Tem uma
   casa esperando" na PRIMEIRA vez que alguém abre o jogo. Nenhuma
   exceção, nenhum aviso — só a abertura nunca mais tocando. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const URL=process.env.JOGO||'http://127.0.0.1:8900/index.html';
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});

console.log('\n1. A CARGA NÃO GRAVA SAVE NENHUM');
let p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,120)));
await p.addInitScript(()=>{
  window.__escritas=[];
  const o=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){ window.__escritas.push(k); return o.apply(this,arguments); };
});
await p.goto(URL);
await p.waitForTimeout(3200);            /* bem depois do debounce de 1,2 s */
let d=await p.evaluate(()=>({
  escritas:window.__escritas, chaves:Object.keys(localStorage),
  temSave:temSave(), nome:S.nomeJogador||null,
  /* os blocos novos SUJAM o estado na carga — isso é esperado e certo.
     O que não pode é a sujeira virar save. */
  sujou:typeof S.orquestrador==='object'&&!!S.orquestrador
}));
console.log('   ',JSON.stringify(d));
ok('nada é escrito no localStorage antes de a partida começar',d.escritas.length===0);
ok('e temSave() diz que não há partida',d.temSave===false);
ok('o §31 ainda prepara o estado da noite na carga',d.sujou);

console.log('\n2. PARTIDA NOVA TOCA A ABERTURA NARRADA');
await p.click('#btn-boot');
await p.waitForTimeout(1400);
d=await p.evaluate(()=>({
  cine:!!document.getElementById('cine'),
  visivel:!!document.querySelector('#cine.vis'),
  pular:!!document.getElementById('cine-pular'),
  temTexto:((document.getElementById('cine-txt')||{}).textContent||'').length>20,
  voz:typeof VOZ_ABERTURA!=='undefined'&&VOZ_ABERTURA.indexOf('base64')>=0
}));
console.log('   ',JSON.stringify(d));
ok('a voz da abertura está embutida no HTML',d.voz);
ok('a tela da abertura aparece',d.cine&&d.visivel);
ok('com texto narrado',d.temTexto);
ok('e com botão de pular',d.pular);

console.log('\n3. O TEXTO AVANÇA SOZINHO');
const antes=await p.evaluate(()=>document.getElementById('cine-txt').textContent);
await p.waitForTimeout(5200);
const depois=await p.evaluate(()=>document.getElementById('cine-txt').textContent);
console.log('    "'+antes.slice(0,40)+'…" → "'+depois.slice(0,40)+'…"');
ok('a narração avança de bloco',antes!==depois);

console.log('\n4. PULAR LEVA AO PEDIDO DE NOME');
await p.click('#cine-pular');
await p.waitForTimeout(1800);
d=await p.evaluate(()=>({nome:!!document.getElementById('nm'),
  cine:!!document.getElementById('cine')}));
console.log('   ',JSON.stringify(d));
ok('pular fecha a abertura e pede o nome',d.nome&&!d.cine);

console.log('\n5. COM PARTIDA DE VERDADE, O BOOT OFERECE VOLTAR');
await p.fill('#nm','Lucas'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600); }
await p.waitForTimeout(6000);
d=await p.evaluate(()=>{ salvar(); return {
  gravou:!!localStorage.getItem(CHAVE), temSave:temSave(), nome:S.nomeJogador}; });
console.log('   ',JSON.stringify(d));
ok('depois de começar, o save grava normalmente',d.gravou&&d.temSave);
ok('e guarda o nome do jogador',d.nome==='Lucas');

console.log('\n6. SAVE FANTASMA DE VERSÃO ANTIGA É LIMPO SOZINHO');
d=await p.evaluate(()=>{
  const bom=localStorage.getItem(CHAVE);
  const lixo=JSON.parse(bom); delete lixo.nomeJogador;
  localStorage.setItem(CHAVE,JSON.stringify(lixo));
  const antes=!!localStorage.getItem(CHAVE);
  const r=temSave();
  const depois=!!localStorage.getItem(CHAVE);
  localStorage.setItem(CHAVE,bom);
  return {antes, temSave:r, sobrou:depois};
});
console.log('   ',JSON.stringify(d));
ok('save sem nome não conta como partida',d.antes&&d.temSave===false);
ok('e é apagado, pra não prender o jogador na tela de voltar',!d.sobrou);

console.log('\n7. NADA QUEBROU');
console.log('    erros de página:',erros.length?erros.slice(0,4):'nenhum');
ok('nenhum erro de página',erros.length===0);
await b.close();
