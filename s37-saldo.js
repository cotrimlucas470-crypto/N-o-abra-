/* ============ §37 — A LINHA DE SALDO ============

   A QUEIXA, E O QUE A MEDIÇÃO DISSE
   ---------------------------------
   "Quase toda hora enquanto eu jogo, é difícil de entender o que
   acontece pela forma que é dita."

   A suspeita óbvia era frase comprida. Fui medir as 851 falas do jogo:

       mediana ........ 10 palavras
       p90 ............ 16 palavras
       acima de 28 .... 4 falas (e três delas são tutorial)

   As frases são CURTAS. O problema é outro, e é bem maior:

       239 falas — 28% do total — acontecem coladas a uma mudança de
       recurso e não dizem o número.

   Você lê "A febre cedeu." e não sabe se gastou remédio, quanto gastou
   nem quanto sobrou. Lê "Ele saiu de madrugada sozinho." e não sabe se
   perdeu uma pessoa. A frase conta a CENA e esconde a CONTA.

   O CONSERTO NÃO É REESCREVER A PROSA
   -----------------------------------
   Reescrever 851 falas pra encaixar número em cada uma ia matar o
   sentimento — e sentimento é a única coisa que este jogo tem de
   sobra. O pedido foi explícito: mais fácil de entender SEM TIRAR o
   sentimento.

   Então a prosa fica intacta, e o jogo passa a mostrar o saldo numa
   linha separada, em fonte de mostrador, logo abaixo:

       A febre cedeu.
       −1 remédio · −2 h

   A prosa é o que aconteceu com as pessoas. O saldo é o que aconteceu
   com a casa. Duas vozes, dois trabalhos, nenhuma atrapalha a outra.

   COMO ELE SABE
   -------------
   Não perguntando a ninguém. Ele fotografa os recursos, e quando a
   foto muda, mostra a diferença. Isso pega TODA mudança, inclusive as
   que acontecem em código que ninguém lembra que existe — e é por isso
   que é assim, e não uma chamada manual em 239 lugares.
   ====================================================================== */

const SALDO_CFG={
  /* de quanto em quanto tempo a foto é comparada. 300 ms é rápido o
     bastante pra a linha sair junto com a frase e devagar o bastante
     pra várias mudanças do mesmo instante virarem UMA linha só. */
  intervalo: 300,
  /* mudança menor que isto não vira linha. Ruído sobe de 1 em 1 o tempo
     todo; virar linha a cada ponto seria transformar o registro em
     chuvisco e o jogador pararia de ler — que é o problema de origem. */
  minimo: { ruido:3, moral:4 },
  /* quantas linhas de saldo seguidas antes de o sistema calar a boca
     por um instante. Vale contra laço de evento que mexe em recursó. */
  maxSeguidas: 4
};

/* ---------- o que o jogador conta ----------
   Só entra aqui o que a pessoa tem na cabeça enquanto joga. Hora e dia
   ficam de fora: eles já estão no relógio, no alto da tela, o tempo
   todo. Repetir no registro seria ruído. */
const SALDO_ITENS=[
  {k:'comida',   n:'comida',   un:'lata',    uns:'latas'},
  {k:'agua',     n:'água',     un:'galão',   uns:'galões'},
  {k:'diesel',   n:'diesel',   sufixo:' de diesel'},
  {k:'remedio',  n:'remédio',  un:'remédio', uns:'remédios'},
  {k:'cartucho', n:'cartucho', un:'cartucho',uns:'cartuchos'},
  {k:'coquetel', n:'garrafa',  un:'garrafa', uns:'garrafas'},
  {k:'ruido',    n:'ruído',    sufixo:' de ruído', ruim:'sobe'},
  {k:'ferido',   n:'ferimento',un:'ferimento',uns:'ferimentos', ruim:'sobe'},
  {k:'estragadas',n:'perdida', un:'coisa estragada', uns:'coisas estragadas', ruim:'sobe'},
  {k:'gambiarras',n:'gambiarra',un:'gambiarra',uns:'gambiarras', ruim:'sobe'}
];

