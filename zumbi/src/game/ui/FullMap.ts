/**
 * MAPA COMPLETO (tela cheia): arrastar para mover, pinça ou +/− para zoom,
 * CENTRO volta ao jogador. Tocar num ponto escolhe: DEFINIR COMO MORADIA
 * (qualquer lugar já explorado; num prédio, vale o prédio), NOVO MARCADOR
 * (nome + categoria) ou, num marcador, GUIAR/EDITAR/REMOVER. A lista ao lado
 * mostra moradia e marcadores com a distância. Com o mapa anotado (item),
 * os comércios aparecem com nome.
 */
import Phaser from 'phaser';
import { MAP_TUNING as T } from '../config/MapTuning';
import type { GameServices } from '../core/Services';
import type { MapData } from '../world/MapTypes';
import { compass, MARK_CATS, meters, metersLabel, type MarkCat } from '../world/PlayerMarks';
import { BUILDING_LABEL } from '../world/render/MapImage';
import { drawMarkIcon, mapTextures } from './mapShared';
import { openPrompt } from './TextPrompt';
import { UiButton } from './UiButton';
import { UI, textStyle } from './theme';

type Pick = { kind: 'point'; x: number; y: number } | { kind: 'home' } | { kind: 'mark'; id: number };

const POI_KINDS = new Set(['pharmacy', 'store', 'garage', 'restaurant', 'clothing', 'warehouse']);

