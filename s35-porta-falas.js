/* ============ §35 — MAIS FÔLEGO NAS FALAS DA PORTA ============

   A queixa era que as frases soam robotizadas. Fui medir antes de
   reescrever, e o problema não é a qualidade do que está escrito — é a
   QUANTIDADE:

     16 perguntas · 38 respostas boas · 45 ruins
     no máximo 3 perguntas por noite

   Com 2 respostas boas por pergunta, você vê a MESMA frase certa na
   segunda vez que faz a mesma pergunta. E resposta certa repetida é
   pior que resposta errada repetida, porque a certa é a que você mais
   ouve — quem sobrevive faz muita pergunta e abre pouco.

   Então aqui não se reescreve nada. Aqui se ACRESCENTA: +3 boas e +2
   ruins por pergunta, no mesmo tom do que já existia.

   O QUE FAZ UMA RESPOSTA RUIM SER BOA
   -----------------------------------
   Ela tem de ser explicável DEPOIS. O jogador erra, abre a porta, e no
   dia seguinte consegue dizer em voz alta o que ele deixou passar. Os
   moldes que o jogo já usava, e que eu segui:

     · espelho      — devolve a pergunta em vez de responder
     · vago         — serve pra qualquer pergunta, e por isso não serve
     · preciso demais — sabe uma coisa que quem está na rua não sabe
     · nega o universal — "não dói nada", "eu não perdi ninguém"
     · sabe da casa — usa um nome ou um fato que só se ouve daqui
     · a frase quebra — "Tem eu atrás de mim também"

   O molde novo que entrou: RESPONDE OUTRA PERGUNTA. Você pede a palma
   pra cima e ela mostra a palma pra baixo. Ela ouviu o som do pedido e
   não o pedido.
   ====================================================================== */

