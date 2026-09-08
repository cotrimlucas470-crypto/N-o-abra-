/* §51 — as criaturas aparecem.

   A auditoria desta etapa achou o contrario do esperado: as 16
   silhuetas JA existiam, uma por criatura, animadas, com pele por
   familia — e `desSilhueta` nao era chamada em lugar nenhum. Zero call
   sites. O jogador nunca viu nenhuma.

   Entao o que este harness prova nao e "as silhuetas sao bonitas": e
   que elas CHEGAM NA TELA, que chegam no lugar certo (o caderno, e nao
   a porta, que estragaria a deducao), e que a criatura certa fica ao
   lado do texto certo. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Sil'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. TODA CRIATURA TEM UMA SILHUETA, E ELA DESENHA');
{
  const d=await p.evaluate(()=>{
    /* TRANSPARENTE, nunca com fundo pintado: a terceira camada do
       desSilhueta usa `source-atop`, que so marca onde ja ha tinta. Num
       rascunho branco ela lambe o fundo inteiro e todas as silhuetas
       saem iguais — foi exatamente o que aconteceu na minha primeira
       medicao, que deu quatro pares "identicos" que na foto eram
       claramente diferentes. */
    const W=180,H=220;
    const c=document.createElement('canvas'); c.width=W; c.height=H;
    const tipos=[...new Set(Object.values(CRIATURAS).map(x=>x.silhueta))].sort();
    const img={}, tinta={};
    tipos.forEach(tp=>{
      const dd=silhuetaEmCanvas(tp,W,H);
      const a=dd.getContext('2d').getImageData(0,0,W,H).data;
      img[tp]=a;
      let n=0,t=0; for(let i=3;i<a.length;i+=4){ if(a[i]>24)n++; t++; }
      tinta[tp]=+(n/t*100).toFixed(2);
    });
    const dif=(x,y)=>{let n=0,t=0;
      for(let i=3;i<img[x].length;i+=4){
        const A=img[x][i]>24, B=img[y][i]>24; if(A!==B)n++; t++;}
      return +(n/t*100).toFixed(2);};
    const pares=[], paresRel=[];
    for(let i=0;i<tipos.length;i++)for(let j=i+1;j<tipos.length;j++){
      if(tipos[i]==='nenhuma'||tipos[j]==='nenhuma')continue;
      const q=dif(tipos[i],tipos[j]);
      pares.push({a:tipos[i],b:tipos[j],d:q});
      /* a mesma diferenca, mas dividida pelo tamanho medio dos dois
         corpos: quanto do CORPO mudou, e nao quanto da tela */
      const base=(tinta[tipos[i]]+tinta[tipos[j]])/2;
      paresRel.push({a:tipos[i],b:tipos[j],d:+(q/Math.max(.01,base)*100).toFixed(1)});
    }
    pares.sort((x,y)=>x.d-y.d); paresRel.sort((x,y)=>x.d-y.d);
    return {tipos, tinta, pares:pares.slice(0,4), paresRel:paresRel.slice(0,4),
      nCriaturas:Object.keys(CRIATURAS).length,
      semSilhueta:Object.keys(CRIATURAS).filter(k=>!CRIATURAS[k].silhueta)};
  }).catch(()=>null);
  if(!d){ ok('a medição rodou', false); }
  else {
    /* `nenhuma` desenha nada DE PROPOSITO: e a silhueta de "o que Vem
       de Baixo", que o jogador nunca ve. Cobrar tinta dela e cobrar do
       desenho o que ele nunca prometeu — o mesmo erro que eu fiz no
       teste do rosto, exigindo 12 defeitos de um pintor que faz 9. */
    const vazias=d.tipos.filter(t=>t!=='nenhuma'&&d.tinta[t]<1);
    console.log('    '+d.nCriaturas+' criaturas · '+d.tipos.length+' silhuetas distintas');
    console.log('    tinta: '+d.tipos.map(t=>t+' '+d.tinta[t]+'%').join(' · '));
    console.log('    os pares mais parecidos, em % do corpo: '
      +d.paresRel.map(x=>x.a+'×'+x.b+' '+x.d+'%').join(' · '));
    ok('toda criatura declara uma silhueta',  d.semSilhueta.length===0);
    ok('e toda silhueta desenha alguma coisa', vazias.length===0);
    ok('e a única vazia é a que promete ser vazia', d.tinta.nenhuma<1);
    /* a diferenca tem de ser medida CONTRA O CORPO, nao contra a tela:
       0,92% da tela entre `casca` e `humana` parece nada, mas as duas
       so ocupam ~6,4% da tela, entao e 14% do corpo — e a Casca e
       quase-humana de proposito, que e o susto dela. */
    ok('e nenhum par de silhuetas é igual', d.paresRel[0].d>8);
  }
}

