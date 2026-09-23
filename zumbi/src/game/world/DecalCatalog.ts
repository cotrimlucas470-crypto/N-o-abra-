/**
 * Marcas no chão: sangue, óleo, rachaduras, folhas, papel...
 * Não colidem, não fazem sombra, ficam sob tudo. Baratas de desenhar.
 */
export interface DecalDef {
  sprites: readonly string[];
  width: number;
  height: number;
}

export const DECAL_DEFS = {
  blood: { sprites: ['decal.blood.a', 'decal.blood.b', 'decal.blood.c'], width: 84, height: 84 },
  bloodTrail: { sprites: ['decal.bloodtrail'], width: 150, height: 42 },
  oil: { sprites: ['decal.oil'], width: 84, height: 62 },
  crack: { sprites: ['decal.crack.a', 'decal.crack.b'], width: 132, height: 70 },
  leaves: { sprites: ['decal.leaves.a', 'decal.leaves.b'], width: 96, height: 96 },
  paper: { sprites: ['decal.paper.a', 'decal.paper.b'], width: 34, height: 30 },
  manhole: { sprites: ['decal.manhole'], width: 58, height: 58 },
  drain: { sprites: ['decal.drain'], width: 46, height: 22 },
  dirt: { sprites: ['decal.dirt'], width: 128, height: 104 },
  doormat: { sprites: ['decal.doormat'], width: 74, height: 40 },
  skid: { sprites: ['decal.skid'], width: 210, height: 44 },
  debris: { sprites: ['decal.debris'], width: 92, height: 64 },
  glass: { sprites: ['decal.glass'], width: 62, height: 52 },
  treePit: { sprites: ['decal.treepit'], width: 80, height: 80 },
  planks: { sprites: ['decal.planks'], width: 60, height: 60 },
} as const satisfies Record<string, DecalDef>;

export type DecalType = keyof typeof DECAL_DEFS;

export function getDecalDef(type: DecalType): DecalDef {
  return DECAL_DEFS[type];
}

export function allDecalSprites(): { id: string; width: number; height: number }[] {
  const out: { id: string; width: number; height: number }[] = [];
  for (const def of Object.values(DECAL_DEFS) as DecalDef[]) {
    for (const id of def.sprites) out.push({ id, width: def.width, height: def.height });
  }
  return out;
}
