/* docs/laboratorio-de-som.html — o site animado que toca os sons do jogo.

   A página copia do index.html o motor de áudio inteiro: a cadeia, o
   roteador `saida`, as cinco camadas da porta e o `passoEm` com as
   superfícies. Este harness existe pra provar que ela continua tocando o
   som DO JOGO, e não uma imitação que envelheceu em silêncio: ele conta
   as camadas de cada som e confere os cortes do filtro de ar. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:1100,height:900}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,180)));
await p.goto('http://127.0.0.1:8901/docs/laboratorio-de-som.html');
await p.waitForTimeout(1200);

console.log('\n1. A PÁGINA ABRE');
ok('a capa está lá',                 await p.$('#capa')!==null);
ok('o botão de ligar existe',        await p.$('#ligar')!==null);
ok('a planta desenhou 9 cômodos',    (await p.$$('.comodo')).length===9);
ok('nenhum erro antes do clique',    erros.length===0);

console.log('\n2. O SOM LIGA');
await p.click('#ligar'); await p.waitForTimeout(1400);
{
  const d=await p.evaluate(()=>({ctx:!!A.ctx, estado:A.ctx?A.ctx.state:null,
    ruido:!!A.ruido, conv:!!A.conv, analisador:!!A.analisador,
    superficies:Object.keys(SUP)}));
  console.log('    '+JSON.stringify(d));
  ok('o AudioContext existe e roda',  d.ctx&&d.estado==='running');
  ok('o ruído rosa foi gerado',       d.ruido);
  ok('o reverb da casa está montado', d.conv);
  ok('há 6 superfícies de piso',      d.superficies.length===6);
}

console.log('\n3. OS SONS SAEM MESMO (contando nós criados)');
{
  const d=await p.evaluate(()=>{
    const conta=(fn)=>{
      let n=0,ar=[];
      const oS=A.ctx.createBufferSource.bind(A.ctx),oO=A.ctx.createOscillator.bind(A.ctx);
      const oF=A.ctx.createBiquadFilter.bind(A.ctx);
      A.ctx.createBufferSource=()=>{n++;return oS();};
      A.ctx.createOscillator=()=>{n++;return oO();};
      A.ctx.createBiquadFilter=()=>{const f=oF();ar.push(f);return f;};
      try{fn();}finally{A.ctx.createBufferSource=oS;A.ctx.createOscillator=oO;A.ctx.createBiquadFilter=oF;}
      const arf=ar.filter(f=>f.type==='lowpass'&&Math.abs(f.Q.value-0.4)<0.01);
      return {fontes:n, ar:arf.length, corte:arf.length?Math.round(arf[0].frequency.value):null};
    };
    return {
      morto: conta(()=>passoMorto(1,0)),
      vivo:  conta(()=>passo(1,0,'madeira')),
      longe: conta(()=>passo(.2,0,'madeira')),
      porta0:conta(()=>somPortaAbrindo({pan:0})),
      porta3:conta(()=>somPortaAbrindo({pan:0,dist:3})),
      terra: conta(()=>passo(1,0,'terra')),
      colchao:conta(()=>passo(1,0,'colchao'))
    };
  });
  console.log('    passo morto: '+d.morto.fontes+' fonte(s) · passo vivo: '+d.vivo.fontes);
  console.log('    porta perto: '+d.porta0.fontes+' fontes · a 3 cômodos: '+d.porta3.fontes
    +' (ar em '+d.porta3.corte+' Hz)');
  ok('o passo morto tem 1 camada só',      d.morto.fontes===1);
  ok('o passo vivo tem 4 camadas',         d.vivo.fontes===4);
  ok('a porta tem 10 camadas',             d.porta0.fontes===10);
  ok('a porta longe não perde camada',     d.porta3.fontes===d.porta0.fontes);
  ok('e recebe filtro de ar em todas',     d.porta3.ar===10);
  ok('o corte a 3 cômodos é 1640 Hz',      d.porta3.corte===1640);
  ok('passo perto não tem filtro de ar',   d.vivo.ar===0);
  ok('passo longe tem 4 filtros de ar',    d.longe.ar===4);
  ok('colchão soa (mesmo que quase nada)', d.colchao.fontes>=3);
  ok('terra também',                       d.terra.fontes===4);
}

console.log('\n4. O MAPA DE PISO TROCA');
{
  const antes=await p.$$eval('.comodo .piso',es=>es.map(e=>e.textContent));
  await p.click('#mapa-toggle'); await p.waitForTimeout(300);
  const depois=await p.$$eval('.comodo .piso',es=>es.map(e=>e.textContent));
  const madeira=v=>v.filter(x=>x==='madeira').length;
  console.log('    agora: '+JSON.stringify(antes));
  console.log('    antes: '+JSON.stringify(depois));
  ok('o mapa de agora tem 3 de madeira',   madeira(antes)===3);
  ok('o mapa antigo tem 8 de madeira',     madeira(depois)===8);
  ok('e o de agora usa 6 superfícies',     new Set(antes).size===6);
  await p.click('#mapa-toggle'); await p.waitForTimeout(200);
}

console.log('\n5. O OSCILOSCÓPIO PINTA');
{
  const d=await p.evaluate(async()=>{
    const c=document.getElementById('escopo-dist');
    const ctx=c.getContext('2d');
    somPortaAbrindo({pan:0});
    await new Promise(r=>setTimeout(r,800));
    const px=ctx.getImageData(0,0,c.width,c.height).data;
    let acesos=0; for(let i=3;i<px.length;i+=4) if(px[i]>12) acesos++;
    return {acesos, total:px.length/4};
  });
  console.log('    pixels acesos no espectro: '+d.acesos+' de '+d.total);
  ok('o espectro desenha alguma coisa', d.acesos>500);
}

console.log('\n6. O MODO VÍDEO ANDA');
{
  await p.click('#bplay'); await p.waitForTimeout(1500);
  const t=await p.evaluate(()=>({txt:document.getElementById('bplay').textContent,
    cap:document.getElementById('capitulo').textContent, y:scrollY}));
  console.log('    '+JSON.stringify(t));
  ok('o botão vira "parar"',        /parar/.test(t.txt));
  ok('e a página rolou sozinha',    t.y>200);
  await p.click('#bplay'); await p.waitForTimeout(300);
  ok('e dá pra parar',              /tocar tudo/.test(await p.$eval('#bplay',e=>e.textContent)));
}

console.log('\n7. NADA QUEBROU');
await p.waitForTimeout(600);
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await p.screenshot({path:(process.env.FOTOS||'/tmp')+'/lab-capa.png'});
await p.evaluate(()=>document.querySelector('[data-cap="o piso"]').scrollIntoView());
await p.waitForTimeout(900);
await p.screenshot({path:(process.env.FOTOS||'/tmp')+'/lab-piso.png'});
await b.close();
