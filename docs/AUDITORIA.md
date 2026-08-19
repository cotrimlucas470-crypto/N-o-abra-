# AUDITORIA — Não Abra (v50)

Levantamento do estado do projeto **antes** de qualquer alteração. Esta fase não
mudou uma linha de código: é só o mapa.

---

## 0. O que este projeto é (e o que ele não é)

Antes de tudo, uma correção de premissa, porque metade do vocabulário do
briefing não se aplica aqui:

| o briefing pede | o que existe neste projeto |
|---|---|
| prefabs, cenas, ScriptableObject | **não existe engine.** É JavaScript puro num `<canvas>` 2D |
| colisão, iluminação por área | não há mundo espacial. A "casa" são 9 cômodos num grafo de adjacência |
| corrotinas | `async/await` e `setTimeout` |
| troca de cena | troca do campo `cena.modo` (uma string) e redesenho |
| "posição do jogador" | um inteiro: `cena.casa.voce` (0–8) |

Onde eu não puder confirmar uma hipótese pelo código, digo isso explicitamente
em vez de inventar.

---

## 1. Arquitetura

### 1.1 Um arquivo, um escopo

O jogo é publicado como **um HTML só**. `montar.js` injeta 14 blocos `.js`
dentro de `index.html`, imediatamente antes de `</body>`, na ordem:

```
index.html (corpo do jogo, ~11 000 linhas de <script>)
  └─ v48-som-e-sanidade → s14-mochilas → abertura-narrada → corte-comodo
     → s9-percepcao → audio-manager → s15-qualidade → s16-armazenamento
     → s17-chuva → s18-luz → s19-ficha → s20-armas → s21-corpo → s22-menu
```

**Consequência central, e é ela que explica o bug da Fase 1:** todos esses
blocos compartilham **um único escopo global**. Não há módulos, não há
`import`, não há namespace. São 1 200 nomes de topo num espaço só.

O padrão de extensão usado é o embrulho:

```js
const _orig = funcao;
funcao = function(){ /* ... */ return _orig.apply(this, arguments); };
```

Isso funciona e é deliberado. O problema não é o embrulho — é o que acontece
quando dois blocos escolhem **o mesmo nome sem saber um do outro**. Aí não há
embrulho nenhum: o segundo simplesmente apaga o primeiro, **em silêncio, sem
erro nenhum na carga**, e quem chamava o primeiro passa a chamar outra coisa.

### 1.2 Fluxo de estados

Não há máquina de estados formal. O estado é a string `cena.modo`, atribuída em
**28 lugares diferentes** (`grep "cena.modo='"`). Os valores observados:

```
boot → porta → casa ⇄ vazio → mapa → rua → casafora → mochila
                  ↘ corpo   ↘ olho  ↘ escuta  ↘ conversa  ↘ fim
```

| modo | o que é |
|---|---|
| `casa` / `vazio` | dentro de casa. `vazio` é o que `irPara` deixa, e várias cenas de transição também |
| `porta` | alguém bate; a cena da porta |
| `mapa` | mapa da cidade |
| `rua` | expedição em andamento |
| `casafora` | vasculhando uma casa na expedição |
| `mochila`, `corpo`, `olho`, `escuta`, `conversa` | telas |
| `fim` | fim de partida |

`vazio` é sobrecarregado: é ao mesmo tempo "estou num cômodo" e "estou numa
cena de corte". Quem quiser saber se o jogador está jogável **não pode**
confiar em `cena.modo` sozinho. (Foi o que já tinha quebrado a chuva e a luz em
versões anteriores, e é por isso que o botão de equipamento do §21 usa um sinal
próprio em vez de `cena.modo`.)

**Ciclo Casa → Expedição → Retorno:**

```
menuComodo(id)
  └─ telaMapa() → escolherParceiro(l) → expedicao(l, par)      [modo='rua']
       └─ etapaEntrar → etapaVasculhar    (gera ctx.achados)
            └─ sustoTalvez → encontroRua → fuga                (pode abortar)
            └─ etapaCarga  (escolhe `levar`)   ← ESTOURA AQUI
                 └─ etapaSair → recolher(ctx, levar)           [COMMIT]
                      └─ modo='casa'
```

