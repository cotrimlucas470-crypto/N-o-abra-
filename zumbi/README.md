# Toque de Recolher

Jogo **original** de sobrevivência zumbi em 2D, câmera de cima (top-down), feito para **celular Android**.
(Nome provisório — muda em `src/game/config/GameConfig.ts`.)

> Estado atual: **v0.7.0 · zumbis de verdade**. **Zumbis como indivíduos** (17 arquétipos, arte própria,
> corpo por 11 partes sem barra de vida, visão/audição/memória, grupos, portas e janelas que cedem,
> agarrão, mordida, derrubada, infecção, morte explicada) com **dificuldade ajustável** (Passeio,
> Sobrevivência, Apocalipse, Extinção); **som** com direção na tela; **dirigir carro** (atropelo, cerco
> ao carro, ligação direta); **gerador** (luz, geladeira, extensão, barulho e fumaça); **andares** (1º, 2º
> e 3º, com a rua visível lá embaixo e zumbis subindo a escada); **cidade expandida 5×5** com a cidade de
> sempre no meio. Continua tudo da v0.6.0: 406 itens com função, loot finito, corpo, clima, ferimentos,
> 70 receitas, construção, água, save com backup. Veja [docs/ROADMAP.md](docs/ROADMAP.md) (ordem das
> etapas), o desenho dos zumbis em [docs/ZUMBIS.md](docs/ZUMBIS.md), o da sobrevivência em
> [docs/SOBREVIVENCIA.md](docs/SOBREVIVENCIA.md) e o que cada etapa fez em [docs/FASES.md](docs/FASES.md).

Este jogo mora na pasta `zumbi/` e é independente do jogo "NÃO ABRA" que está na raiz do repositório.

---

## Como jogar a versão atual no celular

Há três caminhos, do mais rápido ao mais completo:

1. **Link do Claude (artefato):** a cada etapa eu publico a versão jogável e te passo o link. Abre direto no app.
2. **Netlify Drop (o mesmo fluxo que você já usa):**
   baixe `zumbi/pacote/toque-de-recolher.zip` do GitHub → Chrome → `app.netlify.com/drop` → envie o zip.
   Você recebe um link. Nele, **⋮ → Instalar app**: o jogo abre em tela cheia e na horizontal, como um app.
3. **APK Android (etapa futura):** o mesmo código vira APK com o **Capacitor** (um GitHub Action gera o arquivo).
   Isso fica para quando o jogo tiver o que salvar e o que publicar.

### Controles

| Celular | PC (para testes) |
|---|---|
| Polegar esquerdo: andar (joystick que aparece onde você toca) | WASD ou setas |
| Polegar direito: mirar | segurar um botão do mouse |
| Botão com o bonequinho: correr (liga/desliga) | Shift |
| Botão com a mão: interagir (porta, pegar, abrir, colher, beber na torneira, pôr lenha, dormir...) | E |
| Botão **⋯**: todas as ações por perto (desmontar, pregar tábuas, cozinhar aqui, plantar, regar...) | Q |
| Botão de golpe: atacar com o que está na mão (ou atirar) · botão de recarregar com arma de fogo | F ou espaço · R |
| **EMPURRAR** (afasta/derruba quem está na frente; solta agarrão) · **FURTIVO** (devagar e quase sem barulho) | G · C |
| Escada: **SUBIR/DESCER** · no carro: joystick aponta para onde ir (para trás = ré), Interagir sai, Atacar buzina | E · F |
| Botão com a mochila: painel **ITENS / FABRICAR / CORPO / TEMPO** | I |
| Modo construir (FABRICAR → CONSTRUIR): ande e vire para escolher o lugar; **CONSTRUIR · GIRAR · SAIR** | — |
| ⏸ pausa (SALVAR, MENU) · ⛶ tela cheia | Esc ou P pausa |

Parâmetros úteis na URL: `?debug` ou `#debug` no fim do link (painel **DBG**: colisões, navegação, chunks, visão/rota, mapa com
teleporte, hora, estado das portas, ruído, gerar item, trancar porta, loot dos recipientes, Dia +1), `?direto` (pula a tela de título), `?toque` (força os controles de toque no PC),
`?setores=1x1` (cidade menor), `?semente=42` (outra cidade), `?hora=20` (começa às 20h),
`?loot=0.5` (metade do loot), `?colapso=90` (mundo 90 dias depois do colapso: comida estragada, remédio vencido),
`?mes=7` (começa no inverno), `?chuva=2` (chove o dobro), `?agua=0` e `?gas=0` (água e gás já cortados),
`?zumbis=0` (sem zumbis) ou `?zumbis=2` (o dobro), `?dificuldade=passeio|sobrevivencia|apocalipse|extincao`.

---

## Motor e linguagem: por que Phaser 4 + TypeScript

