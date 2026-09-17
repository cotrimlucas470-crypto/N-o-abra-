/* ============================================================
   drills.js — catálogo V2
   ------------------------------------------------------------
   A V1 tinha 19 exercícios. Vários mediam a mesma coisa com nome
   diferente (Pontes/Pontes Cegas/Corte de Tempo/Janela eram todos
   "execute a rota" com um parâmetro trocado), e cada um carregava
   sua própria curva de dificuldade — o que espalhava a amostra e
   fazia com que nenhum acumulasse tentativas suficientes para
   medir nada.

   Aqui são 8 exercícios. Cada um alimenta UMA medida. O que antes
   eram exercícios separados virou parâmetro do controlador:
   com destaque / sem destaque, mais rápido / mais devagar, com
   ruído / sem ruído são níveis de dificuldade da mesma tarefa, e
   não tarefas diferentes. Assim a amostra se concentra e as
   medidas saem do território do "provisório".
   ============================================================ */
'use strict';
(function (U) {

  const CO = U.CO;
  const escala = (d, a, b) => a + (b - a) * ((U.clamp(d, 1, 10) - 1) / 9);
  const seqs = CO.seqs;

  /** Ajuda visual cai com a dificuldade: é parâmetro, não exercício. */
  function ajudaPor(d) {
    return d < 3.5 ? 'sempre' : d < 6.5 ? 'antes' : 'nunca';
  }
  /** Rotas ativas: no máximo 3 por sessão. Recuperar tudo ao mesmo
      tempo é a forma mais confiável de não recuperar nada. */
  function rotasDe(ctx, padrao) {
    const ids = (ctx && ctx.rotas) || padrao;
    return seqs(ids);
  }

  const DRILLS = [
    /* ---------------------------------------------------------- */
    {
      id: 'ancorar', nome: 'Ancoragem', motor: 'sequencia', mede: null,
      objetivo: 'Reencontrar cada botão e alimentar o mapa do seu polegar.',
      comoFunciona: [
        'Aparece o nome de um botão. Some. Quando surgir VAI, acerte esse botão.',
        'Mire o <b>miolo</b> do círculo. O alvo é o botão, não a sua mão — não fique acompanhando o dedo.',
        'Cada toque é gravado com a posição exata dentro do botão.',
        'É daqui que sai a dispersão do seu toque e a sua reta de tempo por trajeto, na aba HUD.',
      ],
      porque: 'Instruções que apontam o alvo (foco externo) produzem movimento mais automático do que instruções que apontam o próprio corpo. E os toques daqui são o único jeito de separar limite de layout de limite de treino.',
      cfg: (d, ctx) => ({
        tentativas: 20, modo: 'livre', mostrarRota: 'antes',
        tempoLeitura: Math.round(escala(d, 1100, 420)),
        rotas: [['s1'], ['s2'], ['s3'], ['aa'], ['flash'],
                ['s1', 'aa'], ['aa', 's1'], ['s1', 's3'], ['s3', 'aa'], ['s2', 's3'], ['aa', 'flash']],
        esquema: 'aleatorio',
        deadline: Math.round(escala(d, 2200, 1000)),
        isiMin: 350, isiMax: Math.round(escala(d, 900, 1600)),
      }),
    },
    /* ---------------------------------------------------------- */
    {
      id: 'ritmo', nome: 'Ritmo', motor: 'sequencia', mede: 'estabilidade',
      objetivo: 'Tirar a variação do combo. Regularidade antes de velocidade.',
      comoFunciona: [
        'Um metrônomo marca a batida. Um toque por batida — <b>na</b> batida, não antes.',
        'Adiantar conta como erro. A meta não é ser rápido: é ser previsível.',
        'A trilha entra no mesmo andamento: use a música como referência, não como fundo.',
        'O compasso fecha sozinho quando você firma no atual.',
      ],
      porque: 'Combo que sai diferente toda vez é combo que falha justo sob pressão. Esta é a única tarefa do sistema cujo critério é a regularidade e não o tempo.',
      cfg: (d, ctx) => ({
        tentativas: 14, modo: 'compasso', mostrarRota: d < 6 ? 'sempre' : 'antes',
        beat: Math.round(escala(d, 660, 300)),
        janela: Math.round(escala(d, 180, 95)),
        rotas: rotasDe(ctx, ['entrada', 'marca']),
        esquema: d < 4 ? 'bloco' : 'serial',
        tempoLeitura: 900,
      }),
    },
    /* ---------------------------------------------------------- */
    {
      id: 'rota', nome: 'Rota', motor: 'sequencia', mede: 'execucao',
      objetivo: 'Encontrar o tempo de rota que você sustenta — e empurrá-lo.',
      comoFunciona: [
        'Execute a rota mostrada dentro do tempo limite.',
        'O limite não é um recorde: é o tempo que você precisa <b>repetir</b> sem quebrar.',
        'Conforme você acerta, ele fecha. Se a taxa de erro sobe, ele volta sozinho.',
        'Acima da dificuldade 6 o botão para de acender e a rota some antes do VAI.',
      ],
      porque: 'É a tarefa de referência do sistema. O número que ela produz — o tempo sustentado a 85% de acerto — é a medida de execução, e é ele que aparece no painel. O acerto em si não mede nada aqui: ele é mantido constante pelo controlador de propósito.',
      cfg: (d, ctx) => {
        const rotas = rotasDe(ctx, ['marca', 'recorte']);
        const passos = U.mean(rotas.map(r => r.length)) || 3;
        const porPasso = escala(d, 520, 190);
        return {
          tentativas: 16, modo: 'livre', mostrarRota: ajudaPor(d),
          rotas, esquema: d < 3 ? 'bloco' : d < 5 ? 'serial' : 'aleatorio',
          alvoMs: Math.round(porPasso * passos),
          deadline: Math.round(porPasso * passos * 1.7 + 500),
          ruido: d >= 8 ? Math.round(escala(d, 0, 3)) : 0,
          tempoLeitura: Math.round(escala(d, 950, 450)),
        };
      },
    },
    /* ---------------------------------------------------------- */
    {
      id: 'movimento', nome: 'Andando', motor: 'sequencia', mede: 'execucao',
      objetivo: 'Executar sem parar de andar. Combo parado é combo morto.',
      comoFunciona: [
        'A seta dourada mostra a direção que o personagem precisa manter.',
        'Mantenha o traço <b>apontando para a seta</b> durante toda a execução.',
        'Soltar a direção no meio é erro, mesmo com todos os toques certos.',
        'Na parte alta da escala a seta muda no meio da rota.',
      ],
      porque: 'Separar mão direita de mão esquerda é artificial: numa partida elas nunca param ao mesmo tempo. Isto testa se a rota sobrevive quando a mão esquerda tem trabalho próprio.',
      cfg: (d, ctx) => ({
        tentativas: 14, modo: 'livre', mostrarRota: ajudaPor(d),
        mover: d >= 6 ? 'mudando' : 'fixo',
        tolDir: d >= 8 ? 0 : 1, movMin: escala(d, 0.45, 0.78),
        rotas: rotasDe(ctx, ['marca', 'execucao']),
        esquema: 'serial',
        alvoMs: Math.round(escala(d, 1700, 900)),
        deadline: Math.round(escala(d, 3800, 2000)), tempoLeitura: 800,
      }),
    },
    /* ---------------------------------------------------------- */
    {
      id: 'carga', nome: 'Carga', motor: 'sequencia', mede: 'custoDecisao',
      objetivo: 'Descobrir se a rota sai sozinha ou se ela come a sua atenção.',
      comoFunciona: [
        'A metade esquerda vira quatro quadrantes. Durante a execução, <b>um</b> pisca.',
        'Com o polegar esquerdo, toque o quadrante que piscou — sem a direita parar.',
        'Errar o quadrante invalida a tentativa mesmo com a rota perfeita. É o ponto.',
        'Se a rota desaba aqui e estava boa sozinha, ela ainda é consciente.',
      ],
      porque: 'Em luta a atenção é dividida por definição. Uma rota que só funciona com atenção total funciona em treino e falha em partida. Atenção: a diferença entre "com carga" e "sem carga" é um escore de diferença, e escores de diferença somam o ruído das duas medidas — por isso ela só aparece no painel depois de bastante amostra.',
      cfg: (d, ctx) => ({
        tentativas: 14, modo: 'livre', mostrarRota: d < 5 ? 'sempre' : 'antes',
        dupla: true, duplaVisivel: Math.round(escala(d, 540, 240)),
        rotas: rotasDe(ctx, ['marca', 'execucao']),
        esquema: 'serial',
        alvoMs: Math.round(escala(d, 1700, 950)),
        deadline: Math.round(escala(d, 3800, 2200)), tempoLeitura: 800,
      }),
    },
    /* ---------------------------------------------------------- */
    {
      id: 'ler', nome: 'Leitura', motor: 'leitura', mede: 'leitura',
      objetivo: 'Decidir com informação incompleta — que é o normal em luta.',
      comoFunciona: [
        'A situação aparece por um instante e some atrás de uma máscara.',
        'Quatro respostas: <b>ULTIMATE</b> (3) · <b>INVOCADOR</b> · <b>RECUAR</b> (analógico para trás) · <b>SEGUIR</b> (ataque).',
        'Algumas situações não pedem resposta nenhuma. Apertar nelas é erro.',
        'As janelas variam de propósito: o sistema precisa saber a partir de quanta informação você ainda acerta.',
      ],
      porque: 'Oclusão temporal — cortar a cena antes do desfecho — é a técnica de treino perceptivo com melhor evidência de transferência, com efeito grande e ganho que aparece também fora da tela. Uma das janelas é sempre 300 ms, porque é preciso um ponto fixo para comparar com a semana passada.',
      cfg: (d) => ({
        tentativas: 18, sinais: CO.SINAIS,
        janelas: d < 4 ? [600, 420, 300] : d < 7 ? [420, 300, 200] : [300, 200, 140],
        janelaRef: 300,
        limite: Math.round(escala(d, 2200, 1100)),
        isiMin: 650, isiMax: Math.round(escala(d, 1800, 2600)),
      }),
    },
    /* ---------------------------------------------------------- */
    {
      id: 'frear', nome: 'Freio', motor: 'sequencia', mede: 'aborto',
      objetivo: 'Descobrir com quanta antecedência você consegue cancelar uma jogada.',
      comoFunciona: [
        'Execute a rota normalmente. Em algumas tentativas aparece <b>PARAR</b> no meio.',
        'A partir do PARAR, qualquer toque é erro. Parar é segurar o dedo e puxar o analógico para trás.',
        'O sinal chega cada vez mais tarde até você falhar metade das vezes. É proposital.',
        'Ir devagar de propósito para acertar todos os PARAR falsifica a medida — e o sistema percebe e avisa.',
      ],
      porque: 'A V1 chamava o resultado disto de SSRT e devolvia milissegundos como medida psicométrica. O modelo de corrida que sustenta o SSRT assume independência de contexto, e essa premissa é violada com frequência e gravidade — ainda mais numa tarefa sequencial com alta taxa de sinais, que induz lentidão proativa. O número aqui é descritivo e verificável: quanto tempo antes do toque o perigo precisa aparecer para você parar metade das vezes.',
      cfg: (d, ctx) => ({
        tentativas: 24, modo: 'livre', mostrarRota: 'sempre',
        freio: 0.30, ssdPasso: 50,
        janelaFreio: Math.round(escala(d, 900, 620)),
        rotas: rotasDe(ctx, ['execucao', 'marca']),
        esquema: 'serial',
        motivosFreio: ['3 inimigos pela lateral', 'seu aliado morreu', 'o jungle saiu da mata atrás',
                       'o suporte chegou e escudou', 'você entrou no alcance da torre'],
        alvoMs: Math.round(escala(d, 1800, 1000)),
        deadline: Math.round(escala(d, 4200, 2600)), tempoLeitura: 700,
      }),
    },
    /* ---------------------------------------------------------- */
    {
      id: 'lutar', nome: 'Luta', motor: 'decisao', mede: 'custoDecisao',
      objetivo: 'Perceber, interpretar, decidir, executar e reavaliar — numa coisa só.',
      comoFunciona: [
        'A situação aparece por um instante. Leia o que der.',
        'Escolha a ação. Se ela implicar entrar, você executa a rota no HUD.',
        'No meio da execução a situação pode mudar. Aí a decisão volta a ser sua.',
        'Nas dificuldades altas alguns inimigos aparecem com estado <b>oculto</b>: decidir sem saber tudo é o conteúdo, não um defeito.',
      ],
      porque: 'Dividir o treino em "mecânica" e "raciocínio" para sempre treina duas coisas que nunca acontecem separadas. As situações são geradas por regra, e não tiradas de uma lista: uma lista fixa vira gabarito decorado em duas sessões e o exercício para de medir leitura.',
      cfg: (d) => ({
        tentativas: 10,
        dif: d,
        leitura: Math.round(escala(d, 2600, 900)),
        tempoDecisao: Math.round(escala(d, 3600, 1500)),
        janelaFreio: Math.round(escala(d, 1000, 650)),
        explicaNaHora: d < 6,
      }),
    },
    /* ---------------------------------------------------------- */
    {
      id: 'luna-elo', nome: 'Luna · Elo', motor: 'sequencia', heroi: 'luna', mede: null,
      objetivo: 'O elo básico da cadeia, um por vez.',
      comoFunciona: [
        'Marcar, bater, saltar. Encaixado na batida.',
        'A Luna não é um combo: é um elo repetido sem falha.',
        'Antes de encadear, o elo precisa sair igual todas as vezes.',
      ],
      porque: 'A Luna entra como módulo secundário e não dilui a Jing: o que ela acrescenta é ritmo de cadeia, que é uma exigência diferente.',
      cfg: (d) => ({
        tentativas: 12, modo: 'compasso', mostrarRota: 'sempre',
        beat: Math.round(escala(d, 620, 330)), janela: Math.round(escala(d, 175, 100)),
        rotas: seqs(['l-elo'], 'luna'), esquema: 'bloco', tempoLeitura: 850,
      }),
    },
    {
      id: 'luna-cadeia', nome: 'Luna · Cadeia', motor: 'sequencia', heroi: 'luna', mede: null,
      objetivo: 'Três elos seguidos. Um erro derruba tudo — como na partida.',
      comoFunciona: [
        'Nove toques sem falha. Qualquer botão errado encerra a tentativa na hora.',
        'Não existe recuperação no meio da cadeia. Existe não errar.',
        'O tempo limite fecha a cada nível: a cadeia é ritmo, não corrida.',
      ],
      porque: 'É o caso em que o desempenho do dia mais engana: acertar uma vez não é ter aprendido. O teste de retenção cobra isso depois.',
      cfg: (d) => ({
        tentativas: 10, modo: 'livre', mostrarRota: d < 6 ? 'sempre' : 'antes',
        rotas: seqs(['l-cadeia'], 'luna'), esquema: 'bloco',
        alvoMs: Math.round(escala(d, 4400, 2400)),
        deadline: Math.round(escala(d, 8000, 4800)), tempoLeitura: 900,
      }),
    },
  ];

  const porId = (id) => DRILLS.find(x => x.id === id);
  const deJing = () => DRILLS.filter(x => !x.heroi);
  const deLuna = () => DRILLS.filter(x => x.heroi === 'luna');

  /* ============================================================
     PROVA — o instrumento de medida
     ------------------------------------------------------------
     Condição FIXA para sempre. Sem retorno por tentativa, sem botão
     aceso, mesma rota, mesma janela de oclusão. É o que permite
     comparar hoje com daqui a um mês: o treino adapta, a prova não.
     ~65 tentativas, 9-11 minutos. A amostra ACUMULA entre provas,
     e é por isso que as medidas saem de "provisório" com o tempo.
     ============================================================ */
  const PROVA = [
    {
      id: 'p1', nome: 'Rota sem ajuda', motor: 'sequencia', alimenta: 'execução e estabilidade',
      explica: 'A rota de referência (1 › AA › 2) no tempo de referência, sem destaque e sem retorno. 20 tentativas.',
      cfg: {
        tentativas: 20, modo: 'livre', mostrarRota: 'antes', tempoLeitura: 800,
        rotas: [['s1', 'aa', 's2']], esquema: 'bloco',
        alvoMs: 1100, deadline: 2600, semRetorno: true, ref: true,
      },
    },
    {
      id: 'p2', nome: 'Leitura a 300 ms', motor: 'leitura', alimenta: 'leitura',
      explica: 'A janela de oclusão fixa em 300 ms, sempre. 18 tentativas, sem explicação entre elas.',
      cfg: {
        tentativas: 18, sinais: CO.SINAIS, janelas: [300], janelaRef: 300,
        limite: 1700, isiMin: 650, isiMax: 2000, semRetorno: true, ref: true,
      },
    },
    {
      id: 'p3', nome: 'Freio', motor: 'sequencia', alimenta: 'janela de aborto',
      explica: 'Escada adaptativa até a taxa de parada chegar perto de 50%. 18 tentativas.',
      cfg: {
        tentativas: 18, modo: 'livre', mostrarRota: 'sempre', tempoLeitura: 700,
        freio: 0.34, ssdPasso: 50, janelaFreio: 800,
        rotas: [['s1', 'aa', 's2', 'aa']], esquema: 'bloco',
        alvoMs: 1500, deadline: 3800, semRetorno: true, ref: true,
        motivosFreio: ['3 inimigos pela lateral', 'seu aliado morreu', 'o jungle apareceu atrás'],
      },
    },
    {
      id: 'p4', nome: 'Executando sob decisão', motor: 'decisao', alimenta: 'custo da decisão',
      explica: 'A mesma rota, agora precedida de uma leitura e uma escolha. 10 tentativas.',
      cfg: {
        tentativas: 10, dif: 5, leitura: 1800, tempoDecisao: 2400, janelaFreio: 800,
        explicaNaHora: false, semRetorno: true, ref: true, rotaFixa: ['s1', 'aa', 's2'],
      },
    },
  ];

  /* Teste de retenção: mesma condição da prova p1, menos tentativas. */
  const RETENCAO = {
    nome: 'Teste de retenção', motor: 'sequencia',
    cfg: {
      tentativas: 15, modo: 'livre', mostrarRota: 'antes', tempoLeitura: 800,
      rotas: [['s1', 'aa', 's2']], esquema: 'bloco',
      alvoMs: 1100, deadline: 2600, semRetorno: true, ref: true, modo_: 'retencao',
    },
  };

  U.D = { DRILLS, porId, deJing, deLuna, PROVA, RETENCAO, escala, ajudaPor };

})(window.U);
