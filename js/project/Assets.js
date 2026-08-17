import { uid } from '../core/MathUtils.js';

/**
 * AssetManager — pastas, scripts, cenas, materiais, texturas, áudio e prefabs.
 *
 * Texturas viram ImageBitmap/HTMLImageElement sob demanda (lazy) e são liberadas
 * quando o asset é removido (regra 34: sem vazamento de memória / object URLs órfãs).
 */

const TEXTURE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'];
const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus'];
const MODEL_EXT = ['obj', 'gltf', 'glb', 'fbx'];

export const DEFAULT_FOLDERS = [
  'Assets/Scenes', 'Assets/Scripts', 'Assets/Materials',
  'Assets/Textures', 'Assets/Audio', 'Assets/Prefabs', 'Assets/Resources',
];

export class AssetManager {
  constructor(logger) {
    this.logger = logger;
    this.assets = new Map();     // id -> asset
    this._images = new Map();    // id -> HTMLImageElement
    this._urls = new Map();      // id -> objectURL
    this.onChange = null;
  }

  _touch() { if (this.onChange) this.onChange(); }

  /* ------------------------------ consultas ------------------------------ */

  get(id) { return this.assets.get(id) || null; }
  all() { return Array.from(this.assets.values()); }
  byType(type) { return this.all().filter((a) => a.type === type); }
  find(path, name) { return this.all().find((a) => a.path === path && a.name === name) || null; }
  folders() { return this.all().filter((a) => a.type === 'folder'); }

