/**
 * Controles de toque completos: joystick de movimento (esquerda),
 * joystick de mira (direita), botão Correr, Pausa e Tela cheia.
 *
 * Multitoque: cada dedo é rastreado pelo id do ponteiro, então dá para
 * andar, mirar e tocar em botões ao mesmo tempo. Prioridade de um toque
 * novo: botões > joystick da metade da tela onde caiu.
 *
 * Posições vêm de ControlsLayout (dados) — prontas para uma futura tela
 * de "reposicionar botões".
 */
import Phaser from 'phaser';
import { DEBUG } from '../../core/Debug';
import { canFullscreen, isFullscreen } from '../../systems/fullscreen';
import type { GameServices } from '../../core/Services';
import { iconCrosshair, iconFullscreen, iconPause, iconRun } from '../../ui/icons';
import { UI } from '../../ui/theme';
import { loadLayout, placementFor, resolvePlacement, uiScaleFor, type ControlId, type ControlsLayoutData } from './ControlsLayout';
import { TouchButton } from './TouchButton';
import { VirtualJoystick } from './VirtualJoystick';

export interface TouchControlsCallbacks {
  onPause: () => void;
  onFullscreen: () => void;
}

const DEPTH = 100;

export class TouchControls {
  readonly move: VirtualJoystick;
  readonly aim: VirtualJoystick;
  readonly sprint: TouchButton;
  readonly pause: TouchButton;
  readonly fullscreen: TouchButton;
  private layoutData: ControlsLayoutData = loadLayout();
  private touchMode: boolean;
  private enabled = true;
  private cssW = 0;
  private cssH = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly s: GameServices,
    private readonly cb: TouchControlsCallbacks,
  ) {
    this.touchMode = DEBUG.forceTouch || scene.sys.game.device.input.touch || navigator.maxTouchPoints > 0;

    this.move = new VirtualJoystick(scene, { deadzone: 0.12, accent: UI.accentNum }, DEPTH);
    this.aim = new VirtualJoystick(scene, { deadzone: 0.18, accent: 0xd8d2c0, drawIcon: iconCrosshair }, DEPTH);
    this.sprint = new TouchButton(scene, iconRun, DEPTH + 1, { accent: UI.accentNum });
    this.pause = new TouchButton(scene, iconPause, DEPTH + 1, { accent: UI.accentNum, hitScale: 1.5, subtle: true });
    this.fullscreen = new TouchButton(
      scene,
      (g, x, y, r, c, a) => iconFullscreen(g, x, y, r, c, isFullscreen(), a),
      DEPTH + 1,
      { accent: UI.accentNum, hitScale: 1.5, subtle: true },
    );

    const input = scene.input;
    input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.releaseAll, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
      input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
      input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
      input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
      scene.game.events.off(Phaser.Core.Events.BLUR, this.releaseAll, this);
    });
    this.applyVisibility();
  }

  get isTouchMode(): boolean {
    return this.touchMode;
  }

  /** Recalcula posições (troca de orientação, tela cheia, etc). */
  layout(cssW: number, cssH: number): void {
    this.cssW = cssW;
    this.cssH = cssH;
    const scale = uiScaleFor(cssW, cssH);
    const insets = this.s.viewport.insets;
    const portrait = cssH > cssW;
    const at = (id: ControlId) => resolvePlacement(placementFor(this.layoutData, id, portrait), cssW, cssH, insets, scale);

    const m = at('moveStick');
    this.move.setLayout(m.x, m.y, m.radius, cssW, cssH);
    const a = at('aimStick');
    this.aim.setLayout(a.x, a.y, a.radius, cssW, cssH);
    const sp = at('sprint');
    this.sprint.setLayout(sp.x, sp.y, sp.radius);
    const p = at('pause');
    this.pause.setLayout(p.x, p.y, p.radius);
    const f = at('fullscreen');
    this.fullscreen.setLayout(f.x, f.y, f.radius);
  }

  /** Desliga os controles (pausa, menus) soltando qualquer dedo. */
  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) this.releaseAll();
  }

  /** Solta tudo: joysticks voltam ao centro, nada fica "preso". */
  releaseAll(): void {
    this.move.end();
    this.aim.end();
    this.sprint.release();
    this.pause.release();
    this.fullscreen.release();
    this.s.touch.reset();
    this.s.touch.sprintToggled = false;
  }

  private applyVisibility(): void {
    const t = this.touchMode;
    this.move.setVisible(t);
    this.aim.setVisible(t);
    this.sprint.setVisible(t);
    this.pause.setVisible(true);
    // Só mostra o botão onde o navegador realmente permite tela cheia.
    this.fullscreen.setVisible(canFullscreen());
  }

  private toUi(p: Phaser.Input.Pointer): { x: number; y: number } {
    const dpr = this.s.viewport.dpr;
    return { x: p.x / dpr, y: p.y / dpr };
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (p.wasTouch && !this.touchMode) {
      // Primeiro toque num aparelho híbrido: liga o modo toque.
      this.touchMode = true;
      this.applyVisibility();
      this.layout(this.cssW, this.cssH);
      this.s.bus.emit('input:touch-detected', {});
    }
    const { x, y } = this.toUi(p);

    if (!this.enabled) return;
    for (const b of [this.pause, this.fullscreen, this.sprint]) {
      if (b.pointerId === null && b.hit(x, y)) {
        b.press(p.id);
        return;
      }
    }

    // Joysticks: só toque (mouse no PC é mira com clique).
    if (!this.touchMode || (!p.wasTouch && !DEBUG.forceTouch)) return;
    const leftSide = x < this.cssW * 0.45;
    if (leftSide && this.move.pointerId === null) this.move.begin(p.id, x, y);
    else if (!leftSide && this.aim.pointerId === null) this.aim.begin(p.id, x, y);
    this.publish();
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!p.isDown) return;
    const { x, y } = this.toUi(p);
    if (this.move.pointerId === p.id) this.move.move(x, y);
    else if (this.aim.pointerId === p.id) this.aim.move(x, y);
    else return;
    this.publish();
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const { x, y } = this.toUi(p);
    if (this.move.pointerId === p.id) {
      this.move.end();
      // Soltou o joystick de movimento: o "correr" desliga sozinho
      // (senão o próximo passo sairia correndo sem querer).
      this.s.touch.sprintToggled = false;
    }
    if (this.aim.pointerId === p.id) this.aim.end();
    this.publish();
    if (this.sprint.pointerId === p.id) {
      this.sprint.release();
      if (this.sprint.hit(x, y)) this.s.touch.sprintToggled = !this.s.touch.sprintToggled;
    }
    if (this.pause.pointerId === p.id) {
      this.pause.release();
      if (this.pause.hit(x, y)) this.cb.onPause();
    }
    if (this.fullscreen.pointerId === p.id) {
      this.fullscreen.release();
      // Tela cheia precisa ser pedida dentro do gesto (pointerup) — regra do navegador.
      if (this.fullscreen.hit(x, y)) this.cb.onFullscreen();
    }
  }

  /**
   * Copia os joysticks para a intenção de toque NO MOMENTO do evento:
   * a cena do jogo atualiza antes do HUD, então esperar o update do HUD
   * custaria 1 quadro de atraso entre o dedo e o personagem.
   */
  private publish(): void {
    const t = this.s.touch;
    t.move = { ...this.move.value, active: this.move.isActive };
    t.aim = { ...this.aim.value, active: this.aim.isActive };
  }

  /** 1x por quadro: visual do botão Correr e rede de segurança contra dedo "preso". */
  update(sprintBlocked: boolean): void {
    // Se o sistema engolir o "soltar" (gesto do Android, notificação...),
    // o ponteiro deixa de estar pressionado e o joystick volta ao centro.
    const pointers = this.scene.input.manager.pointers;
    const stuck = (id: number | null) => id !== null && !pointers.some((p) => p.id === id && p.isDown);
    if (stuck(this.move.pointerId)) {
      this.move.end();
      this.s.touch.sprintToggled = false;
      this.publish();
    }
    if (stuck(this.aim.pointerId)) {
      this.aim.end();
      this.publish();
    }
    this.sprint.setState(this.s.touch.sprintToggled, sprintBlocked);
  }

  refreshFullscreenIcon(): void {
    this.fullscreen.redraw();
  }
}
