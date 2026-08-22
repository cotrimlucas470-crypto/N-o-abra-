/* ============ §41 — UM CORPO SÓ (Etapa 3 de 9) ============

   A auditoria achou DOIS sistemas de ferimento rodando em paralelo:

     · `MALES` — 19 entradas com grav, dias, faz, custa, trata, pior,
       vem, urgente, pega e mata. Bom, completo, e o "verbo perdido" do
       B3 ja estava la como `custa`.
     · `S.ferido` — um inteiro escrito em 12 sitios, com cura propria
       em `sararUmPouco`, que nao falava com `passarSaude`.

   Em tres desses sitios o codigo chamava `ferirPor()` (criando um mal)
   E somava no contador. A mesma pancada, contada duas vezes, com dois
   relogios de cura independentes.

   Esta etapa mata o contador paralelo — os 12 sitios ja foram
   convertidos um a um no index.html — e fecha o resto do buraco:

   1 · `S.ferido` vira DERIVADO de MALES (leitura), e escrita nele passa
       a ser recusada em voz alta
   2 · o ferimento ganha PARTE do corpo
   3 · os tres parametros mortos morrem
   4 · os numeros de estado do corpo viram linguagem
   ====================================================================== */

/* ================= 1 · O CONTADOR VIRA DERIVADO =================
   Todo mundo que LIA `S.ferido` continua lendo e continua funcionando —
   sao 8 leituras espalhadas (o odor que a casa sente, a fala do abrigo
   "voce ta mancando faz dias", o placar do fim). O que muda e a fonte:
   agora sai de MALES, que e a unica verdade.

   Escrever nele nao quebra nada, mas nao faz mais nada — e registra,
   pra qualquer sitio que eu tenha deixado passar aparecer no teste em
   vez de ressuscitar o sistema paralelo em silencio. */
function feridoDerivado(){
  try{
    if(typeof saude!=='function'||typeof MALES==='undefined')return 0;
    return saude().reduce((a,m)=>{
      const e=MALES[m.id];
      return a+((e&&e.tipo==='ferida')?(e.grav||1):0);
    },0);
  }catch(e){ return 0; }
}
let _feridoEscritas=0;
try{
  const legado=(typeof S.ferido==='number')?S.ferido:0;
  delete S.ferido;
  Object.defineProperty(S,'ferido',{
    configurable:true, enumerable:true,
    get(){ return feridoDerivado(); },
    set(v){ _feridoEscritas++; /* recusado de proposito: ver cabecalho */ }
  });
  S._feridoLegado=legado;
}catch(e){}
function feridoEscritasRecusadas(){ return _feridoEscritas; }

/* ================= 2 · A PARTE DO CORPO =================
   O briefing pede sete partes com lateralidade. O jogo ja tinha
   `REGIOES` — cinco, sem lado — e ela e usada pela armadura pra saber o
   que cobre o que. As duas convivem: `PARTES` e onde doi, `REGIOES` e o
   que a roupa protege, e `regiaoDaParte` liga uma na outra. */
const PARTES=['cabeca','torso','braco_esq','braco_dir','perna_esq','perna_dir','mao_dominante'];
const PARTE_NOME={cabeca:'a cabeça',torso:'o peito',braco_esq:'o braço esquerdo',
  braco_dir:'o braço direito',perna_esq:'a perna esquerda',perna_dir:'a perna direita',
  mao_dominante:'a mão boa'};
/* "em a perna direita" nao e portugues. A contracao importa aqui mais
   do que em outro lugar qualquer: esta e a frase que substituiu
   "força −28%", e ela so vale a troca se soar como alguem falando. */
function naParte(p){
  const n=PARTE_NOME[p];
  if(!n)return 'no corpo';
  if(n.startsWith('a ')||n.startsWith('o '))return 'n'+n;
  return 'em '+n;
}
function regiaoDaParte(p){
  if(p==='cabeca')return 'cabeca';
  if(p==='torso')return 'torso';
  if(p==='mao_dominante')return 'bracos';
  if(String(p).startsWith('braco'))return 'bracos';
  if(String(p).startsWith('perna'))return 'pernas';
  return 'torso';
}
/* onde cada tipo de ferimento cai. Nao e sorteio livre: e o lugar que a
   ficcao do mal ja sugeria. `torcao` e "torção no pé"; `fratura` diz "o
   braço ou a perna"; `mordida` de bicho que rasteja pega perna. */
const PARTE_DE={
  corte:['braco_esq','braco_dir','mao_dominante'],
  cortefundo:['braco_esq','braco_dir','perna_esq','perna_dir'],
  torcao:['perna_esq','perna_dir'],
  fratura:['braco_esq','braco_dir','perna_esq','perna_dir'],
  queimadura:['mao_dominante','braco_dir','torso'],
  mordida:['perna_esq','perna_dir','braco_esq'],
  pancada:['cabeca','torso'],
  arranhao:['braco_esq','braco_dir','perna_esq'],
  bolha:['perna_esq','perna_dir']
};
function escolherParte(id){
  const l=PARTE_DE[id];
  if(!l||!l.length)return 'torso';
  return sortear(l);
}
/* embrulha `pegarMal` pra toda ferida nascer com endereco */
if(typeof pegarMal==='function'){
  const _corpoPM=pegarMal;
  pegarMal=function(id,alvo,porque,parte){
    const m=_corpoPM.apply(this,arguments);
    try{
      if(m&&!m.parte&&MALES[id]&&MALES[id].tipo==='ferida')
        m.parte=parte||escolherParte(id);
    }catch(e){}
    return m;
  };
}
function partesFeridas(alvo){
  const c={};
  (typeof saude==='function'?saude(alvo):[]).forEach(m=>{ if(m.parte)c[m.parte]=(c[m.parte]||0)+1; });
  return c;
}

