# Forge Mobile — A Pocket Game Development Environment

Mini ambiente de desenvolvimento de jogos que roda no navegador do celular. Não é um site
explicando engines, não é um curso e não tem botões falsos: você cria projetos e cenas, monta
GameObjects com componentes, escreve scripts, aperta **Play** e a cena executa de verdade —
com física, input, UI, console e projetos salvos no aparelho.

> **Forge Mobile não é a Unity.** Não abre projetos Unity, não executa C# e não usa nenhum
> asset, ícone ou identidade visual proprietária. É um ambiente educacional/de desenvolvimento
> com implementação própria, inspirado em conceitos de engines modernas.

---

## 1. Como executar

O app usa **ES Modules**, então precisa ser servido por HTTP (abrir `index.html` direto pelo
`file://` é bloqueado pelo navegador).

```bash
# na pasta do projeto
python3 -m http.server 8080
# depois abra http://localhost:8080 no navegador
```

Alternativas: `npx serve .`, qualquer hospedagem estática (GitHub Pages, Netlify, Vercel) ou
o servidor HTTP de um app de terminal no próprio Android (Termux).

### Instalar no celular (PWA)

1. Abra a URL no Chrome do Android.
2. Menu ⋮ → **Adicionar à tela inicial** / **Instalar app**.
3. O app abre em modo standalone (sem barra do navegador) e, depois da primeira carga,
   **funciona offline** — inclusive criar, editar, executar e salvar projetos.
   Só recursos online (busca de vídeos/documentação) precisam de internet.

---

## 2. O que existe e funciona

| Área | O que está implementado |
|---|---|
| **Editor** | Barra superior com projeto, salvar, undo/redo, Play/Pause/Stop, busca, configurações e command palette |
| **Hierarchy** | Criar, excluir, duplicar, renomear (duplo toque), pesquisar, selecionar, arrastar para reparentar, hierarquia pai/filho, virtualização acima de 120 linhas |
| **Scene View** | Canvas interativo: pan, pinch zoom, seleção por toque, ferramentas mover/rotacionar/escalar, grade, eixos, gizmos de collider/câmera/luz |
| **Game View** | Renderiza pela câmera principal; ao dar Play a cena executa e aparece aqui |
| **Inspector** | Gerado a partir do schema de cada componente — todo campo escreve na propriedade real, com undo/redo |
| **Componentes** | Transform, Sprite Renderer, Mesh Renderer (simplificado), Rigidbody, Collider, Camera, Light, Audio Source, Script, UI Element |
| **Física** | Gravidade, massa, velocidade, forças, impulsos, restituição, atrito, triggers, sleeping, passo fixo, broad phase sweep-and-prune |
| **Script Editor** | Números de linha, realce de sintaxe, indentação automática, auto-fechamento de pares, busca/substituição, undo/redo, autocomplete, barra de caracteres para teclado virtual, erros com linha |
| **Scripting** | API `start/update/fixedUpdate/lateUpdate/onCollisionEnter/onTriggerEnter/onClick`, `transform`, `Time`, `Input`, `Debug`, `GetComponent`, `Instantiate`, `Destroy`, `Find`, `props` |
| **Console** | Logs, warnings e errors com arquivo:linha e botão que abre o script na linha certa; filtros, agrupamento, busca, buffer circular |
| **Project/Assets** | Pastas `Assets/{Scenes,Scripts,Materials,Textures,Audio,Prefabs,Resources}`, criar/renomear/excluir, importar arquivos, editor de materiais |
| **Prefabs** | Salvar objeto como prefab e instanciar (cópia; ver limitações) |
| **Cenas** | Criar, abrir, salvar, duplicar, renomear |
| **UI Builder** | Text, Button, Image, Panel, Slider, Toggle, Input Field — com âncoras, tamanho, cor, alinhamento e transparência, respondendo ao toque |
| **Persistência** | IndexedDB (fallback para localStorage), autosave, salvar ao sair/ir para segundo plano |
| **Export/Import** | `.zip` (com árvore de pastas real + `project.json`) e `.json` |
| **Learn/Help** | Conceitos curtos, exemplos mínimos e links oficiais — sem sequência obrigatória |
| **Performance** | Perfis de qualidade/energia, resolução dinâmica, overlay de métricas, benchmark, stress test |
| **PWA** | `manifest.json`, service worker, ícones, modo standalone, offline |

### Projeto de demonstração — "Mini Adventure"

Criado automaticamente na primeira abertura. Tem player com física e pulo, chão, plataforma,
inimigo que patrulha, moedas coletáveis (triggers), luz de ponto, câmera que segue, UI de
pontuação e logs no console. Quatro scripts comentados servem de ponto de partida.

---

## 3. API de scripting

