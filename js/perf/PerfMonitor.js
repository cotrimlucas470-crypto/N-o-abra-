import { bus } from '../core/EventBus.js';
import { device } from './Device.js';

/**
 * PerfMonitor — mede, mostra e reage.
 *
 * Mede: frame time, FPS médio, 1% low, tempo de script/física/render, draw calls,
 * objetos, nós do DOM, resolução do canvas e memória (quando o navegador expõe).
 * Nada aqui é estimado por "sensação": se o dado não existe, mostramos "—".
 *
 * Reage: resolução dinâmica (mantém o frame time abaixo do alvo) e aviso de possível
 * thermal throttling (queda sustentada de desempenho — não existe API de temperatura
 * no navegador, então não inventamos números).
 */
export class PerfMonitor {
  constructor({ engine, quality, overlayEl }) {
    this.engine = engine;
    this.quality = quality;
    this.overlayEl = overlayEl;
    this.renderers = [];             // { name, renderer }
    this.frames = new Float32Array(240);
    this.frameIdx = 0;
    this.frameCount = 0;
    this.lastOverlay = 0;
    this.fps = 0;
    this.avgFrameMs = 16.7;
    this.low1 = 0;
    this.dynScale = 1;
    this._dynCooldown = 0;
    this._peakFps = 0;
    this._throttleWarned = false;
    this._sinceStart = 0;
    this.enabled = false;

    bus.on('engine:frameEnd', (fs) => this.sample(fs));
  }

  addRenderer(name, renderer) { this.renderers.push({ name, renderer }); }

  setEnabled(v) {
    this.enabled = v;
    if (this.overlayEl) this.overlayEl.hidden = !v;
  }

  sample(frameStats) {
    const ms = frameStats.frameMs;
    this.frames[this.frameIdx] = ms;
    this.frameIdx = (this.frameIdx + 1) % this.frames.length;
    this.frameCount++;
    this._sinceStart += ms;

    if ((this.frameCount & 15) === 0) {
      this._recompute();
      this._applyDynamicResolution();
      this._checkThrottling();
    }
    if (this.enabled && performance.now() - this.lastOverlay > 250) {
      this.lastOverlay = performance.now();
      this._renderOverlay(frameStats);
    }
  }

  _recompute() {
    const n = Math.min(this.frameCount, this.frames.length);
    if (!n) return;
    let sum = 0;
    const arr = [];
    for (let i = 0; i < n; i++) { const v = this.frames[i]; sum += v; arr.push(v); }
    this.avgFrameMs = sum / n;
    this.fps = 1000 / Math.max(0.001, this.avgFrameMs);
    arr.sort((a, b) => b - a);
    const idx = Math.max(0, Math.floor(n * 0.01));
    this.low1 = 1000 / Math.max(0.001, arr[idx] || this.avgFrameMs);
    if (this.fps > this._peakFps) this._peakFps = this.fps;
  }

  /** Ajusta a resolução interna suavemente para segurar o frame time no alvo. */
  _applyDynamicResolution() {
    const s = this.quality.settings;
    if (!s.dynamicResolution) {
      for (const r of this.renderers) r.renderer.setResolutionScale(s.resolutionScale);
      return;
    }
    const targetMs = 1000 / this.quality.targetFps;
    const base = s.resolutionScale;
    if (this._dynCooldown > 0) { this._dynCooldown--; return; }

    let next = this.dynScale;
    if (this.avgFrameMs > targetMs * 1.22) next = Math.max(0.6, this.dynScale - 0.05);
    else if (this.avgFrameMs < targetMs * 0.82) next = Math.min(1, this.dynScale + 0.05);

    if (Math.abs(next - this.dynScale) > 0.001) {
      this.dynScale = next;
      this._dynCooldown = 4;
      for (const r of this.renderers) r.renderer.setResolutionScale(base * this.dynScale);
    }
  }

