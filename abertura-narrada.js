/* ================= A ABERTURA NARRADA =================
   O jogo começava no pedido de nome. Agora começa com a história sendo
   contada em voz alta, no escuro, e as palavras entrando no ritmo da voz.

   As marcas de tempo abaixo não foram estimadas: saíram de medir o
   próprio arquivo. O envelope RMS em janelas de 20 ms, com corte de
   silêncio em 6% do pico, encontra 24 blocos de fala separados por
   respiradas de 0,38 s a 0,80 s — e esses 24 blocos caem exatamente nos
   8 parágrafos do texto. Cada parágrafo lista os blocos em que ele é
   dito, então as palavras acompanham a narração de verdade, inclusive
   parando nas respiradas do meio da frase.

   Quem manda no relógio é o áudio, não um cronômetro nosso: a cada
   quadro a tela pergunta a `currentTime` da voz. Num aparelho lento,
   ou se a decodificação engasgar, o texto anda junto com o que está
   realmente saindo pelo alto-falante em vez de desgarrar. Se o áudio
   não tocar de jeito nenhum, um relógio de parede assume e a história
   continua sendo contada, muda — dá pra ler, que é o que importa. */

const VOZ_ABERTURA='@@VOZ_ABERTURA@@';

const HISTORIA=[
 {t:'Você trancou a porta faz três dias e não abriu mais.',
  b:[[0.10,2.06],[2.56,4.34]]},

 {t:'O gerador no barracão roda a noite inteira.',
  b:[[5.04,7.78]]},

 {t:'O barulho dele enche a rua e faz uma casa parecer com a outra — é por isso que ele importa mais que a luz.',
  b:[[8.44,10.14],[10.56,13.96],[14.64,16.94],[17.74,19.48]]},

 {t:'De dia dá pra sair. De noite, não.',
  b:[[20.18,21.58],[22.12,22.80]]},

 {t:'E de noite alguém bate.',
  b:[[23.14,23.86],[24.06,24.14]]},

 {t:'Às vezes é gente. Às vezes é uma coisa que aprendeu a voz de alguém que morreu, e que quer que você abra.',
  b:[[24.66,26.14],[26.74,28.04],[28.24,30.78],[31.18,32.60],[33.40,34.82],[35.06,35.90]]},

 {t:'Não tem como saber olhando. Só dá pra checar, uma coisa de cada vez, e decidir com o que você juntou.',
  b:[[36.60,37.60],[37.98,39.60],[40.12,41.04],[41.26,43.00],[43.64,45.28]]},

 {t:'Você vai errar. A questão é errar pra qual lado.',
  b:[[45.94,46.80],[47.26,49.24]]}
];

const FIM_NARRACAO=49.24;

/* ---------- o relógio interno do parágrafo ----------
   Converte "fração da fala" em instante do arquivo pulando as
   respiradas: nenhuma palavra aparece durante um silêncio. */
function instanteNaFala(p,f){
  const durs=p.b.map(b=>b[1]-b[0]);
  const total=durs.reduce((a,x)=>a+x,0);
  let alvo=Math.max(0,Math.min(1,f))*total;
  for(let i=0;i<p.b.length;i++){
    if(alvo<=durs[i])return p.b[i][0]+alvo;
    alvo-=durs[i];
  }
  return p.b[p.b.length-1][1];
}

/* Cada palavra ganha o instante em que deve aparecer, pesada pelo
   tamanho: palavra comprida leva mais tempo pra ser dita que "e". */
function marcarPalavras(p){
  const palavras=p.t.split(/\s+/).filter(Boolean);
  const pesos=palavras.map(w=>w.length+1);
  const soma=pesos.reduce((a,x)=>a+x,0);
  let acc=0;
  return palavras.map((w,i)=>{
    const entra=instanteNaFala(p,acc/soma);
    acc+=pesos[i];
    return {w,entra};
  });
}

/* ---------- o fundo ----------
   Tudo construído no motor de áudio que o jogo já carrega: nenhum
   arquivo a mais. O leito fica baixo de propósito — a voz do arquivo
   toca fora do grafo do jogo, e o que ela precisa é de espaço. */
