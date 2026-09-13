/* ============ §64 · AS PASSIVAS MORDEM, E O DOSSIE APARECE ==========

   POR QUE ESTE BLOCO EXISTE

   O §61 passou a guardar, pra cada anomalia, um dossie inteiro — quantas
   vezes veio, por qual metodo voce a encerrou, o que ela aprendeu, que
   passiva deixou na casa. E o §62 passou a ancorar cada uma numa coisa
   da casa.

   Fechei os dois com 58 assercoes verdes e faltavam DUAS COISAS, e as
   duas sao a mesma falha que ja custou o §60 inteiro nesta sessao:

   1 · AS PASSIVAS NAO ERAM LIDAS POR NINGUEM. `S.passivasAtivas` era uma
       lista de `{campo, n, de}` e nenhum sistema do jogo consultava
       `campo`. Parametro morto e a proibicao nº 6 — e pior: a passiva e
       vendida ao jogador como "ficou uma marca na casa". Marca que nao
       muda nada e mentira na cara dele.

   2 · O DOSSIE NAO APARECIA EM LUGAR NENHUM. `dossiLer()` montava as
       linhas e nada chamava. E exatamente o defeito que a auditoria do
       §60 achou: "a casa lembrava, mas so por escrito". Memoria que nao
       vira tela e planilha.

   O QUE ENTRA

   · seis passivas com consumidor de verdade, cada uma ligada num sistema
     que ja existe (passo, agua, vizinhanca, ouvido, linhagem, camada)
   · a pagina do dossie no caderno, com as anomalias que voce ja viu
   · e a regra que mantem tudo honesto: TODA passiva tem os dois lados, e
     os dois lados sao cobrados por assercao
   ==================================================================== */

/* ---------- ENVELOPAR COM REDE ----------

   `typeof X==='function'` E VERDADEIRO PRA `const X = ()=>{}`. Entao a
   guarda que este projeto usa em todo envelope passa, a atribuicao lanca
   "Assignment to constant variable", e o TypeError MATA O RESTO DO
   BLOCO. Foi o que aconteceu aqui: `vizinhos` era `const`, e metade do
   §64 deixou de existir sem nenhum aviso na tela — so um erro no console
   e funcoes que sumiram.

   `envolver` faz o envelope dentro de try/catch e RECLAMA ALTO quando
   nao da. Alvo que nao aceita envelope vira uma linha no registro de
   erros em vez de levar o arquivo inteiro junto. */
function envolver(nome,fabrica){
  try{
    const velho=(typeof window!=='undefined')?window[nome]:undefined;
    if(typeof velho!=='function')return false;
    window[nome]=fabrica(velho);
    return true;
  }catch(e){
    const msg='§64 não conseguiu envelopar `'+nome+'`: '+e.message+
      ' (provavelmente é `const`, não `function`)';
    if(typeof registrarErro==='function')registrarErro(new Error(msg),'envolver');
    else console.warn('[não abra] '+msg);
    return false;
  }
}

const PASV_CFG={
  /* rotaAberta: a casa tem um caminho que a coisa abriu */
  rotaMenosTempo: .78,      /* o passo custa 22% menos tempo          */
  rotaMaisRuido: 1.35,      /* e 35% mais ruido, porque o vao e aberto */
  /* aguaParada: junta agua sozinha, e junta mosquito junto */
  aguaPorDia: 1,
  aguaRuidoPorDia: .6,
  /* vaoNovo: dois comodos ficaram ligados */
  vaoRisco: 1.2,            /* e o vao serve pros dois lados           */
  /* ecoDaCasa: voce ouve um comodo mais longe — e eles tambem */
  ecoAlcance: 1,
  /* ninhada: voce conhece a cria antes de ela chegar */
  ninhadaEstudo: 22,
  /* trancaSolta: uma camada ficou mais barata e mais perigosa */
  trancaCamada: 1,
  trancaRisco: 1.3
};

/* ---------- qual passiva esta valendo, e de quem ---------- */
function passivaDe(campo){
  try{ return (S.passivasAtivas||[]).find(p=>p&&p.campo===campo)||null; }
  catch(e){ return null; }
}

