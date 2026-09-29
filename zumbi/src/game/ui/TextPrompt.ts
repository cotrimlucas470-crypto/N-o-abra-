/**
 * Caixa de texto de verdade (HTML) por cima do jogo: nome do local e a
 * categoria em botões grandes (fácil de tocar no celular). O celular abre o
 * teclado do sistema. Enquanto aberta, o teclado do jogo fica desligado.
 */
export interface PromptResult {
  name: string;
  cat: string;
}

export function openPrompt(o: { title: string; value: string; cats: readonly { id: string; label: string; icon?: string }[]; cat: string; ok: string; setKeyboard: (on: boolean) => void }): Promise<PromptResult | null> {
  return new Promise((resolve) => {
    o.setKeyboard(false);
    const wrap = document.createElement('div');
    wrap.setAttribute('style', 'position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:rgba(6,7,10,0.72);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;');
    const box = document.createElement('form');
    box.setAttribute('style', 'width:min(94vw,380px);max-height:94vh;overflow:auto;background:#0e0f12;border:1px solid rgba(255,255,255,0.16);border-radius:14px;padding:14px;display:grid;gap:10px;color:#ecebe6;');
    const h = document.createElement('div');
    h.textContent = o.title;
    h.setAttribute('style', 'font-weight:800;font-size:15px;letter-spacing:.04em;');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = o.value;
    input.maxLength = 28;
    input.placeholder = 'Nome (ex.: Casa da esquina)';
    input.setAttribute('style', 'font:600 16px system-ui,sans-serif;padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:#17191d;color:#ecebe6;outline:none;');
    // Categorias: um botão grande por categoria (toque escolhe).
    let cat = o.cats.some((c) => c.id === o.cat) ? o.cat : o.cats[0]!.id;
    const grid = document.createElement('div');
    grid.setAttribute('style', 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;');
    const chips: HTMLButtonElement[] = [];
    const paint = () => {
      for (const b of chips) {
        const on = b.dataset['cat'] === cat;
        b.style.background = on ? '#e0a84a' : '#17191d';
        b.style.color = on ? '#16171a' : '#ecebe6';
        b.style.borderColor = on ? '#e0a84a' : 'rgba(255,255,255,0.2)';
      }
    };
    for (const c of o.cats) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset['cat'] = c.id;
      b.textContent = `${c.icon ? c.icon + ' ' : ''}${c.label}`;
      b.setAttribute('style', 'font:700 14px system-ui,sans-serif;padding:12px 6px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);min-height:46px;white-space:nowrap;');
      b.addEventListener('click', () => {
        // Nome vazio (ou o nome de outra categoria): acompanha a categoria escolhida.
        const prev = o.cats.find((x) => x.id === cat)?.label ?? '';
        if (!input.value.trim() || input.value.trim() === prev) input.value = c.label;
        cat = c.id;
        paint();
      });
      chips.push(b);
      grid.append(b);
    }
    paint();
    const row = document.createElement('div');
    row.setAttribute('style', 'display:flex;gap:8px;justify-content:flex-end;');
    const btn = (label: string, primary: boolean) => {
      const b = document.createElement('button');
      b.type = primary ? 'submit' : 'button';
      b.textContent = label;
      b.setAttribute('style', `font:700 15px system-ui,sans-serif;padding:12px 18px;border-radius:10px;border:1px solid ${primary ? '#e0a84a' : 'rgba(255,255,255,0.2)'};background:${primary ? '#e0a84a' : '#17191d'};color:${primary ? '#16171a' : '#ecebe6'};`);
      return b;
    };
    const cancel = btn('Cancelar', false);
    const ok = btn(o.ok, true);
    row.append(cancel, ok);
    box.append(h, input, grid, row);
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
      done({ name: input.value.trim(), cat });
    });
    cancel.addEventListener('click', () => done(null));
    // Em tela cheia só o elemento da tela cheia aparece: a caixa entra nele.
    (document.fullscreenElement ?? document.body).append(wrap);
  });
}
