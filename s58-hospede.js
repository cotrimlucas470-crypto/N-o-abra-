/* ================= §58 · O HÓSPEDE =====================================

   O SEGUNDO INVASOR GENUINAMENTE NOVO, e o mais estranho dos dois: ele
   NÃO ATACA. Nunca. Não persegue, não fere, não mata. Ele se instala.

   Todas as sete criaturas do jogo — inclusive o Observador — são
   encontros: começam, acontecem e acabam dentro de uma noite. Nenhuma
   persiste. O Hóspede é a primeira ameaça que é ESTADO DA CASA em vez de
   encontro: ele escolhe um cômodo, e a cada dia que você não faz nada
   ele avança de fase e o cômodo vai deixando de ser seu.

   POR QUE ISSO É AMEAÇA SE ELE NÃO ENCOSTA EM VOCÊ. Porque a casa é o
   recurso. A despensa que ele toma estraga comida; a oficina que ele
   toma encarece conserto; o quarto que ele toma tira o descanso. Ele não
   te machuca — ele te empobrece, devagar, à vista.

   AS QUATRO FASES, e cada uma anuncia a próxima:

     CHEGOU     só cheiro. Nada mecânico ainda: é aviso puro.
     INSTALADO  o cômodo pesa: anomalia ali fica mais provável.
     ENRAIZADO  a função do cômodo começa a falhar, e ele olha pro vizinho.
     DA CASA    o cômodo é dele, e a casa inteira desanima toda noite.

   O CONTRA-JOGO EXISTE DESDE O PRIMEIRO DIA, e fica mais caro conforme
   ele se enraíza — que é o ponto: ignorar é uma escolha com preço
   crescente e visível, não uma armadilha. Nunca chega num estado sem
   saída, porque "nunca retire arbitrariamente o controle do jogador" é
   texto do próprio briefing.

   E ELE NÃO MATA. O §9 proíbe evento raro que mate de imediato; o mesmo
   princípio vale aqui com mais força, porque ele é a ameaça longa. Não
   há um caminho no código em que o Hóspede tire vida. O harness cobra. */

const HOSP_CFG={
  /* de quantos dias ele avanca de fase, se ninguem mexer */
  diasPorFase:3,
  /* a partir de que dia ele pode aparecer */
  estreia:6,
  /* quanto ele empurra a chance de anomalia no comodo dele, por fase */
  pesoAnomalia:[0,.18,.34,.50],
  /* quanto a casa desanima por noite na ultima fase */
  moralPorNoite:-3,
  /* horas de trabalho pra tirar ele, por fase */
  custoHoras:[1,2,4,6],
  /* e a chance de conseguir, por fase */
  chanceTirar:[.92,.78,.58,.40]
};
const HOSP_FASES=['CHEGOU','INSTALADO','ENRAIZADO','DA_CASA'];
const HOSP_NOME={
  CHEGOU:'chegou', INSTALADO:'instalado',
  ENRAIZADO:'enraizado', DA_CASA:'dono do cômodo'
};

/* ---------- estado, sem inventar save ----------
   Save antigo nao tem `S.hospede`, e ausencia quer dizer "nao tem
   hospede" — nao ha migracao a fazer e nada quebra. */
function hospede(){
  return (S.hospede&&typeof S.hospede==='object')?S.hospede:null;
}
function hospFase(){ const h=hospede(); return h?h.fase:null; }
function hospGrau(){
  const h=hospede(); if(!h)return 0;
  const i=HOSP_FASES.indexOf(h.fase);
  return i<0?0:i;
}
function hospNoComodo(id){
  const h=hospede();
  return !!(h&&h.comodo===(id|0));
}

/* ---------- ele chega ----------
   O comodo e escolhido pelo gerador semeado: decisao de jogo vai pelo
   gerador, nunca pelo Math.random. E ele prefere comodo com FUNCAO —
   tomar a sala vazia nao custa nada ao jogador, e ameaca que nao custa
   nao e ameaca. */