/* ================= 3 · OS TRES PARAMETROS MORTOS =================

   3a · `custa.atencao` — quatro males cobram (pancada .25, desidratacao
        .30, dente .15, insonia .35). O codigo travava o valor, ESCREVIA
        "atencao -35%" na ficha do jogador, e nenhuma regra lia. Numero
        impresso na tela sem nada atras — a familia do `costura` da v66.

        Agora ela custa o que o nome dela diz: percepcao. O consumidor
        acabou de nascer no §40 — a antecedencia dos sinais. Cabeca
        batida faz o aviso chegar mais perto, do mesmo jeito que sanidade
        baixa faz. E observavel na hora: o cheiro do Inchado que vinha a
        tres comodos passa a vir a dois. */
if(typeof sinDegradar==='function'){
  const _corpoDeg=sinDegradar;
  sinDegradar=function(sinal,s01){
    const o=_corpoDeg.apply(this,arguments);
    try{
      const at=(typeof custoSaude==='function')?(custoSaude().atencao||0):0;
      if(at>0&&sinal.degradacao!=='nunca'&&sinal.fase!=='iminencia'){
        o.antecedencia=+(o.antecedencia*(1-trava(at,0,.55))).toFixed(2);
        o.atencaoCobrada=+at.toFixed(2);
      }
      /* a trava de justica continua valendo por cima de tudo */
      if(sinal.fase==='iminencia')
        o.antecedencia=Math.max(SIN_CFG.pisoIminencia,o.antecedencia);
    }catch(e){}
    return o;
  };
}

/*   3b · `custa.agua` — so `barriga` cobra, e ninguem lia. Agora a
        barriga desidrata: o gole a mais sai do galao, todo dia. */
if(typeof passarSaude==='function'){
  const _corpoPS=passarSaude;
  passarSaude=function(){
    const r=_corpoPS.apply(this,arguments);
    try{
      const ag=(typeof custoSaude==='function')?(custoSaude().agua||0):0;
      if(ag>0&&S.agua>0){
        const q=Math.min(S.agua,Math.round(ag));
        if(q>0){
          S.agua-=q;
          if(typeof ganhou==='function')ganhou({agua:-q});
          if(Array.isArray(r))r.push(`A barriga não segura água. Foi ${q} de água a mais hoje.`);
        }
      }
    }catch(e){}
    return r;
  };
}

/*   3c · `MALES.dente` — 'dor de dente' era o unico dos 19 males que
        nenhuma tabela de `ferirPor`/`adoecerPor` alcancava. 18 de 19.
        Comida ruim e meses sem escova sao a fonte que a ficcao ja
        pedia. */
if(typeof adoecerPor==='function'){
  const _corpoAD=adoecerPor;
  adoecerPor=function(fonte,alvo){
    if(fonte==='comida'&&chance(.22)){
      const m=pegarMal('dente',alvo,'comida ruim e meses sem escova');
      if(m)return MALES.dente;
    }
    return _corpoAD.apply(this,arguments);
  };
}

/* ================= 4 · O CORPO EM PALAVRAS =================
   O criterio de aceite diz que o jogo nao mostra numero de vida, e o B3
   diz que o jogador tem de conseguir descrever o proprio ferimento sem
   abrir a ficha. "forca -28%" falha nos dois: e numero, e nao diz o que
   ele perdeu.

   Aqui a ficha passa a dizer o VERBO. Cada linha sai de um mal real que
   o jogador tem, com a parte onde doi. */
const VERBO_PERDIDO={
  perna_esq:'Você manca. Correr é uma decisão, não um reflexo.',
  perna_dir:'Você manca. Correr é uma decisão, não um reflexo.',
  braco_esq:'Esse braço não levanta peso hoje.',
  braco_dir:'Esse braço não levanta peso hoje.',
  mao_dominante:'A mão treme no que exige precisão: tranca, curativo, fósforo.',
  torso:'O fôlego acaba antes. Correr custa mais do que custava.',
  cabeca:'Você perde detalhe. O que a casa avisa chega mais tarde.'
};
function corpoEmPalavras(alvo){
  const l=[];
  const males=(typeof saude==='function')?saude(alvo):[];
  const vistas={};
  males.forEach(m=>{
    const e=MALES[m.id]; if(!e)return;
    if(e.tipo==='ferida'&&m.parte&&!vistas[m.parte]){
      vistas[m.parte]=true;
      l.push(`${e.n[0].toUpperCase()+e.n.slice(1)} ${naParte(m.parte)}. `
        +(VERBO_PERDIDO[m.parte]||e.faz));
    }else if(e.tipo!=='ferida'){
      l.push(`${e.n[0].toUpperCase()+e.n.slice(1)}. ${e.faz}`);
    }
  });
  const c=(typeof custoSaude==='function')?custoSaude(alvo):null;
  if(c&&c.horas)l.push(`Você levanta tarde. São ${c.horas}h a menos de dia útil.`);
  return l;
}

/* a ficha para de imprimir porcentagem */
if(typeof custoSaude==='function'){
  /* nao embrulho custoSaude: ela e o motor e continua devolvendo numero
     pra quem calcula. Quem muda e a TELA. */
}
