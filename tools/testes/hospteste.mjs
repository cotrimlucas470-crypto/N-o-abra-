/* §58 — o Hóspede.

   O segundo invasor genuinamente novo, e o mais estranho: ele NÃO ATACA.
   Todas as sete criaturas do jogo — inclusive o Observador — são
   encontros que começam e acabam dentro de uma noite. O Hóspede é a
   primeira ameaça que é ESTADO DA CASA: escolhe um cômodo e, a cada dia
   que ninguém mexe, avança de fase e o cômodo vai deixando de ser seu.

   O que este harness cobra, além das fases:
   · que ele NUNCA tira vida — é a identidade dele e é regra do briefing;
   · que o contra-jogo existe desde o primeiro dia e fica mais caro, sem
     nunca chegar a um estado sem saída;
   · e que os efeitos dele são REAIS, e não parâmetro morto: a primeira
     versão tinha `hospPesoAnomalia` e `hospEstraga` que ninguém chamava. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Hosp'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=5; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);
await p.evaluate(()=>{ window.__zerar=()=>{ S.hospede=null; S.dia=6; S.vida=100; }; });

console.log('\n1. ELE SE INSTALA NUM CÔMODO QUE IMPORTA');
{
  const d=await p.evaluate(()=>{
    const escolhas={};
    for(let k=0;k<60;k++){
      __zerar(); S.saveId='hosp'+k; delete S.rngEstado; semearRNG();
      const h=hospChegar();
      escolhas[h.comodo]=(escolhas[h.comodo]||0)+1;
    }
    __zerar();
    return {escolhas, nomes:Object.keys(escolhas).map(c=>PLANTA[c].nome),
      sala:escolhas[4]||0, estreia:hospedeEstado().cfg.estreia};
  });
  console.log('    em 60 chegadas ele escolheu: '+d.nomes.join(', '));
  console.log('    vezes que escolheu a SALA (cômodo sem função guardada): '+d.sala);
  ok('ele escolhe cômodo com função',  d.sala===0&&d.nomes.length>=3);
  ok('e tem dia de estreia',           d.estreia>=1);
}

console.log('\n2. AS QUATRO FASES, E CADA UMA AVISA');
{
  const d=await p.evaluate(()=>{
    __zerar(); limpar();
    hospChegar(2);
    const linha=[hospedeEstado().fase];
    const avisos=[];
    for(let dia=0;dia<14;dia++){
      S.dia=(S.dia|0)+1;
      const f=hospPassarDia();
      if(f){ linha.push(f);
        avisos.push(Array.from(T.querySelectorAll('p:not(.passado)')).slice(-1)[0].textContent); }
    }
    return {linha, avisos, fases:hospedeEstado().fases,
      diasPorFase:hospedeEstado().cfg.diasPorFase};
  });
  console.log('    ele passou por: '+d.linha.join(' → ')+' (uma fase a cada '+d.diasPorFase+' dias)');
  d.avisos.forEach(a=>console.log('      · "'+a+'"'));
  ok('ele percorre as quatro fases',  d.linha.join()===d.fases.join());
  ok('e cada avanço é anunciado',     d.avisos.length===3);
  ok('nenhum aviso repete',           new Set(d.avisos).size===d.avisos.length);
}

console.log('\n3. ELE NUNCA TIRA VIDA — É A IDENTIDADE DELE');
{
  const d=await p.evaluate(()=>{
    __zerar(); S.vida=100;
    hospChegar(2);
    const vidas=[];
    /* leva ele até a última fase e deixa vinte noites correrem */
    for(let dia=0;dia<40;dia++){
      S.dia=(S.dia|0)+1;
      hospPassarDia();
      /* e visita o cômodo dele todo dia */
      try{ cena.casa=cena.casa||{}; cena.casa.voce=2; }catch(e){}
      vidas.push(S.vida);
    }
    return {faseFinal:hospedeEstado().fase, vidaInicial:100,
      vidaFinal:S.vida, menorVida:Math.min(...vidas),
      moral:Math.round(moralMedia())};
  });
  console.log('    depois de 40 dias na fase "'+d.faseFinal+'": vida '
    +d.vidaInicial+' → '+d.vidaFinal+' (mínima '+d.menorVida+')');
  console.log('    a moral da casa, essa sim, caiu: '+d.moral);
  ok('ele chega à última fase',     d.faseFinal==='DA_CASA');
  ok('e NUNCA tirou vida',          d.vidaFinal===100&&d.menorVida===100);
}

