/**
 * Telhados: escondem o interior enquanto o jogador está fora e somem
 * suavemente quando ele entra. Também avisam (EventBus) quando o
 * jogador entra/sai de uma construção — o HUD mostra o nome do local.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { TEX } from '../../assets/AssetKeys';
import type { EventBus } from '../../core/EventBus';
import { Random, hashString } from '../../core/Random';
import { damp } from '../../core/math';
import type { AssetRegistry } from '../../assets/AssetRegistry';
import type { BuildingData } from '../MapTypes';
import type { ShadowEntry, ShadowSystem } from './ShadowSystem';
import type { CullEntry, SpatialCuller } from './SpatialCuller';
import { ROOF_FRAG } from './weatherShaders';

const OVERHANG = 10;
const ROOF_HEIGHT = 2.3;
const ROOF_SHADOW_STRENGTH = 1.05;

interface Roof {
  data: BuildingData;
  container: Phaser.GameObjects.Container;
  /** Neve no telhado: shader que lê a telha (por baixo das faces das águas: a neve ganha volume). */
  snow: Phaser.GameObjects.Shader | null;
  shadow: Phaser.GameObjects.Rectangle;
  shadowEntry: ShadowEntry;
  culls: CullEntry[];
}

/**
 * Telhados são carregados/descarregados junto com o chunk da construção;
 * a detecção de "entrou/saiu" usa os DADOS de todas as construções, então
 * funciona mesmo antes de o telhado existir na tela.
 */
