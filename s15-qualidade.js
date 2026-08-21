/* ================= §15 — QUALIDADE DOS ITENS =================
   Tudo que você usa se gasta: a arma no golpe, a armadura na
   pancada, a ferramenta no serviço, a comida no tempo. Cada
   coisa tem durabilidade de 0 a 100 e um estado tirado dela.

   Este bloco entra POR CIMA do que já existe. Ele não reescreve
   mochila, combate nem bancada: embrulha as funções do v48 do
   mesmo jeito que o §14 embrulha `mochilaInfo`. Se o bloco
   sumir, o jogo volta a rodar como antes.

   As seções abaixo são os "scripts" pedidos, na ordem em que um
   depende do outro:
     15.1  ItemData          — a ficha de cada item (dado, não código)
     15.2  ItemInstance      — a peça concreta, com durabilidade
     15.3  QualitySystem     — a faixa, a cor e o multiplicador
     15.4  StatusEffectSystem— nome, ícone, duração, efeito
     15.5  Desgaste          — quem gasta o quê, e quando
     15.6  Feedback visual   — barra, tooltip e aviso
     15.7  Reparo            — a bancada dentro de casa            */

/* ================= 15.1 — ItemData =================
   A configuração fica em tabela, separada do código, pra dar pra
   mexer no equilíbrio sem abrir função nenhuma. É o equivalente
   honesto de um ScriptableObject aqui: dado declarado num lugar
   só, lido por todo o resto.

   `taxa` é quanto de durabilidade some por evento — por golpe na
   arma, por pancada na armadura, por serviço na ferramenta, por
   dia na comida. Quanto maior, mais rápido acaba. */

const DESGASTE_PADRAO={arma:3.4,armadura:4.0,ferra:2.2,roupa:3.2,comida:null};

/* override por item: só o que foge da média da categoria */
const DESGASTE={
  /* armas — quanto mais bruta a peça, menos ela sente o golpe */
  faca:6.0, facao:3.8, taco:3.0, espeto:5.2, foice:3.4,
  machadinha:2.8, barra:1.4, marreta:1.2, besta:4.4,
  revolver:0.9, espingarda:0.9,
  /* ferramentas */
  martelo:2.0, fenda:3.0, alicate:2.4, inglesa:1.8, serra:4.2,
  pa:2.0, enxada:2.6, lanterna:1.5, escada:1.0,
  /* armaduras */
  colete:3.2, avental:4.5, jaqueta:5.0,
  /* roupas — pano rasga mais rápido que couro, couro mais que placa */
  camiseta:6.5, camisa:6.0, calca:4.2, casaco:3.6,
  bota:2.4, tenis:4.8, luva:5.0, capacete:1.8,
  mascara:7.0, joelheira:2.6, cinto:2.2, mochila_leve:2.0
};

/* as armaduras não existiam. A `colete` já aparecia na lista de
   saque da delegacia e caía fora calada, porque o CATALOGO não
   tinha a entrada — o filtro `T.loot.filter(id=>CATALOGO[id])`
   comia ela. Agora ela existe e chega em casa. */
CAT.armadura='armadura';
Object.assign(CATALOGO,{
 colete:{n:'Colete de motoboy',cat:'armadura',kg:3.5,vol:5,raro:3,defesa:2.2,
   d:'Placa dura nas costas e no peito. Foi feito pra asfalto e serve pra dente.'},
 avental:{n:'Avental de raspa',cat:'armadura',kg:2.5,vol:4,raro:2,defesa:1.5,
   d:'Couro grosso de soldador. Pesa no ombro e não deixa passar unha.'},
 jaqueta:{n:'Jaqueta de couro',cat:'armadura',kg:2,vol:4,raro:2,defesa:1.1,
   d:'Velha e rachada na dobra. Ainda é uma camada a mais.'}
});
/* elas precisam aparecer no mundo, senão o sistema é teoria */
TIPO_CASA.oficina.loot.push('avental');
TIPO_CASA.boa.loot.push('jaqueta');
TIPO_CASA.abandonada.loot.push('jaqueta');

/* "Nenhum ícone genérico: cada um tem forma própria" — está
   escrito no bloco de desenho do v48, e item novo sem desenho
   caía no quadrado cinza do `_padrao`. As três ganham forma. */
