/**
 * Flags de depuração lidas da URL:
 *   ?debug ou #debug -> painel de debug, FPS e informações
 *   ?debug=fisica -> também desenha os corpos de colisão
 */
function readFlags() {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(globalThis.location?.search ?? '');
  } catch {
    params = new URLSearchParams();
  }
  let hash = '';
  try {
    hash = globalThis.location?.hash ?? '';
  } catch {
    hash = '';
  }
  // "#debug" também liga o debug: alguns visualizadores (ex.: o link do Claude)
  // não repassam o "?..." da URL, só o "#".
  const debug = params.get('debug') ?? (hash === '#debug' ? '' : null);
  return {
    enabled: debug !== null,
    physics: debug === 'fisica' || debug === 'physics',
    /** ?toque força os controles de toque mesmo no PC (útil para testar). */
    forceTouch: params.has('toque'),
    /** ?direto pula a tela de título. */
    skipTitle: params.has('direto'),
  };
}

export const DEBUG = readFlags();