console.log('\n4. OS EFEITOS SÃO REAIS, NÃO PARÂMETRO MORTO');
{
  const d=await p.evaluate(()=>{
    /* a comida estraga mais no cômodo dele: mede com e sem */
    const medir=(comHospede)=>{
      __zerar();
      if(comHospede){ hospChegar(2); hospedeEstado(); 
        S.hospede.fase='ENRAIZADO'; }
      cena.casa=cena.casa||{}; cena.casa.voce=2;
      S.saveId='comida'; delete S.rngEstado; semearRNG();
      let ruim=0, total=0;
      for(let k=0;k<400;k++){ const r=acharComida(3,1); ruim+=r.ruim; total+=r.boa+r.ruim; }
      return +(ruim/total*100).toFixed(1);
    };
    const sem=medir(false), com=medir(true);
    /* e o peso de anomalia sobe com a fase */
    __zerar(); hospChegar(2);
    const pesos={};
    ['CHEGOU','INSTALADO','ENRAIZADO','DA_CASA'].forEach(f=>{
      S.hospede.fase=f; pesos[f]=hospPesoAnomalia(2);
    });
    const noOutro=hospPesoAnomalia(5);
    return {sem, com, pesos, noOutro, estraga:hospEstraga(2), naSala:hospEstraga(4)};
  });
  console.log('    comida estragada no cômodo: sem ele '+d.sem+'% · com ele '+d.com+'%');
  console.log('    peso de anomalia por fase: '+JSON.stringify(d.pesos)+' · noutro cômodo: '+d.noOutro);
  ok('a comida estraga mais no cômodo dele', d.com>d.sem);
  ok('o peso de anomalia cresce com a fase',
     d.pesos.CHEGOU===0&&d.pesos.INSTALADO>0&&d.pesos.ENRAIZADO>d.pesos.INSTALADO
     &&d.pesos.DA_CASA>d.pesos.ENRAIZADO);
  ok('e não vaza pros outros cômodos',       d.noOutro===0&&d.naSala===false);
}

console.log('\n5. DÁ PRA TIRAR ELE — DESDE O PRIMEIRO DIA, E FICA MAIS CARO');
{
  const d=await p.evaluate(()=>{
    const porFase={};
    ['CHEGOU','INSTALADO','ENRAIZADO','DA_CASA'].forEach(f=>{
      __zerar(); hospChegar(2); S.hospede.fase=f;
      const e=hospedeEstado();
      /* 400 tentativas pra medir a chance de verdade */
      let venceu=0;
      for(let k=0;k<400;k++){
        __zerar(); hospChegar(2); S.hospede.fase=f;
        S.saveId='tirar'+f+k; delete S.rngEstado; semearRNG();
        if(hospTirar().ok)venceu++;
      }
      porFase[f]={horas:e.custoHoras, chance:e.chanceTirar,
        medido:+(venceu/400).toFixed(2)};
    });
    /* falhar não pode piorar a fase */
    __zerar(); hospChegar(2); S.hospede.fase='INSTALADO';
    let tentou=0;
    for(let k=0;k<40;k++){ hospTirar(); tentou++; if(!hospede())break; }
    const faseDepois=hospede()?hospede().fase:'(saiu)';
    return {porFase, faseDepois, tentou};
  });
  Object.keys(d.porFase).forEach(f=>console.log('    '+f.padEnd(11)
    +d.porFase[f].horas+'h · chance declarada '+d.porFase[f].chance
    +' · medida '+d.porFase[f].medido));
  console.log('    depois de tentar e falhar várias vezes, a fase ficou: '+d.faseDepois);
  const v=Object.values(d.porFase);
  ok('dá pra tentar em toda fase',        v.every(x=>x.chance>0));
  ok('e a chance medida bate com a declarada',
     v.every(x=>Math.abs(x.medido-x.chance)<.08));
  ok('fica mais caro conforme ele enraíza',
     v[0].horas<v[3].horas&&v[0].chance>v[3].chance);
  ok('e nunca fica sem saída',            v[3].chance>0);
  ok('falhar não piora a fase',           d.faseDepois==='INSTALADO'||d.faseDepois==='(saiu)');
}

