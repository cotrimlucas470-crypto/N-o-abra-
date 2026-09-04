/* ============ §46 — TRATAMENTO E INCAPACITADO (Etapa 8 de 9) ============

   B5: nada de "usar kit -> 100%". Todo tratamento tem troca. E o ultimo
   item da tabela e o coracao do modulo:

     "Quem trata voce tem poder sobre voce."

   O jogo ja tinha a peca dificil pronta: `S.infiltrado`, a coisa que
   toma o lugar de alguem da casa. Curar-se com quem talvez nao seja
   quem parece ser e a aposta que o briefing pede — e ela ja existia
   desde o dia 5, so nao tinha sido ligada no tratamento.

   B7: incapacitado NUNCA e softlock. Sempre existe pelo menos uma acao,
   e um watchdog forca desfecho narrativo. Travar o jogador e bug; matar
   o jogador e design.
   ====================================================================== */

const TRAT_CFG={
  /* pressionar pano: para o sangramento e ocupa a mao */
  panoTurnos: 3,
  /* costurar: fecha, doi, e faz barulho involuntario */
  costuraRuido: 6,
  /* alcool: derruba infeccao, cheiro forte atrai o Inchado */
  alcoolAtencao: .12,
  /* descansar: custa a noite inteira */
  descansoHoras: 6,
  /* o NPC trata melhor — e voce fica exposto a ele */
  bonusDoCuidador: 2,
  /* incapacitado: turnos ate o watchdog forcar desfecho */
  watchdogTurnos: 8
};

/* ================= AS AÇÕES, CADA UMA COM PREÇO ================= */
const TRATAMENTOS=[
 {id:'pano',n:'Pressionar pano na ferida',
  precisa:m=>MALES[m.id]&&MALES[m.id].grav>=2,
  faz(m){
    m.sangrando=0;
    m.dias=Math.max(1,m.dias-1);
    S.maoOcupada=(S.maoOcupada||0)+TRAT_CFG.panoTurnos;
    return {t:'Você aperta e segura. Para de sangrar enquanto você segurar.',
      preco:'a mão fica ocupada por '+TRAT_CFG.panoTurnos+' turnos'};
  }},
 {id:'costura',n:'Costurar',
  precisa:m=>['corte','cortefundo','mordida'].indexOf(m.id)>=0,
  precisaLuz:true,
  faz(m){
    m.tratado=1; m.dias=Math.max(1,Math.round(m.dias*.45));
    if(typeof gastarRuido==='function')gastarRuido(TRAT_CFG.costuraRuido);
    if(typeof mexerSan==='function')mexerSan(-3);
    return {t:'Você fecha com linha, sem anestesia. O som que sai de você não é escolha.',
      preco:'dor alta, e a casa ouviu'};
  }},
 {id:'alcool',n:'Álcool na ferida',
  precisa:m=>m.id==='infeccao'||MALES[m.id]&&MALES[m.id].pior==='infeccao',
  faz(m){
    m.semPior=true; m.dias=Math.max(1,m.dias-2);
    try{ const E=estadoExp(); E.atencaoDaCasa=trava((E.atencaoDaCasa||0)+TRAT_CFG.alcoolAtencao,0,1); }catch(e){}
    if(typeof mexerSan==='function')mexerSan(-2);
    return {t:'Arde de um jeito que embaça a vista. A infecção não vai vingar.',
      preco:'o cheiro sobe, e alguma coisa gosta desse cheiro'};
  }},
 {id:'tala',n:'Talar',
  precisa:m=>['fratura','torcao'].indexOf(m.id)>=0,
  precisaMat:'tabua',
  faz(m){
    m.tratado=1; m.imobilizado=true; m.dias=Math.max(2,Math.round(m.dias*.6));
    if(typeof gastarRuido==='function')gastarRuido(2);
    return {t:'Duas tábuas e pano rasgado. Você volta a pisar, com cuidado.',
      preco:'gastou material, e o esforço fez barulho'};
  }},
 {id:'descanso',n:'Deitar e não fazer mais nada hoje',
  precisa:()=>true,
  faz(m){
    if(typeof gastarHoras==='function')gastarHoras(TRAT_CFG.descansoHoras);
    (typeof saude==='function'?saude():[]).forEach(x=>{ x.dias=Math.max(0,x.dias-1); });
    return {t:'Você deita e o teto para de girar depois de um tempo.',
      preco:'o dia acabou. A casa não descansou junto'};
  }}
];

