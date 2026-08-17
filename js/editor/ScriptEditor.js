import { escapeHtml } from './ui/Modal.js';

/**
 * Script Editor mobile.
 *
 * Estrutura: <textarea> transparente sobre um <pre> colorido (técnica clássica de
 * overlay) + gutter em um único nó de texto. Isso evita criar um elemento por linha:
 * um arquivo de 10.000 linhas continua sendo 3 nós de DOM, não 10.000.
 *
 * Acima de LARGE_FILE_LINES o realce é desligado automaticamente (o custo do regex
 * passa a doer no celular) — o editor avisa na barra de status em vez de travar.
 */

const LARGE_FILE_LINES = 3000;
const LINE_H = 19;

const KEYWORDS = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'break',
  'continue', 'new', 'this', 'typeof', 'instanceof', 'null', 'undefined', 'true', 'false', 'switch', 'case',
  'default', 'try', 'catch', 'finally', 'throw', 'class', 'extends', 'of', 'in', 'delete', 'void'];

const API_WORDS = ['start', 'update', 'fixedUpdate', 'lateUpdate', 'onDestroy', 'onCollisionEnter', 'onCollisionExit',
  'onTriggerEnter', 'onTriggerExit', 'onClick', 'transform', 'gameObject', 'props', 'Time', 'Input', 'Debug',
  'Screen', 'Physics', 'Mathf', 'Vec2', 'Random', 'Color', 'GetComponent', 'AddComponent', 'Instantiate',
  'Destroy', 'Find', 'FindWithTag', 'FindAll'];

const COMPLETIONS = [
  'transform.position', 'transform.rotation', 'transform.scale', 'transform.translate(',
  'gameObject.name', 'gameObject.tag', 'gameObject.getComponent(', 'gameObject.setActive(',
  'GetComponent(\'Rigidbody\')', 'GetComponent(\'SpriteRenderer\')', 'GetComponent(\'UIElement\')',
  'Instantiate(', 'Destroy(', 'Find(', 'FindWithTag(',
  'Time.deltaTime', 'Time.time', 'Time.fixedDeltaTime',
  'Input.getAxis(\'Horizontal\')', 'Input.getAxis(\'Vertical\')', 'Input.getKey(', 'Input.getKeyDown(',
  'Input.getButton(\'Jump\')', 'Input.jumpDown', 'Input.pointer',
  'Debug.Log(', 'Debug.LogWarning(', 'Debug.LogError(',
  'Mathf.lerp(', 'Mathf.clamp(', 'Mathf.sin(', 'Mathf.abs(',
  'Random.range(', 'Random.value()',
  'rb.addForce(', 'rb.addImpulse(', 'rb.setVelocity(', 'rb.velocity.x', 'rb.grounded',
  ...API_WORDS,
];

const CHAR_BAR = ['(', ')', '{', '}', '[', ']', ';', '=', '=>', '.', ',', '\'', '"', '+', '-', '*', '/', '<', '>', '!', '&&', '||', 'Tab'];

export class ScriptEditor {
  constructor(app) {
    this.app = app;
    this.el = null;
    this.asset = null;
    this.dirty = false;
    this.errorLine = null;
    this._highlightTimer = 0;
    this._undo = [];
    this._redo = [];
    this._lastSnapshot = '';
  }

  get isOpen() { return !!this.el; }

  open(assetId, line = null) {
    const asset = this.app.project.assets.get(assetId);
    if (!asset || (asset.type !== 'script' && asset.type !== 'json')) {
      this.app.logger.warn('Este asset não é um script.');
      return;
    }
    if (this.el) this.close();
    this.asset = asset;
    this.dirty = false;
    this._undo = [];
    this._redo = [];
    this._build();
    this.textarea.value = asset.content || '';
    this._lastSnapshot = this.textarea.value;
    this._refresh();
    if (line) this.goToLine(line);
    setTimeout(() => this.textarea.focus({ preventScroll: true }), 50);
  }

  close() {
    if (!this.el) return;
    if (this.dirty) this.save();
    window.removeEventListener('resize', this._onResize);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', this._onResize);
    this.el.remove();
    this.el = null;
    this.asset = null;
  }

  /* ------------------------------ DOM ------------------------------ */

