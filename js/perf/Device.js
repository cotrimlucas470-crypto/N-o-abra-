/**
 * Detecção de dispositivo e capacidades.
 *
 * Regra: nada é inventado. Só reportamos o que a plataforma expõe de fato
 * (userAgent, screen, devicePixelRatio, hardwareConcurrency, deviceMemory,
 * suporte a WebGL/OffscreenCanvas/Workers) e a taxa de atualização medida.
 */

export class Device {
  constructor() {
    const ua = navigator.userAgent || '';
    const uaData = navigator.userAgentData || null;

    this.userAgent = ua;
    this.isAndroid = /Android/i.test(ua);
    this.isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    this.isMobile = this.isAndroid || this.isIOS || (uaData ? !!uaData.mobile : /Mobi/i.test(ua));
    this.vendorHint = /poco|xiaomi|redmi|mi\s/i.test(ua) ? 'xiaomi' : null;
    this.model = extractAndroidModel(ua);

    this.dpr = window.devicePixelRatio || 1;
    this.screenW = Math.round(screen.width * this.dpr);
    this.screenH = Math.round(screen.height * this.dpr);
    this.cores = navigator.hardwareConcurrency || 0;
    this.memoryGB = navigator.deviceMemory || 0;

    this.hasWebGL = detectWebGL();
    this.hasWebGL2 = detectWebGL(true);
    this.hasWorkers = typeof Worker !== 'undefined';
    this.hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
    this.hasStorage = 'indexedDB' in window;
    this.hasBatteryAPI = 'getBattery' in navigator;
    this.refreshHz = null;               // preenchido por measureRefreshRate()
    this.gpu = readGpuString();
  }

  /**
   * Perfil POCO X7 Pro (ou hardware equivalente): AMOLED alto (2712×1220),
   * Android, 8 núcleos e >= 8 GB. Sem API para ler o SoC — a checagem é por
   * assinatura de tela + capacidades, e o usuário pode forçar nas configurações.
   */
  matchesPocoX7ProProfile() {
    if (!this.isAndroid) return false;
    const longSide = Math.max(this.screenW, this.screenH);
    const shortSide = Math.min(this.screenW, this.screenH);
    const resMatch = longSide >= 2600 && longSide <= 2800 && shortSide >= 1150 && shortSide <= 1300;
    const strong = this.cores >= 8 && (this.memoryGB === 0 || this.memoryGB >= 8);
    return (resMatch && strong) || (this.vendorHint === 'xiaomi' && resMatch);
  }

  /** Classe genérica de desempenho, usada quando o perfil específico não bate. */
  tier() {
    if (!this.isMobile) return 'desktop';
    if (this.cores >= 8 && this.memoryGB >= 8) return 'high';
    if (this.cores >= 6 && (this.memoryGB === 0 || this.memoryGB >= 4)) return 'mid';
    return 'low';
  }

  /** Mede a taxa de atualização real da tela (nunca "inventa" 120 Hz). */
  measureRefreshRate(samples = 40) {
    return new Promise((resolve) => {
      const deltas = [];
      let last = performance.now();
      let n = 0;
      const tick = (ts) => {
        const d = ts - last;
        last = ts;
        if (d > 0.5 && d < 100) deltas.push(d);
        if (++n < samples) requestAnimationFrame(tick);
        else {
          deltas.sort((a, b) => a - b);
          const median = deltas[Math.floor(deltas.length / 2)] || 16.67;
          const hz = Math.round(1000 / median);
          this.refreshHz = [30, 60, 75, 90, 120, 144].reduce((best, c) => (Math.abs(c - hz) < Math.abs(best - hz) ? c : best), 60);
          resolve(this.refreshHz);
        }
      };
      requestAnimationFrame(tick);
    });
  }

  summary() {
    return {
      Plataforma: this.isAndroid ? 'Android' : this.isIOS ? 'iOS' : 'Desktop/outro',
      Modelo: this.model || '—',
      Tela: `${this.screenW}×${this.screenH} @ DPR ${this.dpr.toFixed(2)}`,
      'Refresh medido': this.refreshHz ? `${this.refreshHz} Hz` : 'medindo…',
      Núcleos: this.cores || 'não informado',
      Memória: this.memoryGB ? `${this.memoryGB} GB` : 'não informada',
      GPU: this.gpu || 'não informada',
      WebGL: this.hasWebGL2 ? 'WebGL2' : this.hasWebGL ? 'WebGL1' : 'indisponível',
      Workers: this.hasWorkers ? 'sim' : 'não',
      IndexedDB: this.hasStorage ? 'sim' : 'não',
      Perfil: this.matchesPocoX7ProProfile() ? 'POCO X7 Pro / equivalente' : `tier ${this.tier()}`,
    };
  }
}

function extractAndroidModel(ua) {
  const m = /Android[^;]*;\s*([^)]+?)(?:\s+Build\/|\))/.exec(ua);
  if (!m) return null;
  return m[1].replace(/\s*wv\s*/i, '').trim();
}

function detectWebGL(v2 = false) {
  try {
    const c = document.createElement('canvas');
    return !!(v2 ? c.getContext('webgl2') : (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch { return false; }
}

function readGpuString() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl');
    if (!gl) return null;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (!dbg) return null;
    return gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || null;
  } catch { return null; }
}

export const device = new Device();
