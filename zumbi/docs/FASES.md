# Diário de etapas

O que cada etapa entregou, como foi testado e o que ficou pendente. A ordem das etapas está em
[ROADMAP.md](ROADMAP.md).

---

## Etapas 4 e 5: itens, loot e natureza (v0.5.0)

Antes de começar: 15 itens, colocados à mão só no setor inicial; nenhum móvel guardava nada. Pedido:
sistema **rico** de itens encontráveis, loot coerente com o lugar, estado dos itens com efeito real,
persistência, recursos naturais renováveis **sem respawn mágico** e mais densidade visual, **sem refazer
o mapa**. O traçado não mudou (impressão digital travada; a natureza nova é uma camada marcada `ambient`).

### L1 Catálogo de itens (371) + ícones paramétricos
- `items/catalog/`: um arquivo por grupo, cada item com id, nome, descrição, categoria, subtipo, peso,
  volume, pilha, raridade, perfil de condição, etiquetas e propriedades do tipo (calorias/fome/sede,
  doses, cura, dano, calibre, capacidade, isolamento, proteção, bolsos, carga de bateria...).
- 16 categorias: comida 79 · bebida 16 · ferramenta 31 · material 30 · construção 13 · medicina 26 ·
  arma branca 15 · arma de fogo 8 · munição 12 (com carregadores) · roupa e proteção 34 · mochila 10 ·
  eletrônico 19 · agricultura e natureza 20 · doméstico 29 · leitura (livros, revistas, mapas,
  documentos) 20 · valor 9. Raridade: 226 comuns, 91 incomuns, 39 raros, 12 muito raros, 3 raríssimos.
- 8 itens são **só de fabricação** (`craftOnly`: água suja, ferramentas improvisadas...) e nunca saem do loot.
- Os 15 ids antigos continuam iguais (saves antigos abrem).
- `assets/procedural/itemIcons/`: ~60 famílias de desenho (lata, garrafa, pote, fruta, carne, ferramenta,
  faca, arma, munição, roupa, mochila, livro, remédio, seringa, aparelho, bateria...). Cada item só diz a
  família e as cores; o teste garante que nenhum item fica sem ícone.

### L2 Estado e condição com efeito real
- `items/condition.ts`: `ItemState` compacto (condição, nascimento, validade, doses, aberto, carga,
  marcas sujo/molhado/enferrujado/contaminado/rasgado/ensanguentado), normalizado por perfil.
- Perecível: frescor pelo relógio do jogo (fresco → passando → estragado → podre); comida estragada faz mal.
- Enlatado/remédio: validade; remédio vencido rende metade. Bebida aberta guarda as doses que sobraram.
- Ferramenta/arma: desgaste (quebrada não serve); arma de fogo suja/enferrujada engasga mais.
- Roupa: rasgada/molhada protege e aquece menos. Pilha e aparelho: carga.
- Itens iguais só empilham com o mesmo estado; o painel mostra barra de condição e etiquetas.

### L3 Tabelas de loot, recipientes e geração
- `loot/containers.ts`: 24 tipos de recipiente (geladeira, fogão, armário, gaveta, guarda-roupa,
  criado-mudo, prateleira, gôndola, caixa registradora, bancada, caixote, caçamba, lixeira, saco de lixo,
  tambor, porta-luvas, porta-malas...) ligados aos móveis que já existiam no mapa.
- `loot/tables.ts`: 41 tabelas (casa, restaurante, mercado, farmácia, loja de roupas, oficina, galpão,
  escritório, abrigo, rua, veículos, chão; hospital e delegacia prontas para quando existirem).
- `loot/rules.ts`: a tabela depende do **recipiente + prédio + cômodo + zona** (armário do banheiro ≠
  armário da cozinha ≠ armário da oficina). Arma de fogo só em guarda-roupa, porta-malas e poucos
  lugares, e rara.
- Geração **preguiçosa e determinística**: na primeira abertura, `Random(semente:loot:id)`; quantidade e
  raridade variam; estado do item depende do lugar (lixo vem sujo, porta-malas pode vir molhado).
- Itens soltos no chão das casas/lojas/oficinas também saem de tabela, uma vez, na criação do mundo.
- `Sandbox.loot`: abundância, multiplicador de raros, fração já saqueada, **idade do colapso** (dias:
  envelhece comida e remédio) e itens no chão. URL: `?loot=0.5`, `?colapso=90`.

### L4 Natureza, densidade visual e recursos renováveis
- 20 objetos novos: macieira, laranjeira, mangueira, limoeiro, goiabeira, abacateiro, jabuticabeira,
  bananeira, árvores comuns de copa larga, jovens, pinheiros, secas e palmeiras, arbustos de amora, com
  flores e redondos, pedras, tocos, troncos caídos, sucata; 5 decalques (grama, flores, pedrinhas, lixo,
  mato).
