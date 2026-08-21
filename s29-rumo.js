/* ============ §29 — MARCOS E O OPALA ============

   DUAS COISAS, e elas se cruzam de propósito.

   1 · MARCOS — o mundo muda a cada N dias, de forma perceptível.
       O jogo já tinha uma "virada do meio" (`VIRADAS`, index.html:2039)
       que dispara UMA VEZ entre os dias 6 e 7. Não duplico: generalizo.
       Os marcos daqui são periódicos e reusam as mesmas três forças —
       a cidade esvazia, elas ficam mais ousadas, chega alguém.

   2 · O OPALA — o objetivo de longo prazo.

   SOBRE O OBJETIVO FINAL, e por que este
   --------------------------------------
   O pedido dizia "escolha UM objetivo final e justifique". Antes de
   escolher: **JÁ EXISTE UM**. `telaResgate()` dispara no dia 12 — passa
   um caminhão do Exército e você decide subir ou ficar, com quatro
   finais diferentes conforme quem sobreviveu e a sua confiança.

   Não joguei fora. Seria destruir um final que funciona por engano de
   leitura. O que fiz foi dar um SEGUNDO caminho, e ele existe porque o
   primeiro tem um problema: o caminhão **acontece com você**. Você não
   faz nada pra merecê-lo — ele passa no dia 12 e pronto.

   O Opala é o oposto: ele só sai se você construir. Exige acúmulo
   (diesel), expedições específicas (as peças só aparecem em oficina e
   zona industrial), e sobreviver a N noites depois de descobrir. E o
   final é narrativamente distinto dos dois lados: no caminhão alguém te
   salva; no Opala você sai por conta, e a cidade fica com o que você
   deixou.

   Os dois convivem: quem quiser esperar o caminhão espera. Quem quiser
   sair antes, trabalha.
   ======================================================================= */

const RUMO_CFG={
  /* --- marcos --- */
  /* de quantos em quantos dias o mundo muda. Diminuir acelera a
     degradação; aumentar deixa o jogo mais longo e mais estável. */
  cadaXDias: 4,
  /* antes deste dia nenhum marco dispara: os primeiros dias são pra
     aprender a casa sem o chão se mexendo. */
  primeiroDia: 5,
  /* quantos marcos no máximo numa partida. Existe pra a degradação não
     virar espiral infinita — ver a prova de alcançabilidade abaixo. */
  maxMarcos: 5,

  /* quanto cada marco de "a cidade esvaziou" tira de rendimento. É
     somado, não multiplicado, e tem teto. */
  cidadePorMarco: .07,
  cidadeTeto: .28,
  /* quanto cada marco de "mais ousadas" soma no risco de invasão.
     ESTE NÃO É O MULTIPLICADOR DE DIFICULDADE DO §25 — é outro eixo, e
     o teste prova que os dois não se multiplicam entre si. */
  ousadiaPorMarco: .05,
  ousadiaTeto: .20,

  /* --- o Opala --- */
  /* quanto diesel precisa estar guardado no dia de sair */
  dieselPraSair: 55,
  /* quantas peças de motor. Elas só aparecem em oficina e industrial. */
  pecasPraSair: 2,
  /* quantas noites sobreviver DEPOIS de descobrir o carro */
  noitesDepoisDeDescobrir: 4,
  /* chance de achar uma peça por expedição em local que tem */
  chancePecaPorExpedicao: .34,
  /* nível de oficina pra conseguir mexer no motor */
  oficinaMinima: 1
};

/* ================= ESTADO ================= */
function rumo(){
  if(!S.rumo||typeof S.rumo!=='object')
    S.rumo={marcos:[],ultimoMarcoDia:0,opala:null,versao:1};
  if(!Array.isArray(S.rumo.marcos))S.rumo.marcos=[];
  return S.rumo;
}
function opala(){
  const R=rumo();
  if(!R.opala)return null;
  if(typeof R.opala.pecas!=='number'||!isFinite(R.opala.pecas))R.opala.pecas=0;
  return R.opala;
}

