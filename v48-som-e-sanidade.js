/* ================= v48 — O SOM MENTE =================
   Duas coisas num bloco só.

   PARTE A: o motor de áudio (gerador, porta, passos, casa quieta).
   PARTE B: a sanidade deixa de mentir só no texto e passa a mentir
            no ouvido. O jogo é sobre vozes imitadas — mas até agora
            a loucura só acontecia em número e em letra dobrada.

   Este bloco é aditivo: redefine funções por cima das que já existem
   e não exige apagar nada.
   ===================================================== */

/* =====================================================
   PARTE A — MOTOR DE ÁUDIO
   ===================================================== */

const SOM = window.SOM = {
  gerador  : { vol:.085, pan:-.22, rev:.26, rpm:29, engasgo:true },
  casa     : { vento:.045, inquietacao:.25 },
  porta    : { vol:.9 },
  passos   : { vol:1.30, superficie:'madeira' },
  transicao: { escuro:1000, fade:280 },
  mental   : { vol:1 }
};

function somOk(){
  if(!A.ctx||!A.ruido)return false;
  if(A.ctx.state==='suspended'){
    try{ const r=A.ctx.resume(); if(r&&r.catch) r.catch(()=>{}); }catch(e){}
  }
  return true;
}
function agoraS(){ return A.ctx.currentTime; }
function ruidoS(){ const s=A.ctx.createBufferSource(); s.buffer=A.ruido; s.loop=true; return s; }
function lfoS(f){ const o=A.ctx.createOscillator(); o.type='sine'; o.frequency.value=f; return o; }
function ligaS(fonte,destino,ganho){
  const g=A.ctx.createGain(); g.gain.value=ganho; fonte.connect(g); g.connect(destino); return g;
}
function esperaS(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* saturação suave: troca o corte duro por compressão de fita */
function curvaSuave(k){
  const n=1024,c=new Float32Array(n),d=Math.tanh(k);
  for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(x*k)/d; }
  return c;
}
/* pulso arredondado e limitado em banda: troca a onda quadrada do
   pistão antigo, que era um degrau de tensão e estourava o alto-falante */
function ondaPulso(){
  const h=[0,1,.78,.52,.30,.14,.06];
  const re=new Float32Array(h.length), im=new Float32Array(h.length);
  for(let i=0;i<h.length;i++) re[i]=h[i];
  return A.ctx.createPeriodicWave(re,im);
}
/* passeio aleatório puxado por uma base móvel: o tremor irregular que
   faz o rangido soar como madeira e não como sintetizador */
function curvaTremida(n,de,ate,amp,puxa){
  const c=new Float32Array(n); let v=de;
  for(let i=0;i<n;i++){
    const b=de+(ate-de)*(n>1?i/(n-1):1);
    v += (Math.random()*2-1)*amp;
    v += (b-v)*puxa;
    c[i]=Math.max(20,v);
  }
  return c;
}
/* envelope que engasga: a dobradiça prende e solta */
function curvaRangido(n){
  const c=new Float32Array(n); let g=1;
  for(let i=0;i<n;i++){
    const t=n>1?i/(n-1):1;
    if(Math.random()<.035) g=.25+Math.random()*.9;
    g += (1-g)*.06;
    c[i]=Math.sin(Math.PI*Math.pow(t,.75))*g;
  }
  return c;
}

/* ---------- gerador ---------- */

function tossida(t,vol){
  const o=A.ctx.createOscillator(),g=A.ctx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(96,t);
  o.frequency.exponentialRampToValueAtTime(38,t+.15);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.28*vol,t+.008);
  g.gain.exponentialRampToValueAtTime(.0008,t+.30);
  o.connect(g); saida(g,{pan:SOM.gerador.pan,rev:.45});
  o.start(t); o.stop(t+.32);

  const s=ruidoS(),f=A.ctx.createBiquadFilter(),ng=A.ctx.createGain();
  f.type='lowpass'; f.frequency.value=300;
  ng.gain.setValueAtTime(0,t);
  ng.gain.linearRampToValueAtTime(.16*vol,t+.010);
  ng.gain.exponentialRampToValueAtTime(.0008,t+.22);
  s.connect(f); f.connect(ng); saida(ng,{pan:SOM.gerador.pan,rev:.40});
  s.start(t); s.stop(t+.24);
}

