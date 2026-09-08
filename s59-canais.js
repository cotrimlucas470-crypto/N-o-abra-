/* ================= §59 · OS TRÊS CANAIS QUE FALTAVAM ===================

   O ULTRA_PROMPT da v71 pede cinco invasores. Três deles — o Imitante, o
   Cata-vozes e o Rastejante de Parede — colidem com o `imitador`, o
   `coro` e o `rastejante` que já existem, e o mesmo documento proíbe
   "criar uma segunda versão paralela de sistemas já existentes".

   A auditoria escolheu a segunda regra e declarou a escolha em vez de
   escondê-la no código. Este bloco é a consequência: em vez de três
   sósias, as três criaturas ganham o canal que era genuinamente novo em
   cada pedido. Uma fonte de verdade, três comportamentos a mais.

   O que era genuinamente novo em cada, segundo a auditoria:

     Imitante            "uma inconsistência aprendível que MUDA de
                         encontro para encontro"
     Cata-vozes          "reproduzir ruídos que o JOGADOR produziu antes"
     Rastejante de Parede "marcas que somem devagar"

   E os canais secundários da tabela `AME_CANAIS`, que a etapa 2 deixou
   vazios de propósito para que desse pra medir qual etapa mudou o quê. */

const CAN_CFG={
  /* quantos ruidos do jogador o coro guarda pra devolver depois */
  ecosMax:5,
  /* de quantos em quantos turnos ele devolve um, quando esta cacando */
  ecoCada:4,
  /* quantos dias uma marca leva pra sumir */
  marcaDias:9,
  /* a partir de quantos dias ela ja aparece desbotada */
  marcaDesbota:5
};

/* ---------- os canais secundarios ----------
   A etapa 2 preencheu `AME_CANAIS` descrevendo exatamente o que o
   codigo fazia, com `tambem:[]` em todas. Aqui os secundarios entram —
   e e por isso que as duas etapas sao separadas: o `ameacateste`
   consegue dizer que a etapa 2 nao mudou nada, e este bloco assume que
   mudou. */
if(typeof AME_CANAIS!=='undefined'){
  AME_CANAIS.imitador.tambem   =['som'];        /* ouve, e a resposta so afina a mira */
  AME_CANAIS.coro.tambem       =['resposta'];   /* as duas metades tambem leem resposta */
  AME_CANAIS.rastejante.tambem =['passagem'];   /* le vao apertado, alem do chao */
}

/* ================= 1 · O IMITADOR ERRA UMA COISA POR ENCONTRO =========

   O `imitador` ja chama com voz conhecida e ja tem inconsistencias
   DECLARADAS na tabela de sinais (`Sinais.inconsistenciaDe`). O que
   faltava e que a inconsistencia fosse UMA, e OUTRA a cada encontro:
   assim o jogador nao decora qual e — ele aprende que sempre existe uma,
   e passa a procurar. Isso e conhecimento transferivel, que e o que o
   briefing chama de "aprendivel".

   A escolha e semeada por dia: o mesmo dia da o mesmo erro, entao dois
   jogadores com a mesma semente veem a mesma coisa, e recarregar nao
   sorteia de novo. */
const IMI_ERROS=[
  {id:'atraso',   t:'A voz chama de novo, e o intervalo entre um chamado e o '
                    +'outro é sempre o mesmo. Gente não repete no compasso.'},
  {id:'lugar',    t:'Chamou do mesmo ponto três vezes. Quem procura você anda '
                    +'enquanto chama.'},
  {id:'nome',     t:'Ela usa o seu nome inteiro. Ninguém aqui dentro te chama '
                    +'pelo nome inteiro.'},
  {id:'respira',  t:'A frase é comprida demais pra caber num fôlego só, e '
                    +'mesmo assim coube.'},
  {id:'gente',    t:'A voz é de quem está dormindo no cômodo ao lado. Você '
                    +'conferiu, e ela está lá, dormindo.'}
];
function imiErroDoDia(I){
  if(!I||!I.bicho||I.bicho.id!=='imitador')return null;
  const d=(S.dia|0)+((I.imiSemente|0));
  return IMI_ERROS[Math.abs(hash32('imi#'+d))%IMI_ERROS.length];
}
/* cada encontro pega um erro proprio, e nao o mesmo do dia inteiro */
if(typeof anomIniciar==='function'){
  const _ai=anomIniciar;
  anomIniciar=function(I){
    const r=_ai.apply(this,arguments)||I;
    try{
      if(r&&r.bicho&&r.bicho.id==='imitador'){
        r.imiSemente=(r.imiSemente|0)||( (S.dia|0)*7+((S.hora|0)*3)+1 );
        r.imiContou=false;
      }
    }catch(e){}
    return r;
  };
}
/* o erro aparece quando ele chama — junto do chamado, nao numa tela
   separada: e o chamado que esta errado */
if(typeof escutar==='function'){
  const _ec=escutar;
  escutar=async function(I){
    const r=await _ec.apply(this,arguments);
    try{
      const e=imiErroDoDia(I);
      if(e&&!I.imiContou){
        I.imiContou=true;
        if(typeof diz==='function')diz('— '+e.t,'alerta');
      }
    }catch(err){}
    return r;
  };
}

