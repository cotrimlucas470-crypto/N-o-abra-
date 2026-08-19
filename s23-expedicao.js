/* ============ §23 — EXPEDIÇÃO TRANSACIONAL E ERRO QUE NÃO PUNE ============

   O QUE ESTAVA ERRADO
   -------------------
   O que você juntava numa expedição vivia em duas variáveis locais —
   `ctx.achados` (o que tinha no chão) e `levar` (o que você escolheu
   carregar) — e só virava recurso de verdade na ÚLTIMA função da
   cadeia, `recolher()`. Entre escolher e creditar havia telas, esperas,
   sorteios e encontros. Qualquer exceção em qualquer ponto desse
   caminho apagava 100% do saque, e o vigia (`socorro`) oferecia
   "Voltar pra dentro de casa" — que devolvia o jogador pra casa de mãos
   vazias sem nunca dizer o que aconteceu.

   O QUE MUDA AQUI
   ---------------
   1. O `levar` deixa de ser variável local e passa a ser `S.exped.levar`
      — dentro do estado salvo. Mesma referência, então tudo que já mexia
      nele (a fuga que corta 40%, o susto que corta pela metade) continua
      funcionando sem uma linha alterada. A diferença é que agora ele
      sobrevive a um travamento.
   2. Cada pegada marca o save como sujo. O que está na sua mão está no
      disco.
   3. Se o jogo cair no meio da rua, na próxima abertura o que você já
      tinha pegado volta com você. Não some.
   4. `socorro()` para de ser um teleporte que descarta trabalho: com
      expedição aberta, ele credita o que você pegou antes de te levar
      pra casa, e diz isso na tela.
   5. Erro deixa de ser engolido: vai pro console com contexto e fica
      num anel de 20 em `S.erros`, visível na tela de socorro.

   O QUE NÃO MUDA
   --------------
   Perder saque para um bicho continua sendo regra do jogo. Fugir custa
   40% do que você carregava — isso é design, não defeito, e continua
   valendo. O que não pode mais acontecer é perder por causa de bug.
   ======================================================================= */

/* ---------- registro de erro, que antes não existia ---------- */
const ERROS_MAX=20;
function registrarErro(e,onde){
  try{
    S.erros=S.erros||[];
    const reg={quando:Date.now(), dia:S.dia, onde:onde||'?',
      msg:(e&&e.message)||String(e),
      pilha:((e&&e.stack)||'').split('\n').slice(0,4).join(' | ')};
    S.erros.push(reg);
    while(S.erros.length>ERROS_MAX)S.erros.shift();
    /* no console com contexto: é o único jeito de alguém consertar */
    console.error('[não abra] '+reg.onde+':', e);
  }catch(x){}
}

/* ---------- validação defensiva de achado ----------
   Item sem nome, sem quantidade ou com peso maluco não pode derrubar a
   tela: é registrado e ignorado. */
function achadoValido(a,i){
  if(!a||typeof a!=='object'){registrarErro(new Error('achado nulo no índice '+i),'achadoValido');return false;}
  if(typeof a.n!=='string'||!a.n){registrarErro(new Error('achado sem nome no índice '+i),'achadoValido');return false;}
  const q=Number(a.q), kg=Number(a.kg);
  if(!isFinite(q)||q<=0){registrarErro(new Error('achado "'+a.n+'" com quantidade '+a.q),'achadoValido');return false;}
  if(!isFinite(kg)||kg<0){registrarErro(new Error('achado "'+a.n+'" com peso '+a.kg),'achadoValido');return false;}
  if(a.item&&!a.item.id){registrarErro(new Error('achado "'+a.n+'" tem item sem id'),'achadoValido');return false;}
  return true;
}

/* ---------- o livro-caixa da expedição ----------
   Projeção enxuta e serializável do que `recolher()` realmente lê. Não
   guardo o objeto do item inteiro: guardo os campos que viram recurso,
   pra recuperação não depender de nada que possa ter mudado de formato
   entre versões. */
