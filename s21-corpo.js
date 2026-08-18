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
 {id:'tronco1', n:'Tronco (interno)', curto:'POR DENTRO', reg:['torso']},
 {id:'tronco2', n:'Tronco (externo)', curto:'POR CIMA', reg:['torso','bracos']},
 {id:'armadura',n:'Armadura',      reg:['torso']},
 {id:'maos',    n:'Mãos',          reg:['bracos']},
 {id:'cintura', n:'Cintura',       reg:['torso']},
 {id:'pernas',  n:'Pernas',        reg:['pernas']},
 {id:'pes',     n:'Pés',           reg:['pes']},
 {id:'costas',  n:'Costas',        reg:[]},
 {id:'mochila', n:'Mochila',       reg:[]},
 {id:'branca',  n:'Arma branca',   curto:'BRANCA', reg:[]},
 {id:'fogo',    n:'Arma de fogo',  curto:'FOGO', reg:[]},
 {id:'util',    n:'Utilitário',    curto:'UTIL', reg:[]}
];
const REGIOES=['cabeca','torso','bracos','pernas','pes'];

/* ---------- as peças ----------
   `prot` é por tipo de dano e vale só nas `reg` da peça. `veloc` e
   `ruido` são o preço: armadura pesada protege e denuncia.

   `atr` é o que faz valer a pena escolher: cada peça mexe num
   atributo, e as pesadas cobram noutro. Tênis corre e é silencioso;
   bota aguenta caminhada e faz barulho. Colete segura pancada e
   entrega você. O teto de 10 continua valendo — bônus de peça entra
   na mesma conta da classe e é preso junto. */
const ROUPAS={
 camiseta:{n:'Camiseta puída',slot:'tronco1',reg:['torso'],kg:.2, atr:{velocidade:1},
   prot:{corte:.04,pancada:.02}, veloc:0, ruido:0, calor:.1,
   d:'Serve pra não andar sem camisa. É tudo que ela faz.'},
 camisa:{n:'Camisa de manga',slot:'tronco1',reg:['torso','bracos'],kg:.3, atr:{vitalidade:1},
   prot:{corte:.06,arranhao:.12}, veloc:0, ruido:0, calor:.2,
   d:'Manga comprida segura mato e unha, não segura dente.'},
 calca:{n:'Calça de brim',slot:'pernas',reg:['pernas'],kg:.6, atr:{resistencia:1},
   prot:{corte:.10,arranhao:.20,pancada:.04}, veloc:0, ruido:.02, calor:.2,
   d:'Grossa no joelho. Aguenta cerca e mato.'},
 casaco:{n:'Casaco pesado',slot:'tronco2',reg:['torso','bracos'],kg:1.4, atr:{vitalidade:1,velocidade:-1},
   prot:{corte:.14,pancada:.10,mordida:.08}, veloc:-.03, ruido:.04, calor:.6,
   d:'Quente demais de dia, e é ele que te salva de madrugada.'},
 bota:{n:'Bota de couro',slot:'pes',reg:['pes'],kg:1.1, atr:{resistencia:1,furtividade:-1},
   prot:{corte:.22,pancada:.16,mordida:.14}, veloc:.02, ruido:.06, calor:.2,
   d:'Cano alto. Pisa em prego e você nem sente.'},
 tenis:{n:'Tênis gasto',slot:'pes',reg:['pes'],kg:.5, atr:{velocidade:1,furtividade:1},
   prot:{corte:.06}, veloc:.05, ruido:-.06, calor:0,
   d:'Solado macio. Corre melhor e faz menos barulho que bota.'},
 luva:{n:'Luva de raspa',slot:'maos',reg:['bracos'],kg:.2, atr:{destreza:1},
   prot:{corte:.18,queimadura:.25}, veloc:0, ruido:0, calor:.1,
   d:'Pega vidro e arame sem abrir a mão.'},
 capacete:{n:'Capacete de obra',slot:'cabeca',reg:['cabeca'],kg:.9, atr:{vitalidade:1,percepcao:-1},
   prot:{pancada:.35,corte:.12}, veloc:-.02, ruido:.03, calor:0,
   d:'Amarelo e feio. Já segurou telha inteira.'},
 mascara:{n:'Máscara de pano',slot:'rosto',reg:['cabeca'],kg:.1, atr:{furtividade:1},
   prot:{doenca:.20}, veloc:0, ruido:0, calor:.1,
   d:'Filtra poeira e o cheiro do que apodrece.'},
 joelheira:{n:'Joelheira e caneleira',slot:'pernas',reg:['pernas'],kg:.7, atr:{forca:1,velocidade:-1},
   prot:{pancada:.22,corte:.14}, veloc:-.02, ruido:.03, calor:0,
   d:'Plástico duro sobre a canela. Chutar porta deixa de doer.'},
 cinto:{n:'Cinto de ferramenta',slot:'cintura',reg:['torso'],kg:.8, atr:{destreza:1},
   prot:{}, veloc:-.01, ruido:.05, extra:{vol:4},
   d:'Quatro espaços a mais, pendurados na cintura, batendo na perna.'},
 mochila_leve:{n:'Mochila pequena',slot:'mochila',reg:[],kg:.8, atr:{forca:1},
   prot:{}, veloc:0, ruido:.02, extra:{vol:10,kg:6},
   d:'Cabe pouco e não atrapalha nada.'}
};

