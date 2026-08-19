/* ============ §28 — EXPERIÊNCIA POR USO ============

   Nada de XP por abate. Cada atributo sobe pelo que você FAZ com ele:

     Velocidade   correr           distância percorrida em fuga
     Força        carregar peso    peso × horas transportado
     Destreza     consertar        cada reparo concluído
     Furtividade  escapar limpo    fuga sem nenhuma detecção

   USA `S.ficha.pontos` E `parcelas()` DO §19. Não existe objeto novo de
   atributo, nem contador paralelo: o que este bloco guarda é só o
   PROGRESSO PARCIAL rumo ao próximo ponto (`S.prog`), e quando ele
   fecha, o ponto entra em `S.ficha.pontos[k]` — o mesmo lugar de
   sempre. `parcelas()` continua sendo a única fonte da verdade.

   ONDE A FICHA É DESENHADA — uma correção ao pedido
   -------------------------------------------------
   Foi pedido a barra de progresso "desenhada por função no canvas". A
   ficha deste jogo NÃO é canvas: é DOM (`telaFicha` monta um `<div
   id="ficha">` com innerHTML, §19:476). Desenhar a barra em canvas
   exigiria construir uma segunda tela de ficha só pra ela — mais código,
   duas telas pra manter, e nada de ganho. A barra é DOM, no mesmo lugar
   onde o número do atributo já está. Dito em vez de fingido.
   ======================================================================= */

const PROG_CFG={
  /* --- a curva: cada ponto seguinte custa mais que o anterior ---
     custo(n) = base * n^expoente, onde n é o ponto que você está
     comprando (1 = o primeiro). Aumentar `base` deixa tudo mais lento;
     aumentar `expoente` faz os pontos altos ficarem caros mais rápido. */
  base: 100,
  expoente: 1.55,

  /* --- quanto cada uso rende --- */
  /* por cômodo NOVO atravessado correndo numa mesma invasão */
  velocidadePorComodo: 9,
  /* por (quilo × hora) carregado. 20 kg por 4 h = 80 * fator */
  forcaPorKgHora: .55,
  /* por reparo concluído, contado uma vez por item por dia */
  destrezaPorReparo: 26,
  /* por fuga terminada sem NENHUM aviso de detecção */
  furtividadePorFugaLimpa: 60,

  /* --- teto diário por atributo ---
     existe pra nenhuma sessão longa virar farm. Sem ele, o anti-exploit
     de repetição vira uma corrida de paciência. */
  tetoPorDia: 140,

  /* --- anti-exploit --- */
  /* Velocidade: só conta cômodo que você ainda não pisou nesta invasão.
     Correr em círculo entre dois cômodos não rende nada depois da
     primeira ida. */
  velocidadeSoComodoNovo: true,
  /* Força: o crédito é por HORA transportada, e hora só passa em
     `gastarHoras`. Largar e pegar o mesmo objeto não faz o relógio
     andar, então não rende. Este campo é o piso de peso: abaixo disso
     não conta, pra andar de mãos vazias não pingar. */
  forcaPesoMinimo: 6,
  /* Destreza: cada item conta uma vez por dia. Consertar e quebrar de
     propósito o mesmo item não repete o crédito. */
  destrezaUmaVezPorItemPorDia: true,
  /* Furtividade: uma vez por invasão, e só se `avisos` for zero.
     Re-disparar a mesma fuga não repete. */
  furtividadeUmaVezPorInvasao: true
};

const PROG_ATRIBS=['velocidade','forca','destreza','furtividade'];

