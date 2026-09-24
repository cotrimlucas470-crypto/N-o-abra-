/**
 * Painel de inventário (px CSS, no HUD). Mostra o que o jogador carrega,
 * o peso e deixa largar itens. O jogo NÃO pausa com ele aberto: o mundo
 * continua, como deve ser num jogo de sobrevivência.
 *
 * Toques são tratados à mão (pointer down/move/up vindos da HudScene):
 * tocar numa linha seleciona; arrastar a lista rola. Os botões de ação são
 * UiButtons comuns.
 */
import Phaser from 'phaser';
import type { AssetRegistry } from '../assets/AssetRegistry';
import type { GameServices } from '../core/Services';
import { formatKg, itemDef } from '../items/ItemCatalog';
import type { ItemContainer } from '../items/ItemContainer';
import { UiButton } from './UiButton';
import { UI, textStyle } from './theme';

const ROW_H = 40;
const PAD = 12;
const HEADER_H = 64;
const FOOTER_H = 74;
const DEPTH = 120;

interface Row {
  icon: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  weight: Phaser.GameObjects.Text;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class InventoryPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text;
  private readonly close: Phaser.GameObjects.Text;
  private readonly empty: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly dropOne: UiButton;
  private readonly dropAll: UiButton;
  private readonly rows: Row[] = [];
  private box: Box = { x: 0, y: 0, w: 0, h: 0 };
  private k = 1;
  private open = false;
  private selected: number | null = null;
  private scroll = 0;
  private drag: { id: number; y: number; scroll: number; moved: boolean } | null = null;
  private offInventory: (() => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly s: GameServices,
    private readonly assets: AssetRegistry,
    private readonly dpr: number,
    private readonly onClose: () => void,
  ) {
    this.bg = scene.add.graphics();
    this.title = scene.add.text(0, 0, 'INVENTÁRIO', textStyle(14, UI.text, '800')).setResolution(dpr).setLetterSpacing(2);
    this.sub = scene.add.text(0, 0, '', textStyle(11, UI.textDim, '600')).setResolution(dpr);
    this.close = scene.add.text(0, 0, '✕', textStyle(18, UI.text, '700')).setOrigin(0.5).setResolution(dpr);
    this.empty = scene.add
      .text(0, 0, 'Nada nos bolsos.\nChegue perto de um item e toque em PEGAR.', textStyle(12, UI.textDim, '600'))
      .setOrigin(0.5)
      .setAlign('center')
      .setResolution(dpr);
    this.detail = scene.add.text(0, 0, '', textStyle(11, UI.textDim, '600')).setResolution(dpr);
    this.dropOne = new UiButton(scene, 'LARGAR 1', 120, 34, () => this.drop(false), false, dpr);
    this.dropAll = new UiButton(scene, 'LARGAR TUDO', 132, 34, () => this.drop(true), false, dpr);
    this.root = scene.add.container(0, 0, [this.bg, this.title, this.sub, this.close, this.empty, this.detail, this.dropOne, this.dropAll]);
    this.root.setDepth(DEPTH).setVisible(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  private get container(): ItemContainer | null {
    return this.s.session.inventory?.carried ?? null;
  }

  toggle(): void {
    this.setOpen(!this.open);
  }

  setOpen(v: boolean): void {
    if (v === this.open) return;
    this.open = v;
    this.root.setVisible(v);
    this.selected = null;
    this.scroll = 0;
    this.drag = null;
    this.offInventory?.();
    this.offInventory = null;
    if (v) {
      this.offInventory = this.s.session.inventory?.onChange(() => this.refresh()) ?? null;
      this.refresh();
    } else {
      this.onClose();
    }
  }

  contains(x: number, y: number): boolean {
    const b = this.box;
    return this.open && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  /**
   * Posição do painel. Na horizontal fica à direita, deixando livre a coluna
   * do botão de inventário e o lado esquerdo (dá para andar com ele aberto).
   * Em pé ocupa a parte de cima, acima dos controles.
   */
  layout(w: number, h: number, ins: { left: number; right: number; top: number; bottom: number }, k: number): void {
    this.k = k;
    const portrait = h > w;
    if (portrait) {
      const x = ins.left + 10;
      const y = ins.top + 100 * k; // abaixo do status e do relógio
      this.box = { x, y, w: w - ins.left - ins.right - 20, h: Math.max(200 * k, h - ins.bottom - 360 * k - y) };
    } else {
      // Deixa livres os botões do canto (tela cheia, pausa) e a coluna do inventário.
      const right = w - ins.right - 118 * k;
      const width = Math.min(380 * k, right - ins.left - 12);
      const y = ins.top + 10;
      this.box = { x: right - width, y, w: width, h: h - ins.top - ins.bottom - 20 };
    }
    this.refresh();
  }

  private get listTop(): number {
    return this.box.y + HEADER_H * this.k;
  }

  private get listH(): number {
    return this.box.h - (HEADER_H + FOOTER_H) * this.k;
  }

  private get visibleRows(): number {
    return Math.max(1, Math.floor(this.listH / (ROW_H * this.k)));
  }

  refresh(): void {
    if (!this.open) return;
    const c = this.container;
    const inv = this.s.session.inventory;
    const { x, y, w, h } = this.box;
    const k = this.k;
    const stacks = c?.stacks ?? [];
    if (this.selected !== null && this.selected >= stacks.length) this.selected = stacks.length ? stacks.length - 1 : null;
    const maxScroll = Math.max(0, stacks.length - this.visibleRows);
    this.scroll = Math.min(Math.max(0, this.scroll), maxScroll);

    const g = this.bg;
    g.clear();
    g.fillStyle(0x0e0f12, 0.95).fillRoundedRect(x, y, w, h, 12 * k);
    g.lineStyle(1.5, 0xffffff, 0.14).strokeRoundedRect(x, y, w, h, 12 * k);

    this.title.setPosition(x + PAD * k, y + 10 * k).setScale(k);
    this.close.setPosition(x + w - 20 * k, y + 20 * k).setScale(k);
    const weight = inv?.weight ?? 0;
    const cap = inv?.capacity ?? 1;
    this.sub.setText(`${c?.name ?? ''} · ${formatKg(weight)} de ${formatKg(cap)}`).setPosition(x + PAD * k, y + 32 * k).setScale(k);
    // Barra de peso
    const bx = x + PAD * k;
    const by = y + 50 * k;
    const bw = w - PAD * 2 * k;
    const frac = Math.min(1, weight / cap);
    g.fillStyle(0xffffff, 0.1).fillRoundedRect(bx, by, bw, 5 * k, 2.5 * k);
    if (frac > 0) g.fillStyle(frac > 0.9 ? UI.danger : UI.accentNum, 0.9).fillRoundedRect(bx, by, Math.max(5 * k, bw * frac), 5 * k, 2.5 * k);

    // Linhas
    const rowH = ROW_H * k;
    const n = Math.min(this.visibleRows, stacks.length - this.scroll);
    while (this.rows.length < n) this.rows.push(this.makeRow());
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!;
      const idx = this.scroll + i;
      const st = i < n ? stacks[idx] : undefined;
      const def = st ? itemDef(st.defId) : null;
      const vis = !!(st && def);
      row.icon.setVisible(vis);
      row.name.setVisible(vis);
      row.weight.setVisible(vis);
      if (!st || !def) continue;
      const ry = this.listTop + i * rowH;
      if (idx === this.selected) g.fillStyle(UI.accentNum, 0.22).fillRoundedRect(x + 6 * k, ry + 2 * k, w - 12 * k, rowH - 4 * k, 8 * k);
      else if (i % 2 === 1) g.fillStyle(0xffffff, 0.03).fillRect(x + 6 * k, ry + 2 * k, w - 12 * k, rowH - 4 * k);
      const ref = this.assets.ref(def.icon);
      row.icon.setTexture(ref.key, ref.frame);
      row.icon.setDisplaySize(30 * k, 30 * k).setPosition(x + (PAD + 16) * k, ry + rowH / 2);
      row.name.setText(st.count > 1 ? `${def.name}  ×${st.count}` : def.name).setPosition(x + (PAD + 38) * k, ry + rowH / 2).setScale(k);
      row.weight.setText(formatKg(def.weight * st.count)).setPosition(x + w - PAD * k, ry + rowH / 2).setScale(k);
    }
    // Barra de rolagem quando não cabe tudo
    if (maxScroll > 0) {
      const trackH = this.visibleRows * rowH;
      const thumbH = Math.max(18 * k, (trackH * this.visibleRows) / stacks.length);
      const ty = this.listTop + ((trackH - thumbH) * this.scroll) / maxScroll;
      g.fillStyle(0xffffff, 0.25).fillRoundedRect(x + w - 5 * k, ty, 3 * k, thumbH, 1.5 * k);
    }

    this.empty.setVisible(stacks.length === 0).setPosition(x + w / 2, this.listTop + this.listH / 2).setScale(k);

    // Rodapé: descrição e ações do item selecionado
    const sel = this.selected !== null ? stacks[this.selected] : undefined;
    const sdef = sel ? itemDef(sel.defId) : null;
    const fy = y + h - FOOTER_H * k;
    g.lineStyle(1, 0xffffff, 0.1).lineBetween(x + PAD * k, fy, x + w - PAD * k, fy);
    this.detail
      .setText(sdef ? sdef.description : stacks.length ? 'Toque num item para ver as opções.' : '')
      .setPosition(x + PAD * k, fy + 8 * k)
      .setScale(k)
      .setWordWrapWidth((w - PAD * 2 * k) / k);
    const showActions = !!sel;
    const btnY = y + h - 24 * k;
    this.dropOne.setVisible(showActions).setScale(k).setPosition(x + PAD * k + 60 * k, btnY);
    this.dropAll.setVisible(showActions && (sel?.count ?? 0) > 1).setScale(k).setPosition(x + PAD * k + 60 * k + 130 * k, btnY);
  }

  private makeRow(): Row {
    const s = this.scene;
    const icon = s.add.image(0, 0, '__MISSING');
    const name = s.add.text(0, 0, '', textStyle(13, UI.text, '600')).setOrigin(0, 0.5).setResolution(this.dpr);
    const weight = s.add.text(0, 0, '', textStyle(11, UI.textDim, '600')).setOrigin(1, 0.5).setResolution(this.dpr);
    this.root.add([icon, name, weight]);
    // Botões de ação ficam por cima das linhas.
    this.root.bringToTop(this.dropOne);
    this.root.bringToTop(this.dropAll);
    return { icon, name, weight };
  }

  private drop(all: boolean): void {
    const c = this.container;
    if (!c || this.selected === null) return;
    const st = c.stacks[this.selected];
    if (!st) return;
    this.s.bus.emit('inventory:drop', { containerId: c.id, index: this.selected, count: all ? st.count : 1 });
  }

  // ---------------------------------------------------------------- toque

  pointerDown(id: number, x: number, y: number): void {
    if (!this.contains(x, y)) return;
    if (Math.hypot(x - this.close.x, y - this.close.y) < 22 * this.k) {
      this.setOpen(false);
      return;
    }
    if (y >= this.listTop && y < this.listTop + this.listH) this.drag = { id, y, scroll: this.scroll, moved: false };
  }

  pointerMove(id: number, _x: number, y: number): void {
    const d = this.drag;
    if (!d || d.id !== id) return;
    const dy = y - d.y;
    if (Math.abs(dy) > 8 * this.k) d.moved = true;
    if (!d.moved) return;
    const next = d.scroll - Math.round(dy / (ROW_H * this.k));
    if (next !== this.scroll) {
      this.scroll = next;
      this.refresh();
    }
  }

  pointerUp(id: number, x: number, y: number): void {
    const d = this.drag;
    if (!d || d.id !== id) return;
    this.drag = null;
    if (d.moved || !this.contains(x, y)) return;
    const i = Math.floor((y - this.listTop) / (ROW_H * this.k));
    const idx = this.scroll + i;
    const n = this.container?.stacks.length ?? 0;
    if (i < 0 || i >= this.visibleRows || idx >= n) return;
    this.selected = this.selected === idx ? null : idx;
    this.refresh();
  }
}
