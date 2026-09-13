/* ============ §62 · O COMODO TEM COISAS DENTRO ======================

   A AUDITORIA, JOGANDO E CONTANDO

   Sondei o jogo de verdade e contei o que aparece na tela. Dentro de
   casa, a tela principal tem VINTE E DOIS botoes, e a conta deles e a
   resposta inteira pro "esta muito sem o que fazer":

     · 1 acao de exploracao — "Vasculhar o comodo · 1 hora"
     · 5 de movimento
     · 16 de MENU E LEITURA — o caderno, o diario, ajustes, como
       funciona, ver quem esta aqui, o que pesa hoje, como esta tudo...

   Ou seja: o jogador encara um INDICE, nao uma situacao. E a unica coisa
   que da pra FAZER num comodo e um verbo generico, repetivel, identico
   nos nove comodos. Os botoes proprios que existem (fabricar na oficina,
   conferir estoque na despensa) sao UTILIDADE — servicos — e nao coisas
   pra descobrir.

   O diagnostico em uma frase: O COMODO E UM NUMERO, NAO UM LUGAR.

   E nao falta sistema. O plano de exploracao de nove etapas (§39 a §46)
   foi todo construido: camada, custo de passo, pressao, luz, ponto de
   nao retorno, achados, cicatriz, tratamento. Falta CONTEUDO dentro do
   comodo pra esses sistemas terem no que pegar.

   O QUE ENTRA

   1 · COISAS. Trinta e oito objetos com nome proprio, espalhados pelos
       nove comodos. O armario do quarto, a tabua solta do sotao, a caixa
       de fusiveis da oficina. Cada um tem estado e lembra.

   2 · VERBOS QUE DIFEREM. Nao "vasculhar" em tudo. Cada coisa aceita os
       verbos que fazem sentido nela, e cada verbo custa diferente:
       olhar e de graca, escutar e silencioso, forcar faz barulho, selar
       gasta material e fecha pra sempre.

   3 · O FOCO — E ESTA E A LIGACAO QUE FALTAVA. Toda anomalia ativa
       ancora numa COISA especifica da casa. Achar o foco e o unico jeito
       de estudar a anomalia (§61), e selar o foco e a resolucao
       permanente. De dia voce caca a ancora; de noite ela vem.

       Antes deste bloco, exploracao e anomalia eram dois jogos que nunca
       se tocavam: a anomalia era coisa de noite, a exploracao de dia.

   COMO O FOCO E ESCOLHIDO, E POR QUE NAO E SORTEADO

   Por hash do id da anomalia com o saveId, filtrado pelas coisas que
   combinam com a CATEGORIA dela: anomalia sonora ancora no que faz ou
   conduz som, espacial no que abre passagem, fisica no que aguenta peso.
   Deterministico e explicavel — um jogador que entendeu a regra procura
   no lugar certo em vez de varrer a casa. Aleatorio seria varredura.
   ===================================================================== */

const COISA_CFG={
  /* custo de cada verbo: horas, ruido, e se e permanente */
  verbos:{
    olhar:   {n:'Olhar',            h:0, ruido:0,  d:'de graça'},
    escutar: {n:'Encostar o ouvido',h:0, ruido:0,  d:'não faz barulho'},
    abrir:   {n:'Abrir',            h:1, ruido:3,  d:'1 hora'},
    mover:   {n:'Arrastar',         h:1, ruido:7,  d:'1 hora · barulho'},
    forcar:  {n:'Forçar',           h:1, ruido:14, d:'1 hora · muito barulho'},
    selar:   {n:'Pregar por cima',  h:2, ruido:9,  d:'2 horas · tábua e prego'}
  },
  /* o que selar custa de material */
  custoSelar:{tabua:1, prego:2},
  /* quanto de estudo achar o foco rende. Tres achados levam uma
     anomalia de zero ao limiar que revela as fraquezas (45). */
  estudoPorFoco: 16,
  /* e quanto selar o foco rende alem disso */
  estudoPorSelar: 30,
  /* quantas coisas de um comodo o "olhar de longe" lista de uma vez.
     Teto pra tela nao virar o indice de 22 botoes que este bloco
     nasceu pra desfazer. */
  porTela: 5
};

/* ================= 1 · AS COISAS =================
   `cat` e a categoria de anomalia que ancora ali, e vem do que a coisa
   E — nao de sorteio. `sonora` no que conduz ou faz som, `espacial` no
   que abre passagem, `fisica` no que aguenta peso, `visual` no que
   reflete ou esconde da vista, `cognitiva` no que guarda memoria de
   gente. Coisa sem `cat` nunca ancora nada. */
