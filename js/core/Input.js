/**
 * Input — teclado, ponteiro e controles touch.
 *
 * Usa Pointer Events (um único conjunto de listeners, sem duplicar mouse+touch)
 * e mantém estados "down/up" que são limpos no fim de cada frame.
 */
export class InputService {
  constructor() {
    this.keys = new Set();
    this.keysDown = new Set();
    this.keysUp = new Set();
    this.buttons = new Set();       // 'Jump', 'Action', 'Fire'
    this.buttonsDown = new Set();
    this.buttonsUp = new Set();
    this.stick = { x: 0, y: 0 };    // joystick virtual (-1..1)
    this.pointer = { x: 0, y: 0, worldX: 0, worldY: 0, pressed: false, down: false, up: false };
    this.touchCount = 0;
    this.enabled = true;
    this._attached = false;
    this._onKeyDown = null;
    this._onKeyUp = null;
  }

  attachKeyboard(target = window) {
    if (this._attached) return;
    this._onKeyDown = (e) => {
      if (!this.enabled) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      const k = normalize(e.key);
      if (!this.keys.has(k)) this.keysDown.add(k);
      this.keys.add(k);
      if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
    };
    this._onKeyUp = (e) => {
      const k = normalize(e.key);
      this.keys.delete(k);
      this.keysUp.add(k);
    };
    target.addEventListener('keydown', this._onKeyDown, { passive: false });
    target.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', () => this.clearHeld());
    this._attached = true;
  }

  clearHeld() {
    this.keys.clear();
    this.buttons.clear();
    this.stick.x = this.stick.y = 0;
    this.pointer.pressed = false;
  }

  /* ---------- API para scripts ---------- */
  getKey(k) { return this.keys.has(normalize(k)); }
  getKeyDown(k) { return this.keysDown.has(normalize(k)); }
  getKeyUp(k) { return this.keysUp.has(normalize(k)); }
  getButton(b) { return this.buttons.has(b); }
  getButtonDown(b) { return this.buttonsDown.has(b); }
  getButtonUp(b) { return this.buttonsUp.has(b); }

  /** Eixos combinando teclado (WASD/setas) e joystick virtual. */
  getAxis(axis) {
    if (axis === 'Horizontal') {
      let v = this.stick.x;
      if (this.getKey('a') || this.getKey('arrowleft')) v -= 1;
      if (this.getKey('d') || this.getKey('arrowright')) v += 1;
      return clamp1(v);
    }
    if (axis === 'Vertical') {
      let v = this.stick.y;
      if (this.getKey('s') || this.getKey('arrowdown')) v -= 1;
      if (this.getKey('w') || this.getKey('arrowup')) v += 1;
      return clamp1(v);
    }
    return 0;
  }

  get jump() { return this.getButton('Jump') || this.getKey(' ') || this.getKey('arrowup') || this.getKey('w'); }
  get jumpDown() { return this.getButtonDown('Jump') || this.getKeyDown(' ') || this.getKeyDown('w') || this.getKeyDown('arrowup'); }

  /* ---------- controle de frame ---------- */
  setButton(name, pressed) {
    if (pressed) {
      if (!this.buttons.has(name)) this.buttonsDown.add(name);
      this.buttons.add(name);
    } else if (this.buttons.has(name)) {
      this.buttons.delete(name);
      this.buttonsUp.add(name);
    }
  }

  setPointer(x, y, pressed) {
    const p = this.pointer;
    if (pressed && !p.pressed) p.down = true;
    if (!pressed && p.pressed) p.up = true;
    p.x = x; p.y = y; p.pressed = pressed;
  }

  endFrame() {
    this.keysDown.clear();
    this.keysUp.clear();
    this.buttonsDown.clear();
    this.buttonsUp.clear();
    this.pointer.down = false;
    this.pointer.up = false;
  }
}

function normalize(k) { return String(k).length === 1 ? k.toLowerCase() : String(k).toLowerCase(); }
function clamp1(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }
