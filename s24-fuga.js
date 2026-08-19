/* ============ §24 — FUGIR DEIXOU DE SER DERROTA ============

   O QUE ESTAVA ERRADO
   -------------------
   `mover()` terminava assim:

       if(PLANTA[dest].saida) return escapou(I);

   e `escapou()` terminava em `fim('fuga')`. Ou seja: andar pro QUINTAL
   durante uma invasão ACABAVA A PARTIDA. A decisão mais natural que
   existe — sair de casa quando entra alguma coisa — era punida com fim
   de jogo. Não é dificuldade, é o jogo dizendo que você jogou errado
   por ter feito a única coisa sensata.

   O QUE MUDA
   ----------
   Sair vira um ESTADO, não um final. A anomalia passa a ter um ciclo
   com fases legíveis, e a fuga vira leitura em vez de sorte:

     INVADINDO  → ela entra; você sai ou se esconde
     VASCULHANDO→ ela revira a casa por N turnos
     SAINDO     → ela vai embora PELA FRENTE ou PELOS FUNDOS
     SEGURO     → janela pra você voltar
     RESET      → a casa volta, com o que ela fez

   A REGRA QUE FAZ ISSO SER JOGO
   -----------------------------
   Se ela sai pelos FUNDOS, o quintal fica perigoso. Se sai pela FRENTE,
   a rua fica perigosa. Você ouve para onde ela está indo e escolhe onde
   esperar. Errar não mata de imediato: dá um aviso, e só o segundo
   descuido cobra.

   O QUE FUGIR CUSTA
   -----------------
   Nunca a run. Ela leva coisa, arrebenta o que estava reforçado, e
   ficar muito tempo fora cobra frio e fome. É caro. Não é o fim.
   ======================================================================= */

/* ================= CONFIGURAÇÃO =================
   Todo tempo, chance e custo mora aqui. Nenhum número solto no meio da
   lógica — mexer no equilíbrio do sistema é mexer nesta tabela. */
const FUGA_CFG={
  /* --- quanto tempo ela passa em cada fase, em TURNOS do jogador --- */
  vasculhar:      {min:3, max:6},   /* turnos revirando a casa       */
  saindo:         {turnos:1},       /* o turno em que ela vai embora */
  seguro:         {turnos:3},       /* janela pra voltar sem susto   */

  /* --- por onde ela sai --- */
  chanceSairPelosFundos: .5,        /* senão, sai pela frente        */

  /* --- risco de estar na área errada, por turno --- */
  riscoAreaErrada:  .34,            /* ela está saindo por onde você está */
  riscoAreaCerta:   .04,            /* mesmo o lado certo não é garantido */
  riscoRuaExtra:    .06,            /* a rua tem perigo próprio          */
  avisosAntesDoDano: 1,             /* o primeiro erro é aviso, não dano */

  /* --- esconder melhor: quanto derruba o risco, e o que custa --- */
  esconderCorta:  .62,              /* multiplica o risco do turno       */
  esconderTurnos: 1,                /* e gasta um turno                  */

  /* --- o que a anomalia faz com a casa enquanto você não está --- */
  roubaPorTurno:    .22,            /* chance de levar algo por turno    */
  quebraPorTurno:   .16,            /* chance de arrebentar reforço      */
  danoPortaPorTurno: 6,             /* dano fixo na porta por turno      */

  /* --- o custo de ficar fora tempo demais --- */
  turnosAteFrio:  6,                /* depois disso começa a cobrar      */
  sanPorTurnoFrio: 2,               /* sanidade por turno passando disso */
  comidaAoVoltar:  1,               /* fome de quem passou a noite fora  */

  /* --- quem ficou escondido dentro de casa --- */
  chanceAcharEscondido: .18         /* por turno de vasculho, por pessoa */
};

const FASES=['INVADINDO','VASCULHANDO','SAINDO','SEGURO','RESET'];
const FRENTE=7, FUNDOS=8;           /* ENTRADA e QUINTAL, na PLANTA */

/* ================= ESTADO ================= */
function fuga(){
  if(!S.fuga||typeof S.fuga!=='object')S.fuga=null;
  return S.fuga;
}
function abrirFuga(I,onde){
  const porFundos=chance(FUGA_CFG.chanceSairPelosFundos);
  const v=FUGA_CFG.vasculhar;
  S.fuga={
    fase:'VASCULHANDO',
    turno:0,
    restam:v.min+Math.floor(Math.random()*(v.max-v.min+1)),
    saiPor: porFundos?'fundos':'frente',
    onde: onde||'quintal',          /* onde VOCÊ está */
    avisos:0,
    levou:[], quebrou:[],
    comodoDela:(cena.casa&&cena.casa.monstro)||4,
    escondidos:(I&&I.escondidos)||[],
    acompanha:(I&&I.acompanha)||[],
    bicho:(I&&I.bicho)?{id:I.bicho.id,n:I.bicho.n}:null
  };
  if(typeof marcarSujo==='function')marcarSujo();
  return S.fuga;
}
function fecharFuga(){ S.fuga=null; if(typeof marcarSujo==='function')marcarSujo(); }

/* ================= O QUE ELA FAZ LÁ DENTRO ================= */
function anomaliaVasculha(){
  const F=fuga(); if(!F)return [];
  const conta=[];
  /* anda de cômodo */
  F.comodoDela=sortear(vizinhos(F.comodoDela).concat([F.comodoDela]));
  /* leva coisa */
  if(chance(FUGA_CFG.roubaPorTurno)){
    const alvo=roubarAlgo();
    if(alvo){F.levou.push(alvo);conta.push('levou '+alvo);}
  }
  /* arrebenta o que estava reforçado */
  if(chance(FUGA_CFG.quebraPorTurno)){
    const q=quebrarAlgo();
    if(q){F.quebrou.push(q);conta.push('arrebentou '+q);}
  }
  if(S.porta&&typeof S.porta==='object'&&typeof danificarPorta==='function'){
    try{ danificarPorta(FUGA_CFG.danoPortaPorTurno); }catch(e){}
  }
  /* quem ficou escondido dentro corre risco */
  (F.escondidos||[]).slice().forEach(p=>{
    if(!chance(FUGA_CFG.chanceAcharEscondido))return;
    F.escondidos=F.escondidos.filter(x=>x!==p);
    if(typeof morreuAlguem==='function')
      morreuAlguem(p,`estava escondido na casa quando você saiu, na noite ${S.dia}`);
    conta.push('achou '+(p.n||'alguém'));
  });
  return conta;
}
/* leva um recurso ou um item — o que existir */
function roubarAlgo(){
  const op=[];
  if(S.comida>0)op.push('comida');
  if(S.diesel>3)op.push('diesel');
  if(S.remedio>0)op.push('remedio');
  if(typeof mochila==='function'&&(mochila().itens||[]).length)op.push('item');
  if(!op.length)return null;
  const k=sortear(op);
  if(k==='comida'){const q=Math.min(S.comida,1+Math.floor(Math.random()*2));S.comida-=q;return q+' de comida';}
  if(k==='diesel'){const q=Math.min(S.diesel,2+Math.floor(Math.random()*4));S.diesel-=q;return q+' de diesel';}
  if(k==='remedio'){S.remedio--;return 'um remédio';}
  const it=sortear(mochila().itens);
  if(!it)return null;
  if(typeof largar==='function')largar(it.id,1);
  return (typeof CATALOGO!=='undefined'&&CATALOGO[it.id]?CATALOGO[it.id].n.toLowerCase():it.id);
}
function quebrarAlgo(){
  if(S.muro>0){S.muro--;return 'um trecho do muro';}
  if(S.cisterna>0){S.cisterna--;return 'uma calha da cisterna';}
  if(S.porta&&S.porta.reforco>0){S.porta.reforco--;return 'uma tábua da porta';}
  if(S.armadilha){S.armadilha=0;return 'a armadilha do quintal';}
  return null;
}

/* ================= AVANÇAR O CICLO ================= */
function avancarFuga(){
  const F=fuga(); if(!F)return null;
  F.turno++;
  const eventos=[];
  if(F.fase==='VASCULHANDO'){
    eventos.push(...anomaliaVasculha());
    F.restam--;
    if(F.restam<=0){ F.fase='SAINDO'; F.restam=FUGA_CFG.saindo.turnos; }
  }else if(F.fase==='SAINDO'){
    F.restam--;
    if(F.restam<=0){ F.fase='SEGURO'; F.restam=FUGA_CFG.seguro.turnos; }
  }else if(F.fase==='SEGURO'){
    F.restam--;
    if(F.restam<=0)F.fase='RESET';
  }
  if(typeof marcarSujo==='function')marcarSujo();
  return eventos;
}