const COISAS=[
 /* ---- 0 · SÓTÃO ---- */
 {id:'tabua_solta', onde:0, n:'a tábua solta do assoalho', cat:'espacial',
  d:'Uma tábua range diferente das outras. Já rangia antes de tudo isso.',
  verbos:['olhar','escutar','mover','selar'],
  sob:{mat:'prego',q:4}, som:'Debaixo dela o ar corre. Tem vão aí.'},
 {id:'caixa_fotos', onde:0, n:'a caixa de fotografia', cat:'cognitiva',
  d:'Papelão mole de umidade, amarrado com barbante. Tem nome escrito na tampa.',
  verbos:['olhar','abrir'],
  dentro:{txt:'Fotos de gente que morava aqui antes. Numa delas a casa tem uma porta a mais.'}},
 {id:'agua_telhado', onde:0, n:'a mancha do telhado', cat:'fisica',
  d:'A água entrou por ali e desenhou um contorno que não secou mais.',
  verbos:['olhar','escutar','selar'], som:'Pinga. Sempre no mesmo intervalo.'},
 {id:'janela_frente', onde:0, n:'a janela da frente', cat:'visual',
  d:'Dá pra rua inteira. É por ela que você vigia.',
  verbos:['olhar','escutar','selar'], som:'A rua. Só a rua.'},

 /* ---- 1 · QUARTO ---- */
 {id:'armario_quarto', onde:1, n:'o armário de roupa', cat:'cognitiva',
  d:'Duas portas, uma que não fecha. Dentro, roupa de gente que não voltou.',
  verbos:['olhar','escutar','abrir','mover','selar'],
  dentro:{mat:'pano',q:3}, som:'Nada. Um nada que ocupa espaço.'},
 {id:'cama_quarto', onde:1, n:'a cama de casal', cat:'fisica',
  d:'Alta o bastante pra caber alguém embaixo.',
  verbos:['olhar','escutar','mover'], sob:{mat:'tabua',q:2},
  som:'O assoalho embaixo dela estala sozinho.'},
 {id:'espelho_quarto', onde:1, n:'o espelho da cômoda', cat:'visual',
  d:'Manchado nas bordas. Devolve o cômodo com meio segundo de atraso — ou você quer que devolva.',
  verbos:['olhar','selar']},
 {id:'gaveta_trancada', onde:1, n:'a gaveta que não abre', cat:'cognitiva',
  d:'A única coisa trancada da casa inteira. A chave não está em lugar nenhum.',
  verbos:['olhar','escutar','forcar'],
  dentro:{txt:'Carta pela metade, letra apertada. Fala de uma coisa que "vem pelo mesmo lugar sempre".'},
  som:'Papel se mexendo lá dentro. Sem vento.'},

 /* ---- 2 · DESPENSA ---- */
 {id:'prateleira_fundo', onde:2, n:'a prateleira do fundo', cat:'fisica',
  d:'A mais alta, onde ninguém alcança sem subir em coisa.',
  verbos:['olhar','mover'], sob:{mat:'arame',q:2}},
 {id:'caixote_latas', onde:2, n:'o caixote das latas suspeitas', cat:'fisica',
  d:'Separado do resto de propósito. As tampas estufam devagar.',
  verbos:['olhar','escutar','abrir'], som:'Estala. Metal cedendo, ou coisa dentro.'},
 {id:'parede_despensa', onde:2, n:'a parede que soa oca', cat:'espacial',
  d:'Bate diferente dos outros três lados. Sempre bateu.',
  verbos:['olhar','escutar','forcar','selar'],
  dentro:{mat:'tabua',q:3}, som:'Oco. Fundo demais pra ser só reboco.'},

 /* ---- 3 · OFICINA ---- */
 {id:'fusiveis', onde:3, n:'a caixa de fusíveis', cat:'visual',
  d:'Seis fusíveis, dois queimados. A tampa tem marca de dedo que não é sua.',
  verbos:['olhar','escutar','abrir','selar'],
  dentro:{mat:'fio',q:2}, som:'Zumbido. Sobe quando você encosta.'},
 {id:'bancada', onde:3, n:'a bancada', cat:'fisica',
  d:'Riscada de tudo que já foi feito nela.',
  verbos:['olhar','mover'], sob:{mat:'cano',q:1}},
 {id:'contrapiso', onde:3, n:'o contrapiso levantado', cat:'espacial',
  d:'Alguém já mexeu aqui antes de você.',
  verbos:['olhar','escutar','mover','selar'], som:'Terra. E embaixo da terra, ar.'},
 {id:'ferramenta_velha', onde:3, n:'as ferramentas do dono antigo', cat:'cognitiva',
  d:'Penduradas na ordem de quem usava todo dia.',
  verbos:['olhar','abrir'], dentro:{mat:'arame',q:2}},

 /* ---- 4 · SALA ---- */
 {id:'sofa', onde:4, n:'o sofá', cat:'fisica',
  d:'Encostado na parede desde sempre. Pesado do jeito certo pra barricada.',
  verbos:['olhar','escutar','mover'], sob:{mat:'pano',q:2},
  som:'A parede atrás dele responde quando você bate.'},
 {id:'estante', onde:4, n:'a estante de livros', cat:'cognitiva',
  d:'Livro nenhum interessa. O que interessa é o que foi guardado atrás deles.',
  verbos:['olhar','abrir','mover'],
  dentro:{txt:'Um caderno de contas. Nas últimas páginas, as contas param e começam datas.'}},
 {id:'lampada_sala', onde:4, n:'a lâmpada do teto', cat:'visual',
  d:'A única da casa que ainda acende sem piscar.',
  verbos:['olhar','escutar'], som:'Chia baixo. Chia mais quando é noite.'},
 {id:'retrato_parede', onde:4, n:'o retrato na parede', cat:'cognitiva',
  d:'Família de quatro. Ninguém sorrindo, do jeito que se fotografava antes.',
  verbos:['olhar','mover','selar'], sob:{txt:'Atrás dele, a parede tem um buraco do tamanho de um punho. Tapado com jornal.'}},

 /* ---- 5 · COZINHA ---- */
 {id:'fogao', onde:5, n:'o fogão', cat:'fisica',
  d:'Boca entupida de gordura antiga. O botijão embaixo ainda tem peso.',
  verbos:['olhar','escutar','mover'], sob:{mat:'cano',q:1},
  som:'Gás não. Outra coisa, passando pelo cano.'},
 {id:'pia', onde:5, n:'a pia', cat:'sonora',
  d:'A torneira pinga desde o segundo dia.',
  verbos:['olhar','escutar','selar'], som:'Pingo. E entre um pingo e outro, sempre, um estalo.'},
 {id:'armario_alto', onde:5, n:'o armário de cima', cat:'fisica',
  d:'Fundo demais pro braço alcançar o fim.',
  verbos:['olhar','abrir'], dentro:{mat:'arame',q:1}},
 {id:'porta_fundos', onde:5, n:'a porta dos fundos', cat:'espacial',
  d:'Dá pro quintal. Tem tranca por dentro e marca de pé por fora.',
  verbos:['olhar','escutar','selar'], som:'O quintal. E no quintal, passo.'},

 /* ---- 6 · PORÃO ---- */
 {id:'escada_porao', onde:6, n:'a escada do porão', cat:'espacial',
  d:'Sete degraus. O quinto cedeu e ninguém consertou.',
  verbos:['olhar','escutar','selar'], som:'Embaixo, coisa arrastando de vez em quando.'},
 {id:'cisterna', onde:6, n:'a cisterna', cat:'sonora',
  d:'Tampa de concreto, meio empurrada. A água lá dentro não é boa há muito tempo.',
  verbos:['olhar','escutar','mover','selar'], som:'O eco devolve a sua respiração com um atraso que não é seu.'},
 {id:'caixas_porao', onde:6, n:'as caixas empilhadas', cat:'fisica',
  d:'Coisa de mudança que nunca foi desfeita.',
  verbos:['olhar','abrir','mover'], dentro:{mat:'tabua',q:2}},
 {id:'parede_umida', onde:6, n:'a parede que sua', cat:'fisica',
  d:'Molhada o ano inteiro, mesmo sem chuva.',
  verbos:['olhar','escutar','selar'], som:'Água correndo do outro lado. Não tem cano desse lado.'},

 /* ---- 7 · ENTRADA ---- */
 {id:'porta_frente', onde:7, n:'a porta da frente', cat:'espacial',
  d:'Reforçada até onde deu. É por ela que eles batem.',
  verbos:['olhar','escutar'], som:'A rua. E se você esperar o suficiente, respiração.'},
 {id:'olho_magico', onde:7, n:'o olho mágico', cat:'visual',
  d:'Riscado por dentro. Já foi melhor.',
  verbos:['olhar','escutar'], som:'Nada. E o nada encosta.'},
 {id:'capacho', onde:7, n:'o capacho', cat:'fisica',
  d:'Gasto no meio. Muita gente passou por aqui, e não foi tudo convidado.',
  verbos:['olhar','mover'], sob:{txt:'Debaixo dele, riscos no chão. Contagem. Alguém contava as noites antes de você.'}},
 {id:'corrente_porta', onde:7, n:'a corrente da porta', cat:'sonora',
  d:'Três elos. O do meio abriu e foi torcido de volta com alicate.',
  verbos:['olhar','escutar','selar'], som:'Tinindo baixo. Sem ninguém encostando.'},

 /* ---- 8 · QUINTAL ---- */
 {id:'muro', onde:8, n:'o muro dos fundos', cat:'espacial',
  d:'Dois metros e caco de vidro em cima. O caco acabou num pedaço.',
  verbos:['olhar','escutar','selar'], som:'Do outro lado, o bairro. E o bairro está quieto demais.'},
 {id:'tanque', onde:8, n:'o tanque de lavar', cat:'sonora',
  d:'Cimento rachado, cheio de água da chuva.',
  verbos:['olhar','escutar','mover'], sob:{mat:'cano',q:1},
  som:'A água treme sozinha. Sempre antes de qualquer outra coisa.'},
 {id:'galinheiro', onde:8, n:'o galinheiro vazio', cat:'fisica',
  d:'Tela furada num canto, de dentro pra fora.',
  verbos:['olhar','abrir','selar'], dentro:{mat:'arame',q:3}},
 {id:'terra_revirada', onde:8, n:'a terra revirada', cat:'cognitiva',
  d:'Um retângulo de terra mais escura que o resto. Do tamanho de gente.',
  verbos:['olhar','escutar','mover'], som:'Nada. E você fica aliviado, e depois não fica.',
  sob:{txt:'Ossos de bicho. Grandes demais pra cachorro. E enterrados com capricho.'}}
];
const COISA_POR_ID={}; COISAS.forEach(c=>COISA_POR_ID[c.id]=c);

