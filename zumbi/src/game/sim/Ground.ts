/**
 * O CHÃO que o clima deixa (puro, vai para o save): neve acumulada (cm e
 * cobertura 0..1), chão molhado/poças, gelo e a temperatura do solo (que
 * segue o ar devagar — por isso as primeiras neves do outono derretem ao
 * tocar o chão e as de pleno inverno ficam).
 *
 * É integrado pelo tempo (passos de até 15 min de jogo, lendo o Weather em
 * cada passo): o mesmo código serve para o jogo normal, dormir acelerado e
 * pular vários dias. Um valor só para a cidade (barato no celular); o
 * desenho varia a cobertura de lugar para lugar.
 */
import { GROUND_TUNING as G } from '../config/ClimateTuning';
import { clamp } from '../core/math';
import { daylight, type Weather, type WeatherSample } from './Weather';

export interface GroundSave {
  /** Minuto de jogo até onde já foi calculado. */
  at: number;
  snowCm: number;
  wet: number;
  ice: number;
  soil: number;
  /** Horas desde a última nevada (neve velha, pisada, suja). */
  sinceSnow?: number;
  /** Derretendo agora (0..1, média das últimas horas). */
  melting?: number;
}

export class Ground {
  at: number;
  snowCm = 0;
  /** Chão molhado 0..1 (acima de ~0,35 aparecem poças). */
  wet = 0;
  /** Gelo 0..1 (poças congeladas, chão escorregadio). */
  ice = 0;
  /** Temperatura do solo (°C). */
  soil: number;
  /** Horas desde a última nevada: a neve envelhece (acinzenta, fica pisada). */
  sinceSnow = 999;
  /** Derretendo (0..1): a neve molha, afunda e aparece chão. */
  melting = 0;

  constructor(
    private readonly weather: Weather,
    minutes: number,
  ) {
    this.at = minutes;
    this.soil = weather.at(minutes).temp;
  }

  /** Cobertura de neve 0..1 (0,1 quase nada · 0,25 manchas · 0,5 moderada · 1 tudo branco). */
  get snow(): number {
    return this.snowCm <= 0 ? 0 : 1 - Math.exp(-this.snowCm / G.coverCm);
  }

  /** Partida nova: calcula os dias anteriores para o chão já estar como a época pede. */
  spinUp(): void {
    const end = this.at;
    this.at = end - G.spinUpDays * 1440;
    this.soil = this.weather.at(this.at).temp;
    this.integrate(end);
  }

  /** Avança até o minuto `to` (passos de até 15 min). */
  integrate(to: number): void {
    while (to - this.at > 1e-6) {
      const dt = Math.min(G.stepMinutes, to - this.at);
      const mid = this.at + dt / 2;
      this.step(this.weather.at(mid), dt / 60, ((mid % 1440) + 1440) % 1440, mid);
      this.at += dt;
    }
  }

  private step(w: WeatherSample, h: number, minuteOfDay: number, minutes: number): void {
    const air = w.temp;
    this.soil += (air - this.soil) * Math.min(1, h / G.soilLagHours);
    const sun = daylight(minuteOfDay, w.cloud, this.weather.seasonAt(minutes).dayHours) * (1 - w.cloud);
    // Neve: só fica o que o solo não derrete; antes do inverno quase nada assenta.
    this.sinceSnow = w.snow > 0.08 ? 0 : this.sinceSnow + h;
    if (w.snow > 0) {
      const stick = clamp((G.stickTemp - this.soil) / 2, G.stickMin, 1);
      const season = G.earlyStick + (1 - G.earlyStick) * this.weather.seasonAt(minutes).winter;
      this.snowCm += w.snow * G.snowCmPerHour * stick * season * h;
    }
    // A neve assenta (compacta) devagar mesmo no frio.
    this.snowCm -= this.snowCm * G.settlePerHour * h;
    let melt = 0;
    if (this.snowCm > 0) {
      if (air > 0) melt += air * G.meltPerDegree;
      melt += w.rain * G.meltRain;
      if (air > -1) melt += sun * G.meltSun;
      if (this.soil > 0) melt += this.soil * G.meltSoil;
      const m = Math.min(this.snowCm, melt * h);
      // Derretendo = perdendo mais de ~0,15 cm/h (média de umas 6 h).
      this.melting += (Math.min(1, melt / 0.6) - this.melting) * Math.min(1, h / 6);
      this.snowCm = Math.min(G.maxCm, this.snowCm - m);
      this.wet += m * G.wetPerMeltCm;
    } else this.melting = Math.max(0, this.melting - h / 6);
    // Molhado: chuva molha; sem chuva, seca (debaixo da neve quase não seca).
    if (w.rain > 0) this.wet += w.rain * G.wetPerRain * h;
    else {
      const dry = G.dryBase + Math.max(0, air) * G.dryPerDegree + w.wind * G.dryWind + sun * G.drySun;
      this.wet -= dry * h * (this.snow > 0.5 ? 0.3 : 1);
    }
    this.wet = clamp(this.wet, 0, 1);
    // Gelo: a água parada congela com solo e ar abaixo de zero; derrete no calor.
    if (this.soil < 0 && air < 0) {
      const f = Math.min(this.wet, G.freezeRate * h);
      this.ice = clamp(this.ice + f, 0, 1);
      this.wet -= f * 0.8;
    } else if (air > 0.5 && this.ice > 0) {
      const t = Math.min(this.ice, air * G.thawPerDegree * h);
      this.ice -= t;
      this.wet = clamp(this.wet + t * 0.8, 0, 1);
    }
    if (this.snowCm < 0.01) this.snowCm = 0;
  }

  /** Geada da manhã (visual, 0..1): noite fria de céu aberto, sem neve caindo. */
  frost(w: WeatherSample, minuteOfDay: number): number {
    if (w.precip > 0 || w.temp > 1.5) return 0;
    const early = minuteOfDay < 10 * 60 || minuteOfDay > 20 * 60 ? 1 : 0.3;
    return clamp(((1.5 - w.temp) / 5) * (1 - w.cloud * 0.6) * early, 0, 1);
  }

  serialize(): GroundSave {
    const r = (v: number) => Math.round(v * 1000) / 1000;
    return { at: r(this.at), snowCm: r(this.snowCm), wet: r(this.wet), ice: r(this.ice), soil: r(this.soil), sinceSnow: r(Math.min(999, this.sinceSnow)), melting: r(this.melting) };
  }

  /** Carrega; save sem chão (versão anterior) calcula os dias anteriores. */
  restore(s: Partial<GroundSave> | undefined, now: number): void {
    const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
    if (!s || !ok(s.at) || !ok(s.snowCm)) {
      this.at = now;
      this.spinUp();
      return;
    }
    this.at = Math.min(s.at, now);
    this.snowCm = clamp(s.snowCm, 0, G.maxCm);
    this.wet = ok(s.wet) ? clamp(s.wet, 0, 1) : 0;
    this.ice = ok(s.ice) ? clamp(s.ice, 0, 1) : 0;
    this.soil = ok(s.soil) ? s.soil : this.weather.at(now).temp;
    this.sinceSnow = ok(s.sinceSnow) ? s.sinceSnow : 999;
    this.melting = ok(s.melting) ? clamp(s.melting, 0, 1) : 0;
    this.integrate(now);
  }
}
