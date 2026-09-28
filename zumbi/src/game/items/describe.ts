/**
 * Atributos do item em uma linha curta para a ficha (painel ITENS): o que a
 * roupa protege, quanto a arma bate, calibre e barulho da arma de fogo,
 * quanto a mochila leva. Conta com o estado (roupa rasgada protege menos).
 */
import { wearFactors, type ItemState } from './condition';
import type { ItemDef } from './ItemTypes';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const dec = (v: number) => v.toFixed(2).replace('.', ',');

export function itemStats(def: ItemDef, st: ItemState | undefined): string | null {
  const out: string[] = [];
  if (def.gun) {
    const g = def.gun;
    out.push(`Calibre ${g.caliber === '12' ? '12' : g.caliber.startsWith('9') ? g.caliber.replace('mm', ' mm') : `.${g.caliber}`}`);
    out.push(`${st?.am ?? 0}/${g.capacity} balas`);
    out.push(`dano ${g.damage}`);
    out.push(`alcance ${g.range} m`);
    out.push(`barulho ${g.noise >= 2500 ? 'muito alto' : g.noise >= 1800 ? 'alto' : 'médio'}`);
  } else if (def.melee) {
    const m = def.melee;
    out.push(`Dano ${m.damage}`);
    out.push(`alcance ${m.reach < 0.7 ? 'curto' : m.reach < 1.1 ? 'médio' : 'longo'}`);
    out.push(m.speed >= 1.2 ? 'rápida' : m.speed >= 0.85 ? 'ritmo normal' : 'lenta');
    out.push(m.kind === 'corte' ? 'corta' : m.kind === 'perfuracao' ? 'perfura' : 'pancada');
  }
  if (def.wear) {
    const f = wearFactors(def, st);
    const prot = [f.bite > 0.005 ? `mordida ${pct(f.bite)}` : '', f.scratch > 0.005 ? `arranhão ${pct(f.scratch)}` : ''].filter(Boolean);
    out.push(prot.length ? `Protege: ${prot.join(' · ')}` : 'Não protege de ataque');
    if (f.insulation > 0.005) out.push(`calor ${dec(f.insulation)}`);
  }
  if (def.bag) out.push(`Leva ${def.bag.capacity} kg`);
  return out.length ? out.join(' · ') : null;
}
