/** Chaves de textura fixas (as que não são frames do atlas). */
export const TEX = {
  tiles: 'tiles',
  shadowSoft: 'fx.shadow.soft',
  dust: 'fx.dust',
  vignette: 'fx.vignette',
  lightRadial: 'fx.light.radial',
  lightCone: 'fx.light.cone',
  rainDrop: 'fx.rain',
  snowFlake: 'fx.snow',
  /** Neve no chão por material (camada do clima). */
  snowTiles: 'weather.snow',
  /** Chão molhado, poças e gelo por material. */
  waterTiles: 'weather.water',
  snowStreak: 'fx.snow.streak',
  rainNear: 'fx.rain.near',
  splash: 'fx.splash',
  leaf: 'fx.leaf',
  footprint: 'fx.footprint',
  tireTrack: 'fx.tiretrack',
  fogNoise: 'fx.fog.noise',
  cloudShadow: 'fx.cloud.shadow',
  corpseSnow: 'fx.corpse.snow',
  overridesJson: 'asset-overrides',
} as const;

export const ANIM = {
  torsoWalk: 'player.torso.walk',
  legsWalk: 'player.legs.walk',
} as const;

/** Arquivo (relativo ao index.html) que lista PNGs substitutos. */
export const OVERRIDES_URL = 'assets/overrides.json';
