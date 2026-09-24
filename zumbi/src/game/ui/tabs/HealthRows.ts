/**
 * Ferimentos na aba CORPO: um por linha (o que é, onde, como está) e, ao
 * tocar, os tratamentos possíveis com o que você carrega. Remédios agindo
 * aparecem embaixo (analgésico, antibiótico).
 */
import type { GameServices } from '../../core/Services';
import { woundTitle, type Wound } from '../../health/Health';
import { treatmentsFor } from '../../health/Treatments';
import { WOUND_INFO } from '../../health/Wounds';
import type { Tone } from '../../items/condition';
import type { ListDetail, ListRow } from '../panel/ListView';
import type { BodyTabExtension } from './BodyTab';

function status(w: Wound): string {
  const s: string[] = [];
  if (w.glass) s.push('caco dentro');
  if (w.bleed > 0.05 && !w.bandage) s.push('sangrando');
  if (w.bandage) s.push(w.bandage.clean ? 'enfaixado' : 'atadura suja');
  if (w.sutured) s.push('suturado');
  if (w.splinted) s.push('com tala');
  if (w.infection > 0) s.push('infeccionado');
  else if ((w.disinfected ?? 0) > 0) s.push('limpo');
  if (!s.length) s.push(`${Math.round(w.heal * 100)}% sarado`);
  return s.join(' · ');
}

function tone(w: Wound): Tone {
  if (w.infection > 0 || (w.bleed > 0.3 && !w.bandage) || w.glass) return 'bad';
  const info = WOUND_INFO[w.kind];
  if ((info.needs === 'sutura' && !w.sutured) || (info.needs === 'tala' && !w.splinted) || (w.bandage && !w.bandage.clean)) return 'warn';
  return 'ok';
}

function advice(w: Wound): string {
  const info = WOUND_INFO[w.kind];
  if (w.glass) return 'Tem caco dentro: tire antes (pinça é melhor que os dedos).';
  if (w.infection > 0) return 'Infeccionou: desinfete, troque a atadura e tome antibiótico.';
  if (w.bleed > 0.3 && !w.bandage) return 'Sangrando: enfaixe logo.';
  if (info.needs === 'sutura' && !w.sutured) return 'Corte fundo: sem sutura continua vazando e demora a fechar.';
  if (info.needs === 'tala' && !w.splinted) return 'Imobilize com uma tala. Sem ela, não sara direito.';
  if (info.needs === 'pomada' && !w.ointment) return 'Pomada ajuda a queimadura a sarar e alivia a dor.';
  if (w.bandage && !w.bandage.clean) return 'Atadura suja atrai infecção: troque.';
  return 'Descanse, coma e durma: o corpo sara sozinho.';
}

export class HealthRows implements BodyTabExtension {
  constructor(private readonly s: GameServices) {}

  rows(): ListRow[] {
    const sv = this.s.session.survival;
    if (!sv) return [];
    const h = sv.survivor.health;
    const rows: ListRow[] = [{ kind: 'header', text: 'Ferimentos', ...(h.wounds.length ? { right: `dor ${Math.round(h.pain)}` } : {}) }];
    if (!h.wounds.length) rows.push({ kind: 'text', text: 'Nenhum ferimento.' });
    for (const w of h.wounds) rows.push({ kind: 'line', id: `ferida:${w.id}`, text: woundTitle(w), right: status(w), mark: tone(w) });
    const meds: string[] = [];
    if (h.painkiller > 0) meds.push(`analgésico (${Math.ceil(h.painkiller / 60)} h)`);
    if (h.antibiotic > 0) meds.push(`antibiótico (${Math.ceil(h.antibiotic / 60)} h)`);
    if (meds.length) rows.push({ kind: 'text', text: `Agindo: ${meds.join(' · ')}` });
    return rows;
  }

  detail(id: string): ListDetail | null {
    if (!id.startsWith('ferida:')) return null;
    const sv = this.s.session.survival;
    const inv = this.s.session.inventory;
    if (!sv || !inv) return null;
    const h = sv.survivor.health;
    const w = h.byId(Number(id.slice(7)));
    if (!w) return null;
    const opts = treatmentsFor(w, h, inv, this.s.session.nowDays());
    return {
      title: woundTitle(w),
      tags: `gravidade ${Math.round(w.sev * 100)}% · ${status(w)} · sujeira ${Math.round(Math.min(1, w.dirt) * 100)}%${w.infection > 0 ? ` · infecção ${Math.round(w.infection * 100)}%` : ''}`,
      tagsColor: tone(w) === 'bad' ? '#f07a6a' : tone(w) === 'warn' ? '#f0b060' : '#9fd88a',
      desc: advice(w),
      actions: opts.map((o) => ({
        label: o.label,
        enabled: o.enabled,
        ...(o.reason ? { reason: o.reason } : {}),
        run: () => this.s.bus.emit('health:treat', { wound: w.id, option: o.id }),
      })),
    };
  }
}
