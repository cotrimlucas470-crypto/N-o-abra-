/* §62 — O COMODO TEM COISAS DENTRO.
   A assercao que importa: o foco liga exploracao de dia a anomalia de
   noite, e selar o foco resolve de vez. O resto e contabilidade. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(1400);
await p.evaluate(()=>{ semearRNG(777); S.saveId='teste-coisas'; S.dia=6;
  S.coisas={}; S.focos={}; S.dossies={}; S.mat={}; });

console.log('\n1. TODO CÔMODO TEM COISA, E OS VERBOS DIFEREM');
{
  const d=await p.evaluate(()=>coisasEstado());
  console.log('    '+d.total+' coisas · por cômodo: '+
    Object.entries(d.porComodo).map(([k,v])=>k+' '+v).join(', '));
  console.log('    por categoria: '+JSON.stringify(d.porCat));
  console.log('    verbos usados: '+JSON.stringify(d.verbos));
  const vazios=Object.entries(d.porComodo).filter(([,v])=>v<3).map(([k])=>k);
  console.log('    cômodos com menos de 3 coisas: '+(vazios.length?vazios.join(', '):'nenhum'));
  ok('nenhum cômodo fica vazio',            vazios.length===0);
  ok('as cinco categorias estão cobertas',  Object.keys(d.porCat).length===5);
  ok('e os seis verbos são usados',         Object.keys(d.verbos).length===6);
}

console.log('\n2. O FOCO SEGUE A CATEGORIA — NÃO É SORTEIO');
{
  const d=await p.evaluate(()=>{
    S.focos={};
    const r={};
    ['bicho_magro','bicho_coro','avaria_rachadura','bicho_imitador','avaria_cano']
      .forEach(a=>{
        const f=focoDe(a), c=coisaDe(f), reg=registroDe(a);
        r[a]={cat:reg.categoria, foco:f, coisaCat:c?c.cat:null, onde:c?c.onde:null};
      });
    /* e chamar de novo dá o mesmo — foco não muda de lugar sozinho */
    const denovo={}; Object.keys(r).forEach(a=>denovo[a]=focoDe(a));
    /* e outra campanha (outro saveId) dá focos diferentes */
    const antes=S.saveId; S.saveId='outra-campanha'; S.focos={};
    const outra={}; Object.keys(r).forEach(a=>outra[a]=focoDe(a));
    S.saveId=antes; S.focos={}; Object.keys(r).forEach(a=>focoDe(a));
    return {r, denovo, outra};
  });
  Object.entries(d.r).forEach(([a,x])=>console.log('    '+a.padEnd(18)+
    ' ('+x.cat+') → '+x.foco+' ('+x.coisaCat+')'));
  const casam=Object.values(d.r).every(x=>x.cat===x.coisaCat);
  const estavel=Object.keys(d.r).every(a=>d.denovo[a]===d.r[a].foco);
  const mudaEntreCampanhas=Object.keys(d.r).some(a=>d.outra[a]!==d.r[a].foco);
  ok('o foco combina com a categoria da anomalia', casam);
  ok('e não muda de lugar sozinho',                estavel);
  ok('e campanhas diferentes ancoram diferente',   mudaEntreCampanhas);
}

console.log('\n3. OLHAR INSINUA, ESCUTAR ENTREGA — E SÓ RENDE UMA VEZ');
{
  const d=await p.evaluate(()=>{
    S.coisas={}; S.dossies={}; S.focos={};
    const anom='bicho_coro';
    marcarAtiva(anom);
    const f=focoDe(anom);
    const e0=dossi(anom).estudo;
    const fraco=acharFoco(f,false);
    const e1=dossi(anom).estudo;
    const forte=acharFoco(f,true);
    const e2=dossi(anom).estudo;
    const denovo=acharFoco(f,true);
    const e3=dossi(anom).estudo;
    /* e numa coisa que NÃO é foco, nada */
    const outra=COISAS.find(c=>c.id!==f&&c.verbos.includes('escutar')).id;
    const nada=acharFoco(outra,true);
    return {f, fraco:fraco&&fraco.txt, forte:forte&&forte.txt,
      e0,e1,e2,e3, nada, focoNoDossie:dossi(anom).foco};
  });
  console.log('    foco: '+d.f);
  console.log('    olhar  → "'+String(d.fraco).slice(0,70)+'"   estudo '+d.e0+' → '+d.e1);
  console.log('    escutar→ "'+String(d.forte).slice(0,70)+'"   estudo '+d.e1+' → '+d.e2);
  console.log('    escutar de novo → estudo '+d.e2+' → '+d.e3);
  console.log('    escutar numa coisa que não é foco: '+(d.nada===null?'nada':'DENUNCIOU'));
  ok('olhar insinua sem render estudo',      d.fraco&&d.e1===d.e0);
  ok('escutar entrega e rende estudo',       d.forte&&d.e2>d.e1);
  ok('e não rende duas vezes no mesmo lugar',d.e3===d.e2);
  ok('e anota o foco no dossiê',             d.focoNoDossie===d.f);
  ok('coisa que não é foco não denuncia',    d.nada===null);
}

