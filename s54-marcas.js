/* ================= §54 · MARCAS NO PLURAL, E O QUE FICA EM VOCÊ ========

   AUDITORIA. A marca existe e funciona, mas é UMA SÓ: um booleano
   `S.marcado` mais um contador `S.marcaDias`, que rende `pesoMarca()`
   (de 12% a 35% pior, crescendo com os dias), narração em marcos (dia 1,
   4, 8, 12, 16), +2 de ruído por dia, e três saídas no `menuMarca`.

   O §8 pede marca no PLURAL — do Observador, do Ritual, do Eco. A
   auditoria da v72 já escreveu qual é o trabalho honesto: "generalizar a
   que existe, não escrever uma segunda ao lado dela". É o que este bloco
   faz. A marca antiga vira a marca `olho`, com a MESMA fórmula de peso,
   pra o equilíbrio de quem já está jogando não mudar por causa de uma
   refatoração.

   SAVE ANTIGO NÃO PODE QUEBRAR. Ninguém precisa de campo novo pra
   continuar: se o save só tem `S.marcado`, ele é lido como a marca
   `olho` com `S.marcaDias` dias. A lista nova só é gravada quando existe
   alguma coisa pra gravar, e a gravação repete a guarda da base
   (`if(!S.nomeJogador)return`), porque bloco ANEXA a save, nunca CRIA.

   E O §13, o trauma. `traumatizado` no jogo é TEMPERAMENTO DE MORADOR —
   quem viu demais — com banco de falas próprio. O jogador não tinha
   experiência registrada com gatilho: "você foi perseguido no porão" não
   mudava como o porão se comporta depois. Agora muda, e muda no lugar
   certo: o trauma é DE UM CÔMODO, e é lido pela lente do §53. Você não
   ganha um número novo na tela; o cômodo é que fica pior pra você.

   A REGRA DE OURO: nada disso é silencioso. Marca fala quando chega,
   fala enquanto dura e fala quando sai. Trauma se anuncia na primeira
   vez que você volta no cômodo onde aconteceu. */

const MARCA_TIPOS={
  olho:{
    n:'a Marca do Olho', curto:'olho',
    d:'Alguma coisa passou a saber onde você dorme.',
    tell:'Você acorda virado pro outro lado da cama.',
    /* a formula ORIGINAL, letra por letra, pra nao mexer no equilibrio */
    peso:d=>trava(.12+(d*.012),0,.35),
    ruido:2,
    custo:'pior em investigar, e elas aprendem mais rápido com você'
  },
  ritual:{
    n:'a Marca do Ritual', curto:'ritual',
    d:'Você fez alguma coisa que não devia ter feito, e ficou anotado.',
    tell:'Quem reza na casa para de rezar perto de você.',
    peso:d=>trava(.06+(d*.008),0,.22),
    ruido:0,
    /* ela nao faz barulho: ela mexe com a casa */
    moral:-1,
    custo:'a casa desanima mais rápido do que devia'
  },
  eco:{
    n:'a Marca do Eco', curto:'eco',
    d:'Uma coisa repetiu o seu nome, e o seu nome ficou com ela.',
    tell:'Você ouve a sua própria voz de outro cômodo, dizendo o que você já disse.',
    peso:d=>trava(.04+(d*.006),0,.18),
    ruido:3,
    custo:'você faz mais barulho do que faz, e a porta aprende o seu nome'
  }
};

/* ---------- estado, com a marca velha adotada ----------
   Le, adota e devolve. Nunca inventa save. */
function marcasEstado(){
  if(!S.marcas||typeof S.marcas!=='object')S.marcas={};
  const M=S.marcas;
  /* ADOCAO: save antigo tem `S.marcado`/`S.marcaDias` e mais nada. */
  if(S.marcado&&!M.olho)M.olho={dias:S.marcaDias|0};
  if(!S.marcado&&M.olho===undefined&&S.marcaDias)M.olho={dias:S.marcaDias|0};
  return M;
}
function marcasAtivas(){
  const M=marcasEstado();
  return Object.keys(M).filter(k=>MARCA_TIPOS[k]&&M[k]);
}
function temMarca(id){ return marcasAtivas().indexOf(id)>=0; }
function marcaDias(id){ const M=marcasEstado(); return (M[id]&&M[id].dias|0)||0; }

