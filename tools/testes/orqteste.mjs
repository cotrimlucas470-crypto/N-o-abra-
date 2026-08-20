/* FASE 2 — orquestrador de tensão: orçamento, cooldowns, coexistência,
   prioridade, fila de adiados, vales de silêncio, e o critério de
   aceite das 10.000 noites. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('file:///home/user/N-o-abra-/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','N'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);

console.log('\n1. O ORÇAMENTO É TETO, NÃO SUGESTÃO');
let d=await p.evaluate(()=>{
  S.dia=1; S.anomAtivasLista=[]; semearRNG();
  const O=orqNovaNoite(true);
  const ids=Object.keys(CATALOGO_ANOM);
  /* deixa cooldown e vale fora do caminho: aqui só se testa orçamento */
  let gasto=0, concedidos=0, estourou=false;
  for(let i=0;i<400;i++){
    O.cooldownGlobal=0; CATEGORIAS.forEach(c=>O.cooldownCategoria[c]=0);
    O.vales=[]; S.anomAtivasLista=[];
    const id=ids[i%ids.length];
    const r=pedirPermissao(id);
    if(r.ok){concedidos++; gasto+=r.peso;}
    if(O.gasto>O.orcamentoNoite)estourou=true;
  }
  return {orcamento:O.orcamentoNoite, gasto:O.gasto, somaPesos:gasto,
    concedidos, estourou, crescePorDia:(()=>{
      const g=S.dia; S.dia=1; const a=orqNovaNoite(true).orcamentoNoite;
      S.dia=12; const c=orqNovaNoite(true).orcamentoNoite;
      S.dia=400; const e=orqNovaNoite(true).orcamentoNoite;
      S.dia=g; return {d1:a,d12:c,d400:e};
    })()};
});
console.log('   ',JSON.stringify(d));
ok('o gasto nunca passa do orçamento da noite',!d.estourou&&d.gasto<=d.orcamento);
ok('o gasto contabilizado bate com a soma dos pesos concedidos',d.gasto===d.somaPesos);
ok('400 pedidos não viram 400 concessões',d.concedidos<400&&d.concedidos>0);
ok('o orçamento cresce com o dia e para no teto',
  d.crescePorDia.d12>d.crescePorDia.d1&&d.crescePorDia.d400===160);

console.log('\n2. COOLDOWNS BLOQUEIAM DE VERDADE');
d=await p.evaluate(()=>{
  S.dia=8; S.anomAtivasLista=[]; semearRNG();
  const O=orqNovaNoite(true); O.vales=[];
  const sonora=Object.keys(CATALOGO_ANOM).filter(i=>CATALOGO_ANOM[i].categoria==='sonora');
  const fisica=Object.keys(CATALOGO_ANOM).filter(i=>CATALOGO_ANOM[i].categoria==='fisica');
  const a=pedirPermissao(sonora[0]);
  S.anomAtivasLista=[];
  /* imediatamente depois: cooldown global barra qualquer coisa */
  const logoDepois=pedirPermissao(fisica[0]);
  /* passado o global, a mesma categoria ainda está em cooldown */
  for(let i=0;i<ORQ_CFG.cooldownGlobal;i++)orqTurno();
  const outraCat=pedirPermissao(fisica[0]);
  S.anomAtivasLista=[];
  /* a concessão acima rearmou o global; zerar SÓ ele isola a categoria,
     que é o que esta linha quer medir */
  O.cooldownGlobal=0;
  const mesmaCat=pedirPermissao(sonora[1]||sonora[0]);
  /* e depois do cooldown de categoria inteiro, libera */
  for(let i=0;i<ORQ_CFG.cooldownCategoria+2;i++)orqTurno();
  S.anomAtivasLista=[];
  const depois=pedirPermissao(sonora[1]||sonora[0]);
  return {sonoras:sonora.length, a:a.ok,
    logoDepois:logoDepois.porque, outraCat:outraCat.ok,
    mesmaCat:mesmaCat.porque, depois:depois.ok,
    cdGlobal:ORQ_CFG.cooldownGlobal, cdCat:ORQ_CFG.cooldownCategoria};
});
console.log('   ',JSON.stringify(d));
ok('o primeiro pedido da noite passa',d.a);
ok('o seguinte imediato cai no cooldown global',d.logoDepois==='cooldown global');
ok('passado o global, outra categoria passa',d.outraCat);
ok('a mesma categoria ainda está barrada',/cooldown de sonora/.test(d.mesmaCat));
ok('vencido o cooldown de categoria, ela volta',d.depois);

