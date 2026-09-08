/* §56 — a camada de ameaça estendida.

   Este bloco é fundação para os dois invasores novos, e ele foi escrito
   para NÃO MUDAR NADA nas seis criaturas que já existem. Isso não é
   modéstia: é a única forma de saber, depois, que uma mudança de
   comportamento veio do invasor novo e não de efeito colateral meu.

   Por isso a asserção principal aqui é incomum — o harness roda a MESMA
   simulação, com a MESMA semente, no build anterior (porta 8906) e no
   atual (8901), e exige trilha idêntica criatura por criatura.

   E a armadilha que este bloco tinha de evitar: `anomAvancar` decide por
   comparação de string, então fase nova não casa com ramo nenhum, não
   faz nada, e a criatura fica presa nela PARA SEMPRE. Este jogo já teve
   duas criaturas inertes por isso. As 2000 rodadas estão aqui de novo,
   agora incluindo as fases novas. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const erros=[];

async function abrir(porta){
  const p=await b.newPage({viewport:{width:390,height:844}});
  p.on('pageerror',e=>erros.push(porta+': '+e.message.slice(0,120)));
  await p.goto('http://127.0.0.1:'+porta+'/index.html'); await p.waitForTimeout(900);
  await p.click('#btn-boot'); await p.waitForTimeout(1300);
  {const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
  await p.fill('#nm','Ameaca'); await p.click('#go'); await p.waitForTimeout(700);
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
      anomIniciar(I);
      return I;
    };
    /* MESMA simulação nos dois lados, e nada de Math.random: um passo
       determinístico, senão a comparação não quer dizer nada. */
    window.__trilha=(id,n)=>{
      /* SEMENTE FIXA DOS DOIS LADOS. `S.saveId` nasce de
         Date.now() + hash de Math.random(), ou seja, e diferente a cada
         carga da pagina — comparar dois builds sem fixar isso compara
         dois fluxos de sorteio diferentes, e foi o que a primeira versao
         fez: as seis criaturas "divergiam" e o motivo era o meu teste. */
      S.saveId='ameacateste'; S.dia=1; delete S.rngEstado;
      semearRNG();
      const I=__I(id);
      const t=[];
      for(let k=0;k<n;k++){
        if(k%5===0){ const dest=(k*7+3)%9;
          cena.casa.voce=dest;
          I.trilha=(I.trilha||[]).concat([dest]).slice(-ANOM_CFG.rastejanteTrilha);
          anomPisou(I,dest); }
        if(k%7===0)anomOuviu(I,(k*5+1)%9,1);
        anomAvancar(I);
        cena.casa.monstro=moverMonstro(cena.casa.monstro,I);
        t.push(I.fase[0]+cena.casa.monstro);
      }
      return t.join(',');
    };
  });
  return p;
}
const pNovo=await abrir(8901);
const pVelho=await abrir(8906);

console.log('\n1. NADA MUDOU NAS SEIS QUE JÁ EXISTIAM');
{
  /* SO as criaturas que existem NOS DOIS builds. O Observador entrou
     depois, e pedir a trilha dele ao build antigo compara uma criatura
     com o nada. A promessa deste teste e sobre quem ja existia. */
  const idsNovo=await pNovo.evaluate(()=>BICHOS.map(x=>x.id));
  const idsVelho=await pVelho.evaluate(()=>BICHOS.map(x=>x.id));
  const ids=idsNovo.filter(i=>idsVelho.indexOf(i)>=0);
  console.log('    criaturas nos dois builds: '+ids.join(', '));
  console.log('    só no build novo: '+(idsNovo.filter(i=>ids.indexOf(i)<0).join(', ')||'nenhuma'));
  const a=await pVelho.evaluate(ids=>Object.fromEntries(ids.map(i=>[i,__trilha(i,400)])),ids);
  const c=await pNovo.evaluate(ids=>Object.fromEntries(ids.map(i=>[i,__trilha(i,400)])),ids);
  const difere=ids.filter(i=>a[i]!==c[i]);
  console.log('    '+ids.length+' criaturas · 400 turnos cada, mesma sequência dos dois lados');
  console.log('    trilhas diferentes: '+(difere.length?difere.join(', '):'nenhuma'));
  ok('a simulação rodou nos dois builds', Object.keys(a).length===ids.length);
  ok('e o comportamento das seis é idêntico', difere.length===0);
}

console.log('\n2. OS CANAIS DESCREVEM A REGRA, NÃO DIVERGEM DELA');
{
  const d=await pNovo.evaluate(()=>{
    const e=ameacaEstado();
    const divergem=Object.keys(e.canais).filter(k=>
      !REGRA[k]||REGRA[k].sentido!==e.canais[k].primario);
    const semTabelaN=BICHOS.map(x=>x.id).filter(k=>!e.canais[k]);
    return {canais:e.canais, divergem,
      semTabela:semTabelaN,
      /* na etapa 2 nenhum canal extra ainda: eles são a etapa 5 */
      /* a etapa 5 e que dara canal extra as SEIS originais; criatura
         nova pode nascer com os canais dela */
      extras:['magro','rastejante','coro','imitador','inchado','primordial']
        .filter(k=>e.canais[k]&&e.canais[k].tambem.length)};
  });
  Object.keys(d.canais).forEach(k=>console.log('    '+k.padEnd(11)
    +' primário '+d.canais[k].primario.padEnd(10)
    +' também: '+(d.canais[k].tambem.join(', ')||'—')
    +' · lembra: '+d.canais[k].lembra));
  ok('toda criatura tem entrada na tabela', d.semTabela.length===0);
  ok('e o primário é o mesmo sentido da REGRA', d.divergem.length===0);
  ok('nenhum canal extra ainda (isso é a etapa 5)', d.extras.length===0);
}

