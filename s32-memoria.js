/* ============ §32 — MEMÓRIA COGNITIVA DA CASA ============

   A casa passa a lembrar. Não do que aconteceu — disso o save já
   lembra — mas de COMO você joga.

   POR QUE MÉDIA MÓVEL E NÃO CONTADOR
   ----------------------------------
   Contador é injusto duas vezes. Ele nunca esquece: quem se escondeu
   trinta vezes no dia 3 continua sendo "o que se esconde" no dia 20,
   mesmo tendo parado. E ele nunca perdoa: não existe mudar de tática,
   só existe compensar o passado. A média móvel exponencial resolve os
   dois — o que você fez ontem pesa mais que o que fez semana passada,
   e parar de fazer apaga sozinho.

   A CASA SÓ AGE COM CERTEZA
   -------------------------
   Nenhum comportamento nasce de uma observação. `memLer` devolve ZERO
   enquanto a confiança não passa de `MEM_CFG.limiarConfianca`, e é a
   única porta de leitura. Sem isso a casa reagiria a coincidência, e o
   jogador sentiria perseguição sem causa — que é aleatoriedade com
   outro nome.

   O QUE ELA NUNCA FAZ
   -------------------
   Não fecha porta. O multiplicador da memória é sempre >= 1: ela
   ENCARECE o caminho fácil, nunca elimina o caminho. E tem teto, então
   nem a casa mais hostil consegue transformar probabilidade em certeza.
   ====================================================================== */

const MEM_CFG={
  versao:1,

  /* --- média móvel --- */
  /* peso da noite de hoje na média. .28 dá meia-vida de ~2 noites:
     rápido o bastante pra sentir mudança de tática, lento o bastante
     pra uma noite atípica não virar diagnóstico. */
  alfa:.28,
  /* confiança = n/(n+K). Com K=4, passar de .6 exige 6 observações —
     seis noites de evidência antes de a casa mexer uma palha. */
  kConfianca:4,
  limiarConfianca:.6,
  /* acima disto o método conta como "o jeito dele de jogar" */
  limiarMetodo:.55,
  /* teto de observações contadas: evidência velha não vira dogma */
  maxObservacoes:40,

  /* --- tamanho e consolidação --- */
  /* entradas por balde antes de consolidar. As mais fracas viram uma
     entrada `outros` que guarda a massa: nada some sem deixar rastro. */
  maxEntradas:16,

  /* --- hostilidade --- */
  /* sobe quando você ganha a noite, desce quando a casa acerta.
     O teto é o que impede a espiral: por melhor que você jogue, existe
     um limite de quanto a casa aperta. */
  hostilidadeTeto:.70,
  hostilPasso:.12,
  hostilDecaimento:.06,
  /* quanto a hostilidade consegue encarecer uma contra-anomalia.
     1 + .70*1.4 = 1,98: no máximo dobra o peso de escolha. */
  fatorContra:1.4,

  /* --- isca --- */
  /* o método precisa estar ACIMA disto pra virar isca. É mais alto que
     `limiarMetodo` de propósito: encarecer é barato, armar cilada não. */
  limiarIsca:.75,
  /* e a isca não volta antes disto, em noites */
  iscaCooldownNoites:5,
  /* turnos sem evento nenhum que definem "tensão baixa" */
  turnosDeCalmaria:4,
  /* e a que distância a coisa precisa estar. A calmaria deste jogo não
     é "não há bicho na casa" — fora da invasão o jogador nem anda pela
     casa. É o bicho LONGE, no meio da noite: o momento em que dá pra
     respirar. Apagar a luz com ele no cômodo ao lado não seria isca,
     seria execução. */
  distanciaCalmaria:3,

  /* --- ciclo quebrado --- */
  /* noites seguidas com invasão que fazem o jogador aprender o ritmo */
  cicloParaQuebrar:4,
  /* e quantas noites até a casa poder quebrar o ritmo de novo */
  cicloCooldownNoites:8,

  /* --- cicatrizes --- */
  maxCicatrizes:12
};

/* ================= ESTADO — DADO PURO ================= */
/* Números e strings. Nenhuma função, nenhum timer, nenhum nó de DOM:
   isto vai pro localStorage inteiro e volta inteiro. */
