/**
 * Armas brancas, armas de fogo e munição.
 * Dano relativo (soco = 3). Barulho do tiro em px de alcance (base do sistema
 * de ruído): tiro atrai de longe — atirar tem custo.
 * Munição é contada em CARTUCHOS (pilha grande); a caixa é só a origem.
 */
import { category, type ItemEntry } from './define';

const melee = (
  id: string,
  name: string,
  sub: string,
  kg: number,
  icon: ItemEntry['icon'],
  damage: number,
  speed: number,
  reach: number,
  durability: number,
  kind: 'corte' | 'impacto' | 'perfuracao',
  desc: string,
  extra: Partial<ItemEntry> = {},
): ItemEntry => ({ id, name, sub, kg, icon, desc, melee: { damage, speed, reach, durability, kind }, tags: [kind === 'impacto' ? 'arma-contundente' : kind === 'corte' ? 'arma-cortante' : 'arma-perfurante'], ...extra });

export const MELEE = category('arma-branca', { stack: 1, cond: 'durable', tags: ['arma'] }, [
  melee('faca', 'Faca de cozinha', 'faca', 0.3, { f: 'knife', k: 'kitchen' }, 7, 1.4, 0.6, 60, 'corte', 'Corta. Não foi feita para brigar.', { metal: true, tags: ['faca', 'cortar', 'abridor', 'arma-cortante'] }),
  melee('facaCacador', 'Faca de caça', 'faca', 0.4, { f: 'knife', k: 'hunting' }, 11, 1.3, 0.65, 150, 'corte', 'Lâmina grossa com serrilha.', { rar: 'incomum', metal: true, tags: ['faca', 'cortar', 'abridor', 'arma-cortante'] }),
  melee('canivete', 'Canivete', 'faca', 0.12, { f: 'knife', k: 'folding' }, 5, 1.5, 0.5, 60, 'corte', 'Cabe no bolso.', { metal: true, tags: ['faca', 'cortar', 'abridor', 'arma-cortante'] }),
  melee('facao', 'Facão', 'lamina', 0.7, { f: 'knife', k: 'machete' }, 16, 1, 1, 150, 'corte', 'Abre caminho no mato.', { rar: 'incomum', metal: true, tags: ['cortar', 'cortar-mato', 'arma-cortante'] }),
  melee('tacoBeisebol', 'Taco de beisebol', 'bastao', 1, { f: 'blunt', k: 'bat', c: '#b8864a' }, 12, 0.95, 1.1, 120, 'impacto', 'Madeira maciça.', { rar: 'incomum' }),
  melee('tacoPregos', 'Taco com pregos', 'bastao', 1.2, { f: 'blunt', k: 'batnails', c: '#b8864a' }, 16, 0.9, 1.1, 90, 'impacto', 'Improvisado e cruel.', { craftOnly: true }),
  melee('cano', 'Cano de ferro', 'bastao', 1.5, { f: 'blunt', k: 'pipe', c: '#8a9096' }, 11, 0.9, 1.1, 250, 'impacto', 'Pedaço de encanamento.', { metal: true, tags: ['cano', 'metal', 'arma-contundente'] }),
  melee('barraFerro', 'Barra de ferro', 'bastao', 2.2, { f: 'blunt', k: 'rebar', c: '#6a5a4a' }, 13, 0.75, 1.2, 300, 'impacto', 'Vergalhão de obra.', { metal: true, tags: ['metal', 'arma-contundente'] }),
  melee('cassetete', 'Cassetete', 'bastao', 0.6, { f: 'blunt', k: 'baton', c: '#2a2a2a' }, 9, 1.2, 0.9, 200, 'impacto', 'Equipamento policial.', { rar: 'raro' }),
  melee('tacoSinuca', 'Taco de sinuca', 'bastao', 0.55, { f: 'blunt', k: 'cue', c: '#c89a5a' }, 7, 1.1, 1.3, 50, 'impacto', 'Quebra fácil.', { rar: 'incomum' }),
  melee('frigideira', 'Frigideira', 'cozinha', 1.3, { f: 'pot', k: 'pan', c: '#2a2a2a' }, 9, 0.9, 0.8, 200, 'impacto', 'Clássica.', { metal: true, tags: ['cozinhar', 'panela', 'arma-contundente'] }),
  melee('rodo', 'Cabo de vassoura', 'bastao', 0.4, { f: 'blunt', k: 'broom', c: '#c8a06a' }, 4, 1.2, 1.3, 30, 'impacto', 'Melhor que nada.', { tags: ['cabo', 'arma-contundente'] }),
  melee('lancaImprovisada', 'Lança improvisada', 'lanca', 1, { f: 'blunt', k: 'spear', c: '#a8784a' }, 12, 1, 1.6, 40, 'perfuracao', 'Faca amarrada num cabo.', { craftOnly: true }),
  melee('lancaMadeira', 'Lança de madeira', 'lanca', 0.9, { f: 'blunt', k: 'woodspear', c: '#a8784a' }, 9, 1, 1.6, 25, 'perfuracao', 'Galho com ponta afiada.', { craftOnly: true }),
  melee('tabuaPregos', 'Tábua com pregos', 'bastao', 1.6, { f: 'blunt', k: 'plank', c: '#b38652' }, 13, 0.8, 1.1, 60, 'impacto', 'Pesada, desajeitada, eficiente.', { craftOnly: true }),
]);

