/* §43–§46 — retorno, achados, cicatrizes e tratamento. Etapas 5 a 8. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Final'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. PONTO DE NAO RETORNO: A VOLTA NAO E A IDA');
{
  const d=await p.evaluate(()=>{
    const _diz=window.diz; const ditas=[]; window.diz=t=>ditas.push(String(t));
    S.exploracao=null; estadoRetorno();
    cena.casa={voce:3,monstro:null,visivel:false};
    irPara(6,true);                       /* desce ao porao: camada 3 */
    const R=estadoRetorno();
    const perguntou=ditas.some(t=>/ainda consegue voltar/i.test(t));
    const bloq=R.bloqueio?{onde:R.bloqueio.onde,tipo:R.bloqueio.tipo}:null;
    /* a volta passa pelo bloqueio */
    S.hora=10; S.minutos=0; S.ruido=0;
    const antes={min:0,ruido:0};
    if(bloq){ cena.casa.voce=6; irPara(bloq.onde,true); }
    const depois={min:(S.hora-10)*60+(S.minutos|0),ruido:S.ruido};
    const bateu=ditas.some(t=>/emperrou|alagou|pilha no meio|parada, nao passando|parada, não passando/i.test(t));
    window.diz=_diz;
    return {perguntou,bloq,depois,bateu,
      soUmaVezPorDia:(function(){const a=R.perguntas;pontoDeNaoRetorno(6);return R.perguntas===a;})(),
      saidaPorao:retornoTemSaida(6), saidaQuintal:retornoTemSaida(8)};
  });
  console.log('    '+JSON.stringify(d));
  ok('descer ao anexo pergunta uma vez',      d.perguntou);
  ok('e nao pergunta de novo no mesmo dia',   d.soUmaVezPorDia);
  ok('a volta ganha um bloqueio',             !!d.bloq);
  ok('atravessar o bloqueio custa tempo',     d.depois.min>0);
  ok('e faz barulho',                         d.depois.ruido>0);
  ok('o jogo conta o que aconteceu',          d.bateu);
  ok('NUNCA prende: o porao tem saida',       d.saidaPorao===true);
  ok('nem o quintal',                         d.saidaQuintal===true);
}

console.log('\n2. DOCUMENTOS: NENHUM E SO TEXTO');
{
  const d=await p.evaluate(()=>{
    const _diz=window.diz; window.diz=()=>{};
    S.conhecimento=null; S.salSoleira=false;
    /* cada documento e lido e checa-se se ALGUMA regra do jogo mudou */
    const rel=DOCUMENTOS.map(doc=>{
      S.conhecimento=null; S.salSoleira=false;
      const antes={
        sal:temSalNaSoleira(), trilha:trilhaDobrada(),
        porta:portaDaCozinhaAbre(), leste:rotaDaAlaLeste(),
        rastAlvo:!!(REGRA.rastejante&&REGRA.rastejante.evita&&REGRA.rastejante.evita(4))
      };
      lerDocumento(doc.id);
      const C=conhecimento();
      const mudou=Object.keys(C.regras).length>0;
      return {id:doc.id,regra:doc.regra,verdadeiro:doc.verdadeiro,mudouAlgo:mudou};
    });
    /* a regra do sal muda o comportamento do Rastejante de verdade */
    S.conhecimento=null; S.salSoleira=false; S.comida=5;
    const semSaber=porSal();
    lerDocumento('doc_sal');
    const podeAgora=porSal();
    const evitaComSal=REGRA.rastejante.evita(4);
    const alvoComSal=REGRA.rastejante.alvo({ruidoEm:6,trilha:[6,3]},{voce:4});
    window.diz=_diz;
    return {rel, semSaber, podeAgora, evitaComSal, alvoComSal,
      falsasNaTabela:DOCUMENTOS.filter(x=>!x.verdadeiro).length};
  });
  d.rel.forEach(r=>console.log('    '+r.id.padEnd(20)+r.regra.padEnd(26)
    +(r.verdadeiro?'verdadeiro':'FALSO   ')+'  mudou regra: '+r.mudouAlgo));
  ok('todo documento grava uma regra',       d.rel.every(r=>r.mudouAlgo));
  ok('so UMA regra falsa na campanha',       d.falsasNaTabela===1);
  ok('sem o laudo nao da pra por sal',       d.semSaber===false);
  ok('com o laudo, da',                      d.podeAgora===true);
  ok('e o Rastejante muda de comportamento', d.evitaComSal===true&&d.alvoComSal===null);
}

