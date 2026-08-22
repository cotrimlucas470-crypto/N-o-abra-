# BUGS — varredura completa (v50)

Método: varredura estática de nomes de topo (`tools/colisoes.mjs`), varredura
dinâmica embrulhando **toda função global do jogo** num `try/catch` que denuncia
quem estoura (`tools/testes/cacaexp.mjs` e `varre.mjs`), 755 cliques aleatórios
em 5 sementes cobrindo casa/noite/porta/invasão/expedição, e checagem de
invariantes a cada 20 cliques.

Onde eu não consegui confirmar uma coisa, está escrito que não consegui.

---

## CRÍTICO — perda de progresso, crash, softlock

### C6 · As duas primitivas de decisão nunca usaram o RNG semeado ✅ CORRIGIDO v66
**Onde:** `index.html:816-817`
**O que:** `sortear` e `chance` eram `Math.random()` puro. São **612 chamadas**
(397 `chance`, 215 `sortear`) — praticamente todas as decisões do jogo —
enquanto o gerador semeado existia completo, era salvo em `d.rngEstado`, era
restaurado na carga, e `s30-nucleo.js` declarava a política por escrito.
**Impacto:** nenhum save reproduzia. O `saveId`, a semente por dia e o estado
persistido eram decorativos.
**Correção:** as duas passam por `_ale()`, mais 71 chamadas diretas em 46
funções que decidem estado. Distribuição idêntica — nenhum número mudou.
**Guarda:** `montar.js` quebra a build se saírem da forma semeada. Guarda
verificada plantando a regressão de propósito.

### C7 · Três estados de progresso morriam no recarregamento ✅ CORRIGIDO v66
**Onde:** `salvar()` — `S.objetivos`, `S.tarefas`, `S.vigiou` fora do save.
**Por que passou despercebido:** `carregar()` copia por cima do `S` vivo em vez
de reconstruir, então `salvar()+carregar()` na mesma página preserva até o que
nunca foi gravado. Só `page.reload()` mostra.
**Impacto:** o contador `ignorado` dos objetivos decide se a pessoa sai de
madrugada e morre. Quem estava a 4 passos disso voltava em 0 toda vez que o
jogador fechava o app.

### C8 · `S.infiltrado` virava fantasma depois de qualquer save ✅ CORRIGIDO v66
**Onde:** referência pra dentro de `S.abrigo`; comparação em `desgastarGerador`.
**Impacto:** depois de um recarregamento, `quem('mecânica')!==S.infiltrado` era
sempre verdadeiro e **o Imitador disfarçado de mecânico continuava entregando o
bônus de gerador do mecânico**. Havia remendo em `pistaDoDia` (`p.falso`), mas
só valia lá dentro.
**Correção:** a chave é o nome, como já era em tarefas, laços e dono.

---


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

### M5 · A autoridade do orquestrador era furável ✅ CORRIGIDO
`index.html:16511` — a primeira linha do `checarInvasao` original é
`if(S.dia>1&&chance(riscoInvasao()))return invasao()`. O §31 embrulha a função e
pede permissão antes, mas quando a permissão era **negada** a chamada caía no
original, que sorteava de novo e podia invadir assim mesmo. O orquestrador não
era autoridade, era sugestão. Corrigido zerando `riscoInvasao` enquanto o
original decide — `chance(0)` é falso sempre.

### M6 · Duas das cinco faixas de prioridade estavam vazias ✅ CORRIGIDO
`classeDe` olhava `duracaoTurnos[1]>=20` e as 15 avarias têm todas `[6,40]`:
**toda** avaria era "persistente", e `comum` e `ambiental` nunca continham nada.
Parâmetro morto travestido de design. A faixa agora sai de `pior` e `efeito`,
dados que a `AVARIAS` já tinha. Fica a **ressalva declarada**: a faixa mais
baixa foi pedida como "clima ambiental", e o clima **não** passa pelo
orquestrador — quem cai nela é avaria inerte.

### M7 · `orqTentar` matava o turno no primeiro candidato inelegível ✅ CORRIGIDO
Sorteava um id, pedia permissão, e devolvia `null` se fosse negado — mesmo
quando a negativa era da precondição **daquele** candidato e outros passariam.
Um teste de 500 noites pegou 2 turnos 1 mortos por isso, e com eles a promessa
de "noite nunca zerada por construção" caía pra sorte. Negativa do candidato
agora tira ele do pool e o turno segue; só negativa do turno (vale, cooldown,
orçamento) encerra.

### M8 · A isca da memória era inalcançável em jogo real ✅ CORRIGIDO
`tensaoBaixa` barrava qualquer `ativas().length`. Só que o relógio de turnos do
orquestrador **só anda durante a invasão**, e durante a invasão inteira o id da
criatura está no ar — então a condição nunca podia ser verdadeira jogando. O
teste passava porque montava o estado à mão, que é exatamente o tipo de teste
que não prova nada. Calmaria passou a ser o bicho **longe** (≥ 3 cômodos, num
diâmetro de 4), que é a calmaria que este jogo realmente tem.

---

## BAIXO — código morto, números mágicos

### B4 · Três habilidades com efeito impresso e zero código ✅ CORRIGIDO v66
`costura` (Nice), `escalada` (Juninho) e `corrida` (Kelly) tinham **0 consultas**
no código inteiro. O texto da ficha prometia e o jogo nunca fazia. Ligadas com os
números que a própria ficha já dizia.

### B5 · `p.mem` e `p.escondeu` eram parâmetros mortos ✅ CORRIGIDO v66
`p.mem` — o que cada uma das 12 pessoas sente falta — **lido zero vezes**.
`p.escondeu` — o contador de lata desviada — escrito e nunca lido. Os dois
ganharam efeito observável (a rotina `saudade` e o esconderijo que é descoberto
e volta pra casa).

### B6 · Objetivo órfão e `local` fora da planta ✅ CORRIGIDO v66
Meta de quem saiu do abrigo ficava na lista pra sempre. Pessoa com `local`
inválido sumia de todo cômodo e continuava viva — saneado só no `carregar()`.

---


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
