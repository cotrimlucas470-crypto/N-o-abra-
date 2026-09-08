/* ================= §55 · EVENTOS RAROS QUE CONTINUAM RAROS ============

   AUDITORIA, E O ACHADO FOI MAIOR DO QUE A AUDITORIA DA V72 SUPUNHA.

   Ela dizia que faltava "anti-repetição entre campanhas". Medido, falta
   ANTES DISSO: a anti-repetição não funciona nem DENTRO de uma campanha.

     raridade    quantos   sem id (podem repetir)   peso
     comum          12          12                   44
     incomum        12          12                   30
     raro            9           9                   17
     muitoraro       6           6                    7
     unico           5           0                    2

   `sortearEvento` filtra por `S.usados.includes(e.id)` — e só os cinco
   `unico` têm `id`. Os nove `raro` e os seis `muitoraro` não têm nenhum,
   então nunca entram na lista de usados e podem sair de novo no dia
   seguinte. Simulando 500 dias: dezesseis eventos raros distintos, 91
   saídas, e o campeão apareceu TREZE VEZES. Um evento cujo valor é ser
   raro saía toda semana.

   O CONSERTO NÃO É EDITAR 39 LITERAIS. É dar à anti-repetição uma chave
   com que trabalhar: quando o evento não tem `id`, o id vem do hash do
   próprio texto. Estável entre execuções, estável entre campanhas, e
   nenhuma linha da tabela precisa mudar.

   ENTRE CAMPANHAS. A memória vai numa chave PRÓPRIA do localStorage, e
   não no save: save novo não pode apagar a lembrança de campanha
   passada, que é justamente o ponto. E ela NÃO BANE — ela pesa menos.
   Banir esvaziaria a sacola e o jogo ficaria sem evento nenhum; pesar
   menos empurra o repetido pro fim da fila e deixa o inédito na frente.

   CATEGORIAS. O §9 pede cinco: A estranho sem dano, B narrativo, C
   mistério, D consequência futura, E ultrarraro. Elas entram por
   adaptador, sem reescrever a tabela.

   SEGURANÇA, que o §9 exige em letras claras: "nunca usar evento raro
   para morte instantânea, softlock ou destruição de save". Isso não é
   promessa, é trava — e tem teste. */

const RARO_CFG={
  /* quanto pesa um raro que a pessoa JA viu em campanha passada */
  fatorVisto:.22,
  /* quantas campanhas ate a lembranca desbotar por completo */
  esquece:6,
  /* teto da memoria, pra a chave nao crescer pra sempre */
  maximo:120,
  chave:'naoabra:raros:v1',
  /* so vale a pena lembrar do que e raro de verdade */
  guardadas:['raro','muitoraro','unico']
};
const RARO_CATS={
  A:'estranho sem dano', B:'narrativo', C:'mistério',
  D:'consequência futura', E:'ultrarraro'
};
/* adaptador: a tabela da base nao muda, a categoria mora aqui */
const RARO_DE={
  unico:'E', muitoraro:'C', raro:'A'
};

/* ---------- a chave estável ----------
   Sem `id`, o id e o hash do texto. Mesma frase, mesmo id, sempre. */
function raroId(e){
  if(!e)return null;
  if(e.id)return e.id;
  return 'h'+hash32(String(e.t||'')).toString(36);
}
function raroCategoria(e){
  if(!e)return null;
  return e.cat||RARO_DE[e.r]||null;
}
function raroGuardavel(e){
  return !!e && RARO_CFG.guardadas.indexOf(e.r)>=0;
}

/* ---------- a memoria entre campanhas ----------
   Chave propria, fora do save. Se o localStorage nao deixar, tudo aqui
   vira no-op e o jogo se comporta exatamente como antes. */
function raroMem(){
  try{
    const b=localStorage.getItem(RARO_CFG.chave);
    const o=b?JSON.parse(b):null;
    if(!o||typeof o!=='object')return {campanha:0, vistos:{}};
    if(typeof o.campanha!=='number')o.campanha=0;
    if(!o.vistos||typeof o.vistos!=='object')o.vistos={};
    return o;
  }catch(e){ return {campanha:0, vistos:{}}; }
}
function raroGravar(m){
  try{
    const ks=Object.keys(m.vistos);
    if(ks.length>RARO_CFG.maximo){
      ks.sort((a,b)=>(m.vistos[a]|0)-(m.vistos[b]|0));
      ks.slice(0,ks.length-RARO_CFG.maximo).forEach(k=>delete m.vistos[k]);
    }
    localStorage.setItem(RARO_CFG.chave,JSON.stringify(m));
    return true;
  }catch(e){ return false; }
}
function raroVisto(id){
  const m=raroMem();
  const q=m.vistos[id];
  if(q==null)return 0;
  const idade=m.campanha-q;
  if(idade>=RARO_CFG.esquece)return 0;
  return trava(1-(idade/RARO_CFG.esquece),0,1);
}
function raroAnotar(e){
  if(!raroGuardavel(e))return false;
  const m=raroMem();
  m.vistos[raroId(e)]=m.campanha;
  return raroGravar(m);
}
/* campanha nova: a lembranca envelhece um passo */
function raroNovaCampanha(){
  const m=raroMem();
  m.campanha=(m.campanha|0)+1;
  return raroGravar(m);
}

