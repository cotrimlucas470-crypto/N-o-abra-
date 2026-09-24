# Diário de etapas

O que cada etapa entregou, como foi testado e o que ficou pendente. A ordem das etapas está em
[ROADMAP.md](ROADMAP.md).

---

## Etapa 1: movimentação e interação (v0.4.0)

Antes de começar: andar, correr, parar, virar, entrar/sair de construções e colisão com paredes já
funcionavam (v0.3.0). Faltava o mundo reagir: portas, objetos pegáveis, inventário. **O traçado do mapa
expandido não mudou** (conferido por impressão digital antes/depois e travado por teste).

### 1.1 Portas e itens como dados do mapa
- `MapTypes.ts`: `DoorPlacement` (id estável `porta@x,y`, simples/dupla/portão de enrolar,
  madeira/vidro/metal, da rua ou interna, lado de abertura) e `ItemPlacement`.
- `MapBuilder.wall()` registra cada vão de porta; `building()` completa: da rua abre para dentro;
  loja tem porta dupla de vidro; oficina/galpão têm portão de metal; vão largo entre sala e cozinha fica
  sem porta (é passagem). Nada disso usa o gerador aleatório, então o resto do mapa não muda.
- Cidade 3×3: 171 portas (81 internas, 30 de madeira da rua, 23 duplas de vidro, 31 de metal, 6 portões).
- Setor inicial: 18 itens colocados à mão (abrigo, casa, mercadinho, oficina). Loot gerado vem na etapa 5.

### 1.2 Itens, recipientes e inventário (núcleo)
- `items/ItemCatalog.ts`: 15 itens (água, comida, curativos, ferramentas, materiais) com peso, pilha,
  ícone e etiquetas (`tags`) para os sistemas futuros.
- `items/ItemContainer.ts`: recipiente limitado por **peso** (kg), pilhas, retirar, salvar/restaurar
  (item que sumiu do catálogo é ignorado; save antigo não quebra).
- `items/PlayerInventory.ts`: "mãos e bolsos" (8 kg). Já é lista de recipientes: mochila e roupas com
  bolsos entram na etapa 3 sem mudar quem usa.

### 1.3 Estado persistente do mundo
- `sim/WorldState.ts`: porta aberta/fechada/trancada (fechada vira obstáculo na navegação e, se não for
  de vidro, na visão); itens no chão por chunk (pegar, largar); avisos para quem desenha.
- Estado inicial das portas sorteado de forma determinística (semente + id): ~25% das portas da rua e
  ~55% das internas abertas; a base do jogador começa fechada.
- Save guarda só o que difere do mapa (portas mexidas, itens do mapa pegos) + itens largados: 62 bytes num
  mundo intocado.

### 1.4 Interação em jogo
- `interaction/`: sistema por **provedores** (portas, itens). Escolhe o alvo mais perto, com preferência
  para o que está à frente; item só é pego se estiver à vista (nada através da parede).
- Item só é pego se estiver à vista **e** sem porta fechada no caminho (vidro deixa ver, não deixa pegar).
- Porta: abrir/fechar (animação na dobradiça), portão de enrolar sobe; não fecha com alguém no vão;
  trancada avisa. Abrir/fechar faz **barulho** (`world:noise`, alcance por tipo e material) — o sistema de
  ruído e os zumbis vão escutar.
- Porta fechada = corpo sólido na física. Da rua dá para ver se a porta está aberta (vão escuro na
  beirada do telhado).
- Itens aparecem no chão/nos móveis como ícones; destaque pulsante no alvo; aviso "Abrir porta",
  "Pegar Martelo" acima do botão.
- HUD: botões **Interagir** (mão) e **Inventário** (mochila); teclas **E** e **I** no PC. Painel de
  inventário com peso, descrição e LARGAR 1 / LARGAR TUDO; o jogo não pausa e dá para andar com ele aberto.
- Respostas curtas na tela ("+1 Martelo", "Trancada.", "Pesado demais para carregar.").

### 1.5 Debug
- Novos botões: **Portas** (verde aberta, vermelha fechada, amarela trancada), **Ruído** (anéis do
  alcance de cada barulho), **Gerar item** (aos pés do jogador) e **Trancar porta** (a do alvo).
- Painel mostra portas carregadas/fechadas, itens desenhados, peso carregado e o alvo atual.

### Testes
- 128 testes unitários (33 novos; um confere que todo item tem ícone): traçado congelado de 4 cidades; toda porta da rua tem porta; porta cabe
  no vão; abre para dentro; folha fechada cobre o vão; todo item do setor inicial pode ser pego (alcançável
  e à vista); recipiente (pilhas, peso, save); estado do mundo (rota e visão bloqueadas pela porta fechada,
  vidro deixa ver, trancada não abre, abrir/fechar repetido não acumula bloqueio, save/restauração);
  interação (abrir/fechar com barulho, não fecha com alguém no vão, trancada, pegar/largar sem duplicar,
  peso, parede, porta de vidro fechada deixa ver mas não deixa pegar).
- Smoke test no navegador (46 verificações): porta do abrigo fechada segura o jogador; botão Interagir abre
  e libera a navegação; sai pela porta; pega o martelo; abre o inventário; larga; anda com o painel
  aberto; fecha; painel em retrato não cobre os botões; teclas E e I no PC; debug de portas/ruído/gerar
  item; tudo o que já existia.

### Desempenho (Node, desktop)

| Cidade | Portas | Criar estado | Procurar alvo | Save (mundo intocado) |
|---|---|---|---|---|
| 1×1 | 17 | 0,6 ms | 9 µs | 62 bytes |
| 3×3 | 171 | 0,5 ms | 3 µs | 62 bytes |
| 5×5 | 472 | 0,6 ms | 2 µs | 62 bytes |

A busca de alvo roda 12 vezes por segundo; portas e itens só existem no Phaser nos chunks carregados.

### Pendências conhecidas
- Save ainda não é gravado no aparelho (etapa 25); tudo já serializa.
- Janelas ainda são parede de vidro fixa (abrir/quebrar/pular entra com ruído e combate).
- Portas trancadas só pelo debug até existirem chave e pé de cabra.

---

## Base: arquitetura + mapa expandido + câmera + movimento + colisões (v0.3.0)

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
