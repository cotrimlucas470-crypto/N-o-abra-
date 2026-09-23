/** Chaves de textura fixas (as que não são frames do atlas). */
export const TEX = {
  tiles: 'tiles',
  shadowSoft: 'fx.shadow.soft',
  dust: 'fx.dust',
  vignette: 'fx.vignette',
  overridesJson: 'asset-overrides',
} as const;

export const ANIM = {
  torsoWalk: 'player.torso.walk',
  legsWalk: 'player.legs.walk',
} as const;

/** Arquivo (relativo ao index.html) que lista PNGs substitutos. */
export const OVERRIDES_URL = 'assets/overrides.json';
