/**
 * Clima no CHÃO (parte Phaser): um shader só, do tamanho da cidade, logo
 * acima do chão e da pintura da rua (abaixo de sangue, pegadas, objetos e
 * paredes). Ele calcula neve, geada, chão molhado, poças com anéis de gota,
 * gelo e folhas caídas pixel a pixel (ver weatherShaders.ts), lendo:
 *
 * - os dados por tile da cidade (world/weatherCells.ts), suavizados;
 * - o PISADO: onde o jogador anda e o carro passa, a neve fica compactada e
 *   cinza; neve nova por cima apaga devagar. Gravado numa textura pequena e
 *   reenviado no máximo 2 vezes por segundo;
 * - o estado do clima (números por quadro, nada é redesenhado).
 *
 * Dentro das construções e na faixa dos andares não desenha nada. Sem neve,
 * água, geada nem folhas, o shader fica escondido (custo zero).
 */
import Phaser from 'phaser';
import { DEPTH, TILE } from '../../config/GameConfig';
import { TEX } from '../../assets/AssetKeys';
import { clamp } from '../../core/math';
import { buildWeatherCells, TILE_STEP, type WeatherCells } from '../weatherCells';
import type { WorldModel } from '../WorldModel';
import { GROUND_FRAG } from './weatherShaders';

export interface GroundLook {
  /** Cobertura de neve 0..1. */
  snow: number;
  /** Geada 0..1. */
  frost: number;
  /** Superfície molhada 0..1. */
  wet: number;
  /** Água acumulada (poças) 0..1. */
  puddle: number;
  ice: number;
  /** Horas desde a última nevada. */
  sinceSnow: number;
  /** Derretendo 0..1. */
  melting: number;
  /** Chuva caindo agora 0..1. */
  rain: number;
  /** Luz do dia 0..1. */
  day: number;
  /** Folhas caídas no chão (outono) 0..1 e tom (0 amarelo → 1 marrom). */
  leaves: number;
  leafTone: number;
  /** Fase da grama na época (0..6, circular; ver sim/Climate grassStage). */
  grass: number;
}

/**
 * Cor da grama por fase (a de verão é a do próprio desenho): 0 verão,
 * 1 seca, 2 amarelando, 3 marrom, 4 morta (inverno), 5 rebrotando.
 */
const GRASS_TONES: readonly (readonly [number, number, number])[] = [
  [0x5d, 0x72, 0x49],
  [0x6a, 0x72, 0x46],
  [0x7c, 0x74, 0x45],
  [0x78, 0x68, 0x48],
  [0x6c, 0x67, 0x55],
  [0x5a, 0x7e, 0x42],
];
const tone = (p: number) => GRASS_TONES[p]!.map((v) => v / 255);

const KEY_CELLS = 'weather.cells';
const KEY_MATS = 'weather.mats';
const KEY_TRAMP = 'weather.tramp';
/** Reenvio do pisado (s). */
const TRAMP_UPLOAD = 0.5;

export class GroundWeatherLayer {
  private readonly shader: Phaser.GameObjects.Shader | null = null;
  private readonly data: WeatherCells;
  private readonly w: number;
  /** Pisado (0..1) por tile — só os tiles que já foram pisados. */
  private readonly packed = new Map<number, number>();
  private readonly trampBytes: Uint8Array;
  private trampTex: Phaser.Textures.Texture | null = null;
  private trampDirty = false;
  private trampClock = 0;
  private time = 0;
  private look: GroundLook = { snow: 0, frost: 0, wet: 0, puddle: 0, ice: 0, sinceSnow: 999, melting: 0, rain: 0, day: 1, leaves: 0, leafTone: 0, grass: 0 };
  private grassFrom = tone(0);
  private grassTo = tone(1);
  private grassA = [0, 1];
  private grassT = 0;
  private weatherOn = false;
  private old = 0;
  /** Mostrar os dados por tile no lugar do clima (debug). */
  debugView = false;

