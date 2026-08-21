/* ================= §18 — A LUZ DENTRO DA CASA =================
   DIAGNÓSTICO. O v48 desenha cada cômodo escuro, pinta um brilho de
   lampião por cima e fecha com uma vinheta que chega a 92% de preto
   na borda. Três problemas, nesta ordem de gravidade:

   1. A luz não vinha de lugar nenhum. `lampiao()` é chamado nos 11
      cômodos com posição e força FIXAS, sem olhar gerador, hora,
      diesel ou interruptor. Ligar o gerador não clareava um pixel:
      a "luz acesa" era desenho, não estado.

   2. A luz não iluminava o cômodo. O gradiente do lampião é um véu
      quente por cima do quadro; a parede continuava com a mesma cor
      que tinha no escuro. Era brilho NA lâmpada, não luz SOBRE a
      sala — que é exatamente o que o pedido separa.

   3. A vinheta comia o resto. Somada ao gradiente, ela devolvia a
      borda pro preto que a luz tinha acabado de levantar.

   O QUE ESTE BLOCO FAZ. Um modelo de luz por cômodo: cada luminária
   tem posição, alcance, intensidade e temperatura de cor próprias,
   ligadas a uma FONTE de verdade — gerador, lampião, lanterna ou a
   janela. A luz entra em duas camadas, como luz real: o facho direto
   da luminária e o rebote dela nas paredes, que é o que torna o
   cômodo legível. A vinheta passa a ceder na mesma medida.

   O QUE ESTE BLOCO NÃO FAZ, porque não existe aqui: lightmap, probe,
   oclusão, sombra projetada e vazamento entre cômodos. O jogo desenha
   um cômodo por vez em canvas 2D — não há geometria pra luz atravessar
   nem vizinho pra vazar. Vazamento de luz é impossível por construção,
   e é por isso que não há nada a corrigir nessa frente.
   ================================================================= */

/* ---------- tudo que se ajusta, num lugar só ---------- */
const LUZ={
  /* quanto a luz levanta o cômodo inteiro (o rebote nas paredes).
     É o número que resolve o "escuro mesmo com a luz acesa" — mexer
     nele é mexer na legibilidade geral do interior. Subir demais
     lava a cena: aos 0,30 o quarto ficava legível e CHAPADO, sem
     contraste nenhum. O trabalho pesado é do `facho`, que tem
     direção; o rebote só tira o preto absoluto do canto. */
  rebote:0.16,
  /* o facho direto da luminária, por cima do rebote */
  facho:0.62,
  /* o quanto a vinheta cede quando há luz. 0 = vinheta do v48
     sempre; 1 = sem vinheta com luz cheia. */
  cedeVinheta:0.42,
  /* piso de legibilidade: nem o cômodo mais escuro fica em breu.
     O pedido é explícito em evitar preto absoluto. */
  minimo:0.16,
  transicao:0.9,          /* segundos pra acender e apagar */
  /* fontes */
  gerador:1.00,           /* luz elétrica com o motor rodando */
  lampiao:0.42,           /* querosene: fraco, quente e tremido */
  lanterna:0.30,          /* foco estreito, frio */
  diaJanela:0.55,         /* sol entrando pela janela ao meio-dia */
  chuvaCorta:0.45         /* o quanto a chuva tira da luz do dia */
};

/* níveis de qualidade: o rebote é uma passada de tela inteira, o
   facho é um gradiente radial. Em baixo, corta o mais caro. */
const QUALIDADE_LUZ={
  baixo:{rebote:1,facho:0,tremor:false},
  medio:{rebote:1,facho:1,tremor:false},
  alto: {rebote:1,facho:1,tremor:true},
  ultra:{rebote:1,facho:1,tremor:true}
};
function qualidadeLuz(){
  const q=(S.cfg&&S.cfg.qualidade)||'alto';
  return QUALIDADE_LUZ[q]||QUALIDADE_LUZ.alto;
}