function memoria(){
  const M=S.memoriaAnomalias;
  if(!M||typeof M!=='object'||M.versao!==MEM_CFG.versao){
    S.memoriaAnomalias={
      versao:MEM_CFG.versao,
      metodos:{}, rotinas:{}, fraquezas:{}, pontosFortes:{},
      cicatrizes:[], hostilidade:0,
      noites:0, noitesComInvasao:0, seguidasComInvasao:0,
      iscaEm:-99, cicloEm:-99,
      _noite:{}                 /* o que foi visto NESTA noite, ainda cru */
    };
  }
  const m=S.memoriaAnomalias;
  if(!m._noite||typeof m._noite!=='object')m._noite={};
  return m;
}
const MEM_BALDES=['metodos','rotinas','fraquezas','pontosFortes'];

/* ================= A MÉDIA MÓVEL =================
   `v` é a média; `n` é quantas noites de evidência ela tem. A confiança
   sai de `n`, não de `v`: fazer uma coisa uma vez com força não é o
   mesmo que fazer sempre. */
function memEntrada(balde,id){
  const M=memoria();
  if(!M[balde]||typeof M[balde]!=='object')M[balde]={};
  const b=M[balde];
  if(!b[id]||typeof b[id]!=='object')b[id]={v:0,n:0};
  return b[id];
}
function memAplicar(balde,id,x){
  const e=memEntrada(balde,id);
  e.v=e.v+MEM_CFG.alfa*(x-e.v);
  if(e.v<0)e.v=0; if(e.v>1)e.v=1;
  e.v=Math.round(e.v*1e4)/1e4;        /* o save não precisa de 17 casas */
  if(e.n<MEM_CFG.maxObservacoes)e.n++;
  return e;
}
function memConf(balde,id){
  const M=memoria();
  const e=(M[balde]||{})[id];
  if(!e)return 0;
  return e.n/(e.n+MEM_CFG.kConfianca);
}
/* A ÚNICA PORTA DE LEITURA. Sem confiança, a casa não sabe de nada —
   e o que ela não sabe vale zero, não vale "um pouco". */
function memLer(balde,id){
  if(memConf(balde,id)<=MEM_CFG.limiarConfianca)return 0;
  const M=memoria();
  const e=(M[balde]||{})[id];
  return e?e.v:0;
}

/* ================= O QUE A CASA VÊ =================
   Durante a noite só se ANOTA (cru, em `_noite`). A média só se move no
   fechamento — senão uma noite de dez fugas contaria como dez noites de
   evidência, e a confiança viraria mentira. */
function memVer(balde,id){
  const M=memoria();
  const k=balde+'/'+id;
  M._noite[k]=1;
  return k;
}
/* fecha a noite: alimenta 1 pro que foi visto e 0 pro que não foi.
   Alimentar zero É o esquecimento — não existe segundo mecanismo de
   decaimento pra discordar deste. */
function memFecharNoite(teveInvasao){
  const M=memoria();
  M.noites++;
  if(teveInvasao){ M.noitesComInvasao++; M.seguidasComInvasao++; }
  else M.seguidasComInvasao=0;

  MEM_BALDES.forEach(balde=>{
    /* rotina se observa toda noite; método só em noite de invasão —
       noite sem bicho não é noite em que você escolheu não se esconder */
    if(balde!=='rotinas'&&!teveInvasao)return;
    const b=M[balde]||{};
    Object.keys(b).forEach(id=>{
      memAplicar(balde,id,M._noite[balde+'/'+id]?1:0);
    });
    /* o que apareceu pela primeira vez esta noite */
    Object.keys(M._noite).forEach(k=>{
      const [bl,id]=k.split('/');
      if(bl===balde&&!b[id])memAplicar(balde,id,1);
    });
  });

  memConsolidar();
  memHostilidade();
  M._noite={};
  if(typeof marcarSujo==='function')marcarSujo();
  return M;
}

/* ================= CONSOLIDAÇÃO =================
   Balde cheio não é motivo pra apagar o passado. As entradas mais
   fracas viram uma só, `outros`, que carrega a média delas. A casa
   deixa de saber QUAL era, e continua sabendo QUANTO era. */
function memConsolidar(){
  const M=memoria();
  MEM_BALDES.forEach(balde=>{
    const b=M[balde]||{};
    const ids=Object.keys(b).filter(k=>k!=='outros');
    if(ids.length<=MEM_CFG.maxEntradas)return;
    ids.sort((x,y)=>b[y].v-b[x].v);
    const some=ids.slice(MEM_CFG.maxEntradas-1);
    let soma=0,n=0;
    some.forEach(id=>{ soma+=b[id].v; n=Math.max(n,b[id].n); delete b[id]; });
    const o=b.outros||{v:0,n:0};
    o.v=Math.round(Math.min(1,(o.v+soma/some.length)/(o.v?2:1))*1e4)/1e4;
    o.n=Math.min(MEM_CFG.maxObservacoes,Math.max(o.n,n));
    b.outros=o;
  });
}

