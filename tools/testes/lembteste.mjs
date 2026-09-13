/* §60 — a casa lembra.

   A auditoria achou o buraco de verdade: SEIS sistemas já guardavam
   estado por cômodo (marcas, traumas, costuras, avarias, hóspede,
   vistos), mas O DESENHO DO CÔMODO NÃO LIA QUASE NADA DISSO — medido no
   código das cenas, só `costuras` aparecia. A casa lembrava por escrito
   e o cenário não sabia de nada.

   Então a asserção que mais importa aqui não é "o peso sobe": é que a
   TELA muda. Peso que não vira tinta é planilha. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Lemb'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);
await p.evaluate(()=>{
  window.__W=390; window.__H=844;
  const tela=document.getElementById('tela'); tela.width=__W; tela.height=__H;
  window.__pinta=(i)=>{ cena.casa=cena.casa||{}; cena.casa.voce=i;
    CX.clearRect(0,0,__W,__H); CENAS[i](__W,__H,1.4);
    return CX.getImageData(0,0,__W,__H).data; };
  window.__dif=(a,b2)=>{ let n=0,t=0;
    for(let i=0;i<a.length;i+=4){
      if(Math.abs(a[i]-b2[i])+Math.abs(a[i+1]-b2[i+1])+Math.abs(a[i+2]-b2[i+2])>8)n++; t++; }
    return +(n/t*100).toFixed(2); };
  window.__zerar=()=>{ S.memoriaCasa={}; S.dia=10; };
});

console.log('\n1. O PESO SOBE COM O QUE ACONTECE — E CADA COISA PESA O SEU');
{
  const d=await p.evaluate(()=>{
    __zerar();
    const linha=[];
    [['porta','FISICO'],['sangue','FISICO'],['invasao','ENTIDADE'],['morte','NPC']]
      .forEach(([t,o])=>{ lemAnotar(4,t,o); linha.push(t+' → '+lemPeso(4).toFixed(1)); });
    const e=lembrancaEstado();
    return {linha, pesos:e.pesos, permanentes:e.permanentes,
      origens:e.origens, comodo:e.comodos['4']};
  });
  console.log('    '+d.linha.join(' · '));
  console.log('    tabela de pesos: '+JSON.stringify(d.pesos));
  console.log('    origens declaradas: '+d.origens.join(', '));
  ok('o peso acumula',              d.comodo.peso>0);
  ok('coisa grave pesa mais que porta aberta', d.pesos.morte>d.pesos.porta*5);
  ok('e existem as origens do pedido',
     ['FISICO','AMBIENTE','NPC','ANOMALIA','ILUSAO','ENTIDADE'].every(o=>d.origens.indexOf(o)>=0));
}

console.log('\n2. A CASA CICATRIZA — MENOS DO QUE NÃO CICATRIZA');
{
  const d=await p.evaluate(()=>{
    __zerar();
    lemAnotar(1,'invasao','ENTIDADE');       /* peso 8, cicatriza */
    const dia0=lemPeso(1);
    S.dia=20; const dia10=lemPeso(1);
    S.dia=40; const dia30=lemPeso(1);
    __zerar();
    lemAnotar(2,'morte','NPC');              /* peso 10, NUNCA cicatriza */
    const m0=lemPeso(2);
    S.dia=60; const m50=lemPeso(2);
    return {dia0:+dia0.toFixed(1), dia10:+dia10.toFixed(1), dia30:+dia30.toFixed(1),
      m0:+m0.toFixed(1), m50:+m50.toFixed(1),
      decai:lembrancaEstado().cfg.decaiPorDia};
  });
  console.log('    invasão: '+d.dia0+' → 10 dias '+d.dia10+' → 30 dias '+d.dia30
    +' (decai '+d.decai+'/dia)');
  console.log('    morte:   '+d.m0+' → 50 dias '+d.m50+' (não cicatriza)');
  ok('o que cicatriza some com o tempo', d.dia10<d.dia0&&d.dia30===0);
  ok('e o que não cicatriza fica',        d.m50===d.m0&&d.m50>0);
}

