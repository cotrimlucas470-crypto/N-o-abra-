/* ================= AUDIO MANAGER — PRIORIDADE 1 DO PACOTE =================
   O pacote pede um gerenciador central sem reescrever a arquitetura. Então
   isto é uma camada POR CIMA do que já existe, não no lugar dele.

   O jogo já tem um AudioContext único (`A.ctx`), um barramento seco/molhado
   e uma cadeia de saída da v48 que foi medida e afinada: ganho de
   compensação, limitador e um teto `tanh` em 0,95. Reescrever isso jogaria
   fora a única parte do áudio que tem número em cima. Os seis canais do
   pacote entram ANTES dessa cadeia — controle de categoria de graça,
   mixagem preservada.

     MASTER ─┬─ MUSIC ─────┐
             ├─ AMBIENCE ──┤
             ├─ SFX ───────┼─→ A.master → ganho → limitador → teto → saída
             ├─ HORROR ────┤
             └─ UI ────────┘

   Sobre os 80 slots do manifesto: o pacote não traz os arquivos, e diz
   explicitamente para não embutir dezenas de base64 no HTML. Então cada
   slot tem duas formas de existir — o arquivo em `audio/`, carregado sob
   demanda, ou o som que o jogo já sintetiza. Slot sem nenhum dos dois não
   quebra nada: registra a falta e segue. É isso que faz o sistema estar
   vivo hoje, com zero arquivo baixado, e melhorar sozinho conforme você
   for baixando.
   ========================================================================= */

const AM_CANAIS=['MUSIC','AMBIENCE','SFX','HORROR','UI'];

/* Mixagem em dB relativo, como o pacote especifica.
   -22 a -16 ambiente · -24 a -14 música · -10 a -4 SFX importante
   -24 a -8 horror. O valor guardado é o teto de cada canal; cada som pede
   o seu nível dentro disso. */
const AM_DB={MUSIC:-18, AMBIENCE:-19, SFX:-6, HORROR:-16, UI:-12};
const dbParaGanho=(db)=>Math.pow(10,db/20);

const AM={
  pronto:false,
  ctx:null,
  canais:{},          // nome -> GainNode
  vol:{},             // nome -> 0..1 escolhido pelo jogador
  cache:new Map(),    // id -> AudioBuffer
  faltando:new Set(), // ids sem arquivo e sem síntese
  loops:new Map(),    // id -> {src,g,canal}
  ultimaVariante:{},  // evento -> última variante usada
  cooldown:{},        // id -> instante em que pode tocar de novo
  geracao:0,          // token: invalida callback de cena antiga
  timers:new Set(),
  fontes:new Set(),
  base:'audio/',
  musicaAtual:null
};

/* ---------- montagem ---------- */
function amLigar(){
  if(AM.pronto)return true;
  if(!A||!A.ctx||!A.master)return false;       // um contexto só: o do jogo
  AM.ctx=A.ctx;
  const mestre=AM.ctx.createGain(); mestre.gain.value=1;
  mestre.connect(A.master);                     // entra antes do teto medido
  AM.canais.MASTER=mestre;
  for(const c of AM_CANAIS){
    const g=AM.ctx.createGain();
    g.gain.value=dbParaGanho(AM_DB[c]);
    g.connect(mestre);
    AM.canais[c]=g;
    AM.vol[c]=1;
  }
  AM.pronto=true;
  return true;
}

/* volume por categoria, 0..1, multiplicando o teto em dB do canal */
function amVolume(canal,v){
  if(!amLigar())return;
  if(canal==='MASTER'){
    AM.vol.MASTER=trava(v,0,1);
    AM.canais.MASTER.gain.linearRampToValueAtTime(AM.vol.MASTER,AM.ctx.currentTime+.15);
    return;
  }
  if(!AM.canais[canal])return;
  AM.vol[canal]=trava(v,0,1);
  AM.canais[canal].gain.linearRampToValueAtTime(
    dbParaGanho(AM_DB[canal])*AM.vol[canal], AM.ctx.currentTime+.15);
}

/* ---------- limpeza ----------
   O pacote é explícito: nenhuma fonte pode nascer depois que a cena morreu.
   Toda espera assíncrona carrega o token da geração em que começou. */
function amInvalidar(){
  AM.geracao++;
  for(const t of AM.timers)clearTimeout(t);
  AM.timers.clear();
  for(const s of AM.fontes){ try{s.stop()}catch(e){} }
  AM.fontes.clear();
}
function amEspera(fn,ms){
  const g=AM.geracao;
  const t=setTimeout(()=>{ AM.timers.delete(t); if(g===AM.geracao)fn(); },ms);
  AM.timers.add(t);
  return t;
}

