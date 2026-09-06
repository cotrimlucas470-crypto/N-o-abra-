# Auditoria do ULTRA_PROMPT V72 contra o código que existe

*O §1 manda auditar antes de escrever, e o §2 diz “não duplique sistemas
existentes”. Nas três rodadas anteriores desta sessão a coisa pedida já existia
duas vezes e meia — e uma vez eu não olhei, escrevi por cima de algo melhor, e
entreguei pior. Então aqui está a medição, com número, antes de uma linha.*

---

## Em uma página

| § | o que o documento pede | situação medida |
|---|---|---|
| 3 | Diretor de Terror Dinâmico | **existe** como `s31-orquestrador.js` — mas **não lê o jogador** |
| 4 | Terror psicológico (discrepâncias, imitação, presença, dúvida) | **existe**, espalhado por §49, §40, §32 e as seis criaturas |
| 6 | Sistema de Presença | **meio existe** — é canal de rastro e é tell; não é percepção sem entidade |
| 7 | Entidades que fingem ser aliadas | **existe e é forte** |
| 8 | Mentiras e informação não confiável | **existe** — §44, com uma regra falsa por campanha |
| 10 | Sistema de Marcas | **existe uma, completa.** E o nome colide com dois outros conceitos |
| 11 | Eventos extremamente raros | **não existe** — “raro” no código é faixa de loot |
| 12 | Áudio espacial e silêncio | espacial **existe** (§47); silêncio como estado de áudio **não** |
| 13 | Sistema de Trauma | **não existe pro jogador** — `traumatizado` é temperamento de NPC |

---

## 1 · O Diretor já existe — e está surdo

O §3 pede um Diretor com orçamento de intensidade, cooldowns, tags de
incompatibilidade, pesos configuráveis, anti-repetição, RNG reproduzível, logs e
testes de distribuição. Isso é a descrição do `s31-orquestrador.js`, escrito na
v58:

```
orcamentoBase 100, +2,5/dia, teto 160     ← orçamento de intensidade
cooldownCategoria 6 · cooldownGlobal 2    ← cooldowns
podeCoexistir(a,b)                        ← tags de incompatibilidade
prioridade{primordial:100 … ambiental:10} ← preempção, com deltaPreempcao 25
memoriaEventos 6 · penalRepeticao .25     ← anti-repetição
bonusAdiado .45 (teto 1.8)                ← o que foi negado volta mais forte
valesPorNoite 2 · valeDuracao [4,7]       ← vales de SILÊNCIO
densidadeAlvo [4,8]                       ← faixa alvo, com orqSimular/orqHistograma
```

Ele até já tem a ferramenta que o §16 pede: `orqSimular(noites, seed)` e
`orqHistograma`.

**O que falta é o achado desta auditoria.** O jogo tem duas metades de Diretor e
elas não se falam:

- `s31-orquestrador.js` decide **o que acontece** — mas só olha para eventos.
- `pressaoAgora()` (§42) mede **como o jogador está** — tempo fora do núcleo,
  ruído, luz, exposição, com quatro degraus.

E `pressaoAgora()` é consultada por **exatamente uma coisa em todo o projeto**:
as costuras do §49, escritas ontem. Medido:

```
grep 'pressaoAgora()' *.js  →  s49-costuras.js:185      (uma linha, só)
grep 'pressaoAgora'  s31-orquestrador.js  →  0
```

O Diretor de eventos nunca soube que o jogador estava com medo. É exatamente o
que o §3 quer que ele saiba, e é um fio, não um sistema novo.

Falta também a máquina de estados nomeada — `CALMO → SUSPEITO → TENSO → PERIGO →
PÓS-CLÍMAX → RECUPERAÇÃO`. O orquestrador tem orçamento e vales, mas não tem a
noção de **pós-clímax**: depois de uma noite pesada ele não recua de propósito.

---

## 2 · O “Sistema de Marcas” já existe — e o nome colide com outros dois

Isto precisa ser dito antes de qualquer código, porque o projeto tem uma trava de
build que quebra em colisão de nome, e ela já salvou quatro etapas.

**Três conceitos diferentes disputam a palavra “marca”:**

| no código | o que é |
|---|---|
| `marcas()` / `S.marcasCasa` | a **evidência** que uma criatura deixa no cômodo, uma por criatura, que reaparece dias depois |
| `S.marcado` / `pesoMarca()` | **A Marca** — a consequência persistente de contato com o anômalo |
| `marcarCicatriz` (§45) | a **cicatriz** de ferimento, que a casa passa a mirar |

