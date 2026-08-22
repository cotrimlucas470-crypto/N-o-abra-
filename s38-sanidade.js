/* ============ §38 — SANIDADE: DA SUGESTÃO AO SINTOMA ============

   A queixa foi "muito sutil e sem sentido". Fui medir antes, e os dois
   adjetivos estavam certos por motivos diferentes e mensuráveis.

   SUTIL — O NÚMERO
   ----------------
   São 23 ilusões no total (6 de tela, 8 de rua, 9 de som). Numa
   campanha de 12 a 30 dias o jogador vê entre DUAS e SEIS: `talvezIlusao`
   é chamada uma vez por dia, tem trava de uma por dia, e a chance é o
   próprio valor do estágio.

   E tem coisa pior. O estágio `tenso` (sanidade 70–89) vale 0.08, e o
   menor `min` das três tabelas é 0.10:

       pool = ILUSOES.filter(i => 0.08 >= i.min)   →   VAZIO

   O estágio inteiro produz ZERO ilusões. E ele promete por escrito:

       'tenso' : 'Você ouve passo onde não tem passo.'

   Um off-by-0.02 apagando o estágio onde o jogador passa a maior parte
   do jogo, com a promessa impressa na tela. Não dava pra ser mais
   invisível.

   SEM SENTIDO — A FALTA DE CHÃO
   -----------------------------
   O §30 congelou três coisas que NUNCA mentem — relógio, inventário e
   porta da frente. Ótimo, e o jogador nunca soube: `PERCEPCAO_INVIOLAVEL`
   só era lida por função de depuração.

   Sem chão firme, duvidar não é jogar. É ruído. "Nada é confiável" não
   é uma regra: é a ausência de uma. Com três âncoras conhecidas, a
   dúvida vira trabalho — você tem onde pisar pra medir o resto.

   E as ilusões se ANUNCIAVAM: a grande abria uma tela com o título
   "Você tem certeza?". Alucinação que chega com crachá de alucinação
   não assusta ninguém.

   O QUE ENTRA
   -----------
   1 · sussurros — ilusões pequenas, feitas pro `tenso`, que chegam
       como linha de narração comum e não se anunciam
   2 · as três âncoras chegam ao jogador, e viram verbo
   3 · a sanidade vira sintoma na tela, não só nome de estágio
   4 · a ilusão passa a usar a sua rotina: ela fala do SEU cômodo
   ====================================================================== */

const SAN_CFG={
  /* chance de um sussurro ao entrar num cômodo, POR PONTO de ilusão do
     estágio. Em `tenso` (0.08) dá ~19% por cômodo; em `lúcido` dá zero,
     porque lúcido é lúcido. */
  sussurroPorIlusao: 2.4,
  /* teto por dia, pra o jogo não virar chuvisco de sussurro */
  sussurrosPorDia: 5,
  /* turnos de cômodo entre um sussurro e outro */
  intervaloSussurro: 2,
  /* quanto custa conferir uma âncora, em minutos do relógio */
  minutosAncora: 10,
  /* quanta sanidade a âncora devolve. Pouco de propósito: ela não cura,
     ela orienta. Curar de graça mataria o resto do sistema. */
  sanDaAncora: 2,
  /* o sintoma na tela começa a aparecer abaixo desta sanidade */
  sintomaAbaixoDe: 82,
  /* e vai ao máximo aqui */
  sintomaCheioEm: 15
};

/* ================= 1 · OS SUSSURROS =================
   O que faltava pro estágio `tenso`. São pequenos, negáveis, e chegam
   como qualquer outra linha do jogo — sem tela própria, sem título, sem
   pergunta. O jogador só descobre que era mentira se conferir.

   `min` baixo de propósito: eles existem PRA preencher a faixa que
   estava vazia. E não inflam número nenhum do estágio — é conteúdo novo
   na faixa certa, não multiplicador. */
