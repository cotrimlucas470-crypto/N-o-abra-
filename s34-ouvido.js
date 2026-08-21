/* ============ §34 — O OUVIDO NA PORTA, REFEITO ============

   A queixa era: "eu não escuto nada, e mesmo quando escuto não
   significa nada". As duas metades estavam certas, e por motivos
   diferentes.

   NÃO ESCUTO NADA
   ---------------
   São 12 s de respiração sintetizada, num celular, com o gerador
   roncando por baixo e a pessoa talvez num ônibus. O som existe e é
   bem feito — mas depender só dele é apostar o miolo do jogo no alto
   falante do aparelho.

   Agora o que se ouve também se VÊ: um traço desenhado a partir do
   MESMO perfil que gera o som. Respiração é onda, passo é barra com
   altura de peso, roupa é o risco ao lado do passo, corpo é ponto.
   Quem não escuta, lê. Não é legenda: é o mesmo dado, noutro sentido.

   E MESMO QUANDO ESCUTO NÃO SIGNIFICA NADA
   ----------------------------------------
   Três defeitos de desenho, todos reais:

   1 · O original sorteava 3 das 4 camadas pra perguntar. Se o único
       defeito do mímico estava na camada que ficou de fora, a resposta
       certa NÃO EXISTIA na tela. O jogador procurava uma coisa que não
       tinha como reportar. Isso não é dificuldade, é armadilha —
       e é exatamente o que a regra de ouro proíbe.

   2 · Não havia referência. "Rápida demais" comparada com o quê? Sem
       um normal pra medir, todo ritmo parece plausível.

   3 · Uma escuta só, e o julgamento vinha depois, de memória.

   Agora: as quatro camadas SEMPRE aparecem, dá pra ouvir de novo
   quantas vezes quiser (cada vez custa ruído — é decisão, não brinde),
   e existe um botão pra lembrar como é gente respirando.
   ====================================================================== */

const OUV_CFG={
  /* ruído que cada escuta gera. A primeira é a do jogo (5); as
     repetidas custam menos, senão ouvir duas vezes vira suicídio. */
  ruidoRepetir: 3,
  /* a referência é de graça: ela não te diz nada sobre QUEM está lá
     fora, só lembra como um corpo funciona. Cobrar por isso seria
     cobrar pra ler a regra do jogo. */
  ruidoReferencia: 0,
  /* segundos de som por escuta — o mesmo do original */
  duracao: 12,
  /* altura do traço na tela, em fração da altura disponível */
  alturaTraco: .34,
  /* quantas escutas antes de o jogo comentar que você está demorando.
     Ficar na porta é perigoso e o jogo tem de dizer isso. */
  avisarApos: 3
};

/* ---------- referência: como é gente ----------
   Um perfil sem defeito nenhum, sempre o mesmo. É a régua. */
const OUV_REF={rpm:16, variacao:.22, peso:.8, defeitos:[]};

/* ================= O TRAÇO =================
   Desenhado do mesmo perfil que gera o som. Se o som diz que a
   respiração é de metrônomo, o traço mostra uma onda sem variação
   nenhuma — não porque alguém escreveu isso, mas porque é a mesma
   conta. */
function ouvEstilo(){
  if(document.getElementById('css-ouvido'))return;
  const s=document.createElement('style');
  s.id='css-ouvido';
  s.textContent=
   '#ouv-traco{display:block;width:100%;max-width:560px;margin:10px auto 4px;'
  +'border:1px solid rgba(232,226,212,.10);border-radius:2px;background:#0D0B10}'
  +'#ouv-leg{max-width:560px;margin:0 auto 10px;display:flex;gap:14px;'
  +'flex-wrap:wrap;justify-content:center;font-family:var(--mostrador);'
  +'font-size:10px;letter-spacing:.10em;color:#7A8B7F;text-transform:uppercase}'
  +'#ouv-leg b{color:#C9A227;font-weight:400}'
  +'#ouv-leg i{font-style:normal;opacity:.55}';
  document.head.appendChild(s);
}

