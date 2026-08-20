/* ============ §31 — ORQUESTRADOR DE TENSÃO ============

   O ÚNICO que autoriza evento. Clima, invasão, criatura, anomalia e
   sanidade PEDEM PERMISSÃO. Ninguém dispara por conta.

   POR QUE ISSO É A CAMADA QUE FALTAVA
   -----------------------------------
   Sem orquestrador, cada sistema sorteia sozinho e o jogador vive o
   resultado da soma de dados independentes: às vezes três sustos
   colados, às vezes uma noite morta. Isso É aleatoriedade, e é
   exatamente o que a regra de ouro proíbe — o jogador não consegue
   explicar nem uma coisa nem outra depois que acontece.

   O SILÊNCIO É CONTEÚDO
   ---------------------
   `valeObrigatorio` não é ausência de evento: é evento. A noite tem
   pelo menos um vale longo agendado, e ele é agendado ANTES de qualquer
   permissão ser dada — não é o que sobra, é o que foi reservado.
   ====================================================================== */

const ORQ_CFG={
  /* --- orçamento --- */
  /* teto de peso por noite. Cada evento custa o `peso` do schema.
     Aumentar deixa a noite mais cheia; diminuir deixa mais rarefeita. */
  orcamentoBase: 100,
  /* quanto o orçamento cresce por dia, pra noite tardia poder ser mais
     densa sem mexer no teto base */
  orcamentoPorDia: 2.5,
  orcamentoTeto: 160,

  /* --- cooldowns, em turnos --- */
  /* depois de um evento de uma categoria, quantos turnos até outro da
     MESMA categoria. Impede dois sustos sonoros colados. */
  cooldownCategoria: 6,
  /* e o global: nada de dois eventos quaisquer em janela curta */
  cooldownGlobal: 2,

  /* --- vales de silêncio --- */
  /* quantos vales por noite, e quanto dura cada um em turnos.
     `valeMin` é o piso: sempre pelo menos um vale longo. */
  valesPorNoite: 2,
  valeDuracao: [4,7],
  /* o primeiro vale nunca começa antes deste turno, pra a noite não
     abrir com silêncio e parecer que nada vai acontecer */
  valePrimeiroTurno: 3,

  /* --- anti-repetição --- */
  /* tamanho da janela deslizante que lembra o que já saiu */
  memoriaEventos: 6,
  /* quanto o peso de escolha cai se o evento está na janela.
     0 proibiria repetir; .25 encarece sem proibir. */
  penalRepeticao: .25,

  /* --- fila de adiados --- */
  /* quanto o peso de escolha sobe a cada vez que o evento é negado.
     Nada se perde: o que foi barrado volta mais forte. */
  bonusAdiado: .45,
  /* teto do bônus, pra um evento muito negado não virar certeza */
  bonusAdiadoTeto: 1.8,

  /* --- prioridade: quem preempta quem --- */
  prioridade:{ primordial:100, criatura:80, persistente:55, comum:30, ambiental:10 },

  /* --- faixa alvo de densidade --- */
  /* quantos eventos por noite a noite DEVE ter, em média, quando o
     mundo tenta uma coisa por turno. Abaixo do piso a noite fica
     morta; acima do teto vira feira de sustos e o jogador para de
     conseguir ligar um evento ao anterior. É o número que `orqSimular`
     confere — sem ele "faixa alvo" seria palavra sem medida. */
  densidadeAlvo: [4,8],
  /* diferença de prioridade a partir da qual vale preemptar. Abaixo
     disso o de cima espera: trocar um evento por outro quase igual só
     confunde. */
  deltaPreempcao: 25
};