Object.assign(DESENHO,{
 colete:s=>{
   dRect(-s*.22,-s*.26,s*.44,s*.50,'#2E3238');            /* placa */
   dRect(-s*.22,-s*.26,s*.44,s*.06,'#3E444C');
   dRect(-s*.20,-s*.06,s*.40,s*.07,'#C9A227');            /* faixa refletiva */
   dLinha(-s*.10,-s*.26,-s*.10,s*.24,'#1A1D21',2);        /* vinco */
   dLinha(s*.10,-s*.26,s*.10,s*.24,'#1A1D21',2);
   dRect(-s*.30,-s*.20,s*.08,s*.30,PAL.pano);             /* alças */
   dRect(s*.22,-s*.20,s*.08,s*.30,PAL.pano);},
 avental:s=>{
   CX.fillStyle='#6A4A2E';CX.beginPath();                 /* raspa de couro */
   CX.moveTo(-s*.14,-s*.30);CX.lineTo(s*.14,-s*.30);
   CX.lineTo(s*.26,s*.10);CX.lineTo(s*.22,s*.32);
   CX.lineTo(-s*.22,s*.32);CX.lineTo(-s*.26,s*.10);
   CX.closePath();CX.fill();
   CX.strokeStyle='#4A3220';CX.lineWidth=1;CX.stroke();
   dLinha(-s*.13,-s*.30,-s*.05,-s*.36,'#4A3220',2);       /* tira do pescoço */
   dLinha(s*.13,-s*.30,s*.05,-s*.36,'#4A3220',2);
   dRect(-s*.09,s*.02,s*.18,s*.13,'#57391F');},           /* bolso */
 jaqueta:s=>{
   CX.fillStyle='#3A2A22';CX.beginPath();                 /* corpo */
   CX.moveTo(-s*.24,-s*.22);CX.lineTo(s*.24,-s*.22);
   CX.lineTo(s*.20,s*.30);CX.lineTo(-s*.20,s*.30);
   CX.closePath();CX.fill();
   CX.fillStyle='#4A362C';CX.beginPath();                 /* gola aberta */
   CX.moveTo(-s*.14,-s*.24);CX.lineTo(0,-s*.02);
   CX.lineTo(s*.14,-s*.24);CX.lineTo(0,-s*.30);
   CX.closePath();CX.fill();
   dLinha(0,-s*.02,0,s*.30,'#8A8F98',1.5);                /* zíper */
   dRect(-s*.34,-s*.20,s*.10,s*.40,'#32241D');            /* mangas */
   dRect(s*.24,-s*.20,s*.10,s*.40,'#32241D');}
});

/* ---- a ficha final de um id, montada uma vez ---- */
const _fichaCache={};
function fichaDesg(id){
  if(_fichaCache[id]!==undefined)return _fichaCache[id];
  const e=CATALOGO[id];
  let f=null;
  if(e){
    const cat=e.cat==='arma'&&!e.dano?null:e.cat;   /* cartucho não é arma */
    if(cat==='comida'&&e.perece)      f={tipo:'comida', taxa:100/e.perece};
    else if(cat==='arma')             f={tipo:'arma',   taxa:DESGASTE[id]||DESGASTE_PADRAO.arma};
    else if(cat==='armadura')         f={tipo:'armadura',taxa:DESGASTE[id]||DESGASTE_PADRAO.armadura};
    /* Roupa também se gasta. Sem isto, `peca()` devolvia null pra
       camiseta e bota: a proteção nunca decaía, a peça que segurava o
       golpe nunca sentia, e a regra de "quebrada não dá bônus" não
       tinha como valer. */
    else if(cat==='roupa')            f={tipo:'roupa',   taxa:DESGASTE[id]||DESGASTE_PADRAO.roupa};
    else if(e.ferra)                  f={tipo:'ferra',  taxa:DESGASTE[id]||DESGASTE_PADRAO.ferra};
  }
  return _fichaCache[id]=f;
}
function ehDuravel(id){return !!fichaDesg(id);}
function tipoDesg(id){const f=fichaDesg(id);return f?f.tipo:null;}

/* ================= 15.2 — ItemInstance =================
   Um item na mochila é `{id,q,dia}`. A peça que se gasta ganha
   `dur` e `durMax` no mesmo objeto — não inventamos estrutura
   nova, porque tudo que já existe (salvar, largar, empilhar)
   continua funcionando por cima dela.

   Duas peças iguais com durabilidade diferente NÃO empilham:
   isso cai de graça, porque item durável tem `pilha` 1 e o
   `guardar` do v48 já abre slot novo quando a pilha enche. */

const DUR_CHEIA=100;
function durMaxDe(id){return DUR_CHEIA;}

/* carimba durabilidade em qualquer slot que ainda não tem.
   Serve pra item novo e pra save de antes deste bloco existir. */
function carimbar(it){
  if(!it||!ehDuravel(it.id))return it;
  if(typeof it.durMax!=='number')it.durMax=durMaxDe(it.id);
  if(typeof it.dur!=='number'){
    /* comida achada já vem com parte do tempo corrido */
    it.dur=it.durMax;
    if(tipoDesg(it.id)==='comida'&&typeof it.dia==='number')
      it.dur=trava(it.durMax-(S.dia-it.dia)*fichaDesg(it.id).taxa,0,it.durMax);
  }
  return it;
}
function carimbarTudo(){
  mochila().itens.forEach(carimbar);
  if(typeof baus==='function')Object.values(baus()).forEach(b=>b.itens.forEach(carimbar));
}

/* o registro das peças que moram em casa: arma encostada na
   parede, ferramenta na bancada, armadura no prego. O v48 guarda
   só o id (`S.armas`, `S.ferra`), e o id não tem estado — então a
   durabilidade dessas mora aqui, num livro à parte, e o resto do
   jogo não precisa saber. */