/* a onda da respiração no instante t (segundos) */
function ouvOnda(e,t){
  const per=60/e.rpm;
  /* A VARIACAO E DE TEMPO, NAO SO DE ALTURA.
     Gente nunca repete o mesmo intervalo entre duas respiradas; o
     metronomo repete sempre. Na primeira versao a variacao so mexia na
     ALTURA do pico, e no papel "gente" e "metronomo" sairam quase
     identicos — o defeito existia no som e nao existia no tracado.
     Agora cada ciclo tem duracao propria, e o espacamento desigual e a
     primeira coisa que o olho pega. */
  const sem=n=>((Math.sin((n*97+Math.round(e.rpm*13))*12.9898)*43758.5453)%1+1)%1;
  let ini=0, n=0, dur=per;
  for(let g=0;g<600;g++){
    dur=per*(1+(sem(n)-0.5)*2*e.variacao);
    if(t<ini+dur)break;
    ini+=dur; n++;
  }
  const f=(t-ini)/dur;
  /* inspira rápido, solta devagar — não é senoide, é pulmão */
  /* 0 no fim da expiração, 1 no topo da inspiração — e depois
     esticado pra -1..1, senão o traço so usa a metade de cima da caixa
     e joga fora metade da resolucao que o olho tem pra ler ritmo. */
  const sobe=f<.38 ? Math.sin(f/.38*Math.PI/2)
                   : Math.cos((f-.38)/.62*Math.PI/2);
  const base=sobe*2-1;
  /* e a altura tambem varia um pouco, pelo mesmo motivo */
  return base*(1-e.variacao*.35+e.variacao*.7*sem(n+500));
}
/* onde caem os passos, de forma estável pro mesmo visitante */
function ouvPassos(e,dur){
  const h=(e.rpm*7919+Math.round(e.peso*1000))>>>0;
  const sem=i=>((Math.sin((h+i*97)*12.9898)*43758.5453)%1+1)%1;
  const n=3+Math.floor(sem(1)*2);
  const out=[];
  for(let i=0;i<n;i++){
    const t=1.2+i*((dur-2.4)/n)+sem(i*3)*.7;
    const semPeso=e.defeitos.some(d=>d.id==='sempeso');
    out.push({t, peso:semPeso?0:e.peso,
      roupa:!e.defeitos.some(d=>d.id==='semroupa'),
      extra:e.defeitos.some(d=>d.id==='gentedemais')});
  }
  return out;
}
/* sons de corpo */
function ouvCorpo(e,dur){
  if(e.defeitos.some(d=>d.id==='semcorpo'))return [];
  const h=(e.rpm*104729)>>>0;
  const sem=i=>((Math.sin((h+i*131)*12.9898)*43758.5453)%1+1)%1;
  const out=[{t:2.6+sem(1)}];
  if(sem(2)>.4)out.push({t:6.1+sem(3)*1.5});
  if(sem(4)>.55)out.push({t:8.4+sem(5)});
  return out.filter(p=>p.t<dur);
}

