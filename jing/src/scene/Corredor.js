import * as THREE from 'three';
import { criarMaterialFragmento } from './shaders/fragmento.js';
import { criarPlacaDeVidro } from './geometrias.js';
import { makeRandom, randRange, damp } from '../utils/math.js';

/**
 * O CORREDOR: placas altas de vidro dos dois lados formando o salão,
 * e um piso espelhado que devolve o ambiente inteiro.
 *
 * As placas giram quando o scroll pede transição — é a "virada dos espelhos"
 * entre CHRONO MIRROR e a curva de aprendizado.
 */
export class Corredor {
  constructor({ envMap, perfil, zInicio = 14, zFim = -170 }) {
    this.grupo = new THREE.Group();
    this.grupo.name = 'corredor';
    this.envMap = envMap;
    this.zInicio = zInicio;
    this.zFim = zFim;
    this.giroAlvo = 0;
    this.construir(perfil);
  }

  construir(perfil) {
    this.destruir();
    const rnd = makeRandom(9091);
    const n = perfil.placas * 2;

    const material = criarMaterialFragmento({
      envMap: this.envMap,
      rugosidade: 0.05,
      metalico: 1,
      cor: 0x070c1a,
      opacidade: 0.62,
    });
    material.userData.uniforms.uDeriva.value = 0.04;
    material.userData.uniforms.uMouseForca.value = 0.05;
    material.userData.uniforms.uRachadura.value = 0.1;
    material.userData.uniforms.uRimForca.value = 1.35;
    this.material = material;

    const geo = criarPlacaDeVidro();
    const im = new THREE.InstancedMesh(geo, material, n);
    im.frustumCulled = false;

    const aSeed = new Float32Array(n);
    const aVel = new Float32Array(n);
    const aBrilho = new Float32Array(n);
    const aRug = new Float32Array(n);
    const aEscalaInv = new Float32Array(n);
    const aEixo = new Float32Array(n * 3);

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    this.dados = [];

    for (let i = 0; i < n; i++) {
      const lado = i % 2 === 0 ? -1 : 1;
      const t = Math.floor(i / 2) / Math.max(1, perfil.placas - 1);
      const z = this.zInicio + (this.zFim - this.zInicio) * t + randRange(rnd, -3, 3);
      const x = lado * randRange(rnd, 17, 31);
      const y = randRange(rnd, -2, 3);
      const altura = randRange(rnd, 14, 30);
      const largura = randRange(rnd, 3.2, 8.5);
      const rotY = lado * randRange(rnd, 0.15, 0.62);
      v.set(x, y, z);
      e.set(randRange(rnd, -0.08, 0.08), rotY, randRange(rnd, -0.06, 0.06));
      q.setFromEuler(e);
      s.set(largura, altura, 0.14);
      m4.compose(v, q, s);
      im.setMatrixAt(i, m4);
      this.dados.push({ pos: v.clone(), rotY, altura, largura, fase: rnd() * 6.28 });

      aSeed[i] = rnd();
      aVel[i] = randRange(rnd, 0.01, 0.05);
      aBrilho[i] = randRange(rnd, 0.05, 0.3);
      aRug[i] = randRange(rnd, 0.5, 1.8);
      aEscalaInv[i] = 1 / altura;
      aEixo[i * 3] = 0;
      aEixo[i * 3 + 1] = 1;
      aEixo[i * 3 + 2] = 0;
    }

    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
    geo.setAttribute('aVel', new THREE.InstancedBufferAttribute(aVel, 1));
    geo.setAttribute('aBrilho', new THREE.InstancedBufferAttribute(aBrilho, 1));
    geo.setAttribute('aRug', new THREE.InstancedBufferAttribute(aRug, 1));
    geo.setAttribute('aEscalaInv', new THREE.InstancedBufferAttribute(aEscalaInv, 1));
    geo.setAttribute('aEixo', new THREE.InstancedBufferAttribute(aEixo, 3));
    im.instanceMatrix.needsUpdate = true;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.placas = im;
    this.grupo.add(im);

    // --- piso espelhado ---
    const pisoGeo = new THREE.PlaneGeometry(220, Math.abs(this.zFim - this.zInicio) + 60, 1, 1);
    const pisoMat = new THREE.MeshPhysicalMaterial({
      color: 0x04070f,
      metalness: 0.95,
      roughness: 0.28,
      envMap: this.envMap,
      envMapIntensity: 1.4,
      transparent: true,
      opacity: 0.85,
    });
    // gradiente de opacidade: o piso some na distância em vez de cortar reto
    pisoMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vPiso;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPiso = uv;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vPiso;')
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
           float fadeP = smoothstep(0.0, 0.18, vPiso.x) * (1.0 - smoothstep(0.82, 1.0, vPiso.x));
           gl_FragColor.a *= fadeP;`
        );
    };
    const piso = new THREE.Mesh(pisoGeo, pisoMat);
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(0, -7.4, (this.zInicio + this.zFim) / 2);
    piso.renderOrder = -2;
    this.piso = piso;
    this.pisoMat = pisoMat;
    this.grupo.add(piso);
  }

  /** 0..1 — quanto os espelhos estão virados na transição. */
  set giro(v) {
    this.giroAlvo = v;
  }

  atualizar(dt, tempoEscalado, estado) {
    const u = this.material.userData.uniforms;
    u.uTempo.value = tempoEscalado;
    u.uOnda.value = estado.onda;
    u.uDissolve.value = estado.dissolve * 0.5;
    u.uEscurecer.value = estado.escurecer;
    u.uMouse.value.set(estado.mouse.x, estado.mouse.y);

    this._giro = damp(this._giro ?? 0, this.giroAlvo, 0.004, dt);
    if (Math.abs(this._giro - (this._giroAplicado ?? -1)) > 0.0015) {
      this._giroAplicado = this._giro;
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const v = new THREE.Vector3();
      const s = new THREE.Vector3();
      for (let i = 0; i < this.dados.length; i++) {
        const d = this.dados[i];
        v.copy(d.pos);
        e.set(0, d.rotY + this._giro * (1.15 + Math.sin(d.fase) * 0.5), this._giro * 0.12 * Math.sin(d.fase));
        q.setFromEuler(e);
        s.set(d.largura, d.altura, 0.14);
        m4.compose(v, q, s);
        this.placas.setMatrixAt(i, m4);
      }
      this.placas.instanceMatrix.needsUpdate = true;
    }
  }

  destruir() {
    if (this.placas) {
      this.placas.geometry.dispose();
      this.grupo.remove(this.placas);
    }
    if (this.piso) {
      this.piso.geometry.dispose();
      this.pisoMat.dispose();
      this.grupo.remove(this.piso);
    }
    this.material?.dispose();
    this.placas = null;
    this.piso = null;
  }
}
