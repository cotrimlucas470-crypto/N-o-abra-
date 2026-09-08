/* Etapa 4 — texturas.

   Medido ANTES de escrever uma linha: nenhuma superficie do jogo tinha
   direcao. Madeira, metal e concreto davam a mesma razao de anisotropia
   (1,02 a 1,32) — a bancada era tao lisa quanto a parede do porao.
   Degrade nao e textura.

   O instrumento e a RAZAO DE ANISOTROPIA: a variacao de brilho de um
   pixel pro vizinho de lado, dividida pela variacao pro vizinho de
   baixo. Veio de madeira e risco de metal sao compridos numa direcao so,
   entao a razao sobe. Poro de concreto e isotropico: a razao fica perto
   de 1, mas a variacao TOTAL tem de subir, senao e chapado.

   CUIDADO: essa razao NAO serve pro chao. O chao foge em perspectiva, e
   ali o veio converge de proposito enquanto as pontas das tabuas correm
   atravessadas — ter estrutura nas duas direcoes e o CERTO. Pro chao o
   teste e outro: o veio tem de convergir junto com o piso. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Tex'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

await p.evaluate(()=>{
  window.__W=390; window.__H=844;
  const tela=document.getElementById('tela'); tela.width=__W; tela.height=__H;
  window.__pinta=(i,t)=>{ cena.casa=cena.casa||{}; cena.casa.voce=i;
    CX.clearRect(0,0,__W,__H); CENAS[i](__W,__H,t==null?1.4:t);
    return CX.getImageData(0,0,__W,__H).data; };
  window.__L=(px,x,y)=>{const k=(y*__W+x)*4;return px[k]*.2126+px[k+1]*.7152+px[k+2]*.0722;};
  window.__aniso=(px,x0,x1,y0,y1)=>{
    let dh=0,dv=0,n=0;
    for(let y=(__H*y0)|0;y<(__H*y1)|0;y++)for(let x=(__W*x0)|0;x<(__W*x1)|0;x++){
      const v=__L(px,x,y); dh+=Math.abs(__L(px,x+1,y)-v); dv+=Math.abs(__L(px,x,y+1)-v); n++; }
    const mh=dh/n, mv=dv/n;
    return {razao:+(Math.max(mh,mv)/Math.max(.001,Math.min(mh,mv))).toFixed(2),
            grao:+((mh+mv)/2).toFixed(3)}; };
});

console.log('\n1. AS TRÊS FERRAMENTAS EXISTEM E SÓ TECEM UMA VEZ');
{
  const d=await p.evaluate(()=>{
    const antes=Object.keys(TEX_CACHE).length;
    const t0=performance.now(); __pinta(3); const primeira=performance.now()-t0;
    const meio=Object.keys(TEX_CACHE).length;
    const t1=performance.now(); for(let k=0;k<30;k++)__pinta(3);
    const depois=(performance.now()-t1)/30;
    return {antes, meio, depois:+depois.toFixed(3), primeira:+primeira.toFixed(3),
      tem:['texVeio','texPoro','texRisco','material'].every(n=>typeof window[n]==='function'),
      chaves:Object.keys(TEX_CACHE).sort()};
  });
  console.log('    tecidos no cache: '+d.chaves.join(', '));
  console.log('    o cache não cresce depois: '+d.antes+' → '+d.meio+' e para');
  ok('as três texturas e o aplicador existem', d.tem);
  ok('o tecido é guardado, não refeito',       d.meio>=4);
}

console.log('\n2. MADEIRA TEM VEIO, METAL TEM RISCO, CONCRETO TEM PORO');
{
  /* ARMADILHA QUE EU CAI: a primeira versao so olhava a razao contra um
     limite fixo de 1,3. Plantei a regressao (desliguei o `material`) e
     "a madeira tem direcao" PASSOU assim mesmo — bancada 1,32, muro
     1,41 — porque degrade dentro de retangulo mais duas arestas ja dao
     razao alta sozinhos. Limite que nao separa nao e teste.
     Medido, o que separa e o GRAO: bancada 1,048 -> 1,591, muro 1,049 ->
     1,699, gerador 1,297 -> 1,722. Entao cada superficie e medida com o
     tecido LIGADO e DESLIGADO, e a conta e a diferenca.
     Cada uma pelo interruptor certo: as que recebem `material` pelo
     `material`, e a porta pelo `veios`, que e de onde vem o veio dela. */
  const d=await p.evaluate(()=>{
    const alvos=()=>{
      const of=__pinta(3), po=__pinta(6), en=__pinta(7), q=__pinta(8), sa=__pinta(4);
      return {
        bancada:  __aniso(of,.10,.62,.605,.645),
        muro:     __aniso(q,.10,.90,.42,.58),
        /* a CHAPA de cima do gerador, nao o miolo dele: a faixa
           .50-.68 pega o painel afundado e o mostrador redondo, que sao
           lisos de proposito, e diluia o metal escovado ate a razao
           cair pra 1,32. Medir material exige mirar no material. */
        gerador:  __aniso(po,.32,.68,.465,.505),
        paredePo: __aniso(po,.10,.90,.15,.45),
        paredeSa: __aniso(sa,.10,.60,.15,.45),
        porta:    __aniso(en,.30,.70,.30,.60)
      };
    };
    const com=alvos();
    const m=window.material; let bateu=0;
    window.material=function(){bateu++;};
    const semMat=alvos();
    window.material=m;
    const v=window.veios; let bateuV=0;
    window.veios=function(){bateuV++;};
    const semVeio=alvos();
    window.veios=v;
    return {com, semMat, semVeio, bateu, bateuV};
  });
  const l=(n,k,sem)=>{
    const c=d.com[k], s2=sem[k];
    console.log('    '+n.padEnd(22)+' grão '+String(s2.grao).padStart(5)+' → '
      +String(c.grao).padStart(5)+'  (razão '+s2.razao+' → '+c.razao+')');
    return c.grao-s2.grao;
  };
  console.log('    (sem tecido → com tecido)');
  const gB=l('bancada (madeira)','bancada',d.semMat);
  const gM=l('muro (madeira)','muro',d.semMat);
  const gG=l('gerador (metal)','gerador',d.semMat);
  const gPo=l('parede do porão (poro)','paredePo',d.semMat);
  const gSa=l('parede da sala (poro)','paredeSa',d.semMat);
  const gP=l('porta (veios)','porta',d.semVeio);
  ok('desligar o tecido é possível (senão o teste é cego)', d.bateu>0&&d.bateuV>0);
  ok('a madeira ganha veio de verdade',   gB>.3&&gM>.3);
  ok('o metal ganha risco de verdade',    gG>.3);
  ok('a parede ganha poro de verdade',    gPo>.15&&gSa>.15);
  ok('a porta ganha veio nos painéis',    gP>.15);
  ok('e a madeira e o metal têm direção', d.com.bancada.razao>1.35&&d.com.muro.razao>1.5
     &&d.com.gerador.razao>1.35&&d.com.porta.razao>1.3);
  ok('enquanto o poro não tem (é poro)',  d.com.paredePo.razao<1.15&&d.com.paredeSa.razao<1.15);
}

