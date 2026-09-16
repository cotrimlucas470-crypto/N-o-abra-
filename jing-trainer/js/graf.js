/* ============================================================
   graf.js — gráficos
   Paleta categórica validada para superfície escura (checagens
   de banda de luminosidade, piso de croma, separação para
   daltonismo e contraste). Cor sempre acompanha a identidade da
   série, nunca a posição no ranking. Uma série = uma cor só.
   Toque em qualquer marca abre o valor exato.
   ============================================================ */
'use strict';
(function (U) {

  /* ---------- tokens ---------- */
  const T = {
    superficie: '#0b0f18',
    tintaPrim: '#ffffff',
    tintaSec:  '#c3c2b7',
    tintaMuda: '#8d94a3',
    grade:     '#232a38',
    eixo:      '#39404f',
    /* categórica — ordem fixa, nunca reciclada */
    serie: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
    /* status — reservado, nunca vira "série 4" */
    bom: '#0ca30c', atencao: '#fab219', serio: '#ec835a', critico: '#d03b3b',
    /* sequencial azul (magnitude contínua) */
    seq: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
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

  /* ============================================================
     Camada de toque — num celular, "passar o mouse" é tocar
     ============================================================ */
  let dica = null;
  function caixaDica() {
    if (dica) return dica;
    dica = document.createElement('div');
    dica.id = 'grafdica';
    document.body.appendChild(dica);
    return dica;
  }
  function esconder() { if (dica) dica.classList.remove('on'); }
  document.addEventListener('pointerdown', (e) => {
    if (!e.target || e.target.tagName !== 'CANVAS') esconder();
  }, true);

  function ligarToque(cv) {
    if (cv.__toqueOn) return;
    cv.__toqueOn = true;
    cv.style.touchAction = 'pan-y';
    const mostrar = (ev) => {
      const marcas = cv.__marcas || [];
      if (!marcas.length) return;
      const r = cv.getBoundingClientRect();
      const x = ev.clientX - r.left, y = ev.clientY - r.top;
      let melhor = null, dm = Infinity;
      for (const m of marcas) {
        const d = Math.hypot(x - m.x, y - m.y);
        if (d < dm) { dm = d; melhor = m; }
      }
      if (!melhor || dm > (melhor.raio || 26)) return esconder();
      const el = caixaDica();
      el.innerHTML = melhor.html;
      el.className = 'on';
      const bw = Math.min(210, window.innerWidth * 0.5);
      el.style.maxWidth = bw + 'px';
      const px = U.clamp(r.left + melhor.x - bw / 2, 6, window.innerWidth - bw - 6);
      const py = r.top + melhor.y - 8;
      el.style.left = px + 'px';
      el.style.top = Math.max(6, py - el.offsetHeight) + 'px';
      ev.preventDefault();
    };
    cv.addEventListener('pointerdown', mostrar);
    cv.addEventListener('pointermove', (e) => { if (e.pressure > 0 || e.buttons) mostrar(e); });
    cv.addEventListener('pointerleave', esconder);
  }
  const marcar = (cv, x, y, html, raio) => cv.__marcas.push({ x, y, html, raio: raio || 24 });

  /* ---------- utilidades de desenho ---------- */
  function txt(c, s, x, y, { cor = T.tintaSec, tam = 9, peso = 600, al = 'left', bl = 'middle' } = {}) {
    c.fillStyle = cor; c.font = `${peso} ${tam}px ${FONTE}`;
    c.textAlign = al; c.textBaseline = bl;
    c.fillText(s, x, y);
  }
  function pontaArred(c, x, y, w, h, r) {  // barra com a ponta de dado arredondada
    r = Math.min(r, h / 2, Math.max(0, w));
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.max(0, w - r), y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + Math.max(0, w - r), y + h);
    c.lineTo(x, y + h);
    c.closePath();
  }

  /* ============================================================
     1) RADAR — perfil de habilidade (no máximo 2 séries + alvo)
     ============================================================ */
  function radar(cv, eixos, series, alvos) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 200);
    const cx = w / 2, cy = h / 2 + 2, R = Math.min(w, h) / 2 - 30;
    const n = eixos.length;
    const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / n;

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 1; k <= 4; k++) {
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const r = R * k / 4, x = cx + Math.cos(ang(i)) * r, y = cy + Math.sin(ang(i)) * r;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath(); c.stroke();
    }
    for (let i = 0; i < n; i++) {
      c.beginPath(); c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(ang(i)) * R, cy + Math.sin(ang(i)) * R); c.stroke();
    }

    if (alvos) {
      c.save(); c.setLineDash([3, 3]); c.strokeStyle = T.atencao; c.lineWidth = 1.3; c.globalAlpha = .85;
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const r = R * U.clamp((alvos[eixos[i].id] || 0) / 100, 0, 1);
        const x = cx + Math.cos(ang(i)) * r, y = cy + Math.sin(ang(i)) * r;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath(); c.stroke(); c.restore();
    }

    series.forEach((s) => {
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const r = R * U.clamp((s.valores[eixos[i].id] || 0) / 100, 0, 1);
        const x = cx + Math.cos(ang(i)) * r, y = cy + Math.sin(ang(i)) * r;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
      if (s.preenche !== false) { c.fillStyle = s.cor + '30'; c.fill(); }
      c.strokeStyle = s.cor; c.lineWidth = s.grossura || 2; c.stroke();
      if (s.pontos !== false) {
        for (let i = 0; i < n; i++) {
          const v = s.valores[eixos[i].id] || 0;
          const r = R * U.clamp(v / 100, 0, 1);
          const x = cx + Math.cos(ang(i)) * r, y = cy + Math.sin(ang(i)) * r;
          c.beginPath(); c.arc(x, y, 4, 0, 6.2832);
          c.fillStyle = s.cor; c.fill();
          c.lineWidth = 2; c.strokeStyle = T.superficie; c.stroke();  // anel de superfície
          marcar(cv, x, y, `<b>${eixos[i].nome}</b><br>${s.nome || 'agora'}: <b>${Math.round(v)}</b>${alvos ? `<br>alvo: ${Math.round(alvos[eixos[i].id])}` : ''}`, 20);
        }
      }
    });

    for (let i = 0; i < n; i++) {
      const x = cx + Math.cos(ang(i)) * (R + 17), y = cy + Math.sin(ang(i)) * (R + 14);
      txt(c, eixos[i].curto || eixos[i].nome, x, y, { cor: T.tintaMuda, tam: 8.5, peso: 700, al: 'center' });
    }
  }

  /* ============================================================
     2) LINHA — evolução no tempo
     ============================================================ */
  function linha(cv, series, rotulos, opts = {}) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 150);
    const ml = opts.ml ?? 30, mr = opts.mr ?? 18, mt = 10, mb = 20;
    const gw = w - ml - mr, gh = h - mt - mb;
    const todos = series.flatMap(s => s.dados.filter(v => v != null));
    const max = opts.max ?? Math.max(1, ...todos) * 1.08;
    const min = opts.min ?? 0;
    const N = Math.max(1, rotulos.length - 1);

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const v = min + (max - min) * k / 4, y = Math.round(mt + gh - gh * k / 4) + 0.5;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      txt(c, opts.fmtY ? opts.fmtY(v) : Math.round(v), ml - 4, y, { cor: T.tintaMuda, tam: 8, al: 'right' });
    }
    const X = (i) => ml + gw * (N ? i / N : 0.5);
    const Y = (v) => mt + gh - gh * U.clamp((v - min) / (max - min), 0, 1);

    if (opts.faixa) {   // faixa-alvo de fundo
      c.save(); c.globalAlpha = .12; c.fillStyle = T.bom;
      c.fillRect(ml, Y(opts.faixa[1]), gw, Y(opts.faixa[0]) - Y(opts.faixa[1])); c.restore();
    }

    const rotulosDiretos = [];
    series.forEach((s) => {
      const pts = s.dados.map((v, i) => v == null ? null : [X(i), Y(v)]).filter(Boolean);
      if (!pts.length) return;
      if (s.area) {
        c.beginPath(); c.moveTo(pts[0][0], mt + gh);
        pts.forEach(p => c.lineTo(p[0], p[1]));
        c.lineTo(pts[pts.length - 1][0], mt + gh); c.closePath();
        c.fillStyle = s.cor + '24'; c.fill();
      }
      c.beginPath();
      pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
      c.strokeStyle = s.cor; c.lineWidth = 2;
      if (s.tracejado) c.setLineDash([4, 3]);
      c.stroke(); c.setLineDash([]);
      s.dados.forEach((v, i) => {
        if (v == null) return;
        const x = X(i), y = Y(v);
        c.beginPath(); c.arc(x, y, 4, 0, 6.2832);
        c.fillStyle = s.cor; c.fill();
        c.lineWidth = 2; c.strokeStyle = T.superficie; c.stroke();
        marcar(cv, x, y, `<b>${rotulos[i]}</b><br>${s.nome}: <b>${opts.fmtV ? opts.fmtV(v) : Math.round(v)}</b>`);
      });
      if (s.nome) rotulosDiretos.push({ nome: s.nome, x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] });
    });

    /* Rótulo direto no fim de cada linha, afastado quando dois terminam juntos:
       sobrepor dois nomes é pior do que não rotular. */
    rotulosDiretos.sort((a, b) => a.y - b.y);
    for (let i = 1; i < rotulosDiretos.length; i++) {
      const dy = rotulosDiretos[i].y - rotulosDiretos[i - 1].y;
      if (dy < 13) rotulosDiretos[i].y = rotulosDiretos[i - 1].y + 13;
    }
    for (const r of rotulosDiretos) {
      txt(c, r.nome, r.x - 7, U.clamp(r.y - 9, mt + 5, mt + gh - 3), { cor: T.tintaSec, tam: 8, peso: 700, al: 'right' });
    }

    const passo = Math.max(1, Math.ceil(rotulos.length / 6));
    rotulos.forEach((r, i) => {
      if (i % passo === 0 || i === rotulos.length - 1)
        txt(c, r, X(i), mt + gh + 9, { cor: T.tintaMuda, tam: 8, al: 'center' });
    });
  }

  /* ============================================================
     3) BARRAS — uma medida por categoria: UMA cor só.
        Status só quando a categoria exige ação.
     ============================================================ */
  function barras(cv, dados, opts = {}) {
    const alt = Math.max(54, dados.length * 22 + 8);
    const { c, w } = prep(cv, alt);
    const max = opts.max || Math.max(1, ...dados.map(d => d.valor));
    const ml = opts.ml || 78, mr = 30;
    dados.forEach((d, i) => {
      const y = 5 + i * 22;
      txt(c, d.nome, ml - 6, y + 7.5, { cor: T.tintaSec, tam: 9.5, peso: 700, al: 'right' });
      c.fillStyle = 'rgba(255,255,255,.05)';
      c.fillRect(ml, y + 1, w - ml - mr, 13);
      const bw = (w - ml - mr) * U.clamp(d.valor / max, 0, 1);
      c.fillStyle = d.status ? T[d.status] : T.serie[0];
      pontaArred(c, ml, y + 1, bw, 13, 4); c.fill();
      txt(c, opts.fmt ? opts.fmt(d.valor) : String(Math.round(d.valor)), ml + bw + 5, y + 7.5,
          { cor: T.tintaPrim, tam: 9.5, peso: 800 });
      marcar(cv, ml + bw / 2, y + 7, `<b>${d.nome}</b><br>${opts.fmt ? opts.fmt(d.valor) : Math.round(d.valor)}${d.nota ? '<br>' + d.nota : ''}`, 30);
    });
  }

  /* ============================================================
     4) DISPERSÃO DE FITTS — layout contra habilidade
     ============================================================ */
  function fitts(cv, ajuste, opts = {}) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 180);
    if (!ajuste) { txt(c, 'sem dados suficientes', w / 2, h / 2, { al: 'center', cor: T.tintaMuda }); return; }
    const ml = 32, mr = 18, mt = 12, mb = 22;
    const gw = w - ml - mr, gh = h - mt - mb;
    const ids = ajuste.pontos.map(p => p.id), mts = ajuste.pontos.map(p => p.mt);
    const x0 = Math.min(...ids) - 0.3, x1 = Math.max(...ids) + 0.3;
    const y0 = 0, y1 = Math.max(...mts) * 1.12;
    const X = (v) => ml + gw * (v - x0) / (x1 - x0);
    const Y = (v) => mt + gh - gh * U.clamp((v - y0) / (y1 - y0), 0, 1);

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 3; k++) {
      const v = y0 + (y1 - y0) * k / 3, y = Math.round(Y(v)) + 0.5;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      txt(c, Math.round(v), ml - 4, y, { cor: T.tintaMuda, tam: 8, al: 'right' });
    }

    /* reta prevista */
    c.strokeStyle = T.tintaMuda; c.lineWidth = 1.6; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(X(x0), Y(ajuste.a + ajuste.b * x0)); c.lineTo(X(x1), Y(ajuste.a + ajuste.b * x1));
    c.stroke(); c.setLineDash([]);

    ajuste.pontos.forEach(p => {
      const acima = p.z > 0.9;
      const x = X(p.id), y = Y(p.mt);
      c.beginPath(); c.arc(x, y, 5, 0, 6.2832);
      c.fillStyle = acima ? T.serie[1] : T.serie[0]; c.fill();
      c.lineWidth = 2; c.strokeStyle = T.superficie; c.stroke();
      marcar(cv, x, y, `<b>${p.rotulo}</b><br>seu tempo: <b>${Math.round(p.mt)}ms</b><br>previsto pelo layout: ${Math.round(p.prev)}ms<br>${acima ? '<b>acima da reta</b> — sobra de treino' : 'em cima da reta — limite do HUD'}`, 22);
      if (acima) txt(c, p.rotulo, x, y - 11, { cor: T.serie[1], tam: 8, peso: 800, al: 'center' });
    });

    txt(c, 'dificuldade do trajeto (bits)', ml + gw / 2, mt + gh + 12, { cor: T.tintaMuda, tam: 8, al: 'center' });
    txt(c, `R² ${ajuste.r2.toFixed(2)}`, w - mr, mt + 4, { cor: T.tintaMuda, tam: 8, al: 'right' });
  }

  /* ============================================================
     5) VELOCIDADE × PRECISÃO — o seu ponto de equilíbrio
     ============================================================ */
  function velAcc(cv, pontos, opts = {}) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 165);
    if (pontos.length < 2) { txt(c, 'poucos sets ainda', w / 2, h / 2, { al: 'center', cor: T.tintaMuda }); return; }
    const ml = 30, mr = 18, mt = 12, mb = 22;
    const gw = w - ml - mr, gh = h - mt - mb;
    const ts = pontos.map(p => p.tempo);
    const x0 = Math.min(...ts) * 0.92, x1 = Math.max(...ts) * 1.06;
    const X = (v) => ml + gw * (v - x0) / (x1 - x0);
    const Y = (v) => mt + gh - gh * U.clamp(v, 0, 1);

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const y = Math.round(mt + gh - gh * k / 4) + 0.5;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      txt(c, (k * 25) + '%', ml - 4, y, { cor: T.tintaMuda, tam: 8, al: 'right' });
    }
    /* zona boa: acerto >= 85% */
    c.save(); c.globalAlpha = .10; c.fillStyle = T.bom;
    c.fillRect(ml, Y(1), gw, Y(0.85) - Y(1)); c.restore();

    pontos.forEach((p, i) => {
      const rec = (i + 1) / pontos.length;
      const x = X(p.tempo), y = Y(p.acc);
      c.globalAlpha = 0.3 + rec * 0.7;
      c.beginPath(); c.arc(x, y, 4 + rec * 2.5, 0, 6.2832);
      c.fillStyle = T.serie[0]; c.fill();
      c.lineWidth = 2; c.strokeStyle = T.superficie; c.stroke();
      c.globalAlpha = 1;
      marcar(cv, x, y, `<b>${p.rotulo}</b><br>tempo: <b>${Math.round(p.tempo)}ms</b><br>acerto: <b>${Math.round(p.acc * 100)}%</b>`, 20);
    });
    txt(c, '← mais rápido        tempo do combo        mais lento →', ml + gw / 2, mt + gh + 12,
        { cor: T.tintaMuda, tam: 8, al: 'center' });
  }

  /* ============================================================
     6) CURVA DE ANTECIPAÇÃO — acerto por janela de visão
     ============================================================ */
  function antecipacao(cv, dados) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 150);
    if (!dados.length) { txt(c, 'faça o exercício Antecipação', w / 2, h / 2, { al: 'center', cor: T.tintaMuda }); return; }
    const ml = 34, mr = 26, mt = 12, mb = 24;
    const gw = w - ml - mr, gh = h - mt - mb;
    const N = Math.max(1, dados.length - 1);
    const X = (i) => ml + gw * i / N;
    const Y = (v) => mt + gh - gh * U.clamp(v, 0, 1);

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const y = Math.round(mt + gh - gh * k / 4) + 0.5;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      txt(c, (k * 25) + '%', ml - 4, y, { cor: T.tintaMuda, tam: 8, al: 'right' });
    }
    /* acaso: 1 em 4 respostas */
    c.save(); c.setLineDash([4, 3]); c.strokeStyle = T.critico; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(ml, Y(0.25)); c.lineTo(w - mr, Y(0.25)); c.stroke(); c.restore();
    txt(c, 'acaso', ml + 3, Y(0.25) - 7, { cor: T.critico, tam: 7.5, peso: 700 });

    c.beginPath();
    dados.forEach((d, i) => { const p = [X(i), Y(d.acc)]; i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
    c.strokeStyle = T.serie[0]; c.lineWidth = 2; c.stroke();
    dados.forEach((d, i) => {
      const x = X(i), y = Y(d.acc);
      c.beginPath(); c.arc(x, y, 4.5, 0, 6.2832);
      c.fillStyle = T.serie[0]; c.fill();
      c.lineWidth = 2; c.strokeStyle = T.superficie; c.stroke();
      txt(c, d.janela + 'ms', U.clamp(x, ml + 12, w - mr - 12), mt + gh + 10, { cor: T.tintaMuda, tam: 8, al: 'center' });
      marcar(cv, x, y, `<b>${d.janela}ms de visão</b><br>acerto: <b>${Math.round(d.acc * 100)}%</b><br>${d.n} tentativas`, 22);
    });
    txt(c, '← menos informação', ml, mt + gh + 20, { cor: T.tintaMuda, tam: 7.5 });
  }

  /* ============================================================
     7) ESCADA DO SINAL DE PARADA
     ============================================================ */
  function escada(cv, historico, ssd50) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 140);
    if (!historico.length) { txt(c, 'sem dados de freio', w / 2, h / 2, { al: 'center', cor: T.tintaMuda }); return; }
    const ml = 40, mr = 18, mt = 12, mb = 20;
    const gw = w - ml - mr, gh = h - mt - mb;
    const vs = historico.map(x => x.ssd);
    const y1 = Math.max(...vs) * 1.15 + 40, y0 = 0;
    const N = Math.max(1, historico.length - 1);
    const X = (i) => ml + gw * i / N;
    const Y = (v) => mt + gh - gh * U.clamp((v - y0) / (y1 - y0), 0, 1);

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 3; k++) {
      const v = y0 + (y1 - y0) * k / 3, y = Math.round(Y(v)) + 0.5;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      txt(c, Math.round(v) + 'ms', ml - 4, y, { cor: T.tintaMuda, tam: 8, al: 'right' });
    }
    if (ssd50) {
      c.save(); c.setLineDash([5, 4]); c.strokeStyle = T.atencao; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(ml, Y(ssd50)); c.lineTo(w - mr, Y(ssd50)); c.stroke(); c.restore();
      txt(c, `equilíbrio ${Math.round(ssd50)}ms`, w - mr - 2, Y(ssd50) - 7, { cor: T.atencao, tam: 8, peso: 700, al: 'right' });
    }
    c.beginPath();
    historico.forEach((d, i) => { const p = [X(i), Y(d.ssd)]; i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
    c.strokeStyle = T.tintaMuda; c.lineWidth = 1.6; c.stroke();
    historico.forEach((d, i) => {
      const x = X(i), y = Y(d.ssd);
      c.beginPath(); c.arc(x, y, 4, 0, 6.2832);
      c.fillStyle = d.parou ? T.bom : T.critico; c.fill();
      c.lineWidth = 1.6; c.strokeStyle = T.superficie; c.stroke();
      marcar(cv, x, y, `tentativa ${i + 1}<br>atraso do sinal: <b>${Math.round(d.ssd)}ms</b><br>${d.parou ? '<b>conseguiu parar</b>' : '<b>não conseguiu</b>'}`, 20);
    });
    txt(c, '● parou', ml, mt + gh + 12, { cor: T.bom, tam: 8, peso: 700 });
    txt(c, '● não parou', ml + 52, mt + gh + 12, { cor: T.critico, tam: 8, peso: 700 });
  }

  /* ============================================================
     8) COMPOSIÇÃO DE ERROS ao longo das sessões (100% empilhado)
        No máximo 4 categorias + "outros" — nunca 9 cores.
     ============================================================ */
  function composicao(cv, sessoes, categorias) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 140);
    if (!sessoes.length) { txt(c, 'sem erros registrados', w / 2, h / 2, { al: 'center', cor: T.tintaMuda }); return; }
    const ml = 26, mr = 10, mt = 10, mb = 20;
    const gw = w - ml - mr, gh = h - mt - mb;
    const bw = Math.min(28, gw / sessoes.length - 4);

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 2; k++) {
      const y = Math.round(mt + gh - gh * k / 2) + 0.5;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      txt(c, (k * 50) + '%', ml - 4, y, { cor: T.tintaMuda, tam: 8, al: 'right' });
    }

    sessoes.forEach((s, i) => {
      const x = ml + (gw / sessoes.length) * (i + 0.5) - bw / 2;
      const total = categorias.reduce((a, k) => a + (s.erros[k.id] || 0), 0);
      if (!total) {
        c.fillStyle = 'rgba(255,255,255,.05)';
        c.fillRect(x, mt, bw, gh);
        marcar(cv, x + bw / 2, mt + gh / 2, `<b>${s.rotulo}</b><br>nenhum erro`, 26);
        return;
      }
      let acc = 0;
      categorias.forEach((cat, j) => {
        const v = (s.erros[cat.id] || 0) / total;
        if (!v) return;
        const hh = gh * v;
        const y = mt + gh - acc - hh;
        c.fillStyle = cat.cor;
        c.fillRect(x, y + 1, bw, Math.max(1, hh - 2));     // 2px de superfície entre fatias
        acc += hh;
      });
      marcar(cv, x + bw / 2, mt + gh / 2,
        `<b>${s.rotulo}</b><br>` + categorias.filter(k => s.erros[k.id])
          .map(k => `${k.nome}: <b>${Math.round((s.erros[k.id] / total) * 100)}%</b>`).join('<br>'), 26);
      txt(c, s.rotulo, x + bw / 2, mt + gh + 9, { cor: T.tintaMuda, tam: 7.5, al: 'center' });
    });
  }

  /* ============================================================
     9) MINIGRÁFICO — tendência de um exercício
     ============================================================ */
  function mini(cv, dados, opts = {}) {
    const { c, w, h } = prep(cv, opts.h || 26);
    if (dados.length < 2) return;
    const max = Math.max(...dados, 100), min = 0;
    const X = (i) => 2 + (w - 4) * i / (dados.length - 1);
    const Y = (v) => h - 3 - (h - 6) * U.clamp((v - min) / (max - min), 0, 1);
    c.beginPath();
    dados.forEach((v, i) => i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)));
    c.strokeStyle = opts.cor || T.serie[0]; c.lineWidth = 1.6; c.stroke();
    const ult = dados[dados.length - 1];
    c.beginPath(); c.arc(X(dados.length - 1), Y(ult), 2.6, 0, 6.2832);
    c.fillStyle = opts.cor || T.serie[0]; c.fill();
  }

  /* ============================================================
     10) DISPERSÃO DO TOQUE — onde o dedo realmente cai
     ============================================================ */
  function toques(cv, botoes) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 160);
    if (!botoes.length) { txt(c, 'sem toques registrados', w / 2, h / 2, { al: 'center', cor: T.tintaMuda }); return; }
    const cols = Math.min(botoes.length, 4);
    const cw = w / cols, ch = h / Math.ceil(botoes.length / cols);
    botoes.forEach((b, i) => {
      const cx = cw * (i % cols) + cw / 2, cy = ch * Math.floor(i / cols) + ch / 2 - 4;
      const R = Math.min(cw, ch) * 0.32;
      c.strokeStyle = T.eixo; c.lineWidth = 1.4;
      c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.stroke();
      c.strokeStyle = T.grade;
      c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy);
      c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
      c.fillStyle = T.serie[0] + 'aa';
      for (const p of b.pontos.slice(-40)) {
        c.beginPath(); c.arc(cx + p.dx * R, cy + p.dy * R, 1.8, 0, 6.2832); c.fill();
      }
      // centro médio + elipse de dispersão
      const mx = U.mean(b.pontos.map(p => p.dx)), my = U.mean(b.pontos.map(p => p.dy));
      const sx = U.sd(b.pontos.map(p => p.dx)) || 0.05, sy = U.sd(b.pontos.map(p => p.dy)) || 0.05;
      const fora = Math.hypot(mx, my) + Math.max(sx, sy) > 0.85;
      c.strokeStyle = fora ? T.critico : T.bom; c.lineWidth = 2;
      c.beginPath(); c.ellipse(cx + mx * R, cy + my * R, Math.max(3, sx * R), Math.max(3, sy * R), 0, 0, 6.2832); c.stroke();
      c.beginPath(); c.arc(cx + mx * R, cy + my * R, 2.6, 0, 6.2832); c.fillStyle = fora ? T.critico : T.bom; c.fill();
      txt(c, b.nome, cx, cy + R + 10, { cor: T.tintaSec, tam: 8.5, peso: 700, al: 'center' });
      marcar(cv, cx, cy, `<b>${b.nome}</b><br>${b.pontos.length} toques<br>desvio médio: <b>${Math.round(Math.hypot(mx, my) * 100)}%</b> do raio<br>dispersão: ±${Math.round(Math.max(sx, sy) * 100)}%${fora ? '<br><b>risco de encostar no vizinho</b>' : ''}`, 30);
    });
  }

  U.G = { radar, linha, barras, fitts, velAcc, antecipacao, escada, composicao, mini, toques, T, esconderDica: esconder };

})(window.U);
