import { bus } from '../core/EventBus.js';
import { Engine } from '../core/Engine.js';
import { Renderer } from '../core/Renderer.js';
import { Scene } from '../core/Scene.js';
import { GameObject } from '../core/GameObject.js';
import { AudioManager } from '../core/Audio.js';
import { ScriptEngine } from '../scripting/ScriptEngine.js';
import { Storage } from '../project/Storage.js';
import { ProjectManager } from '../project/ProjectManager.js';
import { QualityManager } from '../perf/Quality.js';
import { PerfMonitor } from '../perf/PerfMonitor.js';
import { device } from '../perf/Device.js';
import { runStressTest } from '../perf/StressTest.js';

import { ConsolePanel } from './Console.js';
import { History } from './History.js';
import { Hierarchy } from './Hierarchy.js';
import { Inspector } from './Inspector.js';
import { SceneView } from './SceneView.js';
import { GameView } from './GameView.js';
import { ProjectPanel } from './ProjectPanel.js';
import { ScriptEditor } from './ScriptEditor.js';
import { LearnPanel } from './Learn.js';
import { buildCommands, openCommandPalette, openGlobalSearch } from './Commands.js';
import { openSettings, openStressTestDialog, showReport } from './SettingsPanel.js';
import { openModal, listDialog, promptDialog, confirmDialog, toast } from './ui/Modal.js';

const NEW_SCRIPT_TEMPLATE = `// {NAME}
// start() roda uma vez; update() roda todo frame.

function start() {
  Debug.Log('{NAME} pronto em ' + gameObject.name);
}

function update() {
  // exemplo: transform.position.x += 2 * Time.deltaTime;
}
`;

export class Editor {
  constructor() {
    this.storage = new Storage(null);
    this.logger = new ConsolePanel({
      listEl: document.getElementById('console-list'),
      badgeEl: document.getElementById('console-badge'),
    });
    this.storage.logger = this.logger;

    this.project = new ProjectManager({ storage: this.storage, logger: this.logger });
    this.scriptEngine = new ScriptEngine({ assets: this.project.assets, logger: this.logger });
    this.audio = new AudioManager(this.project.assets, this.logger);
    this.engine = new Engine({ scriptEngine: this.scriptEngine, audio: this.audio, logger: this.logger });
    this.quality = new QualityManager(this.storage);
    this.history = new History();

    this.sceneRenderer = new Renderer(document.getElementById('scene-canvas'), this.project.assets);
    this.gameRenderer = new Renderer(document.getElementById('game-canvas'), this.project.assets);

    this.sceneView = new SceneView({ canvas: this.sceneRenderer.canvas, renderer: this.sceneRenderer, app: this });
    this.gameView = new GameView({
      canvas: this.gameRenderer.canvas,
      renderer: this.gameRenderer,
      app: this,
      controlsEl: document.getElementById('touch-controls'),
      emptyEl: document.getElementById('game-empty'),
    });

    this.hierarchy = new Hierarchy({
      el: document.getElementById('hierarchy-tree'),
      searchEl: document.getElementById('hier-search'),
      app: this,
    });
    this.inspector = new Inspector({ el: document.getElementById('inspector-body'), app: this });
    this.projectPanel = new ProjectPanel({ el: document.getElementById('project-tree'), app: this });
    this.scriptEditor = new ScriptEditor(this);
    this.learn = new LearnPanel({ el: document.getElementById('tab-learn'), app: this });

    this.perf = new PerfMonitor({ engine: this.engine, quality: this.quality, overlayEl: document.getElementById('perf-overlay') });
    this.perf.addRenderer('scene', this.sceneRenderer);
    this.perf.addRenderer('game', this.gameRenderer);

    this.selection = [];
    this.activeView = 'scene';
    this.commands = buildCommands(this);
    this._inspectorSyncAt = 0;
  }

  /* ------------------------------ boot ------------------------------ */

