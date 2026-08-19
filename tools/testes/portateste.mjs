/* A silhueta debaixo da porta: forma por categoria, escala relativa. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('file:///home/user/N-o-abra-/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','P'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=5; document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);

console.log('\n1. AS FORMAS E QUEM CAI EM CADA UMA');
let d=await p.evaluate(()=>{
  const f=portaFormas();
  const total=Object.values(f).reduce((n,x)=>n+x.criaturas.length,0);
  return {formas:Object.keys(f), f, total,
    criaturas:Object.keys(FORMA_DE).length,
    silhuetasUnicas:new Set(Object.keys(FORMA).map(k=>
      JSON.stringify(FORMA[k].pes(0)))).size};
});
Object.keys(d.f).forEach(k=>console.log(`   ${k.padEnd(9)} ${d.f[k].criaturas.join(', ')}`));
ok('existem seis formas',d.formas.length===6);
ok('as 15 criaturas estão todas mapeadas',d.total===15&&d.criaturas===15);
ok('duas formas nunca produzem a mesma silhueta',d.silhuetasUnicas===6);

console.log('\n2. RITMO DE BATIDA PRÓPRIO POR FORMA');
d=await p.evaluate(()=>{
  const r={};
  Object.keys(FORMA).forEach(k=>{ r[k]=FORMA[k].batida; });
  const chaves=Object.values(r).map(b=>JSON.stringify(b));
  return {r, unicos:new Set(chaves).size};
});
Object.keys(d.r).forEach(k=>console.log(`   ${k.padEnd(9)} ${d.r[k].compasso.join('s ')}s · força ${d.r[k].forca}`));
ok('cada forma tem compasso próprio',d.unicos===6);

console.log('\n3. ESCALA RELATIVA: 320 a 1080 SEM ESTOURAR O ENQUADRAMENTO');
const larguras=[320,390,540,768,1080];
const res=[];
for(const W of larguras){
  await p.setViewportSize({width:W,height:Math.round(W*2.16)});
  await p.waitForTimeout(320);
  const r=await p.evaluate(()=>{
    const w=CV.width/DPR, h=CV.height/DPR;
    const chao=h*.90, pw=Math.min(w*.60,h*.52), px=(w-pw)/2, py=h*.055, ph=chao-py;
    const fy=py+ph, fh=Math.max(5,h*.022);
    /* pra cada forma, o extremo esquerdo e direito da mancha */
    const out={};
    Object.keys(FORMA).forEach(k=>{
      const partes=FORMA[k].pes(1);
      let min=Infinity,max=-Infinity;
      partes.forEach(r2=>{
        const amp=PORTA_CFG.oscilacaoAgitado*1.8;      /* pior caso do balanço */
        min=Math.min(min,px+pw*(.5+r2.x-amp)-pw*.02);
        max=Math.max(max,px+pw*(.5+r2.x+amp)+pw*r2.w+pw*.04);
      });
      out[k]={min:Math.round(min),max:Math.round(max)};
    });
    return {w:Math.round(w),h:Math.round(h),px:Math.round(px),
      pxFim:Math.round(px+pw),fy:Math.round(fy),fh:Math.round(fh),formas:out};
  });
  res.push({W,r});
  const fora=Object.keys(r.formas).filter(k=>r.formas[k].min<0||r.formas[k].max>r.w);
  const foraDaPorta=Object.keys(r.formas).filter(k=>
    r.formas[k].min<r.px-r.w*.06||r.formas[k].max>r.pxFim+r.w*.06);
  console.log(`   ${String(W).padStart(4)}px  canvas ${r.w}×${r.h}  porta ${r.px}–${r.pxFim}`
    +`  fora do canvas: ${fora.length}  fora da porta: ${foraDaPorta.length}`);
}
await p.setViewportSize({width:390,height:844});
ok('nenhuma forma sai do canvas em nenhuma largura',
  res.every(x=>Object.keys(x.r.formas).every(k=>
    x.r.formas[k].min>=0&&x.r.formas[k].max<=x.r.w)));
ok('nenhuma forma escapa do enquadramento da porta',
  res.every(x=>Object.keys(x.r.formas).every(k=>
    x.r.formas[k].min>=x.r.px-x.r.w*.06&&x.r.formas[k].max<=x.r.pxFim+x.r.w*.06)));
ok('a fresta existe em todas as larguras',res.every(x=>x.r.fh>=5));

