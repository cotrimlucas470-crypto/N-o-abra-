// Banco de sons: página para ouvir cada som do jogo e as variações, com as MESMAS receitas.
// Gera: npx rolldown dev/soundboard.ts -o <saida>.js -f iife -m -p browser  (e embute no HTML)
import { impulseResponse, Rng } from '../src/game/audio/dsp';
import { GAITS, SURFACES } from '../src/game/audio/recipes/steps';
import { GUN_CLASSES } from '../src/game/audio/recipes/guns';
import { SOUNDS, soundDef, variantSeed } from '../src/game/audio/SoundCatalog';
import { placeSound, playVariation } from '../src/game/audio/spatial';
import { AUDIO_TUNING as T } from '../src/game/config/AudioTuning';

const SURF: Record<string, string> = {
  grama: 'Grama',
  terra: 'Terra',
  cascalho: 'Cascalho',
  asfalto: 'Asfalto',
  calcada: 'Calçada',
  garagem: 'Garagem',
  madeira: 'Piso de madeira',
  ceramica: 'Cerâmica',
  carpete: 'Carpete',
  neve: 'Neve',
  neveFunda: 'Neve funda',
  molhado: 'Chão molhado',
  agua: 'Poça',
  escada: 'Escada',
};
const GAIT: Record<string, [string, string]> = {
  furtivo: ['Agachado', 'andar furtivo'],
  passo: ['Andando', 'passo normal'],
  corrida: ['Correndo', 'corrida'],
};
const GUN: Record<string, string> = {
  pistola9: 'Pistola 9 mm',
  pistola40: 'Pistola .40',
  revolver: 'Revólver .38',
  espingarda: 'Espingarda 12',
  dupla: 'Espingarda de cano duplo',
  rifle22: 'Rifle .22',
  rifle308: 'Rifle de caça .308',
  smg: 'Submetralhadora 9 mm',
};