  async boot() {
    this.logger.captureGlobalErrors();
    this.logger.onOpenCode = (assetId, file, line) => this.locateCode(assetId, file, line);

    await this.storage.open();
    await this.quality.load();
    this.logger.limit = this.quality.settings.consoleLimit;
    document.body.dataset.reduceMotion = this.quality.settings.reduceMotion ? '1' : '0';

    device.measureRefreshRate().then((hz) => {
      this.logger.log(`Tela: ${hz} Hz medidos · ${device.screenW}×${device.screenH} · DPR ${device.dpr.toFixed(2)}`);
      this.applyQuality();
    });

    const lastId = await this.storage.getMeta('lastProject', null);
    let scene = null;
    if (lastId) {
      try { scene = await this.project.openProject(lastId); }
      catch (err) { this.logger.warn(`Não foi possível abrir o último projeto: ${err.message}`); }
    }
    if (!scene) {
      scene = await this.project.createProject('Mini Adventure', { withDemo: true });
      await this.project.save(scene);
      this.logger.log('Projeto de demonstração "Mini Adventure" criado. Aperte ▶ Play.');
    }

    this.project.onAutosave = () => this.saveAll(true);
    this.setScene(scene);
    this.applyQuality();
    this.bindUI();
    this.engine.input.attachKeyboard(window);
    this.engine.start();
    this.learn.render();
    this.projectPanel.refresh();

    if (device.matchesPocoX7ProProfile()) {
      this.logger.log('⚡ POCO X7 PRO OPTIMIZATION PROFILE ativo: qualidade alta + resolução dinâmica + 60 FPS (90/120 disponíveis em Settings).');
    }
    if (!device.hasWebGL) {
      this.logger.warn('WebGL indisponível neste navegador — o renderer Canvas2D continua funcionando normalmente.');
    }

    bus.on('perf:throttle', (info) => {
      this.logger.warn(`${info.message} (pico ${info.peak} FPS → agora ${info.now} FPS)`);
      toast('Possível thermal throttling detectado.', 'error');
    });
  }

  /* ------------------------------ cena e seleção ------------------------------ */

  get scene() { return this.engine.scene; }

  setScene(scene, { temporary = false } = {}) {
    this.engine.setEditScene(scene);
    scene.audio = this.audio;
    this.selection = [];
    this.hierarchy.refresh(true);
    this.inspector.setTarget(null);
    this.sceneView.markDirty();
    this.gameView.markDirty();
    if (!temporary) {
      this.history.clear();
      this.updateTitle();
      this.sceneView.frameSelection(scene.roots.slice(0, 12));
    }
    bus.emit('scene:changed', scene);
  }

  select(idOrGo, { additive = false } = {}) {
    const go = typeof idOrGo === 'string' ? this.scene.findById(idOrGo) : idOrGo;
    if (!go) { this.selection = []; }
    else if (additive) {
      const i = this.selection.indexOf(go);
      if (i >= 0) this.selection.splice(i, 1); else this.selection.push(go);
    } else {
      this.selection = [go];
    }
    this.hierarchy.updateSelection();
    this.inspector.setTarget(this.selection[this.selection.length - 1] || null);
    this.sceneView.markDirty();
  }

  isSelected(go) { return !!go && this.selection.includes(go); }

  onSceneEdited() {
    this.sceneView.markDirty();
    this.gameView.markDirty();
    this.project.markDirty();
    this.updateTitle();
  }

  refreshHierarchy() { this.hierarchy.refresh(true); }

  /* ------------------------------ edição com undo ------------------------------ */

  editProperty(target, key, value, apply, beforeOverride) {
    const path = key.split('.');
    const before = beforeOverride !== undefined ? beforeOverride
      : (path.length > 1 ? { ...target[path[0]] } : cloneValue(target[key]));
    apply(value);
    this.history.pushProperty({
      label: `Editar ${key}`,
      target, key, before, after: cloneValue(value),
      apply: (v) => { apply(v); this.inspector.render(true); this.sceneView.markDirty(); },
    });
    this.onSceneEdited();
  }

  pushTransformUndo(go, before) {
    const t = go.transform;
    const after = { position: { ...t.position }, rotation: { ...t.rotation }, scale: { ...t.scale } };
    this.history.push({
      label: 'Transform',
      undo: () => { applyTransform(go, before); this.inspector.render(true); this.sceneView.markDirty(); },
      redo: () => { applyTransform(go, after); this.inspector.render(true); this.sceneView.markDirty(); },
    });
  }

