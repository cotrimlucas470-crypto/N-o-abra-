/**
 * Roupas, proteção e mochilas. Roupa tem slot, isolamento térmico e proteção
 * contra mordida/arranhão; mochila tem capacidade (kg) e redução de peso.
 * Condição de roupa: sujo, molhado, rasgado (ver items/condition.ts).
 */
import type { WearSlot } from '../ItemTypes';
import { category, type ItemEntry } from './define';

const wear = (
  id: string,
  name: string,
  sub: string,
  kg: number,
  icon: ItemEntry['icon'],
  slot: WearSlot,
  insulation: number,
  bite: number,
  scratch: number,
  desc: string,
  extra: Partial<ItemEntry> = {},
): ItemEntry => ({ id, name, sub, kg, icon, desc, wear: { slot, insulation, bite, scratch }, ...extra });

export const CLOTHING = category('roupa', { stack: 1, cond: 'clothing', tags: ['roupa'] }, [
  wear('camiseta', 'Camiseta', 'camiseta', 0.2, { f: 'shirt', c: '#6a8ab0' }, 'tronco', 0.1, 0, 0.1, 'Algodão.', { tags: ['tecido-fonte'] }),
  wear('camisetaBranca', 'Camiseta branca', 'camiseta', 0.2, { f: 'shirt', c: '#e8e8e0' }, 'tronco', 0.1, 0, 0.1, 'Vira atadura se preciso.', { tags: ['tecido-fonte'] }),
  wear('regata', 'Regata', 'camiseta', 0.15, { f: 'shirt', c: '#c8342a', k: 'tank' }, 'tronco', 0.05, 0, 0.05, 'Fresca.', { tags: ['tecido-fonte'] }),
  wear('camisaSocial', 'Camisa social', 'camisa', 0.3, { f: 'shirt', c: '#d8e0f0', k: 'collar' }, 'tronco', 0.15, 0, 0.12, 'Manga longa, botões.', { tags: ['tecido-fonte'] }),
  wear('camisaFlanela', 'Camisa de flanela', 'camisa', 0.4, { f: 'shirt', c: '#a83a3a', k: 'plaid' }, 'tronco', 0.3, 0.02, 0.2, 'Xadrez, quentinha.', { rar: 'incomum', tags: ['tecido-fonte'] }),
  wear('moletom', 'Moletom', 'agasalho', 0.6, { f: 'shirt', c: '#6a6a72', k: 'hood' }, 'tronco-externo', 0.45, 0.03, 0.25, 'Com capuz.', { tags: ['tecido-fonte'] }),
  wear('jaquetaJeans', 'Jaqueta jeans', 'jaqueta', 0.9, { f: 'jacket', c: '#3a5a8a' }, 'tronco-externo', 0.35, 0.1, 0.35, 'Tecido grosso segura arranhão.', { rar: 'incomum' }),
  wear('jaquetaCouro', 'Jaqueta de couro', 'jaqueta', 1.4, { f: 'jacket', c: '#2a2220' }, 'tronco-externo', 0.45, 0.25, 0.55, 'A melhor proteção comum.', { rar: 'raro' }),
  wear('casacoInverno', 'Casaco de inverno', 'jaqueta', 1.5, { f: 'jacket', c: '#2a3a4a', k: 'puffer' }, 'tronco-externo', 0.8, 0.08, 0.3, 'Para noite fria.', { rar: 'incomum' }),
  wear('capaChuva', 'Capa de chuva', 'jaqueta', 0.4, { f: 'jacket', c: '#e8c84a', k: 'rain' }, 'tronco-externo', 0.15, 0.02, 0.1, 'Não deixa molhar.', { tags: ['impermeavel'] }),
  wear('jaleco', 'Jaleco', 'uniforme', 0.5, { f: 'jacket', c: '#f2f2f2', k: 'coat' }, 'tronco-externo', 0.15, 0.03, 0.15, 'Branco, com bolsos.', { rar: 'incomum', wear: { slot: 'tronco-externo', insulation: 0.15, bite: 0.03, scratch: 0.15, pockets: 1 } }),
  wear('macacao', 'Macacão de mecânico', 'uniforme', 1.2, { f: 'pants', c: '#3a4a6a', k: 'overall' }, 'tronco-externo', 0.3, 0.08, 0.35, 'Cheio de bolsos.', { rar: 'incomum', wear: { slot: 'tronco-externo', insulation: 0.3, bite: 0.08, scratch: 0.35, pockets: 2 } }),
  wear('colete', 'Colete refletivo', 'colete', 0.2, { f: 'vest', c: '#e8e03a', k: 'reflective' }, 'tronco-externo', 0.05, 0, 0.05, 'Chama a atenção. De todo mundo.', {}),
  wear('coleteBalistico', 'Colete balístico', 'colete', 3, { f: 'vest', c: '#2a2a2a', k: 'armor' }, 'tronco-externo', 0.2, 0.6, 0.7, 'Pesado. Mordida não atravessa.', { rar: 'muito-raro' }),
  wear('calcaJeans', 'Calça jeans', 'calca', 0.7, { f: 'pants', c: '#3a5a8a' }, 'pernas', 0.3, 0.08, 0.3, 'Dois bolsos.', { wear: { slot: 'pernas', insulation: 0.3, bite: 0.08, scratch: 0.3, pockets: 1 } }),
  wear('calcaMoletom', 'Calça de moletom', 'calca', 0.5, { f: 'pants', c: '#6a6a72' }, 'pernas', 0.35, 0.02, 0.15, 'Confortável.', {}),
  wear('calcaBrim', 'Calça de brim', 'calca', 0.8, { f: 'pants', c: '#5a5a3a' }, 'pernas', 0.35, 0.1, 0.35, 'Roupa de obra.', { rar: 'incomum', wear: { slot: 'pernas', insulation: 0.35, bite: 0.1, scratch: 0.35, pockets: 1.5 } }),
  wear('bermuda', 'Bermuda', 'calca', 0.3, { f: 'pants', c: '#8a7a5a', k: 'short' }, 'pernas', 0.1, 0, 0.05, 'Fresca.', {}),
  wear('meias', 'Meias', 'intima', 0.05, { f: 'shoes', c: '#e8e8e0', k: 'socks' }, 'pes', 0.1, 0, 0, 'Pé seco, pé saudável.', { stack: 4 }),
  wear('tenis', 'Tênis', 'calcado', 0.8, { f: 'shoes', c: '#e8e8e0' }, 'pes', 0.15, 0.03, 0.1, 'Leve para correr.', {}),
  wear('botaTrabalho', 'Bota de trabalho', 'calcado', 1.5, { f: 'shoes', c: '#6a4a2a', k: 'boot' }, 'pes', 0.3, 0.15, 0.3, 'Bico de aço.', { rar: 'incomum' }),
  wear('botaMilitar', 'Coturno', 'calcado', 1.6, { f: 'shoes', c: '#2a2a2a', k: 'boot' }, 'pes', 0.35, 0.2, 0.35, 'Cano alto.', { rar: 'raro' }),
  wear('chinelo', 'Chinelo', 'calcado', 0.2, { f: 'shoes', c: '#3a6ab0', k: 'flip' }, 'pes', 0, 0, 0, 'Não corre com isso.', {}),
  wear('sapatoSocial', 'Sapato social', 'calcado', 0.9, { f: 'shoes', c: '#2a1a14' }, 'pes', 0.1, 0.02, 0.05, 'Escorrega.', {}),
  wear('luvasTrabalho', 'Luvas de trabalho', 'luva', 0.2, { f: 'gloves', c: '#c8a06a' }, 'maos', 0.2, 0.15, 0.4, 'Protege a mão no trabalho pesado.', { rar: 'incomum' }),
  wear('luvasCouro', 'Luvas de couro', 'luva', 0.25, { f: 'gloves', c: '#3a2a1a' }, 'maos', 0.25, 0.2, 0.45, 'Firmes.', { rar: 'raro' }),
  wear('luvasLa', 'Luvas de lã', 'luva', 0.1, { f: 'gloves', c: '#a83a5a' }, 'maos', 0.35, 0, 0.05, 'Quentes.', {}),
  wear('bone', 'Boné', 'chapeu', 0.1, { f: 'hat', k: 'cap', c: '#c8342a' }, 'cabeca', 0.05, 0, 0.02, 'Protege do sol.', {}),
  wear('gorro', 'Gorro', 'chapeu', 0.1, { f: 'hat', k: 'beanie', c: '#3a3a4a' }, 'cabeca', 0.3, 0, 0.02, 'De lã.', {}),
  wear('capaceteObra', 'Capacete de obra', 'capacete', 0.4, { f: 'hat', k: 'hardhat', c: '#e8c84a' }, 'cabeca', 0.05, 0.3, 0.4, 'Aguenta pancada.', { rar: 'incomum' }),
  wear('capaceteMoto', 'Capacete de moto', 'capacete', 1.4, { f: 'hat', k: 'helmet', c: '#2a2a2a' }, 'cabeca', 0.2, 0.7, 0.8, 'Cabeça protegida, visão reduzida.', { rar: 'raro' }),
  wear('oculosProtecao', 'Óculos de proteção', 'rosto', 0.08, { f: 'hat', k: 'goggles', c: '#bfe0e8' }, 'rosto', 0, 0.05, 0.2, 'Nada de sangue no olho.', { rar: 'incomum' }),
  wear('cachecol', 'Cachecol', 'acessorio', 0.15, { f: 'cloth', k: 'scarf', c: '#8a3a5a' }, 'pescoco', 0.25, 0.05, 0.1, 'Protege o pescoço. Um pouco.', {}),
  wear('uniformePolicial', 'Farda policial', 'uniforme', 1, { f: 'shirt', c: '#2a3a5a', k: 'collar' }, 'tronco', 0.3, 0.05, 0.3, 'Tecido resistente.', { rar: 'raro' }),
]);

