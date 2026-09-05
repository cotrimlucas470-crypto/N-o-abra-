/* ================= §14 — MOCHILAS E CAPACIDADE =================
   O peso é a decisão.

   O jogo já tinha as 7 mochilas com tier, ruído, furtividade e lentidão.
   O que §14 pede e não existia:

     1. sobrecarga. `cabe()` era sim/não, então passar do teto era
        impossível e o dilema central da seção — voltar rico e devagar
        ou leve e com fome — não podia acontecer. Agora o peso é limite
        MOLE (dá pra forçar, e custa) e o volume continua duro: espaço
        físico não dobra, ombro dobra.
     2. os 6 módulos, com material e risco.
     3. quickSlots valendo alguma coisa. O jogo mostrava "3 bolsos de
        acesso rápido" e não contava nenhum.
     4. descarte em fuga, com recuperação de 55% no dia seguinte.
     5. o rasgo de 4% por saída da sacola.
     6. a costurada à mão: âncora, e perdê-la custa 30 de sanidade.

   Onde a escala do documento não bate com a do jogo, o comentário diz
   qual número virou qual. Onde bate — volume de item é 1 a 9 aqui e
   slot é slot lá — o número é o do documento, sem conversão. */

/* ---------- peso de verdade ----------
   pesoMochila() mente conforme o estágio de sanidade. A conta de
   sobrecarga não pode mentir para si mesma: o ombro sabe. */
function pesoReal(){
  const antes=S._verdade;S._verdade=1;
  const v=pesoAtual();S._verdade=antes;
  return v;
}
function razaoCarga(){
  const inf=mochilaInfo();
  return pesoReal()/Math.max(1,inf.kg);
}

/* ---------- a tabela de sobrecarga, literal ---------- */
const TETO_FORCADO=1.35;   /* onde a alça arrebenta de vez */
function sobrecarga(){
  const r=razaoCarga();
  if(r<=.70)return {r,vel:0, fadiga:1.0, ruido:0};
  if(r<=.90)return {r,vel:-1,fadiga:1.3, ruido:10};
  if(r<=1.00)return {r,vel:-2,fadiga:1.7, ruido:25, san:-1};
  return {r,vel:-4,fadiga:2.5,ruido:45,queda:.20,
    txt:'A alça morde o ombro. Alguma coisa cai atrás de você. Você não volta pra ver.'};
}
function estaSobrecarregado(){return razaoCarga()>.90;}

/* ---------- módulos (§14, tabela 2) ----------
   O jogo não tem tecido, couro, espuma nem tinta. Tem lona, fio, arame
   e vedante — que é fita. A receita é a mesma coisa dita no vocabulário
   de material que este mundo usa. */
const MODULOS={
 bolso:{n:'Bolso lateral',vol:2,
   mat:{lona2:3,fio:1},risco:'',
   d:'Costurado do lado, com sobra de lona.'},
 cinto:{n:'Cinto de carga',kg:4,rap:1,ruido:1,
   mat:{lona2:2,arame:2},risco:'as fivelas batem quando você anda',
   d:'Tira o peso do ombro e joga na cintura.'},
 coldre:{n:'Coldre de lâmina',armaForaDoVolume:true,furt:.06,
   mat:{lona2:2,fio:1},risco:'a arma fica à vista',
   d:'A faca deixa de morar no fundo da mochila.'},
 forro:{n:'Forro de espuma',ruidoPct:-50,vol:-2,
   mat:{lona2:2,vedante:1},risco:'come 2 de espaço',
   d:'Forra por dentro. Nada mais tine lá dentro.'},
 alca:{n:'Alça reforçada',semRasgo:true,
   mat:{vedante:1,arame:1},risco:'',
   d:'Fita e arame na costura que sempre abre.'},
 oculto:{n:'Compartimento oculto',oculto:2,rap:-1,
   mat:{lona2:2,fio:1},risco:'perde um bolso de acesso rápido',
   d:'Um vão entre o forro e o fundo. Ninguém acha o que não procura.'}
};
function mods(){
  if(!Array.isArray(S.mods))S.mods=[];
  S.mods=S.mods.filter(k=>MODULOS[k]);
  return S.mods;
}
function temMod(k){return mods().includes(k);}
function somaMod(campo){
  return mods().reduce((s,k)=>s+(MODULOS[k][campo]||0),0);
}

