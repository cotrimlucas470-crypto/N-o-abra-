import * as THREE from 'three';
import { criarMaterialFragmento } from './shaders/fragmento.js';
import { criarFormasDeCaco } from './geometrias.js';
import { makeRandom, randRange, damp } from '../utils/math.js';

/**
 * O CAMPO DE CACOS.
 *
 * Três camadas de profundidade, cada uma com seu próprio fator de parallax
 * (0.4x / 0.7x / 1.0x), mais um punhado de cacos de vidro REAL (transmissão)
 * perto da câmera nos aparelhos que aguentam.
 *
 * Cada instância tem semente, eixo, velocidade, brilho, rugosidade e escala
 * próprios — a rotação e a deriva acontecem na GPU, então centenas de cacos
 * custam poucos draw calls.
 */

const CAMADAS = [
  { nome: 'longe', parallax: 0.4, raio: [16, 42], escala: [0.9, 2.4], vel: [0.05, 0.22], brilho: [0.05, 0.4], deriva: 0.5 },
  { nome: 'medio', parallax: 0.7, raio: [9, 21], escala: [0.45, 1.45], vel: [0.12, 0.45], brilho: [0.15, 0.7], deriva: 0.34 },
  { nome: 'perto', parallax: 1.0, raio: [2.2, 9.5], escala: [0.22, 1.15], vel: [0.2, 0.75], brilho: [0.3, 1.0], deriva: 0.22 },
];

export class Fragmentos {
  constructor({ envMap, perfil, zInicio = 22, zFim = -168 }) {
    this.envMap = envMap;
    this.zInicio = zInicio;
    this.zFim = zFim;
    this.grupo = new THREE.Group();
    this.grupo.name = 'fragmentos';
    this.camadas = [];
    this.vidros = [];
    this.materiais = [];
    this._mouse = new THREE.Vector2();
    this._mouseSuave = new THREE.Vector2();
    this.construir(perfil);
  }

  construir(perfil) {
    this.destruir();
    const rnd = makeRandom(20260915);
    const formas = criarFormasDeCaco(rnd, 7);
    this._formasBase = formas;

    for (const def of CAMADAS) {
      const total = perfil.fragmentos[def.nome] || 0;
      if (!total) continue;
      const material = criarMaterialFragmento({
        envMap: this.envMap,
        rugosidade: def.nome === 'longe' ? 0.2 : 0.09,
        metalico: 1.0,
      });
      material.userData.uniforms.uDeriva.value = def.deriva;
      material.userData.uniforms.uRimForca.value = def.nome === 'longe' ? 1.6 : 1.2;
      material.userData.uniforms.uMouseForca.value = 0.18 * def.parallax;
      this.materiais.push(material);

      const grupoCamada = new THREE.Group();
      grupoCamada.name = `camada-${def.nome}`;
      grupoCamada.userData.parallax = def.parallax;

      const porForma = Math.max(1, Math.floor(total / formas.length));
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const v = new THREE.Vector3();
      const s = new THREE.Vector3();

      for (let f = 0; f < formas.length; f++) {
        const n = f === formas.length - 1 ? total - porForma * (formas.length - 1) : porForma;
        if (n <= 0) continue;
        const geo = formas[f].clone();
        const im = new THREE.InstancedMesh(geo, material, n);
        im.frustumCulled = false;
        im.instanceMatrix.setUsage(THREE.StaticDrawUsage);

        const aSeed = new Float32Array(n);
        const aVel = new Float32Array(n);
        const aBrilho = new Float32Array(n);
        const aRug = new Float32Array(n);
        const aEscalaInv = new Float32Array(n);
        const aEixo = new Float32Array(n * 3);
        const cor = new THREE.Color();

        for (let i = 0; i < n; i++) {
          const ang = rnd() * Math.PI * 2;
          const raio = randRange(rnd, def.raio[0], def.raio[1]);
          const z = randRange(rnd, this.zFim, this.zInicio);
          // distribuição em anel: o corredor fica aberto no eixo da câmera
          v.set(Math.cos(ang) * raio, Math.sin(ang) * raio * 0.62 + randRange(rnd, -3, 4), z);
          e.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28);
          q.setFromEuler(e);
          const esc = randRange(rnd, def.escala[0], def.escala[1]);
          s.set(esc, esc * randRange(rnd, 0.7, 1.35), esc * randRange(rnd, 0.7, 1.2));
          m4.compose(v, q, s);
          im.setMatrixAt(i, m4);

          aSeed[i] = rnd();
          aVel[i] = randRange(rnd, def.vel[0], def.vel[1]);
          aBrilho[i] = randRange(rnd, def.brilho[0], def.brilho[1]);
          aRug[i] = randRange(rnd, 0.35, 2.6);
          aEscalaInv[i] = 1 / esc;
          const ex = new THREE.Vector3(randRange(rnd, -1, 1), randRange(rnd, -1, 1), randRange(rnd, -1, 1)).normalize();
          aEixo[i * 3] = ex.x;
          aEixo[i * 3 + 1] = ex.y;
          aEixo[i * 3 + 2] = ex.z;

          // tom: azul-aço com raras peças arroxeadas
          const t = rnd();
          cor.setHSL(t < 0.2 ? 0.72 : 0.56, 0.32 + rnd() * 0.3, 0.06 + rnd() * 0.1);
          im.setColorAt(i, cor);
        }

        geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
        geo.setAttribute('aVel', new THREE.InstancedBufferAttribute(aVel, 1));
        geo.setAttribute('aBrilho', new THREE.InstancedBufferAttribute(aBrilho, 1));
        geo.setAttribute('aRug', new THREE.InstancedBufferAttribute(aRug, 1));
        geo.setAttribute('aEscalaInv', new THREE.InstancedBufferAttribute(aEscalaInv, 1));
        geo.setAttribute('aEixo', new THREE.InstancedBufferAttribute(aEixo, 3));
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        grupoCamada.add(im);
      }

      this.grupo.add(grupoCamada);
      this.camadas.push({ def, grupo: grupoCamada, material });
    }

