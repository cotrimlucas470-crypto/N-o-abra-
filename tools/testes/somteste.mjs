/* §47 — som mais perto da realidade.

   ESTE ARQUIVO JÁ TESTOU A COISA ERRADA. Fica registrado porque a lição
   custou uma entrega:

   A primeira versão media o passo contra `passo()` da linha 474 do
   index.html e concluía que o passo do jogo era "um estalo só". Aquele
   passo está MORTO — `audio-manager.js` declara outro depois, e o
   `montar.js` registra a troca em COLISAO_OK. O passo vivo é `passoEm`,
   que já tinha corpo, solado, ressonância e o pé arrastando. Testar
   contra o cadáver me fez trocar o bom pelo meu, pior.

   Agora o teste prova o contrário: que o motor do passo continua de pé. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Som'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

/* instrumentação comum: conta nós criados por tipo dentro de uma chamada */
await p.evaluate(()=>{
  window.__conta=(fn)=>{
    const r={osc:0,fonte:0,filtro:0,ganho:0,total:0,arQ04:[]};
    const oO=A.ctx.createOscillator.bind(A.ctx), oS=A.ctx.createBufferSource.bind(A.ctx);
    const oF=A.ctx.createBiquadFilter.bind(A.ctx), oG=A.ctx.createGain.bind(A.ctx);
    A.ctx.createOscillator   =()=>{r.osc++;r.total++;return oO();};
    A.ctx.createBufferSource =()=>{r.fonte++;r.total++;return oS();};
    A.ctx.createGain         =()=>{r.ganho++;r.total++;return oG();};
    A.ctx.createBiquadFilter =()=>{const f=oF();r.filtro++;r.total++;
      setTimeout(()=>{},0); r.arQ04.push(f); return f;};
    try{ fn(); } finally {
      A.ctx.createOscillator=oO; A.ctx.createBufferSource=oS;
      A.ctx.createBiquadFilter=oF; A.ctx.createGain=oG;
    }
    const ar=r.arQ04.filter(f=>f.type==='lowpass'&&Math.abs(f.Q.value-0.4)<0.01);
    r.filtrosDeAr=ar.length;
    r.corteDoAr=ar.length?Math.round(ar[0].frequency.value):null;
    delete r.arQ04;
    return r;
  };
});

console.log('\n1. A ARQUITETURA DE ÁUDIO NÃO FOI TOCADA');
{
  const d=await p.evaluate(()=>({ativo:!!A.ctx, estado:A.ctx?A.ctx.state:null,
    barramentos:Object.keys(A.mix.gan||{}), reverb:!!A.conv,
    motor:som47Estado().motorDoPassoPreservado,
    porta:som47Estado().portaJaExistia}));
  console.log('    '+JSON.stringify(d));
  ok('o AudioContext existe e roda',            d.ativo&&d.estado==='running');
  ok('os 5 barramentos continuam de pé',        d.barramentos.length===5);
  ok('o reverb continua lá',                    d.reverb);
  ok('o motor do passo (passoEm) continua lá',  d.motor===true);
  ok('a porta do jogo continua lá',             d.porta===true);
}

console.log('\n2. DISTÂNCIA: O AR COME O AGUDO');
{
  const d=await p.evaluate(()=>som47Estado());
  d.corte.forEach(c=>console.log('    '+c.comodos+' cômodo(s) → corte em '+c.hz+' Hz'));
  ok('perto é transparente',                d.corte[0].hz>=15000);
  ok('e a curva cai a cada cômodo',         d.corte.every((c,i)=>i===0||c.hz<d.corte[i-1].hz));
  ok('longe fica realmente abafado',        d.corte[3].hz<2000);
}
{
  const d=await p.evaluate(()=>({
    sem:__conta(()=>{const g=A.ctx.createGain();saida(g,{pan:0,rev:.4});}),
    com:__conta(()=>{const g=A.ctx.createGain();saida(g,{pan:0,rev:.4,dist:2});})
  }));
  console.log('    saida sem distância: '+d.sem.filtro+' filtro(s) · com distância: '+d.com.filtro);
  ok('sem dist, o caminho é o de antes (nenhum filtro)', d.sem.filtro===0);
  ok('com dist, entra exatamente um filtro de ar',       d.com.filtrosDeAr===1);
  ok('e o corte dele é o da tabela (2 cômodos)',         d.com.corteDoAr===3645);
}

