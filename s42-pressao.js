/* ============ §42 — PRESSÃO, LUZ E EXPOSIÇÃO (Etapa 4 de 9) ============

   A Etapa 1 deixou dois campos declarados em `custoDeEntrada()` com
   valor zero e o motivo escrito ao lado: `luz` e `exposicao`. Nao foi
   esquecimento — os consumidores delas nao existiam, e ligar parametro
   sem consumidor e a proibicao nº 5 do briefing. Agora os consumidores
   nascem, e os dois campos passam a cobrar.

   O QUE ENTRA
   -----------
   1 · PRESSAO — sobe fora do nucleo, decai SO no nucleo, e nunca
       aparece como numero: sai pelos quatro degraus diegeticos
   2 · O VALE OBRIGATORIO depois do pico — e ele reusa o mecanismo de
       silencio que o §31 ja tem, em vez de inventar outro
   3 · LUZ — cobra diesel quando o comodo esta aceso. No escuro nao
       cobra recurso nenhum, e e muito pior: mais pressao e mais
       sanidade. "Barato e pior" e o desenho do A2.
   4 · EXPOSICAO — `atencaoDaCasa` sobe com profundidade e barulho, e a
       casa acorda com mais orcamento na noite seguinte
   ====================================================================== */

const PRES_CFG={
  /* quanto a pressao sobe por entrada, por camada. Camada 0 nao sobe. */
  porCamada: 0.045,
  /* atravessar no escuro sobe mais: voce nao esta vendo o que la esta */
  escuro: 0.055,
  /* o nucleo e o unico lugar que devolve, e devolve devagar. Se aliviar
     rapido, voltar deixa de ser decisao e vira botao. */
  alivioNucleo: 0.06,
  /* os quatro degraus do A3 */
  degraus: [0, .30, .60, .80],
  /* diesel por entrada em comodo aceso. Pequeno de proposito: o preco
     da luz e continuo, nao e um susto. */
  dieselPorEntrada: 0.35,
  /* no escuro a cabeca paga o que o gerador nao pagou */
  sanNoEscuro: -0.4,
  /* exposicao: quanto cada entrada funda e cada ruido acordam a casa */
  atencaoPorCamada: 0.02,
  atencaoPorRuido: 0.008,
  /* quanto a atencao vira orcamento na noite seguinte, no maximo.
     Continua respeitando o teto do §31: acordar a casa nao fura o
     limite que ela ja prometia. */
  orcamentoPorAtencao: 28,
  /* a atencao esfria sozinha entre noites — senao vira catraca */
  atencaoEsfria: 0.18,
  /* o pico abre credito pesado pro orquestrador, limitado */
  creditoDoPico: 30
};

/* ================= 1 · A PRESSÃO =================
   Ela nunca e mostrada como numero. O jogador so ve os degraus, e cada
   degrau fala uma vez por subida — repetir a mesma linha todo turno
   viraria chuvisco e o jogador pararia de ler, que e o problema que o
   §37 ja tinha diagnosticado na linha de saldo. */
const PRES_FALAS=[
  [],
  ['Tem um estalo atrás de você que não estava aqui antes.',
   'A luz oscila uma vez, curta, e volta.',
   'Você ouve o seu passo duas vezes. O segundo chega um pouco tarde.'],
  ['A porta que você deixou aberta está encostada.',
   'O corredor que você usou pra vir não está do jeito que você lembra.',
   'Alguma coisa mudou de lugar nas suas costas e você não vai conferir.'],
  ['A casa parou de avisar.',
   'Não tem mais estalo, não tem mais oscilada. Só o que está vindo.',
   'O barulho parou todo de uma vez. Isso é pior do que o barulho.']
];
/* ATENCAO AO NOME: nao e `pressao()`. Essa JA EXISTE em
   index.html:12589 e e outra coisa inteira — a pressao da DIFICULDADE
   ("menos gente la fora quer dizer mais coisa que nao e gente"), que
   devolve 1 ou mais e alimenta a curva do jogo. Sombrear ela aqui
   quebraria a dificuldade em silencio, sem erro nenhum.
   O campo de estado continua sendo `S.exploracao.pressao`, que e o nome
   do briefing; quem colide e so o acessor. Terceira vez que a guarda do
   montar.js salva uma etapa — ANCORAS no §38, SINAIS no §40, esta. */
