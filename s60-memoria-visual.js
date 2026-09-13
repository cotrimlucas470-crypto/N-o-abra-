/* ================= §60 · A CASA LEMBRA ================================

   AUDITORIA PRIMEIRO, e ela achou uma coisa maior do que o esperado.

   SEIS sistemas ja guardam estado por comodo: marcas, traumas, costuras,
   avarias, o Hospede e os lugares onde voce viu coisa. Dois deles somem
   com o tempo (os dois sao recentes); quatro nunca somem.

   E o que NAO existia:

     · peso acumulado por comodo — nada media "aconteceu muita coisa aqui";
     · origem declarada — nada separava "a cadeira mudou de lugar mesmo"
       de "voce acha que mudou" de "uma anomalia mudou";
     · cicatrizacao — dano nunca se recuperava com o tempo;
     · e a decisiva: O DESENHO DO COMODO NAO LIA QUASE NADA DISSO.
       Medido no codigo das cenas: so `costuras` aparece. Marca, trauma,
       avaria, hospede, sangue — a camada visual nunca consultou nenhum.

   Ou seja, a casa ja lembrava, mas so por escrito. "O cenario conta a
   historia antes do jogo contar" nao acontecia: o cenario nao sabia de
   nada. E esse o buraco que este bloco fecha.

   O QUE ENTRA:

   1 · PESO. Cada acontecimento vale um tanto, e o peso fica no comodo.
       Peso alto = comodo mais alterado visualmente.
   2 · ORIGEM. Toda alteracao carrega de onde veio. Duas alteracoes
       podem ser identicas na tela e diferentes por dentro — e e isso que
       faz investigar valer a pena.
   3 · CICATRIZACAO. O peso baixa com o tempo, e o que nao cicatriza
       nunca (morte) fica declarado como permanente.
   4 · MEMORIA ANOMALA. A memoria VISUAL pode discordar da REAL. Raro,
       e so onde ja houve anomalia.
   5 · E A TINTA. `lemPintar` desenha o acumulado no comodo. E aqui que
       a historia aparece sem ninguem contar.

   O QUE NAO ENTRA: nenhum sistema paralelo aos seis que ja existem.
   Este bloco LE os seis por adaptador e escreve um resumo — copia
   diverge no primeiro ajuste, e seis copias divergiriam seis vezes. */

/* O prefixo e LEM_ (de lembranca) e nao MEM_ porque o §32 — a memoria
   cognitiva da casa — ja usa MEM_CFG, e a trava de colisao do montar.js
   quebrou o build na hora. Dois blocos com o mesmo nome de topo fazem o
   segundo apagar o primeiro em silencio. */
const LEM_CFG={
  /* quantos eventos crus o comodo guarda antes de virar so peso */
  eventosPorComodo:12,
  /* o peso decai por dia; o que nao cicatriza ignora isto */
  decaiPorDia:.6,
  /* teto, pra um comodo nao virar tinta solida */
  pesoMax:60,
  /* a partir de que peso cada camada visual aparece */
  limiar:{marca:4, sujeira:10, dano:18, ruina:32},
  /* memoria anomala: so onde houve anomalia, e so raramente */
  anomalaMin:12,
  anomalaTeto:.35
};

/* as origens que o pedido declara. `RUMOR` entra porque o jogo ja tem
   rumor (§29) e seria estranho ele ser a unica fonte sem nome. */
const LEM_ORIGENS={
  FISICO:    {n:'aconteceu mesmo',        confia:1.00},
  AMBIENTE:  {n:'a casa cedendo',         confia:.90},
  NPC:       {n:'alguém da casa',         confia:.85},
  ENTIDADE:  {n:'alguma coisa fez',       confia:.70},
  ANOMALIA:  {n:'a anomalia mexeu',       confia:.45},
  RUMOR:     {n:'alguém contou',          confia:.35},
  ILUSAO:    {n:'só na sua cabeça',       confia:.00}
};

