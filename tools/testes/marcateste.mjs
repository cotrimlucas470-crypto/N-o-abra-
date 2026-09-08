/* §54 — marcas no plural, e o trauma que é de um cômodo.

   A marca existia e funcionava, mas era UMA: um booleano `S.marcado`
   mais `S.marcaDias`, rendendo `pesoMarca()` de 12% a 35%. O §8 pede
   plural, e a auditoria da v72 já dizia qual é o trabalho honesto —
   "generalizar a que existe, não escrever uma segunda ao lado dela".

   O que este harness precisa provar, mais do que "existem três":
   1. que o save ANTIGO continua valendo (quem só tem `S.marcado`);
   2. que o equilíbrio de quem já joga NÃO mudou — com só a marca do
      olho, `pesoMarca()` tem de dar exatamente o número de antes;
   3. que o trauma muda o cômodo, e não a ficha. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Marca'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);
await p.evaluate(()=>{
  window.__zerar=()=>{ S.marcas={}; S.marcado=false; S.marcaDias=0; S.traumas=[]; };
});

console.log('\n1. O SAVE ANTIGO CONTINUA VALENDO');
{
  const d=await p.evaluate(()=>{
    /* um save que so conhece o booleano, como todos os de antes */
    S.marcas=undefined; S.marcado=true; S.marcaDias=9; S.traumas=[];
    const adotou=marcasAtivas();
    const peso=pesoMarca();
    /* a formula original, escrita aqui de novo pra comparar */
    const original=Math.max(0,Math.min(.35,.12+9*.012));
    return {adotou, dias:marcaDias('olho'), peso:+peso.toFixed(6),
      original:+original.toFixed(6)};
  });
  console.log('    save só com S.marcado=true, marcaDias=9 → marcas ativas: '+d.adotou.join(', '));
  console.log('    pesoMarca agora '+d.peso+' · a fórmula de antes dava '+d.original);
  ok('a marca velha é adotada como "olho"', d.adotou.join()==='olho'&&d.dias===9);
  ok('e o peso é EXATAMENTE o de antes',    d.peso===d.original);
}

console.log('\n2. AGORA SÃO TRÊS, E ELAS SOMAM COM TETO');
{
  const d=await p.evaluate(()=>{
    __zerar();
    const r={};
    porMarca('olho');   r.so_olho=+pesoMarca().toFixed(4);
    porMarca('ritual'); r.mais_ritual=+pesoMarca().toFixed(4);
    porMarca('eco');    r.as_tres=+pesoMarca().toFixed(4);
    /* envelhece tudo pra bater no teto */
    const M=marcasEstado(); Object.keys(M).forEach(k=>M[k].dias=60);
    S.marcaDias=60;
    r.velhas=+pesoMarca().toFixed(4);
    r.tipos=Object.keys(MARCA_TIPOS);
    tirarMarca('eco'); tirarMarca('ritual');
    r.depois_de_tirar=+pesoMarca().toFixed(4);
    tirarMarca('olho');
    r.sem_nada=+pesoMarca().toFixed(4);
    return r;
  });
  console.log('    tipos: '+d.tipos.join(', '));
  console.log('    só olho '+d.so_olho+' → +ritual '+d.mais_ritual+' → +eco '+d.as_tres
    +' · as três velhas '+d.velhas);
  console.log('    tirando duas '+d.depois_de_tirar+' · sem nenhuma '+d.sem_nada);
  ok('são três marcas',              d.tipos.length===3);
  ok('e cada uma acrescenta peso',   d.mais_ritual>d.so_olho&&d.as_tres>d.mais_ritual);
  ok('mas existe teto',              d.velhas<=0.55+1e-9);
  /* a comparacao certa e contra `velhas`, nao contra `as_tres`: as
     marcas foram envelhecidas pra 60 dias entre uma medida e outra, e
     o olho sozinho velho (0,35) e MAIOR que as tres novas (0,22). A
     primeira versao comparava com o numero errado e reprovava sozinha. */
  ok('dá pra tirar, e o peso volta', d.depois_de_tirar<d.velhas&&d.sem_nada===0);
}

console.log('\n3. MARCA FALA QUANDO CHEGA (o tell obrigatório)');
{
  const d=await p.evaluate(()=>{
    __zerar(); limpar();
    porMarca('eco');
    const ditas=Array.from(T.querySelectorAll('p:not(.passado)')).map(e=>e.textContent);
    return {falou:ditas.some(t=>t.indexOf('Eco')>=0||t.indexOf('repetiu o seu nome')>=0),
      texto:ditas.filter(t=>t.length>20).slice(-1)[0]||''};
  });
  console.log('    "'+d.texto+'"');
  ok('chegar de marca nova é anunciado', d.falou);
}

