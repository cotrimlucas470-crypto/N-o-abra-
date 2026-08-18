/* ================= §19 — A FICHA: ATRIBUTOS E CLASSES =================
   Dez atributos de 0 a 10, dez pontos livres, catorze ofícios. A regra
   que organiza tudo: a TELA NÃO CALCULA NADA. Ela pergunta ao jogo
   quanto vale cada coisa, no nível atual e no nível seguinte, e mostra
   a diferença. Texto e lógica não podem discordar porque só existe uma
   conta — `derivadas()`, aqui embaixo.

   O valor efetivo de um atributo é `investido + bônus do ofício`, com
   teto duro em 10. Nada passa de 10: nem ofício, nem equipamento, nem
   soma dos dois. A tela mostra as parcelas separadas justamente pra
   ficar claro de onde veio cada ponto.
   ===================================================================== */

/* ---------- os dez atributos ----------
   `porPonto` é a conta de cada nível. Todos usam retorno decrescente
   nos níveis altos (a raiz em `curva`), pra que ir de 8 pra 9 valha
   menos que ir de 1 pra 2 — senão só existe uma build boa. */

const FICHA_MAX=10, FICHA_PONTOS=10;

/* curva de retorno decrescente: n=0 dá 0, n=10 dá 1, e a subida é
   mais forte no começo. Centralizada aqui de propósito: mexer no
   equilíbrio geral do jogo é mexer nesta linha. */
function curva(n){ return Math.pow(trava(n,0,FICHA_MAX)/FICHA_MAX,0.72); }

const ATRIBUTOS={
 forca:{n:'Força',ord:1,
   d:'O que você levanta e o que você quebra. Peso nas costas e força no braço.',
   afeta:'carga · dano no corpo a corpo · arma pesada · resistir a empurrão'},
 velocidade:{n:'Velocidade',ord:2,
   d:'Correr é a saída mais usada deste jogo. Isto é o quanto ela funciona.',
   afeta:'corrida · arranque · abrir distância na perseguição'},
 destreza:{n:'Destreza',ord:3,
   d:'A mão. Mexer em coisa pequena, rápido, sem deixar cair.',
   afeta:'interação · sacar e guardar · recarga · mexer na mochila'},
 furtividade:{n:'Furtividade',ord:4,
   d:'Não é invisibilidade. É produzir menos rastro do que o normal.',
   afeta:'ruído do passo · rastro sonoro e visual · demora pra somarem você'},
 resistencia:{n:'Resistência',ord:5,
   d:'Quanto tempo o corpo aguenta antes de te entregar.',
   afeta:'fôlego · gasto ao correr e ao bater · perseguição longa'},
 vitalidade:{n:'Vitalidade',ord:6,
   d:'O quanto você aguenta apanhar e adoecer antes de parar.',
   afeta:'vida · gravidade da ferida · tolerância a doença'},
 percepcao:{n:'Percepção',ord:7,
   d:'Reparar no que está errado antes que o errado repare em você.',
   afeta:'notar ameaça · achar item bom · ouvir o que a casa faz'},
 pontaria:{n:'Pontaria',ord:8,
   d:'Acertar o que você mira. Nunca é garantido, nem no 10.',
   afeta:'dispersão · controle do recuo · firmar a mira · tiro longe'},
 sorte:{n:'Sorte',ord:9,
   d:'A margem das coisas. Empurra o acaso, não manda nele.',
   afeta:'o que aparece no saque · estado do que você acha · evento pequeno'},
 inteligencia:{n:'Inteligência',ord:10,
   d:'Entender a peça antes de forçar. Consertar em vez de improvisar.',
   afeta:'fabricação · reparo · manutenção de arma · aproveitar material'}
};
const ATRIB_IDS=Object.keys(ATRIBUTOS).sort((a,b)=>ATRIBUTOS[a].ord-ATRIBUTOS[b].ord);

/* ---------- os catorze ofícios ----------
   Cada um mexe em atributo E numa passiva que toca sistema de verdade.
   Nenhum é só bônus: todo `mais` tem um `menos` do lado. */
