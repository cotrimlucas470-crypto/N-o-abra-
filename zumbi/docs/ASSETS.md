# Assets: como trocar a arte

Toda a arte atual é **procedural**: desenhada por código na hora de carregar
(`src/game/assets/procedural/`). É provisória, mas o sistema foi feito para você trocar **qualquer peça**
por um PNG **sem mexer em código**, e para o jogo nunca quebrar por causa de arte.

## O jeito rápido (sem programar)

1. Coloque o PNG em `zumbi/public/assets/sprites/` (ou qualquer subpasta de `public/assets/`).
2. Abra `zumbi/public/assets/overrides.json` e registre o id do sprite:

```json
{
  "sprites": {
    "prop.car.red": "assets/sprites/carro_vermelho.png",
    "prop.tree.large.a": "assets/sprites/arvore_grande.png"
  },
  "patterns": {},
  "tiles": "assets/tiles/chao.png"
}
```

3. Pronto. O que tiver PNG usa o PNG; o resto continua procedural.
   Se um arquivo não carregar, o jogo avisa no console e usa o desenho procedural.

Chaves que começam com `_` são ignoradas (servem de comentário/exemplo).

## Regras do desenho

- **Visão de cima.** Luz vindo do **canto superior esquerdo**.
- **Orientação:** veículos olham para a **direita** (+x). Móveis têm o **fundo para cima** (encostado na parede norte).
- **Resolução livre:** o jogo escala o PNG para o tamanho do catálogo (tabela abaixo). Proporção igual à da
  tabela; para ficar nítido no celular, desenhe com **2× o tamanho** da tabela.
- **Fundo transparente.** **Sem sombra desenhada**: a sombra é gerada automaticamente a partir do seu PNG e
  segue o "sol" (vai mudar com o dia/noite).

## Personagem (folhas animadas)

`player.torso` (tronco, braços, cabeça: gira para a mira) e `player.legs` (pernas: giram para onde anda).
Cada um é **uma linha de 8 quadros quadrados**, olhando para a direita:
quadro 0 = parado; 1 a 7 = passada (os pés tocam o chão nos quadros 2 e 6).

```json
"player.torso": { "file": "assets/sprites/tronco.png", "frameWidth": 128, "frameHeight": 128 },
"player.legs":  { "file": "assets/sprites/pernas.png", "frameWidth": 128, "frameHeight": 128 }
```

## Chão (tileset)

Uma imagem com **4 colunas × 12 linhas de tiles de 64 px** (256 × 768), sem margem.
Cada linha é um tipo de chão (a ordem está em `src/game/world/MapTypes.ts → Ground`); as 4 colunas são variações
(a 1ª aparece mais, a 4ª é a mais rara, boa para rachaduras e manchas):

`0 grama · 1 grama escura · 2 terra · 3 cascalho · 4 asfalto · 5 calçada · 6 concreto · 7 estacionamento ·
8 piso de madeira · 9 cerâmica · 10 carpete · 11 piso de oficina`

## Texturas repetidas (faixas, telhados, cerca)

Chaves em `"patterns"`: `pattern.lane.dash`, `pattern.lane.double`, `pattern.crosswalk`, `pattern.curb`,
`pattern.stall`, `pattern.roof.shingle-a`, `pattern.roof.shingle-b`, `pattern.roof.flat`, `pattern.fence`.
Precisam repetir sem emenda (as bordas se encaixam). Mesmo tamanho do procedural (ver `procedural/patterns.ts`).

## Lista de ids

