/**
 * Painel de status (canto superior esquerdo): vida e fôlego.
 * A Fase 3 (sobrevivência) traz fome, sede, sono e peso — de preferência como
 * indicadores discretos que só aparecem quando importam (a especificação pede
 * poucas barras); `addBar` continua disponível para o que precisar de barra.
 */
import type Phaser from 'phaser';
import type { PlayerStats } from '../entities/player/PlayerStats';
import { UI, textStyle } from './theme';

/** Uma necessidade do corpo na faixa miúda (0..1 = quanto está bem; cor pela gravidade). */
export interface NeedGauge {
  label: string;
  /** 1 = ótimo, 0 = péssimo. */
  good: number;
  /** ok, atenção, ruim; azul para frio. */
  tone: 'ok' | 'warn' | 'bad' | 'cold';
}

const NEED_COLOR: Record<NeedGauge['tone'], number> = { ok: 0x6fbf5a, warn: 0xe0a83a, bad: 0xd8543f, cold: 0x5aa0e0 };
const NEED_H = 22;

interface Bar {
  label: Phaser.GameObjects.Text;
  color: number;
  value: number;
  shown: number;
}

const BAR_W = 132;
const BAR_H = 9;
const ROW = 20;

export class StatusPanel {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly bars: Bar[] = [];
  private x = 0;
  private y = 0;
  private scale = 1;
  private flash = 0;
  private needs: NeedGauge[] = [];
  private needLabels: Phaser.GameObjects.Text[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly dpr: number,
  ) {
    this.g = scene.add.graphics().setDepth(90);
    this.addBar('VIDA', UI.health);
    this.addBar('FÔLEGO', UI.stamina);
    // Faixa de necessidades (fome, sede, sono, temperatura): sempre à vista, sem pílula.
    for (let i = 0; i < 4; i++) this.needLabels.push(scene.add.text(0, 0, '', textStyle(9, UI.textDim, '800')).setDepth(91).setResolution(dpr));
  }

  /** Altura total do painel (px de tela), para quem posiciona coisas embaixo dele. */
  get height(): number {
    return (12 + this.bars.length * ROW + NEED_H) * this.scale;
  }

  /** Atualiza a faixa de necessidades (chamar poucas vezes por segundo basta). */
  setNeeds(needs: readonly NeedGauge[]): void {
    const same = needs.length === this.needs.length && needs.every((n, i) => n.label === this.needs[i]!.label && n.tone === this.needs[i]!.tone && Math.abs(n.good - this.needs[i]!.good) < 0.01);
    if (same) return;
    this.needs = [...needs];
    this.layoutNeeds();
    this.draw();
  }

  private layoutNeeds(): void {
    const s = this.scale;
    const cell = (BAR_W + 76 - 20) / 4;
    this.needLabels.forEach((t, i) => {
      const n = this.needs[i];
      t.setVisible(!!n);
      if (!n) return;
      t.setText(n.label).setScale(s).setPosition(this.x + (10 + i * cell) * s, this.y + (10 + this.bars.length * ROW) * s);
    });
  }

  private addBar(name: string, color: number): void {
    const label = this.scene.add.text(0, 0, name, textStyle(10, UI.textDim, '700')).setDepth(91).setResolution(this.dpr);
    label.setLetterSpacing(1);
    this.bars.push({ label, color, value: 1, shown: 1 });
  }

  setPosition(x: number, y: number, scale: number): void {
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.bars.forEach((b, i) => {
      b.label.setScale(scale).setPosition(x + 12 * scale, y + (9 + i * ROW) * scale);
    });
    this.layoutNeeds();
    this.draw();
  }

  update(stats: PlayerStats | null, dt: number): void {
    if (!stats) return;
    const hb = this.bars[0]!;
    const sb = this.bars[1]!;
    hb.value = stats.health / stats.maxHealth;
    sb.value = stats.stamina / stats.maxStamina;
    sb.color = stats.exhausted ? UI.staminaLow : UI.stamina;
    if (stats.exhausted) this.flash += dt;
    else this.flash = 0;
    let dirty = false;
    for (const b of this.bars) {
      const k = Math.min(1, dt * 10);
      const next = b.shown + (b.value - b.shown) * k;
      if (Math.abs(next - b.shown) > 0.0005 || stats.exhausted) dirty = true;
      b.shown = next;
    }
    if (dirty) this.draw();
  }

  private draw(): void {
    const s = this.scale;
    const g = this.g;
    g.clear();
    const w = (BAR_W + 76) * s;
    const h = (12 + this.bars.length * ROW + (this.needs.length ? NEED_H : 0)) * s;
    g.fillStyle(UI.panel, UI.panelAlpha);
    g.fillRoundedRect(this.x, this.y, w, h, 10 * s);
    g.lineStyle(1, UI.stroke, UI.strokeAlpha);
    g.strokeRoundedRect(this.x, this.y, w, h, 10 * s);
    // Faixa de necessidades: quatro medidores miúdos com o nome em cima.
    const cell = (BAR_W + 76 - 20) / 4;
    this.needs.forEach((n, i) => {
      const gx = this.x + (10 + i * cell) * s;
      const gy = this.y + (10 + this.bars.length * ROW + 11) * s;
      const gw = (cell - 6) * s;
      g.fillStyle(0x000000, 0.45);
      g.fillRoundedRect(gx, gy, gw, 5 * s, 2.5 * s);
      const fw = Math.max(0, Math.min(1, n.good)) * gw;
      if (fw > 1) {
        g.fillStyle(NEED_COLOR[n.tone], 1);
        g.fillRoundedRect(gx, gy, fw, 5 * s, Math.min(2.5 * s, fw / 2));
      }
    });
    this.bars.forEach((b, i) => {
      const bx = this.x + 66 * s;
      const by = this.y + (11 + i * ROW) * s;
      g.fillStyle(0x000000, 0.45);
      g.fillRoundedRect(bx, by, BAR_W * s, BAR_H * s, 4 * s);
      const pulse = i === 1 && this.flash > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(this.flash * 6)) : 1;
      const fillW = Math.max(0, Math.min(1, b.shown)) * BAR_W * s;
      if (fillW > 1) {
        g.fillStyle(b.color, pulse);
        g.fillRoundedRect(bx, by, fillW, BAR_H * s, Math.min(4 * s, fillW / 2));
        g.fillStyle(0xffffff, 0.18 * pulse);
        g.fillRect(bx + 2 * s, by + 1.5 * s, Math.max(0, fillW - 4 * s), 2 * s);
      }
    });
  }
}
