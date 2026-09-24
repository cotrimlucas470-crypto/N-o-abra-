# Arquitetura

Objetivo: dá para trabalhar meses neste código sem ele virar uma bola de neve.
Regras que sustentam isso:

1. **Lógica pura separada do Phaser.** Tudo que é regra (movimento, fôlego, mapa, colisão, joystick, layout)
   é TypeScript puro, testado em `tests/`. O Phaser só desenha e simula a física.
2. **Dados, não código.** Mapa, objetos, plantas de casas, layout dos botões e substituição de arte são dados.
   Conteúdo novo quase nunca exige mexer em sistemas.
3. **Sistemas conversam por eventos** (`core/EventBus.ts`), sem se conhecerem.
   Ex.: o passo do personagem emite `player:footstep` e a porta emite `world:noise`; o sistema de ruído
   (etapa 9) vai só escutar.
4. **Nada de número mágico espalhado.** Ajustes em `config/`.
5. **Nunca apagar save sem confirmação**: `save/SaveGame.ts` guarda o anterior em `.bak` e arquiva o jogo
   antigo em `.old` ao começar outro.
6. **Mapa × estado.** O mapa (`MapData`) é determinístico e não muda em jogo; o que muda (porta aberta,
   item pego, item largado) é estado (`sim/WorldState.ts`). O save guarda só as diferenças.

## Camadas

```
config/     números e OPÇÕES DE MUNDO (Sandbox.ts) — tudo que ajusta uma partida
core/       puro: eventos, aleatório com semente, armazenamento, matemática, serviços
sim/        puro: relógio do jogo, chunks, ESTADO do mundo (portas, itens no chão, recipientes, natureza)
items/      puro: catálogo de itens (catalog/), condição/estado, recipiente por peso, inventário do jogador
loot/       puro: recipientes do mapa, tabelas de loot por lugar, geração preguiçosa e persistente
nature/     puro: frutíferas e recursos naturais que se renovam com o tempo do jogo
interaction/ puro: interação por provedores (portas, itens, recipientes, natureza, janelas, carros,
            água, construções, demolição) + ações de item por registro (itemActions/)
survival/   puro: corpo, efeitos, sono, perigos, laço da sobrevivência
health/     puro: ferimentos e tratamentos por parte do corpo
combat/     puro: golpe e tiro, alvos destrutíveis
vehicles/   puro: estado dos carros
crafting/   puro: receitas (dados), conferir/gastar/entregar, estações e modo construir
build/      puro: construções do jogador (estado, encaixe, fogo, horta, coletor, vãos em paredes do mapa)
skills/     puro: habilidades
save/       save no aparelho (backup e arquivo; nunca apaga sem confirmar)
world/      dados do mundo: formato do mapa, catálogos, plantas, cidade, colisão,
            navegação/visão (nav/), WorldModel; e o desenho do mundo (render/)
entities/   jogador (lógica pura + parte Phaser)
input/      intenção única do jogador; teclado/mouse; toque
systems/    câmera, tela/DPR, tela cheia
scenes/     Boot → Preload → Título → Jogo (+ HUD e, com ?debug, Debug)
ui/         painel de status, avisos, botões, ícones
debug/      ferramentas de debug (só com ?debug)
```

## Fluxo de cenas

```
Boot → Preload → Title ──JOGAR──→ Game
                                  ├─ launch → Hud   (por cima)
                                  └─ launch → Debug (por cima de tudo, só com ?debug)
```

- **Preload**: lê `assets/overrides.json`, carrega PNGs substitutos e gera a arte procedural do resto
  (num atlas único, para economizar GPU).
- **Game**: gera a cidade (`buildCity` com as opções de mundo), monta o `WorldModel`, desenha em chunks,
  cria o jogador, a câmera, o relógio e a física.
- **Hud**: status, relógio, avisos, controles de toque, pausa. Trabalha em **px CSS** (câmera com zoom = DPR).

## Quadro a quadro