  _build() {
    const root = document.createElement('div');
    root.id = 'code-editor';
    root.innerHTML = `
      <div class="ce-head">
        <button class="icon-btn" data-act="close" title="Fechar">✕</button>
        <div class="ce-title"></div>
        <button class="icon-btn" data-act="find" title="Buscar/Substituir">⌕</button>
        <button class="icon-btn" data-act="undo" title="Undo">↶</button>
        <button class="icon-btn" data-act="redo" title="Redo">↷</button>
        <button class="icon-btn" data-act="save" title="Salvar (Ctrl+S)">⤓</button>
      </div>
      <div class="ce-find">
        <input type="search" data-role="find" placeholder="buscar">
        <input type="text" data-role="replace" placeholder="substituir">
        <button class="btn sm" data-act="find-next">▼</button>
        <button class="btn sm" data-act="replace-all">Trocar tudo</button>
      </div>
      <div class="ce-wrap">
        <div class="ce-scroll">
          <pre class="ce-gutter"></pre>
          <div class="ce-code">
            <pre class="ce-highlight" aria-hidden="true"></pre>
            <textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"></textarea>
          </div>
        </div>
      </div>
      <div class="ce-status"></div>
      <div class="ce-bar"></div>`;
    document.body.appendChild(root);

    this.el = root;
    this.wrap = root.querySelector('.ce-wrap');
    this.gutter = root.querySelector('.ce-gutter');
    this.highlight = root.querySelector('.ce-highlight');
    this.textarea = root.querySelector('textarea');
    this.status = root.querySelector('.ce-status');
    this.findBar = root.querySelector('.ce-find');
    this.title = root.querySelector('.ce-title');
    this.title.textContent = this.asset.name;

    const bar = root.querySelector('.ce-bar');
    for (const ch of CHAR_BAR) {
      const b = document.createElement('button');
      b.textContent = ch;
      b.onmousedown = (e) => e.preventDefault();
      b.onclick = () => this._insert(ch === 'Tab' ? '  ' : ch);
      bar.appendChild(b);
    }

    root.addEventListener('click', (e) => {
      const act = e.target.dataset && e.target.dataset.act;
      if (!act) return;
      if (act === 'close') this.close();
      if (act === 'save') this.save();
      if (act === 'undo') this.undo();
      if (act === 'redo') this.redo();
      if (act === 'find') this.findBar.classList.toggle('on');
      if (act === 'find-next') this.findNext();
      if (act === 'replace-all') this.replaceAll();
    });

    this.textarea.addEventListener('input', () => this._onInput());
    this.textarea.addEventListener('keydown', (e) => this._onKeyDown(e));
    this.textarea.addEventListener('scroll', () => this._syncScroll());
    this.textarea.addEventListener('click', () => { this._updateStatus(); this._closeAutocomplete(); });
    this.textarea.addEventListener('keyup', () => this._updateStatus());
    this.wrap.addEventListener('scroll', () => this._syncScroll(), { passive: true });

    /* teclado virtual: mantém a linha do cursor visível */
    this._onResize = () => this._ensureCaretVisible();
    window.addEventListener('resize', this._onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this._onResize);
  }

  /* ------------------------------ edição ------------------------------ */

  _onInput() {
    this.dirty = true;
    this.title.classList.add('dirty');
    this._pushUndo();
    clearTimeout(this._highlightTimer);
    this._highlightTimer = setTimeout(() => this._refresh(), 90);
    this._autocomplete();
  }

  _pushUndo() {
    const v = this.textarea.value;
    const last = this._undo[this._undo.length - 1];
    if (last && Math.abs(last.length - v.length) < 12 && Date.now() - this._lastUndoAt < 700) {
      this._undo[this._undo.length - 1] = v;
    } else {
      this._undo.push(v);
      if (this._undo.length > 120) this._undo.shift();
    }
    this._lastUndoAt = Date.now();
    this._redo.length = 0;
  }

  undo() {
    if (this._undo.length < 2) return;
    this._redo.push(this._undo.pop());
    this.textarea.value = this._undo[this._undo.length - 1];
    this._refresh();
  }

  redo() {
    const v = this._redo.pop();
    if (v === undefined) return;
    this._undo.push(v);
    this.textarea.value = v;
    this._refresh();
  }

