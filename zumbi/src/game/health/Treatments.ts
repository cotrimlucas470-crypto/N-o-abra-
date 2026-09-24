/**
 * TRATAMENTOS: o que dá para fazer num ferimento com o que você carrega.
 * Cada opção diz o item usado, quanto tempo leva e — ao terminar — gasta o
 * item (dose, unidade ou desgaste) e aplica o efeito na Saúde.
 *
 * Itens por papel (catálogo):
 * - atadura/gaze/curativo/kit (limpos); tecido limpo; trapo (sujo);
 * - álcool, iodo, água oxigenada, álcool em gel, cachaça, kit (desinfetar);
 *   soro e algodão (lavar); esparadrapo (atadura segura mais tempo);
 * - kit de sutura (bom) ou kit de costura (agulha e linha, pior);
 * - tala ou tala improvisada (fratura/entorse); pomada (queimadura);
 * - pinça (tirar caco; sem pinça, com os dedos, dói e suja).
 */
import { condition, doses, isExpired, type ItemState } from '../items/condition';
import { itemDef } from '../items/ItemCatalog';
import type { ItemContainer } from '../items/ItemContainer';
import type { ItemDef } from '../items/ItemTypes';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { Health, Wound } from './Health';
import { WOUND_INFO, isOpen } from './Wounds';

export interface TreatmentOption {
  id: string;
  label: string;
  /** Minutos de jogo. */
  minutes: number;
  enabled: boolean;
  reason?: string;
  /** Faz o tratamento (gasta o item). Devolve a mensagem. */
  run(): string;
}

interface Found {
  container: ItemContainer;
  index: number;
  def: ItemDef;
  st: ItemState | undefined;
}

function find(inv: PlayerInventory, pred: (d: ItemDef, st: ItemState | undefined) => boolean): Found | null {
  for (const s of inv.stacks()) if (pred(s.def, s.stack.st)) return { container: s.container, index: s.index, def: s.def, st: s.stack.st };
  return null;
}

/** Gasta uma dose (ou uma unidade, se não tem doses). */
function useDose(inv: PlayerInventory, f: Found): void {
  const max = f.def.med?.doses ?? f.def.drink?.doses;
  if (max && max > 1) {
    const left = doses(f.def, f.st) - 1;
    if (left <= 0) f.container.take(f.index, 1);
    else f.container.updateOne(f.index, { ...(f.st ?? {}), dose: left, ...(f.def.drink ? { open: 1 } : {}) });
  } else f.container.take(f.index, 1);
  inv.changed();
}

/** Ferramenta gasta um pouco (pinça, agulha). */
function wear(inv: PlayerInventory, f: Found, amount: number): void {
  if (f.def.condition !== 'durable') return;
  f.container.updateOne(f.index, { ...(f.st ?? {}), c: Math.max(0, condition(f.st) - amount) });
  inv.changed();
}

const hasDose = (d: ItemDef, st: ItemState | undefined) => doses(d, st) > 0;

/** Rende menos vencido. */
const power = (d: ItemDef, st: ItemState | undefined, now: number) => (isExpired(d, st, now) ? 0.5 : 1);

const CLEAN_BANDAGES = ['atadura', 'gaze', 'ataduraImprovisada', 'curativoAdesivo', 'tecido'];
const DISINFECT = (d: ItemDef) => !!d.med?.disinfect || d.tags.includes('desinfetante');

