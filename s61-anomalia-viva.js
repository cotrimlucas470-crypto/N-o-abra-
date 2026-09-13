/* ============ §61 · A ANOMALIA VIVA =================================

   A AUDITORIA, E O QUE ELA ACHOU

   O catalogo governado (§30) e bom: schema de 17 campos validados,
   orquestrador com peso, cooldown, orcamento e fila de adiamento. Mas
   contadas as 23 entradas, QUINZE SAO ADAPTADORES DE AVARIA DOMESTICA
   — calha entupida, cano furado, torneira pingando. Sobram sete bichos
   e uma isca.

   E o que uma anomalia NAO tinha:

     · PASSADO. Ela aparece, resolve, some. Na proxima vez e a primeira
       vez de novo. O campo `versao` existe no schema desde o comeco e
       NINGUEM NUNCA ESCREVEU NELE.
     · MUTACAO. Ela e identica em toda aparicao.
     · PASSIVA. Resolvida, nao deixa nada. Some inteira.
     · FUNCAO. `categoria` diz por qual SENTIDO ela chega (fisica,
       espacial, sonora, visual, cognitiva) e nao diz O QUE ELA FAZ.

   A DECISAO QUE MANDA NO BLOCO INTEIRO

   A regra de ouro do briefing: "se um evento nao puder ser explicado
   pelo jogador depois que ele acontece, o evento esta errado — mesmo
   que o codigo esteja certo."

   Isso mata a mutacao sorteada antes de ela nascer. Uma anomalia que
   muda por dado e aleatoriedade com nome bonito.

   Entao a mutacao aqui e CAUSADA PELO JOGADOR, e por uma coisa so: ELE
   REPETIU O MESMO METODO. Resolveu tres vezes com luz? A coisa deixa de
   se importar com luz. O jogador consegue contar a historia de tras pra
   frente — "ela parou de fugir da lanterna porque eu so usei lanterna"
   — e essa e a prova de que o evento esta certo.

   De quebra, resolve a proibicao nº 7 (nao inflar numero pra simular
   dificuldade): o jogo endurece porque o SEU REPERTORIO ENCOLHE, nao
   porque a coisa ganhou vida.

   E toda mutacao ABRE UM TELL NOVO junto com a porta que fecha. Punir
   sem tell e a proibicao nº 9.

   O QUE ENTRA
     1 · DOSSIE — o historico de cada anomalia, por campanha
     2 · FUNCAO — seis, cruzadas com as cinco categorias que ja existem
     3 · MUTACAO — causada pela repeticao, com tell novo junto
     4 · PASSIVA — o que fica na casa depois de resolvida
     5 · LINHAGEM — a SEMENTE gera filha, e a filha herda as mutacoes

   O QUE NAO ENTRA: nenhum catalogo paralelo. As 23 entradas continuam
   sendo o que sao; este bloco pendura vida em cima delas por adaptador.
   ===================================================================== */

const DOSSI_CFG={
  /* quantas vezes o mesmo metodo antes de a coisa aprender.
     TRES e o menor numero que ainda le como padrao: duas vezes e
     coincidencia, tres e habito. Abaixo disso o jogador nao teria tempo
     de perceber que esta repetindo. */
  repeticoesParaMutar: 3,
  /* teto de mutacoes por anomalia. Sem teto, uma campanha longa fecha
     TODAS as saidas e vira softlock — que e o oposto de dificuldade. */
  mutacoesMax: 3,
  /* quanto de estudo cada investigacao rende, e o teto */
  estudoPorInvestigacao: 18,
  estudoMax: 100,
  /* a partir de quanto estudo o dossie mostra as fraquezas */
  estudoRevela: 45,
  /* quantas anomalias o dossie guarda por campanha. Sao 23 no catalogo;
     40 da folga pras filhas de SEMENTE sem virar arquivo. */
  dossiesMax: 40,
  /* a filha de uma SEMENTE herda esta fracao do estudo da mae: quem
     estudou a mae ja sabe meio caminho da filha */
  heranciaEstudo: .5
};

/* ================= 1 · FUNCAO =================
   `categoria` responde POR ONDE ela chega. `funcao` responde O QUE ELA
   FAZ. Sao dois eixos, e cruzados dao variedade de verdade sem inventar
   numero nenhum: uma PARASITA sonora e outra coisa de uma PARASITA
   espacial, e as duas continuam parasitas.

   Nao e um campo novo no schema — seria quebrar o validador e os saves.
   E uma tabela que MAPEIA o catalogo que ja existe. */
