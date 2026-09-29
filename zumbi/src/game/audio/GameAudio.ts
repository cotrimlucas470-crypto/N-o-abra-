/**
 * DIRETOR DE SOM: a única ponte entre o jogo e o motor de áudio. Escuta o
 * barramento (barulhos do mundo, passos, recipientes, pausa) e recebe da
 * cena o resultado do combate e da recarga. Não muda nenhuma regra do jogo:
 * só decide QUE som toca, ONDE e com que variação.
 */
import type { AttackResult } from '../combat/Combat';
import type { EventBus, GameEvents } from '../core/EventBus';
import type { ItemDef } from '../items/ItemTypes';
import type { Material as PropMaterial } from '../world/PropDurability';
import type { AudioEngine, PlayOptions } from './AudioEngine';
import { soundDef } from './SoundCatalog';
import { gaitFor, gunClassFor, soundForNoise, swingWeight } from './SoundMap';
import { placeSound } from './spatial';
import type { Surface } from './recipes/steps';
import type { GunClass } from './recipes/guns';

export interface AudioWorld {
  /** Onde está quem ouve (o jogador) e se está debaixo de teto (eco de cômodo). */
  listener(): { x: number; y: number; indoor: boolean };
  /**
   * O som em (x, y) chega ao jogador? Devolve de onde ele parece vir (no
   * andar do jogador; de outro andar, pela escada) e as paredes no caminho.
   */
  locate(x: number, y: number, radius: number): { x: number; y: number; walls: number } | null;
  /** Chão debaixo do pé (com neve e água). */
  surface(x: number, y: number): Surface;
  /** Som de abrir um recipiente (null = sem som próprio, ex.: compartimento de carro). */
  containerSound(id: string): string | null;
}

/** Quando o golpe "chega" depois do começo do deslocamento de ar (s). */
const HIT_DELAY = { leve: 0.05, medio: 0.08, pesado: 0.12 } as const;
/** Armas que cospem cápsula a cada tiro (as outras: no bombear/abrir). */
const EJECTS: ReadonlySet<GunClass> = new Set(['pistola9', 'pistola40', 'smg', 'rifle22']);
/** Sons que quase toda partida usa logo: gerados no começo (no worker), sem esperar. */
const COMMON = ['porta.abrir', 'porta.fechar', 'porta.trancada', 'golpe.ar.leve', 'golpe.ar.medio', 'acerto.soco', 'acerto.carne.contundente', 'acerto.madeira', 'objeto.revirar', 'objeto.gaveta', 'objeto.armario'];
const HARD: ReadonlySet<Surface> = new Set(['asfalto', 'calcada', 'garagem', 'ceramica', 'madeira', 'escada', 'molhado']);

export class GameAudio {
  private readonly offs: (() => void)[];
  private warmT = 0;

  constructor(
    private readonly engine: AudioEngine,
    bus: EventBus,
    private readonly world: AudioWorld,
    private readonly hand: () => ItemDef | null,
  ) {
    engine.duck(false);
    for (const id of COMMON) engine.warm(id);
    this.offs = [
      bus.on('world:noise', (e) => this.noise(e)),
      bus.on('player:footstep', (e) => this.footstep(e.x, e.y, e.loudness)),
      bus.on('ui:container-open', (e) => {
        const id = this.world.containerSound(e.id);
        if (id) this.near(id);
      }),
      bus.on('sound:play', (e) => (e.x !== undefined && e.y !== undefined ? this.at(e.id, e.x, e.y, e) : this.near(e.id, e))),
      bus.on('game:paused', () => engine.duck(true)),
      bus.on('game:resumed', () => engine.duck(false)),
    ];
  }

  destroy(): void {
    this.offs.forEach((u) => u());
    this.engine.stopAll();
  }

  /** Um quadro: gera variações na fila; de tempos em tempos deixa pronto o que vai tocar logo. */
  update(dt: number): void {
    this.engine.update();
    this.warmT -= dt;
    if (this.warmT > 0) return;
    this.warmT = 1.5;
    const l = this.world.listener();
    const s = this.world.surface(l.x, l.y);
    this.engine.warm(`passo.${s}.passo`);
    this.engine.warm(`passo.${s}.corrida`);
    const d = this.hand();
    if (d?.gun) {
      const g = gunClassFor(d.iconSpec.k, d.gun.caliber);
      this.engine.warm(`tiro.${g}`);
      this.engine.warm(`recarga.${g}`);
    } else this.engine.warm(`golpe.ar.${swingWeight(d?.weight)}`);
  }

  // ---------------------------------------------------------------- tocar

  /** Som num ponto do mundo: distância, lado, parede e eco. */
  at(id: string, x: number, y: number, o: PlayOptions = {}): void {
    const def = soundDef(id);
    if (!def || this.engine.muted) return;
    const l = this.world.listener();
    const src = this.world.locate(x, y, def.range);
    if (!src) return;
    const p = placeSound({ dx: src.x - l.x, dy: src.y - l.y, range: def.range, walls: src.walls, reverb: def.reverb, indoor: l.indoor });
    if (!p) return;
    this.engine.play(id, { ...o, gain: p.gain * (o.gain ?? 1), pan: p.pan, cutoff: p.cutoff, wet: p.wet, room: p.room });
  }

