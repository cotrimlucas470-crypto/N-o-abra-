/**
 * Ecologia — §9. O mundo tem dono.
 *
 * `assignDailyAnomalies` segue o bloco de §9. O que precisou de decisão, e
 * qual foi:
 *
 *   - §9 filtra por `!a.territory.avoids.includes(loc.weather)`, mas os
 *     `avoids` do exemplo de §2 são ALAGADO e QUEIMADA, que são estado do
 *     lugar e não clima. Aqui `avoids` bate contra o tipo E contra a condição
 *     do local; um `avoids` de clima continua funcionando.
 *   - `rng.sample(pool, count)` com pool menor que count devolve o pool
 *     inteiro em vez de estourar.
 *   - o `continue` depois de `migrateTo` é do documento e está mantido: quem
 *     migra sai da lista deste local. Sem isso a anomalia estaria nos dois.
 *
 * As quatro regras de ecologia da mesma seção estão todas aqui, e as duas que
 * dependem de história (perdeu 3 vezes, rádio com 2 dias de atraso) usam o
 * diário de migrações que o mundo carrega.
 */

import type {
  AnomalyDef, AnomalyInstance, AnomalyMemory, Location, MigrationRecord,
} from './types.ts';
import { ANOMALIES, anomaly } from './catalog.ts';
import { criarInstancia } from './stateMachine.ts';
import { aplicarMutacoes, sortearMutacoes } from './mutations.ts';
import { vaiMigrarAmanha } from './memory.ts';
import { rngDaEcologia, sample, type Rng } from './rng.ts';

/** §9: quem for detectado por duas, uma recua e a outra ganha +15. */
export const BONUS_DE_APROXIMACAO = 15;

/** §9: o rádio reporta migrações com 2 dias de atraso e 30% de erro. */
export const ATRASO_DO_RADIO = 2;
export const ERRO_DO_RADIO = 0.30;

export interface EcologyWorld {
  day: number;
  seed: number;
  porLocal: Map<string, AnomalyInstance[]>;
  migracoes: MigrationRecord[];
}

export function criarMundo(seed: number, day = 1): EcologyWorld {
  return { day, seed, porLocal: new Map(), migracoes: [] };
}

/**
 * §2 — A08 só ativa com chuva, A12 só aparece no abrigo. Fora disso elas não
 * existem, e "espere a chuva passar" é uma fraqueza como outra qualquer.
 */
export function estaAtiva(def: AnomalyDef, loc: Location): boolean {
  if (def.exigeClima !== undefined && def.exigeClima !== loc.weather) return false;
  if (def.soNoAbrigo && loc.type !== 'ABRIGO') return false;
  return true;
}

function elegiveisPara(loc: Location): AnomalyDef[] {
  return ANOMALIES.filter((a) =>
    a.territory.prefers.includes(loc.type) &&
    !a.territory.avoids.includes(loc.type) &&
    !a.territory.avoids.includes(loc.condition) &&
    !a.territory.avoids.includes(loc.weather) &&
    estaAtiva(a, loc));
}

function vizinhoDe(loc: Location, todos: readonly Location[], rng: Rng): Location | null {
  const vizinhos = loc.neighbors
    .map((id) => todos.find((l) => l.id === id))
    .filter((l): l is Location => l !== undefined);
  return vizinhos.length > 0 ? rng.pick(vizinhos) : null;
}

