/* ============ §50 — O DIRETOR GANHA OUVIDO ============

   O QUE ESTE BLOCO NAO FAZ
   ------------------------
   Ele NAO cria um diretor. O jogo ja tem um, desde a v58: o
   `s31-orquestrador.js` faz orcamento de intensidade, cooldown por
   categoria e global, tags de incompatibilidade (`podeCoexistir`),
   preempcao por prioridade, anti-repeticao com janela deslizante, fila
   de adiados que devolve o negado mais forte, vales de silencio
   reservados ANTES de qualquer permissao, e ate simulacao de
   distribuicao (`orqSimular`, `orqHistograma`, `densidadeAlvo`).

   Escrever um segundo diretor por cima disso seria a proibicao do §2 do
   documento — "nao duplique sistemas existentes" — e seria o erro que
   eu ja cometi com o passo nesta mesma sessao.

   O QUE FALTAVA, MEDIDO
   ---------------------
   O jogo tem DUAS METADES de diretor, e elas nao se falam:

     s31-orquestrador.js   decide O QUE ACONTECE   (so olha eventos)
     pressaoAgora()  §42   mede COMO O JOGADOR ESTA (tempo fora do
                           nucleo, ruido, luz, exposicao, 4 degraus)

   E `pressaoAgora()` era consultada por UMA linha em todo o projeto —
   as costuras do §49, escritas ontem:

     grep 'pressaoAgora()' *.js        → s49-costuras.js:185
     grep 'pressaoAgora' s31-*.js      → 0

   O diretor de eventos nunca soube que o jogador estava com medo.
   Este bloco e o fio entre os dois, mais a nocao que faltava nos dois:
   POS-CLIMAX. Depois de uma noite pesada, o orquestrador nao recuava de
   proposito — ele so ficava sem orcamento, que e outra coisa.

   AS QUATRO MEDIDAS, PORQUE UMA BARRA SO NAO SERVE
   ------------------------------------------------
   O §3 e explicito: "Nao use apenas uma barra. Combine tensao curta,
   tensao acumulada, fadiga e memoria de eventos."

     curta       `pressaoAgora()` — o agora, ja existia
     acumulada   media que atravessa noites, no save
     fadiga      sobe com climax concedido, cai por turno
     memoria     `O.ultimosEventos` do orquestrador, ja existia

   O QUE O DIRETOR PODE E O QUE ELE NAO PODE
   -----------------------------------------
   O §3 proibe: spawn injusto sobre o jogador, morte inevitavel,
   teleporte pra punir, e empilhar climax.

   Este diretor NAO CRIA EVENTO NENHUM. Ele so faz duas coisas, e as
   duas sao limitadas por numero declarado:

     1. NEGA — e negar aqui nao perde nada, porque `orqNega` devolve o
        evento a fila com peso maior. E o unico jeito de "recuar" sem
        inventar mecanismo novo.
     2. REPESA — multiplica o peso de escolha dentro de [0.75, 1.25].

   E o orcamento da noite ele so ajusta dentro de [0.70, 1.15], NUNCA
   acima do `ORQ_CFG.orcamentoTeto` que ja existia. Um diretor que pode
   subir o teto e um diretor que pode trapacear.
   ====================================================================== */

