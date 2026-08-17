/**
 * Proteção contra loops infinitos em scripts do usuário (regra 54: crash prevention).
 *
 * Como funciona: antes de compilar, injetamos uma chamada `__guard()` no início do corpo
 * de cada `for` / `while` / `do`. O guard só consulta o relógio a cada N iterações,
 * então o custo é ~1 incremento por volta.
 *
 * Limitação conhecida: loops sem chaves e cujo corpo não termina em `;` no mesmo nível
 * não são instrumentados (o parser é intencionalmente simples, não um parser JS completo).
 * O orçamento de tempo por invocação continua valendo nesses casos apenas quando o loop
 * chama alguma função instrumentada.
 */

export class ScriptTimeoutError extends Error {
  constructor(ms) {
    super(`Execução interrompida: o script passou de ${ms}ms em uma única chamada (possível loop infinito).`);
    this.name = 'ScriptTimeoutError';
  }
}

const CHECK_EVERY = 2048;

export class GuardState {
  constructor(budgetMs = 250) {
    this.budgetMs = budgetMs;
    this.deadline = Infinity;
    this.counter = 0;
    this.guard = () => {
      if ((++this.counter & (CHECK_EVERY - 1)) !== 0) return;
      if (performance.now() > this.deadline) throw new ScriptTimeoutError(this.budgetMs);
    };
  }

  begin(budgetMs = this.budgetMs) {
    this.counter = 0;
    this.deadline = performance.now() + budgetMs;
  }

  end() { this.deadline = Infinity; }
}

const KEYWORDS = ['for', 'while', 'do'];

/** Injeta `__guard();` nos corpos de loop. Preserva a contagem de linhas do original. */
export function injectGuards(src) {
  let out = '';
  let i = 0;
  const n = src.length;

  while (i < n) {
    const ch = src[i];

    /* strings, template literals e comentários passam intactos */
    if (ch === '"' || ch === "'" || ch === '`') { const j = skipString(src, i); out += src.slice(i, j); i = j; continue; }
    if (ch === '/' && src[i + 1] === '/') { const j = src.indexOf('\n', i); const e = j < 0 ? n : j; out += src.slice(i, e); i = e; continue; }
    if (ch === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i); const e = j < 0 ? n : j + 2; out += src.slice(i, e); i = e; continue; }

    /* palavra-chave de loop? */
    if (isIdentStart(ch)) {
      let j = i;
      while (j < n && isIdentPart(src[j])) j++;
      const word = src.slice(i, j);
      const prev = prevNonSpace(src, i - 1);
      if (KEYWORDS.includes(word) && prev !== '.') {
        out += word;
        i = j;
        let k = skipSpace(src, i);

        if (word === 'do') {
          if (src[k] === '{') { out += src.slice(i, k + 1) + '__guard();'; i = k + 1; continue; }
          out += src.slice(i, k); i = k; continue;
        }

        if (src[k] !== '(') { out += src.slice(i, k); i = k; continue; }
        const close = matchParen(src, k);
        if (close < 0) { out += src.slice(i, k); i = k; continue; }
        const afterHeader = skipSpace(src, close + 1);
        out += src.slice(i, afterHeader);
        i = afterHeader;

        if (src[i] === '{') { out += '{__guard();'; i++; continue; }
        const semi = findStatementEnd(src, i);
        if (semi >= 0) { out += '{__guard();' + src.slice(i, semi + 1) + '}'; i = semi + 1; continue; }
        continue; // não instrumentável: segue sem guard (limitação documentada)
      }
      out += word; i = j; continue;
    }

    out += ch; i++;
  }
  return out;
}

function isIdentStart(c) { return /[A-Za-z_$]/.test(c); }
function isIdentPart(c) { return /[A-Za-z0-9_$]/.test(c); }
function skipSpace(s, i) { while (i < s.length && /\s/.test(s[i])) i++; return i; }
function prevNonSpace(s, i) { while (i >= 0 && /\s/.test(s[i])) i--; return i >= 0 ? s[i] : ''; }

function skipString(s, i) {
  const q = s[i]; let j = i + 1;
  while (j < s.length) {
    if (s[j] === '\\') { j += 2; continue; }
    if (s[j] === q) return j + 1;
    if (q === '`' && s[j] === '$' && s[j + 1] === '{') {
      let depth = 1; j += 2;
      while (j < s.length && depth > 0) {
        if (s[j] === '{') depth++;
        else if (s[j] === '}') depth--;
        else if (s[j] === '"' || s[j] === "'" || s[j] === '`') { j = skipString(s, j) - 1; }
        j++;
      }
      continue;
    }
    j++;
  }
  return j;
}

function matchParen(s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '"' || c === "'" || c === '`') { j = skipString(s, j) - 1; continue; }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return j; }
  }
  return -1;
}

function findStatementEnd(s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '"' || c === "'" || c === '`') { j = skipString(s, j) - 1; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { if (depth === 0) return -1; depth--; }
    else if (c === ';' && depth === 0) return j;
    else if (c === '\n' && depth === 0) return -1;
  }
  return -1;
}
