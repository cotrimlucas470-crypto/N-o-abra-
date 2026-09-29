import { describe, expect, it } from 'vitest';
import { compass, meters, metersLabel, PlayerMarks } from '../src/game/world/PlayerMarks';

describe('moradia, marcadores e explorado', () => {
  it('moradia: definir, trocar, remover; a bússola aponta para ela', () => {
    const m = new PlayerMarks(100, 80);
    expect(m.targetPoint()).toBeNull();
    m.setHome(640, 640, 'Moradia · Casa');
    expect(m.target).toBe(0);
    expect(m.targetPoint()!.name).toBe('Moradia · Casa');
    m.setHome(1280, 640);
    expect(m.home!.x).toBe(1280);
    m.clearHome();
    expect(m.home).toBeNull();
    expect(m.targetPoint()).toBeNull();
  });

  it('marcadores com nome e categoria: criar, editar, remover, pegar pelo toque', () => {
    const m = new PlayerMarks(100, 80);
    const a = m.add(100, 100, '  Carro abandonado  ', 'carro');
    const b = m.add(3000, 3000, '', 'perigo');
    expect(a.name).toBe('Carro abandonado');
    expect(b.name).toBe('Marcador');
    expect(m.edit(b.id, { name: 'Área perigosa', cat: 'perigo' })).toBe(true);
    expect(m.near(120, 110, 60)).toEqual({ kind: 'mark', mark: a });
    m.target = a.id;
    expect(m.remove(a.id)).toBe(true);
    expect(m.target).toBeNull();
  });

  it('explorado marca em volta e volta igual do save', () => {
    const m = new PlayerMarks(100, 80);
    expect(m.explored(5, 5)).toBe(false);
    expect(m.explore(5 * 256 + 128, 5 * 256 + 128, 520)).toBe(true);
    expect(m.explored(5, 5)).toBe(true);
    expect(m.explore(5 * 256 + 128, 5 * 256 + 128, 520)).toBe(false);
    m.setHome(500, 500);
    m.add(900, 900, 'Estoque', 'comida');
    const copy = new PlayerMarks(100, 80);
    copy.restore(JSON.parse(JSON.stringify(m.serialize())));
    expect(copy.explored(5, 5)).toBe(true);
    expect(copy.explored(15, 15)).toBe(false);
    expect(copy.home).toEqual(m.home);
    expect(copy.marks).toEqual(m.marks);
    expect(copy.exploredFraction).toBeCloseTo(m.exploredFraction);
    // Save velho/corrompido não quebra.
    const bad = new PlayerMarks(100, 80);
    bad.restore({ explored: '%%%', marks: [{ id: 'x' } as never], home: { x: NaN } as never });
    expect(bad.marks).toEqual([]);
    expect(bad.home).toBeNull();
  });

  it('distância em metros e rumo', () => {
    expect(meters(0, 0, 64, 0)).toBeCloseTo(1.3);
    expect(metersLabel(1234)).toBe('1,2 km');
    expect(metersLabel(233)).toBe('235 m');
    expect(compass(0, 0, 100, 0)).toBe('L');
    expect(compass(0, 0, 0, -100)).toBe('N');
    expect(compass(0, 0, -100, 100)).toBe('SO');
  });
});
