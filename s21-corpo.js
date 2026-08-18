/* ================= §21 — CORPO, ROUPA E PAINEL =================
   Slots por região do corpo, peças que protegem só o que cobrem, e um
   painel de equipamento com silhueta. A regra que evita o abuso mais
   comum do gênero: PROTEÇÃO É POR REGIÃO. Uma bota não segura mordida
   no braço, e nenhuma peça sozinha protege o corpo inteiro.

   O HUD de combate é compacto de propósito — a tela é de celular, e o
   jogo é de texto. Estado nunca é dito só por cor: tudo que tem cor
   tem também número ou palavra.
   ================================================================== */

/* ---------- os slots ---------- */
const SLOTS=[
 {id:'cabeca',  n:'Cabeça',        reg:['cabeca']},
 {id:'rosto',   n:'Rosto',         reg:['cabeca']},
 {id:'tronco1', n:'Tronco (interno)', reg:['torso']},
 {id:'tronco2', n:'Tronco (externo)', reg:['torso','bracos']},
 {id:'armadura',n:'Armadura',      reg:['torso']},
 {id:'maos',    n:'Mãos',          reg:['bracos']},
 {id:'cintura', n:'Cintura',       reg:['torso']},
 {id:'pernas',  n:'Pernas',        reg:['pernas']},
 {id:'pes',     n:'Pés',           reg:['pes']},
 {id:'costas',  n:'Costas',        reg:[]},
 {id:'mochila', n:'Mochila',       reg:[]},
 {id:'branca',  n:'Arma branca',   reg:[]},
 {id:'fogo',    n:'Arma de fogo',  reg:[]},
 {id:'util',    n:'Utilitário',    reg:[]}
];
const REGIOES=['cabeca','torso','bracos','pernas','pes'];

/* ---------- as peças ----------
   `prot` é por tipo de dano e vale só nas `reg` da peça. `veloc` e
   `ruido` são o preço: armadura pesada protege e denuncia. */
const ROUPAS={
 camiseta:{n:'Camiseta puída',slot:'tronco1',reg:['torso'],kg:.2,
   prot:{corte:.04,pancada:.02}, veloc:0, ruido:0, calor:.1,
   d:'Serve pra não andar sem camisa. É tudo que ela faz.'},
 camisa:{n:'Camisa de manga',slot:'tronco1',reg:['torso','bracos'],kg:.3,
   prot:{corte:.06,arranhao:.12}, veloc:0, ruido:0, calor:.2,
   d:'Manga comprida segura mato e unha, não segura dente.'},
 calca:{n:'Calça de brim',slot:'pernas',reg:['pernas'],kg:.6,
   prot:{corte:.10,arranhao:.20,pancada:.04}, veloc:0, ruido:.02, calor:.2,
   d:'Grossa no joelho. Aguenta cerca e mato.'},
 casaco:{n:'Casaco pesado',slot:'tronco2',reg:['torso','bracos'],kg:1.4,
   prot:{corte:.14,pancada:.10,mordida:.08}, veloc:-.03, ruido:.04, calor:.6,
   d:'Quente demais de dia, e é ele que te salva de madrugada.'},
 bota:{n:'Bota de couro',slot:'pes',reg:['pes'],kg:1.1,
   prot:{corte:.22,pancada:.16,mordida:.14}, veloc:.02, ruido:.06, calor:.2,
   d:'Cano alto. Pisa em prego e você nem sente.'},
 tenis:{n:'Tênis gasto',slot:'pes',reg:['pes'],kg:.5,
   prot:{corte:.06}, veloc:.05, ruido:-.06, calor:0,
   d:'Solado macio. Corre melhor e faz menos barulho que bota.'},
 luva:{n:'Luva de raspa',slot:'maos',reg:['bracos'],kg:.2,
   prot:{corte:.18,queimadura:.25}, veloc:0, ruido:0, calor:.1,
   d:'Pega vidro e arame sem abrir a mão.'},
 capacete:{n:'Capacete de obra',slot:'cabeca',reg:['cabeca'],kg:.9,
   prot:{pancada:.35,corte:.12}, veloc:-.02, ruido:.03, calor:0,
   d:'Amarelo e feio. Já segurou telha inteira.'},
 mascara:{n:'Máscara de pano',slot:'rosto',reg:['cabeca'],kg:.1,
   prot:{doenca:.20}, veloc:0, ruido:0, calor:.1,
   d:'Filtra poeira e o cheiro do que apodrece.'},
 joelheira:{n:'Joelheira e caneleira',slot:'pernas',reg:['pernas'],kg:.7,
   prot:{pancada:.22,corte:.14}, veloc:-.02, ruido:.03, calor:0,
   d:'Plástico duro sobre a canela. Chutar porta deixa de doer.'},
 cinto:{n:'Cinto de ferramenta',slot:'cintura',reg:['torso'],kg:.8,
   prot:{}, veloc:-.01, ruido:.05, extra:{vol:4},
   d:'Quatro espaços a mais, pendurados na cintura, batendo na perna.'},
 mochila_leve:{n:'Mochila pequena',slot:'mochila',reg:[],kg:.8,
   prot:{}, veloc:0, ruido:.02, extra:{vol:10,kg:6},
   d:'Cabe pouco e não atrapalha nada.'}
};

