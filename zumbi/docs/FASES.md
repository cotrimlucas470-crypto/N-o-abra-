# Diário de etapas

O que cada etapa entregou, como foi testado e o que ficou pendente. A ordem das etapas está em
[ROADMAP.md](ROADMAP.md).

---

## Cidade 3× maior, prédios todos diferentes e 3× mais objetos (v0.8.0)

**Análise da geração antiga (cidade 5×5, semente 1337):** 163 prédios de térreo com só **9 plantas distintas**
(68× a mesma casa 10×8, 29× a 9×8, 17× a mesma oficina...), 4,6 objetos por cômodo (1,3 por 10 tiles²),
17 cômodos vazios nos andares, 49 dos 69 tipos de objeto usados.

- **Gerador de prédios** (`world/buildings/gen/`): 29 arquétipos (moradia, comércio, trabalho, serviços);
  a planta (faixas, salão com fundos, corredor), as portas (em árvore), as janelas e a entrada mudam a cada prédio;
  riqueza (pobre/média/rica) e conservação (conservado, abandonado, saqueado, incendiado, ocupado) mudam móveis e chão.
  Resultado: 182 prédios, **182 plantas diferentes**.
- **Mobília por regra de cômodo** (`rooms.ts`, `identity.ts`): oficina tem bancada, compressor, pneus; supermercado tem
  gôndolas duplas e freezers; lavanderia tem fileira de máquinas; igreja tem altar e bancos; escola tem lousa e carteiras.
  Móvel nunca fecha passagem (grade do jogador) e uma segunda conferência na grade dos zumbis (`navcheck.ts`) tira o que a fecha.
- **~59 objetos novos** (desenho, resistência/desmonte, recipiente, loot): cômoda, estante, beliche, berço, máquina de lavar,
  gôndola, arara, vitrine, porta-paletes, torno, armário de metal, contêiner, carteira, banco de igreja, maca, esteira,
  varal, churrasqueira, caixa d'água, ponto de ônibus, banca... 87 tipos de objeto em uso (antes 49).