  _onKeyDown(e) {
    const ta = this.textarea;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); this.save(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); this.findBar.classList.add('on'); this.findBar.querySelector('[data-role=find]').focus(); return; }
    if (e.key === 'Escape') { if (this._ac) { this._closeAutocomplete(); e.preventDefault(); } return; }

    if (this._ac && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Tab')) {
      e.preventDefault();
      if (e.key === 'ArrowDown') this._acMove(1);
      else if (e.key === 'ArrowUp') this._acMove(-1);
      else this._acAccept();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      this._insert('  ');
      return;
    }

    if (e.key === 'Enter') {
      const start = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
      const line = ta.value.slice(lineStart, start);
      const indent = (line.match(/^\s*/) || [''])[0];
      const extra = /[{([]\s*$/.test(line) ? '  ' : '';
      e.preventDefault();
      this._insert('\n' + indent + extra);
      return;
    }

    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
    if (pairs[e.key] && ta.selectionStart === ta.selectionEnd) {
      e.preventDefault();
      const pos = ta.selectionStart;
      this._insert(e.key + pairs[e.key]);
      ta.selectionStart = ta.selectionEnd = pos + 1;
    }
  }

  _insert(text) {
    const ta = this.textarea;
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.setRangeText(text, s, e, 'end');
    this._onInput();
    this._ensureCaretVisible();
  }

  /* ------------------------------ render ------------------------------ */

  _refresh() {
    const value = this.textarea.value;
    const lines = value.split('\n');
    const count = lines.length;

    /* gutter em um único nó de texto */
    let g = '';
    for (let i = 1; i <= count; i++) g += i + '\n';
    this.gutter.textContent = g;

    const big = count > LARGE_FILE_LINES;
    if (big) {
      this.highlight.textContent = value + '\n';
    } else {
      this.highlight.innerHTML = highlightJS(value) + '\n';
    }

    const h = Math.max(count * LINE_H + 16, this.wrap.clientHeight);
    this.textarea.style.height = h + 'px';
    this.highlight.style.height = h + 'px';
    this.textarea.style.width = Math.max(600, maxLineLen(lines) * 7.3) + 'px';

    this._updateStatus(big ? `arquivo grande (${count} linhas): realce desativado para manter a digitação fluida` : null);
  }

  _syncScroll() {
    this.highlight.style.transform = `translateX(${-this.textarea.scrollLeft}px)`;
  }

  _updateStatus(note) {
    const ta = this.textarea;
    const pos = ta.selectionStart;
    const before = ta.value.slice(0, pos);
    const line = before.split('\n').length;
    const col = pos - before.lastIndexOf('\n');
    const err = this.errorLine ? ` <span class="err">• erro na linha ${this.errorLine}</span>` : '';
    this.status.innerHTML = `Ln ${line}, Col ${col} · ${this.asset ? this.asset.name : ''}${note ? ' · ' + escapeHtml(note) : ''}${err}`;
  }

  _ensureCaretVisible() {
    const ta = this.textarea;
    const before = ta.value.slice(0, ta.selectionStart);
    const line = before.split('\n').length;
    const y = (line - 1) * LINE_H;
    const view = this.wrap;
    const visibleH = view.clientHeight;
    if (y < view.scrollTop + 20) view.scrollTop = Math.max(0, y - 40);
    else if (y > view.scrollTop + visibleH - 60) view.scrollTop = y - visibleH + 80;
  }

  goToLine(line) {
    const ta = this.textarea;
    const lines = ta.value.split('\n');
    let pos = 0;
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) pos += lines[i].length + 1;
    ta.selectionStart = ta.selectionEnd = pos;
    this.errorLine = line;
    this._ensureCaretVisible();
    this._updateStatus();
  }

  /* ------------------------------ busca ------------------------------ */

  findNext() {
    const q = this.findBar.querySelector('[data-role=find]').value;
    if (!q) return;
    const ta = this.textarea;
    const from = ta.selectionEnd;
    let idx = ta.value.indexOf(q, from);
    if (idx < 0) idx = ta.value.indexOf(q, 0);
    if (idx < 0) { this.app.logger.warn(`"${q}" não encontrado.`); return; }
    ta.focus();
    ta.setSelectionRange(idx, idx + q.length);
    this._ensureCaretVisible();
    this._updateStatus();
  }

  replaceAll() {
    const q = this.findBar.querySelector('[data-role=find]').value;
    const r = this.findBar.querySelector('[data-role=replace]').value;
    if (!q) return;
    const n = this.textarea.value.split(q).length - 1;
    this.textarea.value = this.textarea.value.split(q).join(r);
    this._onInput();
    this._refresh();
    this.app.logger.log(`${n} ocorrência(s) substituída(s).`);
  }

  /* ------------------------------ autocomplete ------------------------------ */

  _currentWord() {
    const ta = this.textarea;
    const pos = ta.selectionStart;
    const before = ta.value.slice(0, pos);
    const m = /[\w.$']+$/.exec(before);
    return m ? m[0] : '';
  }

  _autocomplete() {
    const word = this._currentWord();
    if (word.length < 2) { this._closeAutocomplete(); return; }
    const matches = COMPLETIONS.filter((c) => c.toLowerCase().startsWith(word.toLowerCase()) && c !== word).slice(0, 8);
    if (!matches.length) { this._closeAutocomplete(); return; }

    if (!this._ac) {
      this._ac = document.createElement('div');
      this._ac.className = 'ac-pop';
      this.el.appendChild(this._ac);
      this._acIndex = 0;
    }
    this._acItems = matches;
    this._acIndex = Math.min(this._acIndex, matches.length - 1);
    this._ac.textContent = '';
    matches.forEach((m, i) => {
      const d = document.createElement('div');
      d.textContent = m;
      if (i === this._acIndex) d.className = 'hl';
      d.onmousedown = (e) => { e.preventDefault(); this._acIndex = i; this._acAccept(); };
      this._ac.appendChild(d);
    });

    const ta = this.textarea;
    const before = ta.value.slice(0, ta.selectionStart);
    const line = before.split('\n').length;
    const col = ta.selectionStart - before.lastIndexOf('\n');
    const rect = this.wrap.getBoundingClientRect();
    const top = rect.top + (line * LINE_H) - this.wrap.scrollTop + 12;
    const left = Math.min(rect.left + 44 + col * 7.3, window.innerWidth - 180);
    this._ac.style.top = `${Math.min(top, window.innerHeight - 200)}px`;
    this._ac.style.left = `${Math.max(8, left)}px`;
  }

  _acMove(delta) {
    if (!this._ac) return;
    this._acIndex = (this._acIndex + delta + this._acItems.length) % this._acItems.length;
    Array.from(this._ac.children).forEach((c, i) => c.className = i === this._acIndex ? 'hl' : '');
  }

  _acAccept() {
    if (!this._ac) return;
    const pick = this._acItems[this._acIndex];
    const word = this._currentWord();
    const ta = this.textarea;
    const start = ta.selectionStart - word.length;
    ta.setRangeText(pick, start, ta.selectionStart, 'end');
    this._closeAutocomplete();
    this._onInput();
  }

  _closeAutocomplete() {
    if (this._ac) { this._ac.remove(); this._ac = null; }
  }

  /* ------------------------------ salvar ------------------------------ */

  save() {
    if (!this.asset) return;
    const content = this.textarea.value;
    this.app.project.assets.update(this.asset.id, { content });
    this.app.scriptEngine.invalidate(this.asset.id);
    this.app.project.markDirty();
    this.dirty = false;
    this.title.classList.remove('dirty');

    /* checagem de sintaxe imediata: erro aparece no console com a linha certa */
    const result = this.app.scriptEngine.compile(this.asset);
    if (result.error) {
      this.errorLine = result.error.line;
      this.app.logger.error(`${result.error.name}: ${result.error.message}`, {
        file: this.asset.name, line: result.error.line, assetId: this.asset.id,
      });
    } else {
      this.errorLine = null;
      this.app.logger.log(`✓ ${this.asset.name} salvo e compilado.`);
    }
    this._updateStatus();
  }
}

/* ------------------------------ realce ------------------------------ */

const TOKEN_RE = new RegExp([
  '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)',                    // comentário
  '("(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)', // string
  '\\b(\\d+\\.?\\d*)\\b',                                      // número
  '\\b(' + KEYWORDS.join('|') + ')\\b',                        // palavra-chave
  '\\b(' + API_WORDS.join('|') + ')\\b',                       // API
  '([A-Za-z_$][\\w$]*)(?=\\s*\\()',                            // chamada de função
].join('|'), 'g');

export function highlightJS(src) {
  let out = '';
  let last = 0;
  src.replace(TOKEN_RE, (match, com, str, num, kw, api, fn, offset) => {
    out += escapeHtml(src.slice(last, offset));
    const cls = com ? 'tok-com' : str ? 'tok-str' : num ? 'tok-num' : kw ? 'tok-key' : api ? 'tok-api' : 'tok-fn';
    out += `<span class="${cls}">${escapeHtml(match)}</span>`;
    last = offset + match.length;
    return match;
  });
  out += escapeHtml(src.slice(last));
  return out;
}

function maxLineLen(lines) {
  let m = 0;
  for (let i = 0; i < lines.length; i += Math.max(1, Math.floor(lines.length / 500))) {
    if (lines[i].length > m) m = lines[i].length;
  }
  return m;
}
