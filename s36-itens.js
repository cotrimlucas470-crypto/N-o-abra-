/* ============ §36 — CADA ARMA FAZ UMA COISA QUE SÓ ELA FAZ ============

   O PROBLEMA, MEDIDO
   ------------------
   São 12 armas. Nove delas diferem em `dano` e `kg` — e mais nada: só a
   besta e as duas de fogo tinham marca própria. E o jogo consulta
   todas elas por uma função só:

       melhorArma() → a de maior dano

   Ou seja: existe UMA arma útil por vez, e as outras onze são peso.
   Achar um facão depois de já ter uma marreta não é achado, é lixo.

   Pior: duas descrições PROMETEM mecânica que não existia.

       foice   "Alcance bom e corta o que encostar."
       espeto  "Feita em casa. Mantém a coisa longe."

   O jogo dizia ao jogador que essas coisas faziam algo. Não faziam.
   Promessa escrita e não cumprida é a forma mais barata de mentir pro
   jogador, e é o que a regra de ouro proíbe.

   O QUE ENTRA
   -----------
   Quatro funções, cada uma num item diferente, e uma que atravessa
   nove. Nenhuma é um número maior: são VERBOS.

     · a arma serve de ferramenta      (9 armas, no conserto)
     · a faca cabe no cinto            (não ocupa a mão)
     · o taco não quebra               (não desgasta)
     · a foice acerta primeiro         (alcance, no encontro)
     · o espeto não mata, mas afasta   (saída sem dano e sem barulho)
   ====================================================================== */

const ITEM_CFG={
  /* horas a mais pra consertar com arma no lugar da ferramenta certa.
     Improvisar tem de custar: se sair de graça, a ferramenta de verdade
     vira enfeite e o jogo perde metade da razão de vasculhar. */
  horaExtraImproviso: 1,
  /* quanto a arma sofre servindo de ferramenta. Bater com o cabo do
     facão em prego estraga o facão — e é isso que faz a escolha doer. */
  desgasteComoFerramenta: 2.2,
  /* vantagem da foice por chegar antes: soma na chance de acertar */
  bonusAlcanceFoice: .18,
  /* o espeto não mata; ele te tira de lá. Esta é a chance de a manobra
     dar certo, e ela é ALTA de propósito — quem escolhe não matar tem
     de ter um caminho que funciona. */
  chanceEspeto: .82
};

/* ---------- que ferramenta cada arma consegue substituir ----------
   Sai do que a coisa É, não de tabela inventada: um machado corta
   madeira como um serrote e cava como uma pá; uma barra de ferro faz
   alavanca e torce arame; uma faca tem ponta fina como chave de fenda.
   Onde a arma não substitui nada, ela não aparece aqui — e o jogo diz
   isso na cara do jogador em vez de fingir. */
const ARMA_FERRA={
  machado:  ['serra','pa'],
  marreta:  ['martelo','pa'],
  martelo:  ['martelo'],
  barra:    ['pa','alicate'],
  facao:    ['enxada','serra'],
  foice:    ['enxada'],
  faca:     ['fenda'],
  espeto:   ['enxada'],
  taco:     []
};
/* como o jogo explica o improviso, por ferramenta trocada */
const COMO_IMPROVISA={
  serra:   'serrando no fio',
  pa:      'cavando com a lâmina',
  martelo: 'batendo com o que tem de mais pesado',
  alicate: 'torcendo na marra',
  enxada:  'raspando o mato com o gume',
  fenda:   'usando a ponta como chave'
};

/* que armas na mão cobrem uma ferramenta que falta */
function armasQueSubstituem(ferraId){
  if(typeof armasNaMao!=='function')return [];
  return armasNaMao().filter(a=>(ARMA_FERRA[a.id]||[]).includes(ferraId));
}
/* devolve o plano de improviso pra uma avaria, ou null */
function planoDeImproviso(a){
  if(typeof AVARIAS==='undefined')return null;
  const e=AVARIAS[a.id]; if(!e)return null;
  const faltando=(e.ferra||[]).filter(x=>!temFerra(x));
  if(!faltando.length)return null;              /* não falta ferramenta */
  /* material que falta NÃO tem substituto: arma não vira cimento */
  const faltaMat=Object.keys(e.mat||{}).some(k=>((S.mat&&S.mat[k])||0)<e.mat[k]);
  if(faltaMat)return null;
  const trocas=[];
  for(const f of faltando){
    const cand=armasQueSubstituem(f);
    if(!cand.length)return null;                /* alguma não tem substituto */
    /* a mais pesada aguenta melhor o serviço */
    trocas.push({ferra:f, arma:cand.sort((x,y)=>y.kg-x.kg)[0]});
  }
  return trocas;
}

