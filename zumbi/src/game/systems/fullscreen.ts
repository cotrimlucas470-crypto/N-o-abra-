/**
 * Tela cheia + travar na horizontal (Android/Chrome). Precisa ser chamado
 * dentro de um toque do usuário. Onde não for permitido (iPhone, iframe,
 * PC) simplesmente não acontece — o jogo continua normal.
 */
import type Phaser from 'phaser';

export function requestFullscreenLandscape(scene: Phaser.Scene): void {
  const scale = scene.scale;
  try {
    if (!scale.isFullscreen && scene.sys.game.device.fullscreen.available) {
      scale.startFullscreen({ navigationUI: 'hide' });
    }
  } catch {
    /* sem permissão: ignora */
  }
  lockLandscape();
}

export function toggleFullscreen(scene: Phaser.Scene): void {
  try {
    if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    else requestFullscreenLandscape(scene);
  } catch {
    /* ignora */
  }
}

function lockLandscape(): void {
  const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  if (!o?.lock) return;
  // O lock só funciona em tela cheia; tenta de novo quando ela entrar.
  const attempt = () => o.lock?.('landscape').catch(() => undefined);
  attempt();
  document.addEventListener('fullscreenchange', attempt, { once: true });
}
