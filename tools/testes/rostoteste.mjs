/* Reformulação visual — o rosto de quem bate na porta.

   O que precisa ser provado aqui NÃO é que ficou bonito. É que os 12
   defeitos continuam VISÍVEIS e continuam NA ZONA CERTA — porque a
   lente do olho mágico procura cada um numa posição fixa de tela, e o
   jogador aprende a caçar ali. Repintar o rosto sem checar isso seria
   trocar um sinal de jogo por enfeite. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Rosto'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

await p.evaluate(()=>{
  window.__cv=document.createElement('canvas');
  __cv.width=420; __cv.height=380;
  window.__ctx=__cv.getContext('2d',{willReadFrequently:true});
  window.__modelo=(anoms)=>{
    const v={pessoa:{n:'Aferidor',id:40},tipo:'humano',mimico:!!anoms.length};
    const m=modeloVisitante(v);
    m.anomalias=ANOM_TODAS().filter(a=>anoms.includes(a.id));
    m.capuz=false;                    /* capuz esconderia metade do rosto */
    return m;
  };
  window.__pinta=(m)=>{ __ctx.clearRect(0,0,__cv.width,__cv.height);
    pintarVisitante(__ctx,__cv.width,__cv.height,m,1.2);
    return __ctx.getImageData(0,0,__cv.width,__cv.height).data; };
  /* quanto dois desenhos diferem DENTRO de uma zona da lente */
  window.__difNaZona=(a,b2,zona)=>{
    const W=__cv.width,H=__cv.height;
    const zx=zona.x*W, zy=zona.y*H, zr=zona.r*Math.min(W,H);
    let dif=0,n=0;
    for(let y=Math.max(0,zy-zr);y<Math.min(H,zy+zr);y+=2)
      for(let x2=Math.max(0,zx-zr);x2<Math.min(W,zx+zr);x2+=2){
        const i=((y|0)*W+(x2|0))*4;
        const d=Math.abs(a[i]-b2[i])+Math.abs(a[i+1]-b2[i+1])+Math.abs(a[i+2]-b2[i+2]);
        if(d>18)dif++; n++;
      }
    return n?+(dif/n*100).toFixed(2):0;
  };
});

console.log('\n1. O ROSTO AINDA É O ROSTO');
{
  const d=await p.evaluate(()=>{
    const m=__modelo([]);
    const px=__pinta(m);
    let acesos=0,n=0;
    for(let i=3;i<px.length;i+=16){ if(px[i]>10)acesos++; n++; }
    return {pintou:+(acesos/n*100).toFixed(1), temPintar:typeof pintarVisitante==='function',
      zonas:Object.keys(ZONAS).length};
  });
  console.log('    área pintada: '+d.pintou+'% · zonas da lente: '+d.zonas);
  ok('pintarVisitante existe',        d.temPintar);
  ok('e desenha alguma coisa',        d.pintou>25);
  ok('as 12 zonas da lente seguem lá', d.zonas===12);
}