/* ================= A ARMA NO LUGAR DA FERRAMENTA ================= */
if(typeof menuConserto==='function'){
  const _itMC=menuConserto;
  menuConserto=function(a){
    _itMC.apply(this,arguments);
    try{
      const plano=planoDeImproviso(a);
      if(!plano||!plano.length)return;
      const e=AVARIAS[a.id];
      const nomes=plano.map(t=>t.arma.n.toLowerCase());
      const unicos=[...new Set(nomes)];
      const comoTxt=plano.map(t=>
        (COMO_IMPROVISA[t.ferra]||'no improviso')+' com '+t.arma.n.toLowerCase()
      ).join(', e ');
      const horas=(e.etapas>1?2:1)+ITEM_CFG.horaExtraImproviso;
      diz('Você não tem '+plano.map(t=>FERRA[t.ferra].n).join(' nem ')
        +', mas tem '+unicos.join(' e ')+'. Dá pra fazer render.','sist');
      botao('Consertar com '+unicos.join(' e '),acaoDia(horas,async()=>{
        a.etapa++;
        /* a arma paga por isso */
        plano.forEach(t=>{
          if(typeof gastarDur==='function'&&typeof peca==='function'){
            const p=peca(t.arma.id);
            if(p)try{ gastarDur(p,ITEM_CFG.desgasteComoFerramenta,t.arma.n); }catch(err){}
          }
        });
        diz('Você resolve '+comoTxt+'. Demora mais, e a ferramenta sai pior do que entrou.','bom');
        if(a.etapa>=AVARIAS[a.id].etapas){
          Object.keys(e.mat||{}).forEach(k=>gastarMat(k,e.mat[k]));
          return terminarConserto(a,false);
        }
        diz(`Etapa ${a.etapa} de ${e.etapas} feita.`,'sist');
      }),{cls:'prim',custo:horas+' horas · estraga a '+unicos[0].split(' ')[0]});
    }catch(err){ if(typeof registrarErro==='function')registrarErro(err,'improvisoComArma'); }
  };
}

/* ================= A FACA CABE NO CINTO =================
   `maosOcupadas()` conta quantas coisas você está carregando nos
   braços, e isso atrapalha tudo que exige mão livre. Uma faca de
   cozinha não ocupa braço nenhum: ela vai no cinto. É a única arma
   que você carrega sem abrir mão de nada — e é por isso que ela vale,
   mesmo com dano 1. */
const ITENS_DE_CINTO=['faca'];
if(typeof maosOcupadas==='function'){
  const _itMO=maosOcupadas;
  maosOcupadas=function(){
    try{
      const n=(typeof maos==='function')
        ? maos().filter(id=>!ITENS_DE_CINTO.includes(id)).length
        : _itMO.apply(this,arguments);
      return n;
    }catch(e){ return _itMO.apply(this,arguments); }
  };
}

/* ================= O TACO NÃO QUEBRA =================
   Madeira maciça com fita crepe no cabo. Não tem fio pra perder nem
   dobradiça pra folgar. É a arma que você nunca precisa consertar —
   e o preço disso é o dano 2 dela. */
const ITENS_INQUEBRAVEIS=['taco'];
if(typeof gastarArma==='function'){
  const _itGA=gastarArma;
  gastarArma=function(arma,acertou){
    if(arma&&ITENS_INQUEBRAVEIS.includes(arma.id))return;
    return _itGA.apply(this,arguments);
  };
}

/* ================= FOICE E ESPETO CUMPREM A DESCRIÇÃO =================
   As duas prometiam mecânica por escrito e não entregavam nada.

   FOICE — "Alcance bom": você chega antes. Vira vantagem na chance.
   ESPETO — "Mantém a coisa longe": não mata, mas te tira de lá inteiro
            e sem barulho, que é uma vitória diferente e às vezes melhor. */