/* o peso de cada coisa, na ordem que o pedido pediu */
const LEM_PESO={
  porta:1, objeto:1, visita:0, rastro:2, sangue:3,
  avaria:4, costura:5, hospede:6, invasao:8,
  morte:10, ritual:15, anomaliaForte:20
};
/* o que NUNCA cicatriza */
const LEM_PERMANENTE={morte:true, ritual:true};

/* ---------- estado ----------
   Resumo por comodo, nao filme. O save guarda peso + poucos eventos, e
   a reconstrucao visual sai do peso — que e o que o pedido chama de
   "estado + historico -> reconstrucao". */
function lemCasa(){
  if(!S.memoriaCasa||typeof S.memoriaCasa!=='object')S.memoriaCasa={};
  return S.memoriaCasa;
}
function lemDo(comodo){
  const M=lemCasa(), c=String(comodo|0);
  if(!M[c])M[c]={peso:0, fixo:0, eventos:[], anomala:0, dia:S.dia|0};
  return M[c];
}
/* peso de agora: o que cicatriza ja descontado, mais o que nao cicatriza */
function lemPeso(comodo){
  const m=lemDo(comodo);
  const dias=Math.max(0,(S.dia|0)-(m.dia|0));
  const vivo=Math.max(0,(m.peso||0)-dias*LEM_CFG.decaiPorDia);
  return Math.min(LEM_CFG.pesoMax, vivo+(m.fixo||0));
}
function lemAnotar(comodo,tipo,origem,extra){
  const m=lemDo(comodo);
  const p=LEM_PESO[tipo]||1;
  const perm=!!LEM_PERMANENTE[tipo];
  /* o decaimento e aplicado ANTES de somar, senao o peso velho
     ressuscita junto com o novo */
  const dias=Math.max(0,(S.dia|0)-(m.dia|0));
  m.peso=Math.max(0,(m.peso||0)-dias*LEM_CFG.decaiPorDia);
  m.dia=S.dia|0;
  if(perm)m.fixo=Math.min(LEM_CFG.pesoMax,(m.fixo||0)+p);
  else    m.peso=Math.min(LEM_CFG.pesoMax,(m.peso||0)+p);
  m.eventos.push({t:tipo, o:LEM_ORIGENS[origem]?origem:'FISICO',
                  d:S.dia|0, p, ...(extra||{})});
  while(m.eventos.length>LEM_CFG.eventosPorComodo)m.eventos.shift();
  if(origem==='ANOMALIA')m.anomala=Math.min(LEM_CFG.anomalaTeto,(m.anomala||0)+.06);
  if(typeof marcarSujo==='function')marcarSujo();
  return m;
}
function lemEventos(comodo){ return lemDo(comodo).eventos.slice(); }
function lemOrigem(comodo){
  const e=lemDo(comodo).eventos;
  if(!e.length)return null;
  const c={}; e.forEach(x=>{ c[x.o]=(c[x.o]||0)+x.p; });
  return Object.keys(c).sort((a,b)=>c[b]-c[a])[0];
}

/* ---------- os adaptadores ----------
   Os seis sistemas continuam donos do que sabem. Aqui so se ANOTA. */
function lemSincronizar(){
  let n=0;
  const vez=(comodo,tipo,origem,chave)=>{
    const m=lemDo(comodo);
    if(m.eventos.some(x=>x.k===chave))return;
    lemAnotar(comodo,tipo,origem,{k:chave});
    n++;
  };
  try{ (S.marcas||[]).forEach(x=>vez(x.onde,'rastro','ENTIDADE','marca:'+x.onde+':'+x.dia)); }catch(e){}
  try{ (S.traumas||[]).forEach(x=>vez(x.comodo,'sangue','FISICO','trauma:'+x.comodo+':'+x.dia)); }catch(e){}
  try{ const c=(typeof costEstado==='function')?costEstado():null;
    if(c)(c.desfeitos||[]).forEach(x=>vez(x.comodo,'costura','ANOMALIA','cost:'+x.comodo+':'+x.dia)); }catch(e){}
  try{ const h=(typeof hospede==='function')?hospede():null;
    if(h)vez(h.comodo,'hospede','AMBIENTE','hosp:'+h.comodo+':'+h.desdeDia); }catch(e){}
  try{ if(typeof avariasNo==='function')for(let i=0;i<9;i++)
    avariasNo(i).forEach(a=>vez(i,'avaria','AMBIENTE','av:'+i+':'+a.id)); }catch(e){}
  n+=lemMortesNovas();
  return n;
}
/* morte de morador: cicatriz que nunca some, no comodo em que ele ficava.

   NAO EMBRULHO uma funcao de morte porque nao existe uma: o jogo faz
   `S.mortos.push(p)` em SEIS lugares diferentes. Embrulhar seis e
   convite pra esquecer o setimo. Em vez disso a sincronizacao compara a
   lista de mortos com o que ja foi anotado — quem entrou na lista e nao
   tem cicatriz, ganha uma. Pega todos os caminhos, inclusive os que
   ainda nao existem. */
