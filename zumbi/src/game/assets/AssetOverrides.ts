/**
 * Substituição de arte sem mexer em código.
 *
 * public/assets/overrides.json:
 * {
 *   "sprites": {
 *     "prop.car.red": "assets/sprites/carro_vermelho.png",
 *     "player.torso": { "file": "assets/sprites/tronco.png", "frameWidth": 128, "frameHeight": 128 }
 *   },
 *   "tiles": "assets/tiles/chao.png",
 *   "patterns": { "pattern.roof.flat": "assets/patterns/laje.png" }
 * }
 *
 * - Sprites simples: qualquer resolução; o jogo escala para o tamanho do catálogo.
 * - Folhas animadas (player.*): quadros quadrados em linha, na mesma ordem.
 * - Se um arquivo falhar ao carregar, o desenho procedural é usado (o jogo nunca quebra por arte).
 */
export interface SheetOverride {
  file: string;
  frameWidth: number;
  frameHeight: number;
}

export interface OverrideManifest {
  sprites: Record<string, string | SheetOverride>;
  tiles?: string;
  patterns: Record<string, string>;
}

export function parseOverrides(raw: unknown): OverrideManifest {
  const out: OverrideManifest = { sprites: {}, patterns: {} };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  if (r.sprites && typeof r.sprites === 'object') {
    for (const [id, v] of Object.entries(r.sprites as Record<string, unknown>)) {
      if (id.startsWith('_')) continue; // "_exemplo" etc. = comentário
      if (typeof v === 'string' && v.length > 0) out.sprites[id] = v;
      else if (v && typeof v === 'object') {
        const s = v as Record<string, unknown>;
        if (typeof s.file === 'string' && Number(s.frameWidth) > 0 && Number(s.frameHeight) > 0) {
          out.sprites[id] = { file: s.file, frameWidth: Number(s.frameWidth), frameHeight: Number(s.frameHeight) };
        }
      }
    }
  }
  if (typeof r.tiles === 'string' && r.tiles.length > 0) out.tiles = r.tiles;
  if (r.patterns && typeof r.patterns === 'object') {
    for (const [id, v] of Object.entries(r.patterns as Record<string, unknown>)) {
      if (!id.startsWith('_') && typeof v === 'string' && v.length > 0) out.patterns[id] = v;
    }
  }
  return out;
}

/** Chave de textura usada para um sprite substituído. */
export function overrideKey(id: string): string {
  return `ovr:${id}`;
}
