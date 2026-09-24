/**
 * Lista rolável genérica com rodapé de detalhes e ações (px CSS, no HUD).
 * As abas CORPO, TEMPO, FABRICAR e CONSTRUIR são só "fontes" de linhas:
 * cabeçalho, barra (fome 60%), linha com ícone (roupa, receita) ou texto.
 * Tocar numa linha com id seleciona e mostra o detalhe + botões no rodapé.
 */
import type Phaser from 'phaser';
import type { AssetRegistry } from '../../assets/AssetRegistry';
import type { Tone } from '../../items/condition';
import { UI, textStyle } from '../theme';
import { ActionButtons, type PanelAction } from './ActionButtons';

export type ListRow =
  | { kind: 'header'; text: string; right?: string }
  | { kind: 'bar'; label: string; value: number; text: string; color: number }
  | { kind: 'line'; id?: string; icon?: string; text: string; right?: string; color?: string; mark?: Tone; dim?: boolean }
  | { kind: 'text'; text: string; color?: string };

export interface ListDetail {
  title: string;
  titleColor?: string;
  tags?: string;
  tagsColor?: string;
  desc?: string;
  actions: PanelAction[];
}

export interface ListSource {
  rows(): ListRow[];
  detail(selected: string | null): ListDetail;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAD = 10;
const H: Record<ListRow['kind'], number> = { header: 24, bar: 24, line: 38, text: 20 };
const FOOT_H = 104;
const TONE_NUM: Record<Tone, number> = { ok: 0x7fc86a, info: 0x9a988f, warn: 0xe0a040, bad: 0xe0604a };

interface RowView {
  icon: Phaser.GameObjects.Image;
  a: Phaser.GameObjects.Text;
  b: Phaser.GameObjects.Text;
}

export class ListView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly views: RowView[] = [];
  private readonly title: Phaser.GameObjects.Text;
  private readonly tags: Phaser.GameObjects.Text;
  private readonly desc: Phaser.GameObjects.Text;
  private readonly buttons: ActionButtons;
  private rowsCache: ListRow[] = [];
  private box: Box = { x: 0, y: 0, w: 0, h: 0 };
  private k = 1;
  private scroll = 0;
  private visible = false;
  private source: ListSource | null = null;
  selected: string | null = null;
  private drag: { id: number; y: number; scroll: number; moved: boolean } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly root: Phaser.GameObjects.Container,
    private readonly assets: AssetRegistry,
    private readonly dpr: number,
    feedback: (text: string) => void,
  ) {
    this.g = scene.add.graphics();
    this.title = scene.add.text(0, 0, '', textStyle(13, UI.text, '800')).setResolution(dpr);
    this.tags = scene.add.text(0, 0, '', textStyle(11, UI.textDim, '700')).setResolution(dpr);
    this.desc = scene.add.text(0, 0, '', textStyle(11, UI.textDim, '600')).setResolution(dpr);
    root.add([this.g, this.title, this.tags, this.desc]);
    this.buttons = new ActionButtons(scene, root, dpr, feedback, () => this.refresh());
    this.setVisible(false);
  }

  setSource(src: ListSource): void {
    if (src !== this.source) {
      this.source = src;
      this.scroll = 0;
      this.selected = null;
    }
  }

  setBox(box: Box, k: number): void {
    this.box = box;
    this.k = k;
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.g.setVisible(v);
    this.title.setVisible(v);
    this.tags.setVisible(v);
    this.desc.setVisible(v);
    if (!v) {
      for (const r of this.views) {
        r.icon.setVisible(false);
        r.a.setVisible(false);
        r.b.setVisible(false);
      }
      this.buttons.hide();
    }
  }

  private get listBox(): Box {
    const b = this.box;
    return { x: b.x, y: b.y, w: b.w, h: b.h - FOOT_H * this.k };
  }

  refresh(): void {
    if (!this.visible || !this.source) return;
    const k = this.k;
    const g = this.g;
    g.clear();
    this.rowsCache = this.source.rows();
    // Seleção que sumiu da lista.
    if (this.selected && !this.rowsCache.some((r) => r.kind === 'line' && r.id === this.selected)) this.selected = null;
    const lb = this.listBox;
    let total = 0;
    for (const r of this.rowsCache) total += H[r.kind] * k;
    const maxScroll = Math.max(0, total - lb.h);
    this.scroll = Math.min(Math.max(0, this.scroll), maxScroll);
    for (const v of this.views) {
      v.icon.setVisible(false);
      v.a.setVisible(false);
      v.b.setVisible(false);
    }
    let y = lb.y - this.scroll;
    let vi = 0;
    for (const r of this.rowsCache) {
      const rh = H[r.kind] * k;
      if (y >= lb.y - 0.5 && y + rh <= lb.y + lb.h + 0.5) this.drawRow(r, this.views[vi++] ?? this.makeView(), lb.x, y, lb.w, rh);
      y += rh;
    }
    if (maxScroll > 0) {
      const thumb = Math.max(18 * k, (lb.h * lb.h) / total);
      const ty = lb.y + ((lb.h - thumb) * this.scroll) / maxScroll;
      g.fillStyle(0xffffff, 0.25).fillRoundedRect(lb.x + lb.w - 5 * k, ty, 3 * k, thumb, 1.5 * k);
    }
    this.drawFooter();
  }

  private makeView(): RowView {
    const s = this.scene;
    const icon = s.add.image(0, 0, '__MISSING').setVisible(false);
    const a = s.add.text(0, 0, '', textStyle(12, UI.text, '600')).setOrigin(0, 0.5).setResolution(this.dpr);
    const b = s.add.text(0, 0, '', textStyle(10, UI.textDim, '600')).setOrigin(1, 0.5).setResolution(this.dpr);
    this.root.add([icon, a, b]);
    this.buttons.bringToTop(this.root);
    const v = { icon, a, b };
    this.views.push(v);
    return v;
  }

  private drawRow(r: ListRow, v: RowView, x: number, y: number, w: number, rh: number): void {
    const k = this.k;
    const g = this.g;
    const cy = y + rh / 2;
    if (r.kind === 'header') {
      v.a.setText(r.text.toUpperCase()).setColor(UI.textDim).setFontStyle('800').setPosition(x + PAD * k, cy).setScale(k * 0.9).setVisible(true);
      if (r.right) v.b.setText(r.right).setPosition(x + w - PAD * k, cy).setScale(k).setVisible(true);
      g.lineStyle(1, 0xffffff, 0.08).lineBetween(x + PAD * k, y + rh - 1, x + w - PAD * k, y + rh - 1);
      return;
    }
    if (r.kind === 'text') {
      v.a.setText(r.text).setColor(r.color ?? UI.textDim).setFontStyle('600').setPosition(x + PAD * k, cy).setScale(k).setVisible(true);
      fit(v.a, r.text, (w - PAD * 2 * k) / k);
      return;
    }
    if (r.kind === 'bar') {
      const lw = 92 * k;
      v.a.setText(r.label).setColor(UI.text).setFontStyle('600').setPosition(x + PAD * k, cy).setScale(k).setVisible(true);
      v.b.setText(r.text).setPosition(x + w - PAD * k, cy).setScale(k).setVisible(true);
      const bx = x + PAD * k + lw;
      const bw = Math.max(20 * k, w - PAD * 2 * k - lw - 64 * k);
      g.fillStyle(0xffffff, 0.1).fillRoundedRect(bx, cy - 3 * k, bw, 6 * k, 3 * k);
      const f = Math.max(0, Math.min(1, r.value));
      if (f > 0) g.fillStyle(r.color, 0.95).fillRoundedRect(bx, cy - 3 * k, Math.max(6 * k, bw * f), 6 * k, 3 * k);
      return;
    }
    const selected = !!r.id && r.id === this.selected;
    if (selected) g.fillStyle(UI.accentNum, 0.22).fillRoundedRect(x + 6 * k, y + 2 * k, w - 12 * k, rh - 4 * k, 8 * k);
    if (r.mark && r.mark !== 'ok' && r.mark !== 'info') g.fillStyle(TONE_NUM[r.mark], 0.9).fillRoundedRect(x + 7 * k, y + 8 * k, 3 * k, rh - 16 * k, 1.5 * k);
    let tx = x + PAD * k;
    if (r.icon) {
      const ref = this.assets.ref(r.icon);
      v.icon.setTexture(ref.key, ref.frame).setDisplaySize(28 * k, 28 * k).setPosition(x + (PAD + 17) * k, cy).setAlpha(r.dim ? 0.45 : 1).setVisible(true);
      tx = x + (PAD + 36) * k;
    }
    v.a.setText(r.text).setColor(r.color ?? UI.text).setFontStyle('600').setPosition(tx, cy).setScale(k).setAlpha(r.dim ? 0.55 : 1).setVisible(true);
    const rightW = r.right ? 70 * k : 0;
    fit(v.a, r.text, (x + w - PAD * k - rightW - tx) / k);
    if (r.right) v.b.setText(r.right).setPosition(x + w - PAD * k, cy).setScale(k).setAlpha(r.dim ? 0.55 : 1).setVisible(true);
  }

  private drawFooter(): void {
    const k = this.k;
    const b = this.box;
    const fy = b.y + b.h - FOOT_H * k;
    this.g.lineStyle(1, 0xffffff, 0.1).lineBetween(b.x + PAD * k, fy, b.x + b.w - PAD * k, fy);
    const d = this.source!.detail(this.selected);
    const tx = b.x + PAD * k;
    this.title.setText(d.title).setColor(d.titleColor ?? UI.text).setPosition(tx, fy + 8 * k).setScale(k);
    this.tags.setText(d.tags ?? '').setColor(d.tagsColor ?? UI.textDim).setPosition(tx, fy + 26 * k).setScale(k);
    fit(this.tags, d.tags ?? '', (b.w - PAD * 2 * k) / k);
    this.desc.setText(d.desc ?? '').setPosition(tx, fy + 42 * k).setScale(k);
    fit(this.desc, d.desc ?? '', (b.w - PAD * 2 * k) / k);
    this.buttons.layout(d.actions, tx, b.y + b.h - 22 * k, b.w - PAD * 2 * k, k);
  }

  // ---------------------------------------------------------------- toque

  private inList(x: number, y: number): boolean {
    const lb = this.listBox;
    return x >= lb.x && x <= lb.x + lb.w && y >= lb.y && y <= lb.y + lb.h;
  }

  pointerDown(id: number, x: number, y: number): void {
    if (this.visible && this.inList(x, y)) this.drag = { id, y, scroll: this.scroll, moved: false };
  }

  pointerMove(id: number, y: number): void {
    const d = this.drag;
    if (!d || d.id !== id) return;
    if (Math.abs(y - d.y) > 8 * this.k) d.moved = true;
    if (!d.moved) return;
    this.scroll = d.scroll - (y - d.y);
    this.refresh();
  }

  pointerUp(id: number, x: number, y: number): void {
    const d = this.drag;
    if (!d || d.id !== id) return;
    this.drag = null;
    if (d.moved || !this.inList(x, y)) return;
    const k = this.k;
    let cy = this.listBox.y - this.scroll;
    for (const r of this.rowsCache) {
      const rh = H[r.kind] * k;
      if (y >= cy && y < cy + rh) {
        if (r.kind === 'line' && r.id) {
          this.selected = this.selected === r.id ? null : r.id;
          this.refresh();
        }
        return;
      }
      cy += rh;
    }
  }

  wheel(x: number, y: number, dy: number): void {
    if (!this.visible || !this.inList(x, y)) return;
    this.scroll += dy;
    this.refresh();
  }

  buttonAt(label: string): { x: number; y: number } | null {
    return this.buttons.buttonAt(label);
  }

  /** Centro da linha com este id (testes automáticos). */
  rowCenter(id: string): { x: number; y: number } | null {
    const k = this.k;
    let cy = this.listBox.y - this.scroll;
    for (const r of this.rowsCache) {
      const rh = H[r.kind] * k;
      if (r.kind === 'line' && r.id === id) return { x: this.box.x + this.box.w / 2, y: cy + rh / 2 };
      cy += rh;
    }
    return null;
  }
}

/** Corta com "…" se passar da largura (px antes da escala). */
export function fit(t: Phaser.GameObjects.Text, text: string, maxW: number): void {
  t.setText(text);
  if (t.width <= maxW || text.length < 4) return;
  let s = text;
  while (s.length > 3 && t.width > maxW) {
    s = s.slice(0, -1);
    t.setText(`${s}…`);
  }
}
