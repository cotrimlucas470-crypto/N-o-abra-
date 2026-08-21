/* §37 — a linha de saldo: a conta que a prosa escondia. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Lucas'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. O PROBLEMA QUE ISTO RESOLVE');
console.log('    851 falas · mediana de 10 palavras · 239 coladas a mudança sem número');
let d=await p.evaluate(()=>saldoEstado());
console.log('   ',JSON.stringify(d));
ok('o vigia está ligado durante o jogo',d.ligado&&d.jogando);
ok('acompanha os 10 recursos que o jogador conta',d.itens.length===10);

console.log('\n2. A CONTA APARECE DEPOIS DA FRASE');
d=await p.evaluate(async()=>{
  const T=document.getElementById('texto');
  T.innerHTML='';
  saldoConferir();                       /* tira a foto de referência */
  diz('A febre cedeu.','bom');           /* a prosa, intacta */
  S.remedio=Math.max(0,(S.remedio||1)-1);
  S.comida=(S.comida||0)-2;
  await new Promise(r=>setTimeout(r,700));
  const ps=[...T.querySelectorAll('p')].map(x=>({c:x.className,t:x.textContent}));
  return {ps, temSaldo:ps.some(x=>x.c==='saldo'),
    prosaIntacta:ps.some(x=>x.t==='A febre cedeu.'),
    saldo:(ps.find(x=>x.c==='saldo')||{}).t||''};
});
console.log('    a tela mostrou:');
d.ps.forEach(x=>console.log('      ['+x.c+'] '+x.t));
ok('a frase original não foi tocada',d.prosaIntacta);
ok('e a conta aparece embaixo dela',d.temSaldo);
ok('dizendo o remédio que saiu',/1 remédio/.test(d.saldo));
ok('e a comida que saiu',/2 latas/.test(d.saldo));

console.log('\n3. GENTE APARECE PELO NOME, NÃO COMO NÚMERO');
d=await p.evaluate(async()=>{
  const T=document.getElementById('texto'); T.innerHTML='';
  saldoConferir();
  S.abrigo=(S.abrigo||[]).concat([{n:'Damião',id:99,moral:60,lacos:{}}]);
  await new Promise(r=>setTimeout(r,700));
  const entrou=(T.querySelector('p.saldo')||{}).textContent||'';
  T.innerHTML=''; saldoConferir();
  const quem=S.abrigo[S.abrigo.length-1].n;
  S.abrigo=S.abrigo.slice(0,-1); S.mortos=(S.mortos||[]).concat([{n:quem}]);
  await new Promise(r=>setTimeout(r,700));
  const saiu=(T.querySelector('p.saldo')||{}).textContent||'';
  return {entrou,saiu};
});
console.log('    chegou:',d.entrou);
console.log('    morreu:',d.saiu);
ok('quem chega aparece pelo nome',/Damião/.test(d.entrou));
ok('quem morre aparece pelo nome e diz que morreu',/Damião/.test(d.saiu)&&/morreu/.test(d.saiu));

console.log('\n4. MUDANÇA PEQUENA DEMAIS NÃO VIRA LINHA');
d=await p.evaluate(async()=>{
  const T=document.getElementById('texto'); T.innerHTML=''; saldoConferir();
  S.ruido=(S.ruido||0)+1;                /* abaixo do mínimo de 3 */
  await new Promise(r=>setTimeout(r,700));
  /* o certo é conferir que RUÍDO não aparece — não que a tela fique
     vazia. O jogo tem vida própria e pode mexer noutro recurso na
     mesma janela; a primeira versão desta asserção media a coisa
     errada e reprovava por causa de uma linha que estava certa. */
  const um=/ru[íi]do/.test((T.querySelector('p.saldo')||{}).textContent||'');
  T.innerHTML=''; saldoConferir();
  S.ruido=(S.ruido||0)+8;                /* acima */
  await new Promise(r=>setTimeout(r,700));
  const oito=(T.querySelector('p.saldo')||{}).textContent||'';
  return {um, oito, minimo:SALDO_CFG.minimo.ruido};
});
console.log('   ',JSON.stringify(d));
ok('+1 de ruído não é reportado (viraria chuvisco)',d.um===false);
ok('+8 vira',/8 de ruído/.test(d.oito));

console.log('\n5. A COR SEGUE O SIGNIFICADO, NÃO O SINAL');
d=await p.evaluate(()=>{
  const a=saldoFoto();
  const maisComida=saldoPartes(a,{...a,comida:a.comida+3}).join('');
  const maisRuido=saldoPartes(a,{...a,ruido:a.ruido+9}).join('');
  const menosRuido=saldoPartes(a,{...a,ruido:a.ruido-9}).join('');
  return {maisComida, maisRuido, menosRuido};
});
console.log('    +comida:',d.maisComida);
console.log('    +ruído :',d.maisRuido);
console.log('    −ruído :',d.menosRuido);
ok('ganhar comida é bom (<b>)',/^<b>/.test(d.maisComida));
ok('ganhar ruído é ruim (<i>), mesmo sendo "+"',/^<i>/.test(d.maisRuido));
ok('perder ruído é bom, mesmo sendo "−"',/^<b>/.test(d.menosRuido));