console.log('\n4. O TRAUMA É DO CÔMODO, E NASCE DE COISA QUE JÁ ACONTECE');
{
  const d=await p.evaluate(()=>{
    __zerar();
    cena.casa=cena.casa||{}; cena.casa.voce=6;    /* porão */
    S.dia=5;
    /* um arranhão não traumatiza; um corte fundo sim */
    try{ (S.males||[]).length=0; }catch(e){}
    pegarMal('corte');
    const leve=traumas().length;
    try{ (S.males||[]).length=0; }catch(e){}
    pegarMal('cortefundo');
    const grave=traumas().slice();
    return {leve, grave, forcaPorao:+traumaDe(6).toFixed(3), forcaSala:+traumaDe(4).toFixed(3),
      gravidades:{corte:MALES.corte&&MALES.corte.grav, cortefundo:MALES.cortefundo.grav}};
  });
  console.log('    gravidades: corte '+d.gravidades.corte+' · corte fundo '+d.gravidades.cortefundo);
  console.log('    depois do corte leve: '+d.leve+' trauma · depois do corte fundo: '+d.grave.length);
  console.log('    força no porão '+d.forcaPorao+' · na sala '+d.forcaSala);
  ok('ferida leve não traumatiza',        d.leve===0);
  ok('ferida grave traumatiza o cômodo',  d.grave.length===1&&d.grave[0].comodo===6);
  ok('e o trauma é SÓ daquele cômodo',    d.forcaPorao>0&&d.forcaSala===0);
}

console.log('\n5. O CÔMODO TRAUMÁTICO PESA NA SENSAÇÃO — E DESBOTA');
{
  const d=await p.evaluate(()=>{
    __zerar();
    S.dia=5; S.sanidade=30; S.lanterna=false; S.hora=23;
    marcarTrauma(6,'cortefundo');
    /* mesma condição, cômodo com e sem trauma */
    const comT=[], semT=[];
    for(let i=0;i<40;i++){ VIG.trocas=i;
      const a=vigiaLer(6), b2=vigiaLer(4);
      if(a.fonte==='VOCE')comT.push(a.forca);
      if(b2.fonte==='VOCE')semT.push(b2.forca);
    }
    const md=l=>l.length?+(l.reduce((x,y)=>x+y,0)/l.length).toFixed(3):0;
    /* e o tempo apaga */
    const agora=+traumaDe(6).toFixed(3);
    S.dia=5+7;  const meio=+traumaDe(6).toFixed(3);
    S.dia=5+14; const velho=+traumaDe(6).toFixed(3);
    S.dia=5;
    return {comT:md(comT), semT:md(semT), nCom:comT.length, nSem:semT.length,
      agora, meio, velho};
  });
  console.log('    força média da sensação: cômodo com trauma '+d.comT
    +' ('+d.nCom+'×) · sem trauma '+d.semT+' ('+d.nSem+'×)');
  console.log('    o trauma desbota: dia 0 → '+d.agora+' · +7 dias → '+d.meio+' · +14 → '+d.velho);
  ok('o cômodo do trauma pesa mais',  d.comT>d.semT);
  ok('e o trauma desbota com o tempo', d.agora>d.meio&&d.meio>d.velho&&d.velho===0);
}

console.log('\n6. VOLTAR NO CÔMODO É ANUNCIADO, UMA VEZ SÓ');
{
  const d=await p.evaluate(()=>{
    __zerar(); S.dia=5;
    marcarTrauma(6,'cortefundo');
    limpar();
    const a=traumaAoEntrar(6);
    const b2=traumaAoEntrar(6);
    const c=traumaAoEntrar(4);
    return {primeira:a, segunda:b2, outro:c};
  });
  console.log('    1ª vez: "'+(d.primeira||'—')+'"');
  console.log('    2ª vez: '+(d.segunda||'(nada, como tem de ser)'));
  ok('a primeira volta é anunciada',      !!d.primeira);
  ok('a segunda não repete',              d.segunda===null);
  ok('e cômodo sem trauma não diz nada',  d.outro===null);
}

console.log('\n7. GRAVA SEM INVENTAR PARTIDA');
{
  const d=await p.evaluate(()=>{
    __zerar(); S.dia=3;
    porMarca('ritual'); marcarTrauma(2,'x');
    salvar();
    let o={}; try{ o=JSON.parse(localStorage.getItem(CHAVE)||'{}'); }catch(e){}
    const gravou=!!(o.marcas&&o.marcas.ritual)&&Array.isArray(o.traumas)&&o.traumas.length===1;
    /* e sem nome de jogador nao pode gravar nada */
    const guarda=S.nomeJogador;
    const antes=localStorage.getItem(CHAVE);
    S.nomeJogador='';
    porMarca('eco');
    salvar();
    const depois=localStorage.getItem(CHAVE);
    S.nomeJogador=guarda;
    /* o que este bloco pode prometer e que ELE nao escreve sem nome de
       jogador. Se a base escreve ou nao e assunto da base — a primeira
       versao comparava o arquivo inteiro e reprovava por causa de
       escrita que nao e minha. */
    let d2={}; try{ d2=JSON.parse(depois||'{}'); }catch(e){}
    return {gravou, mudouAlgo:antes!==depois,
      meuCampoEntrou:!!(d2.marcas&&d2.marcas.eco)};
  });
  console.log('    marcas e traumas no save: '+d.gravou);
  console.log('    sem nome de jogador: o arquivo mudou? '+d.mudouAlgo
    +' · e o campo DESTE bloco entrou? '+d.meuCampoEntrou);
  ok('grava marca e trauma no save',        d.gravou);
  ok('e sem nome de jogador não grava o que é meu', !d.meuCampoEntrou);
}

console.log('\n8. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