type Pad = [id: string, name: string, when: string];
const GROUPS: { title: string; note: string; pads: Pad[] }[] = [
  {
    title: 'Portas',
    note: 'Madeira, metal e carro. A batida muda com o material da porta.',
    pads: [
      ['porta.abrir', 'Porta abrindo', 'trinco e dobradiça'],
      ['porta.fechar', 'Porta fechando', 'batida no batente'],
      ['porta.trancada', 'Maçaneta trancada', 'tentar abrir trancada'],
      ['porta.portao', 'Portão de enrolar', 'garagem ou loja'],
      ['porta.empurrada', 'Porta empurrada', 'zumbi forçando'],
      ['porta.batida', 'Esmurrando madeira', 'zumbi na porta'],
      ['porta.batidaMetal', 'Esmurrando metal', 'zumbi na porta de aço'],
      ['porta.barricada', 'Batida na barricada', 'zumbi nas tábuas'],
      ['porta.arrombar', 'Arrombamento', 'pé de cabra, porta cedendo'],
      ['carro.porta', 'Porta de carro', 'abrir ou fechar'],
      ['carro.portaMalas', 'Porta-malas', 'abrir o porta-malas'],
    ],
  },
  {
    title: 'Vidro',
    note: 'Estalo do vidro e dezenas de cacos caindo, cada um com seu tom.',
    pads: [
      ['vidro.janela', 'Janela estourando', 'golpe, tiro ou zumbi'],
      ['vidro.carro', 'Vidro de carro', 'vidro temperado esfarelando'],
      ['vidro.batida', 'Batida no vidro', 'zumbi na janela'],
    ],
  },
  {
    title: 'Golpes e acertos',
    note: 'O ar do golpe depende do peso da arma; o acerto, do que foi atingido.',
    pads: [
      ['golpe.ar.leve', 'Golpe leve', 'faca, soco (até 0,6 kg)'],
      ['golpe.ar.medio', 'Golpe médio', 'taco, cano, martelo'],
      ['golpe.ar.pesado', 'Golpe pesado', 'machado, marreta (2 kg+)'],
      ['acerto.carne.contundente', 'Pancada no corpo', 'às vezes o osso estala'],
      ['acerto.carne.corte', 'Corte', 'faca, facão, machado'],
      ['acerto.carne.perfuracao', 'Perfuração', 'lança, chave de fenda, bala'],
      ['acerto.soco', 'Soco', 'sem arma'],
      ['acerto.madeira', 'Acerto em madeira', 'móvel, porta, árvore'],
      ['acerto.metal', 'Acerto em metal', 'porta de aço, poste, geladeira'],
      ['acerto.concreto', 'Acerto em pedra', 'muro, pedra'],
      ['acerto.plastico', 'Acerto em plástico', 'lixeira, cadeira'],
      ['acerto.ceramica', 'Acerto em cerâmica', 'vaso, pia'],
      ['acerto.lataria', 'Lataria de carro', 'bater no carro'],
      ['corpo.queda', 'Corpo caindo', 'zumbi abatido'],
    ],
  },
  {
    title: 'Armas de fogo',
    note: 'Cada arma tem estalo, estouro, grave e mecânica próprios. Longe, sobra o eco da rua.',
    pads: GUN_CLASSES.map((g): Pad => [`tiro.${g}`, GUN[g] ?? g, 'disparo']),
  },
  {
    title: 'Recarga e mecânica',
    note: 'Carregador, tambor, cartucho por cartucho, ferrolho.',
    pads: [
      ...GUN_CLASSES.map((g): Pad => [`recarga.${g}`, `Recarga: ${GUN[g] ?? g}`, 'recarregar']),
      ['arma.capsula', 'Cápsula quicando', 'depois do tiro, em chão duro'],
      ['arma.seca', 'Clique sem bala', 'gatilho sem munição'],
      ['arma.emperrou', 'Arma emperrando', 'falha no disparo'],
      ['bala.parede', 'Bala na parede', 'reboco e pó'],
      ['bala.madeira', 'Bala na madeira', 'lascas'],
      ['bala.metal', 'Bala no metal', 'com ricochete'],
    ],
  },
  {
    title: 'Ferramentas e objetos',
    note: 'Construir, demolir e revirar a casa atrás de comida.',
    pads: [
      ['obra.martelo', 'Martelando', 'pregar tábuas'],
      ['obra.machado', 'Machadada', 'cortar lenha'],
      ['obra.picareta', 'Picareta', 'quebrar pedra'],
      ['obra.tabuas', 'Tábuas', 'montar e arrancar'],
      ['obra.demolicao', 'Demolição', 'parede ou móvel caindo'],
      ['obra.desmonte', 'Desmontando', 'tirar peças'],
      ['objeto.gaveta', 'Gaveta', 'abrir cômoda, escrivaninha'],
      ['objeto.armario', 'Armário', 'abrir armário'],
      ['objeto.geladeira', 'Geladeira', 'vedação e garrafas'],
      ['objeto.revirar', 'Revirando', 'caixa, saco, mochila'],
    ],
  },
  {
    title: 'Zumbis',
    note: 'No jogo, cada zumbi usa sempre as mesmas duas variações e a mesma altura: é a voz dele.',
    pads: [
      ['zumbi.gemido', 'Gemido', 'parado ou vagando'],
      ['zumbi.rosnado', 'Rosnado', 'viu você, vem atrás'],
      ['zumbi.ataque', 'Bote', 'antes do golpe'],
      ['zumbi.agarrao', 'Agarrão', 'pegou na roupa'],
      ['zumbi.mordida', 'Mordida', 'dentes e carne'],
      ['zumbi.morte', 'Último ar', 'caiu de vez'],
      ['zumbi.passo', 'Pé arrastando', 'andando por perto'],
      ['zumbi.rastejar', 'Rastejando', 'sem as pernas'],
    ],
  },
  {
    title: 'Seu corpo',
    note: 'Soam de dentro, baixos. Fôlego quando cansa, coração quando a vida está baixa.',
    pads: [
      ['corpo.dor', 'Dor', 'quando a vida cai'],
      ['corpo.respira', 'Fôlego curto', 'fôlego abaixo de 35%'],
      ['corpo.coracao', 'Coração', 'vida abaixo de 35%'],
      ['corpo.comer', 'Comendo', 'COMER'],
      ['corpo.beber', 'Bebendo', 'BEBER'],
      ['ui.ziper', 'Zíper da mochila', 'abrir o inventário'],
      ['ui.pegar', 'Pegando', 'item do chão ou recipiente'],
    ],
  },
  {
    title: 'Clima',
    note: 'No jogo estes tocam sem parar e mudam ao vivo com a força da chuva e as rajadas. Aqui, alguns segundos de cada.',
    pads: [
      ['amb.chuvaFraca', 'Garoa', 'gotas soltas, poças'],
      ['amb.chuvaForte', 'Temporal', 'chiado denso'],
      ['amb.chuvaTelhado', 'Chuva no telhado', 'debaixo de teto'],
      ['amb.vento', 'Vento', 'rajadas'],
      ['amb.ventoAssobio', 'Assobio do vento', 'vento forte'],
      ['clima.trovao', 'Trovão longe', 'ronco rolando'],
      ['clima.trovaoPerto', 'Trovão perto', 'rasgo e estrondo'],
    ],
  },
  {
    title: 'Bichos, fogo e máquinas',
    note: 'Pássaros de dia (coro de manhã, quase nenhum no inverno), grilos em noite quente, corvos no frio.',
    pads: [
      ['bicho.passaro', 'Pássaro', '4 jeitos de cantar'],
      ['amb.grilos', 'Grilos', 'noite quente'],
      ['bicho.corvo', 'Corvo', 'de dia, mais no frio'],
      ['amb.fogo', 'Fogueira', 'chama'],
      ['fogo.estalo', 'Lenha estalando', 'perto do fogo'],
      ['amb.gerador', 'Gerador ligado', 'um cilindro'],
      ['amb.motor', 'Motor do carro', 'em marcha lenta'],
      ['carro.alarme', 'Alarme de carro', '4 padrões'],
    ],
  },
  {
    title: 'Ações e itens',
    note: 'Tocam repetindo enquanto a ação demorada acontece (atadura, conserto, água, leitura...).',
    pads: [
      ['acao.pano', 'Pano', 'atadura, costura, vestir'],
      ['acao.rasgar', 'Rasgando pano', 'fazer trapos'],
      ['acao.pagina', 'Página', 'lendo'],
      ['acao.cozinhar', 'Fritura', 'cozinhando'],
      ['acao.ferramenta', 'Ferramenta', 'consertos no carro, gerador'],
      ['acao.agua', 'Água', 'lavar, encher, torneira'],
      ['acao.combustivel', 'Combustível', 'sifão, abastecer'],
      ['acao.afiar', 'Afiar', 'lâmina na pedra'],
      ['acao.fosforo', 'Fósforo', 'acender fogo'],
      ['acao.cavar', 'Cavar', 'plantar'],
      ['acao.escalar', 'Pular a janela', 'escalar'],
      ['acao.equipamento', 'Equipamento', 'correndo carregado'],
      ['item.sacar', 'Sacar arma', 'trocar o que está na mão'],
      ['item.largarLeve', 'Largar (leve)', 'roupa, bolsa'],
      ['item.largarPesado', 'Largar (pesado)', 'caixa, ferramenta'],
    ],
  },
  {
    title: 'Sintomas',
    note: 'Raros de propósito: só quando o corpo tem motivo.',
    pads: [
      ['corpo.barriga', 'Barriga roncando', 'fome alta'],
      ['corpo.tosse', 'Tosse', 'sede forte, doença'],
      ['corpo.tremor', 'Tremendo', 'corpo abaixo de 35,8 °C'],
      ['corpo.bocejo', 'Bocejo', 'muito sono'],
      ['corpo.vomito', 'Vômito', 'enjoo forte'],
      ['corpo.zumbido', 'Zumbido no ouvido', 'tiro em lugar fechado'],
    ],
  },
  {
    title: 'Casa e rua',
    note: 'Dentro de casa: o ar parado, a casa rangendo, a geladeira quando há energia.',
    pads: [
      ['amb.casa', 'Ar de dentro de casa', 'silêncio de casa'],
      ['amb.rangido', 'Casa rangendo', 'madeira assentando, vento'],
      ['amb.geladeira', 'Geladeira ligada', 'com gerador'],
      ['amb.cigarras', 'Cigarras', 'tarde quente de verão'],
      ['bicho.cachorro', 'Cachorro ao longe', 'de noite'],
      ['porta.abrirMetal', 'Porta de aço abrindo', 'porta de metal'],
      ['porta.fecharMetal', 'Porta de aço fechando', 'porta de metal'],
      ['porta.abrirVidro', 'Porta de vidro abrindo', 'loja'],
      ['porta.fecharVidro', 'Porta de vidro fechando', 'loja'],
    ],
  },
  {
    title: 'Carros',
    note: 'Dirigindo, o motor sobe de giro em cada marcha e a rodagem cresce com a velocidade.',
    pads: [
      ['carro.buzina', 'Buzina', 'duas cornetas desafinadas'],
      ['carro.batida', 'Batida de carro', 'lataria, plástico, vidro'],
      ['carro.pneu', 'Pneu estourando', 'estouro e o ar saindo'],
      ['carro.arranque', 'Arranque falhando', 'motor não pega'],
      ['carro.partida', 'Motor pegando', 'partida'],
      ['carro.atropelo', 'Atropelo', 'para-choque no zumbi'],
      ['amb.rodagem', 'Rodagem', 'pneu e vento, cresce com a velocidade'],
      ['carro.derrapar', 'Pneu cantando', 'curva fechada ou freada'],
      ['carro.marcha', 'Troca de marcha', 'câmbio'],
    ],
  },
];

