/* ============ §30 — NÚCLEO DE GOVERNANÇA ============

   O que faltava não era conteúdo: era CONTRATO. Este bloco é o
   vocabulário canônico — schema, máquina de estados, RNG determinístico
   e as âncoras de percepção. Nada de conteúdo novo aqui.

   AS QUATRO DECISÕES QUE EU TOMEI, e por quê
   ------------------------------------------
   1 · O CONJUNTO GOVERNADO são as 15 AVARIAS + as 6 criaturas = 21
       eventos. As 12 de `ANOMALIAS` (index.html:3647) NÃO entram: elas
       já SÃO os tells da porta — pescoço comprido demais, sombra que
       não bate. Enquadrá-las como eventos com `tell` próprio exigiria
       um tell do tell. (12+15+6 = 33 é de onde veio o número.)

   2 · RNG SEMEADO no que decide jogo; cosmético fica com Math.random.
       São 266 chamadas no projeto, e ~33 são jitter de áudio, grão de
       tela e oscilação de sombra. Semear ruído visual engessaria o
       replay a reproduzir chiado que ninguém consegue contestar, ao
       custo de passar o RNG por dentro do laço de desenho. A trava de
       build (montar.js) lista quais arquivos podem usar Math.random.

   3 · As 12 não entram no schema — ver (1).

   4 · A INVASÃO VIRA ESTADO SERIALIZÁVEL. O objeto `I` era variável
       local de `invasao()`: fechar o app no meio da noite perdia a
       noite inteira. Agora ele espelha em `S.inv`, como DADO PURO —
       sem função, sem timer, sem nó de DOM.
   ====================================================================== */

/* ================= 1.3 · RNG DETERMINÍSTICO ================= */
/* mulberry32: 32 bits de estado, distribuição boa o bastante pra jogo,
   e — o que importa aqui — o estado é UM NÚMERO. Cabe no save, e
   reproduzir uma sessão é só repor esse número. */
function criarRNG(seed){
  let a=(seed>>>0)||1;
  const r={
    semente:seed>>>0,
    estado:a,
    next(){
      r.estado=(r.estado+0x6D2B79F5)>>>0;
      let t=r.estado;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    },
    /* inteiro em [0,n) */
    inteiro(n){ return Math.floor(r.next()*Math.max(1,n|0)); },
    /* um item da lista */
    escolher(lista){
      if(!lista||!lista.length)return null;
      return lista[r.inteiro(lista.length)];
    },
    /* {chave: peso} -> chave. Peso zero nunca sai. */
    pesado(mapa){
      const ks=Object.keys(mapa||{}).filter(k=>(+mapa[k])>0);
      if(!ks.length)return null;
      const tot=ks.reduce((s,k)=>s+(+mapa[k]),0);
      let x=r.next()*tot;
      for(const k of ks){ x-=(+mapa[k]); if(x<=0)return k; }
      return ks[ks.length-1];
    },
    /* true com probabilidade p */
    chance(p){ return r.next()<p; }
  };
  return r;
}
function hash32(txt){
  let h=2166136261>>>0;
  const s=String(txt);
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  return h>>>0;
}
/* A semente vem de saveId + noite, como pedido. `saveId` nasce uma vez
   por partida e vive no save; a noite entra pra cada noite ter a sua
   sequência sem precisar guardar o estado do gerador entre elas. */
function semearRNG(){
  if(!S.saveId)S.saveId=String(Date.now())+'-'+hash32(String(S.nomeJogador||'')+Math.random());
  const seed=hash32(S.saveId+'#'+(S.dia|0));
  S.rngSemente=seed;
  S.rng=criarRNG(seed);
  if(typeof S.rngEstado==='number')S.rng.estado=S.rngEstado>>>0;
  return S.rng;
}
function rng(){
  if(!S.rng||typeof S.rng.next!=='function')semearRNG();
  return S.rng;
}
/* o estado do gerador é UM número, e é ele que vai pro save.
   `S.rng` em si é objeto com funções: NUNCA é serializado. */