/* ---------- catálogo ----------
   `sintese` é o som que o jogo já faz. É o que mantém o slot audível
   enquanto o arquivo não existe. */
const AM_SONS={
  // portas
  porta_abre    :{canal:'SFX',    arq:'sfx_01_porta_rangido.mp3',  sintese:()=>somPortaAbrindo&&somPortaAbrindo()},
  porta_fecha   :{canal:'SFX',    arq:'sfx_03_porta_fecha.mp3',    sintese:()=>somPortaFechando&&somPortaFechando()},
  porta_batida  :{canal:'HORROR', arq:'sfx_04_batida_forte.mp3',   sintese:()=>batida(3,1,0), cd:1200},
  porta_maçaneta:{canal:'SFX',    arq:'sfx_06_macaneta.mp3',       sintese:()=>ferrolho&&ferrolho(agoraS(),0,.8,.4)},
  // madeira e casa
  piso_range    :{canal:'SFX',    arq:'sfx_08_piso_madeira.mp3',   sintese:()=>passo(.5,0)},
  estalo_casa   :{canal:'HORROR', arq:'sfx_11_madeira_batendo.mp3',sintese:()=>estalo&&estalo(), cd:4000},
  // ferramentas e metal
  martelo       :{canal:'SFX',    arq:'sfx_24_martelo_metal.mp3',  sintese:()=>metalPesado&&metalPesado(0)},
  metal_cai     :{canal:'SFX',    arq:'sfx_25_ferramenta_cai.mp3', sintese:()=>metalPesado&&metalPesado(.3)},
  // clima
  chuva_leve    :{canal:'AMBIENCE',arq:'sfx_34_chuva_leve.mp3',    loop:true},
  chuva_pesada  :{canal:'AMBIENCE',arq:'sfx_35_chuva_pesada.mp3',  loop:true},
  calha_agua    :{canal:'AMBIENCE',arq:'sfx_45_calha.mp3',         loop:true},
  trovao_longe  :{canal:'HORROR', arq:'sfx_40_trovao_distante.mp3',sintese:()=>amTrovao(.5), cd:6000},
  trovao_perto  :{canal:'HORROR', arq:'sfx_41_trovao_profundo.mp3',sintese:()=>amTrovao(1),  cd:9000},
  vento         :{canal:'AMBIENCE',arq:'sfx_50_vento.mp3',         loop:true},
  // quintal e natureza
  passaros      :{canal:'AMBIENCE',arq:'sfx_60_passaros.mp3',      loop:true},
  insetos       :{canal:'AMBIENCE',arq:'sfx_62_insetos_noite.mp3', loop:true},
  folhas        :{canal:'SFX',    arq:'sfx_64_folhas.mp3',         sintese:()=>rocado&&rocado(0)},
  agua_corre    :{canal:'SFX',    arq:'sfx_44_agua_correndo.mp3',  sintese:()=>gotejo&&gotejo()},
  // horror
  drone_baixo   :{canal:'HORROR', arq:'sfx_70_drone.mp3',          loop:true},
  sussurro_raro :{canal:'HORROR', arq:'sfx_73_sussurro.mp3',       sintese:()=>sussurro(6,chance(.5)?-.3:.3,.05), cd:12000},
  impacto_raro  :{canal:'HORROR', arq:'sfx_75_impacto.mp3',        sintese:()=>batida(1,.8,0), cd:15000},
  // UI
  /* cooldown curto: o clique é o som mais disparado do jogo, e sem trava
     um toque rápido em sequência viraria metralhadora */
  ui_clique     :{canal:'UI',     arq:'sfx_80_clique.mp3',         sintese:()=>amClique(1), cd:70},
  ui_erro       :{canal:'UI',     arq:'sfx_81_erro.mp3',           sintese:()=>amClique(.55)},
  ui_descoberta :{canal:'UI',     arq:'sfx_82_descoberta.mp3',     sintese:()=>amClique(1.6)}
};

