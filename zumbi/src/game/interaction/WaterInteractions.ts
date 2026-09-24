/**
 * ÁGUA do mundo: torneira da pia, banheira, hidrante e caixa da descarga.
 *
 * Enquanto a água da cidade corre (sandbox: dias até o corte), a torneira
 * mata a sede e enche garrafas e baldes com água limpa. Depois do corte,
 * a torneira seca; sobra a caixa da descarga (pouca, e suja: ferva) e a
 * chuva. Nada se renova por timer: o que a descarga tinha, acaba.
 */
import { WATER_TUNING } from '../config/CraftTuning';
import { Flag, doses, type ItemState } from '../items/condition';
import { itemDef } from '../items/ItemCatalog';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { ActionOutcome, TimedActionSpec } from '../sim/Actions';
import type { WorldState } from '../sim/WorldState';
import type { Survivor } from '../survival/Survivor';
import type { PropType } from '../world/PropCatalog';
import { edgeDistance } from './FurnitureInteractions';
import type { InteractionCandidate, InteractionOption, InteractionProvider, InteractionResult, Interactor } from './InteractionSystem';

interface Source {
  name: string;
  /** Torneira ligada à rede (seca depois do corte). */
  tap: boolean;
  /** Guarda água depois do corte (doses, suja). */
  tank?: number;
  verbName: string;
}

const SOURCES: Partial<Record<PropType, Source>> = {
  kitchenCounter: { name: 'pia', tap: true, verbName: 'da torneira' },
  bathSink: { name: 'pia', tap: true, verbName: 'da torneira' },
  bathtub: { name: 'banheira', tap: true, verbName: 'da torneira da banheira' },
  hydrant: { name: 'hidrante', tap: true, verbName: 'do hidrante' },
  toilet: { name: 'vaso', tap: false, tank: WATER_TUNING.toiletTankDoses, verbName: 'da caixa da descarga' },
};

/** Recipiente vazio → cheio (limpo/sujo). */
const FILL: Record<string, { clean: string; dirty: string }> = {
  garrafaPet: { clean: 'agua', dirty: 'aguaSuja' },
  garrafaVazia: { clean: 'agua', dirty: 'aguaSuja' },
  garrafaVidro: { clean: 'agua', dirty: 'aguaSuja' },
  balde: { clean: 'baldeAgua', dirty: 'baldeAgua' },
};

export interface WaterHooks {
  start(spec: TimedActionSpec): void;
  /** A rede ainda tem água? */
  waterOn(): boolean;
  drop(defId: string, count: number, st: ItemState | undefined): void;
}

