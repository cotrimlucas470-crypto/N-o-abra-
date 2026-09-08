/* ================= §56 · A CAMADA DE AMEAÇA, ESTENDIDA ================

   Esta é a fundação dos dois invasores novos, e ela foi escrita para NÃO
   MUDAR NADA no comportamento das seis criaturas que já existem. Isso
   não é modéstia: é a única forma de saber, depois, que uma mudança de
   comportamento veio do invasor novo e não de um efeito colateral meu.
   O harness cobra isso — simula com semente fixa antes e depois e exige
   trilha idêntica.

   ENTRAM TRÊS COISAS.

   1 · CANAIS DECLARADOS. Hoje cada criatura tem um `sentido` só, e o
       resto é `if` espalhado: `anomOuviu` tem um `if(R.sentido==='rastro')
       return` escrito na mão. A tabela `AME_CANAIS` declara o que cada
       uma percebe, e ela foi preenchida para descrever EXATAMENTE o que
       o código já faz — nem um canal a mais. Os canais que faltam entram
       na etapa 5, de propósito e separados, para dar pra medir.

   2 · RECUANDO e OCULTO. Duas fases novas.

       ARMADILHA GRANDE AQUI, e este jogo já caiu nela duas vezes: o
       `anomAvancar` decide por comparação de string
       (`if(fase==='RONDA') ... else if(fase==='CACA') ...`). Uma fase
       nova não casa com nenhum ramo, não faz nada, e a criatura fica
       PRESA NELA PARA SEMPRE — foi assim que o imitador e o rastejante
       ficaram inertes, e foi simulação longa que pegou os dois. Por isso
       toda fase nova aqui tem saída obrigatória por teto de turnos, e o
       harness roda 2000 turnos procurando criatura presa.

   3 · MEMÓRIA ENTRE NOITES. Por criatura: onde ela te perdeu, quantas
       noites já passou na casa, quantas vezes te viu. Ela GRAVA desde
       já para todas — gravar não é mudar comportamento — mas só é LIDA
       por quem declara `lembra:true`, e nenhuma das seis declara. Quem
       vai ler são o Observador e o Hóspede. */

const AME_CFG={
  /* teto de permanencia nas fases novas. Sem teto, fase nova e cadeia
     perpetua: o `anomAvancar` da base nao sabe sair delas. */
  recuandoMax:4,
  ocultoMax:6,
  /* quantas noites a memoria de uma criatura sobrevive */
  noitesLembra:3
};

/* ---------- 1 · os canais ----------
   Preenchido para DESCREVER o que o codigo ja faz. `primario` e o mesmo
   `sentido` de sempre, e `tambem` esta vazio de proposito em todas: os
   canais que faltam sao a etapa 5, e misturar as duas coisas tiraria a
   possibilidade de medir qual delas mudou o jogo. */
const AME_CANAIS={
  magro:      {primario:'luz',      tambem:[], lembra:false},
  rastejante: {primario:'rastro',   tambem:[], lembra:false},
  coro:       {primario:'som',      tambem:[], lembra:false},
  imitador:   {primario:'resposta', tambem:[], lembra:false},
  inchado:    {primario:'passagem', tambem:[], lembra:false},
  primordial: {primario:'olhar',    tambem:[], lembra:false}
};
function ameCanais(id){
  const c=AME_CANAIS[id];
  if(c)return c;
  /* criatura sem entrada na tabela cai no `sentido` da REGRA, que
     continua sendo a fonte de verdade. Tabela que diverge da REGRA seria
     duas verdades, e duas verdades e nenhuma. */
  const r=(typeof REGRA!=='undefined'&&REGRA[id])||null;
  return {primario:r?r.sentido:'som', tambem:[], lembra:false};
}
/* ela percebe neste canal? */
function ameOuveEm(id,canal){
  const c=ameCanais(id);
  return c.primario===canal||c.tambem.indexOf(canal)>=0;
}

/* ---------- 2 · as fases novas ----------
   Anexadas a lista, que e documentacao — nada no jogo itera ela, o
   codigo compara string. Anexar mantem a lista honesta. */
if(typeof FASES_ANOM!=='undefined'&&Array.isArray(FASES_ANOM)){
  ['RECUANDO','OCULTO'].forEach(f=>{ if(FASES_ANOM.indexOf(f)<0)FASES_ANOM.push(f); });
}
const AME_FASES_NOVAS=['RECUANDO','OCULTO'];