/* as armaduras do §15 entram aqui com região e tipo de dano */
const ARMADURAS_REG={
 colete:{reg:['torso'],prot:{corte:.30,pancada:.34,mordida:.26},veloc:-.05,ruido:.10,
   atr:{vitalidade:1,furtividade:-1}},
 avental:{reg:['torso','pernas'],prot:{corte:.34,queimadura:.30},veloc:-.06,ruido:.08,
   atr:{forca:1,destreza:-1}},
 jaqueta:{reg:['torso','bracos'],prot:{corte:.20,mordida:.18},veloc:-.02,ruido:.04,
   atr:{vitalidade:1}}
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
/* o bônus de atributo que o que você veste está dando agora.
   O §19 consulta esta função ao montar as parcelas — por isso ela
   tem nome estável e devolve 0 pra qualquer coisa desconhecida. */
function bonusEquipamento(k){
  let n=0;
  const C=corpo();
  SLOTS.forEach(s=>{
    const id=C[s.id]; if(!id)return;
    const R=ROUPAS[id]||ARMADURAS_REG[id];
    if(!R||!R.atr)return;
    /* peça quebrada não dá bônus nenhum: o que está em pedaços não
       ajuda, e a penalidade dela continua valendo */
    const pc=(typeof peca==='function'&&typeof ehDuravel==='function'&&ehDuravel(id))?peca(id):null;
    const v=R.atr[k]||0;
    if(v>0&&pc&&typeof quebrado==='function'&&quebrado(pc))return;
    n+=v;
  });
  return n;
}
/* tudo que o corpo está dando, pra tela mostrar de uma vez */
function bonusEquipamentoTudo(){
  const out={};
  (typeof ATRIB_IDS!=='undefined'?ATRIB_IDS:[]).forEach(k=>{
    const v=bonusEquipamento(k); if(v)out[k]=v;
  });
  return out;
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

/* ================= O PAINEL DE EQUIPAMENTO =================
   Desenhado no canvas do próprio jogo, e não em DOM, por um motivo
   concreto: assim cada slot mostra o ÍCONE REAL do item, com a mesma
   arte vetorial que a mochila usa (`desItem`). Um painel em DOM teria
   de reinventar os ícones ou mostrar só texto.

   A silhueta é original — traço simples, mesma paleta do jogo. A
   organização (corpo no meio, slots em volta, peso e proteção
   embaixo) é a de qualquer tela de equipamento; a arte não é de
   ninguém. */

/* onde cada slot fica em volta do corpo, em fração da tela */
const POSTO={
  cabeca:  [.18,.13], rosto:   [.18,.28],
  tronco1: [.18,.43], tronco2: [.18,.58],
  armadura:[.18,.73], cintura: [.18,.88],
  costas:  [.82,.13], mochila: [.82,.28],
  maos:    [.82,.43], pernas:  [.82,.58],
  pes:     [.82,.73], util:    [.82,.88],
  branca:  [.38,.955], fogo:   [.62,.955]
};
let GRADE_CORPO=[], _slotFoco=null;

function desenharSilhueta(w,h){
  const cx=w*.5, topo=h*.10, alt=h*.74;
  CX.strokeStyle='rgba(176,166,190,.52)';
  CX.fillStyle='rgba(128,120,142,.16)';
  CX.lineWidth=Math.max(1.5,w*.004);
  const p=(x,y)=>[cx+x*w,topo+y*alt];
  CX.beginPath();
  CX.arc(cx,topo+alt*.075,alt*.075,0,7);            /* cabeça */
  CX.fill(); CX.stroke();
  CX.beginPath();                                    /* tronco */
  CX.moveTo(...p(-.075,.17)); CX.lineTo(...p(.075,.17));
  CX.lineTo(...p(.088,.30));  CX.lineTo(...p(.070,.52));
  CX.lineTo(...p(-.070,.52)); CX.lineTo(...p(-.088,.30));
  CX.closePath(); CX.fill(); CX.stroke();
  [[-1],[1]].forEach(([s])=>{                        /* braços */
    CX.beginPath();
    CX.moveTo(...p(s*.075,.19)); CX.lineTo(...p(s*.135,.24));
    CX.lineTo(...p(s*.125,.50)); CX.lineTo(...p(s*.085,.49));
    CX.closePath(); CX.fill(); CX.stroke();
    CX.beginPath();                                  /* pernas */
    CX.moveTo(...p(s*.012,.52)); CX.lineTo(...p(s*.068,.52));
    CX.lineTo(...p(s*.062,.98)); CX.lineTo(...p(s*.016,.98));
    CX.closePath(); CX.fill(); CX.stroke();
  });
}

function desenharCorpo(w,h,t){
  const g=CX.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#141019'); g.addColorStop(1,'#08060C');
  CX.fillStyle=g; CX.fillRect(0,0,w,h);
  desenharSilhueta(w,h);

  const C=corpo(), P=penalidadesDoCorpo();
  const cel=Math.min(w*.155,h*.115);
  GRADE_CORPO=[];
  SLOTS.forEach(s=>{
    const pos=POSTO[s.id]; if(!pos)return;
    const x=pos[0]*w, y=pos[1]*h*.86+h*.03;
    const id=C[s.id];
    const foco=_slotFoco===s.id;
    /* moldura: cheia, vazia e em foco se distinguem por FORMA e
       espessura, não só por cor */
    CX.fillStyle=id?'rgba(255,235,190,.055)':'rgba(255,255,255,.022)';
    CX.fillRect(x-cel/2,y-cel/2,cel,cel);
    CX.strokeStyle=foco?'rgba(201,162,39,.95)'
      :(id?'rgba(201,162,39,.40)':'rgba(120,110,130,.28)');
    CX.lineWidth=foco?2.5:1;
    CX.strokeRect(x-cel/2,y-cel/2,cel,cel);
    if(id){
      try{ desItem(id,x,y-cel*.04,cel*.72); }catch(e){}
      /* barrinha de estado da peça, se ela se gasta */
      const pc=(typeof peca==='function'&&typeof ehDuravel==='function'&&ehDuravel(id))?peca(id):null;
      if(pc&&typeof pctDur==='function'){
        const pct=pctDur(pc), q=(typeof qual==='function')?qual(pct):{cor:'#6E8C55'};
        CX.fillStyle='rgba(0,0,0,.55)';
        CX.fillRect(x-cel*.40,y+cel*.34,cel*.80,Math.max(2,cel*.07));
        CX.fillStyle=q.cor;
        CX.fillRect(x-cel*.40,y+cel*.34,cel*.80*(pct/100),Math.max(2,cel*.07));
      }
    }else{
      CX.strokeStyle='rgba(120,110,130,.22)'; CX.lineWidth=1;
      CX.beginPath();
      CX.moveTo(x-cel*.13,y); CX.lineTo(x+cel*.13,y);
      CX.moveTo(x,y-cel*.13); CX.lineTo(x,y+cel*.13);
      CX.stroke();
    }
    CX.fillStyle=id?'rgba(232,226,212,.62)':'rgba(232,226,212,.30)';
    CX.textAlign='center';
    CX.font=Math.max(7,cel*.19)+'px "Share Tech Mono",monospace';
    /* rótulo curto: 'Tronco (interno)' cortava no meio da palavra */
    CX.fillText((s.curto||s.n.toUpperCase()),x,y+cel*.66);
    GRADE_CORPO.push({slot:s.id,x,y,r:cel*.55});
  });

  /* peso e penalidade, em número */
  const inf=(typeof mochilaInfo==='function')?mochilaInfo():{kg:24};
  const carga=(typeof pesoAtual==='function')?pesoAtual():0;
  CX.textAlign='center';
  CX.fillStyle='rgba(201,162,39,.85)';
  CX.font=Math.max(9,h*.026)+'px "Share Tech Mono",monospace';
  CX.fillText(`roupa ${P.kg.toFixed(1)} kg · carga ${carga.toFixed(1)}/${inf.kg.toFixed(0)} kg`,w*.5,h*.045);
  const bonT=(typeof bonusEquipamentoTudo==='function')?bonusEquipamentoTudo():{};
  const bonTxt=Object.keys(bonT).map(k=>(bonT[k]>0?'+':'')+bonT[k]+' '+ATRIBUTOS[k].n).join(' · ');
  if(bonTxt){
    CX.fillStyle='rgba(110,140,85,.95)';
    CX.font=Math.max(8,h*.023)+'px "Share Tech Mono",monospace';
    CX.fillText(bonTxt,w*.5,h*.072);
  }
  if(P.veloc||P.ruido){
    CX.fillStyle='rgba(224,112,63,.85)';
    CX.font=Math.max(8,h*.022)+'px "Share Tech Mono",monospace';
    CX.fillText(`velocidade ${P.veloc>=0?'+':''}${Math.round(P.veloc*100)}%`
      +` · ruído +${Math.round(P.ruido*100)}%`,w*.5,bonTxt?h*.098:h*.072);
  }
  vinheta(w,h,1.05);
}

/* toque: acha o slot e abre as ações dele */
function toqueCorpo(e){
  if(!GRADE_CORPO.length||!CV)return;
  const r=CV.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const x=(e.clientX-r.left)*(CV.width/DPR)/r.width;
  const y=(e.clientY-r.top)*(CV.height/DPR)/r.height;
  const hit=GRADE_CORPO.find(g=>Math.abs(g.x-x)<=g.r&&Math.abs(g.y-y)<=g.r);
  if(!hit)return;
  _slotFoco=hit.slot;
  if(typeof amToca==='function')amToca('ui_clique');
  acoesDoSlot(hit.slot);
}
document.addEventListener('click',e=>{
  if(typeof cena==='undefined'||cena.modo!=='corpo')return;
  if(e.target!==CV)return;
  toqueCorpo(e);
});

/* as ações do slot escolhido, na barra de botões do jogo */
function acoesDoSlot(slot){
  const S2=SLOTS.find(x=>x.id===slot)||{n:slot};
  const C=corpo(), id=C[slot];
  limpar(); AC.innerHTML='';
  cap(S2.n.toUpperCase());
  if(id){
    const e=CATALOGO[id]||{n:id,d:''};
    const R=ROUPAS[id]||ARMADURAS_REG[id]||{};
    diz(e.n,'narr');
    if(e.d)diz(e.d,'fraco');
    const prot=Object.keys(R.prot||{});
    diz(prot.length
      ? 'Protege '+(R.reg||[]).join(', ')+' — '+prot.map(k=>k+' '+Math.round(R.prot[k]*100)+'%').join(' · ')
      : 'Não protege nada. Está aqui por outro motivo.','sist');
    if(R.atr){
      const mais=Object.keys(R.atr).filter(k=>R.atr[k]>0)
        .map(k=>`+${R.atr[k]} ${ATRIBUTOS[k].n}`).join(' · ');
      const menos=Object.keys(R.atr).filter(k=>R.atr[k]<0)
        .map(k=>`${R.atr[k]} ${ATRIBUTOS[k].n}`).join(' · ');
      if(mais)diz('Vestindo: '+mais,'bom');
      if(menos)diz('Em troca: '+menos,'perigo');
    }
    if(R.veloc||R.ruido)
      diz(`Custa: velocidade ${R.veloc>=0?'+':''}${Math.round((R.veloc||0)*100)}%`
        +` · ruído +${Math.round((R.ruido||0)*100)}%`,'alerta');
    const pc=(typeof peca==='function'&&typeof ehDuravel==='function'&&ehDuravel(id))?peca(id):null;
    if(pc&&typeof pctDur==='function')
      diz('Estado: '+pctDur(pc)+'% — '+qual(pctDur(pc)).n.toLowerCase(),'sist');
    botao('Tirar '+e.n.toLowerCase(),()=>{
      const t=desvestir(slot);
      if(t&&typeof guardar==='function'&&!guardar(t,1))
        diz('Não coube na mochila. Ficou no chão.','perigo');
      if(typeof amToca==='function')amToca('porta_maçaneta');
      acoesDoSlot(slot);
    },{custo:'volta pra mochila'});
  }else{
    diz('Nada aqui.','fraco');
  }
  /* o que da mochila cabe NESTE slot */
  const cabem=(typeof mochila==='function'?mochila().itens:[]).filter(it=>slotDe(it.id)===slot);
  if(cabem.length){
    diz('Na mochila:','sist');
    cabem.forEach(it=>{
      const e=CATALOGO[it.id]||{n:it.id};
      const R=ROUPAS[it.id]||ARMADURAS_REG[it.id]||{};
      const bon=Object.keys(R.atr||{}).map(k=>
        (R.atr[k]>0?'+':'')+R.atr[k]+' '+ATRIBUTOS[k].n.toLowerCase()).join(' · ');
      const prot=bon||Object.keys(R.prot||{}).map(k=>k+' '+Math.round(R.prot[k]*100)+'%').join(' · ');
      botao('Vestir '+e.n.toLowerCase(),()=>{
        const r=vestir(it.id);
        if(!r.ok)return diz('✕ '+r.porque,'perigo');
        if(typeof largar==='function')largar(it.id,1);
        if(typeof amToca==='function')amToca('porta_maçaneta');
        acoesDoSlot(slot);
      },{custo:prot||((e.kg||0)+' kg')});
    });
  }else if(!id){
    diz('E você não tem nada que sirva aqui.','fraco');
  }
  botao('Voltar ao corpo',()=>telaCorpo(cena.voltaCorpo),{cls:'chave'});
}

function telaCorpo(volta){
  cena.voltaCorpo=volta;
  const antes=cena.modo;
  cena.modo='corpo';
  if(typeof dimensionar==='function')dimensionar();
  limpar(); AC.innerHTML='';
  cap('O QUE VOCÊ ESTÁ VESTINDO');
  diz('Toque num slot pra ver o que ele protege e o que custa.','fraco');
  const P=penalidadesDoCorpo();
  diz(REGIOES.map(r=>r+' '+Math.round(protecaoDe(r,'corte')*100)+'%').join(' · '),'sist');
  if(P.volExtra||P.kgExtra)
    diz(`O que você veste ainda dá +${P.kgExtra} kg e +${P.volExtra} de espaço.`,'bom');
  botao('Fechar',()=>{
    cena.modo=(antes==='corpo'?'casa':antes);
    if(typeof dimensionar==='function')dimensionar();
    if(typeof salvar==='function')salvar();
    if(typeof volta==='function')volta();
    else if(typeof menuComodo==='function')menuComodo(cena.casa?cena.casa.voce:1);
  },{cls:'chave'});
}

/* o modo novo entra pelo desenho de cena desconhecida, que é onde o
   laço do v48 cai quando não reconhece `cena.modo` */
if(typeof desenharVazio==='function'){
  const _dv=desenharVazio;
  desenharVazio=function(w,h,t){
    if(typeof cena!=='undefined'&&cena.modo==='corpo')return desenharCorpo(w,h,t);
    return _dv.apply(this,arguments);
  };
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
