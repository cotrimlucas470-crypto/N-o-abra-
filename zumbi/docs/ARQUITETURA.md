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
5. **Nunca apagar save sem confirmação** (regra do projeto; o sistema de save virá com backup automático).
6. **Mapa × estado.** O mapa (`MapData`) é determinístico e não muda em jogo; o que muda (porta aberta,
   item pego, item largado) é estado (`sim/WorldState.ts`). O save guarda só as diferenças.

## Camadas

```
config/     números e OPÇÕES DE MUNDO (Sandbox.ts) — tudo que ajusta uma partida
core/       puro: eventos, aleatório com semente, armazenamento, matemática, serviços
sim/        puro: relógio do jogo, chunks, ESTADO do mundo (portas, itens no chão)
items/      puro: catálogo de itens, recipiente por peso, inventário do jogador
interaction/ puro: sistema de interação por provedores (portas, itens; depois armários, carros...)
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

**Testes de integridade**: para várias cidades, confirmam que todo cômodo é alcançável pelo corpo do
jogador **e** pela grade de navegação dos zumbis, que nenhuma porta está bloqueada e que nenhum móvel
atravessa parede.

## Opções de mundo (sandbox)

`config/Sandbox.ts` é o painel central de ajuste de uma partida (tamanho da cidade, duração do dia,
multiplicadores...). Cada sistema novo acrescenta a sua seção com faixa válida (`sanitizeSandbox`), e o
save guardará as opções junto com o mundo.

## Debug (`?debug`)

`scenes/DebugScene.ts` + `debug/`: colisões, navegação, chunks, alvo (visão + rota), mapa com teleporte,
hora, velocidade do tempo, números. Cada fase acrescenta suas camadas (zumbis, ruído, loot...).

## Pronto para as próximas etapas

| Etapa | Onde encaixa |
|---|---|
| 2 Controles | `ControlsLayout` já é dado (âncora + deslocamento + tamanho) e é salvo/carregado; botões novos só entram na lista |
| 3 Inventário | `PlayerInventory.containers` (mochila, roupas com bolsos); `ItemContainer` por peso |
| 4/5 Itens e loot | `ItemCatalog` (tags), `BuildingData.kind` + `rooms`; recipientes do mapa viram provedores de interação |
| 6 Sobrevivência | `GameClock` + `PlayerStats` (snapshot/restore) + `SpeedModifiers` do movimento |
| 7–9 Zumbis, percepção, ruído | `WorldModel` (nav, sight, chunks), `Pathfinder`, `world:noise`, portas fechadas na NavGrid/SightGrid; ver [ZUMBIS.md](ZUMBIS.md) |
| 21 Dia/noite | `ShadowSystem.setSun()`, `GameClock.dayFraction`, `DEPTH.atmosphere` |
| 25 Save | `WorldState.serialize()`, `PlayerInventory.serialize()`, relógio e jogador com snapshot, `core/Storage.ts` |
