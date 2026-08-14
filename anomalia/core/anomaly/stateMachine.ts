/**
 * Máquina de estados — §4.
 *
 * O corpo de `tick` é o de §4, com uma linha acrescentada e declarada:
 *
 *   §4 diz "subir é fácil". Tomado ao pé da letra, uma detecção que pula de
 *   10 para 95 num tick leva DORMENTE direto a CACA, e as três camadas de
 *   aviso de §5 nunca são emitidas — o que é exatamente o que §0 regra 3
 *   chama de bug de design. `escadaDeSubida` limita a subida a um degrau por
 *   tick. "Subir é fácil" continua valendo (um tick por degrau, sem cooldown)
 *   e "descer é lento" também (persistence ticks por degrau).
 *
 * Sobre a redundância entre histerese e persistência: o bloco de histerese
 * segura a queda por `persistence` ticks e só então deixa o estado cair; aí o
 * bloco de perseguição segura CACA por mais `persistence`. São do documento e
 * ficaram como estão — o efeito é que perder uma anomalia em caça custa cerca
 * de dois ciclos de persistência, e é isso que faz `persistence` doer.
 *
 * §0 regra 1: não existe função que reduza a anomalia. Não há vida para tirar.
 */

import type {
  AnomalyDef, AnomalyInstance, AnomalyState, TelegraphLayer,
} from './types.ts';
import type { Rng } from './rng.ts';
import { stateFromScore } from './perception.ts';
import { camadaDe } from './telegraph.ts';

/**
 * PERDEU vale o mesmo que DORMENTE: é o momento de perder o rastro, não um
 * degrau da escada. Sem isso a instância ficaria presa em PERDEU, porque
 * qualquer estado real seria "descida" e a histerese o seguraria.
 */
const RANK: Record<AnomalyState, number> = {
  DORMENTE: 0, PERDEU: 0, ALERTA: 1, BUSCA: 2, RASTRO: 3, CACA: 4, CONTATO: 5,
};

export function rank(s: AnomalyState): number {
  return RANK[s];
}

const ESCADA: readonly AnomalyState[] = [
  'DORMENTE', 'ALERTA', 'BUSCA', 'RASTRO', 'CACA',
];

/** Um degrau por tick na subida — o que garante §0 regra 3. */
function escadaDeSubida(prev: AnomalyState, alvo: AnomalyState): AnomalyState {
  const de = rank(prev), para = rank(alvo);
  if (para <= de) return alvo;
  const proximo = ESCADA[Math.min(de + 1, ESCADA.length - 1)];
  return proximo ?? alvo;
}

export function tick(
  inst: AnomalyInstance,
  def: AnomalyDef,
  detection: number,
  rng: Rng,
): AnomalyInstance {
  const prev = inst.state;
  let next = escadaDeSubida(prev, stateFromScore(detection));

  // histerese: subir é fácil, descer é lento (evita liga-desliga)
  if (rank(next) < rank(prev)) {
    inst.cooldown += 1;
    if (inst.cooldown < def.persistence) next = prev;
    else inst.cooldown = 0;
  } else {
    inst.cooldown = 0;
  }

  // persistência: mesmo perdendo rastro, ela caça por N ticks
  if (prev === 'CACA' && next !== 'CACA') {
    inst.huntTicks += 1;
    if (inst.huntTicks < def.persistence) next = 'CACA';
    else { next = 'PERDEU'; inst.huntTicks = 0; }
  }

  inst.state = next;
  inst.distance = updateDistance(inst, def, next, rng);

  const camada = camadaDe(next);
  if (camada && !inst.avisos.includes(camada)) inst.avisos.push(camada);
  if (next === 'DORMENTE' || next === 'PERDEU') inst.avisos = [];

  if (inst.distance <= 0 && next === 'CACA') inst.state = 'CONTATO';
  return inst;
}

/**
 * Aproximação. Não consta de §4; segue a tabela de §3 (o que cada estado
 * significa) e o campo `speed` de §1.
 *
 * A06_PARADA não anda: §2 diz que ela ocupa, não persegue. A distância dela
 * só muda quando o jogador anda, o que o motor de fora resolve.
 */
export function updateDistance(
  inst: AnomalyInstance,
  def: AnomalyDef,
  state: AnomalyState,
  rng: Rng,
): number {
  if (def.estatica) return inst.distance;

  const velocidade = velocidadeEfetiva(inst, def, state);
  const bonus = 1 + inst.approachBonus / 100;
  const jitter = rng.next() * 0.6 - 0.3;

  let passo: number;
  switch (state) {
    case 'DORMENTE':
    case 'PERDEU':   passo = +1.5; break;
    case 'ALERTA':   passo = 0; break;
    case 'BUSCA':    passo = -0.5 * velocidade * bonus; break;
    case 'RASTRO':   passo = -0.8 * velocidade * bonus; break;
    case 'CACA':     passo = -1.2 * velocidade * bonus; break;
    case 'CONTATO':  return 0;
  }

  return Math.max(0, inst.distance + passo + jitter);
}

/** MUT_LENTA_FALSA: anda em `speed`, caça em `burstSpeed`. */
function velocidadeEfetiva(
  inst: AnomalyInstance,
  def: AnomalyDef,
  state: AnomalyState,
): number {
  if (inst.burstSpeed !== undefined && (state === 'CACA' || state === 'RASTRO')) {
    return inst.burstSpeed;
  }
  return def.speed;
}

/** §0 regra 3 como pergunta que o encontro faz antes de abrir. */
export function avisouAsTresCamadas(inst: AnomalyInstance): boolean {
  const precisa: TelegraphLayer[] = ['ambient', 'audio', 'direct'];
  return precisa.every((c) => inst.avisos.includes(c));
}

export function criarInstancia(
  defId: string,
  locationId: string,
  instanceId: string,
  distancia = 30,
): AnomalyInstance {
  return {
    instanceId,
    defId,
    state: 'DORMENTE',
    distance: distancia,
    cooldown: 0,
    huntTicks: 0,
    residual: {
      som: 0, movimento: 0, cheiro: 0, luz: 0,
      calor: 0, metal: 0, voz: 0, sangue: 0, memoria: 0,
    },
    avisos: [],
    mutacoes: [],
    locationId,
    approachBonus: 0,
    ehCopiaFalsa: false,
    ehFalsa: false,
  };
}
