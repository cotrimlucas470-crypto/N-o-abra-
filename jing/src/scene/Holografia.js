import * as THREE from 'three';
import { GLSL_HASH, GLSL_NOISE } from './shaders/noise.js';
import { criarCristal, criarPrisma } from './geometrias.js';
import { damp, clamp } from '../utils/math.js';

/**
 * ESTRUTURAS HOLOGRÁFICAS ancoradas ao layout.
 *
 * Cada "card" da página não é um card: é um objeto 3D de verdade, vivendo no
 * espaço da câmera, com reflexo do ambiente, névoa, bloom e profundidade de
 * campo aplicados — e com os cacos do salão passando NA FRENTE dele.
 *
 * A âncora converte o retângulo do elemento HTML em coordenadas de câmera,
 * então o objeto fica atrás do conteúdo em qualquer tamanho de tela. No hover,
 * a estrutura se APROXIMA da câmera (a distância diminui de verdade) e o resto
 * do salão escurece.
 */

export function criarTexturaTexto(texto, { tamanho = 256, fonte = 700, cor = '#E8F1FF', escalaFonte = 0.52 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = tamanho;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, tamanho, tamanho);
  ctx.font = `${fonte} ${Math.round(tamanho * escalaFonte)}px "Rajdhani", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,229,255,0.85)';
  ctx.shadowBlur = tamanho * 0.09;
  ctx.fillStyle = cor;
  ctx.fillText(texto, tamanho / 2, tamanho / 2 + tamanho * 0.02);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

const materialLinha = (cor, opacidade = 0.55) =>
  new THREE.LineBasicMaterial({
    color: cor,
    transparent: true,
    opacity: opacidade,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

function materialVidroHolo(envMap, cor = 0x2b6fb0) {
  return new THREE.MeshPhysicalMaterial({
    color: cor,
    metalness: 0.85,
    roughness: 0.14,
    envMap,
    envMapIntensity: 2.2,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** Painel de grade holográfica — a "camada de vidro" atrás do conteúdo. */
function criarPainelHolo(largura, altura, tom = 0) {
  const uniforms = {
    uTempo: { value: 0 },
    uFoco: { value: 0 },
    uAparicao: { value: 0 },
    uTom: { value: tom },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUvP; void main(){ vUvP = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUvP;
      uniform float uTempo; uniform float uFoco; uniform float uAparicao; uniform float uTom;
      ${GLSL_HASH}
      ${GLSL_NOISE}
      void main(){
        vec2 uv = vUvP;
        // grade fina
        vec2 g = abs(fract(uv * vec2(14.0, 9.0)) - 0.5);
        float grade = (1.0 - smoothstep(0.0, 0.035, min(g.x, g.y))) * 0.35;
        // moldura
        float b = min(min(uv.x, 1.0-uv.x), min(uv.y, 1.0-uv.y));
        float moldura = 1.0 - smoothstep(0.0, 0.012, b);
        float cantos = step(0.92, max(abs(uv.x-0.5), abs(uv.y-0.5)) * 2.0);
        // varredura
        float scan = smoothstep(0.0, 0.04, abs(fract(uv.y * 2.0 - uTempo * 0.12) - 0.5) ) ;
        scan = (1.0 - scan) * 0.5;
        float ruido = fbm(uv * 8.0 + uTempo * 0.05) * 0.12;

        vec3 corA = vec3(0.0, 0.72, 0.95);
        vec3 corB = vec3(0.45, 0.35, 1.0);
        vec3 cor = mix(corA, corB, uTom);
        float a = (grade * 0.35 + moldura * 0.85 + cantos * 0.25 + scan * 0.22 + ruido);
        a *= (0.22 + uFoco * 0.55) * uAparicao;
        gl_FragColor = vec4(cor * (0.7 + uFoco * 0.9), a);
      }
    `,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura, 1, 1), mat);
  m.userData.uniforms = uniforms;
  return m;
}

