/* ================= §57 · O OBSERVADOR ==================================

   POR QUE ELE, E POR QUE ELE É O INVASOR MAIS CRIATIVO DISPONÍVEL.

   Este jogo inteiro é sobre COLHER INFORMAÇÃO antes de decidir: o olho
   mágico, a lanterna, ouvir na porta, a lente. Todas as seis criaturas
   atuais recompensam olhar — o Magro recua na luz, o `escutar` entrega a
   dica, a lente acha o defeito. A única exceção é o `primordial`, e
   mesmo ele é simples: olhar aproxima.

   O Observador INVERTE o verbo central do jogo:

     · olhar pra ele NÃO afasta e NÃO aproxima — MUDA ELE DE LUGAR.
       A informação que você acabou de pagar fica velha no mesmo turno.
     · e cada olhada aumenta o INTERESSE dele. Interesse alto faz ele
       parar de se esconder e vir direto.
     · ignorar é o que faz o interesse cair. Interesse zero, ele vai
       embora sozinho.

   Ou seja: a jogada que salva com todo mundo é a que mata com ele, e a
   jogada que o jogo nunca recompensou — não olhar — é a única saída.

   ISSO É JUSTO? Só se o jogador puder rastreá-lo SEM olhar, e puder
   aprender a regra. As duas coisas estão no lugar:
     · os quatro sinais dele são tátil, visual-indireto e áudio, e o de
       iminência é o cômodo que fica surdo — dá pra saber onde ele está
       pelo ouvido e pela pele, sem gastar uma olhada;
     · a `dica` diz a regra em uma frase, como as outras seis, e o
       `escutar` a entrega;
     · e toda vez que ele muda de lugar por causa de uma olhada, o jogo
       DIZ que foi por isso. Punição sem tell é proibida.

   ELE USA A MEMÓRIA DA ETAPA 2. É a primeira criatura a declarar
   `lembra:true`: ele começa a noite perto de onde te perdeu na anterior.
   Sem isso a memória seria parâmetro morto. */

const OBS_CFG={
  /* interesse: 0..100 */
  inicial:34,
  /* o que uma olhada direta acrescenta */
  porOlhada:22,
  /* o que ele perde a cada turno em que ninguem olha pra ele */
  decaiPorTurno:4,
  /* daqui pra cima ele para de se esconder e vem */
  limiarCaca:72,
  /* daqui pra baixo ele desiste da casa */
  limiarSaida:6,
  /* quantos turnos ele fica sumido depois de mudar de lugar */
  ocultoTurnos:3,
  /* de quantos comodos de distancia ele reaparece, no minimo */
  saltoMinimo:2
};

/* ---------- a criatura ---------- */
const OBS_BICHO={
  id:'observador', n:'o que Olha de Volta', peso:16, vel:.9, mem:5, folego:0,
  estreia:3,
  ap:'Você nunca vê ele chegando. Você vê que ele já estava, e que já estava faz tempo.',
  fraco:'Ele vive da sua atenção. Não olhar é o que faz ele ir embora.'
};
if(typeof BICHOS!=='undefined'&&Array.isArray(BICHOS)
   &&!BICHOS.some(b=>b.id===OBS_BICHO.id))BICHOS.push(OBS_BICHO);

/* ---------- ele tem de passar pela governanca do §30 ----------

   O nucleo adapta TODA criatura de `BICHOS` pra dentro do
   `CATALOGO_ANOM`, onde ela ganha schema, tell obrigatorio, precondicoes
   e lista de incompatibilidade. So que `adaptarBichos()` roda quando o
   §30 e lido, e este bloco e lido DEPOIS: o Observador entrava na tabela
   de bichos e ficava FORA da governanca — sem validacao, sem tell
   obrigatorio registrado, e fora da lista de incompativeis das outras
   seis. O `nucleoteste` acusou: 6 registros pra 7 criaturas.

   Entao ele declara a categoria dele e o adaptador roda de novo. Rodar
   de novo tambem conserta a lista de incompatibilidade das seis, que
   tinha sido montada quando ele nao existia. */