  /** Snapshot da cena inteira: usado nas operações estruturais. */
  withSceneSnapshot(label, fn) {
    const before = this.scene.serialize();
    const result = fn();
    const after = this.scene.serialize();
    this.history.push({
      label,
      undo: () => this.restoreSceneSnapshot(before),
      redo: () => this.restoreSceneSnapshot(after),
    });
    this.onSceneEdited();
    this.hierarchy.refresh(true);
    return result;
  }

  restoreSceneSnapshot(data) {
    const selIds = this.selection.map((g) => g.id);
    const scene = Scene.deserialize(data, true);
    this.engine.setEditScene(scene);
    scene.audio = this.audio;
    this.selection = selIds.map((id) => scene.findById(id)).filter(Boolean);
    this.hierarchy.refresh(true);
    this.inspector.setTarget(this.selection[0] || null);
    this.sceneView.markDirty();
    this.gameView.markDirty();
    bus.emit('scene:changed', scene);
  }

  undo() {
    const e = this.history.undo();
    if (!e) { toast('Nada para desfazer.'); return; }
    this.onSceneEdited();
    this.updateUndoButtons();
  }

  redo() {
    const e = this.history.redo();
    if (!e) { toast('Nada para refazer.'); return; }
    this.onSceneEdited();
    this.updateUndoButtons();
  }

  updateUndoButtons() {
    document.getElementById('btn-undo').disabled = !this.history.canUndo;
    document.getElementById('btn-redo').disabled = !this.history.canRedo;
  }

  /* ------------------------------ objetos ------------------------------ */

  createObject(kind = 'empty') {
    if (this.engine.isPlaying) { toast('Pare o Play para editar a cena.'); return null; }
    return this.withSceneSnapshot('Criar objeto', () => {
      const scene = this.scene;
      const parent = this.selection[0] || null;
      const go = new GameObject(nameFor(kind));
      scene.add(go, parent);
      const center = { x: this.sceneView.view.x, y: this.sceneView.view.y };
      go.transform.position.x = Math.round(center.x * 2) / 2;
      go.transform.position.y = Math.round(center.y * 2) / 2;

      switch (kind) {
        case 'sprite': go.addComponent('SpriteRenderer'); break;
        case 'circle': { const sr = go.addComponent('SpriteRenderer'); sr.shape = 'circle'; sr.color = '#4aa8ff'; break; }
        case 'cube': go.addComponent('MeshRenderer'); break;
        case 'ground': {
          const mr = go.addComponent('MeshRenderer');
          mr.mesh = 'plane'; mr.size = { x: 12, y: 1, z: 1 }; mr.color = '#3a4353';
          go.addComponent('Collider').matchRenderer = true;
          break;
        }
        case 'physics': {
          const sr = go.addComponent('SpriteRenderer');
          sr.shape = 'rect';
          go.addComponent('Rigidbody');
          go.addComponent('Collider').matchRenderer = true;
          break;
        }
        case 'camera': go.addComponent('Camera').isMain = !scene.mainCamera; break;
        case 'light': go.addComponent('Light'); break;
        case 'uiText': { const u = go.addComponent('UIElement'); u.kind = 'text'; u.text = 'Novo texto'; break; }
        case 'uiButton': {
          const u = go.addComponent('UIElement');
          u.kind = 'button'; u.text = 'Botão'; u.align = 'center'; u.anchor = 'bottom-center'; u.y = 24;
          break;
        }
        default: break;
      }
      this.select(go);
      this.logger.log(`Criado: ${go.name}`);
      return go;
    });
  }

  duplicateSelected() {
    if (!this.selection.length) { toast('Selecione um objeto.'); return; }
    this.withSceneSnapshot('Duplicar', () => {
      const copies = [];
      for (const go of this.selection) {
        const copy = go.clone();
        this.scene.add(copy, go.parent);
        copy.transform.position.x += 0.5;
        copies.push(copy);
      }
      this.selection = copies;
      this.inspector.setTarget(copies[0]);
    });
  }

