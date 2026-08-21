/* §35 — as falas da porta: volume, forma, e o morto que voltava estourando. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(2600);

console.log('\n1. VOLUME — O QUE FAZIA PARECER ROBÔ');
let d=await p.evaluate(()=>falasEstado());
console.log('    perguntas',d.perguntas,'· boas',d.totalOk,'· ruins',d.totalRuim,
  '· acrescentadas',JSON.stringify(d.adicionadas));
ok('as 16 perguntas receberam falas novas',d.adicionadas.perguntas===16);
ok('as respostas boas mais que dobraram',d.totalOk>=80);
ok('as ruins passaram de 70',d.totalRuim>=70);
ok('nenhuma pergunta ficou magra',d.magras.length===0);
ok('toda pergunta tem pelo menos 4 boas e 4 ruins',
  d.por.every(o=>o.ok>=4&&o.ruim>=4));

console.log('\n2. RODAR DUAS VEZES NÃO INFLA A LISTA');
d=await p.evaluate(()=>{
  const antes=falasEstado().totalOk;
  ampliarFalasDaPorta(); ampliarFalasDaPorta();
  return {antes, depois:falasEstado().totalOk};
});
console.log('   ',JSON.stringify(d));
ok('a lista não cresce ao reaplicar',d.antes===d.depois);

console.log('\n3. TODA FALA VIRA TEXTO DE VERDADE');
/* o limite é 2 caracteres, não 4: 'Um.' é resposta legítima e curta de
   propósito — a sombra na fresta é mais larga do que um. A primeira
   versão deste teste reprovava o conteúdo por causa da régua. */
d=await p.evaluate(()=>{
  S.nomeJogador='Lucas'; S.hora=23; S.chuva=true; S.gerQuebrado=false;
  S.vozesRoubadas=[{p:{n:'Damião',id:3}}];
  const ruimSemPorque=[], vazias=[], naoTexto=[];
  const cenarios=[{chuva:true,ger:false},{chuva:false,ger:true}];
  cenarios.forEach(c=>{
    S.chuva=c.chuva; S.gerQuebrado=c.ger;
    CHAVES.forEach(k=>{
      PERG[k].ok.forEach((x,i)=>{
        const t=resolver(x);
        if(typeof t!=='string')naoTexto.push(k+'.ok['+i+']');
        else if(t.replace(/^\[v\]/,'').trim().length<2)vazias.push(k+'.ok['+i+']');
      });
      PERG[k].ruim.forEach((a,i)=>{
        const t=resolver(a[0]), w=resolver(a[1]);
        if(typeof t!=='string')naoTexto.push(k+'.ruim['+i+'][0]');
        else if(t.replace(/^\[v\]/,'').trim().length<2)vazias.push(k+'.ruim['+i+']');
        if(!w||typeof w!=='string'||w.trim().length<8)ruimSemPorque.push(k+'.ruim['+i+']');
      });
    });
  });
  return {ruimSemPorque, vazias, naoTexto};
});
console.log('   ',JSON.stringify(d));
ok('nenhuma fala devolve coisa que não é texto',d.naoTexto.length===0);
ok('nenhuma fala sai vazia',d.vazias.length===0);
ok('TODA resposta errada explica por que estava errada',d.ruimSemPorque.length===0);

console.log('\n4. NENHUMA FALA REPETIDA DENTRO DA MESMA PERGUNTA');
d=await p.evaluate(()=>{
  const repetidas=[];
  CHAVES.forEach(k=>{
    const vistos=new Set();
    PERG[k].ok.concat(PERG[k].ruim.map(a=>a[0])).forEach(x=>{
      const s=String(resolver(x)).trim();
      if(vistos.has(s))repetidas.push(k+': '+s.slice(0,40));
      vistos.add(s);
    });
  });
  return {repetidas, n:repetidas.length};
});
console.log('   ',JSON.stringify(d.repetidas.slice(0,4)));
ok('nenhuma repetição literal dentro da mesma pergunta',d.n===0);

console.log('\n5. O MORTO QUE JÁ BATEU AQUI — O RAMO QUE ESTOURAVA');
d=await p.evaluate(()=>{
  /* o ramo original chamava PERG[k].ruim(ant) e PERG[k].bom(ant):
     ruim é array e bom não existe. Isso é a prova de que estourava. */
  const forma={ruim:typeof PERG[CHAVES[0]].ruim, bom:typeof PERG[CHAVES[0]].bom};
  let estouraria=false;
  try{ PERG[CHAVES[0]].ruim(1); }catch(e){ estouraria=true; }
  return {forma, estouraria};
});
console.log('   ',JSON.stringify(d));
ok('o código antigo chamava array como função',d.forma.ruim==='object'&&d.estouraria);
ok('e `bom` nem existe — o campo se chama `ok`',d.forma.bom==='undefined');

d=await p.evaluate(()=>{
  /* monta o cenário e força o ramo 200 vezes */
  const alvo={...PESSOAS[3],alt:.45};
  S.mortos=[alvo]; S.vozesRoubadas=[{p:alvo}];
  S.visitasAntigas=[alvo]; S.visitados=[alvo];
  let erros=0, semResposta=0, comPorque=0, total=0;
  for(let i=0;i<200;i++){
    let v=null;
    try{ v=gerarVisitante(); }catch(e){ erros++; continue; }
    total++;
    if(!v||!v.respostas||!Object.keys(v.respostas).length){ semResposta++; continue; }
    Object.values(v.respostas).forEach(r=>{
      if(r.errado&&r.porque&&String(r.porque).length>8)comPorque++;
    });
  }
  return {erros, semResposta, total, comPorque};
});
console.log('   ',JSON.stringify(d));
ok('200 visitantes gerados sem estourar nenhuma vez',d.erros===0);
ok('todos vêm com respostas montadas',d.semResposta===0);
ok('e as erradas vêm com a explicação junto',d.comPorque>0);

console.log('\n6. O MOLDE NOVO ESTÁ LÁ');
d=await p.evaluate(()=>{
  const todas=CHAVES.flatMap(k=>PERG[k].ruim.map(a=>String(resolver(a[1]))));
  return {
    respondeOutra:todas.some(t=>/ouviu o som do pedido/.test(t)),
    sabeDaCasa:todas.filter(t=>/aqui dentro|desta casa|daqui de dentro/.test(t)).length,
    espelho:todas.filter(t=>/[Ee]spelho/.test(t)).length,
    total:todas.length};
});
console.log('   ',JSON.stringify(d));
ok('entrou o molde "respondeu outra pergunta"',d.respondeOutra);
ok('o molde "sabe da casa" aparece em mais de uma pergunta',d.sabeDaCasa>=3);

console.log('\n7. NADA QUEBROU');
console.log('    erros de página:',erros.length?erros.slice(0,4):'nenhum');
ok('nenhum erro de página',erros.length===0);
await b.close();
