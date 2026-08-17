import { Component, registerComponent } from '../Component.js';
import { vec3, DEG } from '../MathUtils.js';

/**
 * Transform 2.5D: posição/rotação/escala em X,Y,Z.
 * A engine renderiza e simula em 2D (plano XY); Z é usado para profundidade/ordenação
 * e pela projeção simplificada do MeshRenderer. (Limitação documentada no README.)
 *
 * O world transform é calculado subindo a cadeia de pais no momento do uso — sem cache —
 * porque scripts do usuário mutam `transform.position` diretamente e um cache por frame
 * ficaria desatualizado no meio do Update. Hierarquias são rasas na prática.
 */
export class Transform extends Component {
  static type = 'Transform';
  static label = 'Transform';
  static icon = '✥';
  static unique = true;
  static removable = false;
  static schema = [
    { key: 'position', label: 'Position', type: 'vec3', step: 0.1 },
    { key: 'rotation', label: 'Rotation', type: 'vec3', step: 1, hint: 'graus (apenas Z afeta o 2D)' },
    { key: 'scale', label: 'Scale', type: 'vec3', step: 0.1 },
  ];

  constructor(data = {}) {
    super(data);
    this.position = vec3(0, 0, 0);
    this.rotation = vec3(0, 0, 0);
    this.scale = vec3(1, 1, 1);
  }

  get parentTransform() {
    const p = this.gameObject && this.gameObject.parent;
    return p ? p.transform : null;
  }

  /** Posição no espaço do mundo. `out` opcional para evitar alocação em loops. */
  getWorldPosition(out = { x: 0, y: 0, z: 0 }) {
    out.x = this.position.x; out.y = this.position.y; out.z = this.position.z;
    let p = this.parentTransform;
    while (p) {
      const sx = out.x * p.scale.x, sy = out.y * p.scale.y;
      const a = p.rotation.z * DEG;
      if (a !== 0) {
        const c = Math.cos(a), s = Math.sin(a);
        out.x = p.position.x + sx * c - sy * s;
        out.y = p.position.y + sx * s + sy * c;
      } else {
        out.x = p.position.x + sx;
        out.y = p.position.y + sy;
      }
      out.z = p.position.z + out.z * (p.scale.z || 1);
      p = p.parentTransform;
    }
    return out;
  }

  getWorldRotationZ() {
    let r = this.rotation.z;
    let p = this.parentTransform;
    while (p) { r += p.rotation.z; p = p.parentTransform; }
    return r;
  }

  getWorldScale(out = { x: 1, y: 1, z: 1 }) {
    out.x = this.scale.x; out.y = this.scale.y; out.z = this.scale.z;
    let p = this.parentTransform;
    while (p) { out.x *= p.scale.x; out.y *= p.scale.y; out.z *= p.scale.z; p = p.parentTransform; }
    return out;
  }

  /** Define a posição de mundo respeitando o pai (usado ao reparentar e por scripts). */
  setWorldPosition(x, y, z) {
    const p = this.parentTransform;
    if (!p) { this.position.x = x; this.position.y = y; if (z !== undefined) this.position.z = z; return; }
    const pw = p.getWorldPosition();
    const ps = p.getWorldScale();
    const a = -p.getWorldRotationZ() * DEG;
    const dx = x - pw.x, dy = y - pw.y;
    const c = Math.cos(a), s = Math.sin(a);
    this.position.x = (dx * c - dy * s) / (ps.x || 1);
    this.position.y = (dx * s + dy * c) / (ps.y || 1);
    if (z !== undefined) this.position.z = z - pw.z;
  }

  translate(dx, dy, dz = 0) {
    this.position.x += dx; this.position.y += dy; this.position.z += dz;
  }

  rotate(dz) { this.rotation.z += dz; }

  /** Vetores de direção locais (úteis em scripts de movimento). */
  get up() { const a = this.getWorldRotationZ() * DEG; return { x: -Math.sin(a), y: Math.cos(a) }; }
  get right() { const a = this.getWorldRotationZ() * DEG; return { x: Math.cos(a), y: Math.sin(a) }; }
}

registerComponent(Transform);