  /** Som do próprio jogador (sem distância). */
  near(id: string, o: PlayOptions = {}): void {
    const def = soundDef(id);
    if (!def) return;
    const l = this.world.listener();
    this.engine.play(id, { wet: def.reverb * 0.3, room: l.indoor ? 'comodo' : 'rua', ...o });
  }

  // ---------------------------------------------------------------- eventos

  private noise(e: GameEvents['world:noise']): void {
    const s = soundForNoise(e.source, e.kind, e.radius, e.sound);
    if (!s || !this.engine.has(s.id)) return;
    const n = s.repeat ?? 1;
    for (let i = 0; i < n; i++) this.at(s.id, e.x, e.y, { delay: i * (s.every ?? 0), ...(s.rate ? { rate: s.rate } : {}) });
  }

  private footstep(x: number, y: number, loudness: number): void {
    this.near(`passo.${this.world.surface(x, y)}.${gaitFor(loudness)}`);
  }

  /** Resultado de um golpe/tiro do jogador. */
  attack(r: AttackResult, def: ItemDef | null): void {
    const gun = def?.gun ? gunClassFor(def.iconSpec.k, def.gun.caliber) : null;
    if (!r.ok && r.message) {
      if (r.message.startsWith('Clique') || r.message.startsWith('Arma emperrada')) this.near('arma.seca');
      else if (r.message.startsWith('Emperrou')) this.near('arma.emperrou');
      return;
    }
    let delay = 0;
    if (r.swing) {
      const w = swingWeight(def?.weight);
      this.near(`golpe.ar.${w}`);
      delay = HIT_DELAY[w];
    }
    if (r.tracer && gun) {
      this.near(`tiro.${gun}`);
      if (EJECTS.has(gun)) {
        const l = this.world.listener();
        const hard = HARD.has(this.world.surface(l.x, l.y));
        // Cápsula quicando no chão duro; na grama/neve/terra quase não se ouve.
        this.near('arma.capsula', { delay: 0.35 + Math.random() * 0.25, gain: hard ? 1 : 0.25, ...(hard ? {} : { cutoff: 1800 }) });
      }
      for (const b of r.broke ?? []) this.at('vidro.janela', b.x, b.y, { delay: 0.01 });
      if (r.tracer.wall && !r.hit && !r.creature) this.at('bala.parede', r.tracer.x2, r.tracer.y2, { delay: 0.02 });
    }
    if (r.creature) {
      const c = r.creature;
      const id = gun ? 'acerto.carne.perfuracao' : !def?.melee ? 'acerto.soco' : def.melee.kind === 'corte' ? 'acerto.carne.corte' : def.melee.kind === 'perfuracao' ? 'acerto.carne.perfuracao' : 'acerto.carne.contundente';
      this.at(id, c.x, c.y, { delay: gun ? 0.015 : delay, ...(c.killed ? { gain: 1.1 } : {}) });
      // Caiu de vez: o corpo no chão.
      if (c.killed) this.at('corpo.queda', c.x, c.y, { delay: delay + 0.35 + Math.random() * 0.2 });
    }
    if (r.hit && r.hit.material !== 'vidro') {
      const h = r.hit;
      if (gun) this.at(bulletSound(h.material), h.x, h.y, { delay: 0.015 });
      else {
        const s = objectSound(h.material);
        this.at(s.id, h.x, h.y, { delay, ...(s.rate ? { rate: s.rate } : {}), ...(!def ? { gain: 0.6 } : {}) });
      }
      if (h.destroyed) {
        const door = /porta|port[aã]o/i.test(h.name);
        this.at(door ? 'porta.arrombar' : h.material === 'metal' ? 'obra.desmonte' : 'obra.tabuas', h.x, h.y, { delay: delay + 0.06 });
      }
    }
  }

  /** Começou a recarregar a arma da mão. */
  reload(def: ItemDef | null): void {
    if (!def?.gun) return;
    this.near(`recarga.${gunClassFor(def.iconSpec.k, def.gun.caliber)}`);
  }
}

export function bulletSound(m: PropMaterial | undefined): string {
  if (m === 'metal') return 'bala.metal';
  if (m === 'madeira' || m === 'planta' || m === 'tecido' || m === 'plastico') return 'bala.madeira';
  return 'bala.parede';
}

export function objectSound(m: PropMaterial | undefined): { id: string; rate?: number } {
  switch (m) {
    case 'metal':
      return { id: 'acerto.metal' };
    case 'pedra':
      return { id: 'acerto.concreto' };
    case 'plastico':
      return { id: 'acerto.plastico' };
    case 'ceramica':
      return { id: 'acerto.ceramica' };
    case 'tecido':
      // Estofado: baque surdo, sem estalo.
      return { id: 'acerto.soco', rate: 0.75 };
    case 'planta':
      return { id: 'acerto.madeira', rate: 1.25 };
    default:
      return { id: 'acerto.madeira' };
  }
}
