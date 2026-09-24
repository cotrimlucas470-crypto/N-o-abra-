/**
 * Armas, aparelhos, leitura e objetos pessoais:
 * - RECARREGAR / DESCARREGAR / DESTRAVAR (arma de fogo na mão);
 * - LER: manual ensina (sobe a habilidade); romance, revista, gibi animam;
 *   jornal, diário e bilhete contam o que aconteceu. Precisa de luz.
 * - OUVIR (rádio): boletim e previsão do tempo; CHAMAR (rádio comunicador);
 * - CARREGAR (carregador portátil → celular/lanterna); ACENDER vela;
 * - VER HORA (relógio, celular); ABRIR carteira; JOGAR paciência; OLHAR foto;
 *   VER MAPA (mapa da cidade; o anotado marca lugares).
 */
import { charge, Flag } from '../../items/condition';
import { itemDef } from '../../items/ItemCatalog';
import { BOOK_SKILL, SKILL_LABEL } from '../../skills/Skills';
import { consumeOne, findTagged, setState } from './access';
import { fail, ok, type ItemActionContext, type ItemActionDef, type ItemResult } from './types';

const inHandOrInv = (c: ItemActionContext) => c.loc.where === 'hand' || c.loc.where === 'inv';
const pad = (n: number) => String(n).padStart(2, '0');

/** Boletins do rádio (o mundo vai calando com os dias). */
const BROADCASTS = [
  'Boletim: "…permaneçam em casa, portas trancadas. Abrigos no ginásio municipal e no hospital regional…"',
  'Boletim: "…o exército mantém o bloqueio nas saídas da cidade. Não se aproximem das barreiras…"',
  'Boletim gravado se repete: "…ferve a água, racione comida, evite barulho à noite…"',
  'Uma voz cansada lê nomes de desaparecidos. Depois, chiado.',
  'Só a previsão do tempo automática ainda toca. O resto é estática.',
];

function timed(c: ItemActionContext, id: string, label: string, minutes: number, done: () => ItemResult): ItemResult {
  return { ok: true, timed: { id, label, minutes: minutes * c.survivor.effects().actionTime, done: () => done() } };
}

