import * as THREE from 'three';
import { GLSL_HASH, GLSL_NOISE, GLSL_ROT, GLSL_RACHADURA } from './noise.js';

/**
 * MATERIAL DOS CACOS DE ESPELHO.
 *
 * Base: MeshPhysicalMaterial de verdade (metalness / roughness / envMap /
 * transmissão opcional) — o vidro reflete o ambiente, não é um plástico
 * colorido. Por cima, injeções GLSL adicionam o que o material padrão não faz:
 *
 *  · rotação e deriva próprias de cada instância, calculadas na GPU
 *  · resposta a mouse e scroll por instância
 *  · rachaduras procedurais (Voronoi) em parte dos cacos
 *  · borda espectral (fresnel ciano/roxo) e brilho de aresta
 *  · dissolução com frente luminosa — usada ao quebrar o tempo e no final
 *  · escurecimento contextual quando o salão foca em outro objeto
 */
export function criarMaterialFragmento({
  envMap,
  transmissao = false,
  cor = 0x0b1022,
  rugosidade = 0.12,
  metalico = 1.0,
  opacidade = 1.0,
} = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(cor),
    metalness: metalico,
    roughness: rugosidade,
    envMap: envMap || null,
    envMapIntensity: transmissao ? 2.4 : 1.9,
    transparent: opacidade < 1 || transmissao,
    opacity: opacidade,
    side: THREE.DoubleSide,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    iridescence: transmissao ? 0.45 : 0.22,
    iridescenceIOR: 1.35,
    reflectivity: 0.9,
    premultipliedAlpha: false,
  });

  if (transmissao) {
    mat.transmission = 0.72;
    mat.thickness = 0.55;
    mat.ior = 1.52;
    mat.attenuationColor = new THREE.Color(0x7fd8ff);
    mat.attenuationDistance = 3.5;
    mat.roughness = 0.06;
    mat.metalness = 0.25;
  }

  const uniforms = {
    uTempo: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uMouseForca: { value: 0.35 },
    uDeriva: { value: 0.32 },
    uScroll: { value: 0 },
    uDissolve: { value: 0 },
    uOnda: { value: 0 },
    uEscurecer: { value: 0 },
    uRimA: { value: new THREE.Color(0x00e5ff) },
    uRimB: { value: new THREE.Color(0x7b61ff) },
    uRimForca: { value: 1.0 },
    uRachadura: { value: 1.0 },
  };
  mat.userData.uniforms = uniforms;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        attribute float aSeed;
        attribute float aVel;
        attribute float aBrilho;
        attribute float aRug;
        attribute float aEscalaInv;
        attribute vec3  aEixo;
        uniform float uTempo;
        uniform vec2  uMouse;
        uniform float uMouseForca;
        uniform float uDeriva;
        uniform float uScroll;
        uniform float uOnda;
        varying float vSeed;
        varying float vBrilho;
        varying float vRug;
        varying vec3  vLocal;
        ${GLSL_HASH}
        ${GLSL_ROT}
        mat3 fragRot;
      `
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
        float faseF = uTempo * aVel + aSeed * 6.2831853;
        fragRot = rotAxis(aEixo, faseF);
        vec3 objectNormal = fragRot * vec3( normal );
        #ifdef USE_TANGENT
          vec3 objectTangent = fragRot * vec3( tangent.xyz );
        #endif
      `
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        vSeed = aSeed; vBrilho = aBrilho; vRug = aRug; vLocal = position;
        vec3 transformed = fragRot * vec3( position );

        // deriva própria: cada caco flutua no seu ritmo
        float d1 = sin(uTempo * 0.43 * aVel + aSeed * 11.0);
        float d2 = cos(uTempo * 0.37 * aVel + aSeed * 7.3);
        float d3 = sin(uTempo * 0.29 * aVel + aSeed * 4.1);
        transformed += vec3(d1, d2 * 1.4, d3) * uDeriva * aEscalaInv;

        // mouse e scroll empurram o campo com peso diferente por caco
        float peso = 0.45 + 0.55 * hash11(aSeed * 3.1);
        transformed += vec3(uMouse.x, uMouse.y, 0.0) * uMouseForca * peso * aEscalaInv;
        transformed.y += uScroll * 0.12 * peso * aEscalaInv;

        // onda de choque ao quebrar o tempo: empurrão radial curto
        transformed += normalize(position + vec3(0.001)) * uOnda * 0.55 * peso * aEscalaInv;
      `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform float uDissolve;
        uniform float uEscurecer;
        uniform float uOnda;
        uniform float uRimForca;
        uniform float uRachadura;
        uniform vec3  uRimA;
        uniform vec3  uRimB;
        uniform float uTempo;
        varying float vSeed;
        varying float vBrilho;
        varying float vRug;
        varying vec3  vLocal;
        ${GLSL_HASH}
        ${GLSL_NOISE}
        ${GLSL_RACHADURA}
      `
      )
      // dissolução: descarta antes de qualquer cálculo caro
      .replace(
        '#include <clipping_planes_fragment>',
        /* glsl */ `
        #include <clipping_planes_fragment>
        float dissolveRuido = fbm(vLocal.xy * 4.5 + vSeed * 20.0);
        float corteD = uDissolve * 1.25;
        if (dissolveRuido < corteD - 0.12) discard;
        float bordaDissolve = (1.0 - smoothstep(corteD - 0.12, corteD, dissolveRuido)) * step(0.001, uDissolve);
      `
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `
        #include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * vRug, 0.015, 0.95);
      `
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        #include <normal_fragment_maps>
        // rachaduras: poucas peças, linhas finíssimas, leitura de vidro trincado
        float temRachadura = step(0.80, hash11(vSeed * 37.13)) * uRachadura;
        vec2 rq = rachaduras(vLocal.xy * (1.6 + 2.2 * hash11(vSeed * 5.0)) + vSeed * 13.0);
        float linha = (1.0 - smoothstep(0.0, 0.012, rq.x)) * temRachadura;
        float fio = (1.0 - smoothstep(0.012, 0.030, rq.x)) * temRachadura * 0.5;
        normal = normalize(normal + vec3(linha * 0.35 * (rq.y - 0.5), linha * 0.35 * (rq.y - 0.5), 0.0));
      `
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `
        #include <emissivemap_fragment>
        vec3 vDirF = normalize(vViewPosition);
        float fres = pow(1.0 - clamp(dot(normalize(normal), vDirF), 0.0, 1.0), 3.2);
        vec3 corRim = mix(uRimA, uRimB, hash11(vSeed * 91.7));
        totalEmissiveRadiance += corRim * fres * (0.22 + vBrilho * 0.85) * uRimForca;
        totalEmissiveRadiance += corRim * 0.035 * (0.35 + vBrilho) * uRimForca;
        // a trinca é uma fenda ESCURA com um fio de luz ao lado
        diffuseColor.rgb *= (1.0 - linha * 0.75);
        totalEmissiveRadiance += corRim * fio * 0.12 * (0.4 + vBrilho);
        totalEmissiveRadiance += mix(uRimA, vec3(1.0), 0.4) * bordaDissolve * 2.6;
        totalEmissiveRadiance += corRim * uOnda * 0.5 * fres;
      `
      )
      .replace(
        '#include <dithering_fragment>',
        /* glsl */ `
        #include <dithering_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.16, uEscurecer);
      `
      );
  };

  // chaves distintas evitam que o three reaproveite um programa já compilado
  mat.customProgramCacheKey = () => `caco-${transmissao ? 't' : 'o'}`;
  return mat;
}
