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
import { BuildBar } from '../ui/BuildBar';
import { ActionFeedback } from '../ui/ActionFeedback';
import { InventoryPanel } from '../ui/InventoryPanel';
import { OptionsMenu } from '../ui/OptionsMenu';
import { FullMap } from '../ui/FullMap';
import { Minimap } from '../ui/Minimap';
import { DriveHud } from '../ui/DriveHud';
import { InfoCard } from '../ui/InfoCard';
import { SleepPicker } from '../ui/SleepPicker';
import { SummaryCard } from '../ui/SummaryCard';
import { CharacterScreen } from '../ui/CharacterScreen';
import { StatePills } from '../ui/StatePills';
import { hasClock } from '../ui/tabs/BodyTab';
import { timeText } from '../ui/tabs/TimeTab';
import { SKY_LABEL } from '../sim/Weather';
import { StatusPanel, type NeedGauge } from '../ui/StatusPanel';
import { STATE_LEVELS, THERMAL_TUNING } from '../config/SurvivalTuning';
import type { Body } from '../survival/Body';
import { Toast } from '../ui/Toast';
import { UiButton } from '../ui/UiButton';
import { loadVolume, nextVolume, saveVolume, volumeLabel } from '../audio/Volume';
import { UI, textStyle } from '../ui/theme';
import { DeathScreen, HearingRing, ThreatBanner } from '../ui/ThreatUi';
import { loadGame, saveSummary } from '../save/SaveGame';

export class HudScene extends Phaser.Scene {
  private s!: GameServices;
  private vignette!: Phaser.GameObjects.Image;
  private status!: StatusPanel;
  private toast!: Toast;
  private controls!: TouchControls;
  private feedback!: ActionFeedback;
  private threat!: ThreatBanner;
  private hearing!: HearingRing;
  private driveHud!: DriveHud;
  private death!: DeathScreen;
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
  private buildBar!: BuildBar;
  private optionsMenu!: OptionsMenu;
  private savedText!: Phaser.GameObjects.Text;
  private saveBtn!: UiButton;
  private menuBtn!: UiButton;
  /** Volume do jogo (100% → 60% → 30% → desligado), salvo no aparelho. */
  private soundBtn!: UiButton;
  private hudTimer = 0;
  private fullMap!: FullMap;
  private minimap!: Minimap;
  private infoCard!: InfoCard;
  private sleepPicker!: SleepPicker;
  private card!: SummaryCard;
  private character!: CharacterScreen;
  private ammoText!: Phaser.GameObjects.Text;
  private debugText: Phaser.GameObjects.Text | null = null;
  private debugTimer = 0;
  private paused = false;
  private unsubs: (() => void)[] = [];

  constructor() {
    super(SCENES.hud);
  }