function projetarAchado(a){
  const p={n:a.n, q:Number(a.q)||0, kg:Number(a.kg)||0};
  if(a.estragada)p.estragada=1;
  if(a.item){
    const it=a.item;
    p.item={id:it.id, n:it.n};
    ['diesel','remedio','oficina','lanterna','semente','reforco','especial','dano']
      .forEach(k=>{ if(it[k]!==undefined)p.item[k]=it[k]; });
  }
  return p;
}
function abrirLivro(ctx){
  const bons=(ctx.achados||[]).filter(achadoValido);
  if(bons.length!==(ctx.achados||[]).length)
    ctx.achados=bons;                       /* achado inválido some do chão */
  S.exped={ativa:1, local:(ctx.l&&ctx.l.id)||'?', dia:S.dia,
    achados:bons.map(projetarAchado), levar:{}};
  if(typeof marcarSujo==='function')marcarSujo();
  return S.exped.levar;
}
function anotarNoLivro(){
  /* chamado a cada pegar/largar: o que está na sua mão vai pro disco */
  if(typeof marcarSujo==='function')marcarSujo();
}
function fecharLivro(){
  if(S.exped)S.exped.ativa=0;
  S.exped=null;
  if(typeof marcarSujo==='function')marcarSujo();
}
function livroAberto(){ return !!(S.exped&&S.exped.ativa); }
function livroTemCoisa(){
  if(!livroAberto())return false;
  return Object.keys(S.exped.levar||{}).some(k=>(S.exped.levar[k]|0)>0);
}

/* ---------- creditar o livro ----------
   Mesmas regras de `recolher()`, aplicadas sobre a projeção. Usado na
   recuperação depois de travamento e no socorro. `recolher()` normal
   continua fazendo o dele; aqui só existe pra quando ele NÃO chegou. */
function creditarLivro(){
  if(!livroAberto())return null;
  const L=S.exped.levar||{}, A=S.exped.achados||[];
  let d=0,c=0,r=0; const armas=[], obs=[];
  A.forEach((a,i)=>{
    const q=Math.max(0,L[i]|0); if(!q)return;
    try{
      if(a.n==='diesel')d+=q;
      else if(a.n==='comida')c+=q;
      else if(a.n==='remedio')r+=q;
      else if(a.estragada){S.estragadas=(S.estragadas||0)+q;S.comida+=q;}
      else if(a.item){
        const it=a.item;
        if(it.dano){S.armas=S.armas||[];
          if(!S.armas.includes(it.id)){S.armas.push(it.id);armas.push(it.n||it.id);}}
        if(it.diesel)d+=it.diesel;
        if(it.remedio)r+=it.remedio;
        if(it.oficina&&S.oficinaNivel<2)S.oficinaNivel++;
        if(it.lanterna)S.lanterna=true;
        if(it.semente)S.temSemente=true;
        if(it.reforco&&typeof pregar==='function')pregar(it.reforco);
        if(it.especial==='peca')S.peca=true;
      }
    }catch(e){ registrarErro(e,'creditarLivro['+i+'] '+a.n); }
  });
  S.diesel=trava(S.diesel+d,0,100); S.comida+=c; S.remedio+=r;
  if(typeof ganhou==='function')ganhou({diesel:d,comida:c,remedio:r});
  fecharLivro();
  return {diesel:d,comida:c,remedio:r,armas,obs};
}

/* ---------- etapaCarga, agora escrevendo no livro ----------
   Substituída inteira porque o `levar` dela era uma variável local: não
   dá pra alcançar por embrulho. O comportamento visível é o mesmo — a
   diferença é onde o número mora. */
