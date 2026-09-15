import * as THREE from 'three';
import { criarMaterialFragmento } from './shaders/fragmento.js';
import { criarFormasDeCaco } from './geometrias.js';
import { makeRandom, randRange, clamp, smoothstep } from '../utils/math.js';

/**
 * O ESPELHO QUE SE REMONTA.
 *
 * Cena final: os cacos espalhados pelo salão convergem, se alinham num único
 * plano — por alguns segundos existe UMA superfície de espelho inteira — e
 * então ela se quebra outra vez.
 *
 * As matrizes são interpoladas na CPU porque o efeito precisa de dois estados
 * arbitrários por instância (disperso ↔ alinhado) com atraso individual.
 * São poucas centenas de instâncias, atualizadas só enquanto a seção existe
 * na viewport.
 */
export class EspelhoFinal {
  constructor({ envMap, perfil }) {
    this.grupo = new THREE.Group();
    this.grupo.name = 'espelho-final';
    this.grupo.visible = false;
    this.grupo.position.z = -17;
    this.ativo = false;
    this.fase = 0; // 0 disperso · 1 alinhado
    this.quebra = 0;
    this.envMap = envMap;
    this.construir(perfil);
  }

  construir(perfil) {
    this.destruir();
    const rnd = makeRandom(31415);
    const formas = criarFormasDeCaco(rnd, 5, 0.04);
    this._formas = formas;

    const total = clamp(Math.round((perfil.fragmentos.longe + perfil.fragmentos.medio) * 0.55), 40, 240);
    const material = criarMaterialFragmento({ envMap: this.envMap, rugosidade: 0.045, metalico: 1 });
    material.userData.uniforms.uDeriva.value = 0.02;
    material.userData.uniforms.uMouseForca.value = 0.05;
    material.userData.uniforms.uRimForca.value = 1.4;
    this.material = material;

    // malha alinhada: grade irregular cobrindo o plano do espelho
    const cols = Math.ceil(Math.sqrt(total * 1.7));
    const rows = Math.ceil(total / cols);
    const L = 34;
    const A = 20;

    this.instancias = [];
    const porForma = Math.ceil(total / formas.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();

    let k = 0;
    for (let f = 0; f < formas.length; f++) {
      const n = Math.min(porForma, total - f * porForma);
      if (n <= 0) break;
      const geo = formas[f].clone();
      const im = new THREE.InstancedMesh(geo, material, n);
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      const aSeed = new Float32Array(n);
      const aVel = new Float32Array(n);
      const aBrilho = new Float32Array(n);
      const aRug = new Float32Array(n);
      const aEscalaInv = new Float32Array(n);
      const aEixo = new Float32Array(n * 3);
      const dados = [];

      for (let i = 0; i < n; i++, k++) {
        const col = k % cols;
        const row = Math.floor(k / cols) % rows;
        const alvoPos = new THREE.Vector3(
          -L / 2 + ((col + 0.5) / cols) * L + randRange(rnd, -0.35, 0.35),
          -A / 2 + ((row + 0.5) / rows) * A + randRange(rnd, -0.3, 0.3),
          randRange(rnd, -0.06, 0.06)
        );
        const alvoEsc = new THREE.Vector3(
          (L / cols) * randRange(rnd, 0.85, 1.25),
          (A / rows) * randRange(rnd, 0.85, 1.25),
          1
        );
        const alvoRot = new THREE.Euler(0, 0, randRange(rnd, -0.25, 0.25));

        const ang = rnd() * Math.PI * 2;
        const raio = randRange(rnd, 10, 46);
        const dispPos = new THREE.Vector3(
          Math.cos(ang) * raio,
          Math.sin(ang) * raio * 0.7,
          randRange(rnd, -46, 16)
        );
        const dispRot = new THREE.Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28);
        const dispEsc = randRange(rnd, 0.6, 2.4);

        dados.push({
          alvoPos, alvoEsc, alvoRot,
          dispPos, dispRot, dispEsc,
          atraso: rnd() * 0.45,
          saida: new THREE.Vector3(randRange(rnd, -1, 1), randRange(rnd, -1, 1), randRange(rnd, 0.3, 1.6)).normalize(),
          giroSaida: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
        });

        aSeed[i] = rnd();
        aVel[i] = randRange(rnd, 0.02, 0.12);
        aBrilho[i] = randRange(rnd, 0.1, 0.6);
        aRug[i] = randRange(rnd, 0.3, 1.1);
        aEscalaInv[i] = 0.6;
        aEixo[i * 3] = 0;
        aEixo[i * 3 + 1] = 1;
        aEixo[i * 3 + 2] = 0;

        e.copy(dispRot);
        q.setFromEuler(e);
        m4.compose(dispPos, q, new THREE.Vector3(dispEsc, dispEsc, dispEsc));
        im.setMatrixAt(i, m4);
      }

      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
      geo.setAttribute('aVel', new THREE.InstancedBufferAttribute(aVel, 1));
      geo.setAttribute('aBrilho', new THREE.InstancedBufferAttribute(aBrilho, 1));
      geo.setAttribute('aRug', new THREE.InstancedBufferAttribute(aRug, 1));
      geo.setAttribute('aEscalaInv', new THREE.InstancedBufferAttribute(aEscalaInv, 1));
      geo.setAttribute('aEixo', new THREE.InstancedBufferAttribute(aEixo, 3));
      im.instanceMatrix.needsUpdate = true;
      im.userData.dados = dados;
      this.instancias.push(im);
      this.grupo.add(im);
    }
  }

