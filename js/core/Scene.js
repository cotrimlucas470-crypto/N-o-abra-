import { GameObject } from './GameObject.js';
import { uid } from './MathUtils.js';

/**
 * Cena: raízes + índice por tipo de componente.
 *
 * O índice é a base da performance do runtime: renderer, física e scripting pegam
 * listas prontas em vez de percorrer a árvore inteira a cada frame.
 */
export class Scene {
  constructor(name = 'SampleScene', id = null) {
    this.id = id || uid('sc');
    this.name = name;
    this.roots = [];
    this.byId = new Map();
    this.settings = {
      gravity: { x: 0, y: -9.81 },
      backgroundColor: '#12141a',
      ambientColor: '#ffffff',
      ambientIntensity: 0.85,
      pixelsPerUnit: 48,
    };
    this.running = false;
    this._index = new Map();   // type -> Set<Component>
    this._version = 0;         // incrementa a cada mudança estrutural (UI observa isso)
    this._pendingStart = [];
  }

  markDirty() { this._version++; }
  get version() { return this._version; }

  /* ------------------------------ objetos ------------------------------ */

  add(go, parent = null) {
    if (go.scene === this && this.byId.has(go.id)) return go;
    go.scene = this;
    this.byId.set(go.id, go);
    for (const c of go.components) this._indexComponent(c);

    if (parent) {
      if (go.parent !== parent) {
        go.parent = parent;
        if (!parent.children.includes(go)) parent.children.push(go);
      }
    } else if (!go.parent) {
      if (!this.roots.includes(go)) this.roots.push(go);
    }

    for (const ch of go.children) this.add(ch, go);
    if (this.running) {
      for (const c of go.components) { try { c.awake(); } catch (e) { console.error(e); } }
      this._pendingStart.push(go);
    }
    this.markDirty();
    return go;
  }

  create(name = 'GameObject', parent = null) {
    return this.add(new GameObject(name), parent);
  }

  _remove(go) {
    this.byId.delete(go.id);
    for (const c of go.components) this._unindexComponent(c);
    const i = this.roots.indexOf(go);
    if (i >= 0) this.roots.splice(i, 1);
    this.markDirty();
  }

  find(name) {
    for (const go of this.byId.values()) if (go.name === name) return go;
    return null;
  }

  findById(id) { return this.byId.get(id) || null; }

  findWithTag(tag) {
    const out = [];
    for (const go of this.byId.values()) if (go.tag === tag) out.push(go);
    return out;
  }

  get objectCount() { return this.byId.size; }

  /* ------------------------------ índice ------------------------------ */

  _indexComponent(c) {
    let set = this._index.get(c.type);
    if (!set) { set = new Set(); this._index.set(c.type, set); }
    set.add(c);
  }

  _unindexComponent(c) {
    const set = this._index.get(c.type);
    if (set) set.delete(c);
  }

  /** Retorna o Set vivo de componentes de um tipo (não modifique fora da engine). */
  components(type) {
    let set = this._index.get(type);
    if (!set) { set = new Set(); this._index.set(type, set); }
    return set;
  }

  /** Componentes ativos de um tipo, em array reutilizável. */
  activeComponents(type, out = []) {
    out.length = 0;
    for (const c of this.components(type)) {
      if (c.enabled && c.gameObject && !c.gameObject._destroyed && c.gameObject.activeInHierarchy) out.push(c);
    }
    return out;
  }

  /** Câmera principal (a primeira marcada como main, senão a primeira existente). */
  get mainCamera() {
    let first = null;
    for (const c of this.components('Camera')) {
      if (!c.gameObject || !c.gameObject.activeInHierarchy) continue;
      if (c.isMain) return c;
      if (!first) first = c;
    }
    return first;
  }

  /* ------------------------------ serialização ------------------------------ */

  serialize() {
    return {
      id: this.id,
      name: this.name,
      settings: JSON.parse(JSON.stringify(this.settings)),
      roots: this.roots.map((r) => r.serialize()),
    };
  }

  static deserialize(data, keepIds = true) {
    const scene = new Scene(data.name || 'SampleScene', keepIds ? data.id : null);
    Object.assign(scene.settings, data.settings || {});
    for (const rd of data.roots || []) {
      const go = GameObject.deserialize(rd, keepIds);
      scene.add(go);
    }
    return scene;
  }

  clone() { return Scene.deserialize(this.serialize(), true); }

  dispose() {
    for (const go of Array.from(this.roots)) go.destroy();
    this.roots.length = 0;
    this.byId.clear();
    this._index.clear();
  }
}
