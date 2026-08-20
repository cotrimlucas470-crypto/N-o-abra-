/* ============ §25 — CURVA DE DIFICULDADE ============

   A REGRA, LITERAL
   ----------------
   · redução permanente global de 20% → linha de base 0.80
   · dia 1 começa em 0.60 (40% abaixo do original)
   · sobe gradualmente de 0.60 até 0.80 conforme os dias
   · SATURA em 0.80 e para. Nunca volta a 1.00, nunca passa de 0.80.

   O multiplicador é ÚNICO e mora aqui. Nenhum outro lugar do jogo
   calcula dificuldade por conta própria.

   A ARMADILHA QUE QUASE ME PEGOU
   ------------------------------
   Multiplicar tudo por 0.60 "pra facilitar" está errado em dois casos,
   e aplicar cego teria deixado o jogo MAIS difícil:

     · fôlego na invasão — quantos encontros você aguenta. Menos
       dificuldade tem de dar MAIS fôlego, não menos.
     · tempo de reação — janela maior é mais fácil.

   Pra esses existe `difInverso()`. Está separado de propósito, com nome
   diferente, pra ninguém aplicar o errado por distração.

   SOBRE "TEMPO DE REAÇÃO EXIGIDO"
   ------------------------------
   Foi pedido que o multiplicador entrasse aí também. ELE NÃO EXISTE
   NESTE JOGO: não há nenhuma decisão com prazo. O jogo é de menu e
   espera indefinidamente pelo toque — a varredura achou um único
   `setTimeout` resolvendo promessa, e é o vigia anti-travamento, não
   uma janela de reação. A tela do resgate diz "você tem uns quarenta
   segundos pra decidir", mas é texto: não há contagem nenhuma.
   Está declarado em vez de fingido. Se um dia existir decisão com
   prazo, ela usa `difInverso()` e nada mais precisa mudar.
   ======================================================================= */

const DIF_CFG={
  /* onde o dia 1 começa. 0.60 = 40% abaixo do original.
     Aumentar deixa o começo mais duro; diminuir deixa mais manso. */
  inicio: 0.60,

  /* teto permanente. 0.80 = a redução global de 20% que nunca sai.
     Aumentar aproxima do jogo original; NUNCA ponha acima de 1.00. */
  teto: 0.80,

  /* em que DIA se encosta no teto — dia 12, não "12 dias depois do dia
     1". A conta usa `diasAteTeto-1` justamente por isso: o dia 1 é o
     começo da rampa, não o primeiro passo dela. Maior = rampa mais
     longa e o jogador tem mais tempo antes do jogo endurecer. */
  diasAteTeto: 12,

  /* 'linear' sobe em linha reta; 'suave' sobe devagar no começo e
     acelera no fim (smoothstep), que dá mais fôlego nos primeiros dias
     sem alongar a rampa inteira. */
  curva: 'suave',

  /* piso e teto absolutos de segurança. Nenhum caminho, nem save
     adulterado nem bug de conta, pode devolver valor fora daqui. */
  minAbsoluto: 0.60,
  maxAbsoluto: 0.80
};

/* ---------- a curva ----------
   `dia` 1 devolve exatamente DIF_CFG.inicio; `dia` >= diasAteTeto
   devolve exatamente DIF_CFG.teto. Entre os dois, interpola.

   Esta frase era mentira até a v59: a conta dividia por `diasAteTeto`
   e o teto só chegava no dia 13. Ninguém percebeu porque a asserção do
   difteste comparava `t[diasAteTeto]` com `t[diasAteTeto-1+1]` — os
   dois são o MESMO índice, então ela passava sempre, medindo nada. */
function dificuldadeNoDia(dia){
  const d=Number(dia);
  /* Duas categorias diferentes, e a distinção é de propósito — o teste
     pegou elas se comportando de forma contraditória:

       · NÃO É NÚMERO (NaN, texto, undefined, Infinity) → é save
         corrompido, não é um dia. Cai no dia 1, que é o mais fácil:
         diante de estado quebrado, o benefício é do jogador.
       · É NÚMERO, mas absurdo (1e9) → é um dia de verdade, ainda que
         improvável. Satura no teto, como qualquer dia tardio.

     `Infinity` entra na primeira: não é um dia, é um sintoma. */
  const n=(isFinite(d)&&d>=1)?d:1;
  const total=Math.max(1,DIF_CFG.diasAteTeto-1);
  let t=(n-1)/total;                       /* 0 no dia 1 */
  if(t<0)t=0; if(t>1)t=1;
  if(DIF_CFG.curva==='suave')t=t*t*(3-2*t);   /* smoothstep */
  const v=DIF_CFG.inicio+(DIF_CFG.teto-DIF_CFG.inicio)*t;
  /* a trava final é dupla de propósito: a fórmula já não passa do teto,
     mas config editada errado não pode vazar pro jogo */
  return Math.min(DIF_CFG.maxAbsoluto,Math.max(DIF_CFG.minAbsoluto,v));
}

/* o multiplicador de agora. É ISTO que o resto do jogo consulta. */
function dif(){ return dificuldadeNoDia((typeof S!=='undefined'&&S.dia)||1); }

/* pra grandezas em que MENOS dificuldade significa MAIS do valor:
   fôlego, janela de tempo, margem de erro. 0.60 vira ~1.67. */
function difInverso(){ return 1/dif(); }