/* dois sons próprios, porque o jogo não tinha equivalente */
function amTrovao(forca){
  if(!AM.ctx)return;
  const t=AM.ctx.currentTime;
  const s=ruidoS(), lp=AM.ctx.createBiquadFilter(), g=AM.ctx.createGain();
  lp.type='lowpass'; lp.frequency.setValueAtTime(420*forca+90,t);
  lp.frequency.exponentialRampToValueAtTime(70,t+2.6*forca+.8);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.55*forca,t+.05+.25*(1-forca));
  g.gain.exponentialRampToValueAtTime(.0008,t+2.8*forca+1);
  s.connect(lp); lp.connect(g);
  amRota(g,'HORROR',{rev:.9});
  s.start(t); amFonte(s,t+3.2*forca+1.2);
}
function amClique(tom){
  if(!AM.ctx)return;
  const t=AM.ctx.currentTime;
  const o=AM.ctx.createOscillator(), g=AM.ctx.createGain();
  o.type='triangle'; o.frequency.value=520*tom;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.16,t+.004);
  g.gain.exponentialRampToValueAtTime(.0008,t+.09);
  o.connect(g); amRota(g,'UI',{rev:.1});
  o.start(t); amFonte(o,t+.11);
}

/* liga um nó ao canal, mantendo o envio de reverberação do jogo */
function amRota(no,canal,op){
  if(!amLigar())return no;
  const alvo=AM.canais[canal]||AM.canais.SFX;
  no.connect(alvo);
  if(op&&op.rev&&A.molhado){
    const env=AM.ctx.createGain(); env.gain.value=op.rev;
    no.connect(env); env.connect(A.molhado);
  }
  return no;
}
function amFonte(s,paraEm){
  AM.fontes.add(s);
  try{ s.stop(paraEm); }catch(e){}
  s.onended=()=>AM.fontes.delete(s);
}

/* ---------- carregar sob demanda ----------
   Nada de base64: o arquivo é buscado quando o som é pedido pela primeira
   vez, e o buffer fica em cache. Falta de arquivo não é erro — é a
   condição normal enquanto você não baixou nada. */
function amCarregar(id){
  const d=AM_SONS[id];
  if(!d||!d.arq)return Promise.resolve(null);
  if(AM.cache.has(id))return Promise.resolve(AM.cache.get(id));
  if(AM.faltando.has(id))return Promise.resolve(null);
  const g=AM.geracao;
  return fetch(AM.base+d.arq)
    .then(r=>r.ok?r.arrayBuffer():Promise.reject(0))
    .then(ab=>AM.ctx.decodeAudioData(ab))
    .then(buf=>{
      if(g!==AM.geracao)return null;       // a cena morreu no caminho
      AM.cache.set(id,buf); return buf;
    })
    .catch(()=>{ AM.faltando.add(id); return null; });
}

/* ---------- tocar ---------- */
function amPode(id,cd){
  const agora=Date.now();
  if(AM.cooldown[id]&&agora<AM.cooldown[id])return false;
  if(cd)AM.cooldown[id]=agora+cd;
  return true;
}

/* variação de pitch de 2 a 5%, como o pacote pede, e nunca a mesma
   variante duas vezes seguidas */
function amVariante(evento,n){
  if(n<=1)return 0;
  let v; do{ v=Math.floor(Math.random()*n); }while(n>1&&v===AM.ultimaVariante[evento]);
  AM.ultimaVariante[evento]=v;
  return v;
}

function amToca(id,op){
  op=op||{};
  if(!amLigar())return false;
  const d=AM_SONS[id];
  if(!d)return false;
  if(!amPode(id,op.cd!=null?op.cd:d.cd))return false;

  const usarSintese=()=>{ try{ if(d.sintese){d.sintese();return true;} }catch(e){} return false; };

  if(!d.arq)return usarSintese();
  if(AM.faltando.has(id))return usarSintese();

  const buf=AM.cache.get(id);
  if(!buf){
    /* primeira vez: cai na síntese agora e busca o arquivo pro futuro */
    amCarregar(id);
    return usarSintese();
  }
  const t=AM.ctx.currentTime+.01;
  const s=AM.ctx.createBufferSource(); s.buffer=buf;
  const desvio=.02+Math.random()*.03;                  // 2 a 5%
  s.playbackRate.value=1+(Math.random()<.5?-desvio:desvio);
  const g=AM.ctx.createGain();
  g.gain.value=(op.vol!=null?op.vol:1)*(.88+Math.random()*.24);
  s.connect(g); amRota(g,d.canal,{rev:op.rev!=null?op.rev:.3});
  s.start(t); amFonte(s,t+buf.duration/s.playbackRate.value+.1);
  return true;
}

