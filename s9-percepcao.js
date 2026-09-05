/* ================= V9 — PERCEPÇÃO CORROMPIDA =================
   A sanidade deixa de ser barra e vira filtro.

   Até aqui o jogo tinha uma barra e uma função `mente()` que sacudia
   número solto. O V9 troca o lugar da coisa: existem quatro medidores,
   três deles ocultos, e nada chega ao jogador sem passar por `perceber()`.

     sanidade      a verdade. Continua em S.sanidade — o save antigo abre.
     escudo        0..30, absorve o golpe antes da verdade
     paranoia      0..100, decide pra que lado o número mente
     dívida        0..100, o que a mentira acumulou e cobra em cena
     abstinência   0..100, o preço de ter se curado

   O estágio não olha a barra: olha `sanidade − dívida×0,3 − abstinência×0,2`.
   É por isso que curar demais quebra você — a barra enche, a leitura piora,
   e o jogo não te avisa de nenhum dos dois.

   O núcleo em TypeScript deste bloco está em `anomalia/core/v9/`, com 35
   testes. Aqui é a mesma tabela e as mesmas contas, no jogo. */

const V9_ESTAGIOS=[
  // nome,        min, ilusão, mentira de interface
  ['lúcido',       90, 0.00, 0.00],
  ['tenso',        70, 0.08, 0.02],
  ['fissurado',    45, 0.22, 0.12],
  ['rachado',      20, 0.40, 0.28],
  ['desfeito',      1, 0.65, 0.50],
  ['em ruptura',    0, 1.00, 0.90]
];

function v9(){
  if(!S.v9)S.v9={escudo:30,paranoia:0,abstinencia:0,sequelas:[],noitesBaixo:0};
  const m=S.v9;
  if(m.escudo==null)m.escudo=30;
  if(m.paranoia==null)m.paranoia=0;
  if(m.abstinencia==null)m.abstinencia=0;
  if(!Array.isArray(m.sequelas))m.sequelas=[];
  if(m.noitesBaixo==null)m.noitesBaixo=0;
  return m;
}

/* a conta que decide tudo */
function sanEfetiva(){
  const m=v9();
  return san()-debito()*0.3-m.abstinencia*0.2;
}
function v9Estagio(){
  const e=sanEfetiva();
  return V9_ESTAGIOS.find(r=>e>=r[1])||V9_ESTAGIOS[V9_ESTAGIOS.length-1];
}

/* O resto do jogo pede `estagio()` e espera {n, min, drift, ilusao, d}.
   Em vez de caçar cada consumidor, o formato antigo passa a ser servido
   pela tabela nova — quem já lia continua lendo, com os números do V9. */
const V9_DESC={
 'lúcido'     :'Você está inteiro. O que você lê é o que é.',
 'tenso'      :'Você ouve passo onde não tem passo.',
 'fissurado'  :'O peso da mochila não bate. Tem vulto no canto do olho.',
 'rachado'    :'Aparece coisa no inventário que não existe. O relógio atrasa.',
 'desfeito'   :'Os nomes mudam. O mapa mostra lugar que não existe.',
 'em ruptura' :'Nada do que essa tela te diz é confiável. Nada.'
};
if(typeof estagio==='function'){
  window.estagio=function(){
    const [n,min,ilusao,uiLie]=v9Estagio();
    return {n,min,ilusao,drift:uiLie,d:V9_DESC[n]||'',uiLie};
  };
}

/* ---------- o filtro ----------
   O número mente para o lado que a paranoia empurra, e o deslocamento é
   proporcional ao próprio valor: 4 latas viram 3 ou 5, 40 latas viram 28
   ou 52. Mentira que não é plausível não engana ninguém. */
function corromper(v){
  const p=v9().paranoia;
  if(typeof v!=='number'||!isFinite(v))return v;
  const dir=chance(.5)?-1:1;
  const desvio=(p/100)*dir*Math.ceil(Math.abs(v)*0.3);
  return Math.round((v+desvio)*10)/10;
}
function perceber(v){
  if(S._verdade)return v;
  const e=estagio();
  if(chance(e.uiLie)){
    S.realDebt=trava(debito()+1,0,100);
    return corromper(v);
  }
  return v;
}
/* `mente()` era o ponto por onde o jogo já passava número duvidoso.
   Continua existindo, agora com a régua do V9 por baixo. */
