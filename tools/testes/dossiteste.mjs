/* §61 — A ANOMALIA VIVA.
   A assercao que importa: repetir o mesmo metodo FECHA aquela saida e
   ABRE outra, e o jogador e avisado. Tudo o mais e contabilidade. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(1400);
await p.evaluate(()=>{ semearRNG(4242); S.dia=1; S.dossies={}; S.passivasAtivas=[]; });

console.log('\n1. AS SEIS FUNÇÕES COBREM O CATÁLOGO INTEIRO');
{
  const d=await p.evaluate(()=>{
    const ids=Object.keys(CATALOGO_ANOM);
    const semFuncao=ids.filter(i=>!FUNCAO_DE[i]);
    const porF={}; ids.forEach(i=>{const f=funcaoDe(i);porF[f]=(porF[f]||0)+1;});
    return {total:ids.length, semFuncao, porF, funcoes:Object.keys(FUNCOES)};
  });
  console.log('    '+d.total+' anomalias · por função: '+JSON.stringify(d.porF));
  console.log('    sem função declarada: '+(d.semFuncao.length?d.semFuncao.join(', '):'nenhuma'));
  ok('toda anomalia do catálogo tem função declarada', d.semFuncao.length===0);
  ok('e as seis funções são usadas', Object.keys(d.porF).length===6);
}

console.log('\n2. REPETIR O MESMO MÉTODO FAZ ELA APRENDER');
{
  /* A PRIMEIRA VERSAO DESTE BLOCO PASSAVA POR SORTE.
     Ela martelava 'fugiu' no Magro e cobrava que 'esconder' aparecesse
     na lista. Só que a lista base do Magro JÁ TEM 'esconder' — então a
     assertion era verdadeira com ou sem a linha que abre a saída nova.
     Plantei a regressão (tirei o passo que abre) e ela passou verde.
     Assertion que passa pelo motivo errado é pior que assertion nenhuma.

     Agora o método martelado é 'luz', cuja saída nova é 'som' — e 'som'
     NÃO está na base do Magro. Só abre se o código abrir. */
  const d=await p.evaluate(()=>{
    S.dossies={}; S.dia=5;
    const id='bicho_magro', metodo='luz';
    const antes=resolucoesVivas(id).slice();
    const abreEm=MUTACOES[metodo].abre;
    const passos=[];
    for(let i=1;i<=4;i++){
      const m=dossiUsou(id,metodo);
      passos.push({vez:i, mutou:!!m, vivas:resolucoesVivas(id).slice()});
    }
    return {antes, passos, metodo, abreEm,
      fechaEm:MUTACOES[metodo].fecha,
      jaEstavaNaBase:antes.includes(abreEm)};
  });
  console.log('    antes: '+d.antes.join(', '));
  console.log('    martelando "'+d.metodo+'" — fecha "'+d.fechaEm+
    '", abre "'+d.abreEm+'" (na base antes? '+(d.jaEstavaNaBase?'SIM':'não')+')');
  d.passos.forEach(x=>console.log('    '+d.metodo+' #'+x.vez+(x.mutou?'  → MUTOU':'')+
    '  ainda funciona: '+x.vivas.join(', ')));
  const mutouNa3=d.passos[2].mutou, naoAntes=!d.passos[0].mutou&&!d.passos[1].mutou;
  const fechou=!d.passos[3].vivas.includes(d.fechaEm);
  const abriu=d.passos[3].vivas.includes(d.abreEm);
  ok('a saída nova não estava na base (senão o teste não provaria nada)',
     !d.jaEstavaNaBase);
  ok('não muda na primeira nem na segunda vez', naoAntes);
  ok('muda exatamente na terceira',            mutouNa3);
  ok('e a saída repetida fecha',                fechou);
  ok('e uma saída nova abre no lugar',          abriu);
}

