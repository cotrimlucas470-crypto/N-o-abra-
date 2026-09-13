/* ============ §63 · A EXPEDICAO TEM CHAO ============================

   A AUDITORIA, CONTADA NO CODIGO

   Uma expedicao inteira sao TRES decisoes:

       etapaEntrar   "Por onde você entra?"   → 2 opcoes
       etapaDentro   "O que procura?"         → 2 opcoes
       etapaSair     "E agora, como sai?"     → 2 opcoes

   Oito permutacoes por lugar. E cada opcao e a MESMA coisa por dentro:
   um `+1 risco` ou um `×1.2 saque`. O texto de cada uma e otimo — "o
   som dos seus passos volta com um atraso que nao e seu" — e embaixo
   dele nao tem decisao nenhuma, tem um botao de volume.

   E o lugar nao guarda nada entre visitas, fora `S.esgotados[id]`, que
   e um numero.

   O QUE ENTRA — E O QUE NAO E MEXIDO

   O §23 tornou a expedicao TRANSACIONAL: `S.exped.levar` vive no save,
   cada pegada marca sujo, travar no meio nao perde o saque. Isso nao
   pode ser tocado. Entao este bloco substitui UMA etapa — a do meio, a
   que so tinha duas opcoes — por uma caminhada, e devolve `ctx.achados`
   do mesmo jeito pra `etapaCarga`. Entrada, carga e saida continuam
   sendo o que sao.

   A CAMINHADA

   1 · O LUGAR TEM PONTOS. Voce avanca de um pro outro. Cada passo mais
       fundo rende mais e custa mais luz.
   2 · A LUZ E ORCAMENTO. Lampiao, lanterna e fosforo dao quanto voce
       aguenta ir. Acabar a luz la dentro nao mata — faz voce sair as
       pressas, e sair as pressas custa.
   3 · OUVIR E DE GRACA, e diz o que tem no proximo ponto ANTES de voce
       ir. E o mesmo contrato de tell da casa: o aviso vem antes do
       dano, e custa atencao deliberada em vez de sorte.
   4 · O LUGAR LEMBRA. O ponto que voce esvaziou fica vazio na proxima
       visita. Voltar ao mesmo lugar passa a ser uma decisao ("ja tirei
       o facil de la") em vez de repetir a mesma roleta.
   5 · O NINHO. Um ponto fundo pode guardar o que explica uma anomalia
       que esta na SUA casa. Ler rende estudo no dossie (§61). E a
       razao de ir fundo que nao e saque.

   POR QUE OS PONTOS NAO SAO TABELA POR LUGAR

   Vinte e dois lugares vezes cinco pontos seriam 110 entradas escritas
   a mao, e 110 entradas escritas a mao envelhecem: entra um lugar novo
   e ele nasce sem pontos. Aqui o lugar declara uma FORMA (quantos
   pontos, que tipo), e o tipo do ponto traz o texto. Lugar novo herda
   uma forma pela cara dele e ja nasce caminhavel.
   ===================================================================== */

const DENTRO_CFG={
  /* luz que cada fonte dá pra caminhada, em pontos de profundidade */
  luz:{ lampiao:7, lanterna:5, fosforo:2, nenhuma:2 },
  /* quanto cada ponto consome, por profundidade */
  custoLuzBase: 1,
  custoLuzPorFundura: .5,
  /* risco somado por ponto de profundidade */
  riscoPorFundura: .8,
  /* multiplicador de saque por profundidade: fundo rende mais */
  saquePorFundura: .55,
  /* quantos pontos um lugar tem, por faixa de risco do lugar */
  pontosPorRisco: {1:3, 2:4, 3:4, 4:5, 5:5},
  /* o que sair no escuro custa */
  pressaRisco: 3,
  pressaPerda: .25,
  /* estudo que ler um ninho rende no dossiê do §61 */
  estudoNinho: 34,
  /* a partir de que profundidade pode haver ninho */
  funduraNinho: 2
};

/* ================= 1 · OS TIPOS DE PONTO =================
   `fundura` e o quanto ele esta pra dentro. `rende` multiplica o saque
   daquele ponto. `ouve` e o que voce escuta DESTE ponto sobre o
   proximo — o tell. */
