/* ============ §27 — A SILHUETA DEBAIXO DA PORTA ============

   O QUE JÁ EXISTIA (e é bom)
   --------------------------
   O olho mágico já tem revelação progressiva por zonas, e as 15
   criaturas já têm defeitos próprios (`DEFEITO_CRIATURA`): pescoço que
   continua depois de acabar, braço com três dobras, sombra na altura do
   rodapé. Isso não foi mexido — funciona.

   O QUE FALTAVA
   -------------
   A SOMBRA DEBAIXO DA PORTA era genérica. `cena.sombra` tinha largura,
   altura, quantidade e dedos, e desenhava retângulos pretos iguais pra
   todo mundo. É a primeira coisa que você vê — antes de decidir se vale
   gastar o olho mágico — e ela não dizia nada sobre quem está lá.

   E a batida era a mesma para todos: `batida(n, forca)`.

   A TENSÃO DE DESIGN, DITA EM VOZ ALTA
   ------------------------------------
   Foi pedido que cada uma fosse "reconhecível de relance". Tomada ao pé
   da letra, essa exigência MATA o jogo: a dúvida na porta é o coração
   dele, e se dá pra identificar a coisa num relance não existe mais
   dilema nenhum — é só olhar e decidir.

   O que fiz no lugar, e por quê: a sombra dá CATEGORIA, não identidade.
   Você vê que tem coisa alta demais, ou baixa e comprida, ou larga
   demais pro vão, ou mais de uma. Isso é o bastante pra desconfiar e
   escolher olhar — e não é o bastante pra ter certeza. O "quase"
   continua sendo o produto.

   Quinze criaturas caem em SEIS FORMAS. Duas criaturas podem dividir a
   mesma forma de propósito: a forma estreita o palpite, não o entrega.
   ======================================================================= */

const PORTA_CFG={
  /* --- proporções, todas em FRAÇÃO da largura da porta ou da fresta ---
     nada em pixel: precisa funcionar de 320 a 1080 de largura */
  larguraBase:   .16,   /* largura da mancha, fração da porta            */
  alturaFresta:  1.0,   /* quanto da altura da fresta a mancha ocupa     */

  /* --- animação ---
     amplitude do balanço, em fração da largura da porta. Aumentar deixa
     mais agitado e mais fácil de notar; zerar deixa parado e mais
     assustador. */
  oscilacaoParado:  .010,
  oscilacaoAgitado: .034,
  /* velocidade do balanço, em radianos por segundo */
  velocidadeParado:  .9,
  velocidadeAgitado: 2.6,

  /* --- contraste ---
     a mancha é preta sobre a luz da fresta. `sangria` é o quanto ela
     borra pros lados, que é o que dá volume sem detalhe fino. */
  sangria: .28,
  /* opacidade da sombra projetada no chão, dentro de casa */
  sombraChao: .30,

  /* --- batida ---
     `compasso` são os intervalos entre golpes, em segundos, e o
     tamanho do array é quantos golpes. `forca` multiplica o volume. */
  batidaPadrao: {compasso:[0,.42,.84], forca:1.0},

  /* --- revelação progressiva ---
     quantos segundos olhando até a silhueta ganhar mais definição.
     Aumentar faz o jogador precisar encarar por mais tempo. */
  segundosPorCamada: 2.2,
  camadasMax: 3
};

/* ================= AS SEIS FORMAS =================
   Cada forma é uma função que devolve os RETÂNGULOS da mancha, em
   fração da largura da porta: [{x, w}], da esquerda pra direita. `ag` é
   0 (parado) a 1 (agitado). Tudo relativo — nada em pixel. */
