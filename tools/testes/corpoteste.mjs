/* §41 — um corpo só. Etapa 3 de 9. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Corpo'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. UM CORPO SO: O CONTADOR PARALELO MORREU');
{
  const d=await p.evaluate(()=>{
    S.males=[];
    const zero=S.ferido;
    S.males=[{id:'corte',dias:4,tratado:0,porque:'t',parte:'braco_dir'}];
    const umCorte=S.ferido;
    S.males.push({id:'fratura',dias:16,tratado:0,porque:'t',parte:'perna_esq'});
    const comFratura=S.ferido;
    S.males.push({id:'febre',dias:5,tratado:0,porque:'t'});
    const comDoenca=S.ferido;
    /* escrever nele nao ressuscita o sistema paralelo */
    const antesEsc=feridoEscritasRecusadas();
    S.ferido=99;
    const depoisDeEscrever=S.ferido;
    return {zero,umCorte,comFratura,comDoenca,depoisDeEscrever,
      recusou:feridoEscritasRecusadas()>antesEsc};
  });
  console.log('    '+JSON.stringify(d));
  ok('sem mal nenhum, ferido e zero',      d.zero===0);
  ok('um corte da 1 (grav do mal)',        d.umCorte===1);
  ok('uma fratura por cima da 5',          d.comFratura===5);
  ok('doenca nao conta como ferida',       d.comDoenca===d.comFratura);
  ok('escrever em S.ferido nao faz nada',  d.depoisDeEscrever===5);
  ok('e a escrita fica registrada',        d.recusou===true);
}

console.log('\n2. NENHUM SITIO ESCREVE MAIS NO CONTADOR');
{
  const d=await p.evaluate(async()=>{
    S.males=[]; const antes=feridoEscritasRecusadas();
    /* passa pelos caminhos que antes somavam no contador */
    ferirPor('obra'); ferirPor('gente'); ferirPor('queda'); ferirPor('bicho');
    const criou=saude().length;
    const r=sararUmPouco();
    return {antes, depois:feridoEscritasRecusadas(), criou, sarou:Array.isArray(r)};
  });
  console.log('    '+JSON.stringify(d));
  ok('as fontes de dano criam males de verdade', d.criou>=2);
  ok('e nenhuma escreve no contador',            d.depois===d.antes);
  ok('sararUmPouco continua devolvendo texto',   d.sarou);
}

console.log('\n3. TODA FERIDA TEM ENDERECO');
{
  const d=await p.evaluate(()=>{
    S.males=[];
    for(let i=0;i<40;i++){ S.males=[]; ferirPor(['bicho','queda','gente','obra','fogo'][i%5]); }
    S.males=[];
    const amostra=[];
    ['corte','cortefundo','torcao','fratura','queimadura','mordida','pancada'].forEach(id=>{
      S.males=[]; pegarMal(id,null,'teste');
      const m=saude()[0];
      amostra.push({id,parte:m?m.parte:null,regiao:m&&m.parte?regiaoDaParte(m.parte):null});
    });
    S.males=[];
    return {amostra, partes:PARTES.length, regioes:REGIOES};
  });
  d.amostra.forEach(a=>console.log('    '+a.id.padEnd(12)+(a.parte||'—').padEnd(15)+'→ '+(a.regiao||'—')));
  ok('as sete partes existem',            d.partes===7);
  ok('toda ferida nasce com parte',       d.amostra.every(a=>a.parte));
  ok('torcao cai sempre na perna',        d.amostra.find(a=>a.id==='torcao').parte.startsWith('perna'));
  ok('pancada cai em cabeca ou torso',    ['cabeca','torso'].includes(d.amostra.find(a=>a.id==='pancada').parte));
  ok('a parte mapeia numa regiao de armadura', d.amostra.every(a=>d.regioes.includes(a.regiao)));
}

