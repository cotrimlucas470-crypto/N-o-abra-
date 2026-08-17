/**
 * AudioManager — Web Audio API.
 * O AudioContext só é criado depois do primeiro toque do usuário (política dos navegadores
 * móveis) e os buffers são decodificados sob demanda, uma vez por asset.
 */
export class AudioManager {
  constructor(assets, logger) {
    this.assets = assets;
    this.logger = logger;
    this.ctx = null;
    this.master = null;
    this.buffers = new Map();
    this.playing = new Set();
    this.muted = false;
  }

  ensureContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;               // fallback silencioso, sem quebrar o app
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  async load(assetId) {
    if (this.buffers.has(assetId)) return this.buffers.get(assetId);
    const ctx = this.ensureContext();
    const asset = this.assets.get(assetId);
    if (!ctx || !asset || !asset.blob) return null;
    try {
      const arr = await asset.blob.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);
      this.buffers.set(assetId, buf);
      return buf;
    } catch (err) {
      this.logger && this.logger.warn(`Áudio não suportado: ${asset.name} (${err.message})`);
      this.buffers.set(assetId, null);
      return null;
    }
  }

  play(assetId, { volume = 1, loop = false, pitch = 1 } = {}) {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    const handle = { src: null, stopped: false };
    const buf = this.buffers.get(assetId);
    const start = (buffer) => {
      if (!buffer || handle.stopped) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = loop;
      src.playbackRate.value = pitch;
      const g = ctx.createGain();
      g.gain.value = volume;
      src.connect(g).connect(this.master);
      src.start();
      src.onended = () => this.playing.delete(handle);
      handle.src = src;
      this.playing.add(handle);
    };
    if (buf === undefined) this.load(assetId).then(start);
    else start(buf);
    return handle;
  }

  stop(handle) {
    if (!handle) return;
    handle.stopped = true;
    try { handle.src && handle.src.stop(); } catch { /* já parado */ }
    this.playing.delete(handle);
  }

  stopAll() {
    for (const h of Array.from(this.playing)) this.stop(h);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1;
  }
}