function rngEstadoPuro(){ return rng().estado>>>0; }

/* ================= 1.4 · PERCEPÇÃO INVIOLÁVEL ================= */
/* Com sanidade baixa a casa mente. Estes três NUNCA são falsificados —
   e a razão é de design, não de gentileza: sem âncora, o jogador conclui
   que nada é confiável e PARA DE INVESTIGAR. Um jogo de dúvida precisa
   de chão. */
const PERCEPCAO_INVIOLAVEL=Object.freeze({
  relogio:'a hora mostrada é a hora real de S.hora — nunca deslocada, nunca embaralhada',
  inventario:'o que a mochila lista é o que a mochila tem — nunca item fantasma, nunca item escondido',
  portaFrente:'a ENTRADA (cômodo 7) é sempre a ENTRADA — a planta nunca é reescrita'
});
/* quem for mentir pra o jogador chama isto antes e recebe não */
function podeFalsificar(oQue){
  return !Object.prototype.hasOwnProperty.call(PERCEPCAO_INVIOLAVEL,oQue);
}

/* ================= 1.2 · MÁQUINA DE ESTADOS ================= */
const EST={
  DORMENTE:'dormente', ARMADA:'armada', MANIFESTANDO:'manifestando',
  ATIVA:'ativa', PERCEBIDA:'percebida', RESOLVIDA:'resolvida',
  IGNORADA:'ignorada', FALHADA:'falhada', CONSEQUENCIA:'consequencia',
  CICATRIZ:'cicatriz'
};
const TRANSICOES={
  dormente:['armada'],
  armada:['manifestando','dormente'],
  manifestando:['ativa','falhada'],
  ativa:['percebida','ignorada','falhada'],
  percebida:['resolvida','ignorada','falhada'],
  resolvida:['cicatriz','dormente'],
  ignorada:['consequencia'],
  falhada:['consequencia'],
  consequencia:['cicatriz','dormente'],
  cicatriz:[]
};
/* teto de turnos por estado: estourou, vira `falhada`. Softlock deixa de
   ser questão de sorte e passa a ser impossível por construção. */
const TETO_ESTADO={
  dormente:Infinity, armada:8, manifestando:3, ativa:14,
  percebida:12, resolvida:2, ignorada:2, falhada:2,
  consequencia:3, cicatriz:Infinity
};
let MODO_DEV=false;
function transicionar(a,novo){
  if(!a||typeof a!=='object')return false;
  const atual=a.estado||EST.DORMENTE;
  const ok=(TRANSICOES[atual]||[]).includes(novo);
  if(!ok){
    const msg='transição inválida: '+atual+' -> '+novo+' em '+(a.id||'?');
    if(MODO_DEV)throw new Error(msg);
    if(typeof registrarErro==='function')registrarErro(new Error(msg),'transicionar');
    else console.warn('[não abra] '+msg);
    return false;
  }
  a.estado=novo;
  a.desdeTurno=(S.turnoGlobal|0);
  (a.historico=a.historico||[]).push(novo);
  if(a.historico.length>12)a.historico.shift();
  return true;
}
/* o vigia: nada fica parado além do teto */
function vigiarEstados(lista){
  const forcadas=[];
  (lista||[]).forEach(a=>{
    const teto=TETO_ESTADO[a.estado];
    if(!isFinite(teto))return;
    const parado=(S.turnoGlobal|0)-(a.desdeTurno|0);
    if(parado<=teto)return;
    /* o caminho para `falhada` nem sempre é direto: leva pelo caminho
       válido mais curto, pra não violar a própria máquina */
    /* `cicatriz` é terminal de verdade e fica. `resolvida` NÃO: ela é
       estado de descanso e tem de voltar pra `dormente`, senão a
       anomalia nunca mais dispara. A primeira versão isentava as duas
       do vigia e deixava `resolvida` com teto finito — contradição que
       o teste pegou como "preso". */
    if(a.estado===EST.CICATRIZ)return;
    if(a.estado===EST.RESOLVIDA){ transicionar(a,EST.DORMENTE); forcadas.push(a.id); return; }
    if((TRANSICOES[a.estado]||[]).includes(EST.FALHADA)){
      transicionar(a,EST.FALHADA);
    }else if((TRANSICOES[a.estado]||[]).includes(EST.MANIFESTANDO)){
      transicionar(a,EST.MANIFESTANDO); transicionar(a,EST.FALHADA);
    }else if((TRANSICOES[a.estado]||[]).includes(EST.CONSEQUENCIA)){
      transicionar(a,EST.CONSEQUENCIA);
    }else if((TRANSICOES[a.estado]||[]).includes(EST.DORMENTE)){
      transicionar(a,EST.DORMENTE);
    }
    if(a.estado===EST.FALHADA)transicionar(a,EST.CONSEQUENCIA);
    forcadas.push(a.id);
  });
  return forcadas;
}

