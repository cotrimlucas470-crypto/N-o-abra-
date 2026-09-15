import * as THREE from 'three';
import { GLSL_HASH } from './shaders/noise.js';
import { clamp, damp } from '../utils/math.js';

/**
 * PÓS-PROCESSAMENTO PRÓPRIO.
 *
 * Cadeia enxuta, escrita à mão em vez do EffectComposer, porque a
 * profundidade de campo precisa do depth buffer da MESMA passada de cena
 * (o ping-pong do composer perde isso) e porque assim o custo cai:
 *
 *   cena (HalfFloat + DepthTexture)
 *     → brilho (1/2)  → borrão H/V (1/4, duas passadas)
 *     → passada final: DOF por profundidade, bloom, aberração cromática
 *       radial, glitch temporal, onda de choque, vinheta, grão e scanline.
 *
 * Em tier 0 a cena vai direto para a tela, sem nenhum alvo intermediário.
 */

const VERT_QUAD = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

class Quad {
  constructor() {
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    this.mesh = new THREE.Mesh(this.geo, null);
    this.cena = new THREE.Scene();
    this.cena.add(this.mesh);
  }
  render(renderer, material, alvo) {
    this.mesh.material = material;
    renderer.setRenderTarget(alvo || null);
    renderer.render(this.cena, this.cam);
  }
  dispose() {
    this.geo.dispose();
  }
}

