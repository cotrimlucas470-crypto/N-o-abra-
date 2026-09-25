/**
 * DESENHO dos zumbis (parte Phaser). Cada zumbi perto da câmera ganha a
 * própria folha de textura (zombieArt.ts: aparência única, feridas, sangue)
 * e 6 imagens: sombra, pernas, braço esquerdo, braço direito, tronco,
 * cabeça — ou o corpo deitado (caído, rastejando). A animação sai do estado
 * da mente e do corpo:
 *
 *  - andar: passada sincronizada com a distância (mancando, a perna ruim
 *    arrasta), tronco balança, cabeça pende;
 *  - braços: caídos vagando, esticados perseguindo, puxados para trás na
 *    preparação do golpe, lançados no golpe, fechados no agarrão, socando a
 *    porta, sacudindo ao cambalear; braço arrancado some;
 *  - mordida: cabeça avança; golpe recebido: tranco para trás e clarão;
 *  - caído/rastejando: corpo no chão, braços puxando o corpo;
 *  - morto: corpo (textura pequena) com poça de sangue que cresce.
 *
 * Texturas vivem num cache (LRU): só os zumbis vistos há pouco ocupam
 * memória. Assar a textura custa ~1–3 ms: no máximo algumas por quadro.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { TEX } from '../../assets/AssetKeys';
import { CORPSE_SIZE, drawBloodPool, drawCorpse, drawZombieSheet, LEG_FRAMES, sheetLayout, zombieDims, ZOMBIE_RES } from '../../assets/procedural/zombieArt';
import type { ShadowSystem } from './ShadowSystem';
import type { ZombieSystem } from '../../zombies/ZombieSystem';
import { isCrawler, isLimping, legs, type Zombie } from '../../zombies/Zombie';

const MARGIN = 220;
const SHEET_CACHE = 44;
const CORPSE_CACHE = 70;
const BLOOD_KEYS = 4;
const BASE = DEPTH.player - 1.6;

interface Sheet {
  key: string;
  ver: number;
  used: number;
  tex: Phaser.Textures.CanvasTexture;
}

interface View {
  z: Zombie;
  shadow: Phaser.GameObjects.Image;
  lying: Phaser.GameObjects.Image;
  legs: Phaser.GameObjects.Image;
  armL: Phaser.GameObjects.Image;
  armR: Phaser.GameObjects.Image;
  torso: Phaser.GameObjects.Image;
  head: Phaser.GameObjects.Image;
  key: string;
  /** Ombro (meia largura) e cabeça em px de mundo. */
  W: number;
  seen: number;
}

interface CorpseView {
  z: Zombie;
  img: Phaser.GameObjects.Image;
  pool: Phaser.GameObjects.Image;
  seen: number;
}

