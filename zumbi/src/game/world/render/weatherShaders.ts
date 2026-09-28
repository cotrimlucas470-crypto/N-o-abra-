/**
 * Shaders do CLIMA (GLSL ES 1.0, WebGL 1 — roda em qualquer celular).
 *
 * A neve, a água e o gelo são calculados PIXEL A PIXEL em coordenadas do
 * mundo, a partir de três coisas:
 * 1. o próprio desenho do chão/telhado (a neve pega primeiro nas partes
 *    claras — ponta do tufo de grama, topo da telha — e as juntas continuam
 *    aparecendo): a neve pertence ao material;
 * 2. dados por lugar, suavizados (quanto segura neve, parte baixa, pisado);
 * 3. ruído contínuo do mundo (duas texturas periódicas amostradas em escalas
 *    que não são múltiplas e giradas): nada se repete, não há costura de tile.
 *
 * O clima entra como números (uniforms): mudar o tempo não reescreve nada.
 * Saída pré-multiplicada (a mistura do Phaser é ONE, ONE_MINUS_SRC_ALPHA).
 * As texturas sobem invertidas na vertical (convenção do Phaser 4), por isso
 * o y das coordenadas de textura é negado/espelhado.
 */

/** Cabeçalho padrão dos shaders do Phaser 4 (os #pragma são preenchidos por ele). */
const HEADER = `#pragma phaserTemplate(shaderName)
#pragma phaserTemplate(extensions)
#pragma phaserTemplate(features)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#pragma phaserTemplate(fragmentDefine)
varying vec2 outTexCoord;
#pragma phaserTemplate(outVariables)
#pragma phaserTemplate(fragmentHeader)
`;

/** Ruído do mundo, cor da neve e composição — comum ao chão e aos telhados. */
const COMMON = `
uniform sampler2D uNoiseA;
uniform sampler2D uNoiseB;

// Amostra no mundo (px, y para baixo). 1/256 = tamanho da textura periódica.
vec4 noiseA(vec2 p) { return texture2D(uNoiseA, vec2(p.x, -p.y) * 0.00390625); }
vec4 noiseB(vec2 p) { return texture2D(uNoiseB, vec2(p.x, -p.y) * 0.00390625); }
// Gira ~37 graus: a segunda amostra não fica alinhada com a primeira.
vec2 rot(vec2 p) { return vec2(p.x * 0.7986 - p.y * 0.6018, p.x * 0.6018 + p.y * 0.7986); }

// Neve NOVA (branca, sombra azulada) → VELHA (cinza, sombra suja).
vec3 snowColor(float shade, float old) {
  vec3 hiN = vec3(0.965, 0.975, 0.99);
  vec3 loN = vec3(0.64, 0.7, 0.8);
  vec3 hiO = vec3(0.83, 0.835, 0.84);
  vec3 loO = vec3(0.53, 0.55, 0.59);
  return mix(mix(loN, hiN, shade), mix(loO, hiO, shade), old);
}

// Camada por cima do que já foi composto (tudo pré-multiplicado).
vec4 over(vec4 acc, vec3 c, float a) {
  return vec4(c * a + acc.rgb * (1.0 - a), a + acc.a * (1.0 - a));
}
`;

/**
 * CHÃO: neve por material, geada, chão molhado com brilho, poças com anéis
 * de gota, gelo e folhas caídas do outono. 1 quad do tamanho da cidade
 * (coordenada de textura = px do mundo).
 */
