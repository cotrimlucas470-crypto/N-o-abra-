import { escapeHtml, listDialog, promptDialog, confirmDialog, toast, openModal } from './ui/Modal.js';

const ICONS = {
  folder: '📁', script: '𝄜', scene: '◲', material: '◐', texture: '🖼',
  audio: '♪', prefab: '◆', json: '{}', model: '⬡',
};

/**
 * Painel Project — árvore de Assets com criar, renomear, excluir, importar e abrir.
 * A árvore é reconstruída apenas quando os assets mudam (callback onChange).
 */
export class ProjectPanel {
  constructor({ el, app }) {
    this.el = el;
    this.app = app;
    this.expanded = new Set(['Assets']);
    this.selectedId = null;
    app.project.assets.onChange = () => this.refresh();
  }

  refresh() {
    const assets = this.app.project.assets;
    this.el.textContent = '';
    const rootFolders = assets.folders().filter((f) => f.path === '');
    if (!rootFolders.length) {
      this.el.innerHTML = '<div class="tree-empty">Sem assets.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const f of rootFolders) this._renderFolder(f, 0, frag);
    this.el.appendChild(frag);
  }

  _fullPath(folder) { return folder.path ? folder.path + '/' + folder.name : folder.name; }

  _renderFolder(folder, depth, parent) {
    const assets = this.app.project.assets;
    const full = this._fullPath(folder);
    const open = this.expanded.has(full);

    const row = this._row({
      icon: open ? '📂' : '📁',
      name: folder.name,
      meta: '',
      depth,
      id: folder.id,
      onClick: () => { open ? this.expanded.delete(full) : this.expanded.add(full); this.refresh(); },
      onMenu: () => this._folderMenu(folder, full),
    });
    parent.appendChild(row);
    if (!open) return;

    for (const sub of assets.subfolders(full)) this._renderFolder(sub, depth + 1, parent);
    for (const a of assets.children(full)) {
      parent.appendChild(this._row({
        icon: ICONS[a.type] || '▪',
        name: a.name,
        meta: a.type,
        depth: depth + 1,
        id: a.id,
        thumb: a.type === 'texture' ? a : null,
        onClick: () => this.openAsset(a),
        onMenu: () => this._assetMenu(a),
      }));
    }
  }

  _row({ icon, name, meta, depth, id, onClick, onMenu, thumb }) {
    const row = document.createElement('div');
    row.className = 'asset-row' + (this.selectedId === id ? ' selected' : '');
    row.style.paddingLeft = `${6 + depth * 14}px`;
    row.innerHTML =
      `<span class="tree-icon">${icon}</span>` +
      `<span class="a-name">${escapeHtml(name)}</span>` +
      (meta ? `<span class="a-meta">${escapeHtml(meta)}</span>` : '') +
      `<button class="icon-btn sm" data-act="menu" title="Ações">⋯</button>`;
    row.onclick = (e) => {
      if (e.target.dataset.act === 'menu') { onMenu(); return; }
      this.selectedId = id;
      onClick();
      this.refresh();
    };
    if (thumb && thumb.blob) {
      const img = document.createElement('img');
      img.className = 'asset-thumb';
      img.src = URL.createObjectURL(thumb.blob);
      img.onload = () => URL.revokeObjectURL(img.src);
      row.replaceChild(img, row.firstChild);
    }
    return row;
  }

  /* ------------------------------ abrir ------------------------------ */

  openAsset(a) {
    switch (a.type) {
      case 'script':
      case 'json':
        this.app.openScript(a.id);
        break;
      case 'scene':
        this.app.openScene(a.id);
        break;
      case 'material':
        this._editMaterial(a);
        break;
      case 'prefab':
        this.app.instantiatePrefab(a.id);
        break;
      case 'texture':
        this._previewTexture(a);
        break;
      case 'audio':
        this.app.audio.play(a.id, { volume: 0.9 });
        toast(`▶ ${a.name}`);
        break;
      default:
        toast(`${a.name}: sem visualizador para "${a.type}".`);
    }
  }

  _previewTexture(a) {
    const img = document.createElement('img');
    img.style.cssText = 'max-width:100%;border-radius:8px;background:#000';
    img.src = URL.createObjectURL(a.blob);
    openModal({ title: a.name, body: img, onClose: () => URL.revokeObjectURL(img.src) });
  }

  _editMaterial(a) {
    const data = a.data || {};
    const wrap = document.createElement('div');
    const mk = (label, input) => {
      const f = document.createElement('div');
      f.className = 'field';
      const l = document.createElement('label');
      l.textContent = label;
      const holder = document.createElement('div');
      holder.appendChild(input);
      f.append(l, holder);
      wrap.appendChild(f);
      return input;
    };
    const color = mk('Color', Object.assign(document.createElement('input'), { type: 'color', value: data.color || '#888888' }));
    const opacity = mk('Opacity', Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 1, step: 0.01, value: data.opacity ?? 1 }));
    const rough = mk('Roughness', Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 1, step: 0.01, value: data.roughness ?? 0.5 }));
    const emission = mk('Emission', Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 1, step: 0.01, value: data.emission ?? 0 }));
    const texBtn = document.createElement('button');
    texBtn.className = 'btn sm';
    const texAsset = data.texture ? this.app.project.assets.get(data.texture) : null;
    texBtn.textContent = texAsset ? texAsset.name : '(sem textura)';
    let textureId = data.texture || null;
    texBtn.onclick = () => {
      const items = this.app.project.assets.byType('texture').map((t) => ({ label: t.name, id: t.id }));
      items.unshift({ label: '(sem textura)', id: null });
      listDialog({ title: 'Textura', items, onPick: (it) => { textureId = it.id; texBtn.textContent = it.label; } });
    };
    mk('Texture', texBtn);

    openModal({
      title: a.name,
      body: wrap,
      actions: [{
        label: 'Salvar', primary: true,
        onClick: () => {
          this.app.project.assets.update(a.id, {
            data: {
              color: color.value,
              opacity: parseFloat(opacity.value),
              roughness: parseFloat(rough.value),
              emission: parseFloat(emission.value),
              texture: textureId,
            },
          });
          this.app.project.markDirty();
          this.app.sceneView.markDirty();
          this.app.gameView.markDirty();
          toast('Material salvo.', 'ok');
        },
      }],
    });
  }

  /* ------------------------------ menus ------------------------------ */

  _folderMenu(folder, full) {
    listDialog({
      title: folder.name,
      items: [
        { label: 'Nova pasta', act: 'folder' },
        { label: 'Novo script', act: 'script' },
        { label: 'Novo material', act: 'material' },
        { label: 'Nova cena', act: 'scene' },
        { label: 'Renomear', act: 'rename' },
        { label: 'Excluir pasta', act: 'delete' },
      ],
      placeholder: 'Ação…',
      onPick: async (it) => {
        const assets = this.app.project.assets;
        if (it.act === 'folder') {
          const n = await promptDialog('Nome da pasta:', 'Nova Pasta');
          if (n) { assets.createFolder(full, n); this.expanded.add(full); this.app.project.markDirty(); }
        } else if (it.act === 'script') {
          this.app.createScript(full);
        } else if (it.act === 'material') {
          this.app.createMaterial(full);
        } else if (it.act === 'scene') {
          this.app.newScene();
        } else if (it.act === 'rename') {
          const n = await promptDialog('Novo nome:', folder.name);
          if (n) { assets.rename(folder.id, n); this.app.project.markDirty(); }
        } else if (it.act === 'delete') {
          if (folder.path === '') { toast('A pasta raiz não pode ser excluída.'); return; }
          if (await confirmDialog(`Excluir "${folder.name}" e todo o conteúdo?`, { danger: true })) {
            assets.remove(folder.id);
            this.app.project.markDirty();
          }
        }
        this.refresh();
      },
    });
  }

  _assetMenu(a) {
    const items = [
      { label: 'Abrir', act: 'open' },
      { label: 'Renomear', act: 'rename' },
      { label: 'Duplicar', act: 'duplicate' },
      { label: 'Excluir', act: 'delete' },
    ];
    if (a.type === 'scene') items.splice(1, 0, { label: 'Abrir cena', act: 'open' });
    if (a.type === 'prefab') items.splice(1, 0, { label: 'Instanciar na cena', act: 'instantiate' });

    listDialog({
      title: a.name,
      items,
      placeholder: 'Ação…',
      onPick: async (it) => {
        const assets = this.app.project.assets;
        if (it.act === 'open') this.openAsset(a);
        else if (it.act === 'instantiate') this.app.instantiatePrefab(a.id);
        else if (it.act === 'rename') {
          const n = await promptDialog('Novo nome:', a.name);
          if (n) { assets.rename(a.id, n); this.app.project.markDirty(); }
        } else if (it.act === 'duplicate') {
          const copy = { ...a, id: undefined, name: a.name.replace(/(\.\w+)?$/, (m) => ' copy' + (m || '')) };
          assets.add(copy);
          this.app.project.markDirty();
        } else if (it.act === 'delete') {
          if (a.id === this.app.project.activeSceneAssetId) { toast('Não é possível excluir a cena aberta.'); return; }
          if (await confirmDialog(`Excluir "${a.name}"?`, { danger: true })) {
            assets.remove(a.id);
            this.app.project.markDirty();
          }
        }
        this.refresh();
      },
    });
  }
}