export class ZombieViews {
  private readonly views = new Map<string, View>();
  private readonly spare: View[] = [];
  private readonly sheets = new Map<string, Sheet>();
  private readonly corpses = new Map<string, CorpseView>();
  private readonly corpseTex = new Map<string, { used: number; ver: number }>();
  private readonly layout = sheetLayout();
  private frameNo = 0;
  private readonly near: Zombie[] = [];
  private readonly bloodKeys: string[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sys: ZombieSystem,
    private readonly shadows: ShadowSystem,
  ) {
    for (let i = 0; i < BLOOD_KEYS; i++) {
      const key = `fx.bloodpool.${i}`;
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, drawBloodPool(900 + i * 17));
      this.bloodKeys.push(key);
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  get count(): number {
    return this.views.size;
  }

  get corpseCount(): number {
    return this.corpses.size;
  }

  update(cam: Phaser.Cameras.Scene2D.Camera): void {
    this.frameNo++;
    const v = cam.worldView;
    const cx = v.centerX;
    const cy = v.centerY;
    const r = Math.hypot(v.width, v.height) / 2 + MARGIN;
    const now = this.sys.now;
    const pf = this.sys.player.floor;
    let bakes = 2;
    let corpseBakes = 3;
    // Mais perto primeiro (assa quem vai aparecer antes).
    const list = this.sys.store.near(cx, cy, r, this.near).sort((a, b) => (a.x - cx) ** 2 + (a.y - cy) ** 2 - ((b.x - cx) ** 2 + (b.y - cy) ** 2));
    for (const z of list) {
      if (z.floor !== pf) continue;
      if (z.dead) {
        const c = this.corpses.get(z.id) ?? (corpseBakes-- > 0 ? this.makeCorpse(z) : null);
        if (c) {
          c.seen = this.frameNo;
          this.drawCorpse(c, now);
        }
        // Morreu com a vista ainda montada: some a vista viva.
        const alive = this.views.get(z.id);
        if (alive) this.release(alive);
        continue;
      }
      let view = this.views.get(z.id);
      const sheet = this.sheets.get(z.id);
      if (!sheet || sheet.ver !== z.anim.ver) {
        if (bakes <= 0) {
          if (view) view.seen = this.frameNo;
          continue;
        }
        bakes--;
        this.bake(z);
      }
      if (!view) view = this.acquire(z);
      view.seen = this.frameNo;
      this.sheets.get(z.id)!.used = this.frameNo;
      this.pose(view, now);
    }
    // Quem saiu da vista.
    for (const view of [...this.views.values()]) if (view.seen !== this.frameNo) this.release(view);
    for (const c of [...this.corpses.values()]) {
      if (c.seen === this.frameNo) continue;
      c.img.destroy();
      c.pool.destroy();
      this.corpses.delete(c.z.id);
    }
    this.evict();
  }

  // ---------------------------------------------------------------- texturas

  private bake(z: Zombie): void {
    let s = this.sheets.get(z.id);
    if (!s) {
      const key = `zumbi:${z.id}`;
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      const tex = this.scene.textures.createCanvas(key, this.layout.w, this.layout.h)!;
      for (const [name, f] of Object.entries(this.layout.frames)) tex.add(name, 0, f.x, f.y, f.w, f.h);
      s = { key, ver: -1, used: this.frameNo, tex };
      this.sheets.set(z.id, s);
    }
    drawZombieSheet(z, s.tex.getCanvas());
    s.tex.refresh();
    s.ver = z.anim.ver;
    s.used = this.frameNo;
  }

  /** Libera as folhas menos usadas (fora da tela) quando passa do limite. */
  private evict(): void {
    if (this.sheets.size > SHEET_CACHE) {
      const old = [...this.sheets.entries()].filter(([id]) => !this.views.has(id)).sort((a, b) => a[1].used - b[1].used);
      for (const [id, s] of old.slice(0, this.sheets.size - SHEET_CACHE)) {
        this.scene.textures.remove(s.key);
        this.sheets.delete(id);
      }
    }
    if (this.corpseTex.size > CORPSE_CACHE) {
      const old = [...this.corpseTex.entries()].filter(([id]) => !this.corpses.has(id)).sort((a, b) => a[1].used - b[1].used);
      for (const [id] of old.slice(0, this.corpseTex.size - CORPSE_CACHE)) {
        this.scene.textures.remove(`corpo:${id}`);
        this.corpseTex.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------- vivos

  private acquire(z: Zombie): View {
    const key = this.sheets.get(z.id)!.key;
    let v = this.spare.pop();
    const sc = 1 / ZOMBIE_RES;
    if (!v) {
      const img = (frame: string, depth: number) => this.scene.add.image(0, 0, key, frame).setDepth(depth).setScale(sc);
      v = {
        z,
        shadow: this.scene.add.image(0, 0, TEX.shadowSoft).setDepth(DEPTH.playerShadow - 0.5),
        lying: img('lying', BASE),
        legs: img('legs0', BASE + 0.1),
        armL: img('armL', BASE + 0.2),
        armR: img('armR', BASE + 0.2),
        torso: img('torso', BASE + 0.3),
        head: img('head', BASE + 0.4),
        key,
        W: 0,
        seen: 0,
      };
    }
    v.z = z;
    v.key = key;
    for (const [img, frame] of [[v.lying, 'lying'], [v.legs, 'legs0'], [v.armL, 'armL'], [v.armR, 'armR'], [v.torso, 'torso'], [v.head, 'head']] as const) {
      img.setTexture(key, frame).setScale(sc).setVisible(true).clearTint().setAlpha(1);
      const f = this.layout.frames[frame]!;
      img.setOrigin(f.ox, f.oy);
    }
    v.shadow.setVisible(true);
    v.W = zombieDims(z).W;
    this.views.set(z.id, v);
    return v;
  }

  private release(v: View): void {
    this.views.delete(v.z.id);
    for (const img of [v.shadow, v.lying, v.legs, v.armL, v.armR, v.torso, v.head]) img.setVisible(false);
    this.spare.push(v);
  }

  /** Posição e pose de cada parte neste quadro. */
  private pose(v: View, now: number): void {
    const z = v.z;
    const m = z.mind;
    const s = m.state;
    const f = z.facing;
    const cos = Math.cos(f);
    const sin = Math.sin(f);
    const px = -sin;
    const py = cos;
    const lyingState = s === 'FALL' || (s === 'GET_UP' && m.timer > 0.5) || isCrawler(z);
    // Tranco do golpe recebido.
    const since = now - z.anim.hitAt;
    const kick = since < 0.18 ? (1 - since / 0.18) * 4 : 0;
    const bx = z.x + Math.cos(z.anim.hitDir) * kick;
    const by = z.y + Math.sin(z.anim.hitDir) * kick;
    const flash = since < 0.1 && m.state !== 'DEAD';
    const o = this.shadows.offset(lyingState ? 0.15 : 0.5);
    v.shadow.setPosition(bx + o.x, by + o.y).setAlpha(0.18 + this.shadows.alpha).setDisplaySize(lyingState ? 90 : 48, lyingState ? 40 : 34).setRotation(f);

    if (lyingState) {
      v.lying.setVisible(true).setPosition(bx - cos * 8, by - sin * 8).setRotation(f);
      v.legs.setVisible(false);
      v.torso.setVisible(false);
      v.head.setVisible(false);
      // Braços na ponta da cabeça: rastejando puxam alternado; caído, largados.
      const crawl = isCrawler(z) && s !== 'FALL' && Math.hypot(z.vx, z.vy) > 3;
      const t = z.stride * Math.PI * 2;
      const sx = bx + cos * 18;
      const sy = by + sin * 18;
      for (const [img, side] of [[v.armL, -1], [v.armR, 1]] as const) {
        const alive = z.parts[side < 0 ? 'bracoE' : 'bracoD'] > 0;
        if (!alive) {
          img.setVisible(false);
          continue;
        }
        const reach = crawl ? 0.75 + 0.3 * Math.sin(t + (side < 0 ? 0 : Math.PI)) : s === 'FALL' ? 0.8 : 0.9;
        const ang = crawl ? side * (0.25 + 0.2 * Math.cos(t + (side < 0 ? 0 : Math.PI))) : side * (s === 'FALL' ? 0.9 : 0.35);
        img.setVisible(true).setPosition(sx + px * side * v.W * 0.7, sy + py * side * v.W * 0.7).setRotation(f + ang).setScale(reach / ZOMBIE_RES, 1 / ZOMBIE_RES);
      }
      this.tint(v, flash);
      return;
    }

    v.lying.setVisible(false);
    // ---------------------------------------------------------------- de pé
    const speed = Math.hypot(z.vx, z.vy);
    const moving = speed > 6;
    const frame = moving ? Math.floor((((z.stride % 1) + 1) % 1) * LEG_FRAMES) % LEG_FRAMES : 0;
    v.legs.setVisible(true).setFrame(`legs${frame}`).setPosition(bx, by).setRotation(f);
    // Balanço: mancando pende para o lado ruim no ritmo do passo.
    const limp = isLimping(z);
    const l = legs(z);
    const side = l.left < l.right ? -1 : 1;
    const step = Math.sin(z.stride * Math.PI * 2);
    const sway = Math.sin(z.anim.sway * 1.7 + z.seed) * 0.05 + (moving ? step * 0.06 : 0) + (limp ? side * Math.abs(step) * 0.12 : 0);
    const lean = s === 'CHASE' ? 2.5 : s === 'ATTACK' ? 3.5 : s === 'BITE' ? 5 : s === 'STAGGER' ? -3 : 0;
    const tx = bx + cos * lean * 0.4;
    const ty = by + sin * lean * 0.4;
    v.torso.setVisible(true).setPosition(tx, ty).setRotation(f + sway);
    // Cabeça: pende e balança; na mordida avança; cambaleando, joga para trás.
    const bite = s === 'BITE' ? Math.min(1, m.t / Math.max(0.1, m.grab?.biteAt ?? 0.4)) : 0;
    const headFwd = 2.2 + lean * 0.6 + bite * 5;
    const loll = Math.sin(z.anim.sway * 1.1 + z.seed * 3) * 1.6 + (limp ? side * 1.5 : 0);
    const alive = z.parts.cabeca > 0 && z.parts.pescoco > 0;
    v.head.setVisible(alive).setPosition(tx + cos * headFwd + px * loll, ty + sin * headFwd + py * loll).setRotation(f + sway * 1.6 + loll * 0.05);

    // ---------------------------------------------------------------- braços
    const reachUp = z.anim.arms;
    let ang = 2.4 - 2.25 * reachUp; // caídos (≈ para trás, encurtados) → para a frente
    let len = 0.42 + 0.58 * reachUp;
    let alt = 0; // assimetria (um vai, outro vem)
    const a = m.attack;
    if (s === 'ATTACK' && a) {
      const k = Math.min(1, a.t / Math.max(0.05, a.windup));
      if (a.kind === 'push') {
        ang = 0.15;
        len = 0.55 + 0.1 * k;
      } else if (a.kind === 'grab' || a.kind === 'lunge') {
        ang = 0.55 - 0.45 * k;
        len = 0.75 + 0.4 * k;
      } else if (a.kind === 'bite' || a.kind === 'ankle') {
        ang = 0.4;
        len = 0.8;
      } else {
        // Unhada: puxa um braço para trás e solta.
        ang = 0.5;
        len = 0.9;
        alt = -0.9 * k;
      }
    } else if (s === 'GRAB' || s === 'BITE') {
      ang = -0.18;
      len = 0.85;
    } else if (m.bang) {
      // Socando a porta/janela: braços alternando.
      const beat = Math.max(0, 1 - (now - z.anim.hitAt) / 0.35);
      ang = 0.12;
      len = 0.85;
      alt = beat * 0.35;
    } else if (s === 'STAGGER') {
      ang = 1.3 + Math.sin(now * 18) * 0.4;
      len = 0.7;
    } else if (moving) {
      alt = step * (0.15 + 0.2 * (1 - reachUp));
    }
    // Arrancado após o golpe na porta: impulso de todos os braços.
    for (const [img, sd] of [[v.armL, -1], [v.armR, 1]] as const) {
      const partAlive = z.parts[sd < 0 ? 'bracoE' : 'bracoD'] > 0;
      if (!partAlive) {
        img.setVisible(false);
        continue;
      }
      const swing = alt * sd;
      const ext = len + (alt !== 0 && s === 'ATTACK' ? (sd > 0 ? -alt * 0.35 : alt * 0.2) : 0);
      const shx = tx + px * sd * v.W * 0.8 - cos * 1;
      const shy = ty + py * sd * v.W * 0.8 - sin * 1;
      img.setVisible(true).setPosition(shx, shy).setRotation(f + sd * ang + swing + sway).setScale(Math.max(0.25, ext) / ZOMBIE_RES, 1 / ZOMBIE_RES);
    }
    // Pulando a janela: um pouco mais alto (perto da câmera).
    const up = m.climb ? 1 + 0.12 * Math.sin(Math.min(1, m.climb.t / m.climb.dur) * Math.PI) : 1;
    if (up !== 1) for (const img of [v.torso, v.head, v.armL, v.armR]) img.setScale(img.scaleX * up, img.scaleY * up);
    this.tint(v, flash);
  }

  private tint(v: View, flash: boolean): void {
    for (const img of [v.lying, v.legs, v.armL, v.armR, v.torso, v.head]) {
      if (flash) img.setTint(0xffc0b0);
      else if (img.isTinted) img.clearTint();
    }
  }

  // ---------------------------------------------------------------- mortos

  private makeCorpse(z: Zombie): CorpseView {
    const key = `corpo:${z.id}`;
    const cached = this.corpseTex.get(z.id);
    if (!cached || cached.ver !== z.anim.ver || !this.scene.textures.exists(key)) {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      const tex = this.scene.textures.createCanvas(key, CORPSE_SIZE.w, CORPSE_SIZE.h)!;
      drawCorpse(z, tex.getCanvas());
      tex.refresh();
      this.corpseTex.set(z.id, { used: this.frameNo, ver: z.anim.ver });
    } else cached.used = this.frameNo;
    const blood = this.bloodKeys[Math.abs(z.seed) % this.bloodKeys.length]!;
    const pool = this.scene.add.image(z.x, z.y, blood).setDepth(DEPTH.decal + 1.5).setRotation(z.seed % 6);
    const img = this.scene.add.image(z.x, z.y, key).setDepth(DEPTH.decal + 2).setScale(1 / ZOMBIE_RES).setRotation(z.corpseAngle ?? 0);
    const c: CorpseView = { z, img, pool, seen: this.frameNo };
    this.corpses.set(z.id, c);
    return c;
  }

  private drawCorpse(c: CorpseView, now: number): void {
    const z = c.z;
    const cached = this.corpseTex.get(z.id);
    if (cached) cached.used = this.frameNo;
    const a = z.corpseAngle ?? 0;
    c.img.setPosition(z.x, z.y).setRotation(a);
    // Poça cresce nos primeiros segundos; corpo velho: mancha seca menor.
    const age = z.oldCorpse || (z.deadAt ?? 0) < 0 ? 99 : now - (z.deadAt ?? now);
    const grow = Math.min(1, 0.25 + age / 25);
    const size = (z.oldCorpse ? 0.7 : 1) * (0.7 + z.look.blood * 0.6) * grow;
    c.pool.setPosition(z.x + Math.cos(a) * 20, z.y + Math.sin(a) * 20).setScale(size * 1.1).setAlpha(z.oldCorpse ? 0.55 : 0.85);
  }

  private destroy(): void {
    for (const v of [...this.views.values(), ...this.spare]) for (const img of [v.shadow, v.lying, v.legs, v.armL, v.armR, v.torso, v.head]) img.destroy();
    for (const c of this.corpses.values()) {
      c.img.destroy();
      c.pool.destroy();
    }
    for (const s of this.sheets.values()) this.scene.textures.remove(s.key);
    for (const id of this.corpseTex.keys()) this.scene.textures.remove(`corpo:${id}`);
    this.views.clear();
    this.sheets.clear();
    this.corpses.clear();
    this.corpseTex.clear();
  }
}