export function assignDailyAnomalies(
  locations: readonly Location[],
  day: number,
  seed: number,
  memorias: ReadonlyMap<string, AnomalyMemory> = new Map(),
): EcologyWorld {
  const rng = rngDaEcologia(seed, day);
  const mundo = criarMundo(seed, day);

  for (const loc of locations) {
    const pool = elegiveisPara(loc);

    const count = loc.danger <= 2 ? rng.pick([0, 0, 1])
                : loc.danger <= 4 ? rng.pick([1, 1, 2])
                : rng.pick([1, 2, 2, 3]);

    const chosen = sample(rng, pool, count);

    // migração: quem estava aqui ontem pode ter ido embora
    for (const a of chosen) {
      const mem = memorias.get(a.id);
      const cansouDoLugar = mem ? vaiMigrarAmanha(mem, loc.id) : false;
      const migra = !a.estatica && (cansouDoLugar || rng.next() < a.territory.migrationChance);

      if (migra) {
        const destino = vizinhoDe(loc, locations, rng);
        if (destino) {
          mundo.migracoes.push({ day, anomalyId: a.id, from: loc.id, to: destino.id });
          instanciarEm(mundo, a, destino, day, rng);
        }
        continue;
      }

      instanciarEm(mundo, a, loc, day, rng);
    }
  }

  resolverConvivencia(mundo);
  return mundo;
}

function instanciarEm(
  mundo: EcologyWorld,
  def: AnomalyDef,
  loc: Location,
  day: number,
  rng: Rng,
): void {
  if (def.soNoAbrigo && loc.type !== 'ABRIGO') return;

  const mutacoes = sortearMutacoes(def, day, rng);
  const { spawnCount, burstSpeed } = aplicarMutacoes(def, mutacoes);
  const quantas = Math.max(1, spawnCount);

  const atuais = mundo.porLocal.get(loc.id) ?? [];
  for (let i = 0; i < quantas; i++) {
    const inst = criarInstancia(def.id, loc.id, `${day}:${loc.id}:${def.id}:${i}`);
    inst.mutacoes = [...mutacoes];
    if (burstSpeed !== null) inst.burstSpeed = burstSpeed;
    // §2: nas gêmeas, uma é falsa
    inst.ehCopiaFalsa = def.umaEhFalsa === true && i > 0;
    atuais.push(inst);
  }
  mundo.porLocal.set(loc.id, atuais);
}

/**
 * §9 — duas anomalias no mesmo local se evitam. Nunca atacam juntas: uma
 * recua e a outra ganha pressa.
 */
export function resolverConvivencia(mundo: EcologyWorld): void {
  for (const [, insts] of mundo.porLocal) {
    const distintas = new Set(insts.map((i) => i.defId));
    if (distintas.size < 2) continue;

    const linhaDeFrente = insts[0];
    if (!linhaDeFrente) continue;
    linhaDeFrente.approachBonus = BONUS_DE_APROXIMACAO;

    for (const outra of insts) {
      if (outra === linhaDeFrente || outra.defId === linhaDeFrente.defId) continue;
      outra.state = 'DORMENTE';
      outra.approachBonus = 0;
      outra.distance = Math.max(outra.distance, 35);   // recuou
    }
  }
}

/** §9 — o rádio (V5): 2 dias de atraso, 30% de erro. */
export interface RelatoDoRadio {
  anomalyId: string;
  local: string;
  correto: boolean;
}

export function relatosDoRadio(
  mundo: EcologyWorld,
  hoje: number,
  locations: readonly Location[],
  rng: Rng,
): RelatoDoRadio[] {
  const alvo = hoje - ATRASO_DO_RADIO;
  return mundo.migracoes
    .filter((m) => m.day === alvo)
    .map((m) => {
      if (rng.chance(ERRO_DO_RADIO)) {
        const erradas = locations.filter((l) => l.id !== m.to);
        const local = erradas.length > 0 ? rng.pick(erradas).id : m.to;
        return { anomalyId: m.anomalyId, local, correto: false };
      }
      return { anomalyId: m.anomalyId, local: m.to, correto: true };
    });
}

export function instanciasEm(mundo: EcologyWorld, locationId: string): AnomalyInstance[] {
  return mundo.porLocal.get(locationId) ?? [];
}

export function defDaInstancia(inst: AnomalyInstance): AnomalyDef {
  return anomaly(inst.defId);
}