| Objeto | ids de sprite | tamanho no mundo (px) | camada |
|---|---|---|---|
| `car` | `prop.car.red`, `prop.car.blue`, `prop.car.white`, `prop.car.green`, `prop.car.gray` | 184 × 88 | object |
| `carWreck` | `prop.car.wreck` | 184 × 88 | object |
| `van` | `prop.van` | 222 × 100 | object |
| `bus` | `prop.bus` | 440 × 122 | object |
| `barricade` | `prop.barricade` | 150 × 30 | object |
| `concreteBarrier` | `prop.barrier` | 128 × 36 | object |
| `cone` | `prop.cone` | 28 × 28 | object |
| `lampPost` | `prop.lamp` | 100 × 30 | overhead |
| `hydrant` | `prop.hydrant` | 30 × 30 | object |
| `trashBags` | `prop.trashbags` | 66 × 54 | object |
| `dumpster` | `prop.dumpster` | 124 × 72 | object |
| `trashCan` | `prop.trashcan` | 36 × 36 | object |
| `bench` | `prop.bench` | 112 × 42 | object |
| `tire` | `prop.tire` | 38 × 38 | object |
| `tireStack` | `prop.tires` | 46 × 46 | object |
| `pallet` | `prop.pallet` | 78 × 78 | floor |
| `crate` | `prop.crate` | 54 × 54 | object |
| `box` | `prop.box` | 42 × 38 | object |
| `boxes` | `prop.boxes` | 74 × 64 | object |
| `drum` | `prop.drum` | 44 × 44 | object |
| `cart` | `prop.cart` | 62 × 44 | object |
| `treeLarge` | `prop.tree.large.a`, `prop.tree.large.b` | 210 × 210 | overhead |
| `treeSmall` | `prop.tree.small` | 140 × 140 | overhead |
| `bush` | `prop.bush.a`, `prop.bush.b` | 74 × 64 | object |
| `hedge` | `prop.hedge` | 128 × 42 | object |
| `bedDouble` | `prop.bed.double` | 128 × 152 | object |
| `bedSingle` | `prop.bed.single` | 82 × 140 | object |
| `sofa` | `prop.sofa` | 152 × 62 | object |
| `armchair` | `prop.armchair` | 66 × 62 | object |
| `coffeeTable` | `prop.coffeetable` | 92 × 52 | object |
| `tvStand` | `prop.tv` | 124 × 38 | object |
| `rug` | `prop.rug.a`, `prop.rug.b` | 176 × 120 | floor |
| `diningTable` | `prop.diningtable` | 150 × 122 | object |
| `kitchenCounter` | `prop.counter` | 164 × 46 | object |
| `fridge` | `prop.fridge` | 62 × 58 | object |
| `stove` | `prop.stove` | 62 × 56 | object |
| `toilet` | `prop.toilet` | 40 × 54 | object |
| `bathtub` | `prop.bathtub` | 152 × 74 | object |
| `bathSink` | `prop.bathsink` | 58 × 42 | object |
| `wardrobe` | `prop.wardrobe` | 112 × 46 | object |
| `nightstand` | `prop.nightstand` | 38 × 36 | object |
| `desk` | `prop.desk` | 112 × 58 | object |
| `chair` | `prop.chair` | 38 × 38 | object |
| `storeShelf` | `prop.shelf.store` | 282 × 54 | object |
| `checkout` | `prop.checkout` | 152 × 58 | object |
| `displayFridge` | `prop.fridge.display` | 194 × 58 | object |
| `workbench` | `prop.workbench` | 152 × 54 | object |
| `toolShelf` | `prop.toolshelf` | 132 × 42 | object |
| `cabinet` | `prop.cabinet` | 52 × 42 | object |
| `treeApple` | `prop.tree.apple` | 150 × 150 | overhead |
| `treeOrange` | `prop.tree.orange` | 150 × 150 | overhead |
| `treeMango` | `prop.tree.mango` | 230 × 230 | overhead |
| `treeLemon` | `prop.tree.lemon` | 120 × 120 | overhead |
| `treeGuava` | `prop.tree.guava` | 140 × 140 | overhead |
| `treeAvocado` | `prop.tree.avocado` | 210 × 210 | overhead |
| `treeJabuticaba` | `prop.tree.jabuticaba` | 130 × 130 | overhead |
| `treeBanana` | `prop.tree.banana` | 150 × 150 | overhead |
| `treeBroad` | `prop.tree.broad.a`, `prop.tree.broad.b` | 190 × 190 | overhead |
| `treeYoung` | `prop.tree.young` | 96 × 96 | overhead |
| `treePine` | `prop.tree.pine.a`, `prop.tree.pine.b` | 160 × 160 | overhead |
| `treeDead` | `prop.tree.dead.a`, `prop.tree.dead.b` | 150 × 150 | overhead |
| `treePalm` | `prop.tree.palm` | 170 × 170 | overhead |
| `bushBerry` | `prop.bush.berry` | 74 × 64 | object |
| `bushFlower` | `prop.bush.flower.a`, `prop.bush.flower.b` | 70 × 62 | object |
| `bushRound` | `prop.bush.round` | 60 × 56 | object |
| `rock` | `prop.rock.a`, `prop.rock.b` | 70 × 56 | object |
| `stump` | `prop.stump` | 50 × 50 | object |
| `fallenLog` | `prop.log` | 150 × 40 | object |
| `scrapPile` | `prop.scrap` | 90 × 70 | object |