console.log('\n3. A REGRA FALSA, E O DOCUMENTO QUE A CONSERTA');
{
  const d=await p.evaluate(()=>{
    const _diz=window.diz; window.diz=()=>{};
    S.conhecimento=null;
    lerDocumento('doc_sal'); lerDocumento('doc_luz');
    lerDocumento('doc_ala_leste');
    const acreditou={cre:rotaDaAlaLeste(), falsas:conhecimento().regrasFalsas.slice()};
    const c1=custoDeEntrada(6,3);
    lerDocumento('doc_ala_leste_erro');
    const depois={cre:rotaDaAlaLeste(), falsas:conhecimento().regrasFalsas.slice()};
    const c2=custoDeEntrada(6,3);
    window.diz=_diz;
    return {acreditou,depois,ruidoCrendo:c1.ruido,ruidoDepois:c2.ruido,
      fonte:conhecimento().fonte};
  });
  console.log('    acreditando: ruído '+d.ruidoCrendo+' → depois de descobrir: '+d.ruidoDepois);
  ok('o jogador passa a acreditar na mentira', d.acreditou.cre===true);
  ok('e ela custa: ele anda mais barulhento',  d.ruidoCrendo>d.ruidoDepois);
  ok('o segundo documento corrige o primeiro', d.depois.cre===false);
  ok('e a lista de falsas esvazia',            d.depois.falsas.length===0);
  ok('cada regra sabe de onde veio',           Object.keys(d.fonte).length>=3);
}

console.log('\n4. CICATRIZ: A NOITE 4 AINDA IMPORTA NA NOITE 19');
{
  const d=await p.evaluate(()=>{
    const _diz=window.diz; window.diz=()=>{};
    S.cicatrizes=[]; S.males=[]; S.dia=4;
    /* um ferimento grave que sara vira marca */
    S.males=[{id:'fratura',dias:1,tratado:0,porque:'a queda do sótão',parte:'perna_esq'}];
    for(let i=0;i<3;i++)passarSaude();
    const marcou=cicatrizes().length;
    const marca=cicatrizes()[0]||null;
    /* noite 19, chovendo: a perna cobra */
    S.dia=19; S.clima='chuva'; S.males=[];
    const comChuva=custoDeEntrada(6,3);
    S.clima='seco';
    const semChuva=custoDeEntrada(6,3);
    /* e a casa mira na marca */
    let naMarca=0;
    for(let i=0;i<300;i++){ if(escolherParte('fratura')==='perna_esq')naMarca++; }
    S.cicatrizes=[];
    let semMarca=0;
    for(let i=0;i<300;i++){ if(escolherParte('fratura')==='perna_esq')semMarca++; }
    window.diz=_diz;
    return {marcou,marca,comChuva:comChuva.tempo,semChuva:semChuva.tempo,
      residuo:comChuva.residuo, naMarca, semMarca};
  });
  console.log('    marca: '+JSON.stringify(d.marca));
  console.log('    tempo na chuva '+d.comChuva+' vs seco '+d.semChuva
    +' · a casa mira na perna quebrada '+d.naMarca+'/300 (antes '+d.semMarca+'/300)');
  ok('ferida grave curada deixa cicatriz',   d.marcou===1);
  ok('com causa e noite anotadas',           d.marca&&d.marca.noite===4&&/queda/.test(d.marca.causa));
  ok('e o residuo aparece na chuva',         d.comChuva>d.semChuva);
  ok('a casa passa a mirar na parte quebrada', d.naMarca>d.semMarca);
  ok('mas nunca vira certeza',               d.naMarca<300);
}

console.log('\n5. AS SEIS EVOLUCOES LEEM CAMPO QUE EXISTE');
{
  const d=await p.evaluate(()=>{
    S.cicatrizes=[]; S.conhecimento=null; S.exploracao=null;
    S.apagouLuzVezes=0; S.sussurroIgnorado=0; S.saidaUnicaVezes=0;
    const antes=cicatrizEstado().evolucoes;
    /* liga cada gatilho */
    S.apagouLuzVezes=7;
    S.cicatrizes=[{parte:'perna_esq',noite:3,causa:'t'},{parte:'braco_dir',noite:5,causa:'t'}];
    S.sussurroIgnorado=3;
    estadoExp().atalhosDescobertos=['porao_cozinha'];
    S.conhecimento=null; ['doc_sal','doc_luz','doc_coro'].forEach(x=>{
      const _d=window.diz; window.diz=()=>{}; lerDocumento(x); window.diz=_d; });
    estadoExp().passos=30; S.saidaUnicaVezes=6;
    const depois=cicatrizEstado().evolucoes;
    /* o efeito: o aviso do Rastejante encurta */
    const s=TELL_POR_ID['rastejante_arranhado'];
    S.cicatrizes=[]; const semMarca=Sinais.degradar(s,1).antecedencia;
    S.cicatrizes=[{parte:'perna_esq',noite:3,causa:'t'},{parte:'braco_dir',noite:5,causa:'t'}];
    const comMarca=Sinais.degradar(s,1).antecedencia;
    const imin=Sinais.degradar(TELL_POR_ID['rastejante_poeira'],.1).antecedencia;
    return {antes,depois,semMarca,comMarca,imin};
  });
  console.log('    evoluções ativas: '+d.depois.join(', '));
  console.log('    aviso do Rastejante: '+d.semMarca+' → '+d.comMarca+' com duas cicatrizes');
  ok('nenhuma evolucao ativa no comeco',   d.antes.length===0);
  ok('as seis acendem com os gatilhos',    d.depois.length===6);
  ok('e a criatura que aprendeu avisa menos', d.comMarca<d.semMarca);
  ok('TRAVA: a iminencia continua com piso 2', d.imin>=2);
}

