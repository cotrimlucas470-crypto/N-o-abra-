/* ============ §26 — AS ANOMALIAS VIRAM A AMEAÇA ============

   O QUE EXISTIA
   -------------
   Seis criaturas com nome, aparência e uma frase de fraqueza. E UMA
   perseguição só para todas: `moverMonstro` andava pro vizinho mais
   perto de `I.ruidoEm` enquanto `I.memoria > 0`, senão sorteava. `vel`
   e `mem` só mudavam números dentro dessa mesma regra, e o campo
   `fraco` era texto exibido — nunca chegava a valer no jogo.

   O QUE MUDA
   ----------
   1. CICLO DE ESTADO EXPLÍCITO, igual para todas:

        RONDA → SUSPEITA → CACA → PERDEU → (volta a RONDA)

      `PERDEU` é uma fase de verdade, com duração: ela vasculha em volta
      do último lugar conhecido antes de desistir. E o ciclo SEMPRE
      volta a RONDA — há teto de turnos em CACA justamente pra não
      existir perseguição eterna nem estado travado.

   2. REGRA ÚNICA POR CRIATURA. Cada uma reage a UMA coisa diferente, e
      cada uma tem um contra-jogo que dá pra descobrir jogando, porque
      o jogo dá o retorno na hora:

        magro       LUZ       — não entra em cômodo aceso
        rastejante  RASTRO    — segue por onde você passou, não o som
        coro        SOM       — as duas metades vão pro mesmo ruído
        imitador    RESPOSTA  — só te acha se você andar depois do chamado
        inchado     PASSAGEM  — não cabe em cômodo apertado
        primordial  OLHAR     — olhar pra ele o aproxima

   3. AVISO ANTES DO DANO, garantido. Um turno antes de encostar em
      você, ela é obrigada a emitir sinal. Nenhuma pode aparecer do nada.

   4. PRESENÇA FORA DO COMBATE. Ela deixa marca na casa, e a marca ainda
      está lá no dia seguinte.

   A dificuldade vem do §25 — `dif()`. Este bloco NÃO cria multiplicador
   próprio, como foi pedido.
   ======================================================================= */

const ANOM_CFG={
  /* --- percepção --- */
  /* a que distância (em cômodos) ela nota um ruído. Aumentar deixa
     qualquer barulho perigoso na casa inteira. */
  raioDeteccao: 2,
  /* quantos turnos ela fica em SUSPEITA antes de decidir caçar.
     Aumentar dá mais tempo pro jogador sair de perto. */
  turnosSuspeita: 1,
  /* teto de turnos em CACA. Existe pra não haver perseguição eterna:
     estourou, ela cai em PERDEU. */
  turnosCacaMax: 6,
  /* quantos turnos ela vasculha em volta do último lugar conhecido
     antes de voltar a rondar. */
  turnosPerdeu: 2,
  /* turnos de descanso depois de desistir, em que ela não reage a nada.
     É a janela de respiro do jogador. */
  cooldown: 1,

  /* --- aviso --- */
  /* a que distância o aviso é obrigatório. 1 = ela sempre avisa do
     cômodo vizinho antes de encostar. Nunca ponha 0. */
  distanciaAviso: 1,

  /* --- regras por criatura --- */
  magroRecuaTurnos: 3,      /* quantos turnos a lanterna/luz o afasta   */
  rastejanteTrilha: 4,      /* quantos cômodos da sua trilha ele lembra */
  coroDivideTurnos: 2,      /* turnos que as metades ficam separadas    */
  imitadorJanela: 1,        /* turnos após o chamado em que andar entrega */
  inchadoAtraso: 2,         /* turnos que um cômodo apertado o atrasa   */
  primordialCustoOlhar: 4,  /* sanidade por olhar direto pra ele        */

  /* --- marcas que ficam na casa --- */
  chanceMarca: .45,         /* por invasão, de deixar marca em um cômodo */
  marcasMax: 6              /* quantas marcas a casa guarda ao mesmo tempo */
};

/* ================= AS REGRAS ================= */
/* Cada criatura declara: a que reage, o que a segura, e como o jogo
   conta isso pro jogador. `alvo(I,c)` devolve o cômodo pra onde ela
   quer ir — devolver null significa "não sei, ronda". */