/* as armaduras do §15 entram aqui com região e tipo de dano */
const ARMADURAS_REG={
 colete:{reg:['torso'],prot:{corte:.30,pancada:.34,mordida:.26},veloc:-.05,ruido:.10},
 avental:{reg:['torso','pernas'],prot:{corte:.34,queimadura:.30},veloc:-.06,ruido:.08},
 jaqueta:{reg:['torso','bracos'],prot:{corte:.20,mordida:.18},veloc:-.02,ruido:.04}
};

/* põe as roupas no catálogo do jogo, com desenho próprio */
function registrarRoupas(){
  if(typeof CATALOGO==='undefined')return;
  for(const [id,R] of Object.entries(ROUPAS)){
    if(CATALOGO[id])continue;
    CATALOGO[id]={n:R.n,cat:'roupa',kg:R.kg,vol:Math.max(1,Math.round(R.kg*2)),
      raro:R.slot==='armadura'?4:2,roupa:id,d:R.d};
    if(typeof DESENHO!=='undefined'&&!DESENHO[id])DESENHO[id]=desenhoDeRoupa(id,R);
  }
  if(typeof CAT!=='undefined')CAT.roupa='roupa';
  /* e no mundo: roupa se acha em casa de gente */
  if(typeof TIPO_CASA!=='undefined'){
    const por={simples:['camiseta','calca','tenis'],boa:['casaco','bota','capacete'],
      abandonada:['camisa','mascara'],oficina:['luva','joelheira','cinto'],
      sitio:['bota','casaco'],comercio:['mochila_leve','tenis','camiseta']};
    for(const [t,l] of Object.entries(por)){
      const T=TIPO_CASA[t];
      if(T&&T.loot)l.forEach(i=>{ if(CATALOGO[i]&&!T.loot.includes(i))T.loot.push(i); });
    }
  }
}

/* ---------- o estado do corpo ---------- */
function corpo(){
  if(!S.corpo||typeof S.corpo!=='object')S.corpo={};
  SLOTS.forEach(s=>{ if(S.corpo[s.id]===undefined)S.corpo[s.id]=null; });
  /* peça que sumiu do catálogo entre versões não trava a tela */
  Object.keys(S.corpo).forEach(k=>{
    const v=S.corpo[k];
    if(v&&!ROUPAS[v]&&!(typeof CATALOGO!=='undefined'&&CATALOGO[v]))S.corpo[k]=null;
  });
  return S.corpo;
}
function slotDe(id){
  if(ROUPAS[id])return ROUPAS[id].slot;
  if(typeof CATALOGO!=='undefined'&&CATALOGO[id]){
    const e=CATALOGO[id];
    if(e.cat==='armadura')return 'armadura';
    if(e.fogo)return 'fogo';
    if(e.dano)return 'branca';
  }
  return null;
}
function pecaDoSlot(slot){ return corpo()[slot]||null; }

function vestir(id){
  const slot=slotDe(id);
  if(!slot)return {ok:false,porque:'isso não se veste'};
  const C=corpo();
  /* regra de sobreposição: armadura por cima do tronco externo exige
     que o externo caiba embaixo — casaco + colete é o limite */
  if(slot==='armadura'&&C.tronco2&&ROUPAS[C.tronco2]&&ROUPAS[C.tronco2].kg>1.2)
    return {ok:false,porque:'o casaco não cabe embaixo da armadura'};
  C[slot]=id;
  if(slot==='armadura'&&typeof S!=='undefined')S.armadura=id;
  if(typeof sincronizarEfeitos==='function')sincronizarEfeitos();
  return {ok:true,slot};
}
function desvestir(slot){
  const C=corpo();
  const t=C[slot];
  C[slot]=null;
  if(slot==='armadura')S.armadura=null;
  if(typeof sincronizarEfeitos==='function')sincronizarEfeitos();
  return t;
}