  /** Liga/desliga a atualização — só roda quando a seção está na tela. */
  set ativa(v) {
    this.ativo = v;
    this.grupo.visible = v;
  }

  /** 0..1 — o alinhamento acompanha o scroll da seção final. */
  definirFase(v) {
    this.fase = clamp(v, 0, 1);
  }

  /** Dispara a quebra final (chamado quando o espelho fica inteiro). */
  quebrar() {
    if (this._quebrando) return false;
    this._quebrando = true;
    this._tQuebra = 0;
    return true;
  }

  religar() {
    this._quebrando = false;
    this.quebra = 0;
  }

  atualizar(dt, tempoEscalado, estado) {
    if (!this.ativo) return;
    const u = this.material.userData.uniforms;
    u.uTempo.value = tempoEscalado;
    u.uOnda.value = estado.onda;
    u.uEscurecer.value = estado.escurecer;
    u.uMouse.value.set(estado.mouse.x, estado.mouse.y);

    if (this._quebrando) {
      this._tQuebra += dt;
      this.quebra = clamp(this._tQuebra / 1.6, 0, 1);
      u.uDissolve.value = Math.max(0, (this.quebra - 0.55) / 0.45) * 0.35;
    } else {
      this.quebra = Math.max(0, this.quebra - dt * 0.6);
      u.uDissolve.value = 0;
    }

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const esc = new THREE.Vector3();
    const eu = new THREE.Euler();
    const qd = new THREE.Quaternion();
    const qa = new THREE.Quaternion();

    for (const im of this.instancias) {
      const dados = im.userData.dados;
      for (let i = 0; i < dados.length; i++) {
        const d = dados[i];
        // cada caco chega no seu tempo: o espelho se fecha em onda
        const t = smoothstep(d.atraso, d.atraso + 0.55, this.fase);
        pos.lerpVectors(d.dispPos, d.alvoPos, t);
        qd.setFromEuler(eu.copy(d.dispRot));
        qa.setFromEuler(eu.copy(d.alvoRot));
        q.copy(qd).slerp(qa, t);
        esc.set(
          d.dispEsc + (d.alvoEsc.x - d.dispEsc) * t,
          d.dispEsc + (d.alvoEsc.y - d.dispEsc) * t,
          d.dispEsc + (1 - d.dispEsc) * t
        );

        if (this.quebra > 0) {
          const kq = this.quebra * this.quebra;
          pos.addScaledVector(d.saida, kq * 26);
          qa.setFromAxisAngle(d.giroSaida, kq * 7);
          q.multiply(qa);
        }

        // respiração sutil enquanto o espelho está inteiro
        const resp = Math.sin(tempoEscalado * 0.8 + d.atraso * 12) * 0.03 * t;
        pos.z += resp;

        m4.compose(pos, q, esc);
        im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
    }
  }

  get inteiro() {
    return this.fase > 0.985 && !this._quebrando;
  }

  destruir() {
    if (!this.instancias) return;
    for (const im of this.instancias) {
      im.geometry.dispose();
      this.grupo.remove(im);
    }
    this.material?.dispose();
    this._formas?.forEach((g) => g.dispose());
    this.instancias = [];
  }
}