/* ---------- "de" + artigo ----------
   Os nomes do catalogo ja vem com artigo: "a Coisa de Muitas Bocas",
   "o Magro", "calha entupida". Concatenar "de "+nome produz "de a Coisa
   de Muitas Bocas", que e o mesmo defeito do "do lado do cozinha" que
   ja apareceu neste projeto — e la a licao foi que HEURISTICA ESPERTA
   QUE ERRA E PIOR QUE TABELA CHATA.

   Aqui nao e palpite: o artigo esta escrito no proprio nome, entao a
   contracao e regra de gramatica aplicada ao que ja foi declarado.
   Nome sem artigo ("calha entupida") fica "de calha entupida", que e o
   certo. */
const CONTRAI={'a ':'da ','o ':'do ','as ':'das ','os ':'dos ',
               'A ':'da ','O ':'do '};
function deNome(n){
  const t=String(n||'');
  for(const art in CONTRAI)
    if(t.slice(0,art.length)===art)return CONTRAI[art]+t.slice(art.length);
  return 'de '+t;
}
/* a mesma regra pra "em": "em o tanque" -> "no tanque". Apareceu na
   ficha do caderno, jogando: "O foco esta em o tanque de lavar". */
const CONTRAI_EM={'a ':'na ','o ':'no ','as ':'nas ','os ':'nos ',
                  'A ':'na ','O ':'no '};