if(typeof CAT_BICHO!=='undefined')CAT_BICHO.observador='cognitiva';
(function(){
  /* NAO chamar `adaptarBichos()` de novo.

     A primeira versao rechamava o adaptador inteiro, e ele TROCA os
     objetos de registro das seis criaturas por objetos novos
     (`CATALOGO_ANOM[id]=a`). Isso quebrou a reprodutibilidade do
     orquestrador: o `orqteste` roda a mesma simulacao duas vezes com a
     mesma semente e as duas passaram a divergir. Semente igual com
     resultado diferente e exatamente o que o §9 proibe, e foi bissecao
     que apontou a linha — com o rechamado desligado, passa.

     Aqui so o que falta e acrescentado: o registro do Observador, e o
     nome dele nas listas de incompatibilidade que ja existem, alteradas
     NO LUGAR em vez de recriadas. */
  if(typeof CATALOGO_ANOM==='undefined'||typeof registrarAnomalia!=='function')return;
  if(CATALOGO_ANOM['bicho_observador'])return;
  const b=OBS_BICHO;
  const outros=(typeof BICHOS!=='undefined')
    ? BICHOS.filter(x=>x.id!==b.id).map(x=>'bicho_'+x.id) : [];
  const ok2=registrarAnomalia({
    id:'bicho_observador',
    nome:b.n,
    categoria:'cognitiva',
    raridade:3,
    peso:34,
    precondicoes:[ ()=>S.dia>1, ()=>S.dia>=b.estreia ],
    incompativelCom:outros,
    requerCriatura:b.id,
    duracaoTurnos:[4,14],
    tell:{tipo:'aviso_'+b.id,intensidade:.8,
      turnosAntes:(typeof ANOM_CFG!=='undefined'?ANOM_CFG.distanciaAviso:1)},
    /* o schema do §30 exige todos estes; eu tinha copiado o registro
       pela metade e o `registrarAnomalia` recusou em silencio — o
       `nucleoteste` acusou "7 criaturas, 6 registros". Recusa silenciosa
       e o pior tipo: nada estoura e a criatura fica fora da governanca.
       As resolucoes dele incluem `atencao`, que e o sentido dele: nao
       olhar E a saida. */
    resolucoes:['esconder','fugir','atencao'],
    custoErro:.7,
    consequencia(){ /* a invasao resolve o proprio desfecho */ },
    cicatriz:true,
    pesoMemoria:.6,
    versao:1,
    fonte:{tabela:'BICHOS', chave:b.id}
  });
  /* e as seis passam a saber que ele existe, sem trocar de objeto */
  if(ok2)outros.forEach(id=>{
    const r=CATALOGO_ANOM[id];
    if(r&&Array.isArray(r.incompativelCom)
       &&r.incompativelCom.indexOf('bicho_observador')<0)
      r.incompativelCom.push('bicho_observador');
  });
})();

/* ---------- a regra que o jogador aprende ---------- */
if(typeof REGRA!=='undefined'){
  REGRA.observador={
    sentido:'atencao',
    dica:'Olhar pra ele muda ele de lugar, e aumenta o interesse dele. '
        +'Não olhar é o que faz ele ir embora.',
    alvo(I,c){
      /* interesse alto: ele vem em voce, sem rodeio. Interesse baixo:
         ele fica pela casa, longe, sem pressa. */
      if(obsInteresse(I)>=OBS_CFG.limiarCaca)return c.voce;
      return (I.obsPouso!=null)?I.obsPouso:I.ruidoEm;
    }
  };
}
/* canal proprio, e o unico que LE a memoria entre noites */
if(typeof AME_CANAIS!=='undefined'){
  AME_CANAIS.observador={primario:'atencao', tambem:['som'], lembra:true};
}

/* ---------- achar o encontro que esta rolando ----------

   O jogo NAO guarda o `I` em lugar nenhum: ele e passado de funcao em
   funcao pelo encontro inteiro (`turnoJogador(I)`, `usarLanterna(I)`...).
   A minha primeira versao leu `cena.anom` — campo que eu inventei sem
   querer, e as tres referencias a ele eram todas minhas. Era o mesmo
   defeito que este jogo ja teve duas vezes (`respondeu` e `olhou`, lidos
   e nunca escritos): parece ligado, e nao esta.

   Entao a referencia fica aqui, numa variavel de modulo. Ela NAO vai pro
   save — objeto vivo em estado serializavel e a proibicao nº 4 — e so
   vale enquanto o encontro esta de pe. */
let OBS_ATIVO=null;
function obsAtivo(){
  const I=OBS_ATIVO;
  if(!I||!I.fase||I.fase==='RECUANDO'||I.obsFoiEmbora)return null;
  if(typeof cena==='undefined'||!cena.casa||cena.casa.monstro==null)return null;
  return I;
}

