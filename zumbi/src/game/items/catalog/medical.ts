/**
 * Medicina. `med` diz o efeito (curar, estancar, desinfetar, dor,
 * antibiótico) e a validade: remédio vencido rende metade.
 */
import { category, type ItemEntry } from './define';

const med = (id: string, name: string, sub: string, kg: number, icon: ItemEntry['icon'], desc: string, m: NonNullable<ItemEntry['med']>, extra: Partial<ItemEntry> = {}): ItemEntry => ({
  id,
  name,
  sub,
  kg,
  icon,
  desc,
  med: m,
  ...extra,
});

export const MEDICAL = category('medicina', { stack: 10, cond: 'medicine', tags: ['medicina'] }, [
  med('atadura', 'Atadura', 'curativo', 0.05, { f: 'roll', c: '#eeeae0', k: 'bandage' }, 'Rolo de gaze limpa.', { heal: 8, bandage: true }, { cond: 'none', tags: ['curativo', 'atadura'] }),
  med('gaze', 'Gaze estéril', 'curativo', 0.02, { f: 'box', c: '#f2f2f2', c2: '#3a8ab0', k: 'flat' }, 'Pacotinho lacrado.', { heal: 5, bandage: true }, { cond: 'none', tags: ['curativo'] }),
  med('esparadrapo', 'Esparadrapo', 'curativo', 0.05, { f: 'roll', c: '#f2ead8' }, 'Prende curativo.', { heal: 2 }, { cond: 'none', tags: ['curativo', 'fita'] }),
  med('curativoAdesivo', 'Curativo adesivo', 'curativo', 0.005, { f: 'box', c: '#e8b890', c2: '#c8342a', k: 'flat' }, 'Para corte pequeno.', { heal: 3, bandage: true }, { cond: 'none', stack: 20, tags: ['curativo'] }),
  med('algodao', 'Algodão', 'curativo', 0.05, { f: 'bag', c: '#f7f7f7', c2: '#3a8ab0' }, 'Limpa ferida.', { heal: 1 }, { cond: 'none', tags: ['curativo', 'algodao'] }),
  med('alcool70', 'Álcool 70%', 'antisseptico', 1, { f: 'bottle', c: '#f2f2f2', c2: '#3a6fb0', k: 'pet' }, 'Desinfeta ferida e ferramenta. Inflamável.', { disinfect: true, doses: 10, shelfLifeDays: 700 }, { stack: 2, tags: ['desinfetante', 'alcool', 'combustivel'] }),
  med('alcoolGel', 'Álcool em gel', 'antisseptico', 0.5, { f: 'bottle', c: '#bfe0e8', c2: '#3a8ab0', k: 'pump' }, 'Mãos limpas.', { disinfect: true, doses: 20, shelfLifeDays: 700 }, { stack: 2, tags: ['desinfetante'] }),
  med('aguaOxigenada', 'Água oxigenada', 'antisseptico', 0.1, { f: 'bottle', c: '#5a3a2a', c2: '#f2f2f2', k: 'small' }, 'Borbulha na ferida.', { disinfect: true, doses: 8, shelfLifeDays: 500 }, { stack: 4, tags: ['desinfetante'] }),
  med('iodo', 'Antisséptico (iodo)', 'antisseptico', 0.1, { f: 'bottle', c: '#8a3a1a', c2: '#f2f2f2', k: 'small' }, 'Mancha a pele, protege a ferida.', { disinfect: true, doses: 10, shelfLifeDays: 700 }, { rar: 'incomum', stack: 4, tags: ['desinfetante'] }),
  med('soroFisiologico', 'Soro fisiológico', 'antisseptico', 0.25, { f: 'bottle', c: '#f2f2f2', c2: '#3a8ab0', k: 'small' }, 'Lava ferida e olhos.', { doses: 5, heal: 2, shelfLifeDays: 700 }, { stack: 4 }),
  med('analgesico', 'Analgésicos', 'remedio', 0.08, { f: 'blister', c: '#f2f2f2', c2: '#c8342a' }, 'Cartela com poucos comprimidos.', { pain: 30, doses: 6, shelfLifeDays: 600 }, { stack: 5, tags: ['remedio', 'dor'] }),
  med('antiInflamatorio', 'Anti-inflamatório', 'remedio', 0.05, { f: 'blister', c: '#f2e8a0', c2: '#e8762a' }, 'Dor e inchaço.', { pain: 40, doses: 8, shelfLifeDays: 600 }, { rar: 'incomum', stack: 5, tags: ['remedio', 'dor'] }),
  med('antibiotico', 'Antibióticos', 'remedio', 0.06, { f: 'pill', c: '#f2f2f2', c2: '#8a3ab0' }, 'Para infecção. Tome até o fim.', { antibiotic: true, doses: 10, shelfLifeDays: 500 }, { rar: 'raro', stack: 3, tags: ['remedio', 'antibiotico'] }),
  med('antialergico', 'Antialérgico', 'remedio', 0.04, { f: 'blister', c: '#e8f2f8', c2: '#3a8ab0' }, 'Dá sono.', { doses: 10, shelfLifeDays: 600 }, { rar: 'incomum', stack: 5, tags: ['remedio'] }),
  med('calmante', 'Calmante', 'remedio', 0.05, { f: 'pill', c: '#f2f2f2', c2: '#3a8a6a' }, 'Controlado. Ajuda a dormir.', { doses: 20, shelfLifeDays: 700 }, { rar: 'raro', stack: 3, tags: ['remedio'] }),
  med('remedioGripe', 'Remédio para gripe', 'remedio', 0.06, { f: 'box', c: '#f2c84a', c2: '#c8342a', k: 'flat' }, 'Alivia febre e resfriado.', { pain: 15, doses: 6, shelfLifeDays: 600 }, { stack: 5, tags: ['remedio'] }),
  med('vitaminas', 'Vitaminas', 'remedio', 0.15, { f: 'pill', c: '#f0922a', c2: '#f2f2f2' }, 'Frasco com 60 comprimidos.', { doses: 30, shelfLifeDays: 900 }, { stack: 3, tags: ['remedio'] }),
  med('pomada', 'Pomada cicatrizante', 'remedio', 0.05, { f: 'tube', c: '#f2f2f2', c2: '#3a8a4a' }, 'Queimadura e ferida.', { heal: 5, doses: 8, shelfLifeDays: 700 }, { rar: 'incomum', stack: 5, tags: ['remedio'] }),
  med('tala', 'Tala', 'ortopedia', 0.3, { f: 'plank', c: '#e8d8b0', k: 'splint' }, 'Imobiliza fratura.', { heal: 0 }, { cond: 'none', rar: 'incomum', stack: 4, tags: ['tala'] }),
  med('pinca', 'Pinça', 'instrumento', 0.02, { f: 'tool', k: 'tweezers' }, 'Tira caco de vidro e bala.', {}, { cond: 'durable', rar: 'incomum', stack: 1, metal: true, tags: ['pinca'] }),
  med('kitSutura', 'Kit de sutura', 'instrumento', 0.1, { f: 'kit', c: '#3a8ab0', k: 'small' }, 'Agulha curva e fio. Fecha corte fundo.', { heal: 10, doses: 3, shelfLifeDays: 900 }, { rar: 'raro', stack: 3, tags: ['sutura'] }),
  med('luvasLatex', 'Luvas de látex', 'protecao', 0.01, { f: 'gloves', c: '#e8f2f8', k: 'thin' }, 'Descartáveis. Vestidas, protegem a mão de sujeira ao tratar ferida.', {}, { cond: 'clothing', stack: 20, tags: ['higiene'], wear: { slot: 'maos', insulation: 0.02, bite: 0, scratch: 0.03 } }),
  med('mascara', 'Máscara descartável', 'protecao', 0.01, { f: 'cloth', k: 'mask', c: '#8ac8e8' }, 'Protege do cheiro. Um pouco.', {}, { cond: 'clothing', stack: 20, tags: ['higiene'], wear: { slot: 'rosto', insulation: 0.02, bite: 0, scratch: 0.02 } }),
  med('termometro', 'Termômetro', 'instrumento', 0.03, { f: 'device', k: 'thermometer', c: '#f2f2f2' }, 'Mede a febre.', {}, { cond: 'durable', stack: 1, rar: 'incomum' }),
  med('seringa', 'Seringa', 'instrumento', 0.01, { f: 'syringe' }, 'Descartável, lacrada.', {}, { cond: 'none', rar: 'incomum', stack: 10, tags: ['seringa'] }),
  // ---------------- improvisados (fabricação) e usados
  med('ataduraImprovisada', 'Atadura improvisada', 'curativo', 0.05, { f: 'roll', c: '#e8e0d0', k: 'bandage' }, 'Tiras de pano limpo. Serve bem.', { heal: 4, bandage: true }, { cond: 'none', craftOnly: true, tags: ['curativo', 'atadura'] }),
  med('ataduraSuja', 'Atadura usada', 'curativo', 0.05, { f: 'roll', c: '#b88a7a', k: 'bandage' }, 'Suja de sangue. Ferva para usar de novo.', {}, { cond: 'none', craftOnly: true, tags: ['atadura-suja'] }),
  med('talaImprovisada', 'Tala improvisada', 'ortopedia', 0.5, { f: 'plank', c: '#a8784a', k: 'splint' }, 'Galho reto e pano. Imobiliza.', { heal: 0 }, { cond: 'none', craftOnly: true, stack: 4, tags: ['tala'] }),
  med('kitPrimeirosSocorros', 'Kit de primeiros socorros', 'kit', 0.8, { f: 'kit', c: '#c8342a' }, 'Tudo o que precisa numa caixa só.', { heal: 30, bandage: true, disinfect: true, doses: 4, shelfLifeDays: 900 }, { rar: 'raro', stack: 1, tags: ['curativo', 'kit'] }),
]);
