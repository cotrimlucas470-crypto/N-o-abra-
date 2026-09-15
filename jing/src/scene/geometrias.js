import * as THREE from 'three';
import { randRange } from '../utils/math.js';

/**
 * Formas de caco: polígonos irregulares e afiados, extrudados com
 * espessura real. São geometrias 3D — não polígonos CSS.
 * Algumas nascem "lascadas" (um vértice puxado para fora), outras são
 * fatias largas que parecem pedaços de um espelho maior.
 */
export function criarFormasDeCaco(rnd, quantidade = 7, espessura = 0.055) {
  const formas = [];
  for (let i = 0; i < quantidade; i++) {
    const lados = 3 + Math.floor(rnd() * 3); // 3..5 — lascas, não placas
    const alongado = rnd() < 0.42;
    const pontos = [];
    let ang = rnd() * Math.PI * 2;
    for (let j = 0; j < lados; j++) {
      ang += ((Math.PI * 2) / lados) * randRange(rnd, 0.35, 1.7);
      let r = randRange(rnd, 0.26, 1.0);
      if (alongado) r *= j % 2 === 0 ? 1.55 : 0.5; // lasca comprida
      const x = Math.cos(ang) * r * (alongado ? 1.7 : 1);
      const y = Math.sin(ang) * r;
      pontos.push(new THREE.Vector2(x, y));
    }
    // uma ponta puxada: o caco ganha aquele bico de vidro quebrado
    if (rnd() < 0.85) {
      const k = Math.floor(rnd() * pontos.length);
      pontos[k].multiplyScalar(randRange(rnd, 1.5, 2.3));
    }
    if (rnd() < 0.5) {
      const k = Math.floor(rnd() * pontos.length);
      pontos[k].multiplyScalar(randRange(rnd, 0.35, 0.6));
    }

    const shape = new THREE.Shape(pontos);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: espessura * randRange(rnd, 0.6, 1.6),
      bevelEnabled: true,
      bevelThickness: espessura * 0.18,
      bevelSize: espessura * 0.16,
      bevelSegments: 1,
      curveSegments: 1,
    });
    geo.center();
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    formas.push(geo);
  }
  return formas;
}

/** Placas altas que formam os corredores de vidro do salão. */
export function criarPlacaDeVidro() {
  const g = new THREE.BoxGeometry(1, 1, 1, 1, 2, 1);
  g.computeVertexNormals();
  return g;
}

/** Ponto da timeline: cristal facetado. */
export function criarCristal(detalhe = 0) {
  const g = new THREE.OctahedronGeometry(1, detalhe);
  g.scale(0.62, 1.15, 0.62);
  g.computeVertexNormals();
  return g;
}

/** Estrutura holográfica: prisma alongado e recortado. */
export function criarPrisma() {
  const g = new THREE.CylinderGeometry(0.72, 0.96, 2.2, 6, 1, true);
  g.computeVertexNormals();
  return g;
}