window.ligarGerador = function(){
  if(!somOk()||A.ger)return;
  const t=agoraS(), f0=SOM.gerador.rpm;

  /* barramento do motor: é aqui que o estouro morre */
  const hp=A.ctx.createBiquadFilter();
  hp.type='highpass'; hp.frequency.value=26; hp.Q.value=.6;   // tira o sub que bate no cone
  const lp=A.ctx.createBiquadFilter();
  lp.type='lowpass'; lp.frequency.value=430; lp.Q.value=.4;   // motor é grave, não é serra
  const forma=A.ctx.createWaveShaper();
  forma.curve=curvaSuave(1.35); forma.oversample='2x';
  const lim=A.ctx.createDynamicsCompressor();
  lim.threshold.value=-20; lim.knee.value=8; lim.ratio.value=12;
  lim.attack.value=.004;   lim.release.value=.14;
  const mestre=A.ctx.createGain(); mestre.gain.value=0;
  mestre.connect(hp); hp.connect(lp); lp.connect(forma); forma.connect(lim);
  saida(lim,{pan:SOM.gerador.pan,rev:SOM.gerador.rev});

  const oRot=A.ctx.createOscillator(); oRot.type='triangle';
  const gRot=A.ctx.createGain(); gRot.gain.value=.30;
  oRot.connect(gRot); gRot.connect(mestre);

  const oH=A.ctx.createOscillator(); oH.type='sine';
  const gH=A.ctx.createGain(); gH.gain.value=.12;
  oH.connect(gH); gH.connect(mestre);

  const oAlt=A.ctx.createOscillator(); oAlt.type='sine';   // alternador
  const gAlt=A.ctx.createGain(); gAlt.gain.value=.028;
  oAlt.connect(gAlt); gAlt.connect(mestre);

  /* combustão: ruído de banda modulado por pulso arredondado */
  const sN=ruidoS();
  const bpN=A.ctx.createBiquadFilter();
  bpN.type='bandpass'; bpN.frequency.value=165; bpN.Q.value=1.05;
  const amN=A.ctx.createGain(); amN.gain.value=.42;
  const oAM=A.ctx.createOscillator(); oAM.setPeriodicWave(ondaPulso());
  ligaS(oAM,amN.gain,.40);
  const gN=A.ctx.createGain(); gN.gain.value=.30;
  sN.connect(bpN); bpN.connect(amN); amN.connect(gN); gN.connect(mestre);

  /* deriva de rotação: motor vivo, sem vibrato de teclado */
  const dr1=lfoS(.055), dr2=lfoS(.017);
  ligaS(dr1,oRot.frequency,.55); ligaS(dr2,oRot.frequency,.35);
  ligaS(dr1,oH.frequency ,1.10); ligaS(dr2,oH.frequency ,.70);
  ligaS(dr1,oAM.frequency,.16 ); ligaS(dr2,oAM.frequency,.10);

  /* partida: pega, acelera demais, assenta */
  oRot.frequency.setValueAtTime(f0*.35,t);
  oRot.frequency.exponentialRampToValueAtTime(f0*1.06,t+1.5);
  oRot.frequency.linearRampToValueAtTime(f0,t+2.4);
  oH.frequency.setValueAtTime(f0*.70,t);
  oH.frequency.exponentialRampToValueAtTime(f0*2,t+1.6);
  oAlt.frequency.setValueAtTime(58,t);
  oAlt.frequency.exponentialRampToValueAtTime(118,t+1.8);
  oAM.frequency.setValueAtTime(f0*.175,t);
  oAM.frequency.exponentialRampToValueAtTime(f0/2,t+1.6);

  mestre.gain.setValueAtTime(0,t);
  mestre.gain.linearRampToValueAtTime(SOM.gerador.vol*1.18,t+1.9);
  mestre.gain.linearRampToValueAtTime(SOM.gerador.vol,t+3.2);

  tossida(t+.10,.9); tossida(t+.42,.7); tossida(t+.78,.5);

  [oRot,oH,oAlt,oAM,dr1,dr2].forEach(o=>o.start(t));
  sN.start(t);

  A.ger={t0:t,f0,fAtual:f0,carga:1,mestre,oRot,oH,oAlt,oAM,dr1,dr2,sN,gN,lp,engasgo:null};
  if(SOM.gerador.engasgo) programarEngasgo();
};

window.ajustarGerador = function(pct){
  if(!A.ctx||!A.ger)return;
  const t=agoraS(), p=trava(pct/100,0,1), G=A.ger;
  const f=G.f0*(.84+.16*p);          // tanque baixo, motor mais lento
  G.fAtual=f; G.carga=p;
  G.oRot.frequency.linearRampToValueAtTime(f,t+1.2);
  G.oH  .frequency.linearRampToValueAtTime(f*2,t+1.2);
  G.oAM .frequency.linearRampToValueAtTime(f/2,t+1.2);
  G.oAlt.frequency.linearRampToValueAtTime(100+22*p,t+1.2);
  G.lp  .frequency.linearRampToValueAtTime(300+170*p,t+1.2);
  G.gN  .gain.linearRampToValueAtTime(.24+.12*p,t+1.2);
  G.mestre.gain.linearRampToValueAtTime(SOM.gerador.vol*(.72+.28*p),t+1.2);
};

/* falha de ignição quando o diesel está no fim */
function programarEngasgo(){
  if(!A.ger)return;
  A.ger.engasgo=setTimeout(()=>{
    if(!A.ger)return;
    const G=A.ger;
    if(G.carga<.30&&Math.random()<.6){
      const t=agoraS(), v=G.mestre.gain.value, f=G.fAtual;
      G.mestre.gain.cancelScheduledValues(t);
      G.mestre.gain.setValueAtTime(v,t);
      G.mestre.gain.linearRampToValueAtTime(v*.35,t+.07);
      G.mestre.gain.linearRampToValueAtTime(v,t+.55);
      G.oRot.frequency.cancelScheduledValues(t);
      G.oRot.frequency.setValueAtTime(f,t);
      G.oRot.frequency.linearRampToValueAtTime(f*.62,t+.09);
      G.oRot.frequency.linearRampToValueAtTime(f,t+.70);
    }
    programarEngasgo();
  },7000+Math.random()*11000);
}

window.desligarGerador = function(){
  if(!A.ctx||!A.ger)return;
  const t=agoraS(), G=A.ger; A.ger=null;
  if(G.engasgo) clearTimeout(G.engasgo);
  const f=G.fAtual||G.f0;

  G.oRot.frequency.cancelScheduledValues(t);
  G.oRot.frequency.setValueAtTime(f,t);
  G.oRot.frequency.exponentialRampToValueAtTime(Math.max(4,f*.14),t+2.6);
  G.oH.frequency.cancelScheduledValues(t);
  G.oH.frequency.setValueAtTime(f*2,t);
  G.oH.frequency.exponentialRampToValueAtTime(Math.max(6,f*.30),t+2.6);
  G.oAM.frequency.cancelScheduledValues(t);
  G.oAM.frequency.setValueAtTime(f/2,t);
  G.oAM.frequency.exponentialRampToValueAtTime(.7,t+2.8);
  G.oAlt.frequency.cancelScheduledValues(t);
  G.oAlt.frequency.setValueAtTime(Math.max(20,G.oAlt.frequency.value),t);
  G.oAlt.frequency.exponentialRampToValueAtTime(20,t+2.2);

  const v=G.mestre.gain.value;
  G.mestre.gain.cancelScheduledValues(t);
  G.mestre.gain.setValueAtTime(v,t);
  G.mestre.gain.setValueAtTime(v*.9,t+1.4);   // o motor segura, depois entrega
  G.mestre.gain.linearRampToValueAtTime(0,t+3.0);

  setTimeout(()=>{
    [G.oRot,G.oH,G.oAlt,G.oAM,G.dr1,G.dr2,G.sN].forEach(x=>{try{x.stop()}catch(e){}});
  },3400);
};

/* ---------- porta ---------- */

