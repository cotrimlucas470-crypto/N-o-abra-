/**
 * Comida e bebida PREPARADAS: só existem por receita (crafting/Recipes.ts).
 * Cozinhar tira o risco do cru, rende mais fome saciada e, quente, levanta o
 * ânimo — mas o prato estraga mais rápido que a lata. Bebidas preparadas
 * (café, chá, suco) vêm na caneca/garrafa e têm efeito próprio.
 */
import type { FoodProps } from '../ItemTypes';
import { category, type ItemEntry } from './define';

const dish = (id: string, name: string, sub: string, kg: number, icon: ItemEntry['icon'], food: FoodProps, desc: string, extra: Partial<ItemEntry> = {}): ItemEntry => ({
  id,
  name,
  sub,
  kg,
  icon,
  desc,
  food,
  craftOnly: true,
  ...extra,
});

export const COOKED = category('comida', { stack: 4, cond: 'perishable', tags: ['comida', 'preparada'] }, [
  dish('carneAssada', 'Carne assada', 'carne', 0.4, { f: 'meat', c: '#7a3a22', c2: '#c89a6a' }, { kcal: 1250, hunger: 36, thirst: -6, spoil: [2, 4, 6] }, 'Na brasa. Cheiro que atravessa a rua.', { tags: ['carne'] }),
  dish('frangoAssado', 'Frango assado', 'carne', 0.5, { f: 'meat', c: '#c8864a', c2: '#f2e8d8', k: 'bone' }, { kcal: 1100, hunger: 34, thirst: -4, spoil: [2, 4, 6] }, 'Dourado por fora.', { tags: ['carne'] }),
  dish('linguicaAssada', 'Linguiça assada', 'carne', 0.35, { f: 'meat', c: '#6a2a1a', k: 'sausage' }, { kcal: 1200, hunger: 28, thirst: -8, spoil: [3, 5, 8] }, 'Estala quando morde.', { tags: ['carne'] }),
  dish('peixeAssado', 'Peixe assado', 'peixe', 0.55, { f: 'fish', c: '#b8905a' }, { kcal: 700, hunger: 30, thirst: -3, spoil: [1, 3, 5] }, 'Cuidado com as espinhas.', { stack: 3, tags: ['peixe'] }),
  dish('carneSeca', 'Carne seca', 'carne', 0.3, { f: 'meat', c: '#5a2a1a', k: 'slices' }, { kcal: 1000, hunger: 26, thirst: -14, spoil: [60, 120, 200] }, 'Salgada e seca: dura meses. Dá muita sede.', { stack: 6, tags: ['carne', 'conserva'] }),
  dish('ovoCozido', 'Ovo cozido', 'ovo', 0.06, { f: 'egg', c: '#f7f2e6' }, { kcal: 75, hunger: 7, thirst: 0, spoil: [5, 10, 15] }, 'Descasca e come.', { stack: 12, tags: ['ovo'] }),
  dish('ovosMexidos', 'Ovos mexidos', 'ovo', 0.15, { f: 'dish', k: 'plate', c: '#f2d24a' }, { kcal: 220, hunger: 14, thirst: -1, spoil: [1, 2, 3] }, 'Na frigideira, com um fio de óleo.', { tags: ['ovo'] }),
  dish('batataCozida', 'Batata cozida', 'verdura', 0.2, { f: 'fruit', c: '#e0c080', k: 'potato' }, { kcal: 150, hunger: 10, thirst: 2, spoil: [3, 5, 8] }, 'Macia. Enche.', { stack: 10 }),
  dish('mandiocaCozida', 'Mandioca cozida', 'verdura', 0.5, { f: 'veg', c: '#f2e8c8', k: 'root' }, { kcal: 800, hunger: 24, thirst: 0, spoil: [2, 4, 6] }, 'Derrete na boca.'),
  dish('arrozCozido', 'Arroz cozido', 'prato', 0.3, { f: 'dish', k: 'bowl', c: '#f2eee2' }, { kcal: 900, hunger: 28, thirst: -2, spoil: [2, 4, 6] }, 'Uma porção. Soltinho.'),
  dish('feijaoCozido', 'Feijão cozido', 'prato', 0.35, { f: 'dish', k: 'bowl', c: '#5a3222' }, { kcal: 820, hunger: 28, thirst: 2, spoil: [2, 4, 6] }, 'Uma porção, com caldo grosso.'),
  dish('macarraoCozido', 'Macarrão cozido', 'prato', 0.3, { f: 'dish', k: 'bowl', c: '#f0d27a' }, { kcal: 875, hunger: 28, thirst: -2, spoil: [2, 3, 5] }, 'Sem molho, mas quente.'),
  dish('miojoPronto', 'Miojo pronto', 'prato', 0.3, { f: 'dish', k: 'bowl', c: '#e8c05a' }, { kcal: 380, hunger: 20, thirst: 4, spoil: [1, 2, 3] }, 'Três minutos de conforto.'),
  dish('sopaLegumes', 'Sopa de legumes', 'prato', 0.4, { f: 'dish', k: 'bowl', c: '#c89a3a' }, { kcal: 180, hunger: 16, thirst: 14, spoil: [2, 3, 5] }, 'Esquenta por dentro.', { tags: ['sopa'] }),
  dish('sopaQuente', 'Sopa quente', 'prato', 0.4, { f: 'dish', k: 'bowl', c: '#d8a24a' }, { kcal: 250, hunger: 20, thirst: 10, spoil: [1, 2, 4] }, 'A da lata, esquentada. Outra coisa.', { tags: ['sopa'] }),
  dish('polenta', 'Polenta', 'prato', 0.35, { f: 'dish', k: 'bowl', c: '#f2c84a' }, { kcal: 900, hunger: 28, thirst: -2, spoil: [2, 4, 6] }, 'Fubá, água e paciência.'),
  dish('mingau', 'Mingau de aveia', 'prato', 0.3, { f: 'dish', k: 'bowl', c: '#e8d8a0' }, { kcal: 475, hunger: 16, thirst: 4, spoil: [1, 2, 3] }, 'Café da manhã de hospital, mas quente.'),
  dish('pipoca', 'Pipoca', 'lanche', 0.1, { f: 'dish', k: 'bowl', c: '#f8f0d8' }, { kcal: 450, hunger: 7, thirst: -4, spoil: [3, 6, 10] }, 'Distrai do resto.'),
  dish('salada', 'Salada', 'prato', 0.3, { f: 'dish', k: 'bowl', c: '#7ac84a' }, { kcal: 90, hunger: 9, thirst: 9, spoil: [1, 2, 3] }, 'Verde, fresca e rara hoje em dia.'),
  dish('farofaCaseira', 'Farofa', 'prato', 0.25, { f: 'dish', k: 'plate', c: '#e8c84a' }, { kcal: 1100, hunger: 18, thirst: -8, spoil: [6, 12, 20] }, 'Farinha de mandioca na manteiga.'),
  dish('paoCaseiro', 'Pão caseiro', 'padaria', 0.45, { f: 'bread', c: '#c8883a', k: 'loaf' }, { kcal: 1300, hunger: 30, thirst: -5, spoil: [3, 6, 10] }, 'Sem fermento, mas é pão.', { stack: 2, tags: ['pao'] }),
  dish('pizzaAssada', 'Pizza assada', 'refeicao', 0.45, { f: 'box', c: '#e8a04a', c2: '#c8342a', k: 'pizza' }, { kcal: 1100, hunger: 42, thirst: -6, spoil: [1, 3, 5] }, 'Borda queimada, queijo derretido.', { stack: 2 }),
  dish('lasanhaPronta', 'Lasanha', 'refeicao', 0.6, { f: 'box', c: '#c8642a', c2: '#3a6a2a', k: 'tray' }, { kcal: 900, hunger: 44, thirst: -4, spoil: [1, 3, 5] }, 'Borbulhando.', { stack: 2 }),
  dish('boloFuba', 'Bolo de fubá', 'padaria', 0.6, { f: 'bread', c: '#e8b84a', k: 'cake' }, { kcal: 2000, hunger: 32, thirst: -5, spoil: [3, 6, 9] }, 'De vó. Fez falta.', { stack: 1, tags: ['doce'] }),
]);

