/**
 * Bebidas. Todas têm DOSES: uma garrafa aberta guarda o que sobrou.
 * Água sem procedência (torneira parada, chuva, rio) vem CONTAMINADA:
 * precisa ferver ou tratar (cloro/pastilha) antes de beber sem risco.
 */
import { category, type ItemEntry } from './define';

const drink = (
  id: string,
  name: string,
  sub: string,
  kg: number,
  icon: ItemEntry['icon'],
  thirst: number,
  doses: number,
  desc: string,
  extra: Partial<ItemEntry> = {},
): ItemEntry => ({ id, name, sub, kg, icon, desc, drink: { thirst, doses }, ...extra });

export const DRINKS = category('bebida', { stack: 4, cond: 'drink', tags: ['bebida'] }, [
  drink('agua', "Garrafa d'água", 'agua', 0.55, { f: 'bottle', c: '#8fc3dc', c2: '#2f78c4' }, 30, 2, 'Meio litro. Lacrada.', { tags: ['agua'] }),
  drink('aguaGalao', 'Galão de água (5 L)', 'agua', 5.2, { f: 'bottle', c: '#8fc3dc', c2: '#2f78c4', k: 'jug', big: true }, 30, 20, 'Pesado, mas vale ouro.', { stack: 1, rar: 'incomum', tags: ['agua'] }),
  drink('aguaSuja', 'Garrafa com água suja', 'agua', 0.55, { f: 'bottle', c: '#9a9a6a', c2: '#6a6a4a' }, 30, 2, 'Sem procedência. Ferva antes de beber.', { tags: ['agua', 'contaminada'], craftOnly: true }),
  drink('refrigerante', 'Lata de refrigerante', 'refrigerante', 0.36, { f: 'can', c: '#c8352c', c2: '#f2f2f2', k: 'soda' }, 18, 1, 'Morna, mas ainda tem gás.', { stack: 6, drink: { thirst: 18, doses: 1, kcal: 140 } }),
  drink('refrigerante2l', 'Refrigerante (2 L)', 'refrigerante', 2.1, { f: 'bottle', c: '#3a2418', c2: '#c8342a', k: 'pet', big: true }, 20, 8, 'Garrafa PET grande.', { stack: 2, drink: { thirst: 20, doses: 8, kcal: 110 } }),
  drink('sucoCaixa', 'Suco de caixinha', 'suco', 0.22, { f: 'carton', c: '#f0922a', c2: '#3a8a4a' }, 16, 1, 'Com canudinho.', { stack: 8, drink: { thirst: 16, doses: 1, kcal: 90 } }),
  drink('sucoLitro', 'Suco (1 L)', 'suco', 1.05, { f: 'carton', c: '#e8c84a', c2: '#c8342a', big: true }, 20, 4, 'Néctar de pêssego.', { stack: 2, drink: { thirst: 20, doses: 4, kcal: 120 } }),
  drink('leiteCaixa', 'Leite longa vida', 'laticinio', 1.05, { f: 'carton', c: '#f4f4f0', c2: '#3a6fb0', big: true }, 22, 4, 'Dura meses fechado.', { stack: 2, drink: { thirst: 22, doses: 4, kcal: 150 } }),
  drink('energetico', 'Energético', 'energetico', 0.28, { f: 'can', c: '#2a2a3a', c2: '#8ac83a', k: 'soda' }, 14, 1, 'Tira o sono por um tempo.', { stack: 6, rar: 'incomum', drink: { thirst: 14, doses: 1, kcal: 110 } }),
  drink('isotonico', 'Isotônico', 'esporte', 0.52, { f: 'bottle', c: '#5ab8e8', c2: '#f2f2f2', k: 'pet' }, 28, 2, 'Repõe sais.', { rar: 'incomum', drink: { thirst: 28, doses: 2, kcal: 60 } }),
  drink('aguaCoco', 'Água de coco', 'suco', 0.35, { f: 'carton', c: '#f2f2e8', c2: '#3a8a4a' }, 26, 1, 'Caixinha.', { stack: 6, drink: { thirst: 26, doses: 1, kcal: 70 } }),
  drink('chaGelado', 'Chá gelado', 'cha', 0.5, { f: 'bottle', c: '#b8763a', c2: '#e8c84a', k: 'pet' }, 24, 2, 'Pêssego. Doce demais.', { drink: { thirst: 24, doses: 2, kcal: 80 } }),
  drink('cerveja', 'Lata de cerveja', 'alcool', 0.37, { f: 'can', c: '#e8c84a', c2: '#c8342a', k: 'soda' }, 8, 1, 'Morna. Desidrata.', { stack: 6, drink: { thirst: 8, doses: 1, kcal: 150, alcohol: true } }),
  drink('cachaca', 'Cachaça', 'alcool', 1.1, { f: 'bottle', c: '#f2efe0', c2: '#8a5a2a', k: 'glass', big: true }, -5, 10, 'Também serve para limpar ferida (arde).', { stack: 1, rar: 'incomum', tags: ['alcool', 'desinfetante', 'combustivel'], drink: { thirst: -5, doses: 10, kcal: 70, alcohol: true } }),
  drink('vinho', 'Vinho', 'alcool', 1.2, { f: 'bottle', c: '#5a1a2a', c2: '#e8e0d0', k: 'glass', big: true }, 4, 5, 'Tinto seco.', { stack: 1, rar: 'incomum', drink: { thirst: 4, doses: 5, kcal: 120, alcohol: true } }),
  drink('cafeLata', 'Café gelado (lata)', 'cafe', 0.25, { f: 'can', c: '#3a2418', c2: '#e8c84a', k: 'soda' }, 10, 1, 'Cafeína pronta.', { stack: 6, rar: 'incomum', drink: { thirst: 10, doses: 1, kcal: 120 } }),
]);