  _checkThrottling() {
    if (this._throttleWarned || this._sinceStart < 25000) return;
    if (this._peakFps > 45 && this.fps < this._peakFps * 0.72 && this.avgFrameMs > 1000 / this.quality.targetFps * 1.4) {
      this._throttleWarned = true;
      bus.emit('perf:throttle', {
        peak: Math.round(this._peakFps),
        now: Math.round(this.fps),
        message: 'Queda sustentada de desempenho detectada. Pode ser thermal throttling do aparelho — ' +
                 'o navegador não expõe temperatura, então este é um sinal indireto.',
      });
    }
  }

  snapshot() {
    const main = this.renderers[0] && this.renderers[0].renderer;
    const eng = this.engine;
    const scene = eng.scene;
    const mem = performance.memory ? (performance.memory.usedJSHeapSize / 1048576) : null;
    return {
      fps: this.fps,
      low1: this.low1,
      frameMs: this.avgFrameMs,
      scriptMs: eng.frameStats.scriptMs,
      physicsMs: eng.frameStats.physicsMs,
      renderMs: main ? main.stats.ms : 0,
      updateMs: eng.frameStats.updateMs,
      drawCalls: main ? main.stats.drawCalls : 0,
      objects: scene ? scene.objectCount : 0,
      visible: main ? main.stats.objects : 0,
      culled: main ? main.stats.culled : 0,
      bodies: eng.physics.stats.bodies,
      awake: eng.physics.stats.awake,
      pairs: eng.physics.stats.pairs,
      scripts: eng._scripts.length,
      domNodes: document.getElementsByTagName('*').length,
      canvasRes: main ? `${main.width}×${main.height}` : '—',
      resScale: main ? main.resolutionScale : 1,
      memoryMB: mem,
      targetFps: this.quality.targetFps,
      refreshHz: device.refreshHz,
    };
  }

  _renderOverlay(frameStats) {
    const s = this.snapshot();
    const cls = (v, good, mid) => (v >= good ? 'good' : v >= mid ? 'mid' : 'bad');
    const el = this.overlayEl;
    if (!el) return;
    el.innerHTML =
      `<div><span class="k">FPS </span><span class="${cls(s.fps, s.targetFps * 0.92, s.targetFps * 0.6)}">${s.fps.toFixed(0)}</span>` +
      ` <span class="k">1% </span>${s.low1.toFixed(0)}</div>` +
      `<div><span class="k">frame </span>${s.frameMs.toFixed(2)} ms</div>` +
      `<div><span class="k">script </span>${frameStats.scriptMs.toFixed(2)} <span class="k">phys </span>${frameStats.physicsMs.toFixed(2)}</div>` +
      `<div><span class="k">render </span>${s.renderMs.toFixed(2)} ms <span class="k">dc </span>${s.drawCalls}</div>` +
      `<div><span class="k">obj </span>${s.visible}/${s.objects} <span class="k">cull </span>${s.culled}</div>` +
      `<div><span class="k">rb </span>${s.awake}/${s.bodies} <span class="k">pairs </span>${s.pairs}</div>` +
      `<div><span class="k">res </span>${s.canvasRes} @${(s.resScale * 100).toFixed(0)}%</div>` +
      `<div><span class="k">dom </span>${s.domNodes}${s.memoryMB != null ? ` <span class="k">mem </span>${s.memoryMB.toFixed(0)}MB` : ''}</div>`;
  }

  /** Benchmark: mede por N segundos e devolve métricas reais. */
  async benchmark(seconds = 5) {
    const start = performance.now();
    const samples = [];
    return new Promise((resolve) => {
      const off = bus.on('engine:frameEnd', (fs) => samples.push(fs.frameMs));
      const check = () => {
        if (performance.now() - start < seconds * 1000) { setTimeout(check, 100); return; }
        off();
        if (!samples.length) { resolve(null); return; }
        const sorted = [...samples].sort((a, b) => a - b);
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        const p99 = sorted[Math.floor(sorted.length * 0.99)] || avg;
        resolve({
          frames: samples.length,
          seconds,
          avgFps: 1000 / avg,
          avgFrameMs: avg,
          low1Fps: 1000 / p99,
          bestFrameMs: sorted[0],
          worstFrameMs: sorted[sorted.length - 1],
        });
      };
      check();
    });
  }
}