**Ciclo de Invasão:** `invasao(qtd)` → `turnoJogador(I)` ⇄ `turnoMonstro(I)`,
terminando em `fim('morto')` ou, se o jogador andar para um cômodo com
`saida:true`, em `escapou(I)` → `fim('fuga')`.

### 1.3 A planta da casa

```js
0 SÓTÃO    1 QUARTO    2 DESPENSA
3 OFICINA  4 SALA      5 COZINHA
6 PORÃO    7 ENTRADA   8 QUINTAL
```
Adjacência é distância de Manhattan = 1. `7 ENTRADA` tem `porta:true`,
`8 QUINTAL` tem `saida:true`. Não existe "rua" como lugar jogável durante a
invasão — só como destino de expedição.

---

## 2. Onde o inventário é lido, escrito, serializado e limpo

Não há uma classe de inventário. Há **nove depósitos independentes** dentro de
`S`, cada um com regras próprias:

| depósito | forma | quem escreve |
|---|---|---|
| `S.mochila.itens` | `[{id, q, dur?}]` | `guardar()`, `largar()`, troca de mochila |
| `S.diesel`, `S.comida`, `S.remedio` | números | `recolher()`, `ganhou()`, consumo diário |
| `S.ferra` | `[id]` | `pegarFerra()` |
| `S.mat` | `{id: n}` | `darMat()`, `gastarMat()` |
| `S.armas` | `[id]` | `recolher()`, loot, §20 |
| `S.corpo` | `{slot: id}` | `vestir()`, `desvestir()` (§21) |
| `S.baus` | `{id: {itens, nivel}}` | §16 |
| `S.stash` | `[item]` | sobra da troca de mochila |
| `S.pecas` | `{id: {dur}}` | §15 (durabilidade) |

**Serialização:** `salvar()` grava `localStorage[CHAVE]` como um JSON só. Cada
bloco embrulha `salvar()` para acrescentar os campos dele (o §21 acrescenta
`corpo`, o §19 acrescenta `ficha`, etc.).

**Gatilhos de save** (`marcarSujo()` → debounce de 1 200 ms → `salvar()`):
`gastarHoras`, `ganhou`, `irPara`, `visibilitychange`, `pagehide`, `blur`.
`salvarAgora()` força na hora.

**Ponto crítico para a Fase 1:** `ganhou()` marca sujo, e `ganhou()` só é
chamado **no fim** de `recolher()`. Não existe save no momento da coleta.

---

## 3. O buffer temporário da expedição — a arquitetura que perde loot

```js
// index.html:10036
const ctx = { l, par, risco, mult, achados: [] };
```

`ctx.achados` é criado em `etapaVasculhar` e vive **só na memória**, dentro do
escopo de uma cadeia de `async`. O que o jogador escolhe levar vive num segundo
objeto temporário, `levar`, que é uma variável local de `etapaCarga`.

Nada disso toca `S` até a última função da cadeia:

```js
// index.html:10247 — dentro de recolher()
ctx.achados.forEach((a,i)=>{
  const q=levar[i]||0; if(!q)return;
  if(a.n==='diesel')d+=q;  else if(a.n==='comida')c+=q;  ...
});
S.diesel=trava(S.diesel+d,0,100); S.comida+=c; S.remedio+=r;
```

**Isto confirma a hipótese H2 do briefing, e é a razão de o prejuízo ser total:
qualquer exceção lançada em qualquer ponto entre `etapaVasculhar` e essa linha
apaga 100% do loot da expedição.** Não há commit parcial, não há retomada, não
há registro em disco.

---

## 4. Teleportes e resets de posição

| lugar | o que faz | risco |
|---|---|---|
| `irPara(id)` (10495) | troca de cômodo normal | ok |
| `socorro()` (14853) | **"Voltar pra dentro de casa"** — força `modo='casa'` e `menuComodo` | **é tratamento de erro que teleporta.** Ver §5 |
| `escapou(I)` (16807) | fuga da invasão → `fim('fuga')` | **encerra a partida.** Alvo da Fase 3 |
| `recolher()` (10286) | fim da expedição → `modo='casa'` | ok, mas é o único commit |
| `fim(tipo)` | tela de fim | — |

