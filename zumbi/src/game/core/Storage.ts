/**
 * Acesso seguro ao localStorage. Em aba anônima, WebView restrita ou
 * armazenamento cheio, o navegador pode lançar erro — aqui isso nunca
 * derruba o jogo: a leitura devolve o padrão e a escrita devolve false.
 *
 * IMPORTANTE (regra do projeto): nada aqui apaga dados sem pedido explícito.
 * O sistema de save (etapa futura) vai usar isto com backup automático.
 */
const PREFIX = 'tdr.';

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
