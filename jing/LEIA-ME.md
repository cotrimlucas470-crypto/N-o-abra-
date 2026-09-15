# JING — SALÃO DE ESPELHOS FRAGMENTADOS

Experiência 3D de página única sobre **recuperação mecânica**: um salão escuro
feito de espelhos quebrados onde o espaço, os reflexos e o tempo respondem ao
usuário. Não é uma landing page com cards: é um ambiente navegável em WebGL com
a interface montada *dentro* dele.

> **Peça conceitual de fã.** Nenhum dado oficial de Honor of Kings é afirmado
> aqui. Tudo que dependeria da versão atual do jogo (itens, atributos, frames,
> timings numéricos) está marcado como **CAMPO EDITÁVEL** e mora em um único
> arquivo de configuração. Veja "O que é editável".

---

## Rodar

```bash
cd jing
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # gera dist/
npm run preview    # serve o dist em http://127.0.0.1:4173
```

O `dist/` versionado já está pronto: dá para abrir a experiência servindo essa
pasta em qualquer servidor estático (o `base` do Vite é relativo, então funciona
tanto na raiz quanto numa subpasta). Não abra o `index.html` por `file://` —
módulos ES precisam de HTTP.

Sem dependência de CDN: fontes, shaders e ícone são servidos pelo próprio
projeto. A página abre offline depois do primeiro carregamento.

---

## O que é editável

Todo o conteúdo vive em **`src/data/config.js`**:

| Bloco | O que controla |
| --- | --- |
| `IDENTIDADE` | título, subtítulo, manifesto, CTA |
| `PALETA` | cores (espelhadas em `src/styles/base.css`) |
| `PERSONAGEM` | arte da Jing, altura em cena, quantidade de ecos |
| `HUD` | leituras do sistema, coordenadas, linhas técnicas |
| `INTRO` | textos da abertura cinematográfica |
| `CHRONO` | marcas da linha temporal, estados, cooldown da quebra |
| `CURVA` | os três estágios, progresso, gráfico e tempo estimado |
| `CALCULADORA` | horas totais por nível, presets, limites do deslizante |
| `PROTOCOLO` | etapas do retorno e os três slots de build |
| `MECANICAS` | os seis eixos do Mapa do Reflexo |
| `COMBOS` | sequências, timings descritivos, erros comuns e dicas |
| `FINAL`, `AUDIO`, `SECOES` | cena final, faixas de som, ordem das seções |

### Arte da personagem

Não existe asset oficial no repositório, e nenhuma aparência foi inventada. O
centro da cena é uma **composição de presença**: um volume de luz em pose de
combate implícita, um arco de lâmina na diagonal e uma espiral de cacos
orbitando — mais três ecos temporais que se desfazem com fragmentação e
aberração cromática.

Para usar uma arte real, coloque o arquivo em `public/jing/` e aponte:

```js
export const PERSONAGEM = {
  imagem: 'jing/jing.png', // public/jing/jing.png
  ...
};
```

A textura entra no lugar do volume abstrato e herda o mesmo tratamento
(refração, eco temporal, dissolução). Se o arquivo não existir, a composição
abstrata continua valendo — sem erro de console e sem buraco visual.

### Áudio

`public/audio/` aceita `ambiente.mp3`, `vento.mp3`, `vidro.mp3`, `impacto.mp3`,
`metal.mp3`, `transicao.mp3` e `pulso.mp3`. Enquanto os arquivos não existirem,
o `AudioManager` **sintetiza** equivalentes em WebAudio (drone, vento filtrado,
cacos, pulsos graves), então o botão `SOM: ON/OFF` já funciona de verdade.
O som nunca inicia sozinho — só depois de um gesto do usuário.

---

## Arquitetura

```
jing/
├── index.html              casca semântica + filtro SVG do reflexo
├── vite.config.js          base relativo, code splitting (three / gsap / app)
├── public/                 favicon, slots de áudio e de arte
└── src/
    ├── main.js             composição: perf → palco → componentes → abertura
    ├── data/config.js      TODO o conteúdo editável
    ├── scene/              o salão em WebGL
    │   ├── Stage.js            renderer, câmera, laço único, estado partilhado
    │   ├── ambiente.js         environment map por PMREM, névoa, feixes, luzes
    │   ├── Fragmentos.js       campo de cacos instanciados em 3 camadas
    │   ├── Particulas.js       poeira luminosa com rastro (quads instanciados)
    │   ├── Corredor.js         placas de vidro do salão + piso espelhado
    │   ├── Presenca.js         a presença central e os ecos temporais
    │   ├── Holografia.js       estruturas 3D ancoradas ao layout HTML
    │   ├── EspelhoFinal.js     os cacos se alinham, seguram, e quebram de novo
    │   ├── Pos.js              bloom + DOF + aberração + glitch + grão
    │   ├── geometrias.js       formas de caco, cristais, prismas
    │   └── shaders/            blocos GLSL (ruído, rachaduras, material do caco)
    ├── animations/
    │   ├── timeControl.js      CHRONO MIRROR: o relógio de toda a cena
    │   ├── cameraRig.js        rota Catmull-Rom + parallax de mouse com peso
    │   ├── scroll.js           ScrollTrigger: a câmera atravessa o salão
    │   └── sheen.js            sistema de brilho reutilizável (.sheen)
    ├── components/         uma seção por arquivo, mais cursor, HUD e áudio
    ├── styles/             fontes, base/tokens, HUD, UI, seções
    └── fontes/             woff2 (subconjuntos latin e latin-ext)
```