if(typeof mente==='function')window.mente=perceber;

/* ---------- perder ----------
   O escudo come primeiro, mas a paranoia sobe pelo golpe inteiro: é a
   diferença entre aguentar o susto e não ter sentido ele. */
function v9Perder(qtd,tag){
  if(!(qtd>0))return 0;
  const m=v9();
  const absorvido=Math.min(m.escudo,qtd);
  m.escudo=trava(m.escudo-absorvido,0,30);
  m.paranoia=trava(m.paranoia+qtd*0.4,0,100);
  if(tag==='ANOMALY_CONTACT')S.realDebt=trava(debito()+qtd*0.6,0,100);
  return qtd-absorvido;   // o que sobrou pra morder a verdade
}
if(typeof mexerSan==='function'){
  const _mexerBase=mexerSan;
  window.mexerSan=function(n,motivo){
    if(n<0){
      const sobrou=v9Perder(-n,motivo);
      if(sobrou<=0){
        /* o escudo segurou: a barra não se mexe, mas a cabeça registrou */
        return san();
      }
      return _mexerBase(-sobrou,motivo);
    }
    return _mexerBase(n,motivo);
  };
}
/* o escudo se recompõe devagar quando o dia foi calmo */
function recomporEscudo(q){
  const m=v9();
  m.escudo=trava(m.escudo+(q==null?4:q),0,30);
  m.paranoia=trava(m.paranoia-2,0,100);
}

/* ---------- remédios com tolerância ----------
   Cada dose vale menos que a anterior e empurra a abstinência pra cima.
   O amarelo é o extremo: cura 40 de uma vez e cobra 35, então quem se
   acostuma com ele chega no ponto em que a dose inteira não levanta 15 —
   e aí o corpo ainda começa a somar dívida sozinho. */
const V9_MEDS={
  calmante   :{n:'Calmante',            cura:18, tol:12, efeito:'sono_pesado',
               mat:'remedio', diz:'O mundo afasta um passo. Você dorme pesado — e quem dorme pesado não ouve batida.'},
  estimulante:{n:'Estimulante',         cura:-5, tol:20, efeito:'paranoia_up',
               mat:'remedio', diz:'Você acorda inteiro e errado. As mãos param de tremer e a cabeça começa.'},
  cha        :{n:'Chá de raiz',         cura:8,  tol:3,  efeito:'nenhum',
               mat:null,      diz:'Amargo. Não resolve nada e ajuda um pouco, que é o que existe.'},
  amarelo    :{n:'O comprimido amarelo',cura:40, tol:35, efeito:'ilusao_garantida',
               mat:'remedio', diz:'Vinte minutos e o medo some. Some junto a parte de você que sabia por que tinha medo.'}
};
function tomarMed(id){
  const m=V9_MEDS[id], E=v9();
  const efeito=m.cura*(1-E.abstinencia/130);
  S.sanidade=trava(san()+efeito,0,100);
  E.abstinencia=trava(E.abstinencia+m.tol,0,100);
  if(E.abstinencia>70)S.realDebt=trava(debito()+10,0,100);
  if(m.efeito==='paranoia_up')E.paranoia=trava(E.paranoia+12,0,100);
  if(m.efeito==='ilusao_garantida')S.ilusaoForcada=true;
  if(m.efeito==='sono_pesado')S.sonoPesado=true;
  return m;
}

/* ---------- sequelas ----------
   Não vêm de um susto: vêm de ficar. Três noites abaixo de 20 e alguma
   coisa trava pra sempre. Nada no jogo remove uma sequela. */
const V9_SEQUELAS={
  tremor   :{n:'Tremor',           d:'A mão não firma. Toda lâmina rende menos e toda costura sai torta.'},
  surdez   :{n:'Surdez parcial',   d:'O ouvido direito foi. Escutar na porta acerta menos.'},
  cegueira :{n:'Cegueira noturna', d:'Depois que escurece você não enxerga sem lampião. Nenhum.'}
};
const V9_ORDEM=['tremor','surdez','cegueira'];
function temSequela(id){ return v9().sequelas.indexOf(id)>=0; }