/* ---------- o que o corpo dá e o que cobra ----------
   Proteção por região e por tipo de dano, somada com retorno
   decrescente pra não existir combinação imune. */
function protecaoDe(regiao,tipo){
  let soma=0;
  const C=corpo();
  SLOTS.forEach(s=>{
    const id=C[s.id]; if(!id)return;
    const R=ROUPAS[id]||ARMADURAS_REG[id];
    if(!R)return;
    const reg=R.reg||[];
    if(!reg.includes(regiao))return;
    const p=(R.prot||{})[tipo]||0;
    if(p<=0)return;
    /* desgaste da peça encolhe a proteção */
    const pc=(typeof peca==='function')?peca(id):null;
    const est=(pc&&typeof efic==='function')?efic(pc):1;
    soma+=p*est;
  });
  /* teto: 70%, e a soma nunca é linear */
  return +trava(1-Math.pow(1-trava(soma,0,.95),1),0,.70).toFixed(3);
}
function penalidadesDoCorpo(){
  let veloc=0, ruido=0, kg=0, volExtra=0, kgExtra=0;
  const C=corpo();
  SLOTS.forEach(s=>{
    const id=C[s.id]; if(!id)return;
    const R=ROUPAS[id]||ARMADURAS_REG[id];
    if(!R)return;
    veloc+=R.veloc||0; ruido+=R.ruido||0;
    kg+=R.kg||(CATALOGO[id]?CATALOGO[id].kg:0)||0;
    if(R.extra){ volExtra+=R.extra.vol||0; kgExtra+=R.extra.kg||0; }
  });
  return {veloc:+veloc.toFixed(3), ruido:+ruido.toFixed(3),
    kg:+kg.toFixed(2), volExtra, kgExtra};
}

/* INTEGRAÇÃO 1 — a proteção entra na ferida, depois do §15 e do §19,
   e é por região: o golpe escolhe onde bate. */
if(typeof ferirPor==='function'){
  const _fp=ferirPor;
  ferirPor=function(fonte,alvo,nome){
    const eu=!alvo||alvo===S;
    if(eu){
      const reg=sortear(REGIOES);
      const tipo={bicho:'mordida',gente:'corte',queda:'pancada',
        fogo:'queimadura',mato:'arranhao',obra:'pancada'}[fonte]||'corte';
      const p=protecaoDe(reg,tipo);
      if(p>0&&chance(p)){
        if(typeof diz==='function')
          diz(`O que você está vestindo segura o golpe ${
            {cabeca:'na cabeça',torso:'no peito',bracos:'no braço',
             pernas:'na perna',pes:'no pé'}[reg]}.`,'bom');
        /* e a peça que segurou se gasta */
        const C=corpo();
        SLOTS.forEach(s=>{
          const id=C[s.id]; const R=id&&(ROUPAS[id]||ARMADURAS_REG[id]);
          if(R&&(R.reg||[]).includes(reg)&&typeof gastarDur==='function'&&typeof peca==='function'){
            const pc=peca(id); if(pc)gastarDur(pc,2.2,(CATALOGO[id]||{n:id}).n);
          }
        });
        return null;
      }
    }
    return _fp.call(this,fonte,alvo,nome);
  };
}
/* INTEGRAÇÃO 2 — peso e barulho da roupa entram na capacidade e no rastro */
if(typeof mochilaInfo==='function'){
  const _mi=mochilaInfo;
  mochilaInfo=function(){
    const inf=_mi.apply(this,arguments);
    const P=penalidadesDoCorpo();
    return {...inf, kg:+(inf.kg+P.kgExtra).toFixed(1), vol:inf.vol+P.volExtra};
  };
}
if(typeof v9Rastros==='function'){
  const _vr=v9Rastros;
  window.v9Rastros=function(){
    const t=_vr.apply(this,arguments);
    const P=penalidadesDoCorpo();
    /* armadura pesada faz barulho: entra no rastro SOM e METAL */
    return t.map(r=>(r.k==='SOM'||r.k==='METAL')?{...r,p:r.p*(1+P.ruido)}:r);
  };
}

