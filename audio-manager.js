/* ================= AUDIO MANAGER — PRIORIDADE 1 DO PACOTE =================
   O pacote pede um gerenciador central sem reescrever a arquitetura. Então
   isto é uma camada POR CIMA do que já existe, não no lugar dele.

   O jogo já tem um AudioContext único (`A.ctx`), um barramento seco/molhado
   e uma cadeia de saída da v48 que foi medida e afinada: ganho de
   compensação, limitador e um teto `tanh` em 0,95. Reescrever isso jogaria
   fora a única parte do áudio que tem número em cima. Os seis canais do
   pacote entram ANTES dessa cadeia — controle de categoria de graça,
   mixagem preservada.

     MASTER ─┬─ MUSIC ─────┐
             ├─ AMBIENCE ──┤
             ├─ SFX ───────┼─→ A.master → ganho → limitador → teto → saída
             ├─ HORROR ────┤
             └─ UI ────────┘

   Sobre os 80 slots do manifesto: o pacote não traz os arquivos, e diz
   explicitamente para não embutir dezenas de base64 no HTML. Então cada
   slot tem duas formas de existir — o arquivo em `audio/`, carregado sob
   demanda, ou o som que o jogo já sintetiza. Slot sem nenhum dos dois não
   quebra nada: registra a falta e segue. É isso que faz o sistema estar
   vivo hoje, com zero arquivo baixado, e melhorar sozinho conforme você
   for baixando.
   ========================================================================= */

const AM_CANAIS=['MUSIC','AMBIENCE','SFX','HORROR','UI'];

/* ---------- a régua da mixagem ----------
   Os canais existiam desde a fase 1, mas não governavam nada: a síntese
   do v48 fala direto com `A.seco`, e como não há arquivo baixado, TUDO
   que o jogo toca hoje passava por fora do mixer. Medido no `A.master`,
   com o resto em silêncio, o resultado era 28 dB de espalhamento com a
   batida na porta em +1,2 dBFS — estourando — e o clique de UI e os
   leitos de ambiente enterrados no piso de ruído.

   Agora são três números por som, e cada um responde uma pergunta:
     AM_DB    — até onde o canal inteiro pode ir
     AM_BRUTO — o quanto aquela síntese sai alta por acidente
     AM_NIVEL — o quanto aquele som DEVE tocar dentro do canal

   O teto de canal é o alvo do som mais alto de cada família: susto em
   -8, SFX importante em -10, UI em -18, leito em -22. Os quatro ficam
   dentro das faixas que o pacote especificou na fase 1 (-22 a -16
   ambiente, -24 a -14 música, -10 a -4 SFX, -24 a -8 horror) — o
   primeiro corte desta fase tinha posto SFX em -11 e HORROR em -6, que
   soava bem e furava a especificação nas duas pontas. Como o trim de
   cada som só depende de AM_NIVEL e AM_BRUTO, mover o teto do canal
   desloca a família inteira junto e não desmancha nenhuma relação. */
const AM_DB={MUSIC:-18, AMBIENCE:-22, SFX:-10, HORROR:-8, UI:-18};
const dbParaGanho=(db)=>Math.pow(10,db/20);

/* Pico bruto de cada síntese, medido no A.master com tudo o mais em
   silêncio: 3 tomadas, o maior valor. Sem esta régua não dá pra dizer
   "este som toca a -15 dB", porque cada síntese foi escrita numa época
   e sai num nível diferente por acaso, não por decisão.

   "Tudo o mais em silêncio" é literal e custou caro: enquanto o leito
   de vento da casa e o `agendarInquietacao` (que joga estalo, grilo ou
   gotejo a cada 1,2 s) continuavam correndo, a mesma medida dava
   valores diferentes a cada rodada e a correção oscilava sem convergir.
   Com eles parados, o piso cai de -28 para -42 dBFS e o número para de
   se mexer. Quem refizer estes valores tem de parar os dois. */
const AM_BRUTO={
  /* impactos e portas — `porta_batida` já é o valor DEPOIS do freio de
     0,55 que `batida` leva lá embaixo, senão o trim devolvia pela outra
     porta o estouro que o freio tirou */
  porta_batida:0.395, impacto_raro:0.239, gerador_motor:0.449,
  trovao_perto:0.563, trovao_longe:0.193,
  metal_cai:0.307,    martelo:0.312,
  porta_fecha:0.240,  porta_abre:0.230,   porta_maçaneta:0.137,
  piso_range:0.171,
  ui_descoberta:0.137, ui_erro:0.143,     ui_clique:0.141,
  agua_corre:0.044,   estalo_casa:0.056,  folhas:0.025,
  sussurro_raro:0.010,
  /* leitos: medidos isolados, ligados direto no master e com o piso da
     casa descontado. Pela cadeia normal eles não dão pra medir — o
     diretor de ambiente desliga a chuva no meio da tomada, e o `amDuck`
     reescreve o ganho do canal AMBIENCE por baixo da medição. */
  vento:0.987, drone_baixo:1.300, chuva_pesada:0.646, chuva_leve:0.493,
  calha_agua:0.224, insetos:0.080, passaros:0.056
};

/* Quanto cada som toca DENTRO do canal, em dB abaixo do teto dele.
   É aqui que mora a intenção: a batida na porta é o susto e fica no
   teto do HORROR; o estalo da casa é mobília e fica 12 dB abaixo, no
   mesmo canal, sem competir com ela. */
