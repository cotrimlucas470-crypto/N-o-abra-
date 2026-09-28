/**
 * Geradores do mundo (puro). De tempos em tempos (≈1 s real):
 * - acerta a gasolina de cada gerador ligado (acabou → desliga);
 * - solta o BARULHO do motor (o motivo de todo gerador ser uma aposta:
 *   ele chama zumbi de longe, esteja o jogador perto ou não);
 * - geladeira do prédio alimentado segura a comida (a idade anda mais devagar);
 * - fumaça: gerador ligado DENTRO de um prédio intoxica quem está lá dentro.
 * E responde, por quadro, quais cômodos estão com luz (para o desenho).
 */
import type { LootSystem } from '../loot/LootSystem';
import type { WorldState } from '../sim/WorldState';
import { buildingAtPoint } from '../world/shelter';
import type { BuildingData } from '../world/MapTypes';
import { POWER_TUNING as T, indoorBuilding, isRunning, poweredBuilding, roomLights, settle, type RoomLight } from './Power';
import type { Structure } from './Structures';
import { itemDef } from '../items/ItemCatalog';

export interface PowerHooks {
  noise(x: number, y: number, radius: number): void;
}

export interface PowerTick {
  /** Geradores que pararam agora (gasolina) perto do jogador. */
  stopped: Structure[];
  /** Fumaça no prédio em que o jogador está: minutos de exposição desta conta (0 = ar limpo). */
  fumes: number;
}

const FRIDGES = new Set(['geladeira', 'geladeiraVitrine']);

export class PowerSystem {
  /** Prédios com energia agora (id → gerador). */
  private readonly powered = new Map<string, { b: BuildingData; gen: Structure }>();
  private noiseT = 0;
  private lastNow = -1;

  constructor(
    private readonly state: WorldState,
    private readonly loot: LootSystem,
    private readonly hooks: PowerHooks,
  ) {}

  private *generators(): Generator<Structure> {
    yield* this.state.structures.list('gerador');
  }

  /** Acerta as contas. `now` em minutos do relógio; `dt` segundos reais desde a última. */
  tick(now: number, dt: number, px: number, py: number): PowerTick {
    const out: PowerTick = { stopped: [], fumes: 0 };
    const minutes = this.lastNow < 0 ? 0 : Math.max(0, now - this.lastNow);
    this.lastNow = now;
    this.powered.clear();
    this.noiseT -= dt;
    const pulse = this.noiseT <= 0;
    if (pulse) this.noiseT = T.noiseEvery;
    const here = buildingAtPoint(this.state.model, px, py);
    for (const s of this.generators()) {
      const was = !!s.run;
      const ended = settle(s, now);
      if (was && ended) {
        this.state.structures.changed(s);
        if (Math.hypot(s.x - px, s.y - py) < 900) out.stopped.push(s);
      }
      if (!isRunning(s, now)) {
        s.fridgeAt = now;
        continue;
      }
      // Motor ligado: barulho contínuo (em pulsos para a audição dos zumbis).
      if (pulse) this.hooks.noise(s.x, s.y, T.noiseRadius);
      const b = poweredBuilding(this.state.model, s);
      if (b) {
        this.powered.set(b.id, { b, gen: s });
        this.coolFridges(s, b, now);
      }
      // Fumaça: gerador dentro de um prédio e o jogador no mesmo prédio.
      const inside = indoorBuilding(this.state.model, s);
      if (inside && here && inside.id === here.id) out.fumes += minutes;
    }
    return out;
  }

  /** A comida das geladeiras do prédio envelhece mais devagar enquanto há energia. */
  private coolFridges(s: Structure, b: BuildingData, now: number): void {
    const since = now - (s.fridgeAt ?? now);
    if (since < 30) {
      if (s.fridgeAt === undefined) s.fridgeAt = now;
      return;
    }
    s.fridgeAt = now;
    // Dias "devolvidos" à comida: o tempo que passou menos o que ela envelhece na geladeira.
    const back = (since / 1440) * (1 - T.fridgeAging);
    const r = b.bounds;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const reach = Math.hypot(r.w, r.h) / 2;
    for (const { ref } of this.loot.refsNear(cx, cy, reach)) {
      if (!FRIDGES.has(ref.kind)) continue;
      if (ref.x < r.x || ref.x > r.x + r.w || ref.y < r.y || ref.y > r.y + r.h) continue;
      const c = this.loot.peek(ref.id);
      if (!c) continue;
      let changed = false;
      for (const st of c.stacks) {
        const def = itemDef(st.defId);
        if (!def || def.condition !== 'perishable' || !st.st || st.st.born === undefined) continue;
        st.st.born += back;
        changed = true;
      }
      if (changed) this.loot.markTouched(ref.id);
    }
  }

  /** O prédio tem energia agora? */
  isPowered(buildingId: string): boolean {
    return this.powered.has(buildingId);
  }

  /** Energia no ponto (dentro de um prédio alimentado). */
  poweredAt(x: number, y: number): boolean {
    const b = buildingAtPoint(this.state.model, x, y);
    return !!b && this.powered.has(b.id);
  }

  /** Luzes acesas nos prédios alimentados perto do jogador (px de mundo). */
  lights(px: number, py: number, out: RoomLight[]): void {
    for (const { b, gen } of this.powered.values()) {
      if (!gen.lights) continue;
      const r = b.bounds;
      const d = Math.hypot(Math.max(r.x - px, 0, px - (r.x + r.w)), Math.max(r.y - py, 0, py - (r.y + r.h)));
      if (d < 1100) roomLights(b, out);
    }
  }

  get poweredCount(): number {
    return this.powered.size;
  }
}
