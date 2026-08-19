/* ================= §16 — ARMAZENAMENTO NA CASA =================
   Antes, o que não virava recurso caía num `S.guardados` que
   ninguém conseguia abrir: entrava e nunca mais saía. Agora são
   móveis de verdade, um por cômodo, com tela própria.

     16.1  StorageContainer — o móvel, a capacidade, a pilha
     16.2  StorageUI        — as duas colunas, busca, filtro, ordem
     16.3  SaveSystem       — o que fica gravado

   A durabilidade que o §15 pôs em cada peça viaja junto: item
   guardado não rejuvenesce, e comida no armário fechado estraga
   na metade da velocidade (isso está no `tickQualidade` do §15,
   que lê os baús daqui).                                        */

/* ================= 16.1 — StorageContainer ================= */

const BAUS={
 despensa:{n:'Armário da despensa',onde:2,slots:60,
   d:'Porta de correr que não fecha direito. Cabe quase tudo.'},
 sotao:{n:'Caixote do sótão',onde:0,slots:30,
   d:'Madeira seca e poeira. Ninguém sobe aqui sem motivo.'},
 porao:{n:'Prateleira do porão',onde:6,slots:40,
   d:'Fresco o ano todo. É o melhor lugar da casa pra comida.'}
};
const SLOTS_POR_MELHORIA=20, MAX_MELHORIAS=2;

function baus(){
  if(!S.baus||typeof S.baus!=='object')S.baus={};
  Object.keys(BAUS).forEach(id=>{
    const b=S.baus[id];
    if(!b||typeof b!=='object')S.baus[id]={itens:[],nivel:0};
    if(!Array.isArray(S.baus[id].itens))S.baus[id].itens=[];
    if(typeof S.baus[id].nivel!=='number')S.baus[id].nivel=0;
    /* item que saiu do catálogo entre versões não derruba a tela */
    S.baus[id].itens=S.baus[id].itens.filter(x=>x&&CATALOGO[x.id]&&x.q>0);
  });
  return S.baus;
}
function bauDe(id){return baus()[id];}
/* NOME PRÓPRIO, e isto é a correção de um bug crítico: esta função se
   chamava `capacidade`, igual à da expedição (index.html:9972), que diz
   quantos QUILOS você carrega e recebe o PARCEIRO. O jogo é um escopo
   global só; este bloco é injetado depois, então ele apagava a outra.
   A partir daí toda expedição estourava em `etapaCarga` com
   "Cannot read properties of undefined (reading 'slots')", porque
   `BAUS[parceiro]` não existe — e o jogador voltava pra casa sem nada,
   já que o loot só é creditado no fim. */
function capacidadeBau(id){
  return BAUS[id].slots+bauDe(id).nivel*SLOTS_POR_MELHORIA;
}
function usados(id){return bauDe(id).itens.length;}
function bauDoComodo(c){return Object.keys(BAUS).find(k=>BAUS[k].onde===c)||null;}

/* Empilhar: iguais juntam até o limite do item. Peça com
   durabilidade nunca junta com outra — duas facas em estados
   diferentes são duas coisas diferentes, e somar as duas numa
   pilha só apagaria a informação de qual é qual. */
function podeEmpilhar(a,b){
  if(a.id!==b.id)return false;
  const max=CATALOGO[a.id].pilha||1;
  if(a.q>=max)return false;
  /* Estados diferentes não se misturam: somar duas facas de 90% e
     de 30% numa pilha só apagaria qual é qual. Mas quatro frutas
     colhidas hoje estão no MESMO estado, e essas empilham — senão
     a comida fresca ocupava um slot por unidade. Arma e ferramenta
     não têm `pilha` no catálogo, então continuam uma por slot. */
  if(ehDuravel(a.id)&&(a.dur!==b.dur||a.durMax!==b.durMax))return false;
  return true;
}
function porNoBau(id,item,q){
  const b=bauDe(id);
  /* carimba a entrada antes de comparar, senão o segundo item da
     leva chega sem `dur` e nunca casa com o slot que acabou de
     nascer carimbado */
  if(ehDuravel(item.id))carimbar(item);
  let posto=0;
  for(let i=0;i<(q||1);i++){
    const alvo=b.itens.find(x=>podeEmpilhar(x,item));
    if(alvo){alvo.q++;posto++;continue;}
    if(b.itens.length>=capacidadeBau(id))break;
    const novo={id:item.id,q:1,dia:item.dia||S.dia};
    if(ehDuravel(item.id)){novo.dur=item.dur;novo.durMax=item.durMax;}
    carimbar(novo);
    b.itens.push(novo);posto++;
  }
  return posto;
}

