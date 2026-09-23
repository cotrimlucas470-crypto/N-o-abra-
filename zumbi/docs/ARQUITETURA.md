# Arquitetura

Objetivo: dá para trabalhar meses neste código sem ele virar uma bola de neve.
Regras que sustentam isso:

1. **Lógica pura separada do Phaser.** Tudo que é regra (movimento, fôlego, mapa, colisão, joystick, layout)
   é TypeScript puro, testado em `tests/`. O Phaser só desenha e simula a física.
2. **Dados, não código.** Mapa, objetos, plantas de casas, layout dos botões e substituição de arte são dados.
   Conteúdo novo quase nunca exige mexer em sistemas.
3. **Sistemas conversam por eventos** (`core/EventBus.ts`), sem se conhecerem.
   Ex.: o passo do personagem emite `player:footstep` e o sistema de ruído (Etapa 6/7) vai só escutar.
4. **Nada de número mágico espalhado.** Ajustes em `config/`.
5. **Nunca apagar save sem confirmação** (regra do projeto; o sistema de save virá com backup automático).

## Fluxo de cenas

```
Boot → Preload → Title ──JOGAR──→ Game
                                  └─ launch → Hud (roda por cima, em paralelo)
```

- **Preload**: lê `assets/overrides.json`, carrega PNGs substitutos e gera a arte procedural do resto
  (num atlas único, para economizar GPU).
- **Game**: monta o mundo a partir de um `MapData`, cria o jogador, a câmera e a física.
- **Hud**: status, avisos, controles de toque, pausa. Trabalha em **px CSS** (câmera com zoom = DPR).

## Quadro a quadro

```
entrada (toque/teclado) ─→ InputState ─→ resolveIntent() ─→ Player.update()   [antes da física]
                                                            física Arcade (passos fixos de 1/120 s)
POST_UPDATE ─→ Player.syncVisuals() → CameraDirector.update() → WorldRenderer.update()
                                                  (recorte, copas, telhados, região)
```

- **Física com passo fixo de 1/120 s**: em FPS baixo a física dá vários passos pequenos, então o personagem
  nunca atravessa parede e o jogo não fica em câmera lenta. Em telas de 120 Hz é um passo por quadro.
- **Toque sem atraso**: os joysticks escrevem a intenção no próprio evento de toque, e não no update do HUD
  (que roda depois do jogo).

## Tela do celular (`systems/Viewport.ts`)

- O canvas tem a **resolução real** do aparelho (tamanho CSS × DPR, com DPR limitado a 2), então fica nítido.
- O zoom da câmera garante que o **lado menor da tela mostre ~600 px de mundo** no celular (até 900 no PC ou
  tablet). O personagem tem o mesmo tamanho visual em qualquer aparelho.
- Área segura (entalhe/barra de gestos) é respeitada no layout dos controles.

## Mundo (`world/`)

| Arquivo | Papel |
|---|---|
| `MapTypes.ts` | formato do mapa (só dados): chão, faixas, paredes, objetos, decalques, construções, regiões |
| `MapBuilder.ts` | ferramenta para montar mapas em código (tiles), inclusive plantas giradas/espelhadas |
| `buildings/templates.ts` | plantas: Casa, Mercadinho, Oficina, Abrigo (cômodos, portas, janelas, móveis) |
| `districts/StarterDistrict.ts` | Região 1 (Zona Residencial, Setor 1) |
| `PropCatalog.ts` / `DecalCatalog.ts` | catálogo de objetos: tamanho, colisão, camada, sombra |
| `collision.ts` | geometria de colisão pura (usada pela física **e** pelos testes) |
| `render/WorldRenderer.ts` | MapData → objetos do Phaser |
| `render/RoofSystem.ts` | telhados somem ao entrar; avisa entrada/saída |
| `render/ShadowSystem.ts` | sombras projetadas por um "sol"; pronto para dia/noite |
| `render/SpatialCuller.ts` | esconde o que está fora da tela (grade espacial; escala para várias regiões) |

**Teste de integridade do mapa** (`tests/mapIntegrity.test.ts`): simula o corpo do jogador e confirma que
**todo cômodo de toda construção é alcançável** a partir do spawn, que nenhuma porta está bloqueada e que
nenhum móvel atravessa parede. Se uma planta nova ficar ruim, o teste diz qual cômodo e onde.

## Pronto para as próximas etapas

| Etapa futura | Onde encaixa |
|---|---|
| Zumbis + IA com audição | `entities/zombie/`; escutam `player:footstep` e futuros `noise:*` do EventBus |
| Combate | intenção já tem mira; botão de ataque entra em `ControlsLayout` (`ControlId`) |
| Loot / interiores | `BuildingData.rooms` já tem nome e retângulo de cada cômodo |
| Inventário | `PlayerStats` recebe peso; nova cena/overlay de UI |
| Dia/noite | `ShadowSystem.setSun()` já move as sombras; `DEPTH.atmosphere` reservado |
| Save | `Player.snapshot()`, `PlayerStats.snapshot()/restore()`, `core/Storage.ts` (nunca lança erro) |
| Regiões | `MapData.regions` + aviso de região + culler por grade |
| NPCs | EventBus + mesmo padrão de entidade do Player |
| Botões reposicionáveis | `ControlsLayout` já é dado com âncoras e é salvo/carregado |
