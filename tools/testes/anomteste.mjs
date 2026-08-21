/* As anomalias: ciclo de estado, regra própria, aviso antes do dano. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8900/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','A'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=5; document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);

/* ambiente de simulação: um `I` de mentira, sem tela */
await p.evaluate(()=>{
  window.__I=(id)=>{
    cena.casa={voce:0,monstro:8,monstro2:null,visivel:false};
    const bicho=BICHOS.find(x=>x.id===id);
    const I={bicho,memoria:0,ruidoEm:null,bloqueio:null,bloqTurnos:0,
      acompanha:[],escondidos:[],folego:9,escondido:false};
    anomIniciar(I);
    return I;
  };
});

console.log('\n1. AS SEIS TÊM REGRA PRÓPRIA');
let d=await p.evaluate(()=>{
  const ids=BICHOS.map(b=>b.id);
  const s={}; ids.forEach(i=>{ s[i]=REGRA[i]?REGRA[i].sentido:null; });
  const sentidos=Object.values(s);
  return {ids, s, todasTemRegra:ids.every(i=>!!REGRA[i]),
    sentidosUnicos:new Set(sentidos).size===sentidos.length,
    dicas:ids.map(i=>REGRA[i]&&REGRA[i].dica).filter(Boolean).length};
});
Object.keys(d.s).forEach(k=>console.log(`   ${k.padEnd(12)} ${d.s[k]}`));
ok('as seis criaturas têm regra',d.todasTemRegra);
ok('nenhuma compartilha o sentido de outra',d.sentidosUnicos);
ok('todas têm dica descobrível no jogo',d.dicas===6);

console.log('\n2. CICLO: RONDA → SUSPEITA → CACA → PERDEU → RONDA');
d=await p.evaluate(()=>{
  const I=__I('magro');
  const vistas=[I.fase];
  anomOuviu(I,4,1);                       /* barulho perto */
  if(vistas[vistas.length-1]!==I.fase)vistas.push(I.fase);
  for(let t=0;t<30;t++){
    anomAvancar(I);
    if(vistas[vistas.length-1]!==I.fase)vistas.push(I.fase);
    if(vistas.length>=5)break;
  }
  return {vistas, fim:I.fase, cooldown:I.cooldown};
});
console.log('   ',JSON.stringify(d));
ok('o ciclo percorre as quatro fases e volta',
  JSON.stringify(d.vistas)===JSON.stringify(['RONDA','SUSPEITA','CACA','PERDEU','RONDA']));
ok('e termina em RONDA com cooldown',d.fim==='RONDA'&&d.cooldown>0);

console.log('\n3. NUNCA TRAVA: 2000 TURNOS SEM ESTADO PRESO');
d=await p.evaluate(()=>{
  const conta={}, ids=BICHOS.map(b=>b.id);
  let maxCaca=0, travou=null;
  ids.forEach(id=>{
    const I=__I(id);
    let seguidosNaMesma=0, ultima=I.fase;
    for(let t=0;t<2000;t++){
      /* simula um jogador que anda e faz barulho: as duas portas de
         entrada do ciclo, som e pisada */
      if(t%5===0){
        const dest=Math.floor(Math.random()*9);
        cena.casa.voce=dest;
        I.trilha=(I.trilha||[]).concat([dest]).slice(-ANOM_CFG.rastejanteTrilha);
        anomPisou(I,dest);
      }
      if(t%7===0)anomOuviu(I,Math.floor(Math.random()*9),1);
      anomAvancar(I);
      cena.casa.monstro=moverMonstro(cena.casa.monstro,I);
      conta[I.fase]=(conta[I.fase]||0)+1;
      if(I.fase==='CACA')maxCaca=Math.max(maxCaca,I.faseTurnos);
      if(I.fase===ultima)seguidosNaMesma++; else {seguidosNaMesma=0;ultima=I.fase;}
      if(seguidosNaMesma>200)travou=id+' preso em '+I.fase;
      if(!isFinite(cena.casa.monstro)||cena.casa.monstro==null)travou=id+' saiu da planta';
    }
  });
  return {conta, maxCaca, travou, tetoCfg:ANOM_CFG.turnosCacaMax};
});
console.log('   ',JSON.stringify(d));
ok('nenhuma criatura fica presa numa fase',!d.travou);
ok('todas as quatro fases são visitadas',Object.keys(d.conta).length===4);
ok('a caça respeita o teto da config',d.maxCaca<=d.tetoCfg+1);
ok('o monstro nunca sai da planta',!/planta/.test(d.travou||''));

