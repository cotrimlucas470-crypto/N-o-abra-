/* ================= §51 · AS CRIATURAS APARECEM =================

   AUDITORIA ANTES DE ESCREVER, e o achado nao foi o esperado.

   O briefing pede "silhueta propria por criatura". Media a casa antes:
   as silhuetas JA EXISTEM, todas as 16, uma por criatura, animadas, com
   pele por familia. Sao ~400 linhas em tres camadas (`desSilhueta` base
   mais dois envelopes).

   E `desSilhueta` NAO E CHAMADA EM LUGAR NENHUM. Zero call sites no
   arquivo inteiro. O jogador nunca viu nenhuma delas.

   Entao o trabalho desta etapa nao e desenhar silhueta: e LIGAR a que
   ja esta desenhada, no lugar certo.

   ONDE E O LUGAR CERTO. Nao e na porta. Na porta o jogador ve so a
   sombra dos pes na fresta, e isso e de proposito: a tabela `FORMA` tem
   seis formas pra dezesseis criaturas, e o comentario dela diz por que
   — "compartilhar e de proposito: a forma estreita o palpite, nao
   entrega a resposta". Mostrar a silhueta inteira na porta mataria a
   deducao, que e o miolo do jogo.

   O lugar e O CADERNO. La o jogador so ve o que ja encontrou. A
   silhueta vira recompensa por ter deduzido, nao atalho pra deduzir.

   UM BUG DE VERDADE, achado na mesma auditoria: `coro2` ("o Coro") nao
   tem entrada em `FORMA_DE`. A descricao dele e "cinco, seis silhuetas
   em fila, sem se mexer, olhando pra porta" e a sombra que ele fazia
   embaixo da porta era... dois pes de gente, o fallback. */

const SIL_CFG={
  larg:64, alt:80,
  /* GIZ, nao tinta preta. A primeira versao desenhava em '#0B0910', que
     e a cor do jogo pra silhueta contra a luz da fresta — la ela e uma
     falta de luz. No caderno o fundo tambem e quase preto, e preto sobre
     preto e um retangulo vazio: eu vi isso na captura, nao no teste (o
     teste so cobrava que houvesse tinta, e havia). Aqui ela e um
     desenho a giz numa pagina escura. */
  tinta:'#C9C2B4',
  /* o `t` do desenho anda com o relogio: as silhuetas do caderno
     respiram, igual as do jogo. Um quadro so ficaria congelado. */
  quadro:1
};

/* o Coro passa a ter a forma que a descricao dele promete */
if(typeof FORMA_DE!=='undefined'&&FORMA_DE&&!FORMA_DE.coro2){
  FORMA_DE.coro2='varios';
}

/* Desenha uma silhueta num canvas pequeno.

   DUAS ARMADILHAS, as duas ja pagas nesta sessao:

   1. `CX` e const e amarrado ao #tela. Nao adianta reatribuir
      `window.CX` — a ligacao lexica nao muda e o desenho sai preto. O
      jeito e emprestar o proprio #tela: desenhar nele, copiar com
      drawImage e devolver. Tudo dentro da mesma tarefa do JS, entao o
      navegador nunca mostra o estado intermediario, e o laco de render
      repinta o quadro seguinte inteiro de qualquer jeito.

   2. O rascunho tem de ficar TRANSPARENTE. A terceira camada do
      `desSilhueta` pinta a pele com `source-atop`, que so marca onde ja
      ha tinta. Num rascunho pintado antes, o `source-atop` lambe o
      fundo inteiro e o resultado e um borrao cinza em vez de uma
      silhueta recortada. Eu descobri isso pintando o fundo de branco
      num teste e recebendo quatro silhuetas identicas. */
function silhuetaEmCanvas(tipo,larg,alt){
  const L=larg||SIL_CFG.larg, A=alt||SIL_CFG.alt;
  const d=document.createElement('canvas');
  d.width=L; d.height=A;
  if(typeof CX==='undefined'||typeof desSilhueta!=='function')return d;
  const tela=document.getElementById('tela');
  if(!tela||tela.width<8||tela.height<8)return d;
  const sw=Math.min(tela.width,L*2), sh=Math.min(tela.height,A*2);
  try{
    CX.save();
    CX.setTransform(1,0,0,1,0,0);
    CX.clearRect(0,0,sw,sh);            /* transparente, nao branco */
    desSilhueta(sw/2,sh*.54,sh*.66,tipo,SIL_CFG.quadro,SIL_CFG.tinta);
    CX.restore();
    d.getContext('2d').drawImage(tela,0,0,sw,sh,0,0,L,A);
  }catch(e){ try{CX.restore();}catch(e2){} }
  return d;
}

/* a silhueta entra na ficha do caderno, junto do nome.

   Usando a CONVENCAO QUE JA EXISTE. A primeira versao inventou um
   `.silcard` e o enfiou dentro do `.gente`, que e um flex de tres
   filhos — o quarto filho espremeu a descricao pra uma palavra por
   linha. A captura mostrou na hora. O jogo ja resolve isso desde o
   `fichaRosto`: a ficha ganha a classe `com-rosto`, o texto vai pra um
   `.gente-txt` e o canvas fica ao lado. E o mesmo problema e a mesma
   solucao, entao e a mesma marcacao. */
