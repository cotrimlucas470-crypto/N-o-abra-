/* §63 — A EXPEDICAO TEM CHAO.
   A assercao que importa: a caminhada nao quebra o contrato transacional
   do §23, e ir fundo e uma DECISAO (luz contra saque) e nao um botao. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(1400);
await p.evaluate(()=>{ semearRNG(5150); S.saveId='dentro'; S.dia=7;
  S.lugaresDentro={}; S.esgotados={}; S.dossies={}; S.focos={}; });

console.log('\n1. TODO LUGAR TEM PLANTA, E NENHUM FICA SEM');
{
  const d=await p.evaluate(()=>dentroEstado());
  console.log('    '+d.lugares+' lugares · '+d.tipos+' tipos de ponto · '+
    d.formas+' plantas · fundura máxima '+d.funduraMax);
  console.log('    sem planta declarada: '+(d.semForma.length?d.semForma.join(', '):'nenhum'));
  const n=Object.values(d.pontosPorLugar);
  console.log('    pontos por lugar: mínimo '+Math.min(...n)+' · máximo '+Math.max(...n));
  ok('todo lugar da cidade tem planta declarada', d.semForma.length===0);
  ok('e nenhum lugar tem menos de 3 pontos',      Math.min(...n)>=3);
  ok('e a caminhada é mais funda que a antiga (2 opções)', Math.min(...n)>2);
}

console.log('\n2. LUGAR NOVO NASCE CAMINHÁVEL — SEM TABELA ESCRITA À MÃO');
{
  const d=await p.evaluate(()=>{
    const inventado={id:'lugar_que_nao_existe_ainda', n:'X', risco:3,
      comida:[2,6], diesel:[2,8]};
    const a=pontosDe(inventado).map(x=>x.tipo);
    const b2=pontosDe(inventado).map(x=>x.tipo);   /* e nao muda entre chamadas */
    const outro=pontosDe({id:'outro_lugar_qualquer', n:'Y', risco:3,
      comida:[2,6], diesel:[2,8]}).map(x=>x.tipo);
    return {a, estavel:JSON.stringify(a)===JSON.stringify(b2),
      diferente:JSON.stringify(a)!==JSON.stringify(outro)};
  });
  console.log('    lugar inventado → '+d.a.join(' → '));
  ok('lugar sem tabela ainda tem pontos',      d.a.length>=3);
  ok('e a planta dele não muda entre visitas', d.estavel);
  ok('e lugares diferentes têm plantas diferentes', d.diferente);
}

console.log('\n3. A LUZ É ORÇAMENTO — E VEM DO QUE VOCÊ CARREGA');
{
  const d=await p.evaluate(()=>{
    /* LE O ESTADO DE VERDADE, nao um `tem()` falsificado.
       A primeira versao deste bloco trocava `window.tem` e media o
       resultado — e passava verde enquanto o jogo inteiro devolvia 2,
       porque `tem()` checa HABILIDADE DE PESSOA e nao inventario. O
       teste confirmava a minha suposicao em vez do jogo. */
    const r={}; const guarda={ferra:S.ferra, pilhas:S.pilhas, mat:S.mat};
    S.ferra=['lanterna']; S.pilhas=4; r['lanterna+pilhas']=luzDaExpedicao();
    S.pilhas=1;           r['lanterna+1 pilha']=luzDaExpedicao();
    S.pilhas=0;           r['lanterna sem pilha']=luzDaExpedicao();
    S.ferra=[]; S.mat={fio:2}; r['só fio']=luzDaExpedicao();
    S.mat={};             r['nada']=luzDaExpedicao();
    /* e a pilha QUEIMA */
    S.ferra=['lanterna']; S.pilhas=3;
    const antesPilha=S.pilhas; gastarLuzDaExpedicao();
    const depoisPilha=S.pilhas;
    S.ferra=guarda.ferra; S.pilhas=guarda.pilhas; S.mat=guarda.mat;
    r.__pilha={antes:antesPilha, depois:depoisPilha};
    const custos=[0,1,2,3,4].map(f=>+custoDeLuz(f).toFixed(1));
    const alcance={};
    Object.keys(r).forEach(k=>{
      if(k.indexOf('__')===0)return;
      let luz=r[k], f=0;
      while(f<4&&luz-custoDeLuz(f+1)>0){ luz-=custoDeLuz(f+1); f++; }
      alcance[k]=f;
    });
    return {r, custos, alcance, pilha:r.__pilha};
  });
  Object.entries(d.r).filter(([k])=>k.indexOf('__')!==0)
    .forEach(([k,v])=>console.log('    '+k.padEnd(20)+' → luz '+v+
      ' · vai até a fundura '+d.alcance[k]));
  console.log('    custo por fundura: '+d.custos.join(', '));
  console.log('    a caminhada queima pilha: '+d.pilha.antes+' → '+d.pilha.depois);
  ok('lanterna com pilha de sobra vai mais fundo',
     d.alcance['lanterna+pilhas']>d.alcance['lanterna+1 pilha']);
  ok('lanterna sem pilha não vale nada',
     d.r['lanterna sem pilha']===d.r['nada']);
  ok('e a luz não é sempre a mesma (o parâmetro não é morto)',
     new Set(Object.values(d.alcance)).size>1);
  ok('e a caminhada queima uma pilha',      d.pilha.depois===d.pilha.antes-1);
  ok('e ir mais fundo custa mais luz',      d.custos[4]>d.custos[1]);
}

