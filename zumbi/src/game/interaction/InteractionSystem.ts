/**
 * Sistema de interação: descobre com o que o jogador pode interagir agora
 * (porta, item no chão; depois armários, carros, bancadas...) e executa.
 * Puro, sem Phaser.
 *
 * Cada tipo de coisa é um PROVEDOR que oferece candidatos perto do jogador.
 * Coisa nova interativa = provedor novo; o sistema, o botão e o aviso na tela
 * não mudam.
 */
import { INTERACTION_TUNING } from '../config/WorldTuning';
import type { Rect } from '../world/MapTypes';

export interface InteractionTarget {
  /** Único por alvo ("porta:<id>", "item:<id>"). */
  key: string;
  kind: string;
  /** Onde destacar no mundo. */
  x: number;
  y: number;
  /** Área a destacar (portas); sem ela, um círculo de raio `radius`. */
  rect?: Rect;
  radius?: number;
  /** Palavra curta para o botão ("ABRIR") e frase para o aviso ("Abrir porta"). */
  verb: string;
  label: string;
  /** false = mostra o motivo, mas o botão não faz a ação (ex.: trancada). */
  enabled: boolean;
}

export interface InteractionResult {
  ok: boolean;
  message?: string;
}

export interface InteractionOption {
  label: string;
  enabled: boolean;
  perform(): InteractionResult;
}

export interface InteractionCandidate {
  target: InteractionTarget;
  /** Distância efetiva (px) — menor vence. */
  distance: number;
  perform(): InteractionResult;
  /** Outras ações do mesmo alvo (menu "⋯"): desmontar, dormir, examinar... */
  more?: () => InteractionOption[];
}

export interface Interactor {
  x: number;
  y: number;
  radius: number;
  /** Para onde o jogador olha (rad). Alvo à frente tem preferência. */
  facing: number;
}

export interface InteractionProvider {
  collect(who: Interactor, out: InteractionCandidate[]): void;
}

export class InteractionSystem {
  private readonly candidates: InteractionCandidate[] = [];
  private best: InteractionCandidate | null = null;

  constructor(private readonly providers: InteractionProvider[]) {}

  get current(): InteractionTarget | null {
    return this.best?.target ?? null;
  }

  /** Recalcula o alvo (algumas vezes por segundo basta). */
  scan(who: Interactor): InteractionTarget | null {
    this.candidates.length = 0;
    for (const p of this.providers) p.collect(who, this.candidates);
    let best: InteractionCandidate | null = null;
    let bestScore = Infinity;
    const fx = Math.cos(who.facing);
    const fy = Math.sin(who.facing);
    for (const c of this.candidates) {
      const dx = c.target.x - who.x;
      const dy = c.target.y - who.y;
      const len = Math.hypot(dx, dy) || 1;
      // Alvo à frente ganha até `facingBonus` px de vantagem; atrás perde o mesmo.
      const facing = (dx * fx + dy * fy) / len;
      const score = c.distance - facing * INTERACTION_TUNING.facingBonus;
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    this.best = best;
    return this.current;
  }

  /**
   * Todas as ações por perto, para o menu "⋯": primeiro as do alvo atual
   * (principal + extras), depois a principal dos outros alvos ao alcance.
   */
  options(who: Interactor, max = 8): InteractionOption[] {
    this.scan(who);
    const fx = Math.cos(who.facing);
    const fy = Math.sin(who.facing);
    const score = (c: InteractionCandidate) => {
      const dx = c.target.x - who.x;
      const dy = c.target.y - who.y;
      const len = Math.hypot(dx, dy) || 1;
      return c.distance - ((dx * fx + dy * fy) / len) * INTERACTION_TUNING.facingBonus;
    };
    const list = [...this.candidates].sort((a, b) => score(a) - score(b));
    const out: InteractionOption[] = [];
    const seen = new Set<string>();
    const push = (o: InteractionOption) => {
      if (out.length >= max || seen.has(o.label)) return;
      seen.add(o.label);
      out.push(o);
    };
    list.forEach((c, i) => {
      push({ label: c.target.label, enabled: c.target.enabled, perform: () => c.perform() });
      if (i === 0 || c.more) for (const m of c.more?.() ?? []) push(m);
    });
    return out;
  }

  /** Executa a ação do alvo atual e recalcula (o alvo pode ter mudado de estado). */
  perform(who: Interactor): InteractionResult | null {
    const c = this.best;
    if (!c) return null;
    const r = c.perform();
    this.scan(who);
    return r;
  }
}
