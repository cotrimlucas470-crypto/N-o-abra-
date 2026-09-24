/**
 * RECEITAS de fabricação — só dados. Quem confere e executa é Crafting.ts.
 *
 * Um ingrediente aceita alternativas ("2 galhos OU 1 tábua") e pode pedir
 * unidades, doses (água, álcool) ou uma fração de um consumível medido
 * (sal, café, fita, gasolina). Ferramentas não são gastas, só desgastam.
 * Estação = o que precisa estar por perto: fogo (fogueira ou fogão com gás),
 * forno (fogão com gás) ou bancada.
 *
 * Receita nova = uma linha aqui. Item novo só de receita = `craftOnly` no
 * catálogo; o teste confere que todo `craftOnly` tem receita (ou ação).
 */
import type { StructureType } from '../build/StructureCatalog';
import type { SkillId } from '../skills/Skills';

export type Station = 'fogo' | 'forno' | 'bancada';

export type RecipeCat = 'construcao' | 'moveis' | 'cozinha' | 'bebidas' | 'agua' | 'fogo' | 'curativos' | 'materiais' | 'ferramentas' | 'armas';

export const RECIPE_CAT_LABEL: Record<RecipeCat, string> = {
  construcao: 'Construção',
  moveis: 'Móveis e horta',
  cozinha: 'Cozinha',
  bebidas: 'Bebidas',
  agua: 'Água',
  fogo: 'Fogo e luz',
  curativos: 'Curativos',
  materiais: 'Materiais',
  ferramentas: 'Ferramentas',
  armas: 'Armas',
};

export const STATION_LABEL: Record<Station, string> = {
  fogo: 'Fogo aceso por perto (fogueira ou fogão com gás)',
  forno: 'Forno (fogão com gás)',
  bancada: 'Bancada de trabalho por perto',
};

/** Uma forma de cumprir o ingrediente. */
export interface Opt {
  id?: string;
  tag?: string;
  /** Unidades (padrão 1). */
  n?: number;
  /** Em vez de unidades: doses (bebida, frasco). */
  dose?: number;
  /** Em vez de unidades: fração de um consumível medido (0..1). */
  charge?: number;
  /** Só água limpa (sem contaminação). */
  clean?: boolean;
  /** Recusa comida crua (salada não leva batata crua). */
  noRaw?: boolean;
}

export interface Ingredient {
  label: string;
  opts: readonly Opt[];
}

export interface ToolReq {
  label: string;
  /** Qualquer uma destas etiquetas serve. */
  tags: readonly string[];
  /** Usos gastos da durabilidade (padrão 1). */
  wear?: number;
}

export interface RecipeOut {
  id: string;
  n: number;
}

export interface Recipe {
  id: string;
  name: string;
  cat: RecipeCat;
  desc: string;
  inputs: readonly Ingredient[];
  tools?: readonly ToolReq[];
  station?: Station;
  out: readonly RecipeOut[];
  /** Monta uma estrutura no mundo (fogueira...) em vez de dar item. */
  structure?: StructureType;
  /** A estrutura nasce com a lenha dos ingredientes queimáveis. */
  fuelFromInputs?: boolean;
  /** A saída herda as doses do primeiro ingrediente (ferver a garrafa). */
  keepDoses?: boolean;
  minutes: number;
  skill?: { id: SkillId; xp: number; min?: number };
  /** Ícone na lista (id de item) quando o resultado não é item. */
  icon?: string;
}

// ------------------------------------------------------------------ atalhos

