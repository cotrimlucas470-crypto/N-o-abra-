/* ============ §44 — ACHADOS E CONHECIMENTO (Etapa 6 de 9) ============

   A5 pede oito categorias de achado, nenhuma podendo ser "so pontos".
   A6 pede que documento nao seja colecionavel: todo documento carrega
   uma REGRA utilizavel, e descobrir a regra tem de mudar o
   comportamento do sistema — nao so o texto do caderno.

   E A6 pede uma regra FALSA por campanha. Uma so basta pra envenenar a
   confianca do jogador em tudo que ele le, que e o ponto.

   O PRESENTE QUE ESTAVA ESCONDIDO
   -------------------------------
   O contra-jogo do Rastejante e a linha de sal. Sal nao existia como
   item nem como mecanica — mas os moradores JA FALAVAM dele, como
   crendice, em duas falas escritas ha versoes:

     '"Deixa eu botar sal na soleira. Nao custa nada."'
     `${p.n} bota sal na soleira e reza uma coisa curta. Ninguem ri.`

   Descobrir o laudo e perceber que a Dona Lurdes estava certa o tempo
   todo vale mais do que qualquer regra que eu escrevesse do zero. Por
   isso o documento do sal CITA a superstição.
   ====================================================================== */

const ACH_CFG={
  /* chance base de achar alguma coisa ao vasculhar, por camada */
  porCamada: .18,
  /* teto de documentos por campanha: sao poucos e cada um vale */
  documentosPorCampanha: 6,
  /* UMA regra falsa por campanha. Uma so. */
  falsasPorCampanha: 1,
  /* a regra da escassez honesta: nunca atende mais que isto da falta */
  atendeNoMaximo: .6
};

/* ================= AS OITO CATEGORIAS ================= */
const ACH_CATEGORIAS=['recurso','pessoa','documento','equipamento','atalho','secreto','historia','perigo'];

/* ================= OS DOCUMENTOS =================
   Cada um revela uma regra que o resto do jogo LE. Se descobrir nao
   mudar nada, o documento e morto — e essa e a checagem que a guarda de
   build faz. */
const DOCUMENTOS=[
 {id:'doc_sal',regra:'sal_barra_rastejante',camada:2,verdadeiro:true,
  t:'Um laudo datilografado, três folhas grampeadas, com carimbo do posto.',
  diz:'"Nas casas em que houve barreira de cloreto na soleira, não houve entrada pelo piso. '
     +'Trinta e uma casas. Nenhuma exceção."',
  eco:'Você lembra de alguém botando sal na soleira e ninguém rindo.'},
 {id:'doc_luz',regra:'luz_para_magro',camada:1,verdadeiro:true,
  t:'Caderno escolar, letra de criança, a última página escrita com força.',
  diz:'"O ALTO NÃO ENTRA ONDE TEM LUZ ACESA. ELE PARA NA PORTA E FICA OLHANDO. '
     +'NÃO APAGA A LUZ. NÃO APAGA A LUZ."',
  eco:'Está escrito duas vezes. A segunda com mais força que a primeira.'},
 {id:'doc_trilha',regra:'trilha_dobra_rastejante',camada:3,verdadeiro:true,
  t:'Um mapa da quadra desenhado no verso de um cartaz, com setas por cima.',
  diz:'"Ele não segue barulho. Segue pegada. Volte por onde veio — a trilha se dobra '
     +'em cima dela mesma e ele perde o fio."',
  eco:'As setas voltam sobre si mesmas, várias vezes, até virar um nó.'},
 {id:'doc_coro',regra:'saida_unica_contra_coro',camada:2,verdadeiro:true,
  t:'Bilhete preso com fita numa porta de saída única.',
  diz:'"São duas. Precisam de duas portas pra te cercar. Fique onde só tem uma."',
  eco:'A fita está velha. Quem escreveu ficou aqui tempo suficiente pra a fita envelhecer.'},
 {id:'doc_relogio',regra:'porta_cozinha_0300',camada:1,verdadeiro:true,
  t:'Folha de caderno com uma coluna de horários, todos iguais.',
  diz:'"03:00. 03:00. 03:00. 03:00. A porta da cozinha abre sozinha às três. '
     +'Todo dia. Não é vento."',
  eco:'A mesma hora, escrita quarenta vezes, cada vez com a letra pior.'},
 /* --- A FALSA. Uma por campanha. --- */
 {id:'doc_ala_leste',regra:'mapa_ala_leste',camada:3,verdadeiro:false,
  t:'Planta de arquiteto, dobrada em quatro, com anotação a lápis.',
  diz:'"Passagem pela ala leste dá direto no quintal. Rota segura, sem cômodo aberto."',
  eco:'A planta é de outra casa. Você só vai descobrir isso depois.',
  corrigidoPor:'doc_ala_leste_erro'},
 {id:'doc_ala_leste_erro',regra:'mapa_ala_leste_falso',camada:2,verdadeiro:true,corrige:'mapa_ala_leste',
  t:'Meia folha, escrita com pressa, letra tremida.',
  diz:'"A PLANTA ESTÁ ERRADA. É de outra casa. Quem seguiu não voltou. '
     +'Rasguem se acharem."',
  eco:'Não foi rasgada. Quem escreveu não teve tempo.'}
];
const DOC_POR_ID={}; DOCUMENTOS.forEach(d=>DOC_POR_ID[d.id]=d);