function ouvDesenhar(cv,e,ate,ref){
  const x=cv.getContext('2d');
  const W=cv.width, H=cv.height, dur=OUV_CFG.duracao;
  const px=v=>v*(W/560);
  x.fillStyle='#0D0B10'; x.fillRect(0,0,W,H);

  const meio=H*0.52, amp=H*0.30;
  const emX=t=>t/dur*W;

  /* grade de segundos: dá escala pro olho */
  x.strokeStyle='rgba(232,226,212,.055)'; x.lineWidth=1;
  for(let s=1;s<dur;s++){
    x.beginPath(); x.moveTo(emX(s),H*0.10); x.lineTo(emX(s),H*0.92); x.stroke();
  }

  /* a régua: como é gente. Fica atrás, apagada. Sem ela, "rápida
     demais" não tem com o que ser comparada. */
  if(ref){
    x.strokeStyle='rgba(122,139,127,.34)';
    x.setLineDash([px(4),px(5)]); x.lineWidth=px(1.6);
    x.beginPath();
    for(let i=0;i<=W;i+=2){
      const t=i/W*dur, y=meio-ouvOnda(OUV_REF,t)*amp*.82;
      i?x.lineTo(i,y):x.moveTo(i,y);
    }
    x.stroke(); x.setLineDash([]);
  }

  /* a respiração de quem está lá fora */
  const lim=Math.max(0,Math.min(dur,ate));
  x.strokeStyle='#C9A227'; x.lineWidth=px(2.4);
  x.lineJoin='round'; x.lineCap='round';
  x.beginPath();
  for(let i=0;i<=emX(lim);i+=2){
    const t=i/W*dur, y=meio-ouvOnda(e,t)*amp;
    i?x.lineTo(i,y):x.moveTo(i,y);
  }
  x.stroke();
  /* "era ar passando sem peito atrás": a onda existe mas não tem corpo.
     Desenhada como linha oca, pra o olho pegar na hora. */
  if(e.defeitos.some(d=>d.id==='sempulmao')){
    x.strokeStyle='#0D0B10'; x.lineWidth=px(1.1);
    x.beginPath();
    for(let i=0;i<=emX(lim);i+=2){
      const t=i/W*dur, y=meio-ouvOnda(e,t)*amp;
      i?x.lineTo(i,y):x.moveTo(i,y);
    }
    x.stroke();
  }

  /* passos: barra com altura de peso. Sem peso, a barra some. */
  ouvPassos(e,dur).forEach(p=>{
    if(p.t>lim)return;
    const px2=emX(p.t);
    const alt=H*0.30*p.peso;
    x.strokeStyle=p.peso>0?'rgba(232,226,212,.78)':'rgba(140,47,30,.85)';
    x.lineWidth=px(3);
    x.beginPath(); x.moveTo(px2,H*0.90); x.lineTo(px2,H*0.90-Math.max(px(4),alt)); x.stroke();
    if(p.roupa){
      x.strokeStyle='rgba(232,226,212,.30)'; x.lineWidth=px(1.4);
      x.beginPath(); x.moveTo(px2+px(4),H*0.90); x.lineTo(px2+px(9),H*0.90-px(11)); x.stroke();
    }
    if(p.extra){
      x.strokeStyle='rgba(232,226,212,.55)'; x.lineWidth=px(2.2);
      [px(7),px(13)].forEach((d,i)=>{
        x.beginPath(); x.moveTo(px2+d,H*0.90);
        x.lineTo(px2+d,H*0.90-Math.max(px(4),alt*(i?.7:.8))); x.stroke(); });
    }
  });

  /* corpo: pontos. Nenhum ponto em 12 s é um corpo que não engole. */
  ouvCorpo(e,dur).forEach(p=>{
    if(p.t>lim)return;
    x.fillStyle='rgba(201,162,39,.9)';
    x.beginPath(); x.arc(emX(p.t),H*0.135,px(4),0,7); x.fill();
  });

  /* cabeça de leitura */
  if(ate<dur){
    x.strokeStyle='rgba(232,226,212,.55)'; x.lineWidth=px(1.4);
    x.beginPath(); x.moveTo(emX(lim),H*0.06); x.lineTo(emX(lim),H*0.94); x.stroke();
  }
}

/* ---------- a tela do traço ---------- */
function ouvMontarTraco(caixa,legenda){
  ouvEstilo();
  const cv=document.createElement('canvas');
  cv.id='ouv-traco';
  const larg=Math.min(560,(caixa.clientWidth||360)-8);
  const r=window.devicePixelRatio||1;
  cv.width=Math.round(larg*r);
  cv.height=Math.round(larg*OUV_CFG.alturaTraco*r);
  cv.style.height=Math.round(larg*OUV_CFG.alturaTraco)+'px';
  caixa.appendChild(cv);
  if(legenda!==false){
    const l=document.createElement('div');
    l.id='ouv-leg';
    l.innerHTML='<span><b>———</b> respiração</span>'
      +'<span><i>- - -</i> como é gente</span>'
      +'<span><b>|</b> passo (altura = peso)</span>'
      +'<span><b>•</b> engolir, fungar, tossir</span>';
    caixa.appendChild(l);
  }
  return cv;
}
/* roda o traço em tempo real junto com o som */
function ouvAnimar(cv,e,ref,segundos){
  return new Promise(r=>{
    const t0=performance.now();
    const passo=()=>{
      const t=(performance.now()-t0)/1000;
      ouvDesenhar(cv,e,t,ref);
      if(t>=segundos){ ouvDesenhar(cv,e,segundos,ref); return r(); }
      requestAnimationFrame(passo);
    };
    passo();
  });
}

/* ================= A ESCUTA ================= */
let _ouvVezes=0;

async function ouvirDeNovo(v,e,antes){
  _ouvVezes++;
  S.ruido=trava(S.ruido+OUV_CFG.ruidoRepetir,0,100);
  if(typeof atualizarPainel==='function')atualizarPainel();
  return ouvSessao(v,e,antes,false);
}
async function ouvirReferencia(v,e,antes){
  limpar(); cap('Como é gente respirando');
  diz('Você fecha os olhos e lembra do peito de alguém dormindo do seu lado. '
    +'É isso que você está procurando do outro lado da porta.','narr');
  const caixa=document.getElementById('texto')||document.body;
  const cv=ouvMontarTraco(caixa,false);
  AC.innerHTML='';
  if(typeof tocarEscuta==='function'&&A.ctx){
    try{ const fake={...v,_escuta:OUV_REF}; tocarEscuta(fake); }catch(err){}
  }
  await ouvAnimar(cv,OUV_REF,false,OUV_CFG.duracao);
  if(typeof devolverAmbiente==='function')try{devolverAmbiente();}catch(err){}
  await pausa(400);
  return ouvSessao(v,e,antes,false);
}