Os scripts são **JavaScript**, não C#. Rodar C# de verdade no navegador exigiria um runtime
.NET (WASM), o que contraria o objetivo de um app leve para celular. A API imita os nomes e
o ciclo de vida de uma engine moderna.

```js
// PlayerController.js
let speed = props.speed || 6;      // props vêm do Inspector
let rb;

function start() {
  rb = GetComponent('Rigidbody');
  Debug.Log('pronto em ' + gameObject.name);
}

function update() {
  rb.velocity.x = Input.getAxis('Horizontal') * speed;
  if (Input.jumpDown && rb.grounded) rb.addImpulse(0, 8 * rb.mass);
}

function onTriggerEnter(other) {
  if (other.tag === 'Coin') Destroy(other);
}
```

| Símbolo | Descrição |
|---|---|
| `gameObject` | objeto dono do script (`name`, `tag`, `getComponent()`, `setActive()`, `children`) |
| `transform` | `position`, `rotation` (graus), `scale`, `translate()`, `up`, `right` |
| `props` | valores definidos no Inspector |
| `Time` | `deltaTime`, `fixedDeltaTime`, `time`, `frameCount`, `timeScale` |
| `Input` | `getAxis('Horizontal'\|'Vertical')`, `getKey/getKeyDown/getKeyUp`, `getButton*`, `jump`, `jumpDown`, `pointer` |
| `Debug` | `Log`, `LogWarning`, `LogError` (aparecem no Console com arquivo:linha) |
| `GetComponent(tipo)` / `AddComponent(tipo)` | componentes do próprio objeto |
| `Instantiate(nomeOuObjeto, x, y)` | clona um objeto na cena |
| `Destroy(alvo, atrasoSegundos)` | destrói agora ou depois |
| `Find(nome)` / `FindWithTag(tag)` / `FindAll(tipo)` | busca na cena |
| `Physics` | `gravity`, `setGravity(x, y)`, `overlapPoint(x, y)` |
| `Mathf`, `Vec2`, `Random`, `Color`, `Screen` | utilitários |

Hooks reconhecidos: `start`, `update`, `fixedUpdate`, `lateUpdate`, `onDestroy`,
`onCollisionEnter`, `onCollisionExit`, `onTriggerEnter`, `onTriggerExit`, `onClick`.

### Sandbox e proteção contra travamento

* Cada script é compilado **uma vez** (cache por versão do arquivo) numa função cujos parâmetros
  sombreiam `window`, `document`, `fetch`, `XMLHttpRequest`, `localStorage`, `indexedDB`,
  `navigator`, `Worker`, `setTimeout`, `console` e outros — o código do usuário não alcança o
  dispositivo por acidente.
* Loops `for`/`while`/`do` recebem um guard injetado: se uma chamada passar de **250 ms**, ela é
  abortada com erro no console e o script é desativado, em vez de congelar o app.
* Erros de runtime são reportados com **arquivo e linha reais** e desativam apenas aquele script.

**Limites honestos do sandbox:** `eval` não pode ser sombreado (é palavra reservada em modo
estrito), então código que insiste consegue alcançar o escopo global. Scripts rodam no mesmo
realm JS do editor — isso é uma proteção contra acidentes, **não** uma barreira de segurança
contra código hostil. Loops sem chaves e sem `;` no mesmo nível não são instrumentados.

---

## 4. Arquitetura

Nada de "tudo em um HTML": UI, engine, runtime e persistência são módulos separados.

```
index.html            estrutura do editor (sem lógica)
manifest.json  sw.js  PWA (offline, instalação)
css/
  theme.css           tokens de cor, tipografia, componentes básicos
  layout.css          grid responsivo (portrait/landscape/desktop)
  panels.css          painéis, modais, editor de código
js/
  main.js             bootstrap + splash + service worker
  core/
    Engine.js         único requestAnimationFrame: update → física (passo fixo) → late → render
    Scene.js          raízes + índice de componentes por tipo (base da performance)
    GameObject.js     nó da cena, hierarquia, serialização
    Component.js      base + registro de tipos (schema alimenta o Inspector)
    Transform/… components/  Sprite, Mesh, Rigidbody, Collider, Camera, Light, Audio, UI, Script
    Physics.js        integração, sweep-and-prune, colisão, resposta, sleeping
    Renderer.js       Canvas2D: culling, ordenação, luzes simplificadas, UI, gizmos
    Input.js Time.js Audio.js EventBus.js MathUtils.js
  scripting/
    ScriptEngine.js   compilação, sandbox, mapeamento de linhas, execução com orçamento
    LoopGuard.js      injeção de guard em loops
  project/
    ProjectManager.js criar/abrir/salvar/exportar/importar
    Assets.js         pastas e assets, cache de imagens, importação
    Storage.js        IndexedDB (+ fallback localStorage)
    Zip.js            escrita/leitura de .zip sem dependências
    demo/MiniAdventure.js
  perf/
    Device.js         detecção de hardware e taxa de atualização real
    Quality.js        perfis de qualidade e energia
    PerfMonitor.js    métricas, resolução dinâmica, aviso de throttling
    StressTest.js     100/500/1000 objetos com números medidos
  editor/
    Editor.js         orquestra tudo (seleção, comandos, undo, play, salvar)
    Hierarchy.js Inspector.js SceneView.js GameView.js ProjectPanel.js
    ScriptEditor.js Console.js History.js Commands.js SettingsPanel.js Learn.js
    ui/Modal.js
tools/
  make_icons.py       gera os ícones do PWA
  make_zip.sh         empacota o app em dist/forge-mobile.zip
```

