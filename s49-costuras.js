/* ============ §49 — AS COSTURAS ============

   O QUE ESTE BLOCO NAO FAZ, E POR QUE
   -----------------------------------
   Ele NAO mexe no final. O pedido era "o final e ele acordando, e nada
   daquilo aconteceu" — e o final ja e exatamente isso desde o §33:

     "Hora de acordar."  ·  "Ele abriu os olhos."
     "Quatro anos, e a casa, o gerador, a irma que saiu buscar comida e
      nunca mais voltou (...) nada daquilo tinha acontecido fora da
      propria cabeca dele."

   Nenhuma linha do `FIM_CENA` foi tocada. O que faltava era o
   CONTRARIO: durante os 30 dias o jogo nunca planta nada que faca o
   jogador desconfiar. Os `SONHOS` existem, mas sao declaradamente
   sonhos — sonho e o lugar seguro pra coisa estranha acontecer. A
   revelacao chegava sem preparo nenhum.

   As costuras sao esse preparo.

   POR QUE ISSO NAO VIOLA A REGRA DE OURO
   --------------------------------------
   "Se um evento nao puder ser explicado pelo jogador depois que ele
   acontece, o evento esta errado." Uma coisa sumir como se nunca
   tivesse existido parece o exemplo perfeito de evento inexplicavel —
   e e o contrario: e o evento MAIS explicavel do jogo, porque o final
   inteiro existe pra explicar ele. A costura nao e aleatoriedade. E a
   costura do sonho aparecendo.

   E ate o final chegar, ela ainda e explicavel por uma regra que o
   jogador pode aprender sozinho, que e a de baixo.

   A REGRA QUE O JOGADOR APRENDE
   -----------------------------
   So some o que voce viu SOZINHO. Coisa que outra pessoa da casa viu
   junto com voce nao pode ser desfeita — e isso da contra-jogo de
   verdade: andar acompanhado protege a sua memoria. Nao e um numero
   novo, e uma razao nova pra usar gente que o jogo ja tem.

   A LEI QUE MANTEM ISTO JUSTO
   ---------------------------
   COSTURA NENHUMA MEXE EM CONTADOR. Nao tira comida, nao tira material,
   nao tira ferramenta, nao fecha rota, nao machuca, nao gasta tempo.
   Ela tira o FATO, nao o recurso: seus numeros nao se movem, so a sua
   certeza. Por isso ela nao precisa de tell antes — porque nao ha dano
   pra avisar. Punir sem aviso e a proibicao nº 9; assustar sem aviso e
   o trabalho.

   Os objetos existem so pra serem notados e desfeitos. Nenhum deles tem
   peso de jogo. Isso e de proposito: um objeto util que some vira
   punicao, e punicao aleatoria e exatamente o que este jogo nao faz.
   ====================================================================== */

const COST_CFG={
  /* quantas costuras no dia inteiro, no maximo. Duas ja e muito: a
     terceira vira chuvisco, que e o problema que o §37 diagnosticou na
     linha de saldo. */
  porDia:2,
  /* nunca duas seguidas no mesmo comodo */
  evitaRepetirComodo:true,
  /* a chance base por entrada em comodo, antes das fases */
  base:0.11,
  /* a partir de que dia cada fase entra */
  fases:[
    {dia:1,  nome:'nada',      peso:0},
    {dia:4,  nome:'objeto',    peso:1},
    {dia:11, nome:'comodo',    peso:1},
    {dia:19, nome:'pessoa',    peso:1},
    {dia:25, nome:'voce',      peso:1}
  ],
  /* a pressao do §42 empurra, mas nunca sozinha */
  pesoPressao:0.6
};

/* ---------- os objetos, um punhado por comodo ----------
   Cada um sai do texto que o proprio jogo escreve em `AMBIENTE`. Sao
   coisas pequenas e inuteis de proposito: prego, marca de fita, risco
   de faca. Nada aqui tem peso de jogo — e essa e a garantia de que a
   costura nunca vira punicao. */