/* ---------- o interesse ---------- */
function obsEh(I){ return !!(I&&I.bicho&&I.bicho.id==='observador'); }
function obsInteresse(I){
  if(!obsEh(I))return 0;
  if(typeof I.obsInteresse!=='number')I.obsInteresse=OBS_CFG.inicial;
  return trava(I.obsInteresse,0,100);
}
function obsMexerInteresse(I,d){
  if(!obsEh(I))return 0;
  I.obsInteresse=trava(obsInteresse(I)+d,0,100);
  return I.obsInteresse;
}

/* onde ele reaparece: longe do lugar em que voce o viu.
   Deterministico pelo gerador semeado — e decisao de jogo, entao vai
   pelo gerador e nao pelo Math.random. */
function obsNovoPouso(de){
  const n=(typeof PLANTA!=='undefined')?Object.keys(PLANTA).length:9;
  const cand=[];
  for(let i=0;i<n;i++){
    if(typeof distancia==='function'){
      if(distancia(de,i)>=OBS_CFG.saltoMinimo)cand.push(i);
    }else if(i!==de)cand.push(i);
  }
  if(!cand.length)return de;
  return cand[_inteiro(cand.length)];
}

/* ---------- OLHAR PRA ELE ----------
   O verbo central do jogo, virado do avesso. E ele AVISA que foi a
   olhada que mexeu nele: sem o aviso isto seria aleatoriedade. */
function obsOlhado(I,como){
  if(!obsEh(I))return null;
  const antes=obsInteresse(I);
  obsMexerInteresse(I,OBS_CFG.porOlhada);
  I.obsOlhouNesteTurno=true;   /* pra olhar e decair nao brigarem */
  const de=(typeof cena!=='undefined'&&cena.casa)?cena.casa.monstro:null;
  const para=obsNovoPouso(de==null?0:de);
  I.obsPouso=para;
  if(typeof cena!=='undefined'&&cena.casa)cena.casa.monstro=para;
  /* some por alguns turnos: e a fase OCULTO da etapa 2 */
  if(typeof amePorFase==='function')amePorFase(I,'OCULTO');
  I.obsOcultoAte=(I.faseTurnos|0)+OBS_CFG.ocultoTurnos;
  const agora=obsInteresse(I);
  const txt=(agora>=OBS_CFG.limiarCaca&&antes<OBS_CFG.limiarCaca)
    ? 'Você olha, e ele não sai mais do lugar. Ele te encara de volta, e para de se esconder.'
    : 'Você olha bem pra ele — e no instante em que olha, ele não está mais ali. '
      +'A sua olhada mexeu nele. Ele fica mais interessado a cada vez.';
  if(typeof diz==='function'){ try{ diz(txt,agora>=OBS_CFG.limiarCaca?'perigo':'alerta'); }catch(e){} }
  return {antes, agora, de, para, como:como||'olhar'};
}

/* a lanterna e o olhar direto */
if(typeof usarLanterna==='function'){
  const _ul=usarLanterna;
  usarLanterna=async function(I){
    if(obsEh(I)){
      if(!I.fase&&typeof anomIniciar==='function')anomIniciar(I);
      obsOlhado(I,'lanterna');
      return _ul.call(this,I);
    }
    return _ul.apply(this,arguments);
  };
}
/* ---------- o turno ----------
   Sem olhada, o interesse cai. Zerou, ele vai embora. */
if(typeof anomAvancar==='function'){
  const _aa=anomAvancar;
  anomAvancar=function(I){
    if(!obsEh(I))return _aa.apply(this,arguments);
    /* JA FOI EMBORA: para de mandar nele. Sem esta saida o bloco entrava
       em ping-pong — interesse zero forcava RECUANDO, a etapa 2 tirava
       dele pra PERDEU depois de 4 turnos, e no turno seguinte eu forcava
       RECUANDO de novo. O teste de 2000 turnos acusou "observador preso
       em RECUANDO", que e exatamente a cadeia perpetua que a etapa 2 foi
       escrita pra evitar — e quem a criou fui eu, no bloco de cima. */
    if(I.obsFoiEmbora)return _aa.apply(this,arguments);
    const out=_aa.apply(this,arguments)||[];
    /* o decaimento so acontece se ele NAO foi olhado neste turno; o
       `obsOlhado` marca o turno pra nao decair e subir no mesmo passo */
    if(!I.obsOlhouNesteTurno)obsMexerInteresse(I,-OBS_CFG.decaiPorTurno);
    I.obsOlhouNesteTurno=false;
    const q=obsInteresse(I);
    if(q>=OBS_CFG.limiarCaca&&I.fase!=='CACA'){
      I.fase='CACA'; I.faseTurnos=0;
      out.push('Ele parou de mudar de lugar.');
    }else if(q<=OBS_CFG.limiarSaida){
      I.obsFoiEmbora=true;
      if(typeof amePorFase==='function')amePorFase(I,'RECUANDO');
      if(typeof ameAnotar==='function')
        ameAnotar(I,{perdeuEm:(cena&&cena.casa)?cena.casa.voce:null});
      out.push('Ele perdeu o interesse. Você sente a casa ficar sua de novo.');
    }
    return out;
  };
}
/* ---------- esconder-se É ignorar ----------
   Se esconder e a forma mais forte de nao olhar, entao tem de contar.
   Sem isso o Observador era a unica criatura contra a qual o contra-jogo
   universal do jogo nao servia pra nada — e "sempre existe como
   sobreviver" e contrato, nao gentileza. */
