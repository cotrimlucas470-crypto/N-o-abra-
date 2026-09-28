/**
 * PEGADAS e MARCAS DE PNEU na neve (parte Phaser): imagens reaproveitadas
 * (pool fixo — nunca cria mais), só em chão de fora com neve. Somem aos
 * poucos; com neve caindo, somem mais rápido (a neve nova cobre). Cada passo
 * também compacta a neve daquele tile (caminho pisado fica cinza e baixo).
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { TEX } from '../../assets/AssetKeys';
import type { GroundWeatherLayer } from './GroundWeatherLayer';

const FEET = 90;
const TIRES = 160;
/** Segundos até sumir (sem nevar). */
const LIFE = 150;

interface Mark {
  img: Phaser.GameObjects.Image;
  life: number;
  alpha: number;
}

export interface TrackInput {
  x: number;
  y: number;
  facing: number;
  onFoot: boolean;
  car: { x: number; y: number; a: number; speed: number } | null;
  /** Neve no chão 0..1. */
  snow: number;
  /** Neve caindo 0..1. */
  snowing: number;
}

export class SnowTracks {
  private readonly feet: Mark[] = [];
  private readonly tires: Mark[] = [];
  private nextFoot = 0;
  private nextTire = 0;
  private last: { x: number; y: number } | null = null;
  private lastCar: { x: number; y: number } | null = null;
  private side = 1;

  constructor(
    scene: Phaser.Scene,
    private readonly ground: GroundWeatherLayer,
  ) {
    const make = (key: string) => ({ img: scene.add.image(0, 0, key).setDepth(DEPTH.decal - 0.2).setVisible(false), life: 0, alpha: 0 });
    for (let i = 0; i < FEET; i++) this.feet.push(make(TEX.footprint));
    for (let i = 0; i < TIRES; i++) this.tires.push(make(TEX.tireTrack));
  }

  update(dt: number, s: TrackInput): void {
    // Some com o tempo; neve caindo cobre mais rápido.
    const fade = dt * (1 + s.snowing * 5);
    for (const list of [this.feet, this.tires])
      for (const m of list) {
        if (m.life <= 0) continue;
        m.life -= fade;
        if (m.life <= 0 || s.snow < 0.05) {
          m.life = 0;
          m.img.setVisible(false);
          continue;
        }
        m.img.setAlpha(m.alpha * Math.min(1, m.life / 40));
      }
    if (s.snowing > 0) this.ground.coverTracks(s.snowing * dt * 0.01);
    const vis = Math.min(1, (s.snow - 0.12) * 3);
    // Pés: um passo a cada ~26 px andados, alternando o lado.
    if (s.onFoot && vis > 0 && this.ground.isOutdoorGround(s.x, s.y)) {
      const l = this.last;
      if (!l) this.last = { x: s.x, y: s.y };
      else {
        const dx = s.x - l.x;
        const dy = s.y - l.y;
        const d = Math.hypot(dx, dy);
        if (d > 70) this.last = { x: s.x, y: s.y };
        else if (d >= 26) {
          const a = Math.atan2(dy, dx);
          this.side = -this.side;
          const px = s.x + Math.cos(a + Math.PI / 2) * 5 * this.side;
          const py = s.y + Math.sin(a + Math.PI / 2) * 5 * this.side;
          this.place(this.feet, this.nextFoot++ % FEET, px, py, a, 0.8 * vis);
          this.ground.trample(s.x, s.y, 0.05);
          this.last = { x: s.x, y: s.y };
        }
      }
    } else this.last = null;
    // Carro: dois rastros atrás, a cada ~20 px.
    const c = s.car;
    if (c && vis > 0 && Math.abs(c.speed) > 15) {
      const l = this.lastCar;
      if (!l || Math.hypot(c.x - l.x, c.y - l.y) >= 20) {
        const back = Math.cos(c.a) * -58;
        const backY = Math.sin(c.a) * -58;
        for (const side of [-1, 1]) {
          const x = c.x + back + Math.cos(c.a + Math.PI / 2) * 34 * side;
          const y = c.y + backY + Math.sin(c.a + Math.PI / 2) * 34 * side;
          if (this.ground.isOutdoorGround(x, y)) this.place(this.tires, this.nextTire++ % TIRES, x, y, c.a, 0.75 * vis);
        }
        this.ground.trample(c.x, c.y, 0.12);
        this.lastCar = { x: c.x, y: c.y };
      }
    } else if (!c) this.lastCar = null;
  }

  private place(list: Mark[], i: number, x: number, y: number, a: number, alpha: number): void {
    const m = list[i]!;
    m.life = LIFE;
    m.alpha = alpha;
    m.img.setPosition(x, y).setRotation(a).setAlpha(alpha).setVisible(true);
  }
}