    // --- vidro real perto da câmera: poucos, caros, e valem cada pixel ---
    const nVidro = perfil.transmissao ? perfil.heroVidro : 0;
    if (nVidro > 0) {
      const matVidro = criarMaterialFragmento({
        envMap: this.envMap,
        transmissao: true,
        cor: 0x8fd8ff,
        opacidade: 0.92,
      });
      matVidro.userData.uniforms.uDeriva.value = 0.1;
      matVidro.userData.uniforms.uMouseForca.value = 0.5;
      this.materiais.push(matVidro);
      for (let i = 0; i < nVidro; i++) {
        const geo = formas[i % formas.length].clone();
        const n1 = new Float32Array([rnd()]);
        geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(n1, 1));
        geo.setAttribute('aVel', new THREE.InstancedBufferAttribute(new Float32Array([randRange(rnd, 0.08, 0.3)]), 1));
        geo.setAttribute('aBrilho', new THREE.InstancedBufferAttribute(new Float32Array([randRange(rnd, 0.4, 1)]), 1));
        geo.setAttribute('aRug', new THREE.InstancedBufferAttribute(new Float32Array([randRange(rnd, 0.3, 1.2)]), 1));
        geo.setAttribute('aEscalaInv', new THREE.InstancedBufferAttribute(new Float32Array([1]), 1));
        geo.setAttribute(
          'aEixo',
          new THREE.InstancedBufferAttribute(new Float32Array([rnd() - 0.5, 1, rnd() - 0.5]), 3)
        );
        const m = new THREE.Mesh(geo, matVidro);
        const ang = (i / nVidro) * Math.PI * 2 + rnd();
        const raio = randRange(rnd, 3.6, 8.2);
        m.position.set(Math.cos(ang) * raio, Math.sin(ang) * raio * 0.55 + randRange(rnd, -1, 2.5), randRange(rnd, -6, 7));
        m.rotation.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28);
        const esc = randRange(rnd, 0.75, 2.1);
        m.scale.setScalar(esc);
        m.userData.vel = randRange(rnd, 0.05, 0.16) * (rnd() < 0.5 ? -1 : 1);
        m.userData.base = m.position.clone();
        m.renderOrder = 2;
        this.grupo.add(m);
        this.vidros.push(m);
      }
    }
  }

  set mouse(v) {
    this._mouse.set(v.x, v.y);
  }

  atualizar(dt, tempoEscalado, estado) {
    this._mouseSuave.x = damp(this._mouseSuave.x, this._mouse.x, 0.002, dt);
    this._mouseSuave.y = damp(this._mouseSuave.y, this._mouse.y, 0.002, dt);

    for (const { def, grupo, material } of this.camadas) {
      const u = material.userData.uniforms;
      u.uTempo.value = tempoEscalado;
      u.uMouse.value.set(this._mouseSuave.x, this._mouseSuave.y);
      u.uScroll.value = estado.scroll;
      u.uOnda.value = estado.onda;
      u.uDissolve.value = estado.dissolve;
      u.uEscurecer.value = estado.escurecer;
      // parallax de camada: o grupo inteiro desliza em velocidade diferente
      const p = def.parallax;
      grupo.position.x = damp(grupo.position.x, this._mouseSuave.x * -1.9 * p, 0.0015, dt);
      grupo.position.y = damp(grupo.position.y, this._mouseSuave.y * -1.2 * p, 0.0015, dt);
      grupo.rotation.z = damp(grupo.rotation.z, this._mouseSuave.x * 0.035 * p, 0.002, dt);
    }

    for (const m of this.vidros) {
      const u = m.material.userData.uniforms;
      u.uTempo.value = tempoEscalado;
      u.uMouse.value.set(this._mouseSuave.x, this._mouseSuave.y);
      u.uOnda.value = estado.onda;
      u.uDissolve.value = estado.dissolve;
      u.uEscurecer.value = estado.escurecer;
      m.rotation.y += dt * m.userData.vel;
      m.rotation.x += dt * m.userData.vel * 0.6;
      m.position.x = damp(m.position.x, m.userData.base.x - this._mouseSuave.x * 2.4, 0.002, dt);
      m.position.y = damp(
        m.position.y,
        m.userData.base.y - this._mouseSuave.y * 1.6 + Math.sin(tempoEscalado * 0.4 + m.userData.base.x) * 0.25,
        0.002,
        dt
      );
    }
  }

  destruir() {
    for (const { grupo } of this.camadas) {
      grupo.traverse((o) => o.geometry?.dispose?.());
      this.grupo.remove(grupo);
    }
    for (const m of this.vidros) {
      m.geometry.dispose();
      this.grupo.remove(m);
    }
    for (const mat of this.materiais) mat.dispose();
    this.camadas = [];
    this.vidros = [];
    this.materiais = [];
    this._formasBase?.forEach((g) => g.dispose?.());
  }
}
