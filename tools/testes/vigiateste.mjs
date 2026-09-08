/* §53 — a presença, e como saber se ela é sua.

   O falso positivo declarado JÁ EXISTIA (`ILUSOES_SOM`, nove ilusões,
   com texto de real e de falso, e a chance de ser real caindo junto com
   a cabeça: 54% no tenso, 6% no desfeito). O que faltava, medido: no
   lúcido não acontecia nada, as nove eram SOM (zero sensações sem som),
   e não havia assinatura que o jogador pudesse aprender.

   Este harness prova as três coisas que o §53 acrescenta:
   1. as quatro fontes têm assinatura DIFERENTE e legível;
   2. o falso positivo só acontece quando a condição do jogador explica —
      nunca por sorteio, senão vira a aleatoriedade que o briefing proíbe;
   3. a leitura não gasta o gerador semeado e não grava no save. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Vigia'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

await p.evaluate(()=>{
  window.__limpo=()=>{
    /* `S.ferido` e DERIVADO desde o §41: escrever nele e recusado de
       proposito (`feridoEscritasRecusadas()` conta as tentativas). A
       minha primeira versao fazia `S.ferido=2` e a causa "ferida" nunca
       acendia — o teste estava errado e a guarda do jogo estava certa.
       Ferida de verdade se poe com `pegarMal`. */
    S.sanidade=100; S.lanterna=true; S.hora=12;
    try{ (S.males||[]).length=0; }catch(e){}
    S.visitante=null;
    try{ const C=cerco(); C.ativo=false; C.dentro=[]; }catch(e){}
    try{ costEstado().desfeitos.length=0; }catch(e){}
    S.anomAtivasLista=[]; S.anomComodo=null;
    try{ SILEN.estado='CHEIO'; }catch(e){}
  };
});

console.log('\n1. SEM MOTIVO NENHUM, A CABEÇA NÃO INVENTA');
{
  const d=await p.evaluate(()=>{
    __limpo();
    const leituras=[];
    for(let i=0;i<60;i++){ VIG.trocas=i; leituras.push(vigiaLer(i%9)); }
    return {chance:vigiaEstado().chanceFalso,
      acesos:leituras.filter(l=>l.fonte).length,
      causas:vigiaEstado().causas};
  });
  console.log('    jogador inteiro, de dia, com lanterna: chance de falso '+d.chance
    +' · causas '+(d.causas.length?d.causas.join(', '):'nenhuma'));
  console.log('    sensações em 60 leituras: '+d.acesos);
  ok('sem causa, a chance de falso é zero', d.chance===0);
  ok('e nenhuma sensação acende',           d.acesos===0);
}

console.log('\n2. CADA CAUSA É NOMEÁVEL, E ELAS SOMAM');
{
  const d=await p.evaluate(()=>{
    const r=[];
    const cen=[
      ['inteiro',            ()=>{__limpo();}],
      ['cabeça ruim',        ()=>{__limpo(); S.sanidade=30;}],
      ['ferido',             ()=>{__limpo(); pegarMal('cortefundo');}],
      ['no escuro',          ()=>{__limpo(); S.lanterna=false; S.hora=22;}],
      ['no silêncio oco',    ()=>{__limpo(); try{SILEN.estado='OCO';}catch(e){}}],
      ['tudo junto',         ()=>{__limpo(); S.sanidade=20; pegarMal('cortefundo');
                                  S.lanterna=false; S.hora=22;
                                  try{SILEN.estado='OCO';}catch(e){}}]
    ];
    cen.forEach(([n,f])=>{ f(); const e=vigiaEstado();
      r.push({n, chance:e.chanceFalso, causas:e.causas.join(', ')||'—'}); });
    return {linhas:r, teto:vigiaEstado().cfg.falsoMax,
      recusadas:(typeof feridoEscritasRecusadas==='function')?feridoEscritasRecusadas():null};
  });
  d.linhas.forEach(x=>console.log('    '+x.n.padEnd(16)+' chance '+String(x.chance).padEnd(6)+' · '+x.causas));
  console.log('    (tentativas de escrever em S.ferido recusadas pelo §41: '+d.recusadas+')');
  const m=Object.fromEntries(d.linhas.map(x=>[x.n,x.chance]));
  ok('cada condição sozinha já explica',
     m['cabeça ruim']>0&&m['ferido']>0&&m['no escuro']>0&&m['no silêncio oco']>0);
  ok('e juntas explicam mais',   m['tudo junto']>m['cabeça ruim']);
  ok('mas há um teto (a cabeça não inventa sem parar)',
     m['tudo junto']<=d.teto+1e-9);
  ok('toda causa vem com nome',  d.linhas.every(x=>x.chance===0||x.causas!=='—'));
}