const CLASSES={
 sobrevivente:{n:'Sobrevivente',
   d:'Você já estava aqui antes de tudo desandar. Aguenta e repara em tudo, e nunca aprendeu a fazer nada direito.',
   mais:{resistencia:1,percepcao:1,sorte:1},
   menos:{inteligencia:1,pontaria:1},
   passiva:{id:'faro',n:'Faro de rua',
     d:'Locais visitados rendem 15% mais material: você sabe onde as pessoas escondem coisa.'},
   itens:['faca','lata','lata','garrafa'], veste:null},
 soldado:{n:'Soldado',
   d:'Treinado pra atirar e pra obedecer. As duas coisas te atrapalham aqui, em ordens diferentes.',
   mais:{pontaria:3,forca:1},
   menos:{furtividade:2},
   passiva:{id:'coronha',n:'Coronha firme',
     d:'Recuo 35% menor e recarga 20% mais rápida em qualquer arma de fogo.'},
   itens:['revolver','cartucho','cartucho','kit'], veste:'colete'},
 medico:{n:'Médico',
   d:'Sabe exatamente o que está acontecendo com o corpo de todo mundo. Inclusive com o seu.',
   mais:{inteligencia:3,percepcao:1},
   menos:{forca:2},
   passiva:{id:'mao-firme',n:'Mão firme',
     d:'Tratamento cura o dobro e gasta metade do remédio.'},
   itens:['kit','remedio','remedio','livro'], veste:null},
 mecanico:{n:'Mecânico',
   d:'O gerador é uma pessoa pra você. Sabe quando vai falhar pelo barulho.',
   mais:{inteligencia:2,forca:1,destreza:1},
   menos:{percepcao:1,furtividade:1},
   passiva:{id:'ouvido-de-motor',n:'Ouvido de motor',
     d:'O gerador gasta 25% menos diesel e avisa antes de quebrar.'},
   itens:['inglesa','alicate','fio','arame'], veste:'avental'},
 cacador:{n:'Caçador',
   d:'Passou a vida esperando bicho ficar parado. Agora o bicho espera você.',
   mais:{pontaria:2,percepcao:2,furtividade:1},
   menos:{inteligencia:1,forca:1},
   passiva:{id:'espera',n:'Espera',
     d:'Parado e agachado, seu rastro para de crescer por completo.'},
   itens:['espingarda','cartucho','faca'], veste:null},
 explorador:{n:'Explorador',
   d:'Conhece o mapa inteiro de cabeça e não confia em nenhum pedaço dele.',
   mais:{velocidade:2,resistencia:2},
   menos:{forca:1,pontaria:1},
   passiva:{id:'perna',n:'Perna boa',
     d:'Expedições custam 1 hora a menos e você volta com menos ferida.'},
   itens:['lanterna','pilha','garrafa','fruta'], veste:'jaqueta'},
 ladrao:{n:'Ladrão',
   d:'Entrava em casa dos outros antes disso ser sobre sobreviver. A prática serviu.',
   mais:{furtividade:3,destreza:2},
   menos:{vitalidade:2,forca:1},
   passiva:{id:'dedo-leve',n:'Dedo leve',
     d:'Vasculhar não faz barulho nenhum, e você acha o esconderijo dos outros.'},
   itens:['faca','chave','dinheiro','fenda'], veste:null},
 bombeiro:{n:'Bombeiro',
   d:'Entrar onde todo mundo está saindo. É a única coisa que você sabe fazer direito.',
   mais:{forca:3,resistencia:2},
   menos:{furtividade:3},
   passiva:{id:'arrombar',n:'Ombro',
   d:'Arromba porta emperrada sem ferramenta, e carrega gente ferida sem penalidade.'},
   itens:['machadinha','pa','kit'], veste:'avental'},
 policial:{n:'Policial',
   d:'A farda não vale mais nada. O treino de ler gente, vale.',
   mais:{pontaria:2,percepcao:2},
   menos:{sorte:2},
   passiva:{id:'ler-gente',n:'Ler gente',
     d:'Você vê a moral verdadeira de quem está no abrigo, e o infiltrado escorrega mais.'},
   itens:['revolver','cartucho','lanterna'], veste:'colete'},
 engenheiro:{n:'Engenheiro',
   d:'Desenha antes de fazer. Aqui isso é luxo, e você faz mesmo assim.',
   mais:{inteligencia:3,destreza:1},
   menos:{velocidade:2},
   passiva:{id:'projeto',n:'Projeto',
     d:'Fabricação custa 30% menos material e a bancada nasce um nível acima.'},
   itens:['serra','martelo','prego','tabua','tabua'], veste:null},
 seguranca:{n:'Segurança',
   d:'Vigiou prédio vazio a noite inteira por anos. A casa é um prédio vazio maior.',
   mais:{percepcao:2,vitalidade:1,forca:1},
   menos:{destreza:1,sorte:1},
   passiva:{id:'ronda',n:'Ronda',
     d:'A porta aguenta um encontro a mais, e você acorda antes de baterem.'},
   itens:['taco','lanterna','pilha'], veste:'colete'},
 paramedico:{n:'Paramédico',
   d:'Estabiliza e passa pro próximo. Não tem tempo de se apegar, e é assim que salva.',
   mais:{destreza:2,inteligencia:1,velocidade:1},
   menos:{forca:1,pontaria:1},
   passiva:{id:'triagem',n:'Triagem',
     d:'Ferida urgente para de piorar sozinha, e você trata alguém em metade do tempo.'},
   itens:['kit','remedio','garrafa','lona'], veste:null},
 tecnico:{n:'Técnico',
   d:'Conserta o que ninguém sabe abrir. Rádio, bomba d\'água, o que aparecer.',
   mais:{inteligencia:2,destreza:2},
   menos:{vitalidade:1,resistencia:1},
   passiva:{id:'gambiarra',n:'Gambiarra',
     d:'Reparo não encolhe o máximo da peça, e você conserta sem a ferramenta certa.'},
   itens:['fenda','alicate','fio','pilha'], veste:null},
 civil:{n:'Civil',
   d:'Não tinha ofício nenhum que servisse pra isto. Sobra espaço pra virar o que precisar.',
   mais:{},
   menos:{},
   passiva:{id:'sem-vicio',n:'Sem vício',
     d:'Dois pontos livres a mais na criação: nada em você foi treinado errado.'},
   itens:['lata','lata','pao','garrafa','faca'], veste:null}
};
const CLASSE_IDS=Object.keys(CLASSES);

