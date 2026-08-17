import { listDialog } from './ui/Modal.js';
import { LearnPanel } from './Learn.js';

/**
 * Command Palette (regra 25) e Busca Global (regra 24).
 * Uma única fonte de comandos: a mesma lista alimenta a paleta, a busca e o menu.
 */
export function buildCommands(app) {
  const cmd = (label, run, keywords = '', icon = '›') => ({ label, run, keywords, icon });
  return [
    cmd('Create Empty GameObject', () => app.createObject('empty'), 'novo objeto vazio', '◇'),
    cmd('Create Sprite', () => app.createObject('sprite'), 'quadrado forma 2d', '▣'),
    cmd('Create Circle', () => app.createObject('circle'), 'bola', '⬤'),
    cmd('Create Cube (Mesh)', () => app.createObject('cube'), '3d bloco', '⬛'),
    cmd('Create Ground (com Collider)', () => app.createObject('ground'), 'chao piso plataforma', '▬'),
    cmd('Create Physics Body', () => app.createObject('physics'), 'rigidbody queda gravidade', '⬤'),
    cmd('Create Camera', () => app.createObject('camera'), 'câmera', '🎥'),
    cmd('Create Light', () => app.createObject('light'), 'luz iluminação', '☀'),
    cmd('Create UI Text', () => app.createObject('uiText'), 'texto interface hud', '▤'),
    cmd('Create UI Button', () => app.createObject('uiButton'), 'botão interface', '▤'),
    cmd('Add Component…', () => app.inspector.openAddComponent(), 'componente', '＋'),
    cmd('Duplicate', () => app.duplicateSelected(), 'duplicar copiar', '⧉'),
    cmd('Delete', () => app.deleteSelected(), 'excluir apagar', '🗑'),
    cmd('Rename', () => app.renameSelected(), 'renomear', '✎'),
    cmd('Create Script', () => app.createScript(), 'novo script código', '𝄜'),
    cmd('Create Material', () => app.createMaterial(), 'material cor', '◐'),
    cmd('New Scene', () => app.newScene(), 'cena nova', '◲'),
    cmd('Open Scene…', () => app.openSceneDialog(), 'abrir cena', '◲'),
    cmd('Save Scene', () => app.saveAll(), 'salvar cena', '⤓'),
    cmd('Save Project', () => app.saveAll(), 'salvar projeto', '⤓'),
    cmd('Play', () => app.play(), 'executar rodar', '▶'),
    cmd('Pause', () => app.pause(), 'pausar', '❚❚'),
    cmd('Stop', () => app.stop(), 'parar', '■'),
    cmd('Undo', () => app.undo(), 'desfazer', '↶'),
    cmd('Redo', () => app.redo(), 'refazer', '↷'),
    cmd('Frame Selection', () => app.sceneView.frameSelection(app.selection), 'enquadrar zoom', '◎'),
    cmd('Reset View', () => app.sceneView.resetView(), 'resetar câmera editor', '⌂'),
    cmd('Build / Export Project (.zip)', () => app.exportProject('zip'), 'exportar build zip', '⬇'),
    cmd('Export Project (.json)', () => app.exportProject('json'), 'exportar json', '⬇'),
    cmd('Import Project', () => app.importProject(), 'importar abrir arquivo', '⬆'),
    cmd('New Project', () => app.newProjectDialog(), 'novo projeto', '✦'),
    cmd('Open Project…', () => app.openProjectDialog(), 'abrir projeto', '📂'),
    cmd('Import Asset', () => app.importAsset(), 'importar textura audio', '⬆'),
    cmd('Settings', () => app.openSettings(), 'configurações opções', '⚙'),
    cmd('Toggle Performance Overlay', () => app.togglePerfOverlay(), 'fps overlay desempenho', '📈'),
    cmd('Stress Test', () => app.openStressTest(), 'teste carga objetos', '⏱'),
    cmd('Benchmark (5s)', () => app.runBenchmark(), 'medir fps', '⏱'),
    cmd('Device Info', () => app.showDeviceInfo(), 'dispositivo hardware', 'ℹ'),
    cmd('Learn / Help', () => app.openLearn(), 'ajuda documentação aprender', '?'),
  ];
}

export function openCommandPalette(app) {
  listDialog({
    title: 'Command Palette',
    placeholder: 'Digite um comando…',
    items: app.commands,
    onPick: (it) => it.run(),
  });
}

/** Busca global: objetos, componentes, assets, comandos e documentação. */
export function openGlobalSearch(app) {
  const items = [];
  const scene = app.scene;

  if (scene) {
    for (const go of scene.byId.values()) {
      items.push({
        label: go.name,
        sub: 'GameObject',
        icon: '◇',
        keywords: go.components.map((c) => c.type).join(' ') + ' ' + (go.tag || ''),
        run: () => { app.select(go.id); app.showPanel('inspector'); },
      });
    }
  }

  for (const a of app.project.assets.all()) {
    if (a.type === 'folder') continue;
    items.push({
      label: a.name,
      sub: a.type,
      icon: '▪',
      keywords: a.path,
      run: () => app.projectPanel.openAsset(a),
    });
  }

  for (const c of app.commands) {
    items.push({ label: c.label, sub: 'comando', icon: c.icon, keywords: c.keywords, run: c.run });
  }

  for (const d of LearnPanel.search('')) {
    items.push({ label: d.label, sub: 'Learn', icon: '?', run: () => app.openLearn(d.topicId) });
  }

  listDialog({
    title: 'Busca global',
    placeholder: 'Objetos, assets, comandos, ajuda…',
    items,
    onPick: (it) => it.run(),
  });
}