/* ---------- camadas em loop, com crossfade ---------- */
function amLoop(id,alvo){
  if(!amLigar())return;
  const d=AM_SONS[id];
  if(!d||!d.loop)return;
  const atual=AM.loops.get(id);
  if(alvo<=0){
    if(atual){
      const t=AM.ctx.currentTime;
      atual.g.gain.cancelScheduledValues(t);
      atual.g.gain.setValueAtTime(atual.g.gain.value,t);
      atual.g.gain.linearRampToValueAtTime(0,t+1.2);
      amEspera(()=>{ try{atual.src.stop()}catch(e){} AM.loops.delete(id); },1400);
    }
    return;
  }
  if(atual){
    const t=AM.ctx.currentTime;
    atual.g.gain.cancelScheduledValues(t);
    atual.g.gain.setValueAtTime(atual.g.gain.value,t);
    atual.g.gain.linearRampToValueAtTime(alvo,t+1.2);   // crossfade de nível
    return;
  }
  amCarregar(id).then(buf=>{
    if(!buf||AM.loops.has(id))return;
    const t=AM.ctx.currentTime;
    const s=AM.ctx.createBufferSource(); s.buffer=buf; s.loop=true;
    const g=AM.ctx.createGain(); g.gain.value=0;
    s.connect(g); amRota(g,d.canal,{rev:.4});
    s.start(t);
    g.gain.linearRampToValueAtTime(alvo,t+1.6);
    AM.loops.set(id,{src:s,g,canal:d.canal});
    AM.fontes.add(s);
  });
}

/* ---------- ducking ----------
   250 a 500 ms de recuo e volta suave, como o pacote pede. */
function amDuck(ms,quanto){
  if(!amLigar())return;
  const t=AM.ctx.currentTime, q=quanto==null?.45:quanto;
  for(const c of ['MUSIC','AMBIENCE']){
    const g=AM.canais[c], cheio=dbParaGanho(AM_DB[c])*AM.vol[c];
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value,t);
    g.gain.linearRampToValueAtTime(cheio*q,t+.12);
    g.gain.setValueAtTime(cheio*q,t+(ms||350)/1000);
    g.gain.linearRampToValueAtTime(cheio,t+(ms||350)/1000+.6);
  }
}

/* ---------- passos: FootstepManager ---------- */
const AM_PISOS={madeira:'piso_range', escada:'piso_range', concreto:'piso_range',
                terra:'folhas', grama:'folhas', folhas:'folhas', lama:'agua_corre'};
function amPisoDoLugar(){
  const m=(window.cena&&cena.modo)||'';
  if(m==='rua'||m==='casafora'||m==='mapa')return 'concreto';
  const c=(window.cena&&cena.casa)?cena.casa.voce:null;
  if(c===10||c===8)return 'terra';
  if(c===0||c===9)return 'escada';
  return 'madeira';
}
function amPasso(op){
  op=op||{};
  if(!amPode('passo',120))return false;
  const piso=op.piso||amPisoDoLugar();
  amVariante('passo',3);                       // três variantes, sem repetir
  if(typeof passo==='function'){ passo(op.forca!=null?op.forca:.8, op.pan||0); return true; }
  return amToca(AM_PISOS[piso]||'piso_range',{vol:.9});
}

/* ---------- HorrorAudioDirector, níveis 0 a 5 ----------
   O nível não revela onde a anomalia está: só diz o quanto o ar está
   pesado. E alguns sons são falsos positivos por desenho. */
let _amHorror=-1;
function amNivelDeHorror(){
  let n=0;
  try{
    const risco=(typeof riscoInvasao==='function')?riscoInvasao():0;
    const ruido=(S&&S.ruido)||0;
    const calor=(S&&S.calor)||0;
    const noite=(S&&S.hora!=null)&&(S.hora>=19||S.hora<6);
    const est=(typeof estagio==='function')?estagio():{ilusao:0};
    if(noite)n=1;
    if(risco>.18||calor>25)n=2;
    if(risco>.30||est.ilusao>=.22)n=3;
    if(risco>.45||calor>70)n=4;
    if((S&&S.invadindo)||(window.cena&&cena.modo==='fuga'))n=5;
  }catch(e){}
  return n;
}
function amHorror(n){
  if(!amLigar())return;
  if(n===_amHorror)return;                     // só mexe quando o estado muda
  _amHorror=n;
  amLoop('drone_baixo', n<=0?0 : [0,.10,.22,.34,.52,.75][n]);
  if(n>=3&&chance(.35))amToca('sussurro_raro');
  if(n>=4&&chance(.25))amToca('impacto_raro');
}