  deleteSelected() {
    if (!this.selection.length) { toast('Selecione um objeto.'); return; }
    this.withSceneSnapshot('Excluir', () => {
      for (const go of this.selection) go.destroy();
      this.selection = [];
      this.inspector.setTarget(null);
    });
  }

  async renameSelected() {
    const go = this.selection[0];
    if (!go) { toast('Selecione um objeto.'); return; }
    const n = await promptDialog('Novo nome:', go.name);
    if (n) this.renameObject(go, n);
  }

  renameObject(go, name) {
    const before = go.name;
    go.name = name;
    this.history.push({
      label: 'Renomear',
      undo: () => { go.name = before; this.hierarchy.refresh(true); this.inspector.render(true); },
      redo: () => { go.name = name; this.hierarchy.refresh(true); this.inspector.render(true); },
    });
    this.hierarchy.refresh(true);
    this.inspector.render(true);
    this.onSceneEdited();
  }

  reparent(childId, parentId) {
    const child = this.scene.findById(childId);
    const parent = this.scene.findById(parentId);
    if (!child || !parent) return;
    this.withSceneSnapshot('Reparentar', () => {
      if (!child.setParent(parent)) toast('Não é possível criar um ciclo na hierarquia.');
    });
  }

  addComponent(go, type) {
    this.withSceneSnapshot('Add Component', () => {
      go.addComponent(type);
      this.inspector.render(true);
      this.logger.log(`${type} adicionado em ${go.name}`);
    });
  }

  removeComponent(go, comp) {
    this.withSceneSnapshot('Remover Component', () => {
      go.removeComponent(comp);
      this.inspector.render(true);
    });
  }

  saveAsPrefab(go) {
    const asset = this.project.assets.add({
      name: `${go.name}.fgprefab`, type: 'prefab', path: 'Assets/Prefabs', data: go.serialize(),
    });
    this.project.markDirty();
    this.projectPanel.refresh();
    toast(`Prefab salvo: ${asset.name}`, 'ok');
  }

  instantiatePrefab(assetId) {
    const asset = this.project.assets.get(assetId);
    if (!asset || !asset.data) return;
    this.withSceneSnapshot('Instanciar Prefab', () => {
      const go = GameObject.deserialize(JSON.parse(JSON.stringify(asset.data)), false);
      this.scene.add(go);
      go.transform.position.x = this.sceneView.view.x;
      go.transform.position.y = this.sceneView.view.y;
      this.select(go);
      this.logger.log(`Prefab instanciado: ${go.name}`);
    });
  }

  /* ------------------------------ assets ------------------------------ */

  async createScript(folder = 'Assets/Scripts') {
    const name = await promptDialog('Nome do script:', 'NovoScript.js');
    if (!name) return;
    const fileName = name.endsWith('.js') ? name : name + '.js';
    const asset = this.project.assets.add({
      name: fileName, type: 'script', path: folder,
      content: NEW_SCRIPT_TEMPLATE.replace(/\{NAME\}/g, fileName.replace(/\.js$/, '')),
    });
    this.project.markDirty();
    this.projectPanel.refresh();
    this.openScript(asset.id);

    if (this.selection[0]) {
      const go = this.selection[0];
      const attach = await confirmDialog(`Adicionar este script em "${go.name}"?`, { title: 'Script criado' });
      if (attach) {
        const comp = go.addComponent('Script');
        comp.script = asset.id;
        this.inspector.render(true);
        this.onSceneEdited();
      }
    }
    return asset;
  }

  async createMaterial(folder = 'Assets/Materials') {
    const name = await promptDialog('Nome do material:', 'NovoMaterial');
    if (!name) return;
    const asset = this.project.assets.add({
      name: name.endsWith('.fgmat') ? name : name + '.fgmat',
      type: 'material', path: folder,
      data: { color: '#8f98a8', opacity: 1, roughness: 0.5, emission: 0, texture: null },
    });
    this.project.markDirty();
    this.projectPanel.refresh();
    toast(`Material criado: ${asset.name}`, 'ok');
    return asset;
  }

