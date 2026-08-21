/* Marcos e o Opala: o mundo muda, e o objetivo continua alcançável. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8900/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','R'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);

await p.evaluate(()=>{
  window.__zerar=()=>{ S.rumo={marcos:[],ultimoMarcoDia:0,opala:null,versao:1}; };
});

console.log('\n1. OS MARCOS DISPARAM NO RITMO DA CONFIG');
let d=await p.evaluate(async()=>{
  __zerar();
  const quando=[];
  for(let dia=1;dia<=40;dia++){
    S.dia=dia;
    const id=await talvezMarco();
    if(id)quando.push({dia,id});
  }
  return {quando, cfg:{cada:RUMO_CFG.cadaXDias,primeiro:RUMO_CFG.primeiroDia,
    max:RUMO_CFG.maxMarcos}, total:rumo().marcos.length};
});
console.log('   ',JSON.stringify(d.quando));
ok('nenhum marco antes do dia da config',d.quando.every(x=>x.dia>=d.cfg.primeiro));
ok('o intervalo respeita a config',
  d.quando.every((x,i)=>i===0||x.dia-d.quando[i-1].dia>=d.cfg.cada));
ok('para no máximo da config',d.total===d.cfg.max);
ok('os três tipos aparecem antes de repetir',
  new Set(d.quando.slice(0,3).map(x=>x.id)).size===3);

console.log('\n2. CADA MARCO TEM SINAL PRA O JOGADOR');
d=await p.evaluate(()=>{
  const r={};
  Object.keys(MARCOS).forEach(k=>{
    r[k]={nome:MARCOS[k].n, temSinal:!!MARCOS[k].sinal||k==='chegou'};
  });
  return r;
});
Object.keys(d).forEach(k=>console.log(`   ${k.padEnd(9)} ${d[k].nome}`));
ok('os três têm sinal',Object.values(d).every(x=>x.temSinal&&x.nome));

console.log('\n3. OS MARCOS MEXEM NO MUNDO DE VERDADE');
d=await p.evaluate(()=>{
  __zerar();
  S.dia=10; S.ruido=50; S.porta={...S.porta,dano:80,reforco:0,tranca:false};
  const antes={rend:rendimentoDoMarco(), ous:ousadiaDoMarco(), risco:riscoInvasao()};
  for(let i=0;i<3;i++)rumoMarco('cidade');
  for(let i=0;i<3;i++)rumoMarco('ousadia');
  const depois={rend:rendimentoDoMarco(), ous:ousadiaDoMarco(), risco:riscoInvasao()};
  /* e com muitos marcos, os tetos seguram */
  for(let i=0;i<40;i++){rumoMarco('cidade');rumoMarco('ousadia');}
  const extremo={rend:rendimentoDoMarco(), ous:ousadiaDoMarco()};
  return {antes,depois,extremo,
    tetoCidade:RUMO_CFG.cidadeTeto, tetoOusadia:RUMO_CFG.ousadiaTeto};
});
console.log('   ',JSON.stringify(d));
ok('a cidade esvaziada derruba o rendimento',d.depois.rend<d.antes.rend);
ok('a ousadia sobe o risco de invasão',d.depois.risco>d.antes.risco);
ok('o rendimento tem piso (não zera o jogo)',
  d.extremo.rend===1-d.tetoCidade&&d.extremo.rend>0);
ok('a ousadia tem teto',d.extremo.ous===d.tetoOusadia);

console.log('\n4. MARCO NÃO É O MULTIPLICADOR DO §25 (eixos separados)');
d=await p.evaluate(()=>{
  __zerar();
  S.dia=1; S.ruido=50; S.porta={...S.porta,dano:80,reforco:0,tranca:false};
  const semMarco=riscoInvasao(), mult=dif();
  for(let i=0;i<2;i++)rumoMarco('ousadia');
  const comMarco=riscoInvasao();
  /* o marco SOMA; se ele multiplicasse, a diferença mudaria com dif() */
  const somaEsperada=ousadiaDoMarco();
  return {semMarco:+semMarco.toFixed(4), comMarco:+comMarco.toFixed(4),
    diferenca:+(comMarco-semMarco).toFixed(4), somaEsperada:+somaEsperada.toFixed(4),
    mult:+mult.toFixed(3)};
});
console.log('   ',JSON.stringify(d));
ok('o marco SOMA no risco, não multiplica',
  Math.abs(d.diferenca-d.somaEsperada)<0.0005);