```
entrada (toque/teclado) ─→ InputState ─→ resolveIntent() ─→ Player.update()   [antes da física]
                                        relógio do jogo avança
                                                            física Arcade (passos fixos de 1/120 s)
POST_UPDATE ─→ Player.syncVisuals() → CameraDirector.update() → região atual →
               WorldRenderer.update() (carga/descarga de chunks, recorte, copas, telhados) →
               DoorViews.update() (animação) → alvo de interação (12×/s) → destaque → debug
```

- **Física com passo fixo de 1/120 s**: em FPS baixo a física dá vários passos pequenos, então o personagem
  nunca atravessa parede e o jogo não fica em câmera lenta. Em telas de 120 Hz é um passo por quadro.
- **Toque sem atraso**: os joysticks escrevem a intenção no próprio evento de toque.

## Mundo: dados × desenho

```
buildCity(opções) ─→ MapData (dados puros, determinístico pela semente)
        │
        ▼
WorldModel ── chunkify (corta faixas/cercas longas) ── ChunkIndex (conteúdo por chunk)
        │       NavGrid (caminhada, 32 px, dinâmica) ── SightGrid (visão, 16 px)
        ▼
WorldRenderer ── chão: 1 camada de tiles na GPU para o mundo inteiro
              └─ chunks perto da câmera: objetos, sombras, telhados, colisores (criados e destruídos)
```

- **Chunk** = 16×16 tiles (1024 px). Carrega o que está a até ¾ de chunk da tela; só descarrega depois de
  1,5 chunk (histerese). No máximo 2 chunks criados por quadro; teleporte e início carregam tudo de uma vez.
- **Cidade** = grade de setores de 72×56 tiles com a mesma malha (avenida, rua, becos). Ver
  `districts/SectorLayout.ts`. O setor inicial fica no centro; os outros são gerados por zona
  (`SectorBlocks.ts`) a partir das plantas (`buildings/templates.ts`).
- **Ids estáveis** (`tipo@x,y`, `porta@x,y`, `item:tipo@x,y`) em todo objeto: o estado do mundo e o
  save se referem a eles.

| Arquivo | Papel |
|---|---|
| `MapTypes.ts` | formato do mapa (só dados) |
| `MapBuilder.ts` | montar mapas em tiles, com plantas giradas/espelhadas |
| `districts/CityGenerator.ts` | plano da cidade (zonas, nomes), bordas do mundo |
| `districts/SectorBuilder.ts` | MapBuilder em coordenadas locais de um setor |
| `districts/SectorRoads.ts` | malha comum de vias e mobiliário urbano |
| `districts/SectorBlocks.ts` | quarteirões residencial, comercial, industrial, parque |
| `districts/StarterDistrict.ts` | setor inicial (feito à mão) |
| `districts/Ambience.ts` | camada de ambiente (árvores variadas, arbustos, pedras, grama, flores, lixo, recursos) por cima do mapa pronto |
| `buildings/templates.ts` | plantas: casas, abrigo, mercadinho, lojas, oficina, galpão |
| `PropCatalog.ts` / `DecalCatalog.ts` | objetos: tamanho, colisão, camada, sombra |
| `collision.ts` | geometria de colisão pura (física **e** testes) |
| `WorldModel.ts`, `ChunkIndex.ts`, `chunkify.ts` | mundo como dado, por chunk |
| `nav/NavGrid.ts`, `nav/SightGrid.ts`, `nav/Pathfinder.ts` | caminhada, visão, rotas A\* |
| `render/WorldRenderer.ts` | desenho e colisão em chunks |
| `render/RoofSystem.ts` | telhados somem ao entrar; aviso de entrada/saída |
| `render/ShadowSystem.ts` | sombras por "sol"; pronto para dia/noite |
| `render/SpatialCuller.ts` | esconde o que está fora da tela |
| `doors.ts` | geometria pura das portas (vão, folhas, dobradiças) |
| `render/DoorViews.ts` | folhas/portões animados, colisão da porta fechada, fachada na beirada do telhado |
| `render/ItemViews.ts` | ícones dos itens no chão, por chunk |
| `render/NatureViews.ts` | frutas nas copas (cheia / poucas / nenhuma) e montes de galhos, pedras e cogumelos |
| `render/InteractionHighlight.ts` | destaque pulsante no alvo de interação |