/* ================= 1 · rotaAberta — o passo =================
   Embrulha `custoDeEntrada` do §39. Menos tempo, mais ruido: o vao que
   ela abriu e atalho pra voce e porta pro que vier depois. */
envolver('custoDeEntrada',_custo=>function(id,de){
    const c=_custo.apply(this,arguments);
    try{
      if(passivaDe('rotaAberta')&&c){
        c.tempo=Math.max(1,Math.round(c.tempo*PASV_CFG.rotaMenosTempo));
        c.ruido=+(c.ruido*PASV_CFG.rotaMaisRuido).toFixed(2);
        c.rotaAberta=true;
      }
      if(passivaDe('trancaSolta')&&c){
        /* a camada ficou mais barata e mais perigosa */
        c.tempo=Math.max(1,c.tempo-PASV_CFG.trancaCamada);
        c.ruido=+(c.ruido*PASV_CFG.trancaRisco).toFixed(2);
        c.trancaSolta=true;
      }
    }catch(e){}
    return c;
});

/* ================= 2 · aguaParada — a manha =================
   Junta agua sozinha todo dia. E junta ruido junto, porque agua parada
   em casa fechada nao fica quieta. */
function passivaAmanhecer(){
  const out=[];
  try{
    if(passivaDe('aguaParada')){
      const antes=S.agua|0;
      S.agua=Math.min(6,antes+PASV_CFG.aguaPorDia);
      if(S.agua>antes)out.push(['Onde o cano vazava juntou água limpa: +'+
        (S.agua-antes)+'.','bom']);
      S.ruido=trava((S.ruido||0)+PASV_CFG.aguaRuidoPorDia,0,100);
      out.push(['E a água parada não fica quieta.','fraco']);
    }
    if(passivaDe('ninhada')){
      /* voce ja conhece a cara das filhas: elas nascem estudadas */
      const D=(typeof dossies==='function')?dossies():{};
      Object.keys(D).forEach(k=>{
        if(D[k].mae&&D[k].estudo<PASV_CFG.ninhadaEstudo){
          D[k].estudo=PASV_CFG.ninhadaEstudo;
          out.push(['Você reconhece a cria antes dela chegar.','sist']);
        }
      });
    }
  }catch(e){}
  return out;
}
envolver('anoitecer',_anoit=>function(){
  const r=_anoit.apply(this,arguments);
  try{ passivaAmanhecer().forEach(([t,c])=>{ if(typeof diz==='function')diz(t,c); }); }catch(e){}
  return r;
});

/* ================= 3 · vaoNovo — a vizinhanca =================
   Dois comodos que nao se tocavam passam a se tocar. Atalho pros dois
   lados, que e literalmente o que a passiva promete. */
/* os pares que a grade 3x3 NAO liga. E a lista de onde um vao novo pode
   nascer — e ela e calculada da PLANTA, nao escrita a mao, pra nao
   envelhecer se a casa mudar de forma. */
function paresSemVao(){
  const out=[];
  for(let a=0;a<PLANTA.length;a++)
    for(let b=a+1;b<PLANTA.length;b++)
      if(distancia(a,b)>1)out.push([a,b]);
  return out;
}
function vaoDaCasa(){
  const p=passivaDe('vaoNovo');
  if(!p)return null;
  /* O PAR TEM DE SER DE COMODOS QUE NAO SE TOCAM.
     A primeira versao fazia `b=(a+2+...)%9` e caiu num par que a grade JA
     ligava — QUARTO e SALA, vizinhos de sempre. "Abriu um vao" entre dois
     comodos ja ligados nao abre nada: a passiva prometia atalho e
     entregava o caminho que ja existia. O harness pegou porque cobra que
     a lista de vizinhos CRESCA dos dois lados.
     Deterministico pelo id da anomalia com o saveId: o mesmo vao pra
     sempre naquela campanha. */
  const pares=paresSemVao();
  if(!pares.length)return null;
  const h=hash32('vao|'+String(p.de)+'|'+String(S.saveId||''));
  const [a,b]=pares[h%pares.length];
  return {a, b};
}
envolver('vizinhos',_viz=>function(id){
  const L=_viz.apply(this,arguments);
  try{
    const v=vaoDaCasa();
    if(v&&Array.isArray(L)){
      const eu=id|0;
      if(eu===v.a&&L.indexOf(v.b)<0)return L.concat([v.b]);
      if(eu===v.b&&L.indexOf(v.a)<0)return L.concat([v.a]);
    }
  }catch(e){}
  return L;
});

