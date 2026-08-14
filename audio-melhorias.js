/* ============================================================
   NÃO ABRA — melhorias de áudio (v48)

   Carregue ESTE arquivo DEPOIS do <script> principal do jogo.
   Ele sobrescreve as funções de som que já existem e acrescenta
   as novas. Nada precisa ser apagado do arquivo original.

   O que muda:
   1. gerador  — motor diesel de verdade, sem o zumbido estourado
   2. porta    — ferrolho, rangido de dobradiça e batente
   3. passos   — pisadas humanas por superfície
   4. transição de tela preta + passos
   5. casa quieta — só o gerador ao fundo
   ============================================================ */
(function(){
'use strict';

if(typeof A==='undefined'||typeof saida!=='function'){
  console.warn('[som] carregue audio-melhorias.js DEPOIS do script principal');
  return;
}

/* ---------- ajustes de gosto: mexa só aqui ---------- */
const SOM = window.SOM = {
  gerador  : { vol:.085, pan:-.22, rev:.26, rpm:29, engasgo:true },
  casa     : { vento:.045, inquietacao:.25, silencio:true },
  porta    : { vol:.9 },
  passos   : { vol:1.30, superficie:'madeira' },
  transicao: { escuro:1000, fade:280 }
};

/* ---------- utilidades ---------- */
function ok(){
  if(!A.ctx||!A.ruido)return false;
  if(A.ctx.state==='suspended'){
    try{ const r=A.ctx.resume(); if(r&&r.catch) r.catch(()=>{}); }catch(e){}
  }
  return true;
}
function agora(){ return A.ctx.currentTime; }
function ruido(){ const s=A.ctx.createBufferSource(); s.buffer=A.ruido; s.loop=true; return s; }
function lfo(f){ const o=A.ctx.createOscillator(); o.type='sine'; o.frequency.value=f; return o; }
function liga(fonte,destino,ganho){
  const g=A.ctx.createGain(); g.gain.value=ganho; fonte.connect(g); g.connect(destino); return g;
}
function espera(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* saturação suave: substitui o clipping duro por compressão de fita */
function curvaSuave(k){
  const n=1024,c=new Float32Array(n),d=Math.tanh(k);
  for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(x*k)/d; }
  return c;
}
/* pulso arredondado e limitado em banda — é o que troca a onda quadrada
   do pistão antigo, que estalava a cada ciclo */
function ondaPulso(){
  const h=[0,1,.78,.52,.30,.14,.06];
  const re=new Float32Array(h.length), im=new Float32Array(h.length);
  for(let i=0;i<h.length;i++) re[i]=h[i];
  return A.ctx.createPeriodicWave(re,im);
}
/* passeio aleatório puxado para uma base móvel — dá o tremor irregular
   que faz o rangido soar como madeira e não como sintetizador */
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

/* ============================================================
   1. GERADOR
   O problema do som antigo: um dente-de-serra de 42 Hz ia direto
   para a saída (harmônicos ásperos até o topo da banda), com
   vibrato de ±10 Hz, e o "pistão" era uma onda quadrada de 9,6 Hz
   — abaixo da audição, ela vira um degrau de tensão que estoura o
   alto-falante do celular.

   Agora: fundamental + 2ª ordem em formas mansas, combustão feita
   com ruído de banda modulado em amplitude por um pulso arredondado,
   e todo o motor passa por um barramento com corte de subgraves,
   passa-baixa, saturação suave e limitador.
   ============================================================ */

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

  const s=ruido(),f=A.ctx.createBiquadFilter(),ng=A.ctx.createGain();
  f.type='lowpass'; f.frequency.value=300;
  ng.gain.setValueAtTime(0,t);
  ng.gain.linearRampToValueAtTime(.16*vol,t+.010);
  ng.gain.exponentialRampToValueAtTime(.0008,t+.22);
  s.connect(f); f.connect(ng); saida(ng,{pan:SOM.gerador.pan,rev:.40});
  s.start(t); s.stop(t+.24);
}

window.ligarGerador = function(){
  if(!ok()||A.ger)return;
  const t=agora(), f0=SOM.gerador.rpm;

  /* --- barramento do motor: é aqui que o "estourado" morre --- */
  const hp=A.ctx.createBiquadFilter();
  hp.type='highpass'; hp.frequency.value=26; hp.Q.value=.6;   // tira o sub que bate no cone
  const lp=A.ctx.createBiquadFilter();
  lp.type='lowpass'; lp.frequency.value=430; lp.Q.value=.4;   // motor é grave, não é serra
  const forma=A.ctx.createWaveShaper();
  forma.curve=curvaSuave(1.35); forma.oversample='2x';        // satura macio em vez de ceifar
  const lim=A.ctx.createDynamicsCompressor();
  lim.threshold.value=-20; lim.knee.value=8; lim.ratio.value=12;
  lim.attack.value=.004;   lim.release.value=.14;
  const mestre=A.ctx.createGain(); mestre.gain.value=0;
  mestre.connect(hp); hp.connect(lp); lp.connect(forma); forma.connect(lim);
  saida(lim,{pan:SOM.gerador.pan,rev:SOM.gerador.rev});

  /* --- rotação: fundamental + segunda ordem --- */
  const oRot=A.ctx.createOscillator(); oRot.type='triangle';
  const gRot=A.ctx.createGain(); gRot.gain.value=.30;
  oRot.connect(gRot); gRot.connect(mestre);

  const oH=A.ctx.createOscillator(); oH.type='sine';
  const gH=A.ctx.createGain(); gH.gain.value=.12;
  oH.connect(gH); gH.connect(mestre);

  /* --- alternador: fio fino de zumbido metálico --- */
  const oAlt=A.ctx.createOscillator(); oAlt.type='sine';
  const gAlt=A.ctx.createGain(); gAlt.gain.value=.028;
  oAlt.connect(gAlt); gAlt.connect(mestre);

  /* --- combustão: o "tuc-tuc" do diesel --- */
  const sN=ruido();
  const bpN=A.ctx.createBiquadFilter();
  bpN.type='bandpass'; bpN.frequency.value=165; bpN.Q.value=1.05;
  const amN=A.ctx.createGain(); amN.gain.value=.42;
  const oAM=A.ctx.createOscillator(); oAM.setPeriodicWave(ondaPulso());
  liga(oAM,amN.gain,.40);
  const gN=A.ctx.createGain(); gN.gain.value=.30;
  sN.connect(bpN); bpN.connect(amN); amN.connect(gN); gN.connect(mestre);

  /* --- deriva de rotação: motor vivo, sem vibrato de teclado --- */
  const dr1=lfo(.055), dr2=lfo(.017);
  liga(dr1,oRot.frequency,.55); liga(dr2,oRot.frequency,.35);
  liga(dr1,oH.frequency ,1.10); liga(dr2,oH.frequency ,.70);
  liga(dr1,oAM.frequency,.16 ); liga(dr2,oAM.frequency,.10);

  /* --- partida: pega, acelera demais, assenta --- */
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
  const t=agora(), p=Math.max(0,Math.min(1,pct/100)), G=A.ger;
  const f=G.f0*(.84+.16*p);          // tanque baixo, motor mais lento e mais pesado
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
      const t=agora(), v=G.mestre.gain.value, f=G.fAtual;
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
  const t=agora(), G=A.ger; A.ger=null;
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

/* ============================================================
   2. PORTA
   ============================================================ */

function ferrolho(t,pan,vol,rev){
  const s=ruido(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();
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

  // madeira sob tensão: o "iiiii" agudo, limitado antes do filtro ressonante
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
  const s=ruido(),nf=A.ctx.createBiquadFilter(),ng=A.ctx.createGain();
  nf.type='bandpass'; nf.Q.value=5;
  nf.frequency.setValueCurveAtTime(curvaTremida(n,600,1700,140,.12),t,dur);
  const e2=curvaRangido(n); for(let i=0;i<n;i++) e2[i]*=.15*vol;
  ng.gain.value=0;
  ng.gain.setValueCurveAtTime(e2,t,dur);
  s.connect(nf); nf.connect(ng); saida(ng,{pan,rev});
  s.start(t); s.stop(t+dur+.05);
}

function arrasto(t,dur,pan,vol,rev){
  const s=ruido(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();
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

/* o ar de fora entrando — vai quase todo para a reverberação */
function lufada(t,dur,pan,vol){
  const s=ruido(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();
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

  const s=ruido(),f=A.ctx.createBiquadFilter(),ng=A.ctx.createGain();
  f.type='lowpass'; f.frequency.value=520;
  ng.gain.setValueAtTime(0,t);
  ng.gain.linearRampToValueAtTime(.39*vol,t+.005);
  ng.gain.exponentialRampToValueAtTime(.0008,t+.18);
  s.connect(f); f.connect(ng); saida(ng,{pan,rev});
  s.start(t); s.stop(t+.20);
}

window.somPortaAbrindo = function(op){
  op=op||{};
  if(!ok())return 0;
  const t0  = agora()+(op.atraso||0);
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
  if(!ok())return 0;
  const t0  = agora()+(op.atraso||0);
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

/* ============================================================
   3. PASSOS
   ============================================================ */

const SUP={
  madeira : {corte:900 ,q:.9 ,corpo:88,res:[150,230],resVol:.10,scuff:.045},
  escada  : {corte:1100,q:1.0,corpo:96,res:[190,300],resVol:.13,scuff:.050},
  concreto: {corte:1700,q:1.1,corpo:74,res:[380,620],resVol:.03,scuff:.075},
  terra   : {corte:480 ,q:.7 ,corpo:66,res:[110,160],resVol:.02,scuff:.055}
};

function passo(t,op){
  const S=SUP[op.superficie]||SUP.madeira;
  const f=op.forca, pan=op.pan, rev=op.rev;

  // o peso do corpo chegando no chão
  const o=A.ctx.createOscillator(),og=A.ctx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(S.corpo*(.9+Math.random()*.2),t);
  o.frequency.exponentialRampToValueAtTime(S.corpo*.52,t+.085);
  og.gain.setValueAtTime(0,t);
  og.gain.linearRampToValueAtTime(.30*f,t+.006);
  og.gain.exponentialRampToValueAtTime(.0008,t+.16);
  o.connect(og); saida(og,{pan,rev:rev*.7}); o.start(t); o.stop(t+.18);

  // o solado batendo
  const s=ruido(),nf=A.ctx.createBiquadFilter(),ng=A.ctx.createGain();
  nf.type='lowpass'; nf.frequency.value=S.corte*(.85+Math.random()*.3); nf.Q.value=S.q;
  ng.gain.setValueAtTime(0,t);
  ng.gain.linearRampToValueAtTime(.24*f,t+.004);
  ng.gain.exponentialRampToValueAtTime(.0008,t+.10);
  s.connect(nf); nf.connect(ng); saida(ng,{pan,rev}); s.start(t); s.stop(t+.12);

  // a tábua respondendo depois — é isso que dá o assoalho velho
  if(S.resVol>0){
    const r=A.ctx.createOscillator(),rg=A.ctx.createGain();
    r.type='triangle';
    r.frequency.value=S.res[0]+Math.random()*(S.res[1]-S.res[0]);
    rg.gain.value=0;                                   // sem isso o nó toca em escala cheia
    rg.gain.setValueAtTime(0,t);                       // até a primeira automação
    rg.gain.linearRampToValueAtTime(S.resVol*f,t+.010);
    rg.gain.exponentialRampToValueAtTime(.0008,t+.34);
    r.connect(rg); saida(rg,{pan,rev:rev*1.15}); r.start(t); r.stop(t+.36);
  }

  // o pé arrastando ao sair
  const t2=t+.05+Math.random()*.04;
  const s2=ruido(),hf=A.ctx.createBiquadFilter(),hg=A.ctx.createGain();
  hf.type='highpass'; hf.frequency.value=1800;
  hg.gain.setValueAtTime(0,t2);
  hg.gain.linearRampToValueAtTime(S.scuff*f,t2+.012);
  hg.gain.exponentialRampToValueAtTime(.0008,t2+.07);
  s2.connect(hf); hf.connect(hg); saida(hg,{pan,rev:rev*.6}); s2.start(t2); s2.stop(t2+.09);
}

window.somPassos = function(op){
  op=op||{};
  if(!ok())return 0;
  const n     = op.passos||6;
  const ritmo = op.ritmo ||.46;
  const sup   = op.superficie||SOM.passos.superficie;
  const base  = (op.forca!==undefined?op.forca:.85)*SOM.passos.vol;
  const pan0  = op.pan||0;
  const apro  = !!op.aproximando, afast = !!op.afastando;
  let t = agora()+(op.atraso!==undefined?op.atraso:.08);

  for(let i=0;i<n;i++){
    const p = n>1 ? i/(n-1) : 1;
    let f = base, rev = op.rev!==undefined?op.rev:.40;
    if(apro)       { f=base*(.32+.85*p); rev=.85-.55*p; }   // vem chegando: mais perto, menos eco
    else if(afast) { f=base*(1.05-.75*p); rev=.28+.60*p; }
    passo(t,{forca:f,pan:pan0+(i%2?.13:-.13),rev,superficie:sup});
    const longo=(i%2)?1.06:.94;                              // marcha humana não é metrônomo
    t += ritmo*longo*(.94+Math.random()*.12);
  }
  return t-agora();
};

/* ============================================================
   4. TRANSIÇÃO: tela preta + passos
   ============================================================ */

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

/* Sequência: escurece -> 1s de breu (só o gerador ao fundo) -> passos ->
   aoFim() ainda no escuro -> volta. Devolve uma Promise. */
window.transicaoPassos = function(op){
  op=op||{};
  const el=garantirEscuro();
  const alvo=el.querySelector('p');
  const fade=SOM.transicao.fade;
  const breu=op.escuro!==undefined?op.escuro:SOM.transicao.escuro;

  alvo.textContent=op.texto||'';
  el.classList.add('vis');

  return espera(fade+40)
    .then(()=>espera(breu))
    .then(()=>{
      const dur=window.somPassos({
        passos:op.passos, ritmo:op.ritmo, superficie:op.superficie,
        aproximando:op.aproximando, afastando:op.afastando,
        forca:op.forca, pan:op.pan, atraso:.05
      });
      return espera(Math.round(dur*1000)+(op.sobra!==undefined?op.sobra:420));
    })
    .then(()=>{
      if(typeof op.aoFim==='function'){ try{op.aoFim()}catch(e){console.error(e)} }
      el.classList.remove('vis');
      return espera(fade+40);
    })
    .then(()=>{ alvo.textContent=''; });
};

/* ============================================================
   5. A CASA FICA QUIETA
   Sem grilo, sem gotejo, sem roçado. Só um leito de vento muito
   baixo e, raramente e só sob tensão alta, um estalo discreto.
   ============================================================ */

function estaloLeve(){
  if(!ok())return;
  const t=agora();
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
  if(!ok()||A.amb.on)return;
  A.amb.on=true;
  const t=agora();
  const s=ruido();
  const hp=A.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=60;
  const f =A.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=260; f.Q.value=.4;
  const g =A.ctx.createGain(); g.gain.value=0;
  g.gain.linearRampToValueAtTime(SOM.casa.vento,t+6);
  const l=lfo(.035); liga(l,f.frequency,70); l.start(t);
  s.connect(hp); hp.connect(f); f.connect(g); saida(g,{rev:.5}); s.start(t);
  A.amb.vento={s,g,f,lfo:l};
  window.agendarInquietacao();
};

window.agendarInquietacao = function(){
  if(!A.ctx)return;
  clearTimeout(A.amb.timer);
  if(SOM.casa.inquietacao<=0)return;
  const espera=(26000+Math.random()*34000)/(1+A.tensao*1.6);
  A.amb.timer=setTimeout(()=>{
    // a casa só fala quando a tensão justifica; o resto do tempo é o gerador
    if(A.tensao>.42 && Math.random()<SOM.casa.inquietacao) estaloLeve();
    window.agendarInquietacao();
  },Math.max(9000,espera));
};

/* usa se o ambiente já estava tocando alto e você quer baixar em cena */
window.acalmarCasa = function(){
  if(!A.ctx)return;
  clearTimeout(A.amb.timer);
  if(A.amb.vento) A.amb.vento.g.gain.linearRampToValueAtTime(SOM.casa.vento,agora()+3);
  window.agendarInquietacao();
};

/* ---------- atalho para testar no console ---------- */
window.testarSom = function(qual){
  if(!ok()){ console.warn('[som] toque na tela primeiro (o áudio precisa de um gesto)'); return; }
  switch(qual){
    case 'gerador' : window.ligarGerador(); break;
    case 'porta'   : window.somPortaAbrindo(); break;
    case 'fechar'  : window.somPortaFechando(); break;
    case 'passos'  : window.somPassos({passos:6,aproximando:true}); break;
    default        : window.transicaoPassos({texto:'Passos no corredor.',aproximando:true});
  }
};

})();