function livro(){
  if(!S.pecas||typeof S.pecas!=='object')S.pecas={};
  return S.pecas;
}
function peca(id){
  if(!ehDuravel(id))return null;
  const L=livro();
  if(!L[id])L[id]={id,dur:durMaxDe(id),durMax:durMaxDe(id)};
  if(typeof L[id].dur!=='number')L[id].dur=L[id].durMax||DUR_CHEIA;
  if(typeof L[id].durMax!=='number')L[id].durMax=DUR_CHEIA;
  return L[id];
}
/* peça que sai de casa (quebrou de vez, foi desmanchada) */
function esquecerPeca(id){delete livro()[id];}
/* o livro é só das peças que moram em casa. Arma perdida na fuga
   sai de `S.armas` e a ficha dela tem de sair junto — senão a
   próxima faca que você achar já nasce com o desgaste da que
   ficou no chão. O que está em mochila ou baú não entra aqui:
   aquilo carrega a durabilidade no próprio slot. */
function limparLivro(){
  const L=livro();
  const meus=[].concat(S.armas||[],S.ferra||[],S.armaduras||[]);
  Object.keys(L).forEach(id=>{ if(!meus.includes(id))delete L[id]; });
}

/* quando a mochila é esvaziada em casa, a durabilidade da peça
   viaja junto: uma faca gasta não vira faca nova ao ser guardada. */
const _descarregar=descarregar;
descarregar=function(){
  const m=mochila();
  /* a armadura não tem uso automático no v48 e cairia em
     `sobrou`. Ela é equipamento: entra no armário de casa. */
  const vestes=[];
  m.itens.slice().forEach(it=>{
    if(CATALOGO[it.id]&&CATALOGO[it.id].cat==='armadura'){
      carimbar(it);vestes.push(it);
      m.itens=m.itens.filter(x=>x!==it);
    }
  });
  /* leva o desgaste do que estava na mochila pro livro de casa,
     antes que o v48 transforme item em id solto */
  const levar=[];
  m.itens.forEach(it=>{ if(ehDuravel(it.id)&&tipoDesg(it.id)!=='comida'){carimbar(it);levar.push(it);} });
  (S.maos||[]).forEach(id=>{ if(ehDuravel(id))levar.push(null); });

  const r=_descarregar.call(this);

  levar.forEach(it=>{
    if(!it)return;
    const p=peca(it.id);
    /* fica com a pior das duas: você não melhora nada guardando */
    if(p&&it.dur<p.dur){p.dur=it.dur;p.durMax=Math.min(p.durMax,it.durMax);}
  });
  vestes.forEach(it=>{
    S.armaduras=S.armaduras||[];
    if(!S.armaduras.includes(it.id))S.armaduras.push(it.id);
    const p=peca(it.id);
    if(p&&it.dur<p.dur){p.dur=it.dur;p.durMax=Math.min(p.durMax,it.durMax);}
    r.sobrou=r.sobrou.filter(s=>s.id!==it.id);
  });
  sincronizarEfeitos();
  return r;
};

/* guardar item durável carimba a peça nova */
const _guardar=guardar;
guardar=function(id,q){
  const posto=_guardar(id,q);
  if(posto)carimbarTudo();
  return posto;
};

/* ================= 15.3 — QualitySystem =================
   A faixa sai da porcentagem de durabilidade, não do valor cru:
   reparar encolhe o máximo, então 60 de 80 é outra coisa que
   60 de 100. */

const QUALIDADES=[
 {id:'perfeito',  n:'Perfeito',  min:86, cor:'#6E8C55', ef:1.05,
  d:'Como se fosse novo. Rende um pouco mais que o normal.'},
 {id:'bom',       n:'Bom',       min:61, cor:'#5F7E96', ef:1.00,
  d:'Marcado de uso e sem defeito nenhum.'},
 {id:'desgastado',n:'Desgastado',min:36, cor:'#C9A227', ef:0.85,
  d:'Folga no cabo, fio cego, costura abrindo. Rende menos.'},
 {id:'ruim',      n:'Ruim',      min:11, cor:'#E0703F', ef:0.65,
  d:'Está pedindo pra falhar na hora errada.'},
 {id:'quebrado',  n:'Quebrado',  min:0,  cor:'#B84B33', ef:0,
  d:'Não serve mais. Ou conserta, ou é peso morto.'}
];
function pctDur(p){
  /* coisa que não se gasta lê 100 e pronto. Sem esta guarda a
     conta virava NaN, e NaN dentro de um `sort` embaralha a
     lista inteira em vez de dar erro. */
  if(!p||typeof p.dur!=='number')return 100;
  const max=p.durMax||DUR_CHEIA;
  return trava(Math.round((p.dur/max)*100),0,100);
}
function qual(pct){
  return QUALIDADES.find(q=>pct>=q.min)||QUALIDADES[QUALIDADES.length-1];
}
function estadoDe(p){return qual(pctDur(p));}
function efic(p){return p?estadoDe(p).ef:1;}
function quebrado(p){return !!p&&pctDur(p)<=10;}
/* a comida não "quebra", ela estraga — mesma faixa, outro nome */
function estragado(p,id){return tipoDesg(id)==='comida'&&quebrado(p);}

