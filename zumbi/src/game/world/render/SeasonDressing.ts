/**
 * A ESTAÇÃO e o CLIMA nos objetos do mundo (parte Phaser):
 *
 * - NEVE por cima de árvores, arbustos, carros e objetos AO AR LIVRE: uma
 *   cópia só com a neve nas superfícies de CIMA (partes lisas e claras longe
 *   da borda da silhueta: teto e capô do carro, topo da copa, tampa), em 3
 *   níveis, gerada uma vez por desenho — aos poucos, uma por quadro, para
 *   não travar. Dentro das construções, nada.
 * - MOLHADO: com chuva e chão encharcado os objetos de fora escurecem um
 *   pouco (superfície molhada).
 * - FOLHAS: as árvores que perdem folha amarelam no outono, ficam ralas e
 *   cinzentas no inverno e voltam verdes na primavera.
 * - VENTO: árvores e arbustos balançam (mais com vento forte, em rajadas);
 *   só os que estão na tela.
 */
import Phaser from 'phaser';
import { drawObjectSnow, type SnowObjKind } from '../../assets/procedural/weatherArt';
import { hashString } from '../../core/Random';
import type { PropPlacement } from '../MapTypes';
import type { PropDef, PropType } from '../PropCatalog';
import { buildingAtPoint } from '../shelter';
import type { WorldModel } from '../WorldModel';

/** Árvores que perdem folha no outono/inverno. */
export const DECIDUOUS = new Set<PropType>(['tree', 'treeSmall', 'treeApple', 'treeBroad', 'treeYoung'] as PropType[]);
/** Objetos pequenos demais (ou rente ao chão) não ganham neve própria: o chão já cobre. */
const MIN_AREA = 700;
/** Balanço máximo (graus) com vento forte. */
const SWAY_TREE = 2.6;
const SWAY_BUSH = 3.4;

interface Dressed {
  base: Phaser.GameObjects.Image;
  snow: Phaser.GameObjects.Image | null;
  /** Chave do desenho (as 3 texturas de neve dele). */
  frameKey: string;
  deciduous: boolean;
  angle: number;
  sway: number;
  phase: number;
}

interface Job {
  tex: string;
  frame: string;
  key: string;
  kind: SnowObjKind;
}

/**
 * Folha única com a neve de todos os desenhos (prateleiras). Uma textura só
 * em vez de dezenas: menos troca de textura no celular — e cada textura
 * solta criada no meio do jogo aparecia cortada em alguns aparelhos.
 * A folha sobe para a placa de vídeo poucas vezes (quando a fila esvazia).
 */
class SnowSheet {
  static readonly W = 2048;
  static readonly H = 2048;
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private x = 0;
  private y = 0;
  private rowH = 0;
  texture: Phaser.Textures.Texture | null = null;
  /** Quadros prontos na folha mas ainda não enviados para a placa de vídeo. */
  pending: { name: string; x: number; y: number; w: number; h: number }[] = [];

  constructor(readonly key: string) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SnowSheet.W;
    this.canvas.height = SnowSheet.H;
    this.ctx = this.canvas.getContext('2d')!;
  }

  /** Guarda um desenho; false = a folha encheu. */
  put(name: string, c: HTMLCanvasElement): boolean {
    const pad = 2;
    if (this.x + c.width + pad > SnowSheet.W) {
      this.x = 0;
      this.y += this.rowH + pad;
      this.rowH = 0;
    }
    if (this.y + c.height > SnowSheet.H || c.width > SnowSheet.W) return false;
    this.ctx.drawImage(c, this.x, this.y);
    this.pending.push({ name, x: this.x, y: this.y, w: c.width, h: c.height });
    this.x += c.width + pad;
    this.rowH = Math.max(this.rowH, c.height);
    return true;
  }

  /** Envia a folha e registra os quadros novos. */
  flush(textures: Phaser.Textures.TextureManager): string[] {
    if (!this.pending.length) return [];
    if (!this.texture) this.texture = textures.addCanvas(this.key, this.canvas);
    else this.texture.source[0]!.update();
    const done: string[] = [];
    for (const f of this.pending) {
      if (!this.texture!.has(f.name)) this.texture!.add(f.name, 0, f.x, f.y, f.w, f.h);
      done.push(f.name);
    }
    this.pending = [];
    return done;
  }
}