// ---------------------------------------------------------------- áudio
let ctx: AudioContext | null = null;
let master: GainNode;
const sends = new Map<string, GainNode>();
const cache = new Map<string, { data: Float32Array; buf: AudioBuffer }[]>();
const lastVar = new Map<string, number>();
const rng = new Rng((Date.now() ^ 0x5eed) >>> 0);

function audio(): AudioContext {
  if (ctx) return ctx;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = T.master;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;
  master.connect(comp);
  comp.connect(ctx.destination);
  const rooms: [string, typeof T.street | typeof T.room, number, { t: number; g: number }[]][] = [
    ['rua', T.street, 0x51ee7, [{ t: 0.045, g: 0.22 }, { t: 0.09, g: 0.3 }, { t: 0.15, g: 0.2 }, { t: 0.23, g: 0.16 }, { t: 0.31, g: 0.1 }]],
    ['comodo', T.room, 0xc0d0, [{ t: 0.006, g: 0.3 }, { t: 0.011, g: 0.24 }, { t: 0.017, g: 0.18 }, { t: 0.026, g: 0.12 }]],
  ];
  for (const [name, o, seed, early] of rooms) {
    const [l, r] = impulseResponse(ctx.sampleRate, seed, { ...o, early });
    const ir = ctx.createBuffer(2, l.length, ctx.sampleRate);
    ir.copyToChannel(l as Float32Array<ArrayBuffer>, 0);
    ir.copyToChannel(r as Float32Array<ArrayBuffer>, 1);
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    const send = ctx.createGain();
    const ret = ctx.createGain();
    ret.gain.value = o.level;
    send.connect(conv);
    conv.connect(ret);
    ret.connect(master);
    sends.set(name, send);
  }
  return ctx;
}

