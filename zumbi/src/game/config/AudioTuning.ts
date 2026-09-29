/**
 * Números do ÁUDIO (sons gerados pelo jogo). Distâncias em px de mundo
 * (1 tile = 64 px). O alcance de cada som fica no catálogo (audio/SoundCatalog).
 */
export const AUDIO_TUNING = {
  /** Expoente da queda com a distância (2 = cai rápido perto do fim). */
  rolloff: 1.8,
  /** Abaixo disso nem toca (economiza voz). */
  silent: 0.012,
  /** Cada parede: alcance ×, volume ×. */
  wallRange: 0.72,
  wallGain: 0.42,
  /** Corte do agudo: ar livre perto, queda com a distância, e com parede (÷ nº de paredes). */
  airCutoff: 16000,
  airFalloff: 1800,
  wallCutoff: 1100,
  minCutoff: 280,
  maxCutoff: 18000,
  /** Estéreo: nunca tudo num lado só; perto do meio, quase centro. */
  maxPan: 0.8,
  panNear: 260,
  /** Eco: fração perto, e quanto cada parede soma. */
  wetNear: 0.3,
  wetPerWall: 0.12,
  /** Variação de volume a cada toque (± dB). */
  gainJitterDb: 1.8,
  /** Vozes tocando ao mesmo tempo (celular aguenta bem). */
  maxVoices: 24,
  /** Memória máxima das variações geradas (MB); passa disso, esquece as menos usadas. */
  memoryMb: 20,
  /** Tempo por quadro para gerar variações na fila (ms). */
  renderBudgetMs: 3,
  /** Volume geral e de cada grupo. */
  master: 0.9,
  bus: { sfx: 1, voz: 0.9, ui: 0.7, amb: 0.8 },
  /** Eco: duração (s) e força do retorno. */
  street: { seconds: 1.5, decay: 0.42, hfDecay: 0.25, predelay: 0.012, level: 0.55 },
  room: { seconds: 0.55, decay: 0.16, hfDecay: 0.08, predelay: 0.004, level: 0.5 },
} as const;

/** Passos do volume no botão SOM (pausa). */
export const VOLUME_STEPS = [1, 0.6, 0.3, 0] as const;