const HOSP_PREFERE=[2,3,5,1,6,0];   /* despensa, oficina, cozinha, quarto, porao, sotao */
function hospChegar(comodo,porque){
  if(hospede())return null;
  let c=comodo;
  if(c==null){
    const livres=HOSP_PREFERE.filter(x=>typeof PLANTA!=='undefined'&&PLANTA[x]);
    c=livres.length?livres[_inteiro(livres.length)]:2;
  }
  S.hospede={comodo:c|0, fase:'CHEGOU', desdeDia:S.dia|0, avancouDia:S.dia|0,
             tentativas:0, contado:false};
  if(typeof marcarSujo==='function')marcarSujo();
  return S.hospede;
}

/* ---------- ele avança ----------
   Uma vez por dia, e sempre anunciado. Fase nova sem aviso seria
   punicao sem tell. */
/* ---------- o comodo no genero certo ----------
   Metade da planta e feminina (despensa, oficina, sala, cozinha,
   entrada) e a outra metade masculina. Texto com artigo cravado escreve
   "O despensa nao e mais de voces", que foi o que a primeira versao
   fez. O jogo e em portugues; concordancia nao e detalhe.

   O nome e generico de proposito: isto e propriedade da PLANTA, nao do
   Hospede, e o §59 tambem precisa. Chutar o genero pela primeira letra
   (o que eu fiz no §59 antes de lembrar disto) erra em "cozinha". */
const COMODO_ARTIGO={0:'o',1:'o',2:'a',3:'a',4:'a',5:'a',6:'o',7:'a',8:'o'};
function comodoCom(id,forma){
  const art=COMODO_ARTIGO[id]||'o';
  const nome=(typeof PLANTA!=='undefined'&&PLANTA[id])
    ?PLANTA[id].nome.toLowerCase():'cômodo';
  const f=(a,o)=>art==='a'?a:o;
  if(forma==='no')  return f('na ','no ')+nome;      /* "na despensa" */
  if(forma==='do')  return f('da ','do ')+nome;      /* "da despensa" */
  if(forma==='O')   return f('A ','O ')+nome;        /* "A despensa"  */
  return f('a ','o ')+nome;
}

const HOSP_AVANCO={
  INSTALADO:'O cheiro {no} virou uma coisa só com o cômodo. Ninguém quer mais guardar nada ali.',
  ENRAIZADO:'A parede {do} está mole ao toque, e o que fica ali dentro estraga antes da hora.',
  DA_CASA:'{O} não é mais de vocês. Dá pra entrar, e dá pra sair, mas ninguém fica.'
};
function hospPassarDia(){
  const h=hospede(); if(!h)return null;
  const i=HOSP_FASES.indexOf(h.fase);
  if(i<0||i>=HOSP_FASES.length-1){
    /* ultima fase: ele nao avanca mais, mas cobra toda noite */
    if(h.fase==='DA_CASA'&&typeof mexerMoral==='function')
      mexerMoral(HOSP_CFG.moralPorNoite);
    return null;
  }
  if(((S.dia|0)-(h.avancouDia|0))<HOSP_CFG.diasPorFase)return null;
  h.fase=HOSP_FASES[i+1];
  h.avancouDia=S.dia|0;
  if(typeof marcarSujo==='function')marcarSujo();
  const t=(HOSP_AVANCO[h.fase]||'')
    .replace('{no}',comodoCom(h.comodo,'no'))
    .replace('{do}',comodoCom(h.comodo,'do'))
    .replace('{O}', comodoCom(h.comodo,'O'));
  if(t&&typeof diz==='function'){ try{ diz(t,'alerta'); }catch(e){} }
  return h.fase;
}

/* ---------- o que ele custa ----------
   Nada disto tira vida. Ele empobrece, nao fere. */