console.log('\n3. COEXISTÊNCIA É MATRIZ, NÃO COMENTÁRIO');
d=await p.evaluate(()=>{
  const R=id=>CATALOGO_ANOM[id];
  const bichos=Object.keys(CATALOGO_ANOM).filter(i=>i.indexOf('bicho_')===0);
  const cog=Object.keys(CATALOGO_ANOM).filter(i=>R(i).categoria==='cognitiva');
  const avs=Object.keys(CATALOGO_ANOM).filter(i=>i.indexOf('avaria_')===0);
  /* simetria: se A recusa B, B recusa A — em todos os pares do catálogo */
  const ids=Object.keys(CATALOGO_ANOM); let assimetrico=0, pares=0;
  for(const x of ids)for(const y of ids){ if(x===y)continue; pares++;
    if(podeCoexistir(R(x),R(y))!==podeCoexistir(R(y),R(x)))assimetrico++; }
  /* na prática: com uma criatura no ar, outra é negada */
  S.dia=9; S.anomAtivasLista=[]; semearRNG();
  const O=orqNovaNoite(true); O.vales=[];
  const um=pedirPermissao(bichos[0]);
  O.cooldownGlobal=0; CATEGORIAS.forEach(c=>O.cooldownCategoria[c]=0);
  const dois=pedirPermissao(bichos[1]);
  return {pares, assimetrico,
    consigoMesmo:podeCoexistir(R(ids[0]),R(ids[0])),
    duasCognitivas:cog.length>=2?podeCoexistir(R(cog[0]),R(cog[1])):null,
    duasCriaturas:podeCoexistir(R(bichos[0]),R(bichos[1])),
    avariaComAvaria:podeCoexistir(R(avs[0]),R(avs[1])),
    nulo:podeCoexistir(null,R(ids[0])),
    um:um.ok, dois:dois.ok, porque:dois.porque};
});
console.log('   ',JSON.stringify(d));
ok('a matriz é simétrica nos '+d.pares+' pares',d.assimetrico===0);
ok('nada coexiste consigo mesmo',d.consigoMesmo===false);
ok('duas cognitivas nunca juntas',d.duasCognitivas===false);
ok('duas criaturas diferentes nunca juntas',d.duasCriaturas===false);
ok('duas avarias podem coexistir',d.avariaComAvaria===true);
ok('a matriz barra a segunda criatura na prática',d.um&&!d.dois&&/incompat/.test(d.porque));