  openScript(assetId) { this.scriptEditor.open(assetId); }

  locateCode(assetId, fileName, line) {
    let id = assetId;
    if (!id && fileName) {
      const found = this.project.assets.all().find((a) => a.name === fileName || a.name === fileName + '.js');
      id = found && found.id;
    }
    if (!id) { toast('Script não encontrado no projeto.'); return; }
    this.scriptEditor.open(id, line);
  }

  importAsset() {
    const input = document.getElementById('proj-file-input');
    input.value = '';
    input.onchange = async () => {
      for (const file of Array.from(input.files || [])) {
        const asset = await this.project.assets.importFile(file);
        if (asset) this.logger.log(`Asset importado: ${asset.name} (${asset.type})`);
      }
      this.project.markDirty();
      this.projectPanel.refresh();
    };
    input.click();
  }

  /* ------------------------------ cenas e projeto ------------------------------ */

  async newScene() {
    if (this.project.dirty) await this.saveAll(true);
    const name = await promptDialog('Nome da cena:', 'New Scene');
    if (!name) return;
    const { scene, asset } = this.project.createScene(name);
    this.project.activeSceneAssetId = asset.id;
    this.setScene(scene);
    this.projectPanel.refresh();
    this.logger.log(`Cena criada: ${name}`);
  }

  openSceneDialog() {
    const items = this.project.assets.byType('scene').map((a) => ({ label: a.name, sub: a.path, id: a.id }));
    if (!items.length) { toast('Nenhuma cena no projeto.'); return; }
    listDialog({ title: 'Abrir cena', items, onPick: (it) => this.openScene(it.id) });
  }

  openScene(assetId) {
    if (this.engine.isPlaying) this.stop();
    this.project.storeScene(this.scene);              // salva a cena atual antes de trocar
    const asset = this.project.assets.get(assetId);
    if (!asset || !asset.data) { toast('Cena inválida.'); return; }
    this.project.activeSceneAssetId = assetId;
    const scene = Scene.deserialize(asset.data, true);
    this.setScene(scene);
    this.logger.log(`Cena aberta: ${scene.name}`);
  }

  async saveAll(silent = false) {
    try {
      await this.project.save(this.scene === this.engine.editScene ? this.scene : this.engine.editScene);
      this.updateTitle();
      if (!silent) toast('Projeto salvo.', 'ok');
      return true;
    } catch (err) {
      this.logger.error(`Falha ao salvar: ${err.message}`);
      toast('Falha ao salvar.', 'error');
      return false;
    }
  }

