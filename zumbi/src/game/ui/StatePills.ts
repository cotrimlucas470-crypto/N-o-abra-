/**
 * Estados do corpo como "pílulas" discretas embaixo do painel de status
 * (Fome, Sede, Frio, Sangrando...). Só aparece o que importa agora; a cor
 * diz a gravidade. Nada de barra a mais na tela (a especificação pede HUD limpo).
 */
import type Phaser from 'phaser';
import type { Tone } from '../items/condition';
import { UI, textStyle } from './theme';

const COLORS: Record<Tone, number> = { ok: 0x4f8a45, info: 0x6f6d67, warn: 0xb07a2a, bad: 0xb0402f };
const MAX = 8;

export interface Pill {
  label: string;
  tone: Tone;
}

export class StatePills {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private key = '';
  private x = 0;
  private y = 0;
  private k = 1;
  private maxW = 300;

  constructor(scene: Phaser.Scene, dpr: number) {
    this.g = scene.add.graphics().setDepth(90);
    for (let i = 0; i < MAX; i++) {
      this.texts.push(scene.add.text(0, 0, '', textStyle(10, UI.text, '800')).setOrigin(0, 0.5).setResolution(dpr).setDepth(91).setVisible(false));
    }
  }

  setPosition(x: number, y: number, k: number, maxW: number): void {
    this.x = x;
    this.y = y;
    this.k = k;
    this.maxW = maxW;
    this.key = '';
  }

  update(pills: readonly Pill[]): void {
    const key = pills.map((p) => `${p.label}:${p.tone}`).join('|');
    if (key === this.key) return;
    this.key = key;
    const k = this.k;
    this.g.clear();
    let cx = this.x;
    let cy = this.y;
    const h = 18 * k;
    this.texts.forEach((t, i) => {
      const p = pills[i];
      if (!p) {
        t.setVisible(false);
        return;
      }
      t.setText(p.label).setScale(k).setVisible(true);
      const w = t.width * k + 14 * k;
      if (cx + w > this.x + this.maxW && cx > this.x) {
        cx = this.x;
        cy += h + 4 * k;
      }
      this.g.fillStyle(COLORS[p.tone], 0.88).fillRoundedRect(cx, cy, w, h, 9 * k);
      t.setPosition(cx + 7 * k, cy + h / 2);
      cx += w + 5 * k;
    });
  }
}