/* o risco de estar onde você está, neste turno */
function riscoDaArea(){
  const F=fuga(); if(!F)return 0;
  /* ela só é perigosa lá fora no turno em que está saindo */
  if(F.fase!=='SAINDO')
    return F.onde==='rua'?FUGA_CFG.riscoRuaExtra:0;
  const errada=(F.saiPor==='fundos'&&F.onde==='quintal')
             ||(F.saiPor==='frente'&&F.onde==='rua');
  let r=errada?FUGA_CFG.riscoAreaErrada:FUGA_CFG.riscoAreaCerta;
  if(F.onde==='rua')r+=FUGA_CFG.riscoRuaExtra;
  if(F.escondidoMelhor)r*=FUGA_CFG.esconderCorta;
  return trava(r,0,.9);
}

/* ================= A TELA DE FORA ================= */
function textoDaFase(){
  const F=fuga(); if(!F)return '';
  const nome=PLANTA[F.comodoDela]?PLANTA[F.comodoDela].nome.toLowerCase():'algum cômodo';
  if(F.fase==='VASCULHANDO')
    return `Dentro da casa alguma coisa está revirando ${nome}. Não tem pressa nenhuma.`;
  if(F.fase==='SAINDO')
    return F.saiPor==='fundos'
      ? 'O portão dos fundos range. Ela está saindo POR TRÁS.'
      : 'A porta da frente bate contra a parede. Ela está saindo PELA FRENTE.';
  if(F.fase==='SEGURO')
    return 'A casa está quieta. Dá pra ouvir a geladeira parada e mais nada.';
  return 'Acabou.';
}

async function telaFora(){
  const F=fuga();
  if(!F)return;
  if(F.fase==='RESET')return voltarPraCasaDepoisDaFuga(true);
  limpar(); AC.innerHTML='';
  cena.modo='casafora';
  if(typeof dimensionar==='function')dimensionar();
  cap((F.onde==='quintal'?'QUINTAL':'RUA')+' · '+(typeof horaTexto==='function'?horaTexto():''));
  diz(F.onde==='quintal'
    ? 'Você está atrás da casa, agachado atrás da caixa d\'água. Daqui dá pra ver a janela da cozinha.'
    : 'Você está na calçada do outro lado, atrás de um carro. A casa inteira cabe no seu olho daqui.','narr');
  diz(textoDaFase(), F.fase==='SAINDO'?'perigo':F.fase==='SEGURO'?'bom':'sist');

  /* aviso diegético: onde ela está, pelo som */
  if(F.fase==='VASCULHANDO'&&typeof passo==='function'){
    try{ passo(.7, F.comodoDela%3===0?-.6:F.comodoDela%3===1?0:.6); }catch(e){}
  }
  if(F.fase==='SAINDO'){
    try{ if(typeof arranhao==='function')arranhao(F.saiPor==='fundos'?.7:-.7,1.1); }catch(e){}
    diz(F.saiPor==='fundos'
      ? 'Quem estiver no quintal vai ficar entre ela e o muro.'
      : 'Quem estiver na rua vai ficar no caminho dela.','alerta');
  }
  if(F.turno>=FUGA_CFG.turnosAteFrio)
    diz('O frio já passou da roupa. Você não aguenta a noite inteira aqui fora.','alerta');

  const perigo=riscoDaArea();
  if(perigo>=.25)diz('Você está do lado errado. Sai daí.','perigo');

  /* ---- ações ---- */
  botao('Esperar e escutar',()=>turnoFora('esperar'),
    {custo:'passa um turno'});
  botao('Se enfiar mais fundo no esconderijo',()=>turnoFora('esconder'),
    {custo:'menos risco, mesmo turno'});
  if(F.onde==='quintal')
    botao('Pular o muro e ir pra rua',()=>turnoFora('ir-rua'),
      {custo:'mais longe dela, mais exposto'});
  else
    botao('Voltar pro quintal',()=>turnoFora('ir-quintal'),
      {custo:'mais perto de casa'});
  botao('Espiar a casa por uma fresta',()=>turnoFora('espiar'),
    {custo:'informação, e um turno'});

  const podeVoltar=(F.fase==='SEGURO'||F.fase==='RESET');
  botao(podeVoltar?'Voltar pra dentro de casa':'Entrar mesmo assim',
    ()=>turnoFora('entrar'),
    podeVoltar?{cls:'chave',custo:'ela foi embora'}
              :{custo:'ela ainda está lá dentro'});
}

