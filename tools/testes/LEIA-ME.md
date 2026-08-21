# Testes

Harnesses de Playwright + Chromium headless, 390×844. Rodar da raiz do projeto,
depois de `node montar.js`:

    node tools/testes/expteste.mjs     # expedição transacional (19)
    node tools/testes/fugateste.mjs    # ciclo da invasão e fuga (30)
    node tools/testes/baktest.mjs      # backup do save (6)
    node tools/testes/nucleoteste.mjs  # núcleo de governança §30 (50)
    node tools/testes/orqteste.mjs     # orquestrador de tensão §31 (60)
    node tools/testes/memteste.mjs     # memória cognitiva da casa §32 (59)
    node tools/testes/fimteste.mjs     # o final §33 (18)
    node tools/testes/aberturateste.mjs # a abertura narrada e a guarda do save (14)

Fumaça no PACOTE, não na cópia de trabalho — descompacte o zip e aponte:

    PACOTE=/tmp/limpo node tools/testes/fumaca.mjs   # (13)
    node tools/testes/varre.mjs 5 400  # varredura ampla: estouros e invariantes
    node tools/testes/cacaexp.mjs 6 12 # caçador de estouros na expedição

`varre` e `cacaexp` embrulham **toda função global do jogo** num `try/catch` que
registra quem estourou. Foi assim que a colisão de `capacidade` apareceu: ela não
produz erro na carga, só na hora de jogar.

    node tools/colisoes.mjs            # lista colisões de nome de topo

A trava de colisão também roda dentro de `montar.js` e **quebra o build**.

## Notas de armadilha

- **Bloco ANEXA a um save; bloco nunca CRIA um save.** Onze blocos embrulham
  `salvar()` e gravavam com `JSON.parse(localStorage.getItem(CHAVE)||'{}')`.
  Esse `||'{}'` cria save de partida que não começou, e foi assim que a
  abertura narrada sumiu por várias versões sem dar erro nenhum.
- Os harnesses agora falam com `http://127.0.0.1:8900`. Suba o servidor antes:
  `node tools/servidor.mjs . 8900`. Em `file://` o `fetch` é bloqueado e
  qualquer teste que leia mídia falha por motivo errado.
- Não use `pkill` aqui: ele casa com o processo do próprio shell da sessão.

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