const bag = (id: string, name: string, sub: string, kg: number, icon: ItemEntry['icon'], capacity: number, reduction: number, desc: string, extra: Partial<ItemEntry> = {}): ItemEntry => ({
  id,
  name,
  sub,
  kg,
  icon,
  desc,
  bag: { capacity, reduction },
  ...extra,
});

export const BAGS = category('mochila', { stack: 1, cond: 'clothing', tags: ['mochila', 'recipiente'] }, [
  bag('sacolaPlastica', 'Sacola plástica', 'sacola', 0.02, { f: 'handbag', k: 'plastic', c: '#f2f2f2' }, 2, 0, 'Rasga com peso.', { cond: 'none', stack: 10 }),
  bag('sacolaMercado', 'Sacola retornável', 'sacola', 0.15, { f: 'handbag', k: 'shopping', c: '#3a8a4a' }, 4, 0.1, 'Aguenta compras.', {}),
  bag('pochete', 'Pochete', 'pochete', 0.2, { f: 'handbag', k: 'pouch', c: '#2a2a2a' }, 1.5, 0.3, 'Pequena e sempre à mão.', {}),
  bag('bolsaLateral', 'Bolsa lateral', 'bolsa', 0.4, { f: 'handbag', k: 'side', c: '#7a5a3a' }, 4, 0.3, 'Atravessada no peito.', {}),
  bag('mochilaEscolar', 'Mochila escolar', 'mochila', 0.6, { f: 'backpack', c: '#3a6ab0' }, 7, 0.4, 'Ainda com um caderno dentro.', {}),
  bag('mochilaTrilha', 'Mochila de trilha', 'mochila', 1.2, { f: 'backpack', c: '#c8642a', big: true }, 14, 0.55, 'Alças acolchoadas, divisórias.', { rar: 'raro' }),
  bag('mochilaMilitar', 'Mochila militar', 'mochila', 1.8, { f: 'backpack', c: '#4a5a3a', big: true }, 18, 0.6, 'Feita para carregar muito.', { rar: 'muito-raro' }),
  bag('bolsaEsportiva', 'Bolsa esportiva', 'bolsa', 0.8, { f: 'handbag', k: 'duffel', c: '#2a2a3a' }, 10, 0.25, 'Grande, mas cansa o braço.', { rar: 'incomum' }),
  bag('malaViagem', 'Mala de viagem', 'mala', 3, { f: 'handbag', k: 'suitcase', c: '#5a2a2a' }, 16, 0.1, 'Rodinhas não ajudam no mato.', { rar: 'incomum' }),
  bag('caixaFerramentas', 'Caixa de ferramentas', 'caixa', 1.5, { f: 'handbag', k: 'toolbox', c: '#c8342a' }, 6, 0.1, 'Organiza e protege as ferramentas.', { rar: 'incomum', cond: 'durable', metal: true }),
]);
