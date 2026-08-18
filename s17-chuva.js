/* ================= §17 — A CHUVA, DE UM DONO SÓ =================
   Antes a chuva era três coisas soltas que não se conheciam: o
   `desenharChuva` no canvas, dois leitos de áudio (`chuva_leve` e
   `chuva_pesada`) que o diretor de ambiente ligava e desligava, e a
   calha. Trocar de chuva fraca pra forte trocava de FONTE — ou seja,
   parava um som e começava outro, fora de fase, com corte audível.

   Aqui a chuva passa a ter um dono só. Três regras que valem para
   tudo que este bloco faz:

   1. UMA FONTE. O som da chuva nasce uma vez e não para enquanto
      chove. Intensidade e lugar mexem em ganho e filtro, nunca em
      `start`/`stop`. Não existe reinício, não existe eco de duas
      cópias fora de fase, porque não existem duas cópias.

   2. DUAS SAÍDAS, MESMO RELÓGIO. O crossfade entre "estou na chuva"
      e "estou abrigado" é feito com dois CAMINHOS paralelos saindo
      da MESMA fonte — um aberto, um abafado. Compartilham a linha do
      tempo por construção: não é sincronia mantida, é sincronia
      impossível de perder.

   3. UM NÚMERO SÓ MANDA. `intensidade` (o quanto chove) e `exposicao`
      (o quanto disso te alcança) governam áudio, partícula, névoa e
      janela ao mesmo tempo. Não dá pra ter chuva forte na tela e
      quase nada no ouvido.

   SOBRE O MP3: a chuva agora É uma gravação, embutida no HTML. Um
   arquivo em `audio/chuva.mp3` tem precedência sobre ela — é assim
   que se troca a chuva sem tocar no HTML. Se nenhum dos dois puder
   ser decodificado, a síntese continua lá como rede de segurança.
   ================================================================= */

/* ---------- todos os parâmetros ajustáveis, num lugar só ---------- */
const CHUVA={
  arquivo:'chuva.mp3',        /* dentro de audio/ — troque aqui se mudar o nome */
  /* laço do MP3: [inicio,fim] em SEGUNDOS. Segundos e não amostras
     porque o navegador reamostra o arquivo pra taxa do contexto, e
     amostra deixaria de valer. null = laça o buffer inteiro, que é o
     certo pra um arquivo já cortado como laço. */
  /* A gravação embutida é um laço de 5,76 s tirado de uma tempestade
     real, do trecho SEM trovão: trovão dentro do laço se repetiria a
     cada volta e denunciaria a gravação na hora. Os trovões daquela
     mesma fita viraram disparos avulsos (§ AudioManager), que é onde
     eles soam certos — a intervalos irregulares.
     Pontos em SEGUNDOS: o início pula os 50 ms de atraso do encoder. */
  laco:[0.0501134,5.8101134],
  /* quanto tempo leva cada mudança suave */
  tempoIntensidade:1.6,       /* começar, engrossar, parar */
  tempoExposicao:0.65,        /* entrar e sair de casa */
  /* níveis: 0 a 1, multiplicam o teto do canal AMBIENCE */
  volumeFora:1.00,
  volumeDentro:0.62,
  /* o abafamento de dentro de casa: corte do passa-baixas em Hz.
     Quanto mais fechado o lugar, mais grave sobra. */
  corteFechado:340,
  corteAberto:1500,
  /* o quanto cada lugar da casa é alcançado pela chuva, 0 a 1.
     É a mesma escala que governa som, partícula e janela. */
  exposicao:{
    fora:1.00,      /* rua, mapa, frente de casa: céu aberto */
    quintal:0.90,   /* id 8 */
    entrada:0.46,   /* id 7: porta de tábua, fresta embaixo */
    sotao:0.34,     /* id 0: telha na cabeça, mas fechado */
    sala:0.20,      /* id 4: janela grande */
    cozinha:0.20,   /* id 5: janela e a pia embaixo dela */
    quarto:0.15,    /* id 1: janela tapada com tábua */
    despensa:0.11,  /* id 2 */
    oficina:0.11,   /* id 3 */
    porao:0.04      /* id 6: nenhuma abertura pro céu */
  },
  naPorta:0.34,     /* somado quando você está com a porta aberta */
  porTabua:0.03,    /* cada reforço na porta abafa mais um tanto */
  /* visual */
  gotasMax:150,     /* no nível alto; os outros escalam por QUALIDADE */
  respingoMax:7,
  nevoaMax:0.16,    /* névoa na tempestade */
  janelaMax:0.55    /* o quanto a chuva aparece na janela, visto de dentro */
};