function ferrolho(t,pan,vol,rev){
  const s=ruidoS(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();
  f.type='bandpass'; f.frequency.value=1900+Math.random()*900; f.Q.value=6;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.78*vol,t+.004);
  g.gain.exponentialRampToValueAtTime(.0008,t+.075);
  s.connect(f); f.connect(g); saida(g,{pan,rev:rev*.6});
  s.start(t); s.stop(t+.10);

  const o=A.ctx.createOscillator(),og=A.ctx.createGain();
  o.type='triangle';
  o.frequency.setValueAtTime(1150,t);
  o.frequency.exponentialRampToValueAtTime(520,t+.05);
  og.gain.setValueAtTime(.28*vol,t);
  og.gain.exponentialRampToValueAtTime(.0008,t+.09);
  o.connect(og); saida(og,{pan,rev:rev*.7}); o.start(t); o.stop(t+.11);
}

function rangido(t,dur,pan,vol,rev){
  const n=Math.max(64,Math.round(dur*180));

  // madeira sob tensão: o agudo, limitado antes do filtro ressonante
  const o=A.ctx.createOscillator(); o.type='sawtooth';
  const pre=A.ctx.createBiquadFilter(); pre.type='lowpass'; pre.frequency.value=2600;
  const bp=A.ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=13;
  const g=A.ctx.createGain(); g.gain.value=0;
  o.frequency.setValueCurveAtTime(curvaTremida(n,52,96,3.2,.10),t,dur);
  bp.frequency.setValueCurveAtTime(curvaTremida(n,430,1250,90,.12),t,dur);
  const e1=curvaRangido(n); for(let i=0;i<n;i++) e1[i]*=.24*vol;
  g.gain.setValueCurveAtTime(e1,t,dur);
  o.connect(pre); pre.connect(bp); bp.connect(g); saida(g,{pan,rev});
  o.start(t); o.stop(t+dur+.05);

  // grão da madeira raspando
  const s=ruidoS(),nf=A.ctx.createBiquadFilter(),ng=A.ctx.createGain();
  nf.type='bandpass'; nf.Q.value=5;
  nf.frequency.setValueCurveAtTime(curvaTremida(n,600,1700,140,.12),t,dur);
  const e2=curvaRangido(n); for(let i=0;i<n;i++) e2[i]*=.15*vol;
  ng.gain.value=0;
  ng.gain.setValueCurveAtTime(e2,t,dur);
  s.connect(nf); nf.connect(ng); saida(ng,{pan,rev});
  s.start(t); s.stop(t+dur+.05);
}

function arrasto(t,dur,pan,vol,rev){
  const s=ruidoS(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();
  f.type='lowpass'; f.Q.value=1.2;
  f.frequency.setValueAtTime(180,t);
  f.frequency.linearRampToValueAtTime(420,t+dur*.5);
  f.frequency.linearRampToValueAtTime(200,t+dur);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.36*vol,t+dur*.28);
  g.gain.linearRampToValueAtTime(.14*vol,t+dur*.80);
  g.gain.linearRampToValueAtTime(0,t+dur);
  s.connect(f); f.connect(g); saida(g,{pan,rev:rev*.8});
  s.start(t); s.stop(t+dur+.05);
}

/* o ar de fora entrando: vai quase todo para a reverberação */
function lufada(t,dur,pan,vol){
  const s=ruidoS(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();
  f.type='bandpass'; f.frequency.value=340; f.Q.value=.5;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.28*vol,t+dur*.35);
  g.gain.linearRampToValueAtTime(0,t+dur);
  s.connect(f); f.connect(g); saida(g,{pan,rev:.85});
  s.start(t); s.stop(t+dur+.05);
}

function batente(t,pan,vol,rev){
  const o=A.ctx.createOscillator(),g=A.ctx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(74,t);
  o.frequency.exponentialRampToValueAtTime(41,t+.14);
  g.gain.setValueAtTime(.56*vol,t);
  g.gain.exponentialRampToValueAtTime(.0008,t+.30);
  o.connect(g); saida(g,{pan,rev:rev*.9}); o.start(t); o.stop(t+.34);

  const s=ruidoS(),f=A.ctx.createBiquadFilter(),ng=A.ctx.createGain();
  f.type='lowpass'; f.frequency.value=520;
  ng.gain.setValueAtTime(0,t);
  ng.gain.linearRampToValueAtTime(.39*vol,t+.005);
  ng.gain.exponentialRampToValueAtTime(.0008,t+.18);
  s.connect(f); f.connect(ng); saida(ng,{pan,rev});
  s.start(t); s.stop(t+.20);
}

window.somPortaAbrindo = function(op){
  op=op||{};
  if(!somOk())return 0;
  const t0  = agoraS()+(op.atraso||0);
  const pan = op.pan!==undefined?op.pan:0;
  const rev = op.rev!==undefined?op.rev:.5;
  const vol = (op.vol!==undefined?op.vol:1)*SOM.porta.vol;
  const dur = op.dur||2.4;

  if(op.tranca!==false){ ferrolho(t0,pan,vol,rev); ferrolho(t0+.17,pan,vol*.8,rev); }
  const tc=t0+(op.tranca===false?.05:.42);
  rangido(tc,dur*.62,pan,vol,rev);
  arrasto(tc,dur*.70,pan,vol*.7,rev);
  if(op.vento!==false) lufada(tc+dur*.25,dur*.9,pan,vol*.55);
  batente(t0+dur*.95,pan,vol*.6,rev);
  return dur+.6;
};

window.somPortaFechando = function(op){
  op=op||{};
  if(!somOk())return 0;
  const t0  = agoraS()+(op.atraso||0);
  const pan = op.pan!==undefined?op.pan:0;
  const rev = op.rev!==undefined?op.rev:.5;
  const vol = (op.vol!==undefined?op.vol:1)*SOM.porta.vol;
  const dur = op.dur||1.6;

  rangido(t0,dur*.55,pan,vol*.8,rev);
  arrasto(t0,dur*.6,pan,vol*.6,rev);
  batente(t0+dur*.72,pan,vol*1.25,rev);         // o baque de encostar
  if(op.tranca!==false){ ferrolho(t0+dur*.90,pan,vol,rev); ferrolho(t0+dur*.90+.19,pan,vol*.85,rev); }
  return dur+.6;
};

/* ---------- passos ---------- */

const SUP={
  madeira : {corte:900 ,q:.9 ,corpo:88,res:[150,230],resVol:.10,scuff:.045},
  escada  : {corte:1100,q:1.0,corpo:96,res:[190,300],resVol:.13,scuff:.050},
  concreto: {corte:1700,q:1.1,corpo:74,res:[380,620],resVol:.03,scuff:.075},
  terra   : {corte:480 ,q:.7 ,corpo:66,res:[110,160],resVol:.02,scuff:.055}
};

