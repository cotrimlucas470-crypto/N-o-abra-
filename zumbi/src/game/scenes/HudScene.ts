/**
 * Interface por cima do mundo: vinheta, status, avisos, controles de
 * toque, pausa. Trabalha em px CSS (câmera com zoom = DPR, origem 0,0).
 */
import Phaser from 'phaser';
import { GAME_VERSION, SCENES } from '../config/GameConfig';
import { DEBUG } from '../core/Debug';
import { services, type GameServices } from '../core/Services';
import { TEX } from '../assets/AssetKeys';
import { uiScaleFor } from '../input/touch/ControlsLayout';
import { TouchControls } from '../input/touch/TouchControls';
import { toggleFullscreen } from '../systems/fullscreen';
import { ActionFeedback } from '../ui/ActionFeedback';
import { InventoryPanel } from '../ui/InventoryPanel';
import { StatusPanel } from '../ui/StatusPanel';
import { Toast } from '../ui/Toast';
import { UiButton } from '../ui/UiButton';
import { UI, textStyle } from '../ui/theme';

export class HudScene extends Phaser.Scene {
  private s!: GameServices;
  private vignette!: Phaser.GameObjects.Image;
  private status!: StatusPanel;
  private toast!: Toast;
  private controls!: TouchControls;
  private feedback!: ActionFeedback;
  private inventory!: InventoryPanel;
  private prompt!: Phaser.GameObjects.Text;
  private promptKey = '';
  private pauseLayer!: Phaser.GameObjects.Container;
  private pauseDim!: Phaser.GameObjects.Rectangle;
  private pauseTitle!: Phaser.GameObjects.Text;
  private pauseHint!: Phaser.GameObjects.Text;
  private resumeBtn!: UiButton;
  private rotateHint!: Phaser.GameObjects.Text;
  private keyboardHint!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private clockLabel = '';
  private debugText: Phaser.GameObjects.Text | null = null;
  private debugTimer = 0;
  private paused = false;
  private unsubs: (() => void)[] = [];

  constructor() {
    super(SCENES.hud);
  }

