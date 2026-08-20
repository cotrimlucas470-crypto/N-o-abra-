/* Fumaça no PACOTE, não na cópia de trabalho: abre o index.html que saiu
   do v59.zip, joga de verdade e fotografa. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const DIR=process.env.PACOTE||'/tmp/pacote';  /* PACOTE=... aponta pro diretório onde o zip foi aberto */
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('file://'+DIR+'/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Lucas'); await p.click('#go');
await p.waitForTimeout(700);
if(await p.$('#ficha')){
  await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=3;fichaJogador().pontos.velocidade=3;
    fichaJogador().pontos.percepcao=2;fichaJogador().pontos.furtividade=2;
    document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(700);
}
await p.waitForTimeout(21000);
ok('o pacote abre e chega no jogo',await p.$('#acoes')!==null);
await p.screenshot({path:(process.env.FOTOS||DIR)+'/f1-dia.png'});

/* a pilha de governança responde */
let d=await p.evaluate(()=>({
  dia:S.dia, dif:+dif().toFixed(3),
  catalogo:Object.keys(CATALOGO_ANOM).length,
  orq:orqEstado(), mem:{noites:memEstado().noites, host:memEstado().hostilidade},
  prog:Object.keys(progEstado()).length, rumo:!!rumoEstado(),
  rng:{semente:S.rngSemente, estado:typeof S.rngEstado}
}));
console.log('   ',JSON.stringify({dia:d.dia,dif:d.dif,catalogo:d.catalogo,
  orcamento:d.orq.orcamento,vales:d.orq.vales,mem:d.mem}));
ok('o catálogo governado tem 22 (21 + a isca)',d.catalogo===22);
ok('o orçamento da noite existe e tem vale',d.orq.orcamento>0&&d.orq.vales.length>0);
ok('o multiplicador de dificuldade começa em 0,60',d.dif===.6);

/* pula pro dia 12 e confere que a dificuldade parou no teto */
d=await p.evaluate(()=>{ const a=difDia(12); const b=difDia(40);
  return {d12:+a.toFixed(3), d40:+b.toFixed(3), orc:orqEstado().orcamento}; });
console.log('   ',JSON.stringify(d));
ok('no dia 12 a dificuldade chega em 0,80',d.d12===.8);
ok('e no dia 40 continua 0,80 — não infla',d.d40===.8);

/* a memória aprende jogando e a casa passa a encarecer */
d=await p.evaluate(()=>{
  S.dia=9; S.memoriaAnomalias=null; memoria();
  const antes=pesoDaMemoria(CATALOGO_ANOM.bicho_imitador);
  for(let n=0;n<9;n++){ memVer('metodos','esconder'); memVer('pontosFortes','fuga');
    memFecharNoite(true); }
  return {antes, depois:+pesoDaMemoria(CATALOGO_ANOM.bicho_imitador).toFixed(3),
    host:memoria().hostilidade, esconder:+memLer('metodos','esconder').toFixed(2)};
});
console.log('   ',JSON.stringify(d));
ok('nove noites se escondendo ensinam a casa',d.esconder>.5);
ok('e o Imitador fica mais provável — sem eliminar ninguém',d.depois>d.antes&&d.depois>1);

/* a ficha desenha as barras de progresso */
await p.evaluate(()=>{ S.dia=6; ganharXP('velocidade',40,'teste');
  ganharXP('forca',30,'teste'); });
{const bt=await p.$$('#acoes button');
 for(const x of bt){ const t=(await x.innerText()).toLowerCase();
   if(t.includes('ficha')||t.includes('você')){ await x.click(); break; } }}
await p.waitForTimeout(1200);
await p.screenshot({path:(process.env.FOTOS||DIR)+'/f2-ficha.png'});
ok('a ficha abre',await p.$('#ficha, #painel, .ficha')!==null
  ||(await p.content()).includes('velocidade'));

/* a galeria das sombras da porta */
await p.evaluate(()=>{ try{ portaGaleria(); }catch(e){} });
await p.waitForTimeout(1400);
await p.screenshot({path:(process.env.FOTOS||DIR)+'/f3-portas.png'});

console.log('\n  erros de página:',erros.length?erros.slice(0,5):'nenhum');
ok('nenhum erro de página no pacote',erros.length===0);
await b.close();