/* ================= ESTADO ================= */
function orq(){
  if(!S.orquestrador||typeof S.orquestrador!=='object')orqNovaNoite(true);
  return S.orquestrador;
}
function orqNovaNoite(silencioso){
  const orcamento=Math.min(ORQ_CFG.orcamentoTeto,
    ORQ_CFG.orcamentoBase+ORQ_CFG.orcamentoPorDia*Math.max(0,(S.dia|0)-1));
  const O={
    noite:S.dia|0,
    orcamentoNoite:Math.round(orcamento),
    gasto:0,
    cooldownCategoria:{sonora:0,visual:0,fisica:0,espacial:0,cognitiva:0},
    cooldownGlobal:0,
    vales:[],                 /* [{de,ate}] — turnos de silêncio reservado */
    filaAdiada:[],            /* [{id,bonus}] */
    ultimosEventos:[],        /* janela deslizante de ids */
    turno:0,
    concedidos:0, negados:0
  };
  /* OS VALES SÃO AGENDADOS PRIMEIRO. Silêncio é conteúdo: ele é
     reservado antes de qualquer permissão, não é o que sobra. */
  const r=(typeof rng==='function')?rng():null;
  let t=ORQ_CFG.valePrimeiroTurno;
  for(let i=0;i<ORQ_CFG.valesPorNoite;i++){
    const [a,b]=ORQ_CFG.valeDuracao;
    const dur=a+(r?r.inteiro(b-a+1):Math.floor((b-a+1)/2));
    O.vales.push({de:t,ate:t+dur});
    t+=dur+(r?4+r.inteiro(6):6);
  }
  /* criatura é transitória: se o app fechou no meio de uma invasão, o
     id dela ficou na lista e barraria todas as outras (cada criatura
     lista as outras cinco em `incompativelCom`) pra sempre. Avaria
     não: ela É a casa quebrada, e continua quebrada amanhã. */
  S.anomAtivasLista=ativas().filter(id=>id.indexOf('bicho_')!==0);
  S.orquestrador=O;
  if(typeof marcarSujo==='function')marcarSujo();
  if(!silencioso&&typeof console!=='undefined')
    console.log('[orq] noite '+O.noite+' · orçamento '+O.orcamentoNoite
      +' · vales '+JSON.stringify(O.vales));
  return O;
}
function orqTurno(){
  const O=orq();
  O.turno++;
  if(O.cooldownGlobal>0)O.cooldownGlobal--;
  CATEGORIAS.forEach(c=>{ if(O.cooldownCategoria[c]>0)O.cooldownCategoria[c]--; });
  if(typeof marcarSujo==='function')marcarSujo();
  return O.turno;
}
function emVale(turno){
  const O=orq();
  const t=(turno==null)?O.turno:turno;
  /* Fora de invasão o relógio de turnos não anda: turno 0 quer dizer
     "nenhuma noite correndo". Vale é forma da noite, não do dia — sem
     essa porta, uma noite que acabasse dentro de um vale deixaria a
     casa incapaz de estragar nada até a noite seguinte. */
  if(t<=0)return false;
  return O.vales.some(v=>t>=v.de&&t<v.ate);
}

/* ================= MATRIZ DE COMPATIBILIDADE ================= */
/* Implementada de verdade, não como comentário. Duas anomalias podem
   coexistir se nenhuma lista a outra em `incompativelCom` E se as
   categorias não são as duas cognitivas ao mesmo tempo — duas mentiras
   simultâneas viram ruído, não tensão. */
function podeCoexistir(a,b){
  if(!a||!b)return true;
  if(a.id===b.id)return false;
  if((a.incompativelCom||[]).includes(b.id))return false;
  if((b.incompativelCom||[]).includes(a.id))return false;
  if(a.categoria==='cognitiva'&&b.categoria==='cognitiva')return false;
  if(a.requerCriatura&&b.requerCriatura&&a.requerCriatura!==b.requerCriatura)return false;
  return true;
}
/* o que está no ar agora */
function ativas(){
  if(!Array.isArray(S.anomAtivasLista))S.anomAtivasLista=[];
  return S.anomAtivasLista;
}
function registroDe(id){ return CATALOGO_ANOM[id]||null; }
/* entra uma vez só: a avaria que vem da cadeia e a que vem do sorteio
   podem chegar aqui pelo mesmo id, e lista com id repetido faria
   `encerrarAtiva` limpar as duas de uma vez */
function marcarAtiva(id){
  const L=ativas();
  if(!L.includes(id))L.push(id);
  return L;
}