console.log('\n2. OS DEFEITOS DO RETRATO APARECEM — E NO LUGAR CERTO');
{
  /* A PRIMEIRA VERSÃO DESTA SEÇÃO ESTAVA ERRADA EM DOIS PONTOS, e os
     dois eram do teste:

     1. Ela cobrava do retrato os 12 defeitos. O retrato desenha NOVE —
        `maos`, `roupa` e `pes` são de outro sistema, e `pintarVisitante`
        não tem uma linha sobre eles. Cobrar isso dele era inventar
        responsabilidade.
     2. Ela media num instante em que o rosto estava PISCANDO. De olho
        fechado, o brilho da pupila não tem como aparecer — e o teste
        acusava o desenho de não desenhar.

     E a zona da lente é fração da tela DO JOGO; numa tela de outra
     proporção o centro da zona não cai na feição. Aqui a checagem
     espacial é por faixa da própria imagem, que é o que se pode afirmar. */
  const d=await p.evaluate(()=>{
    /* acha um instante com o olho ABERTO */
    let t=0; const mm=__modelo([]);
    const s21=semente(mm.h,21);
    for(let k=0;k<400;k++){ const tt=k*0.05; if(!(Math.sin(tt*1.7+s21*6)>.965)){ t=tt; break; } }
    const W=__cv.width,H=__cv.height;
    const pinta=(m)=>{ __ctx.clearRect(0,0,W,H);
      pintarVisitante(__ctx,W,H,m,t);
      return __ctx.getImageData(0,0,W,H).data; };
    const difFaixa=(a,b2,y0,y1)=>{ let dif=0,n=0;
      for(let y=Math.floor(H*y0);y<Math.floor(H*y1);y+=2)
        for(let x2=0;x2<W;x2+=2){ const i2=(y*W+x2)*4;
          const dd=Math.abs(a[i2]-b2[i2])+Math.abs(a[i2+1]-b2[i2+1])+Math.abs(a[i2+2]-b2[i2+2]);
          if(dd>18)dif++; n++; }
      return n?+(dif/n*100).toFixed(2):0; };
    const limpo=pinta(__modelo([]));
    const doRetrato=['olhos','brilho','boca','pescoco','pele','sombra','dentes','piscar','simetria'];
    const r={t:+t.toFixed(2), itens:{}};
    doRetrato.forEach(id=>{
      const px=pinta(__modelo([id]));
      r.itens[id]={ tudo:difFaixa(limpo,px,0,1),
        alto:difFaixa(limpo,px,.25,.50), baixo:difFaixa(limpo,px,.50,.78),
        olho:difFaixa(limpo,px,.42,.58) };
    });
    /* e os tres que NAO sao do retrato */
    const fonte=pintarVisitante.toString();
    r.foraDoRetrato=['maos','roupa','pes'].filter(id=>fonte.indexOf("A_('"+id+"')")<0);
    return r;
  });
  console.log('    medido com o olho aberto (t='+d.t+')');
  Object.keys(d.itens).forEach(id=>{
    const v=d.itens[id];
    console.log('    '+id.padEnd(9)+' muda '+String(v.tudo).padStart(5)+'% do retrato'
      +'  · cima '+String(v.alto).padStart(5)+'%  · baixo '+String(v.baixo).padStart(5)
      +'%  · faixa dos olhos '+String(v.olho).padStart(5)+'%');
  });
  const it=d.itens;
  /* `piscar` NAO pode aparecer num quadro parado, e isso e o certo: ele
     significa "nunca pisca". Num instante so, o rosto normal tambem esta
     de olho aberto, e os dois desenhos sao iguais. O sinal dele e no
     TEMPO — medido na secao 2b. */
  /* `brilho` acende SO as pupilas. Elas sao minusculas: no retrato
     inteiro isso da 0,2%, e o limite global de 0,3% que eu tinha posto
     era arbitrario demais pra um sinal desse tamanho. Ele se mede na
     faixa dos olhos, onde acontece. */
  const espaciais=Object.keys(it).filter(id=>id!=='piscar'&&id!=='brilho');
  const mudos=espaciais.filter(id=>it[id].tudo<0.3);
  ok('os sete defeitos de forma aparecem todos', mudos.length===0);
  ok('e `brilho` acende a faixa dos olhos',      it.brilho.olho>0.4);
  ok('e `piscar` NÃO muda um quadro parado, como tem de ser', it.piscar.tudo===0);
  ok('olhos e brilho mexem na metade de cima',
     it.olhos.alto>it.olhos.baixo && it.brilho.alto>=it.brilho.baixo);
  ok('boca e dentes mexem na metade de baixo',
     it.boca.baixo>it.boca.alto && it.dentes.baixo>it.dentes.alto);
  ok('pescoço mexe embaixo',                 it.pescoco.baixo>0.5);
  ok('pele e simetria mudam o rosto inteiro', it.pele.tudo>3 && it.simetria.tudo>1);
  ok('e mãos, roupa e pés não são do retrato — são de outro sistema',
     d.foraDoRetrato.length===3);
}