const gun = (
  id: string,
  name: string,
  sub: string,
  kg: number,
  k: string,
  caliber: string,
  capacity: number,
  damage: number,
  range: number,
  noise: number,
  jam: number,
  desc: string,
  extra: Partial<ItemEntry> = {},
): ItemEntry => ({ id, name, sub, kg, icon: { f: 'gun', k }, desc, gun: { caliber, capacity, damage, range, noise, jam }, metal: true, tags: [`calibre-${caliber}`], ...extra });

export const FIREARMS = category('arma-de-fogo', { stack: 1, cond: 'durable', rar: 'raro', tags: ['arma', 'arma-de-fogo'] }, [
  gun('revolver38', 'Revólver .38', 'revolver', 0.9, 'revolver', '38', 6, 30, 9, 1800, 0.005, 'Seis tiros. Simples e confiável.'),
  gun('pistola9', 'Pistola 9 mm', 'pistola', 0.8, 'pistol', '9mm', 15, 28, 10, 1900, 0.01, 'Carregador de 15.', { gun: { caliber: '9mm', capacity: 15, damage: 28, range: 10, noise: 1900, jam: 0.01, magazine: 'carregador9' } }),
  gun('pistola40', 'Pistola .40', 'pistola', 0.85, 'pistol', '40', 12, 32, 10, 2000, 0.01, 'Arma de polícia.', { rar: 'muito-raro', gun: { caliber: '40', capacity: 12, damage: 32, range: 10, noise: 2000, jam: 0.01, magazine: 'carregador40' } }),
  gun('espingarda12', 'Espingarda calibre 12', 'espingarda', 3.4, 'shotgun', '12', 6, 60, 7, 2600, 0.008, 'De perto, resolve. De longe, barulho.'),
  gun('espingardaDupla', 'Espingarda de cano duplo', 'espingarda', 3.2, 'double', '12', 2, 62, 7, 2600, 0.004, 'Dois tiros e recarrega.', { rar: 'muito-raro' }),
  gun('rifle22', 'Rifle .22', 'rifle', 2.5, 'rifle', '22', 10, 18, 16, 1100, 0.01, 'Caça pequena. Barulho menor.'),
  gun('rifleCaca', 'Rifle de caça .308', 'rifle', 3.8, 'rifle', '308', 5, 70, 22, 3200, 0.006, 'Luneta e coice forte.', { rar: 'muito-raro', icon: { f: 'gun', k: 'rifle', c: '#6a4a2a', c2: 'scope' } }),
  gun('submetralhadora', 'Submetralhadora 9 mm', 'automatica', 3, 'smg', '9mm', 30, 24, 9, 2300, 0.02, 'Gasta munição como água.', { rar: 'rarissimo', gun: { caliber: '9mm', capacity: 30, damage: 24, range: 9, noise: 2300, jam: 0.02, magazine: 'carregadorSmg' } }),
]);

