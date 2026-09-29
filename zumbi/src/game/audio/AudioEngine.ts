/**
 * MOTOR DE ÁUDIO (Web Audio no contexto do Phaser, que já destrava no
 * primeiro toque e silencia quando o app vai para o fundo).
 *
 * Cada voz: fonte → volume → passa-baixa (parede/distância) → estéreo → grupo,
 * e um envio para o eco da rua ou do cômodo (respostas geradas aqui, sem
 * gravação). As variações de cada som são geradas sob demanda: a primeira na
 * hora (o som não pode atrasar), as outras aos poucos, alguns ms por quadro.
 */
import { AUDIO_TUNING as T } from '../config/AudioTuning';
import { impulseResponse, Rng } from './dsp';
import { soundDef, type SoundCategory, type SoundDef, variantSeed } from './SoundCatalog';
import { pickVariant, playVariation, type Room } from './spatial';

export interface PlayOptions {
  /** 0..1 além do volume do catálogo. */
  gain?: number;
  pan?: number;
  cutoff?: number;
  wet?: number;
  room?: Room;
  /** Multiplica a altura (1 = normal). */
  rate?: number;
  /** Segundos até tocar. */
  delay?: number;
  /** Variação exata (ex.: o mesmo carro sempre com o mesmo alarme). */
  variant?: number;
}

/** Som contínuo (chuva, vento, fogo, motor): o diretor mexe no volume, giro e abafado ao vivo. */
export class LoopVoice {
  private stopped = false;
  constructor(
    private readonly ctx: AudioContext,
    private readonly src: AudioBufferSourceNode,
    private readonly out: GainNode,
    private readonly lp: BiquadFilterNode,
    private readonly panner: StereoPannerNode,
    private readonly send: GainNode,
    private readonly onEnd: () => void,
  ) {}

  /** Muda devagar (tau em s) para não estalar. */
  set(o: { gain?: number; rate?: number; cutoff?: number; pan?: number; wet?: number }, tau = 0.2): void {
    if (this.stopped) return;
    const now = this.ctx.currentTime;
    if (o.gain !== undefined) this.out.gain.setTargetAtTime(Math.max(0, o.gain), now, tau);
    if (o.rate !== undefined) this.src.playbackRate.setTargetAtTime(Math.max(0.05, o.rate), now, tau);
    if (o.cutoff !== undefined) this.lp.frequency.setTargetAtTime(Math.max(60, Math.min(o.cutoff, this.ctx.sampleRate / 2 - 100)), now, tau);
    if (o.pan !== undefined) this.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, o.pan)), now, tau);
    if (o.wet !== undefined) this.send.gain.setTargetAtTime(Math.max(0, Math.min(1, o.wet)), now, tau);
  }

  get alive(): boolean {
    return !this.stopped;
  }

  stop(fade = 0.5): void {
    if (this.stopped) return;
    this.stopped = true;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(0, now, fade / 4);
    try {
      this.src.stop(now + fade + 0.05);
    } catch {
      /* já parou */
    }
    this.onEnd();
  }
}

interface Voice {
  id: string;
  src: AudioBufferSourceNode;
  out: GainNode;
  level: number;
  started: number;
  ends: number;
}

interface Entry {
  def: SoundDef;
  buffers: (AudioBuffer | null)[];
  last: number;
  used: number;
}

const CATS: readonly SoundCategory[] = ['sfx', 'voz', 'ui', 'amb'];

export class AudioEngine {
  private readonly master: GainNode;
  private readonly buses = new Map<SoundCategory, GainNode>();
  private readonly sends = new Map<Room, GainNode>();
  private readonly entries = new Map<string, Entry>();
  private readonly queue: { id: string; v: number }[] = [];
  private voices: Voice[] = [];
  private readonly loops = new Set<LoopVoice>();
  private readonly rng = new Rng((Date.now() ^ 0x5eed) >>> 0);
  private bytes = 0;
  private volume = 1;
  private ducked = false;
  /** Gerador em outra linha (null = gera aqui mesmo, aos poucos). */
  private worker: Worker | null = null;
  private workerTried = false;
  private readonly inFlight = new Set<string>();