function variant(id: string, v: number): { data: Float32Array; buf: AudioBuffer } {
  const c = audio();
  let list = cache.get(id);
  if (!list) cache.set(id, (list = []));
  let e = list[v];
  if (!e) {
    const d = soundDef(id)!;
    const data = d.make(new Rng(variantSeed(id, v)), d.sr);
    const buf = c.createBuffer(1, Math.max(1, data.length), d.sr);
    buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
    e = list[v] = { data, buf };
  }
  return e;
}

type Where = 'perto' | 'longe' | 'parede' | 'comodo2';
const state = { where: 'perto' as Where, room: 'rua' as 'rua' | 'comodo' };

function play(id: string, v: number, delay = 0): { data: Float32Array; sec: number } | null {
  const d = soundDef(id);
  if (!d) return null;
  const c = audio();
  if (c.state !== 'running') void c.resume();
  const { data, buf } = variant(id, v);
  const jit = playVariation(() => rng.next(), d.pitch);
  let gain = d.gain * jit.gain;
  let pan = 0;
  let cutoff = 20000;
  let wet = d.reverb * T.wetNear;
  if (state.where !== 'perto') {
    const spot = { longe: { dx: d.range * 0.55, walls: 0 }, parede: { dx: -d.range * 0.18, walls: 1 }, comodo2: { dx: d.range * 0.12, walls: 2 } }[state.where];
    const p = placeSound({ dx: spot.dx, dy: 0, range: d.range, walls: spot.walls, reverb: d.reverb, indoor: state.room === 'comodo' });
    if (!p) return null;
    gain *= p.gain;
    pan = p.pan;
    cutoff = p.cutoff;
    wet = p.wet;
  }
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = jit.rate;
  const g = c.createGain();
  g.gain.value = gain;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(cutoff, c.sampleRate / 2 - 100);
  lp.Q.value = 0.5;
  const pn = c.createStereoPanner();
  pn.pan.value = pan;
  src.connect(g).connect(lp).connect(pn).connect(master);
  const s = c.createGain();
  s.gain.value = Math.min(1, wet);
  pn.connect(s).connect(sends.get(state.room)!);
  src.start(t0);
  return { data, sec: buf.duration / jit.rate };
}

