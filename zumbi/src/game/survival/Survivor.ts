/**
 * O SOBREVIVENTE como sistema: junta corpo (Body), o que ele veste e carrega
 * (PlayerInventory), o clima e — na etapa de ferimentos — a saúde por parte
 * do corpo. A cena chama `update` com os minutos de jogo que passaram e o
 * ambiente; aqui se decide o que acontece com vida, roupa molhada, pilha da
 * lanterna etc. Puro, testável sem Phaser.
 */
import { Health } from '../health/Health';
import { PART_INFO } from '../health/Wounds';
import { Skills } from '../skills/Skills';
import { Flag, charge, type ItemState } from '../items/condition';
import { itemDef } from '../items/ItemCatalog';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { WeatherSample } from '../sim/Weather';
import { Body, type Activity, type BodyContext, type BodyRates, type BodyState } from './Body';
import { NO_INJURY, physicalEffects, type InjuryEffects, type PhysicalEffects } from './Effects';

export interface HealthTarget {
  health: number;
  readonly maxHealth: number;
  setHealth(v: number): void;
}

export interface Environment {
  weather: WeatherSample;
  sheltered: boolean;
  activity: Activity;
  /** Calor de fogo perto (0..1). */
  fireHeat: number;
  /** Dormindo e em quê. */
  sleep: { quality: number; blanket: boolean } | null;
}

/** Ganchos da etapa de ferimentos (vazios até lá). */
export interface InjuryModel {
  update(minutes: number, ctx: { sleeping: boolean; body: Body }): number;
  effects(): InjuryEffects;
  fever(): number;
  blocksRegen(): boolean;
  states(): BodyState[];
}

export class Survivor {
  readonly body: Body;
  /** Ferimentos por parte do corpo (sangramento, infecção, dor, cura). */
  readonly health = new Health();
  /** Habilidades (praticando e lendo). */
  readonly skills = new Skills();
  injuries: InjuryModel | null = this.health;
  private cached: PhysicalEffects | null = null;

  constructor(
    private readonly stats: HealthTarget,
    private readonly inventory: PlayerInventory,
    rates: BodyRates = { hunger: 1, thirst: 1, fatigue: 1 },
  ) {
    this.body = new Body(rates);
  }

  /** Avança o tempo. `minutes` de jogo. */
  update(minutes: number, env: Environment): void {
    if (minutes <= 0) return;
    const inj = this.injuries;
    const pain = inj?.effects().pain ?? 0;
    const ctx: BodyContext = {
      airTemp: env.weather.temp,
      sheltered: env.sheltered,
      rain: env.weather.rain,
      wind: env.weather.wind,
      insulation: this.inventory.insulation(),
      raincoat: this.inventory.wearsTag('impermeavel'),
      activity: env.sleep ? 'idle' : env.activity,
      sleeping: !!env.sleep,
      blanket: env.sleep?.blanket ?? false,
      sleepQuality: env.sleep?.quality ?? 1,
      fireHeat: env.fireHeat,
      fever: inj?.fever() ?? 0,
      woundsBlockRegen: inj?.blocksRegen() ?? false,
      pain,
    };
    let dh = this.body.update(minutes, ctx);
    if (inj) dh += inj.update(minutes, { sleeping: !!env.sleep, body: this.body });
    if (dh) this.stats.setHealth(this.stats.health + dh);
    this.updateClothes();
    this.drainDevices(minutes);
    this.cached = null;
  }

  /** Roupa acompanha o corpo: molhou/secou; sangue de ferida aberta suja a roupa daquela parte. */
  private updateClothes(): void {
    for (const w of this.health.wounds) {
      if (w.bleed < 0.3 || w.bandage) continue;
      for (const slot of PART_INFO[w.part].slots) {
        const e = this.inventory.wornIn(slot);
        if (e && ((e.st?.f ?? 0) & Flag.Ensanguentado) === 0) this.inventory.updateWorn(slot, { ...(e.st ?? {}), f: (e.st?.f ?? 0) | Flag.Ensanguentado });
      }
    }
    const wet = this.body.wet;
    for (const [slot, e] of this.inventory.worn) {
      const f = e.st?.f ?? 0;
      const isWet = (f & Flag.Molhado) !== 0;
      if (wet > 0.5 && !isWet) this.inventory.updateWorn(slot, { ...(e.st ?? {}), f: f | Flag.Molhado });
      else if (wet < 0.2 && isWet) this.inventory.updateWorn(slot, { ...(e.st ?? {}), f: f & ~Flag.Molhado });
    }
  }

  /** Lanterna/rádio ligados gastam carga; sem carga, desligam. Vela e tocha queimam até o fim e somem. */
  private drainDevices(minutes: number): void {
    const h = this.inventory.hand;
    if (h?.st?.on) {
      const next = this.drained(h.defId, h.st, minutes);
      if (next === 'gone') this.inventory.updateHand(null);
      else if (next) this.inventory.updateHand(next);
    }
    for (const [slot, e] of this.inventory.worn) {
      if (!e.st?.on) continue;
      const next = this.drained(e.defId, e.st, minutes);
      if (next && next !== 'gone') this.inventory.updateWorn(slot, next);
    }
  }

  private drained(defId: string, st: ItemState, minutes: number): ItemState | 'gone' | null {
    const def = itemDef(defId);
    if (!def?.power) return null;
    const ch = Math.max(0, charge(def, st) - minutes / (def.power.hours * 60));
    if (ch <= 0 && def.tags.includes('chama')) return 'gone';
    return ch <= 0 ? { ...st, ch: 0, on: undefined } : { ...st, ch };
  }

  /** Multiplicadores do estado físico agora (cache até o próximo update). */
  effects(): PhysicalEffects {
    if (!this.cached) this.cached = physicalEffects(this.body, this.inventory.effectiveLoad, this.inventory.capacity, this.injuries?.effects() ?? NO_INJURY);
    return this.cached;
  }

  /** Estados para a tela: corpo + ferimentos + carga. */
  states(): BodyState[] {
    const out = [...this.body.states(), ...(this.injuries?.states() ?? [])];
    const ratio = this.inventory.effectiveLoad / Math.max(1, this.inventory.capacity);
    if (ratio > 0.85) out.push({ id: 'carga', label: ratio > 1 ? 'Sobrecarregado' : 'Carga pesada', level: ratio > 1 ? 3 : 2, tone: ratio > 1 ? 'bad' : 'warn' });
    return out;
  }

  /** Motivo para não conseguir dormir agora (ou null). */
  cantSleep(): string | null {
    const b = this.body;
    if (b.fatigue < 25) return 'Você não está com sono.';
    if (b.hunger >= 85) return 'Fome demais para dormir.';
    if (b.thirst >= 85) return 'Sede demais para dormir.';
    if ((this.injuries?.effects().pain ?? 0) >= 60) return 'Dói demais para dormir.';
    if (b.temp < 35.5) return 'Frio demais para dormir.';
    return null;
  }
}