/* níveis de qualidade: mexem no que custa caro, não no que é o efeito */
const QUALIDADE_CHUVA={
  baixo:{gotas:0.28,respingo:0,  nevoa:0,   janela:0.5, escorre:false},
  medio:{gotas:0.55,respingo:0.5,nevoa:0.6, janela:0.8, escorre:false},
  alto: {gotas:1.00,respingo:1.0,nevoa:1.0, janela:1.0, escorre:true},
  ultra:{gotas:1.00,respingo:1.0,nevoa:1.0, janela:1.0, escorre:true}
};
function qualidadeChuva(){
  const q=(S.cfg&&S.cfg.qualidade)||'alto';
  return QUALIDADE_CHUVA[q]||QUALIDADE_CHUVA.alto;
}

/* ================= O ESTADO ================= */
const CH={
  montado:false,
  fonte:null,          /* a única fonte de som da chuva */
  mestre:null,         /* ganho geral: a intensidade mora aqui */
  aberto:null, fechado:null,   /* os dois caminhos do crossfade */
  lp:null,             /* o passa-baixas do caminho fechado */
  hs:null,             /* o brilho do caminho aberto */
  corpo:null, chiado:null,     /* as duas camadas da síntese */
  usandoArquivo:false,
  /* valores suavizados, pro visual acompanhar o áudio sem pulo */
  i:0, iAlvo:0,        /* intensidade */
  e:0, eAlvo:0,        /* exposição */
  ultimo:0
};

/* quanto está chovendo agora, 0 a 1 — a mesma conta pro som e pra tela */
function chuvaAlvo(){
  if(!S.chuva)return 0;
  if(S.clima==='tempestade')return 1;
  return 0.55;
}

/* o quanto a chuva te alcança onde você está */
function exposicaoAlvo(){
  const E=CHUVA.exposicao;
  const temCena=(typeof cena!=='undefined');
  const m=(temCena&&cena.modo)||'';
  /* de pé na porta aberta é o caso mais exposto de dentro de casa */
  if(m==='porta'||m==='olho')
    return trava(E.entrada+CHUVA.naPorta-((S.porta&&S.porta.reforco)||0)*CHUVA.porTabua,0,1);
  if(m==='rua'||m==='mapa'||m==='casafora')return E.fora;
  /* Quem diz onde você está é `cena.casa.voce`, não `cena.modo`.
     `irPara(id,true)` — o caminho que o próprio jogo usa pra entrar
     na casa sem animação — mexe no cômodo e NÃO mexe no modo, que
     continua 'vazio'. Amarrar a exposição ao modo deixava a chuva
     presa no valor inicial pra sempre, porque o ramo de escape
     devolvia o próprio valor atual: uma trava que nunca soltava. */
  const c=(temCena&&cena.casa)?cena.casa.voce:null;
  if(c==null)return E.fora;
  const porId=[E.sotao,E.quarto,E.despensa,E.oficina,E.sala,E.cozinha,E.porao,E.entrada,E.quintal];
  let v=porId[c]!=null?porId[c]:E.sala;
  if(c===7)v=trava(v-((S.porta&&S.porta.reforco)||0)*CHUVA.porTabua,0,1);
  return v;
}

/* ================= O SOM ================= */

