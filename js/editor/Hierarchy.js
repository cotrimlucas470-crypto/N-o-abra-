import { escapeHtml } from './ui/Modal.js';

const ROW_H = 32;
const VIRTUAL_THRESHOLD = 120;

/**
 * Painel Hierarchy: árvore pai/filho com criar, excluir, duplicar, renomear,
 * reordenar (arrastar para dentro de outro objeto), pesquisar e selecionar.
 *
 * Performance (regra 21): a árvore só é reconstruída quando a estrutura muda
 * (scene.version) — seleção e ativação alteram apenas classes das linhas visíveis;
 * acima de 120 linhas entra virtualização (só o que cabe na tela vira DOM).
 */
export class Hierarchy {
  constructor({ el, searchEl, app }) {
    this.el = el;
    this.scroller = el.parentElement;
    this.searchEl = searchEl;
    this.app = app;
    this.collapsed = new Set();
    this.flat = [];
    this.query = '';
    this._lastVersion = -1;
    this._rows = new Map();      // goId -> HTMLElement (apenas os renderizados)
    this._virtual = false;
    this._dragId = null;

    this.searchEl.addEventListener('input', () => { this.query = this.searchEl.value.trim().toLowerCase(); this.refresh(true); });
    this.scroller.addEventListener('scroll', () => { if (this._virtual) this._renderWindow(); }, { passive: true });

    this.el.addEventListener('click', (e) => this._onClick(e));
    this.el.addEventListener('dblclick', (e) => {
      const row = e.target.closest('.tree-row');
      if (row) this.startRename(row.dataset.id);
    });
  }

  /* ------------------------------ dados ------------------------------ */

  _buildFlat() {
    const scene = this.app.scene;
    this.flat = [];
    if (!scene) return;
    const q = this.query;

    const matches = (go) => !q || go.name.toLowerCase().includes(q) ||
      go.components.some((c) => c.type.toLowerCase().includes(q)) || (go.tag || '').toLowerCase().includes(q);

    const anyDescendantMatches = (go) => matches(go) || go.children.some(anyDescendantMatches);

    const walk = (go, depth) => {
      if (q && !anyDescendantMatches(go)) return;
      this.flat.push({ go, depth });
      if (!q && this.collapsed.has(go.id)) return;
      for (const c of go.children) walk(c, depth + 1);
    };
    for (const r of scene.roots) walk(r, 0);
  }

  refresh(force = false) {
    const scene = this.app.scene;
    if (!scene) { this.el.innerHTML = '<div class="tree-empty">Nenhuma cena aberta.</div>'; return; }
    if (!force && scene.version === this._lastVersion) return;
    this._lastVersion = scene.version;

    this._buildFlat();
    this._rows.clear();
    this.el.textContent = '';

    if (!this.flat.length) {
      this.el.innerHTML = `<div class="tree-empty">${this.query ? 'Nenhum objeto encontrado.' : 'Cena vazia. Toque em ＋ para criar um GameObject.'}</div>`;
      return;
    }

    this._virtual = this.flat.length > VIRTUAL_THRESHOLD;
    if (this._virtual) {
      this.el.style.position = 'relative';
      this.el.style.height = `${this.flat.length * ROW_H}px`;
      this._renderWindow();
    } else {
      this.el.style.height = '';
      this.el.style.position = '';
      const frag = document.createDocumentFragment();
      for (let i = 0; i < this.flat.length; i++) frag.appendChild(this._makeRow(this.flat[i], i, false));
      this.el.appendChild(frag);
    }
  }

  _renderWindow() {
    const top = this.scroller.scrollTop;
    const h = this.scroller.clientHeight;
    const first = Math.max(0, Math.floor(top / ROW_H) - 4);
    const last = Math.min(this.flat.length, Math.ceil((top + h) / ROW_H) + 4);
    this.el.textContent = '';
    this._rows.clear();
    const frag = document.createDocumentFragment();
    for (let i = first; i < last; i++) frag.appendChild(this._makeRow(this.flat[i], i, true));
    this.el.appendChild(frag);
  }

  _makeRow(item, index, absolute) {
    const { go, depth } = item;
    const row = document.createElement('div');
    row.className = 'tree-row' + (this.app.isSelected(go) ? ' selected' : '') + (go.active ? '' : ' inactive');
    row.dataset.id = go.id;
    row.style.paddingLeft = `${6 + depth * 14}px`;
    if (absolute) {
      row.style.position = 'absolute';
      row.style.top = `${index * ROW_H}px`;
      row.style.left = '0';
      row.style.right = '0';
    }
    row.draggable = true;

    const hasChildren = go.children.length > 0;
    const icon = iconFor(go);
    row.innerHTML =
      `<span class="tree-twisty${hasChildren ? '' : ' leaf'}" data-act="toggle">${this.collapsed.has(go.id) ? '▶' : '▼'}</span>` +
      `<span class="tree-icon">${icon}</span>` +
      `<span class="tree-name">${escapeHtml(go.name)}</span>`;

    row.addEventListener('dragstart', (e) => { this._dragId = go.id; e.dataTransfer.effectAllowed = 'move'; });
    row.addEventListener('dragover', (e) => { e.preventDefault(); row.style.background = 'var(--accent-soft)'; });
    row.addEventListener('dragleave', () => { row.style.background = ''; });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.style.background = '';
      if (this._dragId && this._dragId !== go.id) this.app.reparent(this._dragId, go.id);
      this._dragId = null;
    });

    this._rows.set(go.id, row);
    return row;
  }

  _onClick(e) {
    const row = e.target.closest('.tree-row');
    if (!row) return;
    const id = row.dataset.id;
    if (e.target.dataset.act === 'toggle') {
      if (this.collapsed.has(id)) this.collapsed.delete(id); else this.collapsed.add(id);
      this.refresh(true);
      return;
    }
    this.app.select(id, { additive: e.ctrlKey || e.metaKey });
  }

  /** Atualiza apenas as classes — não reconstrói a árvore. */
  updateSelection() {
    for (const [id, row] of this._rows) {
      row.classList.toggle('selected', this.app.isSelected(this.app.scene && this.app.scene.findById(id)));
    }
  }

  startRename(id) {
    const row = this._rows.get(id);
    const go = this.app.scene.findById(id);
    if (!row || !go) return;
    const nameEl = row.querySelector('.tree-name');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = go.name;
    nameEl.textContent = '';
    nameEl.appendChild(input);
    input.focus();
    input.select();
    const commit = () => {
      const v = input.value.trim();
      if (v && v !== go.name) this.app.renameObject(go, v);
      else this.refresh(true);
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = go.name; input.blur(); }
    });
  }
}

function iconFor(go) {
  if (go.getComponent('Camera')) return '🎥';
  if (go.getComponent('Light')) return '☀';
  if (go.getComponent('UIElement')) return '▤';
  if (go.getComponent('Rigidbody')) return '⬤';
  if (go.getComponent('MeshRenderer')) return '⬛';
  if (go.getComponent('SpriteRenderer')) return '▣';
  if (go.getComponent('AudioSource')) return '♪';
  return '◇';
}