/* ---------- +3 boas e +2 ruins por pergunta ---------- */
const FALAS_MAIS={

 CONTAR:{
  ok:['Um, dois, três, quatro, cinco, seis, sete, oito, nove, dez. Agora abre, pelo amor de Deus.',
      'Até dez? Um, dois, três, quatro, cinco, seis, sete, oito, nove, dez. Satisfeito?',
      'Um... dois... três, quatro, cinco, seis, sete, oito, nove, dez. Tô sem fôlego, moço.'],
  ruim:[['Um, dois, três, quatro, cinco, seis, sete, oito, nove, dez, onze, doze, treze...',
         'Você mandou até dez. Ela não sabe onde parar porque não sabe o que é dez.'],
        ['Umdoistrêsquatrocincoseissetoitonovedez.',
         'Dez números sem respirar uma vez. Tenta você fazer isso.']]},

 NOME:{
  ok:[()=>'Seu nome? Eu bati aqui porque tinha luz, não porque eu te conheço.',
      ()=>'Se eu soubesse seu nome eu tinha chamado por ele em vez de esmurrar a madeira.',
      ()=>'Não faço ideia. Eu nem sei se tem gente aí, eu tô batendo no escuro.'],
  ruim:[[()=>`Você quer que eu diga? ${S.nomeJogador}. Tá bom assim, ${S.nomeJogador}?`,
         'Ela repetiu duas vezes. Como quem acabou de aprender e quer treinar.'],
        [()=>'Eu sei. Eu só não quero falar em voz alta aqui fora.',
         'Quem não sabe diz que não sabe. Isso aí é outra coisa.']]},

 ATRAS:{
  ok:['A calçada. E o muro do vizinho, que caiu semana passada e ninguém levantou.',
      'Um cachorro morto na sarjeta. Desculpa, você perguntou.',
      'A rua vazia. Vazia de um jeito errado, mas vazia.'],
  ruim:[['A sua casa. Tem a sua casa atrás de mim.',
         'A casa está na FRENTE dela. Ela não sabe onde ela mesma está.'],
        ['Não posso olhar pra trás. Se eu olhar eles vêm.',
         'Soa a medo — mas ela disse "eles" antes de você falar em eles.']]},

 MAO:{
  ok:['Ele encosta. Unha comida até a carne e um anel de prata escurecido.',
      'A mão entra devagar. Palma pra cima, com um corte fechando no meio.',
      'Ela põe a mão. Pequena, com tinta de parede seca grudada nos dedos.'],
  ruim:[['A mão entra e fica parada. Não treme, não sobe e desce com o resto do corpo.',
         'Mão de gente acompanha o peito. Essa está solta do corpo.'],
        ['Ele põe a mão, e a palma está virada pro chão.',
         'Você pediu palma pra cima. Ela ouviu o som do pedido, não o pedido.']]},

 PERDA:{
  ok:['Meu pai. Foi dos primeiros. Nem deu tempo de entender o que estava acontecendo.',
      'Uma amiga. A gente combinou de se encontrar na praça e ela não foi.',
      'Não vou dizer o nome. Se eu falar eu choro, e eu não posso chorar aqui fora agora.'],
  ruim:[['Perdi o caminho de casa. É isso que você quer ouvir?',
         'Você perguntou por alguém. Ela respondeu por alguma coisa.'],
        ['Ninguém. Eu não perdi ninguém.',
         'Ninguém atravessou esse mês sem perder alguém. Ninguém.']]},

 DOR:{
  ok:['As costas. Dormi três noites em chão de cimento.',
      'O dente. Tá inflamado e não tem farmácia de pé em lugar nenhum.',
      'A garganta. De gritar por socorro em porta que não abre.'],
  ruim:[['Dói onde você está olhando.',
         'Ela não tem como saber pra onde você está olhando. Chutou.'],
        ['Dói do lado de dentro. Do seu lado de dentro.',
         'Isso não é resposta sobre o corpo dela.']]},

 CHEIRO:{
  ok:['Fumaça. Alguma coisa queimando pro lado do rio, faz dias.',
      'Mato molhado. E bicho morto, mas isso tem em tudo quanto é canto agora.',
      'Comida. Alguma coisa cozinhando aí dentro. Faz três dias que eu não sentia esse cheiro.'],
  ruim:[['Cheiro de medo.',
         'Medo não tem cheiro. Isso ela ouviu alguém dizer e guardou.'],
        ['Eu sinto o que vocês comeram ontem.',
         'Pela porta fechada, com o gerador rodando. Não dá.']]},

 ONTEM:{
  ok:['Farinha seca na mão. Achei um pacote rasgado no chão do mercado.',
      'Comi não. Bebi água de uma bacia e fingi que era sopa.',
      'Metade de um pão que eu já sabia que tava mofado quando botei na boca.'],
  ruim:[['O que eu precisava comer.',
         'Isso não é comida. É frase.'],
        ['Ontem não teve ontem.',
         'A frase quebrou no meio. Ela não tem dia de ontem.']]},

 QUANTOS:{
  ok:['Três. Eu, minha mãe e o menino. Eles tão atrás do muro, com medo de aparecer.',
      'Eu vim sozinho. O resto ficou na igreja e eu não vou voltar lá.',
      'Um só. Eu conto os passos e é sempre um par.'],
  ruim:[['Somos o que couber.',
         'Isso não é número. É promessa.'],
        ['Eu e você.',
         'Você está do lado de dentro. Ela não sabe separar quem está onde.']]},

 PORTA:{
  ok:['Tem um risco fundo na altura do meu peito. Parece de faca, mas é velho.',
      'Madeira inchada de chuva. A parte de baixo tá raspando no chão quando você mexe.',
      'Tem uma tábua pregada por fora, meio torta. Foi você que pregou?'],
  ruim:[['Tem um olho mágico no meio, e eu tô olhando bem dentro dele.',
         'Ela descreveu o olho mágico. Ela está olhando pra ELE, não pra porta.'],
        ['Descreve você primeiro.',
         'Espelho de novo — e dessa vez com pressa.']]},

 CHUVA:{
  ok:[()=>S.chuva?'Tá caindo agora. Minha roupa tá pesando o dobro.'
                 :'Choveu no começo da semana. Depois secou tudo e virou poeira.',
      ()=>S.chuva?'Choveu e não parou. Eu tô com água dentro do sapato.'
                 :'Não chove faz uns quatro dias. Dá pra ver a poeira subindo na rua.',
      ()=>S.chuva?'Tá chovendo, moço. Foi por isso que eu corri pra cá.'
                 :'Chuvisco na terça, só. Nada que molhasse ninguém.'],
  ruim:[['Choveu do jeito que você quiser que tenha chovido.',
         'Ela está tentando acertar por eliminação.'],
        [()=>S.chuva?'Não caiu uma gota essa semana.':'Não parou de chover um minuto sequer.',
         'O céu está dizendo o contrário agora mesmo.']]},

 SANGUE:{
  ok:['A canela. Bati num ferro no escuro e nem vi de onde saiu.',
      'Não sei. Tem coisa doendo, mas eu não vou levantar a manga aqui fora.',
      'A orelha. Passou perto demais e eu não quero pensar no que era.'],
  ruim:[['Machucado não. Faltando um pedaço, sim.',
         'Ela achou graça. Ninguém acha graça disso.'],
        ['Tô inteiro. Tô mais inteiro do que quando cheguei.',
         '"Mais inteiro" não existe. Ninguém fica mais inteiro.']]},

 MEDO:{
  ok:['De acordar amanhã e não ter mais nenhuma porta pra bater.',
      'De perder a coragem antes de você decidir.',
      'Do escuro do lado de lá do poste. Não olha pra lá. Tem coisa parada ali.'],
  ruim:[['De você fechar os olhos.',
         'Você não falou em dormir. Ela sabe demais sobre o que acontece aí dentro à noite.'],
        ['Medo é de vocês. Eu não sou de ter.',
         'Ela disse "vocês". Ela sabe que tem mais de um aqui dentro.']]},

 IRMAO:{
  ok:['Uma irmã. Ivonete. Mora em Ji-Paraná e eu não sei se ainda tá lá.',
      'Três. Eu era o do meio, o que ninguém escutava.',
      'Tenho um. Faz dez anos que a gente não se fala, e agora eu daria tudo pra brigar com ele de novo.'],
  ruim:[['Tenho. O nome dele tá na ponta da língua.',
         'Ninguém esquece o nome do irmão. Ninguém.'],
        ['Tenho vários. Eles estão comigo agora.',
         'Ela disse isso e a sombra na fresta não mudou de largura.']]},

 HORA:{
  ok:[()=>'Depois da meia-noite, com certeza. Meu corpo já desistiu faz tempo.',
      'Sei lá. Tarde. Tarde demais pra bater na porta de alguém, eu sei disso.',
      ()=>`Umas ${Math.max(1,(S.hora+1)%12)}? Eu tentei contar pelas estrelas e eu não sei contar pelas estrelas.`],
  ruim:[['A hora não muda mais.',
         'Isso não responde nada — e é a segunda vez que ela foge assim.'],
        ['É de manhã.',
         'Está escuro. Ela não distingue dia de noite.']]},

 GERADOR:{
  ok:[()=>S.gerQuebrado?'Nada. Nem cachorro. É por isso que eu bati aqui.'
                       :'O motor de vocês. E ele tá engasgando, se quer saber.',
      ()=>S.gerQuebrado?'Só o vento na telha. A rua inteira morta.'
                       :'Um motor batendo. Dá pra ouvir de dois quarteirões.',
      'Cachorro latindo longe. Fazia dias que eu não ouvia cachorro.'],
  ruim:[['Ouço o silêncio de vocês.',
         'Silêncio não se ouve. E quem está com medo de verdade não fala bonito.'],
        [()=>S.gerQuebrado?'O motor de vocês, rodando bonito.':'Nenhum motor. Nada.',
         'Ela chutou exatamente o contrário do que está acontecendo aqui.']]}
};

