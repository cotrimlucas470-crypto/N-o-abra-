/**
 * Materiais (matéria-prima de fabricação e reparo) e construção.
 * As etiquetas (`tags`) são o que as receitas pedem: "madeira", "metal",
 * "tecido", "corda"...
 */
import { category, type ItemEntry } from './define';

const mat = (id: string, name: string, sub: string, kg: number, icon: ItemEntry['icon'], desc: string, tags: readonly string[], extra: Partial<ItemEntry> = {}): ItemEntry => ({
  id,
  name,
  sub,
  kg,
  icon,
  desc,
  tags,
  ...extra,
});

export const MATERIALS = category('material', { stack: 10, cond: 'none', tags: ['material'] }, [
  mat('tabua', 'Tábua', 'madeira', 1.5, { f: 'plank', c: '#b38652' }, 'Madeira de construção.', ['madeira', 'tabua'], { stack: 4, vol: 3 }),
  mat('tora', 'Tora de madeira', 'madeira', 6, { f: 'log', c: '#7a5232' }, 'Tronco cortado. Vira tábua na serra.', ['madeira', 'lenha'], { stack: 1, vol: 12, rar: 'incomum' }),
  mat('lenha', 'Lenha', 'madeira', 1.2, { f: 'log', c: '#8a5a32', k: 'split' }, 'Para fogueira e fogão a lenha.', ['lenha', 'combustivel'], { stack: 6 }),
  mat('pregos', 'Pregos', 'fixacao', 0.01, { f: 'bits', k: 'nails', c: '#9aa1a8' }, 'Um punhado.', ['pregos'], { stack: 100, metal: true }),
  mat('parafusos', 'Parafusos', 'fixacao', 0.01, { f: 'bits', k: 'screws', c: '#b8bcc0' }, 'Sortidos.', ['parafusos'], { stack: 100, metal: true }),
  mat('dobradica', 'Dobradiça', 'fixacao', 0.15, { f: 'bits', k: 'hinge', c: '#a8a098' }, 'Para porta e portão.', ['dobradica'], { stack: 6, metal: true }),
  mat('trapo', 'Trapo', 'tecido', 0.05, { f: 'cloth', k: 'rag', c: '#c8b8a0' }, 'Tecido velho. Limpa, amarra, vira curativo.', ['tecido', 'trapo'], { stack: 20 }),
  mat('tecido', 'Retalho de tecido', 'tecido', 0.15, { f: 'cloth', k: 'fold', c: '#6a7ab0' }, 'Pano limpo.', ['tecido'], { stack: 10 }),
  mat('couro', 'Couro', 'tecido', 0.4, { f: 'cloth', k: 'leather', c: '#7a4a2a' }, 'Resistente. Roupas e alças.', ['couro'], { stack: 5, rar: 'incomum' }),
  mat('lona', 'Lona', 'tecido', 1.4, { f: 'cloth', k: 'tarp', c: '#3a6ab0' }, 'Cobre telhado furado e junta água de chuva.', ['lona', 'impermeavel'], { stack: 2, rar: 'incomum' }),
  mat('cacoVidro', 'Caco de vidro', 'vidro', 0.05, { f: 'bits', k: 'shards', c: '#bfe0e8' }, 'Corta. Com cuidado, vira lâmina.', ['vidro', 'afiado'], { stack: 10 }),
  mat('garrafaVidro', 'Garrafa de vidro vazia', 'vidro', 0.3, { f: 'bottle', c: '#5a8a5a', c2: '#5a8a5a', k: 'empty' }, 'Guarda água. Ou vira coquetel.', ['vidro', 'recipiente-agua'], { stack: 4 }),
  mat('garrafaPet', 'Garrafa PET vazia', 'plastico', 0.04, { f: 'bottle', c: '#d8eef4', c2: '#d8eef4', k: 'emptyPet' }, 'Guarda água.', ['plastico', 'recipiente-agua'], { stack: 6 }),
  mat('sacoPlastico', 'Saco plástico', 'plastico', 0.01, { f: 'cloth', k: 'plasticbag', c: '#f2f2f2' }, 'Protege da chuva, carrega pouca coisa.', ['plastico'], { stack: 20 }),
  mat('borracha', 'Borracha', 'borracha', 0.3, { f: 'cloth', k: 'rubber', c: '#2a2a2a' }, 'Câmara de ar cortada.', ['borracha', 'elastico'], { stack: 5 }),
  mat('mangueira', 'Mangueira', 'borracha', 1, { f: 'coil', c: '#3a8a4a' }, 'Para sifão de combustível e irrigação.', ['mangueira', 'borracha'], { stack: 1, rar: 'incomum' }),
  mat('chapaMetal', 'Chapa de metal', 'metal', 2, { f: 'sheet', c: '#9aa0a6' }, 'Reforço e barricada.', ['metal', 'chapa'], { stack: 3, metal: true, rar: 'incomum' }),
  mat('sucata', 'Sucata de metal', 'metal', 0.5, { f: 'bits', k: 'scrap', c: '#8a8278' }, 'Pedaços de tudo.', ['metal', 'sucata'], { stack: 10, metal: true }),
  mat('arame', 'Arame', 'metal', 0.3, { f: 'coil', c: '#a8a8a8', k: 'thin' }, 'Rolo pequeno.', ['arame', 'metal'], { stack: 5, metal: true }),
  mat('corda', 'Corda', 'amarracao', 0.5, { f: 'coil', c: '#c8a06a' }, 'Dez metros.', ['corda', 'amarrar'], { stack: 3 }),
  mat('barbante', 'Barbante', 'amarracao', 0.08, { f: 'coil', c: '#e8d8b0', k: 'thin' }, 'Amarra quase nada. Mas amarra.', ['barbante', 'amarrar'], { stack: 5 }),
  mat('fita', 'Fita adesiva', 'amarracao', 0.15, { f: 'roll', c: '#9ea3a8' }, 'Serve para quase tudo.', ['fita', 'amarrar'], { stack: 3, cond: 'battery' }),
  mat('fitaIsolante', 'Fita isolante', 'amarracao', 0.05, { f: 'roll', c: '#2a2a2a' }, 'Emenda fio, conserta cabo.', ['fita', 'eletrica'], { stack: 5, cond: 'battery' }),
  mat('cola', 'Cola', 'adesivo', 0.1, { f: 'tube', c: '#f2f2f2', c2: '#e8c84a' }, 'Cola forte.', ['cola'], { stack: 5 }),
  mat('colaMadeira', 'Cola de madeira', 'adesivo', 0.5, { f: 'bottle', c: '#f2f2e8', c2: '#c89a3a', k: 'pet' }, 'Móveis e reparos.', ['cola'], { stack: 2, rar: 'incomum' }),
  mat('combustivel', 'Galão de gasolina', 'combustivel', 4, { f: 'bucket', k: 'jerrycan', c: '#c8342a' }, 'Cinco litros. Gerador, carro, fogo.', ['combustivel', 'gasolina'], { stack: 1, rar: 'raro', cond: 'battery' }),
  mat('galaoVazio', 'Galão vazio', 'combustivel', 0.4, { f: 'bucket', k: 'jerrycan', c: '#8a2a22' }, 'Cinco litros de nada. Serve para tirar gasolina de carro.', ['galao', 'recipiente-combustivel'], { stack: 1, rar: 'incomum' }),
  mat('oleoMotor', 'Óleo de motor', 'combustivel', 1, { f: 'bottle', c: '#2a2a2a', c2: '#e8c84a', k: 'pet' }, 'Lubrifica e queima.', ['oleo', 'lubrificante'], { stack: 2, rar: 'incomum', cond: 'battery' }),
  mat('pecasMotor', 'Peças de motor', 'mecanica', 1.5, { f: 'bits', k: 'gears', c: '#7a7a72' }, 'Para consertar veículos.', ['pecas', 'mecanica', 'metal'], { stack: 3, rar: 'incomum', metal: true }),
  mat('velaIgnicao', 'Vela de ignição', 'mecanica', 0.06, { f: 'bits', k: 'plug', c: '#e8e8e8' }, 'Motor que não pega, às vezes é ela.', ['pecas', 'mecanica'], { stack: 8, rar: 'incomum' }),
  mat('pneu', 'Pneu', 'mecanica', 8, { f: 'bits', k: 'tire', c: '#2a2a2a' }, 'Pneu de carro.', ['pneu', 'borracha'], { stack: 1, vol: 40, rar: 'incomum' }),
]);