console.log('\n4. PARADO ≠ AGITADO');
d=await p.evaluate(()=>{
  const amp=ag=>PORTA_CFG.oscilacaoParado
    +(PORTA_CFG.oscilacaoAgitado-PORTA_CFG.oscilacaoParado)*ag;
  const vel=ag=>PORTA_CFG.velocidadeParado
    +(PORTA_CFG.velocidadeAgitado-PORTA_CFG.velocidadeParado)*ag;
  return {ampParado:amp(0), ampAgitado:amp(1), velParado:vel(0), velAgitado:vel(1)};
});
console.log('   ',JSON.stringify(d));
ok('agitado balança mais que parado',d.ampAgitado>d.ampParado*2);
ok('e mais rápido',d.velAgitado>d.velParado*2);

console.log('\n5. DESENHA SEM ERRO PARA AS 15 CRIATURAS');
d=await p.evaluate(()=>{
  const falhas=[];
  Object.keys(FORMA_DE).forEach(cri=>{
    try{
      portaMostrar(cri);
      const w=CV.width/DPR,h=CV.height/DPR;
      for(let q=0;q<6;q++)desenharPorta(w,h,q*0.7);
    }catch(e){ falhas.push(cri+': '+e.message); }
  });
  return {falhas, erros:(S.erros||[]).filter(e=>/SombraPorta/.test(e.onde||'')).length};
});
console.log('   ',JSON.stringify(d));
ok('as 15 desenham sem estourar',d.falhas.length===0);
ok('e sem registrar erro de desenho',d.erros===0);

console.log('\n6. CUSTO DE DESENHO (proxy de framerate, não medição em celular)');
d=await p.evaluate(()=>{
  const w=CV.width/DPR,h=CV.height/DPR;
  portaMostrar('matilhaC');                 /* a forma com mais partes */
  const roda=(n)=>{ const t0=performance.now();
    for(let i=0;i<n;i++)desenharPorta(w,h,i*0.033);
    return (performance.now()-t0)/n; };
  /* AQUECIMENTO. A primeira versão media 200 voltas com sombra e depois
     200 sem, e deu custo NEGATIVO (-0.8 ms): a segunda medida pegou o
     JIT já quente. Sem aquecer, o número não vale nada. */
  cena.sombra.dentro=true;  roda(300);
  cena.sombra.dentro=false; roda(300);
  /* e mede nas duas ordens, pra sobra de aquecimento não escolher lado */
  cena.sombra.dentro=true;  const a1=roda(400);
  cena.sombra.dentro=false; const b1=roda(400);
  cena.sombra.dentro=false; const b2=roda(400);
  cena.sombra.dentro=true;  const a2=roda(400);
  const comSombra=(a1+a2)/2, semSombra=(b1+b2)/2;
  /* O RUÍDO da bancada: a diferença entre duas medidas da MESMA
     condição. É o piso do que dá pra afirmar aqui. */
  const ruido=Math.max(Math.abs(a1-a2),Math.abs(b1-b2));
  return {comSombra:+comSombra.toFixed(3), semSombra:+semSombra.toFixed(3),
    custo:+(comSombra-semSombra).toFixed(3), ruido:+ruido.toFixed(3),
    amostras:{a1:+a1.toFixed(3),a2:+a2.toFixed(3),b1:+b1.toFixed(3),b2:+b2.toFixed(3)}};
});
console.log('   ',JSON.stringify(d),'ms por quadro');
/* A afirmação honesta não é "o custo é X": é que o custo está ABAIXO DO
   PISO DE MEDIÇÃO desta bancada. A versão anterior deste teste exigia
   `custo > 0`, e falhava metade das vezes — o efeito (~0.04 ms) é umas
   25 vezes menor que o ruído (~0.5 ms), e afirmar o SINAL de uma coisa
   menor que o ruído não é teste, é sorteio. */
ok('o custo da silhueta é menor que o ruído da medição (não dá pra separar)',
  Math.abs(d.custo)<=d.ruido);
ok('e é menor que 1 ms em qualquer leitura',Math.abs(d.custo)<1);
ok('o quadro inteiro cabe em 16 ms (60 fps)',d.comSombra<16);

console.log('\n7. O ATALHO DE DEBUG');
d=await p.evaluate(()=>({
  inchado:portaMostrar('inchado'),
  desconhecida:portaMostrar('nao_existe'),
  estado:portaEstado()
}));
console.log('   ',JSON.stringify(d));
ok('portaMostrar força a criatura e diz a forma',
  d.inchado&&d.inchado.forma==='largo');
ok('nome desconhecido não quebra',d.desconhecida===null);
ok('portaEstado devolve forma e camada',!!d.estado.forma);

console.log('\nerros de página:',erros.filter(e=>!/ERR_|file:/.test(e)).length?erros:'(nenhum)');
await b.close();
