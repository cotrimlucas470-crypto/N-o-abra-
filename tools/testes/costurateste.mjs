/* §49 — AS COSTURAS: a coisa que não está mais lá, como se nunca tivesse estado.

   O que este harness precisa provar não é que a costura acontece. É que
   ela é JUSTA — porque uma coisa sumindo do nada é, à primeira vista,
   exatamente o que a regra de ouro do projeto proíbe. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Costura'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. O CATÁLOGO');
{
  const d=await p.evaluate(()=>costurasEstado());
  console.log('    '+JSON.stringify(d));
  ok('todo cômodo do abrigo tem objeto',    d.comodosComObjeto===9);
  ok('e cada um tem mais de uma opção',     d.objetosPorComodo.every(n=>n>=2));
  ok('o teto por dia é baixo de propósito', d.tetoPorDia<=2);
  ok('no dia 1 a fase é "nada"',            d.fase==='nada');
}

console.log('\n2. NADA COMEÇA ANTES DA HORA');
{
  const d=await p.evaluate(()=>{
    S.dia=1; const antes=costurasEstado();
    for(let i=0;i<80;i++){ costEstabelecer(i%9); }
    const depois=costurasEstado();
    return {antes:antes.postos, depois:depois.postos, fase:depois.fase};
  });
  console.log('    postos no dia 1 depois de 80 entradas: '+d.depois);
  ok('no dia 1 nenhum objeto é estabelecido', d.depois===0);
}

console.log('\n3. A REGRA QUE O JOGADOR APRENDE: SÓ SOME O QUE VOCÊ VIU SOZINHO');
{
  const d=await p.evaluate(()=>{
    S.dia=8; S.costuras=null; costEstado();
    cena.modo='casa'; cena.casa=cena.casa||{};
    /* O ABRIGO ESTA VAZIO NESTE PONTO DA PARTIDA — medido: 0 pessoas.
       A primeira versao deste teste so reposicionava quem existisse, e
       como nao existia ninguem, nada ficava protegido e o teste acusava
       o codigo de um bug que era do cenario. Aqui a gente entra. */
    S.abrigo=[{n:'Teste A',local:0,hab:'costura'},{n:'Teste B',local:2,hab:'cozinha'}];
    for(let i=0;i<400;i++){ costEstabelecer(i%9); }
    const e=costurasEstado();
    const c=S.costuras;
    const comGente=c.postos.filter(x=>x.comodo===0||x.comodo===2);
    return {postos:e.postos, protegidos:e.protegidos,
      gente:(S.abrigo||[]).length,
      comGenteTodosProtegidos:comGente.length>0&&comGente.every(x=>x.protegido),
      semGenteNenhumProtegido:c.postos.filter(x=>x.comodo!==0&&x.comodo!==2).every(x=>!x.protegido)};
  });
  console.log('    gente no abrigo: '+d.gente+' · postos: '+d.postos+' · protegidos: '+d.protegidos);
  ok('objeto visto com alguém junto fica protegido', d.comGenteTodosProtegidos===true);
  ok('e objeto visto sozinho não fica',              d.semGenteNenhumProtegido===true);
}
{
  const d=await p.evaluate(()=>{
    S.dia=9;  /* um dia depois de estabelecer */
    let tentativas=0, desfeitos=0, protegidoDesfeito=false;
    const protegidos=(S.costuras.postos||[]).filter(x=>x.protegido).map(x=>x.comodo);
    for(let volta=0; volta<300; volta++){
      S.costuras.noDia=0;                     /* solta o teto pra medir a REGRA */
      const alvo=volta%9;
      S.costuras.ultimoComodo=null;
      tentativas++;
      const r=costDesfazer(alvo);
      if(r){ desfeitos++; if(protegidos.includes(alvo))protegidoDesfeito=true; }
    }
    return {tentativas, desfeitos, protegidoDesfeito,
      comodosProtegidos:Array.from(new Set(protegidos))};
  });
  console.log('    '+d.desfeitos+' costuras em '+d.tentativas+' entradas · cômodos protegidos: '+JSON.stringify(d.comodosProtegidos));
  ok('costuras acontecem quando a fase permite', d.desfeitos>0);
  ok('e NENHUMA tocou um objeto protegido',      d.protegidoDesfeito===false);
}