const AM_NIVEL={
  /* HORROR (teto -6) */
  porta_batida:0, impacto_raro:0, trovao_perto:-2, sussurro_raro:-10,
  trovao_longe:-10, estalo_casa:-12, drone_baixo:-18,
  /* SFX (teto -11) */
  martelo:0, metal_cai:-1, porta_abre:-2, porta_fecha:-2,
  porta_maçaneta:-4, piso_range:-4, folhas:-6, agua_corre:-6,
  /* UI (teto -18) */
  ui_clique:0, ui_erro:0, ui_descoberta:1,
  /* AMBIENCE (teto -22) */
  chuva_leve:0, chuva_pesada:3, vento:-2, passaros:-3, insetos:-3,
  calha_agua:-4,
  /* O gerador toca o tempo todo, e é justamente por isso que ele NÃO
     pode competir com o resto. A primeira versão o pôs 6 dB acima do
     teto do canal pra igualar o motor sintetizado antigo — medido,
     dava -16,3 dBFS de pico, dez decibéis acima da chuva, e dominava
     a casa inteira. Agora fica abaixo do teto, no nível de leito que
     ele sempre devia ter tido: presente, e por baixo de tudo. */
  gerador_motor:-6
};

/* O ganho que põe o som no lugar certo. Arquivo baixado já vem
   normalizado, então leva só o nível; síntese leva o nível dividido
   pelo bruto medido, que é o que a normaliza. */
function amTrim(id,sintetizado){
  const nivel=dbParaGanho(AM_NIVEL[id]==null?0:AM_NIVEL[id]);
  if(!sintetizado)return nivel;
  const bruto=AM_BRUTO[id];
  return bruto?nivel/bruto:nivel;
}

const AM={
  pronto:false,
  ctx:null,
  canais:{},          // nome -> GainNode
  vol:{},             // nome -> 0..1 escolhido pelo jogador
  cache:new Map(),    // id -> AudioBuffer
  faltando:new Set(), // ids sem arquivo e sem síntese
  loops:new Map(),    // id -> {src,g,canal}
  ultimaVariante:{},  // evento -> última variante usada
  cooldown:{},        // id -> instante em que pode tocar de novo
  geracao:0,          // token: invalida callback de cena antiga
  timers:new Set(),
  fontes:new Set(),
  base:'audio/',
  musicaAtual:null
};

/* ---------- montagem ---------- */
function amLigar(){
  if(AM.pronto)return true;
  if(!A||!A.ctx||!A.master)return false;       // um contexto só: o do jogo
  AM.ctx=A.ctx;
  const mestre=AM.ctx.createGain(); mestre.gain.value=1;
  mestre.connect(A.master);                     // entra antes do teto medido
  AM.canais.MASTER=mestre;
  for(const c of AM_CANAIS){
    const g=AM.ctx.createGain();
    g.gain.value=dbParaGanho(AM_DB[c]);
    g.connect(mestre);
    AM.canais[c]=g;
    AM.vol[c]=1;
  }
  AM.pronto=true;
  return true;
}

/* volume por categoria, 0..1, multiplicando o teto em dB do canal */
function amVolume(canal,v){
  if(!amLigar())return;
  if(canal==='MASTER'){
    AM.vol.MASTER=trava(v,0,1);
    AM.canais.MASTER.gain.linearRampToValueAtTime(AM.vol.MASTER,AM.ctx.currentTime+.15);
    return;
  }
  if(!AM.canais[canal])return;
  AM.vol[canal]=trava(v,0,1);
  AM.canais[canal].gain.linearRampToValueAtTime(
    dbParaGanho(AM_DB[canal])*AM.vol[canal], AM.ctx.currentTime+.15);
}

/* ---------- limpeza ----------
   O pacote é explícito: nenhuma fonte pode nascer depois que a cena morreu.
   Toda espera assíncrona carrega o token da geração em que começou. */
function amInvalidar(){
  AM.geracao++;
  for(const t of AM.timers)clearTimeout(t);
  AM.timers.clear();
  for(const s of AM.fontes){ try{s.stop()}catch(e){} }
  AM.fontes.clear();
}
function amEspera(fn,ms){
  const g=AM.geracao;
  const t=setTimeout(()=>{ AM.timers.delete(t); if(g===AM.geracao)fn(); },ms);
  AM.timers.add(t);
  return t;
}

/* ---------- catálogo ----------
   `sintese` é o som que o jogo já faz. É o que mantém o slot audível
   enquanto o arquivo não existe. */