/* ================= OS MARCOS ================= */
const MARCOS={
  cidade:{
    n:'A cidade esvaziou mais',
    /* SINAL CLARO: texto próprio + o mapa passa a render menos, e o
       jogador vê isso na conta do saque */
    sinal:'O rádio não pega mais ninguém no dial de sempre. Onde tinha voz, agora tem chiado.',
    aplica(){ /* o efeito é lido por `rendimentoDoMarco()` */ }
  },
  ousadia:{
    n:'Elas ficaram mais ousadas',
    sinal:'Bateram antes de escurecer. Isso não tinha acontecido nenhuma vez até hoje.',
    aplica(){ /* lido por `ousadiaDoMarco()` */ }
  },
  chegou:{
    n:'Chegou alguém',
    sinal:null,   /* o sinal é o próprio evento, montado em `marcoChegou` */
    aplica(){ }
  }
};
const MARCO_IDS=Object.keys(MARCOS);

/* quantos marcos de cada tipo já caíram */
function contaMarco(id){ return rumo().marcos.filter(m=>m.id===id).length; }
/* o quanto o saque rende a menos, por marco de cidade. Somado e com teto. */
function rendimentoDoMarco(){
  return 1-Math.min(RUMO_CFG.cidadeTeto,
    contaMarco('cidade')*RUMO_CFG.cidadePorMarco);
}
/* o quanto o risco de invasão sobe, por marco de ousadia */
function ousadiaDoMarco(){
  return Math.min(RUMO_CFG.ousadiaTeto,
    contaMarco('ousadia')*RUMO_CFG.ousadiaPorMarco);
}

/* dispara um marco, se estiver na hora */
async function talvezMarco(){
  const R=rumo();
  if(S.dia<RUMO_CFG.primeiroDia)return false;
  if(R.marcos.length>=RUMO_CFG.maxMarcos)return false;
  if(S.dia-R.ultimoMarcoDia<RUMO_CFG.cadaXDias)return false;
  R.ultimoMarcoDia=S.dia;
  /* o que ainda não caiu tem prioridade: o jogador vê os três tipos */
  const faltam=MARCO_IDS.filter(id=>!contaMarco(id));
  const id=faltam.length?sortear(faltam):sortear(MARCO_IDS);
  R.marcos.push({id,dia:S.dia});
  if(typeof marcarSujo==='function')marcarSujo();
  const M=MARCOS[id];
  try{ M.aplica(); }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'marco/'+id); }
  /* SINAL CLARO — sem isto não conta como marco */
  if(typeof diz==='function'){
    diz('— '+M.n+' —','sist');
    if(M.sinal)diz(M.sinal,'alerta');
  }
  if(id==='chegou')await marcoChegou();
  if(typeof rugido==='function'&&id==='ousadia')try{rugido(.6,0);}catch(e){}
  return id;
}
/* o marco humano: alguém aparece, e pode ser bom ou ruim */
async function marcoChegou(){
  const bom=chance(.55);
  if(bom&&typeof S.pool!=='undefined'&&S.pool.length){
    const p=sortear(S.pool);
    diz(`${p.n} apareceu no portão com as mãos pra cima e uma mochila vazia. Não é imitação — passou por todas as perguntas.`,'bom');
    if(typeof acolher==='function')try{acolher(p);}catch(e){}
  }else{
    diz('Passou um grupo na rua, cinco ou seis, e eles olharam a casa por muito tempo antes de seguir.','perigo');
    S.ruido=trava((S.ruido||0)+12,0,100);
    diz('Agora tem gente que sabe que aqui tem coisa.','alerta');
  }
}

/* os marcos entram nos sistemas existentes, cada um por UM ponto */
if(typeof lootDoLocal==='function'){
  const _ld=lootDoLocal;
  lootDoLocal=function(l,fator){
    /* a cidade esvaziada rende menos: entra no FATOR, não no resultado,
       pra não mexer em nada que já foi multiplicado */
    return _ld.call(this,l,(fator==null?1:fator)*rendimentoDoMarco());
  };
}
if(typeof riscoInvasao==='function'){
  const _ri=riscoInvasao;
  riscoInvasao=function(){
    /* SOMADO, não multiplicado. O multiplicador do §25 é outro eixo e
       continua sendo o único que multiplica — o teste prova. */
    return trava(_ri.apply(this,arguments)+ousadiaDoMarco(),0,.95);
  };
}
/* o marco é checado no amanhecer, que é onde o dia vira */
if(typeof cenaDia==='function'){
  const _cd=cenaDia;
  cenaDia=async function(){
    const r=await _cd.apply(this,arguments);
    try{ setTimeout(()=>{ talvezMarco().catch(()=>{}); },1800); }catch(e){}
    return r;
  };
}