function saldoFoto(){
  const f={};
  SALDO_ITENS.forEach(i=>{ f[i.k]=Number(S[i.k])||0; });
  f._pessoas=(S.abrigo||[]).map(p=>p.n).join('|');
  f._mortos=(S.mortos||[]).length;
  f._armas=(S.armas||[]).slice().sort().join('|');
  f._ferra=(S.ferra||[]).slice().sort().join('|');
  f._mat={}; Object.keys(S.mat||{}).forEach(k=>f._mat[k]=S.mat[k]||0);
  f._avarias=(S.avarias||[]).map(a=>a.id).sort().join('|');
  return f;
}

/* ---------- a linha ---------- */
function saldoEstilo(){
  if(document.getElementById('css-saldo'))return;
  const s=document.createElement('style');
  s.id='css-saldo';
  s.textContent=
   'p.saldo{font-family:var(--mostrador);font-size:12.5px;letter-spacing:.05em;'
  +'color:#7A8B7F;margin:2px 0 10px;line-height:1.6;opacity:0;'
  +'animation:saldoEntra .5s ease forwards}'
  +'@keyframes saldoEntra{to{opacity:1}}'
  +'p.saldo b{color:#C9A227;font-weight:400}'      /* ganhou */
  +'p.saldo i{color:#C4553C;font-style:normal}'    /* perdeu */
  +'p.saldo u{color:#E8E2D4;text-decoration:none}' /* gente */
  +'@media (prefers-reduced-motion:reduce){p.saldo{opacity:1;animation:none}}';
  document.head.appendChild(s);
}

function plural(q,un,uns){ return Math.abs(q)===1?un:(uns||un+'s'); }
/* monta os pedaços da diferença entre duas fotos */
function saldoPartes(a,b){
  const out=[];
  SALDO_ITENS.forEach(i=>{
    const d=(b[i.k]||0)-(a[i.k]||0);
    if(!d)return;
    if(SALDO_CFG.minimo[i.k]&&Math.abs(d)<SALDO_CFG.minimo[i.k])return;
    const sinal=d>0?'+':'−';
    const n=Math.abs(Math.round(d*10)/10);
    const nome=i.sufixo?i.sufixo:(' '+plural(d,i.un||i.n,i.uns));
    /* ganhar ruído é ruim; ganhar comida é bom. A cor segue o que a
       coisa significa, não o sinal da conta. */
    const bom=i.ruim==='sobe' ? d<0 : d>0;
    out.push('<'+(bom?'b':'i')+'>'+sinal+n+nome+'</'+(bom?'b':'i')+'>');
  });
  /* gente: quem entrou e quem saiu, pelo nome */
  const antes=a._pessoas?a._pessoas.split('|'):[];
  const depois=b._pessoas?b._pessoas.split('|'):[];
  const foram=antes.filter(x=>x&&!depois.includes(x));
  const vieram=depois.filter(x=>x&&!antes.includes(x));
  if(vieram.length)out.push('<u>+'+vieram.join(', ')+'</u>');
  if(foram.length){
    const morreu=(b._mortos||0)>(a._mortos||0);
    out.push('<i>−'+foram.join(', ')+(morreu?' (morreu)':'')+'</i>');
  }
  /* material, ferramenta e arma: o que entrou e o que saiu, por nome */
  const matNome=k=>(typeof MATE!=='undefined'&&MATE[k])?MATE[k].n:k;
  Object.keys({...a._mat,...b._mat}).forEach(k=>{
    const d=((b._mat||{})[k]||0)-((a._mat||{})[k]||0);
    if(!d)return;
    out.push('<'+(d>0?'b':'i')+'>'+(d>0?'+':'−')+Math.abs(d)+' '
      +plural(d,matNome(k),(typeof MATE!=='undefined'&&MATE[k])?MATE[k].un:null)
      +'</'+(d>0?'b':'i')+'>');
  });
  const lista=(av,dp,nome)=>{
    const A=av?av.split('|'):[], B=dp?dp.split('|'):[];
    B.filter(x=>x&&!A.includes(x)).forEach(x=>out.push('<b>+'+nome(x)+'</b>'));
    A.filter(x=>x&&!B.includes(x)).forEach(x=>out.push('<i>−'+nome(x)+'</i>'));
  };
  lista(a._armas,b._armas,id=>{
    const it=(typeof ITENS!=='undefined')&&ITENS.find(i=>i.id===id);
    return it?it.n.toLowerCase():id;});
  lista(a._ferra,b._ferra,id=>
    (typeof FERRA!=='undefined'&&FERRA[id])?FERRA[id].n:id);
  /* avaria que nasceu ou que foi resolvida */
  lista(a._avarias,b._avarias,id=>{
    const e=(typeof AVARIAS!=='undefined')&&AVARIAS[id];
    return e?e.n:id;});
  return out;
}

