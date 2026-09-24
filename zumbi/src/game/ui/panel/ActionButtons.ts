/**
 * Fileira de botões de ação no rodapé dos painéis (px CSS). Cabe o que der
 * na largura; se houver mais ações, o último vira "MAIS ▸" e mostra as
 * próximas. Ação indisponível aparece apagada e, ao tocar, diz o motivo.
 */
import type Phaser from 'phaser';
import { UiButton } from '../UiButton';

export interface PanelAction {
  label: string;
  enabled?: boolean;
  /** Por que não dá (mostrado ao tocar numa ação apagada). */
  reason?: string;
  run: () => void;
}

const BTN_W = 100;
const BTN_H = 32;
const GAP = 8;
const POOL = 6;

export class ActionButtons {
  private readonly buttons: UiButton[] = [];
  private actions: PanelAction[] = [];
  private shown: (PanelAction | 'more')[] = [];
  private page = 0;
  private key = '';

  constructor(
    scene: Phaser.Scene,
    root: Phaser.GameObjects.Container,
    dpr: number,
    private readonly onReason: (text: string) => void,
    /** Pede para o painel redesenhar (trocou a página de ações). */
    private readonly onRefresh: () => void,
  ) {
    for (let i = 0; i < POOL; i++) {
      const b = new UiButton(scene, '', BTN_W, BTN_H, () => this.tap(i), i === 0, dpr);
      b.setVisible(false);
      this.buttons.push(b);
      root.add(b);
    }
  }

  /** Traz os botões para a frente (depois de criar linhas novas na lista). */
  bringToTop(root: Phaser.GameObjects.Container): void {
    for (const b of this.buttons) root.bringToTop(b);
  }

  /** Posiciona as ações na linha que começa em (x, y) com largura w. */
  layout(actions: PanelAction[], x: number, y: number, w: number, k: number): void {
    const key = actions.map((a) => `${a.label}${a.enabled === false ? '·' : ''}`).join('|');
    if (key !== this.key) {
      this.key = key;
      this.page = 0;
    }
    this.actions = actions;
    const fit = Math.max(1, Math.min(POOL, Math.floor((w + GAP * k) / ((BTN_W + GAP) * k))));
    let list: (PanelAction | 'more')[];
    if (actions.length <= fit) list = actions;
    else {
      const per = fit - 1;
      const pages = Math.ceil(actions.length / per);
      this.page %= pages;
      list = [...actions.slice(this.page * per, this.page * per + per), 'more'];
    }
    this.shown = list;
    this.buttons.forEach((b, i) => {
      const a = list[i];
      b.setVisible(!!a);
      if (!a) return;
      b.setLabel(a === 'more' ? 'MAIS ▸' : a.label);
      b.setDim(a !== 'more' && a.enabled === false);
      b.setScale(k).setPosition(x + (BTN_W / 2 + i * (BTN_W + GAP)) * k, y);
    });
  }

  hide(): void {
    for (const b of this.buttons) b.setVisible(false);
    this.shown = [];
  }

  private tap(i: number): void {
    const a = this.shown[i];
    if (!a) return;
    if (a === 'more') {
      this.page++;
      this.onRefresh();
      return;
    }
    if (a.enabled === false) {
      if (a.reason) this.onReason(a.reason);
      return;
    }
    a.run();
  }

  /** Posição de um botão pela etiqueta (testes automáticos). */
  buttonAt(label: string): { x: number; y: number } | null {
    const i = this.shown.findIndex((a) => a !== 'more' && a.label === label);
    const b = i >= 0 ? this.buttons[i] : undefined;
    return b?.visible ? { x: b.x, y: b.y } : null;
  }

  get current(): readonly PanelAction[] {
    return this.actions;
  }
}