const COST_OBJ={
 0:[{a:'Tem um prego torto batido alto na viga, com um pedaço de arame enrolado nele.',
     f:'A viga não tem prego nenhum. A madeira é lisa onde você jurava ter visto o arame.'},
    {a:'Alguém riscou quatro traços e um corte na parede, contando alguma coisa.',
     f:'A parede está limpa. Não tem risco, e o reboco não tem sinal de ter sido passado por cima.'}],
 1:[{a:'Tem um sapato de criança sozinho embaixo do colchão do canto.',
     f:'Debaixo do colchão só tem chão. O pó está uniforme, como se nada tivesse ficado ali.'},
    {a:'Uma das janelas tapadas tem uma fresta do tamanho de um dedo, e alguém colou fita nela.',
     f:'O compensado é inteiro. Não tem fresta, não tem fita, não tem cola velha na borda.'}],
 2:[{a:'A terceira prateleira está torta e foi escorada com um tijolo.',
     f:'A terceira prateleira está reta. Não tem tijolo embaixo dela nem marca de onde ele estaria.'},
    {a:'Tem uma lata sem rótulo no fundo, que ninguém quis abrir.',
     f:'O fundo da prateleira está vazio. Você lembra do formato dela na sua mão.'}],
 3:[{a:'Tem um vidro de prego pela metade em cima da bancada, com a tampa de outro vidro.',
     f:'A bancada não tem vidro nenhum. O anel de ferrugem que a tampa deixa também não está.'},
    {a:'Alguém deixou uma medida de madeira marcada a lápis: 62 cm.',
     f:'A tábua não tem marca de lápis. E você lembra do número.'}],
 4:[{a:'O sofá tem um rasgo no braço direito, e sai espuma amarelada por ele.',
     f:'O braço direito do sofá está inteiro. Não tem rasgo, não tem espuma, não tem costura.'},
    {a:'Tem um porta-retratos virado pra baixo em cima da estante.',
     f:'A estante está vazia. Nem porta-retratos, nem a falha de poeira que ele deixaria.'}],
 5:[{a:'A boca de trás do fogão está entupida e alguém marcou ela com fita crepe.',
     f:'As quatro bocas estão iguais. Não tem fita, e a de trás acende.'},
    {a:'Tem uma caneca lascada no escorredor, sempre a mesma.',
     f:'O escorredor está vazio e seco. Faz tempo que está seco.'}],
 6:[{a:'Tem um galão vazio ao lado do gerador, com o bico cortado pra virar funil.',
     f:'Não tem galão nenhum ao lado do gerador. O chão de concreto está limpo ali.'},
    {a:'Alguém escreveu a quilometragem do gerador na parede, a caneta.',
     f:'A parede não tem nada escrito. E você lembra do número que estava lá.'}],
 7:[{a:'Uma das tábuas atravessadas na porta tem um nó grande, quase um buraco.',
     f:'Nenhuma das tábuas tem nó. Você passava a mão nele toda vez que chegava aqui.'},
    {a:'Tem um par de botas encostado na parede, do tamanho errado pra todo mundo.',
     f:'Não tem bota nenhuma na parede. E ninguém aqui tem esse número de pé.'}],
 8:[{a:'Tem um pneu velho encostado no muro, cheio de água parada.',
     f:'O muro está livre. A terra ali é dura e uniforme, sem a marca redonda que um pneu deixa.'},
    {a:'Alguém soldou uma barra a mais no portão, e a solda ficou grossa e feia.',
     f:'O portão tem as barras originais. A solda grossa não está em lugar nenhum.'}]
};

/* ---------- o estado ---------- */
function costEstado(){
  if(!S.costuras||typeof S.costuras!=='object')S.costuras={};
  const c=S.costuras;
  if(!Array.isArray(c.postos))c.postos=[];      /* {comodo, i, dia, protegido} */
  if(!Array.isArray(c.desfeitos))c.desfeitos=[];/* {comodo, i, dia, tipo} */
  if(typeof c.noDia!=='number')c.noDia=0;
  if(typeof c.diaDoContador!=='number')c.diaDoContador=S.dia|0;
  if(c.ultimoComodo===undefined)c.ultimoComodo=null;
  return c;
}

/* quem mais estava no cômodo quando você viu a coisa */
function _acompanhado(id){
  try{
    return (S.abrigo||[]).some(p=>p&&p.comodo===id);
  }catch(e){ return false; }
}

