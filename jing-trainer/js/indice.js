/* ============================================================
   indice.js — Estado Jing
   ------------------------------------------------------------
   A V2 tirou os 8 eixos 0-100 porque eram números sem unidade,
   sem incerteza e capazes de se mexer com 12 tentativas. A V3 os
   traz de volta, mas só porque agora existem três coisas que não
   existiam antes:

   1. Cada eixo é a tradução de uma QUANTIDADE MEDIDA, com unidade.
      A nota 0-100 é uma convenção de leitura; o dado é o número
      com unidade que aparece embaixo dela.
   2. Cada nota passa por ENCOLHIMENTO: a estimativa nova é puxada
      na direção da anterior com peso n/(n+k). Com amostra pequena
      a nota quase não se mexe. É isso que impede uma sessão
      excepcional de distorcer o nível.
   3. Nada vira "evolução" ou "queda" por comparar duas sessões.
      Uma mudança só é declarada real quando passa do erro típico
      da própria medida E da menor mudança com significado prático,
      e a soma cumulativa confirma que é persistente.

   As âncoras (o que vale 0 e o que vale 100) são convenção minha,
   escolhidas em faixas plausíveis, e estão declaradas como tal em
   cada eixo. Elas não mudam o que foi medido — mudam só a régua.
   ============================================================ */
