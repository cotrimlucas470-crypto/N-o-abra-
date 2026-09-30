/**
 * Editor do HUD (aberto pela pausa): arrastar move, − / + mudam o tamanho do
 * item marcado, RESTAURAR volta ao padrão. Salva por orientação da tela
 * (o layout é o mesmo dado de `input/touch/ControlsLayout`).
 */
import Phaser from 'phaser';
import type { GameServices } from '../core/Services';
import { DEFAULT_LAYOUT, placementFor, resolvePlacement, saveLayout, uiScaleFor, type ControlId } from '../input/touch/ControlsLayout';
import type { TouchControls } from '../input/touch/TouchControls';
import { UiButton } from './UiButton';
import { UI, textStyle } from './theme';

export interface HudRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HudEditorHooks {
  rectOf(id: 'status' | 'minimap'): HudRect;
  relayout(): void;
  done(): void;
}

const NAMES: Record<ControlId, string> = {
  moveStick: 'ANDAR',
  aimStick: 'MIRAR',
  sprint: 'CORRER',
  interact: 'AGIR',
  options: 'OPÇÕES',
  attack: 'ATACAR',
  reload: 'RECARGA',
  inventory: 'BOLSA',
  pause: 'PAUSA',
  fullscreen: 'TELA',
  shove: 'EMPURRAR',
  sneak: 'AGACHAR',
  wheel: 'VOLANTE',
  gas: 'ACELERA',
  brake: 'FREIO',
  status: 'STATUS',
  minimap: 'MAPA',
};

interface Handle {
  id: ControlId;
  x: number;
  y: number;
  r: number;
  rect?: HudRect;
}