/* ================= O ESTADO DA FICHA ================= */
function ficha(){
  if(!S.ficha||typeof S.ficha!=='object')S.ficha={classe:null,pontos:{},versao:1};
  if(!S.ficha.pontos||typeof S.ficha.pontos!=='object')S.ficha.pontos={};
  ATRIB_IDS.forEach(k=>{
    const v=S.ficha.pontos[k];
    /* save adulterado ou de versão velha não derruba o jogo nem
       entrega atributo grátis: qualquer coisa fora da faixa é presa */
    S.ficha.pontos[k]=(typeof v==='number'&&isFinite(v))?trava(Math.round(v),0,FICHA_MAX):0;
  });
  if(!CLASSES[S.ficha.classe])S.ficha.classe=S.ficha.classe===null?null:'civil';
  return S.ficha;
}
function classeAtual(){ const f=ficha(); return f.classe?CLASSES[f.classe]:null; }
function pontosTotais(){
  const c=classeAtual();
  return FICHA_PONTOS+((c&&c.passiva.id==='sem-vicio')?2:0);
}
function pontosGastos(){
  const f=ficha();
  return ATRIB_IDS.reduce((s,k)=>s+f.pontos[k],0);
}
function pontosLivres(){ return pontosTotais()-pontosGastos(); }

/* as três parcelas, separadas — é o que a tela mostra em colunas */
function parcelas(k){
  const f=ficha(), c=classeAtual();
  const investido=f.pontos[k]||0;
  const bonus=c?((c.mais&&c.mais[k])||0)-((c.menos&&c.menos[k])||0):0;
  /* teto duro: nada passa de 10, nem com ofício */
  const efetivo=trava(investido+bonus,0,FICHA_MAX);
  return {investido,bonus,efetivo,cortado:(investido+bonus)>FICHA_MAX};
}
function atrib(k){ return parcelas(k).efetivo; }

/* ================= AS DERIVADAS =================
   Uma função só, que devolve TODOS os números que o jogo usa. A tela
   de criação chama esta mesma função com uma ficha hipotética pra
   mostrar a prévia do próximo ponto — por isso ela aceita um override
   em vez de ler `S` direto. É o que impede o texto de mentir. */
function derivadas(over){
  const A={};
  ATRIB_IDS.forEach(k=>{ A[k]=over&&over[k]!=null?trava(over[k],0,FICHA_MAX):atrib(k); });
  const c=curva;
  return {
    /* FORÇA */
    carga:       +(24+20*c(A.forca)).toFixed(1),          /* kg nas costas */
    danoCorpo:   +(1+0.55*c(A.forca)).toFixed(3),         /* multiplicador */
    armaPesada:  +(1+0.40*c(A.forca)).toFixed(3),
    empurrao:    +(0.50*c(A.forca)).toFixed(3),
    penalPeso:   +(1-0.45*c(A.forca)).toFixed(3),
    /* VELOCIDADE */
    corrida:     +(1+0.45*c(A.velocidade)).toFixed(3),
    arranque:    +(1+0.60*c(A.velocidade)).toFixed(3),
    distancia:   +(0.55*c(A.velocidade)).toFixed(3),      /* abrir distância */
    /* DESTREZA */
    interacao:   +(1-0.40*c(A.destreza)).toFixed(3),      /* tempo, menor é melhor */
    sacar:       +(1-0.45*c(A.destreza)).toFixed(3),
    recarga:     +(1-0.42*c(A.destreza)).toFixed(3),
    /* FURTIVIDADE */
    ruidoPasso:  +(1-0.55*c(A.furtividade)).toFixed(3),
    rastro:      +(1-0.50*c(A.furtividade)).toFixed(3),
    suspeita:    +(1-0.45*c(A.furtividade)).toFixed(3),
    /* RESISTÊNCIA */
    folego:      Math.round(3+5*c(A.resistencia)),
    gastoCorrer: +(1-0.45*c(A.resistencia)).toFixed(3),
    gastoBater:  +(1-0.40*c(A.resistencia)).toFixed(3),
    /* VITALIDADE */
    vida:        Math.round(100+60*c(A.vitalidade)),
    gravidade:   +(1-0.35*c(A.vitalidade)).toFixed(3),
    tolerancia:  +(1-0.40*c(A.vitalidade)).toFixed(3),
    /* PERCEPÇÃO */
    notar:       +(0.65*c(A.percepcao)).toFixed(3),
    acharItem:   +(1+0.50*c(A.percepcao)).toFixed(3),
    ouvir:       +(1+0.60*c(A.percepcao)).toFixed(3),
    /* PONTARIA */
    dispersao:   +(1-0.55*c(A.pontaria)).toFixed(3),
    recuo:       +(1-0.50*c(A.pontaria)).toFixed(3),
    firmar:      +(1-0.45*c(A.pontaria)).toFixed(3),
    /* teto de acerto: nem o 10 acerta sempre */
    acertoMax:   +(0.55+0.35*c(A.pontaria)).toFixed(3),
    /* SORTE */
    loot:        +(1+0.35*c(A.sorte)).toFixed(3),
    condicao:    +(1+0.30*c(A.sorte)).toFixed(3),
    evento:      +(0.28*c(A.sorte)).toFixed(3),
    /* INTELIGÊNCIA */
    fabricar:    +(1-0.35*c(A.inteligencia)).toFixed(3),
    reparo:      +(1+0.55*c(A.inteligencia)).toFixed(3),
    manutencao:  +(1+0.50*c(A.inteligencia)).toFixed(3),
    aproveitar:  +(1+0.40*c(A.inteligencia)).toFixed(3)
  };
}

/* a prévia de um ponto: pergunta ao jogo o valor agora e o valor com
   um ponto a mais, e devolve as linhas que MUDARAM. Nada é escrito à
   mão, então nenhuma linha pode discordar da lógica. */