const FUNCOES={
  PREDADOR:  {n:'predador',  d:'vai atras de você'},
  PARASITA:  {n:'parasita',  d:'come um recurso seu, devagar'},
  ARQUITETO: {n:'arquiteto', d:'muda a casa de lugar'},
  TESTEMUNHA:{n:'testemunha',d:'repete o que você fez'},
  SEMENTE:   {n:'semente',   d:'gera outra'},
  GUARDIAO:  {n:'guardião',  d:'tranca alguma coisa'}
};
/* a funcao de cada entrada do catalogo. As avarias nao sao todas
   iguais: calha e cano COMEM (parasita), rachadura e janela ABREM
   (arquiteto), porta emperrada TRANCA (guardiao). */
const FUNCAO_DE={
  avaria_calha:'PARASITA', avaria_infiltra:'PARASITA', avaria_cano:'PARASITA',
  avaria_alagado:'PARASITA', avaria_torneira:'PARASITA', avaria_bomba:'PARASITA',
  avaria_goteira:'PARASITA',
  avaria_rachadura:'ARQUITETO', avaria_janela:'ARQUITETO',
  avaria_aberta:'ARQUITETO', avaria_cerca:'ARQUITETO', avaria_telhado:'ARQUITETO',
  avaria_porta_emperra:'GUARDIAO',
  avaria_fiacao:'TESTEMUNHA', avaria_curto:'TESTEMUNHA',
  bicho_magro:'PREDADOR', bicho_rastejante:'PREDADOR', bicho_inchado:'PREDADOR',
  bicho_coro:'SEMENTE', bicho_imitador:'TESTEMUNHA',
  bicho_primordial:'GUARDIAO', bicho_observador:'TESTEMUNHA',
  isca_escuridao:'SEMENTE'
};
function funcaoDe(id){ return FUNCAO_DE[id]||'PREDADOR'; }
function funcaoInfo(id){ return FUNCOES[funcaoDe(id)]; }

/* ================= 2 · O DOSSIE =================
   Resumo por anomalia, no save. Sem funcao, sem timer, sem no de DOM —
   e a proibicao nº 4. So numero, texto e lista. */
function dossies(){
  if(!S.dossies||typeof S.dossies!=='object')S.dossies={};
  return S.dossies;
}
function dossi(id){
  const D=dossies(), k=String(id);
  if(!D[k])D[k]={
    vezes:0,          /* quantas vezes se manifestou                 */
    metodos:{},       /* quantas vezes voce a encerrou de cada jeito */
    falhas:0,         /* quantas vezes ela te pegou                  */
    dia1:0, diaN:0,   /* primeira e ultima aparicao                  */
    estudo:0,         /* 0..100, quanto voce sabe dela               */
    mutacoes:[],      /* [{metodo, dia, fecha, abre, tell}]          */
    passiva:null,     /* o que ela deixou na casa                    */
    mae:null,         /* de quem ela nasceu, se nasceu de alguem     */
    foco:null         /* onde la fora mora a origem dela (§62)       */
  };
  return D[k];
}
function dossiPodar(){
  const D=dossies(), ks=Object.keys(D);
  if(ks.length<=DOSSI_CFG.dossiesMax)return 0;
  /* poda pelo MENOS importante: pouco visto, pouco estudado, sem
     mutacao e sem passiva. Nunca poda quem deixou marca. */
  const ordem=ks.slice().sort((a,b)=>{
    const x=D[a], y=D[b];
    const px=(x.passiva?100:0)+x.mutacoes.length*30+x.estudo*.3+x.vezes;
    const py=(y.passiva?100:0)+y.mutacoes.length*30+y.estudo*.3+y.vezes;
    return px-py;
  });
  let n=0;
  while(Object.keys(D).length>DOSSI_CFG.dossiesMax&&ordem.length){
    const k=ordem.shift();
    if(D[k]&&!D[k].passiva&&!D[k].mutacoes.length){ delete D[k]; n++; }
    else if(!ordem.length)break;
  }
  return n;
}

