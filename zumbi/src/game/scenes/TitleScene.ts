/**
 * Tela de título. O toque em JOGAR também serve de "gesto do usuário"
 * que o navegador exige para entrar em tela cheia e travar a horizontal.
 */
import Phaser from 'phaser';
import { GAME_STAGE, GAME_TITLE, GAME_VERSION, SCENES } from '../config/GameConfig';
import { services } from '../core/Services';
import { SANDBOX_PRESETS, type SandboxPresetId } from '../config/Sandbox';
import { requestFullscreenLandscape } from '../systems/fullscreen';
import { archiveCurrent, loadGame, oldMapSummary, saveSummary } from '../save/SaveGame';
import { UiButton } from '../ui/UiButton';
import { UI, textStyle } from '../ui/theme';
import { ZOMBIE_PRESETS, type ZombiePresetId } from '../zombies/Difficulty';

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

    const summary = saveSummary();
    // Save de antes do mapa novo: não abre aqui (os ids do mundo mudaram), mas fica guardado.
    const oldMap = summary ? null : oldMapSummary();
    // Dificuldade dos zumbis (só vale para jogo novo; o save guarda a sua).
    const presets = Object.keys(ZOMBIE_PRESETS) as ZombiePresetId[];
    const same = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);
    let preset: ZombiePresetId = presets.find((id) => same(ZOMBIE_PRESETS[id].settings, s.settings.zombies)) ?? 'sobrevivencia';
    const presetLabel = () => `Zumbis: ${ZOMBIE_PRESETS[preset].name} ▸`;
    const presetInfo = this.add.text(0, 0, ZOMBIE_PRESETS[preset].description, textStyle(11, UI.textDim, '600')).setOrigin(0.5).setResolution(dpr);
    const presetBtn = new UiButton(
      this,
      presetLabel(),
      230,
      34,
      () => {
        preset = presets[(presets.indexOf(preset) + 1) % presets.length]!;
        presetBtn.setLabel(presetLabel());
        presetInfo.setText(ZOMBIE_PRESETS[preset].description);
        this.layoutFn?.();
      },
      false,
      dpr,
    );
    // Tamanho da cidade (jogo novo). A expandida tem a cidade de sempre no meio.
    const cities: { id: SandboxPresetId; label: string }[] = [
      { id: 'padrao', label: 'Grande 9×9' },
      { id: 'cidade-grande', label: 'Média 5×5' },
      { id: 'cidade-classica', label: 'Clássica 3×3' },
      { id: 'cidade-pequena', label: 'Pequena 1×1' },
    ];
    const sameWorld = (id: SandboxPresetId) => {
      const w = SANDBOX_PRESETS[id].settings.world;
      return w.sectorsX === s.settings.world.sectorsX && w.sectorsY === s.settings.world.sectorsY && w.core === s.settings.world.core;
    };
    let city = cities.find((c) => sameWorld(c.id)) ?? cities[0]!;
    const cityLabel = () => `Cidade: ${city.label} ▸`;
    const cityBtn = new UiButton(
      this,
      cityLabel(),
      230,
      34,
      () => {
        city = cities[(cities.indexOf(city) + 1) % cities.length]!;
        cityBtn.setLabel(cityLabel());
        presetInfo.setText(SANDBOX_PRESETS[city.id].description);
        this.layoutFn?.();
      },
      false,
      dpr,
    );
    const start = (continueGame: boolean) => {
      if (touch) requestFullscreenLandscape();
      if (continueGame) {
        const save = loadGame();
        if (save) {
          // O mundo salvo usa as opções com que foi criado (mesma semente, mesma cidade).
          s.settings = save.settings;
          s.session.pendingLoad = save;
        }
      } else {
        // Jogo novo: o save antigo é ARQUIVADO (nunca apagado sem pedir).
        archiveCurrent();
        s.session.pendingLoad = null;
        s.settings = { ...s.settings, world: { ...SANDBOX_PRESETS[city.id].settings.world, seed: s.settings.world.seed }, zombies: { ...ZOMBIE_PRESETS[preset].settings } };
      }
      this.scene.start(SCENES.game);
    };
    const play = new UiButton(this, summary ? 'CONTINUAR' : 'JOGAR', 220, 52, () => start(!!summary), true, dpr);
    const saveInfo = this.add
      .text(
        0,
        0,
        summary
          ? `Dia ${summary.day} · salvo em ${new Date(summary.savedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
          : oldMap
            ? `O mapa mudou: o save antigo (dia ${oldMap.day}) fica guardado à parte.\nJOGAR começa um jogo novo na cidade nova.`
            : '',
        textStyle(11, UI.textDim, '600'),
      )
      .setOrigin(0.5)
      .setAlign('center')
      .setResolution(dpr);
    // Jogo novo com save existente: pede confirmação antes.
    const confirmText = this.add
      .text(0, 0, 'Começar do zero? O jogo atual fica guardado como backup,\nmas CONTINUAR passará a abrir o novo.', textStyle(12, UI.text, '600'))
      .setOrigin(0.5)
      .setAlign('center')
      .setResolution(dpr)
      .setVisible(false);
    const yes = new UiButton(this, 'COMEÇAR DO ZERO', 200, 42, () => start(false), true, dpr).setVisible(false);
    const no = new UiButton(this, 'VOLTAR', 120, 42, () => showConfirm(false), false, dpr).setVisible(false);
    const fresh = new UiButton(this, 'NOVO JOGO', 170, 42, () => showConfirm(true), false, dpr).setVisible(!!summary);
    const showConfirm = (v: boolean) => {
      confirmText.setVisible(v);
      yes.setVisible(v);
      no.setVisible(v);
      play.setVisible(!v);
      fresh.setVisible(!v && !!summary);
      // A dificuldade aparece quando o próximo passo é um jogo novo.
      presetBtn.setVisible(v || !summary);
      cityBtn.setVisible(v || !summary);
      presetInfo.setVisible(v || !summary);
      help.setVisible(!v);
      confirming = v;
      this.layoutFn?.();
    };
    let confirming = false;
    showConfirm(false);

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
      play.setPosition(w / 2, h * 0.58).setScale(k);
      saveInfo.setPosition(w / 2, h * 0.58 + 36 * k).setScale(k);
      fresh.setPosition(w / 2, h * 0.58 + 70 * k).setScale(k);
      confirmText.setPosition(w / 2, h * 0.58).setScale(Math.min(k, (w * 0.92) / (confirmText.width || 1)));
      yes.setPosition(w / 2 - 70 * k, h * 0.58 + 56 * k).setScale(k);
      no.setPosition(w / 2 + 100 * k, h * 0.58 + 56 * k).setScale(k);
      help.setPosition(w / 2, h * 0.58 + 112 * k).setScale(Math.min(k, (w * 0.95) / (help.width || 1)));
      // Novo jogo: dificuldade entre o subtítulo e o botão (no confirmar, acima do texto).
      const py = confirming ? h * 0.58 + 104 * k : h * 0.58 + 58 * k;
      // Lado a lado quando cabe (paisagem); um embaixo do outro no retrato.
      const wide = w >= 520 * k;
      presetBtn.setPosition(wide ? w / 2 - 120 * k : w / 2, py).setScale(k);
      cityBtn.setPosition(wide ? w / 2 + 120 * k : w / 2, wide ? py : py + 40 * k).setScale(k);
      presetInfo.setPosition(w / 2, py + (wide ? 24 : 64) * k).setScale(Math.min(k, (w * 0.95) / (presetInfo.width || 1)));
      if (!summary) help.setPosition(w / 2, h * 0.58 + (wide ? 122 : 162) * k);
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