const ROTULOS={
  carga:['Carga máxima',' kg'], danoCorpo:['Dano corpo a corpo','×'],
  armaPesada:['Eficiência com arma pesada','×'], empurrao:['Resistir a empurrão','%'],
  penalPeso:['Penalidade de excesso de peso','×'],
  corrida:['Velocidade de corrida','×'], arranque:['Aceleração','×'],
  distancia:['Abrir distância na fuga','%'],
  interacao:['Tempo de interação','×'], sacar:['Tempo de sacar e guardar','×'],
  recarga:['Tempo de recarga','×'],
  ruidoPasso:['Ruído do passo','×'], rastro:['Rastro deixado','×'],
  suspeita:['Velocidade da suspeita','×'],
  folego:['Fôlego',''], gastoCorrer:['Gasto ao correr','×'], gastoBater:['Gasto ao bater','×'],
  vida:['Vida máxima',''], gravidade:['Gravidade da ferida','×'],
  tolerancia:['Tolerância a doença','×'],
  notar:['Chance de notar ameaça','%'], acharItem:['Achar item bom','×'],
  ouvir:['Alcance do que você ouve','×'],
  dispersao:['Dispersão do tiro','×'], recuo:['Recuo','×'],
  firmar:['Tempo pra firmar a mira','×'], acertoMax:['Teto de acerto','%'],
  loot:['Qualidade do saque','×'], condicao:['Estado do que você acha','×'],
  evento:['Sorte em evento pequeno','%'],
  fabricar:['Material pra fabricar','×'], reparo:['Rendimento do reparo','×'],
  manutencao:['Manutenção de arma','×'], aproveitar:['Aproveitar recurso','×']
};
function previaPonto(k,delta){
  const base={}; ATRIB_IDS.forEach(x=>base[x]=atrib(x));
  const agora=derivadas(base);
  const alvo={...base};
  alvo[k]=trava(base[k]+(delta==null?1:delta),0,FICHA_MAX);
  if(alvo[k]===base[k])return [];
  const dep=derivadas(alvo);
  const fmt=(v,suf)=>suf==='%'?Math.round(v*100)+'%':(suf===' kg'?v.toFixed(0)+' kg':(suf==='×'?v.toFixed(2)+'×':String(v)));
  return Object.keys(ROTULOS)
    .filter(campo=>agora[campo]!==dep[campo])
    .map(campo=>({campo, nome:ROTULOS[campo][0],
      de:fmt(agora[campo],ROTULOS[campo][1]), para:fmt(dep[campo],ROTULOS[campo][1])}));
}

/* ================= INTEGRAÇÃO COM O JOGO =================
   Cada derivada abaixo entra num sistema que já existia. Sem isto a
   ficha seria decoração — e o pedido é explícito em não aceitar
   modificador cosmético. */

/* FORÇA → carga. `mochilaInfo` já é embrulhada pelo §14; entramos
   depois dela, então o veículo continua somando por cima. */
if(typeof mochilaInfo==='function'){
  const _mi=mochilaInfo;
  mochilaInfo=function(){
    const inf=_mi.apply(this,arguments);
    const D=derivadas();
    /* a base do §14 é 24 kg de mochila comum; a força desloca isso */
    return {...inf, kg:+(inf.kg*(D.carga/24)).toFixed(1)};
  };
}
/* FORÇA → dano no corpo a corpo. Entra DEPOIS do §15, então o
   desgaste da peça continua valendo e os dois se multiplicam. */
if(typeof melhorArma==='function'){
  const _ma=melhorArma;
  melhorArma=function(){
    const a=_ma.apply(this,arguments);
    if(!a)return a;
    const D=derivadas();
    const pesada=(a._danoBase||a.dano)>=3;
    const m=pesada?D.armaPesada:D.danoCorpo;
    return {...a, dano:+(a.dano*m).toFixed(2), _ficha:m};
  };
}
/* FURTIVIDADE → rastro. O §9 soma rastros; a furtividade os encolhe
   antes da conta, sem nunca zerar: quem não produz nada ainda tem
   PRESENÇA, e isso é regra do §9 que não se mexe aqui. */
if(typeof v9Rastros==='function'){
  const _vr=v9Rastros;
  window.v9Rastros=function(){
    const t=_vr.apply(this,arguments);
    const D=derivadas();
    return t.map(r=>({...r, p:r.p*(r.k==='PRESENCA'?1:D.rastro)}));
  };
}
/* FURTIVIDADE → ruído do passo, e PESO → ruído a mais.
   Excesso de peso é o contrapeso da força: quem carrega demais faz
   barulho, e a força alivia mas não anula. */
function ruidoDoPasso(base){
  const D=derivadas();
  let v=(base==null?1:base)*D.ruidoPasso;
  const inf=(typeof mochilaInfo==='function')?mochilaInfo():{kg:24};
  const p=(typeof pesoAtual==='function')?pesoAtual():0;
  const excesso=Math.max(0,p/Math.max(1,inf.kg)-0.75);
  v*=1+excesso*1.4*D.penalPeso;
  return +v.toFixed(3);
}
/* VELOCIDADE e RESISTÊNCIA → fuga. `pesoFerido` é o número que o jogo
   já usa como "o quanto tudo que exige corpo fica pior"; a ficha entra
   nele em vez de criar um segundo canal. */
if(typeof pesoFerido==='function'){
  const _pf=pesoFerido;
  window.pesoFerido=function(){
    const base=_pf.apply(this,arguments);
    const D=derivadas();
    /* velocidade e resistência aliviam; nunca abaixo de zero */
    return trava(base*(1-D.distancia*.55)*(2-D.gastoCorrer)/1,0,.55);
  };
}
/* VITALIDADE → gravidade da ferida. Entra no `ferirPor`, depois do
   §15 (armadura), então armadura e vitalidade se somam na ordem certa. */