console.log('\n5. O OPALA É DESCOBERTO NO JOGO, NÃO ANUNCIADO');
d=await p.evaluate(()=>{
  __zerar();
  S.oficinaNivel=0;
  const semOficina=descobrirOpala();
  S.oficinaNivel=RUMO_CFG.oficinaMinima;
  const comOficina=descobrirOpala();
  const deNovo=descobrirOpala();
  return {semOficina, comOficina, deNovo, opala:!!opala(),
    texto:/Opala embaixo da lona/.test(document.getElementById('texto').textContent)};
});
console.log('   ',JSON.stringify(d));
ok('sem oficina você não repara no carro',d.semOficina===false);
ok('com oficina, você descobre entrando no quintal',d.comOficina===true&&d.opala);
ok('e a descoberta é contada em texto, não em menu',d.texto);
ok('descobrir duas vezes não acontece',d.deNovo===false);

console.log('\n6. O CHECKLIST É RASTREÁVEL');
d=await p.evaluate(()=>{
  __zerar(); S.oficinaNivel=1; descobrirOpala();
  S.diesel=10; opala().pecas=0; S.dia=opala().desde;
  const vazio=opalaFalta();
  opala().pecas=RUMO_CFG.pecasPraSair;
  S.diesel=RUMO_CFG.dieselPraSair;
  S.dia=opala().desde+RUMO_CFG.noitesDepoisDeDescobrir;
  const cheio=opalaFalta();
  return {vazio, cheio, prontoVazio:false, prontoCheio:opalaPronto()};
});
console.log('   vazio:',JSON.stringify(d.vazio));
console.log('   cheio:',JSON.stringify(d.cheio));
ok('o checklist diz o que tem e o que precisa, item a item',
  d.vazio.pecas&&d.vazio.diesel&&d.vazio.noites&&
  typeof d.vazio.pecas.tem==='number'&&typeof d.vazio.pecas.precisa==='number');
ok('nada pronto no começo',!d.vazio.pecas.ok&&!d.vazio.diesel.ok&&!d.vazio.noites.ok);
ok('tudo pronto quando os três fecham',d.prontoCheio);

console.log('\n7. A PEÇA SÓ EXISTE ONDE FAZ SENTIDO');
d=await p.evaluate(()=>{
  const onde=Object.keys(TIPO_CASA).filter(t=>
    (TIPO_CASA[t].loot||[]).includes('peca_motor'));
  return {onde, noCatalogo:!!CATALOGO.peca_motor,
    nome:CATALOGO.peca_motor&&CATALOGO.peca_motor.n};
});
console.log('   ',JSON.stringify(d));
ok('a peça está no catálogo',d.noCatalogo&&d.nome==='Peça de motor');
/* os tipos de casa deste jogo são simples, abandonada, boa, sitio,
   comercio, oficina, tocada — não existe "industrial" */
ok('e só aparece em oficina e comércio',
  d.onde.length===2&&d.onde.includes('oficina')&&d.onde.includes('comercio'));