## Interação, itens e estado do mundo

```
MapData.doors / MapData.items ──→ WorldState (sim/) ── porta fechada → NavGrid + SightGrid
                                     │   itens por chunk; serialize()/restore() com diferenças
                                     │ onChange
                                     ▼
                     DoorViews / ItemViews (Phaser, por chunk, via WorldRenderer.onChunk)

InteractionSystem ── provedores: DoorInteractions, ItemInteractions (…armários, carros, bancadas)
     │ scan(jogador) 12×/s → alvo → session.interaction → botão/aviso do HUD + destaque no mundo
     │ perform()  ← botão Interagir / tecla E (evento input:interact)
     ▼
PlayerInventory (items/) ← pegar;  painel do HUD → inventory:drop → largar aos pés
```

- Coisa nova interativa = um provedor novo (`collect()` oferece candidatos com distância e ação).
- Conteúdo dinâmico por chunk (portas, itens; depois zumbis, cadáveres) se inscreve em
  `WorldRenderer.onChunk()` e cria/destrói os próprios objetos junto com o chunk.

## Itens, loot e natureza (v0.5.0)

```
items/catalog/*.ts ──→ ItemCatalog (371 itens, 16 categorias; id, peso, volume, pilha, raridade,
                        perfil de condição, propriedades por tipo, ícone paramétrico, etiquetas)
items/condition.ts ──→ ItemState {c, born, exp, dose, open, ch, f} → frescor, validade, desgaste,
                        carga, doses, sujo/molhado/enferrujado... e o EFEITO real (comer, beber, curar)

MapData.props ─(loot/containers.ts)─→ ContainerRef (geladeira, armário, porta-malas...) + contexto
               (loot/rules.ts: prédio + cômodo + zona) ─→ tabela (loot/tables.ts)
LootSystem: ao abrir pela 1ª vez gera com Random(semente:loot:id) → o conteúdo é sempre o mesmo
            sem precisar salvar; depois de mexer, o save guarda o recipiente inteiro.
            Itens soltos no chão também saem de tabela (uma vez, na criação do mundo).

MapData.props (frutíferas) / MapData.resources ─→ NatureState: quantos frutos/galhos há AGORA
            calculado pelo relógio do jogo na hora de ler (sem timer global, sem "spawn").
```

- **Item novo** = uma linha em `items/catalog/<categoria>.ts` com `iconSpec` de uma família existente
  (`assets/procedural/itemIcons/`). Desenho à mão opcional em `procedural/items.ts` tem prioridade.
- **Lugar novo** (hospital, delegacia...) = plantas + regra em `loot/rules.ts`; as tabelas já existem.
- **Recipiente novo** = entrada em `CONTAINER_DEFS` + `PROP_CONTAINERS` (qual objeto do mapa e onde).
- Quantidade, raridade, "já saqueado" e envelhecimento do mundo vêm de `Sandbox.loot`; frutas e
  densidade da natureza de `Sandbox.nature`.
- A camada de ambiente é marcada `ambient: true` e fica fora da impressão digital do mapa expandido.
- Save do mundo v2 = v1 + `loot` (revistados + recipientes mexidos) + `nature` (colheitas); lê saves v1.

**Testes de integridade**: para várias cidades, confirmam que todo cômodo é alcançável pelo corpo do
jogador **e** pela grade de navegação dos zumbis, que nenhuma porta está bloqueada e que nenhum móvel
atravessa parede.

## Opções de mundo (sandbox)

`config/Sandbox.ts` é o painel central de ajuste de uma partida (tamanho da cidade, duração do dia,
multiplicadores...). Cada sistema novo acrescenta a sua seção com faixa válida (`sanitizeSandbox`), e o
save guardará as opções junto com o mundo.

## Debug (`?debug`)

