/* ============ §45 — CICATRIZES, E A CASA MIRA NELAS (Etapa 7 de 9) ============

   B6: ferimento grave curado vira cicatriz permanente, com efeito
   residual pequeno, entrada no caderno com causa e noite, e — a parte
   que fecha o arco — a casa passa a SABER onde voce ja quebrou.

   "Sobreviver te torna mais fragil e mais visado." E a memoria de longo
   prazo aplicada ao corpo, e e o mecanismo mais forte do conjunto.

   Aqui tambem entram as seis evolucoes da Tabela de Sinais, porque so
   agora existe de onde elas lerem: cicatrizes, S.exploracao e
   S.conhecimento nasceram nas etapas 1, 6 e nesta.
   ====================================================================== */

const CIC_CFG={
  /* gravidade minima pra deixar marca */
  gravMinima: 3,
  /* o residuo e pequeno de proposito: cicatriz orienta, nao mutila */
  residuo: .06,
  /* quanto a casa passa a preferir atacar a parte ja quebrada */
  mira: .35,
  /* teto: nem a casa mais hostil transforma isso em execucao */
  miraTeto: .55
};

const CICATRIZ_TEXTO={
  perna_esq:'A perna esquerda falha na chuva.',
  perna_dir:'A perna direita falha na chuva.',
  braco_esq:'O braço esquerdo trava no frio.',
  braco_dir:'O braço direito trava no frio.',
  mao_dominante:'A mão treme quando você está com pressa.',
  torso:'O peito dói quando você respira fundo demais.',
  cabeca:'A cabeça lateja quando o barulho é constante.'
};

function cicatrizes(){
  if(!Array.isArray(S.cicatrizes))S.cicatrizes=[];
  return S.cicatrizes;
}
function marcarCicatriz(m,porque){
  const e=MALES[m.id];
  if(!e||e.tipo!=='ferida')return null;
  if((e.grav||0)<CIC_CFG.gravMinima)return null;
  if(!m.parte)return null;
  const L=cicatrizes();
  const c={parte:m.parte,tipo:m.id,noite:S.dia|0,causa:m.porque||porque||'não anotado',
    texto:CICATRIZ_TEXTO[m.parte]||'Ficou marca.'};
  L.push(c);
  if(typeof anotar==='function')
    anotar(`Cicatriz: ${MALES[m.id].n} ${typeof naParte==='function'?naParte(m.parte):''} — noite ${c.noite}, ${c.causa}.`);
  if(typeof diz==='function')
    diz(`Fechou. Vai ficar marca. ${c.texto}`,'fraco');
  if(typeof marcarSujo==='function')marcarSujo();
  return c;
}
/* mal que sara e grave o bastante deixa marca */
if(typeof passarSaude==='function'){
  const _cicPS=passarSaude;
  passarSaude=function(){
    let antes=[];
    try{ antes=saude().map(m=>({id:m.id,dias:m.dias,parte:m.parte,porque:m.porque})); }catch(e){}
    const r=_cicPS.apply(this,arguments);
    try{
      const agora=saude().map(m=>m.id);
      antes.forEach(m=>{ if(agora.indexOf(m.id)<0)marcarCicatriz(m); });
    }catch(e){}
    return r;
  };
}

/* ---------- o residuo: pequeno, permanente, e condicional ---------- */
function residuoDeCicatriz(){
  const L=cicatrizes();
  if(!L.length)return 0;
  let r=0;
  L.forEach(c=>{
    const chuva=(S.clima==='chuva'||S.clima==='tempestade');
    const frio=(S.clima==='frio');
    if(String(c.parte).startsWith('perna')&&chuva)r+=CIC_CFG.residuo;
    else if(String(c.parte).startsWith('braco')&&frio)r+=CIC_CFG.residuo;
    else if(c.parte==='mao_dominante'&&(S.ruido||0)>50)r+=CIC_CFG.residuo;
    else if(c.parte==='cabeca'&&(S.ruido||0)>60)r+=CIC_CFG.residuo;
    else r+=CIC_CFG.residuo*.25;
  });
  return trava(r,0,.30);
}
if(typeof custoDeEntrada==='function'){
  const _cicCE=custoDeEntrada;
  custoDeEntrada=function(id,de){
    const c=_cicCE.apply(this,arguments);
    try{
      const res=residuoDeCicatriz();
      if(res>0)c.tempo=Math.round(c.tempo*(1+res));
      c.residuo=+res.toFixed(3);
    }catch(e){}
    return c;
  };
}

