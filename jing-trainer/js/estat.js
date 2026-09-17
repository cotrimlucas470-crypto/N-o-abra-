/* ============================================================
   estat.js — estimativas COM incerteza
   ------------------------------------------------------------
   Por que este arquivo existe:
   A V1 tratava 12 tentativas como se fossem uma medida. Não são.
   Tarefas cognitivas robustas no nível do grupo produzem medidas
   individuais notoriamente instáveis ("reliability paradox"), e a
   literatura de calibração sugere ordem de ~100 tentativas para
   estimar diferenças individuais com confiabilidade aceitável.
   Pior: ESCORES DE DIFERENÇA (retenção menos treino, solo menos
   dupla tarefa) somam o ruído das duas medidas.

   Consequência de projeto: nada aqui devolve um número solto.
   Tudo devolve {valor, ic:[lo,hi], n, confiavel}. E quando n é
   pequeno o sistema é obrigado a dizer "dados insuficientes"
   em vez de inventar precisão.
   ============================================================ */
'use strict';
(function (U) {

  /* z para 95% e 80%. O intervalo de 80% é usado só em decisões
     internas de dificuldade, onde errar é barato e reversível. */
  const Z95 = 1.959964, Z80 = 1.281552;

  /* t de Student bicaudal 95%, por graus de liberdade. */
  const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262,
               2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101,
               2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060];
  const tCrit = (gl) => gl < 1 ? 12.706 : gl <= 25 ? T95[gl - 1] : gl <= 40 ? 2.021 : gl <= 80 ? 2.000 : 1.984;

  /* ------------------------------------------------------------
     Tamanhos mínimos de amostra.
     Não são números redondos escolhidos por estética: vêm de quanta
     largura de intervalo ainda permite DECIDIR alguma coisa.
     Uma proporção perto de 0,85 com n=12 tem IC de ~±20 pontos —
     larga demais para distinguir 0,75 de 0,95, que são exatamente
     as duas situações que pedem ações opostas.
     ------------------------------------------------------------ */
  const MIN = {
    proporcao: { explorar: 10, decidir: 25, confiavel: 60 },
    tempo:     { explorar: 8,  decidir: 20, confiavel: 45 },
    diferenca: { explorar: 20, decidir: 50, confiavel: 120 },
  };

  /** Rótulo honesto do quanto dá para afirmar com este n. */
  function nivelDado(n, tipo = 'proporcao') {
    const m = MIN[tipo] || MIN.proporcao;
    if (n < m.explorar) return 'insuficiente';
    if (n < m.decidir)  return 'provisorio';
    if (n < m.confiavel) return 'razoavel';
    return 'firme';
  }
  const podeDecidir = (n, tipo) => n >= (MIN[tipo] || MIN.proporcao).decidir;

  /* ------------------------------------------------------------
     Proporções — intervalo de Wilson.
     Escolhido em vez do intervalo normal porque não estoura para
     fora de [0,1] e não colapsa para largura zero quando o jogador
     acerta tudo (que é justamente quando o sistema mais erraria ao
     concluir "dominado").
     ------------------------------------------------------------ */
  function wilson(k, n, z = Z95) {
    if (!n) return { p: 0, lo: 0, hi: 1, n: 0, largura: 1, nivel: 'insuficiente' };
    const p = k / n, z2 = z * z;
    const den = 1 + z2 / n;
    const centro = (p + z2 / (2 * n)) / den;
    const margem = (z / den) * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n));
    const lo = Math.max(0, centro - margem), hi = Math.min(1, centro + margem);
    return { p, lo, hi, n, largura: hi - lo, nivel: nivelDado(n, 'proporcao') };
  }

  /** Duas proporções são distinguíveis? (Newcombe, via Wilson) */
  function difProporcoes(k1, n1, k2, n2) {
    if (!n1 || !n2) return { dif: 0, lo: -1, hi: 1, distinguivel: false, n: Math.min(n1, n2) };
    const a = wilson(k1, n1), b = wilson(k2, n2);
    const dif = a.p - b.p;
    const lo = dif - Math.sqrt((a.p - a.lo) ** 2 + (b.hi - b.p) ** 2);
    const hi = dif + Math.sqrt((a.hi - a.p) ** 2 + (b.p - b.lo) ** 2);
    return { dif, lo, hi, distinguivel: lo > 0 || hi < 0, n: Math.min(n1, n2) };
  }

  /* ------------------------------------------------------------
     Tempos — mediana com IC por reamostragem.
     Mediana e não média porque um único toque atrasado (celular
     escorregou, notificação) desloca a média e não a mediana.
     ------------------------------------------------------------ */
  function bootMediana(arr, B = 400) {
    const n = arr.length;
    if (!n) return { v: null, lo: null, hi: null, n: 0, nivel: 'insuficiente' };
    if (n < 3) return { v: U.median(arr), lo: null, hi: null, n, nivel: 'insuficiente' };
    const meds = new Array(B);
    for (let b = 0; b < B; b++) {
      const s = new Array(n);
      for (let i = 0; i < n; i++) s[i] = arr[(Math.random() * n) | 0];
      s.sort((x, y) => x - y);
      const m = n >> 1;
      meds[b] = n % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }
    meds.sort((a, b) => a - b);
    return {
      v: U.median(arr),
      lo: meds[Math.floor(B * 0.025)],
      hi: meds[Math.floor(B * 0.975)],
      n, nivel: nivelDado(n, 'tempo'),
    };
  }

  function mediaIC(arr) {
    const n = arr.length;
    if (n < 2) return { v: n ? arr[0] : null, lo: null, hi: null, n, nivel: 'insuficiente' };
    const m = U.mean(arr), s = U.sd(arr), se = s / Math.sqrt(n), t = tCrit(n - 1);
    return { v: m, lo: m - t * se, hi: m + t * se, n, sd: s, nivel: nivelDado(n, 'tempo') };
  }

  /* ------------------------------------------------------------
     Tendência — inclinação de uma reta com IC.
     Usada para responder "está melhorando?" sem cair na armadilha
     de comparar as duas últimas sessões (diferença de duas medidas
     ruidosas é ruído ao quadrado).
     ------------------------------------------------------------ */
  function inclinacao(ys, xs) {
    const n = ys.length;
    if (n < 4) return { b: 0, lo: null, hi: null, n, direcao: 'indefinida' };
    const X = xs || ys.map((_, i) => i);
    const mx = U.mean(X), my = U.mean(ys);
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (X[i] - mx) * (ys[i] - my); sxx += (X[i] - mx) ** 2; }
    if (!sxx) return { b: 0, lo: null, hi: null, n, direcao: 'indefinida' };
    const b = sxy / sxx, a = my - b * mx;
    let sse = 0;
    for (let i = 0; i < n; i++) sse += (ys[i] - (a + b * X[i])) ** 2;
    const se = Math.sqrt(sse / (n - 2) / sxx), t = tCrit(n - 2);
    const lo = b - t * se, hi = b + t * se;
    return { b, a, lo, hi, n, direcao: lo > 0 ? 'sobe' : hi < 0 ? 'desce' : 'estavel' };
  }

  /* ------------------------------------------------------------
     Variabilidade intraindividual.
     O coeficiente de variação do tempo de resposta cresce com o
     tempo de tarefa e é marcador MAIS sensível de fadiga do que a
     média do tempo ou a taxa de erro. É isso que o detector de
     fadiga usa.
     ------------------------------------------------------------ */
  function cv(arr) {
    if (arr.length < 3) return null;
    const m = U.mean(arr);
    return m > 0 ? U.sd(arr) / m : null;
  }

  /** Compara variabilidade do início contra o fim de uma série. */
  function derivaVariabilidade(serie, minPorMetade = 6) {
    const n = serie.length;
    if (n < minPorMetade * 2) return { ok: false, n };
    const k = Math.floor(n / 3);
    const ini = serie.slice(0, k), fim = serie.slice(-k);
    const c1 = cv(ini), c2 = cv(fim);
    if (c1 == null || c2 == null || c1 <= 0) return { ok: false, n };
    const m1 = U.median(ini), m2 = U.median(fim);
    return {
      ok: true, n,
      cvIni: c1, cvFim: c2, razao: c2 / c1,
      medIni: m1, medFim: m2, lentidao: m1 > 0 ? (m2 - m1) / m1 : 0,
    };
  }

  /* ------------------------------------------------------------
     Suavização para exibição.
     Média móvel simples: não inventa dado, só evita que o gráfico
     sugira uma virada que é ruído de uma sessão.
     ------------------------------------------------------------ */
  function suavizar(ys, janela = 3) {
    if (ys.length < janela) return ys.slice();
    return ys.map((_, i) => {
      const a = Math.max(0, i - janela + 1);
      return U.mean(ys.slice(a, i + 1));
    });
  }

  /** Texto padrão para quando não dá para concluir. */
  const SEM_DADOS = 'dados insuficientes';
  function rotuloNivel(nv) {
    return { insuficiente: 'dados insuficientes', provisorio: 'provisório',
             razoavel: 'razoável', firme: 'firme' }[nv] || nv;
  }

  U.S = {
    Z95, Z80, MIN, nivelDado, podeDecidir, rotuloNivel, SEM_DADOS,
    wilson, difProporcoes, bootMediana, mediaIC, inclinacao,
    cv, derivaVariabilidade, suavizar, tCrit,
  };

})(window.U);