export class WaterInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    private readonly survivor: Survivor,
    private readonly hooks: WaterHooks,
  ) {}

  collect(who: Interactor, out: InteractionCandidate[]): void {
    for (const { prop } of this.state.propsNear(who.x, who.y, 130)) {
      const src = SOURCES[prop.type];
      if (!src) continue;
      const d = edgeDistance(prop, who.x, who.y) - who.radius;
      if (d > 40) continue;
      const running = src.tap && this.hooks.waterOn();
      const left = this.tankLeft(prop.id, src);
      const has = running || left > 0;
      const thirsty = this.survivor.body.thirst >= 5;
      const label = !has ? (src.tap ? `Torneira seca (${src.name})` : 'Caixa da descarga vazia') : running ? `Beber água ${src.verbName}` : `Tirar água ${src.verbName}`;
      out.push({
        target: { key: `agua:${prop.id}`, kind: 'water', x: prop.x, y: prop.y, radius: 24, verb: running ? 'BEBER' : 'ÁGUA', label, enabled: has && (running ? thirsty || this.containers() > 0 : this.containers() > 0) },
        // Armário da pia ganha quando igualmente perto: a água fica no menu "⋯".
        distance: d + 30,
        perform: () => (running ? (thirsty ? this.drink(src) : this.fill(prop.id, src)) : this.fill(prop.id, src)),
        more: () => this.more(prop.id, src),
      });
    }
  }

  private tankLeft(id: string, src: Source): number {
    if (!src.tank) return 0;
    return Math.max(0, src.tank - (this.state.waterUsed.get(id) ?? 0));
  }

  private more(id: string, src: Source): InteractionOption[] {
    const running = src.tap && this.hooks.waterOn();
    const n = this.containers();
    const out: InteractionOption[] = [];
    if (running) out.push({ label: `Beber água ${src.verbName}`, enabled: this.survivor.body.thirst >= 5, perform: () => this.drink(src) });
    const has = running || this.tankLeft(id, src) > 0;
    out.push({ label: n > 0 ? `Encher recipientes (${n})` : 'Encher recipientes (nenhum vazio)', enabled: has && n > 0, perform: () => this.fill(id, src) });
    if (!running && src.tap) out.push({ label: 'A água da rua foi cortada', enabled: false, perform: () => ({ ok: false }) });
    return out;
  }

  /** Recipientes que dá para encher agora (vazios + garrafas de água pela metade). */
  containers(): number {
    let n = 0;
    for (const s of this.inventory.stacks()) {
      if (FILL[s.def.id]) n += s.stack.count;
      else if (s.def.id === 'agua' && doses(s.def, s.stack.st) < (s.def.drink?.doses ?? 0)) n += s.stack.count;
    }
    return n;
  }

  /** Bebe até matar a sede (com tempo; andar para). */
  private drink(src: Source): InteractionResult {
    const body = this.survivor.body;
    const start = body.thirst;
    if (start < 5) return { ok: false, message: 'Sem sede.' };
    const minutes = Math.max(1, Math.ceil((start / 10) * WATER_TUNING.tapMinutesPer10));
    const per = start / minutes;
    this.hooks.start({
      id: 'beberTorneira',
      label: `Bebendo água ${src.verbName}`,
      minutes,
      tick: (m) => (body.thirst = Math.max(0, body.thirst - per * m)),
      until: () => body.thirst <= 0.5,
      done: () => ({ ok: true, message: 'Matou a sede.', tone: 'ok' }),
      cancelled: () => ({ ok: true, message: 'Bebeu um pouco.', tone: 'info' }),
    });
    return { ok: true };
  }

  /** Enche os recipientes que o jogador carrega (limpa na torneira; suja na descarga). */
  private fill(id: string, src: Source): InteractionResult {
    const running = src.tap && this.hooks.waterOn();
    const n = this.containers();
    if (n <= 0) return { ok: false, message: 'Nenhuma garrafa ou balde vazio.' };
    const available = running ? Infinity : this.tankLeft(id, src);
    if (available <= 0) return { ok: false, message: 'Não tem água.' };
    this.hooks.start({
      id: 'encherAgua',
      label: 'Enchendo recipientes',
      minutes: Math.max(1, Math.min(n, 8) * WATER_TUNING.fillMinutes),
      done: () => this.doFill(id, src, running),
    });
    return { ok: true };
  }

  /** Enche de fato. Devolve a mensagem. (Público para testes.) */
  doFill(id: string, src: Source | null, clean: boolean): ActionOutcome {
    let budget = clean ? Infinity : src ? this.tankLeft(id, src) : 0;
    let filled = 0;
    let used = 0;
    // Repete: cada troca muda os índices das pilhas.
    for (let guard = 0; guard < 200 && budget > 0; guard++) {
      const s = [...this.inventory.stacks()].find((x) => FILL[x.def.id] || (clean && x.def.id === 'agua' && doses(x.def, x.stack.st) < (x.def.drink?.doses ?? 0)));
      if (!s) break;
      if (s.def.id === 'agua') {
        const max = s.def.drink!.doses;
        const need = max - doses(s.def, s.stack.st);
        s.container.updateOne(s.index, { ...(s.stack.st ?? {}), open: 1, dose: max });
        used += need;
        budget -= need;
        filled++;
        continue;
      }
      const to = FILL[s.def.id]!;
      const outId = clean ? to.clean : to.dirty;
      const max = itemDef(outId)?.drink?.doses ?? 1;
      const give = Math.min(max, budget);
      s.container.take(s.index, 1);
      const st: ItemState = { open: 1, dose: give };
      if (!clean && outId === 'baldeAgua') st.f = Flag.Contaminado;
      if (s.container.add(outId, 1, st) < 1 && this.inventory.add(outId, 1, st) < 1) this.hooks.drop(outId, 1, st);
      used += give;
      budget -= give;
      filled++;
    }
    this.inventory.changed();
    if (!clean && src && used > 0) this.state.waterUsed.set(id, (this.state.waterUsed.get(id) ?? 0) + used);
    if (filled === 0) return { ok: false, message: 'Nada para encher.', tone: 'warn' };
    return { ok: true, message: clean ? `Encheu ${filled} ${filled > 1 ? 'recipientes' : 'recipiente'} com água limpa.` : `Encheu ${filled} com água da descarga. Ferva antes de beber.`, tone: clean ? 'ok' : 'warn' };
  }
}
