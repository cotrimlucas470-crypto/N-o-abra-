/**
 * Base de todos os componentes + registro global de tipos.
 *
 * O Inspector é gerado a partir de `static schema`, portanto todo campo exibido
 * está ligado a uma propriedade real do componente (regra 38: nada decorativo).
 */

export class Component {
  static type = 'Component';
  static label = 'Component';
  static icon = '▪';
  static unique = false;      // se true, só um por GameObject
  static removable = true;
  static schema = [];         // [{ key, label, type, ...opts }]

  constructor(data = {}) {
    this.enabled = data.enabled !== false;
    this.gameObject = null;
    this._started = false;
  }

  get type() { return this.constructor.type; }
  get transform() { return this.gameObject && this.gameObject.transform; }
  get scene() { return this.gameObject && this.gameObject.scene; }

  /* ciclo de vida — sobrescreva no componente concreto */
  awake() {}
  start() {}
  update(_dt) {}
  fixedUpdate(_dt) {}
  lateUpdate(_dt) {}
  onDestroy() {}
  onEnable() {}
  onDisable() {}

  /** Serialização: por padrão grava todas as chaves do schema. */
  serialize() {
    const out = { type: this.type, enabled: this.enabled };
    for (const f of this.constructor.schema) {
      const v = this[f.key];
      out[f.key] = (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
    }
    return out;
  }

  deserialize(data = {}) {
    if ('enabled' in data) this.enabled = data.enabled !== false;
    for (const f of this.constructor.schema) {
      if (!(f.key in data)) continue;
      const v = data[f.key];
      if (v && typeof v === 'object' && this[f.key] && typeof this[f.key] === 'object') {
        Object.assign(this[f.key], v);
      } else {
        this[f.key] = v;
      }
    }
    return this;
  }

  /** Chamado quando o Inspector altera um campo (permite reagir/invalidar cache). */
  onFieldChanged(_key, _value) {}
}

/* ------------------------------------------------------------------ */
/* Registro de tipos                                                    */
/* ------------------------------------------------------------------ */

const registry = new Map();

export function registerComponent(cls) {
  if (!cls.type || cls.type === 'Component') throw new Error('Componente sem static type');
  registry.set(cls.type, cls);
  return cls;
}

export function getComponentClass(type) { return registry.get(type); }
export function listComponentTypes() { return Array.from(registry.values()); }

export function createComponent(type, data) {
  const Cls = registry.get(type);
  if (!Cls) throw new Error(`Componente desconhecido: ${type}`);
  const c = new Cls(data);
  if (data) c.deserialize(data);
  return c;
}
