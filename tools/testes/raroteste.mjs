/* §55 — eventos raros que continuam raros.

   A auditoria da v72 dizia que faltava "anti-repetição entre campanhas".
   Medido, faltava ANTES disso: a anti-repetição não funcionava nem
   dentro de uma campanha. `sortearEvento` filtra por
   `S.usados.includes(e.id)` e só os cinco `unico` têm `id`; os nove
   `raro` e os seis `muitoraro` não têm nenhum. Em 500 dias simulados,
   dezesseis raros distintos saíram 91 vezes, e o campeão apareceu
   TREZE VEZES.

   O que este harness prova: que o buraco fechou, que a memória atravessa
   campanha, que ela não esvazia a sacola, e que evento raro não mata,
   não trava e não come o save — a trava que o §9 exige em letras claras. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Raro'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. TODO EVENTO RARO PASSOU A TER CHAVE');
{
  const d=await p.evaluate(()=>{
    const e=rarosEstado();
    const raros=EVT.filter(x=>['raro','muitoraro','unico'].indexOf(x.r)>=0);
    const ids=raros.map(x=>x.id);
    return {semId:e.rarosSemId, total:raros.length,
      unicos:new Set(ids).size, porCategoria:e.porCategoria, cats:Object.keys(e.categorias)};
  });
  console.log('    '+d.total+' eventos raros · sem chave: '+d.semId
    +' · chaves distintas: '+d.unicos);
  console.log('    categorias: '+d.cats.join(', ')+' · por categoria: '+JSON.stringify(d.porCategoria));
  ok('nenhum evento raro ficou sem chave', d.semId===0);
  ok('e as chaves não colidem',            d.unicos===d.total);
  ok('as cinco categorias existem',        d.cats.length===5);
  /* categoria declarada e vazia e parametro morto — a proibicao nº 6.
     O adaptador deixou B e D sem nenhum evento na primeira versao. */
  ok('e nenhuma delas está vazia',
     d.cats.every(c=>(d.porCategoria[c]||0)>0));
}

console.log('\n2. O BURACO MEDIDO FECHOU (dentro da campanha)');
{
  const d=await p.evaluate(()=>{
    rarosEsquecerTudo();
    S.usados=[]; const guarda=S.dia;
    const conta={};
    for(let dia=1;dia<=500;dia++){
      S.dia=dia;
      const e=sortearEvento();
      if(e&&['raro','muitoraro','unico'].indexOf(e.r)>=0){
        const k=e.id; conta[k]=(conta[k]||0)+1;
        if(e.id)S.usados.push(e.id);
      }
    }
    S.dia=guarda;
    const vs=Object.values(conta);
    return {distintos:vs.length, saidas:vs.reduce((a,b2)=>a+b2,0),
      pior:vs.length?Math.max(...vs):0};
  });
  console.log('    em 500 dias: '+d.distintos+' raros distintos, '+d.saidas+' saídas'
    +' · o mais repetido saiu '+d.pior+'×');
  ok('nenhum raro se repete na mesma campanha', d.pior===1);
  ok('e continua saindo raro (a sacola não secou)', d.distintos>=10);
}

console.log('\n3. A MEMÓRIA ATRAVESSA A CAMPANHA');
{
  const d=await p.evaluate(()=>{
    rarosEsquecerTudo();
    const alvo=EVT.find(e=>e.r==='muitoraro');
    const id=alvo.id;
    const antes=raroVisto(id);
    raroAnotar(alvo);
    const logoDepois=raroVisto(id);
    /* uma campanha nova nao apaga: so envelhece */
    raroNovaCampanha();
    const umaDepois=raroVisto(id);
    for(let i=0;i<5;i++)raroNovaCampanha();
    const seisDepois=raroVisto(id);
    return {antes, logoDepois:+logoDepois.toFixed(3),
      umaDepois:+umaDepois.toFixed(3), seisDepois:+seisDepois.toFixed(3),
      campanha:rarosEstado().campanha,
      /* e a memoria NAO mora no save */
      noSave:(function(){try{
        return Object.keys(JSON.parse(localStorage.getItem(CHAVE)||'{}'))
          .filter(k=>/raro/i.test(k));}catch(e){return[];}})()};
  });
  console.log('    lembrança do evento: nunca visto '+d.antes+' → recém visto '+d.logoDepois
    +' → 1 campanha depois '+d.umaDepois+' → 6 campanhas depois '+d.seisDepois);
  console.log('    campos "raro" dentro do save: '
    +(d.noSave.length?d.noSave.join(', '):'nenhum (a memória tem chave própria)'));
  ok('ver um raro deixa lembrança',        d.antes===0&&d.logoDepois===1);
  ok('campanha nova não apaga, envelhece', d.umaDepois>0&&d.umaDepois<1);
  ok('e ela desbota de vez com o tempo',   d.seisDepois===0);
  ok('a memória não mora no save',         d.noSave.length===0);
}

