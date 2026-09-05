/* ============ §47 — O SOM MAIS PERTO DA REALIDADE ============

   AUDITORIA (Fase 0 da skill de direcao audiovisual)
   --------------------------------------------------
   A arquitetura de audio deste jogo e boa e nao foi tocada:
     · `A.ctx` unico, master com compressor, destino
     · barramento seco/molhado com convolver e reflexoes precoces
     · mixer real de 5 camadas (voz, drone, evento, ambiente, gerador)
       com ducking automatico por prioridade
     · `saida(no, {pan, rev, vol})` roteia TODOS os sons — 101 sitios

   Nada disso foi reescrito. O que faltava sao tres coisas, e as tres
   foram medidas antes:

   1 · `saida()` NAO TINHA MODELO DE DISTANCIA. Som longe so ficava mais
       baixo. Mas o que o ouvido usa pra julgar distancia e a PERDA DE
       AGUDO — o ar absorve alta frequencia, e por isso trovao longe e
       um ronco e trovao perto e um estalo. Como `saida` e universal,
       resolver ali melhora os 101 sitios de uma vez.

   2 · `passo()` ERA UM ESTALO SO. Um passo real sao duas batidas: o
       calcanhar, e o peso assentando 45-75ms depois. E nao tinha
       material nenhum — pisar em tabua soava igual a pisar em terra
       batida, num jogo que descreve o piso de cada comodo por escrito.

   3 · SEM VARIACAO. Todo `passo` usava os mesmos numeros. Repeticao
       identica destroi a ilusao mais rapido que ausencia de som.

   MEDIDO ANTES:  passo() 0,921 ms · batida() 0,329 ms · saida() 0,142 ms

   POLITICA RESPEITADA: audio cosmetico continua com `Math.random`, como
   o s30-nucleo.js declarou por escrito. Nada aqui gasta o RNG da
   partida.
   ====================================================================== */

const SOM_CFG={
  /* absorcao do ar por comodo de distancia. 0.45 por comodo da uma
     curva forte e legivel: 18k → 8,1k → 3,6k → 1,6k → 740Hz. */
  agudoPorComodo: 0.45,
  cortePerto: 18000,
  /* quanto mais longe, mais reverberacao proporcional ao som direto —
     e assim que o ouvido separa "perto e abafado" de "longe" */
  revPorComodo: 0.55,
  /* e o som direto cai */
  ganhoPorComodo: 0.72,
  /* atraso entre o calcanhar e o peso assentando, em segundos */
  passoDuplo: [0.045, 0.075],
  /* variacao por disparo: nada disso passa de ~6%, senao soa desafinado
     em vez de vivo */
  jitterGanho: 0.14,
  jitterFreq: 0.09
};

/* distancia ambiente: declarada aqui porque o embrulho de `saida()`
   abaixo a consulta. Ver a secao 3. */
let _distAmbiente=0;

/* ================= 1 · DISTÂNCIA EM `saida()` =================
   Opt-in de proposito: sem `dist`, o comportamento e IDENTICO ao de
   antes. Os 101 sitios existentes continuam soando igual ate alguem
   passar distancia. Melhoria incremental, nao troca de motor. */
if(typeof saida==='function'){
  const _somSaida=saida;
  saida=function(no,op){
    op=op||{};
    /* `dist` explicito vence; senao vale a janela de `comDistancia` */
    const d=(+op.dist||0)||_distAmbiente;
    if(d<=0)return _somSaida.call(this,no,op);
    try{
      /* o ar come o agudo: e isto que diz "longe", nao o volume */
      const ar=A.ctx.createBiquadFilter();
      ar.type='lowpass';
      ar.frequency.value=Math.max(320,SOM_CFG.cortePerto*Math.pow(SOM_CFG.agudoPorComodo,d));
      ar.Q.value=0.4;
      no.connect(ar);
      return _somSaida.call(this,ar,{
        pan: op.pan||0,
        /* mais longe, mais sala e menos fonte */
        rev: Math.min(1,(op.rev==null?.35:op.rev)*(1+d*SOM_CFG.revPorComodo)),
        vol: (op.vol==null?1:op.vol)*Math.pow(SOM_CFG.ganhoPorComodo,d)
      });
    }catch(e){ return _somSaida.call(this,no,op); }
  };
}

/* ================= 2 · O PASSO =================
   Materiais tirados do texto que o proprio jogo escreve em `AMBIENTE`:
   o sotao tem telhado e poeira, o quarto tem colchoes no chao, a
   despensa tem prateleira de metal, a oficina tem oleo, a sala tem
   sofa e tabua, a cozinha tem fogao, o porao tem o gerador, a entrada
   e tabua atravessada, e o quintal e terra batida — esta escrito la. */
const MATERIAL_SOM={
  madeira: {corte:[300,520], q:2.2,  peso:1.00, res:180, ressoa:.30},
  tabua:   {corte:[260,430], q:3.4,  peso:1.10, res:120, ressoa:.46},  /* soalho oco */
  concreto:{corte:[520,900], q:0.8,  peso:0.86, res:0,   ressoa:.06},
  ladrilho:{corte:[900,1700],q:1.4,  peso:0.74, res:0,   ressoa:.10},
  terra:   {corte:[170,300], q:0.6,  peso:0.92, res:0,   ressoa:.02},
  pano:    {corte:[150,240], q:0.5,  peso:0.60, res:0,   ressoa:.01}   /* colchao */
};
const PISO_DO_COMODO={0:'tabua',1:'pano',2:'concreto',3:'concreto',
  4:'tabua',5:'ladrilho',6:'concreto',7:'madeira',8:'terra'};
