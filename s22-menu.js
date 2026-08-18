/* ================= §22 — ORGANIZAR OS BOTÕES =================
   DIAGNÓSTICO, medido: 191 botões espalhados por 9 cômodos, média de
   21 por tela. O porão chega a 22, o quintal a 23. Numa tela de
   celular isso é uma parede — a ação que você quer está sempre a seis
   rolagens de distância, e as três ou quatro que importam naquele
   cômodo ficam misturadas com "Ajustes" e "O caderno".

   O conserto NÃO é esconder botão. É separar o que é DESTE cômodo do
   que está sempre disponível em qualquer lugar:

     · o que é daqui  → sempre aberto, no topo
     · pra onde ir    → sempre aberto, compacto
     · você, a casa,
       saber          → recolhidos, um toque pra abrir

   Regra de classificação: o padrão é "daqui". Só sai da primeira
   seção o que combina com um padrão conhecido. Assim, botão novo que
   qualquer bloco futuro acrescente aparece no lugar certo por
   omissão, em vez de sumir numa gaveta.
   ============================================================== */

const GRUPOS=[
 {id:'aqui', n:'neste cômodo', abre:true},
 {id:'ir',   n:'ir para',      abre:true, compacto:true},
 {id:'voce', n:'você',         abre:false},
 {id:'casa', n:'a casa',       abre:false},
 {id:'saber',n:'saber',        abre:false}
];

/* de que grupo é cada botão, pelo texto. A ordem importa: o primeiro
   padrão que casar vence. */
const REGRAS=[
 [/^ir para |^ir pra |^voltar pra dentro|^sair sem virar|^voltar$/i, 'ir'],
 [/mochila|que você carrega|roupa e equipamento|machucados|cuidar de si|que segura você|vestir|^o que vestir/i,'voce'],
 [/quem está aqui|como está tudo|o que pesa hoje|conversar|pedir opinião|acusar|imitar/i,'casa'],
 [/caderno|ajustes|coisas de perto|como isso funciona|diário|o que elas sabem/i,'saber']
];
function grupoDoBotao(txt,dado){
  if(dado&&GRUPOS.some(g=>g.id===dado))return dado;
  for(const [re,g] of REGRAS) if(re.test(txt)) return g;
  return 'aqui';                    /* o padrão é o cômodo */
}

/* memória do que o jogador deixou aberto */
function abertos(){
  if(!S.cfg||typeof S.cfg!=='object')S.cfg={};
  if(!S.cfg.grupos||typeof S.cfg.grupos!=='object'){
    S.cfg.grupos={};
    GRUPOS.forEach(g=>S.cfg.grupos[g.id]=g.abre);
  }
  return S.cfg.grupos;
}

/* ---------- estilo ---------- */
function estiloMenu(){
  if(document.getElementById('css-menu'))return;
  const s=document.createElement('style');
  s.id='css-menu';
  s.textContent=`
.sec{border-top:1px solid #241E2A;margin-top:6px;padding-top:2px}
.sec:first-child{border-top:0;margin-top:0}
.sec-cab{width:100%;display:flex;align-items:center;gap:7px;background:none;border:0;
  color:var(--mofo);font-family:var(--mostrador);font-size:9.5px;letter-spacing:.16em;
  text-transform:uppercase;padding:7px 4px 5px;cursor:pointer;text-align:left}
.sec-cab .seta{color:var(--lampiao);font-size:8px;width:9px;flex:0 0 auto;
  transition:transform .18s ease}
.sec-cab.fechada .seta{transform:rotate(-90deg)}
.sec-cab .conta{margin-left:auto;color:var(--lampiao);opacity:.75}
.sec-cab:active{color:var(--papel)}
.sec-corpo{display:flex;flex-direction:column;gap:0}
.sec-corpo.escondida{display:none}
/* "ir para" fica em grade: são atalhos curtos e cabem lado a lado */
.sec-corpo.grade{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.sec-corpo.grade.escondida{display:none}
.sec-corpo.grade button{margin:0}
.sec-corpo.grade button .custo{display:none}`;
  document.head.appendChild(s);
}

/* ---------- marcar cada botão com o grupo dele ----------
   `botao` é do v48 e é chamada por todo lado. Aqui ela só ganha uma
   etiqueta: nada muda pra quem chama, e telas que não são de cômodo
   seguem exatamente como eram. */
if(typeof botao==='function'){
  const _botao=botao;
  botao=function(txt,fn,op){
    const b=_botao.call(this,txt,fn,op);
    try{
      const alvo=b&&b.dataset?b:AC.lastElementChild;
      if(alvo&&alvo.dataset)
        alvo.dataset.grupo=grupoDoBotao(String(txt),op&&op.grupo);
    }catch(e){}
    return b;
  };
}

/* ---------- reorganizar a barra de ações ---------- */
function organizarBotoes(){
  estiloMenu();
  if(!AC)return;
  const botoes=[...AC.children].filter(x=>x.tagName==='BUTTON');
  if(botoes.length<8)return;        /* tela pequena não precisa de seção */

  const porGrupo={};
  botoes.forEach(b=>{
    const g=b.dataset.grupo||'aqui';
    (porGrupo[g]=porGrupo[g]||[]).push(b);
  });
  const A=abertos();
  AC.innerHTML='';
  GRUPOS.forEach(G=>{
    const lista=porGrupo[G.id];
    if(!lista||!lista.length)return;
    const sec=document.createElement('div');
    sec.className='sec';
    const cab=document.createElement('button');
    cab.className='sec-cab'+(A[G.id]?'':' fechada');
    cab.innerHTML=`<span class="seta">▼</span>${esc(G.n)}<span class="conta">${lista.length}</span>`;
    const corpo=document.createElement('div');
    corpo.className='sec-corpo'+(G.compacto?' grade':'')+(A[G.id]?'':' escondida');
    lista.forEach(b=>corpo.appendChild(b));
    cab.onclick=()=>{
      A[G.id]=!A[G.id];
      cab.classList.toggle('fechada',!A[G.id]);
      corpo.classList.toggle('escondida',!A[G.id]);
      if(typeof amToca==='function')amToca('ui_clique');
    };
    sec.appendChild(cab); sec.appendChild(corpo);
    AC.appendChild(sec);
  });
}

/* só o menu de cômodo é reorganizado: é o único que passa de 20
   botões. As outras telas têm poucas ações e ficam como estavam. */
if(typeof menuComodo==='function'){
  const _mc=menuComodo;
  menuComodo=function(id){
    const r=_mc.apply(this,arguments);
    try{ organizarBotoes(); }catch(e){}
    return r;
  };
}
/* o menu do dia também enche */
if(typeof cenaDia==='function'){
  const _cd=cenaDia;
  cenaDia=function(){
    const r=_cd.apply(this,arguments);
    try{ queueMicrotask(organizarBotoes); }catch(e){}
    return r;
  };
}

/* o estado das seções acompanha o save, junto com o resto de `cfg`,
   que o v48 já grava */
function menuEstado(){
  const c={};
  [...AC.querySelectorAll('.sec')].forEach(s=>{
    const cab=s.querySelector('.sec-cab');
    const n=s.querySelectorAll('.sec-corpo button').length;
    c[cab.textContent.replace(/[▼\d]/g,'').trim()]={n,aberta:!cab.classList.contains('fechada')};
  });
  return {secoes:c, total:AC.querySelectorAll('.sec-corpo button').length,
    visiveis:[...AC.querySelectorAll('.sec-corpo:not(.escondida) button')].length};
}