/** Feixe vertical conectando cristais (a linha do tempo). */
export function criarFeixeTemporal() {
  const uniforms = { uTempo: { value: 0 }, uAparicao: { value: 0 }, uProgresso: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUvP; void main(){ vUvP = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float; varying vec2 vUvP;
      uniform float uTempo; uniform float uAparicao; uniform float uProgresso;
      void main(){
        float centro = 1.0 - abs(vUvP.x - 0.5) * 2.0;
        float nucleo = pow(clamp(centro, 0.0, 1.0), 6.0);
        float halo = pow(clamp(centro, 0.0, 1.0), 1.6) * 0.25;
        float pulso = 0.55 + 0.45 * sin(vUvP.y * 24.0 - uTempo * 2.2);
        float preenchido = 1.0 - smoothstep(uProgresso - 0.02, uProgresso + 0.02, 1.0 - vUvP.y);
        vec3 cor = mix(vec3(0.35,0.28,0.9), vec3(0.0,0.85,1.0), preenchido);
        float a = (nucleo * (0.5 + pulso * 0.5) * (0.25 + preenchido * 0.75) + halo) * uAparicao;
        gl_FragColor = vec4(cor * (1.0 + pulso * 0.5), a);
      }
    `,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.userData.uniforms = uniforms;
  return m;
}

/**
 * Uma estrutura ancorada. `tipo`:
 *  · 'estagio'  — prisma alto com barra de progresso e gráfico
 *  · 'cristal'  — ponto da linha do tempo, remontado peça a peça
 *  · 'nodo'     — mecânica flutuante selecionável
 *  · 'slot'     — slot de equipamento
 *  · 'painel'   — apenas a camada de vidro
 */
const BASE = {
  estagio: { l: 3.6, a: 4.6, uniforme: true },
  cristal: { l: 1.6, a: 1.6, uniforme: true },
  nodo: { l: 2.5, a: 2.5, uniforme: true },
  slot: { l: 2.3, a: 3.0, uniforme: true },
  painel: { l: 4.0, a: 3.0, uniforme: false },
};

export class Estrutura {
  constructor({ tipo, el, envMap, tom = 0, rotulo = '', progresso = 0, grafico = null, distancia = 9 }) {
    this.tipo = tipo;
    this.base = BASE[tipo] || BASE.painel;
    this.el = el;
    this.distBase = distancia;
    this.dist = distancia;
    this.foco = 0;
    this.focoAlvo = 0;
    this.aparicao = 0;
    this.aparicaoAlvo = 0;
    this.progressoAlvo = progresso;
    this.progresso = 0;
    this.tom = tom;
    this.raiz = new THREE.Group();
    this.raiz.visible = false;
    this.uniformesPainel = [];
    this._giro = new THREE.Vector3(0, 1, 0);

    const envelope = new THREE.Group();
    this.envelope = envelope;
    this.raiz.add(envelope);

    if (tipo === 'estagio') this._montarEstagio(envMap, rotulo, grafico);
    else if (tipo === 'cristal') this._montarCristal(envMap, rotulo);
    else if (tipo === 'nodo') this._montarNodo(envMap, rotulo);
    else if (tipo === 'slot') this._montarSlot(envMap, rotulo);
    else this._montarPainel();
  }

  _addPainel(l, a, z = 0) {
    const p = criarPainelHolo(l, a, this.tom);
    p.position.z = z;
    this.envelope.add(p);
    this.uniformesPainel.push(p.userData.uniforms);
    return p;
  }

  _montarEstagio(envMap, rotulo, grafico) {
    this._addPainel(3.6, 4.6);

    const prisma = new THREE.Mesh(criarPrisma(), materialVidroHolo(envMap, this.tom > 0.5 ? 0x4b3ba8 : 0x1c5f9e));
    prisma.scale.set(0.82, 1.35, 0.82);
    prisma.position.set(0, 0.25, 0);
    this.envelope.add(prisma);
    this.nucleo = prisma;

    const arestas = new THREE.LineSegments(
      new THREE.EdgesGeometry(prisma.geometry),
      materialLinha(this.tom > 0.5 ? 0x7b61ff : 0x00e5ff, 0.6)
    );
    arestas.scale.copy(prisma.scale);
    arestas.position.copy(prisma.position);
    this.envelope.add(arestas);
    this.arestas = arestas;

    // barra de progresso vertical, em luz
    this.barra = criarFeixeTemporal();
    this.barra.scale.set(0.09, 3.0, 1);
    this.barra.position.set(-1.45, 0.1, 0.2);
    this.envelope.add(this.barra);

    // gráfico: uma linha 3D real com os valores do config
    if (grafico?.length) {
      const pts = grafico.map((v, i) => new THREE.Vector3(
        -0.95 + (i / (grafico.length - 1)) * 1.9,
        -1.55 + v * 1.1,
        0.2
      ));
      const curva = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.BufferGeometry().setFromPoints(curva.getPoints(48));
      this.grafico = new THREE.Line(g, materialLinha(0x9fefff, 0.85));
      this.envelope.add(this.grafico);
    }

    if (rotulo) {
      const tex = criarTexturaTexto(rotulo, { escalaFonte: 0.58, cor: '#DCEBFF' });
      const spr = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 1.15),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      // eco holográfico do índice: canto inferior direito, bem discreto
      spr.position.set(1.34, -1.86, 0.2);
      spr.scale.setScalar(0.72);
      this.envelope.add(spr);
      this.rotulo = spr;
    }

    this._addOrbita(envMap, 14, 1.9);
  }

  _montarCristal(envMap, _rotulo) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x8fd8ff,
      metalness: 0.5,
      roughness: 0.05,
      envMap,
      envMapIntensity: 3,
      transmission: 0.6,
      thickness: 0.8,
      ior: 1.6,
      transparent: true,
      opacity: 0.9,
    });
    this.cristalMat = mat;
    const cristal = new THREE.Mesh(criarCristal(0), mat);
    cristal.scale.setScalar(0.62);
    this.envelope.add(cristal);
    this.nucleo = cristal;

    const arestas = new THREE.LineSegments(
      new THREE.EdgesGeometry(cristal.geometry),
      materialLinha(0x00e5ff, 0.75)
    );
    arestas.scale.copy(cristal.scale);
    this.envelope.add(arestas);
    this.arestas = arestas;

    // lascas que se encaixam quando a etapa entra na viewport
    this.lascas = [];
    const lascaGeo = criarCristal(0);
    for (let i = 0; i < 6; i++) {
      const l = new THREE.Mesh(lascaGeo, mat);
      const ang = (i / 6) * Math.PI * 2;
      l.userData.origem = new THREE.Vector3(Math.cos(ang) * 2.6, Math.sin(ang) * 2.0, Math.sin(ang * 2) * 1.4);
      l.userData.alvo = new THREE.Vector3(Math.cos(ang) * 0.42, Math.sin(ang) * 0.34, 0);
      l.scale.setScalar(0.16);
      l.position.copy(l.userData.origem);
      this.envelope.add(l);
      this.lascas.push(l);
    }

  }

  _montarNodo(envMap, _rotulo) {
    this._addPainel(2.5, 2.5);
    // gaiola holográfica em volta do conteúdo: o símbolo e o rótulo do HTML
    // ficam legíveis por dentro, sem nada sólido por cima deles.
    const geo = new THREE.IcosahedronGeometry(0.88, 0);
    const mat = materialVidroHolo(envMap, this.tom > 0.5 ? 0x5b46c8 : 0x1f74b8);
    mat.opacity = 0.14;
    const nodo = new THREE.Mesh(geo, mat);
    nodo.position.y = 0.06;
    this.envelope.add(nodo);
    this.nucleo = nodo;
    this.nodoMat = mat;

    const arestas = new THREE.LineSegments(new THREE.EdgesGeometry(geo), materialLinha(0x00e5ff, 0.8));
    arestas.position.copy(nodo.position);
    this.envelope.add(arestas);
    this.arestas = arestas;

    const nucleo = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xbff2ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    nucleo.position.copy(nodo.position);
    this.envelope.add(nucleo);
    this.brilho = nucleo;

    this._addOrbita(envMap, 7, 1.25);
  }

  _montarSlot(envMap, rotulo) {
    this._addPainel(2.3, 3.0);
    const anel = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.03, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    anel.rotation.z = Math.PI / 6;
    this.envelope.add(anel);
    this.nucleo = anel;

    const interno = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 6),
      materialVidroHolo(envMap, 0x2a5fa8)
    );
    interno.rotation.z = Math.PI / 6;
    interno.position.z = 0;
    this.envelope.add(interno);

    if (rotulo) {
      const tex = criarTexturaTexto(rotulo, { escalaFonte: 0.66 });
      const spr = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 0.95),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      spr.position.z = 0.12;
      this.envelope.add(spr);
      this.rotulo = spr;
    }
  }

  _montarPainel() {
    this._addPainel(4, 3, 0);
  }

  _addOrbita(envMap, n, raio) {
    const geo = new THREE.TetrahedronGeometry(0.07, 0);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x8fd8ff,
      metalness: 1,
      roughness: 0.08,
      envMap,
      envMapIntensity: 2.4,
    });
    const im = new THREE.InstancedMesh(geo, mat, n);
    im.frustumCulled = false;
    im.userData.dados = Array.from({ length: n }, (_, i) => ({
      ang: (i / n) * Math.PI * 2,
      raio: raio * (0.7 + Math.random() * 0.6),
      alt: (Math.random() - 0.5) * 2.6,
      vel: 0.2 + Math.random() * 0.5,
      esc: 0.6 + Math.random() * 1.2,
    }));
    this.orbita = im;
    this.orbitaMat = mat;
    this.envelope.add(im);
  }

  set visivel(v) {
    this.aparicaoAlvo = v ? 1 : 0;
  }
  set focar(v) {
    this.focoAlvo = v ? 1 : 0;
  }

  /** Converte o retângulo do elemento HTML em posição no espaço da câmera. */
  posicionar(camera, larguraTela, alturaTela) {
    const r = this.el?.getBoundingClientRect();
    if (!r || r.width === 0) {
      this.raiz.visible = false;
      return false;
    }
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const ndcX = (cx / larguraTela) * 2 - 1;
    const ndcY = -(cy / alturaTela) * 2 + 1;
    const d = this.dist;
    const meiaAltura = Math.tan((camera.fov * Math.PI) / 360) * d;
    const meiaLargura = meiaAltura * camera.aspect;
    this.raiz.position.set(ndcX * meiaLargura, ndcY * meiaAltura, -d);

    // o elemento HTML vira tamanho em unidades de mundo nesta profundidade:
    // a estrutura passa a ocupar exatamente o espaço do card, em qualquer tela
    const lMundo = (r.width / larguraTela) * meiaLargura * 2;
    const aMundo = (r.height / alturaTela) * meiaAltura * 2;
    if (this.base.uniforme) {
      const k = Math.min(lMundo / this.base.l, aMundo / this.base.a);
      this.escalaAlvo = { x: k, y: k, z: k };
    } else {
      this.escalaAlvo = { x: lMundo / this.base.l, y: aMundo / this.base.a, z: 1 };
    }
    const visivel = r.bottom > -alturaTela * 0.35 && r.top < alturaTela * 1.35;
    this.raiz.visible = visivel && this.aparicao > 0.01;
    return visivel;
  }

  atualizar(dt, tempoEscalado, camera, larguraTela, alturaTela) {
    this.foco = damp(this.foco, this.focoAlvo, 0.0018, dt);
    this.aparicao = damp(this.aparicao, this.aparicaoAlvo, 0.004, dt);
    this.progresso = damp(this.progresso, this.aparicaoAlvo > 0.5 ? this.progressoAlvo : 0, 0.02, dt);
    this.dist = damp(this.dist, this.distBase - this.foco * 2.6, 0.003, dt);

    this.posicionar(camera, larguraTela, alturaTela);
    if (!this.raiz.visible) return;

    const e = this.escalaAlvo || { x: 1, y: 1, z: 1 };
    const k = (1 + this.foco * 0.1) * (0.86 + this.aparicao * 0.14);
    this.envelope.scale.set(e.x * k, e.y * k, e.z * k);

    for (const u of this.uniformesPainel) {
      u.uTempo.value = tempoEscalado;
      u.uFoco.value = this.foco;
      u.uAparicao.value = this.aparicao;
    }

    const giro = tempoEscalado * 0.25;
    if (this.nucleo) {
      this.nucleo.rotation.y = giro * (this.tipo === 'nodo' ? 1.0 : 0.5);
      this.nucleo.rotation.x = Math.sin(giro * 0.7) * 0.22;
      if (this.arestas) {
        this.arestas.rotation.copy(this.nucleo.rotation);
        this.arestas.position.copy(this.nucleo.position);
        this.arestas.material.opacity = (0.5 + this.foco * 0.45) * this.aparicao;
      }
    }
    if (this.nodoMat) this.nodoMat.opacity = (0.1 + this.foco * 0.22) * this.aparicao;
    if (this.brilho) {
      this.brilho.scale.setScalar(0.8 + Math.sin(tempoEscalado * 1.6) * 0.1 + this.foco * 0.6);
      this.brilho.material.opacity = (0.22 + this.foco * 0.45) * this.aparicao;
    }
    if (this.rotulo) this.rotulo.material.opacity = (0.22 + this.foco * 0.4) * this.aparicao;
    if (this.grafico) this.grafico.material.opacity = (0.45 + this.foco * 0.5) * this.aparicao;

    if (this.barra) {
      const u = this.barra.userData.uniforms;
      u.uTempo.value = tempoEscalado;
      u.uAparicao.value = this.aparicao;
      u.uProgresso.value = this.progresso;
    }

    // as lascas se encaixam conforme a etapa aparece
    if (this.lascas) {
      const k = this.aparicao * this.aparicao;
      for (const l of this.lascas) {
        l.position.lerpVectors(l.userData.origem, l.userData.alvo, k);
        l.rotation.y = giro * 2 + l.userData.alvo.x;
        l.rotation.z = giro * 1.3;
        l.scale.setScalar(0.16 * (0.4 + k * 0.6));
      }
    }

    if (this.orbita) {
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const v = new THREE.Vector3();
      const sc = new THREE.Vector3();
      const dados = this.orbita.userData.dados;
      for (let i = 0; i < dados.length; i++) {
        const d = dados[i];
        const a = d.ang + tempoEscalado * d.vel * 0.3;
        v.set(Math.cos(a) * d.raio, d.alt + Math.sin(a * 1.4) * 0.3, Math.sin(a) * d.raio * 0.5);
        q.setFromAxisAngle(this._giro, a * 2);
        sc.setScalar(d.esc * this.aparicao);
        m4.compose(v, q, sc);
        this.orbita.setMatrixAt(i, m4);
      }
      this.orbita.instanceMatrix.needsUpdate = true;
    }
  }

  destruir() {
    this.raiz.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
  }
}
