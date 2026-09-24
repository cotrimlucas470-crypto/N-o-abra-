# Diário de fases

O que cada fase entregou, como foi testado e o que ficou pendente.

---

## Fase 1: arquitetura + mapa + câmera + movimento + colisões (v0.3.0)

### 1.1 Opções de mundo, relógio e ids estáveis
- `config/Sandbox.ts`: **opções de mundo** centrais com faixas válidas e presets (`padrao`, `cidade-pequena`,
  `cidade-grande`). Hoje controla: tamanho da cidade, semente, duração do dia, hora inicial e
  multiplicadores do personagem. Cada fase acrescenta a sua seção. Ajustes de teste pela URL:
  `?setores=1x1`, `?semente=42`, `?dia=10`, `?hora=20`.
- `sim/GameClock.ts`: **relógio do jogo** (dia de 48 min reais por padrão). O HUD mostra `DIA 1 · 08:24`.
- **Ids estáveis** em todo objeto do mapa (`tipo@x,y`): o save guarda mudanças por id, então reorganizar o
  gerador não embaralha mundos salvos.
- `sim/ChunkGrid.ts`: matemática de chunks (16×16 tiles = 1024 px) e anéis de distância.

### 1.2 Navegação, visão e rotas
- `world/nav/NavGrid.ts`: grade de caminhada (32 px) **dinâmica** (conta obstáculos por célula: dá para
  acrescentar e remover porta, barricada, carro sem reconstruir). Garante folga para corpos de raio ≤ 15 px.
- `world/nav/SightGrid.ts`: grade de visão (16 px) com raio exato (DDA). Parede e cerca bloqueiam; janela não.
- `world/nav/Pathfinder.ts`: A\* com buffers reaproveitados, orçamento de células, **rota parcial** quando
  o orçamento acaba e rota encurtada por linha reta.

### 1.3 Mundo em chunks
- `world/WorldModel.ts`: o mundo como dado (mapa, índice por chunk, grades).
- `world/chunkify.ts`: corta faixas e cercas longas nas fronteiras de chunk sem emenda no desenho.
- `world/render/WorldRenderer.ts`: **carga e descarga por chunk** com histerese e no máximo 2 chunks
  criados por quadro (sem travadas); teleporte e início carregam tudo de uma vez. Telhados, sombras, copas
  e recorte ganharam remoção.

### 1.4 Cidade de vários setores
- `districts/CityGenerator.ts`: cidade em grade de setores (3×3 por padrão), setor inicial no centro,
  zonas planejadas (comércio perto do centro, indústria e parques mais afastados), nomes por direção.
- `districts/SectorRoads.ts`: malha comum (avenida, rua, calçadas, **becos**, postes, árvores, bueiros).
- `districts/SectorBlocks.ts`: quarteirões **residenciais** (casas, entradas de carro, quintais),
  **comerciais** (mercadinho, farmácia, lanchonete, loja de roupas, estacionamento, pátio de serviço),
  **industriais** (galpões, oficinas, pátio de sucata) e **parques**.
- Plantas novas: casa pequena, loja de rua (3 variações de mobília), galpão.
- Bordas da cidade: cerca no oeste/norte e bloqueios onde as vias saem do mapa.

### 1.5 Painel de debug (só com `?debug`)
- Botão **DBG** (ou tecla F2): colisões, grade de navegação, bordas de chunk, **alvo** (linha de visão +
  rota A\* do jogador até o ponto tocado, com tempo de cálculo), **mapa com teleporte**, hora +1,
  velocidade do tempo (×1, ×10, ×60, parado) e painel de números (posição, chunk, região, carga, mapa).

### Testes
- 95 testes unitários, entre eles:
  - integridade de **4 cidades** (3 sementes, 2 formatos): todo cômodo alcançável pelo corpo do jogador,
    toda porta atravessável, nenhum móvel dentro de parede, ids únicos, geração determinística;
  - **zumbis alcançam todo cômodo** da cidade 3×3 pela grade de navegação;
  - 12 sementes geram cidades válidas; plano da cidade tem todas as zonas;
  - chunks: cada item em exatamente um chunk; faixas não ultrapassam o chunk; área de colisão preservada;
  - rota entra pela porta, não passa pela janela, respeita obstáculo dinâmico, não corta quina, rota parcial.
- Smoke test no navegador: tudo o que já existia, mais teleporte por 8 setores (carga/descarga de chunks)
  e o painel de debug (alvo, rota, mapa, teleporte).

### Desempenho medido (Node, desktop)

| Cidade | Tiles | Objetos | Gerar | Grades | Memória das grades | Rota média |
|---|---|---|---|---|---|---|
| 1×1 | 72×56 | 230 | 4 ms | 3 ms | 158 KB | 0,7 ms |
| 3×3 | 216×168 | 1.393 | 13 ms | 14 ms | 1,4 MB | 0,4 ms |
| 5×5 | 360×280 | 3.703 | 25 ms | 17 ms | 3,9 MB | 0,2 ms |

Em jogo ficam carregados cerca de 12 chunks, com ~200 a 300 colisores e ~600 objetos visuais,
independentemente do tamanho da cidade.

### Pendências conhecidas
- FPS real só pode ser medido num aparelho (o navegador de teste roda a ~10 FPS por não ter GPU).
- A arte procedural leva ~2,7 s para ser gerada no navegador de teste; ainda falta medir num celular.
- Os setores gerados têm menos objetos que o setor inicial (feito à mão). Mais variedade entra com o loot (Fase 4).
