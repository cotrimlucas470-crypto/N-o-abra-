import { listComponentTypes } from '../core/Component.js';
import { listDialog, promptDialog, escapeHtml } from './ui/Modal.js';

/**
 * Inspector — gerado a partir do `schema` de cada componente.
 * Cada campo escreve direto na propriedade real e registra undo/redo.
 *
 * Performance (regra 20): a árvore de campos só é reconstruída quando muda a seleção
 * ou a lista de componentes; durante o Play, apenas os *valores* são sincronizados,
 * e nunca em um campo que está com o foco do usuário.
 */
export class Inspector {
  constructor({ el, app }) {
    this.el = el;
    this.app = app;
    this.target = null;
    this._signature = '';
    this._bindings = [];     // { el, get, set }
    this.openState = new Map();
  }

  setTarget(go) {
    this.target = go;
    this.render(true);
  }

  signatureOf(go) {
    if (!go) return 'none';
    return go.id + ':' + go.components.map((c) => c.type + (c.enabled ? '1' : '0')).join(',') + ':' + go.name + ':' + go.active;
  }

  render(force = false) {
    const go = this.target;
    const sig = this.signatureOf(go);
    if (!force && sig === this._signature) { this.syncValues(); return; }
    this._signature = sig;
    this._bindings.length = 0;
    this.el.textContent = '';

    if (!go || go._destroyed) {
      this.el.innerHTML = '<div class="insp-empty">Selecione um objeto na Hierarchy para editar.</div>';
      return;
    }

    /* cabeçalho: ativo, nome, tag */
    const head = document.createElement('div');
    head.className = 'insp-header';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = go.active;
    chk.title = 'Ativo';
    chk.onchange = () => this.app.editProperty(go, 'active', chk.checked, (v) => { go.setActive(v); this.app.refreshHierarchy(); });
    const name = document.createElement('input');
    name.type = 'text';
    name.value = go.name;
    name.onchange = () => this.app.renameObject(go, name.value.trim() || go.name);
    head.append(chk, name);
    this.el.appendChild(head);

    const tagField = this._field('Tag', (wrap) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = go.tag || '';
      input.placeholder = 'sem tag';
      input.onchange = () => this.app.editProperty(go, 'tag', input.value.trim(), (v) => { go.tag = v; });
      wrap.appendChild(input);
      this._bindings.push({ el: input, get: () => go.tag || '', set: (v) => { input.value = v; } });
    });
    this.el.appendChild(tagField);

    /* componentes */
    for (const comp of go.components) this.el.appendChild(this._componentBlock(comp));

