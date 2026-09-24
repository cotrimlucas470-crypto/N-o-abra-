/**
 * Atmosfera: noite, luzes, sombras do sol, chuva e neblina (parte Phaser).
 *
 * - NOITE: uma textura dinâmica pequena (1/5 da tela) pintada de escuro e
 *   "apagada" onde há luz (em volta do jogador, facho da lanterna, fogueiras),
 *   esticada por cima do mundo. Barato no celular: poucos pixels, poucos desenhos.
 * - SOL: gira as sombras ao longo do dia (manhã para oeste, tarde para leste,
 *   meio-dia para o sul — hemisfério sul) e some com elas à noite.
 * - CHUVA: partículas presas à câmera, quantidade pela intensidade; some quando
 *   o jogador está debaixo de telhado. NEBLINA: véu claro por cima.
 *
 * Nada de regra aqui: quem decide hora, clima e luzes é a lógica pura.
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
  /** Jogador debaixo de telhado: sem chuva caindo em cima. */
  sheltered: boolean;
  player: { x: number; y: number };
  /** Lanterna ligada: direção (rad) e alcance (px). */
  flashlight: { angle: number; range: number } | null;
  lights: readonly LightSource[];
}

/** Resolução da textura da noite: 1 px para cada N px de tela. */
const DARK_DOWNSCALE = 5;
const NIGHT_COLOR = 0x03050c;
const DUSK_COLOR = 0x1c1008;
/** Escuridão máxima (lua e céu ainda deixam ver um pouco). */
const NIGHT_ALPHA = 0.84;