/* ================= 3 · AS MUTACOES =================
   Cada metodo que o jogador pode repetir tem UMA mutacao, e a mutacao
   diz as tres coisas: o que FECHA, o que ABRE, e por qual TELL o
   jogador percebe que mudou.

   `abre` nao e consolo. E a regra: fechar sem abrir transforma
   repeticao em beco sem saida, e um jogo em que a resposta certa some e
   um jogo que pune sem dar o que fazer. */
const MUTACOES={
  fugiu:{
    fecha:'fugir',
    nome:'aprendeu o seu passo',
    conta:'Ela passou a te esperar no caminho de saída, em vez de correr atrás.',
    abre:'esconder',
    comoAbre:'Quem espera na saída não olha pros cantos.',
    tell:{tipo:'passo_antecipado',intensidade:.6,turnosAntes:2}
  },
  escondeu:{
    fecha:'esconder',
    nome:'aprendeu os seus cantos',
    conta:'Ela começou pelos lugares apertados. Foi onde você sempre esteve.',
    abre:'fugir',
    comoAbre:'Quem revista canto demora, e demorar abre caminho.',
    tell:{tipo:'revista_canto',intensidade:.55,turnosAntes:2}
  },
  venceu:{
    fecha:'lutar',
    nome:'aprendeu a sua mão',
    conta:'Ela para fora do alcance do seu braço e espera você cansar.',
    abre:'esconder',
    comoAbre:'Quem fica longe também demora a te achar.',
    tell:{tipo:'distancia_medida',intensidade:.5,turnosAntes:2}
  },
  reparar:{
    fecha:'reparar',
    nome:'aprendeu o seu conserto',
    conta:'Ela volta pelo mesmo remendo, e agora volta mais fundo.',
    abre:'selar',
    comoAbre:'Remendo ela desfaz. Tábua pregada por cima, ainda não.',
    tell:{tipo:'remendo_cede',intensidade:.5,turnosAntes:2}
  },
  luz:{
    fecha:'luz',
    nome:'parou de recuar da luz',
    conta:'A lâmpada acesa deixou de ser parede. Ela atravessa.',
    abre:'som',
    comoAbre:'Quem não teme a luz confia no ouvido — e ouvido se engana.',
    tell:{tipo:'sombra_firme',intensidade:.7,turnosAntes:2}
  },
  som:{
    fecha:'som',
    nome:'parou de seguir barulho',
    conta:'Jogar coisa longe não desvia mais. Ela vai direto.',
    abre:'rastro',
    comoAbre:'Quem não segue som segue chão, e chão dá pra sujar.',
    tell:{tipo:'ignora_isca',intensidade:.6,turnosAntes:2}
  },
  olhar:{
    fecha:'olhar',
    nome:'devolve o olhar',
    conta:'Desviar os olhos parou de afastar. Agora desviar é que chama.',
    abre:'luz',
    comoAbre:'O que encara não suporta ser visto por inteiro.',
    tell:{tipo:'encara_de_volta',intensidade:.8,turnosAntes:2}
  },
  desistiu:{
    fecha:'desistir',
    nome:'aprendeu a te seguir de volta',
    conta:'Dar meia-volta deixou de encerrar. Ela vem junto.',
    abre:'fugir',
    comoAbre:'Quem te segue sai do lugar dela, e fora do lugar ela é mais lenta.',
    tell:{tipo:'passos_atras',intensidade:.75,turnosAntes:2}
  }
};

/* ================= 4 · AS PASSIVAS =================
   O que fica na casa depois que a anomalia foi embora. A passiva vem da
   FUNCAO, nao do bicho: e a funcao que diz o que aquilo FAZIA, e o que
   fica e a marca do que aquilo fazia.

   Toda passiva tem os dois lados. Passiva so-ruim e castigo por ter
   jogado; passiva so-boa e premio por respirar. Duas pontas fazem o
   jogador ESCOLHER qual anomalia deixar viva mais tempo — que e a
   decisao que este bloco existe pra criar. */