console.log('\n3. O VEIO DO CHÃO ACOMPANHA A FUGA DO PISO');
{
  /* Duas armadilhas aqui, as duas minhas.

     1. A razao de anisotropia nao serve pro chao: em perspectiva ter
        estrutura nas duas direcoes e o CERTO — o veio converge e as
        pontas das tabuas correm atravessadas.
     2. A primeira versao contava bordas e exigia convergencia. Plantei a
        regressao — apaguei o veio inteiro — e o teste PASSOU: 32/21/9
        linhas, vao de 11 a 28px, convergindo lindamente. So que aquilo
        eram as JUNTAS das tabuas, que sempre convergiram. O veio nao
        estava sendo medido em lugar nenhum.

     Por isso o veio virou funcao com nome: agora da pra desligar so ele
     e ver o que sobra. O piso e desenhado sozinho, sem movel. */
  const d=await p.evaluate(()=>{
    const so=()=>{ cena.casa=cena.casa||{}; cena.casa.voce=3;
      CX.clearRect(0,0,__W,__H);
      paredeBase(__W,__H,['#0D0B0E','#171319','#0B090C'],'#191310');
      return CX.getImageData(0,0,__W,__H).data; };
    const vaos=(px,fy)=>{
      const y=(__H*fy)|0, pos=[];
      for(let x=(__W*.06)|0;x<(__W*.94)|0;x++)
        if(Math.abs(__L(px,x+1,y)-__L(px,x,y))>.8)pos.push(x);
      const g=[]; pos.forEach(x=>{ if(!g.length||x-g[g.length-1]>2)g.push(x); });
      if(g.length<2)return {linhas:g.length, vao:0};
      let s=0; for(let k=1;k<g.length;k++)s+=g[k]-g[k-1];
      return {linhas:g.length, vao:+(s/(g.length-1)).toFixed(1)};
    };
    const medir=px=>({longe:vaos(px,.755), meio:vaos(px,.85), perto:vaos(px,.95)});
    const com=medir(so());
    const f=window.veioDoPiso; let bateu=0;
    window.veioDoPiso=function(){bateu++;};
    const sem=medir(so());
    window.veioDoPiso=f;
    return {com, sem, bateu};
  });
  const l=(n,c,s2)=>console.log('    '+n.padEnd(20)+' '+String(s2.linhas).padStart(3)+' → '
    +String(c.linhas).padStart(3)+' linhas · vão '+s2.vao+' → '+c.vao+'px');
  console.log('    (sem veio → com veio)');
  l('perto do horizonte',d.com.longe,d.sem.longe);
  l('no meio',           d.com.meio, d.sem.meio);
  l('perto do jogador',  d.com.perto,d.sem.perto);
  ok('dá pra desligar só o veio do chão', d.bateu>0);
  ok('o veio acrescenta linha de verdade',
     d.com.longe.linhas>d.sem.longe.linhas*1.8
     &&d.com.meio.linhas>d.sem.meio.linhas*1.5
     &&d.com.perto.linhas>d.sem.perto.linhas*1.5);
  ok('e ele aperta o vão em todo o piso',
     d.com.longe.vao<d.sem.longe.vao*.65&&d.com.meio.vao<d.sem.meio.vao*.75
     &&d.com.perto.vao<d.sem.perto.vao*.75);
  /* esta ultima sozinha NAO discrimina — as juntas ja convergem sem veio
     nenhum. Ela so vale acompanhada das duas de cima. */
  ok('e o piso abre conforme chega perto',
     d.com.perto.vao>d.com.meio.vao&&d.com.meio.vao>d.com.longe.vao);
}