E o `S.marcado` é quase exatamente o que o §8 descreve. Ele já tem:

- **origem e gatilho** — falhar em certos eventos liga `S.marcado=true`;
- **estágio** — `S.marcaDias`, com seis falas em dias diferentes:
  > *“Alguma coisa passou a saber onde você dorme. Você não sabe como sabe disso.”* (dia 1)
  > *“Você escreve o seu nome e sai errado. Você escreve de novo e sai certo.”* (dia 12)
  > *“Tem uma coisa que anda com você de cômodo em cômodo. Nunca à sua frente.”* (dia 16+)
- **efeitos** — `+2` de ruído por dia, `pesoMarca()` de 12% a 35% pior em
  investigar, e o canal de rastro `PRESENCA` salta de 3 para **12**;
- **remoção** — três caminhos, com 35%, 55% e 48%;
- **persistência** — `marcado` e `marcaDias` no save.

O que o §8 pede e não existe: **ser mais de uma**. Marca do Observador, do
Ritual, do Eco. O trabalho honesto é generalizar a que existe, não escrever uma
segunda ao lado dela.

---

## 3 · O que de fato não existe

**Eventos raros (§11).** As 138 ocorrências de “raro” no código são **faixas de
loot** (`/* ---------- raros ---------- */`, `/* ---------- muito raros ---------- */`)
e a raridade formal de item do §36. Um sistema de *evento* raro, com
anti-repetição entre campanhas e categorias A–E, não existe.

**Silêncio como estado de áudio (§12).** A parte espacial foi feita no §47:
absorção de ar por cômodo, seis superfícies de piso, distância em `saida()`. E o
orquestrador tem **vales de silêncio** — mas eles calam *eventos*, não o *som*. O
mixer de 5 camadas do §47 está pronto para isso e ninguém pediu silêncio a ele.
Os quatro tipos que o §12 quer — natural, de presença, anômalo, pós-evento — não
existem.

**Trauma do jogador (§13).** `traumatizado` é um **temperamento de morador**
(“quem viu demais”), com banco de falas próprio. O jogador tem sanidade em
estágios (§38) e cicatriz (§45) — mas não tem experiência registrada com gatilho:
“você foi perseguido no porão” não muda como o porão soa depois.

**Presença sem entidade (§6).** Existe `PRESENCA` como canal de rastro em
`v9Rastros` (peso 3, ou 12 se marcado) e existe o tell obrigatório `avisoDe`. Não
existe presença **com falso positivo declarado** e assinatura diferente por
fonte, que é o coração do §6: *“nem todo evento estranho é ameaça”*.

---

## 4 · Riscos

1. **Colisão de nome.** `marca`, `presenca`, `diretor`, `trauma`, `silencio` e
   `raro` são todos nomes prováveis de colisão. A trava de build pega — mas
   melhor escolher antes do que descobrir no build.
2. **Empilhamento.** O §18 exige que “eventos não dominem a experiência”. O jogo
   já tem orquestrador com orçamento, costuras com teto de 2/dia, e pressão. Um
   Diretor novo por cima disso é o caminho mais rápido para a feira de sustos.
   Por isso a Etapa 1 é *ligar* o que existe, não empilhar.
3. **`cena.modo` continua sobrecarregado**, declarado em aberto desde a v71.

---

## 5 · O plano

| etapa | o que entra | por quê nesta ordem |
|---|---|---|
| **1** | **O Diretor ganha ouvido**: `pressaoAgora()` passa a alimentar o orquestrador, e entram os estados nomeados com **pós-clímax e recuperação** | é um fio, não um sistema; e tudo o mais pendura nele |
| **2** | **Silêncio como estado de áudio** — os quatro tipos, no mixer que o §47 deixou pronto, dirigidos pelo estado do Diretor | o §2 diz que silêncio é ferramenta, e é o efeito mais barato e mais forte |
| **3** | **Presença** com falso positivo e assinatura por fonte | depende de 1 e 2 |
| **4** | **Marcas no plural** — generalizar a que existe — e **trauma do jogador** | consequência persistente |
| **5** | **Eventos raros**, categorias A–E, com anti-repetição entre campanhas | o fecho, e o mais fácil de errar sozinho |

Cada etapa: medir → envelopar o que existe → testar com recarga real → site
animado → commit.
