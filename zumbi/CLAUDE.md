# Toque de Recolher: guia para sessões do Claude

Jogo de sobrevivência zumbi 2D top-down, **Phaser 4.2 + TypeScript + Vite**, alvo **Android (navegador/PWA → APK)**.
O desenvolvimento é feito **pelo celular** (Claude Code na nuvem). Toda comunicação e todo texto do jogo em **português do Brasil**.

## Regras do projeto

- Uma **etapa** por vez (docs/ROADMAP.md). Não avançar de etapa sem pedido explícito.
- Depois de cada etapa: verificar todos os arquivos, procurar e corrigir bugs, checar desempenho e controles,
  garantir que nada que funcionava quebrou.
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
- Mapas são dados (`MapData`); plantas de construção em `world/buildings/templates.ts`. O teste de integridade do mapa garante que todo cômodo é acessível.
- Sistemas se falam pelo `EventBus` (tipado em `core/EventBus.ts`).
- HUD trabalha em px CSS (câmera com zoom = DPR). Mundo: 1 tile = 64 px.
- Comentários explicam o **porquê**, em português.