/* ================= 1.1 · O SCHEMA ================= */
const CATEGORIAS=['sonora','visual','fisica','espacial','cognitiva'];
/* Valida um registro. Devolve [] se está de pé, ou a lista de defeitos.
   `tell` é obrigatório e não pode ser nulo: anomalia sem aviso é bug,
   não é design — punição sem aviso é a coisa que a regra de ouro proíbe. */
function validarAnomalia(a){
  const e=[];
  if(!a||typeof a!=='object')return ['não é objeto'];
  if(!a.id||typeof a.id!=='string')e.push('id ausente');
  if(!a.nome)e.push('nome ausente');
  if(CATEGORIAS.indexOf(a.categoria)<0)e.push('categoria inválida: '+a.categoria);
  if(!(a.raridade>=1&&a.raridade<=5))e.push('raridade fora de 1..5');
  if(!(a.peso>0))e.push('peso precisa ser > 0');
  if(!Array.isArray(a.precondicoes))e.push('precondicoes precisa ser lista');
  if(!Array.isArray(a.incompativelCom))e.push('incompativelCom precisa ser lista');
  if(!Array.isArray(a.duracaoTurnos)||a.duracaoTurnos.length!==2
     ||!(a.duracaoTurnos[0]<=a.duracaoTurnos[1]))e.push('duracaoTurnos inválida');
  if(!a.tell||typeof a.tell!=='object')e.push('SEM TELL — anomalia sem aviso é bug');
  else{
    if(!a.tell.tipo)e.push('tell sem tipo');
    if(!(a.tell.intensidade>=0&&a.tell.intensidade<=1))e.push('tell.intensidade fora de 0..1');
    if(!(a.tell.turnosAntes>=1))e.push('tell.turnosAntes precisa ser >= 1');
  }
  if(!Array.isArray(a.resolucoes)||!a.resolucoes.length)e.push('sem resolução possível');
  if(!(a.custoErro>=0&&a.custoErro<=1))e.push('custoErro fora de 0..1');
  if(typeof a.consequencia!=='function')e.push('consequencia precisa ser função');
  if(typeof a.cicatriz!=='boolean')e.push('cicatriz precisa ser booleano');
  if(!(a.pesoMemoria>=0&&a.pesoMemoria<=1))e.push('pesoMemoria fora de 0..1');
  if(!(a.versao>=1))e.push('versao ausente');
  return e;
}
/* o catálogo governado vive aqui; os adaptadores das AVARIAS e das
   criaturas o preenchem (§30.2 e §30.3), sem tocar no conteúdo. */