console.log('\n3. O PISO VOLTOU A CHEGAR NOS CÔMODOS');
{
  const d=await p.evaluate(()=>{
    /* o mapa ANTIGO, copiado do audio-manager.js pra comparar */
    const antigo=c=>{ if(c===10)return 'terra'; if(c===0||c===9)return 'escada'; return 'madeira'; };
    const antes={}, agora={};
    const modo=cena.modo, onde=cena.casa?cena.casa.voce:null;
    for(let c=0;c<9;c++){
      antes[c]=antigo(c);
      cena.modo='casa'; cena.casa=cena.casa||{}; cena.casa.voce=c;
      agora[c]=pisoDaCena();
    }
    cena.modo=modo; if(cena.casa&&onde!=null)cena.casa.voce=onde;
    const distintas=o=>Array.from(new Set(Object.values(o)));
    return {antes,agora, distAntes:distintas(antes), distAgora:distintas(agora),
      madeiraAntes:Object.values(antes).filter(x=>x==='madeira').length,
      madeiraAgora:Object.values(agora).filter(x=>x==='madeira').length,
      superficies:Object.keys(SUP),
      todasExistem:Object.values(agora).every(s=>!!SUP[s]),
      asQuatroAntigas:['madeira','escada','concreto','terra'].every(s=>!!SUP[s])};
  });
  console.log('    antes: '+JSON.stringify(d.antes));
  console.log('    agora: '+JSON.stringify(d.agora));
  console.log('    superfícies distintas no abrigo: '+d.distAntes.length+' → '+d.distAgora.length);
  ok('o mapa antigo jogava 8 dos 9 cômodos em madeira', d.madeiraAntes===8);
  ok('e usava só 2 superfícies no abrigo inteiro',      d.distAntes.length===2);
  ok('agora o abrigo usa 6 superfícies',                d.distAgora.length===6);
  ok('e sobram 3 cômodos de madeira, os que são',       d.madeiraAgora===3);
  ok('todo cômodo aponta pra uma superfície que existe',d.todasExistem===true);
  ok('as quatro superfícies originais continuam lá',    d.asQuatroAntigas===true);
  ok('o quintal virou terra batida',                    d.agora['8']==='terra');
  ok('e o dormitório virou colchão',                    d.agora['1']==='colchao');
}

console.log('\n4. O MOTOR DO PASSO CONTINUA SENDO O DO JOGO');
{
  const d=await p.evaluate(()=>{
    cena.modo='casa'; cena.casa=cena.casa||{}; cena.casa.voce=4;   /* sala, madeira */
    return {perto:__conta(()=>passo(1,0)), longe:__conta(()=>passo(.2,0))};
  });
  console.log('    passo perto: '+d.perto.osc+' osciladores · '+d.perto.fonte+' fontes de ruído'
    +' · '+d.perto.filtro+' filtros');
  console.log('    passo longe: '+d.longe.filtrosDeAr+' filtros de ar · corte em '+d.longe.corteDoAr+' Hz');
  ok('o passo tem o corpo E a ressonância (2 osciladores)', d.perto.osc===2);
  ok('e o solado E o pé arrastando (2 fontes de ruído)',    d.perto.fonte===2);
  ok('perto NÃO recebe filtro de ar',                       d.perto.filtrosDeAr===0);
  ok('longe recebe filtro de ar em toda camada',            d.longe.filtrosDeAr===4);
  ok('e longe não perde nenhuma camada',                    d.longe.osc===d.perto.osc
                                                          && d.longe.fonte===d.perto.fonte);
  ok('o corte de um passo longe fica abaixo de 4 kHz',      d.longe.corteDoAr<4000);
}

