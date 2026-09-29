/**
 * FICHA DO PERSONAGEM (tela cheia): o boneco no centro com os ferimentos
 * marcados, os espaços de equipamento em volta (tocar mostra o que o item
 * faz) e todos os estados do corpo em barras. Os dados vêm de
 * survival/CharacterSheet (puro); aqui só desenho e toque.
 */
import Phaser from 'phaser';
import type { AssetRegistry } from '../assets/AssetRegistry';
import type { GameServices } from '../core/Services';
import type { BodyPart } from '../health/Wounds';
import { sheetSlots, sheetStats, sheetWounds, type SheetSlot, type SheetSlotId, type SheetStat, type SheetTone } from '../survival/CharacterSheet';
import { UI, textStyle } from './theme';

const TONE: Record<SheetTone, number> = { ok: 0x6fbf73, info: 0x8fb3d9, warn: 0xe0a84a, bad: 0xd0453a };
const TONE_TXT: Record<SheetTone, string> = { ok: '#9fd8a2', info: '#b8cde6', warn: '#e8c07a', bad: '#f0877e' };

/** Coluna da esquerda e da direita do boneco (ordem de cima para baixo). */
const LEFT: readonly SheetSlotId[] = ['cabeca', 'pescoco', 'tronco', 'maos', 'pernas', 'acessorios'];
const RIGHT: readonly SheetSlotId[] = ['rosto', 'mochila', 'tronco-externo', 'mao', 'coldre', 'pes'];
/** Onde cada espaço aponta no boneco (fração da altura do boneco). */
const ANCHOR: Record<SheetSlotId, number> = { cabeca: 0.08, rosto: 0.1, pescoco: 0.2, tronco: 0.33, 'tronco-externo': 0.36, mochila: 0.3, maos: 0.52, mao: 0.52, coldre: 0.55, pernas: 0.72, pes: 0.95, acessorios: 0.45 };

interface SlotView {
  id: SheetSlotId;
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  x: number;
  y: number;
  s: number;
}

export class CharacterScreen {
  private readonly root: Phaser.GameObjects.Container;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly close: Phaser.GameObjects.Text;
  private readonly cardTitle: Phaser.GameObjects.Text;
  private readonly cardBody: Phaser.GameObjects.Text;
  private readonly slots: SlotView[] = [];
  private readonly statLabels: Phaser.GameObjects.Text[] = [];
  private readonly statTexts: Phaser.GameObjects.Text[] = [];
  private selected: SheetSlotId | null = null;
  private timer = 0;
  private k = 1;
  private panel = { x: 0, y: 0, w: 0, h: 0 };
  private doll = { x: 0, y: 0, w: 0, h: 0 };
  private stats = { x: 0, y: 0, w: 0, h: 0 };
  private card = { x: 0, y: 0, w: 0, h: 0 };

