import * as THREE from 'three';
import { damp, clamp, lerp } from '../utils/math.js';

/**
 * CÂMERA CINEMATOGRÁFICA.
 *
 * Percurso: duas curvas Catmull-Rom (posição e alvo) atravessando o salão.
 * O scroll move a câmera ao longo delas — a página não "pula de seção em
 * seção", ela ATRAVESSA o espaço.
 *
 * O mouse acrescenta um desvio pequeno de yaw/pitch, sempre com lerp pesado:
 * a câmera parece ter massa e nunca gruda no cursor.
 */

const ROTA = [
  // t,   posição,               alvo
  [0.0, [0.0, 0.8, 15.5], [0.0, 0.6, -7.0]],
  [0.09, [0.6, 1.0, 8.0], [0.2, 0.7, -12.0]],
  [0.2, [1.6, 1.5, -2.0], [0.4, 0.9, -22.0]],
  [0.32, [-2.0, 0.4, -18.0], [-0.8, 0.3, -38.0]],
  [0.44, [1.8, -0.5, -38.0], [0.8, -0.3, -58.0]],
  [0.57, [-1.4, -3.0, -58.0], [-0.5, -2.2, -78.0]],
  [0.68, [1.2, -1.4, -80.0], [0.6, -1.1, -99.0]],
  [0.8, [-1.0, 0.5, -102.0], [-0.4, 0.6, -121.0]],
  [0.9, [0.8, 1.2, -118.0], [0.3, 0.9, -137.0]],
  [1.0, [0.0, 0.7, -132.0], [0.0, 0.7, -152.0]],
];

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.curvaPos = new THREE.CatmullRomCurve3(ROTA.map((r) => new THREE.Vector3(...r[1])), false, 'catmullrom', 0.3);
    this.curvaAlvo = new THREE.CatmullRomCurve3(ROTA.map((r) => new THREE.Vector3(...r[2])), false, 'catmullrom', 0.3);
    this.progresso = 0;
    this.progressoSuave = 0;
    this.mouse = new THREE.Vector2();
    this.mouseSuave = new THREE.Vector2();
    this.intro = 0; // 1 = totalmente na abertura
    this.fovBase = camera.fov;
    this.fovExtra = 0;
    this.balanco = 0;
    this._pos = new THREE.Vector3();
    this._alvo = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this.rolagem = 0;
    this.tremor = 0;
  }

  definirProgresso(t) {
    this.progresso = clamp(t, 0, 1);
  }

  /** Empurrão pontual da câmera (clique no CTA, quebra de tempo). */
  impulso({ fov = -6, tremor = 0.5 } = {}) {
    this.fovExtra += fov;
    this.tremor = Math.min(1, this.tremor + tremor);
  }

  atualizar(dt, estado) {
    // o progresso também é suavizado: o scroll nunca chega "seco" na câmera
    this.progressoSuave = damp(this.progressoSuave, this.progresso, 0.0001, dt);
    this.mouseSuave.x = damp(this.mouseSuave.x, this.mouse.x, 0.0012, dt);
    this.mouseSuave.y = damp(this.mouseSuave.y, this.mouse.y, 0.0012, dt);

    const t = clamp(this.progressoSuave, 0, 1);
    this.curvaPos.getPointAt(t, this._pos);
    this.curvaAlvo.getPointAt(t, this._alvo);

    // abertura: a câmera nasce longe e atravessa os cacos até o hero
    if (this.intro > 0.0005) {
      const k = this.intro * this.intro;
      this._pos.z += k * 26;
      this._pos.y += k * 3.2;
      this._pos.x += Math.sin(this.intro * 3.1) * k * 5.5;
    }

    // respiração lenta + balanço: nada fica perfeitamente parado
    this.balanco += dt * 0.35;
    this._pos.x += Math.sin(this.balanco * 0.7) * 0.22;
    this._pos.y += Math.cos(this.balanco * 0.53) * 0.16;

    // tremor de impacto
    if (this.tremor > 0.001) {
      this.tremor = Math.max(0, this.tremor - dt * 1.6);
      const a = this.tremor * this.tremor * 0.22;
      this._pos.x += (Math.random() - 0.5) * a;
      this._pos.y += (Math.random() - 0.5) * a;
    }

    this.camera.position.copy(this._pos);

    // alvo desviado pelo mouse — discreto, com peso
    const desvio = estado.reduzirMovimento ? 0.25 : 1;
    this._alvo.x += this.mouseSuave.x * 3.4 * desvio;
    this._alvo.y += this.mouseSuave.y * 2.0 * desvio;

    this._m.lookAt(this.camera.position, this._alvo, this._up);
    this._q.setFromRotationMatrix(this._m);
    this.camera.quaternion.slerp(this._q, 1 - Math.pow(0.0006, dt));

    // rolagem sutil na direção do movimento do mouse
    this.rolagem = damp(this.rolagem, this.mouseSuave.x * -0.035 * desvio, 0.002, dt);
    this.camera.rotateZ(this.rolagem);

    // FOV: respira devagar e reage aos impulsos
    this.fovExtra = damp(this.fovExtra, 0, 0.004, dt);
    const fovAlvo = this.fovBase + this.fovExtra + Math.sin(this.balanco * 0.31) * 0.6 + this.intro * 14;
    if (Math.abs(this.camera.fov - fovAlvo) > 0.01) {
      this.camera.fov = damp(this.camera.fov, fovAlvo, 0.002, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  /** Distância de foco para a profundidade de campo. */
  get distanciaFoco() {
    return lerp(9, 16, Math.abs(Math.sin(this.balanco * 0.2)));
  }
}
