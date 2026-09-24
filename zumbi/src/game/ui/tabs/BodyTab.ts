/**
 * Aba CORPO: vida, fome, sede, sono, temperatura, molhado, ânimo, doença,
 * carga e isolamento; roupas vestidas e o item na mão (tocar mostra as
 * ações: tirar, guardar, ligar...). Ferimentos entram aqui na etapa de
 * ferimentos. Só lê o estado e emite pedidos pelo EventBus.
 */
import type { GameServices } from '../../core/Services';
import type { ItemWhere } from '../../interaction/itemActions/types';
import { conditionTags, type Tone } from '../../items/condition';
import { formatKg, itemDef } from '../../items/ItemCatalog';
import { CATEGORY_INFO, type WearSlot } from '../../items/ItemTypes';
import { SLOT_LABEL, WEAR_SLOTS } from '../../items/PlayerInventory';
import type { PanelAction } from '../panel/ActionButtons';
import type { ListDetail, ListRow, ListSource } from '../panel/ListView';
import { UI } from '../theme';
import { SKILLS, SKILL_LABEL } from '../../skills/Skills';

const GOOD = 0x7fc86a;
const WARN = 0xe0a040;
const BAD = 0xe0604a;
const COLD = 0x5fa8d3;

const barColor = (v: number) => (v > 0.6 ? GOOD : v > 0.3 ? WARN : BAD);
const TONE_TEXT: Record<Tone, string> = { ok: '#9fd88a', info: '#c9c7bf', warn: '#f0b060', bad: '#f07a6a' };

/** Extras que outras etapas penduram na aba (ferimentos). */
export interface BodyTabExtension {
  rows(): ListRow[];
  detail(id: string): ListDetail | null;
}

export class BodyTab implements ListSource {
  readonly extensions: BodyTabExtension[] = [];

  constructor(
    private readonly s: GameServices,
    private readonly emit: (text: string) => void,
  ) {}

  rows(): ListRow[] {
    const sv = this.s.session.survival;
    const stats = this.s.session.stats;
    const inv = this.s.session.inventory;
    if (!sv || !stats || !inv) return [{ kind: 'text', text: 'Sem jogo em andamento.' }];
    const b = sv.survivor.body;
    // Ferimentos primeiro quando existem: é o que exige ação.
    const extra = this.extensions.flatMap((e) => e.rows());
    const urgent = extra.some((r) => r.kind === 'line');
    const rows: ListRow[] = urgent ? [...extra] : [];
    rows.push({ kind: 'header', text: 'Estado' });
    const hp = stats.health / stats.maxHealth;
    rows.push({ kind: 'bar', label: 'Vida', value: hp, text: `${Math.round(stats.health)}`, color: barColor(hp) });
    const need = (label: string, v: number, words: [string, string, string, string]) => {
      const good = 1 - v / 100;
      const text = v < 30 ? words[0] : v < 55 ? words[1] : v < 80 ? words[2] : words[3];
      rows.push({ kind: 'bar', label, value: good, text, color: barColor(good) });
    };
    need('Fome', b.hunger, ['Saciado', 'Com fome', 'Fome', 'Faminto']);
    need('Sede', b.thirst, ['Hidratado', 'Com sede', 'Sede', 'Desidratado']);
    need('Energia', b.fatigue, ['Descansado', 'Cansado', 'Muito cansado', 'Exausto']);
    const t = b.temp;
    const tv = Math.max(0, Math.min(1, (t - 33) / 8));
    // Só com termômetro dá para saber o número; sem ele, a sensação.
    const exactTemp = inv.countOf('termometro') > 0;
    const feel = t < 35 ? 'Congelando' : t < 36.3 ? 'Com frio' : t > 39 ? 'Febre alta' : t > 37.8 ? 'Quente' : 'Normal';
    rows.push({ kind: 'bar', label: 'Temperatura', value: tv, text: exactTemp ? `${t.toFixed(1).replace('.', ',')} °C` : feel, color: t < 36.3 ? COLD : t > 37.8 ? BAD : GOOD });
    if (b.wet > 0.02) rows.push({ kind: 'bar', label: 'Molhado', value: b.wet, text: `${Math.round(b.wet * 100)}%`, color: COLD });
    rows.push({ kind: 'bar', label: 'Ânimo', value: b.morale / 100, text: b.morale > 60 ? 'Bem' : b.morale > 40 ? 'Normal' : b.morale > 25 ? 'Desanimado' : 'Deprimido', color: barColor(b.morale / 100) });
    if (b.sickness > 0.02) rows.push({ kind: 'bar', label: 'Enjoo', value: b.sickness, text: b.sickness > 0.4 ? 'Doente' : 'Enjoado', color: BAD });
    const load = inv.effectiveLoad;
    const cap = inv.capacity;
    const lr = Math.min(1, load / Math.max(0.1, cap));
    rows.push({ kind: 'bar', label: 'Carga', value: lr, text: `${formatKg(load)} / ${formatKg(cap)}`, color: lr < 0.7 ? GOOD : lr < 0.9 ? WARN : BAD });
    const ins = inv.insulation();
    rows.push({ kind: 'text', text: `Roupas aquecem: ${ins < 0.4 ? 'pouco' : ins < 0.9 ? 'razoável' : ins < 1.4 ? 'bem' : 'muito'} (${ins.toFixed(2).replace('.', ',')})`, color: UI.textDim });
    const states = sv.survivor.states();
    if (states.length) rows.push({ kind: 'text', text: states.map((x) => x.label).join(' · '), color: TONE_TEXT[states.some((x) => x.tone === 'bad') ? 'bad' : 'warn'] });

    if (!urgent) rows.push(...extra);

    rows.push({ kind: 'header', text: 'Na mão' });
    const h = inv.hand;
    const hd = h ? itemDef(h.defId) : null;
    if (h && hd) rows.push({ kind: 'line', id: 'hand', icon: hd.icon, text: hd.name, right: tagLine(hd.id, h.st, this.s.session.nowDays()), mark: worst(hd.id, h.st, this.s.session.nowDays()) });
    else rows.push({ kind: 'text', text: 'Mãos livres. Segure uma arma, ferramenta ou lanterna pelo ITENS.' });

    rows.push({ kind: 'header', text: 'Roupas' });
    let any = false;
    for (const slot of WEAR_SLOTS) {
      const w = inv.wornIn(slot);
      const d = w ? itemDef(w.defId) : null;
      if (!w || !d) continue;
      any = true;
      rows.push({ kind: 'line', id: `worn:${slot}`, icon: d.icon, text: d.name, right: SLOT_LABEL[slot], mark: worst(d.id, w.st, this.s.session.nowDays()) });
    }
    if (!any) rows.push({ kind: 'text', text: 'Sem roupa nenhuma. No frio, isso mata.' });

    rows.push({ kind: 'header', text: 'Habilidades' });
    const sk = sv.survivor.skills;
    for (const id of SKILLS) {
      const lvl = sk.level(id);
      rows.push({ kind: 'bar', label: SKILL_LABEL[id], value: (lvl + sk.progress(id)) / 5, text: `nível ${lvl}`, color: 0x6fb1e8 });
    }
    return rows;
  }