const id = (itemId: string, n = 1): Opt => ({ id: itemId, n });
const tag = (t: string, n = 1): Opt => ({ tag: t, n });
const need = (label: string, ...opts: Opt[]): Ingredient => ({ label, opts });
const water = (doses: number, clean = false): Ingredient => ({ label: `Água (${doses} ${doses > 1 ? 'doses' : 'dose'})`, opts: [{ tag: 'agua', dose: doses, ...(clean ? { clean: true } : {}) }] });
const tool = (label: string, ...tags: string[]): ToolReq => ({ label, tags });
const POT = tool('Panela ou frigideira', 'panela');
const BOIL = tool('Panela ou chaleira', 'ferver');
const KNIFE = tool('Faca ou lâmina', 'cortar', 'faca', 'afiado');
const HAMMER = tool('Martelo', 'martelar');
const out = (itemId: string, n = 1): RecipeOut => ({ id: itemId, n });
const TIE = need('Amarração', tag('barbante'), { tag: 'fita', charge: 0.15 }, id('arame'), id('corda'), id('trapo', 2));
const HANDLE = need('Cabo', id('galho'), id('rodo'), id('vassoura'), id('bambu'));
const build = (id: string, name: string, cat: 'construcao' | 'moveis', desc: string, inputs: Ingredient[], tools: ToolReq[], minutes: number, icon: string, xp = 5, skill: SkillId = 'carpintaria', structure = id as StructureType): Recipe => ({
  id,
  name,
  cat,
  desc,
  inputs,
  tools,
  out: [],
  structure,
  minutes,
  icon,
  skill: { id: skill, xp },
});
const PLANKS = (n: number) => need(`Tábuas (${n})`, id('tabua', n));
const NAILS = (n: number) => need(`Pregos (${n})`, id('pregos', n));
const MASON = tool('Colher de pedreiro', 'alvenaria');
const cook = (r: Omit<Recipe, 'cat' | 'skill'> & { xp?: number }): Recipe => ({ ...r, cat: 'cozinha', skill: { id: 'culinaria', xp: r.xp ?? 5 } });

