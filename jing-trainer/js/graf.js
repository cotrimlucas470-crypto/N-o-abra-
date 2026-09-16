/* ============================================================
   graf.js — gráficos em canvas: radar, linha, barras
   Legibilidade primeiro: pouca tinta, eixos rotulados, nada
   de efeito que atrapalhe a leitura no meio de uma sessão.
   ============================================================ */
'use strict';
(function (U) {

  const CORES = ['#a78bfa', '#4ee0ff', '#e8c46a', '#3ddc97', '#ff8a5c', '#ff5470', '#7fa8d0', '#c4b5fd'];

  function prep(cv, alturaCss) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = cv.clientWidth || 300;
    const h = alturaCss || cv.clientHeight || 160;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.height = h + 'px';
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    return { c, w, h };
  }

  /** Radar de 8 eixos. series = [{valores:{eixo:v}, cor, nome, preenche}] */
  function radar(cv, eixos, series, alvos) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 200);
    const cx = w / 2, cy = h / 2 + 2, R = Math.min(w, h) / 2 - 26;
    const n = eixos.length;
    const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / n;

    // teia
    c.strokeStyle = 'rgba(125,155,205,.16)'; c.lineWidth = 1;
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

    // alvo (linha dourada tracejada)
    if (alvos) {
      c.save(); c.setLineDash([3, 3]); c.strokeStyle = 'rgba(232,196,106,.7)'; c.lineWidth = 1.4;
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const r = R * U.clamp(alvos[eixos[i].id] / 100, 0, 1);
        const x = cx + Math.cos(ang(i)) * r, y = cy + Math.sin(ang(i)) * r;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath(); c.stroke(); c.restore();
    }

    // séries
    series.forEach((s) => {
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const r = R * U.clamp((s.valores[eixos[i].id] || 0) / 100, 0, 1);
        const x = cx + Math.cos(ang(i)) * r, y = cy + Math.sin(ang(i)) * r;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
      if (s.preenche !== false) {
        c.fillStyle = s.cor + '33'; c.fill();
      }
      c.strokeStyle = s.cor; c.lineWidth = s.grossura || 2.2; c.stroke();
      if (s.pontos !== false) {
        for (let i = 0; i < n; i++) {
          const r = R * U.clamp((s.valores[eixos[i].id] || 0) / 100, 0, 1);
          c.beginPath(); c.arc(cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r, 2.6, 0, 6.2832);
          c.fillStyle = s.cor; c.fill();
        }
      }
    });

    // rótulos
    c.font = '700 8.5px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const x = cx + Math.cos(ang(i)) * (R + 15), y = cy + Math.sin(ang(i)) * (R + 13);
      c.fillStyle = '#93a4c2';
      c.fillText(eixos[i].curto || eixos[i].nome, x, y);
    }
  }

  /** Linha temporal. series = [{dados:[n], cor, nome}] rotulos = [] */
  function linha(cv, series, rotulos, opts = {}) {
    const { c, w, h } = prep(cv, cv.dataset.h ? +cv.dataset.h : 150);
    const ml = 26, mr = 8, mt = 10, mb = 18;
    const gw = w - ml - mr, gh = h - mt - mb;
    const max = opts.max ?? 100, min = opts.min ?? 0;
    const N = Math.max(1, rotulos.length - 1);

    c.strokeStyle = 'rgba(125,155,205,.13)'; c.lineWidth = 1;
    c.font = '600 8px system-ui'; c.fillStyle = '#66748f'; c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) {
      const v = min + (max - min) * k / 4, y = mt + gh - gh * k / 4;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      c.fillText(Math.round(v), ml - 4, y);
    }
    const X = (i) => ml + gw * (N ? i / N : 0.5);
    const Y = (v) => mt + gh - gh * U.clamp((v - min) / (max - min), 0, 1);

    series.forEach((s) => {
      const pts = s.dados.map((v, i) => [X(i), Y(v)]);
      if (s.area) {
        c.beginPath(); c.moveTo(pts[0][0], mt + gh);
        pts.forEach(p => c.lineTo(p[0], p[1]));
        c.lineTo(pts[pts.length - 1][0], mt + gh); c.closePath();
        c.fillStyle = s.cor + '22'; c.fill();
      }
      c.beginPath();
      pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
      c.strokeStyle = s.cor; c.lineWidth = 2; c.stroke();
      pts.forEach(p => { c.beginPath(); c.arc(p[0], p[1], 2.6, 0, 6.2832); c.fillStyle = s.cor; c.fill(); });
    });

    c.fillStyle = '#66748f'; c.textAlign = 'center'; c.textBaseline = 'top';
    const passo = Math.max(1, Math.ceil(rotulos.length / 6));
    rotulos.forEach((r, i) => { if (i % passo === 0 || i === rotulos.length - 1) c.fillText(r, X(i), mt + gh + 4); });
  }

  /** Barras horizontais rotuladas. dados = [{nome, valor, cor}] */
  function barras(cv, dados, opts = {}) {
    const alt = Math.max(60, dados.length * 22 + 10);
    const { c, w } = prep(cv, alt);
    const max = opts.max || Math.max(1, ...dados.map(d => d.valor));
    const ml = opts.ml || 76;
    dados.forEach((d, i) => {
      const y = 6 + i * 22;
      c.font = '700 9.5px system-ui'; c.textAlign = 'right'; c.textBaseline = 'middle';
      c.fillStyle = '#93a4c2'; c.fillText(d.nome, ml - 6, y + 7);
      c.fillStyle = 'rgba(255,255,255,.06)';
      c.fillRect(ml, y + 1, w - ml - 26, 13);
      const bw = (w - ml - 26) * U.clamp(d.valor / max, 0, 1);
      const g = c.createLinearGradient(ml, 0, ml + bw, 0);
      g.addColorStop(0, (d.cor || '#a78bfa') + 'cc'); g.addColorStop(1, d.cor || '#a78bfa');
      c.fillStyle = g; c.fillRect(ml, y + 1, bw, 13);
      c.textAlign = 'left'; c.fillStyle = '#e8eefc'; c.font = '800 9.5px system-ui';
      c.fillText(opts.fmt ? opts.fmt(d.valor) : String(Math.round(d.valor)), ml + bw + 5, y + 7);
    });
  }

  U.G = { radar, linha, barras, CORES };

})(window.U);
