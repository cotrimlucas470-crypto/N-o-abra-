# Plano geral: de protótipo a survival sandbox

Este documento transforma a especificação completa (sandbox emergente, sem ondas nem spawn mágico) num
plano de construção em fases. Ele é a referência para todas as sessões: quando a especificação e o
código divergirem, atualize este arquivo.

---

## 1. Arquitetura atual (antes da Fase 1)

```
Boot → Preload (arte procedural + PNGs substitutos) → Título → Jogo + HUD
```

| Camada | Arquivos | Estado |
|---|---|---|
| Configuração | `config/GameConfig`, `PlayerTuning`, `Palette` | números espalhados em 3 arquivos, sem "opções de mundo" |
| Núcleo puro | `core/EventBus`, `Random`, `Storage`, `math`, `Services`, `Debug` | sólido e testado |
| Arte | `assets/` (registro, atlas, substituição por PNG, desenho procedural) | sólido; troca de arte sem código |
| Jogador | `entities/player/Player` (Phaser) + `PlayerMotor`, `PlayerStats` (puros) | sólido; só vida e fôlego |
| Entrada | `input/` (intenção única; teclado/mouse; joysticks e botões de toque; layout em dados) | sólido; 3 botões |
| Mundo (dados) | `MapTypes`, `MapBuilder`, catálogos, plantas, `StarterDistrict`, `collision` | sólido, mas **um único mapa pequeno (72×56 tiles)** |
| Mundo (visual) | `WorldRenderer` + telhados, sombras, copas, recorte | **cria o mapa inteiro de uma vez** |
| Câmera/tela | `CameraDirector`, `Viewport`, `fullscreen` | sólido |
| Interface | HUD, painel de status, avisos, pausa | simples |
| Testes | 40 unitários + teste de integridade do mapa + smoke no navegador | bom |

## 2. O que já existe e funciona

- Movimento analógico com aceleração, colisão (física com passo fixo de 1/120 s, não atravessa parede
  mesmo a 9 FPS), tronco que mira e pernas que andam, fôlego.
- Mapa com construções de interior explorável (telhado some), plantas reaproveitáveis e giráveis.
- Colisão justa para objetos tortos; teste que garante que todo cômodo é alcançável.
- Controles de toque multitoque, sem atraso, com layout em dados e rede de segurança contra dedo preso.
- Tela nítida em qualquer DPR; tela cheia só onde é permitida.
- Arte substituível por PNG sem mexer em código.

## 3. O que precisa ser preservado

Tudo acima. Em especial, estas decisões continuam valendo:

1. **Lógica pura separada do Phaser** (testável em Node).
2. **Mapa e conteúdo como dados** (`MapData`, catálogos, plantas).
3. **Sistemas conversam pelo `EventBus`.**
4. **Arte sempre via `assets.ref(id)`.**
5. **Intenção do jogador única** (`resolveIntent`): o personagem não sabe se o comando veio do toque ou do teclado.

## 4. O que precisa ser reorganizado

| Problema | Por que atrapalha o jogo completo | Solução |
|---|---|---|
| Mapa único e pequeno, criado de uma vez | mundo grande = dezenas de milhares de objetos; não cabe na memória/GPU do celular | **mundo em chunks** com carga e descarga conforme a posição (Fase 1) |
| Nenhuma estrutura de navegação/visão | zumbis precisam de rotas e de "não enxergar através de parede"; som precisa de paredes | **grade de navegação + grade de visão + A\*** puras e testadas (Fase 1) |
| Números espalhados | a especificação pede ajuste central (quantidade de zumbis, duração do dia...) | **opções de mundo (sandbox)** centrais com presets (Fase 1, crescendo a cada fase) |
| Sem relógio de jogo | fome, sede, sono, dia/noite, IA com memória: tudo depende de tempo | **GameClock** (Fase 1) |
| Debug só por URL | a especificação pede ferramentas de debug separadas | **painel de debug** com camadas (Fase 1, cresce a cada fase) |
| Estado do mundo não existe | portas, gavetas, itens no chão, cadáveres precisam persistir | **ids estáveis** agora (Fase 1) + **WorldState** com mudanças por entidade (Fase 2) |
| Um só gerador de mapa escrito à mão | cidade grande precisa de variedade sem escrever tudo à mão | **gerador de setores** por tipo de zona, reaproveitando plantas (Fase 1) |

## 5. Plano de implementação

Regra de cada fase: implementar → testar → procurar bugs → corrigir → medir desempenho → confirmar que
o que existia continua funcionando → documentar → só então avançar. Fases grandes viram subfases.