const SUSSURROS=[
 /* --- faixa do `tenso`: 0.02 --- */
 {min:.02,t:()=>'Alguém falou o seu nome em outro cômodo. Baixinho.'},
 {min:.02,t:()=>'Passo no assoalho, do outro lado da parede. Um só.'},
 {min:.02,t:()=>'A porta que você fechou está encostada.'},
 {min:.02,t:()=>'Você sente cheiro de fósforo queimado. Ninguém acendeu nada.'},
 {min:.02,t:()=>'Alguma coisa raspou na parede lá fora, na altura da sua cabeça.'},
 {min:.02,t:()=>'Você ouve a sua própria respiração vindo de trás de você.'},
 {min:.02,t:()=>'Uma tábua estala como se alguém tivesse acabado de sair dali.'},
 {min:.02,t:()=>'Tem uma cadeira virada pra parede. Você não virou.'},
 /* --- a partir de `fissurado`: 0.18 --- */
 {min:.18,t:()=>{
   const p=(S.abrigo||[])[0];
   return p?`${p.n} te chamou. Quando você olha, ${p.n} está dormindo.`
           :'Alguém te chamou. Não tem mais ninguém acordado nesta casa.';}},
 {min:.18,t:()=>'A luz do corredor estava acesa. Agora não estava.'},
 {min:.18,t:()=>'Você conta as pessoas da casa duas vezes e dá números diferentes.'},
 {min:.18,t:()=>'Tem terra molhada no chão, vindo da porta até onde você está.'},
 {min:.18,t:()=>'O gerador engasgou e voltou. Ninguém mais comentou.'},
 /* --- `rachado` pra baixo: 0.34 --- */
 {min:.34,t:()=>'Você acabou de fazer isso. Você tem certeza de que acabou de fazer isso.'},
 {min:.34,t:()=>'Tem alguém do outro lado da porta imitando a sua respiração. No mesmo tempo.'},
 {min:.34,t:()=>{
   const m=(S.mortos||[])[0];
   return m?`Você ouviu a voz de ${m.n}. Curta. Do lado de dentro.`
           :'Você ouviu uma voz conhecida. Do lado de dentro.';}},
 {min:.34,t:()=>'A sua sombra na parede levou meio segundo a mais pra parar.'},
 {min:.34,t:()=>'Você olha pra sua mão e conta os dedos. Dá certo. Você conta de novo.'}
];

function sanIlusaoAtual(){
  try{ const e=estagio(); return (e&&e.ilusao)||0; }catch(err){ return 0; }
}
function sanEstado(){
  if(!S.san38||typeof S.san38!=='object')
    S.san38={sussurrosHoje:0,dia:S.dia|0,desdeUltimo:99,
      viuAncoras:false,ancorasHoje:0,pegou:0,conferiu:0};
  const m=S.san38;
  if(m.dia!==(S.dia|0)){ m.dia=S.dia|0; m.sussurrosHoje=0; m.ancorasHoje=0; }
  return m;
}

/* o sussurro sai como linha comum. É este o ponto: ele NÃO se anuncia. */
function talvezSussurro(){
  const ilu=sanIlusaoAtual();
  if(ilu<=0)return false;                       /* lúcido não sussurra */
  const m=sanEstado();
  m.desdeUltimo++;
  if(m.sussurrosHoje>=SAN_CFG.sussurrosPorDia)return false;
  if(m.desdeUltimo<SAN_CFG.intervaloSussurro)return false;
  const p=Math.min(.45,ilu*SAN_CFG.sussurroPorIlusao);
  if(!chance(p))return false;
  const pool=SUSSURROS.filter(s=>ilu>=s.min);
  if(!pool.length)return false;
  const s=pool[Math.floor((typeof rng==='function'?rng().next():Math.random())*pool.length)];
  m.sussurrosHoje++; m.desdeUltimo=0; m.pegou=(m.pegou||0)+1;
  if(typeof marcarSujo==='function')marcarSujo();
  /* classe 'narr': igual a qualquer outra linha do jogo. De propósito. */
  if(typeof diz==='function')diz(typeof s.t==='function'?s.t():s.t,'narr');
  /* a primeira vez que um sussurro pega, o jogo ensina as âncoras */
  if(!m.viuAncoras&&m.pegou>=2)setTimeout(()=>{ try{ ensinarAncoras(); }catch(e){} },1400);
  return true;
}
/* entra ao trocar de cômodo: é o batimento natural do jogo dentro de casa */
if(typeof irPara==='function'){
  const _sanIP=irPara;
  irPara=function(id,semTexto){
    const r=_sanIP.apply(this,arguments);
    try{ if(!semTexto)setTimeout(()=>{ try{ talvezSussurro(); }catch(e){} },700); }catch(e){}
    return r;
  };
}