/* ================= HOSTILIDADE =================
   Sobe quando você ganha, desce quando a casa acerta, e volta pro zero
   sozinha se nada acontece. O teto é a promessa de que jogar bem nunca
   vira punição infinita. */
function memHostilidade(){
  const M=memoria();
  const ganhou=Object.keys(M._noite).filter(k=>k.indexOf('pontosFortes/')===0).length;
  const apanhou=Object.keys(M._noite).filter(k=>k.indexOf('fraquezas/')===0).length;
  let h=M.hostilidade||0;
  h+=MEM_CFG.hostilPasso*ganhou;
  h-=MEM_CFG.hostilPasso*apanhou;
  h-=MEM_CFG.hostilDecaimento;
  M.hostilidade=Math.round(Math.min(MEM_CFG.hostilidadeTeto,Math.max(0,h))*1e4)/1e4;
  return M.hostilidade;
}
function memCicatriz(oQue,id){
  const M=memoria();
  M.cicatrizes.push({noite:S.dia|0, o:String(oQue), id:id?String(id):null});
  while(M.cicatrizes.length>MEM_CFG.maxCicatrizes)M.cicatrizes.shift();
  if(typeof marcarSujo==='function')marcarSujo();
  return M.cicatrizes.length;
}

/* ================= 32.1 · PESO DE ESCOLHA =================
   O primeiro dos três comportamentos: método usado sempre torna a
   contra-anomalia dele mais provável.

   A tabela é curta de propósito e cada linha aponta pro conteúdo que já
   existe — a contra de "luz acesa" é a casa ficar sem luz, não uma
   criatura nova. Onde o jogo não tem contra pro método, a linha não
   existe: inventar uma seria conteúdo novo disfarçado de balanceamento. */
const MEM_CONTRA={
  /* mantém as luminárias acesas (o Magro para na porta de cômodo aceso) */
  luz:        ['avaria_fiacao','avaria_curto','isca_escuridao'],
  /* se esconde: o Imitador chama com voz conhecida, o Rastejante segue
     a trilha e não o silêncio */
  esconder:   ['bicho_imitador','bicho_rastejante'],
  /* rastejar é silêncio: silêncio não serve contra quem lê o chão nem
     contra quem lê o olhar */
  rastejar:   ['bicho_rastejante','bicho_primordial'],
  /* correr é barulho: o Coro vai pro barulho, e a casa barulhenta piora */
  correr:     ['bicho_coro','avaria_porta_emperra','avaria_aberta'],
  /* escutar é confiar no som: som é justamente o que mente */
  escutar:    ['bicho_coro','bicho_imitador'],
  /* empurrar o armário: a passagem é que apodrece */
  bloquear:   ['avaria_porta_emperra','avaria_aberta'],
  /* a lanterna não aparece contra o Primordial — ele é a contra dela */
  lanterna:   ['bicho_primordial']
};
/* a rotina de cômodo vira contra pelos dados que a AVARIAS já tem:
   o cômodo mais pisado é o que estraga. Ninguém escreveu essa tabela. */
function memContraDoComodo(id){
  if(typeof AVARIAS==='undefined')return [];
  return Object.keys(AVARIAS)
    .filter(k=>AVARIAS[k].onde===id)
    .map(k=>'avaria_'+k);
}
function memContras(){
  const fora={};
  Object.keys(MEM_CONTRA).forEach(m=>{
    const v=memLer('metodos',m);
    if(v<MEM_CFG.limiarMetodo)return;
    MEM_CONTRA[m].forEach(id=>{ fora[id]=Math.max(fora[id]||0,v); });
  });
  const M=memoria();
  Object.keys(M.rotinas||{}).forEach(k=>{
    if(k.indexOf('comodo_')!==0)return;
    const v=memLer('rotinas',k);
    if(v<MEM_CFG.limiarMetodo)return;
    memContraDoComodo(+k.slice(7)).forEach(id=>{ fora[id]=Math.max(fora[id]||0,v); });
  });
  return fora;
}
/* O gancho que o §31 já chamava. Nunca devolve menos que 1: encarece o
   caminho fácil, não fecha nenhum. */
function pesoDaMemoria(a){
  if(!a||!a.id)return 1;
  const c=memContras()[a.id];
  if(!c)return 1;
  const h=(memoria().hostilidade||0);
  return 1+h*MEM_CFG.fatorContra*c;
}

