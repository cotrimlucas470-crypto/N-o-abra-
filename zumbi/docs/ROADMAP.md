# Roteiro

Referência de profundidade: sobrevivência **sistêmica** (mundo persistente, recursos finitos, ruído,
ferimentos, peso, clima, consequências permanentes) no espírito de jogos como Project Zomboid, **sem copiar**
conteúdo, nomes, mapas, arte, interface ou código. A identidade visual é a do nosso projeto.

A especificação geral está em [PLANO-GERAL.md](PLANO-GERAL.md); o desenho dos zumbis em [ZUMBIS.md](ZUMBIS.md);
o que cada etapa entregou em [FASES.md](FASES.md).

**Regra de cada etapa:** analisar o que já existe → implementar em subetapas → testar → procurar e corrigir
bugs → medir desempenho → conferir compatibilidade (toque, PC, retrato) → salvar uma versão funcionando
(commit) → documentar. Nada de avançar deixando sistema quebrado.

**O mapa expandido não muda sem necessidade.** Um teste (`tests/interaction.test.ts`, "mapa expandido
preservado") guarda a impressão digital do traçado; portas, itens e o que vier depois entram como camadas
por cima do mesmo mapa.

## Base (já pronta)

| | Conteúdo | Estado |
|---|---|---|
| — | Protótipo: projeto, personagem, câmera, controles de toque | ✅ v0.2.0 |
| — | Arquitetura + cidade de vários setores em chunks + navegação/visão + relógio + debug | ✅ v0.3.0 |

## Ordem de desenvolvimento

| # | Etapa | Estado |
|---|---|---|
| 1 | **Movimentação e interação** (portas, entrar/sair, pegar/largar, colisões sólidas) | ✅ v0.4.0 |
| 2 | Controles mobile configuráveis (Configurações → Controles → Personalizar HUD, presets) | ⏳ próxima |
| 3 | Inventário (mãos, bolsos, mochila, peso e cansaço por carga) | ⏳ (mochila e usar itens prontos; falta cansaço e roupas com bolsos) |
| 4 | Itens (catálogo ampliado, estado, durabilidade, validade) | ✅ v0.5.0 (371 itens) |
| 5 | Loot contextual (por tipo de construção e cômodo, finito) | ✅ v0.5.0 (+ frutíferas e recursos renováveis) |
| 6 | Sobrevivência (fome, sede, sono, cansaço, interligados) | ⏳ |
| 7 | Zumbis (indivíduos, estados, variação) | ⏳ (desenho em ZUMBIS.md) |
| 8 | Percepção (visão, audição, memória) | ⏳ |
| 9 | Ruído (propagação, paredes, portas) | ⏳ (portas já emitem `world:noise`) |
| 10 | Combate corpo a corpo | ⏳ |
| 11 | Armas de fogo | ⏳ |
| 12 | Ferimentos (por parte do corpo) | ⏳ |
| 13 | Medicina | ⏳ |
| 14 | Roupas | ⏳ |
| 15 | Crafting | ⏳ (itens `craftOnly` e etiquetas prontos; receitas a fazer) |
| 16 | Bancadas | ⏳ |
| 17 | Construção (sem ataques programados) | ⏳ |
| 18 | Agricultura | ⏳ (sementes no catálogo; frutíferas já renovam) |
| 19 | Água | ⏳ (água contaminada e garrafa vazia no catálogo) |
| 20 | Eletricidade | ⏳ |
| 21 | Dia/noite (sem hordas noturnas) | ⏳ |
| 22 | Clima e temperatura | ⏳ |
| 23 | Veículos | ⏳ |
| 24 | NPCs (só depois da base estável) | ⏳ |
| 25 | Save completo (slots, backup automático, migração) | ⏳ (portas, itens, recipientes, natureza e inventário já serializam; save v2 lê v1) |
| 26 | Configurações | ⏳ |
| 27 | Debug (ferramentas finais) | ⏳ (cada etapa acrescenta as suas) |
| 28 | Otimização Android (APK) | ⏳ |
| 29 | Polimento (animações, áudio, arte) | ⏳ |

## Filosofia (vale para todas as etapas)

- Sem missões obrigatórias, hordas programadas, ataques noturnos, loot infinito, itens surgindo do nada ou
  dificuldade artificial. Nada de "gerar item a cada X segundos"; população de zumbis não é por timer; a
  noite não gera hordas.
- Consequências vêm dos sistemas: barulho atrai, peso cansa, ferida infecciona, porta aberta deixa entrar.

## Decisões já tomadas

- Movimento analógico em 360° no joystick; teclado em 8 direções.
- Correr é botão liga/desliga; desliga ao soltar o joystick de movimento; mirar impede correr.
- Telhados escondem os interiores até você entrar; a porta da rua aparece na beirada do telhado
  (dá para ver da calçada se está aberta).
- Mundo em **chunks de 16×16 tiles**; cidade em **setores de 72×56 tiles**.
- Navegação em células de 32 px; visão em células de 16 px (janela e porta de vidro deixam ver, não passar).
- Porta fechada bloqueia passagem (física e zumbis) e, se não for de vidro, a visão.
- Estado do mundo (`sim/WorldState.ts`) separado do mapa: o save guarda só as diferenças.
- Inventário limitado por **peso** (kg), sem "casas".
- Loot gerado **na primeira abertura**, com semente própria por recipiente: sempre o mesmo, sem custo no
  início e sem salvar o que ninguém mexeu. Nada reaparece; só a natureza (frutas, galhos, cogumelos)
  se renova com o tempo do jogo, e pedras se esgotam.
- Estado do item (validade, frescor, desgaste, carga, doses, sujo/molhado/enferrujado) tem efeito real;
  itens iguais só empilham se o estado for igual.
- Camada de ambiente (árvores variadas, arbustos, pedras, grama, flores, lixo) entra por cima do mapa
  pronto e fica fora da impressão digital do traçado.
- Interação por **provedores**: coisa nova interativa não muda o sistema, o botão nem o aviso.
- Tudo o que ajusta uma partida mora em `config/` (`Sandbox.ts`, `WorldTuning.ts`, `PlayerTuning.ts`).

## Ideias anotadas para depois

- Gerar o atlas procedural no build (PNG em cache) para abrir mais rápido em celulares fracos.
- Sombra do telhado com o formato do telhado de 4 águas.
- Mais plantas: escola, hospital, delegacia, igreja, posto, prédio de apartamentos (as tabelas de loot de
  hospital e delegacia já existem; falta a construção no mapa).
- Janelas como entidades (abrir, quebrar, pular) — junto com ruído/combate.
- Chaves e pé de cabra para portas trancadas (o estado "trancada" já existe; hoje só o debug tranca).