export const GROUND_FRAG = `${HEADER}${COMMON}
uniform sampler2D uCells;   // R segura neve, G parte baixa, B copa (suavizado)
uniform sampler2D uMats;    // R material*40 + rua*10, G tile*5, B brilho médio do tile
uniform sampler2D uTramp;   // R pisado / frente de porta
uniform sampler2D uTiles;   // o tileset do chão
uniform vec2 uGrid;         // tiles da cidade (largura, altura)
uniform vec2 uTileTex;      // tamanho do tileset em px
uniform float uSnow;        // cobertura de neve da cidade 0..1
uniform float uFrost;       // geada 0..1
uniform float uWet;         // superfície molhada 0..1
uniform float uPuddle;      // água acumulada (tamanho das poças) 0..1
uniform float uIce;         // gelo nas poças 0..1
uniform float uOld;         // neve velha (dias sem nevar) 0..1
uniform float uMelt;        // derretendo 0..1
uniform float uRain;        // chuva caindo agora 0..1 (anéis nas poças)
uniform float uTime;        // segundos
uniform float uDay;         // luz do dia 0..1
uniform float uLeaves;      // folhas caídas no chão (outono) 0..1
uniform float uLeafTone;    // 0 amarelo/laranja → 1 marrom
uniform vec3 uGrassFrom;    // cor da grama na fase atual da época
uniform vec3 uGrassTo;      // ... e na próxima
uniform vec2 uGrassA;       // quanto cada uma cobre (0 = a grama original de verão)
uniform float uGrassT;      // quanto já passou da atual para a próxima 0..1
uniform float uWeatherOn;   // 0 = sem neve/água/geada/folhas: só a cor da grama
uniform float uDebug;

vec2 gridUv(vec2 c) { return vec2(c.x / uGrid.x, 1.0 - c.y / uGrid.y); }

void main() {
  vec2 wp = outTexCoord;
  vec2 c = wp / 64.0;
  vec2 ci = floor(c);
  if (ci.x < 0.0 || ci.y < 0.0 || ci.x >= uGrid.x || ci.y >= uGrid.y) { gl_FragColor = vec4(0.0); return; }
  vec3 m = texture2D(uMats, gridUv(ci + 0.5)).rgb * 255.0;
  float mat = floor((m.r + 0.5) / 40.0);
  if (mat < 0.5) { gl_FragColor = vec4(0.0); return; }
  float road = floor(mod(m.r + 0.5, 40.0) / 10.0);
  // Pesos por material: grama, terra, asfalto, calçada, concreto.
  float gG = 1.0 - step(1.5, mat);
  float gD = step(1.5, mat) - step(2.5, mat);
  float gA = step(2.5, mat) - step(3.5, mat);
  float gS = step(3.5, mat) - step(4.5, mat);
  float gC = step(4.5, mat);
  float hard = gA + gS + gC;
  // Tempo seco e limpo: só a grama muda de cor; o resto sai daqui (barato).
  if (uWeatherOn < 0.5 && gG < 0.5 && uDebug < 0.5) { gl_FragColor = vec4(0.0); return; }

  vec3 cell = texture2D(uCells, gridUv(c)).rgb;
  float tramp = texture2D(uTramp, gridUv(c)).r;
  if (uDebug > 0.5) { gl_FragColor = vec4(cell.r, tramp, mat / 5.0, 1.0); return; }

  // O desenho do chão neste pixel: o claro/escuro dele guia a neve (tufo, junta).
  float idx = floor((m.g + 0.5) / 5.0);
  vec2 tl = vec2(floor(mod(idx, 4.0) + 0.5), floor(idx / 4.0 + 0.001)) * 64.0;
  vec2 lp = clamp(fract(c) * 64.0, 0.5, 63.5);
  vec3 base = texture2D(uTiles, vec2((tl.x + lp.x) / uTileTex.x, 1.0 - (tl.y + lp.y) / uTileTex.y)).rgb;
  float lum = dot(base, vec3(0.3, 0.59, 0.11));
  float detail = clamp((lum - m.b / 255.0) * 4.0, -1.0, 1.0);

  // Ruído do mundo: montinhos em três escalas (a menor, girada, dá o grão
  // de torrão com lado claro e lado azulado), manchas grandes.
  vec4 a2 = noiseA(rot(wp) * 0.23 + vec2(91.0, 37.0));
  vec4 b1 = noiseB(wp * 0.45 + vec2(5.0, 11.0));

  // ------------------------------------------------------------ cor da grama pela época
  // Amarela/seca/volta em MANCHAS que avançam aos poucos (nunca tile a tile);
  // o claro/escuro do desenho original continua (tufo, grama escura).
  vec4 acc = vec4(0.0);
  if (gG > 0.5 && uGrassA.x + uGrassA.y > 0.0) {
    float gt = smoothstep(0.3, 0.7, uGrassT + (b1.r - 0.5) * 0.8 + (a2.r - 0.5) * 0.3);
    acc = over(acc, mix(uGrassFrom, uGrassTo, gt) * (lum / 0.405), mix(uGrassA.x, uGrassA.y, gt) * 0.95);
  }
  if (uWeatherOn < 0.5) { gl_FragColor = acc; return; }
  vec4 a1 = noiseA(wp * 0.55);
  vec4 a3 = noiseA(rot(wp.yx) * 1.35 + vec2(13.0, 71.0));
  float grain = a3.b;
  float mound = a1.r * 0.45 + a2.r * 0.25 + a3.r * 0.3;
  float lit = a1.g * 0.4 + a2.g * 0.18 + a3.g * 0.42;

  // ------------------------------------------------------------ neve
  // Onde a neve "pega" primeiro: relevo + desenho do material.
  float dW = gG * 0.42 + gD * 0.3 + gA * 0.12 + gS * 0.45 + gC * 0.25;
  float f = mix(mound, clamp(0.5 + detail * 0.5, 0.0, 1.0), dW);
  // Neve velha e derretendo: sobra em MANCHAS grandes (sombra, montes), não em pontinhos.
  float oldK = clamp(uOld * 0.9 + uMelt * 0.8, 0.0, 0.85);
  f = mix(f, b1.r * 0.6 + a2.r * 0.25 + a3.r * 0.15, oldK);
  if (gA > 0.5) {
    // Rua: a neve fica em faixas ao longo dela (rastro dos carros, vento).
    vec2 sp = road > 1.5 ? vec2(wp.y, wp.x) : wp;
    float streak = noiseB(vec2(sp.x * 0.3, sp.y * 0.42) + vec2(3.0, 17.0)).b;
    f = mix(f, streak, road > 0.5 ? 0.45 : 0.2);
  }
  // Quanto cobre aqui: a neve da cidade × o quanto o lugar segura × material.
  float sm = smoothstep(0.0, 0.3, uSnow);
  float bias = (gG * 0.06 + gD * 0.02 - gA * (0.2 + uMelt * 0.14) - gS * 0.03 - gC * 0.04) * sm;
  float cov = uSnow * 1.15 * (0.55 + cell.r * 0.9) + bias - tramp * 0.08 * sm;
  float e = f - (1.0 - cov);
  float t = clamp(e / 0.4, 0.0, 1.0);
  float snowA = smoothstep(0.0, 0.035, e) * step(0.004, uSnow);
  // Velha: manchas contínuas (nunca por tile); pisada e perto da rua suja antes.
  float old = clamp(uOld * (1.2 + (b1.r - 0.5) * 0.9) + tramp * 0.65 + hard * 0.16 * sm * step(0.02, uOld + tramp), 0.0, 1.0);
  float lumps = mix(2.3, 1.0, old) * (1.0 - tramp * 0.6) * (0.65 + 0.35 * gG + 0.15 * gD);
  float shade = 0.66 + (lit - 0.5) * lumps + (t - 0.45) * 0.3 + detail * 0.05;
  shade -= (1.0 - smoothstep(0.0, 0.1, e)) * 0.32;
  // Rampa curta (semi pixel art): a luz vem em degraus suaves, não em aerógrafo.
  shade = mix(shade, floor(shade * 7.0 + 0.5) / 7.0, 0.55);
  vec3 sc = snowColor(clamp(shade, 0.0, 1.0), old);
  sc *= 0.955 + grain * 0.09;
  sc += step(0.992, grain) * (1.0 - old) * uDay * t * 0.12;
  sc = mix(sc, vec3(0.43, 0.39, 0.35), step(grain, 0.035 * old * (0.4 + hard)) * 0.6);
  // Asfalto: neve fina vira lama cinza, meio transparente.
  float slush = gA * (1.0 - t) * (0.5 + uMelt * 0.5);
  sc = mix(sc, vec3(0.53, 0.56, 0.6), slush * 0.6);
  snowA *= (1.0 - slush * 0.45) * (1.0 - uMelt * (1.0 - t) * 0.35);

  // ------------------------------------------------------------ geada
  float frostK = uFrost * (gG + gD * 0.8 + hard * 0.5)
    * smoothstep(0.25, 0.7, clamp(0.5 + detail * 0.6 + (grain - 0.5) * 0.7 + (a1.r - 0.5) * 0.3, 0.0, 1.0));

  // ------------------------------------------------------------ molhado
  float snowNear = step(0.02, uSnow);
  float wetL = max(uWet, uMelt * 0.55 * snowNear);
  vec3 wetC = gG * vec3(0.065, 0.11, 0.05) + gD * vec3(0.1, 0.072, 0.05) + gA * vec3(0.028, 0.032, 0.042) + (gS + gC) * vec3(0.07, 0.08, 0.092);
  float wetA = wetL * (gG * 0.3 + gD * 0.4 + gA * 0.46 + (gS + gC) * 0.36);
  // Borda molhada da neve que derrete.
  wetA += uMelt * snowNear * smoothstep(-0.14, 0.0, e) * 0.28;
  float sheen = 0.0;
  if (hard > 0.5 && wetL > 0.02) {
    // Céu refletido no chão duro molhado: manchas alongadas e claras.
    float sn = noiseB(vec2(wp.x * 0.3, wp.y * 0.075) + vec2(40.0, 3.0)).r;
    sheen = wetL * smoothstep(0.58, 0.92, sn) * 0.24;
  }
  vec3 sheenC = vec3(0.6, 0.66, 0.74) * (0.35 + 0.65 * uDay);

  // ------------------------------------------------------------ poças e gelo
  float P = cell.g * 0.5 + b1.r * 0.5;
  float pk = gG + gD * 1.1 + gA * 0.8 + gS * 0.7 + gC * 0.8;
  float iceMode = step(0.05, uIce);
  // Poças esparsas: mesmo encharcado, só as partes baixas juntam água (~15% do chão).
  float lvl = mix(uPuddle, uIce, iceMode) * 0.3 * pk;
  float pl = P - (1.0 - lvl);
  float pa = smoothstep(0.0, 0.03, pl) * step(0.01, lvl);
  float rim = smoothstep(-0.06, 0.0, pl) * (1.0 - pa) * step(0.01, lvl);
  float inner = 1.0 - smoothstep(0.0, 0.06, pl);
  vec3 water = mix(vec3(0.15, 0.19, 0.225), vec3(0.27, 0.31, 0.355), a2.r) * (0.5 + 0.5 * uDay);
  water += inner * 0.07;
  if (pa > 0.01 && uRain > 0.01 && iceMode < 0.5) {
    // Anéis de gota: uma gota por quadrinho de 24 px, fase sorteada.
    vec2 rc = floor(wp / 24.0);
    float r1 = texture2D(uNoiseB, (rc + 0.5) / 256.0).g;
    float r2 = texture2D(uNoiseB, (rc + vec2(37.5, 11.5)) / 256.0).g;
    vec2 ctr = (rc + 0.25 + 0.5 * vec2(r1, r2)) * 24.0;
    float ph = fract(uTime * (0.7 + r2 * 0.6) + r1 * 7.0);
    float ring = (1.0 - ph) * (1.0 - smoothstep(0.0, 1.3, abs(length(wp - ctr) - ph * 9.0)));
    water += ring * step(r2, uRain * 1.1) * 0.3;
  }
  float crack = 1.0 - smoothstep(0.0, 0.03, abs(a1.r - 0.5));
  vec3 iceC = vec3(0.6, 0.66, 0.72) + crack * 0.16 + inner * 0.08;

  // ------------------------------------------------------------ folhas do outono
  float lf = uLeaves * cell.b * (gG + gD + gS * 0.7 + gC * 0.6 + gA * 0.35);
  float leafK = smoothstep(1.0 - lf * 0.32, 1.0 - lf * 0.32 + 0.03, a1.b) * step(0.01, lf);
  vec3 leafC = mix(mix(vec3(0.78, 0.47, 0.13), vec3(0.62, 0.24, 0.09), b1.g), vec3(0.42, 0.3, 0.17), uLeafTone);

  // ------------------------------------------------------------ composição (de baixo para cima)
  acc = over(acc, leafC * (0.85 + grain * 0.3), leafK * 0.9);
  acc = over(acc, wetC, clamp(wetA + rim * 0.3, 0.0, 0.8));
  acc = over(acc, sheenC, sheen);
  acc = over(acc, water, pa * 0.8 * (1.0 - iceMode));
  acc = over(acc, iceC, pa * 0.78 * iceMode);
  acc = over(acc, vec3(0.82, 0.87, 0.94) * (0.92 + grain * 0.12), frostK * 0.72);
  acc = over(acc, sc, snowA);
  gl_FragColor = acc;
}
`;