/* ================= O PAINEL ================= */
function estiloCorpo(){
  if(document.getElementById('css-corpo'))return;
  const s=document.createElement('style');
  s.id='css-corpo';
  s.textContent=`
#corpo-ui{position:fixed;inset:0;z-index:78;background:var(--breu);color:var(--papel);
  display:flex;flex-direction:column;font-family:var(--corpo)}
#corpo-ui .topo{padding:10px 13px;border-bottom:1px solid #2A232E;
  background:linear-gradient(180deg,#1B1721,#0F0D13)}
#corpo-ui h2{font-family:var(--display);font-size:15px;font-weight:400;
  letter-spacing:.2em;text-transform:uppercase;color:var(--mofo)}
#corpo-ui .peso{font-family:var(--mostrador);font-size:10.5px;color:var(--lampiao);margin-top:4px}
#corpo-ui .corpo2{flex:1;overflow-y:auto;padding:8px 10px 12px}
#corpo-ui .sl{display:grid;grid-template-columns:74px 1fr auto;gap:8px;align-items:center;
  padding:7px 5px;border-bottom:1px solid #1E1922}
#corpo-ui .sl .rot{font-family:var(--mostrador);font-size:9px;letter-spacing:.08em;
  text-transform:uppercase;color:var(--mofo)}
#corpo-ui .sl .it{font-size:13.5px}
#corpo-ui .sl .it small{display:block;font-family:var(--mostrador);font-size:9px;
  color:var(--mofo);margin-top:2px}
#corpo-ui .sl.vazio .it{color:#5A5464;font-style:italic}
#corpo-ui .sl button{background:#16131A;border:1px solid #2A232E;color:var(--papel);
  font-family:var(--corpo);font-size:12px;padding:6px 9px;cursor:pointer}
#corpo-ui .prot{border:1px solid #2A232E;margin-top:10px;padding:8px 10px}
#corpo-ui .prot h3{font-family:var(--mostrador);font-size:9.5px;letter-spacing:.13em;
  text-transform:uppercase;color:var(--mofo);margin-bottom:5px}
#corpo-ui .prot div{font-family:var(--mostrador);font-size:10.5px;line-height:1.7}
#corpo-ui .prot b{color:var(--lampiao);font-weight:400}
#corpo-ui .rodape{display:flex;gap:6px;padding:8px;border-top:1px solid #2A232E;background:#0F0D13}
#corpo-ui .rodape button{flex:1;background:#16131A;border:1px solid #2A232E;color:var(--papel);
  font-family:var(--corpo);font-size:13px;padding:10px;cursor:pointer}
#corpo-ui .rodape button.chave{border-color:var(--lampiao);color:var(--lampiao)}
#hud-arma{position:fixed;right:8px;bottom:8px;z-index:55;pointer-events:none;
  font-family:var(--mostrador);font-size:10px;letter-spacing:.05em;text-align:right;
  background:rgba(11,10,13,.72);border:1px solid #2A232E;padding:6px 8px;line-height:1.6}
#hud-arma b{color:var(--lampiao);font-weight:400;font-size:13px}
#hud-arma .alerta{color:#E0703F}
#hud-arma .ruim{color:#B84B33}`;
  document.head.appendChild(s);
}

