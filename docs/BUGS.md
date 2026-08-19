# BUGS — varredura completa (v50)

Método: varredura estática de nomes de topo (`tools/colisoes.mjs`), varredura
dinâmica embrulhando **toda função global do jogo** num `try/catch` que denuncia
quem estoura (`tools/testes/cacaexp.mjs` e `varre.mjs`), 755 cliques aleatórios
em 5 sementes cobrindo casa/noite/porta/invasão/expedição, e checagem de
invariantes a cada 20 cliques.

Onde eu não consegui confirmar uma coisa, está escrito que não consegui.

---

## CRÍTICO — perda de progresso, crash, softlock

### C1 · `capacidade` do baú apagou a `capacidade` da expedição ✅ CORRIGIDO
**Onde:** `s16-armazenamento.js:40` × `index.html:9972`
**O que:** dois conceitos, um nome. O §16 é injetado depois e vence. A partir daí
`etapaCarga` chamava `BAUS[parceiro].slots`.
**Impacto:** *toda* expedição que chegava na tela "O que você carrega" estourava
na primeira linha, antes de `limpar()`. O jogador ficava com a tela do saque e a
barra vazia até o vigia disparar 14 s depois, e voltava pra casa **sem nada**.
Medido: **28 estouros em 63 expedições**.
**Correção:** renomeado para `capacidadeBau`.
**Risco de regressão:** baixo — 4 chamadas, todas dentro do §16.

### C2 · `ficha()` do §19 apagou a `ficha(nome,tag,texto)` da UI ✅ CORRIGIDO
**Onde:** `s19-ficha.js:166` × `index.html:869`
**Impacto:** 20 e tantas listas do jogo (gente no abrigo, itens do saque,
bancada de armas) **pararam de desenhar**, sem erro nenhum.
**Correção:** a ficha de personagem virou `fichaJogador()`.
**Risco:** baixo — as 16 chamadas estavam todas dentro do §19.

### C3 · Saque só creditado no fim da cadeia ✅ CORRIGIDO
**Onde:** `index.html:10247`, dentro de `recolher()`
**O que:** `ctx.achados` e `levar` eram variáveis locais. Qualquer exceção entre
escolher e creditar apagava 100% do saque.
**Correção:** `S.exped.levar` — dentro do estado salvo, gravado a cada pegada.
Travou? Na próxima abertura o saque volta.
**Risco:** médio — mudou onde o número mora. Mitigado por manter a mesma
referência de objeto, então fuga e susto continuam operando sem alteração.

### C4 · `socorro()` usava "voltar pra casa" como tratamento de erro ✅ CORRIGIDO
**Onde:** `index.html:14853`
**Correção:** com expedição aberta, credita antes de levar pra casa e diz isso na
tela. O vigia continua existindo — sem ele o jogador fica olhando tela morta.

### C5 · Erro global era jogado fora ✅ CORRIGIDO
**Onde:** `index.html:14908-14909` — `try{suspeitar()}catch(x){}`, o objeto de
erro nunca era lido.
**Correção:** `registrarErro()` — console com contexto + anel de 20 em `S.erros`,
mostrado na tela de socorro pro jogador poder relatar.

---

## ALTO — quebra de regra, exploit, dessincronia

### A1 · Fugir da invasão encerra a partida 🔜 FASE 3
**Onde:** `index.html:16720` (`if(PLANTA[dest].saida)return escapou(I)`) e
`16951`; `escapou()` termina em `fim('fuga')`.
**Impacto:** andar para o QUINTAL durante uma invasão acaba a run. Fugir é a
decisão mais natural do mundo e o jogo pune com fim de jogo.
**Correção:** Fase 3 — vira estado jogável com consequências.

### A2 · Save sem backup e escrito em 7 passos ⚠️ ABERTO → corrigido nesta fase
**Onde:** 7 chamadas de `localStorage.setItem(CHAVE, ...)` por `salvar()`, uma
por bloco, cada uma lendo-modificando-gravando a chave inteira.
**Medido:** 7 escritas, 6 `JSON.parse`, 0,41 ms, 1,8 KB por save. **Não há
chave de backup.**
**Impacto real:** o custo é irrelevante (0,41 ms). O risco é a ausência de
backup: uma gravação ruim ou uma migração errada não tem de onde voltar. Se uma
das 7 escritas falhar no meio, a chave fica com um merge parcial.
**Correção aplicada:** backup rotativo antes de sobrescrever + validação na
carga, com volta automática pro backup se o JSON principal estiver quebrado.
**Risco:** baixo — só acrescenta uma chave.

---

## MÉDIO — comportamento inconsistente, UI enganosa, feedback ausente