console.log('\n3. AS QUATRO FONTES TÊM ASSINATURA DIFERENTE');
{
  const d=await p.evaluate(()=>{
    const r={};
    /* DENTRO: te segue de cômodo em cômodo */
    __limpo();
    try{ const C=cerco(); C.ativo=true; C.dentro=[{id:'magro'}]; }catch(e){}
    r.DENTRO={a:vigiaLer(1).fonte, b:vigiaLer(5).fonte, c:vigiaLer(8).fonte};
    /* PORTA: existe, e não depende do cômodo */
    __limpo(); S.visitante={n:'x'};
    try{ S.porta=S.porta||{}; S.porta.batendo=true; }catch(e){}
    r.PORTA={a:vigiaLer(1).fonte, b:vigiaLer(5).fonte};
    /* LUGAR: só no cômodo dela */
    __limpo();
    try{ costEstado().desfeitos.push({comodo:5,i:0,dia:1,tipo:'x'}); }catch(e){}
    r.LUGAR={noDela:vigiaLer(5).fonte, emOutro:vigiaLer(1).fonte};
    /* VOCE: com causa e sem fonte real */
    __limpo(); S.sanidade=15; pegarMal('cortefundo'); S.lanterna=false; S.hora=23;
    const vs=[]; for(let i=0;i<40;i++){ VIG.trocas=i; vs.push(vigiaLer(3).fonte); }
    r.VOCE={acende:vs.filter(x=>x==='VOCE').length, total:vs.length,
            variou:new Set(vs).size>1};
    return r;
  });
  console.log('    DENTRO em três cômodos: '+[d.DENTRO.a,d.DENTRO.b,d.DENTRO.c].join(', '));
  console.log('    PORTA em dois cômodos:  '+[d.PORTA.a,d.PORTA.b].join(', '));
  console.log('    LUGAR no cômodo dela → '+d.LUGAR.noDela+' · em outro → '+d.LUGAR.emOutro);
  console.log('    VOCE acendeu '+d.VOCE.acende+' de '+d.VOCE.total+' visitas · variou entre visitas: '
    +(d.VOCE.variou?'sim':'NÃO'));
  ok('DENTRO segue você por todo cômodo',
     d.DENTRO.a==='DENTRO'&&d.DENTRO.b==='DENTRO'&&d.DENTRO.c==='DENTRO');
  ok('PORTA aparece independente do cômodo', d.PORTA.a==='PORTA'&&d.PORTA.b==='PORTA');
  ok('LUGAR fica só no cômodo dela',   d.LUGAR.noDela==='LUGAR'&&d.LUGAR.emOutro!=='LUGAR');
  ok('VOCE acende às vezes, não sempre', d.VOCE.acende>0&&d.VOCE.acende<d.VOCE.total);
  ok('e varia entre visitas (não é papel de parede)', d.VOCE.variou);
}