const REGRA={
  magro:{
    sentido:'luz',
    dica:'Ele para na porta de cômodo aceso e não entra.',
    /* não entra em cômodo com a luminária acesa e energia */
    evita(id){ return luzLigadaEm(id); },
    alvo(I,c){ return I.ruidoEm; }
  },
  rastejante:{
    sentido:'rastro',
    dica:'Ele não segue o barulho. Segue por onde você pisou.',
    /* ignora ruído: vai atrás do cômodo mais antigo da sua trilha que
       ainda não visitou. Por isso "ficar quieto" não funciona com ele —
       e voltar por onde veio, sim: a trilha se dobra sobre si mesma. */
    alvo(I,c){
      const t=(I.trilha||[]).slice(-ANOM_CFG.rastejanteTrilha);
      return t.length?t[0]:I.ruidoEm;
    }
  },
  coro:{
    sentido:'som',
    dica:'As duas metades vão pro mesmo barulho. Dois barulhos separam elas.',
    alvo(I,c){ return I.ruidoEm; }
  },
  imitador:{
    sentido:'resposta',
    dica:'Ele chama com voz conhecida. Quem anda depois de ouvir se entrega.',
    /* só sabe onde você está se você se moveu na janela depois do chamado */
    alvo(I,c){ return I.respondeu?c.voce:I.ruidoEm; }
  },
  inchado:{
    sentido:'passagem',
    dica:'Ele não passa em vão apertado sem perder tempo.',
    /* cômodo com `esconde` é apertado: ele atrasa ao entrar */
    atrasaEm(id){ return !!(PLANTA[id]&&PLANTA[id].esconde); },
    alvo(I,c){ return I.ruidoEm; }
  },
  primordial:{
    sentido:'olhar',
    dica:'Olhar pra ele encurta a distância. A saída dos fundos continua aberta.',
    alvo(I,c){ return I.olhou?c.voce:I.ruidoEm; }
  }
};
function regraDe(I){
  return (I&&I.bicho&&REGRA[I.bicho.id])||REGRA.magro;
}

/* a luminária daquele cômodo está de fato acesa? */
function luzLigadaEm(id){
  try{
    if(typeof interruptor!=='function'||typeof temEnergia!=='function')return false;
    return !!interruptor(id)&&!!temEnergia();
  }catch(e){ return false; }
}

/* ================= O CICLO DE ESTADO ================= */
const FASES_ANOM=['RONDA','SUSPEITA','CACA','PERDEU'];

function anomIniciar(I){
  /* cópia do bicho: a partir daqui dá pra mexer em campo dele sem
     escrever na tabela BICHOS, que é compartilhada por toda a partida */
  if(I.bicho&&!I.bicho._copia)I.bicho={...I.bicho,_copia:1};
  I.fase='RONDA';
  I.faseTurnos=0;
  I.trilha=[cena.casa?cena.casa.voce:4];
  I.avisou=false;
  I.recuo=0;
  I.respondeu=false;
  I.olhou=false;
  I.divididas=0;
  I.atraso=0;
  I.pagouLuz=0;
  I.cooldown=0;
  return I;
}

/* um ruído aconteceu no cômodo `onde`, com força `forca` (0..1) */
function anomOuviu(I,onde,forca){
  if(!I||I.cooldown>0)return;
  const R=regraDe(I);
  /* o rastejante não liga pra som: ele lê o chão */
  if(R.sentido==='rastro')return;
  /* O imitador OUVE como as outras — o que a resposta muda é a
     PRECISÃO, não o interesse.

     A primeira versão fazia ele ignorar ruído enquanto `respondeu`
     fosse falso, e nada no jogo jamais setava esse campo: ele ficava
     preso em RONDA pra sempre, inofensivo. O teste pegou isso em 2000
     turnos ("imitador preso em RONDA"). Sem resposta ele vai pro
     barulho, como qualquer uma; com resposta ele vai exatamente em
     você. É a mesma ideia sem o impasse. */
  const d=distancia(cena.casa.monstro,onde);
  /* mais tarde no jogo ela ouve de mais longe */
  const raio=ANOM_CFG.raioDeteccao+(dif()>=.75?1:0);
  if(d>raio&&(forca||1)<.9)return;
  I.ruidoEm=onde;
  if(I.fase==='RONDA'){ I.fase='SUSPEITA'; I.faseTurnos=0; }
  else if(I.fase==='PERDEU'){ I.fase='CACA'; I.faseTurnos=0; }
}