function silhuetaNaFicha(el,id){
  const c=(typeof CRIATURAS!=='undefined')?CRIATURAS[id]:null;
  if(!c||!c.silhueta||c.silhueta==='nenhuma')return false;
  if(el.querySelector('canvas.silhueta'))return false;
  const cv=silhuetaEmCanvas(c.silhueta);
  cv.className='silhueta';
  cv.title=SIL_NOME[c.silhueta]||c.silhueta;
  /* embrulha o texto que ja esta na ficha, do jeito que o fichaRosto faz */
  const d=document.createElement('div'); d.className='gente-txt';
  while(el.firstChild)d.appendChild(el.firstChild);
  const leg=document.createElement('small');
  leg.className='sil-leg';
  leg.textContent='FORMATO · '+(SIL_NOME[c.silhueta]||c.silhueta);
  d.appendChild(leg);
  el.classList.add('com-rosto');
  el.appendChild(cv);
  el.appendChild(d);
  return true;
}

/* nome em portugues do formato, pra legenda embaixo do desenho */
const SIL_NOME={
  humana:'corpo de gente',        alta:'alto e dobrado',
  meia:'so metade aparece',       magra:'vara comprida',
  rastejante:'baixo e comprido',  inchada:'corpo inchado',
  grupo:'mais de um',             macica:'macico',
  aquilo:'nao fecha forma',       casca:'pele folgada',
  pequena:'pequena e rapida',     dobra:'dobrada onde nao tem junta',
  raiz:'sai do chao',             fome:'ocupa mais a cada vez',
  coro:'varios em fila'
};

/* o estilo do quadrinho. Vai por JS pra o bloco nao depender de a base
   ter uma regra de CSS com esse nome. */
(function(){
  if(document.getElementById('sil-estilo'))return;
  const e=document.createElement('style');
  e.id='sil-estilo';
  e.textContent=
   'canvas.silhueta{flex:0 0 auto;border:1px solid #2A2330;background:#0C0A10;'
  +'border-radius:3px;image-rendering:auto;align-self:flex-start}'
  +'.gente-txt small.sil-leg{color:rgba(160,152,178,.7);margin-top:3px}';
  document.head.appendChild(e);
})();

/* ENVELOPE no caderno: a base continua escrevendo o texto dela toda, e
   o desenho e ACRESCENTADO na ficha de quem ja foi visto. Nao reescrevo
   `telaCaderno` — se a base mudar o texto amanha, o desenho continua
   entrando do mesmo jeito. */
if(typeof telaCaderno==='function'){
  const _tc=telaCaderno;
  telaCaderno=function(volta){
    const r=_tc.apply(this,arguments);
    try{
      const V=S.vistos||{};
      /* SO as fichas desta abertura.

         `limpar()` nao apaga o texto antigo: a base o reescreveu (a
         "LER O QUE JA PASSOU") pra esmaecer o que ja passou e deixar
         rolar pra cima, marcando tudo com a classe `passado`. Entao
         `T.querySelectorAll('.gente')` devolve TAMBEM as fichas das
         vezes anteriores em que o caderno foi aberto.

         Sem este filtro o alinhamento quebra na segunda abertura: com
         3 fichas velhas e 5 novas, a lista de vistos (5 nomes) e casada
         contra 8 fichas, e as novas ficam sem desenho. Medido: 1
         criatura vista devolvia 4 fichas e 4 desenhos. */
      const fichas=Array.from(T.querySelectorAll('.gente:not(.passado)'));
      /* a ordem das fichas e a ordem em que a base as escreveu:
         familia por familia, na ordem de Object.keys(CRIATURAS) */
      const vistos=[];
      ['falsa','aberta','surda'].forEach(fam=>{
        Object.keys(CRIATURAS).forEach(k=>{
          if(V[k]>0&&CRIATURAS[k].fam===fam)vistos.push(k);
        });
      });
      fichas.forEach((el,i)=>{
        const id=vistos[i]; if(!id)return;
        /* confere pelo nome antes de colar o desenho: se a base mudar a
           ordem, e melhor nao desenhar do que desenhar a criatura
           errada ao lado do texto errado */
        const b=el.querySelector('b');
        if(!b||b.textContent!==CRIATURAS[id].n)return;
        silhuetaNaFicha(el,id);
      });
    }catch(e){ /* caderno sem desenho ainda e um caderno */ }
    return r;
  };
}

function silhuetasEstado(){
  const tipos=(typeof CRIATURAS!=='undefined')
    ?[...new Set(Object.values(CRIATURAS).map(c=>c.silhueta))]:[];
  return {
    tipos:tipos.length,
    semForma:(typeof CRIATURAS!=='undefined'&&typeof FORMA_DE!=='undefined')
      ?Object.keys(CRIATURAS).filter(k=>!FORMA_DE[k]):[],
    coroForma:(typeof FORMA_DE!=='undefined')?FORMA_DE.coro2:null,
    cfg:{...SIL_CFG}
  };
}
