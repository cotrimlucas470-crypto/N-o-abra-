/* ============ §33 — O FINAL ============

   O jogo tinha fim; não tinha final. `fimOpala` levava direto pra tela
   de estatística — você fugia e o jogo te mostrava um resumo. Aqui
   entra o que faltava entre uma coisa e a outra.

   ONDE ELE ENCAIXA
   ----------------
   Depois do portão do quintal e antes de "Ver o que sobrou". A ordem
   importa: ele foge da casa, vem a luz, e só então descobre de onde
   estava fugindo. Se a estatística viesse antes, o jogador já teria
   saído do transe pra ler números.

   POR QUE AQUI É TEXTO, E O FILME É ARQUIVO SEPARADO
   --------------------------------------------------
   A cena filmada tem narração, vozes gravadas, música e vídeo: ~30 MB,
   que não cabem embutidos num HTML que a pessoa guarda no celular. A
   primeira tentativa foi abrir `final/final.html` num iframe por cima
   do jogo. Ela foi ABANDONADA, e vale dizer por quê em vez de deixar o
   código morto no arquivo: dentro da página do jogo o iframe nunca
   completava a carga — nenhum erro, nenhum aviso, nem o evento `load`.
   Fora do jogo, a mesmíssima página carrega em 1,5 s. Não achei a
   causa, e caminho que só funciona no teste é pior que caminho nenhum.

   Então o final DENTRO do jogo é este: a mesma cena, o mesmo texto, os
   mesmos tempos, lida na tela. Não é consolo nem aviso de erro — é a
   história inteira, e ela fecha o jogo. O filme existe à parte, como
   arquivo de vídeo, pra quem quiser ver com as vozes.
   ====================================================================== */

const FIM_CFG={
  /* o botão de pular aparece depois disto. Não aparece de cara porque
     a primeira coisa que o jogador vê não pode ser a saída. */
  pularApos:6.0,
  /* no caminho em texto, quanto tempo cada linha fica na tela por
     caractere, e o mínimo. Sai perto do ritmo da narração gravada. */
  msPorLetra:52,
  msMinimo:1600
};

/* ---------- a cena, em texto e em tempo ----------
   `f` marca fala de personagem; `§` marca cartão de ato. Os tempos são
   os mesmos que o alinhamento tirou da narração gravada. */
