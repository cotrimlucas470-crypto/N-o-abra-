/* §50 — O DIRETOR GANHA OUVIDO.

   O que precisa ser provado aqui não é que o diretor existe. É que ele
   NÃO TRAPACEIA — o §3 do documento proíbe spawn injusto, morte
   inevitável, teleporte pra punir e empilhar clímax. Um diretor que
   pode subir o teto de intensidade é um diretor que pode trapacear. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Diretor'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. O FIO QUE FALTAVA: A PRESSÃO CHEGA NO DIRETOR');
{
  const d=await p.evaluate(()=>{
    const antes=dirEstado();
    /* espiona: o diretor consulta mesmo a pressão do §42, ou inventa? */
    let usos=0; const base=pressaoAgora;
    window.pressaoAgora=function(){ usos++; return base.apply(this,arguments); };
    dirEstado();
    window.pressaoAgora=base;
    return {usos, curta:antes.curta, estados:antes.estados.length,
      temPressao:typeof pressaoAgora==='function'};
  });
  console.log('    consultas a pressaoAgora() numa leitura do diretor: '+d.usos);
  ok('a pressão do §42 existe',                    d.temPressao);
  ok('e o diretor a consulta de verdade',          d.usos>=1);
  ok('os seis estados do documento estão lá',      d.estados===6);
}
{
  /* a outra ponta: o orquestrador passou a sentir o diretor */
  const d=await p.evaluate(()=>{
    const O=orqNovaNoite(true);
    const semDir=Math.min(ORQ_CFG.orcamentoTeto,
      Math.round(ORQ_CFG.orcamentoBase+ORQ_CFG.orcamentoPorDia*Math.max(0,(S.dia|0)-1)));
    dirForcar('CALMO');   const calmo=orqNovaNoite(true).orcamentoNoite;
    dirForcar('POS_CLIMAX'); const pos=orqNovaNoite(true).orcamentoNoite;
    return {semDir, calmo, pos};
  });
  console.log('    orçamento base '+d.semDir+' · em CALMO '+d.calmo+' · em PÓS-CLÍMAX '+d.pos);
  ok('em calma a noite pode ser mais densa',  d.calmo>=d.semDir);
  ok('e depois de um clímax ela recua',       d.pos<d.semDir);
}

console.log('\n2. ELE NÃO PODE TRAPACEAR');
{
  const d=await p.evaluate(()=>{
    const teto=ORQ_CFG.orcamentoTeto;
    let maior=0, menor=1e9;
    for(const e of DIR_ESTADOS){
      for(let dia=1;dia<=40;dia++){
        S.dia=dia; dirForcar(e);
        const o=orqNovaNoite(true).orcamentoNoite;
        maior=Math.max(maior,o); menor=Math.min(menor,o);
      }
    }
    S.dia=1;
    const fo=Object.values(DIR_CFG.orcamentoFator), fp=Object.values(DIR_CFG.pesoFator);
    return {teto, maior, menor,
      fatorOrcMin:Math.min(...fo), fatorOrcMax:Math.max(...fo),
      fatorPesoMin:Math.min(...fp), fatorPesoMax:Math.max(...fp)};
  });
  console.log('    orçamento em 6 estados × 40 dias: de '+d.menor+' a '+d.maior+' (teto declarado '+d.teto+')');
  console.log('    fatores: orçamento ['+d.fatorOrcMin+', '+d.fatorOrcMax+'] · peso ['+d.fatorPesoMin+', '+d.fatorPesoMax+']');
  ok('NUNCA passa do teto que o orquestrador já tinha', d.maior<=d.teto);
  ok('o fator de orçamento fica dentro de [0.70, 1.15]', d.fatorOrcMin>=0.70&&d.fatorOrcMax<=1.15);
  ok('o de peso, dentro de [0.75, 1.25]',                d.fatorPesoMin>=0.75&&d.fatorPesoMax<=1.25);
}
{
  /* o diretor não cria evento nenhum: ele só nega e repesa */
  const d=await p.evaluate(()=>{
    const fonte=[dirEstado,dirForcar,dirClimax,dirCalcular].map(f=>f.toString()).join('\n');
    const proibidas=['anomInvocar','invasao(','marcarAtiva','spawn','teleport'];
    return {cria:proibidas.filter(x=>fonte.indexOf(x)>=0)};
  });
  console.log('    chamadas de criação de evento no diretor: '+(d.cria.length?d.cria.join(', '):'nenhuma'));
  ok('o diretor não invoca nada por conta própria', d.cria.length===0);
}