const DIR_CFG={
  /* quanto a tensao acumulada anda por noite, na direcao da curta.
     Baixo de proposito: acumulada e humor de campanha, nao de turno. */
  inerciaAcumulada: 0.22,
  /* fadiga: quanto um climax concedido acrescenta, e quanto cai por turno */
  fadigaPorClimax: 1.0,
  fadigaQuedaPorTurno: 0.085,
  /* acima disto o diretor entra em POS-CLIMAX e recua */
  fadigaPosClimax: 0.75,
  /* e abaixo disto ele volta ao normal */
  fadigaRecuperada: 0.22,
  /* quais classes o pos-climax segura. Prioridade alta NUNCA e segurada:
     se a casa precisa avisar de uma criatura, o aviso passa. */
  seguraClasses:['comum','ambiental'],
  /* teto de turnos que um pos-climax pode segurar, pra ele nunca virar
     uma noite morta por acidente */
  posClimaxMaxTurnos: 7,
  /* fatores, todos com piso e teto declarados */
  orcamentoFator:{ CALMO:1.15, SUSPEITO:1.05, TENSO:1.00,
                   PERIGO:0.95, POS_CLIMAX:0.70, RECUPERACAO:0.85 },

  /* O ORCAMENTO NAO E O QUE LIMITA A NOITE — medido.
     Simulando 150 noites e mexendo numa alavanca por vez:

       normal                        5,82 eventos/noite
       orcamento DOBRADO (100→200)   5,90   (+1,4%)
       orcamento pela metade         5,21
       cooldown global zerado        7,18   (+23%)
       cooldown de categoria /2      6,18
       sem vales de silencio         7,84   (+35%)

     Ou seja: eu tinha dado ao diretor a alavanca mais fraca que existe.
     O que prende a noite sao os vales e o cooldown global.

     Os VALES ficam intocados de proposito: o proprio orquestrador diz
     por escrito que "silencio e conteudo: ele e reservado antes de
     qualquer permissao". Um diretor que furasse o silencio reservado
     seria um diretor trapaceando.

     Entao a alavanca honesta e o cooldown global.

     E ELE SO APERTA, NUNCA AFROUXA. A primeira versao deste bloco dava
     CALMO:-1, e a medicao a 2000 noites mostrou o preco:

                        media   p90   noites acima de 8
       sem diretor       5,76    7        0,05%
       diretor CALMO     5,96    9       11,85%
       diretor TENSO     5,18    7        0%

     A media continuava na faixa [4,8] — e por isso o teste passava —
     mas 12% das noites estouravam o teto de design, contra 0,05% antes.
     O proprio orquestrador escreve que acima do teto "vira feira de
     sustos e o jogador para de conseguir ligar um evento ao anterior".

     Um diretor que so pode acalmar nao consegue criar essa feira, e e
     isso que faz a proibicao do §3 ("empilhar climax") ser estrutural
     em vez de uma promessa. Preso em [1,4]: nunca zero, porque zero e o
     que faz dois sustos colarem.

     O "mundo fica mais ocupado quando o jogador esta confortavel" que o
     §3 pede continua existindo — mas pelo PESO, que muda QUAIS eventos
     saem, e nao pela quantidade. */
  cooldownDelta:{ CALMO:0, SUSPEITO:0, TENSO:0,
                  PERIGO:+1, POS_CLIMAX:+2, RECUPERACAO:+1 },
  cooldownPiso: 1,
  cooldownTeto: 4,
  pesoFator:{      CALMO:1.25, SUSPEITO:1.10, TENSO:1.00,
                   PERIGO:0.90, POS_CLIMAX:0.75, RECUPERACAO:0.85 },
  /* os degraus da tensao curta que separam os estados */
  degrauSuspeito: 0.28,
  degrauTenso:    0.55,
  /* e a acumulada que sozinha ja levanta suspeita */
  acumuladaSuspeita: 0.45
};

const DIR_ESTADOS=['CALMO','SUSPEITO','TENSO','PERIGO','POS_CLIMAX','RECUPERACAO'];

/* ---------- estado ---------- */
function dirEstadoBruto(){
  if(!S.diretor||typeof S.diretor!=='object')S.diretor={};
  const D=S.diretor;
  if(typeof D.acum!=='number')D.acum=0;
  if(typeof D.fadiga!=='number')D.fadiga=0;
  if(typeof D.climaxes!=='number')D.climaxes=0;
  if(typeof D.posDesde!=='number')D.posDesde=-1;
  if(!D.estado)D.estado='CALMO';
  if(!Array.isArray(D.historico))D.historico=[];
  return D;
}

/* a tensao curta: o §42, se existir. Sem ele o diretor fica neutro em
   vez de inventar um numero — parametro morto e proibicao nº 6. */
function dirCurta(){
  try{
    if(typeof pressaoAgora!=='function')return 0;
    const v=+pressaoAgora();
    return (isFinite(v)&&v>=0)?Math.min(1,v):0;
  }catch(e){ return 0; }
}

/* ha ameaca no ar agora? */
function dirAmeaca(){
  try{
    if(S.inv)return true;
    if(typeof ativas==='function')
      return ativas().some(id=>String(id).indexOf('bicho_')===0);
  }catch(e){}
  return false;
}

