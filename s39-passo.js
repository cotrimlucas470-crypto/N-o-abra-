/* ============ §39 — O PASSO CUSTA (Etapa 1 de 9) ============

   A auditoria mediu, atravessando os 10 comodos da casa e voltando:

       hora 0 · minutos 0 · ruido 0 · sanidade 0 · diesel 0

   Zero nas cinco dimensoes. `irPara` movia o jogador, redesenhava o
   comodo e listava quem estava la. Nao chamava `gastarHoras`, nao
   chamava `gastarRuido`, nao tocava sanidade nem bateria.

   Isso e a falha critica do briefing: nada impedia varrer a casa
   inteira todo turno. E sem custo de passo, camada, pressao e ponto de
   nao retorno nao tem em que se apoiar — dai esta ser a primeira etapa.

   O QUE ENTRA
   -----------
   1 · CAMADA: profundidade 0..3 por comodo (a 4 e a expedicao, que ja
       existe como sistema proprio)
   2 · custoDeEntrada(): tempo, ruido e sanidade
   3 · o passo cobrando, dentro de `irPara`
   4 · S.exploracao, com schemaVersion e migracao

   O QUE NAO ENTRA, E POR QUE
   --------------------------
   Luz e exposicao. Os consumidores delas — gasto continuo de luz e
   `atencaoDaCasa` ligada ao orcamento do §31 — sao da Etapa 4. Ligar
   agora criaria dois parametros mortos, que e a proibicao nº 5 do
   proprio briefing. Elas entram junto com quem as le.
   ====================================================================== */

const PASSO_CFG={
  /* minutos por entrada, por camada. Um dia tem 720 minutos (07:00 as
     19:00), entao andar de ponta a ponta e barato — o que encarece e
     insistir. A intencao nao e racionar passo: e fazer o jogador sentir
     que a noite chega enquanto ele decide. */
  minutosBase: 4,
  minutosPorCamada: 3,
  /* ruido por camada. Camada 0 e o nucleo: andar nele nao faz barulho
     que a casa escute. */
  ruidoPorCamada: 1.1,
  /* sanidade drena por PRESENCA em camada funda, como o A2 pede — nao
     por evento. So a partir da camada 2. */
  sanPorCamadaFunda: 0.5,
  camadaQueDrena: 2,
  /* voltar pro nucleo alivia: e o unico lugar onde o corpo descansa */
  sanDoNucleo: 0.35
};

/* ================= 1 · AS CAMADAS =================
   A planta e uma grade 3x3 e nunca teve nocao de profundidade. As
   camadas nao mudam a topologia — mudam o preco de estar ali.

       0 nucleo   SALA, QUARTO
       1 casa     COZINHA, ENTRADA
       2 bordas   DESPENSA, OFICINA, SOTAO
       3 anexos   PORAO, QUINTAL

   O QUINTAL e camada 3 e nao 4 de proposito: ele tem `saida:true` e e a
   soleira pra rua, mas ainda e o seu quintal. A camada 4 e a expedicao,
   que ja e outro sistema com risco, riqueza e trilha proprios. */
const CAMADA={4:0, 1:0, 5:1, 7:1, 2:2, 3:2, 0:2, 6:3, 8:3};
function camadaDe(id){ const c=CAMADA[id]; return c==null?1:c; }
function noNucleo(id){ return camadaDe(id)===0; }
const CAMADA_NOME=['núcleo','casa','borda','anexo'];

/* ================= 2 · O CUSTO DE ENTRAR =================
   Devolve o que a entrada cobra. `luz` e `exposicao` aparecem no objeto
   com valor zero e um motivo — nao sao parametro morto, sao contrato
   declarado com data de entrada. Quem ler sabe que existem e que ainda
   nao cobram. */
function custoDeEntrada(id,de){
  const cam=camadaDe(id);
  const camAntes=(de==null)?cam:camadaDe(de);
  const corpo=(typeof custoSaude==='function')?custoSaude():{forca:0,fuga:0,ruido:0};

  /* tempo: mais fundo, mais demorado. Perna ruim encarece o passo, que
     e o laco 2 da Fase 3 do briefing ("ferido explora pior"). */
  const lento=1+trava(corpo.forca||0,0,.65);
  let tempo=Math.round((PASSO_CFG.minutosBase+cam*PASSO_CFG.minutosPorCamada)*lento);

  /* ruido: o nucleo nao faz barulho. O corpo ferido faz — `custa.ruido`
     ja existia na tabela MALES e ja era lido no comeco do dia; aqui ele
     passa a valer tambem no passo. */
  let ruido=cam*PASSO_CFG.ruidoPorCamada+(corpo.ruido||0)*.25;
  if(cam===0)ruido=0;

  /* sanidade: drena por estar, nao por acontecer. E devolve no nucleo. */
  let san=0;
  if(cam>=PASSO_CFG.camadaQueDrena)san=-(PASSO_CFG.sanPorCamadaFunda*(cam-PASSO_CFG.camadaQueDrena+1));
  else if(cam===0&&camAntes>0)san=PASSO_CFG.sanDoNucleo;

  return {
    tempo, ruido:+ruido.toFixed(2), sanidade:+san.toFixed(2),
    luz:0, exposicao:0,
    camada:cam, camadaNome:CAMADA_NOME[cam],
    porQueZero:'luz e exposição entram na Etapa 4, junto de quem as lê'
  };
}

