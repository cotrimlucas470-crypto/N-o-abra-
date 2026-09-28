/**
 * Clima visual (partes puras): ruídos periódicos que emendam sem costura e
 * dados do chão por tile (material, fora/dentro, abrigo suave, portas).
 */
import { describe, expect, it } from 'vitest';
import { domes, fbm, NOISE_SIZE, rankNormalize, weatherNoiseA, weatherNoiseB } from '../src/game/assets/procedural/weatherNoise';
import { TILE } from '../src/game/config/GameConfig';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { Ground as G } from '../src/game/world/MapTypes';
import { buildingAtPoint } from '../src/game/world/shelter';
import { blurField, buildWeatherCells, MAT_STEP, WX_MAT } from '../src/game/world/weatherCells';
import { WorldModel } from '../src/game/world/WorldModel';

/** Maior salto entre vizinhos (com a volta da textura) comparado ao maior salto interno. */
function seamRatio(v: Float32Array, n: number): number {
  let inner = 0;
  let seam = 0;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const a = v[y * n + x]!;
      const r = v[y * n + ((x + 1) % n)]!;
      const d = v[((y + 1) % n) * n + x]!;
      const j = Math.max(Math.abs(a - r), Math.abs(a - d));
      if (x === n - 1 || y === n - 1) seam = Math.max(seam, j);
      else inner = Math.max(inner, j);
    }
  return seam / inner;
}

describe('ruídos do clima', () => {
  it('emendam na borda (periódicos): o salto na emenda é como qualquer outro', () => {
    const n = 64;
    expect(seamRatio(fbm(n, 7, [[16, 16, 0.6], [8, 8, 0.4]]), n)).toBeLessThanOrEqual(1.01);
    expect(seamRatio(domes(n, 9, 16, 0.85), n)).toBeLessThanOrEqual(1.01);
  });

  it('uniformizados: um limiar t cobre ~t da área (a cobertura segue o clima)', () => {
    const r = rankNormalize(fbm(64, 3, [[16, 16, 1]]));
    const below = (t: number) => r.filter((v) => v < t).length / r.length;
    expect(below(0.3)).toBeCloseTo(0.3, 1);
    expect(below(0.7)).toBeCloseTo(0.7, 1);
  });

  it('texturas RGBA de 256² com alfa cheio (o alfa não carrega dado)', () => {
    for (const t of [weatherNoiseA(), weatherNoiseB()]) {
      expect(t.length).toBe(NOISE_SIZE * NOISE_SIZE * 4);
      for (let i = 3; i < t.length; i += 4 * 97) expect(t[i]).toBe(255);
    }
  });
});

describe('dados do chão por tile', () => {
  const map = buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 });
  const model = new WorldModel(map);
  const d = buildWeatherCells(model);

  it('só a cidade (sem a faixa dos andares)', () => {
    expect(d.w).toBe(map.widthTiles);
    expect(d.h).toBe(map.cityHeightTiles ?? map.heightTiles);
    expect(d.cells.length).toBe(d.w * d.h * 4);
  });

  it('material certo e nada dentro das construções', () => {
    let checked = 0;
    for (let y = 0; y < d.h; y += 3)
      for (let x = 0; x < d.w; x += 3) {
        const i = y * d.w + x;
        const mat = Math.floor(d.mats[i * 4]! / MAT_STEP);
        const inside = buildingAtPoint(model, (x + 0.5) * TILE, (y + 0.5) * TILE) !== null;
        const g = map.ground[i]!;
        if (inside) expect(mat).toBe(WX_MAT.none);
        else if (g === G.Grass || g === G.GrassDark) expect(mat).toBe(WX_MAT.grass);
        else if (g === G.Asphalt || g === G.Parking) expect(mat).toBe(WX_MAT.asphalt);
        else if (g === G.Sidewalk) expect(mat).toBe(WX_MAT.sidewalk);
        expect(d.outdoor[i]).toBe(mat === WX_MAT.none ? 0 : 1);
        checked++;
      }
    expect(checked).toBeGreaterThan(1000);
    expect(d.outdoorCount).toBeGreaterThan(d.w * d.h * 0.3);
  });

  it('o quanto segura neve muda suave entre vizinhos (sem degrau nem anel quadrado)', () => {
    let worst = 0;
    for (let y = 0; y < d.h; y++)
      for (let x = 0; x + 1 < d.w; x++) {
        const a = d.cells[(y * d.w + x) * 4]!;
        const b = d.cells[(y * d.w + x + 1) * 4]!;
        worst = Math.max(worst, Math.abs(a - b));
      }
    // Em 0..255: nunca um salto maior que ~1/4 da faixa entre tiles vizinhos.
    expect(worst).toBeLessThan(64);
  });

  it('frente das portas de fora fica remexida', () => {
    const door = map.doors.find((dd) => dd.exterior)!;
    const i = Math.floor(door.y / TILE) * d.w + Math.floor(door.x / TILE);
    expect(d.trampBase[i]).toBeGreaterThan(0.5);
  });

  it('desfoque preserva a média e alisa um degrau', () => {
    const w = 10;
    const f = new Float32Array(w * w);
    for (let i = 0; i < f.length; i++) f[i] = i % w < 5 ? 0 : 1;
    const before = f.reduce((s, v) => s + v, 0);
    blurField(f, w, w, 2);
    expect(f.reduce((s, v) => s + v, 0)).toBeCloseTo(before, 3);
    expect(f[4]! > 0 && f[5]! < 1).toBe(true);
  });
});
