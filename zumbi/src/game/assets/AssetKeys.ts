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
  /** Ruídos periódicos do clima (shaders): montinhos/luz/grão e manchas/branco/faixas. */
  noiseA: 'weather.noiseA',
  noiseB: 'weather.noiseB',
  snowStreak: 'fx.snow.streak',
  rainNear: 'fx.rain.near',
  splash: 'fx.splash',
  leaf: 'fx.leaf',
  footprint: 'fx.footprint',
  tireTrack: 'fx.tiretrack',
  snowBokeh: 'fx.snow.bokeh',
  bolt: 'fx.bolt',
  overridesJson: 'asset-overrides',
} as const;

export const ANIM = {
  torsoWalk: 'player.torso.walk',
  legsWalk: 'player.legs.walk',
} as const;

/** Arquivo (relativo ao index.html) que lista PNGs substitutos. */
export const OVERRIDES_URL = 'assets/overrides.json';
