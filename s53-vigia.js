/* ================= §53 · A PRESENÇA, E COMO SABER SE ELA É SUA =========

   AUDITORIA PRIMEIRO, E PELA QUINTA VEZ A COISA JÁ EXISTIA EM PARTE.

   O V72 §6 pede "presença com falso positivo declarado e assinatura por
   fonte". O falso positivo declarado JÁ EXISTE e é bom: `ILUSOES_SOM`
   tem nove ilusões em três trilhos, cada uma com texto de `real`, de
   `falso` e de `ignora`, e a chance de ser real cai junto com a cabeça.
   Medido, estágio por estágio:

     lúcido      não acontece
     tenso       54% de ser real
     fissurado   40%
     rachado     22%
     desfeito     6%

   O QUE FALTAVA, TAMBÉM MEDIDO:

   1. No lúcido não acontece NADA. Quem se cuida nunca encontra o
      sistema — e "nem todo evento estranho é ameaça" tem de valer desde
      o primeiro dia, só que com a balança pro lado do real.
   2. As nove ilusões são SOM. `ilusões sem som: nenhuma`. Não existe
      presença que você SENTE em vez de ouvir, que é o buraco que a
      auditoria da v72 apontou: "não é percepção sem entidade".
   3. Não há assinatura que o jogador possa APRENDER. O `trilho` é
      interno; o texto explica cada caso depois, mas nada se acumula.

   O QUE ENTRA AQUI, e o que de propósito NÃO entra.

   NÃO entra um sistema de eventos novo. A auditoria da v72 já avisa que
   empilhar evento em cima de orquestrador, costuras, pressão e diretor é
   o caminho mais curto pra feira de sustos. Isto aqui é uma LENTE: lê
   estado que já existe e não agenda nada, não gasta orçamento, não
   compete por turno.

   AS QUATRO FONTES, cada uma com a assinatura que a denuncia:

     PORTA   tem direção e fica onde está. Você anda, ela não vem junto.
     DENTRO  te acompanha de cômodo em cômodo. É a única que muda de
             lugar com você.
     LUGAR   é do cômodo, não sua. Sai quando você sai e está igual
             quando você volta.
     VOCE    é o falso positivo. Não tem direção, não se repete igual, e
             cede quando você confere.

   A REGRA DE OURO, que é o motivo de o falso positivo não ser sorteio:
   ele só acontece quando a SUA condição explica — cabeça ruim, ferida,
   escuro sem lanterna, ou o silêncio oco do §52. Depois do fato o
   jogador sempre consegue dizer por quê. Sorteio puro seria o erro que
   o briefing proíbe: "se um evento não puder ser explicado pelo jogador
   depois que ele acontece, o evento está errado".

   E ele NÃO consome o gerador semeado. A lição do §52 custou três
   asserções do `dirteste`: a escolha vai por `semente()`, que é
   determinística e não empurra a sequência de ninguém. */

const VIG_CFG={
  /* de quanta leitura pra cima a sensação aparece em texto */
  limiar:.34,
  /* no mínimo tantas trocas de cômodo entre dois falsos positivos, pra
     a sensação não virar papel de parede */
  descanso:3,
  /* o que faz a cabeça inventar. Cada um vale um tanto, e a soma é a
     chance. Tudo aqui é condição DO JOGADOR: é o que torna explicável. */
  causas:{
    cabeca:{peso:.55, n:'a sua cabeça'},   /* sanidade abaixo do corte */
    ferida:{peso:.25, n:'a ferida'},
    escuro:{peso:.30, n:'o escuro'},
    oco:   {peso:.25, n:'o silêncio'}
  },
  cabecaCorte:62,
  /* teto: mesmo com tudo ruim, a cabeça não inventa mais que isso */
  falsoMax:.72
};

const VIG={trocas:0, ultimoFalso:-99, ultima:null};