/* mochila → baú */
function depositar(bau,slot,q){
  const m=mochila();
  const it=m.itens[slot];
  if(!it)return 0;
  carimbar(it);
  const n=Math.min(q||1,it.q);
  const posto=porNoBau(bau,it,n);
  it.q-=posto;
  if(it.q<=0)m.itens.splice(slot,1);
  return posto;
}
/* baú → mochila, respeitando peso e volume da mochila */
function retirar(bau,slot,q){
  const b=bauDe(bau);
  const it=b.itens[slot];
  if(!it)return 0;
  carimbar(it);
  let tirou=0;
  for(let i=0;i<Math.min(q||1,it.q);i++){
    if(!cabe(it.id,1))break;
    if(ehDuravel(it.id)){
      /* a peça vai inteira, com o estado dela, sem passar pelo
         `guardar` do v48 (que criaria uma peça nova e cheia) */
      const e=CATALOGO[it.id];
      if(e.mao){ if(maos().length>=2||pesoMaos()+e.kg>PESO_MAOS)break; maos().push(it.id); }
      else mochila().itens.push({id:it.id,q:1,dia:it.dia||S.dia,dur:it.dur,durMax:it.durMax});
    }else if(!guardar(it.id,1))break;
    tirou++;
  }
  it.q-=tirou;
  if(it.q<=0)b.itens.splice(slot,1);
  return tirou;
}
function depositarTudo(bau){
  let n=0;
  const m=mochila();
  for(let i=m.itens.length-1;i>=0;i--)n+=depositar(bau,i,m.itens[i].q);
  (S.maos||[]).slice().forEach(id=>{
    const p=peca(id);
    const falso={id,q:1,dia:S.dia,dur:p?p.dur:undefined,durMax:p?p.durMax:undefined};
    if(porNoBau(bau,falso,1)){S.maos=S.maos.filter(x=>x!==id);n++;}
  });
  return n;
}
function retirarTudo(bau){
  let n=0;
  const b=bauDe(bau);
  for(let i=b.itens.length-1;i>=0;i--)n+=retirar(bau,i,b.itens[i].q);
  return n;
}

/* o que sobrava do saque ia pro limbo do `S.guardados`. Agora cai
   na despensa, e a despensa abre. */
const _descarregar16=descarregar;
descarregar=function(){
  const r=_descarregar16.apply(this,arguments);
  const fora=[];
  (r.sobrou||[]).forEach(s=>{
    const p=ehDuravel(s.id)?peca(s.id):null;
    const posto=porNoBau('despensa',{id:s.id,q:s.q,dia:S.dia,
      dur:p?p.dur:undefined,durMax:p?p.durMax:undefined},s.q);
    if(posto<s.q)fora.push({id:s.id,q:s.q-posto});
  });
  S.guardados=fora;   /* só o que não coube fica de fora */
  if(fora.length)diz('O armário da despensa encheu. Sobrou coisa no chão da cozinha.','alerta');
  return r;
};
/* save antigo: o que estava no limbo entra no armário uma vez só */
(function migrar(){
  if(S.bauMigrado)return;
  (S.guardados||[]).forEach(g=>porNoBau('despensa',{id:g.id,q:g.q,dia:S.dia},g.q));
  S.guardados=[];S.bauMigrado=true;
})();

/* ================= 16.2 — StorageUI ================= */

const FILTROS=[
 {id:'tudo',   n:'tudo',      cats:null},
 {id:'arma',   n:'armas',     cats:['arma']},
 {id:'armadura',n:'armaduras',cats:['armadura']},
 {id:'ferra',  n:'ferramentas',cats:['ferra']},
 {id:'recurso',n:'recursos',  cats:['mat','achado','comb','pista']},
 {id:'consumo',n:'consumíveis',cats:['comida','agua','med']}
];
const ORDENS=[
 {id:'nome',  n:'nome'},
 {id:'raro',  n:'raridade'},
 {id:'qtd',   n:'quantidade'},
 {id:'estado',n:'conservação'}
];
const UI={bau:'despensa',busca:'',filtro:'tudo',ordem:'nome',volta:null};