// ---------------------------------------------------------------- página
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function drawWave(cv: HTMLCanvasElement, data: Float32Array | null): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  if (!w || !h) return;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  g.clearRect(0, 0, w, h);
  g.fillStyle = css.getPropertyValue('--line').trim();
  g.fillRect(0, h / 2, w, 1);
  if (!data) return;
  g.fillStyle = css.getPropertyValue('--wave').trim();
  const step = data.length / w;
  for (let x = 0; x < w; x++) {
    let lo = 0;
    let hi = 0;
    const a = Math.floor(x * step);
    const b = Math.min(data.length, Math.floor((x + 1) * step) + 1);
    for (let i = a; i < b; i++) {
      const s = data[i]!;
      if (s < lo) lo = s;
      if (s > hi) hi = s;
    }
    const y0 = h / 2 - hi * (h / 2 - 1);
    const y1 = h / 2 - lo * (h / 2 - 1);
    g.fillRect(x, y0, 1, Math.max(1, y1 - y0));
  }
}

const fmt = (s: number) => `${s.toFixed(2).replace('.', ',')} s`;

function padEl(getId: () => string, name: () => string, when: () => string): { root: HTMLElement; refresh: () => void } {
  const root = el('div', 'pad');
  const btn = el('button', 'pad-main');
  btn.type = 'button';
  const nm = el('span', 'pad-name');
  const wh = el('span', 'pad-when');
  const cv = el('canvas', 'pad-wave');
  const foot = el('div', 'pad-foot');
  const dots = el('span', 'dots');
  const dur = el('span', 'dur', '—');
  foot.append(dots, dur);
  btn.append(nm, wh, cv);
  const all = el('button', 'pad-all', 'Ouvir todas');
  all.type = 'button';
  root.append(btn, foot, all);
  const refresh = () => {
    const id = getId();
    const d = soundDef(id)!;
    nm.textContent = name();
    wh.textContent = when();
    btn.setAttribute('aria-label', `${name()}: tocar a próxima variação`);
    dots.replaceChildren(...Array.from({ length: d.variants }, (_, i) => el('i', i === lastVar.get(id) ? 'on' : '')));
    const v = lastVar.get(id);
    const e = v !== undefined ? cache.get(id)?.[v] : undefined;
    dur.textContent = e ? `var. ${v! + 1}/${d.variants} · ${fmt(e.data.length / d.sr)}` : `${d.variants} variações`;
    drawWave(cv, e?.data ?? null);
  };
  const hit = (v: number, delay = 0) => {
    const id = getId();
    const r = play(id, v, delay);
    lastVar.set(id, v);
    if (delay > 0) setTimeout(refresh, delay * 1000);
    else refresh();
    if (r) {
      root.classList.remove('live');
      void root.offsetWidth;
      root.classList.add('live');
    }
    return r;
  };
  btn.addEventListener('click', () => {
    const id = getId();
    const d = soundDef(id)!;
    hit(((lastVar.get(id) ?? -1) + 1) % d.variants);
  });
  all.addEventListener('click', () => {
    const id = getId();
    const d = soundDef(id)!;
    let t = 0;
    for (let v = 0; v < d.variants; v++) {
      variant(id, v);
      const sec = cache.get(id)![v]!.data.length / d.sr;
      hit(v, t);
      t += Math.min(sec, 2.2) + 0.35;
    }
  });
  refresh();
  return { root, refresh };
}