/* ================= 2 · O CORO DEVOLVE O SEU PRÓPRIO BARULHO ===========

   Isto e o unico pedaco do "Cata-vozes" que nao existia. As duas metades
   do `coro` ja vao pro mesmo barulho; o que elas nao faziam era GUARDAR
   o barulho que voce fez e devolve-lo de outro comodo, como isca.

   A assinatura que o jogador aprende: se voce ouve exatamente o que voce
   acabou de fazer, vindo de onde voce nao esta, e ele. Barulho seu nao
   volta sozinho.

   Os ecos vivem no `I` do encontro — dado puro, sem funcao nem no de
   DOM, entao o espelho de `S.inv` continua valendo. */
if(typeof anomOuviu==='function'){
  const _ao=anomOuviu;
  anomOuviu=function(I,onde,forca){
    try{
      if(I&&I.bicho&&I.bicho.id==='coro'&&onde!=null){
        if(!Array.isArray(I.ecos))I.ecos=[];
        I.ecos.push({onde:onde|0, forca:+(forca||1)});
        while(I.ecos.length>CAN_CFG.ecosMax)I.ecos.shift();
      }
    }catch(e){}
    return _ao.apply(this,arguments);
  };
}
function coroDevolve(I){
  if(!I||!I.bicho||I.bicho.id!=='coro')return null;
  if(!Array.isArray(I.ecos)||!I.ecos.length)return null;
  const c=cena.casa; if(!c)return null;
  /* escolhe um eco de um comodo que NAO e o seu agora: devolver o
     barulho no lugar em que voce esta nao engana ninguem */
  const bons=I.ecos.filter(e=>e.onde!==c.voce);
  if(!bons.length)return null;
  const e=bons[_inteiro(bons.length)];
  I.ecoUltimo={onde:e.onde, turno:I.faseTurnos|0};
  /* o artigo vem da tabela do §58, que e propriedade da planta. Eu tinha
     chutado o genero pela primeira letra aqui e saiu "do lado do
     cozinha" — heuristica esperta que erra e pior que tabela chata. */
  const onde=(typeof comodoCom==='function')
    ? comodoCom(e.onde,'do')
    : 'de outro cômodo';
  return 'Veio um barulho '+(e.forca>=.9?'igualzinho ao que você fez':'parecido com o seu')
    +', do lado '+onde+'. Você não está lá.';
}
if(typeof anomAvancar==='function'){
  const _aa=anomAvancar;
  anomAvancar=function(I){
    const out=_aa.apply(this,arguments)||[];
    try{
      if(I&&I.bicho&&I.bicho.id==='coro'
         &&(I.fase==='SUSPEITA'||I.fase==='CACA')
         &&((I.faseTurnos|0)%CAN_CFG.ecoCada===0)){
        const t=coroDevolve(I);
        if(t)out.push(t);
      }
    }catch(e){}
    return out;
  };
}

/* ================= 3 · AS MARCAS SOMEM DEVAGAR =======================

   `deixarMarca` ja existe e ja guarda ate seis marcas, com o texto certo
   por criatura. O que faltava e o tempo: elas ficavam ate serem
   empurradas pra fora da lista, entao uma trilha do dia 3 continuava
   fresca no dia 30.

   Agora elas envelhecem: desbotam depois de cinco dias e somem depois de
   nove. Isso vale pra todas, porque marca e propriedade da CASA e nao de
   uma criatura — e e o que faz a marca virar informacao com prazo, que e
   o que o pedido do "Rastejante de Parede" queria dizer. */
function marcaIdade(m){ return (S.dia|0)-((m&&m.dia)|0); }
function marcaViva(m){ return marcaIdade(m)<CAN_CFG.marcaDias; }
function marcaDesbotada(m){ return marcaIdade(m)>=CAN_CFG.marcaDesbota; }
function limparMarcasVelhas(){
  if(typeof marcas!=='function')return 0;
  const M=marcas();
  const antes=M.length;
  for(let i=M.length-1;i>=0;i--)if(!marcaViva(M[i]))M.splice(i,1);
  if(M.length!==antes&&typeof marcarSujo==='function')marcarSujo();
  return antes-M.length;
}
/* some ao virar o dia, e o texto avisa quando ja esta velha */
if(typeof anoitecer==='function'){
  const _an=anoitecer;
  anoitecer=async function(){
    const r=await _an.apply(this,arguments);
    try{ limparMarcasVelhas(); }catch(e){}
    return r;
  };
}
if(typeof deixarMarca==='function'){
  const _dm=deixarMarca;
  deixarMarca=function(I){
    limparMarcasVelhas();
    return _dm.apply(this,arguments);
  };
}

function canaisEstado(){
  const M=(typeof marcas==='function')?marcas():[];
  return {
    canais:(typeof AME_CANAIS!=='undefined')
      ?Object.fromEntries(Object.keys(AME_CANAIS).map(k=>[k,AME_CANAIS[k].tambem.slice()]))
      :{},
    errosDoImitador:IMI_ERROS.map(e=>e.id),
    marcas:M.map(m=>({onde:m.onde, dia:m.dia, idade:marcaIdade(m),
      viva:marcaViva(m), desbotada:marcaDesbotada(m)})),
    cfg:{...CAN_CFG}
  };
}
