/**
 * Aba FABRICAR: o que dá para fazer agora primeiro, depois todas as receitas
 * por categoria (apagadas quando falta algo). Tocar numa receita abre, logo
 * abaixo dela, o que ela leva (✓ tem, ✗ falta) e libera o botão FAZER.
 * Só lê e pede pelo EventBus ('craft:start'); quem faz é a cena.
 */
import type { GameServices } from '../../core/Services';
import type { CraftCheck } from '../../crafting/Crafting';
import { RECIPE_BY_ID, RECIPE_CAT_LABEL, RECIPES, type Recipe, type RecipeCat } from '../../crafting/Recipes';
import { itemDef } from '../../items/ItemCatalog';
import { SKILL_LABEL } from '../../skills/Skills';
import type { ListDetail, ListRow, ListSource } from '../panel/ListView';
import { UI } from '../theme';

const OK = '#9fd88a';
const MISSING = '#f07a6a';

function iconOf(r: Recipe): string | undefined {
  const id = r.icon ?? r.out[0]?.id ?? (r.structure ? 'lenha' : undefined);
  return id ? itemDef(id)?.icon : undefined;
}

function timeText(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export class CraftTab implements ListSource {
  constructor(private readonly s: GameServices) {}

  rows(selected: string | null): ListRow[] {
    const cs = this.s.session.crafting;
    if (!cs) return [{ kind: 'text', text: 'Sem jogo em andamento.' }];
    const env = cs.env();
    const checks = new Map<string, CraftCheck>();
    // Construção: o lugar se escolhe depois, no modo construir; aqui conta só o material.
    const envNoPlace = { ...env, canPlace: () => null };
    for (const r of RECIPES) checks.set(r.id, cs.check(r, r.structure ? envNoPlace : env));
    const rows: ListRow[] = [];
    const near = [...env.stations].map((s) => (s === 'fogo' ? 'fogo' : s === 'forno' ? 'forno' : 'bancada'));
    rows.push({ kind: 'header', text: 'Por perto', right: near.length ? near.join(' · ') : 'nada' });
    if (!near.length) rows.push({ kind: 'text', text: 'Fogueira acesa ou fogão com gás liberam a cozinha.', color: UI.textDim });

    const line = (r: Recipe, c: CraftCheck) => {
      const missing = c.lines.filter((l) => !l.ok);
      const right = c.ok ? timeText(cs.minutesFor(r)) : missing.some((l) => l.kind === 'station') ? (r.station === 'forno' ? 'sem forno' : r.station === 'bancada' ? 'sem bancada' : 'sem fogo') : `falta ${missing.length}`;
      rows.push({ kind: 'line', id: `r:${r.id}`, ...(iconOf(r) ? { icon: iconOf(r)! } : {}), text: r.name, right, dim: !c.ok, ...(c.ok ? {} : { mark: 'warn' as const }) });
      if (selected === `r:${r.id}`) for (const l of c.lines) rows.push({ kind: 'text', text: `   ${l.ok ? '✓' : '✗'} ${l.label}`, color: l.ok ? OK : MISSING });
    };

    const ready = RECIPES.filter((r) => checks.get(r.id)!.ok);
    if (ready.length) {
      rows.push({ kind: 'header', text: 'Dá para fazer agora', right: String(ready.length) });
      for (const r of ready) line(r, checks.get(r.id)!);
    }
    const cats = Object.keys(RECIPE_CAT_LABEL) as RecipeCat[];
    for (const cat of cats) {
      const list = RECIPES.filter((r) => r.cat === cat && !checks.get(r.id)!.ok);
      if (!list.length) continue;
      rows.push({ kind: 'header', text: RECIPE_CAT_LABEL[cat] });
      for (const r of list) line(r, checks.get(r.id)!);
    }
    return rows;
  }

  detail(selected: string | null): ListDetail {
    const cs = this.s.session.crafting;
    const r = selected?.startsWith('r:') ? RECIPE_BY_ID.get(selected.slice(2)) : undefined;
    if (!cs || !r) {
      return {
        title: 'Fabricar',
        desc: 'Toque numa receita para ver o que ela leva.',
        actions: [],
      };
    }
    const c = cs.check(r);
    const have = c.lines.filter((l) => l.ok).length;
    const tags = [`~${timeText(cs.minutesFor(r))}`, r.skill ? SKILL_LABEL[r.skill.id] : null, `${have}/${c.lines.length} ok`].filter(Boolean).join(' · ');
    return {
      title: r.name,
      tags,
      tagsColor: c.ok ? OK : UI.textDim,
      desc: r.desc,
      actions: [
        {
          label: r.structure ? 'CONSTRUIR' : 'FAZER',
          // Estrutura: o lugar é escolhido depois; só o material precisa estar ok.
          enabled: r.structure ? c.lines.every((l) => l.ok || l.kind === 'place') : c.ok,
          ...(c.reason ? { reason: c.reason } : {}),
          // Estrutura: entra no modo construir (escolhe o lugar andando); item: faz já.
          run: () => (r.structure ? this.s.bus.emit('build:start', { recipe: r.id }) : this.s.bus.emit('craft:start', { recipe: r.id })),
        },
      ],
    };
  }
}
