/* ================= O CORTE ENTRE CÔMODOS =================
   Trocar de cômodo era um piscar: o texto sumia e o outro cômodo já
   estava escrito. Agora existe o caminho — escurece, você ouve os
   passos, e a casa volta no último deles.

   As marcas saíram de medir a gravação, não de chute. O arquivo tem
   3,082 s e 10 passos numa cadência firme de ~0,27 s; os impactos
   caem em 0,295 0,600 0,870 1,180 1,430 1,705 1,945 2,225 2,490 2,755.

   A janela usada é 0,295 → 1,275: quatro passos, 0,980 s. Ela começa
   exatamente num impacto — sem aquele instante de silêncio no começo
   que denuncia o corte — e termina no vão depois do quarto passo,
   antes do quinto, então nada é cortado no meio. Os 20 ms que sobram
   do orçamento de 1 s ficam de folga.

   Dentro da janela os pés batem em 0, 0,305, 0,575 e 0,885. A tela é
   presa nesses quatro: escurece no primeiro, o cômodo troca no escuro,
   e a volta é sincronizada pra imagem chegar junto com o quarto pé no
   chão — a casa aparece com o passo, não depois dele. */

const PASSOS_CORTE='@@PASSOS_CORTE@@';

const CORTE={
  ini   : 0.295,   // onde a janela começa dentro do arquivo
  dur   : 0.980,   // quatro passos
  fecha : 120,     // ms até o preto total, em cima do 1º passo
  troca : 140,     // ms: o cômodo muda aqui, sem ninguém ver
  abre  : 800,     // ms: começa a volta
  volta : 180      // ms de volta — termina em 980, com o 4º passo em 885
};

/* ---------- a gravação ---------- */
let _clipe=null, _clipePedido=false;

function pedirClipe(){
  if(_clipePedido||!A.ctx||!PASSOS_CORTE||PASSOS_CORTE.indexOf('base64')<0)return;
  _clipePedido=true;
  try{
    const b64=PASSOS_CORTE.slice(PASSOS_CORTE.indexOf(',')+1);
    const bin=atob(b64), u8=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    A.ctx.decodeAudioData(u8.buffer,b=>{_clipe=b},()=>{_clipe=null});
  }catch(e){ _clipe=null; }
}
function temClipe(){ return !!_clipe; }

function tocarCorte(pan){
  if(!_clipe||!A.ctx)return;
  const t=A.ctx.currentTime+.01;
  const s=A.ctx.createBufferSource(); s.buffer=_clipe;
  const g=A.ctx.createGain();
  /* a gravação tem pico 0,122 — baixa pro mix deste jogo, então sobe
     um pouco antes de entrar na saída, que já tem o teto por cima */
  g.gain.setValueAtTime(1.55,t);
  /* o fim da janela cai num vão, mas uma descida curta garante que
     nunca sobre um clique se o arquivo for reprocessado */
  g.gain.setValueAtTime(1.55,t+CORTE.dur-.055);
  g.gain.linearRampToValueAtTime(0,t+CORTE.dur);
  s.connect(g); saida(g,{pan:pan||0,rev:.42});
  s.start(t,CORTE.ini,CORTE.dur);
  s.stop(t+CORTE.dur+.02);
}

/* ---------- a tela ---------- */
function garantirCorte(){
  let el=document.getElementById('corte');
  if(el)return el;
  const st=document.createElement('style');
  st.id='corte-estilo';
  st.textContent=
  '#corte{position:fixed;inset:0;z-index:96;background:#000;opacity:0;'+
  'pointer-events:none;will-change:opacity}'+
  '#corte.fechando{opacity:1;transition:opacity '+CORTE.fecha+'ms ease-in;pointer-events:auto}'+
  /* a volta soma uma classe em vez de trocar: tirando `fechando` antes,
     o preto saltava pra transparente sem transição nenhuma e a volta
     "fluida" não acontecia. Dois seletores juntos pesam mais que um,
     então este vence sem precisar de !important — e sem reflow no meio,
     que é o que matava a animação. */
  '#corte.fechando.abrindo{opacity:0;transition:opacity '+CORTE.volta+'ms cubic-bezier(.16,.84,.44,1)}'+
  /* a casa se assenta em vez de simplesmente aparecer */
  '#app{transform-origin:50% 46%}'+
  '#app.assentando{transform:scale(1.028);will-change:transform}'+
  '#app.assentado{transform:scale(1);transition:transform '+
    (CORTE.volta+90)+'ms cubic-bezier(.16,.84,.44,1)}'+
  '@media(prefers-reduced-motion:reduce){'+
  '#corte.fechando,#corte.abrindo{transition-duration:60ms}'+
  '#app.assentando,#app.assentado{transform:none;transition:none}}';
  document.head.appendChild(st);
  el=document.createElement('div');
  el.id='corte';
  document.body.appendChild(el);
  return el;
}

/* ---------- o corte ---------- */
let _cortando=false, _panCorte=0;

function cortarPara(fazer,pan){
  const el=garantirCorte(), app=document.getElementById('app');
  _cortando=true;
  tocarCorte(pan);

  el.classList.remove('abrindo');
  /* força o quadro antes de animar, senão o navegador junta as duas
     mudanças de classe e o escurecer não acontece */
  void el.offsetWidth;
  el.classList.add('fechando');
  if(app)app.classList.add('assentando');

  return new Promise(resolve=>{
    /* o cômodo troca no escuro */
    setTimeout(()=>{ try{fazer()}catch(e){ console.error(e); } },CORTE.troca);
    /* e volta com o último passo */
    setTimeout(()=>{
      el.classList.add('abrindo');
      if(app){ app.classList.remove('assentando'); app.classList.add('assentado'); }
    },CORTE.abre);
    setTimeout(()=>{
      el.classList.remove('fechando','abrindo');
      if(app)app.classList.remove('assentado');
      _cortando=false;
      resolve();
    },CORTE.dur*1000);
  });
}

/* ---------- entra no lugar do piscar ----------
   Só quando o cômodo muda de verdade: os vários botões "Voltar" da
   casa chamam irPara com o cômodo em que você já está, e escurecer a
   tela pra continuar no mesmo lugar seria mentira. */
if(typeof irPara==='function'){
  const _irParaBase=irPara;
  window.irPara=function(id,semTexto){
    pedirClipe();
    const onde=cena&&cena.casa?cena.casa.voce:null;
    if(_cortando||onde==null||onde===id||!temClipe())
      return _irParaBase(id,semTexto);
    const pan=_panCorte; _panCorte=0;
    return cortarPara(()=>_irParaBase(id,semTexto),pan);
  };
}

/* O jogo já dizia a direção do passo um instante antes de trocar de
   cômodo. Em vez de tocar os passos sintetizados por cima da gravação,
   guardamos só a direção e deixamos o corte usar ela. */
if(typeof passosAndando==='function'){
  const _andandoBase=passosAndando;
  window.passosAndando=function(pan){
    if(!temClipe())return _andandoBase(pan);
    _panCorte=pan||0;
  };
}

/* a gravação é decodificada assim que houver áudio, pra o primeiro
   corte do dia não ser o único sem som */
if(typeof iniciarAudio==='function'){
  const _iniAudioBase=iniciarAudio;
  window.iniciarAudio=function(){
    const r=_iniAudioBase.apply(this,arguments);
    try{ pedirClipe(); }catch(e){}
    return r;
  };
}
