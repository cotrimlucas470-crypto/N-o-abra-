/* §34 — o ouvido na porta, e §33 dia 30. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,130)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','N'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. O DEFEITO QUE NÃO TINHA COMO SER REPORTADO');
let d=await p.evaluate(()=>{
  /* o original sorteava 3 das 4 camadas. Quantas vezes em 4000 o único
     defeito do mímico caía justamente na camada que ficou de fora? */
  let orfao=0;
  for(let i=0;i<4000;i++){
    const def=DEFEITOS_SOM[Math.floor(Math.random()*DEFEITOS_SOM.length)];
    const usadas=PERG_ESCUTA.slice().sort(()=>Math.random()-.5).slice(0,3);
    if(!usadas.some(u=>u.id===def.camada))orfao++;
  }
  return {orfao, pct:+(orfao/4000*100).toFixed(1), camadas:PERG_ESCUTA.length};
});
console.log('   ',JSON.stringify(d));
ok('o desenho antigo escondia a resposta em ~1 de cada 4 casos',d.pct>18&&d.pct<32);

console.log('\n2. AGORA AS QUATRO CAMADAS SEMPRE APARECEM');
d=await p.evaluate(()=>{
  const v={pessoa:{n:'X',id:1},mimico:true,turnos:0,sinais:[],escutou:false};
  const e=perfilEscuta(v);
  ouvEscolher(v,e,'vazio');
  const bts=[...document.querySelectorAll('#acoes button:not(.sec-cab)')]
    .map(b=>b.textContent.trim());
  return {bts, n:bts.length,
    todasCamadas:PERG_ESCUTA.every(q=>bts.some(t=>t.indexOf(q.q)===0)),
    temDeNovo:bts.some(t=>/Ouvir de novo/.test(t)),
    temRef:bts.some(t=>/Lembrar como é gente/.test(t)),
    temNada:bts.some(t=>/Não ouvi nada/.test(t))};
});
console.log('    botões:',JSON.stringify(d.bts));
ok('as 4 camadas estão todas na tela',d.todasCamadas);
ok('dá pra ouvir de novo',d.temDeNovo);
ok('e existe uma referência do que é gente',d.temRef);
ok('e ainda dá pra dizer que não ouviu nada',d.temNada);

console.log('\n3. O TRAÇO MOSTRA O QUE O SOM DIZ');
d=await p.evaluate(()=>{
  /* contar picos, não cruzamentos: é a medida que vale pra qualquer
     faixa da onda, e foi a que a primeira versão do teste errou. */
  const medir=perf=>{
    const dur=OUV_CFG.duracao, a=[];
    for(let t=0;t<dur;t+=0.02)a.push(ouvOnda(perf,t));
    let n=0;
    for(let i=1;i<a.length-1;i++)if(a[i]>a[i-1]&&a[i]>=a[i+1])n++;
    return n;
  };
  const normal=medir({rpm:16,variacao:.22,peso:.8,defeitos:[]});
  const rapida=medir({rpm:32,variacao:.05,peso:.8,defeitos:[{id:'rapida',camada:'resp'}]});
  const lenta =medir({rpm:6, variacao:.06,peso:.8,defeitos:[{id:'lenta',camada:'resp'}]});
  /* metrônomo: a variação é ZERO, e isso tem de aparecer na altura dos picos */
  const picos=perf=>{const a=[];for(let t=0;t<12;t+=0.02)a.push(ouvOnda(perf,t));
    const mx=[];for(let i=1;i<a.length-1;i++)if(a[i]>a[i-1]&&a[i]>=a[i+1])mx.push(a[i]);
    return mx.length?Math.max(...mx)-Math.min(...mx):0;};
  const varNormal=picos({rpm:16,variacao:.22,peso:.8,defeitos:[]});
  const varMetro =picos({rpm:16,variacao:0,peso:.8,defeitos:[{id:'metronomo',camada:'resp'}]});
  /* passo sem peso: a barra some */
  const comPeso=ouvPassos({rpm:16,variacao:.2,peso:.8,defeitos:[]},12);
  const semPeso=ouvPassos({rpm:16,variacao:.2,peso:.8,defeitos:[{id:'sempeso',camada:'passo'}]},12);
  /* corpo mudo: nenhum ponto */
  const comCorpo=ouvCorpo({rpm:16,defeitos:[]},12);
  const semCorpo=ouvCorpo({rpm:16,defeitos:[{id:'semcorpo',camada:'corpo'}]},12);
  return {normal,rapida,lenta,
    varNormal:+varNormal.toFixed(3), varMetro:+varMetro.toFixed(3),
    pesoNormal:comPeso[0].peso, pesoSem:semPeso[0].peso,
    corpoNormal:comCorpo.length, corpoSem:semCorpo.length};
});
console.log('   ',JSON.stringify(d));
ok('respiração rápida faz muito mais onda que a normal',d.rapida>d.normal*1.6);
ok('respiração lenta faz muito menos',d.lenta<d.normal*.6);
ok('metrônomo tem picos todos iguais; gente não',d.varMetro<0.01&&d.varNormal>0.05);
ok('passo sem peso vira barra de altura zero',d.pesoNormal>0&&d.pesoSem===0);
ok('corpo mudo não desenha ponto nenhum',d.corpoNormal>0&&d.corpoSem===0);