function v9PassarNoite(){
  const m=v9();
  if(sanEfetiva()<20){ m.noitesBaixo++; }
  else { m.noitesBaixo=0; recomporEscudo(6); return null; }
  if(m.noitesBaixo<3)return null;
  const nova=V9_ORDEM.find(x=>!temSequela(x));
  if(!nova)return null;
  m.sequelas.push(nova);
  m.noitesBaixo=0;
  const S9=V9_SEQUELAS[nova];
  diz(`Alguma coisa não voltou com você desta noite. ${S9.n}: ${S9.d}`,'perigo');
  anotar(`Sequela permanente: ${S9.n}.`);
  return nova;
}
if(typeof anoitecer==='function'){
  const _anoitecerBase=anoitecer;
  window.anoitecer=function(){
    const r=_anoitecerBase.apply(this,arguments);
    try{ setTimeout(v9PassarNoite,60); }catch(e){}
    return r;
  };
}

/* as sequelas mordem onde dói */
if(typeof escutarPorta==='function'&&typeof perfilEscuta==='function'){
  const _perfilBase=perfilEscuta;
  window.perfilEscuta=function(v){
    const p=_perfilBase.apply(this,arguments);
    /* surdez: uma das camadas simplesmente não chega */
    if(temSequela('surdez')&&p&&Array.isArray(p.defeitos)&&p.defeitos.length>1&&chance(.5))
      p.defeitos=p.defeitos.slice(0,p.defeitos.length-1);
    return p;
  };
}

/* ---------- rastro: você não é visto, é somado ----------
   Detecção deixa de ser linha de visão. Cada coisa que você faz deixa
   rastro, e o rastro entra numa conta que só desce quando você para de
   produzir. Não existe "sair do campo de visão" — existe parar de emitir
   e esperar o esquecimento comer o que já entrou. */
const V9_SENTIDOS={SOM:1, ODOR:.5, VISUAL:.8, METAL:1.2, PRESENCA:.4};

function v9Rastros(){
  const carga=(S.armas||[]).length+((S.oculto||[]).length*.5);
  const t=[
    {k:'SOM',      p:(S.ruido||0)*.06},
    {k:'ODOR',     p:(S.ferido>0?9:0)+Math.min(6,S.dia||0)},
    {k:'VISUAL',   p:S.lanterna?8:0},
    {k:'METAL',    p:carga*1.6},
    {k:'PRESENCA', p:S.marcado?12:3}
  ];
  return t.filter(x=>x.p>0);
}
function v9Calor(){
  if(S.calor==null)S.calor=0;
  const cegoPra=S.cegoDaNoite||[];
  let ganho=0;
  for(const r of v9Rastros()){
    if(cegoPra.indexOf(r.k)>=0)continue;      // o ponto cego é absoluto
    ganho+=r.p*(V9_SENTIDOS[r.k]||0);
  }
  S.calor=Math.max(0,S.calor+ganho-3);        // 3 de esquecimento por passagem
  return S.calor;
}
/* o calor entra no risco da noite, junto do que o jogo já pesava */
if(typeof riscoInvasao==='function'){
  const _riscoBase=riscoInvasao;
  window.riscoInvasao=function(){
    const base=_riscoBase.apply(this,arguments);
    const c=(S.calor||0)/120;
    return trava(base+trava(c,0,.30),0,.95);
  };
}
/* cada noite a coisa que ronda tem um ponto cego, e ele não é dito */
if(typeof anoitecer==='function'){
  const _anoBase2=anoitecer;
  window.anoitecer=function(){
    const cegos=['SOM','ODOR','VISUAL','METAL'];
    /* qual sentido fica cego decide QUAL CRIATURA fica surda naquela
       noite. Fora do gerador, a mesma noite carregada era outra. */
    S.cegoDaNoite=[sortear(cegos)];
    v9Calor();
    return _anoBase2.apply(this,arguments);
  };
}

/* ---------- checagem de realidade ----------
   [A02] Esta função existia e ninguém a chamava. [A04] E ela lia
   `S.ilusaoNoAr`, uma variável que nada no jogo inteiro escrevia — então,
   mesmo que fosse chamada, responderia sempre a mesma coisa.

   O que ela pergunta agora tem verdade de verdade por baixo: *a tela está
   te enganando neste momento?* A resposta certa é `estagio().uiLie > 0`,
   que é exatamente o que o jogador não pode ver. Custa 8 minutos e 4 de
   estresse, acerta 80% das vezes — e os 20% restantes não devolvem "não
   sei": devolvem a resposta errada com a mesma cara de certeza. Uma
   checagem que avisasse quando falhou seria uma checagem de 100%. */
