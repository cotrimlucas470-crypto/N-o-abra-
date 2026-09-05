/* ================= §20 — ARMAS DE FOGO =================
   DECISÃO TÉCNICA, declarada de saída porque muda tudo: este jogo não
   tem mundo em tempo real, câmera livre nem colisor. O combate é uma
   cena de menu que resolve um encontro. Então NÃO existe raycast nem
   projétil físico aqui — seria inventar um mundo 3D pra encaixar um
   sistema que o jogo não tem. O tiro é resolvido por probabilidade
   composta, e é honesto assim: a mesma conta que o jogo já usa pra
   enfrentar bicho com facão, com dispersão, recuo, distância e estado
   da arma entrando nela.

   O que É de verdade, e não simulado: munição por calibre, carregador
   com contagem, câmara separada, recarga que pode ser interrompida,
   espingarda que enche cartucho por cartucho, desgaste, travamento,
   e o ruído do disparo entrando no sistema de rastro do §9.

   COMO ADICIONAR UMA ARMA: veja `ARMAS_EXEMPLO` no fim do arquivo.
   Uma arma nova é uma entrada de dados; nenhuma linha do núcleo muda.
   ======================================================================= */

/* ---------- calibres ---------- */
const CALIBRES={
 '.38':   {n:'.38', d:'Revólver de casa. Ainda se acha em gaveta.',  ruido:62, peso:.012},
 '9mm':   {n:'9mm', d:'O mais comum que existe. Pistola e submetralhadora.', ruido:60, peso:.011},
 '.12':   {n:'calibre 12', d:'Cartucho de espingarda. Resolve perto.', ruido:78, peso:.045},
 '.22':   {n:'.22', d:'Fininho e quieto. Serve pra caça pequena.', ruido:38, peso:.004},
 '.308':  {n:'.308', d:'Rifle de verdade. Longe, e alto.', ruido:82, peso:.024},
 '7.62':  {n:'7,62', d:'Carabina militar. O que sobrou de quartel.', ruido:76, peso:.020}
};

/* ---------- os campos de uma arma, e o que é obrigatório ----------
   A validação lê esta tabela. Campo obrigatório que faltar vira erro
   legível no console e a arma é recusada — nunca entra meio pronta
   pra quebrar no meio de um tiroteio. */
const ARMA_CAMPOS={
  id:{obrig:true,tipo:'string'},        nome:{obrig:true,tipo:'string'},
  categoria:{obrig:true,tipo:'string'}, calibre:{obrig:true,tipo:'string'},
  capacidade:{obrig:true,tipo:'number'},camara:{padrao:1},
  dano:{obrig:true,tipo:'number'},      alcance:{padrao:3},
  alcanceMax:{padrao:5},                quedaDano:{padrao:.18},
  dispersao:{padrao:1},                 recuoV:{padrao:1}, recuoH:{padrao:.5},
  cadencia:{padrao:1},                  modos:{padrao:['semi']},
  tempoSaque:{padrao:1},                tempoRecarga:{padrao:2.4},
  peso:{obrig:true,tipo:'number'},      durabilidade:{padrao:100},
  confiabilidade:{padrao:.98},          ruido:{padrao:null},
  porCartucho:{padrao:false},           d:{padrao:''},
  desenho:{padrao:null}
};

/* ---------- o catálogo ----------
   Sete categorias, exemplares originais. `porCartucho:true` faz a
   recarga ser de um em um, que é o que espingarda de bomba faz. */