export class FullMap {
  private readonly root: Phaser.GameObjects.Container;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly img: Phaser.GameObjects.Image;
  private readonly fog: Phaser.GameObjects.Image;
  private readonly over: Phaser.GameObjects.Graphics;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly head: Phaser.GameObjects.Text;
  private readonly info: Phaser.GameObjects.Text;
  private readonly close: Phaser.GameObjects.Text;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly listTexts: Phaser.GameObjects.Text[] = [];
  private readonly listZones: Phaser.GameObjects.Zone[] = [];
  private readonly zoomIn: UiButton;
  private readonly zoomOut: UiButton;
  private readonly center: UiButton;
  private readonly acts: UiButton[] = [];
  private actRuns: (() => void)[] = [];
  private map: MapData | null = null;
  private annotated = false;
  private pick: Pick | null = null;
  private w = 0;
  private h = 0;
  private k = 1;
  private zoom = 1;
  private ox = 0;
  private oy = 0;
  private area = { x: 0, y: 0, w: 0, h: 0 };
  private list = { x: 0, y: 0, w: 0, h: 0 };
  private readonly touches = new Map<number, { x: number; y: number }>();
  private drag: { moved: boolean; x: number; y: number; dist: number } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly s: GameServices,
    private readonly dpr: number,
    private readonly setKeyboard: (on: boolean) => void,
  ) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, 0x06070a, 0.92).setOrigin(0, 0).setInteractive();
    this.img = scene.add.image(0, 0, '__MISSING').setOrigin(0, 0);
    this.fog = scene.add.image(0, 0, '__MISSING').setOrigin(0, 0);
    this.over = scene.add.graphics();
    this.panel = scene.add.graphics();
    this.head = scene.add.text(0, 0, 'MAPA', textStyle(15, UI.text, '800')).setResolution(dpr).setLetterSpacing(1);
    this.info = scene.add.text(0, 0, '', textStyle(11, UI.textDim, '600')).setResolution(dpr);
    this.close = scene.add.text(0, 0, '✕', textStyle(22, UI.text, '700')).setOrigin(0.5).setResolution(dpr).setInteractive({ useHandCursor: true });
    this.close.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.hide());
    const items: Phaser.GameObjects.GameObject[] = [this.dim, this.panel, this.img, this.fog, this.over, this.head, this.info, this.close];
    for (let i = 0; i < 40; i++) {
      const t = scene.add.text(0, 0, '', textStyle(10, '#f2efe6', '800')).setOrigin(0.5).setResolution(dpr).setVisible(false);
      t.setShadow(0, 1, '#000', 3, false, true);
      this.labels.push(t);
      items.push(t);
    }
    for (let i = 0; i < 9; i++) {
      const t = scene.add.text(0, 0, '', textStyle(11, UI.text, '700')).setResolution(dpr).setVisible(false);
      const z = scene.add.zone(0, 0, 10, 10).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      z.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.tapList(i));
      this.listTexts.push(t);
      this.listZones.push(z);
      items.push(t, z);
    }
    this.zoomIn = new UiButton(scene, '+', 44, 44, () => this.zoomBy(1.6), false, dpr);
    this.zoomOut = new UiButton(scene, '−', 44, 44, () => this.zoomBy(1 / 1.6), false, dpr);
    this.center = new UiButton(scene, 'CENTRO', 96, 44, () => this.centerOnPlayer(), false, dpr);
    items.push(this.zoomIn, this.zoomOut, this.center);
    for (let i = 0; i < 4; i++) {
      const b = new UiButton(scene, '', 190, 44, () => this.actRuns[i]?.(), i === 0, dpr);
      this.acts.push(b);
      items.push(b);
    }
    this.root = scene.add.container(0, 0, items).setDepth(170).setVisible(false);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => this.down(p, over));
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.move(p));
    scene.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => this.up(p));
    scene.input.on(Phaser.Input.Events.POINTER_WHEEL, (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.isOpen) this.zoomAt(p.x / this.dpr, p.y / this.dpr, dy > 0 ? 1 / 1.2 : 1.2);
    });
  }

  get isOpen(): boolean {
    return this.root.visible;
  }

  show(annotated: boolean, w: number, h: number, k: number): void {
    const map = this.s.session.map;
    const marks = this.s.session.marks;
    if (!map || !marks) return;
    this.map = map;
    this.annotated = annotated || this.annotated;
    const tex = mapTextures(this.scene, map, marks);
    this.img.setTexture(tex.map);
    this.fog.setTexture(tex.fog);
    this.root.setVisible(true);
    this.pick = null;
    this.layout(w, h, k);
    this.centerOnPlayer(true);
  }

  hide(): void {
    this.root.setVisible(false);
    this.touches.clear();
    this.drag = null;
  }

  layout(w: number, h: number, k: number): void {
    this.w = w;
    this.h = h;
    this.k = k;
    if (!this.isOpen) return;
    this.dim.setSize(w, h);
    const landscape = w > h;
    // Em pé, a linha de informação vai embaixo do título (não passa por baixo do ✕).
    const top = (landscape ? 40 : 56) * k;
    const listW = landscape ? Math.min(230 * k, w * 0.3) : 0;
    const listH = landscape ? 0 : Math.min(150 * k, h * 0.2);
    const bottom = 56 * k;
    this.area = { x: 8, y: top, w: w - 16 - listW - (listW ? 8 : 0), h: h - top - bottom - listH - (listH ? 8 : 0) };
    this.list = landscape ? { x: w - 8 - listW, y: top, w: listW, h: h - top - bottom } : { x: 8, y: this.area.y + this.area.h + 8, w: w - 16, h: listH };
    this.head.setPosition(14 * k, 10 * k).setScale(k);
    this.info.setPosition(landscape ? 90 * k : 14 * k, landscape ? 14 * k : 34 * k).setScale(k).setWordWrapWidth((w - (landscape ? 150 : 30) * k) / k);
    this.close.setPosition(w - 24 * k, 20 * k).setScale(k);
    const a = this.area;
    this.zoomIn.setPosition(a.x + a.w - 28 * k, a.y + 28 * k).setScale(k);
    this.zoomOut.setPosition(a.x + a.w - 28 * k, a.y + 78 * k).setScale(k);
    this.center.setPosition(a.x + a.w - 54 * k, a.y + 128 * k).setScale(k);
    this.clampView();
    this.redraw();
  }

  update(): void {
    if (!this.isOpen) return;
    this.redraw();
  }

  // ---------------------------------------------------------------- vista

  private get scale(): number {
    return this.zoom;
  }

  private fitZoom(): number {
    const map = this.map!;
    const iw = map.widthTiles * T.imagePxPerTile;
    const ih = (map.cityHeightTiles ?? map.heightTiles) * T.imagePxPerTile;
    return Math.min(this.area.w / iw, this.area.h / ih);
  }

  private clampView(): void {
    if (!this.map) return;
    const fit = this.fitZoom();
    this.zoom = Math.max(fit, Math.min(fit * 14, this.zoom));
    const iw = this.map.widthTiles * T.imagePxPerTile * this.zoom;
    const ih = (this.map.cityHeightTiles ?? this.map.heightTiles) * T.imagePxPerTile * this.zoom;
    const a = this.area;
    this.ox = iw <= a.w ? a.x + (a.w - iw) / 2 : Math.min(a.x, Math.max(a.x + a.w - iw, this.ox));
    this.oy = ih <= a.h ? a.y + (a.h - ih) / 2 : Math.min(a.y, Math.max(a.y + a.h - ih, this.oy));
  }

  private toScreen(wx: number, wy: number): { x: number; y: number } {
    const f = (T.imagePxPerTile / this.map!.tileSize) * this.scale;
    return { x: this.ox + wx * f, y: this.oy + wy * f };
  }

  private toWorld(sx: number, sy: number): { x: number; y: number } {
    const f = (T.imagePxPerTile / this.map!.tileSize) * this.scale;
    return { x: (sx - this.ox) / f, y: (sy - this.oy) / f };
  }

  private zoomAt(sx: number, sy: number, by: number): void {
    if (!this.map) return;
    const w = this.toWorld(sx, sy);
    this.zoom *= by;
    this.clampView();
    const p = this.toScreen(w.x, w.y);
    this.ox += sx - p.x;
    this.oy += sy - p.y;
    this.clampView();
    this.redraw();
  }

  private zoomBy(by: number): void {
    const a = this.area;
    this.zoomAt(a.x + a.w / 2, a.y + a.h / 2, by);
  }

  private centerOnPlayer(reset = false): void {
    const pl = this.s.session.player;
    if (!this.map || !pl) return;
    if (reset) this.zoom = this.fitZoom() * 4;
    this.clampView();
    const p = this.toScreen(pl.x, pl.y);
    const a = this.area;
    this.ox += a.x + a.w / 2 - p.x;
    this.oy += a.y + a.h / 2 - p.y;
    this.clampView();
    this.redraw();
  }

  // ---------------------------------------------------------------- toque

  private inArea(x: number, y: number): boolean {
    const a = this.area;
    return x >= a.x && y >= a.y && x <= a.x + a.w && y <= a.y + a.h;
  }

  private down(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (!this.isOpen) return;
    const x = p.x / this.dpr;
    const y = p.y / this.dpr;
    if (over[0] !== this.dim || !this.inArea(x, y)) return;
    this.touches.set(p.id, { x, y });
    if (this.touches.size === 1) this.drag = { moved: false, x, y, dist: 0 };
    else if (this.touches.size === 2) {
      const [a, b] = [...this.touches.values()];
      this.drag = { moved: true, x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2, dist: Math.hypot(a!.x - b!.x, a!.y - b!.y) };
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!this.isOpen || !this.touches.has(p.id) || !this.drag) return;
    const x = p.x / this.dpr;
    const y = p.y / this.dpr;
    this.touches.set(p.id, { x, y });
    const d = this.drag;
    if (this.touches.size >= 2) {
      const [a, b] = [...this.touches.values()];
      const mx = (a!.x + b!.x) / 2;
      const my = (a!.y + b!.y) / 2;
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      this.ox += mx - d.x;
      this.oy += my - d.y;
      if (d.dist > 10) this.zoomAt(mx, my, dist / d.dist);
      this.drag = { moved: true, x: mx, y: my, dist };
    } else {
      if (!d.moved && Math.hypot(x - d.x, y - d.y) < 8) return;
      this.ox += x - d.x;
      this.oy += y - d.y;
      this.drag = { moved: true, x, y, dist: 0 };
    }
    this.clampView();
    this.redraw();
  }

  private up(p: Phaser.Input.Pointer): void {
    if (!this.isOpen || !this.touches.has(p.id)) return;
    const x = p.x / this.dpr;
    const y = p.y / this.dpr;
    const tap = this.touches.size === 1 && this.drag && !this.drag.moved;
    this.touches.delete(p.id);
    if (this.touches.size === 0) this.drag = null;
    if (tap) this.select(this.toWorld(x, y));
  }

  private select(w: { x: number; y: number }): void {
    const marks = this.s.session.marks;
    if (!marks || !this.map) return;
    const f = (T.imagePxPerTile / this.map.tileSize) * this.scale;
    const near = marks.near(w.x, w.y, Math.max(T.pickRadius * 0.25, 14 / f));
    this.pick = near ? (near.kind === 'home' ? { kind: 'home' } : { kind: 'mark', id: near.mark.id }) : { kind: 'point', x: w.x, y: w.y };
    this.redraw();
  }

  private tapList(i: number): void {
    const marks = this.s.session.marks;
    if (!marks) return;
    const entries = this.entries();
    const e = entries[i];
    if (!e) return;
    this.pick = e.id === 0 ? { kind: 'home' } : { kind: 'mark', id: e.id };
    marks.target = e.id;
    const p = this.toScreen(e.x, e.y);
    const a = this.area;
    this.ox += a.x + a.w / 2 - p.x;
    this.oy += a.y + a.h / 2 - p.y;
    this.clampView();
    this.redraw();
  }

  private entries(): { id: number; x: number; y: number; name: string; cat: MarkCat }[] {
    const marks = this.s.session.marks;
    const pl = this.s.session.player;
    if (!marks) return [];
    const out = [...(marks.home ? [{ id: 0, ...marks.home, cat: 'moradia' as MarkCat }] : []), ...marks.marks.map((m) => ({ id: m.id, x: m.x, y: m.y, name: m.name, cat: m.cat }))];
    if (pl) out.sort((a, b) => (a.id === 0 ? -1 : b.id === 0 ? 1 : Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y)));
    return out;
  }

  // ---------------------------------------------------------------- ações

  private actions(): { label: string; run: () => void }[] {
    const marks = this.s.session.marks;
    const map = this.map;
    const pk = this.pick;
    if (!marks || !map || !pk) return [];
    if (pk.kind === 'home') {
      return [
        { label: marks.target === 0 ? 'GUIANDO' : 'GUIAR', run: () => (marks.target = 0) },
        { label: 'MORADIA', run: () => this.s.bus.emit('ui:home', {}) },
        { label: 'EXPEDIÇÃO', run: () => this.s.bus.emit('ui:expedition', { target: 0 }) },
        { label: 'TIRAR MORADIA', run: () => (marks.clearHome(), (this.pick = null)) },
      ];
    }
    if (pk.kind === 'mark') {
      const m = marks.marks.find((x) => x.id === pk.id);
      if (!m) return [];
      return [
        { label: marks.target === m.id ? 'GUIANDO' : 'GUIAR', run: () => (marks.target = m.id) },
        { label: 'EXPEDIÇÃO', run: () => this.s.bus.emit('ui:expedition', { target: m.id }) },
        { label: 'EDITAR', run: () => void this.editMark(m.id) },
        { label: 'REMOVER', run: () => (marks.remove(m.id), (this.pick = null)) },
      ];
    }
    const explored = marks.explored(Math.floor(pk.x / map.tileSize / T.exploreCell), Math.floor(pk.y / map.tileSize / T.exploreCell));
    const out: { label: string; run: () => void }[] = [];
    if (explored) out.push({ label: marks.home ? 'MORAR AQUI' : 'DEFINIR COMO MORADIA', run: () => this.setHome(pk.x, pk.y) });
    out.push({ label: 'NOVO MARCADOR', run: () => void this.newMark(pk.x, pk.y) });
    return out;
  }

  /** Moradia num prédio vale o prédio inteiro (centro e nome do tipo). */
  private setHome(x: number, y: number): void {
    const marks = this.s.session.marks;
    const map = this.map;
    if (!marks || !map) return;
    const b = map.buildings.find((bb) => !bb.floorOf && x >= bb.bounds.x && y >= bb.bounds.y && x <= bb.bounds.x + bb.bounds.w && y <= bb.bounds.y + bb.bounds.h);
    if (b) marks.setHome(b.bounds.x + b.bounds.w / 2, b.bounds.y + b.bounds.h / 2, `Moradia · ${BUILDING_LABEL[b.kind]}`);
    else marks.setHome(x, y, 'Moradia');
    marks.target = 0;
    this.pick = { kind: 'home' };
    this.s.bus.emit('player:feedback', { text: 'Esta é a sua moradia agora.', tone: 'ok' });
  }

  private async newMark(x: number, y: number): Promise<void> {
    const marks = this.s.session.marks;
    if (!marks) return;
    const r = await openPrompt({ title: 'NOVO MARCADOR', value: '', cats: MARK_CATS, cat: 'marcador', ok: 'Criar', setKeyboard: this.setKeyboard });
    if (!r) return;
    const m = marks.add(x, y, r.name || MARK_CATS.find((c) => c.id === r.cat)?.label || 'Marcador', r.cat as MarkCat);
    this.pick = { kind: 'mark', id: m.id };
    this.redraw();
  }

  private async editMark(id: number): Promise<void> {
    const marks = this.s.session.marks;
    const m = marks?.marks.find((x) => x.id === id);
    if (!marks || !m) return;
    const r = await openPrompt({ title: 'EDITAR MARCADOR', value: m.name, cats: MARK_CATS, cat: m.cat, ok: 'Salvar', setKeyboard: this.setKeyboard });
    if (!r) return;
    marks.edit(id, { name: r.name, cat: r.cat as MarkCat });
    this.redraw();
  }

  // ---------------------------------------------------------------- desenho

  private redraw(): void {
    const map = this.map;
    const marks = this.s.session.marks;
    const pl = this.s.session.player;
    if (!map || !marks) return;
    const k = this.k;
    const tex = mapTextures(this.scene, map, marks);
    if (this.fog.texture.key !== tex.fog) this.fog.setTexture(tex.fog);
    const a = this.area;
    const z = this.scale;
    this.img.setScale(z).setPosition(this.ox, this.oy);
    const cell = T.exploreCell * T.imagePxPerTile;
    this.fog.setScale(z * cell).setPosition(this.ox, this.oy);
    // Recorte na área do mapa (nada vaza por cima da lista/botões).
    const cropX = (a.x - this.ox) / z;
    const cropY = (a.y - this.oy) / z;
    this.img.setCrop(cropX, cropY, a.w / z, a.h / z);
    this.fog.setCrop(cropX / cell, cropY / cell, a.w / (z * cell), a.h / (z * cell));
    const pg = this.panel.clear();
    const L = this.list;
    pg.fillStyle(0x0e0f12, 0.96).fillRoundedRect(L.x, L.y, L.w, L.h, 10 * k);
    const g = this.over.clear();
    g.lineStyle(1.5, 0xffffff, 0.18).strokeRoundedRect(a.x, a.y, a.w, a.h, 8 * k);
    const inside = (p: { x: number; y: number }) => p.x >= a.x && p.y >= a.y && p.x <= a.x + a.w && p.y <= a.y + a.h;
    // Rótulos: regiões (longe) ou comércios (perto, mapa anotado).
    let li = 0;
    const label = (text: string, p: { x: number; y: number }, size: number, color = '#f2efe6') => {
      if (li >= this.labels.length || !inside(p)) return;
      this.labels[li++]!.setText(text).setPosition(p.x, p.y).setScale(k * size).setColor(color).setVisible(true);
    };
    const f = (T.imagePxPerTile / map.tileSize) * z;
    if (f < 0.06) for (const r of map.regions) label(r.name, this.toScreen(r.rect.x + r.rect.w / 2, r.rect.y + r.rect.h / 2), 1);
    else if (this.annotated) {
      for (const b of map.buildings) {
        if (b.floorOf || !POI_KINDS.has(b.kind)) continue;
        label(BUILDING_LABEL[b.kind], this.toScreen(b.bounds.x + b.bounds.w / 2, b.bounds.y + b.bounds.h / 2), 0.9, '#ffe8b0');
      }
    }
    for (let i = li; i < this.labels.length; i++) this.labels[i]!.setVisible(false);
    // Marcadores e moradia
    for (const m of marks.marks) {
      const p = this.toScreen(m.x, m.y);
      if (!inside(p)) continue;
      const sel = this.pick?.kind === 'mark' && this.pick.id === m.id;
      drawMarkIcon(g, p.x, p.y, 7 * k, m.cat, MARK_CATS.find((c) => c.id === m.cat)?.color ?? 0xe0a84a, sel || marks.target === m.id);
    }
    if (marks.home) {
      const p = this.toScreen(marks.home.x, marks.home.y);
      if (inside(p)) drawMarkIcon(g, p.x, p.y, 8 * k, 'moradia', 0xf2e6c8, this.pick?.kind === 'home' || marks.target === 0);
    }
    if (this.pick?.kind === 'point') {
      const p = this.toScreen(this.pick.x, this.pick.y);
      if (inside(p)) g.lineStyle(2, 0xffffff, 0.9).strokeCircle(p.x, p.y, 8 * k).lineBetween(p.x - 12 * k, p.y, p.x + 12 * k, p.y).lineBetween(p.x, p.y - 12 * k, p.x, p.y + 12 * k);
    }
    // Jogador
    if (pl) {
      const p = this.toScreen(pl.x, pl.y);
      if (inside(p)) {
        const r = 9 * k;
        const ang = pl.facing;
        g.fillStyle(0x0b0c0f, 1).fillCircle(p.x, p.y, r);
        g.fillStyle(0x6fd0ff, 1).fillTriangle(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r, p.x + Math.cos(ang + 2.5) * r * 0.75, p.y + Math.sin(ang + 2.5) * r * 0.75, p.x + Math.cos(ang - 2.5) * r * 0.75, p.y + Math.sin(ang - 2.5) * r * 0.75);
      }
    }
    // Linha até o alvo
    const t = marks.targetPoint();
    if (t && pl) {
      const a1 = this.toScreen(pl.x, pl.y);
      const b1 = this.toScreen(t.x, t.y);
      g.lineStyle(2, 0xe0a84a, 0.55).lineBetween(a1.x, a1.y, b1.x, b1.y);
    }
    this.info.setText(`Explorado ${Math.round(marks.exploredFraction * 100)}% · toque no mapa para marcar${t && pl ? ` · ${t.name}: ${metersLabel(meters(pl.x, pl.y, t.x, t.y))} ${compass(pl.x, pl.y, t.x, t.y)}` : ''}`);
    this.drawList();
    this.drawActions();
  }

  private drawList(): void {
    const L = this.list;
    const k = this.k;
    const pl = this.s.session.player;
    const marks = this.s.session.marks;
    const entries = this.entries();
    const rowH = 30 * k;
    const g = this.over;
    const maxRows = Math.max(0, Math.floor((L.h - 10 * k) / rowH));
    this.listTexts.forEach((t, i) => {
      const e = entries[i];
      const z = this.listZones[i]!;
      if (!e || i >= maxRows) {
        t.setVisible(false);
        z.setVisible(false);
        return;
      }
      const y = L.y + 6 * k + i * rowH;
      drawMarkIcon(g, L.x + 16 * k, y + rowH / 2, 6 * k, e.cat, e.id === 0 ? 0xf2e6c8 : (MARK_CATS.find((c) => c.id === e.cat)?.color ?? 0xe0a84a), marks?.target === e.id);
      const d = pl ? metersLabel(meters(pl.x, pl.y, e.x, e.y)) : '';
      t.setText(`${e.name} · ${d}`).setPosition(L.x + 30 * k, y + rowH / 2 - 8 * k).setScale(k).setColor(marks?.target === e.id ? UI.accent : UI.text).setVisible(true);
      z.setPosition(L.x, y).setSize(L.w, rowH).setVisible(true);
      if (z.input?.hitArea instanceof Phaser.Geom.Rectangle) z.input.hitArea.setTo(0, 0, L.w, rowH);
    });
    if (!entries.length) {
      const t = this.listTexts[0]!;
      t.setText('Sem moradia nem marcadores.\nToque no mapa e escolha\nDEFINIR COMO MORADIA.').setPosition(L.x + 12 * k, L.y + 10 * k).setScale(k).setColor(UI.textDim).setVisible(L.h > 40 * k);
    }
  }

  private drawActions(): void {
    const acts = this.actions();
    this.actRuns = acts.map((x) => () => {
      x.run();
      this.redraw();
    });
    const k = this.k;
    const n = acts.length;
    const bw = Math.min(210, (this.w / k - 24) / Math.max(1, n) - 8);
    this.acts.forEach((b, i) => {
      const a = acts[i];
      if (!a) {
        b.setVisible(false);
        return;
      }
      b.setVisible(true).setLabel(a.label).setButtonSize(bw, 44);
      const total = n * bw + (n - 1) * 8;
      b.setPosition(this.w / 2 - (total * k) / 2 + (i * (bw + 8) + bw / 2) * k, this.h - 30 * k).setScale(k);
    });
  }
}
