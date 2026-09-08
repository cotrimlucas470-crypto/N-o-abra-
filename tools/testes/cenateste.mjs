/* Reformulação visual — os nove cômodos.

   O briefing supõe que as áreas são "o mesmo fundo com outra cor". Não
   são, e isso já estava medido na auditoria. O que este harness prova é
   o que a Etapa 3 acrescentou: que os móveis POUSAM no chão em vez de
   flutuar, que o desgaste da parede é diferente em cada cômodo e igual
   toda vez que você volta, e que nada disso custou o quadro. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Cena'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

await p.evaluate(()=>{
  window.__W=390; window.__H=844;   /* o formato real do celular */
  const tela=document.getElementById('tela');
  tela.width=__W; tela.height=__H;
  window.__pinta=(i,t)=>{
    cena.casa=cena.casa||{}; cena.casa.voce=i;
    CX.clearRect(0,0,__W,__H);
    CENAS[i](__W,__H,t==null?1.4:t);
    return CX.getImageData(0,0,__W,__H).data;
  };
  /* diferenca media por pixel numa faixa. O contador por limiar (>16)
     mede bem imagem clara e cega em imagem escura: quando o chao ficou
     escuro de novo, a MESMA mancha passou a somar menos de 16 e sumiu da
     conta. Pra desgaste, o que vale e a media, sem limiar. */
  window.__med=(a,b2,y0,y1)=>{ let s=0,n=0,marcados=0,pico=0;
    for(let y=(__H*y0)|0;y<(__H*y1)|0;y+=2)for(let x=0;x<__W;x+=2){
      const i=(y*__W+x)*4;
      const q=Math.abs(a[i]-b2[i])+Math.abs(a[i+1]-b2[i+1])+Math.abs(a[i+2]-b2[i+2]);
      s+=q; n++; if(q>8)marcados++; if(q>pico)pico=q; }
    /* a media sozinha engana: a marca e localizada, e uma media diluida
       na parede inteira fica pequena mesmo quando a marca e obvia. Por
       isso vai junto a FATIA da parede que mudou de lugar, e o pico. */
    return {media:+(s/n).toFixed(2), fatia:+(marcados/n*100).toFixed(1), pico}; };
  window.__dif=(a,b2)=>{ let d=0,n=0;
    for(let i=0;i<a.length;i+=16){
      const q=Math.abs(a[i]-b2[i])+Math.abs(a[i+1]-b2[i+1])+Math.abs(a[i+2]-b2[i+2]);
      if(q>16)d++; n++; }
    return +(d/n*100).toFixed(1); };
  window.__lum=(px,x0,x1,y0,y1)=>{ let s=0,n=0;
    for(let y=Math.floor(__H*y0);y<Math.floor(__H*y1);y+=2)
      for(let x=Math.floor(__W*x0);x<Math.floor(__W*x1);x+=2){
        const i=(y*__W+x)*4; s+=px[i]*.2126+px[i+1]*.7152+px[i+2]*.0722; n++; }
    return n?+(s/n).toFixed(2):0; };
});

console.log('\n1. OS NOVE CÔMODOS SÃO NOVE CÔMODOS');
{
  const d=await p.evaluate(()=>{
    const imgs=[]; for(let i=0;i<9;i++)imgs.push(__pinta(i));
    let menor=100, par=null;
    const m=[];
    for(let i=0;i<9;i++)for(let j=i+1;j<9;j++){
      const q=__dif(imgs[i],imgs[j]);
      m.push(q);
      if(q<menor){menor=q;par=[i,j];}
    }
    return {menor, par, media:+(m.reduce((a,b2)=>a+b2,0)/m.length).toFixed(1), pares:m.length};
  });
  console.log('    '+d.pares+' pares comparados · diferença média '+d.media+'%'
    +' · o par mais parecido é '+JSON.stringify(d.par)+' com '+d.menor+'%');
  ok('nenhum par de cômodos é quase igual', d.menor>12);
  ok('e no geral eles são bem diferentes',  d.media>25);
}

