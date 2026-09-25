/**
 * ATLAS DE VAGAS (parte Phaser): texturas grandes divididas em vagas do
 * mesmo tamanho, para imagens que nascem e somem em jogo (a folha de cada
 * zumbi, cada corpo). Motivo: poucas texturas na tela = menos troca de
 * estado na GPU — e o Phaser 4 desenha errado quando uma cena passa de 16
 * texturas diferentes num quadro (visto no teste: o jogador saía com a
 * textura de um zumbi).
 *
 * Redesenhar uma vaga envia à GPU só aquele retângulo (texSubImage2D), não
 * a página inteira.
 */
import Phaser from 'phaser';

export interface SlotRef {
  page: number;
  slot: number;
  /** Chave da textura da página. */
  key: string;
}

interface Page {
  key: string;
  tex: Phaser.Textures.CanvasTexture;
  free: number[];
}

/** Quadros dentro de uma vaga: nome → retângulo relativo à vaga. */
export type SlotFrames = Record<string, { x: number; y: number; w: number; h: number }>;

interface GlTexture {
  flipY: boolean;
  pma: boolean;
}

interface GlRenderer {
  gl: WebGLRenderingContext;
  glTextureUnits: { bind(t: unknown, unit: number): void };
  glWrapper: { updateTexturing(s: { texturing: { flipY: boolean; premultiplyAlpha: boolean } }): void };
}

export class SlotAtlas {
  private readonly pages: Page[] = [];
  readonly cols: number;
  readonly rows: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly prefix: string,
    readonly slotW: number,
    readonly slotH: number,
    /** Tamanho máximo da página (px). Não potência de 2: sem mipmap, sem repetir. */
    maxSide: number,
    private readonly maxPages: number,
    private readonly frames: SlotFrames,
  ) {
    this.cols = Math.max(1, Math.floor(maxSide / slotW));
    this.rows = Math.max(1, Math.floor(maxSide / slotH));
  }

  get perPage(): number {
    return this.cols * this.rows;
  }

  get pageCount(): number {
    return this.pages.length;
  }

  /** Vagas em uso (debug). */
  get used(): number {
    let n = 0;
    for (const p of this.pages) n += this.perPage - p.free.length;
    return n;
  }

  /** Pega uma vaga livre (cria página se precisar e puder). */
  alloc(): SlotRef | null {
    for (let i = 0; i < this.pages.length; i++) {
      const p = this.pages[i]!;
      const slot = p.free.pop();
      if (slot !== undefined) return { page: i, slot, key: p.key };
    }
    if (this.pages.length >= this.maxPages) return null;
    const i = this.pages.length;
    const key = `${this.prefix}.${i}`;
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    // +1 px para a vaga não encostar na borda da página.
    const w = this.cols * this.slotW + 2;
    const h = this.rows * this.slotH + 2;
    const tex = this.scene.textures.createCanvas(key, w % 2 ? w : w + 1, h % 2 ? h : h + 1)!;
    const page: Page = { key, tex, free: [] };
    for (let s = this.perPage - 1; s >= 0; s--) page.free.push(s);
    for (let s = 0; s < this.perPage; s++) {
      const { x, y } = this.origin(s);
      for (const [name, f] of Object.entries(this.frames)) tex.add(`${s}:${name}`, 0, x + f.x, y + f.y, f.w, f.h);
    }
    tex.refresh();
    this.pages.push(page);
    const slot = page.free.pop()!;
    return { page: i, slot, key };
  }

  release(ref: SlotRef): void {
    const p = this.pages[ref.page];
    if (p && !p.free.includes(ref.slot)) p.free.push(ref.slot);
  }

  /** Nome do quadro `name` na vaga. */
  frame(ref: SlotRef, name: string): string {
    return `${ref.slot}:${name}`;
  }

  private origin(slot: number): { x: number; y: number } {
    return { x: 1 + (slot % this.cols) * this.slotW, y: 1 + Math.floor(slot / this.cols) * this.slotH };
  }

  /** Copia a imagem para a vaga e manda só esse pedaço para a GPU. */
  upload(ref: SlotRef, src: HTMLCanvasElement): void {
    const p = this.pages[ref.page];
    if (!p) return;
    const { x, y } = this.origin(ref.slot);
    const ctx = p.tex.getContext();
    ctx.clearRect(x, y, this.slotW, this.slotH);
    ctx.drawImage(src, 0, 0, Math.min(src.width, this.slotW), Math.min(src.height, this.slotH), x, y, Math.min(src.width, this.slotW), Math.min(src.height, this.slotH));
    const r = this.scene.sys.renderer as unknown as Partial<GlRenderer>;
    const source = p.tex.source[0] as unknown as { glTexture?: GlTexture; height: number };
    const gl = r.gl;
    const glTex = source.glTexture;
    if (!gl || !glTex || !r.glTextureUnits || !r.glWrapper) {
      p.tex.refresh();
      return;
    }
    r.glTextureUnits.bind(glTex, 0);
    r.glWrapper.updateTexturing({ texturing: { flipY: glTex.flipY, premultiplyAlpha: glTex.pma } });
    // Recorte exato da vaga (o canvas de origem pode ser maior).
    const sub = this.scratchFor(ctx, x, y);
    const yy = glTex.flipY ? source.height - y - this.slotH : y;
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, yy, gl.RGBA, gl.UNSIGNED_BYTE, sub);
  }

  private scratch: HTMLCanvasElement | null = null;

  /** A vaga já desenhada na página, recortada num canvas do tamanho da vaga. */
  private scratchFor(ctx: CanvasRenderingContext2D, x: number, y: number): HTMLCanvasElement {
    if (!this.scratch) {
      this.scratch = document.createElement('canvas');
      this.scratch.width = this.slotW;
      this.scratch.height = this.slotH;
    }
    const s = this.scratch.getContext('2d')!;
    s.clearRect(0, 0, this.slotW, this.slotH);
    s.drawImage(ctx.canvas, x, y, this.slotW, this.slotH, 0, 0, this.slotW, this.slotH);
    return this.scratch;
  }

  destroy(): void {
    for (const p of this.pages) if (this.scene.textures.exists(p.key)) this.scene.textures.remove(p.key);
    this.pages.length = 0;
  }
}
