import { bus } from '../core/EventBus.js';

/**
 * Undo/Redo (regra 26).
 *
 * Dois tipos de entrada:
 *  - comandos com undo/redo explícitos (edições de propriedade — baratos e coalescíveis);
 *  - snapshots da cena (operações estruturais — criar/excluir/duplicar/reparentar),
 *    onde restaurar o JSON inteiro é mais seguro do que inverter cada passo.
 *
 * O limite de pilha existe para não segurar dezenas de snapshots na memória do celular.
 */
export class History {
  constructor({ limit = 60 } = {}) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
    this.enabled = true;
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  push(entry) {
    if (!this.enabled) return;
    this.undoStack.push({ time: Date.now(), ...entry });
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
    bus.emit('history:changed', this);
  }

  /** Coalesce edições seguidas do mesmo alvo/propriedade (ex.: arrastar um slider). */
  pushProperty({ label, target, key, before, after, apply, window = 600 }) {
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && last.kind === 'prop' && last.target === target && last.key === key && Date.now() - last.time < window) {
      last.after = after;
      last.time = Date.now();
      bus.emit('history:changed', this);
      return;
    }
    const entry = { kind: 'prop', label, target, key, before, after };
    entry.undo = () => apply(entry.before);
    entry.redo = () => apply(entry.after);   // `after` é atualizado pelo coalescing acima
    this.push(entry);
  }

  undo() {
    const e = this.undoStack.pop();
    if (!e) return null;
    this.enabled = false;
    try { e.undo(); } finally { this.enabled = true; }
    this.redoStack.push(e);
    bus.emit('history:changed', this);
    return e;
  }

  redo() {
    const e = this.redoStack.pop();
    if (!e) return null;
    this.enabled = false;
    try { (e.redo || e.undo)(); } finally { this.enabled = true; }
    this.undoStack.push(e);
    bus.emit('history:changed', this);
    return e;
  }

  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    bus.emit('history:changed', this);
  }
}