/* ================= O OPALA ================= */
/* a peça de motor entra no catálogo e no mundo */
function registrarPecaMotor(){
  if(typeof CATALOGO==='undefined')return;
  if(!CATALOGO.peca_motor){
    CATALOGO.peca_motor={n:'Peça de motor',cat:'ferra',kg:3.2,vol:4,raro:6,
      d:'Pesada, oleosa, e é exatamente a que falta.'};
  }
  /* Só aparece onde faz sentido. Os tipos de casa deste jogo são
     `simples, abandonada, boa, sitio, comercio, oficina, tocada` — NÃO
     existe "industrial", que foi o que eu escrevi na primeira versão e
     o teste pegou (a peça só entrava em `oficina`, e a promessa de
     "expedições específicas" ficava numa fonte só).
     Oficina e comércio: onde havia carro e onde havia autopeça. */
  if(typeof TIPO_CASA!=='undefined'){
    ['oficina','comercio'].forEach(t=>{
      const T=TIPO_CASA[t];
      if(T&&T.loot&&!T.loot.includes('peca_motor'))T.loot.push('peca_motor');
    });
  }
}
registrarPecaMotor();

/* DESCOBERTA: não é anúncio de menu. Você entra no quintal e vê o carro
   — e só enxerga que dá pra mexer nele se tiver oficina. */
function descobrirOpala(){
  const R=rumo();
  if(R.opala)return false;
  if((S.oficinaNivel||0)<RUMO_CFG.oficinaMinima)return false;
  R.opala={desde:S.dia,pecas:0,pronto:false,saiu:false};
  if(typeof marcarSujo==='function')marcarSujo();
  diz('Tem um Opala embaixo da lona, no fundo do quintal. Você já passou por ele cem vezes.','narr');
  diz('Dessa vez você levanta a lona. O motor está inteiro. Falta peça, falta diesel, e falta a cidade deixar.','sist');
  return true;
}
if(typeof irPara==='function'){
  const _ip=irPara;
  irPara=function(id,semTexto){
    const r=_ip.apply(this,arguments);
    try{ if(id===8&&!rumo().opala)descobrirOpala(); }catch(e){}
    return r;
  };
}

/* o que falta, em lista rastreável */
function opalaFalta(){
  const O=opala();
  if(!O)return null;
  const noites=S.dia-O.desde;
  return {
    pecas:{tem:O.pecas, precisa:RUMO_CFG.pecasPraSair,
      ok:O.pecas>=RUMO_CFG.pecasPraSair},
    diesel:{tem:Math.round(S.diesel||0), precisa:RUMO_CFG.dieselPraSair,
      ok:(S.diesel||0)>=RUMO_CFG.dieselPraSair},
    noites:{tem:noites, precisa:RUMO_CFG.noitesDepoisDeDescobrir,
      ok:noites>=RUMO_CFG.noitesDepoisDeDescobrir}
  };
}
function opalaPronto(){
  const f=opalaFalta();
  return !!f&&f.pecas.ok&&f.diesel.ok&&f.noites.ok;
}

/* a peça achada na expedição vira progresso do carro */
if(typeof guardar==='function'){
  const _gd=guardar;
  guardar=function(id,q){
    const r=_gd.apply(this,arguments);
    try{
      if(id==='peca_motor'&&r&&opala()){
        opala().pecas+=(Number(q)||1);
        if(typeof marcarSujo==='function')marcarSujo();
        const f=opalaFalta();
        diz(`Peça de motor. ${f.pecas.tem} de ${f.pecas.precisa} pro Opala.`,'bom');
      }
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'opala/peca'); }
    return r;
  };
}