function _faseAtual(){
  const d=S.dia|0;
  let f=COST_CFG.fases[0];
  for(const x of COST_CFG.fases) if(d>=x.dia) f=x;
  return f.nome;
}

/* ---------- estabelecer: a primeira vez que você repara ---------- */
function costEstabelecer(id){
  const c=costEstado();
  const lista=COST_OBJ[id]; if(!lista||!lista.length)return null;
  if(c.postos.some(p=>p.comodo===id))return null;      /* já tem um aqui */
  if(_faseAtual()==='nada')return null;
  if(!chance(0.55))return null;                         /* nem toda entrada */
  const i=_inteiro(lista.length);
  const p={comodo:id, i, dia:S.dia|0, protegido:_acompanhado(id)};
  c.postos.push(p);
  if(typeof marcarSujo==='function')marcarSujo();
  if(typeof diz==='function')diz(lista[i].a,'narr');
  return p;
}

/* ---------- desfazer: a coisa nunca esteve ali ---------- */
function costPodeDesfazer(){
  const c=costEstado();
  if((S.dia|0)!==c.diaDoContador){ c.diaDoContador=S.dia|0; c.noDia=0; }
  if(c.noDia>=COST_CFG.porDia)return false;
  if(_faseAtual()==='nada')return false;
  if(S.inv)return false;                    /* nunca no meio de uma invasão */
  if(cena&&cena.modo!=='casa')return false; /* só dentro de casa */
  return true;
}

function costDesfazer(id){
  const c=costEstado();
  if(!costPodeDesfazer())return null;
  if(COST_CFG.evitaRepetirComodo&&c.ultimoComodo===id)return null;
  const posto=c.postos.find(p=>p.comodo===id&&!p.protegido&&
    !c.desfeitos.some(d=>d.comodo===p.comodo&&d.i===p.i));
  if(!posto)return null;
  if(posto.dia>=(S.dia|0))return null;       /* não desfaz no mesmo dia em que viu */
  /* a pressão do §42 empurra, mas a base decide */
  let p=COST_CFG.base;
  try{ if(typeof pressaoAgora==='function')p+=pressaoAgora()*COST_CFG.pesoPressao*0.1; }catch(e){}
  if(!chance(Math.min(0.4,p)))return null;
  const lista=COST_OBJ[id];
  c.desfeitos.push({comodo:id,i:posto.i,dia:S.dia|0,tipo:_faseAtual()});
  c.noDia++; c.ultimoComodo=id;
  if(typeof marcarSujo==='function')marcarSujo();
  if(typeof diz==='function'){
    diz(lista[posto.i].f,'alerta');
    /* a segunda linha é o que separa isto de um bug de descrição:
       o jogo reconhece que VOCÊ lembra, e não desmente você. */
    diz(_lembranca(),'sonho');
  }
  return posto;
}

const COST_LEMBRA=[
 'Você lembra de ter visto. Lembra do lugar, lembra da luz que batia.',
 'Não é o tipo de coisa que a gente inventa. É pequena demais pra ser invenção.',
 'Você fica um tempo olhando o lugar vazio, esperando ele se corrigir.',
 'A casa não parece ter mudado. Parece ter sido sempre assim.',
 'Você conta de novo, do começo, e chega no mesmo lugar.'
];
function _lembranca(){ return sortear(COST_LEMBRA); }

/* ---------- a pessoa não lembra ----------
   Perguntar sobre uma costura devolve a mesma negativa tranquila. Isso
   e o que fecha a duvida: nao e a casa que mente pra voce, e todo mundo
   que nunca viu. */
function costPerguntar(nome){
  const c=costEstado();
  if(!c.desfeitos.length)return null;
  const d=c.desfeitos[c.desfeitos.length-1];
  const quem=nome||((S.abrigo&&S.abrigo[0]&&S.abrigo[0].n)||'alguém');
  return sortear([
    quem+' escuta até o fim, com paciência, e diz que nunca teve isso aí.',
    quem+' pergunta se você anda dormindo direito. Não é ironia. É preocupação.',
    quem+' diz que mora nessa casa desde antes de você e que isso nunca existiu.'
  ]);
}