const PONTOS={
  soleira:{n:'a soleira', fundura:0, rende:.35,
    d:'Você para no vão da porta e deixa os olhos acostumarem.',
    ouve:'Lá dentro é fundo. Dá pra ouvir pelo jeito que o ar volta.'},
  salao:{n:'o salão da frente', fundura:1, rende:.8,
    d:'O que dava pra levar daqui já levaram. Sobrou o que era pesado demais.',
    ouve:'Mais pra dentro alguma coisa goteja num ritmo certo demais.'},
  corredor:{n:'o corredor', fundura:1, rende:.45,
    d:'Comprido, e as portas dos dois lados estão todas do mesmo jeito: encostadas.',
    ouve:'No fim dele o chão muda de som. De cimento pra madeira.'},
  estoque:{n:'o estoque', fundura:2, rende:1.5,
    d:'Prateleira de metal até o teto. Ninguém chegou aqui com tempo de escolher.',
    ouve:'Atrás da parede do fundo tem espaço. Muito espaço.'},
  escada:{n:'a escada', fundura:2, rende:.4,
    d:'Desce. Os primeiros três degraus você enxerga.',
    ouve:'Embaixo, água parada. E na água, círculo se abrindo.'},
  subsolo:{n:'o subsolo', fundura:3, rende:1.9,
    d:'A lanterna alcança três metros e depois desiste.',
    ouve:'Aqui embaixo o seu próprio passo volta com atraso. Dois atrasos.'},
  camara:{n:'a câmara fria', fundura:3, rende:1.7,
    d:'A porta é de borracha e pesa. Do lado de dentro tem trava de emergência.',
    ouve:'Do outro lado da porta, nada. Um nada que ocupa espaço.'},
  fundo:{n:'o fundo do prédio', fundura:4, rende:2.2,
    d:'É onde a construção termina e ninguém mais foi.',
    ouve:'Não tem mais o que ouvir. Você já está no fim.'},
  telhado:{n:'o telhado', fundura:2, rende:.7,
    d:'De cima dá pra ver o caminho de volta inteiro.',
    ouve:'A rua está como você deixou. Isso é uma coisa boa.'},
  patio:{n:'o pátio', fundura:1, rende:.6,
    d:'Aberto demais pro seu gosto, mas é passagem.',
    ouve:'Do galpão do fundo vem cheiro. Não é de comida.'}
};
/* as formas: cada uma e uma sequencia de tipos, do raso pro fundo */
const FORMAS={
  predio:  ['soleira','salao','corredor','estoque','subsolo'],
  galpao:  ['soleira','patio','estoque','fundo'],
  casa:    ['soleira','salao','corredor','escada','subsolo'],
  posto:   ['soleira','patio','estoque','subsolo'],
  mercado: ['soleira','salao','estoque','camara','subsolo'],
  torre:   ['soleira','salao','escada','telhado','fundo']
};
/* qual planta cada lugar tem. `PLANTA_DE` e nao `FORMA_DE` porque o
   §27 (a porta) ja usa `FORMA_DE` pra outra coisa, e a guarda de
   colisao do montar.js quebrou a build na hora — dois blocos com o
   mesmo nome de topo fazem o segundo apagar o primeiro em silencio. Quem nao esta aqui cai numa forma escolhida
   pela CARA do id — e nao por sorteio, porque lugar nao muda de planta
   entre uma visita e outra. */
const PLANTA_DE={
  an_igreja:'torre', an_armazem:'galpao', an_roca:'galpao', an_escola:'predio',
  pe_atacado:'galpao', pe_borracharia:'galpao', pe_farmacia:'casa',
  pe_frigorifico:'mercado', pe_quartel:'predio',
  su_hospital:'predio', su_industrial:'galpao', su_rodoviaria:'predio',
  su_shopping:'mercado', su_aeroporto:'predio',
  pi_posto:'posto', pi_fila:'patio', pi_hotel:'predio', pi_deposito:'galpao',
  rua7:'casa', posto:'posto', mercado:'mercado', colegio:'predio', igreja:'torre'
};
const FORMAS_ORD=['casa','predio','galpao','posto','mercado','torre'];
function formaDe(localId){
  const f=PLANTA_DE[localId];
  if(f&&FORMAS[f])return f;
  /* lugar novo herda forma pela cara do id, deterministicamente: o
     mesmo lugar sempre tem a mesma planta */
  return FORMAS_ORD[hash32(String(localId||'x'))%FORMAS_ORD.length];
}
function pontosDe(l){
  const forma=FORMAS[formaDe(l&&l.id)]||FORMAS.casa;
  const teto=DENTRO_CFG.pontosPorRisco[trava(l&&l.risco||2,1,5)]||4;
  return forma.slice(0,teto).map(t=>({tipo:t, ...PONTOS[t]}));
}