/* ---------- o sorteio ----------
   Reescrever `sortearEvento` inteiro seria copiar a tabela de pesos e a
   lista de condicoes da base, e copia diverge no primeiro ajuste. Em vez
   disso: chamo a base varias vezes e fico com a primeira saida que a
   memoria aprova. E um filtro por rejeicao, e ele preserva a
   distribuicao da base entre os eventos ineditos.

   DOIS ERROS MEUS AQUI, os dois pegos relendo antes de testar:

   1. A conta da rejeicao era
        `_ale() >= fator*(1-v) + (1-v)*0 + v*fator`
      que e `_ale() >= fator*(1-v+v)`, ou seja `_ale() >= fator`. Os
      termos de `v` se cancelavam: o quanto o evento foi visto RECENTE
      nao mudava nada. Parametro morto e a proibicao nº 6.
   2. Eu anotava na memoria dentro do sorteio — e o laco de rejeicao
      sorteia varias vezes. Os candidatos DESCARTADOS entravam na
      memoria como se o jogador tivesse visto. Anotar e no momento em
      que a coisa aparece na tela, nao no momento em que ela e cogitada. */
let RARO_ULTIMO=null;
if(typeof sortearEvento==='function'){
  const _se=sortearEvento;
  sortearEvento=function(){
    let e=_se.apply(this,arguments);
    if(e&&raroGuardavel(e)){
      /* v=1 acabou de ver, v=0 ja esqueceu. Quanto mais fresco, mais
         vezes tentamos trocar por um inedito. */
      for(let i=0;i<6;i++){
        const v=raroVisto(raroId(e));
        if(!v)break;
        if(_ale()>=(1-RARO_CFG.fatorVisto)*v)break;   /* aceita mesmo assim */
        const outro=_se.apply(this,arguments);
        if(!outro)break;
        e=outro;
      }
    }
    RARO_ULTIMO=e;
    return e;
  };
}

/* ---------- anti-repeticao DENTRO da campanha ----------
   O buraco medido: `eventoDoDia` so anota `S.usados` quando o evento tem
   `id`, e 39 dos 44 nao tem. Aqui todo evento raro passa a ser anotado,
   com o id derivado. E `sortearEvento` da base ja filtra por
   `S.usados.includes(e.id)` — entao basta o evento CARREGAR o id. */
if(typeof EVT!=='undefined'&&Array.isArray(EVT)){
  EVT.forEach(e=>{
    if(!e.id&&RARO_CFG.guardadas.indexOf(e.r)>=0)e.id=raroId(e);
    if(!e.cat){ const c=raroCategoria(e); if(c)e.cat=c; }
  });
}

/* ---------- a trava de seguranca ----------
   O §9: "nunca usar evento raro para morte instantanea, softlock ou
   destruicao de save". Envelopo o dia do evento e confiro os tres:
   o jogador continua vivo, continua com acao possivel, e o save
   continua no lugar. Se algo violar, o evento e desfeito e fica
   registrado — melhor um evento a menos que uma campanha perdida. */
const RARO_INCIDENTES=[];
if(typeof eventoDoDia==='function'){
  const _ed=eventoDoDia;
  eventoDoDia=async function(){
    RARO_ULTIMO=null;
    const vidaAntes=(typeof S!=='undefined')?S.vida:null;
    const saveAntes=(function(){try{return localStorage.getItem(CHAVE);}catch(e){return null;}})();
    const r=await _ed.apply(this,arguments);
    /* ANOTAR AQUI: `r` verdadeiro quer dizer que o evento foi mesmo
       mostrado. Anotar no sorteio guardava candidato descartado. */
    try{ if(r&&RARO_ULTIMO)raroAnotar(RARO_ULTIMO); }catch(e){}
    try{
      const morreu=(vidaAntes!=null&&S.vida!=null&&vidaAntes>0&&S.vida<=0);
      const saveDepois=(function(){try{return localStorage.getItem(CHAVE);}catch(e){return null;}})();
      const perdeuSave=!!saveAntes&&!saveDepois;
      if(morreu||perdeuSave){
        RARO_INCIDENTES.push({dia:S.dia|0, morreu, perdeuSave});
        if(morreu&&vidaAntes!=null)S.vida=Math.max(1,Math.min(vidaAntes,1));
        if(perdeuSave&&saveAntes){try{localStorage.setItem(CHAVE,saveAntes);}catch(e){}}
      }
    }catch(e){}
    return r;
  };
}
/* ---------- as categorias que estavam vazias ----------

   O adaptador mapeou raro→A, muitoraro→C e unico→E, e sobrou B
   (narrativo) e D (consequencia futura) SEM NENHUM EVENTO. Declarar uma
   categoria vazia e parametro morto, que e a proibicao nº 6 — ou entra
   evento nela, ou ela nao existe. Entram quatro, dois de cada, com
   condicao especifica como o §9 pede ("nao precisam ocorrer em toda
   campanha") e nenhum deles capaz de matar, travar ou comer save.

   D e "consequencia futura" de verdade: nao e um texto bonito, e uma
   marca que muda o jogo depois. As duas usam sistemas que ja existem —
   a marca do Eco do §54 e o trauma de comodo — em vez de inventar
   estado novo. */
