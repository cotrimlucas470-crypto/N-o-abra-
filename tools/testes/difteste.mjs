/* Curva de dificuldade: 0.60 no dia 1, sobe, satura em 0.80. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8900/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','D'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=5; document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);

console.log('\n1. A CURVA');
let d=await p.evaluate(()=>{
  const t=[];
  for(let dia=1;dia<=30;dia++)t.push(+dificuldadeNoDia(dia).toFixed(4));
  return {t, dia1:dificuldadeNoDia(1), teto:DIF_CFG.teto, inicio:DIF_CFG.inicio,
    diasAteTeto:DIF_CFG.diasAteTeto, curva:DIF_CFG.curva};
});
console.log('   dias 1-14:',d.t.slice(0,14).join(' '));
console.log('   dias 15-30:',d.t.slice(14).join(' '));
ok('dia 1 retorna exatamente 0.60',d.dia1===0.60);
ok('a curva cresce monotonicamente',d.t.every((v,i)=>i===0||v>=d.t[i-1]));
/* t[] é indexado do dia 1, então o dia N está em t[N-1]. A versão
   antiga comparava t[diasAteTeto] com t[diasAteTeto-1+1] — o mesmo
   índice dos dois lados: passava sempre e não media nada. */
ok('satura exatamente no dia '+d.diasAteTeto,d.t[d.diasAteTeto-1]===0.80);
ok('e no dia anterior ainda NÃO chegou lá',d.t[d.diasAteTeto-2]<0.80);
ok('permanece em 0.80 em dias muito altos',d.t[29]===0.80&&d.t[24]===0.80);
ok('nunca passa de 0.80',Math.max(...d.t)<=0.80);
ok('nunca cai abaixo de 0.60',Math.min(...d.t)>=0.60);
ok('nunca volta a 1.00',!d.t.includes(1));

console.log('\n2. VALORES ABSURDOS NÃO QUEBRAM A CURVA');
d=await p.evaluate(()=>({
  zero:dificuldadeNoDia(0), neg:dificuldadeNoDia(-50), nan:dificuldadeNoDia(NaN),
  texto:dificuldadeNoDia('abacaxi'), undef:dificuldadeNoDia(undefined),
  enorme:dificuldadeNoDia(1e9), inf:dificuldadeNoDia(Infinity)
}));
console.log('   ',JSON.stringify(d));
/* Regra explícita: NÃO-NÚMERO é save corrompido e cai no dia 1 (o mais
   fácil — diante de estado quebrado o benefício é do jogador).
   Infinity entra aqui: não é um dia, é sintoma. Já 1e9 é um número de
   verdade, ainda que absurdo, e satura como qualquer dia tardio. */
ok('dia 0, negativo, NaN, texto, undefined e Infinity caem no dia 1 (0.60)',
  d.zero===0.6&&d.neg===0.6&&d.nan===0.6&&d.texto===0.6&&d.undef===0.6&&d.inf===0.6);
ok('dia gigante mas numérico satura em 0.80',d.enorme===0.8);

console.log('\n3. OS CINCO PONTOS DE APLICAÇÃO EXISTEM E SÃO ÚNICOS');
d=await p.evaluate(()=>{
  const e=difEstado();
  return {pontos:e.pontos, todos:e.pontos.every(x=>x.embrulhado)};
});
d.pontos.forEach(x=>console.log(`   ${x.fn.padEnd(14)} ${x.modo.padEnd(8)} ${x.o}`));
ok('os cinco pontos foram embrulhados',d.todos&&d.pontos.length===5);