/* ================= ESTADO ================= */
function prog(){
  if(!S.prog||typeof S.prog!=='object')S.prog={};
  if(!S.prog.pontos||typeof S.prog.pontos!=='object')S.prog.pontos={};
  if(!S.prog.hoje||typeof S.prog.hoje!=='object')S.prog.hoje={};
  if(S.prog.dia!==S.dia){ S.prog.dia=S.dia; S.prog.hoje={}; S.prog.itensHoje=[]; }
  if(!Array.isArray(S.prog.itensHoje))S.prog.itensHoje=[];
  PROG_ATRIBS.forEach(k=>{
    const v=S.prog.pontos[k];
    /* save adulterado não vira atributo de graça */
    S.prog.pontos[k]=(typeof v==='number'&&isFinite(v)&&v>=0)?v:0;
    if(typeof S.prog.hoje[k]!=='number'||!isFinite(S.prog.hoje[k]))S.prog.hoje[k]=0;
  });
  return S.prog;
}

/* quanto custa o PRÓXIMO ponto de `k`, dado o que você já tem */
function custoDoProximo(k){
  const atual=(typeof parcelas==='function')?parcelas(k).investido:0;
  const n=Math.max(1,atual+1);
  return Math.round(PROG_CFG.base*Math.pow(n,PROG_CFG.expoente));
}

/* ================= O CRÉDITO ================= */
/* Único caminho por onde XP entra. Devolve quanto foi creditado de
   verdade — pode ser menos que o pedido por causa do teto diário, e
   zero se o atributo já estiver em 10. */
function ganharXP(k,quanto,porque){
  if(PROG_ATRIBS.indexOf(k)<0)return 0;
  const q=Number(quanto);
  if(!isFinite(q)||q<=0)return 0;
  const P=prog();

  /* TETO DE 10: nada entra se o atributo já está no máximo. Isso vale
     pro investido, que é o que este bloco mexe — o efetivo pode estar em
     10 por roupa e ofício, e nesse caso ainda faz sentido investir,
     porque tirar a roupa não deve derrubar o que você treinou. */
  const FMAX=(typeof FICHA_MAX!=='undefined')?FICHA_MAX:10;
  const inv=(typeof parcelas==='function')?parcelas(k).investido:0;
  if(inv>=FMAX)return 0;

  /* teto diário */
  const sobra=PROG_CFG.tetoPorDia-(P.hoje[k]||0);
  if(sobra<=0)return 0;
  const dado=Math.min(q,sobra);

  P.pontos[k]=(P.pontos[k]||0)+dado;
  P.hoje[k]=(P.hoje[k]||0)+dado;

  /* fechou o custo? vira ponto de verdade, em S.ficha.pontos */
  let subiu=0;
  while(P.pontos[k]>=custoDoProximo(k)){
    const inv2=(typeof parcelas==='function')?parcelas(k).investido:0;
    if(inv2>=FMAX){ P.pontos[k]=custoDoProximo(k)-1; break; }
    P.pontos[k]-=custoDoProximo(k);
    fichaJogador().pontos[k]=(fichaJogador().pontos[k]||0)+1;
    subiu++;
  }
  if(subiu&&typeof diz==='function'){
    const nome=(typeof ATRIBUTOS!=='undefined'&&ATRIBUTOS[k])?ATRIBUTOS[k].n:k;
    diz(`${nome} subiu pra ${parcelas(k).investido}. ${porque||''}`.trim(),'bom');
  }
  if(typeof marcarSujo==='function')marcarSujo();
  return dado;
}

/* ================= OS QUATRO GANCHOS ================= */

/* 1 · VELOCIDADE — correr durante a invasão.
   Anti-exploit: só cômodo NOVO nesta invasão. Ir e voltar entre dois
   cômodos rende uma vez cada, e depois nada. */
if(typeof mover==='function'){
  const _mv=mover;
  mover=async function(I,dest,rastejar){
    try{
      if(!rastejar&&I){
        I._pisados=I._pisados||[];
        if(!PROG_CFG.velocidadeSoComodoNovo||I._pisados.indexOf(dest)<0){
          I._pisados.push(dest);
          ganharXP('velocidade',PROG_CFG.velocidadePorComodo,'De tanto correr.');
        }
      }
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'xp/velocidade'); }
    return _mv.apply(this,arguments);
  };
}