/* ---------- os módulos entram na capacidade ---------- */
const _infoM=mochilaInfo;
mochilaInfo=function(){
  const base=_infoM.apply(null,arguments);
  return {...base,
    kg:base.kg+somaMod('kg'),
    vol:Math.max(1,base.vol+somaMod('vol'))};
};

/* ---------- ruído: o forro corta metade ---------- */
const _ruidoM=ruidoMochila;
ruidoMochila=function(){
  let r=_ruidoM.apply(null,arguments)+somaMod('ruido');
  const pct=somaMod('ruidoPct');
  if(pct)r=r*(1+pct/100);
  return Math.max(0,Math.round(r*10)/10);
};

/* ---------- volume: o coldre tira a arma do fundo ---------- */
const _volM=volumeAtual;
volumeAtual=function(){
  const v=_volM.apply(null,arguments);
  if(!temMod('coldre'))return v;
  /* a maior lâmina sai do volume — e passa a andar à vista */
  const armas=mochila().itens.filter(x=>CATALOGO[x.id]&&CATALOGO[x.id].cat==='arma');
  if(!armas.length)return v;
  const maior=armas.reduce((a,b)=>CATALOGO[a.id].vol>=CATALOGO[b.id].vol?a:b);
  return Math.max(0,v-CATALOGO[maior.id].vol);
};

/* ---------- peso é limite mole; volume, duro ----------
   §14: "voltar rico e devagar OU leve e com fome". Essa escolha só
   existe se dá pra sair carregado demais. */
const _cabeM=cabe;
cabe=function(id,q){
  q=q||1;
  const e=CATALOGO[id];if(!e)return false;
  if(e.mao)return _cabeM(id,q);
  const inf=mochilaInfo();
  if(volumeAtual()+e.vol*q>inf.vol)return false;
  return pesoMochila()+e.kg*q<=inf.kg*TETO_FORCADO;
};

/* ---------- o preço da sobrecarga, onde dói ---------- */
/* ruído por hora andando: os +10/+25/+45 da tabela, diluídos na hora */
const _gastarS=gastarHoras;
gastarHoras=function(h){
  const r=_gastarS.apply(null,arguments);
  const s=sobrecarga();
  if(h>0&&s.ruido)S.ruido=trava(S.ruido+s.ruido*.07*h,0,100);
  return r;
};
/* fuga e esconderijo: cada degrau de velocidade perdida pesa */
const _pesoFerS=pesoFerido;
pesoFerido=function(){
  return trava(_pesoFerS.apply(null,arguments)+Math.abs(sobrecarga().vel)*.045,0,.78);
};
/* a expedição inteira demora mais */
const _horasS=horasDe;
horasDe=function(l,par){
  return trava(_horasS.apply(null,arguments)+Math.abs(sobrecarga().vel)*.5,2,13);
};

/* ---------- quick slots: 1 rolagem = 1 item ---------- */
function quickTotal(){
  return Math.max(0,(tierAtual().rap||0)+somaMod('rap'));
}
function quickRestante(){
  if(S._quickUsado==null)S._quickUsado=0;
  return Math.max(0,quickTotal()-S._quickUsado);
}
function gastarQuick(){S._quickUsado=(S._quickUsado||0)+1;}
/* cada encontro devolve os bolsos */
if(typeof encontroRua==='function'){
  const _encS=encontroRua;
  encontroRua=function(){S._quickUsado=0;return _encS.apply(this,arguments);};
}
/* o bolso médico passa a respeitar o número que a tela sempre mostrou */
if(typeof usarCompMed==='function'){
  const _compS=usarCompMed;
  usarCompMed=function(){
    if(quickRestante()<=0)return {t:'Você não alcança mais nada a tempo.'};
    const r=_compS.apply(this,arguments);
    if(r&&!/não alcança/.test(r.t))gastarQuick();
    return r;
  };
}