/* ---------- A CASA MIRA NA MARCA ----------
   `escolherParte` do §41 sorteia entre as partes plausiveis do tipo de
   ferimento. Agora a casa PESA: parte com cicatriz e mais provavel.
   Teto declarado — mesmo com o corpo todo marcado, nunca vira certeza. */
if(typeof escolherParte==='function'){
  const _cicEP=escolherParte;
  escolherParte=function(id){
    try{
      const l=PARTE_DE[id];
      if(l&&l.length){
        const marcadas=cicatrizes().map(c=>c.parte);
        const alvo=l.filter(x=>marcadas.indexOf(x)>=0);
        if(alvo.length){
          const p=trava(CIC_CFG.mira*(1+(marcadas.length-1)*.15),0,CIC_CFG.miraTeto);
          if(chance(p))return sortear(alvo);
        }
      }
    }catch(e){}
    return _cicEP.apply(this,arguments);
  };
}

/* ================= AS SEIS EVOLUÇÕES =================
   Cada criatura tem uma linha de "sinal de que ela aprendeu", e cada
   uma le um campo que agora existe de verdade. */
function evolucaoDe(criatura){
  try{
    const E=(typeof estadoExp==='function')?estadoExp():{};
    const C=(typeof conhecimento==='function')?conhecimento():{regras:{}};
    switch(criatura){
      case 'magro':
        /* jogador que sempre apaga a luz: ele passa a ler o clique */
        return (S.apagouLuzVezes|0)>=6;
      case 'rastejante':
        /* com duas cicatrizes ele para de seguir o rastro e ESPERA */
        return cicatrizes().length>=2;
      case 'coro':
        /* jogador que so usa comodo de saida unica */
        return (E.passos|0)>20 && (S.saidaUnicaVezes|0)>=5;
      case 'imitador':
        /* ignorar sussurro por 3 noites: ele para de falar */
        return (S.sussurroIgnorado|0)>=3;
      case 'inchado':
        /* ele passa a ocupar o atalho que voce mais usa */
        return Array.isArray(E.atalhosDescobertos)&&E.atalhosDescobertos.length>0;
      case 'primordial':
        /* cada regra verdadeira aprendida encurta o aviso dele */
        return Object.keys(C.regras||{}).length>=3;
    }
  }catch(e){}
  return false;
}
/* o efeito: a antecedencia dos sinais da criatura que aprendeu encurta,
   com o piso de justica do §40 mantido por cima */
if(typeof sinDegradar==='function'){
  const _cicDeg=sinDegradar;
  sinDegradar=function(sinal,s01){
    const o=_cicDeg.apply(this,arguments);
    try{
      if(sinal.criatura&&evolucaoDe(sinal.criatura)&&sinal.fase!=='contato'){
        const C=(typeof conhecimento==='function')?conhecimento():{regras:{}};
        const passos=(sinal.criatura==='primordial')
          ? Math.min(3,Object.keys(C.regras||{}).length) : 1;
        o.antecedencia=Math.max(0,+(o.antecedencia-passos).toFixed(2));
        o.evoluiu=true;
      }
      if(sinal.fase==='iminencia')
        o.antecedencia=Math.max(SIN_CFG.pisoIminencia,o.antecedencia);
    }catch(e){}
    return o;
  };
}

/* ---------- persistencia ---------- */
if(typeof salvar==='function'){
  const _cicSalvar=salvar;
  salvar=function(){
    _cicSalvar.apply(this,arguments);
    try{
      if(!S.nomeJogador)return;
      const cru=localStorage.getItem(CHAVE); if(!cru)return;
      const d=JSON.parse(cru);
      if(Array.isArray(S.cicatrizes))d.cicatrizes=S.cicatrizes;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/cicatrizes'); }
  };
}
if(typeof carregar==='function'){
  const _cicCarregar=carregar;
  carregar=function(){
    const r=_cicCarregar.apply(this,arguments);
    try{
      const cru=localStorage.getItem(CHAVE);
      const d=cru?JSON.parse(cru):null;
      S.cicatrizes=(d&&Array.isArray(d.cicatrizes))?d.cicatrizes:[];
    }catch(e){}
    return r;
  };
}
function cicatrizEstado(){
  return {marcas:cicatrizes().map(c=>({parte:c.parte,noite:c.noite,causa:c.causa})),
    residuo:+residuoDeCicatriz().toFixed(3),
    evolucoes:['magro','rastejante','coro','imitador','inchado','primordial']
      .filter(c=>evolucaoDe(c))};
}