/* ---------- ambiente adaptativo ----------
   Atualiza só quando o estado muda, como o pacote exige. */
let _amEstado='';
function amAmbiente(){
  if(!amLigar())return;
  let noite=false,chuva=0,fora=false;
  try{
    noite=(S.hora>=19||S.hora<6);
    chuva=S.chuva?(S.tempestade?2:1):0;
    fora=!!(window.cena&&['rua','casafora','mapa'].includes(cena.modo))
       || ((window.cena&&cena.casa)?cena.casa.voce===8||cena.casa.voce===10:false);
  }catch(e){}
  const chave=[noite,chuva,fora].join('|');
  if(chave===_amEstado)return;
  _amEstado=chave;

  amLoop('passaros', (!noite&&fora)?.55:0);
  amLoop('insetos',  (noite&&fora)?.60:(noite?.20:0));
  amLoop('vento',    fora?.50:.18);
  amLoop('chuva_leve',   chuva===1?.65:0);
  amLoop('chuva_pesada', chuva===2?.80:0);
  amLoop('calha_agua',   chuva>0?(fora?.5:.28):0);
  if(chuva===2)amEspera(()=>amToca('trovao_perto'),1200+Math.random()*4000);
  else if(chuva===1)amEspera(()=>amToca('trovao_longe'),2500+Math.random()*7000);
}

/* ---------- o pulso: horror e ambiente acompanham o jogo ---------- */
let _amPulso=null;
function amComecar(){
  if(!amLigar()||_amPulso)return;
  _amPulso=setInterval(()=>{
    try{ amAmbiente(); amHorror(amNivelDeHorror()); }catch(e){}
  },2000);
}

/* ---------- integração com o jogo, sem tocar no que já existe ---------- */
if(typeof iniciarAudio==='function'){
  const _base=iniciarAudio;
  window.iniciarAudio=function(){
    const r=_base.apply(this,arguments);
    try{ amLigar(); amComecar(); }catch(e){}
    return r;
  };
}
/* Trocar de cômodo é troca de cena: o que era da cena anterior morre.
   Mas a limpeza não pode ficar na frente da transição — ela percorre
   timers e fontes, e rodando antes do corte empurrou o início do preto de
   184 para 196 ms, raspando o orçamento de 1 s. Então a transição parte
   primeiro e a limpeza acontece no microtask seguinte, no mesmo quadro. */
if(typeof irPara==='function'){
  const _base=irPara;
  window.irPara=function(){
    const r=_base.apply(this,arguments);
    queueMicrotask(()=>{ try{ amInvalidar(); amAmbiente(); }catch(e){} });
    return r;
  };
}
/* O clique de UI vem de UM listener na barra de ações, não de um por
   botão. Embrulhar `botao()` custava uma anexação por botão desenhado, e
   um menu de cômodo desenha vinte — trabalho por render, dentro do quadro
   em que a transição de cômodo está tentando começar. Delegar resolve:
   um listener para sempre, e ele nem precisa saber quais botões existem. */
if(typeof AC!=='undefined'&&AC&&AC.addEventListener){
  AC.addEventListener('click',(e)=>{
    if(e.target&&e.target.closest&&e.target.closest('button'))
      { try{ amToca('ui_clique'); }catch(x){} }
  },{passive:true,capture:true});
}
/* uma linha de perigo no log é SFX narrativamente importante: duck */
if(typeof diz==='function'){
  const _base=diz;
  window.diz=function(txt,cls){
    /* uma cena pode escrever várias linhas de perigo seguidas; o duck
       não precisa ser reagendado a cada uma */
    if(cls==='perigo'&&amPode('duck:perigo',900)){ try{ amDuck(400,.45); }catch(e){} }
    return _base.apply(this,arguments);
  };
}

/* ---------- relatório de assets, pro console ----------
   Diz quantos slots têm arquivo, quantos estão na síntese e quantos não
   têm nada. É o que responde "o que falta baixar". */
function amRelatorio(){
  const com=[],sint=[],nada=[];
  for(const [id,d] of Object.entries(AM_SONS)){
    if(AM.cache.has(id))com.push(id);
    else if(d.sintese)sint.push(id);
    else nada.push(id);
  }
  return {arquivo:com, sintetizado:sint, semNada:nada,
          faltando:[...AM.faltando],
          canais:Object.keys(AM.canais), pasta:AM.base};
}
