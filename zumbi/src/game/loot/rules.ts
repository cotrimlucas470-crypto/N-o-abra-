/**
 * Qual TABELA cada recipiente usa, conforme o CONTEXTO: tipo de construção,
 * cômodo e zona da cidade. É aqui que "armário" vira despensa na cozinha,
 * farmácia na farmácia e ferramentas na oficina.
 */
import { BUILDING_FAMILY, type BuildingKind } from '../world/MapTypes';
import type { WorldModel } from '../world/WorldModel';
import type { PropType } from '../world/PropCatalog';
import type { ContainerKind, LootContext, ZoneKind } from './LootTypes';
import type { LootTableId } from './tables';

/** Comércio e serviço (escritório, posto, escola) guardam coisa de loja; oficina/galpão/fábrica, de trabalho. */
const isShop = (b: BuildingKind | null): b is BuildingKind => !!b && (BUILDING_FAMILY[b] === 'loja' || BUILDING_FAMILY[b] === 'servico');
const isWork = (b: BuildingKind | null): b is BuildingKind => !!b && BUILDING_FAMILY[b] === 'trabalho';
/** Cozinha de comércio (restaurante, padaria, bar). */
const isFood = (b: BuildingKind | null) => b === 'restaurant' || b === 'bakery' || b === 'bar';

export function tableFor(kind: ContainerKind, ctx: LootContext, prop?: PropType): LootTableId | null {
  const b = ctx.building;
  const room = ctx.room;
  switch (kind) {
    case 'construido':
    case 'corpo':
      return null;
    case 'geladeira':
      return isFood(b) ? 'geladeira-restaurante' : 'geladeira-casa';
    case 'fogao':
      return 'fogao';
    case 'armarioCozinha':
      return isFood(b) ? 'despensa-restaurante' : 'despensa';
    case 'armario':
      if (b === 'pharmacy') return 'farmacia-balcao';
      if (b === 'clinic') return room === 'Recepção' ? 'escritorio-trabalho' : 'hospital-armario';
      if (b === 'gym' && room === 'Vestiário') return 'guarda-roupa';
      if (isWork(b)) return room === 'Escritório' ? 'escritorio-trabalho' : 'oficina-prateleira';
      if (b === 'office' || b === 'school') return 'escritorio-trabalho';
      if (isShop(b)) return 'armario-loja';
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
      return isWork(b) || isShop(b) ? 'escritorio-trabalho' : 'escrivaninha';
    case 'rack':
      return 'rack';
    case 'prateleira':
      if (b === 'store') return 'mercado-prateleira';
      if (b === 'pharmacy') return 'farmacia-prateleira';
      if (b === 'clinic') return 'farmacia-prateleira';
      if (b === 'clothing' || b === 'laundry') return 'loja-roupas';
      if (isFood(b)) return 'despensa-restaurante';
      if (b === 'hardware') return 'oficina-prateleira';
      if (isWork(b)) return 'galpao-prateleira';
      if (isShop(b)) return 'armario-loja';
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
        case 'bakery':
        case 'bar':
          return 'despensa-restaurante';
        case 'garage':
        case 'factory':
        case 'hardware':
          return 'oficina-caixas';
        case 'warehouse':
          return 'galpao-caixas';
        case 'shelter':
          return 'abrigo-caixas';
        case 'house':
        case 'apartment':
        case 'church':
          return 'armario-casa';
        case 'clinic':
          return 'farmacia-estoque';
        case 'laundry':
          return 'estoque-roupas';
        case 'office':
        case 'school':
        case 'gym':
          return 'armario-loja';
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
      if (isShop(b)) return 'chao-loja';
      if (isWork(b)) return 'chao-trabalho';
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