const FIM_CENA=[
 {t:'A comida estava acabando fazia dois dias, e ninguém tinha coragem de dizer isso em voz alta primeiro.'},
 {t:'Foi a irmã quem disse.'},
 {f:'IRMÃ', t:'A comida tá acabando. Eu vou buscar suprimento.'},
 {t:'Ele pegou o casaco antes dela terminar a frase.'},
 {f:'ELE',  t:'Eu também vou.'},
 {f:'IRMÃ', t:'É perigoso. Eu vou sozinha.'},
 {f:'ELE',  t:'Mas…'},
 {f:'IRMÃ', t:'Mais nada.'},
 {t:'Ela já estava na porta quando disse a última coisa, sem virar pra trás, como quem não quer que a resposta pareça um pedido.'},
 {f:'IRMÃ', t:'Eu volto. Eu sempre volto.'},
 {t:'A porta bateu. O trinco caiu no lugar sozinho, do jeito que só cai quando alguém sai com pressa.', som:'porta'},
 {t:'Ele ficou olhando pra madeira por um tempo maior do que devia.'},
 {t:'Horas viraram um dia. Um dia virou três.'},
 {t:'Três viraram uma semana, e na semana ele parou de contar em dias e passou a contar em coisas que não aconteceram: ela não voltou pra dormir, ela não voltou pra comer o que sobrou, ela não voltou pra dizer que tinha sido bobagem ter ido sozinha.'},
 {t:'O gerador continuou rodando porque alguém tinha que cuidar dele, e cuidar do gerador virou a única coisa que fazia sentido fazer.'},
 {t:'As semanas viraram um mês. O mês virou o hábito de deixar um prato a mais na mesa, sem ninguém comentar, até que parar de fazer isso também virou um hábito.'},
 {t:'Ninguém mais falava o nome dela em voz alta. Não porque tinham esquecido. Porque lembravam demais.'},
 {c:'A noite das três batidas'},
 {t:'Foi numa noite comum, sem nada de diferente nela até aquele momento, que a porta recebeu três batidas. Pausadas. Do jeito que se bate quando não se tem pressa de ser atendido.', som:'batida'},
 {t:'Ele reconheceu o ritmo antes de reconhecer qualquer outra coisa.'},
 {t:'Encostou o ouvido na madeira. A respiração do outro lado era regular, cansada, humana. Do jeito certo de cansada.'},
 {t:'Perguntou o que só ela saberia responder — uma coisa pequena, de antes de tudo isso, que nenhum estranho teria como adivinhar. A resposta veio certa. Exatamente certa.'},
 {t:'E foi exatamente por estar certa que ele não teve coragem de abrir.'},
 {t:'Porque ele já tinha ouvido, no rádio, quantas vezes a resposta certa não era garantia de nada. Porque ele já sabia que existia coisa lá fora capaz de aprender uma voz e usar ela pra bater numa porta.'},
 {t:'Do outro lado, a voz dela — a voz dela de verdade, ou algo que tinha decorado cada detalhe dela — disse a única frase que ele mais queria e mais temia ouvir.'},
 {f:'?',    t:'Eu voltei.'},
 {t:'Ele ficou parado com a mão a um centímetro do trinco. A hesitação durou o tempo de três respirações — as dele, não as de quem esperava do outro lado.'},
 {t:'Não foi coragem que fez a mão virar a maçaneta. Foi cansaço de duvidar.'},
 {t:'A porta abriu.'},
 {t:'E antes que qualquer coisa do outro lado tomasse forma — antes de rosto, antes de mais voz nenhuma — veio a luz.'},
 {t:'Branca. Forte demais pra vir de rua nenhuma sem eletricidade.'},
 {t:'Alguém disse, de um lugar sem direção:'},
 {f:'',     t:'Hora de acordar.'},
 {t:'Ele abriu os olhos.'},
 {t:'Teto branco. Um aparelho apitando num ritmo que não era o dele. Uma cadeira ao lado da cama, com o formato de quem tinha dormido ali recente demais pra ser confortável.'},
 {t:'Quatro anos foi a primeira coisa que disseram — antes ainda de perguntarem o nome dele.'},
 {t:'Quatro anos, e a casa, o gerador, a irmã que saiu buscar comida e nunca mais voltou, cada batida, cada noite contando as horas até clarear — nada daquilo tinha acontecido fora da própria cabeça dele, sozinha no escuro, tentando dar um formato pra alguma coisa grande demais pra caber num pensamento só.'}
];

/* ---------- estilo da cena em texto ---------- */
function estiloFinal(){
  if(document.getElementById('css-final'))return;
  const s=document.createElement('style');
  s.id='css-final';
  s.textContent=
   '#cena-fim{position:fixed;inset:0;z-index:120;background:#0B0A0D;'
  +'display:flex;align-items:center;justify-content:center;padding:34px 26px}'
  +'#cena-fim.claro{background:#E8E2D4}'
  +'#fim-txt{max-width:640px;text-align:center;font-family:var(--corpo);'
  +'font-size:20px;line-height:1.62;color:#E8E2D4;opacity:0;'
  +'transition:opacity .75s ease}'
  +'#cena-fim.claro #fim-txt{color:#171310}'
  +'#fim-txt.on{opacity:1}'
  +'#fim-txt .quem{display:block;font-family:var(--mostrador);font-size:11px;'
  +'letter-spacing:.24em;color:#7A8B7F;margin-bottom:16px}'
  +'#fim-txt .fala{font-style:italic;color:#C9A227;font-size:26px}'
  +'#cena-fim.claro #fim-txt .fala{color:#171310}'
  +'#fim-txt .cartao{font-family:var(--display);font-size:34px;line-height:1.2}'
  +'#fim-pular{position:fixed;right:16px;bottom:18px;z-index:121;opacity:0;'
  +'transition:opacity .8s ease;background:transparent;border:1px solid rgba(232,226,212,.22);'
  +'color:#7A8B7F;font-family:var(--mostrador);font-size:11px;letter-spacing:.18em;'
  +'padding:9px 15px;border-radius:2px;cursor:pointer;text-transform:uppercase}'
  +'#fim-pular.on{opacity:.75}'
  +'#fim-pular:active{background:rgba(232,226,212,.08)}';
  document.head.appendChild(s);
}

