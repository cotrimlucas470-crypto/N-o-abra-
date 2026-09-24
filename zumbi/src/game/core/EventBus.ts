/**
 * Barramento de eventos tipado, independente do Phaser.
 * Sistemas conversam por aqui sem se conhecerem (som, ruído, HUD, missões...).
 *
 * Para criar um evento novo: acrescente em GameEvents e use emit/on.
 */
export interface GameEvents {
  /** Um pé tocou o chão. loudness: 1 = andando, 2 = correndo. Base do sistema de ruído (etapa futura). */
  'player:footstep': { x: number; y: number; loudness: number };
  'player:enter-building': { buildingId: string; name: string; kind: string };
  'player:exit-building': { buildingId: string; name: string; kind: string };
  'world:region-entered': { regionId: string; name: string };
  /**
   * Barulho no mundo (porta, vidro, tiro...). radius em px: até onde dá para
   * ouvir. O sistema de ruído/zumbis vai escutar; hoje o debug desenha.
   */
  'world:noise': { x: number; y: number; radius: number; source: string };
  /** Resultado de uma ação do jogador para mostrar na tela ("Trancada.", "+1 Atadura"). */
  'player:feedback': { text: string; tone: 'info' | 'ok' | 'warn' };
  'game:paused': { reason: 'button' | 'hidden' };
  'game:resumed': Record<string, never>;
  'input:touch-detected': Record<string, never>;
  /** Pedido de interagir (botão de toque ou tecla E). */
  'input:interact': Record<string, never>;
  /** Um recipiente do mundo foi aberto: o HUD mostra o conteúdo ao lado do inventário. */
  'ui:container-open': { id: string };
  /** O recipiente aberto saiu do alcance (ou foi fechado). */
  'ui:container-close': Record<string, never>;
  /** O conteúdo do recipiente aberto mudou (o painel redesenha). */
  'ui:container-refresh': Record<string, never>;
  /** Painel: pegar a pilha `index` do recipiente aberto (ou tudo). */
  'loot:take': { index: number; all?: boolean };
  /** Painel: guardar a pilha do jogador no recipiente aberto. */
  'loot:store': { containerId: string; index: number };
  /** Painel: usar (comer, beber, curar, vestir) a pilha do jogador. */
  'inventory:use': { containerId: string; index: number };
  /** Painel: tirar a mochila (vazia). */
  'inventory:unequip': Record<string, never>;
  /** Pedido de largar itens de um recipiente do jogador (painel de inventário). */
  'inventory:drop': { containerId: string; index: number; count: number };
  'viewport:changed': { cssWidth: number; cssHeight: number; dpr: number };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  off<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Cópia: um handler pode se desinscrever durante o emit.
    for (const handler of [...set]) (handler as Handler<GameEvents[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}