/* ---------- o vigia ---------- */
let _saldoFoto=null, _saldoSeguidas=0, _saldoTimer=null, _saldoLigado=true;

function saldoJogando(){
  if(!_saldoLigado)return false;
  if(typeof S==='undefined'||!S.nomeJogador)return false;
  /* durante a abertura, o final e a tela de fim, o registro é da
     história, não da casa. Saldo ali seria ruído em cima de cena. */
  if(document.getElementById('cine'))return false;
  if(document.getElementById('cena-fim'))return false;
  if(typeof cena!=='undefined'&&cena.modo==='fim')return false;
  return !!document.getElementById('texto');
}

function saldoConferir(){
  if(!saldoJogando()){ _saldoFoto=null; _saldoSeguidas=0; return null; }
  const agora=saldoFoto();
  if(!_saldoFoto){ _saldoFoto=agora; return null; }
  const partes=saldoPartes(_saldoFoto,agora);
  _saldoFoto=agora;
  if(!partes.length){ _saldoSeguidas=0; return null; }
  if(_saldoSeguidas>=SALDO_CFG.maxSeguidas){ _saldoSeguidas=0; return null; }
  _saldoSeguidas++;
  saldoEstilo();
  const T2=document.getElementById('texto');
  if(!T2)return null;
  const p=document.createElement('p');
  p.className='saldo';
  p.innerHTML=partes.join(' <span style="opacity:.35">·</span> ');
  T2.appendChild(p);
  T2.scrollTop=T2.scrollHeight;
  return partes.length;
}

function saldoLigar(){
  if(_saldoTimer)return;
  _saldoTimer=setInterval(()=>{ try{ saldoConferir(); }catch(e){} },SALDO_CFG.intervalo);
}
function saldoDesligar(){
  if(_saldoTimer){ clearInterval(_saldoTimer); _saldoTimer=null; }
}
/* a tela limpa também limpa a foto: mudança que aconteceu ANTES da
   troca de tela não deve aparecer depois dela, fora de contexto */
if(typeof limpar==='function'){
  const _sdLimpar=limpar;
  limpar=function(){
    const r=_sdLimpar.apply(this,arguments);
    try{ if(saldoJogando())_saldoFoto=saldoFoto(); }catch(e){}
    _saldoSeguidas=0;
    return r;
  };
}
saldoLigar();

/* ---------- o jogador pode desligar ----------
   Quem já decorou o jogo não precisa da conta na cara. A chave fica
   junto das outras opções e o estádo vai pro save. */
function saldoAlternar(){
  _saldoLigado=!_saldoLigado;
  S.semSaldo=!_saldoLigado;
  if(typeof marcarSujo==='function')marcarSujo();
  return _saldoLigado;
}
if(typeof S!=='undefined'&&S.semSaldo)_saldoLigado=false;
if(typeof carregar==='function'){
  const _sdCarregar=carregar;
  carregar=function(){
    const r=_sdCarregar.apply(this,arguments);
    try{ _saldoLigado=!S.semSaldo; _saldoFoto=null; }catch(e){}
    return r;
  };
}

/* a escolha vai pro save. `salvar()` monta um objeto com campo por
   campo, entao quem quer guardar coisa nova anexa aqui — e ANEXA:
   se não ha save na mao, não cria um, senão ressuscita o save fantasma
   que apagou a abertura narrada (v60). */