  constructor(
    private readonly scene: Phaser.Scene,
    model: WorldModel,
  ) {
    const d = buildWeatherCells(model);
    this.data = d;
    this.w = d.w;
    this.trampBytes = new Uint8Array(d.w * d.h * 4);
    for (let i = 0; i < d.w * d.h; i++) {
      this.trampBytes[i * 4] = Math.round(d.trampBase[i]! * 255);
      this.trampBytes[i * 4 + 3] = 255;
    }
    // Sem WebGL (canvas) não há shader: o clima no chão simplesmente não aparece.
    if (scene.game.renderer.type !== Phaser.WEBGL) return;
    this.fillTileBrightness(d);
    const textures = scene.textures;
    for (const k of [KEY_CELLS, KEY_MATS, KEY_TRAMP]) if (textures.exists(k)) textures.remove(k);
    textures.addUint8Array(KEY_CELLS, d.cells, d.w, d.h)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    textures.addUint8Array(KEY_MATS, d.mats, d.w, d.h)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.trampTex = textures.addUint8Array(KEY_TRAMP, this.trampBytes, d.w, d.h);
    this.trampTex?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const tiles = textures.get(TEX.tiles).getSourceImage() as { width: number; height: number };
    const wPx = d.w * TILE;
    const hPx = d.h * TILE;
    const shader = scene.add.shader(
      {
        name: 'GroundWeather',
        fragmentSource: GROUND_FRAG,
        setupUniforms: (set: (name: string, value: unknown) => void) => {
          const l = this.look;
          set('uNoiseA', 0);
          set('uNoiseB', 1);
          set('uCells', 2);
          set('uMats', 3);
          set('uTramp', 4);
          set('uTiles', 5);
          set('uGrid', [d.w, d.h]);
          set('uTileTex', [tiles.width, tiles.height]);
          set('uSnow', l.snow);
          set('uFrost', l.frost);
          set('uWet', l.wet);
          set('uPuddle', l.puddle);
          set('uIce', l.ice);
          set('uOld', this.old);
          set('uMelt', l.melting);
          set('uRain', l.rain);
          set('uTime', this.time);
          set('uDay', l.day);
          set('uLeaves', l.leaves);
          set('uLeafTone', l.leafTone);
          set('uGrassFrom', this.grassFrom);
          set('uGrassTo', this.grassTo);
          set('uGrassA', this.grassA);
          set('uGrassT', this.grassT);
          set('uWeatherOn', this.weatherOn ? 1 : 0);
          set('uDebug', this.debugView ? 1 : 0);
        },
      },
      0,
      0,
      wPx,
      hPx,
      [TEX.noiseA, TEX.noiseB, KEY_CELLS, KEY_MATS, KEY_TRAMP, TEX.tiles],
    );
    // Coordenada de textura = px do mundo (o shader trabalha no mundo).
    shader.setOrigin(0, 0).setDepth(DEPTH.groundMarkings + 0.45).setVisible(false);
    shader.textureCoordinateTopLeft.set(0, 0);
    shader.textureCoordinateTopRight.set(wPx, 0);
    shader.textureCoordinateBottomLeft.set(0, hPx);
    shader.textureCoordinateBottomRight.set(wPx, hPx);
    this.shader = shader;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const k of [KEY_CELLS, KEY_MATS, KEY_TRAMP]) if (scene.textures.exists(k)) scene.textures.remove(k);
    });
  }

  /** Brilho médio de cada desenho de chão: o shader compara o pixel com ele (tufo, junta). */
  private fillTileBrightness(d: WeatherCells): void {
    const src = this.scene.textures.get(TEX.tiles).getSourceImage() as CanvasImageSource & { width: number; height: number };
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(src, 0, 0);
    const cols = Math.floor(src.width / TILE);
    const rows = Math.floor(src.height / TILE);
    const px = ctx.getImageData(0, 0, src.width, src.height).data;
    const mean: number[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        let s = 0;
        for (let y = 0; y < TILE; y += 2)
          for (let x = 0; x < TILE; x += 2) {
            const o = ((r * TILE + y) * src.width + c * TILE + x) * 4;
            s += px[o]! * 0.3 + px[o + 1]! * 0.59 + px[o + 2]! * 0.11;
          }
        mean.push(s / ((TILE / 2) * (TILE / 2)));
      }
    for (let i = 0; i < d.w * d.h; i++) {
      if (!d.outdoor[i]) continue;
      const idx = Math.round(d.mats[i * 4 + 1]! / TILE_STEP);
      d.mats[i * 4 + 2] = Math.round(mean[idx] ?? 128);
    }
  }

  /**
   * Pisou (jogador) ou passou (carro) num ponto: a neve daquele lugar vai
   * ficando compactada (cinza, mais baixa). Neve nova por cima apaga devagar.
   */
  trample(x: number, y: number, amount: number): void {
    const i = Math.floor(y / TILE) * this.w + Math.floor(x / TILE);
    if (!this.data.outdoor[i]) return;
    const before = this.packed.get(i) ?? 0;
    const after = Math.min(1, before + amount);
    this.packed.set(i, after);
    this.writeTramp(i);
  }

  /** Neve nova cobrindo os caminhos (chamado enquanto neva). */
  coverTracks(amount: number): void {
    for (const [i, v] of this.packed) {
      const n = v - amount;
      if (n <= 0) this.packed.delete(i);
      else this.packed.set(i, n);
      this.writeTramp(i);
    }
  }

  private writeTramp(i: number): void {
    const v = Math.round(Math.max(this.data.trampBase[i]!, this.packed.get(i) ?? 0) * 255);
    if (this.trampBytes[i * 4] === v) return;
    this.trampBytes[i * 4] = v;
    this.trampDirty = true;
  }

  /** Estado do chão neste quadro. */
  update(dt: number, look: GroundLook): void {
    this.time += dt;
    this.look = look;
    // Neve velha: dias sem nevar e derretendo (acinzenta aos poucos, em manchas).
    this.old = clamp((look.sinceSnow - 18) / 60, 0, 1) * 0.8 + look.melting * 0.5;
    const s = this.shader;
    if (!s) return;
    // Grama: da fase atual para a próxima (circular: depois de "rebrotando" volta ao verão).
    const g = ((look.grass % 6) + 6) % 6;
    const p0 = Math.floor(g);
    const p1 = (p0 + 1) % 6;
    this.grassFrom = tone(p0);
    this.grassTo = tone(p1);
    this.grassA = [p0 === 0 ? 0 : 1, p1 === 0 ? 0 : 1];
    this.grassT = g - p0;
    const grassOn = this.grassA[0]! + this.grassA[1]! > 0;
    this.weatherOn = look.snow > 0.004 || look.frost > 0.02 || look.wet > 0.02 || look.puddle > 0.01 || look.ice > 0.02 || look.leaves > 0.02;
    s.setVisible(this.weatherOn || grassOn || this.debugView);
    this.trampClock += dt;
    if (this.trampDirty && this.trampClock >= TRAMP_UPLOAD) {
      this.trampClock = 0;
      this.trampDirty = false;
      this.trampTex?.source[0]?.update();
    }
  }

  /** O tile é chão de fora (pegadas, respingos). */
  isOutdoorGround(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.data.w || ty >= this.data.h) return false;
    return this.data.outdoor[ty * this.w + tx] === 1;
  }

  /** O shader está desenhando agora (debug). */
  get covered(): number {
    return this.shader?.visible ? this.data.outdoorCount : 0;
  }

  get outdoorTiles(): number {
    return this.data.outdoorCount;
  }
}
