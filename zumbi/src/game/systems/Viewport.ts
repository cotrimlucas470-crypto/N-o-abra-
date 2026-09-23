/**
 * Tela do celular: tamanho, densidade de pixels (DPR), área segura
 * (entalhe/barra de gestos) e zoom da câmera.
 *
 * O canvas é criado com resolução REAL do aparelho (css x DPR, limitado
 * a VIEW.maxDpr) e mostrado no tamanho CSS — por isso fica nítido.
 * Tudo que é interface trabalha em px CSS (HUD usa zoom = DPR).
 */
import type Phaser from 'phaser';
import { VIEW } from '../config/GameConfig';
import type { EventBus } from '../core/EventBus';
import { clamp } from '../core/math';
import type { Insets } from '../input/touch/ControlsLayout';

export interface ViewportSize {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
}

export function measureViewport(): ViewportSize {
  const cssWidth = Math.max(1, Math.round(window.innerWidth));
  const cssHeight = Math.max(1, Math.round(window.innerHeight));
  const dpr = clamp(window.devicePixelRatio || 1, 1, VIEW.maxDpr);
  return { cssWidth, cssHeight, dpr };
}

export class Viewport {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  insets: Insets = { left: 0, right: 0, top: 0, bottom: 0 };
  private game: Phaser.Game | null = null;
  private timer: number | undefined;
  private probe: HTMLDivElement | null = null;

  constructor(private readonly bus: EventBus) {
    const m = measureViewport();
    this.cssWidth = m.cssWidth;
    this.cssHeight = m.cssHeight;
    this.dpr = m.dpr;
    this.readInsets();
  }

  attach(game: Phaser.Game): void {
    this.game = game;
    const onResize = () => {
      window.clearTimeout(this.timer);
      // Pequena espera: no Android a rotação dispara vários eventos seguidos.
      this.timer = window.setTimeout(() => this.apply(), 90);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onResize);
  }

  /** Relê o tamanho da janela e redimensiona o canvas se mudou. */
  apply(): void {
    const m = measureViewport();
    this.readInsets();
    const changed = m.cssWidth !== this.cssWidth || m.cssHeight !== this.cssHeight || m.dpr !== this.dpr;
    this.cssWidth = m.cssWidth;
    this.cssHeight = m.cssHeight;
    this.dpr = m.dpr;
    if (this.game && changed) {
      this.game.scale.setZoom(1 / this.dpr);
      this.game.scale.resize(this.cssWidth * this.dpr, this.cssHeight * this.dpr);
    }
    this.bus.emit('viewport:changed', { cssWidth: this.cssWidth, cssHeight: this.cssHeight, dpr: this.dpr });
  }

  /** Zoom da câmera do mundo: quantos pixels do aparelho por pixel de mundo. */
  worldZoom(): number {
    const short = Math.min(this.cssWidth, this.cssHeight);
    const visible = clamp(short * VIEW.perCssPixel, VIEW.minWorldShortSide, VIEW.maxWorldShortSide);
    return (short * this.dpr) / visible;
  }

  get isPortrait(): boolean {
    return this.cssHeight > this.cssWidth;
  }

  private readInsets(): void {
    try {
      if (!this.probe) {
        const d = document.createElement('div');
        d.style.cssText =
          'position:fixed;inset:0;pointer-events:none;visibility:hidden;' +
          'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
        document.body.appendChild(d);
        this.probe = d;
      }
      const cs = getComputedStyle(this.probe);
      this.insets = {
        top: parseFloat(cs.paddingTop) || 0,
        right: parseFloat(cs.paddingRight) || 0,
        bottom: parseFloat(cs.paddingBottom) || 0,
        left: parseFloat(cs.paddingLeft) || 0,
      };
    } catch {
      this.insets = { left: 0, right: 0, top: 0, bottom: 0 };
    }
  }
}