Você desenvolve **pelo celular, conversando com o Claude Code na nuvem**. O motor certo é aquele em que
o ciclo "pedir mudança → testar no celular" é o mais curto possível. Foram considerados:

| Opção | Por que não (ou por que sim) |
|---|---|
| Unity | Editor pesado, só em PC; não roda neste ambiente; build Android lento. |
| Godot 4 | Ótimo motor e tem editor Android, mas o Claude não consegue rodar e *ver* o jogo aqui; cada teste exigiria gerar e instalar um APK. |
| **Phaser 4 (web) + TypeScript** ✅ | Roda no navegador do celular e sai num link na hora. O Claude compila, abre num Chromium, joga com toques simulados e confere prints antes de te entregar. Vira app instalável (PWA) e, depois, APK via Capacitor. |

- **Phaser 4.2**: motor 2D maduro, com renderizador WebGL novo (mais rápido em celular), física Arcade,
  tilemaps na GPU, partículas, iluminação e filtros (vão servir para a noite e a lanterna).
- **TypeScript**: tipagem estrita. Muitos erros aparecem na compilação, sem precisar rodar o jogo.
- **Vite**: compila o jogo em arquivos estáticos (`dist/`) com caminhos relativos, e o mesmo build funciona
  no Netlify, no GitHub Pages, num artefato ou dentro de um APK.

---

## Comandos

Rodam aqui no ambiente do Claude; você não precisa instalar nada.

```bash
npm install          # uma vez
npm run dev          # servidor de desenvolvimento
npm run verificar    # tipos + testes + build (rodar SEMPRE antes de entregar)
npm run smoke        # abre o build num Chromium de celular simulado, joga e salva prints em smoke-out/
npm run pacote       # gera pacote/toque-de-recolher.zip a partir de dist/
```

---

## Organização

```
zumbi/
├── index.html              página do jogo (tela cheia, toque, erros visíveis na tela)
├── public/
│   ├── manifest.webmanifest  instalação como app (horizontal, tela cheia)
│   ├── icons/                ícones do app
│   └── assets/overrides.json lista de PNGs que substituem a arte provisória (ver docs/ASSETS.md)
├── src/
│   ├── main.ts             cria o jogo
│   └── game/
│       ├── config/         números do jogo e OPÇÕES DE MUNDO (Sandbox.ts)
│       ├── core/           peças sem Phaser: eventos, aleatório com semente, armazenamento, matemática
│       ├── sim/            relógio, calendário, clima, ações com tempo, chunks, ESTADO do mundo
│       ├── items/          catálogo de itens (catalog/), estado/condição, recipientes, inventário
│       ├── loot/           recipientes do mapa, tabelas de loot por lugar, geração persistente
│       ├── nature/         frutíferas e recursos naturais renováveis
│       ├── interaction/    interação por provedores (portas, itens, recipientes, natureza, carros, água,
│       │                   construções, demolição) e ações de item por registro
│       ├── survival/       corpo, efeitos, sono, perigos, laço da sobrevivência
│       ├── health/         ferimentos e tratamentos por parte do corpo
│       ├── combat/         golpe, tiro, alvos destrutíveis
│       ├── vehicles/       estado dos carros, física e sessão de direção
│       ├── zombies/        zumbis: indivíduos, população, sentidos, mente, ataques, ferimentos, dificuldade
│       ├── crafting/       receitas, fabricação, estações, modo construir
│       ├── build/          construções do jogador, fogo, horta, coletor, gerador/energia, vãos em paredes do mapa
│       ├── skills/         habilidades
│       ├── save/           save no aparelho com backup
│       ├── assets/         registro de sprites, atlas, substituição por PNG, arte procedural
│       ├── entities/       personagem (lógica pura + parte visual)
│       ├── input/          intenção do jogador; teclado/mouse; joysticks e botões de toque
│       ├── world/          mapa como dado, cidade (setores), plantas, andares (floors/), navegação/visão, desenho em chunks
│       ├── systems/        câmera, tela/DPR, tela cheia
│       ├── scenes/         Boot → Preload → Título → Jogo (+ HUD e Debug por cima)
│       ├── debug/          ferramentas de debug (só com ?debug)
│       └── ui/             painel de status, avisos, inventário, botões, ícones
├── tests/                  testes automáticos (lógica, controles, integridade do mapa)
├── scripts/                smoke test no navegador, pacote zip, ícones
└── docs/                   arquitetura, assets, roteiro
```

Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Trocar a arte depois

Toda a arte atual é **desenhada por código** (provisória, mas com cara de jogo pronto). Para trocar qualquer
objeto por um PNG seu, **não precisa mexer em código**: coloque o arquivo em `public/assets/` e registre o id
em `public/assets/overrides.json`. Guia completo, com a lista de ids e tamanhos: [docs/ASSETS.md](docs/ASSETS.md).
