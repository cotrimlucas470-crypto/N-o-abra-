/**
 * Números da IMPROVISAÇÃO: quanto cada gambiarra aguenta, quanto gasta,
 * quanto dura e o que acontece quando falha. Tudo aqui (nada solto).
 */
export const IMPROVISE_TUNING = {
  /** Fita adesiva: quanto do rolo cada serviço gasta (0..1). */
  tapeUse: { vidro: 0.25, porta: 0.2, cabeca: 0.12, prender: 0.15, remendo: 0.2 },
  /** Vidro com fita: a visão através cai para isto (dos dois lados). */
  tapeSight: 0.45,
  /** Fita descola sozinha: dias até soltar (chuva/umidade encurtam). */
  tapeDays: 6,
  /** Fita no batente: resistência que o zumbi precisa rasgar antes de bater na porta. */
  doorTapeHp: 22,
  /** Pano pendurado sem prender: cai em tantas horas (vento, peso). */
  looseCoverHours: 20,
  /** Reforço (janela/porta): resistência por "força" do material × fixação. */
  reinforceHp: 130,
  /** Fixação: quanto cada jeito de prender segura (pregar é o normal). */
  fix: { pregos: 1, parafusos: 1.15, amarrar: 0.6, fita: 0.35 },
  /** Reforço só com fita: perde resistência com o tempo (fração por dia). */
  tapeFixDecay: 0.25,
  /** Minutos de serviço (antes da habilidade). */
  minutes: { fitaVidro: 4, pano: 3, panoPregado: 6, reforco: 12, fitaPorta: 3, alarme: 8, corda: 6, lanterna: 3, esconder: 4, desmontarGambiarra: 3, folhaPorta: 15, tapar: 8 },
  /** Alarme de latas/linha: raio do barulho = base × chocalho, e quantas vezes toca antes de cair. */
  alarm: { noise: 520, reach: 22, cooldown: 4, uses: { fraco: 1, medio: 3, forte: 8 } },
  /** Distração (rádio largado tocando): barulho a cada tantos segundos e o raio. */
  radio: { every: 6, radius: 560, knockChance: 0.35 },
  /** Luz vazando pela janela à noite: alcance e de quanto em quanto tempo os zumbis "reparam". */
  lightLeak: { range: 720, every: 2.5, dark: 0.45 },
  /** Lanterna presa na cabeça: chance de soltar por pancada na cabeça / queda (× 1 − firmeza). */
  headLight: { knock: 0.5, fall: 0.8, holdLoss: 0.15 },
  /** Corda na janela: metros por andar e desgaste por uso (lençol gasta mais). */
  rope: { metersPerLevel: 3.2, wear: 0.06, breakBelow: 0.2 },
  /** Arrastar móvel: quanto o jogador desacelera por kg (e o mínimo). */
  drag: { perKg: 0.009, min: 0.25, maxKg: 90, reach: 46 },
  /** Móvel escorando porta/janela: resistência = peso × isto (+ a do próprio móvel). */
  braceHpPerKg: 4,
  /** Remendo em vidro de carro: resistência. */
  carPatchHp: 60,
} as const;
