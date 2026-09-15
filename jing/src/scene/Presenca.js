import * as THREE from 'three';
import { GLSL_HASH, GLSL_NOISE } from './shaders/noise.js';
import { PERSONAGEM } from '../data/config.js';
import { criarFormasDeCaco } from './geometrias.js';
import { makeRandom, randRange, damp, clamp } from '../utils/math.js';

/**
 * A PRESENÇA — o centro do salão.
 *
 * Não inventamos a aparência da Jing. O centro da cena é um VOLUME DE LUZ
 * em pose de combate implícita: coluna vertical com inclinação, arco de lâmina
 * atravessando na diagonal, e um enxame de cacos orbitando em espiral.
 *
 * Se `PERSONAGEM.imagem` apontar para um arquivo existente, a textura entra
 * na frente do volume e recebe o mesmo tratamento (refração, eco temporal,
 * dissolução). Se o arquivo não existir, a composição abstrata continua —
 * sem erro de console e sem buraco visual.
 *
 * ECOS TEMPORAIS: cópias atrás da principal, cada uma saindo com distorção,
 * fragmentação, aberração cromática e partículas. A leitura é "ela está em
 * várias posições no mesmo instante", não "tem três clones parados".
 */

const VERT = /* glsl */ `
  varying vec2 vUvP;
  void main(){
    vUvP = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUvP;
  uniform float uTempo;
  uniform float uAparicao;    // 0..1 entrada
  uniform float uDissolve;    // 0..1 saída fragmentada
  uniform float uEco;         // 0 = principal, >0 = reflexo temporal
  uniform float uAberracao;
  uniform float uEspelhado;   // 1 = é o reflexo no chão
  uniform float uForca;       // some quando a câmera deixa o hero
  uniform vec3  uCorNucleo;
  uniform vec3  uCorBorda;
  uniform sampler2D uMapa;
  uniform float uTemMapa;
  ${GLSL_HASH}
  ${GLSL_NOISE}

  // Silhueta de LUZ: um volume vertical com inclinação de pose.
  // Deliberadamente abstrata — nenhum traço de rosto, arma ou roupa.
  float volume(vec2 p){
    float y = p.y;
    float inclina = (y - 0.5) * 0.14;      // peso jogado à frente
    float x = p.x - 0.5 - inclina;
    float largura =
        mix(0.10, 0.23, 1.0 - smoothstep(0.66, 0.92, y))     // acima dos ombros
      * mix(1.0,  1.30, 1.0 - smoothstep(0.44, 0.66, y))     // tronco
      * mix(1.0,  0.58, 1.0 - smoothstep(0.06, 0.36, y));    // base se afinando
    largura = max(largura, 0.004);
    float corpo = 1.0 - smoothstep(0.0, largura, abs(x));
    float halo  = (1.0 - smoothstep(0.0, largura * 2.6, abs(x))) * 0.42;
    float alt = smoothstep(0.0, 0.10, y) * (1.0 - smoothstep(0.86, 1.0, y));
    float nucleo = pow(max(1.0 - smoothstep(0.0, largura * 0.45, abs(x)), 0.0), 3.0);
    return clamp((corpo * 0.5 + halo) * alt + nucleo * alt * 0.3, 0.0, 1.0);
  }

  void main(){
    vec2 uv = vUvP;
    if (uEspelhado > 0.5) uv.y = 1.0 - uv.y;

    float ab = uAberracao * (0.004 + uEco * 0.01);
    float r = volume(uv + vec2( ab, 0.0));
    float g = volume(uv);
    float b = volume(uv + vec2(-ab, 0.0));

    vec3 cor = mix(uCorBorda, uCorNucleo, g);
    vec3 rgb = vec3(r, g, b);

    // varredura vertical lenta: o volume "respira"
    float varre = 0.80 + 0.20 * sin(uv.y * 9.0 - uTempo * 0.75 + uEco * 2.0);

    // fragmentação na saída: o eco se desfaz em lascas
    float ruido = fbm(uv * vec2(7.0, 14.0) + uEco * 13.0);
    float corte = uDissolve * 1.2;
    float sobra = smoothstep(corte - 0.16, corte + 0.02, ruido);
    float frenteDissolve = (1.0 - smoothstep(0.0, 0.14, abs(ruido - corte))) * step(0.001, uDissolve);

    float alpha = g * varre * sobra * uAparicao;
    if (uTemMapa > 0.5) {
      vec4 tex = texture2D(uMapa, uv);
      vec3 texRgb = tex.rgb;
      // mesma aberração aplicada à arte, quando ela existe
      texRgb.r = texture2D(uMapa, uv + vec2( ab, 0.0)).r;
      texRgb.b = texture2D(uMapa, uv + vec2(-ab, 0.0)).b;
      cor = mix(cor, texRgb, tex.a * 0.94);
      alpha = max(alpha * 0.35, tex.a * varre * sobra * uAparicao);
      rgb = vec3(1.0);
    }

    vec3 saida = cor * (0.26 + rgb * 0.34) * (uEco > 0.5 ? 0.62 : 1.0);
    saida += mix(uCorNucleo, vec3(1.0), 0.5) * frenteDissolve * 2.2;
    alpha *= (uEspelhado > 0.5 ? 0.26 : 0.62) * (uEco > 0.5 ? 0.55 : 1.0) * uForca;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(saida, alpha);
  }
`;