/* ================= PRIORIDADE =================
   A faixa sai do que a coisa CUSTA ao jogador, não da categoria dela.
   E sai dos dados que a AVARIAS já tem — `pior` (piora sozinha) e
   `efeito` (cobra alguma coisa toda noite) —, não de uma tabela nova
   escrita à mão que ficaria mentindo assim que uma avaria mudasse.

   A primeira versão disto classificava TODA avaria como persistente,
   porque olhava `duracaoTurnos[1]>=20` e todas as 15 têm [6,40]. Duas
   das cinco faixas ficavam vazias — parâmetro morto travestido de
   design. Agora as cinco têm conteúdo:

     primordial  1  o primordial
     criatura    5  as outras cinco criaturas
     persistente 11 avaria que piora sozinha ou cobra toda noite
     comum       2  avaria terminal de cadeia, mas inerte por noite
     ambiental   2  avaria que não piora nem cobra: textura
*/
function _avariaDe(a){
  return (a&&a.fonte&&a.fonte.tabela==='AVARIAS'&&typeof AVARIAS!=='undefined')
    ?AVARIAS[a.fonte.chave]:null;
}
function _terminalDeCadeia(chave){
  if(typeof AVARIAS==='undefined')return false;
  return Object.keys(AVARIAS).some(k=>AVARIAS[k].pior===chave);
}
function classeDe(a){
  if(!a)return 'ambiental';
  if(a.requerCriatura==='primordial')return 'primordial';
  if(a.requerCriatura)return 'criatura';
  const A=_avariaDe(a);
  if(A){
    if(A.pior||typeof A.efeito==='function')return 'persistente';
    if(_terminalDeCadeia(a.fonte.chave))return 'comum';
    return 'ambiental';
  }
  /* qualquer registro futuro que não venha das AVARIAS cai pelo peso */
  if(a.duracaoTurnos&&a.duracaoTurnos[1]>=20)return 'persistente';
  return a.peso>=20?'comum':'ambiental';
}
function prioridadeDe(a){ return ORQ_CFG.prioridade[classeDe(a)]||0; }

/* ================= A PERMISSÃO ================= */
/* Devolve {ok, porque}. Quem chama NUNCA dispara sem passar por aqui. */
function pedirPermissao(id,opcoes){
  const O=orq();
  const a=registroDe(id);
  const op=opcoes||{};
  if(!a)return orqNega(id,'não está no catálogo governado');

  /* 1 · precondições — puras, sem efeito colateral */
  for(const f of (a.precondicoes||[])){
    let v; try{ v=f(); }catch(e){ v=false; }
    if(!v)return orqNega(id,'precondição falhou');
  }

  /* 2 · vale obrigatório: dentro do vale, NADA passa. Nem prioridade
     alta. É o único bloqueio absoluto, porque o silêncio reservado
     deixa de ser reservado se qualquer coisa puder furá-lo. */
  if(emVale()&&!op.ignorarVale)return orqNega(id,'vale de silêncio');

  /* 3 · orçamento */
  if(O.gasto+a.peso>O.orcamentoNoite){
    /* preempção: prioridade alta pode estourar o orçamento tomando o
       lugar de algo de classe menor que esteja no ar */
    const menor=ativas().map(registroDe).filter(Boolean)
      .filter(x=>prioridadeDe(x)<prioridadeDe(a))
      .sort((x,y)=>prioridadeDe(x)-prioridadeDe(y))[0];
    if(menor&&prioridadeDe(a)-prioridadeDe(menor)>=ORQ_CFG.deltaPreempcao){
      encerrarAtiva(menor.id,'preemptada por '+a.id);
      O.gasto=Math.max(0,O.gasto-menor.peso);
    }else{
      return orqNega(id,'orçamento estourado');
    }
  }

  /* 4 · cooldowns */
  if(O.cooldownGlobal>0)return orqNega(id,'cooldown global');
  if(O.cooldownCategoria[a.categoria]>0)
    return orqNega(id,'cooldown de '+a.categoria);

  /* 5 · compatibilidade com o que já está no ar */
  const conflito=ativas().map(registroDe).filter(Boolean)
    .find(x=>!podeCoexistir(a,x));
  if(conflito)return orqNega(id,'incompatível com '+conflito.id);

  /* concedido */
  O.gasto+=a.peso;
  O.cooldownGlobal=ORQ_CFG.cooldownGlobal;
  O.cooldownCategoria[a.categoria]=ORQ_CFG.cooldownCategoria;
  O.ultimosEventos.push(id);
  while(O.ultimosEventos.length>ORQ_CFG.memoriaEventos)O.ultimosEventos.shift();
  O.filaAdiada=O.filaAdiada.filter(x=>x.id!==id);
  O.concedidos++;
  marcarAtiva(id);
  if(typeof marcarSujo==='function')marcarSujo();
  return {ok:true,porque:'concedido',peso:a.peso};
}
/* negar não descarta: devolve ao pool com peso maior. Nada se perde. */
function orqNega(id,porque){
  const O=orq();
  O.negados++;
  if(registroDe(id)){
    const f=O.filaAdiada.find(x=>x.id===id);
    if(f)f.bonus=Math.min(ORQ_CFG.bonusAdiadoTeto,f.bonus+ORQ_CFG.bonusAdiado);
    else O.filaAdiada.push({id,bonus:ORQ_CFG.bonusAdiado});
    while(O.filaAdiada.length>24)O.filaAdiada.shift();
  }
  if(typeof marcarSujo==='function')marcarSujo();
  return {ok:false,porque};
}
function encerrarAtiva(id,porque){
  S.anomAtivasLista=ativas().filter(x=>x!==id);
  if(typeof marcarSujo==='function')marcarSujo();
  return porque||'encerrada';
}