const ARMAS_FOGO={
 pistola_taurus:{id:'pistola_taurus',nome:'Pistola 9mm enferrujada',categoria:'pistola',
   calibre:'9mm',capacidade:12,dano:3.2,alcance:3,alcanceMax:6,dispersao:1.0,
   recuoV:.9,recuoH:.5,cadencia:2.2,modos:['semi'],tempoSaque:.8,tempoRecarga:2.1,
   peso:.9,confiabilidade:.94,
   d:'Ferrugem na corrediça. Come munição comum e trava de vez em quando.'},
 revolver_38:{id:'revolver_38',nome:'Revólver .38 de seis',categoria:'revolver',
   calibre:'.38',capacidade:6,camara:0,dano:3.6,alcance:2.6,alcanceMax:5,dispersao:1.15,
   recuoV:1.2,recuoH:.6,cadencia:1.4,modos:['semi'],tempoSaque:.7,tempoRecarga:3.4,
   peso:1.0,confiabilidade:.99,porCartucho:true,
   d:'Tambor de seis. Nunca trava, e recarregar leva uma eternidade.'},
 smg_caseira:{id:'smg_caseira',nome:'Submetralhadora de oficina',categoria:'smg',
   calibre:'9mm',capacidade:25,dano:2.6,alcance:2.2,alcanceMax:4,dispersao:1.9,
   recuoV:1.5,recuoH:1.3,cadencia:9,modos:['semi','rajada','auto'],
   tempoSaque:1.0,tempoRecarga:2.6,peso:2.6,confiabilidade:.86,
   d:'Feita em torno por alguém com pressa. Cospe munição e trava se você abusar.'},
 espingarda_20:{id:'espingarda_20',nome:'Espingarda de bomba',categoria:'espingarda',
   calibre:'.12',capacidade:5,dano:7.5,alcance:1.6,alcanceMax:3,quedaDano:.45,
   dispersao:2.4,recuoV:2.4,recuoH:.9,cadencia:.9,modos:['semi'],
   tempoSaque:1.3,tempoRecarga:1.0,peso:3.4,confiabilidade:.97,porCartucho:true,
   d:'Perto, resolve qualquer coisa uma vez. Longe, faz barulho e cocega.'},
 carabina_762:{id:'carabina_762',nome:'Carabina 7,62 de quartel',categoria:'carabina',
   calibre:'7.62',capacidade:20,dano:5.2,alcance:5,alcanceMax:9,quedaDano:.10,
   dispersao:.85,recuoV:1.6,recuoH:.7,cadencia:3.5,modos:['semi','rajada'],
   tempoSaque:1.4,tempoRecarga:2.8,peso:3.8,confiabilidade:.95,
   d:'Pesada e certeira. O barulho dela chama tudo que estiver na rua.'},
 rifle_22:{id:'rifle_22',nome:'Rifle .22 de sítio',categoria:'rifle',
   calibre:'.22',capacidade:10,dano:2.0,alcance:4.5,alcanceMax:8,quedaDano:.12,
   dispersao:.75,recuoV:.4,recuoH:.2,cadencia:2,modos:['semi'],
   tempoSaque:1.1,tempoRecarga:2.4,peso:2.2,confiabilidade:.97,
   d:'Mata passarinho e capivara. Contra o que anda de noite, é um aviso.'},
 precisao_308:{id:'precisao_308',nome:'Ferrolho .308 com luneta',categoria:'precisao',
   calibre:'.308',capacidade:5,dano:8.0,alcance:9,alcanceMax:14,quedaDano:.05,
   dispersao:.45,recuoV:2.8,recuoH:.5,cadencia:.55,modos:['semi'],
   tempoSaque:1.9,tempoRecarga:3.6,peso:4.6,confiabilidade:.99,
   d:'Um tiro por vez, e o tiro conta. Depois dele, saia do lugar.'}
};

/* ---------- validação ----------
   Roda no carregamento e em qualquer arma registrada depois. Uma arma
   incompleta é recusada COM MOTIVO, e o jogo continua de pé. */
