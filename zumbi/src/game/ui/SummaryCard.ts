/**
 * Cartão de RESUMO na HUD (moradia, expedição): título, linhas "rótulo →
 * valor" com cor pelo que importa (verde ok, amarelo atenção, vermelho
 * risco), avisos embaixo e até 3 botões + FECHAR. Deitado usa duas colunas
 * para caber sem rolar.
 */
import Phaser from 'phaser';
import type { SummaryRow } from '../home/Home';
import { UiButton } from './UiButton';
import { UI, textStyle } from './theme';

export interface CardData {
  title: string;
  subtitle?: string;
  rows: readonly SummaryRow[];
  notes: readonly { text: string; tone: SummaryRow['tone'] }[];
  buttons: readonly { label: string; primary?: boolean; action: () => void }[];
}

const TONE: Record<SummaryRow['tone'], string> = { ok: '#8fce7a', warn: '#e6c04e', bad: '#ec6a5c', info: UI.text };
const MAX_ROWS = 16;
const MAX_NOTES = 4;
const MAX_BUTTONS = 3;

export class SummaryCard {
  private readonly root: Phaser.GameObjects.Container;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly values: Phaser.GameObjects.Text[] = [];
  private readonly notes: Phaser.GameObjects.Text[] = [];
  private readonly buttons: UiButton[] = [];
  private readonly closeBtn: UiButton;
  private readonly panelHit: Phaser.GameObjects.Zone;
  private data: CardData | null = null;