let _cineFundo=null;

function fundoAbertura(){
  if(!A.ctx)return;
  const t=A.ctx.currentTime, nos=[];

  /* pressão de sub: o cômodo tem peso antes de ter som */
  const sub=A.ctx.createOscillator(),subG=A.ctx.createGain();
  sub.type='sine'; sub.frequency.setValueAtTime(38,t);
  sub.frequency.linearRampToValueAtTime(31,t+FIM_NARRACAO);
  subG.gain.setValueAtTime(0,t);
  subG.gain.linearRampToValueAtTime(.055,t+4);
  sub.connect(subG); saida(subG,{rev:.2}); sub.start(t); nos.push(sub);

  /* ar parado: sopro largo, sem direção */
  const ar=src(),arF=A.ctx.createBiquadFilter(),arG=A.ctx.createGain();
  arF.type='bandpass'; arF.frequency.value=340; arF.Q.value=.55;
  arG.gain.setValueAtTime(0,t);
  arG.gain.linearRampToValueAtTime(.030,t+5);
  ar.connect(arF); arF.connect(arG); saida(arG,{rev:.85}); ar.start(t); nos.push(ar);

  /* respiração lenta do ar, pra não virar chiado parado */
  const resp=A.ctx.createOscillator(),respG=A.ctx.createGain();
  resp.type='sine'; resp.frequency.value=.075; respG.gain.value=.010;
  resp.connect(respG); respG.connect(arG.gain); resp.start(t); nos.push(resp);

  _cineFundo={nos,sub:subG,ar:arG};
}

function calarFundo(){
  if(!_cineFundo||!A.ctx)return;
  const t=A.ctx.currentTime,F=_cineFundo; _cineFundo=null;
  F.sub.gain.cancelScheduledValues(t); F.sub.gain.setValueAtTime(F.sub.gain.value,t);
  F.sub.gain.linearRampToValueAtTime(0,t+1.6);
  F.ar.gain.cancelScheduledValues(t); F.ar.gain.setValueAtTime(F.ar.gain.value,t);
  F.ar.gain.linearRampToValueAtTime(0,t+1.6);
  setTimeout(()=>F.nos.forEach(n=>{try{n.stop()}catch(e){}}),1900);
}

/* Os toques do fundo, cada um casado com o que a voz está dizendo.
   O gerador entra junto com a frase que fala dele e fica ligado: é o
   mesmo motor que vai estar rodando quando o jogo começar. */
const MARCAS_FUNDO=[
 {s:4.70, f:()=>{ try{ligarGerador(); setTimeout(()=>{try{ajustarGerador(38)}catch(e){}},2400);}catch(e){} }},
 {s:24.20,f:()=>{ try{batida(3,.80,0)}catch(e){} }},
 {s:26.60,f:()=>{ try{sussurro(7,-.32,.040)}catch(e){} }},
 {s:30.40,f:()=>{ try{sussurro(6,.34,.034)}catch(e){} }},
 {s:33.60,f:()=>{ try{sussurro(5,-.18,.030)}catch(e){} }},
 {s:45.30,f:()=>{ try{batida(1,.55,-.15)}catch(e){} }}
];