  children(path) {
    return this.all()
      .filter((a) => a.path === path && a.type !== 'folder')
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  subfolders(path) {
    return this.folders()
      .filter((f) => f.path === path)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /* ------------------------------ criação ------------------------------ */

  createFolder(path, name) {
    if (this.folders().some((f) => f.path === path && f.name === name)) return null;
    return this.add({ type: 'folder', name, path });
  }

  ensureDefaultFolders() {
    for (const full of DEFAULT_FOLDERS) {
      const idx = full.lastIndexOf('/');
      const path = full.slice(0, idx);
      const name = full.slice(idx + 1);
      if (path !== 'Assets' && !this.folders().some((f) => f.path + '/' + f.name === path)) continue;
      if (!this.folders().some((f) => f.path === path && f.name === name)) {
        this.add({ type: 'folder', name, path });
      }
    }
  }

  add(asset) {
    const a = {
      id: asset.id || uid('as'),
      name: asset.name || 'Asset',
      type: asset.type || 'json',
      path: asset.path ?? 'Assets',   // string vazia = raiz (não cai no default)
      content: asset.content ?? null,   // texto (scripts, json)
      data: asset.data ?? null,         // objeto (cena, material, prefab)
      blob: asset.blob ?? null,         // binário (textura, áudio)
      meta: asset.meta || {},
      updatedAt: asset.updatedAt || Date.now(),
    };
    this.assets.set(a.id, a);
    this._touch();
    return a;
  }

  update(id, patch) {
    const a = this.assets.get(id);
    if (!a) return null;
    Object.assign(a, patch, { updatedAt: Date.now() });
    if (patch.blob) this._releaseImage(id);
    this._touch();
    return a;
  }

  rename(id, name) {
    const a = this.assets.get(id);
    if (!a) return false;
    if (a.type === 'folder') {
      const oldPath = a.path + '/' + a.name;
      const newPath = a.path + '/' + name;
      for (const other of this.all()) {
        if (other.path === oldPath || other.path.startsWith(oldPath + '/')) {
          other.path = newPath + other.path.slice(oldPath.length);
        }
      }
    }
    a.name = name;
    a.updatedAt = Date.now();
    this._touch();
    return true;
  }

  remove(id) {
    const a = this.assets.get(id);
    if (!a) return false;
    if (a.type === 'folder') {
      const full = a.path + '/' + a.name;
      for (const other of this.all()) {
        if (other.id !== id && (other.path === full || other.path.startsWith(full + '/'))) this.remove(other.id);
      }
    }
    this._releaseImage(id);
    this.assets.delete(id);
    this._touch();
    return true;
  }

  /* ------------------------------ imagens ------------------------------ */

  getImage(id) {
    const cached = this._images.get(id);
    if (cached !== undefined) return cached && cached.complete ? cached : null;
    const a = this.assets.get(id);
    if (!a || !a.blob) { this._images.set(id, null); return null; }
    const url = URL.createObjectURL(a.blob);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    this._urls.set(id, url);
    this._images.set(id, img);
    return null;   // fica disponível no próximo frame, sem travar o loop
  }

  _releaseImage(id) {
    const url = this._urls.get(id);
    if (url) { URL.revokeObjectURL(url); this._urls.delete(id); }
    this._images.delete(id);
  }

  releaseAll() {
    for (const id of Array.from(this._urls.keys())) this._releaseImage(id);
  }

  /* ------------------------------ importação ------------------------------ */

  static typeForFile(fileName) {
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    if (TEXTURE_EXT.includes(ext)) return 'texture';
    if (AUDIO_EXT.includes(ext)) return 'audio';
    if (ext === 'js') return 'script';
    if (ext === 'json') return 'json';
    if (MODEL_EXT.includes(ext)) return 'model';
    return null;
  }

  /** Importa um File do seletor do sistema. Formatos não suportados são reportados. */
  async importFile(file, path = 'Assets') {
    const type = AssetManager.typeForFile(file.name);
    if (!type) {
      this.logger.warn(`Formato não suportado: ${file.name}. Suportados: ${[...TEXTURE_EXT, ...AUDIO_EXT, 'js', 'json'].join(', ')}.`);
      return null;
    }
    if (type === 'model') {
      this.logger.warn(`"${file.name}": modelos 3D são guardados como arquivo, mas o renderer simplificado não os desenha (limitação documentada).`);
      return this.add({ name: file.name, type: 'model', path, blob: file, meta: { size: file.size } });
    }
    if (type === 'script' || type === 'json') {
      const text = await file.text();
      const folder = type === 'script' ? 'Assets/Scripts' : path;
      return this.add({ name: file.name, type, path: folder, content: text, meta: { size: file.size } });
    }
    const folder = type === 'texture' ? 'Assets/Textures' : 'Assets/Audio';
    return this.add({ name: file.name, type, path: folder, blob: file, meta: { size: file.size, mime: file.type } });
  }

  /* ------------------------------ serialização ------------------------------ */

  /** Para IndexedDB: Blobs são suportados nativamente, então vão como estão. */
  serialize() {
    return this.all().map((a) => ({ ...a }));
  }

  load(list) {
    this.releaseAll();
    this.assets.clear();
    for (const a of list || []) this.assets.set(a.id, { ...a });
    this._touch();
  }

  /** Para export em JSON: blobs viram base64 (dataURL). */
  async serializePortable() {
    const out = [];
    for (const a of this.all()) {
      const copy = { ...a };
      if (a.blob) { copy.blobData = await blobToDataURL(a.blob); copy.blob = null; }
      out.push(copy);
    }
    return out;
  }

  async loadPortable(list) {
    this.releaseAll();
    this.assets.clear();
    for (const a of list || []) {
      const copy = { ...a };
      if (copy.blobData) { copy.blob = await dataURLToBlob(copy.blobData); delete copy.blobData; }
      this.assets.set(copy.id, copy);
    }
    this._touch();
  }

  get stats() {
    let bytes = 0;
    for (const a of this.all()) {
      if (a.blob) bytes += a.blob.size;
      else if (a.content) bytes += a.content.length;
      else if (a.data) bytes += JSON.stringify(a.data).length;
    }
    return { count: this.assets.size, bytes };
  }
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

export async function dataURLToBlob(url) {
  const res = await fetch(url);
  return res.blob();
}