const AM_SONS={
  // portas
  porta_abre    :{canal:'SFX',    arq:'sfx_01_porta_rangido.mp3',  sintese:()=>somPortaAbrindo&&somPortaAbrindo()},
  porta_fecha   :{canal:'SFX',    arq:'sfx_03_porta_fecha.mp3',    sintese:()=>somPortaFechando&&somPortaFechando()},
  porta_batida  :{canal:'HORROR', arq:'sfx_04_batida_forte.mp3',   sintese:()=>batida(3,1,0), cd:1200},
  porta_maçaneta:{canal:'SFX',    arq:'sfx_06_macaneta.mp3',       sintese:()=>ferrolho&&ferrolho(agoraS(),0,.8,.4)},
  // madeira e casa
  piso_range    :{canal:'SFX',    arq:'sfx_08_piso_madeira.mp3',   sintese:()=>passo(.5,0)},
  estalo_casa   :{canal:'HORROR', arq:'sfx_11_madeira_batendo.mp3',sintese:()=>estalo&&estalo(), cd:4000},
  // ferramentas e metal
  martelo       :{canal:'SFX',    arq:'sfx_24_martelo_metal.mp3',  sintese:()=>metalPesado&&metalPesado(0)},
  metal_cai     :{canal:'SFX',    arq:'sfx_25_ferramenta_cai.mp3', sintese:()=>metalPesado&&metalPesado(.3)},
  // clima
  chuva_leve    :{canal:'AMBIENCE',loop:true, leito:leitoChuva(0)},
  chuva_pesada  :{canal:'AMBIENCE',loop:true, leito:leitoChuva(1)},
  calha_agua    :{canal:'AMBIENCE',loop:true, leito:leitoCalha},
  /* trovões de gravação, tirados da mesma fita da chuva. Ficam como
     DISPARO, não dentro do laço: no laço eles voltariam a cada 5,8 s
     e a gravação se denunciaria. Aqui saem em intervalo irregular,
     que é como trovão se comporta. */
  trovao_longe  :{canal:'HORROR', dados:'@@TROVAO_LONGE@@', sintese:()=>amTrovao(.5), cd:6000},
  trovao_perto  :{canal:'HORROR', dados:'@@TROVAO_PERTO@@', sintese:()=>amTrovao(1),  cd:9000},
  vento         :{canal:'AMBIENCE',loop:true, leito:leitoVento},
  /* o gerador é gravação de verdade, embutida no HTML. A taxa de
     reprodução acompanha a rotação do motor, então tanque baixo baixa
     o tom e a cadência junto — que é o que um diesel faz. */
  gerador_motor :{canal:'AMBIENCE',loop:true, rev:.30,
                  dados:'@@GERADOR@@', laco:[0.0501134,6.0452154]},
  // quintal e natureza
  passaros      :{canal:'AMBIENCE',loop:true, leito:leitoPassaros},
  insetos       :{canal:'AMBIENCE',loop:true, leito:leitoInsetos},
  folhas        :{canal:'SFX',    arq:'sfx_64_folhas.mp3',         sintese:()=>rocado&&rocado(0)},
  agua_corre    :{canal:'SFX',    arq:'sfx_44_agua_correndo.mp3',  sintese:()=>gotejo&&gotejo()},
  // horror
  drone_baixo   :{canal:'HORROR', loop:true, rev:.6, leito:leitoDrone},
  sussurro_raro :{canal:'HORROR', arq:'sfx_73_sussurro.mp3',       sintese:()=>sussurro(6,chance(.5)?-.3:.3,.05), cd:12000},
  impacto_raro  :{canal:'HORROR', arq:'sfx_75_impacto.mp3',        sintese:()=>batida(1,.8,0), cd:15000},
  // UI
  /* cooldown curto: o clique é o som mais disparado do jogo, e sem trava
     um toque rápido em sequência viraria metralhadora */
  ui_clique     :{canal:'UI',     arq:'sfx_80_clique.mp3',         sintese:()=>amClique(1), cd:70},
  ui_erro       :{canal:'UI',     arq:'sfx_81_erro.mp3',           sintese:()=>amClique(.55)},
  ui_descoberta :{canal:'UI',     arq:'sfx_82_descoberta.mp3',     sintese:()=>amClique(1.6)}
};

/* ================= OS LEITOS =================
   Camadas contínuas: chuva, vento, bicho, calha e o drone do horror.
   Cada uma monta um grafo que entrega no `g` que o `amLoop` passa, e
   devolve a lista de fontes pra ele ligar e desligar.

   Elas existem porque o pacote nunca trouxe os arquivos: sem isto, o
   canal AMBIENCE fica calado e o jogo inteiro toca em cima do leito
   antigo da casa, que é um chiado só. Não são gravações — são texturas
   com a forma certa, e cada uma cede o lugar assim que o arquivo de
   verdade aparecer em `audio/`. */

/* ruído com filtro, o tijolo de quase tudo aqui */
function amRuidoFiltrado(tipo,freq,q,ganho,destino){
  const s=ruidoS(), f=AM.ctx.createBiquadFilter(), g=AM.ctx.createGain();
  f.type=tipo; f.frequency.value=freq; if(q)f.Q.value=q;
  g.gain.value=ganho;
  s.connect(f); f.connect(g); g.connect(destino);
  return {s,f,g};
}
/* oscilador lento amarrado a um parâmetro: é o que tira o "liga e fica
   parado" e faz o leito respirar */
function amDeriva(hz,prof,alvo){
  const o=AM.ctx.createOscillator(), g=AM.ctx.createGain();
  o.type='sine'; o.frequency.value=hz; g.gain.value=prof;
  o.connect(g); g.connect(alvo);
  return o;
}

function leitoChuva(pesada){
  return function(dest){
    /* chuva é duas coisas: o chiado agudo das gotas no telhado e o
       corpo grave da água caindo em volume. A pesada tem mais corpo e
       desce mais no grave — não é só a leve com o volume aberto. */
    const alta=amRuidoFiltrado('highpass',pesada?1500:2600,.7,pesada?.55:.42,dest);
    const lp=AM.ctx.createBiquadFilter();
    lp.type='lowpass'; lp.frequency.value=pesada?9000:7000;
    alta.g.disconnect(); alta.g.connect(lp); lp.connect(dest);
    const corpo=amRuidoFiltrado('bandpass',pesada?320:520,.6,pesada?.40:.16,dest);
    /* rajadas: a chuva não cai no mesmo volume por 3 minutos */
    const d1=amDeriva(pesada?.09:.06,pesada?.14:.09,alta.g.gain);
    const d2=amDeriva(.035,pesada?.10:.05,corpo.g.gain);
    return [alta.s,corpo.s,d1,d2];
  };
}

