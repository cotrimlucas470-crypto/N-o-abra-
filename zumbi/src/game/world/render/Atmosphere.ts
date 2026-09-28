/**
 * Atmosfera (parte Phaser): noite e luzes, sol e sombras, céu, chuva, neve,
 * neblina, vento e tempestade. Tudo visual — quem decide hora, clima e luzes
 * é a lógica pura (Weather/Ground).
 *
 * - NOITE: textura pequena (1/5 da tela) pintada de escuro e "apagada" onde há
 *   luz (em volta do jogador, lanterna, fogueiras). Neve no chão clareia a noite.
 * - CÉU: um shader (weatherShaders SKY_FRAG) com sombras de NUVENS passando
 *   pelo mapa com o vento (dia de poucas nuvens) e a NEBLINA em camadas; mais
 *   uma GRADAÇÃO de cor por multiplicação (sol quente, nublado frio, chuva
 *   azul-esverdeada, neve azulada, fim de tarde alaranjado) — muda a cor da
 *   cena sem pôr véu por cima. Antes da tempestade, escurece.
 * - CHUVA: riscos inclinados pelo vento (mais e mais longos com a força), gotas
 *   grandes perto da "câmera" na chuva forte e RESPINGOS só no chão de fora
 *   (dentro de casa, vê-se a chuva batendo lá fora pela área aberta).
 * - NEVE: flocos longe (pequenos, lentos) e perto (grandes e desfocados),
 *   empurrados pelo vento; na nevasca, neve arrastada rente ao chão.
 * - VENTO: folhas voando (cor da estação); árvores balançam (SeasonDressing).
 * - NEBLINA: some primeiro o que está longe (clareira em volta do jogador que
 *   encolhe com a densidade), bancos e fiapos que andam com o vento; dentro da
 *   casa em que o jogador está quase não entra.
 * - RELÂMPAGO: raro e forte — dois clarões rápidos que iluminam tudo e o
 *   risco do raio no céu por um instante.
 *
 * Barato no celular: partículas só na área da tela, quantidade pela
 * intensidade (nunca milhares); o céu é 1 quad, escondido sem nuvem nem neblina.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { TEX } from '../../assets/AssetKeys';
import { SKY_FRAG } from './weatherShaders';
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
  /** Construção em que o jogador está e quanto o telhado dela já sumiu (1 = dentro): a neblina não entra. */
  inside: { x: number; y: number; w: number; h: number; k: number } | null;
}