/* ================= ESCOLHA PONDERADA =================
   O peso de escolha junta: raridade (inversa), bônus de adiamento e
   penalidade de repetição. Tudo passa pelo RNG semeado. */
function pesoDeEscolha(id){
  const a=registroDe(id); if(!a)return 0;
  const O=orq();
  let w=(6-a.raridade);
  const f=O.filaAdiada.find(x=>x.id===id);
  if(f)w*=(1+f.bonus);
  if(O.ultimosEventos.includes(id))w*=ORQ_CFG.penalRepeticao;
  /* o §32 (memória) pendura o peso dele aqui, se existir */
  if(typeof pesoDaMemoria==='function'){
    try{ w*=pesoDaMemoria(a); }catch(e){}
  }
  return Math.max(0,w);
}
function escolherEvento(candidatos){
  const ids=(candidatos&&candidatos.length)?candidatos:Object.keys(CATALOGO_ANOM);
  const mapa={};
  ids.forEach(id=>{ const w=pesoDeEscolha(id); if(w>0)mapa[id]=w; });
  return rng().pesado(mapa);
}
/* Uma negativa que fala do CANDIDATO (precondição, incompatibilidade,
   fora do catálogo) não diz nada sobre os outros: o turno continua e
   tenta o próximo. Uma negativa que fala do TURNO (vale, cooldown,
   orçamento) vale pra todo mundo: insistir só queimaria a fila de
   adiados com negativas que não foram culpa de ninguém.

   Sem essa distinção o turno morria no primeiro sorteio azarado, e a
   "noite nunca zerada" virava sorte em vez de construção — o teste de
   500 noites pegava 2 turnos 1 mortos justamente assim. */
const NEGATIVA_DO_TURNO=/^(vale|cooldown|orçamento)/;
function orqTentar(candidatos){
  let pool=(candidatos&&candidatos.length)?candidatos.slice():Object.keys(CATALOGO_ANOM);
  for(let i=0;i<pool.length+1;i++){
    const id=escolherEvento(pool);
    if(!id)return null;
    const r=pedirPermissao(id);
    if(r.ok)return id;
    if(NEGATIVA_DO_TURNO.test(r.porque))return null;
    pool=pool.filter(x=>x!==id);
    if(!pool.length)return null;
  }
  return null;
}

/* ================= LIGAÇÃO COM O JOGO =================
   Sem esta seção o catálogo das 15 avarias seria enfeite: registro que
   ninguém consulta é parâmetro morto. */

/* A avaria que nasce do nada pede permissão. A que nasce da cadeia (uma
   avaria que piorou e virou outra) NÃO pede: ela foi ganha pelo
   descuido do jogador, e negá-la seria apagar consequência — o
   contrário da regra de ouro. */
