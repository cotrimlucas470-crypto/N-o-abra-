/**
 * Estado das ferramentas de debug (só existe com ?debug na URL).
 * O painel (DebugScene) liga/desliga; a cena do jogo desenha (DebugWorldLayer).
 * Fases futuras acrescentam camadas: cone de visão dos zumbis, ruído, loot...
 */
export interface DebugState {
  /** Corpos de colisão (física Arcade). */
  colliders: boolean;
  /** Células bloqueadas da grade de navegação perto da câmera. */
  nav: boolean;
  /** Bordas dos chunks e quais estão carregados. */
  chunks: boolean;
  /** Ponto escolhido no mundo: desenha linha de visão e rota do jogador até ele. */
  target: { x: number; y: number } | null;
}

export function createDebugState(): DebugState {
  return { colliders: false, nav: false, chunks: false, target: null };
}
