import { bus } from '../core/EventBus.js';
import { escapeHtml } from './ui/Modal.js';

/**
 * Console do editor: Logs, Warnings e Errors com arquivo/linha e botão para abrir o código.
 *
 * Performance (regra 22 do prompt de otimização): buffer circular (padrão 5000),
 * agrupamento de mensagens repetidas e no máximo MAX_ROWS linhas no DOM — o restante
 * fica no buffer e aparece conforme o filtro.
 */

const MAX_ROWS = 300;
const ICONS = { log: '›', warn: '▲', error: '✕' };

export class ConsolePanel {
  constructor({ listEl, badgeEl, limit = 5000 }) {
    this.listEl = listEl;
    this.badgeEl = badgeEl;
    this.limit = limit;
    this.entries = [];
    this.counts = { log: 0, warn: 0, error: 0 };
    this.filters = { log: true, warn: true, error: true, collapse: false, query: '' };
    this.onOpenCode = null;      // (assetId, line) => void
    this._dirty = false;
    this._raf = 0;
    this._lastKey = null;
  }

  /* ------------------------------ API de log ------------------------------ */

  log(message, meta) { this._push('log', message, meta); }
  warn(message, meta) { this._push('warn', message, meta); }
  error(message, meta) { this._push('error', message, meta); }

  _push(level, message, meta = {}) {
    const text = typeof message === 'string' ? message : String(message);
    const key = level + '|' + text + '|' + (meta.file || '') + '|' + (meta.line || '');
    const last = this.entries[this.entries.length - 1];

    if (last && last.key === key) {
      last.count++;
      last.time = Date.now();
    } else {
      this.entries.push({
        key, level, text,
        file: meta.file || null,
        line: meta.line || null,
        assetId: meta.assetId || null,
        count: 1,
        time: Date.now(),
      });
      if (this.entries.length > this.limit) this.entries.splice(0, this.entries.length - this.limit);
    }
    this.counts[level]++;
    this._schedule();
    bus.emit('console:entry', { level, text });
  }

  clear() {
    this.entries.length = 0;
    this.counts.log = this.counts.warn = this.counts.error = 0;
    this._schedule();
  }

  setFilter(key, value) { this.filters[key] = value; this._schedule(); }

  /* ------------------------------ render ------------------------------ */

  _schedule() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.render(); });
  }

  visibleEntries() {
    const f = this.filters;
    const q = (f.query || '').toLowerCase();
    let list = this.entries.filter((e) => f[e.level] && (!q || e.text.toLowerCase().includes(q) || (e.file || '').toLowerCase().includes(q)));
    if (f.collapse) {
      const map = new Map();
      for (const e of list) {
        const prev = map.get(e.key);
        if (prev) prev.count += e.count;
        else map.set(e.key, { ...e });
      }
      list = Array.from(map.values());
    }
    return list;
  }

  render() {
    if (!this.listEl) return;
    const list = this.visibleEntries();
    const shown = list.slice(-MAX_ROWS);
    const atBottom = this.listEl.scrollTop + this.listEl.clientHeight >= this.listEl.scrollHeight - 30;

    const frag = document.createDocumentFragment();
    if (list.length > shown.length) {
      const note = document.createElement('div');
      note.className = 'log-row log';
      note.style.color = 'var(--fg-3)';
      note.textContent = `… ${list.length - shown.length} mensagens anteriores no buffer (use o filtro para encontrá-las)`;
      frag.appendChild(note);
    }
    for (const e of shown) {
      const row = document.createElement('div');
      row.className = 'log-row ' + e.level;
      const src = e.file ? `${e.file}${e.line ? ':' + e.line : ''}` : '';
      row.innerHTML =
        `<span class="log-icon">${ICONS[e.level]}</span>` +
        `<span class="log-msg">${escapeHtml(e.text)}</span>` +
        (e.count > 1 ? `<span class="log-count">${e.count}</span>` : '') +
        (src ? `<span class="log-src">${escapeHtml(src)}</span>` : '');
      if (src && this.onOpenCode) {
        row.querySelector('.log-src').onclick = () => this.onOpenCode(e.assetId, e.file, e.line);
      }
      frag.appendChild(row);
    }
    this.listEl.textContent = '';
    this.listEl.appendChild(frag);
    if (atBottom) this.listEl.scrollTop = this.listEl.scrollHeight;

    if (this.badgeEl) {
      const n = this.counts.error;
      this.badgeEl.hidden = n === 0;
      this.badgeEl.textContent = n > 999 ? '999+' : String(n);
    }
  }

  /** Captura erros globais do app para não sumirem silenciosamente. */
  captureGlobalErrors() {
    window.addEventListener('error', (e) => {
      if (e.message && /Script error/i.test(e.message)) return;
      this.error(`${e.message}`, { file: shortFile(e.filename), line: e.lineno });
    });
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      this.error(`Promise rejeitada: ${r && r.message ? r.message : String(r)}`);
    });
  }
}

function shortFile(f) {
  if (!f) return null;
  try { return f.split('/').pop(); } catch { return f; }
}
