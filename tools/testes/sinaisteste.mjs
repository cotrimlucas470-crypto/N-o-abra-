/* §40 — sinais como contrato. Etapa 2 de 9. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Sinal'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. O CONTRATO EXISTE E ESTA INTEIRO');
{
  const d=await p.evaluate(()=>({cob:sinaisCobertura(), total:TELLS.length,
    api:['emitir','foiEmitido','degradar','inconsistenciaDe'].filter(k=>typeof Sinais[k]==='function')}));
  d.cob.forEach(c=>console.log('    '+c.criatura.padEnd(11)+c.sinais+' sinais · '+c.canais.join('/')));
  ok('as seis criaturas tem sinal',        d.cob.length===6&&d.cob.every(c=>c.sinais>=3));
  ok('cada uma em dois canais ou mais',    d.cob.every(c=>c.canais.length>=2));
  ok('todas tem iminencia',                d.cob.every(c=>c.fases.includes('iminencia')));
  ok('nenhuma iminencia e omitivel',       d.cob.every(c=>!c.iminenciaOmitivel));
  ok('falsificavel sempre tem inconsistencia', d.cob.every(c=>c.falsificaveisSemInconsistencia===0));
  ok('a API tem os quatro metodos',        d.api.length===4);
}

console.log('\n2. A MATRIZ DE DEGRADACAO, E AS DUAS TRAVAS DE JUSTICA');
{
  const d=await p.evaluate(()=>{
    const base=TELL_POR_ID['magro_estalo'];      /* aproximacao, antec 4 */
    const imin=TELL_POR_ID['magro_ar'];          /* iminencia,   antec 2 */
    const linha=s=>({s, ap:Sinais.degradar(base,s).antecedencia,
                        im:Sinais.degradar(imin,s).antecedencia,
                        falsos:(function(){const f=SIN_MATRIZ.find(x=>s>=x.min);return f.falsos;})()});
    return {curva:[1,.7,.4,.1].map(linha),
      /* o Primordial melhora com a cabeca ruim, em vez de piorar */
      primLucido:Sinais.degradar(TELL_POR_ID['primordial_ausencia'],1).antecedencia,
      primRuim:Sinais.degradar(TELL_POR_ID['primordial_ausencia'],.1).antecedencia,
      /* puro: nao mexe no original */
      original:base.antecedencia};
  });
  d.curva.forEach(l=>console.log('    san '+l.s+'  aproximação '+l.ap+'  iminência '+l.im+'  falsos/noite '+l.falsos));
  ok('a antecedencia encurta com a sanidade', d.curva[0].ap>d.curva[3].ap);
  ok('TRAVA 1: iminencia nunca abaixo de 2 turnos', d.curva.every(l=>l.im>=2));
  ok('mais falsos conforme piora',            d.curva[3].falsos>d.curva[0].falsos);
  ok('lúcido nao tem sinal falso',            d.curva[0].falsos===0);
  ok('o Primordial fica MAIS legivel na cabeça ruim', d.primRuim>d.primLucido);
  ok('degradar e puro: nao muda o original',  d.original===4);
}

console.log('\n3. A ISCA NAO PODE MENTIR SOBRE O ULTIMO AVISO');
{
  const d=await p.evaluate(()=>{
    S.sinais=null;
    const forjaAprox=Sinais.emitir('magro_estalo',{comodo:4,turno:1,forjado:true,calado:true});
    const forjaImin =Sinais.emitir('magro_ar',   {comodo:4,turno:1,forjado:true,calado:true});
    const semInconsist=Sinais.emitir('primordial_ausencia',{comodo:4,turno:1,forjado:true,calado:true});
    return {aprox:!!forjaAprox, imin:!!forjaImin, semInc:!!semInconsist,
      incMagro:Sinais.inconsistenciaDe('magro_estalo'),
      incLimpo:Sinais.inconsistenciaDe('magro_ar')};
  });
  console.log('    '+JSON.stringify(d));
  ok('a casa pode forjar aproximacao',        d.aprox===true);
  ok('mas NUNCA a iminencia',                 d.imin===false);
  ok('nem sinal sem inconsistencia declarada', d.semInc===false);
  ok('isca forjada tem como ser lida',        !!d.incMagro);
  ok('e o sinal honesto nao tem inconsistencia', d.incLimpo===null);
}

console.log('\n4. foiEmitido: A ASSERCAO PRE-DANO');
{
  const d=await p.evaluate(()=>{
    S.sinais=null;
    const antes=Sinais.foiEmitido('magro',4);
    Sinais.emitir('magro_estalo',{comodo:4,turno:10,calado:true});
    const depois=Sinais.foiEmitido('magro',4,6);
    const outra=Sinais.foiEmitido('inchado',4,6);
    Sinais.emitir('magro_estalo',{comodo:4,turno:10,forjado:true,calado:true});
    S.sinais.emitidos=S.sinais.emitidos.filter(e=>e.forjado);
    const soForjado=Sinais.foiEmitido('magro',4,6);
    return {antes,depois,outra,soForjado};
  });
  console.log('    '+JSON.stringify(d));
  ok('sem sinal, foiEmitido diz nao',      d.antes===false);
  ok('com sinal, diz sim',                 d.depois===true);
  ok('sinal de OUTRA criatura nao serve',  d.outra===false);
  ok('sinal FORJADO nao conta como aviso', d.soForjado===false);
}

