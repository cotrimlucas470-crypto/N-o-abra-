# Testes

Harnesses de Playwright + Chromium headless, 390×844. Rodar da raiz do projeto,
depois de `node montar.js`:

    node tools/testes/expteste.mjs     # expedição transacional (19)
    node tools/testes/fugateste.mjs    # ciclo da invasão e fuga (30)
    node tools/testes/baktest.mjs      # backup do save (6)
    node tools/testes/nucleoteste.mjs  # núcleo de governança §30 (50)
    node tools/testes/orqteste.mjs     # orquestrador de tensão §31 (60)
    node tools/testes/memteste.mjs     # memória cognitiva da casa §32 (59)
    node tools/testes/varre.mjs 5 400  # varredura ampla: estouros e invariantes
    node tools/testes/cacaexp.mjs 6 12 # caçador de estouros na expedição

`varre` e `cacaexp` embrulham **toda função global do jogo** num `try/catch` que
registra quem estourou. Foi assim que a colisão de `capacidade` apareceu: ela não
produz erro na carga, só na hora de jogar.

    node tools/colisoes.mjs            # lista colisões de nome de topo

A trava de colisão também roda dentro de `montar.js` e **quebra o build**.

## Notas de armadilha

- `chance` é `const arrow`, **não** é propriedade de `window`. Trocar
  `window.chance` não afeta nada. Pra forçar um resultado, mexa na config
  (`FUGA_CFG`), não na função.
- Várias telas são `async` e limpam a barra de ações enquanto narram. Esperar
  um tempo fixo dá teste instável; espere os botões aparecerem.
- Rodar oito harnesses em paralelo **starva o Chromium**: a abertura tem tempos
  fixos e `#nm` não chega a aparecer. Duas ou três em paralelo, no máximo — a
  falha parece regressão e não é.
- No `pedirPermissao` a ordem das barreiras importa pro teste: cooldown global
  vem antes do de categoria. Pra medir o de categoria isolado, zere o global à
  mão antes de pedir, senão o global mascara.
- A SALA é o miolo da planta: nada fica a mais de 2 cômodos dela, e o diâmetro
  da casa é 4. Teste que precisa de distância grande tem de escolher o par mais
  distante, não chutar dois números.
- `riscoDaArea()` é limitado a 0,9 de propósito: nada neste jogo é certeza.
  Teste que exige o encontro precisa insistir.
