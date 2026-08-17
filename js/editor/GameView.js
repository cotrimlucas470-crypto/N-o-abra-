/**
 * Game View — o que a câmera principal enxerga quando a cena está executando.
 *
 * Também cuida do input do jogo: joystick virtual, botões de ação e hit-test da UI
 * (Button/Slider/Toggle/Input Field respondem ao toque de verdade).
 */
export class GameView {
  constructor({ canvas, renderer, app, controlsEl, emptyEl }) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.app = app;
    this.controlsEl = controlsEl;
    this.emptyEl = emptyEl;
    this.view = { x: 0, y: 0, ppu: 48 };
    this.dirty = true;
    this.showControls = false;
    this._stickPointer = null;

    canvas.addEventListener('pointerdown', (e) => this._onPointer(e, 'down'));
    canvas.addEventListener('pointermove', (e) => this._onPointer(e, 'move'));
    canvas.addEventListener('pointerup', (e) => this._onPointer(e, 'up'));
    canvas.addEventListener('pointercancel', (e) => this._onPointer(e, 'up'));

    this._setupTouchControls();
  }

  markDirty() { this.dirty = true; }

  resize() {
    if (this.renderer.resize(window.devicePixelRatio || 1)) this.markDirty();
  }

  setControlsVisible(v) {
    this.showControls = v;
    this.controlsEl.hidden = !v;
  }

  /* ------------------------------ câmera ------------------------------ */

  updateView() {
    const scene = this.app.engine.scene;
    if (!scene) return;
    const cam = scene.mainCamera;
    const H = Math.max(1, this.renderer.cssHeight);
    const W = Math.max(1, this.renderer.cssWidth);
    if (!cam) { this.view.ppu = 48; return; }
    const p = cam.transform.getWorldPosition();
    this.view.x = p.x;
    this.view.y = p.y;
    let ppu = H / (2 * cam.orthographicSize);
    if (cam.zoomToFit && W < H) {
      // em portrait, garante que a largura visível não fique estreita demais
      ppu = Math.min(ppu, W / (2 * cam.orthographicSize * 0.75));
    }
    this.view.ppu = ppu;
  }

  render(force = false) {
    const playing = this.app.engine.state !== 'stopped';
    if (!this.dirty && !force && !playing) return false;
    this.dirty = false;
    this.updateView();
    const scene = this.app.engine.scene;
    const cam = scene && scene.mainCamera;
    this.renderer.render(scene, this.view, {
      grid: false,
      gizmos: false,
      ui: true,
      background: cam ? cam.backgroundColor : '#000000',
    });
    if (this.emptyEl) this.emptyEl.hidden = playing || !scene;
    return true;
  }

  /* ------------------------------ input ------------------------------ */

  _onPointer(e, phase) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const input = this.app.engine.input;

    if (phase === 'down') this.canvas.setPointerCapture(e.pointerId);
    input.setPointer(x, y, phase !== 'up');

    const world = this.renderer.screenToWorld(x, y, this.view);
    input.pointer.worldX = world.x;
    input.pointer.worldY = world.y;

    /* UI: percorre de cima para baixo */
    const hits = this.renderer.uiHitList;
    for (let i = hits.length - 1; i >= 0; i--) {
      const ui = hits[i];
      if (!ui.interactable || !ui.contains(x, y)) continue;

      if (phase === 'down') {
        ui._pressed = true;
        if (ui.kind === 'toggle') ui.setValue(ui.value >= 0.5 ? 0 : 1);
        if (ui.kind === 'input') this._editInputField(ui);
      }
      if (ui.kind === 'slider' && (phase === 'down' || phase === 'move') && ui._pressed) {
        const r = ui._rect;
        const t = Math.max(0, Math.min(1, (x - r.x - 8) / Math.max(1, r.w - 16)));
        ui.setValue(ui.min + t * (ui.max - ui.min));
      }
      if (phase === 'up') {
        if (ui._pressed && ui.kind === 'button') {
          if (typeof ui.onClick === 'function') { try { ui.onClick(); } catch (err) { this.app.logger.error(String(err)); } }
          this.app.engine._invokeOn(ui.gameObject, 'onClick', ui);
        }
        ui._pressed = false;
      }
      this.markDirty();
      break;
    }
    if (phase === 'up') for (const ui of hits) ui._pressed = false;

    /* no editor (parado), tocar na Game View seleciona o objeto */
    if (phase === 'down' && this.app.engine.state === 'stopped') {
      const hit = this.app.sceneView.hitTest(world.x, world.y);
      if (hit) this.app.select(hit.id, { additive: false });
    }
    this.markDirty();
  }

  async _editInputField(ui) {
    const { promptDialog } = await import('./ui/Modal.js');
    const v = await promptDialog('Digite o valor:', ui.text || '');
    if (v !== null) { ui.text = v; this.markDirty(); }
  }

  _setupTouchControls() {
    const input = this.app.engine.input;
    const stick = this.controlsEl.querySelector('#touch-stick');
    const knob = stick.querySelector('i');

    const updateStick = (e) => {
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2);
      let dy = -(e.clientY - cy) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      input.stick.x = dx;
      input.stick.y = dy;
      knob.style.transform = `translate(${dx * r.width * 0.28}px, ${-dy * r.height * 0.28}px)`;
    };

    stick.addEventListener('pointerdown', (e) => {
      this._stickPointer = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      updateStick(e);
    });
    stick.addEventListener('pointermove', (e) => { if (this._stickPointer === e.pointerId) updateStick(e); });
    const release = (e) => {
      if (this._stickPointer !== e.pointerId) return;
      this._stickPointer = null;
      input.stick.x = input.stick.y = 0;
      knob.style.transform = 'translate(0,0)';
    };
    stick.addEventListener('pointerup', release);
    stick.addEventListener('pointercancel', release);

    for (const btn of this.controlsEl.querySelectorAll('.gbtn')) {
      const name = btn.dataset.btn;
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); input.setButton(name, true); });
      btn.addEventListener('pointerup', () => input.setButton(name, false));
      btn.addEventListener('pointercancel', () => input.setButton(name, false));
      btn.addEventListener('pointerleave', () => input.setButton(name, false));
    }
  }
}