/* uma sessão de escuta: som + traço, e depois as escolhas */
async function ouvSessao(v,e,antes,primeira){
  limpar();
  cap(primeira?'Você encosta o ouvido na madeira':'Você escuta de novo');
  const caixa=document.getElementById('texto')||document.body;
  const cv=ouvMontarTraco(caixa,true);
  AC.innerHTML='';
  const semSom=(!A.ctx||S.semVoz);
  if(semSom)diz('Sem som no aparelho — mas o traço é o mesmo dado. Dá pra ler.','fraco');
  let dur=OUV_CFG.duracao;
  if(!semSom&&typeof tocarEscuta==='function'){
    try{ dur=tocarEscuta(v)||OUV_CFG.duracao; }catch(err){}
  }
  await ouvAnimar(cv,e,true,Math.min(dur,OUV_CFG.duracao));
  if(!semSom&&typeof devolverAmbiente==='function')
    try{devolverAmbiente();}catch(err){}
  await pausa(350);
  return ouvEscolher(v,e,antes,cv);
}

/* ---------- as escolhas ----------
   AS QUATRO CAMADAS, SEMPRE. Esconder uma delas era esconder a resposta
   certa em um de cada quatro casos. */
function ouvEscolher(v,e,antes,cv){
  limpar();
  cap('O que te incomodou');
  diz('O traço fica na tela. Compare com o pontilhado — aquilo é gente.','fraco');
  const caixa=document.getElementById('texto')||document.body;
  const cv2=ouvMontarTraco(caixa,true);
  ouvDesenhar(cv2,e,OUV_CFG.duracao,true);
  if(_ouvVezes>=OUV_CFG.avisarApos)
    diz('Você já está faz tempo com a cara colada na porta. Quem está lá fora sabe disso.','alerta');
  AC.innerHTML='';
  /* ordem fixa: dá pra aprender onde as coisas ficam */
  PERG_ESCUTA.forEach(p=>{
    botao(p.q,()=>ouvResponder(v,e,p,antes),{custo:'uma camada'});
  });
  botao('Ouvir de novo',()=>ouvirDeNovo(v,e,antes),
    {custo:'+'+OUV_CFG.ruidoRepetir+' de ruído'});
  botao('Lembrar como é gente',()=>ouvirReferencia(v,e,antes),{custo:'de graça'});
  botao('Não ouvi nada de errado',()=>julgarEscuta(v,e,null,antes),{cls:'chave'});
}
function ouvResponder(v,e,p,antes){
  limpar(); cap(p.q);
  const caixa=document.getElementById('texto')||document.body;
  const cv=ouvMontarTraco(caixa,false);
  ouvDesenhar(cv,e,OUV_CFG.duracao,true);
  AC.innerHTML='';
  /* ordem fixa também aqui: o "normal" sempre em cima */
  p.op.forEach(([txt,id])=>botao(txt,()=>julgarEscuta(v,e,id,antes)));
  botao('Voltar',()=>ouvEscolher(v,e,antes),{});
}

/* ---------- entra no lugar da escuta antiga ---------- */
if(typeof escutarPorta==='function'){
  escutarPorta=async function(v){
    AC.innerHTML='';
    v.escutou=true; v.turnos++;
    if(typeof metodoPorta==='function')try{metodoPorta().ouvido++;}catch(e){}
    S.ruido=trava(S.ruido+5,0,100);
    if(typeof atualizarPainel==='function')atualizarPainel();
    _ouvVezes=1;
    const e=perfilEscuta(v);
    const antes=cena.modo;
    cena.modo='escuta';
    if(typeof dimensionar==='function')dimensionar();
    return ouvSessao(v,e,antes,true);
  };
}
/* a volta pro modo de antes acontece no julgamento, que é do jogo */
if(typeof julgarEscuta==='function'){
  const _ouvJulgar=julgarEscuta;
  julgarEscuta=async function(v,e,escolha,antes){
    _ouvVezes=0;
    return _ouvJulgar.apply(this,arguments);
  };
}

function ouvEstado(){
  return {vezes:_ouvVezes, camadas:PERG_ESCUTA.length,
    todasOferecidas:true, duracao:OUV_CFG.duracao,
    referencia:OUV_REF, certas:S.escutasCertas||0, erradas:S.escutasErradas||0};
}