console.log('\n2. O DESGASTE É PRÓPRIO DE CADA PAREDE — E NÃO MUDA DE LUGAR');
{
  const d=await p.evaluate(()=>{
    /* mesma parede, duas vezes: tem de sair igual */
    const a1=__pinta(1), a2=__pinta(1);
    /* e a marca da parede de dois comodos com a MESMA paleta tem de diferir.
       Uso paredeBase direto pra isolar a parede do movel. */
    const soParede=(i)=>{ cena.casa.voce=i; CX.clearRect(0,0,__W,__H);
      paredeBase(__W,__H,['#100C12','#191320','#0C0910'],'#171118');
      return CX.getImageData(0,0,__W,__H).data; };
    const p0=soParede(0), p4=soParede(4), p8=soParede(8), p0b=soParede(0);
    return {mesmaCena:__dif(a1,a2), mesmaParede:__dif(p0,p0b),
      /* so a faixa da parede (acima do piso, abaixo do teto) */
      igual:__med(p0,p0b,.10,.70),
      pares:{'0×4':__med(p0,p4,.10,.70), '0×8':__med(p0,p8,.10,.70), '4×8':__med(p4,p8,.10,.70)}};
  });
  console.log('    a mesma cena desenhada duas vezes difere '+d.mesmaCena+'%');
  console.log('    a mesma parede desenhada duas vezes difere '+d.mesmaParede+'%');
  console.log('    a MESMA parede duas vezes: mudou '+d.igual.fatia+'% dela (tem de ser 0%)');
  for(const k in d.pares) console.log('    parede '+k+' (mesma paleta): mudou '
    +d.pares[k].fatia+'% dela · pico '+d.pares[k].pico+' · média '+d.pares[k].media);
  const fatias=Object.values(d.pares).map(v=>v.fatia);
  ok('voltar no cômodo dá o mesmo desenho',
     d.mesmaCena<0.5&&d.mesmaParede<0.5&&d.igual.fatia===0&&d.igual.pico===0);
  ok('mas o desgaste muda de cômodo pra cômodo', Math.min(...fatias)>3);
}

console.log('\n3. OS MÓVEIS POUSAM NO CHÃO');
{
  /* A PRIMEIRA VERSAO DESTE TESTE ESTAVA ERRADA e passou a medir outra
     coisa. Ela comparava o chao SOB o movel com o chao AO LADO, e deu o
     contrario do esperado — mas nao porque a sombra faltasse: o proprio
     piso tem um degrade radial (o `pg` do paredeBase) que e claro no meio
     e escuro na beirada. Comparar meio com beirada mede o degrade, nao a
     sombra. O movel fica no meio, entao o "sob" ganhava sempre.

     O jeito certo e comparar OS MESMOS PIXELS com a sombra e sem ela:
     desligo o `pousar`, redesenho, e vejo o que mudou. O que muda e a
     sombra de contato, por definicao. */
  const d=await p.evaluate(()=>{
    const of=__pinta(3), po=__pinta(6), sa=__pinta(4);

    const original=window.pousar;
    let chamadas=0;
    window.pousar=function(){chamadas++;};
    const of2=__pinta(3), po2=__pinta(6), sa2=__pinta(4);
    const desligou=chamadas>0;
    window.pousar=original;
    const of3=__pinta(3);

    /* onde a sombra caiu: pixels que a sombra escureceu, e quanto */
    const onde=(com,sem)=>{
      let n=0, soma=0, rel=0, y0=1, y1=0, x0=1, x1=0, claros=0;
      for(let y=0;y<__H;y+=2)for(let x=0;x<__W;x+=2){
        const i=(y*__W+x)*4;
        const lc=com[i]*.2126+com[i+1]*.7152+com[i+2]*.0722;
        const ls=sem[i]*.2126+sem[i+1]*.7152+sem[i+2]*.0722;
        if(ls-lc>2){ n++; soma+=ls-lc; rel+=(ls-lc)/Math.max(1,ls);
          const fy=y/__H, fx=x/__W;
          if(fy<y0)y0=fy; if(fy>y1)y1=fy; if(fx<x0)x0=fx; if(fx>x1)x1=fx; }
        else if(lc-ls>2) claros++;
      }
      /* sem pixels nao ha faixa: devolvo -1 pra assercao de posicao nao
         passar de graca com o conjunto vazio, que foi o que aconteceu
         quando plantei a regressao pra conferir o teste. */
      if(!n) return {pixels:0, clareou:claros, forca:0, parte:0, alto:-1, baixo:-1, esq:-1, dir:-1};
      return {pixels:n, clareou:claros,
        forca:+(soma/n).toFixed(2),
        /* quanto da luz daquele ponto a sombra comeu, em % — e isso que
           vale. Em ponto absoluto um chao escuro sempre "perde menos",
           entao o numero absoluto media o brilho do chao, nao a sombra. */
        parte:+(rel/n*100).toFixed(1),
        alto:+y0.toFixed(2), baixo:+y1.toFixed(2),
        esq:+x0.toFixed(2), dir:+x1.toFixed(2)};
    };
    return {desligou, chamadas, estavel:__dif(of,of3),
      oficina:onde(of,of2), porao:onde(po,po2), sala:onde(sa,sa2),
      temPousar:typeof pousar==='function', temBloco:typeof bloco==='function'};
  });

  const linha=(n,r)=>console.log('    '+n+': a sombra escureceu '+r.pixels
    +' pontos, comendo '+r.parte+'% da luz deles (média '+r.forca+' de brilho), na faixa de baixo y '
    +r.alto+'–'+r.baixo+' · e nao clareou nada? '+(r.clareou===0?'nao clareou':'clareou '+r.clareou));
  console.log('    (desliguei o pousar e redesenhei: '+d.chamadas+' chamadas interceptadas)');
  linha('oficina', d.oficina); linha('porão  ', d.porao); linha('sala   ', d.sala);
  console.log('    religando o pousar, o desenho volta a ser o mesmo: difere '+d.estavel+'%');

  ok('as ferramentas de volume existem',        d.temPousar&&d.temBloco);
  ok('dá pra desligar a sombra pra comparar',   d.desligou);
  ok('a sombra existe nos três cômodos',        d.oficina.pixels>200&&d.porao.pixels>200&&d.sala.pixels>200);
  ok('e ela só escurece, nunca clareia',        d.oficina.clareou===0&&d.porao.clareou===0&&d.sala.clareou===0);
  ok('ela cai no chão, embaixo do móvel',       d.oficina.alto>.55&&d.porao.alto>.55&&d.sala.alto>.55);
  ok('e come um pedaço de verdade da luz',      d.oficina.parte>15&&d.porao.parte>15&&d.sala.parte>15);
  ok('religar deixa tudo como estava',          d.estavel<0.5);
}