function leitoVento(dest){
  /* vento é ruído grave com a boca do filtro abrindo e fechando devagar;
     o assobio fino por cima só aparece quando a rajada sobe */
  const base=amRuidoFiltrado('lowpass',420,.8,.75,dest);
  const assobio=amRuidoFiltrado('bandpass',900,7,.06,dest);
  const d1=amDeriva(.055,180,base.f.frequency);
  const d2=amDeriva(.017,90,base.f.frequency);
  const d3=amDeriva(.055,.05,assobio.g.gain);
  const d4=amDeriva(.023,260,assobio.f.frequency);
  return [base.s,assobio.s,d1,d2,d3,d4];
}

function leitoInsetos(dest){
  /* grilo é banda estreita e aguda picotada rápido. Duas camadas em
     frequências e cadências diferentes tiram o efeito de "um bicho só
     com um alto-falante". */
  const a=amRuidoFiltrado('bandpass',4300,14,0,dest);
  const b=amRuidoFiltrado('bandpass',5600,18,0,dest);
  const ta=amDeriva(24,.16,a.g.gain), tb=amDeriva(31,.11,b.g.gain);
  a.g.gain.value=.16; b.g.gain.value=.11;
  /* e o coro inteiro sobe e desce, como o mato faz à noite */
  const lento=amDeriva(.08,.07,a.g.gain);
  return [a.s,b.s,ta,tb,lento];
}

function leitoPassaros(dest){
  /* não é canto de pássaro: é o brilho do quintal de dia, banda alta
     picotada em cadência irregular. De longe, o ouvido aceita. */
  const a=amRuidoFiltrado('bandpass',2900,13,.13,dest);
  const b=amRuidoFiltrado('bandpass',3900,16,.09,dest);
  const ta=amDeriva(5.5,.12,a.g.gain), tb=amDeriva(3.7,.08,b.g.gain);
  const va=amDeriva(.7,340,a.f.frequency), vb=amDeriva(1.1,420,b.f.frequency);
  return [a.s,b.s,ta,tb,va,vb];
}

function leitoCalha(dest){
  /* água correndo em cano: banda média estreita, com o gorgolejo vindo
     de duas derivas lentas que se desencontram */
  const c=amRuidoFiltrado('bandpass',1050,3.2,.34,dest);
  const fundo=amRuidoFiltrado('lowpass',380,.7,.13,dest);
  const d1=amDeriva(.9,320,c.f.frequency);
  const d2=amDeriva(.31,180,c.f.frequency);
  const d3=amDeriva(.6,.08,c.g.gain);
  return [c.s,fundo.s,d1,d2,d3];
}

function leitoDrone(dest){
  /* o mesmo desenho do drone da abertura: raiz grave, quinta e oitava
     desafinadas de fração de hertz. O batimento lento é o que dá a
     sensação de que o ar está pesado sem nenhum som "de horror". */
  const nos=[];
  [[44,.50],[66.15,.30],[88,.22],[132.07,.10]].forEach(([hz,v])=>{
    const o=AM.ctx.createOscillator(), g=AM.ctx.createGain();
    o.type='sine'; o.frequency.value=hz; g.gain.value=v;
    o.connect(g); g.connect(dest); nos.push(o);
  });
  const ar=amRuidoFiltrado('bandpass',260,.5,.10,dest);
  nos.push(ar.s);
  nos.push(amDeriva(.041,.06,dest.gain));
  return nos;
}

/* dois sons próprios, porque o jogo não tinha equivalente */
function amTrovao(forca){
  if(!AM.ctx)return;
  const t=AM.ctx.currentTime;
  const s=ruidoS(), lp=AM.ctx.createBiquadFilter(), g=AM.ctx.createGain();
  lp.type='lowpass'; lp.frequency.setValueAtTime(420*forca+90,t);
  lp.frequency.exponentialRampToValueAtTime(70,t+2.6*forca+.8);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.55*forca,t+.05+.25*(1-forca));
  g.gain.exponentialRampToValueAtTime(.0008,t+2.8*forca+1);
  s.connect(lp); lp.connect(g);
  amRota(g,'HORROR',{rev:.9});
  s.start(t); amFonte(s,t+3.2*forca+1.2);
}
function amClique(tom){
  if(!AM.ctx)return;
  const t=AM.ctx.currentTime;
  const o=AM.ctx.createOscillator(), g=AM.ctx.createGain();
  o.type='triangle'; o.frequency.value=520*tom;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.16,t+.004);
  g.gain.exponentialRampToValueAtTime(.0008,t+.09);
  o.connect(g); amRota(g,'UI',{rev:.1});
  o.start(t); amFonte(o,t+.11);
}

/* liga um nó ao canal, mantendo o envio de reverberação do jogo */
function amRota(no,canal,op){
  if(!amLigar())return no;
  /* se um som está sendo sintetizado dentro de `amNoCanal`, ele entrega
     no barramento daquele som — que já carrega o trim — e não direto no
     canal. É o que faz `amTrovao` e `amClique` obedecerem à régua. */
  const alvo=AM.bus||AM.canais[canal]||AM.canais.SFX;
  no.connect(alvo);
  if(op&&op.rev&&A.molhado){
    const env=AM.ctx.createGain(); env.gain.value=op.rev;
    no.connect(env); env.connect(A.molhado);
  }
  return no;
}
/* ---------- síntese dentro do canal ----------
   A síntese do v48 nasceu antes dos canais e entrega direto em
   `A.seco`/`A.molhado` através de `saida()`. Em vez de reescrever
   dezenas de funções de som, `saida` é trocada pelo tempo exato da
   chamada por uma que entrega num barramento com o trim do som, e o
   barramento entrega no canal. Fora dessa janela, `saida` volta a ser
   a de sempre — o resto do jogo não percebe nada. */