let _avariaEspontanea=false;
if(typeof talvezNovaAvaria==='function'){
  const _orqTNA=talvezNovaAvaria;
  talvezNovaAvaria=function(){
    _avariaEspontanea=true;
    try{ return _orqTNA.apply(this,arguments); }
    finally{ _avariaEspontanea=false; }
  };
}
if(typeof abrirAvaria==='function'){
  const _orqAA=abrirAvaria;
  abrirAvaria=function(id,motivo){
    /* a permissão é pedida antes da inserção de propósito: a
       precondição da avaria é "ainda não está na casa", e perguntar
       depois de inserir a reprovaria sempre */
    if(_avariaEspontanea&&CATALOGO_ANOM['avaria_'+id]){
      const r=pedirPermissao('avaria_'+id);
      if(!r.ok)return null;
    }
    const a=_orqAA.call(this,id,motivo);
    if(a)marcarAtiva('avaria_'+id);
    else if(_avariaEspontanea)encerrarAtiva('avaria_'+id,'abrirAvaria recusou');
    return a;
  };
}
/* consertou: sai da lista do que está no ar, senão nunca mais volta */
if(typeof fecharAvaria==='function'){
  const _orqFA=fecharAvaria;
  fecharAvaria=function(id){
    const r=_orqFA.apply(this,arguments);
    try{ encerrarAtiva('avaria_'+id,'reparada'); }catch(e){}
    return r;
  };
}
/* a invasão acabou de qualquer jeito que tenha acabado — fuga, morte,
   amanhecer. A criatura sai do ar. */
if(typeof invasao==='function'){
  const _orqIN=invasao;
  invasao=async function(){
    try{ return await _orqIN.apply(this,arguments); }
    finally{
      try{ S.anomAtivasLista=ativas().filter(id=>id.indexOf('bicho_')!==0);
        if(typeof marcarSujo==='function')marcarSujo(); }catch(e){}
    }
  };
}
/* a noite vira: orçamento e vales novos */
if(typeof anoitecer==='function'){
  const _an=anoitecer;
  anoitecer=async function(){
    try{ orqNovaNoite(true); }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'orqNovaNoite'); }
    return _an.apply(this,arguments);
  };
}
/* cada turno da invasão é um turno do orquestrador */
if(typeof turnoMonstro==='function'){
  const _tm=turnoMonstro;
  turnoMonstro=async function(I){
    try{ orqTurno(); }catch(e){}
    return _tm.apply(this,arguments);
  };
}
/* a invasão PEDE PERMISSÃO como todo mundo. Se o orquestrador negar, a
   noite passa sem ela — e isso é decisão, não falta de sorte.

   A linha 1 do `checarInvasao` original é `if(S.dia>1&&chance(riscoInvasao()))`
   — um segundo sorteio, que passaria por cima da negativa. Ele é
   silenciado zerando o risco enquanto o original decide: `chance(0)`
   é falso sempre. Sem isso o orquestrador não seria autoridade, seria
   sugestão. */
let _orqSemInvasaoBase=false;
if(typeof riscoInvasao==='function'){
  const _orqRI=riscoInvasao;
  riscoInvasao=function(){
    return _orqSemInvasaoBase?0:_orqRI.apply(this,arguments);
  };
}
if(typeof checarInvasao==='function'){
  const _orqCI=checarInvasao;
  checarInvasao=async function(){
    let decidido=false;
    try{
      if(S.dia>1&&typeof riscoInvasao==='function'&&rng().chance(riscoInvasao())){
        const b=(typeof sortearBicho==='function')?sortearBicho():null;
        if(b){
          const r=pedirPermissao('bicho_'+b.id);
          if(r.ok){
            S._forcarBicho=b.id;
            decidido=true;
            return invasao(b.dois?2:1);
          }
        }
      }
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'checarInvasao/orq'); }
    /* negado ou não sorteado: segue a noite normal, sem invasão */
    if(decidido)return;
    _orqSemInvasaoBase=true;
    try{ return await _orqCI.apply(this,arguments); }
    finally{ _orqSemInvasaoBase=false; }
  };
}

/* ================= SIMULAÇÃO ================= */
/* Roda N noites sem tela e devolve o histograma. É o critério de aceite:
   nenhuma noite com zero eventos, nenhuma acima do orçamento. */