console.log('\n3. AS FASES NOVAS EXISTEM — E TÊM SAÍDA');
{
  const d=await pNovo.evaluate(()=>{
    const e=ameacaEstado();
    const r={};
    e.fasesNovas.forEach(f=>{
      const I=__I('magro');
      amePorFase(I,f);
      let saiu=-1;
      for(let t=0;t<60;t++){ anomAvancar(I); if(I.fase!==f){saiu=t+1;break;} }
      r[f]={saiu, virou:I.fase};
    });
    return {fases:e.fases, novas:e.fasesNovas, r, cfg:e.cfg};
  });
  console.log('    fases agora: '+d.fases.join(', '));
  Object.keys(d.r).forEach(f=>console.log('    '+f.padEnd(10)+' sai em '
    +d.r[f].saiu+' turnos, pra '+d.r[f].virou));
  ok('as duas fases novas entraram na lista',
     d.novas.every(f=>d.fases.indexOf(f)>=0));
  ok('e NENHUMA delas é cadeia perpétua',
     Object.values(d.r).every(x=>x.saiu>0&&x.saiu<=60));
  ok('a saída respeita o teto declarado',
     d.r.RECUANDO.saiu<=d.cfg.recuandoMax+1&&d.r.OCULTO.saiu<=d.cfg.ocultoMax+1);
}

console.log('\n4. 2000 TURNOS, INCLUINDO AS FASES NOVAS, SEM NINGUÉM PRESO');
{
  const d=await pNovo.evaluate(()=>{
    const conta={}; let travou=null;
    BICHOS.map(x=>x.id).forEach(id=>{
      const I=__I(id);
      let seguidos=0, ultima=I.fase;
      for(let t=0;t<2000;t++){
        /* de vez em quando jogo a criatura numa fase nova de propósito:
           é exatamente aí que o travamento apareceria */
        if(t%137===0)amePorFase(I,t%274===0?'OCULTO':'RECUANDO');
        if(t%5===0){ const dest=(t*7+3)%9; cena.casa.voce=dest;
          I.trilha=(I.trilha||[]).concat([dest]).slice(-ANOM_CFG.rastejanteTrilha);
          anomPisou(I,dest); }
        if(t%7===0)anomOuviu(I,(t*5+1)%9,1);
        anomAvancar(I);
        cena.casa.monstro=moverMonstro(cena.casa.monstro,I);
        conta[I.fase]=(conta[I.fase]||0)+1;
        if(I.fase===ultima)seguidos++; else {seguidos=0;ultima=I.fase;}
        if(seguidos>200)travou=id+' preso em '+I.fase;
        if(!isFinite(cena.casa.monstro)||cena.casa.monstro==null)travou=id+' saiu da planta';
      }
    });
    return {conta, travou};
  });
  console.log('    turnos por fase: '+JSON.stringify(d.conta));
  ok('ninguém fica preso',            !d.travou);
  ok('e as fases novas foram exercidas',
     (d.conta.RECUANDO||0)>0&&(d.conta.OCULTO||0)>0);
}

console.log('\n5. A MEMÓRIA GRAVA — E AINDA NÃO MANDA EM NINGUÉM');
{
  const d=await pNovo.evaluate(()=>{
    S.ameaca={}; S.dia=4;
    const I=__I('magro');
    ameAnotar(I,{viu:true});
    ameAnotar(I,{perdeuEm:6});
    const m=ameacaEstado().memoria.magro;
    /* nenhuma das seis declara `lembra`, então a leitura tem de dar nulo */
    const leem=Object.keys(ameacaEstado().canais).filter(k=>!!ameLembra(k));
    S.nomeJogador=S.nomeJogador||'Ameaca';
    salvar();
    let o={}; try{ o=JSON.parse(localStorage.getItem(CHAVE)||'{}'); }catch(e){}
    return {m, leem, noSave:!!(o.ameaca&&o.ameaca.magro)};
  });
  console.log('    memória do magro: '+JSON.stringify(d.m));
  console.log('    criaturas que LEEM a memória hoje: '+(d.leem.length?d.leem.join(', '):'nenhuma'));
  ok('a memória grava noite, avistamento e onde te perdeu',
     d.m&&d.m.noites>0&&d.m.viuVoce===1&&d.m.perdeuEm===6);
  ok('nenhuma das seis lê a memória (por isso nada mudou)', d.leem.length===0);
  ok('e ela vai pro save',                d.noSave);
}

console.log('\n6. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