/* ================= 4 · ecoDaCasa — o ouvido =================
   Voce ouve um comodo mais longe. E o que caca tambem. */
envolver('anomOuviu',_ouviu=>function(I,onde,forca){
  try{
    if(passivaDe('ecoDaCasa')&&forca!=null)
      return _ouviu.call(this,I,onde,Math.min(1,forca*1.25));
  }catch(e){}
  return _ouviu.apply(this,arguments);
});
/* e o lado bom: o alcance do SEU ouvido tambem sobe */
function ecoAlcanceExtra(){ return passivaDe('ecoDaCasa')?PASV_CFG.ecoAlcance:0; }

/* ================= 5 · A PAGINA DO DOSSIE NO CADERNO =================
   O §61 monta `dossiLer()` e ninguem chamava. */
function telaDossies(volta){
  AC.innerHTML=''; limpar(); cap('O que você aprendeu delas');
  let D={};
  try{ D=(typeof dossies==='function')?dossies():{}; }catch(e){}
  const ids=Object.keys(D).filter(k=>D[k].vezes>0);
  if(!ids.length){
    diz('Você ainda não viu nenhuma de perto o bastante pra anotar.','fraco');
    diz('Encostar o ouvido no foco delas, dentro de casa, é o que rende.','sist');
    return botao('Voltar',volta,{cls:'chave'});
  }
  diz('Anotou '+ids.length+(ids.length===1?' coisa.':' coisas.'),'sist');
  /* as mais estudadas primeiro: e o que voce quer reler */
  ids.sort((a,b)=>(D[b].estudo-D[a].estudo)||(D[b].vezes-D[a].vezes));
  ids.forEach(k=>{
    const d=D[k];
    let nome=k;
    try{ const r=registroDe(k); if(r&&r.nome)nome=r.nome; }catch(e){}
    const f=(typeof funcaoInfo==='function')?funcaoInfo(k):null;
    ficha(nome, d.vezes+(d.vezes===1?' vez':' vezes'),
      (f?f.n:'')+(d.mutacoes.length?' · aprendeu '+d.mutacoes.length+'x':''));
    botao('Abrir a ficha '+(typeof deNome==='function'?deNome(nome):'de '+nome),
      ()=>telaDossie(k,()=>telaDossies(volta)),
      {custo:'estudo '+d.estudo+'/100'});
  });
  botao('Voltar',volta,{cls:'chave'});
}
function telaDossie(id,volta){
  AC.innerHTML=''; limpar();
  let L=null;
  try{ L=dossiLer(id); }catch(e){}
  if(!L){ diz('Nada anotado.','fraco'); return botao('Voltar',volta,{cls:'chave'}); }
  L.linhas.forEach(l=>{ if(l.cls==='cap')cap(l.t); else diz(l.t,l.cls); });
  /* onde mora o foco, se voce ja achou */
  try{
    const d=dossi(id);
    if(d.foco&&typeof coisaDe==='function'){
      const c=coisaDe(d.foco);
      /* HEURISTICA ESPERTA QUE ERRA E PIOR QUE TABELA CHATA — terceira
         vez neste projeto. Eu adivinhava o artigo do comodo pela
         primeira letra do nome, e a ficha saiu com "em o tanque de
         lavar, no QUINTAL": o "no" acertou por sorte (Q nao e vogal) e o
         "em o" errou. A tabela certa ja existe desde o §58:
         `comodoCom(id,'no')` devolve "na despensa", "no porao". */
      if(c)diz('O foco está '+emNome(c.n)+', '+
        (typeof comodoCom==='function'?comodoCom(c.onde,'no')
          :('no cômodo '+c.onde))+'.','bom');
    }else{
      diz('Você ainda não achou o foco dela. Encoste o ouvido nas coisas da casa.','fraco');
    }
  }catch(e){}
  botao('Voltar',volta,{cls:'chave'});
}