function validarArma(a){
  const erros=[];
  if(!a||typeof a!=='object')return ['a arma não é um objeto'];
  for(const [campo,regra] of Object.entries(ARMA_CAMPOS)){
    const v=a[campo];
    if(v===undefined||v===null){
      if(regra.obrig)erros.push(`falta o campo obrigatório "${campo}"`);
      else if(regra.padrao!==undefined&&campo!=='desenho'&&campo!=='ruido')a[campo]=Array.isArray(regra.padrao)?regra.padrao.slice():regra.padrao;
      continue;
    }
    if(regra.tipo&&typeof v!==regra.tipo)erros.push(`"${campo}" devia ser ${regra.tipo}, veio ${typeof v}`);
  }
  if(a.calibre&&!CALIBRES[a.calibre])erros.push(`calibre "${a.calibre}" não existe em CALIBRES`);
  if(typeof a.capacidade==='number'&&a.capacidade<1)erros.push('capacidade tem de ser pelo menos 1');
  if(typeof a.dano==='number'&&a.dano<=0)erros.push('dano tem de ser maior que zero');
  return erros;
}

/* registra uma arma nova em tempo de execução. É o caminho oficial
   pra estender: dados entram, validação corre, catálogo e inventário
   passam a conhecer a arma. Nenhuma função do núcleo muda. */
function registrarArma(a){
  const erros=validarArma(a);
  if(erros.length){
    console.error('[§20] arma "'+((a&&a.id)||'sem id')+'" recusada:\n  · '+erros.join('\n  · '));
    return false;
  }
  ARMAS_FOGO[a.id]=a;
  registrarNoCatalogo(a);
  return true;
}

/* toda arma de fogo também é um item do jogo: entra no CATALOGO pra
   poder ser achada, carregada, pesada e guardada como qualquer coisa */
function registrarNoCatalogo(a){
  if(typeof CATALOGO==='undefined')return;
  if(CATALOGO[a.id])return;
  CATALOGO[a.id]={n:a.nome,cat:'arma',kg:a.peso,vol:Math.max(2,Math.round(a.peso*1.6)),
    raro:a.categoria==='precisao'?5:(a.categoria==='pistola'?3:4),
    dano:a.dano,municao:true,fogo:a.id,d:a.d||''};
  if(typeof DESENHO!=='undefined'&&!DESENHO[a.id])
    DESENHO[a.id]=a.desenho||desenhoDeArma(a.categoria);
}

/* ---------- munição e carregadores como itens ---------- */
function registrarMunicoes(){
  if(typeof CATALOGO==='undefined')return;
  for(const [cal,C] of Object.entries(CALIBRES)){
    const id='mun_'+cal.replace(/[^a-z0-9]/gi,'');
    if(!CATALOGO[id]){
      CATALOGO[id]={n:'Munição '+C.n,cat:'arma',kg:+(C.peso*20).toFixed(2),vol:1,raro:4,
        pilha:5,municaoDe:cal,qtd:20,d:C.d+' Vinte tiros na caixa.'};
      if(typeof DESENHO!=='undefined')DESENHO[id]=desenhoDeMunicao(cal);
    }
    const idc='carr_'+cal.replace(/[^a-z0-9]/gi,'');
    if(!CATALOGO[idc]&&cal!=='.12'&&cal!=='.38'){
      CATALOGO[idc]={n:'Carregador '+C.n,cat:'arma',kg:.25,vol:1,raro:4,pilha:3,
        carregadorDe:cal,d:'Vazio, pesa pouco. Cheio, muda o tempo de recarga.'};
      if(typeof DESENHO!=='undefined')DESENHO[idc]=desenhoDeCarregador();
    }
  }
}

/* ================= O ESTADO DAS ARMAS =================
   Uma peça por arma, guardada em S: carregador, câmara e travamento.
   Separado do §15 (que cuida do desgaste) de propósito: desgaste é de
   qualquer peça, isto aqui é só de arma de fogo. */