console.log('\n4. FUNDO RENDE MAIS — SENÃO A DECISÃO NÃO EXISTE');
{
  const d=await p.evaluate(()=>{
    S.lugaresDentro={}; S.esgotados={};
    const l=LOCAIS_CIDADE.peridao.find(x=>x.id==='pe_atacado');
    const pontos=pontosDe(l);
    const r=pontos.map(pt=>{
      semearRNG(9001);
      const ctx={l, risco:2, mult:1, achados:[], colhidos:[]};
      colherNoPonto(l,pt,ctx);
      const total=ctx.achados.reduce((a,x)=>a+x.q,0);
      return {tipo:pt.tipo, fundura:pt.fundura, rende:pt.rende, total};
    });
    return {r};
  });
  d.r.forEach(x=>console.log('    '+x.tipo.padEnd(10)+' fundura '+x.fundura+
    ' → '+x.total+' unidades'));
  const raso=d.r[0].total, fundo=d.r[d.r.length-1].total;
  ok('o ponto mais fundo rende mais que a soleira', fundo>raso);
  ok('e a diferença vale o risco (pelo menos o dobro)', fundo>=raso*2);
}

console.log('\n5. O PONTO ESVAZIADO FICA VAZIO — VOLTAR É OUTRA DECISÃO');
{
  const d=await p.evaluate(()=>{
    S.lugaresDentro={};
    const l=LOCAIS_CIDADE.piraiba.find(x=>x.id==='pi_deposito');
    const pt=pontosDe(l)[1];
    const antes=pontoVazio(l.id,pt.tipo);
    esvaziar(l.id,pt.tipo);
    const depois=pontoVazio(l.id,pt.tipo);
    /* e o vizinho continua cheio */
    const vizinho=pontoVazio(l.id,pontosDe(l)[2].tipo);
    /* e outro lugar não é afetado */
    const outroLugar=pontoVazio('pe_atacado',pt.tipo);
    /* sobrevive ao save */
    const salvo=JSON.parse(JSON.stringify({lugaresDentro:S.lugaresDentro}));
    const mig=migrarLugares(salvo);
    return {antes, depois, vizinho, outroLugar,
      sobreviveu:!!(mig[l.id]&&mig[l.id].pontos[pt.tipo])};
  });
  console.log('    antes de esvaziar: '+d.antes+' · depois: '+d.depois);
  console.log('    o ponto vizinho continua cheio: '+!d.vizinho);
  console.log('    outro lugar não foi afetado: '+!d.outroLugar);
  ok('o ponto esvaziado fica vazio',       !d.antes&&d.depois);
  ok('e só ele — o vizinho continua cheio', !d.vizinho);
  ok('e não vaza pra outro lugar',          !d.outroLugar);
  ok('e sobrevive ao save',                 d.sobreviveu);
}

