/* ============================================================
   toque.js — onde o seu dedo cai, de verdade
   ------------------------------------------------------------
   A V3 guardava dois números por toque: o deslocamento dentro do
   botão, em fração do raio. Serve para um gráfico de dispersão e
   para nada além disso. Em fração do raio, o mesmo dedo no mesmo
   lugar muda de número quando o botão muda de tamanho, então a
   série nem com ela mesma era comparável.

   Aqui o toque é guardado em MILÍMETROS na tela, com posição
   absoluta, tamanho do contato, de onde o dedo veio e quanto
   tempo levou. Milímetro é invariante: muda o HUD, muda o botão,
   o número continua querendo dizer a mesma coisa. E posição
   absoluta é o que permite responder a pergunta que o HUD
   perfeito exige — "onde eu de fato toco?" — em vez de só
   "quanto eu errei do centro do botão que está aí hoje".
   ============================================================ */
'use strict';
(function (U) {

  const S = U.S, H = U.HUD, MM = U.HUD.TELA_MM;
  const TETO = 4000;                    // toques guardados (anel)
  const MIN = { botao: 15, elipse: 25, vies: 20, fitts: 30, pivo: 60, mapa: 80 };

  /* ============================================================
     GRAVAÇÃO
     ============================================================ */

  /**
   * Um toque. Tudo que dá para medir no momento em que o dedo
   * encosta, porque depois não dá mais.
   * @param e.x,e.y      posição em px da superfície
   * @param e.box        caixa da superfície (px) — a régua para o mm
   * @param e.id         botão acertado (null = vazio)
   * @param e.perto      botão mais próximo quando não acertou nada
   * @param e.ev         PointerEvent cru, para tamanho do contato
   */
  function gravar(e) {
    if (!e || !e.box || !e.box.w) return;
    const d = U.DB.load();
    if (!Array.isArray(d.toqueBruto)) d.toqueBruto = [];

    const pxmmX = MM.w / e.box.w, pxmmY = MM.h / e.box.h;
    const u = (e.x - e.box.x) / e.box.w;
    const v = (e.y - e.box.y) / e.box.h;

    const alvo = e.id || e.perto || null;
    let mx = null, my = null;
    if (alvo) {
      const hud = H.getHud()[alvo];
      if (hud) {
        mx = ((e.x - e.box.x) / e.box.w - hud.x) * MM.w;
        my = ((e.y - e.box.y) / e.box.h - hud.y) * MM.h;
      }
    }

    /* tamanho do contato: PointerEvent.width/height vêm em px CSS e
       só valem alguma coisa em toque de verdade. Mouse devolve 1. */
    const ev = e.ev;
    const toqueReal = ev && ev.pointerType === 'touch' && ev.width > 1;
    const rx = toqueReal ? +(ev.width * pxmmX / 2).toFixed(2) : null;
    const ry = toqueReal ? +(ev.height * pxmmY / 2).toFixed(2) : null;
    const pr = (ev && ev.pressure > 0 && ev.pressure < 1) ? +ev.pressure.toFixed(2) : null;

    const ant = d._ultToque;
    let de = null, mt = null, amp = null;
    if (ant && e.t - ant.t < 4000 && ant.b && alvo && ant.b !== alvo) {
      de = ant.b; mt = Math.round(e.t - ant.t);
      const A = H.getHud()[ant.b], B = H.getHud()[alvo];
      if (A && B) amp = +H.distMM(A, B).toFixed(1);
    }
    d._ultToque = { b: alvo, t: e.t };

    d.toqueBruto.push({
      t: Date.now(), s: d.sessaoAtual ? d.sessaoAtual.id : 0,
      b: alvo, ok: e.id ? 1 : 0, tp: e.tipo || null,
      u: +u.toFixed(4), v: +v.toFixed(4),
      mx: mx != null ? +mx.toFixed(2) : null,
      my: my != null ? +my.toFixed(2) : null,
      rx, ry, pr, de, mt, amp,
      k: e.drill || null,
    });
    if (d.toqueBruto.length > TETO) d.toqueBruto = d.toqueBruto.slice(-TETO);
  }

  function toques({ dias = 0, b = null, limpo = null } = {}) {
    const d = U.DB.load();
    const corte = dias ? Date.now() - dias * U.DAY : 0;
    return (d.toqueBruto || []).filter(x =>
      (!corte || x.t >= corte) && (!b || x.b === b) &&
      (limpo == null || !!x.ok === !!limpo));
  }

  /* ============================================================
     GEOMETRIA DA DISPERSÃO
     ------------------------------------------------------------
     Duas coisas diferentes, e confundir as duas é o erro comum:
     VIÉS é o centro da sua nuvem estar fora do centro do botão —
     conserta-se movendo o botão. DISPERSÃO é o tamanho da nuvem —
     conserta-se treinando, ou aumentando o botão. Um HUD bom
     resolve o primeiro e acomoda o segundo.
     ============================================================ */

  /** Autovalores/autovetores de uma matriz 2x2 simétrica. */
  function eigen2(sxx, sxy, syy) {
    const tr = sxx + syy, det = sxx * syy - sxy * sxy;
    const disc = Math.max(0, tr * tr / 4 - det);
    const r = Math.sqrt(disc);
    const l1 = tr / 2 + r, l2 = tr / 2 - r;
    let ang;
    if (Math.abs(sxy) > 1e-12) ang = Math.atan2(l1 - sxx, sxy);
    else ang = sxx >= syy ? 0 : Math.PI / 2;
    return { l1: Math.max(0, l1), l2: Math.max(0, l2), ang };
  }

  /**
   * Retrato do seu dedo num botão.
   * A elipse é a de 95% de contenção sob normal bivariada: os
   * semieixos são 2,447·√autovalor (raiz de qui-quadrado com 2
   * graus a 95%).
   */
  function porBotao(id, { dias = 90 } = {}) {
    const t = toques({ dias, b: id }).filter(x => x.mx != null);
    const n = t.length;
    if (n < MIN.botao) return { id, n, falta: MIN.botao - n, ok: false };

    const xs = t.map(x => x.mx), ys = t.map(x => x.my);
    const mx = U.mean(xs), my = U.mean(ys);
    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; sxx += a * a; syy += b * b; sxy += a * b; }
    sxx /= (n - 1); syy /= (n - 1); sxy /= (n - 1);
    const eg = eigen2(sxx, sxy, syy);
    const K = 2.4477;                              // √χ²(2, 0.95)

    /* o viés é real? intervalo de cada eixo pela média, e o teste
       conjunto por T² de Hotelling — sem ele, dois vieses pequenos
       em direções diferentes passavam despercebidos ou virava-se
       conclusão de um sozinho. */
    const icx = S.mediaIC(xs), icy = S.mediaIC(ys);
    const det = sxx * syy - sxy * sxy;
    let T2 = 0;
    if (det > 1e-12) {
      const ixx = syy / det, iyy = sxx / det, ixy = -sxy / det;
      T2 = n * (mx * mx * ixx + 2 * mx * my * ixy + my * my * iyy);
    }
    const F = ((n - 2) / (2 * (n - 1))) * T2;
    const viesReal = n >= MIN.vies && F > 3.1;     // F(2, n-2) a 95%, n moderado

    const hud = H.getHud()[id] || {};
    const raio = (hud.r || 0.03) * MM.w;
    const contato = t.filter(x => x.rx != null);
    const limpos = t.filter(x => x.ok).length;

    return {
      id, ok: true, n, nome: H.NOMES[id] || id,
      vies: { x: mx, y: my, mm: Math.hypot(mx, my),
              lo: [icx.lo, icy.lo], hi: [icx.hi, icy.hi], real: viesReal, F },
      elipse: { a: K * Math.sqrt(eg.l1), b: K * Math.sqrt(eg.l2), ang: eg.ang,
                area: Math.PI * K * K * Math.sqrt(Math.max(0, det)) },
      sd: { x: Math.sqrt(sxx), y: Math.sqrt(syy) },
      raio, folga: raio - Math.hypot(mx, my) - K * Math.sqrt(eg.l1),
      taxaLimpo: limpos / n,
      contato: contato.length >= 8
        ? { rx: U.median(contato.map(x => x.rx)), ry: U.median(contato.map(x => x.ry)), n: contato.length }
        : null,
      pontos: t,
    };
  }

  /**
   * Probabilidade de o toque destinado a `id` cair mais perto de
   * outro botão, dada a nuvem medida e o HUD informado.
   * Monte Carlo sobre a normal bivariada ajustada: é a conta que
   * o otimizador precisa e que fórmula fechada não dá com botões
   * de tamanhos diferentes espalhados de qualquer jeito.
   */
  function riscoVizinho(retrato, hud, amostras = 800) {
    if (!retrato || !retrato.ok) return null;
    const id = retrato.id, alvo = hud[id];
    if (!alvo) return null;
    /* amostra na base da própria elipse: g1 no eixo maior, g2 no menor,
       depois rotaciona de volta para a tela. */
    const ca = Math.cos(retrato.elipse.ang), sa = Math.sin(retrato.elipse.ang);
    const sa1 = retrato.elipse.a / 2.4477, sa2 = retrato.elipse.b / 2.4477;
    const outros = Object.keys(hud).filter(k => k !== id && hud[k].tipo !== 'joy');
    let fora = 0, vizinho = {};
    for (let i = 0; i < amostras; i++) {
      const g1 = gauss() * sa1, g2 = gauss() * sa2;
      const dx = retrato.vies.x + g1 * ca - g2 * sa;
      const dy = retrato.vies.y + g1 * sa + g2 * ca;
      const px = alvo.x + dx / MM.w, py = alvo.y + dy / MM.h;
      const dAlvo = distRel(px, py, alvo);
      let melhor = id, dMelhor = dAlvo;
      for (const k of outros) {
        const dk = distRel(px, py, hud[k]);
        if (dk < dMelhor) { dMelhor = dk; melhor = k; }
      }
      if (melhor !== id) { fora++; vizinho[melhor] = (vizinho[melhor] || 0) + 1; }
    }
    const p = fora / amostras;
    const pior = Object.entries(vizinho).sort((a, b) => b[1] - a[1])[0];
    return { p, w: S.wilson(fora, amostras), pior: pior ? { id: pior[0], p: pior[1] / amostras } : null };
  }
  function distRel(px, py, b) {
    const dx = (px - b.x) * MM.w, dy = (py - b.y) * MM.h;
    return Math.hypot(dx, dy) / (b.r * MM.w);
  }
  let _g = null;
  function gauss() {
    if (_g != null) { const v = _g; _g = null; return v; }
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    const r = Math.sqrt(-2 * Math.log(u));
    _g = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  }

  /* ============================================================
     ONDE FICA O SEU POLEGAR — estimado, não chutado
     ------------------------------------------------------------
     A V3 usava um pivô fixo escrito no código. Mas o pivô dá para
     MEDIR: o viés de cada botão tende a apontar ao longo da linha
     que liga o botão ao ponto em torno do qual o polegar gira —
     o dedo "corta" a curva por dentro nos botões longe e
     ultrapassa nos perto. Então o pivô é o ponto que melhor
     alinha os vieses observados com essa direção.
     ============================================================ */
  function pivoEstimado({ dias = 90 } = {}) {
    const ids = H.ACIONAVEIS.filter(id => {
      const r = porBotao(id, { dias });
      return r.ok && r.n >= MIN.botao;
    });
    const retratos = ids.map(id => porBotao(id, { dias }));
    const usaveis = retratos.filter(r => r.vies.mm > 0.25);
    const nTotal = retratos.reduce((a, r) => a + r.n, 0);
    if (usaveis.length < 4 || nTotal < MIN.pivo)
      return { ok: false, motivo: `preciso de 4 botões com viés mensurável e ${MIN.pivo} toques (tenho ${usaveis.length} e ${nTotal})`,
               pivo: H.PIVO, medido: false, n: nTotal };

    const hud = H.getHud();
    /* busca em grade e depois refino: o custo é a soma do
       desalinhamento angular, ponderada pelo tamanho do viés e
       pela amostra de cada botão. */
    const custo = (px, py) => {
      let c = 0, w = 0;
      for (const r of usaveis) {
        const b = hud[r.id]; if (!b) continue;
        const rx = (b.x - px) * MM.w, ry = (b.y - py) * MM.h;
        const nrm = Math.hypot(rx, ry) || 1;
        const vx = r.vies.x / r.vies.mm, vy = r.vies.y / r.vies.mm;
        const cos = (rx / nrm) * vx + (ry / nrm) * vy;
        const peso = r.vies.mm * Math.sqrt(r.n);
        c += peso * (1 - Math.abs(cos));           // alinhado (ou anti) = bom
        w += peso;
      }
      return w ? c / w : 1;
    };
    let melhor = { c: Infinity, x: H.PIVO.x, y: H.PIVO.y };
    for (let x = 0.55; x <= 1.25; x += 0.02)
      for (let y = 0.80; y <= 1.45; y += 0.02) {
        const c = custo(x, y);
        if (c < melhor.c) melhor = { c, x, y };
      }
    for (let passo = 0.01; passo >= 0.0025; passo /= 2)
      for (const dx of [-passo, 0, passo]) for (const dy of [-passo, 0, passo]) {
        const c = custo(melhor.x + dx, melhor.y + dy);
        if (c < melhor.c) melhor = { c, x: melhor.x + dx, y: melhor.y + dy };
      }

    /* incerteza: onde mais o custo poderia estar sem piorar 20% */
    const limiar = melhor.c * 1.2;
    let raio = 0;
    for (let a = 0; a < 6.28; a += 0.4)
      for (let r = 0.01; r <= 0.30; r += 0.01) {
        if (custo(melhor.x + Math.cos(a) * r, melhor.y + Math.sin(a) * r) > limiar) { raio = Math.max(raio, r); break; }
      }
    return {
      ok: true, medido: true, pivo: { x: melhor.x, y: melhor.y },
      custo: melhor.c, incertezaMM: raio * MM.w, n: nTotal, botoes: usaveis.length,
      padrao: H.PIVO,
      desvioDoPadrao: Math.hypot((melhor.x - H.PIVO.x) * MM.w, (melhor.y - H.PIVO.y) * MM.h),
      confiavel: melhor.c < 0.35 && usaveis.length >= 5,
    };
  }

  /* ============================================================
     MAPA DE CALOR — onde você mais toca, na tela inteira
     ------------------------------------------------------------
     Estimativa de densidade por núcleo gaussiano, com largura de
     banda por Silverman em mm. Numa grade, não nos botões: é
     assim que dá para ver que você toca sistematicamente 4 mm à
     esquerda de um botão, o que nenhuma contagem por botão mostra.
     ============================================================ */
  function mapaCalor({ dias = 90, nx = 72, ny = 34, so = null } = {}) {
    const t = toques({ dias }).filter(x => x.u != null && (!so || x.b === so));
    if (t.length < MIN.mapa) return { ok: false, n: t.length, falta: MIN.mapa - t.length };
    const X = t.map(p => p.u * MM.w), Y = t.map(p => p.v * MM.h);
    const sx = U.sd(X) || 3, sy = U.sd(Y) || 3;
    const n = t.length;
    /* Silverman, com piso: abaixo de ~3 mm a suavização fica menor
       que o próprio dedo e o mapa vira confete. */
    const h = Math.max(3.2, 1.06 * Math.min(sx, sy) * Math.pow(n, -0.2));
    const grade = new Float32Array(nx * ny);
    const cx = MM.w / nx, cy = MM.h / ny;
    const alc = h * 2.6;
    for (let i = 0; i < n; i++) {
      const gx = X[i] / cx, gy = Y[i] / cy;
      const i0 = Math.max(0, Math.floor(gx - alc / cx)), i1 = Math.min(nx - 1, Math.ceil(gx + alc / cx));
      const j0 = Math.max(0, Math.floor(gy - alc / cy)), j1 = Math.min(ny - 1, Math.ceil(gy + alc / cy));
      for (let a = i0; a <= i1; a++) for (let b = j0; b <= j1; b++) {
        const dx = (a + 0.5) * cx - X[i], dy = (b + 0.5) * cy - Y[i];
        const d2 = (dx * dx + dy * dy) / (h * h);
        if (d2 < 7) grade[b * nx + a] += Math.exp(-0.5 * d2);
      }
    }
    let max = 0;
    for (let i = 0; i < grade.length; i++) if (grade[i] > max) max = grade[i];
    if (max > 0) for (let i = 0; i < grade.length; i++) grade[i] /= max;
    return { ok: true, grade, nx, ny, n, h, mmPorCelula: { x: cx, y: cy } };
  }

  /* ============================================================
     LEI DE FITTS, MEDIDA EM VOCÊ
     MT = a + b·log2(2A/W). O b é o seu custo por bit: quanto
     você paga, em ms, cada vez que o alvo fica duas vezes mais
     longe ou duas vezes menor. É ele que o otimizador usa para
     dizer se mover um botão compensa.
     ============================================================ */
  function fitts({ dias = 90 } = {}) {
    const hud = H.getHud();
    const t = toques({ dias }).filter(x => x.mt != null && x.de && x.b && x.ok && x.amp > 3);
    if (t.length < MIN.fitts) return { ok: false, n: t.length, falta: MIN.fitts - t.length };
    const pts = t.map(x => {
      const W = 2 * (hud[x.b] ? hud[x.b].r * MM.w : 5);
      return { id: Math.log2(2 * x.amp / Math.max(2, W)), mt: x.mt, de: x.de, para: x.b };
    }).filter(p => isFinite(p.id) && p.mt > 60 && p.mt < 2500);
    if (pts.length < MIN.fitts) return { ok: false, n: pts.length, falta: MIN.fitts - pts.length };

    const reg = S.inclinacao(pts.map(p => p.mt), pts.map(p => p.id));
    const a = reg.a != null ? reg.a : U.mean(pts.map(p => p.mt));
    const b = reg.b != null ? reg.b : 0;
    /* R²: sem ele o modelo seria usado mesmo quando não descreve nada */
    const my = U.mean(pts.map(p => p.mt));
    let ssRes = 0, ssTot = 0;
    for (const p of pts) { const yh = a + b * p.id; ssRes += (p.mt - yh) ** 2; ssTot += (p.mt - my) ** 2; }
    const r2 = ssTot ? 1 - ssRes / ssTot : 0;
    const erro = Math.sqrt(ssRes / Math.max(1, pts.length - 2));

    /* trajetos que fogem da própria reta: são candidatos a mudança de HUD */
    const porPar = {};
    for (const p of pts) {
      const k = p.de + '>' + p.para;
      const e = porPar[k] || (porPar[k] = { k, de: p.de, para: p.para, n: 0, soma: 0, prev: 0 });
      e.n++; e.soma += p.mt; e.prev += a + b * p.id;
    }
    const pares = Object.values(porPar).filter(e => e.n >= 5).map(e => ({
      ...e, med: e.soma / e.n, esperado: e.prev / e.n,
      excesso: e.soma / e.n - e.prev / e.n,
    })).sort((x, y) => y.excesso - x.excesso);

    /* Faixa de dificuldade realmente observada. Fora dela a reta é
       extrapolação, e extrapolar uma reta ajustada é como o otimizador
       consegue "provar" que colar os botões uns nos outros economiza
       tempo sem limite. */
    const idsObs = pts.map(p => p.id).sort((x, y) => x - y);
    const idMin = idsObs[Math.floor(idsObs.length * 0.05)];
    const idMax = idsObs[Math.floor(idsObs.length * 0.95)];

    return {
      ok: true, a, b, r2, erro, n: pts.length, pts, pares, idMin, idMax,
      /* previsão SEM extrapolar: abaixo do menor índice de dificuldade
         que você já executou, o tempo previsto congela no daquele ponto.
         O modelo não sabe o que acontece mais perto do que você nunca
         tocou, e fingir que sabe é inventar ganho. */
      prever: (amp, w) => {
        const id = Math.log2(2 * amp / Math.max(2, w));
        return a + b * U.clamp(id, idMin, idMax);
      },
      preverCru: (amp, w) => a + b * Math.log2(2 * amp / Math.max(2, w)),
      qualidade: r2 >= 0.5 ? 'boa' : r2 >= 0.25 ? 'fraca' : 'ruim',
      aviso: r2 < 0.25
        ? 'A reta de Fitts explica pouco dos seus tempos. Isso costuma querer dizer que o que manda no seu tempo agora é a decisão, não a distância — e nesse caso mexer no HUD rende pouco.'
        : null,
    };
  }

  /* ============================================================
     RESUMO
     ============================================================ */
  function resumo({ dias = 90 } = {}) {
    const hud = H.getHud();
    const retratos = Object.keys(hud).filter(k => hud[k].tipo !== 'joy')
      .map(id => porBotao(id, { dias })).filter(r => r.ok);
    const f = fitts({ dias });
    const pv = pivoEstimado({ dias });
    const riscos = retratos.map(r => ({ id: r.id, nome: r.nome, ...riscoVizinho(r, hud) }))
      .filter(x => x.p != null).sort((a, b) => b.p - a.p);
    const comVies = retratos.filter(r => r.vies.real).sort((a, b) => b.vies.mm - a.vies.mm);
    const t = toques({ dias });
    return {
      n: t.length, retratos, fitts: f, pivo: pv, riscos, comVies,
      piorRisco: riscos.find(r => r.w && r.w.lo > 0.03) || null,
      temContato: retratos.some(r => r.contato),
      dedoMM: (() => {
        const c = retratos.filter(r => r.contato);
        return c.length ? U.mean(c.map(r => (r.contato.rx + r.contato.ry))) : null;
      })(),
    };
  }

  U.TQ = { MIN, gravar, toques, porBotao, riscoVizinho, pivoEstimado, mapaCalor, fitts, resumo, eigen2 };

})(window.U);