console.log('\n4. PRIORIDADE E PREEMPÇÃO');
d=await p.evaluate(()=>{
  const cls={};
  Object.keys(CATALOGO_ANOM).forEach(i=>{cls[i]=classeDe(CATALOGO_ANOM[i]);});
  const prim=Object.keys(cls).find(i=>cls[i]==='primordial');
  const criat=Object.keys(cls).find(i=>cls[i]==='criatura');
  const baixo=Object.keys(cls).find(i=>cls[i]==='ambiental');
  const outroBaixo=Object.keys(cls).find(i=>i!==baixo&&cls[i]===cls[baixo]);
  const contagem={};
  Object.keys(cls).forEach(i=>{contagem[cls[i]]=(contagem[cls[i]]||0)+1;});
  /* enche o orçamento com coisa de classe baixa e pede o primordial */
  S.dia=14; S.anomAtivasLista=[]; semearRNG();
  const O=orqNovaNoite(true); O.vales=[];
  O.gasto=O.orcamentoNoite-1;             /* não cabe mais nada */
  S.anomAtivasLista=[baixo];
  O.cooldownGlobal=0; CATEGORIAS.forEach(c=>O.cooldownCategoria[c]=0);
  const semPreempcao=(()=>{               /* um de classe igual não preempta */
    const g=O.gasto;
    const r=pedirPermissao(outroBaixo);
    O.gasto=g; return r;
  })();
  S.anomAtivasLista=[baixo];
  O.cooldownGlobal=0; CATEGORIAS.forEach(c=>O.cooldownCategoria[c]=0);
  const comPreempcao=pedirPermissao(prim||criat);
  return {classes:cls, prim, criat, baixo, outroBaixo, contagem,
    ordem:ORQ_CFG.prioridade,
    semPreempcao:semPreempcao.ok, semPorque:semPreempcao.porque,
    comPreempcao:comPreempcao.ok,
    baixoSaiu:!(S.anomAtivasLista||[]).includes(baixo),
    delta:ORQ_CFG.deltaPreempcao};
});
console.log('   ',JSON.stringify({prim:d.prim,criat:d.criat,baixo:d.baixo,
  outroBaixo:d.outroBaixo,contagem:d.contagem,
  semPreempcao:d.semPreempcao,semPorque:d.semPorque,comPreempcao:d.comPreempcao,
  baixoSaiu:d.baixoSaiu}));
ok('nenhuma faixa de prioridade está vazia',
  Object.keys(d.ordem).every(k=>d.contagem[k]>0));
ok('a ordem é primordial > criatura > persistente > comum > ambiental',
  d.ordem.primordial>d.ordem.criatura&&d.ordem.criatura>d.ordem.persistente
  &&d.ordem.persistente>d.ordem.comum&&d.ordem.comum>d.ordem.ambiental);
ok('sem orçamento, classe igual NÃO preempta',!d.semPreempcao&&/orçamento/.test(d.semPorque));
ok('sem orçamento, prioridade alta preempta',d.comPreempcao);
ok('o preemptado sai do ar',d.baixoSaiu);

console.log('\n5. FILA DE ADIADOS — NADA SE PERDE, NADA SE EMPILHA');
d=await p.evaluate(()=>{
  S.dia=6; S.anomAtivasLista=[]; semearRNG();
  const O=orqNovaNoite(true);
  const alvo=Object.keys(CATALOGO_ANOM)[0];
  const pesoLimpo=(()=>{O.filaAdiada=[];O.ultimosEventos=[];return pesoDeEscolha(alvo);})();
  const bonus=[];
  for(let i=0;i<12;i++){
    orqNega(alvo,'teste');
    const f=O.filaAdiada.find(x=>x.id===alvo);
    bonus.push(+f.bonus.toFixed(3));
  }
  const pesoAdiado=pesoDeEscolha(alvo);
  const entradas=O.filaAdiada.filter(x=>x.id===alvo).length;
  /* negar 60 ids diferentes não faz a fila crescer sem fim */
  Object.keys(CATALOGO_ANOM).forEach(i=>{orqNega(i,'teste');orqNega(i,'teste');});
  const tamanho=O.filaAdiada.length;
  /* concedido: sai da fila */
  O.vales=[]; O.gasto=0; O.cooldownGlobal=0;
  CATEGORIAS.forEach(c=>O.cooldownCategoria[c]=0);
  S.anomAtivasLista=[];
  const r=pedirPermissao(alvo);
  const aindaNaFila=O.filaAdiada.some(x=>x.id===alvo);
  /* repetição encarece */
  const pesoRepetido=pesoDeEscolha(alvo);
  /* id fora do catálogo não entra na fila */
  const antes=O.filaAdiada.length; orqNega('nao_existe','teste');
  return {pesoLimpo, bonus, pesoAdiado, entradas, tamanho,
    concedeu:r.ok, aindaNaFila, pesoRepetido,
    filaSoCatalogo:O.filaAdiada.length===antes,
    teto:ORQ_CFG.bonusAdiadoTeto, penal:ORQ_CFG.penalRepeticao};
});
console.log('   ',JSON.stringify(d));
ok('cada negativa aumenta o bônus',d.bonus[0]<d.bonus[1]&&d.bonus[1]<d.bonus[2]);
ok('o bônus para no teto e não cresce pra sempre',
  d.bonus[d.bonus.length-1]===d.teto);