export class Atmosphere {
  private readonly darkKey = 'fx.darkness';
  private dark: Phaser.Textures.DynamicTexture;
  private readonly darkImage: Phaser.GameObjects.Image;
  private readonly stampRadial: Phaser.GameObjects.Image;
  private readonly stampCone: Phaser.GameObjects.Image;
  private readonly fog: Phaser.GameObjects.Rectangle;
  private readonly tint: Phaser.GameObjects.Rectangle;
  private readonly rain: Phaser.GameObjects.Particles.ParticleEmitter;
  private rtW = 0;
  private rtH = 0;
  private sunTimer = 0;
  private lastSun = '';
  private time = 0;
  private zoneW = 0;
  private zoneH = 0;
  /** Escuridão atual 0..1 (para o HUD e testes). */
  darkness = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly shadows: ShadowSystem,
  ) {
    this.dark = scene.textures.addDynamicTexture(this.darkKey, 16, 16)!;
    this.darkImage = scene.add.image(0, 0, this.darkKey).setOrigin(0, 0).setDepth(DEPTH.atmosphere).setVisible(false);
    // Carimbos (não vão para a tela: só servem para apagar a escuridão).
    this.stampRadial = new Phaser.GameObjects.Image(scene, 0, 0, TEX.lightRadial);
    this.stampCone = new Phaser.GameObjects.Image(scene, 0, 0, TEX.lightCone).setOrigin(0, 0.5);
    this.tint = scene.add.rectangle(0, 0, 10, 10, 0x0a1830, 0).setOrigin(0, 0).setDepth(DEPTH.atmosphere - 1);
    this.fog = scene.add.rectangle(0, 0, 10, 10, 0xc8ccd0, 0).setOrigin(0, 0).setDepth(DEPTH.atmosphere + 1);
    this.rain = scene.add.particles(0, 0, TEX.rainDrop, {
      lifespan: 520,
      speedY: { min: 900, max: 1150 },
      speedX: { min: -140, max: -90 },
      scale: { min: 0.8, max: 1.3 },
      alpha: { start: 0.75, end: 0.3 },
      frequency: 20,
      quantity: 0,
      emitting: false,
    });
    // O emissor anda com a câmera (a chuva fica "presa" à tela, como deve parecer).
    this.rain.setDepth(DEPTH.atmosphere + 2);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stampRadial.destroy();
      this.stampCone.destroy();
      if (scene.textures.exists(this.darkKey)) scene.textures.remove(this.darkKey);
    });
  }

  update(dt: number, cam: Phaser.Cameras.Scene2D.Camera, input: AtmosphereInput): void {
    this.time += dt;
    const w = input.weather;
    const day = daylight(input.minuteOfDay, w.cloud);
    // Chuva e nuvens escurecem o dia um pouco.
    const gloom = w.cloud * 0.12 + w.rain * 0.15;
    this.darkness = Math.min(1, (1 - day) * NIGHT_ALPHA + day * gloom);
    this.updateSun(dt, input.minuteOfDay, w);
    this.updateDarkness(cam, input);
    this.updateOverlays(cam, input);
  }

  // ---------------------------------------------------------------- sol

  private updateSun(dt: number, minuteOfDay: number, w: WeatherSample): void {
    this.sunTimer -= dt;
    if (this.sunTimer > 0) return;
    this.sunTimer = 0.5;
    const h = minuteOfDay / 60;
    // θ: 0 ao nascer (6 h) → π ao pôr (18 h).
    const theta = Math.min(Math.PI, Math.max(0, ((h - 6) / 12) * Math.PI));
    const elev = Math.sin(theta);
    const light = daylight(minuteOfDay, w.cloud);
    const dirX = -Math.cos(theta);
    const dirY = 0.35 + 0.45 * elev;
    const len = Math.hypot(dirX, dirY) || 1;
    const sun = {
      dirX: dirX / len,
      dirY: dirY / len,
      length: Math.min(34, 11 / Math.max(0.32, elev)),
      alpha: 0.32 * light * (1 - w.cloud * 0.75),
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
    // Um pouco de margem: a imagem cobre a tela mesmo com a câmera tremendo.
    const sx = view.width / w;
    const sy = view.height / h;
    const d = this.dark;
    const day = 1 - a / NIGHT_ALPHA;
    const color = lerpColor(NIGHT_COLOR, DUSK_COLOR, Math.max(0, Math.min(1, day * 2.2)) * 0.6);
    d.clear();
    d.fill(color, a);
    // O jogador sempre enxerga um pouco em volta (olhos acostumam).
    this.eraseLight(this.stampRadial, input.player.x, input.player.y, 150, 0.55, view.x, view.y, sx, sy);
    if (input.flashlight) {
      const c = this.stampCone;
      c.setRotation(input.flashlight.angle);
      c.setScale(input.flashlight.range / sx / 256, (input.flashlight.range * 0.7) / sy / 180);
      c.setAlpha(0.95);
      d.erase(c, (input.player.x - view.x) / sx, (input.player.y - view.y) / sy);
      this.eraseLight(this.stampRadial, input.player.x, input.player.y, 90, 0.5, view.x, view.y, sx, sy);
    }
    for (const l of input.lights) {
      const f = l.flicker ? 0.9 + 0.1 * Math.sin(this.time * 13 + l.x) * Math.sin(this.time * 7.3 + l.y) : 1;
      if (l.x < view.x - l.radius || l.x > view.x + view.width + l.radius || l.y < view.y - l.radius || l.y > view.y + view.height + l.radius) continue;
      this.eraseLight(this.stampRadial, l.x, l.y, l.radius * f, l.intensity, view.x, view.y, sx, sy);
    }
    d.render();
    this.darkImage.setVisible(true).setPosition(view.x, view.y).setDisplaySize(view.width, view.height);
  }

  private eraseLight(img: Phaser.GameObjects.Image, x: number, y: number, radius: number, alpha: number, vx: number, vy: number, sx: number, sy: number): void {
    img.setScale((radius * 2) / sx / 128, (radius * 2) / sy / 128);
    img.setAlpha(alpha);
    this.dark.erase(img, (x - vx) / sx, (y - vy) / sy);
  }

  // ---------------------------------------------------------------- chuva e neblina

  private updateOverlays(cam: Phaser.Cameras.Scene2D.Camera, input: AtmosphereInput): void {
    const w = input.weather;
    const v = cam.worldView;
    this.fog.setPosition(v.x, v.y).setSize(v.width, v.height).setFillStyle(0xc8ccd0, w.fog * 0.32);
    // Chuva azula e escurece um pouco a cena.
    this.tint.setPosition(v.x, v.y).setSize(v.width, v.height).setFillStyle(0x0a1830, Math.min(0.22, w.rain * 0.2 + w.cloud * 0.05));
    this.rain.setPosition(v.x, v.y);
    const raining = w.rain > 0 && !input.sheltered;
    if (raining) {
      const perSecond = 60 + w.rain * 420;
      this.rain.setFrequency(1000 / perSecond, 1);
      if (Math.abs(this.zoneW - v.width) > 4 || Math.abs(this.zoneH - v.height) > 4) {
        this.zoneW = v.width;
        this.zoneH = v.height;
        this.rain.clearEmitZones();
        this.rain.addEmitZone({ type: 'random', source: new Phaser.Geom.Rectangle(-v.width * 0.1, -60, v.width * 1.35, 30), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData);
        this.rain.lifespan = ((v.height + 120) / 1000) * 1000;
      }
      this.rain.speedX = -80 - w.wind * 260;
      if (!this.rain.emitting) this.rain.start();
    } else if (this.rain.emitting) {
      this.rain.stop();
    }
    // Debaixo de telhado a chuva continua lá fora, mas não em cima de você.
    this.rain.setVisible(!input.sheltered);
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