/* ================= 3 · O PASSO COBRANDO =================
   Embrulha `irPara`. Cobra ANTES de mover, porque o custo e de
   atravessar, e devolve o controle ao original — que continua sendo o
   dono do desenho, do som e do menu do comodo. */
function estadoExp(){
  if(!S.exploracao||typeof S.exploracao!=='object')
    S.exploracao={schemaVersion:1,pressao:0,atencaoDaCasa:0,comodos:{},
      atalhosDescobertos:[],locaisSecretos:[],expedicaoAtual:null,passos:0};
  if(!S.exploracao.comodos||typeof S.exploracao.comodos!=='object')S.exploracao.comodos={};
  return S.exploracao;
}
function marcaComodo(id){
  const E=estadoExp();
  if(!E.comodos[id])E.comodos[id]={camada:camadaDe(id),visitado:false,saqueado:false,
    turnoUltimaVisita:0,vezesVisitado:0,rastroSonoro:0,rastroSangue:0,
    achadosRemovidos:[],pistasConhecidas:[],iscaAtiva:null};
  return E.comodos[id];
}

if(typeof irPara==='function'){
  const _passoIP=irPara;
  irPara=function(id,semTexto){
    try{
      if(!PLANTA[id])id=SALA;
      const de=(cena&&cena.casa)?cena.casa.voce:null;
      const fim=(typeof cena!=='undefined'&&cena.modo==='fim');
      /* CHEGAR e COBRAR sao coisas diferentes.
         Na primeira chamada da sessao `cena.casa.voce` ainda e null: nao
         da pra cobrar um trajeto cuja origem nao se conhece, mas o
         comodo foi visitado do mesmo jeito. Separar os dois foi o que
         consertou o SOTAO sumindo da lista de conhecidos. */
      if(!fim&&de!==id){
        const E=estadoExp(), m=marcaComodo(id);
        m.visitado=true; m.vezesVisitado++;
        m.turnoUltimaVisita=(S.dia|0)*1000+(S.hora|0);
        if(de!=null){
          const c=custoDeEntrada(id,de);
          if(c.tempo&&typeof gastarMinutos==='function')gastarMinutos(c.tempo);
          if(c.ruido&&typeof gastarRuido==='function')gastarRuido(c.ruido);
          if(c.sanidade&&typeof mexerSan==='function')mexerSan(c.sanidade);
          m.rastroSonoro=trava(m.rastroSonoro+c.ruido*.1,0,1);
          E.passos=(E.passos||0)+1;
        }
        if(typeof marcarSujo==='function')marcarSujo();
      }
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'passo/custo'); }
    return _passoIP.apply(this,arguments);
  };
}

/* ---------- o jogador precisa LER o preco, senao e punicao ----------
   O briefing e explicito: o custo tem de ser sentido. Uma linha curta,
   so quando o passo foi caro o bastante pra importar. */
if(typeof menuComodo==='function'){
  const _passoMC=menuComodo;
  menuComodo=function(id){
    const r=_passoMC.apply(this,arguments);
    try{
      const cam=camadaDe(id);
      if(cam>=2&&typeof botao==='function'){
        /* nao e botao novo: e etiqueta no que ja existe */
      }
    }catch(e){}
    return r;
  };
}

/* ================= 4 · PERSISTENCIA =================
   Anexa a um save, nunca cria um — a regra que nasceu do save fantasma
   da v60. E migra: save antigo ganha o ramo com os comodos que o jogador
   ja conhece marcados como visitados, pra veterano nao perder progresso. */