console.log('\n4. SELAR O FOCO RESOLVE DE VEZ');
{
  const d=await p.evaluate(()=>{
    S.coisas={}; S.dossies={}; S.focos={}; S.dia=10;
    S.mat={tabua:5, prego:9};
    const anom='avaria_rachadura';
    marcarAtiva(anom);
    const f=focoDe(anom);
    const ativaAntes=ativas().includes(anom);
    const estudoAntes=dossi(anom).estudo;
    const matAntes={...S.mat};
    const n=selarResolve(f);
    est(f).selado=true;
    return {f, n, ativaAntes, ativaDepois:ativas().includes(anom),
      estudoAntes, estudoDepois:dossi(anom).estudo,
      metodo:dossi(anom).metodos, matAntes, matDepois:{...S.mat},
      focoLimpo:focos()[anom]===undefined,
      naoElege:COISAS.filter(c=>!coisaSelada(c.id)).length};
  });
  console.log('    selou '+d.f+' → encerrou '+d.n+' anomalia(s)');
  console.log('    ativa antes: '+d.ativaAntes+' · depois: '+d.ativaDepois);
  console.log('    estudo '+d.estudoAntes+' → '+d.estudoDepois);
  console.log('    conta como método: '+JSON.stringify(d.metodo));
  ok('selar o foco encerra a anomalia',        d.ativaAntes&&!d.ativaDepois);
  ok('e rende estudo de verdade',              d.estudoDepois>d.estudoAntes);
  ok('e conta como método no §61',             d.metodo.selar===1);
  ok('e o foco selado deixa de ser foco',      d.focoLimpo);
}

console.log('\n5. SELAR DEMAIS TAMBÉM ENSINA — SELAR NÃO ESCAPA DA REGRA');
{
  const d=await p.evaluate(()=>{
    S.dossies={}; S.dia=12;
    const id='bicho_imitador';
    const antes=resolucoesVivas(id).slice();
    const abre=MUTACOES.selar.abre;
    const jaTinha=antes.includes(abre);
    const passos=[];
    for(let i=1;i<=3;i++){ const m=dossiUsou(id,'selar');
      passos.push({vez:i, mutou:!!m, vivas:resolucoesVivas(id).slice()}); }
    /* 'selar' NAO esta na lista base de resolucoes de nenhuma anomalia —
       ele e um metodo que o §62 acrescentou. Entao "sumiu da lista" nao
       prova nada aqui: a lista nunca teve. O que prova e `aceita()`,
       que e a pergunta que o jogo faz de verdade. */
    return {antes, passos, abre, jaTinha, fecha:MUTACOES.selar.fecha,
      aceitavaAntes:true, aceitaDepois:aceita(id,'selar')};
  });
  console.log('    antes: '+d.antes.join(', ')+'  (abre "'+d.abre+
    '" — já estava na base? '+(d.jaTinha?'SIM':'não')+')');
  d.passos.forEach(x=>console.log('    selar #'+x.vez+(x.mutou?' → MUTOU':'')+
    '  ainda funciona: '+x.vivas.join(', ')));
  ok('a saída nova de selar não estava na base', !d.jaTinha);
  ok('selar três vezes também ensina a anomalia', d.passos[2].mutou);
  console.log('    a anomalia ainda aceita selar? '+(d.aceitaDepois?'SIM':'não'));
  ok('e abre a saída declarada',                  d.passos[2].vivas.includes(d.abre));
  ok('e selar deixa de ser aceito',               d.aceitaDepois===false);
}