console.log('\n4. A LEI: COSTURA NENHUMA MEXE EM CONTADOR');
{
  const d=await p.evaluate(()=>{
    S.dia=12; S.costuras=null; costEstado();
    cena.modo='casa';
    (S.abrigo||[]).forEach(pp=>{ pp.local=99; });     /* ninguém acompanha */
    for(let i=0;i<200;i++)costEstabelecer(i%9);
    const foto=()=>({comida:S.comida,diesel:S.diesel,remedio:S.remedio,
      ruido:S.ruido,sanidade:S.sanidade,hora:S.hora,dia:S.dia,
      reforco:S.porta?S.porta.reforco:null,
      guardados:(S.guardados||[]).reduce((a,g)=>a+(g.q||0),0),
      mat:Object.keys(S.mat||{}).reduce((a,k)=>a+(S.mat[k]||0),0),
      ferra:(S.ferra||[]).length, males:(S.males||[]).length});
    const antes=foto();
    S.dia=13;
    let n=0;
    for(let volta=0; volta<400; volta++){
      S.costuras.noDia=0; S.costuras.ultimoComodo=null;
      if(costDesfazer(volta%9))n++;
    }
    const depois=foto();
    const mudou=Object.keys(antes).filter(k=>antes[k]!==depois[k]&&k!=='dia');
    return {n, mudou, antes, depois};
  });
  console.log('    '+d.n+' costuras · contadores que mudaram: '+(d.mudou.length?d.mudou.join(', '):'nenhum'));
  ok('houve costura de verdade pra medir',   d.n>0);
  ok('NENHUM contador do jogo se moveu',     d.mudou.length===0);
}

console.log('\n5. OS LIMITES QUE IMPEDEM O CHUVISCO');
{
  const d=await p.evaluate(()=>{
    S.dia=14; S.costuras=null; costEstado(); cena.modo='casa';
    (S.abrigo||[]).forEach(pp=>{ pp.local=99; });
    for(let i=0;i<200;i++)costEstabelecer(i%9);
    S.dia=15;
    let n=0; for(let v=0;v<500;v++){ S.costuras.ultimoComodo=null; if(costDesfazer(v%9))n++; }
    const noDia=n;
    /* durante uma invasão, nunca */
    S.costuras.noDia=0; S.inv={fase:'CACA'};
    let durante=0; for(let v=0;v<200;v++){ S.costuras.ultimoComodo=null; if(costDesfazer(v%9))durante++; }
    S.inv=null;
    /* fora de casa, nunca */
    S.costuras.noDia=0; cena.modo='rua';
    let fora=0; for(let v=0;v<200;v++){ S.costuras.ultimoComodo=null; if(costDesfazer(v%9))fora++; }
    cena.modo='casa';
    /* nunca duas seguidas no mesmo cômodo */
    S.costuras.noDia=0; S.costuras.ultimoComodo=4;
    const mesmo=costDesfazer(4);
    return {noDia, durante, fora, mesmo:!!mesmo, teto:COST_CFG.porDia};
  });
  console.log('    no dia inteiro: '+d.noDia+' (teto '+d.teto+') · durante invasão: '+d.durante+' · fora de casa: '+d.fora);
  ok('o teto por dia é respeitado',            d.noDia<=d.teto);
  ok('nunca durante uma invasão',              d.durante===0);
  ok('nunca fora de casa',                     d.fora===0);
  ok('nunca duas seguidas no mesmo cômodo',    d.mesmo===false);
}

console.log('\n6. NUNCA NA SUA FRENTE — E NUNCA NO MESMO DIA');
{
  const d=await p.evaluate(()=>{
    S.dia=16; S.costuras=null; costEstado(); cena.modo='casa';
    (S.abrigo||[]).forEach(pp=>{ pp.local=99; });
    for(let i=0;i<60;i++)costEstabelecer(i%9);
    /* mesmo dia em que viu: não pode sumir */
    let mesmoDia=0;
    for(let v=0;v<300;v++){ S.costuras.noDia=0; S.costuras.ultimoComodo=null;
      if(costDesfazer(v%9))mesmoDia++; }
    S.dia=17;
    let outroDia=0;
    for(let v=0;v<300;v++){ S.costuras.noDia=0; S.costuras.ultimoComodo=null;
      if(costDesfazer(v%9))outroDia++; }
    return {mesmoDia, outroDia};
  });
  console.log('    no mesmo dia em que você viu: '+d.mesmoDia+' · num dia seguinte: '+d.outroDia);
  ok('não some no mesmo dia em que você viu', d.mesmoDia===0);
  ok('some depois, entre duas visitas',       d.outroDia>0);
}