export class PosProcessamento {
  constructor(renderer, cena, camera, perfil) {
    this.renderer = renderer;
    this.cena = cena;
    this.camera = camera;
    this.perfil = perfil;
    this.quad = new Quad();
    this.tamanho = new THREE.Vector2(1, 1);
    this.pixelRatio = 1;
    this._aberracao = 0;
    this._glitch = 0;

    this.matBrilho = new THREE.ShaderMaterial({
      uniforms: {
        tDif: { value: null },
        uCorte: { value: 0.58 },
        uJoelho: { value: 0.38 },
        uTexel: { value: new THREE.Vector2() },
      },
      vertexShader: VERT_QUAD,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv; uniform sampler2D tDif; uniform float uCorte; uniform float uJoelho;
        uniform vec2 uTexel;
        vec3 amostra(vec2 o){ return texture2D(tDif, vUv + o * uTexel).rgb; }
        void main(){
          vec3 c = amostra(vec2(0.0)) * 0.5
                 + amostra(vec2( 1.0, 0.0)) * 0.125 + amostra(vec2(-1.0, 0.0)) * 0.125
                 + amostra(vec2( 0.0, 1.0)) * 0.125 + amostra(vec2( 0.0,-1.0)) * 0.125;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          float s = clamp((l - uCorte) / max(uJoelho, 0.0001), 0.0, 1.0);
          gl_FragColor = vec4(c * s * s, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.matBorrao = new THREE.ShaderMaterial({
      uniforms: { tDif: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: VERT_QUAD,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv; uniform sampler2D tDif; uniform vec2 uDir;
        void main(){
          vec3 c = texture2D(tDif, vUv).rgb * 0.227027;
          c += texture2D(tDif, vUv + uDir * 1.3846).rgb * 0.316216;
          c += texture2D(tDif, vUv - uDir * 1.3846).rgb * 0.316216;
          c += texture2D(tDif, vUv + uDir * 3.2308).rgb * 0.070270;
          c += texture2D(tDif, vUv - uDir * 3.2308).rgb * 0.070270;
          gl_FragColor = vec4(c, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.matFinal = new THREE.ShaderMaterial({
      defines: { USAR_DOF: perfil.dof ? 1 : 0, USAR_BLOOM: perfil.bloom ? 1 : 0 },
      uniforms: {
        tCena: { value: null },
        tBloom: { value: null },
        tProf: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uTempo: { value: 0 },
        uBloom: { value: perfil.bloomForca },
        uAberracao: { value: 0 },
        uGlitch: { value: 0 },
        uOnda: { value: 0 },
        uOndaCentro: { value: new THREE.Vector2(0.5, 0.5) },
        uVinheta: { value: 1 },
        uGrao: { value: 0.028 },
        uFoco: { value: 12 },
        uFaixaFoco: { value: 9 },
        uMaxBorrao: { value: 1.6 },
        uNear: { value: 0.1 },
        uFar: { value: 400 },
        uEscurecer: { value: 0 },
        uFade: { value: 0 },
      },
      vertexShader: VERT_QUAD,
      fragmentShader: /* glsl */ `
        precision highp float;
        #include <packing>
        varying vec2 vUv;
        uniform sampler2D tCena, tBloom, tProf;
        uniform vec2 uTexel, uOndaCentro;
        uniform float uTempo, uBloom, uAberracao, uGlitch, uOnda, uVinheta, uGrao;
        uniform float uFoco, uFaixaFoco, uMaxBorrao, uNear, uFar, uEscurecer, uFade;
        ${GLSL_HASH}

        float profundidadeVista(vec2 uv){
          float d = texture2D(tProf, uv).x;
          return -perspectiveDepthToViewZ(d, uNear, uFar);
        }

        vec3 corDeCena(vec2 uv, float raio){
          #if USAR_DOF
            if (raio > 0.35) {
              vec3 soma = vec3(0.0);
              float ang = hash21(uv * 137.0) * 6.2831853;
              for (int i = 0; i < 8; i++){
                float fi = float(i);
                float a = ang + fi * 0.7853982;
                float r = raio * (0.35 + 0.65 * fract(fi * 0.37));
                soma += texture2D(tCena, uv + vec2(cos(a), sin(a)) * r * uTexel).rgb;
              }
              return soma * 0.125;
            }
          #endif
          return texture2D(tCena, uv).rgb;
        }

        vec3 paraSRGB(vec3 c){
          c = max(c, vec3(0.0));
          return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
        }

        void main(){
          vec2 uv = vUv;
          vec2 dc = uv - 0.5;
          float r2 = dot(dc, dc);

          // onda de choque: anel que empurra os pixels para fora
          if (uOnda > 0.001){
            vec2 d = uv - uOndaCentro;
            float dist = length(d);
            float anel = smoothstep(0.06, 0.0, abs(dist - (1.0 - uOnda) * 0.9));
            uv += normalize(d + 1e-6) * anel * uOnda * 0.045;
          }

          // glitch temporal: blocos horizontais deslocados
          if (uGlitch > 0.001){
            float faixa = floor(uv.y * 38.0);
            float salto = (hash11(faixa + floor(uTempo * 11.0)) - 0.5);
            float ativa = step(0.72, hash11(faixa * 1.7 + floor(uTempo * 7.0)));
            uv.x += salto * 0.06 * uGlitch * ativa;
          }

          float prof = profundidadeVista(uv);
          float coc = 0.0;
          #if USAR_DOF
            coc = clamp(abs(prof - uFoco) / max(uFaixaFoco, 0.001), 0.0, 1.0);
            coc = pow(coc, 1.45) * uMaxBorrao * 6.0;
          #endif

          // aberração cromática radial: forte só nos momentos que pedem
          float ab = (uAberracao * 0.0035 + uGlitch * 0.006) * (0.35 + r2 * 2.4);
          vec3 cor;
          cor.r = corDeCena(uv + dc * ab, coc).r;
          cor.g = corDeCena(uv, coc).g;
          cor.b = corDeCena(uv - dc * ab, coc).b;

          #if USAR_BLOOM
            vec3 bl = texture2D(tBloom, uv).rgb;
            cor += bl * uBloom;
          #endif

          // o escurecimento é aplicado aos materiais do salão, não ao quadro
          // inteiro: assim o objeto em foco continua aceso enquanto o
          // ambiente ao redor apaga.
          // vinheta
          float vin = 1.0 - smoothstep(0.18, 0.95, r2 * 1.9);
          cor *= mix(1.0, vin, uVinheta);

          // scanline quase invisível + grão cinematográfico
          cor *= 1.0 - 0.025 * step(0.5, fract(gl_FragCoord.y * 0.5));
          float g = hash21(gl_FragCoord.xy + fract(uTempo) * 133.0) - 0.5;
          float lum = dot(cor, vec3(0.2126, 0.7152, 0.0722));
          cor += g * uGrao * (0.35 + lum * 1.3);

          cor = mix(cor, vec3(0.0), uFade);
          gl_FragColor = vec4(paraSRGB(cor), 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
  }

  get ativo() {
    return this.perfil.posFinal;
  }

  definirPerfil(perfil) {
    this.perfil = perfil;
    this.matFinal.defines.USAR_DOF = perfil.dof ? 1 : 0;
    this.matFinal.defines.USAR_BLOOM = perfil.bloom ? 1 : 0;
    this.matFinal.uniforms.uBloom.value = perfil.bloomForca;
    this.matFinal.needsUpdate = true;
    this.redimensionar(this.tamanho.x, this.tamanho.y, this.pixelRatio);
  }

  redimensionar(largura, altura, pixelRatio) {
    this.tamanho.set(largura, altura);
    this.pixelRatio = pixelRatio;
    const w = Math.max(2, Math.floor(largura * pixelRatio));
    const h = Math.max(2, Math.floor(altura * pixelRatio));
    this._w = w;
    this._h = h;
    this.descartarAlvos();
    if (!this.ativo) return;

    const opts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    };
    this.rtCena = new THREE.WebGLRenderTarget(w, h, opts);
    this.rtCena.depthTexture = new THREE.DepthTexture(w, h);
    this.rtCena.depthTexture.type = THREE.UnsignedIntType;

    if (this.perfil.bloom) {
      const bw = Math.max(2, Math.floor(w / 2));
      const bh = Math.max(2, Math.floor(h / 2));
      const qw = Math.max(2, Math.floor(w / 4));
      const qh = Math.max(2, Math.floor(h / 4));
      this.rtBrilho = new THREE.WebGLRenderTarget(bw, bh, opts);
      this.rtA = new THREE.WebGLRenderTarget(qw, qh, opts);
      this.rtB = new THREE.WebGLRenderTarget(qw, qh, opts);
      this.matBrilho.uniforms.uTexel.value.set(1 / w, 1 / h);
    }
    this.matFinal.uniforms.uTexel.value.set(1 / w, 1 / h);
    this.matFinal.uniforms.uNear.value = this.camera.near;
    this.matFinal.uniforms.uFar.value = this.camera.far;
  }

  descartarAlvos() {
    for (const k of ['rtCena', 'rtBrilho', 'rtA', 'rtB']) {
      if (this[k]) {
        this[k].dispose();
        this[k] = null;
      }
    }
  }

  render(dt, estado) {
    const r = this.renderer;
    if (!this.ativo || !this.rtCena) {
      r.setRenderTarget(null);
      r.render(this.cena, this.camera);
      return;
    }

    r.setRenderTarget(this.rtCena);
    r.clear();
    r.render(this.cena, this.camera);

    if (this.perfil.bloom && this.rtBrilho) {
      this.matBrilho.uniforms.tDif.value = this.rtCena.texture;
      this.quad.render(r, this.matBrilho, this.rtBrilho);

      this.matBorrao.uniforms.tDif.value = this.rtBrilho.texture;
      this.matBorrao.uniforms.uDir.value.set(1.2 / this.rtA.width, 0);
      this.quad.render(r, this.matBorrao, this.rtA);

      this.matBorrao.uniforms.tDif.value = this.rtA.texture;
      this.matBorrao.uniforms.uDir.value.set(0, 1.2 / this.rtA.height);
      this.quad.render(r, this.matBorrao, this.rtB);

      this.matBorrao.uniforms.tDif.value = this.rtB.texture;
      this.matBorrao.uniforms.uDir.value.set(2.6 / this.rtA.width, 0);
      this.quad.render(r, this.matBorrao, this.rtA);

      this.matBorrao.uniforms.tDif.value = this.rtA.texture;
      this.matBorrao.uniforms.uDir.value.set(0, 2.6 / this.rtA.height);
      this.quad.render(r, this.matBorrao, this.rtB);

      this.matFinal.uniforms.tBloom.value = this.rtB.texture;
    }

    const u = this.matFinal.uniforms;
    u.tCena.value = this.rtCena.texture;
    u.tProf.value = this.rtCena.depthTexture;
    u.uTempo.value = estado.tempoReal;
    this._aberracao = damp(this._aberracao, estado.aberracao, 0.002, dt);
    this._glitch = damp(this._glitch, estado.glitch, 0.0015, dt);
    u.uAberracao.value = this._aberracao;
    u.uGlitch.value = this._glitch;
    u.uOnda.value = estado.onda;
    u.uEscurecer.value = estado.escurecer;
    u.uFade.value = estado.fade || 0;
    u.uFoco.value = damp(u.uFoco.value, estado.foco ?? 12, 0.004, dt);
    u.uNear.value = this.camera.near;
    u.uFar.value = this.camera.far;

    this.quad.render(r, this.matFinal, null);
  }

  dispose() {
    this.descartarAlvos();
    this.matBrilho.dispose();
    this.matBorrao.dispose();
    this.matFinal.dispose();
    this.quad.dispose();
  }
}
