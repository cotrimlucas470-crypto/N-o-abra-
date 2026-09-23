/**
 * Tela de título. O toque em JOGAR também serve de "gesto do usuário"
 * que o navegador exige para entrar em tela cheia e travar a horizontal.
 */
import Phaser from 'phaser';
import { GAME_STAGE, GAME_TITLE, GAME_VERSION, SCENES } from '../config/GameConfig';
import { services } from '../core/Services';
import { requestFullscreenLandscape } from '../systems/fullscreen';
import { UiButton } from '../ui/UiButton';
import { UI, textStyle } from '../ui/theme';

export class TitleScene extends Phaser.Scene {
  private layoutFn: (() => void) | null = null;

  constructor() {
    super(SCENES.title);
  }

  create(): void {
    const s = services(this.game);
    const dpr = s.viewport.dpr;
    const cam = this.cameras.main;
    cam.setOrigin(0, 0).setZoom(dpr).setBackgroundColor('#0f1013');

    const bg = this.add.graphics();
    const title = this.add.text(0, 0, GAME_TITLE.toUpperCase(), textStyle(40, UI.text, '900')).setOrigin(0.5).setResolution(dpr);
    title.setLetterSpacing(6).setShadow(0, 3, 'rgba(0,0,0,0.8)', 10, false, true);
    const tagline = this.add.text(0, 0, 'Saia de dia. Volte antes do toque de recolher.', textStyle(14, UI.textDim, '500')).setOrigin(0.5).setResolution(dpr);
    const touch = this.sys.game.device.input.touch || navigator.maxTouchPoints > 0;
    const help = this.add
      .text(
        0,
        0,
        touch
          ? 'Polegar esquerdo: andar   ·   Polegar direito: mirar   ·   Botão: correr'
          : 'WASD / setas: andar   ·   Shift: correr   ·   Segurar o mouse: mirar',
        textStyle(12, UI.textDim, '500'),
      )
      .setOrigin(0.5)
      .setResolution(dpr)
      .setAlpha(0.85);
    const version = this.add.text(0, 0, `v${GAME_VERSION} · ${GAME_STAGE}`, textStyle(11, '#6f6d67', '600')).setOrigin(1, 1).setResolution(dpr);

    const play = new UiButton(this, 'JOGAR', 200, 52, () => {
      if (touch) requestFullscreenLandscape();
      this.scene.start(SCENES.game);
    }, true, dpr);

    this.layoutFn = () => {
      const w = s.viewport.cssWidth;
      const h = s.viewport.cssHeight;
      const k = Math.max(0.7, Math.min(1.3, Math.min(w, h) / 420));
      bg.clear();
      // fundo: gradiente + faixas de "luz de poste" bem sutis
      bg.fillGradientStyle(0x1a1c21, 0x1a1c21, 0x0b0b0d, 0x0b0b0d, 1);
      bg.fillRect(0, 0, w, h);
      bg.fillStyle(UI.accentNum, 0.05).fillCircle(w * 0.78, h * 0.1, Math.max(w, h) * 0.35);
      bg.fillStyle(0xffffff, 0.02).fillCircle(w * 0.15, h * 0.95, Math.max(w, h) * 0.3);
      title.setPosition(w / 2, h * 0.36).setScale(k * Math.min(1, (w * 0.9) / (title.width || 1)));
      tagline.setPosition(w / 2, h * 0.36 + 44 * k).setScale(k);
      play.setPosition(w / 2, h * 0.62).setScale(k);
      help.setPosition(w / 2, h * 0.62 + 56 * k).setScale(Math.min(k, (w * 0.95) / (help.width || 1)));
      version.setPosition(w - 12 - s.viewport.insets.right, h - 10 - s.viewport.insets.bottom);
    };
    this.layoutFn();
    const off = s.bus.on('viewport:changed', () => {
      cam.setSize(this.scale.width, this.scale.height).setZoom(s.viewport.dpr);
      this.layoutFn?.();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }
}