/* ================= 2 · O ESTADO DO LUGAR =================
   O que voce esvaziou fica vazio. So dado — nada de funcao no save. */
function lugares(){
  if(!S.lugaresDentro||typeof S.lugaresDentro!=='object')S.lugaresDentro={};
  return S.lugaresDentro;
}
function lugar(id){
  const L=lugares(), k=String(id);
  if(!L[k])L[k]={pontos:{}, visitas:0, ninhoLido:null};
  return L[k];
}
function pontoVazio(localId,tipo){ return !!lugar(localId).pontos[tipo]; }
function esvaziar(localId,tipo){
  lugar(localId).pontos[tipo]=(S.dia|0)||1;
  if(typeof marcarSujo==='function')marcarSujo();
}

/* ================= 3 · A LUZ =================
   Quanto voce aguenta ir pra dentro. Sai do que voce CARREGA — nao e
   numero novo, e leitura do equipamento que ja existe. */
/* ARMADILHA QUE ME PEGOU AQUI, e ela matou o bloco inteiro por um tempo:

   `tem(hab)` NAO E CHECAGEM DE INVENTARIO. Ele e
   `S.abrigo.some(p=>p.hab===hab)` — checa HABILIDADE DE PESSOA. Entao
   `tem('lanterna')` era sempre falso, `luzDaExpedicao()` devolvia 2 em
   toda situacao, e o orcamento de luz — que e a decisao central desta
   caminhada — era um numero constante. Parametro morto, proibicao nº 6,
   e eu so vi jogando: a expedicao saia com "Luz para 2.0" mesmo com
   lanterna na mao.

   O certo e `temFerra('lanterna')` mais `S.pilhas`, que e o estado que
   o jogo ja mantem e ja consome em outro lugar (§ do fabrico).

   E A LUZ GASTA PILHA. Orcamento que nao tem preco nao e orcamento: sem
   consumir, o jogador com uma lanterna teria luz infinita pra sempre e a
   decisao de ir fundo custaria nada. */
function luzDaExpedicao(){
  try{
    if(typeof temFerra==='function'&&temFerra('lanterna')&&(S.pilhas|0)>0)
      return (S.pilhas|0)>=2?DENTRO_CFG.luz.lampiao:DENTRO_CFG.luz.lanterna;
    if(typeof temMat==='function'&&temMat('fio',1))
      return DENTRO_CFG.luz.fosforo;
  }catch(e){}
  return DENTRO_CFG.luz.nenhuma;
}
/* a pilha queima na caminhada, nao no clique: gastar por ponto faria a
   lanterna durar meia expedicao e transformaria um recurso em imposto. */
function gastarLuzDaExpedicao(){
  try{
    if(typeof temFerra==='function'&&temFerra('lanterna')&&(S.pilhas|0)>0){
      S.pilhas=Math.max(0,(S.pilhas|0)-1);
      if(typeof marcarSujo==='function')marcarSujo();
      return true;
    }
  }catch(e){}
  return false;
}
function custoDeLuz(fundura){
  return DENTRO_CFG.custoLuzBase+fundura*DENTRO_CFG.custoLuzPorFundura;
}

/* ================= 4 · O NINHO =================
   O que explica uma anomalia que esta na SUA casa, guardado num ponto
   fundo de um lugar la fora.

   E DETERMINISTICO: o lugar que guarda o ninho de uma anomalia sai do
   hash do id dela com o saveId. Sorteado, a estrategia unica seria
   varrer tudo — que e o oposto de investigar. */