function porMarca(id,porque){
  if(!MARCA_TIPOS[id])return false;
  const M=marcasEstado();
  if(M[id])return false;
  M[id]={dias:0, porque:porque||null};
  if(id==='olho'){ S.marcado=true; S.marcaDias=0; }   /* espelho pro codigo velho */
  if(typeof diz==='function')
    try{ diz(MARCA_TIPOS[id].d+' '+MARCA_TIPOS[id].tell,'perigo'); }catch(e){}
  if(typeof marcarSujo==='function')marcarSujo();
  return true;
}
function tirarMarca(id){
  const M=marcasEstado();
  if(!M[id])return false;
  delete M[id];
  if(id==='olho'){ S.marcado=false; S.marcaDias=0; }
  if(typeof marcarSujo==='function')marcarSujo();
  return true;
}

/* ---------- o peso: a soma do que está em você ----------
   `pesoMarca` continua existindo com o mesmo nome e o mesmo significado.
   Com so a marca do olho, ele devolve exatamente o que devolvia antes. */
if(typeof pesoMarca==='function'){
  const _pm=pesoMarca;
  pesoMarca=function(){
    const at=marcasAtivas();
    if(!at.length)return 0;
    let p=0;
    at.forEach(k=>{ p+=MARCA_TIPOS[k].peso(marcaDias(k)); });
    /* teto: tres marcas nao podem somar um jogo impossivel */
    return trava(p,0,.55);
  };
}

/* o dia passa pra todas, e o texto de marco continua o da base pro olho */
if(typeof passarMarca==='function'){
  const _pa=passarMarca;
  passarMarca=function(){
    const at=marcasAtivas();
    if(!at.length)return null;
    const M=marcasEstado();
    /* o olho passa pela funcao original, que ja sabe os marcos dela */
    let txt=null;
    if(M.olho){ txt=_pa.apply(this,arguments); M.olho.dias=S.marcaDias|0; }
    at.filter(k=>k!=='olho').forEach(k=>{
      M[k].dias=(M[k].dias|0)+1;
      const d=M[k].dias;
      /* marcos proprios, e o texto so sai se o olho nao falou hoje */
      if(!txt&&(d===2||d===6||d===11))txt=MARCA_TIPOS[k].tell;
    });
    return txt;
  };
}
if(typeof efeitoMarca==='function'){
  const _ef=efeitoMarca;
  efeitoMarca=function(){
    const at=marcasAtivas();
    if(!at.length)return;
    if(temMarca('olho'))_ef.apply(this,arguments);   /* o efeito original */
    at.filter(k=>k!=='olho').forEach(k=>{
      const T2=MARCA_TIPOS[k];
      if(T2.ruido)S.ruido=trava((S.ruido||0)+T2.ruido,0,100);
      if(T2.moral&&typeof mexerMoral==='function')mexerMoral(T2.moral);
    });
  };
}

/* ================= O TRAUMA É DE UM CÔMODO =================
   Nao e um numero na ficha: e o comodo que passa a pesar. Ele nasce de
   coisa que ja acontece (voce se machucou ali) e e lido pela lente do
   §53, que ja sabe ler comodo. */