function lemMortesNovas(){
  let n=0;
  try{
    (S.mortos||[]).forEach(p=>{
      if(!p||!p.n)return;
      const c=(p.local!=null)?p.local|0:4;
      const chave='morte:'+p.n;
      const m=lemDo(c);
      if(m.eventos.some(x=>x.k===chave))return;
      /* ja anotada em OUTRO comodo? entao nao repete */
      const M=lemCasa();
      for(const k in M)if(M[k].eventos.some(x=>x.k===chave))return;
      lemAnotar(c,'morte','NPC',{quem:p.n, k:chave});
      n++;
    });
  }catch(e){}
  return n;
}

/* ---------- a memória que discorda ----------
   O comodo com historico de anomalia pode mostrar uma coisa que a
   memoria REAL nao registra. Deterministico por dia+comodo: nao e
   sorteio a cada quadro, senao viraria chuvisco, e recarregar daria
   outra coisa. */
function lemDiscorda(comodo){
  const m=lemDo(comodo);
  if(lemPeso(comodo)<LEM_CFG.anomalaMin)return null;
  if(!(m.anomala>0))return null;
  const s=semente(613+((S.dia|0)*17), comodo|0);
  if(s>=m.anomala)return null;
  const quais=['espelho','retrato','cadeira','porta'];
  return {coisa:quais[Math.abs(hash32('disc'+(S.dia|0)+':'+comodo))%quais.length],
          origem:'ANOMALIA', forca:+(m.anomala).toFixed(3)};
}

/* ================= A TINTA =================
   Aqui a memoria vira imagem. Tudo deterministico por comodo+dia: o
   mesmo comodo no mesmo dia desenha igual, e voltar nele confirma o que
   voce viu — memoria que muda de lugar sozinha vira chuvisco, nao
   memoria. */
