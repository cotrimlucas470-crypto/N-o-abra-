import * as THREE from 'three';
import { GLSL_HASH } from './shaders/noise.js';
import { makeRandom, randRange, damp } from '../utils/math.js';

/**
 * POEIRA LUMINOSA.
 *
 * Milhares de partículas como quads instanciados (não gl_Points): assim elas
 * podem ESTICAR na direção do próprio movimento e virar rastro quando o tempo
 * acelera — que é exatamente o que o domínio temporal da Jing pede.
 *
 * O campo acompanha a câmera por wrap toroidal: some atrás, nasce na frente,
 * e nunca precisa de mais instâncias do que o aparelho aguenta.
 */
export class Particulas {
  constructor({ perfil }) {
    this.caixa = new THREE.Vector3(52, 34, 96);
    this._mouse = new THREE.Vector2();
    this._mouseSuave = new THREE.Vector2();
    this.grupo = new THREE.Group();
    this.grupo.name = 'particulas';
    this.construir(perfil);
  }

  construir(perfil) {
    this.destruir();
    const n = perfil.particulas;
    const rnd = makeRandom(77123);

    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.attributes.position = base.attributes.position;
    geo.attributes.uv = base.attributes.uv;
    geo.instanceCount = n;

    const aPos = new Float32Array(n * 3);
    const aSeed = new Float32Array(n * 3);
    const aTam = new Float32Array(n);
    const aAmp = new Float32Array(n);
    const aSub = new Float32Array(n);
    const aTom = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      aPos[i * 3] = randRange(rnd, -this.caixa.x / 2, this.caixa.x / 2);
      aPos[i * 3 + 1] = randRange(rnd, -this.caixa.y / 2, this.caixa.y / 2);
      aPos[i * 3 + 2] = randRange(rnd, -this.caixa.z / 2, this.caixa.z / 2);
      aSeed[i * 3] = rnd() * 10;
      aSeed[i * 3 + 1] = rnd() * 10;
      aSeed[i * 3 + 2] = rnd() * 10;
      const grande = rnd() < 0.06;
      aTam[i] = grande ? randRange(rnd, 0.09, 0.2) : randRange(rnd, 0.012, 0.05);
      aAmp[i] = randRange(rnd, 0.3, 2.4);
      aSub[i] = randRange(rnd, 0.02, 0.22) * (rnd() < 0.3 ? -1 : 1);
      aTom[i] = rnd();
    }

    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 3));
    geo.setAttribute('aTam', new THREE.InstancedBufferAttribute(aTam, 1));
    geo.setAttribute('aAmp', new THREE.InstancedBufferAttribute(aAmp, 1));
    geo.setAttribute('aSub', new THREE.InstancedBufferAttribute(aSub, 1));
    geo.setAttribute('aTom', new THREE.InstancedBufferAttribute(aTom, 1));

    this.uniforms = {
      uTempo: { value: 0 },
      uCam: { value: new THREE.Vector3() },
      uCaixa: { value: this.caixa.clone() },
      uMouse: { value: new THREE.Vector2() },
      uRastro: { value: 0 },
      uOpacidade: { value: 1 },
      uEscurecer: { value: 0 },
      uOnda: { value: 0 },
      uCorA: { value: new THREE.Color(0x9fe9ff) },
      uCorB: { value: new THREE.Color(0xa08cff) },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 aPos; attribute vec3 aSeed;
        attribute float aTam; attribute float aAmp; attribute float aSub; attribute float aTom;
        uniform float uTempo; uniform vec3 uCam; uniform vec3 uCaixa;
        uniform vec2 uMouse; uniform float uRastro; uniform float uOnda;
        varying vec2 vUvP; varying float vTom; varying float vFade; varying float vEstica;
        ${GLSL_HASH}

        vec3 deriva(float t){
          return vec3(
            sin(t * 0.21 + aSeed.x) * aAmp,
            cos(t * 0.17 + aSeed.y) * aAmp * 0.6 + t * aSub,
            sin(t * 0.13 + aSeed.z) * aAmp * 0.8
          );
        }

        void main(){
          vTom = aTom;
          vUvP = uv;

          vec3 p = aPos + deriva(uTempo);
          // o campo persegue a câmera: wrap toroidal em torno dela
          vec3 rel = p - uCam;
          rel = mod(rel + uCaixa * 0.5, uCaixa) - uCaixa * 0.5;

          // parallax das partículas: 0.2x — a camada mais lenta de todas
          rel.xy += uMouse * 0.2 * (0.4 + aTom);
          rel += normalize(rel + vec3(0.001)) * uOnda * 1.4;

          vec3 mundo = uCam + rel;
          vec4 mv = viewMatrix * vec4(mundo, 1.0);

          // velocidade analítica -> direção do rastro
          vec3 v = vec3(
            cos(uTempo * 0.21 + aSeed.x) * 0.21 * aAmp,
            -sin(uTempo * 0.17 + aSeed.y) * 0.102 * aAmp + aSub,
            cos(uTempo * 0.13 + aSeed.z) * 0.104 * aAmp
          );
          vec3 vView = (viewMatrix * vec4(v, 0.0)).xyz;
          float vel = length(vView.xy);
          vec2 dir = vel > 0.0001 ? vView.xy / vel : vec2(1.0, 0.0);
          float estica = 1.0 + uRastro * min(vel * 9.0, 7.0);
          vEstica = estica;

          vec2 q = position.xy * aTam;
          q.x *= estica;
          vec2 ap = vec2(q.x * dir.x - q.y * dir.y, q.x * dir.y + q.y * dir.x);
          mv.xy += ap;

          vFade = 1.0 - smoothstep(uCaixa.z * 0.16, uCaixa.z * 0.5, -rel.z + uCaixa.z * 0.5);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUvP; varying float vTom; varying float vFade; varying float vEstica;
        uniform float uOpacidade; uniform float uEscurecer;
        uniform vec3 uCorA; uniform vec3 uCorB;
        void main(){
          vec2 c = (vUvP - 0.5) * 2.0;
          c.x *= 1.0 / max(vEstica, 0.001) * vEstica; // mantém o núcleo redondo no rastro
          float d = length(vec2(c.x / max(vEstica * 0.35, 1.0), c.y));
          float nucleo = 1.0 - smoothstep(0.0, 1.0, d);
          float brilho = pow(nucleo, 3.0);
          vec3 cor = mix(uCorA, uCorB, vTom);
          float a = (nucleo * 0.35 + brilho * 0.9) * vFade * uOpacidade * (1.0 - uEscurecer * 0.75);
          if (a < 0.003) discard;
          gl_FragColor = vec4(cor * (0.5 + brilho), a);
        }
      `,
    });

    this.malha = new THREE.Mesh(geo, mat);
    this.malha.frustumCulled = false;
    this.malha.renderOrder = 3;
    this.grupo.add(this.malha);
  }

  set mouse(v) {
    this._mouse.set(v.x, v.y);
  }

  atualizar(dt, tempoEscalado, estado, camPos) {
    this._mouseSuave.x = damp(this._mouseSuave.x, this._mouse.x, 0.004, dt);
    this._mouseSuave.y = damp(this._mouseSuave.y, this._mouse.y, 0.004, dt);
    const u = this.uniforms;
    u.uTempo.value = tempoEscalado;
    u.uCam.value.copy(camPos);
    u.uMouse.value.set(this._mouseSuave.x * -3.2, this._mouseSuave.y * -2.0);
    u.uRastro.value = damp(u.uRastro.value, estado.rastro, 0.002, dt);
    u.uOnda.value = estado.onda;
    u.uEscurecer.value = estado.escurecer;
  }

  destruir() {
    if (!this.malha) return;
    this.malha.geometry.dispose();
    this.malha.material.dispose();
    this.grupo.remove(this.malha);
    this.malha = null;
  }
}