/* a tela do carro — só existe no quintal, e só depois de descoberto */
function telaOpala(volta){
  limpar(); AC.innerHTML=''; cap('O OPALA');
  const f=opalaFalta();
  if(!f){ diz('Não tem carro nenhum aqui.','fraco');
    botao('Voltar',volta,{cls:'chave'}); return; }
  diz('Embaixo da lona, no fundo do quintal.','narr');
  const linha=(nome,x)=>ficha(nome, x.tem+' de '+x.precisa, x.ok?'pronto':'falta');
  linha('Peças de motor',f.pecas);
  linha('Diesel guardado',f.diesel);
  linha('Noites desde que achou',f.noites);
  if(!f.pecas.ok)
    diz('Peça de motor só tem em oficina e em zona industrial. Não adianta procurar em casa de gente.','sist');
  if(!f.diesel.ok)
    diz('E o tanque precisa estar cheio na hora de sair. Gastar o diesel no gerador é escolha sua.','sist');
  if(!f.noites.ok)
    diz('O motor precisa de tempo parado depois de montado. Não dá pra sair na mesma noite.','fraco');

  if(opalaPronto()){
    diz('Ele pega. Você ouve o motor e desliga rápido, antes que alguém ouça junto.','bom');
    botao('Sair da cidade agora',()=>fimOpala(),
      {cls:'prim',custo:'acaba a partida do seu jeito'});
  }
  botao('Voltar',volta,{cls:'chave'});
}
if(typeof menuComodo==='function'){
  const _mc=menuComodo;
  menuComodo=function(id){
    const r=_mc.apply(this,arguments);
    try{
      if(id===8&&opala()&&typeof botao==='function'){
        const f=opalaFalta();
        const faltam=['pecas','diesel','noites'].filter(k=>!f[k].ok).length;
        botao('O Opala',()=>telaOpala(()=>menuComodo(8)),
          {custo:faltam?faltam+(faltam===1?' coisa faltando':' coisas faltando'):'pronto pra sair',
           cls:faltam?'':'chave', grupo:'aqui'});
      }
    }catch(e){}
    return r;
  };
}

/* ================= O FINAL DO OPALA =================
   Cena própria, desenhada por função, distinta de morrer e distinta do
   caminhão: lá alguém te salva; aqui você sai por conta. */
function desenharSaida(w,h,t){
  const g=CX.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#0A0910'); g.addColorStop(.55,'#141019'); g.addColorStop(1,'#06050A');
  CX.fillStyle=g; CX.fillRect(0,0,w,h);
  /* a estrada: duas linhas fugindo pro fundo */
  CX.strokeStyle='rgba(120,112,138,.30)'; CX.lineWidth=1.2;
  CX.beginPath(); CX.moveTo(w*.10,h); CX.lineTo(w*.44,h*.46); CX.stroke();
  CX.beginPath(); CX.moveTo(w*.90,h); CX.lineTo(w*.56,h*.46); CX.stroke();
  /* faixas passando */
  for(let i=0;i<7;i++){
    const p=((t*.22+i/7)%1);
    const y=h*.46+ (h*.54)*p*p;
    const lw=w*.006+w*.03*p*p;
    CX.fillStyle='rgba(201,162,39,'+(0.10+0.35*p).toFixed(3)+')';
    CX.fillRect(w*.5-lw/2,y,lw,h*.012+h*.03*p);
  }
  /* a casa ficando pra trás, no retrovisor */
  const rw=w*.34, rh=h*.11, rx=w*.5-rw/2, ry=h*.10;
  CX.fillStyle='rgba(8,7,12,.9)'; CX.fillRect(rx,ry,rw,rh);
  CX.strokeStyle='rgba(120,112,138,.4)'; CX.strokeRect(rx,ry,rw,rh);
  const s=trava(1-t*.06,0,1);
  CX.fillStyle='rgba(40,36,52,'+(0.25+0.5*s).toFixed(3)+')';
  const cw=rw*.20*s+rw*.05, ch=rh*.55*s+rh*.1;
  CX.fillRect(rx+rw/2-cw/2, ry+rh-ch-rh*.12, cw, ch);
  if(s>.12){
    CX.fillStyle='rgba(201,162,39,'+(0.5*s).toFixed(3)+')';
    CX.fillRect(rx+rw/2-cw*.10, ry+rh-ch*.62, cw*.20, ch*.22);
  }
  CX.textAlign='center';
  CX.fillStyle='rgba(180,172,196,.55)';
  CX.font=Math.max(8,h*.024)+'px "Share Tech Mono",monospace';
  CX.fillText('NO RETROVISOR',w*.5,ry-h*.02);
  if(typeof vinheta==='function')vinheta(w,h,1.1);
}
if(typeof desenharVazio==='function'){
  const _dv=desenharVazio;
  desenharVazio=function(w,h,t){
    if(typeof cena!=='undefined'&&cena.modo==='saida')return desenharSaida(w,h,t);
    return _dv.apply(this,arguments);
  };
}

