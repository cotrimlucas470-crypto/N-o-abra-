/**
 * Paleta central. Cores levemente dessaturadas: cidade abandonada,
 * luz de fim de tarde. Trocar aqui muda os assets procedurais inteiros.
 */
export const PALETTE = {
  // chão
  asphalt: '#4a4c50',
  asphaltDark: '#3f4145',
  sidewalk: '#8f8c86',
  sidewalkJoint: '#7b7872',
  concrete: '#83857f',
  parking: '#55575a',
  grass: '#5d7249',
  grassDark: '#4f6340',
  dirt: '#6e5c47',
  gravel: '#7a756b',
  woodFloor: '#8a6848',
  woodFloorDark: '#6f533a',
  tileFloor: '#b7b4aa',
  tileFloorJoint: '#9d9a90',
  carpet: '#6a5a64',
  garageFloor: '#6c6e6c',

  // marcações
  laneWhite: '#d9d6cc',
  laneYellow: '#d2b14a',
  curb: '#a9a69e',

  // construção
  wall: '#26272b',
  wallTop: '#3a3c42',
  window: '#8fb0bf',
  fence: '#6b5641',
  roofShingle: '#4d3f3a',
  roofShingleAlt: '#5a4a42',
  roofFlat: '#5e6166',

  // personagem
  skin: '#c89b7b',
  hair: '#3b2a20',
  jacket: '#5f6445',
  jacketDark: '#4b4f36',
  pants: '#3a4352',
  shoes: '#26231f',
  backpack: '#7a5534',

  // UI
  uiBg: 'rgba(14, 15, 18, 0.62)',
  uiStroke: 'rgba(255, 255, 255, 0.18)',
  health: '#c0463f',
  stamina: '#d6b64a',
  staminaExhausted: '#8a6f2c',
  text: '#ecebe6',
  textDim: '#a9a79f',
  accent: '#e0a84a',
} as const;

/** Converte '#rrggbb' em número 0xrrggbb (formato que o Phaser usa). */
export function hex(color: string): number {
  return Number.parseInt(color.replace('#', ''), 16);
}
