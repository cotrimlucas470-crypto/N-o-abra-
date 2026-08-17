/** Modais e toasts — criados sob demanda e removidos do DOM ao fechar (sem nós órfãos). */

const root = () => document.getElementById('modal-root');

export function openModal({ title, body, actions = [], onClose, wide = false }) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  const modal = document.createElement('div');
  modal.className = 'modal';
  if (wide) modal.style.maxWidth = '760px';

  const head = document.createElement('div');
  head.className = 'modal-head';
  head.innerHTML = `<div class="modal-title"></div>`;
  head.querySelector('.modal-title').textContent = title || '';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'icon-btn';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Fechar');
  head.appendChild(closeBtn);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'modal-body';
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body) bodyEl.appendChild(body);

  modal.append(head, bodyEl);

  if (actions.length) {
    const foot = document.createElement('div');
    foot.className = 'modal-foot';
    for (const a of actions) {
      const b = document.createElement('button');
      b.className = 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : '');
      b.textContent = a.label;
      b.onclick = () => { const r = a.onClick && a.onClick(bodyEl); if (r !== false) close(); };
      foot.appendChild(b);
    }
    modal.appendChild(foot);
  }

  back.appendChild(modal);
  root().appendChild(back);

  function close() {
    back.remove();
    if (onClose) onClose();
  }
  closeBtn.onclick = close;
  back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });

  return { el: modal, body: bodyEl, close };
}

export function confirmDialog(message, { title = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal({
      title,
      body: `<p style="line-height:1.5">${escapeHtml(message)}</p>`,
      actions: [
        { label: 'Cancelar', onClick: () => { done = true; resolve(false); } },
        { label: 'Confirmar', primary: !danger, danger, onClick: () => { done = true; resolve(true); } },
      ],
      onClose: () => { if (!done) resolve(false); },
    });
    return m;
  });
}

export function promptDialog(message, defaultValue = '', { title = 'Forge Mobile' } = {}) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<p style="margin:0 0 8px">${escapeHtml(message)}</p>`;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue;
    wrap.appendChild(input);
    let done = false;
    const m = openModal({
      title,
      body: wrap,
      actions: [
        { label: 'Cancelar', onClick: () => { done = true; resolve(null); } },
        { label: 'OK', primary: true, onClick: () => { done = true; resolve(input.value.trim() || null); } },
      ],
      onClose: () => { if (!done) resolve(null); },
    });
    setTimeout(() => { input.focus(); input.select(); }, 60);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { done = true; m.close(); resolve(input.value.trim() || null); } });
  });
}

/** Lista pesquisável reutilizada por Command Palette, busca global e "Add Component". */
export function listDialog({ title, items, placeholder = 'Buscar…', onPick, emptyText = 'Nada encontrado.' }) {
  const wrap = document.createElement('div');
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'search-input';
  search.placeholder = placeholder;
  const list = document.createElement('div');
  list.className = 'modal-list';
  wrap.append(search, list);

  let filtered = items;
  let hl = 0;

  const render = () => {
    list.textContent = '';
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:16px;color:var(--fg-3);text-align:center';
      empty.textContent = emptyText;
      list.appendChild(empty);
      return;
    }
    filtered.slice(0, 80).forEach((it, i) => {
      const b = document.createElement('button');
      if (i === hl) b.className = 'hl';
      b.innerHTML = `<span>${it.icon || ''}</span><span>${escapeHtml(it.label)}</span>` +
        (it.sub ? `<span class="m-sub">${escapeHtml(it.sub)}</span>` : '');
      b.onclick = () => { m.close(); onPick(it); };
      list.appendChild(b);
    });
  };

  const filter = () => {
    const q = search.value.trim().toLowerCase();
    filtered = !q ? items : items.filter((it) =>
      it.label.toLowerCase().includes(q) || (it.sub || '').toLowerCase().includes(q) || (it.keywords || '').toLowerCase().includes(q));
    hl = 0;
    render();
  };

  search.addEventListener('input', filter);
  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { hl = Math.min(hl + 1, filtered.length - 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { hl = Math.max(hl - 1, 0); render(); e.preventDefault(); }
    else if (e.key === 'Enter' && filtered[hl]) { m.close(); onPick(filtered[hl]); }
  });

  const m = openModal({ title, body: wrap });
  render();
  setTimeout(() => search.focus(), 60);
  return m;
}

export function toast(message, type = '') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
