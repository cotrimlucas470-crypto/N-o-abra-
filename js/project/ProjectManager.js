import { AssetManager } from './Assets.js';
import { Scene } from '../core/Scene.js';
import { createZip, readZip } from './Zip.js';
import { uid } from '../core/MathUtils.js';
import { bus } from '../core/EventBus.js';

/**
 * ProjectManager — ciclo de vida do projeto: criar, abrir, salvar, exportar, importar.
 * A cena aberta é sempre um asset do tipo "scene"; salvar serializa a cena viva de volta
 * para o asset e grava o projeto inteiro no IndexedDB.
 */
export class ProjectManager {
  constructor({ storage, logger }) {
    this.storage = storage;
    this.logger = logger;
    this.assets = new AssetManager(logger);
    this.id = null;
    this.name = 'Novo Projeto';
    this.createdAt = 0;
    this.activeSceneAssetId = null;
    this.dirty = false;
    this.settings = {};
    this._autosaveTimer = 0;
  }

  markDirty() {
    if (!this.dirty) { this.dirty = true; bus.emit('project:dirty', true); }
    this._scheduleAutosave();
  }

  _scheduleAutosave() {
    clearTimeout(this._autosaveTimer);
    this._autosaveTimer = setTimeout(() => {
      if (this.dirty && this.onAutosave) this.onAutosave();
    }, 20000);
  }

  /* ------------------------------ criação/abertura ------------------------------ */

  async createProject(name = 'Novo Projeto', { withDemo = false } = {}) {
    this.assets.releaseAll();
    this.assets.assets.clear();
    this.id = uid('pr');
    this.name = name;
    this.createdAt = Date.now();
    this.settings = {};

    this.assets.add({ type: 'folder', name: 'Assets', path: '' });
    this.assets.ensureDefaultFolders();

    let scene;
    if (withDemo) {
      const { buildMiniAdventure } = await import('./demo/MiniAdventure.js');
      scene = await buildMiniAdventure(this.assets);
    } else {
      scene = new Scene('SampleScene');
      const cam = scene.create('Main Camera');
      cam.addComponent('Camera');
      cam.transform.position.y = 1;
      const light = scene.create('Directional Light');
      const l = light.addComponent('Light');
      l.lightType = 'directional';
      light.transform.position.y = 4;
    }

    const sceneAsset = this.assets.add({
      name: `${scene.name}.fgscene`, type: 'scene', path: 'Assets/Scenes', data: scene.serialize(),
    });
    this.activeSceneAssetId = sceneAsset.id;
    this.dirty = true;
    return scene;
  }

  async openProject(id) {
    const rec = await this.storage.loadProject(id);
    if (!rec) throw new Error('Projeto não encontrado.');
    this.id = rec.id;
    this.name = rec.name;
    this.createdAt = rec.createdAt || Date.now();
    this.settings = rec.data.settings || {};
    this.assets.load(rec.data.assets || []);
    this.activeSceneAssetId = rec.data.activeSceneAssetId || (this.assets.byType('scene')[0] || {}).id || null;
    this.dirty = false;
    return this.loadActiveScene();
  }

  loadActiveScene() {
    const asset = this.assets.get(this.activeSceneAssetId);
    if (!asset || !asset.data) return new Scene('SampleScene');
    return Scene.deserialize(asset.data, true);
  }

  /* ------------------------------ cenas ------------------------------ */

  createScene(name = 'New Scene') {
    const scene = new Scene(name);
    const cam = scene.create('Main Camera');
    cam.addComponent('Camera');
    const asset = this.assets.add({ name: `${name}.fgscene`, type: 'scene', path: 'Assets/Scenes', data: scene.serialize() });
    this.markDirty();
    return { scene, asset };
  }

  storeScene(scene, assetId = this.activeSceneAssetId) {
    const asset = this.assets.get(assetId);
    if (!asset) return null;
    asset.data = scene.serialize();
    asset.updatedAt = Date.now();
    this.markDirty();
    return asset;
  }

  duplicateScene(assetId) {
    const asset = this.assets.get(assetId);
    if (!asset) return null;
    const data = JSON.parse(JSON.stringify(asset.data));
    data.id = uid('sc');
    data.name = data.name + ' Copy';
    const copy = this.assets.add({ name: data.name + '.fgscene', type: 'scene', path: asset.path, data });
    this.markDirty();
    return copy;
  }

  /* ------------------------------ persistência ------------------------------ */

  async save(scene) {
    if (scene) this.storeScene(scene);
    const record = {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: Date.now(),
      data: {
        activeSceneAssetId: this.activeSceneAssetId,
        settings: this.settings,
        assets: this.assets.serialize(),
      },
    };
    await this.storage.saveProject(record);
    this.dirty = false;
    bus.emit('project:dirty', false);
    return record;
  }

  /* ------------------------------ export / import ------------------------------ */

  async exportJSON(scene) {
    if (scene) this.storeScene(scene);
    return {
      format: 'forge-mobile-project',
      version: 1,
      exportedAt: new Date().toISOString(),
      project: {
        id: this.id, name: this.name, createdAt: this.createdAt,
        activeSceneAssetId: this.activeSceneAssetId, settings: this.settings,
      },
      assets: await this.assets.serializePortable(),
    };
  }

  /** Exporta como .zip com a árvore real de pastas + project.json. */
  async exportZip(scene) {
    const json = await this.exportJSON(scene);
    const files = [{ name: 'project.json', data: JSON.stringify(json, null, 2) }];
    for (const a of this.assets.all()) {
      if (a.type === 'folder') continue;
      const dir = a.path ? a.path + '/' : '';
      if (a.content != null) files.push({ name: dir + a.name, data: a.content });
      else if (a.data != null) files.push({ name: dir + a.name, data: JSON.stringify(a.data, null, 2) });
      else if (a.blob) files.push({ name: dir + a.name, data: new Uint8Array(await a.blob.arrayBuffer()) });
    }
    files.push({ name: 'README.txt', data: readmeText(this.name) });
    return createZip(files);
  }

  async importFile(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.zip')) {
      const map = await readZip(await file.arrayBuffer());
      const pj = map.get('project.json');
      if (!pj) throw new Error('ZIP sem project.json — não é um projeto Forge Mobile.');
      return this.importJSON(JSON.parse(new TextDecoder().decode(pj)));
    }
    const text = await file.text();
    return this.importJSON(JSON.parse(text));
  }

  async importJSON(json) {
    if (!json || json.format !== 'forge-mobile-project') throw new Error('Arquivo não é um projeto Forge Mobile.');
    const p = json.project || {};
    this.id = uid('pr');
    this.name = (p.name || 'Projeto Importado');
    this.createdAt = Date.now();
    this.settings = p.settings || {};
    await this.assets.loadPortable(json.assets || []);
    this.activeSceneAssetId = p.activeSceneAssetId && this.assets.get(p.activeSceneAssetId)
      ? p.activeSceneAssetId
      : (this.assets.byType('scene')[0] || {}).id || null;
    this.dirty = true;
    return this.loadActiveScene();
  }
}

function readmeText(projectName) {
  return `Projeto "${projectName}" exportado do Forge Mobile.

Estrutura:
  project.json      -> projeto completo (cenas, scripts, materiais, assets em base64)
  Assets/...        -> os mesmos arquivos em pastas reais, para leitura/edição externa

Para reimportar: Forge Mobile > Menu > Import Project e escolha este .zip
(ou o project.json de dentro dele).
`;
}