async function turnoFora(acao){
  const F=fuga(); if(!F)return;
  AC.innerHTML='';
  F.escondidoMelhor=false;

  if(acao==='ir-rua'){ F.onde='rua'; diz('Você passa por cima do muro e atravessa a rua sem correr.','narr'); }
  if(acao==='ir-quintal'){ F.onde='quintal'; diz('Você volta pro quintal, rente ao muro.','narr'); }
  if(acao==='esconder'){ F.escondidoMelhor=true; diz('Você se encolhe até caber num vão que não devia caber.','narr'); }
  if(acao==='espiar'){
    const nome=PLANTA[F.comodoDela]?PLANTA[F.comodoDela].nome.toLowerCase():'algum cômodo';
    diz(`Pela fresta dá pra ver uma sombra atravessando ${nome}. Ela é mais alta do que a porta.`,'perigo');
    if(F.fase==='VASCULHANDO')
      diz(`Ainda vai demorar. Dá pra contar uns ${F.restam} minutos assim.`,'sist');
    if(F.levou.length)
      diz('Ela está levando o que acha: '+F.levou.slice(-2).join(', ')+'.','alerta');
  }
  if(acao==='entrar'){
    if(F.fase==='SEGURO'||F.fase==='RESET')return voltarPraCasaDepoisDaFuga(true);
    return entrarComElaDentro();
  }

  await pausa(900);

  /* o risco da área é rolado ANTES de avançar a fase, porque o perigo é
     do turno em que ela sai — não do turno seguinte */
  const r=riscoDaArea();
  if(r>0&&chance(r)){
    F.avisos++;
    if(F.avisos<=FUGA_CFG.avisosAntesDoDano){
      /* nunca machucar sem ter avisado: o primeiro erro é um susto */
      try{ if(typeof rugido==='function')rugido(.8,F.saiPor==='fundos'?.7:-.7); }catch(e){}
      diz('Ela passa a metros de você e para. Cheira o ar. Você não respira. Ela segue.','perigo');
      await pausa(1600);
    }else{
      diz('Dessa vez ela te vê.','perigo');
      await pausa(1200);
      if(typeof ferirPor==='function')ferirPor('bicho');
      if(typeof mexerSan==='function')mexerSan(-6,'foi vista na fuga');
      S.ruido=trava((S.ruido||0)+10,0,100);
      /* e você é obrigado a se afastar */
      F.onde=(F.onde==='quintal')?'rua':'quintal';
      diz('Você corre pro outro lado sem olhar pra trás.','perigo');
      await pausa(1200);
    }
  }

  const eventos=avancarFuga();
  if(eventos&&eventos.length)
    diz('Lá dentro: '+eventos.join(', ')+'.','alerta');

  /* custo de ficar fora demais */
  if(F.turno>FUGA_CFG.turnosAteFrio&&typeof mexerSan==='function')
    mexerSan(-FUGA_CFG.sanPorTurnoFrio,'noite inteira fora de casa');

  if(F.fase==='RESET')return voltarPraCasaDepoisDaFuga(true);
  return telaFora();
}

/* entrar enquanto ela ainda está lá: é burrice, mas é SUA burrice, e o
   jogo avisa antes em vez de simplesmente matar */
async function entrarComElaDentro(){
  const F=fuga(); if(!F)return;
  diz('Você abre a porta com ela ainda lá dentro.','perigo');
  await pausa(1400);
  if(typeof rugido==='function')try{rugido(1,0);}catch(e){}
  diz('Ela para de revirar. A casa inteira fica quieta ao mesmo tempo.','perigo');
  await pausa(1600);
  /* volta pra invasão de verdade, com o fôlego que sobrou — não é fim */
  fecharFuga();
  cena.modo='casa';
  cena.casa=cena.casa||{voce:FRENTE,monstro:4,visivel:false};
  cena.casa.voce=FRENTE;
  if(typeof dimensionar==='function')dimensionar();
  if(typeof invasao==='function')return invasao(1);
  if(typeof menuComodo==='function')return menuComodo(FRENTE);
}