/* ================= 2 · AS TRÊS ÂNCORAS =================
   O §30 congelou três sinais que nunca são falsificados. O jogador
   nunca soube. Aqui ele sabe — uma vez, no momento em que a informação
   passa a valer alguma coisa: logo depois de a casa mentir pra ele.

   E vira VERBO: dá pra conferir a âncora, gastar um minuto e recuperar
   o chão. Custa tempo e devolve pouca sanidade, porque a âncora não
   cura — ela orienta. */
/* ATENCAO AO NOME: o jogo ja tem uma tabela chamada ANCORAS — a foto
   dobrada, o relogio que nao anda, a musica que voce lembra inteira.
   Aquelas sao ancoras AFETIVAS, e o jogo as CONTAMINA: elas passam a
   mentir conforme voce piora. Sao o oposto destas.

   O contraste e o desenho, e vale dizer em voz alta: o que voce AMA
   te trai; o que e so FATO, nao. Por isso estas tres nao se chamam
   ancora — se chamam chao firme. */
const CHAO_FIRME=[
  {id:'relogio',   n:'o relógio',
   ver:()=>`São ${String(S.hora).padStart(2,'0')}:${String((S.minutos||0)%60).padStart(2,'0')}. `
          +`Dia ${S.dia}. Esse número nunca mentiu pra você e não vai mentir.`},
  {id:'inventario',n:'o que você carrega',
   ver:()=>{
     const n=(typeof mochila==='function')?(mochila().itens||[]).length:0;
     return `Você conta o que tem na mão e na mochila: ${n} ${n===1?'coisa':'coisas'}, `
       +`${S.comida||0} de comida, ${S.agua||0} de água. `
       +`A conta do que é seu é sempre a de verdade.`;}},
  {id:'porta',     n:'a porta da frente',
   ver:()=>{
     const t=S.tranca?'trancada':'sem tranca de ferro';
     const r=S.porta&&S.porta.reforco!=null?S.porta.reforco:0;
     return `A porta da frente está ${t}, com ${r} ${r===1?'tábua':'tábuas'}. `
       +`Você põe a mão nela. É madeira, e é a sua.`;}}
];

function ensinarAncoras(){
  const m=sanEstado();
  if(m.viuAncoras)return false;
  m.viuAncoras=true;
  if(typeof marcarSujo==='function')marcarSujo();
  if(typeof diz!=='function')return false;
  diz('Você para no meio do corredor e faz o que o rádio mandou fazer, semanas atrás.','sist');
  diz('Três coisas nesta casa nunca vão te enganar, por pior que fique:','sist');
  diz('o relógio, o que você carrega, e a porta da frente.','alerta');
  diz('Tudo o mais pode. Confira essas três quando a cabeça pesar, e volte delas.','sist');
  return true;
}

/* o verbo: conferir uma âncora */
async function conferirAncora(id,volta){
  const a=CHAO_FIRME.find(x=>x.id===id)||CHAO_FIRME[0];
  const m=sanEstado();
  m.ancorasHoje=(m.ancorasHoje||0)+1;
  m.conferiu=(m.conferiu||0)+1;
  if(typeof AC!=='undefined')AC.innerHTML='';
  /* âncora não pode ser falsificada: é literalmente a regra do §30 */
  const podeMentir=(typeof podeFalsificar==='function')
    ? podeFalsificar(id==='relogio'?'relogio':id==='inventario'?'inventario':'portaFrente')
    : true;
  if(typeof diz==='function'){
    diz(a.ver(),'bom');
    if(!podeMentir)diz('Isso é o que é. Não tem outra leitura.','fraco');
  }
  /* custa tempo e devolve chão */
  /* passa pelo relogio unico da v67: antes somava minutos sem rollover
     e o tempo da ancora sumia da hora do jogo. */
  if(typeof gastarMinutos==='function')gastarMinutos(SAN_CFG.minutosAncora);
  else S.minutos=(S.minutos||0)+SAN_CFG.minutosAncora;
  if(typeof mexerSan==='function')mexerSan(SAN_CFG.sanDaAncora);
  /* conferir a âncora limpa a mentira de interface por um momento */
  S._verdade=true;
  setTimeout(()=>{ S._verdade=false; },1800);
  if(typeof marcarSujo==='function')marcarSujo();
  if(typeof pausa==='function')await pausa(1100);
  if(volta)return volta();
}

