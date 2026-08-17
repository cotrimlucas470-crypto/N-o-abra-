/**
 * Barramento de eventos mínimo (sem dependências).
 * Usado para desacoplar Engine <-> Editor e evitar polling por frame na UI.
 */
export class EventBus {
  constructor() { this._map = new Map(); }

  on(event, fn) {
    let set = this._map.get(event);
    if (!set) { set = new Set(); this._map.set(event, set); }
    set.add(fn);
    return () => this.off(event, fn);
  }

  once(event, fn) {
    const un = this.on(event, (p) => { un(); fn(p); });
    return un;
  }

  off(event, fn) {
    const set = this._map.get(event);
    if (set) { set.delete(fn); if (!set.size) this._map.delete(event); }
  }

  emit(event, payload) {
    const set = this._map.get(event);
    if (!set) return;
    // cópia defensiva: handlers podem se desinscrever durante o emit
    for (const fn of Array.from(set)) {
      try { fn(payload); }
      catch (err) { console.error(`[EventBus] handler de "${event}" falhou:`, err); }
    }
  }

  clear() { this._map.clear(); }
}

export const bus = new EventBus();
