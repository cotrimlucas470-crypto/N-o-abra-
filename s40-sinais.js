/* ============ §40 — TELLS COMO CONTRATO (Etapa 2 de 9) ============

   A auditoria achou 14 sinais ja escritos no jogo: 8 em `AMEACAS.aviso`
   (as ameacas da rua) e 6 em `REGRA.dica` (as criaturas da casa). Todos
   bons, todos escritos a mao — e todos TEXTO SOLTO. Nenhum deles tem
   fase, canal, antecedencia nem identidade. Ninguem consegue perguntar
   "houve sinal antes disto?", e por isso a assercao central do briefing
   — `tell` antes de dano — nao era verificavel.

   Esta etapa nao inventa prosa nova por gosto: ela da ESTRUTURA ao que
   ja existia e completa as fases que faltavam, seguindo a Tabela de
   Sinais. Nada de dano novo entra aqui. Isto e o contrato que as etapas
   seguintes vao ter de respeitar.

   DUAS DECISOES DA TABELA, APLICADAS
   ----------------------------------
   S1 · O MAGRO NAO FOI INVERTIDO. A tabela pedia "apagar a luz" como
        contra-jogo. No jogo entregue a luz e PROTECAO — `REGRA.magro`
        tem `evita(id){ return luzLigadaEm(id) }` e a dica que o jogador
        ja leu diz "ele para na porta de comodo aceso e nao entra".
        Apagar hoje ABRE o comodo pra ele. Os sinais dele entram inteiros;
        o contra-jogo e que fica sendo o do jogo.
   S2 · O CORO TEM DUAS BOCAS, nao tres. `BICHOS.coro` tem `dois:true` e
        a dica ensina "as duas metades". A contagem cai de 2 pra 1.
   ====================================================================== */

/* ATENCAO AO NOME: a tabela nao se chama SINAIS porque `SINAIS` JA
   EXISTE em index.html:17685 — e o cheiro de cada lugar da expedicao
   ("cheiro de giz e amonia", "o ar e doce demais pra um lugar desse").
   Conceito diferente, nome igual. Num escopo global de 1458 nomes isso
   nao daria erro nenhum: o segundo apagaria o primeiro em silencio e as
   expedicoes perderiam o cheiro. A guarda do montar.js pegou na hora, e
   e a segunda vez que ela salva uma etapa (a primeira foi ANCORAS, no
   §38). A tabela aqui e TELLS, que e a palavra do proprio briefing. */
const SIN_CFG={
  /* quantos sinais o anel guarda. Precisa cobrir uma invasao inteira
     pra `foiEmitido` conseguir olhar pra tras. */
  memoria: 40,
  /* janela padrao, em turnos, pra `foiEmitido` aceitar um sinal como
     "aviso deste dano" */
  janela: 6,
  /* piso de justica: antecedencia de iminencia NUNCA abaixo disto,
     qualquer que seja a sanidade. E a trava que separa horror de
     punicao. */
  pisoIminencia: 2,
  /* no maximo um sinal verdadeiro por turno, pra nao virar chuvisco */
  porTurno: 1
};

/* ================= A TABELA =================
   `antecedencia` nao e enfeite: ela vira DISTANCIA DE DISPARO. Um sinal
   de antecedencia 6 comeca a aparecer a 3 comodos; um de antecedencia 2,
   a 1 comodo. Sanidade baixa encurta a antecedencia, entao o aviso chega
   mais perto — e isso o jogador sente sem ler ficha nenhuma.

   `inconsistencia` e obrigatoria em todo sinal falsificavel: e por ela
   que a isca da casa pode ser lida. Sinal forjado sem inconsistencia e
   mentira cega, e mentira cega e proibida. */