const TRAU_CFG={
  /* quanto o comodo traumatico empurra a leitura de presenca */
  empurra:.22,
  /* quantos dias ate desbotar de vez, se nada reforcar */
  desbota:14,
  maximo:4                 /* nao da pra ter a casa inteira traumatica */
};
function traumas(){
  if(!Array.isArray(S.traumas))S.traumas=[];
  return S.traumas;
}
function traumaDe(comodo){
  const c=comodo|0;
  const t=traumas().find(x=>x.comodo===c);
  if(!t)return 0;
  const idade=(S.dia|0)-(t.dia|0);
  if(idade>=TRAU_CFG.desbota)return 0;
  return trava(1-(idade/TRAU_CFG.desbota),0,1);
}
function marcarTrauma(comodo,porque){
  const c=(comodo==null)
    ?((typeof cena!=='undefined'&&cena.casa&&cena.casa.voce!=null)?cena.casa.voce|0:0)
    :comodo|0;
  const L=traumas();
  const ja=L.find(x=>x.comodo===c);
  if(ja){ ja.dia=S.dia|0; ja.porque=porque||ja.porque; ja.vezes=(ja.vezes|0)+1; }
  else{
    L.push({comodo:c, dia:S.dia|0, porque:porque||null, vezes:1, contado:false});
    while(L.length>TRAU_CFG.maximo)L.shift();
  }
  if(typeof marcarSujo==='function')marcarSujo();
  return c;
}
/* o tell: a primeira vez que voce volta no comodo, o jogo nomeia */
function traumaAoEntrar(comodo){
  const c=comodo|0;
  const t=traumas().find(x=>x.comodo===c);
  if(!t||t.contado)return null;
  if(!traumaDe(c))return null;
  t.contado=true;
  const nome=(typeof PLANTA!=='undefined'&&PLANTA[c])?PLANTA[c].nome:'aqui';
  const f='Você para na porta. Foi n'+(/^[aeiou]/i.test(nome)?'':'o ')+
    String(nome).toLowerCase()+' que aconteceu, e o corpo lembra antes de você.';
  if(typeof diz==='function'){ try{ diz(f,'alerta'); }catch(e){} }
  if(typeof marcarSujo==='function')marcarSujo();
  return f;
}

/* ONDE O TRAUMA NASCE: de ferida de verdade, no comodo onde voce esta.
   `pegarMal` e o caminho unico de ferida desde o §41, entao e ali. */
if(typeof pegarMal==='function'){
  const _pm2=pegarMal;
  pegarMal=function(id,alvo,porque){
    const r=_pm2.apply(this,arguments);
    try{
      /* so o JOGADOR, e so ferida de verdade — resfriado nao traumatiza */
      if(r&&!alvo&&typeof MALES!=='undefined'&&MALES[id]
         &&MALES[id].tipo==='ferida'&&(MALES[id].grav||0)>=2){
        marcarTrauma(null,id);
      }
    }catch(e){}
    return r;
  };
}
/* e o comodo traumatico pesa na lente do §53 */
if(typeof vigiaLer==='function'){
  const _vl=vigiaLer;
  vigiaLer=function(comodo){
    const l=_vl.apply(this,arguments);
    try{
      const t=traumaDe(l.comodo);
      if(t&&!l.verdade&&l.fonte==='VOCE')
        l.forca=trava(l.forca+TRAU_CFG.empurra*t,0,1);
      l.trauma=+t.toFixed(3);
    }catch(e){}
    return l;
  };
}
if(typeof irPara==='function'){
  const _ip2=irPara;
  irPara=function(id){
    const r=_ip2.apply(this,arguments);
    try{ traumaAoEntrar(id); }catch(e){}
    return r;
  };
}

/* ---------- gravar ----------
   Bloco ANEXA a save; bloco nunca CRIA save. A guarda da base e
   repetida de proposito: sem ela, este embrulho gravaria partida que
   nao comecou, que foi como a abertura narrada sumiu por versoes. */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    const r=_sv.apply(this,arguments);
    if(!S.nomeJogador)return r;
    try{
      const bruto=localStorage.getItem(CHAVE);
      if(!bruto)return r;
      const o=JSON.parse(bruto);
      const M=marcasEstado();
      if(Object.keys(M).length)o.marcas=M;
      if(traumas().length)o.traumas=traumas();
      localStorage.setItem(CHAVE,JSON.stringify(o));
    }catch(e){}
    return r;
  };
}

function marcasResumo(){
  return {
    ativas:marcasAtivas().map(k=>({id:k,n:MARCA_TIPOS[k].n,dias:marcaDias(k),
      peso:+MARCA_TIPOS[k].peso(marcaDias(k)).toFixed(3)})),
    peso:+((typeof pesoMarca==='function')?pesoMarca():0).toFixed(3),
    marcadoLegado:!!S.marcado, marcaDiasLegado:S.marcaDias|0,
    traumas:traumas().map(t=>({...t, forca:+traumaDe(t.comodo).toFixed(3)})),
    cfg:{...TRAU_CFG}
  };
}
