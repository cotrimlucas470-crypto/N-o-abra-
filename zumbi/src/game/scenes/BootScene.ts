/** Primeira cena: só prepara e passa para o carregamento. */
import Phaser from 'phaser';
import { SCENES } from '../config/GameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    this.scene.start(SCENES.preload);
  }
}
