# Toque de Recolher: guia para sessões do Claude

Jogo de sobrevivência zumbi 2D top-down, **Phaser 4.2 + TypeScript + Vite**, alvo **Android (navegador/PWA → APK)**.
O desenvolvimento é feito **pelo celular** (Claude Code na nuvem). Toda comunicação e todo texto do jogo em **português do Brasil**.

## Regras do projeto

- Uma **etapa** por vez, na ordem de docs/ROADMAP.md (29 etapas; especificação em docs/PLANO-GERAL.md e
  docs/ZUMBIS.md). Etapa grande vira subetapas. Antes de escrever código, analisar o que já existe;
  não reescrever o que funciona.
- Depois de cada etapa: verificar todos os arquivos, procurar e corrigir bugs, checar desempenho e controles,
  garantir que nada que funcionava quebrou, salvar uma versão funcionando (commit), **registrar em docs/FASES.md**.
- **Não alterar o traçado do mapa expandido** sem necessidade. O teste "mapa expandido preservado"
  (`tests/interaction.test.ts`) trava a impressão digital; conteúdo novo entra como camada (portas, itens...).
- Filosofia: sandbox emergente, profundidade de sobrevivência sistêmica (referência: Project Zomboid, sem
  copiar nada). Nada de ondas, hordas por horário ou à noite, spawn perto do jogador, loot infinito, item
  gerado por tempo ou evento que obrigue combate. Consequências vêm dos sistemas (som, luz, peso, ferimento,
  estado do mundo).
- **Nunca** destruir sistemas antigos sem necessidade. Arquitetura modular; nada de arquivo gigante.
- **Nunca apagar um save sem confirmação**; backup automático quando houver save.
- Jogo **original**: não copiar nomes, personagens, mapas, sprites, interface, sons ou textos de outros jogos.

## Antes de entregar qualquer mudança

```bash
cd zumbi
npm run verificar     # tsc estrito + vitest + build
npm run smoke         # Chromium de celular simulado: joga, mede e salva prints em smoke-out/
npm run pacote        # atualiza pacote/toque-de-recolher.zip (usado no Netlify Drop)
```

Olhe os prints de `smoke-out/` antes de dizer que ficou bonito. Headless roda a ~10 FPS: é normal.

## Convenções

- Lógica pura (sem Phaser) em módulos testáveis; Phaser só em `scenes/`, `render/`, `input/touch/`, `ui/`, `entities/*/Player.ts`.
- Números de ajuste em `src/game/config/`. Profundidades (camadas) em `DEPTH`.
- Sprites sempre via `assets.ref(id)`; nunca chave de textura solta. Novo objeto = `PropCatalog` + desenho em `procedural/props.ts`.
- Mapas são dados (`MapData`); a cidade vem de `world/districts/CityGenerator.ts` (setores 72×56 com a
  mesma malha); plantas em `world/buildings/templates.ts`. Os testes de integridade conferem várias
  cidades: todo cômodo acessível pelo jogador e pela grade de navegação.
- O mundo como dado é o `WorldModel` (mapa + chunks + `NavGrid` + `SightGrid`); o Phaser só desenha os
  chunks perto da câmera (`WorldRenderer`). Nada de criar objeto do mundo fora do streaming de chunks:
  conteúdo dinâmico se inscreve em `WorldRenderer.onChunk()` (ver `render/DoorViews.ts`, `ItemViews.ts`).
- O que muda em jogo é **estado** (`sim/WorldState.ts`), nunca o `MapData`. Tudo serializa (save por diferenças).
- Item novo = entrada em `items/ItemCatalog.ts` + ícone em `assets/procedural/items.ts`.
- Coisa interativa nova = provedor em `interaction/` (o botão, o aviso e o destaque já funcionam).
- Ajustes de partida em `config/Sandbox.ts` (com faixa válida). Nada de número de balanceamento solto.
- Ferramentas de debug em `debug/` + `scenes/DebugScene.ts` (só com `?debug`). Cada sistema novo ganha a sua camada.
- Sistemas se falam pelo `EventBus` (tipado em `core/EventBus.ts`).
- HUD trabalha em px CSS (câmera com zoom = DPR). Mundo: 1 tile = 64 px.
- Comentários explicam o **porquê**, em português.
