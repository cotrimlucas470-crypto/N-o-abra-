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
import { ActionBar } from '../ui/ActionBar';
import { ActionFeedback } from '../ui/ActionFeedback';
import { InventoryPanel } from '../ui/InventoryPanel';
import { OptionsMenu } from '../ui/OptionsMenu';
import { MapView } from '../ui/MapView';
import { InfoCard } from '../ui/InfoCard';
import { StatePills } from '../ui/StatePills';
import { hasClock } from '../ui/tabs/BodyTab';
import { timeText } from '../ui/tabs/TimeTab';
import { SKY_LABEL } from '../sim/Weather';
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
  private pills!: StatePills;
  private actionBar!: ActionBar;
  private optionsMenu!: OptionsMenu;
  private savedText!: Phaser.GameObjects.Text;
  private saveBtn!: UiButton;
  private menuBtn!: UiButton;
  private hudTimer = 0;
  private mapView!: MapView;
  private infoCard!: InfoCard;
  private ammoText!: Phaser.GameObjects.Text;
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
    this.clockText = this.add.text(0, 0, '', textStyle(12, UI.text, '700')).setDepth(91).setResolution(dpr).setLineSpacing(2);
    this.clockText.setLetterSpacing(1).setShadow(0, 1, 'rgba(0,0,0,0.8)', 3, false, true);
    this.pills = new StatePills(this, dpr);
    this.actionBar = new ActionBar(this, dpr, () => s.bus.emit('action:cancel', {}));
    this.optionsMenu = new OptionsMenu(this, dpr, (i) => {
      this.optionsMenu.hide();
      s.bus.emit('interaction:option', { index: i });
    });
    this.savedText = this.add.text(0, 0, 'jogo salvo', textStyle(10, UI.textDim, '700')).setDepth(91).setResolution(dpr).setAlpha(0);
    this.mapView = new MapView(this, dpr);
    this.infoCard = new InfoCard(this, dpr);
    this.ammoText = this.add.text(0, 0, '', textStyle(11, UI.text, '800')).setOrigin(0.5).setDepth(102).setResolution(dpr);
    this.ammoText.setShadow(0, 1, 'rgba(0,0,0,0.9)', 3, false, true);
    this.toast = new Toast(this, dpr);

    this.controls = new TouchControls(this, s, {
      onPause: () => this.setPaused(true, 'button'),
      onFullscreen: () => toggleFullscreen(),
      onInteract: () => s.bus.emit('input:interact', {}),
      onOptions: () => (this.optionsMenu.open ? this.optionsMenu.hide() : s.bus.emit('interaction:options', {})),
      onAttack: () => s.bus.emit('input:attack', {}),
      onReload: () => s.bus.emit('input:reload', {}),
      onInventory: () => {
        // Um painel por vez: o menu "⋯" fecha ao abrir a bolsa (o toque não passa para os dois).
        this.optionsMenu.hide();
        this.inventory.toggle();
      },
    });
    this.feedback = new ActionFeedback(this, dpr);
    if (!s.assets) throw new Error('Assets não carregados');
    this.inventory = new InventoryPanel(this, s, s.assets, dpr, () => {
      s.session.pointerOverUi = false;
      // Fechar o painel também fecha o recipiente aberto.
      if (s.session.openContainer) s.bus.emit('ui:container-close', {});
    });
    this.controls.setPointerBlocker((x, y) => this.mapView.isOpen || this.inventory.contains(x, y) || this.optionsMenu.contains(x, y) || (this.actionBar.visible && this.actionBarHit(x, y)));
    // Aviso do alvo de interação: acima do botão (toque) ou embaixo, com a tecla (PC).
    this.prompt = this.add.text(0, 0, '', textStyle(12, UI.text, '700')).setOrigin(0.5, 1).setDepth(93).setResolution(dpr);
    this.prompt.setBackgroundColor('rgba(12,13,16,0.62)').setPadding(8, 4, 8, 4).setVisible(false);

    this.keyboardHint = this.add
      .text(0, 0, 'WASD andar · Shift correr · E interagir · Q opções · F atacar · R recarregar · I painel · mouse mira · Esc pausa', textStyle(11, UI.textDim, '600'))
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
      s.bus.on('ui:options-ready', () => this.showOptions()),
      s.bus.on('ui:tab', (e) => {
        this.optionsMenu.hide();
        this.inventory.setOpen(true);
        this.inventory.setTab(e.tab);
      }),
      s.bus.on('ui:info', (e) => this.infoCard.show(e.title, e.lines, s.viewport.cssWidth, s.viewport.cssHeight, uiScaleFor(s.viewport.cssWidth, s.viewport.cssHeight))),
      s.bus.on('ui:map', (e) => {
        const handle = (window as unknown as { __TDR__?: { map: import('../world/MapTypes').MapData } }).__TDR__;
        const game = this.scene.get(SCENES.game) as unknown as { worldModel?: { map: import('../world/MapTypes').MapData }; playerPosition?: () => { x: number; y: number } };
        const map = game.worldModel?.map ?? handle?.map;
        if (!map || !game.playerPosition) return;
        this.inventory.setOpen(false);
        this.mapView.open(map, game.playerPosition(), e.annotated, s.viewport.cssWidth, s.viewport.cssHeight);
      }),
      s.bus.on('game:saved', (e) => {
        this.savedText.setText(e.ok ? 'jogo salvo' : 'não foi possível salvar').setColor(e.ok ? UI.textDim : '#f07a6a').setAlpha(1);
        this.tweens.add({ targets: this.savedText, alpha: 0, delay: 1400, duration: 700 });
      }),
    );
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => this.inventory.wheel(p.x / dpr, p.y / dpr, dy * 0.5));
    this.input.keyboard?.on('keydown-I', () => {
      if (!this.paused) this.inventory.toggle();
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      const x = p.x / dpr;
      const y = p.y / dpr;
      if (this.infoCard.open) this.infoCard.hide();
      // Tocar fora do menu "⋯" fecha o menu (o toque não faz mais nada).
      if (this.optionsMenu.open && !this.optionsMenu.contains(x, y)) {
        const ob = this.controls.options;
        if (Math.hypot(x - ob.x, y - ob.y) > ob.radius * 1.4) this.optionsMenu.hide();
      }
      this.inventory.pointerDown(p.id, x, y);
    });
    for (let n = 1; n <= 8; n++) {
      this.input.keyboard?.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'][n - 1]}`, () => {
        if (!this.optionsMenu.open) return;
        this.optionsMenu.hide();
        s.bus.emit('interaction:option', { index: n - 1 });
      });
    }
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
    this.saveBtn = new UiButton(this, 'SALVAR', 150, 42, () => this.s.bus.emit('game:save-request', {}), false, dpr);
    this.menuBtn = new UiButton(
      this,
      'MENU',
      150,
      42,
      () => {
        // Sai para a tela de título salvando antes (nada se perde).
        this.s.bus.emit('game:save-request', {});
        this.scene.stop(SCENES.debug);
        this.scene.stop(SCENES.game);
        this.scene.start(SCENES.title);
      },
      false,
      dpr,
    );
    this.pauseLayer = this.add.container(0, 0, [this.pauseDim, this.pauseTitle, this.pauseHint, this.resumeBtn, this.saveBtn, this.menuBtn]);
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
    this.pills.setPosition(ins.left + 14, ins.top + 10 + 94 * k, k, Math.min(360 * k, w * 0.45));
    this.savedText.setPosition(ins.left + 12 + 216 * k, ins.top + 14 * k).setScale(k);
    this.actionBar.layout(w, h, h * (s.viewport.isPortrait ? 0.42 : 0.3), k);
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
    this.resumeBtn.setPosition(w / 2, h * 0.58).setScale(k);
    this.saveBtn.setPosition(w / 2 - 82 * k, h * 0.58 + 58 * k).setScale(k);
    this.menuBtn.setPosition(w / 2 + 82 * k, h * 0.58 + 58 * k).setScale(k);

    const portraitPhone = s.viewport.isPortrait && this.controls.isTouchMode;
    // Em pé: aviso no meio-alto da tela, longe do nome do local (topo) e dos controles (base).
    this.rotateHint.setVisible(portraitPhone).setPosition(w / 2, h * 0.3).setScale(Math.min(k, (w * 0.92) / Math.max(1, this.rotateHint.width)));
    this.debugText?.setPosition(ins.left + 12, ins.top + 150 * k);
  }

  private showOptions(): void {
    const opts = this.s.session.options ?? [];
    if (!opts.length) {
      this.feedback.show('Nada para fazer por perto.', 'info');
      return;
    }
    const w = this.s.viewport.cssWidth;
    const h = this.s.viewport.cssHeight;
    const k = uiScaleFor(w, h);
    const touch = this.controls.isTouchMode;
    const b = this.controls.options;
    this.optionsMenu.show(opts, touch ? b.x + b.radius : w / 2 + 120 * k, touch ? b.y - b.radius : h - 60 * k, w, k);
  }

  private actionBarHit(x: number, y: number): boolean {
    const p = this.actionBar.buttonPos();
    return !!p && Math.abs(x - p.x) < 70 && Math.abs(y - p.y) < 24;
  }

  /** Posições para testes automáticos. */
  optionButtonAt(label: string): { x: number; y: number } | null {
    return this.optionsMenu.buttonAt(label);
  }

  actionBarButton(): { x: number; y: number } | null {
    return this.actionBar.buttonPos();
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
    const sv = this.s.session.survival;
    const inv = this.s.session.inventory;
    const exact = !!inv && hasClock(inv);
    let label = clock ? `DIA ${clock.day} · ${timeText(clock.minuteOfDay, exact)}` : '';
    if (sv) label += `\n${sv.calendar.shortLabel(clock!.dayIndex)} · ${Math.round(sv.weather.temp)} °C · ${SKY_LABEL[sv.weather.sky]}`;
    if (label !== this.clockLabel) {
      this.clockLabel = label;
      this.clockText.setText(label);
    }
    this.hudTimer -= dt;
    if (sv && this.hudTimer <= 0) {
      this.hudTimer = 0.25;
      this.pills.update(sv.survivor.states().map((x) => ({ label: x.label, tone: x.tone })));
    }
    const act = sv?.runner.current;
    // Painel aberto na horizontal: a barra de ação vai para o espaço livre à esquerda.
    const vw = this.s.viewport.cssWidth;
    const pb = this.inventory.bounds;
    const cx = this.inventory.isOpen && !this.s.viewport.isPortrait ? Math.max(150, (this.s.viewport.insets.left + pb.x) / 2) : vw / 2;
    this.actionBar.update(act ? act.label : null, sv?.runner.progress ?? 0, !!sv?.sleeping, clock ? timeText(clock.minuteOfDay, true) : '', cx);
    this.inventory.tick(dt);
    this.infoCard.update(dt);
    const handDef = inv?.handDef;
    this.controls.setReloadVisible(!!handDef?.gun);
    if (handDef?.gun && this.controls.isTouchMode) {
      const b = this.controls.attack;
      this.ammoText.setText(`${inv?.hand?.st?.am ?? 0}/${handDef.gun.capacity}`).setPosition(b.x, b.y + b.radius + 9).setScale(uiScaleFor(this.s.viewport.cssWidth, this.s.viewport.cssHeight)).setVisible(true);
    } else if (handDef?.gun) {
      this.ammoText.setText(`${handDef.name}: ${inv?.hand?.st?.am ?? 0}/${handDef.gun.capacity} · F atira · R recarrega`).setPosition(this.s.viewport.cssWidth / 2, this.s.viewport.cssHeight - 58).setVisible(true);
    } else this.ammoText.setVisible(false);
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