  constructor(
    readonly ctx: AudioContext,
    destination: AudioNode,
  ) {
    this.master = ctx.createGain();
    this.master.gain.value = T.master;
    // Compressor suave: tiro perto não estoura, passo baixinho continua audível.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    this.master.connect(comp);
    comp.connect(destination);
    for (const c of CATS) {
      const g = ctx.createGain();
      g.gain.value = T.bus[c];
      g.connect(this.master);
      this.buses.set(c, g);
    }
    this.addReverb('rua', T.street, 0x51ee7, [
      { t: 0.045, g: 0.22 },
      { t: 0.09, g: 0.3 },
      { t: 0.15, g: 0.2 },
      { t: 0.23, g: 0.16 },
      { t: 0.31, g: 0.1 },
    ]);
    this.addReverb('comodo', T.room, 0xc0d0, [
      { t: 0.006, g: 0.3 },
      { t: 0.011, g: 0.24 },
      { t: 0.017, g: 0.18 },
      { t: 0.026, g: 0.12 },
    ]);
  }

  /** Motor em cima do som do Phaser (null se o navegador não tem Web Audio). */
  static create(sound: unknown): AudioEngine | null {
    const m = sound as { context?: AudioContext; destination?: AudioNode } | null;
    if (!m?.context || !m.destination) return null;
    try {
      return new AudioEngine(m.context, m.destination);
    } catch (e) {
      console.warn('[som] desligado:', e);
      return null;
    }
  }

  private addReverb(room: Room, o: { seconds: number; decay: number; hfDecay: number; predelay: number; level: number }, seed: number, early: { t: number; g: number }[]): void {
    // O eco precisa estar na mesma taxa do contexto (regra do ConvolverNode).
    const sr = this.ctx.sampleRate;
    const [l, r] = impulseResponse(sr, seed, { ...o, early });
    const ir = this.ctx.createBuffer(2, l.length, sr);
    ir.copyToChannel(l as Float32Array<ArrayBuffer>, 0);
    ir.copyToChannel(r as Float32Array<ArrayBuffer>, 1);
    const conv = this.ctx.createConvolver();
    conv.buffer = ir;
    const send = this.ctx.createGain();
    const ret = this.ctx.createGain();
    ret.gain.value = o.level;
    send.connect(conv);
    conv.connect(ret);
    ret.connect(this.buses.get('sfx')!);
    this.sends.set(room, send);
  }