/* Você pisou em algum lugar. Quem lê o chão acorda com isto — e SÓ com
   isto: barulho não diz nada pro rastejante.

   Isto existe porque o teste de 2000 turnos pegou o rastejante preso em
   RONDA pra sempre: ele recusava som (certo) e não tinha nenhuma outra
   porta de entrada (errado). Uma criatura que nunca sai de ronda é uma
   criatura que não existe. */
function anomPisou(I,onde){
  if(!I||I.cooldown>0)return;
  if(regraDe(I).sentido!=='rastro')return;
  if(I.fase==='RONDA'){ I.fase='SUSPEITA'; I.faseTurnos=0; }
  else if(I.fase==='PERDEU'){ I.fase='CACA'; I.faseTurnos=0; }
}

/* avança o ciclo um turno. Devolve textos pro jogador. */
function anomAvancar(I){
  const c=cena.casa, out=[];
  I.faseTurnos=(I.faseTurnos||0)+1;
  if(I.cooldown>0){ I.cooldown--; if(I.cooldown===0)out.push('Ela parou de procurar.'); }

  if(I.fase==='SUSPEITA'&&I.faseTurnos>ANOM_CFG.turnosSuspeita){
    I.fase='CACA'; I.faseTurnos=0;
    out.push('Ela decidiu pra onde ir.');
  }else if(I.fase==='CACA'){
    /* teto: nenhuma perseguição é eterna */
    if(I.faseTurnos>ANOM_CFG.turnosCacaMax||I.ruidoEm==null){
      I.fase='PERDEU'; I.faseTurnos=0;
      out.push('Ela perdeu o rastro e começa a revirar por perto.');
    }
  }else if(I.fase==='PERDEU'&&I.faseTurnos>ANOM_CFG.turnosPerdeu){
    I.fase='RONDA'; I.faseTurnos=0; I.ruidoEm=null; I.memoria=0;
    I.cooldown=ANOM_CFG.cooldown;
    out.push('Ela desistiu e voltou a andar sem rumo.');
  }
  /* a janela do imitador e do primordial fecha sozinha */
  if(I.respondeu&&I.fase!=='CACA')I.respondeu=false;
  if(I.olhou)I.olhou=false;
  return out;
}

/* ================= MOVIMENTO ================= */
/* Substitui `moverMonstro` inteira. A antiga era pequena e fazia uma
   coisa só; esta consulta a regra da criatura e a fase do ciclo. */
if(typeof moverMonstro==='function'){
  moverMonstro=function(pos,I){
    let opts=vizinhos(pos);
    if(I.bloqTurnos>0&&I.bloqueio!==null)opts=opts.filter(o=>o!==I.bloqueio);
    if(!opts.length)return pos;
    const R=regraDe(I);

    /* O MAGRO E A LUZ — corrigido depois da auditoria da Fase 0.
       A primeira versão filtrava fora todo cômodo aceso e, se não
       sobrasse nenhum, ele ficava parado. Só que A CASA COMEÇA COM
       TODAS AS LUZES ACESAS: na prática o filtro esvaziava as opções
       toda vez e o Magro NUNCA ANDAVA. Inerte no jogo normal, como o
       imitador e o rastejante estavam.

       Luz agora DETER, não paralisa. Ele prefere o escuro; entrar no
       aceso custa um turno. O contra-jogo continua real e fica melhor:
       manter aceso o caminho até você o atrasa — e atrasar é diferente
       de congelar, que é o que dava exploit. */
    if(R.evita){
      const escuros=opts.filter(o=>!R.evita(o));
      if(escuros.length){
        opts=escuros;
      }else if(!I.pagouLuz){
        /* tudo aceso: ele para UM turno pra atravessar a luz, e o
           jogador é avisado de que a luz está segurando */
        I.pagouLuz=1;
        if(typeof diz==='function')
          diz('Ele para na porta do cômodo aceso. Não gosta, mas não desiste.','bom');
        return pos;
      }else{
        I.pagouLuz=0;                        /* pagou: atravessa mesmo assim */
      }
    }
    if(!opts.length)return pos;

    /* o Inchado perde turno pra passar em vão apertado */
    if(R.atrasaEm&&I.atraso>0){ I.atraso--; return pos; }

    /* O MAGRO RECUANDO. `I.recuo` era escrito duas vezes e lido zero —
       a auditoria pegou. `ANOM_CFG.magroRecuaTurnos` não tinha efeito
       nenhum. Agora tem: enquanto recua, ele ANDA PRA LONGE de você, e
       não fica só sem alvo. É a diferença entre "a lanterna funcionou"
       e "a lanterna resetou a fase". */
    if(I.recuo>0){
      I.recuo--;
      const longe=opts.reduce((a,o)=>
        distancia(o,cena.casa.voce)>distancia(a,cena.casa.voce)?o:a, pos);
      return longe;
    }

    /* rondando ou em cooldown: anda sem rumo */
    if(I.fase==='RONDA'||I.cooldown>0)return sortear([...opts,pos]);

    /* AS DUAS METADES DO CORO DESENCONTRADAS. `I.divididas` era escrito
       duas vezes e lido zero — e o jogo ESCREVIA NA TELA que elas se
       desencontravam. Era mentira ao jogador, que é o pecado exato da
       regra de ouro. Agora, enquanto divididas, cada metade anda sem
       rumo: elas param de convergir e o vão entre elas abre. */
    if(I.divididas>0){
      I.divididas--;
      return sortear([...opts,pos]);
    }

    const alvo=R.alvo(I,cena.casa);
    if(alvo==null||alvo===undefined)return sortear([...opts,pos]);

    /* em PERDEU ela vasculha em volta do alvo, não em cima dele */
    if(I.fase==='PERDEU'){
      const perto=opts.filter(o=>distancia(o,alvo)<=1);
      return perto.length?sortear(perto):sortear([...opts,pos]);
    }

    let melhor=pos,d=99;
    opts.forEach(o=>{const dd=distancia(o,alvo);if(dd<d){d=dd;melhor=o;}});
    /* entrou em cômodo apertado: o Inchado paga o pedágio */
    if(R.atrasaEm&&R.atrasaEm(melhor))I.atraso=ANOM_CFG.inchadoAtraso;
    return melhor;
  };
}