/* ================= 15.4 — StatusEffectSystem =================
   Um sistema de status reaproveitável: nome, ícone, duração e
   efeito. O jogo já tinha `MALES` pra doença e ferida, e aquilo
   continua sendo de saúde — misturar "arma ruim" com "infecção"
   ia estragar as duas contas. Isto aqui é a camada de efeito de
   equipamento e de intoxicação, com a mesma forma.

   Efeito com `fonte:'equipamento'` é recalculado sozinho: ao
   reparar ou desequipar a peça, ele some sem ninguém mandar. */

const EFEITOS={
 arma_ruim:{n:'Arma ruim',icone:'⚔',fonte:'equipamento',
   d:'A peça está pra ceder. Você bate mais fraco e erra mais.',
   efeito:{dano:-.35,errar:.20}},
 armadura_ruim:{n:'Armadura ruim',icone:'🛡',fonte:'equipamento',
   d:'Placa rachada, tira solta. Protege menos e pesa igual.',
   efeito:{defesa:-.35,veloc:-.10}},
 ferramenta_ruim:{n:'Ferramenta ruim',icone:'🔧',fonte:'equipamento',
   d:'Serviço rende menos e às vezes não sai.',
   efeito:{coleta:-.35,falha:.20}},
 intoxicacao:{n:'Intoxicação',icone:'☠',dias:2,
   d:'Comeu o que já tinha virado. O corpo cobra por horas.',
   efeito:{dot:1.5,forca:-.15}}
};

function efeitos(){
  if(!Array.isArray(S.efeitos))S.efeitos=[];
  S.efeitos=S.efeitos.filter(e=>e&&EFEITOS[e.id]);
  return S.efeitos;
}
function temEfeito(id){return efeitos().some(e=>e.id===id);}
function porEfeito(id,de){
  const E=EFEITOS[id];if(!E)return null;
  const L=efeitos();
  const ja=L.find(e=>e.id===id&&e.de===(de||null));
  if(ja){ if(E.dias)ja.dias=Math.max(ja.dias,E.dias); return null; }
  const e={id,de:de||null,dias:E.dias||0,desde:S.dia};
  L.push(e);
  return e;
}
function tirarEfeito(id,de){
  S.efeitos=efeitos().filter(e=>e.id!==id||(de!==undefined&&e.de!==de));
}
/* soma de um modificador entre todos os efeitos ativos.
   `mod('dano')` devolve -0.35 se a arma estiver ruim. */
function mod(chave){
  return efeitos().reduce((s,e)=>s+((EFEITOS[e.id].efeito||{})[chave]||0),0);
}

/* recalcula os efeitos de equipamento do zero. É idempotente de
   propósito: pode chamar dez vezes seguidas que o resultado é o
   mesmo, e é isso que faz o debuff sumir sozinho no reparo. */
function sincronizarEfeitos(){
  S.efeitos=efeitos().filter(e=>EFEITOS[e.id].fonte!=='equipamento');
  const a=armaEquipada();
  if(a&&a._peca&&estadoDe(a._peca).id==='ruim')porEfeito('arma_ruim',a.id);
  const v=armaduraEquipada();
  if(v&&v.peca&&estadoDe(v.peca).id==='ruim')porEfeito('armadura_ruim',v.id);
  const f=(S.ferra||[]).find(id=>estadoDe(peca(id)).id==='ruim');
  if(f)porEfeito('ferramenta_ruim',f);
}

/* o veneno corre por hora, não por dia: é o "dano ao longo do
   tempo" do pedido, na unidade de tempo que este jogo tem. */
const _gastarHoras=gastarHoras;
gastarHoras=function(h){
  const r=_gastarHoras.apply(this,arguments);
  const dot=mod('dot');
  if(dot>0&&h>0){
    S.doenteJog=(S.doenteJog||0)+dot*h*.1;
    if(chance(trava(dot*h*.05,0,.4)))
      diz('O estômago vira. Você para, respira e continua pior.','perigo');
  }
  return r;
};

/* a cada dia os efeitos com prazo encurtam */
function tickEfeitos(dias){
  efeitos().slice().forEach(e=>{
    if(!e.dias)return;
    e.dias-=dias;
    if(e.dias<=0){
      diz(`${EFEITOS[e.id].n} passou.`,'bom');
      S.efeitos=efeitos().filter(x=>x!==e);
    }
  });
}

/* ================= 15.5 — Desgaste =================
   Quem gasta o quê: a arma no golpe acertado, a armadura na
   pancada recebida, a ferramenta no serviço, a comida no dia. */

/* ---- a arma que o jogo vai usar, já com a qualidade aplicada ----
   `melhorArma` é chamada em vários lugares, inclusive só pra
   escrever o custo do botão. Então ela não gasta nada: só
   devolve uma cópia com o dano já corrigido, e quem acerta o
   golpe chama `gastarArma`. Arma quebrada some da escolha. */
const _melhorArma=melhorArma;
melhorArma=function(){
  const lista=armasNaMao()
    .filter(i=>i.dano&&(!i.municao||(S.cartucho||0)>0))
    .filter(i=>!quebrado(peca(i.id)))
    .sort((a,b)=>b.dano*efic(peca(b.id))-a.dano*efic(peca(a.id)));
  const a=lista[0];
  if(!a)return undefined;
  const p=peca(a.id);
  return {...a,dano:+(a.dano*efic(p)).toFixed(2),_peca:p,_danoBase:a.dano};
};
function armaEquipada(){return melhorArma();}