function telaCorpo(volta){
  estiloCorpo();
  const el=document.createElement('div');
  el.id='corpo-ui';
  el.innerHTML=`<div class="topo"><h2>O que você está vestindo</h2>
      <div class="peso"></div></div>
    <div class="corpo2"></div>
    <div class="rodape"><button class="sai chave">Fechar</button></div>`;
  document.body.appendChild(el);
  const c2=el.querySelector('.corpo2');

  function pintar(){
    const C=corpo(), P=penalidadesDoCorpo();
    const inf=(typeof mochilaInfo==='function')?mochilaInfo():{kg:24,vol:30};
    el.querySelector('.peso').textContent=
      `roupa ${P.kg.toFixed(1)} kg · carga ${(typeof pesoAtual==='function'?pesoAtual():0).toFixed(1)}/${inf.kg.toFixed(0)} kg`
      +(P.veloc?` · velocidade ${P.veloc>0?'+':''}${Math.round(P.veloc*100)}%`:'')
      +(P.ruido?` · ruído +${Math.round(P.ruido*100)}%`:'');
    c2.innerHTML='';
    SLOTS.forEach(s=>{
      const id=C[s.id];
      const e=id?(CATALOGO[id]||{n:id}):null;
      const R=id?(ROUPAS[id]||ARMADURAS_REG[id]):null;
      const pc=(id&&typeof peca==='function')?peca(id):null;
      const est=(pc&&typeof pctDur==='function')?pctDur(pc):null;
      const d=document.createElement('div');
      d.className='sl'+(id?'':' vazio');
      const protTxt=R&&R.prot?Object.keys(R.prot).map(k=>k+' '+Math.round(R.prot[k]*100)+'%').join(' · '):'';
      d.innerHTML=`<div class="rot">${esc(s.n)}</div>
        <div class="it">${id?esc(e.n):'— vazio —'}
          ${id?`<small>${esc(protTxt||'sem proteção')}${est!=null?' · estado '+est+'%':''}</small>`:''}</div>
        <div>${id?'<button class="tirar">Tirar</button>':''}</div>`;
      if(id)d.querySelector('.tirar').onclick=()=>{
        const t=desvestir(s.id);
        if(t&&typeof guardar==='function')guardar(t,1);
        if(typeof amToca==='function')amToca('ui_clique');
        pintar();
      };
      c2.appendChild(d);
    });
    /* o que a roupa protege, por região — número, não cor */
    const p=document.createElement('div');
    p.className='prot';
    p.innerHTML='<h3>proteção por região</h3>'+REGIOES.map(r=>{
      const linhas=['corte','pancada','mordida'].map(t=>
        `${t} <b>${Math.round(protecaoDe(r,t)*100)}%</b>`).join(' · ');
      return `<div>${r}: ${linhas}</div>`;
    }).join('');
    c2.appendChild(p);
    /* e o que dá pra vestir agora, da mochila */
    const vestiveis=(typeof mochila==='function'?mochila().itens:[])
      .filter(it=>slotDe(it.id));
    if(vestiveis.length){
      const v=document.createElement('div');
      v.className='prot';
      v.innerHTML='<h3>na mochila, dá pra vestir</h3>';
      vestiveis.forEach(it=>{
        const b=document.createElement('button');
        b.style.cssText='display:block;width:100%;text-align:left;background:none;border:0;'
          +'border-bottom:1px solid #1E1922;color:var(--papel);padding:7px 4px;cursor:pointer;'
          +'font-family:var(--corpo);font-size:13px';
        b.textContent=(CATALOGO[it.id]||{n:it.id}).n+' → '+
          (SLOTS.find(s=>s.id===slotDe(it.id))||{n:'?'}).n;
        b.onclick=()=>{
          const r=vestir(it.id);
          if(!r.ok)return alert(r.porque);
          if(typeof largar==='function')largar(it.id,1);
          if(typeof amToca==='function')amToca('porta_maçaneta');
          pintar();
        };
        v.appendChild(b);
      });
      c2.appendChild(v);
    }
  }
  el.querySelector('.sai').onclick=()=>{
    el.remove();
    if(typeof salvar==='function')salvar();
    if(typeof volta==='function')volta();
  };
  pintar();
}