/* ================= 32.2 · A ISCA =================
   O segundo comportamento: previsibilidade invertida.

   Quem resolve tudo com luz acesa nunca precisou do escuro. Então a
   casa apaga uma luz — em calmaria, não no meio do susto, e não dentro
   do vale de silêncio, que é reservado. O jogador vai buscar a
   lanterna. É armadilha, e é justa: teve piscada antes.

   Ela paga orçamento e passa pelo orquestrador como qualquer outro
   evento. Casa que arma cilada de graça é casa que trapaceia. */
/* A primeira versão disto barrava qualquer `ativas().length`, e com
   isso a isca ficou inalcançável: durante a invasão o id da criatura
   está sempre no ar, e é só durante a invasão que o relógio de turnos
   anda. Comportamento que nenhum teste de jogo real alcança é
   comportamento morto — o teste passava porque montava o estado à mão. */
function tensaoBaixa(){
  if(typeof orq!=='function')return false;
  const O=orq();
  if(O.turno<=0)return false;              /* fora de invasão não há turno */
  if(typeof emVale==='function'&&emVale())return false;
  if(O.cooldownGlobal!==0)return false;
  if((O.turno-(O.ultimoEvento||0))<MEM_CFG.turnosDeCalmaria)return false;
  const c=(typeof cena!=='undefined')?cena.casa:null;
  if(!c||c.monstro==null||typeof distancia!=='function')return false;
  return distancia(c.voce,c.monstro)>=MEM_CFG.distanciaCalmaria;
}
function iscaDisponivel(){
  const M=memoria();
  if((S.dia|0)-M.iscaEm<MEM_CFG.iscaCooldownNoites)return false;
  return memLer('metodos','luz')>MEM_CFG.limiarIsca;
}
/* o cômodo aceso mais perto de você: é o que vale a pena apagar */
function iscaAlvo(){
  if(typeof interruptor!=='function'||!cena.casa)return null;
  const eu=cena.casa.voce;
  const cand=(typeof vizinhos==='function'?vizinhos(eu):[]).concat([eu])
    .filter(id=>interruptor(id)&&(typeof luzLigadaEm!=='function'||luzLigadaEm(id)));
  if(!cand.length)return null;
  return rng().escolher(cand);
}
function armarIsca(){
  const alvo=iscaAlvo();
  if(alvo==null)return false;
  const M=memoria();
  M.iscaEm=S.dia|0;
  if(typeof acionarLuz==='function')acionarLuz(alvo);
  /* a LUMINARIAS já tem o nome escrito com o artigo certo ("lâmpada do
     quintal", "abajur na cabeceira"): montar a frase na mão daria
     "a luz do cozinha" no primeiro cômodo de nome feminino */
  const nome=(typeof LUMINARIAS!=='undefined'&&LUMINARIAS[alvo])
    ?LUMINARIAS[alvo].nome:'a luz do cômodo';
  if(typeof diz==='function'){
    diz('A '+nome+' pisca duas vezes e morre.','alerta');
    diz('Não foi o gerador. O gerador não mudou de som.','narr');
  }
  memCicatriz('isca','comodo_'+alvo);
  if(typeof marcarSujo==='function')marcarSujo();
  return true;
}
function talvezIsca(){
  if(!iscaDisponivel())return false;
  if(!tensaoBaixa())return false;
  if(typeof pedirPermissao!=='function')return false;
  const r=pedirPermissao('isca_escuridao');
  if(!r.ok)return false;
  const feito=armarIsca();
  if(!feito&&typeof encerrarAtiva==='function')
    encerrarAtiva('isca_escuridao','sem cômodo aceso pra apagar');
  return feito;
}

/* ================= 32.3 · O CICLO QUEBRADO =================
   O terceiro comportamento, e o mais barato de todos: nada.

   Quatro noites seguidas de invasão ensinam um ritmo. Na quinta, a casa
   não faz nada. Nenhum susto. Só silêncio. O jogador passa a noite
   inteira esperando, e é a espera que custa.

   Só funciona porque o jogador APRENDEU o ritmo — quebrar um ritmo que
   ninguém percebeu não é design, é bug com nome bonito. */