  /** Volume geral do botão SOM (0..1). */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyMaster();
  }

  /** Abafa o ambiente (clima, bichos) por alguns segundos: depois de um tiro perto, o resto some. */
  dip(to: number, seconds: number): void {
    const g = this.buses.get('amb')!.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(T.bus.amb * to, now, 0.03);
    g.setTargetAtTime(T.bus.amb, now + seconds * 0.4, seconds * 0.3);
  }

  /** Pausa: abaixa tudo (sem cortar seco). */
  duck(on: boolean): void {
    this.ducked = on;
    this.applyMaster();
  }

  private applyMaster(): void {
    const g = this.ducked ? 0 : T.master * this.volume * this.volume;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(g, now, 0.05);
  }

  get muted(): boolean {
    return this.volume <= 0 || this.ducked;
  }

  has(id: string): boolean {
    return !!soundDef(id);
  }

  /** Deixa variações prontas antes de precisar (arma na mão, chão debaixo do pé). */
  warm(id: string): void {
    const e = this.entry(id);
    if (!e) return;
    e.used = this.ctx.currentTime;
    e.buffers.forEach((b, v) => {
      if (!b && !this.queue.some((q) => q.id === id && q.v === v)) this.queue.push({ id, v });
    });
  }

  /** Toca um som do catálogo. */
  play(id: string, o: PlayOptions = {}): void {
    if (this.muted || this.ctx.state !== 'running') return;
    const e = this.entry(id);
    if (!e) return;
    e.used = this.ctx.currentTime;
    const ready: number[] = [];
    e.buffers.forEach((b, v) => b && ready.push(v));
    if (!ready.length) {
      // Primeira vez: gera uma variação agora e as outras na fila.
      this.render(e, 0);
      ready.push(0);
      this.warm(id);
    }
    const v = o.variant !== undefined && e.buffers[o.variant % e.def.variants] ? o.variant % e.def.variants : pickVariant(ready, e.last, () => this.rng.next());
    e.last = v;
    const buf = e.buffers[v]!;
    const jit = playVariation(() => this.rng.next(), e.def.pitch);
    const level = e.def.gain * (o.gain ?? 1) * jit.gain;
    if (level < 0.004) return;
    const rate = jit.rate * (o.rate ?? 1);
    this.makeRoom(id, e.def.maxVoices, level);

    const ctx = this.ctx;
    const t0 = ctx.currentTime + Math.max(0, o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const out = ctx.createGain();
    out.gain.value = level;
    let node: AudioNode = out;
    src.connect(out);
    if (o.cutoff !== undefined && o.cutoff < 15000) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = o.cutoff;
      lp.Q.value = 0.5;
      node.connect(lp);
      node = lp;
    }
    if (o.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      node.connect(p);
      node = p;
    }
    node.connect(this.buses.get(e.def.cat)!);
    // Sem posição (som do próprio jogador): pouco eco, o do catálogo.
    const wet = o.wet ?? e.def.reverb * T.wetNear;
    if (wet > 0.01) {
      const s = ctx.createGain();
      s.gain.value = Math.min(1, wet);
      node.connect(s);
      s.connect(this.sends.get(o.room ?? 'rua')!);
    }
    src.start(t0);
    const voice: Voice = { id, src, out, level, started: t0, ends: t0 + buf.duration / rate };
    src.onended = () => {
      this.voices = this.voices.filter((x) => x !== voice);
      try {
        out.disconnect();
      } catch {
        /* já desligado */
      }
    };
    this.voices.push(voice);
  }

  /**
   * Começa um som contínuo (volume 0: o diretor sobe). Se a variação ainda não
   * está pronta, pede para gerar e devolve null (tenta de novo depois): um laço
   * de vários segundos não é gerado na hora, para o jogo não engasgar.
   */
  loop(id: string, o: PlayOptions = {}): LoopVoice | null {
    const e = this.entry(id);
    if (!e || this.ctx.state !== 'running') return null;
    e.used = this.ctx.currentTime;
    const v = (o.variant ?? 0) % e.def.variants;
    const buf = e.buffers[v];
    if (!buf) {
      if (!this.queue.some((q) => q.id === id && q.v === v)) this.queue.unshift({ id, v });
      return null;
    }
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = o.rate ?? 1;
    const out = ctx.createGain();
    out.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(o.cutoff ?? 20000, ctx.sampleRate / 2 - 100);
    lp.Q.value = 0.5;
    const pn = ctx.createStereoPanner();
    pn.pan.value = o.pan ?? 0;
    src.connect(out).connect(lp).connect(pn).connect(this.buses.get(e.def.cat)!);
    const send = ctx.createGain();
    send.gain.value = o.wet ?? 0;
    pn.connect(send).connect(this.sends.get(o.room ?? 'rua')!);
    // Começa num ponto sorteado: dois laços iguais não andam juntos.
    src.start(ctx.currentTime, this.rng.next() * buf.duration);
    const lv: LoopVoice = new LoopVoice(ctx, src, out, lp, pn, send, () => this.loops.delete(lv));
    this.loops.add(lv);
    if (o.gain !== undefined) lv.set({ gain: o.gain }, 0.3);
    return lv;
  }

  /**
   * Um quadro: manda gerar as variações da fila. No worker (sem travar o
   * jogo), algumas por vez; sem worker, aqui mesmo dentro do orçamento de tempo.
   */
  update(): void {
    if (!this.queue.length) return;
    if (!this.workerTried) this.startWorker();
    const w = this.worker;
    if (w) {
      while (this.queue.length && this.inFlight.size < 4) {
        const q = this.queue.shift()!;
        const key = `${q.id}#${q.v}`;
        if (this.entries.get(q.id)?.buffers[q.v] || this.inFlight.has(key)) continue;
        this.inFlight.add(key);
        w.postMessage(q);
      }
      return;
    }
    const start = performance.now();
    while (this.queue.length && performance.now() - start < T.renderBudgetMs) {
      const q = this.queue.shift()!;
      const e = this.entries.get(q.id);
      if (e && !e.buffers[q.v]) this.render(e, q.v);
    }
  }

  private startWorker(): void {
    this.workerTried = true;
    try {
      const w = new Worker(new URL('./renderWorker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (ev: MessageEvent<{ id: string; v: number; data: Float32Array | null }>) => {
        const { id, v, data } = ev.data;
        this.inFlight.delete(`${id}#${v}`);
        const e = this.entries.get(id);
        if (e && data && !e.buffers[v]) this.store(e, v, data);
      };
      // Worker não carregou (hospedagem, WebView antiga): volta a gerar aqui.
      w.onerror = () => {
        w.terminate();
        if (this.worker === w) this.worker = null;
        this.inFlight.clear();
      };
      this.worker = w;
    } catch {
      this.worker = null;
    }
  }

  /** Quanto está na memória (MB), para o debug e o teste. */
  get memoryMb(): number {
    return this.bytes / (1024 * 1024);
  }

  get playing(): number {
    return this.voices.length;
  }

  stopAll(): void {
    for (const l of [...this.loops]) l.stop(0.2);
    for (const v of this.voices) {
      try {
        v.src.stop();
      } catch {
        /* não começou */
      }
    }
    this.voices = [];
    this.queue.length = 0;
  }

  /** Variações ainda na fila (debug/teste). */
  get queued(): number {
    return this.queue.length + this.inFlight.size;
  }

  private entry(id: string): Entry | null {
    let e = this.entries.get(id);
    if (e) return e;
    const def = soundDef(id);
    if (!def) return null;
    e = { def, buffers: new Array<AudioBuffer | null>(def.variants).fill(null), last: -1, used: 0 };
    this.entries.set(id, e);
    return e;
  }

  private render(e: Entry, v: number): void {
    this.store(e, v, e.def.make(new Rng(variantSeed(e.def.id, v)), e.def.sr));
  }

  private store(e: Entry, v: number, data: Float32Array): void {
    const len = Math.max(1, data.length);
    const buf = this.ctx.createBuffer(1, len, e.def.sr);
    buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
    e.buffers[v] = buf;
    this.bytes += len * 4;
    if (this.bytes > T.memoryMb * 1024 * 1024) this.evict(e.def.id);
  }

  /** Memória cheia: esquece as variações do som menos usado (menos a primeira). */
  private evict(keep: string): void {
    // Laço tocando não sai da memória (o buffer está em uso).
    const list = [...this.entries.values()].filter((x) => x.def.id !== keep && !x.def.loop && x.buffers.some((b) => b)).sort((a, b) => a.used - b.used);
    for (const e of list) {
      e.buffers.forEach((b, v) => {
        if (b && !this.voices.some((x) => x.src.buffer === b)) {
          this.bytes -= b.length * 4;
          e.buffers[v] = null;
        }
      });
      if (this.bytes <= T.memoryMb * 0.8 * 1024 * 1024) return;
    }
  }

  /** Limite de vozes: do mesmo som e no total (corta a mais velha/fraca, com fade curto). */
  private makeRoom(id: string, perId: number, level: number): void {
    const now = this.ctx.currentTime;
    this.voices = this.voices.filter((v) => v.ends > now - 0.05);
    const same = this.voices.filter((v) => v.id === id);
    if (same.length >= perId) this.cut(same[0]!);
    if (this.voices.length >= T.maxVoices) {
      const weakest = [...this.voices].sort((a, b) => a.level - b.level || a.started - b.started)[0]!;
      if (weakest.level <= level * 2) this.cut(weakest);
    }
  }

  private cut(v: Voice): void {
    const now = this.ctx.currentTime;
    v.out.gain.cancelScheduledValues(now);
    v.out.gain.setTargetAtTime(0, now, 0.015);
    try {
      v.src.stop(now + 0.08);
    } catch {
      /* já parou */
    }
    this.voices = this.voices.filter((x) => x !== v);
  }
}
