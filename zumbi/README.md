# Toque de Recolher

Jogo **original** de sobrevivência zumbi em 2D, câmera de cima (top-down), feito para **celular Android**.
(Nome provisório — muda em `src/game/config/GameConfig.ts`.)

> Estado atual: **v0.6.0 · sobrevivência sandbox**. Cidade de vários setores em chunks; **406 itens** com
> função real (comer, beber, vestir, segurar, ligar, tratar ferida, ler, recarregar, cozinhar, consertar,
> remendar, afiar, lavar, rasgar, desmontar); loot contextual finito; **dia e noite, calendário, clima e
> temperatura**; corpo (fome, sede, sono, frio/calor, molhado, enjoo, ânimo) e **ferimentos por parte do
> corpo** com tratamento; golpe e tiro contra um mundo destrutível; **carros** com portas, porta-luvas,
> bancos, porta-malas, gasolina, bateria e pneus; **69 receitas** (cozinha, curativos, ferramentas, armas);
> fogueira, água da torneira até o corte, chuva, fervura; **modo construir** (paredes de madeira, tijolo e
> chapa, portas, janelas, piso, telhado, cama, mesa, baú, estante, bancada, fogão a lenha, coletor de
> chuva, horta), **derrubar paredes** do mapa e **pregar tábuas** em janelas; save no aparelho com backup.
> Ainda **não há zumbis** nem direção de veículos. Veja [docs/ROADMAP.md](docs/ROADMAP.md) (ordem das 29 etapas),
> o plano em [docs/PLANO-GERAL.md](docs/PLANO-GERAL.md), o desenho da sobrevivência em
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
| Botão com a mochila: painel **ITENS / FABRICAR / CORPO / TEMPO** | I |
| Modo construir (FABRICAR → CONSTRUIR): ande e vire para escolher o lugar; **CONSTRUIR · GIRAR · SAIR** | — |
| ⏸ pausa (SALVAR, MENU) · ⛶ tela cheia | Esc ou P pausa |

Parâmetros úteis na URL: `?debug` ou `#debug` no fim do link (painel **DBG**: colisões, navegação, chunks, visão/rota, mapa com
teleporte, hora, estado das portas, ruído, gerar item, trancar porta, loot dos recipientes, Dia +1), `?direto` (pula a tela de título), `?toque` (força os controles de toque no PC),
`?setores=1x1` (cidade menor), `?semente=42` (outra cidade), `?hora=20` (começa às 20h),
`?loot=0.5` (metade do loot), `?colapso=90` (mundo 90 dias depois do colapso: comida estragada, remédio vencido),
`?mes=7` (começa no inverno), `?chuva=2` (chove o dobro), `?agua=0` e `?gas=0` (água e gás já cortados).

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
│       ├── vehicles/       estado dos carros
│       ├── crafting/       receitas, fabricação, estações, modo construir
│       ├── build/          construções do jogador, fogo, horta, coletor, vãos em paredes do mapa
│       ├── skills/         habilidades
│       ├── save/           save no aparelho com backup
│       ├── assets/         registro de sprites, atlas, substituição por PNG, arte procedural
│       ├── entities/       personagem (lógica pura + parte visual)
│       ├── input/          intenção do jogador; teclado/mouse; joysticks e botões de toque
│       ├── world/          mapa como dado, cidade (setores), plantas, navegação/visão, desenho em chunks
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
