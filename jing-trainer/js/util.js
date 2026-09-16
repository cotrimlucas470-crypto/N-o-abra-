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
  KEY: 'espelho.jing.v1',
  _cache: null,
  load() {
    if (this._cache) return this._cache;
    let raw = null;
    try { raw = localStorage.getItem(this.KEY); } catch (e) { /* modo privado */ }
    if (raw) {
      try { this._cache = JSON.parse(raw); } catch (e) { this._cache = null; }
    }
    if (!this._cache) this._cache = this.fresh();
    this.migrate(this._cache);
    return this._cache;
  },
  fresh() {
    return {
      v: 1,
      criado: Date.now(),
      perfil: { nome: 'Jogador', parado: 30 },
      hud: null,               // sobrescrito pela calibração
      opts: { som: true, vibra: true, fx: 'alto', musica: true, volMusica: 0.5, volSfx: 0.6, feedbackDesvanecido: true },
      skills: null,            // vetor de habilidade (criado no diagnóstico)
      nivel: 1,
      diagnostico: null,
      mecanicas: {},           // classificação de ferrugem por rota
      sessoes: [],             // histórico
      sets: [],                // todo set executado (histórico fino)
      drills: {},              // estado por exercício: dificuldade, últimos scores
      lunaLiberada: false,
      lunaSkills: null,
      pares: {},               // tempos de transição botão->botão
      toques: {},              // dispersão do dedo dentro de cada botão
      retencao: [],            // testes de retenção (aprendizado, não desempenho)
      ssrt: [],                // histórico de tempo de frenagem
      antecipacao: [],         // curva de oclusão temporal
      streak: { dias: 0, ultimo: 0 },
    };
  },
  migrate(d) {
    const f = this.fresh();
    for (const k in f) if (!(k in d)) d[k] = f[k];
    if (!d.opts) d.opts = f.opts;
    for (const k in f.opts) if (!(k in d.opts)) d.opts[k] = f.opts[k];
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this._cache)); }
    catch (e) { console.warn('Sem espaço para salvar', e); }
  },
  reset() {
    this._cache = this.fresh();
    this.save();
  },
  export() {
    return JSON.stringify(this.load(), null, 2);
  },
  import(json) {
    const d = JSON.parse(json);
    if (!d || typeof d !== 'object') throw new Error('Arquivo inválido');
    this._cache = d; this.migrate(d); this.save();
  },
};

/* ---------- Áudio sintetizado (sem arquivos) ---------- */
const Sfx = {
  ctx: null,
  master: null,
  ready() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volAlvo();
      this.master.connect(this.ctx.destination);
    } catch (e) { return false; }
    return true;
  },
  unlock() {
    if (!this.ready()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  on() { return DB.load().opts.som !== false; },
  volAlvo() { return clamp(DB.load().opts.volSfx ?? 0.6, 0, 1) * 0.6; },
  atualizarVolume() { if (this.master) this.master.gain.value = this.volAlvo(); },
  tone(freq, dur = 0.08, type = 'sine', gain = 1, slide = 0) {
    if (!this.on() || !this.ready()) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur = 0.12, gain = 0.5, hp = 800) {
    if (!this.on() || !this.ready()) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  tick()      { this.tone(1400, 0.035, 'square', 0.28); },
  beat()      { this.tone(760, 0.05, 'triangle', 0.5); },
  beatStrong(){ this.tone(1120, 0.06, 'triangle', 0.75); },
  hit()       { this.tone(880, 0.07, 'triangle', 0.7, 320); },
  perfect()   { this.tone(1046, 0.06, 'sine', 0.8); setTimeout(() => this.tone(1568, 0.09, 'sine', 0.7), 55); },
  miss()      { this.tone(180, 0.16, 'sawtooth', 0.55, -80); this.noise(0.08, 0.18, 400); },
  alert()     { this.tone(320, 0.22, 'square', 0.6); setTimeout(() => this.tone(240, 0.24, 'square', 0.55), 110); },
  cue()       { this.tone(620, 0.05, 'sine', 0.6); },
  stop()      { this.tone(140, 0.3, 'sawtooth', 0.7); this.noise(0.2, 0.25, 200); },
  done()      { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'sine', 0.65), i * 90)); },
  level()     { [392, 523, 659, 880, 1174].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.7), i * 110)); },
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
  mean, median, sd, cv, trimmed, pct, ms, num, dateShort, dateTime, dur, daysSince, DAY,
  DB, Sfx, Haptic, Ticker, Timers, Screen,
};