const PASSIVAS={
  PREDADOR:{
    n:'o caminho aberto',
    bom:'A casa tem uma rota que ela abriu e ninguém fechou: andar por ali custa menos.',
    ruim:'E o que vier depois também sabe dessa rota.',
    campo:'rotaAberta'
  },
  PARASITA:{
    n:'o cano que aprendeu a vazar',
    bom:'Você sabe onde a água junta, e junta limpa.',
    ruim:'E junta sozinha, todo dia, sem pedir licença.',
    campo:'aguaParada'
  },
  ARQUITETO:{
    n:'a parede que não voltou',
    bom:'Dois cômodos ficaram ligados por um vão que não existia. Atalho.',
    ruim:'Atalho serve pros dois lados.',
    campo:'vaoNovo'
  },
  TESTEMUNHA:{
    n:'o eco que ficou',
    bom:'A casa repete o que você faz, então dá pra ouvir o próprio erro.',
    ruim:'E quem estiver ouvindo, ouve junto.',
    campo:'ecoDaCasa'
  },
  SEMENTE:{
    n:'a ninhada',
    bom:'Você conhece a cara das filhas antes de elas chegarem.',
    ruim:'Porque elas chegam.',
    campo:'ninhada'
  },
  GUARDIAO:{
    n:'a tranca que sobrou',
    bom:'O que ela guardava ficou pra você.',
    ruim:'E o que ela trancava, destrancou.',
    campo:'trancaSolta'
  }
};
function passivas(){
  if(!Array.isArray(S.passivasAtivas))S.passivasAtivas=[];
  return S.passivasAtivas;
}
function temPassiva(campo){ return passivas().some(p=>p.campo===campo); }

/* ================= 5 · A VIDA =================
   `dossiUsou` e o coracao: e por onde o metodo do jogador entra. */
function dossiViu(id,dia){
  const d=dossi(id);
  d.vezes++;
  if(!d.dia1)d.dia1=dia|0;
  d.diaN=dia|0;
  if(typeof marcarSujo==='function')marcarSujo();
  return d;
}
function dossiFalhou(id){
  const d=dossi(id); d.falhas++;
  if(typeof marcarSujo==='function')marcarSujo();
  return d;
}
/* o jogador encerrou a anomalia `id` usando `metodo`.
   Devolve a mutacao, se esta foi a vez que ela aprendeu. */
function dossiUsou(id,metodo){
  if(!id||!metodo)return null;
  const d=dossi(id);
  d.metodos[metodo]=(d.metodos[metodo]||0)+1;
  if(!d.passiva)dossiDeixaPassiva(id);
  const m=dossiTalvezMutar(id,metodo);
  if(typeof marcarSujo==='function')marcarSujo();
  return m;
}
function jaMutouContra(d,metodo){ return d.mutacoes.some(x=>x.metodo===metodo); }
function dossiTalvezMutar(id,metodo){
  const d=dossi(id), M=MUTACOES[metodo];
  if(!M)return null;
  if(d.mutacoes.length>=DOSSI_CFG.mutacoesMax)return null;
  if(jaMutouContra(d,metodo))return null;
  if((d.metodos[metodo]||0)<DOSSI_CFG.repeticoesParaMutar)return null;
  const mut={metodo, dia:S.dia|0, fecha:M.fecha, abre:M.abre,
             nome:M.nome, tell:M.tell.tipo};
  d.mutacoes.push(mut);
  /* o `versao` do registro sobe junto: o campo existia no schema desde
     o comeco e ninguem nunca tinha escrito nele. Agora ele quer dizer
     "esta e a segunda versao DESTA anomalia, nesta campanha". */
  try{ const r=registroDe(id); if(r)r.versao=1+d.mutacoes.length; }catch(e){}
  dossiAnunciar(id,M);
  return mut;
}
/* O TELL DA MUTACAO. Punir sem aviso e a proibicao nº 9, e mutacao e a
   punicao mais dura do bloco: ela apaga uma saida que o jogador
   aprendeu. Entao ela fala duas vezes — o que fechou e o que abriu. */