console.log('\n3. A TRAVA DE BECO SEM SAÍDA');
{
  /* E ESTE BLOCO TAMBÉM PASSAVA POR SORTE. Ele martelava oito métodos
     e cobrava "sobrou alguma saída" — mas com teto de 3 mutações contra
     uma base de 3, a lista NUNCA chegava a zero, então a trava de
     segurança jamais era exercida. Plantei a regressão (tirei a trava)
     e passou verde.
     A trava agora é testada DIRETO: monto à mão um dossiê cujas
     mutações fecham cada item da base, que é o único jeito de chegar no
     caso que ela existe pra cobrir. */
  const d=await p.evaluate(()=>{
    S.dossies={}; S.dia=9;
    const id='bicho_coro';
    const base=registroDe(id).resolucoes.slice();
    /* fecha TODAS as saídas da base, sem abrir nenhuma */
    dossi(id).mutacoes=base.map((m,i)=>({metodo:'forcado'+i, dia:9,
      fecha:m, abre:null, nome:'trava de teste', tell:'x'}));
    const semSaida=resolucoesVivas(id);
    /* e o caminho normal, com o teto valendo */
    S.dossies={};
    ['fugiu','escondeu','venceu','desistiu','luz','som','olhar','reparar']
      .forEach(m=>{ for(let i=0;i<5;i++)dossiUsou(id,m); });
    return {base, semSaida, vivas:resolucoesVivas(id),
      mut:dossi(id).mutacoes.length, teto:DOSSI_CFG.mutacoesMax};
  });
  console.log('    base do coro: '+d.base.join(', '));
  console.log('    com TODAS as saídas fechadas à mão: '+
    (d.semSaida.length?d.semSaida.join(', '):'NENHUMA'));
  console.log('    martelando oito métodos: '+d.mut+' mutações (teto '+d.teto+
    ') · ainda funciona: '+d.vivas.join(', '));
  ok('a trava impede beco sem saída mesmo com tudo fechado', d.semSaida.length>0);
  ok('e no caminho normal também sobra saída',               d.vivas.length>0);
  ok('e o teto de mutações é respeitado',                    d.mut<=d.teto);
}

console.log('\n4. A MUTAÇÃO AVISA — PUNIR SEM TELL É PROIBIDO');
{
  const d=await p.evaluate(()=>{
    S.dossies={}; S.dia=11;
    const ditos=[]; const _diz=window.diz;
    window.diz=function(t,c){ ditos.push(String(t)); return _diz&&_diz.apply(this,arguments); };
    const sinais=[]; 
    const _em=(typeof Sinais==='object'&&Sinais&&Sinais.emitir)?Sinais.emitir:null;
    if(_em)Sinais.emitir=function(s){ sinais.push(s&&s.tipo); return _em.apply(this,arguments); };
    const id='bicho_rastejante';
    for(let i=0;i<3;i++)dossiUsou(id,'escondeu');
    window.diz=_diz; if(_em)Sinais.emitir=_em;
    const m=dossi(id).mutacoes[0];
    return {ditos:ditos.slice(-3), sinais, tellEsperado:m&&m.tell,
      contouOQueFechou:ditos.some(t=>/cantos/i.test(t)),
      contouOQueAbriu:ditos.some(t=>/demora|caminho/i.test(t))};
  });
  d.ditos.forEach(t=>console.log('    diz: '+t.slice(0,88)));
  console.log('    sinal emitido: '+(d.sinais.join(', ')||'nenhum')+
    ' (esperado '+d.tellEsperado+')');
  ok('a mutação fala o que fechou',      d.contouOQueFechou);
  ok('e fala o que abriu no lugar',      d.contouOQueAbriu);
  ok('e emite um tell pelo canal de sinais', d.sinais.includes(d.tellEsperado));
}

console.log('\n5. A PASSIVA FICA NA CASA DEPOIS QUE ELA VAI EMBORA');
{
  const d=await p.evaluate(()=>{
    S.dossies={}; S.passivasAtivas=[]; S.dia=6;
    dossiUsou('avaria_cano','reparar');       /* PARASITA */
    dossiUsou('avaria_rachadura','reparar');  /* ARQUITETO */
    const p1=passivas().slice();
    /* resolver de novo não duplica */
    dossiUsou('avaria_cano','reparar');
    return {p1, p2:passivas().slice(),
      temAgua:temPassiva('aguaParada'), temVao:temPassiva('vaoNovo'),
      temNada:temPassiva('naoExiste')};
  });
  d.p1.forEach(x=>console.log('    '+x.campo+' — '+x.n+' (de '+x.deNome+')'));
  ok('resolver deixa uma passiva na casa',   d.p1.length===2);
  ok('e a passiva é legível pelo campo',     d.temAgua&&d.temVao);
  ok('e não inventa passiva que não existe', !d.temNada);
  ok('resolver de novo não duplica',         d.p2.length===2);
}

