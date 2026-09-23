/**
 * Tela cheia + travar na horizontal (Android/Chrome). Precisa ser chamado
 * dentro de um toque do usuário.
 *
 * Usa a API do navegador diretamente (e não scale.startFullscreen do Phaser)
 * porque o pedido devolve uma Promise que pode ser RECUSADA — dentro de um
 * iframe sem permissão (visualizador do Claude, por exemplo) ou no iPhone.
 * O Phaser descarta essa Promise e a recusa virava "erro" na tela.
 * Aqui toda recusa é tratada: o jogo só continua sem tela cheia.
 *
 * O Phaser continua acompanhando o estado pelo evento `fullscreenchange`.
 */

/** O navegador PERMITE tela cheia nesta página? (false em iframes sem permissão e no iPhone) */
export function canFullscreen(): boolean {
  try {
    return document.fullscreenEnabled === true && typeof document.documentElement.requestFullscreen === 'function';
  } catch {
    return false;
  }
}

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

export function requestFullscreenLandscape(): void {
  if (!canFullscreen() || isFullscreen()) {
    lockLandscape();
    return;
  }
  const target = document.getElementById('game') ?? document.documentElement;
  try {
    target.requestFullscreen({ navigationUI: 'hide' }).then(lockLandscape, () => undefined);
  } catch {
    /* navegador antigo sem Promise: ignora */
  }
}

export function toggleFullscreen(): void {
  if (isFullscreen()) {
    try {
      document.exitFullscreen().catch(() => undefined);
    } catch {
      /* ignora */
    }
  } else {
    requestFullscreenLandscape();
  }
}

/** Trava a orientação na horizontal (só funciona em tela cheia no Android). */
function lockLandscape(): void {
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    o?.lock?.('landscape').catch(() => undefined);
  } catch {
    /* sem suporte: ignora */
  }
}