/* ---------- a tela ---------- */
function montarTelaAbertura(){
  const st=document.createElement('style');
  st.id='cine-estilo';
  st.textContent=`
#cine{position:fixed;inset:0;z-index:120;background:#07060A;display:flex;
  align-items:center;justify-content:center;padding:34px 26px 76px;
  opacity:0;transition:opacity .9s ease}
#cine.vis{opacity:1}
#cine.saindo{opacity:0;transition:opacity 1.1s ease}
/* o lampião respirando atrás do texto */
#cine::before{content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(58% 42% at 50% 44%,rgba(201,162,39,.085),transparent 70%);
  animation:cine-lampiao 7.5s ease-in-out infinite}
/* canto escuro: a sala não acaba, só some */
#cine::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(75% 60% at 50% 48%,transparent 42%,rgba(0,0,0,.72) 100%)}
@keyframes cine-lampiao{0%,100%{opacity:.72}47%{opacity:1}}
#cine-txt{position:relative;z-index:2;max-width:32ch;text-align:center;
  font-family:var(--corpo);font-size:clamp(19px,5.3vw,27px);line-height:1.66;
  color:#E2DCCE;text-wrap:pretty;text-shadow:0 1px 14px rgba(0,0,0,.85)}
#cine-txt.trocando{opacity:0;transition:opacity .42s ease}
#cine-txt .p{opacity:0;filter:blur(5px);transition:opacity .5s ease,filter .5s ease}
#cine-txt .p.dita{opacity:1;filter:blur(0)}
/* a última fala é a que morde */
#cine.fecho #cine-txt{color:#E6DACB}
#cine.fecho::before{background:radial-gradient(58% 42% at 50% 44%,rgba(140,47,30,.13),transparent 70%)}
/* a fresta embaixo da porta, que cresce quando ela é mencionada */
#cine-fresta{position:absolute;left:50%;bottom:0;transform:translateX(-50%);
  width:min(300px,62vw);height:2px;z-index:1;
  background:linear-gradient(90deg,transparent,rgba(201,162,39,.5),transparent);
  opacity:0;transition:opacity 1.4s ease,filter 1.4s ease;filter:blur(1px)}
#cine-fresta.acesa{opacity:.85;filter:blur(3px)}
#cine-barra{position:absolute;left:0;right:0;bottom:0;height:2px;z-index:3;
  background:rgba(255,255,255,.05)}
#cine-barra i{display:block;height:100%;width:0;background:rgba(201,162,39,.42)}
/* o jogo estica todo button na largura da tela; aqui não */
#cine-pular{position:absolute;right:14px;bottom:16px;z-index:4;
  width:auto;display:inline-flex;justify-content:center;text-align:center;
  font-family:var(--mostrador);font-size:10px;letter-spacing:.15em;text-transform:uppercase;
  color:var(--mofo);background:rgba(11,10,13,.6);border:1px solid #2A232E;border-radius:2px;
  padding:10px 15px;line-height:1;opacity:.55;transition:opacity .3s ease,color .3s ease;cursor:pointer}
#cine-pular:hover,#cine-pular:focus{opacity:1;color:var(--lampiao)}
#cine-pular:active{transform:none;background:rgba(26,22,31,.9)}
@media (prefers-reduced-motion:reduce){
  #cine::before{animation:none}
  #cine-txt .p{transition:opacity .2s linear;filter:none}
}`;
  document.head.appendChild(st);

  const el=document.createElement('div');
  el.id='cine';
  el.innerHTML='<div id="cine-fresta"></div><div id="cine-txt"></div>'
    +'<div id="cine-barra"><i></i></div>'
    +'<button id="cine-pular" type="button">pular</button>';
  document.body.appendChild(el);
  return el;
}

/* ---------- contar ---------- */
let _jaContou=false;