function ninhoDaExpedicao(l,fundura){
  if(fundura<DENTRO_CFG.funduraNinho)return null;
  let ativ=[];
  try{ ativ=(typeof ativas==='function')?ativas():[]; }catch(e){}
  if(!ativ.length)return null;
  const L=lugar(l.id);
  for(const a of ativ){
    if(L.ninhoLido===a)continue;
    const h=hash32(String(a)+'|ninho|'+String(S.saveId||''));
    /* cada anomalia tem UM lugar; se este e o lugar dela, o ninho esta aqui.
       O SORTEIO SAI DE `lugaresVisitaveis()`, NAO DAS CHAVES DE `PLANTA_DE`.
       A primeira versao usava PLANTA_DE, que tem cinco ids a mais — rua7,
       posto, mercado, colegio, igreja — que sao formas de ETAPAS e nao
       lugares da cidade. Resultado: em ~22% das campanhas o ninho nascia
       num lugar que o jogador nao alcanca por este caminho, e a pista
       simplesmente nao existia. Pista inalcancavel e pior que pista
       nenhuma: o jogador procura pra sempre. */
    const lista=lugaresVisitaveis();
    if(lista.length&&lista[h%lista.length]===l.id)return a;
  }
  return null;
}
/* os lugares que o jogador realmente alcanca numa expedicao */
function lugaresVisitaveis(){
  const out=[];
  try{ Object.keys(LOCAIS_CIDADE).forEach(c=>
    LOCAIS_CIDADE[c].forEach(l=>out.push(l.id))); }catch(e){}
  return out;
}
function lerNinho(l,anomId){
  const r=(typeof registroDe==='function')?registroDe(anomId):null;
  const nome=(r&&r.nome)||anomId;
  lugar(l.id).ninhoLido=anomId;
  let ganho=0;
  try{
    if(typeof dossiEstudar==='function'){
      const antes=dossi(anomId).estudo;
      dossiEstudar(anomId,DENTRO_CFG.estudoNinho);
      ganho=dossi(anomId).estudo-antes;
    }
  }catch(e){}
  const eco=[
    ['Não é saque. É papel, e o papel fala de uma coisa que você conhece.','narr'],
    ['Alguém aqui tomou nota '+(typeof deNome==='function'?deNome(nome):'de '+nome)+
     ' antes de você. Tomou nota até parar de tomar.','perigo'],
    ['Você entende '+ganho+' pontos a mais do que ela é.','bom']
  ];
  try{
    if(typeof anotar==='function')
      anotar('Achou o ninho '+(typeof deNome==='function'?deNome(nome):'de '+nome)+
             ' em '+l.n+'.');
  }catch(e){}
  if(typeof marcarSujo==='function')marcarSujo();
  return eco;
}

/* ================= 5 · A CAMINHADA ================= */
function andarDentro(E,ctx){
  const l=ctx.l;
  const pontos=pontosDe(l);
  lugar(l.id).visitas++;
  ctx.pontos=pontos;
  ctx.i=0;
  ctx.luz=luzDaExpedicao();
  ctx.luzMax=ctx.luz;
  ctx.gastouPilha=gastarLuzDaExpedicao();
  ctx.achados=ctx.achados||[];
  ctx.colhidos=[];
  const eco=[
    ['Você entra. A partir daqui a luz é sua e ela acaba.','sist'],
    ['Luz para '+ctx.luz.toFixed(1)+' pontos de profundidade.','sist']
  ];
  if(ctx.gastouPilha)eco.push(['Queimou uma pilha. Sobram '+(S.pilhas|0)+'.','fraco']);
  else if(ctx.luz<=DENTRO_CFG.luz.nenhuma)
    eco.push(['Sem lanterna com pilha, você não passa da entrada.','perigo']);
  passoDentro(E,ctx,eco);
}