  detail(sel: string | null): ListDetail {
    for (const ext of this.extensions) {
      if (!sel) break;
      const d = ext.detail(sel);
      if (d) return d;
    }
    const inv = this.s.session.inventory;
    const sv = this.s.session.survival;
    let loc: ItemWhere | null = null;
    if (sel === 'hand') loc = { where: 'hand' };
    else if (sel?.startsWith('worn:')) loc = { where: 'worn', slot: sel.slice(5) as WearSlot };
    if (loc && inv) {
      const e = loc.where === 'hand' ? inv.hand : inv.wornIn((loc as { slot: WearSlot }).slot);
      const d = e ? itemDef(e.defId) : null;
      if (e && d) {
        const now = this.s.session.nowDays();
        const tags = conditionTags(d, e.st, now);
        const extra = d.wear ? `isola ${d.wear.insulation.toFixed(2).replace('.', ',')} · mordida ${Math.round(d.wear.bite * 100)}% · arranhão ${Math.round(d.wear.scratch * 100)}%` : CATEGORY_INFO[d.category].label;
        return {
          title: d.name,
          tags: [extra, ...tags.map((x) => x.text)].join(' · '),
          desc: d.description,
          actions: this.itemActions(loc),
        };
      }
    }
    const b = sv?.survivor.body;
    const actions: PanelAction[] = [];
    if (sv) {
      const why = sv.survivor.cantSleep();
      actions.push({ label: 'DORMIR AQUI', enabled: !why, ...(why ? { reason: why } : {}), run: () => this.s.bus.emit('body:sleep', { place: 'chao' }) });
      if (inv && hasClock(inv)) actions.push({ label: 'ATÉ AS 7H', enabled: !why, ...(why ? { reason: why } : {}), run: () => this.s.bus.emit('body:sleep', { place: 'chao', wakeAt: 7 * 60 }) });
    }
    return {
      title: 'Seu corpo',
      tags: b ? `fome ${Math.round(b.hunger)} · sede ${Math.round(b.thirst)} · cansaço ${Math.round(b.fatigue)}` : '',
      desc: 'Toque numa roupa ou no que está na mão. Dormir no chão descansa menos que numa cama.',
      actions,
    };
  }

  private itemActions(loc: ItemWhere): PanelAction[] {
    const use = this.s.session.itemUse;
    if (!use) return [];
    return use.actionsFor(loc).map((a) => ({
      label: a.label,
      enabled: a.enabled,
      ...(a.reason ? { reason: a.reason } : {}),
      run: () => this.s.bus.emit('item:action', { loc, action: a.id }),
    }));
  }

  /** Para quem só quer mostrar um aviso. */
  say(text: string): void {
    this.emit(text);
  }
}

function tagLine(defId: string, st: Parameters<typeof conditionTags>[1], now: number): string {
  const d = itemDef(defId);
  if (!d) return '';
  const tags = conditionTags(d, st, now);
  return tags[0]?.text ?? '';
}

function worst(defId: string, st: Parameters<typeof conditionTags>[1], now: number): Tone {
  const d = itemDef(defId);
  if (!d) return 'ok';
  const tones = conditionTags(d, st, now).map((t) => t.tone);
  return tones.includes('bad') ? 'bad' : tones.includes('warn') ? 'warn' : 'ok';
}

/** Tem como ver a hora certa? (relógio ou celular com carga) */
export function hasClock(inv: import('../../items/PlayerInventory').PlayerInventory): boolean {
  if (inv.hasTag('relogio')) return true;
  for (const s of inv.stacks()) if (s.def.id === 'celular' && (s.stack.st?.ch ?? 1) > 0.02) return true;
  const h = inv.hand;
  return h?.defId === 'celular' && (h.st?.ch ?? 1) > 0.02;
}