/* ---------- entra sem apagar nada ---------- */
function ampliarFalasDaPorta(){
  if(typeof PERG==='undefined')return {perguntas:0,ok:0,ruim:0};
  let nOk=0, nRuim=0, nPerg=0;
  Object.keys(FALAS_MAIS).forEach(k=>{
    const P=PERG[k];
    if(!P)return;                       /* pergunta que não existe: ignora */
    nPerg++;
    if(!Array.isArray(P.ok))P.ok=[];
    if(!Array.isArray(P.ruim))P.ruim=[];
    /* nada de duplicata: rodar duas vezes não infla a lista */
    const jaOk=new Set(P.ok.map(x=>String(x)));
    FALAS_MAIS[k].ok.forEach(x=>{ if(!jaOk.has(String(x))){ P.ok.push(x); nOk++; } });
    const jaRuim=new Set(P.ruim.map(a=>String(a[0])));
    FALAS_MAIS[k].ruim.forEach(a=>{ if(!jaRuim.has(String(a[0]))){ P.ruim.push(a); nRuim++; } });
  });
  return {perguntas:nPerg, ok:nOk, ruim:nRuim};
}
const FALAS_ADICIONADAS=ampliarFalasDaPorta();

/* ================= O MORTO QUE JÁ BATEU AQUI =================
   \`gerarVisitante\` tem um ramo raro e bonito: alguém que já bateu na
   sua porta, morreu, e volta. Ele estourava.

     v2.respostas[k]={txt: errado ? sortear(PERG[k].ruim(ant))
                                  : sortear(PERG[k].bom(ant)), ...}

   \`ruim\` é ARRAY, não função — e \`bom\` não existe: o campo se chama
   \`ok\`. Duas chamadas de função em cima de coisas que não são função,
   num ramo que só roda com 6% de chance, e só depois que alguém que já
   visitou morreu. Por isso sobreviveu tanto tempo: quase nunca acontece,
   e quando acontecia virava um erro que o jogador via como a porta
   simplesmente não respondendo.

   O conserto embrulha \`gerarVisitante\`: se ele estourar, o visitante é
   remontado aqui com o mesmo formato que o resto do jogo espera
   (\`txt\`, \`errado\`, \`porque\`). Envelopar em vez de reescrever mantém
   o ramo original intacto pra quando o formato dele for corrigido na
   base. */