const CATALOGO_ANOM={};
function registrarAnomalia(a){
  const e=validarAnomalia(a);
  if(e.length){
    const msg='anomalia "'+(a&&a.id)+'" rejeitada: '+e.join('; ');
    if(MODO_DEV)throw new Error(msg);
    if(typeof registrarErro==='function')registrarErro(new Error(msg),'registrarAnomalia');
    else console.warn('[não abra] '+msg);
    return false;
  }
  CATALOGO_ANOM[a.id]=a;
  return true;
}

/* ================= 30.2 · ADAPTADOR DAS 15 AVARIAS =================
   As AVARIAS não são reescritas. Elas continuam sendo o que são; o que
   nasce aqui é um REGISTRO que fala a língua do schema e aponta pra
   elas. Categoria e tell vêm do que a avaria já é. */
const CAT_AVARIA={
  calha:'fisica', infiltra:'fisica', rachadura:'espacial', cano:'fisica',
  alagado:'fisica', telhado:'fisica', goteira:'sonora', fiacao:'visual',
  curto:'visual', janela:'espacial', aberta:'espacial', cerca:'espacial',
  torneira:'sonora', porta_emperra:'fisica', bomba:'fisica'
};
const TELL_AVARIA={
  calha:{tipo:'som_agua',intensidade:.4,turnosAntes:1},
  infiltra:{tipo:'mancha',intensidade:.3,turnosAntes:2},
  rachadura:{tipo:'estalo',intensidade:.5,turnosAntes:1},
  cano:{tipo:'batida_cano',intensidade:.5,turnosAntes:1},
  alagado:{tipo:'cheiro',intensidade:.6,turnosAntes:1},
  telhado:{tipo:'vento',intensidade:.5,turnosAntes:2},
  goteira:{tipo:'pingo',intensidade:.3,turnosAntes:1},
  fiacao:{tipo:'piscar',intensidade:.6,turnosAntes:1},
  curto:{tipo:'cheiro_queimado',intensidade:.7,turnosAntes:1},
  janela:{tipo:'corrente_ar',intensidade:.4,turnosAntes:1},
  aberta:{tipo:'corrente_ar',intensidade:.5,turnosAntes:1},
  cerca:{tipo:'metal',intensidade:.4,turnosAntes:2},
  torneira:{tipo:'pingo',intensidade:.3,turnosAntes:1},
  porta_emperra:{tipo:'range',intensidade:.5,turnosAntes:1},
  bomba:{tipo:'motor',intensidade:.6,turnosAntes:1}
};
function adaptarAvarias(){
  if(typeof AVARIAS==='undefined')return 0;
  let n=0;
  Object.keys(AVARIAS).forEach(id=>{
    const A=AVARIAS[id];
    const ok=registrarAnomalia({
      id:'avaria_'+id,
      nome:(A&&A.n)||id,
      categoria:CAT_AVARIA[id]||'fisica',
      raridade:2,
      peso:8,
      precondicoes:[()=>typeof avariaEm==='function'&&!avariaEm(id)],
      incompativelCom:['avaria_'+id],
      requerCriatura:null,
      duracaoTurnos:[6,40],
      tell:TELL_AVARIA[id]||{tipo:'ruido',intensidade:.4,turnosAntes:1},
      resolucoes:['reparar'],
      custoErro:.25,
      consequencia(){ /* a avaria já É a consequência: ela fica na casa */ },
      cicatriz:false,
      pesoMemoria:.15,
      versao:1,
      /* ponte pro conteúdo original, sem copiar nada dele */
      fonte:{tabela:'AVARIAS',chave:id}
    });
    if(ok)n++;
  });
  return n;
}