function contarHistoria(){
  return new Promise(resolve=>{
    let acabou=false;
    const el=montarTelaAbertura();
    const TX=el.querySelector('#cine-txt');
    const BA=el.querySelector('#cine-barra i');
    const FR=el.querySelector('#cine-fresta');
    requestAnimationFrame(()=>el.classList.add('vis'));

    const paras=HISTORIA.map(p=>({...p, ini:p.b[0][0], fim:p.b[p.b.length-1][1], palavras:marcarPalavras(p)}));
    /* `atual` é o parágrafo que a voz está dizendo; `naTela` é o que está
       escrito. Entre um e outro existem 420 ms de fade, e nesse vão os
       dois não são o mesmo — sem separar, os horários do parágrafo novo
       caíam sobre as palavras do velho e a frase que ia sair se apagava
       palavra por palavra na cara de quem estava lendo. */
    let atual=-1, naTela=-1;

    /* a voz */
    let au=null, tocando=false;
    try{
      au=new Audio(VOZ_ABERTURA);
      au.preload='auto';
      au.addEventListener('ended',()=>fechar(1200));
    }catch(e){ au=null; }

    /* o relógio de parede, pra quando o áudio não puder tocar */
    const t0=performance.now();
    const agora=()=> (tocando&&au&&au.currentTime>0) ? au.currentTime : (performance.now()-t0)/1000;

    let marcaFundo=0;
    fundoAbertura();

    function trocarPara(i){
      atual=i;
      const p=paras[i];
      TX.classList.add('trocando');
      setTimeout(()=>{
        if(acabou)return;
        TX.innerHTML='';
        p.palavras.forEach(x=>{
          const s=document.createElement('span');
          s.className='p'; s.textContent=x.w;
          TX.appendChild(s); TX.appendChild(document.createTextNode(' '));
        });
        naTela=i;
        TX.classList.remove('trocando');
      },i===0?0:420);
      /* a última fala muda a cor da sala */
      el.classList.toggle('fecho',i===paras.length-1);
      /* a fresta acende quando alguém bate e não apaga mais */
      if(i>=4)FR.classList.add('acesa');
    }

    function quadro(){
      if(acabou)return;
      const s=agora();

      /* fundo: cada marca dispara uma vez só */
      while(marcaFundo<MARCAS_FUNDO.length&&s>=MARCAS_FUNDO[marcaFundo].s){
        MARCAS_FUNDO[marcaFundo].f(); marcaFundo++;
      }

      /* qual parágrafo está no ar */
      let alvo=0;
      for(let i=0;i<paras.length;i++) if(s>=paras[i].ini-.45) alvo=i;
      if(alvo!==atual)trocarPara(alvo);

      /* quais palavras já foram ditas — só mexe se o que está escrito
         na tela é o parágrafo de que estamos falando */
      const p=paras[naTela];
      if(p&&naTela===atual){
        const spans=TX.querySelectorAll('.p');
        for(let i=0;i<spans.length&&i<p.palavras.length;i++){
          const devia=s>=p.palavras[i].entra;
          if(devia!==spans[i].classList.contains('dita'))
            spans[i].classList.toggle('dita',devia);
        }
      }

      BA.style.width=Math.min(100,s/FIM_NARRACAO*100).toFixed(1)+'%';

      if(s>=FIM_NARRACAO+1.4)return fechar(900);
      requestAnimationFrame(quadro);
    }

    function fechar(espera){
      if(acabou)return;
      acabou=true;
      try{ if(au){au.pause(); au.currentTime=0;} }catch(e){}
      calarFundo();
      el.classList.add('saindo');
      setTimeout(()=>{
        try{el.remove()}catch(e){}
        const st=document.getElementById('cine-estilo');
        if(st)st.remove();
        resolve();
      },espera||900);
    }

    el.querySelector('#cine-pular').onclick=e=>{ e.stopPropagation(); fechar(420); };

    /* tocar precisa do gesto que já aconteceu no botão do lampião;
       se mesmo assim o navegador recusar, a história é contada muda */
    if(au){
      const pr=au.play();
      if(pr&&pr.then)pr.then(()=>{tocando=true}).catch(()=>{tocando=false});
      else tocando=true;
    }
    requestAnimationFrame(quadro);
  });
}

/* ---------- entra antes do pedido de nome ----------
   Só em partida nova: quem está voltando pra uma casa que já existe
   não precisa ouvir de novo por que a porta está trancada. E a espera
   se declara ao vigia, como toda espera de propósito deste jogo. */
if(typeof pedirNome==='function'){
  const _pedirNomeBase=pedirNome;
  window.pedirNome=function(b){
    if(_jaContou||!VOZ_ABERTURA||VOZ_ABERTURA.indexOf('base64')<0)
      return _pedirNomeBase(b);
    _jaContou=true;
    if(b)b.style.visibility='hidden';
    const p=contarHistoria().then(()=>{
      if(b)b.style.visibility='';
      _pedirNomeBase(b);
    });
    if(typeof esperando==='function')esperando(p);
    return p;
  };
}