function armas(){
  if(!S.fogo||typeof S.fogo!=='object')S.fogo={};
  return S.fogo;
}
function estadoArma(id){
  const A=ARMAS_FOGO[id];
  if(!A)return null;
  const F=armas();
  if(!F[id])F[id]={carregador:0,camara:0,travada:false,modo:A.modos[0],tiros:0};
  const e=F[id];
  /* prende qualquer valor absurdo vindo de save adulterado */
  e.carregador=trava(Math.round(+e.carregador||0),0,A.capacidade);
  e.camara=trava(Math.round(+e.camara||0),0,A.camara||0);
  if(!A.modos.includes(e.modo))e.modo=A.modos[0];
  return e;
}
/* munição reserva por calibre, na mochila e em casa */
function reservaDe(cal){
  let n=(S.municao&&S.municao[cal])||0;
  return Math.max(0,Math.round(n));
}
function darMunicao(cal,q){
  S.municao=S.municao||{};
  S.municao[cal]=Math.max(0,(S.municao[cal]||0)+q);
  return S.municao[cal];
}
function gastarMunicao(cal,q){
  S.municao=S.municao||{};
  const t=Math.min(S.municao[cal]||0,q);
  S.municao[cal]=(S.municao[cal]||0)-t;
  return t;
}

/* ---------- a arma que está na mão ---------- */
function armaDeFogoEquipada(){
  const id=S.armaFogo;
  if(!id||!ARMAS_FOGO[id])return null;
  if(!(S.armas||[]).includes(id))return null;
  return {...ARMAS_FOGO[id], estado:estadoArma(id),
          peca:(typeof peca==='function')?peca(id):null};
}
function equiparFogo(id){
  if(id&&!ARMAS_FOGO[id])return false;
  if(id&&!(S.armas||[]).includes(id))return false;
  S.armaFogo=id||null;
  return true;
}

/* ================= RECARREGAR ================= */
function podeRecarregar(id){
  const A=ARMAS_FOGO[id]; if(!A)return {ok:false,porque:'arma desconhecida'};
  const e=estadoArma(id);
  if(e.carregador>=A.capacidade&&e.camara>=(A.camara||0))
    return {ok:false,porque:'já está cheia'};
  if(reservaDe(A.calibre)<=0)
    return {ok:false,porque:'sem munição '+CALIBRES[A.calibre].n+' na mochila'};
  return {ok:true};
}
/* recarga completa ou parcial. `quantos` limita — é o que faz a
   espingarda encher de um em um e a recarga poder ser interrompida
   sem deixar a arma num estado inválido. */
function recarregar(id,quantos){
  const A=ARMAS_FOGO[id]; if(!A)return 0;
  const v=podeRecarregar(id); if(!v.ok)return 0;
  const e=estadoArma(id);
  const falta=(A.capacidade-e.carregador)+((A.camara||0)-e.camara);
  const alvo=Math.min(quantos==null?falta:Math.max(0,quantos),falta);
  const tem=gastarMunicao(A.calibre,alvo);
  let posto=0;
  /* a câmara enche primeiro: é ela que dá o tiro seguinte */
  while(posto<tem&&e.camara<(A.camara||0)){ e.camara++; posto++; }
  while(posto<tem&&e.carregador<A.capacidade){ e.carregador++; posto++; }
  /* se sobrou munição tirada e não coube, devolve — nunca some item */
  if(posto<tem)darMunicao(A.calibre,tem-posto);
  return posto;
}
/* tempo de recarga, já com destreza e ofício. É o número que a tela
   mostra e o que o jogo cobra: não há duas contas. */
function tempoDeRecarga(id){
  const A=ARMAS_FOGO[id]; if(!A)return 0;
  const D=(typeof derivadas==='function')?derivadas():{recarga:1};
  const C=(typeof classeAtual==='function')?classeAtual():null;
  let t=A.tempoRecarga*D.recarga;
  if(C&&C.passiva.id==='coronha')t*=.80;
  return +t.toFixed(2);
}