function memCicloQuebravel(){
  const M=memoria();
  if(M.seguidasComInvasao<MEM_CFG.cicloParaQuebrar)return false;
  if((S.dia|0)-M.cicloEm<MEM_CFG.cicloCooldownNoites)return false;
  return true;
}
if(typeof orqNovaNoite==='function'){
  const _memONN=orqNovaNoite;
  orqNovaNoite=function(silencioso){
    const O=_memONN.apply(this,arguments);
    try{
      if(memCicloQuebravel()){
        memoria().cicloEm=S.dia|0;
        O.noiteQuebrada=true;
        /* a noite inteira vira vale: é o silêncio como evento, levado
           ao extremo. Nada pede permissão porque nada é concedido. */
        O.vales=[{de:1,ate:999}];
      }else O.noiteQuebrada=false;
    }catch(e){}
    return O;
  };
}
/* a fala do silêncio. Sai uma vez, na noite quebrada, e diz o
   suficiente pro jogador entender que foi de propósito. */
async function falarSilencio(){
  if(typeof diz!=='function')return;
  diz('Nada bateu na porta.','sist');
  if(typeof pausa==='function')await pausa(1400);
  diz('Nenhum susto. Só silêncio.','narr');
  if(typeof pausa==='function')await pausa(1200);
  diz('Você fica acordado até de manhã esperando o que não veio.','narr');
}
if(typeof checarInvasao==='function'){
  const _memCI=checarInvasao;
  checarInvasao=async function(){
    let quebrada=false;
    try{ quebrada=!!(S.orquestrador&&S.orquestrador.noiteQuebrada); }catch(e){}
    const r=await _memCI.apply(this,arguments);
    if(quebrada){ try{ await falarSilencio(); }catch(e){} }
    return r;
  };
}

/* ================= A ISCA COMO ANOMALIA GOVERNADA ================= */
/* Ela entra no catálogo do §30 pelas mesmas regras de todo mundo:
   tell obrigatório, resolução possível, peso que sai do orçamento. */
if(typeof registrarAnomalia==='function'){
  registrarAnomalia({
    id:'isca_escuridao',
    nome:'a luz que apagou sozinha',
    categoria:'visual',
    raridade:4,
    peso:18,
    precondicoes:[
      ()=>iscaDisponivel(),
      ()=>iscaAlvo()!=null
    ],
    incompativelCom:['avaria_curto','avaria_fiacao'],
    requerCriatura:null,
    duracaoTurnos:[3,10],
    /* a piscada antes é o que separa cilada de punição */
    tell:{tipo:'piscar',intensidade:.55,turnosAntes:1},
    resolucoes:['acionar o interruptor','lanterna','fósforo'],
    custoErro:.35,
    consequencia(){ /* apagar a luz já É a consequência */ },
    cicatriz:false,
    pesoMemoria:.5,
    versao:1,
    fonte:{tabela:'MEMORIA',chave:'isca'}
  });
}

/* ================= OS OLHOS DA CASA =================
   Cada embrulho anota UM método. Nada de efeito colateral aqui dentro:
   se um destes estourar, a noite continua. */
if(typeof mover==='function'){
  const _memMV=mover;
  mover=async function(I,dest,rastejar){
    try{ memVer('metodos',rastejar?'rastejar':'correr'); }catch(e){}
    return _memMV.apply(this,arguments);
  };
}
if(typeof esconder==='function'){
  const _memES=esconder;
  esconder=async function(I){
    try{ memVer('metodos','esconder');
      if(cena.casa)memVer('rotinas','comodo_'+cena.casa.voce); }catch(e){}
    return _memES.apply(this,arguments);
  };
}
if(typeof bloquear==='function'){
  const _memBL=bloquear;
  bloquear=async function(I){
    try{ memVer('metodos','bloquear'); }catch(e){}
    return _memBL.apply(this,arguments);
  };
}
if(typeof escutar==='function'){
  const _memEC=escutar;
  escutar=async function(I){
    try{ memVer('metodos','escutar'); }catch(e){}
    return _memEC.apply(this,arguments);
  };
}
if(typeof usarLanterna==='function'){
  const _memLA=usarLanterna;
  usarLanterna=async function(I){
    try{ memVer('metodos','lanterna'); }catch(e){}
    return _memLA.apply(this,arguments);
  };
}
/* a luz acesa não é ação, é hábito: mede-se no fim da noite, contando
   quantas luminárias ficaram ligadas */