function passo(t,op){
  const S2=SUP[op.superficie]||SUP.madeira;
  const f=op.forca, pan=op.pan, rev=op.rev;

  // o peso do corpo chegando no chão
  const o=A.ctx.createOscillator(),og=A.ctx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(S2.corpo*(.9+Math.random()*.2),t);
  o.frequency.exponentialRampToValueAtTime(S2.corpo*.52,t+.085);
  og.gain.setValueAtTime(0,t);
  og.gain.linearRampToValueAtTime(.30*f,t+.006);
  og.gain.exponentialRampToValueAtTime(.0008,t+.16);
  o.connect(og); saida(og,{pan,rev:rev*.7}); o.start(t); o.stop(t+.18);

  // o solado batendo
  const s=ruidoS(),nf=A.ctx.createBiquadFilter(),ng=A.ctx.createGain();
  nf.type='lowpass'; nf.frequency.value=S2.corte*(.85+Math.random()*.3); nf.Q.value=S2.q;
  ng.gain.setValueAtTime(0,t);
  ng.gain.linearRampToValueAtTime(.24*f,t+.004);
  ng.gain.exponentialRampToValueAtTime(.0008,t+.10);
  s.connect(nf); nf.connect(ng); saida(ng,{pan,rev}); s.start(t); s.stop(t+.12);

  // a tábua respondendo depois: é isso que dá o assoalho velho
  if(S2.resVol>0){
    const r=A.ctx.createOscillator(),rg=A.ctx.createGain();
    r.type='triangle';
    r.frequency.value=S2.res[0]+Math.random()*(S2.res[1]-S2.res[0]);
    rg.gain.value=0;                                   // sem isso o nó toca em escala cheia
    rg.gain.setValueAtTime(0,t);                       // até a primeira automação
    rg.gain.linearRampToValueAtTime(S2.resVol*f,t+.010);
    rg.gain.exponentialRampToValueAtTime(.0008,t+.34);
    r.connect(rg); saida(rg,{pan,rev:rev*1.15}); r.start(t); r.stop(t+.36);
  }

  // o pé arrastando ao sair
  const t2=t+.05+Math.random()*.04;
  const s2=ruidoS(),hf=A.ctx.createBiquadFilter(),hg=A.ctx.createGain();
  hf.type='highpass'; hf.frequency.value=1800;
  hg.gain.setValueAtTime(0,t2);
  hg.gain.linearRampToValueAtTime(S2.scuff*f,t2+.012);
  hg.gain.exponentialRampToValueAtTime(.0008,t2+.07);
  s2.connect(hf); hf.connect(hg); saida(hg,{pan,rev:rev*.6}); s2.start(t2); s2.stop(t2+.09);
}

window.somPassos = function(op){
  op=op||{};
  if(!somOk())return 0;
  const n     = op.passos||6;
  const ritmo = op.ritmo ||.46;
  const sup   = op.superficie||SOM.passos.superficie;
  const base  = (op.forca!==undefined?op.forca:.85)*SOM.passos.vol;
  const pan0  = op.pan||0;
  const apro  = !!op.aproximando, afast = !!op.afastando;
  let t = agoraS()+(op.atraso!==undefined?op.atraso:.08);

  for(let i=0;i<n;i++){
    const p = n>1 ? i/(n-1) : 1;
    let f = base, rev = op.rev!==undefined?op.rev:.40;
    if(apro)       { f=base*(.32+.85*p); rev=.85-.55*p; }   // chegando: mais perto, menos eco
    else if(afast) { f=base*(1.05-.75*p); rev=.28+.60*p; }
    /* passo de anomalia: tempo exato demais, sem variação de força.
       É o mesmo tell do ritmo de metrônomo nas batidas. */
    const exato = !!op.desumano;
    passo(t,{forca:exato?base:f,pan:pan0+(i%2?.13:-.13),rev,superficie:sup});
    const longo = exato ? 1 : ((i%2)?1.06:.94);
    t += ritmo*longo*(exato?1:(.94+Math.random()*.12));
  }
  return t-agoraS();
};

/* ---------- transição de tela preta ---------- */

function garantirEscuro(){
  let el=document.getElementById('escuro-passos');
  if(el)return el;
  const st=document.createElement('style');
  st.textContent=
  '#escuro-passos{position:fixed;inset:0;z-index:95;background:#000;opacity:0;'+
  'pointer-events:none;transition:opacity .28s ease;display:flex;'+
  'align-items:center;justify-content:center;padding:34px}'+
  '#escuro-passos.vis{opacity:1;pointer-events:auto}'+
  '#escuro-passos p{font-family:var(--corpo,Georgia,serif);font-style:italic;'+
  'color:#6A6273;font-size:17px;text-align:center;max-width:26ch;line-height:1.6;'+
  'opacity:0;transition:opacity .5s ease .35s}'+
  '#escuro-passos.vis p{opacity:1}'+
  '@media(prefers-reduced-motion:reduce){#escuro-passos{transition:none}}';
  document.head.appendChild(st);
  el=document.createElement('div');
  el.id='escuro-passos';
  el.innerHTML='<p></p>';
  document.body.appendChild(el);
  return el;
}

/* escurece -> 1s de breu -> passos -> aoFim() ainda no escuro -> volta */
window.transicaoPassos = function(op){
  op=op||{};
  const el=garantirEscuro();
  const alvo=el.querySelector('p');
  const fade=SOM.transicao.fade;
  const breu=op.escuro!==undefined?op.escuro:SOM.transicao.escuro;

  alvo.textContent=op.texto||'';
  el.classList.add('vis');

  return esperaS(fade+40)
    .then(()=>esperaS(breu))
    .then(()=>{
      const dur=window.somPassos({
        passos:op.passos, ritmo:op.ritmo, superficie:op.superficie,
        aproximando:op.aproximando, afastando:op.afastando,
        desumano:op.desumano, forca:op.forca, pan:op.pan, atraso:.05
      });
      return esperaS(Math.round(dur*1000)+(op.sobra!==undefined?op.sobra:420));
    })
    .then(()=>{
      if(typeof op.aoFim==='function'){ try{op.aoFim()}catch(e){console.error(e)} }
      el.classList.remove('vis');
      return esperaS(fade+40);
    })
    .then(()=>{ alvo.textContent=''; });
};