console.log('\n3. OS SEIS ESTADOS, E QUANDO CADA UM ACONTECE');
{
  const d=await p.evaluate(()=>{
    const base=pressaoAgora;
    const comCurta=(v,ameaca)=>{
      window.pressaoAgora=()=>v;
      const D=S.diretor; D.fadiga=0; D.acum=0;
      if(ameaca)S.inv={fase:'CACA'}; else S.inv=null;
      const e=dirEstado().estado;
      window.pressaoAgora=base; S.inv=null;
      return e;
    };
    const r={
      calmo:      comCurta(0.05,false),
      suspeito:   comCurta(0.35,false),
      tenso:      comCurta(0.70,false),
      perigo:     comCurta(0.70,true)
    };
    dirForcar('POS_CLIMAX');   r.posClimax=dirEstado().estado;
    dirForcar('RECUPERACAO');  r.recuperacao=dirEstado().estado;
    return r;
  });
  console.log('    '+JSON.stringify(d));
  ok('pressão baixa → CALMO',                 d.calmo==='CALMO');
  ok('pressão média → SUSPEITO',              d.suspeito==='SUSPEITO');
  ok('pressão alta sem ameaça → TENSO',       d.tenso==='TENSO');
  ok('pressão alta COM ameaça → PERIGO',      d.perigo==='PERIGO');
  ok('e os dois estados que faltavam existem', d.posClimax==='POS_CLIMAX'&&d.recuperacao==='RECUPERACAO');
}

console.log('\n4. A FADIGA: CLÍMAX SOBE, TURNO DESCE, NOITE ALIVIA');
{
  const d=await p.evaluate(()=>{
    S.diretor.fadiga=0; dirCalcular();
    const zero=dirEstado().fadiga;
    dirClimax('teste'); const um=dirEstado().fadiga;
    dirClimax('teste'); const dois=dirEstado().fadiga;
    const estadoDepois=dirEstado().estado;
    for(let i=0;i<5;i++)orqTurno();
    const depoisTurnos=dirEstado().fadiga;
    orqNovaNoite(true);
    const depoisNoite=dirEstado().fadiga;
    return {zero,um,dois,estadoDepois,depoisTurnos,depoisNoite};
  });
  console.log('    fadiga 0 → '+d.um+' → '+d.dois+' · após 5 turnos '+d.depoisTurnos+' · após dormir '+d.depoisNoite);
  ok('clímax sobe a fadiga',            d.um>d.zero&&d.dois>d.um);
  ok('e leva a PÓS-CLÍMAX',             d.estadoDepois==='POS_CLIMAX');
  ok('os turnos derrubam',              d.depoisTurnos<d.dois);
  ok('e dormir alivia de verdade',      d.depoisNoite<d.depoisTurnos);
}

