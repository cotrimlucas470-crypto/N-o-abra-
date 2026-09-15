export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** Dispara uma vez quando o elemento entra na viewport. */
export function onEnter(node, cb, { threshold = 0.25, once = true, rootMargin = '0px' } = {}) {
  if (!('IntersectionObserver' in window)) {
    cb(true);
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          cb(true, e);
          if (once) io.disconnect();
        } else if (!once) cb(false, e);
      }
    },
    { threshold, rootMargin }
  );
  io.observe(node);
  return () => io.disconnect();
}

export function throttle(fn, ms = 100) {
  let last = 0;
  let timer = null;
  let lastArgs = null;
  return function throttled(...args) {
    const now = performance.now();
    lastArgs = args;
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        last = performance.now();
        fn.apply(this, lastArgs);
      }, ms - (now - last));
    }
  };
}

export function debounce(fn, ms = 150) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