const isRect = (id: ControlId): id is 'status' | 'minimap' => id === 'status' || id === 'minimap';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export class HudEditor {
  private on = false;
  private sel: ControlId | null = null;
  private drag: { id: ControlId; dx: number; dy: number; pid: number } | null = null;
  private barTop = Infinity;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly labels = new Map<ControlId, Phaser.GameObjects.Text>();
  private readonly hint: Phaser.GameObjects.Text;
  private readonly bar: UiButton[];
  private readonly barW = [46, 46, 120, 110];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly s: GameServices,
    private readonly dpr: number,
    private readonly ctl: TouchControls,
    private readonly hooks: HudEditorHooks,
  ) {
    this.g = scene.add.graphics().setDepth(158).setVisible(false);
    this.hint = scene.add.text(0, 0, 'Arraste para mover · toque num item e use − / + para o tamanho', textStyle(11, UI.text, '700')).setOrigin(0.5).setDepth(160).setResolution(dpr).setVisible(false);
    this.hint.setShadow(0, 1, 'rgba(0,0,0,0.9)', 3, false, true);
    const mk = (label: string, i: number, fn: () => void, primary = false) => new UiButton(scene, label, this.barW[i]!, 38, fn, primary, dpr).setDepth(160).setVisible(false);
    this.bar = [
      mk('−', 0, () => this.bump(1 / 1.12)),
      mk('+', 1, () => this.bump(1.12)),
      mk('RESTAURAR', 2, () => this.reset()),
      mk('PRONTO', 3, () => this.setOpen(false), true),
    ];
    const input = scene.input;
    input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
      input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
      input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
      input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    });
  }

  get isOpen(): boolean {
    return this.on;
  }

  setOpen(v: boolean): void {
    if (v === this.on) return;
    this.on = v;
    this.drag = null;
    this.sel = null;
    this.g.setVisible(v);
    this.hint.setVisible(v);
    for (const b of this.bar) b.setVisible(v);
    if (!v) {
      for (const t of this.labels.values()) t.setVisible(false);
      this.hooks.done();
    } else {
      const { cssWidth: w, cssHeight: h } = this.s.viewport;
      this.layout(w, h, uiScaleFor(w, h));
    }
  }

  layout(w: number, h: number, k: number): void {
    const ins = this.s.viewport.insets;
    const gap = 8;
    const total = this.barW.reduce((a, b) => a + b, 0) + gap * (this.barW.length - 1);
    const y = h - ins.bottom - 28 * k;
    let x = w / 2 - (total * k) / 2;
    this.bar.forEach((b, i) => {
      b.setPosition(x + (this.barW[i]! * k) / 2, y).setScale(k);
      x += (this.barW[i]! + gap) * k;
    });
    this.hint.setPosition(w / 2, y - 32 * k).setScale(Math.min(k, (w * 0.95) / Math.max(1, this.hint.width)));
    this.barTop = y - 46 * k;
    this.redraw();
  }

  private handles(): Handle[] {
    const { cssWidth: w, cssHeight: h, insets } = this.s.viewport;
    const k = uiScaleFor(w, h);
    const ids: ControlId[] = [...this.ctl.editIds(), 'status', 'minimap'];
    return ids.map((id) => {
      if (isRect(id)) {
        const r = this.hooks.rectOf(id);
        return { id, x: r.x + r.w / 2, y: r.y + r.h / 2, r: Math.max(r.w, r.h) / 2, rect: r };
      }
      const p = resolvePlacement(placementFor(this.ctl.layoutData, id, h > w), w, h, insets, k);
      return { id, x: p.x, y: p.y, r: p.radius };
    });
  }

  private redraw(): void {
    if (!this.on) return;
    const g = this.g.clear();
    const seen = new Set<ControlId>();
    for (const hd of this.handles()) {
      const sel = hd.id === this.sel;
      seen.add(hd.id);
      g.fillStyle(sel ? UI.accentNum : 0xffffff, sel ? 0.25 : 0.1);
      g.lineStyle(sel ? 3 : 1.5, sel ? UI.accentNum : 0xffffff, sel ? 1 : 0.75);
      if (hd.rect) {
        g.fillRoundedRect(hd.rect.x, hd.rect.y, hd.rect.w, hd.rect.h, 8);
        g.strokeRoundedRect(hd.rect.x, hd.rect.y, hd.rect.w, hd.rect.h, 8);
      } else {
        g.fillCircle(hd.x, hd.y, hd.r);
        g.strokeCircle(hd.x, hd.y, hd.r + 3);
      }
      let t = this.labels.get(hd.id);
      if (!t) {
        t = this.scene.add.text(0, 0, NAMES[hd.id], textStyle(9, '#ffffff', '800')).setOrigin(0.5).setDepth(159).setResolution(this.dpr);
        t.setShadow(0, 1, 'rgba(0,0,0,0.95)', 3, false, true);
        this.labels.set(hd.id, t);
      }
      t.setPosition(hd.x, hd.y).setVisible(true);
    }
    for (const [id, t] of this.labels) if (!seen.has(id)) t.setVisible(false);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.on) return;
    const x = p.x / this.dpr;
    const y = p.y / this.dpr;
    if (y >= this.barTop) return;
    const hs = this.handles();
    for (let i = hs.length - 1; i >= 0; i--) {
      const hd = hs[i]!;
      const hit = hd.rect ? x >= hd.rect.x && x <= hd.rect.x + hd.rect.w && y >= hd.rect.y && y <= hd.rect.y + hd.rect.h : Math.hypot(x - hd.x, y - hd.y) <= Math.max(hd.r, 22);
      if (!hit) continue;
      this.sel = hd.id;
      this.drag = { id: hd.id, dx: hd.x - x, dy: hd.y - y, pid: p.id };
      this.redraw();
      return;
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.on || !this.drag || p.id !== this.drag.pid) return;
    this.place(this.drag.id, p.x / this.dpr + this.drag.dx, p.y / this.dpr + this.drag.dy);
    this.hooks.relayout();
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (!this.drag || p.id !== this.drag.pid) return;
    this.drag = null;
    saveLayout(this.ctl.layoutData);
  }

  /** Grava a posição (centro do círculo ou canto do painel) como deslocamento da âncora. */
  private place(id: ControlId, cx: number, cy: number): void {
    const { cssWidth: w, cssHeight: h, insets: ins } = this.s.viewport;
    const k = uiScaleFor(w, h);
    const portrait = h > w;
    const layout = this.ctl.layoutData;
    const cur = placementFor(layout, id, portrait);
    let px = cx;
    let py = cy;
    if (isRect(id)) {
      const r = this.hooks.rectOf(id);
      px = clamp(cx - r.w / 2, ins.left, w - ins.right - r.w);
      py = clamp(cy - r.h / 2, ins.top, h - ins.bottom - r.h);
    } else {
      const rad = cur.size * k;
      px = clamp(cx, ins.left + rad, w - ins.right - rad);
      py = clamp(cy, ins.top + rad, h - ins.bottom - rad);
    }
    const t = portrait ? (layout.portrait[id] ??= { ...cur }) : layout.controls[id];
    t.x = Math.round(((cur.anchor.endsWith('left') ? px - ins.left : w - ins.right - px) / k) * 10) / 10;
    t.y = Math.round(((cur.anchor.startsWith('top') ? py - ins.top : h - ins.bottom - py) / k) * 10) / 10;
  }

  private bump(f: number): void {
    if (!this.sel) return;
    const { cssWidth: w, cssHeight: h } = this.s.viewport;
    const portrait = h > w;
    const layout = this.ctl.layoutData;
    const cur = placementFor(layout, this.sel, portrait);
    const t = portrait ? (layout.portrait[this.sel] ??= { ...cur }) : layout.controls[this.sel];
    t.size = Math.round(clamp(t.size * f, isRect(this.sel) ? 25 : 12, isRect(this.sel) ? 100 : 120) * 10) / 10;
    saveLayout(layout);
    this.hooks.relayout();
  }

  private reset(): void {
    this.ctl.layoutData = structuredClone(DEFAULT_LAYOUT);
    saveLayout(this.ctl.layoutData);
    this.hooks.relayout();
  }
}
