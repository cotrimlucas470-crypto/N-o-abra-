/* ============================================================
   ciencia.js — o método e a auditoria
   ------------------------------------------------------------
   Esta versão saiu de uma segunda rodada de leitura feita para
   PROCURAR contradições ao que a V1 fazia, e não para justificá-la.
   Três coisas foram rebaixadas ou removidas por isso. Estão aqui
   com o mesmo destaque das que ficaram.
   ============================================================ */
'use strict';
(function (U) {

  const FORCA = {
    forte:    { nome: 'Evidência forte' },
    moderada: { nome: 'Evidência moderada' },
    mista:    { nome: 'Evidência mista' },
    contra:   { nome: 'Evidência CONTRA' },
  };

  /* ============================================================
     O QUE MUDOU DA V1 PARA A V2, E POR QUÊ
     ============================================================ */
  const AUDITORIA = [
    { alvo: '8 eixos de habilidade 0-100', veredito: 'substituído',
      porque: 'Eram médias móveis sobre sets de 10-20 tentativas, sem unidade e sem incerteza. Uma proporção com n=12 tem intervalo de ~40 pontos. Viraram 5 medidas com unidade, direção e intervalo de confiança.' },
    { alvo: 'Classificação de ferrugem em 6 estados por rota', veredito: 'removido',
      porque: 'Rotulava uma rota de "perdida" ou "automática" a partir de 3 tentativas. Era a pseudoprecisão mais grave do sistema.' },
    { alvo: 'SSRT em milissegundos', veredito: 'rebaixado',
      porque: 'O modelo que sustenta o SSRT assume independência de contexto, premissa violada com frequência e gravidade — e a tarefa aqui é sequencial, com taxa de sinais alta, o que induz lentidão proativa. O treino ficou; o número virou descritivo e o sistema avisa quando a medida não é interpretável.' },
    { alvo: 'Retorno desvanecido (2 de cada 3)', veredito: 'removido',
      porque: 'A meta-análise de 2022 sobre frequência reduzida de retorno não sustenta a hipótese da orientação. Mecanismo que confunde a leitura sem evidência a favor é custo sem benefício.' },
    { alvo: '19 exercícios', veredito: 'reduzido a 8',
      porque: 'Vários eram a mesma tarefa com um parâmetro trocado, cada um com sua própria curva de dificuldade. Isso espalhava a amostra e impedia qualquer medida de sair do provisório. O que era exercício virou nível de dificuldade.' },
    { alvo: '8 cenários de luta escritos à mão', veredito: 'substituído',
      porque: 'Em duas sessões viram gabarito decorado, e o exercício passa a medir memória de cenário em vez de leitura. Agora as situações são geradas por regra e a explicação sai da mesma conta que define a resposta.' },
    { alvo: 'Níveis 1-7 com portas de pontuação', veredito: 'substituído',
      porque: 'As portas eram números inventados. Agora a fase é decidida pelas medidas, e a dificuldade é contínua com alvo de taxa de acerto.' },
    { alvo: '10 tipos de gráfico', veredito: 'reduzido a 5',
      porque: 'Gráfico que não muda nenhuma decisão é decoração. Ficaram os que respondem: o que ficou, o que sustento, onde erro, o que o layout impõe e o que ainda não sei.' },
    { alvo: 'Modelo de esquecimento em 8 eixos', veredito: 'simplificado',
      porque: 'Meias-vidas de meta-análise aplicadas a eixos inventados. O sistema agora mede retenção em vez de estimá-la, e o modelo só preenche o vazio entre sessões.' },
  ];

  /* ============================================================
     PRINCÍPIOS
     ============================================================ */
  const PRINCIPIOS = [
    {
      id: 'confiabilidade',
      titulo: 'Doze tentativas não são uma medida',
      forca: 'forte', novo: true,
      achado: `Tarefas cognitivas robustas no nível do grupo produzem medidas individuais
        notoriamente instáveis — o chamado paradoxo da confiabilidade: o que faz uma tarefa
        boa para achar efeitos médios (pouca variação entre pessoas) é exatamente o que a
        torna ruim para medir uma pessoa. Trabalhos de calibração conseguem estimativas
        individuais confiáveis na ordem de ~100 tentativas por tarefa. Escores de DIFERENÇA
        (retenção menos treino, com carga menos sem carga) são piores ainda: somam o ruído
        das duas medidas.`,
      aplico: `É a correção central da V2. Nada aqui devolve um número solto: tudo vem com
        intervalo de confiança e com um rótulo de quanto dá para afirmar
        (insuficiente / provisório / razoável / firme). O treinador é proibido de decidir com
        base em medida "insuficiente" — nesse caso ele diz que está coletando. A Prova existe
        para a amostra ACUMULAR em condição fixa, que é o único jeito de sair do provisório.`,
      fontes: [
        { t: 'The reliability paradox: why robust cognitive tasks do not produce reliable individual differences (Behav Res Methods, 2017)', u: 'https://link.springer.com/article/10.3758/s13428-017-0935-1' },
        { t: 'Calibration of cognitive tests to address the reliability paradox (2023)', u: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10115879/' },
        { t: 'Reliability of the serial reaction time task: meta-analysis (R Soc Open Sci, 2023)', u: 'https://royalsocietypublishing.org/doi/10.1098/rsos.221542' },
      ],
    },
    {
      id: 'desafio',
      titulo: 'Existe um ponto de dificuldade que aprende mais rápido',
      forca: 'moderada', novo: true,
      achado: `O ponto ótimo de desafio diz que a dificuldade funcional — a que resulta da
        tarefa MAIS o nível de quem executa — precisa ser moderada: fácil demais não traz
        informação nova, difícil demais não dá para processar. Um resultado formal para
        aprendizes que aprendem por gradiente coloca esse ponto perto de 85% de acerto.
        Ressalva importante: esse resultado foi derivado para decisão binária, não para
        habilidade motora. Aqui ele é usado como âncora, não como lei.`,
      aplico: `A dificuldade deixou de andar em degraus por faixa de pontuação e virou contínua,
        com alvo de taxa de acerto. O controlador empurra a dificuldade na direção do alvo com
        passo que diminui conforme a amostra cresce, e trava o passo quando o intervalo de
        confiança do acerto já contém o alvo — é isso que acaba com o ciclo
        fácil → difícil demais → frustrante.`,
      fontes: [
        { t: 'The Eighty Five Percent Rule for optimal learning (Nat Commun, 2019)', u: 'https://www.nature.com/articles/s41467-019-12552-4' },
        { t: 'Challenge Point: a framework for conceptualizing practice conditions (Guadagnoli & Lee, 2004)', u: 'https://www.semanticscholar.org/paper/631619aaef8eaab3ee54d881e1302a820d05e45e' },
        { t: 'Applications of the Challenge Point Framework: scoping review (J Mot Behav, 2025)', u: 'https://www.tandfonline.com/doi/full/10.1080/00222895.2025.2508283' },
      ],
    },
    {
      id: 'erro',
      titulo: 'Erro demais no começo atrapalha mais do que ensina',
      forca: 'mista', novo: true,
      achado: `A visão tradicional é que errar ajuda: gera exploração e correção. Mas reduzir
        erro na fase inicial produz habilidade mais estável sob fadiga e melhor retida, e há
        argumento de que erro frequente impõe carga cognitiva que atrapalha a automatização.
        O desenho que sai melhor nos trabalhos recentes é o intermediário: começar com pouca
        oportunidade de erro e AUMENTÁ-LA progressivamente.`,
      aplico: `O alvo de acerto não é fixo em 85%. Na fase de Reconexão ele é 92% — de propósito
        fácil — e desce conforme a execução estabiliza, chegando a 80% na fase de Integração,
        onde a incerteza é o conteúdo do exercício. Ou seja: a quantidade de erro é uma variável
        controlada, não um efeito colateral.`,
      fontes: [
        { t: 'Errorless motor learning: systematic review and meta-analysis (2025)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13053278/' },
        { t: 'Gradually increasing error opportunities and retention of a stepping sequence (Hum Mov Sci)', u: 'https://www.sciencedirect.com/science/article/abs/pii/S0167945717303871' },
      ],
    },
    {
      id: 'retencao',
      titulo: 'Desempenho durante o treino não é aprendizado',
      forca: 'forte',
      achado: `O achado mais antigo e mais robusto da área. O que acontece DURANTE a prática é
        desempenho, inflado por dica na tela, retorno constante e repetição em bloco.
        Aprendizado só aparece num teste de retenção: depois, sem ajuda.`,
      aplico: `O teste de retenção é a medida de topo do sistema e roda em condição idêntica à
        Prova, com pelo menos 20 horas de intervalo. São 15 tentativas por teste, e a amostra
        acumula entre testes — uma leitura isolada nunca é apresentada como conclusão.`,
      fontes: [
        { t: 'Factors that influence skill decay and retention (Arthur et al., Human Performance)', u: 'https://gwern.net/doc/psychology/spaced-repetition/1998-arthur.pdf' },
      ],
    },
    {
      id: 'ssrt',
      titulo: 'O número de freio da V1 não era o que dizia ser',
      forca: 'forte', novo: true, rebaixa: true,
      achado: `O SSRT depende de um modelo de corrida entre dois processos que assume
        independência de contexto. Trabalhos recentes documentam violações severas dessa
        premissa em tarefas de inibição, e quando ela é violada o SSRT deixa de ser
        interpretável. Além disso, taxa alta de sinais de parada induz lentidão proativa —
        ficar mais devagar de propósito — o que infla artificialmente o desempenho de parada.`,
      aplico: `O exercício de freio continua, porque a habilidade é real e importa. O que mudou
        foi a afirmação: em vez de um SSRT em milissegundos, o sistema devolve uma medida
        descritiva e verificável — com quanta antecedência o perigo precisa aparecer para você
        parar metade das vezes. E vigia a lentidão proativa comparando o seu ritmo no começo e
        no fim do set: se você foi ficando mais lento, a medida é marcada como não
        interpretável em vez de virar número.`,
      fontes: [
        { t: 'Severe violations of independence in response inhibition tasks (Sci Adv, 2021)', u: 'https://www.science.org/doi/10.1126/sciadv.abf4355' },
        { t: 'A consensus guide to capturing the ability to inhibit actions (eLife)', u: 'https://elifesciences.org/articles/46323' },
        { t: 'Staircase stopping accuracy and SSRT (Behav Res Methods, 2022)', u: 'https://link.springer.com/article/10.3758/s13428-022-02058-1' },
      ],
    },
    {
      id: 'oclusao',
      titulo: 'Antecipação se treina cortando a informação',
      forca: 'forte',
      achado: `Oclusão temporal — mostrar a cena e cortar antes do desfecho, obrigando a decidir
        com informação parcial — tem efeito grande sobre antecipação, e o ganho aparece também
        em testes de campo, não só na tela. É a técnica de treino perceptivo com melhor
        sustentação.`,
      aplico: `Virou o exercício de Leitura e a terceira medida do painel. Uma das janelas é
        sempre 300 ms, fixa: sem um ponto de referência constante não dá para comparar com a
        semana passada. As outras janelas variam para desenhar a curva de quanta informação
        você ainda precisa. Na v19 ganhou a versão fiel ao método: a Leitura do Inimigo, em que
        o que se lê é MOVIMENTO (o giro, a arma recuando, o agachar, as costas virando, a finta),
        a tela corta antes do golpe e a jogada é reprisada inteira depois — o retorno de desfecho
        dos estudos. A dica de onde olhar aponta a região do corpo, não a regra (descoberta
        guiada), e some da dificuldade 4 em diante.`,
      fontes: [
        { t: 'Accelerating visual anticipation through temporal occlusion: meta-analysis (Sports Med, 2024)', u: 'https://link.springer.com/article/10.1007/s40279-024-02073-6' },
        { t: 'Perceptual-cognitive training in team sports: meta-analysis (2024)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11505547/' },
        { t: 'Instructional approaches in developing anticipation skill (Smeeton et al., 2005)', u: 'https://scholar.google.com/scholar?q=The%20relative%20effectiveness%20of%20various%20instructional%20approaches%20in%20developing%20anticipation%20skill' },
      ],
    },
    {
      id: 'transferencia',
      titulo: 'Nenhum sistema como este consegue provar que transfere',
      forca: 'forte', novo: true,
      achado: `A transferência depende da sobreposição de elementos entre treino e alvo: quanto
        mais parecidos, mais transfere. Perto transfere; longe quase não. E o ponto duro: a
        revisão de escopo sobre esports e cognição não sustenta ganho amplo vindo de jogar, e
        um ensaio controlado de 8 semanas melhorou coordenação sem demonstrar transferência
        para desempenho em jogo. A transferência de treino auxiliar para partida continua sendo
        uma lacuna aberta na literatura.`,
      aplico: `Duas consequências. Primeira: tudo acontece sobre a réplica do SEU HUD, com as
        SUAS rotas e decisões deste jogo — especificidade é o único mecanismo em que dá para
        confiar. Segunda, e mais importante: o sistema NÃO afirma que você melhorou em partida.
        Existe um registro de partidas onde você anota o que aconteceu de verdade, e o próprio
        sistema compara — com intervalo de confiança e com o aviso de que é observação sua, não
        experimento controlado. É o mais honesto que dá para fazer aqui.`,
      fontes: [
        { t: 'The relationship between esports and cognitive function: scoping review (PLOS One)', u: 'https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0352875' },
        { t: '8-week exercise intervention for e-athletes: RCT (Front Sports Act Living, 2024)', u: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11790659/' },
        { t: 'Learning better by repetition or variation? Transfer vs task-specific training', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5363924/' },
      ],
    },
    {
      id: 'fadiga',
      titulo: 'Cansaço aparece na irregularidade antes de aparecer no erro',
      forca: 'moderada', novo: true,
      achado: `A variabilidade intraindividual do tempo de resposta cresce de forma linear com o
        tempo de tarefa e tem efeito maior do que a média do tempo ou a taxa de acerto — ou
        seja, é marcador mais sensível de fadiga cognitiva do que o que normalmente se olha.`,
      aplico: `O detector de fadiga compara o coeficiente de variação do seu tempo no primeiro e
        no último terço da sessão. Se a irregularidade sobe 25% e o acerto cai junto, o
        treinador recomenda encerrar — e essa recomendação vem antes de qualquer exercício na
        lista de regras. Não é diagnóstico de nada: é estimativa de qualidade de treino.`,
      fontes: [
        { t: 'Change in intraindividual variability as a metric for cognitive fatigability (Brain Cogn)', u: 'https://www.sciencedirect.com/science/article/abs/pii/S0278262614000062' },
        { t: 'Sustained attention increases temporal variability in cortical responses (Cortex, 2019)', u: 'https://pubmed.ncbi.nlm.nih.gov/30925309/' },
      ],
    },
    {
      id: 'espacamento',
      titulo: 'Três sessões em três dias valem mais que três hoje',
      forca: 'forte',
      achado: `Com o mesmo tempo total de prática, distribuir as sessões ao longo de dias produz
        retenção muito superior a concentrar num dia. O intervalo permite consolidação
        dependente do sono.`,
      aplico: `A partir da terceira sessão no mesmo dia, "pare" passa na frente de qualquer
        exercício na lista de regras do treinador.`,
      fontes: [
        { t: 'Spacing practice sessions across days benefits motor learning (Hum Mov Sci)', u: 'https://www.sciencedirect.com/science/article/abs/pii/S016794570000021X' },
        { t: 'Time of day and sleep effects on motor consolidation (npj Sci Learn, 2023)', u: 'https://www.nature.com/articles/s41539-023-00176-9' },
      ],
    },
    {
      id: 'micropausa',
      titulo: 'Pausas de segundos: não construí nada em cima disso',
      forca: 'mista', novo: true, naoUsado: true,
      achado: `Há uma linha de trabalhos dizendo que o ganho que aparece nas pausas de segundos
        entre tentativas é consolidação rápida. Mas trabalhos de 2025 concluem o contrário: o
        ganho não reflete aprendizado fora da tarefa, e sim benefício transitório ligado a
        pré-planejamento motor. O debate está aberto nas duas direções.`,
      aplico: `Nada. Existe uma pausa curta entre tentativas porque ela é necessária para a
        tarefa funcionar, e o sistema não afirma que ela consolida coisa alguma. Está listado
        aqui justamente por ser uma tentação que foi recusada.`,
      fontes: [
        { t: 'Micro-offline gains do not reflect offline learning (PNAS, 2025)', u: 'https://www.pnas.org/doi/10.1073/pnas.2509233122' },
        { t: 'Micro-offline gains and task engagement during rest (Sci Rep, 2025)', u: 'https://www.nature.com/articles/s41598-025-21351-5' },
      ],
    },
    {
      id: 'foco',
      titulo: 'Pensar no dedo atrapalha o dedo',
      forca: 'moderada',
      achado: `Foco interno (na própria mão) piora desempenho e reduz automatização frente a foco
        externo (no efeito que se quer produzir). Meta-análises recentes confirmam a vantagem,
        com heterogeneidade alta.`,
      aplico: `Todas as instruções apontam o alvo, não a mão: "acerte o miolo do botão",
        "mantenha o traço na seta". Parece redação; é intervenção.`,
      fontes: [
        { t: 'External focus enhances movement automatization (Hum Mov Sci)', u: 'https://pubmed.ncbi.nlm.nih.gov/24054892/' },
        { t: 'Attentional focus distance: meta-analysis (PeerJ, 2025)', u: 'https://peerj.com/articles/20012/' },
      ],
    },
    {
      id: 'ci',
      titulo: 'Prática aleatória: mantida, mas sem alarde',
      forca: 'mista',
      achado: `Embaralhar as rotas piora o desempenho do dia e melhora a retenção. A meta-análise
        de 2024 encontra efeito médio; uma revisão de 2023 em esporte aplicado encontra efeito
        quase nulo fora do laboratório.`,
      aplico: `Continua — é barato e não faz mal — mas deixou de ser tratado como pilar. O
        esquema escalona de bloco para aleatório conforme a dificuldade sobe, e isso agora é um
        parâmetro do exercício e não um sistema à parte. A Sessão da Jing aplica o mesmo entre
        exercícios: um de cada, intercalados, em vez de repetir o mesmo — e diz na tela que rende
        menos na hora.`,
      fontes: [
        { t: 'High contextual interference improves retention (Sci Rep, 2024)', u: 'https://www.nature.com/articles/s41598-024-65753-3' },
        { t: 'The myth of contextual interference benefit in sports practice (2023)', u: 'https://www.sciencedirect.com/science/article/abs/pii/S1747938X23000301' },
      ],
    },
    {
      id: 'feedback',
      titulo: 'Retorno desvanecido: removido',
      forca: 'contra', novo: true, removido: true,
      achado: `A hipótese da orientação diz que retorno em toda tentativa vira muleta. A
        meta-análise de 2022 sobre frequência reduzida de retorno NÃO sustenta essa hipótese.`,
      aplico: `O mecanismo saiu. No lugar dele ficou uma separação mais simples e mais
        defensável: TREINO tem retorno em toda tentativa, PROVA não tem nenhum. A diferença
        entre ensinar e medir passou a ser o modo, não a frequência.`,
      fontes: [
        { t: 'Meta-analysis of reduced relative feedback frequency (Psych Sport Exerc, 2022)', u: 'https://www.sciencedirect.com/science/article/abs/pii/S1469029222000334' },
      ],
    },
    {
      id: 'fitts',
      titulo: 'Parte do seu tempo é geometria, não habilidade',
      forca: 'forte',
      achado: `A lei de Fitts prevê o tempo de um movimento apontado a partir da distância e do
        tamanho do alvo, e se ajusta bem a toques de dedo em tela de celular.`,
      aplico: `O sistema ajusta a sua reta com os seus tempos e separa trajeto limitado pelo
        layout de trajeto com treino sobrando. Só é apresentada com 5 trajetos, 25 toques e
        inclinação positiva — abaixo disso ela diz que está coletando.`,
      fontes: [
        { t: 'FFitts law: modeling finger touch with Fitts law (CHI 2013)', u: 'https://dl.acm.org/doi/10.1145/2470654.2466180' },
        { t: 'Finger-based pointing on mobile touchscreens (2015)', u: 'https://link.springer.com/chapter/10.1007/978-3-319-20678-3_31' },
      ],
    },
    {
      id: 'musica',
      titulo: 'Música ajuda no repetitivo e atrapalha na leitura',
      forca: 'moderada',
      achado: `Música de fundo reduz divagação mental e encurta o tempo de reação, com humor e
        excitação mediando o efeito, mas aumenta estados de distração externa.`,
      aplico: `Trilha generativa, clima escolhido pelo exercício, volume abaixando sozinho quando
        um sinal importante toca. Em Prova ela fica mínima: medir com trilha cheia acrescenta
        variação que não tem nada a ver com você.`,
      fontes: [
        { t: 'Mood and arousal in background music effects on attention (Sci Rep, 2024)', u: 'https://www.nature.com/articles/s41598-024-60218-z' },
      ],
    },
    {
      id: 'autonomia',
      titulo: 'Deixar você escolher o exercício não ajuda',
      forca: 'contra',
      achado: `Prática autocontrolada e expectativas ampliadas foram reanalisadas com métodos
        bayesianos robustos: viés de publicação inflou os efeitos, o poder médio dos estudos
        originais era de 6%, e o efeito conjunto é pequeno e não significativo.`,
      aplico: `O sistema escolhe. Você pode abrir qualquer exercício manualmente, mas a
        recomendação nunca é sua — e agora ela vem com a regra que disparou e o número que a
        fez disparar, para você poder discordar com argumento.`,
      fontes: [
        { t: 'Reporting bias exaggerated self-controlled practice benefits (Int Rev Sport Exerc Psychol, 2023)', u: 'https://www.tandfonline.com/doi/full/10.1080/1750984X.2023.2207255' },
      ],
    },
    {
      id: 'recuperacao',
      titulo: 'Tentar lembrar ensina mais do que reler',
      forca: 'forte', novo: true,
      achado: `A revisão que avaliou dez técnicas de estudo contra centenas de estudos só deu "alta
        utilidade" a duas: praticar RECUPERANDO (tentar lembrar a resposta) e ESPAÇAR as revisões.
        Tentar lembrar retém mais do que estudar de novo pelo mesmo tempo, e o efeito cresce quando a
        resposta certa vem logo depois. Espaçar com intervalos crescentes retém muito mais do que
        concentrar. Juntas, errar → reaprender na hora → rever em dias espaçados (reaprendizagem
        sucessiva) é o desenho com melhor retenção por minuto gasto. Ressalva honesta: o efeito é
        sobre memória. Que saber o kit do inimigo melhore a decisão na partida é plausível, não testado.`,
      aplico: `Virou as cartas "Conheça o inimigo": perguntas geradas só do que o banco tem com
        confiança alta ou média (kits de 25 heróis, 58 itens, cinco fatos da Jing). Cada carta mora
        numa caixa: acertou sobe (1, 3, 7, 14, 30, 60 dias), errou volta para a caixa 1 e reaparece na
        mesma sessão até sair certa. A carta NÃO aparece antes de vencer — revisar cedo rende menos. A
        medida é a retenção de verdade: acerto em cartas que ficaram 3 dias ou mais sem ser vistas.`,
      fontes: [
        { t: 'Improving students’ learning with effective learning techniques (Dunlosky et al., Psychol Sci Public Interest, 2013)', u: 'https://doi.org/10.1177/1529100612453266' },
        { t: 'Test-enhanced learning: taking memory tests improves long-term retention (Roediger & Karpicke, Psychol Sci, 2006)', u: 'https://doi.org/10.1111/j.1467-9280.2006.01693.x' },
        { t: 'Distributed practice in verbal recall tasks: review and quantitative synthesis (Cepeda et al., Psychol Bull, 2006)', u: 'https://doi.org/10.1037/0033-2909.132.3.354' },
        { t: 'Optimizing schedules of retrieval practice: how much is enough? (Rawson & Dunlosky, 2011)', u: 'https://scholar.google.com/scholar?q=Optimizing%20schedules%20of%20retrieval%20practice%20for%20durable%20and%20efficient%20learning%3A%20How%20much%20is%20enough' },
        { t: 'Feedback enhances the positive effects of multiple-choice testing (Butler & Roediger, 2008)', u: 'https://scholar.google.com/scholar?q=Feedback%20enhances%20the%20positive%20effects%20and%20reduces%20the%20negative%20effects%20of%20multiple-choice%20testing' },
      ],
    },
    {
      id: 'pressao',
      titulo: 'Quem só treina sem nada em jogo, só joga bem sem nada em jogo',
      forca: 'moderada', novo: true,
      achado: `Treinar com pressão induzida — consequência de verdade, avaliação, tempo — melhorou o
        desempenho sob pressão real em relação a treinar sem ela, na meta-análise de treino sob pressão
        em esporte, polícia e medicina. O trabalho clássico com atletas de elite mostrou o mesmo com
        ansiedade leve: quem treinou ansioso não caiu quando a pressão veio. Ressalvas: os estudos são
        pequenos, a pressão precisa ser sentida (não basta chamar de "decisivo") e a medida é o
        desempenho sob pressão, não o aprendizado da habilidade.`,
      aplico: `Virou a Série decisiva: três falhas encerram (consequência), o recorde fica registrado
        e aparece antes de começar (avaliação), a trilha muda para a tensa e a cada falha o coração
        bate. A dificuldade fica parada e o resultado não mexe nela. O número principal é o CUSTO da
        pressão: o acerto na série contra o acerto no treino normal do mesmo exercício — com a correção
        para a série que para na 3ª falha, que senão subestima o acerto.`,
      fontes: [
        { t: 'Pressure training for performance domains: a meta-analysis (Low et al., Sport Exerc Perform Psychol, 2021)', u: 'https://scholar.google.com/scholar?q=Pressure%20training%20for%20performance%20domains%3A%20A%20meta-analysis' },
        { t: 'Training with anxiety has a positive effect on expert perceptual-motor performance under pressure (Oudejans & Pijpers, 2009)', u: 'https://scholar.google.com/scholar?q=Training%20with%20anxiety%20has%20a%20positive%20effect%20on%20expert%20perceptual-motor%20performance%20under%20pressure' },
      ],
    },
    {
      id: 'imagetica',
      titulo: 'Imaginar o movimento treina — menos que fazer, mais que parar',
      forca: 'moderada', novo: true,
      achado: `A meta-análise clássica de prática mental encontrou efeito positivo e moderado sobre o
        desempenho — menor que o da prática física, e que decai com o tempo sem prática real. As
        revisões de imagética no esporte confirmam efeito moderado, maior quando combinada com prática
        física e quando a imagem é na primeira pessoa e no ritmo real. Observar a ação enquanto se
        imagina (ver e imaginar juntos) ativa o sistema motor mais do que cada um sozinho.`,
      aplico: `Virou a Prática mental de cerca de 35 segundos: a SUA rota, no SEU ritmo (o da escada da Rota).
        Três repetições vendo os botões acenderem (observar + imaginar), quatro só com o som, três só
        na cabeça. É oferecida como descanso ativo depois de exercícios de sequência e entra na Sessão da
        Jing entre a Rota e o resto. Não substitui treino: ocupa o descanso.`,
      fontes: [
        { t: 'Does mental practice enhance performance? (Driskell, Copper & Moran, J Appl Psychol, 1994)', u: 'https://scholar.google.com/scholar?q=Does%20mental%20practice%20enhance%20performance%20Driskell%20Copper%20Moran' },
        { t: 'The effects of imagery interventions in sports: a meta-analysis (Simonsmeier et al., 2021)', u: 'https://scholar.google.com/scholar?q=The%20effects%20of%20imagery%20interventions%20in%20sports%3A%20a%20meta-analysis' },
        { t: 'Combined action observation and motor imagery: meta-analyses', u: 'https://scholar.google.com/scholar?q=combined%20action%20observation%20and%20motor%20imagery%20meta-analysis' },
      ],
    },
    {
      id: 'aquecimento',
      titulo: 'As primeiras tentativas depois de uma pausa saem piores',
      forca: 'moderada', novo: true,
      achado: `O decremento de aquecimento é um dos achados mais antigos da aprendizagem motora: depois
        de um intervalo, o desempenho das primeiras tentativas fica abaixo do nível já aprendido, e
        volta com poucas repetições da própria tarefa. A explicação mais aceita é perder o "ajuste" da
        tarefa (o set), não esquecer a habilidade. Ressalva: os estudos são de laboratório e esporte;
        nenhum mediu isso em jogo de celular.`,
      aplico: `Virou o Aquecimento pré-partida: quatro blocos curtos (Rota, Espelho, Leitura, Punir), um
        pouco abaixo do seu nível, uns três minutos. Não entra nas medidas nem mexe na dificuldade — não
        é treino, é tirar de cima da partida a perda das primeiras tentativas. Termina pedindo o plano
        "se… então…" para a partida.`,
      fontes: [
        { t: 'The second facet of forgetting: a review of warm-up decrement (Adams, Psychol Bull, 1961)', u: 'https://scholar.google.com/scholar?q=The%20second%20facet%20of%20forgetting%3A%20a%20review%20of%20warm-up%20decrement' },
        { t: 'Why professional athletes need a prolonged period of warm-up (Ajemian et al., 2010)', u: 'https://scholar.google.com/scholar?q=Why%20professional%20athletes%20need%20a%20prolonged%20period%20of%20warm-up%20and%20other%20peculiarities%20of%20human%20motor%20learning' },
      ],
    },
    {
      id: 'intencao',
      titulo: '"Se isto acontecer, faço aquilo" leva a intenção até a partida',
      forca: 'moderada', novo: true,
      achado: `Intenção de implementação é um plano com gatilho concreto: "se [situação], então
        [ação]". A meta-análise de 94 estudos encontrou efeito médio a grande sobre cumprir o que se
        pretendia, porque a situação passa a disparar a ação sem precisar lembrar dela na hora. No
        esporte o efeito existe e é menor. É a coisa mais próxima de uma ponte entre treino e partida
        que a literatura oferece — e a transferência é justamente o que nenhum treino fora do jogo
        consegue garantir.`,
      aplico: `Virou o Plano para a partida: o app sugere planos a partir dos SEUS erros medidos (reset
        perdido, Punir cedo, finta…), você escolhe um só, e o registro de partida pergunta se você
        cumpriu. A taxa de cumprimento aparece em Progresso — e ela diz mais sobre o treino chegar na
        partida do que vitória, que depende de outras nove pessoas.`,
      fontes: [
        { t: 'Implementation intentions and goal achievement: a meta-analysis (Gollwitzer & Sheeran, 2006)', u: 'https://scholar.google.com/scholar?q=Implementation%20intentions%20and%20goal%20achievement%3A%20A%20meta-analysis%20of%20effects%20and%20processes' },
      ],
    },
  ];

  /* ============================================================
     MODELOS COMPUTÁVEIS
     ============================================================ */
  const indiceDificuldade = (D, W) => Math.log2((2 * Math.max(0.1, D)) / Math.max(0.5, W));

  function ajusteFitts(pontos) {
    const n = pontos.length;
    if (n < 3) return null;
    const mx = U.mean(pontos.map(p => p.id)), my = U.mean(pontos.map(p => p.mt));
    let sxy = 0, sxx = 0, syy = 0;
    for (const p of pontos) {
      sxy += (p.id - mx) * (p.mt - my); sxx += (p.id - mx) ** 2; syy += (p.mt - my) ** 2;
    }
    if (!sxx) return null;
    const b = sxy / sxx, a = my - b * mx;
    const r2 = syy === 0 ? 1 : U.clamp((sxy * sxy) / (sxx * syy), 0, 1);
    const res = pontos.map(p => ({ ...p, prev: a + b * p.id, resid: p.mt - (a + b * p.id) }));
    const dp = U.sd(res.map(r => r.resid)) || 1;
    for (const r of res) r.z = r.resid / dp;
    return { a, b, r2, n, pontos: res, dp };
  }

  /* Esquecimento: meias-vidas em dias, do ganho acima da linha de base.
     Só duas, porque só duas têm origem defensável. */
  const MEIA_VIDA = { precisao: 195, velocidade: 395 };
  const BASE_ESQ = 32;
  function decair(valor, dias, tipo = 'precisao') {
    const hl = MEIA_VIDA[tipo] || 300;
    if (valor <= BASE_ESQ || dias <= 0) return valor;
    return BASE_ESQ + (valor - BASE_ESQ) * Math.pow(0.5, dias / hl);
  }

  class Escada {
    constructor(inicio = 0, passo = 50, min = -700, max = 900) {
      this.ssd = inicio; this.passo = passo; this.min = min; this.max = max; this.historico = [];
    }
    registrar(parou) {
      this.historico.push({ ssd: this.ssd, parou });
      this.ssd = U.clamp(this.ssd + (parou ? this.passo : -this.passo), this.min, this.max);
      return this.ssd;
    }
    ssd50() {
      const h = this.historico.map(x => x.ssd);
      if (h.length < 4) return this.ssd;
      return U.mean(h.slice(Math.floor(h.length * 0.25)));
    }
    taxaParada() {
      if (!this.historico.length) return 0;
      return this.historico.filter(x => x.parou).length / this.historico.length;
    }
  }

  const ESQUEMAS = {
    bloco:     { nome: 'Bloco',     desc: 'a mesma rota repetida — para reencontrar o padrão' },
    serial:    { nome: 'Série',     desc: 'rotação fixa entre rotas' },
    aleatorio: { nome: 'Aleatório', desc: 'rota sorteada — pior hoje, melhor amanhã' },
  };

  function ordenarRotas(rotas, tentativas, esquema) {
    if (!rotas.length) return [];
    const out = [];
    if (esquema === 'bloco') {
      const porBloco = Math.max(2, Math.ceil(tentativas / rotas.length));
      for (let i = 0; i < tentativas; i++) out.push(rotas[Math.min(rotas.length - 1, Math.floor(i / porBloco))]);
    } else if (esquema === 'serial') {
      for (let i = 0; i < tentativas; i++) out.push(rotas[i % rotas.length]);
    } else {
      let saco = [], ant = null;
      for (let i = 0; i < tentativas; i++) {
        if (!saco.length) saco = U.shuffle(rotas.slice());
        let k = 0;
        while (rotas.length > 1 && saco[saco.length - 1] === ant && k < saco.length - 1) {
          saco.unshift(saco.pop()); k++;
        }
        const c = saco.pop(); out.push(c); ant = c;
      }
    }
    return out;
  }

  function sessoesHoje() {
    const hoje = new Date().setHours(0, 0, 0, 0);
    return U.DB.load().sessoes.filter(s => new Date(s.t).setHours(0, 0, 0, 0) === hoje).length;
  }

  U.CI = { FORCA, AUDITORIA, PRINCIPIOS, indiceDificuldade, ajusteFitts,
           MEIA_VIDA, decair, Escada, ESQUEMAS, ordenarRotas, sessoesHoje };

})(window.U);
