/* ============================================================
   hud.js — Réplica 1:1 do HUD da Jing + superfície de toque
   Geometria extraída do print enviado (2000x901 ≈ 20:9),
   normalizada para fração da viewport do jogo. O Poco X7 Pro
   (1220x2712, 6.67", ~160.3 x 71.7 mm em paisagem) é a régua.
   ============================================================ */
'use strict';
(function (U) {

  /* Tela física de referência, em milímetros (paisagem) */
  const TELA_MM = { w: 160.3, h: 71.7 };

  /* ---------- Geometria medida no print ----------
     x,y = centro normalizado (0..1). r = raio normalizado pela LARGURA.  */
  const HUD_PADRAO = {
    joy:   { x: 0.136, y: 0.822, r: 0.044, tipo: 'joy',  nome: 'Movimento',    curto: 'MOV',  cor: '#7fd4ff' },
    s1:    { x: 0.735, y: 0.877, r: 0.031, tipo: 'hab',  nome: 'Habilidade 1', curto: '1',    cor: '#a78bfa' },
    s2:    { x: 0.800, y: 0.710, r: 0.0325,tipo: 'hab',  nome: 'Habilidade 2', curto: '2',    cor: '#a78bfa' },
    s3:    { x: 0.870, y: 0.552, r: 0.034, tipo: 'ult',  nome: 'Ultimate',     curto: '3',    cor: '#c4b5fd' },
    aa:    { x: 0.939, y: 0.880, r: 0.040, tipo: 'aa',   nome: 'Ataque',       curto: 'AA',   cor: '#9fb6d4' },
    pass:  { x: 0.7975,y: 0.505, r: 0.0225,tipo: 'info', nome: 'Passiva',      curto: 'P',    cor: '#6b7a91' },
    it1:   { x: 0.950, y: 0.688, r: 0.017, tipo: 'item', nome: 'Item ativo',   curto: 'I1',   cor: '#7fa8d0' },
    it2:   { x: 0.806, y: 0.915, r: 0.0165,tipo: 'item', nome: 'Item (elmo)',  curto: 'I2',   cor: '#7fa8d0' },
    flash: { x: 0.6525,y: 0.897, r: 0.0225,tipo: 'inv',  nome: 'Invocador',    curto: 'FL',   cor: '#f472b6' },
    cura:  { x: 0.595, y: 0.897, r: 0.022, tipo: 'sis',  nome: 'Recuperar',    curto: 'REC',  cor: '#6ee7a8' },
    volta: { x: 0.534, y: 0.897, r: 0.022, tipo: 'sis',  nome: 'Retornar',     curto: 'RET',  cor: '#7dd3fc' },
  };

  /** Quebra um texto em linhas que cabem na largura, por palavra. */
  function quebrarLinhas(c, txt, larg) {
    const out = [];
    let linha = '';
    for (const p of txt.split(' ')) {
      const teste = linha ? linha + ' ' + p : p;
      if (c.measureText(teste).width > larg && linha) { out.push(linha); linha = p; }
      else linha = teste;
    }
    if (linha) out.push(linha);
    return out.length ? out : [''];
  }

  /** Direção de um vetor de tela em palavras. y cresce para BAIXO. */
  function direcaoPt(dx, dy) {
    const nomes = ['a direita', 'baixo-direita', 'baixo', 'baixo-esquerda',
                   'a esquerda', 'cima-esquerda', 'cima', 'cima-direita'];
    const k = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
    return nomes[k];
  }

  /* Botões que contam como entrada de combate */
  const ACIONAVEIS = ['s1', 's2', 's3', 'aa', 'flash', 'it1', 'it2'];
  /* Botões que, se tocados sem querer, são erro de HUD e não de memória */
  const ARMADILHAS = ['it1', 'it2', 'pass', 'cura', 'volta'];

  const NOMES = {
    joy: 'Movimento', s1: 'Hab. 1', s2: 'Hab. 2', s3: 'Ultimate', aa: 'Ataque',
    flash: 'Invocador', it1: 'Item 1', it2: 'Item 2', pass: 'Passiva',
    cura: 'Recuperar', volta: 'Retornar',
  };

  function getHud() {
    const d = U.DB.load();
    if (!d.hud) { d.hud = JSON.parse(JSON.stringify(HUD_PADRAO)); U.DB.save(); }
    // completa chaves novas sem apagar calibração do usuário
    for (const k in HUD_PADRAO) {
      if (!d.hud[k]) d.hud[k] = { ...HUD_PADRAO[k] };
      else for (const p in HUD_PADRAO[k]) if (!(p in d.hud[k])) d.hud[k][p] = HUD_PADRAO[k][p];
    }
    return d.hud;
  }
  function resetHud() { U.DB.load().hud = JSON.parse(JSON.stringify(HUD_PADRAO)); U.DB.save(); }

  /* ---------- Análise ergonômica ---------- */
  const mmX = (dx) => dx * TELA_MM.w;
  const mmY = (dy) => dy * TELA_MM.h;
  function distMM(a, b) { return Math.hypot(mmX(a.x - b.x), mmY(a.y - b.y)); }
  function raioMM(b) { return b.r * TELA_MM.w; }
  /** Folga entre as bordas de dois botões, em mm. Negativo = sobreposição. */
  function folgaMM(a, b) { return distMM(a, b) - raioMM(a) - raioMM(b); }

  /** Percurso de polegar entre dois botões, em mm. */
  function percurso(hud, a, b) { return distMM(hud[a], hud[b]); }

  /**
   * Relatório ergonômico do HUD atual.
   * Um polegar adulto encosta num círculo de ~9-13 mm. Abaixo de ~5 mm de
   * folga entre bordas, o toque rápido começa a encostar no vizinho.
   */
  function analisarHud(hud = getHud()) {
    const riscos = [];
    const chaves = Object.keys(hud);
    for (let i = 0; i < chaves.length; i++) {
      for (let j = i + 1; j < chaves.length; j++) {
        const a = chaves[i], b = chaves[j];
        if (a === 'joy' || b === 'joy') continue;
        const f = folgaMM(hud[a], hud[b]);
        if (f < 6.0) {
          const critico = ACIONAVEIS.includes(a) && (ACIONAVEIS.includes(b) || ARMADILHAS.includes(b))
                       || ACIONAVEIS.includes(b) && ARMADILHAS.includes(a);
          riscos.push({
            a, b, folga: f,
            grau: f < 2.5 ? 'alto' : f < 4.5 ? 'medio' : 'baixo',
            critico: !!critico,
          });
        }
      }
    }
    riscos.sort((x, y) => x.folga - y.folga);

    const rotas = [
      ['s1', 's2'], ['s2', 's3'], ['s1', 's3'], ['s1', 'aa'], ['s2', 'aa'],
      ['s3', 'aa'], ['aa', 'flash'], ['s1', 'flash'], ['s3', 'flash'],
    ].map(([a, b]) => ({ a, b, mm: percurso(hud, a, b) }))
      .sort((x, y) => y.mm - x.mm);

    // Corredor mais usado: s1 -> aa. Quem estiver perto dessa linha atrapalha.
    const corredor = [];
    const A = hud.s1, B = hud.aa;
    for (const k of ARMADILHAS) {
      const P = hud[k];
      const vx = mmX(B.x - A.x), vy = mmY(B.y - A.y);
      const wx = mmX(P.x - A.x), wy = mmY(P.y - A.y);
      const L2 = vx * vx + vy * vy;
      const t = U.clamp(L2 ? (wx * vx + wy * vy) / L2 : 0, 0, 1);
      const d = Math.hypot(wx - vx * t, wy - vy * t) - raioMM(P);
      if (d < 8) corredor.push({ k, dist: d });
    }
    corredor.sort((x, y) => x.dist - y.dist);

    const arco = percurso(hud, 's1', 's3');
    return { riscos, rotas, corredor, arco, telaMM: TELA_MM };
  }

  /* ============================================================
     HudSurface — canvas interativo com multitoque real
     ============================================================ */
  class HudSurface {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} opts { onPress, onRelease, onJoy, modoCalibra }
     */
    constructor(canvas, opts = {}) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = opts;
      this.hud = getHud();
      this.box = { x: 0, y: 0, w: 1, h: 1 };
      this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);

      this.estado = {};                 // id -> {destaque, cd, bloqueado, rotulo, pulso}
      this.joy = { ativo: false, cx: 0, cy: 0, dx: 0, dy: 0, ang: 0, mag: 0 };
      this.ponteiros = new Map();       // pointerId -> {id, x, y, t}
      this.efeitos = [];                // anéis / cacos
      this.overlay = null;              // {tipo, texto, cor} desenhado sobre o HUD
      this.alvoVisual = null;           // {x,y,r,cor,rotulo} — alvo no campo
      this.travado = false;             // ignora toques (entre tentativas)
      this.quadrantes = false;          // mão esquerda vira 4 zonas (dupla tarefa)
      this.campo = [];                  // cartas/alvos tocáveis no campo
      this.trilhas = [];                // ruído visual
      this.quadAceso = -1;              // quadrante piscando agora
      this.mapa = null;                 // minimapa do treino de visão de mapa
      this.mira = null;                 // cena do treino de mira: herói, alvo, guia
      this.arrastoMira = null;          // arrasto em curso a partir de um botão
      this.nuvem = null;                // dispersão do polegar, desenhada ao vivo
      this.ocultarBotoes = false;       // exercício que não usa o HUD de combate
      this.calibrando = false;
      this.arrastando = null;

      this._bind();
      this.resize();
      this.ticker = new U.Ticker(() => this.draw());
      this.ticker.start();
    }

    destroy() {
      this.ticker.stop();
      this._unbind();
    }

    /* ---------- layout ---------- */
    resize() {
      const r = this.cv.getBoundingClientRect();
      const w = Math.max(320, r.width), h = Math.max(180, r.height);
      this.cv.width = Math.round(w * this.dpr);
      this.cv.height = Math.round(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // O HUD ocupa a área toda, preservando 20:9 (a proporção do celular)
      const alvo = 2712 / 1220;
      let bw = w, bh = w / alvo;
      if (bh > h) { bh = h; bw = h * alvo; }
      this.box = { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh };
      this.vw = w; this.vh = h;
    }

    px(b) { return { x: this.box.x + b.x * this.box.w, y: this.box.y + b.y * this.box.h, r: b.r * this.box.w }; }

    /** Converte coordenada de ponteiro em coordenada do canvas. */
    local(ev) {
      const r = this.cv.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    }

    /** Qual botão foi tocado. Tolerância generosa, mas registra o desvio. */
    acertou(x, y) {
      let melhor = null, melhorD = Infinity, mdx = 0, mdy = 0;
      for (const id in this.hud) {
        const b = this.hud[id];
        if (b.tipo === 'joy') continue;
        const p = this.px(b);
        const d = Math.hypot(x - p.x, y - p.y);
        const rel = d / p.r;                       // 0 = centro exato
        if (rel < melhorD) { melhorD = rel; melhor = id; mdx = (x - p.x) / p.r; mdy = (y - p.y) / p.r; }
      }
      // dx/dy: posição do toque DENTRO do botão, em fração do raio.
      // É o dado que monta o gráfico de dispersão do polegar.
      if (melhorD <= 1.0)  return { id: melhor, rel: melhorD, dx: mdx, dy: mdy, tipo: 'limpo' };
      if (melhorD <= 1.75) return { id: melhor, rel: melhorD, dx: mdx, dy: mdy, tipo: 'borda' };
      return { id: null, rel: melhorD, dx: mdx, dy: mdy, tipo: 'vazio', perto: melhor };
    }

    /* ---------- entrada ---------- */
    _bind() {
      this._d = (e) => this.onDown(e);
      this._m = (e) => this.onMove(e);
      this._u = (e) => this.onUp(e);
      this._r = () => this.resize();
      this.cv.addEventListener('pointerdown', this._d, { passive: false });
      window.addEventListener('pointermove', this._m, { passive: false });
      window.addEventListener('pointerup', this._u, { passive: false });
      window.addEventListener('pointercancel', this._u, { passive: false });
      window.addEventListener('resize', this._r);
      this.cv.style.touchAction = 'none';
    }
    _unbind() {
      this.cv.removeEventListener('pointerdown', this._d);
      window.removeEventListener('pointermove', this._m);
      window.removeEventListener('pointerup', this._u);
      window.removeEventListener('pointercancel', this._u);
      window.removeEventListener('pointercancel', this._u);
      window.removeEventListener('resize', this._r);
    }

    onDown(ev) {
      ev.preventDefault();
      U.Sfx.unlock();
      const p = this.local(ev);
      const t = U.now();

      if (this.calibrando) {
        let alvo = null, dmin = Infinity;
        for (const id in this.hud) {
          const q = this.px(this.hud[id]);
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < Math.max(q.r * 1.4, 26) && d < dmin) { dmin = d; alvo = id; }
        }
        if (alvo) { this.arrastando = { id: alvo, pid: ev.pointerId }; this.opts.onSelecionar?.(alvo); }
        return;
      }
      /* Minimapa: só intercepta quando o exercício está de fato
         pedindo um toque nele. Fora disso ele é figura. */
      if (this.mapa && this.mapa.tocavel) {
        const r = this.mapaPx();
        if (p.x >= r.x && p.x <= r.x + r.s && p.y >= r.y && p.y <= r.y + r.s) {
          this.efeitos.push({ t: 0, tipo: 'anel', x: p.x, y: p.y, r: 22, cor: '#7fd4ff' });
          U.Haptic.tap();
          this.opts.onMapa?.({ x: (p.x - r.x) / r.s, y: (p.y - r.y) / r.s, t });
          return;
        }
      }

      /* Alvo tocável no campo (tarefa secundária do treino de mapa).
         Só quem marca o alvo como tocável entra aqui — os motores que
         usam setAlvo só para mostrar onde mirar continuam iguais. */
      if (this.alvoVisual && this.alvoVisual.tocavel) {
        const B = this.box, a = this.alvoVisual;
        const ax = B.x + a.x * B.w, ay = B.y + a.y * B.h, ar = (a.r || 0.035) * B.w;
        if (Math.hypot(p.x - ax, p.y - ay) <= ar * 1.3) {
          this.efeitos.push({ t: 0, tipo: 'anel', x: ax, y: ay, r: ar, cor: a.cor || '#ffd479' });
          U.Haptic.tap();
          this.opts.onAlvo?.({ t });
          return;
        }
      }

      if (this.travado) return;

      // cartas no campo (prioridade de alvo, cenários)
      for (const cta of this.campo) {
        const q = this.cartaPx(cta);
        if (p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) {
          cta.pulso = 1;
          this.opts.onCampo?.({ id: cta.id, carta: cta, t });
          return;
        }
      }

      // exercício sem HUD de combate: analógico e botões não existem
      if (this.ocultarBotoes) return;

      // metade esquerda = analógico  (ou 4 quadrantes, na dupla tarefa)
      const joyP = this.px(this.hud.joy);
      const zonaJoy = p.x < this.box.x + this.box.w * 0.42;
      if (zonaJoy && this.quadrantes) {
        const rx = (p.x - this.box.x) / (this.box.w * 0.42);
        const ry = (p.y - this.box.y) / this.box.h;
        const q = (ry < 0.5 ? 0 : 2) + (rx < 0.5 ? 0 : 1);
        this.efeitos.push({ t: 0, tipo: 'anel', x: p.x, y: p.y, r: 26, cor: '#7fd4ff' });
        U.Haptic.tap();
        this.opts.onPress?.({ id: 'q' + q, tipo: 'quadrante', rel: 0, x: p.x, y: p.y, t, precisao: 1, joy: this.joyInfo() });
        return;
      }
      if (zonaJoy) {
        this.joy.ativo = true; this.joy.pid = ev.pointerId;
        this.joy.cx = joyP.x; this.joy.cy = joyP.y;
        this.updJoy(p);
        this.ponteiros.set(ev.pointerId, { id: 'joy', t });
        this.opts.onJoyStart?.(this.joyInfo());
        return;
      }

      const hit = this.acertou(p.x, p.y);
      this.ponteiros.set(ev.pointerId, { id: hit.id, t });

      /* ------------------------------------------------------------
         ARRASTO DE MIRA

         No Honor of Kings quase toda habilidade de dano é apontada
         segurando o botão dela e arrastando: a direção do arrasto vira
         a direção do tiro. Até aqui o HudSurface só sabia arrastar o
         analógico — soltar um botão devolvia a duração e mais nada —
         então a habilidade mecânica mais usada do jogo não tinha como
         ser medida.

         O arrasto só é capturado quando o exercício pede (this.mira
         ligado). Fora disso o botão continua sendo um toque simples,
         que é o que os outros exercícios esperam.
         ------------------------------------------------------------ */
      if (this.mira && hit.id && (this.mira.botoes || ['s1', 's2', 's3']).includes(hit.id)) {
        const q = this.px(this.hud[hit.id]);
        this.arrastoMira = { pid: ev.pointerId, id: hit.id, x0: q.x, y0: q.y,
                             x: p.x, y: p.y, t0: t, moveu: false };
        this.pulsar(hit.id);
        U.Haptic.tap();
        this.opts.onMiraInicio?.({ id: hit.id, t });
        return;
      }

      if (hit.id) {
        this.pulsar(hit.id);
        U.Haptic.tap();
      } else {
        this.caco(p.x, p.y, '#6b7a91', 5);
      }
      /* Registro de alta precisão. Fica aqui, no momento do toque, e
         não no fim do set: tamanho do contato e pressão só existem
         dentro do evento, e de onde o dedo veio só é conhecido aqui. */
      if (U.TQ && !this.opts.semRegistro) {
        U.TQ.gravar({ x: p.x, y: p.y, box: this.box, id: hit.id, perto: hit.perto,
                      tipo: hit.tipo, t, ev, drill: this.opts.drillId || null });
      }
      this.opts.onPress?.({
        id: hit.id, tipo: hit.tipo, rel: hit.rel, perto: hit.perto,
        dx: hit.dx, dy: hit.dy,
        x: p.x, y: p.y, t,
        precisao: hit.id ? U.clamp(1 - hit.rel, 0, 1) : 0,
        joy: this.joyInfo(),
      });
    }

    onMove(ev) {
      if (this.calibrando && this.arrastando && this.arrastando.pid === ev.pointerId) {
        ev.preventDefault();
        const p = this.local(ev);
        const b = this.hud[this.arrastando.id];
        b.x = U.clamp((p.x - this.box.x) / this.box.w, 0.02, 0.98);
        b.y = U.clamp((p.y - this.box.y) / this.box.h, 0.04, 0.97);
        return;
      }
      if (this.arrastoMira && this.arrastoMira.pid === ev.pointerId) {
        ev.preventDefault();
        const p = this.local(ev);
        this.arrastoMira.x = p.x; this.arrastoMira.y = p.y;
        const a = this.miraInfo();
        if (a.mag > 0.12) this.arrastoMira.moveu = true;
        this.opts.onMiraMove?.(a);
        return;
      }
      if (this.joy.ativo && this.joy.pid === ev.pointerId) {
        ev.preventDefault();
        this.updJoy(this.local(ev));
        this.opts.onJoy?.(this.joyInfo());
      }
    }

    /**
     * Estado do arrasto de mira.
     * `ang` em radianos no referencial da tela (0 = direita, cresce para baixo).
     * `mag` em fração do raio do botão — passa de 1 quando o dedo sai dele,
     * que é o normal: o alcance do arrasto não é limitado pelo botão.
     */
    miraInfo() {
      const a = this.arrastoMira;
      if (!a) return { ativo: false, ang: null, mag: 0, id: null, moveu: false };
      const r = this.px(this.hud[a.id]).r || 1;
      const dx = a.x - a.x0, dy = a.y - a.y0;
      return { ativo: true, id: a.id, dx, dy, ang: Math.atan2(dy, dx),
               mag: Math.hypot(dx, dy) / r, moveu: a.moveu, t0: a.t0 };
    }

    onUp(ev) {
      if (this.arrastoMira && this.arrastoMira.pid === ev.pointerId) {
        const a = this.miraInfo();
        this.arrastoMira = null;
        this.opts.onMiraSolta?.({ ...a, dur: U.now() - a.t0 });
        return;
      }
      if (this.calibrando && this.arrastando && this.arrastando.pid === ev.pointerId) {
        this.arrastando = null; U.DB.save(); this.opts.onCalibrado?.(); return;
      }
      if (this.joy.ativo && this.joy.pid === ev.pointerId) {
        this.joy.ativo = false; this.joy.dx = 0; this.joy.dy = 0; this.joy.mag = 0;
        this.opts.onJoyEnd?.();
      }
      const rec = this.ponteiros.get(ev.pointerId);
      if (rec) {
        this.ponteiros.delete(ev.pointerId);
        if (rec.id && rec.id !== 'joy') this.opts.onRelease?.({ id: rec.id, dur: U.now() - rec.t });
      }
    }

    updJoy(p) {
      const r = this.px(this.hud.joy).r;
      let dx = p.x - this.joy.cx, dy = p.y - this.joy.cy;
      const m = Math.hypot(dx, dy);
      const lim = r * 1.15;
      if (m > lim) { dx *= lim / m; dy *= lim / m; }
      this.joy.dx = dx; this.joy.dy = dy;
      this.joy.mag = U.clamp(Math.hypot(dx, dy) / lim, 0, 1);
      this.joy.ang = Math.atan2(dy, dx);
    }
    joyInfo() {
      return { ativo: this.joy.ativo, ang: this.joy.ang, mag: this.joy.mag,
               dir: this.joy.mag > 0.28 ? this.setor(this.joy.ang) : null };
    }
    /** 8 direções: 0=direita, sentido horário. */
    setor(ang) {
      let a = (ang * 180 / Math.PI + 360) % 360;
      return Math.round(a / 45) % 8;
    }

    /* ---------- API visual ---------- */
    marcar(id, opt = {}) { this.estado[id] = { ...(this.estado[id] || {}), ...opt }; }
    limparMarcas() { this.estado = {}; }
    pulsar(id) { const s = this.estado[id] || (this.estado[id] = {}); s.pulso = 1; }
    acerto(id) {
      const p = this.px(this.hud[id] || this.hud.aa);
      this.efeitos.push({ t: 0, tipo: 'anel', x: p.x, y: p.y, r: p.r, cor: '#6ee7a8' });
      this.caco(p.x, p.y, '#9df5c4', 8);
    }
    erro(id) {
      const b = this.hud[id];
      const p = b ? this.px(b) : { x: this.box.x + this.box.w * 0.8, y: this.box.y + this.box.h * 0.75, r: 30 };
      this.efeitos.push({ t: 0, tipo: 'anel', x: p.x, y: p.y, r: p.r, cor: '#ff5470' });
      this.caco(p.x, p.y, '#ff8fa3', 12);
    }
    caco(x, y, cor, n = 8) {
      if (U.DB.load().opts.fx === 'baixo') n = Math.min(n, 3);
      for (let i = 0; i < n; i++) {
        const a = U.rnd(0, Math.PI * 2), v = U.rnd(0.6, 3.2);
        this.efeitos.push({ t: 0, tipo: 'caco', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                            rot: U.rnd(0, 6.28), vr: U.rnd(-0.2, 0.2), s: U.rnd(3, 9), cor });
      }
    }
    setOverlay(o) { this.overlay = o; }
    setAlvo(a) { this.alvoVisual = a; }

    /* ---------- desenho ---------- */
    draw() {
      const c = this.ctx, B = this.box;
      c.clearRect(0, 0, this.vw, this.vh);

      // campo
      const g = c.createLinearGradient(B.x, B.y, B.x + B.w, B.y + B.h);
      g.addColorStop(0, '#0b1220'); g.addColorStop(0.5, '#0d1524'); g.addColorStop(1, '#0a0f1b');
      c.fillStyle = g; c.fillRect(B.x, B.y, B.w, B.h);

      // grade sutil de espelho
      c.save(); c.globalAlpha = 0.16; c.strokeStyle = '#2a3c5c'; c.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        const x = B.x + B.w * i / 10;
        c.beginPath(); c.moveTo(x, B.y); c.lineTo(x - B.h * 0.18, B.y + B.h); c.stroke();
      }
      c.restore();

      if (this.quadrantes) this.drawQuadrantes();
      if (this.trilhas.length) this.drawTrilhas();
      if (this.campo.length) this.drawCampo();
      if (this.mira) this.drawMira();
      if (this.alvoVisual) this.drawAlvo();

      // botões
      if (!this.ocultarBotoes) {
        for (const id in this.hud) {
          const b = this.hud[id];
          if (b.tipo === 'joy') this.drawJoy(b, id);
          else this.drawBtn(b, id);
        }
      }

      if (this.nuvem) this.drawNuvem();

      // efeitos
      this.drawFx();

      // overlay
      if (this.overlay) this.drawOverlay();

      // o minimapa vem por último: durante o congelamento ele precisa
      // ficar por cima do véu que apaga o resto da tela
      if (this.mapa) this.drawMapa();

      if (this.calibrando) {
        c.save();
        c.fillStyle = 'rgba(126,200,255,.85)'; c.font = '600 13px system-ui'; c.textAlign = 'center';
        c.fillText('Arraste os botões até baterem com o seu HUD real', B.x + B.w / 2, B.y + 22);
        c.restore();
      }
    }

    cartaPx(c) {
      const B = this.box;
      return { x: B.x + c.x * B.w, y: B.y + c.y * B.h, w: c.w * B.w, h: c.h * B.h };
    }

    drawQuadrantes() {
      const c = this.ctx, B = this.box;
      const W = B.w * 0.42;
      c.save();
      for (let i = 0; i < 4; i++) {
        const x = B.x + (i % 2) * W / 2, y = B.y + (i < 2 ? 0 : B.h / 2);
        const aceso = this.quadAceso === i;
        c.globalAlpha = aceso ? 0.55 : 0.10;
        c.fillStyle = aceso ? '#ff5470' : '#2a3c5c';
        c.fillRect(x + 4, y + 4, W / 2 - 8, B.h / 2 - 8);
        c.globalAlpha = aceso ? 1 : 0.35;
        c.strokeStyle = aceso ? '#ff8fa3' : '#3d5478'; c.lineWidth = aceso ? 3 : 1.4;
        c.strokeRect(x + 4, y + 4, W / 2 - 8, B.h / 2 - 8);
        if (aceso) {
          c.fillStyle = '#fff'; c.font = `900 ${Math.round(B.h * 0.12)}px system-ui`;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText('!', x + W / 4, y + B.h / 4);
        }
      }
      c.restore();
    }

    drawTrilhas() {
      const c = this.ctx, B = this.box;
      for (let i = this.trilhas.length - 1; i >= 0; i--) {
        const r = this.trilhas[i];
        r.t += 1;
        const k = r.t / r.vida;
        if (k >= 1) { this.trilhas.splice(i, 1); continue; }
        c.save();
        c.globalAlpha = Math.sin(k * Math.PI) * 0.7;
        c.fillStyle = r.cor;
        const x = B.x + r.x * B.w, y = B.y + r.y * B.h, s = r.s * B.w;
        if (r.forma === 'quadrado') { c.fillRect(x - s, y - s, s * 2, s * 2); }
        else { c.beginPath(); c.arc(x, y, s, 0, 6.2832); c.fill(); }
        c.restore();
      }
    }

    drawCampo() {
      const c = this.ctx;
      for (const cta of this.campo) {
        const q = this.cartaPx(cta);
        if (cta.pulso) cta.pulso = Math.max(0, cta.pulso - 0.06);
        c.save();
        const sel = cta.selecionado, mk = cta.marca;
        c.globalAlpha = 0.95;
        const g = c.createLinearGradient(q.x, q.y, q.x, q.y + q.h);
        g.addColorStop(0, sel ? 'rgba(80,60,130,.95)' : 'rgba(26,34,50,.95)');
        g.addColorStop(1, sel ? 'rgba(40,30,70,.95)' : 'rgba(14,20,32,.95)');
        c.fillStyle = g;
        this.roundRect(q.x, q.y, q.w, q.h, 10); c.fill();
        c.lineWidth = sel ? 3.2 : (mk ? 2.4 : 1.4);
        c.strokeStyle = mk || (sel ? '#c4b5fd' : '#3d5478');
        this.roundRect(q.x, q.y, q.w, q.h, 10); c.stroke();

        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = '#e8eefc';
        c.font = `800 ${Math.round(q.h * 0.28)}px system-ui`;
        c.fillText(cta.icone || '?', q.x + q.w / 2, q.y + q.h * 0.28);
        c.fillStyle = '#b9c8e4';
        this.textoCaixa(cta.titulo || '', q.x + q.w / 2, q.y + q.h * 0.52,
                        q.w * 0.90, q.h * 0.15, 700, 3);
        if (cta.hp != null) {
          const bw = q.w * 0.76, bx = q.x + q.w * 0.12, by = q.y + q.h * 0.70, bh = q.h * 0.10;
          c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(bx, by, bw, bh);
          c.fillStyle = cta.hp > 0.5 ? '#3ddc97' : cta.hp > 0.25 ? '#ffd479' : '#ff5470';
          c.fillRect(bx, by, bw * cta.hp, bh);
          c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.strokeRect(bx, by, bw, bh);
        }
        if (cta.nota) {
          c.fillStyle = cta.notaCor || '#8fa3c4';
          this.textoCaixa(cta.nota, q.x + q.w / 2, q.y + q.h * 0.845,
                          q.w * 0.90, q.h * 0.12, 600, 2);
        }
        if (cta.pulso) {
          c.globalAlpha = cta.pulso * 0.8; c.strokeStyle = '#fff'; c.lineWidth = 3;
          this.roundRect(q.x - 3, q.y - 3, q.w + 6, q.h + 6, 12); c.stroke();
        }
        c.restore();
      }
    }

    /* ------------------------------------------------------------
       Texto centrado numa largura: quebra por palavra e, se ainda
       assim não couber nas linhas disponíveis, encolhe a fonte.

       Antes daqui os títulos das cartas saíam numa linha só e
       vazavam por cima das cartas vizinhas. Com cinco cartas na
       largura da tela, "Invasão na sua selva" ocupava o triplo do
       espaço que tinha.
       ------------------------------------------------------------ */
    textoCaixa(txt, cx, cy, larg, tam, peso = 700, maxLinhas = 3) {
      const c = this.ctx;
      let t = Math.max(7, tam), linhas = [];
      for (let tent = 0; tent < 5; tent++) {
        c.font = `${peso} ${Math.round(t)}px system-ui`;
        linhas = quebrarLinhas(c, String(txt), larg);
        if (linhas.length <= maxLinhas || t <= 8) break;
        t *= 0.85;
      }
      if (linhas.length > maxLinhas) linhas = linhas.slice(0, maxLinhas);
      const alt = t * 1.14;
      let y = cy - (linhas.length - 1) * alt / 2;
      for (const l of linhas) { c.fillText(l, cx, y); y += alt; }
    }

    roundRect(x, y, w, h, r) {
      const c = this.ctx;
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    ruido(n = 1) {
      for (let i = 0; i < n; i++) {
        this.trilhas.push({
          t: 0, vida: U.ri(22, 46),
          x: U.rnd(0.05, 0.95), y: U.rnd(0.05, 0.92),
          s: U.rnd(0.008, 0.028),
          cor: U.pick(['#ff5470', '#ffd479', '#7fd4ff', '#a78bfa', '#6ee7a8']),
          forma: Math.random() < 0.5 ? 'quadrado' : 'circulo',
        });
      }
    }

    drawAlvo() {
      const c = this.ctx, B = this.box, a = this.alvoVisual;
      const x = B.x + a.x * B.w, y = B.y + a.y * B.h, r = (a.r || 0.035) * B.w;
      c.save();
      c.globalAlpha = 0.9;
      c.strokeStyle = a.cor || '#ff5470'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.stroke();
      c.globalAlpha = 0.18; c.fillStyle = a.cor || '#ff5470'; c.fill();
      c.globalAlpha = 1;
      if (a.rotulo) {
        c.fillStyle = '#e8eefc'; c.font = `700 ${Math.round(r * 0.62)}px system-ui`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(a.rotulo, x, y);
      }
      c.restore();
    }

    /* ------------------------------------------------------------
       MINIMAPA — a geometria e o desenho são de js/mapa.js. Daqui
       sai só ONDE ele fica e o que um toque dentro dele significa:
       uma coordenada 0..1 do próprio mapa, e não da tela.
       ------------------------------------------------------------ */
    mapaPx() {
      const B = this.box, m = this.mapa;
      return { x: B.x + m.x * B.w, y: B.y + m.y * B.h, s: m.s * B.w };
    }

    drawMapa() {
      if (!U.MP) return;
      const c = this.ctx, B = this.box, m = this.mapa, r = this.mapaPx();
      U.MP.desenhar(c, r, m);
      if (m.placar) U.MP.desenharPlacar(c, r.x, r.y + r.s + B.h * 0.030, r.s, m.placar);
      if (m.painel) {
        /* O painel vai do lado que tiver espaço: à esquerda quando o
           mapa está grande e no meio, à direita quando ele está
           pequeno no canto. */
        const folgaEsq = r.x - (B.x + B.w * 0.030);
        const esquerda = folgaEsq > B.w * 0.20;
        const px = esquerda ? B.x + B.w * 0.030 : r.x + r.s + B.w * 0.030;
        const pw = esquerda ? folgaEsq - B.w * 0.022 : (B.x + B.w * 0.970) - px;
        if (pw > B.w * 0.10) U.MP.desenharPainel(c, px, B.y + B.h * 0.085, pw, B.h * 0.82, m.painel);
      }
    }

    /* ------------------------------------------------------------
       NUVEM DO POLEGAR, AO VIVO

       Cada toque do bloco vira um ponto DENTRO do botão, na fração do
       raio em que caiu. Com cinco pontos ou mais entram também a média
       (onde o seu dedo cai em média) e a elipse que cobre 95% deles.

       A elipse é a mesma conta que o app já fazia no histórico de 90
       dias — só que aqui é a do bloco de agora, que é o que dá para
       corrigir enquanto você ainda está treinando. O último toque sai
       destacado para você ligar o ponto ao movimento que acabou de
       fazer; sem isso a nuvem vira decoração.
       ------------------------------------------------------------ */
    anotarNuvem(id, dx, dy, hist) {
      if (!this.nuvem) this.nuvem = { botoes: {}, ultimo: null };
      const a = this.nuvem.botoes[id] || (this.nuvem.botoes[id] = []);
      a.push({ dx, dy, hist: !!hist });
      if (a.length > 60) a.shift();
      if (!hist) this.nuvem.ultimo = { id, dx, dy, t: U.now() };
    }

    /**
     * Semeia a nuvem com os toques já guardados daquele botão.
     *
     * Sem isto a elipse quase nunca aparecia: o exercício de precisão
     * espalha os toques por onze botões de propósito, então um bloco de
     * vinte tentativas deixa três ou quatro pontos em cada um — menos do
     * que qualquer elipse honesta precisa. Com o histórico no fundo, a
     * nuvem já existe quando o bloco começa e os toques de hoje caem
     * DENTRO dela, que é a comparação que interessa: hoje está igual ao
     * que você vinha fazendo, ou saiu do lugar?
     */
    semearNuvem(ids, limite = 40) {
      const guardados = (U.DB.load().toques) || {};
      for (const id of ids) {
        const a = guardados[id];
        if (!a || !a.length) continue;
        for (const t of a.slice(-limite)) {
          if (t.dx == null || t.dy == null) continue;
          this.anotarNuvem(id, t.dx, t.dy, true);
        }
      }
    }

    drawNuvem() {
      const c = this.ctx, N = this.nuvem;
      for (const id in N.botoes) {
        const b = this.hud[id]; if (!b) continue;
        const pts = N.botoes[id]; if (!pts.length) continue;
        const p = this.px(b);

        c.save();
        c.beginPath(); c.arc(p.x, p.y, p.r * 1.35, 0, 6.2832); c.clip();

        /* pontos: os antigos apagados, o mais novo aceso */
        for (let i = 0; i < pts.length; i++) {
          const t = pts[i];
          const novo = N.ultimo && N.ultimo.id === id && i === pts.length - 1;
          c.globalAlpha = novo ? 1 : t.hist ? 0.28 : 0.85;
          c.fillStyle = novo ? '#ffd479' : t.hist ? '#5b708f' : '#7fd4ff';
          c.beginPath();
          c.arc(p.x + t.dx * p.r, p.y + t.dy * p.r, novo ? 3.6 : t.hist ? 1.8 : 2.6, 0, 6.2832);
          c.fill();
        }
        c.globalAlpha = 1;

        if (pts.length >= 5) {
          const n = pts.length;
          const mx = pts.reduce((s, t) => s + t.dx, 0) / n;
          const my = pts.reduce((s, t) => s + t.dy, 0) / n;
          let sxx = 0, syy = 0, sxy = 0;
          for (const t of pts) {
            const a = t.dx - mx, o = t.dy - my;
            sxx += a * a; syy += o * o; sxy += a * o;
          }
          sxx /= (n - 1); syy /= (n - 1); sxy /= (n - 1);
          /* mesma decomposição que o histórico usa, emprestada de
             js/toque.js para as duas elipses não divergirem */
          const eg = U.TQ.eigen2(sxx, sxy, syy);
          const K = 2.4477;                       // √χ²(2, 0.95)

          c.strokeStyle = 'rgba(196,181,253,.85)'; c.lineWidth = 1.6;
          c.beginPath();
          c.ellipse(p.x + mx * p.r, p.y + my * p.r,
                    Math.max(1, K * Math.sqrt(Math.max(eg.l1, 0)) * p.r),
                    Math.max(1, K * Math.sqrt(Math.max(eg.l2, 0)) * p.r),
                    eg.ang, 0, 6.2832);
          c.stroke();

          /* seta do miolo até a média: o viés, se houver */
          const mm = Math.hypot(mx, my);
          if (mm > 0.06) {
            c.strokeStyle = '#ff8fa3'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(p.x, p.y);
            c.lineTo(p.x + mx * p.r, p.y + my * p.r); c.stroke();
            c.fillStyle = '#ff8fa3';
            c.beginPath(); c.arc(p.x + mx * p.r, p.y + my * p.r, 3, 0, 6.2832); c.fill();
          }
        }

        /* miolo do botão: o alvo */
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(p.x - 5, p.y); c.lineTo(p.x + 5, p.y);
        c.moveTo(p.x, p.y - 5); c.lineTo(p.x, p.y + 5); c.stroke();
        c.restore();
      }
      this.drawLupa();
    }

    /* ------------------------------------------------------------
       LUPA

       Sobre o botão, a nuvem mede uns sessenta pixels: dá para ver que
       existe e não dá para aprender nada com ela. A lupa mostra a mesma
       nuvem do último botão tocado, ampliada, na metade esquerda da
       tela — que neste exercício está vazia.

       E traz os números em MILÍMETROS, não em fração do raio. Milímetro
       é a unidade em que a correção acontece: "o seu dedo cai 2,1 mm
       abaixo do miolo" é uma frase que vira um ajuste de mão; "0,31 do
       raio" não é.
       ------------------------------------------------------------ */
    drawLupa() {
      const N = this.nuvem, B = this.box;
      if (!N) return;
      let id = N.ultimo && N.ultimo.id;
      if (!id || !N.botoes[id]) {
        id = Object.keys(N.botoes).sort((a, b) => N.botoes[b].length - N.botoes[a].length)[0];
      }
      const pts = id && N.botoes[id];
      if (!pts || pts.length < 3) return;
      const b = this.hud[id]; if (!b) return;

      const c = this.ctx;
      const cx = B.x + B.w * 0.300, cy = B.y + B.h * 0.395;
      const R = B.w * 0.092;
      const raioMm = b.r * TELA_MM.w;

      c.save();
      c.fillStyle = 'rgba(10,15,24,.88)';
      c.beginPath(); c.arc(cx, cy, R * 1.12, 0, 6.2832); c.fill();
      c.strokeStyle = 'rgba(120,150,190,.35)'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(cx, cy, R * 1.12, 0, 6.2832); c.stroke();

      /* borda do botão, em escala */
      c.strokeStyle = (b.cor || '#9fb6d4') + '77'; c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.stroke();

      const hoje = pts.filter(t => !t.hist), n = pts.length;
      const mx = pts.reduce((s, t) => s + t.dx, 0) / n;
      const my = pts.reduce((s, t) => s + t.dy, 0) / n;

      for (let i = 0; i < pts.length; i++) {
        const t = pts[i];
        const novo = N.ultimo && N.ultimo.id === id && i === pts.length - 1 && !t.hist;
        c.globalAlpha = novo ? 1 : t.hist ? 0.30 : 0.9;
        c.fillStyle = novo ? '#ffd479' : t.hist ? '#5b708f' : '#7fd4ff';
        c.beginPath();
        c.arc(cx + t.dx * R, cy + t.dy * R, novo ? 5 : t.hist ? 2.4 : 3.4, 0, 6.2832);
        c.fill();
      }
      c.globalAlpha = 1;

      if (n >= 5) {
        let sxx = 0, syy = 0, sxy = 0;
        for (const t of pts) {
          const a = t.dx - mx, o = t.dy - my;
          sxx += a * a; syy += o * o; sxy += a * o;
        }
        sxx /= (n - 1); syy /= (n - 1); sxy /= (n - 1);
        const eg = U.TQ.eigen2(sxx, sxy, syy);
        const K = 2.4477;
        c.strokeStyle = 'rgba(196,181,253,.9)'; c.lineWidth = 2;
        c.beginPath();
        c.ellipse(cx + mx * R, cy + my * R,
                  Math.max(1, K * Math.sqrt(Math.max(eg.l1, 0)) * R),
                  Math.max(1, K * Math.sqrt(Math.max(eg.l2, 0)) * R),
                  eg.ang, 0, 6.2832);
        c.stroke();
      }

      /* miolo e seta do viés */
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(cx - 8, cy); c.lineTo(cx + 8, cy);
      c.moveTo(cx, cy - 8); c.lineTo(cx, cy + 8); c.stroke();

      const mm = Math.hypot(mx, my) * raioMm;
      if (mm > 0.4) {
        c.strokeStyle = '#ff8fa3'; c.lineWidth = 2.4;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + mx * R, cy + my * R); c.stroke();
      }

      c.textAlign = 'center'; c.textBaseline = 'top';
      const T = Math.max(9, Math.round(B.h * 0.048));
      c.fillStyle = '#b9c8e4';
      c.font = `800 ${T}px system-ui`;
      c.fillText(NOMES[id] || id, cx, cy + R * 1.12 + T * 0.5);
      c.font = `600 ${Math.round(T * 0.84)}px system-ui`;
      c.fillStyle = mm > 1.8 ? '#ff8fa3' : '#8fa3c4';
      c.fillText(mm > 0.4 ? `puxa ${mm.toFixed(1).replace('.', ',')} mm · ${direcaoPt(mx, my)}` : 'sem viés',
                 cx, cy + R * 1.12 + T * 1.7);
      c.fillStyle = '#66748f';
      c.font = `600 ${Math.round(T * 0.76)}px system-ui`;
      c.fillText(`${hoje.length} de hoje · ${n - hoje.length} antes`, cx, cy + R * 1.12 + T * 2.8);
      c.restore();
    }

    /* ------------------------------------------------------------
       CENA DE MIRA

       O herói fica parado no campo e o alvo aparece em volta dele. O
       guia do tiro sai DO HERÓI, e não do botão — é assim no jogo, e
       é essa a associação que o exercício está ensinando: o polegar
       arrasta num canto da tela e a consequência acontece no outro.
       Desenhar o guia a partir do dedo ensinaria o mapeamento errado.
       ------------------------------------------------------------ */
    drawMira() {
      const c = this.ctx, B = this.box, m = this.mira;
      const X = (u) => B.x + u * B.w, Y = (v) => B.y + v * B.h;
      const esc = B.w;                       // alcances são fração da LARGURA
      const hx = X(m.heroi.x), hy = Y(m.heroi.y);

      c.save();

      if (m.alcance) {
        c.strokeStyle = 'rgba(126,200,255,.16)'; c.lineWidth = 1.5;
        c.setLineDash([5, 6]);
        c.beginPath(); c.arc(hx, hy, m.alcance * esc, 0, 6.2832); c.stroke();
        c.setLineDash([]);
      }

      /* guia do arrasto: cone com a tolerância do exercício, para você
         ver o quanto de erro angular ainda conta como acerto */
      const a = this.arrastoMira ? this.miraInfo() : null;
      if (a && a.moveu) {
        const alc = (m.alcance || 0.30) * esc;
        const tol = m.tolerancia || 0;
        if (tol > 0) {
          c.fillStyle = 'rgba(126,200,255,.10)';
          c.beginPath(); c.moveTo(hx, hy);
          c.arc(hx, hy, alc, a.ang - tol, a.ang + tol); c.closePath(); c.fill();
        }
        c.strokeStyle = '#7fd4ff'; c.lineWidth = 2.6; c.lineCap = 'round';
        c.beginPath(); c.moveTo(hx, hy);
        c.lineTo(hx + Math.cos(a.ang) * alc, hy + Math.sin(a.ang) * alc); c.stroke();
        c.fillStyle = '#7fd4ff';
        c.beginPath();
        c.arc(hx + Math.cos(a.ang) * alc, hy + Math.sin(a.ang) * alc, 5, 0, 6.2832); c.fill();
      }

      /* retorno: a direção que era certa, e a que você soltou */
      if (m.certo != null) {
        const alc = (m.alcance || 0.30) * esc;
        c.strokeStyle = '#6ee7a8'; c.lineWidth = 2.2; c.setLineDash([7, 5]);
        c.beginPath(); c.moveTo(hx, hy);
        c.lineTo(hx + Math.cos(m.certo) * alc, hy + Math.sin(m.certo) * alc); c.stroke();
        c.setLineDash([]);
      }
      if (m.solto != null) {
        const alc = (m.alcance || 0.30) * esc;
        c.strokeStyle = '#ff8fa3'; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(hx, hy);
        c.lineTo(hx + Math.cos(m.solto) * alc, hy + Math.sin(m.solto) * alc); c.stroke();
      }

      /* alvo */
      if (m.alvo) {
        const ax = X(m.alvo.x), ay = Y(m.alvo.y), ar = (m.alvo.r || 0.026) * esc;
        c.globalAlpha = 0.9;
        c.strokeStyle = m.alvo.cor || '#ff5470'; c.lineWidth = 2.4;
        c.beginPath(); c.arc(ax, ay, ar, 0, 6.2832); c.stroke();
        c.globalAlpha = 0.22; c.fillStyle = m.alvo.cor || '#ff5470'; c.fill();
        c.globalAlpha = 1;
        c.strokeStyle = m.alvo.cor || '#ff5470'; c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(ax - ar * 1.5, ay); c.lineTo(ax - ar * 0.55, ay);
        c.moveTo(ax + ar * 0.55, ay); c.lineTo(ax + ar * 1.5, ay);
        c.moveTo(ax, ay - ar * 1.5); c.lineTo(ax, ay - ar * 0.55);
        c.moveTo(ax, ay + ar * 0.55); c.lineTo(ax, ay + ar * 1.5);
        c.stroke();
      }

      /* herói */
      c.fillStyle = 'rgba(8,14,22,.9)';
      c.beginPath(); c.arc(hx, hy, esc * 0.024, 0, 6.2832); c.fill();
      c.strokeStyle = '#c4b5fd'; c.lineWidth = 2.2;
      c.beginPath(); c.arc(hx, hy, esc * 0.024, 0, 6.2832); c.stroke();
      c.fillStyle = '#c4b5fd';
      c.beginPath(); c.arc(hx, hy, esc * 0.009, 0, 6.2832); c.fill();

      c.restore();
    }

    drawJoy(b, id) {
      const c = this.ctx, p = this.px(b), st = this.estado[id] || {};
      c.save();
      c.strokeStyle = st.destaque ? '#7fd4ff' : 'rgba(150,180,220,.35)';
      c.lineWidth = st.destaque ? 3 : 2;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.2832); c.stroke();
      c.globalAlpha = 0.12; c.fillStyle = '#7fd4ff'; c.fill(); c.globalAlpha = 1;
      // seta-alvo (direção pedida pelo exercício)
      if (st.dirAlvo != null) {
        const a = st.dirAlvo * Math.PI / 4;
        c.strokeStyle = '#ffd479'; c.lineWidth = 4; c.globalAlpha = 0.9;
        c.beginPath();
        c.moveTo(p.x + Math.cos(a) * p.r * 0.5, p.y + Math.sin(a) * p.r * 0.5);
        c.lineTo(p.x + Math.cos(a) * p.r * 1.55, p.y + Math.sin(a) * p.r * 1.55);
        c.stroke(); c.globalAlpha = 1;
      }
      // manete
      const hx = p.x + this.joy.dx, hy = p.y + this.joy.dy;
      c.fillStyle = this.joy.ativo ? '#bfe6ff' : 'rgba(200,225,255,.55)';
      c.beginPath(); c.arc(hx, hy, p.r * 0.42, 0, 6.2832); c.fill();
      c.restore();
    }

    drawBtn(b, id) {
      const c = this.ctx, p = this.px(b), st = this.estado[id] || {};
      const destaque = !!st.destaque;
      const bloq = !!st.bloqueado;
      c.save();

      if (st.pulso) { st.pulso = Math.max(0, st.pulso - 0.06); }
      const esc = 1 + (st.pulso || 0) * 0.10;
      const r = p.r * esc;

      // corpo
      const g = c.createRadialGradient(p.x, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
      if (bloq) { g.addColorStop(0, '#1a1f2b'); g.addColorStop(1, '#0d1118'); }
      else if (destaque) { g.addColorStop(0, this.mix(b.cor, 0.55)); g.addColorStop(1, this.mix(b.cor, 0.12)); }
      else { g.addColorStop(0, 'rgba(40,52,74,.95)'); g.addColorStop(1, 'rgba(18,25,38,.95)'); }
      c.fillStyle = g;
      c.beginPath(); c.arc(p.x, p.y, r, 0, 6.2832); c.fill();

      // aro
      const aro = b.tipo === 'hab' || b.tipo === 'ult' ? '#e8c46a' : '#5b708f';
      c.lineWidth = destaque ? 3.4 : (b.tipo === 'hab' || b.tipo === 'ult' ? 2.4 : 1.6);
      c.strokeStyle = destaque ? (st.cor || '#fff1c9') : (bloq ? '#2a3240' : aro);
      c.beginPath(); c.arc(p.x, p.y, r, 0, 6.2832); c.stroke();

      if (destaque) {
        c.shadowColor = st.cor || b.cor; c.shadowBlur = 18;
        c.beginPath(); c.arc(p.x, p.y, r, 0, 6.2832); c.stroke();
        c.shadowBlur = 0;
      }

      // recarga
      if (st.cd > 0) {
        c.globalAlpha = 0.62; c.fillStyle = '#05070c';
        c.beginPath(); c.moveTo(p.x, p.y);
        c.arc(p.x, p.y, r, -Math.PI / 2, -Math.PI / 2 + 6.2832 * st.cd);
        c.closePath(); c.fill(); c.globalAlpha = 1;
      }

      // rótulo
      c.fillStyle = bloq ? '#4a5566' : (destaque ? '#ffffff' : '#c9d6ec');
      c.font = `800 ${Math.round(r * 0.78)}px ui-rounded, system-ui, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(st.rotulo || b.curto, p.x, p.y + r * 0.02);

      c.restore();
    }

    mix(hex, a) {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }

    drawFx() {
      const c = this.ctx;
      for (let i = this.efeitos.length - 1; i >= 0; i--) {
        const f = this.efeitos[i];
        f.t += 1;
        if (f.tipo === 'anel') {
          const k = f.t / 22;
          if (k >= 1) { this.efeitos.splice(i, 1); continue; }
          c.save(); c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = f.cor; c.lineWidth = 3 * (1 - k) + 1;
          c.beginPath(); c.arc(f.x, f.y, f.r * (1 + k * 1.1), 0, 6.2832); c.stroke(); c.restore();
        } else {
          const k = f.t / 34;
          if (k >= 1) { this.efeitos.splice(i, 1); continue; }
          f.x += f.vx; f.y += f.vy; f.vy += 0.09; f.rot += f.vr;
          c.save(); c.globalAlpha = (1 - k); c.translate(f.x, f.y); c.rotate(f.rot);
          c.fillStyle = f.cor;
          c.beginPath(); c.moveTo(0, -f.s); c.lineTo(f.s * 0.5, 0); c.lineTo(0, f.s * 0.8); c.lineTo(-f.s * 0.42, 0);
          c.closePath(); c.fill(); c.restore();
        }
      }
    }

    drawOverlay() {
      const c = this.ctx, B = this.box, o = this.overlay;
      c.save();
      if (o.fundo !== false) { c.fillStyle = o.fundo || 'rgba(5,8,14,.62)'; c.fillRect(B.x, B.y, B.w, B.h); }
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const cx = B.x + B.w * (o.cx ?? 0.42), cy = B.y + B.h * (o.cy ?? 0.42);
      if (o.texto) {
        c.fillStyle = o.cor || '#e8eefc';
        c.font = `900 ${Math.round(B.h * (o.tam || 0.16))}px ui-rounded, system-ui, sans-serif`;
        c.shadowColor = o.cor || '#8b6cf0'; c.shadowBlur = 24;
        c.fillText(o.texto, cx, cy);
        c.shadowBlur = 0;
      }
      if (o.sub) {
        c.fillStyle = o.subCor || 'rgba(200,214,236,.9)';
        c.font = `600 ${Math.round(B.h * 0.055)}px system-ui, sans-serif`;
        c.fillText(o.sub, cx, cy + B.h * (o.tam || 0.16) * 0.72);
      }
      c.restore();
    }
  }

  /* ============================================================
     ALCANCE DO POLEGAR
     ------------------------------------------------------------
     Heurística, e declarada como tal: o polegar direito gira em
     torno de um ponto perto do canto inferior direito do aparelho.
     Botões muito perto do pivô exigem dobrar demais; muito longe
     exigem trocar a pegada. Nenhum dos dois é habilidade.

     Isto sozinho não prova nada. O que produz conclusão é o
     cruzamento com os SEUS dados: um botão longe do arco confortável
     E com dispersão de toque alta E com tempo acima da reta de Fitts
     é limitado pelo alcance, não por treino. Se os três não
     coincidem, o sistema não conclui.
     ============================================================ */
  const PIVO = { x: 0.965, y: 1.06 };     // fração da tela, fora da borda inferior
  const ARCO_BOM = [42, 78];              // mm: faixa confortável de extensão
  const ARCO_LIMITE = 92;                 // mm: acima disso a pegada muda

  function alcanceDe(b, pivo = PIVO) {
    const dx = (b.x - pivo.x) * TELA_MM.w;
    const dy = (b.y - pivo.y) * TELA_MM.h;
    return Math.hypot(dx, dy);
  }

  function analisarAlcance(hud = getHud()) {
    const d = U.DB.load();
    const toques = d.toques || {};
    const pares = d.pares || {};
    const out = [];
    for (const id of ACIONAVEIS) {
      const b = hud[id];
      if (!b) continue;
      const mm = alcanceDe(b);
      let zona = 'confortavel';
      if (mm < ARCO_BOM[0]) zona = 'dobrado';
      else if (mm > ARCO_LIMITE) zona = 'troca_pegada';
      else if (mm > ARCO_BOM[1]) zona = 'esticado';

      const pts = toques[id] || [];
      let disp = null, desl = null;
      if (pts.length >= 8) {
        const mx = U.mean(pts.map(p => p.dx)), my = U.mean(pts.map(p => p.dy));
        disp = Math.max(U.sd(pts.map(p => p.dx)) || 0, U.sd(pts.map(p => p.dy)) || 0);
        desl = Math.hypot(mx, my);
      }
      const chegando = Object.entries(pares).filter(([k, e]) => k.endsWith('>' + id) && e.n >= 2);
      const tempo = chegando.length ? U.mean(chegando.map(([, e]) => e.med)) : null;

      out.push({
        id, nome: NOMES[id] || id, mm, zona,
        dispersao: disp, deslocamento: desl, nToques: pts.length,
        tempoChegada: tempo, nTrajetos: chegando.reduce((a, [, e]) => a + e.n, 0),
      });
    }
    out.sort((a, b2) => b2.mm - a.mm);

    /* Conclusão só quando os três sinais coincidem. */
    const suspeitos = out.filter(x =>
      (x.zona === 'esticado' || x.zona === 'troca_pegada' || x.zona === 'dobrado') &&
      x.dispersao != null && x.nToques >= 12 && (x.dispersao > 0.34 || x.deslocamento > 0.28));
    return { itens: out, suspeitos, pivo: PIVO, arcoBom: ARCO_BOM, arcoLimite: ARCO_LIMITE };
  }

  U.HUD = { HUD_PADRAO, ACIONAVEIS, ARMADILHAS, NOMES, TELA_MM, getHud, resetHud, analisarHud,
            analisarAlcance, alcanceDe, PIVO, ARCO_BOM, ARCO_LIMITE,
            HudSurface, folgaMM, distMM, percurso };

})(window.U);
