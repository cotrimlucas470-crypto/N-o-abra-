/**
 * Ferramentas. `tool.uses` diz o que ela faz (o crafting e a construção pedem
 * "martelar", "serrar"... e não um item específico); `durability` = usos até
 * quebrar quando nova. Várias também servem de arma (propriedade `melee`).
 */
import { category, type ItemEntry } from './define';

const tool = (
  id: string,
  name: string,
  sub: string,
  kg: number,
  k: string,
  uses: readonly string[],
  durability: number,
  desc: string,
  extra: Partial<ItemEntry> = {},
): ItemEntry => ({
  id,
  name,
  sub,
  kg,
  icon: { f: 'tool', k },
  desc,
  tool: { uses, durability },
  tags: uses,
  metal: true,
  ...extra,
});

export const TOOLS = category('ferramenta', { stack: 1, cond: 'durable', tags: ['ferramenta'] }, [
  tool('martelo', 'Martelo', 'construcao', 0.8, 'hammer', ['martelar', 'martelo'], 400, 'Para construir. Ou para outra coisa.', {
    melee: { damage: 9, speed: 1.1, reach: 0.9, durability: 120, kind: 'impacto' },
    tags: ['martelar', 'martelo', 'arma-contundente'],
  }),
  tool('marreta', 'Marreta', 'construcao', 4.5, 'sledge', ['demolir', 'martelar'], 300, 'Derruba parede. Pesada demais para brigar.', {
    rar: 'incomum',
    melee: { damage: 24, speed: 0.45, reach: 1.1, durability: 150, kind: 'impacto' },
  }),
  tool('serrote', 'Serrote', 'marcenaria', 0.6, 'saw', ['serrar', 'serrar-madeira'], 300, 'Transforma móvel em tábua.'),
  tool('serraArco', 'Serra de arco', 'metal', 0.5, 'hacksaw', ['serrar-metal', 'serrar'], 200, 'Corta cano e cadeado.', { rar: 'incomum' }),
  tool('machado', 'Machado', 'lenha', 2.2, 'axe', ['cortar-lenha', 'machado', 'demolir'], 350, 'Lenha, portas, o que for preciso.', {
    rar: 'incomum',
    melee: { damage: 22, speed: 0.7, reach: 1.2, durability: 140, kind: 'corte' },
    tags: ['cortar-lenha', 'machado', 'demolir', 'arma-cortante'],
  }),
  tool('machadinha', 'Machadinha', 'lenha', 0.9, 'hatchet', ['cortar-lenha', 'machado'], 250, 'Leve. Corta galhos.', {
    melee: { damage: 13, speed: 1, reach: 0.9, durability: 110, kind: 'corte' },
  }),
  tool('chaveFenda', 'Chave de fenda', 'mecanica', 0.2, 'screwdriver', ['parafusar', 'desmontar'], 300, 'Desmonta quase tudo.', {
    melee: { damage: 5, speed: 1.4, reach: 0.6, durability: 60, kind: 'perfuracao' },
  }),
  tool('chaveInglesa', 'Chave inglesa', 'mecanica', 0.6, 'wrench', ['chave', 'mecanica', 'encanamento'], 500, 'Porcas, canos, motores.', {
    melee: { damage: 8, speed: 1.1, reach: 0.8, durability: 150, kind: 'impacto' },
  }),
  tool('chaveRoda', 'Chave de roda', 'mecanica', 1.1, 'lug', ['trocar-pneu', 'mecanica'], 500, 'Veio no porta-malas.', {
    melee: { damage: 10, speed: 0.9, reach: 0.9, durability: 160, kind: 'impacto' },
  }),
  tool('alicate', 'Alicate', 'eletrica', 0.3, 'pliers', ['alicate', 'cortar-arame', 'eletrica'], 300, 'Arame, fio, prego torto.'),
  tool('alicateCorte', 'Alicate de corte', 'eletrica', 0.25, 'pliers', ['cortar-arame', 'eletrica'], 250, 'Corta fio e arame.', { rar: 'incomum', icon: { f: 'tool', k: 'pliers', c: '#c8342a' } }),
  tool('pa', 'Pá', 'jardim', 1.8, 'shovel', ['cavar', 'pa'], 300, 'Cova, trincheira, canteiro.', {
    melee: { damage: 12, speed: 0.75, reach: 1.3, durability: 120, kind: 'impacto' },
  }),
  tool('enxada', 'Enxada', 'jardim', 1.7, 'hoe', ['arar', 'enxada'], 300, 'Prepara a terra para plantar.', {
    melee: { damage: 11, speed: 0.75, reach: 1.3, durability: 110, kind: 'corte' },
    tags: ['arar', 'enxada', 'agricultura'],
  }),
  tool('rastelo', 'Rastelo', 'jardim', 1.1, 'rake', ['arar'], 200, 'Junta folha e prepara canteiro.', { tags: ['agricultura'] }),
  tool('foice', 'Foice', 'jardim', 1.2, 'scythe', ['colher', 'cortar-mato'], 220, 'Corta mato alto.', {
    rar: 'incomum',
    melee: { damage: 14, speed: 0.8, reach: 1.2, durability: 90, kind: 'corte' },
  }),
  tool('picareta', 'Picareta', 'construcao', 3, 'pickaxe', ['quebrar-pedra', 'demolir', 'cavar'], 300, 'Pedra, concreto, asfalto.', {
    rar: 'raro',
    melee: { damage: 20, speed: 0.5, reach: 1.2, durability: 140, kind: 'perfuracao' },
  }),
  tool('peDeCabra', 'Pé de cabra', 'demolicao', 2, 'crowbar', ['alavanca', 'arrombar', 'demolir'], 600, 'Abre o que está fechado. Pesado.', {
    melee: { damage: 13, speed: 0.85, reach: 1, durability: 300, kind: 'impacto' },
    tags: ['alavanca', 'arrombar', 'demolir', 'arma-contundente'],
  }),
  tool('trena', 'Trena', 'construcao', 0.25, 'tape', ['medir'], 800, 'Cinco metros.'),
  tool('estilete', 'Estilete', 'geral', 0.05, 'boxcutter', ['cortar', 'cortar-tecido'], 120, 'Corta papelão, tecido, fita.', {
    melee: { damage: 4, speed: 1.5, reach: 0.5, durability: 40, kind: 'corte' },
  }),
  tool('tesoura', 'Tesoura', 'geral', 0.1, 'scissors', ['cortar-tecido', 'cortar'], 250, 'Tecido, papel, curativo.'),
  tool('abridor', 'Abridor de latas', 'cozinha', 0.08, 'opener', ['abridor'], 500, 'Pequeno e indispensável.', { tags: ['abridor', 'cozinha'] }),
  tool('furadeira', 'Furadeira a bateria', 'eletrica', 1.6, 'drill', ['furar', 'parafusar'], 300, 'Sem bateria carregada, é peso morto.', {
    rar: 'raro',
    cond: 'device',
    power: { hours: 1, needs: 'bateria-ferramenta' },
  }),
  tool('lima', 'Lima', 'metal', 0.3, 'file', ['afiar'], 400, 'Afia lâminas.', { rar: 'incomum' }),
  tool('colherPedreiro', 'Colher de pedreiro', 'construcao', 0.4, 'trowel', ['alvenaria'], 400, 'Cimento e tijolo.', { rar: 'incomum' }),
  tool('kitCostura', 'Kit de costura', 'costura', 0.15, 'sewing', ['costurar'], 60, 'Agulhas e linhas. Remenda roupa (e gente).', {
    metal: false,
    tags: ['costurar', 'agulha'],
  }),
  tool('isqueiro', 'Isqueiro', 'fogo', 0.03, 'lighter', ['acender', 'fogo'], 300, 'Acende fogueira, fogão, vela.', { stack: 3, cond: 'battery', metal: false }),
  tool('fosforos', 'Caixa de fósforos', 'fogo', 0.02, 'matches', ['acender', 'fogo'], 40, 'Cada palito, uma chance.', { stack: 5, cond: 'battery', metal: false }),
  tool('macaco', 'Macaco hidráulico', 'mecanica', 3.5, 'jack', ['levantar-carro', 'mecanica'], 400, 'Levanta carro para trocar pneu.', { rar: 'incomum' }),
  // ---------------- improvisadas (só por fabricação)
  tool('marteloPedra', 'Martelo de pedra', 'improvisada', 1.1, 'stonehammer', ['martelar', 'martelo'], 60, 'Pedra amarrada num galho. Funciona.', {
    craftOnly: true,
    metal: false,
    melee: { damage: 8, speed: 0.9, reach: 0.9, durability: 40, kind: 'impacto' },
  }),
  tool('machadoPedra', 'Machado de pedra', 'improvisada', 1.4, 'stoneaxe', ['cortar-lenha', 'machado'], 60, 'Lento, mas corta.', {
    craftOnly: true,
    metal: false,
    melee: { damage: 11, speed: 0.7, reach: 1, durability: 40, kind: 'corte' },
  }),
  tool('facaPedra', 'Faca de pedra', 'improvisada', 0.3, 'stoneknife', ['cortar', 'cortar-tecido'], 40, 'Lasca afiada com cabo.', {
    craftOnly: true,
    metal: false,
    melee: { damage: 5, speed: 1.3, reach: 0.5, durability: 25, kind: 'corte' },
  }),
]);