/* ================= OS GANCHOS DO TURNO ================= */
if(typeof invasao==='function'){
  const _inv=invasao;
  invasao=async function(qtd){
    const r=await _inv.apply(this,arguments);
    return r;
  };
}

/* `turnoMonstro` é onde o turno realmente conta. Aqui o ciclo anda, o
   aviso é emitido e a marca é deixada. */
if(typeof turnoMonstro==='function'){
  const _tm=turnoMonstro;
  turnoMonstro=async function(I){
    if(!I.fase)anomIniciar(I);
    const c=cena.casa;

    /* AVISO OBRIGATÓRIO: se ela está a um cômodo de distância, o jogador
       é avisado ANTES do turno em que ela pode encostar. Sem isto, dano
       do nada — que é a coisa que o briefing proíbe. */
    const dAntes=distancia(c.voce,c.monstro);
    if(dAntes<=ANOM_CFG.distanciaAviso&&!I.avisou&&I.fase!=='RONDA'){
      I.avisou=true;
      const pan=panDe(c.voce,c.monstro);
      try{ if(typeof arranhao==='function')arranhao(pan,.7); }catch(e){}
      diz(avisoDe(I),'perigo');
      await pausa(1100);
    }
    if(dAntes>ANOM_CFG.distanciaAviso)I.avisou=false;

    /* O CHAMADO DO IMITADOR, e ele precisa existir aqui.
       O jogo base já tinha um texto de chamado dentro de `turnoMonstro`,
       mas ele não marcava nada — era só clima. Sem uma marca, o campo
       `respondeu` nunca virava verdade e a criatura ficava inofensiva.
       Aqui o chamado vira MECÂNICA: ela finge estar num cômodo vizinho,
       e quem se mexe no turno seguinte se entrega. */
    if(I.bicho&&I.bicho.id==='imitador'&&I.fase!=='RONDA'&&I.cooldown<=0){
      const viz=vizinhos(c.voce).filter(v=>v!==c.monstro);
      I.chamouEm=viz.length?sortear(viz):c.voce;
      I.chamouTurno=I.faseTurnos;
      const quem=(S.vozesRoubadas&&S.vozesRoubadas.length)
        ? sortear(S.vozesRoubadas).p
        : ((S.abrigo&&S.abrigo.length)?sortear(S.abrigo):null);
      diz(`Você ouve ${quem?quem.n:'uma voz conhecida'} chamando do ${
        PLANTA[I.chamouEm].nome.toLowerCase()}: “vem, é seguro aqui”.`,'perigo');
      await pausa(1100);
      /* O JOGO BASE TEM O PRÓPRIO CHAMADO (index.html:16797), e ele não
         marca nada — é só clima. Os dois disparando no mesmo turno era
         chamado duplicado, achado na auditoria. Enquanto o meu fala, o
         dele fica calado; volta logo depois. A cópia do bicho existe pra
         isso não vazar pra tabela. */
      I._calarChamaBase=1;
    }

    const textos=anomAvancar(I);
    const chamaSalva=I.bicho?I.bicho.chama:undefined;
    if(I._calarChamaBase&&I.bicho)I.bicho.chama=false;
    let r;
    try{ r=await _tm.call(this,I); }
    finally{
      if(I._calarChamaBase&&I.bicho){ I.bicho.chama=chamaSalva; I._calarChamaBase=0; }
    }
    textos.forEach(t=>diz(t,'sist'));
    return r;
  };
}
/* o aviso é a voz da criatura, não um alerta genérico */
function avisoDe(I){
  const id=I.bicho?I.bicho.id:'magro';
  return {
    magro:'A madeira range no cômodo ao lado. Alguma coisa muito alta parou de andar.',
    rastejante:'Um arrastar de peito no assoalho, do outro lado da parede.',
    coro:'Duas respirações no mesmo compasso, muito perto.',
    imitador:'Alguém chama o seu nome do cômodo ao lado. Você conhece essa voz.',
    inchado:'O batente estala. Tem coisa grande demais tentando passar.',
    primordial:'O ar do cômodo ao lado está errado. Você sente no dente.'
  }[id]||'Alguma coisa parou do outro lado da parede.';
}

