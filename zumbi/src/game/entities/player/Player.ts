/**
 * O personagem no mundo (parte Phaser). A lógica de movimento e de
 * atributos fica em PlayerMotor/PlayerStats (puras e testadas); aqui é
 * só: ler a intenção, aplicar no corpo físico, animar e sincronizar
 * as partes visuais (pernas, tronco, sombra).
 *
 * Tronco gira para a MIRA; pernas giram para onde ele ANDA. Andar de
 * costas (mirando para trás) inverte a passada em vez de torcer o quadril.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { PLAYER_TUNING } from '../../config/PlayerTuning';
import type { EventBus } from '../../core/EventBus';
import { angleDelta, length, rotateTowards, wrapAngle } from '../../core/math';
import { ANIM, TEX } from '../../assets/AssetKeys';
import type { AssetRegistry } from '../../assets/AssetRegistry';
import type { PlayerIntent } from '../../input/InputState';
import type { ShadowSystem } from '../../world/render/ShadowSystem';
import { stepVelocity, targetVelocity } from './PlayerMotor';
import { PlayerStats } from './PlayerStats';

/** Quadros em que um pé toca o chão (ver procedural/characters.ts). */
const FOOTSTEP_FRAMES = new Set([2, 6]);

export class Player {
  readonly stats = new PlayerStats();
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly legs: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly aimMarker: Phaser.GameObjects.Graphics;