function pressaoAgora(){ return trava(+(estadoExp().pressao||0),0,1); }
function grauDePressao(p){
  const v=(p==null)?pressaoAgora():p;
  let g=0;
  for(let i=0;i<PRES_CFG.degraus.length;i++) if(v>=PRES_CFG.degraus[i])g=i;
  return g;
}
function mexerPressao(d,motivo){
  const E=estadoExp();
  const antes=trava(+(E.pressao||0),0,1);
  const grauAntes=grauDePressao(antes);
  E.pressao=trava(antes+d,0,1);
  const grauDepois=grauDePressao(E.pressao);

  /* subiu de degrau: a casa fala, uma vez */
  if(grauDepois>grauAntes){
    E.grauFalado=grauDepois;
    const l=PRES_FALAS[grauDepois];
    if(l&&l.length&&typeof diz==='function')
      diz(sortear(l), grauDepois>=3?'perigo':'narr');
    if(grauDepois>=3)abrirPico();
  }
  /* desceu abaixo de 0.6 depois de um pico: o vale e obrigatorio */
  if(E.picoAberto&&E.pressao<PRES_CFG.degraus[2])fecharPicoComVale();
  if(typeof marcarSujo==='function')marcarSujo();
  return E.pressao;
}

/* ================= 2 · O PICO E O VALE =================
   O A3 diz duas coisas: ao cruzar 0.8 o orquestrador ganha permissao de
   gastar pesado, e depois de um pico e obrigatorio um vale.

   Nao invento mecanismo de silencio: o §31 ja agenda vales em turnos e
   `emVale()` ja e consultado por `pedirPermissao`. O pico so acrescenta
   mais um vale na lista dele. Silencio continua sendo conteudo
   reservado, nao o que sobra. */
function abrirPico(){
  const E=estadoExp();
  if(E.picoAberto)return false;
  E.picoAberto=true;
  E.picos=(E.picos||0)+1;
  try{
    const O=(typeof orq==='function')?orq():null;
    if(O)O.creditoPressao=(O.creditoPressao||0)+PRES_CFG.creditoDoPico;
  }catch(e){}
  return true;
}
function fecharPicoComVale(){
  const E=estadoExp();
  if(!E.picoAberto)return false;
  E.picoAberto=false;
  E.valesPorPico=(E.valesPorPico||0)+1;
  try{
    const O=(typeof orq==='function')?orq():null;
    if(O&&Array.isArray(O.vales)){
      const t=Math.max(1,O.turno|0);
      O.vales.push({de:t,ate:t+6,dePico:true});
      O.creditoPressao=0;
    }
  }catch(e){}
  if(typeof diz==='function')
    diz('A casa se acalma de um jeito que não convence ninguém.','sist');
  return true;
}
/* o credito do pico deixa o orquestrador passar do orcamento, ate o
   limite declarado — e nao mais que isso */
if(typeof pedirPermissao==='function'){
  const _presPP=pedirPermissao;
  pedirPermissao=function(id,opcoes){
    const r=_presPP.apply(this,arguments);
    try{
      if(r&&!r.ok&&/orçamento/.test(r.porque||'')){
        const O=orq(), a=registroDe(id);
        if(a&&O.creditoPressao>0&&(O.gasto+a.peso)<=(O.orcamentoNoite+O.creditoPressao)){
          O.creditoPressao=Math.max(0,O.creditoPressao-a.peso);
          O.gasto+=a.peso;
          marcarAtiva(id);
          return {ok:true,porque:'crédito de pressão'};
        }
      }
    }catch(e){}
    return r;
  };
}

/* ================= 3 · A LUZ, E O ESCURO =================
   Comodo aceso queima diesel por entrada. Comodo escuro nao custa
   recurso nenhum — e cobra na cabeca e na pressao. E o A2 escrito: no
   escuro e mais barato e muito pior. */
