/* ============================================================
   evolucao.js — separar o que você é do que o dia foi
   ------------------------------------------------------------
   A V3 media mudança com remendos: encolhimento para não pular,
   correção de autocorrelação para não contar ponto repetido,
   piso absoluto para não chamar um ponto de notícia. Cada remendo
   consertava um sintoma verdadeiro. Juntos, eram três aproximações
   do MESMO problema — o valor que interessa (o seu nível) nunca é
   observado, só medido com ruído.

   Aqui isso vira um modelo explícito:

       nivel[t] = nivel[t-1] + deriva[t-1] + ruído de processo
       medida[t] = nivel[t] + ruído de medida

   Um filtro linear estima os dois estados e, mais importante, a
   INCERTEZA de cada um. A razão entre o ruído de processo e o de
   medida é estimada dos seus próprios dados por máxima
   verossimilhança, não arbitrada. Daí saem de graça três coisas
   que antes eram remendo:

   · o nível de hoje já vem suavizado na medida certa — nada de
     encolher "na mão" com um k escolhido a dedo;
   · a deriva tem intervalo, então "está subindo" vira uma
     afirmação com incerteza em vez de um rótulo;
   · a previsão de amanhã tem faixa, e faixa é o que permite dizer
     "isto aqui é fora da curva" sem inventar.

   O que continua valendo da V3: nada vira veredicto por um ponto,
   e mudança menor que o piso da régua não é notícia.
   ============================================================ */