function orqSimular(noites,seed){
  const N=noites||10000;
  const guardaDia=S.dia, guardaOrq=S.orquestrador, guardaAtivas=S.anomAtivasLista;
  const guardaRng=S.rng;
  S.rng=criarRNG((seed>>>0)||123456789);
  const ids=Object.keys(CATALOGO_ANOM);
  const hist={}, porNoite=[];
  /* a noite de ciclo quebrado (§32) é vazia DE PROPÓSITO: contá-la
     junto com as vazias por acidente esconderia justamente a diferença
     entre design e azar, que é a única coisa que este número mede. */
  let zeradas=0, estouros=0, comVale=0, quebradas=0;
  for(let n=0;n<N;n++){
    S.dia=1+(n%30);
    S.anomAtivasLista=[];
    const O=orqNovaNoite(true);
    let eventos=0;
    for(let t=0;t<24;t++){
      orqTurno();
      /* a cada turno o mundo tenta uma coisa */
      const id=orqTentar(ids);
      if(id){ eventos++; encerrarAtiva(id); }
    }
    if(O.gasto>O.orcamentoNoite)estouros++;
    if(O.noiteQuebrada)quebradas++;
    else if(!eventos)zeradas++;
    if(O.vales.length)comVale++;
    porNoite.push(eventos);
    hist[eventos]=(hist[eventos]||0)+1;
  }
  S.dia=guardaDia; S.orquestrador=guardaOrq;
  S.anomAtivasLista=guardaAtivas; S.rng=guardaRng;
  const soma=porNoite.reduce((a,b)=>a+b,0);
  const media=soma/N;
  const ord=porNoite.slice().sort((a,b)=>a-b);
  const [pisoAlvo,tetoAlvo]=ORQ_CFG.densidadeAlvo;
  return {noites:N, media:+media.toFixed(2),
    faixaAlvo:ORQ_CFG.densidadeAlvo.slice(),
    dentroDaFaixa:(media>=pisoAlvo&&media<=tetoAlvo),
    min:ord[0], max:ord[ord.length-1],
    p50:ord[Math.floor(N*.5)], p90:ord[Math.floor(N*.9)],
    zeradas, quebradas, estouros, comVale, hist};
}
/* imprime o histograma no console, como pedido */
function orqHistograma(noites,seed){
  const r=orqSimular(noites,seed);
  const ks=Object.keys(r.hist).map(Number).sort((a,b)=>a-b);
  const maxN=Math.max(...ks.map(k=>r.hist[k]));
  console.log('[orq] '+r.noites+' noites · média '+r.media
    +' · min '+r.min+' · p50 '+r.p50+' · p90 '+r.p90+' · max '+r.max);
  console.log('[orq] noites zeradas: '+r.zeradas+' · vazias por decisão: '+r.quebradas
    +' · estouros de orçamento: '+r.estouros
    +' · faixa alvo '+r.faixaAlvo[0]+'–'+r.faixaAlvo[1]
    +' · '+(r.dentroDaFaixa?'DENTRO':'FORA'));
  ks.forEach(k=>{
    const n=r.hist[k];
    console.log(String(k).padStart(3)+' eventos | '
      +'#'.repeat(Math.max(1,Math.round(n/maxN*46)))+' '+n);
  });
  return r;
}

/* ================= PERSISTÊNCIA ================= */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      const d=JSON.parse(localStorage.getItem(CHAVE)||'{}');
      d.orquestrador=S.orquestrador||null;
      d.anomAtivasLista=S.anomAtivasLista||[];
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/orq'); }
  };
}
/* save antigo não tem orquestrador: a primeira noite dele cria um.
   Nada a converter — não havia orçamento pra preservar. O que existe
   pra reconciliar são as avarias que o save já traz: elas estão no ar
   desde antes do orquestrador existir, e a lista precisa saber. */
if(!Array.isArray(S.anomAtivasLista))S.anomAtivasLista=[];
function reconciliarAtivas(){
  try{
    if(typeof avarias!=='function')return 0;
    let n=0;
    avarias().forEach(a=>{
      if(CATALOGO_ANOM['avaria_'+a.id]&&!ativas().includes('avaria_'+a.id)){
        marcarAtiva('avaria_'+a.id); n++;
      }
    });
    return n;
  }catch(e){ return 0; }
}
if(!S.orquestrador)orqNovaNoite(true);
if(typeof carregar==='function'){
  const _orqCA=carregar;
  carregar=function(){
    const r=_orqCA.apply(this,arguments);
    reconciliarAtivas();
    return r;
  };
}
reconciliarAtivas();

function orqEstado(){
  const O=orq();
  return {noite:O.noite, turno:O.turno, orcamento:O.orcamentoNoite, gasto:O.gasto,
    vales:O.vales.slice(), emVale:emVale(),
    cooldownGlobal:O.cooldownGlobal, cooldownCategoria:{...O.cooldownCategoria},
    fila:O.filaAdiada.slice(), ultimos:O.ultimosEventos.slice(),
    ativas:ativas().slice(), concedidos:O.concedidos, negados:O.negados};
}