/* ---------- a luminária de cada cômodo ----------
   Função do ambiente manda no tipo de luz: cozinha e oficina querem
   luz de trabalho, fria e forte; sala e quarto querem luz de estar,
   quente e baixa; corredor e escada querem só o suficiente pra não
   tropeçar. `janela` diz se o cômodo vê o céu — é o que decide se
   entra luz de dia e se a chuva aparece no vidro. */
const LUMINARIAS={
 0:{nome:'lâmpada pendurada na viga', x:.28,y:.30, alcance:.85, forca:.62,
    cor:[255,226,170], janela:true,  d:'Um bocal solto no fio, sem cúpula.'},
 1:{nome:'abajur na cabeceira',       x:.30,y:.52, alcance:.62, forca:.70,
    cor:[255,214,150], janela:true,  d:'Luz baixa, pro lado de quem dorme.'},
 2:{nome:'lâmpada da despensa',       x:.50,y:.24, alcance:.72, forca:.78,
    cor:[255,236,205], janela:false, d:'Fria e sem graça. Serve pra achar lata.'},
 3:{nome:'luminária da bancada',      x:.36,y:.30, alcance:.70, forca:.95,
    cor:[236,240,255], janela:false, d:'Braço articulado, foco no serviço.'},
 4:{nome:'lâmpada do teto da sala',   x:.50,y:.20, alcance:1.05,forca:.85,
    cor:[255,224,168], janela:true,  d:'Centro do teto. Pega a sala inteira.'},
 5:{nome:'lâmpada da cozinha',        x:.50,y:.22, alcance:.95, forca:1.00,
    cor:[246,244,235], janela:true,  d:'Branca e alta: aqui se corta e se cozinha.'},
 6:{nome:'lâmpada do porão',          x:.46,y:.20, alcance:.78, forca:.66,
    cor:[255,232,190], janela:false, d:'Bocal na viga, e mais nada.'},
 7:{nome:'luz da entrada',            x:.50,y:.22, alcance:.80, forca:.72,
    cor:[255,228,180], janela:true,  d:'Fica acesa pra quem chega achar a fechadura.'},
 8:{nome:'lâmpada do quintal',        x:.50,y:.16, alcance:.90, forca:.58,
    cor:[255,238,205], janela:true,  d:'Presa no batente, cheia de mosquito.'}
};

/* ---------- estado dos interruptores ----------
   Guardado em S, então atravessa troca de cômodo e salvamento. */
function luzes(){
  if(!S.luzes||typeof S.luzes!=='object')S.luzes={};
  return S.luzes;
}
function interruptor(id){
  const L=luzes();
  return L[id]!==false;              /* o padrão é aceso */
}
function acionarLuz(id){
  const L=luzes();
  L[id]=!interruptor(id);
  return L[id];
}

/* há energia? A luminária elétrica só acende com o motor rodando. */
function temEnergia(){
  /* `A` é const de topo do index.html: existe no escopo mas não em
     window. Testar window.A daria sempre falso. */
  return !!(A&&A.ger) && !S.gerQuebrado && (S.diesel||0)>0;
}

/* o quanto a janela entrega de luz agora.
   Não inventa curva própria: usa a `luzAgora()` que o jogo já tem, e
   que já desconta clima e chuva. Duplicar aquela curva aqui era o
   caminho curto pras duas discordarem na primeira mudança. */
function luzDaJanela(id){
  const L=LUMINARIAS[id];
  if(!L||!L.janela)return 0;
  const f=(typeof luzAgora==='function')?luzAgora().f:.5;
  if(f<=.2)return 0;                 /* noite: janela não dá luz, dá frio */
  let v=LUZ.diaJanela*((f-.2)/.8);
  if(id===8)v*=1.6;                  /* quintal é céu aberto, não janela */
  if(id===1)v*=.35;                  /* quarto: janela tapada com tábua */
  if(id===7)v*=.55;                  /* entrada: só a fresta da porta */
  return trava(v,0,1);
}

/* ---------- o modelo de luz do cômodo ----------
   Devolve de onde vem a luz, quanta é e de que cor. Todo o resto do
   bloco lê daqui: não existe luz desenhada sem passar por esta conta,
   que é o que garante "toda luz visível tem origem coerente". */