function amNoCanal(id,canal,fn){
  if(!amLigar())return false;
  const bus=AM.ctx.createGain();
  bus.gain.value=amTrim(id,true);
  bus.connect(AM.canais[canal]||AM.canais.SFX);
  const saidaOrig=(typeof saida==='function')?saida:null;
  const busAnterior=AM.bus;
  AM.bus=bus;
  if(saidaOrig)saida=function(no,{pan=0,rev=.35,vol=1}={}){
    const g=AM.ctx.createGain(); g.gain.value=vol;
    let p=null;
    if(AM.ctx.createStereoPanner){
      p=AM.ctx.createStereoPanner();
      p.pan.value=Math.max(-1,Math.min(1,pan));
    }
    no.connect(g);
    const alvo=p?(g.connect(p),p):g;
    alvo.connect(bus);
    /* a reverberação continua indo pro envio do jogo, senão o som
       sintetizado ficaria seco enquanto o resto da casa reverbera */
    if(rev&&A.molhado){
      const env=AM.ctx.createGain();
      env.gain.value=rev*bus.gain.value;
      alvo.connect(env); env.connect(A.molhado);
    }
    return g;
  };
  let ok=false;
  try{ fn(); ok=true; }
  catch(e){ ok=false; }
  finally{ if(saidaOrig)saida=saidaOrig; AM.bus=busAnterior; }
  /* o barramento vive o suficiente pra cauda mais longa do jogo */
  amEspera(()=>{ try{bus.disconnect();}catch(e){} },14000);
  return ok;
}

function amFonte(s,paraEm){
  AM.fontes.add(s);
  try{ s.stop(paraEm); }catch(e){}
  s.onended=()=>AM.fontes.delete(s);
}

/* ---------- carregar sob demanda ----------
   Nada de base64: o arquivo é buscado quando o som é pedido pela primeira
   vez, e o buffer fica em cache. Falta de arquivo não é erro — é a
   condição normal enquanto você não baixou nada. */
function amCarregar(id){
  const d=AM_SONS[id];
  if(!d||(!d.arq&&!d.dados))return Promise.resolve(null);
  if(AM.cache.has(id))return Promise.resolve(AM.cache.get(id));
  if(AM.faltando.has(id))return Promise.resolve(null);
  const g=AM.geracao;
  /* som embutido no HTML: não passa pela rede, decodifica na hora.
     É o caso do gerador, que é gravação de verdade e precisa estar
     no arquivo único que a pessoa publica. */
  if(d.dados){
    return fetch(d.dados)
      .then(r=>r.arrayBuffer())
      .then(ab=>AM.ctx.decodeAudioData(ab))
      .then(buf=>{ if(g!==AM.geracao)return null; AM.cache.set(id,buf); return buf; })
      .catch(()=>{ AM.faltando.add(id); return null; });
  }
  return fetch(AM.base+d.arq)
    .then(r=>r.ok?r.arrayBuffer():Promise.reject(0))
    .then(ab=>AM.ctx.decodeAudioData(ab))
    .then(buf=>{
      if(g!==AM.geracao)return null;       // a cena morreu no caminho
      AM.cache.set(id,buf); return buf;
    })
    .catch(()=>{ AM.faltando.add(id); return null; });
}

/* ---------- tocar ---------- */
function amPode(id,cd){
  const agora=Date.now();
  if(AM.cooldown[id]&&agora<AM.cooldown[id])return false;
  if(cd)AM.cooldown[id]=agora+cd;
  return true;
}

/* variação de pitch de 2 a 5%, como o pacote pede, e nunca a mesma
   variante duas vezes seguidas */
function amVariante(evento,n){
  if(n<=1)return 0;
  /* cosmetico: qual gravacao do mesmo evento toca, pra nao repetir */
  let v; do{ v=Math.floor(Math.random()*n); }while(n>1&&v===AM.ultimaVariante[evento]);   /* cosmetico */
  AM.ultimaVariante[evento]=v;
  return v;
}

function amToca(id,op){
  op=op||{};
  if(!amLigar())return false;
  const d=AM_SONS[id];
  if(!d)return false;
  if(!amPode(id,op.cd!=null?op.cd:d.cd))return false;

  const usarSintese=()=>d.sintese?amNoCanal(id,d.canal,d.sintese):false;

  if(!d.arq&&!d.dados)return usarSintese();
  if(AM.faltando.has(id))return usarSintese();

  const buf=AM.cache.get(id);
  if(!buf){
    /* primeira vez: cai na síntese agora e busca o arquivo pro futuro */
    amCarregar(id);
    return usarSintese();
  }
  const t=AM.ctx.currentTime+.01;
  const s=AM.ctx.createBufferSource(); s.buffer=buf;
  const desvio=.02+Math.random()*.03;                  // 2 a 5%
  s.playbackRate.value=1+(Math.random()<.5?-desvio:desvio);
  const g=AM.ctx.createGain();
  g.gain.value=(op.vol!=null?op.vol:1)*(.88+Math.random()*.24)*amTrim(id,false);
  s.connect(g); amRota(g,d.canal,{rev:op.rev!=null?op.rev:.3});
  s.start(t); amFonte(s,t+buf.duration/s.playbackRate.value+.1);
  return true;
}