function dirCalcular(){
  const D=dirEstadoBruto();
  const curta=dirCurta();
  /* acumulada persegue a curta devagar: e o humor da campanha */
  D.acum=D.acum+(curta-D.acum)*DIR_CFG.inerciaAcumulada;

  let estado;
  if(D.fadiga>=DIR_CFG.fadigaPosClimax)                 estado='POS_CLIMAX';
  else if(D.fadiga>DIR_CFG.fadigaRecuperada)            estado='RECUPERACAO';
  else if(curta>=DIR_CFG.degrauTenso&&dirAmeaca())      estado='PERIGO';
  else if(curta>=DIR_CFG.degrauTenso)                   estado='TENSO';
  else if(curta>=DIR_CFG.degrauSuspeito
          ||D.acum>=DIR_CFG.acumuladaSuspeita)          estado='SUSPEITO';
  else                                                  estado='CALMO';

  if(estado!==D.estado){
    D.historico.push({de:D.estado,para:estado,dia:S.dia|0,
      turno:(typeof orq==='function'&&orq())?orq().turno|0:0});
    while(D.historico.length>24)D.historico.shift();
    D.estado=estado;
    if(estado==='POS_CLIMAX')
      D.posDesde=(typeof orq==='function'&&orq())?orq().turno|0:0;
  }
  return D;
}

/* ---------- o climax registra fadiga ----------
   "Climax" aqui e evento de classe alta concedido, ou invasao comecando.
   Nada disso e inventado: as duas coisas ja existem e ja tem nome. */
function dirClimax(porque){
  const D=dirEstadoBruto();
  D.fadiga=Math.min(3,D.fadiga+DIR_CFG.fadigaPorClimax);
  D.climaxes++;
  D.ultimoClimax=porque||null;
  dirCalcular();
  if(typeof marcarSujo==='function')marcarSujo();
  return D.fadiga;
}

/* ---------- ganchos no orquestrador ---------- */

/* 1 · o turno faz a fadiga cair e recalcula o estado */
if(typeof orqTurno==='function'){
  const _ot=orqTurno;
  orqTurno=function(){
    const r=_ot.apply(this,arguments);
    try{
      const D=dirEstadoBruto();
      D.fadiga=Math.max(0,D.fadiga-DIR_CFG.fadigaQuedaPorTurno);
      dirCalcular();
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'diretor/turno'); }
    return r;
  };
}

/* 2 · a noite nasce com o orcamento que o estado do jogador pede.
   NUNCA acima do teto que o orquestrador ja declarava. */
if(typeof orqNovaNoite==='function'){
  const _onn=orqNovaNoite;
  orqNovaNoite=function(silencioso){
    const O=_onn.apply(this,arguments);
    try{
      const D=dirCalcular();
      const f=DIR_CFG.orcamentoFator[D.estado];
      if(O&&typeof O.orcamentoNoite==='number'&&f){
        const teto=(typeof ORQ_CFG!=='undefined')?ORQ_CFG.orcamentoTeto:O.orcamentoNoite;
        O.orcamentoNoite=Math.max(1,Math.min(teto,Math.round(O.orcamentoNoite*f)));
      }
      /* e a alavanca que de fato prende a noite */
      const dc=DIR_CFG.cooldownDelta[D.estado];
      if(O&&typeof dc==='number'){
        const basec=(typeof ORQ_CFG!=='undefined')?ORQ_CFG.cooldownGlobal:2;
        O.cooldownGlobalNoite=Math.max(DIR_CFG.cooldownPiso,
          Math.min(DIR_CFG.cooldownTeto, basec+dc));
      }
      /* a noite nova alivia a fadiga: dormir e o unico descanso real */
      D.fadiga=Math.max(0,D.fadiga*0.5);
      dirCalcular();
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'diretor/noite'); }
    return O;
  };
}

/* 3 · o recuo: em POS-CLIMAX o diretor segura o que e dispensavel.
   Negar aqui NAO PERDE NADA: `orqNega` devolve o evento a fila com peso
   maior, e isso ja e como o orquestrador funciona. */