const CHECAGEM={minutos:8, estresse:4, acerto:.8};

function checarRealidade(){
  const mentindo=estagio().uiLie>0;
  const acertou=chance(CHECAGEM.acerto);
  v9Perder(CHECAGEM.estresse,'CHECAGEM');
  return {resposta:acertou?mentindo:!mentindo, acertou, verdade:mentindo};
}

/* ---------- a tela dos quatro medidores ----------
   Três deles são ocultos por desenho, então esta tela não os mostra em
   número: mostra o que dá pra sentir. Quem quiser o número real tem o
   menuRealidade, que é honesto e custa tempo. */
if(typeof menuCuidar==='function'){
  const _cuidarBase=menuCuidar;
  window.menuCuidar=function(volta){
    _cuidarBase.call(this,volta);
    const E=v9();

    if(E.abstinencia>0){
      diz(E.abstinencia>70
        ?'Seu corpo cobra o que você andou tomando. As mãos pedem antes de você pensar.'
        :'Você já tomou coisa demais essa semana. A próxima dose vai render menos.',
        E.abstinencia>70?'perigo':'alerta');
    }
    if(E.sequelas.length)
      diz('Isso não volta: '+E.sequelas.map(x=>V9_SEQUELAS[x].n).join(', ')+'.','perigo');

    Object.keys(V9_MEDS).forEach(id=>{
      const m=V9_MEDS[id];
      const falta=m.mat&&!temMat(m.mat,1);
      const rende=Math.round(m.cura*(1-E.abstinencia/130));
      botao(m.n,()=>{
        if(m.mat)gastarMat(m.mat,1);
        const r=tomarMed(id);
        diz(r.diz,r.cura>0?'bom':'alerta');
        if(v9().abstinencia>70)
          diz('E alguma coisa por dentro não agradece.','perigo');
        menuCuidar(volta);
      },{falta:falta?'não tem':'',
         custo:(m.mat?'1 remédio · ':'')+(rende>0?'+'+rende:rende)+' de cabeça'});
    });
  };
}

/* o menuRealidade continua sendo o lugar honesto — e agora conta a
   dívida e a abstinência, que são o que decide o estágio de verdade */
if(typeof menuRealidade==='function'){
  const _realBase=menuRealidade;
  window.menuRealidade=function(volta){
    _realBase.call(this,volta);
    const E=v9();
    diz(`Leitura efetiva ${Math.round(sanEfetiva())} — dívida ${Math.round(debito())}, `
       +`abstinência ${Math.round(E.abstinencia)}.`,'sist');
    if(sanEfetiva()<san()-5)
      diz('A barra está melhor do que você está.','alerta');

    /* [A02] a checagem finalmente tem um botão. Uma vez por dia: o valor
       dela é ser cara e incerta, e poder repetir até gostar da resposta
       transformaria 80% de acerto em certeza de graça. */
    const jaHoje=S.checouDia===S.dia;
    botao('Parar e conferir se a tela está mentindo',()=>{
      if(S.hora+1>19)return diz('Não sobra dia pra isso hoje.','perigo');
      S.checouDia=S.dia;
      const r=checarRealidade();
      S.hora=Math.min(19,S.hora+1);
      atualizarPainel();
      diz(r.resposta
        ? 'Você para, respira e confere três coisas que sabe de cor. Duas não batem. Alguma coisa aqui está te enganando.'
        : 'Você para, respira e confere três coisas que sabe de cor. As três batem. O que você está lendo é o que é.',
        r.resposta?'perigo':'bom');
      /* acertar cobra menos da dívida do que a dúvida cobrava */
      if(r.acertou)S.realDebt=trava(debito()-3,0,100);
      menuRealidade(volta);
    },{falta:jaHoje?'já conferiu hoje':'',
       custo:CHECAGEM.minutos+' minutos · '+CHECAGEM.estresse+' de estresse · erra 1 em 5'});
  };
}
