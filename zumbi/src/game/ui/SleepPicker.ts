/**
 * Seletor de horas de sono (1–10 h): mostra a energia prevista em cada
 * opção, a qualidade do sono aqui e agora e o que atrapalha (frio, fome,
 * dor...). Escolher emite `body:sleep` com as horas.
 */
import Phaser from 'phaser';
import { restAfter } from '../survival/Sleep';
import { UiButton } from './UiButton';
import { UI, textStyle } from './theme';

export interface SleepPickerData {
  place: 'cama' | 'sofa' | 'chao';
  fatigue: number;
  quality: number;
  reasons: readonly string[];
}

const PLACE: Record<SleepPickerData['place'], string> = { cama: 'na cama', sofa: 'no sofá', chao: 'no chão' };

export class SleepPicker {
  private readonly root: Phaser.GameObjects.Container;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly info: Phaser.GameObjects.Text;
  private readonly hours: UiButton[] = [];
  private readonly cancel: UiButton;
  private data: SleepPickerData | null = null;

  constructor(
    scene: Phaser.Scene,
    dpr: number,
    private readonly choose: (place: SleepPickerData['place'], hours: number) => void,
  ) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, 0x08090b, 0.6).setOrigin(0, 0).setInteractive();
    this.g = scene.add.graphics();
    this.title = scene.add.text(0, 0, '', textStyle(16, UI.text, '800')).setOrigin(0.5, 0).setResolution(dpr);
    this.info = scene.add.text(0, 0, '', textStyle(12, UI.textDim, '600')).setOrigin(0.5, 0).setAlign('center').setResolution(dpr).setLineSpacing(3);
    for (let h = 1; h <= 10; h++) {
      const b = new UiButton(scene, `${h} h`, 96, 46, () => this.pick(h), h === 8, dpr);
      this.hours.push(b);
    }
    this.cancel = new UiButton(scene, 'CANCELAR', 160, 40, () => this.close(), false, dpr);
    this.root = scene.add.container(0, 0, [this.dim, this.g, this.title, this.info, ...this.hours, this.cancel]).setDepth(165).setVisible(false);
  }

  get isOpen(): boolean {
    return this.root.visible;
  }

  open(d: SleepPickerData, w: number, h: number, k: number): void {
    this.data = d;
    this.root.setVisible(true);
    this.title.setText(`DORMIR ${PLACE[d.place].toUpperCase()}`);
    const q = d.quality >= 0.95 ? 'boa' : d.quality >= 0.7 ? 'regular' : 'ruim';
    const why = d.reasons.length ? ` · atrapalha: ${d.reasons.join(', ')}` : '';
    this.info.setText(`Energia agora ${Math.round(100 - d.fatigue)}% · sono ${q}${why}\nEscolha quanto tempo dormir (o número embaixo é a energia ao acordar).`);
    this.hours.forEach((b, i) => b.setLabel(`${i + 1} h · ${restAfter(d.fatigue, i + 1, d.quality)}%`));
    this.layout(w, h, k);
  }

  close(): void {
    this.data = null;
    this.root.setVisible(false);
  }

  layout(w: number, h: number, k: number): void {
    if (!this.root.visible) return;
    this.dim.setSize(w, h);
    // Deitado: 5 colunas; em pé: 2 colunas.
    const cols = w > h ? 5 : 2;
    const bw = cols === 5 ? 118 : 150;
    const bh = 46;
    const gap = 8;
    const rows = Math.ceil(10 / cols);
    const base = cols * bw + (cols - 1) * gap + 32;
    const kk = Math.min(k, (w - 16) / base);
    const pw = base * kk;
    const ph = (60 + 44 + rows * (bh + gap) + 56) * kk;
    const x = w / 2 - pw / 2;
    const y = Math.max(8, h / 2 - ph / 2);
    this.g.clear().fillStyle(0x0e0f12, 0.96).fillRoundedRect(x, y, pw, ph, 14 * kk);
    this.g.lineStyle(1.5, 0xffffff, 0.16).strokeRoundedRect(x, y, pw, ph, 14 * kk);
    this.title.setPosition(w / 2, y + 14 * kk).setScale(kk);
    this.info.setPosition(w / 2, y + 40 * kk).setScale(kk).setWordWrapWidth((pw - 24 * kk) / kk);
    const gy = y + (60 + 44) * kk;
    this.hours.forEach((b, i) => {
      b.setButtonSize(bw, bh);
      const c = i % cols;
      const r = Math.floor(i / cols);
      b.setPosition(x + (16 + c * (bw + gap) + bw / 2) * kk, gy + (r * (bh + gap) + bh / 2) * kk).setScale(kk);
    });
    this.cancel.setPosition(w / 2, gy + (rows * (bh + gap) + 24) * kk).setScale(kk);
  }

  private pick(hours: number): void {
    const d = this.data;
    this.close();
    if (d) this.choose(d.place, hours);
  }
}
