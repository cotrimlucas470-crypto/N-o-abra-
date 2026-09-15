import { damp, clamp } from '../utils/math.js';

/**
 * CHRONO MIRROR — o relógio da experiência.
 *
 * Toda a cena (fragmentos, partículas, câmera, timelines GSAP registradas)
 * lê o `dt` daqui. Mudar a escala de tempo não anima um número: muda de
 * verdade a velocidade de tudo que está acontecendo.
 */
class TimeControl {
  constructor() {
    this.base = 1; // escala pedida pelo usuário (slider)
    this.evento = 1; // escala imposta por um evento (quebra de tempo)
    this.atual = 1; // escala suavizada de fato aplicada
    this.pausado = false;
    this.tempo = 0; // relógio interno já escalado — é o que os shaders usam
    this.tempoReal = 0;
    this.onda = 0; // 0..1, energia da onda de choque
    this.distorcao = 0; // 0..1, glitch/aberração temporal
    this.quebrando = false;
    this.cooldown = 0;
    this.cooldownTotal = 1;
    this.timelines = new Set();
    this.ouvintes = new Set();
  }

  registrar(tl) {
    this.timelines.add(tl);
    return () => this.timelines.delete(tl);
  }

  escutar(fn) {
    this.ouvintes.add(fn);
    return () => this.ouvintes.delete(fn);
  }

  _emitir(evento, dado) {
    for (const fn of this.ouvintes) fn(evento, dado);
  }

  definirBase(v) {
    this.base = clamp(v, 0.05, 2.6);
    this._emitir('escala', this.base);
  }

  get alvo() {
    return this.pausado ? 0 : this.base * this.evento;
  }

  /** Recebe o dt real do rAF e devolve o dt já escalado pelo domínio temporal. */
  passo(dtReal) {
    this.tempoReal += dtReal;
    this.atual = damp(this.atual, this.alvo, 0.0009, dtReal);
    if (Math.abs(this.atual - this.alvo) < 0.0015) this.atual = this.alvo;

    const dt = dtReal * this.atual;
    this.tempo += dt;

    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dtReal);
    this.onda = Math.max(0, this.onda - dtReal * 0.85);
    this.distorcao = damp(this.distorcao, this.quebrando ? 1 : 0, 0.002, dtReal);

    for (const tl of this.timelines) {
      if (tl && tl.timeScale) tl.timeScale(this.atual);
    }
    return dt;
  }

  /**
   * QUEBRAR O TEMPO.
   * Congela o salão, dispara a onda de choque, distorce o pós-processamento,
   * e devolve tudo ao normal com um estalo.
   */
  quebrar(duracao = 2.1, cooldown = 9) {
    if (this.cooldown > 0 || this.quebrando) return false;
    this.quebrando = true;
    this.evento = 0.035;
    this.onda = 1;
    this.cooldownTotal = cooldown;
    this._emitir('quebra-inicio', duracao);

    clearTimeout(this._t1);
    clearTimeout(this._t2);
    this._t1 = setTimeout(() => {
      // volta rápida: o tempo estala de volta
      this.evento = 1.75;
      this.onda = 1;
      this.quebrando = false;
      this._emitir('quebra-retorno');
      this._t2 = setTimeout(() => {
        this.evento = 1;
        this.cooldown = cooldown;
        this._emitir('quebra-fim');
      }, 620);
    }, duracao * 1000);
    return true;
  }

  /** Pulso curto de dilatação — usado em cliques, hovers fortes e transições. */
  pulso(escala = 0.45, ms = 420) {
    if (this.quebrando) return;
    this.evento = escala;
    clearTimeout(this._tp);
    this._tp = setTimeout(() => {
      if (!this.quebrando) this.evento = 1;
    }, ms);
  }

  get emCooldown() {
    return this.cooldown > 0;
  }
  get progressoCooldown() {
    return this.cooldownTotal ? 1 - this.cooldown / this.cooldownTotal : 1;
  }
}

export const tempo = new TimeControl();