  constructor(scene: Phaser.Scene, dpr: number) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, 0x08090b, 0.6).setOrigin(0, 0).setInteractive();
    this.dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.close());
    this.g = scene.add.graphics();
    this.title = scene.add.text(0, 0, '', textStyle(16, UI.text, '800')).setOrigin(0.5, 0).setResolution(dpr);
    this.sub = scene.add.text(0, 0, '', textStyle(11, UI.textDim, '600')).setOrigin(0.5, 0).setAlign('center').setResolution(dpr);
    for (let i = 0; i < MAX_ROWS; i++) {
      this.labels.push(scene.add.text(0, 0, '', textStyle(11, UI.textDim, '700')).setResolution(dpr));
      this.values.push(scene.add.text(0, 0, '', textStyle(12, UI.text, '700')).setResolution(dpr));
    }
    for (let i = 0; i < MAX_NOTES; i++) this.notes.push(scene.add.text(0, 0, '', textStyle(11, UI.text, '700')).setResolution(dpr));
    for (let i = 0; i < MAX_BUTTONS; i++) {
      const b = new UiButton(scene, '', 150, 40, () => this.press(i), false, dpr);
      this.buttons.push(b);
    }
    this.closeBtn = new UiButton(scene, 'FECHAR', 110, 40, () => this.close(), false, dpr);
    // O painel em si segura o toque (não fecha ao tocar dentro).
    this.panelHit = scene.add.zone(0, 0, 10, 10).setOrigin(0, 0).setInteractive();
    this.root = scene.add
      .container(0, 0, [this.dim, this.g, this.panelHit, this.title, this.sub, ...this.labels, ...this.values, ...this.notes, ...this.buttons, this.closeBtn])
      .setDepth(175)
      .setVisible(false);
  }

  get isOpen(): boolean {
    return this.root.visible;
  }

  open(d: CardData, w: number, h: number, k: number): void {
    this.data = d;
    this.root.setVisible(true);
    this.layout(w, h, k);
  }

  close(): void {
    this.data = null;
    this.root.setVisible(false);
  }

  layout(w: number, h: number, k: number): void {
    const d = this.data;
    if (!d || !this.root.visible) return;
    this.dim.setSize(w, h);
    if (this.dim.input?.hitArea instanceof Phaser.Geom.Rectangle) this.dim.input.hitArea.setTo(0, 0, w, h);
    const rows = d.rows.slice(0, MAX_ROWS);
    const notes = d.notes.slice(0, MAX_NOTES);
    const cols = w > h && rows.length > 6 ? 2 : 1;
    const perCol = Math.ceil(rows.length / cols);
    const colW = cols === 2 ? 370 : 350;
    const labW = 128;
    const rowH = 21;
    const pad = 14;
    const baseW = cols * colW + (cols - 1) * 16 + pad * 2;
    const headH = d.subtitle ? 52 : 38;
    const noteH = notes.length * 17 + (notes.length ? 8 : 0);
    const baseH = headH + perCol * rowH + noteH + 58;
    const kk = Math.min(k, (w - 12) / baseW, (h - 12) / baseH);
    const pw = baseW * kk;
    const ph = baseH * kk;
    const x = w / 2 - pw / 2;
    const y = Math.max(6, h / 2 - ph / 2);
    this.g.clear().fillStyle(0x0e0f12, 0.97).fillRoundedRect(x, y, pw, ph, 14 * kk);
    this.g.lineStyle(1.5, 0xffffff, 0.16).strokeRoundedRect(x, y, pw, ph, 14 * kk);
    this.panelHit.setPosition(x, y).setSize(pw, ph);
    if (this.panelHit.input?.hitArea instanceof Phaser.Geom.Rectangle) this.panelHit.input.hitArea.setTo(0, 0, pw, ph);
    this.title.setText(d.title).setPosition(w / 2, y + 12 * kk).setScale(kk);
    this.sub.setText(d.subtitle ?? '').setVisible(!!d.subtitle).setPosition(w / 2, y + 34 * kk).setScale(kk);
    const top = y + headH * kk;
    for (let i = 0; i < MAX_ROWS; i++) {
      const r = rows[i];
      const lab = this.labels[i]!;
      const val = this.values[i]!;
      lab.setVisible(!!r);
      val.setVisible(!!r);
      if (!r) continue;
      const c = Math.floor(i / perCol);
      const ri = i % perCol;
      const cx = x + (pad + c * (colW + 16)) * kk;
      const cy = top + ri * rowH * kk;
      // Linha fina entre as linhas: lê melhor no celular.
      if (ri > 0) this.g.fillStyle(0xffffff, 0.05).fillRect(cx, cy - 2 * kk, colW * kk, 1);
      lab.setText(r.label.toUpperCase()).setPosition(cx, cy + 3 * kk).setScale(kk);
      if (lab.displayWidth > (labW - 8) * kk) lab.setScale((kk * (labW - 8) * kk) / lab.displayWidth);
      val.setText(r.value).setColor(TONE[r.tone]).setPosition(cx + labW * kk, cy + 1 * kk).setScale(kk);
      // Valor comprido encolhe para caber na coluna.
      const room = (colW - labW) * kk;
      if (val.displayWidth > room) val.setScale((kk * room) / val.displayWidth);
    }
    let ny = top + perCol * rowH * kk + 6 * kk;
    for (let i = 0; i < MAX_NOTES; i++) {
      const n = notes[i];
      const t = this.notes[i]!;
      t.setVisible(!!n);
      if (!n) continue;
      t.setText(`• ${n.text}`).setColor(TONE[n.tone]).setPosition(x + pad * kk, ny).setScale(kk);
      if (t.displayWidth > pw - pad * 2 * kk) t.setScale((kk * (pw - pad * 2 * kk)) / t.displayWidth);
      ny += 17 * kk;
    }
    // Botões: os do cartão e FECHAR, centralizados embaixo.
    const bs = d.buttons.slice(0, MAX_BUTTONS);
    const bw = 150;
    const all = bs.length + 1;
    const span = (bs.length * bw + 110 + (all - 1) * 10) * kk;
    let bx = w / 2 - span / 2;
    const by = y + ph - 28 * kk;
    this.buttons.forEach((b, i) => {
      const spec = bs[i];
      b.setVisible(!!spec);
      if (!spec) return;
      b.setLabel(spec.label).setButtonSize(bw, 40);
      b.setPosition(bx + (bw * kk) / 2, by).setScale(kk);
      bx += (bw + 10) * kk;
    });
    this.closeBtn.setPosition(bx + (110 * kk) / 2, by).setScale(kk);
  }

  private press(i: number): void {
    const b = this.data?.buttons[i];
    if (!b) return;
    this.close();
    b.action();
  }
}