---

## 5. Performance — perfil POCO X7 Pro

Hardware de referência: MediaTek Dimensity 8400-Ultra, GPU Mali-G720, LPDDR5X, UFS 4.0,
AMOLED 2712×1220 até 120 Hz, HyperOS 2.

O detector procura Android + assinatura de resolução + núcleos/memória e ativa o
**POCO X7 PRO OPTIMIZATION PROFILE**. Não existe API que informe o SoC, então o perfil também
pode ser forçado em *Settings → Performance → Perfil recomendado*. O aparelho **não** é tratado
como fraco: o alvo é qualidade alta + estabilidade.

**Ponto de partida do perfil:** Resolution Scale 90% · FPS 60 (90/120 disponíveis) ·
Graphics High · Shadows Low · Particles Medium · Post Processing Off · Texture Quality High ·
Dynamic Resolution ON · Object Pooling ON · Lazy Loading ON · Debug Overlay OFF · Battery Balanced.

### Cada otimização: que problema resolve, como medir, qual o custo

| Otimização | Problema | Como medir | Custo |
|---|---|---|---|
| Índice de componentes por tipo na Scene | varrer a árvore a cada frame é O(n) por sistema | `obj`/`rb` no overlay, `frame` em ms | memória extra por tipo (Sets) |
| Passo fixo com acumulador | física dependente do FPS muda o comportamento do jogo | comportamento igual em 30/60/120 FPS | até 5 sub-passos por frame |
| Sweep-and-prune em X + sleeping | teste O(n²) de colisão derruba o FPS | `pairs` no overlay, `phys` em ms | um sort por passo |
| Redesenho só quando sujo (editor) | editor parado gastando GPU sem motivo | `render` ~0 ms parado | invalidação manual em cada interação |
| Resolução dinâmica | picos de carga estouram o frame time | `res @xx%` no overlay | leve perda de nitidez nos picos |
| Redução temporária durante o arrasto | latência do toque ao mover objetos | resposta ao arrastar | Scene View menos nítida durante o gesto |
| Compilação única dos scripts | reinterpretar por frame é desperdício puro | `script` em ms no overlay | cache invalidado ao salvar |
| Gutter/realce em poucos nós de DOM | 10.000 linhas = 10.000 elementos = travamento | `dom` no overlay | realce desligado acima de 3.000 linhas |
| Virtualização da Hierarchy | árvores grandes re-renderizadas inteiras | `dom` + fluidez do scroll | complexidade no scroll |
| Buffer circular do console (5.000) | log em loop consome memória e DOM | `dom`, memória | mensagens antigas saem do buffer |
| Limitador de FPS | frames a mais viram calor e bateria | FPS no overlay | teto de fluidez escolhido pelo usuário |

### Performance Monitor

FPS, 1% low, frame time, tempo de script/física/render, draw calls, objetos visíveis/totais,
objetos descartados por culling, corpos físicos acordados, pares de colisão, nós do DOM,
resolução do canvas, escala de resolução e memória JS (quando o navegador expõe).
Referências: **16,67 ms ≈ 60 FPS · 11,11 ms ≈ 90 FPS · 8,33 ms ≈ 120 FPS**.

### Battery / Power Mode

`Battery Saver` 30 FPS · `Balanced` 60 (padrão) · `Performance` 90 · `Ultra Performance` 120.
O limite nunca ultrapassa a taxa de atualização medida da tela. Em segundo plano o Play é
pausado e o projeto é salvo.

### Temperatura e throttling

O navegador **não expõe temperatura** — nenhum número é inventado. O monitor só avisa quando
detecta queda sustentada de desempenho em relação ao pico da sessão, e diz explicitamente que
é um sinal indireto.

### Stress Test e Benchmark

*Settings → Performance → Stress Test* gera 100/500/1000 objetos com física, scripts e UI,
executa e reporta FPS médio, 1% low, frame time, pior frame, tempo de carga da cena, draw calls,
corpos e memória. *Auto Quality* mede por alguns segundos e **sugere** um preset — sem aplicar
nada sozinho.