console.log('\n5. O RECUO SEGURA O DISPENSÁVEL — E SÓ ELE');
{
  const d=await p.evaluate(()=>{
    orqNovaNoite(true);
    dirForcar('POS_CLIMAX');
    const ids=Object.keys(CATALOGO_ANOM);
    const porClasse={};
    ids.forEach(id=>{ const a=registroDe(id); if(!a)return;
      const c=classeDe(a); (porClasse[c]=porClasse[c]||[]).push(id); });
    const testa=(cls)=>{
      const lista=porClasse[cls]||[]; if(!lista.length)return null;
      let negadosPeloDiretor=0;
      lista.forEach(id=>{
        const O=orq(); O.gasto=0; O.cooldownGlobal=0;
        CATEGORIAS.forEach(c=>O.cooldownCategoria[c]=0);
        O.vales=[]; S.anomAtivasLista=[];
        const r=pedirPermissao(id,{});
        if(r&&!r.ok&&/pós-clímax/.test(r.porque||''))negadosPeloDiretor++;
      });
      return {n:lista.length, negadosPeloDiretor};
    };
    const r={};
    Object.keys(porClasse).forEach(c=>{ r[c]=testa(c); });
    return {classes:r, segura:DIR_CFG.seguraClasses};
  });
  Object.keys(d.classes).forEach(c=>{
    const x=d.classes[c];
    if(x)console.log('    '+c.padEnd(12)+' '+x.negadosPeloDiretor+' de '+x.n+' segurados');
  });
  const seguradas=d.segura;
  const altaSegurada=Object.keys(d.classes).filter(c=>
    seguradas.indexOf(c)<0 && d.classes[c] && d.classes[c].negadosPeloDiretor>0);
  ok('classes dispensáveis são seguradas',
     seguradas.some(c=>d.classes[c]&&d.classes[c].negadosPeloDiretor>0));
  ok('e NENHUMA classe de prioridade alta é segurada', altaSegurada.length===0);
}
{
  /* negar não perde: o orquestrador devolve com peso maior */
  const d=await p.evaluate(()=>{
    orqNovaNoite(true); dirForcar('POS_CLIMAX');
    const cand=Object.keys(CATALOGO_ANOM)
      .find(id=>{const a=registroDe(id);return a&&DIR_CFG.seguraClasses.indexOf(classeDe(a))>=0;});
    if(!cand)return {sem:true};
    const antes=pesoDeEscolha(cand);
    pedirPermissao(cand,{});
    const fila=orq().filaAdiada.find(x=>x.id===cand);
    const depois=pesoDeEscolha(cand);
    return {cand, antes:+antes.toFixed(3), depois:+depois.toFixed(3), naFila:!!fila,
      bonus:fila?+fila.bonus.toFixed(3):0};
  });
  if(d.sem){ ok('havia candidato pra medir', false); }
  else{
    console.log('    '+d.cand+': peso '+d.antes+' → '+d.depois+' · na fila de adiados: '+d.naFila+' (bônus '+d.bonus+')');
    ok('o que o diretor segura volta pra fila', d.naFila===true);
    ok('e volta com peso maior — nada se perde', d.depois>d.antes);
  }
}