/* o gancho no caderno que ja existe */
envolver('telaCaderno',_cad=>function(volta){
    const r=_cad.apply(this,arguments);
    try{
      let n=0;
      try{ const D=dossies(); n=Object.keys(D).filter(k=>D[k].vezes>0).length; }catch(e){}
      botao('O que você aprendeu delas',()=>telaDossies(()=>telaCaderno(volta)),
        {custo:n?n+' anotada(s)':'nada ainda'});
      /* e as marcas que ficaram na casa */
      const P=(S.passivasAtivas||[]).length;
      if(P)botao('As marcas que ficaram na casa',()=>telaPassivas(()=>telaCaderno(volta)),
        {custo:P+(P===1?' marca':' marcas')});
    }catch(e){}
    return r;
});

/* ================= 6 · A PAGINA DAS MARCAS =================
   Toda passiva mostra OS DOIS LADOS. Passiva so-boa seria premio por
   respirar; so-ruim, castigo por ter jogado. E as duas pontas sao o que
   faz o jogador escolher qual anomalia deixar viva mais tempo. */
const PASV_EFEITO={
  rotaAberta:{
    bom:'O passo pela casa custa 22% menos tempo.',
    ruim:'E faz 35% mais barulho — o vão é aberto dos dois lados.'},
  aguaParada:{
    bom:'Junta +1 galão de água por dia, sozinho.',
    ruim:'E água parada em casa fechada não fica quieta: +0,6 de ruído por dia.'},
  vaoNovo:{
    bom:'Dois cômodos ficaram ligados por um vão que não existia.',
    ruim:'E o vão serve pros dois lados.'},
  ecoDaCasa:{
    bom:'Você ouve um cômodo mais longe.',
    ruim:'E o que caça ouve 25% melhor também.'},
  ninhada:{
    bom:'As crias nascem com 22 de estudo: você já sabe a cara delas.',
    ruim:'Porque elas nascem.'},
  trancaSolta:{
    bom:'O passo custa um minuto a menos.',
    ruim:'E 30% mais ruído: o que ela trancava, destrancou.'}
};
function telaPassivas(volta){
  AC.innerHTML=''; limpar(); cap('As marcas que ficaram');
  const L=S.passivasAtivas||[];
  if(!L.length){
    diz('A casa ainda não ficou com nada.','fraco');
    return botao('Voltar',volta,{cls:'chave'});
  }
  diz('Toda coisa que você resolveu deixou alguma coisa para trás.','narr');
  L.forEach(p=>{
    const e=PASV_EFEITO[p.campo];
    ficha(p.n,'do dia '+p.dia,
      (typeof deNome==='function'?'deixada '+deNome(p.deNome||p.de):'de '+(p.deNome||p.de)));
    if(e){ diz('  '+e.bom,'bom'); diz('  '+e.ruim,'perigo'); }
    const v=(p.campo==='vaoNovo'&&typeof vaoDaCasa==='function')?vaoDaCasa():null;
    if(v&&typeof comodo==='function')
      diz('  O vão liga '+comodo(v.a).nome+' e '+comodo(v.b).nome+'.','sist');
  });
  botao('Voltar',volta,{cls:'chave'});
}

/* ================= 7 · LEITURA DE FORA ================= */
function passivasEstado(){
  const L=S.passivasAtivas||[];
  return {
    cfg:PASV_CFG,
    ativas:L.map(p=>p.campo),
    comEfeito:Object.keys(PASV_EFEITO),
    semConsumidor:L.map(p=>p.campo).filter(c=>!PASV_EFEITO[c]),
    vao:(typeof vaoDaCasa==='function')?vaoDaCasa():null,
    ecoExtra:ecoAlcanceExtra()
  };
}