function emNome(n){
  const t=String(n||'');
  for(const art in CONTRAI_EM)
    if(t.slice(0,art.length)===art)return CONTRAI_EM[art]+t.slice(art.length);
  return 'em '+t;
}
function coisasDe(id){ return COISAS.filter(c=>c.onde===(id|0)); }
function coisaDe(id){ return COISA_POR_ID[id]||null; }

/* ================= 2 · O ESTADO =================
   So dado: nada de funcao, timer ou no de DOM (proibicao nº 4). */
function coisas(){
  if(!S.coisas||typeof S.coisas!=='object')S.coisas={};
  return S.coisas;
}
function est(id){
  const C=coisas(), k=String(id);
  if(!C[k])C[k]={visto:0, aberto:false, movido:false, selado:false,
                 quebrado:false, vezes:0, achou:false};
  return C[k];
}
function coisaSelada(id){ return !!est(id).selado; }

/* ================= 3 · O FOCO =================
   A ancora de uma anomalia numa coisa da casa.

   POR QUE NAO E SORTEADO: um jogador que entendeu a regra — sonora
   ancora no que conduz som, espacial no que abre passagem — procura no
   lugar certo. Sorteado, a unica estrategia seria varrer a casa inteira
   todo dia, que e o oposto de investigar. */