console.log('\n6. O BOTÃO EXISTE ONDE O PROBLEMA ESTÁ');
{
  const d=await p.evaluate(()=>{
    __zerar(); hospChegar(2); S.hospede.fase='ENRAIZADO';
    S.hora=10;
    menuComodo(2);
    const noDele=Array.from(AC.querySelectorAll('button'))
      .filter(x=>/Limpar o que se instalou/.test(x.textContent));
    menuComodo(5);
    const noOutro=Array.from(AC.querySelectorAll('button'))
      .filter(x=>/Limpar o que se instalou/.test(x.textContent));
    return {noDele:noDele.length, texto:noDele[0]?noDele[0].textContent:'',
      noOutro:noOutro.length};
  });
  console.log('    no cômodo dele: '+d.noDele+' botão · "'+d.texto.replace(/\s+/g,' ')+'"');
  console.log('    em outro cômodo: '+d.noOutro);
  ok('o botão aparece no cômodo dele',  d.noDele===1);
  ok('e só lá',                         d.noOutro===0);
  ok('e o custo está escrito nele',     /h ·/.test(d.texto));
}

console.log('\n7. ELE É A PRESENÇA DO LUGAR (§53), E VAI PRO SAVE');
{
  const d=await p.evaluate(()=>{
    __zerar();
    S.sanidade=100; S.lanterna=true; S.hora=12;
    try{ const C=cerco(); C.ativo=false; C.dentro=[]; }catch(e){}
    try{ costEstado().desfeitos.length=0; }catch(e){}
    const antes=vigiaLer(2).fonte;
    hospChegar(2); S.hospede.fase='INSTALADO';
    const dep=vigiaLer(2), outro=vigiaLer(5);
    S.nomeJogador=S.nomeJogador||'Hosp';
    salvar();
    let o={}; try{ o=JSON.parse(localStorage.getItem(CHAVE)||'{}'); }catch(e){}
    const gravou=!!(o.hospede&&o.hospede.comodo===2);
    /* e sai do save quando ele sai */
    S.hospede=null; salvar();
    let o2={}; try{ o2=JSON.parse(localStorage.getItem(CHAVE)||'{}'); }catch(e){}
    return {antes, fonte:dep.fonte, quem:dep.quem, outro:outro.fonte,
      gravou, sumiu:!o2.hospede};
  });
  console.log('    presença no cômodo antes dele: '+d.antes+' · depois: '+d.fonte
    +' ("'+d.quem+'") · noutro cômodo: '+d.outro);
  console.log('    no save: '+d.gravou+' · sai do save quando ele sai: '+d.sumiu);
  ok('sem ele, nada',              d.antes===null);
  ok('com ele, a presença é LUGAR', d.fonte==='LUGAR'&&d.quem==='hospede');
  ok('e é só do cômodo dele',       d.outro!=='LUGAR');
  ok('ele vai pro save',            d.gravou);
  ok('e sai dele quando some',      d.sumiu);
}

console.log('\n8. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