/* ---------- as causas do falso positivo, nomeadas ---------- */
function vigCausas(){
  const c=[];
  /* NAO chame a variavel de `san`: `const san = ... typeof san ...` se
     sombreia, cai na zona morta temporal e o `typeof` ESTOURA. O codigo
     parecia funcionar porque o catch pegava — e o `san()` de verdade
     nunca era consultado, so o campo cru. Erro meu, achado relendo. */
  let cabeca=100;
  try{ cabeca=(typeof san==='function')?san():(S.sanidade!=null?S.sanidade:100); }
  catch(e){ cabeca=(S.sanidade!=null?S.sanidade:100); }
  if(cabeca<VIG_CFG.cabecaCorte)c.push('cabeca');
  if(S.ferido>0)c.push('ferida');
  if(!S.lanterna&&(S.hora>=18||S.hora<6))c.push('escuro');
  try{ if(typeof silencioEstado==='function'&&silencioEstado().estado==='OCO')c.push('oco'); }catch(e){}
  return c;
}
function vigChanceFalso(){
  const cs=vigCausas();
  if(!cs.length)return 0;
  let p=0;
  cs.forEach(k=>{ p+=VIG_CFG.causas[k].peso; });
  return Math.min(VIG_CFG.falsoMax,p);
}

/* ---------- as fontes de verdade, lidas do que já existe ---------- */
function vigFonteReal(comodo){
  /* 1. alguma coisa DENTRO da casa: o cerco já lista */
  try{
    const C=(typeof cerco==='function')?cerco():null;
    if(C&&C.ativo&&Array.isArray(C.dentro)&&C.dentro.length)
      return {fonte:'DENTRO', forca:.9, quem:C.dentro[0]&&C.dentro[0].id};
  }catch(e){}
  /* 2. alguma coisa na soleira */
  try{
    if(S.visitante&&(S.porta&&S.porta.batendo||cena&&cena.modo==='porta'))
      return {fonte:'PORTA', forca:.8};
  }catch(e){}
  /* 3. o cômodo carrega uma costura desfeita ou uma anomalia ativa */
  try{
    if(typeof costEstado==='function'){
      const d=(costEstado().desfeitos||[]).filter(x=>x.comodo===comodo);
      if(d.length)return {fonte:'LUGAR', forca:Math.min(.85,.45+d.length*.2)};
    }
  }catch(e){}
  try{
    if(Array.isArray(S.anomAtivasLista)&&S.anomAtivasLista.length&&S.anomComodo===comodo)
      return {fonte:'LUGAR', forca:.6};
  }catch(e){}
  return null;
}

/* ---------- a leitura ----------
   Pura: não escreve nada, não sorteia nada. Dá pra chamar à vontade. */
function vigiaLer(comodo){
  const cm=(comodo==null)
    ?((typeof cena!=='undefined'&&cena.casa&&cena.casa.voce!=null)?cena.casa.voce|0:0)
    :comodo|0;
  const real=vigFonteReal(cm);
  if(real)return {...real, comodo:cm, verdade:true, causas:[]};
  const cs=vigCausas();
  const p=vigChanceFalso();
  if(!p)return {fonte:null, forca:0, comodo:cm, verdade:false, causas:cs};
  /* DETERMINÍSTICO, e de propósito: `semente` não gasta o gerador do
     jogo (a lição do §52) e ainda faz a sensação se repetir igual se
     você voltar no mesmo cômodo no mesmo dia — que é parte da
     assinatura de LUGAR e o contrário da de VOCE. Por isso entra o
     número de trocas: o falso positivo varia entre visitas. */
  const semeado=semente(1301+((S.dia|0)*7)+cm*29, VIG.trocas);
  const acende=semeado<p;
  return {fonte:acende?'VOCE':null, forca:acende?trava(p,0,1):0,
    comodo:cm, verdade:false, causas:cs};
}

/* ---------- como isso vira frase ----------
   A frase CARREGA a assinatura. É assim que o jogador aprende: não tem
   tabela em lugar nenhum, tem o jeito de cada uma se comportar. */
