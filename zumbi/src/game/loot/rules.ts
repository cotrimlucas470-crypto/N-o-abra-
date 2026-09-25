/**
 * Qual TABELA cada recipiente usa, conforme o CONTEXTO: tipo de construção,
 * cômodo e zona da cidade. É aqui que "armário" vira despensa na cozinha,
 * farmácia na farmácia e ferramentas na oficina.
 */
import type { BuildingKind } from '../world/MapTypes';
import type { WorldModel } from '../world/WorldModel';
import type { PropType } from '../world/PropCatalog';
import type { ContainerKind, LootContext, ZoneKind } from './LootTypes';
import type { LootTableId } from './tables';

const SHOPS: readonly BuildingKind[] = ['store', 'pharmacy', 'restaurant', 'clothing'];
const WORK: readonly BuildingKind[] = ['garage', 'warehouse'];

export function tableFor(kind: ContainerKind, ctx: LootContext, prop?: PropType): LootTableId | null {
  const b = ctx.building;
  const room = ctx.room;
  switch (kind) {
    case 'construido':
    case 'corpo':
      return null;
    case 'geladeira':
      return b === 'restaurant' ? 'geladeira-restaurante' : 'geladeira-casa';
    case 'fogao':
      return 'fogao';
    case 'armarioCozinha':
      return b === 'restaurant' ? 'despensa-restaurante' : 'despensa';
    case 'armario':
      if (b === 'pharmacy') return 'farmacia-balcao';
      if (b && WORK.includes(b)) return room === 'Escritório' ? 'escritorio-trabalho' : 'oficina-prateleira';
      if (b && SHOPS.includes(b)) return 'armario-loja';
      if (room === 'Cozinha') return 'despensa';
      if (room === 'Banheiro') return 'banheiro';
      return 'armario-casa';
    case 'guardaRoupa':
      return 'guarda-roupa';
    case 'criadoMudo':
      return 'criado-mudo';
    case 'armarioBanheiro':
      return 'banheiro';
    case 'escrivaninha':
      return b && (WORK.includes(b) || SHOPS.includes(b)) ? 'escritorio-trabalho' : 'escrivaninha';
    case 'rack':
      return 'rack';
    case 'prateleira':
      if (b === 'store') return 'mercado-prateleira';
      if (b === 'pharmacy') return 'farmacia-prateleira';
      if (b === 'clothing') return 'loja-roupas';
      if (b === 'restaurant') return 'despensa-restaurante';
      if (b && WORK.includes(b)) return 'galpao-prateleira';
      return 'armario-casa';
    case 'geladeiraVitrine':
      return 'mercado-geladeira';
    case 'caixaRegistradora':
      return b === 'pharmacy' ? 'farmacia-balcao' : 'caixa-registradora';
    case 'prateleiraFerramentas':
      return b === 'warehouse' ? 'galpao-prateleira' : 'oficina-prateleira';
    case 'bancada':
      return 'bancada';
    case 'caixote':
    case 'caixas':
    case 'caixa':
      switch (b) {
        case 'store':
          return 'estoque-mercado';
        case 'pharmacy':
          return 'farmacia-estoque';
        case 'clothing':
          return 'estoque-roupas';
        case 'restaurant':
          return 'despensa-restaurante';
        case 'garage':
          return 'oficina-caixas';
        case 'warehouse':
          return 'galpao-caixas';
        case 'shelter':
          return 'abrigo-caixas';
        case 'house':
          return 'armario-casa';
        default:
          return ctx.zone === 'industrial' ? 'galpao-caixas' : ctx.zone === 'comercial' ? 'lixo-comercial' : 'caixote-quintal';
      }
    case 'cacamba':
      return 'lixo-comercial';
    case 'lixeira':
      return 'lixo-rua';
    case 'sacoLixo':
      return b ? 'lixo-casa' : ctx.zone === 'comercial' ? 'lixo-comercial' : 'lixo-casa';
    case 'portaLuvas':
      return 'porta-luvas';
    case 'portaMalas':
      return prop === 'carWreck' ? 'porta-malas-destrocado' : 'porta-malas';
    case 'bancoCarro':
      return prop === 'carWreck' ? 'banco-destrocado' : 'banco-carro';
    case 'tambor':
      return 'tambor-industrial';
    case 'chao':
      if (b && SHOPS.includes(b)) return 'chao-loja';
      if (b && WORK.includes(b)) return 'chao-trabalho';
      return b ? 'chao-casa' : null;
  }
}

/** Zona da cidade pelo nome da região (setor). */
export function zoneOf(regionName: string | undefined): ZoneKind {
  if (!regionName) return 'rua';
  if (regionName.includes('Comercial')) return 'comercial';
  if (regionName.includes('Industrial')) return 'industrial';
  if (regionName.includes('Parque')) return 'parque';
  return 'residencial';
}

/** Contexto de um ponto do mapa: construção, cômodo e zona. */
export function contextAt(model: WorldModel, x: number, y: number): LootContext {
  const inside = (r: { x: number; y: number; w: number; h: number }) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const building = model.index.buildingsNear(x, y).find((b) => inside(b.bounds)) ?? null;
  // Cômodos se sobrepõem (quarto dentro da sala no modelo): o menor que contém o ponto vence.
  const rooms = building?.rooms.filter((r) => inside(r.rect)).sort((a, b) => a.rect.w * a.rect.h - b.rect.w * b.rect.h) ?? [];
  return { building: building?.kind ?? null, room: rooms[0]?.name ?? null, zone: zoneOf(model.regionAt(x, y)?.name) };
}