---

## 5. O vigia (`socorro`) — o "catch genérico" do briefing

Existe sim, e está em `index.html:14837–14875`. Ele dispara por dois caminhos:

1. **Watchdog:** `setInterval` de 2 s; se passarem **14 s** sem nenhum botão
   habilitado na tela e sem ninguém ter pedido pausa, chama `socorro()`.
2. **Erro global:** `addEventListener('error')` e `('unhandledrejection')` →
   `suspeitar()` → espera 6 s → se ainda não houver ação na tela, `socorro()`.

`socorro()` limpa a barra e oferece:
- de dia: **"Voltar pra dentro de casa"** (`modo='casa'`; `menuComodo`)
- de noite: **"Passar a noite e amanhecer"** (`S.dia++`)
- sempre: **"Salvar e recarregar"** (`salvarAgora()` + `location.reload()`)

**Avaliação honesta:** o vigia em si é uma boa ideia — sem ele o jogador ficaria
olhando uma tela morta sem entender nada. O defeito é outro, e é duplo:

1. Ele é a **única** reação a exceção que o jogo tem. O erro não é logado em
   lugar nenhum, não vai pro console com contexto, não é contado. Some.
2. As saídas que ele oferece **descartam o trabalho em curso**. "Voltar pra
   dentro de casa" no meio de uma expedição significa: perdeu tudo. E é
   exatamente o que o jogador relatou.

E há um detalhe cruel: como o commit do loot só acontece no fim, o botão
"Salvar e recarregar" — que promete *"o save está a salvo"* — **salva um estado
que já não contém o loot**. A promessa é verdadeira e inútil ao mesmo tempo.

---

## 6. Colisões de nome global — o defeito estrutural

Varredura automática (`colisoes.mjs`) dos 1 200 nomes de topo. **7 colisões.**

### Intencionais (o bloco preenche um gancho vazio de propósito)

| nome | base | quem substitui |
|---|---|---|
| `gastarArma` | `index.html:4696` — stub `{}` | `s15-qualidade.js:381` |
| `chanceArma` | `index.html:4697` — stub `return p` | `s15-qualidade.js:390` |
| `usarFerra` | `index.html:4698` — stub `return true` | `s15-qualidade.js:432` |
| `passo` | `index.html:470` — passo sintetizado | `v48:385` — sistema com superfícies |
| `vestir` | `s15:403` — só armadura | `s21:134` — 14 slots (sucessor legítimo) |

Estas estão certas: o `index.html` deixa o gancho vazio *esperando* o bloco.

### Acidentais — dois conceitos diferentes com o mesmo nome

| nome | definição A | definição B (vence) | efeito |
|---|---|---|---|
| **`capacidade`** | `index.html:9972` — quantos **kg** você carrega na expedição, recebe o *parceiro* | `s16-armazenamento.js:40` — quantos **slots** um baú tem, recebe o *id do baú* | **CRÍTICO** — ver Fase 1 |
| **`ficha`** | `index.html:869` — desenha uma **linha de UI** `(nome, tag, texto)` | `s19-ficha.js:166` — devolve a **ficha de personagem** `()` | **CRÍTICO** — 20+ chamadas de UI passaram a não desenhar nada |

Nenhuma das duas dá erro na carga. As duas quebram o jogo em silêncio.

---

## 7. Sistemas acoplados indevidamente

1. **Expedição ↔ Armazenamento.** Não deveriam se conhecer, e hoje o §16
   sequestra a função de capacidade da expedição. Acoplamento por acidente de
   nome — o pior tipo, porque não aparece em nenhum diagrama.
2. **Ficha de personagem ↔ renderer de texto.** Idem.
3. **`recolher()` faz nove coisas:** vasculha o resto, cumpre objetivo, sorteia
   estratégia, marca vigiado, **credita o loot**, trata ferimento, sorteia
   encontro com gente, atualiza painel e troca de cena. O commit do inventário
   está enterrado no meio de uma função de 80 linhas cheia de `await`. Qualquer
   coisa antes dele derruba o commit junto.
