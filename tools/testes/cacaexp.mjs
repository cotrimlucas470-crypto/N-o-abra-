/* Envolve TODA função global num try/catch que registra quem estourou,
   e depois roda muitas expedições. Não conserta nada: só denuncia.  */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const SEEDS=+(process.argv[2]||6), VOLTAS=+(process.argv[3]||14);
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
p.on('pageerror',e=>{ if(!/ERR_|file:/.test(e.message))console.log('PAGEERROR', e.message); });
await p.goto('file:///home/user/N-o-abra-/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1200);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','R'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=5;fichaJogador().pontos.percepcao=5;
    document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);

const r=await p.evaluate(async(args)=>{
  const [SEEDS,VOLTAS]=args;
  const caiu={};                 /* nome -> {n, msg} */
  const NAO=/^(diz|cap|botao|ficha|pausa|trava|chance|sortear|semente|esc|saida|src|dRect|dLinha)$/;
  /* embrulha só as funções DO JOGO. Envolver built-in quebra tudo — a
     primeira versão trocou o próprio Object por um wrapper e matou
     Object.getOwnPropertyNames no meio do laço. */
  const O=Object, nomes=O.getOwnPropertyNames(window);
  const descritores={}; nomes.forEach(k=>{ try{descritores[k]=O.getOwnPropertyDescriptor(window,k);}catch(e){} });
  nomes.forEach(k=>{
    if(/^[A-Z_$]/.test(k))return;               /* construtores e globais nativos */
    let v; try{ v=window[k]; }catch(e){ return; }
    if(typeof v!=='function'||NAO.test(k))return;
    if(v.toString().indexOf('[native code]')>=0)return;
    const d=descritores[k];
    if(!d||!d.writable)return;
    try{
      window[k]=function(){
        try{ return v.apply(this,arguments); }
        catch(e){
          const c=caiu[k]=caiu[k]||{n:0,msg:e.message,args:''};
          c.n++; if(!c.args)try{c.args=JSON.stringify([...arguments]).slice(0,140);}catch(x){c.args='(?)';}
          throw e;
        }
      };
      window[k].toString=()=>v.toString();
    }catch(e){}
  });

  /* o socorro oferece "Salvar e recarregar", que dá location.reload() e
     mata o contexto de teste. Aqui ele vira registro, não navegação. */
  let recarregou=0;
  try{ Object.defineProperty(location,'reload',{value:()=>{recarregou++;},configurable:true}); }catch(e){}
  const espera=ms=>new Promise(r=>setTimeout(r,ms));
  let expedicoes=0, socorros=0;
  const _soc=window.socorro;
  window.socorro=function(){ socorros++; return _soc.apply(this,arguments); };

  for(let sd=1;sd<=SEEDS;sd++){
   S.semente=sd*977;
   for(let v=0;v<VOLTAS;v++){
    S.hora=7; S.diesel=Math.max(S.diesel,40); S.comida=Math.max(S.comida,8);
    S.ruido=0; S.esgotados={};
    /* estados de borda que o jogador real alcança */
    if(v%3===0){ S.maos=['faca']; }
    if(v%4===0){ mochila().tipo=['nenhuma','sacola','escolar','comum'][v%4]; }
    if(v%5===0){ S.armas=['facao']; }
    try{ cena.modo='casa'; menuComodo(4); }catch(e){}
    await espera(80);
    try{
      const L=poolDeLocais();
      escolherParceiro(L[(v*7+sd)%L.length]);
    }catch(e){ continue; }
    await espera(120);
    const ir=[...document.querySelectorAll('#acoes button')].find(x=>/ir sozinho/i.test(x.textContent));
    if(!ir)continue;
    ir.click(); expedicoes++;
    for(let passo=0;passo<70;passo++){
      await espera(70);
      const bs=[...document.querySelectorAll('#acoes button')]
        .filter(x=>!x.disabled&&!x.classList.contains('sec-cab'));
      if(!bs.length)continue;
      /* a tela de socorro é reconhecível pelo texto; não se clica nela,
         porque qualquer botão dali navega e mata o contexto do teste */
      if(/travou aqui/.test(document.getElementById('texto').textContent)){
        socorros++; break;
      }
      /* tela de fim: "Recomeçar" leva a location.reload(). Sai fora. */
      if(cena.modo==='fim'){ break; }
      const uteis=bs.filter(x=>!/salvar e recarregar|passar a noite|voltar pra dentro|encerrar o dia|recome[çc]ar|come[çc]ar uma partida/i.test(x.textContent));
      if(!uteis.length)break;
      const pref=uteis.find(x=>/encher a mochila/i.test(x.textContent))
              ||uteis.find(x=>/ir embora com isso/i.test(x.textContent))
              ||uteis[Math.floor(Math.random()*uteis.length)];
      pref.click();
      if(/passar a noite|voltar pra dentro/i.test(pref.textContent))break;
    }
    await espera(150);
   }
  }
  return {caiu, expedicoes, socorros, recarregou};
},[SEEDS,VOLTAS]);

console.log('expedições:',r.expedicoes,'| socorros disparados:',r.socorros,'| reloads pedidos:',r.recarregou);
const ks=Object.keys(r.caiu);
console.log('\nFUNÇÕES QUE ESTOURARAM:',ks.length);
ks.sort((a,b)=>r.caiu[b].n-r.caiu[a].n).forEach(k=>{
  const c=r.caiu[k];
  console.log(`  ${k} ×${c.n}\n     ${c.msg}\n     args: ${c.args}`);
});
await b.close();