/* gasta a arma. `acertou` só muda o quanto: errar também estraga,
   porque o golpe bate em parede, chão e no que estiver atrás. */
function gastarArma(arma,acertou){
  if(!arma)return;
  const p=peca(arma.id);
  if(!p)return;
  gastarDur(p,fichaDesg(arma.id).taxa*(acertou?1:.6),arma.n||CATALOGO[arma.id]&&CATALOGO[arma.id].n||'a arma');
}
/* +20% de errar quando a arma está ruim: vinte pontos saem da
   chance de acertar, e não vinte por cento dela — a diferença
   importa quando a chance já era baixa. */
function chanceArma(p){
  return trava(p-mod('errar'),.03,.95);
}

/* ---- armadura ---- */
function armaduraEquipada(){
  const id=S.armadura;
  if(!id||!CATALOGO[id]||CATALOGO[id].cat!=='armadura')return null;
  const p=peca(id);
  if(quebrado(p))return null;   /* quebrada não protege nada */
  return {id,n:CATALOGO[id].n,base:CATALOGO[id].defesa,
    defesa:+(CATALOGO[id].defesa*efic(p)).toFixed(2),peca:p};
}
function vestir(id){
  if(!CATALOGO[id]||CATALOGO[id].cat!=='armadura')return false;
  S.armadura=(S.armadura===id)?null:id;
  sincronizarEfeitos();
  return true;
}
/* toda ferida do jogador passa por `ferirPor`. É o lugar honesto
   pra armadura entrar: ela absorve, se gasta, e às vezes segura
   a ferida inteira. Embrulhado — nenhuma linha do v48 mudou. */
const _ferirPor=ferirPor;
ferirPor=function(fonte,alvo,nome){
  const v=armaduraEquipada();
  const eu=!alvo||alvo===S;
  if(eu&&v){
    gastarDur(v.peca,fichaDesg(v.id).taxa,v.n);
    sincronizarEfeitos();
    /* quanto ela ainda protege depende do estado dela */
    if(chance(trava(v.defesa*.16,0,.55))){
      diz(`${v.n} come a pancada por você.`,'bom');
      return null;
    }
  }
  return _ferirPor.call(this,fonte,alvo,nome);
};

/* ---- ferramenta ----
   Martelada e serrada tocam em todo serviço de bancada, conserto
   e obra do jogo. São o gancho verdadeiro de "uso da ferramenta":
   se o jogo bateu o martelo, o martelo trabalhou. */
function usarFerra(id,vezes){
  if(!temFerra(id))return true;
  const p=peca(id);
  if(!p)return true;
  gastarDur(p,fichaDesg(id).taxa*(vezes||1),FERRA[id]?FERRA[id].n:id);
  sincronizarEfeitos();
  /* ferramenta ruim às vezes não entrega o serviço */
  if(estadoDe(p).id==='ruim'&&chance(.20+mod('falha')*.5)){
    diz(`${(FERRA[id]||{n:id}).n} escapa da mão e o serviço sai torto.`,'alerta');
    return false;
  }
  return true;
}
const _martelada=martelada;
martelada=function(n,pan){ usarFerra('martelo'); return _martelada.apply(this,arguments); };
const _serrada=serrada;
serrada=function(n,pan){ usarFerra('serra'); return _serrada.apply(this,arguments); };

/* ---- comida ----
   Perecível perde durabilidade por dia. Dentro de baú fechado
   cai pela metade — está em §16, que passa o multiplicador. */
function tickComida(dias,lista,mult){
  const perdeu=[];
  lista.slice().forEach(it=>{
    if(tipoDesg(it.id)!=='comida')return;
    carimbar(it);
    it.dur=trava(it.dur-fichaDesg(it.id).taxa*dias*(mult===undefined?1:mult),0,it.durMax);
    if(it.dur<=0){
      perdeu.push(CATALOGO[it.id].n.toLowerCase());
      const i=lista.indexOf(it);
      if(i>=0)lista.splice(i,1);
    }
  });
  return perdeu;
}
/* o v48 apagava o item inteiro no dia do prazo. Agora ele
   apodrece devagar, e o intervalo entre "estragando" e "sumiu" é
   onde a escolha mora: come e arrisca, ou joga fora. */
estragarNaMochila=function(){
  const m=mochila();
  m.itens.forEach(carimbar);
  return tickComida(0,m.itens,1);   /* o tempo corre em tickQualidade */
};
/* comer o que estragou intoxica */
const _comerEstragada=comerEstragada;
comerEstragada=function(n){
  porEfeito('intoxicacao');
  diz('Intoxicação: o corpo vai cobrar isso pelas próximas horas.','perigo');
  return _comerEstragada.apply(this,arguments);
};

/* ---- o relógio do desgaste ----
   A comida conta dia, e o dia vira em cinco lugares diferentes do
   v48. Em vez de furar os cinco, guardamos o último dia contado e
   fechamos a conta quando a cena do dia abre. */
