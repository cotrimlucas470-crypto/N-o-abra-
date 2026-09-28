/**
 * Atmosfera (parte Phaser): noite e luzes, sol e sombras, céu, chuva, neve,
 * neblina, vento e tempestade. Tudo visual — quem decide hora, clima e luzes
 * é a lógica pura (Weather/Ground).
 *
 * - NOITE: textura pequena (1/5 da tela) pintada de escuro e "apagada" onde há
 *   luz (em volta do jogador, lanterna, fogueiras). Neve no chão clareia a noite.
 * - CÉU: sombras de NUVENS passando pelo mapa com o vento (dia de poucas nuvens)
 *   e uma GRADAÇÃO de cor por multiplicação (céu pesado, chuva, frio de neve) —
 *   muda a cor da cena sem pôr véu por cima. Antes da tempestade, escurece.
 * - CHUVA: riscos inclinados pelo vento (mais e mais longos com a força), gotas
 *   grandes perto da "câmera" na chuva forte e RESPINGOS só no chão de fora
 *   (dentro de casa, vê-se a chuva batendo lá fora pela área aberta).
 * - NEVE: flocos longe (pequenos, lentos) e perto (grandes), empurrados pelo
 *   vento; na nevasca, neve arrastada rente ao chão.
 * - VENTO: folhas voando (cor da estação); árvores balançam (SeasonDressing).
 * - NEBLINA: some primeiro o que está longe (clareira em volta do jogador que
 *   encolhe com a densidade) + fiapos irregulares que andam com o vento; dentro
 *   de casa quase não entra.
 * - RELÂMPAGO: raro e forte — dois clarões rápidos que iluminam tudo e somem.
 *
 * Barato no celular: partículas só na área da tela, quantidade pela
 * intensidade (nunca milhares), texturas pequenas repetidas.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { TEX } from '../../assets/AssetKeys';
import { daylight, type WeatherSample } from '../../sim/Weather';
import type { ShadowSystem } from './ShadowSystem';

export interface LightSource {
  x: number;
  y: number;
  /** Raio (px de mundo). */
  radius: number;
  /** 0..1 */
  intensity: number;
  /** Chama tremula (fogueira, vela). */
  flicker?: boolean;
}

export interface AtmosphereInput {
  minuteOfDay: number;
  weather: WeatherSample;
  /** Horas de sol da época (dia curto no inverno). */
  dayHours: number;
  /** Neve no chão 0..1. */
  snowCover: number;
  /** Folhas da época (cor 0..1 verde→marrom; quanto a copa tem). */
  leafColor: number;
  leafCover: number;
  /** Jogador debaixo de telhado: sem chuva caindo em cima. */
  sheltered: boolean;
  player: { x: number; y: number };
  /** Lanterna ligada: direção (rad) e alcance (px). */
  flashlight: { angle: number; range: number } | null;
  lights: readonly LightSource[];
}

