/* FASE 2 — simulador headless.
   Carrega o jogo uma vez no Chromium e roda N runs de D dias chamando a
   camada de decisão real (tabelas, filtros e pesos do próprio jogo), sem
   UI e sem pausa. Semente fixa: o mesmo comando dá o mesmo relatório. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';

const RUNS = Number(process.argv[2]||500);
const DIAS = Number(process.argv[3]||30);
const SEED = Number(process.argv[4]||20260815);
const SAIDA = process.argv[5]||'tools/frequencia.json';

const b = await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p = await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('file:///home/user/N-o-abra-/index.html');
await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1200);
{ const x=await p.$('#cine-pular'); if(x){ await x.click(); await p.waitForTimeout(1500); } }
await p.fill('#nm','Sim'); await p.click('#go'); await p.waitForTimeout(22000);

const rel = await p.evaluate(({RUNS,DIAS,SEED})=>{
  // --- RNG determinístico substituindo Math.random durante a simulação ---
  let _x=SEED>>>0;
  const rnd=()=>{ _x=(_x*1664525+1013904223)>>>0; return _x/4294967296; };
  const real=Math.random; Math.random=rnd;

  const C={};                       // contadores
  const inc=(cat,k,n)=>{ (C[cat]=C[cat]||{}); C[cat][k]=(C[cat][k]||0)+(n==null?1:n); };
  const rotulo=(t)=>String(typeof t==='function'?'(fn)':t).replace(/\s+/g,' ').slice(0,58);

  const estadoBase=JSON.parse(JSON.stringify({
    dia:1,hora:7,ruido:0,diesel:100,comida:11,agua:2,remedio:1,sanidade:100,realDebt:0
  }));

  for(let run=0; run<RUNS; run++){
    // reinicia o mínimo que as tabelas leem
    Object.assign(S, estadoBase);
    S.usados=[]; S.pistasDadas=[]; S.mortos=[]; S.v9=null;
    /* o abrigo e o cachorro existem porque duas entradas de NOTURNOS são
       condicionadas a eles. Simular a casa vazia media conteúdo que o jogo
       nunca teria oferecido, e reportaria como morto o que só estava
       fora do alcance do simulador. */
    S.abrigo=[]; const quantos=1+Math.floor(rnd()*3);
    for(let i=0;i<quantos;i++) S.abrigo.push({n:'P'+i,hab:'—',moral:70,local:4,id:i});
    S.cachorro = rnd()<0.30 ? {n:'Pipoca',vivo:true,fome:1} : null;
    S.saq=S.saq||{fase:0,dentro:false,tregua:0};
    let vivo=true, causa=null;

    for(let d=1; d<=DIAS && vivo; d++){
      S.dia=d; S.hora=7;
      // desgaste plausível de uma run média
      S.ruido=Math.max(0,Math.min(100, 10+rnd()*45));
      S.sanidade=Math.max(0,Math.min(100, 100-d*2.1-rnd()*18));
      S.realDebt=Math.min(100, d*0.9);

      // ---- estágio de sanidade: tempo em cada um ----
      try{ inc('estagio_sanidade', estagio().n); }catch(e){}

      // ---- evento do dia: gate .62 + sorteio ponderado ----
      if(rnd()<0.62){
        try{ const e=sortearEvento();
             if(e){ inc('evento_dia', rotulo(e.t)); inc('evento_raridade', e.r||'?');
                    if(e.id)S.usados.push(e.id); }
             else inc('evento_dia','(pool vazio)');
        }catch(err){ inc('erros','sortearEvento: '+err.message); }
      }

      // ---- ilusão do dia ----
      try{
        const e=estagio();
        const pool=ILUSOES.filter(i=>e.ilusao>=i.min);
        if(pool.length&&rnd()<e.ilusao){ inc('ilusao_texto', rotulo(sortear(pool).t||sortear(pool).id)); }
        const ps=ILUSOES_SOM.filter(i=>e.ilusao>=i.min);
        if(ps.length&&rnd()<e.ilusao){ inc('ilusao_som', rotulo(sortear(ps).id||sortear(ps).t)); }
      }catch(err){ inc('erros','ilusao: '+err.message); }

      // ---- noite ----
      try{
        const pAtiva=Math.max(.08,Math.min(.34,.10+memAnom().nivel*.05+(d>=6?.06:0)));
        if(rnd()<pAtiva){ inc('noite','anomaliaAtiva'); }
        else if(rnd()<0.55){
          const validos=NOTURNOS.filter(e=>{try{return !e.cond||e.cond()}catch(x){return false}});
          inc('noite','eventoNoturno');
          if(validos.length) inc('noturno_texto', rotulo(sortear(validos).t));
          else inc('noturno_texto','(nenhum válido)');
        } else inc('noite','(noite calma)');
      }catch(err){ inc('erros','noite: '+err.message); }

      // ---- quem bate na porta ----
      try{
        const nivel=memAnom().nivel;
        let pool=ANOM.filter(a=>a.forca<=1+Math.floor(d/3.5)+(nivel>2?1:0));
        if(!pool.length)pool=ANOM.filter(a=>a.forca===1);
        inc('anomalia_na_porta', rotulo(sortear(pool).id||sortear(pool).n));
      }catch(err){ inc('erros','anomalia: '+err.message); }

      // ---- risco de invasão acumulado ----
      try{ inc('risco_invasao_x100', String(Math.round(riscoInvasao()*100))); }catch(e){}

      /* MODELO, não medição: o simulador não roda as cenas de morte do
         jogo (elas são assíncronas e cheias de UI). Só o risco vem do
         jogo — a conversão em morte é hipótese minha, e por isso
         `fim_de_run` está marcado como modelo no relatório. */
      const risco=(()=>{try{return riscoInvasao()}catch(e){return .1}})();
      if(rnd()<risco*0.28){ vivo=false; causa='invasao (modelo)'; }
    }
    inc('fim_de_run', vivo?'sobreviveu 30 dias':('morte: '+causa));
  }

  Math.random=real;
  return {C, tamanhos:{
    EVT:EVT.length, NOTURNOS:NOTURNOS.length, ILUSOES:ILUSOES.length,
    ILUSOES_SOM:ILUSOES_SOM.length, ANOM:ANOM.length, VIRADAS:VIRADAS.length,
    SONHOS:SONHOS.length, TROCAS:TROCAS.length, MEMORIAS:MEMORIAS.length,
    BOLETIM:BOLETIM.length, PISTAS:PISTAS.length, CRIATURAS:Object.keys(CRIATURAS).length,
    MOCHILAS:Object.keys(MOCHILAS).length, RECEITAS:RECEITAS.length, TATICAS:TATICAS.length
  }};
}, {RUNS,DIAS,SEED});

writeFileSync(SAIDA, JSON.stringify(rel,null,1));
const total=RUNS*DIAS;
console.log(`# ${RUNS} runs x ${DIAS} dias = ${total} dias-jogo | semente ${SEED}\n`);
console.log('## tamanho das tabelas');
console.log(Object.entries(rel.tamanhos).map(([k,v])=>`  ${k}: ${v}`).join('\n'));
for(const [cat,vals] of Object.entries(rel.C)){
  const ord=Object.entries(vals).sort((a,b)=>a[1]-b[1]);
  const soma=ord.reduce((s,x)=>s+x[1],0);
  console.log(`\n## ${cat}  (${ord.length} distintos, ${soma} ocorrências)`);
  for(const [k,v] of ord){
    const porRun=(v/RUNS);
    const marca = porRun<0.02 ? '  << ABAIXO DE 2% POR RUN' : (v/soma>0.85 ? '  << DOMINA (>85%)' : '');
    console.log(`  ${String(v).padStart(6)}  ${(porRun.toFixed(3)+'/run').padStart(11)}  ${k}${marca}`);
  }
}
if(erros.length)console.log('\nERROS DE PÁGINA:', [...new Set(erros)].join('\n  '));
await b.close();