/* A síntese de reserva. UMA fonte de ruído, duas camadas tiradas
   dela por filtro: o chiado das gotas e o corpo da massa de água.
   Intensidade move filtro e proporção, nunca troca de fonte — é o
   que faz chuva fraca virar forte sem nenhum corte. */
function chuvaSintese(destino){
  const s=ruidoS();
  const hp=AM.ctx.createBiquadFilter();
  hp.type='highpass'; hp.frequency.value=1900; hp.Q.value=.7;
  const gChiado=AM.ctx.createGain(); gChiado.gain.value=.55;
  s.connect(hp); hp.connect(gChiado); gChiado.connect(destino);

  const s2=ruidoS();
  const bp=AM.ctx.createBiquadFilter();
  bp.type='bandpass'; bp.frequency.value=430; bp.Q.value=.55;
  const gCorpo=AM.ctx.createGain(); gCorpo.gain.value=.22;
  s2.connect(bp); bp.connect(gCorpo); gCorpo.connect(destino);

  /* rajadas: a chuva não cai no mesmo volume por três minutos */
  const lfo=AM.ctx.createOscillator(), lg=AM.ctx.createGain();
  lfo.type='sine'; lfo.frequency.value=.062; lg.gain.value=.09;
  lfo.connect(lg); lg.connect(gChiado.gain);

  CH.chiado=gChiado; CH.corpo=gCorpo; CH.hpSint=hp;
  return [s,s2,lfo];
}

/* monta o grafo uma vez. Chamar de novo não faz nada: é a proteção
   contra dois controladores depois de recarregar cena. */
function chuvaMontar(){
  if(CH.montado)return true;
  if(typeof amLigar!=='function'||!amLigar())return false;
  const ctx=AM.ctx;

  CH.mestre=ctx.createGain(); CH.mestre.gain.value=0;

  /* --- caminho ABERTO: você está na chuva --- */
  CH.hs=ctx.createBiquadFilter();
  CH.hs.type='highshelf'; CH.hs.frequency.value=2600; CH.hs.gain.value=2.5;
  CH.aberto=ctx.createGain(); CH.aberto.gain.value=0;
  CH.mestre.connect(CH.hs); CH.hs.connect(CH.aberto);

  /* --- caminho FECHADO: você está abrigado --- */
  CH.lp=ctx.createBiquadFilter();
  CH.lp.type='lowpass'; CH.lp.frequency.value=CHUVA.corteFechado; CH.lp.Q.value=.6;
  CH.fechado=ctx.createGain(); CH.fechado.gain.value=0;
  CH.mestre.connect(CH.lp); CH.lp.connect(CH.fechado);

  /* os dois entram no canal de ambiente, que já tem o teto medido */
  amRota(CH.aberto,'AMBIENCE',{rev:.30});
  amRota(CH.fechado,'AMBIENCE',{rev:.55});   /* dentro de casa reverbera mais */

  CH.montado=true;
  chuvaBuscarArquivo();      /* decodifica antes da primeira chuva */
  return true;
}

/* liga a fonte. Só é chamada quando a chuva começa, e a fonte vive
   até a chuva acabar de verdade. */
function chuvaLigarFonte(){
  if(!chuvaMontar()||CH.fonte)return;
  /* a gravação embutida decodifica em milissegundos; esperar por ela
     evita começar na síntese e ter de trocar de fonte no meio — que é
     exatamente o corte que este bloco existe pra impedir */
  if(!_chuvaResolvida&&!AM.cache.has('chuva_arquivo'))return;
  const t=AM.ctx.currentTime;
  const buf=AM.cache.get('chuva_arquivo');
  if(buf){
    const s=AM.ctx.createBufferSource();
    s.buffer=buf; s.loop=true;
    if(CHUVA.laco){ s.loopStart=CHUVA.laco[0]; s.loopEnd=CHUVA.laco[1]; }
    s.connect(CH.mestre);
    s.start(t,CHUVA.laco?CHUVA.laco[0]:0);
    CH.fonte={nos:[s],arquivo:true};
    CH.usandoArquivo=true;
  }else{
    const nos=chuvaSintese(CH.mestre);
    nos.forEach(n=>{ try{n.start(t);}catch(e){} });
    CH.fonte={nos,arquivo:false};
    CH.usandoArquivo=false;
  }
}
function chuvaDesligarFonte(){
  if(!CH.fonte)return;
  const f=CH.fonte; CH.fonte=null;
  /* só corta quando o ganho JÁ chegou perto de zero de verdade.
     Confiar num prazo fixo era o erro: com a rampa exponencial o
     som ainda estava audível quando o prazo vencia. */
  const mestre=CH.mestre;
  const cortar=()=>{
    if(mestre&&mestre.gain.value>0.004)return setTimeout(cortar,250);
    f.nos.forEach(n=>{ try{n.stop();}catch(e){} });
  };
  setTimeout(cortar,300);
}

