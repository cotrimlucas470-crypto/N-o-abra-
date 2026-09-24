/**
 * Ponto de entrada: cria o jogo Phaser e os serviços compartilhados.
 * A lógica do jogo fica em src/game/ (veja docs/ARQUITETURA.md).
 */
import Phaser from 'phaser';
import { DEBUG } from './game/core/Debug';
import { EventBus } from './game/core/EventBus';
import { createServices } from './game/core/Services';
import { BootScene } from './game/scenes/BootScene';
import { DebugScene } from './game/scenes/DebugScene';
import { GameScene } from './game/scenes/GameScene';
import { HudScene } from './game/scenes/HudScene';
import { PreloadScene } from './game/scenes/PreloadScene';
import { TitleScene } from './game/scenes/TitleScene';
import { Viewport } from './game/systems/Viewport';
import { sandboxFromUrl } from './game/config/Sandbox';

const bus = new EventBus();
const viewport = new Viewport(bus);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#101114',
  banner: false,
  scale: {
    // Tamanho controlado por nós (Viewport): canvas na resolução real da tela.
    mode: Phaser.Scale.NONE,
    width: viewport.cssWidth * viewport.dpr,
    height: viewport.cssHeight * viewport.dpr,
    zoom: 1 / viewport.dpr,
    fullscreenTarget: 'game',
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    powerPreference: 'high-performance',
  },
  fps: { smoothStep: true },
  input: { activePointers: 5 },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      // Passo fixo de 1/120 s: com FPS baixo a física dá vários passos pequenos
      // (nunca atravessa parede e o jogo não fica em câmera lenta); em telas
      // de 120 Hz é 1 passo por quadro, liso.
      fixedStep: true,
      fps: 120,
      debug: DEBUG.physics,
    },
  },
  scene: [BootScene, PreloadScene, TitleScene, GameScene, HudScene, DebugScene],
});

// Opções de mundo: padrão, com ajustes de teste pela URL (?setores=1x1, ?hora=20...).
createServices(game, viewport, bus, sandboxFromUrl(window.location.search));
viewport.attach(game);

document.getElementById('boot')?.remove();