/* ---------- HUD de combate, compacto ---------- */
function atualizarHudArma(){
  estiloCorpo();
  let h=document.getElementById('hud-arma');
  const a=(typeof armaEstado==='function')?armaEstado():null;
  const branca=(typeof melhorArma==='function')?melhorArma():null;
  if(!a&&!branca){ if(h)h.remove(); return; }
  if(!h){ h=document.createElement('div'); h.id='hud-arma'; document.body.appendChild(h); }
  const linhas=[];
  if(branca)linhas.push(`punho: ${esc(branca.n.toLowerCase())} · dano ${branca.dano}`);
  if(a){
    const vazia=a.carregador<=0&&a.camara<=0;
    const cls=a.travada?'ruim':(vazia?'alerta':'');
    linhas.push(`<span class="${cls}">${esc(a.nome.toLowerCase())}</span>`);
    linhas.push(`<b>${a.camara>0?a.camara+'+':''}${a.carregador}</b>/${a.capacidade}`
      +` · reserva ${a.reserva} ${esc(a.calibre)}`);
    linhas.push(`modo ${esc(a.modo)} · estado ${a.condicao}%`);
    if(a.travada)linhas.push('<span class="ruim">TRAVADA — destrave</span>');
    else if(vazia)linhas.push('<span class="alerta">SEM MUNIÇÃO NA ARMA</span>');
    if(a.reserva<=0&&vazia)linhas.push('<span class="ruim">sem reserva deste calibre</span>');
  }
  const novo=linhas.join('<br>');
  if(h.dataset.v!==novo){ h.innerHTML=novo; h.dataset.v=novo; }  /* só redesenha se mudou */
}
/* o HUD acompanha o painel do jogo, que já é chamado quando algo muda */
if(typeof atualizarPainel==='function'){
  const _ap=atualizarPainel;
  atualizarPainel=function(){
    const r=_ap.apply(this,arguments);
    try{ atualizarHudArma(); }catch(e){}
    return r;
  };
}

/* ---------- entradas no jogo ---------- */
if(typeof menuComodo==='function'){
  const _mc=menuComodo;
  menuComodo=function(id){
    const r=_mc.apply(this,arguments);
    try{
      if(id===1&&typeof botao==='function'){
        const P=penalidadesDoCorpo();
        botao('Roupa e equipamento',()=>telaCorpo(()=>menuComodo(1)),
          {custo:P.kg?P.kg.toFixed(1)+' kg vestidos':'nada vestido'});
      }
      if(id===3&&typeof botao==='function'&&(S.armas||[]).some(x=>ARMAS_FOGO[x])){
        botao('Mexer nas armas de fogo',()=>telaArmas(()=>menuComodo(3)),
          {custo:'carregar, destravar, trocar modo'});
      }
    }catch(e){}
    return r;
  };
}

/* ---------- a bancada de armas ---------- */
function telaArmas(volta){
  if(typeof limpar!=='function')return;
  limpar(); AC.innerHTML=''; cap('ARMAS DE FOGO');
  const minhas=(S.armas||[]).filter(id=>ARMAS_FOGO[id]);
  if(!minhas.length){
    diz('Você não tem nenhuma arma de fogo.','fraco');
    botao('Voltar',volta,{cls:'chave'}); return;
  }
  minhas.forEach(id=>{
    const a=armaEstado(id);
    const A=ARMAS_FOGO[id];
    ficha(a.nome+(S.armaFogo===id?' · NA MÃO':''),
      `${a.camara>0?a.camara+'+':''}${a.carregador}/${a.capacidade} · ${a.calibre}`,
      `${A.categoria} · dano ${a.dano} · acerto ${Math.round(a.chance*100)}% · estado ${a.condicao}%`
      +(a.travada?' · TRAVADA':''));
    if(S.armaFogo!==id)
      botao('Pegar '+a.nome.toLowerCase(),()=>{equiparFogo(id);telaArmas(volta);},{custo:'na mão'});
    if(a.travada)
      botao('Destravar',()=>{destravar(id);amToca&&amToca('metal_cai');telaArmas(volta);},{custo:'puxa o ferrolho'});
    const v=a.podeRecarregar;
    botao(A.porCartucho?'Enfiar um cartucho':'Recarregar',()=>{
      const n=recarregar(id,A.porCartucho?1:null);
      if(!n)diz('Não deu pra carregar.','perigo');
      else diz(`+${n} ${A.porCartucho?'cartucho':'na arma'}. Levou ${tempoDeRecarga(id)}s.`,'sist');
      amToca&&amToca('metal_cai');
      telaArmas(volta);
    },{custo:v.ok?`reserva ${a.reserva} · ${tempoDeRecarga(id)}s`:'',falta:v.ok?'':v.porque});
    if(a.modos.length>1)
      botao('Modo: '+a.modo,()=>{trocarModo(id);telaArmas(volta);},
        {custo:a.modos.join(' / ')});
  });
  diz('Munição guardada: '+(Object.keys(S.municao||{}).filter(k=>S.municao[k]>0)
    .map(k=>S.municao[k]+' de '+k).join(' · ')||'nenhuma'),'sist');
  botao('Voltar',volta,{cls:'chave'});
}