export function treatmentsFor(w: Wound, health: Health, inv: PlayerInventory, now: number, speed = 1): TreatmentOption[] {
  const out: TreatmentOption[] = [];
  const t = (m: number) => Math.max(1, Math.round(m * speed));
  const open = isOpen(w.kind);
  const small = w.kind === 'arranhao' || (w.kind === 'corte' && w.sev < 0.5);

  // Tirar o caco primeiro (senão não sara).
  if (w.glass) {
    const tweezers = find(inv, (d, st) => d.tags.includes('pinca') && condition(st) > 0);
    out.push({
      id: 'caco',
      label: tweezers ? 'TIRAR CACO (PINÇA)' : 'TIRAR CACO (DEDOS)',
      minutes: t(tweezers ? 6 : 4),
      enabled: true,
      run: () => {
        health.removeGlass(w.id);
        if (tweezers) {
          wear(inv, tweezers, 0.02);
          return 'Tirou o caco com a pinça.';
        }
        // Com os dedos: rasga mais e suja.
        const x = health.byId(w.id);
        if (x) {
          x.bleed = Math.min(1, x.bleed + 0.3);
          x.dirt += 0.3;
        }
        return 'Tirou o caco com os dedos. Doeu.';
      },
    });
  }

  if (open) {
    // Atadura
    if (w.bandage) {
      out.push({
        id: 'tirarAtadura',
        label: w.bandage.clean ? 'TIRAR ATADURA' : 'TIRAR ATADURA SUJA',
        minutes: t(1),
        enabled: true,
        run: () => {
          health.unbandage(w.id);
          if (inv.add('ataduraSuja', 1) === 0) return 'Tirou a atadura (e jogou fora).';
          return 'Tirou a atadura. Dá para lavar e usar de novo.';
        },
      });
    }
    const clean = find(inv, (d) => CLEAN_BANDAGES.includes(d.id) && (d.id !== 'curativoAdesivo' || small));
    const kit = find(inv, (d, st) => d.id === 'kitPrimeirosSocorros' && hasDose(d, st));
    const dirty = find(inv, (d) => d.id === 'trapo' || d.id === 'ataduraSuja');
    const tape = find(inv, (d) => d.id === 'esparadrapo');
    const verb = w.bandage ? 'TROCAR' : 'ENFAIXAR';
    if (kit) {
      out.push({
        id: 'kit',
        label: 'USAR KIT',
        minutes: t(6),
        enabled: true,
        run: () => {
          if (w.bandage) health.unbandage(w.id);
          health.disinfect(w.id, power(kit.def, kit.st, now));
          health.bandage(w.id, true);
          useDose(inv, kit);
          return 'Limpou e enfaixou com o kit.';
        },
      });
    }
    if (clean) {
      out.push({
        id: 'atadura',
        label: `${verb} (${clean.def.name.toUpperCase()})`,
        minutes: t(3),
        enabled: true,
        run: () => {
          if (w.bandage) health.unbandage(w.id);
          health.bandage(w.id, true);
          // Esparadrapo segura a atadura: fica limpa por mais tempo.
          const x = health.byId(w.id);
          if (tape && x?.bandage) x.bandage.age = -6 * 60;
          clean.container.take(clean.index, 1);
          inv.changed();
          return `Enfaixou com ${clean.def.name.toLowerCase()}.`;
        },
      });
    } else if (dirty) {
      out.push({
        id: 'trapo',
        label: `${verb} (${dirty.def.name.toUpperCase()})`,
        minutes: t(3),
        enabled: true,
        run: () => {
          if (w.bandage) health.unbandage(w.id);
          health.bandage(w.id, false);
          dirty.container.take(dirty.index, 1);
          inv.changed();
          return 'Enfaixou com pano sujo. Estanca, mas pode infeccionar.';
        },
      });
    } else if (!kit) {
      out.push({ id: 'atadura', label: verb, minutes: 0, enabled: false, reason: 'Precisa de atadura, gaze, pano limpo ou um trapo.', run: () => '' });
    }
    // Desinfetar / lavar
    const dis = find(inv, (d, st) => DISINFECT(d) && hasDose(d, st));
    if (dis) {
      out.push({
        id: 'desinfetar',
        label: `DESINFETAR (${dis.def.name.toUpperCase()})`,
        minutes: t(2),
        enabled: true,
        run: () => {
          const p = power(dis.def, dis.st, now) * (dis.def.id === 'alcoolGel' ? 0.7 : dis.def.id === 'iodo' ? 1.2 : dis.def.id === 'cachaca' ? 0.8 : 1);
          health.disinfect(w.id, p);
          useDose(inv, dis);
          return dis.def.id === 'cachaca' ? 'Desinfetou com cachaça. Ardeu muito.' : 'Ferida desinfetada.';
        },
      });
    } else {
      const wash = find(inv, (d, st) => (d.id === 'soroFisiologico' && hasDose(d, st)) || d.id === 'algodao');
      if (wash) {
        out.push({
          id: 'lavar',
          label: `LIMPAR (${wash.def.name.toUpperCase()})`,
          minutes: t(2),
          enabled: true,
          run: () => {
            const x = health.byId(w.id);
            if (x) x.dirt = Math.max(0, x.dirt - (wash.def.id === 'algodao' ? 0.3 : 0.5));
            useDose(inv, wash);
            return 'Limpou a ferida.';
          },
        });
      } else out.push({ id: 'desinfetar', label: 'DESINFETAR', minutes: 0, enabled: false, reason: 'Precisa de álcool, iodo, água oxigenada ou cachaça.', run: () => '' });
    }
  }

  // Sutura
  if ((w.kind === 'laceracao' || w.kind === 'perfuracao' || w.kind === 'mordida' || (w.kind === 'corte' && w.sev > 0.5)) && !w.sutured) {
    const kitS = find(inv, (d, st) => d.id === 'kitSutura' && hasDose(d, st));
    const needle = find(inv, (d, st) => d.tags.includes('agulha') && condition(st) > 0);
    const f = kitS ?? needle;
    out.push({
      id: 'suturar',
      label: kitS ? 'SUTURAR' : needle ? 'COSTURAR (AGULHA)' : 'SUTURAR',
      minutes: t(kitS ? 20 : 30),
      enabled: !!f && !w.glass,
      ...(!f ? { reason: 'Precisa de kit de sutura (ou agulha e linha).' } : w.glass ? { reason: 'Tire o caco antes.' } : {}),
      run: () => {
        health.suture(w.id);
        if (kitS) useDose(inv, kitS);
        else if (needle) {
          wear(inv, needle, 0.1);
          const x = health.byId(w.id);
          if (x) x.dirt += 0.25;
        }
        return kitS ? 'Suturou o corte.' : 'Costurou o corte com agulha e linha. Ficou torto, mas fechou.';
      },
    });
  }

  // Tala
  if ((w.kind === 'fratura' || w.kind === 'entorse') && !w.splinted) {
    const splint = find(inv, (d) => d.id === 'tala' || d.id === 'talaImprovisada');
    out.push({
      id: 'tala',
      label: 'IMOBILIZAR (TALA)',
      minutes: t(10),
      enabled: !!splint,
      ...(!splint ? { reason: 'Precisa de uma tala (ou faça uma com galho e trapo).' } : {}),
      run: () => {
        health.splint(w.id);
        splint!.container.take(splint!.index, 1);
        inv.changed();
        return 'Imobilizou com a tala.';
      },
    });
  }

  // Pomada
  if ((w.kind === 'queimadura' || w.kind === 'arranhao' || w.kind === 'corte') && !w.ointment) {
    const oint = find(inv, (d, st) => d.id === 'pomada' && hasDose(d, st));
    if (oint || w.kind === 'queimadura') {
      out.push({
        id: 'pomada',
        label: 'PASSAR POMADA',
        minutes: t(2),
        enabled: !!oint,
        ...(!oint ? { reason: 'Precisa de pomada cicatrizante.' } : {}),
        run: () => {
          health.applyOintment(w.id);
          useDose(inv, oint!);
          return 'Passou pomada.';
        },
      });
    }
  }
  return out;
}

/** O ferimento mais urgente (sangrando mais, depois sem tratar). */
export function mostUrgent(health: Health): Wound | null {
  let best: Wound | null = null;
  let score = -1;
  for (const w of health.wounds) {
    const info = WOUND_INFO[w.kind];
    const s = w.bleed * info.bleedHp * (w.bandage ? 0.1 : 1) * 10 + (w.glass ? 5 : 0) + (isOpen(w.kind) && !w.bandage ? 3 : 0) + (info.needs === 'tala' && !w.splinted ? 4 : 0) + w.infection * 6;
    if (s > score) {
      score = s;
      best = w;
    }
  }
  return best;
}

/** Nome de um item pelo id (mensagens). */
export function itemName(id: string): string {
  return itemDef(id)?.name ?? id;
}
