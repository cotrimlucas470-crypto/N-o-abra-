/**
 * TABELAS DE LOOT: o que cada tipo de lugar costuma guardar.
 *
 * Pesos são relativos dentro da tabela; a raridade do item (catálogo) ainda
 * multiplica o peso — um item "raro" numa tabela onde faz sentido continua
 * raro, mas possível. `n` = quantidade quando sai.
 *
 * Regra de ouro: nada fora de lugar. Não há arma na geladeira nem remédio no
 * porta-luvas de caminhão de lixo. Tabelas novas entram aqui; quem escolhe a
 * tabela para cada recipiente/contexto é `rules.ts`.
 */
import type { LootEntry, LootTable } from './LootTypes';

const i = (item: string, w: number, n?: readonly [number, number]): LootEntry => (n ? { item, w, n } : { item, w });
const tag = (t: string, w: number, n?: readonly [number, number]): LootEntry => (n ? { tag: t, w, n } : { tag: t, w });

export const LOOT_TABLES = {
  // ------------------------------------------------------------------ cozinha
  'geladeira-casa': {
    rolls: [2, 6],
    empty: 0.12,
    wear: 'casa',
    stockAge: [0, 4],
    entries: [
      i('leiteFresco', 5), i('leiteCaixa', 4), i('queijo', 4), i('presunto', 4), i('ovos', 5, [2, 8]), i('iogurte', 4, [1, 4]),
      i('manteiga', 4), i('carneBovina', 3), i('frango', 3), i('linguica', 3), i('alface', 3), i('tomate', 4, [1, 4]),
      i('cenoura', 3, [1, 4]), i('cebola', 2, [1, 3]), i('limao', 3, [1, 4]), i('maca', 3, [1, 4]), i('laranja', 3, [1, 4]),
      i('banana', 2, [2, 6]), i('refrigerante', 4, [1, 3]), i('refrigerante2l', 3), i('cerveja', 3, [1, 4]), i('agua', 4, [1, 3]),
      i('sucoLitro', 3), i('marmita', 2), i('pizzaCongelada', 2), i('lasanhaCongelada', 2), i('sanduiche', 1), i('bolo', 1),
      i('geleia', 2), i('pastaAmendoim', 1),
    ],
  },
  'geladeira-restaurante': {
    rolls: [4, 9],
    empty: 0.15,
    wear: 'trabalho',
    stockAge: [0, 3],
    entries: [
      i('carneBovina', 6, [1, 3]), i('frango', 6, [1, 3]), i('linguica', 4, [1, 3]), i('peixe', 3), i('queijo', 5), i('presunto', 5),
      i('ovos', 6, [6, 12]), i('manteiga', 4), i('leiteCaixa', 4, [1, 2]), i('alface', 4, [1, 2]), i('tomate', 5, [2, 6]),
      i('cebola', 4, [2, 5]), i('batata', 4, [2, 6]), i('cenoura', 3, [2, 5]), i('refrigerante', 5, [2, 6]), i('refrigerante2l', 4, [1, 2]),
      i('sucoLitro', 3), i('cerveja', 3, [2, 6]), i('agua', 4, [2, 6]),
    ],
  },
  despensa: {
    rolls: [2, 6],
    empty: 0.12,
    wear: 'casa',
    entries: [
      tag('enlatado', 14), i('arroz', 6), i('feijaoCru', 5), i('macarrao', 6), i('miojo', 6, [1, 4]), i('farinhaTrigo', 3),
      i('farinhaMandioca', 3), i('fuba', 2), i('acucar', 4), i('sal', 3), i('cafePo', 4), i('oleoSoja', 4), i('azeite', 2),
      i('biscoito', 5), i('bolachaAgua', 4), i('cereal', 3), i('aveia', 2), i('achocolatado', 3), i('leitePo', 2), i('mel', 1),
      i('geleia', 2), i('pipocaMicro', 2), i('gelatinaPo', 2), i('chocolate', 2), i('farofaPronta', 2), i('racaoCao', 1),
      i('abridor', 3), i('faca', 2), i('prato', 2, [1, 4]), i('tigela', 2, [1, 3]), i('copo', 2, [1, 4]), i('caneca', 2),
      i('garfo', 2, [1, 4]), i('colher', 2, [1, 4]), i('conchaCozinha', 1), i('pilhaPratos', 2), i('garrafaTermica', 1),
      i('detergente', 3), i('fosforos', 3), i('vela', 2, [1, 4]), i('isqueiro', 1), i('sacoPlastico', 2, [2, 6]),
    ],
  },
  'despensa-restaurante': {
    rolls: [4, 9],
    empty: 0.15,
    wear: 'trabalho',
    entries: [
      i('arroz', 6, [1, 3]), i('feijaoCru', 5, [1, 3]), i('macarrao', 5, [1, 3]), i('farinhaTrigo', 4, [1, 2]), i('oleoSoja', 5, [1, 3]),
      i('sal', 4), i('acucar', 4), i('cafePo', 3), i('extratoTomate', 4, [2, 6]), tag('enlatado', 6, [1, 3]), i('refrigerante', 4, [4, 12]),
      i('panela', 2), i('frigideira', 2), i('faca', 3), i('facaCacador', 1), i('abridor', 2), i('detergente', 3), i('aguaSanitaria', 2),
      i('papelHigienico', 2, [2, 6]), i('sacoPlastico', 2, [4, 10]),
    ],
  },
  fogao: {
    rolls: [1, 2],
    empty: 0.35,
    wear: 'casa',
    entries: [i('panela', 5), i('frigideira', 5), i('panelaPressao', 3), i('chaleira', 3), i('conchaCozinha', 1), i('fosforos', 2), i('bolo', 0.5)],
  },
  // ------------------------------------------------------------------ casa
  'armario-casa': {
    rolls: [1, 4],
    empty: 0.18,
    wear: 'casa',
    entries: [
      i('vela', 5, [1, 5]), i('fosforos', 4), i('isqueiro', 2), i('pilhas', 5, [2, 6]), i('lanterna', 3), i('fita', 3), i('fitaIsolante', 2),
      i('cola', 2), i('chaveFenda', 3), i('martelo', 2), i('alicate', 2), i('estilete', 2), i('tesoura', 2), i('trena', 1), i('kitCostura', 2),
      i('extensao', 1), i('lampada', 2, [1, 3]), i('pregos', 2, [10, 40]), i('parafusos', 2, [10, 30]), i('barbante', 2), i('corda', 1),
      i('detergente', 2), i('aguaSanitaria', 2), i('sabaoBarra', 2), i('balde', 1), i('vassoura', 1), i('radio', 1), i('baralho', 1),
      i('livroCulinaria', 0.5), i('mapaCidade', 0.5),
    ],
  },
  'guarda-roupa': {
    rolls: [2, 6],
    empty: 0.1,
    wear: 'casa',
    entries: [
      i('camiseta', 8), i('camisetaBranca', 5), i('regata', 3), i('camisaSocial', 3), i('camisaFlanela', 2), i('moletom', 5),
      i('jaquetaJeans', 2), i('jaquetaCouro', 1), i('casacoInverno', 2), i('capaChuva', 1), i('calcaJeans', 7), i('calcaMoletom', 4),
      i('bermuda', 4), i('meias', 5, [1, 4]), i('tenis', 4), i('botaTrabalho', 1), i('chinelo', 3), i('sapatoSocial', 2), i('bone', 3),
      i('gorro', 2), i('luvasLa', 1), i('cachecol', 1), i('mochilaEscolar', 2), i('mochilaTrilha', 1), i('bolsaLateral', 2),
      i('bolsaEsportiva', 1), i('malaViagem', 1), i('cobertor', 3), i('lencol', 3), i('travesseiro', 2), i('toalha', 2),
      i('dinheiro', 2, [10, 150]), i('anelOuro', 0.6), i('colar', 0.6), i('relogioPulso', 0.6), i('fotografia', 1),
      i('caixaFerramentas', 0.5), i('mochilaMilitar', 0.5),
      // Arma guardada em casa: rara, mas acontece. Munição um pouco mais comum que a arma.
      i('revolver38', 3.5), i('municao38', 4, [4, 18]), i('pistola9', 1.5), i('municao9', 2, [5, 20]), i('carregador9', 0.8),
      i('espingarda12', 1.5), i('espingardaDupla', 1.5), i('cartucho12', 2.5, [2, 10]), i('rifle22', 1.5), i('municao22', 2, [10, 40]),
      i('rifleCaca', 0.8), i('municao308', 1, [3, 10]), i('revistaArmas', 1),
    ],
  },
  'criado-mudo': {
    rolls: [1, 3],
    empty: 0.25,
    wear: 'casa',
    entries: [
      i('analgesico', 4), i('calmante', 1), i('antialergico', 2), i('vitaminas', 1), i('livroRomance', 3), i('livroSuspense', 2),
      i('revista', 3), i('gibi', 1), i('diario', 1), i('fotografia', 2), i('carteira', 2), i('dinheiro', 2, [5, 60]),
      i('relogioDigital', 2), i('alianca', 0.8), i('lanterna', 2), i('pilhas', 3, [2, 4]), i('vela', 2, [1, 2]), i('isqueiro', 1),
      i('celular', 2), i('carregadorCelular', 2), i('chaveCasa', 1), i('bilhete', 1), i('baralho', 1), i('agua', 1),
      i('revolver38', 1.2), i('municao38', 1.5, [3, 12]), i('pistola9', 0.6), i('municao9', 0.8, [4, 12]),
    ],
  },
  banheiro: {
    rolls: [1, 5],
    empty: 0.12,
    wear: 'casa',
    entries: [
      i('atadura', 4, [1, 3]), i('gaze', 3, [1, 4]), i('curativoAdesivo', 5, [2, 10]), i('esparadrapo', 3), i('algodao', 3),
      i('alcool70', 4), i('alcoolGel', 3), i('aguaOxigenada', 3), i('iodo', 2), i('soroFisiologico', 1), i('analgesico', 5),
      i('antiInflamatorio', 3), i('antialergico', 2), i('remedioGripe', 3), i('pomada', 2), i('pinca', 2), i('tesoura', 1),
      i('termometro', 1), i('antibiotico', 0.8), i('sabonete', 5, [1, 3]), i('shampoo', 4), i('pastaDentes', 4), i('escovaDentes', 4, [1, 3]),
      i('papelHigienico', 5, [1, 4]), i('toalha', 2), i('luvasLatex', 1, [2, 6]),
    ],
  },
  escrivaninha: {
    rolls: [1, 4],
    empty: 0.2,
    wear: 'casa',
    entries: [
      i('documentos', 4), i('livroRomance', 2), i('livroCarpintaria', 0.6), i('livroMecanica', 0.6), i('livroEletronica', 0.6),
      i('livroAgricultura', 0.6), i('livroPrimeirosSocorros', 0.6), i('revista', 3), i('jornal', 2), i('mapaCidade', 1.5), i('bilhete', 2),
      i('fita', 2), i('cola', 2), i('tesoura', 2), i('estilete', 1), i('pilhas', 3, [2, 4]), i('carregadorCelular', 2), i('celular', 1),
      i('componentes', 1, [1, 4]), i('fioEletrico', 1), i('dinheiro', 1, [5, 50]), i('chaveCarro', 1), i('radioComunicador', 0.3),
    ],
  },
  rack: {
    rolls: [0, 3],
    empty: 0.3,
    wear: 'casa',
    entries: [
      i('pilhas', 4, [2, 4]), i('revista', 3), i('gibi', 2), i('livroRomance', 2), i('baralho', 2), i('carregadorCelular', 2),
      i('extensao', 2), i('fioEletrico', 1), i('componentes', 1, [1, 3]), i('placaCircuito', 1), i('radio', 1), i('vela', 1, [1, 3]),
      i('fotografia', 1), i('jornal', 1),
    ],
  },
  // ------------------------------------------------------------------ comércio
  'mercado-prateleira': {
    rolls: [3, 8],
    empty: 0.2,
    wear: 'novo',
    stockAge: [0, 5],
    entries: [
      tag('enlatado', 18, [1, 4]), i('arroz', 6, [1, 3]), i('feijaoCru', 5, [1, 3]), i('macarrao', 6, [1, 4]), i('miojo', 6, [2, 8]),
      i('farinhaTrigo', 3), i('farinhaMandioca', 3), i('acucar', 4, [1, 2]), i('sal', 3), i('cafePo', 4, [1, 3]), i('oleoSoja', 4, [1, 3]),
      i('biscoito', 6, [1, 4]), i('bolachaAgua', 5, [1, 4]), i('salgadinho', 5, [1, 4]), i('chocolate', 4, [1, 4]), i('balas', 3, [1, 3]),
      i('barraCereal', 3, [2, 6]), i('cereal', 3), i('aveia', 2), i('amendoim', 3, [1, 3]), i('pipocaMicro', 2), i('achocolatado', 3),
      i('leitePo', 2), i('mel', 1), i('geleia', 2), i('pastaAmendoim', 1), i('paoForma', 2), i('agua', 6, [2, 6]), i('aguaGalao', 1.5),
      i('refrigerante2l', 4), i('sucoCaixa', 3, [2, 6]), i('leiteCaixa', 3, [1, 3]), i('pilhas', 4, [4, 12]), i('vela', 3, [2, 8]),
      i('fosforos', 3, [1, 3]), i('isqueiro', 2), i('papelHigienico', 4, [2, 8]), i('sabonete', 3, [1, 4]), i('pastaDentes', 2),
      i('detergente', 3), i('aguaSanitaria', 3), i('sacoPlastico', 2, [5, 15]), i('racaoCao', 1), i('fita', 1), i('lampada', 1, [1, 3]),
    ],
  },
  'mercado-geladeira': {
    rolls: [3, 8],
    empty: 0.25,
    wear: 'novo',
    stockAge: [0, 3],
    entries: [
      i('agua', 8, [2, 8]), i('refrigerante', 7, [2, 8]), i('sucoCaixa', 4, [2, 6]), i('cerveja', 5, [2, 8]), i('energetico', 3, [1, 4]),
      i('isotonico', 3, [1, 3]), i('chaGelado', 3, [1, 3]), i('aguaCoco', 2, [1, 4]), i('leiteFresco', 3), i('iogurte', 4, [2, 6]),
      i('queijo', 3), i('presunto', 3), i('manteiga', 3), i('marmita', 2, [1, 3]), i('pizzaCongelada', 2), i('lasanhaCongelada', 2),
      i('carneBovina', 2), i('frango', 2), i('linguica', 2),
    ],
  },
  'estoque-mercado': {
    rolls: [2, 6],
    empty: 0.25,
    wear: 'novo',
    entries: [
      tag('enlatado', 10, [2, 6]), i('arroz', 4, [2, 4]), i('feijaoCru', 4, [2, 4]), i('macarrao', 4, [2, 6]), i('agua', 5, [4, 12]),
      i('aguaGalao', 2, [1, 2]), i('refrigerante', 4, [6, 12]), i('oleoSoja', 3, [2, 4]), i('acucar', 3, [2, 4]), i('papelHigienico', 3, [4, 12]),
      i('sacoPlastico', 2, [10, 20]), i('sacolaPlastica', 2, [5, 10]), i('pilhas', 2, [6, 12]), i('vela', 2, [4, 10]),
      i('lona', 0.5), i('corda', 0.5),
    ],
  },
  'caixa-registradora': {
    rolls: [1, 3],
    empty: 0.3,
    wear: 'novo',
    entries: [i('dinheiro', 10, [20, 300]), i('chocolate', 3, [1, 3]), i('balas', 3, [1, 3]), i('barraCereal', 2, [1, 4]), i('pilhas', 3, [2, 4]), i('isqueiro', 2), i('fosforos', 1), i('chaveCasa', 1), i('bilhete', 1), i('revolver38', 0.8), i('municao38', 1, [3, 10])],
  },
  'farmacia-prateleira': {
    rolls: [3, 8],
    empty: 0.3,
    wear: 'novo',
    entries: [
      i('atadura', 6, [1, 4]), i('gaze', 5, [2, 6]), i('curativoAdesivo', 5, [5, 20]), i('esparadrapo', 4), i('algodao', 4),
      i('alcool70', 5, [1, 2]), i('alcoolGel', 4), i('aguaOxigenada', 4), i('iodo', 3), i('soroFisiologico', 3, [1, 3]),
      i('analgesico', 7, [1, 3]), i('antiInflamatorio', 5, [1, 2]), i('antialergico', 4), i('remedioGripe', 5), i('vitaminas', 4),
      i('pomada', 4), i('antibiotico', 3), i('calmante', 1.5), i('termometro', 2), i('luvasLatex', 3, [5, 10]), i('mascara', 3, [5, 10]),
      i('seringa', 2, [2, 6]), i('tala', 1), i('kitSutura', 0.8), i('kitPrimeirosSocorros', 1), i('pinca', 1),
      i('sabonete', 3), i('shampoo', 3), i('pastaDentes', 3), i('escovaDentes', 3), i('papelHigienico', 2, [2, 4]), i('isotonico', 2),
      i('barraCereal', 2, [1, 3]), i('agua', 2, [1, 3]),
    ],
  },
  'farmacia-balcao': {
    rolls: [2, 5],
    empty: 0.35,
    wear: 'novo',
    entries: [i('antibiotico', 5), i('calmante', 3), i('kitSutura', 2), i('kitPrimeirosSocorros', 2), i('seringa', 3, [2, 6]), i('tala', 2), i('analgesico', 4, [1, 3]), i('antiInflamatorio', 3), i('dinheiro', 3, [20, 200]), i('jaleco', 1)],
  },
  'farmacia-estoque': {
    rolls: [2, 6],
    empty: 0.35,
    wear: 'novo',
    entries: [i('atadura', 5, [3, 8]), i('gaze', 5, [5, 12]), i('alcool70', 4, [2, 4]), i('curativoAdesivo', 4, [10, 30]), i('luvasLatex', 3, [10, 20]), i('mascara', 3, [10, 20]), i('soroFisiologico', 3, [2, 6]), i('analgesico', 4, [2, 5]), i('vitaminas', 3, [1, 3]), i('isotonico', 2, [2, 4])],
  },
  'loja-roupas': {
    rolls: [3, 7],
    empty: 0.2,
    wear: 'novo',
    entries: [
      i('camiseta', 8, [1, 3]), i('camisetaBranca', 5, [1, 3]), i('regata', 4), i('camisaSocial', 4), i('camisaFlanela', 3), i('moletom', 5),
      i('jaquetaJeans', 3), i('jaquetaCouro', 1.5), i('casacoInverno', 3), i('capaChuva', 2), i('calcaJeans', 7, [1, 2]), i('calcaMoletom', 4),
      i('calcaBrim', 2), i('bermuda', 4), i('meias', 5, [2, 6]), i('tenis', 5), i('botaTrabalho', 2), i('botaMilitar', 1), i('chinelo', 3),
      i('sapatoSocial', 2), i('luvasLa', 2), i('luvasCouro', 1), i('bone', 4), i('gorro', 3), i('cachecol', 2), i('mochilaEscolar', 3),
      i('mochilaTrilha', 1.5), i('bolsaLateral', 3), i('pochete', 3), i('bolsaEsportiva', 2), i('sacolaMercado', 2),
    ],
  },
  'estoque-roupas': {
    rolls: [2, 5],
    empty: 0.3,
    wear: 'novo',
    entries: [i('camiseta', 6, [2, 6]), i('calcaJeans', 5, [1, 3]), i('meias', 5, [4, 10]), i('moletom', 3, [1, 3]), i('tenis', 3), i('sacolaPlastica', 3, [5, 15]), i('kitCostura', 2), i('tesoura', 2), i('tecido', 3, [2, 6]), i('mochilaEscolar', 1)],
  },
  'armario-loja': {
    rolls: [1, 4],
    empty: 0.25,
    wear: 'trabalho',
    entries: [i('detergente', 4), i('aguaSanitaria', 4), i('papelHigienico', 4, [2, 6]), i('sacoPlastico', 3, [5, 10]), i('balde', 2), i('vassoura', 2), i('fita', 2), i('lanterna', 1), i('pilhas', 2, [2, 4]), i('dinheiro', 1, [10, 80]), i('documentos', 2), i('extensao', 1)],
  },
  // ------------------------------------------------------------------ oficina e galpão
  'oficina-prateleira': {
    rolls: [2, 6],
    empty: 0.15,
    wear: 'trabalho',
    entries: [
      i('chaveFenda', 5), i('chaveInglesa', 5), i('chaveRoda', 3), i('alicate', 4), i('alicateCorte', 2), i('martelo', 4), i('marreta', 1),
      i('serraArco', 2), i('lima', 2), i('furadeira', 1), i('bateriaFerramenta', 1), i('macaco', 1.5), i('peDeCabra', 1.5),
      i('parafusos', 5, [10, 50]), i('pregos', 3, [10, 40]), i('fitaIsolante', 4), i('fita', 3), i('oleoMotor', 4), i('pecasMotor', 3),
      i('velaIgnicao', 3, [1, 4]), i('mangueira', 1.5), i('lanterna', 2), i('luvasTrabalho', 3), i('oculosProtecao', 2), i('trapo', 4, [1, 5]),
      i('fioEletrico', 2), i('combustivel', 0.8), i('caixaFerramentas', 1), i('bateriaCarro', 0.8),
    ],
  },
  bancada: {
    rolls: [1, 4],
    empty: 0.15,
    wear: 'trabalho',
    entries: [i('chaveFenda', 5), i('alicate', 4), i('martelo', 4), i('estilete', 3), i('lima', 2), i('trena', 2), i('serrote', 2), i('parafusos', 5, [5, 30]), i('pregos', 5, [5, 30]), i('fitaIsolante', 3), i('cola', 3), i('colaMadeira', 1), i('componentes', 2, [1, 5]), i('arame', 2), i('trapo', 3, [1, 3]), i('luvasTrabalho', 2), i('lanterna', 1), i('multimetro', 0.5)],
  },
  'oficina-caixas': {
    rolls: [1, 5],
    empty: 0.25,
    wear: 'trabalho',
    entries: [i('pecasMotor', 5), i('velaIgnicao', 3, [2, 6]), i('oleoMotor', 4, [1, 2]), i('sucata', 5, [1, 4]), i('parafusos', 4, [20, 60]), i('borracha', 3), i('mangueira', 2), i('trapo', 4, [2, 6]), i('fioEletrico', 2), i('pneu', 1), i('combustivel', 0.6), i('chaveRoda', 1)],
  },
  'galpao-prateleira': {
    rolls: [2, 6],
    empty: 0.2,
    wear: 'trabalho',
    entries: [
      i('tabua', 6, [2, 4]), i('pregos', 6, [30, 100]), i('parafusos', 5, [30, 100]), i('dobradica', 2, [2, 4]), i('arame', 4, [1, 3]),
      i('corda', 4, [1, 2]), i('lona', 3), i('chapaMetal', 3, [1, 2]), i('sucata', 3, [2, 6]), i('cimento', 2), i('areia', 2),
      i('tijolo', 2, [4, 12]), i('tinta', 2), i('gesso', 1), i('telaArame', 1.5), i('arameFarpado', 1), i('corrente', 1.5), i('cadeado', 2),
      i('sacoVazio', 3, [3, 10]), i('fita', 3, [1, 2]), i('colaMadeira', 2), i('luvasTrabalho', 3), i('capaceteObra', 2),
      i('calcaBrim', 1), i('botaTrabalho', 1), i('picareta', 1), i('pa', 2), i('machado', 1), i('serrote', 2), i('marreta', 1),
      i('colherPedreiro', 2), i('gerador', 0.8), i('combustivel', 0.8), i('extensao', 1), i('facao', 1),
    ],
  },
  'galpao-caixas': {
    rolls: [1, 5],
    empty: 0.25,
    wear: 'trabalho',
    entries: [i('pregos', 5, [20, 80]), i('parafusos', 4, [20, 80]), i('sucata', 4, [2, 6]), i('trapo', 3, [2, 6]), i('tabua', 3, [1, 3]), i('arame', 2), i('corda', 2), i('lona', 1), i('sacoVazio', 3, [5, 12]), i('garrafaPet', 2, [2, 6]), i('garrafaVidro', 1, [1, 4]), i('fitaIsolante', 1)],
  },
  'escritorio-trabalho': {
    rolls: [1, 4],
    empty: 0.2,
    wear: 'trabalho',
    entries: [i('documentos', 5), i('mapaCidade', 2), i('mapaAnotado', 0.7), i('chaveCarro', 3), i('chaveCasa', 2), i('dinheiro', 3, [10, 150]), i('radio', 1), i('radioComunicador', 0.6), i('lanterna', 2), i('pilhas', 2, [2, 6]), i('cafePo', 2), i('cafeLata', 1), i('revistaArmas', 0.5), i('jornal', 2), i('bilhete', 1), i('revolver38', 1), i('municao38', 1.2, [3, 12])],
  },
  // ------------------------------------------------------------------ abrigo (base do jogador)
  'abrigo-caixas': {
    rolls: [1, 3],
    empty: 0.2,
    wear: 'casa',
    entries: [i('agua', 5, [1, 2]), i('feijao', 3), i('sardinha', 3), i('miojo', 3, [1, 3]), i('vela', 4, [2, 4]), i('fosforos', 3), i('pilhas', 3, [2, 4]), i('corda', 2), i('fita', 2), i('lona', 1), i('trapo', 3, [1, 4]), i('atadura', 2), i('sacoVazio', 2, [2, 6]), i('garrafaPet', 2, [1, 3])],
  },
  // ------------------------------------------------------------------ quintal, rua, lixo
  'caixote-quintal': {
    rolls: [0, 3],
    empty: 0.35,
    wear: 'rua',
    entries: [
      i('garrafaVidro', 3, [1, 4]), i('garrafaPet', 3, [1, 4]), i('sacoVazio', 3, [1, 4]), i('lona', 1), i('corda', 1), i('barbante', 2),
      i('tabua', 2), i('pregos', 2, [5, 20]), i('sucata', 2), i('pa', 1), i('enxada', 1), i('rastelo', 1), i('regador', 1), i('foice', 0.6),
      i('adubo', 1), i('fertilizante', 1), tag('semente', 3, [1, 3]), i('luvasTrabalho', 1), i('balde', 1), i('mangueira', 1), i('trapo', 2),
    ],
  },
  'lixo-casa': {
    rolls: [0, 3],
    empty: 0.35,
    wear: 'lixo',
    stockAge: [2, 8],
    entries: [i('garrafaPet', 5, [1, 3]), i('garrafaVazia', 3), i('garrafaVidro', 3), i('sacoPlastico', 4, [1, 4]), i('trapo', 3), i('jornal', 3), i('revista', 2), i('paoFrances', 2), i('banana', 1), i('maca', 1), i('cacoVidro', 2), i('pilhas', 1), i('camiseta', 1), i('meias', 1), i('chinelo', 1), i('lampada', 1)],
  },
  'lixo-comercial': {
    rolls: [1, 4],
    empty: 0.3,
    wear: 'lixo',
    stockAge: [2, 8],
    entries: [
      i('garrafaPet', 5, [1, 4]), i('garrafaVazia', 4, [1, 3]), i('garrafaVidro', 3, [1, 3]), i('sacoPlastico', 4, [2, 6]), i('sacoVazio', 2),
      i('trapo', 3), i('sucata', 2), i('cacoVidro', 2), i('tabua', 1), i('borracha', 1), i('paoFrances', 2, [1, 3]), i('sanduiche', 1),
      i('marmita', 1), i('tomate', 1), i('alface', 1), i('jornal', 2), i('revista', 1), i('pilhas', 1), i('carregadorCelular', 1),
      i('placaCircuito', 1), i('sacolaPlastica', 2), i('caneca', 0.5), i('prato', 0.5),
    ],
  },
  'lixo-rua': {
    rolls: [0, 2],
    empty: 0.45,
    wear: 'lixo',
    stockAge: [1, 6],
    entries: [i('garrafaPet', 5), i('garrafaVazia', 4), i('sacoPlastico', 3), i('jornal', 3), i('revista', 1), i('refrigerante', 1), i('salgadinho', 1), i('isqueiro', 0.6), i('pilhas', 0.6), i('trapo', 1), i('cacoVidro', 1)],
  },
  'tambor-industrial': {
    rolls: [0, 2],
    empty: 0.55,
    wear: 'rua',
    entries: [i('oleoMotor', 4), i('combustivel', 1), i('trapo', 3, [1, 3]), i('sucata', 4, [1, 3]), i('borracha', 2), i('mangueira', 1)],
  },
  // ------------------------------------------------------------------ veículos
  'porta-luvas': {
    rolls: [0, 3],
    empty: 0.25,
    wear: 'veiculo',
    entries: [
      i('documentos', 5), i('mapaCidade', 4), i('mapaAnotado', 0.6), i('lanterna', 3), i('pilhas', 2, [2, 4]), i('carregadorCelular', 3),
      i('celular', 1), i('balas', 2), i('chocolate', 2), i('barraCereal', 2), i('agua', 2), i('dinheiro', 3, [5, 80]), i('isqueiro', 2),
      i('canivete', 1.5), i('analgesico', 1), i('curativoAdesivo', 1, [1, 4]), i('chaveCasa', 1), i('oculosProtecao', 0.5),
      i('revolver38', 1.8), i('municao38', 2, [3, 12]), i('pistola9', 1), i('municao9', 1.2, [4, 12]), i('bilhete', 1),
    ],
  },
  'porta-malas': {
    rolls: [0, 4],
    empty: 0.3,
    wear: 'veiculo',
    stockAge: [0, 3],
    entries: [
      i('chaveRoda', 5), i('macaco', 4), i('pneu', 2), i('combustivel', 1.2), i('oleoMotor', 2), i('trapo', 2), i('lona', 1.5), i('corda', 1.5),
      i('cobertor', 1.5), i('agua', 3, [1, 4]), i('aguaGalao', 1), i('sacolaMercado', 2), i('sacolaPlastica', 2, [1, 3]), tag('enlatado', 2, [1, 3]),
      i('refrigerante2l', 1), i('mochilaEscolar', 1), i('mochilaTrilha', 0.6), i('bolsaEsportiva', 1), i('malaViagem', 1),
      i('caixaFerramentas', 1), i('chaveInglesa', 1), i('alicate', 1), i('tacoBeisebol', 0.6), i('cano', 0.5),
      i('kitPrimeirosSocorros', 0.6), i('camiseta', 1), i('tenis', 0.6), i('mochilaMilitar', 1), i('facao', 1.5),
      i('espingarda12', 2.6), i('cartucho12', 3.5, [2, 10]), i('rifle22', 0.6), i('municao22', 1.2, [10, 30]),
    ],
  },
  'porta-malas-destrocado': {
    rolls: [0, 2],
    empty: 0.5,
    wear: 'lixo',
    entries: [i('chaveRoda', 3), i('sucata', 4, [1, 3]), i('trapo', 3), i('borracha', 2), i('cacoVidro', 3), i('pneu', 1), i('oleoMotor', 1)],
  },
  // ------------------------------------------------------------------ chão (itens soltos pelo cômodo)
  'chao-casa': {
    rolls: [0, 2],
    empty: 0,
    wear: 'lixo',
    stockAge: [1, 5],
    entries: [i('revista', 3), i('jornal', 3), i('garrafaPet', 3), i('garrafaVazia', 2), i('camiseta', 2), i('meias', 2), i('chinelo', 1.5), i('bone', 1), i('mochilaEscolar', 0.6), i('sacolaPlastica', 1.5), i('livroRomance', 1), i('gibi', 1), i('baralho', 0.6), i('vela', 1), i('fotografia', 1), i('bilhete', 1.5), i('cacoVidro', 1), i('biscoito', 0.6), i('refrigerante', 0.6), i('rodo', 0.5)],
  },
  'chao-loja': {
    rolls: [0, 3],
    empty: 0,
    wear: 'novo',
    stockAge: [0, 4],
    entries: [tag('enlatado', 4), i('biscoito', 3), i('salgadinho', 3), i('balas', 2), i('agua', 2), i('refrigerante', 2), i('papelHigienico', 2), i('sacolaPlastica', 3), i('cacoVidro', 2), i('jornal', 1), i('dinheiro', 1, [2, 20])],
  },
  'chao-trabalho': {
    rolls: [0, 2],
    empty: 0,
    wear: 'trabalho',
    entries: [i('parafusos', 3, [2, 10]), i('pregos', 3, [2, 10]), i('sucata', 3), i('trapo', 3), i('chaveFenda', 1), i('fitaIsolante', 1), i('tabua', 1), i('garrafaPet', 1), i('luvasTrabalho', 0.6), i('cano', 0.6), i('barraFerro', 0.5)],
  },
  // ------------------------------------------------------------------ prontas para construções futuras
  'delegacia-armario': {
    rolls: [2, 6],
    empty: 0.3,
    wear: 'trabalho',
    entries: [i('pistola40', 3), i('pistola9', 3), i('espingarda12', 2), i('municao40', 5, [6, 24]), i('municao9', 5, [6, 30]), i('cartucho12', 4, [4, 12]), i('carregador40', 3), i('carregador9', 3), i('coleteBalistico', 2), i('cassetete', 4), i('radioComunicador', 4), i('lanternaCabeca', 2), i('uniformePolicial', 3), i('botaMilitar', 2), i('kitPrimeirosSocorros', 2)],
  },
  'hospital-armario': {
    rolls: [3, 7],
    empty: 0.3,
    wear: 'novo',
    entries: [i('kitSutura', 4), i('kitPrimeirosSocorros', 3), i('antibiotico', 5, [1, 3]), i('soroFisiologico', 5, [2, 6]), i('gaze', 5, [5, 15]), i('atadura', 5, [3, 8]), i('seringa', 4, [4, 12]), i('luvasLatex', 4, [10, 30]), i('mascara', 4, [10, 30]), i('tala', 3), i('termometro', 2), i('calmante', 3), i('iodo', 3), i('jaleco', 2), i('pinca', 2)],
  },
} as const satisfies Record<string, LootTable>;

export type LootTableId = keyof typeof LOOT_TABLES;

export function lootTable(id: string): LootTable | null {
  return (LOOT_TABLES as Record<string, LootTable>)[id] ?? null;
}