function lemPintar(w,h,comodo,py){
  if(typeof CX==='undefined')return 0;
  const c=comodo|0, P=lemPeso(c);
  if(P<LEM_CFG.limiar.marca)return 0;
  const L=LEM_CFG.limiar, base=py||h*.72;
  const d=c*31+7;
  let camadas=0;

  /* 1 · marca de uso: o que se arrasta deixa risco no chao.

     MEDIDO E CORRIGIDO: a primeira versao desenhava UM risco de 1,3px
     em cinza quase preto sobre um piso quase preto, e mudava 0,00% da
     tela. Ou seja: existia no codigo e nao existia pro jogador, que e
     justamente o defeito que este bloco inteiro foi escrito pra tirar.

     Arranhao em piso escuro nao e mais escuro: e mais CLARO — ele tira
     a sujeira e mostra a madeira de baixo. Entao o risco tem nucleo
     claro com sombra de um lado, que e como arranhao se le de verdade. */
  if(P>=L.marca){
    const n=Math.min(9,2+Math.floor((P-L.marca)/2));
    CX.save();
    for(let i=0;i<n;i++){
      const x=w*(.08+semente(311+d,i)*.80), y=base+(h-base)*(.16+semente(313+d,i)*.70);
      const lg=w*(.05+semente(317+d,i)*.13);
      const incl=(semente(319+d,i)-.5)*h*.010;
      const gr=Math.max(1,h*.0020);
      /* a sombra do sulco, de um lado so */
      CX.strokeStyle='rgba(6,4,3,.34)'; CX.lineWidth=gr*1.6;
      CX.beginPath(); CX.moveTo(x,y+gr); CX.lineTo(x+lg,y+incl+gr); CX.stroke();
      /* e a madeira limpa que apareceu no meio */
      CX.strokeStyle='rgba(196,178,150,'+(.14+semente(323+d,i)*.10).toFixed(3)+')';
      CX.lineWidth=gr;
      CX.beginPath(); CX.moveTo(x,y); CX.lineTo(x+lg,y+incl); CX.stroke();
    }
    CX.restore(); camadas++;
  }
  /* 2 · sujeira que ficou: manchas que nao saem mais */
  if(P>=L.sujeira){
    const n=Math.min(7,2+Math.floor((P-L.sujeira)/4));
    for(let i=0;i<n;i++){
      const x=w*(.06+semente(331+d,i)*.86), y=base+(h-base)*(.10+semente(337+d,i)*.8);
      const r=w*(.015+semente(347+d,i)*.05);
      CX.fillStyle='rgba(18,10,8,'+(.10+semente(349+d,i)*.12).toFixed(3)+')';
      CX.beginPath(); CX.ellipse(x,y,r,r*.5,semente(353+d,i)*3,0,7); CX.fill();
    }
    camadas++;
  }
  /* 3 · dano: a parede cede onde bateu muito */
  if(P>=L.dano){
    const n=Math.min(4,1+Math.floor((P-L.dano)/6));
    CX.save();
    for(let i=0;i<n;i++){
      const x=w*(.10+semente(359+d,i)*.8), y=base*(.30+semente(367+d,i)*.55);
      CX.strokeStyle='rgba(0,0,0,.40)'; CX.lineWidth=Math.max(1,h*.0026);
      CX.beginPath(); CX.moveTo(x,y);
      let px=x, py2=y;
      for(let k=0;k<4;k++){ px+=(semente(373+d,i*4+k)-.45)*w*.07; py2+=base*.055;
        CX.lineTo(px,py2); }
      CX.stroke();
      /* poeira caindo da trinca, que e o que a faz parecer funda */
      CX.fillStyle='rgba(198,186,166,.05)';
      CX.fillRect(px-w*.012,py2,w*.024,base*.02);
    }
    CX.restore(); camadas++;
  }
  /* 4 · ruina: o comodo deixou de ser cuidado */
  if(P>=L.ruina){
    const g=CX.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'rgba(10,7,6,.28)');
    g.addColorStop(.55,'rgba(10,7,6,.10)');
    g.addColorStop(1,'rgba(10,7,6,.30)');
    CX.fillStyle=g; CX.fillRect(0,0,w,h);
    camadas++;
  }
  /* 5 · a cicatriz que nao cicatriza: quem morreu aqui deixa o lugar */
  const m=lemDo(c);
  if((m.fixo||0)>0){
    const x=w*(.16+semente(379+d,0)*.6), y=base-h*.012;
    CX.save(); CX.globalAlpha=.55;
    CX.fillStyle='rgba(0,0,0,.35)';
    CX.beginPath(); CX.ellipse(x,y,w*.055,h*.010,0,0,7); CX.fill();
    CX.fillStyle='rgba(150,140,124,.07)';
    CX.fillRect(x-w*.03,y-h*.055,w*.06,h*.055);
    CX.restore(); camadas++;
  }
  return camadas;
}

/* o gancho: toda cena passa pelo `paredeBase`, entao a memoria entra la
   — depois do piso e ANTES do movel, senao a mancha fica por cima da
   mobilia e vira adesivo. */
if(typeof paredeBase==='function'){
  const _pb=paredeBase;
  paredeBase=function(w,h,cor,piso){
    const r=_pb.apply(this,arguments);
    try{
      const c=(typeof cena!=='undefined'&&cena.casa&&cena.casa.voce!=null)?cena.casa.voce|0:0;
      lemPintar(w,h,c,h*.72);
    }catch(e){}
    return r;
  };
}