function tickQualidade(){
  const d=S.dia|0;
  if(typeof S.ultDiaQual!=='number'){S.ultDiaQual=d;return;}
  const n=d-S.ultDiaQual;
  if(n<=0)return;
  S.ultDiaQual=d;
  carimbarTudo();
  const perdeu=tickComida(n,mochila().itens,1);
  /* no baú o ar é mais fresco: metade da velocidade */
  if(typeof baus==='function')
    Object.values(baus()).forEach(b=>tickComida(n,b.itens,.5));
  tickEfeitos(n);
  limparLivro();
  sincronizarEfeitos();
  if(perdeu.length)diz('Apodreceu na mochila: '+perdeu.join(', ')+'.','fraco');
}
const _cenaDia=(typeof cenaDia==='function')?cenaDia:null;
if(_cenaDia)cenaDia=function(){ tickQualidade(); return _cenaDia.apply(this,arguments); };

/* ---- o coração: tirar durabilidade e avisar ---- */
function gastarDur(p,quanto,nome){
  if(!p)return;
  const antes=pctDur(p);
  p.dur=trava(p.dur-quanto,0,p.durMax||DUR_CHEIA);
  const agora=pctDur(p);
  if(agora===antes)return;
  /* aviso de 20%: uma vez só, na descida */
  if(antes>20&&agora<=20&&agora>10){
    diz(`${nome} está quase acabando (${agora}%). Repare antes que ela pare no meio.`,'alerta');
    flutuar(nome+' 20%','#E0703F');
  }
  if(antes>10&&agora<=10){
    diz(`${nome} quebrou. Não serve mais até passar pela bancada.`,'perigo');
    flutuar(nome+' quebrou','#B84B33');
    if(typeof amToca==='function')amToca('madeira_racha');
  }
}

/* ================= 15.6 — Feedback visual =================
   Barra colorida na grade da mochila, estado no tooltip, e a
   tira de efeitos ativos no painel de cima. */

/* a grade da mochila é canvas. Em vez de copiar as 80 linhas do
   `desenharMochila`, deixamos ele desenhar e passamos por cima:
   `GRADE` sai na mesma ordem de `m.itens`, então a célula i é o
   item i, e a barra cai exatamente embaixo do ícone. */
const _desenharMochila=desenharMochila;
desenharMochila=function(w,h,t){
  _desenharMochila.apply(this,arguments);
  if(!Array.isArray(GRADE)||!GRADE.length)return;
  const itens=mochila().itens;
  let i=0;
  GRADE.forEach(g=>{
    const inst=g.mao?peca(g.id):(itens[i++]&&carimbar(itens[i-1]));
    const alvo=g.mao?inst:(inst&&ehDuravel(inst.id)?inst:null);
    if(!alvo||!ehDuravel(g.id))return;
    const pct=pctDur(alvo),q=qual(pct);
    const bw=g.r*1.7,bx=g.x-bw/2,by=g.y+g.r*.80,bh=Math.max(2.5,g.r*.13);
    CX.fillStyle='rgba(0,0,0,.55)';CX.fillRect(bx,by,bw,bh);
    CX.fillStyle=q.cor;CX.fillRect(bx,by,bw*(pct/100),bh);
    CX.strokeStyle='rgba(0,0,0,.6)';CX.lineWidth=1;CX.strokeRect(bx,by,bw,bh);
    if(pct<=10){   /* quebrado leva um X por cima, dá pra ver de longe */
      CX.strokeStyle='rgba(184,75,51,.9)';CX.lineWidth=2;
      CX.beginPath();
      CX.moveTo(g.x-g.r*.5,g.y-g.r*.5);CX.lineTo(g.x+g.r*.5,g.y+g.r*.5);
      CX.moveTo(g.x+g.r*.5,g.y-g.r*.5);CX.lineTo(g.x-g.r*.5,g.y+g.r*.5);
      CX.stroke();
    }
  });
};

/* o tooltip do item: estado, barra e os modificadores ativos */
const _fichaItem=fichaItem;
fichaItem=function(id,naMao){
  _fichaItem.apply(this,arguments);
  if(!ehDuravel(id))return;
  const alvo=naMao?peca(id)
    :(mochila().itens.filter(x=>x.id===id).map(carimbar)
        .sort((a,b)=>a.dur-b.dur)[0]||peca(id));
  if(!alvo)return;
  const pct=pctDur(alvo),q=qual(pct);
  const e=document.createElement('div');
  e.className='sinais';
  const bonus=q.ef===1?'sem alteração'
    :(q.ef===0?'não funciona':(q.ef>1?'+':'')+Math.round((q.ef-1)*100)+'% de eficiência');
  e.innerHTML='<b>'+esc(q.n.toUpperCase())+' · '+pct+'%</b>'
    +'<div style="height:7px;background:#09070B;border:1px solid #2A232E">'
    +'<i style="display:block;height:100%;width:'+pct+'%;background:'+q.cor+'"></i></div>'
    +'<span>'+esc(q.d)+'</span>'
    +'<span class="dica">'+esc(bonus)
    +(alvo.durMax<DUR_CHEIA?' · máximo caiu pra '+alvo.durMax+' de tanto remendo':'')+'</span>';
  T.appendChild(e);T.scrollTop=T.scrollHeight;
  if(estadoDe(alvo).id==='ruim'){
    const chave={arma:'arma_ruim',armadura:'armadura_ruim',ferra:'ferramenta_ruim'}[tipoDesg(id)];
    if(chave)diz('Enquanto estiver assim: '+EFEITOS[chave].d,'perigo');
  }
  if(estragado(alvo,id))diz('Isso já virou. Comer é pedir intoxicação.','perigo');
};