  create(): void {
    // A cena é reaproveitada ao voltar do menu: nada da partida anterior fica
    // (com `paused` preso em true, o botão de pausa não pausava no 1º toque).
    this.promptKey = '';
    this.clockLabel = '';
    this.hudTimer = 0;
    this.debugText = null;
    this.debugTimer = 0;
    this.paused = false;
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
    this.buildBar = new BuildBar(this, dpr, {
      build: () => s.bus.emit('build:confirm', {}),
      rotate: () => s.bus.emit('build:rotate', {}),
      exit: () => s.bus.emit('build:cancel', {}),
    });
    this.optionsMenu = new OptionsMenu(this, dpr, (i) => {
      this.optionsMenu.hide();
      s.bus.emit('interaction:option', { index: i });
    });
    this.savedText = this.add.text(0, 0, 'jogo salvo', textStyle(10, UI.textDim, '700')).setDepth(91).setResolution(dpr).setAlpha(0);
    // Teclado do jogo desligado enquanto digita o nome de um marcador.
    const setKeyboard = (on: boolean) => {
      if (this.game.input.keyboard) this.game.input.keyboard.enabled = on;
      for (const sc of this.game.scene.getScenes(true)) if (sc.input.keyboard) sc.input.keyboard.enabled = on;
    };
    this.fullMap = new FullMap(this, this.s, dpr, setKeyboard);
    this.minimap = new Minimap(this, this.s, dpr, () => this.s.bus.emit('ui:fullmap', {}));
    this.infoCard = new InfoCard(this, dpr);
    this.character = new CharacterScreen(this, this.s, s.assets!, dpr);
    this.sleepPicker = new SleepPicker(this, dpr, (place, hours) => this.s.bus.emit('body:sleep', { place, hours }));
    this.card = new SummaryCard(this, dpr);
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
      onShove: () => s.bus.emit('input:shove', {}),
      onSneak: () => s.bus.emit('input:sneak', {}),
      onInventory: () => {
        // Um painel por vez: o menu "⋯" fecha ao abrir a bolsa (o toque não passa para os dois).
        this.optionsMenu.hide();
        this.inventory.toggle();
      },
    });
    this.feedback = new ActionFeedback(this, dpr);
    this.threat = new ThreatBanner(this, dpr);
    this.hearing = new HearingRing(this, dpr);
    this.driveHud = new DriveHud(this, dpr);
    // Morte: carregar o último save (nunca apagado) ou voltar ao menu.
    const leave = () => {
      this.scene.stop(SCENES.debug);
      this.scene.stop(SCENES.game);
    };
    this.death = new DeathScreen(
      this,
      dpr,
      saveSummary()
        ? () => {
            const save = loadGame();
            if (!save) return;
            s.settings = save.settings;
            s.session.pendingLoad = save;
            s.session.death = null;
            leave();
            this.scene.start(SCENES.game);
          }
        : null,
      () => {
        s.session.death = null;
        leave();
        this.scene.start(SCENES.title);
      },
    );
    if (!s.assets) throw new Error('Assets não carregados');
    this.inventory = new InventoryPanel(this, s, s.assets, dpr, () => {
      s.session.pointerOverUi = false;
      // Fechar o painel também fecha o recipiente aberto.
      if (s.session.openContainer) s.bus.emit('ui:container-close', {});
    });
    this.controls.setPointerBlocker((x, y) => this.fullMap.isOpen || this.card.isOpen || this.minimap.contains(x, y) || this.sleepPicker.isOpen || this.character.isOpen || this.inventory.contains(x, y) || this.optionsMenu.contains(x, y) || this.buildBar.contains(x, y) || (this.actionBar.visible && this.actionBarHit(x, y)));
    // Aviso do alvo de interação: acima do botão (toque) ou embaixo, com a tecla (PC).
    this.prompt = this.add.text(0, 0, '', textStyle(12, UI.text, '700')).setOrigin(0.5, 1).setDepth(93).setResolution(dpr);
    this.prompt.setBackgroundColor('rgba(12,13,16,0.62)').setPadding(8, 4, 8, 4).setVisible(false);

    this.keyboardHint = this.add
      .text(0, 0, 'WASD andar · Shift correr · C furtivo · E interagir · Q opções · F atacar · G empurrar · R recarregar · I painel · Esc pausa', textStyle(11, UI.textDim, '600'))
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
      s.bus.on('player:enter-building', (e) => this.toast.show(e.name, 'interior')),
      // Dirigindo, o painel do carro ocupa o alto da tela: o nome da região não aparece por cima.
      s.bus.on('world:region-entered', (e) => !s.session.driving && this.toast.show(e.name, `Dia ${s.session.clock?.day ?? 1} · v${GAME_VERSION}`, 2600)),
      s.bus.on('viewport:changed', () => this.layout()),
      s.bus.on('input:touch-detected', () => {
        this.keyboardHint.setVisible(false);
        this.promptKey = '';
      }),
      s.bus.on('player:feedback', (e) => this.feedback.show(e.text, e.tone)),
      s.bus.on('player:heard', (e) => this.hearing.add(e)),
      s.bus.on('player:died', (e) => {
        this.inventory.setOpen(false);
        this.optionsMenu.hide();
        this.controls.setEnabled(false);
        this.death.show(e.report);
        this.layout();
      }),
      s.bus.on('ui:container-open', () => this.inventory.showContainer()),
      s.bus.on('ui:container-close', () => this.inventory.hideContainer()),
      s.bus.on('ui:container-refresh', () => this.inventory.refresh()),
      s.bus.on('ui:options-ready', () => this.showOptions()),
      // Modo construir: o painel fecha para ver o lugar da peça.
      s.bus.on('build:start', () => {
        this.optionsMenu.hide();
        this.inventory.setOpen(false);
      }),
      s.bus.on('ui:tab', (e) => {
        this.optionsMenu.hide();
        this.inventory.setOpen(true);
        this.inventory.setTab(e.tab);
      }),
      s.bus.on('ui:character', () => {
        const w = s.viewport.cssWidth;
        const h = s.viewport.cssHeight;
        this.inventory.setOpen(false);
        this.character.show(w, h, uiScaleFor(w, h));
      }),
      s.bus.on('ui:sleep-picker', (e) => {
        const sv = s.session.survival;
        const inv = s.session.inventory;
        if (!sv || !inv) return;
        const p = sv.sleepPreview({ place: e.place, pillow: inv.hasTag('travesseiro'), blanket: inv.hasTag('aquecer'), home: s.session.atHome });
        this.inventory.setOpen(false);
        const w = s.viewport.cssWidth;
        const h = s.viewport.cssHeight;
        this.sleepPicker.open({ place: e.place, fatigue: sv.survivor.body.fatigue, quality: p.quality, reasons: p.reasons }, w, h, uiScaleFor(w, h));
      }),
      s.bus.on('ui:info', (e) => this.infoCard.show(e.title, e.lines, s.viewport.cssWidth, s.viewport.cssHeight, uiScaleFor(s.viewport.cssWidth, s.viewport.cssHeight))),
      s.bus.on('ui:map', () => this.openMap()),
      s.bus.on('ui:fullmap', () => this.openMap()),
      s.bus.on('ui:home', () => this.openHome()),
      s.bus.on('ui:expedition', (e) => this.openExpedition(e.target)),
      s.bus.on('game:saved', (e) => {
        this.savedText.setText(e.ok ? 'jogo salvo' : 'não foi possível salvar').setColor(e.ok ? UI.textDim : '#f07a6a').setAlpha(1);
        this.tweens.add({ targets: this.savedText, alpha: 0, delay: 1400, duration: 700 });
      }),
    );
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => this.inventory.wheel(p.x / dpr, p.y / dpr, dy * 0.5));
    this.input.keyboard?.on('keydown-P', () => {
      if (this.paused) return;
      if (this.character.isOpen) this.character.hide();
      else this.s.bus.emit('ui:character', {});
    });
    this.input.keyboard?.on('keydown-H', () => {
      if (this.paused) return;
      if (this.card.isOpen) this.card.close();
      else this.openHome();
    });
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
    this.soundBtn = new UiButton(
      this,
      volumeLabel(loadVolume()),
      308,
      42,
      () => {
        const v = nextVolume(loadVolume());
        saveVolume(v);
        this.s.audio?.setVolume(v);
        this.soundBtn.setLabel(volumeLabel(v));
      },
      false,
      dpr,
    );
    this.pauseLayer = this.add.container(0, 0, [this.pauseDim, this.pauseTitle, this.pauseHint, this.resumeBtn, this.saveBtn, this.menuBtn, this.soundBtn]);
    this.pauseLayer.setDepth(150).setVisible(false);
    // Bloqueia toques no que está por baixo enquanto pausado.
    this.pauseDim.setInteractive();
  }

  private openMap(): void {
    this.inventory.setOpen(false);
    const w = this.s.viewport.cssWidth;
    const h = this.s.viewport.cssHeight;
    this.fullMap.show(w, h, uiScaleFor(w, h));
  }

  /** Resumo da MORADIA (por cima do mapa, se ele estiver aberto). */
  private openHome(): void {
    const v = this.s.session.planner?.home();
    if (!v) {
      this.s.bus.emit('player:feedback', { text: 'Sem moradia: no mapa, segure o dedo num lugar e marque como 🏠 Moradia.', tone: 'info' });
      return;
    }
    const w = this.s.viewport.cssWidth;
    const h = this.s.viewport.cssHeight;
    const notes = v.advice ? [{ text: v.advice, tone: 'warn' as const }] : [{ text: 'Casa bem abastecida e fechada.', tone: 'ok' as const }];
    const marks = this.s.session.marks;
    this.card.open(
      {
        title: `MORADIA · ${v.summary.name.toUpperCase()}`,
        subtitle: v.where,
        rows: v.rows,
        notes,
        buttons: v.here || !marks ? [] : [{ label: 'GUIAR ATÉ LÁ', action: () => (marks.target = 0) }],
      },
      w,
      h,
      uiScaleFor(w, h),
    );
  }

  /** PREPARAR EXPEDIÇÃO até um marcador (ou voltar para casa). */
  private openExpedition(target: number): void {
    const v = this.s.session.planner?.expedition(target);
    if (!v) return;
    if (typeof v === 'string') {
      this.s.bus.emit('player:feedback', { text: v, tone: 'info' });
      return;
    }
    const w = this.s.viewport.cssWidth;
    const h = this.s.viewport.cssHeight;
    const marks = this.s.session.marks;
    const p = v.plan;
    const notes = [{ text: p.verdict.text, tone: p.verdict.tone }, ...p.warnings.slice(0, 3).map((t) => ({ text: t, tone: 'warn' as const }))];
    this.card.open(
      {
        title: v.goingHome ? 'VOLTAR PARA CASA' : 'PREPARAR EXPEDIÇÃO',
        subtitle: v.goingHome ? `Até ${v.name}` : marks?.home ? `Até ${v.name} e de volta para casa` : `Até ${v.name} e de volta até aqui`,
        rows: p.rows.filter((r) => r.label !== 'Destino'),
        notes,
        buttons: marks ? [{ label: 'GUIAR ATÉ LÁ', action: () => (marks.target = target) }] : [],
      },
      w,
      h,
      uiScaleFor(w, h),
    );
  }

  private setPaused(paused: boolean, reason: 'button' | 'hidden'): void {
    if (paused === this.paused) return;
    this.paused = paused;
    this.s.session.paused = paused;
    this.controls.setEnabled(!paused);
    this.pauseLayer.setVisible(paused);
    if (paused) this.inventory.setOpen(false);
    if (paused) this.sleepPicker.close();
    if (paused) this.character.hide();
    if (paused) this.fullMap.hide();
    if (paused) this.card.close();
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
    // A faixa de necessidades cresce o painel: relógio e pílulas descem junto.
    const extra = 22 * k;
    this.clockText.setPosition(ins.left + 16, ins.top + 10 + 56 * k + extra).setScale(k);
    this.pills.setPosition(ins.left + 14, ins.top + 10 + 94 * k + extra, k, Math.min(360 * k, w * 0.45));
    this.savedText.setPosition(ins.left + 12 + 216 * k, ins.top + 14 * k).setScale(k);
    this.actionBar.layout(w, h, h * (s.viewport.isPortrait ? 0.42 : 0.3), k);
    // Barra do modo construir: no alto, no meio, abaixo do nome da região (em pé, abaixo do relógio).
    this.buildBar.layout(w / 2, s.viewport.isPortrait ? ins.top + 176 * k : ins.top + 78 * k, w - 32, k);
    // Em pé, o aviso desce para não cobrir o painel de status e o relógio.
    this.toast.setPosition(w / 2, s.viewport.isPortrait ? ins.top + 150 * k : ins.top + Math.max(14, h * 0.08), k);
    this.controls.layout(w, h);
    this.keyboardHint.setPosition(w / 2, h - 10 - ins.bottom);
    this.feedback.setPosition(w / 2, h * 0.64, k);
    this.threat.setPosition(w / 2, h * (s.viewport.isPortrait ? 0.5 : 0.72), k, ins.left + 14, ins.top + 10 + 128 * k);
    this.death.layout(w, h, k);
    this.sleepPicker.layout(w, h, k);
    this.character.layout(w, h, k);
    this.fullMap.layout(w, h, k);
    this.card.layout(w, h, k);
    // Minimapa: no alto, colado à direita do painel de status (largura do painel = 208 * k).
    this.minimap.layout(ins.left + 12 + 218 * k, ins.top + 10, k);
    this.hearing.layout(w, h);
    this.inventory.layout(w, h, ins, k);
    this.promptKey = '';

    this.pauseDim.setSize(w, h);
    if (this.pauseDim.input?.hitArea instanceof Phaser.Geom.Rectangle) this.pauseDim.input.hitArea.setSize(w, h);
    this.pauseTitle.setPosition(w / 2, h * 0.36).setScale(k);
    this.pauseHint.setPosition(w / 2, h * 0.36 + 34 * k).setScale(k);
    this.resumeBtn.setPosition(w / 2, h * 0.58).setScale(k);
    this.saveBtn.setPosition(w / 2 - 82 * k, h * 0.58 + 58 * k).setScale(k);
    this.menuBtn.setPosition(w / 2 + 82 * k, h * 0.58 + 58 * k).setScale(k);
    this.soundBtn.setPosition(w / 2, h * 0.58 + 108 * k).setScale(k);

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
    this.optionsMenu.show(opts, touch ? b.x + b.radius : w / 2 + 120 * k, touch ? b.y - b.radius : h - 60 * k, w, k, h);
  }

  private actionBarHit(x: number, y: number): boolean {
    const p = this.actionBar.buttonPos();
    return !!p && Math.abs(x - p.x) < 70 && Math.abs(y - p.y) < 24;
  }

  /** Posições para testes automáticos. */
  optionButtonAt(label: string): { x: number; y: number } | null {
    return this.optionsMenu.buttonAt(label);
  }

  buildBarButton(which: 'build' | 'rotate' | 'exit'): { x: number; y: number } | null {
    return this.buildBar.buttonPos(which);
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
    const fl = this.s.session.floor;
    if (fl) label += `\n${fl.name.toUpperCase()}`;
    if (label !== this.clockLabel) {
      this.clockLabel = label;
      this.clockText.setText(label);
    }
    this.hudTimer -= dt;
    if (sv && this.hudTimer <= 0) {
      this.hudTimer = 0.25;
      this.pills.update(hudStates(sv.survivor.states()));
      this.status.setNeeds(needGauges(sv.survivor.body));
    }
    const act = sv?.runner.current;
    // Painel aberto na horizontal: a barra de ação vai para o espaço livre à esquerda.
    const vw = this.s.viewport.cssWidth;
    const pb = this.inventory.bounds;
    const cx = this.inventory.isOpen && !this.s.viewport.isPortrait ? Math.max(150, (this.s.viewport.insets.left + pb.x) / 2) : vw / 2;
    this.actionBar.update(act ? act.label : null, sv?.runner.progress ?? 0, !!sv?.sleeping, clock ? timeText(clock.minuteOfDay, true) : '', cx);
    this.buildBar.update(this.inventory.isOpen ? null : this.s.session.build);
    this.inventory.tick(dt);
    this.infoCard.update(dt);
    this.character.tick(dt);
    this.minimap.setVisible(!this.fullMap.isOpen && !this.character.isOpen && !this.inventory.isOpen && !this.card.isOpen);
    this.minimap.update();
    this.fullMap.update();
    const handDef = inv?.handDef;
    this.controls.setReloadVisible(!!handDef?.gun);
    const dr = this.s.session.driving;
    this.controls.setDriving(!!dr);
    if (dr) this.ammoText.setVisible(false);
    else if (handDef?.gun && this.controls.isTouchMode) {
      const b = this.controls.attack;
      this.ammoText.setText(`${inv?.hand?.st?.am ?? 0}/${handDef.gun.capacity}`).setPosition(b.x, b.y + b.radius + 9).setScale(uiScaleFor(this.s.viewport.cssWidth, this.s.viewport.cssHeight)).setVisible(true);
    } else if (handDef?.gun) {
      this.ammoText.setText(`${handDef.name}: ${inv?.hand?.st?.am ?? 0}/${handDef.gun.capacity} · F atira · R recarrega`).setPosition(this.s.viewport.cssWidth / 2, this.s.viewport.cssHeight - 58).setVisible(true);
    } else this.ammoText.setVisible(false);
    const target = this.s.session.interaction;
    if (!this.paused) this.controls.update(stats ? !stats.canSprint() : false, target ? target.enabled : null, this.inventory.isOpen, !!this.s.session.threat?.sneaking, (this.s.session.threat?.grabbed ?? 0) > 0);
    this.threat.update(dt, this.s.session.threat, this.controls.isTouchMode);
    this.death.update(dt);
    if (dr) {
      // No alto, no meio (em pé, abaixo do painel de vida): embaixo ficam o volante e os botões.
      const vp = this.s.viewport;
      const c = this.controls;
      const btn = (b: typeof c.interact) => ({ x: b.x, y: b.y, r: b.radius });
      this.driveHud.update(dr, vp.cssWidth, vp.insets.top + (vp.isPortrait ? 150 : 10), uiScaleFor(vp.cssWidth, vp.cssHeight), c.isTouchMode ? { exit: btn(c.interact), horn: btn(c.attack) } : null);
    } else this.driveHud.hide();
    this.hearing.update(dt);
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

/**
 * O que aparece no HUD: só o que pede atenção (2º estágio em diante), mais
 * sangramento/infecção/perna sempre; o mais grave primeiro, no máximo 4.
 * A lista completa fica na ficha do personagem.
 */
const ALWAYS = new Set(['sangrando', 'infeccao', 'zumbi', 'mancando']);
export function hudStates(list: readonly { id: string; label: string; level: number; tone: 'info' | 'ok' | 'warn' | 'bad' }[]): { label: string; tone: 'info' | 'ok' | 'warn' | 'bad' }[] {
  const shown = list.filter((x) => x.level >= 2 || ALWAYS.has(x.id)).sort((a, b) => b.level - a.level);
  const out = shown.slice(0, 4).map((x) => ({ label: x.label, tone: x.tone }));
  if (shown.length > 4) out.push({ label: `+${shown.length - 4}`, tone: 'info' });
  return out;
}


/** Fome, sede, sono e temperatura como medidores (verde bem, amarelo atenção, vermelho ruim; azul = frio). */
function needGauges(b: Body): NeedGauge[] {
  const need = (label: string, v: number, [warn, bad]: readonly [number, number, ...number[]] | readonly number[]): NeedGauge => ({
    label,
    good: 1 - v / 100,
    tone: v >= (bad ?? 100) ? 'bad' : v >= (warn ?? 100) ? 'warn' : 'ok',
  });
  const cold = STATE_LEVELS.coldTemp;
  const hot = STATE_LEVELS.hotTemp;
  const t = b.temp;
  const tone: NeedGauge['tone'] = t < cold[1] ? 'cold' : t < cold[0] ? 'warn' : t > hot[1] ? 'bad' : t > hot[0] ? 'warn' : 'ok';
  // Temperatura: cheio no normal, esvazia para os dois lados.
  const spread = t < THERMAL_TUNING.normal ? THERMAL_TUNING.normal - cold[2] : hot[2] - THERMAL_TUNING.normal;
  return [
    need('FOME', b.hunger, [STATE_LEVELS.hunger[1], STATE_LEVELS.hunger[2]]),
    need('SEDE', b.thirst, [STATE_LEVELS.thirst[1], STATE_LEVELS.thirst[2]]),
    need('SONO', b.fatigue, [STATE_LEVELS.fatigue[1], STATE_LEVELS.fatigue[2]]),
    { label: 'TEMP', good: Math.max(0, 1 - Math.abs(t - THERMAL_TUNING.normal) / spread), tone },
  ];
}