const CHUVA_EMBUTIDA='@@CHUVA@@';
let _chuvaBuscou=false, _chuvaResolvida=false;
function chuvaBuscarArquivo(){
  if(_chuvaBuscou||AM.cache.has('chuva_arquivo'))return;
  _chuvaBuscou=true;
  const pegar=url=>fetch(url).then(r=>r.ok?r.arrayBuffer():Promise.reject(0))
    .then(ab=>AM.ctx.decodeAudioData(ab));
  /* `audio/chuva.mp3` vence a embutida: é o caminho de troca sem
     recompilar. Não existir é a condição normal, não é erro. */
  pegar(AM.base+CHUVA.arquivo)
    .catch(()=>pegar(CHUVA_EMBUTIDA))
    .then(buf=>{ if(buf)AM.cache.set('chuva_arquivo',buf); _chuvaResolvida=true; })
    .catch(()=>{ _chuvaResolvida=true; });
}

/* ================= O PULSO =================
   Um único lugar decide tudo. Roda a cada 250 ms: barato, e rápido o
   bastante pra atravessar uma porta sem degrau. */
function chuvaAtualizar(){
  if(!chuvaMontar())return;
  const agora=AM.ctx.currentTime;
  const dt=CH.ultimo?Math.min(1,agora-CH.ultimo):0.25;
  CH.ultimo=agora;

  CH.iAlvo=chuvaAlvo();
  CH.eAlvo=exposicaoAlvo();

  /* liga e desliga a fonte pelas bordas, não pelo nível */
  if(CH.iAlvo>0&&!CH.fonte)chuvaLigarFonte();
  if(CH.iAlvo<=0&&CH.fonte&&CH.i<0.02)chuvaDesligarFonte();

  /* Suavização exponencial, com `tempo*` valendo como CONSTANTE DE
     TEMPO de verdade (63% do caminho em um `tempo`). Dividir por 3
     aqui, como estava, fazia a exposição andar 68% por pulso: quem
     atravessasse a porta rápido levava o degrau inteiro na cara, que
     é exatamente o que o pedido manda evitar. */
  const ki=1-Math.exp(-dt/CHUVA.tempoIntensidade);
  const ke=1-Math.exp(-dt/CHUVA.tempoExposicao);
  CH.i+=(CH.iAlvo-CH.i)*ki;
  CH.e+=(CH.eAlvo-CH.e)*ke;
  if(Math.abs(CH.iAlvo-CH.i)<.002)CH.i=CH.iAlvo;
  if(Math.abs(CH.eAlvo-CH.e)<.002)CH.e=CH.eAlvo;

  if(!CH.fonte&&CH.i<=0.001)return;

  /* Os parâmetros seguem o valor JÁ SUAVIZADO (`CH.i`, `CH.e`), com
     uma rampa do tamanho de um pulso — e não o alvo cru com uma
     rampa longa. A diferença não é cosmética: reemitir uma rampa de
     2,4 s a cada 250 ms faz o parâmetro andar só 10% do caminho por
     pulso, então o ganho ficava muito atrás de `CH.i`. Na prática o
     som ainda estava em 0,20 quando a lógica já considerava a chuva
     parada — e a fonte era desligada audível, produzindo justamente
     o corte que este bloco existe pra impedir. Assim áudio e visual
     leem o mesmo número e chegam juntos. */
  const t=agora, tv=0.26;
  const suave=(par,v)=>{
    par.cancelScheduledValues(t);
    par.setValueAtTime(par.value,t);
    par.linearRampToValueAtTime(v,t+tv);
  };

  /* intensidade: um ganho só, sem trocar de fonte */
  suave(CH.mestre.gain, CH.i);

  /* crossfade aberto/fechado com potência constante: somando os dois
     em rampa linear o meio do caminho ficaria 3 dB fundo, e é
     exatamente isso que se ouve como "buraco" ao passar pela porta */
  const e=trava(CH.e,0,1);
  const ang=e*Math.PI/2;
  suave(CH.aberto.gain, Math.sin(ang)*CHUVA.volumeFora);
  suave(CH.fechado.gain, Math.cos(ang)*CHUVA.volumeDentro);

  /* o abafamento acompanha: quanto mais exposto, mais agudo passa */
  suave(CH.lp.frequency,
    CHUVA.corteFechado+(CHUVA.corteAberto-CHUVA.corteFechado)*e);

  /* a síntese engrossa com a intensidade: mais corpo, menos chiado
     puro — chuva forte tem massa de água, não só barulho agudo */
  if(!CH.usandoArquivo&&CH.corpo){
    suave(CH.corpo.gain, .10+.34*CH.i);
    suave(CH.chiado.gain, .38+.26*CH.i);
    if(CH.hpSint)suave(CH.hpSint.frequency, 2300-700*CH.i);
  }

  /* a calha é camada, não fonte concorrente: só existe com chuva, e
     mais presente de dentro de casa, que é onde se ouve a calha */
  if(typeof amLoop==='function'){
    const calha=CH.iAlvo>0?trava(.30+.45*CH.iAlvo,0,1)*(1-e*.55):0;
    amLoop('calha_agua',calha);
  }
}