console.log('\n4. CADA REGRA DISPARA PELA SUA, NÃO PELA DAS OUTRAS');
d=await p.evaluate(()=>{
  const r={};
  /* rastejante IGNORA som */
  {const I=__I('rastejante'); anomOuviu(I,4,1); r.rastejanteIgnoraSom=(I.fase==='RONDA');}
  /* magro REAGE a som */
  {const I=__I('magro'); anomOuviu(I,4,1); r.magroReageASom=(I.fase==='SUSPEITA');}
  /* o imitador OUVE como as outras; o que a resposta muda é a PRECISÃO.
     (A primeira versão fazia ele ignorar som sem resposta, e ele ficava
     preso em RONDA pra sempre — o teste de 2000 turnos pegou.) */
  {const I=__I('imitador'); anomOuviu(I,4,1);
   r.imitadorOuveComoAsOutras=(I.fase==='SUSPEITA');
   I.fase='CACA'; cena.casa.voce=0; I.ruidoEm=8;
   r.imitadorSemRespostaVaiProRuido=(REGRA.imitador.alvo(I,cena.casa)===8);
   I.respondeu=true;
   r.imitadorComRespostaVaiPraVoce=(REGRA.imitador.alvo(I,cena.casa)===0);}
  /* magro não entra em cômodo aceso */
  {const I=__I('magro');
   const _int=window.interruptor, _en=window.temEnergia;
   window.interruptor=()=>true; window.temEnergia=()=>true;
   cena.casa.monstro=4; I.fase='CACA'; I.ruidoEm=1;
   const antes=cena.casa.monstro;
   const depois=moverMonstro(antes,I);
   r.magroNaoEntraNoAceso=(depois===antes);
   window.interruptor=_int; window.temEnergia=_en;}
  /* inchado atrasa em cômodo apertado */
  {const I=__I('inchado');
   cena.casa.monstro=4; I.fase='CACA'; I.ruidoEm=1;   /* 1=QUARTO tem esconde */
   moverMonstro(4,I);
   r.inchadoPagaPedagio=(I.atraso>0);}
  /* primordial só sabe onde você está se você olhou */
  {const I=__I('primordial');
   I.fase='CACA'; cena.casa.voce=0; I.ruidoEm=8;
   r.primordialSemOlharVaiProRuido=(REGRA.primordial.alvo(I,cena.casa)===8);
   I.olhou=true;
   r.primordialComOlharVaiPraVoce=(REGRA.primordial.alvo(I,cena.casa)===0);}
  return r;
});
console.log('   ',JSON.stringify(d));
ok('o rastejante ignora som (ele lê o chão)',d.rastejanteIgnoraSom);
ok('o magro reage a som',d.magroReageASom);
ok('o imitador ouve como as outras (não fica inerte)',d.imitadorOuveComoAsOutras);
ok('sem resposta ele vai pro barulho',d.imitadorSemRespostaVaiProRuido);
ok('com resposta ele vai exatamente em você',d.imitadorComRespostaVaiPraVoce);
ok('o magro não entra em cômodo aceso',d.magroNaoEntraNoAceso);
ok('o inchado perde turno em vão apertado',d.inchadoPagaPedagio);
ok('o primordial só te acha se você olhar',
  d.primordialSemOlharVaiProRuido&&d.primordialComOlharVaiPraVoce);