if(typeof ferirPor==='function'){
  const _fp=ferirPor;
  ferirPor=function(fonte,alvo,nome){
    const D=derivadas();
    const eu=!alvo||alvo===S;
    /* vitalidade alta às vezes transforma ferida em susto */
    if(eu&&D.gravidade<1&&chance((1-D.gravidade)*.5)){
      if(typeof diz==='function')diz('Dói, mas não abriu. Você aguenta.','fraco');
      return null;
    }
    return _fp.call(this,fonte,alvo,nome);
  };
}
/* SORTE e PERCEPÇÃO → saque. O §15 tem `podeReparar`/`reparar`; aqui
   o que muda é o quanto vem e em que estado. */
if(typeof acharComida==='function'){
  const _ac=acharComida;
  acharComida=function(q,mult){
    const D=derivadas();
    /* sorte reduz a fração estragada, com teto: nunca zera */
    const r=_ac.call(this,q,(mult==null?1:mult)/trava(D.condicao,1,1.3));
    return r;
  };
}
/* INTELIGÊNCIA → reparo. O §15 devolve `ganho` fixo; multiplicamos. */
if(typeof reparar==='function'){
  const _rp=reparar;
  reparar=function(id,quantidade){
    const D=derivadas();
    const c=classeAtual();
    const r=_rp.call(this,id,Math.round((quantidade||40)*D.reparo));
    /* passiva do Técnico: o teto não encolhe */
    if(r&&c&&c.passiva.id==='gambiarra'&&typeof peca==='function'){
      const p=peca(id); if(p)p.durMax=Math.min(100,p.durMax+2);
    }
    return r;
  };
}

/* ================= A TELA DE CRIAÇÃO ================= */
function estiloFicha(){
  if(document.getElementById('css-ficha'))return;
  const s=document.createElement('style');
  s.id='css-ficha';
  s.textContent=`
#ficha{position:fixed;inset:0;z-index:90;background:var(--breu);color:var(--papel);
  display:flex;flex-direction:column;font-family:var(--corpo);overflow:hidden}
#ficha .topo{padding:12px 14px 8px;border-bottom:1px solid #2A232E;
  background:linear-gradient(180deg,#1B1721,#0F0D13);flex:0 0 auto}
#ficha h2{font-family:var(--display);font-size:17px;font-weight:400;letter-spacing:.2em;
  text-transform:uppercase;color:var(--mofo)}
#ficha .pts{font-family:var(--mostrador);font-size:12px;color:var(--lampiao);margin-top:5px}
#ficha .pts b{font-size:16px}
#ficha .pts.zero{color:var(--mofo)}
#ficha .abas{display:flex;gap:4px;margin-top:9px}
#ficha .aba{flex:1;font-family:var(--mostrador);font-size:10px;letter-spacing:.12em;
  text-transform:uppercase;padding:7px 4px;border:1px solid #2A232E;background:none;
  color:var(--mofo);cursor:pointer}
#ficha .aba.on{color:var(--lampiao);border-color:var(--lampiao)}
#ficha .corpo{flex:1;overflow-y:auto;padding:10px 12px 14px;overscroll-behavior:contain}
#ficha .cl{width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #1E1922;
  padding:9px 7px;color:var(--papel);cursor:pointer;font-family:var(--corpo);font-size:14px}
#ficha .cl.on{background:rgba(201,162,39,.10);border-left:2px solid var(--lampiao)}
#ficha .cl b{font-family:var(--display);font-size:16px;font-weight:400;display:block}
#ficha .cl span{font-size:12.5px;color:#A99F94;line-height:1.35;display:block;margin-top:2px}
#ficha .cl i{font-family:var(--mostrador);font-size:9.5px;font-style:normal;
  letter-spacing:.06em;display:block;margin-top:4px}
#ficha .mais{color:#6E8C55}#ficha .menos{color:#B84B33}
#ficha .at{display:grid;grid-template-columns:1fr auto auto auto;gap:5px 7px;
  align-items:center;padding:8px 4px;border-bottom:1px solid #1E1922}
#ficha .at .nm{font-size:14.5px}
#ficha .at .nm small{display:block;font-family:var(--mostrador);font-size:9px;
  color:var(--mofo);letter-spacing:.05em;text-transform:uppercase;margin-top:2px}
#ficha .at .val{font-family:var(--mostrador);font-size:17px;color:var(--lampiao);
  min-width:56px;text-align:right}
#ficha .at .val u{text-decoration:none;font-size:10px;color:var(--mofo)}
#ficha .at button{width:34px;height:34px;border:1px solid #2A232E;background:#16131A;
  color:var(--papel);font-size:18px;cursor:pointer;line-height:1;padding:0}
#ficha .at button:disabled{opacity:.28;cursor:default}
#ficha .prev{grid-column:1/-1;font-family:var(--mostrador);font-size:10px;
  color:var(--mofo);line-height:1.6;padding:2px 0 0}
#ficha .prev b{color:#6E8C55;font-weight:400}
#ficha .aviso-f{color:#E0703F;font-family:var(--mostrador);font-size:10.5px;
  min-height:14px;padding:4px 0}
#ficha .res{border:1px solid #2A232E;padding:9px 11px;margin-top:10px}
#ficha .res h3{font-family:var(--mostrador);font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--mofo);margin-bottom:6px}
#ficha .res div{font-size:13px;line-height:1.55}
#ficha .res em{color:var(--mofo);font-style:normal}
#ficha .rodape{flex:0 0 auto;display:flex;gap:6px;padding:9px 12px;
  border-top:1px solid #2A232E;background:#0F0D13}
#ficha .rodape button{flex:1;background:#16131A;border:1px solid #2A232E;color:var(--papel);
  font-family:var(--corpo);font-size:14px;padding:11px 6px;cursor:pointer}
#ficha .rodape button.chave{border-color:var(--lampiao);color:var(--lampiao)}
#ficha .rodape button:disabled{opacity:.35;cursor:default}`;
  document.head.appendChild(s);
}

