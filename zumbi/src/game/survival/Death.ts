/**
 * MORTE EXPLICADA (puro): quando a vida acaba, o jogo diz o que matou e as
 * circunstâncias que pesaram — para o jogador entender o erro (barulho,
 * peso, cansaço, cercado, ferida sem atadura, mordida antiga).
 */
import type { Health } from '../health/Health';
import { PART_INFO, WOUND_INFO } from '../health/Wounds';
import type { Body } from './Body';

export interface DeathContext {
  health: Health;
  body: Body;
  /** Registro recente dos ataques ({t: s de simulação}). */
  log: readonly { t: number; text: string }[];
  now: number;
  /** Última vez que um zumbi feriu. */
  lastHarm: number;
  grabbed: number;
  down: boolean;
  crowd: number;
  /** Peso sentido / capacidade. */
  load: number;
  stamina: number;
  /** Escuro (0..1) e se estava agachado. */
  darkness: number;
  /** Últimos barulhos fortes do jogador (tiro, vidro...). */
  loudNoises: readonly string[];
  day: number;
  kills: number;
}

export interface DeathReport {
  title: string;
  cause: string;
  details: string[];
  days: number;
  kills: number;
}

export function explainDeath(c: DeathContext): DeathReport {
  const details: string[] = [];
  const base = { days: c.day, kills: c.kills };
  const zombieHarm = c.now - c.lastHarm < 10;
  const zp = c.health.zombieProgress;
  if (zombieHarm) {
    const recent = c.log.filter((e) => c.now - e.t < 15).slice(-5).map((e) => e.text);
    const cause = c.down ? 'Derrubado e mordido no chão.' : c.grabbed > 1 ? `Agarrado por ${c.grabbed} zumbis ao mesmo tempo.` : c.grabbed === 1 ? 'Agarrado e mordido.' : 'Os zumbis chegaram perto demais.';
    if (c.crowd > 2) details.push(`Cercado: ${c.crowd} zumbis em volta.`);
    if (c.load > 0.85) details.push(`Carregando peso demais (${Math.round(c.load * 100)}% da capacidade): lento e sem fôlego para escapar.`);
    if (c.stamina < 0.2) details.push('Sem fôlego: não conseguiu correr nem se soltar.');
    if (c.health.effects().legs > 0.3) details.push('Perna ferida: mancando, não deu para fugir.');
    if (c.body.fatigue > 75) details.push('Exausto de sono: mais fraco e lento.');
    if (c.loudNoises.length) details.push(`Barulho atraiu gente: ${[...new Set(c.loudNoises)].slice(0, 3).join(', ')}.`);
    if (c.darkness > 0.6) details.push('No escuro: eles viram primeiro.');
    for (const r of recent) details.push(r);
    return { title: 'Morto pelos zumbis', cause, details, ...base };
  }
  if (zp >= 0.9) {
    const src = c.health.zombie?.src;
    const hours = c.health.zombie ? Math.round(c.health.zombie.t / 60) : 0;
    details.push(src ? `${src}, ${hours} horas antes.` : `Infectado havia ${hours} horas.`);
    details.push('Mordida de zumbi quase sempre infecta. Não tem cura.');
    return { title: 'A infecção venceu', cause: 'Febre, delírio… e o fim.', details, ...base };
  }
  const bleeding = c.health.wounds.filter((w) => w.bleed > 0.05);
  if (c.health.bleeding > 1.5 && bleeding.length) {
    for (const w of bleeding.slice(0, 4)) details.push(`${WOUND_INFO[w.kind].label} ${PART_INFO[w.part].where}${w.bandage ? '' : ' sem atadura'}${WOUND_INFO[w.kind].needs === 'sutura' && !w.sutured ? ', precisava de pontos' : ''}.`);
    return { title: 'Sangrou até morrer', cause: 'Perdeu sangue demais.', details, ...base };
  }
  const infected = c.health.wounds.filter((w) => w.infection > 0.3);
  if (infected.length) {
    for (const w of infected.slice(0, 3)) details.push(`${WOUND_INFO[w.kind].label} ${PART_INFO[w.part].where} infeccionou (sem desinfetar/antibiótico).`);
    return { title: 'Infecção', cause: 'Uma ferida infeccionou e tomou conta.', details, ...base };
  }
  const b = c.body;
  if (b.thirst >= 95) return { title: 'Desidratação', cause: 'Dias sem beber água.', details: ['Água limpa: torneira (enquanto houver), chuva, rio fervido.'], ...base };
  if (b.hunger >= 95) return { title: 'Fome', cause: 'O corpo não aguentou sem comida.', details: ['Comida estraga: enlatados duram, fresca não.'], ...base };
  if (b.temp < 35) return { title: 'Hipotermia', cause: 'Frio demais.', details: ['Roupa molhada e vento esfriam rápido. Abrigo, fogo e roupa seca salvam.'], ...base };
  if (b.temp > 39.5) return { title: 'Calor extremo', cause: 'O corpo superaqueceu.', details: [], ...base };
  if (b.sickness > 0.25) return { title: 'Doença', cause: 'Comida ou água estragada.', details: ['Ferva a água; olhe a validade.'], ...base };
  return { title: 'Morreu', cause: 'Os ferimentos foram demais.', details: c.log.slice(-3).map((e) => e.text), ...base };
}