function estiloBau(){
  if(document.getElementById('css-bau'))return;
  const s=document.createElement('style');
  s.id='css-bau';
  s.textContent=`
#bau{position:fixed;inset:0;z-index:75;background:var(--breu);display:flex;
  flex-direction:column;font-family:var(--corpo);color:var(--papel)}
#bau .topo{padding:10px 13px 8px;border-bottom:1px solid #2A232E;
  background:linear-gradient(180deg,#1B1721,#0F0D13)}
#bau .topo h2{font-family:var(--display);font-size:15px;font-weight:400;
  letter-spacing:.2em;text-transform:uppercase;color:var(--mofo)}
#bau .ctrl{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center}
#bau input,#bau select{background:#09070B;border:1px solid #2A232E;color:var(--papel);
  font-family:var(--mostrador);font-size:11px;padding:5px 7px;flex:1;min-width:0}
#bau .chips{display:flex;gap:4px;overflow-x:auto;margin-top:7px;padding-bottom:2px}
#bau .chip{font-family:var(--mostrador);font-size:9.5px;letter-spacing:.1em;
  text-transform:uppercase;padding:4px 8px;border:1px solid #2A232E;color:var(--mofo);
  white-space:nowrap;cursor:pointer;background:none}
#bau .chip.on{color:var(--lampiao);border-color:var(--lampiao)}
#bau .colunas{flex:1;display:flex;min-height:0}
#bau .col{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}
#bau .col+.col{border-left:1px solid #2A232E}
#bau .col h3{font-family:var(--mostrador);font-size:9.5px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--mofo);padding:8px 9px 6px;
  display:flex;justify-content:space-between;gap:6px;border-bottom:1px solid #1E1922}
#bau .col h3 b{color:var(--lampiao);font-weight:400}
/* o contador da mochila carrega peso e volume e quebrava em duas
   linhas a 390px; menor e mais apertado, cabe numa */
#bau .col h3 span:last-child{font-size:8.5px;letter-spacing:.03em;text-align:right}
#bau .lista{flex:1;overflow-y:auto;padding:4px 5px 10px;overscroll-behavior:contain}
#bau .lista.alvo{background:rgba(201,162,39,.07);outline:1px dashed rgba(201,162,39,.4)}
#bau .it{display:block;width:100%;text-align:left;background:none;border:0;
  border-bottom:1px solid #17131C;padding:7px 6px;color:var(--papel);cursor:pointer;
  font-family:var(--corpo);font-size:13.5px;line-height:1.25}
#bau .it:active{background:rgba(255,255,255,.06)}
#bau .it.arrasta{opacity:.4}
#bau .it .lin{display:flex;justify-content:space-between;gap:6px}
#bau .it .q{font-family:var(--mostrador);font-size:10.5px;color:var(--lampiao);flex:0 0 auto}
#bau .it .est{font-family:var(--mostrador);font-size:9px;letter-spacing:.06em;
  color:var(--mofo);text-transform:uppercase}
#bau .it .b{height:3px;background:#09070B;margin-top:3px}
#bau .it .b i{display:block;height:100%}
#bau .vazio{color:#6A6270;font-style:italic;font-size:13px;padding:14px 8px}
#bau .rodape{display:flex;gap:5px;padding:8px;border-top:1px solid #2A232E;
  background:#0F0D13;flex-wrap:wrap}
#bau .rodape button{flex:1;min-width:96px;background:#16131A;border:1px solid #2A232E;
  color:var(--papel);font-family:var(--corpo);font-size:13px;padding:9px 6px;cursor:pointer}
#bau .rodape button.chave{border-color:var(--lampiao);color:var(--lampiao)}
#bau .rodape button:active{background:#221D29}`;
  document.head.appendChild(s);
}

/* aplica busca, filtro e ordem sem mexer no array de verdade:
   devolve pares {it, i} pra que o clique saiba o índice real */
function vista(lista){
  const f=FILTROS.find(x=>x.id===UI.filtro)||FILTROS[0];
  const b=UI.busca.trim().toLowerCase();
  const out=lista.map((it,i)=>({it,i})).filter(({it})=>{
    const e=CATALOGO[it.id];
    if(!e)return false;
    if(f.cats&&!f.cats.includes(e.cat))return false;
    if(b&&!e.n.toLowerCase().includes(b))return false;
    return true;
  });
  const nome=x=>CATALOGO[x.it.id].n;
  /* na ordem por conservação, o que se gasta vem primeiro e do
     pior pro melhor. Tábua e lata não têm estado nenhum, então
     vão pro fim da lista em vez de empatar em 100% com a peça
     que ainda está inteira. */
  const estado=x=>ehDuravel(x.it.id)?pctDur(carimbar(x.it)):101;
  ({
    nome:  ()=>out.sort((a,b2)=>nome(a).localeCompare(nome(b2),'pt')),
    raro:  ()=>out.sort((a,b2)=>(CATALOGO[b2.it.id].raro||0)-(CATALOGO[a.it.id].raro||0)),
    qtd:   ()=>out.sort((a,b2)=>b2.it.q-a.it.q),
    estado:()=>out.sort((a,b2)=>estado(a)-estado(b2))
  }[UI.ordem]||(()=>{}))();
  return out;
}