/* ---------- investigar ----------
   Alteracao vira jogada: da pra olhar e descobrir de onde veio. O jogo
   nao entrega a origem de graca — entrega a CONFIANCA dela, que e o que
   deixa o jogador decidir se acredita. */
function lemInvestigar(comodo){
  const c=comodo|0;
  const P=lemPeso(c), ev=lemEventos(c);
  if(!ev.length)return {vazio:true, texto:'Você olha com calma. Este cômodo não tem nada fora do lugar.'};
  const dom=lemOrigem(c);
  const O=LEM_ORIGENS[dom]||LEM_ORIGENS.FISICO;
  const disc=lemDiscorda(c);
  const ultimo=ev[ev.length-1];
  const linhas=[];
  linhas.push('Peso do que já aconteceu aqui: '+Math.round(P)+'.');
  linhas.push('O mais recente: '+ultimo.t+', do dia '+ultimo.d+'.');
  linhas.push('A maior parte disto é '+O.n+'.');
  if(O.confia<.5)linhas.push('E você não tem como confirmar nada disso.');
  if(disc)linhas.push('Tem uma coisa aqui — o '+disc.coisa+' — que não bate com nada '
    +'que você lembra de ter acontecido.');
  return {vazio:false, peso:P, origem:dom, confia:O.confia,
    discorda:disc?disc.coisa:null, texto:linhas.join(' ')};
}

/* ---------- onde a investigacao vira jogada ----------
   A alteracao so vira jogo se der pra olhar. O botao aparece no comodo
   que TEM historico, e o que ele entrega nao e a verdade e sim a
   CONFIANCA na origem — e isso que deixa o jogador decidir se acredita. */
if(typeof menuComodo==='function'){
  const _mc=menuComodo;
  menuComodo=function(id){
    const r=_mc.apply(this,arguments);
    try{
      const P=lemPeso(id|0);
      if(P>=LEM_CFG.limiar.marca&&typeof botao==='function'){
        botao('Olhar o que mudou aqui',()=>{
          const q=lemInvestigar(id|0);
          if(typeof diz==='function')diz(q.texto, q.discorda?'alerta':'sist');
          if(typeof menuComodo==='function')menuComodo(id);
        },{custo:'peso '+Math.round(P)+(lemDiscorda(id|0)?' · tem coisa que não bate':'')});
      }
    }catch(e){}
    return r;
  };
}

/* ---------- gravar ----------
   Bloco ANEXA a save; bloco nunca CRIA save. */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    const r=_sv.apply(this,arguments);
    if(!S.nomeJogador)return r;
    try{
      const bruto=localStorage.getItem(CHAVE);
      if(!bruto)return r;
      const o=JSON.parse(bruto);
      if(S.memoriaCasa&&Object.keys(S.memoriaCasa).length)o.memoriaCasa=S.memoriaCasa;
      localStorage.setItem(CHAVE,JSON.stringify(o));
    }catch(e){}
    return r;
  };
}
/* e sincroniza de noite, junto com o resto que o dia fecha */
if(typeof anoitecer==='function'){
  const _an=anoitecer;
  anoitecer=async function(){
    const r=await _an.apply(this,arguments);
    try{ lemSincronizar(); }catch(e){}
    return r;
  };
}

function lembrancaEstado(){
  const M=lemCasa(), out={};
  Object.keys(M).forEach(c=>{
    out[c]={peso:+lemPeso(c).toFixed(1), fixo:M[c].fixo||0,
      eventos:M[c].eventos.length, anomala:+(M[c].anomala||0).toFixed(3),
      origem:lemOrigem(c), discorda:lemDiscorda(c)};
  });
  return {comodos:out, origens:Object.keys(LEM_ORIGENS),
    pesos:{...LEM_PESO}, permanentes:Object.keys(LEM_PERMANENTE),
    cfg:{...LEM_CFG}};
}
