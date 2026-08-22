/* §39 — o passo custa. Etapa 1 de 9. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Passo'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. O RELOGIO CONTA A VERDADE');
{
  const d=await p.evaluate(()=>{
    S.hora=7; S.minutos=0;
    const t0=horaTexto();
    gastarMinutos(25); const t1=horaTexto();
    gastarMinutos(50); const t2=horaTexto(); const h2=S.hora;
    S.hora=18; S.minutos=0; const acabou=gastarMinutos(90);
    return {t0,t1,t2,h2,acabou,horaFinal:S.hora};
  });
  console.log('    '+JSON.stringify(d));
  ok('o mostrador mostra minutos, nao HH:00 fixo', d.t1==='07:25');
  ok('minuto vira hora no rollover',               d.t2==='08:15'&&d.h2===8);
  ok('e o dia acaba quando tem de acabar',         d.acabou===true&&d.horaFinal===19);
}

console.log('\n2. A CASA TEM PROFUNDIDADE');
{
  const d=await p.evaluate(()=>({
    mapa:PLANTA.map(q=>[q.nome,camadaDe(q.id)]),
    nucleo:PLANTA.filter(q=>noNucleo(q.id)).map(q=>q.nome),
    faixas:[...new Set(PLANTA.map(q=>camadaDe(q.id)))].sort()
  }));
  console.log('    '+d.mapa.map(x=>x[0]+':'+x[1]).join(' · '));
  ok('todo comodo tem camada',            d.mapa.every(x=>x[1]>=0&&x[1]<=3));
  ok('as quatro faixas 0-3 sao usadas',   d.faixas.join()==='0,1,2,3');
  ok('o nucleo e SALA e QUARTO',          d.nucleo.length===2&&d.nucleo.includes('SALA'));
}

console.log('\n3. O PASSO COBRA — E ERA ZERO ANTES');
{
  const d=await p.evaluate(()=>{
    S.males=[];
    const dentro=custoDeEntrada(4,1);     /* QUARTO -> SALA: nucleo -> nucleo */
    const nucleo=custoDeEntrada(4,6);     /* PORAO -> SALA: voltar pro nucleo */
    const casa=custoDeEntrada(5,4);       /* SALA -> COZINHA */
    const borda=custoDeEntrada(2,5);      /* COZINHA -> DESPENSA */
    const anexo=custoDeEntrada(6,3);      /* OFICINA -> PORAO */
    return {dentro,nucleo,casa,borda,anexo};
  });
  console.log('    núcleo '+JSON.stringify(d.nucleo.tempo)+'min r'+d.nucleo.ruido+' s'+d.nucleo.sanidade);
  console.log('    anexo  '+JSON.stringify(d.anexo.tempo)+'min r'+d.anexo.ruido+' s'+d.anexo.sanidade);
  ok('entrar custa tempo em toda camada',   [d.dentro,d.casa,d.borda,d.anexo].every(c=>c.tempo>0));
  ok('mais fundo custa mais tempo',         d.anexo.tempo>d.borda.tempo&&d.borda.tempo>d.casa.tempo);
  ok('o nucleo nao faz barulho',            d.dentro.ruido===0);
  ok('e o anexo faz',                       d.anexo.ruido>0);
  ok('camada funda drena sanidade',         d.anexo.sanidade<0&&d.borda.sanidade<0);
  ok('a casa rasa nao drena',               d.casa.sanidade===0);
  ok('voltar do anexo pro nucleo alivia',   d.nucleo.sanidade>0);
  ok('luz e exposicao declaradas em zero',  d.anexo.luz===0&&d.anexo.exposicao===0);
}

