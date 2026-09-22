/* ============================================================
   ESPELHO — Sistema de Recuperação e Evolução (Jing / Luna)
   util.js — base: DOM, matemática, estatística, storage, áudio
   ============================================================ */
'use strict';

/* ---------- DOM ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return n;
}

/* ---------- Matemática ---------- */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp  = (a, b, t) => a + (b - a) * t;
const inv   = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
const rnd   = (a, b) => a + Math.random() * (b - a);
const ri    = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const now   = () => performance.now();

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sorteia n itens sem repetir, repondo o baralho quando acaba. */
function dealer(items) {
  let bag = [];
  return () => {
    if (!bag.length) bag = shuffle(items);
    return bag.pop();
  };
}

/* ---------- Estatística ---------- */
function mean(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function median(a) {
  if (!a.length) return 0;
  const s = a.slice().sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function sd(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}
/** Coeficiente de variação — a métrica-chave de "consistência". */
function cv(a) {
  const m = mean(a);
  return m > 0 ? sd(a) / m : 0;
}
/** Remove o outlier grosseiro (tremida / celular escorregou) antes de medir ritmo. */
function trimmed(a, frac = 0.1) {
  if (a.length < 5) return a.slice();
  const s = a.slice().sort((x, y) => x - y);
  const k = Math.floor(s.length * frac);
  return s.slice(k, s.length - k);
}

/* ---------- Formatação ---------- */
const pct  = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const ms   = (v) => `${Math.round(v)}ms`;
const num  = (v, d = 0) => Number(v).toFixed(d);
/** Escapa texto que vai para dentro de HTML. Vale para tudo que vem de
    fora — nome de herói importado de outro site é conteúdo de terceiro. */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
function dateShort(ts) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function dateTime(ts) {
  const d = new Date(ts);
  return `${dateShort(ts)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function dur(msv) {
  const s = Math.round(msv / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
const DAY = 86400000;
const daysSince = (ts) => (Date.now() - ts) / DAY;

/* ---------- Storage ---------- */
const DB = {
  KEY: 'espelho.jing.v1',       // mesma chave: a migração acontece na leitura
  VERSAO: 2,
  _cache: null,

  load() {
    if (this._cache) return this._cache;
    let raw = null;
    try { raw = localStorage.getItem(this.KEY); } catch (e) { /* modo privado */ }
    if (raw) { try { this._cache = JSON.parse(raw); } catch (e) { this._cache = null; } }
    if (!this._cache) this._cache = this.fresh();
    this.migrar(this._cache);
    return this._cache;
  },

  fresh() {
    return {
      v: 2,
      criado: Date.now(),
      perfil: { nome: 'Jogador', parado: 30 },
      hud: null,
      hudConferido: false,
      opts: { som: true, vibra: true, fx: 'alto', musica: true, volMusica: 0.5, volSfx: 0.6 },

      /* dados crus — a única fonte de verdade */
      tentativas: [],

      /* resumos derivados, guardados para leitura rápida */
      sets: [],
      sessoes: [],
      provas: [],

      /* estado dos mecanismos */
      dif: {},              // controlador de dificuldade por exercício
      limiar: [],           // limiares estáveis (medida "Execução")
      aborto: [],           // medidas de janela de aborto
      fase: 'reconexao',
      faseHist: [],
      baseRecuperacao: null,

      /* personalização e contexto */
      toques: {},           // dispersão do dedo por botão
      pares: {},            // tempo por trajeto entre botões
      partidas: [],         // registro de partidas reais (checagem de transferência)
      rotasJing: null, rotasLuna: null,
      luna: { liberada: false, foco: false },

      sessaoAtual: null,
      streak: { dias: 0, ultimo: 0 },
      legado: null,
    };
  },

  /**
   * Migração v1 → v2.
   * Regra: nada é apagado. Mas nada da V1 entra nas medidas novas.
   * As medidas mudaram de instrumento e de condição (a V2 tem uma
   * condição de referência fixa que a V1 não tinha), e misturar
   * séries de instrumentos diferentes produz tendência falsa —
   * que é exatamente o erro que esta versão existe para corrigir.
   * O histórico antigo fica guardado em `legado` e visível na
   * aba de progresso, marcado como outra régua.
   */
  migrar(d) {
    const f = this.fresh();
    if (!d.v || d.v < 2) {
      const antigo = {
        v: d.v || 1, migradoEm: Date.now(),
        skills: d.skills || null, diagnostico: d.diagnostico || null,
        mecanicas: d.mecanicas || null, retencao: d.retencao || [],
        ssrt: d.ssrt || [], antecipacao: d.antecipacao || [],
        sets: (d.sets || []).slice(-200), sessoes: (d.sessoes || []).slice(-80),
        nivel: d.nivel || 1, drills: d.drills || {},
      };
      const temAlgo = (antigo.sets.length || antigo.sessoes.length || antigo.diagnostico);
      d.legado = temAlgo ? antigo : null;

      /* o que sobrevive porque não depende do instrumento */
      const preservar = {
        hud: d.hud, opts: Object.assign({}, f.opts, d.opts || {}),
        toques: d.toques || {}, pares: d.pares || {},
        rotasJing: d.rotasJing || null, rotasLuna: d.rotasLuna || null,
        perfil: d.perfil || f.perfil, criado: d.criado || Date.now(),
        streak: d.streak || f.streak,
        luna: { liberada: !!d.lunaLiberada, foco: !!d.focoLuna },
        legado: d.legado,
      };
      for (const k of Object.keys(d)) delete d[k];
      Object.assign(d, f, preservar);
      d.v = 2;
      try { localStorage.setItem(this.KEY, JSON.stringify(d)); } catch (e) {}
      return;
    }
    /* completa chaves novas sem tocar nas existentes */
    for (const k in f) if (!(k in d)) d[k] = f[k];
    if (!d.opts) d.opts = f.opts;
    for (const k in f.opts) if (!(k in d.opts)) d.opts[k] = f.opts[k];
    for (const k of ['tentativas', 'sets', 'sessoes', 'provas', 'limiar', 'aborto', 'faseHist', 'partidas'])
      if (!Array.isArray(d[k])) d[k] = [];
    for (const k of ['dif', 'toques', 'pares']) if (!d[k] || typeof d[k] !== 'object') d[k] = {};
    if (!d.luna) d.luna = { liberada: false, foco: false };
  },

  /** Salva com poda automática: localStorage estoura por volta de 5 MB. */
  save() {
    const d = this._cache;
    if (!d) return;
    try {
      localStorage.setItem(this.KEY, JSON.stringify(d));
      this._falhou = false;
    } catch (e) {
      /* poda do mais volumoso e menos insubstituível, em ordem */
      const antes = d.tentativas.length;
      d.tentativas = d.tentativas.slice(-2000);
      d.sets = d.sets.slice(-150);
      for (const k in d.toques) d.toques[k] = d.toques[k].slice(-60);
      try {
        localStorage.setItem(this.KEY, JSON.stringify(d));
        console.warn('Armazenamento cheio: podadas', antes - d.tentativas.length, 'tentativas antigas.');
        this._falhou = false;
      } catch (e2) {
        this._falhou = true;
        console.warn('Não foi possível salvar', e2);
      }
    }
  },
  falhouAoSalvar() { return !!this._falhou; },

  reset() { this._cache = this.fresh(); this.save(); },
  export() { return JSON.stringify(this.load(), null, 2); },
  import(json) {
    const d = JSON.parse(json);
    if (!d || typeof d !== 'object') throw new Error('Arquivo inválido');
    this._cache = d; this.migrar(d); this.save();
  },

  /** Tamanho aproximado em KB — usado no painel de dados. */
  tamanho() {
    try { return Math.round(JSON.stringify(this._cache).length / 1024); } catch (e) { return 0; }
  },
};

/* ============================================================
   ÁUDIO SINTETIZADO — sem arquivo nenhum, e ainda assim com corpo.

   A primeira versão era um oscilador por som: bipes. Funcionavam,
   mas soavam como um teste de hardware, e som ruim cansa — a pessoa
   desliga, e perde o retorno auditivo, que é o mais rápido que
   existe (o ouvido responde uns 40 ms antes do olho).

   Esta versão monta cada som em CAMADAS, como se faz em jogo:
   · um transiente curto (ruído filtrado) que dá o "ataque";
   · um corpo tonal com envelope próprio;
   · às vezes uma cauda (harmônicos inarmônicos de sino, varredura).
   Tudo passa por um compressor (nada estoura quando vários sons
   caem juntos) e por uma sala curta gerada na hora (reverb por
   convolução com ruído que decai), só nos sons de recompensa.

   Regra de desenho: o som de ACERTO é agudo, curto e brilhante; o
   de ERRO é grave e abafado, nunca estridente — erro estridente
   vira punição, e punição piora aprendizado motor. A série de
   acertos sobe de tom na escala pentatônica: o ouvido percebe a
   sequência sem precisar olhar para número nenhum.
   ============================================================ */
const PENTA_SFX = [0, 2, 4, 7, 9];
const Sfx = {
  ctx: null,
  master: null,
  serie: 0,
  ready() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      const c = this.ctx = new AC();
      this.master = c.createGain();
      this.master.gain.value = this.volAlvo();
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -16; this.comp.knee.value = 12;
      this.comp.ratio.value = 4; this.comp.attack.value = 0.003; this.comp.release.value = 0.16;
      this.seco = c.createGain(); this.seco.gain.value = 1;
      this.envio = c.createGain(); this.envio.gain.value = 1;
      this.sala = c.createConvolver();
      this.sala.buffer = this.impulso(1.1, 2.6);
      const retorno = c.createGain(); retorno.gain.value = 0.32;
      this.seco.connect(this.comp);
      this.envio.connect(this.sala); this.sala.connect(retorno); retorno.connect(this.comp);
      this.comp.connect(this.master);
      this.master.connect(c.destination);
      /* um segundo de ruído branco, gerado uma vez e reaproveitado */
      const n = c.sampleRate;
      this.ruidoBuf = c.createBuffer(1, n, n);
      const d = this.ruidoBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; return false; }
    return true;
  },
  /** Resposta de sala: ruído estéreo com decaimento exponencial. */
  impulso(seg, queda) {
    const c = this.ctx, n = Math.floor(c.sampleRate * seg);
    const b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, queda);
    }
    return b;
  },
  unlock() {
    if (!this.ready()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  on() { return DB.load().opts.som !== false; },
  pode() { return this.on() && this.ready(); },
  volAlvo() { return clamp(DB.load().opts.volSfx ?? 0.6, 0, 1) * 0.75; },
  atualizarVolume() { if (this.master) this.master.gain.value = this.volAlvo(); },
  saida(sala) { return sala ? [this.seco, this.envio] : [this.seco]; },

  /* ---------- blocos de construção ---------- */
  /** Voz tonal. o: {tipo, ganho, dur, ataque, deslize, atraso, sala, filtro, q, detune} */
  voz(freq, o = {}) {
    if (!this.pode()) return;
    const c = this.ctx, t = c.currentTime + (o.atraso || 0);
    const dur = o.dur ?? 0.1, at = o.ataque ?? 0.004;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.tipo || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.detune) osc.detune.value = o.detune;
    if (o.deslize) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + o.deslize), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.5 * (o.ganho ?? 1)), t + at);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let ult = osc;
    if (o.filtro) {
      const f = c.createBiquadFilter(); f.type = o.filtroTipo || 'lowpass';
      f.frequency.value = o.filtro; f.Q.value = o.q ?? 0.8;
      osc.connect(f); ult = f;
    }
    ult.connect(g);
    for (const s of this.saida(o.sala)) g.connect(s);
    osc.start(t); osc.stop(t + dur + 0.03);
  },
  /** Ruído filtrado. o: {dur, ganho, tipo, freq, freqFim, q, atraso, sala, ataque} */
  sopro(o = {}) {
    if (!this.pode()) return;
    const c = this.ctx, t = c.currentTime + (o.atraso || 0), dur = o.dur ?? 0.1;
    const src = c.createBufferSource(); src.buffer = this.ruidoBuf;
    const f = c.createBiquadFilter(); f.type = o.tipo || 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 2000, t);
    if (o.freqFim) f.frequency.exponentialRampToValueAtTime(o.freqFim, t + dur);
    f.Q.value = o.q ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.5 * (o.ganho ?? 0.5)), t + (o.ataque ?? 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g);
    for (const s of this.saida(o.sala)) g.connect(s);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.03);
  },
  /** Sino: parciais inarmônicos (razões de sino de metal). */
  sino(freq, o = {}) {
    const dur = o.dur ?? 0.5, g = o.ganho ?? 0.6;
    [[1, 1], [2.76, 0.32], [5.4, 0.14], [8.93, 0.06]].forEach(([r, a], i) =>
      this.voz(freq * r, { dur: dur / (1 + i * 0.7), ganho: g * a, sala: true, atraso: o.atraso }));
  },

  /* ---------- compatibilidade com a API antiga ---------- */
  tone(freq, dur = 0.08, type = 'sine', gain = 1, slide = 0) {
    this.voz(freq, { dur, tipo: type, ganho: gain, deslize: slide, filtro: type === 'sine' ? null : 4200 });
  },
  noise(dur = 0.12, gain = 0.5, hp = 800) { this.sopro({ dur, ganho: gain, tipo: 'highpass', freq: hp, q: 0.5 }); },

  /* ---------- a paleta ---------- */
  /** Contagem 3-2-1: madeira curta, sempre o mesmo tom (previsível de propósito). */
  tick() {
    this.voz(1320, { dur: 0.05, ganho: 0.32, tipo: 'triangle' });
    this.voz(2640, { dur: 0.025, ganho: 0.08 });
    this.sopro({ dur: 0.018, ganho: 0.18, freq: 3800, q: 2 });
  },
  /** Largada: a mesma madeira uma quinta acima, com sala — "vai". */
  largada() {
    this.voz(1976, { dur: 0.09, ganho: 0.34, tipo: 'triangle', sala: true });
    this.voz(988, { dur: 0.12, ganho: 0.18, sala: true });
  },
  beat()      { this.voz(760, { dur: 0.05, ganho: 0.45, tipo: 'triangle' }); this.sopro({ dur: 0.015, ganho: 0.12, freq: 3000 }); },
  beatStrong(){ this.voz(1120, { dur: 0.07, ganho: 0.7, tipo: 'triangle' }); this.voz(140, { dur: 0.09, ganho: 0.4, deslize: -60 }); },
  /** Toque de retorno neutro ("registrado"). */
  hit() {
    this.voz(880, { dur: 0.07, ganho: 0.5, tipo: 'triangle', deslize: 320 });
    this.voz(1760, { dur: 0.04, ganho: 0.12 });
    this.sopro({ dur: 0.02, ganho: 0.15, freq: 5000, q: 1.5 });
  },
  /** Acerto. A série sobe pela pentatônica: 5 acertos = uma oitava de subida. */
  perfect() {
    const n = this.serie++;
    const semi = PENTA_SFX[n % 5] + 12 * Math.min(1, Math.floor(n / 5));
    const f = 880 * Math.pow(2, semi / 12);
    this.sino(f, { dur: 0.42, ganho: 0.42 });
    this.voz(f * 1.5, { dur: 0.16, ganho: 0.16, atraso: 0.045, sala: true });
    this.sopro({ dur: 0.03, ganho: 0.12, freq: 6000, q: 1 });
    if (n + 1 >= 5 && (n + 1) % 5 === 0) this.voz(f * 2, { dur: 0.3, ganho: 0.14, atraso: 0.09, sala: true, tipo: 'triangle' });
  },
  /** Erro: grave e abafado. Nada estridente. */
  miss() {
    this.serie = 0;
    this.voz(150, { dur: 0.2, ganho: 0.62, deslize: -70 });
    this.voz(159, { dur: 0.18, ganho: 0.22, tipo: 'triangle', filtro: 600 });
    this.sopro({ dur: 0.1, ganho: 0.22, tipo: 'lowpass', freq: 700, q: 0.7 });
  },
  zerarSerie() { this.serie = 0; },
  alert() {
    this.voz(640, { dur: 0.18, ganho: 0.4, tipo: 'square', filtro: 1800 });
    this.voz(480, { dur: 0.22, ganho: 0.36, tipo: 'square', filtro: 1600, atraso: 0.12 });
  },
  cue()  { this.voz(620, { dur: 0.06, ganho: 0.45 }); this.voz(1240, { dur: 0.04, ganho: 0.1 }); },
  stop() {
    this.voz(180, { dur: 0.32, ganho: 0.55, tipo: 'sawtooth', filtro: 700, deslize: -90 });
    this.sopro({ dur: 0.22, ganho: 0.28, tipo: 'lowpass', freq: 500 });
  },
  done() {
    [523, 659, 784, 1046].forEach((f, i) => this.sino(f, { dur: 0.7, ganho: 0.34, atraso: i * 0.09 }));
    this.voz(261, { dur: 0.6, ganho: 0.18, tipo: 'triangle', atraso: 0.27, sala: true });
  },
  level() {
    [392, 523, 659, 880, 1174].forEach((f, i) => this.sino(f, { dur: 0.8, ganho: 0.36, atraso: i * 0.11 }));
    [523, 659, 784].forEach(f => this.voz(f, { dur: 0.9, ganho: 0.12, tipo: 'triangle', atraso: 0.55, sala: true }));
  },

  /* ---------- sons do HUD, por tipo de botão ---------- */
  /** Toque num botão do HUD. Baixo de propósito: é confirmação, não evento. */
  botao(tipo) {
    if (DB.load().opts.somToque === false) return;
    if (tipo === 'hab') {
      this.sopro({ dur: 0.07, ganho: 0.16, freq: 1300, freqFim: 3400, q: 1.6 });
      this.voz(300, { dur: 0.05, ganho: 0.14, deslize: -120 });
    } else if (tipo === 'ult') {
      this.sopro({ dur: 0.16, ganho: 0.2, freq: 500, freqFim: 2600, q: 1.2 });
      this.voz(110, { dur: 0.16, ganho: 0.28, deslize: -40 });
    } else if (tipo === 'aa') {
      this.sopro({ dur: 0.045, ganho: 0.2, tipo: 'highpass', freq: 2600, q: 0.7 });
      this.voz(240, { dur: 0.05, ganho: 0.16, deslize: -110 });
    } else {
      this.voz(1800, { dur: 0.025, ganho: 0.12, tipo: 'triangle' });
    }
  },
  /** Clique de interface (fora do treino): quase inaudível, só confirma. */
  ui() {
    if (DB.load().opts.somToque === false) return;
    this.voz(2200, { dur: 0.02, ganho: 0.08, tipo: 'triangle' });
    this.sopro({ dur: 0.012, ganho: 0.06, freq: 4000, q: 2 });
  },
  /** Toque em habilidade que não está pronta: estalo seco, sem tom. */
  bloqueado() {
    this.sopro({ dur: 0.05, ganho: 0.22, tipo: 'lowpass', freq: 400, q: 2 });
    this.voz(95, { dur: 0.06, ganho: 0.2 });
  },
  /** Espelho quebrando: estilhaços agudos espalhados + o baque grave. */
  vidro() {
    for (let i = 0; i < 9; i++) {
      this.voz(rnd(2400, 7200), { dur: rnd(0.04, 0.14), ganho: rnd(0.05, 0.14), atraso: rnd(0, 0.09), sala: true });
    }
    this.sopro({ dur: 0.18, ganho: 0.3, tipo: 'highpass', freq: 3800, q: 0.6, sala: true });
    this.voz(120, { dur: 0.22, ganho: 0.42, deslize: -60 });
    this.voz(1567, { dur: 0.3, ganho: 0.12, atraso: 0.03, sala: true });
  },
  /** Punir: descarga elétrica, rápida. */
  punir() {
    this.voz(1400, { dur: 0.16, ganho: 0.3, tipo: 'sawtooth', deslize: -1150, filtro: 3200, q: 3 });
    this.sopro({ dur: 0.12, ganho: 0.3, freq: 2400, freqFim: 600, q: 2 });
    this.voz(80, { dur: 0.2, ganho: 0.4, deslize: -30 });
  },
  /** Monstro grande abatido. */
  abate() {
    this.voz(70, { dur: 0.5, ganho: 0.5, tipo: 'sawtooth', filtro: 380, deslize: -30 });
    this.sopro({ dur: 0.45, ganho: 0.3, tipo: 'lowpass', freq: 900, freqFim: 200, sala: true });
    [659, 988].forEach((f, i) => this.sino(f, { dur: 0.6, ganho: 0.3, atraso: 0.18 + i * 0.08 }));
  },
  /** Objetivo roubado pelo outro lado. */
  roubado() {
    this.voz(220, { dur: 0.35, ganho: 0.4, tipo: 'sawtooth', filtro: 900, deslize: -110 });
    this.voz(233, { dur: 0.35, ganho: 0.25, tipo: 'sawtooth', filtro: 900, deslize: -110 });
    this.sopro({ dur: 0.3, ganho: 0.2, tipo: 'lowpass', freq: 600 });
  },
  /** Golpe do monstro/aliado no objetivo — surdo e curto. */
  pancada(forte) {
    this.voz(forte ? 90 : 130, { dur: 0.08, ganho: forte ? 0.3 : 0.18, deslize: -40 });
    this.sopro({ dur: 0.04, ganho: forte ? 0.18 : 0.1, tipo: 'lowpass', freq: 900 });
  },
};

const Haptic = {
  on() { return DB.load().opts.vibra !== false && 'vibrate' in navigator; },
  tap()  { if (this.on()) navigator.vibrate(8); },
  good() { if (this.on()) navigator.vibrate(14); },
  bad()  { if (this.on()) navigator.vibrate([26, 40, 26]); },
  stop() { if (this.on()) navigator.vibrate([40, 30, 40, 30, 60]); },
};

/* ---------- Loop / timers seguros ---------- */
class Ticker {
  constructor(fn) { this.fn = fn; this.raf = 0; this.last = 0; this.running = false; }
  start() {
    if (this.running) return;
    this.running = true; this.last = now();
    const step = () => {
      if (!this.running) return;
      const t = now(), dt = t - this.last; this.last = t;
      this.fn(dt, t);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  stop() { this.running = false; if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
}

/** Timeouts agrupados, canceláveis de uma vez (evita exercício "fantasma"). */
class Timers {
  constructor() { this.ids = new Set(); }
  after(msv, fn) {
    const id = setTimeout(() => { this.ids.delete(id); fn(); }, msv);
    this.ids.add(id); return id;
  }
  every(msv, fn) {
    const id = setInterval(fn, msv);
    this.ids.add(id); return id;
  }
  cancel(id) { clearTimeout(id); clearInterval(id); this.ids.delete(id); }
  clear() { for (const id of this.ids) { clearTimeout(id); clearInterval(id); } this.ids.clear(); }
}

/* ---------- Tela ---------- */
const Screen = {
  async fullscreen() {
    const e = document.documentElement;
    try {
      if (!document.fullscreenElement && e.requestFullscreen) await e.requestFullscreen({ navigationUI: 'hide' });
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch (err) { /* navegador pode recusar; segue sem */ }
  },
  isLandscape() { return window.innerWidth >= window.innerHeight; },
};

/* ---------- Exportado ---------- */
window.U = {
  $, $$, el, clamp, lerp, inv, rnd, ri, pick, now, shuffle, dealer,
  mean, median, sd, cv, trimmed, pct, ms, num, esc, debounce, dateShort, dateTime, dur, daysSince, DAY,
  DB, Sfx, Haptic, Ticker, Timers, Screen,
};
