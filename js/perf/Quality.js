import { device } from './Device.js';
import { bus } from '../core/EventBus.js';

/**
 * Perfis de qualidade e energia.
 *
 * Cada opção existe porque resolve um problema medível:
 *  - fpsLimit        → menos frames = menos CPU/GPU e menos calor (bateria);
 *  - resolutionScale → o custo de preenchimento cai com o quadrado da escala;
 *  - dynamicResolution → mantém o frame time sob o alvo sem trocar a qualidade da UI;
 *  - shadows/particles/postFX → cortes de overdraw, que é o gargalo típico em GPU móvel.
 */

export const POWER_MODES = {
  battery:     { label: 'Battery Saver', fps: 30 },
  balanced:    { label: 'Balanced', fps: 60 },
  performance: { label: 'Performance', fps: 90 },
  ultra:       { label: 'Ultra Performance', fps: 120 },
};

export const GRAPHICS_PRESETS = {
  low:    { resolutionScale: 0.75, shadows: 'off',    particles: 100,  postProcessing: false, antiAlias: 'off',    textureQuality: 'low' },
  medium: { resolutionScale: 0.85, shadows: 'low',    particles: 300,  postProcessing: false, antiAlias: 'low',    textureQuality: 'medium' },
  high:   { resolutionScale: 1.0,  shadows: 'medium', particles: 800,  postProcessing: false, antiAlias: 'medium', textureQuality: 'high' },
  ultra:  { resolutionScale: 1.0,  shadows: 'high',   particles: 1500, postProcessing: true,  antiAlias: 'high',   textureQuality: 'ultra' },
};

const DEFAULTS = {
  powerMode: 'balanced',
  fpsLimit: 60,
  graphics: 'high',
  resolutionScale: 1.0,
  dynamicResolution: true,
  shadows: 'low',
  particles: 300,
  postProcessing: false,
  antiAlias: 'medium',
  textureQuality: 'high',
  objectPooling: true,
  lazyLoading: true,
  debugOverlay: false,
  performanceOverlay: false,
  autoQuality: true,
  reduceMotion: false,
  maxLogs: 5000,
  editorPriority: true,     // reduz a Scene View durante interação para manter o toque fluido
  consoleLimit: 5000,
};

export class QualityManager {
  constructor(storage) {
    this.storage = storage;
    this.settings = { ...DEFAULTS };
    this.profileName = 'default';
    this.appliedProfile = null;
  }

  async load() {
    const saved = await this.storage.getMeta('quality', null);
    if (saved) Object.assign(this.settings, saved);
    else this.applyRecommendedProfile();
    return this.settings;
  }

  async save() {
    await this.storage.setMeta('quality', this.settings);
  }

  set(key, value) {
    if (this.settings[key] === value) return;
    this.settings[key] = value;
    if (key === 'graphics') this.applyGraphicsPreset(value);
    if (key === 'powerMode') this.settings.fpsLimit = POWER_MODES[value]?.fps ?? this.settings.fpsLimit;
    bus.emit('quality:changed', { key, value, settings: this.settings });
    this.save();
  }

  applyGraphicsPreset(name) {
    const p = GRAPHICS_PRESETS[name];
    if (!p) return;
    Object.assign(this.settings, p);
    bus.emit('quality:changed', { key: 'graphics', value: name, settings: this.settings });
  }

  /**
   * Perfil recomendado inicial (regra 49 do prompt de otimização).
   * Em hardware POCO X7 Pro / equivalente NÃO reduzimos qualidade: alvo é
   * qualidade alta + estabilidade, com resolução dinâmica cuidando dos picos.
   */
  applyRecommendedProfile() {
    const isPoco = device.matchesPocoX7ProProfile();
    const tier = device.tier();

    if (isPoco || tier === 'desktop' || tier === 'high') {
      Object.assign(this.settings, {
        graphics: 'high',
        ...GRAPHICS_PRESETS.high,
        resolutionScale: isPoco ? 0.9 : 1.0,
        powerMode: 'balanced',
        fpsLimit: 60,
        dynamicResolution: true,
        shadows: 'low',
        particles: 300,
        postProcessing: false,
      });
      this.profileName = isPoco ? 'POCO X7 Pro Optimization Profile' : `auto (${tier})`;
    } else if (tier === 'mid') {
      Object.assign(this.settings, { graphics: 'medium', ...GRAPHICS_PRESETS.medium, powerMode: 'balanced', fpsLimit: 60 });
      this.profileName = 'auto (mid)';
    } else {
      Object.assign(this.settings, { graphics: 'low', ...GRAPHICS_PRESETS.low, powerMode: 'battery', fpsLimit: 30 });
      this.profileName = 'auto (low)';
    }
    this.appliedProfile = this.profileName;
    bus.emit('quality:changed', { key: '*', value: null, settings: this.settings });
    return this.profileName;
  }

  /** Sugere um preset a partir de um FPS médio medido (nunca aplica sozinho). */
  suggestFromBenchmark(avgFps, frameTimeMs) {
    if (avgFps >= 110 && frameTimeMs < 9) return 'ultra';
    if (avgFps >= 80) return 'high';
    if (avgFps >= 50) return 'high';
    if (avgFps >= 35) return 'medium';
    return 'low';
  }

  get targetFps() {
    const hz = device.refreshHz || 60;
    return Math.min(this.settings.fpsLimit, hz);
  }
}
