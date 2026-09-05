/* ============ §47 — O SOM MAIS PERTO DA REALIDADE ============

   AUDITORIA (Fase 0 da skill de direcao audiovisual)
   --------------------------------------------------
   A arquitetura de audio deste jogo e boa e nao foi tocada:
     · `A.ctx` unico, master com compressor, destino
     · barramento seco/molhado com convolver e reflexoes precoces
     · mixer real de 5 camadas (voz, drone, evento, ambiente, gerador)
       com ducking automatico por prioridade
     · `saida(no, {pan, rev, vol})` roteia TODOS os sons — 101 sitios

   O ERRO QUE ESTE BLOCO JA COMETEU DUAS VEZES, E O QUE SOBROU DELE
   ----------------------------------------------------------------
   A primeira versao deste bloco escreveu um `somDePorta` proprio, de
   quatro camadas, sem procurar se a porta ja tinha som. Ela tem:
   `somPortaAbrindo` monta CINCO camadas — ferrolho (duas voltas),
   rangido, arrasto, lufada e batente. Removi a minha.

   E entao cometi o MESMO erro com o passo, e desta vez cheguei a
   entregar. Eu media contra `passo()` da linha 474 do index.html e
   concluia que o passo do jogo era "um estalo so, sem material, sem
   variacao". Aquele passo esta MORTO: o `audio-manager.js` declara
   outro `passo` depois dele, e o proprio `montar.js` registra a troca
   por escrito em COLISAO_OK:

       'passo',   // v48 troca o passo sintetizado pelo sistema de superficies

   O passo vivo e `passoEm()`, e ele ja tinha tudo o que eu disse que
   faltava: o peso do corpo chegando no chao (oscilador), o solado, a
   tabua respondendo depois, e o pe arrastando 50-90ms adiante — que e
   exatamente a "segunda batida" que eu achei que estava inventando.
   Quatro superficies, variacao por disparo, tudo la.

   Minha versao foi removida. O passo do jogo e o `passoEm` de novo.

   O QUE SOBRA, E QUE E DE VERDADE O QUE FALTAVA
   ---------------------------------------------
   1 · `saida()` NAO TINHA MODELO DE DISTANCIA. Som longe so ficava mais
       baixo. Mas o que o ouvido usa pra julgar distancia e a PERDA DE
       AGUDO — o ar absorve alta frequencia, e por isso trovao longe e
       um ronco e trovao perto e um estalo. Como `saida` e universal,
       resolver ali serve os 101 sitios de uma vez.

   2 · O SISTEMA DE SUPERFICIES NAO CHEGAVA NOS COMODOS. `pisoDaCena()`
       decidia assim:

           if(c===10)return 'terra';         // quintal
           if(c===0||c===9)return 'escada';  // sotao e porao
           return 'madeira';

       O abrigo tem os comodos 0 a 8. O quintal e 8, nao 10; o porao e
       6, nao 9. SETE DOS NOVE COMODOS caiam no `return 'madeira'` —
       inclusive o quintal de terra batida e os dois de concreto. O
       motor era bom e estava apontando pra indices que nao existem.

   3 · NEM PASSO NEM PORTA TINHAM DISTANCIA. Existem no jogo passos que
       vem de longe (`passoDistante`) e portas em outro comodo, e as
       duas coisas so ficavam mais baixas.

   CUSTO — E UM NUMERO QUE EU PUBLIQUEI ERRADO
   -------------------------------------------
   Publiquei que o passo tinha ficado mais barato (0,921 -> 0,357 ms).
   Era falso duas vezes: eu media o `antes` num AudioContext ja cheio de
   nos vivos, e o `antes` que eu media era o passo morto. Repetindo a
   MESMA chamada seis vezes seguidas eu obtive
   1,70 · 2,35 · 4,83 · 4,68 · 6,24 · 6,24 ms — codigo identico. O
   cronometro media acumulo de nos.

   Agora o passo do jogo voltou a ser o `passoEm`, que custa o que
   sempre custou. O que este bloco acrescenta a ele e um filtro de ar
   quando a distancia e maior que zero: um no por chamada de `saida`.

   POLITICA RESPEITADA: audio cosmetico continua com `Math.random`, como
   o s30-nucleo.js declarou por escrito. Nada aqui gasta o RNG da
   partida.
   ====================================================================== */

const SOM_CFG={
  /* absorcao do ar por comodo de distancia. 0.45 por comodo da uma
     curva forte e legivel: 18k → 8,1k → 3,6k → 1,6k → 740Hz. */
  agudoPorComodo: 0.45,
  cortePerto: 18000,
  corteMinimo: 320,
  /* quanto mais longe, mais reverberacao proporcional ao som direto —
     e assim que o ouvido separa "perto e abafado" de "longe" */
  revPorComodo: 0.55,
  /* e o som direto cai */
  ganhoPorComodo: 0.72,
  /* quantos "comodos" de ar um passo de proximidade 0 atravessa */
  comodosNoPassoDistante: 3
};

function corteDoAr(d){
  return Math.max(SOM_CFG.corteMinimo, SOM_CFG.cortePerto*Math.pow(SOM_CFG.agudoPorComodo,d));
}

