/** Blocos GLSL reutilizados por vários materiais da cena. */

export const GLSL_HASH = /* glsl */ `
  float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
  vec2  hash22(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }
  float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
`;

export const GLSL_NOISE = /* glsl */ `
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++){ v += a * vnoise(p); p *= 2.02; a *= 0.5; }
    return v;
  }
`;

/** Rotação por eixo+ângulo, usada para girar cada fragmento na GPU. */
export const GLSL_ROT = /* glsl */ `
  mat3 rotAxis(vec3 axis, float angle){
    axis = normalize(axis);
    float s = sin(angle), c = cos(angle), o = 1.0 - c;
    return mat3(
      o*axis.x*axis.x + c,        o*axis.x*axis.y - axis.z*s, o*axis.z*axis.x + axis.y*s,
      o*axis.x*axis.y + axis.z*s, o*axis.y*axis.y + c,        o*axis.y*axis.z - axis.x*s,
      o*axis.z*axis.x - axis.y*s, o*axis.y*axis.z + axis.x*s, o*axis.z*axis.z + c
    );
  }
`;

/** Linhas de rachadura procedurais: distância às arestas de células de Voronoi. */
export const GLSL_RACHADURA = /* glsl */ `
  // devolve x = distância à aresta mais próxima, y = id da célula
  vec2 rachaduras(vec2 p){
    vec2 ip = floor(p), fp = fract(p);
    vec2 mr = vec2(0.0); float md = 8.0; vec2 mg = vec2(0.0);
    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++){
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(ip + g);
      vec2 r = g + o - fp;
      float d = dot(r, r);
      if (d < md){ md = d; mr = r; mg = g; }
    }
    md = 8.0;
    for (int j = -2; j <= 2; j++)
    for (int i = -2; i <= 2; i++){
      vec2 g = mg + vec2(float(i), float(j));
      vec2 o = hash22(ip + g);
      vec2 r = g + o - fp;
      if (dot(mr - r, mr - r) > 0.0001)
        md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
    }
    return vec2(md, hash21(ip + mg));
  }
`;