function montarRespostasDe(chaves,quantasErradas){
  const R={};
  const ruins=chaves.slice().sort(()=>rng().next()-.5).slice(0,quantasErradas);
  chaves.forEach(k=>{
    const P=PERG[k];
    if(!P){ R[k]={txt:'…',errado:false}; return; }
    if(ruins.includes(k)&&P.ruim&&P.ruim.length){
      const par=P.ruim[Math.floor(rng().next()*P.ruim.length)];
      R[k]={txt:resolver(par[0]),errado:true,porque:resolver(par[1])};
    }else{
      const b=(P.ok&&P.ok.length)?P.ok[Math.floor(rng().next()*P.ok.length)]:'…';
      R[k]={txt:resolver(b),errado:false};
    }
  });
  return R;
}
if(typeof gerarVisitante==='function'){
  const _falasGV=gerarVisitante;
  gerarVisitante=function(){
    let v;
    try{ v=_falasGV.apply(this,arguments); }
    catch(e){
      if(typeof registrarErro==='function')registrarErro(e,'gerarVisitante/deAntes');
      v=null;
    }
    /* estourou, ou voltou sem respostas: remonta o visitante de antes */
    if(!v||!v.respostas||!Object.keys(v.respostas).length){
      const ant=(typeof mortoDeAntes==='function'&&mortoDeAntes())
        ||((S.mortos||[])[0])||null;
      if(!ant)return v||_falasGV.call(this);
      const vz=(typeof vozDe==='function')?vozDe(ant):{vozIdx:0,pitch:1,rate:1};
      v={tipo:'conhecido',mimico:true,pessoa:ant,sinais:[],usadas:[],turnos:0,
        corrente:false,consultou:false,decorada:null,olhou:false,escutou:false,
        sombraVista:false,_modelo:null,_escuta:null,
        vozIdx:vz.vozIdx,pitch:vz.pitch,rate:vz.rate,qtd:1,
        alt:ant.alt||.45,larg:.16,dedos:0,tremor:0,x:.5,deAntes:true,
        respostas:montarRespostasDe(CHAVES,2)};
    }
    return v;
  };
}

/* ---------- depuração ---------- */
function falasEstado(){
  const por=CHAVES.map(k=>({p:PERG[k].p,ok:PERG[k].ok.length,ruim:PERG[k].ruim.length}));
  return {adicionadas:FALAS_ADICIONADAS,
    perguntas:CHAVES.length,
    totalOk:por.reduce((a,c)=>a+c.ok,0),
    totalRuim:por.reduce((a,c)=>a+c.ruim,0),
    magras:por.filter(o=>o.ok<4||o.ruim<4).map(o=>o.p),
    por};
}