function dossiAnunciar(id,M){
  const r=(typeof registroDe==='function')?registroDe(id):null;
  const nome=(r&&r.nome)||'aquilo';
  try{
    if(typeof Sinais==='object'&&Sinais&&typeof Sinais.emitir==='function')
      Sinais.emitir({tipo:M.tell.tipo, intensidade:M.tell.intensidade,
        antecedencia:M.tell.turnosAntes, fonte:id, fase:'mutacao'});
  }catch(e){}
  try{
    if(typeof diz==='function'){
      diz(nome+' '+M.nome+'.','perigo');
      diz(M.conta,'narr');
      diz(M.comoAbre,'sist');
    }
    if(typeof anotar==='function')
      anotar(nome+' mudou: '+M.nome+' (dia '+(S.dia|0)+').');
  }catch(e){}
}
/* a passiva nasce na PRIMEIRA vez que voce encerra a anomalia */
function dossiDeixaPassiva(id){
  const d=dossi(id), f=funcaoDe(id), P=PASSIVAS[f];
  if(!P||d.passiva)return null;
  const r=(typeof registroDe==='function')?registroDe(id):null;
  d.passiva={campo:P.campo, n:P.n, de:id,
             deNome:(r&&r.nome)||id, dia:S.dia|0};
  const L=passivas();
  if(!L.some(p=>p.campo===P.campo))
    L.push({campo:P.campo, n:P.n, de:id, deNome:d.passiva.deNome, dia:S.dia|0});
  try{
    if(typeof diz==='function')diz('Ficou uma marca: '+P.n+'. '+P.bom,'sist');
    if(typeof anotar==='function')anotar('A casa ficou com: '+P.n+'.');
  }catch(e){}
  return d.passiva;
}

/* ================= 6 · AS RESOLUCOES QUE SOBRARAM =================
   Quais saidas esta anomalia ainda aceita, HOJE. E a leitura que o
   dossie do caderno mostra, e e ela que os sistemas consultam. */
function resolucoesVivas(id){
  const r=(typeof registroDe==='function')?registroDe(id):null;
  const base=(r&&Array.isArray(r.resolucoes))?r.resolucoes.slice():[];
  const d=dossi(id);
  const fechadas={}, abertas=[];
  d.mutacoes.forEach(m=>{ fechadas[m.fecha]=true; if(m.abre)abertas.push(m.abre); });
  const vivas=base.filter(x=>!fechadas[x]);
  abertas.forEach(a=>{ if(!vivas.includes(a))vivas.push(a); });
  /* TRAVA DE SEGURANCA: nunca zero. Uma anomalia sem saida nenhuma e
     softlock, e softlock nao e dificuldade. Se as mutacoes fecharam
     tudo, a ultima que abriu vale. */
  if(!vivas.length){
    const ultima=d.mutacoes[d.mutacoes.length-1];
    vivas.push((ultima&&ultima.abre)||'fugir');
  }
  return vivas;
}
function aceita(id,metodo){ return resolucoesVivas(id).includes(metodo); }

/* ================= 7 · LINHAGEM =================
   Uma SEMENTE gera filha, e a filha ja nasce sabendo o que a mae
   aprendeu. E aqui que repetir metodo cobra juros: o habito que fechou
   uma porta na mae ja nasce fechado na filha. */
function dossiNasceDe(idFilha,idMae){
  const f=dossi(idFilha), m=dossi(idMae);
  f.mae=idMae;
  m.mutacoes.forEach(x=>{
    if(!jaMutouContra(f,x.metodo))
      f.mutacoes.push({metodo:x.metodo, dia:S.dia|0, fecha:x.fecha,
        abre:x.abre, nome:x.nome+' (de nascença)', tell:x.tell, herdada:true});
  });
  f.estudo=Math.max(f.estudo,Math.round(m.estudo*DOSSI_CFG.heranciaEstudo));
  if(typeof marcarSujo==='function')marcarSujo();
  return f;
}
function filhasDe(idMae){
  const D=dossies();
  return Object.keys(D).filter(k=>D[k].mae===idMae);
}

/* ================= 8 · ESTUDO E LEITURA =================
   O dossie nao entrega a verdade de graca: entrega o que voce estudou.
   E por isso que o §62 (achar o foco la fora) vale a viagem. */
