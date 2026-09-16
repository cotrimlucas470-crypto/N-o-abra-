/* ============================================================
   ciencia.js — a base do método
   Cada princípio abaixo mudou alguma coisa concreta no sistema.
   Onde a evidência é fraca ou contraditória, está escrito que é.
   ============================================================ */
'use strict';
(function (U) {

  const FORCA = {
    forte:    { nome: 'Evidência forte',    cor: 'good' },
    moderada: { nome: 'Evidência moderada', cor: 'warning' },
    mista:    { nome: 'Evidência mista',    cor: 'serious' },
    contra:   { nome: 'Evidência CONTRA',   cor: 'critical' },
  };

  const PRINCIPIOS = [
    {
      id: 'ci',
      titulo: 'Prática aleatória bate prática em bloco — mas só na retenção',
      forca: 'moderada',
      achado: `Repetir a mesma rota 12 vezes seguidas (prática em bloco) produz MELHOR desempenho
        durante o treino e PIOR retenção depois. Embaralhar as rotas (prática aleatória) faz você
        parecer pior hoje e ficar melhor amanhã. A meta-análise de 2024 encontra efeito médio na
        retenção e médio na transferência; uma revisão de 2023 em esporte aplicado encontra efeito
        quase nulo fora do laboratório. Ou seja: real, mas menor do que costumam vender.`,
      aplico: `O sistema escalona: nível 1-2 treina em BLOCO (você precisa reencontrar o padrão),
        nível 3 em SÉRIE (rotação fixa), nível 4+ em ALEATÓRIO. O rótulo do esquema aparece na
        faixa do exercício. Como a prática aleatória piora a nota do dia, a pontuação por si só
        deixaria você achar que regrediu — por isso existe o teste de retenção.`,
      fontes: [
        { t: 'High contextual interference improves retention in motor learning (Sci Rep, 2024)', u: 'https://www.nature.com/articles/s41598-024-65753-3' },
        { t: 'The myth of contextual interference benefit in sports practice (Psych Sport Exerc, 2023)', u: 'https://www.sciencedirect.com/science/article/abs/pii/S1747938X23000301' },
        { t: 'Contextual interference and transfer: systematic review (2024)', u: 'https://pubmed.ncbi.nlm.nih.gov/39205981/' },
      ],
    },
    {
      id: 'retencao',
      titulo: 'Desempenho durante o treino não é aprendizado',
      forca: 'forte',
      achado: `É o achado mais antigo e mais robusto da área: o que você faz DURANTE a prática é
        desempenho, e pode ser inflado por dicas, feedback constante e repetição em bloco.
        Aprendizado só aparece num teste de retenção — depois, sem ajuda.`,
      aplico: `Toda sessão começa com um TESTE DE RETENÇÃO: 5 tentativas do exercício mais difícil
        da sessão anterior, na mesma dificuldade, sem feedback por tentativa e sem destaque nos
        botões. Essa nota vai para um gráfico separado. É ela, e não a nota do dia, que diz se você
        está realmente melhorando.`,
      fontes: [
        { t: 'Factors that influence skill decay and retention (Arthur et al., Human Performance)', u: 'https://gwern.net/doc/psychology/spaced-repetition/1998-arthur.pdf' },
      ],
    },
    {
      id: 'decaimento',
      titulo: 'Um mês parado tira muito menos do que você imagina',
      forca: 'forte',
      achado: `A meta-análise de retenção e decaimento de habilidades procedimentais estima que
        metade do ganho de treinamento se perde em cerca de 6,5 meses para PRECISÃO e 13 meses para
        VELOCIDADE. Em 30 dias parado, isso dá cerca de 10% do ganho em precisão e 5% em velocidade.
        O que decai rápido não é a habilidade: é o automatismo — a rota volta a custar atenção.`,
      aplico: `O modelo de esquecimento do sistema usa meia-vida exponencial sobre o GANHO acima da
        linha de base, com as meias-vidas acima, e não uma queda linear inventada. E, mais
        importante: o diagnóstico MEDE em vez de assumir. O modelo só preenche o vazio entre
        sessões.`,
      fontes: [
        { t: 'Procedural Skill Retention and Decay: A Meta-Analytic Review (Psychological Bulletin)', u: 'https://psycnet.apa.org/manuscript/2026-23054-001.pdf' },
      ],
    },
    {
      id: 'espacamento',
      titulo: 'Três sessões em três dias valem mais que três sessões hoje',
      forca: 'forte',
      achado: `Com o MESMO tempo total de prática, distribuir as sessões ao longo de dias produz
        retenção muito superior a concentrar tudo num dia. O intervalo permite a consolidação
        dependente do sono. Treinar perto do horário de dormir consolida melhor do que treinar de
        manhã longe do sono.`,
      aplico: `O sistema conta suas sessões por dia. A partir da terceira no mesmo dia ele avisa que
        você está gastando tempo sem comprar aprendizado, e passa a recomendar parar. O painel
        mostra quando é a próxima janela boa (24h).`,
      fontes: [
        { t: 'Spacing practice sessions across days benefits motor learning (Shea et al., Hum Mov Sci)', u: 'https://www.sciencedirect.com/science/article/abs/pii/S016794570000021X' },
        { t: 'Time of day and sleep effects on motor acquisition and consolidation (npj Sci Learn, 2023)', u: 'https://www.nature.com/articles/s41539-023-00176-9' },
      ],
    },
    {
      id: 'oclusao',
      titulo: 'Antecipação se treina cortando a informação, não acelerando o dedo',
      forca: 'forte',
      achado: `Oclusão temporal — mostrar a cena e cortar ANTES do desfecho, obrigando a decidir com
        informação parcial — tem efeito grande sobre antecipação, e o ganho transfere para testes
        de campo, não só para a tela. É a técnica mais bem sustentada de treino perceptivo-cognitivo.`,
      aplico: `O exercício ANTECIPAÇÃO mostra a ameaça por janelas cada vez mais curtas (600 ms →
        120 ms) e depois mascara a tela. Você responde com o que deu para ver. O sistema guarda a
        acurácia POR JANELA e desenha a sua curva de antecipação: onde ela desaba é a quantidade
        de informação que você ainda precisa.`,
      fontes: [
        { t: 'Accelerating Visual Anticipation in Sport Through Temporal Occlusion (Sports Med, 2024)', u: 'https://link.springer.com/article/10.1007/s40279-024-02073-6' },
        { t: 'Perceptual-cognitive training in team sports: meta-analysis (2024)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11505547/' },
      ],
    },
    {
      id: 'ssrt',
      titulo: 'Freio se mede com escada, não com contagem de acertos',
      forca: 'forte',
      achado: `A capacidade de abortar uma ação já iniciada tem uma medida padrão: o SSRT, obtido
        atrasando o sinal de PARAR até você falhar em metade das vezes. A escada sobe 50 ms quando
        você consegue parar e desce 50 ms quando não consegue. SSRT = tempo de resposta médio menos
        o atraso de equilíbrio. Valores típicos em adultos ficam em torno de 200-250 ms.`,
      aplico: `O FREIO DE MÃO virou um teste de sinal de parada de verdade, com escada adaptativa.
        Ele devolve o seu SSRT em milissegundos e um gráfico da escada. Contar "quantas vezes
        parei" não mede nada, porque basta ir devagar para acertar sempre — e o sistema também
        vigia isso (se o seu tempo de execução inflar, ele avisa).`,
      fontes: [
        { t: 'Staircase stopping accuracy and SSRT (Behavior Research Methods, 2022)', u: 'https://link.springer.com/article/10.3758/s13428-022-02058-1' },
        { t: 'Bayesian adaptive estimation in the stop-signal task (PLOS One, 2016)', u: 'https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0165525' },
      ],
    },
    {
      id: 'foco',
      titulo: 'Pensar no dedo atrapalha o dedo',
      forca: 'moderada',
      achado: `Foco interno (na própria mão) piora desempenho e reduz automatização em comparação
        com foco externo (no efeito que você quer produzir). A hipótese da ação restrita diz que
        vigiar o próprio movimento interrompe processos automáticos. Meta-análises recentes
        confirmam a vantagem do foco externo, com heterogeneidade alta.`,
      aplico: `Todas as instruções foram reescritas para apontar o ALVO, não a mão: "acerte o miolo
        do botão", "faça o traço chegar no alvo", "derrube o alvo antes que ele saia" — em vez de
        "mova o polegar assim". Parece detalhe de redação. É intervenção.`,
      fontes: [
        { t: 'External focus enhances movement automatization (Kal et al., Hum Mov Sci)', u: 'https://pubmed.ncbi.nlm.nih.gov/24054892/' },
        { t: 'Attentional focus distance: systematic review and meta-analysis (PeerJ, 2025)', u: 'https://peerj.com/articles/20012/' },
      ],
    },
    {
      id: 'feedback',
      titulo: 'Feedback em toda tentativa pode virar muleta',
      forca: 'mista',
      achado: `A hipótese da orientação diz que feedback a cada tentativa melhora o treino e piora o
        aprendizado, porque impede você de construir o próprio detector de erro. Um estudo aponta
        67% como frequência melhor que 100% ou que nada. Mas a meta-análise de 2022 sobre frequência
        reduzida NÃO sustenta a hipótese. Está em disputa.`,
      aplico: `A partir da dificuldade 5, o retorno por tentativa aparece em ~2 de cada 3 (feedback
        desvanecido). O resumo do fim do set continua completo, sempre. Como a evidência é mista,
        isso é um ajuste que você pode desligar em Config — e está marcado como disputado.`,
      fontes: [
        { t: 'Meta-analysis of reduced relative feedback frequency (Psych Sport Exerc, 2022)', u: 'https://www.sciencedirect.com/science/article/abs/pii/S1469029222000334' },
        { t: 'Reduced feedback frequencies in a postural control task (2024)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10933749/' },
      ],
    },
    {
      id: 'transferencia',
      titulo: 'Treino de reflexo genérico não transfere para o jogo',
      forca: 'forte',
      achado: `A revisão de escopo sobre esports e função cognitiva conclui que a evidência NÃO
        sustenta ganho cognitivo amplo a partir da prática de jogo, e que diferenças entre níveis de
        perícia podem refletir autosseleção. Treino de realidade virtual melhorou coordenação
        olho-mão, mas não tempo de reação. Traduzindo: aplicativo de "clicar no quadrado vermelho"
        te faz melhor em clicar em quadrados vermelhos.`,
      aplico: `É a razão de existir a réplica do seu HUD. Nenhum exercício aqui usa alvo abstrato:
        tudo acontece nos SEUS botões, nas SUAS distâncias, com as SUAS rotas e com decisões de
        Honor of Kings. A especificidade é o único mecanismo de transferência em que dá para confiar.`,
      fontes: [
        { t: 'The relationship between esports and cognitive function: scoping review (PLOS One)', u: 'https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0352875' },
        { t: 'Short-term VR training in amateur esports athletes (2024)', u: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11591994/' },
      ],
    },
    {
      id: 'fitts',
      titulo: 'Metade do seu "tempo de reação" é geometria de botão',
      forca: 'forte',
      achado: `A lei de Fitts prevê o tempo de um movimento apontado a partir da distância D e do
        tamanho W do alvo: MT = a + b · log2(2D/W). Ela se ajusta bem a toques de dedo em tela de
        celular. Quer dizer: parte do seu tempo entre dois botões é imposta pelo layout e nenhum
        treino elimina.`,
      aplico: `O sistema ajusta a SUA reta de Fitts com os seus próprios tempos de transição e mostra
        quem está em cima da reta (limite do layout — resolve mexendo no HUD) e quem está acima dela
        (limite de habilidade — resolve treinando). É o gráfico que separa "meu HUD é ruim" de
        "eu estou ruim".`,
      fontes: [
        { t: 'FFitts law: modeling finger touch with Fitts law (CHI 2013)', u: 'https://dl.acm.org/doi/10.1145/2470654.2466180' },
        { t: 'Finger-based pointing performance on mobile touchscreens (2015)', u: 'https://link.springer.com/chapter/10.1007/978-3-319-20678-3_31' },
      ],
    },
    {
      id: 'musica',
      titulo: 'Música ajuda no repetitivo e atrapalha na leitura',
      forca: 'moderada',
      achado: `Música de fundo reduz divagação mental e encurta o tempo de reação, com humor e
        excitação mediando o efeito — mas aumenta estados de distração externa. O andamento da
        música se correlaciona com velocidade em tarefas perceptomotoras.`,
      aplico: `A trilha é generativa e o clima é escolhido pelo exercício: com batida nos exercícios
        de ritmo e velocidade (e no andamento-alvo do próprio exercício), quase muda nos de decisão
        e leitura. O volume abaixa sozinho quando um sinal importante toca.`,
      fontes: [
        { t: 'Mood and arousal in background music effects on attention (Sci Rep, 2024)', u: 'https://www.nature.com/articles/s41598-024-60218-z' },
      ],
    },
    {
      id: 'autonomia',
      titulo: 'Deixar você escolher o exercício NÃO ajuda',
      forca: 'contra',
      achado: `Prática autocontrolada e expectativas ampliadas — os pilares motivacionais da teoria
        OPTIMAL — foram reanalisados em 2023 com métodos bayesianos robustos: viés de publicação
        inflou os efeitos, o poder estatístico médio dos estudos originais era de 6%, e o efeito
        conjunto real é pequeno e não significativo. Há evidência MODERADA CONTRA o suporte à
        autonomia.`,
      aplico: `Por isso o sistema escolhe por você e não tem menu de "monte seu treino". Não é
        arrogância de design: é a leitura honesta da evidência. Você pode abrir qualquer exercício
        manualmente, mas a recomendação nunca é sua.`,
      fontes: [
        { t: 'Reporting bias exaggerated self-controlled practice benefits: meta-analysis (2023)', u: 'https://www.tandfonline.com/doi/full/10.1080/1750984X.2023.2207255' },
        { t: 'OPTIMAL theory motivation claims lack evidence (Psych Sport Exerc, 2024)', u: 'https://www.sciencedirect.com/science/article/pii/S1469029224001018' },
      ],
    },
  ];

  /* ============================================================
     MODELOS COMPUTÁVEIS
     ============================================================ */

  /* ---------- Lei de Fitts ---------- */
  /** ID = log2(2D/W). D e W em milímetros. */
  function indiceDificuldade(D, W) { return Math.log2((2 * Math.max(0.1, D)) / Math.max(0.5, W)); }

  /** Regressão linear MT = a + b·ID, com R². */
  function ajusteFitts(pontos) {
    const n = pontos.length;
    if (n < 3) return null;
    const mx = U.mean(pontos.map(p => p.id)), my = U.mean(pontos.map(p => p.mt));
    let sxy = 0, sxx = 0, syy = 0;
    for (const p of pontos) {
      sxy += (p.id - mx) * (p.mt - my);
      sxx += (p.id - mx) ** 2;
      syy += (p.mt - my) ** 2;
    }
    if (sxx === 0) return null;
    const b = sxy / sxx, a = my - b * mx;
    const r2 = syy === 0 ? 1 : U.clamp((sxy * sxy) / (sxx * syy), 0, 1);
    const res = pontos.map(p => ({ ...p, prev: a + b * p.id, resid: p.mt - (a + b * p.id) }));
    const dp = U.sd(res.map(r => r.resid)) || 1;
    for (const r of res) r.z = r.resid / dp;
    return { a, b, r2, n, pontos: res, dp };
  }

  /* ---------- Esquecimento ---------- */
  /** Meias-vidas em DIAS, do ganho acima da linha de base. */
  const MEIA_VIDA = {
    precisao: 195,      // ~6,5 meses (acurácia, meta-análise)
    velocidade: 395,    // ~13 meses (velocidade, meta-análise)
    consistencia: 335,  // ~11 meses (desempenho misto)
    automatismo: 120,   // estimado: é o que some primeiro numa pausa
    reflexo: 300,
    decisao: 330,       // conhecimento tático resiste bem
    freio: 300,
    movimento: 335,
  };
  const BASE_ESQUECIMENTO = 32;   // piso: ninguém volta do zero
  function decair(valor, dias, eixo) {
    const hl = MEIA_VIDA[eixo] || 300;
    const base = BASE_ESQUECIMENTO;
    if (valor <= base || dias <= 0) return valor;
    return base + (valor - base) * Math.pow(0.5, dias / hl);
  }
  /** Quanto se perde, em pontos, ficando N dias parado a partir de um valor. */
  function previsaoPausa(valor, dias, eixo) { return valor - decair(valor, dias, eixo); }

  /* ---------- Sinal de parada (SSRT) ---------- */
  /**
   * Escada adaptativa do atraso do sinal de parada.
   * O atraso é medido a partir do momento em que o passo é PEDIDO.
   * Ele pode ser NEGATIVO: o sinal chega antes do pedido, dando mais
   * tempo para inibir. Sem essa metade negativa, quem freia mais devagar
   * que um intervalo entre toques (~250 ms) nunca consegue parar, a taxa
   * trava em 0% e o SSRT deixa de ser interpretável.
   */
  class Escada {
    constructor(inicio = 0, passo = 50, min = -700, max = 900) {
      this.ssd = inicio; this.passo = passo; this.min = min; this.max = max;
      this.historico = [];
    }
    registrar(parou) {
      this.historico.push({ ssd: this.ssd, parou });
      this.ssd = U.clamp(this.ssd + (parou ? this.passo : -this.passo), this.min, this.max);
      return this.ssd;
    }
    /** SSD de equilíbrio: média dos ensaios, descartando a subida inicial. */
    ssd50() {
      const h = this.historico.map(x => x.ssd);
      if (h.length < 4) return this.ssd;
      return U.mean(h.slice(Math.floor(h.length * 0.25)));
    }
    /** SSRT = tempo de resposta médio no "ir" menos o atraso de equilíbrio. */
    ssrt(temposIr) {
      if (!temposIr.length) return null;
      return Math.max(60, U.median(temposIr) - this.ssd50());
    }
    /** A medida só é confiável se a taxa de parada ficou perto de 50%. */
    confiavel() {
      const t = this.taxaParada();
      return this.historico.length >= 6 && t >= 0.25 && t <= 0.75;
    }
    taxaParada() {
      if (!this.historico.length) return 0;
      return this.historico.filter(x => x.parou).length / this.historico.length;
    }
  }

  /* ---------- Interferência contextual ---------- */
  const ESQUEMAS = {
    bloco:     { nome: 'Bloco',     desc: 'a mesma rota repetida — para reencontrar o padrão' },
    serial:    { nome: 'Série',     desc: 'rotação fixa entre rotas — transição previsível' },
    aleatorio: { nome: 'Aleatório', desc: 'rota sorteada a cada tentativa — pior hoje, melhor amanhã' },
  };
  function esquemaPorNivel(n) { return n <= 2 ? 'bloco' : n === 3 ? 'serial' : 'aleatorio'; }

  /** Gera a ordem das rotas de um set conforme o esquema. */
  function ordenarRotas(rotas, tentativas, esquema) {
    if (!rotas.length) return [];
    const out = [];
    if (esquema === 'bloco') {
      const porBloco = Math.max(2, Math.ceil(tentativas / rotas.length));
      for (let i = 0; i < tentativas; i++) out.push(rotas[Math.min(rotas.length - 1, Math.floor(i / porBloco))]);
    } else if (esquema === 'serial') {
      for (let i = 0; i < tentativas; i++) out.push(rotas[i % rotas.length]);
    } else {
      /* Sorteio com reposição de baralho: cada rota aparece ~o mesmo número
         de vezes (senão um set inteiro pode deixar uma rota de fora), mas a
         ordem continua imprevisível e sem repetição imediata. */
      let saco = [], ant = null;
      for (let i = 0; i < tentativas; i++) {
        if (!saco.length) saco = U.shuffle(rotas.slice());
        let k = 0;
        while (rotas.length > 1 && saco[saco.length - 1] === ant && k < saco.length - 1) {
          saco.unshift(saco.pop()); k++;
        }
        const c = saco.pop();
        out.push(c); ant = c;
      }
    }
    return out;
  }

  /* ---------- Oclusão temporal ---------- */
  /** Janelas de visão, do mais fácil ao mais difícil (ms). */
  const JANELAS_OCLUSAO = [600, 420, 300, 200, 140];

  /* ---------- Espaçamento ---------- */
  function sessoesHoje() {
    const hoje = new Date().setHours(0, 0, 0, 0);
    return U.DB.load().sessoes.filter(s => new Date(s.t).setHours(0, 0, 0, 0) === hoje).length;
  }
  function conselhoEspacamento() {
    const n = sessoesHoje();
    const d = U.DB.load();
    const ult = d.sessoes[d.sessoes.length - 1];
    const horas = ult ? (Date.now() - (ult.fim || ult.t)) / 3600e3 : 999;
    if (n === 0) return { n, ok: true, txt: 'Primeira sessão do dia. É a que mais rende.' };
    if (n === 1 && horas >= 3) return { n, ok: true, txt: 'Segunda sessão com folga de algumas horas: ainda vale.' };
    if (n === 1) return { n, ok: true, aviso: true, txt: `Você treinou há ${Math.round(horas * 60)} min. Uma segunda sessão colada rende pouco — o ideal é esperar ou voltar amanhã.` };
    return { n, ok: false, aviso: true,
      txt: `${n}ª sessão hoje. Com o mesmo tempo total, sessões espalhadas em dias diferentes produzem retenção muito maior do que empilhadas num dia. O melhor uso do seu tempo agora é parar.` };
  }

  U.CI = {
    FORCA, PRINCIPIOS,
    indiceDificuldade, ajusteFitts,
    MEIA_VIDA, BASE_ESQUECIMENTO, decair, previsaoPausa,
    Escada, ESQUEMAS, esquemaPorNivel, ordenarRotas,
    JANELAS_OCLUSAO, sessoesHoje, conselhoEspacamento,
  };

})(window.U);