/* ---------- a casa fica quieta ---------- */

function estaloLeve(){
  if(!somOk())return;
  const t=agoraS();
  const o=A.ctx.createOscillator(),g=A.ctx.createGain();
  o.type='triangle';
  o.frequency.setValueAtTime(260+Math.random()*260,t);
  o.frequency.exponentialRampToValueAtTime(95,t+.11);
  g.gain.setValueAtTime(.035,t);
  g.gain.exponentialRampToValueAtTime(.0006,t+.17);
  o.connect(g); saida(g,{pan:Math.random()*1.4-.7,rev:.7});
  o.start(t); o.stop(t+.19);
}

window.ligarAmbiente = function(){
  if(!somOk()||A.amb.on)return;
  A.amb.on=true;
  const t=agoraS();
  const s=ruidoS();
  const hp=A.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=60;
  const f =A.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=260; f.Q.value=.4;
  const g =A.ctx.createGain(); g.gain.value=0;
  g.gain.linearRampToValueAtTime(SOM.casa.vento,t+6);
  const l=lfoS(.035); ligaS(l,f.frequency,70); l.start(t);
  s.connect(hp); hp.connect(f); f.connect(g); saida(g,{rev:.5}); s.start(t);
  A.amb.vento={s,g,f,lfo:l};
  window.agendarInquietacao();
  leitoMental();
};

window.agendarInquietacao = function(){
  if(!A.ctx)return;
  clearTimeout(A.amb.timer);
  if(SOM.casa.inquietacao<=0)return;
  const espera=(26000+Math.random()*34000)/(1+A.tensao*1.6);
  A.amb.timer=setTimeout(()=>{
    // a casa só fala quando a tensão justifica; o resto do tempo é o gerador
    if(A.tensao>.42 && chance(SOM.casa.inquietacao)) estaloLeve();
    window.agendarInquietacao();
  },Math.max(9000,espera));
};

window.acalmarCasa = function(){
  if(!A.ctx)return;
  clearTimeout(A.amb.timer);
  if(A.amb.vento) A.amb.vento.g.gain.linearRampToValueAtTime(SOM.casa.vento,agoraS()+3);
  window.agendarInquietacao();
};


/* =====================================================
   PARTE B — A SANIDADE MENTE NO OUVIDO

   O jogo inteiro é sobre vozes imitadas, mas a loucura só
   acontecia em número e em letra dobrada. Daqui pra frente
   ela acontece onde dói: no que você escuta.
   ===================================================== */

/* ---------- 1. o leito mental ----------
   Zumbido de ouvido e pressão de sub que crescem com o estágio.
   Nunca é anunciado no texto. A pessoa só percebe quando some. */

const MENTAL={nos:null};
function leitoMental(){
  if(!somOk()||MENTAL.nos)return;
  const t=agoraS();

  // zumbido agudo, com deriva pra não virar tom de teste
  const oz=A.ctx.createOscillator(); oz.type='sine'; oz.frequency.value=3120;
  const gz=A.ctx.createGain(); gz.gain.value=0;
  const dz=lfoS(.031); ligaS(dz,oz.frequency,26); dz.start(t);
  oz.connect(gz); saida(gz,{pan:.10,rev:.05});

  // pressão: sub pulsante, quase infrassônico mas com corpo
  const os=A.ctx.createOscillator(); os.type='sine'; os.frequency.value=43;
  const gs=A.ctx.createGain(); gs.gain.value=0;            // nível, vem do estágio
  /* A respiração é um estágio à parte, multiplicando o nível. Ligar o LFO
     direto em gs.gain somava profundidade absoluta: com alvo .045 e LFO de
     .5, o ganho ia a .545 — dez vezes o pretendido. */
  const resp=A.ctx.createGain(); resp.gain.value=.72;
  const ps=lfoS(.19); ligaS(ps,resp.gain,.28); ps.start(t); // .44 .. 1.00
  const hs=A.ctx.createBiquadFilter(); hs.type='highpass'; hs.frequency.value=30;
  os.connect(gs); gs.connect(resp); resp.connect(hs); saida(hs,{rev:.30});

  // sopro sem direção: o barulho que a cabeça faz no silêncio
  const sv=ruidoS();
  const fv=A.ctx.createBiquadFilter(); fv.type='bandpass'; fv.frequency.value=1600; fv.Q.value=.7;
  const gv=A.ctx.createGain(); gv.gain.value=0;
  sv.connect(fv); fv.connect(gv); saida(gv,{rev:.65});

  oz.start(t); os.start(t); sv.start(t);
  MENTAL.nos={gz,gs,gv};
  atualizarMental();
}

/* quanto de leito cada estágio carrega */
const LEITO={ 'lúcido':[0,0,0], 'tenso':[.0022,.010,.004],
  'fissurado':[.0045,.020,.009], 'rachado':[.0075,.032,.015],
  'desfeito':[.0110,.045,.022], 'ruptura':[.0160,.062,.032] };

function atualizarMental(){
  if(!MENTAL.nos||!A.ctx)return;
  const e=(typeof estagio==='function')?estagio():null;
  const L=LEITO[e&&e.n]||LEITO['lúcido'];
  const t=agoraS(), v=SOM.mental.vol;
  MENTAL.nos.gz.gain.linearRampToValueAtTime(L[0]*v,t+4);
  MENTAL.nos.gs.gain.linearRampToValueAtTime(L[1]*v,t+4);
  MENTAL.nos.gv.gain.linearRampToValueAtTime(L[2]*v,t+4);
}

/* a sanidade também empurra o coração: baixo é taquicardia de base */
if(typeof mexerSan==='function'){
  const _ms=mexerSan;
  window.mexerSan=function(n,motivo){
    const r=_ms(n,motivo);
    atualizarMental();
    if(typeof tensao==='function'){
      const piso=trava((100-san())/100*.45,0,.45);
      if(A.tensao<piso)tensao(piso);
    }
    return r;
  };
}

/* ---------- 2. a casa cresce por dentro ----------
   Débito de realidade alto = a reverberação abre. A casa passa a
   soar maior do que é. Ninguém avisa; conferir a realidade fecha. */
function ajustarSalaMental(){
  if(!A.ctx||!A.conv)return;
  const d=trava((typeof debito==='function'?debito():0)/8,0,1);
  A.molhado.gain.linearRampToValueAtTime(.30+d*.34,agoraS()+3);
}