    /* ações */
    const actions = document.createElement('div');
    actions.className = 'insp-actions';
    actions.append(
      this._btn('＋ Add Component', () => this.openAddComponent()),
      this._btn('⧉ Duplicar', () => this.app.duplicateSelected()),
      this._btn('🗑 Excluir', () => this.app.deleteSelected(), 'danger'),
      this._btn('◆ Salvar como Prefab', () => this.app.saveAsPrefab(go)),
    );
    this.el.appendChild(actions);
  }

  _btn(label, onClick, cls = '') {
    const b = document.createElement('button');
    b.className = 'btn sm ' + cls;
    b.textContent = label;
    b.onclick = onClick;
    return b;
  }

  _field(label, build) {
    const f = document.createElement('div');
    f.className = 'field';
    const l = document.createElement('label');
    l.textContent = label;
    const wrap = document.createElement('div');
    f.append(l, wrap);
    build(wrap);
    return f;
  }

  _componentBlock(comp) {
    const box = document.createElement('div');
    const key = comp.type;
    const open = this.openState.get(key) !== false;
    box.className = 'comp' + (open ? ' open' : '');

    const head = document.createElement('div');
    head.className = 'comp-head';
    head.innerHTML = `<span class="twisty">${open ? '▼' : '▶'}</span>
      <span class="tree-icon">${comp.constructor.icon || '▪'}</span>
      <span class="comp-name">${escapeHtml(comp.constructor.label || comp.type)}</span>`;

    const enable = document.createElement('input');
    enable.type = 'checkbox';
    enable.checked = comp.enabled;
    enable.title = 'Habilitado';
    enable.onclick = (e) => e.stopPropagation();
    enable.onchange = () => this.app.editProperty(comp, 'enabled', enable.checked, (v) => { comp.enabled = v; });
    head.appendChild(enable);

    if (comp.constructor.removable !== false) {
      const rm = document.createElement('button');
      rm.className = 'icon-btn sm';
      rm.textContent = '✕';
      rm.title = 'Remover componente';
      rm.onclick = (e) => { e.stopPropagation(); this.app.removeComponent(this.target, comp); };
      head.appendChild(rm);
    }

    head.onclick = () => {
      const nowOpen = !box.classList.contains('open');
      box.classList.toggle('open', nowOpen);
      head.querySelector('.twisty').textContent = nowOpen ? '▼' : '▶';
      this.openState.set(key, nowOpen);
    };

    const body = document.createElement('div');
    body.className = 'comp-body';
    for (const f of comp.constructor.schema) body.appendChild(this._schemaField(comp, f));

    box.append(head, body);
    return box;
  }

  _schemaField(comp, f) {
    const app = this.app;
    const wrapper = document.createElement('div');
    wrapper.className = 'field' +
      (f.type === 'props' || f.type === 'text' ? ' wide' : '') +
      (f.type === 'vec3' || f.type === 'vec2' ? ' vecfield' : '');
    if (f.type !== 'props') {
      const label = document.createElement('label');
      label.textContent = f.label;
      wrapper.appendChild(label);
    }
    const holder = document.createElement('div');
    wrapper.appendChild(holder);

    const commit = (value) => {
      app.editProperty(comp, f.key, value, (v) => {
        comp[f.key] = v;
        comp.onFieldChanged(f.key, v);
        app.onSceneEdited();
      });
    };

    switch (f.type) {
      case 'vec3':
      case 'vec2': {
        const axes = f.type === 'vec3' ? ['x', 'y', 'z'] : ['x', 'y'];
        const vec = document.createElement('div');
        vec.className = 'vec';
        for (const ax of axes) {
          const cell = document.createElement('div');
          cell.className = 'axis';
          cell.dataset.axis = ax.toUpperCase();
          const input = document.createElement('input');
          input.type = 'number';
          input.step = f.step || 0.1;
          input.value = round(comp[f.key][ax]);
          input.inputMode = 'decimal';
          input.oninput = () => {
            const v = parseFloat(input.value);
            if (Number.isNaN(v)) return;
            const before = { ...comp[f.key] };
            const after = { ...before, [ax]: v };
            app.editProperty(comp, f.key + '.' + ax, after, (val) => {
              Object.assign(comp[f.key], val);
              comp.onFieldChanged(f.key, comp[f.key]);
              app.onSceneEdited();
            }, before);
          };
          cell.appendChild(input);
          vec.appendChild(cell);
          this._bindings.push({ el: input, get: () => round(comp[f.key][ax]), set: (v) => { input.value = v; } });
        }
        holder.appendChild(vec);
        break;
      }
      case 'number': {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = f.step || 1;
        if (f.min != null) input.min = f.min;
        input.inputMode = 'decimal';
        input.value = round(comp[f.key]);
        input.oninput = () => { const v = parseFloat(input.value); if (!Number.isNaN(v)) commit(v); };
        holder.appendChild(input);
        this._bindings.push({ el: input, get: () => round(comp[f.key]), set: (v) => { input.value = v; } });
        break;
      }
      case 'range': {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px';
        const input = document.createElement('input');
        input.type = 'range';
        input.min = f.min ?? 0; input.max = f.max ?? 1; input.step = f.step ?? 0.01;
        input.value = comp[f.key];
        const out = document.createElement('span');
        out.style.cssText = 'font-size:11px;color:var(--fg-2);min-width:32px;text-align:right';
        out.textContent = round(comp[f.key]);
        input.oninput = () => { out.textContent = round(parseFloat(input.value)); commit(parseFloat(input.value)); };
        row.append(input, out);
        holder.appendChild(row);
        this._bindings.push({ el: input, get: () => comp[f.key], set: (v) => { input.value = v; out.textContent = round(v); } });
        break;
      }
      case 'bool': {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!comp[f.key];
        input.onchange = () => commit(input.checked);
        holder.appendChild(input);
        this._bindings.push({ el: input, get: () => !!comp[f.key], set: (v) => { input.checked = v; } });
        break;
      }
      case 'color': {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px';
        const input = document.createElement('input');
        input.type = 'color';
        input.value = normalizeHex(comp[f.key]);
        input.style.flex = '0 0 44px';
        const text = document.createElement('input');
        text.type = 'text';
        text.value = comp[f.key];
        input.oninput = () => { text.value = input.value; commit(input.value); };
        text.onchange = () => { input.value = normalizeHex(text.value); commit(text.value); };
        row.append(input, text);
        holder.appendChild(row);
        this._bindings.push({ el: input, get: () => normalizeHex(comp[f.key]), set: (v) => { input.value = v; text.value = comp[f.key]; } });
        break;
      }
      case 'select': {
        const sel = document.createElement('select');
        for (const o of f.options) {
          const opt = document.createElement('option');
          opt.value = o; opt.textContent = o;
          sel.appendChild(opt);
        }
        sel.value = comp[f.key];
        sel.onchange = () => commit(sel.value);
        holder.appendChild(sel);
        this._bindings.push({ el: sel, get: () => comp[f.key], set: (v) => { sel.value = v; } });
        break;
      }
      case 'text': {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = comp[f.key] ?? '';
        input.oninput = () => commit(input.value);
        holder.appendChild(input);
        this._bindings.push({ el: input, get: () => comp[f.key] ?? '', set: (v) => { input.value = v; } });
        break;
      }
      case 'asset': {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:4px';
        const btn = document.createElement('button');
        btn.className = 'btn sm';
        btn.style.flex = '1';
        const asset = comp[f.key] ? this.app.project.assets.get(comp[f.key]) : null;
        btn.textContent = asset ? asset.name : '(nenhum)';
        btn.onclick = () => {
          const items = this.app.project.assets.byType(f.assetType).map((a) => ({ label: a.name, sub: a.path, id: a.id }));
          items.unshift({ label: '(nenhum)', id: null });
          listDialog({
            title: `Escolher ${f.assetType}`,
            items,
            onPick: (it) => { commit(it.id); btn.textContent = it.id ? it.label : '(nenhum)'; },
          });
        };
        row.appendChild(btn);
        if (f.assetType === 'script' && comp[f.key]) {
          const edit = document.createElement('button');
          edit.className = 'btn sm';
          edit.textContent = '✎';
          edit.title = 'Abrir no editor de código';
          edit.onclick = () => this.app.openScript(comp[f.key]);
          row.appendChild(edit);
        }
        holder.appendChild(row);
        break;
      }
      case 'props': {
        const box = document.createElement('div');
        box.style.cssText = 'border:1px solid var(--line);border-radius:6px;padding:6px';
        const title = document.createElement('div');
        title.style.cssText = 'font-size:11px;color:var(--fg-2);margin-bottom:6px';
        title.textContent = 'Props (acessível como props.nome no script)';
        box.appendChild(title);
        const render = () => {
          box.querySelectorAll('.prop-row').forEach((n) => n.remove());
          for (const [k, v] of Object.entries(comp.props || {})) {
            const row = document.createElement('div');
            row.className = 'prop-row';
            row.style.cssText = 'display:flex;gap:4px;margin-bottom:4px';
            const kEl = document.createElement('input');
            kEl.type = 'text'; kEl.value = k; kEl.style.flex = '0 0 40%';
            const vEl = document.createElement('input');
            vEl.type = 'text'; vEl.value = String(v);
            const del = document.createElement('button');
            del.className = 'icon-btn sm'; del.textContent = '✕';
            kEl.onchange = () => {
              const props = { ...comp.props };
              const val = props[k]; delete props[k];
              props[kEl.value] = val;
              commit(props); render();
            };
            vEl.onchange = () => {
              const props = { ...comp.props };
              props[k] = coerce(vEl.value);
              commit(props);
            };
            del.onclick = () => { const props = { ...comp.props }; delete props[k]; commit(props); render(); };
            row.append(kEl, vEl, del);
            box.appendChild(row);
          }
        };
        render();
        const add = document.createElement('button');
        add.className = 'btn sm';
        add.textContent = '＋ prop';
        add.onclick = async () => {
          const key = await promptDialog('Nome da prop:', 'speed');
          if (!key) return;
          const props = { ...comp.props, [key]: 1 };
          commit(props); render(); box.appendChild(add);
        };
        box.appendChild(add);
        holder.appendChild(box);
        break;
      }
      default: {
        holder.textContent = String(comp[f.key]);
      }
    }

    if (f.hint) {
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.textContent = f.hint;
      wrapper.appendChild(hint);
    }
    return wrapper;
  }

  /** Sincroniza valores sem reconstruir o DOM (usado durante o Play). */
  syncValues() {
    const active = document.activeElement;
    for (const b of this._bindings) {
      if (b.el === active) continue;
      try {
        const v = b.get();
        if (b.el.type === 'checkbox') { if (b.el.checked !== v) b.set(v); }
        else if (String(b.el.value) !== String(v)) b.set(v);
      } catch { /* alvo removido */ }
    }
  }

  openAddComponent() {
    const go = this.target;
    if (!go) return;
    const items = listComponentTypes()
      .filter((C) => C.type !== 'Transform' && !(C.unique && go.getComponent(C.type)))
      .map((C) => ({ label: C.label, sub: C.type, icon: C.icon, type: C.type }));
    listDialog({
      title: 'Add Component',
      items,
      placeholder: 'Buscar componente…',
      onPick: (it) => this.app.addComponent(go, it.type),
    });
  }
}

function round(v) {
  if (typeof v !== 'number') return v;
  return Math.abs(v) < 1e-4 ? 0 : Math.round(v * 1000) / 1000;
}

function normalizeHex(c) {
  if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) return c;
  if (typeof c === 'string' && /^#[0-9a-f]{3}$/i.test(c)) {
    return '#' + c.slice(1).split('').map((x) => x + x).join('');
  }
  return '#ffffff';
}

function coerce(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = parseFloat(v);
  return Number.isNaN(n) || String(n) !== v.trim() ? v : n;
}