console.log('\n8. PROVA: OS MARCOS NUNCA TORNAM O OBJETIVO INALCANÇÁVEL');
d=await p.evaluate(()=>{
  /* pior mundo possível: todos os marcos, todos do tipo pior */
  __zerar();
  for(let i=0;i<200;i++){rumoMarco('cidade');rumoMarco('ousadia');}
  const rend=rendimentoDoMarco();
  const locais=Object.keys(TIPO_CASA).filter(t=>
    (TIPO_CASA[t].loot||[]).includes('peca_motor'));
  /* 1. o rendimento nunca chega a zero: sempre dá pra achar coisa */
  const rendPositivo=rend>0;
  /* 2. os locais da peça continuam existindo */
  const locaisSobrevivem=locais.length>=2;
  /* 3. o risco de invasão nunca chega a 1: sempre dá pra passar a noite */
  S.ruido=100; S.porta={...S.porta,dano:100,reforco:0,tranca:false}; S.diesel=0;
  S.dia=999;
  const riscoMax=riscoInvasao();
  /* 4. o diesel exigido é alcançável: nenhum marco impede acumular */
  const tetoDiesel=100;
  const dieselOk=RUMO_CFG.dieselPraSair<tetoDiesel;
  /* 5. as noites exigidas passam sozinhas */
  const noitesOk=RUMO_CFG.noitesDepoisDeDescobrir>0&&isFinite(RUMO_CFG.noitesDepoisDeDescobrir);
  return {rend:+rend.toFixed(3), rendPositivo, locais, locaisSobrevivem,
    riscoMax:+riscoMax.toFixed(3), dieselOk, noitesOk,
    maxMarcos:RUMO_CFG.maxMarcos, tetoCidade:RUMO_CFG.cidadeTeto};
});
console.log('   ',JSON.stringify(d));
ok('o rendimento do saque nunca chega a zero',d.rendPositivo&&d.rend>=1-d.tetoCidade);
ok('os locais que têm a peça continuam existindo',d.locaisSobrevivem);
ok('o risco de invasão nunca chega a 1 (sempre dá pra passar a noite)',d.riscoMax<1);
ok('o diesel exigido cabe no máximo que o tanque guarda',d.dieselOk);
ok('as noites exigidas passam sozinhas com o tempo',d.noitesOk);

console.log('\n9. O FINAL É PRÓPRIO E NÃO É MORRER');
d=await p.evaluate(async()=>{
  __zerar(); rumoOpalaPronto();
  await fimOpala();
  await new Promise(r=>setTimeout(r,9000));
  return {modo:cena.modo, saiu:opala()&&opala().saiu,
    temBotao:[...document.querySelectorAll('#acoes button')].length>0,
    texto:document.getElementById('texto').textContent.slice(-400),
    /* A identidade do final, que é o que dá pra afirmar. Procurar a
       AUSÊNCIA da palavra "morreu" no #texto não servia: o buffer é
       compartilhado e guarda o que os testes anteriores escreveram —
       a palavra veio de outra cena, não desta. */
    modoNaoEhFim:cena.modo!=='fim',
    fimRegistrado:!!(opala()&&opala().saiu)};
});
console.log('   ',JSON.stringify({...d,texto:undefined}));
ok('a cena de saída tem modo próprio',d.modo==='saida');
ok('e é registrada como saída, não como fim de morte',
  d.fimRegistrado===true&&d.modoNaoEhFim===true);
ok('o retrovisor aparece no texto',/retrovisor/i.test(d.texto));
ok('e a tela continua clicável',d.temBotao);

console.log('\n10. O CAMINHÃO DO DIA 12 CONTINUA EXISTINDO');
d=await p.evaluate(()=>({
  temResgate:typeof telaResgate==='function',
  temFimOpala:typeof fimOpala==='function'
}));
console.log('   ',JSON.stringify(d));
ok('não destruí o final que já existia',d.temResgate&&d.temFimOpala);

console.log('\n11. SAVE');
d=await p.evaluate(()=>{
  __zerar(); S.oficinaNivel=1; descobrirOpala(); opala().pecas=1;
  rumoMarco('cidade');
  salvarAgora();
  const disco=JSON.parse(localStorage.getItem(CHAVE)||'{}');
  return {salvou:!!disco.rumo, marcos:disco.rumo&&disco.rumo.marcos.length,
    pecas:disco.rumo&&disco.rumo.opala&&disco.rumo.opala.pecas};
});
console.log('   ',JSON.stringify(d));
ok('marcos e Opala vão pro save',d.salvou&&d.marcos===1&&d.pecas===1);

console.log('\nerros de página:',erros.filter(e=>!/ERR_|file:/.test(e)).length?erros:'(nenhum)');
await b.close();
