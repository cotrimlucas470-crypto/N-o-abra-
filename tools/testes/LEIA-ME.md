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
    node tools/testes/ouvteste.mjs     # o ouvido na porta §34 + dia 30 (20)
    node tools/testes/falasteste.mjs   # as falas da porta §35 (18)
    node tools/testes/itensteste.mjs   # os verbos das armas §36 (26)
    node tools/testes/saldoteste.mjs   # a linha de saldo §37 (26)
    node tools/testes/santeste.mjs     # a sanidade como sintoma §38 (30)
    node tools/testes/bugteste.mjs     # os consertos da v66 (24)
    node tools/testes/passoteste.mjs    # o passo custa §39 (30)
    node tools/testes/sinaisteste.mjs   # sinais como contrato §40 (33)
    node tools/testes/corpoteste.mjs    # um corpo só §41 (29)
    node tools/testes/pressaoteste.mjs  # pressão, luz e exposição §42 (31)
    node tools/testes/finalteste.mjs   # retorno, achados, cicatriz, tratamento §43-46 (39)
    node tools/testes/somteste.mjs     # o som mais perto da realidade §47 (27)
    node tools/testes/simulacao.mjs    # 250 noites simuladas, sem asserção de gosto (20)
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

- **Nunca troque acento por substituição cega no arquivo inteiro.** JS aceita
  acento em identificador, então `S.ruido → S.ruído` não dá erro de sintaxe:
  dá erro de comportamento, calado. `montar.js` agora quebra o build se achar
  acento em nome de campo ou variável.

- **Bloco ANEXA a um save; bloco nunca CRIA um save.** Onze blocos embrulham
  `salvar()` e gravavam com `JSON.parse(localStorage.getItem(CHAVE)||'{}')`.
  Esse `||'{}'` cria save de partida que não começou, e foi assim que a
  abertura narrada sumiu por várias versões sem dar erro nenhum.
- Os harnesses agora falam com `http://127.0.0.1:8901`. Suba o servidor antes:
  `node tools/servidor.mjs . 8901`. Em `file://` o `fetch` é bloqueado e
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

- Teste de sanidade **com sanidade cheia não prova nada**: `lúcido` produz zero
  por definição, e é o certo. Derrube a sanidade antes de medir qualquer coisa.
- `mexerSan(-22)` sozinho não muda estágio: `v9().escudo` são 30 pontos que
  absorvem a primeira queda inteira. Zere o escudo ou bata duas vezes.
- O jogo dobra letra de propósito em sanidade baixa ("mmais"). Isso **não** é
  bug de digitação — é a linha passando pelo mesmo filtro da narração real.

- **Wrapper de `salvar()` precisa repetir a guarda `if(!S.nomeJogador)return`.**
  A base tem essa guarda; wrapper que grava onde a base não gravaria anexa
  estado vazio a um save de sessão anterior durante o boot. É o save fantasma
  da v60 com outro nome, e o §39 o reintroduziu antes de o teste pegar.
- Wrapper de save **nunca** pode chamar função que CRIA estado (`estadoExp()`,
  `sanEstado()`, e parecidas). Grava só o que já existe.

- Guarda de build que fatia JS com string: o fim de um array é `];` em **início
  de linha**. Procurar o primeiro `];` solto corta no meio — `(S.abrigo||[])[0];`
  casa. A quarta guarda leu 14 de 24 sinais e acusou o inocente.
- `TELLS` é a tabela de sinais das criaturas. `SINAIS` (que já existia) é o
  cheiro de cada lugar da expedição. Nomes parecidos, conceitos opostos.

- `REGIOES`, `PARTES`, `MALES` e `TELLS` só existem **dentro** de `p.evaluate`.
  Usar um deles no escopo do Node dá `ReferenceError` — devolva a lista do
  navegador em vez de referenciá-la de fora.

- Asserção que fixa um estado **temporário** envelhece. `passoteste` afirmava
  que luz e exposição eram "zero declarado" — verdade na Etapa 1, falso depois
  que a Etapa 4 criou os consumidores delas. Teste que quebra porque o jogo
  melhorou precisa ser atualizado, não revertido.

- **Procure se o som já existe antes de escrever um novo.** Eu auditei o
  barramento inteiro e mesmo assim comecei a escrever um `somDePorta` de quatro
  camadas — `somPortaAbrindo` já existia, com **cinco**. Auditar a arquitetura
  não é auditar o catálogo. `grep -n 'function som' index.html` antes.
- Medir o **máximo entre todos os filtros** esconde o filtro que você acabou de
  adicionar. O som da porta tem filtros mais agudos que o de ar, então o máximo
  mal se movia (2763 → 2652 Hz) e a asserção passava pelo motivo errado. Conte
  o filtro pela assinatura dele (lowpass com Q 0,4) e leia o valor desse.
- Asserção de custo com número mágico (`< 4 ms`) mede o jogo inteiro, não a sua
  mudança. `somPortaAbrindo` custa 4,7 ms e **sempre custou**. Meça a diferença
  que você causou: `portaLonge < porta * 1.4`.