function comodoAceso(id){
  try{ return !!(typeof interruptor==='function'&&interruptor(id)
    &&typeof temEnergia==='function'&&temEnergia()); }
  catch(e){ return false; }
}
if(typeof custoDeEntrada==='function'){
  const _presCE=custoDeEntrada;
  custoDeEntrada=function(id,de){
    const c=_presCE.apply(this,arguments);
    try{
      const cam=camadaDe(id);
      const aceso=comodoAceso(id);
      /* LUZ: o preco de enxergar */
      c.luz=aceso?+(PRES_CFG.dieselPorEntrada*(1+cam*.25)).toFixed(2):0;
      /* o escuro cobra em outro lugar */
      if(!aceso&&cam>0){
        c.sanidade=+(c.sanidade+PRES_CFG.sanNoEscuro).toFixed(2);
        c.escuro=true;
      }
      /* EXPOSICAO: profundidade e barulho acordam a casa */
      c.exposicao=+((cam*PRES_CFG.atencaoPorCamada)+((c.ruido||0)*PRES_CFG.atencaoPorRuido)).toFixed(4);
      delete c.porQueZero;   /* os dois deixaram de ser zero declarado */
    }catch(e){}
    return c;
  };
}

/* ================= 4 · O PASSO PAGA =================
   Embrulha o `irPara` que o §39 ja embrulhou. A ordem importa: o §39
   cobra tempo, ruido e sanidade; aqui cobra luz, pressao e exposicao. */
if(typeof irPara==='function'){
  const _presIP=irPara;
  irPara=function(id,semTexto){
    let c=null, de=null;
    try{
      de=(cena&&cena.casa)?cena.casa.voce:null;
      if(de!=null&&de!==id&&PLANTA[id])c=custoDeEntrada(id,de);
    }catch(e){}
    const r=_presIP.apply(this,arguments);
    try{
      if(c){
        const E=estadoExp();
        if(c.luz>0&&S.diesel>0)S.diesel=trava(S.diesel-c.luz,0,100);
        if(c.exposicao>0)E.atencaoDaCasa=trava((E.atencaoDaCasa||0)+c.exposicao,0,1);
        const cam=camadaDe(id);
        if(cam===0)mexerPressao(-PRES_CFG.alivioNucleo,'núcleo');
        else mexerPressao(cam*PRES_CFG.porCamada+(c.escuro?PRES_CFG.escuro:0),'fundo');
      }
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'pressao/passo'); }
    return r;
  };
}

/* ================= 5 · A CASA ACORDA COM O QUE VIU =================
   `atencaoDaCasa` vira orcamento na noite seguinte, respeitando o teto
   que o §31 ja prometia. E esfria sozinha, senao vira catraca: quem
   explorou muito uma vez ficaria marcado pra sempre. */
if(typeof orqNovaNoite==='function'){
  const _presONN=orqNovaNoite;
  orqNovaNoite=function(silencioso){
    const O=_presONN.apply(this,arguments);
    try{
      const E=estadoExp();
      const at=trava(+(E.atencaoDaCasa||0),0,1);
      if(at>0&&O){
        const extra=Math.round(at*PRES_CFG.orcamentoPorAtencao);
        O.orcamentoNoite=Math.min(ORQ_CFG.orcamentoTeto,O.orcamentoNoite+extra);
        O.porAtencao=extra;
      }
      E.atencaoDaCasa=trava(at*(1-PRES_CFG.atencaoEsfria),0,1);
      /* pressao nao atravessa a noite: o dia comeca no nucleo */
      E.pressao=trava((E.pressao||0)*.5,0,1);
      E.picoAberto=false;
      if(typeof marcarSujo==='function')marcarSujo();
    }catch(e){}
    return O;
  };
}

/* ---------- depuracao ---------- */
function pressaoEstado(){
  const E=estadoExp();
  return {pressao:+pressaoAgora().toFixed(3), grau:grauDePressao(),
    degrau:['calma','estalos','a rota muda','a casa parou de avisar'][grauDePressao()],
    atencaoDaCasa:+(E.atencaoDaCasa||0).toFixed(3),
    picos:E.picos|0, valesPorPico:E.valesPorPico|0, picoAberto:!!E.picoAberto,
    creditoAberto:(function(){try{return orq().creditoPressao|0;}catch(e){return 0;}})()};
}
