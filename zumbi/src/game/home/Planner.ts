/**
 * Liga o resumo da MORADIA e a PREPARAÇÃO DE EXPEDIÇÃO ao jogo em andamento
 * (inventário, corpo, clima, relógio, marcadores). A HUD só pede e mostra.
 * Puro: sem Phaser.
 */
import { PLAYER_TUNING } from '../config/PlayerTuning';
import type { PowerSystem } from '../build/PowerSystem';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { GameClock } from '../sim/GameClock';
import type { WorldState } from '../sim/WorldState';
import type { SurvivalLoop } from '../survival/SurvivalLoop';
import type { Supply } from '../survival/Provisions';
import { compass, meters, metersLabel, type PlayerMarks } from '../world/PlayerMarks';
import { planExpedition, type ExpeditionPlan } from './Expedition';
import { homeAdvice, homeRows, homeSummary, type HomeSummary, type SummaryRow } from './Home';

export interface HomeView {
  summary: HomeSummary;
  rows: SummaryRow[];
  advice: string | null;
  /** Onde fica em relação ao jogador ("aqui" ou "120 m NE"). */
  where: string;
  here: boolean;
}

export interface ExpeditionView {
  plan: ExpeditionPlan;
  name: string;
  /** Destino é a própria moradia: só a ida (voltar para casa). */
  goingHome: boolean;
}

export interface Planner {
  home(): HomeView | null;
  expedition(target: number): ExpeditionView | string;
}

export interface PlannerDeps {
  state: WorldState;
  power: PowerSystem;
  inventory: PlayerInventory;
  loop: SurvivalLoop;
  clock: GameClock;
  marks: PlayerMarks;
  walkMultiplier: number;
  gasOn(): boolean;
  /** Posição do jogador no mapa da cidade. */
  player(): { x: number; y: number };
  atHome(): boolean;
}

export function createPlanner(d: PlannerDeps): Planner {
  const inv = d.inventory;
  const sv = d.loop.survivor;
  const now = () => d.clock.minutes / 1440;
  return {
    home() {
      const h = d.marks.home;
      if (!h) return null;
      const summary = homeSummary(h, { state: d.state, isPowered: (id) => d.power.isPowered(id), gasOn: d.gasOn(), now: now(), hasTag: (t) => inv.hasTag(t) }, { hunger: sv.body.hunger, thirst: sv.body.thirst });
      const p = d.player();
      const m = meters(p.x, p.y, h.x, h.y);
      const here = d.atHome() || m < 8;
      return { summary, rows: homeRows(summary), advice: homeAdvice(summary), where: here ? 'Você está aqui' : `a ${metersLabel(m)}, rumo ${compass(p.x, p.y, h.x, h.y)}`, here };
    },
    expedition(target) {
      const marks = d.marks;
      const goingHome = target === 0;
      const t = goingHome ? (marks.home ? { ...marks.home } : null) : (marks.marks.find((m) => m.id === target) ?? null);
      if (!t) return 'Destino não existe mais.';
      const from = d.player();
      if (goingHome && d.atHome()) return 'Você já está em casa. Escolha um marcador como destino.';
      const carried: Supply[] = [];
      let gun: { name: string; loaded: number; capacity: number; spare: number } | null = null;
      let melee: string | null = null;
      const hand = inv.hand;
      const hd = inv.handDef;
      if (hd?.gun) gun = { name: hd.name, loaded: hand?.st?.am ?? 0, capacity: hd.gun.capacity, spare: 0 };
      else if (hd?.melee) melee = hd.name;
      for (const { stack, def } of inv.stacks()) {
        if (def.food || def.drink) carried.push({ def, count: stack.count, ...(stack.st ? { st: stack.st } : {}) });
        if (!gun && def.gun) gun = { name: def.name, loaded: stack.st?.am ?? 0, capacity: def.gun.capacity, spare: 0 };
        if (!melee && def.melee) melee = def.name;
      }
      if (gun) {
        const g = hd?.gun ?? [...inv.stacks()].find((s) => s.def.name === gun!.name)?.def.gun;
        for (const { stack, def } of inv.stacks()) if (def.ammo && g && def.ammo.caliber === g.caliber) gun.spare += stack.count * def.ammo.rounds;
      }
      const hp = sv.health;
      const env = { weather: d.loop.weather, sheltered: false, activity: 'walk' as const, fireHeat: 0, sleep: null };
      const ctx = { ...sv.context(env), load: inv.effectiveLoad / Math.max(1, inv.capacity) };
      const b = sv.body;
      const input = {
        from,
        to: { x: t.x, y: t.y, name: t.name },
        back: goingHome ? null : marks.home ? { x: marks.home.x, y: marks.home.y } : null,
        oneWay: goingHome,
        walkPx: PLAYER_TUNING.walkSpeed * d.walkMultiplier * sv.effects().walk,
        gameMinPerSec: d.clock.baseRate * d.clock.userScale,
        minuteOfDay: d.clock.minuteOfDay,
        dayHours: d.loop.weatherModel.seasonAt(d.clock.minutes).dayHours,
        body: { hunger: b.hunger, thirst: b.thirst, fatigue: b.fatigue, wet: b.wet, sickness: b.sickness, temp: b.temp },
        ctx,
        weatherNow: d.loop.weather,
        weatherBack: d.loop.weather,
        carried,
        now: now(),
        hasTag: (tag: string) => inv.hasTag(tag),
        weight: inv.effectiveLoad,
        capacity: inv.capacity,
        gun,
        melee,
        light: inv.hasTag('luz'),
        health: { bleeding: hp.bleeding > 0.5, infection: hp.wounds.some((w) => w.infection > 0.15), pain: hp.pain, limp: (hp.effects().legs ?? 0) > 0.3 },
      };
      // Clima na hora da volta: uma passada para saber a hora, outra com o clima dela.
      const first = planExpedition(input);
      const plan = planExpedition({ ...input, weatherBack: d.loop.weatherModel.at(d.clock.minutes + first.minutesTotal) });
      return { plan, name: t.name, goingHome };
    },
  };
}
