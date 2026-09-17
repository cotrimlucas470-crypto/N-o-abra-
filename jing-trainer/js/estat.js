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
  /**
   * Quantil bilateral da normal para um alfa. Serve para UMA coisa só:
   * corrigir o intervalo quando eu comparo vários fatores e depois
   * escolho o pior. Escolher o maior de sete comparações e reportá-lo
   * com intervalo de 95% produz falso positivo em cerca de 30% das vezes
   * — foi exatamente o que apareceu no teste de perturbação.
   */
  function zBilateral(alfa) {
    const p = 1 - alfa / 2;
    /* aproximação racional de Moro/Acklam, boa o bastante nesta faixa */
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969,
               138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887,
               66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184,
               -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const dd = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    const pl = 0.02425;
    let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((dd[0]*q+dd[1])*q+dd[2])*q+dd[3])*q+1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((dd[0]*q+dd[1])*q+dd[2])*q+dd[3])*q+1); }
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }

  /** z para escolher o pior de m comparações mantendo 5% de erro no conjunto. */
  function zParaMuitas(m) { return m <= 1 ? Z95 : zBilateral(0.05 / m); }

  function difProporcoes(k1, n1, k2, n2, z = Z95) {
    if (!n1 || !n2) return { dif: 0, lo: -1, hi: 1, distinguivel: false, n: Math.min(n1, n2) };
    const a = wilson(k1, n1, z), b = wilson(k2, n2, z);
    const dif = a.p - b.p;
    const lo = dif - Math.sqrt((a.p - a.lo) ** 2 + (b.hi - b.p) ** 2);
    const hi = dif + Math.sqrt((a.hi - a.p) ** 2 + (b.p - b.lo) ** 2);
    return { dif, lo, hi, distinguivel: lo > 0 || hi < 0, n: Math.min(n1, n2), z };
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

  /* ============================================================
     V3 — ferramentas que a V2 não tinha
     ============================================================ */

  /* ------------------------------------------------------------
     ENCOLHIMENTO (shrinkage) para o índice de evolução.
     O pedido era: "não permita que uma sessão excepcional distorça
     meu nível real". Essa é a ferramenta certa, e ela é padrão:
     puxar a estimativa nova na direção da estimativa anterior, com
     peso proporcional ao tamanho da amostra. Aceita um viés pequeno
     e controlado para reduzir muito a variância.
     w = n/(n+k): com n pequeno a nota quase não se move; com n
     grande ela passa a mandar. k é o "peso do passado" e sai da
     tabela de amostra mínima, não de gosto.
     ------------------------------------------------------------ */
  function encolher(observado, anterior, n, k) {
    if (observado == null) return { v: anterior, w: 0, n: n || 0 };
    if (anterior == null) return { v: observado, w: 1, n: n || 0 };
    const w = (n || 0) / ((n || 0) + (k || 20));
    return { v: anterior + w * (observado - anterior), w, n: n || 0 };
  }

  /* ------------------------------------------------------------
     ERRO TÍPICO e MUDANÇA MÍNIMA RELEVANTE.
     Monitoramento de atleta: uma variação só conta quando passa de
     DUAS barreiras — o erro típico da própria medida (ruído de
     medição) e a menor mudança que teria significado prático.
     Sem isso, todo ruído vira "evolução" ou "queda".
     ------------------------------------------------------------ */
  /**
   * Erro típico: quanto essa medida se mexe sozinha, sem nada mudar.
   *
   * A fórmula clássica — desvio das diferenças consecutivas dividido por
   * √2 — assume que medidas seguidas são INDEPENDENTES. Quase nenhuma
   * medida daqui é: elas saem de janelas móveis (21, 30, 45 dias) que se
   * sobrepõem, e de notas encolhidas na direção da anterior. Dois pontos
   * seguidos compartilham quase todos os dados, então a diferença entre
   * eles é pequena por construção, o erro típico sai pequeno demais e
   * qualquer variação vira "real".
   *
   * Uma simulação de dez semanas de um jogador que NÃO mudou nada pegou
   * isso acontecendo: quatro dos cinco eixos foram declarados evolução ou
   * queda. Por isso o erro típico aqui é o MAIOR entre a fórmula clássica
   * e o desvio dos resíduos em torno da tendência linear da série. Numa
   * série que só oscila, o segundo é o desvio inteiro — o certo. Numa
   * série que sobe de verdade, a tendência explica quase tudo, o resíduo
   * fica pequeno e a mudança continua sendo detectada.
   */
  function erroTipico(serie) {
    if (serie.length < 4) return null;
    const difs = [];
    for (let i = 1; i < serie.length; i++) difs.push(serie[i] - serie[i - 1]);
    const hopkins = sdSimples(difs) / Math.SQRT2;
    return Math.max(hopkins, desvioResidual(serie));
  }

  /** Resíduos em torno da reta ajustada. */
  function residuos(serie) {
    const n = serie.length;
    if (n < 4) return [];
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sx += i; sy += serie[i]; sxy += i * serie[i]; sxx += i * i; }
    const den = n * sxx - sx * sx;
    const b = den ? (n * sxy - sx * sy) / den : 0;
    const a = (sy - b * sx) / n;
    return serie.map((v, i) => v - (a + b * i));
  }

  /**
   * Autocorrelação de defasagem 1 dos RESÍDUOS.
   *
   * É o número que faltava. Quase todo ponto do histórico daqui é uma
   * média móvel: o eixo de mecânica, por exemplo, é a média dos últimos
   * oito limiares, então dois pontos seguidos compartilham sete deles.
   * Vinte e três pontos assim NÃO são vinte e três observações — são umas
   * três. Tratá-los como independentes faz qualquer perambulada lenta do
   * estimador virar "queda consistente", e foi o que a simulação de dez
   * semanas com habilidade fixa mostrou acontecendo em quatro eixos.
   *
   * Medir nos resíduos, e não na série crua, é o que impede o efeito
   * contrário: numa série que sobe de verdade a própria subida deixaria a
   * autocorrelação perto de 1 e o sistema ficaria cego para a melhora.
   */
  function autocorr(serie) {
    const r = residuos(serie);
    if (r.length < 6) return 0;
    const m = U.mean(r);
    let num = 0, den = 0;
    for (let i = 0; i < r.length; i++) {
      den += (r[i] - m) ** 2;
      if (i) num += (r[i] - m) * (r[i - 1] - m);
    }
    if (!den) return 0;
    return U.clamp(num / den, 0, 0.95);
  }

  /** Quantas observações INDEPENDENTES valem n pontos com autocorrelação ró. */
  function amostraEfetiva(n, ro) {
    return Math.max(1, n * (1 - ro) / (1 + ro));
  }

  /** Desvio em torno da reta ajustada: o ruído que a tendência não explica. */
  function desvioResidual(serie) {
    const n = serie.length;
    if (n < 4) return 0;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sx += i; sy += serie[i]; sxy += i * serie[i]; sxx += i * i; }
    const den = n * sxx - sx * sx;
    const b = den ? (n * sxy - sx * sy) / den : 0;
    const a = (sy - b * sx) / n;
    let ss = 0;
    for (let i = 0; i < n; i++) ss += (serie[i] - (a + b * i)) ** 2;
    return Math.sqrt(ss / Math.max(1, n - 2));
  }
  function sdSimples(a) {
    if (a.length < 2) return 0;
    const m = U.mean(a);
    return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
  }
  /** Menor mudança relevante: convenção de 0,2 desvio-padrão. */
  function mudancaMinima(serie) {
    if (serie.length < 4) return null;
    return 0.2 * sdSimples(serie);
  }
  /**
   * Uma mudança é real? Precisa passar do ruído E ter tamanho útil.
   * Devolve também POR QUE não passou, que é a parte honesta.
   */
  /**
   * Uma mudança só é real se passa do ruído da própria medida E tem
   * tamanho prático. n1 e n2 são quantos pontos entraram em cada lado da
   * comparação: o erro típico é o de UMA medida, e comparar duas medidas
   * soltas tem ruído √2 vezes maior que isso. Ignorar esse √2 foi a
   * origem de um falso positivo real — variação de 7 dias entre dois
   * pontos isolados de uma série plana saía como "mudança real".
   */
  function mudancaReal(serie, delta, { n1 = 1, n2 = 1, z = Z95 } = {}) {
    const et = erroTipico(serie), swc = mudancaMinima(serie);
    if (et == null) return { real: false, motivo: 'série curta demais para saber o que é ruído', et, swc };
    /* pontos que se sobrepõem não contam um por um: ver autocorr() */
    const ro = autocorr(serie);
    const e1 = amostraEfetiva(n1, ro), e2 = amostraEfetiva(n2, ro);
    /* O erro típico sozinho é um limiar de TRIAGEM, não um veredicto:
       exigir só "maior que o erro típico" deixa passar cerca de um terço
       das comparações de puro ruído. Numa tela que mostra dez eixos com
       selo de "real", isso vira várias mentiras por visita. O limiar é o
       erro da comparação multiplicado por z. */
    const ruido = z * et * Math.sqrt(1 / e1 + 1 / e2);
    const passaRuido = Math.abs(delta) > ruido;
    const passaUtil = Math.abs(delta) > swc;
    return {
      real: passaRuido && passaUtil, et, swc, ruido, n1, n2, z, ro, e1, e2,
      motivo: !passaRuido ? `dentro do ruído da comparação (±${ruido.toFixed(1)}${ro > 0.4 ? `, e ${n1 + n2} pontos que se sobrepõem valem ${(e1 + e2).toFixed(1)} independentes` : ''})`
            : !passaUtil ? `acima do ruído mas pequena demais para importar (< ${swc.toFixed(1)})`
            : 'passa do ruído e tem tamanho útil',
    };
  }

  /* ------------------------------------------------------------
     CUSUM — soma cumulativa.
     Detecta deslocamentos PEQUENOS e persistentes, que é o caso
     difícil: uma queda de 3 pontos por sessão some no gráfico e
     aparece na soma. Não precisa de tamanho de amostra fixo e
     cresce a cada nova sessão.
     k = folga (metade do deslocamento que se quer pegar)
     h = limite de decisão
     ------------------------------------------------------------ */
  function cusum(serie, { alvo = null, k = null, h = null } = {}) {
    const n = serie.length;
    if (n < 5) return { estado: 'sem_dados', n };
    const base = alvo != null ? alvo : U.mean(serie.slice(0, Math.max(3, Math.floor(n / 2))));
    const dp = sdSimples(serie) || 1;
    const K = k != null ? k : 0.5 * dp;
    const H = h != null ? h : 4 * dp;
    let alto = 0, baixo = 0, sinalAlto = 0, sinalBaixo = 0;
    const trilha = [];
    for (const v of serie) {
      alto = Math.max(0, alto + (v - base) - K);
      baixo = Math.max(0, baixo + (base - v) - K);
      if (alto > H) sinalAlto++;
      if (baixo > H) sinalBaixo++;
      trilha.push({ v, alto, baixo });
    }
    return {
      estado: sinalBaixo > 0 ? 'queda' : sinalAlto > 0 ? 'subida' : 'estavel',
      alto, baixo, H, K, base, n, trilha,
      forcaQueda: baixo / H, forcaSubida: alto / H,
    };
  }

  /* ------------------------------------------------------------
     FUNÇÃO PSICOMÉTRICA com taxa de lapso.
     Ajusta acerto(dificuldade) com uma logística de 3 parâmetros.
     O parâmetro de LAPSO é obrigatório e não é detalhe: sem ele,
     um punhado de falhas sem relação com a dificuldade (celular
     escorregou, notificação) enviesa tanto o limiar quanto a
     inclinação — e é justamente o tipo de erro que produz uma
     avaliação falsa.
     Ajuste por busca em grade + refino: n pequeno não justifica
     nada mais sofisticado.
     ------------------------------------------------------------ */
  function ajustePsicometrico(pontos) {
    const bons = pontos.filter(p => p.n >= 3);
    const N = bons.reduce((s, p) => s + p.n, 0);
    if (bons.length < 4 || N < 60) {
      return { ok: false, motivo: `preciso de 4 níveis de dificuldade com 60 tentativas no total (tenho ${bons.length} e ${N})`, n: N, niveis: bons.length };
    }
    const xs = bons.map(p => p.x);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const chute = 0.0;      // não é escolha múltipla: errar é errar

    const verossim = (mu, beta, lambda) => {
      let L = 0;
      for (const p of bons) {
        const t = 1 / (1 + Math.exp(-(p.x - mu) * beta));
        const pr = U.clamp(chute + (1 - chute - lambda) * (1 - t), 1e-6, 1 - 1e-6);
        L += p.k * Math.log(pr) + (p.n - p.k) * Math.log(1 - pr);
      }
      return L;
    };

    let melhor = { L: -Infinity };
    const passoMu = (x1 - x0) / 24 || 0.1;
    for (let mu = x0 - 1; mu <= x1 + 1; mu += passoMu) {
      for (const beta of [0.3, 0.5, 0.8, 1.2, 1.8, 2.6, 3.6, 5.0]) {
        for (const lambda of [0, 0.02, 0.05, 0.10, 0.16]) {
          const L = verossim(mu, beta, lambda);
          if (L > melhor.L) melhor = { L, mu, beta, lambda };
        }
      }
    }
    /* refino local */
    for (let it = 0; it < 3; it++) {
      const dMu = passoMu / (2 ** (it + 1));
      const base = { ...melhor };
      for (const dm of [-dMu, 0, dMu]) {
        for (const db of [0.85, 1, 1.18]) {
          for (const dl of [-0.02, 0, 0.02]) {
            const mu = base.mu + dm, beta = base.beta * db, lambda = U.clamp(base.lambda + dl, 0, 0.25);
            const L = verossim(mu, beta, lambda);
            if (L > melhor.L) melhor = { L, mu, beta, lambda };
          }
        }
      }
    }
    /* nível de dificuldade para uma taxa de acerto alvo */
    const nivelPara = (alvo) => {
      const teto = 1 - melhor.lambda;
      if (alvo >= teto) return null;
      const t = 1 - alvo / teto;            // proporção da queda logística
      if (t <= 0 || t >= 1) return null;
      return melhor.mu + Math.log(t / (1 - t)) / melhor.beta;
    };
    return {
      ok: true, mu: melhor.mu, beta: melhor.beta, lambda: melhor.lambda, n: N, niveis: bons.length,
      consistente: nivelPara(0.90), oscila: nivelPara(0.70), quebra: nivelPara(0.50),
      prever: (x) => (1 - melhor.lambda) * (1 - 1 / (1 + Math.exp(-(x - melhor.mu) * melhor.beta))),
      pontos: bons,
    };
  }

  /* ------------------------------------------------------------
     CALIBRAÇÃO DE CONFIANÇA.
     Mede se a sua sensação de certeza acompanha o seu acerto.
     Usa só CALIBRAÇÃO (viés) e não sensibilidade metacognitiva:
     a primeira é a medida mais confiável entre domínios e no
     tempo; a segunda tem confiabilidade teste-reteste ruim e é
     confundida com o próprio desempenho em tarefas onde dá para
     chutar. Implementar a segunda seria precisão inventada.
     ------------------------------------------------------------ */
  function calibracao(tentativas) {
    const com = tentativas.filter(t => t.conf != null);
    if (com.length < 12) return { ok: false, n: com.length, falta: 12 - com.length };
    const conf = U.mean(com.map(t => t.conf));          // 0..1
    const acc = com.filter(t => t.ok).length / com.length;
    const vies = conf - acc;
    const faixas = [0.2, 0.6, 1.0].map((topo, i, arr) => {
      const piso = i ? arr[i - 1] : -0.01;
      const g = com.filter(t => t.conf > piso && t.conf <= topo);
      return { rotulo: ['chute', 'acho que sim', 'certeza'][i], conf: topo,
               n: g.length, acc: g.length ? g.filter(t => t.ok).length / g.length : null };
    });
    /* resolução: a confiança separa acerto de erro? */
    const cCertos = com.filter(t => t.ok).map(t => t.conf);
    const cErrados = com.filter(t => !t.ok).map(t => t.conf);
    const resolucao = (cCertos.length >= 4 && cErrados.length >= 4)
      ? U.mean(cCertos) - U.mean(cErrados) : null;
    return {
      ok: true, n: com.length, conf, acc, vies, faixas, resolucao,
      leitura: Math.abs(vies) < 0.08 ? 'calibrado'
             : vies > 0 ? 'confiante demais' : 'inseguro demais',
    };
  }

  U.S = {
    encolher, erroTipico, desvioResidual, residuos, autocorr, amostraEfetiva,
    mudancaMinima, mudancaReal, cusum,
    ajustePsicometrico, calibracao, sdSimples,
    Z95, Z80, MIN, nivelDado, podeDecidir, rotuloNivel, SEM_DADOS,
    wilson, difProporcoes, zBilateral, zParaMuitas, bootMediana, mediaIC, inclinacao,
    cv, derivaVariabilidade, suavizar, tCrit,
  };

})(window.U);