function focos(){
  if(!S.focos||typeof S.focos!=='object')S.focos={};
  return S.focos;
}
function focoDe(anomId){
  const F=focos(), k=String(anomId);
  if(F[k]!==undefined)return F[k];
  const r=(typeof registroDe==='function')?registroDe(anomId):null;
  const cat=(r&&r.categoria)||'fisica';
  /* candidatas: as coisas cuja natureza combina com a categoria. Se
     nenhuma combina, qualquer coisa nao selada serve — melhor um foco
     de categoria torta que anomalia sem ancora nenhuma. */
  let pool=COISAS.filter(c=>c.cat===cat&&!coisaSelada(c.id));
  if(!pool.length)pool=COISAS.filter(c=>!coisaSelada(c.id));
  if(!pool.length){ F[k]=null; return null; }
  /* hash do id com o saveId: a mesma campanha da sempre o mesmo foco,
     campanhas diferentes dao focos diferentes, e nada disso gasta o RNG
     semeado da partida — ler nao pode mexer no sorteio de quem vem
     depois. Ja quebrou determinismo neste projeto antes. */
  const h=hash32(String(anomId)+'|'+String(S.saveId||''));
  F[k]=pool[h%pool.length].id;
  if(typeof marcarSujo==='function')marcarSujo();
  return F[k];
}
/* quais anomalias ativas ancoram nesta coisa */
function anomsNaCoisa(coisaId){
  let ativ=[];
  try{ ativ=(typeof ativas==='function')?ativas():[]; }catch(e){}
  return ativ.filter(a=>focoDe(a)===coisaId);
}
/* a coisa denuncia? so denuncia pelos verbos silenciosos — olhar da o
   sinal fraco, escutar da o forte. E o contrato de tell: o aviso existe
   antes do dano, e custa atencao deliberada. */
function tellDoFoco(coisaId,forte){
  const as=anomsNaCoisa(coisaId);
  if(!as.length)return null;
  const r=(typeof registroDe==='function')?registroDe(as[0]):null;
  const cat=(r&&r.categoria)||'fisica';
  const FRACO={
    fisica:'Tem peso aqui que não devia ter.',
    espacial:'A passagem está diferente do que você lembra.',
    sonora:'O som daqui chega com atraso.',
    visual:'A luz cai errado nesse pedaço.',
    cognitiva:'Você já esteve parado aqui antes e não lembra quando.'
  };
  const FORTE={
    fisica:'Alguma coisa se apoia nisso do outro lado.',
    espacial:'Do outro lado tem espaço que a casa não tem.',
    sonora:'O que você ouve não vem daqui. Vem POR aqui.',
    visual:'Você vê o cômodo por dentro disso, e o cômodo está vazio. Você não.',
    cognitiva:'A sua própria voz, baixinho, repetindo o que você disse ontem.'
  };
  return {anom:as[0], cat, txt:forte?FORTE[cat]:FRACO[cat], forte:!!forte};
}

/* ================= 4 · OS VERBOS ================= */
function podeSelar(){
  const m=S.mat||{};
  return Object.keys(COISA_CFG.custoSelar).every(k=>(m[k]|0)>=COISA_CFG.custoSelar[k]);
}
function faltaPraSelar(){
  const m=S.mat||{};
  return Object.keys(COISA_CFG.custoSelar)
    .filter(k=>(m[k]|0)<COISA_CFG.custoSelar[k])
    .map(k=>COISA_CFG.custoSelar[k]+' '+k);
}
/* achar o foco: rende estudo no dossie do §61, e so rende UMA vez por
   anomalia — senao escutar a mesma coisa dez vezes viraria moedinha. */
function acharFoco(coisaId,forte){
  const t=tellDoFoco(coisaId,forte);
  if(!t)return null;
  const e=est(coisaId);
  if(!forte)return t;                       /* olhar so insinua */
  if(e.achou)return t;                      /* ja rendeu aqui    */
  e.achou=true;
  try{
    if(typeof dossiEstudar==='function')
      dossiEstudar(t.anom,COISA_CFG.estudoPorFoco);
    if(typeof dossi==='function')dossi(t.anom).foco=coisaId;
    const r=(typeof registroDe==='function')?registroDe(t.anom):null;
    if(typeof anotar==='function')
      anotar('O foco '+deNome((r&&r.nome)||t.anom)+' está em '+coisaDe(coisaId).n+'.');
  }catch(x){}
  if(typeof marcarSujo==='function')marcarSujo();
  return t;
}