/* ---------- camadas em loop, com crossfade ---------- */
function amLoop(id,alvo){
  if(!amLigar())return;
  const d=AM_SONS[id];
  if(!d||!d.loop)return;
  const atual=AM.loops.get(id);
  if(alvo<=0){
    if(atual){
      const t=AM.ctx.currentTime;
      atual.g.gain.cancelScheduledValues(t);
      atual.g.gain.setValueAtTime(atual.g.gain.value,t);
      atual.g.gain.linearRampToValueAtTime(0,t+1.2);
      atual.parando=amEspera(()=>{ try{atual.src.stop()}catch(e){} AM.loops.delete(id); },1400);
    }
    return;
  }
  if(atual){
    const t=AM.ctx.currentTime;
    /* Se o leito estava no meio do desligamento, o `stop` agendado
       ainda vai disparar e matar a fonte que acabou de voltar. Desligar
       e religar o gerador dentro de 1,4 s deixava ele mudo até a
       próxima troca de cena — e no jogo isso acontece: o gerador cai e
       volta na mesma cena mais de uma vez. */
    if(atual.parando){ clearTimeout(atual.parando); AM.timers.delete(atual.parando); atual.parando=null; }
    atual.g.gain.cancelScheduledValues(t);
    atual.g.gain.setValueAtTime(atual.g.gain.value,t);
    atual.g.gain.linearRampToValueAtTime(alvo*amTrim(id,atual.sintetizado),t+1.2);
    return;
  }
  /* Sem arquivo e sem embutido, cai na síntese do leito. Antes isto
     simplesmente não acontecia: `amLoop` só sabia tocar arquivo, e como
     não há arquivo nenhum baixado, chuva, vento, insetos, calha e drone
     nunca tocaram uma vez sequer desde que o canal AMBIENCE existe. */
  if(!d.arq&&!d.dados){
    if(!d.leito)return;
    const t=AM.ctx.currentTime;
    const g=AM.ctx.createGain(); g.gain.value=0;
    const bus=AM.bus; AM.bus=null;
    const nos=d.leito(g)||[];
    AM.bus=bus;
    amRota(g,d.canal,{rev:d.rev!=null?d.rev:.35});
    g.gain.linearRampToValueAtTime(alvo*amTrim(id,true),t+1.6);
    nos.forEach(n=>{ try{n.start(t);}catch(e){} });
    /* de propósito FORA de AM.fontes: leito é mobília da casa, não som
       da cena. `amInvalidar` roda a cada troca de cômodo e mataria a
       chuva e o gerador toda vez que você andasse — e como a entrada
       continuaria em AM.loops, o `amLoop` seguinte só subiria o ganho
       de uma fonte já morta e o leito nunca mais voltaria. Quem desliga
       leito é `amLoop(id,0)`. */
    AM.loops.set(id,{nos,g,canal:d.canal,sintetizado:true,
      src:{stop:()=>nos.forEach(n=>{try{n.stop()}catch(e){}})}});
    return;
  }
  amCarregar(id).then(buf=>{
    if(!buf||AM.loops.has(id))return;
    const t=AM.ctx.currentTime;
    const s=AM.ctx.createBufferSource(); s.buffer=buf; s.loop=true;
    /* MP3 carrega ~50 ms de atraso do encoder no começo e sobra no fim.
       Sem pontos de laço explícitos, cada volta traria esse silêncio pra
       dentro e o loop batia. Os valores vêm medidos, em segundos, que é
       o que não depende da taxa do contexto. */
    if(d.laco){ s.loopStart=d.laco[0]; s.loopEnd=d.laco[1]; }
    const g=AM.ctx.createGain(); g.gain.value=0;
    s.connect(g); amRota(g,d.canal,{rev:d.rev!=null?d.rev:.4});
    s.start(t,d.laco?d.laco[0]:0);
    g.gain.linearRampToValueAtTime(alvo*amTrim(id,false),t+1.6);
    AM.loops.set(id,{src:s,g,canal:d.canal});   /* idem: leito não é fonte de cena */
  });
}

/* ---------- ducking ----------
   250 a 500 ms de recuo e volta suave, como o pacote pede. */
function amDuck(ms,quanto){
  if(!amLigar())return;
  const t=AM.ctx.currentTime, q=quanto==null?.45:quanto;
  for(const c of ['MUSIC','AMBIENCE']){
    const g=AM.canais[c], cheio=dbParaGanho(AM_DB[c])*AM.vol[c];
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value,t);
    g.gain.linearRampToValueAtTime(cheio*q,t+.12);
    g.gain.setValueAtTime(cheio*q,t+(ms||350)/1000);
    g.gain.linearRampToValueAtTime(cheio,t+(ms||350)/1000+.6);
  }
}

/* ---------- passos: FootstepManager ---------- */
const AM_PISOS={madeira:'piso_range', escada:'piso_range', concreto:'piso_range',
                terra:'folhas', grama:'folhas', folhas:'folhas', lama:'agua_corre'};
function amPisoDoLugar(){
  const m=(typeof cena!=="undefined"&&cena.modo)||'';
  if(m==='rua'||m==='casafora'||m==='mapa')return 'concreto';
  const c=(typeof cena!=="undefined"&&cena.casa)?cena.casa.voce:null;
  if(c===10||c===8)return 'terra';
  if(c===0||c===9)return 'escada';
  return 'madeira';
}
function amPasso(op){
  op=op||{};
  if(!amPode('passo',120))return false;
  const piso=op.piso||amPisoDoLugar();
  amVariante('passo',3);                       // três variantes, sem repetir
  if(typeof passo==='function'){ passo(op.forca!=null?op.forca:.8, op.pan||0); return true; }
  return amToca(AM_PISOS[piso]||'piso_range',{vol:.9});
}

/* ---------- HorrorAudioDirector, níveis 0 a 5 ----------
   O nível não revela onde a anomalia está: só diz o quanto o ar está
   pesado. E alguns sons são falsos positivos por desenho. */