ok('adiado pesa mais na escolha que limpo',d.pesoAdiado>d.pesoLimpo);
ok('a fila guarda UMA entrada por id, não uma por negativa',d.entradas===1);
ok('a fila tem tamanho limitado',d.tamanho<=24);
ok('concedido sai da fila',d.concedeu&&!d.aindaNaFila);
ok('o que acabou de sair fica mais barato de novo? não: encarece',
  d.pesoRepetido<d.pesoLimpo);
ok('id fora do catálogo não entra na fila',d.filaSoCatalogo);

console.log('\n6. O SILÊNCIO É CONTEÚDO — VALES');
d=await p.evaluate(()=>{
  const amostras=[];
  for(let s=0;s<300;s++){
    S.dia=1+(s%20); S.rng=criarRNG(1000+s); S.anomAtivasLista=[];
    const O=orqNovaNoite(true);
    const dur=O.vales.map(v=>v.ate-v.de);
    amostras.push({n:O.vales.length, maior:Math.max(...dur),
      inicio:O.vales[0].de, cobre:dur.reduce((a,b)=>a+b,0),
      sobrepoe:O.vales.some((v,i)=>i>0&&v.de<O.vales[i-1].ate)});
  }
  /* dentro do vale nem prioridade máxima passa */
  S.dia=14; S.rng=criarRNG(7); S.anomAtivasLista=[];
  const O=orqNovaNoite(true);
  const prim=Object.keys(CATALOGO_ANOM).find(i=>classeDe(CATALOGO_ANOM[i])==='primordial')
    ||Object.keys(CATALOGO_ANOM).find(i=>classeDe(CATALOGO_ANOM[i])==='criatura');
  while(!emVale())orqTurno();
  O.cooldownGlobal=0; CATEGORIAS.forEach(c=>O.cooldownCategoria[c]=0); O.gasto=0;
  const dentro=pedirPermissao(prim);
  while(emVale())orqTurno();
  O.cooldownGlobal=0; CATEGORIAS.forEach(c=>O.cooldownCategoria[c]=0);
  const fora=pedirPermissao(prim);
  /* fora de invasão (turno 0) não existe vale: a casa pode estragar de dia */
  const O2=orqNovaNoite(true);
  const turnoZero=emVale();
  /* os vales já existem antes de qualquer permissão ser pedida */
  const valesAntes=O2.vales.length>0&&O2.concedidos===0&&O2.gasto===0;
  return {min:Math.min(...amostras.map(a=>a.n)),
    menorMaiorVale:Math.min(...amostras.map(a=>a.maior)),
    inicioMin:Math.min(...amostras.map(a=>a.inicio)),
    coberturaMax:Math.max(...amostras.map(a=>a.cobre)),
    sobreposicao:amostras.filter(a=>a.sobrepoe).length,
    dentro:dentro.ok, porque:dentro.porque, fora:fora.ok,
    turnoZero, valesAntes, cfgMin:ORQ_CFG.valeDuracao[0]};
});
console.log('   ',JSON.stringify(d));
ok('toda noite tem pelo menos um vale',d.min>=1);
ok('o vale mais curto ainda é longo (>= '+d.cfgMin+' turnos)',d.menorMaiorVale>=d.cfgMin);
ok('a noite não abre em silêncio',d.inicioMin>=3);
ok('os vales nunca se sobrepõem',d.sobreposicao===0);
ok('os vales não engolem a noite inteira',d.coberturaMax<24);
ok('dentro do vale nem prioridade máxima passa',!d.dentro&&/vale/.test(d.porque));
ok('fora do vale o mesmo pedido passa',d.fora);
ok('fora de invasão não há vale',d.turnoZero===false);
ok('os vales são agendados ANTES de qualquer permissão',d.valesAntes);

