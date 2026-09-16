/* ============================================================
   musica.js — trilha generativa (sem arquivos, ~0 KB de áudio)
   Por que música, e por que ASSIM:
   Música de fundo reduz divagação mental e encurta o tempo de
   reação em tarefas de atenção sustentada, mas aumenta estados
   de distração externa (Nature Sci Rep 2024). Tradução prática:
   ela ajuda em exercício repetitivo e longo, e atrapalha em
   exercício de leitura/decisão. Por isso o clima é escolhido
   pelo tipo de treino e o volume abaixa sozinho nos momentos
   que exigem leitura.
   O andamento da trilha também acompanha o andamento-alvo do
   exercício (tempo musical e velocidade perceptomotora andam
   juntos), então o compasso da música É o compasso do treino.
   ============================================================ */
'use strict';
(function (U) {

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  /* Lá menor: i - VI - III - VII. Escala pentatônica menor para o arpejo. */
  const ACORDES = [
    { raiz: 45, notas: [45, 48, 52, 57] },  // Am
    { raiz: 41, notas: [41, 48, 53, 57] },  // F
    { raiz: 48, notas: [48, 52, 55, 60] },  // C
    { raiz: 43, notas: [43, 50, 55, 59] },  // G
  ];
  const PENTA = [0, 3, 5, 7, 10];

  const CLIMAS = {
    espelho: {
      nome: 'Espelho', desc: 'pad lento, sem percussão — para precisão e compasso',
      bpm: 72, pad: 0.30, arp: 0.20, arpDiv: 4, baixo: 0.10, bumbo: 0, chimbal: 0,
      corte: 900, brilho: 0.35,
    },
    pulso: {
      nome: 'Pulso', desc: 'com batida — para velocidade e repetição',
      bpm: 100, pad: 0.20, arp: 0.24, arpDiv: 2, baixo: 0.26, bumbo: 0.30, chimbal: 0.13,
      corte: 1600, brilho: 0.55,
    },
    tensao: {
      nome: 'Tensão', desc: 'grave e instável — para pressão e simulação de luta',
      bpm: 84, pad: 0.34, arp: 0.10, arpDiv: 3, baixo: 0.22, bumbo: 0.18, chimbal: 0.06,
      corte: 620, brilho: 0.18, sombrio: true,
    },
    foco: {
      nome: 'Foco', desc: 'quase nada — para leitura e decisão',
      bpm: 60, pad: 0.16, arp: 0.05, arpDiv: 8, baixo: 0.06, bumbo: 0, chimbal: 0,
      corte: 480, brilho: 0.12,
    },
    silencio: { nome: 'Silêncio', desc: 'sem trilha', mudo: true },
  };

  const Musica = {
    ctx: null, bus: null, duckGain: null, rev: null, comp: null,
    tocando: false, clima: 'espelho', cfg: CLIMAS.espelho,
    bpm: 72, passo: 0, proximo: 0, timer: 0, vozes: 0,

    /* ---------- infraestrutura ---------- */
    preparar() {
      if (this.ctx) return true;
      if (!U.Sfx.ready()) return false;
      this.ctx = U.Sfx.ctx;
      const c = this.ctx;

      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -18; this.comp.ratio.value = 3.4;
      this.comp.attack.value = 0.006; this.comp.release.value = 0.22;

      this.duckGain = c.createGain(); this.duckGain.gain.value = 1;
      this.bus = c.createGain(); this.bus.gain.value = this.volumeAlvo();

      /* reverb: resposta ao impulso sintetizada, nada de arquivo */
      this.rev = c.createConvolver();
      const dur = 2.2, len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * 0.6;
        }
      }
      this.rev.buffer = buf;
      this.revGain = c.createGain(); this.revGain.gain.value = 0.34;

      this.bus.connect(this.duckGain);
      this.bus.connect(this.rev); this.rev.connect(this.revGain); this.revGain.connect(this.duckGain);
      this.duckGain.connect(this.comp);
      this.comp.connect(c.destination);
      return true;
    },

    opts() { return U.DB.load().opts; },
    volumeAlvo() {
      const o = this.opts();
      if (o.musica === false) return 0;
      return U.clamp((o.volMusica ?? 0.5), 0, 1) * 0.30;
    },

    /* ---------- controle ---------- */
    tocar(clima, bpm) {
      if (!this.preparar()) return;
      if (this.opts().musica === false) return this.parar();
      if (clima && CLIMAS[clima]) { this.clima = clima; this.cfg = CLIMAS[clima]; }
      if (this.cfg.mudo) return this.parar();
      this.bpm = U.clamp(bpm || this.cfg.bpm, 46, 168);
      this.bus.gain.setTargetAtTime(this.volumeAlvo(), this.ctx.currentTime, 0.8);
      if (this.tocando) return;
      this.tocando = true;
      this.passo = 0;
      this.proximo = this.ctx.currentTime + 0.08;
      this.timer = setInterval(() => this.agendar(), 25);
    },

    parar(suave = true) {
      if (!this.ctx) return;
      clearInterval(this.timer); this.timer = 0;
      if (this.bus) this.bus.gain.setTargetAtTime(0, this.ctx.currentTime, suave ? 0.4 : 0.02);
      this.tocando = false;
    },

    /** Escolhe o clima pelo tipo de exercício — e abaixa onde música atrapalha. */
    paraExercicio(drill, cfg) {
      if (!drill) return this.tocar('espelho');
      const bpmAlvo = cfg && cfg.beat ? U.clamp(60000 / cfg.beat, 46, 168) : null;
      let clima = 'espelho';
      if (drill.motor === 'prioridade' || drill.motor === 'cenario') clima = 'foco';
      else if (drill.motor === 'escolha') clima = 'foco';
      else if (cfg && (cfg.freio || cfg.ruido || cfg.mutante)) clima = 'tensao';
      else if (cfg && (cfg.modo === 'compasso' || cfg.modo === 'janela')) clima = 'pulso';
      else if (drill.fase >= 4) clima = 'pulso';
      this.tocar(clima, bpmAlvo || CLIMAS[clima].bpm);
    },

    /** Abaixa por um instante para o efeito sonoro passar por cima. */
    abaixar(ms = 260, quanto = 0.45) {
      if (!this.ctx || !this.tocando) return;
      const t = this.ctx.currentTime;
      this.duckGain.gain.cancelScheduledValues(t);
      this.duckGain.gain.setTargetAtTime(quanto, t, 0.015);
      this.duckGain.gain.setTargetAtTime(1, t + ms / 1000, 0.18);
    },

    atualizarVolume() {
      if (!this.ctx || !this.bus) return;
      const v = this.volumeAlvo();
      this.bus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.3);
      if (v === 0) this.parar(); else if (!this.tocando) this.tocar();
    },

    /* ---------- sequenciador com antecedência ---------- */
    agendar() {
      if (!this.tocando) return;
      const c = this.ctx;
      const dur16 = 60 / this.bpm / 4;                 // semicolcheia
      while (this.proximo < c.currentTime + 0.14) {
        this.tocarPasso(this.passo, this.proximo, dur16);
        this.proximo += dur16;
        this.passo = (this.passo + 1) % 64;            // 4 compassos
      }
    },

    tocarPasso(s, t, d) {
      const k = this.cfg;
      const compasso = Math.floor(s / 16);
      const acorde = ACORDES[compasso % ACORDES.length];

      if (s % 16 === 0 && k.pad) this.pad(acorde, t, d * 16);
      if (k.baixo && (s % 8 === 0 || (k.bumbo && s % 16 === 6))) this.baixo(acorde.raiz - 12, t, d * 4);
      if (k.arp && s % k.arpDiv === 0) this.arp(acorde, s, t);
      if (k.bumbo && (s % 16 === 0 || s % 16 === 10)) this.bumbo(t);
      if (k.chimbal && s % 4 === 2) this.chimbal(t);
      if (k.sombrio && s === 48) this.drone(acorde.raiz - 24, t, d * 16);
    },

    /* ---------- vozes ---------- */
    env(t, a, dec, sus, rel, pico) {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t + a);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico * sus), t + a + dec);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec + rel);
      return g;
    },

    pad(acorde, t, dur) {
      const c = this.ctx, k = this.cfg;
      const f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(k.corte * 0.7, t);
      f.frequency.linearRampToValueAtTime(k.corte * 1.5, t + dur * 0.45);
      f.frequency.linearRampToValueAtTime(k.corte * 0.6, t + dur);
      f.Q.value = 3;
      const g = this.env(t, dur * 0.28, dur * 0.25, 0.75, dur * 0.5, k.pad);
      f.connect(g); g.connect(this.bus);
      for (const n of acorde.notas) {
        for (const det of [-5, 5]) {
          const o = c.createOscillator();
          o.type = k.sombrio ? 'sawtooth' : 'triangle';
          o.frequency.value = midi(n) * Math.pow(2, det / 1200);
          o.connect(f); o.start(t); o.stop(t + dur * 1.05);
        }
      }
    },

    drone(nota, t, dur) {
      const c = this.ctx;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = midi(nota);
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = midi(nota) * 1.011;
      const g = this.env(t, dur * 0.3, dur * 0.2, 0.8, dur * 0.5, 0.18);
      o.connect(g); o2.connect(g); g.connect(this.bus);
      o.start(t); o.stop(t + dur); o2.start(t); o2.stop(t + dur);
    },

    baixo(nota, t, dur) {
      const c = this.ctx;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = midi(nota);
      const g = this.env(t, 0.012, dur * 0.4, 0.3, dur * 0.6, this.cfg.baixo);
      o.connect(g); g.connect(this.bus);
      o.start(t); o.stop(t + dur * 1.1);
    },

    arp(acorde, s, t) {
      const c = this.ctx, k = this.cfg;
      const grau = PENTA[(Math.floor(s / k.arpDiv) * 2 + (s % 7)) % PENTA.length];
      const oit = 12 * (1 + ((s >> 4) & 1));
      const nota = acorde.raiz + grau + oit;
      const o = c.createOscillator();
      o.type = 'triangle'; o.frequency.value = midi(nota);
      const g = this.env(t, 0.006, 0.10, 0.25, 0.5, k.arp * (0.6 + k.brilho * 0.6));
      const f = c.createBiquadFilter(); f.type = 'bandpass';
      f.frequency.value = midi(nota) * 1.6; f.Q.value = 1.2;
      o.connect(f); f.connect(g); g.connect(this.bus);
      o.start(t); o.stop(t + 0.7);
    },

    bumbo(t) {
      const c = this.ctx;
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      const g = c.createGain();
      g.gain.setValueAtTime(this.cfg.bumbo, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
      o.connect(g); g.connect(this.bus);
      o.start(t); o.stop(t + 0.22);
    },

    chimbal(t) {
      const c = this.ctx;
      const len = Math.floor(c.sampleRate * 0.05);
      const b = c.createBuffer(1, len, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource(); src.buffer = b;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = c.createGain(); g.gain.value = this.cfg.chimbal;
      src.connect(f); f.connect(g); g.connect(this.bus);
      src.start(t);
    },
  };

  /* Efeitos sonoros passam por cima da trilha automaticamente. */
  const origem = {};
  for (const k of ['hit', 'miss', 'perfect', 'alert', 'stop', 'done', 'level', 'beatStrong']) {
    origem[k] = U.Sfx[k].bind(U.Sfx);
    U.Sfx[k] = function (...a) { Musica.abaixar(k === 'stop' || k === 'alert' ? 420 : 200); return origem[k](...a); };
  }

  U.Musica = Musica;
  U.Musica.CLIMAS = CLIMAS;

})(window.U);
