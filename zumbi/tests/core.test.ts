import { describe, expect, it } from 'vitest';
import { parseOverrides } from '../src/game/assets/AssetOverrides';
import { EventBus } from '../src/game/core/EventBus';
import { Random } from '../src/game/core/Random';
import { angleDelta, rotateTowards, wrapAngle } from '../src/game/core/math';
import { SpatialCuller } from '../src/game/world/render/SpatialCuller';
import { MapBuilder } from '../src/game/world/MapBuilder';
import { Ground } from '../src/game/world/MapTypes';
import { HOUSE_SMALL } from '../src/game/world/buildings/templates';

describe('Random', () => {
  it('mesma semente, mesma sequência', () => {
    const a = new Random('abc');
    const b = new Random('abc');
    for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
  });

  it('int respeita os limites', () => {
    const r = new Random(1);
    for (let i = 0; i < 500; i++) {
      const n = r.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
});

describe('ângulos', () => {
  it('menor caminho atravessando ±PI', () => {
    expect(angleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2, 6);
    expect(Math.abs(wrapAngle(3 * Math.PI))).toBeCloseTo(Math.PI, 6);
  });

  it('rotateTowards não ultrapassa o alvo', () => {
    expect(rotateTowards(0, 0.05, 0.2)).toBeCloseTo(0.05, 6);
    expect(rotateTowards(0, 1, 0.2)).toBeCloseTo(0.2, 6);
  });
});

describe('EventBus', () => {
  it('entrega e permite cancelar a inscrição', () => {
    const bus = new EventBus();
    const got: string[] = [];
    const off = bus.on('player:enter-building', (e) => got.push(e.name));
    bus.emit('player:enter-building', { buildingId: 'a', name: 'Casa', kind: 'house' });
    off();
    bus.emit('player:enter-building', { buildingId: 'b', name: 'Oficina', kind: 'garage' });
    expect(got).toEqual(['Casa']);
  });
});

describe('overrides de arte', () => {
  it('aceita imagem simples e folha animada, ignora lixo e comentários', () => {
    const m = parseOverrides({
      sprites: {
        _exemplo: 'x.png',
        'prop.car.red': 'assets/carro.png',
        'player.torso': { file: 't.png', frameWidth: 128, frameHeight: 128 },
        ruim: { file: 't.png', frameWidth: 0 },
        numero: 5,
      },
      tiles: 'chao.png',
      patterns: { 'pattern.fence': 'cerca.png' },
    });
    expect(Object.keys(m.sprites).sort()).toEqual(['player.torso', 'prop.car.red']);
    expect(m.tiles).toBe('chao.png');
    expect(m.patterns['pattern.fence']).toBe('cerca.png');
  });

  it('arquivo ausente ou inválido vira manifesto vazio', () => {
    expect(parseOverrides(undefined)).toEqual({ sprites: {}, patterns: {} });
    expect(parseOverrides('lixo')).toEqual({ sprites: {}, patterns: {} });
  });
});

describe('SpatialCuller', () => {
  it('mostra só o que está perto da câmera', () => {
    const c = new SpatialCuller(256, 0);
    const mk = () => ({ v: true, setVisible(v: boolean) { this.v = v; } });
    const near = mk();
    const far = mk();
    const big = mk();
    c.add(near, 10, 10, 20, 20);
    c.add(far, 5000, 5000, 5010, 5010);
    c.add(big, -100, 400, 3000, 420); // atravessa várias células
    c.update({ x: 0, y: 0, width: 800, height: 600 });
    expect(near.v).toBe(true);
    expect(far.v).toBe(false);
    expect(big.v).toBe(true);
    c.update({ x: 4800, y: 4800, width: 800, height: 600 });
    expect(near.v).toBe(false);
    expect(far.v).toBe(true);
    expect(big.v).toBe(false);
  });
});

describe('MapBuilder: modelos girados', () => {
  it('porta ao sul vira porta ao norte com rotação de 180° e a oeste com 90°', () => {
    const b = new MapBuilder('t', 't', 40, 40, 1, Ground.Grass);
    const r180 = b.building(HOUSE_SMALL, 2, 2, { id: 'a', rot: 180 });
    expect(r180.doors[0]!.side).toBe('n');
    expect(r180.doors[0]!.y).toBeCloseTo(2, 6);
    const r90 = b.building(HOUSE_SMALL, 20, 2, { id: 'b', rot: 90 });
    expect(r90.doors[0]!.side).toBe('w');
    expect(r90.data.bounds.w).toBe(HOUSE_SMALL.h * 64);
    const flip = b.building(HOUSE_SMALL, 2, 20, { id: 'c', flipX: true });
    expect(flip.doors[0]!.x).toBeCloseTo(2 + HOUSE_SMALL.w - 4.65, 6);
  });

  it('abertura fora da parede é erro (pega plantas mal digitadas)', () => {
    const b = new MapBuilder('t', 't', 10, 10, 1, Ground.Grass);
    expect(() => b.wall(0, 0, 4, 0, 'wall', [{ at: 3.5, len: 1, type: 'door' }])).toThrow();
  });
});
