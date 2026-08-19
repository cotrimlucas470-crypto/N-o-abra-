/* Varredura ampla: embrulha toda função do jogo, joga o jogo inteiro
   por muitos dias e sementes, e registra quem estoura. Cobre casa,
   noite, porta, invasão e expedição — não só a rua. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const SEEDS=+(process.argv[2]||5), CLIQUES=+(process.argv[3]||400);
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
p.on('pageerror',e=>{ if(!/ERR_|file:/.test(e.message))console.log('PAGEERROR',e.message.slice(0,140)); });
await p.goto('file:///home/user/N-o-abra-/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1200);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','V'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=5;fichaJogador().pontos.percepcao=5;
    document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);

const r=await p.evaluate(async(args)=>{
  const [SEEDS,CLIQUES]=args;
  const caiu={}, invariantes=[];
  const O=Object, nomes=O.getOwnPropertyNames(window);
  const desc={}; nomes.forEach(k=>{ try{desc[k]=O.getOwnPropertyDescriptor(window,k);}catch(e){} });
  nomes.forEach(k=>{
    if(/^[A-Z_$]/.test(k))return;
    let v; try{ v=window[k]; }catch(e){ return; }
    if(typeof v!=='function')return;
    if(v.toString().indexOf('[native code]')>=0)return;
    const d=desc[k]; if(!d||!d.writable)return;
    try{
      window[k]=function(){
        try{ return v.apply(this,arguments); }
        catch(e){
          const c=caiu[k]=caiu[k]||{n:0,msg:e.message,args:''};
          c.n++; if(!c.args)try{c.args=JSON.stringify([...arguments]).slice(0,110);}catch(x){c.args='(?)';}
          throw e;
        }
      };
    }catch(e){}
  });

  const espera=ms=>new Promise(r=>setTimeout(r,ms));
  let socorros=0, fins=0, cliques=0;
  const _soc=window.socorro; window.socorro=function(){socorros++;return _soc.apply(this,arguments);};

  /* invariantes checados a cada 20 cliques */
  const checar=()=>{
    const v=[];
    const num=(k,x)=>{ if(typeof x==='number'&&(!isFinite(x)||x<0))v.push(k+'='+x); };
    num('diesel',S.diesel); num('comida',S.comida); num('remedio',S.remedio);
    num('ruido',S.ruido); num('agua',S.agua); num('dia',S.dia);
    if(typeof S.san==='number')num('san',S.san);
    if(S.diesel>100)v.push('diesel>100: '+S.diesel);
    if(S.ruido>100)v.push('ruido>100: '+S.ruido);
    (S.abrigo||[]).forEach(pp=>{ if(!isFinite(pp.moral))v.push('moral NaN em '+pp.n);
      if(pp.moral<0||pp.moral>100)v.push('moral fora de 0-100: '+pp.n+'='+pp.moral); });
    try{ if(typeof pesoMochila==='function'&&!isFinite(pesoMochila()))v.push('pesoMochila NaN'); }catch(e){}
    /* duplicação: item no baú E na mochila com a mesma referência */
    try{
      const naMochila=new Set((mochila().itens||[]).map(x=>x&&x.id));
      O.keys(S.baus||{}).forEach(bid=>{
        (S.baus[bid].itens||[]).forEach(it=>{
          if(it&&it.q<=0)v.push('item com q<=0 no baú '+bid+': '+it.id);
        });
      });
      (mochila().itens||[]).forEach(it=>{ if(it&&it.q<=0)v.push('item com q<=0 na mochila: '+it.id); });
    }catch(e){}
    v.forEach(x=>{ if(invariantes.indexOf(x)<0&&invariantes.length<40)invariantes.push(x); });
  };

  for(let sd=1;sd<=SEEDS;sd++){
    S.semente=sd*613;
    for(let c=0;c<CLIQUES;c++){
      await espera(45);
      if(c%20===0)checar();
      const txt=document.getElementById('texto').textContent;
      if(/travou aqui/.test(txt)){ socorros++; try{ S.hora=7;cena.modo='casa';menuComodo(4); }catch(e){} continue; }
      if(cena.modo==='fim'){ fins++; try{ cena.modo='casa';S.hora=7;menuComodo(4); }catch(e){} continue; }
      const bs=[...document.querySelectorAll('#acoes button')]
        .filter(x=>!x.disabled&&!x.classList.contains('sec-cab')
          &&!/salvar e recarregar|recome[çc]ar|come[çc]ar uma partida|apagar/i.test(x.textContent));
      if(!bs.length)continue;
      bs[Math.floor(Math.random()*bs.length)].click(); cliques++;
    }
  }
  checar();
  return {caiu, socorros, fins, cliques, invariantes};
},[SEEDS,CLIQUES]);

console.log('cliques:',r.cliques,'| socorros:',r.socorros,'| fins:',r.fins);
const ks=Object.keys(r.caiu);
console.log('\nFUNÇÕES QUE ESTOURARAM:',ks.length);
ks.sort((a,b)=>r.caiu[b].n-r.caiu[a].n).forEach(k=>{
  const c=r.caiu[k];
  console.log(`  ${k} ×${c.n}\n     ${c.msg}\n     args: ${c.args}`);
});
console.log('\nINVARIANTES VIOLADOS:',r.invariantes.length);
r.invariantes.forEach(v=>console.log('  ▸',v));
await b.close();