const pads: (() => void)[] = [];

function build(): void {
  const app = document.getElementById('app')!;
  // Onde o som está.
  const bar = el('div', 'bar');
  const seg = (label: string, opts: [string, string][], get: () => string, set: (v: string) => void) => {
    const g = el('div', 'seg');
    g.append(el('span', 'seg-label', label));
    const row = el('div', 'seg-row');
    const btns = opts.map(([v, t]) => {
      const b = el('button', 'chip', t);
      b.type = 'button';
      b.addEventListener('click', () => {
        set(v);
        btns.forEach((x, i) => x.setAttribute('aria-pressed', String(opts[i]![0] === get())));
      });
      b.setAttribute('aria-pressed', String(v === get()));
      return b;
    });
    row.append(...btns);
    g.append(row);
    return g;
  };
  bar.append(
    seg('Onde o som está', [['perto', 'Com você'], ['longe', 'Longe'], ['parede', 'Atrás da parede'], ['comodo2', 'Dois cômodos']], () => state.where, (v) => (state.where = v as Where)),
    seg('Eco', [['rua', 'Rua'], ['comodo', 'Dentro de casa']], () => state.room, (v) => (state.room = v as 'rua' | 'comodo')),
  );
  app.append(bar);

  // Passos: escolhe o chão, três andares.
  const steps = el('section', 'group');
  steps.append(el('h2', '', 'Passos'), el('p', 'note', '14 chãos. Na neve o passo esmaga e range; na neve funda afunda; no molhado respinga. Escolha o chão:'));
  let surf = 'asfalto';
  const chips = el('div', 'seg-row surf');
  const stepPads = GAITS.map((g) => padEl(() => `passo.${surf}.${g}`, () => GAIT[g]![0], () => `${SURF[surf]} · ${GAIT[g]![1]}`));
  const sbtn = SURFACES.map((s) => {
    const b = el('button', 'chip', SURF[s] ?? s);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(s === surf));
    b.addEventListener('click', () => {
      surf = s;
      sbtn.forEach((x, i) => x.setAttribute('aria-pressed', String(SURFACES[i] === surf)));
      stepPads.forEach((p) => p.refresh());
    });
    return b;
  });
  chips.append(...sbtn);
  const grid = el('div', 'grid three');
  grid.append(...stepPads.map((p) => p.root));
  steps.append(chips, grid);
  app.append(steps);
  pads.push(...stepPads.map((p) => p.refresh));

  const shown = new Set<string>();
  for (const s of SURFACES) for (const g of GAITS) shown.add(`passo.${s}.${g}`);
  for (const grp of GROUPS) {
    const sec = el('section', 'group');
    sec.append(el('h2', '', grp.title), el('p', 'note', grp.note));
    const gr = el('div', 'grid');
    for (const [id, name, when] of grp.pads) {
      if (!SOUNDS.has(id)) continue;
      shown.add(id);
      const p = padEl(() => id, () => name, () => when);
      gr.append(p.root);
      pads.push(p.refresh);
    }
    sec.append(gr);
    app.append(sec);
  }
  // Algum som novo sem nome aqui ainda aparece.
  const rest = [...SOUNDS.keys()].filter((id) => !shown.has(id));
  if (rest.length) {
    const sec = el('section', 'group');
    sec.append(el('h2', '', 'Outros'));
    const gr = el('div', 'grid');
    for (const id of rest) {
      const p = padEl(() => id, () => id, () => '');
      gr.append(p.root);
      pads.push(p.refresh);
    }
    sec.append(gr);
    app.append(sec);
  }
  const total = [...SOUNDS.values()].reduce((n, d) => n + d.variants, 0);
  const count = document.getElementById('count');
  if (count) count.textContent = `${SOUNDS.size} sons · ${total} variações`;
  let t = 0;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = window.setTimeout(() => pads.forEach((f) => f()), 150);
  });
}

build();
