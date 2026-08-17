import { Component, registerComponent } from '../Component.js';

/**
 * Rigidbody — corpo dinâmico 2D (massa, gravidade, velocidade, forças, sleeping).
 * A integração acontece em Physics.step(), sempre em passo fixo.
 */
export class Rigidbody extends Component {
  static type = 'Rigidbody';
  static label = 'Rigidbody';
  static icon = '⬤';
  static unique = true;
  static schema = [
    { key: 'bodyType', label: 'Body Type', type: 'select', options: ['dynamic', 'kinematic', 'static'] },
    { key: 'mass', label: 'Mass', type: 'number', min: 0.001, step: 0.1 },
    { key: 'useGravity', label: 'Use Gravity', type: 'bool' },
    { key: 'gravityScale', label: 'Gravity Scale', type: 'number', step: 0.1 },
    { key: 'drag', label: 'Linear Drag', type: 'number', min: 0, step: 0.05 },
    { key: 'freezeRotation', label: 'Freeze Rotation', type: 'bool' },
    { key: 'allowSleep', label: 'Allow Sleep', type: 'bool', hint: 'corpos parados saem da simulação' },
  ];

  constructor(data = {}) {
    super(data);
    this.bodyType = 'dynamic';
    this.mass = 1;
    this.useGravity = true;
    this.gravityScale = 1;
    this.drag = 0.01;
    this.freezeRotation = true;
    this.allowSleep = true;

    /* estado de runtime (não serializado) */
    this.velocity = { x: 0, y: 0 };
    this.angularVelocity = 0;
    this._force = { x: 0, y: 0 };
    this.sleeping = false;
    this._sleepTimer = 0;
    this.grounded = false;
  }

  get isDynamic() { return this.bodyType === 'dynamic'; }
  get invMass() { return this.bodyType === 'dynamic' ? 1 / Math.max(0.0001, this.mass) : 0; }

  /* API usada por scripts */
  addForce(x, y) { this.wake(); this._force.x += x; this._force.y += y; }
  addImpulse(x, y) { this.wake(); const im = this.invMass; this.velocity.x += x * im; this.velocity.y += y * im; }
  setVelocity(x, y) { this.wake(); this.velocity.x = x; this.velocity.y = y; }
  wake() { this.sleeping = false; this._sleepTimer = 0; }

  onDestroy() { this.velocity.x = this.velocity.y = 0; }
}
registerComponent(Rigidbody);

/**
 * Collider — caixa ou círculo. Sem Rigidbody o collider é estático (chão, paredes).
 */
export class Collider extends Component {
  static type = 'Collider';
  static label = 'Collider';
  static icon = '⬚';
  static unique = true;
  static schema = [
    { key: 'shape', label: 'Shape', type: 'select', options: ['box', 'circle'] },
    { key: 'size', label: 'Size', type: 'vec2', step: 0.1, hint: 'box: largura/altura' },
    { key: 'radius', label: 'Radius', type: 'number', step: 0.1, hint: 'circle' },
    { key: 'offset', label: 'Offset', type: 'vec2', step: 0.1 },
    { key: 'isTrigger', label: 'Is Trigger', type: 'bool' },
    { key: 'bounciness', label: 'Bounciness', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'friction', label: 'Friction', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'matchRenderer', label: 'Match Renderer', type: 'bool', hint: 'usa o tamanho do renderer' },
  ];

  constructor(data = {}) {
    super(data);
    this.shape = 'box';
    this.size = { x: 1, y: 1 };
    this.radius = 0.5;
    this.offset = { x: 0, y: 0 };
    this.isTrigger = false;
    this.bounciness = 0;
    this.friction = 0.2;
    this.matchRenderer = true;

    this._bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    this._contacts = new Set();   // colisores em contato (para enter/exit)
  }

  /** Dimensões efetivas em unidades de mundo. */
  getExtents() {
    const s = this.transform.getWorldScale();
    let w = this.size.x, h = this.size.y, r = this.radius;
    if (this.matchRenderer) {
      const sr = this.gameObject.getComponent('SpriteRenderer') || this.gameObject.getComponent('MeshRenderer');
      if (sr) {
        w = sr.size.x; h = sr.size.y;
        r = Math.max(sr.size.x, sr.size.y) / 2;
        if (sr.shape === 'circle') this.shape = this.shape === 'box' && this.matchRenderer ? 'circle' : this.shape;
      }
    }
    return {
      halfW: Math.abs(w * s.x) / 2,
      halfH: Math.abs(h * s.y) / 2,
      radius: Math.abs(r * Math.max(Math.abs(s.x), Math.abs(s.y))),
    };
  }

  updateBounds() {
    const p = this.transform.getWorldPosition();
    const e = this.getExtents();
    const cx = p.x + this.offset.x, cy = p.y + this.offset.y;
    const hw = this.shape === 'circle' ? e.radius : e.halfW;
    const hh = this.shape === 'circle' ? e.radius : e.halfH;
    const b = this._bounds;
    b.minX = cx - hw; b.maxX = cx + hw;
    b.minY = cy - hh; b.maxY = cy + hh;
    b.cx = cx; b.cy = cy; b.hw = hw; b.hh = hh;
    return b;
  }
}
registerComponent(Collider);