const ammo = (id: string, name: string, caliber: string, kg: number, k: string, c: string, desc: string, extra: Partial<ItemEntry> = {}): ItemEntry => ({
  id,
  name,
  sub: 'cartucho',
  kg,
  vol: 0.01,
  icon: { f: 'ammo', k, c },
  desc,
  ammo: { caliber, rounds: 1 },
  tags: [`calibre-${caliber}`],
  ...extra,
});

export const AMMO = category('municao', { stack: 100, cond: 'none', rar: 'raro', tags: ['municao'] }, [
  ammo('municao38', 'Munição .38', '38', 0.01, 'round', '#c9a24a', 'Cartuchos de revólver.'),
  ammo('municao9', 'Munição 9 mm', '9mm', 0.008, 'round', '#c9a24a', 'O calibre mais comum.'),
  ammo('municao40', 'Munição .40', '40', 0.011, 'round', '#b8923a', 'Calibre policial.', { rar: 'muito-raro' }),
  ammo('cartucho12', 'Cartucho calibre 12', '12', 0.035, 'shell', '#c8342a', 'Chumbo grosso.', { stack: 50 }),
  ammo('municao22', 'Munição .22', '22', 0.003, 'round', '#d8b85a', 'Pequena e barata.', { rar: 'incomum', stack: 200 }),
  ammo('municao308', 'Munição .308', '308', 0.025, 'rifle', '#c9a24a', 'Cartucho de rifle.', { rar: 'muito-raro', stack: 60 }),
  // carregadores e componentes de recarga
  ammo('carregador9', 'Carregador 9 mm', '9mm', 0.1, 'mag', '#2a2a2a', 'Para pistola 9 mm (15 tiros).', { sub: 'carregador', stack: 4, cond: 'durable', ammo: { caliber: '9mm', rounds: 0 } }),
  ammo('carregador40', 'Carregador .40', '40', 0.1, 'mag', '#3a3a3a', 'Para pistola .40 (12 tiros).', { sub: 'carregador', stack: 4, cond: 'durable', rar: 'muito-raro', ammo: { caliber: '40', rounds: 0 } }),
  ammo('carregadorSmg', 'Carregador longo 9 mm', '9mm', 0.2, 'mag', '#1a1a1a', 'Para submetralhadora (30 tiros).', { sub: 'carregador', stack: 3, cond: 'durable', rar: 'rarissimo', ammo: { caliber: '9mm', rounds: 0 } }),
  { id: 'polvora', name: 'Pólvora', sub: 'recarga', kg: 0.25, icon: { f: 'can', c: '#2a2a2a', c2: '#c8342a' }, desc: 'Para recarregar cartuchos. E para outras ideias ruins.', rar: 'muito-raro', stack: 4, tags: ['recarga', 'explosivo'] },
  { id: 'espoletas', name: 'Espoletas', sub: 'recarga', kg: 0.05, icon: { f: 'box', c: '#c9a24a', c2: '#2a2a2a' }, desc: 'Caixinha para recarga.', rar: 'muito-raro', stack: 10, tags: ['recarga'] },
  { id: 'estojos', name: 'Estojos vazios', sub: 'recarga', kg: 0.004, icon: { f: 'ammo', k: 'casing', c: '#d8b85a' }, desc: 'Cápsulas usadas. Recarregáveis.', rar: 'incomum', stack: 100, tags: ['recarga'] },
]);