/* ================= 30.3 · ADAPTADOR DAS 6 CRIATURAS ================= */
const CAT_BICHO={
  magro:'visual', rastejante:'fisica', coro:'sonora',
  imitador:'cognitiva', inchado:'fisica', primordial:'cognitiva'
};
function adaptarBichos(){
  if(typeof BICHOS==='undefined')return 0;
  let n=0;
  BICHOS.forEach(b=>{
    const R=(typeof REGRA!=='undefined'&&REGRA[b.id])||null;
    const ok=registrarAnomalia({
      id:'bicho_'+b.id,
      nome:b.n||b.id,
      categoria:CAT_BICHO[b.id]||'fisica',
      raridade:b.raro?5:(b.peso>=25?1:b.peso>=15?2:3),
      peso:34,
      precondicoes:[
        ()=>S.dia>1,
        ()=>!b.raro||S.dia>=7,
        ()=>!b.estreia||S.dia>=b.estreia
      ],
      incompativelCom:BICHOS.filter(x=>x.id!==b.id).map(x=>'bicho_'+x.id),
      requerCriatura:b.id,
      duracaoTurnos:[4,14],
      /* o tell existe desde a v53 e é obrigatório: um turno antes do
         contato, texto próprio por criatura */
      tell:{tipo:'aviso_'+b.id,intensidade:.8,
        turnosAntes:(typeof ANOM_CFG!=='undefined'?ANOM_CFG.distanciaAviso:1)},
      resolucoes:R?['esconder','fugir',R.sentido]:['esconder','fugir'],
      custoErro:.7,
      consequencia(){ /* a invasão já resolve o próprio desfecho */ },
      cicatriz:true,
      pesoMemoria:.6,
      versao:1,
      fonte:{tabela:'BICHOS',chave:b.id}
    });
    if(ok)n++;
  });
  return n;
}

/* ================= 30.4 · A INVASÃO VIRA DADO PURO =================
   `I` era variável local de `invasao()`. Fechar o app no meio da noite
   perdia a noite. Aqui ele passa a ter espelho em `S.inv`, e o espelho
   é DADO PURO: nada de função, timer ou nó de DOM. */
const CAMPOS_INV=['fase','faseTurnos','ruidoEm','memoria','folego','bloqueio',
  'bloqTurnos','escondido','avisou','recuo','respondeu','olhou','divididas',
  'atraso','cooldown','turno','lento','chamouEm','chamouTurno','trilha'];
function espelharInvasao(I){
  if(!I)return null;
  const d={};
  CAMPOS_INV.forEach(k=>{
    const v=I[k];
    if(v===undefined)return;
    if(typeof v==='function')return;                 /* nunca */
    d[k]=Array.isArray(v)?v.slice():v;
  });
  d.bicho=I.bicho?I.bicho.id:null;                   /* id, não o objeto */
  d.acompanha=(I.acompanha||[]).map(p=>p&&p.n).filter(Boolean);
  d.escondidos=(I.escondidos||[]).map(p=>p&&p.n).filter(Boolean);
  d.casa=cena&&cena.casa?{voce:cena.casa.voce,monstro:cena.casa.monstro,
    monstro2:cena.casa.monstro2==null?null:cena.casa.monstro2}:null;
  d.rngEstado=rngEstadoPuro();
  S.inv=d;
  if(typeof marcarSujo==='function')marcarSujo();
  return d;
}
/* devolve um `I` jogável a partir do espelho, ou null */
function reidratarInvasao(){
  const d=S.inv;
  if(!d||!d.fase)return null;
  const I={};
  CAMPOS_INV.forEach(k=>{ if(d[k]!==undefined)I[k]=Array.isArray(d[k])?d[k].slice():d[k]; });
  I.bicho=(typeof BICHOS!=='undefined'&&BICHOS.find(b=>b.id===d.bicho))||null;
  if(I.bicho)I.bicho={...I.bicho,_copia:1};
  const acha=n=>(S.abrigo||[]).find(p=>p.n===n);
  I.acompanha=(d.acompanha||[]).map(acha).filter(Boolean);
  I.escondidos=(d.escondidos||[]).map(acha).filter(Boolean);
  if(d.casa){
    cena.casa=cena.casa||{};
    cena.casa.voce=d.casa.voce; cena.casa.monstro=d.casa.monstro;
    cena.casa.monstro2=d.casa.monstro2;
  }
  if(typeof d.rngEstado==='number'){ rng().estado=d.rngEstado>>>0; S.rngEstado=d.rngEstado>>>0; }
  return I;
}
function limparInvasao(){ S.inv=null; if(typeof marcarSujo==='function')marcarSujo(); }
/* o espelho é atualizado a cada turno do monstro, que é onde o turno conta */
if(typeof turnoMonstro==='function'){
  const _tm=turnoMonstro;
  turnoMonstro=async function(I){
    S.turnoGlobal=(S.turnoGlobal|0)+1;
    const r=await _tm.apply(this,arguments);
    try{ espelharInvasao(I); }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'espelharInvasao'); }
    return r;
  };
}
if(typeof invasao==='function'){
  const _inv=invasao;
  invasao=async function(qtd){
    semearRNG();
    const r=await _inv.apply(this,arguments);
    return r;
  };
}
/* a noite acabou de um jeito ou de outro: o espelho some */
['escapou','fimOpala'].forEach(nome=>{
  if(typeof window[nome]==='function'){
    const _f=window[nome];
    window[nome]=async function(){ try{limparInvasao();}catch(e){} return _f.apply(this,arguments); };
  }
});

