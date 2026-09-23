/**
 * Flags de depuração lidas da URL:
 *   ?debug        -> mostra FPS e informações
 *   ?debug=fisica -> também desenha os corpos de colisão
 */
function readFlags() {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(globalThis.location?.search ?? '');
  } catch {
    params = new URLSearchParams();
  }
  const debug = params.get('debug');
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