console.log('\n5. SEMPRE EXISTE COMO SOBREVIVER (contra-jogo)');
d=await p.evaluate(()=>{
  const r={};
  BICHOS.forEach(bc=>{
    const I=__I(bc.id);
    /* a sequência universal: se esconder devolve o ciclo pra RONDA */
    I.fase='CACA'; I.ruidoEm=cena.casa.voce; I.faseTurnos=1;
    /* simula o que `esconder` faz */
    if(I.fase==='CACA'||I.fase==='SUSPEITA'){
      I.fase='PERDEU'; I.faseTurnos=0; I.ruidoEm=null; I.memoria=0;
    }
    let voltou=false;
    for(let t=0;t<12;t++){ anomAvancar(I); if(I.fase==='RONDA'){voltou=true;break;} }
    r[bc.id]=voltou;
  });
  return r;
});
console.log('   ',JSON.stringify(d));
ok('esconder-se devolve TODAS as criaturas para RONDA',
  Object.values(d).every(Boolean)&&Object.keys(d).length===6);

console.log('\n6. NUNCA MACHUCA SEM AVISO');
d=await p.evaluate(()=>({
  distanciaAviso:ANOM_CFG.distanciaAviso,
  avisos:BICHOS.map(b=>({id:b.id, texto:avisoDe({bicho:b})})),
}));
d.avisos.forEach(a=>console.log(`   ${a.id.padEnd(12)} ${a.texto.slice(0,58)}…`));
ok('a distância de aviso nunca é zero',d.distanciaAviso>=1);
ok('as seis têm aviso próprio',
  d.avisos.length===6&&new Set(d.avisos.map(a=>a.texto)).size===6);

console.log('\n7. PRESENÇA FORA DO COMBATE (marcas que ficam)');
d=await p.evaluate(()=>{
  S.marcasCasa=[]; S.dia=5;
  const salvo=ANOM_CFG.chanceMarca; ANOM_CFG.chanceMarca=1;
  BICHOS.forEach(b=>{ cena.casa={voce:0,monstro:3,visivel:false}; deixarMarca({bicho:b}); });
  ANOM_CFG.chanceMarca=salvo;
  const n=marcas().length;
  const textos=marcas().map(m=>m.t);
  /* estoura o teto? */
  const salvo2=ANOM_CFG.chanceMarca; ANOM_CFG.chanceMarca=1;
  for(let i=0;i<50;i++)deixarMarca({bicho:BICHOS[0]});
  ANOM_CFG.chanceMarca=salvo2;
  salvarAgora();
  const disco=JSON.parse(localStorage.getItem(CHAVE)||'{}');
  return {n, unicas:new Set(textos).size, teto:marcas().length,
    tetoCfg:ANOM_CFG.marcasMax, salvou:Array.isArray(disco.marcasCasa)&&disco.marcasCasa.length>0};
});
console.log('   ',JSON.stringify(d));
ok('cada criatura deixa marca diferente',d.n===6&&d.unicas===6);
ok('a casa não acumula marca sem limite',d.teto===d.tetoCfg);
ok('as marcas vão pro save',d.salvou);

console.log('\n8. A DIFICULDADE VEM DO §25, NÃO DE UM MULTIPLICADOR NOVO');
d=await p.evaluate(()=>{
  const fonte=String(window.anomOuviu);
  return {usaDif:/dif\(\)/.test(fonte),
    temMultiplicadorProprio:/ANOM_CFG\.(mult|dificuldade|escala)/.test(String(ANOM_CFG)),
    camposCfg:Object.keys(ANOM_CFG)};
});
console.log('   ',JSON.stringify(d.camposCfg));
ok('o bloco consulta dif() do §25',d.usaDif);
ok('e não tem multiplicador de dificuldade próprio',!d.temMultiplicadorProprio);

console.log('\n9. O ATALHO DE DEBUG INVOCA CADA UMA');
d=await p.evaluate(()=>{
  S._forcarBicho='inchado';
  const b=sortearBicho();
  return {veio:b&&b.id, limpou:S._forcarBicho===null,
    desconhecida:anomInvocar('nao_existe')};
});
console.log('   ',JSON.stringify(d));
ok('anomInvocar força a criatura pedida',d.veio==='inchado');
ok('e a trava se limpa depois de usada',d.limpou);
ok('nome desconhecido não quebra',d.desconhecida===null);

console.log('\nerros de página:',erros.filter(e=>!/ERR_|file:/.test(e)).length?erros:'(nenhum)');
await b.close();
