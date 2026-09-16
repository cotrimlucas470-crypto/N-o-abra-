/* ============================================================
   drills.js — conteúdo: rotas, sinais, cenários, exercícios
   As decisões de método estão aqui. Ordem, dificuldade e
   critérios foram escolhidos para quem volta depois de 1 mês.
   ============================================================ */
'use strict';
(function (U) {

  /* ============================================================
     ROTAS DA JING
     Nomeadas pela FUNÇÃO, não pelo nome da habilidade — assim
     continuam válidas se a build/patch mudar. Editáveis na aba
     "Rotas". A ordem abaixo é a ordem de recuperação que eu
     escolhi: primeiro o que decide luta, depois o que enfeita.
     ============================================================ */
  const ROTAS_PADRAO = [
    { id: 'entrada',  nome: 'Entrada',        seq: ['s1', 'aa'],
      porque: 'O par mais usado do jogo. Se ele estiver lento, todo o resto herda o atraso.', prio: 1 },
    { id: 'marca',    nome: 'Marca',          seq: ['s1', 'aa', 's2'],
      porque: 'Entrada + continuação. É a rota que você mais repete numa partida inteira.', prio: 2 },
    { id: 'recorte',  nome: 'Recorte',        seq: ['aa', 's1', 'aa'],
      porque: 'Encaixar ataque entre habilidades. Aqui mora a diferença entre dano teórico e dano real.', prio: 3 },
    { id: 'reflexo',  nome: 'Reflexo',        seq: ['s2', 's1', 'aa'],
      porque: 'Posicionar antes de entrar. Rota de quem não quer entrar no lugar errado.', prio: 4 },
    { id: 'saida',    nome: 'Saída',          seq: ['s3', 's1'],
      porque: 'O percurso mais longo do polegar no seu HUD. É a primeira coisa que enferruja.', prio: 5 },
    { id: 'execucao', nome: 'Execução',       seq: ['s1', 'aa', 's2', 'aa'],
      porque: 'Sequência de abate. Só vale treinar depois que Entrada e Marca estiverem estáveis.', prio: 6 },
    { id: 'completa', nome: 'Espelho Inteiro',seq: ['s2', 's1', 'aa', 's3', 'aa', 's1'],
      porque: 'A rota inteira. Deixada por último de propósito: quase nunca é ela que perde a luta.', prio: 7 },
  ];

  const ROTAS_LUNA = [
    { id: 'l-marca',  nome: 'Marcar',  seq: ['s1', 'aa'], porque: 'Marcar antes de tudo. Sem marca não existe cadeia.', prio: 1 },
    { id: 'l-corte',  nome: 'Corte',   seq: ['s2', 'aa', 's1'], porque: 'Encaixe básico de dano da Luna.', prio: 2 },
    { id: 'l-elo',    nome: 'Elo',     seq: ['s1', 'aa', 's3'], porque: 'A unidade da cadeia: marcar, bater, saltar.', prio: 3 },
    { id: 'l-cadeia', nome: 'Cadeia',  seq: ['s1', 'aa', 's3', 's1', 'aa', 's3', 's1', 'aa', 's3'],
      porque: 'Três elos sem erro. Um toque trocado quebra a cadeia — exatamente como na partida.', prio: 4 },
  ];

  function getRotas(quem = 'jing') {
    const d = U.DB.load();
    const k = quem === 'luna' ? 'rotasLuna' : 'rotasJing';
    if (!d[k]) { d[k] = JSON.parse(JSON.stringify(quem === 'luna' ? ROTAS_LUNA : ROTAS_PADRAO)); U.DB.save(); }
    return d[k];
  }
  function rotaPorId(id, quem = 'jing') { return getRotas(quem).find(r => r.id === id); }
  function seqs(ids, quem = 'jing') { return ids.map(i => (rotaPorId(i, quem) || { seq: ['s1'] }).seq); }

  /* ============================================================
     SINAIS DE AMEAÇA — motor Escolha
     Respostas possíveis: ult | inv | recuar | seguir | nada
     ============================================================ */
  const SINAIS = [
    { id: 'gancho',  icone: '🪝', cor: '#ff5470', texto: 'Gancho saindo da lateral, você está na linha', resposta: 'inv',
      porque: 'Projétil já lançado não se resolve com dano. Só deslocamento instantâneo sai da linha a tempo.' },
    { id: 'investida', icone: '🐂', cor: '#ffd479', texto: 'Tanque investindo de frente, controle em linha reta', resposta: 'recuar',
      porque: 'Sair da linha custa meio passo. Comer o controle custa a luta inteira.' },
    { id: 'area', icone: '🔥', cor: '#ff8a5c', texto: 'Área no chão acendeu exatamente sob você', resposta: 'recuar',
      porque: 'Área de chão se resolve com passo. Gastar habilidade aqui é gastar duas vezes.' },
    { id: 'assassino', icone: '🗡', cor: '#c4b5fd', texto: 'Assassino apareceu ATRÁS de você', resposta: 'ult',
      porque: 'Você precisa de reposicionamento imediato, não de mais dano. Recuar andando não vence a velocidade dele.' },
    { id: 'abate', icone: '💀', cor: '#6ee7a8', texto: 'Alvo com um fio de vida tentando fugir', resposta: 'seguir',
      porque: 'Isso não é ameaça, é conta. Hesitar aqui é o erro mais caro do jogador enferrujado.' },
    { id: 'canal', icone: '🧊', cor: '#7fd4ff', texto: 'Controle em área grande sendo canalizado à sua frente', resposta: 'recuar',
      porque: 'Canalização tem aviso. Quem lê o aviso não precisa de invocador.' },
    { id: 'sumidos', icone: '👻', cor: '#a78bfa', texto: 'Dois inimigos sumiram do mapa e você empurra sozinho', resposta: 'recuar',
      porque: 'Informação faltando é informação ruim. Você não perde por estar errado, perde por não saber.' },
    { id: 'escudo', icone: '🛡', cor: '#7fa8d0', texto: 'Suporte escudou o alvo e sua entrada já foi gasta', resposta: 'recuar',
      porque: 'Sem recurso e com escudo na frente, ficar não é coragem, é doação.' },
    { id: 'janela', icone: '⚡', cor: '#ffd479', texto: 'Seu invocador está pronto e o alvo já usou o dele', resposta: 'seguir',
      porque: 'Vantagem de recurso é uma janela curta. Quem espera, devolve.' },
    { id: 'cerco', icone: '🌀', cor: '#ff5470', texto: 'Você está no meio de três e a ultimate está pronta', resposta: 'ult',
      porque: 'A ultimate aqui é rota de saída, não ferramenta de dano. Usar cedo é melhor que usar perfeito.' },
    { id: 'torre', icone: '🕳', cor: '#ff8a5c', texto: 'Você pisou sob a torre inimiga com metade da vida', resposta: 'recuar',
      porque: 'A torre não erra e não tem recarga. Nenhuma execução compensa a conta dela.' },
    { id: 'ultErrou', icone: '🧨', cor: '#6ee7a8', texto: 'O inimigo gastou a ultimate dele e errou', resposta: 'seguir',
      porque: 'Essa é a maior janela do jogo. Quem não entra agora, entra depois no pior momento.' },
    { id: 'encurralado', icone: '🏹', cor: '#ff5470', texto: 'Atirador virou para você e não há cobertura por perto', resposta: 'ult',
      porque: 'Sem cobertura, andar só prolonga o tempo que você fica sob tiro.' },
    { id: 'iniciou', icone: '🟢', cor: '#6ee7a8', texto: 'Seu tanque iniciou e prendeu dois inimigos', resposta: 'seguir',
      porque: 'A entrada dele é a sua. Atrasar dois segundos transforma vantagem em empate.' },
    /* Provas de controle: NÃO responder também é resposta. */
    { id: 'nada1', icone: '✅', cor: '#8fa3c4', texto: 'Aliado usou uma habilidade perto de você. Nada mudou', resposta: 'nada',
      porque: 'Movimento na tela não é ameaça. Reagir a tudo é o mesmo que não ler nada.' },
    { id: 'nada2', icone: '🌿', cor: '#8fa3c4', texto: 'Um minion morreu ao seu lado', resposta: 'nada',
      porque: 'Se você apertou aqui, seu dedo está andando sozinho — e isso vira invocador jogado fora em partida.' },
  ];

  /* ============================================================
     CENÁRIOS DE LUTA — motor Cenário
     ============================================================ */
  const CENARIOS = [
    {
      id: 'c1',
      contexto: 'Meio de jogo. Você está na mata lateral. O atirador inimigo está empurrando sozinho.',
      inicio: [
        { icone: '🏹', nome: 'Atirador', hp: 0.62, nota: 'sozinho' },
        { icone: '🛡', nome: 'Suporte', hp: 0.90, nota: 'longe, voltando' },
      ],
      pergunta: 'Entrar agora, esperar o suporte se afastar mais, ou recuar?',
      opcoes: [
        { texto: 'ENTRAR', icone: '⚔', certo: true, executa: true, rota: ['s1', 'aa', 's2', 'aa'],
          porque: 'Alvo isolado, sem cobertura e com vida abaixo de 70%. Essa janela não melhora — ela fecha.' },
        { texto: 'ESPERAR', icone: '⏳', certo: false,
          porque: 'Esperar aqui é esperar o suporte chegar. Você trocou uma luta 1v1 por uma 1v2.' },
        { texto: 'RECUAR', icone: '↩', certo: false,
          porque: 'Recuar sem ameaça concreta ensina o adversário que a lateral é dele.' },
      ],
      fecho: 'Entrada limpa em alvo isolado. É assim que a Jing paga.',
    },
    {
      id: 'c2',
      contexto: 'Você entrou no atirador. A vida dele está caindo. Você está com 45% de vida.',
      inicio: [
        { icone: '🏹', nome: 'Atirador', hp: 0.22, nota: 'quase morto' },
        { icone: '🗡', nome: 'Você', hp: 0.45, nota: 'sem invocador', aliado: true },
      ],
      pergunta: 'Você já gastou a entrada. Termina o abate ou sai?',
      opcoes: [
        { texto: 'TERMINAR', icone: '⚔', certo: true, executa: true, rota: ['aa', 's1', 'aa'],
          porque: '22% de vida e sem escudo: são dois toques. Sair agora é pagar o preço sem levar o prêmio.' },
        { texto: 'SAIR', icone: '↩', certo: false,
          porque: 'Você já pagou o custo da entrada. Sair sem o abate é o pior dos dois mundos.' },
      ],
      reviravolta: {
        parar: true,
        texto: 'O JUNGLE INIMIGO SAIU DA MATA ÀS SUAS COSTAS',
        novo: { icone: '🐉', nome: 'Jungle', hp: 1.0, nota: 'nas suas costas' },
        porque: 'Sem invocador, com 45% de vida e um terceiro chegando: o abate deixou de valer o preço. Soltar a jogada no meio é uma habilidade, não uma desistência.',
      },
      fecho: 'Abate fechado.',
    },
    {
      id: 'c3',
      contexto: 'Luta 3v3 no objetivo. Seu tanque ainda não iniciou.',
      inicio: [
        { icone: '🪨', nome: 'Tanque', hp: 0.95, nota: 'ultimate pronta' },
        { icone: '🔮', nome: 'Mago', hp: 0.80, nota: 'atrás do tanque' },
        { icone: '🏹', nome: 'Atirador', hp: 0.85, nota: 'atrás do tanque' },
      ],
      pergunta: 'O tanque inimigo está de frente com a ultimate pronta. O que você faz?',
      opcoes: [
        { texto: 'ESPERAR', icone: '⏳', certo: true,
          porque: 'Entrar de frente num tanque com ultimate pronta é entregar a sua entrada por nada. Você é a segunda onda, não a primeira.' },
        { texto: 'ENTRAR', icone: '⚔', certo: false, executa: true, rota: ['s1', 'aa', 's2'],
          porque: 'Você entrou no alvo mais duro, de frente, com o controle dele disponível. Mecânica perfeita, decisão ruim.' },
        { texto: 'FLANCO', icone: '↗', certo: false,
          porque: 'Flanquear é certo em princípio, mas sem o início do seu time você chega sozinho do outro lado.' },
      ],
      fecho: 'Segurou a entrada. Segundo a entrar, primeiro a sair vivo.',
    },
    {
      id: 'c4',
      contexto: 'Você está com 30% de vida. O mago inimigo está com 25% e recuando para a torre.',
      inicio: [
        { icone: '🔮', nome: 'Mago', hp: 0.25, nota: 'indo para a torre' },
        { icone: '🗡', nome: 'Você', hp: 0.30, nota: 'invocador pronto', aliado: true },
      ],
      pergunta: 'Ele chega na torre em dois passos. Persegue?',
      opcoes: [
        { texto: 'PERSEGUIR', icone: '⚔', certo: false, executa: true, rota: ['s1', 'aa'],
          porque: 'Você trocou 30% da sua vida por uma chance. A torre acerta sempre, e o mago tem uma habilidade sobrando.' },
        { texto: 'DESISTIR', icone: '↩', certo: true,
          porque: 'Com 30% de vida sob torre, o abate vale menos que a sua presença nos próximos 30 segundos.' },
      ],
      fecho: 'Recuo correto.',
    },
    {
      id: 'c5',
      contexto: 'Sua equipe iniciou bem. Dois inimigos estão presos no controle do seu tanque.',
      inicio: [
        { icone: '🪨', nome: 'Tanque', hp: 0.70, nota: 'controlado' },
        { icone: '🏹', nome: 'Atirador', hp: 0.65, nota: 'controlado' },
        { icone: '🛡', nome: 'Suporte', hp: 0.90, nota: 'livre, atrás' },
      ],
      pergunta: 'Dois presos. Em quem você entra?',
      opcoes: [
        { texto: 'ATIRADOR', icone: '🏹', certo: true, executa: true, rota: ['s1', 'aa', 's2', 'aa'],
          porque: 'Preso, sem escudo e é quem mais dano causa se sobreviver. Alvo certo, momento certo.' },
        { texto: 'TANQUE', icone: '🪨', certo: false,
          porque: 'Ele está preso e não é ameaça. Você gastou a janela inteira em quem não decide a luta.' },
        { texto: 'SUPORTE', icone: '🛡', certo: false,
          porque: 'Está livre e vai fugir. Perseguir suporte no meio de uma luta é sair da luta.' },
      ],
      fecho: 'Alvo certo dentro da janela certa. É o combo que ganha partida.',
    },
    {
      id: 'c6',
      contexto: 'Início de luta. Tudo ainda está de pé. Você está na posição de flanco.',
      inicio: [
        { icone: '🪨', nome: 'Tanque', hp: 1.0, nota: '' },
        { icone: '🔮', nome: 'Mago', hp: 1.0, nota: 'ultimate pronta' },
        { icone: '🏹', nome: 'Atirador', hp: 1.0, nota: '' },
      ],
      pergunta: 'Ninguém iniciou. Você está de flanco, escondido. O que faz?',
      opcoes: [
        { texto: 'ESPERAR', icone: '⏳', certo: true, executa: true, rota: ['s2', 's1', 'aa', 's2'],
          porque: 'Flanco sem início é só uma posição. Você esperou — e o mago gastou a ultimate no seu tanque. AGORA a janela é sua: execute.' },
        { texto: 'ENTRAR', icone: '⚔', certo: false, executa: true, rota: ['s2', 's1', 'aa'],
          porque: 'Você iniciou com o personagem mais frágil da sua composição, contra três habilidades disponíveis.' },
      ],
      reviravolta: {
        parar: false,
        texto: 'O MAGO GASTOU A ULTIMATE — A JANELA É SUA',
        porque: 'Entrar depois da habilidade sair é entrar contra metade do time.',
      },
      fecho: 'Esperou a habilidade sair e depois entrou. Essa é a jogada.',
    },
    {
      id: 'c7',
      contexto: 'Você está executando um abate. A luta está 2v2 nas laterais.',
      inicio: [
        { icone: '🔮', nome: 'Mago', hp: 0.35, nota: 'em execução' },
        { icone: '🗡', nome: 'Você', hp: 0.70, nota: '', aliado: true },
      ],
      pergunta: 'Execução em andamento. Continua?',
      opcoes: [
        { texto: 'CONTINUAR', icone: '⚔', certo: true, executa: true, rota: ['s1', 'aa', 's2', 'aa', 's1'],
          porque: 'Alvo em 35%, sem cobertura. A execução está correta.' },
      ],
      reviravolta: {
        parar: true,
        texto: 'SEU ALIADO MORREU. AGORA SÃO 3 CONTRA VOCÊ',
        novo: { icone: '🐉', nome: 'Jungle', hp: 0.9, nota: 'chegando' },
        porque: 'A luta mudou de sinal no meio da sua execução. Continuar aqui não é persistência, é não ter percebido.',
      },
      fecho: 'Abate concluído.',
    },
    {
      id: 'c8',
      contexto: 'Você tem 85% de vida, invocador pronto, e o time inimigo está agrupado no objetivo.',
      inicio: [
        { icone: '🪨', nome: 'Tanque', hp: 0.60, nota: '' },
        { icone: '🏹', nome: 'Atirador', hp: 0.40, nota: 'sem invocador' },
        { icone: '🛡', nome: 'Suporte', hp: 0.75, nota: '' },
        { icone: '🔮', nome: 'Mago', hp: 0.88, nota: 'ultimate pronta' },
      ],
      pergunta: 'Quatro agrupados. Seu time chega em dois segundos. O que faz?',
      opcoes: [
        { texto: 'ESPERAR', icone: '⏳', certo: true,
          porque: 'Dois segundos é pouco tempo para eles e muito tempo para você sozinho. Entrar antes do time é morrer antes do time.' },
        { texto: 'ENTRAR NO ATIRADOR', icone: '🏹', certo: false, executa: true, rota: ['s1', 'aa', 's2'],
          porque: 'O alvo está certo. O momento não. Mecânica perfeita e decisão ruim continuam sendo decisão ruim.' },
        { texto: 'INVOCADOR + ENTRAR', icone: '⚡', certo: false,
          porque: 'Gastar o invocador para ENTRAR em quatro tira sua única rota de saída.' },
      ],
      fecho: 'Esperou o time. Entrada em segundo tempo.',
    },
  ];

  /* ============================================================
     EXERCÍCIOS
     dif: 1..10. cfg(dif) devolve a configuração daquele nível.
     ============================================================ */
  const F = { RECONEXAO: 1, ESTABILIZACAO: 2, AUTOMATIZACAO: 3, VELOCIDADE: 4, PRESSAO: 5, INTEGRACAO: 6, DOMINIO: 7 };

  const escala = (dif, a, b) => a + (b - a) * ((dif - 1) / 9);

  const DRILLS = [
    /* ---------- FASE 1 — RECONEXÃO ---------- */
    {
      id: 'ancoragem', nome: 'Ancoragem', fase: F.RECONEXAO, motor: 'sequencia',
      objetivo: 'Reencontrar cada botão sem olhar duas vezes.',
      explicacao: [
        'Aparece o nome de um botão no centro por um instante.',
        'O nome some. Quando surgir VAI, toque o botão correspondente.',
        'Não corra. O que está sendo medido é ONDE o dedo encosta, não o quanto você é rápido.',
        'Encostar na borda conta, mas vale menos. O alvo é o miolo do botão.',
      ],
      treina: { precisao: 0.50, velocidade: 0.25, consistencia: 0.25 },
      cfg: (d) => ({
        tentativas: 16, modo: 'livre', mostrarRota: 'antes',
        tempoLeitura: Math.round(escala(d, 1100, 450)),
        rotas: [['s1'], ['s2'], ['s3'], ['aa'], ['flash'], ['s1'], ['s2'], ['s3'], ['aa']],
        deadline: Math.round(escala(d, 1800, 900)),
        isiMin: 350, isiMax: Math.round(escala(d, 900, 1600)),
        foco: 'precisao',
      }),
    },
    {
      id: 'pontes', nome: 'Pontes', fase: F.RECONEXAO, motor: 'sequencia',
      objetivo: 'Recuperar o percurso do polegar entre dois botões.',
      explicacao: [
        'Dois botões, sempre na ordem mostrada.',
        'O que importa é o TRAJETO: o dedo sai de um e chega no outro sem tatear.',
        'Se você errar o segundo toque, quase sempre é distância — não memória.',
        'O sistema guarda o tempo de cada par e descobre quais trajetos do SEU HUD estão travando.',
      ],
      treina: { precisao: 0.35, velocidade: 0.35, consistencia: 0.30 },
      cfg: (d) => ({
        tentativas: 18, modo: 'livre', mostrarRota: 'antes',
        tempoLeitura: Math.round(escala(d, 1000, 420)),
        rotas: [['s1','aa'],['aa','s1'],['s1','s2'],['s2','s3'],['s1','s3'],['s3','aa'],['aa','flash'],['s2','aa'],['s3','s1'],['aa','s2']],
        deadline: Math.round(escala(d, 2400, 1100)),
        alvoMs: Math.round(escala(d, 700, 320)),
        foco: 'precisao',
      }),
    },
    {
      id: 'compasso', nome: 'Rota em Compasso', fase: F.RECONEXAO, motor: 'sequencia',
      objetivo: 'Gravar o ritmo da rota antes de gravar a velocidade.',
      explicacao: [
        'Um metrônomo marca a batida. Um toque por batida, sem adiantar.',
        'Adiantar conta como erro. A meta não é ser rápido: é ser previsível.',
        'Memória muscular é ritmo estável primeiro; velocidade vem depois sozinha.',
        'Quando você acertar 85% no compasso atual, o sistema fecha o compasso.',
      ],
      treina: { consistencia: 0.40, precisao: 0.30, velocidade: 0.30 },
      cfg: (d, ctx) => ({
        tentativas: 10, modo: 'compasso', mostrarRota: 'sempre',
        beat: Math.round(escala(d, 640, 300)),
        janela: Math.round(escala(d, 170, 95)),
        rotas: seqs(ctx.rotasAtivas || ['entrada', 'marca']),
        tempoLeitura: 900,
      }),
    },

    /* ---------- FASE 2 — ESTABILIZAÇÃO ---------- */
    {
      id: 'janela', nome: 'Janela Constante', fase: F.ESTABILIZACAO, motor: 'sequencia',
      objetivo: 'Repetir a MESMA rota no MESMO tempo. Regularidade, não recorde.',
      explicacao: [
        'Existe uma faixa de tempo alvo. Terminar rápido demais é erro igual a terminar devagar.',
        'Isso parece estranho e é de propósito: quem volta de uma pausa oscila muito.',
        'Oscilação é o que faz o combo falhar na hora da pressão.',
        'A faixa aperta conforme você acerta.',
      ],
      treina: { consistencia: 0.55, precisao: 0.25, velocidade: 0.20 },
      cfg: (d, ctx) => {
        const alvo = Math.round(escala(d, 1350, 700));
        const tol = Math.round(escala(d, 300, 110));
        return {
          tentativas: 12, modo: 'janela', mostrarRota: 'sempre',
          faixa: [alvo - tol, alvo + tol], alvoMs: alvo,
          rotas: seqs(ctx.rotasAtivas || ['marca', 'recorte']),
          deadline: alvo + tol + 900, foco: 'consistencia', tempoLeitura: 750,
        };
      },
    },
    {
      id: 'pontes-cegas', nome: 'Pontes Cegas', fase: F.ESTABILIZACAO, motor: 'sequencia',
      objetivo: 'Executar sem o botão aceso. Tirar a muleta visual.',
      explicacao: [
        'A rota aparece uma vez e some. Nenhum botão fica destacado.',
        'Você executa pela lembrança da posição, que é o que acontece em partida.',
        'Errar aqui e acertar com destaque significa uma coisa: você sabe a rota, não sabe o HUD.',
      ],
      treina: { precisao: 0.30, velocidade: 0.30, consistencia: 0.40 },
      cfg: (d, ctx) => ({
        tentativas: 12, modo: 'livre', mostrarRota: 'antes',
        tempoLeitura: Math.round(escala(d, 950, 380)),
        rotas: seqs(ctx.rotasAtivas || ['marca', 'reflexo', 'saida']),
        alvoMs: Math.round(escala(d, 1300, 650)),
        deadline: Math.round(escala(d, 3200, 1700)), foco: 'consistencia',
      }),
    },
    {
      id: 'andando', nome: 'Combo Andando', fase: F.ESTABILIZACAO, motor: 'sequencia',
      objetivo: 'Executar sem parar de andar. Combo parado é combo morto.',
      explicacao: [
        'Uma seta amarela indica a direção que o analógico precisa manter.',
        'Segure a direção com o polegar esquerdo DURANTE toda a execução.',
        'Soltar o analógico no meio conta como erro de posicionamento, mesmo com os toques certos.',
        'Nos níveis altos a direção muda no meio da rota.',
      ],
      treina: { movimento: 0.50, precisao: 0.25, consistencia: 0.25 },
      cfg: (d, ctx) => ({
        tentativas: 12, modo: 'livre', mostrarRota: 'sempre',
        mover: d >= 6 ? 'mudando' : 'fixo',
        tolDir: d >= 8 ? 0 : 1, movMin: escala(d, 0.45, 0.75),
        rotas: seqs(ctx.rotasAtivas || ['marca', 'execucao']),
        alvoMs: Math.round(escala(d, 1500, 850)),
        deadline: Math.round(escala(d, 3600, 2000)), tempoLeitura: 800,
      }),
    },

    /* ---------- FASE 3 — AUTOMATIZAÇÃO ---------- */
    {
      id: 'dupla', nome: 'Dupla Tarefa', fase: F.AUTOMATIZACAO, motor: 'sequencia',
      objetivo: 'Descobrir se a rota sai sozinha ou se ela consome a sua atenção.',
      explicacao: [
        'A metade esquerda vira quatro quadrantes.',
        'Durante a execução, UM quadrante pisca em vermelho por um instante.',
        'Com o polegar ESQUERDO, toque o quadrante que piscou — sem parar a rota com o direito.',
        'Errar o quadrante invalida a tentativa mesmo com a rota perfeita. Esse é o ponto.',
        'Se a sua rota desaba aqui e estava boa sozinha, ela é consciente, não automática.',
      ],
      treina: { automatismo: 0.55, reflexo: 0.25, consistencia: 0.20 },
      cfg: (d, ctx) => ({
        tentativas: 12, modo: 'livre', mostrarRota: d <= 4 ? 'sempre' : 'antes',
        dupla: true, duplaVisivel: Math.round(escala(d, 520, 240)),
        rotas: seqs(ctx.rotasAtivas || ['marca', 'execucao']),
        alvoMs: Math.round(escala(d, 1600, 900)),
        deadline: Math.round(escala(d, 3800, 2200)), tempoLeitura: 800,
      }),
    },
    {
      id: 'mutante', nome: 'Rota Mutante', fase: F.AUTOMATIZACAO, motor: 'sequencia',
      objetivo: 'Trocar de plano no meio da execução sem travar.',
      explicacao: [
        'Você começa uma rota. Às vezes, no meio, ela MUDA.',
        'Quando aparecer TROCA, o restante da sequência é outro.',
        'Travar por meio segundo aqui é exatamente o que acontece quando a luta muda em partida.',
      ],
      treina: { automatismo: 0.35, reflexo: 0.35, velocidade: 0.30 },
      cfg: (d, ctx) => ({
        tentativas: 12, modo: 'livre', mostrarRota: 'sempre',
        mutante: escala(d, 0.30, 0.65),
        rotas: seqs(ctx.rotasAtivas || ['marca', 'execucao', 'reflexo']),
        alvoMs: Math.round(escala(d, 1700, 950)),
        deadline: Math.round(escala(d, 4000, 2300)), tempoLeitura: 750,
      }),
    },

    /* ---------- FASE 4 — VELOCIDADE ---------- */
    {
      id: 'corte', nome: 'Corte de Tempo', fase: F.VELOCIDADE, motor: 'sequencia',
      objetivo: 'Empurrar o teto de velocidade sem soltar a precisão.',
      explicacao: [
        'Existe um tempo limite por tentativa e ele diminui a cada nível.',
        'Se a sua taxa de erro subir junto com a velocidade, o sistema VOLTA o tempo.',
        'Velocidade que gera erro não é progresso, é ruído.',
      ],
      treina: { velocidade: 0.55, consistencia: 0.25, precisao: 0.20 },
      cfg: (d, ctx) => ({
        tentativas: 14, modo: 'livre', mostrarRota: 'sempre',
        rotas: seqs(ctx.rotasAtivas || ['marca', 'execucao']),
        alvoMs: Math.round(escala(d, 1200, 520)),
        deadline: Math.round(escala(d, 2000, 950)), tempoLeitura: 600, foco: 'velocidade',
      }),
    },

    /* ---------- FASE 5 — PRESSÃO ---------- */
    {
      id: 'gatilho', nome: 'Gatilho de Ameaça', fase: F.PRESSAO, motor: 'escolha',
      objetivo: 'Perceber, classificar e responder — não apertar rápido.',
      explicacao: [
        'Aparece uma situação. Existem quatro respostas possíveis:',
        'ULTIMATE (botão 3) · INVOCADOR · RECUAR (analógico para trás) · SEGUIR (ataque).',
        'Algumas situações NÃO pedem resposta nenhuma. Apertar nelas é erro.',
        'Nos níveis altos a situação some depois de um instante e você decide com o que viu.',
      ],
      treina: { reflexo: 0.55, decisao: 0.30, velocidade: 0.15 },
      cfg: (d) => ({
        tentativas: 14, sinais: SINAIS,
        limite: Math.round(escala(d, 2000, 900)),
        mascara: d >= 5 ? Math.round(escala(d, 400, 150)) : null,
        isiMin: 600, isiMax: Math.round(escala(d, 1800, 2600)),
        rtBom: 420, rtRuim: 1200,
      }),
    },
    {
      id: 'freio', nome: 'Freio de Mão', fase: F.PRESSAO, motor: 'sequencia',
      objetivo: 'Interromper uma jogada já começada. A habilidade mais rara.',
      explicacao: [
        'Você executa a rota normalmente.',
        'Em algumas tentativas aparece PARAR no meio. A partir dali, qualquer toque é erro.',
        'Parar é SEGURAR o dedo e puxar o analógico para trás. Não aperte mais nada.',
        'Atenção: nunca executar também é errado. Metade das tentativas é para seguir até o fim.',
      ],
      treina: { freio: 0.60, automatismo: 0.20, reflexo: 0.20 },
      cfg: (d, ctx) => ({
        tentativas: 14, modo: 'livre', mostrarRota: 'sempre',
        freio: escala(d, 0.30, 0.50),
        janelaFreio: Math.round(escala(d, 900, 600)),
        rotas: seqs(ctx.rotasAtivas || ['execucao', 'completa']),
        motivosFreio: ['3 inimigos pela lateral', 'seu aliado morreu', 'o jungle saiu da mata atrás de você',
                       'o suporte chegou e escudou', 'você entrou no alcance da torre'],
        alvoMs: Math.round(escala(d, 1800, 1000)),
        deadline: Math.round(escala(d, 4200, 2600)), tempoLeitura: 700,
      }),
    },
    {
      id: 'ruido', nome: 'Ruído', fase: F.PRESSAO, motor: 'sequencia',
      objetivo: 'Manter a execução com a tela suja, que é como ela sempre está.',
      explicacao: [
        'Formas coloridas piscam pela tela durante a execução.',
        'Nada disso é sinal. É exatamente o tipo de informação inútil que uma luta real despeja.',
        'A partir do nível 6 entra também a leitura de quadrante da mão esquerda.',
      ],
      treina: { consistencia: 0.30, automatismo: 0.30, reflexo: 0.40 },
      cfg: (d, ctx) => ({
        tentativas: 12, modo: 'livre', mostrarRota: d <= 5 ? 'sempre' : 'antes',
        ruido: Math.max(1, Math.round(escala(d, 1, 4))),
        dupla: d >= 6, duplaVisivel: 380,
        rotas: seqs(ctx.rotasAtivas || ['marca', 'execucao', 'completa']),
        alvoMs: Math.round(escala(d, 1700, 950)),
        deadline: Math.round(escala(d, 4000, 2300)), tempoLeitura: 700,
      }),
    },

    /* ---------- FASE 6 — INTEGRAÇÃO ---------- */
    {
      id: 'alvos', nome: 'Prioridade de Alvo', fase: F.INTEGRACAO, motor: 'prioridade',
      objetivo: 'Escolher o alvo certo antes de tocar em qualquer botão.',
      explicacao: [
        'Aparecem inimigos com função, vida, distância e estado.',
        'A pergunta muda: quem abater, quem respeitar, em quem não encostar.',
        'Toque na carta. Depois o sistema explica o porquê — leia a explicação, ela é o treino.',
      ],
      treina: { decisao: 0.70, reflexo: 0.30 },
      cfg: (d) => ({
        tentativas: 12,
        cartas: d >= 7 ? 5 : d >= 4 ? 4 : 3,
        limite: Math.round(escala(d, 4500, 1800)),
        semEstado: d <= 2,
        rtBom: 1200, rtRuim: 4000,
      }),
    },
    {
      id: 'luta', nome: 'Simulador de Luta', fase: F.INTEGRACAO, motor: 'cenario',
      objetivo: 'Ler, decidir, executar e — quando preciso — abortar.',
      explicacao: [
        'Você recebe um contexto de luta e alguns segundos para ler.',
        'Escolhe uma ação. Se a ação certa envolver execução, você executa no HUD.',
        'No meio da execução a situação pode mudar. Aí a decisão volta a ser sua.',
        'A pontuação pesa mais a decisão que a mecânica. É de propósito.',
      ],
      treina: { decisao: 0.45, freio: 0.25, reflexo: 0.15, automatismo: 0.15 },
      cfg: (d) => ({
        tentativas: 6, cenarios: CENARIOS,
        leitura: Math.round(escala(d, 3000, 1300)),
        tempoDecisao: Math.round(escala(d, 3600, 1600)),
        janelaFreio: Math.round(escala(d, 1000, 650)),
      }),
    },

    /* ---------- LUNA ---------- */
    {
      id: 'luna-elo', nome: 'Luna · Elo', fase: F.ESTABILIZACAO, heroi: 'luna', motor: 'sequencia',
      objetivo: 'Reconstruir a unidade básica da cadeia.',
      explicacao: [
        'Marcar, bater, saltar. Um elo por vez.',
        'A Luna não é um combo: é um elo repetido sem falha.',
        'Antes de encadear, o elo precisa sair igual todas as vezes.',
      ],
      treina: { consistencia: 0.45, precisao: 0.30, velocidade: 0.25 },
      cfg: (d) => ({
        tentativas: 12, modo: 'compasso', mostrarRota: 'sempre',
        beat: Math.round(escala(d, 620, 330)), janela: Math.round(escala(d, 170, 100)),
        rotas: seqs(['l-marca', 'l-corte', 'l-elo'], 'luna'), tempoLeitura: 850,
      }),
    },
    {
      id: 'luna-cadeia', nome: 'Luna · Cadeia', fase: F.VELOCIDADE, heroi: 'luna', motor: 'sequencia',
      objetivo: 'Três elos seguidos. Um erro derruba tudo — como na partida.',
      explicacao: [
        'Nove toques sem falha. Qualquer botão errado encerra a tentativa na hora.',
        'Não existe recuperação no meio da cadeia. Existe não errar.',
        'A faixa de tempo aperta a cada nível: a cadeia é ritmo, não corrida.',
      ],
      treina: { consistencia: 0.40, velocidade: 0.30, automatismo: 0.30 },
      cfg: (d) => {
        const alvo = Math.round(escala(d, 4200, 2300));
        const tol = Math.round(escala(d, 700, 280));
        return {
          tentativas: 10, modo: 'janela', mostrarRota: 'sempre',
          faixa: [alvo - tol, alvo + tol], alvoMs: alvo,
          rotas: seqs(['l-cadeia'], 'luna'), deadline: alvo + tol + 1500, tempoLeitura: 900,
        };
      },
    },
    {
      id: 'luna-alvo', nome: 'Luna · Alvo da Cadeia', fase: F.INTEGRACAO, heroi: 'luna', motor: 'prioridade',
      objetivo: 'A cadeia não escolhe por você. Quem você persegue decide a luta.',
      explicacao: [
        'A pergunta é sempre a mesma na Luna: para onde o próximo salto leva você?',
        'Saltar para o alvo mais fácil costuma ser saltar para dentro do time inteiro.',
      ],
      treina: { decisao: 0.70, reflexo: 0.30 },
      cfg: (d) => ({
        tentativas: 10, cartas: d >= 5 ? 4 : 3,
        limite: Math.round(escala(d, 4000, 1900)),
        perguntas: ['abate', 'evitar'], rtBom: 1200, rtRuim: 3800,
      }),
    },
    {
      id: 'luna-pressao', nome: 'Luna · Cadeia sob Ruído', fase: F.PRESSAO, heroi: 'luna', motor: 'sequencia',
      objetivo: 'Manter a cadeia com a tela cheia de informação.',
      explicacao: [
        'A cadeia inteira, com ruído visual e leitura de quadrante.',
        'Se ela sobrevive aqui, ela sobrevive numa luta de time.',
      ],
      treina: { automatismo: 0.40, consistencia: 0.30, reflexo: 0.30 },
      cfg: (d) => ({
        tentativas: 8, modo: 'livre', mostrarRota: 'sempre',
        ruido: Math.max(1, Math.round(escala(d, 1, 4))), dupla: d >= 4,
        rotas: seqs(['l-cadeia'], 'luna'),
        alvoMs: Math.round(escala(d, 4200, 2600)),
        deadline: Math.round(escala(d, 8000, 5000)), tempoLeitura: 900,
      }),
    },
  ];

  const porId = (id) => DRILLS.find(d => d.id === id);

  /* ============================================================
     PROTOCOLO DE DIAGNÓSTICO
     Seis provas curtas. P3 e P4 usam a MESMA rota de propósito:
     a diferença entre elas é a medida de automatismo.
     ============================================================ */
  const ROTA_DIAG = ['s1', 'aa', 's2'];

  const DIAGNOSTICO = [
    {
      id: 'd1', nome: 'Toque', drill: 'ancoragem', dif: 4,
      mede: 'Precisão e tempo de localização de cada botão',
      explica: 'Onde o seu dedo realmente encosta, botão por botão.',
      cfg: { tentativas: 16, modo: 'livre', mostrarRota: 'antes', tempoLeitura: 800,
             rotas: [['s1'],['s2'],['s3'],['aa'],['flash'],['s1'],['s2'],['s3'],['aa'],['s3']],
             deadline: 1600, isiMin: 400, isiMax: 1200, foco: 'precisao' },
    },
    {
      id: 'd2', nome: 'Pontes', drill: 'pontes', dif: 4,
      mede: 'Tempo de percurso entre botões',
      explica: 'Quais trajetos do SEU HUD estão travando o polegar.',
      cfg: { tentativas: 18, modo: 'livre', mostrarRota: 'antes', tempoLeitura: 750,
             rotas: [['s1','aa'],['aa','s1'],['s1','s2'],['s2','s3'],['s1','s3'],['s3','aa'],
                     ['aa','flash'],['s2','aa'],['s3','s1'],['aa','s2'],['s3','flash'],['s2','s1']],
             deadline: 2200, alvoMs: 520 },
    },
    {
      id: 'd3', nome: 'Rota solo', drill: 'compasso', dif: 4,
      mede: 'Retenção da sequência, ritmo e regularidade',
      explica: 'Quanto da rota base ainda está gravada.',
      cfg: { tentativas: 10, modo: 'livre', mostrarRota: 'antes', tempoLeitura: 900,
             rotas: [ROTA_DIAG], alvoMs: 1100, deadline: 3200 },
    },
    {
      id: 'd4', nome: 'Rota sob carga', drill: 'dupla', dif: 4,
      mede: 'Automatismo (queda de desempenho sob atenção dividida)',
      explica: 'A MESMA rota da prova anterior, agora com leitura simultânea. A diferença entre as duas é a medida mais importante do diagnóstico.',
      cfg: { tentativas: 10, modo: 'livre', mostrarRota: 'antes', tempoLeitura: 900,
             rotas: [ROTA_DIAG], dupla: true, duplaVisivel: 450, alvoMs: 1100, deadline: 3600 },
    },
    {
      id: 'd5', nome: 'Reflexo com escolha', drill: 'gatilho', dif: 3,
      mede: 'Tempo de reação COM decisão e disciplina de não reagir',
      explica: 'Perceber, classificar e responder certo — inclusive não responder.',
      cfg: { tentativas: 12, sinais: SINAIS, limite: 1700, mascara: null,
             isiMin: 700, isiMax: 2000, rtBom: 420, rtRuim: 1200 },
    },
    {
      id: 'd6', nome: 'Freio', drill: 'freio', dif: 3,
      mede: 'Capacidade de abortar uma execução em andamento',
      explica: 'Quanto tempo você leva para soltar uma jogada depois do sinal de perigo.',
      cfg: { tentativas: 12, modo: 'livre', mostrarRota: 'sempre', freio: 0.40, janelaFreio: 850,
             rotas: [['s1','aa','s2','aa']], alvoMs: 1500, deadline: 4000, tempoLeitura: 700,
             motivosFreio: ['3 inimigos pela lateral', 'seu aliado morreu', 'o jungle apareceu atrás'] },
    },
  ];

  U.D = {
    ROTAS_PADRAO, ROTAS_LUNA, getRotas, rotaPorId, seqs,
    SINAIS, CENARIOS, DRILLS, porId, DIAGNOSTICO, ROTA_DIAG, F, escala,
  };

})(window.U);
