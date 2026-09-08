/* ================= §52 · O SILÊNCIO VIRA ESTADO DO SOM =================

   MEDIDO ANTES DE ESCREVER. O jogo já trata silêncio como conteúdo — o
   orquestrador agenda "vales de silêncio" ANTES de qualquer evento, dois
   por noite, de quatro a sete turnos cada, e o comentário dele diz em
   letras claras: "valeObrigatorio nao e ausencia de evento: e evento".

   E o ÁUDIO NÃO SABIA DISSO. Medido turno a turno, atravessando um vale
   de verdade:

     turno  vale   AMBIENCE   leito   corte   mestre
       2    não    0.07943    0.07     260     0.9
       5    SIM    0.07943    0.07     260     0.9
       9    não    0.07943    0.07     260     0.9

   Byte por byte igual. `emVale()` era consultado só pelo
   `pedirPermissao`, ou seja, o vale existia na agenda de eventos e não
   existia no ouvido. O jogador atravessava o silêncio sem ouvir
   silêncio nenhum.

   O QUE ENTRA AQUI. Três estados declarados, e o som muda de verdade
   entre eles:

     CHEIO      fora do vale. Como sempre foi.
     RAREFEITO  dentro do vale. A camada de conforto afina.
     OCO        dentro do vale E com pressão alta. O quieto errado.

   O QUE NÃO ENTRA: os canais SFX e HORROR não são tocados, de propósito.
   O vale serve pra que, quando a coisa acontecer, ela aconteça contra um
   fundo fino. Abafar o susto junto mataria o motivo de existir o vale.

   E o filtro do leito FECHA conforme afunda: não é só "mais baixo", é
   "mais longe". Baixinho e perto é sussurro; baixinho e longe é a casa
   se afastando de você.

   A REGRA DE OURO. O jogador tem de conseguir explicar depois. Duas
   coisas fazem isso: o vale sempre desemboca em alguma coisa, então
   "ficou quieto antes" vira aprendizado; e ao afundar no OCO o jogo diz
   uma linha, uma vez por vale, que nomeia o que o ouvido acabou de
   perceber. Punição sem tell é proibida; sensação sem tell também. */

/* O prefixo e SILEN_ e nao SIL_ porque o §51 (as silhuetas) ja usa
   SIL_CFG, e a trava de colisao do montar.js quebrou o build na hora —
   dois blocos declarando o mesmo nome de topo fazem o segundo apagar o
   primeiro em silencio, que e justamente o tipo de erro que nao da
   erro. */
const SILEN_CFG={
  estados:{
    CHEIO:     {n:'cheio',     AMBIENCE:1,   MUSIC:1,   leito:1,   corte:1  },
    RAREFEITO: {n:'rarefeito', AMBIENCE:.42, MUSIC:.30, leito:.45, corte:.72},
    OCO:       {n:'oco',       AMBIENCE:.16, MUSIC:.08, leito:.18, corte:.45}
  },
  /* entrar e devagar, sair e rapido: o retorno do som tem de ser
     percebido como retorno, e nao como mais um degrade */
  rampaEntra:3.4,
  rampaVolta:1.6,
  /* de quanta pressao pra cima o vale deixa de ser calmo e vira errado */
  pressaoOco:.55,
  /* estados do diretor que ja bastam pra virar OCO sozinhos */
  dirOco:['TENSO','PERIGO']
};

/* o insert por canal.

   Nao mexo no ganho do proprio canal. `amVolume` e `amDuck` escrevem
   nele — o `amDuck` inclusive faz uma rampa de VOLTA pro cheio, e
   qualquer abaixamento sustentado que eu deixasse ali seria apagado no
   primeiro duck. Entao entra um no MEU entre o canal e o mestre:
   canal -> silencio -> mestre. Cada um escreve no seu, e os dois se
   multiplicam sozinhos, que e como insert de mesa funciona. */
const SILEN={nos:{}, estado:'CHEIO', montado:false, avisado:-1, vale:false};

function silenMontar(){
  if(SILEN.montado)return true;
  if(typeof AM==='undefined'||!AM.pronto||!AM.ctx||!AM.canais||!AM.canais.MASTER)return false;
  try{
    ['AMBIENCE','MUSIC'].forEach(c=>{
      const g=AM.canais[c]; if(!g)return;
      const s=AM.ctx.createGain(); s.gain.value=1;
      g.disconnect();
      g.connect(s);
      s.connect(AM.canais.MASTER);
      SILEN.nos[c]=s;
    });
    SILEN.montado=true;
  }catch(e){ SILEN.montado=false; }
  return SILEN.montado;
}

/* qual estado o momento pede */
function silenAlvo(){
  let vale=false;
  try{ vale=(typeof emVale==='function')&&!!emVale(); }catch(e){}
  if(!vale)return 'CHEIO';
  let pr=0, dir='';
  try{ pr=(typeof pressaoAgora==='function')?pressaoAgora():0; }catch(e){}
  /* LER, NAO RECALCULAR. `dirEstado()` chama `dirCalcular()`, e
     `dirCalcular` NAO e consulta: ele empurra a media acumulada do
     diretor em direcao a tensao curta a cada chamada, escreve no
     historico e troca o estado. Perguntar o estado uma vez por turno
     daqui DOBRAVA a velocidade com que o humor da campanha converge —
     o `dirteste` acusou tres asserções na hora. `dirEstadoBruto()` e o
     getter puro: devolve o que ja foi decidido, sem decidir de novo. */
  try{ dir=(typeof dirEstadoBruto==='function')?(dirEstadoBruto().estado||''):''; }catch(e){}
  if(pr>=SILEN_CFG.pressaoOco||SILEN_CFG.dirOco.indexOf(dir)>=0)return 'OCO';
  return 'RAREFEITO';
}