  async exportProject(format = 'zip') {
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const safe = this.project.name.replace(/[^\w.-]+/g, '_');
      if (format === 'zip') {
        const blob = await this.project.exportZip(this.engine.editScene);
        downloadBlob(blob, `${safe}_${stamp}.zip`);
      } else {
        const json = await this.project.exportJSON(this.engine.editScene);
        downloadBlob(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }), `${safe}_${stamp}.json`);
      }
      this.logger.log(`Projeto exportado (${format}).`);
    } catch (err) {
      this.logger.error(`Export falhou: ${err.message}`);
    }
  }

  importProject() {
    const input = document.getElementById('proj-file-input');
    input.value = '';
    input.onchange = async () => {
      const file = (input.files || [])[0];
      if (!file) return;
      try {
        const scene = await this.project.importFile(file);
        this.setScene(scene);
        this.projectPanel.refresh();
        await this.saveAll(true);
        this.logger.log(`Projeto importado: ${this.project.name}`);
        toast('Projeto importado.', 'ok');
      } catch (err) {
        this.logger.error(`Import falhou: ${err.message}`);
        toast('Import falhou: ' + err.message, 'error');
      }
    };
    input.click();
  }

  async newProjectDialog() {
    const name = await promptDialog('Nome do novo projeto:', 'Meu Jogo');
    if (!name) return;
    const withDemo = await confirmDialog('Incluir o projeto de demonstração "Mini Adventure"?', { title: 'Novo projeto' });
    if (this.project.dirty) await this.saveAll(true);
    const scene = await this.project.createProject(name, { withDemo });
    this.setScene(scene);
    await this.saveAll(true);
    this.projectPanel.refresh();
    this.logger.log(`Novo projeto: ${name}`);
  }

  async openProjectDialog() {
    const list = await this.storage.listProjects();
    if (!list.length) { toast('Nenhum projeto salvo.'); return; }
    listDialog({
      title: 'Abrir projeto',
      items: list.map((p) => ({ label: p.name, sub: new Date(p.updatedAt).toLocaleString(), id: p.id })),
      onPick: async (it) => {
        if (this.project.dirty) await this.saveAll(true);
        const scene = await this.project.openProject(it.id);
        this.setScene(scene);
        this.projectPanel.refresh();
        this.logger.log(`Projeto aberto: ${this.project.name}`);
      },
    });
  }

  /* ------------------------------ play mode ------------------------------ */

  play() {
    if (this.engine.state === 'playing') return;
    this.audio.ensureContext();
    if (this.engine.state === 'stopped') this.project.storeScene(this.engine.editScene);
    this.engine.play();
    this.showView('game');
    this.gameView.setControlsVisible(device.isMobile || this.gameView.showControls);
  }

  pause() {
    if (this.engine.state === 'playing') this.engine.pause();
    else if (this.engine.state === 'paused') this.engine.play();
  }

  stop() {
    this.engine.stop();
    this.showView('scene');
    this.hierarchy.refresh(true);
    this.inspector.setTarget(this.selection[0] || null);
    this.sceneView.markDirty();
    this.gameView.markDirty();
  }

  /* ------------------------------ performance ------------------------------ */

  applyQuality() {
    const s = this.quality.settings;
    this.engine.targetFps = this.quality.targetFps;
    this.sceneRenderer.setResolutionScale(s.resolutionScale);
    this.gameRenderer.setResolutionScale(s.resolutionScale);
    for (const r of [this.sceneRenderer, this.gameRenderer]) {
      r.quality.shadows = s.shadows;
      r.quality.antiAlias = s.antiAlias;
      r.quality.maxLights = s.shadows === 'off' ? 4 : 8;
    }
    this.perf.setEnabled(s.performanceOverlay);
    this.sceneView.showGizmos = this.sceneView.showGizmos;
    this.sceneView.markDirty();
    this.gameView.markDirty();
  }

  togglePerfOverlay() {
    const v = !this.quality.settings.performanceOverlay;
    this.quality.set('performanceOverlay', v);
    this.perf.setEnabled(v);
    document.getElementById('btn-perf').classList.toggle('on', v);
  }

  async runBenchmark(seconds = 5) {
    toast(`Medindo por ${seconds}s…`);
    const wasPlaying = this.engine.isPlaying;
    if (!wasPlaying) this.play();
    const r = await this.perf.benchmark(seconds);
    if (!wasPlaying) this.stop();
    if (!r) { toast('Sem amostras.'); return null; }
    this.logger.log(`Benchmark: ${r.avgFps.toFixed(1)} FPS médio · 1% low ${r.low1Fps.toFixed(1)} · frame ${r.avgFrameMs.toFixed(2)} ms (${r.frames} frames).`);
    return r;
  }

  openStressTest() { openStressTestDialog(this); }

  async runStressTest(count) {
    return runStressTest(this, { count, seconds: 6 });
  }

  showDeviceInfo() {
    const info = device.summary();
    openModal({
      title: 'Dispositivo',
      body: `<div class="stat-grid">${Object.entries(info)
        .map(([k, v]) => `<div class="k">${k}</div><div>${String(v)}</div>`).join('')}</div>
        <p class="field-hint" style="margin-top:10px">Só mostramos o que a plataforma expõe. Não existe API de temperatura
        no navegador — throttling só pode ser inferido por queda sustentada de desempenho.</p>`,
    });
  }

  openSettings() { openSettings(this); }

  openLearn(topicId) {
    this.showPanel('bottom');
    this.showBottomTab('learn');
    this.learn.render(topicId);
  }

  /* ------------------------------ UI ------------------------------ */

  updateTitle() {
    const el = document.getElementById('project-name');
    el.textContent = `${this.project.name} · ${this.engine.editScene ? this.engine.editScene.name : ''}`;
    el.classList.toggle('dirty', this.project.dirty);
  }

  showView(view) {
    this.activeView = view;
    document.getElementById('scene-view').hidden = view !== 'scene';
    document.getElementById('game-view').hidden = view !== 'game';
    for (const t of document.querySelectorAll('#viewport-tabs .tab')) {
      t.classList.toggle('active', t.dataset.view === view);
    }
    if (view === 'scene') { this.sceneView.resize(); this.sceneView.markDirty(); }
    else { this.gameView.resize(); this.gameView.markDirty(); }
  }

  showPanel(panel) {
    document.body.dataset.panel = panel;
    for (const b of document.querySelectorAll('#mobile-tabs button')) {
      b.classList.toggle('active', b.dataset.panel === panel);
    }
    if (panel === 'viewport') this.resizeAll();
  }

  showBottomTab(tab) {
    for (const t of document.querySelectorAll('#bottom-tabs .tab')) t.classList.toggle('active', t.dataset.tab === tab);
    for (const p of document.querySelectorAll('#panel-bottom .tab-page')) p.classList.toggle('active', p.id === 'tab-' + tab);
    if (tab === 'console') this.logger.render();
    if (tab === 'project') this.projectPanel.refresh();
  }

  resizeAll() {
    this.sceneView.resize();
    this.gameView.resize();
    this.sceneView.markDirty();
    this.gameView.markDirty();
  }

  bindUI() {
    const $ = (id) => document.getElementById(id);

    $('btn-play').onclick = () => this.play();
    $('btn-pause').onclick = () => this.pause();
    $('btn-stop').onclick = () => this.stop();
    $('btn-undo').onclick = () => this.undo();
    $('btn-redo').onclick = () => this.redo();
    $('btn-save').onclick = () => this.saveAll();
    $('btn-search').onclick = () => openGlobalSearch(this);
    $('btn-settings').onclick = () => this.openSettings();
    $('btn-menu').onclick = () => openCommandPalette(this);
    $('btn-perf').onclick = () => this.togglePerfOverlay();
    $('btn-frame').onclick = () => this.sceneView.frameSelection(this.selection);

    $('hier-add').onclick = () => {
      listDialog({
        title: 'Criar GameObject',
        items: [
          { label: 'Empty', kind: 'empty', icon: '◇' },
          { label: 'Sprite', kind: 'sprite', icon: '▣' },
          { label: 'Circle', kind: 'circle', icon: '⬤' },
          { label: 'Cube (Mesh)', kind: 'cube', icon: '⬛' },
          { label: 'Ground', kind: 'ground', icon: '▬' },
          { label: 'Physics Body', kind: 'physics', icon: '⬤' },
          { label: 'Camera', kind: 'camera', icon: '🎥' },
          { label: 'Light', kind: 'light', icon: '☀' },
          { label: 'UI Text', kind: 'uiText', icon: '▤' },
          { label: 'UI Button', kind: 'uiButton', icon: '▤' },
        ],
        onPick: (it) => this.createObject(it.kind),
      });
    };
    $('hier-dup').onclick = () => this.duplicateSelected();
    $('hier-del').onclick = () => this.deleteSelected();
    $('insp-add').onclick = () => this.inspector.openAddComponent();

    $('proj-new-folder').onclick = async () => {
      const n = await promptDialog('Nome da pasta:', 'Nova Pasta');
      if (n) { this.project.assets.createFolder('Assets', n); this.project.markDirty(); this.projectPanel.refresh(); }
    };
    $('proj-new-script').onclick = () => this.createScript();
    $('proj-new-scene').onclick = () => this.newScene();
    $('proj-new-material').onclick = () => this.createMaterial();
    $('proj-import').onclick = () => this.importAsset();

    $('console-clear').onclick = () => this.logger.clear();
    for (const [id, key] of [['f-log', 'log'], ['f-warn', 'warn'], ['f-error', 'error'], ['f-collapse', 'collapse']]) {
      $(id).onchange = (e) => this.logger.setFilter(key, e.target.checked);
    }
    $('console-search').oninput = (e) => this.logger.setFilter('query', e.target.value);

    for (const t of document.querySelectorAll('#viewport-tabs .tab')) {
      t.onclick = () => this.showView(t.dataset.view);
    }
    for (const t of document.querySelectorAll('#bottom-tabs .tab')) {
      t.onclick = () => this.showBottomTab(t.dataset.tab);
    }
    for (const b of document.querySelectorAll('#mobile-tabs button')) {
      b.onclick = () => this.showPanel(b.dataset.panel);
    }
    for (const b of document.querySelectorAll('.drawer-close')) {
      b.onclick = () => this.showPanel('viewport');
    }
    for (const b of document.querySelectorAll('.scene-tools .tool')) {
      b.onclick = () => {
        for (const o of document.querySelectorAll('.scene-tools .tool')) o.classList.toggle('active', o === b);
        this.sceneView.setTool(b.dataset.tool);
      };
    }
    $('zoom-in').onclick = () => this.sceneView.zoom(1.2);
    $('zoom-out').onclick = () => this.sceneView.zoom(1 / 1.2);
    $('zoom-reset').onclick = () => this.sceneView.resetView();

    /* atalhos de teclado (desktop e teclados bluetooth) */
    window.addEventListener('keydown', (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); this.saveAll(); }
      else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); }
      else if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); openCommandPalette(this); }
      else if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); this.engine.isPlaying ? this.stop() : this.play(); }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); this.duplicateSelected(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { this.deleteSelected(); }
      else if (e.key === 'f' || e.key === 'F') { this.sceneView.frameSelection(this.selection); }
      else if (e.key === 'F2') { this.renameSelected(); }
    });

    /* ciclo de frame: só a view visível é desenhada */
    bus.on('engine:frame', () => this.onFrame());
    bus.on('engine:state', (state) => this.onEngineState(state));
    bus.on('history:changed', () => this.updateUndoButtons());
    bus.on('project:dirty', () => this.updateTitle());

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        document.body.dataset.orientation = window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
        this.resizeAll();
      }, 80);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    onResize();

    /* app em segundo plano: pausa o jogo e economiza bateria */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.engine.state === 'playing') { this.engine.pause(); this._autoPaused = true; }
        this.engine.input.clearHeld();
        this.saveAll(true);
      } else if (this._autoPaused) {
        this._autoPaused = false;
        this.engine.play();
      }
    });

    window.addEventListener('beforeunload', () => { if (this.project.dirty) this.saveAll(true); });

    this.updateUndoButtons();
    this.showPanel(window.innerWidth >= 720 ? 'viewport' : 'viewport');
  }

  onEngineState(state) {
    document.getElementById('btn-play').classList.toggle('on', state === 'playing');
    document.getElementById('btn-pause').classList.toggle('on', state === 'paused');
    this.hierarchy.refresh(true);
    this.inspector.render(true);
    this.gameView.markDirty();
  }

  onFrame() {
    if (this.activeView === 'game' || this.engine.isPlaying) this.gameView.render();
    if (this.activeView === 'scene') this.sceneView.render();

    if (this.engine.isPlaying) {
      const now = performance.now();
      if (now - this._inspectorSyncAt > 200) {
        this._inspectorSyncAt = now;
        this.inspector.syncValues();
        if (this.scene && this.scene.version !== this.hierarchy._lastVersion) this.hierarchy.refresh();
      }
    }
  }
}

/* ------------------------------ utilitários ------------------------------ */

function nameFor(kind) {
  return ({
    empty: 'GameObject', sprite: 'Sprite', circle: 'Circle', cube: 'Cube', ground: 'Ground',
    physics: 'Physics Body', camera: 'Camera', light: 'Light', uiText: 'UI Text', uiButton: 'UI Button',
  })[kind] || 'GameObject';
}

function cloneValue(v) {
  return (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
}

function applyTransform(go, data) {
  Object.assign(go.transform.position, data.position);
  Object.assign(go.transform.rotation, data.rotation);
  Object.assign(go.transform.scale, data.scale);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