if(typeof etapaCarga==='function'){
  etapaCarga=function(E,ctx){
    let cap;
    try{ cap=capacidade(ctx.par); }
    catch(e){
      /* nunca mais deixar esta tela morrer calada: sem capacidade
         confiável, usa o que a mochila declara e segue */
      registrarErro(e,'etapaCarga/capacidade');
      cap=(typeof mochilaInfo==='function')?Math.round(mochilaInfo().kg):20;
    }
    const levar=abrirLivro(ctx);
    limpar();cap2('O que você carrega');
    diz(`Você acha mais do que consegue levar. Cabem ${cap} quilos${ctx.par?' entre os dois':' nas suas costas'}.`,'sist');
    const render=()=>{
      let peso=0;
      ctx.achados.forEach((a,i)=>{peso+=(levar[i]||0)*a.kg;});
      limpar();cap2('O que você carrega');
      diz(`${Math.round(peso)} de ${cap} quilos.`,peso>cap?'perigo':'sist');
      ctx.achados.forEach((a,i)=>{
        const q=levar[i]||0;
        ficha(a.n,q+' de '+a.q,a.kg+' kg cada');
      });
      AC.innerHTML='';
      ctx.achados.forEach((a,i)=>{
        const q=levar[i]||0;
        if(q<a.q&&peso+a.kg<=cap)
          botao('Pegar mais '+a.n,()=>{levar[i]=q+1;anotarNoLivro();render();},{custo:'+'+a.kg+' kg'});
        if(q>0)botao('Largar '+a.n,()=>{levar[i]=q-1;anotarNoLivro();render();},{custo:'−'+a.kg+' kg'});
      });
      botao('Encher a mochila com o que cabe',()=>{
        let p=0;
        ctx.achados.forEach((a,i)=>{
          levar[i]=0;
          while(levar[i]<a.q&&p+a.kg<=cap){levar[i]++;p+=a.kg;}
        });
        anotarNoLivro();render();
      },{custo:'automático'});
      botao('Ir embora com isso',()=>etapaSair(E,ctx,levar),{cls:'prim'});
    };
    render();
  };
}

/* ---------- o livro fecha quando a expedição termina de verdade ---------- */
if(typeof recolher==='function'){
  const _recolher=recolher;
  recolher=async function(ctx,levar,ferido){
    let r;
    try{ r=await _recolher.call(this,ctx,levar,ferido); }
    catch(e){
      /* se `recolher` cair no meio, o que já estava no livro ainda é
         seu: credita o que sobrou em vez de perder tudo */
      registrarErro(e,'recolher');
      const cr=creditarLivro();
      if(cr&&(cr.diesel||cr.comida||cr.remedio))
        diz(`Deu problema na volta, mas o que você carregava chegou: ${cr.diesel} de diesel, ${cr.comida} de comida.`,'alerta');
      throw e;
    }
    fecharLivro();
    return r;
  };
}

/* ---------- recuperação depois de travamento ----------
   Abriu o jogo e havia expedição aberta? Você estava na rua com coisa na
   mão. Ela volta com você. */
function recuperarExpedicao(){
  if(!livroAberto())return null;
  if(!livroTemCoisa()){ fecharLivro(); return null; }
  const cr=creditarLivro();
  if(!cr)return null;
  const partes=[];
  if(cr.diesel)partes.push(cr.diesel+' de diesel');
  if(cr.comida)partes.push(cr.comida+' de comida');
  if(cr.remedio)partes.push(cr.remedio+' de remédio');
  if(cr.armas.length)partes.push(cr.armas.join(', '));
  if(!partes.length)return null;
  return partes.join(', ');
}

/* ---------- socorro que não descarta trabalho ----------
   O vigia continua existindo — sem ele o jogador fica olhando uma tela
   morta. O que muda é que ele deixou de ser um teleporte que joga fora o
   que estava em curso, e passou a dizer o que aconteceu. */
if(typeof socorro==='function'){
  const _socorro=socorro;
  socorro=function(){
    const tinha=livroTemCoisa();
    let recuperado=null;
    if(tinha){
      try{ recuperado=recuperarExpedicao(); }
      catch(e){ registrarErro(e,'socorro/recuperar'); }
    }
    const r=_socorro.apply(this,arguments);
    try{
      if(recuperado)
        diz('O que você já tinha pegado veio junto: '+recuperado+'. Isso não se perde.','bom');
      const ult=(S.erros||[])[ (S.erros||[]).length-1 ];
      if(ult)diz('Anota isso se for me contar: '+ult.onde+' — '+ult.msg,'fraco');
    }catch(e){}
    return r;
  };
}

/* ---------- o erro global para de ser jogado fora ---------- */
addEventListener('error',e=>{
  registrarErro(e.error||new Error(e.message||'erro sem mensagem'),
    'window.error '+((e.filename||'').split('/').pop()||'')+':'+(e.lineno||0));
});
addEventListener('unhandledrejection',e=>{
  registrarErro(e.reason||new Error('promessa rejeitada sem motivo'),'unhandledrejection');
});