- **Densidade:** térreo 1,3 → 3,0 objetos por 10 tiles² (recipientes por cômodo 2,65 → 4,2); andares de cima 3,7, **0 cômodos vazios**.
- **Andares** usam o mesmo mobiliador; escada só em canto que o corpo alcança; escritórios, lojas e apartamentos ganham andar.
- **Quintais com propósito** (varal, horta, churrasqueira, caixa d'água, casinha de cachorro, bicicleta), ponto de ônibus e banca
  na calçada comercial, contêineres e porta-paletes no pátio industrial.
- **Cidade padrão 9×9 setores** (648×504 tiles, ≈ 3,2× a área). Presets: Média 5×5, Clássica 3×3, Pequena 1×1.
- **Saves:** `MAP_VERSION`. Save do mapa antigo não abre no mapa novo (os ids do mundo mudaram), fica guardado em
  `save.slot1.mapa1` e o título avisa; nunca é apagado.
- Impressão digital do mapa (`interaction.test.ts`) atualizada de propósito. 484 testes.

### Ajustes: inventário, fábrica e HUD
- **HUD:** faixa de necessidades sempre à vista no painel (FOME, SEDE, SONO, TEMP), verde/amarelo/vermelho pelos mesmos limites das pílulas; azul no frio. Relógio e pílulas descem junto.
- **Inventário:** com 5+ pilhas, a lista se agrupa por categoria (COMIDA · 2 · 1,2 kg...) em ordem alfabética; linhas mais compactas; sem nada escolhido o rodapé vira só uma dica e a lista ganha espaço; descrição comprida encolhe em vez de ir para trás dos botões.
- **Fábrica:** o que falta aparece por nome ("falta tábua"), nova seção "Falta só uma coisa", dica de fogo só quando não há nada pronto; rodapé compacto quando nada está escolhido (vale também para CORPO e TEMPO sem ação).

### Correção: nada atrás da parede
- Encostado numa parede por fora, o jogador via, destacava e abria recipientes e itens do outro lado (a grade de visão ignora a célula onde o jogador está, e a parede fica nela).
- Agora o `InteractionSystem` só oferece o que não tem parede, janela inteira ou porta fechada entre o jogador e o alvo (`WorldState.wallBetween`, geometria exata). Vale para recipientes, itens, móveis, carros, escadas e desmontar. Nome e destaque também somem. A porta continua oferecida. Cerca baixa não conta; janela quebrada é vão.

### Improvisação (primeira fatia)
- **Fita adesiva no batente** (menu "⋯" de qualquer porta fechada): gasta 1 fita, soma resistência (`IMPROVISE_TUNING.doorTapeHp`) até 25% acima da máxima; não tranca. Salva junto com a vida da porta.
- Falta (só existe `config/ImproviseTuning.ts`): fita/pano em janela, móveis contra porta, alarme de latas, rádio de distração, lanterna na cabeça, corda na janela, mochila escondida, carro.

### Pendências conhecidas
- Geração num Web Worker e decoração assada por chunk (a geração 9×9 leva ~1,5 s no Node, na thread principal).
- Fase de **improvisação** (fita, móveis, alarmes, lanterna na cabeça...) ainda não feita; existe só `config/ImproviseTuning.ts`.
- 12% dos quadrados de 8×8 sem objeto (ruas e quintais); teste de orçamento por chunk e smoke visitando 6 lugares.

---

## Sobrevivência: necessidades, sono, ficha, mapa, moradia, expedição e carro no celular

- **P1 Necessidades**:
  - fome, sede e sono agora sobem devagar, conforme a atividade (parado, andando, correndo, lutando), o peso carregado, o calor (suor), o frio e a roupa;
  - o avanço é em 4 estágios graduais e comer ou beber bem deixa uma reserva;
  - a HUD mostra só o que importa (`config/SurvivalTuning.ts`).
- **P2 Sono de 1 a 10 h**:
  - o seletor mostra a energia ao acordar em cada opção, a qualidade do sono e o que atrapalha (frio, fome, sede, dor, sangue, barulho);
  - dormir na moradia rende mais; barulho forte acorda.
- **P3 Ficha do personagem**:
  - boneco com os espaços de equipamento;
  - cartão do item com proteção, durabilidade, peso, isolamento e acessórios;
  - todos os estados do corpo e os ferimentos (aba FICHA ou tecla P).
- **P4 Minimapa e mapa completo**:
  - ruas, prédios, mata, área explorada, posição e direção do jogador;
  - DEFINIR COMO MORADIA; marcadores com nome e categoria; guia com distância e rumo;
  - tudo salvo (módulo `marks`).
- **P5 Moradia como sistema** (`home/Home.ts`), com resumo lido do estado do mundo:
  - comida e água guardadas e por quantos dias seguram (só o que já foi aberto: olhar não gera loot);
  - camas, fogo, energia, geladeira, segurança (portas trancadas ou pregadas, janelas com tábuas ou quebradas);
  - oficina, armas, munição, remédios, coletores e canteiros, mais um conselho do que falta;
  - em casa o ânimo sobe um pouco;
  - botão MORADIA no mapa, tecla H.
- **P6 Preparar expedição** (`home/Expedition.ts`):
  - destino, distância pelo caminho (ida e volta), tempo no relógio do jogo e hora da volta (avisa se escurece);
  - água e comida levadas comparadas com o gasto previsto (as mesmas contas do corpo);
  - energia na volta, peso, munição, temperatura e chuva, condições do corpo, e o veredito;
  - botão EXPEDIÇÃO no mapa.
- **P7 Carro no celular**:
  - dirigindo, a tela troca para **volante** (arrastar na metade esquerda) e **pedais** (ACELERAR, e FREIO/RÉ: segurar parado dá ré);
  - SAIR e BUZINA continuam; teclado e controle seguem no modo "apontar";
  - um toque em DIRIGIR abre a porta (destranca com a chave), entra e dá a partida; sem chave, indica a ligação direta;
  - estado **FUNCIONANDO / DANIFICADO / INUTILIZADO** no Examinar;
  - carro inutilizado (carcaça, motor destruído) pode ser **desmontado** uma vez (chave inglesa): dá peças, sucata, parafusos, fio e chapa.
- Testes: `sleep`, `character`, `marks`, `home`, `vehicleEasy`, mais o layout dos controles (a pé e dirigindo). São 450 testes.
- Smoke: seletor de sono, ficha, minimapa, moradia, resumo, expedição, pedal e volante por toque de verdade.

### Pendências conhecidas
- **P8 (improvisação entre objetos: lanterna + fita + capacete etc.) ainda não foi feita.** Fica para a próxima etapa.
- No navegador de teste (sem GPU, com a CPU disputada), algumas medições de velocidade do smoke (correr e virar o volante) às vezes ficam abaixo do alvo.
  - Numa rodada limpa passaram.
  - No celular, conferir o volante e os pedais.

---

## Sons gerados pelo jogo (S1: motor, passos, portas, vidro, combate, ferramentas, carros)

Nenhum arquivo de áudio: cada som é **calculado pelo jogo** a partir de uma receita física (ruído
filtrado, ressonância de material, pulso de pressão, grãos). Tudo original. Cada som tem de 3 a 8
**variações** (sementes diferentes), e cada toque ainda sorteia altura e volume, sem repetir a
variação anterior: o mesmo passo nunca soa igual duas vezes.

### O que tem
- `audio/dsp.ts`: sorteio com semente, filtros biquad, ruído rosa e marrom, ressonadores modais,
  grãos, baque, rangido (atrito), voz (pulso glotal e formantes), saturação e eco gerado.
- `audio/recipes/`:
  - **passos** em 14 chãos × 3 andares: grama, terra, cascalho, asfalto, calçada, garagem, madeira,
    cerâmica, carpete, neve, neve funda, molhado, poça e escada;
  - **portas**: abrir, fechar, trancada, portão de enrolar, empurrada, batida (madeira e metal),
    barricada, arrombamento, porta e porta-malas de carro;
  - **vidro**: janela estourando (estalo e cacos), vidro de carro, batida no vidro;
  - **combate**: ar do golpe por peso, acerto em carne (contundente, corte, perfuração, soco), acerto
    em madeira, metal, concreto, plástico, cerâmica e lataria, corpo caindo;
  - **armas de fogo**: 8 classes, cada uma com estalo, estouro, grave e mecânica próprios
    (ferrolho, tambor, bombeada, rajada); recarga por classe, cápsula quicando, clique sem bala,
    arma emperrando e bala na parede, madeira ou metal (com ricochete);
  - **ferramentas e objetos**: martelo, machado, picareta, tábuas, demolição, desmonte, gaveta,
    armário, geladeira e revirar;
  - **carros**: buzina, batida, pneu estourando, arranque falhando, motor pegando, atropelo.
- `audio/SoundCatalog.ts` (108 sons), `audio/SoundMap.ts` (qual som para cada barulho, chão e arma)
  e `audio/spatial.ts` (distância, lado, parede, eco).
- `audio/AudioEngine.ts`, no contexto de áudio do Phaser:
  - eco de **rua** e de **cômodo**, com respostas geradas no próprio jogo;
  - **parede no caminho abafa** (tira o agudo e o volume); som de outro andar vem pela escada;
  - limite de 24 vozes e até 20 MB de memória (esquece o menos usado);
  - variações geradas num **worker**, fora da linha do jogo, sem travar. Se o worker falhar, gera
    aos poucos na linha principal.
- `audio/GameAudio.ts` (o diretor) escuta `world:noise`, `player:footstep`, recipientes e pausa, e
  recebe da cena o resultado do golpe/tiro e da recarga. Nenhuma regra do jogo mudou.
- Mudanças mínimas fora do áudio:
  - `world:noise` ganhou `sound?` (o som exato: porta abrindo ou fechando, motor pegando ou não);
  - evento novo `sound:play`;
  - o resultado do combate diz o material do alvo e as janelas que a bala estourou.
- **Botão SOM na pausa**: 100% → 60% → 30% → desligado, salvo no aparelho. Na pausa tudo silencia.

### Testes
- `tests/audio.test.ts` (16 testes):
  - toda receita gera som finito, sem estourar, audível e com duração certa;
  - mesma semente dá o mesmo som; outra semente, outro tom;
  - todo barulho do jogo tem som;
  - toda arma do catálogo tem tiro e recarga;
  - chão com neve, molhado e dentro de casa;
  - distância, parede e lado; variação sem repetir; ciclo do botão SOM.
- `npm run smoke` confere:
  - o motor ligado e o worker gerando;
  - a memória abaixo do limite e sons tocando;
  - o botão SOM na pausa.
- `dev/audiocheck.mjs` toca os 108 sons no navegador e mede o sinal que sai no mestre: nenhum mudo,
  nenhum erro. Com o jogo pausado, o sinal medido é 0.

### S2: clima e ambiente ao vivo (`audio/Ambience.ts`, `recipes/ambience.ts`)
- **Laços sem emenda** (`loopify`), que o diretor mexe ao vivo:
  - chuva: garoa e temporal se misturam pela força;
  - debaixo de teto: batucada no telhado e pingos na calha, com a chuva de fora abafada;
  - vento: rajadas ao vivo e assobio no vento forte;
  - grilos em noite quente (pela janela, se estiver dentro);
  - chama da fogueira e gerador ligado: com lugar, parede e distância;
  - motor do carro: o giro sobe em cada marcha e cai na troca, e fica mais cheio acelerando.
- **Sons soltos**:
  - trovão: perto é rasgo e estrondo, longe é ronco rolando; chega depois do clarão, pela
    distância, e a trovoada fraca ronca sozinha de vez em quando;
  - pássaros com 4 jeitos de cantar: coro de manhã, quase nenhum no inverno;
  - corvos, mais no frio;
  - estalos da lenha;
  - alarme de carro: 4 padrões, e o mesmo carro toca sempre o mesmo.
- Com tempo acelerado (dormindo, ação demorada) não tocam bichos nem estalos.

### S3: zumbis, corpo e mochila (`recipes/zombie.ts`, `recipes/body.ts`)
- **Voz de zumbi** por fonte e filtro (glote e boca), com a garganta estragada: rouca, quebrada,
  com ar demais e gorgolejo. Há quatro tipos: gemido (parado), rosnado (viu você), bote (antes do
  golpe) e último ar (morte).
- **Cada zumbi tem a sua voz**: duas variações e uma altura fixas pela identidade.
- A IA ganhou um gancho opcional `voice`, só para o som. O barulho que os outros zumbis ouvem
  continua igual.
- **Passos arrastados** dos zumbis perto, um a cada ~55 px andados; o rastejante arrasta o corpo.
- **Ataques no jogador**:
  - mordida: dentes, carne rasgando e o molhado;
  - agarrão: a roupa sendo puxada;
  - pancada: mais leve quando a roupa segurou;
  - derrubada: o corpo caindo.
- **Corpo do jogador**:
  - dor quando a vida cai, por qualquer causa;
  - fôlego curto abaixo de 35% de fôlego;
  - coração acelerando abaixo de 35% de vida;
  - comer (crocante ou mole) e beber (goles).
- **Mochila**: zíper ao abrir o inventário, e som de pegar (do chão ou do recipiente).

### Testes (S2 e S3)
- `tests/audio.test.ts` (23 testes), que agora também confere:
  - a emenda dos laços;
  - chuva lá fora × no telhado;
  - grilos e pássaros pela hora e estação;
  - vento, fogo e gerador;
  - o giro do motor;
  - a voz fixa e variada de cada zumbi.
- `dev/ambcheck.mjs` e `dev/zombiecheck.mjs` rodam no navegador. Conferem que:
  - cada laço toca com sinal real;
  - o trovão chega ~1 s depois do raio a 1.500 px;
  - os zumbis gemem com vozes diferentes e arrastam os pés;
  - não há nenhum erro.
- Banco de sons (`dev/soundboard.ts`): 138 sons e 812 variações, com lugar (perto, longe, atrás da
  parede) e eco (rua ou casa).

---

## Clima: estações graduais, neve que acumula e visual do clima refeito

### Núcleo (tempo, calendário, estações)
- 1 dia de jogo ≈ 15 min reais (save antigo de 48 min migra). Calendário persistente (dia, mês, ano,
  dia da semana, estação); pular 5–12 dias no debug simula hora a hora.
- Estações graduais (`sim/Climate.ts`): curvas por data com aviso de aproximação (30/20/14/7/3/1 dias),
  temperatura, chuva, tempestade, neblina, vento, folhas e fase da grama contínuas.
- Frentes com aproximação, auge e dissipação (`sim/Weather.ts`); neve quando esfria; o chão
  (`sim/Ground.ts`) acumula e derrete neve em cm, molha, seca e congela, e tudo vai no save.
- Integrações: corpo molhado, ruído e visão pela chuva/neve, fogo, plantação (geada mata), carro
  (aderência), zumbis e jogador mais lentos na neve funda.

### Visual (refeito para ficar perto das referências, sem textura repetida)
- **Chão pixel a pixel** (`render/weatherShaders.ts`, `render/GroundWeatherLayer.ts`): um shader do tamanho
  da cidade lê o próprio desenho do chão, dados por tile suavizados (`world/weatherCells.ts`) e ruído
  periódico do mundo em várias escalas giradas (`procedural/weatherNoise.ts`). Neve em torrões com lado
  claro e sombra azulada, por material (grama, terra, asfalto com lama e faixas, calçada com juntas);
  velha e derretendo em manchas; geada; chão molhado com brilho; poças esparsas com anéis de gota; gelo;
  folhas caídas no outono; cor da grama por época em manchas (antes trocava tile a tile, em quadrados).
- **Telhados**: um shader por telhado lendo a telha (neve nas fileiras, beiral, cumeeira mais rala).
- **Objetos**: neve seguindo o desenho (tufos de folha, placas no teto/capô), numa folha única (atlas);
  mato, flores e lixo somem debaixo da neve.
- **Céu**: um shader com sombras de nuvem e neblina em camadas (longe some primeiro; dentro da casa do
  jogador não entra). Chuva e neve caem só fora da construção do jogador (vê-se a chuva lá fora sem
  partícula no interior). Raio visível no céu na tempestade. Gradação por clima e hora (luz dourada,
  chuva verde-azulada, neve azulada, noite azulada).
- Desligado quando não há efeito: dia seco de verão não custa nada.

### Testes
- `tests/seasons.test.ts` (1/5/12 dias, transições, neve, derretimento, save) e
  `tests/weatherVisual.test.ts` (ruído periódico sem costura, uniformizado, dados do chão: material,
  fora/dentro, abrigo sem degrau, frente das portas).
- `dev/wxref.mjs`: prints no mesmo enquadramento das imagens de referência (casa inicial, zoom 0,53):
  outono, geada, neve (primeira, fraca, moderada, intensa, acumulada, velha, rua, cidade), degelo,
  primavera, sol, nublado, chuva (fora, dentro, rua), tempestade com raio, neblina.

### Fora deste trabalho
- Tornado, granizo, onda de calor, arco-íris, aurora, poeira e fumaça (eventos novos).

---

## Correções: combate, zumbis, janelas, itens, veículos

### 0. Erro ao abrir com save antigo
- Save de versão anterior podia travar ao abrir (`population`, depois `width`). As opções do save agora
  são completadas com o padrão ao carregar (`loadGame` → `sanitizeSandbox`), e o ouvinte de mudança de
  tela não mexe na câmera se a cena não está ativa.
- Teste: `dev/oldsave.mjs` salva na v0.6.0 e continua na versão nova (mesmo navegador), mudando o
  tamanho da tela durante a carga: sem erros.

### 1. Combate
- **Bater recuando**: sem mira no analógico, o tronco olha para onde se anda, então o golpe ia para trás.
  Agora o golpe vira para o zumbi mais perto **ao alcance** (qualquer lado, mesmo andar, com visão); o
  tiro só corrige dentro de um cone à frente (nunca atira nas costas). Com a mira do analógico, vale a mira.
- Alcance conferido: até o soco alcança antes da patada do zumbi mais comprido (teste).
- **Arma na mão aparece** no desenho do jogador (cano da arma de fogo; cabo + lâmina/cabeça da arma
  branca) e faz o arco no golpe.
- **Impacto e morte**: tranco curto na tela a cada acerto (maior na morte), mais sangue na morte e o
  corpo tomba no sentido do golpe em vez de aparecer de uma vez.
- Testes: golpe recuando acha o zumbi atrás; soco alcança antes da patada; alcance por arma.
  `dev/combat.mjs` (dois zumbis vindo por trás, jogador recuando e batendo) e teste da pistola
  (clique sem bala → recarregar → tiro acerta o zumbi à frente, não o de trás).

### Balanceamento, loot, fabricação, efeitos e ponto 2 (zumbis)
Pedido jogando: golpes fracos demais (20 socos sem saber se o zumbi ia cair), nenhuma arma achada,
fabricação sem sentido (tudo sem bancada), mais efeitos como nas folhas de referência. Escolhas do
jogador: dificuldade "mais difícil", loot "realista", seguir direto para o ponto 2.
- **Dano** (`tests/balance.test.ts` simula a luta com a lógica do jogo): antes soco 47 golpes, faca 23,
  facão 7, machado 6. Agora **soco ~21, faca ~8, facão ~5, taco ~5,5, martelo ~8, machado ~3,3,
  marreta ~3,5** (resistência de cabeça/pescoço/tronco menor; soco 4 contra corpo e 3 contra porta;
  faca de cozinha 10, canivete 7, martelo 11). Corrigido: golpe no pescoço era tratado como pé.
- **Efeitos** (procedurais): barra de quanto falta para o zumbi cair, textos (onde pegou, CABEÇA!,
  CAIU!, causa da morte), respingos que ficam no chão (limite 160), estouro com pedaços na morte,
  clarão em estrela, fumaça, cápsula ejetada e furo de bala na parede, arco do golpe com rastro.
- **Loot** (só pesos): faca no balcão da cozinha ~33% (era ~6%); revólver/pistola e munição no
  criado-mudo; taco no guarda-roupa; ferramenta pesada na oficina ~62%. Casa típica: arma branca ~56%,
  arma de fogo ~13% (era ~9%), munição ~21% (era ~14%). A delegacia não existe no mapa (não mexido).
- **Fabricação**: categorias que abrem/fecham; "Dá para fazer agora" separado por categoria; armas e
  serrar tora exigem bancada (fogueira, tocha, curativos, cordas e ferramentas de pedra continuam à mão);
  bancada do mapa e construída têm "Trabalhar aqui (abre FABRICAR)".
- **Ponto 2 — zumbis**: a patada só acerta com o jogador ao alcance do braço desenhado (antes pegava
  até ~16 px "de longe"); golpe do jogador na preparação atrasa a patada; aviso só do que aconteceu
  (agarrão que falhou de vez em quando, sem repetir o mesmo texto de vários zumbis); ferida que sangra
  deixa sangue no chão. Conferido no navegador: cada aviso de ferida corresponde a uma ferida real.

### 3. Janelas
- Tirar os cacos some com eles na hora (antes só sumiam ao recarregar o trecho do mapa).
- Pular a janela cai sempre num lugar livre, com a mesma regra dos zumbis; do outro lado bloqueado
  (móvel, parede) a opção aparece apagada: "Pular a janela (do outro lado está bloqueado)".
- Quebrar a janela na mão: só arma ou ferramenta protege a mão; garrafa ou lanterna corta como a mão nua.
- Testes: pular cai em lugar livre; `dev/windows.mjs` (quebra, pula ida e volta, tira os cacos).

### 4. Itens: todo item com função, proteção que gasta, ficha com atributos; visual das armas e do tiro
Pedido: cada item com função clara, proteção que funciona de verdade, atributos coerentes; em segundo
plano, armas mais bonitas na mão e tiro melhor. Escolhas: itens sem uso ganham **função simples** com
sistemas que já existem; arma, capacete e colete **aparecem no personagem**. Nenhum item novo.
- **Auditoria** (`tests/itemFunctions.test.ts`): todo item do catálogo tem ao menos uma função (comer,
  vestir, arma, ferramenta, ingrediente, peça de carro, ação...). O que faltava ganhou função simples:
  higiene (escova + pasta, xampu, sabonete; gasta água, dá ânimo), travesseiro na bolsa (sono rende mais),
  prato/tigela/talher/caneca (prato feito ou bebida quente anima mais), aliança/colar/foto (olhar anima
  um pouco), documentos acendem fogo; anel e ouro dizem na descrição que só pesam. Pólvora, xampu e pasta
  são gastos aos poucos. Receitas de **recarregar munição** .38 e 9 mm na bancada (estojos + espoletas +
  pólvora).
- **Proteção que gasta**: patada ou mordida numa parte coberta gasta a roupa daquela parte (a de fora
  mais que a de dentro; roupa resistente gasta menos); se atravessou, pode **rasgar** ("A jaqueta
  rasgou.") e passa a proteger menos até remendar. Números em `config/PlayerTuning.ts` (`CLOTHING_WEAR`).
- **Ficha do item** (painel ITENS) mostra os atributos: proteção contra mordida/arranhão, calor, peso,
  condição; arma branca com dano, alcance, velocidade e durabilidade; arma de fogo com calibre, pente,
  dano, alcance e barulho.
- **Armas na mão** (procedural, `assets/procedural/heldArt.ts`): desenho por tipo (pistola, revólver,
  espingarda, rifle, facas, facão, tacos, machados, ferramentas...), **arma longa segurada com as duas
  mãos**, **pistola com os braços estendidos**; **capacete e colete** aparecem quando vestidos.
- **Tiro**: clarão que ilumina em volta à noite, rastro com brilho visível no escuro, faíscas por cima do
  telhado, coice (o tronco recua; tranco de câmera maior em espingarda e rifle). Todo efeito aparece
  pelo menos um quadro, mesmo com FPS baixo.

### 5. Veículos: defeitos raros e conserto
Pedido: carro pode dar problema, dá para achar peças e consertar, mas carro não quebra fácil (raro).
- Conferido o essencial pelo botão: abrir a porta, ligar (chave ou ligação direta), dirigir, sair.
- **Desgaste**: o motor perde ~1% por km (um tanque cheio ≈ 10%); pneu fura raramente (~1% por km com
  pneus bons, mais se gastos; às vezes numa batida forte). Motor abaixo de 35% pode **morrer andando**
  (acelerando, tenta pegar de novo, com barulho de arranque); abaixo de 50% às vezes **engasga na
  partida**. Números em `vehicles/Driving.ts` (`DRIVE_TUNING`, `CAR_REPAIR`).
- **Conserto** no capô aberto, com peças que já existiam no loot: consertar o motor (peças de motor +
  chave inglesa, 30 min, pode falhar e às vezes estraga a peça), trocar a vela e o óleo (ajudam o motor
  fraco a pegar, com teto), remendar pneu furado (borracha + cola). Mecânica deixa mais rápido e certo.
- **Examinar** lista o que está ruim e como consertar.
- Corrigido: chave de carro, peça de motor ou fio contavam como chave inglesa/alicate; tirar um pneu
  furado dava um pneu bom (agora rende a borracha); o menu de opções cortava na 8ª opção (agora os botões
  alargam para o texto e, no celular deitado, viram duas colunas quando não cabem); o cartão de
  informação comprido não sai pelo topo.
- Testes (`tests/carRepair.test.ts`): raridade do desgaste, pneu fura, motor fraco morre e pega de novo,
  conserto do motor, vela, óleo, remendo, chave de carro não é chave inglesa, examinar e partida.
  `dev/carfix.mjs`: porta → dirigir → pneu fura e motor morre (forçado) → capô → examinar → consertar →
  dirigir de novo.

### HUD de direção
- Painel próprio ao volante (`ui/DriveHud.ts`): velocímetro, barras de gasolina, motor e lataria
  (vermelhas quando ruins) e avisos (motor morreu, sem gasolina, pneu furado, faróis).
- No toque ficam só o volante (joystick), **SAIR** e **BUZINA** (com o nome embaixo); os botões de
  quem está a pé somem. No PC aparece "E: sair · F: buzina". O nome da região não cobre o painel.

### Verificação
- `npm run verificar`: 27 arquivos, 370 testes passando; build ok.
- `npm run smoke`: tudo certo (a checagem de tempo real "teclado move" às vezes falha pela lentidão do
  navegador de teste; passou na repetição).

---

## Zumbis de verdade, dirigir, gerador, andares e cidade expandida (v0.7.0)

Pedido: zumbis **realistas, profundos e persistentes** — cada um um indivíduo no mundo (estados, visão,
audição, memória, corpo por partes, agarrão/mordida/derrubada, portas/janelas/estruturas, grupos,
andares, persistência, LOD e debug) — mais um sistema de **dificuldade separado da IA**, "detalhe máximo"
na arte e na mecânica, e ainda **gerador, dirigir carro, ruído melhor, densidade, 2º/3º/4º andar e mapa
maior** ("o principal é os zumbis"). Desenho técnico em [ZUMBIS.md](ZUMBIS.md).

### Z1 Ruído
- `sim/Noise.ts`: todo som é um evento com tipo (21 tipos: passo, corrida, furtivo, porta, vidro, golpe,
  tiro, batida, demolição, motor, buzina, alarme, gerador, zumbi...), posição, alcance, andar e origem.
  Paredes abafam (contadas na grade de visão), chuva e vento mascaram; quem ouve recebe um **palpite** do
  lugar (erro cresce com a distância e as paredes), nunca a posição exata.
- O jogador também ouve: **arcos na borda da tela** na direção do som ("gemido", "vidro", "motor"...),
  vermelhos quando é perigo (o jogo não tem áudio ainda).

### Z2 Indivíduos, corpo e população
- 17 arquétipos (morador, idoso, caixa, farmacêutico, cozinheiro, mecânico, operário, policial, militar,
  enfermeiro, corredor, morador de rua, executivo...) → cada zumbi sorteia aparência (pele, cabelo,
  roupa e cor por profissão, sapatos, óculos, chapéu, mochila, colete) e traços (força, velocidade,
  coordenação, visão, audição, memória, agressividade, gregarismo) com semente própria.
- Corpo por **11 partes** com integridade (sem barra de vida): perna ruim manca, as duas arrasta/rasteja,
  braço perdido não agarra, cabeça destruída mata; ferimentos antigos de antes do colapso.
- `zombies/Population.ts`: população por prédio e cômodo (densidade por tipo), grupos na rua, 12% de
  corpos antigos; nada nasce perto do jogador nem dentro do abrigo; **nunca** por timer. Save por diferença
  (semente + o que mudou).

### Z3 IA
- Máquina de estados (parado, vagando, alerta, investigando, perseguindo, atacando, agarrando, mordendo,
  perdendo o alvo, procurando, voltando, grupo, cambaleando, caído, levantando, morto).
- Visão com cone e periferia, luz (dia/noite, lanterna, fogo, lanterna do carro), chuva/neblina e linha de
  visão; percebe **acumulando** (de longe demora). Memória do último lugar visto/ouvido; procura em volta.
- Rotas: **campo de fluxo** para quem persegue (uma conta para todos), A* com custo para obstáculo
  quebrável, fila de rotas com orçamento por quadro. Grupos seguem um líder e se chamam com gemidos.
- Níveis de simulação: completo perto, simplificado no meio (0,2 s), longe a cada 2,5 s pela grade.

### Z4 Combate e ambiente
- Ataques do zumbi: patada, **agarrão** (barra de se soltar: empurrar, bater, puxar), empurrão, bote,
  **mordida** (pescoço/cabeça pior; no chão pior ainda), pegar o tornozelo de quem rasteja. Vários
  agarrando = derrubado; no chão com vários em cima não levanta. Mordida quase sempre infecta
  (febre, delírio, morte em 1,5–3 dias).
- O jogador acerta partes do corpo (golpe, tiro, empurrão, atropelo); cambaleio e queda; membro arrancado.
- Portas e janelas: zumbi empurra porta destrancada, **bate** na trancada/barricada (o grupo soma
  força; madeira ≈80 s com 1, ≈11 s com 5), estoura vidro, pula janela quebrada. Estruturas do jogador
  racham e caem (100→80→50→20→destruída, com rachaduras no desenho).
- **Morte explicada**: tela com a causa e o que pesou (cercado, peso demais, sem fôlego, perna ferida,
  barulho, escuro, mordida antiga) e CARREGAR ÚLTIMO SAVE (nunca apagado).
- Botões novos: **EMPURRAR** (G) e **FURTIVO** (C: metade da velocidade, passos quase mudos).

### Z5 Arte e animação
- `assets/procedural/zombieArt.ts`: uma folha própria por zumbi (pernas em 6 quadros, tronco, cabeça,
  braços, corpo deitado) com roupa, sangue, sujeira, decomposição, feridas e membros perdidos; corpo
  morto com poça de sangue que cresce.
- `render/SlotAtlas.ts`: páginas de textura compartilhadas com envio parcial à GPU (o Phaser 4 trocava a
  textura do jogador quando havia mais de 16 texturas na cena).
- Animação: braços caídos vagando e esticados perseguindo, mancar, rastejar, cambalear, piscar ao
  apanhar, cair e levantar.

### Z6 Dificuldade, debug e testes
- `zombies/Difficulty.ts`: 16 ajustes separados da IA (população, corredores, velocidade, força,
  resistência, visão, audição, agressividade, memória, dano, agarrão, grupos, destruição, migração,
  infecção, derrubada) e 4 presets na tela inicial: **Passeio, Sobrevivência, Apocalipse, Extinção**.
- Debug (`?debug`): cones de visão, memória, alvo, rota, busca, líder do grupo, quem bate em quê,
  estragos de portas/janelas/estruturas, "Zumbi aqui", "Bando atrás", "Matar perto", "Congelar IA" e
  números (LOD, rotas/s, campo de fluxo/s, estados, andares).

### V1 Dirigir carro e gerador
- `vehicles/Driving.ts` + `DriveSession.ts`: física de bicicleta (parado não gira), ré apontando para
  trás, gasolina, motor/pneus/lataria pesam; colisão exata da lataria com o mundo; batida amassa e
  machuca; **atropelo** acerta pernas/tronco e derruba; zumbis **cercam o carro parado**, amassam,
  estouram o vidro e agarram pela janela do motorista. Ligação direta (chave de fenda + alicate),
  buzina, faróis à noite, painel (km/h, gasolina, lataria). O carro fora do lugar é camada: a pose vai
  para o save e o porta-malas vai junto.
- **Gerador** (`build/Power.ts`, `PowerSystem.ts`): instalar pelo modo construir, abastecer com galão,
  ligar/desligar (gasto às vezes não pega), gasolina pelo relógio. O motor faz **barulho que chama zumbi
  de longe**; energia no prédio onde está ou no da **extensão** puxada; luz nos cômodos à noite; a
  geladeira segura a comida (envelhece 20% do tempo). Ligado **dentro de casa a fumaça intoxica** (e
  mata dormindo — a tela de morte explica).
- **Coisa pesada nos braços** (gerador, cimento, bateria de carro): vai na mão, anda devagar, sem correr
  nem lutar; serve de ingrediente; PÔR AQUI no porta-malas.

### M1 Andares e cidade expandida
- `world/floors/`: **1º, 2º e 3º andares** (prédios de 4 pavimentos) como **camada**: cada andar fica numa
  faixa fora da cidade, em chunks só dele, com as medidas do prédio; plantas procedurais (casa,
  apartamento sobre loja, escritório) com quartos, banheiro, cozinha, sala e móveis com loot; escada no
  térreo num canto livre e o mesmo vão em todos os andares. A cidade não muda (teste).
- Lá de cima, **uma segunda câmera desenha a rua embaixo** alinhada com o andar: dá para ver os zumbis
  juntando na porta. Janela de andar alto: pular vira queda (torção/fratura; do 3º pode matar).
- Som passa entre os andares **pela escada** (abafado pela laje); zumbis de andares diferentes não se
  enxergam nem se ouvem direto; **sobem e descem** atrás do jogador ou do barulho.
- **Cidade expandida 5×5** (padrão do jogo novo): o miolo 3×3 é idêntico à cidade de sempre (teste compara
  objetos, paredes, prédios e chão) e em volta há um anel de arredores novos; seletor na tela inicial
  (Expandida 5×5 / Clássica 3×3 / Pequena 1×1). Saves antigos continuam na cidade com que foram criados.

### Correções importantes
- **Travada de segundos** perseguindo o jogador em certos pontos: o campo de fluxo guardava distâncias em
  Float32 e entradas velhas do heap nunca eram descartadas (12 milhões de passos, ~8 s num quadro). Agora
  Float64 e cada célula uma vez (teste de regressão).
- Fechar a cena do jogo (carregar save na tela de morte) quebrava ao tirar colisores de um grupo de física
  já desmontado. Cor curta (`#abc`) virava NaN em gradiente.

### Testes e medições
- **338 testes** em 24 arquivos (novos: zumbis, direção, gerador/energia, andares, cidade expandida,
  campo de fluxo).
- Smoke no navegador: IA parada nas checagens antigas + seção de zumbis (percebem, desenhados), andares
  (SUBIR, vista da rua, voltar) e carro (entra, acelera, sai).
- Desempenho (Node, desktop): cidade expandida com andares gerada em ~0,5 s; **723 zumbis** (Sobrevivência)
  a 0,26 ms/quadro em média; **2.521** (Extinção) a 0,67 ms, pior quadro 22 ms. Campo de fluxo: 2,8 ms
  em média (p99 5 ms).

### Pendências conhecidas
- O navegador de teste deste ambiente está rodando a **~4 FPS** (sem GPU): 4 checagens do smoke que medem
  velocidade em tempo real falham (correr, andar pelo teclado, andar com o inventário aberto) — a versão
  v0.6.0 falha 5 do mesmo tipo hoje. FPS de verdade só num aparelho.
- Sem áudio (os sons existem como eventos e aparecem na tela).
- Zumbis não quebram paredes do mapa (só portas, janelas e o que o jogador construiu); não sobem em muros.
- Andares: saves de antes dos andares ganham os zumbis dos andares ao carregar, mas prédios que já
  estavam saqueados no térreo não mudam; não dá para construir escada nova.
- Gerador não carrega aparelhos a bateria (celular, rádio) — só luz e geladeira por enquanto.

---

## Sobrevivência sandbox: itens com função, corpo, ferimentos, veículos, fabricação e construção (v0.6.0)

Pedido: **função real para todos os itens**, veículos saqueáveis com estado, tempo/calendário/clima,
temperatura do corpo e roupas, ferimentos por parte do corpo, fabricação com o que se acha, e poder
**construir e destruir à vontade** (cômodo novo, móveis com função, morar onde quiser). Tudo como
**estado** salvo por cima do mesmo mapa (a impressão digital do traçado continua travada).
Desenho técnico em [SOBREVIVENCIA.md](SOBREVIVENCIA.md).

### S1 Tempo, calendário e clima
- `sim/Calendar.ts`: data (dia, mês, dia da semana, estação do hemisfério sul); começa em 3 de maio (outono).
- `sim/Weather.ts`: clima por hora, determinístico pela semente: céu, nuvens, chuva, neblina, vento e
  temperatura (curva do dia + estação + frente fria); `?mes=7`, `?chuva=2`.
- `render/Atmosphere.ts`: noite escura de verdade com luzes recortadas (aura do jogador, facho da
  lanterna, vela, tocha, fogueira), sombras seguindo o sol, chuva e neblina na tela.
- HUD: dia, hora (exata só com relógio/celular; senão aproximada), data, temperatura e céu. Aba TEMPO
  com previsão quando se ouviu o rádio.

### S2 Corpo, roupas, sono, ações com tempo e save real
- `survival/Body.ts`: fome, sede, cansaço, temperatura corporal, molhado, enjoo e ânimo, ligados entre si;
  `survival/Effects.ts` vira tudo em multiplicadores (andar, correr, fôlego, tempo de ação, golpe, mira, tropeço).
- Roupas por parte do corpo (8 lugares): isolam do frio, protegem de mordida/arranhão, molham, rasgam,
  sujam; bolsos aumentam a carga; mochila alivia o peso sentido.
- Ações de item por **registro** (`interaction/itemActions/`): comer, beber, vestir/tirar, segurar,
  ligar/desligar, trocar pilha, mochila↔bolsos, guardar no recipiente aberto, largar.
- `sim/Actions.ts`: ações com tempo (barra, cancelar andando, relógio acelerado). Dormir (cama, sofá,
  chão; alarme com relógio), descansar sentado. Menu **⋯** com todas as ações por perto.
- `save/SaveGame.ts`: save no aparelho a cada 90 s, ao pausar e no menu; `.bak` (anterior) e `.old`
  (jogo arquivado ao começar outro). CONTINUAR/NOVO JOGO com confirmação. **Nada é apagado.**

### S3 Ferimentos e medicina
- 11 partes do corpo × 10 tipos (arranhão, corte, corte fundo, perfuração, mordida, fratura, entorse,
  queimadura, contusão, caco alojado): sangramento, dor, sujeira, infecção, febre, tempo de cura.
- Efeitos reais: perna ferida manca/não corre, braço ferido deixa tudo lento e o golpe fraco, dor tira
  fôlego e ânimo, infecção dá febre e tira vida.
- Tratamentos com os itens (atadura, gaze, trapo, kit, álcool, iodo, cachaça, sutura, tala, pomada,
  pinça...) e remédios (analgésico, anti-inflamatório, antibiótico, calmante, vitaminas); atadura suja
  precisa ser trocada.
- Perigos sem zumbi: caco de vidro no pé descalço, tropeço correndo exausto ou pesado, **queimadura ao
  pisar no fogo**.

### S4 Mãos, armas, ferramentas, eletrônicos e leitura
- Golpe e tiro de verdade (munição na arma, recarregar pelo calibre, emperrar, barulho), dano por arma,
  condição, corpo e material; mundo destrutível salvo (móveis quebram, portas cedem, janelas estouram).
- Ferramentas: desmontar móveis, cortar árvore, quebrar pedra, arrombar, chaves que abrem a casa/carro
  mais perto, trancar por dentro, pular janela, tirar e juntar cacos.
- Lanterna (de mão e de cabeça), vela, rádio (boletim e previsão), celular, relógio, mapas.
- Leitura e 9 habilidades (manuais sobem o nível e dobram o aprendizado; ler precisa de luz).

### S5 Veículos
- Cada carro/van/carcaça com estado da semente e salvo quando mexido: portas, porta-malas, capô,
  vidros, trancas, gasolina, bateria, motor, 4 pneus, alarme.
- Porta-luvas, bancos da frente e de trás e porta-malas com loot persistente (só com a porta certa
  aberta ou o vidro quebrado); tirar gasolina com mangueira, abastecer, bateria e pneus; examinar;
  "tentar ligar" diz o que falta (dirigir é etapa futura).

### S6 Fabricação, fogo, cozinha e água
- `crafting/Recipes.ts` (dados) + `crafting/Crafting.ts` (confere reservando item por item, gasta,
  desgasta ferramentas e entrega): **69 receitas** — cozinha (25), bebidas, água, fogo e luz, curativos,
  materiais (inclui metal na bancada), ferramentas de pedra, armas improvisadas, construção e móveis.
  Ingredientes com alternativas, doses (água, álcool) e consumíveis medidos (sal, café, fita, cimento,
  gasolina: sobra o que não foi usado e o saco pesa menos).
- Estações: **fogo** (fogueira acesa, fogão a lenha aceso ou fogão do mapa enquanto houver gás),
  **forno** (fogão com gás ou a lenha) e **bancada** (do mapa ou construída).
- Aba **FABRICAR**: o que dá para fazer agora primeiro; tocar abre o que leva (✓/✗) e o botão FAZER.
- 24 pratos e bebidas novos (carne assada, arroz, feijão, sopa, pão, pizza, bolo, café, chá, suco...);
  prato quente anima, café tira sono, chá acalma; ingrediente estragado não "renasce" cozido.
- Fogueira (`build/Fire.ts`, `build/FireSystem.ts`): montar ao ar livre, acender (papel/capim ajudam,
  álcool garante), pôr lenha, apagar; queima pelo relógio, chuva apaga fogo fraco; esquenta o corpo,
  seca a roupa e ilumina a noite.
- Água: torneira/hidrante até o corte (`Sandbox.utilities`, 12 dias; `?agua=0`), caixa da descarga finita
  e suja, juntar chuva no balde/garrafa, purificar com água sanitária, ferver, encher garrafa do balde.
- Ações novas nos itens: COZINHAR/FERVER, CONSERTAR (fita/cola), REMENDAR (kit de costura + pano),
  AFIAR (lima ou pedra), LAVAR (água + sabão; tira sangue só com sabão), RASGAR em trapos, DESMONTAR
  eletrônico em peças, PURIFICAR, ENCHER GARRAFA, JUNTAR CHUVA; tocha.

### S7 Construção, móveis, demolição e horta
- `build/StructureCatalog.ts` (19 peças) + `build/Structures.ts` (estado salvo, por chunk) +
  `build/StructureGeometry.ts` (encaixe). **Modo construir**: prévia verde/vermelha na frente do jogador e
  barra CONSTRUIR/GIRAR/SAIR; parede, porta, janela e cerca encaixam na **borda do tile em que você está**,
  do lado para onde olha (dá para fechar um cômodo andando por dentro); móveis, piso e telhado nos tiles à frente.
- Peças: parede de madeira, de tijolo (cimento, areia, água) e de chapa; cerca; porta (abre, fecha,
  cadeado); janela (vidro ou plástico); piso; **telhado** (abriga da chuva e do frio como dentro de casa);
  cama, cadeira, mesa (guarda 25 kg), bancada (estação e gaveta), caixote (40 kg), estante (60 kg),
  **fogão a lenha** (fogo e forno dentro de casa), **coletor de chuva** e **canteiro**.
- Tudo entra na navegação e na visão dos zumbis, tem colisão e vai para o save (inclusive o que está
  guardado nos móveis). Desmontar com a ferramenta certa devolve material; derrubar com marreta/machado
  devolve menos.
- Mapa: com marreta ou picareta **na mão**, abre-se um vão de um tile em qualquer parede (cerca também com
  machado, serrote ou alicate) — `build/WallCuts.ts` guarda só os trechos cortados. Janelas e portas do
  mapa podem ser **pregadas com tábuas** (e arrancadas).
- Horta (`build/Farm.ts`): plantar sementes, regar (chuva rega), adubar, colher (e ganhar sementes);
  seca em 2 dias sem água, morre em 5, passa do ponto; frio segura. `Sandbox.farming.growthSpeed` (4:
  tomate em 15 dias).

### S8 Integração
- Correções: CONTINUAR quebrava ao restaurar o rádio; fósforo gastava a caixa inteira; desgaste de
  ferramenta de muitos usos se perdia no arredondamento; o menu ⋯ aberto deixava o toque passar para o painel.
- Save de ponta a ponta no navegador: construções, conteúdo dos baús, horta, vão na parede e comida
  voltam depois de recarregar a página e tocar CONTINUAR (save ~2 KB).
- Smoke: a checagem do alvo de item espera a varredura de interação (headless lento) em vez de 500 ms fixos.

### Testes
- **296 testes** (20 arquivos). Novos: clima, corpo, save, saúde, combate, veículos, fabricação (25:
  dados das receitas, reserva de itens, doses, consumíveis medidos, fogo, torneira/descarga, ações de
  reparo) e construção (17: encaixe, cômodo fechado, porta, telhado, canteiro, baú salvo, derrubar
  parede, pregar janela, horta, coletor).

### Desempenho
- Mesmo FPS da versão anterior no navegador de teste (média 14 × 14 medidos lado a lado). Fogo, horta e
  coletor acertam as contas 1×/2 s, não por quadro; só as construções dos chunks carregados são desenhadas.
- Headless nesta máquina roda a ~5–14 FPS: alguns testes de velocidade do smoke (correr, teclado,
  chunks do último setor) falham **também na versão anterior** aqui; não é regressão.

### O que ficou pendente (honesto)
- **Zumbis** ainda não existem (a navegação e a visão já consideram portas, paredes construídas,
  tábuas e vãos abertos).
- **Dirigir** o carro (o estado do motor/gasolina/bateria/pneus já está pronto).
- **Eletricidade/gerador**, pesca, recarregar munição, NPCs e troca.
- Carregar móvel do mapa para outro lugar (hoje: desmontar e reconstruir).
- Prédio de vários andares; telhado construído é por tile (não esconde o interior como o telhado do mapa).
- Luz de lanterna ainda atravessa paredes (sem oclusão).

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