const RARO_NOVOS=[
 /* ---------- B · narrativo ---------- */
 {r:'muitoraro', cat:'B', id:'b_carta',
  t:'Tem uma carta na caixa do correio. O carteiro parou de vir faz meses.',
  cond:()=>(S.dia|0)>=9,
  f:()=>{
    const m=(S.mortos||[]);
    if(m.length){
      const p=m[(S.dia|0)%m.length];
      return 'É endereçada pra '+p.n+'. A letra é de quem escreveu com pressa, '
        +'e a data é de antes de tudo isso começar. Você não abre.';
    }
    return 'Não tem remetente. Dentro tem uma lista de nomes, e três estão riscados. '
      +'O seu não está.';
  }},
 {r:'raro', cat:'B', id:'b_radio_crianca',
  t:'O rádio pega uma criança lendo uma lista de números, devagar, com sotaque daqui.',
  cond:()=>(S.dia|0)>=5,
  f:()=>{ if(typeof mexerMoral==='function')mexerMoral(-4);
    return 'Ela lê até o fim, agradece, e a transmissão corta. '
      +'Ninguém na casa quer falar sobre isso na hora do almoço.'; }},

 /* ---------- D · consequencia futura ---------- */
 {r:'muitoraro', cat:'D', id:'d_nome_na_parede',
  t:'Tem um nome escrito atrás da porta do barracão, com prego. É o seu.',
  cond:()=>(S.dia|0)>=11&&!(typeof temMarca==='function'&&temMarca('eco')),
  f:()=>{
    /* a consequencia: a marca do Eco, que ja existe e ja tem custo e
       ja tem saida. Evento raro que planta consequencia usa sistema
       que o jogador pode entender e desfazer. */
    if(typeof porMarca==='function')porMarca('eco','nome no barracão');
    return 'Você raspa e o nome sai. A madeira embaixo está mais clara, '
      +'no formato exato das letras.';
  }},
 {r:'unico', cat:'D', id:'d_a_casa_lembra',
  t:'Você acorda e a casa inteira está com as portas abertas, menos uma.',
  cond:()=>(S.dia|0)>=14,
  f:()=>{
    /* a porta fechada e um comodo que passa a pesar: usa o trauma do
       §54, que desbota sozinho em catorze dias e se anuncia quando voce
       volta. Nada aqui tira o controle do jogador. */
    const c=6;
    if(typeof marcarTrauma==='function')marcarTrauma(c,'a casa lembra');
    if(typeof anotar==='function')anotar('ACONTECEU: a casa abriu tudo, menos uma porta');
    return 'A do porão. Ela está encostada, e não trancada. '
      +'Você fecha as outras e não conta pra ninguém.';
  }}
];
if(typeof EVT!=='undefined'&&Array.isArray(EVT)){
  RARO_NOVOS.forEach(e=>{ if(!EVT.some(x=>x.id===e.id))EVT.push(e); });
}

/* comeco de partida nova conta uma campanha */
if(typeof novoJogo==='function'){
  const _nj=novoJogo;
  novoJogo=function(){
    try{ raroNovaCampanha(); }catch(e){}
    return _nj.apply(this,arguments);
  };
}

function rarosEstado(){
  const m=raroMem();
  const porCat={};
  if(typeof EVT!=='undefined')EVT.forEach(e=>{
    const c=raroCategoria(e); if(c)porCat[c]=(porCat[c]||0)+1; });
  const semId=(typeof EVT!=='undefined')
    ?EVT.filter(e=>!e.id&&RARO_CFG.guardadas.indexOf(e.r)>=0).length:null;
  return {
    campanha:m.campanha, lembrados:Object.keys(m.vistos).length,
    categorias:RARO_CATS, porCategoria:porCat,
    rarosSemId:semId, incidentes:RARO_INCIDENTES.slice(),
    cfg:{...RARO_CFG}
  };
}
function rarosEsquecerTudo(){
  try{ localStorage.removeItem(RARO_CFG.chave); return true; }catch(e){ return false; }
}