console.log('\n4. TEXTURA NÃO É CHUVISCO: VOLTAR DÁ O MESMO DESENHO');
{
  const d=await p.evaluate(()=>{
    const dif=(a,b2)=>{let n=0,t=0;
      for(let i=0;i<a.length;i+=4){
        if(a[i]!==b2[i]||a[i+1]!==b2[i+1]||a[i+2]!==b2[i+2])n++; t++;}
      return +(n/t*100).toFixed(2);};
    const a=__pinta(3), b2=__pinta(6), c=__pinta(3), e=__pinta(6);
    /* e o tecido tem de ser o mesmo depois de jogar o cache fora */
    const g=document.createElement('canvas'); g.width=g.height=96;
    texVeio(g.getContext('2d'),96,0);
    const um=g.getContext('2d').getImageData(0,0,96,96).data;
    const g2=document.createElement('canvas'); g2.width=g2.height=96;
    texVeio(g2.getContext('2d'),96,0);
    const dois=g2.getContext('2d').getImageData(0,0,96,96).data;
    let ig=true; for(let i=0;i<um.length;i++)if(um[i]!==dois[i]){ig=false;break;}
    return {oficina:dif(a,c), porao:dif(b2,e), tecidoIgual:ig};
  });
  console.log('    mesma oficina duas vezes: '+d.oficina+'% diferente · mesmo porão: '+d.porao+'%');
  console.log('    o tecido gerado duas vezes do zero é idêntico: '+(d.tecidoIgual?'sim':'NÃO'));
  ok('o cômodo não muda de textura quando você volta', d.oficina===0&&d.porao===0);
  ok('e o tecido é semeado, não sorteado',             d.tecidoIgual);
}

console.log('\n5. O CUSTO');
{
  const d=await p.evaluate(()=>{
    const med=(i,n)=>{const t=performance.now();
      for(let k=0;k<n;k++){CX.clearRect(0,0,__W,__H);CENAS[i](__W,__H,1.4+k*.01);}
      return +((performance.now()-t)/n).toFixed(3);};
    med(4,20);
    const r={}; for(let i=0;i<9;i++)r[i]=med(i,60);
    const v=Object.values(r);
    return {porComodo:r,pior:Math.max(...v),media:+(v.reduce((a,b2)=>a+b2,0)/v.length).toFixed(3)};
  });
  console.log('    por cômodo (ms): '+JSON.stringify(d.porComodo));
  console.log('    média '+d.media+' ms · o mais caro '+d.pior+' ms');
  ok('o cômodo mais caro cabe num quadro de 16 ms', d.pior<16);
  ok('e sobra folga de verdade (média < 5 ms)',     d.media<5);
}

console.log('\n6. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