/* ================= 5 · A TELA =================
   `menuComodo` ganha UMA entrada — "Olhar as coisas daqui" — e nao
   trinta e oito botoes. O comodo ja tinha 22 botoes; despejar as coisas
   direto na tela principal pioraria exatamente o problema que este
   bloco nasceu pra resolver. */
function telaCoisas(id,volta){
  const lista=coisasDe(id);
  limpar(); cap(comodo(id).nome+' · o que tem aqui');
  if(!lista.length){ diz('Nada que valha olhar de perto.','fraco'); return volta(); }
  diz('Você para e olha o cômodo como quem procura, não como quem passa.','narr');
  AC.innerHTML='';
  lista.forEach(c=>{
    const e=est(c.id);
    const marcas=[];
    if(e.selado)marcas.push('pregado');
    else{
      if(e.aberto)marcas.push('aberto');
      if(e.movido)marcas.push('arrastado');
      if(e.quebrado)marcas.push('quebrado');
      if(!e.visto)marcas.push('nunca olhou');
    }
    botao(c.n.charAt(0).toUpperCase()+c.n.slice(1),
      ()=>telaCoisa(c.id,()=>telaCoisas(id,volta)),
      {custo:marcas.join(' · ')||'já olhou'});
  });
  botao('Chega',()=>volta(),{cls:'prim'});
}

/* ARMADILHA QUE ME PEGOU AQUI, e e a MESMA que ja custou uma resposta de
   confirmacao nesta sessao: FALAR ANTES DE REDESENHAR.

   `limpar()` foi redefinido no jogo — ele NAO apaga, ele desbota o que
   estava na tela com a classe `passado`. Entao a sequencia natural

       diz('o que voce ouviu');  telaCoisa(id, volta);

   desbota a frase no instante em que ela aparece: o jogador clica em
   "Encostar o ouvido", le o tell mais importante do bloco inteiro em
   cinza-morto, e a tela ja esta pedindo o proximo clique.

   A correcao e inverter a ordem: a tela se redesenha primeiro e o `eco`
   e dito DEPOIS, entao ele fica em pe. */