console.log('\n4. ANDAR A CASA INTEIRA CUSTA DE VERDADE (a falha critica)');
{
  const d=await p.evaluate(()=>{
    S.hora=7; S.minutos=0; S.ruido=0; S.males=[];
    /* ATENCAO: `san()` sozinho nao serve de medida. `v9().escudo` sao 30
       pontos que absorvem a primeira queda inteira — e a armadilha que
       ja esta anotada no LEIA-ME dos testes e que derrubou a primeira
       versao DESTE teste. Mede-se o par (sanidade + escudo). */
    const bolsa=()=>((typeof san==='function')?san():100)
      +((typeof v9==='function'&&v9().escudo!=null)?v9().escudo:0);
    const b0=bolsa();
    const ordem=[0,1,2,5,4,3,6,7,8,4];
    ordem.forEach(id=>{ try{ irPara(id,true); }catch(e){} });
    return {min:(S.hora-7)*60+(S.minutos||0), ruido:S.ruido,
      san:+(bolsa()-b0).toFixed(2),
      passos:S.exploracao.passos, conhecidos:Object.values(S.exploracao.comodos).filter(c=>c.visitado).length};
  });
  console.log('    '+JSON.stringify(d));
  ok('atravessar 10 comodos consome tempo', d.min>0);
  ok('e faz barulho',                       d.ruido>0);
  ok('e cobra sanidade (contando o escudo)', d.san<0);
  ok('o passo fica gravado',                d.passos>=9);
  ok('e o comodo vira conhecido',           d.conhecidos>=9);
}

console.log('\n5. FERIDO ANDA PIOR (laco 2 da Fase 3)');
{
  const d=await p.evaluate(()=>{
    S.males=[];
    const sao=custoDeEntrada(6,3);
    S.males=[{id:'fratura',dias:16,tratado:0,porque:'teste'},
             {id:'torcao',dias:6,tratado:0,porque:'teste'},
             {id:'gripe',dias:5,tratado:0,porque:'teste'}];
    const ferido=custoDeEntrada(6,3);
    S.males=[];
    return {sao,ferido};
  });
  console.log('    são '+d.sao.tempo+'min r'+d.sao.ruido+'  ·  ferido '+d.ferido.tempo+'min r'+d.ferido.ruido);
  ok('o ferido demora mais pra atravessar', d.ferido.tempo>d.sao.tempo);
  ok('e faz mais barulho andando',          d.ferido.ruido>d.sao.ruido);
}

console.log('\n6. SAVE: MIGRA, PERSISTE E E IDEMPOTENTE');
{
  const d=await p.evaluate(()=>{
    /* save legado: sem S.exploracao, com nome de jogador */
    const legado={nomeJogador:'Veterano',dia:9};
    const a=migrarExploracao(legado);
    const b2=migrarExploracao({nomeJogador:'Veterano',dia:9,exploracao:a});
    const c=migrarExploracao({nomeJogador:'Veterano',dia:9,exploracao:b2});
    /* save de versao futura com campo que eu nao conheco */
    const fut=migrarExploracao({nomeJogador:'V',exploracao:{campoDoFuturo:42,comodos:{}}});
    return {
      veteranoConhece:Object.values(a.comodos).filter(x=>x.visitado).length,
      totalComodos:Object.keys(a.comodos).length,
      idempotente:JSON.stringify(b2)===JSON.stringify(c),
      schema:a.schemaVersion,
      preservaFuturo:fut.campoDoFuturo===42,
      semFuncao:!/function/.test(JSON.stringify(a))
    };
  });
  console.log('    '+JSON.stringify(d));
  ok('veterano nao vira novato: a casa ja e conhecida', d.veteranoConhece===d.totalComodos);
  ok('migrar duas vezes da o mesmo',                    d.idempotente);
  ok('schemaVersion existe',                            d.schema===1);
  ok('campo de save futuro e preservado',               d.preservaFuturo);
  ok('nenhuma funcao no estado',                        d.semFuncao);
}
{
  const antes=await p.evaluate(()=>{
    irPara(6,true); irPara(0,true);
    S.trilha=['ferrovelho','sitio'];
    salvar();
    return {passos:S.exploracao.passos, trilha:S.trilha.length, min:S.minutos|0};
  });
  await p.reload(); await p.waitForTimeout(1400);
  {const x=await p.$('#btn-voltar')||await p.$('#btn-boot'); if(x)await x.click();}
  await p.waitForTimeout(2600);
  const dep=await p.evaluate(()=>{ carregar();
    return {passos:S.exploracao?S.exploracao.passos:null, trilha:(S.trilha||[]).length, min:S.minutos|0}; });
  console.log('    antes '+JSON.stringify(antes)+'  depois '+JSON.stringify(dep));
  ok('os passos sobrevivem ao recarregamento', dep.passos===antes.passos);
  ok('S.trilha agora vai pro save',            dep.trilha===antes.trilha);
  ok('e o relogio de minutos junto',           dep.min===antes.min);
}

console.log('\n7. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