'use strict';
(function (U) {

  const S = U.S, MD = U.MD, GM = U.GM;

  /** Converte uma quantidade medida em nota 0-100 numa faixa declarada. */
  function escalar(v, pior, melhor) {
    if (v == null) return null;
    const t = (v - pior) / (melhor - pior);
    return U.clamp(Math.round(t * 100), 0, 100);
  }

  /* ============================================================
     OS DEZ EIXOS
     k = peso do passado no encolhimento. Vem da amostra mínima do
     tipo de medida: quanto mais ruidosa a medida, maior o k.
     ============================================================ */
  const EIXOS = [
    {
      id: 'mecanica', nome: 'Mecânica', k: 8, tipo: 'tempo',
      pergunta: 'Que tempo de rota você sustenta com o acerto no alvo?',
      ancora: [2200, 550], unidade: 'ms', melhorE: 'menor',
      ancoraNota: '2200 ms vale 0, 550 ms vale 100 — faixa escolhida por cobrir do combo hesitante ao combo fluido.',
      medir() {
        const e = MD.execucao();
        /* nef: quantas estimativas INDEPENDENTES sustentam este número.
           São limiares de set, não tentativas soltas. Contar tentativas
           aqui declarava confiabilidade de 36 observações onde existem 3
           — e o teste mostrou a nota pulando 41 pontos num dia só. */
        return e.v == null ? null
          : { v: e.v, n: (e.n || 0) * 12, nef: e.n || 0, ic: [e.lo, e.hi], fonte: 'limiar de execução' };
      },
    },
    {
      id: 'precisao', nome: 'Precisão', k: 30, tipo: 'proporcao',
      pergunta: 'Quão perto do miolo do botão o seu dedo cai?',
      ancora: [0.45, 0.92], unidade: '', melhorE: 'maior',
      ancoraNota: 'Centralidade média do toque: 0,45 do raio vale 0, 0,92 vale 100.',
      medir() {
        const t = U.DB.load().toques || {};
        const todos = [], porDia = {};
        for (const id in t) for (const p of t[id]) {
          const c = 1 - Math.min(1, Math.hypot(p.dx, p.dy));
          todos.push(c);
          if (p.t) { const d0 = new Date(p.t).setHours(0, 0, 0, 0);
                     (porDia[d0] || (porDia[d0] = [])).push(c); }
        }
        if (todos.length < 20) return null;
        const ic = S.mediaIC(todos);
        /* série por dia quando os toques têm data. Toques gravados antes
           desta versão não têm, e aí o eixo simplesmente não fala de
           tendência — sem série de pontos independentes o veredicto saía
           falso em 25% dos jogadores simulados que não mudaram nada. */
        const dias = Object.keys(porDia).sort();
        const viva = dias.map(k => porDia[k]).filter(v => v.length >= 8).map(v => U.mean(v));
        return { v: ic.v, n: todos.length, nef: dias.length || Math.ceil(todos.length / 8),
                 ic: [ic.lo, ic.hi], viva,
                 semTendencia: viva.length < 6
                   ? 'os toques guardados antes desta versão não têm data, então ainda não dá para montar uma série de dias independentes aqui. Este eixo está dando nível, não tendência.'
                   : null,
                 fonte: `${todos.length} toques medidos${dias.length ? ` em ${dias.length} dias` : ''}` };
      },
    },
    {
      id: 'velocidade', nome: 'Velocidade', k: 40, tipo: 'tempo',
      pergunta: 'Quanto tempo entre um comando e o próximo?',
      ancora: [700, 200], unidade: 'ms', melhorE: 'menor',
      ancoraNota: '700 ms entre comandos vale 0, 200 ms vale 100. Faixa alargada depois que uma simulação mostrou um jogador competente cravando 0 na régua antiga — âncora mal posta vira nota falsa. Medida separada do acerto de propósito.',
      medir() {
        const a = MD.filtrar({ k: 'rota', dias: 30 }).filter(x => x.ok && x.tot && x.x && x.x.passos);
        if (a.length < 20) return null;
        const ikis = a.map(x => x.tot / Math.max(1, x.x.passos - 1));
        const b = S.bootMediana(ikis);
        /* nível: a mediana dos 30 dias. Tendência: a mediana de CADA DIA,
           que são amostras disjuntas. Sem isso, a janela móvel produzia
           veredicto falso em 28% dos jogadores simulados que não mudaram. */
        const porDia = {};
        for (const x of a) { const d0 = new Date(x.t).setHours(0, 0, 0, 0);
          (porDia[d0] || (porDia[d0] = [])).push(x.tot / Math.max(1, x.x.passos - 1)); }
        const dias = Object.keys(porDia).sort();
        return { v: b.v, n: ikis.length, nef: dias.length, ic: [b.lo, b.hi],
                 viva: dias.map(k => porDia[k]).filter(v => v.length >= 5).map(v => U.median(v)),
                 fonte: `${ikis.length} rotas em ${dias.length} dias` };
      },
    },
    {
      id: 'consistencia', nome: 'Consistência', k: 6, tipo: 'tempo',
      pergunta: 'Quanto o seu ritmo varia de uma repetição para outra?',
      ancora: [45, 8], unidade: '%', melhorE: 'menor',
      ancoraNota: '45% de variação vale 0, 8% vale 100.',
      medir() {
        const e = MD.estabilidade();
        /* a estimativa é a média dos CVs POR SESSÃO: o que a sustenta é o
           número de sessões, não o de tentativas dentro delas. */
        return e.v == null ? null
          : { v: e.v, n: e.n, nef: e.sessoes || 1, ic: [e.lo, e.hi], fonte: 'variação do tempo de rota' };
      },
    },
    {
      id: 'reflexo', nome: 'Reflexo', k: 30, tipo: 'tempo',
      pergunta: 'Quanto tempo entre ver o sinal e responder certo?',
      ancora: [1400, 420], unidade: 'ms', melhorE: 'menor',
      ancoraNota: '1400 ms vale 0, 420 ms vale 100 — faixa típica de reação com escolha.',
      medir() {
        const a = MD.filtrar({ k: 'leitura', dias: 45 }).filter(x => x.ok && x.rt);
        if (a.length < 15) return null;
        const b = S.bootMediana(a.map(x => x.rt));
        return { v: b.v, n: a.length, ic: [b.lo, b.hi], fonte: `${a.length} leituras certas` };
      },
    },
    {
      id: 'percepcao', nome: 'Percepção', k: 20, tipo: 'tempo',
      pergunta: 'De quanta informação você ainda precisa para decidir certo?',
      ancora: [600, 130], unidade: 'ms', melhorE: 'menor',
      ancoraNota: 'Janela de oclusão em que o acerto cai a 60%. 600 ms vale 0, 130 ms vale 100.',
      medir() {
        const curva = MD.curvaLeitura();
        const usaveis = curva.filter(c => c.n >= 6);
        if (usaveis.length < 3) return null;
        /* interpola a janela onde o acerto cruza 60% */
        const ord = usaveis.slice().sort((a, b) => a.janela - b.janela);
        let cruz = null;
        for (let i = 1; i < ord.length; i++) {
          const a = ord[i - 1], b = ord[i];
          if ((a.p - 0.6) * (b.p - 0.6) <= 0 && b.p !== a.p) {
            cruz = a.janela + (b.janela - a.janela) * (0.6 - a.p) / (b.p - a.p);
            break;
          }
        }
        if (cruz == null) cruz = ord[0].p >= 0.6 ? ord[0].janela : ord[ord.length - 1].janela;
        const n = usaveis.reduce((s, c) => s + c.n, 0);
        /* o cruzamento é interpolado entre janelas: leituras dentro de uma
           mesma janela não são independentes para esta estimativa. */
        return { v: cruz, n, nef: Math.min(n, usaveis.length * 6), ic: [null, null],
                 fonte: `${n} leituras em ${usaveis.length} janelas` };
      },
    },
    {
      id: 'decisao', nome: 'Decisão', k: 8, tipo: 'proporcao',
      pergunta: 'Com a informação disponível, você escolhe certo?',
      ancora: [33, 95], unidade: '%', melhorE: 'maior',
      ancoraNota: 'Três opções: 33% é acaso e vale 0; 95% vale 100.',
      medir() {
        const a = MD.filtrar({ k: 'decisao', dias: 45 });
        if (a.length < 15) return null;
        const w = S.wilson(a.filter(x => x.ok).length, a.length);
        /* mesma coisa da retenção: o acumulado é o nível, a série por dia é
           a tendência. Dias com menos de 6 decisões ficam de fora — uma
           proporção de 3 tentativas é ruído com aparência de ponto. */
        const sessoes = new Set(a.map(x => x.s)).size;
        const porDia = {};
        for (const x of a) { const d0 = new Date(x.t).setHours(0, 0, 0, 0);
          const e = porDia[d0] || (porDia[d0] = { k: 0, n: 0, t: d0 }); e.k += x.ok; e.n++; }
        return { v: w.p * 100, n: a.length, nef: sessoes,
                 ic: [w.lo * 100, w.hi * 100],
                 viva: Object.values(porDia).sort((x, y) => x.t - y.t)
                         .filter(e => e.n >= 6).map(e => (e.k / e.n) * 100),
                 fonte: `${a.length} decisões em ${sessoes} dias` };
      },
    },
    {
      id: 'pressao', nome: 'Controle sob pressão', k: 20, tipo: 'proporcao',
      pergunta: 'Quanto do seu desempenho sobrevive quando algo é perturbado?',
      ancora: [55, 100], unidade: '% do normal', melhorE: 'maior',
      ancoraNota: 'Acerto sob perturbação dividido pelo acerto sem perturbação. 55% do normal vale 0, 100% vale 100.',
      medir() {
        const s = GM.sensibilidade({ dias: 45 });
        const comPert = s.itens.reduce((a, x) => a + x.n, 0);
        if (comPert < 25 || !s.base || s.base.n < 20 || s.base.p <= 0) return null;
        const acertos = s.itens.reduce((a, x) => a + x.p * x.n, 0);
        const rel = (acertos / comPert) / s.base.p;
        return { v: U.clamp(rel, 0, 1.2) * 100, n: comPert, nef: Math.min(comPert, s.base.n),
                 ic: [null, null],
                 fonte: `${comPert} tentativas perturbadas contra ${s.base.n} normais` };
      },
    },
    {
      id: 'retencao', nome: 'Retenção', k: 8, tipo: 'proporcao',
      pergunta: 'Quanto volta no dia seguinte, sem ajuda?',
      ancora: [30, 95], unidade: '%', melhorE: 'maior',
      ancoraNota: '30% vale 0, 95% vale 100.',
      medir() {
        const r = MD.retencao();
        if (r.v == null) return null;
        /* A retenção acumula numa janela de 60 dias: o número dela é o NÍVEL,
           e a sequência desse número converge em vez de oscilar. Medir
           tendência nela dava veredicto falso em 38% dos jogadores simulados
           que não mudaram nada. Mas a retenção tem, por baixo, uma série
           genuinamente independente: a proporção de CADA DIA de teste. É essa
           que vai para a conta de tendência — dias diferentes, amostras
           disjuntas, nada compartilhado entre pontos. */
        return { v: r.v, n: r.n, nef: r.sessoes || 1, ic: [r.lo, r.hi],
                 viva: (r.serie || []).filter(p => p.n >= 6).map(p => p.p * 100),
                 fonte: `${r.n} tentativas sem ajuda em ${r.sessoes || 1} dias` };
      },
    },
    {
      id: 'adaptacao', nome: 'Adaptação', k: 20, tipo: 'proporcao',
      pergunta: 'Quanto sobra quando a situação muda de cara mas mantém a regra?',
      ancora: [50, 100], unidade: '% do normal', melhorE: 'maior',
      ancoraNota: 'Acerto em variantes dividido pelo acerto na versão treinada. 50% do normal vale 0, 100% vale 100.',
      medir() {
        const t = MD.filtrar({ dias: 60 }).filter(x => x.x && x.x.vr);
        const base = t.filter(x => x.x.vr === 'base');
        const vari = t.filter(x => x.x.vr !== 'base');
        if (base.length < 15 || vari.length < 15) return null;
        const pB = base.filter(x => x.ok).length / base.length;
        const pV = vari.filter(x => x.ok).length / vari.length;
        if (pB <= 0) return null;
        return { v: U.clamp(pV / pB, 0, 1.2) * 100, n: vari.length,
                 nef: Math.min(vari.length, base.length), ic: [null, null],
                 fonte: `${vari.length} variantes contra ${base.length} treinadas` };
      },
    },
  ];

  const porId = (id) => EIXOS.find(e => e.id === id);

  /* ============================================================
     CÁLCULO DOS EIXOS, COM ENCOLHIMENTO
     ============================================================ */
  function calcularEixos() {
    const d = U.DB.load();
    if (!d.indiceEstado) d.indiceEstado = {};
    const out = [];
    for (const E of EIXOS) {
      let m = null;
      try { m = E.medir(); } catch (e) { m = null; }
      const anterior = d.indiceEstado[E.id] ? d.indiceEstado[E.id].nota : null;
      if (!m || m.v == null) {
        out.push({ ...E, bruto: null, nota: anterior, n: 0, nef: 0, nivel: 'insuficiente',
                   encolhido: false, peso: 0, passo: 0, fonte: null });
        continue;
      }
      const cru = escalar(m.v, E.ancora[0], E.ancora[1]);
      /* nef = observações INDEPENDENTES por trás da estimativa. Quando a
         medida é a média de poucas estimativas (limiares, CVs por sessão,
         razão entre duas proporções), contar tentativas brutas inflaria a
         confiabilidade — e é a confiabilidade que decide tanto o quanto a
         nota pode se mexer quanto o peso dela no índice. */
      const nef = m.nef != null ? m.nef : m.n;
      const enc = S.encolher(cru, anterior, nef, E.k);
      /* Encolhimento e confiabilidade não são a mesma coisa. Sem nota
         anterior o encolhimento devolve peso 1 — correto, não há para
         onde puxar — mas isso NÃO quer dizer que a medida seja confiável,
         e esse peso também servia de peso no índice global. Uma medida de
         uma sessão só entrava no índice com peso total. A confiabilidade
         é sempre nef/(nef+k), tenha havido histórico ou não. */
      const confiab = nef / (nef + E.k);
      const nivel = S.nivelDado(m.n, E.tipo === 'tempo' ? 'tempo' : 'proporcao');
      const icNota = (m.ic && m.ic[0] != null)
        ? [escalar(m.ic[0], E.ancora[0], E.ancora[1]), escalar(m.ic[1], E.ancora[0], E.ancora[1])]
            .sort((a, b) => a - b)
        : null;
      out.push({
        ...E, bruto: m.v, cru, nota: Math.round(enc.v), n: m.n, nef, nivel, viva: m.viva || null,
        semTendencia: m.semTendencia || null,
        peso: confiab, passo: enc.w, fonte: m.fonte, ic: icNota,
        encolhido: enc.w < 0.85 && anterior != null,
        puxou: anterior != null ? Math.round(enc.v) - cru : 0,
      });
    }
    return out;
  }

  /* ============================================================
     ÍNDICE GLOBAL
     ------------------------------------------------------------
     NÃO é a média. A pergunta que ele responde é "qual é o meu
     nível de desempenho CONFIÁVEL", e isso muda duas coisas:

     1. Agregação: média harmônica ponderada em vez de aritmética.
        Numa luta o desempenho é limitado pelo elo mais fraco —
        dedo rápido não compensa leitura lenta. A média harmônica
        pune o componente fraco muito mais do que premia o forte.
        (Aritmética de {90,90,90,30} = 75; harmônica = 60.)

     2. Peso: proporcional à CONFIABILIDADE de cada eixo, não a um
        juízo meu sobre importância. Eixo com pouca amostra quase
        não entra. Assim o índice não sobe porque um eixo mal
        medido teve sorte, e eu não preciso inventar pesos.
     ============================================================ */
  function global(eixos) {
    const com = (eixos || calcularEixos()).filter(e => e.nota != null && e.n > 0);
    if (com.length < 3) {
      return { v: null, n: com.length, eixosUsados: com.length, total: EIXOS.length,
               aritmetica: null, lo: null, hi: null, diferencaParaMedia: 0,
               puxandoBaixo: [], puxandoCima: [], gargalo: null, nivel: 'insuficiente',
               texto: `Preciso de pelo menos 3 eixos medidos (tenho ${com.length}).` };
    }
    /* Piso da harmônica. A média harmônica é o que faz o elo fraco pesar —
       é de propósito. Mas ela usa o INVERSO das notas, e o zero da régua não
       é "capacidade zero": é o pior desempenho plausível da faixa. Tratado
       como zero de verdade, um único eixo no chão derruba o índice inteiro
       para perto de zero, e foi o que uma simulação mostrou: um jogador
       competente com a régua de velocidade mal posta marcava 5 de 100.
       O piso de 20 mantém a punição forte ({90,90,90,30} continua dando 60)
       sem deixar um eixo só anular tudo. */
    const PISO_HARM = 20;
    let somaP = 0, somaInv = 0;
    for (const e of com) {
      const p = e.peso || 0.01;
      somaP += p;
      somaInv += p / Math.max(PISO_HARM, e.nota);
    }
    const harm = somaP / somaInv;
    const arit = com.reduce((a, e) => a + e.nota * (e.peso || 0.01), 0) / somaP;

    /* incerteza do índice: propagada dos eixos que têm intervalo */
    const comIC = com.filter(e => e.ic);
    let lo = null, hi = null;
    if (comIC.length >= 2) {
      const baixo = com.map(e => e.ic ? Math.min(e.ic[0], e.ic[1]) : e.nota);
      const alto = com.map(e => e.ic ? Math.max(e.ic[0], e.ic[1]) : e.nota);
      lo = Math.round(harmonica(baixo, com.map(e => e.peso || 0.01), PISO_HARM));
      hi = Math.round(harmonica(alto, com.map(e => e.peso || 0.01), PISO_HARM));
    }
    const ord = com.slice().sort((a, b) => a.nota - b.nota);
    const media = com.reduce((a, e) => a + e.nota, 0) / com.length;
    return {
      v: Math.round(harm), aritmetica: Math.round(arit), lo, hi,
      n: com.length, eixosUsados: com.length, total: EIXOS.length,
      nivel: com.length >= 7 ? 'razoavel' : com.length >= 5 ? 'provisorio' : 'insuficiente',
      puxandoBaixo: ord.slice(0, 2).filter(e => e.nota < media - 5),
      puxandoCima: ord.slice(-2).reverse().filter(e => e.nota > media + 5),
      gargalo: ord[0],
      diferencaParaMedia: Math.round(arit - harm),
    };
  }
  function harmonica(vals, pesos, piso = 20) {
    let sp = 0, si = 0;
    for (let i = 0; i < vals.length; i++) { sp += pesos[i]; si += pesos[i] / Math.max(piso, vals[i]); }
    return sp / si;
  }

  /* ============================================================
     HISTÓRICO E DETECÇÃO DE MUDANÇA
     ============================================================ */
  function registrar() {
    const d = U.DB.load();
    const eixos = calcularEixos();
    const g = global(eixos);
    if (!d.indiceEstado) d.indiceEstado = {};
    for (const e of eixos) if (e.nota != null) d.indiceEstado[e.id] = { nota: e.nota, n: e.n, t: Date.now() };
    if (!d.indiceHist) d.indiceHist = [];
    const reg = {
      t: Date.now(), global: g.v, nEixos: g.eixosUsados || 0,
      /* nota encolhida: é o NÍVEL de hoje, o número que a tela mostra */
      eixos: Object.fromEntries(eixos.filter(e => e.nota != null).map(e => [e.id, e.nota])),
      /* Nota CRUA, sem encolhimento, e só quando o eixo já é COMPARÁVEL com
         ele mesmo no futuro (peso >= 0,5, isto é nef >= k). Duas razões, as
         duas encontradas por simulação de dez semanas com habilidade FIXA:
         1) a nota encolhida sobe sozinha enquanto converge para o valor
            verdadeiro — convergência do estimador não é progresso do jogador;
         2) quase toda medida aqui sai de uma janela que ainda está enchendo
            (os primeiros pontos vêm de poucos dias, os últimos de 45), e uma
            estimativa que vai ficando mais precisa desenha uma trajetória
            que parece evolução e é só amostra crescendo.
         Ponto que não é comparável não entra na série. A nota dele continua
         aparecendo na tela — ela só não vira tendência. */
      crus: Object.fromEntries(eixos.filter(e => e.cru != null && e.peso >= 0.5)
                                    .map(e => [e.id, e.cru])),
      /* quantas observações sustentavam cada eixo neste ponto. Serve para
         jogar fora ponto repetido — ver serieDe(). */
      ns: Object.fromEntries(eixos.filter(e => e.nef != null).map(e => [e.id, e.nef])),
      brutos: Object.fromEntries(eixos.filter(e => e.bruto != null).map(e => [e.id, +e.bruto.toFixed(1)])),
      sessao: d.sessaoAtual ? d.sessaoAtual.id : null,
    };
    const ult = d.indiceHist[d.indiceHist.length - 1];
    if (ult && Date.now() - ult.t < 30 * 60e3) d.indiceHist[d.indiceHist.length - 1] = reg;
    else d.indiceHist.push(reg);
    if (d.indiceHist.length > 300) d.indiceHist = d.indiceHist.slice(-300);
    U.DB.save();
    return reg;
  }

  /**
   * Piso absoluto de mudança, em pontos da régua de 0 a 100.
   *
   * O teste de "menor mudança com significado" é relativo ao espalhamento
   * da própria série, e quando a série quase não se mexe ele encolhe junto:
   * uma sequência 62 63 63 64 64 passava como evolução por causa de UM
   * ponto de nota. Um ponto da régua não é notícia sobre nada — em mecânica
   * ele vale uns 16 ms, dentro da variação de um dia qualquer.
   * Três pontos é convenção minha, declarada aqui, e vale dos dois lados.
   */
  const PISO_NOTA = 3;

  const ESTADOS = {
    evolucao:   { cor: '🟢', nome: 'evolução',          o_que: 'subida confirmada pela soma cumulativa' },
    estavel:    { cor: '🟡', nome: 'estabilidade',      o_que: 'variação dentro do ruído da própria medida' },
    suspeita:   { cor: '🟠', nome: 'queda suspeita',    o_que: 'caiu mais que o ruído, mas ainda não é persistente' },
    queda:      { cor: '🔴', nome: 'queda consistente', o_que: 'queda persistente confirmada pela soma cumulativa' },
    semDados:   { cor: '⚪', nome: 'sem dados',          o_que: 'série curta demais para separar sinal de ruído' },
  };

  /**
   * A série que vale para TENDÊNCIA: crua, comparável e SEM REPETIÇÃO.
   *
   * O terceiro requisito veio de medir a taxa de erro do sistema em 40
   * jogadores simulados que não mudaram nada: decisão e retenção davam
   * veredicto falso em quase um terço das vezes. A causa não era o limiar
   * — era que nem todo eixo se atualiza toda sessão. A retenção, por
   * exemplo, só mede a cada dois dias, então metade dos pontos do
   * histórico dela era o MESMO número carimbado de novo. Diferenças
   * consecutivas iguais a zero derrubam a estimativa de ruído a quase
   * nada, e aí qualquer perambulada lenta passa como mudança real.
   *
   * Um ponto em que a amostra do eixo não cresceu não é observação nova.
   * Ele sai da série de tendência (e continua no histórico e na tela).
   */
  function serieDe(id) {
    /* Série VIVA: pontos calculados de amostras disjuntas (um por dia de
       teste), quando o eixo consegue produzi-los. É a melhor série possível
       para tendência — nada é compartilhado entre dois pontos — e por isso
       ela passa na frente do histórico de notas. */
    try {
      const E = porId(id);
      const m = E && E.medir();
      if (m && m.viva && m.viva.length >= 6) {
        const esc = m.viva.map(v => escalar(v, E.ancora[0], E.ancora[1]));
        return { pontos: esc.map(() => ({})), vals: esc, cru: true, viva: true };
      }
    } catch (e) { /* cai para o histórico */ }
    const h = U.DB.load().indiceHist || [];
    const novos = (lista, campo) => {
      const out = [];
      let ultV = null;
      for (const x of lista) {
        const v = campo(x);
        if (v === ultV) continue;        // mesmo número carimbado de novo
        ultV = v; out.push(x);
      }
      return out;
    };
    const comCru = novos(h.filter(x => x.crus && x.crus[id] != null), x => x.crus[id]);
    if (comCru.length >= 5) return { pontos: comCru, vals: comCru.map(x => x.crus[id]), cru: true };
    const comNota = novos(h.filter(x => x.eixos[id] != null), x => x.eixos[id]);
    return { pontos: comNota, vals: comNota.map(x => x.eixos[id]), cru: false };
  }

  /**
   * Classifica a direção de uma série. Nunca por uma sessão: precisa
   * passar do erro típico, ter tamanho útil, e a soma cumulativa
   * precisa concordar.
   */
  function direcao(serie, semTendencia) {
    if (semTendencia) return { estado: 'semDados', n: serie.length, ...ESTADOS.semDados,
                               o_que: semTendencia };
    if (serie.length < 5) return { estado: 'semDados', n: serie.length, ...ESTADOS.semDados };
    /* Régua saturada. Quando boa parte dos pontos encosta em 0 ou em 100, a
       série não mede mais variação: ela mede o encosto. Uma sequência de
       cem-cem-cem com um tropeço no meio vira "queda" sem nada ter mudado —
       nos jogadores simulados que não mudaram nada, este era o único eixo
       que ainda errava, e errava um terço das vezes. Sem faixa para medir,
       o certo é dizer que a régua não serve aqui, não chutar uma direção. */
    const encostados = serie.filter(v => v <= 0 || v >= 100).length;
    if (encostados / serie.length >= 0.30)
      return { estado: 'semDados', n: serie.length, ...ESTADOS.semDados,
               o_que: `${Math.round(100 * encostados / serie.length)}% das medidas encostam no fim da régua (${serie[0] >= 100 ? '100' : '0'}). Nessa faixa a régua não distingue mais nada, então aqui ela dá nível e não tendência`,
               saturado: true };
    const cs = S.cusum(serie);
    /* A primeira versão comparava o ÚLTIMO PONTO com a média do início.
       Um ponto solto carrega o ruído inteiro de uma medida, e uma série
       plana virava "queda suspeita" sozinha — o oposto do que foi pedido.
       Agora os dois lados são médias, e o teste de ruído sabe de quantos
       pontos cada média saiu. */
    const corte = Math.floor(serie.length / 2);
    const ini = serie.slice(0, corte), fim = serie.slice(corte);
    const delta = U.mean(fim) - U.mean(ini);
    const mr = S.mudancaReal(serie, delta, { n1: ini.length, n2: fim.length });
    let estado;
    /* "Queda consistente" é o veredicto mais pesado da tela, então precisa da
       barra MAIS alta — e estava com a mais baixa: saía da soma cumulativa
       sozinha, sem o teste de ruído que a subida precisava passar. Num jogador
       simulado que não mudou nada, quatro dos cinco eixos vinham marcados como
       queda. Agora os dois lados exigem exatamente as mesmas três coisas. */
    const grande = Math.abs(delta) >= PISO_NOTA;
    if (cs.estado === 'subida' && mr.real && grande && delta > 0) estado = 'evolucao';
    else if (cs.estado === 'queda' && mr.real && grande && delta < 0) estado = 'queda';
    else if (delta < 0 && mr.real && grande) estado = 'suspeita';
    else estado = 'estavel';
    return { estado, ...ESTADOS[estado], delta, cusum: cs, n: serie.length, piso: PISO_NOTA,
             pequenaDemais: mr.real && !grande,
             et: mr.et, swc: mr.swc, ruido: mr.ruido, ro: mr.ro,
             nEfetivo: mr.e1 + mr.e2, motivo: mr.motivo, mudanca: mr };
  }

  /** Variação em janelas de tempo, com a checagem de "isso é real?". */
  /**
   * Variação numa janela de tempo. Os dois lados são MÉDIAS — de um lado
   * os pontos dentro da janela, do outro os de antes dela. Comparar o
   * ponto de hoje com um ponto de dez dias atrás era barato e errado:
   * dois pontos soltos têm ruído demais, e séries planas produziam
   * "mudança real" por acaso.
   */
  function variacao(id, dias) {
    const { pontos, vals, cru } = serieDe(id);
    if (pontos.length < 4) return null;
    const corte = Date.now() - dias * U.DAY;
    const antigos = [], recentes = [];
    pontos.forEach((pt, i) => (pt.t < corte ? antigos : recentes).push(vals[i]));
    if (antigos.length < 2 || recentes.length < 2) return null;
    const ref = U.mean(antigos), agora = U.mean(recentes);
    /* dez eixos aparecem juntos na tela de Estado; o selo de "real" de
       cada um precisa aguentar o fato de eu estar olhando os dez. */
    const mr = S.mudancaReal(vals, agora - ref,
                             { n1: antigos.length, n2: recentes.length,
                               z: S.zParaMuitas(EIXOS.length) });
    return { delta: agora - ref, pct: ref ? (agora - ref) / ref : 0,
             real: mr.real, motivo: mr.motivo, de: ref, para: agora, cru,
             nAntes: antigos.length, nDepois: recentes.length };
  }

  function relatorioEixo(id) {
    const { vals: serie, cru } = serieDe(id);
    const E = porId(id);
    const atual = calcularEixos().find(e => e.id === id);
    return {
      eixo: E, atual, serieCrua: cru,
      serie, direcao: direcao(serie, atual && atual.semTendencia),
      v7: variacao(id, 7), v30: variacao(id, 30),
      melhor: serie.length ? Math.max(...serie) : null,
      pior: serie.length ? Math.min(...serie) : null,
      ultimo: serie.length >= 2 ? serie[serie.length - 1] - serie[serie.length - 2] : null,
    };
  }

  /* ============================================================
     LIMITE DE PERFORMANCE
     Ajusta acerto(dificuldade) e devolve três níveis: onde você é
     consistente, onde começa a oscilar e onde quebra. Com taxa de
     lapso, porque falhas sem relação com a dificuldade enviesam
     limiar e inclinação — e é isso que produz avaliação falsa.
     ============================================================ */
  function limite({ drill = 'rota', dias = 60 } = {}) {
    const sets = U.DB.load().sets.filter(x => x.drill === drill && x.mo === 'treino' &&
                                              x.dif != null && Date.now() - x.t < dias * U.DAY);
    const bins = {};
    for (const s of sets) {
      const b = Math.round(s.dif * 2) / 2;                 // faixas de 0,5
      const e = bins[b] || (bins[b] = { x: b, k: 0, n: 0 });
      e.k += s.ok; e.n += s.n;
    }
    const pontos = Object.values(bins).sort((a, b) => a.x - b.x);
    const f = S.ajustePsicometrico(pontos);
    if (!f.ok) return { ok: false, motivo: f.motivo, pontos, n: f.n, niveis: f.niveis };
    const fator = (nivel) => {
      if (nivel == null) return null;
      const d = U.D.porId(drill);
      if (!d) return null;
      const cfg = d.cfg(U.clamp(nivel, 1, 10), {});
      return cfg.alvoMs || null;
    };
    return {
      ok: true, ...f, pontos,
      msConsistente: fator(f.consistente), msOscila: fator(f.oscila), msQuebra: fator(f.quebra),
      /* λ é o teto que você não alcança nem na dificuldade mais fácil —
         não é "a fração dos seus erros". Dizer que era produzia uma
         afirmação falsa sobre os erros em dificuldade alta. */
      lapsoTexto: f.lambda > 0.06
        ? `Mesmo na dificuldade mais baixa você ainda erra cerca de ${Math.round(f.lambda * 100)}% das tentativas, por motivo que não é a dificuldade — distração, toque escorregado, atenção. Enquanto isso não cair, parte do que parece limite é lapso.`
        : `Seu teto é limpo (lapso de ${Math.round(f.lambda * 100)}%): na dificuldade baixa você praticamente não erra, então o que aparece adiante é dificuldade de verdade.`,
      inclinacaoTexto: f.beta > 2.0
        ? 'A queda é abrupta: existe um degrau claro entre o nível que você sustenta e o que te quebra.'
        : f.beta < 0.8
          ? 'A queda é gradual: você não tem um degrau, tem uma ladeira. Isso costuma indicar que a execução ainda não estabilizou.'
          : 'Queda de inclinação típica.',
    };
  }

  U.IX = { EIXOS, PISO_NOTA, porId, escalar, calcularEixos, global, registrar, direcao, variacao, serieDe,
           relatorioEixo, limite, ESTADOS };

})(window.U);