console.log('\n6. O QUE VOCÊ MEXEU FICA MEXIDO — E A CASA LEMBRA');
{
  const d=await p.evaluate(()=>{
    S.coisas={}; S.memoriaCasa={}; S.mat={}; S.dia=4;
    const c=COISAS.find(x=>x.sob&&x.sob.mat);
    const pesoAntes=lemPeso(c.onde);
    est(c.id).movido=true;
    renderAchado(c.sob,c.id);
    const pesoDepois=lemPeso(c.onde);
    /* e sobrevive a um save/load */
    const salvo=JSON.parse(JSON.stringify({coisas:S.coisas, focos:S.focos}));
    const migrado=migrarCoisas(salvo);
    /* coisa que nao existe mais some na migracao */
    salvo.coisas['coisa_que_nao_existe']={visto:3};
    const limpo=migrarCoisas(salvo);
    return {id:c.id, onde:c.onde, mat:{...S.mat}, pesoAntes, pesoDepois,
      sobreviveu:!!(migrado[c.id]&&migrado[c.id].movido),
      descartouFantasma:!limpo['coisa_que_nao_existe']};
  });
  console.log('    arrastou '+d.id+' → material '+JSON.stringify(d.mat));
  console.log('    peso de memória do cômodo '+d.onde+': '+d.pesoAntes+' → '+d.pesoDepois);
  ok('mexer rende material',                  Object.keys(d.mat).length>0);
  ok('e a casa registra que você mexeu',      d.pesoDepois>d.pesoAntes);
  ok('e o estado sobrevive ao save',          d.sobreviveu);
  ok('e coisa que não existe mais é descartada', d.descartouFantasma);
}

console.log('\n7. O BARULHO DOS VERBOS É GRADUADO');
{
  const d=await p.evaluate(()=>{
    const V=COISA_CFG.verbos;
    return {olhar:V.olhar.ruido, escutar:V.escutar.ruido, abrir:V.abrir.ruido,
      mover:V.mover.ruido, forcar:V.forcar.ruido, selar:V.selar.ruido};
  });
  console.log('    ruído por verbo: '+JSON.stringify(d));
  ok('olhar e escutar não fazem barulho', d.olhar===0&&d.escutar===0);
  ok('forçar faz mais barulho que abrir', d.forcar>d.abrir);
  ok('e a escada é monotônica',           d.abrir<d.mover&&d.mover<d.forcar);
}

console.log('\n8. A TELA NÃO VIRA OUTRO ÍNDICE DE 22 BOTÕES');
{
  const d=await p.evaluate(()=>{
    /* o §62 acrescenta UM botão ao menu do cômodo, não 38 */
    const antes=[...document.querySelectorAll('#acoes button')].length;
    return {maiorComodo:Math.max(...PLANTA.map(q=>coisasDe(q.id).length)),
      porTela:COISA_CFG.porTela, antes};
  });
  console.log('    o cômodo mais cheio tem '+d.maiorComodo+' coisas');
  ok('e nenhum cômodo passa de 5 coisas', d.maiorComodo<=5);
}

console.log('\n9. O ARTIGO CONTRAI — NADA DE "DE A COISA"');
{
  const d=await p.evaluate(()=>{
    const nomes=Object.values(CATALOGO_ANOM).map(a=>a.nome);
    const saida=nomes.map(n=>deNome(n));
    const errados=saida.filter(t=>/^de (a|o|as|os) /i.test(t));
    return {amostra:saida.slice(0,4).concat(saida.slice(15,19)), errados};
  });
  d.amostra.forEach(t=>console.log('    "'+t+'"'));
  console.log('    saídas com artigo duplicado: '+(d.errados.length?d.errados.join(' | '):'nenhuma'));
  ok('nenhum nome sai como "de a" ou "de o"', d.errados.length===0);
  const e2=await p.evaluate(()=>{
    /* e o "em", que apareceu na ficha do caderno como "em o tanque" */
    const saida=COISAS.map(c=>emNome(c.n));
    const errados=saida.filter(t=>/^em (a|o|as|os) /i.test(t));
    /* e o artigo do comodo, que eu adivinhava pela primeira letra */
    const comodos=PLANTA.map(q=>comodoCom(q.id,'no'));
    const ruins=comodos.filter(t=>!/^(no|na) /.test(t));
    return {amostra:saida.slice(0,3).concat(saida.slice(20,23)), errados, comodos, ruins};
  });
  e2.amostra.forEach(t=>console.log('    "'+t+'"'));
  console.log('    cômodos: '+e2.comodos.join(', '));
  ok('nem "em a" ou "em o"',                 e2.errados.length===0);
  ok('e todo cômodo sai com "no"/"na" certo', e2.ruins.length===0);
}

console.log('\n10. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.slice(0,3).join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