console.log('\n4. custa.atencao DEIXOU DE SER MENTIRA IMPRESSA');
{
  const d=await p.evaluate(()=>{
    S.males=[];
    const sinal=TELL_POR_ID['inchado_doce'];    /* antecedencia 6 -> 3 comodos */
    const sao=Sinais.degradar(sinal,1);
    S.males=[{id:'pancada',dias:5,tratado:0,porque:'t',parte:'cabeca'},
             {id:'insonia',dias:5,tratado:0,porque:'t'}];
    const at=custoSaude().atencao;
    const batido=Sinais.degradar(sinal,1);
    /* a trava de justica continua valendo por cima */
    const imin=Sinais.degradar(TELL_POR_ID['inchado_umidade'],1);
    S.males=[];
    return {at:+at.toFixed(2), saAnt:sao.antecedencia, batAnt:batido.antecedencia,
      saDist:sinDistanciaDeDisparo(sao), batDist:sinDistanciaDeDisparo(batido),
      iminAnt:imin.antecedencia, cobrada:batido.atencaoCobrada};
  });
  console.log('    atenção cobrada '+d.at+' · antecedência '+d.saAnt+' → '+d.batAnt
    +' · o cheiro vinha a '+d.saDist+' cômodos, agora vem a '+d.batDist);
  ok('cabeca batida cobra atencao',            d.at>0);
  ok('e o aviso passa a chegar mais tarde',    d.batAnt<d.saAnt);
  ok('perto o bastante pra o jogador sentir',  d.batDist<d.saDist);
  ok('o campo aparece no sinal degradado',     d.cobrada>0);
  ok('TRAVA: iminencia continua com piso 2',   d.iminAnt>=2);
}

console.log('\n5. custa.agua E MALES.dente');
{
  const d=await p.evaluate(()=>{
    S.males=[]; S.agua=5;
    passarSaude();
    const semBarriga=S.agua;
    S.agua=5; S.males=[{id:'barriga',dias:4,tratado:0,porque:'t'}];
    passarSaude();
    const comBarriga=S.agua;
    S.males=[];
    /* dente: era o unico dos 19 inalcancavel */
    let achou=false;
    for(let i=0;i<200&&!achou;i++){ S.males=[]; adoecerPor('comida'); achou=saude().some(m=>m.id==='dente'); }
    S.males=[];
    const tabelas=['bicho','queda','fogo','gente','mato','obra'].map(f=>{const o=[];
      for(let i=0;i<80;i++){S.males=[];const m=ferirPor(f);if(m)o.push(m.n);} return o;});
    S.males=[];
    return {semBarriga, comBarriga, denteAlcancavel:achou, total:Object.keys(MALES).length};
  });
  console.log('    água sem barriga '+d.semBarriga+' · com barriga '+d.comBarriga
    +' · dente alcançável: '+d.denteAlcancavel);
  ok('barriga custa agua de verdade',    d.comBarriga<d.semBarriga);
  ok('e sem ela a agua nao some',        d.semBarriga===5);
  ok('MALES.dente deixou de ser inalcancavel', d.denteAlcancavel===true);
}

console.log('\n6. O CORPO EM PALAVRAS, NAO EM PORCENTAGEM');
{
  const d=await p.evaluate(()=>{
    S.males=[{id:'torcao',dias:6,tratado:0,porque:'t',parte:'perna_dir'},
             {id:'cortefundo',dias:8,tratado:0,porque:'t',parte:'mao_dominante'},
             {id:'febre',dias:5,tratado:0,porque:'t'}];
    const l=corpoEmPalavras();
    S.males=[];
    return {linhas:l, temNumero:l.some(t=>/\d+\s*%/.test(t))};
  });
  d.linhas.forEach(t=>console.log('    "'+t+'"'));
  ok('a ficha fala do corpo em frases',      d.linhas.length>=3);
  ok('nenhuma linha tem porcentagem',        d.temNumero===false);
  ok('a perna diz o que ela impede',         d.linhas.some(t=>/manca|correr/i.test(t)));
  ok('a mao diz o que ela impede',           d.linhas.some(t=>/treme|precis/i.test(t)));
}

console.log('\n7. SAVE LEGADO NAO PERDE NADA');
{
  const d=await p.evaluate(()=>{
    /* jogador veterano que estava ferido no sistema antigo */
    S.males=[];
    const legado=S._feridoLegado;
    const derivadoAgora=S.ferido;
    return {legadoGuardado:legado!==undefined, derivadoAgora,
      saveTemFerido:(function(){try{const d=JSON.parse(localStorage.getItem(CHAVE)||'{}');
        return 'ferido' in d;}catch(e){return null;}})()};
  });
  console.log('    '+JSON.stringify(d));
  ok('o valor legado foi guardado na migracao', d.legadoGuardado===true);
  ok('e o derivado responde do zero',           d.derivadoAgora===0);
}

console.log('\n8. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
