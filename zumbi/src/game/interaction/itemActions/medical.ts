/**
 * Remédios e curativos usados pelo inventário:
 * - TOMAR: analgésico/anti-inflamatório/remédio de gripe (dor por horas),
 *   antibiótico (combate infecção), calmante (acalma, dá sono),
 *   antialérgico (dá sono), vitaminas (ânimo). Vencido rende metade.
 * - INJETAR: antibiótico com seringa age o dobro do tempo.
 * - TRATAR: curativo, desinfetante, tala, pomada, kit — aplica no
 *   ferimento mais urgente que aceita aquele item (ação com tempo).
 *   Tratamento completo, ferida por ferida, fica na aba CORPO.
 */
import { doses, isExpired } from '../../items/condition';
import { mostUrgent, treatmentsFor } from '../../health/Treatments';
import { woundTitle } from '../../health/Health';
import { consumeOne, findTagged, setState } from './access';
import { fail, ok, type ItemActionContext, type ItemActionDef } from './types';

const PAIN_HOURS: Record<string, number> = { analgesico: 4, antiInflamatorio: 6, remedioGripe: 4 };
const PILLS = new Set(['analgesico', 'antiInflamatorio', 'remedioGripe', 'antibiotico', 'calmante', 'antialergico', 'vitaminas']);

/** Que tratamento este item faz (para achar a opção certa). */
function roleOf(id: string, c: ItemActionContext): string | null {
  const d = c.def;
  if (d.id === 'kitPrimeirosSocorros') return 'kit';
  if (d.med?.bandage || d.id === 'tecido') return 'atadura';
  if (d.id === 'trapo' || d.id === 'ataduraSuja') return 'trapo';
  if (d.med?.disinfect || d.tags.includes('desinfetante')) return 'desinfetar';
  if (d.id === 'tala' || d.id === 'talaImprovisada') return 'tala';
  if (d.id === 'pomada') return 'pomada';
  if (d.id === 'kitSutura') return 'suturar';
  if (d.tags.includes('pinca')) return 'caco';
  if (d.id === 'soroFisiologico' || d.id === 'algodao') return 'lavar';
  return id ? null : null;
}

/** Uma dose a menos (ou uma unidade). */
function spendDose(c: ItemActionContext): void {
  const max = c.def.med?.doses;
  if (max && max > 1) {
    const left = doses(c.def, c.st) - 1;
    if (left <= 0) consumeOne(c);
    else setState(c, { ...(c.st ?? {}), dose: left });
  } else consumeOne(c);
}

export const MEDICAL_ACTIONS: ItemActionDef[] = [
  {
    id: 'tomar',
    label: 'TOMAR',
    order: 11,
    when: (c) => PILLS.has(c.def.id) && c.loc.where === 'inv',
    can: (c) => (doses(c.def, c.st) > 0 ? true : 'Acabou.'),
    run: (c) => {
      const h = c.survivor.health;
      const b = c.survivor.body;
      const p = isExpired(c.def, c.st, c.now) ? 0.5 : 1;
      const id = c.def.id;
      let msg: string;
      if (PAIN_HOURS[id]) {
        h.takePainkiller((c.def.med?.pain ?? 20) * p, PAIN_HOURS[id]!);
        msg = p < 1 ? 'Tomou. Vencido: fez pouco efeito.' : 'A dor vai aliviar.';
      } else if (id === 'antibiotico') {
        h.takeAntibiotic(12 * p);
        msg = 'Antibiótico tomado. Tome de novo em 12 h.';
      } else if (id === 'calmante') {
        b.cheer(8 * p);
        b.fatigue = Math.min(100, b.fatigue + 15 * p);
        msg = 'Ficou mais calmo. E com sono.';
      } else if (id === 'antialergico') {
        b.fatigue = Math.min(100, b.fatigue + 10 * p);
        msg = 'Deu sono.';
      } else {
        b.cheer(3 * p);
        msg = 'Vitaminas. Parece que ajuda.';
      }
      spendDose(c);
      return ok(msg, 'info');
    },
  },
  {
    id: 'injetar',
    label: 'INJETAR',
    order: 12,
    when: (c) => c.def.id === 'antibiotico' && c.loc.where === 'inv',
    can: (c) => (findTagged(c, 'seringa') ? (doses(c.def, c.st) > 0 ? true : 'Acabou.') : 'Precisa de uma seringa.'),
    run: (c) => {
      const syringe = findTagged(c, 'seringa')!;
      syringe.container.take(syringe.index, 1);
      c.survivor.health.takeAntibiotic(24 * (isExpired(c.def, c.st, c.now) ? 0.5 : 1));
      spendDose(c);
      return ok('Antibiótico injetado: age por um dia.', 'info');
    },
  },
  {
    id: 'tratar',
    label: 'TRATAR',
    order: 12,
    when: (c) => c.loc.where === 'inv' && roleOf(c.def.id, c) !== null,
    can: (c) => {
      const role = roleOf(c.def.id, c)!;
      const h = c.survivor.health;
      const target = h.wounds.find((w) => treatmentsFor(w, h, c.inventory, c.now).some((o) => o.enabled && o.id === role));
      return target ? true : h.wounds.length ? 'Nenhum ferimento precisa disso agora.' : 'Você não está ferido.';
    },
    run: (c) => {
      const role = roleOf(c.def.id, c)!;
      const h = c.survivor.health;
      const urgent = mostUrgent(h);
      const order = urgent ? [urgent, ...h.wounds.filter((w) => w !== urgent)] : h.wounds;
      for (const w of order) {
        const opt = treatmentsFor(w, h, c.inventory, c.now).find((o) => o.enabled && o.id === role);
        if (!opt) continue;
        const minutes = opt.minutes * c.survivor.effects().actionTime;
        return {
          ok: true,
          timed: {
            id: 'tratar',
            label: `Tratando: ${woundTitle(w).toLowerCase()}`,
            minutes,
            done: () => ({ ok: true, message: opt.run(), tone: 'ok' }),
          },
        };
      }
      return fail('Nenhum ferimento precisa disso agora.', 'info');
    },
  },
];