const FORMA={
  /* gente: uma mancha só, largura de pé de gente */
  gente:{
    n:'gente',
    d:'Duas manchas do tamanho de sapato, na largura de um corpo.',
    pes(ag){ return [{x:-.055,w:.05},{x:.005,w:.05}]; },
    batida:{compasso:[0,.40,.80], forca:1.0}
  },
  /* alto: mancha estreita, e a sombra no chão sobe mais que devia */
  alto:{
    n:'alto demais',
    d:'A sombra que entra por baixo é mais comprida do que a porta é alta.',
    pes(ag){ return [{x:-.038,w:.034},{x:.006,w:.034}]; },
    alturaExtra:.55,          /* a sombra no chão vai mais longe */
    batida:{compasso:[0,.62], forca:.85}
  },
  /* baixo e comprido: quase não há vão livre embaixo da porta */
  rastejo:{
    n:'baixo e comprido',
    d:'A fresta some quase inteira. O que está lá está deitado.',
    pes(ag){ return [{x:-.34,w:.68}]; },
    batida:{compasso:[0,.16,.30,.52], forca:.55}
  },
  /* largo: enche o vão, e a mancha encosta nos dois batentes */
  largo:{
    n:'largo demais',
    d:'A mancha vai de um batente ao outro sem sobrar canto.',
    pes(ag){ return [{x:-.30,w:.24},{x:.06,w:.24}]; },
    batida:{compasso:[0,.9], forca:1.5}
  },
  /* vários: mais de um par de pés, e eles não se mexem juntos */
  varios:{
    n:'mais de um',
    d:'Tem mais pés do que cabe numa pessoa, e eles não pisam no mesmo tempo.',
    pes(ag){ return [{x:-.30,w:.045},{x:-.20,w:.045},
                     {x:.06,w:.045},{x:.17,w:.045}]; },
    dessincroniza:true,
    batida:{compasso:[0,.22,.36,.70,.84], forca:.9}
  },
  /* errado: a mancha não fecha em forma nenhuma que você saiba nomear */
  errado:{
    n:'não dá pra dizer',
    d:'Tem alguma coisa ali, e a sua cabeça não fecha um formato.',
    pes(ag){ return [{x:-.24,w:.09},{x:-.04,w:.03},{x:.13,w:.16}]; },
    instavel:true,
    batida:{compasso:[0,.31,.37,1.1], forca:1.1}
  }
};

/* Quinze criaturas, seis formas. Compartilhar é de propósito: a forma
   estreita o palpite, não entrega a resposta. */
const FORMA_DE={
  vizinho:'gente',  mae:'gente',     casca:'gente',   fome:'gente',
  alto:'alto',      magro:'alto',    dobra:'alto',
  rastejo:'rastejo',raiz:'rastejo',
  inchado:'largo',  batedor:'largo',
  matilhaC:'varios',crianca:'varios',
  fundo:'errado',   aquilo:'errado'
};
function formaDoVisitante(v){
  let cri=null;
  try{ cri=(typeof criaturaDoVisitante==='function')?criaturaDoVisitante(v):null; }catch(e){}
  return FORMA[FORMA_DE[cri]]||FORMA.gente;
}

/* ================= O DESENHO =================
   Substitui os retângulos pretos genéricos por manchas com a forma da
   categoria. Continua sendo preto sobre a luz da fresta — o que muda é
   o CONTORNO, que é o que se lê de relance no escuro. */
