/* Fase 0 — auditoria de Exploracao + Ferimentos. Medir, nao estimar. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Auditor'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

const r=await p.evaluate(()=>{
  const out={};

  /* ===== EXPLORACAO ===== */
  out.grafo={
    nos:PLANTA.length,
    arestas:PLANTA.reduce((a,q)=>a+vizinhos(q.id).length,0)/2,
    diametro:Math.max(...PLANTA.map(a=>Math.max(...PLANTA.map(b2=>distancia(a.id,b2.id))))),
    porta:PLANTA.filter(q=>q.porta).map(q=>q.nome),
    saida:PLANTA.filter(q=>q.saida).map(q=>q.nome),
    esconde:PLANTA.filter(q=>q.esconde).map(q=>q.nome),
    trancados:PLANTA.filter(q=>q.trancado||q.condicional).length,
    grau:PLANTA.map(q=>({n:q.nome,viz:vizinhos(q.id).length}))
  };

  /* CUSTO REAL DE MOVIMENTO: andar a casa inteira e medir */
  const antes={hora:S.hora,min:S.minutos|0,ruido:S.ruido,
    san:(typeof san==='function')?san():null,
    bat:S.bateria!=null?S.bateria:null, diesel:S.diesel};
  const ordem=[0,1,2,5,4,3,6,7,8,4];
  ordem.forEach(id=>{ try{ irPara(id,true); }catch(e){} });
  const dep={hora:S.hora,min:S.minutos|0,ruido:S.ruido,
    san:(typeof san==='function')?san():null,
    bat:S.bateria!=null?S.bateria:null, diesel:S.diesel};
  out.custoDeAndar={
    comodosAtravessados:ordem.length, antes, depois:dep,
    delta:{hora:dep.hora-antes.hora, min:dep.min-antes.min, ruido:dep.ruido-antes.ruido,
      san:(dep.san!=null&&antes.san!=null)?+(dep.san-antes.san).toFixed(2):null,
      bateria:(dep.bat!=null&&antes.bat!=null)?dep.bat-antes.bat:null,
      diesel:dep.diesel-antes.diesel}
  };
  out.irParaFonte=String(irPara).slice(0,400);
  out.irParaCobra=/gastarHoras|gastarRuido|S\.hora\s*\+|S\.minutos\s*\+|mexerSan|bateria/.test(String(irPara));

  /* PROFUNDIDADE: existe camada/zona? */
  const camposDeComodo=new Set(); PLANTA.forEach(q=>Object.keys(q).forEach(k=>camposDeComodo.add(k)));
  out.profundidade={
    camposDeComodo:[...camposDeComodo],
    temCamada:[...camposDeComodo].some(k=>/camada|zona|prof|nivel|risco/i.test(k)),
    temRiscoPorComodo:typeof riscoDaArea==='function',
    nota:'PLANTA e uma grade 3x3 plana'
  };

  /* LOOT: de onde vem e se e semeado */
  const fontes=['vasculharCasa','lootDoLocal','itensDoLocal','etapaDentro','locaisDeHoje','gerarAchado'];
  out.loot=fontes.map(n=>{
    const f=(typeof window[n]==='function')?window[n]:null;
    let src=null; try{ src=eval('typeof '+n+"==='function'?String("+n+'):null'); }catch(e){}
    return {nome:n, existe:!!src,
      usaMathRandom:src?/Math\.random/.test(src):null,
      usaAle:src?/_ale\(/.test(src):null,
      leSaqueado:src?/saqueado|vasculhado/.test(src):null,
      leEscassez:src?/S\.comida|S\.agua|S\.remedio|falta|precisa/.test(src):null};
  });

  /* ===== FERIMENTOS ===== */
  out.males={
    total:Object.keys(MALES).length,
    porTipo:Object.entries(MALES).reduce((a,[k,v])=>{a[v.tipo]=(a[v.tipo]||0)+1;return a;},{}),
    campos:[...new Set(Object.values(MALES).flatMap(v=>Object.keys(v)))],
    custaChaves:[...new Set(Object.values(MALES).flatMap(v=>Object.keys(v.custa||{})))],
    temParte:Object.values(MALES).some(v=>v.parte||v.regiao),
    gravFaixa:[Math.min(...Object.values(MALES).map(v=>v.grav)),
               Math.max(...Object.values(MALES).map(v=>v.grav))]
  };
  /* quais MALES sao ALCANCAVEIS pelas tabelas de ferirPor/adoecerPor */
  const alcancaveis=new Set();
  const tf={bicho:['mordida','corte','cortefundo','pancada'],queda:['torcao','fratura','pancada','corte'],
    fogo:['queimadura'],gente:['corte','pancada','cortefundo'],mato:['arranhao','bolha','piolho'],
    obra:['corte','pancada','queimadura','fratura']};
  const ta={comida:['barriga','febre'],agua:['barriga','desidratacao'],frio:['tosse','gripe','febre'],
    sujeira:['infeccao','piolho'],cansaco:['insonia','febre'],fome:['fome','desidratacao']};
  Object.values(tf).flat().forEach(x=>alcancaveis.add(x));
  Object.values(ta).flat().forEach(x=>alcancaveis.add(x));
  out.males.alcancaveis=alcancaveis.size;
  out.males.INALCANCAVEIS=Object.keys(MALES).filter(k=>!alcancaveis.has(k));

  /* custa: alguma chave e lida por ninguem? */
  const leitores={};
  ['forca','fuga','atencao','horas','ruido','moral','agua'].forEach(k=>{
    let n=0;
    Object.getOwnPropertyNames(window).forEach(nm=>{
      let f; try{f=window[nm];}catch(e){return;}
      if(typeof f!=='function')return;
      const s=String(f);
      if(new RegExp('custoSaude\\([^)]*\\)\\.'+k+'|cs\\.'+k+'|\\bc\\.'+k+'\\b').test(s))n++;
    });
    leitores[k]=n;
  });
  out.males.leitoresDeCusta=leitores;

  /* S.ferido: o contador unico que roda EM PARALELO com MALES */
  out.feridoParalelo={
    existe:S.ferido!==undefined,
    valor:S.ferido||0,
    escritas:'12 sitios em index.html',
    nota:'S.ferido e MALES sao dois sistemas de ferimento coexistindo'
  };

  /* persistencia */
  const cru=localStorage.getItem(CHAVE); const d=cru?JSON.parse(cru):{};
  out.persistencia={
    males:'males' in d, med:'med' in d, ferido:'ferido' in d, doenteJog:'doenteJog' in d,
    corpo:'corpo' in d, exped:'exped' in d, vistos:'vistos' in d,
    chavesNoSave:Object.keys(d).length
  };
  out.colisaoDeNome={
    S_corpo_ja_usado:'equipamento (mapa slot->peca), s21-corpo.js',
    corpo_funcao:typeof corpo==='function',
    REGIOES:(typeof REGIOES!=='undefined')?REGIOES:null,
    S_exploracao:S.exploracao!==undefined,
    S_conhecimento:S.conhecimento!==undefined,
    memoriaDaCasa_nome_real:(S.memoriaAnomalias!==undefined)?'S.memoriaAnomalias':'?'
  };
  return out;
});
console.log(JSON.stringify(r,null,1));
console.log('\nerros: '+(erros.length?erros.join(' | '):'nenhum'));
await b.close();