console.log('\n7. CRITÉRIO DE ACEITE — 10.000 NOITES SIMULADAS');
p.on('console',m=>{const t=m.text(); if(t.indexOf('[orq]')===0||/eventos \|/.test(t))console.log('    '+t);});
d=await p.evaluate(()=>{
  const r=orqHistograma(10000,20260820);
  return r;
});
ok('nenhuma noite com zero eventos',d.zeradas===0);
ok('nenhuma noite acima do orçamento',d.estouros===0);
ok('toda noite tem vale',d.comVale===d.noites);
ok('a média cai dentro da faixa alvo '+d.faixaAlvo.join('–'),d.dentroDaFaixa);
ok('a densidade não é sempre a mesma (p50 != min != max)',d.min<d.p50&&d.p50<d.max);

console.log('\n8. DETERMINISMO — MESMA SEMENTE, MESMA NOITE');
d=await p.evaluate(()=>{
  const a=orqSimular(600,4242), c=orqSimular(600,4242), e=orqSimular(600,99);
  const va=(()=>{S.rng=criarRNG(555);S.dia=5;return orqNovaNoite(true).vales;})();
  const vb=(()=>{S.rng=criarRNG(555);S.dia=5;return orqNovaNoite(true).vales;})();
  return {iguais:JSON.stringify(a.hist)===JSON.stringify(c.hist),
    diferentes:JSON.stringify(a.hist)!==JSON.stringify(e.hist),
    valesIguais:JSON.stringify(va)===JSON.stringify(vb),
    mediaA:a.media, mediaE:e.media};
});
console.log('   ',JSON.stringify(d));
ok('mesma semente dá o mesmo histograma',d.iguais);
ok('semente diferente dá histograma diferente',d.diferentes);
ok('os vales da noite são reprodutíveis',d.valesIguais);

console.log('\n9. ZERO NOITE MORTA É CONSTRUÇÃO, NÃO SORTE');
d=await p.evaluate(()=>{
  /* no turno 1 de uma noite nova não há cooldown, não há vale e o
     orçamento está inteiro: o primeiro candidato elegível SEMPRE passa */
  let falhas=0, semCandidato=0;
  for(let s=0;s<500;s++){
    S.dia=2+(s%25); S.rng=criarRNG(9000+s); S.anomAtivasLista=[];
    orqNovaNoite(true);
    orqTurno();
    const id=orqTentar(Object.keys(CATALOGO_ANOM));
    if(!id){
      const algum=Object.keys(CATALOGO_ANOM).some(i=>pesoDeEscolha(i)>0);
      if(algum)falhas++; else semCandidato++;
    }
  }
  return {falhas, semCandidato, valePrimeiro:ORQ_CFG.valePrimeiroTurno};
});
console.log('   ',JSON.stringify(d));
ok('o turno 1 nunca é bloqueado quando há candidato',d.falhas===0);
ok('o primeiro vale começa depois do turno 1',d.valePrimeiro>1);

console.log('\n10. O ESTADO É DADO PURO E SOBREVIVE AO SAVE');
d=await p.evaluate(()=>{
  S.dia=7; S.anomAtivasLista=['avaria_calha']; semearRNG();
  const O=orqNovaNoite(true); orqTurno(); orqTurno();
  O.vales=[]; S.anomAtivasLista=[];
  pedirPermissao(Object.keys(CATALOGO_ANOM)[0]);
  salvarAgora();
  const disco=JSON.parse(localStorage.getItem(CHAVE)||'{}');
  const txt=JSON.stringify(disco.orquestrador);
  return {salvou:!!disco.orquestrador,
    ativas:Array.isArray(disco.anomAtivasLista),
    semFuncao:txt.indexOf('function')<0,
    igual:JSON.stringify(disco.orquestrador)===JSON.stringify(S.orquestrador),
    ciclo:(()=>{ const v=JSON.parse(JSON.stringify(S.orquestrador));
      return JSON.stringify(v)===JSON.stringify(S.orquestrador); })(),
    campos:Object.keys(disco.orquestrador||{}).sort()};
});
console.log('   ',JSON.stringify(d));
ok('o orquestrador vai pro save',d.salvou&&d.ativas);
ok('nenhuma função no estado serializado',d.semFuncao);
ok('o que foi salvo é o que está na memória',d.igual);
ok('o estado sobrevive a JSON ida e volta sem perder nada',d.ciclo);

