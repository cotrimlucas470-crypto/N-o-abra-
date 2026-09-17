/* ============================================================
   graf.js — gráficos (V2)
   ------------------------------------------------------------
   De 10 tipos para 6. O critério de corte foi único: o gráfico
   muda alguma decisão? Radar de 8 eixos, dispersão de velocidade
   x precisão e escada do sinal de parada saíram porque nenhum
   deles mudava o que fazer no dia seguinte.

   Mudança mais importante: agora a INCERTEZA é desenhada. Uma
   linha sem banda de confiança convida a ler subida onde só há
   ruído — que é exatamente o erro que esta versão existe para
   corrigir.
   ============================================================ */
'use strict';
(function (U) {

  const T = {
    superficie: '#0b0f18', tintaPrim: '#ffffff', tintaSec: '#c3c2b7', tintaMuda: '#8d94a3',
    grade: '#232a38', eixo: '#39404f',
    serie: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
    bom: '#0ca30c', atencao: '#fab219', serio: '#ec835a', critico: '#d03b3b',
  };
  const FONTE = 'system-ui, -apple-system, "Segoe UI", sans-serif';

  function prep(cv, alturaCss) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.max(80, cv.clientWidth || 300);
    const h = alturaCss || (cv.dataset.h ? +cv.dataset.h : cv.clientHeight || 160);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.height = h + 'px';
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.fillStyle = T.superficie; c.fillRect(0, 0, w, h);
    cv.__marcas = [];
    ligarToque(cv);
    return { c, w, h };
  }

  /* ---------- camada de toque ---------- */
  let dica = null;
  const caixa = () => dica || (dica = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'grafdica' })));
  const esconder = () => { if (dica) dica.classList.remove('on'); };
  document.addEventListener('pointerdown', (e) => {
    if (!e.target || e.target.tagName !== 'CANVAS') esconder();
  }, true);

  function ligarToque(cv) {
    if (cv.__toqueOn) return;
    cv.__toqueOn = true;
    cv.style.touchAction = 'pan-y';
    const mostrar = (ev) => {
      const ms = cv.__marcas || [];
      if (!ms.length) return;
      const r = cv.getBoundingClientRect();
      const x = ev.clientX - r.left, y = ev.clientY - r.top;
      let m = null, dm = Infinity;
      for (const k of ms) { const d = Math.hypot(x - k.x, y - k.y); if (d < dm) { dm = d; m = k; } }
      if (!m || dm > (m.raio || 26)) return esconder();
      const el = caixa();
      el.innerHTML = m.html; el.className = 'on';
      const bw = Math.min(230, window.innerWidth * 0.55);
      el.style.maxWidth = bw + 'px';
      el.style.left = U.clamp(r.left + m.x - bw / 2, 6, window.innerWidth - bw - 6) + 'px';
      el.style.top = Math.max(6, r.top + m.y - 8 - el.offsetHeight) + 'px';
      ev.preventDefault();
    };
    cv.addEventListener('pointerdown', mostrar);
    cv.addEventListener('pointermove', (e) => { if (e.pressure > 0 || e.buttons) mostrar(e); });
    cv.addEventListener('pointerleave', esconder);
  }
  const marcar = (cv, x, y, html, raio) => cv.__marcas.push({ x, y, html, raio: raio || 24 });

  function txt(c, s, x, y, o = {}) {
    c.fillStyle = o.cor || T.tintaSec;
    c.font = `${o.peso || 600} ${o.tam || 9}px ${FONTE}`;
    c.textAlign = o.al || 'left'; c.textBaseline = o.bl || 'middle';
    c.fillText(s, x, y);
  }
  function pontaArred(c, x, y, w, h, r) {
    r = Math.min(r, h / 2, Math.max(0, w));
    c.beginPath(); c.moveTo(x, y);
    c.lineTo(x + Math.max(0, w - r), y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + Math.max(0, w - r), y + h);
    c.lineTo(x, y + h); c.closePath();
  }
  function vazio(c, w, h, msg) {
    txt(c, msg, w / 2, h / 2, { al: 'center', cor: T.tintaMuda, tam: 10 });
  }

  /* ============================================================
     1) LINHA COM INTERVALO — a forma padrão deste sistema
     pontos = [{rot, v, lo, hi, n}]
     ============================================================ */
  function linhaIC(cv, pontos, opts = {}) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 150);
    if (!pontos || pontos.length < 1) return vazio(c, w, h, opts.vazio || 'sem dados ainda');
    const ml = opts.ml ?? 34, mr = 18, mt = 12, mb = 22;
    const gw = w - ml - mr, gh = h - mt - mb;
    const todos = pontos.flatMap(p => [p.v, p.lo, p.hi].filter(x => x != null));
    const max = opts.max ?? Math.max(...todos) * 1.1;
    const min = opts.min ?? 0;
    const N = Math.max(1, pontos.length - 1);
    const X = (i) => ml + gw * (pontos.length === 1 ? 0.5 : i / N);
    const Y = (v) => mt + gh - gh * U.clamp((v - min) / (max - min), 0, 1);

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const v = min + (max - min) * k / 4, y = Math.round(Y(v)) + 0.5;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      txt(c, opts.fmt ? opts.fmt(v) : Math.round(v), ml - 4, y, { cor: T.tintaMuda, tam: 8, al: 'right' });
    }
    if (opts.piso != null) {
      /* Linha de referência é contexto, não dado: fica discreta para não
         competir com a série que o gráfico existe para mostrar. */
      c.save(); c.globalAlpha = .5; c.setLineDash([3, 5]); c.strokeStyle = T.atencao; c.lineWidth = 1;
      c.beginPath(); c.moveTo(ml, Y(opts.piso)); c.lineTo(w - mr, Y(opts.piso)); c.stroke(); c.restore();
      txt(c, opts.pisoTxt || 'piso', ml + 3, Y(opts.piso) - 7, { cor: T.atencao, tam: 7.5, peso: 700 });
    }

    const cor = opts.cor || T.serie[0];
    /* banda de incerteza */
    const comIC = pontos.filter(p => p.lo != null && p.hi != null);
    if (comIC.length >= 2) {
      c.beginPath();
      pontos.forEach((p, i) => { if (p.hi == null) return; const x = X(i), y = Y(p.hi); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      for (let i = pontos.length - 1; i >= 0; i--) { if (pontos[i].lo == null) continue; c.lineTo(X(i), Y(pontos[i].lo)); }
      c.closePath(); c.fillStyle = cor + '26'; c.fill();
    } else if (comIC.length === 1) {
      const i = pontos.indexOf(comIC[0]);
      c.strokeStyle = cor + '88'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(X(i), Y(comIC[0].lo)); c.lineTo(X(i), Y(comIC[0].hi)); c.stroke();
    }

    c.beginPath();
    pontos.forEach((p, i) => { const x = X(i), y = Y(p.v); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.strokeStyle = cor; c.lineWidth = 2; c.stroke();

    pontos.forEach((p, i) => {
      const x = X(i), y = Y(p.v);
      c.beginPath(); c.arc(x, y, 4, 0, 6.2832);
      c.fillStyle = cor; c.fill();
      c.lineWidth = 2; c.strokeStyle = T.superficie; c.stroke();
      marcar(cv, x, y, `<b>${p.rot}</b><br>${opts.nome || 'valor'}: <b>${opts.fmt ? opts.fmt(p.v) : Math.round(p.v)}</b>` +
        (p.lo != null ? `<br>intervalo: ${opts.fmt ? opts.fmt(p.lo) : Math.round(p.lo)}–${opts.fmt ? opts.fmt(p.hi) : Math.round(p.hi)}` : '') +
        (p.n ? `<br>${p.n} tentativas` : ''));
    });

    const passo = Math.max(1, Math.ceil(pontos.length / 6));
    pontos.forEach((p, i) => {
      if (i % passo === 0 || i === pontos.length - 1)
        txt(c, p.rot, U.clamp(X(i), ml + 10, w - mr - 10), mt + gh + 9, { cor: T.tintaMuda, tam: 8, al: 'center' });
    });
  }

  /* ============================================================
     2) BARRAS COM INTERVALO — composição de erro
     ============================================================ */
  function barrasIC(cv, dados, opts = {}) {
    const alt = Math.max(54, dados.length * 26 + 10);
    const { c, w } = prep(cv, alt);
    if (!dados.length) return vazio(c, w, alt, 'sem erros registrados');
    const max = opts.max || 1;
    const ml = opts.ml || 84, mr = 44;
    dados.forEach((d, i) => {
      const y = 6 + i * 26;
      txt(c, d.nome, ml - 6, y + 8, { cor: T.tintaSec, tam: 9.5, peso: 700, al: 'right' });
      const larguraTotal = w - ml - mr;
      c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(ml, y + 1, larguraTotal, 14);
      const bw = larguraTotal * U.clamp(d.p / max, 0, 1);
      c.fillStyle = d.status ? T[d.status] : T.serie[0];
      pontaArred(c, ml, y + 1, bw, 14, 4); c.fill();
      /* bigode do intervalo */
      if (d.lo != null) {
        const xl = ml + larguraTotal * U.clamp(d.lo / max, 0, 1);
        const xh = ml + larguraTotal * U.clamp(d.hi / max, 0, 1);
        c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(xl, y + 8); c.lineTo(xh, y + 8); c.stroke();
        c.beginPath(); c.moveTo(xl, y + 4); c.lineTo(xl, y + 12);
        c.moveTo(xh, y + 4); c.lineTo(xh, y + 12); c.stroke();
      }
      txt(c, Math.round(d.p * 100) + '%', w - mr + 5, y + 8, { cor: T.tintaPrim, tam: 9.5, peso: 800 });
      marcar(cv, ml + bw / 2, y + 8,
        `<b>${d.nome}</b><br>${Math.round(d.p * 100)}% dos erros (${d.n})` +
        (d.lo != null ? `<br>intervalo ${Math.round(d.lo * 100)}–${Math.round(d.hi * 100)}%` : '') +
        (d.acao ? `<br>${d.acao}` : ''), 34);
    });
  }

  /* ============================================================
     3) CURVA DE OCLUSÃO — acerto por janela, com intervalo
     ============================================================ */
  function curvaIC(cv, dados, opts = {}) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 155);
    if (!dados.length) return vazio(c, w, h, opts.vazio || 'faça o exercício Leitura');
    const ml = 36, mr = 26, mt = 12, mb = 26;
    const gw = w - ml - mr, gh = h - mt - mb;
    const N = Math.max(1, dados.length - 1);
    /* Quando o eixo horizontal é TEMPO, ele precisa ser proporcional ao
       tempo. Espaçar as faixas por índice desenhava 11h, 23h, 41h, 67h e
       121h igualmente distantes — o que achata a queda rápida do começo e
       estica a cauda, ou seja, mente sobre a forma da curva justamente
       onde a decisão é tomada. */
    let X;
    if (opts.xProporcional && dados.length > 1) {
      const xs = dados.map(d => d.janela);
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      X = (i) => ml + gw * (x1 > x0 ? (dados[i].janela - x0) / (x1 - x0) : 0.5);
    } else {
      X = (i) => ml + gw * (dados.length === 1 ? 0.5 : i / N);
    }
    const Y = (v) => mt + gh - gh * U.clamp(v, 0, 1);

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const y = Math.round(mt + gh - gh * k / 4) + 0.5;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      txt(c, (k * 25) + '%', ml - 4, y, { cor: T.tintaMuda, tam: 8, al: 'right' });
    }
    if (!opts.semAcaso) {
      const acaso = opts.acaso ?? 0.25;
      c.save(); c.setLineDash([4, 3]); c.strokeStyle = T.critico; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(ml, Y(acaso)); c.lineTo(w - mr, Y(acaso)); c.stroke(); c.restore();
      txt(c, 'acaso', ml + 3, Y(acaso) - 7, { cor: T.critico, tam: 7.5, peso: 700 });
    }
    /* faixa de revisão: onde lembrar ainda custa esforço */
    if (opts.faixa) {
      c.fillStyle = 'rgba(12,163,12,.10)';
      c.fillRect(ml, Y(0.90), w - mr - ml, Y(0.80) - Y(0.90));
      txt(c, 'janela de revisão', ml + 4, (Y(0.90) + Y(0.80)) / 2, { cor: T.bom, tam: 7.5, peso: 700 });
    }

    const cor = T.serie[0];
    if (dados.length >= 2 && dados[0].lo != null) {
      c.beginPath();
      dados.forEach((d, i) => { const x = X(i), y = Y(d.hi); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      for (let i = dados.length - 1; i >= 0; i--) c.lineTo(X(i), Y(dados[i].lo));
      c.closePath(); c.fillStyle = cor + '26'; c.fill();
    }
    c.beginPath();
    dados.forEach((d, i) => { const x = X(i), y = Y(d.p); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.strokeStyle = cor; c.lineWidth = 2; c.stroke();

    dados.forEach((d, i) => {
      const x = X(i), y = Y(d.p);
      const ref = opts.ref && d.janela === opts.ref;
      c.beginPath(); c.arc(x, y, ref ? 5.5 : 4.5, 0, 6.2832);
      c.fillStyle = ref ? T.atencao : cor; c.fill();
      c.lineWidth = 2; c.strokeStyle = T.superficie; c.stroke();
      txt(c, d.janela + (opts.unidade || 'ms'), U.clamp(x, ml + 14, w - mr - 14), mt + gh + 10,
          { cor: ref ? T.atencao : T.tintaMuda, tam: 8, al: 'center', peso: ref ? 800 : 600 });
      marcar(cv, x, y, `<b>${d.janela}${opts.unidade || ' ms'} ${opts.oQue || 'de visão'}</b><br>acerto <b>${Math.round(d.p * 100)}%</b>` +
        (d.lo != null ? `<br>intervalo ${Math.round(d.lo * 100)}–${Math.round(d.hi * 100)}%` : '') +
        `<br>${d.n} tentativas` + (ref ? '<br><b>janela de referência</b>' : ''), 24);
    });
    txt(c, opts.rotX || '← menos informação', ml, mt + gh + 21, { cor: T.tintaMuda, tam: 7.5 });
  }

  /* ============================================================
     4) FITTS — layout contra habilidade
     ============================================================ */
  function fitts(cv, aj) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 180);
    if (!aj) return vazio(c, w, h, 'sem dados suficientes');
    const ml = 34, mr = 18, mt = 12, mb = 24;
    const gw = w - ml - mr, gh = h - mt - mb;
    const ids = aj.pontos.map(p => p.id), mts = aj.pontos.map(p => p.mt);
    const x0 = Math.min(...ids) - 0.3, x1 = Math.max(...ids) + 0.3;
    const y1 = Math.max(...mts) * 1.12;
    const X = (v) => ml + gw * (v - x0) / (x1 - x0);
    const Y = (v) => mt + gh - gh * U.clamp(v / y1, 0, 1);

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 3; k++) {
      const v = y1 * k / 3, y = Math.round(Y(v)) + 0.5;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      txt(c, Math.round(v), ml - 4, y, { cor: T.tintaMuda, tam: 8, al: 'right' });
    }
    c.strokeStyle = T.tintaMuda; c.lineWidth = 1.6; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(X(x0), Y(aj.a + aj.b * x0)); c.lineTo(X(x1), Y(aj.a + aj.b * x1));
    c.stroke(); c.setLineDash([]);

    aj.pontos.forEach(p => {
      const acima = p.z > 0.9;
      const x = X(p.id), y = Y(p.mt);
      c.beginPath(); c.arc(x, y, 5, 0, 6.2832);
      c.fillStyle = acima ? T.serie[1] : T.serie[0]; c.fill();
      c.lineWidth = 2; c.strokeStyle = T.superficie; c.stroke();
      marcar(cv, x, y, `<b>${p.rotulo}</b><br>seu tempo <b>${Math.round(p.mt)}ms</b><br>previsto pelo layout ${Math.round(p.prev)}ms<br>${acima ? '<b>acima da reta</b> — treino sobrando' : 'na reta — limite do HUD'}`, 22);
      if (acima) txt(c, p.rotulo, x, y - 11, { cor: T.serie[1], tam: 8, peso: 800, al: 'center' });
    });
    txt(c, 'dificuldade do trajeto (bits)', ml + gw / 2, mt + gh + 13, { cor: T.tintaMuda, tam: 8, al: 'center' });
    txt(c, `R² ${aj.r2.toFixed(2)}`, w - mr, mt + 4, { cor: T.tintaMuda, tam: 8, al: 'right' });
  }

  /* ============================================================
     5) DISPERSÃO DO TOQUE
     ============================================================ */
  function toques(cv, botoes) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 165);
    if (!botoes.length) return vazio(c, w, h, 'sem toques registrados');
    const cols = Math.min(botoes.length, 5);
    const cw = w / cols, ch = h / Math.ceil(botoes.length / cols);
    botoes.forEach((b, i) => {
      const cx = cw * (i % cols) + cw / 2, cy = ch * Math.floor(i / cols) + ch / 2 - 5;
      const R = Math.min(cw, ch) * 0.31;
      c.strokeStyle = T.eixo; c.lineWidth = 1.4;
      c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.stroke();
      c.strokeStyle = T.grade;
      c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy);
      c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
      c.fillStyle = T.serie[0] + '99';
      for (const p of b.pontos.slice(-40)) {
        c.beginPath(); c.arc(cx + p.dx * R, cy + p.dy * R, 1.7, 0, 6.2832); c.fill();
      }
      const mx = U.mean(b.pontos.map(p => p.dx)), my = U.mean(b.pontos.map(p => p.dy));
      const sx = U.sd(b.pontos.map(p => p.dx)) || 0.05, sy = U.sd(b.pontos.map(p => p.dy)) || 0.05;
      const desl = Math.hypot(mx, my);
      const fora = desl + Math.max(sx, sy) > 0.85;
      c.strokeStyle = fora ? T.critico : T.bom; c.lineWidth = 2;
      c.beginPath(); c.ellipse(cx + mx * R, cy + my * R, Math.max(3, sx * R), Math.max(3, sy * R), 0, 0, 6.2832); c.stroke();
      c.beginPath(); c.arc(cx + mx * R, cy + my * R, 2.6, 0, 6.2832); c.fillStyle = fora ? T.critico : T.bom; c.fill();
      txt(c, b.nome, cx, cy + R + 10, { cor: T.tintaSec, tam: 8.5, peso: 700, al: 'center' });
      marcar(cv, cx, cy, `<b>${b.nome}</b><br>${b.pontos.length} toques<br>desvio médio <b>${Math.round(desl * 100)}%</b> do raio<br>dispersão ±${Math.round(Math.max(sx, sy) * 100)}%${fora ? '<br><b>risco de encostar no vizinho</b>' : ''}`, 30);
    });
  }

  /* ============================================================
     6) MEDIDOR — uma medida com intervalo, em linha
     ============================================================ */
  function medidor(cv, m, opts = {}) {
    const { c, w, h } = prep(cv, 34);
    const ml = 4, mr = 4;
    const gw = w - ml - mr;
    const min = opts.min ?? 0, max = opts.max ?? 100;
    const X = (v) => ml + gw * U.clamp((v - min) / (max - min), 0, 1);
    c.fillStyle = 'rgba(255,255,255,.06)'; pontaArred(c, ml, 12, gw, 9, 4.5); c.fill();
    if (m.v == null) { txt(c, 'dados insuficientes', w / 2, 17, { al: 'center', cor: T.tintaMuda, tam: 9 }); return; }
    if (opts.piso != null) {
      const x = X(opts.piso);
      c.strokeStyle = T.atencao; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, 8); c.lineTo(x, 25); c.stroke();
    }
    if (m.lo != null) {
      c.fillStyle = (opts.cor || T.serie[0]) + '55';
      pontaArred(c, X(m.lo), 12, Math.max(2, X(m.hi) - X(m.lo)), 9, 4.5); c.fill();
    }
    const x = X(m.v);
    c.beginPath(); c.arc(x, 16.5, 5.5, 0, 6.2832);
    c.fillStyle = opts.cor || T.serie[0]; c.fill();
    c.lineWidth = 2; c.strokeStyle = T.superficie; c.stroke();
    marcar(cv, x, 16, `<b>${m.nome}</b><br>${m.v}${m.unidade || ''}` +
      (m.lo != null ? `<br>intervalo ${m.lo}–${m.hi}` : '') + `<br>${m.n} tentativas · ${U.S.rotuloNivel(m.nivel)}`, 40);
  }

  /* ============================================================
     7) MATRIZ DE EVOLUÇÃO
     ------------------------------------------------------------
     Dez eixos numa linha só ficariam ilegíveis, e a pergunta não é
     "qual o valor" e sim "onde evoluí, onde estabilizei, onde caí".
     Isso é estado, não magnitude: cada célula é uma sessão, pintada
     com a cor do estado daquele eixo naquele ponto. As quatro cores
     são as de status (reservadas, nunca usadas para série), e cada
     uma vem com rótulo na legenda — a cor nunca carrega sozinha.
     ============================================================ */
  const COR_ESTADO = { evolucao: T.bom, estavel: '#3d4657', suspeita: T.serio, queda: T.critico, semDados: '#242b38' };

  function matriz(cv, linhas, rotulos, opts = {}) {
    const alt = Math.max(60, linhas.length * 21 + 26);
    const { c, w } = prep(cv, alt);
    if (!linhas.length) return vazio(c, w, alt, 'sem histórico ainda');
    const ml = opts.ml || 96, mr = 38;
    const gw = w - ml - mr;
    const n = Math.max(1, rotulos.length);
    const cw = Math.max(4, gw / n);

    rotulos.forEach((r, i) => {
      if (i % Math.max(1, Math.ceil(n / 6)) && i !== n - 1) return;
      txt(c, r, ml + cw * (i + 0.5), 10, { cor: T.tintaMuda, tam: 7.5, al: 'center' });
    });

    linhas.forEach((L, j) => {
      const y = 18 + j * 21;
      txt(c, L.nome, ml - 6, y + 8, { cor: T.tintaSec, tam: 9, peso: 700, al: 'right' });
      L.estados.forEach((e, i) => {
        const x = ml + cw * i;
        c.fillStyle = COR_ESTADO[e] || COR_ESTADO.semDados;
        c.fillRect(x + 1, y + 1, Math.max(2, cw - 2), 15);
        if (e === 'queda' || e === 'evolucao') {
          c.fillStyle = 'rgba(255,255,255,.85)';
          c.font = `800 8px ${FONTE}`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(e === 'queda' ? '↓' : '↑', x + cw / 2, y + 9);
        }
        marcar(cv, x + cw / 2, y + 8,
          `<b>${L.nome}</b><br>${rotulos[i]}<br>nota ${L.valores[i] != null ? L.valores[i] : '—'}<br>${
            { evolucao: 'evolução', estavel: 'estável', suspeita: 'queda suspeita',
              queda: 'queda consistente', semDados: 'sem dados' }[e]}`,
          Math.max(14, cw));
      });
      const ult = L.valores[L.valores.length - 1];
      txt(c, ult != null ? String(ult) : '—', w - mr + 6, y + 8,
          { cor: T.tintaPrim, tam: 9.5, peso: 800 });
    });
  }

  /* ============================================================
     8) FUNÇÃO PSICOMÉTRICA — o seu limite
     ============================================================ */
  function psicometrica(cv, f, opts = {}) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 180);
    if (!f || !f.ok) return vazio(c, w, h, (f && f.motivo) || 'sem dados suficientes');
    const ml = 34, mr = 18, mt = 12, mb = 26;
    const gw = w - ml - mr, gh = h - mt - mb;
    const xs = f.pontos.map(p => p.x);
    const x0 = Math.min(...xs) - 0.4, x1 = Math.max(...xs) + 0.4;
    const X = (v) => ml + gw * (v - x0) / (x1 - x0);
    const Y = (v) => mt + gh - gh * U.clamp(v, 0, 1);

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const y = Math.round(mt + gh - gh * k / 4) + 0.5;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      txt(c, (k * 25) + '%', ml - 4, y, { cor: T.tintaMuda, tam: 8, al: 'right' });
    }
    /* faixas: consistente / oscila / quebra */
    const faixas = [
      { v: f.consistente, cor: T.bom, rot: 'consistente' },
      { v: f.oscila, cor: T.atencao, rot: 'oscila' },
      { v: f.quebra, cor: T.critico, rot: 'quebra' },
    ].filter(z => z.v != null && z.v >= x0 && z.v <= x1);
    for (const z of faixas) {
      c.save(); c.setLineDash([4, 4]); c.globalAlpha = .75;
      c.strokeStyle = z.cor; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(X(z.v), mt); c.lineTo(X(z.v), mt + gh); c.stroke(); c.restore();
      txt(c, z.rot, X(z.v), mt + gh + 10, { cor: z.cor, tam: 7.5, peso: 800, al: 'center' });
    }
    /* teto imposto pelo lapso */
    if (f.lambda > 0.02) {
      c.save(); c.setLineDash([2, 4]); c.globalAlpha = .6; c.strokeStyle = T.tintaMuda;
      c.beginPath(); c.moveTo(ml, Y(1 - f.lambda)); c.lineTo(w - mr, Y(1 - f.lambda)); c.stroke(); c.restore();
      txt(c, `teto ${Math.round((1 - f.lambda) * 100)}% (lapsos)`, w - mr - 2, Y(1 - f.lambda) - 7,
          { cor: T.tintaMuda, tam: 7.5, peso: 700, al: 'right' });
    }
    /* curva ajustada */
    c.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = x0 + (x1 - x0) * i / 60;
      const y = Y(f.prever(x));
      i ? c.lineTo(X(x), y) : c.moveTo(X(x), y);
    }
    c.strokeStyle = T.serie[0]; c.lineWidth = 2; c.stroke();
    /* pontos observados, tamanho pelo n */
    for (const p of f.pontos) {
      const x = X(p.x), y = Y(p.k / p.n);
      const r = U.clamp(2.5 + Math.sqrt(p.n) * 0.5, 3, 8);
      c.beginPath(); c.arc(x, y, r, 0, 6.2832);
      c.fillStyle = T.serie[0] + 'bb'; c.fill();
      c.lineWidth = 1.6; c.strokeStyle = T.superficie; c.stroke();
      marcar(cv, x, y, `dificuldade ${p.x}<br>acerto <b>${Math.round(p.k / p.n * 100)}%</b><br>${p.n} tentativas`, 20);
    }
    txt(c, 'dificuldade →', ml + gw / 2, mt + gh + 20, { cor: T.tintaMuda, tam: 8, al: 'center' });
  }


  /* ============================================================
     MAPA DO POLEGAR — a tela inteira, não os botões
     ------------------------------------------------------------
     Codificação sequencial de uma grandeza contínua: um hue só,
     do escuro que se confunde com o fundo (zero) ao claro (máximo).
     O zero recua até virar o próprio fundo por transparência, e
     não por um azul escuro pintado — assim o contorno do HUD
     continua legível por baixo, que é o ponto do gráfico.
     O HUD vem em traço fino de tinta apagada: ele é referência,
     não dado, e não deve competir com o calor.
     ============================================================ */
  const RAMPA = ['#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7',
                 '#6da7ec', '#86b6ef', '#9ec5f4', '#b7d3f6', '#cde2fb'];
  function corRampa(t) {
    const x = U.clamp(t, 0, 1) * (RAMPA.length - 1);
    const i = Math.min(RAMPA.length - 2, Math.floor(x)), f = x - i;
    const a = hex2(RAMPA[i]), b = hex2(RAMPA[i + 1]);
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
  }
  function hex2(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

  /** Proporção da tela do jogo: define a caixa desenhada. */
  function caixaHud(w, h) {
    const MM = U.HUD.TELA_MM, ar = MM.w / MM.h;
    let bw = w - 8, bh = bw / ar;
    if (bh > h - 8) { bh = h - 8; bw = bh * ar; }
    return { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh };
  }

  function desenharHudBase(c, B, hud, { forte = false } = {}) {
    c.save();
    c.strokeStyle = forte ? T.eixo : T.grade;
    c.lineWidth = 1;
    for (const id in hud) {
      const b = hud[id];
      const px = B.x + b.x * B.w, py = B.y + b.y * B.h, pr = b.r * B.w;
      c.beginPath(); c.arc(px, py, pr, 0, 6.2832); c.stroke();
    }
    c.restore();
  }

  function mapaToque(cv, mapa, hud, opts = {}) {
    const { c, w, h } = prep(cv, opts.alt);
    if (!mapa || !mapa.ok) return vazio(c, w, h, mapa && mapa.falta ? `faltam ${mapa.falta} toques` : 'sem toques ainda');
    const B = caixaHud(w, h);

    /* fundo da área de jogo, para o mapa ter borda */
    c.fillStyle = '#0e131d'; c.fillRect(B.x, B.y, B.w, B.h);

    /* Desenhado numa imagem do tamanho da grade e depois ESCALADO com
       suavização. Pintar retângulo por célula direto no canvas produzia
       um mosaico — e mosaico numa densidade contínua mente sobre a
       resolução do dado: sugere fronteira onde só existe suavização. */
    const off = document.createElement('canvas');
    off.width = mapa.nx; off.height = mapa.ny;
    const oc = off.getContext('2d');
    const img = oc.createImageData(mapa.nx, mapa.ny);
    for (let k = 0; k < mapa.nx * mapa.ny; k++) {
      const v = mapa.grade[k];
      const rgb = hex2(RAMPA[Math.min(RAMPA.length - 1, Math.round(U.clamp(v, 0, 1) * (RAMPA.length - 1)))]);
      img.data[k * 4] = rgb[0]; img.data[k * 4 + 1] = rgb[1]; img.data[k * 4 + 2] = rgb[2];
      img.data[k * 4 + 3] = v < 0.012 ? 0 : Math.round(Math.min(0.94, Math.pow(v, 0.62)) * 255);
    }
    oc.putImageData(img, 0, 0);
    c.save();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(off, B.x, B.y, B.w, B.h);
    c.restore();
    desenharHudBase(c, B, hud, { forte: true });

    /* nome dos botões mais tocados, direto no mapa — rótulo seletivo,
       não um número em cada ponto */
    if (opts.rotular !== false) {
      const q = Object.entries(opts.contagem || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const postos = [];
      c.font = `800 8.5px ${FONTE}`;
      for (const [id, n] of q) {
        const b = hud[id]; if (!b) continue;
        const px = B.x + b.x * B.w, py = B.y + b.y * B.h;
        const rot = `${U.HUD.NOMES[id] || id} · ${n}`;
        const lw2 = c.measureText(rot).width;
        /* tenta acima, depois abaixo, depois mais acima — rótulo que se
           sobrepõe a outro não informa, atrapalha */
        let y = py - b.r * B.w - 8, tentativa = 0;
        const bate = (yy) => postos.some(p => Math.abs(p.y - yy) < 11 && Math.abs(p.x - px) < (p.w + lw2) / 2 + 6);
        while (bate(y) && tentativa < 4) {
          tentativa++;
          y = tentativa % 2 ? py + b.r * B.w + 11 : py - b.r * B.w - 8 - 12 * Math.ceil(tentativa / 2);
        }
        postos.push({ x: px, y, w: lw2 });
        c.fillStyle = 'rgba(11,15,24,.72)';
        c.fillRect(px - lw2 / 2 - 3, y - 6, lw2 + 6, 12);
        txt(c, rot, px, y, { cor: T.tintaPrim, tam: 8.5, peso: 800, al: 'center' });
      }
    }
    /* legenda do ramp, no topo-esquerda com fundo próprio: embaixo ela
       caía em cima do analógico */
    const lw = Math.min(110, B.w * 0.26);
    const lx = B.x + 10, ly = B.y + 20;
    c.fillStyle = 'rgba(11,15,24,.78)';
    c.fillRect(lx - 6, ly - 13, lw + 12, 26);
    for (let i = 0; i < lw; i++) {
      c.globalAlpha = Math.min(0.94, Math.pow(i / lw, 0.62));
      c.fillStyle = corRampa(i / lw);
      c.fillRect(lx + i, ly, 1, 6);
    }
    c.globalAlpha = 1;
    txt(c, 'menos', lx, ly - 6, { cor: T.tintaMuda, tam: 7.5 });
    txt(c, 'mais toques', lx + lw, ly - 6, { cor: T.tintaMuda, tam: 7.5, al: 'right' });
    return { B };
  }

  /* ============================================================
     DISPERSÃO POR BOTÃO — elipse de 95% e seta de viés
     A elipse é o tamanho da nuvem; a seta é o quanto o centro dela
     está fora do centro do botão. São duas coisas diferentes e por
     isso dois desenhos diferentes: a elipse se conserta treinando
     ou com botão maior, a seta se conserta movendo o botão.
     ============================================================ */
  function dispersao(cv, retratos, hud, opts = {}) {
    const { c, w, h } = prep(cv, opts.alt);
    if (!retratos || !retratos.length) return vazio(c, w, h, 'sem nuvem de toque ainda');
    const B = caixaHud(w, h);
    const MM = U.HUD.TELA_MM;
    const mmPx = B.w / MM.w;
    c.fillStyle = '#0e131d'; c.fillRect(B.x, B.y, B.w, B.h);
    desenharHudBase(c, B, hud);

    for (const r of retratos) {
      const b = hud[r.id]; if (!b || !r.ok) continue;
      const px = B.x + b.x * B.w, py = B.y + b.y * B.h;
      const cx = px + r.vies.x * mmPx, cy = py + r.vies.y * (B.h / MM.h);

      /* pontos crus, bem discretos */
      c.fillStyle = 'rgba(134,182,239,.30)';
      for (const p of (r.pontos || [])) {
        c.beginPath();
        c.arc(px + p.mx * mmPx, py + p.my * (B.h / MM.h), 1.1, 0, 6.2832);
        c.fill();
      }
      /* elipse de 95% */
      c.save();
      c.translate(cx, cy); c.rotate(r.elipse.ang);
      c.strokeStyle = '#3987e5'; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(0, 0, Math.max(1, r.elipse.a * mmPx), Math.max(1, r.elipse.b * mmPx), 0, 0, 6.2832);
      c.stroke();
      c.restore();
      /* seta do viés, só quando ele é real — senão é ruído desenhado */
      if (r.vies.real && r.vies.mm > 0.3) {
        const cor = r.vies.mm > r.raio * 0.45 ? T.critico : r.vies.mm > r.raio * 0.25 ? T.serio : T.atencao;
        c.strokeStyle = cor; c.fillStyle = cor; c.lineWidth = 2;
        c.beginPath(); c.moveTo(px, py); c.lineTo(cx, cy); c.stroke();
        const ang = Math.atan2(cy - py, cx - px);
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(cx - Math.cos(ang - 0.42) * 6, cy - Math.sin(ang - 0.42) * 6);
        c.lineTo(cx - Math.cos(ang + 0.42) * 6, cy - Math.sin(ang + 0.42) * 6);
        c.closePath(); c.fill();
      }
      marcar(cv, px, py,
        `<b>${r.nome}</b><br>${r.n} toques<br>viés ${r.vies.mm.toFixed(1)} mm${r.vies.real ? ' (real)' : ' (dentro do ruído)'}<br>nuvem ${(r.elipse.a).toFixed(1)}×${(r.elipse.b).toFixed(1)} mm<br>folga até a borda ${r.folga.toFixed(1)} mm`,
        Math.max(16, b.r * B.w));
    }
    /* legenda: identidade nunca é só cor */
    const ly = B.y + B.h - 10;
    c.strokeStyle = '#3987e5'; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(B.x + 14, ly, 9, 5, 0, 0, 6.2832); c.stroke();
    txt(c, 'nuvem de 95%', B.x + 27, ly, { cor: T.tintaMuda, tam: 7.5 });
    c.strokeStyle = T.serio; c.lineWidth = 2;
    c.beginPath(); c.moveTo(B.x + 104, ly); c.lineTo(B.x + 120, ly); c.stroke();
    txt(c, 'viés real', B.x + 124, ly, { cor: T.tintaMuda, tam: 7.5 });
    return { B };
  }

  /* ============================================================
     LAYOUT COMPARADO — o que está e o que o cálculo propõe
     Um hue e um neutro, não duas cores competindo: o atual é
     contorno apagado, o proposto é o traço com cor.
     ============================================================ */
  function layoutComparado(cv, base, novo, mudancas, opts = {}) {
    const { c, w, h } = prep(cv, opts.alt);
    const B = caixaHud(w, h);
    c.fillStyle = '#0e131d'; c.fillRect(B.x, B.y, B.w, B.h);
    const mudou = new Set((mudancas || []).map(m => m.id));

    /* atual: tracejado apagado */
    c.save(); c.setLineDash([3, 3]); c.strokeStyle = T.eixo; c.lineWidth = 1;
    for (const id in base) {
      const b = base[id];
      c.beginPath(); c.arc(B.x + b.x * B.w, B.y + b.y * B.h, b.r * B.w, 0, 6.2832); c.stroke();
    }
    c.restore();

    /* proposto */
    for (const id in novo) {
      const b = novo[id], o = base[id];
      const px = B.x + b.x * B.w, py = B.y + b.y * B.h, pr = b.r * B.w;
      const muda = mudou.has(id);
      c.strokeStyle = muda ? '#3987e5' : T.grade;
      c.lineWidth = muda ? 2 : 1;
      c.beginPath(); c.arc(px, py, pr, 0, 6.2832); c.stroke();
      if (muda && o) {
        const ox = B.x + o.x * B.w, oy = B.y + o.y * B.h;
        c.strokeStyle = 'rgba(57,135,229,.55)'; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(ox, oy); c.lineTo(px, py); c.stroke();
        txt(c, U.HUD.NOMES[id] || id, px, py - pr - 6,
            { cor: T.tintaPrim, tam: 8, peso: 800, al: 'center' });
        const m = (mudancas || []).find(x => x.id === id);
        if (m) marcar(cv, px, py, `<b>${m.nome}</b><br>move ${m.mm.toFixed(1)} mm`, Math.max(16, pr));
      }
    }
    const ly = B.y + B.h - 10;
    c.save(); c.setLineDash([3, 3]); c.strokeStyle = T.eixo; c.lineWidth = 1;
    c.beginPath(); c.moveTo(B.x + 10, ly); c.lineTo(B.x + 26, ly); c.stroke(); c.restore();
    txt(c, 'como está', B.x + 30, ly, { cor: T.tintaMuda, tam: 7.5 });
    c.strokeStyle = '#3987e5'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(B.x + 92, ly); c.lineTo(B.x + 108, ly); c.stroke();
    txt(c, 'proposta', B.x + 112, ly, { cor: T.tintaMuda, tam: 7.5 });
    return { B };
  }

  /* ============================================================
     CURVA DE APRENDIZAGEM — com banda e platô
     ============================================================ */
  function curvaAprend(cv, serie, curva, opts = {}) {
    const { c, w, h } = prep(cv, opts.alt);
    if (!serie || serie.length < 4) return vazio(c, w, h, 'série curta demais');
    const ml = 34, mr = 54, mt = 14, mb = 20;
    const gw = w - ml - mr, gh = h - mt - mb;
    const fut = curva && curva.ok ? 6 : 0;
    const n = serie.length;
    const todos = serie.slice();
    if (curva && curva.ok) for (let k = 1; k <= fut; k++) todos.push(curva.prever(k));
    if (curva && curva.ok) todos.push(curva.plato);
    let lo = Math.min(...todos), hi = Math.max(...todos);
    const pad = (hi - lo) * 0.14 || 1; lo -= pad; hi += pad;
    const X = (i) => ml + gw * (i / Math.max(1, n - 1 + fut));
    const Y = (v) => mt + gh * (1 - (v - lo) / (hi - lo));

    grade(c, ml, mt, gw, gh, lo, hi);

    /* platô como linha de referência, rotulada */
    if (curva && curva.ok && curva.melhorQueReta) {
      c.save(); c.setLineDash([4, 4]); c.strokeStyle = T.eixo; c.lineWidth = 1;
      c.beginPath(); c.moveTo(ml, Y(curva.plato)); c.lineTo(ml + gw, Y(curva.plato)); c.stroke(); c.restore();
      txt(c, `platô ~${Math.round(curva.plato)}`, ml + gw + 5, Y(curva.plato),
          { cor: T.tintaMuda, tam: 8, peso: 700 });
    }
    /* banda de previsão */
    if (curva && curva.ok && fut) {
      c.fillStyle = 'rgba(57,135,229,.16)';
      c.beginPath();
      const erro = curva.erro || 1;
      c.moveTo(X(n - 1), Y(serie[n - 1]));
      for (let k = 1; k <= fut; k++) c.lineTo(X(n - 1 + k), Y(curva.prever(k) + 1.96 * erro));
      for (let k = fut; k >= 1; k--) c.lineTo(X(n - 1 + k), Y(curva.prever(k) - 1.96 * erro));
      c.closePath(); c.fill();
      c.save(); c.setLineDash([3, 3]); c.strokeStyle = '#5598e7'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(X(n - 1), Y(serie[n - 1]));
      for (let k = 1; k <= fut; k++) c.lineTo(X(n - 1 + k), Y(curva.prever(k)));
      c.stroke(); c.restore();
    }
    /* pontos observados e curva ajustada */
    if (curva && curva.ok) {
      c.strokeStyle = '#3987e5'; c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i < n; i++) { const v = curva.prever(i - (n - 1)); i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)); }
      c.stroke();
    }
    c.fillStyle = 'rgba(195,194,183,.85)';
    for (let i = 0; i < n; i++) { c.beginPath(); c.arc(X(i), Y(serie[i]), 2.6, 0, 6.2832); c.fill(); }

    txt(c, 'sessões →', ml, h - 6, { cor: T.tintaMuda, tam: 7.5 });
    if (curva && curva.ok && fut)
      txt(c, 'previsão', X(n - 1 + fut), mt + 6, { cor: '#86b6ef', tam: 7.5, peso: 700, al: 'right' });
    return true;
  }

  /* ============================================================
     LINHA DE MUDANÇAS — quando alguma coisa aconteceu
     Marcas de estado trazem rótulo, nunca só a cor.
     ============================================================ */
  function linhaMudancas(cv, serie, cp, suave, opts = {}) {
    const { c, w, h } = prep(cv, opts.alt);
    if (!serie || serie.length < 4) return vazio(c, w, h, 'série curta demais');
    const ml = 32, mr = 14, mt = 16, mb = 22;
    const gw = w - ml - mr, gh = h - mt - mb;
    const n = serie.length;
    let lo = Math.min(...serie), hi = Math.max(...serie);
    const pad = (hi - lo) * 0.16 || 1; lo -= pad; hi += pad;
    const X = (i) => ml + gw * (i / Math.max(1, n - 1));
    const Y = (v) => mt + gh * (1 - (v - lo) / (hi - lo));
    grade(c, ml, mt, gw, gh, lo, hi);

    /* segmentos entre pontos de mudança: patamares */
    if (cp && cp.ok) {
      for (const s of cp.segmentos) {
        c.strokeStyle = T.eixo; c.lineWidth = 1;
        c.save(); c.setLineDash([2, 3]);
        c.beginPath(); c.moveTo(X(s.de), Y(s.media)); c.lineTo(X(Math.max(s.de, s.ate - 1)), Y(s.media)); c.stroke();
        c.restore();
      }
    }
    /* observado, discreto */
    c.strokeStyle = 'rgba(141,148,163,.55)'; c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < n; i++) i ? c.lineTo(X(i), Y(serie[i])) : c.moveTo(X(i), Y(serie[i]));
    c.stroke();
    /* nível suavizado pelo filtro */
    if (suave && suave.length === n) {
      c.strokeStyle = '#3987e5'; c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i < n; i++) i ? c.lineTo(X(i), Y(suave[i])) : c.moveTo(X(i), Y(suave[i]));
      c.stroke();
    }
    /* marcas de mudança, com rótulo */
    if (cp && cp.ok) {
      for (let k = 0; k < cp.pontos.length; k++) {
        const p = cp.pontos[k];
        const seg = cp.segmentos.find(s => s.de === p.i);
        const salto = seg && seg.salto != null ? seg.salto : 0;
        const cor = salto > 0 ? T.bom : T.critico;
        c.strokeStyle = cor; c.lineWidth = 1.5;
        c.save(); c.setLineDash([3, 3]);
        c.beginPath(); c.moveTo(X(p.i), mt); c.lineTo(X(p.i), mt + gh); c.stroke(); c.restore();
        c.fillStyle = cor;
        c.beginPath(); c.arc(X(p.i), mt + 5, 3.4, 0, 6.2832); c.fill();
        txt(c, `${salto > 0 ? '↑' : '↓'} ${Math.abs(salto).toFixed(0)}`, X(p.i) + 5, mt + 5,
            { cor, tam: 8, peso: 800 });
        marcar(cv, X(p.i), mt + gh / 2,
          `<b>mudança no ponto ${p.i + 1}</b><br>${salto > 0 ? 'subiu' : 'caiu'} ${Math.abs(salto).toFixed(1)}`, 16);
      }
      if (!cp.pontos.length)
        txt(c, 'nenhum degrau encontrado — a série muda devagar, não em saltos', ml + 4, mt + 6,
            { cor: T.tintaMuda, tam: 7.5 });
    }
    txt(c, 'sessões →', ml, h - 6, { cor: T.tintaMuda, tam: 7.5 });
    return true;
  }

  /* ============================================================
     TRAJETOS — medido contra o que a distância pede
     ============================================================ */
  function trajetos(cv, pares, opts = {}) {
    const { c, w, h } = prep(cv, opts.alt);
    if (!pares || !pares.length) return vazio(c, w, h, 'sem trajetos medidos');
    const itens = pares.slice(0, 7);
    /* margens medidas no texto real: com valor fixo, "Invocador → Item 1"
       saía cortado no começo e o valor encostava na borda direita */
    c.font = `700 8.5px ${FONTE}`;
    const mlTxt = Math.ceil(Math.max(...itens.map(p =>
      c.measureText(`${(U.HUD.NOMES[p.de] || p.de)} → ${(U.HUD.NOMES[p.para] || p.para)}`).width))) + 10;
    const ml = Math.min(Math.max(70, mlTxt), w * 0.42), mr = 84, mt = 12;
    const lh = Math.max(16, (h - mt - 14) / itens.length);
    const maxV = Math.max(...itens.map(p => Math.max(p.med, p.esperado))) * 1.1;
    const gw = w - ml - mr;
    for (let i = 0; i < itens.length; i++) {
      const p = itens[i], y = mt + i * lh + lh / 2;
      txt(c, `${(U.HUD.NOMES[p.de] || p.de)} → ${(U.HUD.NOMES[p.para] || p.para)}`, ml - 6, y,
          { cor: T.tintaSec, tam: 8.5, peso: 700, al: 'right' });
      const wEsp = gw * (p.esperado / maxV), wMed = gw * (p.med / maxV);
      /* esperado: marca de referência */
      c.strokeStyle = T.eixo; c.lineWidth = 1;
      c.beginPath(); c.moveTo(ml + wEsp, y - 6); c.lineTo(ml + wEsp, y + 6); c.stroke();
      /* medido */
      const caro = p.excesso > 0 && p.real;
      c.fillStyle = caro ? T.serio : '#3987e5';
      barra(c, ml, y - 4, Math.max(2, wMed), 8);
      txt(c, `${Math.round(p.med)}ms`, ml + wMed + 6, y, { cor: T.tintaSec, tam: 8 });
      if (caro) txt(c, `+${Math.round(p.excesso)}`, ml + wMed + 40, y, { cor: T.serio, tam: 8, peso: 800 });
      marcar(cv, ml + wMed / 2, y,
        `<b>${(U.HUD.NOMES[p.de] || p.de)} → ${(U.HUD.NOMES[p.para] || p.para)}</b><br>medido ${Math.round(p.med)} ms<br>a distância pede ${Math.round(p.esperado)} ms<br>${p.n} medidas`, lh);
    }
    c.strokeStyle = T.eixo; c.lineWidth = 1;
    c.beginPath(); c.moveTo(ml + 14, h - 8); c.lineTo(ml + 14, h - 2); c.stroke();
    txt(c, 'o que a distância pede', ml + 20, h - 5, { cor: T.tintaMuda, tam: 7.5 });
    return true;
  }

  function barra(c, x, y, w, h) {
    const r = Math.min(4, h / 2, w / 2);
    c.beginPath();
    c.moveTo(x, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x, y + h); c.closePath(); c.fill();
  }
  function grade(c, ml, mt, gw, gh, lo, hi) {
    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 3; k++) {
      const y = mt + gh * k / 3;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(ml + gw, y); c.stroke();
      txt(c, U.num(hi - (hi - lo) * k / 3), ml - 5, y, { cor: T.tintaMuda, tam: 7.5, al: 'right' });
    }
  }

  U.G = { linhaIC, barrasIC, curvaIC, fitts, toques, medidor, matriz, psicometrica,
          mapaToque, dispersao, layoutComparado, curvaAprend, linhaMudancas, trajetos, caixaHud,
          COR_ESTADO, T, esconderDica: esconder };

})(window.U);