/* ================= VOLTAR PRA CASA ================= */
async function voltarPraCasaDepoisDaFuga(){
  const F=fuga();
  limpar(); AC.innerHTML='';
  cena.modo='casa';
  cena.casa=cena.casa||{voce:FRENTE,monstro:null,visivel:false};
  cena.casa.voce=FRENTE; cena.casa.monstro=null; cena.casa.visivel=false;
  if(typeof dimensionar==='function')dimensionar();
  cap('DE VOLTA');
  diz('A porta está aberta. Você entra devagar, um cômodo de cada vez.','narr');
  await pausa(1400);

  if(F){
    if(F.levou.length){
      diz('Faltam coisas: '+F.levou.join(', ')+'.','perigo');
      await pausa(1100);
    }else{
      diz('Não levaram nada. Isso é sorte, não é regra.','bom');
      await pausa(900);
    }
    if(F.quebrou.length){
      diz('E arrebentaram: '+F.quebrou.join(', ')+'. Vai ter que consertar.','alerta');
      await pausa(1100);
    }
    /* quem ficou escondido e sobreviveu volta pro abrigo */
    const vivos=(F.escondidos||[]).concat(F.acompanha||[]);
    if(vivos.length){
      diz(`${vivos.length===1?'Uma pessoa sai':vivos.length+' pessoas saem'} de onde estava. Ninguém fala nada por um tempo.`,'narr');
      await pausa(1000);
    }
    if(typeof mexerSan==='function')mexerSan(-3,'passou a noite fora de casa');
    if(S.comida>0)S.comida=Math.max(0,S.comida-FUGA_CFG.comidaAoVoltar);
    if(typeof mexerMoral==='function')mexerMoral(-4);
  }
  fecharFuga();
  if(typeof salvar==='function')try{salvar();}catch(e){}
  if(typeof atualizarPainel==='function')atualizarPainel();
  await pausa(900);
  diz('Você fugiu, e a casa ainda está de pé. Isso conta.','sist');
  botao('Continuar',()=>{
    if(typeof menuComodo==='function')menuComodo(FRENTE);
  },{cls:'chave'});
}

/* ================= OS GANCHOS ================= */
/* `escapou` era o fim da partida. Agora é a porta de entrada do estado
   novo. Trocada inteira — quem chama (`mover` quando o cômodo tem
   `saida`, e o botão "Sair pela rua e dar a volta") não muda em nada. */
if(typeof escapou==='function'){
  escapou=async function(I){
    AC.innerHTML='';
    if(typeof desligarGerador==='function')try{desligarGerador();}catch(e){}
    const onde=(cena.casa&&cena.casa.voce===FUNDOS)?'quintal':'rua';
    abrirFuga(I,onde);
    diz(onde==='quintal'
      ? 'Você pula o muro dos fundos e o mato molhado te engole.'
      : 'Você sai pela frente e atravessa a rua agachado.','bom');
    await pausa(1400);
    diz('Não acabou. Ela ainda está lá dentro, e uma hora ela sai.','sist');
    await pausa(1200);
    return telaFora();
  };
}

/* se o jogo for carregado com uma fuga em curso, ele retoma nela em vez
   de largar o jogador numa casa que não é a dele */
setTimeout(()=>{
  try{
    if(!fuga())return;
    if(fuga().fase==='RESET')return voltarPraCasaDepoisDaFuga(true);
    diz('Você ainda está do lado de fora.','sist');
    telaFora();
  }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'retomarFuga'); }
},2800);

/* ---------- persistência ---------- */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      const d=JSON.parse(localStorage.getItem(CHAVE)||'{}');
      d.fuga=S.fuga||null;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/fuga'); }
  };
}
/* Save antigo não tem `fuga`, e a ausência é o estado certo: ninguém
   estava do lado de fora. Nada a converter. */
if(S.fuga===undefined)S.fuga=null;

function fugaEstado(){
  const F=fuga();
  return F?{fase:F.fase,turno:F.turno,restam:F.restam,saiPor:F.saiPor,
    onde:F.onde,avisos:F.avisos,levou:F.levou.slice(),quebrou:F.quebrou.slice(),
    risco:+riscoDaArea().toFixed(3)}:null;
}