/** Bebidas preparadas e água "de verdade" (torneira, balde, chuva). */
export const PREPARED_DRINKS = category('bebida', { stack: 4, cond: 'drink', tags: ['bebida'] }, [
  { id: 'cafe', name: 'Caneca de café', sub: 'cafe', kg: 0.35, icon: { f: 'dish', k: 'mug', c: '#3a2418' }, desc: 'Passado na hora. Espanta o sono.', drink: { thirst: 10, doses: 1, kcal: 20 }, tags: ['cafeina', 'quente'], craftOnly: true },
  { id: 'cha', name: 'Caneca de chá', sub: 'cha', kg: 0.35, icon: { f: 'dish', k: 'mug', c: '#6aa84a' }, desc: 'Erva-cidreira. Acalma.', drink: { thirst: 16, doses: 1 }, tags: ['calmante', 'quente'], craftOnly: true },
  { id: 'sucoNatural', name: 'Suco natural', sub: 'suco', kg: 0.55, icon: { f: 'bottle', c: '#f0a24a', c2: '#f0a24a', k: 'pet' }, desc: 'Fruta espremida na garrafa.', drink: { thirst: 24, doses: 2, kcal: 90 }, craftOnly: true },
  { id: 'baldeAgua', name: 'Balde com água', sub: 'agua', kg: 10.8, vol: 11, stack: 1, icon: { f: 'bucket', c: '#3a6ab0', c2: '#8fc3dc' }, desc: 'Dez litros. Pesado. Da torneira presta; de chuva ou descarga, ferva antes.', drink: { thirst: 30, doses: 20 }, tags: ['agua', 'balde'], craftOnly: true },
]);