let _fichaAba='classe', _fichaFoco=null;

function telaFicha(aoConfirmar){
  estiloFicha();
  const f=ficha();
  if(!f.classe)f.classe='sobrevivente';
  const el=document.createElement('div');
  el.id='ficha';
  el.innerHTML=`<div class="topo">
      <h2>Quem você era</h2>
      <div class="pts"></div>
      <div class="abas">
        <button class="aba" data-a="classe">ofício</button>
        <button class="aba" data-a="atributos">atributos</button>
        <button class="aba" data-a="resumo">ficha</button>
      </div>
      <div class="aviso-f"></div>
    </div>
    <div class="corpo"></div>
    <div class="rodape">
      <button class="zerar">Redefinir</button>
      <button class="ok chave">Trancar a porta</button>
    </div>`;
  document.body.appendChild(el);

  const corpo=el.querySelector('.corpo');
  const avisar=t=>{ el.querySelector('.aviso-f').textContent=t||''; };

  function pintarTopo(){
    const l=pontosLivres();
    const p=el.querySelector('.pts');
    p.className='pts'+(l===0?' zero':'');
    p.innerHTML=`<b>${l}</b> de ${pontosTotais()} pontos livres`;
    el.querySelector('.ok').disabled=(l!==0);
    el.querySelectorAll('.aba').forEach(a=>a.classList.toggle('on',a.dataset.a===_fichaAba));
  }

  function pintarClasses(){
    corpo.innerHTML='';
    CLASSE_IDS.forEach(id=>{
      const C=CLASSES[id];
      const b=document.createElement('button');
      b.className='cl'+(ficha().classe===id?' on':'');
      const mais=Object.keys(C.mais||{}).map(k=>`+${C.mais[k]} ${ATRIBUTOS[k].n}`).join(' · ');
      const menos=Object.keys(C.menos||{}).map(k=>`−${C.menos[k]} ${ATRIBUTOS[k].n}`).join(' · ');
      const itens=(C.itens||[]).map(i=>(CATALOGO[i]||{n:i}).n.toLowerCase()).join(', ');
      b.innerHTML=`<b>${esc(C.n)}</b><span>${esc(C.d)}</span>`
        +`<i class="mais">${mais?esc(mais):'sem bônus de atributo'}</i>`
        +(menos?`<i class="menos">${esc(menos)}</i>`:'')
        +`<i style="color:var(--lampiao)">passiva · ${esc(C.passiva.n)}: ${esc(C.passiva.d)}</i>`
        +`<i style="color:var(--mofo)">começa com: ${esc(itens)}${C.veste?' · vestindo '+esc((CATALOGO[C.veste]||{n:C.veste}).n.toLowerCase()):''}</i>`;
      b.onclick=()=>{
        ficha().classe=id;
        if(typeof amToca==='function')amToca('ui_clique');
        /* trocar de ofício pode estourar o teto de um atributo: o
           investimento excedente volta pro bolso em vez de sumir */
        devolverExcesso();
        pintar();
      };
      corpo.appendChild(b);
    });
  }

  function pintarAtributos(){
    corpo.innerHTML='';
    ATRIB_IDS.forEach(k=>{
      const P=parcelas(k), A=ATRIBUTOS[k];
      const linha=document.createElement('div');
      linha.className='at';
      const podeMais=pontosLivres()>0 && P.investido<FICHA_MAX && P.efetivo<FICHA_MAX;
      const podeMenos=P.investido>0;
      linha.innerHTML=`
        <div class="nm">${esc(A.n)}<small>${esc(A.afeta)}</small></div>
        <div class="val">${P.efetivo}<u>/10</u><br><u>${P.investido} inv${P.bonus?(P.bonus>0?' +'+P.bonus:' '+P.bonus)+' ofício':''}</u></div>
        <button class="menos" ${podeMenos?'':'disabled'}>−</button>
        <button class="mais" ${podeMais?'':'disabled'}>+</button>`;
      const prev=document.createElement('div');
      prev.className='prev';
      if(_fichaFoco===k){
        const linhas=previaPonto(k,1);
        prev.innerHTML=linhas.length
          ? 'o próximo ponto: '+linhas.map(x=>`${esc(x.nome)} <b>${esc(x.de)} → ${esc(x.para)}</b>`).join(' · ')
          : (P.efetivo>=FICHA_MAX?'no teto: 10 é o máximo.':'sem mudança.');
      }else{
        prev.innerHTML=esc(A.d);
      }
      linha.appendChild(prev);
      linha.querySelector('.mais').onclick=()=>{
        _fichaFoco=k;
        if(pontosLivres()<=0)return avisar('Não sobrou ponto pra gastar.');
        if(P.efetivo>=FICHA_MAX)return avisar(`${A.n} já está no teto de ${FICHA_MAX}.`);
        ficha().pontos[k]++;
        if(typeof amToca==='function')amToca('ui_clique');
        avisar(''); pintar();
      };
      linha.querySelector('.menos').onclick=()=>{
        _fichaFoco=k;
        if(ficha().pontos[k]<=0)return avisar('Não há ponto seu pra tirar daqui.');
        ficha().pontos[k]--;
        if(typeof amToca==='function')amToca('ui_clique');
        avisar(''); pintar();
      };
      linha.querySelector('.nm').onclick=()=>{ _fichaFoco=_fichaFoco===k?null:k; pintar(); };
      corpo.appendChild(linha);
    });
  }

  function pintarResumo(){
    const C=classeAtual(), D=derivadas();
    corpo.innerHTML='';
    const bloco=(titulo,linhas)=>{
      const d=document.createElement('div');
      d.className='res';
      d.innerHTML=`<h3>${esc(titulo)}</h3>`+linhas.map(l=>`<div>${l}</div>`).join('');
      corpo.appendChild(d);
    };
    bloco('ofício',[
      `<b>${esc(C.n)}</b>`,
      `<em>${esc(C.d)}</em>`,
      `<em>passiva:</em> ${esc(C.passiva.n)} — ${esc(C.passiva.d)}`
    ]);
    bloco('atributos',ATRIB_IDS.map(k=>{
      const P=parcelas(k);
      return `${esc(ATRIBUTOS[k].n)}: <b>${P.efetivo}</b> <em>(${P.investido} seu`
        +(P.bonus?`, ${P.bonus>0?'+':''}${P.bonus} do ofício`:'')
        +(P.cortado?', cortado no teto':'')+`)</em>`;
    }));
    bloco('o que isso vale',[
      `Carga máxima: <b>${D.carga} kg</b>`,
      `Vida: <b>${D.vida}</b> · Fôlego: <b>${D.folego}</b>`,
      `Dano no corpo a corpo: <b>${D.danoCorpo.toFixed(2)}×</b>`,
      `Rastro deixado: <b>${Math.round(D.rastro*100)}%</b> do normal`,
      `Teto de acerto com arma de fogo: <b>${Math.round(D.acertoMax*100)}%</b>`,
      `Recarga: <b>${D.recarga.toFixed(2)}×</b> · Reparo: <b>${D.reparo.toFixed(2)}×</b>`
    ]);
    bloco('começa com',[
      (C.itens||[]).map(i=>esc((CATALOGO[i]||{n:i}).n)).join('<br>')
      +(C.veste?'<br><em>vestindo</em> '+esc((CATALOGO[C.veste]||{n:C.veste}).n):'')
    ]);
  }

  function pintar(){
    pintarTopo();
    if(_fichaAba==='classe')pintarClasses();
    else if(_fichaAba==='atributos')pintarAtributos();
    else pintarResumo();
  }

  el.querySelectorAll('.aba').forEach(a=>a.onclick=()=>{ _fichaAba=a.dataset.a; avisar(''); pintar(); });
  el.querySelector('.zerar').onclick=()=>{
    ATRIB_IDS.forEach(k=>ficha().pontos[k]=0);
    avisar('Distribuição zerada.'); pintar();
  };
  el.querySelector('.ok').onclick=()=>{
    const erro=validarFicha();
    if(erro)return avisar(erro);
    aplicarFicha();
    el.remove();
    if(typeof aoConfirmar==='function')aoConfirmar();
  };
  /* teclado: setas navegam as abas, Enter confirma quando dá */
  el.tabIndex=0;
  el.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&pontosLivres()===0){ el.querySelector('.ok').click(); }
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
      const ordem=['classe','atributos','resumo'];
      const i=ordem.indexOf(_fichaAba);
      _fichaAba=ordem[trava(i+(e.key==='ArrowRight'?1:-1),0,2)];
      pintar();
    }
  });
  setTimeout(()=>el.focus(),50);
  _fichaAba='classe'; _fichaFoco=null;
  pintar();
}