  /** Direção do tronco e das pernas (rad). */
  private facing = -Math.PI / 2;
  private legsAngle = -Math.PI / 2;
  private legsReversed = false;
  private sprinting = false;
  private aiming = false;
  private breath = 0;
  private lastLegFrame = -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    assets: AssetRegistry,
    private readonly bus: EventBus,
    private readonly shadows: ShadowSystem,
  ) {
    const t = PLAYER_TUNING;

    this.shadow = scene.add.image(x, y, TEX.shadowSoft).setDepth(DEPTH.playerShadow).setAlpha(0.45).setDisplaySize(46, 32);

    const legsRef = assets.ref('player.legs', 0);
    this.legs = scene.add.sprite(x, y, legsRef.key, legsRef.frame).setDepth(DEPTH.playerLegs);
    this.legs.setScale(t.displaySize / assets.frameWidth(legsRef));

    const torsoRef = assets.ref('player.torso', 0);
    this.sprite = scene.physics.add.sprite(x, y, torsoRef.key, torsoRef.frame).setDepth(DEPTH.player);
    const scale = t.displaySize / assets.frameWidth(torsoRef);
    this.sprite.setScale(scale);
    // Corpo circular centrado, em px de textura (o Arcade multiplica pela escala).
    const r = t.bodyRadius / scale;
    const fw = this.sprite.frame.realWidth;
    const fh = this.sprite.frame.realHeight;
    this.sprite.body!.setCircle(r, fw / 2 - r, fh / 2 - r);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setRotation(this.facing);
    this.legs.setRotation(this.legsAngle);

    this.aimMarker = scene.add.graphics().setDepth(DEPTH.playerLegs - 0.5);

    this.dust = scene.add.particles(0, 0, TEX.dust, {
      lifespan: { min: 380, max: 620 },
      speed: { min: 8, max: 26 },
      scale: { start: 0.9, end: 2.1 },
      alpha: { start: 0.28, end: 0 },
      emitting: false,
    });
    this.dust.setDepth(DEPTH.decal + 1);

    this.legs.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_a: unknown, frame: Phaser.Animations.AnimationFrame) => {
      this.onLegFrame(frame.index - 1);
    });
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /** Direção do olhar (rad) — usada pela câmera para olhar à frente. */
  get facingAngle(): number {
    return this.facing;
  }

  get isAiming(): boolean {
    return this.aiming;
  }

  get isSprinting(): boolean {
    return this.sprinting;
  }

  /** Chamado ANTES do passo de física: decide a velocidade. */
  update(dt: number, intent: PlayerIntent): void {
    const t = PLAYER_TUNING;
    const body = this.body;
    this.aiming = intent.aiming;

    // Correr: exige estar se movendo, não mirando e ter fôlego.
    const moveMag = length(intent.moveX, intent.moveY);
    const wantsSprint = intent.sprint && !intent.aiming && moveMag > 0.5;
    const target = targetVelocity({ x: intent.moveX, y: intent.moveY, sprint: wantsSprint }, this.stats.canSprint());
    const v = stepVelocity({ x: body.velocity.x, y: body.velocity.y }, target, dt);
    body.setVelocity(v.x, v.y);

    const speed = length(v.x, v.y);
    this.sprinting = wantsSprint && this.stats.canSprint() && speed > t.walkSpeed * 1.05;
    this.stats.update(dt, this.sprinting);

    // Tronco: mira > movimento > mantém.
    let desired = this.facing;
    if (intent.aiming) desired = Math.atan2(intent.aimY, intent.aimX);
    else if (moveMag > 0.1) desired = Math.atan2(intent.moveY, intent.moveX);
    this.facing = rotateTowards(this.facing, desired, t.turnRate * dt);

    // Pernas: seguem a velocidade real; de costas, a passada inverte.
    if (speed > 12) {
      const moveAngle = Math.atan2(v.y, v.x);
      const diff = Math.abs(angleDelta(this.facing, moveAngle));
      this.legsReversed = diff > Math.PI * 0.6;
      const legsTarget = this.legsReversed ? wrapAngle(moveAngle + Math.PI) : moveAngle;
      this.legsAngle = rotateTowards(this.legsAngle, legsTarget, t.legsTurnRate * dt);
    } else {
      this.legsReversed = false;
      this.legsAngle = rotateTowards(this.legsAngle, this.facing, t.legsTurnRate * 0.6 * dt);
    }

    this.animate(speed, dt);
  }

  private animate(speed: number, dt: number): void {
    const t = PLAYER_TUNING;
    if (speed > 12) {
      // Ciclo sincronizado com a distância percorrida: os pés não "patinam".
      const cyclesPerSecond = speed / t.strideLength;
      const frameRate = cyclesPerSecond * 8;
      if (!this.legs.anims.isPlaying) {
        this.legs.play({ key: ANIM.legsWalk, startFrame: 1 });
        this.sprite.play({ key: ANIM.torsoWalk, startFrame: 1 });
      }
      const scale = frameRate / 10; // animações criadas a 10 fps
      this.legs.anims.timeScale = scale;
      this.sprite.anims.timeScale = scale;
      if (this.legsReversed !== this.legs.anims.inReverse) {
        this.legs.anims.reverse();
        this.sprite.anims.reverse();
      }
      this.breath = 0;
    } else if (this.legs.anims.isPlaying) {
      this.legs.anims.stop();
      this.sprite.anims.stop();
      this.legs.setFrame(this.legs.anims.currentAnim?.frames[0]?.frame.name ?? 0);
      this.sprite.setFrame(this.sprite.anims.currentAnim?.frames[0]?.frame.name ?? 0);
      this.lastLegFrame = -1;
    } else {
      this.breath += dt;
    }
  }

  private onLegFrame(index: number): void {
    if (index === this.lastLegFrame) return;
    this.lastLegFrame = index;
    if (!FOOTSTEP_FRAMES.has(index)) return;
    const loudness = this.sprinting ? 2 : 1;
    this.bus.emit('player:footstep', { x: this.x, y: this.y, loudness });
    if (this.sprinting) {
      const back = this.legsAngle + Math.PI;
      this.dust.emitParticleAt(this.x + Math.cos(back) * 10, this.y + Math.sin(back) * 10, 3);
    }
  }

  /** Chamado DEPOIS do passo de física: alinha as partes visuais ao corpo. */
  syncVisuals(): void {
    const x = this.sprite.x;
    const y = this.sprite.y;
    // Respiração sutil parado: um balanço mínimo do tronco. (Escala não: mudaria o corpo de colisão.)
    this.sprite.setRotation(this.facing + Math.sin(this.breath * 2.2) * 0.025);
    this.legs.setPosition(x, y).setRotation(this.legsAngle);
    const o = this.shadows.offset(0.55);
    this.shadow.setPosition(x + o.x, y + o.y);
    this.shadow.setAlpha(0.2 + this.shadows.alpha);

    this.aimMarker.clear();
    if (this.aiming) {
      // Arco de mira: só um indicativo de direção por enquanto (armas vêm na Etapa 7).
      const a = this.facing;
      const r0 = 34;
      const r1 = 118;
      const spread = 0.2;
      this.aimMarker.lineStyle(2, 0xf2ead6, 0.4);
      this.aimMarker.beginPath();
      this.aimMarker.arc(x, y, r1, a - spread, a + spread);
      this.aimMarker.strokePath();
      this.aimMarker.lineStyle(1.5, 0xf2ead6, 0.22);
      this.aimMarker.lineBetween(x + Math.cos(a - spread) * r0, y + Math.sin(a - spread) * r0, x + Math.cos(a - spread) * r1, y + Math.sin(a - spread) * r1);
      this.aimMarker.lineBetween(x + Math.cos(a + spread) * r0, y + Math.sin(a + spread) * r0, x + Math.cos(a + spread) * r1, y + Math.sin(a + spread) * r1);
    }
  }

  /** Estado para o futuro sistema de save. */
  snapshot(): { x: number; y: number; facing: number; stats: ReturnType<PlayerStats['snapshot']> } {
    return { x: this.x, y: this.y, facing: this.facing, stats: this.stats.snapshot() };
  }
}
