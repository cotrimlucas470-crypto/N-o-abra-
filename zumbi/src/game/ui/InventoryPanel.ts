/**
 * Painel de inventário e saque (px CSS, no HUD). O jogo NÃO pausa com ele
 * aberto: o mundo continua, como deve ser num jogo de sobrevivência.
 *
 * - Só inventário: lista do que o jogador carrega (bolsos + mochila).
 * - Com um recipiente aberto (geladeira, armário, porta-malas...): duas
 *   colunas — o recipiente e o inventário — lado a lado (deitado) ou uma em
 *   cima da outra (em pé).
 * - Tocar num item mostra nome, raridade, CONDIÇÃO (colorida), peso e o que
 *   dá para fazer: pegar, pegar tudo, guardar, largar, comer/beber/usar/vestir.
 *
 * Toques são tratados à mão (pointer down/move/up vindos da HudScene):
 * tocar seleciona; arrastar rola a lista. As ações viram eventos no EventBus;
 * quem mexe no mundo é a cena do jogo.
 */
import Phaser from 'phaser';
import type { AssetRegistry } from '../assets/AssetRegistry';
import type { GameServices } from '../core/Services';
import { USE_LABEL, useKind } from '../interaction/LootActions';
import { conditionTags, type Tone } from '../items/condition';
import { formatKg, itemDef } from '../items/ItemCatalog';
import type { ItemContainer } from '../items/ItemContainer';
import { CATEGORY_INFO, RARITY_INFO } from '../items/ItemTypes';
import { BAG_ID } from '../items/PlayerInventory';
import { UiButton } from './UiButton';
import { UI, textStyle } from './theme';

const ROW_H = 40;
const HEAD_H = 22;
const PAD = 10;
const FOOT_H = 104;
const DEPTH = 120;

const TONE_COLOR: Record<Tone, string> = { ok: '#9fd88a', info: '#c9c7bf', warn: '#f0b060', bad: '#f07a6a' };
const TONE_NUM: Record<Tone, number> = { ok: 0x7fc86a, info: 0x9a988f, warn: 0xe0a040, bad: 0xe0604a };

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type PaneId = 'loot' | 'inv';

/** Uma linha da lista: cabeçalho de recipiente ou pilha de item. */
type Row = { kind: 'header'; container: ItemContainer; title: string } | { kind: 'stack'; container: ItemContainer; index: number };

interface RowView {
  icon: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  right: Phaser.GameObjects.Text;
}

interface Pane {
  id: PaneId;
  box: Box;
  rows: Row[];
  scroll: number;
  views: RowView[];
  title: Phaser.GameObjects.Text;
  sub: Phaser.GameObjects.Text;
  empty: Phaser.GameObjects.Text;
}

interface Selection {
  pane: PaneId;
  containerId: string;
  /** -1 = cabeçalho (mochila). */
  index: number;
}

interface Action {
  label: string;
  run: () => void;
}