### M1 · `cena.modo` é sobrecarregado
`'vazio'` significa ao mesmo tempo "estou num cômodo" e "estou numa cena de
corte". 28 pontos de escrita, lido por chuva, luz, áudio, HUD e corte. **Já
causou três bugs distintos** em versões anteriores (chuva latida em 0, luz não
reagindo, botão de equipamento aparecendo na hora errada).
**Plano:** separar `cena.modo` (o que desenhar) de `cena.jogavel` (o jogador
pode agir). Não feito aqui: mexe em 28 lugares e o risco de regressão é maior
que o ganho nesta rodada.

### M2 · Áudio externo falha em `file://`
`audio/chuva.mp3`, `sfx_*.mp3` são buscados por `fetch`, que o Chromium recusa em
`file://`. Cai na síntese, então **não quebra** — mas polui o console e esconde
falhas de verdade. Servido por HTTP funciona. Não corrigido: é limitação do
protocolo, não do código.
**Nota sobre a "imagem de erro" do relato:** este jogo **não usa sprite nenhum**
— tudo é desenhado por função. Não existe *missing texture* aqui. O que o
jogador viu foi a tela do `socorro()`.

### M3 · 47 `addEventListener`, 0 `removeEventListener`
Numa página que nunca desmonta, os listeners vivem o tempo do documento e isso
é aceitável. **Não é vazamento de memória prático** — seria se algo os
registrasse repetidamente, e não é o caso (todos são de carga única). Registrado
para não parecer que passou despercebido.

### M4 · Duas asserções de teste eram cara-ou-coroa ✅ CORRIGIDO no harness
`corte.mjs` comparava com amostrador de 8 ms dois eventos simultâneos por
construção, e media uma animação de 984 ms contra um limite de 1000. Passava ou
falhava por sorte. Corrigido **no teste**, não no jogo — a animação continua com
os mesmos 984 ms.

---

## BAIXO — código morto, números mágicos

### B1 · `sustoAntigo()` é código morto
`index.html:10172` — começa com `if(true)return false;` e não é chamada em lugar
nenhum. 40 linhas.

### B2 · Números mágicos no vigia
`14000` (ms até acusar travamento), `6000` (espera da suspeita), `2000`
(intervalo), `1200` (debounce do save). Sem nome e sem explicação no ponto de
uso.

### B3 · `capacidade` da expedição não valida a mochila
`index.html:9972` — se `mochilaInfo()` devolvesse algo sem `kg`, viraria `NaN`
silencioso. Hoje não acontece porque `mochilaInfo` sempre devolve número.

---

## O que foi verificado e está SÃO

Coisas do checklist que eu procurei e **não** encontrei problema:

- **Acesso a array fora do intervalo:** `comodo(id)` cai na SALA por padrão,
  `maos()` filtra pelo catálogo, `corpo()` limpa slot de item que sumiu,
  `baus()` filtra item sem entrada. Os pontos de risco já têm guarda.
- **Divisão por zero:** `moralMedia()` (`index.html:878`) divide por
  `S.abrigo.length`, mas retorna 70 antes se a lista estiver vazia.
- **Valores negativos / NaN** em diesel, comida, remédio, ruído, água, dia,
  sanidade, moral e peso da mochila: **0 violações** em 755 cliques.
- **Item duplicado ou com quantidade ≤ 0** na mochila e nos baús: **0
  ocorrências** em 755 cliques.
- **Softlock:** **0 disparos do vigia** em 755 cliques depois da correção da
  Fase 1 (antes, era o sintoma principal).
- **`setInterval` multiplicando:** os 6 intervalos do jogo são singletons
  guardados por `if(_x)return` ou por flag de parada. Não se acumulam.
- **`fuga()` e o catálogo:** eu suspeitei que `maos().map(id=>CATALOGO[id].n)`
  pudesse estourar com id fora do catálogo. **Estava errado** — `maos()` filtra
  antes. Não é bug.
- **Compatibilidade de save antigo:** os campos novos da Fase 1 (`exped`,
  `erros`) são ausentes num save velho, e a ausência já é o estado correto.
  Nada a converter.

---

## O que eu não consegui verificar

- **FPS e memória em sessão longa.** Não há instrumentação de quadro no projeto
  e não construí uma. Nada aqui mede degradação depois de horas.
- **Comportamento em outros navegadores.** Tudo foi medido em Chromium headless,
  390×844.
- **Se alguma colisão de nome existe dentro de objetos** (`X.metodo = ...`). A
  varredura pega declarações de topo; atribuição de propriedade não é coberta.
- **Condições de vitória/derrota disparando fora de hora.** Vi `fim()` ser
  chamado em 8 lugares e todos parecem coerentes com o contexto, mas não
  construí um teste que force cada um. O único que eu sei estar errado por
  design é o `fim('fuga')`, que é a Fase 3.
