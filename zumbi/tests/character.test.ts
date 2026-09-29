import { describe, expect, it } from 'vitest';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import { SHEET_SLOTS, sheetSlots, sheetStats, sheetWounds } from '../src/game/survival/CharacterSheet';
import { Survivor } from '../src/game/survival/Survivor';

function setup() {
  const inv = new PlayerInventory(200);
  const stats = { health: 80, maxHealth: 100, stamina: 50, maxStamina: 100, setHealth(v: number) { this.health = v; } };
  const sv = new Survivor(stats, inv);
  return { inv, sv, stats };
}

describe('ficha do personagem', () => {
  it('mostra os 12 espaços, com o que está vestido e o que o item faz', () => {
    const { inv } = setup();
    inv.putOn('bone');
    const slots = sheetSlots(inv, 0);
    expect(slots.map((s) => s.id)).toEqual([...SHEET_SLOTS]);
    const worn = slots.filter((s) => s.def);
    expect(worn.length).toBeGreaterThan(0);
    for (const s of worn) {
      expect(s.lines.some((l) => l.startsWith('Peso'))).toBe(true);
      if (s.def!.wear) {
        expect(s.lines.some((l) => l.startsWith('Proteção'))).toBe(true);
        expect(s.lines.some((l) => l.startsWith('Isolamento'))).toBe(true);
      }
    }
  });

  it('todos os estados do corpo aparecem com palavra e barra (0..1)', () => {
    const { sv, stats, inv } = setup();
    sv.body.thirst = 60;
    sv.health.add('bracoE', 'corte', 0.6);
    const list = sheetStats(sv.body, sv.health, stats, { kg: inv.effectiveLoad, cap: inv.capacity });
    const ids = list.map((x) => x.id);
    for (const id of ['vida', 'fome', 'sede', 'sono', 'folego', 'temp', 'dor', 'sangramento', 'infeccao', 'estresse', 'nausea', 'carga']) expect(ids).toContain(id);
    for (const x of list) {
      expect(x.value).toBeGreaterThanOrEqual(0);
      expect(x.value).toBeLessThanOrEqual(1);
    }
    expect(list.find((x) => x.id === 'sede')!.text).toBe('Sede forte');
    expect(list.find((x) => x.id === 'sangramento')!.tone).not.toBe('ok');
    expect(sheetWounds(sv.health)[0]!.text).toMatch(/braço esquerdo/);
  });
});
