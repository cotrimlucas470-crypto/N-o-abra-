/**
 * VISTA DE CIMA: num andar de cima, uma segunda câmera desenha a rua lá
 * embaixo (a cidade de verdade), alinhada com o andar — por fora das paredes
 * do andar aparece o quintal, a calçada e os zumbis juntando na porta.
 *
 * Ela desenha ANTES da câmera principal, mais escura; a principal fica sem
 * fundo e só tem o andar (o resto da faixa não está carregado). O que é da
 * tela (noite, chuva, neblina) só a principal desenha.
 */
import Phaser from 'phaser';
import type { FloorData } from '../MapTypes';

export class FloorCamera {
  private below: Phaser.Cameras.Scene2D.Camera | null = null;
  private floor: FloorData | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly background: string,
    /** Objetos só da câmera principal (escuridão, chuva...). */
    private readonly screenOnly: () => Phaser.GameObjects.GameObject[],
  ) {
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.set(null));
  }

  get active(): boolean {
    return !!this.below;
  }

  set(f: FloorData | null): void {
    this.floor = f;
    const main = this.scene.cameras.main;
    if (!f) {
      if (this.below) {
        this.scene.cameras.remove(this.below, true);
        this.below = null;
      }
      main.setBackgroundColor(this.background);
      return;
    }
    if (!this.below) {
      const cam = this.scene.cameras.add(main.x, main.y, main.width, main.height, false, 'embaixo');
      // Desenha primeiro (por baixo da principal).
      const list = this.scene.cameras.cameras;
      list.splice(list.indexOf(cam), 1);
      list.unshift(cam);
      cam.setBackgroundColor(this.background);
      cam.setRoundPixels(main.roundPixels);
      cam.ignore(this.screenOnly());
      this.below = cam;
    }
    main.setBackgroundColor('rgba(0,0,0,0)');
    this.sync(0);
  }

  /** Acompanha a principal (mesmo zoom, deslocada até a rua); `darkness` escurece mais à noite. */
  sync(darkness: number): void {
    const cam = this.below;
    const f = this.floor;
    if (!cam || !f) return;
    const main = this.scene.cameras.main;
    if (cam.width !== main.width || cam.height !== main.height) cam.setSize(main.width, main.height);
    cam.setZoom(main.zoom);
    cam.setScroll(main.scrollX - f.dx, main.scrollY - f.dy);
    cam.setAlpha(0.72 - darkness * 0.25);
  }
}
