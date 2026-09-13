import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const SAIDA='/tmp/claude-0/-home-user-N-o-abra-/49d84cda-7adf-5e47-9e63-bc3774aaa498/scratchpad/show';
fs.mkdirSync(SAIDA,{recursive:true});

const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});
const p=await b.newPage({viewport:{width:1100,height:900}});
p.on('pageerror',e=>console.log('  [pageerror]',e.message.slice(0,160)));

await p.goto('http://127.0.0.1:8901/docs/showcase.html',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.__show && window.__show.pronto===true,null,{timeout:120000});
const info=await p.evaluate(()=>window.__cenasInfo());
console.log('cenas:',info.length,'total', info.reduce((a,c)=>a+c.dur,0)+'s');

await p.evaluate(()=>window.__tocar(false));

function medir(png){
  return png.length;
}
for(let k=0;k<info.length;k++){
  const linha=[];
  for(const f of [0.2,0.55,0.92]){
    const t=+(info[k].dur*f).toFixed(2);
    await p.evaluate(([k,t])=>window.__irPara(k,t),[k,t]);
    await p.waitForTimeout(220);           // deixa 2 quadros rodarem
    const d=await p.evaluate(()=>{
      const c=document.getElementById('tv');
      const g=c.getContext('2d');
      const px=g.getImageData(0,0,c.width,c.height).data;
      let acesos=0,soma=0;
      for(let i=0;i<px.length;i+=4){ const v=(px[i]+px[i+1]+px[i+2])/3; soma+=v; if(v>18)acesos++; }
      return {url:c.toDataURL('image/png'), acesos, media:+(soma/(px.length/4)).toFixed(2)};
    });
    const arq=`${SAIDA}/c${String(k+1).padStart(2,'0')}-${String(Math.round(f*100)).padStart(2,'0')}.png`;
    fs.writeFileSync(arq,Buffer.from(d.url.split(',')[1],'base64'));
    linha.push(`${t}s acesos=${d.acesos} média=${d.media} ${(fs.statSync(arq).size/1024|0)}KB`);
  }
  console.log(`${String(k+1).padStart(2)}. ${info[k].nome.padEnd(28)} ${linha.join(' | ')}`);
}
await b.close();