console.log('\n6. NÃO APARECE ONDE ATRAPALHARIA');
d=await p.evaluate(async()=>{
  const T=document.getElementById('texto'); T.innerHTML='';
  const caixa=document.createElement('div'); caixa.id='cena-fim';
  document.body.appendChild(caixa);
  const durante=saldoJogando();
  S.comida=(S.comida||0)+5;
  await new Promise(r=>setTimeout(r,700));
  const apareceu=!!T.querySelector('p.saldo');
  caixa.remove();
  return {durante, apareceu};
});
console.log('   ',JSON.stringify(d));
ok('durante o final, o vigia se cala',d.durante===false&&d.apareceu===false);

console.log('\n7. DÁ PRA DESLIGAR, E A ESCOLHA FICA NO SAVE');
d=await p.evaluate(async()=>{
  const T=document.getElementById('texto'); T.innerHTML=''; saldoConferir();
  const desligado=saldoAlternar();
  S.comida=(S.comida||0)-4;
  await new Promise(r=>setTimeout(r,700));
  const mudo=!T.querySelector('p.saldo');
  const noSave=(()=>{ salvar();
    return JSON.parse(localStorage.getItem(CHAVE)||'{}').semSaldo; })();
  saldoAlternar();
  T.innerHTML=''; saldoConferir();
  S.comida=(S.comida||0)+4;
  await new Promise(r=>setTimeout(r,700));
  return {desligado, mudo, noSave, voltou:!!T.querySelector('p.saldo')};
});
console.log('   ',JSON.stringify(d));
ok('desligado, não escreve nada',d.desligado===false&&d.mudo);
ok('a escolha vai pro save',d.noSave===true);
ok('e ligar de novo volta a escrever',d.voltou);

console.log('\n8. TROCAR DE TELA NÃO ARRASTA CONTA VELHA');
d=await p.evaluate(async()=>{
  const T=document.getElementById('texto'); T.innerHTML=''; saldoConferir();
  S.diesel=(S.diesel||0)-9;      /* mudou ANTES de trocar de tela */
  limpar();                      /* troca de tela: a foto é refeita */
  await new Promise(r=>setTimeout(r,700));
  return {arrastou:!!document.getElementById('texto').querySelector('p.saldo')};
});
console.log('   ',JSON.stringify(d));
ok('mudança de antes da troca de tela não reaparece fora de contexto',!d.arrastou);

console.log('\n9. O GUIA: UMA IDEIA POR LINHA');
d=await p.evaluate(()=>{
  const L=guiaLinhas();
  const palavras=s=>s.split(/\s+/).filter(Boolean).length;
  const linhas=L.filter(([c])=>c!=='t').map(([,t])=>t);
  return {n:L.length, titulos:L.filter(([c])=>c==='t').length,
    maior:Math.max(...linhas.map(palavras)),
    media:+(linhas.reduce((a,t)=>a+palavras(t),0)/linhas.length).toFixed(1),
    acima20:linhas.filter(t=>palavras(t)>20).length,
    exemplo:linhas.slice(1,5)};
});
console.log('   ', JSON.stringify({n:d.n,titulos:d.titulos,maior:d.maior,media:d.media,acima20:d.acima20}));
d.exemplo.forEach(t=>console.log('      '+t));
ok('o guia virou uma ideia por linha', d.maior<=20 && d.acima20===0);
ok('com média curta', d.media<12);
ok('e mantém as seções', d.titulos>=5);
/* eu troquei acentos por script e a regra 'so.'→'só.' bateu dentro de
   "aviso." e virou "avisó.". Esta asserção existe por causa disso. */
const dOrt=await p.evaluate(()=>{
  const ruins=['avisó','ninguém la ','7h as ','você da ','aparece a noite','alguem','NINGUEM','voce','nao ','esta '];
  const txt=guiaLinhas().map(([,t])=>t).join(' | ');
  return {achados:ruins.filter(r=>txt.includes(r)), txt:txt.length};
});
ok('nenhuma palavra estropiada pela troca de acentos', dOrt.achados.length===0);
d=await p.evaluate(()=>{ telaAjuda();
  const ps=[...document.querySelectorAll('#texto p')].map(x=>x.textContent);
  return {n:ps.length, tem:ps.some(t=>/Nem tudo que passa/.test(t)),
    temSaldo:ps.some(t=>/remédio/.test(t))}; });
ok('a tela de ajuda desenha todas as linhas', d.n>=25);
ok('e continua terminando com o aviso que importa', d.tem);
ok('e agora explica a linha de saldo', d.temSaldo);

console.log('\n10. NADA QUEBROU');
console.log('    erros de página:',erros.length?erros.slice(0,4):'nenhum');
ok('nenhum erro de página',erros.length===0);
await b.close();
