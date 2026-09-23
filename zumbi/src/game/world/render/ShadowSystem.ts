/**
 * Sombras projetadas pelo "sol". Cada objeto que faz sombra registra
 * um sprite-sombra e sua altura; o deslocamento é altura x direção do sol.
 *
 * Hoje o sol é fixo (fim de tarde). Na Etapa 11 (dia/noite) basta chamar
 * setSun() ao longo do dia: sombras giram, esticam e somem à noite —
 * sem tocar em nenhum outro sistema.
 */
export interface ShadowCaster {
  setPosition(x: number, y: number): unknown;
  setAlpha(a: number): unknown;
}

interface Entry {
  obj: ShadowCaster;
  baseX: number;
  baseY: number;
  height: number;
  /** Multiplicador de opacidade próprio (vidro faz menos sombra que parede). */
  strength: number;
}

export interface SunState {
  /** Direção da sombra (normalizada). */
  dirX: number;
  dirY: number;
  /** Comprimento da sombra por unidade de altura (px). */
  length: number;
  /** Opacidade base das sombras (0 = sem sol). */
  alpha: number;
}

export const DEFAULT_SUN: SunState = { dirX: 0.56, dirY: 0.83, length: 13, alpha: 0.3 };

export class ShadowSystem {
  private entries: Entry[] = [];
  private sun: SunState = { ...DEFAULT_SUN };

  add(obj: ShadowCaster, baseX: number, baseY: number, height: number, strength = 1): void {
    const e = { obj, baseX, baseY, height, strength };
    this.entries.push(e);
    this.apply(e);
  }

  offset(height: number): { x: number; y: number } {
    return { x: this.sun.dirX * this.sun.length * height, y: this.sun.dirY * this.sun.length * height };
  }

  get alpha(): number {
    return this.sun.alpha;
  }

  setSun(sun: Partial<SunState>): void {
    this.sun = { ...this.sun, ...sun };
    for (const e of this.entries) this.apply(e);
  }

  private apply(e: Entry): void {
    const o = this.offset(e.height);
    e.obj.setPosition(e.baseX + o.x, e.baseY + o.y);
    e.obj.setAlpha(this.sun.alpha * e.strength);
  }
}