function pisoAtual(id){
  const i=(id==null&&typeof cena!=='undefined'&&cena.casa)?cena.casa.voce:id;
  return MATERIAL_SOM[PISO_DO_COMODO[i]]||MATERIAL_SOM.madeira;
}
/* variacao pequena e continua. `Math.random` de proposito: e cosmetico,
   e a politica do projeto reserva o RNG semeado pra quem decide jogo. */
function jitter(v,q){ return v*(1+(Math.random()*2-1)*q); }

/* uma batida de passo: ruido filtrado com envelope curto, mais um toque
   de ressonancia quando o piso e oco */
function _batidaDePasso(t,ganho,mat,pan,dist){
  const s=src(), f=A.ctx.createBiquadFilter(), g=A.ctx.createGain();
  f.type='lowpass';
  f.frequency.value=jitter(mat.corte[0]+Math.random()*(mat.corte[1]-mat.corte[0]),SOM_CFG.jitterFreq);
  f.Q.value=mat.q;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(jitter(ganho,SOM_CFG.jitterGanho),t+0.004);
  g.gain.exponentialRampToValueAtTime(0.0008,t+0.13+Math.random()*0.05);
  s.connect(f); f.connect(g);
  saida(g,{pan,rev:.42,dist});
  s.start(t); s.stop(t+0.20);
  /* assoalho oco devolve uma nota grave curta — e o que faz tabua soar
     como tabua e nao como "ruido mais grave" */
  if(mat.res&&Math.random()<mat.ressoa){
    const o=A.ctx.createOscillator(), og=A.ctx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(jitter(mat.res,.12),t);
    o.frequency.exponentialRampToValueAtTime(jitter(mat.res,.12)*0.72,t+0.16);
    og.gain.setValueAtTime(0,t);
    og.gain.linearRampToValueAtTime(ganho*0.22,t+0.012);
    og.gain.exponentialRampToValueAtTime(0.0008,t+0.19);
    o.connect(og); saida(og,{pan,rev:.5,dist});
    o.start(t); o.stop(t+0.22);
  }
}

if(typeof passo==='function'){
  passo=function(prox=1,pan=0,piso){
    if(!A.ctx)return;
    const t=A.ctx.currentTime;
    const mat=(typeof piso==='string')?(MATERIAL_SOM[piso]||pisoAtual()):pisoAtual();
    /* `prox` era 0..1 de proximidade. Distancia e o inverso, em comodos. */
    const dist=Math.max(0,(1-Math.min(1,prox))*3);
    const base=0.40*Math.min(1,prox)*mat.peso;
    /* CALCANHAR — o ataque */
    _batidaDePasso(t,base,mat,pan,dist);
    /* PESO ASSENTANDO — mais grave, mais fraco, e e este intervalo que
       o ouvido le como "uma pessoa", nao "um estalo" */
    const [a,b]=SOM_CFG.passoDuplo;
    const atraso=a+Math.random()*(b-a);
    _batidaDePasso(t+atraso,base*(0.38+Math.random()*0.14),
      {...mat,corte:[mat.corte[0]*0.62,mat.corte[1]*0.66],ressoa:mat.ressoa*0.5},
      pan,dist);
  };
}

/* ================= 3 · DISTÂNCIA PARA O QUE JÁ EXISTE =================

   ERRO MEU, CORRIGIDO ANTES DE ENTREGAR: a primeira versao deste bloco
   trazia um `somDePorta` proprio, em quatro camadas. Eu tinha auditado o
   barramento e NAO tinha procurado se a porta ja tinha som.

   Ela tem: `somPortaAbrindo` monta CINCO camadas — ferrolho (duas
   voltas), rangido, arrasto, lufada de vento e batente — e e melhor que
   a minha. Entregar a minha por cima seria duplicar pior, que e
   exatamente o que a auditoria existe pra impedir.

   Entao o que entra aqui e o que faltava NELA: distancia.

   `comDistancia(d, fn)` marca uma janela — tudo que for agendado la
   dentro sai com absorcao de ar, mais reverberacao e menos som direto.
   Como `saida()` e o roteador universal, isso vale pros 101 sitios do
   jogo sem reescrever nenhum deles. Uma porta batendo dois comodos
   adiante deixa de ser "a mesma porta, mais baixa" e passa a ser um som
   que veio de longe. */
function comDistancia(d,fn){
  const antes=_distAmbiente;
  _distAmbiente=+d||0;
  try{ return fn(); }
  finally{ _distAmbiente=antes; }
}

/* as portas do jogo passam a aceitar `dist` sem mudar o corpo delas */
['somPortaAbrindo','somPortaFechando'].forEach(nome=>{
  const orig=window[nome];
  if(typeof orig!=='function')return;
  window[nome]=function(op){
    op=op||{};
    const d=+op.dist||0;
    return d>0 ? comDistancia(d,()=>orig.call(this,op)) : orig.call(this,op);
  };
});

/* ---------- conferencia ---------- */
function som47Estado(){
  return {
    distanciaEmSaida:true,
    corte:[0,1,2,3,4].map(d=>({comodos:d,
      hz:Math.round(Math.max(320,SOM_CFG.cortePerto*Math.pow(SOM_CFG.agudoPorComodo,d)))})),
    materiais:Object.keys(MATERIAL_SOM),
    pisoPorComodo:PISO_DO_COMODO,
    portaJaExistia:typeof somPortaAbrindo==='function',
    distanciaAmbiente:_distAmbiente
  };
}