/* ---------- desenho das roupas ---------- */
function desenhoDeRoupa(id,R){
  const P='#7A7266', C='#5A4A3E', E='#2E3238';
  const forma={
   tronco1:s=>{CX.fillStyle=P;CX.beginPath();
     CX.moveTo(-s*.20,-s*.20);CX.lineTo(s*.20,-s*.20);
     CX.lineTo(s*.24,s*.26);CX.lineTo(-s*.24,s*.26);CX.closePath();CX.fill();
     dRect(-s*.08,-s*.22,s*.16,s*.06,'#4A443E');},
   tronco2:s=>{CX.fillStyle=C;CX.beginPath();
     CX.moveTo(-s*.24,-s*.22);CX.lineTo(s*.24,-s*.22);
     CX.lineTo(s*.26,s*.28);CX.lineTo(-s*.26,s*.28);CX.closePath();CX.fill();
     dLinha(0,-s*.20,0,s*.28,'#3A2E26',2);
     dRect(-s*.34,-s*.18,s*.10,s*.34,'#4A3A30');
     dRect(s*.24,-s*.18,s*.10,s*.34,'#4A3A30');},
   pernas:s=>{dRect(-s*.16,-s*.24,s*.13,s*.50,'#4A5262');
     dRect(s*.03,-s*.24,s*.13,s*.50,'#4A5262');
     dRect(-s*.16,-s*.26,s*.32,s*.07,'#3A424E');},
   pes:s=>{CX.fillStyle=C;CX.beginPath();
     CX.moveTo(-s*.24,s*.06);CX.lineTo(s*.10,s*.06);CX.lineTo(s*.22,s*.20);
     CX.lineTo(-s*.24,s*.20);CX.closePath();CX.fill();
     dRect(-s*.24,s*.18,s*.46,s*.05,'#2A2420');
     dRect(-s*.20,-s*.10,s*.18,s*.18,'#4A3A2E');},
   maos:s=>{CX.fillStyle=C;CX.beginPath();
     CX.moveTo(-s*.14,s*.20);CX.lineTo(-s*.16,-s*.10);CX.lineTo(s*.14,-s*.14);
     CX.lineTo(s*.16,s*.18);CX.closePath();CX.fill();
     for(let i=0;i<3;i++)dRect(-s*.10+i*s*.09,-s*.24,s*.06,s*.12,'#4A3A2E');},
   cabeca:s=>{CX.fillStyle='#C9A227';CX.beginPath();
     CX.arc(0,s*.02,s*.24,Math.PI,0);CX.fill();
     dRect(-s*.30,s*.00,s*.60,s*.06,'#A8871E');
     dLinha(0,-s*.22,0,s*.02,'#8A6E18',2);},
   rosto:s=>{CX.fillStyle=P;CX.beginPath();
     CX.ellipse(0,0,s*.22,s*.15,0,0,7);CX.fill();
     dLinha(-s*.22,-s*.06,-s*.34,-s*.12,'#5A5248',1.5);
     dLinha(s*.22,-s*.06,s*.34,-s*.12,'#5A5248',1.5);},
   cintura:s=>{dRect(-s*.30,-s*.05,s*.60,s*.11,C);
     dRect(-s*.05,-s*.07,s*.10,s*.15,'#8A8F98');
     dRect(-s*.24,s*.06,s*.10,s*.16,'#4A3A2E');
     dRect(s*.14,s*.06,s*.10,s*.16,'#4A3A2E');},
   mochila:s=>{dRect(-s*.18,-s*.20,s*.36,s*.42,'#4A4238');
     dRect(-s*.18,-s*.20,s*.36,s*.08,'#3A342C');
     dRect(-s*.06,s*.00,s*.12,s*.14,'#5A5248');}
  };
  return forma[R.slot]||forma.tronco1;
}

/* ---------- persistência ---------- */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      const d=JSON.parse(localStorage.getItem(CHAVE)||'{}');
      d.corpo=S.corpo;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){}
  };
}

function corpoEstado(){
  const C=corpo(), P=penalidadesDoCorpo();
  return {slots:{...C}, penalidades:P,
    protecao:Object.fromEntries(REGIOES.map(r=>[r,
      Object.fromEntries(['corte','pancada','mordida'].map(t=>[t,protecaoDe(r,t)]))])),
    vestidos:SLOTS.filter(s=>C[s.id]).length};
}

registrarRoupas();
S.corpo=S.corpo||{};