function hospPesoAnomalia(comodo){
  if(!hospNoComodo(comodo))return 0;
  return HOSP_CFG.pesoAnomalia[hospGrau()]||0;
}
/* a funcao do comodo falha a partir de ENRAIZADO */
function hospEstraga(comodo){
  return hospNoComodo(comodo)&&hospGrau()>=2;
}

/* ---------- tirar ele ----------
   Existe desde o primeiro dia e fica mais caro. Falhar NAO piora a fase:
   custa o tempo e mais nada, porque punir a tentativa empurraria o
   jogador a nao tentar, que e o contrario do que este sistema quer. */
function hospTirar(){
  const h=hospede(); if(!h)return {ok:false, motivo:'nao tem'};
  const g=hospGrau();
  h.tentativas=(h.tentativas|0)+1;
  const conseguiu=chance(HOSP_CFG.chanceTirar[g]);
  if(conseguiu){
    S.hospede=null;
    if(typeof marcarSujo==='function')marcarSujo();
    return {ok:true, horas:HOSP_CFG.custoHoras[g], comodo:h.comodo,
      texto:'Vocês tiram tudo '+comodoCom(h.comodo,'do')+', raspam o que dava pra '
        +'raspar e deixam aberto até de noite. O cheiro vai embora com o vento.'};
  }
  return {ok:false, horas:HOSP_CFG.custoHoras[g], comodo:h.comodo, motivo:'falhou',
    texto:'Vocês raspam '+comodoCom(h.comodo,'')+' o dia inteiro. De noite o cheiro '
      +'volta, igualzinho. Não piorou — mas também não foi.'};
}

/* ================= ONDE ELE DE FATO CUSTA =================
   Sem esta secao o Hospede seria decoracao: fases anunciadas, texto
   bonito, e nenhum efeito. `hospPesoAnomalia` e `hospEstraga` existiriam
   sem ninguem chamar, que e a proibicao nº 6 (parametro morto). Aqui as
   duas viram jogo, e cada uma se liga a coisa que JA existia. */

/* 1 · anomalia e mais provavel no comodo dele.
   `menuComodo` ja sorteia anomalia com `chance(.30)` ao entrar; no
   comodo do Hospede ha uma chance A MAIS, proporcional a fase. Nao e
   multiplicador escondido: e um segundo sorteio, declarado.

   (A primeira versao tambem embrulhava `talvezAnomalia` so pra somar num
   contador `S.hospForcouAnom` que ninguem lia — parametro morto, e a
   proibicao nº 6. Foi embora.) */
/* o gancho de verdade: o comodo dele tem uma chance a mais por visita */
if(typeof menuComodo==='function'){
  const _mc=menuComodo;
  menuComodo=function(id){
    const r=_mc.apply(this,arguments);
    try{
      const extra=hospPesoAnomalia(id);
      if(extra>0&&!S.anomHoje&&S.hora>7&&chance(extra))
        setTimeout(()=>{ try{ talvezAnomalia(id,()=>menuComodo(id)); }catch(e){} },300);
      hospBotao(id);
    }catch(e){}
    return r;
  };
}

/* 2 · o que fica guardado no comodo dele estraga mais.
   `acharComida(q,mult)` ja tem o multiplicador de lugar ruim — o
   Hospede so o usa, em vez de inventar outra conta. */
if(typeof acharComida==='function'){
  const _ac=acharComida;
  acharComida=function(q,mult){
    let m=mult||1;
    try{
      const c=(typeof cena!=='undefined'&&cena.casa&&cena.casa.voce!=null)?cena.casa.voce|0:null;
      if(c!=null&&hospEstraga(c))m*=1.6;
    }catch(e){}
    return _ac.call(this,q,m);
  };
}

/* 3 · o botao de tirar ele, no comodo em que ele esta.
   O contra-jogo tem de estar ONDE o problema esta, e nao numa tela
   escondida — senao existe no codigo e nao existe pro jogador. */