/* ================= S.conhecimento ================= */
function conhecimento(){
  if(!S.conhecimento||typeof S.conhecimento!=='object')
    S.conhecimento={schemaVersion:1,regras:{},regrasFalsas:[],fonte:{},lidos:[]};
  const C=S.conhecimento;
  if(!C.regras||typeof C.regras!=='object')C.regras={};
  if(!Array.isArray(C.regrasFalsas))C.regrasFalsas=[];
  if(!C.fonte||typeof C.fonte!=='object')C.fonte={};
  if(!Array.isArray(C.lidos))C.lidos=[];
  return C;
}
function sabe(regra){ return !!conhecimento().regras[regra]; }
function acreditaEmMentira(regra){ return conhecimento().regrasFalsas.indexOf(regra)>=0; }

function lerDocumento(id){
  const d=DOC_POR_ID[id];
  if(!d)return null;
  const C=conhecimento();
  if(C.lidos.indexOf(id)>=0)return null;
  C.lidos.push(id);
  if(typeof diz==='function'){
    diz(d.t,'narr');
    diz(d.diz,'fala');
    if(d.eco)diz(d.eco,'fraco');
  }
  if(d.corrige){
    /* o documento que conserta o outro: a regra falsa cai */
    delete C.regras[d.corrige];
    C.regrasFalsas=C.regrasFalsas.filter(x=>x!==d.corrige);
    C.regras[d.regra]=true; C.fonte[d.regra]=id;
    if(typeof diz==='function')
      diz('Você risca a rota da ala leste do caderno. Com força.','alerta');
  }else{
    C.regras[d.regra]=true;
    C.fonte[d.regra]=id;
    if(!d.verdadeiro)C.regrasFalsas.push(d.regra);
  }
  if(typeof anotar==='function')anotar('Leu: '+d.t.slice(0,42));
  if(typeof marcarSujo==='function')marcarSujo();
  return d;
}

/* ================= AS REGRAS MUDAM O SISTEMA =================
   Sem isto o documento e enfeite. Cada uma e lida por alguem. */

/* sal — a barreira que os moradores ja sussurravam */
function temSalNaSoleira(){ return !!S.salSoleira; }
function porSal(){
  if(!sabe('sal_barra_rastejante'))return false;
  if(S.comida<1)return false;
  S.salSoleira=true;
  if(typeof marcarSujo==='function')marcarSujo();
  return true;
}
if(typeof REGRA!=='undefined'&&REGRA.rastejante){
  const _alvoRast=REGRA.rastejante.alvo;
  REGRA.rastejante.alvo=function(I,c){
    /* com sal na soleira ele nao acha o fio: ronda em vez de seguir */
    if(temSalNaSoleira()&&sabe('sal_barra_rastejante'))return null;
    return _alvoRast.apply(this,arguments);
  };
  REGRA.rastejante.evita=function(id){ return temSalNaSoleira()&&camadaDe(id)<=1; };
}

/* trilha dobrada — voltar por onde veio confunde o Rastejante.
   O jogo JA fazia isso por dentro; o documento e o que conta ao jogador,
   e saber passa a valer um turno de vantagem. */
function trilhaDobrada(){ return sabe('trilha_dobra_rastejante'); }

/* porta da cozinha as 03:00 — o ciclo vira previsivel pra quem leu */
function portaDaCozinhaAbre(){
  return sabe('porta_cozinha_0300') && (S.hora===3);
}

/* a mentira: quem acredita na ala leste tem a rota "segura" que nao e */
function rotaDaAlaLeste(){
  return acreditaEmMentira('mapa_ala_leste');
}
if(typeof custoDeEntrada==='function'){
  const _achCE=custoDeEntrada;
  custoDeEntrada=function(id,de){
    const c=_achCE.apply(this,arguments);
    try{
      /* quem acredita na planta errada anda mais confiante — e mais
         barulhento — no caminho que ele acha que e seguro */
      if(rotaDaAlaLeste()&&camadaDe(id)>=2){
        c.ruido=+(c.ruido*1.35).toFixed(2);
        c.confiancaFalsa=true;
      }
      /* quem leu o laudo do sal anda mais tranquilo em casa */
      if(temSalNaSoleira()&&camadaDe(id)<=1)c.sanidade=+(c.sanidade+.15).toFixed(2);
    }catch(e){}
    return c;
  };
}

/* ================= gerarAchado =================
   Deterministico, e as entradas que o A5 exige pesam de verdade:
   camada, se ja foi saqueado, o que o jogador precisa, o que ele
   ignora, a noite e o clima. */