### Decisões que valem explicação

**Um relógio só.** `animations/timeControl.js` multiplica o `dt` de *todos* os
subsistemas. Quando o usuário arrasta a linha temporal ou aperta QUEBRAR O
TEMPO, os fragmentos ficam lentos de verdade, as partículas esticam em rastro
de verdade e a câmera ganha peso de verdade — nada é animação de número.

**Os cards são objetos 3D.** `Holografia.js` converte o retângulo de cada
elemento HTML em coordenadas de câmera, então a estrutura (prisma, cristal,
icosaedro, moldura de vidro) fica exatamente atrás do conteúdo em qualquer
tamanho de tela. No hover, a distância à câmera diminui de verdade e o salão
ao redor escurece. Os cacos do salão passam *na frente* das estruturas.

**Pós-processamento escrito à mão.** O `EffectComposer` faz ping-pong entre
alvos e perde o depth buffer da passada de cena, que a profundidade de campo
precisa. A cadeia própria (cena → brilho → borrão → passada final) sai mais
barata e permite DOF por profundidade, aberração radial, onda de choque,
glitch temporal, vinheta e grão numa passada só.

**Rotação na GPU.** Cada caco tem semente, eixo, velocidade, brilho e
rugosidade próprios, calculados no vertex shader — centenas de fragmentos
custam poucos draw calls. Só o espelho final interpola matrizes na CPU, porque
precisa de dois estados arbitrários por instância (disperso ↔ alinhado).

---

## Performance

`src/utils/perf.js` classifica o aparelho em quatro perfis e **rebaixa
sozinho** se a média de quadros cair:

| Tier | Partículas | Fragmentos | Pós | Vidro com transmissão |
| --- | --- | --- | --- | --- |
| 3 ALTO | 8000 | 386 | bloom + DOF + FX | sim |
| 2 MÉDIO | 4200 | 272 | bloom + FX | não |
| 1 BAIXO | 1600 | 154 | bloom leve + FX | não |
| 0 MÍNIMO | 500 | 76 | render direto | não |

`prefers-reduced-motion: reduce` entra direto no tier 0, com parallax reduzido,
sem varreduras de brilho e sem movimentos intensos — o conteúdo continua
inteiro. O tier atual aparece no HUD (canto inferior esquerdo).

Sem WebGL, o canvas sai de cena, um aviso aparece e **todo o texto continua
acessível** — a página não quebra.

---

## Acessibilidade

- `prefers-reduced-motion` respeitado em CSS e em JS.
- Navegação por teclado: `Tab` em tudo, setas no Mapa do Reflexo,
  `PageUp`/`PageDown` para pular seções, `Esc`/`Enter`/espaço aceleram a abertura.
- `:focus-visible` com contorno ciano em todos os controles.
- Abas e painéis com `role`, `aria-selected`, `aria-controls` e `aria-pressed`.
- Cursor personalizado só em ponteiro fino; no toque, o cursor do sistema volta.
- Texto claro sobre fundo quase preto, com véu de contraste sob as áreas de leitura.

---

## Atalhos e interações

| Onde | O quê |
| --- | --- |
| Hero | CTA dispara uma transição cinematográfica até o CHRONO MIRROR |
| CHRONO MIRROR | linha temporal arrastável muda a velocidade real da cena |
| CHRONO MIRROR | **QUEBRAR O TEMPO**: congela o salão, onda de choque, cooldown visível |
| Domínio | hover aproxima a estrutura holográfica e escurece o salão |
| Calculadora | resultado em tempo real: `horas totais ÷ horas por dia` |
| Mapa do Reflexo | selecionar um eixo aproxima o objeto e apaga o ambiente |
| Combos | hover em cada passo abre timing, janela, erro comum e dica |
| Final | os cacos se alinham num espelho inteiro — e ele quebra outra vez |
| HUD (direita) | trilha de seções, clicável |

---

## Depuração

Em tempo de execução, `window.__jing` expõe `{ palco, tempo, gsap, ScrollTrigger, perf }`.
Útil para forçar um tier (`__jing.perf.aplicarTier(0)`), disparar a quebra de tempo
(`__jing.tempo.quebrar()`) ou inspecionar a cena (`__jing.palco.cena`).