function linhaItem(it,lado,idx){
  const e=CATALOGO[it.id];
  const b=document.createElement('button');
  b.className='it';b.draggable=true;
  b.dataset.lado=lado;b.dataset.i=idx;
  let est='',barra='';
  if(ehDuravel(it.id)){
    carimbar(it);
    const pct=pctDur(it),q=qual(pct);
    est=`<span class="est" style="color:${q.cor}">${esc(q.n)} ${pct}%</span>`;
    barra=`<div class="b"><i style="width:${pct}%;background:${q.cor}"></i></div>`;
  }else if(e.perece){
    est='<span class="est">perecível</span>';
  }
  b.innerHTML=`<div class="lin"><span>${esc(e.n)}</span>`
    +`<span class="q">${it.q>1?'×'+it.q:''}</span></div>`+est+barra;
  b.onclick=()=>{
    if(lado==='mochila')depositar(UI.bau,idx,1);
    else if(!retirar(UI.bau,idx,1))
      return avisoBau('Não cabe mais na mochila.');
    if(typeof amToca==='function')amToca('ui_clique');
    desenharBau();
  };
  b.addEventListener('dragstart',ev=>{
    ev.dataTransfer.setData('text/plain',lado+':'+idx);
    ev.dataTransfer.effectAllowed='move';
    b.classList.add('arrasta');
  });
  b.addEventListener('dragend',()=>b.classList.remove('arrasta'));
  return b;
}

function avisoBau(txt){
  const r=document.querySelector('#bau .aviso-bau');
  if(r)r.textContent=txt;
}

function desenharBau(){
  const el=document.getElementById('bau');
  if(!el)return;
  const B=BAUS[UI.bau],b=bauDe(UI.bau);
  const inf=mochilaInfo();
  el.querySelector('.tit').textContent=B.n;
  el.querySelector('.cont-bau').innerHTML=
    `<b>${usados(UI.bau)}</b>/${capacidadeBau(UI.bau)}`;
  /* "vol" atrás do volume porque, colado no contador de slots do
     armário, um "18/60" solto se lê como espaço de slot */
  el.querySelector('.cont-moch').innerHTML=
    `<b>${pesoAtual().toFixed(1)}</b>/${inf.kg.toFixed(0)}kg · <b>${volumeAtual()}</b>/${inf.vol} vol`;

  const encher=(sel,lista,lado)=>{
    const c=el.querySelector(sel);
    c.innerHTML='';
    const v=vista(lista);
    if(!v.length){
      const p=document.createElement('div');
      p.className='vazio';
      p.textContent=lista.length?'Nada com esse filtro.'
        :(lado==='bau'?'Vazio. Cabe o que você não quer carregar.':'A mochila está vazia.');
      c.appendChild(p);
      return;
    }
    v.forEach(({it,i})=>c.appendChild(linhaItem(it,lado,i)));
  };
  encher('.lista-moch',mochila().itens,'mochila');
  encher('.lista-bau',b.itens,'bau');
  atualizarPainel();
}