console.log('\n3b. O CHÃO CONTINUA CHÃO DE CASA ESCURA');
{
  /* ERRO MEU, PEGO NA FOTO E DEPOIS MEDIDO: a primeira versao do degrade
     do piso ia de creme ate preto num gradiente so. Isso NAO escurece a
     beirada — a cor e a opacidade interpolam juntas, entao o meio do
     caminho e cinza a 22%, e o chao quase preto virou tapete claro. O
     brilho medio do piso subiu de 14,88 pra 25,61 (+72%) e em tres
     comodos o CHAO ficou mais claro que a PAREDE, que e leitura errada
     num comodo iluminado por lampiao la em cima.

     Aqui ficam as duas travas: o piso nunca pode ficar mais claro que a
     parede, e a vinheta do piso tem de escurecer a beirada de verdade. */
  const d=await p.evaluate(()=>{
    const r={};
    for(let i=0;i<9;i++){
      const px=__pinta(i);
      r[i]={chao:__lum(px,.05,.95,.76,.97), parede:__lum(px,.05,.95,.30,.62),
            meio:__lum(px,.35,.65,.78,.90),
            beira:Math.min(__lum(px,0,.10,.78,.90),__lum(px,.90,1,.78,.90))};
    }
    return r;
  });
  const ids=Object.keys(d);
  const claros=ids.filter(i=>d[i].chao>=d[i].parede);
  const semVinheta=ids.filter(i=>d[i].meio<=d[i].beira);
  const md=k=>+(ids.reduce((a,i)=>a+d[i][k],0)/9).toFixed(2);
  console.log('    média: chão '+md('chao')+' · parede '+md('parede')
    +' · miolo do chão '+md('meio')+' · beirada do chão '+md('beira'));
  console.log('    cômodos com o chão mais claro que a parede: '+(claros.length?claros.join(', '):'nenhum'));
  console.log('    cômodos sem vinheta no chão: '+(semVinheta.length?semVinheta.join(', '):'nenhum'));
  ok('o chão nunca fica mais claro que a parede', claros.length===0);
  ok('o chão continua escuro (média < 20)',       md('chao')<20);
  ok('e a vinheta do chão escurece a beirada',    semVinheta.length===0);
}

console.log('\n4. TEM UMA CAMADA NA FRENTE');
{
  const d=await p.evaluate(()=>{
    const r={};
    for(let i=0;i<9;i++){
      const px=__pinta(i);
      /* a camada da frente escurece uma borda: comparo a borda com o miolo */
      r[i]={borda:Math.min(__lum(px,0,.05,.15,.85),__lum(px,.95,1,.15,.85),
                           __lum(px,.15,.85,0,.04),__lum(px,.15,.85,.96,1)),
            miolo:__lum(px,.35,.65,.35,.65)};
    }
    const fonte=CENAS[0].toString()+CENAS[4].toString()+CENAS[8].toString();
    return {r, chamaFrente:(fonte.match(/frente\(/g)||[]).length};
  });
  const comFrente=Object.keys(d.r).filter(i=>d.r[i].borda<d.r[i].miolo);
  console.log('    cômodos com a borda mais escura que o miolo: '+comFrente.length+' de 9');
  ok('as cenas chamam a camada da frente', d.chamaFrente>=3);
  ok('e ela escurece a borda em todos',    comFrente.length===9);
}

console.log('\n5. O CUSTO');
{
  const d=await p.evaluate(()=>{
    const med=(i,n)=>{ const t=performance.now();
      for(let k=0;k<n;k++){ CX.clearRect(0,0,__W,__H); CENAS[i](__W,__H,1.4+k*0.01); }
      return +((performance.now()-t)/n).toFixed(3); };
    med(4,20);
    const r={}; for(let i=0;i<9;i++)r[i]=med(i,60);
    const v=Object.values(r);
    return {porComodo:r, pior:Math.max(...v), media:+(v.reduce((a,b2)=>a+b2,0)/v.length).toFixed(3)};
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