console.log('\n4. O TRAÇO É O MESMO DADO, NÃO UMA LEGENDA');
d=await p.evaluate(()=>{
  const v={pessoa:{n:'Y',id:7},mimico:true,turnos:0,sinais:[]};
  const e1=perfilEscuta(v);
  const a=[],bb=[];
  for(let t=0;t<12;t+=0.5){a.push(+ouvOnda(e1,t).toFixed(4));}
  const e2=perfilEscuta(v);              /* mesmo visitante, de novo */
  for(let t=0;t<12;t+=0.5){bb.push(+ouvOnda(e2,t).toFixed(4));}
  const outro=perfilEscuta({pessoa:{n:'Z',id:9},mimico:true,sinais:[]});
  const cc=[]; for(let t=0;t<12;t+=0.5)cc.push(+ouvOnda(outro,t).toFixed(4));
  return {igual:JSON.stringify(a)===JSON.stringify(bb),
    diferente:JSON.stringify(a)!==JSON.stringify(cc),
    dentroDaFaixa:a.every(x=>x>=-1.3&&x<=1.3)};
});
console.log('   ',JSON.stringify(d));
ok('o mesmo visitante desenha sempre o mesmo traço',d.igual);
ok('visitante diferente desenha traço diferente',d.diferente);
ok('a onda não sai da caixa',d.dentroDaFaixa);

console.log('\n5. O FINAL NO DIA 30');
d=await p.evaluate(()=>({...fimEstado()}));
console.log('   ',JSON.stringify({dia:d.diaDoFinal,jaViu:d.jaViu,linhas:d.linhas}));
ok('o final está marcado pro dia 30',d.diaDoFinal===30);
ok('e ainda não foi visto',d.jaViu===false);
d=await p.evaluate(async()=>{
  FIM_CFG.msPorLetra=1; FIM_CFG.msMinimo=12; FIM_CFG.pularApos=0.1;
  S.dia=30; S.viuFinal=false;
  const t0=Date.now();
  const pr=cenaDia();
  /* a cena so abre depois do "Um mês." e da pausa de 1,6 s — checar em
     900 ms media o intervalo errado */
  let abriu=false;
  for(let i=0;i<40&&!abriu;i++){
    await new Promise(r=>setTimeout(r,150));
    abriu=!!document.getElementById('cena-fim');
  }
  const bt=document.getElementById('fim-pular'); if(bt)bt.click();
  await pr;
  return {abriu, marcou:!!S.viuFinal, seg:+((Date.now()-t0)/1000).toFixed(1),
    noSave:(()=>{ salvar();
      return JSON.parse(localStorage.getItem(CHAVE)||'{}').viuFinal===true; })()};
});
console.log('   ',JSON.stringify(d));
ok('chegar no dia 30 dispara o final',d.abriu);
ok('e marca que já foi visto',d.marcou);
ok('a marca vai pro save, então não repete a cada abertura',d.noSave);
d=await p.evaluate(async()=>{
  S.dia=31;
  const pr=cenaDia();
  await new Promise(r=>setTimeout(r,800));
  const abriu=!!document.getElementById('cena-fim');
  const bt=document.getElementById('fim-pular'); if(bt)bt.click();
  try{ await pr; }catch(e){}
  return {abriu};
});
ok('e não dispara de novo no dia seguinte',d.abriu===false);

console.log('\n6. NADA QUEBROU');
console.log('    erros de página:',erros.length?erros.slice(0,4):'nenhum');
ok('nenhum erro de página',erros.length===0);
await b.close();