`scenes/DebugScene.ts` + `debug/`: colisões, navegação, chunks, alvo (visão + rota), mapa com teleporte,
hora, velocidade do tempo, números, portas, ruído, gerar item, trancar porta, **loot** (recipientes:
azul = intacto, amarelo = revistado, cinza = vazio; barras de colheita) e **Dia +1**. Cada fase acrescenta
suas camadas.

## Pronto para as próximas etapas

| Etapa | Onde encaixa |
|---|---|
| 2 Controles | `ControlsLayout` já é dado (âncora + deslocamento + tamanho) e é salvo/carregado; botões novos só entram na lista |
| 3 Inventário | `PlayerInventory.containers` (mochila, roupas com bolsos); `ItemContainer` por peso |
| 13 Medicina, 14 Roupas | `MedProps`, `WearProps` (slot, isolamento, proteção contra mordida/arranhão, bolsos) já no catálogo |
| 15/16 Crafting e bancadas | etiquetas (`tags`) e `craftOnly` (itens que só saem de receita); ferramentas com `ToolProps.uses` |
| 18/19 Agricultura e água | `SeedProps`, `NatureState` (regrowth), bebida com doses e garrafa vazia que sobra |
| 6 Sobrevivência | `GameClock` + `PlayerStats` + `SpeedModifiers`; comida/bebida já têm kcal, fome, sede e efeito |
| 7–9 Zumbis, percepção, ruído | `WorldModel` (nav, sight, chunks), `Pathfinder`, `world:noise`, portas fechadas na NavGrid/SightGrid; ver [ZUMBIS.md](ZUMBIS.md) |
| 21 Dia/noite | `ShadowSystem.setSun()`, `GameClock.dayFraction`, `DEPTH.atmosphere` |
| 25 Save | `WorldState.serialize()`, `PlayerInventory.serialize()`, relógio e jogador com snapshot, `core/Storage.ts` |

## Construções do jogador (`build/`)

- **Estado**: `Structures` guarda cada peça (tipo, centro, giro, resistência e o que ela tiver: lenha,
  porta aberta, água, planta) indexada por chunk. O save guarda a lista inteira (é o que o jogador fez).
- **Mundo**: `WorldState` escuta as mudanças e acerta a **navegação** e a **visão** (parede fechada
  bloqueia zumbi e olhar; porta aberta libera), registra baús/estantes/mesas como recipientes do loot e
  derruba o conteúdo no chão quando a peça some. Telhado construído entra em `coveredAt()` → abrigo.
- **Desenho**: `render/StructureViews.ts` por chunk (Graphics + colisor da física para peça sólida),
  prévia do modo construir, chama animada e telhado transparente com o jogador embaixo.
- **Encaixe**: `StructureGeometry.placementFor()` — borda do tile (parede/porta/janela/cerca), tiles à
  frente (móveis, piso, telhado, canteiro) ou ponto livre (fogueira). `CraftService.canPlaceAt()` confere
  com a geometria exata (paredes, portas, janelas e objetos do mapa, outras construções), dentro/fora e chão.
- **Paredes do mapa**: `WallCuts` guarda só os trechos derrubados; o `WorldRenderer` desenha os pedaços
  que sobraram (`WorldEdits.wallPieces`) e a navegação/visão trocam a peça inteira pelos pedaços.
- **Tempo**: `FireSystem` (1×/s) e `BuildSystem` (1×/2 s) acertam lenha, água e horta pelo relógio.

## Fabricação (`crafting/`)

- `Recipes.ts` é só dado: ingredientes com alternativas (unidades, doses ou fração de consumível medido),
  ferramentas (etiquetas, desgaste), estação, tempo, habilidade, resultado ou estrutura.
- `Crafting.ts` confere **reservando unidade por unidade** (dois ingredientes nunca contam o mesmo item) e,
  no fim da ação, gasta (garrafa pela metade antes da cheia), desgasta, devolve o recipiente vazio e
  entrega (comida nasce fresca; ingrediente estragado deixa o prato contaminado).
- `CraftService.ts` descobre as estações por perto e faz a ponte com o relógio (ação com tempo).
