# v66 — tudo o que estava quebrado

*Pedido: "resolva todos os bugs do jogo, absolutamente tudo". Este documento é a
lista completa, com a prova de cada um e o que ficou de fora — porque dizer
"consertei tudo" sem dizer o que não dava para consertar seria mentira.*

---

## 1. O bug de raiz — 612 decisões fora do gerador da partida

O jogo tem um RNG semeado inteiro e funcionando:

- `criarRNG(seed)` com `next`, `inteiro`, `escolher` e `pesado`
- `semearRNG()` deriva a semente de `(saveId, dia)`
- o estado vai pro save em `d.rngEstado` e volta na carga
- `s30-nucleo.js` **declara a política por escrito**: *"RNG SEMEADO no que decide
  jogo; cosmético fica com `Math.random`."*

Máquina montada, persistida, documentada. E as duas portas de entrada dela:

```js
const sortear = a => a[Math.floor(Math.random()*a.length)];
const chance  = p => Math.random() < p;
```

Contado no arquivo:

```
chamadas de chance() ....... 397
chamadas de sortear() ...... 215
                             ---
                             612 decisões
```

**Nenhuma delas passava pelo gerador.** Todo o aparato determinístico era
decorativo: o `saveId`, a semente por dia, o estado salvo, o replay — nada disso
tinha efeito, porque quem decide as coisas nunca perguntou.

É a mesma forma do estágio `tenso` da sanidade na v65: a promessa escrita e o
código garantindo que ela não vale.

**O conserto.** As duas passam por `_ale()`, que usa o gerador da partida e cai
em `Math.random` só enquanto o `rng` ainda não existe — os blocos são injetados
no fim do `body`, então qualquer chamada de topo que rode antes do §30 precisa de
chão.

Mais **71 chamadas diretas em 46 funções** que decidem estado: loot, clima,
evento do dia, criatura, visitante da porta, trégua do saqueador, quem some do
mundo, resgate, mochila sorteada.

> **Nenhum número de balanceamento mudou.** `_ale()` é uniforme em [0,1) igual a
> `Math.random()`. O que muda é que o resultado para de depender de sorte que o
> save não conhece.

**Uma ficou de fora de propósito**, e está comentada no código: a cauda de reverb
em `gerarImpulso` gera dezenas de milhares de amostras por chamada. Passar isso
pelo gerador gastaria o RNG num laço de áudio e faria a sequência do jogo
depender de o som ter inicializado.

**Guarda de build.** Essa regressão seria um caractere, sem erro, sem teste
vermelho, e só apareceria muito depois como *"esse save não reproduz"*. Então o
`montar.js` agora quebra a build se `sortear`, `chance` ou `_ale` saírem da forma
semeada. Guarda verificada plantando a regressão de propósito:

```
PRIMITIVA DE DECISAO FORA DO RNG SEMEADO:
  chance nao esta na forma semeada esperada
```

---

## 2. Perda de progresso — três estados morriam no recarregamento

`S.objetivos`, `S.tarefas` e `S.vigiou` não estavam no `salvar()`.

**Por que ninguém tinha visto:** `carregar()` não reconstrói o `S` — ele copia as
chaves do save **por cima** do `S` que já está na memória. Então
`salvar(); carregar()` na mesma página preserva tudo, inclusive o que nunca foi
gravado. O teste passa e não prova nada.

Só um `page.reload()` de verdade mostra:

```
ANTES   tarefas:4  objetivos:1  ignorado:4  vigiou:true   infiltrado:"Rafael"
DEPOIS  tarefas:0  objetivos:0  ignorado:—  vigiou:false  infiltrado:null
```

A pior é `objetivos`, e não por pouco. Ela carrega o contador `ignorado`, e é ele
que decide se a pessoa sai de madrugada atrás do que quer e morre:

```js
if(o.ignorado>=9 && chance(.3)){ ...  // sai de casa e não volta
```

**Alguém a quatro passos disso voltava em zero toda vez que o jogador fechava o
app.** O sistema de consequência mais forte do jogo, resetado sem aviso.

---

## 3. O Imitador disfarçado de mecânico ganhava o bônus do mecânico

`S.infiltrado` era uma **referência** para dentro de `S.abrigo`. Depois de
qualquer ida-e-volta por JSON, o abrigo tem objetos novos e a referência aponta
para um fantasma. Nada reclama, nada quebra.

Alguém já tinha tropeçado nisso e deixado o remendo comentado dentro de
`pistaDoDia` — `p.falso` como backup. O remendo funciona **ali dentro**. Fora
dela, ninguém recupera. E em `desgastarGerador`:

```js
if(tem('mecânica') && quem('mecânica')!==S.infiltrado) d*=.55;
```

Depois de um recarregamento esse `!==` é sempre verdadeiro. **A coisa que
substituiu o Rafael continuava cuidando do gerador como o Rafael.**

Agora a chave é o **nome**, como já era em `S.tarefas[p.n]`, em `p.lacos[nome]` e
em `o.dono`. A referência era a única exceção, e era a que quebrava.

---

## 4. Três habilidades prometiam na ficha e não tinham uma linha de código

`ef` é o texto que o jogador lê na ficha da pessoa. Para três das doze, o texto
prometia uma coisa que o jogo nunca fazia. Verificado buscando os pontos de
consulta (`tem('x')` / `quem('x')`) no arquivo inteiro:

| pessoa | habilidade | o que a ficha promete | consultas no código |
|---|---|---|---|
| **Nice** | `costura` | *"Remenda tudo. Reforço não se perde."* | **0** |
| **Juninho** | `escalada` | *"Expedições rendem 25% a mais."* | **0** |
| **Kelly** | `corrida` | *"Expedições fazem menos ruído."* | **0** |

As três agora fazem o que está escrito, **com os números que já estavam
escritos** — os 25% são os 25% da ficha, não um número novo.

Um detalhe da Nice: ela remenda a tábua que soltou **por dano**. A tábua que o
jogador arranca de propósito para virar material continua saindo, porque ali a
perda é escolha dele, e cancelar seria o jogo desfazendo o que ele mandou fazer.

---

## 5. Dois parâmetros mortos

As suas regras proíbem parâmetro morto. Havia dois, nos NPCs.

### `p.mem` — lido zero vezes

As doze pessoas carregam um campo com aquilo de que sentem falta:

> *"a igreja da praça"* · *"a oficina do pai dele"* · *"o cachorro dele, Pipoca"*
> *"a viatura 14"* · *"o posto de saúde"* · *"a torre do morro"* · *"o muro do
> estádio"* · *"a marcenaria na rua de baixo"*

**Nenhuma linha do jogo lia esse campo.** O material mais rico do arquivo de
dados dos NPCs, inerte desde sempre.

### `p.escondeu` — escrito e nunca lido

A pessoa desmoralizada desvia lata da despensa e o contador sobe. Ninguém nunca
lê. Ela podia desviar a campanha inteira sem consequência nenhuma — nem para ela,
nem para a despensa, nem para o jogador.

Agora o esconderijo é real: o terceiro desvio é descoberto e custa laço, e o que
ela guardou volta para a casa quando ela morre.

### E `p.mem` virou uma rotina, por um segundo motivo medido

Numa campanha simulada de 30 dias, o jogador via **5 das 16 rotinas**. Não é
sorte — é gate:

```
conserta  pede avaria      horta   pede canteiro
ajuda     pede doente      lembra  pede morto
```

Numa casa sem crise o poço seca para `{organiza, cozinha, vigia, ensina, reza}`
— que são exatamente as cinco medidas. A explicação bate com o número.

`saudade` não pede nada da casa e vale em toda faixa de moral. É variedade na
casa calma **sem mexer no peso de ninguém**.

---

## 6. Vazamentos e estado inválido

- **Objetivo órfão.** `cobrarObjetivos` fazia `return` quando o dono tinha saído
  do abrigo, e a meta ficava na lista para sempre — sem dono, sem prazo, contando
  `ignorado` que ninguém ia cobrar. Agora encerra junto com a pessoa.
- **`local` fora da planta.** A pessoa some de todo cômodo e continua viva: não
  aparece em lugar nenhum, não dá erro, e o jogador acha que ela sumiu. Era
  saneado só no `carregar()`, então quem recebesse um local ruim durante a
  partida ficava invisível até fechar e reabrir o jogo.
- **`sustoAntigo()`** — 44 linhas começando com `if(true)return false;` e chamada
  de lugar nenhum. Removida; ficava parecendo caminho vivo em toda leitura.

---

## 7. Como conferir

```
node montar.js                      # três guardas de build
node tools/servidor.mjs . 8901
node tools/testes/bugteste.mjs      # 24 asserções, uma por conserto
```

O `bugteste` faz `page.reload()` de verdade — não `salvar()+carregar()`, que é o
que fazia o bug de persistência passar despercebido.

---

## 8. O que NÃO foi consertado, e por quê

Ser honesto sobre isto importa mais do que a lista de cima.

### `cena.modo` é sobrecarregado (BUGS.md M1) — **fica**

`'vazio'` significa ao mesmo tempo *"estou num cômodo"* e *"estou numa cena de
corte"*. São **28 pontos de escrita**, lidos por chuva, luz, áudio, HUD e corte.
Já causou três bugs distintos.

É um gerador de bugs real, e continua lá. Separar `cena.modo` (o que desenhar) de
`cena.jogavel` (o jogador pode agir) mexe em 28 lugares espalhados por sistemas
que não se conhecem, e o risco de regressão é maior que o ganho — ainda mais na
mesma rodada em que 612 decisões mudaram de gerador. **Isto merece uma rodada
só dele, com teste antes.**

### Áudio externo em `file://` (M2) — **não é bug do código**

O Chromium recusa `fetch` em `file://`. O jogo cai na síntese e não quebra.
Servido por HTTP funciona. É limitação de protocolo.

### 47 `addEventListener`, 0 `removeEventListener` (M3) — **não é vazamento**

Numa página que nunca desmonta e onde todos são de carga única, os listeners
vivem o tempo do documento. Registrado para não parecer despercebido.

### Números mágicos no vigia (B2) — **fica**

`14000`, `6000`, `2000`, `1200` sem nome no ponto de uso. É legibilidade, não
comportamento.

### E o sistema de NPC continua sendo o que a auditoria disse que era

A `docs/AUDITORIA-NPC.md` mediu: as pessoas não têm laço de processamento
próprio, não se movem (são teleportadas), e tomam menos de duas decisões por dia
— nenhuma sobre o que elas querem. **Isso não é bug, é o sistema que existe.**
Consertar isso é a missão de NPCs vivos, que é outra coisa e está parada na
Fase 0 esperando o resto do briefing.