console.log('\n6. TRATAMENTO TEM PREÇO, E QUEM TRATA TEM PODER');
{
  const d=await p.evaluate(()=>{
    const _diz=window.diz; const ditas=[]; window.diz=t=>ditas.push(String(t));
    S.males=[{id:'cortefundo',dias:8,tratado:0,porque:'t',parte:'braco_dir'}];
    const m=saude()[0];
    const opcoes=tratamentosPara(m).map(t=>t.id);
    S.ruido=0;
    const orig=window.comodoAceso; window.comodoAceso=()=>true;
    const r=aplicarTratamento('costura',m);
    window.comodoAceso=orig;
    const custou=S.ruido>0;
    /* o cuidador que e a coisa */
    S.abrigo=PESSOAS.slice(0,2).map(x=>({...x,moral:60,lacos:{},doente:0,local:4}));
    S.males=[{id:'corte',dias:4,tratado:0,porque:'t',parte:'braco_dir'}];
    const bom=tratarComNPC(saude()[0],S.abrigo[0]);
    S.males=[{id:'corte',dias:4,tratado:0,porque:'t',parte:'braco_dir'}];
    S.infiltrado=S.abrigo[1]; S.abrigo[1].falso=true;
    const antesDias=saude()[0].dias;
    const mau=tratarComNPC(saude()[0],S.abrigo[1]);
    const depoisDias=saude()[0].dias;
    const teveTell=ditas.some(t=>/mão dela está fria|ordem está errada|se dói|como quem lê/i.test(t));
    window.diz=_diz; S.infiltrado=null;
    return {opcoes,custou,preco:r?r.preco:null,bom:bom&&bom.ok,
      mau:mau&&mau.sabotado,piorou:depoisDias>antesDias,teveTell,
      total:TRATAMENTOS.length};
  });
  console.log('    opções pra um corte fundo: '+d.opcoes.join(', '));
  console.log('    costurar custou: '+d.preco);
  ok('ha cinco gestos de tratamento',     d.total===5);
  ok('costurar faz barulho',              d.custou);
  ok('e o jogo diz o preco',              !!d.preco);
  ok('o cuidador de verdade trata melhor', d.bom===true);
  ok('a coisa disfarcada SABOTA',          d.mau===true&&d.piorou===true);
  ok('e o tell sai ANTES do resultado',    d.teveTell===true);
}

console.log('\n7. INCAPACITADO: SEMPRE HA SAIDA (B7)');
{
  const d=await p.evaluate(()=>{
    const _diz=window.diz; window.diz=()=>{};
    /* pior estado possivel */
    S.males=Object.keys(MALES).map(id=>({id,dias:MALES[id].dias,tratado:0,porque:'pior caso',
      parte:'perna_esq'}));
    S.abrigo=[];
    entrarIncapacitado();
    const acoesSempre=[];
    let voltas=0, fim=null;
    for(let i=0;i<30&&!fim;i++){
      const a=acoesIncapacitado();
      acoesSempre.push(a.length);
      const r=passoIncapacitado('esperar');
      voltas++;
      if(r&&!r.ativo)fim=r.desfecho;
    }
    /* e com gente em casa, chamar funciona */
    S.abrigo=PESSOAS.slice(0,3).map(x=>({...x,moral:60,lacos:{},doente:0,local:4}));
    S.incap=null; entrarIncapacitado();
    let fim2=null;
    for(let i=0;i<30&&!fim2;i++){ const r=passoIncapacitado('chamar'); if(r&&!r.ativo)fim2=r.desfecho; }
    S.males=[]; S.incap=null;
    window.diz=_diz;
    return {minAcoes:Math.min(...acoesSempre), voltas, fim, fim2,
      watchdog:TRAT_CFG.watchdogTurnos};
  });
  console.log('    '+JSON.stringify(d));
  ok('SEMPRE ha pelo menos uma acao',      d.minAcoes>=3);
  ok('o watchdog forca desfecho',          !!d.fim);
  ok('e dentro do teto declarado',         d.voltas<=d.watchdog+1);
  ok('chamar tambem resolve',              !!d.fim2);
  ok('ZERO softlock',                      !!d.fim&&!!d.fim2);
}

console.log('\n8. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