/* ---- o que o jogador faz alimenta o ciclo ---- */
if(typeof mover==='function'){
  const _mv=mover;
  mover=async function(I,dest,rastejar){
    if(!I.fase)anomIniciar(I);
    I.trilha=(I.trilha||[]).concat([dest]).slice(-ANOM_CFG.rastejanteTrilha);
    /* Andar depois de ouvir o chamado é o que entrega você pro imitador.
       A janela é contada a partir do turno do chamado — ficar parado um
       turno é o contra-jogo, e é descobrível: a dica aparece em
       "Escutar onde ele está". */
    if(I.chamouEm!=null&&(I.faseTurnos-(I.chamouTurno||0))<=ANOM_CFG.imitadorJanela){
      I.respondeu=true;
      I.chamouEm=null;
    }
    const r=await _mv.call(this,I,dest,rastejar);
    /* correr faz barulho; rastejar quase não */
    anomOuviu(I,dest,rastejar?.35:1);
    /* mas o chão guarda a pisada dos dois jeitos */
    anomPisou(I,dest);
    return r;
  };
}
if(typeof esconder==='function'){
  const _es=esconder;
  esconder=async function(I){
    if(!I.fase)anomIniciar(I);
    /* esconder direito zera a pista: é o que devolve o ciclo pra RONDA */
    if(I.fase==='CACA'||I.fase==='SUSPEITA'){
      I.fase='PERDEU'; I.faseTurnos=0; I.ruidoEm=null; I.memoria=0;
      diz('Você para de fazer barulho. Do outro lado, ela hesita.','bom');
    }
    return _es.call(this,I);
  };
}
if(typeof bloquear==='function'){
  const _bl=bloquear;
  bloquear=async function(I){
    if(!I.fase)anomIniciar(I);
    /* barulho alto: separa as duas metades do Coro */
    if(I.bicho&&I.bicho.id==='coro'){
      I.divididas=ANOM_CFG.coroDivideTurnos;
      diz('O estrondo pega as duas metades em cômodos diferentes. Elas se desencontram.','bom');
    }
    anomOuviu(I,cena.casa.voce,1);
    return _bl.call(this,I);
  };
}
if(typeof escutar==='function'){
  const _ec=escutar;
  escutar=async function(I){
    if(!I.fase)anomIniciar(I);
    /* escutar é seguro até com o primordial: você não olha */
    const r=await _ec.call(this,I);
    try{ diz('— '+regraDe(I).dica,'fraco'); }catch(e){}
    return r;
  };
}
/* olhar direto pro primordial encurta a distância e custa cabeça */
if(typeof usarLanterna==='function'){
  const _ul=usarLanterna;
  usarLanterna=async function(I){
    if(!I.fase)anomIniciar(I);
    if(I.bicho&&I.bicho.id==='primordial'){
      I.olhou=true;
      if(typeof mexerSan==='function')mexerSan(-ANOM_CFG.primordialCustoOlhar,'olhou pra aquilo');
      diz('O facho acha o lugar onde ela devia estar e a sua cabeça se recusa a guardar o que viu.','perigo');
    }else if(I.bicho&&I.bicho.id==='magro'){
      I.recuo=ANOM_CFG.magroRecuaTurnos;
      I.fase='PERDEU'; I.faseTurnos=0; I.ruidoEm=null;
      diz('A luz pega nele em cheio. Ele se dobra pra trás e some pro fundo da casa.','bom');
    }
    return _ul.call(this,I);
  };
}