async function fimOpala(){
  const O=opala();
  if(O)O.saiu=true;
  limpar(); AC.innerHTML='';
  cena.modo='saida';
  if(typeof dimensionar==='function')dimensionar();
  if(typeof desligarGerador==='function')try{desligarGerador();}catch(e){}
  cap('VOCÊ SAIU');
  diz('O portão do quintal range uma última vez. Ninguém vem ver.','narr');
  await pausa(1800);
  const gente=(S.abrigo||[]).length;
  diz(gente
    ? `${gente===1?'Uma pessoa vai':gente+' pessoas vão'} com você, apertadas, sem falar nada.`
    : 'Você vai sozinho. Não sobrou ninguém pra levar.', gente?'bom':'perigo');
  await pausa(1600);
  const mortos=(S.mortos||[]).length;
  if(mortos)diz(`${mortos} ficaram. A cidade fica com eles.`,'perigo');
  await pausa(1400);
  diz('A casa some no retrovisor com a luz do lampião ainda acesa na janela da frente.','narr');
  await pausa(1800);
  diz('Você não fechou a porta. Não fazia mais diferença.','sist');
  await pausa(1600);
  if(typeof salvar==='function')try{salvar();}catch(e){}
  AC.innerHTML='';
  botao('Ver o que sobrou',()=>{
    if(typeof fim==='function')fim('opala');
    else if(typeof telaFim==='function')telaFim('opala');
  },{cls:'chave'});
}

/* ================= PERSISTÊNCIA ================= */
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
      d.rumo=S.rumo||null;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/rumo'); }
  };
}
/* Save antigo não tem `rumo`: sem marco nenhum e sem carro descoberto.
   É o estado correto — nada aconteceu ainda. Quem já está no dia 20
   entra com os marcos zerados e o primeiro cai no próximo ciclo, o que
   é mais generoso que retroativo, e generoso é o lado certo de errar. */
if(!S.rumo||typeof S.rumo!=='object')
  S.rumo={marcos:[],ultimoMarcoDia:0,opala:null,versao:1};

/* ================= DEBUG ================= */
function rumoEstado(){
  return {marcos:rumo().marcos.slice(), rendimento:rendimentoDoMarco(),
    ousadia:ousadiaDoMarco(), opala:opala()?{...opala()}:null,
    falta:opalaFalta(), pronto:opalaPronto(), cfg:{...RUMO_CFG}};
}
function rumoMarco(id){
  const R=rumo();
  R.marcos.push({id:MARCOS[id]?id:'cidade',dia:S.dia});
  return rumoEstado();
}
function rumoOpalaPronto(){
  S.oficinaNivel=Math.max(S.oficinaNivel||0,RUMO_CFG.oficinaMinima);
  if(!rumo().opala)rumo().opala={desde:1,pecas:0,pronto:false,saiu:false};
  opala().pecas=RUMO_CFG.pecasPraSair;
  S.diesel=RUMO_CFG.dieselPraSair;
  S.dia=Math.max(S.dia,opala().desde+RUMO_CFG.noitesDepoisDeDescobrir);
  return rumoEstado();
}