/* o botão aparece no menu do cômodo, e SÓ depois de o jogador aprender
   que as âncoras existem. Antes disso ele seria um botão sem sentido. */
if(typeof menuComodo==='function'){
  const _sanMC=menuComodo;
  menuComodo=function(id){
    const r=_sanMC.apply(this,arguments);
    try{
      const m=sanEstado();
      if(!m.viuAncoras)return r;
      if(sanIlusaoAtual()<=0)return r;         /* lúcido não precisa */
      if(typeof botao!=='function')return r;
      const a=CHAO_FIRME[(m.ancorasHoje||0)%CHAO_FIRME.length];
      botao('Conferir '+a.n,()=>conferirAncora(a.id,()=>menuComodo(id)),
        {custo:SAN_CFG.minutosAncora+' min · isso nunca mente'});
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'botaoAncora'); }
    return r;
  };
}

/* ================= 3 · O SINTOMA NA TELA =================
   A sanidade era um nome de estágio numa ficha. Agora ela é uma coisa
   que o jogador VÊ sem ler: a tela ganha grão, a vinheta respira e o
   texto treme de leve conforme a cabeça piora.

   Tudo em CSS por cima, sem tocar no laço de desenho do jogo — e tudo
   desligável, porque isso é acessibilidade e não teimosia. */
function sanIntensidade(){
  let v;
  try{ v=(typeof sanEfetiva==='function')?sanEfetiva():(typeof san==='function'?san():100); }
  catch(e){ return 0; }
  if(!isFinite(v))return 0;
  const a=SAN_CFG.sintomaAbaixoDe, b=SAN_CFG.sintomaCheioEm;
  if(v>=a)return 0;
  if(v<=b)return 1;
  return (a-v)/(a-b);
}
function sanEstiloTela(){
  if(document.getElementById('css-san38'))return;
  const s=document.createElement('style');
  s.id='css-san38';
  s.textContent=
   '#san-veu{position:fixed;inset:0;z-index:58;pointer-events:none;opacity:0;'
  +'transition:opacity 1.6s ease;mix-blend-mode:normal}'
  +'#san-veu .gr{position:absolute;inset:-20%;opacity:1;'
  +'background-image:radial-gradient(circle at 30% 40%,rgba(232,226,212,.16) 0 1px,transparent 1px),'
  +'radial-gradient(circle at 70% 60%,rgba(0,0,0,.22) 0 1px,transparent 1px);'
  +'background-size:3px 3px,4px 4px;animation:sanGrao .9s steps(3) infinite}'
  +'@keyframes sanGrao{0%{transform:translate(0,0)}33%{transform:translate(-2px,1px)}'
  +'66%{transform:translate(1px,-2px)}100%{transform:translate(0,0)}}'
  +'#san-veu .vi{position:absolute;inset:0;animation:sanPulso 7s ease-in-out infinite;'
  +'background:radial-gradient(ellipse 108% 70% at 50% 45%,transparent 22%,rgba(10,6,14,.97) 100%)}'
  +'@keyframes sanPulso{0%,100%{opacity:.42}50%{opacity:1}}'
  +'body.san-treme #texto p{animation:sanTreme 5s ease-in-out infinite}'
  +'@keyframes sanTreme{0%,92%,100%{transform:translateX(0)}'
  +'93%{transform:translateX(1.4px)}95%{transform:translateX(-1.2px)}'
  +'97%{transform:translateX(.8px)}99%{transform:translateX(-.4px)}}'
  +'@media (prefers-reduced-motion:reduce){'
  +'#san-veu .gr,#san-veu .vi,body.san-treme #texto p{animation:none}}';
  document.head.appendChild(s);
}
let _sanVeu=null, _sanTimer=null, _sanSintomaLigado=true;
function sanAplicarSintoma(){
  if(!_sanSintomaLigado||S.semSintoma){
    if(_sanVeu)_sanVeu.style.opacity='0';
    document.body.classList.remove('san-treme');
    return 0;
  }
  sanEstiloTela();
  if(!_sanVeu){
    _sanVeu=document.createElement('div');
    _sanVeu.id='san-veu';
    _sanVeu.innerHTML='<div class="gr"></div><div class="vi"></div>';
    document.body.appendChild(_sanVeu);
  }
  const i=sanIntensidade();
  /* a queixa foi 'sutil demais'. O veu vai ate 1 e a curva sobe mais
     rapido no comeco: quem esta em `tenso` tem de VER que esta. */
  _sanVeu.style.opacity=String(Math.min(1,Math.pow(i,.75)));
  document.body.classList.toggle('san-treme',i>.30);
  return i;
}
function sanLigarSintoma(){
  if(_sanTimer)return;
  _sanTimer=setInterval(()=>{ try{ sanAplicarSintoma(); }catch(e){} },1500);
  try{ sanAplicarSintoma(); }catch(e){}
}
function sanAlternarSintoma(){
  _sanSintomaLigado=!_sanSintomaLigado;
  S.semSintoma=!_sanSintomaLigado;
  if(typeof marcarSujo==='function')marcarSujo();
  sanAplicarSintoma();
  return _sanSintomaLigado;
}
if(typeof S!=='undefined'&&S.semSintoma)_sanSintomaLigado=false;
sanLigarSintoma();

