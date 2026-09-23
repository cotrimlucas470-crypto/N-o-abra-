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

  /* ============================================================
     CATEGORIAS — o que cada exercício treina
     ------------------------------------------------------------
     Este sistema não deixa você escolher exercício num menu (a
     prescrição é do treinador, de propósito — ver DS.plano()). Mas
     "geral, sem nome" não é a mesma coisa que "sem categoria": cada
     exercício treina UMA coisa específica, e ela tem nome. Oito
     categorias, não um número redondo escolhido por estética:
     Percepção, Reflexo e Movimentação porque foram pedidas por
     nome; Mecânica, Precisão, Consistência, Decisão e Controle sob
     pressão porque são as outras cinco coisas que os exercícios já
     treinavam sem rótulo — a maioria delas é também eixo medido no
     Estado (a exceção é Movimentação, que ainda não tem eixo
     próprio: 'movimento' alimenta o mesmo limiar de execução que
     'rota', então por enquanto ela é categoria de treino sem ser
     medida à parte).
     ============================================================ */
  const CATEGORIAS = {
    mecanica: { nome: 'Mecânica', descricao: 'Executar o combo no tempo — sem travar, sem gaguejar.' },
    precisao: { nome: 'Precisão', descricao: 'Onde o dedo cai dentro do botão, não só se caiu.' },
    consistencia: { nome: 'Consistência', descricao: 'Sair igual toda vez. Ritmo que não varia.' },
    percepcao: { nome: 'Percepção', descricao: 'Decidir certo com pouca informação na tela.' },
    reflexo: { nome: 'Reflexo', descricao: 'Tempo entre ver o sinal e responder — inclusive para abortar.' },
    decisao: { nome: 'Decisão', descricao: 'Ler, escolher a ação certa e executar — as três juntas, como numa partida.' },
    pressao: { nome: 'Controle sob pressão', descricao: 'Quanto do seu nível sobrevive com a atenção dividida.' },
    movimentacao: { nome: 'Movimentação', descricao: 'Executar andando. Combo parado é combo que só existe em treino.' },
    visao: { nome: 'Visão de mapa', descricao: 'Codificar o minimapa numa relanceada e ainda ter aquilo na cabeça segundos depois.' },
    mira: { nome: 'Mira', descricao: 'Arrastar o polegar num canto da tela e a habilidade sair na direção certa no outro.' },
  };

  const DRILLS = [
    /* ---------------------------------------------------------- */
    {
      id: 'trajeto', nome: 'Trajeto caro', motor: 'sequencia', mede: null, categoria: 'mecanica',
      objetivo: 'Repetir só o pedaço do combo que custa mais do que devia.',
      comoFunciona: [
        'Duas teclas por tentativa: exatamente o trajeto que o sistema mediu como lento.',
        'Não é o combo inteiro. É o pedaço dele que está atrasando o resto.',
        'O alvo é o miolo do botão de chegada — trajeto lento quase sempre é trajeto impreciso.',
        'O sistema compara o seu tempo neste par com o que a distância entre os dois botões pede.',
      ],
      porque: 'Um combo não falha por inteiro, falha num trajeto. A sua própria reta de tempo por distância diz quais pares demoram mais do que a distância explica — e só nesses a repetição rende, porque nos outros o tempo já é o que a física do polegar permite.',
      cfg: (d, ctx) => {
        const pr = U.PR && U.PR.trajetosCaros({});
        const rotas = (pr && pr.ok && pr.rotas.length) ? pr.rotas
                    : [['s1', 'aa'], ['aa', 's2'], ['s2', 's3']];
        return {
          tentativas: 24, modo: 'livre', mostrarRota: d < 5 ? 'sempre' : 'antes',
          rotas, esquema: d < 4 ? 'bloco' : 'serial',
          tempoLeitura: Math.round(escala(d, 900, 380)),
          deadline: Math.round(escala(d, 1600, 700)),
          alvoMs: Math.round(escala(d, 900, 380)),
          escadaViva: { inicio: escala(d, 450, 190), passo: 25, passoFino: 12, min: 100, max: 600, faixa: [450, 190] },
          isiMin: 320, isiMax: Math.round(escala(d, 800, 1300)),
        };
      },
    },
    {
      id: 'ancorar', nome: 'Ancoragem', motor: 'sequencia', mede: null, categoria: 'precisao',
      objetivo: 'Reencontrar cada botão e alimentar o mapa do seu polegar.',
      comoFunciona: [
        'Aparece o nome de um botão. Some. Quando surgir VAI, acerte esse botão.',
        'Mire o <b>miolo</b> do círculo. O alvo é o botão, não a sua mão — não fique acompanhando o dedo.',
        'Cada toque vira um <b>ponto dentro do botão</b>, exatamente onde o seu dedo caiu. O último fica dourado.',
        'A partir do quinto toque aparecem também a <b>elipse</b> que cobre 95% deles e, se houver, a <b>seta do viés</b>: a direção para onde o seu dedo puxa sem você perceber.',
        'É daqui que sai a dispersão do seu toque e a sua reta de tempo por trajeto, na aba HUD.',
      ],
      porque: 'Repetir um toque sem ver ONDE ele caiu não corrige nada: o que ajusta um movimento é saber o erro dele, e "acertou o botão" não é o erro, é o resultado. O app já media essa nuvem no histórico; agora ela aparece enquanto você treina, que é quando dá para fazer alguma coisa com ela. Instruções que apontam o alvo (foco externo) também produzem movimento mais automático do que instruções que apontam o próprio corpo — por isso o retorno é desenhado no botão e não no seu dedo.',
      cfg: (d, ctx) => ({
        tentativas: 20, modo: 'livre', mostrarRota: 'antes',
        dispersao: true,
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
      id: 'ritmo', nome: 'Ritmo', motor: 'sequencia', mede: 'estabilidade', categoria: 'consistencia',
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
      id: 'rota', nome: 'Rota', motor: 'sequencia', mede: 'execucao', categoria: 'mecanica',
      objetivo: 'Encontrar o tempo de rota que você sustenta — e empurrá-lo.',
      comoFunciona: [
        'Execute a rota mostrada dentro do tempo limite. O limite aparece junto da rota, em ms.',
        'Ele se ajusta <b>a cada tentativa</b>: acertou, ele fecha um pouco; errou, ele abre bem mais. A diferença entre os dois passos é o que faz ele parar exatamente no ponto em que você acerta 85%.',
        'O limite não é um recorde: é o tempo que você precisa <b>repetir</b> sem quebrar.',
        'O bloco começa um pouco acima de onde o último terminou — as primeiras tentativas são para aquecer, não para errar.',
        'Acima da dificuldade 6 o botão para de acender e a rota some antes do VAI.',
      ],
      porque: 'É a tarefa de referência do sistema. O número que ela produz — o tempo sustentado a 85% de acerto — é a medida de execução, e é ele que aparece no painel. O acerto em si não mede nada aqui: ele é mantido constante pelo controlador de propósito.',
      cfg: (d, ctx) => {
        const rotas = rotasDe(ctx, ['marca', 'recorte']);
        const passos = U.mean(rotas.map(r => r.length)) || 3;
        const porPasso = escala(d, 520, 190);
        return {
          /* 24 e não 16: na simulação, com 16 tentativas a escada quase
             nunca oscila o bastante para achar dois vales */
          tentativas: 24, modo: 'livre', mostrarRota: ajudaPor(d),
          rotas, esquema: d < 3 ? 'bloco' : d < 5 ? 'serial' : 'aleatorio',
          alvoMs: Math.round(porPasso * passos),
          deadline: Math.round(porPasso * passos * 1.7 + 500),
          /* faixa = ms por passo na dificuldade 1 e na 10: é por ela que o
             limiar medido volta a ser uma dificuldade entre blocos */
          escadaViva: { inicio: porPasso, passo: 25, passoFino: 12, min: 120, max: 650, faixa: [520, 190] },
          tempoLeitura: Math.round(escala(d, 950, 450)),
          /* variante e perturbação entram sozinhas na parte alta da escala:
             sem elas não dá para separar habilidade de padrão decorado */
          variante: d >= 5, varianteProb: 0.35,
          perturbacao: d >= 6 ? 'janela' : null, pertProb: 0.35,
        };
      },
    },
    /* ---------------------------------------------------------- */
    {
      id: 'movimento', nome: 'Andando', motor: 'sequencia', mede: 'execucao', categoria: 'movimentacao',
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
      id: 'carga', nome: 'Carga', motor: 'sequencia', mede: 'custoDecisao', categoria: 'pressao',
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
      id: 'ler', nome: 'Leitura', motor: 'leitura', mede: 'leitura', categoria: 'percepcao',
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
        /* confiança só a partir do meio da escala: nos primeiros níveis
           a pergunta atrapalha mais do que informa */
        confianca: d >= 3, tempoConfianca: 2200,
      }),
    },
    /* ---------------------------------------------------------- */
    {
      id: 'frear', nome: 'Freio', motor: 'sequencia', mede: 'aborto', categoria: 'reflexo',
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
      id: 'lutar', nome: 'Luta', motor: 'decisao', mede: 'custoDecisao', categoria: 'decisao',
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
        confianca: d >= 4, tempoConfianca: 2000,
      }),
    },
    /* ============================================================
       MIRA

       A habilidade mecânica mais usada do jogo e a última grande que
       faltava aqui. Ela não é um caso da Rota: rota é SEQUÊNCIA (a
       ordem certa no tempo certo), mira é MAPEAMENTO (o polegar anda
       milímetros num canto e a consequência acontece no outro, num
       referencial que não é o do dedo). Treinar uma não melhora a
       outra, e por isso ela é exercício e categoria próprios.
       ============================================================ */
    {
      id: 'mira', nome: 'Mira', motor: 'mira', mede: null, categoria: 'mira',
      objetivo: 'Soltar a habilidade na direção certa — medido em graus, não em acertou/errou.',
      comoFunciona: [
        'O seu herói fica parado no meio do campo. O botão que você vai usar acende <b>antes</b> do alvo aparecer.',
        'Quando o alvo surgir, <b>segure esse botão e arraste</b> na direção dele. Solte para atirar.',
        'A linha azul é para onde você está mirando e o cone é a tolerância — o quanto de erro ainda conta como acerto.',
        'Errou? Aparece a linha <b>verde</b>, que era a direção certa, ao lado da sua. Ver as duas juntas é o que corrige a mira; um "errou" sozinho não corrige nada.',
        'Da dificuldade 8 em diante <b>o alvo anda</b>. Aí a direção certa deixa de ser onde ele está e passa a ser onde ele vai estar quando o tiro chegar.',
        'Arrasto curto demais não conta como direção: o exercício avisa em vez de inventar um ângulo a partir de três pixels.',
      ],
      porque: 'Um tiro que passa 4° do alvo e um que passa 40° são a mesma coisa para um placar de acertou/errou, e coisas completamente diferentes para quem quer melhorar. Por isso a medida daqui é o erro angular em graus, contínuo. O exercício também guarda o erro COM SINAL por direção: arrasto de polegar tem desvio sistemático, porque a mão pivota e as direções que exigem abrir a mão saem curtas. Isso é anatomia, não desatenção — e dá para corrigir de propósito, mas só depois que alguém disser em que direção acontece.',
      cfg: (d) => ({
        tentativas: 16,
        botoes: ['s1', 's2', 's3'],
        tolerancia: Math.round(escala(d, 22, 7)),
        limite: Math.round(escala(d, 3200, 1500)),
        tempoLeitura: Math.round(escala(d, 1100, 500)),
        alcance: 0.26,
        distMin: +escala(d, 0.20, 0.15).toFixed(3),
        distMax: +escala(d, 0.26, 0.32).toFixed(3),
        raioAlvo: +escala(d, 0.030, 0.018).toFixed(3),
        magMin: 0.35,
        movimento: d >= 8,
        velMin: +escala(d, 0.05, 0.09).toFixed(3),
        velMax: +escala(d, 0.10, 0.16).toFixed(3),
        voo: +escala(d, 0.30, 0.42).toFixed(2),
        heroiX: 0.34, heroiY: 0.52,
      }),
    },
    /* ============================================================
       QUEBRA DO ESPELHO — o reset da Jing

       O único exercício do catálogo que só faz sentido para ela. A
       mecânica vem do kit cruzado em dados/herois/_habilidades.js,
       passiva com confiança alta: a quebra das duas marcas zera a 1 e
       a 2, e a passiva trava por 5 s. Ver js/motor-reset.js para o que
       é do jogo e o que é ilustrativo nesta tela.
       ============================================================ */
    {
      id: 'espelho', nome: 'Quebra do Espelho', motor: 'reset', mede: null, categoria: 'reflexo',
      objetivo: 'Pegar o reset da Jing na hora — e não apertar quando a passiva está travada.',
      comoFunciona: [
        'Abra com <b>1 › AA</b>: o avanço e o ataque duplo. As duas marcas aparecem no alvo — ◆ a sua, ◇ a da imagem.',
        'Quando as marcas <b>quebram</b>, a recarga da 1 e da 2 some. Aperte uma das duas o mais rápido que der: é o reset, e o tempo é medido.',
        'Depois da quebra a passiva <b>trava por 5 s</b> — o botão P mostra a trava correndo. Se as marcas fecharem de novo dentro desse tempo, <b>nada quebra</b>.',
        'Apertar a 1 ou a 2 com a passiva travada é toque perdido: a habilidade está em recarga e o jogo ignora. Aqui isso conta como erro.',
        'Olhe o P. Quem acompanha a trava sabe se o próximo reset vem — e já deixa a mão pronta.',
        'Da dificuldade 6 em diante o segundo fechamento de marcas cai perto dos 5 s, que é onde a decisão é difícil de verdade.',
      ],
      porque: 'É o reset que faz da Jing um herói de explosão: quem solta a 1 e a 2 de novo na hora da quebra dobra o dano da troca; quem demora joga com metade. E o erro simétrico custa o mesmo — apertar com a passiva travada gasta o momento num toque que o jogo ignora. As duas coisas são percepção e resposta com o sinal que o próprio jogo dá, e por isso dá para treinar fora dele. O que este exercício NÃO simula é qual golpe completa a segunda marca: as buscas não deixam isso claro, e o treino não finge saber.',
      cfg: (d) => ({
        tentativas: 12,
        janela: Math.round(escala(d, 1300, 550)),
        estilhacos: Math.round(escala(d, 16, 4)),
        fronteira: d >= 6,
        esperaMin: 250, esperaMax: Math.round(escala(d, 900, 1500)),
        limiteAbertura: 4500,
      }),
    },
    {
      id: 'punir', nome: 'Punir no Tirano', motor: 'punir', mede: null, categoria: 'reflexo',
      objetivo: 'Garantir Tirano e Soberano com o Punir: nem antes da vida caber no dano, nem depois do caçador inimigo.',
      comoFunciona: [
        'A equipe bate no monstro e a vida desce. Embaixo da barra está quanto o <b>seu Punir</b> tira — o número muda a cada tentativa.',
        'Aperte o botão <b>PU</b> (o do feitiço) quando a vida couber no dano. Antes disso o Punir sai, não mata, e é erro.',
        'Quando aparece o <b>caçador inimigo</b>, ele também está esperando a vida caber: quem aperta primeiro leva.',
        'Até a dificuldade 4 a barra mostra a linha do Punir; até a 7, o número da vida. Depois, só a barra, como no jogo.',
        'Golpes dourados são o pico de dano (o combo entrando): a vida pula de uma vez, às vezes por cima da linha.',
      ],
      porque: 'A Jing joga na selva com Punir — as duas buscas da build concordam. Objetivo no rio se decide num instante, e os dois erros custam o mesmo: cedo entrega o Punir, tarde entrega o monstro. É leitura de barra, comparação com um número e tempo de resposta sob pressão — dá para treinar fora da partida. Os números (vida e dano) são ilustrativos: no jogo eles mudam com o nível e com o tempo de partida, e por isso aqui o dano muda a cada tentativa.',
      cfg: (d) => ({
        tentativas: 12,
        ritmo: Math.round(escala(d, 540, 260)),
        danoMedio: Math.round(escala(d, 260, 520)),
        variacao: +escala(d, 0.2, 0.65).toFixed(2),
        pico: d >= 4 ? 0.15 : 0,
        fracInimigo: d < 3 ? 0 : d < 6 ? 0.5 : 0.75,
        reacaoInimigo: Math.round(escala(d, 1100, 420)),
        linha: d < 5,
        numeroHp: d < 8,
        soberano: d >= 3,
      }),
    },
    {
      id: 'antecipar', nome: 'Leitura do Inimigo', motor: 'antecipa', mede: null, categoria: 'percepcao',
      objetivo: 'Ler a preparação do inimigo — o giro, a arma, o agachar — e decidir antes de o golpe sair.',
      comoFunciona: [
        'O inimigo se prepara com o corpo. <b>Tiro</b>: gira e mira um pouco acima ou abaixo de você — desvie para o lado OPOSTO (analógico para cima ou para baixo).',
        '<b>Salto</b>: gira para você e agacha — recue (analógico para trás). <b>Fuga</b>: vira as costas — persiga com a <b>1</b>.',
        '<b>Finta</b> (da dificuldade 4 em diante): começa igual ao tiro e desiste — não faça nada.',
        'A tela <b>apaga antes do golpe sair</b>. Decida com o que viu — pode responder antes do corte, se já leu.',
        'Depois de cada decisão a jogada é <b>reprisada inteira, sem corte</b>. Olhe a reprise: é ela que corrige a sua leitura.',
      ],
      porque: 'Oclusão temporal — ver a preparação, cortar antes do desfecho e decidir — é a técnica de treino perceptivo com melhor sustentação no esporte, e o ganho aparece também fora da tela. O que se treina é ler o CORPO do adversário. O exercício de Leitura mostra um ícone; este mostra movimento, que é o que os estudos usam. A reprise depois da decisão é o retorno de desfecho, parte do método. O boneco é ilustrativo: não é a animação de um herói real.',
      cfg: (d) => ({
        tentativas: 16,
        janelas: d <= 2 ? [0, -150, null] : d <= 5 ? [0, -150, -300] : d <= 8 ? [-150, -300, -400] : [-150, -300, -450],
        preparo: Math.round(escala(d, 720, 480)),
        desvio: Math.round(escala(d, 18, 9)),
        finta: d >= 4,
        dica: d <= 3,
        limite: Math.round(escala(d, 900, 550)),
      }),
    },
    /* ============================================================
       VISÃO DE MAPA

       Os dois exercícios abaixo são a mesma tarefa com UMA diferença:
       o segundo pergunta pelo sinal ANTERIOR ao último, o primeiro
       pelo último. Isso é de propósito e é a mesma regra que rege o
       resto do catálogo — mais devagar, sem destaque, com ruído são
       níveis da mesma tarefa e não tarefas novas, porque assim a
       amostra se concentra em vez de se espalhar.

       A geometria do mapa, as cinco leituras e a pontuação estão em
       js/mapa.js; o ciclo da tentativa, em js/motor-mapa.js.
       ============================================================ */
    {
      id: 'mapa', nome: 'Visão de mapa', motor: 'mapa', mede: null, categoria: 'visao',
      objetivo: 'Pegar o sinal de canto de olho, segurar na cabeça e dizer onde era e o que queria dizer.',
      comoFunciona: [
        'O minimapa fica <b>pequeno, no canto</b> — onde ele está no jogo. Sinais piscam nele em intervalos sorteados de 1 a 6 segundos.',
        'Cada cor quer dizer uma coisa, e a cor vem do <b>lugar</b>: vermelho é invasão na sua selva, azul é o caçador deles farmando na selva dele, amarelo é Tirano ou Soberano no rio, roxo é alguém limpando o miolo de uma rota, verde é recuo para uma das bases.',
        'Em algum momento que você não consegue prever, <b>a tela congela</b>. O mapa cresce e você toca o lugar exato onde o último sinal estava.',
        'Depois você escolhe, entre as cinco, a leitura daquele sinal. A partir da dificuldade 4 ainda vem uma terceira pergunta: qual objetivo exatamente.',
        'Da dificuldade 4 em diante um <b>alvo acende no meio da tela</b> e precisa ser tocado. Ele existe para tirar o seu olho do mapa — é assim na partida.',
        'Da 6 em diante aparecem <b>sinais de aliado</b>, em losango branco. Eles não são a pergunta e têm que ser descartados no ato.',
        'Pontos: até 60 pela distância do seu toque até o ponto certo, 20 por cair na área certa, 25 pela leitura, até 15 por responder rápido e 20 pelo objetivo exato.',
      ],
      porque: 'Consciência de mapa não é olhar mais o minimapa: é conseguir codificar numa relanceada e ainda ter aquilo na cabeça alguns segundos depois, fazendo outra coisa. São três habilidades e este exercício mede as três separadas. O intervalo entre o sinal e a pergunta é sorteado de propósito entre três valores fixos, o que transforma o resultado numa curva de esquecimento ("aos 8 segundos você já perdeu metade") em vez de um "% de acerto" que mistura tudo. E o lugar é respondido tocando o mapa, não escolhendo um botão: a distância do palpite até a verdade separa "lembrei mal" de "não lembrei", coisa que certo/errado joga fora.',
      cfg: (d) => ({
        tentativas: 12,
        flash: Math.round(escala(d, 1200, 420)),
        isiMin: Math.round(escala(d, 1400, 900)),
        isiMax: Math.round(escala(d, 6000, 2800)),
        preMin: 1, preMax: d < 5 ? 2 : 3,
        retencoes: [
          Math.round(escala(d, 1800, 3000) / 100) * 100,
          Math.round(escala(d, 3600, 6200) / 100) * 100,
          Math.round(escala(d, 5500, 10000) / 100) * 100,
        ],
        nBacks: [0],
        rotulos: d < 3.5,
        objetivoFino: d >= 4,
        secundaria: d >= 4,
        secIsiMin: Math.round(escala(d, 2200, 1200)),
        secIsiMax: Math.round(escala(d, 3600, 2200)),
        secVida: Math.round(escala(d, 1400, 800)),
        distratores: d < 6 ? 0 : +(0.25 + (U.clamp(d, 6, 10) - 6) / 4 * 0.35).toFixed(2),
        tempoOnde: Math.round(escala(d, 7000, 3800)),
        tempoLeitura: Math.round(escala(d, 5000, 2800)),
        tempoFino: Math.round(escala(d, 3600, 2400)),
        tempoRetorno: Math.round(escala(d, 4200, 2600)),
      }),
    },
    {
      id: 'mapa-atraso', nome: 'Mapa atrasado', motor: 'mapa', mede: null, categoria: 'visao',
      objetivo: 'Responder pelo sinal ANTERIOR ao último, com outro já por cima dele.',
      comoFunciona: [
        'Igual ao Visão de mapa, com uma diferença: a pergunta é sobre o sinal inimigo que veio <b>antes</b> do último.',
        'Depois do sinal que interessa, outro pisca — e é ele que você vai querer responder. Segurar o primeiro enquanto o segundo entra é o exercício inteiro.',
        'Sinais de aliado continuam não contando. Eles não empurram a fila.',
      ],
      porque: 'Numa partida a informação nova não espera você processar a velha. Manter o item anterior enquanto um novo chega é uma exigência diferente de só lembrar do último, e é ela que falha primeiro quando a luta começa. Este exercício isola essa exigência: tudo o mais é igual ao Visão de mapa, então a diferença de acerto entre os dois é atribuível a ela e não a outra coisa.',
      cfg: (d) => ({
        tentativas: 10,
        flash: Math.round(escala(d, 1100, 450)),
        isiMin: Math.round(escala(d, 1300, 900)),
        isiMax: Math.round(escala(d, 4200, 2400)),
        preMin: 1, preMax: 2,
        retencoes: [
          Math.round(escala(d, 2600, 4200) / 100) * 100,
          Math.round(escala(d, 4600, 7000) / 100) * 100,
          Math.round(escala(d, 6400, 10000) / 100) * 100,
        ],
        nBacks: d < 6 ? [1] : [1, 1, 2],
        rotulos: d < 3,
        objetivoFino: d >= 5,
        secundaria: d >= 5,
        secIsiMin: Math.round(escala(d, 2400, 1400)),
        secIsiMax: Math.round(escala(d, 3800, 2400)),
        secVida: Math.round(escala(d, 1400, 850)),
        distratores: d < 5 ? 0 : +(0.25 + (U.clamp(d, 5, 10) - 5) / 5 * 0.35).toFixed(2),
        tempoOnde: Math.round(escala(d, 7000, 4200)),
        tempoLeitura: Math.round(escala(d, 5000, 3000)),
        tempoFino: Math.round(escala(d, 3600, 2400)),
        tempoRetorno: Math.round(escala(d, 4200, 2800)),
      }),
    },
    /* ---------------------------------------------------------- */
    {
      id: 'luna-elo', nome: 'Luna · Elo', motor: 'sequencia', heroi: 'luna', mede: null, categoria: 'consistencia',
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
      id: 'luna-cadeia', nome: 'Luna · Cadeia', motor: 'sequencia', heroi: 'luna', mede: null, categoria: 'mecanica',
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

  /* ============================================================
     AJUSTES ADVERSARIAIS
     O treinador não escolhe só QUAL exercício: escolhe COMO ele vai
     ser montado, para atacar o achado do gêmeo motor. Cada ajuste
     muda um parâmetro e nada mais — assim continua sendo possível
     dizer qual variável causou a mudança de desempenho.
     ============================================================ */
  const AJUSTES = {
    segurar_tempo: {
      nome: 'tempo folgado', o_que: 'o limite volta 20% e a rota repete em bloco',
      aplicar: (c) => { c.alvoMs = Math.round((c.alvoMs || 1100) * 1.2);
                        c.deadline = Math.round((c.deadline || 2000) * 1.2);
                        c.esquema = 'bloco'; c.perturbacao = null; c.variante = false; },
    },
    janela_estreita: {
      nome: 'janela apertada', o_que: 'a tolerância do compasso fecha',
      aplicar: (c) => { c.janela = Math.round((c.janela || 140) * 0.7); },
    },
    sem_dica: {
      nome: 'sem destaque', o_que: 'o botão não acende em nenhuma tentativa',
      aplicar: (c) => { c.mostrarRota = 'nunca'; },
    },
    so_variantes: {
      nome: 'só armadilhas', o_que: 'a pista saliente aponta para o lado errado',
      aplicar: (c) => { c.soArmadilhas = true; },
    },
    mais_trocas: {
      nome: 'troca de plano', o_que: 'a rota muda no meio em metade das tentativas',
      aplicar: (c) => { c.troca = 0.5; },
    },
    punir_chute: {
      nome: 'confiança cobrada', o_que: 'toda resposta pede o seu grau de certeza',
      aplicar: (c) => { c.confianca = true; },
    },
    premiar_decisao: {
      nome: 'confiança cobrada', o_que: 'toda resposta pede o seu grau de certeza',
      aplicar: (c) => { c.confianca = true; },
    },
  };
  for (const p of ['ritmo', 'alvo', 'ordem', 'falso', 'janela', 'ameaca', 'incompleta']) {
    const P = (U.GM && U.GM.PERTURBACOES[p]) || {};
    AJUSTES['perturbar_' + p] = {
      nome: 'perturbação: ' + (P.nome || p),
      /* nomear a variável não é enfeite: sem isso o briefing dizia "metade
         das tentativas com essa variável alterada" sem nunca dizer qual, e
         você entrava num exercício modificado sem saber o que mudou. */
      o_que: `${P.nome || p} — ${P.o_que || 'uma variável alterada'}. Isso acontece em metade das ` +
             `tentativas; a outra metade vem normal, no mesmo set, e é ela a linha de base da comparação`,
      aplicar: (c) => { c.perturbacao = p; c.pertProb = 0.5; },
    };
  }
  for (const v of ['entrar', 'esperar', 'recuar']) {
    AJUSTES['viesar_' + v] = {
      nome: 'insistir no seu viés',
      o_que: `mais situações em que ${v.toUpperCase()} é a resposta errada`,
      aplicar: (c) => { c.viesar = v; c.soArmadilhas = true; },
    };
  }

  function aplicarAjuste(cfg, ajuste) {
    const A = AJUSTES[ajuste];
    if (!A) return cfg;
    A.aplicar(cfg);
    cfg.__ajuste = ajuste;
    return cfg;
  }

  /* ============================================================
     ÚLTIMA TENTATIVA — bloco cego
     Situação inédita, perturbação que não apareceu na sessão,
     retorno mínimo. Alimenta o eixo de Adaptação.
     Peso: NÃO é maior que os outros blocos. Pesar mais uma medida
     de 8 tentativas seria dar autoridade a um número que não a tem;
     ela entra como amostra do eixo de adaptação e nada além disso.
     ============================================================ */
  const FINAL_CEGO = {
    nome: 'Última tentativa', motor: 'decisao',
    cfg: {
      tentativas: 8, dif: 6, leitura: 1500, tempoDecisao: 2200, janelaFreio: 800,
      explicaNaHora: false, semRetorno: true, soArmadilhas: true, confianca: true,
      tempoConfianca: 1800,
    },
  };

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
        confianca: true, tempoConfianca: 1800,
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
        confianca: true, tempoConfianca: 1800,
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

  U.D = { DRILLS, porId, deJing, deLuna, PROVA, RETENCAO, FINAL_CEGO, AJUSTES, aplicarAjuste, escala, ajudaPor, CATEGORIAS };

})(window.U);