export class InventoryPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly close: Phaser.GameObjects.Text;
  private readonly detailName: Phaser.GameObjects.Text;
  private readonly detailTags: Phaser.GameObjects.Text;
  private readonly detailDesc: Phaser.GameObjects.Text;
  private readonly buttons: UiButton[] = [];
  private actions: Action[] = [];
  private readonly panes: Record<PaneId, Pane>;
  private box: Box = { x: 0, y: 0, w: 0, h: 0 };
  private foot: Box = { x: 0, y: 0, w: 0, h: 0 };
  private k = 1;
  private cssW = 0;
  private cssH = 0;
  private ins = { left: 0, right: 0, top: 0, bottom: 0 };
  private open = false;
  private selected: Selection | null = null;
  private drag: { id: number; pane: PaneId; y: number; scroll: number; moved: boolean } | null = null;
  private offInventory: (() => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly s: GameServices,
    private readonly assets: AssetRegistry,
    private readonly dpr: number,
    private readonly onClose: () => void,
  ) {
    this.bg = scene.add.graphics();
    this.close = scene.add.text(0, 0, '✕', textStyle(18, UI.text, '700')).setOrigin(0.5).setResolution(dpr);
    this.detailName = scene.add.text(0, 0, '', textStyle(13, UI.text, '800')).setResolution(dpr);
    this.detailTags = scene.add.text(0, 0, '', textStyle(11, UI.textDim, '700')).setResolution(dpr);
    this.detailDesc = scene.add.text(0, 0, '', textStyle(11, UI.textDim, '600')).setResolution(dpr);
    this.root = scene.add.container(0, 0, [this.bg, this.close, this.detailName, this.detailTags, this.detailDesc]);
    const mkPane = (id: PaneId): Pane => {
      const title = scene.add.text(0, 0, '', textStyle(13, UI.text, '800')).setResolution(dpr).setLetterSpacing(1);
      const sub = scene.add.text(0, 0, '', textStyle(11, UI.textDim, '600')).setResolution(dpr);
      const empty = scene.add.text(0, 0, '', textStyle(12, UI.textDim, '600')).setOrigin(0.5).setAlign('center').setResolution(dpr);
      this.root.add([title, sub, empty]);
      return { id, box: { x: 0, y: 0, w: 0, h: 0 }, rows: [], scroll: 0, views: [], title, sub, empty };
    };
    this.panes = { loot: mkPane('loot'), inv: mkPane('inv') };
    for (let i = 0; i < 3; i++) {
      const b = new UiButton(scene, '', 104, 32, () => this.actions[i]?.run(), i === 0, dpr);
      this.buttons.push(b);
      this.root.add(b);
    }
    this.root.setDepth(DEPTH).setVisible(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  private get loot() {
    return this.s.session.openContainer;
  }

  toggle(): void {
    this.setOpen(!this.open);
  }

  setOpen(v: boolean): void {
    if (v === this.open) return;
    this.open = v;
    this.root.setVisible(v);
    this.selected = null;
    this.drag = null;
    this.panes.inv.scroll = 0;
    this.panes.loot.scroll = 0;
    this.offInventory?.();
    this.offInventory = null;
    if (v) {
      this.offInventory = this.s.session.inventory?.onChange(() => this.refresh()) ?? null;
      this.relayout();
    } else {
      this.onClose();
    }
  }

  /** Um recipiente foi aberto no mundo: mostra as duas colunas. */
  showContainer(): void {
    this.selected = null;
    this.panes.loot.scroll = 0;
    if (!this.open) this.setOpen(true);
    else this.relayout();
  }

  /** O recipiente saiu do alcance: volta a mostrar só o inventário (ou fecha, se abriu por causa dele). */
  hideContainer(): void {
    if (this.selected?.pane === 'loot') this.selected = null;
    this.relayout();
  }

  contains(x: number, y: number): boolean {
    const b = this.box;
    return this.open && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  layout(w: number, h: number, ins: { left: number; right: number; top: number; bottom: number }, k: number): void {
    this.cssW = w;
    this.cssH = h;
    this.ins = ins;
    this.k = k;
    this.relayout();
  }

  /**
   * Deitado: à direita, deixando livres os botões do canto e a coluna do
   * inventário (com recipiente aberto, ocupa a largura toda disponível).
   * Em pé: na parte de cima, acima dos controles.
   */
  private relayout(): void {
    const { cssW: w, cssH: h, ins, k } = this;
    if (!w || !h) return;
    const portrait = h > w;
    const two = !!this.loot;
    if (portrait) {
      const y = ins.top + 100 * k;
      this.box = { x: ins.left + 8, y, w: w - ins.left - ins.right - 16, h: Math.max(260 * k, h - ins.bottom - 360 * k - y) };
    } else {
      const right = w - ins.right - 118 * k;
      const width = two ? right - ins.left - 12 : Math.min(380 * k, right - ins.left - 12);
      this.box = { x: right - width, y: ins.top + 10, w: width, h: h - ins.top - ins.bottom - 20 };
    }
    const b = this.box;
    const foot = FOOT_H * k;
    this.foot = { x: b.x, y: b.y + b.h - foot, w: b.w, h: foot };
    const top = b.y + 30 * k;
    const listH = b.h - foot - 30 * k;
    if (!two) {
      this.panes.inv.box = { x: b.x, y: top, w: b.w, h: listH };
      this.panes.loot.box = { x: 0, y: 0, w: 0, h: 0 };
    } else if (portrait) {
      const half = listH / 2;
      this.panes.loot.box = { x: b.x, y: top, w: b.w, h: half };
      this.panes.inv.box = { x: b.x, y: top + half, w: b.w, h: half };
    } else {
      const half = b.w / 2;
      this.panes.loot.box = { x: b.x, y: top, w: half, h: listH };
      this.panes.inv.box = { x: b.x + half, y: top, w: half, h: listH };
    }
    this.refresh();
  }

  // ---------------------------------------------------------------- conteúdo

  private invRows(): Row[] {
    const inv = this.s.session.inventory;
    if (!inv) return [];
    const rows: Row[] = [];
    for (const c of inv.containers) {
      rows.push({ kind: 'header', container: c, title: c.id === BAG_ID ? `Mochila · ${c.name}` : c.name });
      c.stacks.forEach((_, index) => rows.push({ kind: 'stack', container: c, index }));
    }
    return rows;
  }

  private lootRows(): Row[] {
    const l = this.loot;
    return l ? l.container.stacks.map((_, index) => ({ kind: 'stack', container: l.container, index })) : [];
  }

  private rowHeight(r: Row): number {
    return (r.kind === 'header' ? HEAD_H : ROW_H) * this.k;
  }

  refresh(): void {
    if (!this.open) return;
    const k = this.k;
    const b = this.box;
    const g = this.bg;
    const inv = this.s.session.inventory;
    const loot = this.loot;
    // Seleção que deixou de existir (item pego/largado).
    const sel = this.selected;
    if (sel) {
      const c = sel.pane === 'loot' ? loot?.container : inv?.container(sel.containerId);
      if (!c || (sel.index >= 0 && !c.stacks[sel.index]) || (sel.index < 0 && sel.containerId !== BAG_ID) || (sel.index < 0 && !inv?.bag)) this.selected = null;
    }
    this.panes.loot.rows = this.lootRows();
    this.panes.inv.rows = this.invRows();

    g.clear();
    g.fillStyle(0x0e0f12, 0.95).fillRoundedRect(b.x, b.y, b.w, b.h, 12 * k);
    g.lineStyle(1.5, 0xffffff, 0.14).strokeRoundedRect(b.x, b.y, b.w, b.h, 12 * k);
    this.close.setPosition(b.x + b.w - 18 * k, b.y + 16 * k).setScale(k);

    // Colunas
    this.drawPane(this.panes.loot, !!loot, loot ? loot.name.toUpperCase() : '', loot ? `${formatKg(loot.container.weight)} de ${formatKg(loot.container.capacity)}` : '', loot?.container.weight ?? 0, loot?.container.capacity ?? 1, 'Vazio.');
    const invTitle = 'INVENTÁRIO';
    const invSub = inv ? `${formatKg(inv.weight)} de ${formatKg(inv.capacity)}` : '';
    this.drawPane(this.panes.inv, true, invTitle, invSub, inv?.weight ?? 0, inv?.capacity ?? 1, 'Nada nos bolsos.\nChegue perto de algo e toque em INTERAGIR.');
    if (loot) {
      const lb = this.panes.loot.box;
      g.lineStyle(1, 0xffffff, 0.1);
      if (this.cssH > this.cssW) g.lineBetween(b.x + PAD * k, lb.y + lb.h, b.x + b.w - PAD * k, lb.y + lb.h);
      else g.lineBetween(lb.x + lb.w, lb.y + 4 * k, lb.x + lb.w, lb.y + lb.h);
    }
    this.drawFooter();
  }

  private drawPane(p: Pane, visible: boolean, title: string, sub: string, weight: number, cap: number, emptyText: string): void {
    const k = this.k;
    const g = this.bg;
    const { x, y, w } = p.box;
    p.title.setVisible(visible);
    p.sub.setVisible(visible);
    for (const v of p.views) {
      v.icon.setVisible(false);
      v.name.setVisible(false);
      v.right.setVisible(false);
    }
    p.empty.setVisible(false);
    if (!visible) return;
    p.title.setText(title).setPosition(x + PAD * k, y - 22 * k).setScale(k);
    p.sub.setText(sub).setPosition(x + PAD * k, y - 4 * k).setScale(k);
    // barra de peso
    const bx = x + PAD * k;
    const by = y + 14 * k;
    const bw = w - PAD * 2 * k;
    const frac = Math.min(1, weight / Math.max(0.001, cap));
    g.fillStyle(0xffffff, 0.1).fillRoundedRect(bx, by, bw, 4 * k, 2 * k);
    if (frac > 0) g.fillStyle(frac > 0.9 ? UI.danger : UI.accentNum, 0.9).fillRoundedRect(bx, by, Math.max(4 * k, bw * frac), 4 * k, 2 * k);

    const listTop = y + 26 * k;
    const listH = p.box.h - 26 * k;
    const stacks = p.rows.filter((r) => r.kind === 'stack').length;
    if (!stacks && !(p.id === 'inv' && p.rows.length > 1)) {
      p.empty.setText(emptyText).setPosition(x + w / 2, listTop + listH / 2).setScale(k).setVisible(true).setWordWrapWidth((w - 20 * k) / k);
    }
    // rolagem limitada ao que cabe
    let total = 0;
    for (const r of p.rows) total += this.rowHeight(r);
    const maxScroll = Math.max(0, total - listH);
    p.scroll = Math.min(Math.max(0, p.scroll), maxScroll);

    let cy = listTop - p.scroll;
    let vi = 0;
    for (const r of p.rows) {
      const rh = this.rowHeight(r);
      const inside = cy >= listTop - 0.5 && cy + rh <= listTop + listH + 0.5;
      if (inside) {
        const v = p.views[vi] ?? this.makeRowView(p);
        vi++;
        this.drawRow(p, r, v, x, cy, w, rh);
      }
      cy += rh;
    }
    if (maxScroll > 0) {
      const thumbH = Math.max(18 * k, (listH * listH) / total);
      const ty = listTop + ((listH - thumbH) * p.scroll) / maxScroll;
      g.fillStyle(0xffffff, 0.25).fillRoundedRect(x + w - 5 * k, ty, 3 * k, thumbH, 1.5 * k);
    }
  }

  private makeRowView(p: Pane): RowView {
    const s = this.scene;
    const icon = s.add.image(0, 0, '__MISSING');
    const name = s.add.text(0, 0, '', textStyle(12, UI.text, '600')).setOrigin(0, 0.5).setResolution(this.dpr);
    const right = s.add.text(0, 0, '', textStyle(10, UI.textDim, '600')).setOrigin(1, 0.5).setResolution(this.dpr);
    this.root.add([icon, name, right]);
    for (const b of this.buttons) this.root.bringToTop(b);
    const v = { icon, name, right };
    p.views.push(v);
    return v;
  }

  private drawRow(p: Pane, r: Row, v: RowView, x: number, y: number, w: number, rh: number): void {
    const k = this.k;
    const g = this.bg;
    const sel = this.selected;
    if (r.kind === 'header') {
      const isBag = r.container.id === BAG_ID;
      const selected = sel?.pane === p.id && sel.index === -1 && isBag;
      if (selected) g.fillStyle(UI.accentNum, 0.22).fillRoundedRect(x + 6 * k, y + 1, w - 12 * k, rh - 2, 6 * k);
      v.name.setText(r.title.toUpperCase()).setColor(UI.textDim).setFontStyle('800').setPosition(x + PAD * k, y + rh / 2).setScale(k * 0.9).setVisible(true);
      v.right.setText(`${formatKg(r.container.weight)} / ${formatKg(r.container.capacity)}`).setPosition(x + w - PAD * k, y + rh / 2).setScale(k).setVisible(true);
      g.lineStyle(1, 0xffffff, 0.08).lineBetween(x + PAD * k, y + rh - 1, x + w - PAD * k, y + rh - 1);
      return;
    }
    const st = r.container.stacks[r.index]!;
    const def = itemDef(st.defId);
    if (!def) return;
    const selected = sel?.pane === p.id && sel.containerId === r.container.id && sel.index === r.index;
    if (selected) g.fillStyle(UI.accentNum, 0.22).fillRoundedRect(x + 6 * k, y + 2 * k, w - 12 * k, rh - 4 * k, 8 * k);
    // marca de condição à esquerda (só quando não está "ok")
    const tags = conditionTags(def, st.st, this.s.session.nowDays());
    const worst = worstTone(tags.map((t) => t.tone));
    if (worst === 'warn' || worst === 'bad') g.fillStyle(TONE_NUM[worst], 0.9).fillRoundedRect(x + 7 * k, y + 8 * k, 3 * k, rh - 16 * k, 1.5 * k);
    const ref = this.assets.ref(def.icon);
    v.icon.setTexture(ref.key, ref.frame).setDisplaySize(30 * k, 30 * k).setPosition(x + (PAD + 18) * k, y + rh / 2).setVisible(true);
    const nameColor = def.rarity === 'comum' ? UI.text : RARITY_INFO[def.rarity].color;
    const label = st.count > 1 ? `${def.name}  ×${st.count}` : def.name;
    v.name.setText(label).setColor(nameColor).setFontStyle('600').setPosition(x + (PAD + 38) * k, y + rh / 2).setScale(k).setVisible(true);
    const maxW = (w - (PAD + 38) * k - 58 * k) / k;
    fitText(v.name, label, maxW);
    v.right.setText(formatKg(st.count * def.weight)).setPosition(x + w - PAD * k, y + rh / 2).setScale(k).setVisible(true);
  }

  private drawFooter(): void {
    const k = this.k;
    const f = this.foot;
    const g = this.bg;
    g.lineStyle(1, 0xffffff, 0.1).lineBetween(f.x + PAD * k, f.y, f.x + f.w - PAD * k, f.y);
    const sel = this.selected;
    const inv = this.s.session.inventory;
    const loot = this.loot;
    this.actions = [];
    const tx = f.x + PAD * k;
    if (sel && sel.index === -1 && inv?.bag) {
      const def = itemDef(inv.bag.defId);
      this.detailName.setText(def?.name ?? 'Mochila').setColor(UI.text);
      this.detailTags.setText(`Capacidade ${formatKg(def?.bag?.capacity ?? 0)}`).setColor(TONE_COLOR.info);
      this.detailDesc.setText(def?.description ?? '');
      this.actions.push({ label: 'TIRAR MOCHILA', run: () => this.s.bus.emit('inventory:unequip', {}) });
    } else if (sel && sel.index >= 0) {
      const c = sel.pane === 'loot' ? loot?.container : inv?.container(sel.containerId);
      const st = c?.stacks[sel.index];
      const def = st ? itemDef(st.defId) : null;
      if (c && st && def) {
        const rar = RARITY_INFO[def.rarity];
        this.detailName.setText(`${def.name}${st.count > 1 ? ` ×${st.count}` : ''}`).setColor(def.rarity === 'comum' ? UI.text : rar.color);
        const tags = conditionTags(def, st.st, this.s.session.nowDays());
        const tone = worstTone(tags.map((t) => t.tone));
        const cond = tags.map((t) => t.text).join(' · ');
        this.detailTags
          .setText([CATEGORY_INFO[def.category].label, rar.label, formatKg(def.weight) + (st.count > 1 ? ' cada' : ''), cond].filter(Boolean).join(' · '))
          .setColor(TONE_COLOR[tone ?? 'info']);
        this.detailDesc.setText(def.description);
        if (sel.pane === 'loot') {
          this.actions.push({ label: 'PEGAR', run: () => this.s.bus.emit('loot:take', { index: sel.index }) });
          this.actions.push({ label: 'PEGAR TUDO', run: () => this.s.bus.emit('loot:take', { index: 0, all: true }) });
        } else {
          const use = useKind(def);
          if (use) this.actions.push({ label: USE_LABEL[use], run: () => this.s.bus.emit('inventory:use', { containerId: c.id, index: sel.index }) });
          if (loot) this.actions.push({ label: 'GUARDAR', run: () => this.s.bus.emit('loot:store', { containerId: c.id, index: sel.index }) });
          this.actions.push({ label: 'LARGAR', run: () => this.s.bus.emit('inventory:drop', { containerId: c.id, index: sel.index, count: st.count }) });
        }
      }
    } else {
      this.detailName.setText('');
      this.detailTags.setText('');
      const lootHas = !!loot && !loot.container.isEmpty;
      this.detailDesc.setText(lootHas ? 'Toque num item para ver o estado e as opções.' : loot ? 'Nada aqui. Guarde o que quiser deixar.' : 'Toque num item para ver o estado e as opções.');
      if (lootHas) this.actions.push({ label: 'PEGAR TUDO', run: () => this.s.bus.emit('loot:take', { index: 0, all: true }) });
    }
    this.detailName.setPosition(tx, f.y + 8 * k).setScale(k);
    this.detailTags.setPosition(tx, f.y + 26 * k).setScale(k);
    this.detailDesc.setPosition(tx, f.y + 42 * k).setScale(k).setWordWrapWidth((f.w - PAD * 2 * k) / k);
    fitText(this.detailDesc, this.detailDesc.text, (f.w - PAD * 2 * k) / k);
    const by = f.y + f.h - 22 * k;
    this.buttons.forEach((b, i) => {
      const a = this.actions[i];
      b.setVisible(!!a);
      if (!a) return;
      b.setLabel(a.label);
      b.setScale(k).setPosition(tx + (52 + i * 112) * k, by);
    });
  }

  /** Posição de um botão pela etiqueta (testes automáticos). */
  buttonAt(label: string): { x: number; y: number } | null {
    const i = this.actions.findIndex((a) => a.label === label);
    const b = i >= 0 ? this.buttons[i] : undefined;
    return b ? { x: b.x, y: b.y } : null;
  }

  /** Centro da linha de item `n` (0 = primeira pilha) de uma coluna (testes automáticos). */
  rowCenter(pane: PaneId, n: number): { x: number; y: number } | null {
    const p = this.panes[pane];
    const listTop = p.box.y + 26 * this.k;
    let y = listTop - p.scroll;
    let seen = 0;
    for (const r of p.rows) {
      const rh = this.rowHeight(r);
      if (r.kind === 'stack') {
        if (seen === n) return { x: p.box.x + p.box.w / 2, y: y + rh / 2 };
        seen++;
      }
      y += rh;
    }
    return null;
  }

  // ---------------------------------------------------------------- toque

  private paneAt(x: number, y: number): Pane | null {
    for (const p of [this.panes.loot, this.panes.inv]) {
      const b = p.box;
      if (b.w > 0 && x >= b.x && x <= b.x + b.w && y >= b.y + 26 * this.k && y <= b.y + b.h) return p;
    }
    return null;
  }

  pointerDown(id: number, x: number, y: number): void {
    if (!this.contains(x, y)) return;
    if (Math.hypot(x - this.close.x, y - this.close.y) < 22 * this.k) {
      this.setOpen(false);
      return;
    }
    const p = this.paneAt(x, y);
    if (p) this.drag = { id, pane: p.id, y, scroll: p.scroll, moved: false };
  }

  pointerMove(id: number, _x: number, y: number): void {
    const d = this.drag;
    if (!d || d.id !== id) return;
    const dy = y - d.y;
    if (Math.abs(dy) > 8 * this.k) d.moved = true;
    if (!d.moved) return;
    this.panes[d.pane].scroll = d.scroll - dy;
    this.refresh();
  }

  pointerUp(id: number, x: number, y: number): void {
    const d = this.drag;
    if (!d || d.id !== id) return;
    this.drag = null;
    if (d.moved || !this.contains(x, y)) return;
    const p = this.panes[d.pane];
    let cy = p.box.y + 26 * this.k - p.scroll;
    for (const r of p.rows) {
      const rh = this.rowHeight(r);
      if (y >= cy && y < cy + rh) {
        const next: Selection | null =
          r.kind === 'stack'
            ? { pane: p.id, containerId: r.container.id, index: r.index }
            : r.container.id === BAG_ID
              ? { pane: p.id, containerId: BAG_ID, index: -1 }
              : null;
        const same = next && this.selected && next.pane === this.selected.pane && next.containerId === this.selected.containerId && next.index === this.selected.index;
        this.selected = same ? null : next;
        this.refresh();
        return;
      }
      cy += rh;
    }
  }

  /** Roda do mouse (PC). */
  wheel(x: number, y: number, dy: number): void {
    const p = this.paneAt(x, y);
    if (!p) return;
    p.scroll += dy;
    this.refresh();
  }
}

function worstTone(tones: Tone[]): Tone | null {
  if (tones.includes('bad')) return 'bad';
  if (tones.includes('warn')) return 'warn';
  if (tones.includes('info')) return 'info';
  return tones.length ? 'ok' : null;
}

/** Corta o texto com "…" se passar da largura (em px antes da escala). */
function fitText(t: Phaser.GameObjects.Text, text: string, maxW: number): void {
  t.setText(text);
  // `width` do Text é o tamanho lógico (antes do setScale).
  if (t.width <= maxW || text.length < 4) return;
  let s = text;
  while (s.length > 3 && t.width > maxW) {
    s = s.slice(0, -1);
    t.setText(`${s}…`);
  }
}