function armaNaMao(id){
  return (typeof armasNaMao==='function')&&armasNaMao().find(a=>a.id===id);
}
if(typeof encararOcupante==='function'){
  const _itEO=encararOcupante;
  encararOcupante=async function(casa,voltar){
    const r=await _itEO.apply(this,arguments);
    try{
      const foice=armaNaMao('foice'), espeto=armaNaMao('espeto');
      if(foice&&typeof botao==='function'){
        botao('Manter distância com a foice',async()=>{
          AC.innerHTML='';
          diz('Você não deixa ela encostar. O cabo é comprido e o gume chega antes.','sist');
          await pausa(1000);
          const base=.55+ITEM_CFG.bonusAlcanceFoice;
          const p=(typeof chanceArma==='function')?chanceArma(base):base;
          if(typeof gastarArma==='function')gastarArma(foice,true);
          if(chance(p)){
            diz('Ela vem, encontra o fio no caminho, e desiste de vir de novo.','bom');
            casa.ocupada=false; S.matou=(S.matou||0)+1;
            if(typeof menuDentro==='function')return menuDentro(casa,voltar);
            return voltar();
          }
          diz('O cabo engancha na parede. Você perde o alcance e a vantagem junto.','perigo');
          S.ferido=(S.ferido||0)+1;
          if(typeof salvarCasa==='function')salvarCasa(casa);
          return voltar();
        },{custo:Math.round((.55+ITEM_CFG.bonusAlcanceFoice)*100)+'% · o alcance conta'});
      }
      if(espeto&&typeof botao==='function'){
        botao('Afastar com o espeto e sair',async()=>{
          AC.innerHTML='';
          diz('Você não tenta acertar. Só mantém a ponta entre vocês dois e anda pra trás.','sist');
          await pausa(1100);
          if(chance(ITEM_CFG.chanceEspeto)){
            diz('Ela recua o quanto a ponta manda. Você sai pela porta que entrou, com tudo.','bom');
            if(typeof salvarCasa==='function')salvarCasa(casa);
            return voltar();
          }
          diz('Ela agarra o cabo e puxa. Você solta o espeto e corre.','perigo');
          S.armas=(S.armas||[]).filter(x=>x!=='espeto');
          S.ferido=(S.ferido||0)+1;
          if(typeof salvarCasa==='function')salvarCasa(casa);
          return voltar();
        },{custo:Math.round(ITEM_CFG.chanceEspeto*100)+'% · não mata, mas você sai inteiro'});
      }
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'armasNoEncontro'); }
    return r;
  };
}

/* ================= AS DESCRIÇÕES PASSAM A DIZER A VERDADE ================= */
/* Um item cuja descrição promete uma coisa que o código não faz é
   mentira escrita. Agora que as funções existem, as descrições dizem
   qual é — e as que não têm função nenhuma dizem isso também. */
const DESC_NOVA={
  taco:   'Madeira maciça, fita crepe no cabo. Não tem fio pra perder: essa não quebra nunca.',
  faca:   'Você tem que chegar muito perto. Em compensação vai no cinto e não ocupa a mão.',
  facao:  'Lâmina cega de tanto uso. Serve de enxada e de serrote quando falta ferramenta.',
  machado:'Racha porta, madeira e o que mais aparecer. Vira serrote e pá no aperto.',
  marreta:'Pesada demais pra errar duas vezes. No conserto, é martelo e pá ao mesmo tempo.',
  martelo:'Serve pra bater e pra pregar — e pregar conta como conserto de verdade.',
  barra:  'Pesada demais pra correr com ela. Faz alavanca onde alicate e pá fariam.',
  foice:  'Alcance bom: você chega antes dela. E raspa mato como enxada.',
  espeto: 'Feita em casa. Não mata — mantém a coisa longe o bastante pra você sair.'
};
function corrigirDescricoes(){
  if(typeof ITENS==='undefined')return 0;
  let n=0;
  ITENS.forEach(it=>{ if(DESC_NOVA[it.id]&&it.d!==DESC_NOVA[it.id]){ it.d=DESC_NOVA[it.id]; n++; } });
  /* o CATALOGO do §15 guarda cópia: precisa saber também */
  if(typeof CATALOGO!=='undefined')Object.keys(DESC_NOVA).forEach(id=>{
    if(CATALOGO[id]&&CATALOGO[id].d)CATALOGO[id].d=DESC_NOVA[id];
  });
  return n;
}
const DESCRICOES_CORRIGIDAS=corrigirDescricoes();

/* ---------- depuração ---------- */
/* O QUE CONTA COMO "VERBO"
   Revólver e espingarda não ganharam funcao nova, e nao e esquecimento:
   `municao` JA e o verbo delas. Elas sao as unicas armas do jogo que
   acabam, e as unicas que trazem o resto da rua junto (+14 de ruido no
   tiro dentro de casa). Alto, finito e definitivo separa mais uma arma
   das outras do que qualquer coisa que eu pendurasse nelas por cima.
   Inventar um verbo pra caber na minha propria regua seria diluir a
   identidade mais forte do conjunto. */
function itensEstado(){
  const armas=(typeof ITENS!=='undefined')?ITENS.filter(i=>i.dano):[];
  const comVerbo=armas.filter(i=>
    (ARMA_FERRA[i.id]&&ARMA_FERRA[i.id].length)||
    ITENS_DE_CINTO.includes(i.id)||ITENS_INQUEBRAVEIS.includes(i.id)||
    i.silenciosa||i.municao||['foice','espeto'].includes(i.id));
  return {armas:armas.length, comVerbo:comVerbo.length,
    semVerbo:armas.filter(i=>!comVerbo.includes(i)).map(i=>i.id),
    descricoesCorrigidas:DESCRICOES_CORRIGIDAS,
    ferramentasCobertas:[...new Set(Object.values(ARMA_FERRA).flat())].sort(),
    cinto:ITENS_DE_CINTO, inquebravel:ITENS_INQUEBRAVEIS};
}