  constructor(
    scene: Phaser.Scene,
    private readonly s: GameServices,
    private readonly assets: AssetRegistry,
    dpr: number,
  ) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, 0x06070a, 0.72).setOrigin(0, 0).setInteractive();
    this.dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (p: Phaser.Input.Pointer) => {
      const cam = scene.cameras.main;
      const x = p.x / cam.zoom;
      const y = p.y / cam.zoom;
      const b = this.panel;
      if (x < b.x || y < b.y || x > b.x + b.w || y > b.y + b.h) this.hide();
    });
    this.g = scene.add.graphics();
    this.title = scene.add.text(0, 0, 'FICHA DO PERSONAGEM', textStyle(15, UI.text, '800')).setResolution(dpr).setLetterSpacing(1);
    this.close = scene.add.text(0, 0, '✕', textStyle(20, UI.text, '700')).setOrigin(0.5).setResolution(dpr).setInteractive({ useHandCursor: true });
    this.close.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.hide());
    this.cardTitle = scene.add.text(0, 0, '', textStyle(13, UI.text, '800')).setResolution(dpr);
    this.cardBody = scene.add.text(0, 0, '', textStyle(11, UI.textDim, '600')).setResolution(dpr).setLineSpacing(3);
    const items: Phaser.GameObjects.GameObject[] = [this.dim, this.g, this.title, this.close, this.cardTitle, this.cardBody];
    for (const id of [...LEFT, ...RIGHT]) {
      const icon = scene.add.image(0, 0, '__MISSING').setVisible(false);
      const label = scene.add.text(0, 0, '', textStyle(9, UI.textDim, '700')).setOrigin(0.5, 0).setResolution(dpr);
      const zone = scene.add.zone(0, 0, 10, 10).setInteractive({ useHandCursor: true });
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        this.selected = this.selected === id ? null : id;
        this.refresh();
      });
      this.slots.push({ id, icon, label, zone, x: 0, y: 0, s: 0 });
      items.push(icon, label, zone);
    }
    for (let i = 0; i < 16; i++) {
      const a = scene.add.text(0, 0, '', textStyle(10, UI.textDim, '700')).setResolution(dpr);
      const b = scene.add.text(0, 0, '', textStyle(10, UI.text, '700')).setOrigin(1, 0).setResolution(dpr);
      this.statLabels.push(a);
      this.statTexts.push(b);
      items.push(a, b);
    }
    this.root = scene.add.container(0, 0, items).setDepth(168).setVisible(false);
  }

  get isOpen(): boolean {
    return this.root.visible;
  }

  show(w: number, h: number, k: number): void {
    this.root.setVisible(true);
    this.selected = null;
    this.layout(w, h, k);
  }

  hide(): void {
    this.root.setVisible(false);
  }

  tick(dt: number): void {
    if (!this.isOpen) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.5;
    this.refresh();
  }

  layout(w: number, h: number, k: number): void {
    this.k = k;
    if (!this.isOpen) return;
    const pad = 8;
    this.panel = { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 };
    const p = this.panel;
    const head = 34 * k;
    const landscape = w > h;
    if (landscape) {
      const dw = Math.min(p.w * 0.5, (p.h - head) * 1.25);
      this.doll = { x: p.x + 10 * k, y: p.y + head, w: dw, h: p.h - head - 10 * k };
      const rx = this.doll.x + dw + 12 * k;
      const rw = p.x + p.w - rx - 12 * k;
      const cardH = Math.max(90 * k, (p.h - head) * 0.36);
      this.card = { x: rx, y: p.y + head, w: rw, h: cardH };
      this.stats = { x: rx, y: this.card.y + cardH + 6 * k, w: rw, h: p.y + p.h - (this.card.y + cardH + 6 * k) - 10 * k };
    } else {
      const dh = Math.min(p.h * 0.46, p.w * 1.05);
      this.doll = { x: p.x + 10 * k, y: p.y + head, w: p.w - 20 * k, h: dh };
      const cy = this.doll.y + dh + 6 * k;
      this.card = { x: p.x + 12 * k, y: cy, w: p.w - 24 * k, h: 110 * k };
      this.stats = { x: p.x + 12 * k, y: cy + 116 * k, w: p.w - 24 * k, h: p.y + p.h - (cy + 116 * k) - 10 * k };
    }
    this.dim.setSize(w, h);
    this.title.setPosition(p.x + 14 * k, p.y + 10 * k).setScale(k);
    this.close.setPosition(p.x + p.w - 20 * k, p.y + 18 * k).setScale(k);
    // Espaços: duas colunas encostadas no boneco.
    const d = this.doll;
    const rows = 6;
    const size = Math.min(54 * k, (d.h - 8 * k) / rows - 14 * k);
    const step = (d.h - size) / (rows - 1) - 0.0001;
    this.slots.forEach((v) => {
      const left = LEFT.indexOf(v.id);
      const i = left >= 0 ? left : RIGHT.indexOf(v.id);
      v.s = size;
      v.x = left >= 0 ? d.x + size / 2 + 2 * k : d.x + d.w - size / 2 - 2 * k;
      v.y = d.y + size / 2 + i * Math.max(size + 12 * k, Math.min(step, size + 30 * k));
      v.zone.setPosition(v.x, v.y).setSize(size, size);
      if (v.zone.input?.hitArea instanceof Phaser.Geom.Rectangle) v.zone.input.hitArea.setTo(0, 0, size, size);
      v.label.setPosition(v.x, v.y + size / 2 + 1 * k).setScale(k);
    });
    this.timer = 0;
    this.refresh();
  }

  private refresh(): void {
    const inv = this.s.session.inventory;
    const sv = this.s.session.survival;
    const vital = this.s.session.stats;
    if (!inv || !sv || !vital) return;
    const k = this.k;
    const now = this.s.session.nowDays();
    const slots = sheetSlots(inv, now);
    const byId = new Map(slots.map((x) => [x.id, x]));
    const g = this.g.clear();
    const p = this.panel;
    g.fillStyle(0x0e0f12, 0.97).fillRoundedRect(p.x, p.y, p.w, p.h, 14 * k);
    g.lineStyle(1.5, 0xffffff, 0.14).strokeRoundedRect(p.x, p.y, p.w, p.h, 14 * k);
    this.drawDoll(g, sv.survivor.health.wounds.map((w) => ({ part: w.part, bleed: w.bleed, bandaged: !!w.bandage })));
    // Espaços
    for (const v of this.slots) {
      const sl = byId.get(v.id)!;
      const sel = this.selected === v.id;
      const half = v.s / 2;
      g.fillStyle(sel ? 0x2a3140 : 0x191b20, 1).fillRoundedRect(v.x - half, v.y - half, v.s, v.s, 8 * k);
      g.lineStyle(sel ? 2 : 1, sel ? UI.accentNum : 0xffffff, sel ? 0.95 : 0.14).strokeRoundedRect(v.x - half, v.y - half, v.s, v.s, 8 * k);
      // Linha fina até a parte do corpo (quando tem algo).
      if (sl.def) {
        const ax = this.doll.x + this.doll.w / 2;
        const ay = this.doll.y + this.doll.h * ANCHOR[v.id];
        g.lineStyle(1, 0xffffff, sel ? 0.4 : 0.1).lineBetween(v.x + (v.x < ax ? half : -half), v.y, ax + (v.x < ax ? -18 : 18) * k, ay);
        const ref = this.assets.ref(sl.def.icon);
        v.icon.setTexture(ref.key, ref.frame).setDisplaySize(v.s * 0.72, v.s * 0.72).setPosition(v.x, v.y).setVisible(true);
        if (sl.extras.length) g.fillStyle(UI.accentNum, 1).fillCircle(v.x + half - 6 * k, v.y - half + 6 * k, 4 * k);
      } else v.icon.setVisible(false);
      v.label.setText(sl.label).setColor(sel ? UI.accent : UI.textDim);
    }
    this.drawCard(g, this.selected ? byId.get(this.selected)! : null, sv.survivor.health);
    this.drawStats(g, sheetStats(sv.survivor.body, sv.survivor.health, vital, { kg: inv.effectiveLoad, cap: inv.capacity }));
  }

  /** Silhueta com as partes feridas em vermelho (atadura: laranja). */
  private drawDoll(g: Phaser.GameObjects.Graphics, wounds: { part: BodyPart; bleed: number; bandaged: boolean }[]): void {
    const d = this.doll;
    const k = this.k;
    const cx = d.x + d.w / 2;
    const H = d.h;
    const u = Math.min(H / 9, (d.w - 150 * k) / 4.2);
    const top = d.y + H * 0.02;
    const color = (parts: BodyPart[]) => {
      const ws = wounds.filter((w) => parts.includes(w.part));
      if (!ws.length) return 0x3a3f4a;
      return ws.some((w) => w.bleed > 0.3 && !w.bandaged) ? 0xc0463f : ws.some((w) => w.bandaged) ? 0xc98a3a : 0x9a5a52;
    };
    // Cabeça, pescoço, tronco, braços, mãos, pernas, pés (proporções de adulto).
    g.fillStyle(color(['cabeca']), 1).fillCircle(cx, top + u * 0.75, u * 0.62);
    g.fillStyle(color(['pescoco']), 1).fillRect(cx - u * 0.22, top + u * 1.3, u * 0.44, u * 0.4);
    g.fillStyle(color(['tronco']), 1).fillRoundedRect(cx - u * 0.9, top + u * 1.65, u * 1.8, u * 2.7, u * 0.3);
    g.fillStyle(color(['bracoE']), 1).fillRoundedRect(cx - u * 1.45, top + u * 1.75, u * 0.48, u * 2.4, u * 0.2);
    g.fillStyle(color(['bracoD']), 1).fillRoundedRect(cx + u * 0.97, top + u * 1.75, u * 0.48, u * 2.4, u * 0.2);
    g.fillStyle(color(['maoE']), 1).fillCircle(cx - u * 1.21, top + u * 4.35, u * 0.3);
    g.fillStyle(color(['maoD']), 1).fillCircle(cx + u * 1.21, top + u * 4.35, u * 0.3);
    g.fillStyle(color(['pernaE']), 1).fillRoundedRect(cx - u * 0.82, top + u * 4.4, u * 0.72, u * 3.4, u * 0.25);
    g.fillStyle(color(['pernaD']), 1).fillRoundedRect(cx + u * 0.1, top + u * 4.4, u * 0.72, u * 3.4, u * 0.25);
    g.fillStyle(color(['peE']), 1).fillRoundedRect(cx - u * 0.95, top + u * 7.8, u * 0.85, u * 0.45, u * 0.15);
    g.fillStyle(color(['peD']), 1).fillRoundedRect(cx + u * 0.1, top + u * 7.8, u * 0.85, u * 0.45, u * 0.15);
    g.lineStyle(1, 0xffffff, 0.08).strokeRoundedRect(cx - u * 0.9, top + u * 1.65, u * 1.8, u * 2.7, u * 0.3);
  }

  private drawCard(g: Phaser.GameObjects.Graphics, sl: SheetSlot | null, health: import('../health/Health').Health): void {
    const c = this.card;
    const k = this.k;
    g.fillStyle(0x15171b, 1).fillRoundedRect(c.x, c.y, c.w, c.h, 10 * k);
    this.cardTitle.setPosition(c.x + 10 * k, c.y + 8 * k).setScale(k);
    this.cardBody.setPosition(c.x + 10 * k, c.y + 28 * k).setScale(k).setWordWrapWidth((c.w - 20 * k) / k);
    if (!sl) {
      const ws = sheetWounds(health);
      this.cardTitle.setText(ws.length ? 'FERIMENTOS' : 'EQUIPAMENTO').setColor(UI.text);
      this.cardBody.setText(ws.length ? ws.map((w) => `• ${w.text}`).join('\n') : 'Nenhum ferimento. Toque num espaço do boneco para ver o que o item protege, esquenta, pesa e o estado dele.').setColor(ws.some((w) => w.tone === 'bad') ? TONE_TXT.bad : UI.textDim);
      return;
    }
    if (!sl.def) {
      this.cardTitle.setText(`${sl.label.toUpperCase()} · vazio`).setColor(UI.textDim);
      this.cardBody.setText('Nada aqui. Vista ou equipe pelo painel de itens.').setColor(UI.textDim);
      return;
    }
    this.cardTitle.setText(`${sl.label.toUpperCase()} · ${sl.def.name}`).setColor(UI.text);
    const extra = sl.extras.length ? [`Acessórios: ${sl.extras.join(', ')}`] : [];
    this.cardBody.setText([...sl.lines, ...extra].join('\n')).setColor(UI.textDim);
  }

  private drawStats(g: Phaser.GameObjects.Graphics, list: SheetStat[]): void {
    const b = this.stats;
    const k = this.k;
    const cols = b.w > 360 * k ? 2 : 1;
    const colW = (b.w - (cols - 1) * 10 * k) / cols;
    const rowH = Math.max(22 * k, Math.min(30 * k, (b.h / Math.ceil(list.length / cols)) - 1));
    this.statLabels.forEach((t, i) => {
      const st = list[i];
      const v = this.statTexts[i]!;
      if (!st) {
        t.setVisible(false);
        v.setVisible(false);
        return;
      }
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = b.x + col * (colW + 10 * k);
      const y = b.y + row * rowH;
      if (y + rowH > b.y + b.h + 2) {
        t.setVisible(false);
        v.setVisible(false);
        return;
      }
      t.setText(st.label).setPosition(x, y).setScale(k).setVisible(true);
      v.setText(st.text).setPosition(x + colW, y).setScale(k).setColor(TONE_TXT[st.tone]).setVisible(true);
      const by = y + 14 * k;
      g.fillStyle(0xffffff, 0.08).fillRoundedRect(x, by, colW, 5 * k, 2 * k);
      g.fillStyle(TONE[st.tone], 0.9).fillRoundedRect(x, by, Math.max(3 * k, colW * Math.max(0, Math.min(1, st.value))), 5 * k, 2 * k);
    });
  }
}