/* ---------- compartimento oculto ----------
   §14: "2 slots invisíveis em revista humana". A revista humana deste
   jogo são os saqueadores, que levam tudo que é de ferro. O que está
   costurado entre o forro e o fundo eles não acham. */
function nomeArma(id){
  const i=(typeof ITENS!=='undefined'?ITENS:[]).find(x=>x.id===id);
  return i?i.n:id;
}
/* guarda ids de arma — é isso que o assalto varre */
function oculto(){
  if(!Array.isArray(S.oculto))S.oculto=[];
  const n=somaMod('oculto');
  S.oculto=n?S.oculto.slice(0,n):[];
  return S.oculto;
}
if(typeof assalto==='function'){
  const _saqS=assalto;
  assalto=async function(){
    const guardado=oculto().slice();
    const r=await _saqS.apply(this,arguments);
    if(guardado.length&&(!S.armas||!S.armas.length)){
      S.armas=(S.armas||[]).concat(guardado);
      S.oculto=[];
      diz(`Não acharam o que estava costurado no forro: ${guardado.map(nomeArma).join(', ')}.`,'bom');
    }
    return r;
  };
}

/* ---------- rasgo: 4% por saída ---------- */
function podeRasgar(){
  return mochila().tipo==='sacola'&&!temMod('alca');
}
function rolarRasgo(){
  if(!podeRasgar()||!chance(.04))return false;
  const m=mochila();
  const perdeu=m.itens.length?m.itens.pop():null;
  mochila().tipo='nenhuma';
  diz('A alça da sacola abre no meio do caminho.','perigo');
  if(perdeu)diz(`${CATALOGO[perdeu.id].n} rola pro bueiro antes de você alcançar.`,'perigo');
  diz('Você segue com o que cabe nos bolsos.','sist');
  return true;
}

/* ---------- sobrecarga cobra na saída ---------- */
function precoDaSaida(){
  const s=sobrecarga();
  if(s.san){mexerSan(s.san,'saiu carregado demais');}
  if(s.queda&&chance(s.queda)){
    const m=mochila();
    if(m.itens.length){
      const caiu=m.itens.pop();
      diz(s.txt,'perigo');
      diz(`Era ${CATALOGO[caiu.id].n}.`,'fraco');
    }
  }
  rolarRasgo();
}

/* ---------- descarte em fuga (§14) ----------
   "Na tela de encontro, com sobrecarga acima de 0.90, aparece a opção." */
const _fugaS=fuga;
fuga=async function(ctx,levar,b,penal){
  if(!estaSobrecarregado()||!mochila().itens.length){
    return _fugaS.apply(this,arguments);
  }
  const eu=this;
  const escolha=await new Promise(res=>{
    AC.innerHTML='';
    diz('O peso não deixa você correr do jeito que precisava.','alerta');
    botao('Largar a mochila e correr',()=>res(true),
      {cls:'prim',custo:'perde tudo que está dentro'});
    botao('Segurar tudo e correr assim mesmo',()=>res(false),
      {custo:Math.round(razaoCarga()*100)+'% do que a alça aguenta'});
  });
  if(!escolha)return _fugaS.call(eu,ctx,levar,b,penal);

  const m=mochila();
  S.largada={
    loc:(ctx&&ctx.l&&ctx.l.id)||null,
    nomeLoc:(ctx&&ctx.l&&ctx.l.n)||'algum lugar',
    dia:S.dia,tipo:m.tipo,itens:m.itens.slice()
  };
  const ancora=(MOCHILAS[m.tipo]||{}).ancora;
  m.itens=[];m.tipo='nenhuma';
  AC.innerHTML='';
  diz('A alça sai do ombro e o peso vai embora junto com o dia inteiro de trabalho.','perigo');
  if(ancora){
    diz('Ela costurou aquilo à mão, ponto por ponto, e agora está na calçada atrás de você.','perigo');
    mexerSan(-30,'largou a mochila costurada à mão');
  }
  await pausa(900);
  /* §14 dá "+3 velocidade imediata". Aqui a fuga é uma chance, e o que
     mais pesa nela é o `penal`. Sem a mochila você cai um degrau inteiro
     de penalidade — o mesmo que a tabela chama de +3. */
  return _fugaS.call(eu,ctx,levar,b,Math.max(0,penal-1));
};