/** sampler2D nunca fica nulo: uma textura 1x1 transparente segura o lugar. */
let TEX_VAZIA = null;
function texturaVazia() {
  if (!TEX_VAZIA) {
    TEX_VAZIA = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
    TEX_VAZIA.needsUpdate = true;
  }
  return TEX_VAZIA;
}

function criarVolume({ eco = 0, espelhado = 0, mapa = null }) {
  const uniforms = {
    uTempo: { value: 0 },
    uAparicao: { value: 0 },
    uDissolve: { value: 0 },
    uEco: { value: eco },
    uAberracao: { value: 1 },
    uEspelhado: { value: espelhado },
    uForca: { value: 1 },
    uCorNucleo: { value: new THREE.Color(0xa9e4ff) },
    uCorBorda: { value: new THREE.Color(eco ? 0x7b61ff : 0x2ea8ff) },
    uMapa: { value: mapa || texturaVazia() },
    uTemMapa: { value: mapa ? 1 : 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const alt = PERSONAGEM.alturaMundo;
  const malha = new THREE.Mesh(new THREE.PlaneGeometry(alt * 0.62, alt, 1, 1), mat);
  malha.userData.uniforms = uniforms;
  return malha;
}

export class Presenca {
  constructor({ envMap, perfil, posicao = new THREE.Vector3(0, 0.6, -7) }) {
    this.grupo = new THREE.Group();
    this.grupo.name = 'presenca';
    this.grupo.position.copy(posicao);
    this.envMap = envMap;
    this.uniformes = [];
    this._mouse = new THREE.Vector2();
    this._mouseSuave = new THREE.Vector2();
    this.tempoEco = 0;

    // --- volume principal ---
    this.principal = criarVolume({});
    this.principal.renderOrder = 6;
    this.grupo.add(this.principal);
    this.uniformes.push(this.principal.userData.uniforms);

    // --- reflexo no chão ---
    this.reflexo = criarVolume({ espelhado: 1 });
    this.reflexo.position.y = -PERSONAGEM.alturaMundo - 0.1;
    this.reflexo.renderOrder = 5;
    this.grupo.add(this.reflexo);
    this.uniformes.push(this.reflexo.userData.uniforms);

    // --- ecos temporais ---
    this.ecos = [];
    for (let i = 0; i < PERSONAGEM.ecos; i++) {
      const m = criarVolume({ eco: i + 1 });
      m.position.set((i % 2 ? -1 : 1) * (1.5 + i * 0.85), 0.12 * i, -1.4 - i * 1.5);
      m.scale.setScalar(1 - i * 0.06);
      m.renderOrder = 4;
      m.userData.fase = i * 2.1;
      this.grupo.add(m);
      this.ecos.push(m);
      this.uniformes.push(m.userData.uniforms);
    }

    // --- arco de lâmina: a diagonal que implica a pose de combate ---
    const arcoGeo = new THREE.TorusGeometry(3.5, 0.035, 6, 96, Math.PI * 1.15);
    this.arcoUniforms = {
      uTempo: { value: 0 },
      uAparicao: { value: 0 },
      uForca: { value: 1 },
      uCor: { value: new THREE.Color(0x9fefff) },
    };
    const arcoMat = new THREE.ShaderMaterial({
      uniforms: this.arcoUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUvP;
        void main(){ vUvP = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUvP; uniform float uTempo; uniform float uAparicao; uniform float uForca; uniform vec3 uCor;
        void main(){
          float cauda = smoothstep(0.0, 0.22, vUvP.x) * (1.0 - smoothstep(0.45, 1.0, vUvP.x));
          float corre = 0.45 + 0.55 * sin(vUvP.x * 10.0 - uTempo * 1.6);
          float a = cauda * corre * uAparicao * 0.7 * uForca;
          gl_FragColor = vec4(uCor * (1.0 + corre), a);
        }
      `,
    });
    this.arco = new THREE.Mesh(arcoGeo, arcoMat);
    this.arco.rotation.set(0.35, 0.2, -0.75);
    this.arco.position.set(0.4, 0.2, -0.4);
    this.arco.renderOrder = 7;
    this.grupo.add(this.arco);

    // --- espiral de cacos ao redor: a personagem cercada de fragmentos ---
    this._montarEspiral(perfil);

    // --- arte oficial, se existir ---
    this._carregarArte();
  }

  _montarEspiral(perfil) {
    const rnd = makeRandom(4242);
    const formas = criarFormasDeCaco(rnd, 4, 0.05);
    const total = Math.max(10, Math.round((perfil.fragmentos.perto || 20) * 0.75));
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1226,
      metalness: 1,
      roughness: 0.07,
      envMap: this.envMap,
      envMapIntensity: 2.6,
      clearcoat: 1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });
    this.espiralMat = mat;
    this.espiral = new THREE.Group();
    this.espiralDados = [];

    const porForma = Math.ceil(total / formas.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();

    for (let f = 0; f < formas.length; f++) {
      const n = Math.min(porForma, total - f * porForma);
      if (n <= 0) break;
      const im = new THREE.InstancedMesh(formas[f], mat, n);
      im.frustumCulled = false;
      const dados = [];
      for (let i = 0; i < n; i++) {
        const t = (f * porForma + i) / total;
        const ang = t * Math.PI * 5.2 + rnd() * 0.5;
        const raio = 1.9 + t * 3.4 + randRange(rnd, -0.5, 0.7);
        const alt = -2.6 + t * 6.2 + randRange(rnd, -0.5, 0.5);
        const esc = randRange(rnd, 0.22, 0.72) * (1 - t * 0.35);
        dados.push({
          ang,
          raio,
          alt,
          esc,
          vel: randRange(rnd, 0.1, 0.4) * (rnd() < 0.5 ? -1 : 1),
          giro: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
          fase: rnd() * 6.28,
        });
        v.set(Math.cos(ang) * raio, alt, Math.sin(ang) * raio * 0.55);
        e.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28);
        q.setFromEuler(e);
        s.setScalar(esc);
        m4.compose(v, q, s);
        im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
      im.userData.dados = dados;
      this.espiral.add(im);
      this.espiralDados.push(im);
    }
    this.grupo.add(this.espiral);
  }

  _carregarArte() {
    if (!PERSONAGEM.imagem) return;
    const base = import.meta.env?.BASE_URL || './';
    const url = new URL(PERSONAGEM.imagem, new URL(base, location.href)).href;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        for (const u of this.uniformes) {
          u.uMapa.value = tex;
          u.uTemMapa.value = 1;
        }
        this.temArte = true;
      },
      undefined,
      () => {
        /* sem arte: a composição abstrata segue valendo */
      }
    );
  }

  set mouse(v) {
    this._mouse.set(v.x, v.y);
  }

  /** Entrada cinematográfica: o volume nasce, depois os ecos aparecem. */
  revelar(gsap) {
    const alvos = [this.principal.userData.uniforms.uAparicao, this.reflexo.userData.uniforms.uAparicao];
    gsap.to(alvos, { value: 1, duration: 2.4, ease: 'power2.out', delay: 0.1 });
    gsap.to(this.arcoUniforms.uAparicao, { value: 1, duration: 1.6, ease: 'power3.out', delay: 1.1 });
    this.ecos.forEach((m, i) => {
      gsap.to(m.userData.uniforms.uAparicao, {
        value: 1,
        duration: 1.2,
        ease: 'power2.out',
        delay: 1.5 + i * 0.55,
      });
    });
  }

  atualizar(dt, tempoEscalado, estado) {
    this._mouseSuave.x = damp(this._mouseSuave.x, this._mouse.x, 0.0025, dt);
    this._mouseSuave.y = damp(this._mouseSuave.y, this._mouse.y, 0.0025, dt);
    this.tempoEco += dt;

    // a presença pertence ao hero: perde força conforme a câmera avança
    const forca = clamp(1 - (estado.progresso || 0) / 0.16, 0, 1);
    for (const u of this.uniformes) {
      u.uTempo.value = tempoEscalado;
      u.uAberracao.value = 1 + estado.distorcao * 6 + estado.onda * 4;
      u.uForca.value = damp(u.uForca.value, forca, 0.004, dt);
    }
    this.arcoUniforms.uTempo.value = tempoEscalado;
    this.arcoUniforms.uForca.value = damp(this.arcoUniforms.uForca.value, forca, 0.004, dt);
    this.espiral.visible = forca > 0.02;
    if (this.espiralMat) this.espiralMat.opacity = forca;

    // o volume principal acompanha o mouse com peso — nunca de forma brusca
    this.principal.position.x = damp(this.principal.position.x, this._mouseSuave.x * 0.42, 0.003, dt);
    this.principal.rotation.y = damp(this.principal.rotation.y, this._mouseSuave.x * -0.22, 0.003, dt);
    this.reflexo.position.x = this.principal.position.x;
    this.reflexo.rotation.y = this.principal.rotation.y;

    // ecos: cada um pulsa e se desfaz no seu próprio compasso
    this.ecos.forEach((m, i) => {
      const u = m.userData.uniforms;
      const ciclo = (this.tempoEco * 0.42 + m.userData.fase) % 6.283;
      const vivo = clamp(Math.sin(ciclo) * 1.6, -1, 1);
      const alvoDiss = vivo > 0 ? 0 : Math.min(0.95, -vivo * 1.1);
      u.uDissolve.value = damp(u.uDissolve.value, Math.max(alvoDiss, estado.dissolve), 0.004, dt);
      m.position.x = damp(
        m.position.x,
        (i % 2 ? -1 : 1) * (1.5 + i * 0.85) + this._mouseSuave.x * (0.9 + i * 0.5),
        0.004,
        dt
      );
      m.position.y = 0.12 * i + Math.sin(tempoEscalado * 0.5 + i) * 0.16;
    });

    this.principal.userData.uniforms.uDissolve.value = damp(
      this.principal.userData.uniforms.uDissolve.value,
      estado.dissolve,
      0.004,
      dt
    );

    // espiral de cacos orbitando a presença
    for (const im of this.espiralDados) {
      const dados = im.userData.dados;
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const v = new THREE.Vector3();
      const s = new THREE.Vector3();
      for (let i = 0; i < dados.length; i++) {
        const d = dados[i];
        d.ang += dt * d.vel * 0.22;
        const raio = d.raio + Math.sin(tempoEscalado * 0.3 + d.fase) * 0.22;
        v.set(
          Math.cos(d.ang) * raio + this._mouseSuave.x * 0.6,
          d.alt + Math.sin(tempoEscalado * 0.45 + d.fase) * 0.3 + this._mouseSuave.y * 0.3,
          Math.sin(d.ang) * raio * 0.55
        );
        q.setFromAxisAngle(d.giro, tempoEscalado * d.vel + d.fase);
        s.setScalar(d.esc * (1 - estado.dissolve * 0.85));
        m4.compose(v, q, s);
        im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
    }

    this.arcoUniforms.uAparicao.value = damp(
      this.arcoUniforms.uAparicao.value,
      (1 - estado.dissolve) * (estado.presencaVisivel ? 1 : 0.12),
      0.004,
      dt
    );
  }

  destruir() {
    this.grupo.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material && o.material !== this.espiralMat) o.material.dispose?.();
    });
    this.espiralMat?.dispose();
  }
}
