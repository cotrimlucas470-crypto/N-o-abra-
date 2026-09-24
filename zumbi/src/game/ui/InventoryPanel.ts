/**
 * Painel do sobrevivente (px CSS, no HUD). O jogo NÃO pausa com ele aberto.
 *
 * Abas: ITENS (inventário e saque), CORPO (estado físico, roupas, ferimentos)
 * e TEMPO (data, hora, clima, dormir). Etapas seguintes acrescentam abas
 * (FABRICAR, CONSTRUIR) pela mesma lista genérica (panel/ListView).
 *
 * ITENS: sem recipiente aberto, só o inventário (item na mão, bolsos,
 * mochila). Com um recipiente aberto, duas colunas — o recipiente e o
 * inventário — lado a lado (deitado) ou uma em cima da outra (em pé).
 * Tocar num item mostra nome, raridade, CONDIÇÃO, peso e as ações que fazem
 * sentido (ver interaction/ItemUse.ts). As ações viram eventos no EventBus;
 * quem mexe no mundo é a cena do jogo.
 */
import Phaser from 'phaser';
import type { AssetRegistry } from '../assets/AssetRegistry';
import type { GameServices } from '../core/Services';
import type { ItemWhere } from '../interaction/itemActions/types';
import { conditionTags, type Tone } from '../items/condition';
import { formatKg, itemDef } from '../items/ItemCatalog';
import type { ItemContainer } from '../items/ItemContainer';
import { CATEGORY_INFO, RARITY_INFO } from '../items/ItemTypes';
import { BAG_ID } from '../items/PlayerInventory';
import { ActionButtons, type PanelAction } from './panel/ActionButtons';
import { ListView, fit, type ListSource } from './panel/ListView';
import { BodyTab } from './tabs/BodyTab';
import { CraftTab } from './tabs/CraftTab';
import { HealthRows } from './tabs/HealthRows';
import { TimeTab } from './tabs/TimeTab';
import { UI, textStyle } from './theme';

const ROW_H = 40;
const HEAD_H = 22;
const PAD = 10;
const FOOT_H = 104;
const TAB_H = 34;
const DEPTH = 120;

const TONE_COLOR: Record<Tone, string> = { ok: '#9fd88a', info: '#c9c7bf', warn: '#f0b060', bad: '#f07a6a' };
const TONE_NUM: Record<Tone, number> = { ok: 0x7fc86a, info: 0x9a988f, warn: 0xe0a040, bad: 0xe0604a };

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type TabId = 'itens' | 'corpo' | 'tempo' | string;

type PaneId = 'loot' | 'inv';

/** Uma linha da lista: cabeçalho de recipiente, item na mão ou pilha. */
type Row = { kind: 'header'; container: ItemContainer; title: string } | { kind: 'hand' } | { kind: 'stack'; container: ItemContainer; index: number };

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
  loc: ItemWhere;
}

interface Tab {
  id: TabId;
  label: string;
  source: ListSource | null;
  text: Phaser.GameObjects.Text;
  x: number;
  w: number;
}

const sameLoc = (a: ItemWhere, b: ItemWhere) => JSON.stringify(a) === JSON.stringify(b);

