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
  /** Um som no mundo. `kind` ausente = deduzido do texto de origem (ver sim/Noise.ts). */
  'world:noise': { x: number; y: number; radius: number; source: string; kind?: import('../sim/Noise').NoiseKind; byPlayer?: boolean };
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
  /** Painel: executar a ação `action` no item em `loc` (ver interaction/itemActions). */
  'item:action': { loc: import('../interaction/itemActions/types').ItemWhere; action: string };
  /** Atacar (golpe ou tiro) para onde o jogador olha. */
  'input:attack': Record<string, never>;
  /** Recarregar a arma da mão. */
  'input:reload': Record<string, never>;
  /** Empurrar quem está na frente (solta agarrão, derruba zumbi). */
  'input:shove': Record<string, never>;
  /** Liga/desliga o andar furtivo (agachado). */
  'input:sneak': Record<string, never>;
  /** O jogador morreu: relatório da causa (a tela de morte mostra). */
  'player:died': { report: import('../survival/Death').DeathReport };
  /** Cartão de informação (examinar veículo...). */
  'ui:info': { title: string; lines: string[] };
  /** Abrir o mapa da cidade (item mapa). */
  'ui:map': { annotated: boolean };
  /** Pedido do menu "⋯" (botão ou tecla Q): a cena monta `session.options`. */
  'interaction:options': Record<string, never>;
  /** Escolha no menu "⋯". */
  'interaction:option': { index: number };
  /** O menu "⋯" foi montado (o HUD mostra). */
  'ui:options-ready': Record<string, never>;
  /** Abrir o painel numa aba (FABRICAR ao "Cozinhar aqui" na fogueira). */
  'ui:tab': { tab: string };
  /** Modo construir: escolher a peça, confirmar o lugar, girar, sair. */
  'build:start': { recipe: string };
  'build:confirm': Record<string, never>;
  'build:rotate': Record<string, never>;
  'build:cancel': Record<string, never>;
  /** Fabricar a receita (aba FABRICAR ou ação COZINHAR no item). */
  'craft:start': { recipe: string };
  /** Cancelar a ação em andamento (ou acordar). */
  'action:cancel': Record<string, never>;
  /** Dormir no chão / onde estiver (painel CORPO). */
  'body:sleep': { place: 'cama' | 'sofa' | 'chao'; wakeAt?: number };
  /** Tratar o ferimento `wound` com a opção `option` (aba CORPO). */
  'health:treat': { wound: number; option: string };
  /** O jogo foi salvo (automático ou manual). */
  'game:saved': { ok: boolean };
  /** Pedido de salvar agora (menu de pausa). */
  'game:save-request': Record<string, never>;
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