function telaCoisa(coisaId,volta,eco){
  const c=coisaDe(coisaId); if(!c)return volta();
  const e=est(coisaId);
  limpar(); cap(c.n.toUpperCase());
  diz(c.d,'narr');
  /* O QUE VOCE JA VIU FICA NA TELA, em vez de exigir clicar de novo.
     Antes, a insinuacao do foco so aparecia no eco de um clique em
     "Olhar" — entao pra reler era preciso olhar de novo, e "Olhar" era
     gratis, repetivel e o primeiro botao da tela. O caminhador cego da
     fumaca do pacote clicou nele ONZE VEZES SEGUIDAS.
     E o mesmo defeito que o `expteste` tinha pego em "Escutar antes de
     ir", na expedicao — eu corrigi la e deixei aqui. */
  if(e.visto){
    const t=tellDoFoco(coisaId,!!e.achou);
    if(t)diz(t.txt,e.achou?'perigo':'alerta');
    else if(e.achou===false&&c.som&&e.visto>1)diz(c.som,'narr');
  }
  if(eco)eco.forEach(([t,cls])=>diz(t,cls));
  if(e.selado){
    diz('Você pregou tábua por cima. Não abre mais, e era essa a ideia.','sist');
    AC.innerHTML=''; botao('Voltar',()=>volta(),{cls:'prim'});
    return;
  }
  if(e.aberto&&c.dentro)diz('Já está aberto. Você já tirou o que tinha.','fraco');
  if(e.movido&&c.sob)diz('Já está arrastado. O que estava embaixo você já viu.','fraco');
  AC.innerHTML='';

  /* ---- olhar: de graça, e insinua. UMA VEZ: olhar de novo devolve a
       mesma frase, e ela ja fica em pe na tela (ver acima). ---- */
  if(c.verbos.includes('olhar')&&!e.visto)botao(COISA_CFG.verbos.olhar.n,()=>{
    e.visto++;
    const t=acharFoco(coisaId,false);
    telaCoisa(coisaId,volta,t?null:[['É o que parece ser.','fraco']]);
  },{custo:COISA_CFG.verbos.olhar.d});

  /* ---- escutar: silencioso, e ENTREGA o foco ---- */
  /* escutar tambem e uma vez: o que se ouve daqui nao muda */
  if(c.verbos.includes('escutar')&&!e.achou)botao(COISA_CFG.verbos.escutar.n,()=>{
    e.visto++;
    const t=acharFoco(coisaId,true);
    const eco2=[];
    if(t){
      const r=(typeof registroDe==='function')?registroDe(t.anom):null;
      eco2.push([t.txt,'perigo']);
      eco2.push(['Isso é o foco '+deNome((r&&r.nome)||'alguma coisa')+
          '. Agora você sabe onde ela mora.','sist']);
      eco2.push(['Pregar tábua por cima resolve de vez. Custa tábua e prego.','sist']);
    }else if(c.som)eco2.push([c.som,'narr']);
    else eco2.push(['Nada. Só a casa.','fraco']);
    /* mesmo sem foco, escutar so rende uma vez: a frase e sempre a mesma */
    e.achou=e.achou||(t?true:'ouvido');
    telaCoisa(coisaId,volta,eco2);
  },{custo:COISA_CFG.verbos.escutar.d});

  /* ---- abrir ---- */
  if(c.verbos.includes('abrir')&&!e.aberto)
    botao(COISA_CFG.verbos.abrir.n,acaoDia(COISA_CFG.verbos.abrir.h,async()=>{
      e.aberto=true; e.vezes++;
      gastarRuido(COISA_CFG.verbos.abrir.ruido);
      telaCoisa(coisaId,volta,renderAchado(c.dentro,coisaId));
    }),{custo:COISA_CFG.verbos.abrir.d});

  /* ---- arrastar ---- */
  if(c.verbos.includes('mover')&&!e.movido)
    botao(COISA_CFG.verbos.mover.n,acaoDia(COISA_CFG.verbos.mover.h,async()=>{
      e.movido=true; e.vezes++;
      gastarRuido(COISA_CFG.verbos.mover.ruido);
      telaCoisa(coisaId,volta,renderAchado(c.sob,coisaId));
    }),{custo:COISA_CFG.verbos.mover.d});

  /* ---- forçar: barulho de verdade ---- */
  if(c.verbos.includes('forcar')&&!e.aberto)
    botao(COISA_CFG.verbos.forcar.n,acaoDia(COISA_CFG.verbos.forcar.h,async()=>{
      e.aberto=true; e.quebrado=true; e.vezes++;
      gastarRuido(COISA_CFG.verbos.forcar.ruido);
      const eco3=[['Cede com um estalo que a casa inteira ouve.','perigo']]
        .concat(renderAchado(c.dentro,coisaId));
      telaCoisa(coisaId,volta,eco3);
    }),{custo:COISA_CFG.verbos.forcar.d});

  /* ---- selar: permanente, e resolve a anomalia ancorada ---- */
  if(c.verbos.includes('selar')&&!e.selado){
    const falta=faltaPraSelar();
    botao(COISA_CFG.verbos.selar.n,acaoDia(COISA_CFG.verbos.selar.h,async()=>{
      if(!podeSelar()){ diz('Falta '+falta.join(' e ')+'.','perigo'); return volta(); }
      Object.keys(COISA_CFG.custoSelar).forEach(k=>{
        S.mat[k]=(S.mat[k]|0)-COISA_CFG.custoSelar[k];
      });
      e.selado=true; e.vezes++;
      gastarRuido(COISA_CFG.verbos.selar.ruido);
      diz('Você prega tábua por cima até não sobrar frincha.','bom');
      selarResolve(coisaId);
      volta();
    }),{custo:COISA_CFG.verbos.selar.d, falta:falta.join(' e ')});
  }
  botao('Voltar',()=>volta(),{cls:'prim'});
}

/* devolve o que DEVE ser dito depois do redesenho, em vez de falar
   agora e ser desbotado pelo `limpar()` que vem logo em seguida */
function renderAchado(a,coisaId){
  const eco=[];
  if(!a){ return [['Não tem nada.','fraco']]; }
  if(a.txt)eco.push([a.txt,'bom']);
  if(a.mat){
    darMat(a.mat,a.q||1);
    eco.push(['Deu pra tirar '+(a.q||1)+' de '+a.mat+'.','bom']);
  }
  /* o que voce mexe, a casa lembra (§60) */
  try{
    if(typeof lemAnotar==='function'){
      const c=coisaDe(coisaId);
      if(c)lemAnotar(c.onde,'objeto','FISICO');
    }
  }catch(e){}
  return eco;
}

/* selar o foco e a RESOLUCAO PERMANENTE: ela conta como metodo no §61
   (entao repetir demais tambem ensina a anomalia — selar nao escapa da
   regra), rende estudo, e encerra a anomalia ativa. */