/* ---------- o diretor de ambiente para de mexer na chuva ----------
   Sem isto seriam dois donos: o `amAmbiente` ligando e desligando
   `chuva_leve`/`chuva_pesada` por conta própria, e este bloco. Duas
   fontes do mesmo som, fora de fase — exatamente o que o pedido
   proíbe. Aqui os dois leitos antigos ficam permanentemente em zero
   e a chuva inteira passa a sair daqui. */
if(typeof amAmbiente==='function'){
  const _amb=amAmbiente;
  window.amAmbiente=function(){
    const r=_amb.apply(this,arguments);
    try{
      amLoop('chuva_leve',0);
      amLoop('chuva_pesada',0);
      chuvaAtualizar();
    }catch(e){}
    return r;
  };
}

/* pulso próprio: o do AudioManager é de 2 s, lento demais pra
   atravessar uma porta sem degrau */
let _chuvaPulso=null;
function chuvaComecar(){
  if(_chuvaPulso)return;                 /* nunca dois controladores */
  _chuvaPulso=setInterval(()=>{ try{chuvaAtualizar();}catch(e){} },250);
}
if(typeof iniciarAudio==='function'){
  const _ia=iniciarAudio;
  window.iniciarAudio=function(){
    const r=_ia.apply(this,arguments);
    try{ chuvaComecar(); }catch(e){}
    return r;
  };
}
/* trocar de cômodo atualiza na hora, sem esperar o pulso */
if(typeof irPara==='function'){
  const _ir=irPara;
  window.irPara=function(){
    const r=_ir.apply(this,arguments);
    queueMicrotask(()=>{ try{chuvaAtualizar();}catch(e){} });
    return r;
  };
}

/* ---------- pausa e retomada ----------
   Aba escondida suspende o contexto em alguns navegadores. Ao voltar,
   o valor dos ganhos continua onde estava: como nada foi parado, não
   há o que reiniciar — só garantimos que o pulso volte a bater. */
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){
    CH.ultimo=0;                          /* não conta o tempo parado como dt */
    try{ chuvaAtualizar(); }catch(e){}
  }
});