console.log('\n5. A PORTA QUE JÁ EXISTIA, AGORA COM DISTÂNCIA');
{
  const d=await p.evaluate(()=>({
    perto:__conta(()=>somPortaAbrindo({pan:0})),
    meio: __conta(()=>somPortaAbrindo({pan:0,dist:1})),
    longe:__conta(()=>somPortaAbrindo({pan:0,dist:3})),
    ambienteZerado:som47Estado().distanciaAmbiente===0}));
  const fontes=o=>o.osc+o.fonte;
  console.log('    perto:     '+fontes(d.perto)+' fontes · '+d.perto.total+' nós · filtros de ar '+d.perto.filtrosDeAr);
  console.log('    1 cômodo:  '+fontes(d.meio)+' fontes · '+d.meio.total+' nós · ar em '+d.meio.corteDoAr+' Hz');
  console.log('    3 cômodos: '+fontes(d.longe)+' fontes · '+d.longe.total+' nós · ar em '+d.longe.corteDoAr+' Hz');
  ok('ela toca várias camadas',                    fontes(d.perto)>=4);
  ok('perto NÃO recebe filtro de ar nenhum',       d.perto.filtrosDeAr===0);
  ok('longe recebe um filtro de ar por camada',    d.longe.filtrosDeAr===fontes(d.longe));
  ok('longe NÃO perde camada — perde brilho',      fontes(d.longe)===fontes(d.perto));
  ok('e o corte cai de 1 pra 3 cômodos',           d.longe.corteDoAr<d.meio.corteDoAr);
  ok('a janela de distância fecha depois de usada',d.ambienteZerado===true);
}

console.log('\n6. O CUSTO — CONTADO, NÃO CRONOMETRADO');
{
  /* POR QUE AQUI NÃO HÁ ASSERÇÃO DE TEMPO.
     Cada som agendado deixa nós vivos no AudioContext, e a MESMA chamada
     repetida fica mais cara a cada rodada: eu medi
     1,70 · 2,35 · 4,83 · 4,68 · 6,24 · 6,24 ms para código idêntico.
     O cronômetro mede entulho. A contagem de nós é determinística, e é
     ela que diz o custo real da distância: um filtro por camada. */
  const d=await p.evaluate(()=>{
    cena.modo='casa'; cena.casa=cena.casa||{}; cena.casa.voce=4;
    const pp=__conta(()=>passo(1,0)), pl=__conta(()=>passo(.2,0));
    const dp=__conta(()=>somPortaAbrindo({pan:0})), dl=__conta(()=>somPortaAbrindo({pan:0,dist:3}));
    const med=(fn,n)=>{const t=performance.now();for(let i=0;i<n;i++)fn();
      return +((performance.now()-t)/n).toFixed(3);};
    med(()=>passo(1,0),40);
    return {passoPerto:pp.total, passoLonge:pl.total,
      portaPerto:dp.total, portaLonge:dl.total,
      tPasso:med(()=>passo(1,0),120), tPorta:med(()=>somPortaAbrindo({pan:0}),40)};
  });
  console.log('    passo: '+d.passoPerto+' nós perto · '+d.passoLonge+' longe  (+'
    +(d.passoLonge-d.passoPerto)+')');
  console.log('    porta: '+d.portaPerto+' nós perto · '+d.portaLonge+' longe  (+'
    +(d.portaLonge-d.portaPerto)+')');
  console.log('    NOTA tempo (ruidoso, informativo): passo '+d.tPasso+' ms · porta '+d.tPorta+' ms');
  ok('a distância custa 4 nós no passo — um por camada',  d.passoLonge-d.passoPerto===4);
  ok('e 10 nós na porta — um por camada',                 d.portaLonge-d.portaPerto===10);
  ok('o passo continua dentro do orçamento de 2 ms',      d.tPasso<2);
}

console.log('\n7. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
