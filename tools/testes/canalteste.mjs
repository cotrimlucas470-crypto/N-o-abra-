/* §59 — os três canais que faltavam.

   O ULTRA_PROMPT da v71 pede cinco invasores; três colidem com o
   `imitador`, o `coro` e o `rastejante`, e o mesmo documento proíbe
   segunda versão paralela de sistema existente. A auditoria escolheu a
   segunda regra. Este bloco é a consequência: em vez de três sósias, as
   três criaturas ganham o canal que era genuinamente novo em cada
   pedido.

   O que este harness prova é que as três coisas ACONTECEM — porque a
   armadilha desta etapa é entregar tabela preenchida e comportamento
   igual. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Canal'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=5; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);
await p.evaluate(()=>{
  window.__I=(id)=>{
    cena.casa={voce:0,monstro:8,monstro2:null,visivel:false};
    const bicho=BICHOS.find(x=>x.id===id);
    const I={bicho,memoria:0,ruidoEm:null,bloqueio:null,bloqTurnos:0,
      acompanha:[],escondidos:[],folego:9,escondido:false};
    anomIniciar(I); return I;
  };
});

console.log('\n1. OS CANAIS SECUNDÁRIOS ENTRARAM — E SÓ NOS TRÊS');
{
  const d=await p.evaluate(()=>{
    const c=canaisEstado().canais;
    return {c, comExtra:Object.keys(c).filter(k=>c[k].length),
      primarioIntacto:Object.keys(AME_CANAIS).every(k=>
        !REGRA[k]||REGRA[k].sentido===AME_CANAIS[k].primario)};
  });
  Object.keys(d.c).forEach(k=>console.log('    '+k.padEnd(11)
    +' também: '+(d.c[k].join(', ')||'—')));
  ok('os três ganharam canal a mais',
     ['imitador','coro','rastejante'].every(k=>d.c[k].length===1));
  ok('e só eles (o resto continua como estava)',
     d.comExtra.filter(k=>['imitador','coro','rastejante','observador'].indexOf(k)<0).length===0);
  ok('o canal primário de cada um não mudou', d.primarioIntacto);
}

console.log('\n2. O IMITADOR ERRA UMA COISA — E OUTRA A CADA ENCONTRO');
{
  const d=await p.evaluate(()=>{
    const vistos={}, porDia=[];
    for(let dia=1;dia<=30;dia++){
      S.dia=dia; S.hora=20;
      const I=__I('imitador');
      const e=imiErroDoDia(I);
      vistos[e.id]=(vistos[e.id]||0)+1;
      porDia.push(e.id);
    }
    /* o mesmo encontro no mesmo dia da SEMPRE o mesmo erro */
    S.dia=7; S.hora=20;
    const A=__I('imitador'); A.imiSemente=99;
    const B=__I('imitador'); B.imiSemente=99;
    const estavel=imiErroDoDia(A).id===imiErroDoDia(B).id;
    /* e criatura que nao e o imitador nao tem erro nenhum */
    const outro=imiErroDoDia(__I('magro'));
    return {vistos, porDia:porDia.slice(0,10), estavel, outro,
      catalogo:canaisEstado().errosDoImitador};
  });
  console.log('    catálogo de erros: '+d.catalogo.join(', '));
  console.log('    em 30 encontros: '+JSON.stringify(d.vistos));
  console.log('    os dez primeiros: '+d.porDia.join(', '));
  ok('existe mais de um erro possível',   Object.keys(d.vistos).length>=3);
  ok('e ele muda de encontro pra encontro', new Set(d.porDia).size>=3);
  ok('mas é estável dentro do encontro',  d.estavel);
  ok('e só o imitador tem erro',          d.outro===null);
}

console.log('\n3. O IMITADOR CONTA O ERRO QUANDO VOCÊ ESCUTA');
{
  const d=await p.evaluate(async()=>{
    S.dia=5; S.hora=20; limpar();
    const I=__I('imitador');
    const esperado=imiErroDoDia(I).t;
    await escutar(I);
    const ditas=Array.from(T.querySelectorAll('p:not(.passado)')).map(e=>e.textContent);
    const contou=ditas.some(t=>t.indexOf(esperado.slice(0,30))>=0);
    /* e não repete se você escutar de novo no mesmo encontro */
    await escutar(I);
    const ditas2=Array.from(T.querySelectorAll('p:not(.passado)')).map(e=>e.textContent);
    const vezes=ditas2.filter(t=>t.indexOf(esperado.slice(0,30))>=0).length;
    return {contou, vezes, esperado};
  });
  console.log('    "'+d.esperado+'"');
  ok('escutar entrega o erro do encontro', d.contou);
  ok('e ele não é repetido',               d.vezes===1);
}