function passoDentro(E,ctx,eco){
  const l=ctx.l, pontos=ctx.pontos, p=pontos[ctx.i];
  limpar(); cap(l.n+' · '+p.n);
  diz(p.d,'narr');
  if(eco)eco.forEach(([t,c])=>diz(t,c));
  diz('Luz: '+Math.max(0,ctx.luz).toFixed(1)+' de '+ctx.luzMax.toFixed(1)+
      ' · profundidade '+p.fundura,ctx.luz<=1?'perigo':'sist');
  AC.innerHTML='';

  const vazio=pontoVazio(l.id,p.tipo);

  /* ---- vasculhar este ponto ---- */
  if(!vazio){
    botao('Vasculhar '+p.n,()=>{
      const ach=colherNoPonto(l,p,ctx);
      esvaziar(l.id,p.tipo);
      passoDentro(E,ctx,ach);
    },{custo:'rende '+(p.rende>=1.5?'muito':p.rende>=.7?'razoável':'pouco')});
  }else{
    /* "numa outra vez" so vale se foi MESMO outra vez. Jogando, a frase
       aparecia no segundo seguinte ao saque e mentia na cara do jogador. */
    const quando=lugar(l.id).pontos[p.tipo];
    diz(quando===((S.dia|0)||1)
      ? 'Você já revirou isto aqui agora. Não sobrou nada.'
      : 'Você já tirou o que dava daqui, no dia '+quando+'.','fraco');
  }

  /* ---- o ninho ---- */
  const nin=ninhoDaExpedicao(l,p.fundura);
  if(nin)botao('Olhar o papel na parede',()=>{
    passoDentro(E,ctx,lerNinho(l,nin));
  },{cls:'prim',custo:'não é saque'});

  /* ---- avancar ---- */
  const prox=pontos[ctx.i+1];
  if(prox){
    const custo=custoDeLuz(prox.fundura);
    botao('Ir para '+prox.n,()=>{
      ctx.i++; ctx.escutou=false;
      ctx.luz-=custo;
      ctx.risco+=prox.fundura*DENTRO_CFG.riscoPorFundura;
      if(ctx.luz<=0)return sairNoEscuro(E,ctx);
      passoDentro(E,ctx,[['Você vai mais pra dentro.','narr']]);
    },{custo:'−'+custo.toFixed(1)+' luz · mais arriscado',
       cls:ctx.luz-custo<=1?'':'prim'});
  }

  /* ---- ouvir o proximo: de graca, e e o TELL ----

     UMA VEZ POR PONTO, POR VISITA. Escutar duas vezes daqui devolve a
     MESMA frase — entao oferecer de novo e uma acao gratuita, repetivel
     e que nao anda. O `expteste` provou isso do jeito mais direto
     possivel: o caminhador cego dele clica sempre na primeira acao da
     tela, e queimou os 60 passos dele em "Escutar antes de ir", sem
     nunca chegar na carga. Nove assercoes reprovaram — e o defeito nao
     era do teste, era da minha tela.

     Por isso tambem o "Ir para" subiu pra cima do "Escutar": a acao que
     ANDA vem antes da que so informa. */
  if(prox&&!ctx.escutou)botao('Escutar antes de ir',()=>{
    ctx.escutou=true;
    const perigo=ctx.risco+prox.fundura*DENTRO_CFG.riscoPorFundura;
    const custo=custoDeLuz(prox.fundura);
    passoDentro(E,ctx,[
      [p.ouve,'narr'],
      [custo>ctx.luz
        ? 'A luz não chega até lá. Se você for, volta no escuro.'
        : 'A luz chega. Sobra pouco depois.','sist'],
      [perigo>6?'E tem coisa lá. Você não sabe o quê, mas tem.'
              :'Parece vazio. Parece.', perigo>6?'perigo':'fraco']
    ]);
  },{custo:'de graça'});

  /* ---- sair com o que tem ---- */
  botao('Sair com o que já pegou',()=>{
    diz('Você refaz o caminho com a luz que sobrou.','bom');
    etapaCarga(E,ctx);
  },{cls:'prim',custo:ctx.colhidos.length+' coisa(s) na mão'});
}

/* colher num ponto: usa os MESMOS geradores de saque do jogo, so
   temperados pela profundidade. Tabela nova de loot seria um segundo
   sistema de economia divergindo do primeiro. */
function colherNoPonto(l,p,ctx){
  const eco=[];
  const gasto=S.esgotados[l.id]||0;
  const f=p.rende*(1+p.fundura*DENTRO_CFG.saquePorFundura)
          *(gasto?.6:1)*(ctx.mult||1);
  const AJ=(typeof ajusteRecurso==='function')?ajusteRecurso(l):{comida:1,diesel:1,estraga:1,med:0};
  const qd=Math.round((l.diesel[0]+_ale()*(l.diesel[1]-l.diesel[0]))*f*AJ.diesel*.42);
  const qc=Math.round((l.comida[0]+_ale()*(l.comida[1]-l.comida[0]))*f*AJ.comida*.42);
  const cm=(typeof acharComida==='function')?acharComida(qc,AJ.estraga):{boa:qc,ruim:0};
  const junta=(n,q,kg,extra)=>{
    if(q<=0)return;
    const ja=ctx.achados.find(x=>x.n===n);
    if(ja)ja.q+=q; else ctx.achados.push({n,q,kg,...(extra||{})});
    ctx.colhidos.push(n);
    eco.push([n+': +'+q+'.','bom']);
  };
  junta('diesel',qd,1);
  junta('comida',cm.boa,1.5);
  if(cm.ruim)junta('lata suspeita',cm.ruim,1.5,
    {estragada:true,d:'A tampa está estufada. Pode ser só pressão. Pode não ser.'});
  /* item proprio do lugar: so nos pontos fundos, e uma vez */
  if(p.fundura>=2&&typeof itensDoLocal==='function'){
    (itensDoLocal(l)||[]).slice(0,1).forEach(it=>{
      ctx.achados.push({n:it.n,q:1,kg:it.kg,item:it,d:it.d});
      ctx.colhidos.push(it.n);
      eco.push([it.n+'. Disso aqui não tem em todo lugar.','bom']);
    });
  }
  if(!eco.length)eco.push(['Você revira e não acha nada que preste.','fraco']);
  return eco;
}