export const GEAR_ACTIONS: ItemActionDef[] = [
  // ---------------------------------------------------------------- armas de fogo
  {
    id: 'recarregar',
    label: 'RECARREGAR',
    order: 13,
    when: (c) => !!c.def.gun && c.loc.where === 'hand' && !!c.hooks.reload,
    run: (c) => {
      const r = c.hooks.reload!();
      return typeof r === 'string' ? fail(r) : { ok: true, timed: r };
    },
  },
  {
    id: 'destravar',
    label: 'DESTRAVAR',
    order: 12,
    when: (c) => !!c.def.gun && c.loc.where === 'hand' && ((c.st?.f ?? 0) & Flag.Emperrada) !== 0 && !!c.hooks.unjam,
    run: (c) => {
      const r = c.hooks.unjam!();
      return typeof r === 'string' ? fail(r) : { ok: true, timed: r };
    },
  },
  {
    id: 'descarregar',
    label: 'DESCARREGAR',
    order: 45,
    when: (c) => !!c.def.gun && inHandOrInv(c) && (c.st?.am ?? 0) > 0,
    run: (c) => {
      const g = c.def.gun!;
      const ammoId = ['municao38', 'municao9', 'municao40', 'cartucho12', 'municao22', 'municao308'].find((id) => itemDef(id)?.ammo?.caliber === g.caliber);
      if (!ammoId) return fail('Munição desconhecida.');
      const n = c.st?.am ?? 0;
      const got = c.inventory.add(ammoId, n);
      if (got < n) c.hooks.drop(ammoId, n - got, undefined);
      setState(c, { ...(c.st ?? {}), am: 0 });
      return ok(`Tirou ${n} bala${n > 1 ? 's' : ''}.`, 'info');
    },
  },
  // ---------------------------------------------------------------- leitura
  {
    id: 'ler',
    label: (c) => (c.def.id === 'mapaCidade' || c.def.id === 'mapaAnotado' ? 'VER MAPA' : c.def.id === 'baralho' ? 'JOGAR' : c.def.id === 'fotografia' ? 'OLHAR' : 'LER'),
    order: 14,
    when: (c) => !!c.def.read && inHandOrInv(c),
    can: (c) => {
      if (c.def.id === 'mapaCidade' || c.def.id === 'mapaAnotado' || c.def.id === 'fotografia') return true;
      const light = c.hooks.light?.() ?? 1;
      return light >= 0.3 ? true : 'Escuro demais para ler. Acenda uma luz.';
    },
    run: (c) => {
      const id = c.def.id;
      if (id === 'mapaCidade' || id === 'mapaAnotado') {
        c.hooks.show?.('mapa', { annotated: id === 'mapaAnotado' });
        return ok();
      }
      const minutes = c.def.read!.minutes;
      const skill = BOOK_SKILL[id];
      const sv = c.survivor;
      return timed(c, 'ler', id === 'baralho' ? 'Jogando paciência' : `Lendo: ${c.def.name.toLowerCase()}`, minutes, () => {
        if (skill) {
          const lvl = sv.skills.readBook(id, skill);
          sv.body.cheer(3);
          return lvl ? ok(`Aprendeu: ${SKILL_LABEL[skill]} nível ${lvl}. Praticando, rende o dobro.`) : ok('Você já conhecia esse manual.', 'info');
        }
        if (id === 'jornal') {
          sv.body.cheer(-3);
          return ok('"SURTO SE ESPALHA". As notícias pararam no terceiro dia.', 'info');
        }
        if (id === 'diario') {
          sv.body.cheer(-5);
          return ok('"…a febre não baixa. Se eu não voltar, não abram o porão." Aqui acaba.', 'info');
        }
        if (id === 'bilhete') return ok(c.def.description, 'info');
        if (id === 'documentos') return ok('Nomes de gente que não vai voltar. Papel serve para acender fogo.', 'info');
        const fun = id === 'baralho' ? 8 : minutes >= 120 ? 15 : 9;
        const again = sv.skills.books.has(id);
        sv.skills.books.add(id);
        sv.body.cheer(again ? fun / 3 : fun);
        return ok(again ? 'Já conhecia, mas distraiu um pouco.' : 'Distraiu a cabeça. O ânimo melhorou.');
      });
    },
  },
  {
    id: 'olharFoto',
    label: 'OLHAR',
    order: 14,
    when: (c) => c.def.id === 'fotografia' && inHandOrInv(c),
    run: (c) => {
      c.survivor.body.cheer(3);
      return ok('Uma família sorrindo num churrasco. Parece outro mundo.', 'info');
    },
  },
  // ---------------------------------------------------------------- aparelhos
  {
    id: 'ouvir',
    label: 'OUVIR',
    order: 14,
    when: (c) => c.def.id === 'radio' && inHandOrInv(c),
    can: (c) => (charge(c.def, c.st) > 0.02 ? true : 'Sem pilha.'),
    run: (c) =>
      timed(c, 'radio', 'Ouvindo o rádio', 15, () => {
        const ch = Math.max(0, charge(c.def, c.st) - 15 / (c.def.power!.hours * 60));
        setState(c, { ...(c.st ?? {}), ch });
        c.hooks.radioHeard?.();
        c.survivor.body.cheer(2);
        const day = c.hooks.time?.().day ?? 1;
        return ok(`${BROADCASTS[Math.min(BROADCASTS.length - 1, Math.floor((day - 1) / 2))]} Previsão do tempo na aba TEMPO.`, 'info');
      }),
  },
  {
    id: 'chamar',
    label: 'CHAMAR',
    order: 14,
    when: (c) => c.def.id === 'radioComunicador' && inHandOrInv(c),
    can: (c) => (charge(c.def, c.st) > 0.02 ? true : 'Sem pilha.'),
    run: (c) =>
      timed(c, 'radio', 'Chamando no rádio', 5, () => {
        setState(c, { ...(c.st ?? {}), ch: Math.max(0, charge(c.def, c.st) - 5 / (c.def.power!.hours * 60)) });
        return ok('"Alguém na escuta?" Só chiado responde.', 'info');
      }),
  },
  {
    id: 'carregarAparelho',
    label: 'CARREGAR APARELHO',
    order: 40,
    when: (c) => c.def.id === 'powerbank' && c.loc.where === 'inv',
    can: (c) => {
      if (charge(c.def, c.st) <= 0.05) return 'Carregador vazio.';
      for (const s of c.inventory.stacks()) if (s.def.power && !s.def.power.needs && s.def.id !== 'powerbank' && s.def.condition === 'device' && charge(s.def, s.stack.st) < 0.95) return true;
      const h = c.inventory.handDef;
      if (h?.power && !h.power.needs && h.condition === 'device' && charge(h, c.inventory.hand?.st) < 0.95) return true;
      return 'Nenhum aparelho para carregar (celular...).';
    },
    run: (c) =>
      timed(c, 'carregar', 'Carregando o aparelho', 60, () => {
        const pb = charge(c.def, c.st);
        const h = c.inventory.hand;
        const hd = c.inventory.handDef;
        if (h && hd?.power && !hd.power.needs && hd.condition === 'device' && charge(hd, h.st) < 0.95) {
          const give = Math.min(pb, 1 - charge(hd, h.st));
          c.inventory.updateHand({ ...(h.st ?? {}), ch: charge(hd, h.st) + give });
          setState(c, { ...(c.st ?? {}), ch: pb - give });
          return ok(`${hd.name} carregado.`);
        }
        for (const s of c.inventory.stacks()) {
          if (!s.def.power || s.def.power.needs || s.def.id === 'powerbank' || s.def.condition !== 'device') continue;
          const cur = charge(s.def, s.stack.st);
          if (cur >= 0.95) continue;
          const give = Math.min(pb, 1 - cur);
          const target = { container: s.container, defId: s.def.id, st: s.stack.st };
          // Primeiro o carregador (a posição dele na lista pode mudar ao mexer no aparelho).
          setState(c, { ...(c.st ?? {}), ch: pb - give });
          const i = target.container.stacks.findIndex((x) => x.defId === target.defId && JSON.stringify(x.st ?? {}) === JSON.stringify(target.st ?? {}));
          if (i >= 0) target.container.updateOne(i, { ...(target.st ?? {}), ch: cur + give });
          c.inventory.changed();
          return ok(`${s.def.name} carregado.`);
        }
        return fail('Nada para carregar.');
      }),
  },
  {
    id: 'verHora',
    label: 'VER HORA',
    order: 50,
    when: (c) => (c.def.tags.includes('relogio') || c.def.id === 'celular') && inHandOrInv(c) && !!c.hooks.time,
    can: (c) => (c.def.id !== 'celular' || charge(c.def, c.st) > 0.02 ? true : 'Bateria acabou.'),
    run: (c) => {
      const t = c.hooks.time!();
      const m = Math.floor(t.minuteOfDay);
      return ok(`São ${pad(Math.floor(m / 60))}:${pad(m % 60)}. Dia ${t.day}.`, 'info');
    },
  },
  // ---------------------------------------------------------------- pessoais
  {
    id: 'abrirCarteira',
    label: 'ABRIR',
    order: 15,
    when: (c) => c.def.id === 'carteira' && c.loc.where === 'inv',
    run: (c) => {
      const r = c.hooks.rng ?? Math.random;
      consumeOne(c);
      const cash = 5 + Math.floor(r() * 80);
      const got = [`R$ ${cash}`];
      c.inventory.add('dinheiro', cash);
      if (r() < 0.6) {
        c.inventory.add('documentos', 1);
        got.push('documentos');
      }
      if (r() < 0.35) {
        c.inventory.add('fotografia', 1);
        got.push('uma foto');
      }
      if (r() < 0.12) {
        c.inventory.add('chaveCasa', 1);
        got.push('uma chave');
      }
      return ok(`Na carteira: ${got.join(', ')}.`, 'info');
    },
  },
];

/** Vela: acender precisa de fogo (isqueiro gasta carga, fósforo gasta um palito). */
export function lightSource(c: ItemActionContext): string | null {
  const lighter = findTagged(c, 'acender', (st) => (st?.ch ?? 1) > 0.02);
  if (!lighter) return null;
  if (lighter.def.id === 'fosforos') {
    lighter.container.take(lighter.index, 1);
  } else {
    const ch = Math.max(0, (lighter.stack.st?.ch ?? 1) - 0.01);
    lighter.container.updateOne(lighter.index, { ...(lighter.stack.st ?? {}), ch });
  }
  c.inventory.changed();
  return lighter.def.name;
}