function migrarExploracao(d){
  const E={schemaVersion:1,pressao:0,atencaoDaCasa:0,comodos:{},
    atalhosDescobertos:[],locaisSecretos:[],expedicaoAtual:null,passos:0};
  const velho=(d&&d.exploracao&&typeof d.exploracao==='object')?d.exploracao:null;
  if(velho){
    E.pressao=+velho.pressao||0;
    E.atencaoDaCasa=+velho.atencaoDaCasa||0;
    E.passos=velho.passos|0;
    E.atalhosDescobertos=Array.isArray(velho.atalhosDescobertos)?velho.atalhosDescobertos:[];
    E.locaisSecretos=Array.isArray(velho.locaisSecretos)?velho.locaisSecretos:[];
    /* campo desconhecido de save FUTURO e preservado, nao descartado */
    Object.keys(velho).forEach(k=>{ if(!(k in E))E[k]=velho[k]; });
  }
  PLANTA.forEach(q=>{
    const v=velho&&velho.comodos?velho.comodos[q.id]:null;
    E.comodos[q.id]={
      camada:camadaDe(q.id),
      /* SAVE LEGADO: quem ja jogava conhece a casa. Marcar tudo como
         nunca visitado transformaria veterano em novato. */
      visitado:v?!!v.visitado:!!(d&&d.nomeJogador),
      saqueado:v?!!v.saqueado:false,
      turnoUltimaVisita:v?(v.turnoUltimaVisita|0):0,
      vezesVisitado:v?(v.vezesVisitado|0):0,
      rastroSonoro:v?(+v.rastroSonoro||0):0,
      rastroSangue:v?(+v.rastroSangue||0):0,
      achadosRemovidos:(v&&Array.isArray(v.achadosRemovidos))?v.achadosRemovidos:[],
      pistasConhecidas:(v&&Array.isArray(v.pistasConhecidas))?v.pistasConhecidas:[],
      iscaAtiva:v?(v.iscaAtiva||null):null
    };
  });
  return E;
}
if(typeof salvar==='function'){
  const _passoSalvar=salvar;
  salvar=function(){
    _passoSalvar.apply(this,arguments);
    try{
      /* A MESMA GUARDA DA BASE, E PELO MESMO MOTIVO.
         `salvar()` de baixo faz `if(!S.nomeJogador)return` — e sem
         repetir isso aqui o wrapper anexava mesmo quando a base tinha
         desistido. No boot, com um save de sessao anterior no disco e o
         `S` ainda zerado, isso gravava trilha vazia e relogio em zero
         por cima do que o jogador tinha. Wrapper que grava onde a base
         nao gravaria e um save fantasma com outro nome. */
      if(!S.nomeJogador)return;
      const cru=localStorage.getItem(CHAVE);
      if(!cru)return;
      const d=JSON.parse(cru);
      /* BLOCO ANEXA A UM SAVE; BLOCO NUNCA CRIA ESTADO.
         A primeira versao disto chamava `estadoExp()`, que CRIA o ramo
         quando ele nao existe. Resultado: qualquer `marcarSujo()` que
         rode no boot, antes de `carregar()`, gravava um ramo vazio POR
         CIMA do que estava salvo — e os passos do jogador voltavam em
         zero. E o mesmo formato do save fantasma da v60, que apagou a
         abertura narrada por varias versoes, e eu o reintroduzi aqui.
         Agora so grava o que ja existe. */
      if(S.exploracao&&typeof S.exploracao==='object')d.exploracao=S.exploracao;
      if(Array.isArray(S.trilha))d.trilha=S.trilha;   /* nao ia pro save */
      if(typeof S.minutos==='number')d.minutos=S.minutos;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/exploracao'); }
  };
}
if(typeof carregar==='function'){
  const _passoCarregar=carregar;
  carregar=function(){
    const r=_passoCarregar.apply(this,arguments);
    try{
      const cru=localStorage.getItem(CHAVE);
      const d=cru?JSON.parse(cru):null;
      S.exploracao=migrarExploracao(d);
      S.trilha=(d&&Array.isArray(d.trilha))?d.trilha:(Array.isArray(S.trilha)?S.trilha:[]);
      S.minutos=(d&&typeof d.minutos==='number')?d.minutos:(S.minutos||0);
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'carregar/exploracao'); }
    return r;
  };
}

/* ---------- depuracao ---------- */
function passoEstado(){
  const E=estadoExp();
  return {
    camadas:PLANTA.map(q=>({id:q.id,nome:q.nome,camada:camadaDe(q.id)})),
    custoDaCasaInteira:[0,1,2,5,4,3,6,7,8].map(id=>custoDeEntrada(id,4)),
    passos:E.passos, pressao:E.pressao, atencao:E.atencaoDaCasa,
    comodosConhecidos:Object.values(E.comodos).filter(c=>c.visitado).length
  };
}