function tratamentosPara(m){
  return TRATAMENTOS.filter(t=>{
    try{
      if(t.precisa&&!t.precisa(m))return false;
      if(t.precisaLuz&&!(typeof comodoAceso==='function'
        &&comodoAceso(cena&&cena.casa?cena.casa.voce:4)))return false;
      if(t.precisaMat&&typeof temMat==='function'&&!temMat(t.precisaMat))return false;
      return true;
    }catch(e){ return false; }
  });
}
/* ATENCAO AO NOME: nao e `tratar()`. Essa JA EXISTE em
   index.html:13957 e e o tratamento por REMEDIO — `tratar(m,k,alvo,nome)`,
   que confere se o remedio `k` serve pro mal `m`. Sombrear ela quebraria
   a farmacia inteira em silencio. Aqui e `aplicarTratamento`, e as duas
   convivem: a de la e "qual remedio", a daqui e "qual gesto, e a que
   preco". Quarta vez que a guarda de colisao salva uma etapa. */
function aplicarTratamento(idTrat,mal){
  const t=TRATAMENTOS.find(x=>x.id===idTrat);
  if(!t||!mal)return null;
  const r=t.faz(mal);
  if(typeof diz==='function'){
    diz(r.t,'bom');
    diz('Custou: '+r.preco+'.','fraco');
  }
  if(typeof marcarSujo==='function')marcarSujo();
  return r;
}

/* ================= QUEM TRATA VOCÊ TEM PODER SOBRE VOCÊ =================
   O `alvo` do tratamento e uma pessoa do abrigo. Se ela for a coisa,
   o tratamento vira sabotagem — e o tell existe: a mao fria, o gesto
   errado, o silencio na hora errada. Quem esta lendo, le. */
const TELL_DO_CUIDADOR=[
  'A mão dela está fria de um jeito que mão de gente não fica.',
  'Ela aperta o curativo antes de limpar. A ordem está errada.',
  'Ela não pergunta se dói. Ninguém trata ferida sem perguntar se dói.',
  'Ela olha pra ferida como quem lê, não como quem cuida.'
];
function cuidadorDisponivel(){
  if(typeof quem!=='function')return null;
  return quem('enfermagem')||((S.abrigo&&S.abrigo.length)?S.abrigo[0]:null);
}
function tratarComNPC(mal,p){
  const cuidador=p||cuidadorDisponivel();
  if(!cuidador||!mal)return null;
  const falso=(S.infiltrado&&S.infiltrado.n===cuidador.n)||!!cuidador.falso;
  /* o tell sai ANTES do resultado: o jogador tem chance de recuar */
  if(falso&&typeof diz==='function')diz(sortear(TELL_DO_CUIDADOR),'perigo');
  if(falso){
    mal.dias=mal.dias+3;
    mal.tratado=0;
    mal.sabotado=true;
    if(typeof diz==='function')
      diz(`${cuidador.n} enfaixa com capricho. Dois dias depois está pior do que estava.`,'perigo');
    if(typeof mexerSan==='function')mexerSan(-4);
    return {ok:false,sabotado:true,por:cuidador.n};
  }
  mal.tratado=1;
  mal.dias=Math.max(1,mal.dias-TRAT_CFG.bonusDoCuidador);
  if(typeof diz==='function')
    diz(`${cuidador.n} trata melhor do que você trataria. E fica sabendo exatamente onde você está quebrado.`,'bom');
  return {ok:true,por:cuidador.n};
}