| Fase | Conteúdo | Subfases principais |
|---|---|---|
| **1** | Arquitetura + mapa + câmera + movimento + colisões | 1.1 opções de mundo, relógio, ids estáveis · 1.2 navegação/visão/A\* · 1.3 mundo em chunks · 1.4 cidade de vários setores · 1.5 painel de debug · 1.6 testes, desempenho, docs |
| 2 | Interação + objetos + portas + containers + inventário | 2.1 `WorldState` e entidades persistentes · 2.2 interação contextual (botão + alvo) · 2.3 portas e janelas (abrir, trancar, quebrar) · 2.4 containers · 2.5 itens e inventário (peso, volume, mochila, bolsos) · 2.6 **save básico** (antecipado, ver §7) |
| 3 | Sobrevivência básica | fome, sede, energia/fadiga, sono; efeitos no corpo; interface discreta (ícones de estado, não barras) |
| 4 | Loot contextual | tabelas por tipo de local, cômodo e recipiente; raridade; finito (não reaparece) |
| **5** | **Zumbis + percepção + IA** | ver [ZUMBIS.md](ZUMBIS.md): 5.1 núcleo e simulação por distância · 5.2 ruído, visão, memória · 5.3 estados e rotas · 5.4 corpo por regiões · 5.5 ataques e agarrão · 5.6 variedade visual · 5.7 população em movimento · 5.8 debug de zumbis |
| 6 | Combate corpo a corpo | armas com alcance, arco, tempo de recuperação, fôlego, ruído, regiões atingidas |
| 7 | Armas de fogo + munição + ruído | carregadores, recarga, recuo, condição; o tiro atrai a vizinhança |
| 8 | Ferimentos + medicina | corte, mordida, fratura, sangramento, infecção; itens médicos |
| 9 | Crafting + bancadas | receitas com ferramenta/estação; nada de crafting mágico |
| 10 | Construção + base | posicionar estruturas; invasão só por consequência (barulho, porta aberta, luz) |
| 11 | Dia/noite + clima + temperatura | luz dinâmica, lanterna, chuva/neblina afetando visão e audição |
| 12 | Água + energia + geradores | abastecimento que acaba, coleta de chuva, gerador que faz barulho |
| 13 | Agricultura | fonte renovável |
| 14 | Veículos | combustível, peças, porta-malas, muito ruído |
| 15 | NPCs | se a arquitetura suportar (EventBus + mesmas entidades dos zumbis) |
| 16 | Save/load completo | múltiplos slots, backups, migração de versão |
| 17 | Configurações + customização dos controles | arrastar botões, tamanho, opacidade, presets |
| 18 | Performance Android | pooling, orçamentos por quadro, APK (Capacitor) testado em aparelho |
| 19 | Polimento | animações, áudio, partículas, feedback |

## 6. Riscos técnicos

| Risco | Impacto | Como reduzir |
|---|---|---|
| **Muitos zumbis com IA completa no celular** | queda de FPS | IA em níveis por distância (completa perto, simplificada longe, só "população" muito longe); orçamento de rotas por quadro; campo de fluxo compartilhado quando muitos perseguem o mesmo alvo |
| **Física Arcade só tem círculo e retângulo alinhado** | colisão de objetos girados, empurra-empurra de multidão | objetos girados viram fileiras de círculos (já feito); separação própria entre zumbis (grade espacial), barata e controlável |
| **Rotas caras (A\*) em mapa grande** | travadas | grade de 32 px, limite de nós por busca, rota encurtada por linha de visão, cache e recálculo só quando necessário |
| **Save no navegador** | localStorage tem ~5 MB e pode corromper se fechar no meio | IndexedDB, gravação atômica (grava cópia nova antes de trocar), 2 backups rotativos, versão + migração, salvar ao minimizar |
| **Mudança no gerador quebra saves** | mundo do save não bate com o novo mapa | ids estáveis por conteúdo (não por ordem), versão do mapa no save |
| **Android mata a página em segundo plano** | perda de progresso | salvar automaticamente ao minimizar (`visibilitychange`) e em intervalos |
| **Memória de GPU** | celulares médios fecham a aba | atlas único, carregar só chunks próximos, sem texturas por objeto |
| **Arte procedural demora para gerar** | abertura lenta em aparelhos fracos | medir em aparelho real; se preciso, gerar o atlas no build (PNG em cache) |
| **Complexidade crescente entre sistemas** | bugs difíceis | fronteiras claras, EventBus tipado, lógica pura testada, smoke test a cada fase |
| **Interface de inventário em tela pequena** | jogabilidade ruim | desenhar para polegar desde o início; testar em retrato e paisagem |
| **WebView do APK ≠ Chrome** | diferenças de desempenho | gerar APK de teste cedo (antes da Fase 18) |

## 7. Ordem recomendada (ajustes à sua lista)

A ordem proposta está boa. Três ajustes para reduzir risco:

1. **Save básico junto com a Fase 2**, e não só na Fase 16. Quando existirem portas, gavetas e itens, o
   formato do estado precisa ser testado salvando e carregando de verdade. Deixar para o fim é o jeito mais
   comum de descobrir que o mundo não é serializável. A Fase 16 continua existindo: slots, backups e migração.
2. **Ruído entra na Fase 5, não na 7.** Os zumbis precisam ouvir passos, portas e janelas desde o começo.
   A Fase 7 só acrescenta os sons de tiro ao sistema que já existe.
3. **Visão dos zumbis já nasce com "nível de luz"** (hoje sempre dia). A Fase 11 só liga a noite, sem
   reescrever a percepção.

## 8. Princípio que guia as decisões

Cada sistema novo precisa **produzir consequências para outros sistemas** através de dados e eventos
(som, luz, peso, ferimento, estado do mundo). É isso que cria histórias sem roteiro. Se um sistema novo não
conversa com nenhum outro, ele ainda não está pronto.