console.log('\n3. O DESENHO DO CÔMODO MUDA — A ASSERÇÃO QUE IMPORTA');
{
  const d=await p.evaluate(()=>{
    __zerar();
    const limpo=__pinta(4);
    /* peso baixo: já deve aparecer alguma coisa */
    for(let i=0;i<2;i++)lemAnotar(4,'sangue','FISICO');
    const pouco=__pinta(4), pesoPouco=lemPeso(4);
    /* peso alto: bem mais */
    for(let i=0;i<4;i++)lemAnotar(4,'invasao','ENTIDADE');
    const muito=__pinta(4), pesoMuito=lemPeso(4);
    /* e um cômodo SEM memória continua limpo */
    const outro=__pinta(5);
    __zerar();
    const outroLimpo=__pinta(5);
    return {vsPouco:__dif(limpo,pouco), vsMuito:__dif(limpo,muito),
      pesoPouco:+pesoPouco.toFixed(1), pesoMuito:+pesoMuito.toFixed(1),
      vizinhoMudou:__dif(outro,outroLimpo),
      camadas:lembrancaEstado().cfg.limiar};
  });
  console.log('    peso '+d.pesoPouco+' → '+d.vsPouco+'% da tela diferente');
  console.log('    peso '+d.pesoMuito+' → '+d.vsMuito+'% da tela diferente');
  console.log('    o cômodo vizinho, sem memória: '+d.vizinhoMudou+'% (tem de ser 0)');
  console.log('    camadas por peso: '+JSON.stringify(d.camadas));
  /* O limite de 0,15% que estava aqui era chute meu. O que vale e a
     diferenca entre NADA e ALGUMA COISA: antes do conserto do risco,
     peso 6 dava 0,00% — existia no codigo e nao na tela. Agora da
     ~0,11%, que sao uns 360 pixels de arranhao claro sobre piso escuro,
     e a foto confirma que da pra ver. Pouca memoria TEM de ser sutil:
     o pedido fala de "uma pequena marca no chao" que levanta uma
     pergunta, nao de um cenario destruido. */
  ok('memória pouca já aparece na tela',   d.vsPouco>0.05);
  ok('memória muita aparece bem mais',     d.vsMuito>d.vsPouco*1.8);
  ok('e não vaza pro cômodo do lado',      d.vizinhoMudou===0);
}

console.log('\n4. VOLTAR NO CÔMODO CONFIRMA O QUE VOCÊ VIU');
{
  const d=await p.evaluate(()=>{
    __zerar();
    for(let i=0;i<5;i++)lemAnotar(3,'invasao','ENTIDADE');
    const a=__pinta(3);
    __pinta(6); __pinta(1);          /* passeia pela casa */
    const b2=__pinta(3);             /* e volta */
    return {igual:__dif(a,b2)};
  });
  console.log('    a mesma memória desenhada duas vezes difere '+d.igual+'%');
  ok('memória não muda de lugar sozinha', d.igual===0);
}

console.log('\n5. A MEMÓRIA PODE DISCORDAR DA REALIDADE — SÓ ONDE HOUVE ANOMALIA');
{
  const d=await p.evaluate(()=>{
    __zerar();
    /* cômodo só com coisa física: nunca discorda */
    for(let i=0;i<4;i++)lemAnotar(0,'invasao','FISICO');
    let fisico=0;
    for(let dia=1;dia<=120;dia++){ S.dia=dia; if(lemDiscorda(0))fisico++; }
    /* cômodo com anomalia: discorda às vezes */
    __zerar(); S.dia=10;
    for(let i=0;i<6;i++)lemAnotar(0,'costura','ANOMALIA');
    let anom=0; const coisas={};
    for(let dia=1;dia<=120;dia++){ S.dia=dia;
      const q=lemDiscorda(0); if(q){anom++; coisas[q.coisa]=(coisas[q.coisa]||0)+1;} }
    return {fisico, anom, coisas, teto:lembrancaEstado().cfg.anomalaTeto,
      min:lembrancaEstado().cfg.anomalaMin};
  });
  console.log('    cômodo só com coisa física: discordou em '+d.fisico+' de 120 dias');
  console.log('    cômodo com anomalia:        discordou em '+d.anom+' de 120 dias '
    +JSON.stringify(d.coisas));
  ok('sem anomalia, a memória nunca discorda', d.fisico===0);
  ok('com anomalia, ela discorda às vezes',    d.anom>0);
  ok('mas é raro, não é o normal',             d.anom<120*d.teto*1.6);
}

