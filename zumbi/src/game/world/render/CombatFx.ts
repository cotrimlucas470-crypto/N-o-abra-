/**
 * Efeitos do combate (parte Phaser): arco do golpe, rastro e clarão do
 * tiro, poeira no impacto e uma barrinha de resistência sobre o alvo que
 * apanhou (some sozinha). Tudo curto e barato: um Graphics redesenhado.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { TEX } from '../../assets/AssetKeys';

interface Fx {
  kind: 'swing' | 'tracer' | 'flash' | 'bar';
  t: number;
  life: number;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  angle?: number;
  reach?: number;
  frac?: number;
}

export class CombatFx {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly list: Fx[] = [];
  private readonly bloodFx: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEPTH.fx);
    this.dust = scene.add.particles(0, 0, TEX.dust, {
      lifespan: { min: 250, max: 500 },
      speed: { min: 30, max: 110 },
      scale: { start: 0.9, end: 0.2 },
      alpha: { start: 0.7, end: 0 },
      emitting: false,
    });
    this.dust.setDepth(DEPTH.fx);
    // Sangue: gotas escuras que espirram na direção do golpe.
    this.bloodFx = scene.add.particles(0, 0, TEX.dust, {
      lifespan: { min: 180, max: 420 },
      speed: { min: 60, max: 190 },
      scale: { start: 0.55, end: 0.15 },
      alpha: { start: 0.95, end: 0 },
      tint: [0x7a0e0a, 0x5a0a08, 0x9a1a12],
      emitting: false,
    });
    this.bloodFx.setDepth(DEPTH.fx - 1);
  }

  /** Espirro de sangue (golpe/tiro/mordida) na direção `dir`. */
  blood(x: number, y: number, dir: number, amount = 6): void {
    this.bloodFx.setConfig({
      lifespan: { min: 180, max: 420 },
      speed: { min: 60, max: 190 },
      angle: { min: (dir * 180) / Math.PI - 35, max: (dir * 180) / Math.PI + 35 },
      scale: { start: 0.55, end: 0.15 },
      alpha: { start: 0.95, end: 0 },
      tint: [0x7a0e0a, 0x5a0a08, 0x9a1a12],
      emitting: false,
    });
    this.bloodFx.emitParticleAt(x, y, amount);
  }

  /** Texto curto que sobe no lugar ("cabeça esmagada"). */
  note(x: number, y: number, text: string): void {
    this.notes.push({ x, y, text, t: 0 });
  }

  private readonly notes: { x: number; y: number; text: string; t: number; obj?: Phaser.GameObjects.Text }[] = [];

  swing(x: number, y: number, angle: number, reach: number): void {
    this.list.push({ kind: 'swing', t: 0, life: 0.16, x, y, angle, reach });
  }

  shot(x1: number, y1: number, x2: number, y2: number): void {
    this.list.push({ kind: 'tracer', t: 0, life: 0.12, x: x1, y: y1, x2, y2 });
    this.list.push({ kind: 'flash', t: 0, life: 0.07, x: x1, y: y1 });
    this.dust.emitParticleAt(x2, y2, 5);
  }

  impact(x: number, y: number, hp: number, max: number): void {
    this.dust.emitParticleAt(x, y, 4);
    // Uma barrinha por alvo: a nova substitui a antiga no mesmo lugar.
    const i = this.list.findIndex((f) => f.kind === 'bar' && Math.abs(f.x - x) < 4 && Math.abs(f.y - y) < 4);
    if (i >= 0) this.list.splice(i, 1);
    this.list.push({ kind: 'bar', t: 0, life: 1.6, x, y, frac: Math.max(0, Math.min(1, hp / max)) });
  }

  update(dt: number): void {
    const g = this.g;
    g.clear();
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i]!;
      n.t += dt;
      if (!n.obj) {
        n.obj = this.g.scene.add.text(n.x, n.y - 30, n.text, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#ffd8c8', fontStyle: '800' }).setOrigin(0.5).setDepth(DEPTH.fx + 1);
        n.obj.setShadow(0, 1, 'rgba(0,0,0,0.9)', 3, false, true);
      }
      n.obj.setPosition(n.x, n.y - 30 - n.t * 22).setAlpha(Math.max(0, 1 - n.t / 1.3));
      if (n.t > 1.3) {
        n.obj.destroy();
        this.notes.splice(i, 1);
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i]!;
      f.t += dt;
      if (f.t >= f.life) {
        this.list.splice(i, 1);
        continue;
      }
      const a = 1 - f.t / f.life;
      if (f.kind === 'swing') {
        const r = f.reach! + 14;
        g.lineStyle(4, 0xf2ead6, 0.55 * a);
        g.beginPath();
        g.arc(f.x, f.y, r, f.angle! - 0.8 + (f.t / f.life) * 0.5, f.angle! + 0.4 + (f.t / f.life) * 0.5);
        g.strokePath();
      } else if (f.kind === 'tracer') {
        g.lineStyle(2, 0xffe6a0, 0.85 * a);
        g.lineBetween(f.x, f.y, f.x2!, f.y2!);
      } else if (f.kind === 'flash') {
        g.fillStyle(0xfff2c0, 0.9 * a).fillCircle(f.x, f.y, 10 + 8 * a);
      } else {
        const w = 44;
        const y = f.y - 38;
        const fade = Math.min(1, (f.life - f.t) / 0.4);
        g.fillStyle(0x000000, 0.6 * fade).fillRoundedRect(f.x - w / 2 - 2, y - 2, w + 4, 8, 3);
        g.fillStyle(f.frac! > 0.5 ? 0x9fd88a : f.frac! > 0.2 ? 0xf0b060 : 0xf07a6a, 0.95 * fade).fillRoundedRect(f.x - w / 2, y, Math.max(2, w * f.frac!), 4, 2);
      }
    }
  }
}