/* pontos que passaram do teto por causa do ofício voltam pro bolso */
function devolverExcesso(){
  const f=ficha();
  ATRIB_IDS.forEach(k=>{
    const c=classeAtual();
    const bonus=c?((c.mais&&c.mais[k])||0)-((c.menos&&c.menos[k])||0):0;
    const maxInv=trava(FICHA_MAX-Math.max(0,bonus),0,FICHA_MAX);
    if(f.pontos[k]>maxInv)f.pontos[k]=maxInv;
  });
  /* e se o total gastou mais do que existe (ofício com menos pontos),
     tira do maior até caber */
  let guarda=0;
  while(pontosLivres()<0&&guarda++<100){
    const maior=ATRIB_IDS.slice().sort((a,b)=>f.pontos[b]-f.pontos[a])[0];
    if(f.pontos[maior]<=0)break;
    f.pontos[maior]--;
  }
}

/* a validação que o botão de confirmar usa. Devolve a mensagem do
   problema, ou '' quando está tudo certo. */
function validarFicha(){
  const f=ficha();
  if(!CLASSES[f.classe])return 'Escolha um ofício.';
  for(const k of ATRIB_IDS){
    const v=f.pontos[k];
    if(typeof v!=='number'||!isFinite(v))return `Valor inválido em ${ATRIBUTOS[k].n}.`;
    if(v<0)return `${ATRIBUTOS[k].n} não pode ser negativo.`;
    if(v>FICHA_MAX)return `${ATRIBUTOS[k].n} passa do teto de ${FICHA_MAX}.`;
    if(parcelas(k).efetivo>FICHA_MAX)return `${ATRIBUTOS[k].n} passa de ${FICHA_MAX} com o ofício.`;
  }
  const g=pontosGastos(), t=pontosTotais();
  if(g>t)return `Você gastou ${g} de ${t} pontos.`;
  if(g<t)return `Ainda sobram ${t-g} pontos pra gastar.`;
  return '';
}