- `districts/Ambience.ts`: camada de ambiente por setor, com folgas rígidas (longe de prédios, portas,
  bordas e outros sólidos); na 3×3: +256 objetos, +2.763 decalques, 67 montes de recurso.
- `nature/`: frutíferas (com frutos próprios), arbusto de amoras, árvore seca (galhos), montes de galhos
  (renovam), pedras (**acabam**), cogumelos comestíveis e venenosos parecidos. A quantidade é calculada
  pelo relógio do jogo **na hora de ler** (sem timer, sem "spawn"); colher pela metade guarda o progresso.
- Frutos visíveis nas copas: carregada, poucas ou nenhuma. `Sandbox.nature`: dias para renovar e densidade.

### L5 Persistência, interação e interface de saque
- `WorldState` v2: recipientes revistados, recipientes mexidos (conteúdo inteiro) e colheitas; lê save v1.
  Mundo intocado continua pequeno (127 bytes).
- Interação: **Abrir geladeira / Vasculhar armário / Revirar lixeira / Colher mangas (3) / Juntar galhos**;
  recipiente vazio ou revistado aparece como tal; caçamba, porta-malas, tambor e saco de lixo fazem barulho.
- Painel de saque ao lado do inventário (em cima/embaixo no retrato): PEGAR, PEGAR TUDO, GUARDAR,
  LARGAR, **USAR** (comer, beber, curar, vestir mochila); raridade na cor do nome; peso, categoria e estado.
  Lata precisa de abridor/faca; bebida acaba e deixa a garrafa vazia; mochila aumenta a carga.
  O painel fecha sozinho quando você se afasta.

### L6 Debug e testes
- Debug: botão **Loot** (azul = intacto, amarelo = revistado, cinza = vazio; barra de colheita nas
  frutíferas e montes) e **Dia +1**; painel em 3 colunas na horizontal.
- 178 testes unitários (50 novos): catálogo (mínimos por categoria, ícones, munição para todo calibre,
  perfis), regras de condição; tabelas válidas, todo recipiente com tabela em todo contexto, nada fora
  do lugar (arma não sai de geladeira/farmácia/lixo), geladeira só comida e bebida, farmácia principalmente
  remédio, raridade respeitada, quantidades variam, ajustes do sandbox funcionam, estado conforme o lugar,
  comida estraga com a idade do colapso, validade, determinismo, persistência, save v1, itens no chão
  alcançáveis; natureza (renova, pedras acabam, save), regras da camada de ambiente (longe de portas e
  prédios, mapa alcançável), colher, abrir, pegar tudo, guardar, comer, beber, curar, vestir mochila.
- Smoke test no navegador: abrir geladeira mostra o painel, PEGAR TUDO esvazia, frutífera vira alvo e
  COLHER põe frutas no inventário, debug de loot e Dia +1, painel de saque em retrato sem cobrir botões.

### Distribuição e desempenho (Node, desktop; semente 1337)

| Cidade | Gerar cidade (com ambiente) | Recipientes | Vazios | Itens (todos abertos) | Armas de fogo | Soltos no chão | Gerar TODO o loot | Save intocado |
|---|---|---|---|---|---|---|---|---|
| 1×1 | 17 ms | 125 | 56 | 468 | 1 | 12 | 5 ms | 127 B |
| 3×3 | 56 ms | 677 | 231 | 5.798 | 9 | 139 | 11 ms | 127 B |
| 5×5 | 92 ms | 1.746 | 571 | 17.314 | 22 | 380 | 22 ms | 127 B |

Na prática o loot só é gerado quando o recipiente é aberto (microssegundos cada). No navegador de teste,
os 371 ícones levam ~90 ms e a natureza ~8 ms do tempo de carregamento da arte.

### Pendências conhecidas
- **Fabricação (receitas e bancadas)**: etapas 15–16. Os itens, etiquetas e os `craftOnly` já estão prontos.
- Hospital, delegacia, escola e posto ainda não existem no mapa (as tabelas de hospital e delegacia sim).
- Cadáveres com loot dependem dos zumbis (etapa 7).
- Fome e sede ainda não existem (etapa 6): comer/beber hoje só aplica o efeito na vida; os valores de
  calorias, fome e sede já estão no catálogo.
- Vestir roupas, ler livros (habilidades), usar armas, recolher/ferver água e plantar sementes: etapas próprias.
- Save ainda não é gravado no aparelho (etapa 25); tudo já serializa.

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