export class RoofSystem {
  private readonly loaded = new Map<string, Roof>();
  private current: BuildingData | null = null;
  /** Neve no chão da cidade (0..1): os telhados acompanham. */
  private snowLevel = 0;
  private snowOld = 0;
  private snowMelt = 0;
  private day = 1;
  /** Brilho médio de cada desenho de telha (a neve compara o pixel com ele). */
  private readonly patMean = new Map<string, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly assets: AssetRegistry,
    private readonly bus: EventBus,
    private readonly shadows: ShadowSystem,
    private readonly culler: SpatialCuller,
    /** Busca rápida das construções perto de um ponto (índice por chunk). */
    private readonly buildingsNear: (x: number, y: number) => BuildingData[],
  ) {}

  load(b: BuildingData): void {
    if (this.loaded.has(b.id)) return;
    const roof = this.buildRoof(b);
    const o = this.shadows.offset(ROOF_HEIGHT);
    roof.culls.push(
      this.culler.add(roof.container, b.bounds.x - OVERHANG, b.bounds.y - OVERHANG, b.bounds.x + b.bounds.w + OVERHANG, b.bounds.y + b.bounds.h + OVERHANG),
      this.culler.add(roof.shadow, b.bounds.x + o.x - OVERHANG, b.bounds.y + o.y - OVERHANG, b.bounds.x + b.bounds.w + o.x + OVERHANG, b.bounds.y + b.bounds.h + o.y + OVERHANG),
    );
    // Carregou com o jogador dentro (teleporte, início no abrigo): já nasce transparente.
    if (this.current?.id === b.id) {
      roof.container.setAlpha(0);
      roof.shadow.setAlpha(0);
    }
    this.loaded.set(b.id, roof);
    this.applySnow(roof);
  }

  /**
   * Neve nos telhados: a mesma cobertura do chão (o shader dá o resto —
   * beiral, cumeeira, telha). `old` neve velha, `melt` derretendo, `day` luz.
   */
  setSnow(level: number, old = 0, melt = 0, day = 1): void {
    this.snowOld = old;
    this.snowMelt = melt;
    this.day = day;
    if (Math.abs(level - this.snowLevel) < 0.002) return;
    const was = this.snowLevel > 0.02;
    this.snowLevel = level;
    if (was !== level > 0.02) for (const r of this.loaded.values()) this.applySnow(r);
  }

  private applySnow(r: Roof): void {
    r.snow?.setVisible(this.snowLevel > 0.02);
  }

  private patternMean(key: string): number {
    const known = this.patMean.get(key);
    if (known !== undefined) return known;
    let mean = 0.35;
    const src = this.scene.textures.get(key).getSourceImage() as CanvasImageSource & { width: number; height: number };
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(src, 0, 0);
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < px.length; i += 16) {
        sum += (px[i]! * 0.3 + px[i + 1]! * 0.59 + px[i + 2]! * 0.11) / 255;
        n++;
      }
      mean = sum / Math.max(1, n);
    }
    this.patMean.set(key, mean);
    return mean;
  }

  unload(id: string): void {
    const r = this.loaded.get(id);
    if (!r) return;
    for (const c of r.culls) this.culler.remove(c);
    this.shadows.remove(r.shadowEntry);
    r.container.destroy();
    r.shadow.destroy();
    this.loaded.delete(id);
  }

  /** Construção em que o jogador está agora (null = fora). */
  get currentBuilding(): BuildingData | null {
    return this.current;
  }

  /** Opacidade atual do telhado (1 = fechado, 0 = jogador dentro). */
  alphaOf(buildingId: string): number {
    return this.loaded.get(buildingId)?.container.alpha ?? 1;
  }

  get loadedCount(): number {
    return this.loaded.size;
  }

  private buildRoof(b: BuildingData): Roof {
    const s = this.scene;
    const x0 = b.bounds.x - OVERHANG;
    const y0 = b.bounds.y - OVERHANG;
    const w = b.bounds.w + OVERHANG * 2;
    const h = b.bounds.h + OVERHANG * 2;
    const cx = x0 + w / 2;
    const cy = y0 + h / 2;

    const shadow = s.add.rectangle(0, 0, w, h, 0x000000).setDepth(DEPTH.roofShadow);
    const shadowEntry = this.shadows.add(shadow, cx, cy, ROOF_HEIGHT, ROOF_SHADOW_STRENGTH);

    const container = s.add.container(0, 0).setDepth(DEPTH.roof);
    const pattern = s.add.tileSprite(cx, cy, w, h, `pattern.roof.${b.roof}`);
    container.add(pattern);
    const snow = this.makeSnow(b, x0, y0, w, h, container);

    const g = s.add.graphics();
    container.add(g);
    const rng = new Random(hashString(b.id));

    if (b.roof === 'flat') {
      // platibanda (borda elevada) + objetos no telhado
      g.lineStyle(8, 0x7d8185, 1).strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);
      g.lineStyle(2, 0x3c3f42, 0.9).strokeRect(x0 + 9, y0 + 9, w - 18, h - 18);
      g.lineStyle(2, 0x2a2c2e, 1).strokeRect(x0, y0, w, h);
      const units = Math.max(1, Math.floor((w * h) / 180000));
      for (let i = 0; i < units + 1; i++) {
        const id = i === 0 || rng.chance(0.6) ? 'roof.ac' : 'roof.vent';
        const ux = x0 + rng.range(60, w - 60);
        const uy = y0 + rng.range(60, h - 60);
        const sh = this.assets.shadowRef(id);
        if (sh) container.add(s.add.image(ux + 6, uy + 9, sh.key, sh.frame).setAlpha(0.3));
        const ref = this.assets.ref(id);
        container.add(s.add.image(ux, uy, ref.key, ref.frame).setAngle(rng.pick([0, 90, 180, 270])));
      }
    } else {
      // telhado de quatro águas: faces com luz diferente dão volume
      const hw = Math.min(w, h) / 2;
      const along = w >= h;
      const r0 = along ? { x: x0 + hw, y: cy } : { x: cx, y: y0 + hw };
      const r1 = along ? { x: x0 + w - hw, y: cy } : { x: cx, y: y0 + h - hw };
      const tl = { x: x0, y: y0 };
      const tr = { x: x0 + w, y: y0 };
      const bl = { x: x0, y: y0 + h };
      const br = { x: x0 + w, y: y0 + h };
      const face = (pts: { x: number; y: number }[], color: number, alpha: number) => {
        g.fillStyle(color, alpha);
        g.fillPoints(pts.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
      };
      if (along) {
        face([tl, tr, r1, r0], 0xffffff, 0.07); // norte (recebe luz)
        face([bl, br, r1, r0], 0x000000, 0.2); // sul
        face([tl, r0, bl], 0xffffff, 0.03); // oeste
        face([tr, r1, br], 0x000000, 0.12); // leste
      } else {
        face([tl, bl, r1, r0], 0xffffff, 0.04);
        face([tr, br, r1, r0], 0x000000, 0.14);
        face([tl, tr, r0], 0xffffff, 0.07);
        face([bl, br, r1], 0x000000, 0.2);
      }
      g.lineStyle(3, 0x241c19, 0.55);
      g.lineBetween(tl.x, tl.y, r0.x, r0.y);
      g.lineBetween(bl.x, bl.y, r0.x, r0.y);
      g.lineBetween(tr.x, tr.y, r1.x, r1.y);
      g.lineBetween(br.x, br.y, r1.x, r1.y);
      g.lineStyle(7, 0x2e2522, 1).lineBetween(r0.x, r0.y, r1.x, r1.y);
      g.lineStyle(2, 0x6d5c54, 0.8).lineBetween(r0.x, r0.y - 2, r1.x, r1.y - 2);
      g.lineStyle(2, 0x1e1816, 1).strokeRect(x0, y0, w, h);
      // chaminé
      const chx = x0 + w * rng.range(0.25, 0.75);
      const chy = y0 + h * (along ? 0.3 : rng.range(0.3, 0.7));
      g.fillStyle(0x000000, 0.3).fillRect(chx + 5, chy + 7, 26, 26);
      g.fillStyle(0x7b4a3a, 1).fillRect(chx, chy, 26, 26);
      g.fillStyle(0x5a3428, 1).fillRect(chx + 13, chy, 13, 26);
      g.fillStyle(0x1c1c1c, 1).fillRect(chx + 6, chy + 6, 14, 14);
      g.lineStyle(1.5, 0x2a1a14, 1).strokeRect(chx, chy, 26, 26);
    }

    // sujeira/folhas por cima de qualquer telhado
    for (let i = 0; i < 6; i++) {
      g.fillStyle(rng.pick([0x6d5a3a, 0x4a4a3a, 0x7a5a2e]), rng.range(0.25, 0.5));
      g.fillCircle(x0 + rng.range(20, w - 20), y0 + rng.range(20, h - 20), rng.range(2, 6));
    }

    return { data: b, container, snow, shadow, shadowEntry, culls: [] };
  }

  /** Shader da neve do telhado (só com WebGL; escondido sem neve). */
  private makeSnow(b: BuildingData, x0: number, y0: number, w: number, h: number, container: Phaser.GameObjects.Container): Phaser.GameObjects.Shader | null {
    const s = this.scene;
    if (s.game.renderer.type !== Phaser.WEBGL) return null;
    const key = `pattern.roof.${b.roof}`;
    const src = s.textures.get(key).getSourceImage() as { width: number; height: number };
    const mean = this.patternMean(key);
    const flat = b.roof === 'flat';
    // Cumeeira: a mesma linha que o desenho das águas usa.
    const hw = Math.min(w, h) / 2;
    const along = w >= h;
    const ridge = along ? [x0 + hw, y0 + h / 2, x0 + w - hw, y0 + h / 2] : [x0 + w / 2, y0 + hw, x0 + w / 2, y0 + h - hw];
    const shader = s.add.shader(
      {
        name: 'RoofSnow',
        fragmentSource: ROOF_FRAG,
        setupUniforms: (set: (name: string, value: unknown) => void) => {
          set('uNoiseA', 0);
          set('uNoiseB', 1);
          set('uPattern', 2);
          set('uRect', [x0, y0, w, h]);
          set('uRidge', ridge);
          set('uPatSize', [src.width, src.height]);
          set('uPatMean', mean);
          set('uFlat', flat ? 1 : 0);
          set('uSnow', this.snowLevel);
          set('uOld', this.snowOld);
          set('uMelt', this.snowMelt);
          set('uDay', this.day);
          set('uAlpha', container.alpha);
        },
      },
      x0,
      y0,
      w,
      h,
      [TEX.noiseA, TEX.noiseB, key],
    );
    shader.setOrigin(0, 0);
    shader.textureCoordinateTopLeft.set(x0, y0);
    shader.textureCoordinateTopRight.set(x0 + w, y0);
    shader.textureCoordinateBottomLeft.set(x0, y0 + h);
    shader.textureCoordinateBottomRight.set(x0 + w, y0 + h);
    shader.setVisible(this.snowLevel > 0.02);
    container.add(shader);
    return shader;
  }

  /** Construção em que o ponto está (pela linha central das paredes externas). */
  buildingAt(x: number, y: number): BuildingData | null {
    for (const b of this.buildingsNear(x, y)) {
      const r = b.bounds;
      if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return b;
    }
    return null;
  }

  update(px: number, py: number, dt: number): void {
    const now = this.buildingAt(px, py);
    if (now !== this.current) {
      // Nenhum prédio é "a base": o de partida aparece como uma casa qualquer.
      const info = (b: BuildingData) => ({ buildingId: b.id, name: b.kind === 'shelter' ? 'Casa' : b.name, kind: b.kind });
      if (this.current) this.bus.emit('player:exit-building', info(this.current));
      if (now) this.bus.emit('player:enter-building', info(now));
      this.current = now;
    }

    const t = damp(9, dt);
    const shadowAlpha = this.shadows.alpha * ROOF_SHADOW_STRENGTH;
    for (const r of this.loaded.values()) {
      const target = r.data === now ? 0 : 1;
      const a = r.container.alpha;
      if (Math.abs(a - target) > 0.003) {
        const next = a + (target - a) * t;
        r.container.setAlpha(next);
        r.shadow.setAlpha(next * shadowAlpha);
      } else if (a !== target) {
        r.container.setAlpha(target);
        r.shadow.setAlpha(target * shadowAlpha);
      }
    }
  }
}