export const CONSTRUCTION = category('construcao', { stack: 4, cond: 'none', tags: ['construcao'] }, [
  mat('cimento', 'Saco de cimento', 'alvenaria', 25, { f: 'sack', c: '#9a9a9a', c2: '#2a5aa0' }, '25 kg. Com areia e água, vira parede.', ['cimento'], { stack: 1, vol: 18, rar: 'incomum' }),
  mat('areia', 'Saco de areia', 'alvenaria', 20, { f: 'sack', c: '#d8c08a', c2: '#8a6a3a' }, 'Argamassa ou barricada.', ['areia'], { stack: 1, vol: 14 }),
  mat('tijolo', 'Tijolo', 'alvenaria', 2.5, { f: 'brick', c: '#b8543a' }, 'Parede que zumbi não derruba fácil.', ['tijolo'], { stack: 6 }),
  mat('telha', 'Telha', 'telhado', 2.4, { f: 'brick', c: '#c8643a', k: 'tile' }, 'Conserta telhado.', ['telha'], { stack: 6, rar: 'incomum' }),
  mat('tinta', 'Lata de tinta', 'acabamento', 3.6, { f: 'bucket', c: '#f2f2f2', c2: '#3a8ab0', k: 'paint' }, 'Três litros e meio.', ['tinta'], { stack: 1, rar: 'incomum' }),
  mat('gesso', 'Gesso', 'acabamento', 1, { f: 'sack', c: '#f2f2f2', c2: '#8a8a8a' }, 'Pó de gesso.', ['gesso'], { stack: 2, rar: 'incomum' }),
  mat('arameFarpado', 'Arame farpado', 'cerca', 3, { f: 'coil', c: '#8a8a8a', k: 'barbed' }, 'Cerca que machuca.', ['arame-farpado', 'metal'], { stack: 2, rar: 'raro', metal: true }),
  mat('telaArame', 'Tela de arame', 'cerca', 4, { f: 'sheet', c: '#a8a8a8', k: 'mesh' }, 'Cerca e galinheiro.', ['tela', 'metal'], { stack: 1, rar: 'incomum', metal: true }),
  mat('cadeado', 'Cadeado', 'seguranca', 0.3, { f: 'bits', k: 'padlock', c: '#c8a24a' }, 'Com a chave.', ['cadeado'], { stack: 3, rar: 'incomum', metal: true }),
  mat('corrente', 'Corrente', 'seguranca', 2, { f: 'coil', c: '#8a8a8a', k: 'chain' }, 'Dois metros de elos.', ['corrente', 'metal'], { stack: 2, rar: 'incomum', metal: true }),
  mat('macaneta', 'Maçaneta', 'porta', 0.4, { f: 'bits', k: 'knob', c: '#c8a24a' }, 'Para porta nova.', ['macaneta'], { stack: 4, rar: 'incomum', metal: true }),
  mat('vidroPlaca', 'Placa de vidro', 'janela', 4, { f: 'sheet', c: '#bfe0e8', k: 'glass' }, 'Para trocar janela quebrada.', ['vidro', 'janela'], { stack: 1, rar: 'raro' }),
  mat('sacoVazio', 'Saco de ráfia vazio', 'alvenaria', 0.15, { f: 'sack', c: '#e8e0c8', k: 'empty' }, 'Enche de terra: barricada.', ['saco'], { stack: 10 }),
]);
