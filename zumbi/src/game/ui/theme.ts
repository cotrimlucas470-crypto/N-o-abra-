import type Phaser from 'phaser';

/** Estilo visual da interface (px CSS). */
export const UI_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const UI = {
  text: '#ecebe6',
  textDim: '#a9a79f',
  accent: '#e0a84a',
  accentNum: 0xe0a84a,
  panel: 0x0e0f12,
  panelAlpha: 0.62,
  stroke: 0xffffff,
  strokeAlpha: 0.16,
  health: 0xc0463f,
  stamina: 0xd6b64a,
  staminaLow: 0x8a6f2c,
  danger: 0xd0453a,
} as const;

export function textStyle(size: number, color: string = UI.text, weight = '600'): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: UI_FONT, fontSize: `${size}px`, color, fontStyle: weight };
}
