/**
 * Painel do carro (só dirigindo): velocímetro grande, barras de gasolina,
 * motor e lataria, avisos (motor morto, pneu furado, faróis) e o nome dos
 * dois botões que valem ao volante (SAIR e BUZINA). No alto, no meio: embaixo
 * ficam o volante (joystick) e os botões.
 */
import type Phaser from 'phaser';
import { UI, textStyle } from './theme';
import { HUD_LAYOUT } from '../config/HudLayout';

export interface DriveInfo {
  kmh: number;
  fuel: number;
  tank: number;
  body: number;
  engine: number;
  flat: number;
  stalled: boolean;
  lights: boolean;
}

const { width: W, height: H, speedometer, bars, cornerRadius } = HUD_LAYOUT.drive;
const RED = 0xd0453a;
const OK = 0x6fae5a;

export class DriveHud {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly speed: Phaser.GameObjects.Text;
  private readonly unit: Phaser.GameObjects.Text;
  private readonly labels: Phaser.GameObjects.Text[];
  private readonly warn: Phaser.GameObjects.Text;
  private readonly help: Phaser.GameObjects.Text;
  private readonly exitTag: Phaser.GameObjects.Text;
  private readonly hornTag: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, dpr: number) {
    const t = (size: number, color: string, weight = '800') => scene.add.text(0, 0, '', textStyle(size, color, weight)).setResolution(dpr).setDepth(96).setVisible(false);
    this.g = scene.add.graphics().setDepth(95).setVisible(false);
    this.speed = t(30, UI.text).setOrigin(0.5, 0);
    this.unit = t(10, UI.textDim).setOrigin(0.5, 0).setText('KM/H');
    this.labels = ['GASOLINA', 'MOTOR', 'LATARIA'].map((s) => t(9, UI.textDim).setOrigin(0, 0.5).setText(s));
    this.warn = t(10, '#f0b0a8').setOrigin(0.5, 0);
    this.help = t(11, UI.textDim, '700').setOrigin(0.5, 0).setText('E: sair · F: buzina');
    this.exitTag = t(11, UI.text).setOrigin(0.5, 0).setText('SAIR');
    this.hornTag = t(11, UI.text).setOrigin(0.5, 0).setText('BUZINA');
  }

  hide(): void {
    for (const o of this.all()) o.setVisible(false);
  }

  private all(): (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[] {
    return [this.g, this.speed, this.unit, ...this.labels, this.warn, this.help, this.exitTag, this.hornTag];
  }

  /**
   * `buttons` = centro e raio dos botões interagir/atacar no modo toque
   * (null no PC: mostra as teclas).
   */
  update(d: DriveInfo, cssW: number, top: number, k: number, buttons: { exit: { x: number; y: number; r: number }; horn: { x: number; y: number; r: number } } | null): void {
    const s = Math.min(k, (cssW - 16) / W);
    const w = W * s;
    const h = H * s;
    const x = cssW / 2 - w / 2;
    const y = top;
    const g = this.g.clear().setVisible(true);
    g.fillStyle(UI.panel, 0.8).fillRoundedRect(x, y, w, h, cornerRadius * s);
    g.lineStyle(1.5, UI.stroke, 0.16).strokeRoundedRect(x, y, w, h, cornerRadius * s);
    // Velocímetro: número grande e um arco que enche até a máxima (~34 km/h).
    const cx = x + speedometer.cx * s;
    const cy = y + speedometer.cy * s;
    const frac = Math.min(1, d.kmh / 34);
    g.lineStyle(4 * s, 0xffffff, 0.12).beginPath().arc(cx, cy, speedometer.radius * s, speedometer.arcStart, speedometer.arcStart + speedometer.arcRange).strokePath();
    if (frac > 0) g.lineStyle(4 * s, d.stalled ? RED : UI.accentNum, 1).beginPath().arc(cx, cy, speedometer.radius * s, speedometer.arcStart, speedometer.arcStart + speedometer.arcRange * frac).strokePath();
    this.speed.setText(d.stalled ? '—' : String(d.kmh)).setScale(s).setPosition(cx, y + speedometer.cy * s - 22 * s).setVisible(true);
    this.unit.setScale(s).setPosition(cx, y + speedometer.cy * s + 12 * s).setVisible(true);
    // Barras: gasolina, motor, lataria (vermelho quando está ruim).
    const barValues: [number, number][] = [
      [d.fuel / d.tank, d.fuel / d.tank < 0.12 ? RED : UI.accentNum],
      [d.engine, d.engine < 0.35 ? RED : d.engine < 0.5 ? UI.accentNum : OK],
      [d.body, d.body < 0.3 ? RED : d.body < 0.6 ? UI.accentNum : OK],
    ];
    const bx = x + bars.startX * s;
    const bw = w - (bars.startX + 10) * s;
    barValues.forEach(([v, color], i) => {
      const row = bars.rows[i]!;
      const by = y + row.y * s;
      this.labels[i]!.setScale(s).setPosition(x + bars.labelX * s, by + 3 * s).setVisible(true);
      g.fillStyle(0xffffff, 0.1).fillRoundedRect(bx, by, bw, bars.height * s, 3 * s);
      const f = Math.max(0, Math.min(1, v));
      if (f > 0.01) g.fillStyle(color, 1).fillRoundedRect(bx, by, Math.max(6 * s, bw * f), bars.height * s, 3 * s);
    });
    // Avisos numa linha só, embaixo das barras.
    const warns: string[] = [];
    if (d.stalled) warns.push(d.engine < 0.15 ? 'MOTOR DESTRUÍDO' : 'MOTOR MORREU');
    if (d.fuel < 0.5) warns.push('SEM GASOLINA');
    if (d.flat) warns.push(d.flat > 1 ? `${d.flat} PNEUS FURADOS` : 'PNEU FURADO');
    if (d.lights) warns.push('FARÓIS');
    this.warn
      .setText(warns.join(' · '))
      .setColor(warns.length && !(warns.length === 1 && d.lights) ? '#f0b0a8' : '#e8d49a')
      .setScale(s)
      .setPosition(bx + bw / 2 - 30 * s, y + HUD_LAYOUT.drive.warnings.y * s)
      .setVisible(warns.length > 0);
    // Nome dos botões (toque) ou as teclas (PC).
    this.help.setScale(s).setPosition(cssW / 2, y + HUD_LAYOUT.drive.help.y * s).setVisible(!buttons);
    if (buttons) {
      this.exitTag.setScale(s).setPosition(buttons.exit.x, buttons.exit.y + buttons.exit.r + 4).setVisible(true);
      this.hornTag.setScale(s).setPosition(buttons.horn.x, buttons.horn.y + buttons.horn.r + 4).setVisible(true);
    } else {
      this.exitTag.setVisible(false);
      this.hornTag.setVisible(false);
    }
  }
}
