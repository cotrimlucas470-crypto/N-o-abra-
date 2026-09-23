/**
 * Carregamento em duas fases:
 *  1) lê assets/overrides.json (lista de PNGs substitutos, pode não existir);
 *  2) carrega esses PNGs; em seguida gera a arte procedural do resto.
 * Qualquer arquivo que falhar é ignorado: o jogo usa o desenho procedural.
 */
import Phaser from 'phaser';
import { SCENES } from '../config/GameConfig';
import { DEBUG } from '../core/Debug';
import { services } from '../core/Services';
import { ANIM, OVERRIDES_URL, TEX } from '../assets/AssetKeys';
import { overrideKey, parseOverrides } from '../assets/AssetOverrides';
import { AssetRegistry } from '../assets/AssetRegistry';
import { generateAssets } from '../assets/ProceduralAssets';
import { PLAYER_FRAMES } from '../assets/procedural/characters';
import { textStyle, UI } from '../ui/theme';

export class PreloadScene extends Phaser.Scene {
  private bar!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.preload);
  }

  preload(): void {
    const s = services(this.game);
    const cam = this.cameras.main;
    cam.setOrigin(0, 0).setZoom(s.viewport.dpr).setBackgroundColor('#101114');
    this.bar = this.add.graphics();
    this.label = this.add.text(0, 0, 'Preparando a cidade…', textStyle(14, UI.textDim)).setOrigin(0.5).setResolution(s.viewport.dpr);
    this.drawProgress(0);

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`[assets] não carregou ${file.key} (${String(file.url)}) — usando arte procedural`);
    });
    this.load.json(TEX.overridesJson, OVERRIDES_URL);
  }

  create(): void {
    const s = services(this.game);
    const raw: unknown = this.cache.json.get(TEX.overridesJson);
    s.overrides = parseOverrides(raw);

    // Fase 2: PNGs substitutos
    let queued = 0;
    for (const [id, v] of Object.entries(s.overrides.sprites)) {
      if (typeof v === 'string') this.load.image(overrideKey(id), v);
      else this.load.spritesheet(overrideKey(id), v.file, { frameWidth: v.frameWidth, frameHeight: v.frameHeight });
      queued++;
    }
    if (s.overrides.tiles) {
      this.load.image(TEX.tiles, s.overrides.tiles);
      queued++;
    }
    for (const [key, file] of Object.entries(s.overrides.patterns)) {
      this.load.image(key, file);
      queued++;
    }

    const finish = () => {
      this.drawProgress(0.7);
      this.label.setText('Pintando ruas…');
      // Deixa um frame renderizar a barra antes do trabalho pesado.
      this.time.delayedCall(30, () => this.buildAndStart());
    };
    if (queued === 0) finish();
    else {
      this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => this.drawProgress(v * 0.6));
      this.load.once(Phaser.Loader.Events.COMPLETE, finish);
      this.load.start();
    }
  }

  private buildAndStart(): void {
    const s = services(this.game);
    const t0 = performance.now();
    const registry = new AssetRegistry(this.textures);
    const timings = generateAssets(this.textures, registry);
    s.assets = registry;
    this.createAnimations(registry);
    if (DEBUG.enabled) console.info(`[assets] gerados em ${Math.round(performance.now() - t0)} ms`, JSON.stringify(timings));
    this.drawProgress(1);
    this.scene.start(DEBUG.skipTitle ? SCENES.game : SCENES.title);
  }

  private createAnimations(assets: AssetRegistry): void {
    const frames = (id: string) => {
      const out: Phaser.Types.Animations.AnimationFrame[] = [];
      for (let i = 0; i < PLAYER_FRAMES; i++) {
        const r = assets.ref(id, i);
        out.push(r.frame === undefined ? { key: r.key } : { key: r.key, frame: r.frame });
      }
      return out;
    };
    for (const [key, id] of [[ANIM.torsoWalk, 'player.torso'], [ANIM.legsWalk, 'player.legs']] as const) {
      if (this.anims.exists(key)) this.anims.remove(key);
      this.anims.create({ key, frames: frames(id), frameRate: 10, repeat: -1 });
    }
  }

  private drawProgress(v: number): void {
    const s = services(this.game);
    const w = s.viewport.cssWidth;
    const h = s.viewport.cssHeight;
    const bw = Math.min(280, w * 0.6);
    const x = (w - bw) / 2;
    const y = h / 2 + 18;
    this.label.setPosition(w / 2, h / 2 - 8);
    this.bar.clear();
    this.bar.fillStyle(0xffffff, 0.12).fillRoundedRect(x, y, bw, 6, 3);
    this.bar.fillStyle(UI.accentNum, 1).fillRoundedRect(x, y, Math.max(6, bw * v), 6, 3);
  }
}