/* ---------- 3. a voz de quem morreu ----------
   Usa a síntese de fala que o jogo já carrega, mas com o timbre
   puxado pra baixo e um sussurro por baixo. É o mesmo truque que o
   jogo usa no mímico — aqui aplicado à própria cabeça do jogador. */
function vozDeMorto(txt,nome){
  if(!A.ctx)return falar(txt,{dist:'longe'});
  const semente=(nome||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const t=agoraS();

  // um sopro que sobe antes da voz: o ar sendo puxado
  const s=ruidoS(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();
  f.type='bandpass'; f.frequency.setValueAtTime(180,t);
  f.frequency.exponentialRampToValueAtTime(900,t+1.1);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.05,t+.8);
  g.gain.linearRampToValueAtTime(0,t+1.3);
  s.connect(f); f.connect(g); saida(g,{rev:.9}); s.start(t); s.stop(t+1.4);

  if(typeof sussurro==='function')
    sussurro(Math.max(5,Math.round(txt.length/8)),(semente%2?-.4:.4),.030);

  return falar(txt,{dist:'longe',vozIdx:semente,
    pitch:.72+((semente%7)*.015), rate:.80, vol:1.25});
}

/* ---------- 4. ILUSÕES SONORAS ----------
   A diferença pro catálogo antigo: aqui o som toca e o log NÃO diz
   nada. Não existe frase confirmando que você ouviu. Se você foi
   conferir, gastou o dia; se ignorou, a dúvida fica. É o único
   lugar do jogo onde a informação chega só pelo ouvido. */

const ILUSOES_SOM=[
 {id:'passos-cima',min:.10,trilho:'paranoia',
  toca:()=>somPassos({passos:5,superficie:'madeira',forca:.55,rev:.75,pan:.2}),
  real:'Era o Zé mexendo em alguma coisa lá em cima. Ele pede desculpa.',
  falso:'Não tem ninguém lá em cima. Tem poeira parada no assoalho, sem pegada nenhuma.',
  ignora:'Você fica ouvindo até parar. Demora mais do que passo de gente demora.'},

 {id:'passos-exatos',min:.22,trilho:'paranoia',
  toca:()=>somPassos({passos:7,superficie:'madeira',forca:.6,rev:.7,desumano:true}),
  real:'É gente. Só está com medo e andando com cuidado.',
  falso:'Cada passo caiu no mesmo intervalo do anterior. Gente não faz isso. Nada lá.',
  ignora:'O ritmo não muda uma vez sequer. Depois para no meio de um passo.',
  anomalo:true},

 {id:'porta-sozinha',min:.22,trilho:'disso',
  toca:()=>somPortaAbrindo({vol:.7,rev:.7,tranca:false}),
  real:'A tranca estava mal encostada. O vento fez o resto.',
  falso:'A porta está trancada por dentro, do jeito que você deixou. Os dois ferrolhos.',
  ignora:'Você não vai conferir a porta. Você decide isso e não muda de ideia.'},

 {id:'batida-fundos',min:.10,trilho:'paranoia',
  toca:()=>{ if(typeof batida==='function')batida(3,.55,.45); },
  real:'Tem alguém nos fundos mesmo. Some antes de você chegar na janela.',
  falso:'Nada. E o chão de fora está seco, sem pisada.',
  ignora:'Bate mais três vezes, no mesmo lugar, e para.'},

 {id:'gerador-parado',min:.34,trilho:'disso',
  toca:()=>{ if(A.ger){ ajustarGerador(4);
     setTimeout(()=>{ if(A.ger)ajustarGerador(S.diesel!=null?S.diesel:60); },2600); } },
  real:'O gerador está engasgando de verdade. O diesel está no fim.',
  falso:'O gerador está no ritmo de sempre. Foi na sua cabeça que ele falhou.',
  ignora:'Você jura que ele parou por dois segundos. O medidor diz que não.'},

 {id:'respiracao',min:.34,trilho:'paranoia',
  toca:()=>{ if(typeof sussurro==='function')sussurro(9,chance(.5)?-.5:.5,.045); },
  real:'É alguém da casa dormindo com a boca aberta. Só isso.',
  falso:'Você prende o ar pra ouvir melhor e a respiração continua. Não é a sua.',
  ignora:'Continua até você dormir. Você acorda antes dela parar.'},

 {id:'cova',min:.22,trilho:'culpa',
  toca:()=>somCova(6),
  real:'É bicho remexendo o quintal atrás de resto de comida.',
  falso:()=>{const m=(S.mortos||[]);
    return m.length?`A terra em cima ${m.length===1?'da cova':'das covas'} está do jeito que você deixou. Intacta.`
                   :'Não tem nada revirado lá fora. A terra está batida e seca.';},
  ignora:'Para quando amanhece. De manhã você não vai olhar o quintal, e sabe disso.'},

 {id:'cadeira',min:.34,trilho:'culpa',
  toca:()=>somCadeira(),
  real:'Alguém puxou a cadeira pra sentar e não avisou. É só isso.',
  falso:()=>{const m=(S.mortos||[]);
    return m.length?`A cadeira está encostada na mesa. Ninguém sentou nela desde ${sortear(m).n}.`
                   :'A cadeira está encostada na mesa, do jeito que ficou.';},
  ignora:'Arrasta de novo, mais devagar, como quem está se acomodando.'},

 {id:'relogio',min:.22,trilho:'disso',
  toca:()=>somRelogio(9),
  real:'É o relógio da parede. Ele ainda anda, e você tinha esquecido disso.',
  falso:'Você conta as batidas com o ponteiro na frente. Elas não caem juntas nunca.',
  ignora:'Você conta sem querer, até perder a conta, e recomeça do um.'}
];

/* ---- sons próprios das ilusões novas ---- */

/* pá entrando na terra: o corte seco, a carga, o despejo */
function somCova(n){
  if(!somOk())return;
  let t=agoraS()+.1;
  for(let i=0;i<(n||5);i++){
    const pan=.35+Math.random()*.15;                 // sempre do lado do quintal
    // a lâmina entrando
    const s=ruidoS(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();
    f.type='bandpass'; f.frequency.value=800+Math.random()*500; f.Q.value=1.6;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(.10,t+.02);
    g.gain.exponentialRampToValueAtTime(.0008,t+.22);
    s.connect(f); f.connect(g); saida(g,{pan,rev:.75}); s.start(t); s.stop(t+.24);
    // a terra caindo de volta
    const t2=t+.42;
    const s2=ruidoS(),f2=A.ctx.createBiquadFilter(),g2=A.ctx.createGain();
    f2.type='lowpass'; f2.frequency.value=420; f2.Q.value=.7;
    g2.gain.setValueAtTime(0,t2);
    g2.gain.linearRampToValueAtTime(.075,t2+.03);
    g2.gain.exponentialRampToValueAtTime(.0008,t2+.30);
    s2.connect(f2); f2.connect(g2); saida(g2,{pan,rev:.8}); s2.start(t2); s2.stop(t2+.32);
    t += .95+Math.random()*.35;
  }
}

/* madeira arrastando no assoalho e parando */
function somCadeira(){
  if(!somOk())return;
  const t=agoraS()+.1, pan=chance(.5)?-.3:.3;
  arrasto(t,1.15,pan,.9,.65);
  batente(t+1.05,pan,.35,.6);
}

/* tique que nunca cai no mesmo lugar duas vezes */
function somRelogio(n){
  if(!somOk())return;
  let t=agoraS()+.1;
  for(let i=0;i<(n||8);i++){
    const o=A.ctx.createOscillator(),g=A.ctx.createGain();
    o.type='triangle';
    o.frequency.setValueAtTime(2200+Math.random()*700,t);
    o.frequency.exponentialRampToValueAtTime(900,t+.02);
    g.gain.setValueAtTime(.055,t);
    g.gain.exponentialRampToValueAtTime(.0006,t+.055);
    o.connect(g); saida(g,{pan:-.15,rev:.45}); o.start(t); o.stop(t+.07);
    /* o intervalo desliza: é o tempo que não bate, não o som */
    t += .74+i*.035+Math.random()*.09;
  }
}

/* a voz é caso à parte: precisa de um morto pra imitar */
function ilusaoDeVoz(){
  const m=(S.mortos||[]);
  if(!m.length)return null;
  const p=sortear(m);
  const falas=[
   'Abre a porta. Sou eu.',
   'Está frio aqui fora.',
   'Você prometeu.',
   'Eu não morri. Você viu errado.',
   'Deixa eu entrar. Só hoje.'
  ];
  return {
    id:'voz', trilho:'culpa', min:.10, nome:p.n,
    toca:()=>vozDeMorto(sortear(falas),p.n),
    real:null,
    falso:`Você chega na porta e não tem ninguém. ${p.n} está enterrad${/a$/.test(p.n)?'a':'o'} desde o dia que você enterrou.`,
    ignora:`A voz chama mais duas vezes. Na terceira ela usa o seu nome, e ela acerta.`,
    sempreFalso:true
  };
}

/* quanto o trilho dominante puxa o sorteio pro lado dele */
function pesoTrilho(il){
  const dom=(typeof trilhoDominante==='function')?trilhoDominante():null;
  if(!dom)return 1;
  return il.trilho===dom?3:1;
}
function sortearPesado(pool){
  const tot=pool.reduce((a,i)=>a+pesoTrilho(i),0);
  let r=Math.random()*tot;
  for(const i of pool){ r-=pesoTrilho(i); if(r<=0)return i; }
  return pool[pool.length-1];
}

async function ilusaoSonora(){
  const e=estagio();
  if(!e.ilusao)return false;
  if(!somOk())return false;

  let pool=ILUSOES_SOM.filter(i=>e.ilusao>=i.min);
  const v=ilusaoDeVoz();
  if(v&&e.ilusao>=v.min)pool=pool.concat([v]);
  if(!pool.length)return false;
  const il=sortearPesado(pool);

  /* Quanto pior a cabeça, menor a chance de o som ser real.
     O ouvido apodrece junto: é exatamente quando você mais precisa
     dele que ele para de servir. */
  const ehReal = il.sempreFalso ? false : chance(trava(.62-e.ilusao,.06,.62));

  limpar(); AC.innerHTML='';
  cap('—');                       // sem título: você não sabe o que é isso ainda
  await pausa(700);
  il.toca();                      // o som toca sozinho. o log fica em branco.
  await pausa(2600);

  return new Promise(res=>{
    let pronto=false;
    const fim=v=>{ if(pronto)return; pronto=true; clearInterval(vigia); res(v); };

    /* Se outra tela reescrever a área de ações antes da escolha, os dois
       botões somem e ninguém resolve esta Promise — o dia trava calado.
       O vigia devolve o controle em vez de deixar o jogo pendurado. */
    const vigia=setInterval(()=>{
      if(pronto)return;
      if(!meus[0]||!document.body.contains(meus[0]))fim();
    },900);

    AC.innerHTML='';
    const meus=[];
    botao('Ir ver o que era',acaoDia(0,async()=>{
      S.ruido=trava(S.ruido+3,0,100);
      await pausa(1100);
      if(ehReal){
        diz((typeof il.real==='function'?il.real():il.real)||'Tinha alguma coisa ali mesmo.','alerta');
        S.realDebt=Math.max(0,debito()-1);
        if(il.anomalo)S.anomPegas=(S.anomPegas||0)+1;
      }else{
        diz(typeof il.falso==='function'?il.falso():il.falso,'sist');
        mexerSan(il.trilho==='culpa'?-8:-5);
        if(typeof mexerTrilho==='function')mexerTrilho(il.trilho,7);
        S.realDebt=Math.max(0,debito()-1);   // conferir sempre paga
      }
      fim();
    }),{custo:'+3 de ruído · você fica sabendo'});

    botao('Fingir que não ouviu',async()=>{
      AC.innerHTML='';
      await pausa(1300);
      diz(il.ignora,'alerta');
      mexerSan(-4);
      S.realDebt=debito()+2;
      if(typeof mexerTrilho==='function')mexerTrilho(il.trilho,4);
      if(ehReal&&il.anomalo&&chance(.25))S.invadeHoje=true;
      fim();
    },{custo:'a dúvida fica'});

    meus.push(...AC.querySelectorAll('button'));
  });
}

/* ---------- 5. ESCUTAR A CASA ----------
   O par auditivo do "observar a sombra": não custa recurso, só
   tempo, e a informação que ele dá vale exatamente o quanto a sua
   cabeça ainda vale. */

function retratoSonoro(){
  const l=[];
  if(A.ger) l.push('O gerador, no ritmo dele. Você conhece esse ritmo melhor que a sua voz.');
  else l.push('Sem gerador. A casa sem gerador tem um chiado próprio, que é o silêncio dela.');
  const gente=(S.abrigo||[]).length;
  if(gente>1) l.push(`${gente-1} ${gente===2?'pessoa respirando':'pessoas respirando'} em cômodos diferentes.`);
  else l.push('Ninguém respirando além de você. Isso dá pra ouvir.');
  if(S.ruido>55) l.push('E a casa inteira devolvendo o barulho que você fez hoje.');
  if(typeof portaRange==='function'&&portaRange())
    l.push('A porta trabalha no batente. Ela range mesmo sem vento.');
  return l;
}

const FALSOS_SONOROS=[
 'Alguma coisa arrastando devagar no cômodo ao lado. Para quando você presta atenção.',
 'Uma respiração a mais do que tem gente na casa.',
 'Alguém contando em voz baixa. Chega em nove e recomeça do um.',
 'O seu próprio nome, dito de dentro da parede, sem pressa nenhuma.',
 'Um pedaço de música que você conhece, mas tocada mais devagar do que ela é.'
];

async function escutarACasa(){
  limpar(); AC.innerHTML=''; cap('Ficar parado e só ouvir');
  const e=estagio();
  await pausa(900);

  retratoSonoro().forEach(t=>diz(t,'narr'));
  if(A.ger&&typeof S.diesel==='number')ajustarGerador(S.diesel);

  await pausa(1400);

  /* a mentira entra aqui, no meio de coisas verdadeiras */
  const mente=chance(e.ilusao);
  if(mente){
    diz(sortear(FALSOS_SONOROS),'perigo');
    S.realDebt=debito()+1;
    if(chance(.5)&&typeof sussurro==='function')sussurro(7,chance(.5)?-.45:.45,.032);
    await pausa(1300);
  }

  if(e.drift===0){
    diz('Você confia no que ouviu. Nesse estado, dá pra confiar.','bom');
    if(S.escutouDia!==S.dia)mexerSan(2);     // uma vez por dia, senão vira fazenda
  }else{
    diz(`Você está ${e.n}. Você ouviu tudo isso. Não dá pra saber quanto disso a casa fez sozinha.`,'sist');
  }
  S.escutouDia=S.dia;

  return new Promise(res=>{
    AC.innerHTML='';
    botao('Voltar pro que estava fazendo',()=>{AC.innerHTML='';res();},{cls:'chave'});
  });
}

/* ---------- 6. o eco vira audível ----------
   A sequela 'eco' já repetia linha no log. Agora ela repete no ouvido
   também: a fala volta atrasada, mais baixa e mais grave. */
if(typeof falarV5==='function'){
  const _fv=falarV5;
  window.falarV5=function(txt,op){
    const pr=_fv(txt,op);
    if(typeof sequelas==='function'&&sequelas().includes('eco')&&chance(.18)&&txt.length>12){
      const dur=Math.min(9,txt.length*.085+.7);
      setTimeout(()=>{
        falar(txt,{dist:'longe',pitch:.80,rate:.86,vol:.45,vozIdx:(op&&op.vozIdx||0)+3});
      },dur*1000+520);
    }
    return pr;
  };
}

/* ---------- 7. o sintoma do trilho fica audível ----------
   trilhoDominante() só era usado numa linha do colapso. Agora ele
   escolhe as ilusões (pesoTrilho) e ganha assinatura sonora. */
function somDoTrilho(){
  const dom=(typeof trilhoDominante==='function')?trilhoDominante():null;
  if(!dom||!somOk())return;
  if(dom==='paranoia')      somPassos({passos:3,forca:.4,rev:.85,desumano:true});
  else if(dom==='culpa'){
    const m=(S.mortos||[]);
    if(m.length)vozDeMorto('Você lembra do meu nome?',sortear(m).n);
  }
  else if(dom==='disso'&&A.conv){
    // o cômodo muda de tamanho por três segundos
    const t=agoraS();
    A.molhado.gain.linearRampToValueAtTime(.80,t+.6);
    A.molhado.gain.linearRampToValueAtTime(.30,t+3.4);
  }
}

/* ---------- 8. ligações no fluxo do jogo ---------- */

/* uma ilusão sonora por dia, disputando com a de texto */
if(typeof talvezIlusao==='function'){
  const _ti=talvezIlusao;
  window.talvezIlusao=async function(){
    ajustarSalaMental();
    const e=estagio();
    if(e.ilusao&&S.iluDia!==S.dia&&chance(.45)&&somOk()){
      S.iluDia=S.dia;
      return ilusaoSonora();
    }
    return _ti.apply(null,arguments);
  };
}

/* o colapso ganha o som do trilho que o causou */
if(typeof colapso==='function'){
  const _co=colapso;
  window.colapso=async function(){
    if(debito()>=5)somDoTrilho();
    return _co.apply(null,arguments);
  };
}

/* escutar entra no menu de conferir a realidade */
if(typeof menuRealidade==='function'){
  const _mr=menuRealidade;
  window.menuRealidade=function(volta){
    _mr(volta);
    botao('Ficar parado e só ouvir',acaoDia(1,async()=>{
      await escutarACasa();
      window.menuRealidade(volta);
    }),{custo:S.escutouDia===S.dia?'1h · já ouviu hoje':'1h · vale o que a sua cabeça vale'});
  };
}

/* o leito mental acompanha o carregamento de save */
if(typeof mexerSan==='function')setTimeout(atualizarMental,1200);

/* ---------- atalho de teste ---------- */
window.testarSom=function(qual){
  if(!somOk()){console.warn('[som] toque na tela primeiro');return;}
  switch(qual){
    case 'gerador': ligarGerador(); break;
    case 'porta'  : somPortaAbrindo(); break;
    case 'fechar' : somPortaFechando(); break;
    case 'passos' : somPassos({passos:6,aproximando:true}); break;
    case 'anomalo': somPassos({passos:7,desumano:true}); break;
    case 'morto'  : vozDeMorto('Abre a porta. Sou eu.','Kelly'); break;
    case 'mental' : leitoMental(); atualizarMental(); break;
    default       : transicaoPassos({texto:'Passos no corredor.',aproximando:true});
  }
};