/* aplica a ficha ao jogo: itens iniciais, roupa e derivadas */
function aplicarFicha(){
  const C=classeAtual();
  if(!C)return;
  const f=ficha();
  if(f.aplicada)return;              /* nunca duas vezes: duplicaria item */
  f.aplicada=true;
  (C.itens||[]).forEach(id=>{
    if(!CATALOGO[id])return;
    const e=CATALOGO[id];
    if(e.cat==='armadura'){
      S.armaduras=S.armaduras||[];
      if(!S.armaduras.includes(id))S.armaduras.push(id);
      return;
    }
    if(typeof guardar==='function')guardar(id,1);
  });
  if(C.veste&&CATALOGO[C.veste]){
    S.armaduras=S.armaduras||[];
    if(!S.armaduras.includes(C.veste))S.armaduras.push(C.veste);
    S.armadura=C.veste;
  }
  /* a passiva do Engenheiro nasce com a bancada um nível acima */
  if(C.passiva.id==='projeto')S.oficinaNivel=Math.max(S.oficinaNivel||0,1);
  if(typeof sincronizarEfeitos==='function')sincronizarEfeitos();
}

/* ---------- entra no começo do jogo ----------
   `pedirNome` é o último passo antes do jogo começar. A ficha entra
   entre o nome e a abertura: depois de dizer quem você é, antes de
   trancar a porta pela primeira vez. */
/* Interceptar em FASE DE CAPTURA, e não embrulhando `pedirNome`.
   O embrulho parecia certo e não funcionava: o `onclick` que o
   original grava no `#go` continuava valendo, porque a tela é montada
   por `innerHTML` e o handler é atribuído lá dentro, depois. Captura
   no documento não depende de ordem nem de binding — o clique passa
   por aqui antes de chegar no botão, e `stopImmediatePropagation`
   segura o handler original até a ficha ser confirmada. */
let _fichaFeita=false;
function abrirFichaAntesDeComecar(seguir){
  if(_fichaFeita)return false;
  const nm=document.getElementById('nm');
  S.nomeJogador=((nm&&nm.value)||'Você').trim().slice(0,14);
  S.ficha={classe:'sobrevivente',pontos:{},versao:1};   /* limpa a cada jogo novo */
  telaFicha(()=>{ _fichaFeita=true; seguir(); });
  return true;
}
document.addEventListener('click',ev=>{
  const alvo=ev.target;
  const go=alvo&&alvo.closest?alvo.closest('#go'):null;
  if(!go||_fichaFeita||document.getElementById('ficha'))return;
  if(abrirFichaAntesDeComecar(()=>go.click())){
    ev.preventDefault();
    ev.stopImmediatePropagation();
  }
},true);
/* o original também entra com Enter no campo do nome */
document.addEventListener('keydown',ev=>{
  if(ev.key!=='Enter')return;
  const nm=document.getElementById('nm');
  if(!nm||document.activeElement!==nm||_fichaFeita||document.getElementById('ficha'))return;
  const go=document.getElementById('go');
  if(!go)return;
  if(abrirFichaAntesDeComecar(()=>go.click())){
    ev.preventDefault();
    ev.stopImmediatePropagation();
  }
},true);

/* ---------- persistência ----------
   `carregar` do v48 copia qualquer campo que ache, então basta gravar.
   Save velho, sem ficha, entra com ficha zerada e Civil — o jogo roda
   igual, e é isso que migração segura significa aqui. */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      const d=JSON.parse(localStorage.getItem(CHAVE)||'{}');
      d.ficha=S.ficha;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){}
  };
}
if(typeof carregar==='function'){
  const _cr=carregar;
  carregar=function(){
    const r=_cr.apply(this,arguments);
    if(r){
      /* Migração de save anterior à v50. Testar só `!S.ficha` não
         bastava: o bloco cria `S.ficha` vazia ao carregar, então o
         objeto SEMPRE existe e a migração nunca disparava — o jogo
         ficava sem ofício nenhum. O que decide é haver classe válida. */
      if(!S.ficha||typeof S.ficha!=='object'||!CLASSES[S.ficha.classe]){
        S.ficha={classe:'civil',pontos:{},versao:1,aplicada:true};
        /* `aplicada:true` de propósito: save antigo já tem os itens
           que juntou, e não pode ganhar kit inicial de brinde agora */
      }
      ficha();                        /* prende valores fora da faixa */
    }
    return r;
  };
}

/* atalho de leitura pro resto do jogo e pros testes */
function fichaEstado(){
  const f=ficha(), C=classeAtual();
  return {classe:f.classe, classeNome:C?C.n:null, passiva:C?C.passiva.id:null,
    pontos:{...f.pontos}, gastos:pontosGastos(), livres:pontosLivres(),
    total:pontosTotais(), aplicada:!!f.aplicada,
    efetivos:Object.fromEntries(ATRIB_IDS.map(k=>[k,atrib(k)])),
    parcelas:Object.fromEntries(ATRIB_IDS.map(k=>[k,parcelas(k)])),
    derivadas:derivadas(), valido:validarFicha()};
}

S.ficha=S.ficha||{classe:null,pontos:{},versao:1};