function abrirBau(id,volta){
  if(!BAUS[id])return;
  tickQualidade();
  UI.bau=id;UI.volta=volta||null;UI.busca='';
  estiloBau();
  fecharBau(true);
  const el=document.createElement('div');
  el.id='bau';
  el.innerHTML=`
   <div class="topo">
     <h2 class="tit"></h2>
     <div class="ctrl">
       <input class="busca" type="search" placeholder="buscar pelo nome" autocomplete="off">
       <select class="ordem">${ORDENS.map(o=>`<option value="${o.id}">por ${o.n}</option>`).join('')}</select>
     </div>
     <div class="chips">${FILTROS.map(f=>
        `<button class="chip${f.id===UI.filtro?' on':''}" data-f="${f.id}">${f.n}</button>`).join('')}</div>
     <div class="aviso-bau est" style="font-family:var(--mostrador);font-size:9.5px;color:#E0703F;min-height:12px;margin-top:4px"></div>
   </div>
   <div class="colunas">
     <div class="col">
       <h3><span>mochila</span><span class="cont-moch"></span></h3>
       <div class="lista lista-moch"></div>
     </div>
     <div class="col">
       <h3><span>armário</span><span class="cont-bau"></span></h3>
       <div class="lista lista-bau"></div>
     </div>
   </div>
   <div class="rodape">
     <button class="dep">Depositar tudo</button>
     <button class="ret">Retirar tudo</button>
     <button class="sai chave">Fechar</button>
   </div>`;
  document.body.appendChild(el);

  el.querySelector('.busca').addEventListener('input',ev=>{
    UI.busca=ev.target.value;desenharBau();
  });
  const sel=el.querySelector('.ordem');
  sel.value=UI.ordem;
  sel.addEventListener('change',ev=>{UI.ordem=ev.target.value;desenharBau();});
  el.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{
    UI.filtro=c.dataset.f;
    el.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===c));
    desenharBau();
  });
  el.querySelector('.dep').onclick=()=>{
    const n=depositarTudo(UI.bau);
    avisoBau(n?'':'Não coube nada: o armário está cheio.');
    desenharBau();
  };
  el.querySelector('.ret').onclick=()=>{
    const n=retirarTudo(UI.bau);
    avisoBau(n?'':'A mochila não aguenta mais nada.');
    desenharBau();
  };
  el.querySelector('.sai').onclick=()=>fecharBau();

  /* arrastar-e-soltar: solta na coluna de destino */
  el.querySelectorAll('.lista').forEach(z=>{
    z.addEventListener('dragover',ev=>{ev.preventDefault();z.classList.add('alvo');});
    z.addEventListener('dragleave',()=>z.classList.remove('alvo'));
    z.addEventListener('drop',ev=>{
      ev.preventDefault();z.classList.remove('alvo');
      const [lado,i]=String(ev.dataTransfer.getData('text/plain')).split(':');
      const paraBau=z.classList.contains('lista-bau');
      if(lado==='mochila'&&paraBau)depositar(UI.bau,+i,1);
      else if(lado==='bau'&&!paraBau){ if(!retirar(UI.bau,+i,1))avisoBau('Não cabe mais na mochila.'); }
      desenharBau();
    });
  });
  desenharBau();
}
function fecharBau(silencioso){
  const el=document.getElementById('bau');
  if(el)el.remove();
  if(silencioso)return;
  salvar();
  if(UI.volta)UI.volta();
}

/* ---- abrir por proximidade: no cômodo onde o móvel está, a
   tecla E abre. No celular não existe tecla, então o botão no
   menu do cômodo é o caminho principal e o E é atalho. ---- */
document.addEventListener('keydown',ev=>{
  if(ev.key!=='e'&&ev.key!=='E')return;
  if(document.getElementById('bau'))return fecharBau();
  if(!cena||!cena.casa||cena.modo==='mochila')return;
  const alvo=document.activeElement;
  if(alvo&&/^(INPUT|SELECT|TEXTAREA)$/.test(alvo.tagName))return;
  const id=bauDoComodo(cena.casa.voce);
  if(id)abrirBau(id,()=>menuComodo(cena.casa.voce));
});
document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'&&document.getElementById('bau'))fecharBau();
});

/* ---- melhorar o móvel ---- */
function melhorarBau(id){
  const b=bauDe(id);
  if(b.nivel>=MAX_MELHORIAS)return false;
  if(!temMat('tabua',3)||!temMat('prego',2))return false;
  gastarMat('tabua',3);gastarMat('prego',2);
  b.nivel++;
  return true;
}

/* ---- os botões no cômodo ---- */
const _menuComodo16=menuComodo;
menuComodo=function(id){
  const r=_menuComodo16.apply(this,arguments);
  const bid=bauDoComodo(id);
  if(bid){
    const b=bauDe(bid);
    botao(BAUS[bid].n,()=>abrirBau(bid,()=>menuComodo(id)),
      {custo:usados(bid)+'/'+capacidadeBau(bid)+' · tecla E'});
    if(b.nivel<MAX_MELHORIAS)
      botao('Montar mais prateleira',acaoDia(2,async()=>{
        if(!melhorarBau(bid)){diz('Faltou tábua ou prego.','perigo');return;}
        martelada(5,-.15);await pausa(1200);
        diz(`${BAUS[bid].n} agora cabe ${capacidadeBau(bid)} coisas.`,'bom');
      }),{custo:'2h · 3 tábuas + 2 pregos · +'+SLOTS_POR_MELHORIA+' espaços',
          falta:(temMat('tabua',3)&&temMat('prego',2))?'':'falta tábua ou prego'});
  }
  return r;
};

/* ================= 16.3 — SaveSystem =================
   O `salvar` do §15 já grava `baus` por cima do literal do v48, e
   o `carregar` do v48 copia de volta qualquer campo que encontre.
   Aqui fica só a garantia de estado válido na entrada — save de
   versão anterior, campo perdido, móvel novo que não existia. */
baus();
carimbarTudo();