  create(): void {
    this.s = services(this.game);
    const s = this.s;
    const dpr = s.viewport.dpr;
    this.cameras.main.setOrigin(0, 0).setZoom(dpr);

    this.vignette = this.add.image(0, 0, TEX.vignette).setOrigin(0, 0).setDepth(0);
    this.status = new StatusPanel(this, dpr);
    this.clockText = this.add.text(0, 0, '', textStyle(12, UI.text, '700')).setDepth(91).setResolution(dpr);
    this.clockText.setLetterSpacing(1).setShadow(0, 1, 'rgba(0,0,0,0.8)', 3, false, true);
    this.toast = new Toast(this, dpr);

    this.controls = new TouchControls(this, s, {
      onPause: () => this.setPaused(true, 'button'),
      onFullscreen: () => toggleFullscreen(),
      onInteract: () => s.bus.emit('input:interact', {}),
      onInventory: () => this.inventory.toggle(),
    });
    this.feedback = new ActionFeedback(this, dpr);
    if (!s.assets) throw new Error('Assets não carregados');
    this.inventory = new InventoryPanel(this, s, s.assets, dpr, () => {
      s.session.pointerOverUi = false;
      // Fechar o painel também fecha o recipiente aberto.
      if (s.session.openContainer) s.bus.emit('ui:container-close', {});
    });
    this.controls.setPointerBlocker((x, y) => this.inventory.contains(x, y));
    // Aviso do alvo de interação: acima do botão (toque) ou embaixo, com a tecla (PC).
    this.prompt = this.add.text(0, 0, '', textStyle(12, UI.text, '700')).setOrigin(0.5, 1).setDepth(93).setResolution(dpr);
    this.prompt.setBackgroundColor('rgba(12,13,16,0.62)').setPadding(8, 4, 8, 4).setVisible(false);

    this.keyboardHint = this.add
      .text(0, 0, 'WASD andar · Shift correr · E interagir/abrir/colher · I inventário · segure o mouse para mirar · Esc pausa', textStyle(11, UI.textDim, '600'))
      .setOrigin(0.5, 1)
      .setResolution(dpr)
      .setAlpha(0.75)
      .setDepth(80)
      .setVisible(!this.controls.isTouchMode);

    this.rotateHint = this.add
      .text(0, 0, '↻  Vire o celular: o jogo é melhor na horizontal', textStyle(12, UI.text, '700'))
      .setOrigin(0.5, 0)
      .setResolution(dpr)
      .setDepth(96)
      .setBackgroundColor('rgba(14,15,18,0.72)')
      .setPadding(10, 6, 10, 6);

    this.buildPauseLayer(dpr);

    if (DEBUG.enabled) {
      this.debugText = this.add.text(0, 0, '', textStyle(11, '#9fe39f', '600')).setDepth(200).setResolution(dpr);
      this.debugText.setBackgroundColor('rgba(0,0,0,0.55)').setPadding(6, 4, 6, 4);
    }

    // Eventos do jogo
    this.unsubs.push(
      s.bus.on('player:enter-building', (e) => this.toast.show(e.name, e.kind === 'shelter' ? 'sua base · por enquanto, segura' : 'interior')),
      s.bus.on('world:region-entered', (e) => this.toast.show(e.name, `Dia ${s.session.clock?.day ?? 1} · v${GAME_VERSION}`, 2600)),
      s.bus.on('viewport:changed', () => this.layout()),
      s.bus.on('input:touch-detected', () => {
        this.keyboardHint.setVisible(false);
        this.promptKey = '';
      }),
      s.bus.on('player:feedback', (e) => this.feedback.show(e.text, e.tone)),
      s.bus.on('ui:container-open', () => this.inventory.showContainer()),
      s.bus.on('ui:container-close', () => this.inventory.hideContainer()),
      s.bus.on('ui:container-refresh', () => this.inventory.refresh()),
    );
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => this.inventory.wheel(p.x / dpr, p.y / dpr, dy * 0.5));
    this.input.keyboard?.on('keydown-I', () => {
      if (!this.paused) this.inventory.toggle();
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.inventory.pointerDown(p.id, p.x / dpr, p.y / dpr));
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.inventory.pointerMove(p.id, p.x / dpr, p.y / dpr);
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => this.inventory.pointerUp(p.id, p.x / dpr, p.y / dpr));
    this.input.keyboard?.on('keydown-ESC', () => this.setPaused(!this.paused, 'button'));
    this.input.keyboard?.on('keydown-P', () => this.setPaused(!this.paused, 'button'));
    const onHidden = () => this.setPaused(true, 'hidden');
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, this.onFullscreenChange, this);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.onFullscreenChange, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden);
      this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, this.onFullscreenChange, this);
      this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.onFullscreenChange, this);
    });

    this.layout();
  }

  private buildPauseLayer(dpr: number): void {
    this.pauseDim = this.add.rectangle(0, 0, 10, 10, 0x08090b, 0.72).setOrigin(0, 0);
    this.pauseTitle = this.add.text(0, 0, 'PAUSADO', textStyle(30, UI.text, '900')).setOrigin(0.5).setResolution(dpr);
    this.pauseTitle.setLetterSpacing(6);
    this.pauseHint = this.add
      .text(0, 0, 'O mundo espera por você. Por enquanto.', textStyle(13, UI.textDim, '500'))
      .setOrigin(0.5)
      .setResolution(dpr);
    this.resumeBtn = new UiButton(this, 'CONTINUAR', 210, 50, () => this.setPaused(false, 'button'), true, dpr);
    this.pauseLayer = this.add.container(0, 0, [this.pauseDim, this.pauseTitle, this.pauseHint, this.resumeBtn]);
    this.pauseLayer.setDepth(150).setVisible(false);
    // Bloqueia toques no que está por baixo enquanto pausado.
    this.pauseDim.setInteractive();
  }

  private setPaused(paused: boolean, reason: 'button' | 'hidden'): void {
    if (paused === this.paused) return;
    this.paused = paused;
    this.s.session.paused = paused;
    this.controls.setEnabled(!paused);
    this.pauseLayer.setVisible(paused);
    if (paused) this.inventory.setOpen(false);
    if (paused) {
      this.scene.pause(SCENES.game);
      this.s.bus.emit('game:paused', { reason });
    } else {
      this.s.touch.reset();
      this.scene.resume(SCENES.game);
      this.s.bus.emit('game:resumed', {});
    }
  }

  private onFullscreenChange(): void {
    this.controls.refreshFullscreenIcon();
  }

  private layout(): void {
    const s = this.s;
    const w = s.viewport.cssWidth;
    const h = s.viewport.cssHeight;
    const ins = s.viewport.insets;
    const k = uiScaleFor(w, h);
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height).setZoom(s.viewport.dpr);

    this.vignette.setDisplaySize(w, h);
    this.status.setPosition(ins.left + 12, ins.top + 10, k);
    this.clockText.setPosition(ins.left + 16, ins.top + 10 + 56 * k).setScale(k);
    // Em pé, o aviso desce para não cobrir o painel de status e o relógio.
    this.toast.setPosition(w / 2, s.viewport.isPortrait ? ins.top + 150 * k : ins.top + Math.max(14, h * 0.08), k);
    this.controls.layout(w, h);
    this.keyboardHint.setPosition(w / 2, h - 10 - ins.bottom);
    this.feedback.setPosition(w / 2, h * 0.64, k);
    this.inventory.layout(w, h, ins, k);
    this.promptKey = '';

    this.pauseDim.setSize(w, h);
    if (this.pauseDim.input?.hitArea instanceof Phaser.Geom.Rectangle) this.pauseDim.input.hitArea.setSize(w, h);
    this.pauseTitle.setPosition(w / 2, h * 0.36).setScale(k);
    this.pauseHint.setPosition(w / 2, h * 0.36 + 34 * k).setScale(k);
    this.resumeBtn.setPosition(w / 2, h * 0.6).setScale(k);

    const portraitPhone = s.viewport.isPortrait && this.controls.isTouchMode;
    // Em pé: aviso no meio-alto da tela, longe do nome do local (topo) e dos controles (base).
    this.rotateHint.setVisible(portraitPhone).setPosition(w / 2, h * 0.3).setScale(Math.min(k, (w * 0.92) / Math.max(1, this.rotateHint.width)));
    this.debugText?.setPosition(ins.left + 12, ins.top + 84 * k);
  }

  /** Texto do alvo de interação: acima do botão (toque) ou "[E] ..." embaixo (teclado). */
  private updatePrompt(): void {
    // Com o inventário aberto no celular, o botão fica sob o painel: some o aviso também.
    const touch = this.controls.isTouchMode;
    const t = this.paused || (touch && this.inventory.isOpen) ? null : this.s.session.interaction;
    const key = t ? `${t.key}|${t.label}|${touch}` : '';
    if (key === this.promptKey) return;
    this.promptKey = key;
    if (!t) {
      this.prompt.setVisible(false);
      return;
    }
    const w = this.s.viewport.cssWidth;
    const h = this.s.viewport.cssHeight;
    const k = uiScaleFor(w, h);
    this.prompt.setText(touch ? t.label : `[E]  ${t.label}`).setColor(t.enabled ? UI.text : '#f2a77e').setScale(k).setVisible(true);
    if (touch) {
      const b = this.controls.interact;
      const half = (this.prompt.width * k) / 2;
      const x = Math.min(b.x, w - this.s.viewport.insets.right - 8 - half);
      this.prompt.setPosition(x, b.y - b.radius - 8 * k);
    } else {
      this.prompt.setPosition(w / 2, h - this.s.viewport.insets.bottom - 34 * k);
    }
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1);
    const stats = this.s.session.stats;
    this.status.update(stats, dt);
    const clock = this.s.session.clock;
    const label = clock ? `DIA ${clock.day} · ${clock.timeLabel()}` : '';
    if (label !== this.clockLabel) {
      this.clockLabel = label;
      this.clockText.setText(label);
    }
    const target = this.s.session.interaction;
    if (!this.paused) this.controls.update(stats ? !stats.canSprint() : false, target ? target.enabled : null, this.inventory.isOpen);
    this.updatePrompt();
    // PC: mouse sobre o painel não mira.
    const mouse = this.input.mousePointer;
    this.s.session.pointerOverUi = !!mouse && this.inventory.contains(mouse.x / this.s.viewport.dpr, mouse.y / this.s.viewport.dpr);

    if (this.debugText) {
      this.debugText.setVisible(!this.inventory.isOpen);
      this.debugTimer -= dt;
      if (this.debugTimer <= 0) {
        this.debugTimer = 0.5;
        const handle = (window as unknown as { __TDR__?: { culler: () => { total: number; visible: number } } }).__TDR__;
        const c = handle?.culler();
        this.debugText.setText(
          `FPS ${this.game.loop.actualFps.toFixed(0)} · DPR ${this.s.viewport.dpr} · zoom ${(this.s.viewport.worldZoom() / this.s.viewport.dpr).toFixed(2)}` +
            (c ? `\nobjetos visíveis ${c.visible}/${c.total}` : '') +
            `\n${this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas'} · ${this.s.viewport.cssWidth}x${this.s.viewport.cssHeight}`,
        );
      }
    }
  }
}