/* ================= 4 · O ESTÁGIO MORTO, RESOLVIDO =================
   `tenso` continua valendo 0.08 — o número do estágio NÃO foi inflado.
   O que mudou é que agora existe conteúdo desenhado pra essa faixa
   (`min: 0.02`), então o pool deixou de ser vazio e a promessa escrita
   do estágio passou a ser verdade.

   Conferir isso é o trabalho de uma linha, e ela vira teste. */
function sanCobertura(){
  return V9_ESTAGIOS.map(([n,min,ilu])=>({
    estagio:n, sanMin:min, ilusao:ilu,
    sussurros:SUSSURROS.filter(s=>ilu>=s.min).length,
    ilusoes:(typeof ILUSOES!=='undefined')?ILUSOES.filter(i=>ilu>=i.min).length:0,
    visoes:(typeof VISOES!=='undefined')?VISOES.filter(i=>ilu>=i.min).length:0,
    sons:(typeof ILUSOES_SOM!=='undefined')?ILUSOES_SOM.filter(i=>ilu>=i.min).length:0
  }));
}

/* ---------- persistência: anexa, nunca cria ---------- */
if(typeof salvar==='function'){
  const _sanSalvar=salvar;
  salvar=function(){
    _sanSalvar.apply(this,arguments);
    try{
      const cru=localStorage.getItem(CHAVE);
      if(!cru)return;
      const d=JSON.parse(cru);
      d.san38=S.san38||null;
      d.semSintoma=!!S.semSintoma;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/san38'); }
  };
}
if(typeof carregar==='function'){
  const _sanCarregar=carregar;
  carregar=function(){
    const r=_sanCarregar.apply(this,arguments);
    try{ _sanSintomaLigado=!S.semSintoma; sanAplicarSintoma(); }catch(e){}
    return r;
  };
}

/* ---------- depuração ---------- */
function san38Estado(){
  const m=sanEstado();
  return {ilusao:sanIlusaoAtual(), intensidade:+sanIntensidade().toFixed(2),
    sussurros:SUSSURROS.length, faixaBaixa:SUSSURROS.filter(s=>s.min<=.08).length,
    hoje:m.sussurrosHoje, pegou:m.pegou, conferiu:m.conferiu,
    viuAncoras:m.viuAncoras, chaoFirme:CHAO_FIRME.map(a=>a.id),
    sintoma:_sanSintomaLigado, cobertura:sanCobertura()};
}