console.log('\n5. DANO DE CRIATURA SEM AVISO CONTA VIOLACAO');
{
  const d=await p.evaluate(()=>{
    S.sinais=null; S.males=[];
    pegarMal('mordida',null,'o magro');            /* sem sinal antes */
    const semAviso=S.sinais.violacoes;
    S.males=[];
    Sinais.emitir('inchado_doce',{comodo:(cena.casa?cena.casa.voce:4),turno:1,calado:true});
    pegarMal('febre',null,'o inchado');            /* com sinal antes */
    const comAviso=S.sinais.violacoes;
    S.males=[];
    pegarMal('torcao',null,'correr no escuro');    /* nao e criatura */
    const queda=S.sinais.violacoes;
    S.males=[];
    return {semAviso,comAviso,queda};
  });
  console.log('    violações: sem aviso '+d.semAviso+' · com aviso '+d.comAviso+' · queda '+d.queda);
  ok('ferimento de criatura sem sinal conta violacao', d.semAviso===1);
  ok('com sinal antes, nao conta',                     d.comAviso===1);
  ok('queda nao exige tell de criatura',               d.queda===1);
}

console.log('\n6. UMA NOITE DE VERDADE: A CRIATURA AVISA ANTES DE CHEGAR');
{
  const d=await p.evaluate(async()=>{
    S.sinais=null; S.males=[];
    /* A SALA e o miolo da planta: nada fica a mais de 2 comodos dela, e
       a primeira versao deste teste pos o jogador la e a criatura em
       comodos vizinhos — dando distancia 1 em TODOS os turnos, entao a
       fase de aproximacao nunca acontecia. E a armadilha que ja esta
       escrita no LEIA-ME. O par mais distante da casa e SOTAO(0) e
       QUINTAL(8): distancia 4. */
    const VOCE=0;   /* SOTAO */
    cena.casa={voce:VOCE,monstro:8,monstro2:null,visivel:true};
    const I={turno:0,bicho:BICHOS.find(x=>x.id==='inchado'),memoria:0,ruidoEm:null,
      folego:9,bloqueio:null,bloqTurnos:0,acompanha:[],escondidos:[]};
    const linha=[];
    for(const pos of [8,7,4,1,0]){
      I.turno++;
      cena.casa.monstro=pos;
      const dist=distancia(VOCE,pos);
      const fase=dist<=1?'iminencia':'aproximacao';
      /* mesma selecao do embrulho de `turnoMonstro`: a antecedencia
         degradada vira distancia de disparo, e so dispara quem alcanca */
      const cand=Sinais.daCriatura('inchado',fase)
        .map(x=>({x,d:Sinais.degradar(x)}))
        .filter(o=>sinDistanciaDeDisparo(o.d)>=dist)
        .filter(o=>!sinEstado().emitidos.some(e=>e.id===o.x.id));
      cand.sort((a,b)=>sinDistanciaDeDisparo(a.d)-sinDistanciaDeDisparo(b.d));
      const emitiu=cand.length?cand[0].x:null;
      if(emitiu&&dist>0)Sinais.emitir(emitiu.id,{comodo:pos,turno:I.turno,calado:true});
      linha.push({turno:I.turno,dist,fase,sinal:emitiu?emitiu.id:null});
    }
    const avisouAntes=Sinais.foiEmitido('inchado',0,9);
    return {linha,avisouAntes,emitidos:sinEstado().emitidos.length};
  });
  d.linha.forEach(l=>console.log('    turno '+l.turno+' · '+l.dist+' cômodos · '+l.fase.padEnd(12)+(l.sinal||'—')));
  ok('a aproximacao produz sinal antes do contato',
     d.linha.filter(l=>l.sinal&&l.fase==='aproximacao').length>=2);
  ok('e a iminencia aparece quando ele encosta',    d.linha.some(l=>l.fase==='iminencia'&&l.sinal));
  ok('no fim, houve aviso registrado',              d.avisouAntes===true);
}

console.log('\n7. ESTADO PURO E PERSISTENTE');
{
  const d=await p.evaluate(()=>{
    S.sinais=null;
    Sinais.emitir('coro_vozes',{comodo:2,turno:3,calado:true});
    const puro=!/function/.test(JSON.stringify(S.sinais));
    const a=migrarSinais({sinais:S.sinais,dia:1});
    const b2=migrarSinais({sinais:a,dia:1});
    const fut=migrarSinais({sinais:{campoNovo:7,emitidos:[]},dia:1});
    return {puro, idem:JSON.stringify(a)===JSON.stringify(b2), schema:a.schemaVersion,
      futuro:fut.campoNovo===7, ciclo:JSON.parse(JSON.stringify(S.sinais)).emitidos.length};
  });
  console.log('    '+JSON.stringify(d));
  ok('nenhuma funcao no estado',        d.puro);
  ok('sobrevive a JSON ida e volta',    d.ciclo===1);
  ok('migrar duas vezes da o mesmo',    d.idem);
  ok('schemaVersion existe',            d.schema===1);
  ok('campo de save futuro preservado', d.futuro);
}

console.log('\n8. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