/* 2 · FORÇA — carregar peso ao longo do tempo.
   Anti-exploit: o crédito é por HORA, e hora só passa em `gastarHoras`.
   Largar e pegar o mesmo objeto não faz o relógio andar. */
if(typeof gastarHoras==='function'){
  const _gh=gastarHoras;
  gastarHoras=function(h){
    try{
      const horas=Number(h)||0;
      if(horas>0&&typeof pesoAtual==='function'){
        const kg=pesoAtual();
        if(isFinite(kg)&&kg>=PROG_CFG.forcaPesoMinimo)
          ganharXP('forca',(kg-PROG_CFG.forcaPesoMinimo)*horas*PROG_CFG.forcaPorKgHora,
            'De tanto carregar.');
      }
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'xp/forca'); }
    return _gh.apply(this,arguments);
  };
}

/* 3 · DESTREZA — consertar.
   Anti-exploit: um item conta UMA VEZ POR DIA. Consertar e quebrar de
   propósito o mesmo item não repete o crédito. */
function creditarReparo(id){
  const P=prog();
  const chave=String(id||'?');
  if(PROG_CFG.destrezaUmaVezPorItemPorDia&&P.itensHoje.indexOf(chave)>=0)return 0;
  P.itensHoje.push(chave);
  return ganharXP('destreza',PROG_CFG.destrezaPorReparo,'De tanto consertar.');
}
if(typeof reparar==='function'){
  const _rp=reparar;
  reparar=function(id,quantidade){
    const r=_rp.apply(this,arguments);
    try{ if(r!==false)creditarReparo(id); }
    catch(e){ if(typeof registrarErro==='function')registrarErro(e,'xp/destreza'); }
    return r;
  };
}
if(typeof fecharAvaria==='function'){
  const _fa=fecharAvaria;
  fecharAvaria=function(id){
    const r=_fa.apply(this,arguments);
    try{ creditarReparo('avaria:'+id); }
    catch(e){ if(typeof registrarErro==='function')registrarErro(e,'xp/destreza-avaria'); }
    return r;
  };
}

/* 4 · FURTIVIDADE — escapar sem ser visto.
   Anti-exploit: uma vez por fuga, e só se `avisos` for zero. Re-entrar
   e sair de novo na mesma fuga não repete. */
function creditarFugaLimpa(F){
  if(!F)return 0;
  if(PROG_CFG.furtividadeUmaVezPorInvasao&&F._xpDado)return 0;
  if((F.avisos||0)>0)return 0;
  F._xpDado=1;
  return ganharXP('furtividade',PROG_CFG.furtividadePorFugaLimpa,
    'Ninguém viu você sair.');
}
if(typeof voltarPraCasaDepoisDaFuga==='function'){
  const _vf=voltarPraCasaDepoisDaFuga;
  voltarPraCasaDepoisDaFuga=async function(){
    try{ creditarFugaLimpa(typeof fuga==='function'?fuga():null); }
    catch(e){ if(typeof registrarErro==='function')registrarErro(e,'xp/furtividade'); }
    return _vf.apply(this,arguments);
  };
}
/* esconder-se com sucesso durante a invasão também é furtividade, mas
   vale bem menos: é um turno, não uma noite inteira do lado de fora */
if(typeof esconder==='function'){
  const _es=esconder;
  esconder=async function(I){
    try{
      if(I&&(I.fase==='CACA'||I.fase==='SUSPEITA'))
        ganharXP('furtividade',Math.round(PROG_CFG.furtividadePorFugaLimpa*.12),
          'De tanto não ser achado.');
    }catch(e){}
    return _es.apply(this,arguments);
  };
}

/* ================= A BARRA NA FICHA =================
   DOM, não canvas — a ficha deste jogo é DOM. Ver o cabeçalho. */