let _amHorror=-1;
function amNivelDeHorror(){
  let n=0;
  try{
    const risco=(typeof riscoInvasao==='function')?riscoInvasao():0;
    const ruido=(S&&S.ruido)||0;
    const calor=(S&&S.calor)||0;
    const noite=(S&&S.hora!=null)&&(S.hora>=19||S.hora<6);
    const est=(typeof estagio==='function')?estagio():{ilusao:0};
    if(noite)n=1;
    if(risco>.18||calor>25)n=2;
    if(risco>.30||est.ilusao>=.22)n=3;
    if(risco>.45||calor>70)n=4;
    /* era `cena.modo==='fuga'`, e 'fuga' NUNCA e escrito em cena.modo:
       a fuga do §24 usa 'fora'. O ramo estava morto, e a camada de horror
       do audio nunca chegava no 5 durante uma fuga — justo quando devia.
       (Achado por varredura de comparacao morta: valor lido que nenhum
       lugar do jogo escreve.) */
    if((S&&S.invadindo)||(typeof cena!=="undefined"&&cena.modo==='fora'))n=5;
  }catch(e){}
  return n;
}
function amHorror(n){
  if(!amLigar())return;
  if(n===_amHorror)return;                     // só mexe quando o estado muda
  _amHorror=n;
  amLoop('drone_baixo', n<=0?0 : [0,.10,.22,.34,.52,.75][n]);
  if(n>=3&&chance(.35))amToca('sussurro_raro');
  if(n>=4&&chance(.25))amToca('impacto_raro');
}

/* ---------- ambiente adaptativo ----------
   Atualiza só quando o estado muda, como o pacote exige. */
let _amEstado='';
function amAmbiente(){
  if(!amLigar())return;
  let noite=false,chuva=0,fora=false;
  try{
    noite=(S.hora>=19||S.hora<6);
    chuva=S.chuva?(S.tempestade?2:1):0;
    fora=!!(typeof cena!=='undefined'&&['rua','casafora','mapa'].includes(cena.modo))
       || ((typeof cena!=="undefined"&&cena.casa)?cena.casa.voce===8||cena.casa.voce===10:false);
  }catch(e){}
  const chave=[noite,chuva,fora].join('|');
  if(chave===_amEstado)return;
  _amEstado=chave;

  amLoop('passaros', (!noite&&fora)?.55:0);
  amLoop('insetos',  (noite&&fora)?.60:(noite?.20:0));
  amLoop('vento',    fora?.50:.18);
  amLoop('chuva_leve',   chuva===1?.65:0);
  amLoop('chuva_pesada', chuva===2?.80:0);
  amLoop('calha_agua',   chuva>0?(fora?.5:.28):0);
  if(chuva===2)amEspera(()=>amToca('trovao_perto'),1200+Math.random()*4000);
  else if(chuva===1)amEspera(()=>amToca('trovao_longe'),2500+Math.random()*7000);
}

/* ---------- o pulso: horror e ambiente acompanham o jogo ---------- */
let _amPulso=null;
function amComecar(){
  if(!amLigar()||_amPulso)return;
  _amPulso=setInterval(()=>{
    try{ amAmbiente(); amHorror(amNivelDeHorror()); }catch(e){}
  },2000);
}

/* ---------- integração com o jogo, sem tocar no que já existe ---------- */
if(typeof iniciarAudio==='function'){
  const _base=iniciarAudio;
  window.iniciarAudio=function(){
    const r=_base.apply(this,arguments);
    try{ amLigar(); amComecar(); }catch(e){}
    return r;
  };
}
/* Trocar de cômodo é troca de cena: o que era da cena anterior morre.
   Mas a limpeza não pode ficar na frente da transição — ela percorre
   timers e fontes, e rodando antes do corte empurrou o início do preto de
   184 para 196 ms, raspando o orçamento de 1 s. Então a transição parte
   primeiro e a limpeza acontece no microtask seguinte, no mesmo quadro. */
if(typeof irPara==='function'){
  const _base=irPara;
  window.irPara=function(){
    const r=_base.apply(this,arguments);
    queueMicrotask(()=>{ try{ amInvalidar(); amAmbiente(); }catch(e){} });
    return r;
  };
}
/* O clique de UI vem de UM listener na barra de ações, não de um por
   botão. Embrulhar `botao()` custava uma anexação por botão desenhado, e
   um menu de cômodo desenha vinte — trabalho por render, dentro do quadro
   em que a transição de cômodo está tentando começar. Delegar resolve:
   um listener para sempre, e ele nem precisa saber quais botões existem. */
if(typeof AC!=='undefined'&&AC&&AC.addEventListener){
  AC.addEventListener('click',(e)=>{
    if(e.target&&e.target.closest&&e.target.closest('button'))
      { try{ amToca('ui_clique'); }catch(x){} }
  },{passive:true,capture:true});
}
/* uma linha de perigo no log é SFX narrativamente importante: duck */
if(typeof diz==='function'){
  const _base=diz;
  window.diz=function(txt,cls){
    /* uma cena pode escrever várias linhas de perigo seguidas; o duck
       não precisa ser reagendado a cada uma */
    if(cls==='perigo'&&amPode('duck:perigo',900)){ try{ amDuck(400,.45); }catch(e){} }
    return _base.apply(this,arguments);
  };
}