/* ================= DISPARAR ================= */
function podeDisparar(id){
  const A=ARMAS_FOGO[id]; if(!A)return {ok:false,porque:'arma desconhecida'};
  const e=estadoArma(id);
  if(e.travada)return {ok:false,porque:'travada — puxe o ferrolho'};
  if(e.camara<=0&&e.carregador<=0)return {ok:false,porque:'sem munição na arma'};
  const p=(typeof peca==='function')?peca(id):null;
  if(p&&typeof quebrado==='function'&&quebrado(p))
    return {ok:false,porque:'quebrada — passe pela bancada'};
  return {ok:true};
}

/* a chance de acertar, composta. Nunca 100%, nem com Pontaria 10:
   `acertoMax` das derivadas é o teto, e ele para em 90%. */
function chanceDeAcerto(id,dist,alvoForca){
  const A=ARMAS_FOGO[id]; if(!A)return 0;
  const D=(typeof derivadas==='function')?derivadas():{dispersao:1,acertoMax:.7,firmar:1};
  const p=(typeof peca==='function')?peca(id):null;
  const estado=(p&&typeof efic==='function')?efic(p):1;
  const d=dist==null?2:dist;
  /* dispersão cresce com a distância e com a arma; pontaria a encolhe */
  const disp=A.dispersao*D.dispersao*(1+Math.max(0,d-A.alcance)*.35);
  let c=1/(1+disp*.55);
  /* fora do alcance máximo, cai forte */
  if(d>A.alcanceMax)c*=.35;
  /* arma gasta erra mais */
  c*=(0.65+0.35*estado);
  /* alvo forte é mais difícil de derrubar, não de acertar */
  return trava(c,0.05,D.acertoMax);
}
/* dano final: base, queda com a distância, estado e força do braço
   não entram (é arma de fogo, não porrete) */
function danoDoTiro(id,dist){
  const A=ARMAS_FOGO[id]; if(!A)return 0;
  const d=dist==null?2:dist;
  const perda=Math.max(0,d-A.alcance)*A.quedaDano;
  const p=(typeof peca==='function')?peca(id):null;
  const estado=(p&&typeof efic==='function')?efic(p):1;
  return +Math.max(.4,A.dano*(1-trava(perda,0,.7))*estado).toFixed(2);
}

/* O TIRO. Uma função só, e é ela que qualquer cena de combate chama.
   Devolve tudo que aconteceu, pra quem chamou escrever o texto. */