/* ---------- recuperação no dia seguinte: 55% ---------- */
function tentarRecuperarLargada(l){
  const L=S.largada;
  if(!L||!l||L.loc!==l.id||S.dia<=L.dia)return;
  S.largada=null;
  if(!chance(.55)){
    diz('A mochila não está mais onde você deixou.','perigo');
    S.largadaPerdida={dia:S.dia,n:(MOCHILAS[L.tipo]||{}).n||'a mochila',
      quando:S.dia+2+_inteiro(4)};
    return;
  }
  const m=mochila();
  if((MOCHILAS[L.tipo]||{}).kg>(MOCHILAS[m.tipo]||{}).kg||m.tipo==='nenhuma')m.tipo=L.tipo;
  let voltou=0;
  const sobra=[];
  L.itens.forEach(it=>{
    if(cabe(it.id,it.q)){m.itens.push(it);voltou++;}
    else sobra.push(it);
  });
  if(sobra.length)S.stash=(S.stash||[]).concat(sobra);
  diz('Está onde você deixou. Molhada, mas está.','bom');
  if(voltou)diz(`${voltou} ${voltou===1?'coisa voltou':'coisas voltaram'} pra dentro.`,'sist');
  if(sobra.length)diz(`${sobra.length} não coube e ficou pra trás.`,'fraco');
}
/* "o item aparece descrito no rádio dias depois, nas mãos de outra pessoa" */
function radioSobreALargada(){
  const P=S.largadaPerdida;
  if(!P||S.dia<P.quando)return;
  S.largadaPerdida=null;
  diz('O rádio pega uma voz descrevendo o que trocou por comida hoje.','sist');
  diz(`“${P.n}, dessas boas. Estava caída na rua, quase nova.”`,'fala');
}

/* ---------- os dois ganchos da saída ---------- */
if(typeof expedicao==='function'){
  const _expS=expedicao;
  expedicao=async function(l,par){
    radioSobreALargada();
    tentarRecuperarLargada(l);
    precoDaSaida();
    return _expS.apply(this,arguments);
  };
}

/* ---------- a costurada à mão (§14, lendária) ----------
   "Feita pela pessoa que você perdeu." Só existe se você perdeu alguém. */
MOCHILAS.costurada={n:'Mochila costurada à mão',kg:26,vol:26,raro:9,ancora:true,
  d:'Ponto torto no fundo, do jeito que só quem não sabia costurar fazia.'};
TIER.costurada={tier:4,min:0,drop:0,ruido:0,furt:0,lento:0,rap:4,comp:['med','mun'],som:'pano'};

function podeCosturar(){
  return !S.costurou&&(S.mortos||[]).length>0&&S.oficinaNivel>0
    &&temMat('lona2',4)&&temMat('fio',2);
}
function costurarMochila(volta){
  const quem=(S.mortos||[])[S.mortos.length-1];
  gastarMat('lona2',4);gastarMat('fio',2);
  S.costurou=1;
  const velha=mochila().tipo;
  mochila().tipo='costurada';
  if(velha!=='nenhuma')diz(`A ${(MOCHILAS[velha]||{}).n||'antiga'} fica pendurada no prego.`,'fraco');
  diz(`Você usa a lona que ${quem?quem.n:'ela'} guardava e costura do jeito que dava.`,'narr');
  diz('Não faz barulho nenhum. Quatro bolsos. O ponto do fundo é torto.','bom');
  mexerSan(6,'costurou a mochila');
  if(volta)volta();
}