console.log('\n6. A SEMENTE GERA FILHA, E A FILHA HERDA O QUE A MÃE APRENDEU');
{
  const d=await p.evaluate(()=>{
    S.dossies={}; S.dia=14;
    const mae='bicho_coro';
    for(let i=0;i<3;i++)dossiUsou(mae,'fugiu');   /* a mãe aprende */
    dossiEstudar(mae,80);
    marcarAtiva(mae); marcarAtiva(mae); marcarAtiva(mae);
    const cria=filhasDe(mae);
    const f=cria.length?dossi(cria[0]):null;
    return {funcao:funcaoDe(mae), cria, 
      mutMae:dossi(mae).mutacoes.map(x=>x.metodo),
      mutFilha:f?f.mutacoes.map(x=>x.metodo):[],
      herdadas:f?f.mutacoes.filter(x=>x.herdada).length:0,
      estudoMae:dossi(mae).estudo, estudoFilha:f?f.estudo:0,
      vivasFilha:cria.length?resolucoesVivas(cria[0]):[]};
  });
  console.log('    '+d.funcao+' gerou: '+(d.cria.join(', ')||'nada'));
  console.log('    a mãe aprendeu contra: '+d.mutMae.join(', '));
  console.log('    a filha já nasce com:  '+d.mutFilha.join(', ')+
    ' ('+d.herdadas+' herdadas)');
  console.log('    estudo da mãe '+d.estudoMae+' → da filha '+d.estudoFilha);
  ok('a SEMENTE gera cria',                       d.cria.length>0);
  ok('e a cria nasce com a mutação da mãe',       d.herdadas>0);
  ok('e quem estudou a mãe já sabe meio da filha', d.estudoFilha>0&&d.estudoFilha<d.estudoMae);
  ok('e a cria ainda tem saída',                  d.vivasFilha.length>0);
}

console.log('\n7. O DOSSIÊ NÃO ENTREGA O QUE VOCÊ NÃO ESTUDOU');
{
  const d=await p.evaluate(()=>{
    S.dossies={}; S.dia=8;
    const id='bicho_inchado';
    dossiViu(id,8);
    const cru=dossiLer(id);
    dossiEstudar(id,DOSSI_CFG.estudoRevela+5);
    const sabido=dossiLer(id);
    return {
      cru:cru.linhas.map(l=>l.t),
      sabido:sabido.linhas.map(l=>l.t),
      revela:DOSSI_CFG.estudoRevela
    };
  });
  console.log('    sem estudo:');
  d.cru.slice(-2).forEach(t=>console.log('      '+t.slice(0,86)));
  console.log('    com estudo:');
  d.sabido.slice(-2).forEach(t=>console.log('      '+t.slice(0,86)));
  const escondeu=d.cru.some(t=>/Estude mais/.test(t));
  const revelou=d.sabido.some(t=>/Ainda funciona/.test(t));
  ok('sem estudo ele não diz o que funciona', escondeu&&!d.cru.some(t=>/Ainda funciona/.test(t)));
  ok('com estudo ele diz',                    revelou);
}

console.log('\n8. SAVE VELHO NÃO QUEBRA, E CAMPO DE SAVE FUTURO SOBREVIVE');
{
  const d=await p.evaluate(()=>{
    /* save de antes do §61: sem dossies nenhum */
    const semNada=migrarDossies({dia:9, nomeJogador:'X'});
    /* save de um §61 futuro, com campo que este código não conhece */
    const futuro=migrarDossies({dossies:{bicho_magro:{
      vezes:4, metodos:{fugiu:2}, estudo:30, mutacoes:[],
      campoDoFuturo:'não descarta isso'}}});
    /* e um save corrompido */
    const lixo=migrarDossies({dossies:{x:null}});
    return {semNada, futuro, lixo, 
      guardou:futuro.bicho_magro&&futuro.bicho_magro.campoDoFuturo};
  });
  console.log('    save sem dossiê: '+JSON.stringify(d.semNada));
  console.log('    campo de save futuro preservado: '+JSON.stringify(d.guardou));
  ok('save velho migra sem explodir',        typeof d.semNada==='object');
  ok('e campo desconhecido é preservado',    d.guardou==='não descarta isso');
  ok('e save corrompido não derruba',        typeof d.lixo==='object');
}

console.log('\n9. NADA NO SAVE QUE NÃO POSSA SER SALVO');
{
  const d=await p.evaluate(()=>{
    S.dossies={}; S.dia=3;
    dossiUsou('bicho_magro','fugiu'); dossiEstudar('bicho_magro',20);
    dossiNasceDe('teste__cria','bicho_magro');
    let erro=null, bytes=0;
    try{ const j=JSON.stringify(S.dossies); bytes=j.length;
      /* e volta igual */
      const v=JSON.parse(j); if(!v['bicho_magro'])erro='perdeu entrada';
    }catch(e){ erro=e.message; }
    const temFuncao=JSON.stringify(S.dossies).indexOf('function')>=0;
    return {erro, bytes, temFuncao};
  });
  console.log('    dossiês em JSON: '+d.bytes+' bytes'+(d.erro?' · ERRO: '+d.erro:''));
  ok('o dossiê é serializável',        !d.erro);
  ok('e não tem função dentro dele',   !d.temFuncao);
}

console.log('\n10. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.slice(0,3).join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