function atirar(id,op){
  op=op||{};
  const A=ARMAS_FOGO[id];
  if(!A)return {ok:false,porque:'arma desconhecida'};
  const v=podeDisparar(id);
  if(!v.ok)return {ok:false,porque:v.porque};
  const e=estadoArma(id);

  /* tira da câmara; se não havia câmara, tira do carregador */
  if(e.camara>0)e.camara--;
  else if(e.carregador>0)e.carregador--;
  else return {ok:false,porque:'sem munição na arma'};
  /* e a próxima sobe pra câmara, se a arma tem câmara */
  if((A.camara||0)>0&&e.camara<(A.camara)&&e.carregador>0){ e.carregador--; e.camara++; }
  e.tiros++;

  /* travamento: confiabilidade, piorada pelo desgaste. Sempre avisada. */
  const p=(typeof peca==='function')?peca(id):null;
  const estado=(p&&typeof efic==='function')?efic(p):1;
  const conf=A.confiabilidade*(0.75+0.25*estado);
  let travou=false;
  /* a arma travar decide se voce sobrevive. Estava fora do gerador
     da partida — o mesmo save dava travamentos diferentes. */
  if(_ale()>conf){ e.travada=true; travou=true; }

  /* desgaste do §15: cada tiro gasta a peça */
  if(typeof gastarDur==='function'&&p)
    gastarDur(p,(typeof fichaDesg==='function'&&fichaDesg(id)?fichaDesg(id).taxa:1.2),A.nome);

  const dist=op.dist==null?2:op.dist;
  const acerto=travou?false:chance(chanceDeAcerto(id,dist));
  const dano=acerto?danoDoTiro(id,dist):0;

  /* RUÍDO: entra no sistema que já existe, e é o preço da arma de
     fogo. Dentro de casa ecoa mais; a chuva cobre um pouco. */
  const ruidoBase=A.ruido!=null?A.ruido:CALIBRES[A.calibre].ruido;
  const fechado=(typeof cena!=='undefined'&&cena.casa&&cena.modo!=='rua');
  const chovendo=(typeof CH!=='undefined'&&CH.i>0)?CH.i:0;
  const r=Math.round(ruidoBase*(fechado?1.15:1)*(1-chovendo*.18));
  if(typeof S!=='undefined'){
    S.ruido=trava((S.ruido||0)+r*.35,0,100);
    /* e o rastro do §9 recebe o estouro, que é o que faz a coisa vir */
    S.calor=(S.calor||0)+r*.55;
  }
  if(typeof amToca==='function')amToca(r>70?'porta_batida':'metal_cai');

  /* recuo: sobe a dispersão do próximo tiro e leva tempo pra firmar */
  const D=(typeof derivadas==='function')?derivadas():{recuo:1,firmar:1};
  const C=(typeof classeAtual==='function')?classeAtual():null;
  let recuo=A.recuoV*D.recuo;
  if(C&&C.passiva.id==='coronha')recuo*=.65;

  return {ok:true, acerto, dano, travou, ruido:r,
    recuo:+recuo.toFixed(2), firmar:+(recuo*.35*D.firmar).toFixed(2),
    carregador:e.carregador, camara:e.camara,
    reserva:reservaDe(A.calibre), calibre:A.calibre,
    chance:+chanceDeAcerto(id,dist).toFixed(3)};
}
/* destravar custa tempo, não munição */
function destravar(id){
  const e=estadoArma(id);
  if(!e||!e.travada)return false;
  e.travada=false;
  return true;
}
function trocarModo(id){
  const A=ARMAS_FOGO[id]; const e=estadoArma(id);
  if(!A||!e||A.modos.length<2)return null;
  e.modo=A.modos[(A.modos.indexOf(e.modo)+1)%A.modos.length];
  return e.modo;
}

/* ================= DESENHO (o "modelo" deste projeto) =================
   Este jogo não tem malha 3D: o equivalente é a arte vetorial em
   canvas do `DESENHO`, uma função por item, e é nela que os itens
   novos entram. Não é um cubo genérico nem um ícone reaproveitado —
   é a mesma técnica que os 60 itens originais usam. O que fica
   faltando de refinamento artístico está dito no README. */