if(typeof esconder==='function'){
  const _es=esconder;
  esconder=function(I){
    try{ if(obsEh(I)){
      obsMexerInteresse(I,-OBS_CFG.porOlhada*1.4);
      I.obsOlhouNesteTurno=false;
    } }catch(e){}
    return _es.apply(this,arguments);
  };
}

/* ---------- ele começa perto de onde te perdeu ----------
   A primeira criatura a LER a memória da etapa 2. Sem isto a memória
   seria parâmetro morto, que é a proibição nº 6. */
if(typeof anomIniciar==='function'){
  const _ai=anomIniciar;
  anomIniciar=function(I){
    const r=_ai.apply(this,arguments)||I;
    try{
      /* LIMPAR SEMPRE, nao so quando e ele. Sem esta linha a referencia
         sobrevive ao fim do encontro: comecar a noite com OUTRA criatura
         deixava o `OBS_ATIVO` velho de pe, e a presenca do §53 continuava
         dizendo "tem coisa dentro" por causa de um bicho que ja foi
         embora. O teste pegou — a leitura dava DENTRO antes de o
         Observador existir. */
      OBS_ATIVO=obsEh(r)?r:null;
      if(obsEh(r)){
        r.obsInteresse=OBS_CFG.inicial;
        r.obsPouso=null;
        r.obsOlhouNesteTurno=false;
        /* LEMBRAR NAO PODE ESCREVER NA CENA.

           A primeira versao punha `cena.casa.monstro = m.perdeuEm` aqui.
           Escrever no mundo compartilhado de dentro de um inicializador
           quebrou a REPRODUTIBILIDADE: o `orqteste` roda a mesma
           simulacao duas vezes com a mesma semente e compara, e a
           primeira rodada passou a deixar memoria que mudava a segunda.
           Semente igual com resultado diferente e o oposto do que o §9
           exige.

           A memoria agora so diz PRA ONDE ele vai (`obsPouso`), que e o
           que "ele volta pra onde te perdeu" quer dizer de qualquer
           forma. Ele nao nasce la: ele vai la. */
        const m=(typeof ameLembra==='function')?ameLembra('observador'):null;
        if(m&&m.perdeuEm!=null)r.obsPouso=m.perdeuEm|0;
      }
    }catch(e){}
    return r;
  };
}

/* ---------- ele é a presença DENTRO da casa (§53) ----------
   Integração ganha, não inventada: o §53 já sabe ler "tem coisa dentro"
   e o Observador é exatamente a criatura para quem "você se sente
   observado" é a mecânica inteira. */
if(typeof vigFonteReal==='function'){
  const _vf=vigFonteReal;
  vigFonteReal=function(comodo){
    try{
      const I=obsAtivo();
      if(obsEh(I)){
        const q=obsInteresse(I);
        return {fonte:'DENTRO', forca:trava(.45+q/200,0,1), quem:'observador'};
      }
    }catch(e){}
    return _vf.apply(this,arguments);
  };
}

function observadorEstado(I){
  const alvo=I||obsAtivo();
  return {
    ehObservador:obsEh(alvo),
    foiEmbora:!!(alvo&&alvo.obsFoiEmbora),
    interesse:obsEh(alvo)?obsInteresse(alvo):null,
    fase:alvo?alvo.fase:null,
    pouso:alvo?alvo.obsPouso:null,
    naTabela:(typeof BICHOS!=='undefined')&&BICHOS.some(b=>b.id==='observador'),
    temRegra:(typeof REGRA!=='undefined')&&!!REGRA.observador,
    canais:(typeof AME_CANAIS!=='undefined')?AME_CANAIS.observador:null,
    cfg:{...OBS_CFG}
  };
}
