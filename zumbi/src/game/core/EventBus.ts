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
  'game:paused': { reason: 'button' | 'hidden' };
  'game:resumed': Record<string, never>;
  'input:touch-detected': Record<string, never>;
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