function dossiEstudar(id,quanto){
  const d=dossi(id);
  d.estudo=trava(d.estudo+(quanto||DOSSI_CFG.estudoPorInvestigacao),0,DOSSI_CFG.estudoMax);
  if(typeof marcarSujo==='function')marcarSujo();
  return d.estudo;
}
function dossiLer(id){
  const d=dossi(id), r=(typeof registroDe==='function')?registroDe(id):null;
  const fi=funcaoInfo(id);
  const linhas=[];
  const nome=(r&&r.nome)||id;
  linhas.push({t:nome, cls:'cap'});
  if(!d.vezes){
    linhas.push({t:'Você nunca viu isso. Só ouviu falar.', cls:'fraco'});
    return {nome, linhas, estudo:d.estudo, vivas:[], mutacoes:[]};
  }
  linhas.push({t:'Apareceu '+d.vezes+(d.vezes===1?' vez':' vezes')+
    ', do dia '+d.dia1+' ao dia '+d.diaN+'.', cls:'sist'});
  linhas.push({t:'O que ela faz: '+fi.n+' — '+fi.d+'.', cls:'sist'});
  if(d.falhas)linhas.push({t:'Ela te pegou '+d.falhas+
    (d.falhas===1?' vez':' vezes')+'.', cls:'perigo'});
  const usados=Object.keys(d.metodos).sort((a,b)=>d.metodos[b]-d.metodos[a]);
  if(usados.length)linhas.push({t:'Você resolveu assim: '+
    usados.map(m=>m+' ('+d.metodos[m]+')').join(', ')+'.', cls:'narr'});
  d.mutacoes.forEach(m=>{
    linhas.push({t:'· '+m.nome+(m.herdada?'':' — dia '+m.dia)+
      '. Fechou: '+m.fecha+'. Abriu: '+(m.abre||'nada')+'.', cls:'perigo'});
  });
  if(d.mae)linhas.push({t:'Nasceu de '+d.mae+'.', cls:'fraco'});
  const cria=filhasDe(id);
  if(cria.length)linhas.push({t:'Já gerou: '+cria.length+'.', cls:'fraco'});
  if(d.passiva)linhas.push({t:'Deixou na casa: '+d.passiva.n+'.', cls:'bom'});
  linhas.push({t:'Estudo: '+d.estudo+' de 100.', cls:'sist'});
  const vivas=resolucoesVivas(id);
  if(d.estudo>=DOSSI_CFG.estudoRevela)
    linhas.push({t:'Ainda funciona: '+vivas.join(', ')+'.', cls:'bom'});
  else
    linhas.push({t:'Estude mais pra saber o que ainda funciona. '+
      'O foco dela mora fora de casa.', cls:'fraco'});
  return {nome, linhas, estudo:d.estudo, vivas, mutacoes:d.mutacoes.slice()};
}

/* ================= 9 · OS GANCHOS =================
   Onde a vida entra no jogo que ja existe. Sao tres, e nenhum reescreve
   nada — os tres embrulham. */

/* 9.1 · o encontro com ameaca JA DEVOLVE o metodo do jogador.
   `encararAmeaca` retorna 'fugiu' | 'escondeu' | 'venceu' | 'desistiu'
   | 'perdeu'. Era so ninguem estar escutando. */
if(typeof encararAmeaca==='function'){
  const _enc=encararAmeaca;
  encararAmeaca=async function(a,ctx,volta){
    const r=await _enc.apply(this,arguments);
    try{
      const id=anomIdDaAmeaca(a);
      if(id){
        dossiViu(id,S.dia|0);
        if(r==='perdeu')dossiFalhou(id);
        else if(MUTACOES[r])dossiUsou(id,r);
      }
    }catch(e){}
    return r;
  };
}
/* a ponte entre a AMEACA (que tem id proprio) e o catalogo. Tabela, nao
   palpite: chutar por prefixo ja produziu "do lado do cozinha" neste
   projeto. Ameaca que nao tem par no catalogo devolve null e o dossie
   simplesmente nao anota — melhor nao anotar que anotar errado. */
const AMEACA_ANOM={
  magro:'bicho_magro', rastejo:'bicho_rastejante', rastejante:'bicho_rastejante',
  inchado:'bicho_inchado', coro:'bicho_coro', coro2:'bicho_coro',
  imitador:'bicho_imitador', mae:'bicho_imitador',
  fundo:'bicho_primordial', aquilo:'bicho_primordial',
  observador:'bicho_observador'
};
function anomIdDaAmeaca(a){
  if(!a)return null;
  const k=a.id||a.tipo||'';
  if(AMEACA_ANOM[k])return AMEACA_ANOM[k];
  if(typeof registroDe==='function'&&registroDe(k))return k;
  return null;
}