function selarResolve(coisaId){
  const as=anomsNaCoisa(coisaId);
  try{
    if(typeof lemAnotar==='function'){
      const c=coisaDe(coisaId);
      if(c)lemAnotar(c.onde,'costura','FISICO');
    }
  }catch(e){}
  if(!as.length){
    diz('Não era o foco de nada. Mas agora não entra mais nada por aí.','sist');
    return 0;
  }
  as.forEach(a=>{
    const r=(typeof registroDe==='function')?registroDe(a):null;
    const nome=(r&&r.nome)||a;
    try{
      if(typeof dossiEstudar==='function')dossiEstudar(a,COISA_CFG.estudoPorSelar);
      if(typeof dossiUsou==='function')dossiUsou(a,'selar');
      if(typeof encerrarAtiva==='function')encerrarAtiva(a,'selada no foco');
    }catch(e){}
    diz(nome+' não tem mais por onde. Acabou, e acabou por causa disso.','bom');
    if(typeof anotar==='function')
      anotar('Selou o foco '+deNome(nome)+' em '+coisaDe(coisaId).n+'.');
  });
  /* o foco selado nao vale mais: a proxima anomalia procura outro */
  const F=focos();
  Object.keys(F).forEach(k=>{ if(F[k]===coisaId)delete F[k]; });
  if(typeof marcarSujo==='function')marcarSujo();
  return as.length;
}

/* `selar` entra no vocabulario de mutacao do §61: quem so sela tambem
   ensina. A anomalia que aprendeu contra selar volta pelo lado. */
if(typeof MUTACOES==='object'&&MUTACOES&&!MUTACOES.selar){
  MUTACOES.selar={
    fecha:'selar',
    nome:'aprendeu a contornar tábua',
    conta:'Ela mudou de foco antes de você pregar o último prego.',
    abre:'reparar',
    comoAbre:'O que muda de lugar deixa rastro, e rastro se conserta.',
    tell:{tipo:'foco_mudou',intensidade:.65,turnosAntes:2}
  };
}

/* ================= 6 · O GANCHO =================
   UM botao no menu do comodo. */
if(typeof menuComodo==='function'){
  const _mc=menuComodo;
  menuComodo=function(id){
    const r=_mc.apply(this,arguments);
    try{
      const c=(id==null?SALA:id|0);
      const lista=coisasDe(c);
      if(lista.length){
        const naoVistas=lista.filter(x=>!est(x.id).visto).length;
        botao('Olhar as coisas daqui',()=>telaCoisas(c,()=>menuComodo(c)),
          {custo:naoVistas?naoVistas+' que você nunca olhou':lista.length+' coisas'});
      }
    }catch(e){}
    return r;
  };
}

/* ================= 7 · MIGRACAO ================= */
function migrarCoisas(d){
  const out={};
  const v=(d&&d.coisas&&typeof d.coisas==='object')?d.coisas:null;
  if(v)Object.keys(v).forEach(k=>{
    if(!COISA_POR_ID[k])return;              /* coisa que nao existe mais */
    const x=v[k]||{};
    out[k]={visto:x.visto|0, aberto:!!x.aberto, movido:!!x.movido,
            selado:!!x.selado, quebrado:!!x.quebrado, vezes:x.vezes|0,
            achou:!!x.achou};
    Object.keys(x).forEach(c=>{ if(!(c in out[k]))out[k][c]=x[c]; });
  });
  return out;
}
function migrarFocos(d){
  const out={};
  const v=(d&&d.focos&&typeof d.focos==='object')?d.focos:null;
  if(v)Object.keys(v).forEach(k=>{
    if(v[k]===null||COISA_POR_ID[v[k]])out[k]=v[k];
  });
  return out;
}
if(typeof carregar==='function'){
  const _car2=carregar;
  carregar=function(){
    const r=_car2.apply(this,arguments);
    try{ S.coisas=migrarCoisas(S); S.focos=migrarFocos(S); }catch(e){}
    return r;
  };
}

/* ================= 8 · LEITURA DE FORA ================= */
function coisasEstado(){
  const C=coisas();
  const porComodo={};
  PLANTA.forEach(q=>{ porComodo[q.nome]=coisasDe(q.id).length; });
  const porCat={};
  COISAS.forEach(c=>{ porCat[c.cat]=(porCat[c.cat]||0)+1; });
  const verbos={};
  COISAS.forEach(c=>c.verbos.forEach(v=>{ verbos[v]=(verbos[v]||0)+1; }));
  return {
    cfg:COISA_CFG, total:COISAS.length, porComodo, porCat, verbos,
    mexidas:Object.keys(C).length,
    seladas:Object.keys(C).filter(k=>C[k].selado).length,
    focos:{...focos()}
  };
}