console.log('\n2b. `PISCAR` É UM SINAL DE TEMPO, E SE MEDE NO TEMPO');
{
  const d=await p.evaluate(()=>{
    const W=__cv.width,H=__cv.height;
    /* conta quantos fotogramas de uma janela tem o olho fechado, medindo
       o desenho — nao a formula. Olho fechado apaga o branco da esclera. */
    const brancoNoOlho=(m,t)=>{
      __ctx.clearRect(0,0,W,H);
      pintarVisitante(__ctx,W,H,m,t);
      /* A FAIXA TEM DE COBRIR OS OLHOS. A primeira versao amostrava de
         30% a 44% da altura e os olhos estao em ~49% — media testa. */
      const px=__ctx.getImageData(0,Math.floor(H*.42),W,Math.floor(H*.16)).data;
      let claros=0;
      for(let i=0;i<px.length;i+=4)
        if(px[i]>170&&px[i+1]>165&&px[i+2]>150)claros++;
      return claros;
    };
    const normal=__modelo([]), semPiscar=__modelo(['piscar']);
    let fechouNormal=0, fechouSemPiscar=0, quadros=0;
    const baseN=brancoNoOlho(normal,0), baseP=brancoNoOlho(semPiscar,0);
    for(let k=0;k<600;k++){
      const t=k*0.02; quadros++;
      if(brancoNoOlho(normal,t)<baseN*.55)fechouNormal++;
      if(brancoNoOlho(semPiscar,t)<baseP*.55)fechouSemPiscar++;
    }
    return {quadros, fechouNormal, fechouSemPiscar};
  });
  console.log('    em '+d.quadros+' quadros: o rosto normal fecha o olho '+d.fechouNormal
    +' vezes · o que tem o defeito, '+d.fechouSemPiscar);
  ok('o rosto normal pisca',                d.fechouNormal>0);
  ok('e o que tem `piscar` nunca pisca',    d.fechouSemPiscar===0);
}

console.log('\n3. A LUZ TEM DIREÇÃO');
{
  const d=await p.evaluate(()=>{
    const px=__pinta(__modelo([]));
    const W=__cv.width,H=__cv.height;
    const brilho=(x0,x1,y0,y1)=>{ let s=0,n=0;
      for(let y=y0;y<y1;y+=2)for(let x2=x0;x2<x1;x2+=2){
        const i=((y|0)*W+(x2|0))*4;
        if(px[i+3]<40)continue;
        s+=px[i]*.2126+px[i+1]*.7152+px[i+2]*.0722; n++; }
      return n?+(s/n).toFixed(1):0; };
    const cx=W/2, cy=H*.54, rx=W*.12, ry=H*.12;
    return {esquerda:brilho(cx-rx*1.6,cx-rx*.2,cy-ry,cy+ry),
            direita: brilho(cx+rx*.2,cx+rx*1.6,cy-ry,cy+ry)};
  });
  console.log('    lado esquerdo do rosto: '+d.esquerda+' · lado direito: '+d.direita);
  ok('um lado do rosto é mais claro que o outro', d.esquerda>d.direita*1.06);
}

console.log('\n4. O CUSTO');
{
  const d=await p.evaluate(()=>{
    const m=__modelo([]), mm=__modelo(['olhos','dentes','pele']);
    const med=(fn,n)=>{const t=performance.now();for(let i=0;i<n;i++)fn();
      return +((performance.now()-t)/n).toFixed(3);};
    med(()=>__pinta(m),20);
    return {limpo:med(()=>{ __ctx.clearRect(0,0,__cv.width,__cv.height);
              pintarVisitante(__ctx,__cv.width,__cv.height,m,1.2); },120),
            comDefeitos:med(()=>{ __ctx.clearRect(0,0,__cv.width,__cv.height);
              pintarVisitante(__ctx,__cv.width,__cv.height,mm,1.2); },120)};
  });
  console.log('    rosto limpo: '+d.limpo+' ms · com três defeitos: '+d.comDefeitos+' ms');
  ok('cabe no orçamento de um quadro (16 ms)', d.limpo<16&&d.comDefeitos<16);
  ok('e sobra folga de verdade (menos de 6 ms)', d.limpo<6);
}

console.log('\n5. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