/* ---------- a tela mostra tudo isso ---------- */
const _telaS=telaMochilaInfo;
telaMochilaInfo=function(volta){
  _telaS.call(this,volta);
  const s=sobrecarga();
  const pct=Math.round(s.r*100);
  if(s.r>1)diz(`${pct}% do que a alça aguenta. Você está passando do que dá.`,'perigo');
  else if(s.r>.90)diz(`${pct}% do que a alça aguenta. No limite.`,'perigo');
  else if(s.r>.70)diz(`${pct}% do que a alça aguenta.`,'alerta');
  const p=[];
  if(s.vel)p.push(`${Math.abs(s.vel)*.5}h a mais por expedição`);
  if(s.ruido)p.push('+'+s.ruido+' de ruído');
  if(s.san)p.push('come sanidade a cada saída');
  if(s.queda)p.push('20% de deixar cair alguma coisa por saída');
  if(p.length)diz('Sobrecarga: '+p.join(' · ')+'.','perigo');

  diz(`Acesso rápido: ${quickRestante()} de ${quickTotal()}.`,'sist');
  if(podeRasgar())diz('A alça desta sacola está por um fio. 4% de abrir por saída.','alerta');
  if(mods().length)diz('Costurado nela: '+mods().map(k=>MODULOS[k].n).join(', ')+'.','bom');
  if(temMod('oculto')){
    const O=oculto(),n=somaMod('oculto');
    diz(`No forro: ${O.length?O.map(nomeArma).join(', '):'nada'} (${O.length}/${n}).`,'sist');
    (S.armas||[]).forEach(id=>{
      if(oculto().length>=n||O.includes(id))return;
      botao('Costurar '+nomeArma(id)+' no forro',()=>{
        S.armas=S.armas.filter(x=>x!==id);oculto().push(id);
        diz('Some entre o forro e o fundo. Quem revistar não acha.','bom');
        telaMochilaInfo(volta);
      },{custo:'some da revista'});
    });
    O.slice().forEach(id=>{
      botao('Tirar '+nomeArma(id)+' do forro',()=>{
        S.oculto=oculto().filter(x=>x!==id);
        S.armas=(S.armas||[]).concat([id]);
        telaMochilaInfo(volta);
      },{custo:'volta pra mão'});
    });
  }
  if(S.largada)diz(`Você largou uma mochila em ${S.largada.nomeLoc}. Volte lá amanhã.`,'alerta');

  if(podeCosturar())botao('Costurar uma mochila com a lona dela',()=>costurarMochila(()=>telaMochilaInfo(volta)),
    {cls:'prim',custo:'4 lonas · 2 fios'});
  if(S.oficinaNivel>0&&mochila().tipo!=='nenhuma')
    botao('Costurar um módulo na mochila',()=>telaModulos(volta),{custo:'bancada'});
};

function telaModulos(volta){
  AC.innerHTML='';limpar();cap('Módulos');
  diz('O que dá pra costurar nela. Cada um cobra o seu.','sist');
  Object.keys(MODULOS).forEach(k=>{
    const M=MODULOS[k];
    const falta=Object.keys(M.mat).filter(m=>!temMat(m,M.mat[m]));
    const custo=Object.keys(M.mat).map(m=>`${M.mat[m]} ${(MATE[m]||{n:m}).n}`).join(' · ');
    if(temMod(k)){diz(`${M.n} — já costurado.${M.risco?' ('+M.risco+')':''}`,'fraco');return;}
    botao(M.n+(M.risco?' — '+M.risco:''),()=>{
      Object.keys(M.mat).forEach(m=>gastarMat(m,M.mat[m]));
      mods().push(k);
      diz(M.d,'narr');
      diz(`${M.n} costurado.`,'bom');
      telaModulos(volta);
    },{custo,falta:falta.length?'falta '+falta.map(m=>(MATE[m]||{n:m}).n).join(', '):''});
  });
  botao('Voltar',()=>telaMochilaInfo(volta),{cls:'chave'});
}
