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
    if (!dados.length) return vazio(c, w, h, 'faça o exercício Leitura');
    const ml = 36, mr = 26, mt = 12, mb = 26;
    const gw = w - ml - mr, gh = h - mt - mb;
    const N = Math.max(1, dados.length - 1);
    const X = (i) => ml + gw * (dados.length === 1 ? 0.5 : i / N);
    const Y = (v) => mt + gh - gh * U.clamp(v, 0, 1);

    c.strokeStyle = T.grade; c.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const y = Math.round(mt + gh - gh * k / 4) + 0.5;
      c.beginPath(); c.moveTo(ml, y); c.lineTo(w - mr, y); c.stroke();
      txt(c, (k * 25) + '%', ml - 4, y, { cor: T.tintaMuda, tam: 8, al: 'right' });
    }
    const acaso = opts.acaso ?? 0.25;
    c.save(); c.setLineDash([4, 3]); c.strokeStyle = T.critico; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(ml, Y(acaso)); c.lineTo(w - mr, Y(acaso)); c.stroke(); c.restore();
    txt(c, 'acaso', ml + 3, Y(acaso) - 7, { cor: T.critico, tam: 7.5, peso: 700 });

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
      txt(c, d.janela + 'ms', U.clamp(x, ml + 14, w - mr - 14), mt + gh + 10,
          { cor: ref ? T.atencao : T.tintaMuda, tam: 8, al: 'center', peso: ref ? 800 : 600 });
      marcar(cv, x, y, `<b>${d.janela} ms de visão</b><br>acerto <b>${Math.round(d.p * 100)}%</b>` +
        (d.lo != null ? `<br>intervalo ${Math.round(d.lo * 100)}–${Math.round(d.hi * 100)}%` : '') +
        `<br>${d.n} tentativas` + (ref ? '<br><b>janela de referência</b>' : ''), 24);
    });
    txt(c, '← menos informação', ml, mt + gh + 21, { cor: T.tintaMuda, tam: 7.5 });
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

  U.G = { linhaIC, barrasIC, curvaIC, fitts, toques, medidor, T, esconderDica: esconder };

})(window.U);