console.log('\n4. LEMBRAR NÃO É BANIR (a sacola não pode secar)');
{
  const d=await p.evaluate(()=>{
    rarosEsquecerTudo();
    /* marca TODOS os raros como recém-vistos, o pior caso possível */
    EVT.filter(e=>['raro','muitoraro','unico'].indexOf(e.r)>=0).forEach(e=>raroAnotar(e));
    S.usados=[]; const guarda=S.dia;
    let saiu=0, nulos=0;
    for(let dia=1;dia<=200;dia++){
      S.dia=dia;
      const e=sortearEvento();
      if(!e){nulos++;continue;}
      if(['raro','muitoraro','unico'].indexOf(e.r)>=0){saiu++; if(e.id)S.usados.push(e.id);}
    }
    S.dia=guarda;
    return {saiu, nulos};
  });
  console.log('    com TODOS os raros já vistos: ainda saíram '+d.saiu
    +' em 200 dias · sorteios vazios: '+d.nulos);
  ok('mesmo tudo visto, ainda sai evento raro', d.saiu>0);
  ok('e o sorteio nunca volta vazio',           d.nulos===0);
}

console.log('\n5. A TRAVA DE SEGURANÇA DO §9');
{
  /* A PRIMEIRA VERSÃO DESTA SEÇÃO PASSOU SEM TESTAR NADA. Eu trocava
     `window.chance` pra furar o portão de 62% do `eventoDoDia` — mas
     `chance` é declaração de topo e NÃO está em `window` (a mesma
     armadilha do `CX`), então o portão continuou valendo, o evento nunca
     rodou, e "não matou / não comeu o save" passou porque não aconteceu
     coisa nenhuma. Só a quarta asserção, a que exige o incidente
     REGISTRADO, denunciou.
     Agora o teste confirma que o evento rodou antes de afirmar o que
     quer que seja sobre ele. */
  const d=await p.evaluate(async()=>{
    const saveAntes=localStorage.getItem(CHAVE);
    S.vida=40;
    let rodou=0;
    const assassino={r:'unico', id:'__teste_assassino', cat:'E',
      t:'teste da trava', f:()=>{ rodou++; S.vida=0;
        localStorage.removeItem(CHAVE); return null; }};
    EVT.push(assassino);
    const _s=sortearEvento;
    sortearEvento=()=>assassino;
    /* o portão de 62% é sorteio: insisto até passar, em vez de tentar
       trocar uma função que não dá pra trocar */
    let tentativas=0;
    while(!rodou&&tentativas<80){ tentativas++; await eventoDoDia(); }
    sortearEvento=_s;
    EVT.pop();
    const e=rarosEstado();
    return {rodou, tentativas, vida:S.vida,
      temSave:!!localStorage.getItem(CHAVE),
      saveIgual:localStorage.getItem(CHAVE)===saveAntes,
      incidentes:e.incidentes.length, ultimo:e.incidentes.slice(-1)[0]||null};
  });
  console.log('    o evento assassino rodou '+d.rodou+'× (em '+d.tentativas+' tentativas)');
  console.log('    depois dele: vida '+d.vida+' · save existe: '+d.temSave);
  console.log('    incidentes registrados: '+d.incidentes+' · '+JSON.stringify(d.ultimo));
  ok('o evento de teste REALMENTE rodou', d.rodou>0);
  ok('evento raro não mata na hora',      d.vida>0);
  ok('e não come o save',                 d.temSave);
  ok('e o save volta como estava',        d.saveIgual);
  ok('e a violação fica registrada',      d.incidentes>0);
}

console.log('\n6. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