function luzDoComodo(id){
  const L=LUMINARIAS[id]||LUMINARIAS[4];
  const fontes=[];
  let nivel=0, r=0,g=0,b=0, peso=0;
  const soma=(v,cor)=>{
    if(v<=0)return;
    nivel+=v; peso+=v;
    r+=cor[0]*v; g+=cor[1]*v; b+=cor[2]*v;
  };

  const eletrica=temEnergia()&&interruptor(id);
  if(eletrica){
    soma(LUZ.gerador*L.forca, L.cor);
    fontes.push('gerador');
  }
  /* o lampião é o que sobra quando não há energia: fraco, quente, e
     é ele que impede o cômodo de ficar em breu */
  const lamp=eletrica?LUZ.lampiao*.25:LUZ.lampiao;
  soma(lamp,[255,196,120]);
  if(lamp>0)fontes.push('lampiao');

  if(typeof temFerra==='function'&&temFerra('lanterna')&&(S.pilhas||0)>0&&!eletrica){
    soma(LUZ.lanterna,[220,232,255]);
    fontes.push('lanterna');
  }
  const janela=luzDaJanela(id);
  if(janela>0){ soma(janela,[186,204,226]); fontes.push('janela'); }

  nivel=trava(Math.max(nivel,LUZ.minimo),0,1.35);
  const cor=peso>0?[r/peso,g/peso,b/peso]:[255,210,150];
  return {nivel, cor, fontes, eletrica, luminaria:L,
          x:L.x, y:L.y, alcance:L.alcance};
}

/* qual cômodo está sendo desenhado agora */
function comodoNaTela(){
  if(typeof cena==="undefined"||cena.modo!=='casa'||!cena.casa)return null;
  return cena.casa.voce;
}

/* nível suavizado, pra acender e apagar não dar salto */
const _luzSuave={id:null,v:0};
function nivelSuave(id,alvo){
  if(_luzSuave.id!==id){ _luzSuave.id=id; _luzSuave.v=alvo; }
  else _luzSuave.v+=(alvo-_luzSuave.v)*(1/(LUZ.transicao*60));
  return _luzSuave.v;
}

/* ================= O DESENHO =================
   `lampiao()` é chamado por dentro de cada cômodo do v48, sempre com
   posição e força fixas. Trocamos a função inteira: os argumentos do
   v48 viram só um palpite de posição, e quem manda é o modelo. */