console.log('\n6. O QUE O DIRETOR MUDA, MEDIDO SEPARANDO AS ALAVANCAS');
{
  /* DUAS VERSÕES ANTERIORES DESTA SEÇÃO ESTAVAM ERRADAS.
     A 1ª chamava `dirForcar(estado)` e simulava: deu 5,78 idêntico nos
     três estados. O estado do diretor é DERIVADO, e o primeiro
     `orqNovaNoite()` de dentro da simulação recalculava tudo — a
     asserção passava porque o diretor não tinha efeito ali.
     A 2ª forçava a pressão e comparava médias: 5,23 contra 5,18. Perto
     demais pra ser sinal, e eu ia declarar vitória em cima de ruído.

     Aqui as alavancas são separadas e cada uma responde por si. */
  const d=await p.evaluate(()=>{
    const base=pressaoAgora;
    const sim=(pressao,mut)=>{
      window.pressaoAgora=()=>pressao;
      const g={fad:DIR_CFG.fadigaPorClimax, cd:{...DIR_CFG.cooldownDelta},
        orc:{...DIR_CFG.orcamentoFator}};
      if(mut)mut();
      dirEstadoBruto(); S.diretor.fadiga=0; S.diretor.acum=pressao; dirCalcular();
      const r=orqSimular(600,777);
      DIR_CFG.fadigaPorClimax=g.fad; DIR_CFG.cooldownDelta=g.cd;
      DIR_CFG.orcamentoFator=g.orc; window.pressaoAgora=base;
      const acima=Object.keys(r.hist).filter(k=>+k>8).reduce((a,k)=>a+r.hist[k],0);
      return {media:r.media, max:r.max, dentro:r.dentroDaFaixa,
        pctAcima8:+(acima/r.noites*100).toFixed(2)};
    };
    const desliga=()=>{ DIR_CFG.fadigaPorClimax=0;
      DIR_CFG.cooldownDelta={}; DIR_CFG.orcamentoFator={}; };
    return {
      semBaixa: sim(0.02,desliga), semAlta: sim(0.85,desliga),
      comBaixa: sim(0.02,null),    comAlta: sim(0.85,null),
      alvo:ORQ_CFG.densidadeAlvo
    };
  });
  const f=x=>x.media+' (máx '+x.max+', '+x.pctAcima8+'% acima de 8)';
  console.log('    faixa alvo '+JSON.stringify(d.alvo));
  console.log('    diretor DESLIGADO · pressão baixa: '+f(d.semBaixa));
  console.log('    diretor DESLIGADO · pressão alta : '+f(d.semAlta));
  console.log('    diretor LIGADO    · pressão baixa: '+f(d.comBaixa));
  console.log('    diretor LIGADO    · pressão alta : '+f(d.comAlta));

  /* 1 · o buraco que a auditoria achou era real: sem o fio, a pressão
         do jogador não mexia em nada no que a noite faz. */
  ok('sem o diretor, a pressão do jogador não muda nada',
     d.semBaixa.media===d.semAlta.media);
  /* 2 · e com ele muda — pouco, e na direção certa. */
  ok('com o diretor, ela passa a mudar',
     d.comBaixa.media!==d.comAlta.media);
  ok('e a noite tensa é a mais contida das duas',
     d.comAlta.media<d.comBaixa.media);
  /* 3 · o efeito grande não é a pressão: é o recuo depois do clímax. */
  ok('o recuo pós-clímax é o efeito grande, não a pressão',
     (d.semBaixa.media-d.comBaixa.media) > Math.abs(d.comBaixa.media-d.comAlta.media)*3);
  /* 4 · e ele APERTA a cauda em vez de soltar — que é a garantia
         estrutural contra a "feira de sustos" que o §3 proíbe. */
  ok('o diretor derruba as noites acima do teto de design',
     d.comBaixa.pctAcima8<=d.semBaixa.pctAcima8 && d.comAlta.pctAcima8<=d.semAlta.pctAcima8);
  ok('e o pico por noite nunca sobe',
     d.comBaixa.max<=d.semBaixa.max && d.comAlta.max<=d.semAlta.max);
  ok('as duas continuam dentro da faixa alvo', d.comBaixa.dentro&&d.comAlta.dentro);
}

console.log('\n7. ATRAVESSA UMA RECARGA DE VERDADE');
{
  await p.evaluate(()=>{ dirForcar('RECUPERACAO'); S.diretor.acum=0.66; S.diretor.climaxes=7; salvar(); });
  const antes=await p.evaluate(()=>({estado:S.diretor.estado, acum:+S.diretor.acum.toFixed(3),
    climaxes:S.diretor.climaxes}));
  await p.reload(); await p.waitForTimeout(1200);
  await p.click('#btn-boot'); await p.waitForTimeout(1300);
  {const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1200);}}
  await p.waitForTimeout(9000);
  const d=await p.evaluate(()=>{
    const cru=JSON.parse(localStorage.getItem(CHAVE)||'{}');
    return cru.diretor?{estado:cru.diretor.estado, acum:+(cru.diretor.acum||0).toFixed(3),
      climaxes:cru.diretor.climaxes}:null;
  });
  console.log('    antes: '+JSON.stringify(antes)+' · no save: '+JSON.stringify(d));
  ok('o diretor está no save',         !!d);
  ok('a tensão acumulada atravessa',   d&&d.acum===antes.acum);
  ok('e a conta de clímaxes também',   d&&d.climaxes===antes.climaxes);
}

console.log('\n8. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
