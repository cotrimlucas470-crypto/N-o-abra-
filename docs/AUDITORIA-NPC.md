# Fase 0 — Auditoria dos NPCs

*Levantamento antes de qualquer código. Tudo abaixo foi medido no jogo rodando,
não lido e estimado. Os números vêm de quatro harnesses de medição contra
`index.html` servido em `127.0.0.1`, com 8 pessoas no abrigo e o jogo no dia 14
— o caso realista de meio de campanha.*

---

## Resumo executivo

A frase mais curta que resume a auditoria:

> **A criatura está viva. As pessoas não.**

`moverAmeacas()` (index.html:8463) move as ameaças de local em local entre os
dias, mantém `local`, `dias`, `teVi` e `perto` no save, e faz isso com o jogador
em qualquer lugar do mapa. É exatamente a Regra de Ouro desta missão — *fazer
coisas quando ninguém está olhando* — e o único sistema do jogo que já a cumpre
é o monstro.

As pessoas do abrigo, por contraste, **não têm laço de processamento próprio**.
Elas não têm objetivo no sentido de máquina, não se movem (são teleportadas uma
vez por dia), e menos de duas decisões por dia são tomadas por elas — nenhuma
sobre o que *elas* querem.

E o orçamento de máquina para consertar isso é enorme: **0,043 ms por turno**
com 8 pessoas. O sistema de NPC hoje custa praticamente nada porque
praticamente não faz nada.

---

## 1. Tabela dos NPCs existentes

Todos em `index.html` (arquivo montado). "Fora da tela" = age quando o jogador
não está no cômodo dele.

| # | id / o que é | linha | o que faz hoje | estado próprio | persiste | fora da tela |
|---|---|---|---|---|---|---|
| 1 | **`PESSOAS` — os 12 do abrigo** | 716 | tabela fixa: `n`, `id`(idade), `alt`, `hab`, `ef`, `frase`, `mem`, `fala` | `moral`, `lacos`, `doente`, `local`, `falso`, `objFeito` | **sim** (`abrigo` vai inteiro pro save) | **não** |
| 2 | **`ROTINAS` — a "vida" da casa** | 9371 | 16 cenas de uma linha; 1 ou 2 pessoas por dia fazem uma | nenhum: a rotina não fica gravada em ninguém | não existe pra persistir | **não** — só roda dentro de `cenaDia` |
| 3 | **`OBJETIVOS` — o que cada um quer** | 1921 | 10 metas pessoais; ignorar 9× faz a pessoa sair de noite e morrer | `S.objetivos[]` com `dono`, `feito`, `ignorado` | **NÃO** (§3) | não |
| 4 | **`TAREFAS` — o dia atribuído** | 1701 | 7 tarefas; **quem escolhe é o jogador** | `S.tarefas[nome]` | **NÃO** (§3) | resolve à noite, em lote |
| 5 | **`S.infiltrado` — o Imitador dentro de casa** | 2545 | substitui uma pessoa a partir do dia 5; 7 pistas ao longo dos dias | `S.infiltrado`, `p.falso`, `S.pistasDadas`, `S.infiltradoDesde` | **parcial** — ver §3.2 | não |
| 6 | **`gerarVisitante` — quem bate na porta** | 10828 | monta um visitante por noite, com modelo, sinais e respostas | `S.visitante` | não (é da noite) | não |
| 7 | **`visitaComerciante`** | 6450 | oferece 4 trocas | nenhum | não | não |
| 8 | **`S.casas` — as outras casas no rádio** | 1806 | 3 casas com `vivos`, `estado`, `ajuda` | sim | **sim** | sim, no boletim |
| 9 | **`AMEACAS` — as 6 criaturas** | 8371 | **andam entre locais, lembram que te viram, chegam na sua rua** | `local`, `dias`, `teVi`, `perto`, `naRua` | **sim** | **SIM** |
| 10 | **`S.cachorro` (Pipoca)** | prêmio do Tico | late pra coisa errada antes de todo mundo | `fome`, `vivo` | sim | sim |

**Leitura:** as linhas 9 e 10 cumprem a Regra de Ouro. As linhas 1 a 5 — as
*pessoas*, que é o que esta missão quer consertar — não.

### 1.1 O que uma pessoa é, hoje, em bytes

Medido: **302 bytes por pessoa**, 12 campos:

```
alt · doente · ef · fala · frase · hab · id · lacos · local · mem · moral · n
```

Nenhuma função no estado (verificado: `funcoesNoEstado: []`). Isso é uma boa
notícia para a Proibição nº 4 — o estado de pessoa **já é dado puro**, e o
schema da Fase 1 pode ser anexado sem violar nada.

---

## 2. `Math.random()` em NPC

228 ocorrências em `index.html`. Classificadas pela função que as contém, **16**
estão em código com cara de NPC. Dessas, o filtro que importa é *decide jogo* vs
*cosmético*:

### 2.1 Decide jogo — precisa migrar para `S.rng`

| linha | função | o que decide |
|---|---|---|
| **9506** | **`rotinaDe`** | **`let x=Math.random()*tot`** — a escolha ponderada da rotina. É *a* decisão de NPC do jogo, e é a única não semeada. |
| 1791 | `resolverTarefas` | quanto diesel e quantas latas alguém traz da rua sozinho |
| 3692 | `modeloVisitante` | quais anomalias o mímico carrega |
| 10843, 10868, 10873, 10885 | `gerarVisitante` | respostas ruins, largura do corpo, quais conhecidos são citados, a ordem dos sinais por aprendizado |
| 12396, 12405, 12407 | `mundoPerdeGente` | **quem some do mundo** — decide quem você nunca vai conhecer |
| 15460 | `criaturaDoVisitante` | quais tells a criatura emite |
| 6459 | `visitaComerciante` | quais 4 trocas aparecem |

### 2.2 Cosmético — pode ficar

`falarNatural` (6527, 6534, jitter de digitação), `animarConversa` (16256–7,
para onde o rosto olha), `ligarCasaViva` (15270, ruído ambiente), e a linha 977
que é um laço de ruído de canvas (falso positivo: a variável se chama `laco`).

Isso está de acordo com a política já escrita em `s30-nucleo.js:15` —
*"RNG semeado no que decide jogo; cosmético fica com `Math.random`."*

### 2.3 A boa notícia

`S.rng.pesado(mapa)` **já existe** (index.html, `criarRNG`), com a assinatura
que a Fase 1 pede: `{chave: peso} -> chave`, peso zero nunca sai. Também há
`next()`, `inteiro(n)` e `escolher(lista)`. E `semearRNG()` já reprodutibiliza
por `(saveId, dia)`.

**Nada de novo precisa ser construído para o determinismo.** É migração, não
invenção.

---

## 3. Estado de NPC que não sobrevive ao save

Este item precisou de duas medições, porque a primeira **passou pelo motivo
errado** e eu quase reportei "está tudo certo".

`carregar()` não reconstrói `S`: ele copia as chaves do save **por cima** do `S`
que já está na memória. Então chamar `salvar(); carregar()` na mesma página
preserva tudo — inclusive o que nunca foi gravado. O teste honesto é
**recarregar a página**, que é o que acontece quando o jogador fecha o app.

Com `page.reload()` de verdade:

```
ANTES   tarefas:4  objetivos:1  objIgnorado:4  vigiou:true  infiltrado:"Rafael"
DEPOIS  tarefas:0  objetivos:0  objIgnorado:—   vigiou:false infiltrado:null
```

### 3.1 O que se perde

| estado | o que era | consequência de perder |
|---|---|---|
| **`S.objetivos`** | a meta pessoal de cada um + o contador `ignorado` | **o pior.** Uma pessoa a 4 passos de sair de madrugada e morrer volta em 0. O sistema de consequência mais forte do jogo reseta toda vez que o jogador fecha o app. |
| `S.tarefas` | o dia que o jogador distribuiu | o jogador reatribui tudo, ou a noite resolve com a casa parada |
| `S.vigiou` | o que o vigia viu de tarde | a informação pela qual o jogador pagou um dia de trabalho some |
| `S.resultados` | o relatório da noite | some |
| `S.conversas` | quantas vezes falou com cada um | some |

O que **sobrevive**: `moral`, `lacos`, `doente`, `local`, `falso`, `objFeito` —
porque estes moram no objeto pessoa, e `abrigo` inteiro vai pro save
(index.html:2231) e volta saneado (2282).

### 3.2 O bug de identidade do infiltrado

`S.infiltrado` é uma **referência** a um objeto dentro de `S.abrigo`. Depois de
qualquer round-trip por JSON, `S.abrigo` tem objetos novos e `S.infiltrado`
aponta para um fantasma. Medido: `infiltradoEhObjetoDoAbrigo: true → false`.