function hospBotao(id){
  if(!hospNoComodo(id))return false;
  if(typeof botao!=='function')return false;
  const e=hospedeEstado();
  botao('Limpar o que se instalou aqui',()=>{
    const fn=()=>{
      const r=hospTirar();
      if(typeof diz==='function')diz(r.texto, r.ok?'bom':'perigo');
      if(typeof menuComodo==='function')menuComodo(id);
    };
    if(typeof acaoDia==='function')acaoDia(e.custoHoras,fn)(); else fn();
  },{cls:e.grau>=2?'prim':'',
     custo:e.custoHoras+'h · '+Math.round(e.chanceTirar*100)+'% · '
       +'ele está '+HOSP_NOME[e.fase]});
  return true;
}

/* ---------- ele é a presença do LUGAR (§53) ----------
   Integracao ganha: o §53 ja sabe que existe presenca presa a um comodo,
   e o Hospede e literalmente isso. */
if(typeof vigFonteReal==='function'){
  const _vf=vigFonteReal;
  vigFonteReal=function(comodo){
    try{
      if(hospNoComodo(comodo)&&hospGrau()>=1)
        return {fonte:'LUGAR', forca:trava(.40+hospGrau()*.18,0,1), quem:'hospede'};
    }catch(e){}
    return _vf.apply(this,arguments);
  };
}

/* ---------- o dia passa ---------- */
if(typeof anoitecer==='function'){
  const _an=anoitecer;
  anoitecer=async function(){
    const r=await _an.apply(this,arguments);
    try{
      if(hospede())hospPassarDia();
      else if((S.dia|0)>=HOSP_CFG.estreia&&chance(.16))hospChegarComAviso();
    }catch(e){}
    return r;
  };
}
function hospChegarComAviso(){
  const h=hospChegar();
  if(!h)return null;
  if(typeof diz==='function')
    try{ diz('Tem um cheiro doce vindo '+comodoCom(h.comodo,'do')
      +'. Ninguém guardou fruta ali.','alerta'); }catch(e){}
  return h;
}

/* ---------- o aviso proprio das duas criaturas novas ----------
   O `avisoDe` da base cai num texto generico pra quem ele nao conhece, e
   "toda criatura tem aviso PROPRIO" e contrato. */
if(typeof avisoDe==='function'){
  const _av=avisoDe;
  avisoDe=function(I){
    const id=I&&I.bicho?I.bicho.id:null;
    if(id==='observador')
      return 'O cômodo ao lado ficou surdo. A casa faz barulho em todo canto, menos lá.';
    if(id==='hospede')
      return 'O cheiro doce ficou mais forte, e agora vem de dentro da parede.';
    return _av.apply(this,arguments);
  };
}

/* ---------- gravar ----------
   Bloco ANEXA a save; bloco nunca CRIA save. */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    const r=_sv.apply(this,arguments);
    if(!S.nomeJogador)return r;
    try{
      const bruto=localStorage.getItem(CHAVE);
      if(!bruto)return r;
      const o=JSON.parse(bruto);
      if(S.hospede)o.hospede=S.hospede; else delete o.hospede;
      localStorage.setItem(CHAVE,JSON.stringify(o));
    }catch(e){}
    return r;
  };
}

function hospedeEstado(){
  const h=hospede();
  return {
    tem:!!h, fase:h?h.fase:null, nome:h?HOSP_NOME[h.fase]:null,
    comodo:h?h.comodo:null, grau:hospGrau(),
    desdeDia:h?h.desdeDia:null, tentativas:h?h.tentativas|0:0,
    pesoAnomalia:h?hospPesoAnomalia(h.comodo):0,
    estraga:h?hospEstraga(h.comodo):false,
    custoHoras:HOSP_CFG.custoHoras[hospGrau()],
    chanceTirar:HOSP_CFG.chanceTirar[hospGrau()],
    fases:HOSP_FASES.slice(), cfg:{...HOSP_CFG}
  };
}