/* ---------- salvar e carregar ----------
   A chuva sai de `S.clima`, que o v48 já salva. Então carregar um
   jogo com tempestade devolve tempestade. O que NÃO pode acontecer é
   o áudio entrar de uma vez: no carregamento a intensidade parte do
   zero e sobe pela mesma rampa de sempre. */
if(typeof carregar==='function'){
  const _car=carregar;
  window.carregar=function(){
    const r=_car.apply(this,arguments);
    CH.i=0; CH.e=exposicaoAlvo(); CH.ultimo=0;
    try{ chuvaAtualizar(); }catch(e){}
    return r;
  };
}

/* ================= O VISUAL, DO MESMO NÚMERO =================
   O `desenharChuva` do v48 tinha 110 gotas fixas, sempre iguais, sem
   vento e sem relação nenhuma com o volume. Agora a densidade, a
   inclinação e o respingo saem de `CH.i`, o mesmo valor que manda no
   ganho — chuva forte na tela é chuva forte no ouvido, por
   construção. */
let _ventoChuva=0, _ventoAlvo=0;
const _chuvaAntiga=(typeof desenharChuva==='function')?desenharChuva:null;
desenharChuva=function(w,h,t,forca){
  const i=forca!=null?Math.max(CH.i,forca?1:0):CH.i;
  if(i<=0.01)return;
  const Q=qualidadeChuva();

  /* vento: muda devagar e nunca dá salto — o pedido é explícito */
  if(Math.random()<.006)_ventoAlvo=(Math.random()*2-1)*(.6+.5*i);
  _ventoChuva+=(_ventoAlvo-_ventoChuva)*.012;

  const n=Math.round(CHUVA.gotasMax*Q.gotas*(.35+.65*i));
  if(!_pingos||_pingos.length<n){
    _pingos=_pingos||[];
    while(_pingos.length<n)_pingos.push({
      x:Math.random(),y:Math.random(),v:.55+Math.random()*.9,
      l:.04+Math.random()*.09,o:.10+Math.random()*.28,
      f:.6+Math.random()*.8            /* profundidade: gota longe é menor e mais lenta */
    });
  }
  CX.lineCap='round';
  for(let k=0;k<n;k++){
    const p=_pingos[k]; if(!p)break;
    if(p.f==null)p.f=1;
    p.y+=(p.v*p.f*(.55+.75*i))/60;
    if(p.y>1.05){p.y=-.05;p.x=Math.random();}
    const alfa=p.o*(.45+.55*i)*p.f;
    CX.strokeStyle='rgba(180,200,225,'+alfa.toFixed(3)+')';
    CX.lineWidth=Math.max(.7,w*.0022*p.f);
    const dx=(-.012+_ventoChuva*.045)*w;
    CX.beginPath();
    CX.moveTo(p.x*w,p.y*h);
    CX.lineTo(p.x*w+dx,(p.y+p.l*p.f)*h);
    CX.stroke();
  }
  /* respingo no chão: quantidade pela intensidade e pela qualidade */
  const nr=Math.round(CHUVA.respingoMax*Q.respingo*i);
  for(let k=0;k<nr;k++){
    const x=Math.random()*w,y=h*(.86+Math.random()*.12);
    CX.strokeStyle='rgba(180,200,225,'+(.10+.08*i).toFixed(3)+')';
    CX.lineWidth=1;
    CX.beginPath();CX.ellipse(x,y,w*.012*Math.random(),h*.004,0,0,7);CX.stroke();
  }
  /* névoa: só na chuva forte, e só se a qualidade permitir */
  if(Q.nevoa>0&&i>.6){
    CX.fillStyle='rgba(150,165,185,'+(CHUVA.nevoaMax*Q.nevoa*(i-.6)/.4*.5).toFixed(3)+')';
    CX.fillRect(0,0,w,h);
  }
  CX.lineCap='butt';
};

