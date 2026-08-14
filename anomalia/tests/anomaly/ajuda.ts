/** Montagens comuns aos testes de ANOMALY. */

import type { Inventory, Location, PlayerTrace } from '../../core/anomaly/types.ts';
import { blade } from '../../core/anomaly/catalog.ts';
import { traceVazio } from '../../core/anomaly/perception.ts';

export function inventarioBasico(): Inventory {
  return {
    backpackId: 'BP_ESCOLAR',
    modules: [],
    blades: [blade('BL_FACAO')],
    cargaKg: 6,
    slotsUsados: 5,
    backpackValue: 40,
    throwables: 2,
    lanternaAcesa: false,
    ferimentoAberto: false,
  };
}

export function inventarioSemNada(): Inventory {
  return {
    backpackId: 'BP_SACOLA',
    modules: [],
    blades: [],
    cargaKg: 1,
    slotsUsados: 1,
    backpackValue: 0,
    throwables: 0,
    lanternaAcesa: false,
    ferimentoAberto: false,
  };
}

/** Um jogador andando normalmente: faz barulho, se mexe, esquenta e cheira. */
export function rastroDeQuemAnda(): PlayerTrace {
  return {
    ...traceVazio(),
    som: 35, movimento: 45, cheiro: 30, calor: 40, metal: 40, luz: 0,
    voz: 0, sangue: 0, memoria: 0,
  };
}

export function locais(): Location[] {
  return [
    { id: 'L_HOSP', type: 'HOSPITAL', condition: 'INTACTO', weather: 'SECO', danger: 5, neighbors: ['L_ESTR'] },
    { id: 'L_ESTR', type: 'ESTRADA', condition: 'INTACTO', weather: 'SECO', danger: 3, neighbors: ['L_HOSP', 'L_MERC'] },
    { id: 'L_MERC', type: 'MERCADO', condition: 'INTACTO', weather: 'SECO', danger: 4, neighbors: ['L_ESTR'] },
    { id: 'L_CASA', type: 'CASA', condition: 'INTACTO', weather: 'SECO', danger: 2, neighbors: ['L_ESTR'] },
    { id: 'L_ABRI', type: 'ABRIGO', condition: 'INTACTO', weather: 'SECO', danger: 1, neighbors: ['L_CASA'] },
  ];
}
