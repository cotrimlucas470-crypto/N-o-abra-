/**
 * Persistência em IndexedDB (regra 20): o usuário fecha e reabre sem perder nada.
 *
 * Stores:
 *  - projects: { id, name, updatedAt, data }   (data inclui assets, com Blobs nativos)
 *  - meta:     { key, value }                  (último projeto aberto, settings, etc.)
 *
 * Fallback: se IndexedDB não existir/estiver bloqueado (modo privado antigo), caímos
 * para localStorage sem blobs, avisando o usuário. Nada quebra silenciosamente.
 */

const DB_NAME = 'forge-mobile';
const DB_VERSION = 1;

export class Storage {
  constructor(logger) {
    this.logger = logger;
    this.db = null;
    this.mode = 'indexeddb';
  }

  async open() {
    if (this.db) return this.db;
    if (!('indexedDB' in window)) { this.mode = 'localstorage'; return null; }
    try {
      this.db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('projects')) {
            const s = db.createObjectStore('projects', { keyPath: 'id' });
            s.createIndex('updatedAt', 'updatedAt');
          }
          if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('IndexedDB bloqueado por outra aba.'));
      });
      return this.db;
    } catch (err) {
      this.mode = 'localstorage';
      this.logger && this.logger.warn(`IndexedDB indisponível (${err.message}). Usando localStorage — assets binários não serão salvos.`);
      return null;
    }
  }

  _tx(store, mode = 'readonly') {
    return this.db.transaction(store, mode).objectStore(store);
  }

  _req(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveProject(record) {
    await this.open();
    if (this.mode === 'localstorage') {
      const light = JSON.stringify(record, (k, v) => (v instanceof Blob ? undefined : v));
      localStorage.setItem('fm:project:' + record.id, light);
      localStorage.setItem('fm:lastProject', record.id);
      return record.id;
    }
    await this._req(this._tx('projects', 'readwrite').put(record));
    await this.setMeta('lastProject', record.id);
    return record.id;
  }

  async loadProject(id) {
    await this.open();
    if (this.mode === 'localstorage') {
      const raw = localStorage.getItem('fm:project:' + id);
      return raw ? JSON.parse(raw) : null;
    }
    return this._req(this._tx('projects').get(id));
  }

  async listProjects() {
    await this.open();
    if (this.mode === 'localstorage') {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('fm:project:')) {
          try { const p = JSON.parse(localStorage.getItem(k)); out.push({ id: p.id, name: p.name, updatedAt: p.updatedAt }); } catch { /* ignora */ }
        }
      }
      return out.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    const all = await this._req(this._tx('projects').getAll());
    return all.map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteProject(id) {
    await this.open();
    if (this.mode === 'localstorage') { localStorage.removeItem('fm:project:' + id); return; }
    await this._req(this._tx('projects', 'readwrite').delete(id));
  }

  async setMeta(key, value) {
    await this.open();
    if (this.mode === 'localstorage') { localStorage.setItem('fm:' + key, JSON.stringify(value)); return; }
    await this._req(this._tx('meta', 'readwrite').put({ key, value }));
  }

  async getMeta(key, fallback = null) {
    await this.open();
    if (this.mode === 'localstorage') {
      const raw = localStorage.getItem('fm:' + key);
      return raw ? JSON.parse(raw) : fallback;
    }
    const rec = await this._req(this._tx('meta').get(key));
    return rec ? rec.value : fallback;
  }

  /** Estimativa de uso de armazenamento (quando o navegador expõe). */
  async estimate() {
    if (navigator.storage && navigator.storage.estimate) {
      try { return await navigator.storage.estimate(); } catch { return null; }
    }
    return null;
  }
}