const VIG_FALAS={
  PORTA:[
    'Alguma coisa está virada pra cá, e está do lado de fora da porta.',
    'A sensação tem lado. Ela vem da entrada e fica lá.'
  ],
  DENTRO:[
    'A sensação te acompanhou até aqui. Ela mudou de cômodo com você.',
    'Seja o que for, entrou. E anda no mesmo passo que o seu.'
  ],
  LUGAR:[
    'A sensação é deste cômodo. Ela não veio com você e não vai embora com você.',
    'Alguma coisa aqui está errada, e a coisa é o cômodo.'
  ],
  VOCE:[
    'Você sente que tem alguém. Não tem lado, não tem altura, não tem lugar.',
    'A nuca arrepia. A sensação não aponta pra nada.'
  ]
};
/* e a causa entra junto quando é você mesmo: é o que fecha a explicação */
function vigMotivo(causas){
  if(!causas||!causas.length)return '';
  const n=causas.map(k=>VIG_CFG.causas[k].n);
  if(n.length===1)return ' ('+n[0]+')';
  return ' ('+n.slice(0,-1).join(', ')+' e '+n[n.length-1]+')';
}

function vigiaFrase(l){
  if(!l||!l.fonte)return null;
  const banco=VIG_FALAS[l.fonte]||[];
  if(!banco.length)return null;
  const i=(((S.dia|0)+VIG.trocas)%banco.length+banco.length)%banco.length;
  return banco[i]+(l.fonte==='VOCE'?vigMotivo(l.causas):'');
}

/* ---------- onde ela aparece ----------
   Na troca de cômodo, que é quando a assinatura fica legível: é andando
   que você descobre se a coisa te seguiu, ficou ou nunca esteve. */
function vigiaNoComodo(comodo){
  const l=vigiaLer(comodo);
  VIG.ultima=l;
  if(!l.fonte||l.forca<VIG_CFG.limiar)return null;
  if(l.fonte==='VOCE'&&(VIG.trocas-VIG.ultimoFalso)<VIG_CFG.descanso)return null;
  if(l.fonte==='VOCE')VIG.ultimoFalso=VIG.trocas;
  const f=vigiaFrase(l);
  if(f&&typeof diz==='function'){ try{ diz(f,'fraco'); }catch(e){} }
  return l;
}

if(typeof irPara==='function'){
  const _ip=irPara;
  irPara=function(id){
    const r=_ip.apply(this,arguments);
    VIG.trocas++;
    try{ vigiaNoComodo(id); }catch(e){}
    return r;
  };
}

/* ---------- conferir ----------
   O contra-jogo. `menuRealidade` já é o lugar de "conferir a realidade"
   no jogo, então a presença entra LÁ e não numa tela nova. Conferir
   custa o que já custa parar: o falso positivo cede, o verdadeiro não. */
if(typeof menuRealidade==='function'){
  const _mr=menuRealidade;
  menuRealidade=function(volta){
    _mr.apply(this,arguments);
    const l=VIG.ultima;
    if(!l||!l.fonte)return;
    if(typeof botao!=='function')return;
    botao('Conferir a sensação',()=>{
      const agora=vigiaLer(l.comodo);
      /* A ORDEM: redesenha o menu ANTES de falar. `limpar()` nao apaga,
         esmaece — entao dizer primeiro e redesenhar depois deixava a
         resposta ja apagada na hora em que ela aparecia. O teste pegou:
         o botao existia, a resposta era escrita, e nao dava pra ler. */
      if(typeof menuRealidade==='function')menuRealidade(volta);
      if(agora.verdade){
        diz('Você confere, e ela continua. '+
          (agora.fonte==='DENTRO'?'Está dentro de casa.'
           :agora.fonte==='PORTA'?'Está do lado de fora da porta.'
           :'É do cômodo.'),'perigo');
      }else{
        diz('Você confere. Não tem nada, e a sensação cede assim que você olha'
          +vigMotivo(l.causas)+'.','bom');
        VIG.ultimoFalso=VIG.trocas;
      }
    },{custo:'o que você já sente'});
  };
}

function vigiaEstado(){
  const l=VIG.ultima||vigiaLer();
  return {
    fonte:l.fonte, forca:+(l.forca||0).toFixed(3), verdade:!!l.verdade,
    comodo:l.comodo, causas:l.causas||[],
    chanceFalso:+vigChanceFalso().toFixed(3),
    trocas:VIG.trocas, ultimoFalso:VIG.ultimoFalso,
    frase:vigiaFrase(l), cfg:{...VIG_CFG}
  };
}