| Decalque | ids de sprite | tamanho (px) |
|---|---|---|
| `blood` | `decal.blood.a`, `decal.blood.b`, `decal.blood.c` | 84 × 84 |
| `bloodTrail` | `decal.bloodtrail` | 150 × 42 |
| `oil` | `decal.oil` | 84 × 62 |
| `crack` | `decal.crack.a`, `decal.crack.b` | 132 × 70 |
| `leaves` | `decal.leaves.a`, `decal.leaves.b` | 96 × 96 |
| `paper` | `decal.paper.a`, `decal.paper.b` | 34 × 30 |
| `manhole` | `decal.manhole` | 58 × 58 |
| `drain` | `decal.drain` | 46 × 22 |
| `dirt` | `decal.dirt` | 128 × 104 |
| `doormat` | `decal.doormat` | 74 × 40 |
| `skid` | `decal.skid` | 210 × 44 |
| `debris` | `decal.debris` | 92 × 64 |
| `glass` | `decal.glass` | 62 × 52 |
| `treePit` | `decal.treepit` | 80 × 80 |
| `planks` | `decal.planks` | 60 × 60 |
| `grass` | `decal.grass.a`, `decal.grass.b`, `decal.grass.c` | 44 × 38 |
| `flowers` | `decal.flowers.red`, `.yellow`, `.white`, `.purple` | 52 × 46 |
| `pebbles` | `decal.pebbles` | 44 × 34 |
| `litter` | `decal.litter.a`, `decal.litter.b` | 56 × 44 |
| `weeds` | `decal.weeds.a`, `decal.weeds.b` | 70 × 56 |

### Frutas nas copas e recursos no chão

As frutíferas são desenhadas **sem fruta**; os frutos são uma camada por cima, do mesmo tamanho da árvore,
que muda conforme a colheita: `fruit.<tipo>` (carregada) e `fruit.<tipo>.few` (poucas), com
`<tipo>` = `apple`, `orange`, `mango`, `lemon`, `guava`, `avocado`, `jabuticaba`, `banana`, `berry`
(o último no arbusto de amoras). Sem fruta, some a camada.

Montes no chão (56 × 56): `res.branches` (galhos), `res.stones` (pedras), `res.mushrooms` (cogumelos),
`res.mushrooms.bad` (cogumelos venenosos: parecidos, com pintas).

Camadas: `floor` = no chão, pisável · `object` = sólido · `overhead` = acima do jogador (copa de árvore, braço de poste).

Objetos do telhado: `roof.ac` (62 × 52), `roof.vent` (30 × 30).

### Itens (ícones)

Todos 48 × 48 (aparecem com ~30 px no chão, levemente girados, e maiores no inventário). Fundo transparente;
uma sombra curta embaixo ajuda o item a "descolar" do chão.

O id é sempre `item.<id do catálogo>` (371 itens; a lista completa está em `src/game/items/catalog/`).
Exemplos: `item.agua`, `item.feijao`, `item.maca`, `item.manga`, `item.martelo`, `item.pistola9`,
`item.municao38`, `item.mochilaTrilha`, `item.atadura`, `item.radio`.

Os 15 itens originais têm desenho feito à mão (`procedural/items.ts`). Os outros são **paramétricos**
(`procedural/itemIcons/`): cada item diz a família do desenho e as cores no campo `iconSpec`
(lata, garrafa, fruta, ferramenta, arma, roupa, livro, remédio...), então item novo quase nunca precisa de
desenho novo. Um PNG no `overrides.json` substitui qualquer um.

Portas e portões são desenhados por código (retângulos na cor do material) e não têm id de sprite ainda.

## Como funciona por dentro (para programadores)

- O código nunca usa chave de textura direto: sempre `assets.ref('prop.car.red')` (`AssetRegistry`).
  O registro devolve o PNG substituto (`ovr:<id>`) se existir, senão o quadro do atlas procedural.
- A arte procedural é empacotada num **atlas** (`AtlasBuilder`): poucas texturas grandes em vez de centenas de
  pequenas, o que ajuda o celular.
- Para **acrescentar** um objeto: nova entrada em `world/PropCatalog.ts` + desenho em `procedural/props.ts`
  (ou só o PNG no overrides.json). O teste avisa se faltar desenho.
- Para **acrescentar** um item: linha no arquivo da categoria em `items/catalog/` com um `iconSpec` de
  família existente (ou desenho próprio em `procedural/items.ts`, ou só o PNG `item.<id>` no overrides.json).
  O teste avisa se algum item ficar sem desenho.

## Construções do jogador (v0.6.0)

Paredes, portas, janelas, cercas, tábuas pregadas, piso, telhado, móveis construídos, fogueira, fogão a
lenha, coletor de chuva e canteiro são desenhados **por código** em `src/game/world/render/StructureViews.ts`
(Phaser Graphics, com cor por material e estado: porta aberta, chama, nível da água, planta por fase).
Ainda não há id de sprite para trocar por PNG; quando houver arte, o caminho é dar a cada peça um id em
`build/StructureCatalog.ts` e desenhar pelo `AssetRegistry`, como os objetos do mapa.

Ícones novos de item seguem as famílias de `assets/procedural/itemIcons/` (ex.: tocha = `stick` com
`k: 'torch'`; pratos = `dish`; balde com água = `bucket`).
