/* ============ §43 — O PONTO DE NÃO RETORNO (Etapa 5 de 9) ============

   A8 do briefing: entrar em camada >= 3 pergunta UMA vez, de forma
   diegetica, e depois a rota de volta muda. Voltar e o segundo jogo.

   O desenho tem uma regra que eu nao quis quebrar: o bloqueio nunca
   pode fechar TODOS os caminhos. A planta e uma grade 3x3 e sempre tem
   volta por fora — o preco de voltar e o desvio, nao a prisao. Fechar a
   unica saida seria softlock, e softlock e bug, nao tensao.
   ====================================================================== */

const RET_CFG={
  camadaQuePergunta: 3,
  /* minutos a mais pra atravessar um comodo bloqueado */
  custoDoDesvio: 9,
  /* e o barulho de forcar passagem */
  ruidoDoDesvio: 3.5,
  /* quantos turnos o bloqueio dura antes de ceder sozinho */
  duracao: 14
};

const RET_BLOQUEIOS=[
  {id:'porta',   t:id=>`A porta ${DE_ONDE(id)} emperrou. Ela abria pra dentro, e agora não abre.`,
   forcar:'Você põe o ombro e ela cede com um estalo que a casa inteira ouviu.'},
  {id:'agua',    t:id=>`${DE_ONDE(id)} alagou. A água está na altura do joelho e escura.`,
   forcar:'Você atravessa devagar, sem ver onde pisa. Demora o dobro.'},
  {id:'entulho', t:id=>`Caiu coisa do teto ${DE_ONDE(id)}. Tem uma pilha no meio da passagem.`,
   forcar:'Você tira tábua por tábua. Cada uma faz barulho.'},
  {id:'ocupado', t:id=>`Tem alguma coisa parada ${DE_ONDE(id)}. Parada, não passando.`,
   forcar:'Você passa rente à parede, prendendo a respiração. Ela não se move.'}
];
function DE_ONDE(id){ const q=PLANTA[id]; return q?('n'+(/^[AEIOU]/.test(q.nome)?'':'')+'a '+q.nome.toLowerCase()):'no caminho'; }

function estadoRetorno(){
  const E=estadoExp();
  if(!E.retorno||typeof E.retorno!=='object')
    E.retorno={perguntouNoDia:0,atravessou:false,bloqueio:null,desde:0,desvios:0,perguntas:0};
  return E.retorno;
}

/* ---------- qual comodo bloquear ----------
   O bloqueio vai num comodo do caminho MAIS CURTO de volta pro nucleo —
   e nunca num que seja a unica ligacao. `vizinhos()` da a topologia; um
   no de grau 1 fecharia o mapa. Na grade 3x3 o menor grau e 2, entao
   sempre sobra rota; a checagem fica assim mesmo, porque a planta pode
   crescer e o softlock nao pode voltar. */
function caminhoAteNucleo(de){
  const alvo=PLANTA.filter(q=>noNucleo(q.id)).map(q=>q.id);
  if(alvo.includes(de))return [de];
  const visto={[de]:true}; const fila=[[de]];
  while(fila.length){
    const rota=fila.shift(); const fim=rota[rota.length-1];
    for(const v of vizinhos(fim)){
      if(visto[v])continue; visto[v]=true;
      const nova=rota.concat(v);
      if(alvo.includes(v))return nova;
      fila.push(nova);
    }
  }
  return [de];
}
function escolherBloqueio(de){
  const rota=caminhoAteNucleo(de);
  const meio=rota.slice(1,-1).filter(id=>vizinhos(id).length>=3);
  const cand=meio.length?meio:rota.slice(1,-1);
  if(!cand.length)return null;
  const onde=sortear(cand);
  return {onde, tipo:sortear(RET_BLOQUEIOS).id, desde:(S.dia|0)*1000+(S.hora|0)};
}

/* ---------- a pergunta, uma vez por dia ---------- */
function pontoDeNaoRetorno(id){
  const R=estadoRetorno();
  if(camadaDe(id)<RET_CFG.camadaQuePergunta)return false;
  if(R.perguntouNoDia===(S.dia|0))return false;
  R.perguntouNoDia=(S.dia|0);
  R.perguntas=(R.perguntas||0)+1;
  R.atravessou=true;
  R.bloqueio=escolherBloqueio(id);
  R.desde=0;
  if(typeof diz==='function'){
    diz('Você para no batente antes de descer.','narr');
    diz('Você ainda consegue voltar. Depois disso, eu não sei.','alerta');
  }
  if(typeof marcarSujo==='function')marcarSujo();
  return true;
}

/* ---------- a volta e outra ---------- */
function bloqueioEm(id){
  const R=estadoRetorno();
  return (R.bloqueio&&R.bloqueio.onde===id)?R.bloqueio:null;
}
function limparBloqueio(){
  const R=estadoRetorno();
  R.bloqueio=null; R.atravessou=false;
  if(typeof marcarSujo==='function')marcarSujo();
}
if(typeof irPara==='function'){
  const _retIP=irPara;
  irPara=function(id,semTexto){
    let b=null;
    try{
      if(PLANTA[id]){
        const R=estadoRetorno();
        b=bloqueioEm(id);
        if(b){
          /* o bloqueio cobra ao ser atravessado — e cede depois */
          const B=RET_BLOQUEIOS.find(x=>x.id===b.tipo)||RET_BLOQUEIOS[0];
          if(typeof diz==='function'){ diz(B.t(id),'perigo'); diz(B.forcar,'fraco'); }
          if(typeof gastarMinutos==='function')gastarMinutos(RET_CFG.custoDoDesvio);
          if(typeof gastarRuido==='function')gastarRuido(RET_CFG.ruidoDoDesvio);
          R.desvios=(R.desvios||0)+1;
          R.desde=(R.desde||0)+1;
          if(R.desde>=2)limparBloqueio();
          else if(typeof marcarSujo==='function')marcarSujo();
        }
      }
    }catch(e){ if(typeof registrarErro==='function')registrarErro(e,'retorno/passo'); }
    const r=_retIP.apply(this,arguments);
    try{ if(!b)pontoDeNaoRetorno(id); }catch(e){}
    return r;
  };
}

/* o bloqueio cede sozinho com o tempo — nunca vira prisao */
if(typeof orqNovaNoite==='function'){
  const _retONN=orqNovaNoite;
  orqNovaNoite=function(s){
    const O=_retONN.apply(this,arguments);
    try{ const R=estadoRetorno(); R.perguntouNoDia=0; limparBloqueio(); }catch(e){}
    return O;
  };
}

/* ---------- prova de que nao ha prisao ---------- */
function retornoTemSaida(de){
  const R=estadoRetorno();
  const bl=R.bloqueio?R.bloqueio.onde:null;
  const alvo=PLANTA.filter(q=>noNucleo(q.id)).map(q=>q.id);
  const visto={[de]:true}; const fila=[de];
  while(fila.length){
    const x=fila.shift();
    if(alvo.includes(x))return true;
    for(const v of vizinhos(x)){ if(!visto[v]&&v!==bl){ visto[v]=true; fila.push(v); } }
  }
  return false;
}
function retornoEstado(){
  const R=estadoRetorno();
  return {perguntas:R.perguntas|0, desvios:R.desvios|0,
    bloqueio:R.bloqueio?{onde:PLANTA[R.bloqueio.onde].nome,tipo:R.bloqueio.tipo}:null,
    saidaDoPorao:retornoTemSaida(6), saidaDoQuintal:retornoTemSaida(8)};
}