export class InventoryPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly close: Phaser.GameObjects.Text;
  private readonly detailName: Phaser.GameObjects.Text;
  private readonly detailTags: Phaser.GameObjects.Text;
  private readonly detailDesc: Phaser.GameObjects.Text;
  private readonly buttons: ActionButtons;
  private readonly panes: Record<PaneId, Pane>;
  private readonly list: ListView;
  private readonly tabs: Tab[] = [];
  private tab: TabId = 'itens';
  readonly body: BodyTab;
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
  private liveTimer = 0;

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
    const say = (t: string) => {
      if (t) s.bus.emit('player:feedback', { text: t, tone: 'warn' });
    };
    this.buttons = new ActionButtons(scene, this.root, dpr, say, () => this.refresh());
    this.list = new ListView(scene, this.root, assets, dpr, say);
    this.body = new BodyTab(s, say);
    this.body.extensions.push(new HealthRows(s));
    this.addTab('itens', 'ITENS', null);
    this.addTab('fabricar', 'FABRICAR', new CraftTab(s));
    this.addTab('corpo', 'CORPO', this.body);
    this.addTab('tempo', 'TEMPO', new TimeTab(s));
    this.root.setDepth(DEPTH).setVisible(false);
  }

  /** Aba nova (fabricar, construir...). */
  addTab(id: TabId, label: string, source: ListSource | null): void {
    const text = this.scene.add.text(0, 0, label, textStyle(12, UI.textDim, '800')).setOrigin(0.5).setResolution(this.dpr).setLetterSpacing(1);
    this.root.add(text);
    this.tabs.push({ id, label, source, text, x: 0, w: 0 });
    if (this.open) this.relayout();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Caixa do painel na tela (para outros elementos do HUD desviarem). */
  get bounds(): Readonly<Box> {
    return this.box;
  }

  get currentTab(): TabId {
    return this.tab;
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

  setTab(id: TabId): void {
    if (!this.tabs.some((t) => t.id === id)) return;
    this.tab = id;
    this.selected = null;
    const t = this.tabs.find((x) => x.id === id)!;
    if (t.source) this.list.setSource(t.source);
    this.relayout();
  }

  /** Um recipiente foi aberto no mundo: mostra as duas colunas na aba ITENS. */
  showContainer(): void {
    this.selected = null;
    this.panes.loot.scroll = 0;
    this.tab = 'itens';
    if (!this.open) this.setOpen(true);
    else this.relayout();
  }

  /** O recipiente saiu do alcance: volta a mostrar só o inventário. */
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

  /** Atualiza sozinho o que muda com o tempo (barras do corpo, relógio). */
  tick(dt: number): void {
    if (!this.open || this.tab === 'itens') return;
    this.liveTimer -= dt;
    if (this.liveTimer > 0) return;
    this.liveTimer = 0.5;
    this.list.refresh();
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
    const two = this.tab === 'itens' && !!this.loot;
    if (portrait) {
      const y = ins.top + 100 * k;
      this.box = { x: ins.left + 8, y, w: w - ins.left - ins.right - 16, h: Math.max(280 * k, h - ins.bottom - 360 * k - y) };
    } else {
      const right = w - ins.right - 118 * k;
      const width = two ? right - ins.left - 12 : Math.min(400 * k, right - ins.left - 12);
      this.box = { x: right - width, y: ins.top + 10, w: width, h: h - ins.top - ins.bottom - 20 };
    }
    const b = this.box;
    const foot = FOOT_H * k;
    this.foot = { x: b.x, y: b.y + b.h - foot, w: b.w, h: foot };
    const top = b.y + (30 + TAB_H) * k;
    const listH = b.h - foot - (30 + TAB_H) * k;
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
    this.list.setBox({ x: b.x, y: b.y + (TAB_H + 6) * k, w: b.w, h: b.h - (TAB_H + 6) * k }, k);
    this.refresh();
  }

  // ---------------------------------------------------------------- conteúdo

  private invRows(): Row[] {
    const inv = this.s.session.inventory;
    if (!inv) return [];
    const rows: Row[] = [];
    if (inv.hand) rows.push({ kind: 'hand' });
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
    g.clear();
    g.fillStyle(0x0e0f12, 0.95).fillRoundedRect(b.x, b.y, b.w, b.h, 12 * k);
    g.lineStyle(1.5, 0xffffff, 0.14).strokeRoundedRect(b.x, b.y, b.w, b.h, 12 * k);
    this.close.setPosition(b.x + b.w - 18 * k, b.y + 18 * k).setScale(k);
    this.drawTabs();

    const items = this.tab === 'itens';
    this.list.setVisible(!items);
    for (const p of [this.panes.loot, this.panes.inv]) {
      if (!items) {
        p.title.setVisible(false);
        p.sub.setVisible(false);
        p.empty.setVisible(false);
        for (const v of p.views) {
          v.icon.setVisible(false);
          v.name.setVisible(false);
          v.right.setVisible(false);
        }
      }
    }
    if (!items) {
      this.detailName.setVisible(false);
      this.detailTags.setVisible(false);
      this.detailDesc.setVisible(false);
      this.buttons.hide();
      const t = this.tabs.find((x) => x.id === this.tab);
      if (t?.source) this.list.setSource(t.source);
      this.list.refresh();
      return;
    }
    this.detailName.setVisible(true);
    this.detailTags.setVisible(true);
    this.detailDesc.setVisible(true);

    const inv = this.s.session.inventory;
    const loot = this.loot;
    // Seleção que deixou de existir (item pego/largado).
    const sel = this.selected;
    if (sel) {
      const ctx = this.s.session.itemUse?.context(sel.loc);
      if (!ctx || (sel.pane === 'loot' && !loot)) this.selected = null;
    }
    this.panes.loot.rows = this.lootRows();
    this.panes.inv.rows = this.invRows();

    this.drawPane(this.panes.loot, !!loot, loot ? loot.name.toUpperCase() : '', loot ? `${formatKg(loot.container.weight)} de ${formatKg(loot.container.capacity)}` : '', loot?.container.weight ?? 0, loot?.container.capacity ?? 1, 'Vazio.');
    const invSub = inv ? `${formatKg(inv.weight)} de ${formatKg(inv.capacity)}` : '';
    this.drawPane(this.panes.inv, true, 'INVENTÁRIO', invSub, inv?.effectiveLoad ?? 0, inv?.capacity ?? 1, 'Nada nos bolsos.\nChegue perto de algo e toque em INTERAGIR.');
    if (loot) {
      const lb = this.panes.loot.box;
      g.lineStyle(1, 0xffffff, 0.1);
      if (this.cssH > this.cssW) g.lineBetween(b.x + PAD * k, lb.y + lb.h, b.x + b.w - PAD * k, lb.y + lb.h);
      else g.lineBetween(lb.x + lb.w, lb.y + 4 * k, lb.x + lb.w, lb.y + lb.h);
    }
    this.drawFooter();
  }

  private drawTabs(): void {
    const k = this.k;
    const b = this.box;
    const g = this.bg;
    const y = b.y + 6 * k;
    const h = (TAB_H - 8) * k;
    let x = b.x + PAD * k;
    const w = Math.min(96 * k, (b.w - PAD * 2 * k - 40 * k) / this.tabs.length - 6 * k);
    for (const t of this.tabs) {
      const active = t.id === this.tab;
      t.x = x;
      t.w = w;
      g.fillStyle(active ? UI.accentNum : 0xffffff, active ? 0.95 : 0.06).fillRoundedRect(x, y, w, h, 8 * k);
      t.text.setText(t.label).setColor(active ? '#16171a' : UI.textDim).setPosition(x + w / 2, y + h / 2).setScale(k);
      // Aba estreita (retrato): o rótulo encolhe para caber.
      const fitK = (w - 10 * k) / Math.max(1, t.text.width);
      if (fitK < k) t.text.setScale(fitK);
      x += w + 6 * k;
    }
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
    // barra de peso (peso sentido: a mochila alivia)
    const bx = x + PAD * k;
    const by = y + 14 * k;
    const bw = w - PAD * 2 * k;
    const frac = Math.min(1, weight / Math.max(0.001, cap));
    g.fillStyle(0xffffff, 0.1).fillRoundedRect(bx, by, bw, 4 * k, 2 * k);
    if (frac > 0) g.fillStyle(frac > 0.9 ? UI.danger : UI.accentNum, 0.9).fillRoundedRect(bx, by, Math.max(4 * k, bw * frac), 4 * k, 2 * k);

    const listTop = y + 26 * k;
    const listH = p.box.h - 26 * k;
    const stacks = p.rows.filter((r) => r.kind !== 'header').length;
    if (!stacks && !(p.id === 'inv' && p.rows.length > 1)) {
      p.empty.setText(emptyText).setPosition(x + w / 2, listTop + listH / 2).setScale(k).setVisible(true).setWordWrapWidth((w - 20 * k) / k);
    }
    let total = 0;
    for (const r of p.rows) total += this.rowHeight(r);
    const maxScroll = Math.max(0, total - listH);
    p.scroll = Math.min(Math.max(0, p.scroll), maxScroll);

    let cy = listTop - p.scroll;
    let vi = 0;
    for (const r of p.rows) {
      const rh = this.rowHeight(r);
      if (cy >= listTop - 0.5 && cy + rh <= listTop + listH + 0.5) {
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
    this.buttons.bringToTop(this.root);
    const v = { icon, name, right };
    p.views.push(v);
    return v;
  }

  private rowLoc(p: PaneId, r: Row): ItemWhere | null {
    if (r.kind === 'hand') return { where: 'hand' };
    if (r.kind === 'stack') return p === 'loot' ? { where: 'loot', index: r.index } : { where: 'inv', containerId: r.container.id, index: r.index };
    return r.container.id === BAG_ID ? { where: 'bag' } : null;
  }

  private drawRow(p: Pane, r: Row, v: RowView, x: number, y: number, w: number, rh: number): void {
    const k = this.k;
    const g = this.bg;
    const loc = this.rowLoc(p.id, r);
    const selected = !!loc && !!this.selected && this.selected.pane === p.id && sameLoc(this.selected.loc, loc);
    if (r.kind === 'header') {
      if (selected) g.fillStyle(UI.accentNum, 0.22).fillRoundedRect(x + 6 * k, y + 1, w - 12 * k, rh - 2, 6 * k);
      v.name.setText(r.title.toUpperCase()).setColor(UI.textDim).setFontStyle('800').setPosition(x + PAD * k, y + rh / 2).setScale(k * 0.9).setVisible(true);
      v.right.setText(`${formatKg(r.container.weight)} / ${formatKg(r.container.capacity)}`).setPosition(x + w - PAD * k, y + rh / 2).setScale(k).setVisible(true);
      g.lineStyle(1, 0xffffff, 0.08).lineBetween(x + PAD * k, y + rh - 1, x + w - PAD * k, y + rh - 1);
      return;
    }
    const inv = this.s.session.inventory;
    const st = r.kind === 'hand' ? inv?.hand : r.container.stacks[r.index];
    const def = st ? itemDef(st.defId) : null;
    if (!st || !def) return;
    const count = r.kind === 'stack' ? r.container.stacks[r.index]!.count : 1;
    if (selected) g.fillStyle(UI.accentNum, 0.22).fillRoundedRect(x + 6 * k, y + 2 * k, w - 12 * k, rh - 4 * k, 8 * k);
    else if (r.kind === 'hand') g.fillStyle(0xffffff, 0.05).fillRoundedRect(x + 6 * k, y + 2 * k, w - 12 * k, rh - 4 * k, 8 * k);
    const tags = conditionTags(def, st.st, this.s.session.nowDays());
    const worst = worstTone(tags.map((t) => t.tone));
    if (worst === 'warn' || worst === 'bad') g.fillStyle(TONE_NUM[worst], 0.9).fillRoundedRect(x + 7 * k, y + 8 * k, 3 * k, rh - 16 * k, 1.5 * k);
    const ref = this.assets.ref(def.icon);
    v.icon.setTexture(ref.key, ref.frame).setDisplaySize(30 * k, 30 * k).setPosition(x + (PAD + 18) * k, y + rh / 2).setVisible(true);
    const nameColor = def.rarity === 'comum' ? UI.text : RARITY_INFO[def.rarity].color;
    const label = r.kind === 'hand' ? `✋ ${def.name}` : count > 1 ? `${def.name}  ×${count}` : def.name;
    v.name.setText(label).setColor(nameColor).setFontStyle('600').setPosition(x + (PAD + 38) * k, y + rh / 2).setScale(k).setVisible(true);
    fit(v.name, label, (w - (PAD + 38) * k - 58 * k) / k);
    v.right.setText(r.kind === 'hand' ? 'na mão' : formatKg(count * def.weight)).setPosition(x + w - PAD * k, y + rh / 2).setScale(k).setVisible(true);
  }

  private actionsFor(loc: ItemWhere): PanelAction[] {
    const use = this.s.session.itemUse;
    if (!use) return [];
    return use.actionsFor(loc).map((a) => ({
      label: a.label,
      enabled: a.enabled,
      ...(a.reason ? { reason: a.reason } : {}),
      run: () => this.s.bus.emit('item:action', { loc, action: a.id }),
    }));
  }

  private drawFooter(): void {
    const k = this.k;
    const f = this.foot;
    const g = this.bg;
    g.lineStyle(1, 0xffffff, 0.1).lineBetween(f.x + PAD * k, f.y, f.x + f.w - PAD * k, f.y);
    const sel = this.selected;
    const loot = this.loot;
    let actions: PanelAction[] = [];
    const tx = f.x + PAD * k;
    const ctx = sel ? this.s.session.itemUse?.context(sel.loc) : null;
    if (sel && ctx) {
      const def = ctx.def;
      const rar = RARITY_INFO[def.rarity];
      this.detailName.setText(`${def.name}${ctx.count > 1 ? ` ×${ctx.count}` : ''}`).setColor(def.rarity === 'comum' ? UI.text : rar.color);
      const tags = conditionTags(def, ctx.st, this.s.session.nowDays());
      const tone = worstTone(tags.map((t) => t.tone));
      const extra = sel.loc.where === 'bag' ? `leva ${formatKg(def.bag?.capacity ?? 0)}` : '';
      this.detailTags
        .setText([CATEGORY_INFO[def.category].label, rar.label, formatKg(def.weight) + (ctx.count > 1 ? ' cada' : ''), extra, tags.map((t) => t.text).join(' · ')].filter(Boolean).join(' · '))
        .setColor(TONE_COLOR[tone ?? 'info']);
      this.detailDesc.setText(def.description);
      actions = this.actionsFor(sel.loc);
      if (sel.pane === 'loot' && loot && !loot.container.isEmpty) actions.push({ label: 'PEGAR TUDO', run: () => this.s.bus.emit('loot:take', { index: 0, all: true }) });
    } else {
      this.detailName.setText('');
      this.detailTags.setText('');
      const lootHas = !!loot && !loot.container.isEmpty;
      this.detailDesc.setText(lootHas ? 'Toque num item para ver o estado e as opções.' : loot ? 'Nada aqui. Guarde o que quiser deixar.' : 'Toque num item para ver o estado e as opções.');
      if (lootHas) actions.push({ label: 'PEGAR TUDO', run: () => this.s.bus.emit('loot:take', { index: 0, all: true }) });
    }
    this.detailName.setPosition(tx, f.y + 8 * k).setScale(k);
    this.detailTags.setPosition(tx, f.y + 26 * k).setScale(k);
    fit(this.detailTags, this.detailTags.text, (f.w - PAD * 2 * k) / k);
    this.detailDesc.setPosition(tx, f.y + 42 * k).setScale(k).setWordWrapWidth((f.w - PAD * 2 * k) / k);
    fit(this.detailDesc, this.detailDesc.text, (f.w - PAD * 2 * k) / k);
    this.buttons.layout(actions, tx, f.y + f.h - 22 * k, f.w - PAD * 2 * k, k);
  }

  /** Posição de um botão pela etiqueta (testes automáticos). */
  buttonAt(label: string): { x: number; y: number } | null {
    return this.tab === 'itens' ? this.buttons.buttonAt(label) : this.list.buttonAt(label);
  }

  /** Centro de uma aba (testes automáticos). */
  tabCenter(id: TabId): { x: number; y: number } | null {
    const t = this.tabs.find((x) => x.id === id);
    return t ? { x: t.x + t.w / 2, y: this.box.y + (6 + (TAB_H - 8) / 2) * this.k } : null;
  }

  /** Centro da linha com id numa aba de lista (testes automáticos). */
  listRowCenter(id: string): { x: number; y: number } | null {
    return this.list.rowCenter(id);
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
    const k = this.k;
    if (y >= this.box.y + 4 * k && y <= this.box.y + TAB_H * k) {
      for (const t of this.tabs) {
        if (x >= t.x && x <= t.x + t.w) {
          if (t.id !== this.tab) this.setTab(t.id);
          return;
        }
      }
    }
    if (this.tab !== 'itens') {
      this.list.pointerDown(id, x, y);
      return;
    }
    const p = this.paneAt(x, y);
    if (p) this.drag = { id, pane: p.id, y, scroll: p.scroll, moved: false };
  }

  pointerMove(id: number, _x: number, y: number): void {
    if (this.tab !== 'itens') {
      this.list.pointerMove(id, y);
      return;
    }
    const d = this.drag;
    if (!d || d.id !== id) return;
    const dy = y - d.y;
    if (Math.abs(dy) > 8 * this.k) d.moved = true;
    if (!d.moved) return;
    this.panes[d.pane].scroll = d.scroll - dy;
    this.refresh();
  }

  pointerUp(id: number, x: number, y: number): void {
    if (this.tab !== 'itens') {
      this.list.pointerUp(id, x, y);
      return;
    }
    const d = this.drag;
    if (!d || d.id !== id) return;
    this.drag = null;
    if (d.moved || !this.contains(x, y)) return;
    const p = this.panes[d.pane];
    let cy = p.box.y + 26 * this.k - p.scroll;
    for (const r of p.rows) {
      const rh = this.rowHeight(r);
      if (y >= cy && y < cy + rh) {
        const loc = this.rowLoc(p.id, r);
        const next: Selection | null = loc ? { pane: p.id, loc } : null;
        const same = next && this.selected && next.pane === this.selected.pane && sameLoc(next.loc, this.selected.loc);
        this.selected = same ? null : next;
        this.refresh();
        return;
      }
      cy += rh;
    }
  }

  /** Roda do mouse (PC). */
  wheel(x: number, y: number, dy: number): void {
    if (this.tab !== 'itens') {
      this.list.wheel(x, y, dy);
      return;
    }
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