function desenhoDeArma(cat){
  const M='#8A8F98', ME='#5A606A', MAD='#5A3A22', PRETO='#2A252E';
  const canos={
    pistola:s=>{dRect(-s*.30,-s*.10,s*.44,s*.11,ME);      /* corrediça */
      dRect(-s*.30,-s*.02,s*.40,s*.06,M);
      dRect(-s*.20,s*.02,s*.13,s*.26,PRETO);              /* punho */
      dRect(-s*.08,s*.02,s*.06,s*.10,ME);},
    revolver:s=>{dRect(-s*.28,-s*.08,s*.40,s*.08,M);
      dCirc(-s*.05,s*.00,s*.09,ME);                       /* tambor */
      dRect(-s*.14,s*.04,s*.12,s*.24,MAD);
      dLinha(-s*.02,s*.06,s*.04,s*.12,ME,2);},
    smg:s=>{dRect(-s*.34,-s*.10,s*.56,s*.10,ME);
      dRect(-s*.34,0,s*.50,s*.07,M);
      dRect(-s*.10,s*.06,s*.09,s*.28,PRETO);              /* carregador reto */
      dRect(-s*.26,s*.05,s*.10,s*.16,PRETO);},
    espingarda:s=>{dRect(-s*.40,-s*.06,s*.66,s*.08,ME);
      dRect(-s*.40,s*.02,s*.60,s*.05,'#6A6F78');          /* bomba */
      dRect(s*.16,-s*.02,s*.22,s*.13,MAD);
      dRect(-s*.16,s*.06,s*.18,s*.05,ME);},
    carabina:s=>{dRect(-s*.42,-s*.07,s*.74,s*.08,ME);
      dRect(s*.10,-s*.01,s*.28,s*.12,MAD);
      dRect(-s*.10,s*.04,s*.10,s*.26,PRETO);
      dLinha(-s*.42,-s*.09,-s*.22,-s*.09,M,2);},
    rifle:s=>{dRect(-s*.44,-s*.05,s*.78,s*.06,ME);
      dRect(s*.06,-s*.01,s*.32,s*.11,MAD);
      dRect(-s*.06,s*.03,s*.07,s*.16,MAD);},
    precisao:s=>{dRect(-s*.46,-s*.04,s*.84,s*.06,ME);
      dRect(-s*.10,-s*.18,s*.34,s*.09,PRETO);             /* luneta */
      dCirc(-s*.10,-s*.135,s*.05,'#2E3238');
      dRect(s*.10,0,s*.30,s*.12,MAD);
      dRect(-s*.04,s*.04,s*.08,s*.20,MAD);}
  };
  return canos[cat]||canos.pistola;
}
function desenhoDeMunicao(cal){
  const grosso=cal==='.12'?1.5:(cal==='.22'?.6:1);
  return s=>{
    for(let i=0;i<4;i++){
      const x=-s*.20+i*s*.13;
      dRect(x,-s*.02,s*.07*grosso,s*.20,'#B08A3A');       /* estojo */
      CX.fillStyle=cal==='.12'?'#8C2F1E':'#C8CDD4';       /* ponta */
      CX.beginPath();
      CX.moveTo(x,-s*.02);CX.lineTo(x+s*.07*grosso,-s*.02);
      CX.lineTo(x+s*.035*grosso,-s*.14);CX.closePath();CX.fill();
    }
  };
}
function desenhoDeCarregador(){
  return s=>{
    dRect(-s*.11,-s*.24,s*.22,s*.48,'#2E3238');
    dRect(-s*.11,-s*.24,s*.22,s*.05,'#5A606A');
    for(let i=0;i<4;i++)dLinha(-s*.11,-s*.12+i*s*.10,s*.11,-s*.12+i*s*.10,'#1A1D21',1);
  };
}

/* ================= INTEGRAÇÃO ================= */
/* as armas de fogo entram no mundo: aparecem em saque de lugar certo */
function semearArmas(){
  if(typeof TIPO_CASA==='undefined')return;
  const por={delegacia:['pistola_taurus','revolver_38'],
    oficina:['smg_caseira'], sitio:['espingarda_20','rifle_22'],
    boa:['pistola_taurus'], abandonada:['revolver_38']};
  for(const [tipo,lista] of Object.entries(por)){
    const T=TIPO_CASA[tipo];
    if(!T||!T.loot)continue;
    lista.forEach(id=>{ if(CATALOGO[id]&&!T.loot.includes(id))T.loot.push(id); });
  }
  /* munição junto, senão a arma é peso morto */
  ['sitio','oficina','boa','comercio'].forEach(t=>{
    const T=TIPO_CASA[t];
    if(T&&T.loot)['mun_9mm','mun_38','mun_12'].forEach(m=>{
      if(CATALOGO[m]&&!T.loot.includes(m))T.loot.push(m);
    });
  });
}
/* quando a mochila é esvaziada em casa, munição vira reserva e a arma
   entra no paiol — o §15 já leva o desgaste junto */