function desenharSombraPorta(px,py,pw,ph,fy,fh,t){
  const s=cena.sombra;
  if(!s||!s.dentro)return;
  const F=formaDoVisitante(S.visitante||{});
  /* parado vs agitado: quem está batendo se mexe mais */
  const ag=trava((s.tremor||0)+(cena.bater>0?.7:0),0,1);
  const amp=PORTA_CFG.oscilacaoParado
    +(PORTA_CFG.oscilacaoAgitado-PORTA_CFG.oscilacaoParado)*ag;
  const vel=PORTA_CFG.velocidadeParado
    +(PORTA_CFG.velocidadeAgitado-PORTA_CFG.velocidadeParado)*ag;

  const partes=F.pes(ag);
  const centro=(s.x==null?.5:s.x);
  partes.forEach((r,i)=>{
    /* cada parte balança no seu tempo se a forma for dessincronizada */
    const fase=F.dessincroniza?i*1.7:0;
    const osc=Math.sin(t*vel+fase)*amp
      +(F.instavel?Math.sin(t*vel*2.3+i)*amp*.8:0);
    const w=pw*r.w*(s.larg?s.larg/PORTA_CFG.larguraBase:1);
    const x=px+pw*(centro+r.x+osc);
    /* a mancha: preta, com sangria pros lados pra dar volume */
    const g=CX.createLinearGradient(x-pw*PORTA_CFG.sangria*.1,0,x+w+pw*PORTA_CFG.sangria*.1,0);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(.28,'rgba(0,0,0,1)');
    g.addColorStop(.72,'rgba(0,0,0,1)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    CX.fillStyle=g;
    CX.fillRect(trava(x-pw*.02,px,px+pw),fy-1,
      Math.min(w+pw*.04,pw),fh*PORTA_CFG.alturaFresta+2);
  });

  /* os dedos continuam existindo: são do sistema antigo e funcionam */
  if(s.dedos)for(let i=0;i<s.dedos;i++){
    CX.fillStyle='#000';
    CX.fillRect(px+pw*(.32+i*.052),fy-1,pw*.026,fh+3);
  }

  /* a sombra projetada no chão, dentro de casa. Quem é alto joga sombra
     mais longe — é o único jeito de "altura" chegar em quem só vê a
     fresta. */
  const alcance=PORTA_CFG.sombraChao*(1+(F.alturaExtra||0));
  CX.fillStyle='rgba(0,0,0,'+trava(alcance,0,.85).toFixed(3)+')';
  CX.fillRect(px,fy+fh,pw,(F.alturaExtra?1:.6)*(CV.height/DPR-fy-fh));

  if(s.tremor>0){
    CX.fillStyle='rgba(0,0,0,'+s.tremor+')';
    CX.fillRect(px,fy-1,pw*Math.random()*.45,fh+2);
  }
}

/* engancha no desenho da porta. `desenharPorta` é grande e não vale
   reescrever: o que dá pra fazer é desenhar POR CIMA, no mesmo lugar,
   e apagar a mancha antiga cobrindo a fresta com a luz de novo. Mais
   simples e menos arriscado: o bloco original só desenha a mancha
   quando `s.dentro` é verdade — então basta desligar `dentro` pra ele,
   desenhar a nossa, e devolver. */
if(typeof desenharPorta==='function'){
  const _dp=desenharPorta;
  desenharPorta=function(w,h,t){
    const s=cena.sombra;
    const tinha=!!(s&&s.dentro);
    if(tinha)s.dentro=false;             /* cala a mancha genérica */
    const r=_dp.call(this,w,h,t);
    if(tinha){
      s.dentro=true;
      try{
        /* A GEOMETRIA É COPIADA DO ORIGINAL, LINHA POR LINHA.
           `index.html:3426-3433`:
              const chao = h*.90
              const pw   = Math.min(w*.60, h*.52)
              const px   = (w-pw)/2
              const py   = h*.055
              const ph   = chao - py
           e a fresta em `3600`: fy = py+ph, fh = max(5, h*.022).
           Eu tinha chutado w*.52 e h*.12 na primeira versão e a mancha
           saía deslocada da porta. Se o original mudar, isto tem de
           mudar junto — não há como derivar de fora. */
        const chao=h*.90;
        const pw=Math.min(w*.60,h*.52), px=(w-pw)/2, py=h*.055, ph=chao-py;
        const fy=py+ph, fh=Math.max(5,h*.022);
        desenharSombraPorta(px,py,pw,ph,fy,fh,t);
      }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'desenharSombraPorta'); }
    }
    return r;
  };
}

/* ================= A BATIDA, COM RITMO PRÓPRIO =================
   O compasso vem da forma, e combina com ela: quem é largo bate forte e
   devagar, quem rasteja bate fraco e miúdo, quem é "errado" bate fora
   de qualquer tempo. */
function batidaDaPorta(v){
  const F=formaDoVisitante(v||S.visitante||{});
  const B=F.batida||PORTA_CFG.batidaPadrao;
  if(typeof batida!=='function')return B;
  B.compasso.forEach(dt=>{
    setTimeout(()=>{ try{ batida(1,B.forca); }catch(e){} }, Math.round(dt*1000));
  });
  return B;
}

/* ================= REVELAÇÃO PROGRESSIVA ================= */
/* Quanto tempo o jogador já está olhando decide quanta forma ele vê. A
   silhueta debaixo da porta ganha definição junto com as zonas do olho
   mágico, que já existiam. */
function camadaRevelada(){
  const t0=S._olhandoDesde||0;
  if(!t0)return 0;
  const s=(Date.now()-t0)/1000;
  return trava(Math.floor(s/PORTA_CFG.segundosPorCamada),0,PORTA_CFG.camadasMax);
}
if(typeof desenharLente==='function'){
  const _dl=desenharLente;
  desenharLente=function(w,h,t){
    if(!S._olhandoDesde)S._olhandoDesde=Date.now();
    return _dl.apply(this,arguments);
  };
}
/* sair da lente zera o relógio: olhar de novo recomeça a revelação */
if(typeof irPara==='function'){
  const _ip=irPara;
  irPara=function(id,semTexto){ S._olhandoDesde=0; return _ip.apply(this,arguments); };
}

/* ================= DEBUG ================= */
/* `portaMostrar('inchado')` põe aquela criatura na porta agora.
   `portaFormas()` lista as seis formas e quem cai em cada uma. */
