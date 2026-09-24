/**
 * HABILIDADES: sobem praticando (desmontar, tratar ferida, consertar...) e
 * lendo manuais. Nível 0–5. Cada nível deixa a ação mais rápida, rende mais
 * e libera receitas/construções mais difíceis. Puro e salvo.
 */
import { clamp } from '../core/math';

export type SkillId = 'carpintaria' | 'mecanica' | 'medicina' | 'agricultura' | 'eletronica' | 'culinaria' | 'pesca' | 'armas' | 'costura';

export const SKILL_LABEL: Record<SkillId, string> = {
  carpintaria: 'Carpintaria',
  mecanica: 'Mecânica',
  medicina: 'Primeiros socorros',
  agricultura: 'Agricultura',
  eletronica: 'Eletrônica',
  culinaria: 'Culinária',
  pesca: 'Pesca',
  armas: 'Armas',
  costura: 'Costura',
};

export const SKILLS = Object.keys(SKILL_LABEL) as SkillId[];

/** XP para chegar a cada nível (1..5). */
const LEVELS = [60, 180, 380, 700, 1150] as const;

export interface SkillsSave {
  version: 1;
  xp: Partial<Record<SkillId, number>>;
  books: string[];
}

export class Skills {
  private readonly xp = new Map<SkillId, number>();
  /** Manuais já lidos (cada um ensina uma vez). */
  readonly books = new Set<string>();

  level(id: SkillId): number {
    const x = this.xp.get(id) ?? 0;
    let l = 0;
    while (l < LEVELS.length && x >= LEVELS[l]!) l++;
    return l;
  }

  /** Progresso até o próximo nível (0..1). */
  progress(id: SkillId): number {
    const l = this.level(id);
    if (l >= LEVELS.length) return 1;
    const x = this.xp.get(id) ?? 0;
    const lo = l === 0 ? 0 : LEVELS[l - 1]!;
    return clamp((x - lo) / (LEVELS[l]! - lo), 0, 1);
  }

  /** Ganha experiência; devolve o novo nível se subiu (para avisar). */
  gain(id: SkillId, amount: number): number | null {
    const before = this.level(id);
    // Quem leu o manual aprende o dobro fazendo.
    const mult = [...this.books].some((b) => BOOK_SKILL[b] === id) ? 2 : 1;
    this.xp.set(id, (this.xp.get(id) ?? 0) + amount * mult);
    const after = this.level(id);
    return after > before ? after : null;
  }

  /** Terminou de ler um manual: sobe um nível (uma vez por livro). */
  readBook(bookId: string, skill: SkillId): number | null {
    if (this.books.has(bookId)) return null;
    this.books.add(bookId);
    const l = this.level(skill);
    if (l >= LEVELS.length) return null;
    this.xp.set(skill, Math.max(this.xp.get(skill) ?? 0, LEVELS[l]!));
    return l + 1;
  }

  /** Multiplicador de tempo das ações da habilidade (nível 5 = metade). */
  speed(id: SkillId): number {
    return 1 - this.level(id) * 0.1;
  }

  serialize(): SkillsSave {
    return { version: 1, xp: Object.fromEntries(this.xp), books: [...this.books] };
  }

  restore(s: SkillsSave | undefined): void {
    if (!s || s.version !== 1) return;
    for (const id of SKILLS) {
      const v = s.xp?.[id];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) this.xp.set(id, v);
    }
    for (const b of s.books ?? []) this.books.add(b);
  }
}

/** Que habilidade cada manual ensina (pelo id do item). */
export const BOOK_SKILL: Record<string, SkillId> = {
  livroCarpintaria: 'carpintaria',
  livroMecanica: 'mecanica',
  livroPrimeirosSocorros: 'medicina',
  livroAgricultura: 'agricultura',
  livroEletronica: 'eletronica',
  livroCulinaria: 'culinaria',
  livroPesca: 'pesca',
  revistaArmas: 'armas',
};

export function isSkill(s: string | undefined): s is SkillId {
  return !!s && (SKILLS as string[]).includes(s);
}