export class SeasonDressing {
  private readonly items = new Set<Dressed>();
  private readonly queue: Job[] = [];
  private readonly queued = new Set<string>();
  private readonly ready = new Set<string>();
  /** Desenhos já na folha, esperando o próximo envio. */
  private readonly drawn = new Set<string>();
  private readonly sheets: SnowSheet[] = [];
  /** Onde está a neve de cada desenho (folha). */
  private readonly sheetOf = new Map<string, string>();
  /** Só começa a desenhar a neve dos objetos quando a neve aparece no chão. */
  private wanted = false;
  private snowStage = -1;
  private snowAlpha = 0;
  private leafColor = 0;
  private leafCover = 1;
  private wet = 0;
  private key = '';
  private time = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly model: WorldModel,
  ) {
    // A folha é da partida: um jogo novo desenha a sua.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const sheet of this.sheets) if (scene.textures.exists(sheet.key)) scene.textures.remove(sheet.key);
    });
  }

  /** O WorldRenderer chama ao criar um objeto: devolve as imagens extras (mesmo culling do objeto). */
  dress(img: Phaser.GameObjects.Image, p: PropPlacement, def: PropDef): Phaser.GameObjects.Image[] {
    if (def.layer === 'floor' || def.width * def.height < MIN_AREA) return [];
    if (buildingAtPoint(this.model, p.x, p.y)) return [];
    const frameKey = `${img.texture.key}:${img.frame.name}`;
    const snow = this.scene.add
      .image(p.x, p.y, img.texture.key, img.frame.name)
      .setAngle(p.angle)
      .setScale(img.scaleX, img.scaleY)
      .setFlipX(img.flipX)
      .setDepth(img.depth + 0.01)
      .setVisible(false);
    const tree = !!def.fadeWhenNear;
    const bush = p.type.startsWith('bush');
    const kind: SnowObjKind = tree || bush || p.type === 'hedge' ? 'foliage' : 'solid';
    const d: Dressed = {
      base: img,
      snow,
      frameKey,
      deciduous: DECIDUOUS.has(p.type),
      angle: p.angle,
      sway: tree ? SWAY_TREE : bush ? SWAY_BUSH : 0,
      phase: (hashString(`${p.id}`) % 1000) / 159,
    };
    this.items.add(d);
    if (!this.ready.has(frameKey) && !this.queued.has(frameKey)) {
      this.queued.add(frameKey);
      this.queue.push({ tex: img.texture.key, frame: String(img.frame.name), key: frameKey, kind });
    }
    this.apply(d);
    return [snow];
  }

  /** Desenha a neve de um desenho por quadro; envia a folha quando a fila esvazia. */
  private work(): void {
    if (!this.wanted) return;
    const job = this.queue.shift();
    if (job) {
      const f = this.scene.textures.getFrame(job.tex, job.frame);
      const src = f?.source?.image as CanvasImageSource | undefined;
      if (f && src) {
        const w = Math.max(1, Math.round(f.cutWidth));
        const h = Math.max(1, Math.round(f.cutHeight));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d', { willReadFrequently: true })!.drawImage(src, f.cutX, f.cutY, w, h, 0, 0, w, h);
        drawObjectSnow(canvas, hashString(job.key), job.kind).forEach((c, k) => {
          let sheet = this.sheets[this.sheets.length - 1];
          if (!sheet || !sheet.put(`${job.key}:${k}`, c)) {
            sheet = new SnowSheet(`snowobj.sheet.${this.sheets.length}`);
            this.sheets.push(sheet);
            sheet.put(`${job.key}:${k}`, c);
          }
          this.sheetOf.set(job.key, sheet.key);
        });
        this.drawn.add(job.key);
      }
      this.queued.delete(job.key);
    }
    // Envia quando acabou a fila (ou a cada ~40 desenhos, para não esperar demais).
    if (this.queue.length === 0 || this.drawn.size >= 40) {
      for (const sheet of this.sheets) sheet.flush(this.scene.textures);
      for (const key of this.drawn) this.ready.add(key);
      const fresh = new Set(this.drawn);
      this.drawn.clear();
      if (fresh.size) for (const d of this.items) if (fresh.has(d.frameKey)) this.apply(d);
    }
  }

  /**
   * Estado do momento (chamar todo quadro: a aparência só muda quando o nível
   * muda; o balanço anda sempre, só nos objetos visíveis).
   */
  update(dt: number, look: { snow: number; wet: number; wind: number; leafColor: number; leafCover: number }): void {
    this.time += dt;
    if (look.snow > 0.05) this.wanted = true;
    this.work();
    // Neve sobre as coisas aparece depois que o chão começa a branquear.
    const c = look.snow;
    const stage = c < 0.2 ? -1 : c < 0.45 ? 0 : c < 0.75 ? 1 : 2;
    const alpha = stage < 0 ? 0 : Math.min(1, (c - 0.2) * 5);
    const key = `${stage}|${Math.round(alpha * 10)}|${Math.round(look.wet * 10)}|${Math.round(look.leafColor * 20)}|${Math.round(look.leafCover * 20)}`;
    if (key !== this.key) {
      this.key = key;
      this.snowStage = stage;
      this.snowAlpha = alpha;
      this.wet = look.wet;
      this.leafColor = look.leafColor;
      this.leafCover = look.leafCover;
      for (const d of this.items) {
        if (!d.base.active) this.items.delete(d);
        else this.apply(d);
      }
    }
    // A copa some quando o jogador passa por baixo (CanopyFader): a neve dela acompanha.
    // Vento: balanço em rajadas.
    const wind = look.wind;
    const amp = 0.18 + wind * wind * 1.1;
    for (const d of this.items) {
      const b = d.base;
      if (!b.active || !b.visible) continue;
      if (d.sway > 0) {
        const gust = 0.65 + 0.35 * Math.sin(this.time * 0.43 + d.phase * 0.7);
        const off = Math.sin(this.time * (0.9 + wind * 1.9) + d.phase) * d.sway * amp * gust;
        b.setAngle(d.angle + off);
        d.snow?.setAngle(d.angle + off);
      }
      const s = d.snow;
      if (s && s.visible) {
        const want = this.snowAlpha * b.alpha;
        if (Math.abs(s.alpha - want) > 0.01) s.setAlpha(want);
      }
    }
  }

  /** Quanto a copa ainda tem de folha (a cena passa para o CanopyFader). */
  get canopyCover(): number {
    return this.leafCover;
  }

  private apply(d: Dressed): void {
    const s = d.snow;
    if (s) {
      const show = this.snowStage >= 0 && this.ready.has(d.frameKey);
      if (show) s.setTexture(this.sheetOf.get(d.frameKey)!, `${d.frameKey}:${this.snowStage}`);
      s.setVisible(show).setAlpha(this.snowAlpha * d.base.alpha);
    }
    // Cor: folhas da estação × superfície molhada (multiplica a cor do desenho).
    let r = 255;
    let g = 255;
    let b = 255;
    if (d.deciduous) {
      // Verde → amarelo/laranja (outono) → galho pelado cinza-marrom (inverno).
      const t = this.leafColor;
      const bare = Math.max(0, Math.min(1, (0.85 - this.leafCover) / 0.5));
      const mix = (autumn: number, winter: number) => autumn + (winter - autumn) * bare;
      r = mix(255, 175);
      g = mix(255 - 70 * t, 160);
      b = mix(255 - 150 * t, 145);
    }
    const wet = Math.min(1, this.wet);
    r *= 1 - 0.2 * wet;
    g *= 1 - 0.16 * wet;
    b *= 1 - 0.12 * wet;
    const tint = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
    if (tint === 0xffffff) d.base.clearTint();
    else d.base.setTint(tint);
  }
}