/** Resolução da textura da noite: 1 px para cada N px de tela. */
const DARK_DOWNSCALE = 5;
/** Noite azulada (luar), não preta. */
const NIGHT_COLOR = 0x060b1d;
const DUSK_COLOR = 0x1c1008;
/** Escuridão máxima (lua e céu ainda deixam ver um pouco). */
const NIGHT_ALPHA = 0.84;
const FOG_COLOR = [0.82, 0.85, 0.88];
const FOG_WHITE = [0.9, 0.92, 0.95];

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export class Atmosphere {
  private readonly darkKey = 'fx.darkness';
  private dark: Phaser.Textures.DynamicTexture;
  private readonly darkImage: Phaser.GameObjects.Image;
  /** Nuvens e neblina (shader do tamanho da tela). */
  private readonly sky: Phaser.GameObjects.Shader | null = null;
  private readonly boltImage: Phaser.GameObjects.Image;
  private readonly skyU = {
    wind: [0, 0],
    drift: [0, 0],
    cloud: 0,
    fog: 0,
    fogColor: FOG_COLOR,
    player: [0, 0],
    clear: 1000,
    inside: [0, 0, 0, 0],
    insideK: 0,
  };
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
  /** Construção em que o jogador está (com o telhado já sumindo): chuva e neve não caem lá dentro. */
  private insideRect: { x: number; y: number; w: number; h: number } | null = null;
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
  private fogY = 0;
  private rtW = 0;
  private rtH = 0;
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
    // Nuvens e neblina por cima de tudo do mundo (inclusive telhados), abaixo da noite.
    if (scene.game.renderer.type === Phaser.WEBGL) {
      const u = this.skyU;
      this.sky = scene.add
        .shader(
          {
            name: 'WeatherSky',
            fragmentSource: SKY_FRAG,
            setupUniforms: (set: (name: string, value: unknown) => void) => {
              set('uNoiseA', 0);
              set('uNoiseB', 1);
              set('uWind', u.wind);
              set('uFogDrift', u.drift);
              set('uCloud', u.cloud);
              set('uFog', u.fog);
              set('uFogColor', u.fogColor);
              set('uPlayer', u.player);
              set('uClear', u.clear);
              set('uInside', u.inside);
              set('uInsideK', u.insideK);
            },
          },
          0,
          0,
          16,
          16,
          [TEX.noiseA, TEX.noiseB],
        )
        .setOrigin(0, 0)
        .setDepth(DEPTH.roofDoor + 1)
        .setVisible(false);
    }
    // Risco do raio no céu (só no golpe forte, por um instante).
    this.boltImage = scene.add.image(0, 0, TEX.bolt).setDepth(DEPTH.atmosphere + 2.6).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    // Carimbos (não vão para a tela: só servem para apagar a escuridão/neblina).
    this.stampRadial = new Phaser.GameObjects.Image(scene, 0, 0, TEX.lightRadial);
    this.stampCone = new Phaser.GameObjects.Image(scene, 0, 0, TEX.lightCone).setOrigin(0, 0.5);
    // Gradação de cor (multiplica): céu pesado, chuva, frio.
    this.grade = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 1).setOrigin(0, 0).setDepth(DEPTH.atmosphere - 1).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(false);
    this.flash = scene.add.rectangle(0, 0, 10, 10, 0xeef3ff, 0).setOrigin(0, 0).setDepth(DEPTH.atmosphere + 3).setBlendMode(Phaser.BlendModes.ADD);

    const rot = { onEmit: () => this.rainRot };
    // Chuva e neve nascem em pontos do MUNDO na tela, fora da construção em que o
    // jogador está (e morrem se entrarem nela): de dentro, vê-se a chuva lá fora.
    const self0 = this;
    const skyPoint = {
      getRandomPoint(p: Phaser.Types.Math.Vector2Like) {
        const v = self0.view;
        const r = self0.insideRect;
        let x = v.x;
        let y = v.y;
        for (let k = 0; k < 5; k++) {
          x = v.x - 60 + Math.random() * (v.width + 120);
          y = v.y - 60 + Math.random() * (v.height + 80);
          if (!r || x < r.x || y < r.y || x > r.x + r.w || y > r.y + r.h) break;
        }
        p.x = x;
        p.y = y;
      },
    };
    const indoors = {
      contains(x: number, y: number) {
        const r = self0.insideRect;
        return !!r && x > r.x && y > r.y && x < r.x + r.w && y < r.y + r.h;
      },
    };
    const zone = { type: 'random', source: skyPoint } as unknown as Phaser.Types.GameObjects.Particles.EmitZoneData;
    const death = { type: 'onEnter', source: indoors } as unknown as Phaser.Types.GameObjects.Particles.DeathZoneObject;
    // Riscos finos e compridos, uns mais fortes que outros.
    this.rain = scene.add.particles(0, 0, TEX.rainDrop, {
      lifespan: 240,
      emitZone: zone,
      deathZone: death,
      speedY: { min: 900, max: 1150 },
      speedX: -100,
      rotate: rot,
      scaleX: { min: 0.8, max: 1.2 },
      scaleY: { min: 0.8, max: 1.5 },
      alpha: { start: 0.7, end: 0.22 },
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
      emitZone: zone,
      deathZone: death,
      speedY: { min: 45, max: 95 },
      speedX: { min: -25, max: 25 },
      scale: { min: 0.35, max: 0.9 },
      alpha: { start: 1, end: 0.15 },
      frequency: 50,
      emitting: false,
    });
    this.snow.setDepth(DEPTH.atmosphere + 2);
    // Perto da "câmera": flocos grandes e desfocados, poucos.
    this.snowNear = scene.add.particles(0, 0, TEX.snowBokeh, {
      lifespan: 1500,
      speedY: { min: 120, max: 190 },
      speedX: { min: -30, max: 30 },
      scale: { min: 0.45, max: 1.1 },
      alpha: { start: 0.8, end: 0 },
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
    });
  }

  /** O que é da tela (noite, céu, neblina, partículas): outra câmera não desenha. */
  screenObjects(): Phaser.GameObjects.GameObject[] {
    const list: Phaser.GameObjects.GameObject[] = [this.darkImage, this.grade, this.flash, this.boltImage, this.rain, this.rainNear, this.splash, this.snow, this.snowNear, this.drift, this.leaves];
    if (this.sky) list.push(this.sky);
    return list;
  }

  update(dt: number, cam: Phaser.Cameras.Scene2D.Camera, input: AtmosphereInput): void {
    this.time += dt;
    const w = input.weather;
    const v = cam.worldView;
    this.view.setTo(v.x, v.y, v.width, v.height);
    // A noite vem da HORA; o céu fechado escurece pelo "gloom" (o olho acostuma com o dia nublado).
    const day = daylight(input.minuteOfDay, 0, input.dayHours);
    this.updateLightning(dt, w);
    // Chuva, neve e tempestade escurecem o dia (e o céu fecha antes da tempestade); neve no chão clareia a noite.
    // Neve no chão devolve a luz: o dia de neve é claro, não sombrio.
    const gloom = (w.cloud * 0.1 + w.rain * 0.12 + w.snow * 0.06 + w.thunder * 0.1 + w.front * 0.06) * (1 - input.snowCover * 0.55);
    const night = (1 - day) * NIGHT_ALPHA * (1 - input.snowCover * 0.12);
    this.darkness = Math.min(1, night + day * gloom) * (1 - this.flashNow * 0.9);
    this.updateSun(dt, input.minuteOfDay, w, input.dayHours);
    this.updateDarkness(cam, input);
    this.updateSky(dt, v, input, day);
    this.updateFog(dt, v, input);
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
    const u = this.skyU;
    // Nuvens andam com o vento (para a esquerda, como a chuva).
    const speed = 18 + w.wind * 110;
    this.cloudX += dt * speed;
    this.cloudY += dt * speed * 0.25;
    u.wind = [this.cloudX, this.cloudY];
    // Sombras de nuvem: aparecem no dia de nuvens soltas; no céu fechado viram uma sombra só (gradação).
    const broken = clamp01(w.cloud * 2.4 - 0.2) * clamp01((0.95 - w.cloud) * 3.2);
    u.cloud = broken * 0.34 * day;
    // Gradação (multiplica): céu pesado/chuva esfria e escurece; neve deixa tudo azulado e claro.
    const heavy = clamp01(w.cloud * 0.35 + w.rain * 0.3 + w.thunder * 0.3 + w.front * 0.12 - 0.12 - input.snowCover * 0.15);
    const cold = clamp01(input.snowCover * 0.55 + w.snow * 0.35);
    const wetK = clamp01(w.rain * 1.4);
    let r = 1 - heavy * 0.3;
    let g = 1 - heavy * 0.25;
    let b = 1 - heavy * 0.15;
    // Chuva: verde-azulado frio (a grama molhada fica mais verde, o resto apaga).
    r *= 1 - wetK * 0.1;
    g *= 1 - wetK * 0.03;
    r *= 1 - cold * 0.12;
    g *= 1 - cold * 0.06;
    // Sol baixo e céu limpo: luz dourada no começo e no fim do dia.
    const hr = input.minuteOfDay / 60;
    const half = input.dayHours / 2;
    const toEdge = Math.min(Math.abs(hr - (12.3 - half)), Math.abs(hr - (12.3 + half)));
    const golden = clamp01(1 - toEdge / 1.6) * clamp01(1 - w.cloud * 1.3) * day;
    r *= 1 - golden * 0.02;
    g *= 1 - golden * 0.14;
    b *= 1 - golden * 0.32;
    // Sol forte de verão: um pouco mais quente.
    const warm = clamp01(1 - w.cloud * 2) * day * (1 - cold) * 0.5;
    b *= 1 - warm * 0.08;
    g *= 1 - warm * 0.02;
    const col = (Math.round(clamp01(r) * 255) << 16) | (Math.round(clamp01(g) * 255) << 8) | Math.round(clamp01(b) * 255);
    this.grade.setVisible(col !== 0xffffff);
    if (col !== 0xffffff) this.grade.setPosition(v.x, v.y).setSize(v.width, v.height).setFillStyle(col, 1);
    // Relâmpago: tudo clareia um instante (dentro de casa, a luz que entra) e o risco aparece no céu.
    this.flash.setVisible(this.flashNow > 0.01);
    if (this.flashNow > 0.01) this.flash.setPosition(v.x, v.y).setSize(v.width, v.height).setFillStyle(0xdfe8ff, this.flashNow * (input.sheltered ? 0.12 : 0.42));
    const showBolt = this.boltStrong && this.boltT >= 0 && this.boltT < 0.35 && !input.sheltered;
    if (showBolt) {
      if (!this.boltImage.visible) {
        const sc = (v.height / 440) * (0.7 + Math.random() * 0.5);
        this.boltImage
          .setScale(sc)
          .setFlipX(Math.random() < 0.5)
          .setPosition(v.x + v.width * (0.15 + Math.random() * 0.7), v.y + 220 * sc);
      }
      this.boltImage.setVisible(true).setAlpha(Math.min(1, this.flashNow * 1.3));
    } else if (this.boltImage.visible) this.boltImage.setVisible(false);
  }

  // ---------------------------------------------------------------- neblina

  /**
   * Neblina de verdade (no shader do céu): o que está LONGE some primeiro
   * (clareira em volta do jogador, menor quanto mais densa), bancos e fiapos
   * andando com o vento. Nevasca e chuva forte também fecham a vista (mais
   * leve). Dentro da casa em que o jogador está quase não entra.
   */
  private updateFog(dt: number, v: Phaser.Geom.Rectangle, input: AtmosphereInput): void {
    const w = input.weather;
    const u = this.skyU;
    const dens = clamp01(Math.max(w.fog, w.snow * w.snow * w.snow * 0.55, w.rain * w.rain * 0.12));
    u.fog = dens < 0.02 ? 0 : Math.min(0.95, dens * 1.05);
    u.fogColor = w.snow > w.fog ? FOG_WHITE : FOG_COLOR;
    u.clear = 1000 - dens * 760;
    u.player = [input.player.x, input.player.y];
    this.fogX += dt * (8 + w.wind * 60);
    this.fogY += dt * (2 + w.wind * 8);
    u.drift = [this.fogX, this.fogY];
    const ins = input.inside;
    u.inside = ins ? [ins.x, ins.y, ins.w, ins.h] : [0, 0, 0, 0];
    u.insideK = ins?.k ?? 0;
    const sky = this.sky;
    if (!sky) return;
    const on = u.fog > 0 || u.cloud > 0.01;
    sky.setVisible(on);
    if (!on) return;
    // O quad cobre a tela (com folga) e a coordenada de textura é o mundo.
    const x0 = v.x - 8;
    const y0 = v.y - 8;
    const x1 = v.x + v.width + 8;
    const y1 = v.y + v.height + 8;
    sky.setPosition(x0, y0).setSize(x1 - x0, y1 - y0);
    sky.textureCoordinateTopLeft.set(x0, y0);
    sky.textureCoordinateTopRight.set(x1, y0);
    sky.textureCoordinateBottomLeft.set(x0, y1);
    sky.textureCoordinateBottomRight.set(x1, y1);
  }

  // ---------------------------------------------------------------- chuva

  private updateRain(v: Phaser.Geom.Rectangle, input: AtmosphereInput): void {
    const w = input.weather;
    this.resizeZones(v);
    const ins = input.inside;
    this.insideRect = ins && ins.k > 0.3 ? ins : null;
    // Inclinação pelo vento: a gota vem de cima e o vento empurra para a esquerda.
    const vx = -60 - w.wind * 420;
    this.rainRot = (Math.atan2(1050, vx) * 180) / Math.PI - 90;
    const raining = w.rain > 0;
    if (raining) {
      this.rain.speedX = vx;
      // Muitos riscos curtos espalhados pela tela (vivem ~0,25 s).
      this.rain.setFrequency(1000 / (120 + w.rain * 1500), 1);
      if (!this.rain.emitting) this.rain.start();
      // Gotas grandes perto da "câmera": só na chuva forte e com o jogador fora.
      if (w.rain > 0.3 && !input.sheltered) {
        this.rainNear.speedX = vx * 1.5;
        this.rainNear.setFrequency(1000 / (w.rain * 70), 1);
        if (!this.rainNear.emitting) this.rainNear.start();
      } else if (this.rainNear.emitting) this.rainNear.stop();
    } else {
      if (this.rain.emitting) this.rain.stop();
      if (this.rainNear.emitting) this.rainNear.stop();
    }
    this.rainNear.setPosition(v.x, v.y).setVisible(!input.sheltered);
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
    zone(this.rainNear, new Phaser.Geom.Rectangle(0, -v.height * 0.1, v.width * 1.3, v.height * 1.1));
    zone(this.snowNear, new Phaser.Geom.Rectangle(-v.width * 0.1, -v.height * 0.1, v.width * 1.4, v.height * 1.05));
    zone(this.drift, new Phaser.Geom.Rectangle(v.width * 0.3, 0, v.width * 0.9, v.height));
    zone(this.leaves, new Phaser.Geom.Rectangle(v.width * 0.5, -v.height * 0.1, v.width * 0.7, v.height * 1.2));
  }

  // ---------------------------------------------------------------- neve

  private updateSnow(v: Phaser.Geom.Rectangle, input: AtmosphereInput): void {
    const w = input.weather;
    const falling = w.snow > 0;
    // Flocos de longe: no mundo, fora da casa do jogador; perto e arrastados: só com o jogador fora.
    for (const e of [this.snowNear, this.drift]) e.setPosition(v.x, v.y).setVisible(!input.sheltered);
    // Vento empurra os flocos de lado (nevasca quase na horizontal): aceleração lateral.
    const push = (-15 - w.wind * 240) / 1.2;
    if (falling) {
      this.snow.gravityX = push;
      this.snow.setFrequency(1000 / (30 + w.snow * 180), 1);
      if (!this.snow.emitting) this.snow.start();
      this.snowNear.gravityX = push * 1.3;
      this.snowNear.setFrequency(1000 / (4 + w.snow * 32), 1);
      if (!input.sheltered && !this.snowNear.emitting) this.snowNear.start();
      else if (input.sheltered && this.snowNear.emitting) this.snowNear.stop();
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