function memVerLuz(){
  if(typeof LUMINARIAS==='undefined'||typeof interruptor!=='function')return 0;
  const ids=Object.keys(LUMINARIAS);
  if(!ids.length)return 0;
  const acesas=ids.filter(id=>interruptor(id)).length;
  if(acesas/ids.length>=.5)memVer('metodos','luz');
  return acesas/ids.length;
}
/* o cômodo pisado vira rotina */
if(typeof irPara==='function'){
  const _memIP=irPara;
  irPara=function(id,semTexto){
    try{ memVer('rotinas','comodo_'+id); }catch(e){}
    return _memIP.apply(this,arguments);
  };
}
/* `S.ultimaNoite` é apagado pelo resumo da manhã, então no anoitecer
   seguinte ele já não existe. A marca de "teve bicho" é própria. */
if(typeof invasao==='function'){
  const _memIV=invasao;
  invasao=async function(){
    try{ memoria()._teveInvasao=1; }catch(e){}
    return _memIV.apply(this,arguments);
  };
}
/* escapar é ponto forte; apanhar é fraqueza */
if(typeof escapou==='function'){
  const _memEP=escapou;
  escapou=async function(I){
    try{ memVer('pontosFortes','fuga');
      if(I&&I.bicho)memVer('pontosFortes','contra_'+I.bicho.id); }catch(e){}
    return _memEP.apply(this,arguments);
  };
}
if(typeof pegarMal==='function'){
  const _memPM=pegarMal;
  pegarMal=function(){
    try{ memVer('fraquezas','contato'); }catch(e){}
    return _memPM.apply(this,arguments);
  };
}
/* o fechamento: a noite acabou, a média se move */
if(typeof anoitecer==='function'){
  const _memAN=anoitecer;
  anoitecer=async function(){
    try{
      memVerLuz();
      const teve=!!memoria()._teveInvasao;
      memoria()._teveInvasao=0;
      memFecharNoite(teve);
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'memFecharNoite'); }
    return _memAN.apply(this,arguments);
  };
}
/* a isca tenta em toda calmaria de turno */
if(typeof orqTurno==='function'){
  const _memOT=orqTurno;
  orqTurno=function(){
    const t=_memOT.apply(this,arguments);
    try{ talvezIsca(); }catch(e){}
    return t;
  };
}
/* marca o turno do último evento, que é o que define calmaria */
if(typeof pedirPermissao==='function'){
  const _memPP=pedirPermissao;
  pedirPermissao=function(id,opcoes){
    const r=_memPP.apply(this,arguments);
    try{ if(r&&r.ok)orq().ultimoEvento=orq().turno; }catch(e){}
    return r;
  };
}

/* ================= PERSISTÊNCIA ================= */
if(typeof salvar==='function'){
  const _memSV=salvar;
  salvar=function(){
    _memSV.apply(this,arguments);
    try{
      /* o bloco ANEXA a um save; nunca CRIA um. Se a funcao base
         desistiu (partida que ainda nao comecou), nao ha o que
         anexar — e criar aqui ressuscitaria o save fantasma. */
      const cru=localStorage.getItem(CHAVE);
      if(!cru)return;
      const d=JSON.parse(cru);
      d.memoriaAnomalias=S.memoriaAnomalias||null;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/mem'); }
  };
}
/* save antigo não tem memória: a casa começa sem saber nada de você, que
   é exatamente o estado correto. Nada a migrar. */
memoria();

/* ================= DEPURAÇÃO ================= */
function memEstado(){
  const M=memoria();
  const resumo=b=>{
    const o={};
    Object.keys(M[b]||{}).forEach(id=>{
      o[id]={v:M[b][id].v, n:M[b][id].n,
        conf:+memConf(b,id).toFixed(2), vale:+memLer(b,id).toFixed(2)};
    });
    return o;
  };
  return {noites:M.noites, comInvasao:M.noitesComInvasao,
    seguidas:M.seguidasComInvasao, hostilidade:M.hostilidade,
    metodos:resumo('metodos'), rotinas:resumo('rotinas'),
    fraquezas:resumo('fraquezas'), pontosFortes:resumo('pontosFortes'),
    cicatrizes:M.cicatrizes.slice(),
    contras:memContras(),
    isca:{disponivel:iscaDisponivel(), ultima:M.iscaEm,
      calmaria:(typeof tensaoBaixa==='function')?tensaoBaixa():null},
    ciclo:{quebravel:memCicloQuebravel(), ultima:M.cicloEm,
      quebradaAgora:!!(S.orquestrador&&S.orquestrador.noiteQuebrada)}};
}
/* atalho pra ver a casa aprender sem jogar 20 noites */
function memEnsinar(balde,id,noites){
  for(let i=0;i<(noites||8);i++)memAplicar(balde,id,1);
  return memEstado()[balde][id];
}