/* ---------- persistência ---------- */
if(typeof salvar==='function'){
  const _sv=salvar;
  salvar=function(){
    _sv.apply(this,arguments);
    try{
      const d=JSON.parse(localStorage.getItem(CHAVE)||'{}');
      d.exped=S.exped||null;
      d.erros=S.erros||[];
      localStorage.setItem(CHAVE,JSON.stringify(d));
    }catch(e){ registrarErro(e,'salvar/exped'); }
  };
}

/* ---------- backup do save ----------
   O save é gravado em SETE passos, um por bloco, cada um lendo a chave
   inteira, acrescentando os campos dele e regravando. Medido: 7
   escritas, 6 JSON.parse, 0,41 ms, 1,8 KB. O custo é irrelevante; o
   problema é que não havia de onde voltar. Uma gravação ruim, uma
   migração errada ou uma das sete falhando no meio deixava o jogador
   sem partida e sem alternativa.

   Agora, antes da primeira gravação de cada save, o conteúdo anterior
   — se for JSON válido — vai pra uma chave de sombra. E na carga, se o
   principal estiver quebrado, o backup entra no lugar. Uma geração só:
   não é histórico, é rede. */
const CHAVE_BAK=(typeof CHAVE!=='undefined'?CHAVE:'naoabra')+'-bak';
let _bakFeitoNesteSave=false;
if(typeof salvar==='function'){
  const _sv2=salvar;
  salvar=function(){
    if(!_bakFeitoNesteSave){
      _bakFeitoNesteSave=true;
      try{
        const atual=localStorage.getItem(CHAVE);
        if(atual){
          JSON.parse(atual);                    /* só copia o que é válido */
          localStorage.setItem(CHAVE_BAK,atual);
        }
      }catch(e){ /* principal já estava corrompido: preserva o backup */ }
      /* solta a trava no fim do turno, pra próxima chamada fazer backup
         do estado novo em vez de gravar sete cópias do mesmo */
      setTimeout(()=>{_bakFeitoNesteSave=false;},0);
    }
    return _sv2.apply(this,arguments);
  };
}
/* devolve o save utilizável: o principal se ele fizer sentido, o backup
   se não. Quem chama decide o que fazer. */
function saveUtilizavel(){
  const ler=k=>{
    try{
      const t=localStorage.getItem(k); if(!t)return null;
      const o=JSON.parse(t);
      /* um save de verdade tem dia. Objeto vazio ou lixo não serve. */
      if(!o||typeof o!=='object'||typeof o.dia!=='number')return null;
      return o;
    }catch(e){ return null; }
  };
  const bom=ler(CHAVE);
  if(bom)return {de:'principal',dados:bom};
  const bak=ler(CHAVE_BAK);
  if(bak)return {de:'backup',dados:bak};
  return {de:null,dados:null};
}
if(typeof carregar==='function'){
  const _cg=carregar;
  carregar=function(){
    const u=saveUtilizavel();
    if(u.de==='backup'){
      /* o principal está ilegível: repõe a partir da sombra ANTES de
         `carregar` ler, senão ele lê o lixo */
      try{
        localStorage.setItem(CHAVE,JSON.stringify(u.dados));
        console.warn('[não abra] save principal ilegível; voltei pro backup');
      }catch(e){}
    }
    return _cg.apply(this,arguments);
  };
}

/* Migração: save antigo não tem `exped` nem `erros`, e a ausência já é o
   estado correto — ninguém estava no meio de uma expedição. Nada a
   converter, e nada quebra. */
if(S.exped===undefined)S.exped=null;
if(!Array.isArray(S.erros))S.erros=[];

/* Ao carregar um save com expedição aberta, o saque volta pra casa junto
   com você. Fica pro primeiro quadro depois da carga, pra `diz` já ter
   uma tela onde escrever. */
setTimeout(()=>{
  try{
    if(!livroAberto())return;
    const t=recuperarExpedicao();
    if(t)diz('Você tinha saído e o jogo caiu no meio. O que estava com você chegou: '+t+'.','bom');
    else fecharLivro();
  }catch(e){ registrarErro(e,'recuperarExpedicao'); }
},2500);

function expedEstado(){
  return {aberto:livroAberto(), temCoisa:livroTemCoisa(),
    levar:S.exped?{...S.exped.levar}:null,
    achados:S.exped?S.exped.achados.length:0,
    erros:(S.erros||[]).length};
}