/* a tira de efeitos ativos, no painel que fica sempre na tela */
const _atualizarPainel=atualizarPainel;
atualizarPainel=function(){
  _atualizarPainel.apply(this,arguments);
  const ex=document.getElementById('extras');
  if(!ex)return;
  let tira=document.getElementById('efeitos-tira');
  const L=efeitos();
  if(!L.length){ if(tira)tira.remove(); return; }
  if(!tira){
    tira=document.createElement('span');
    tira.id='efeitos-tira';
    tira.style.cssText='color:#E0703F;letter-spacing:.06em';
    ex.appendChild(tira);
  }
  tira.textContent=L.map(e=>EFEITOS[e.id].icone+(e.dias?e.dias+'d':'')).join(' ');
  tira.title=L.map(e=>EFEITOS[e.id].n).join(', ');
};

/* a tela de saúde passa a mostrar o que o equipamento está
   cobrando, junto com ferida e doença */
if(typeof telaSaude==='function'){
  const _telaSaude=telaSaude;
  telaSaude=function(volta){
    _telaSaude.apply(this,arguments);
    const L=efeitos();
    if(!L.length)return;
    diz('─── efeitos ativos ───','fraco');
    L.forEach(e=>{
      const E=EFEITOS[e.id];
      const efs=Object.keys(E.efeito||{}).map(k=>{
        const v=E.efeito[k];
        return k+' '+(v>0&&k!=='dot'?'+':'')+(k==='dot'?v:Math.round(v*100)+'%');
      }).join(' · ');
      ficha(E.icone+' '+E.n,e.dias?e.dias+' dia'+(e.dias===1?'':'s'):'enquanto durar a peça',
        E.d+(efs?' ('+efs+')':''));
    });
  };
}

/* ================= 15.7 — Reparo =================
   Conserto custa material e/ou moeda, e cobra um preço que não
   dá pra desfazer: cada reparo tira 2 do máximo. Peça velha
   remendada dez vezes nunca mais volta a ser peça nova — é o que
   faz valer a pena achar uma inteira. */

const CUSTO_REPARO={
 arma:    {mat:{arame:1,prego:1}, moeda:1},
 armadura:{mat:{lona2:1,arame:1}, moeda:1},
 ferra:   {mat:{tabua:1,prego:1}, moeda:0},
 roupa:   {mat:{lona2:1},         moeda:0},   /* remendo de lona e linha */
 comida:  null                     /* comida não se conserta */
};
const PERDA_MAX=2;

function podeReparar(id){
  const t=tipoDesg(id),c=CUSTO_REPARO[t];
  if(!c)return {ok:false,falta:['isso não tem conserto']};
  const falta=[];
  Object.keys(c.mat).forEach(k=>{ if(!temMat(k,c.mat[k]))falta.push(MATE[k]?MATE[k].n:k); });
  if(c.moeda&&(S.moeda||0)<c.moeda)falta.push('dinheiro');
  return {ok:!falta.length,falta,custo:c};
}

/* Reparar(item, quantidade): devolve `quantidade` pontos de
   durabilidade, cobra o material e encolhe o teto. */
function reparar(id,quantidade){
  const p=peca(id);
  if(!p)return false;
  const v=podeReparar(id);
  if(!v.ok)return false;
  Object.keys(v.custo.mat).forEach(k=>gastarMat(k,v.custo.mat[k]));
  if(v.custo.moeda)S.moeda=Math.max(0,(S.moeda||0)-v.custo.moeda);
  p.durMax=Math.max(20,p.durMax-PERDA_MAX);
  p.dur=trava(p.dur+(quantidade||40),0,p.durMax);
  sincronizarEfeitos();
  return true;
}

