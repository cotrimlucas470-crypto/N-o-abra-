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

  /** Posiciona as ações na linha que começa em (x, y) com largura w (px na tela). */
  layout(actions: PanelAction[], x: number, y: number, w: number, k: number): void {
    const key = actions.map((a) => `${a.label}${a.enabled === false ? '·' : ''}`).join('|');
    if (key !== this.key) {
      this.key = key;
      this.page = 0;
    }
    this.actions = actions;
    // Largura de cada botão pelo texto; páginas enchem a linha, com "MAIS ▸" quando sobra.
    const probe = this.buttons[POOL - 1]!;
    const widthOf = (label: string) => {
      probe.setLabel(label);
      return Math.min(240, Math.max(78, probe.labelWidth + 26));
    };
    const avail = w / k;
    const more = widthOf('MAIS ▸');
    const pages: PanelAction[][] = [];
    let cur: PanelAction[] = [];
    let used = 0;
    actions.forEach((a, i) => {
      const bw = widthOf(a.label);
      const last = i === actions.length - 1;
      const need = used + bw + (last ? 0 : more + GAP);
      if (cur.length && (need > avail || cur.length >= POOL - 1)) {
        pages.push(cur);
        cur = [];
        used = 0;
      }
      cur.push(a);
      used += bw + GAP;
    });
    if (cur.length) pages.push(cur);
    this.page = pages.length ? this.page % pages.length : 0;
    const list: (PanelAction | 'more')[] = pages.length > 1 ? [...pages[this.page]!, 'more'] : (pages[0] ?? []);
    this.shown = list;
    let cx = x;
    this.buttons.forEach((b, i) => {
      const a = list[i];
      b.setVisible(!!a);
      if (!a) return;
      const label = a === 'more' ? 'MAIS ▸' : a.label;
      const bw = widthOf(label);
      b.setLabel(label).setButtonSize(bw, BTN_H);
      b.setDim(a !== 'more' && a.enabled === false);
      b.setScale(k).setPosition(cx + (bw / 2) * k, y);
      cx += (bw + GAP) * k;
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