const TELLS=[
 /* ---------------- MAGRO — o dos corredores ---------------- */
 {id:'magro_estalo',criatura:'magro',canal:'audio',fase:'aproximacao',antecedencia:4,
  t:'Estalos secos, espaçados, sempre em número ímpar. Três. Depois cinco.',
  degradacao:'ambiguar',ambiguo:'A casa assentando. É isso que você decide que é.',
  falsificavel:true,inconsistencia:'estalo sem poeira caindo do vão'},
 {id:'magro_sombra',criatura:'magro',canal:'visual',fase:'aproximacao',antecedencia:3,
  t:'Uma sombra vertical na parede está mais comprida do que a luz permite.',
  degradacao:'atenuar',falsificavel:true,inconsistencia:'sombra sem coisa que a faça'},
 {id:'magro_ar',criatura:'magro',canal:'tatil',fase:'iminencia',antecedencia:2,
  t:'Vem ar frio de um corredor que não tem janela.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},
 {id:'magro_vao',criatura:'magro',canal:'visual',fase:'contato',antecedencia:0,
  t:'Ele já está enquadrado no vão. Olhar de volta é o que ele estava esperando.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},

 /* ---------------- RASTEJANTE — o de baixo do piso ---------------- */
 {id:'rastejante_arranhado',criatura:'rastejante',canal:'audio',fase:'aproximacao',antecedencia:5,
  t:'Arranhado embaixo do assoalho, acompanhando o caminho que você fez faz pouco.',
  degradacao:'atenuar',falsificavel:true,inconsistencia:'arranhado num cômodo onde você não pisou'},
 {id:'rastejante_terra',criatura:'rastejante',canal:'olfato',fase:'aproximacao',antecedencia:4,
  t:'Cheiro de terra molhada num cômodo seco.',
  degradacao:'ambiguar',ambiguo:'Cheiro de terra. Ou de outra coisa. Você não separa mais os dois.',
  falsificavel:true,inconsistencia:'terra molhada sem marca de arrasto'},
 {id:'rastejante_poeira',criatura:'rastejante',canal:'visual',fase:'iminencia',antecedencia:2,
  t:'A poeira do chão se desloca em linha reta, contra o ar.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},
 {id:'rastejante_tornozelo',criatura:'rastejante',canal:'tatil',fase:'contato',antecedencia:0,
  t:'Alguma coisa fecha no seu tornozelo e puxa.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},

 /* ---------------- CORO — duas bocas (S2) ---------------- */
 {id:'coro_vozes',criatura:'coro',canal:'audio',fase:'aproximacao',antecedencia:4,
  t:'Duas vozes na mesma sílaba, fora de compasso por meio segundo.',
  degradacao:'ambiguar',ambiguo:'Uma voz com eco. Deve ser uma voz com eco.',
  falsificavel:true,inconsistencia:'duas vozes de um cômodo de porta fechada'},
 {id:'coro_contagem',criatura:'coro',canal:'audio',fase:'aproximacao',antecedencia:3,
  t:'A contagem caiu: eram duas, agora é uma. A que sumiu está andando.',
  degradacao:'falsificar',falsificavel:true,inconsistencia:'a contagem não fecha duas vezes seguidas'},
 {id:'coro_silencio',criatura:'coro',canal:'ausencia',fase:'iminencia',antecedencia:2,
  t:'Um lado do cômodo ficou sem som nenhum. Só um lado.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},
 {id:'coro_cerco',criatura:'coro',canal:'visual',fase:'contato',antecedencia:0,
  t:'As duas chegam por vãos diferentes, ao mesmo tempo.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},

 /* ---------------- IMITADOR — o que copia ---------------- */
 {id:'imitador_eco',criatura:'imitador',canal:'audio',fase:'aproximacao',antecedencia:4,
  t:'Um som que foi você que fez, hoje, repetido com atraso.',
  degradacao:'atenuar',falsificavel:true,inconsistencia:'o atraso encurta a cada repetição'},
 {id:'imitador_voz',criatura:'imitador',canal:'audio',fase:'aproximacao',antecedencia:3,
  t:null,   /* montada em tempo de emissao: usa quem esta na sua casa */
  monta:()=>{
    const p=(S.abrigo||[])[0];
    return p?`${p.n} te chama de um cômodo onde ${p.n} não está.`
            :'Alguém te chama pelo nome de dentro da casa.';},
  degradacao:'falsificar',falsificavel:true,inconsistencia:'a pessoa real não se moveu de onde estava'},
 {id:'imitador_postura',criatura:'imitador',canal:'visual',fase:'iminencia',antecedencia:2,
  t:'Ela não piscou. Entre uma frase e outra, não mudou nada de posição.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},
 {id:'imitador_resposta',criatura:'imitador',canal:'ausencia',fase:'contato',antecedencia:0,
  t:'Você responde. É só isso que ele precisava pra saber onde você está.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},

 /* ---------------- INCHADO — o que ocupa ---------------- */
 {id:'inchado_doce',criatura:'inchado',canal:'olfato',fase:'aproximacao',antecedencia:6,
  t:'Cheiro doce e parado, enjoativo, mais forte do que estava.',
  degradacao:'atenuar',falsificavel:true,inconsistencia:'cheiro doce sem umidade na parede'},
 {id:'inchado_respira',criatura:'inchado',canal:'audio',fase:'aproximacao',antecedencia:5,
  t:'Respiração úmida, no mesmo compasso, sem nunca variar.',
  degradacao:'ambiguar',ambiguo:'Chuva no telhado. Não tem chuva hoje, mas é chuva no telhado.',
  falsificavel:true,inconsistencia:'respiração que não acelera quando você se move'},
 {id:'inchado_umidade',criatura:'inchado',canal:'visual',fase:'iminencia',antecedencia:2,
  t:'A parede do cômodo do lado está escorrendo.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},
 {id:'inchado_contato',criatura:'inchado',canal:'tatil',fase:'contato',antecedencia:0,
  t:'Ele não te agarra. Ele encosta, e o encosto fica.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},

 /* ---------------- PRIMORDIAL — o que não deveria ser notado ---------------- */
 {id:'primordial_ausencia',criatura:'primordial',canal:'ausencia',fase:'aproximacao',antecedencia:8,
  t:'Os outros barulhos pararam. Todos, ao mesmo tempo, e a casa não está calma.',
  degradacao:'melhora',falsificavel:false,inconsistencia:null},
 {id:'primordial_geometria',criatura:'primordial',canal:'visual',fase:'aproximacao',antecedencia:5,
  t:'Este cômodo não bate com o que você anotou dele. Um detalhe só.',
  degradacao:'ambiguar',ambiguo:'O caderno sempre esteve assim. Você é que não lembra direito.',
  falsificavel:false,inconsistencia:null},
 {id:'primordial_peso',criatura:'primordial',canal:'tatil',fase:'iminencia',antecedencia:2,
  t:'Tudo ficou mais pesado de fazer, e a ficha não lista motivo nenhum.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},
 /* ---------------- OBSERVADOR — o que olha de volta ----------------
    Os sinais dele são todos de canal que NÃO é olhar, e isso é a regra
    dele virada em desenho: quem depende de olhar pra achá-lo perde ele
    de lugar toda vez. Dá pra rastreá-lo — só não com os olhos. */
 {id:'obs_nuca',criatura:'observador',canal:'tatil',fase:'aproximacao',antecedencia:4,
  t:'A nuca esquenta num cômodo frio. Some quando você vira, volta quando você desvira.',
  degradacao:'ambiguar',ambiguo:'Cansaço. Você trabalhou o dia inteiro e não bebeu água.',
  falsificavel:true,inconsistencia:'calor na nuca sem fonte de calor no cômodo'},
 {id:'obs_reflexo',criatura:'observador',canal:'visual',fase:'aproximacao',antecedencia:3,
  t:'No vidro tem uma coisa parada atrás de você, e atrás de você não tem nada.',
  degradacao:'atenuar',
  falsificavel:true,inconsistencia:'reflexo com uma forma a mais do que o cômodo tem'},
 {id:'obs_silencio',criatura:'observador',canal:'audio',fase:'iminencia',antecedencia:2,
  t:'A casa continua fazendo barulho, menos num cômodo. Aquele cômodo ficou surdo.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},
 {id:'obs_encara',criatura:'observador',canal:'visual',fase:'contato',antecedencia:0,
  t:'Ele não avança. Ele fica onde está, virado pra você, e espera você olhar de novo.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},

 /* ---------------- HÓSPEDE — o que se instala ----------------
    Ele não ataca, então os sinais dele não são de aproximação de bicho:
    são de casa mudando. É a única criatura cujo sinal de iminência não
    quer dizer "ele vem", e sim "a casa já é dele". */
 {id:'hosp_cheiro',criatura:'hospede',canal:'olfato',fase:'aproximacao',antecedencia:5,
  t:'Um cheiro doce de fruta passada, num cômodo onde não tem fruta nenhuma.',
  degradacao:'ambiguar',ambiguo:'Alguma coisa estragou na despensa e ninguém achou ainda.',
  falsificavel:true,inconsistencia:'cheiro de fruta sem fruta em lugar nenhum da casa'},
 {id:'hosp_mofo',criatura:'hospede',canal:'visual',fase:'aproximacao',antecedencia:4,
  t:'Uma mancha de mofo cresceu do rodapé pro teto em uma noite, e só numa parede.',
  degradacao:'atenuar',
  falsificavel:true,inconsistencia:'mofo subindo em parede seca'},
 {id:'hosp_calor',criatura:'hospede',canal:'tatil',fase:'iminencia',antecedencia:2,
  t:'Um cômodo está morno de manhã cedo, e é o mesmo cômodo de ontem.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null},
 {id:'primordial_contato',criatura:'primordial',canal:'ausencia',fase:'contato',antecedencia:0,
  t:'Não é um ataque. É a maré subindo, e você está onde ela sobe.',
  degradacao:'nunca',falsificavel:false,inconsistencia:null}
];
const TELL_POR_ID={};
TELLS.forEach(s=>{ TELL_POR_ID[s.id]=s; });

/* ================= A MATRIZ DE DEGRADACAO =================
   Sanidade normalizada 0..1. O jogo guarda 0..100, entao converte.
   Duas travas de justica, e as duas sao testadas:
     · iminencia nunca cai abaixo de SIN_CFG.pisoIminencia turnos
     · sinal falso SOMA, nunca substitui um verdadeiro no mesmo turno */
const SIN_MATRIZ=[
  {min:.80, ant:1.00, int:1.00, falsos:0},
  {min:.55, ant:0.80, int:0.85, falsos:1},
  {min:.30, ant:0.60, int:0.65, falsos:2},
  {min:.00, ant:0.45, int:0.50, falsos:3}
];
function sinSanidade01(){
  try{
    const v=(typeof sanEfetiva==='function')?sanEfetiva():(typeof san==='function'?san():100);
    return trava(v/100,0,1);
  }catch(e){ return 1; }
}
function sinFaixa(s01){
  for(const f of SIN_MATRIZ) if(s01>=f.min) return f;
  return SIN_MATRIZ[SIN_MATRIZ.length-1];
}

/* Puro: devolve COPIA, nunca mexe no original. */
function sinDegradar(sinal,s01){
  const f=sinFaixa(s01==null?sinSanidade01():s01);
  const o={...sinal};
  o.intensidade=+( (sinal.intensidade==null?1:sinal.intensidade) * f.int ).toFixed(3);
  if(sinal.degradacao==='melhora'){
    /* o Primordial e o unico que fica MAIS legivel com a cabeca ruim.
       E o desenho dele: quem esta inteiro nao percebe que sumiu som. */
    o.antecedencia=+(sinal.antecedencia*(2-f.ant)).toFixed(2);
    o.intensidade=+trava(o.intensidade/Math.max(.35,f.int),0,1).toFixed(3);
  }else if(sinal.degradacao==='nunca'){
    o.antecedencia=sinal.antecedencia;
  }else{
    o.antecedencia=+(sinal.antecedencia*f.ant).toFixed(2);
  }
  /* TRAVA 1 — iminencia tem piso, sempre, em qualquer sanidade */
  if(sinal.fase==='iminencia')o.antecedencia=Math.max(SIN_CFG.pisoIminencia,o.antecedencia);
  /* o texto que sai depende da degradacao */
  o.texto=sinTexto(sinal,f);
  o.faixa=f.min;
  return o;
}
function sinTexto(sinal,f){
  const base=(typeof sinal.monta==='function')?sinal.monta():sinal.t;
  if(sinal.degradacao==='ambiguar'&&f.ant<=0.60&&sinal.ambiguo)return sinal.ambiguo;
  return base;
}
/* antecedencia vira distancia: e assim que ela deixa de ser numero morto */
function sinDistanciaDeDisparo(sinalDegradado){
  return trava(Math.round(sinalDegradado.antecedencia/2),1,4);
}

/* ================= O ESTADO — DADO PURO ================= */
function sinEstado(){
  if(!S.sinais||typeof S.sinais!=='object')
    S.sinais={schemaVersion:1,emitidos:[],falsosHoje:0,dia:S.dia|0,violacoes:0};
  const E=S.sinais;
  if(!Array.isArray(E.emitidos))E.emitidos=[];
  if(E.dia!==(S.dia|0)){ E.dia=S.dia|0; E.falsosHoje=0; }
  return E;
}

/* ================= A API ================= */
const Sinais={
  /* emite um sinal. `forjado` marca isca da casa. */
  emitir(id,ctx){
    const base=TELL_POR_ID[id];
    if(!base)return null;
    ctx=ctx||{};
    /* REGRA DA ISCA: a casa pode mentir sobre aproximacao, nunca sobre
       o ultimo aviso. Iminencia forjada e proibida por construcao. */
    if(ctx.forjado&&base.fase==='iminencia')return null;
    if(ctx.forjado&&!base.inconsistencia)return null;
    const E=sinEstado();
    const d=sinDegradar(base,ctx.sanidade);
    E.emitidos.push({id,criatura:base.criatura,fase:base.fase,canal:base.canal,
      comodo:(ctx.comodo==null?-1:ctx.comodo),turno:ctx.turno|0,dia:S.dia|0,
      forjado:!!ctx.forjado,intensidade:d.intensidade});
    while(E.emitidos.length>SIN_CFG.memoria)E.emitidos.shift();
    if(ctx.forjado)E.falsosHoje++;
    if(typeof marcarSujo==='function')marcarSujo();
    if(ctx.calado)return d;
    if(typeof diz==='function')
      diz(d.texto, base.fase==='iminencia'?'perigo':base.fase==='contato'?'perigo':'narr');
    return d;
  },
  /* A ASSERCAO. Houve aviso desta criatura, aqui perto, na janela? */
  foiEmitido(criatura,comodo,janela){
    const E=sinEstado();
    const j=(janela==null)?SIN_CFG.janela:janela;
    const agora=E.emitidos.length?E.emitidos[E.emitidos.length-1].turno:0;
    return E.emitidos.some(e=>e.criatura===criatura&&!e.forjado
      &&(agora-e.turno)<=j
      &&(comodo==null||e.comodo===-1||typeof distancia!=='function'||distancia(e.comodo,comodo)<=1));
  },
  degradar(sinal,s01){ return sinDegradar(sinal,s01); },
  inconsistenciaDe(id){ const s=TELL_POR_ID[id]; return s?(s.inconsistencia||null):null; },
  /* quantos falsos a sanidade de agora permite hoje */
  falsosPermitidos(){ return sinFaixa(sinSanidade01()).falsos; },
  daCriatura(c,fase){ return TELLS.filter(s=>s.criatura===c&&(!fase||s.fase===fase)); },
  tabela(){ return TELLS.map(s=>({id:s.id,criatura:s.criatura,canal:s.canal,fase:s.fase,
    antecedencia:s.antecedencia,degradacao:s.degradacao,falsificavel:s.falsificavel,
    inconsistencia:s.inconsistencia||null})); }
};

/* ================= EMISSAO DENTRO DA INVASAO =================
   `turnoMonstro` ja conta o turno e ja sabe a distancia. E o lugar certo:
   o sinal chega pela mesma boca que o resto da noite. */
if(typeof turnoMonstro==='function'){
  const _sinTM=turnoMonstro;
  turnoMonstro=async function(I){
    const r=await _sinTM.apply(this,arguments);
    try{
      const c=cena&&cena.casa;
      if(!c||!I||!I.bicho)return r;
      if(c.monstro===c.voce||c.monstro2===c.voce)return r;  /* contato ja e cena */
      const perto=(c.monstro2!=null&&distancia(c.voce,c.monstro2)<distancia(c.voce,c.monstro))
        ?c.monstro2:c.monstro;
      const dist=distancia(c.voce,perto);
      const E=sinEstado();
      const fase=dist<=1?'iminencia':'aproximacao';
      const cand=Sinais.daCriatura(I.bicho.id,fase)
        .map(s=>({s,d:sinDegradar(s)}))
        .filter(x=>sinDistanciaDeDisparo(x.d)>=dist)
        /* nao repete o mesmo sinal na mesma aproximacao */
        .filter(x=>!E.emitidos.some(e=>e.id===x.s.id&&e.turno>(I.turno|0)-4));
      if(!cand.length)return r;
      /* o mais especifico primeiro: menor distancia de disparo */
      cand.sort((a,b)=>sinDistanciaDeDisparo(a.d)-sinDistanciaDeDisparo(b.d));
      Sinais.emitir(cand[0].s.id,{comodo:perto,turno:I.turno|0});
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'sinais/turno'); }
    return r;
  };
}

/* ================= A TRAVA: DANO SEM AVISO =================
   Nao da pra uma guarda de BUILD provar emissao, que e coisa de tempo de
   execucao. Entao a build checa a INTEGRIDADE da tabela (montar.js) e
   aqui fica a assercao de execucao: ferimento causado por criatura sem
   sinal anterior conta violacao, e o teste exige zero.

   Escopo declarado: vale para as 6 criaturas da casa. Queda, fogo e obra
   nao sao criaturas e tem o proprio aviso na cena que os causa. */
const SIN_CRIATURAS=['magro','rastejante','coro','imitador','inchado','primordial','observador','hospede'];
function sinFonteEhCriatura(porque){
  if(!porque)return null;
  const t=String(porque).toLowerCase();
  return SIN_CRIATURAS.find(c=>t.includes(c))||null;
}
if(typeof pegarMal==='function'){
  const _sinPM=pegarMal;
  pegarMal=function(id,alvo,porque){
    try{
      const c=sinFonteEhCriatura(porque);
      if(c&&!Sinais.foiEmitido(c,(cena&&cena.casa)?cena.casa.voce:null)){
        const E=sinEstado();
        E.violacoes=(E.violacoes||0)+1;
        if(typeof registrarErro==='function')
          registrarErro(new Error('dano de '+c+' sem sinal anterior'),'sinais/semTell');
      }
    }catch(e){}
    return _sinPM.apply(this,arguments);
  };
}

/* ---------- persistencia: anexa, nunca cria, e nunca grava onde a base
     nao gravaria (a regra que o §39 aprendeu do jeito ruim) ---------- */
if(typeof salvar==='function'){
  const _sinSalvar=salvar;
  salvar=function(){
    _sinSalvar.apply(this,arguments);
    try{
      if(!S.nomeJogador)return;
      const cru=localStorage.getItem(CHAVE);
      if(!cru)return;
      const d=JSON.parse(cru);
      if(S.sinais&&typeof S.sinais==='object')d.sinais=S.sinais;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/sinais'); }
  };
}
function migrarSinais(d){
  const E={schemaVersion:1,emitidos:[],falsosHoje:0,dia:(d&&d.dia)|0,violacoes:0};
  const v=(d&&d.sinais&&typeof d.sinais==='object')?d.sinais:null;
  if(v){
    E.emitidos=Array.isArray(v.emitidos)?v.emitidos.slice(-SIN_CFG.memoria):[];
    E.falsosHoje=v.falsosHoje|0; E.dia=v.dia|0; E.violacoes=v.violacoes|0;
    Object.keys(v).forEach(k=>{ if(!(k in E))E[k]=v[k]; });
  }
  return E;
}
if(typeof carregar==='function'){
  const _sinCarregar=carregar;
  carregar=function(){
    const r=_sinCarregar.apply(this,arguments);
    try{
      const cru=localStorage.getItem(CHAVE);
      S.sinais=migrarSinais(cru?JSON.parse(cru):null);
    }catch(e){}
    return r;
  };
}

/* ---------- conferencia da tabela, legivel de dentro do jogo ---------- */
function sinaisCobertura(){
  return SIN_CRIATURAS.map(c=>{
    const l=Sinais.daCriatura(c);
    return {criatura:c, sinais:l.length,
      canais:[...new Set(l.map(s=>s.canal))],
      fases:[...new Set(l.map(s=>s.fase))],
      iminenciaOmitivel:l.filter(s=>s.fase==='iminencia').some(s=>s.degradacao==='omitir'),
      falsificaveisSemInconsistencia:l.filter(s=>s.falsificavel&&!s.inconsistencia).length};
  });
}