console.log('\n7. O FINAL NÃO FOI TOCADO — E GANHOU UMA CODA');
{
  const d=await p.evaluate(()=>{
    const base=FIM_CENA.length;
    const ultima=FIM_CENA[FIM_CENA.length-1].t;
    const acorda=FIM_CENA.some(l=>l.t&&l.t.indexOf('Ele abriu os olhos')===0);
    const horaDe=FIM_CENA.some(l=>l.t==='Hora de acordar.');
    S.costuras=null; costEstado();
    const semCostura=costCoda().length;
    S.costuras.desfeitos=[{comodo:4,i:0,dia:9,tipo:'objeto'},
      {comodo:0,i:1,dia:14,tipo:'comodo'},{comodo:8,i:0,dia:22,tipo:'pessoa'}];
    const coda=costCoda();
    return {base, ultima:ultima.slice(0,40), acorda, horaDe, semCostura,
      comCostura:coda.length, texto:coda.map(l=>l.t)};
  });
  console.log('    linhas do final: '+d.base);
  d.texto.forEach(t=>console.log('    coda › '+t.slice(0,88)));
  ok('a linha "Hora de acordar." continua lá',      d.horaDe===true);
  ok('e "Ele abriu os olhos" também',               d.acorda===true);
  ok('sem costura, a coda não existe',              d.semCostura===0);
  ok('com costura, ela fecha no objeto que sumiu',  d.comCostura>=3);
  ok('e cita quantas vezes aconteceu',              d.texto.some(t=>/3 vezes/.test(t)));
}
{
  const d=await p.evaluate(async()=>{
    const antes=FIM_CENA.length;
    S.costuras.desfeitos=[{comodo:4,i:0,dia:9,tipo:'objeto'}];
    /* roda a cena com um cancelador que corta na hora: só interessa
       saber se ela devolve o FIM_CENA do tamanho que pegou */
    const caixa=document.createElement('div');
    caixa.innerHTML='<div></div>'; document.body.appendChild(caixa);
    try{ await cenaEmTexto(caixa,()=>true); }catch(e){}
    caixa.remove();
    return {antes, depois:FIM_CENA.length};
  });
  console.log('    FIM_CENA antes: '+d.antes+' · depois de rodar: '+d.depois);
  ok('a coda não deixa lixo no final', d.antes===d.depois);
}

console.log('\n8. ATRAVESSA UMA RECARGA DE VERDADE');
{
  await p.evaluate(()=>{
    S.dia=20; S.costuras=null; costEstado(); cena.modo='casa';
    (S.abrigo||[]).forEach(pp=>{ pp.local=99; });
    for(let i=0;i<40;i++)costEstabelecer(i%9);
    S.dia=21;
    for(let v=0;v<80;v++){ S.costuras.noDia=0; S.costuras.ultimoComodo=null; costDesfazer(v%9); }
    salvar();
  });
  const antes=await p.evaluate(()=>({postos:S.costuras.postos.length, desfeitos:S.costuras.desfeitos.length}));
  await p.reload(); await p.waitForTimeout(1200);
  await p.click('#btn-boot'); await p.waitForTimeout(1300);
  {const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1200);}}
  await p.waitForTimeout(9000);
  const d=await p.evaluate(()=>{
    const cru=JSON.parse(localStorage.getItem(CHAVE)||'{}');
    return {noSave:cru.costuras?{postos:(cru.costuras.postos||[]).length,
      desfeitos:(cru.costuras.desfeitos||[]).length}:null};
  });
  console.log('    antes: '+JSON.stringify(antes)+' · no save depois da recarga: '+JSON.stringify(d.noSave));
  ok('as costuras estão no save',           !!d.noSave);
  ok('e os objetos postos atravessaram',    d.noSave&&d.noSave.postos===antes.postos);
  ok('e os desfeitos também',               d.noSave&&d.noSave.desfeitos===antes.desfeitos);
}

console.log('\n9. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