const _lampiaoV48=lampiao;
lampiao=function(w,h,t,x,y,forca){
  const id=comodoNaTela();
  if(id===null){ return _lampiaoV48.apply(this,arguments); }  /* fora da casa, nada muda */
  const Q=qualidadeLuz();
  const L=luzDoComodo(id);
  const n=nivelSuave(id,L.nivel);
  if(n<=0.001)return;

  const cr=Math.round(L.cor[0]),cg=Math.round(L.cor[1]),cb=Math.round(L.cor[2]);
  /* tremor: só o lampião treme. Luz elétrica de gerador oscila com a
     rotação, então treme MENOS e mais devagar — e some quando a
     qualidade é baixa, porque aí é custo sem leitura. */
  let br=1;
  if(Q.tremor){
    br=L.eletrica ? (1+Math.sin(t*3.1)*.018+Math.sin(t*11.7)*.010)
                  : (1+Math.sin(t*2.3)*.075+Math.sin(t*7.1)*.045);
  }
  const px=(x!=null?x:L.x*w), py=(y!=null?y:L.y*h);
  const nx=(x!=null?x/w:L.x), ny=(y!=null?y/h:L.y);

  /* --- 1. O REBOTE: a luz que a parede devolve ---
     É esta passada que faz o cômodo ficar legível. `screen` levanta
     a sombra sem estourar o que já é claro, que é o comportamento de
     luz indireta — somar com `lighter` lavaria a imagem inteira. */
  CX.save();
  CX.globalCompositeOperation='screen';
  const amb=CX.createRadialGradient(nx*w,ny*h,0,nx*w,ny*h,h*L.alcance*1.15);
  const a0=LUZ.rebote*n*br;
  amb.addColorStop(0,   'rgba('+cr+','+cg+','+cb+','+(a0).toFixed(3)+')');
  amb.addColorStop(.55, 'rgba('+cr+','+cg+','+cb+','+(a0*.45).toFixed(3)+')');
  amb.addColorStop(1,   'rgba('+cr+','+cg+','+cb+','+(a0*.14).toFixed(3)+')');
  CX.fillStyle=amb;CX.fillRect(0,0,w,h);
  CX.restore();

  /* --- 2. O FACHO: a luz direta da luminária --- */
  if(Q.facho){
    const g=CX.createRadialGradient(px,py,2,px,py,h*L.alcance);
    const a1=LUZ.facho*n*br;
    g.addColorStop(0,  'rgba('+cr+','+cg+','+cb+','+(a1*.62).toFixed(3)+')');
    g.addColorStop(.26,'rgba('+cr+','+cg+','+cb+','+(a1*.22).toFixed(3)+')');
    g.addColorStop(1,  'rgba(0,0,0,0)');
    CX.fillStyle=g;CX.fillRect(0,0,w,h);
  }

  /* --- 3. O CORPO DA LÂMPADA ---
     Só aparece quando a luminária está de fato acesa. Lâmpada
     apagada não brilha, que é o pedido — o cômodo continua visível
     pelo lampião, mas o vidro dela fica morto. */
  if(L.eletrica||L.fontes.includes('lampiao')){
    const forte=L.eletrica?1:.55;
    CX.fillStyle='rgba(255,'+(L.eletrica?245:228)+','+(L.eletrica?225:170)+','+(.85*br*forte).toFixed(3)+')';
    CX.beginPath();CX.arc(px,py,Math.max(2.5,h*.011*(L.eletrica?1.25:1)),0,7);CX.fill();
  }
};

/* a vinheta cede na mesma medida em que a luz sobe */
const _vinhetaV48=vinheta;
vinheta=function(w,h,f){
  const id=comodoNaTela();
  if(id===null)return _vinhetaV48.apply(this,arguments);
  const n=trava(_luzSuave.id===id?_luzSuave.v:luzDoComodo(id).nivel,0,1.35);
  const escuro=.92*(1-LUZ.cedeVinheta*trava(n,0,1));
  const v=CX.createRadialGradient(w/2,h*.5,h*.16,w/2,h*.5,h*(f||1));
  v.addColorStop(0,'rgba(0,0,0,0)');
  v.addColorStop(1,'rgba(0,0,0,'+escuro.toFixed(3)+')');
  CX.fillStyle=v;CX.fillRect(0,0,w,h);
};

/* ================= A CAUSA RAIZ DO "ESCURO MESMO ACESO" =================
   `aplicarTom` roda DEPOIS do cômodo e da luminária, e à noite pinta
   `rgba(6,7,16,.60)` sobre o quadro inteiro, porque `luzAgora().f`
   cai pra 0,16. Nenhuma lâmpada vencia isso: a luz era desenhada e
   logo em seguida coberta.

   O conserto é conceitual, não numérico. A curva do dia é a luz DE
   FORA; dentro de casa, com a luminária acesa, quem manda é ela.
   Então o fator vira o maior dos dois, e a cor caminha do azul da
   noite pro tom da lâmpada na medida em que a lâmpada domina. De
   dia, ou com tudo apagado, a conta devolve exatamente o que o v48
   já fazia. */