/* ---------- ganchos ---------- */
if(typeof irPara==='function'){
  const _ip=irPara;
  irPara=function(id,semTexto){
    const r=_ip.apply(this,arguments);
    try{
      if(!semTexto&&cena&&cena.modo==='casa'){
        /* desfazer primeiro: a coisa some ENTRE duas visitas, nunca na
           sua frente. Se sumisse enquanto voce olha, seria efeito; assim
           e memoria. */
        const foi=costDesfazer(id);
        if(!foi)costEstabelecer(id);
      }
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'costuras/irPara'); }
    return r;
  };
}

/* ---------- persistência ----------
   O bloco ANEXA a um save; nunca CRIA um. E repete a guarda da base,
   que e a regra que a v60 pagou pra aprender. */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      if(!S.nomeJogador)return;
      const cru=localStorage.getItem(CHAVE);
      if(!cru)return;
      const d=JSON.parse(cru);
      d.costuras=S.costuras||null;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/costuras'); }
  };
}
/* save antigo não tem costura nenhuma, e não ter é o estado certo */
if(!S.costuras)S.costuras=null;

/* ---------- conferência ---------- */
function costurasEstado(){
  const c=costEstado();
  return {
    fase:_faseAtual(),
    comodosComObjeto:COST_OBJ?Object.keys(COST_OBJ).length:0,
    objetosPorComodo:Object.keys(COST_OBJ).map(k=>COST_OBJ[k].length),
    postos:c.postos.length,
    protegidos:c.postos.filter(p=>p.protegido).length,
    desfeitos:c.desfeitos.length,
    noDia:c.noDia,
    tetoPorDia:COST_CFG.porDia
  };
}

/* ---------- a coda do final ----------
   NENHUMA linha do `FIM_CENA` foi alterada. Isto ANEXA duas ou tres
   linhas no fim, e so quando o jogador teve costuras — porque so aí
   elas significam alguma coisa.

   E o motivo de existir: o final ja explicava que nada aconteceu. Ele
   nao sabia QUAIS coisas o jogador tinha visto sumir. Agora sabe, e
   fecha nelas, com o objeto que a casa desfez na frente dele. */
const COST_CODA_ABRE=
 'Ele ficou um tempo tentando entender por que, de tudo, era isso que voltava primeiro.';
function costCoda(){
  const c=costEstado();
  if(!c.desfeitos.length)return [];
  const ultimo=c.desfeitos[c.desfeitos.length-1];
  const obj=(COST_OBJ[ultimo.comodo]||[])[ultimo.i];
  if(!obj)return [];
  /* a frase de "está lá", sem o ponto final, vira a lembrança */
  const lembrado=obj.a.replace(/\.$/,'').replace(/^Alguém /,'alguém ')
    .replace(/^Tem /,'tinha ').replace(/^Uma /,'uma ').replace(/^A /,'a ')
    .replace(/^O /,'o ').replace(/^Debaixo /,'debaixo ');
  const n=c.desfeitos.length;
  const linhas=[{t:COST_CODA_ABRE}];
  linhas.push({t:'Não a porta, não as batidas, não o gerador. '+
    lembrado.charAt(0).toUpperCase()+lembrado.slice(1)+
    ' — e o dia em que ele voltou naquele cômodo e não tinha mais nada ali.'});
  if(n>=3) linhas.push({t:'Aconteceu '+n+' vezes, e ele lembra das '+n+'. '+
    'Foi a única coisa daquele mês inteiro que ele nunca conseguiu explicar pra si mesmo — '+
    'e, agora, a única que faz sentido.'});
  linhas.push({t:'Uma coisa que não estava mais lá porque nunca tinha estado. '+
    'Como o resto.'});
  return linhas;
}
if(typeof cenaEmTexto==='function'){
  const _ct=cenaEmTexto;
  cenaEmTexto=async function(caixa,cancelado){
    let n=0;
    try{
      const extra=costCoda();
      extra.forEach(l=>{ FIM_CENA.push(l); n++; });
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'costuras/coda'); }
    try{ return await _ct.apply(this,arguments); }
    finally{ while(n-->0)FIM_CENA.pop(); }   /* devolve a cena como estava */
  };
}