/* 9.2 · a avaria reparada. `encerrarAtiva` e o funil por onde TODA
   anomalia sai — inclusive as que saem sozinhas. So conta como metodo
   do jogador o que tem cara de conserto; expirar nao e resolver. */
if(typeof encerrarAtiva==='function'){
  const _enc2=encerrarAtiva;
  encerrarAtiva=function(id,porque){
    try{
      if(id&&/repar|consert|selad|fechad/i.test(String(porque||''))){
        dossiViu(id,S.dia|0);
        dossiUsou(id,'reparar');
      }
    }catch(e){}
    return _enc2.apply(this,arguments);
  };
}

/* 9.3 · a anomalia comeca. `marcarAtiva` e o funil da entrada. */
if(typeof marcarAtiva==='function'){
  const _mar=marcarAtiva;
  marcarAtiva=function(id){
    try{
      const L=_mar.apply(this,arguments);
      dossiViu(id,S.dia|0);
      dossiSeSemente(id);
      dossiPodar();
      return L;
    }catch(e){ return _mar.apply(this,arguments); }
  };
}
/* uma SEMENTE que ja apareceu duas vezes gera filha na terceira.
   Deterministico, nao sorteado: o jogador consegue contar por que. */
function dossiSeSemente(id){
  if(funcaoDe(id)!=='SEMENTE')return null;
  const d=dossi(id);
  if(d.vezes<3)return null;
  const ja=filhasDe(id);
  if(ja.length>=2)return null;
  const filha=id+'__cria'+(ja.length+1);
  dossiNasceDe(filha,id);
  try{
    const r=(typeof registroDe==='function')?registroDe(id):null;
    if(typeof diz==='function')
      diz(((r&&r.nome)||'Aquilo')+' não veio sozinha desta vez.','perigo');
    if(typeof anotar==='function')anotar('Nasceu uma cria de '+id+'.');
  }catch(e){}
  return filha;
}

/* ================= 10 · MIGRACAO =================
   Save velho nao pode quebrar (proibicao nº 2). Campo desconhecido de
   save FUTURO e preservado, nao descartado — mesma regra do §39. */
function migrarDossies(d){
  const out={};
  const velho=(d&&d.dossies&&typeof d.dossies==='object')?d.dossies:null;
  if(velho)Object.keys(velho).forEach(k=>{
    const v=velho[k]||{};
    out[k]={
      vezes:v.vezes|0, metodos:(v.metodos&&typeof v.metodos==='object')?v.metodos:{},
      falhas:v.falhas|0, dia1:v.dia1|0, diaN:v.diaN|0,
      estudo:trava(+v.estudo||0,0,DOSSI_CFG.estudoMax),
      mutacoes:Array.isArray(v.mutacoes)?v.mutacoes:[],
      passiva:v.passiva||null, mae:v.mae||null, foco:v.foco||null
    };
    Object.keys(v).forEach(c=>{ if(!(c in out[k]))out[k][c]=v[c]; });
  });
  return out;
}
function migrarPassivas(d){
  const v=(d&&Array.isArray(d.passivasAtivas))?d.passivasAtivas:[];
  return v.filter(p=>p&&p.campo&&PASSIVAS[funcaoDe(p.de)]);
}
if(typeof carregar==='function'){
  const _car=carregar;
  carregar=function(){
    const r=_car.apply(this,arguments);
    try{
      S.dossies=migrarDossies(S);
      S.passivasAtivas=migrarPassivas(S);
    }catch(e){}
    return r;
  };
}

/* ================= 11 · LEITURA DE FORA ================= */
function dossiEstado(){
  const D=dossies();
  const ids=Object.keys(D);
  return {
    cfg:DOSSI_CFG,
    quantos:ids.length,
    vistos:ids.filter(k=>D[k].vezes>0).length,
    mutacoes:ids.reduce((a,k)=>a+D[k].mutacoes.length,0),
    passivas:passivas().slice(),
    funcoes:Object.keys(FUNCOES),
    porFuncao:ids.reduce((a,k)=>{const f=funcaoDe(k);a[f]=(a[f]||0)+1;return a;},{}),
    dossies:ids.map(k=>({id:k, vezes:D[k].vezes, estudo:D[k].estudo,
      mutacoes:D[k].mutacoes.length, mae:D[k].mae,
      vivas:resolucoesVivas(k)}))
  };
}