/* ================= B7 · INCAPACITADO, NUNCA SOFTLOCK ================= */
function estadoIncap(){
  if(!S.incap||typeof S.incap!=='object')
    S.incap={ativo:false,turnos:0,desfecho:null,chamou:0,arrastou:0};
  return S.incap;
}
function grave(){
  try{
    const c=custoSaude();
    return (c.forca>=.55&&c.fuga>=.5)||feridoDerivado()>=9;
  }catch(e){ return false; }
}
function entrarIncapacitado(){
  const I=estadoIncap();
  if(I.ativo)return false;
  I.ativo=true; I.turnos=0; I.desfecho=null;
  if(typeof diz==='function'){
    diz('Você senta porque as pernas resolveram por você.','perigo');
    diz('Dá pra chamar. Dá pra arrastar. Dá pra esperar. Não dá pra levantar.','sist');
  }
  if(typeof marcarSujo==='function')marcarSujo();
  return true;
}
/* SEMPRE ha acao. Esta lista nunca pode voltar vazia — e o teste exige. */
function acoesIncapacitado(){
  const l=[{id:'chamar',n:'Chamar por alguém'},
           {id:'arrastar',n:'Se arrastar até a porta'},
           {id:'esperar',n:'Ficar quieto e esperar'}];
  if(typeof saude==='function'&&saude().length)l.push({id:'apertar',n:'Apertar a ferida com o que tiver'});
  return l;
}
function passoIncapacitado(acao){
  const I=estadoIncap();
  if(!I.ativo)return null;
  I.turnos++;
  let t=null;
  if(acao==='chamar'){
    I.chamou++;
    if(typeof gastarRuido==='function')gastarRuido(8);
    const p=(S.abrigo&&S.abrigo.length)?sortear(S.abrigo):null;
    if(p&&chance(.45)){ I.ativo=false; I.desfecho='socorrido';
      t=`${p.n} chega e te arrasta pra dentro. Não pergunta nada.`; }
    else t='Você chama. A casa devolve a sua voz e mais nada.';
  }else if(acao==='arrastar'){
    I.arrastou++;
    if(typeof gastarMinutos==='function')gastarMinutos(18);
    if(I.arrastou>=3){ I.ativo=false; I.desfecho='chegou';
      t='Você chega no batente e passa. Devagar, mas passa.'; }
    else t='Você avança o que dá pra avançar. Não é muito.';
  }else if(acao==='apertar'){
    const f=(typeof saude==='function')?saude().filter(m=>MALES[m.id]&&MALES[m.id].tipo==='ferida'):[];
    if(f.length){ f[0].sangrando=0; f[0].dias=Math.max(1,f[0].dias-1); }
    t='Você aperta com a mão e o pano que tem. Segura por enquanto.';
  }else{
    if(typeof gastarMinutos==='function')gastarMinutos(12);
    t='Você fica quieto. O escuro anda um pouco.';
  }
  /* WATCHDOG: sem saida em N turnos, o sistema FORCA um desfecho.
     Nunca deixa o jogador parado sem fim. */
  if(I.ativo&&I.turnos>=TRAT_CFG.watchdogTurnos){
    I.ativo=false;
    I.desfecho=(S.abrigo&&S.abrigo.length)?'encontrado':'amanheceu';
    t=(I.desfecho==='encontrado')
      ? 'Alguém da casa te encontra de manhã. Você não lembra de ter dormido.'
      : 'Amanhece. Você ainda está aqui, e isso conta como sorte.';
    if(typeof gastarHoras==='function')gastarHoras(4);
  }
  if(typeof diz==='function'&&t)diz(t,I.desfecho?'bom':'narr');
  if(typeof marcarSujo==='function')marcarSujo();
  return {texto:t,ativo:I.ativo,desfecho:I.desfecho,turnos:I.turnos};
}
/* entra sozinho quando o corpo chega la */
if(typeof passarSaude==='function'){
  const _tratPS=passarSaude;
  passarSaude=function(){
    const r=_tratPS.apply(this,arguments);
    try{ if(grave())entrarIncapacitado(); }catch(e){}
    return r;
  };
}

/* ---------- persistencia ---------- */
if(typeof salvar==='function'){
  const _tratSalvar=salvar;
  salvar=function(){
    _tratSalvar.apply(this,arguments);
    try{
      if(!S.nomeJogador)return;
      const cru=localStorage.getItem(CHAVE); if(!cru)return;
      const d=JSON.parse(cru);
      if(S.incap&&typeof S.incap==='object')d.incap=S.incap;
      if(typeof S.maoOcupada==='number')d.maoOcupada=S.maoOcupada;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/incap'); }
  };
}
function tratamentoEstado(){
  const I=estadoIncap();
  return {tratamentos:TRATAMENTOS.length,
    incapacitado:I.ativo, turnos:I.turnos, desfecho:I.desfecho,
    acoes:acoesIncapacitado().length, watchdog:TRAT_CFG.watchdogTurnos};
}