export const RECIPES: readonly Recipe[] = [
  // ---------------------------------------------------------------- construção (modo construir)
  build('paredeMadeira', 'Parede de madeira', 'construcao', 'Na borda do tile em que você está, do lado para onde olha.', [PLANKS(3), NAILS(6)], [HAMMER], 30, 'tabua', 6),
  build('paredeTijolo', 'Parede de tijolo', 'construcao', 'Resiste muito mais. Tijolo, cimento, areia e água.', [need('Tijolos (6)', id('tijolo', 6)), need('Cimento (um pouco)', { id: 'cimento', charge: 0.15 }), need('Areia (um pouco)', { id: 'areia', charge: 0.15 }), water(2)], [MASON], 45, 'tijolo', 8),
  build('paredeMetal', 'Parede de chapa', 'construcao', 'Chapas parafusadas. A mais forte.', [need('Chapas de metal (2)', id('chapaMetal', 2)), need('Parafusos (10)', id('parafusos', 10))], [tool('Chave de fenda ou furadeira', 'parafusar')], 30, 'chapaMetal', 6, 'mecanica'),
  build('cercaMadeira', 'Cerca de madeira', 'construcao', 'Segura passagem, não segura olhar. Só ao ar livre.', [PLANKS(2), NAILS(4)], [HAMMER], 15, 'tabua', 3),
  build('portaMadeira', 'Porta de madeira', 'construcao', 'Abre e fecha. Zumbi não passa com ela fechada.', [PLANKS(4), NAILS(6), need('Dobradiças (2)', id('dobradica', 2))], [HAMMER], 40, 'dobradica', 8),
  build('janelaMadeira', 'Janela', 'construcao', 'Luz e vista, sem passagem.', [PLANKS(2), NAILS(4), need('Vidro ou plástico', id('vidroPlaca'), id('sacoPlastico', 4), id('lona'))], [HAMMER], 25, 'vidroPlaca', 5),
  build('piso', 'Piso de madeira', 'construcao', 'Assoalho no tile à frente.', [PLANKS(2), NAILS(4)], [HAMMER], 15, 'tabua', 3),
  build('telhado', 'Telhado', 'construcao', 'Cobre um tile: embaixo não chove e esquenta como dentro de casa.', [PLANKS(3), NAILS(6), need('Cobertura', id('telha', 4), id('lona'), id('chapaMetal'))], [HAMMER], 30, 'telha', 5),
  // ---------------------------------------------------------------- móveis e horta
  build('camaMadeira', 'Cama', 'moveis', 'Dormir numa cama rende muito mais que no chão.', [PLANKS(4), NAILS(8), need('Colchão', id('cobertor'), id('lencol', 2), id('tecido', 4), id('trapo', 8))], [HAMMER], 40, 'cobertor', 8),
  build('cadeiraMadeira', 'Cadeira', 'moveis', 'Sentar e descansar.', [PLANKS(2), NAILS(4)], [HAMMER], 15, 'cadeiraDobravel', 3),
  build('mesaMadeira', 'Mesa', 'moveis', 'Dá para deixar coisas em cima (25 kg).', [PLANKS(4), NAILS(6)], [HAMMER], 25, 'tabua', 5),
  build('bancadaMadeira', 'Bancada de trabalho', 'moveis', 'Libera as receitas de metal. Gaveta de 20 kg.', [PLANKS(6), NAILS(10)], [HAMMER, tool('Serrote', 'serrar')], 45, 'martelo', 8),
  build('caixote', 'Caixote', 'moveis', 'Guarda 40 kg.', [PLANKS(3), NAILS(6)], [HAMMER], 20, 'tabua', 4),
  build('estante', 'Estante', 'moveis', 'Guarda 60 kg.', [PLANKS(5), NAILS(8)], [HAMMER], 30, 'livroRomance', 6),
  build('fogaoLenha', 'Fogão a lenha', 'moveis', 'Fogo dentro de casa: aquece, cozinha e assa (forno).', [need('Tijolos (8)', id('tijolo', 8)), need('Chapa ou sucata', id('chapaMetal'), id('sucata', 6)), need('Cimento (um pouco)', { id: 'cimento', charge: 0.1 })], [MASON], 60, 'tijolo', 8),
  build('coletorChuva', 'Coletor de chuva', 'moveis', 'Balde com lona em funil: junta até 40 doses de chuva (ferva antes de beber).', [need('Balde', id('balde')), need('Lona', id('lona')), PLANKS(2), NAILS(4)], [HAMMER], 20, 'balde', 4),
  build('canteiro', 'Canteiro', 'moveis', 'Terra revolvida para plantar. Só na grama ou na terra.', [], [tool('Pá ou enxada', 'cavar', 'arar')], 20, 'enxada', 3, 'agricultura'),
  // ---------------------------------------------------------------- cozinha
  cook({ id: 'assarCarne', name: 'Carne assada', desc: 'Carne crua na brasa. Tira o risco e sacia mais.', inputs: [need('Carne bovina crua', id('carneBovina'))], station: 'fogo', out: [out('carneAssada')], minutes: 20 }),
  cook({ id: 'assarFrango', name: 'Frango assado', desc: 'Frango cru faz mal; assado, salva o dia.', inputs: [need('Frango cru', id('frango'))], station: 'fogo', out: [out('frangoAssado')], minutes: 30 }),
  cook({ id: 'assarLinguica', name: 'Linguiça assada', desc: 'No espeto, na brasa.', inputs: [need('Linguiça crua', id('linguica'))], station: 'fogo', out: [out('linguicaAssada')], minutes: 12 }),
  cook({ id: 'assarPeixe', name: 'Peixe assado', desc: 'Peixe fresco na brasa.', inputs: [need('Peixe cru', id('peixe'))], station: 'fogo', out: [out('peixeAssado')], minutes: 15 }),
  cook({ id: 'carneSeca', name: 'Carne seca', desc: 'Fatias finas com sal: dura meses sem geladeira.', inputs: [need('Carne bovina crua', id('carneBovina')), need('Sal (um pouco)', { tag: 'sal', charge: 0.1 })], tools: [KNIFE], out: [out('carneSeca')], minutes: 30, xp: 8 }),
  cook({ id: 'cozinharOvos', name: 'Ovos cozidos', desc: 'Dois ovos na água fervendo.', inputs: [need('Ovos (2)', id('ovos', 2)), water(1)], tools: [BOIL], station: 'fogo', out: [out('ovoCozido', 2)], minutes: 12 }),
  cook({ id: 'ovosMexidos', name: 'Ovos mexidos', desc: 'Frigideira quente, três ovos.', inputs: [need('Ovos (3)', id('ovos', 3))], tools: [POT], station: 'fogo', out: [out('ovosMexidos')], minutes: 6 }),
  cook({ id: 'cozinharBatata', name: 'Batata cozida', desc: 'Duas batatas na panela.', inputs: [need('Batatas (2)', id('batata', 2)), water(1)], tools: [BOIL], station: 'fogo', out: [out('batataCozida', 2)], minutes: 20 }),
  cook({ id: 'cozinharMandioca', name: 'Mandioca cozida', desc: 'Crua é perigosa. Cozida, derrete.', inputs: [need('Mandioca', id('mandioca')), water(1)], tools: [BOIL], station: 'fogo', out: [out('mandiocaCozida')], minutes: 30 }),
  cook({ id: 'cozinharArroz', name: 'Arroz cozido (4 porções)', desc: 'Um pacote de arroz rende quatro pratos.', inputs: [need('Arroz (1 kg)', id('arroz')), water(2)], tools: [POT], station: 'fogo', out: [out('arrozCozido', 4)], minutes: 25 }),
  cook({ id: 'cozinharFeijao', name: 'Feijão cozido (4 porções)', desc: 'Horas de panela. Na de pressão, bem menos.', inputs: [need('Feijão cru (1 kg)', id('feijaoCru')), water(4)], tools: [POT], station: 'fogo', out: [out('feijaoCozido', 4)], minutes: 120, xp: 8 }),
  cook({ id: 'cozinharMacarrao', name: 'Macarrão (2 porções)', desc: 'Água fervendo e sal, se tiver.', inputs: [need('Macarrão (500 g)', id('macarrao')), water(2)], tools: [BOIL], station: 'fogo', out: [out('macarraoCozido', 2)], minutes: 15 }),
  cook({ id: 'prepararMiojo', name: 'Miojo', desc: 'Três minutos, dizem.', inputs: [need('Macarrão instantâneo', id('miojo')), water(1)], tools: [BOIL], station: 'fogo', out: [out('miojoPronto')], minutes: 5, xp: 2 }),
  cook({ id: 'sopaLegumes', name: 'Sopa de legumes (2 porções)', desc: 'Qualquer verdura vira sopa.', inputs: [need('Verduras (2)', tag('verdura', 2)), water(2)], tools: [POT], station: 'fogo', out: [out('sopaLegumes', 2)], minutes: 30 }),
  cook({ id: 'esquentarSopa', name: 'Sopa quente', desc: 'Abre a lata e esquenta. Levanta o ânimo.', inputs: [need('Sopa em lata', id('sopaLata'))], tools: [POT, tool('Abridor ou faca', 'abridor')], station: 'fogo', out: [out('sopaQuente')], minutes: 5, xp: 2 }),
  cook({ id: 'polenta', name: 'Polenta (4 porções)', desc: 'Fubá e água, mexendo sem parar.', inputs: [need('Fubá (1 kg)', id('fuba')), water(3)], tools: [POT], station: 'fogo', out: [out('polenta', 4)], minutes: 40 }),
  cook({ id: 'mingau', name: 'Mingau de aveia (2 porções)', desc: 'Aveia e água quente.', inputs: [need('Aveia', id('aveia')), water(1)], tools: [POT], station: 'fogo', out: [out('mingau', 2)], minutes: 8 }),
  cook({ id: 'pipoca', name: 'Pipoca', desc: 'Na panela tampada.', inputs: [need('Pipoca de micro-ondas', id('pipocaMicro'))], tools: [POT], station: 'fogo', out: [out('pipoca')], minutes: 5, xp: 2 }),
  cook({ id: 'salada', name: 'Salada', desc: 'Verduras cruas picadas (batata e mandioca não).', inputs: [need('Verduras frescas (2)', { tag: 'verdura', n: 2, noRaw: true })], tools: [KNIFE], out: [out('salada')], minutes: 5, xp: 2 }),
  cook({ id: 'farofa', name: 'Farofa (3 porções)', desc: 'Farinha de mandioca tostada na manteiga.', inputs: [need('Farinha de mandioca', id('farinhaMandioca')), need('Manteiga ou óleo', id('manteiga'), { id: 'oleoSoja', charge: 0.1 }, { id: 'azeite', charge: 0.1 })], tools: [POT], station: 'fogo', out: [out('farofaCaseira', 3)], minutes: 10 }),
  cook({ id: 'paoCaseiro', name: 'Pão caseiro (2)', desc: 'Farinha, água e sal. Precisa de forno.', inputs: [need('Farinha de trigo (1 kg)', id('farinhaTrigo')), water(2), need('Sal (pitada)', { tag: 'sal', charge: 0.02 })], station: 'forno', out: [out('paoCaseiro', 2)], minutes: 60, xp: 8 }),
  cook({ id: 'assarPizza', name: 'Pizza assada', desc: 'Pizza congelada no forno.', inputs: [need('Pizza congelada', id('pizzaCongelada'))], station: 'forno', out: [out('pizzaAssada')], minutes: 20 }),
  cook({ id: 'assarLasanha', name: 'Lasanha', desc: 'Lasanha congelada no forno.', inputs: [need('Lasanha congelada', id('lasanhaCongelada'))], station: 'forno', out: [out('lasanhaPronta')], minutes: 45 }),
  cook({ id: 'boloFuba', name: 'Bolo de fubá', desc: 'Fubá, açúcar, ovos e forno.', inputs: [need('Fubá', id('fuba')), need('Açúcar (um terço)', { tag: 'acucar', charge: 0.3 }), need('Ovos (2)', id('ovos', 2)), water(1)], station: 'forno', out: [out('boloFuba')], minutes: 50, xp: 10 }),
  cook({ id: 'sanduiche', name: 'Sanduíche', desc: 'Pão com o que tiver.', inputs: [need('Pão', id('paoFrances', 2), id('paoForma'), id('paoCaseiro')), need('Recheio', id('queijo'), id('presunto'), id('carneAssada'), id('ovoCozido', 2))], out: [out('sanduiche')], minutes: 2, xp: 1 }),
  // ---------------------------------------------------------------- bebidas
  { id: 'cafe', name: 'Café', cat: 'bebidas', desc: 'Água fervendo no pó. Espanta o sono.', inputs: [need('Café em pó (uma colherada)', { tag: 'cafe', charge: 0.05 }), water(1), need('Caneca', id('caneca'))], tools: [BOIL], station: 'fogo', out: [out('cafe')], minutes: 5, skill: { id: 'culinaria', xp: 1 } },
  { id: 'cha', name: 'Chá de ervas', desc: 'Erva-cidreira na água quente. Acalma.', cat: 'bebidas', inputs: [need('Ervas', id('ervas')), water(1), need('Caneca', id('caneca'))], tools: [BOIL], station: 'fogo', out: [out('cha')], minutes: 5, skill: { id: 'culinaria', xp: 1 } },
  { id: 'sucoNatural', name: 'Suco natural', desc: 'Três frutas espremidas com água limpa.', cat: 'bebidas', inputs: [need('Frutas (3)', tag('fruta', 3)), water(2, true), need('Garrafa vazia', id('garrafaPet'), id('garrafaVazia'), id('garrafaVidro'))], out: [out('sucoNatural')], minutes: 4, skill: { id: 'culinaria', xp: 1 } },
  // ---------------------------------------------------------------- água
  { id: 'ferverAgua', name: 'Ferver água suja', desc: 'Dez minutos fervendo e a água presta.', cat: 'agua', inputs: [need('Garrafa com água suja', id('aguaSuja'))], tools: [BOIL], station: 'fogo', out: [out('agua')], keepDoses: true, minutes: 10 },
  // ---------------------------------------------------------------- fogo e luz
  { id: 'fogueira', name: 'Fogueira', desc: 'Calor, luz, cozinha. Só ao ar livre. A chuva apaga fogo fraco.', cat: 'fogo', inputs: [need('Lenha', id('lenha', 2), id('galho', 4), id('tabua', 2), id('tora'))], out: [], structure: 'fogueira', fuelFromInputs: true, minutes: 10 },
  { id: 'tocha', name: 'Tocha', desc: 'Pano embebido num cabo. Acenda como vela; queima em hora e meia.', cat: 'fogo', inputs: [HANDLE, need('Trapo', id('trapo')), need('Combustível', { tag: 'alcool', dose: 1 }, { tag: 'oleo', charge: 0.1 }, { tag: 'gasolina', charge: 0.05 })], out: [out('tocha')], minutes: 3 },
  // ---------------------------------------------------------------- curativos
  { id: 'ataduraFervida', name: 'Atadura (fervida)', desc: 'Trapos fervidos viram atadura limpa.', cat: 'curativos', inputs: [need('Trapos (2)', id('trapo', 2)), water(1)], tools: [BOIL], station: 'fogo', out: [out('ataduraImprovisada')], minutes: 10, skill: { id: 'medicina', xp: 3 } },
  { id: 'ataduraAlcool', name: 'Atadura (desinfetada)', desc: 'Trapos embebidos em álcool ou antisséptico.', cat: 'curativos', inputs: [need('Trapos (2)', id('trapo', 2)), need('Desinfetante (1 dose)', { tag: 'desinfetante', dose: 1 })], out: [out('ataduraImprovisada')], minutes: 3, skill: { id: 'medicina', xp: 3 } },
  { id: 'lavarAtadura', name: 'Lavar atadura usada', desc: 'Ferver a atadura suja de sangue: volta a servir.', cat: 'curativos', inputs: [need('Atadura usada', id('ataduraSuja')), water(1)], tools: [BOIL], station: 'fogo', out: [out('ataduraImprovisada')], minutes: 10, skill: { id: 'medicina', xp: 2 } },
  { id: 'talaImprovisada', name: 'Tala improvisada', desc: 'Madeira reta amarrada: imobiliza fratura.', cat: 'curativos', inputs: [need('Madeira reta', id('galho', 2), id('tabua'), id('bambu')), TIE], out: [out('talaImprovisada')], minutes: 5, skill: { id: 'medicina', xp: 3 } },
  // ---------------------------------------------------------------- materiais
  { id: 'serrarTora', name: 'Serrar tora em tábuas', desc: 'Uma tora vira três tábuas.', cat: 'materiais', inputs: [need('Tora', id('tora'))], tools: [tool('Serrote', 'serrar-madeira')], out: [out('tabua', 3)], minutes: 30, skill: { id: 'carpintaria', xp: 8 } },
  { id: 'lenhaTora', name: 'Rachar tora em lenha', desc: 'Machado na tora: cinco achas de lenha.', cat: 'materiais', inputs: [need('Tora', id('tora'))], tools: [tool('Machado', 'cortar-lenha')], out: [out('lenha', 5)], minutes: 25, skill: { id: 'carpintaria', xp: 4 } },
  { id: 'lenhaTabua', name: 'Lenha de tábua', desc: 'Tábua quebrada em pedaços para o fogo.', cat: 'materiais', inputs: [need('Tábua', id('tabua'))], tools: [tool('Machado ou serrote', 'cortar-lenha', 'serrar')], out: [out('lenha')], minutes: 5, skill: { id: 'carpintaria', xp: 1 } },
  { id: 'barbante', name: 'Barbante de capim', desc: 'Capim seco trançado.', cat: 'materiais', inputs: [need('Capim seco (5)', id('capim', 5))], out: [out('barbante')], minutes: 10, skill: { id: 'costura', xp: 2 } },
  { id: 'cordaBarbante', name: 'Corda trançada', desc: 'Quatro barbantes viram uma corda.', cat: 'materiais', inputs: [need('Barbante (4)', id('barbante', 4))], out: [out('corda')], minutes: 15, skill: { id: 'costura', xp: 3 } },
  { id: 'cordaLencol', name: 'Corda de lençol', desc: 'Lençol cortado em tiras e trançado.', cat: 'materiais', inputs: [need('Lençol', id('lencol'))], tools: [tool('Tesoura ou faca', 'cortar-tecido', 'cortar')], out: [out('corda')], minutes: 8, skill: { id: 'costura', xp: 2 } },
  { id: 'pregosSucata', name: 'Pregos de sucata', cat: 'materiais', desc: 'Sucata cortada e batida em pregos.', inputs: [need('Sucata', id('sucata'))], tools: [tool('Alicate', 'alicate', 'cortar-arame'), HAMMER], station: 'bancada', out: [out('pregos', 12)], minutes: 10, skill: { id: 'mecanica', xp: 2 } },
  { id: 'chapaSucata', name: 'Chapa de sucata', cat: 'materiais', desc: 'Cinco sucatas marteladas numa chapa.', inputs: [need('Sucata (5)', id('sucata', 5))], tools: [HAMMER], station: 'bancada', out: [out('chapaMetal')], minutes: 30, skill: { id: 'mecanica', xp: 4 } },
  { id: 'dobradicaSucata', name: 'Dobradiça de sucata', cat: 'materiais', desc: 'Para porta nova.', inputs: [need('Sucata (2)', id('sucata', 2))], tools: [HAMMER, tool('Alicate', 'alicate')], station: 'bancada', out: [out('dobradica')], minutes: 15, skill: { id: 'mecanica', xp: 3 } },
  { id: 'lascarPedra', name: 'Lascar pedra', desc: 'Pedra batendo em pedra: lascas afiadas.', cat: 'materiais', inputs: [need('Pedras (2)', id('pedra', 2))], out: [out('pedraLasca', 3)], minutes: 5 },
  // ---------------------------------------------------------------- ferramentas
  { id: 'facaPedra', name: 'Faca de pedra', desc: 'Lasca afiada com cabo amarrado.', cat: 'ferramentas', inputs: [need('Lasca de pedra', id('pedraLasca')), need('Cabo', id('galho')), TIE], out: [out('facaPedra')], minutes: 10, skill: { id: 'carpintaria', xp: 3 } },
  { id: 'marteloPedra', name: 'Martelo de pedra', desc: 'Pedra amarrada num galho.', cat: 'ferramentas', inputs: [need('Pedra', id('pedra')), need('Cabo', id('galho')), TIE], out: [out('marteloPedra')], minutes: 10, skill: { id: 'carpintaria', xp: 3 } },
  { id: 'machadoPedra', name: 'Machado de pedra', desc: 'Duas lascas firmes num cabo.', cat: 'ferramentas', inputs: [need('Lascas de pedra (2)', id('pedraLasca', 2)), need('Cabo', id('galho')), need('Corda ou barbante', id('corda'), id('barbante', 2))], out: [out('machadoPedra')], minutes: 15, skill: { id: 'carpintaria', xp: 4 } },
  // ---------------------------------------------------------------- armas
  { id: 'lancaMadeira', name: 'Lança de madeira', desc: 'Cabo com a ponta afiada.', cat: 'armas', inputs: [HANDLE], tools: [KNIFE], out: [out('lancaMadeira')], minutes: 10, skill: { id: 'carpintaria', xp: 2 } },
  { id: 'lancaImprovisada', name: 'Lança improvisada', desc: 'Faca amarrada na ponta de um cabo.', cat: 'armas', inputs: [HANDLE, need('Lâmina', tag('faca'), id('facaPedra'), id('estilete')), TIE], out: [out('lancaImprovisada')], minutes: 10, skill: { id: 'carpintaria', xp: 3 } },
  { id: 'tacoPregos', name: 'Taco com pregos', desc: 'Pregos atravessados no taco.', cat: 'armas', inputs: [need('Taco de beisebol', id('tacoBeisebol')), need('Pregos (6)', id('pregos', 6))], tools: [HAMMER], out: [out('tacoPregos')], minutes: 10, skill: { id: 'carpintaria', xp: 3 } },
  { id: 'tabuaPregos', name: 'Tábua com pregos', desc: 'Tábua cravejada. Pesada e eficiente.', cat: 'armas', inputs: [need('Tábua', id('tabua')), need('Pregos (5)', id('pregos', 5))], tools: [HAMMER], out: [out('tabuaPregos')], minutes: 8, skill: { id: 'carpintaria', xp: 3 } },
];

export const RECIPE_BY_ID: ReadonlyMap<string, Recipe> = new Map(RECIPES.map((r) => [r.id, r]));

/** Receitas em que o item é o primeiro ingrediente (ação COZINHAR/FERVER no item). */
export function recipesStartingWith(defId: string): Recipe[] {
  return RECIPES.filter((r) => r.inputs[0]?.opts.some((o) => o.id === defId));
}