console.log('\n4. O DE VERDADE GANHA DO INVENTADO');
{
  const d=await p.evaluate(()=>{
    __limpo(); S.sanidade=5; pegarMal('cortefundo'); S.lanterna=false; S.hora=23;
    try{ SILEN.estado='OCO'; }catch(e){}
    const soCabeca=vigiaLer(4);
    try{ const C=cerco(); C.ativo=true; C.dentro=[{id:'magro'}]; }catch(e){}
    const comBicho=vigiaLer(4);
    return {soCabeca:{f:soCabeca.fonte,v:soCabeca.verdade},
            comBicho:{f:comBicho.fonte,v:comBicho.verdade,forca:comBicho.forca}};
  });
  console.log('    com a cabeça no fundo do poço e nada na casa: '+d.soCabeca.f
    +' (verdade: '+d.soCabeca.v+')');
  console.log('    a mesma cabeça, com bicho dentro:            '+d.comBicho.f
    +' (verdade: '+d.comBicho.v+', força '+d.comBicho.forca+')');
  ok('com bicho dentro, a leitura é verdadeira', d.comBicho.v===true);
  ok('e a fonte é o bicho, não a cabeça',        d.comBicho.f==='DENTRO');
}

console.log('\n5. CONFERIR RESOLVE — E É O CONTRA-JOGO');
{
  const d=await p.evaluate(()=>{
    __limpo(); S.sanidade=15; pegarMal('cortefundo'); S.lanterna=false; S.hora=23;
    /* acha uma visita em que a cabeça acende */
    let achou=false;
    for(let i=0;i<60&&!achou;i++){ VIG.trocas=i; const l=vigiaNoComodo(3);
      achou=!!(l&&l.fonte==='VOCE'); }
    const antes=vigiaEstado();
    limpar();
    menuRealidade(()=>{});
    const bs=Array.from(AC.querySelectorAll('button'))
      .filter(x=>/Conferir a sensação/.test(x.textContent));
    if(bs.length)bs[0].click();
    const dito=Array.from(T.querySelectorAll('p:not(.passado)')).map(e=>e.textContent);
    return {achou, fonte:antes.fonte, temBotao:bs.length>0,
      cedeu:dito.some(t=>/a sensação cede/.test(t)),
      explicou:dito.some(t=>/\(.*(cabeça|ferida|escuro|silêncio).*\)/.test(t))};
  });
  console.log('    a cabeça acendeu: '+d.achou+' ('+d.fonte+')');
  console.log('    o botão de conferir apareceu: '+d.temBotao);
  console.log('    conferir derrubou a sensação: '+d.cedeu+' · e disse o porquê: '+d.explicou);
  ok('dá pra conferir a sensação',        d.temBotao);
  ok('conferir derruba o falso positivo', d.cedeu);
  ok('e a explicação nomeia a causa',     d.explicou);
}

console.log('\n6. NÃO GASTA O GERADOR E NÃO SUJA O SAVE');
{
  const d=await p.evaluate(()=>{
    __limpo(); S.sanidade=20; pegarMal('cortefundo'); S.lanterna=false; S.hora=23;
    const antes=S.rngEstado;
    for(let i=0;i<50;i++){ VIG.trocas=i; vigiaLer(i%9); vigiaEstado(); }
    const depois=S.rngEstado;
    salvar();
    let campos=[];
    try{ campos=Object.keys(JSON.parse(localStorage.getItem(CHAVE)||'{}')); }catch(e){}
    /* `S.vigiou` e da BASE (a acao de ficar de vigia) e nao tem nada a
       ver com este bloco — o meu primeiro filtro era /^vig/i e acusava
       ela. Filtro largo demais acusa inocente. */
    const meus=['vigia','vigias','vigiaEstado','presenca','VIG'];
    return {antes, depois, sujou:campos.filter(k=>meus.indexOf(k)>=0)};
  });
  console.log('    gerador antes '+d.antes+' · depois de 50 leituras '+d.depois);
  console.log('    campos gravados no save: '+(d.sujou.length?d.sujou.join(', '):'nenhum'));
  ok('ler a presença não consome o gerador', d.antes===d.depois);
  ok('e não inventa campo no save',          d.sujou.length===0);
}

console.log('\n7. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