function silenAplicar(alvo,seg){
  const E=SILEN_CFG.estados[alvo]||SILEN_CFG.estados.CHEIO;
  if(typeof A==='undefined'||!A.ctx)return false;
  const t=A.ctx.currentTime, d=seg==null?SILEN_CFG.rampaEntra:seg;
  if(silenMontar()){
    ['AMBIENCE','MUSIC'].forEach(c=>{
      const s=SILEN.nos[c]; if(!s)return;
      s.gain.cancelScheduledValues(t);
      s.gain.setValueAtTime(s.gain.value,t);
      s.gain.linearRampToValueAtTime(E[c],t+d);
    });
  }
  /* o leito do vento tem ganho e filtro proprios, fora do mixer */
  try{
    if(A.amb&&A.amb.vento){
      const base=(typeof SOM!=='undefined'&&SOM.casa)?SOM.casa.vento:.07;
      const g=A.amb.vento.g, f=A.amb.vento.f;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value,t);
      g.gain.linearRampToValueAtTime(base*E.leito,t+d);
      f.frequency.cancelScheduledValues(t);
      f.frequency.setValueAtTime(f.frequency.value,t);
      f.frequency.linearRampToValueAtTime(260*E.corte,t+d);
    }
  }catch(e){}
  return true;
}

/* As falas do afundamento.

   ELAS NAO PODEM CHAMAR `sortear`. Parece inofensivo — e uma linha de
   texto — mas `sortear` consome o gerador semeado que o jogo inteiro
   compartilha. Cada fala minha empurrava a sequencia um passo, e todo
   sorteio seguinte da noite saia diferente. O `dirteste` reprovou tres
   asserções e o build anterior passava nas mesmas tres: a prova de que
   era meu.

   Coisa cosmetica nao gasta o gerador de jogo. A escolha aqui e por
   indice: dia e turno ja sao deterministicos e ja explicam a fala. */
const SILEN_FALAS=[
  'O chiado da casa some. Fica só o seu ouvido.',
  'A casa para de fazer o barulho que ela sempre faz.',
  'Some o fundo. Só agora você percebe que tinha um fundo.',
  'Fica quieto de um jeito que não é quieto.'
];
const SILEN_VOLTA=[
  'O barulho de sempre volta. Você não viu a hora em que ele saiu.',
  'A casa recomeça. Some a sensação de estar dentro de um copo.'
];

/* o coração: recalcula e conta pro jogador quando muda pra pior */
function silenAtualizar(quieto){
  const antes=SILEN.estado;
  const alvo=silenAlvo();
  if(alvo===antes)return alvo;
  const afunda=(antes==='CHEIO')||(antes==='RAREFEITO'&&alvo==='OCO');
  SILEN.estado=alvo;
  silenAplicar(alvo,afunda?SILEN_CFG.rampaEntra:SILEN_CFG.rampaVolta);
  if(!quieto&&typeof diz==='function'){
    let turno=0;
    try{ turno=orqEstado().turno|0; }catch(e){}
    const dia=(typeof S!=='undefined'&&S.dia)?S.dia|0:0;
    if(alvo==='OCO'&&SILEN.avisado!==turno){
      SILEN.avisado=turno;
      try{ diz(SILEN_FALAS[(dia*3+turno)%SILEN_FALAS.length],'fraco'); }catch(e){}
    }else if(alvo==='CHEIO'&&antes==='OCO'){
      try{ diz(SILEN_VOLTA[(dia+turno)%SILEN_VOLTA.length],'fraco'); }catch(e){}
    }
  }
  return alvo;
}

/* ONDE ELE E CHAMADO. O vale muda de turno em turno, entao o gancho e o
   turno do orquestrador. `orqNovaNoite` reseta o aviso porque os vales
   sao sorteados de novo a cada noite. */
if(typeof orqTurno==='function'){
  const _ot=orqTurno;
  orqTurno=function(){
    const r=_ot.apply(this,arguments);
    try{ silenAtualizar(); }catch(e){}
    return r;
  };
}
if(typeof orqNovaNoite==='function'){
  const _on=orqNovaNoite;
  orqNovaNoite=function(){
    const r=_on.apply(this,arguments);
    SILEN.avisado=-1;
    try{ silenAtualizar(true); }catch(e){}
    return r;
  };
}
/* e quando o som liga depois do jogo ja ter comecado, o estado atual
   tem de ser aplicado — senao a primeira noite comeca sempre cheia */
if(typeof ligarAmbiente==='function'){
  const _la=ligarAmbiente;
  ligarAmbiente=function(){
    const r=_la.apply(this,arguments);
    try{ silenAplicar(SILEN.estado,.5); }catch(e){}
    return r;
  };
}

function silencioEstado(){
  return {
    estado:SILEN.estado, alvo:silenAlvo(), montado:SILEN.montado,
    emVale:(typeof emVale==='function')?!!emVale():null,
    fatores:{...SILEN_CFG.estados[SILEN.estado]},
    ganhos:Object.fromEntries(Object.keys(SILEN.nos).map(c=>
      [c,+SILEN.nos[c].gain.value.toFixed(4)])),
    leito:(typeof A!=='undefined'&&A.amb&&A.amb.vento)
      ?{ganho:+A.amb.vento.g.gain.value.toFixed(5),
        corte:Math.round(A.amb.vento.f.frequency.value)}:null
  };
}
/* pro harness poder pular direto pra um estado sem simular a noite */
function silenForcar(e){
  if(!SILEN_CFG.estados[e])return null;
  SILEN.estado=e; silenAplicar(e,.05); return e;
}