if(typeof descarregar==='function'){
  const _dc=descarregar;
  descarregar=function(){
    const m=(typeof mochila==='function')?mochila():{itens:[]};
    /* munição sai antes: vira contador por calibre, não item guardado */
    m.itens.slice().forEach(it=>{
      const e=CATALOGO[it.id];
      if(e&&e.municaoDe){
        darMunicao(e.municaoDe,(e.qtd||20)*it.q);
        m.itens=m.itens.filter(x=>x!==it);
      }
    });
    const r=_dc.apply(this,arguments);
    /* a primeira arma de fogo que chegar vira a equipada */
    if(!S.armaFogo){
      const f=(S.armas||[]).find(id=>ARMAS_FOGO[id]);
      if(f)equiparFogo(f);
    }
    return r;
  };
}

/* ---------- estado, pro HUD e pros testes ---------- */
function armaEstado(id){
  const a=id||S.armaFogo;
  const A=ARMAS_FOGO[a];
  if(!A)return null;
  const e=estadoArma(a);
  const p=(typeof peca==='function')?peca(a):null;
  return {id:a, nome:A.nome, categoria:A.categoria, calibre:A.calibre,
    carregador:e.carregador, capacidade:A.capacidade,
    camara:e.camara, temCamara:(A.camara||0)>0,
    reserva:reservaDe(A.calibre), travada:e.travada, modo:e.modo,
    modos:A.modos.slice(), tiros:e.tiros,
    condicao:p&&typeof pctDur==='function'?pctDur(p):100,
    tempoRecarga:tempoDeRecarga(a),
    chance:+chanceDeAcerto(a,2).toFixed(3), dano:danoDoTiro(a,2),
    podeDisparar:podeDisparar(a), podeRecarregar:podeRecarregar(a)};
}

/* ---------- persistência ---------- */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      /* o bloco ANEXA a um save; nunca CRIA um. Sem save na mao,
         nao ha o que anexar — e criar aqui faria nascer um save
         de partida que ainda nao comecou, que e o que apagou a
         abertura narrada. */
      const cru=localStorage.getItem(CHAVE);
      if(!cru)return;
      const d=JSON.parse(cru);
      d.fogo=S.fogo; d.municao=S.municao; d.armaFogo=S.armaFogo;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){}
  };
}

/* ================= REGISTRO E EXEMPLO DE EXTENSÃO =================
   Tudo acima é dado. Abaixo, a demonstração de que dá pra somar uma
   arma sem tocar em nenhuma linha do núcleo: a `pistola_mauser` nasce
   aqui, por `registrarArma`, com validação e desenho próprio, e passa
   a existir no jogo como qualquer outra. Copie este bloco pra criar a
   sua — só o `id`, o `nome` e os números mudam. */
registrarMunicoes();
Object.values(ARMAS_FOGO).forEach(a=>{
  const e=validarArma(a);
  if(e.length)console.error('[§20] arma de catálogo inválida: '+a.id+' — '+e.join('; '));
  else registrarNoCatalogo(a);
});

registrarArma({
  id:'pistola_mauser', nome:'Pistola de coronha de madeira',
  categoria:'pistola', calibre:'9mm', capacidade:10, dano:3.4,
  alcance:3.4, alcanceMax:7, dispersao:.95, recuoV:1.0, recuoH:.4,
  cadencia:2, modos:['semi'], tempoSaque:.9, tempoRecarga:2.3,
  peso:1.2, confiabilidade:.96,
  d:'Antiga, cuidada, e alguém a escondeu com carinho. Atira reto.',
  /* desenho próprio: o "modelo" deste projeto é arte de canvas */
  desenho:s=>{
    dRect(-s*.30,-s*.09,s*.46,s*.10,'#5A606A');
    dRect(-s*.30,-s*.01,s*.42,s*.05,'#8A8F98');
    dRect(-s*.18,s*.03,s*.14,s*.28,'#6A4A2E');
    dLinha(-s*.16,s*.10,-s*.06,s*.10,'#4A3220',1.5);
  }
});

semearArmas();
S.fogo=S.fogo||{}; S.municao=S.municao||{};