/* sair no escuro: nao mata. Custa parte do saque e um susto — porque
   punir com morte uma decisao de orcamento faria o jogador parar de
   arriscar, e arriscar e a decisao que este bloco existe pra criar. */
function sairNoEscuro(E,ctx){
  limpar(); cap(ctx.l.n+' · no escuro');
  diz('A luz acaba antes de você chegar na saída.','perigo');
  diz('Você sai pelo tato, batendo em tudo, e deixa coisa cair no caminho.','narr');
  ctx.risco+=DENTRO_CFG.pressaRisco;
  const perdeu=[];
  ctx.achados.forEach(a=>{
    const p=Math.floor(a.q*DENTRO_CFG.pressaPerda);
    if(p>0){ a.q-=p; perdeu.push(p+' '+a.n); }
  });
  if(perdeu.length)diz('Ficou pra trás: '+perdeu.join(', ')+'.','perigo');
  AC.innerHTML='';
  botao('Contar o que sobrou',()=>etapaCarga(E,ctx),{cls:'prim'});
}

/* ================= 6 · O GANCHO =================
   Substitui SO a etapa do meio. Entrada, carga e saida — e as garantias
   transacionais do §23 — continuam intactas. */
if(typeof etapaDentro==='function'){
  const _dentro=etapaDentro;
  etapaDentro=function(E,ctx){
    try{
      if(ctx&&ctx.l&&Array.isArray(ctx.l.comida)&&Array.isArray(ctx.l.diesel))
        return andarDentro(E,ctx);
    }catch(e){
      if(typeof registrarErro==='function')registrarErro(e,'andarDentro');
    }
    return _dentro.apply(this,arguments);
  };
}

/* ================= 7 · MIGRACAO ================= */
function migrarLugares(d){
  const out={};
  const v=(d&&d.lugaresDentro&&typeof d.lugaresDentro==='object')?d.lugaresDentro:null;
  if(v)Object.keys(v).forEach(k=>{
    const x=v[k]||{};
    out[k]={pontos:(x.pontos&&typeof x.pontos==='object')?x.pontos:{},
            visitas:x.visitas|0, ninhoLido:x.ninhoLido||null};
    Object.keys(x).forEach(c=>{ if(!(c in out[k]))out[k][c]=x[c]; });
  });
  return out;
}
if(typeof carregar==='function'){
  const _car3=carregar;
  carregar=function(){
    const r=_car3.apply(this,arguments);
    try{ S.lugaresDentro=migrarLugares(S); }catch(e){}
    return r;
  };
}

/* ================= 8 · LEITURA DE FORA ================= */
function dentroEstado(){
  const todos=[];
  Object.keys(LOCAIS_CIDADE).forEach(c=>LOCAIS_CIDADE[c].forEach(l=>todos.push(l)));
  const L=lugares();
  return {
    cfg:DENTRO_CFG,
    tipos:Object.keys(PONTOS).length,
    formas:Object.keys(FORMAS).length,
    lugares:todos.length,
    semForma:todos.filter(l=>!PLANTA_DE[l.id]).map(l=>l.id),
    pontosPorLugar:todos.reduce((a,l)=>{a[l.id]=pontosDe(l).length;return a;},{}),
    funduraMax:Math.max(...Object.values(PONTOS).map(p=>p.fundura)),
    visitados:Object.keys(L).length,
    luzAgora:luzDaExpedicao()
  };
}