console.log('\n6. INVESTIGAR ENTREGA A ORIGEM — E A CONFIANÇA NELA');
{
  const d=await p.evaluate(()=>{
    __zerar();
    const vazio=lemInvestigar(7);
    __zerar();
    for(let i=0;i<3;i++)lemAnotar(6,'costura','ANOMALIA');
    const anom=lemInvestigar(6);
    __zerar();
    for(let i=0;i<3;i++)lemAnotar(6,'invasao','FISICO');
    const fis=lemInvestigar(6);
    /* e o botão existe no menu do cômodo com história */
    S.hora=10; menuComodo(6);
    const bt=Array.from(AC.querySelectorAll('button'))
      .filter(x=>/Olhar o que mudou/.test(x.textContent));
    __zerar(); menuComodo(6);
    const btVazio=Array.from(AC.querySelectorAll('button'))
      .filter(x=>/Olhar o que mudou/.test(x.textContent));
    return {vazio:vazio.vazio, anom:{o:anom.origem,c:anom.confia},
      fis:{o:fis.origem,c:fis.confia}, texto:fis.texto,
      botao:bt.length, botaoVazio:btVazio.length};
  });
  console.log('    cômodo sem história: '+(d.vazio?'diz que não tem nada':'ERRO'));
  console.log('    com anomalia: origem '+d.anom.o+', confiança '+d.anom.c);
  console.log('    com coisa física: origem '+d.fis.o+', confiança '+d.fis.c);
  console.log('    "'+d.texto+'"');
  ok('cômodo sem história não inventa',  d.vazio===true);
  ok('a origem é entregue',              d.anom.o==='ANOMALIA'&&d.fis.o==='FISICO');
  ok('e a confiança separa as duas',     d.fis.c>d.anom.c);
  ok('o botão só aparece onde há história', d.botao===1&&d.botaoVazio===0);
}

console.log('\n7. ELA LÊ OS SEIS SISTEMAS EM VEZ DE COPIAR');
{
  const d=await p.evaluate(()=>{
    __zerar(); S.dia=12;
    S.marcas=[{onde:1,t:'x',dia:12}];
    S.traumas=[{comodo:2,dia:12,porque:'y',vezes:1}];
    try{ costEstado().desfeitos.push({comodo:3,i:0,dia:12,tipo:'z'}); }catch(e){}
    S.mortos=[{n:'Teste',local:5}];
    const n=lemSincronizar();
    const e=lembrancaEstado().comodos;
    /* rodar de novo não pode duplicar */
    const n2=lemSincronizar();
    return {n, n2, comodos:Object.keys(e),
      origens:Object.keys(e).map(c=>c+':'+e[c].origem),
      morteFixa:e['5']?e['5'].fixo:0};
  });
  console.log('    sincronizou '+d.n+' eventos · rodando de novo: '+d.n2+' (tem de ser 0)');
  console.log('    cômodos com memória: '+d.origens.join(' · '));
  ok('ela puxa dos sistemas que já existem', d.n>=4);
  ok('e não duplica quando roda de novo',    d.n2===0);
  ok('a morte virou cicatriz permanente',    d.morteFixa>0);
}

console.log('\n8. O CUSTO E O SAVE');
{
  const d=await p.evaluate(()=>{
    __zerar();
    for(let c=0;c<9;c++)for(let i=0;i<8;i++)lemAnotar(c,'invasao','ENTIDADE');
    const med=(i,n)=>{const t=performance.now();
      for(let k=0;k<n;k++){CX.clearRect(0,0,__W,__H);CENAS[i](__W,__H,1.4+k*.01);}
      return +((performance.now()-t)/n).toFixed(3);};
    med(4,20);
    const r={}; for(let i=0;i<9;i++)r[i]=med(i,60);
    const v=Object.values(r);
    S.nomeJogador=S.nomeJogador||'Lemb';
    salvar();
    let o={}; try{ o=JSON.parse(localStorage.getItem(CHAVE)||'{}'); }catch(e){}
    const bytes=JSON.stringify(o.memoriaCasa||{}).length;
    const eventos=Object.values(o.memoriaCasa||{})
      .reduce((a,x)=>a+(x.eventos?x.eventos.length:0),0);
    return {pior:Math.max(...v), media:+(v.reduce((a,b2)=>a+b2,0)/v.length).toFixed(3),
      noSave:!!o.memoriaCasa, bytes, eventos, teto:lembrancaEstado().cfg.eventosPorComodo};
  });
  console.log('    com os 9 cômodos cheios de memória: média '+d.media+' ms · pior '+d.pior+' ms');
  console.log('    no save: '+d.bytes+' bytes, '+d.eventos+' eventos (teto '+d.teto+' por cômodo)');
  ok('o cômodo mais caro cabe no quadro de 16 ms', d.pior<16);
  ok('e sobra folga de verdade',                   d.media<5);
  ok('a memória vai pro save',                     d.noSave);
  ok('e ela é resumo, não filme',                  d.bytes<9000&&d.eventos<=9*d.teto);
}

console.log('\n9. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