console.log('\n2. O CORO DEIXA A SOMBRA QUE A DESCRIÇÃO PROMETE');
{
  const d=await p.evaluate(()=>{
    const e=silhuetasEstado();
    return {semForma:e.semForma, coro:e.coroForma,
      pesDoCoro:(FORMA[FORMA_DE.coro2]||{}).pes
        ? FORMA[FORMA_DE.coro2].pes(0).length : 0,
      pesDeGente:FORMA.gente.pes(0).length,
      desc:CRIATURAS.coro2.ver};
  });
  console.log('    "'+d.desc+'"');
  console.log('    forma do Coro: '+d.coro+' → '+d.pesDoCoro+' manchas'
    +' (o fallback "gente" dava '+d.pesDeGente+')');
  ok('nenhuma criatura ficou sem forma de porta', d.semForma.length===0);
  ok('e o Coro não faz mais sombra de duas pernas', d.pesDoCoro>d.pesDeGente);
}

console.log('\n3. A SILHUETA CHEGA NO CADERNO — E NA FICHA CERTA');
{
  const d=await p.evaluate(()=>{
    S.vistos=S.vistos||{};
    /* tres criaturas de familias diferentes, pra pegar as tres peles */
    S.vistos.vizinho=2; S.vistos.magro=1; S.vistos.aquilo=2;
    telaCaderno(()=>{});
    const fichas=Array.from(T.querySelectorAll('.gente:not(.passado)'));
    const pares=fichas.map(el=>({
      nome:(el.querySelector('b')||{}).textContent,
      temDesenho:!!el.querySelector('canvas.silhueta'),
      legenda:(el.querySelector('small.sil-leg')||{}).textContent||''
    }));
    /* e o desenho nao pode estar em branco */
    let comTinta=0;
    fichas.forEach(el=>{
      const cv=el.querySelector('canvas.silhueta'); if(!cv)return;
      const a=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
      let n=0; for(let i=3;i<a.length;i+=4)if(a[i]>24)n++;
      if(n/(a.length/4)>0.02)comTinta++;
    });
    return {pares, comTinta, nFichas:fichas.length};
  });
  d.pares.forEach(x=>console.log('    '+String(x.nome).padEnd(26)
    +(x.temDesenho?'com desenho — "'+x.legenda+'"':'SEM DESENHO')));
  ok('o caderno abriu as três fichas',        d.nFichas===3);
  ok('toda ficha vista ganhou o desenho',     d.pares.every(x=>x.temDesenho));
  ok('e o desenho tem tinta, não é branco',   d.comTinta===3);
  ok('a legenda diz o formato em português',  d.pares.every(x=>x.legenda.length>3));
}

console.log('\n4. QUEM NÃO FOI VISTO NÃO GANHA DESENHO');
{
  const d=await p.evaluate(()=>{
    S.vistos={vizinho:1};
    telaCaderno(()=>{});
    /* so as desta abertura: o `limpar()` do jogo guarda o que passou */
    const fichas=Array.from(T.querySelectorAll('.gente:not(.passado)'));
    return {n:fichas.length,
      desenhos:T.querySelectorAll('.gente:not(.passado) canvas.silhueta').length,
      velhas:T.querySelectorAll('.gente.passado').length,
      nome:(fichas[0]&&fichas[0].querySelector('b')||{}).textContent};
  });
  console.log('    com 1 criatura vista: '+d.n+' ficha nova, '+d.desenhos
    +' desenho ('+d.nome+') · e '+d.velhas+' fichas antigas esmaecidas acima');
  ok('só quem foi visto aparece na abertura nova', d.n===1&&d.desenhos===1);
  ok('e o caderno antigo continua rolável acima',  d.velhas===3);
}

console.log('\n5. O DESENHO NÃO SUJA A TELA DO JOGO');
{
  const d=await p.evaluate(()=>{
    cena.modo='casa'; cena.casa=cena.casa||{}; cena.casa.voce=4;
    const w=CV.width/DPR, h=CV.height/DPR;
    CX.clearRect(0,0,w,h); desenharCasa(w,h,1.4);
    const antes=CX.getImageData(0,0,CV.width,CV.height).data;
    /* desenha oito silhuetas, que e o que o caderno faz */
    for(let i=0;i<8;i++)silhuetaEmCanvas('humana',96,118);
    CX.clearRect(0,0,w,h); desenharCasa(w,h,1.4);
    const depois=CX.getImageData(0,0,CV.width,CV.height).data;
    let n=0; for(let i=0;i<antes.length;i+=4)if(antes[i]!==depois[i])n++;
    const t0=performance.now();
    for(let i=0;i<16;i++)silhuetaEmCanvas('coro',96,118);
    return {sujou:n, custo16:+(performance.now()-t0).toFixed(2)};
  });
  console.log('    pixels diferentes na cena depois de 8 desenhos: '+d.sujou);
  console.log('    custo de desenhar as 16 silhuetas do caderno: '+d.custo16+' ms');
  ok('a cena volta igual (o #tela é devolvido)', d.sujou===0);
  ok('e o caderno inteiro custa pouco (<120 ms)', d.custo16<120);
}

console.log('\n6. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