console.log('\n4. NÃO HÁ DUPLA APLICAÇÃO');
d=await p.evaluate(()=>{
  /* Prova por contagem: instrumenta `dif` e conta quantas vezes ela é
     chamada numa única invocação de cada função embrulhada. Mais de uma
     chamada por invocação = o valor passou pelo multiplicador 2x. */
  const _dif=dif; let n=0;
  window.__contarDif=()=>{n++;return _dif();};
  const conta={};
  const medir=(nome,fn)=>{ n=0; try{fn();}catch(e){} conta[nome]=n; };
  /* troca `dif` pelo contador dentro de cada embrulho:
     como `dif` é function declaration, é propriedade do escopo global */
  dif=window.__contarDif;
  medir('riscoInvasao',()=>riscoInvasao());
  medir('escassez',    ()=>escassez());
  medir('gastoComida', ()=>gastoComida());
  medir('folegoPorta', ()=>folegoPorta());
  medir('pegarMal',    ()=>{ S.males=[]; pegarMal('corte',S,'teste'); });
  dif=_dif;
  return conta;
});
Object.keys(d).forEach(k=>console.log(`   ${k.padEnd(14)} ${d[k]} chamada(s) de dif() por invocação`));
ok('riscoInvasao aplica o multiplicador exatamente uma vez',d.riscoInvasao===1);
ok('escassez aplica exatamente uma vez',d.escassez===1);
ok('gastoComida aplica exatamente uma vez',d.gastoComida===1);
ok('folegoPorta aplica exatamente uma vez (pelo inverso)',d.folegoPorta===1);
ok('pegarMal aplica exatamente uma vez',d.pegarMal===1);

console.log('\n5. UM SEGUNDO EMBRULHO É RECUSADO');
d=await p.evaluate(()=>{
  /* dia alto e mortos na conta pra escassez não ser 0 — comparar 0===0
     não prova nada */
  S.dia=18; S.mortos=[{n:'a'},{n:'b'}];
  const antes=escassez();
  const aceitou=embrulharUmaVez('escassez',()=>{
    const _e=escassez; escassez=function(){return _e()*dif();};
    return true;
  });
  const depois=escassez();
  return {aceitou, antes:+antes.toFixed(4), depois:+depois.toFixed(4)};
});
console.log('   ',JSON.stringify(d));
ok('embrulhar de novo é recusado',d.aceitou===false);
ok('e o valor não muda',d.antes===d.depois);

console.log('\n6. O EFEITO É REAL NO JOGO');
d=await p.evaluate(()=>{
  const medir=dia=>{
    S.dia=dia;
    S.ruido=60; S.porta={...S.porta,dano:100,reforco:0,tranca:false};
    S.diesel=10; S.mortos=[]; S.abrigo=[];
    return {mult:+dif().toFixed(3), risco:+riscoInvasao().toFixed(4),
      escassez:+escassez().toFixed(4), folego:folegoPorta(), fome:gastoComida()};
  };
  return {dia1:medir(1), dia20:medir(20)};
});
console.log('   dia  1:',JSON.stringify(d.dia1));
console.log('   dia 20:',JSON.stringify(d.dia20));
ok('o multiplicador vai de 0.60 a 0.80',d.dia1.mult===0.6&&d.dia20.mult===0.8);
ok('o risco de invasão sobe com os dias',d.dia20.risco>d.dia1.risco);
ok('o fôlego é maior quando está mais fácil (inverso)',d.dia1.folego>=d.dia20.folego);
ok('a fome nunca zera',d.dia1.fome>=1&&d.dia20.fome>=1);

console.log('\n7. SAVE ANTIGO ENTRA NA CURVA NO DIA CERTO');
d=await p.evaluate(()=>{
  S.dia=7; salvarAgora();
  const disco=JSON.parse(localStorage.getItem(CHAVE)||'{}');
  return {diaNoDisco:disco.dia, multDoDia7:+dificuldadeNoDia(7).toFixed(4),
    guardaMultiplicador:'dif' in disco||'dificuldade' in disco};
});
console.log('   ',JSON.stringify(d));
ok('o save guarda o dia, não o multiplicador',d.diaNoDisco===7&&!d.guardaMultiplicador);
ok('e o dia 7 cai no ponto certo da curva',d.multDoDia7>0.6&&d.multDoDia7<0.8);

console.log('\n8. O ATALHO DE DEBUG');
d=await p.evaluate(()=>{
  const v=difDia(20);
  return {v, dia:S.dia, tabela:difTabela(3),
    naTela:/debug\] dia 20/.test(document.getElementById('texto').textContent)};
});
console.log('   ',JSON.stringify(d));
ok('difDia(20) pula pro dia 20 e devolve 0.80',d.v===0.8&&d.dia===20);
ok('e escreve na tela',d.naTela);
ok('difTabela devolve a curva',Array.isArray(d.tabela)&&d.tabela.length===3);

console.log('\nerros de página:',erros.filter(e=>!/ERR_|file:/.test(e)).length?erros:'(nenhum)');
await b.close();
