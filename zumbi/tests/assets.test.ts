import { describe, expect, it } from 'vitest';
import { DECAL_DRAWERS } from '../src/game/assets/procedural/decals';
import { PROP_DRAWERS } from '../src/game/assets/procedural/props';
import { allDecalSprites } from '../src/game/world/DecalCatalog';
import { allPropSprites } from '../src/game/world/PropCatalog';

describe('arte procedural', () => {
  it('todo sprite do catálogo de objetos tem desenho', () => {
    const missing = allPropSprites().filter((s) => !PROP_DRAWERS[s.id]).map((s) => s.id);
    expect(missing).toEqual([]);
  });

  it('todo decalque tem desenho', () => {
    const missing = allDecalSprites().filter((s) => !DECAL_DRAWERS[s.id]).map((s) => s.id);
    expect(missing).toEqual([]);
  });

  it('ids de sprite são únicos entre objetos e decalques', () => {
    const ids = [...allPropSprites(), ...allDecalSprites()].map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
