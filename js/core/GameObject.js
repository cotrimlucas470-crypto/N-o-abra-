import { createComponent, getComponentClass } from './Component.js';
import { Transform } from './components/Transform.js';
import { uid } from './MathUtils.js';

/**
 * Nó da cena. Sempre possui um Transform.
 * A indexação por tipo de componente vive na Scene (evita varrer a árvore por frame).
 */
export class GameObject {
  constructor(name = 'GameObject', id = null) {
    this.id = id || uid('go');
    this.name = name;
    this.active = true;
    this.tag = '';
    this.parent = null;
    this.children = [];
    this.components = [];
    this.scene = null;
    this._destroyed = false;

    const t = new Transform();
    t.gameObject = this;
    this.components.push(t);
    this.transform = t;
  }

  /** Ativo levando a hierarquia em conta. */
  get activeInHierarchy() {
    let go = this;
    while (go) { if (!go.active) return false; go = go.parent; }
    return true;
  }

  setActive(v) {
    if (this.active === v) return;
    this.active = v;
    for (const c of this.components) {
      if (!c.enabled) continue;
      if (v) c.onEnable(); else c.onDisable();
    }
    if (this.scene) this.scene.markDirty();
  }

  /* ------------------------------ componentes ------------------------------ */

  addComponent(type, data) {
    const Cls = typeof type === 'string' ? getComponentClass(type) : type;
    if (!Cls) throw new Error(`Componente desconhecido: ${type}`);
    if (Cls.unique && this.getComponent(Cls.type)) return this.getComponent(Cls.type);

    const comp = typeof type === 'string' ? createComponent(type, data) : new Cls(data);
    comp.gameObject = this;
    this.components.push(comp);
    if (this.scene) {
      this.scene._indexComponent(comp);
      if (this.scene.running) { comp.awake(); }
    }
    return comp;
  }

  getComponent(type) {
    const t = typeof type === 'string' ? type : type.type;
    for (const c of this.components) if (c.type === t) return c;
    return null;
  }

  getComponents(type) {
    const t = typeof type === 'string' ? type : type.type;
    return this.components.filter((c) => c.type === t);
  }

  /** Procura o componente em si ou nos filhos (usado por scripts). */
  getComponentInChildren(type) {
    const found = this.getComponent(type);
    if (found) return found;
    for (const ch of this.children) {
      const r = ch.getComponentInChildren(type);
      if (r) return r;
    }
    return null;
  }

  removeComponent(comp) {
    if (!comp || comp.constructor.removable === false) return false;
    const i = this.components.indexOf(comp);
    if (i < 0) return false;
    this.components.splice(i, 1);
    try { comp.onDestroy(); } catch (e) { console.error(e); }
    if (this.scene) this.scene._unindexComponent(comp);
    return true;
  }

  /* ------------------------------ hierarquia ------------------------------ */

  addChild(go) { go.setParent(this); return go; }

  setParent(parent, keepWorldPosition = true) {
    if (parent === this || this._isAncestorOf(parent)) return false; // impede ciclo
    const world = keepWorldPosition ? this.transform.getWorldPosition() : null;

    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    } else if (this.scene) {
      const i = this.scene.roots.indexOf(this);
      if (i >= 0) this.scene.roots.splice(i, 1);
    }

    this.parent = parent || null;
    if (parent) {
      parent.children.push(this);
      if (parent.scene && parent.scene !== this.scene) parent.scene.add(this);
    } else if (this.scene) {
      this.scene.roots.push(this);
    }

    if (world) this.transform.setWorldPosition(world.x, world.y, world.z);
    if (this.scene) this.scene.markDirty();
    return true;
  }

  _isAncestorOf(go) {
    let p = go && go.parent;
    while (p) { if (p === this) return true; p = p.parent; }
    return false;
  }

  forEachDescendant(fn) {
    for (const c of this.children) { fn(c); c.forEachDescendant(fn); }
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    for (const c of Array.from(this.children)) c.destroy();
    for (const c of this.components) { try { c.onDestroy(); } catch (e) { console.error(e); } }
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    }
    if (this.scene) this.scene._remove(this);
    this.parent = null;
  }

  /* ------------------------------ serialização ------------------------------ */

  serialize() {
    return {
      id: this.id,
      name: this.name,
      active: this.active,
      tag: this.tag,
      components: this.components.map((c) => c.serialize()),
      children: this.children.map((c) => c.serialize()),
    };
  }

  static deserialize(data, keepIds = true) {
    const go = new GameObject(data.name || 'GameObject', keepIds ? data.id : null);
    go.active = data.active !== false;
    go.tag = data.tag || '';
    for (const cd of data.components || []) {
      if (cd.type === 'Transform') { go.transform.deserialize(cd); continue; }
      try {
        const comp = createComponent(cd.type, cd);
        comp.gameObject = go;
        go.components.push(comp);
      } catch (err) {
        console.warn(`[GameObject] componente ignorado (${cd.type}):`, err.message);
      }
    }
    for (const cd of data.children || []) {
      const child = GameObject.deserialize(cd, keepIds);
      child.parent = go;
      go.children.push(child);
    }
    return go;
  }

  clone(rename = true) {
    const data = this.serialize();
    const copy = GameObject.deserialize(reidentify(data), false);
    if (rename) copy.name = nextName(this.name);
    return copy;
  }
}

function reidentify(data) {
  data.id = uid('go');
  for (const c of data.children || []) reidentify(c);
  return data;
}

function nextName(name) {
  const m = name.match(/^(.*?)\s\((\d+)\)$/);
  if (m) return `${m[1]} (${Number(m[2]) + 1})`;
  return `${name} (1)`;
}