if(typeof salvar==='function'){
  const _sdSalvar=salvar;
  salvar=function(){
    _sdSalvar.apply(this,arguments);
    try{
      const cru=localStorage.getItem(CHAVE);
      if(!cru)return;
      const d=JSON.parse(cru);
      d.semSaldo=!!S.semSaldo;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/saldo'); }
  };
}

/* ================= O GUIA, UMA IDEIA POR LINHA =================

   As 851 falas do jogo tem mediana de 10 palavras. As QUATRO que passam
   de 28 são quase todas daqui: a tela de ajuda empacotava três regras
   numa frase só.

     "Pergunte. Resposta impossível vira aviso na lista, e aviso na
      lista é mentira na certa. Mas nem toda mentira deixa aviso — por
      isso existem a corrente, o olho mágico e a janela do sótão."

   Sao quatro coisas diferentes numa respirada. Quem está aprendendo o
   jogo perde as três últimas.

   Aqui a reescrita e certa, e e a única do jogo: isto e texto de
   INSTRUÇÃO, não de história. Instrucao pode e deve ser direta. A
   prosa da casa continua intocada — ela não está explicando nada, ela
   está contando. */
function guiaLinhas(){
  const maxP=(typeof S!=='undefined'&&S.maxPerguntas)||3;
  return [
    ['t','A PORTA'],
    ['n','Alguém bate. Você decide se abre.'],
    ['n','Você tem '+maxP+' perguntas por noite. Use antes de decidir.'],
    ['n','Resposta que ninguém lá fora poderia dar vira AVISO na sua lista.'],
    ['a','Aviso na lista quer dizer mentira. Sempre.'],
    ['n','Mas nem toda mentira deixa aviso.'],
    ['n','Por isso também existem o olho mágico, a corrente e o ouvido na porta.'],
    ['a','E elas decoram as perguntas que você repete. Varie.'],

    ['t','O DIA'],
    ['n','Das 7h às 19h.'],
    ['n','Andar pela casa é de graça. Fazer coisa gasta hora.'],
    ['n','De manhã você dá uma tarefa pra cada pessoa.'],
    ['n','O que elas fizeram aparece à noite.'],

    ['t','A CASA'],
    ['n','Comida, água e moral caem sozinhos todo dia.'],
    ['n','Sem água, todo mundo perde moral mais rápido.'],
    ['a','Moral no chão faz alguém tentar abrir a porta de madrugada.'],
    ['n','Coisa quebrada piora se você deixar. Algumas viram coisa pior.'],

    ['t','O QUE VOCÊ CONSTRÓI'],
    ['n','Cada tábua pregada tira 3,5% do risco de invasão.'],
    ['n','A tranca de ferro aguenta um encontro a mais.'],
    ['n','E impede que abram a porta por dentro.'],
    ['s','Confira tudo na ENTRADA, em "Olhar a porta de perto".'],

    ['t','O QUE APARECE EMBAIXO DAS FRASES'],
    ['n','A frase conta o que aconteceu com as pessoas.'],
    ['n','A linha curta embaixo conta o que aconteceu com a casa.'],
    ['s','−1 remédio  ·  +6 de ruído  ·  +Damião'],
    ['n','Dourado é o que você ganhou. Vermelho é o que você perdeu.'],

    ['t','O QUE NINGUÉM TE CONTA'],
    ['p','Nem tudo que passa pelas perguntas é gente.']
  ];
}
if(typeof telaAjuda==='function'){
  telaAjuda=function(){
    limpar(); cap('Como isso funciona');
    const cls={t:'sist',n:'narr',a:'alerta',p:'perigo',s:'fraco'};
    guiaLinhas().forEach(([c,txt])=>diz(txt,cls[c]||'narr'));
    AC.innerHTML='';
    botao('Voltar',()=>irPara(cena.casa?cena.casa.voce:4),{cls:'chave'});
  };
}

function saldoEstado(){
  return {guia:guiaLinhas().length, ligado:_saldoLigado, temFoto:!!_saldoFoto,
    itens:SALDO_ITENS.map(i=>i.k), intervalo:SALDO_CFG.intervalo,
    jogando:saldoJogando()};
}
/* pra ver a linha sem esperar acontecer */
function saldoDemo(){
  const a=saldoFoto();
  const b={...a, comida:a.comida-2, remedio:a.remedio-1, ruido:a.ruido+7,
    _pessoas:(a._pessoas?a._pessoas+'|':'')+'Damião'};
  return saldoPartes(a,b);
}