console.log('\n11. SAVE LEGADO — SEM ORQUESTRADOR NENHUM');
d=await p.evaluate(()=>{
  const guarda=localStorage.getItem(CHAVE);
  const velho=JSON.parse(guarda||'{}');
  delete velho.orquestrador; delete velho.anomAtivasLista;
  velho.avarias=[{id:'calha',dias:2,etapa:0,vista:true,motivo:null,grave:false}];
  localStorage.setItem(CHAVE,JSON.stringify(velho));
  delete S.orquestrador; S.anomAtivasLista=undefined;
  let erro=null;
  try{ carregar(); }catch(e){ erro=e.message; }
  const O=orq();
  const reconciliou=(S.anomAtivasLista||[]).includes('avaria_calha');
  localStorage.setItem(CHAVE,guarda);
  return {erro, criou:!!O&&O.orcamentoNoite>0, vales:O.vales.length, reconciliou};
});
console.log('   ',JSON.stringify(d));
ok('save sem orquestrador carrega sem erro',d.erro===null);
ok('e ganha um orquestrador na hora',d.criou&&d.vales>0);
ok('as avarias do save legado entram na lista do que está no ar',d.reconciliou);

console.log('\n12. A AUTORIDADE É REAL — NINGUÉM FURA A FILA');
d=await p.evaluate(()=>{
  /* avaria espontânea negada NÃO nasce */
  S.dia=5; S.avarias=[]; S.anomAtivasLista=[]; semearRNG();
  const O=orqNovaNoite(true);
  O.gasto=O.orcamentoNoite;               /* sem orçamento pra nada */
  const antes=avarias().length;
  let nasceu=0;
  for(let i=0;i<60;i++){ if(talvezNovaAvaria())nasceu++; }
  const negadoNaoNasce=(avarias().length===antes);
  /* com orçamento, nasce e entra na lista do que está no ar */
  S.avarias=[]; S.anomAtivasLista=[]; orqNovaNoite(true);
  let a=null;
  for(let i=0;i<400&&!a;i++){
    const O2=orq(); O2.cooldownGlobal=0;
    CATEGORIAS.forEach(c=>O2.cooldownCategoria[c]=0);
    a=talvezNovaAvaria();
  }
  const entrouNaLista=a?(S.anomAtivasLista||[]).includes('avaria_'+a.id):null;
  /* consertar tira da lista */
  let saiuDaLista=null;
  if(a){ fecharAvaria(a.id); saiuDaLista=!(S.anomAtivasLista||[]).includes('avaria_'+a.id); }
  /* a avaria da cadeia (piorou) não pede permissão: consequência é ganha */
  S.avarias=[]; S.anomAtivasLista=[]; const O3=orq();
  O3.gasto=O3.orcamentoNoite;
  const cadeia=abrirAvaria('curto','piorou');
  /* riscoInvasao é zerado enquanto o checarInvasao original decide */
  const riscoNormal=riscoInvasao()>0;
  return {negadoNaoNasce, nasceu, nasceuAlgo:!!a, entrouNaLista, saiuDaLista,
    cadeiaNasce:!!cadeia, riscoNormal};
});
console.log('   ',JSON.stringify(d));
ok('avaria negada por orçamento não nasce',d.negadoNaoNasce&&d.nasceu===0);
ok('avaria concedida nasce e entra no ar',d.nasceuAlgo&&d.entrouNaLista);
ok('avaria reparada sai do ar',d.saiuDaLista);
ok('avaria de cadeia não pede permissão — consequência é ganha',d.cadeiaNasce);
ok('fora da janela, riscoInvasao volta ao normal',d.riscoNormal);

console.log('\n13. NADA QUEBROU');
console.log('    erros de página:',erros.length?erros.slice(0,6):'nenhum');
ok('nenhum erro de página',erros.length===0);
await b.close();