function faltaDoJogador(){
  const f={};
  if((S.comida|0)<4)f.recurso=(4-(S.comida|0))/4;
  if((S.agua|0)<3)f.agua=(3-(S.agua|0))/3;
  if((S.remedio|0)<1)f.remedio=1;
  if(typeof saude==='function'&&saude().length)f.remedio=1;
  return f;
}
function gerarAchado(comodoId,noite,rg,mem){
  const m=marcaComodo(comodoId);
  const cam=camadaDe(comodoId);
  const r=rg||((typeof rng==='function')?rng():null);
  const sorte=()=>r?r.next():_ale();

  /* comodo saqueado nao regenera sozinho. Se voltou a ter coisa, foi a
     CASA que repos — e isso e sempre suspeito. */
  if(m.saqueado){
    const host=(typeof hostilidade==='function')?hostilidade():0;
    if(sorte()>=host*.5)return null;
    return {categoria:'perigo',reposto:true,camada:cam,
      t:'Tem coisa nesta prateleira de novo. Você esvaziou ela ontem.'};
  }
  if(sorte()>=ACH_CFG.porCamada*(1+cam))return null;

  const falta=faltaDoJogador();
  const pesos={};
  ACH_CATEGORIAS.forEach(c=>{ pesos[c]=1; });
  pesos.recurso=2+ (falta.recurso?2:0);
  pesos.documento=(cam>=1&&conhecimento().lidos.length<ACH_CFG.documentosPorCampanha)?2:0;
  pesos.equipamento=cam>=2?1.5:.5;
  pesos.atalho=cam>=2?1.2:0;
  pesos.secreto=cam>=3?1.2:0;
  pesos.pessoa=cam>=2?1:0;
  pesos.perigo=.6+cam*.5;
  pesos.historia=1.2;
  const cat=r?r.pesado(pesos):'recurso';
  if(!cat)return null;

  const a={categoria:cat,camada:cam,comodo:comodoId,noite:noite|0};
  if(cat==='documento'){
    const livres=DOCUMENTOS.filter(d=>conhecimento().lidos.indexOf(d.id)<0&&d.camada<=cam+1);
    /* a falsa so aparece depois de o jogador ja ter lido coisa verdadeira,
       senao ela nao envenena nada — envenenar exige confianca previa */
    const ok=livres.filter(d=>d.verdadeiro||conhecimento().lidos.length>=2);
    if(!ok.length)return null;
    a.doc=(r?r.escolher(ok):ok[0]).id;
  }
  if(cat==='recurso'){
    /* ESCASSEZ HONESTA: sabe da falta, atende parte dela, nunca tudo */
    const q=Math.max(1,Math.round((falta.recurso?3:2)*ACH_CFG.atendeNoMaximo));
    a.recurso=falta.remedio&&sorte()<.4?'remedio':(falta.agua&&sorte()<.5?'agua':'comida');
    a.qtd=a.recurso==='remedio'?1:q;
    a.parcial=true;
  }
  return a;
}

/* ---------- persistencia ---------- */
function migrarConhecimento(d){
  const C={schemaVersion:1,regras:{},regrasFalsas:[],fonte:{},lidos:[]};
  const v=(d&&d.conhecimento&&typeof d.conhecimento==='object')?d.conhecimento:null;
  if(v){
    C.regras=(v.regras&&typeof v.regras==='object')?v.regras:{};
    C.regrasFalsas=Array.isArray(v.regrasFalsas)?v.regrasFalsas:[];
    C.fonte=(v.fonte&&typeof v.fonte==='object')?v.fonte:{};
    C.lidos=Array.isArray(v.lidos)?v.lidos:[];
    Object.keys(v).forEach(k=>{ if(!(k in C))C[k]=v[k]; });
  }
  return C;
}
if(typeof salvar==='function'){
  const _achSalvar=salvar;
  salvar=function(){
    _achSalvar.apply(this,arguments);
    try{
      if(!S.nomeJogador)return;
      const cru=localStorage.getItem(CHAVE); if(!cru)return;
      const d=JSON.parse(cru);
      if(S.conhecimento&&typeof S.conhecimento==='object')d.conhecimento=S.conhecimento;
      if(S.salSoleira!==undefined)d.salSoleira=!!S.salSoleira;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/conhecimento'); }
  };
}
if(typeof carregar==='function'){
  const _achCarregar=carregar;
  carregar=function(){
    const r=_achCarregar.apply(this,arguments);
    try{
      const cru=localStorage.getItem(CHAVE);
      S.conhecimento=migrarConhecimento(cru?JSON.parse(cru):null);
    }catch(e){}
    return r;
  };
}

/* ---------- conferencia ---------- */
function conhecimentoEstado(){
  const C=conhecimento();
  return {lidos:C.lidos.length, regras:Object.keys(C.regras),
    falsas:C.regrasFalsas.slice(), fonte:C.fonte,
    documentos:DOCUMENTOS.length, verdadeiros:DOCUMENTOS.filter(d=>d.verdadeiro).length,
    falsosNaTabela:DOCUMENTOS.filter(d=>!d.verdadeiro).length};
}