'use strict';
(function (U) {

  const S = U.S;
  const MIN_PONTOS = 8;

  /* ============================================================
     FILTRO DE NÍVEL LOCAL COM DERIVA
     ============================================================ */

  /**
   * @param y      série observada
   * @param q      variância do ruído de processo, relativa à de medida
   * @param qd     variância da deriva, relativa à de medida
   * Devolve nível e deriva filtrados e suavizados, com variâncias.
   */
  function filtrar(y, q, qd) {
    const n = y.length;
    const r = 1;                                  // ruído de medida = 1 (escala relativa)
    /* estado [nivel, deriva]; P = covariância */
    let x = [y[0], 0];
    let P = [[1e4, 0], [0, 1e2]];
    const xf = [], Pf = [], xp = [], Pp = [];
    let logL = 0;
    for (let t = 0; t < n; t++) {
      /* previsão */
      const xm = [x[0] + x[1], x[1]];
      const Pm = [
        [P[0][0] + 2 * P[0][1] + P[1][1] + q, P[0][1] + P[1][1]],
        [P[0][1] + P[1][1], P[1][1] + qd],
      ];
      xp.push(xm.slice()); Pp.push([Pm[0].slice(), Pm[1].slice()]);
      /* atualização com a observação */
      const v = y[t] - xm[0];
      const F = Pm[0][0] + r;
      if (t > 1) logL += -0.5 * (Math.log(2 * Math.PI * F) + v * v / F);
      const K = [Pm[0][0] / F, Pm[0][1] / F];
      x = [xm[0] + K[0] * v, xm[1] + K[1] * v];
      P = [
        [Pm[0][0] - K[0] * Pm[0][0], Pm[0][1] - K[0] * Pm[0][1]],
        [Pm[1][0] - K[1] * Pm[0][0], Pm[1][1] - K[1] * Pm[0][1]],
      ];
      xf.push(x.slice()); Pf.push([P[0].slice(), P[1].slice()]);
    }
    return { xf, Pf, xp, Pp, logL };
  }

  /** Suavizador: usa o futuro para reestimar o passado. */
  function suavizar(y, q, qd) {
    const f = filtrar(y, q, qd);
    const n = y.length;
    const xs = f.xf.map(v => v.slice());
    const Ps = f.Pf.map(m => [m[0].slice(), m[1].slice()]);
    for (let t = n - 2; t >= 0; t--) {
      const Pm = f.Pp[t + 1];
      const det = Pm[0][0] * Pm[1][1] - Pm[0][1] * Pm[1][0];
      if (Math.abs(det) < 1e-12) continue;
      const inv = [[Pm[1][1] / det, -Pm[0][1] / det], [-Pm[1][0] / det, Pm[0][0] / det]];
      /* A = P_t · F' · inv(Pm),  F' = [[1,0],[1,1]] */
      const Pt = f.Pf[t];
      const PF = [[Pt[0][0] + Pt[0][1], Pt[0][1]], [Pt[1][0] + Pt[1][1], Pt[1][1]]];
      const A = [
        [PF[0][0] * inv[0][0] + PF[0][1] * inv[1][0], PF[0][0] * inv[0][1] + PF[0][1] * inv[1][1]],
        [PF[1][0] * inv[0][0] + PF[1][1] * inv[1][0], PF[1][0] * inv[0][1] + PF[1][1] * inv[1][1]],
      ];
      const d = [xs[t + 1][0] - f.xp[t + 1][0], xs[t + 1][1] - f.xp[t + 1][1]];
      xs[t] = [f.xf[t][0] + A[0][0] * d[0] + A[0][1] * d[1],
               f.xf[t][1] + A[1][0] * d[0] + A[1][1] * d[1]];
      const dP = [[Ps[t + 1][0][0] - Pm[0][0], Ps[t + 1][0][1] - Pm[0][1]],
                  [Ps[t + 1][1][0] - Pm[1][0], Ps[t + 1][1][1] - Pm[1][1]]];
      const AD = [
        [A[0][0] * dP[0][0] + A[0][1] * dP[1][0], A[0][0] * dP[0][1] + A[0][1] * dP[1][1]],
        [A[1][0] * dP[0][0] + A[1][1] * dP[1][0], A[1][0] * dP[0][1] + A[1][1] * dP[1][1]],
      ];
      Ps[t] = [
        [f.Pf[t][0][0] + AD[0][0] * A[0][0] + AD[0][1] * A[0][1],
         f.Pf[t][0][1] + AD[0][0] * A[1][0] + AD[0][1] * A[1][1]],
        [f.Pf[t][1][0] + AD[1][0] * A[0][0] + AD[1][1] * A[0][1],
         f.Pf[t][1][1] + AD[1][0] * A[1][0] + AD[1][1] * A[1][1]],
      ];
    }
    return { xs, Ps, ...f };
  }

  /**
   * Ajusta q e qd por verossimilhança, em grade logarítmica.
   * Grade e não otimizador contínuo de propósito: a superfície é
   * plana perto do ótimo e um otimizador bom demais acha um
   * "mínimo" que só existe naquela amostra.
   */
  function ajustar(serie) {
    const n = serie.length;
    if (n < MIN_PONTOS) return { ok: false, n, falta: MIN_PONTOS - n };
    const m = U.mean(serie), sd = U.sd(serie) || 1;
    const y = serie.map(v => (v - m) / sd);              // padroniza
    /* A grade de q precisa chegar longe. Ela parava em 1,2, e com isso
       uma medida MUITO sensível — em que o nível se mexe bem mais que o
       ruído de leitura — ficava presa no teto e era classificada como
       quase toda ruído. É o erro oposto do que este arquivo existe para
       evitar, e igualmente falso: subestimar quanto a medida enxerga. */
    /* Escolha COM PENALIDADE, não por verossimilhança pura.
       Com vinte pontos a superfície é quase plana, e o máximo puro pegava
       um q grande em série de puro ruído — o filtro passava a perseguir o
       ruído e declarava que 40% dele era nível. Cada variância que sai de
       zero é um parâmetro a mais, e paga o preço de um parâmetro a mais.
       O efeito prático é o certo: na dúvida, o modelo fica simples e a
       medida é declarada pouco sensível em vez de muito. */
    let melhor = { score: -Infinity, logL: -Infinity, q: 0.002, qd: 0 };
    for (const q of [0, 0.002, 0.01, 0.03, 0.08, 0.2, 0.5, 1.2, 3, 8, 20, 60])
      for (const qd of [0, 0.0005, 0.002, 0.008, 0.03, 0.12]) {
        if (q === 0 && qd === 0) continue;
        const f = filtrar(y, q, qd);
        if (!isFinite(f.logL)) continue;
        const k = (q > 0 ? 1 : 0) + (qd > 0 ? 1 : 0);
        const score = f.logL - 0.5 * k * Math.log(n);
        if (score > melhor.score) melhor = { score, logL: f.logL, q, qd };
      }
    const sm = suavizar(y, melhor.q, melhor.qd);
    const ult = sm.xf[n - 1], ultP = sm.Pf[n - 1];

    /* de volta para a escala original */
    const nivel = ult[0] * sd + m;
    const nivelSE = Math.sqrt(Math.max(0, ultP[0][0])) * sd;
    const deriva = ult[1] * sd;                          // por ponto
    const derivaSE = Math.sqrt(Math.max(0, ultP[1][1])) * sd;

    return {
      ok: true, n, q: melhor.q, qd: melhor.qd, logL: melhor.logL,
      nivel, nivelSE, nivelLo: nivel - 1.96 * nivelSE, nivelHi: nivel + 1.96 * nivelSE,
      deriva, derivaSE, derivaLo: deriva - 1.96 * derivaSE, derivaHi: deriva + 1.96 * derivaSE,
      /* o sinal da deriva só vale quando o intervalo não cruza zero */
      subindo: deriva - 1.96 * derivaSE > 0,
      descendo: deriva + 1.96 * derivaSE < 0,
      suave: sm.xs.map(v => v[0] * sd + m),
      derivaSerie: sm.xs.map(v => v[1] * sd),
      banda: sm.Ps.map(p => Math.sqrt(Math.max(0, p[0][0])) * sd * 1.96),
      /* MÉTRICA REMOVIDA: "quanto do que você vê é você e quanto é o dia".
         Ela existia aqui, em três versões diferentes, e nenhuma se
         sustentou. A decomposição entre ruído de nível e ruído de medida
         é a parte menos identificável deste modelo: com 20 pontos o
         número pulava de 3% para 40% na mesma série, e com 60 pontos uma
         caminhada aleatória e um ruído branco davam os dois 19%.
         O q continua sendo estimado, porque é ele que faz a suavização
         funcionar. O que saiu foi a FRASE sobre ele — número que não
         separa dois casos opostos não é medida, é enfeite com casa
         decimal. No lugar entrou `sessoesParaDetectar`, que responde a
         pergunta útil de verdade e sai direto do erro da deriva. */
      sinalRuido: melhor.q,
      /**
       * Com o ruído que esta medida tem HOJE, quantas sessões até uma
       * melhora de `porSessao` conseguir se separar de zero?
       * O erro da deriva cai com n elevado a 1,5 numa série assim, então
       * dá para projetar quantos pontos faltam.
       */
      sessoesParaDetectar: (porSessao) => {
        if (!(Math.abs(porSessao) > 0) || !(derivaSE > 0)) return null;
        const alvo = Math.abs(porSessao) / 1.96;
        if (derivaSE <= alvo) return 0;
        const k = Math.pow(derivaSE / alvo, 1 / 1.5);
        return Math.max(0, Math.ceil(n * k - n));
      },
      escala: { m, sd },
      prever: (k = 1) => ({
        v: (ult[0] + k * ult[1]) * sd + m,
        se: Math.sqrt(Math.max(0, ultP[0][0] + k * k * ultP[1][1] + melhor.q * k + 1)) * sd,
      }),
    };
  }

  /* ============================================================
     PONTOS DE MUDANÇA — quando alguma coisa mudou
     ------------------------------------------------------------
     Segmentação binária com penalidade por complexidade. Responde
     "no dia 14 alguma coisa aconteceu", que é diferente de "está
     subindo": um é evento, o outro é processo, e o sistema
     precisava dos dois para explicar uma queda.
     ============================================================ */
  function custoSeg(y, i, j) {
    const n = j - i;
    if (n < 2) return 0;
    let s = 0, s2 = 0;
    for (let k = i; k < j; k++) { s += y[k]; s2 += y[k] * y[k]; }
    const v = Math.max(1e-9, s2 / n - (s / n) ** 2);
    return n * Math.log(v);
  }

  function pontosDeMudanca(serie, { minSeg = 5, penal = null } = {}) {
    const n = serie.length;
    if (n < 2 * minSeg + 2) return { ok: false, n, falta: 2 * minSeg + 2 - n, pontos: [] };
    const y = serie.slice();
    /* Penalidade. BIC simples (3·ln n) deixava passar um degrau inventado
       em 11% das séries sem degrau nenhum — alto demais para uma tela que
       vai dizer "no dia tal alguma coisa aconteceu". O fator maior é
       escolha declarada: prefiro perder degrau pequeno a apontar dia que
       não teve nada. */
    const pen = penal != null ? penal : 5 * Math.log(n);
    const achados = [];

    const buscar = (i, j) => {
      if (j - i < 2 * minSeg) return;
      const base = custoSeg(y, i, j);
      let melhor = null, ganhoMax = 0;
      for (let k = i + minSeg; k <= j - minSeg; k++) {
        const g = base - (custoSeg(y, i, k) + custoSeg(y, k, j));
        if (g > ganhoMax) { ganhoMax = g; melhor = k; }
      }
      if (melhor != null && ganhoMax > pen) {
        achados.push({ i: melhor, ganho: ganhoMax });
        buscar(i, melhor); buscar(melhor, j);
      }
    };
    buscar(0, n);
    achados.sort((a, b) => a.i - b.i);

    const segs = [];
    let ini = 0;
    for (const a of achados.concat([{ i: n }])) {
      const parte = y.slice(ini, a.i);
      if (parte.length) segs.push({ de: ini, ate: a.i, media: U.mean(parte), n: parte.length });
      ini = a.i;
    }
    for (let i = 1; i < segs.length; i++) segs[i].salto = segs[i].media - segs[i - 1].media;
    return { ok: true, n, pontos: achados, segmentos: segs, penalidade: pen };
  }

  /* ============================================================
     CURVA DE APRENDIZAGEM
     ------------------------------------------------------------
     Desempenho motor melhora com prática segundo uma curva que se
     achata: os primeiros ganhos são grandes e os seguintes cada
     vez menores. Ajustar isso dá duas respostas que uma tendência
     linear nunca dá — onde a sua curva está achatando (o platô
     deste ciclo) e quanto tempo falta para um alvo.
     A forma usada é exponencial rumo a uma assíntota; ela costuma
     descrever curva individual melhor que a lei de potência, que
     descreve bem é MÉDIA de grupo — e média de grupo não é o que
     este sistema mede.
     ============================================================ */
  function curvaAprendizagem(serie, { melhorE = 'maior' } = {}) {
    const n = serie.length;
    if (n < 10) return { ok: false, n, falta: 10 - n };
    const y = melhorE === 'menor' ? serie.map(v => -v) : serie.slice();
    const t = y.map((_, i) => i);
    const y0g = y[0], ymax = Math.max(...y), ymin = Math.min(...y);
    const amp = Math.max(1e-6, ymax - ymin);

    let melhor = { sse: Infinity };
    for (let A = ymax - amp * 0.1; A <= ymax + amp * 1.6; A += amp * 0.12)
      for (let tau = 0.8; tau <= n * 2.5; tau *= 1.35) {
        /* dado A e tau, B sai por mínimos quadrados */
        let sxy = 0, sxx = 0;
        for (let i = 0; i < n; i++) { const e = Math.exp(-t[i] / tau); sxy += e * (A - y[i]); sxx += e * e; }
        if (sxx < 1e-12) continue;
        const B = sxy / sxx;
        let sse = 0;
        for (let i = 0; i < n; i++) { const p = A - B * Math.exp(-t[i] / tau); sse += (y[i] - p) ** 2; }
        if (sse < melhor.sse) melhor = { sse, A, B, tau };
      }
    if (!isFinite(melhor.sse)) return { ok: false, n, motivo: 'não consegui ajustar a curva' };

    const my = U.mean(y);
    const ssTot = y.reduce((s, v) => s + (v - my) ** 2, 0);
    const r2 = ssTot ? 1 - melhor.sse / ssTot : 0;
    const erro = Math.sqrt(melhor.sse / Math.max(1, n - 3));

    /* linear como referência: se a reta descreve igual, a curva não
       acrescenta nada e dizer "platô" seria invenção */
    const lin = S.inclinacao(y, t);
    let sseLin = 0;
    for (let i = 0; i < n; i++) sseLin += (y[i] - (lin.a + lin.b * t[i])) ** 2;
    const melhorQueReta = melhor.sse < sseLin * 0.93;

    const sinal = melhorE === 'menor' ? -1 : 1;
    const plato = sinal * melhor.A;
    const atual = sinal * (melhor.A - melhor.B * Math.exp(-(n - 1) / melhor.tau));
    const restante = Math.abs(plato - atual);
    const faixa = Math.abs(melhor.B);

    return {
      ok: true, n, r2, erro, tau: melhor.tau, plato, atual, restante,
      pctDoPlato: faixa > 1e-9 ? U.clamp(1 - Math.abs(plato - atual) / faixa, 0, 1) : 1,
      melhorQueReta,
      prever: (k) => sinal * (melhor.A - melhor.B * Math.exp(-((n - 1) + k) / melhor.tau)),
      /* quantas sessões até chegar a um valor */
      sessoesAte: (alvo) => {
        const a = sinal * alvo;
        if (melhor.B <= 0) return null;
        const arg = (melhor.A - a) / melhor.B;
        if (arg <= 0) return 0;
        const tt = -melhor.tau * Math.log(arg);
        return tt > n - 1 ? Math.ceil(tt - (n - 1)) : 0;
      },
      leitura: !melhorQueReta
        ? 'A sua curva ainda não achatou o bastante para eu distinguir uma curva de aprendizagem de uma reta. Enquanto for assim, não dá para falar em platô: você ainda está na parte em que cada sessão rende.'
        : (faixa > 1e-9 && (1 - Math.abs(plato - atual) / faixa) > 0.85)
          ? 'Você está perto do platô deste ciclo. Isso não quer dizer que chegou ao seu limite — quer dizer que ESTE exercício, nesta forma, já deu o que tinha para dar. É quando mudar a variável rende mais que repetir.'
          : 'A sua curva ainda está subindo com folga até o platô estimado. Repetir ainda rende.',
    };
  }

  /* ============================================================
     ANÁLISE COMPLETA DE UMA SÉRIE
     ============================================================ */
  function analisar(serie, { melhorE = 'maior', piso = 3 } = {}) {
    const est = ajustar(serie);
    const cp = pontosDeMudanca(serie);
    const cur = curvaAprendizagem(serie, { melhorE });
    if (!est.ok) return { ok: false, motivo: `preciso de ${MIN_PONTOS} pontos (tenho ${serie.length})`, est, cp, cur };

    /* deriva por ponto → deriva na janela inteira */
    const total = est.deriva * (serie.length - 1);
    const totalSE = est.derivaSE * (serie.length - 1);
    const grande = Math.abs(total) >= piso;

    /* DUAS FAIXAS DE EVIDÊNCIA, e "suspeita" é a de baixo.
       A primeira versão disparava suspeita sempre que a deriva estimada
       vezes o número de sessões passasse do piso — sem exigir evidência
       nenhuma de que a deriva não fosse zero. Numa série longa isso é
       quase sempre: multiplicar um número minúsculo por 38 dá um número
       grande. Resultado medido: mais de metade dos eixos de um jogador
       que não mudou nada apareciam com bandeira laranja.
       Agora "suspeita" quer dizer o que o nome diz — há indício, com
       evidência fraca (cerca de um erro-padrão), e ainda não confirmado.
       E ela só vale para PIORA: subida sem confirmação não é suspeita de
       nada, é estabilidade. */
    const marginal = est.derivaSE > 0 && Math.abs(est.deriva) > est.derivaSE;
    const forte = est.subindo || est.descendo;
    const melhorou = melhorE === 'menor' ? est.deriva < 0 : est.deriva > 0;

    let estado;
    if (forte && grande && melhorou) estado = 'evolucao';
    else if (forte && grande && !melhorou) estado = 'queda';
    else if (marginal && grande && !melhorou) estado = 'suspeita';
    else estado = 'estavel';
    const sig = forte;

    return {
      ok: true, est, cp, cur, estado,
      nivel: est.nivel, nivelLo: est.nivelLo, nivelHi: est.nivelHi,
      derivaPorSessao: est.deriva, derivaTotal: total, derivaTotalSE: totalSE,
      significante: sig, grande,
      /* Sensibilidade da medida, dita do jeito que dá para usar: quantas
         sessões até uma melhora de 1 ponto por sessão aparecer. */
      sessoesPara1: est.sessoesParaDetectar(1),
      sessoesPara05: est.sessoesParaDetectar(0.5),
      leituraRuido: (() => {
        const k = est.sessoesParaDetectar(1);
        if (k == null) return 'Ainda não consigo dizer quão sensível é esta medida.';
        if (k === 0) return `Esta medida já está sensível o bastante: com ${est.n} pontos, uma melhora de 1 ponto por sessão já se separa do ruído.`;
        return `Com o ruído que esta medida tem hoje, uma melhora de 1 ponto por sessão só se separa do ruído depois de mais ${k} ${k === 1 ? 'sessão' : 'sessões'}. Não é pessimismo: é o preço de não chamar de evolução o que ainda pode ser o dia.`;
      })(),
    };
  }

  U.EV = { MIN_PONTOS, filtrar, suavizar, ajustar, pontosDeMudanca, curvaAprendizagem, analisar };

})(window.U);