/* ================= OS PONTOS DE APLICAÇÃO =================
   Cada função do jogo é embrulhada AQUI e SÓ AQUI, uma vez cada. Se
   você precisar de dificuldade em outro lugar, chame `dif()` — nunca
   multiplique de novo um valor que já passou por um destes cinco.

   O registro abaixo é lido pelo teste, que prova que cada função tem
   exatamente um embrulho e que o valor não é multiplicado duas vezes. */
const DIF_PONTOS=[
  {fn:'riscoInvasao', o:'frequência das anomalias', modo:'direto'},
  {fn:'escassez',     o:'escassez de recursos',     modo:'direto'},
  {fn:'pegarMal',     o:'dano recebido',            modo:'direto'},
  {fn:'gastoComida',  o:'custo de fome',            modo:'direto'},
  {fn:'folegoPorta',  o:'agressividade suportada',  modo:'inverso'}
];
const _difEmbrulhado={};
function embrulharUmaVez(nome,fn){
  if(_difEmbrulhado[nome]){
    console.warn('[não abra] '+nome+' já tinha embrulho de dificuldade; ignorado');
    return false;
  }
  _difEmbrulhado[nome]=true;
  return fn();
}

/* 1 · FREQUÊNCIA DAS ANOMALIAS
   `riscoInvasao` já vem embrulhado uma vez pelo bloco da ganância
   (index.html:17527). Este é o segundo embrulho e o último — ele
   multiplica o resultado FINAL, depois da ganância, uma vez só. */
if(typeof riscoInvasao==='function')embrulharUmaVez('riscoInvasao',()=>{
  const _ri=riscoInvasao;
  riscoInvasao=function(){ return trava(_ri.apply(this,arguments)*dif(),0,.95); };
  return true;
});

/* 2 · ESCASSEZ DE RECURSOS
   `escassez` sobe de 0 a 0.92 conforme os dias e as mortes. Multiplicar
   por 0.60 significa: a cidade demora mais pra secar. */
if(typeof escassez==='function')embrulharUmaVez('escassez',()=>{
  const _es=escassez;
  escassez=function(){ return trava(_es.apply(this,arguments)*dif(),0,.92); };
  return true;
});

/* 3 · DANO RECEBIDO
   O dano deste jogo não é um número de vida: é um MAL que dura N dias e
   cobra custo enquanto dura. Menos dificuldade = o mal dura menos.
   Piso de 1 dia: ferimento não pode virar zero e sumir na hora, senão
   apanhar deixa de significar alguma coisa. */
if(typeof pegarMal==='function')embrulharUmaVez('pegarMal',()=>{
  const _pm=pegarMal;
  pegarMal=function(id,alvo,porque){
    const m=_pm.call(this,id,alvo,porque);
    if(m&&typeof m.dias==='number')
      m.dias=Math.max(1,Math.round(m.dias*dif()));
    return m;
  };
  return true;
});

/* 4 · CUSTO DE FOME
   Piso de 1: a casa sempre come alguma coisa. Sem o piso, com poucos
   moradores o gasto arredondaria pra zero e comida deixaria de ser
   problema — que é o oposto de "20% mais fácil". */
if(typeof gastoComida==='function')embrulharUmaVez('gastoComida',()=>{
  const _gc=gastoComida;
  gastoComida=function(){
    return Math.max(1,Math.round(_gc.apply(this,arguments)*dif()));
  };
  return true;
});

/* 5 · AGRESSIVIDADE SUPORTADA — INVERSO
   `folegoPorta` diz quantos encontros você aguenta numa invasão antes
   de acabar. Menos dificuldade tem de dar MAIS fôlego. Multiplicar por
   0.60 aqui teria deixado o jogo mais difícil, não menos. */
if(typeof folegoPorta==='function')embrulharUmaVez('folegoPorta',()=>{
  const _fp=folegoPorta;
  folegoPorta=function(){
    return Math.max(1,Math.round(_fp.apply(this,arguments)*difInverso()));
  };
  return true;
});

/* ================= SAVE ANTIGO =================
   Não há nada pra migrar: a dificuldade é função pura de `S.dia`, que
   todo save já tem. Quem estava no dia 7 entra na curva no ponto do dia
   7 — nem punido nem presenteado. Isso é de propósito: guardar o
   multiplicador no save criaria um segundo lugar onde a verdade mora, e
   um save velho ficaria preso numa curva antiga pra sempre. */

/* ================= DEBUG =================
   `difDia(20)` pula pro dia 20 e mostra o multiplicador.
   `difTabela()` imprime a curva inteira. */
function difDia(n){
  if(typeof S==='undefined')return null;
  S.dia=Math.max(1,Math.round(n)||1);
  if(typeof marcarSujo==='function')marcarSujo();
  if(typeof atualizarPainel==='function')try{atualizarPainel();}catch(e){}
  const v=dif();
  if(typeof diz==='function')
    diz(`[debug] dia ${S.dia} · dificuldade ${v.toFixed(3)} `
      +`(${Math.round((1-v)*100)}% mais fácil que o original)`,'sist');
  return v;
}
function difTabela(ate){
  const n=ate||DIF_CFG.diasAteTeto+4;
  const l=[];
  for(let d=1;d<=n;d++)l.push(d+': '+dificuldadeNoDia(d).toFixed(4));
  return l;
}
function difEstado(){
  return {dia:(typeof S!=='undefined'&&S.dia)||1,
    valor:dif(), inverso:difInverso(),
    cfg:{...DIF_CFG},
    pontos:DIF_PONTOS.map(p=>({...p,embrulhado:!!_difEmbrulhado[p.fn]}))};
}