if(typeof aplicarTom==='function'){
  const _tom=aplicarTom;
  aplicarTom=function(w,h){
    const id=comodoNaTela();
    if(id===null)return _tom.apply(this,arguments);
    const fora=(typeof luzAgora==='function')?luzAgora():{f:.6,c:[1,1,1]};
    const L=luzDoComodo(id);
    const n=trava(_luzSuave.id===id?_luzSuave.v:L.nivel,0,1.35);
    const f=trava(Math.max(fora.f,n),.14,1);

    /* o quanto a luminária domina a cena, 0 a 1 */
    const dom=trava((n-fora.f)/Math.max(.001,1-fora.f),0,1);
    /* cor da lâmpada normalizada pra virar multiplicador perto de 1,
       e comprimida: tingir a cena inteira de laranja cheio deixaria
       tudo com cara de filtro, não de lâmpada */
    const m=(L.cor[0]+L.cor[1]+L.cor[2])/3||1;
    const lampada=[1+(L.cor[0]/m-1)*.34,1+(L.cor[1]/m-1)*.34,1+(L.cor[2]/m-1)*.34];
    const c=[0,1,2].map(k=>fora.c[k]+(lampada[k]-fora.c[k])*dom);

    CX.globalCompositeOperation='multiply';
    CX.fillStyle='rgb('+c.map(v=>Math.round(trava(v,0,1.2)*255)).join(',')+')';
    CX.fillRect(0,0,w,h);
    CX.globalCompositeOperation='source-over';
    if(f<.95){
      CX.fillStyle='rgba(6,7,16,'+((1-f)*.72).toFixed(3)+')';
      CX.fillRect(0,0,w,h);
    }
    /* claridade da janela: só de dia e só onde existe janela */
    if(fora.f>.5&&L.luminaria.janela){
      const g=CX.createRadialGradient(w*.72,h*.18,h*.02,w*.72,h*.18,h*.95);
      g.addColorStop(0,'rgba(255,250,232,'+((fora.f-.5)*.30).toFixed(3)+')');
      g.addColorStop(1,'rgba(0,0,0,0)');
      CX.globalCompositeOperation='lighter';
      CX.fillStyle=g;CX.fillRect(0,0,w,h);
      CX.globalCompositeOperation='source-over';
    }
  };
}

/* ================= O INTERRUPTOR =================
   Um botão por cômodo, e só onde existe luminária elétrica. Ele diz
   o que está acontecendo em vez de só alternar em silêncio: sem
   motor, avisa que não há energia. */
if(typeof menuComodo==='function'){
  const _mc=menuComodo;
  menuComodo=function(id){
    const r=_mc.apply(this,arguments);
    try{
      const L=LUMINARIAS[id];
      if(L&&typeof botao==='function'){
        const aceso=interruptor(id), energia=temEnergia();
        botao((aceso?'Apagar ':'Acender ')+L.nome,()=>{
          const novo=acionarLuz(id);
          if(typeof amToca==='function')amToca('porta_maçaneta');
          if(!temEnergia())
            diz('O interruptor faz clique e não acontece nada. Sem o gerador, é só o lampião.','fraco');
          else diz(novo?`${L.d} A sala inteira muda de cara.`:'Você apaga. O lampião assume.','sist');
          menuComodo(id);
        },{custo:energia?(aceso?'acesa':'apagada'):'sem energia',
           cls:aceso&&energia?'chave':''});
      }
    }catch(e){}
    return r;
  };
}

/* o estado das luzes precisa sobreviver ao salvamento. O `carregar`
   do v48 copia qualquer campo que ache, então basta gravar. */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      /* o bloco ANEXA a um save; nunca CRIA um. Sem save na mao,
         nao ha o que anexar — e criar aqui faria nascer um save
         de partida que ainda nao comecou, que e o que apagou a
         abertura narrada. */
      const cru=localStorage.getItem(CHAVE);
      if(!cru)return;
      const d=JSON.parse(cru);
      d.luzes=S.luzes;
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){}
  };
}

/* ---------- leitura de estado, pro resto do jogo e pros testes ---------- */
function luzEstado(id){
  const c=id==null?comodoNaTela():id;
  if(c===null)return {fora:true};
  const L=luzDoComodo(c);
  return {comodo:c, nome:PLANTA[c]?PLANTA[c].nome:'?',
    nivel:+L.nivel.toFixed(3), fontes:L.fontes, eletrica:L.eletrica,
    interruptor:interruptor(c), energia:temEnergia(),
    cor:L.cor.map(v=>Math.round(v)), janela:+luzDaJanela(c).toFixed(3),
    luminaria:L.luminaria.nome};
}

S.luzes=S.luzes||{};
