/**
 * Controles de DIRIGIR no celular: lado esquerdo é o VOLANTE (encosta em
 * qualquer lugar da metade esquerda e arrasta para os lados; soltar
 * desvira), lado direito são os PEDAIS: ACELERAR (alto) e FREIO/RÉ
 * (segurar parado dá ré). Cada dedo é rastreado pelo id, então dá para
 * virar e acelerar ao mesmo tempo. A regra do carro fica em Driving.ts.
 */
import Phaser from 'phaser';
import { wheelSteer } from '../../vehicles/Driving';
import { UI_FONT } from '../../ui/theme';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class DriveControls {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly gasText: Phaser.GameObjects.Text;
  private readonly brakeText: Phaser.GameObjects.Text;
  private wheel = { x: 0, y: 0, r: 60 };
  private gasBox: Box = { x: 0, y: 0, w: 0, h: 0 };
  private brakeBox: Box = { x: 0, y: 0, w: 0, h: 0 };
  private wheelId: number | null = null;
  private wheelStart = 0;
  private gasId: number | null = null;
  private brakeId: number | null = null;
  private visible = false;
  steer = 0;
  gas = 0;
  brake = 0;

  constructor(scene: Phaser.Scene, depth: number, dpr: number) {
    this.g = scene.add.graphics().setDepth(depth);
    const style = { fontFamily: UI_FONT, fontSize: '12px', color: '#f2efe6', fontStyle: '800', align: 'center' };
    this.gasText = scene.add.text(0, 0, 'ACELERAR', style).setOrigin(0.5).setDepth(depth + 1).setResolution(dpr);
    this.brakeText = scene.add.text(0, 0, 'FREIO\nRÉ', style).setOrigin(0.5).setDepth(depth + 1).setResolution(dpr);
    this.setVisible(false);
  }

  get pointers(): (number | null)[] {
    return [this.wheelId, this.gasId, this.brakeId];
  }

  get isVisible(): boolean {
    return this.visible;
  }

  setLayout(wheel: { x: number; y: number; radius: number }, gas: { x: number; y: number; radius: number }, brake: { x: number; y: number; radius: number }, k: number): void {
    this.wheel = { x: wheel.x, y: wheel.y, r: wheel.radius };
    this.gasBox = { x: gas.x - gas.radius * 0.62, y: gas.y - gas.radius * 1.15, w: gas.radius * 1.24, h: gas.radius * 2.3 };
    this.brakeBox = { x: brake.x - brake.radius * 0.8, y: brake.y - brake.radius * 0.8, w: brake.radius * 1.6, h: brake.radius * 1.6 };
    this.gasText.setScale(k);
    this.brakeText.setScale(k);
    this.draw();
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.g.setVisible(v);
    this.gasText.setVisible(v);
    this.brakeText.setVisible(v);
    if (!v) this.releaseAll();
  }

  /** Toque novo: volante (metade esquerda) ou pedal. true = o toque é do carro. */
  down(id: number, x: number, y: number, leftSide: boolean): boolean {
    if (!this.visible) return false;
    const pad = 14;
    const inBox = (b: Box) => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
    if (this.gasId === null && inBox(this.gasBox)) {
      this.gasId = id;
      this.gas = 1;
    } else if (this.brakeId === null && inBox(this.brakeBox)) {
      this.brakeId = id;
      this.brake = 1;
    } else if (leftSide && this.wheelId === null) {
      this.wheelId = id;
      this.wheelStart = x;
      this.steer = 0;
    } else return false;
    this.draw();
    return true;
  }

  move(id: number, x: number): boolean {
    if (id !== this.wheelId) return id === this.gasId || id === this.brakeId;
    this.steer = wheelSteer(x - this.wheelStart, this.wheel.r);
    this.draw();
    return true;
  }

  up(id: number): boolean {
    let mine = true;
    if (id === this.wheelId) {
      this.wheelId = null;
      this.steer = 0;
    } else if (id === this.gasId) {
      this.gasId = null;
      this.gas = 0;
    } else if (id === this.brakeId) {
      this.brakeId = null;
      this.brake = 0;
    } else mine = false;
    if (mine) this.draw();
    return mine;
  }

  releaseAll(): void {
    this.wheelId = this.gasId = this.brakeId = null;
    this.steer = this.gas = this.brake = 0;
    this.draw();
  }

  private draw(): void {
    const g = this.g.clear();
    if (!this.visible) return;
    // Volante: aro, cubo e raios; gira com a direção (até ~110°).
    const { x, y, r } = this.wheel;
    const a = this.steer * 1.9;
    const held = this.wheelId !== null;
    g.fillStyle(0x0b0c0f, held ? 0.5 : 0.36).fillCircle(x, y, r);
    g.lineStyle(Math.max(6, r * 0.16), 0xf2efe6, held ? 0.85 : 0.55).strokeCircle(x, y, r * 0.86);
    g.fillStyle(0xf2efe6, held ? 0.85 : 0.55).fillCircle(x, y, r * 0.2);
    g.lineStyle(Math.max(4, r * 0.1), 0xf2efe6, held ? 0.8 : 0.5);
    for (const s of [-Math.PI / 2 + Math.PI, Math.PI / 2 + Math.PI * 0.35, Math.PI / 2 - Math.PI * 0.35 + Math.PI]) {
      const ang = s + a;
      g.lineBetween(x + Math.cos(ang) * r * 0.2, y + Math.sin(ang) * r * 0.2, x + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.8);
    }
    // Marca do topo (mostra quanto está virado).
    g.fillStyle(0xe0a84a, 0.95).fillCircle(x + Math.cos(-Math.PI / 2 + a) * r * 0.86, y + Math.sin(-Math.PI / 2 + a) * r * 0.86, Math.max(4, r * 0.09));
    // Pedais.
    const pedal = (b: Box, on: boolean, color: number) => {
      g.fillStyle(on ? color : 0x0b0c0f, on ? 0.85 : 0.42).fillRoundedRect(b.x, b.y, b.w, b.h, 10);
      g.lineStyle(2, 0xffffff, on ? 0.8 : 0.32).strokeRoundedRect(b.x, b.y, b.w, b.h, 10);
      // Ranhuras de borracha.
      g.lineStyle(2, 0xffffff, on ? 0.35 : 0.14);
      for (let i = 1; i <= 3; i++) g.lineBetween(b.x + b.w * 0.2, b.y + (b.h * i) / 4, b.x + b.w * 0.8, b.y + (b.h * i) / 4);
    };
    pedal(this.gasBox, this.gasId !== null, 0x5aa04a);
    pedal(this.brakeBox, this.brakeId !== null, 0xc0463f);
    this.gasText.setPosition(this.gasBox.x + this.gasBox.w / 2, this.gasBox.y - 12 * this.gasText.scaleY);
    this.brakeText.setPosition(this.brakeBox.x + this.brakeBox.w / 2, this.brakeBox.y + this.brakeBox.h / 2);
  }
}
