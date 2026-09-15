import { AUDIO } from '../data/config.js';

/**
 * Gerenciador de áudio.
 *
 * 1. Tenta carregar os arquivos reais listados em AUDIO.faixas.
 * 2. Se o arquivo não existir (404) ou não decodificar, cai numa SÍNTESE
 *    WebAudio equivalente — vento, vidro, metal, pulso grave, drone.
 *    Nada quebra, nada vai para o console, e soltar os .mp3 em
 *    `public/audio/` faz o som real assumir o lugar sem tocar em código.
 * 3. Nunca inicia sozinho: só depois de um gesto do usuário no botão SOM.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ligado = false;
    this.buffers = new Map();
    this.loops = new Map();
    this.carregado = false;
    this.disponivel = typeof (window.AudioContext || window.webkitAudioContext) === 'function';
  }

  async _garantirContexto() {
    if (!this.disponivel) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      // leve compressão para o conjunto nunca estourar
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  async _carregarArquivos() {
    if (this.carregado) return;
    this.carregado = true;
    const base = import.meta.env?.BASE_URL || './';
    await Promise.all(
      Object.entries(AUDIO.faixas).map(async ([nome, faixa]) => {
        try {
          const url = new URL(faixa.arquivo, new URL(base, location.href)).href;
          const res = await fetch(url, { cache: 'force-cache' });
          if (!res.ok) return;
          const tipo = res.headers.get('content-type') || '';
          if (tipo.includes('text/html')) return; // dev server devolvendo index.html
          const ab = await res.arrayBuffer();
          if (ab.byteLength < 512) return;
          const buf = await this.ctx.decodeAudioData(ab);
          this.buffers.set(nome, buf);
        } catch (_) {
          /* sem arquivo: a síntese cobre */
        }
      })
    );
  }

  async ligar() {
    await this._garantirContexto();
    if (!this.ctx) return false;
    await this._carregarArquivos();
    this.ligado = true;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.6);
    this._iniciarAmbiente();
    return true;
  }

  desligar() {
    this.ligado = false;
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.35);
    setTimeout(() => {
      if (this.ligado) return;
      for (const [, node] of this.loops) {
        try {
          node.stop?.();
          node.disconnect?.();
        } catch (_) {}
      }
      this.loops.clear();
    }, 900);
  }

  async alternar() {
    if (this.ligado) {
      this.desligar();
      return false;
    }
    await this.ligar();
    return true;
  }

  /** Empurra o timbre do ambiente conforme a escala de tempo da cena. */
  setTimeScale(ts) {
    this._ts = ts;
    if (!this.ctx || !this.ligado) return;
    const f = this.loops.get('__filtro');
    if (f) f.frequency.setTargetAtTime(240 + ts * 900, this.ctx.currentTime, 0.25);
    const d = this.loops.get('__drone');
    if (d?.detune) d.detune.setTargetAtTime((ts - 1) * 400, this.ctx.currentTime, 0.4);
  }

  _iniciarAmbiente() {
    if (this.loops.size) return;
    const ctx = this.ctx;

    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 900;
    filtro.Q.value = 0.6;
    filtro.connect(this.master);
    this.loops.set('__filtro', filtro);

    // ambiente: arquivo se existir, senão drone sintetizado
    const ambBuf = this.buffers.get('ambiente');
    if (ambBuf) {
      const src = ctx.createBufferSource();
      src.buffer = ambBuf;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = AUDIO.faixas.ambiente.volume;
      src.connect(g).connect(filtro);
      src.start();
      this.loops.set('ambiente', src);
      this.loops.set('__drone', src);
    } else {
      const g = ctx.createGain();
      g.gain.value = 0.0;
      g.gain.setTargetAtTime(AUDIO.faixas.ambiente.volume, ctx.currentTime, 2.0);
      g.connect(filtro);
      [55, 82.5, 110, 164.8].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? 'triangle' : 'sine';
        o.frequency.value = f;
        const og = ctx.createGain();
        og.gain.value = 0.22 / (i + 1);
        // batimento lento entre as vozes: o salão "respira"
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.035 + i * 0.013;
        const lg = ctx.createGain();
        lg.gain.value = 0.1 / (i + 1);
        lfo.connect(lg).connect(og.gain);
        lfo.start();
        o.connect(og).connect(g);
        o.start();
        if (i === 0) this.loops.set('__drone', o);
      });
      this.loops.set('ambiente', { stop() {}, disconnect() {} });
    }

    // vento: ruído rosa filtrado varrendo devagar
    const ventoBuf = this.buffers.get('vento');
    const gv = ctx.createGain();
    gv.gain.value = AUDIO.faixas.vento.volume;
    gv.connect(filtro);
    if (ventoBuf) {
      const src = ctx.createBufferSource();
      src.buffer = ventoBuf;
      src.loop = true;
      src.connect(gv);
      src.start();
      this.loops.set('vento', src);
    } else {
      const ruido = this._ruido(6);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 520;
      bp.Q.value = 0.8;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05;
      const lg = ctx.createGain();
      lg.gain.value = 300;
      lfo.connect(lg).connect(bp.frequency);
      lfo.start();
      ruido.connect(bp).connect(gv);
      ruido.start();
      this.loops.set('vento', ruido);
    }
  }

  _ruido(segundos = 4) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * segundos;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.0555;
      b1 = 0.963 * b1 + w * 0.0750;
      b2 = 0.57 * b2 + w * 0.1538;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.4;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  /** Disparo pontual: vidro, impacto, metal, transicao, pulso. */
  tocar(nome, { volume = 1, detune = 0 } = {}) {
    if (!this.ligado || !this.ctx) return;
    const faixa = AUDIO.faixas[nome];
    if (!faixa) return;
    const ctx = this.ctx;
    const buf = this.buffers.get(nome);
    const g = ctx.createGain();
    g.gain.value = faixa.volume * volume;
    g.connect(this.master);

    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.detune && (src.detune.value = detune);
      src.connect(g);
      src.start();
      return;
    }
    const t = ctx.currentTime;
    switch (faixa.sintese) {
      case 'vidro': {
        // cacos: parciais inarmônicos com decaimento curto
        for (let i = 0; i < 7; i++) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = 1800 + Math.random() * 4200;
          const og = ctx.createGain();
          og.gain.setValueAtTime(0.0001, t);
          og.gain.exponentialRampToValueAtTime(0.12 + Math.random() * 0.12, t + 0.004);
          og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22 + Math.random() * 0.4);
          o.connect(og).connect(g);
          o.start(t + Math.random() * 0.03);
          o.stop(t + 0.9);
        }
        break;
      }
      case 'metal': {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(880, t);
        o.frequency.exponentialRampToValueAtTime(420, t + 0.5);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1400;
        bp.Q.value = 6;
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.35, t);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        o.connect(bp).connect(og).connect(g);
        o.start(t);
        o.stop(t + 1.5);
        break;
      }
      case 'impacto': {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(140, t);
        o.frequency.exponentialRampToValueAtTime(38, t + 0.32);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.9, t);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        o.connect(og).connect(g);
        o.start(t);
        o.stop(t + 0.8);
        break;
      }
      case 'pulso': {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(64, t);
        o.frequency.exponentialRampToValueAtTime(26, t + 1.1);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.0001, t);
        og.gain.exponentialRampToValueAtTime(0.85, t + 0.06);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o.connect(og).connect(g);
        o.start(t);
        o.stop(t + 1.7);
        break;
      }
      case 'transicao':
      default: {
        const n = this._ruido(2);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 3;
        bp.frequency.setValueAtTime(320, t);
        bp.frequency.exponentialRampToValueAtTime(5200, t + 0.7);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.0001, t);
        og.gain.exponentialRampToValueAtTime(0.5, t + 0.18);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
        n.connect(bp).connect(og).connect(g);
        n.start(t);
        n.stop(t + 1.1);
        break;
      }
    }
  }
}

export const audio = new AudioManager();
