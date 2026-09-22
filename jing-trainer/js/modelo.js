/* ============================================================
   modelo.js — o que o sistema mede, e com quanta certeza
   ------------------------------------------------------------
   Substitui o vetor de 8 eixos 0-100 da V1.

   Três problemas da V1 que este arquivo corrige:

   1. Os 8 eixos eram médias móveis exponenciais sobre sets de
      10-20 tentativas. Uma proporção com n=12 tem intervalo de
      confiança de ~40 pontos: largo demais para distinguir as
      situações que pedem ações opostas.

   2. Os eixos não tinham unidade. "Precisão 74" não diz nada que
      possa ser conferido dentro do jogo.

   3. O erro mais grave: se a dificuldade se adapta para manter o
      acerto perto de 85%, então o ACERTO vira constante por
      construção e deixa de medir qualquer coisa. O que varia —
      e portanto o que mede — é o NÍVEL sustentado nesse acerto.

   Aqui são 5 medidas, cada uma com unidade, direção e intervalo.
   Todas calculadas sob demanda a partir das tentativas cruas, o
   que permite recalcular tudo quando o método muda.
   ============================================================ */
'use strict';
(function (U) {

  const S = U.S;

  /* Condição de referência: fixa para sempre. É o que permite
     comparar hoje com daqui a um mês. O treino adapta; a prova não. */
  const REF = {
    rota: ['s1', 'aa', 's2'],     // rota "Marca": a mais usada numa partida
    alvoMs: 1100,                  // tempo-alvo da rota na prova
    oclusao: 300,                  // janela de visão da prova de leitura
    ajuda: false,                  // sem botão aceso, sem retorno por tentativa
  };

  const MEDIDAS = {
    execucao: {
      nome: 'Execução', unidade: 'ms', melhor: 'menor',
      pergunta: 'Qual o tempo de rota que você sustenta com 85% de acerto?',
      explica: 'Não é "o quão rápido você consegue uma vez". É o tempo que você aguenta repetir sem quebrar.',
    },
    estabilidade: {
      nome: 'Estabilidade', unidade: '%', melhor: 'menor',
      pergunta: 'Quanto o seu ritmo varia de uma repetição para outra?',
      explica: 'Variação alta é o que faz o combo falhar justo na luta que importa.',
    },
    leitura: {
      nome: 'Leitura', unidade: '% certo', melhor: 'maior',
      pergunta: 'Com 300 ms de informação, você decide certo?',
      explica: 'Medido sempre na mesma janela de oclusão, senão não dá para comparar com a semana passada.',
    },
    aborto: {
      nome: 'Janela de aborto', unidade: 'ms', melhor: 'maior',
      pergunta: 'Com quanta antecedência o perigo precisa aparecer para você conseguir cancelar?',
      explica: 'Não é um SSRT de laboratório — é uma medida descritiva de quando você ainda consegue soltar a jogada.',
    },
    retencao: {
      nome: 'Retenção', unidade: '% certo', melhor: 'maior',
      pergunta: 'O que sobra da rota no dia seguinte, sem ajuda nenhuma?',
      explica: 'A única medida que separa aprendizado de desempenho do dia.',
    },
  };

  /* Métrica derivada: só aparece quando há amostra para ela. */
  const DERIVADAS = {
    custoDecisao: {
      nome: 'Custo da decisão', unidade: 'pontos', melhor: 'menor',
      pergunta: 'Quanto a sua execução piora quando você também precisa decidir?',
      explica: 'Diferença entre duas proporções — soma o ruído das duas, então exige bem mais dados que as outras.',
    },
  };

  /* ============================================================
     Tentativas cruas — a única fonte de verdade
     ============================================================ */
  function tentativas() {
    const d = U.DB.load();
    if (!d.tentativas) d.tentativas = [];
    return d.tentativas;
  }

  /**
   * Grava uma tentativa. Chaves curtas de propósito: 4000 tentativas
   * precisam caber no localStorage sem derrubar nada.
   * @param {object} t
   *   d drill · mo modo(prova|treino|retencao) · k tipo(rota|leitura|aborto|integra)
   *   ok · rt · tot tempo total · err · dif · aj ajuda · ref condição de referência?
   */
  /** Horas desde a última tentativa de rota EM TREINO (a que "suja" a retenção).
      Memorizado por um minuto: é consultado a cada tentativa gravada. */
  let _cacheTreino = { em: 0, v: null };
  function horasDesdeTreinoDeRota() {
    if (_cacheTreino.v != null && Date.now() - _cacheTreino.em < 60000) {
      return _cacheTreino.v + (Date.now() - _cacheTreino.em) / 3600e3;
    }
    const a = tentativas();
    let v = 9999;
    for (let i = a.length - 1; i >= 0; i--) {
      if (a[i].k === 'rota' && a[i].mo === 'treino') { v = (Date.now() - a[i].t) / 3600e3; break; }
    }
    _cacheTreino = { em: Date.now(), v };
    return v;
  }

  function gravar(t) {
    const d = U.DB.load();
    if (!d.tentativas) d.tentativas = [];
    /* Retenção é uma CONDIÇÃO, não um modo de tela: rota de referência, sem
       ajuda, com intervalo desde o último treino. A Prova feita no dia
       seguinte satisfaz isso tanto quanto o teste dedicado — e descartá-la
       jogava fora metade da amostra da medida mais importante do sistema. */
    const ehRetencao = t.k === 'rota' && t.ref && !t.aj &&
                       (t.mo === 'retencao' || (t.mo === 'prova' && horasDesdeTreinoDeRota() >= 20));
    /* Horas desde o último treino de rota, gravadas NA TENTATIVA.
       Sem isso não existe curva de esquecimento: depois do fato não dá
       para reconstruir com que intervalo cada tentativa foi feita sem
       refazer a conta inteira a cada leitura. */
    const hDesde = (t.k === 'rota' && t.ref) ? +horasDesdeTreinoDeRota().toFixed(1) : null;
    d.tentativas.push({
      ret: ehRetencao ? 1 : 0, hDesde,
      t: Date.now(), s: d.sessaoAtual ? d.sessaoAtual.id : 0,
      d: t.d, mo: t.mo || 'treino', k: t.k, ok: t.ok ? 1 : 0,
      rt: t.rt != null ? Math.round(t.rt) : null,
      tot: t.tot != null ? Math.round(t.tot) : null,
      err: t.err || null, dif: t.dif != null ? +t.dif.toFixed(2) : null,
      aj: t.aj ? 1 : 0, ref: t.ref ? 1 : 0,
      x: t.x || null,
    });
    if (t.k === 'rota' && t.mo === 'treino') _cacheTreino = { em: Date.now(), v: 0 };
    if (d.tentativas.length > 5000) d.tentativas = d.tentativas.slice(-5000);
  }

  /** Filtro comum. dias=0 significa "tudo". */
  function filtrar({ k, mo, ref, dias = 0, drill, limite = 0 }) {
    const corte = dias ? Date.now() - dias * U.DAY : 0;
    let a = tentativas().filter(x =>
      (!k || x.k === k) &&
      (!mo || x.mo === mo) &&
      (ref == null || !!x.ref === !!ref) &&
      (!drill || x.d === drill) &&
      (!corte || x.t >= corte));
    if (limite && a.length > limite) a = a.slice(-limite);
    return a;
  }

  /* ============================================================
     As cinco medidas
     ============================================================ */

  /**
   * EXECUÇÃO — o tempo-alvo sustentado a 85%.
   * Lido do controlador de dificuldade, não do acerto: sob dificuldade
   * adaptativa o acerto é constante por construção.
   * O intervalo vem da dispersão do próprio limiar nos últimos sets
   * estáveis, que é a incerteza honesta desse número.
   */
  function execucao() {
    const d = U.DB.load();
    const h = (d.limiar || []).slice(-12);
    if (h.length < 3) {
      return { id: 'execucao', v: h.length ? h[h.length - 1].ms : null, lo: null, hi: null,
               n: h.length, nivel: 'insuficiente', ...MEDIDAS.execucao };
    }
    const vals = h.map(x => x.ms);
    const ic = S.mediaIC(vals.slice(-8));
    const tend = S.inclinacao(vals);
    return {
      id: 'execucao', v: Math.round(ic.v), lo: Math.round(ic.lo), hi: Math.round(ic.hi),
      n: h.length, nivel: S.nivelDado(h.length * 12, 'tempo'),
      tendencia: tend.direcao, porSet: h,
      ...MEDIDAS.execucao,
    };
  }

  /** ESTABILIDADE — CV do tempo de rota nas tentativas certas. */
  function estabilidade() {
    const a = filtrar({ k: 'rota', dias: 21 }).filter(x => x.ok && x.tot);
    if (a.length < 8) return { id: 'estabilidade', v: null, lo: null, hi: null, n: a.length,
                               nivel: 'insuficiente', ...MEDIDAS.estabilidade };
    /* CV por sessão, depois IC sobre essas medidas: evita que uma
       sessão ruim vire "instabilidade" permanente. */
    const porSessao = {};
    for (const x of a) (porSessao[x.s] || (porSessao[x.s] = [])).push(x.tot);
    const cvs = Object.values(porSessao).filter(v => v.length >= 4).map(v => S.cv(v)).filter(v => v != null);
    if (cvs.length < 2) {
      const c = S.cv(a.map(x => x.tot));
      return { id: 'estabilidade', v: c != null ? +(c * 100).toFixed(1) : null, lo: null, hi: null,
               n: a.length, nivel: 'provisorio', ...MEDIDAS.estabilidade };
    }
    const ic = S.mediaIC(cvs);
    return {
      id: 'estabilidade', v: +(ic.v * 100).toFixed(1),
      /* CVs por sessão: amostras disjuntas, uma por sessão. É a série que
         serve para tendência — o acumulado dos 21 dias serve para nível. */
      porSessao: cvs.map(c => c * 100),
      lo: +(Math.max(0, ic.lo) * 100).toFixed(1), hi: +(ic.hi * 100).toFixed(1),
      n: a.length, sessoes: cvs.length, nivel: S.nivelDado(a.length, 'tempo'),
      tendencia: S.inclinacao(cvs).direcao,
      ...MEDIDAS.estabilidade,
    };
  }

  /** LEITURA — proporção certa na janela de referência. */
  function leitura() {
    const a = filtrar({ k: 'leitura', ref: true, dias: 45 });
    const w = S.wilson(a.filter(x => x.ok).length, a.length);
    const porSessao = agrupaProporcao(a);
    return {
      id: 'leitura', v: a.length ? +(w.p * 100).toFixed(0) : null,
      lo: a.length ? +(w.lo * 100).toFixed(0) : null,
      hi: a.length ? +(w.hi * 100).toFixed(0) : null,
      n: a.length, nivel: w.nivel,
      acaso: 25,
      tendencia: S.inclinacao(porSessao.map(x => x.p)).direcao,
      serie: porSessao,
      ...MEDIDAS.leitura,
    };
  }

  /** Curva completa de oclusão — todas as janelas, não só a de referência. */
  function curvaLeitura() {
    const a = filtrar({ k: 'leitura', dias: 60 });
    const por = {};
    for (const x of a) {
      const j = x.x && x.x.j;
      if (!j) continue;
      const e = por[j] || (por[j] = { k: 0, n: 0 });
      e.k += x.ok; e.n++;
    }
    return Object.entries(por).map(([j, e]) => {
      const w = S.wilson(e.k, e.n);
      return { janela: +j, p: w.p, lo: w.lo, hi: w.hi, n: e.n };
    }).sort((x, y) => y.janela - x.janela);
  }

  /**
   * JANELA DE ABORTO.
   * A V1 chamava isso de SSRT e devolvia milissegundos como se fosse
   * uma medida psicométrica. Não é: o modelo de corrida do paradigma
   * clássico assume independência de contexto, e essa premissa é
   * violada com frequência e gravidade — além de a tarefa aqui ser
   * sequencial e a taxa de sinais ser alta, o que induz lentidão
   * proativa. O número virou descritivo e verificável:
   * "o perigo precisa aparecer X ms antes do toque para você parar
   * metade das vezes".
   */
  function aborto() {
    const d = U.DB.load();
    const h = (d.aborto || []).slice(-10);
    if (!h.length) return { id: 'aborto', v: null, lo: null, hi: null, n: 0,
                            nivel: 'insuficiente', ...MEDIDAS.aborto };
    const bons = h.filter(x => x.valido);
    const usar = bons.length ? bons : h;
    const vals = usar.map(x => x.antecedencia);
    const ic = vals.length >= 3 ? S.mediaIC(vals) : { v: U.mean(vals), lo: null, hi: null };
    const nTotal = usar.reduce((s, x) => s + x.nParada, 0);
    return {
      id: 'aborto', v: Math.round(ic.v), lo: ic.lo != null ? Math.round(ic.lo) : null,
      hi: ic.hi != null ? Math.round(ic.hi) : null,
      n: nTotal, sets: usar.length, nivel: S.nivelDado(nTotal, 'proporcao'),
      valido: bons.length > 0, ultimo: h[h.length - 1],
      ...MEDIDAS.aborto,
    };
  }

  /** RETENÇÃO — condição de referência, sem ajuda, ≥20h depois. */
  function retencao() {
    const a = filtrar({ k: 'rota', dias: 60 }).filter(x => x.ret);
    const w = S.wilson(a.filter(x => x.ok).length, a.length);
    const porSessao = agrupaProporcao(a);
    return {
      id: 'retencao', v: a.length ? +(w.p * 100).toFixed(0) : null,
      lo: a.length ? +(w.lo * 100).toFixed(0) : null,
      hi: a.length ? +(w.hi * 100).toFixed(0) : null,
      n: a.length, nivel: w.nivel, sessoes: porSessao.length,
      tendencia: S.inclinacao(porSessao.map(x => x.p)).direcao,
      serie: porSessao,
      ...MEDIDAS.retencao,
    };
  }

  /** CUSTO DA DECISÃO — derivada, exige muito mais dados. */
  /* ============================================================
     VISÃO DE MAPA — a janela de memória, em SEGUNDOS

     O exercício de mapa sorteia de propósito o tempo entre o sinal
     e a pergunta. Isso dá, para cada tempo, uma taxa de acerto — e
     um conjunto de pares (tempo, acerto) é exatamente a entrada do
     ajuste psicométrico que já existe neste arquivo para outra
     coisa. A curva desce em vez de subir, o que não muda nada: o
     ajuste procura onde ela cruza uma taxa alvo.

     O resultado é a única frase que importa aqui: POR QUANTOS
     SEGUNDOS a informação do mapa sobrevive na sua cabeça. Um "%
     de acerto" não responde isso, porque mistura tentativas de 2
     segundos com tentativas de 10.

     Por que o segundo inteiro e não o meio segundo: os tempos
     exatos mudam com a dificuldade, então agrupar pelo valor cru
     faria dezenas de níveis com duas tentativas cada — e o ajuste
     exige níveis com amostra, não níveis.
     ============================================================ */
  function visaoMapa({ dias = 0, drill = null } = {}) {
    const t = filtrar({ k: 'mapa', dias, drill }).filter(x => x.x && x.x.ret != null);
    const base = { id: 'visaoMapa', n: t.length };
    if (!t.length) return { ...base, ok: false, motivo: 'Nenhum bloco de visão de mapa ainda.', falta: 60 };

    /* agregados que existem com qualquer amostra */
    const erros = t.filter(x => x.x.e != null).map(x => x.x.e);
    const porZona = {}, porObjetivo = {};
    for (const x of t) {
      if (x.x.z) {
        const e = porZona[x.x.z] || (porZona[x.x.z] = { ok: 0, n: 0 });
        e.n++; e.ok += x.x.zo ? 1 : 0;
      }
      if (x.x.o) {
        const e = porObjetivo[x.x.o] || (porObjetivo[x.x.o] = { ok: 0, n: 0 });
        e.n++; e.ok += x.x.zo ? 1 : 0;
      }
    }
    const agreg = {
      erro: erros.length ? U.median(erros) : null,
      zona: t.filter(x => x.x.zo).length / t.length,
      leitura: t.filter(x => x.x.lo).length / t.length,
      porZona, porObjetivo,
      pontos: (() => {
        const cx = {};
        for (const x of t) {
          const s = Math.max(1, Math.round(x.x.ret / 1000));
          const e = cx[s] || (cx[s] = { x: s, k: 0, n: 0 });
          e.n++; e.k += x.x.zo ? 1 : 0;
        }
        return Object.values(cx).sort((a, b) => a.x - b.x).map(p => ({ ...p, acc: p.k / p.n }));
      })(),
    };

    const fit = S.ajustePsicometrico(agreg.pontos);
    if (!fit.ok) {
      return { ...base, ...agreg, ok: false, fit,
               motivo: `Para a janela de memória existir eu preciso de ${fit.motivo}. Ela é um ajuste sobre acerto × tempo de espera, e não uma média — por isso exige espalhamento e não só volume.` };
    }

    /* ------------------------------------------------------------
       NENHUMA JANELA PODE SAIR DE FORA DO QUE FOI TESTADO.

       O ajuste é uma curva contínua e responde qualquer pergunta que
       eu fizer, inclusive as que os dados não sustentam: com esperas
       de 2 a 10 segundos ele devolve alegremente onde você cruzaria
       70% aos -0,1 s ou aos 40 s. Os dois são invenção — o primeiro
       nem existe como grandeza.

       Então uma janela só é relatada se ela cair ENTRE a espera mais
       curta e a mais longa que você de fato treinou. Fora disso o
       painel diz o que sabe: que você já está abaixo (ou ainda
       acima) daquela taxa na ponta que foi testada. Isso não é menos
       informação que um número — é a informação que existe.
       ------------------------------------------------------------ */
    const xs = agreg.pontos.map(p => p.x);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const teto = 1 - fit.lambda;

    const janela = (v, alvo) => {
      if (teto < alvo) {
        return { v: null, estado: 'teto',
                 txt: `Mesmo na espera mais curta que você treinou (${xMin} s) o seu acerto não chega a ${Math.round(alvo * 100)}% — o teto da sua curva está em ${Math.round(teto * 100)}%. Isso não é memória curta, é sinal que não chegou a entrar.` };
      }
      if (v == null || !isFinite(v)) return { v: null, estado: 'semCruzamento', txt: null };
      if (v < xMin) {
        return { v: null, estado: 'abaixo',
                 txt: `Você já está abaixo de ${Math.round(alvo * 100)}% na espera mais curta que treinou (${xMin} s).` };
      }
      if (v > xMax) {
        return { v: null, estado: 'acima',
                 txt: `Na espera mais longa que você treinou (${xMax} s) ainda está acima de ${Math.round(alvo * 100)}% — a janela real é maior que isso, e para medi-la eu preciso de esperas mais longas (sobe a dificuldade).` };
      }
      return { v, estado: 'ok', txt: null };
    };

    const j90 = janela(fit.consistente, 0.90);
    const j70 = janela(fit.oscila, 0.70);
    const j50 = janela(fit.quebra, 0.50);

    return {
      ...base, ...agreg, ok: true, fit, teto, xMin, xMax,
      j90, j70, j50,
      janela90: j90.v, janela70: j70.v, janela50: j50.v,
      niveis: fit.niveis,
    };
  }

  /* ============================================================
     MIRA — erro angular, em graus

     O número principal é a MEDIANA DO ERRO ABSOLUTO: metade dos seus
     tiros erra menos que isso. Mediana e não média porque um tiro
     solto em pânico a 170° de distância não deve mover a medida do
     resto — e move muito, numa média.

     O viés por setor usa o erro COM SINAL. É a diferença entre
     imprecisão e desvio: erro grande com sinal alternado é tremor,
     erro grande com sinal constante é a mão pivotando sempre para o
     mesmo lado — e só o segundo dá para corrigir de propósito.

     Um setor só vira achado com 5 tiros e desvio de pelo menos 6°.
     Abaixo disso a mediana de três tiros diria qualquer coisa.
     ============================================================ */
  function mira({ dias = 60 } = {}) {
    const t = filtrar({ k: 'mira', dias }).filter(x => x.x && x.x.e != null);
    const base = { id: 'mira', n: t.length };
    if (t.length < S.MIN.tempo.explorar) {
      return { ...base, ok: false, falta: S.MIN.tempo.explorar - t.length,
               motivo: `Faltam ${S.MIN.tempo.explorar - t.length} tiros para a primeira estimativa.` };
    }
    const erros = t.map(x => x.x.e);
    const b = S.bootMediana(erros);

    const porSetor = {};
    for (const x of t) {
      const st = x.x.st; if (!st) continue;
      const e = porSetor[st] || (porSetor[st] = { difs: [], n: 0, ok: 0 });
      e.difs.push(x.x.d); e.n++; e.ok += x.ok ? 1 : 0;
    }
    for (const k in porSetor) {
      const e = porSetor[k];
      e.vies = U.median(e.difs);
      e.erro = U.median(e.difs.map(Math.abs));
      e.nome = (U.E.MIRA.SETORES.find(s => s.id === k) || {}).nome || k;
    }
    const sistem = Object.entries(porSetor)
      .filter(([, e]) => e.n >= 5 && Math.abs(e.vies) >= 6)
      .sort((a, b2) => Math.abs(b2[1].vies) - Math.abs(a[1].vies));

    /* uma série por dia, para tendência sobre pontos independentes */
    const porDia = {};
    for (const x of t) {
      const d0 = new Date(x.t).setHours(0, 0, 0, 0);
      (porDia[d0] || (porDia[d0] = [])).push(x.x.e);
    }
    const dias_ = Object.keys(porDia).sort();

    return {
      ...base, ok: true, v: b.v, lo: b.lo, hi: b.hi,
      dentro: t.filter(x => x.ok).length / t.length,
      /* ver o comentário em motor-mira.js: o desvio da mão inteira é o
         que cabe numa amostra pequena, e só é afirmado quando o
         intervalo da mediana não inclui o zero */
      ...(() => {
        const bg = S.bootMediana(t.map(x => x.x.d));
        return { viesGeral: bg.v, viesLo: bg.lo, viesHi: bg.hi,
                 viesReal: bg.lo > 0 || bg.hi < 0 };
      })(),
      parado: (() => { const a = t.filter(x => !x.x.mv).map(x => x.x.e); return a.length >= 6 ? U.median(a) : null; })(),
      movel: (() => { const a = t.filter(x => x.x.mv).map(x => x.x.e); return a.length >= 6 ? U.median(a) : null; })(),
      porSetor,
      sistematico: sistem.length ? { setor: sistem[0][0], ...sistem[0][1] } : null,
      dias: dias_.length,
      serie: dias_.map(k => ({ t: +k, v: U.median(porDia[k]), n: porDia[k].length })),
      nivel: S.nivelDado(dias_.length, 'tempo'),
    };
  }

  function custoDecisao() {
    const iso = filtrar({ k: 'rota', dias: 45, ref: true });
    const jun = filtrar({ k: 'integra', dias: 45 });
    const base = { id: 'custoDecisao', ...DERIVADAS.custoDecisao };
    if (iso.length < S.MIN.diferenca.explorar || jun.length < S.MIN.diferenca.explorar) {
      return { ...base, v: null, lo: null, hi: null, n: Math.min(iso.length, jun.length), nivel: 'insuficiente' };
    }
    const dif = S.difProporcoes(iso.filter(x => x.ok).length, iso.length,
                                jun.filter(x => x.ok).length, jun.length);
    return {
      ...base,
      v: +(dif.dif * 100).toFixed(0), lo: +(dif.lo * 100).toFixed(0), hi: +(dif.hi * 100).toFixed(0),
      n: Math.min(iso.length, jun.length), distinguivel: dif.distinguivel,
      nivel: S.nivelDado(Math.min(iso.length, jun.length), 'diferenca'),
    };
  }

  function agrupaProporcao(a) {
    const por = {};
    for (const x of a) {
      const dia = new Date(x.t).setHours(0, 0, 0, 0);
      const e = por[dia] || (por[dia] = { k: 0, n: 0, t: dia });
      e.k += x.ok; e.n++;
    }
    return Object.values(por).sort((x, y) => x.t - y.t)
      .map(e => ({ t: e.t, p: e.k / e.n, n: e.n }));
  }

  /** Painel completo — sempre com o nível de dado junto. */
  function painel() {
    return {
      execucao: execucao(), estabilidade: estabilidade(), leitura: leitura(),
      aborto: aborto(), retencao: retencao(), custoDecisao: custoDecisao(),
    };
  }

  /* ============================================================
     CLASSIFICAÇÃO DE ERRO
     Cinco categorias, não nove. As quatro que saíram ou nunca
     disparavam ou não distinguiam nada acionável.
     ============================================================ */
  const ERROS = {
    layout: {
      nome: 'Layout', cor: 'critico',
      o_que: 'O toque caiu num botão colado no pretendido.',
      acao: 'Isso é HUD, não habilidade. Passando de 35% dos erros, o sistema manda você para a aba HUD em vez de treinar.',
    },
    sequencia: {
      nome: 'Sequência', cor: 'serie1',
      o_que: 'Botão errado e longe do pretendido: a ordem ainda não está gravada.',
      acao: 'Rota mais curta e ritmo marcado. Acelerar agora multiplica o erro.',
    },
    reset: {
      nome: 'Perdeu o reset', cor: 'atencao',
      o_que: 'O espelho quebrou e a 1 e a 2 voltaram, mas você não soltou nenhuma a tempo.',
      acao: 'Deixe o polegar já em cima da 1 quando as marcas estiverem as duas no alvo. O reset não espera: a luta segue sem ele.',
    },
    recarga: {
      nome: 'Passiva travada', cor: 'serie1',
      o_que: 'Você apertou a 1 ou a 2 com a passiva travada — nada quebrou, a habilidade estava em recarga, o toque foi perdido.',
      acao: 'Nos 5 s depois de uma quebra não existe reset. Olhe o botão P antes de decidir: a trava está desenhada nele.',
    },
    posicao: {
      nome: 'Lugar', cor: 'serie1',
      o_que: 'Você leu o sinal certo mas apontou na área errada do mapa.',
      acao: 'A parte semântica ficou e a espacial não. Baixe a retenção (dificuldade) antes de treinar mais tempo de espera: o que falta é codificar, não segurar.',
    },
    sentido: {
      nome: 'Sentido', cor: 'atencao',
      o_que: 'Você lembrou o lugar e errou o que ele queria dizer.',
      acao: 'O mapa está entrando; a leitura das cinco cores ainda não está automática. Este é o erro que some mais rápido, porque é regra e não memória.',
    },
    perdeu: {
      nome: 'Não ficou nada', cor: 'critico',
      o_que: 'Nem o lugar nem a leitura sobreviveram até a pergunta.',
      acao: 'Ou o sinal piscou rápido demais para você, ou a espera foi longa demais. Se isso domina o set, a dificuldade desce.',
    },
    pressa: {
      nome: 'Pressa', cor: 'atencao',
      o_que: 'Erro logo depois de um intervalo mais curto que o seu próprio ritmo estável.',
      acao: 'O controlador devolve o tempo sozinho. Pressa não é velocidade.',
    },
    lento: {
      nome: 'Fora do tempo', cor: 'serie3',
      o_que: 'A sequência saiu certa, mas fora do limite.',
      acao: 'Não é erro de mão: é o limiar apertado demais. O controlador afrouxa.',
    },
    leitura: {
      nome: 'Leitura', cor: 'serie2',
      o_que: 'A execução estava certa; a escolha não.',
      acao: 'Trabalho de antecipação e prioridade, não de dedo.',
    },
    freio: {
      nome: 'Freio', cor: 'serio',
      o_que: 'Continuou a jogada depois do sinal de perigo.',
      acao: 'A habilidade mais rara e a que mais custa vida em partida.',
    },
    movimento: {
      nome: 'Parado', cor: 'serie4',
      o_que: 'Executou sem manter a direção pedida.',
      acao: 'Só aparece no exercício Andando. Combo parado é combo morto.',
    },
  };

  /** Composição dos erros, com IC em cada fatia. */
  function perfilErros({ dias = 21 } = {}) {
    const a = filtrar({ dias }).filter(x => !x.ok && x.err);
    const total = a.length;
    if (!total) return { total: 0, itens: [], nivel: 'insuficiente' };
    const por = {};
    for (const x of a) por[x.err] = (por[x.err] || 0) + 1;
    const itens = Object.entries(por).map(([id, k]) => {
      const w = S.wilson(k, total);
      return { id, n: k, p: w.p, lo: w.lo, hi: w.hi, ...(ERROS[id] || { nome: id }) };
    }).sort((x, y) => y.n - x.n);
    return { total, itens, nivel: S.nivelDado(total, 'proporcao') };
  }

  /* ============================================================
     FADIGA
     Marcador: crescimento da variabilidade intraindividual do tempo
     ao longo da sessão. É mais sensível que média do tempo ou taxa
     de erro, que é o que a V1 (não) olhava.
     Isto é uma estimativa de qualidade de treino, não um diagnóstico.
     ============================================================ */
  function fadiga(sessaoId) {
    const d = U.DB.load();
    const id = sessaoId || (d.sessaoAtual && d.sessaoAtual.id);
    if (!id) return { estado: 'sem_dados' };
    const a = tentativas().filter(x => x.s === id && x.tot && x.ok);
    if (a.length < 16) return { estado: 'sem_dados', n: a.length,
                                falta: 16 - a.length };
    const dv = S.derivaVariabilidade(a.map(x => x.tot));
    if (!dv.ok) return { estado: 'sem_dados', n: a.length };

    const todas = tentativas().filter(x => x.s === id);
    const k = Math.floor(todas.length / 3);
    const accIni = todas.slice(0, k).filter(x => x.ok).length / Math.max(1, k);
    const accFim = todas.slice(-k).filter(x => x.ok).length / Math.max(1, k);
    const queda = accIni - accFim;

    /* Uma razão alta entre dois coeficientes minúsculos não é fadiga: é ruído.
       Exigir um piso absoluto de irregularidade no fim evita o falso positivo. */
    /* Três sinais independentes. Um sozinho pode ser ruído ou dificuldade alta
       demais; dois juntos é o padrão de fadiga.
       Detalhe que a primeira versão errou: quanto pior a fadiga, mais ele erra,
       e menos tentativas sobram com tempo válido para medir variabilidade —
       ou seja, o sinal mais sensível some justo quando mais importa. Por isso
       os três pesam igual em vez de a variabilidade ser pré-requisito. */
    const variouMais = dv.razao >= 1.25 && dv.cvFim >= 0.06;
    const maisLento = dv.lentidao >= 0.10;
    const errouMais = queda >= 0.12;
    const sinais = [
      variouMais && `o ritmo ficou ${Math.round((dv.razao - 1) * 100)}% mais irregular`,
      maisLento && `você ficou ${Math.round(dv.lentidao * 100)}% mais lento`,
      errouMais && `o acerto caiu ${Math.round(queda * 100)} pontos`,
    ].filter(Boolean);

    let estado = 'ok', txt = 'Desempenho estável do começo ao fim da sessão.';
    if (sinais.length >= 2) {
      estado = 'alta';
      txt = `Do primeiro para o último terço da sessão, ${sinais.join(' e ')}. ` +
            'Treinar mais agora produz repetição de baixa qualidade — e repetição de baixa qualidade não é neutra: ela grava o padrão pior.';
    } else if (sinais.length === 1) {
      estado = 'moderada';
      txt = `Um sinal só: ${sinais[0]}. Pode ser cansaço ou dificuldade alta demais — ` +
            'com um sinal isolado não dá para separar os dois. Dá para continuar num exercício mais leve.';
    }
    return { estado, txt, razao: dv.razao, queda, lentidao: dv.lentidao, n: a.length };
  }

  U.MD = {
    REF, MEDIDAS, DERIVADAS, ERROS,
    gravar, filtrar, tentativas,
    execucao, estabilidade, leitura, curvaLeitura, aborto, retencao, custoDecisao, visaoMapa, mira,
    painel, perfilErros, fadiga,
  };

})(window.U);