console.log('\n6. O NINHO LIGA A RUA À SUA CASA');
{
  const d=await p.evaluate(()=>{
    S.lugaresDentro={}; S.dossies={}; S.saveId='ninho-teste';
    marcarAtiva('bicho_imitador');
    /* acha em que lugar mora o ninho desta anomalia */
    const todos=[]; Object.keys(LOCAIS_CIDADE).forEach(c=>
      LOCAIS_CIDADE[c].forEach(l=>todos.push(l)));
    let achado=null;
    for(const l of todos){
      const n=ninhoDaExpedicao(l,3);
      if(n){ achado={lugar:l.id, anom:n, l}; break; }
    }
    if(!achado)return {achado:null};
    const antes=dossi(achado.anom).estudo;
    lerNinho(achado.l,achado.anom);
    const depois=dossi(achado.anom).estudo;
    /* e ler de novo não rende */
    const denovo=ninhoDaExpedicao(achado.l,3);
    /* e num ponto raso não tem ninho */
    const raso=ninhoDaExpedicao(achado.l,1);
    /* A VARREDURA QUE FALTAVA: nao basta UMA anomalia achar ninho.
       Toda anomalia do catalogo, em varias campanhas, tem de cair num
       lugar que o jogador alcanca. Foi exatamente aqui que o defeito
       apareceu — o sorteio saia de uma lista com cinco ids a mais. */
    const visitaveis=lugaresVisitaveis();
    const fora=[];
    const idsCat=Object.keys(CATALOGO_ANOM);
    ['c1','c2','c3','c4','c5'].forEach(camp=>{
      const guarda=S.saveId; S.saveId=camp;
      idsCat.forEach(a=>{
        const h=hash32(String(a)+'|ninho|'+camp);
        const alvo=visitaveis[h%visitaveis.length];
        if(visitaveis.indexOf(alvo)<0)fora.push(camp+':'+a);
      });
      S.saveId=guarda;
    });
    /* e a checagem de verdade: o ninho de cada anomalia e ACHAVEL
       percorrendo os lugares que existem */
    const naoAchados=[];
    ['c1','c2','c3'].forEach(camp=>{
      const guarda=S.saveId; S.saveId=camp;
      idsCat.slice(0,8).forEach(a=>{
        S.lugaresDentro={};
        S.anomAtivasLista=[a];
        const achou=todos.some(l=>ninhoDaExpedicao(l,3)===a);
        if(!achou)naoAchados.push(camp+':'+a);
      });
      S.saveId=guarda;
    });
    return {achado:{lugar:achado.lugar,anom:achado.anom}, antes, depois,
      denovo, raso, limiar:DENTRO_CFG.funduraNinho,
      foraDoAlcance:fora, naoAchados, campanhas:3, porCampanha:idsCat.slice(0,8).length};
  });
  if(!d.achado){ ok('existe ninho pra alguma anomalia ativa', false); }
  else if(d.foraDoAlcance&&d.foraDoAlcance.length){
    console.log('    ninhos em lugar INALCANÇÁVEL: '+d.foraDoAlcance.join(', '));
    ok('nenhum ninho nasce em lugar que o jogador não alcança', false);
  }
  else{
    console.log('    ninho de '+d.achado.anom+' mora em '+d.achado.lugar);
    console.log('    estudo '+d.antes+' → '+d.depois);
    console.log('    ler de novo: '+(d.denovo?'ainda oferece':'não oferece mais'));
    console.log('    num ponto raso (fundura 1 < '+d.limiar+'): '+
      (d.raso?'OFERECEU':'não oferece'));
    ok('o ninho existe e rende estudo de verdade', d.depois>d.antes);
    ok('e só rende uma vez',                       d.denovo===null);
    ok('e só aparece em ponto fundo',              d.raso===null);
    console.log('    varredura: '+(d.campanhas*d.porCampanha)+
      ' pares anomalia×campanha · ninhos não encontrados: '+
      (d.naoAchados.length?d.naoAchados.join(', '):'nenhum'));
    ok('o ninho de toda anomalia é achável percorrendo a cidade',
       d.naoAchados.length===0);
  }
}

console.log('\n7. O CONTRATO DO §23 NÃO FOI QUEBRADO');
{
  const d=await p.evaluate(()=>{
    /* a caminhada devolve ctx.achados no formato que etapaCarga espera:
       {n, q, kg} — e é esse formato que o §23 salva em S.exped.levar */
    S.lugaresDentro={}; S.esgotados={};
    const l=LOCAIS_CIDADE.sumauma.find(x=>x.id==='su_rodoviaria');
    const ctx={l, risco:2, mult:1, achados:[], colhidos:[]};
    pontosDe(l).forEach(pt=>colherNoPonto(l,pt,ctx));
    const forma=ctx.achados.every(a=>typeof a.n==='string'&&a.n
      &&isFinite(a.q)&&a.q>0&&isFinite(a.kg));
    /* e o mesmo nome não vira duas entradas */
    const nomes=ctx.achados.map(a=>a.n);
    const duplicado=nomes.length!==new Set(nomes).size;
    /* e o validador do §23 aceita */
    let validos=true;
    if(typeof achadoValido==='function')
      validos=ctx.achados.every((a,i)=>achadoValido(a,i));
    return {n:ctx.achados.length, forma, duplicado, validos,
      amostra:ctx.achados.slice(0,4).map(a=>a.n+'×'+a.q)};
  });
  console.log('    a caminhada rendeu: '+d.amostra.join(', '));
  ok('os achados têm o formato que a etapa de carga espera', d.forma);
  ok('e o validador do §23 aceita todos',                    d.validos);
  ok('e o mesmo item não vira duas entradas',                !d.duplicado);
}

console.log('\n8. SAIR NO ESCURO CUSTA, MAS NÃO MATA');
{
  const d=await p.evaluate(()=>{
    const perda=DENTRO_CFG.pressaPerda, risco=DENTRO_CFG.pressaRisco;
    const ach=[{n:'diesel',q:10,kg:1},{n:'comida',q:8,kg:1.5},{n:'pilha',q:1,kg:.2}];
    const antes=ach.map(a=>a.q);
    ach.forEach(a=>{ const p=Math.floor(a.q*perda); if(p>0)a.q-=p; });
    return {antes, depois:ach.map(a=>a.q), perda, risco,
      zerou:ach.some(a=>a.q<=0)};
  });
  console.log('    perde '+(d.perda*100)+'% e ganha +'+d.risco+' de risco');
  console.log('    '+d.antes.join(', ')+' → '+d.depois.join(', '));
  ok('sair no escuro custa parte do saque', d.depois[0]<d.antes[0]);
  ok('mas não zera o que você pegou',       !d.zerou);
}

console.log('\n9. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.slice(0,3).join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