if(typeof pedirPermissao==='function'){
  const _pp=pedirPermissao;
  pedirPermissao=function(id,opcoes){
    try{
      const D=dirCalcular();
      if(D.estado==='POS_CLIMAX'&&!(opcoes&&opcoes.ignorarVale)){
        const O=(typeof orq==='function')?orq():null;
        const desde=(O?O.turno|0:0)-(D.posDesde|0);
        if(desde<=DIR_CFG.posClimaxMaxTurnos){
          const a=(typeof registroDe==='function')?registroDe(id):null;
          const cls=(a&&typeof classeDe==='function')?classeDe(a):null;
          if(cls&&DIR_CFG.seguraClasses.indexOf(cls)>=0)
            return orqNega(id,'pós-clímax: o diretor está recuando');
        }
      }
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'diretor/permissao'); }
    const r=_pp.apply(this,arguments);
    /* o cooldown da noite, decidido pelo estado, substitui o fixo */
    try{
      const O=(typeof orq==='function')?orq():null;
      if(r&&r.ok&&O&&typeof O.cooldownGlobalNoite==='number')
        O.cooldownGlobal=O.cooldownGlobalNoite;
    }catch(e){}
    /* concedido e de classe alta? isso conta como clímax */
    try{
      if(r&&r.ok&&typeof registroDe==='function'){
        const a=registroDe(id);
        const cls=(a&&typeof classeDe==='function')?classeDe(a):null;
        if(cls==='criatura'||cls==='primordial')dirClimax('evento:'+id);
      }
    }catch(e){}
    return r;
  };
}

/* 4 · o peso de escolha ouve o estado — no mesmo lugar em que o §32
   (memória) ja pendura o dele, em vez de um caminho paralelo */
if(typeof pesoDeEscolha==='function'){
  const _pe=pesoDeEscolha;
  pesoDeEscolha=function(id){
    let w=_pe.apply(this,arguments);
    try{
      const D=dirCalcular();
      const f=DIR_CFG.pesoFator[D.estado];
      if(f)w=w*f;
    }catch(e){}
    return Math.max(0,w);
  };
}

/* 5 · uma invasao comecando e climax por definicao */
if(typeof invasao==='function'){
  const _inv=invasao;
  invasao=async function(qtd){
    try{ dirClimax('invasao'); }catch(e){}
    return await _inv.apply(this,arguments);
  };
}

/* ---------- persistência ----------
   O bloco ANEXA a um save; nunca CRIA um, e repete a guarda da base. */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      if(!S.nomeJogador)return;
      const cru=localStorage.getItem(CHAVE);
      if(!cru)return;
      const d=JSON.parse(cru);
      d.diretor=S.diretor||null;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/diretor'); }
  };
}
/* save antigo não tem diretor nenhum, e não ter é o estado certo */
if(!S.diretor)S.diretor=null;

/* ---------- conferência e depuração (o §16 pede) ---------- */
function dirEstado(){
  const D=dirCalcular();
  return {
    estado:D.estado,
    curta:+dirCurta().toFixed(3),
    acumulada:+D.acum.toFixed(3),
    fadiga:+D.fadiga.toFixed(3),
    climaxes:D.climaxes,
    ameaca:dirAmeaca(),
    orcamentoFator:DIR_CFG.orcamentoFator[D.estado],
    pesoFator:DIR_CFG.pesoFator[D.estado],
    cooldownDelta:DIR_CFG.cooldownDelta[D.estado],
    cooldownDaNoite:(typeof orq==='function'&&orq())?(orq().cooldownGlobalNoite??null):null,
    estados:DIR_ESTADOS,
    transicoes:D.historico.length
  };
}
/* forcar um estado, pra depurar e pra testar (o §16 pede "forçar eventos") */
function dirForcar(estado){
  const D=dirEstadoBruto();
  if(DIR_ESTADOS.indexOf(estado)<0)return null;
  if(estado==='POS_CLIMAX'){ D.fadiga=DIR_CFG.fadigaPosClimax+0.1;
    D.posDesde=(typeof orq==='function'&&orq())?orq().turno|0:0; }
  else if(estado==='RECUPERACAO')D.fadiga=(DIR_CFG.fadigaRecuperada+DIR_CFG.fadigaPosClimax)/2;
  else D.fadiga=0;
  D.estado=estado;
  return dirEstado();
}