/* ---------- a cena em texto, dentro do jogo ---------- */
function duracaoDaLinha(l){
  const n=(l.t||l.c||'').length;
  return Math.max(FIM_CFG.msMinimo,n*FIM_CFG.msPorLetra);
}
async function cenaEmTexto(caixa,cancelado){
  const alvo=document.createElement('div');
  alvo.id='fim-txt';
  caixa.appendChild(alvo);
  /* A espera tem de ser interrompivel. Com um setTimeout seco, apertar
     "pular" no meio de uma linha longa ainda obrigava a aguentar ela
     inteira — ate 4 s parado depois de pedir pra sair. Aqui a espera
     acorda a cada 120 ms e olha se o jogador desistiu. */
  const dorme=ms=>new Promise(r=>{
    const fim=Date.now()+ms;
    const bater=()=>{
      if(cancelado()||Date.now()>=fim)return r();
      setTimeout(bater,Math.min(120,Math.max(10,fim-Date.now())));
    };
    bater();
  });
  for(let i=0;i<FIM_CENA.length;i++){
    if(cancelado())return;
    const l=FIM_CENA[i];
    /* a virada pro branco acontece na mesma frase da cena filmada */
    if(l.t&&l.t.indexOf('Ele abriu os olhos')===0)caixa.classList.add('claro');
    alvo.className='';
    await dorme(240);
    if(cancelado())return;
    alvo.innerHTML = l.c
      ? '<span class="cartao">'+l.c+'</span>'
      : l.f!==undefined
        ? (l.f?'<span class="quem">'+l.f+'</span>':'')+'<span class="fala">— '+l.t+'</span>'
        : l.t;
    alvo.className='on';
    if(l.som==='porta'&&typeof batida==='function')try{batida(5,1.2);}catch(e){}
    if(l.som==='batida'&&typeof batida==='function')
      try{ batida(3,1); setTimeout(()=>batida(3,1),780); setTimeout(()=>batida(3,1),1560); }catch(e){}
    await dorme(duracaoDaLinha(l));
  }
  if(cancelado())return;
  alvo.className='';
  await dorme(900);
  alvo.innerHTML='<span class="cartao">NÃO ABRA</span>';
  alvo.className='on';
  caixa.classList.remove('claro');
  await dorme(3800);
}

/* ---------- a porta de entrada ---------- */
let _fimRodando=false;
async function finalNarrado(){
  if(_fimRodando)return;
  _fimRodando=true;
  estiloFinal();
  try{ if(typeof desligarDrone==='function')desligarDrone(); }catch(e){}
  try{ if(typeof desligarChuva==='function')desligarChuva(); }catch(e){}
  try{ if(typeof desligarGerador==='function')desligarGerador(); }catch(e){}

  const caixa=document.createElement('div');
  caixa.id='cena-fim';
  document.body.appendChild(caixa);

  let pulou=false;
  const bt=document.createElement('button');
  bt.id='fim-pular';
  bt.textContent='pular o final';
  bt.onclick=()=>{ pulou=true; };
  document.body.appendChild(bt);
  setTimeout(()=>bt.classList.add('on'),FIM_CFG.pularApos*1000);

  await cenaEmTexto(caixa,()=>pulou);

  bt.remove();
  caixa.style.transition='opacity 1.4s ease';
  caixa.style.opacity='0';
  await new Promise(r=>setTimeout(r,1500));
  caixa.remove();
  _fimRodando=false;
  return 'texto';
}

/* ---------- o encaixe ----------
   Entra entre a última fala da fuga e o botão da estatística. Se um dia
   `fimOpala` mudar de nome, este embrulho simplesmente não se instala e
   o jogo segue como antes — nunca quebra por causa do final. */
if(typeof fimOpala==='function'){
  const _fimOP=fimOpala;
  fimOpala=async function(){
    const r=await _fimOP.apply(this,arguments);
    try{
      /* o `fimOpala` original termina pondo o botão "Ver o que sobrou".
         A cena entra antes dele: quem foge só descobre de onde fugia
         depois de já estar longe. */
      if(typeof AC!=='undefined')AC.innerHTML='';
      await finalNarrado();
      if(typeof AC!=='undefined'&&typeof botao==='function'){
        AC.innerHTML='';
        botao('Ver o que sobrou',()=>{
          if(typeof fim==='function')fim('opala');
          else if(typeof telaFim==='function')telaFim('opala');
        },{cls:'chave'});
      }
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'finalNarrado'); }
    return r;
  };
}

/* atalho: ver o final sem jogar até o fim */
S.debug=S.debug||{};
S.debug.final=finalNarrado;

function fimEstado(){
  return {linhas:FIM_CENA.length,
    falas:FIM_CENA.filter(l=>l.f!==undefined).length,
    duracaoTexto:+(FIM_CENA.reduce((a,l)=>a+duracaoDaLinha(l),0)/1000).toFixed(1)+'s',
    rodando:_fimRodando,
    encaixado:typeof fimOpala==='function'};
}