console.log('\n4. O CORO DEVOLVE O BARULHO QUE VOCÊ FEZ');
{
  const d=await p.evaluate(()=>{
    S.dia=6;
    const I=__I('coro');
    cena.casa.voce=0;
    /* o jogador faz barulho em três cômodos diferentes */
    [3,5,7].forEach(c=>anomOuviu(I,c,1));
    const guardou=(I.ecos||[]).map(e=>e.onde);
    /* agora ele está caçando e devolve */
    I.fase='CACA'; I.faseTurnos=CAN_CFG.ecoCada;
    const devolvidos=[];
    for(let k=0;k<12;k++){ const t=coroDevolve(I); if(t)devolvidos.push(t); }
    /* nunca devolve do cômodo em que você está */
    cena.casa.voce=5;
    const daondeVoceEsta=[];
    for(let k=0;k<40;k++){ coroDevolve(I);
      if(I.ecoUltimo&&I.ecoUltimo.onde===5)daondeVoceEsta.push(1); }
    /* e criatura que não é o coro não devolve nada */
    const M=__I('magro'); anomOuviu(M,3,1);
    return {guardou, exemplo:devolvidos[0]||'', quantos:devolvidos.length,
      daondeVoceEsta:daondeVoceEsta.length,
      magroGuardou:Array.isArray(M.ecos)?M.ecos.length:0,
      magroDevolve:coroDevolve(M), teto:canaisEstado().cfg.ecosMax};
  });
  console.log('    ele guardou os barulhos dos cômodos: '+d.guardou.join(', ')
    +' (teto '+d.teto+')');
  console.log('    "'+d.exemplo+'"');
  ok('ele guarda o barulho do jogador',   d.guardou.length===3);
  ok('e devolve depois',                  d.quantos>0);
  ok('nunca do cômodo em que você está',  d.daondeVoceEsta===0);
  ok('e só o coro faz isso',              d.magroGuardou===0&&d.magroDevolve===null);
}

console.log('\n5. AS MARCAS SOMEM DEVAGAR');
{
  const d=await p.evaluate(()=>{
    S.marcas=[]; S.dia=10;
    const M=marcas();
    M.push({onde:1,t:'de hoje',dia:10});
    M.push({onde:2,t:'de cinco dias',dia:5});
    M.push({onde:3,t:'de nove dias',dia:1});
    M.push({onde:4,t:'de doze dias',dia:-2});
    const antes=canaisEstado().marcas.map(m=>m.idade+'d '+(m.viva?'viva':'morta')
      +(m.desbotada?' desbotada':''));
    const sumiram=limparMarcasVelhas();
    const depois=marcas().map(m=>m.t);
    return {antes, sumiram, depois, cfg:canaisEstado().cfg};
  });
  console.log('    antes: '+d.antes.join(' · '));
  console.log('    limpeza tirou '+d.sumiram+' · sobraram: '+d.depois.join(', '));
  console.log('    (desbota em '+d.cfg.marcaDesbota+' dias, some em '+d.cfg.marcaDias+')');
  ok('marca velha some',              d.sumiram===2);
  ok('marca nova fica',               d.depois.indexOf('de hoje')>=0);
  ok('e a de cinco dias fica, desbotada',
     d.depois.indexOf('de cinco dias')>=0&&/5d viva desbotada/.test(d.antes.join(' ')));
}

console.log('\n6. 2000 TURNOS COM OS TRÊS, SEM TRAVAR');
{
  const d=await p.evaluate(()=>{
    let travou=null; const conta={};
    ['imitador','coro','rastejante'].forEach(id=>{
      const I=__I(id);
      let seguidos=0, ultima=I.fase;
      for(let t=0;t<2000;t++){
        if(t%5===0){ cena.casa.voce=(t*7+3)%9; anomPisou(I,cena.casa.voce); }
        if(t%7===0)anomOuviu(I,(t*5+1)%9,1);
        anomAvancar(I);
        cena.casa.monstro=moverMonstro(cena.casa.monstro,I);
        conta[I.fase]=(conta[I.fase]||0)+1;
        if(I.fase===ultima)seguidos++; else {seguidos=0;ultima=I.fase;}
        if(seguidos>250)travou=id+' preso em '+I.fase;
      }
      /* o coro nao pode acumular eco pra sempre */
      if(id==='coro'&&Array.isArray(I.ecos)&&I.ecos.length>CAN_CFG.ecosMax)
        travou='coro guardou '+I.ecos.length+' ecos';
    });
    return {travou, conta};
  });
  console.log('    turnos por fase: '+JSON.stringify(d.conta));
  ok('ninguém trava e o eco não vaza memória', !d.travou);
}

console.log('\n7. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