/* janela de distancia: tudo que for agendado dentro dela sai com
   absorcao de ar. Declarada aqui em cima porque o embrulho de `saida()`
   a consulta. */
let _distAmbiente=0;
function comDistancia(d,fn){
  const antes=_distAmbiente;
  _distAmbiente=+d||0;
  try{ return fn(); }
  finally{ _distAmbiente=antes; }
}

/* ================= 1 · DISTÂNCIA EM `saida()` =================
   Opt-in de proposito: sem `dist` e fora de qualquer janela, o
   comportamento e IDENTICO ao de antes — zero nos a mais. Os 101 sitios
   existentes continuam soando igual ate alguem pedir distancia. */
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
      ar.frequency.value=corteDoAr(d);
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

/* ================= 2 · O PISO VOLTA A CHEGAR NOS CÔMODOS =================

   O motor de superficie (`SUP` + `passoEm`) NAO E TOCADO. O que estava
   quebrado era so o mapa: `pisoDaCena` procurava os comodos 9 e 10, que
   nao existem, e sete dos nove caiam em 'madeira'.

   As duas superficies novas saem do texto que o proprio jogo escreve em
   `AMBIENTE`, nao da minha imaginacao:
     comodo 1 — "Colchoes no chao."           → colchao
     comodo 5 — "Fogao a gas com meio botijao" → ladrilho (cozinha)
   e o resto ja tinha superficie certa esperando um mapa que funcionasse:
     comodo 8 — "Muro alto, portao soldado, terra batida." → terra
     comodo 2 — "Prateleiras de metal."       → concreto
     comodo 6 — "O gerador."                  → concreto            */
if(typeof SUP==='object'&&SUP&&SUP.madeira){
  /* mesmo formato das quatro que ja existiam */
  if(!SUP.colchao)  SUP.colchao ={corte:300 ,q:.5 ,corpo:54,res:[0,0]    ,resVol:0   ,scuff:.012};
  if(!SUP.ladrilho) SUP.ladrilho={corte:2600,q:1.6,corpo:82,res:[520,880],resVol:.05,scuff:.090};
}
const PISO_DO_COMODO={
  0:'escada',   /* sotao: telhado baixo, degrau de madeira */
  1:'colchao',  /* dormitorio: colchoes no chao */
  2:'concreto', /* despensa: prateleiras de metal */
  3:'madeira',  /* oficina: bancada e madeira empilhada */
  4:'madeira',  /* sala: assoalho */
  5:'ladrilho', /* cozinha */
  6:'concreto', /* porao do gerador */
  7:'madeira',  /* entrada: tabuas atravessadas */
  8:'terra'     /* quintal: terra batida */
};
if(typeof pisoDaCena==='function'){
  pisoDaCena=function(){
    const m=(window.cena&&cena.modo)||'';
    if(m==='rua'||m==='casafora'||m==='mapa')return 'concreto';
    const c=(window.cena&&cena.casa)?cena.casa.voce:null;
    return PISO_DO_COMODO[c]||'madeira';
  };
}

/* ================= 3 · DISTÂNCIA PARA O QUE JÁ EXISTE =================

   Nada aqui reescreve som nenhum. `comDistancia` marca uma janela e o
   embrulho de `saida()` faz o resto — entao passo e porta ganham
   distancia sem que uma linha do corpo delas mude.

   No passo isto MUDA o som dos sitios que ja chamavam `passo(prox,pan)`
   com proximidade baixa, e muda de proposito: passo longe deixa de ser
   "o mesmo passo, mais baixo" e passa a ser um passo que atravessou ar.
   A forma nova, `passo(t, op)`, so ganha distancia se pedir `op.dist`. */
if(typeof passo==='function'){
  const _passoBase=passo;
  passo=function(a,b){
    /* forma nova passo(t,{...}): so com `dist` explicito */
    if(b&&typeof b==='object'){
      const d=+b.dist||0;
      return d>0 ? comDistancia(d,()=>_passoBase(a,b)) : _passoBase(a,b);
    }
    /* forma antiga passo(proximidade, pan) */
    const prox=a==null?1:a;
    const d=Math.max(0,(1-Math.min(1,prox))*SOM_CFG.comodosNoPassoDistante);
    return d>0 ? comDistancia(d,()=>_passoBase(a,b)) : _passoBase(a,b);
  };
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
  const pisos={};
  for(const k in PISO_DO_COMODO) pisos[k]=PISO_DO_COMODO[k];
  return {
    distanciaEmSaida:true,
    corte:[0,1,2,3,4].map(d=>({comodos:d, hz:Math.round(corteDoAr(d))})),
    superficies:(typeof SUP==='object'&&SUP)?Object.keys(SUP):[],
    pisoPorComodo:pisos,
    superficiesUsadas:Array.from(new Set(Object.values(PISO_DO_COMODO))),
    motorDoPassoPreservado:(typeof passoEm==='function'),
    portaJaExistia:(typeof somPortaAbrindo==='function'),
    distanciaAmbiente:_distAmbiente
  };
}