/* ================= PRESENÇA FORA DO COMBATE ================= */
function marcas(){
  if(!Array.isArray(S.marcasCasa))S.marcasCasa=[];
  return S.marcasCasa;
}
function deixarMarca(I){
  if(!chance(ANOM_CFG.chanceMarca))return null;
  const id=I.bicho?I.bicho.id:'magro';
  const onde=cena.casa?cena.casa.monstro:4;
  const t={
    magro:'Tem marca de mão alta demais na parede, acima de onde alcança braço de gente.',
    rastejante:'Uma trilha larga e úmida atravessa o chão e some embaixo do móvel.',
    coro:'Dois pares de pegadas iguais, lado a lado, no mesmo passo.',
    imitador:'Alguém escreveu o seu nome no vidro embaçado. A letra é sua.',
    inchado:'O batente está rachado de cima a baixo e sobrou tinta no vão.',
    primordial:'Tem um pedaço do cômodo que você não consegue olhar direto.'
  }[id];
  if(!t)return null;
  const M=marcas();
  M.push({onde,t,dia:S.dia});
  while(M.length>ANOM_CFG.marcasMax)M.shift();
  if(typeof marcarSujo==='function')marcarSujo();
  return t;
}
/* a marca aparece quando você entra no cômodo, mesmo dias depois */
if(typeof irPara==='function'){
  const _ip=irPara;
  irPara=function(id,semTexto){
    const r=_ip.apply(this,arguments);
    try{
      marcas().filter(m=>m.onde===id).forEach(m=>{
        const d=S.dia-m.dia;
        diz(m.t+(d>0?` (${d===1?'de ontem':'de '+d+' dias atrás'})`:''),'alerta');
      });
    }catch(e){}
    return r;
  };
}
/* toda invasão que termina pode deixar marca */
if(typeof escapou==='function'){
  const _ex=escapou;
  escapou=async function(I){ try{deixarMarca(I);}catch(e){} return _ex.apply(this,arguments); };
}

/* ================= PERSISTÊNCIA ================= */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      const d=JSON.parse(localStorage.getItem(CHAVE)||'{}');
      d.marcasCasa=S.marcasCasa||[];
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/marcas'); }
  };
}
/* save antigo não tem marca nenhuma, e não ter é o estado certo */
if(!Array.isArray(S.marcasCasa))S.marcasCasa=[];

/* ================= DEBUG ================= */
/* `anomInvocar('coro')` começa uma invasão com aquela criatura. */
function anomInvocar(id){
  if(!REGRA[id]){ console.warn('anomalia desconhecida: '+id); return null; }
  const b=BICHOS.find(x=>x.id===id);
  if(!b)return null;
  S._forcarBicho=id;
  if(typeof invasao==='function')invasao(b.dois?2:1);
  return id;
}
if(typeof sortearBicho==='function'){
  const _sb=sortearBicho;
  sortearBicho=function(){
    if(S._forcarBicho){
      const b=BICHOS.find(x=>x.id===S._forcarBicho);
      S._forcarBicho=null;
      if(b)return b;
    }
    return _sb.apply(this,arguments);
  };
}
function anomEstado(I){
  const J=I||{};
  return {fase:J.fase||null, faseTurnos:J.faseTurnos||0,
    bicho:J.bicho?J.bicho.id:null, ruidoEm:J.ruidoEm,
    trilha:(J.trilha||[]).slice(), cooldown:J.cooldown||0,
    avisou:!!J.avisou, respondeu:!!J.respondeu, olhou:!!J.olhou,
    marcas:marcas().length};
}