4. **`socorro()` ↔ tudo.** É um handler global que assume que sempre dá pra
   "voltar pra casa", sem saber em que fluxo o jogo estava.
5. **`cena.modo` como estado único** compartilhado por 28 pontos de escrita e
   lido por chuva, luz, áudio, HUD e corte.

---

## 8. Hipóteses do briefing — veredito

| # | hipótese | veredito |
|---|---|---|
| H1 | exceção no fluxo de coleta caindo num catch que volta pra casa | **CONFIRMADA em parte.** A exceção existe (§ Fase 1) e o `socorro()` oferece voltar pra casa. Mas não é um `catch` no fluxo de coleta: é um watchdog global |
| H2 | inventário da expedição é buffer temporário, commitado só no retorno normal | **CONFIRMADA.** `ctx.achados` + `levar` → só `recolher()` grava. Ver §3 |
| H3 | cena de casa recarregada do save, descartando o coletado | **DESCARTADA.** Nada recarrega o save nesse caminho. `S` fica intacto — o loot nunca chegou a `S` |
| H4 | race entre animação/UI de coleta e troca de estado | **DESCARTADA para este bug.** O estouro é síncrono, na primeira linha de `etapaCarga` |
| H5 | referência perdida ao objeto do jogador, inventário reinstanciado vazio | **DESCARTADA.** `S` é um objeto global único, nunca reinstanciado |
| H6 | item sem entrada válida na tabela (sprite ausente = "imagem de bug") | **DESCARTADA como causa deste bug**, mas **existe um risco real do mesmo tipo** em `fuga()` (`index.html:5421`): `maos().map(id=>CATALOGO[id].n)` estoura se um id não estiver no catálogo. Ver `docs/BUGS.md`.<br>Sobre a "imagem de erro": este jogo **não usa sprites** — tudo é desenhado por função. Não existe *missing texture*. O que o jogador viu foi a tela do `socorro()` |

---

## 9. Como o bug foi reproduzido

`caçaexp.mjs` embrulha **toda função global do jogo** num `try/catch` que
registra quem estourou, e depois roda expedições de verdade (pela porta real:
`escolherParceiro` → `expedicao`), em 6 sementes.

```
expedições: 63 | socorros disparados: 0 | reloads pedidos: 0

FUNÇÕES QUE ESTOURARAM: 2
  capacidade ×28
     Cannot read properties of undefined (reading 'slots')
     args: [null]
  etapaCarga ×28
     Cannot read properties of undefined (reading 'slots')
```

28 estouros em 63 expedições — as 63 menos as que acabaram em encontro antes de
chegar na tela de carga. Ou seja: **toda expedição que chega na tela "O que você
carrega" estoura**, com ou sem parceiro.

E o estouro é na **primeira linha** de `etapaCarga`, antes de `limpar()`:

```js
function etapaCarga(E,ctx){
  const cap=capacidade(ctx.par);      // ← estoura aqui
  limpar();cap2('O que você carrega');
```

Por isso a tela nem chega a ser trocada: o jogador continua vendo o texto do
loot, com a barra de ações vazia, até o vigia disparar 14 s depois. **É
exatamente a foto que o jogador mandou** — o texto da mochila achada, e logo
abaixo "O jogo travou aqui. Isso é bug meu, não é você."

---

## 10. O que ainda não sei

- **Há quanto tempo isso existe.** O §16 entrou na v48; a colisão existe desde
  então. Não tenho como datar melhor sem histórico de release.
- **Se o jogador chegou a completar alguma expedição.** Pelo código, a única
  saída sem passar por `etapaCarga` é terminar em encontro (`fuga` → `recolher`
  direto). Essas expedições creditavam loot reduzido normalmente — o que explica
  o jogo não parecer completamente quebrado.
- **Quantas outras funções do jogo estão sendo chamadas com a assinatura
  errada** por colisões que ainda não aconteceram. A varredura pega as de topo;
  atribuições dentro de blocos (`Objeto.metodo = ...`) não são cobertas.