/* ---------- a chuva vista de dentro ----------
   Dentro de casa a gota não pode atravessar o teto — e não atravessa,
   porque quem desenha por dentro é só isto aqui: a água escorrendo no
   VIDRO da janela do cômodo, no lugar onde a janela está desenhada.
   É o que faz a chuva ser percebida de dentro sem nenhuma partícula
   dentro do cômodo. */
const JANELA_DO_COMODO={
  0:[.72,.34,.22,.20],   /* sótão */
  1:[.75,.38,.26,.28],   /* quarto, janela tapada: só fresta */
  4:[.78,.40,.30,.30],   /* sala */
  5:[.74,.36,.28,.26],   /* cozinha */
  7:[.50,.42,.34,.34]    /* entrada: a fresta da porta */
};
function chuvaNaJanela(w,h,t){
  if(CH.i<=.02)return;
  const c=(typeof cena!=="undefined"&&cena.casa)?cena.casa.voce:-1;
  const j=JANELA_DO_COMODO[c];
  if(!j)return;                        /* porão, oficina, despensa: sem céu */
  const Q=qualidadeChuva();
  if(Q.janela<=0)return;
  const x=j[0]*w,y=j[1]*h,jw=j[2]*w,jh=j[3]*h;
  CX.save();
  CX.beginPath();CX.rect(x-jw/2,y-jh/2,jw,jh);CX.clip();
  /* o cinza do tempo lá fora */
  CX.fillStyle='rgba(120,140,165,'+(.10*CH.i*Q.janela).toFixed(3)+')';
  CX.fillRect(x-jw/2,y-jh/2,jw,jh);
  /* fios de água descendo o vidro */
  const n=Math.round(7*CH.i*Q.janela*(Q.escorre?1:.5));
  for(let k=0;k<n;k++){
    const fx=x-jw/2+((k*0.37+((t*(.05+.03*(k%3)))%1))%1)*jw;
    const fy=((t*(.12+.05*(k%4))+k*.31)%1)*jh;
    CX.strokeStyle='rgba(190,210,235,'+(CHUVA.janelaMax*.35*CH.i*Q.janela).toFixed(3)+')';
    CX.lineWidth=Math.max(1,w*.0016);
    CX.beginPath();
    CX.moveTo(fx,y-jh/2+fy);
    CX.lineTo(fx-w*.004,y-jh/2+Math.min(jh,fy+jh*.16));
    CX.stroke();
  }
  CX.restore();
}

/* ---------- pendura no laço de desenho ----------
   `desenharCasa` desenha o cômodo; a janela molhada entra depois
   dele e antes do acabamento, então fica por baixo da vinheta e do
   grão, como o resto da cena. */
if(typeof desenharCasa==='function'){
  const _dc=desenharCasa;
  desenharCasa=function(w,h,t){
    const r=_dc.apply(this,arguments);
    try{ chuvaNaJanela(w,h,t); }catch(e){}
    return r;
  };
}

/* ---------- leitura de estado, pro resto do jogo e pros testes ---------- */
function chuvaEstado(){
  return {
    intensidade:+CH.i.toFixed(3), intensidadeAlvo:+CH.iAlvo.toFixed(3),
    exposicao:+CH.e.toFixed(3),   exposicaoAlvo:+CH.eAlvo.toFixed(3),
    fonte:CH.fonte?(CH.usandoArquivo?'mp3':'sintese'):'parada',
    fontes:CH.fonte?CH.fonte.nos.length:0,
    ganho:CH.mestre?+CH.mestre.gain.value.toFixed(4):0,
    aberto:CH.aberto?+CH.aberto.gain.value.toFixed(4):0,
    fechado:CH.fechado?+CH.fechado.gain.value.toFixed(4):0,
    corte:CH.lp?Math.round(CH.lp.frequency.value):0,
    qualidade:(S.cfg&&S.cfg.qualidade)||'alto'
  };
}
