/**
 * Aba TEMPO: dias sobrevividos, data, hora (exata com relógio; aproximada
 * sem), período, clima agora, abrigo e — com rádio — a previsão dos
 * próximos dias. Dormir com alarme também fica aqui.
 */
import type { GameServices } from '../../core/Services';
import { MONTHS, SEASON_LABEL, WEEKDAYS, periodOf } from '../../sim/Calendar';
import { SKY_LABEL } from '../../sim/Weather';
import type { PanelAction } from '../panel/ActionButtons';
import type { ListDetail, ListRow, ListSource } from '../panel/ListView';
import { UI } from '../theme';
import { hasClock } from './BodyTab';

const pad = (n: number) => String(n).padStart(2, '0');

export function timeText(minuteOfDay: number, exact: boolean): string {
  const m = Math.floor(minuteOfDay);
  if (exact) return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  // Sem relógio: o sol diz mais ou menos a hora (meia em meia hora).
  const r = Math.round(m / 30) * 30;
  return `~${pad(Math.floor(r / 60) % 24)}:${pad(r % 60)}`;
}

export function windText(w: number): string {
  return w < 0.2 ? 'sem vento' : w < 0.45 ? 'vento fraco' : w < 0.7 ? 'ventando' : 'vento forte';
}

export class TimeTab implements ListSource {
  constructor(private readonly s: GameServices) {}

  /** Ouviu o boletim hoje (ou ontem à noite)? */
  private radio(): boolean {
    const sv = this.s.session.survival;
    return !!sv && sv.radioDay >= sv.clock.day - 1 && sv.radioDay > 0;
  }

  rows(): ListRow[] {
    const sv = this.s.session.survival;
    const inv = this.s.session.inventory;
    if (!sv || !inv) return [{ kind: 'text', text: 'Sem jogo em andamento.' }];
    const c = sv.clock;
    const date = sv.calendar.dateOf(c.dayIndex);
    const exact = hasClock(inv);
    const w = sv.weather;
    const rows: ListRow[] = [
      { kind: 'header', text: 'Hoje' },
      { kind: 'text', text: `Dia ${c.day} de sobrevivência`, color: UI.text },
      { kind: 'text', text: `${WEEKDAYS[date.weekday]}, ${date.day} de ${MONTHS[date.month - 1]} · ${SEASON_LABEL[date.season]}` },
      { kind: 'text', text: `${timeText(c.minuteOfDay, exact)} · ${periodOf(c.minuteOfDay)}${exact ? '' : ' (sem relógio)'}` },
      { kind: 'header', text: 'Lá fora' },
      { kind: 'text', text: `${Math.round(w.temp)} °C · ${SKY_LABEL[w.sky]} · ${windText(w.wind)}`, color: UI.text },
      { kind: 'text', text: sv.sheltered ? 'Você está abrigado (debaixo de telhado).' : w.rain > 0 ? 'Você está na chuva.' : 'Você está ao ar livre.' },
      { kind: 'header', text: 'Previsão' },
    ];
    if (this.radio()) {
      for (let d = 1; d <= 2; d++) {
        const f = sv.weatherModel.daySummary(c.dayIndex + d);
        const dd = sv.calendar.dateOf(c.dayIndex + d);
        rows.push({ kind: 'text', text: `${d === 1 ? 'Amanhã' : WEEKDAYS[dd.weekday]}: ${f.min}–${f.max} °C · ${SKY_LABEL[f.sky]}${f.rainHours > 0 ? ` · chuva ~${f.rainHours} h` : ''}` });
      }
    } else rows.push({ kind: 'text', text: 'Sem previsão. Um rádio com pilha (OUVIR) ainda pega o boletim.' });
    return rows;
  }

  detail(): ListDetail {
    const sv = this.s.session.survival;
    const inv = this.s.session.inventory;
    const actions: PanelAction[] = [];
    if (sv && inv) {
      const why = sv.survivor.cantSleep();
      const r = why ? { reason: why } : {};
      actions.push({ label: 'DORMIR', enabled: !why, ...r, run: () => this.s.bus.emit('body:sleep', { place: 'chao' }) });
      if (hasClock(inv)) {
        actions.push({ label: 'ATÉ AS 6H', enabled: !why, ...r, run: () => this.s.bus.emit('body:sleep', { place: 'chao', wakeAt: 6 * 60 }) });
        actions.push({ label: 'ATÉ AS 8H', enabled: !why, ...r, run: () => this.s.bus.emit('body:sleep', { place: 'chao', wakeAt: 8 * 60 }) });
      }
    }
    return {
      title: sv ? sv.dateLabel() : '',
      tags: sv ? `Dia ${sv.clock.day} · ${timeText(sv.clock.minuteOfDay, !!inv && hasClock(inv))}` : '',
      desc: 'Dormir aqui é no chão. Uma cama descansa bem mais — procure uma.',
      actions,
    };
  }
}