function estiloProg(){
  if(document.getElementById('css-prog'))return;
  const s=document.createElement('style');
  s.id='css-prog';
  s.textContent=`
.xp-barra{position:relative;height:3px;margin-top:4px;border-radius:2px;
  background:rgba(255,255,255,.09);overflow:hidden}
.xp-barra i{display:block;height:100%;background:var(--lampiao);opacity:.85}
.xp-num{font-family:var(--mostrador);font-size:8.5px;letter-spacing:.08em;
  color:var(--mofo);margin-top:3px;display:block}
.xp-cheio i{background:#6E8C55}`;
  document.head.appendChild(s);
}
/* devolve {tem, atual, custo, pct} pro atributo */
function progressoDe(k){
  if(PROG_ATRIBS.indexOf(k)<0)return null;
  const P=prog();
  const custo=custoDoProximo(k);
  const atual=Math.max(0,Math.round(P.pontos[k]||0));
  const FMAX=(typeof FICHA_MAX!=='undefined')?FICHA_MAX:10;
  const cheio=(typeof parcelas==='function')&&parcelas(k).investido>=FMAX;
  return {tem:true, atual, custo, cheio,
    pct:cheio?100:trava(Math.round(atual/Math.max(1,custo)*100),0,100),
    hoje:Math.round(P.hoje[k]||0), tetoDia:PROG_CFG.tetoPorDia};
}
/* html da barra, pra quem monta a ficha */
function barraProgressoHTML(k){
  const p=progressoDe(k);
  if(!p)return '';
  estiloProg();
  if(p.cheio)
    return `<div class="xp-barra xp-cheio"><i style="width:100%"></i></div>`
      +`<span class="xp-num">no máximo</span>`;
  return `<div class="xp-barra"><i style="width:${p.pct}%"></i></div>`
    +`<span class="xp-num">${p.atual} de ${p.custo} pro próximo`
    +(p.hoje>=p.tetoDia?' · limite de hoje':'')+`</span>`;
}
/* engancha na ficha: acrescenta a barra em cada atributo que sobe por uso */
if(typeof telaFicha==='function'){
  const _tf=telaFicha;
  telaFicha=function(aoConfirmar){
    const r=_tf.apply(this,arguments);
    try{
      estiloProg();
      setTimeout(()=>{
        PROG_ATRIBS.forEach(k=>{
          const linha=document.querySelector('#ficha [data-atr="'+k+'"]');
          if(linha&&!linha.querySelector('.xp-barra'))
            linha.insertAdjacentHTML('beforeend',barraProgressoHTML(k));
        });
      },30);
    }catch(e){}
    return r;
  };
}

/* ================= PERSISTÊNCIA E MIGRAÇÃO ================= */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      const d=JSON.parse(localStorage.getItem(CHAVE)||'{}');
      d.prog=S.prog||null;
      d.progVersao=1;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'salvar/prog'); }
  };
}
/* Save antigo não tem `prog`. O valor neutro é ZERO PROGRESSO PARCIAL —
   não zerar atributo nenhum (o que o jogador já investiu na criação
   continua onde está, em S.ficha.pontos) e não presentear com XP por um
   passado que ninguém mediu. Quem estava no dia 9 começa a acumular a
   partir de agora, com a ficha que já tinha. */
if(!S.prog||typeof S.prog!=='object'){
  S.prog={pontos:{},hoje:{},dia:S.dia,itensHoje:[],versao:1};
  PROG_ATRIBS.forEach(k=>{S.prog.pontos[k]=0;S.prog.hoje[k]=0;});
}

/* ================= DEBUG ================= */
function progEstado(){
  const out={cfg:{...PROG_CFG},atributos:{}};
  PROG_ATRIBS.forEach(k=>{
    out.atributos[k]={...progressoDe(k),
      investido:(typeof parcelas==='function')?parcelas(k).investido:null,
      efetivo:(typeof parcelas==='function')?parcelas(k).efetivo:null};
  });
  return out;
}
function progDar(k,n){ return ganharXP(k,n,'[debug]'); }