Alguém já tropeçou nisso e deixou o remendo comentado em `pistaDoDia`
(index.html:2573): *"depois de um save, a referência pode ter se perdido:
`p.falso` é o backup"*. O remendo funciona — **dentro de `pistaDoDia`**. Fora
dela, ninguém recupera. E há pelo menos um lugar que compara por identidade:

```js
index.html:1897   if(tem('mecânica')&&quem('mecânica')!==S.infiltrado) d*=.55;
```

Depois de um recarregamento esse `!==` é sempre verdadeiro. **O Imitador
disfarçado de mecânico continua entregando o bônus de gerador do mecânico.**

Regra que sai daqui para a Fase 1: **nome é a chave, referência nunca.** Já é
assim em `S.tarefas[p.n]`, `o.dono` e `p.lacos[nome]`; `S.infiltrado` é a
exceção, e é a que quebra.

---

## 4. Parâmetros mortos

### 4.1 `p.mem` — lido zero vezes

Todas as 12 pessoas carregam um campo `mem` com aquilo de que sentem falta:

> `'a igreja da praça'` · `'a oficina do pai dele'` · `'o cachorro dele, Pipoca'`
> `'a torre do morro'` · `'o posto de saúde'` · `'a viatura 14'` …

**Nenhuma linha de código lê `p.mem`.** É o material mais rico do arquivo de
dados dos NPCs e está inerte. (Os `OBJETIVOS` cobrem o mesmo terreno por outro
caminho, mas são uma tabela separada, com nomes chumbados como chave.)

### 4.2 Três habilidades com efeito impresso e sem código

`ef` é o texto que aparece na ficha da pessoa. Para três delas, o texto promete
uma coisa que o jogo nunca faz. Verificado por busca dos pontos de consulta
(`tem('x')` / `quem('x')`):

| pessoa | habilidade | promessa impressa | consultas no código |
|---|---|---|---|
| **Nice** | `costura` | *"Remenda tudo. Reforço não se perde."* | **0** |
| **Juninho** | `escalada` | *"Expedições rendem 25% a mais."* | **0** |
| **Kelly** | `corrida` | *"Expedições fazem menos ruído."* | **0** — `corrida` só aparece como `hab` da tarefa `rua`, onde muda a chance de morrer, não o ruído |

É o mesmo defeito do estágio `tenso` da sanidade: **a promessa está escrita na
tela do jogador e o código garante que ela não aconteça.**

### 4.3 Campos pouco aproveitados

`p.frase` (3 leituras) e `p.fala` (2 leituras) — cada pessoa tem duas falas
próprias, escritas à mão, e elas aparecem em dois lugares. `p.alt` (6) só serve
para o corpo do mímico na porta.

---

## 5. Riscos de travamento

Testado por varredura, não por leitura.

| risco | resultado | observação |
|---|---|---|
| faixa de moral sem nenhuma rotina alcançável | **não existe** (0..100 todos cobertos) | |
| `rotinaDe` devolvendo `null` sempre, no pior caso (sem avaria, sem canteiro, sem comida, sozinho) | **não acontece** | as rotinas sem `precisa` seguram o piso |
| tarefa apontando para quem morreu | **não quebra** | `resolverTarefas` itera o abrigo, não as chaves de `S.tarefas` |
| pessoa com `local` inválido | **fica invisível** | some de todo cômodo e continua viva. `local` só é saneado em `carregar()` (2283); quem receber `local` ruim em partida corrente não é corrigido |
| **objetivo órfão** | **vaza** | `cobrarObjetivos` faz `return` quando o dono saiu do abrigo. O objetivo fica na lista para sempre, sem dono e sem fim |
| **watchdog** | **não existe, e não tem o que vigiar** | não há estado por NPC — sem objetivo, sem contador de turnos, sem estado nomeado. O watchdog da Fase 1 tem de vir junto com a máquina de estados |

**Nenhum travamento duro hoje** — mas pelo motivo errado: não há como travar um
laço que não existe.

---

## 6. Como o NPC conversa com os sistemas irmãos

Medido por varredura do corpo de `rotinaDe` + todas as 16 `faz()` de `ROTINAS`:

| sistema | o NPC consulta? |
|---|---|
| avarias da casa | **sim** — `conserta` lê `avarias()` e adianta etapa |
| horta / canteiros | **sim** |
| moral / confiança | **sim** — é o único eixo de estado que existe |
| `ajudaDaCasa()` | **sim** — casa que não confia no jogador faz menos pelo grupo |
| **criaturas (`S.ameacas`)** | **não** |
| **sanidade (`S.sanidade`, `estagio()`)** | **não** |
| **orquestrador (`S.orquestrador`)** | **não** |
| **memória da casa (`S.memoriaAnomalias`)** | **não** |
| **anomalias ativas (`S.anomAtivas`)** | **não** |

Ou seja: o NPC vive num jogo onde existem moral, avaria e horta. Os quatro
sistemas que fazem o horror — criatura, sanidade, orquestrador, memória — são
invisíveis para ele. Ele nunca tem medo de nada específico.

> **Nota de nomenclatura para a Fase 1:** o briefing chama `S.casaMemoria`. O
> nome real no código é **`S.memoriaAnomalias`** (`s32-memoria.js`).
> `S.orquestrador` está correto.

---

## 7. Custo por turno — medido

Instrumentação com `performance.now()` embrulhando cada função de NPC, 200
turnos, 8 pessoas no abrigo:

```
total .................... 8,5 ms  /  200 turnos
POR TURNO ................ 0,043 ms
```

| função | chamadas | ms totais | ms por chamada |
|---|---:|---:|---:|
| `rotinaDe` | 1600 | 7,0 | 0,0044 |
| `espalharGente` | 200 | 0,5 | 0,0025 |
| `cobrarObjetivos` | 200 | 0,1 | 0,0005 |
| `moralMedia` | 200 | 0,1 | 0,0005 |

Peso no save: **1,2 KB** para o abrigo, 3,3 KB para o pool, num save de 8,1 KB.

**Conclusão de orçamento:** a 60 fps um quadro tem 16,6 ms. O sistema de NPC
inteiro gasta **0,26% de um quadro**, e o jogo nem é por quadro — é por turno.
Não existe argumento de desempenho contra um sistema muito mais rico. Se a
Fase 3 custar 50× mais, ainda são 2 ms por turno.

---

## 8. O achado central: o NPC quase não decide

Contado, não estimado:

```
decisões que uma pessoa toma por dia, hoje

  rotina ......... 0 ou 1   (só 1 ou 2 pessoas da casa inteira agem por dia)
  tarefa ......... 1        e quem escolhe é o JOGADOR
  movimento ...... 1        teleporte, sem rota
  ----------------------------------------------------------
  total .......... menos de 2 — e nenhuma é sobre o que ELA quer
```

### 8.1 Cobertura: 5 de 16 numa campanha inteira

Simulando 30 dias com 8 pessoas e a lógica real de `vidaDaCasa`:

```
cenas mostradas ............ 45
rotinas distintas vistas .... 5   de 16
                              organiza · ensina · cozinha · vigia · reza
```

**Onze das dezesseis rotinas nunca apareceram numa campanha inteira.** É o mesmo
padrão da sanidade antes do §38: conteúdo escrito, testado, e estatisticamente
inacessível.

E a distribuição por moral tem um buraco de desenho: com moral **30** — a faixa
de uma casa em colapso, exatamente quando o jogador mais precisa sentir gente —
só **7** rotinas são alcançáveis, o menor número de todas as faixas. As dez
rotinas úteis exigem moral ≥ 40.

### 8.2 O movimento é teletransporte

`espalharGente()` (2763) roda uma vez por dia, no `cenaDia`, e faz:

```js
p.local = (chance(.6) && CANTO[p.hab]!=null) ? CANTO[p.hab] : sortear([1,2,4,4,5,7,8]);
```

Medido: com 8 pessoas todas na SALA (4), uma chamada produziu **3 saltos entre
cômodos não adjacentes**. Não há `destino`, não há `rota`, não há caminho. A
pessoa não *foi* até a despensa; ela *estava* na sala e passou a *estar* na
despensa.

Isso é a distância exata entre o que existe e a Regra de Ouro: o jogador nunca
pode encontrar o resultado de um trajeto, porque não houve trajeto.

---

## 9. O que já existe e a Fase 1 deve adotar, não reescrever

Levantado para cumprir a Proibição nº 1. Boa parte do schema pedido **já tem
correspondente vivo no jogo**:

| campo do schema | o que já existe | situação |
|---|---|---|
| `local` | `p.local` | existe; falta `destino` e `rota` |
| `vivo` | pertencer a `S.abrigo` vs `S.mortos` | é implícito, funciona |
| `emocao` | `p.moral` (0..100) | um eixo só; os cinco do schema são novos |
| `traços` | `p.hab` + `p.ef` | é vocação, não temperamento |
| `memoriaSocial` | `p.lacos{nome:−100..100}` | **existe e é bom** — laço mútuo, `aproximar()` (1670) |
| `objetivoAtual` | `S.objetivos[]` com `dono` | **existe**, com `ignorado` e consequência de morte |
| **`autenticidade`** | **`S.infiltrado` + `p.falso`** | **existe, binário.** O corolário de horror da missão já está no jogo desde o dia 5 |
| **`tellsEmitidos`** | **`S.pistasDadas`** + as 7 `PISTAS` (2552) | **existe** |
| `suspeitaDeMim` | `S.confianca` (da casa, não por pessoa) | é global; falta por pessoa |
| `crencas` | — | não existe |
| `necessidades` | `p.doente`, `S.comida`, `S.agua` (da casa) | recursos são da casa, não da pessoa |
| `estado` | — | não existe; é o buraco que permite tudo o mais |

O `PISTAS` merece destaque: sete pistas escritas à mão de que a pessoa ao seu
lado não é a pessoa ao seu lado — *"Você conversa com ela por uma hora. Ela não
hesita em nenhuma resposta. Nem quando você pergunta de coisa que dói."* O
produto final que a missão descreve já tem uma primeira versão funcionando. O
que falta é ela deixar de ser um evento diário do roteiro e virar consequência
de comportamento observável.

---

## 10. Ordem de ataque proposta

Da medição, não do briefing:

1. **Persistência primeiro** (§3). `S.objetivos` e `S.tarefas` para o save, e
   `S.infiltrado` por nome. É pequeno, é bug puro, e sem isso qualquer estado
   novo da Fase 1 nasce vazando do mesmo jeito.
2. **`rotinaDe` para `S.rng.pesado`** (§2.1). Uma linha, e é a decisão de NPC.
3. **Máquina de estados + watchdog** (Fase 1). É o que dá o que vigiar.
4. **Necessidades e utilidade** (Fases 2–3), que é onde o orçamento de 0,043 ms
   vira o argumento a favor.
5. **Reaproveitar antes de escrever**: `p.mem` (§4.1) e as três habilidades sem
   código (§4.2) são conteúdo pronto e inerte. Ligar o que já está escrito rende
   mais que texto novo.

---

## 11. Riscos que quero deixar registrados antes de começar

- **Nome como chave primária.** `S.tarefas[p.n]`, `o.dono`, `p.lacos[nome]`,
  `infiltradoNome` — tudo por nome. As 12 pessoas têm nomes únicos, mas
  `mortoDeAntes()` traz gente de partidas anteriores e o visitante do tipo
  `conhecido` copia um nome do pool. Colisão de nome é silenciosa e corrompe
  laço, tarefa e objetivo de uma vez.
- **Escopo global de 1445 nomes de topo.** Redefinir um nome não dá erro: o
  último vence, calado. Já aconteceu com `ANCORAS` no §38. O bloco de NPC vai
  passar pela guarda de colisão do `montar.js`, e nenhum nome novo pode repetir
  os existentes — `p`, `rotinaDe`, `TAREFAS`, `OBJETIVOS` estão todos ocupados.
- **Acento em identificador.** O schema do briefing traz `traços` com cedilha.
  JS aceita, e o `montar.js` **quebra a build** de propósito nesses casos
  (`checarAcentos`), porque um `S.ruido → S.ruído` acidental não dá erro
  nenhum — só para de funcionar. Sugiro `tracos` no código e o acento só no
  texto que o jogador lê. Preciso da sua confirmação nesse ponto.
- **`espalharGente` é chamado de um lugar só** (10353, dentro de `cenaDia`). Um
  laço de NPC que rode fora do dia precisa de um ponto de entrada novo — e ele
  não pode disparar durante a abertura narrada, sob pena de repetir o save
  fantasma que apagou a abertura por várias versões.

---

*Fim da Fase 0. Nenhuma linha de código de NPC foi escrita ou alterada.*