/* ================= REPLAY ================= */
/* Reproduz uma sessão: repõe a semente e roda as ações na ordem.
   Cada ação é {fn:'nome', args:[...]} — dado puro, nada de closure. */
function replay(seed,acoes){
  S.rng=criarRNG(seed>>>0);
  const saida=[];
  (acoes||[]).forEach((a,i)=>{
    try{
      const f=(typeof window[a.fn]==='function')?window[a.fn]:null;
      saida.push({i,fn:a.fn,ok:!!f,valor:f?f.apply(null,a.args||[]):null});
    }catch(e){ saida.push({i,fn:a.fn,ok:false,erro:e.message}); }
  });
  return {seed:seed>>>0, estadoFinal:rngEstadoPuro(), saida};
}
S.debug=S.debug||{};
S.debug.replay=replay;

/* ================= PERSISTÊNCIA ================= */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      S.rngEstado=rngEstadoPuro();
      const d=JSON.parse(localStorage.getItem(CHAVE)||'{}');
      d.saveId=S.saveId;
      d.rngSemente=S.rngSemente;
      d.rngEstado=S.rngEstado;
      d.inv=S.inv||null;
      d.turnoGlobal=S.turnoGlobal|0;
      d.vistosMonstro=S.vistosMonstro||[];   /* a auditoria pegou: não era salvo */
      d.nucleoVersao=1;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/nucleo'); }
  };
}
/* Save antigo não tem nada disto. Os valores neutros: saveId novo,
   semente derivada dele, invasão nenhuma em curso. Nada se perde e nada
   se ganha — quem estava no dia 9 continua no dia 9. */
if(!S.saveId||typeof S.saveId!=='string')S.saveId=null;
if(!Array.isArray(S.vistosMonstro))S.vistosMonstro=[];
if(typeof S.turnoGlobal!=='number')S.turnoGlobal=0;
if(S.inv===undefined)S.inv=null;
semearRNG();

/* ================= REGISTRO ================= */
const _nAvarias=adaptarAvarias();
const _nBichos=adaptarBichos();

function nucleoEstado(){
  return {
    rng:{semente:S.rngSemente,estado:rngEstadoPuro(),saveId:S.saveId},
    catalogo:Object.keys(CATALOGO_ANOM).length,
    avarias:_nAvarias, bichos:_nBichos,
    invasaoEspelhada:!!S.inv,
    turnoGlobal:S.turnoGlobal|0,
    ancoras:Object.keys(PERCEPCAO_INVIOLAVEL)
  };
}
function nucleoDev(liga){ MODO_DEV=!!liga; return MODO_DEV; }
