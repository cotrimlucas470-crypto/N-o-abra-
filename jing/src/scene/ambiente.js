import * as THREE from 'three';
import { GLSL_HASH, GLSL_NOISE } from './shaders/noise.js';
import { randRange } from '../utils/math.js';

/**
 * O SALÃO: céu do ambiente (que vira o environment map refletido nos cacos),
 * luzes que passam devagar, névoa volumétrica e feixes de luz.
 */

/** Cena auxiliar usada só para gerar o environment map por PMREM. */
function criarCenaDeAmbiente() {
  const cena = new THREE.Scene();

  const esfera = new THREE.Mesh(
    new THREE.SphereGeometry(60, 32, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {},
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        ${GLSL_HASH}
        ${GLSL_NOISE}
        void main(){
          float h = vDir.y * 0.5 + 0.5;
          vec3 base = mix(vec3(0.016,0.028,0.062), vec3(0.008,0.012,0.028), smoothstep(0.35,1.0,h));
          base = mix(vec3(0.020,0.010,0.046), base, smoothstep(0.0,0.45,h));

          // duas fontes frias, uma quente-espectral: é o que aparece nos reflexos
          float a = pow(max(0.0, dot(normalize(vDir), normalize(vec3( 0.75, 0.32,-0.55)))), 22.0);
          float b = pow(max(0.0, dot(normalize(vDir), normalize(vec3(-0.68, 0.12, 0.42)))), 16.0);
          float c = pow(max(0.0, dot(normalize(vDir), normalize(vec3( 0.05,-0.85, 0.20)))), 9.0);
          base += vec3(0.00,0.62,0.86) * a * 1.35;
          base += vec3(0.42,0.30,1.00) * b * 1.05;
          base += vec3(0.10,0.16,0.34) * c * 0.55;

          // faixas verticais frias: paredes de vidro do salão vistas de longe
          float faixa = fbm(vec2(atan(vDir.z, vDir.x) * 3.2, vDir.y * 2.4));
          base += vec3(0.05,0.12,0.22) * smoothstep(0.55, 0.95, faixa) * 0.7;
          gl_FragColor = vec4(base, 1.0);
        }
      `,
    })
  );
  cena.add(esfera);

  // "área de luz" fria: dá ao vidro um brilho comprido em vez de um ponto
  const mkPainel = (cor, intensidade, pos, escala, rot) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(intensidade) })
    );
    m.position.copy(pos);
    m.scale.set(escala.x, escala.y, 1);
    m.rotation.set(rot.x, rot.y, rot.z);
    cena.add(m);
  };
  mkPainel(0x00e5ff, 5.0, new THREE.Vector3(14, 6, -10), new THREE.Vector2(3, 26), new THREE.Vector3(0, -0.9, 0.2));
  mkPainel(0x7b61ff, 3.8, new THREE.Vector3(-16, 2, 8), new THREE.Vector2(3.4, 22), new THREE.Vector3(0, 1.1, -0.15));
  mkPainel(0xe8f1ff, 2.6, new THREE.Vector3(0, 18, -18), new THREE.Vector2(20, 3), new THREE.Vector3(-1.1, 0, 0));

  return cena;
}

export function gerarEnvMap(renderer, resolucao = 256) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const cena = criarCenaDeAmbiente();
  const alvo = pmrem.fromScene(cena, 0.02, 0.1, 120);
  cena.traverse((o) => {
    o.geometry?.dispose?.();
    o.material?.dispose?.();
  });
  pmrem.dispose();
  return alvo.texture;
}

/** Névoa volumétrica: painéis grandes, aditivos, com fbm lento. */
export function criarNevoa(rnd, quantidade = 7) {
  const grupo = new THREE.Group();
  grupo.name = 'nevoa';
  const uniforms = {
    uTempo: { value: 0 },
    uOpacidade: { value: 1 },
    uCorA: { value: new THREE.Color(0x0c2a4d) },
    uCorB: { value: new THREE.Color(0x2a1a55) },
  };
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vSeed;
      attribute float aSeed;
      void main(){
        vUv = uv; vSeed = aSeed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying float vSeed;
      uniform float uTempo; uniform float uOpacidade;
      uniform vec3 uCorA; uniform vec3 uCorB;
      ${GLSL_HASH}
      ${GLSL_NOISE}
      void main(){
        vec2 p = vUv * vec2(2.6, 1.6) + vec2(uTempo * 0.012 + vSeed * 9.0, uTempo * 0.006);
        float n = fbm(p);
        n = smoothstep(0.34, 0.92, n);
        float borda = smoothstep(0.0, 0.42, vUv.x) * (1.0 - smoothstep(0.58, 1.0, vUv.x))
                    * smoothstep(0.0, 0.5, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
        vec3 cor = mix(uCorA, uCorB, fbm(p * 0.6 + 4.0));
        gl_FragColor = vec4(cor, n * borda * 0.20 * uOpacidade);
      }
    `,
  });

  const base = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < quantidade; i++) {
    const g = base.clone();
    g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array([i, i, i, i].map((v) => v * 0.37)), 1));
    const m = new THREE.Mesh(g, mat);
    m.position.set(randRange(rnd, -22, 22), randRange(rnd, -8, 12), randRange(rnd, -90, 14));
    m.scale.set(randRange(rnd, 26, 52), randRange(rnd, 16, 30), 1);
    m.rotation.z = randRange(rnd, -0.5, 0.5);
    m.renderOrder = -5;
    grupo.add(m);
  }
  grupo.userData.uniforms = uniforms;
  return grupo;
}