/** Resolução da textura da noite e da neblina: 1 px para cada N px de tela. */
const DARK_DOWNSCALE = 5;
const FOG_DOWNSCALE = 6;
const NIGHT_COLOR = 0x03050c;
const DUSK_COLOR = 0x1c1008;
/** Escuridão máxima (lua e céu ainda deixam ver um pouco). */
const NIGHT_ALPHA = 0.84;
const FOG_COLOR = 0xd2d8de;
/** Sombra de nuvem: escala da textura (512 px → ~1800 px de mundo). */
const CLOUD_SCALE = 3.5;

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export class Atmosphere {
  private readonly darkKey = 'fx.darkness';
  private readonly fogKey = 'fx.fogdist';
  private dark: Phaser.Textures.DynamicTexture;
  private fogRt: Phaser.Textures.DynamicTexture;
  private readonly darkImage: Phaser.GameObjects.Image;
  private readonly fogImage: Phaser.GameObjects.Image;
  private readonly fogWisps: Phaser.GameObjects.TileSprite;
  private readonly clouds: Phaser.GameObjects.TileSprite;
  private readonly stampRadial: Phaser.GameObjects.Image;
  private readonly stampCone: Phaser.GameObjects.Image;
  private readonly grade: Phaser.GameObjects.Rectangle;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly rain: Emitter;
  private readonly rainNear: Emitter;
  private readonly splash: Emitter;
  private readonly snow: Emitter;
  private readonly snowNear: Emitter;
  private readonly drift: Emitter;
  private readonly leaves: Emitter;
  private rainRot = 0;
  private leafTints: number[] = [0x6f8a4a];
  /** Área da tela agora (os respingos nascem nela). */
  private view = new Phaser.Geom.Rectangle(0, 0, 1, 1);
  private zones = { w: 0, h: 0 };
  private boltT = -1;
  private nextBolt = 6;
  private flashNow = 0;
  private cloudX = 0;
  private cloudY = 0;
  private fogX = 0;
  private rtW = 0;
  private rtH = 0;
  private fogW = 0;
  private fogH = 0;
  private sunTimer = 0;
  private lastSun = '';
  private time = 0;
  /** Relâmpago começou neste quadro (a cena manda o trovão). */
  bolt = false;
  /** Escuridão atual 0..1 (para o HUD e testes). */
  darkness = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly shadows: ShadowSystem,
    /** O ponto é chão ao ar livre (respingos só lá). */
    private readonly outdoor: (x: number, y: number) => boolean = () => true,
  ) {
    this.dark = scene.textures.addDynamicTexture(this.darkKey, 16, 16)!;
    this.darkImage = scene.add.image(0, 0, this.darkKey).setOrigin(0, 0).setDepth(DEPTH.atmosphere).setVisible(false);
    this.fogRt = scene.textures.addDynamicTexture(this.fogKey, 16, 16)!;
    this.fogImage = scene.add.image(0, 0, this.fogKey).setOrigin(0, 0).setDepth(DEPTH.atmosphere + 1).setVisible(false);
    this.fogWisps = scene.add.tileSprite(0, 0, 16, 16, TEX.fogNoise).setOrigin(0, 0).setDepth(DEPTH.atmosphere + 1.1).setVisible(false);
    this.fogWisps.setTileScale(2.2, 2.2);
    // Sombras de nuvem por cima de tudo do mundo (inclusive telhados), abaixo da noite.
    this.clouds = scene.add.tileSprite(0, 0, 16, 16, TEX.cloudShadow).setOrigin(0, 0).setDepth(DEPTH.roofDoor + 1).setVisible(false);
    this.clouds.setTileScale(CLOUD_SCALE, CLOUD_SCALE);
    // Carimbos (não vão para a tela: só servem para apagar a escuridão/neblina).
    this.stampRadial = new Phaser.GameObjects.Image(scene, 0, 0, TEX.lightRadial);
    this.stampCone = new Phaser.GameObjects.Image(scene, 0, 0, TEX.lightCone).setOrigin(0, 0.5);
    // Gradação de cor (multiplica): céu pesado, chuva, frio.
    this.grade = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 1).setOrigin(0, 0).setDepth(DEPTH.atmosphere - 1).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(false);
    this.flash = scene.add.rectangle(0, 0, 10, 10, 0xeef3ff, 0).setOrigin(0, 0).setDepth(DEPTH.atmosphere + 3).setBlendMode(Phaser.BlendModes.ADD);

    const rot = { onEmit: () => this.rainRot };
    this.rain = scene.add.particles(0, 0, TEX.rainDrop, {
      lifespan: 520,
      speedY: { min: 900, max: 1150 },
      speedX: -100,
      rotate: rot,
      scaleX: { min: 0.7, max: 1.1 },
      scaleY: { min: 0.9, max: 1.4 },
      alpha: { start: 0.7, end: 0.25 },
      frequency: 20,
      emitting: false,
    });
    this.rain.setDepth(DEPTH.atmosphere + 2);
    this.rainNear = scene.add.particles(0, 0, TEX.rainNear, {
      lifespan: 300,
      speedY: { min: 1500, max: 1800 },
      speedX: -150,
      rotate: rot,
      scale: { min: 1, max: 1.6 },
      alpha: { start: 0.55, end: 0.15 },
      frequency: 80,
      emitting: false,
    });
    this.rainNear.setDepth(DEPTH.atmosphere + 2.2);
    // Respingos: nascem em pontos de chão de fora da tela (mundo, não tela).
    const self = this;
    const outdoorPoint = {
      getRandomPoint(p: Phaser.Types.Math.Vector2Like) {
        const v = self.view;
        let x = v.x;
        let y = v.y;
        for (let k = 0; k < 4; k++) {
          x = v.x + Math.random() * v.width;
          y = v.y + Math.random() * v.height;
          if (self.outdoor(x, y)) break;
        }
        p.x = x;
        p.y = y;
      },
    };
    this.splash = scene.add.particles(0, 0, TEX.splash, {
      lifespan: 300,
      scale: { start: 0.35, end: 1.1 },
      alpha: { start: 0.75, end: 0 },
      frequency: 60,
      emitting: false,
      emitZone: { type: 'random', source: outdoorPoint } as unknown as Phaser.Types.GameObjects.Particles.EmitZoneData,
    });
    this.splash.setDepth(DEPTH.decal + 0.3);
    this.snow = scene.add.particles(0, 0, TEX.snowFlake, {
      lifespan: 2600,
      speedY: { min: 45, max: 95 },
      speedX: { min: -25, max: 25 },
      scale: { min: 0.3, max: 0.7 },
      alpha: { start: 0.9, end: 0.05 },
      frequency: 50,
      emitting: false,
    });
    this.snow.setDepth(DEPTH.atmosphere + 2);
    this.snowNear = scene.add.particles(0, 0, TEX.snowFlake, {
      lifespan: 1500,
      speedY: { min: 110, max: 170 },
      speedX: { min: -30, max: 30 },
      scale: { min: 0.9, max: 1.6 },
      alpha: { start: 0.85, end: 0 },
      frequency: 200,
      emitting: false,
    });
    this.snowNear.setDepth(DEPTH.atmosphere + 2.2);
    this.drift = scene.add.particles(0, 0, TEX.snowStreak, {
      lifespan: 700,
      speedX: { min: -700, max: -420 },
      speedY: { min: -15, max: 15 },
      scaleX: { min: 0.8, max: 1.6 },
      alpha: { start: 0.55, end: 0 },
      frequency: 100,
      emitting: false,
    });
    this.drift.setDepth(DEPTH.atmosphere + 2.1);
    this.leaves = scene.add.particles(0, 0, TEX.leaf, {
      lifespan: 2400,
      speedX: { min: -420, max: -160 },
      speedY: { min: -50, max: 70 },
      rotate: { start: 0, end: 540 },
      scale: { min: 0.8, max: 1.3 },
      alpha: { start: 0.95, end: 0.7 },
      tint: { onEmit: () => this.leafTints[Math.floor(Math.random() * this.leafTints.length)]! },
      frequency: 400,
      emitting: false,
    });
    this.leaves.setDepth(DEPTH.fx - 1);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stampRadial.destroy();
      this.stampCone.destroy();
      if (scene.textures.exists(this.darkKey)) scene.textures.remove(this.darkKey);
      if (scene.textures.exists(this.fogKey)) scene.textures.remove(this.fogKey);
    });
  }

  /** O que é da tela (noite, céu, neblina, partículas): outra câmera não desenha. */
  screenObjects(): Phaser.GameObjects.GameObject[] {
    return [this.darkImage, this.fogImage, this.fogWisps, this.clouds, this.grade, this.flash, this.rain, this.rainNear, this.splash, this.snow, this.snowNear, this.drift, this.leaves];
  }

  update(dt: number, cam: Phaser.Cameras.Scene2D.Camera, input: AtmosphereInput): void {
    this.time += dt;
    const w = input.weather;
    const v = cam.worldView;
    this.view.setTo(v.x, v.y, v.width, v.height);
    const day = daylight(input.minuteOfDay, w.cloud, input.dayHours);
    this.updateLightning(dt, w);
    // Chuva, neve e tempestade escurecem o dia (e o céu fecha antes da tempestade); neve no chão clareia a noite.
    const gloom = w.cloud * 0.1 + w.rain * 0.12 + w.snow * 0.06 + w.thunder * 0.1 + w.front * 0.06;
    const night = (1 - day) * NIGHT_ALPHA * (1 - input.snowCover * 0.12);
    this.darkness = Math.min(1, night + day * gloom) * (1 - this.flashNow * 0.9);
    this.updateSun(dt, input.minuteOfDay, w, input.dayHours);
    this.updateDarkness(cam, input);
    this.updateSky(dt, v, input, day);
    this.updateFog(dt, cam, input);
    this.updateRain(v, input);
    this.updateSnow(v, input);
    this.updateLeaves(v, input);
  }

  // ---------------------------------------------------------------- relâmpago

  /**
   * Raro e forte: na tempestade, um a cada 15–45 s; trovoada distante só um
   * clarão fraco de vez em quando. Dois golpes rápidos (0,5 s) e acabou.
   */
  private updateLightning(dt: number, w: WeatherSample): void {
    this.bolt = false;
    if (this.boltT >= 0) {
      this.boltT += dt;
      const t = this.boltT;
      const f = t < 0.05 ? 1 : t < 0.1 ? 0.2 : t < 0.15 ? 0.85 : t < 0.5 ? 0.85 * (1 - (t - 0.15) / 0.35) : 0;
      this.flashNow = f * (this.boltStrong ? 1 : 0.3);
      if (t >= 0.5) this.boltT = -1;
    } else this.flashNow = 0;
    if (w.thunder < 0.2) return;
    this.nextBolt -= dt;
    if (this.nextBolt > 0) return;
    const strong = w.thunder >= 0.5;
    this.nextBolt = strong ? 15 + Math.random() * 30 : 35 + Math.random() * 40;
    this.boltT = 0;
    this.boltStrong = strong;
    this.bolt = strong;
  }
  private boltStrong = false;

  private updateSun(dt: number, minuteOfDay: number, w: WeatherSample, dayHours: number): void {
    this.sunTimer -= dt;
    if (this.sunTimer > 0) return;
    this.sunTimer = 0.5;
    const h = minuteOfDay / 60;
    // θ: 0 ao nascer (6 h) → π ao pôr (18 h).
    const theta = Math.min(Math.PI, Math.max(0, ((h - 6) / 12) * Math.PI));
    const elev = Math.sin(theta);
    const light = daylight(minuteOfDay, w.cloud, dayHours);
    const dirX = -Math.cos(theta);
    const dirY = 0.35 + 0.45 * elev;
    const len = Math.hypot(dirX, dirY) || 1;
    const sun = {
      dirX: dirX / len,
      dirY: dirY / len,
      length: Math.min(34, 11 / Math.max(0.32, elev)),
      alpha: 0.32 * light * (1 - w.cloud * 0.8),
    };
    // Só mexe em todas as sombras quando muda o suficiente para aparecer.
    const key = `${sun.dirX.toFixed(2)}|${sun.dirY.toFixed(2)}|${sun.length.toFixed(0)}|${sun.alpha.toFixed(2)}`;
    if (key === this.lastSun) return;
    this.lastSun = key;
    this.shadows.setSun(sun);
  }

  // ---------------------------------------------------------------- noite

  private updateDarkness(cam: Phaser.Cameras.Scene2D.Camera, input: AtmosphereInput): void {
    const a = this.darkness;
    if (a < 0.03) {
      this.darkImage.setVisible(false);
      return;
    }
    const view = cam.worldView;
    const w = Math.max(8, Math.ceil(cam.width / DARK_DOWNSCALE));
    const h = Math.max(8, Math.ceil(cam.height / DARK_DOWNSCALE));
    if (w !== this.rtW || h !== this.rtH) {
      this.rtW = w;
      this.rtH = h;
      this.dark.setSize(w, h);
    }
    const sx = view.width / w;
    const sy = view.height / h;
    const d = this.dark;
    const day = 1 - a / NIGHT_ALPHA;
    const color = lerpColor(NIGHT_COLOR, DUSK_COLOR, Math.max(0, Math.min(1, day * 2.2)) * 0.6);
    d.clear();
    d.fill(color, a);
    // O jogador sempre enxerga um pouco em volta (olhos acostumam).
    this.eraseLight(d, this.stampRadial, input.player.x, input.player.y, 150, 0.55, view.x, view.y, sx, sy);
    if (input.flashlight) {
      const c = this.stampCone;
      c.setRotation(input.flashlight.angle);
      c.setScale(input.flashlight.range / sx / 256, (input.flashlight.range * 0.7) / sy / 180);
      c.setAlpha(0.95);
      d.erase(c, (input.player.x - view.x) / sx, (input.player.y - view.y) / sy);
      this.eraseLight(d, this.stampRadial, input.player.x, input.player.y, 90, 0.5, view.x, view.y, sx, sy);
    }
    for (const l of input.lights) {
      const f = l.flicker ? 0.9 + 0.1 * Math.sin(this.time * 13 + l.x) * Math.sin(this.time * 7.3 + l.y) : 1;
      if (l.x < view.x - l.radius || l.x > view.x + view.width + l.radius || l.y < view.y - l.radius || l.y > view.y + view.height + l.radius) continue;
      this.eraseLight(d, this.stampRadial, l.x, l.y, l.radius * f, l.intensity, view.x, view.y, sx, sy);
    }
    d.render();
    this.darkImage.setVisible(true).setPosition(view.x, view.y).setDisplaySize(view.width, view.height);
  }

  private eraseLight(rt: Phaser.Textures.DynamicTexture, img: Phaser.GameObjects.Image, x: number, y: number, radius: number, alpha: number, vx: number, vy: number, sx: number, sy: number): void {
    img.setScale((radius * 2) / sx / 128, (radius * 2) / sy / 128);
    img.setAlpha(alpha);
    rt.erase(img, (x - vx) / sx, (y - vy) / sy);
  }

  // ---------------------------------------------------------------- céu

  private updateSky(dt: number, v: Phaser.Geom.Rectangle, input: AtmosphereInput, day: number): void {
    const w = input.weather;
    // Nuvens andam com o vento (para a esquerda, como a chuva).
    const speed = 18 + w.wind * 110;
    this.cloudX += dt * speed;
    this.cloudY += dt * speed * 0.25;
    // Sombras de nuvem: aparecem no dia de nuvens soltas; no céu fechado viram uma sombra só (gradação).
    const broken = clamp01(w.cloud * 2.4 - 0.2) * clamp01((0.95 - w.cloud) * 3.2);
    const ca = broken * 0.3 * day;
    this.clouds.setVisible(ca > 0.01);
    if (ca > 0.01) {
      this.clouds.setPosition(v.x, v.y).setSize(v.width, v.height).setAlpha(ca);
      this.clouds.setTilePosition((v.x + this.cloudX) / CLOUD_SCALE, (v.y + this.cloudY) / CLOUD_SCALE);
    }
    // Gradação (multiplica): céu pesado/chuva esfria e escurece; neve deixa tudo azulado e frio.
    const heavy = clamp01(w.cloud * 0.35 + w.rain * 0.3 + w.thunder * 0.3 + w.front * 0.12 - 0.12);
    const cold = clamp01(input.snowCover * 0.55 + w.snow * 0.35);
    let r = 1 - heavy * 0.3;
    let g = 1 - heavy * 0.25;
    let b = 1 - heavy * 0.15;
    r *= 1 - cold * 0.14;
    g *= 1 - cold * 0.08;
    b *= 1 - cold * 0.0;
    const col = (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
    this.grade.setVisible(col !== 0xffffff);
    if (col !== 0xffffff) this.grade.setPosition(v.x, v.y).setSize(v.width, v.height).setFillStyle(col, 1);
    // Relâmpago: tudo clareia um instante (dentro de casa, a luz que entra).
    this.flash.setVisible(this.flashNow > 0.01);
    if (this.flashNow > 0.01) this.flash.setPosition(v.x, v.y).setSize(v.width, v.height).setFillStyle(0xdfe8ff, this.flashNow * (input.sheltered ? 0.12 : 0.42));
  }

  // ---------------------------------------------------------------- neblina

  /**
   * Neblina de verdade: o que está LONGE some primeiro (clareira em volta do
   * jogador, menor quanto mais densa) e fiapos irregulares andando com o
   * vento. Nevasca e chuva forte também fecham a vista (mais leve).
   */
  private updateFog(dt: number, cam: Phaser.Cameras.Scene2D.Camera, input: AtmosphereInput): void {
    const w = input.weather;
    const inside = input.sheltered ? 0.25 : 1;
    const dens = clamp01(Math.max(w.fog, w.snow * w.snow * 0.7, w.rain * w.rain * 0.3)) * inside;
    if (dens < 0.02) {
      this.fogImage.setVisible(false);
      this.fogWisps.setVisible(false);
      return;
    }
    const view = cam.worldView;
    const white = w.snow > w.fog;
    const color = white ? 0xe6ebf1 : FOG_COLOR;
    // Distância: preenche e abre a clareira em volta do jogador.
    const rw = Math.max(8, Math.ceil(cam.width / FOG_DOWNSCALE));
    const rh = Math.max(8, Math.ceil(cam.height / FOG_DOWNSCALE));
    if (rw !== this.fogW || rh !== this.fogH) {
      this.fogW = rw;
      this.fogH = rh;
      this.fogRt.setSize(rw, rh);
    }
    const sx = view.width / rw;
    const sy = view.height / rh;
    const far = Math.min(0.88, 0.25 + dens * 0.7);
    const clear = 1000 - dens * 760;
    this.fogRt.clear();
    this.fogRt.fill(color, far);
    this.eraseLight(this.fogRt, this.stampRadial, input.player.x, input.player.y, clear, 0.95, view.x, view.y, sx, sy);
    this.eraseLight(this.fogRt, this.stampRadial, input.player.x, input.player.y, clear * 0.55, 0.7, view.x, view.y, sx, sy);
    this.fogRt.render();
    this.fogImage.setVisible(true).setPosition(view.x, view.y).setDisplaySize(view.width, view.height).setTint(color);
    // Fiapos: textura que anda devagar com o vento (mundo, não tela).
    this.fogX += dt * (8 + w.wind * 60);
    this.fogWisps
      .setVisible(true)
      .setPosition(view.x, view.y)
      .setSize(view.width, view.height)
      .setTint(color)
      .setAlpha(dens * 0.4)
      .setTilePosition((view.x + this.fogX) / 2.2, view.y / 2.2);
  }

  // ---------------------------------------------------------------- chuva

  private updateRain(v: Phaser.Geom.Rectangle, input: AtmosphereInput): void {
    const w = input.weather;
    this.resizeZones(v);
    // Inclinação pelo vento: a gota vem de cima e o vento empurra para a esquerda.
    const vx = -60 - w.wind * 420;
    this.rainRot = (Math.atan2(1050, vx) * 180) / Math.PI - 90;
    const raining = w.rain > 0;
    const show = raining && !input.sheltered;
    this.rain.setPosition(v.x, v.y);
    this.rainNear.setPosition(v.x, v.y);
    if (show) {
      this.rain.speedX = vx;
      this.rain.setFrequency(1000 / (40 + w.rain * 520), 1);
      if (!this.rain.emitting) this.rain.start();
      // Gotas grandes perto: só na chuva forte.
      if (w.rain > 0.3) {
        this.rainNear.speedX = vx * 1.5;
        this.rainNear.setFrequency(1000 / (w.rain * 70), 1);
        if (!this.rainNear.emitting) this.rainNear.start();
      } else if (this.rainNear.emitting) this.rainNear.stop();
    } else {
      if (this.rain.emitting) this.rain.stop();
      if (this.rainNear.emitting) this.rainNear.stop();
    }
    // Debaixo de telhado a chuva continua lá fora, mas não em cima de você.
    this.rain.setVisible(!input.sheltered);
    this.rainNear.setVisible(!input.sheltered);
    // Respingos no chão de fora (vistos de dentro também).
    if (raining) {
      this.splash.setFrequency(1000 / (12 + w.rain * 150), 1);
      if (!this.splash.emitting) this.splash.start();
    } else if (this.splash.emitting) this.splash.stop();
  }

  private resizeZones(v: Phaser.Geom.Rectangle): void {
    if (Math.abs(this.zones.w - v.width) < 4 && Math.abs(this.zones.h - v.height) < 4) return;
    this.zones = { w: v.width, h: v.height };
    const zone = (e: Emitter, r: Phaser.Geom.Rectangle) => {
      e.clearEmitZones();
      e.addEmitZone({ type: 'random', source: r, quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData);
    };
    // Chuva nasce numa faixa acima da tela (mais larga: o vento puxa de lado).
    zone(this.rain, new Phaser.Geom.Rectangle(-v.width * 0.1, -60, v.width * 1.6, 30));
    this.rain.lifespan = ((v.height + 120) / 1000) * 1000;
    zone(this.rainNear, new Phaser.Geom.Rectangle(0, -v.height * 0.1, v.width * 1.3, v.height * 1.1));
    // Neve nasce espalhada pela tela (poucos flocos vivos de cada vez).
    zone(this.snow, new Phaser.Geom.Rectangle(-v.width * 0.1, -v.height * 0.1, v.width * 1.4, v.height * 1.05));
    zone(this.snowNear, new Phaser.Geom.Rectangle(-v.width * 0.1, -v.height * 0.1, v.width * 1.4, v.height * 1.05));
    zone(this.drift, new Phaser.Geom.Rectangle(v.width * 0.3, 0, v.width * 0.9, v.height));
    zone(this.leaves, new Phaser.Geom.Rectangle(v.width * 0.5, -v.height * 0.1, v.width * 0.7, v.height * 1.2));
  }

  // ---------------------------------------------------------------- neve

  private updateSnow(v: Phaser.Geom.Rectangle, input: AtmosphereInput): void {
    const w = input.weather;
    const falling = w.snow > 0 && !input.sheltered;
    for (const e of [this.snow, this.snowNear, this.drift]) e.setPosition(v.x, v.y).setVisible(!input.sheltered);
    // Vento empurra os flocos de lado (nevasca quase na horizontal): aceleração lateral.
    const push = (-15 - w.wind * 240) / 1.2;
    if (falling) {
      this.snow.gravityX = push;
      this.snow.setFrequency(1000 / (25 + w.snow * 110), 1);
      if (!this.snow.emitting) this.snow.start();
      this.snowNear.gravityX = push * 1.3;
      this.snowNear.setFrequency(1000 / (4 + w.snow * 32), 1);
      if (!this.snowNear.emitting) this.snowNear.start();
    } else {
      if (this.snow.emitting) this.snow.stop();
      if (this.snowNear.emitting) this.snowNear.stop();
    }
    // Neve arrastada rente ao chão: vento forte com neve caindo ou neve fofa no chão.
    const driftK = !input.sheltered ? clamp01((w.wind - 0.45) * 2.2) * clamp01(w.snow * 2 + (input.snowCover - 0.5) * 1.4) : 0;
    if (driftK > 0.02) {
      this.drift.setFrequency(1000 / (driftK * 90), 1);
      if (!this.drift.emitting) this.drift.start();
    } else if (this.drift.emitting) this.drift.stop();
  }

  // ---------------------------------------------------------------- vento: folhas

  private updateLeaves(v: Phaser.Geom.Rectangle, input: AtmosphereInput): void {
    const w = input.weather;
    this.leaves.setPosition(v.x, v.y).setVisible(!input.sheltered);
    // Folhas soltas: mais no outono (caindo) e com vento; nada com neve cobrindo tudo.
    const loose = clamp01(0.25 + input.leafColor * 0.9) * clamp01(input.leafCover + 0.2) * (1 - input.snowCover);
    const k = !input.sheltered && w.precip < 0.6 ? clamp01((w.wind - 0.3) * 2.2) * loose : 0;
    if (k > 0.03) {
      const t = input.leafColor;
      this.leafTints = t < 0.25 ? [0x6f8a4a, 0x5d7a3f, 0x7f9a52] : t < 0.7 ? [0xc9a23c, 0xd9892f, 0x9a8a3a, 0x6f8a4a] : [0xb86a2c, 0x9c4a26, 0xc98a3a, 0x7a5a38];
      this.leaves.setFrequency(1000 / (k * 26), 1);
      if (!this.leaves.emitting) this.leaves.start();
    } else if (this.leaves.emitting) this.leaves.stop();
  }
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const r = Math.round(ar + (((b >> 16) & 255) - ar) * t);
  const g = Math.round(ag + (((b >> 8) & 255) - ag) * t);
  const bl = Math.round(ab + ((b & 255) - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