---

## 6. Armazenamento, export e import

* Projetos ficam em **IndexedDB** (`forge-mobile` → store `projects`), com blobs nativos para
  texturas e áudio. Fechar e reabrir mantém tudo.
* Autosave ~20 s depois de qualquer alteração, ao ir para segundo plano e ao sair.
* **Export .zip**: `project.json` (projeto completo, binários em base64) + a árvore `Assets/`
  com os arquivos reais, legíveis fora do app.
* **Export .json**: arquivo único, mais fácil de versionar.
* **Import**: aceita o `.zip` exportado pelo app ou o `project.json`.
* Sem IndexedDB (modo privado antigo), o app cai para `localStorage` e avisa que binários não
  serão salvos — nada quebra em silêncio.

---

## 7. Limitações conhecidas

1. **Não é Unity**: não abre `.unitypackage`, cenas Unity nem executa C#.
2. **Renderização**: Canvas2D. O `Mesh Renderer` é uma projeção pseudo-3D (faces sombreadas
   por luzes simplificadas), não um pipeline 3D. Não há WebGL/shaders customizados; se o
   WebGL faltar, o app segue funcionando normalmente.
3. **Colliders** são alinhados aos eixos (box/círculo). Girar o objeto muda o desenho, não a
   caixa de colisão. Não há joints nem colisão contínua (CCD).
4. **Prefabs** guardam uma cópia do objeto; instâncias já criadas não são sincronizadas ao
   editar o prefab.
5. **Modelos 3D** (`obj`, `gltf`, `glb`, `fbx`) são importados como arquivo, mas não são
   desenhados — o app avisa ao importar.
6. **Erros de sintaxe** aparecem no console com a mensagem do motor JS, mas sem número de
   linha (o `new Function` do V8 não expõe a posição nesse caso); erros de execução e chamadas
   de `Debug.*` têm arquivo e linha exatos.
7. **Script Editor**: acima de 3.000 linhas o realce é desligado automaticamente para manter a
   digitação fluida.
8. **Sombras/partículas/pós-processamento** existem como controles de qualidade que afetam
   custo e limites do renderer; não há um sistema de partículas com editor próprio.
9. **Web Workers** não são usados hoje: nas cargas medidas, o custo de serializar dados entre
   threads seria maior que o ganho. O ponto de corte está documentado para quem quiser expandir.

---

## 8. Testes executados

Suíte automatizada em Chromium headless (contêiner Linux), com viewport de celular:

* app inicia sem erro de console; splash sai; projeto demo criado (12 objetos, 16 assets);
* **Play**: física move o player (y 2 → −1,81), 6 scripts instanciados, logs no console;
* **Input**: joystick virtual move o player (x −6,00 → −1,76);
* **Stop**: estado do editor restaurado exatamente (y volta a 2, contagem de objetos igual);
* criar GameObject → **Undo** → **Redo** com contagens corretas;
* script com erro de sintaxe é reportado; **loop infinito é abortado em ~253 ms** sem travar;
* erro de runtime reportado com arquivo e **linha exata**; `Debug.Log` idem;
* **persistência**: salvar → recarregar a página → projeto e cena voltam;
* **export .zip** gerado e válido (~52 KB no projeto demo);
* orientação retrato e paisagem, drawers, editor de código, console, project e inspector;
* stress test com 300 objetos concluído com métricas coletadas.

> Os FPS medidos nesse ambiente **não representam o celular**: Chromium headless roda sem
> sincronismo com a tela. Para números reais do POCO X7 Pro, use *Settings → Performance →
> Stress Test / Auto Quality* no próprio aparelho.

---

## 9. Como expandir

* **Novo componente**: crie a classe em `js/core/components/`, estenda `Component`, declare
  `static type/label/schema` e chame `registerComponent()`. O Inspector, a serialização e o
  "Add Component" passam a reconhecê-lo sem mais nenhuma alteração.
* **Nova API de script**: acrescente a entrada em `API_PARAMS` e em `_buildAPI()` no
  `ScriptEngine.js`, e o nome em `API_WORDS`/`COMPLETIONS` do `ScriptEditor.js`.
* **Novo comando**: uma linha em `buildCommands()` (`js/editor/Commands.js`) já aparece na
  command palette e na busca global.
* **Renderer WebGL**: `Renderer.js` expõe uma superfície pequena (`resize`, `render`,
  `screenToWorld`, `worldToScreen`, `stats`) — dá para escrever um backend alternativo e
  escolher por capacidade do aparelho.

---

## 10. Empacotar

```bash
bash tools/make_zip.sh      # gera dist/forge-mobile.zip
python3 tools/make_icons.py # regenera os ícones do PWA
```

O ZIP contém o app inteiro pronto para servir por HTTP.