function telaReparo(volta){
  limpar();AC.innerHTML='';cap('BANCADA DE REPARO');
  diz('Morsa, lima, um vidro de óleo e o que sobrou de arame.','narr');
  if(S.oficinaNivel>=1)diz('A bancada montada faz o remendo render mais.','sist');

  const lista=[]
    .concat((S.armas||[]).filter(ehDuravel).map(id=>({id,onde:'arma'})))
    .concat((S.ferra||[]).filter(ehDuravel).map(id=>({id,onde:'ferramenta'})))
    .concat((S.armaduras||[]).filter(ehDuravel).map(id=>({id,onde:'armadura'})))
    .filter(x=>pctDur(peca(x.id))<100);

  if(!lista.length){
    diz('Está tudo inteiro. Não tem o que consertar hoje.','bom');
    botao('Sair da bancada',volta||(()=>menuComodo(3)),{cls:'chave'});
    return;
  }
  lista.sort((a,b)=>pctDur(peca(a.id))-pctDur(peca(b.id)));
  lista.forEach(x=>{
    const p=peca(x.id),pct=pctDur(p),q=qual(pct);
    const nome=(CATALOGO[x.id]||{}).n||x.id;
    /* a terceira coluna da ficha é estreita a 390px: o teto só
       aparece quando já encolheu, que é quando ele diz algo */
    ficha(nome,q.n.toLowerCase()+' · '+pct+'%',
      p.durMax<DUR_CHEIA?x.onde+' · teto '+p.durMax:x.onde);
    const v=podeReparar(x.id);
    const ganho=40+(S.oficinaNivel||0)*10;
    /* o custo vai curto de propósito: o `botao` divide a linha
       entre rótulo e custo, e "1 arame + 1 prego + 1 de dinheiro"
       espremia "Reparar facão de mato" em quatro linhas */
    const txtCusto=Object.keys(v.custo.mat)
      .map(k=>(v.custo.mat[k]>1?v.custo.mat[k]+' ':'')+(MATE[k]?MATE[k].n:k))
      .concat(v.custo.moeda?['moeda']:[]).join(' + ');
    botao('Reparar '+nome.toLowerCase(),acaoDia(1,async()=>{
      if(!reparar(x.id,ganho)){diz('Faltou material. A peça continua como estava.','perigo');return;}
      martelada(4,-.1);
      await pausa(900);
      const np=pctDur(peca(x.id));
      diz(`${nome} volta a ${np}%. O máximo dela caiu pra ${peca(x.id).durMax}.`,'bom');
      diz('Cada remendo tira um pouco do que a peça foi um dia.','fraco');
      atualizarPainel();
    }),{custo:'1h · '+txtCusto+' · +'+ganho,
        falta:v.ok?'':'falta '+v.falta.join(', ')});
  });
  botao('Sair da bancada',volta||(()=>menuComodo(3)),{cls:'chave'});
}

/* a armadura precisa de um lugar pra ser vestida */
function telaArmadura(volta){
  limpar();AC.innerHTML='';cap('O QUE VESTIR');
  const L=(S.armaduras||[]).filter(id=>CATALOGO[id]);
  if(!L.length)diz('Você não tem nada além da roupa do corpo.','fraco');
  L.forEach(id=>{
    const p=peca(id),pct=pctDur(p),q=qual(pct);
    ficha(CATALOGO[id].n+(S.armadura===id?' · VESTIDA':''),
      q.n.toLowerCase()+' · '+pct+'%',
      CATALOGO[id].d+' Segura '+(CATALOGO[id].defesa*efic(p)).toFixed(1)+' de pancada.');
    botao((S.armadura===id?'Tirar ':'Vestir ')+CATALOGO[id].n.toLowerCase(),()=>{
      vestir(id);
      diz(S.armadura===id?'Você fecha os fechos. Pesa, e é isso que você quer.'
        :'Você tira. Anda melhor, e sente cada corrente de ar.','sist');
      telaArmadura(volta);
    },{custo:quebrado(p)?'quebrada — não protege':''});
  });
  botao('Voltar',volta||(()=>menuComodo(1)),{cls:'chave'});
}

/* ---- os botões novos, na oficina e no quarto ---- */
const _menuComodo=menuComodo;
menuComodo=function(id){
  const r=_menuComodo.apply(this,arguments);
  tickQualidade();
  if(id===3){
    const gastas=[].concat(S.armas||[],S.ferra||[],S.armaduras||[])
      .filter(ehDuravel).filter(x=>pctDur(peca(x))<100).length;
    botao('Bancada de reparo',()=>telaReparo(()=>menuComodo(3)),
      {custo:gastas?gastas+' peça'+(gastas===1?'':'s')+' pedindo conserto':'tudo inteiro'});
  }
  if(id===1&&(S.armaduras||[]).length)
    botao('Vestir proteção',()=>telaArmadura(()=>menuComodo(1)),
      {custo:S.armadura?CATALOGO[S.armadura].n.toLowerCase():'nada vestido'});
  return r;
};

/* ---- salvar: o v48 lista campo por campo, e o que não está na
   lista some no recarregamento. Em vez de mexer naquele literal,
   escrevemos por cima do que ele acabou de gravar. O `carregar`
   já copia tudo que encontra, então não precisa de par. ---- */
const _salvar=salvar;
salvar=function(){
  _salvar.apply(this,arguments);
  try{
    /* o bloco ANEXA a um save; nunca CRIA um. Sem save na mao,
       nao ha o que anexar — e criar aqui faria nascer um save
       de partida que ainda nao comecou, que e o que apagou a
       abertura narrada. */
    const cru=localStorage.getItem(CHAVE);
    if(!cru)return;
    const d=JSON.parse(cru);
    d.pecas=S.pecas; d.efeitos=S.efeitos; d.armadura=S.armadura;
    d.armaduras=S.armaduras; d.ultDiaQual=S.ultDiaQual; d.baus=S.baus;
    localStorage.setItem(CHAVE,JSON.stringify(d));
  }catch(e){}
};

/* estado inicial e conserto de save antigo */
S.pecas=S.pecas||{};
S.efeitos=S.efeitos||[];
S.armaduras=S.armaduras||[];
S.armadura=S.armadura||null;
carimbarTudo();
sincronizarEfeitos();
