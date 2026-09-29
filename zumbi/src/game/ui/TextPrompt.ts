/**
 * Caixa de texto de verdade (HTML) por cima do jogo: nome do marcador e
 * categoria. No celular abre o teclado do sistema e a lista nativa de
 * categorias. Enquanto aberta, o teclado do jogo fica desligado (digitar
 * "w" não anda).
 */
export interface PromptResult {
  name: string;
  cat: string;
}

export function openPrompt(o: { title: string; value: string; cats: readonly { id: string; label: string }[]; cat: string; ok: string; setKeyboard: (on: boolean) => void }): Promise<PromptResult | null> {
  return new Promise((resolve) => {
    o.setKeyboard(false);
    const wrap = document.createElement('div');
    wrap.setAttribute('style', 'position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:rgba(6,7,10,0.72);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;');
    const box = document.createElement('form');
    box.setAttribute('style', 'width:min(92vw,360px);background:#0e0f12;border:1px solid rgba(255,255,255,0.16);border-radius:14px;padding:16px;display:grid;gap:10px;color:#ecebe6;');
    const h = document.createElement('div');
    h.textContent = o.title;
    h.setAttribute('style', 'font-weight:800;font-size:15px;letter-spacing:.04em;');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = o.value;
    input.maxLength = 28;
    input.placeholder = 'Nome (ex.: Casa segura)';
    const field = 'font:600 15px system-ui,sans-serif;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:#17191d;color:#ecebe6;outline:none;';
    input.setAttribute('style', field);
    const sel = document.createElement('select');
    sel.setAttribute('style', field);
    for (const c of o.cats) {
      const op = document.createElement('option');
      op.value = c.id;
      op.textContent = c.label;
      if (c.id === o.cat) op.selected = true;
      sel.append(op);
    }
    const row = document.createElement('div');
    row.setAttribute('style', 'display:flex;gap:8px;justify-content:flex-end;');
    const btn = (label: string, primary: boolean) => {
      const b = document.createElement('button');
      b.type = primary ? 'submit' : 'button';
      b.textContent = label;
      b.setAttribute('style', `font:700 14px system-ui,sans-serif;padding:10px 16px;border-radius:10px;border:1px solid ${primary ? '#e0a84a' : 'rgba(255,255,255,0.2)'};background:${primary ? '#e0a84a' : '#17191d'};color:${primary ? '#16171a' : '#ecebe6'};`);
      return b;
    };
    const cancel = btn('Cancelar', false);
    const ok = btn(o.ok, true);
    row.append(cancel, ok);
    box.append(h, input, sel, row);
    wrap.append(box);
    // Toques aqui não chegam ao jogo.
    for (const ev of ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'keyup']) wrap.addEventListener(ev, (e) => e.stopPropagation());
    const done = (r: PromptResult | null) => {
      wrap.remove();
      o.setKeyboard(true);
      resolve(r);
    };
    box.addEventListener('submit', (e) => {
      e.preventDefault();
      done({ name: input.value.trim(), cat: sel.value });
    });
    cancel.addEventListener('click', () => done(null));
    document.body.append(wrap);
    setTimeout(() => input.focus(), 30);
  });
}