/* RECUANDO — ela esta indo embora, e vai voltar. Diferente de PERDEU,
   que e "procurando"; aqui ela sabe onde voce esta e escolheu recuar.
   OCULTO   — ela esta na casa e parou de emitir. Nao da pra achar por
   som nem por rastro. E o estado que o Observador usa quando voce olha
   pra ele.

   As duas TEM SAIDA, e a saida e por teto de turnos. */
function ameSaidaDeFase(I){
  if(!I||!I.fase)return null;
  if(AME_FASES_NOVAS.indexOf(I.fase)<0)return null;
  const teto=I.fase==='RECUANDO'?AME_CFG.recuandoMax:AME_CFG.ocultoMax;
  if((I.faseTurnos|0)<teto)return null;
  /* sai pra PERDEU: ela volta a procurar, que e o estado mais neutro */
  I.fase='PERDEU'; I.faseTurnos=0;
  return I.fase==='PERDEU'?'Ela volta a se mexer.':null;
}
function amePorFase(I,fase){
  if(!I||AME_FASES_NOVAS.indexOf(fase)<0)return false;
  I.fase=fase; I.faseTurnos=0;
  return true;
}

/* o embrulho que impede a cadeia perpetua */
if(typeof anomAvancar==='function'){
  const _aa=anomAvancar;
  anomAvancar=function(I){
    /* fase nova: a base nao sabe o que fazer com ela, entao ela e
       tratada AQUI e a base nem chega a ver. Deixar a base rodar com
       uma fase que ela nao conhece e o caminho pro travamento. */
    if(I&&AME_FASES_NOVAS.indexOf(I.fase)>=0){
      I.faseTurnos=(I.faseTurnos|0)+1;
      const out=[];
      const t=ameSaidaDeFase(I);
      if(t)out.push(t);
      return out;
    }
    return _aa.apply(this,arguments);
  };
}

/* ---------- 3 · a memória entre noites ----------
   Grava para todas; so e lida por quem declara `lembra`. Gravar nao
   muda comportamento, e e o que faz a memoria valer alguma coisa quando
   o Observador chegar. */
function ameMem(id){
  if(!S.ameaca||typeof S.ameaca!=='object')S.ameaca={};
  const A=S.ameaca;
  if(!A[id])A[id]={noites:0, perdeuEm:null, viuVoce:0, ultimaNoite:-1};
  return A[id];
}
function ameLembra(id){
  const c=ameCanais(id);
  if(!c.lembra)return null;
  const m=ameMem(id);
  const idade=(S.dia|0)-(m.ultimaNoite|0);
  if(m.ultimaNoite<0||idade>AME_CFG.noitesLembra)return null;
  return m;
}
function ameAnotar(I,o){
  if(!I||!I.bicho||!I.bicho.id)return null;
  const m=ameMem(I.bicho.id);
  if(o&&o.perdeuEm!=null)m.perdeuEm=o.perdeuEm;
  if(o&&o.viu)m.viuVoce=(m.viuVoce|0)+1;
  if(o&&o.noite){ m.noites=(m.noites|0)+1; m.ultimaNoite=S.dia|0; }
  if(typeof marcarSujo==='function')marcarSujo();
  return m;
}
/* anota sozinho quando a noite comeca e quando ela te perde */
if(typeof anomIniciar==='function'){
  const _ai=anomIniciar;
  anomIniciar=function(I){
    const r=_ai.apply(this,arguments);
    try{ ameAnotar(r||I,{noite:true}); }catch(e){}
    return r;
  };
}

/* ---------- gravar ----------
   Bloco ANEXA a save; bloco nunca CRIA save. */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    const r=_sv.apply(this,arguments);
    if(!S.nomeJogador)return r;
    try{
      const bruto=localStorage.getItem(CHAVE);
      if(!bruto)return r;
      const o=JSON.parse(bruto);
      if(S.ameaca&&Object.keys(S.ameaca).length)o.ameaca=S.ameaca;
      localStorage.setItem(CHAVE,JSON.stringify(o));
    }catch(e){}
    return r;
  };
}

function ameacaEstado(){
  return {
    canais:Object.fromEntries(Object.keys(AME_CANAIS).map(k=>
      [k,{primario:AME_CANAIS[k].primario, tambem:AME_CANAIS[k].tambem.slice(),
          lembra:!!AME_CANAIS[k].lembra}])),
    fases:(typeof FASES_ANOM!=='undefined')?FASES_ANOM.slice():[],
    fasesNovas:AME_FASES_NOVAS.slice(),
    memoria:S.ameaca?JSON.parse(JSON.stringify(S.ameaca)):{},
    cfg:{...AME_CFG}
  };
}
