import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:1100,height:900}});
const erros=[];
p.on('pageerror',e=>erros.push(e.message));
/* NAO conta erro de RECURSO: os dois que aparecem aqui sao do jogo e sao
   esperados — a fonte do Google nao tem saida neste sandbox, e
   `audio/chuva.mp3` e o caminho de TROCA que o §17 tenta antes de cair na
   embutida (esta documentado no bloco). Contar os dois faria o teste
   reprovar uma coisa certa. */
p.on('console',m=>{ if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))
  erros.push('console: '+m.text()); });
await p.goto('http://127.0.0.1:8901/docs/showcase.html',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.__show&&window.__show.pronto===true,null,{timeout:150000});
/* roda o showcase inteiro uma vez, rapido, passando por todas as cenas */
const info=await p.evaluate(()=>window.__cenasInfo());
for(let k=0;k<info.length;k++){
  for(const f of [0.05,0.5,0.95]){
    await p.evaluate(([k,t])=>window.__irPara(k,t),[k,info[k].dur*f]);
    await p.waitForTimeout(140);
  }
}
/* e confere os botoes */
const botoes=await p.evaluate(()=>{
  const ids=['bPlay','bPrev','bNext','bRe'];
  const r={};
  ids.forEach(i=>{ const b=document.getElementById(i); r[i]=!!b; if(b)b.click(); });
  r.lista=document.getElementById('lista').children.length;
  r.gravar=[...document.querySelectorAll('button')].some(b=>/gravar/.test(b.textContent));
  return r;
});
console.log('botões:',JSON.stringify(botoes));
console.log('erros de página:', erros.length? erros.slice(0,5).join(' | ') : 'nenhum');
await b.close();
process.exit(erros.length?1:0);