/** Feixes de luz atravessando o salão devagar. */
export function criarFeixes(rnd, quantidade = 5) {
  const grupo = new THREE.Group();
  grupo.name = 'feixes';
  const uniforms = { uTempo: { value: 0 }, uForca: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vSeed;
      attribute float aSeed;
      void main(){ vUv = uv; vSeed = aSeed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying float vSeed;
      uniform float uTempo; uniform float uForca;
      void main(){
        float centro = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float feixe = pow(clamp(centro, 0.0, 1.0), 3.0);
        float desce = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
        float pulso = 0.55 + 0.45 * sin(uTempo * 0.35 + vSeed * 6.0);
        vec3 cor = mix(vec3(0.0,0.72,0.95), vec3(0.45,0.34,1.0), fract(vSeed * 1.7));
        gl_FragColor = vec4(cor, feixe * desce * 0.13 * pulso * uForca);
      }
    `,
  });

  for (let i = 0; i < quantidade; i++) {
    const g = new THREE.PlaneGeometry(1, 1);
    const s = new Float32Array(4).fill(i * 0.61);
    g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
    const m = new THREE.Mesh(g, mat);
    m.position.set(randRange(rnd, -18, 18), randRange(rnd, 2, 10), randRange(rnd, -80, 6));
    m.scale.set(randRange(rnd, 3, 7), randRange(rnd, 26, 44), 1);
    m.rotation.set(randRange(rnd, -0.25, 0.25), randRange(rnd, -0.6, 0.6), randRange(rnd, -0.3, 0.3));
    m.renderOrder = -4;
    m.userData.baseX = m.position.x;
    m.userData.vel = randRange(rnd, 0.05, 0.16) * (rnd() < 0.5 ? -1 : 1);
    grupo.add(m);
  }
  grupo.userData.uniforms = uniforms;
  return grupo;
}

/** Luzes que caminham pelo salão — dão vida aos reflexos especulares. */
export function criarLuzes(cena) {
  const amb = new THREE.AmbientLight(0x10172b, 1.2);
  cena.add(amb);

  const luzes = [];
  const defs = [
    { cor: 0x00e5ff, int: 17, dist: 46, raio: 11, alt: 5.5, vel: 0.12, fase: 0 },
    { cor: 0x7b61ff, int: 15, dist: 44, raio: 14, alt: -2.5, vel: -0.09, fase: 2.1 },
    { cor: 0xe8f1ff, int: 7, dist: 30, raio: 7, alt: 9, vel: 0.17, fase: 4.3 },
  ];
  for (const d of defs) {
    const l = new THREE.PointLight(d.cor, d.int, d.dist, 2);
    l.userData = d;
    cena.add(l);
    luzes.push(l);
  }

  const chave = new THREE.DirectionalLight(0xbfe9ff, 0.8);
  chave.position.set(6, 12, 8);
  cena.add(chave);

  const contra = new THREE.DirectionalLight(0x7b61ff, 0.6);
  contra.position.set(-8, -4, -12);
  cena.add(contra);

  return {
    luzes,
    atualizar(t, z) {
      for (const l of luzes) {
        const d = l.userData;
        l.position.set(
          Math.cos(t * d.vel + d.fase) * d.raio,
          d.alt + Math.sin(t * d.vel * 1.7 + d.fase) * 2.2,
          z + Math.sin(t * d.vel * 0.8 + d.fase) * d.raio * 0.8 - 4
        );
      }
    },
  };
}