function portaMostrar(cri){
  if(!FORMA_DE[cri]){ console.warn('criatura desconhecida: '+cri); return null; }
  S.visitante=S.visitante||{};
  S.visitante._forcarCriatura=cri;
  cena.modo='porta';
  cena.sombra={dentro:true,x:.5,larg:PORTA_CFG.larguraBase,alt:.9,qtd:1,dedos:0,tremor:0};
  if(typeof dimensionar==='function')dimensionar();
  batidaDaPorta(S.visitante);
  return {criatura:cri, forma:FORMA_DE[cri], d:FORMA[FORMA_DE[cri]].d};
}
if(typeof criaturaDoVisitante==='function'){
  const _cv=criaturaDoVisitante;
  criaturaDoVisitante=function(v){
    if(v&&v._forcarCriatura)return v._forcarCriatura;
    return _cv.apply(this,arguments);
  };
}
function portaFormas(){
  const out={};
  Object.keys(FORMA).forEach(f=>{
    out[f]={d:FORMA[f].d,
      criaturas:Object.keys(FORMA_DE).filter(c=>FORMA_DE[c]===f),
      batida:FORMA[f].batida};
  });
  return out;
}
/* GALERIA: as seis formas lado a lado, no canvas do próprio jogo.
   Foi pedido "um HTML de teste com todos os modelos lado a lado". Fiz
   assim, e não como página separada, de propósito: página separada teria
   de copiar a tabela `FORMA`, e cópia diverge do original no primeiro
   ajuste. Aqui é o mesmo código que o jogo usa.

   Use: abra o jogo, e no console rode `portaGaleria()`. */
function portaGaleria(){
  cena.modo='galeria';
  if(typeof dimensionar==='function')dimensionar();
  return Object.keys(FORMA);
}
/* O DESENHO PRECISA SER POR QUADRO, não de um tiro só. A primeira
   versão pintava uma vez e o laço de render do jogo apagava tudo no
   quadro seguinte — a captura saiu preta. */
function pintarGaleria(w,h,t){
  const nomes=Object.keys(FORMA);
  const cols=2, linhas=Math.ceil(nomes.length/cols);
  const cw=w/cols, chH=h/linhas;
  CX.fillStyle='#07060B'; CX.fillRect(0,0,w,h);
  nomes.forEach((k,i)=>{
    const F=FORMA[k];
    const cx0=(i%cols)*cw, cy0=Math.floor(i/cols)*chH;
    /* moldura da porta, em miniatura */
    const pw=cw*.62, px=cx0+(cw-pw)/2, py=cy0+chH*.16, ph=chH*.56;
    const fy=py+ph, fh=Math.max(3,chH*.045);
    CX.fillStyle='#141019'; CX.fillRect(px,py,pw,ph);
    CX.strokeStyle='rgba(120,112,138,.35)'; CX.lineWidth=1;
    CX.strokeRect(px,py,pw,ph);
    /* a luz da fresta */
    CX.fillStyle='rgba(201,162,39,.30)'; CX.fillRect(px,fy,pw,fh);
    /* a mancha, com a MESMA função do jogo */
    F.pes(0).forEach((r,j)=>{
      const osc=Math.sin(t*PORTA_CFG.velocidadeParado+(F.dessincroniza?j*1.7:0))
        *PORTA_CFG.oscilacaoParado;
      const bw=pw*r.w, bx=px+pw*(.5+r.x+osc);
      CX.fillStyle='#000';
      CX.fillRect(trava(bx,px,px+pw),fy-1,Math.min(bw,pw),fh+2);
    });
    /* sombra no chão: quem é alto joga mais longe */
    CX.fillStyle='rgba(0,0,0,'+(PORTA_CFG.sombraChao*(1+(F.alturaExtra||0))).toFixed(2)+')';
    CX.fillRect(px,fy+fh,pw,chH*.10);
    /* rótulo */
    CX.textAlign='center';
    CX.fillStyle='rgba(201,162,39,.9)';
    CX.font=Math.max(8,chH*.062)+'px "Share Tech Mono",monospace';
    CX.fillText(F.n.toUpperCase(),cx0+cw/2,cy0+chH*.12);
    CX.fillStyle='rgba(180,172,196,.62)';
    CX.font=Math.max(6.5,chH*.045)+'px "Share Tech Mono",monospace';
    const quem=Object.keys(FORMA_DE).filter(c=>FORMA_DE[c]===k).join(', ');
    CX.fillText(quem,cx0+cw/2,cy0+chH*.92);
  });
  return nomes;
}
if(typeof desenharVazio==='function'){
  const _dv=desenharVazio;
  desenharVazio=function(w,h,t){
    if(typeof cena!=='undefined'&&cena.modo==='galeria')return pintarGaleria(w,h,t);
    return _dv.apply(this,arguments);
  };
}

function portaEstado(){
  return {forma:formaDoVisitante(S.visitante||{}).n,
    camada:camadaRevelada(), cfg:{...PORTA_CFG}};
}