/* ================= O GERADOR VIRA GRAVAÇÃO =================
   O motor sintetizado do v48 imitava um gerador a diesel pequeno com
   quatro osciladores e ruído modulado. A gravação é um gerador a diesel
   pequeno de verdade — 25,5 Hz de taxa de explosão, medidos.

   A gravação não substitui a síntese, ocupa o lugar do corpo dela. O
   que a gravação não sabe fazer continua com a síntese, porque depende
   do jogo e não do microfone:
     · a partida, que acelera demais e assenta
     · as tossidas dos três primeiros segundos
     · o engasgo de quando o diesel está no fim

   E o que a gravação faz melhor que qualquer oscilador é a irregularidade
   do motor. A rotação entra pela taxa de reprodução: tanque baixo toca
   mais devagar, e aí o tom E a cadência caem juntos, que é o que um
   motor faz de verdade. */

const GER_CORPO_SINTESE=.16;   /* o que sobra do motor antigo por baixo */

function amGeradorNivel(){
  /* mesmo dono de sempre: base × carga × cômodo, normalizado pra 1 */
  try{
    if(typeof nivelGerador!=='function'||!A.ger)return 0;
    /* BUG corrigido: o gerador continuava tocando no mesmo nível numa
       expedição do outro lado da cidade. Ele mora na oficina — a
       dezenas de quarteirões dali não se ouve motor nenhum. Fora de
       casa o leito some; na frente da casa, sobra um resto. */
    const m=(typeof cena!=='undefined'&&cena.modo)||'';
    if(m==='rua'||m==='mapa')return 0;
    if(m==='casafora')return .18;
    const base=(typeof gerVolBase==='function')?gerVolBase():.055;
    return base>0?trava(nivelGerador()/base,0,2):1;
  }catch(e){ return 1; }
}
function amGeradorAcompanha(){
  const l=AM.loops.get('gerador_motor');
  if(!l||!l.src||!l.src.playbackRate)return;
  try{
    const p=(A.ger&&A.ger.carga!=null)?A.ger.carga:1;
    /* a mesma curva que a síntese usa na rotação: .84 a 1.00 */
    l.src.playbackRate.linearRampToValueAtTime(.84+.16*p,AM.ctx.currentTime+1.2);
  }catch(e){}
}

if(typeof ligarGerador==='function'){
  const _ligar=ligarGerador;
  window.ligarGerador=function(){
    /* `A` é const de topo do index.html: existe no escopo, mas NÃO é
       propriedade de window. Testar `window.A` dava sempre undefined e
       a gravação nunca entrava. */
    const jaEstava=!!(A&&A.ger);
    const r=_ligar.apply(this,arguments);
    if(!jaEstava&&A&&A.ger){
      /* o corpo do motor sintetizado desce: quem carrega o timbre
         agora é a gravação, e somar os dois no mesmo nível só embolava
         o grave dos dois */
      try{
        const t=AM.ctx?AM.ctx.currentTime:0;
        A.ger.mestre.gain.cancelScheduledValues(t+3.3);
        A.ger.mestre.gain.setValueAtTime(SOM.gerador.vol*GER_CORPO_SINTESE,t+3.4);
      }catch(e){}
      try{ amLoop('gerador_motor',amGeradorNivel()||1); amGeradorAcompanha(); }catch(e){}
    }
    return r;
  };
}
if(typeof desligarGerador==='function'){
  const _desligar=desligarGerador;
  window.desligarGerador=function(){
    try{ amLoop('gerador_motor',0); }catch(e){}
    return _desligar.apply(this,arguments);
  };
}
/* sair de casa e voltar tem de reavaliar o nível na hora, senão o
   gerador só cai no próximo `ajustarGerador`, que pode nunca vir */
if(typeof irPara==='function'){
  const _irGer=irPara;
  window.irPara=function(){
    const r=_irGer.apply(this,arguments);
    queueMicrotask(()=>{ try{ if(A&&A.ger)amLoop('gerador_motor',amGeradorNivel()); }catch(e){} });
    return r;
  };
}
if(typeof ajustarGerador==='function'){
  const _ajustar=ajustarGerador;
  window.ajustarGerador=function(pct){
    const r=_ajustar.apply(this,arguments);
    try{
      if(A&&A.ger){
        amLoop('gerador_motor',amGeradorNivel()||1);
        amGeradorAcompanha();
      }
    }catch(e){}
    return r;
  };
}

/* ---------- a batida na porta ----------
   O estouro de verdade era um bug de envelope, e está corrigido lá no
   `batida` do jogo. Consertado, ele volta a responder à força — medido:
   2,38x de entrada dá 2,45x de saída, que é linear dentro do erro.

   Sobra a decisão de mix: mesmo linear, a batida é o som mais alto do
   jogo e toca várias vezes por noite. 0,55 põe o pico em -8 dBFS, alto
   o bastante pra assustar e ainda com 8 dB de teto pro resto acontecer
   junto — que é justamente o que faltava quando ela ia a 0 dBFS. */
if(typeof batida==='function'){
  const _batida=batida;
  window.batida=function(qtd,forca,pan){
    return _batida.call(this,qtd==null?3:qtd,(forca==null?1:forca)*.55,pan||0);
  };
}

/* ---------- relatório de assets, pro console ----------
   Diz quantos slots têm arquivo, quantos estão na síntese e quantos não
   têm nada. É o que responde "o que falta baixar". */
function amRelatorio(){
  const com=[],sint=[],nada=[];
  for(const [id,d] of Object.entries(AM_SONS)){
    if(AM.cache.has(id))com.push(id);
    else if(d.sintese)sint.push(id);
    else nada.push(id);
  }
  return {arquivo:com, sintetizado:sint, semNada:nada,
          faltando:[...AM.faltando],
          canais:Object.keys(AM.canais), pasta:AM.base};
}
