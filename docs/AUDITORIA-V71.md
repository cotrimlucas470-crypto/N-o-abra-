# Fase A — auditoria do ULTRA_PROMPT V71 contra o código que existe

*Medição, sem uma linha de código novo. O documento manda auditar antes de
alterar, e essa é exatamente a disciplina que me pegou na rodada passada: eu
tinha "auditado a arquitetura" do áudio e mesmo assim escrevi um passo novo por
cima de um passo melhor, porque não olhei o catálogo. Aqui eu olhei o catálogo.*

---

## O resumo em uma página

| o que o ULTRA_PROMPT pede | situação medida |
|---|---|
| §2 arquitetura de ameaças (identidade, estado, percepção, tell, memória, persistência) | **já existe** — `REGRA` + `FASES_ANOM` + `anomIniciar/Ouviu/Pisou/Avancar` + `avisoDe` + `anomEstado` |
| §4 máquina de estados da IA | **já existe em 4 estados** — `RONDA → SUSPEITA → CACA → PERDEU` |
| §5 memória das entidades | **parcial** — a invasão lembra ruído, trilha e alvo; não persiste entre noites |
| §10 evidências | **já existe** — `deixarMarca`, 6 marcas, uma por criatura, persistidas em `S.marcasCasa` e mostradas dias depois |
| §12 tensão invisível | **já existe** — `pressaoAgora()` do §42, com os 4 degraus e sem barra |
| §13 memória do mundo | **já existe** — `s32-memoria.js` (v59) + `S.marcasCasa` + `S.vistos` |
| §16 sanidade | **já existe** — estágios, escudo, ilusões, `s38` |
| §17 percepção | **já existe** — `s9-percepcao.js` |
| §26 regra de ouro / tells | **já existe e é contrato** — `TELLS`, 24 sinais, 6 criaturas, com trava de build |
| §3 cinco invasores | **2 novos, 3 colidem com criaturas existentes** |
| §6-8 adoradores, facção, rituais | **não existe** — e tem uma semente pronta no jogo |
| §22 RNG determinístico | **11 decisões de gameplay fora do gerador, e o estado salvo nunca era aplicado na carga** — os dois achados desta auditoria |

---

## 1 · A maior parte da "nova arquitetura" já está construída

O §2 pede uma camada com `identidade → estado → intenção → percepção → ação →
consequência → memória → persistência`. Isso é a descrição do que o
`s26-anomalias.js` faz hoje:

```
REGRA[criatura]        identidade mecânica: sentido, dica, evita(), alvo()
FASES_ANOM             RONDA → SUSPEITA → CACA → PERDEU
anomOuviu(I,onde,f)    percepção por ruído
anomPisou(I,onde)      percepção por trilha
anomAvancar(I)         ação por turno
avisoDe(I)             o tell obrigatório antes da consequência
deixarMarca(I)         a evidência que sobra
anomEstado(I)          o recorte serializável
```

E as seis criaturas **já têm identidade mecânica própria**, que é o critério de
qualidade do §29. Cada uma tem um *sentido* diferente:

| criatura | sentido | a regra que o jogador aprende |
|---|---|---|
| magro | luz | para na porta de cômodo aceso e não entra |
| rastejante | rastro | ignora barulho; segue por onde você pisou |
| coro | som | as duas metades vão pro mesmo barulho; dois barulhos separam |
| imitador | resposta | chama com voz conhecida; quem anda depois se entrega |
| inchado | passagem | não passa em vão apertado sem perder tempo |
| primordial | olhar | olhar pra ele encurta a distância |

**Conclusão:** não existe "camada de ameaças" a construir do zero. Existe uma a
**estender**. Construir uma segunda seria a proibição nº 1 do próprio documento
("não crie uma segunda versão paralela de sistemas já existentes") e o erro que
eu acabei de cometer com o passo.

---

## 2 · Três dos cinco invasores colidem com criaturas que já existem

Este é o conflito principal, e o documento manda apontar conflito em vez de
improvisar.

### INVASOR 02 — "O Imitante" **≈ o `imitador` que já existe**

O pedido: copia voz, ruído, comportamento de NPC, com **uma inconsistência
aprendível** que muda de encontro para encontro.

O que já existe:
- `REGRA.imitador` — *sentido: 'resposta'*, "chama com voz conhecida; quem anda depois de ouvir se entrega";
- `S.infiltrado` — o Imitador **substituindo um morador do abrigo**, com o bônus de ofício dele (bug corrigido na v66);
- `Sinais.inconsistenciaDe()` do §40 — **o sistema de sinais forjados com inconsistência declarada, já com trava de build**;
- `TIPOS` da porta — `ecoador`, `conhecido` e `coro` já marcados `mimico:true`;
- a marca dele: *"Alguém escreveu o seu nome no vidro embaçado. A letra é sua."*

Sobreposição: alta. O "Imitante" é o `imitador` com mais canais.

### INVASOR 03 — "O Cata-vozes" **≈ `coro` + o chamado do `imitador`**

O pedido: imita sons importantes, chama de posições diferentes, cria falsos
passos, prefere corredores com reverberação.

O que já existe: `REGRA.coro` (*sentido: 'som'*, duas metades que vão pro mesmo
barulho), o chamado do `imitador`, e — desde o §47 — **distância sonora real**,
que é justamente o que faria "chamar de posições diferentes" funcionar.

Sobreposição: média-alta. O que é genuinamente novo aqui é *reproduzir ruídos
que o jogador produziu antes*.

### INVASOR 04 — "O Rastejante de Parede" **≈ `rastejante` + `magro` + §43**

O pedido: anda por paredes/tetos, evita luz forte, bloqueia uma rota por poucos
turnos, deixa marcas que somem devagar.

O que já existe: o nome colide com `REGRA.rastejante`; "evita luz forte" é
literalmente `REGRA.magro.evita = luzLigadaEm`; "bloqueia rota por poucos turnos"
é o `RET_BLOQUEIOS` do §43, que **já prova a cada bloqueio que ainda há caminho
até o núcleo**; "marcas que somem devagar" é `deixarMarca` com `marcasMax`.

Sobreposição: alta, e em três sistemas diferentes.

### Os dois que são genuinamente novos

**INVASOR 01 — O Observador.** Nada no jogo faz isto. O `primordial` é o
inverso (olhar pra ele *aproxima*); o Observador **muda de lugar quando é
observado e perde interesse se for ignorado**. Isso inverte o incentivo de todas
as seis criaturas atuais, que é a definição de identidade mecânica nova.

**INVASOR 05 — O Hóspede.** Nada no jogo faz isto. Ameaça que **não ataca**: se
instala, altera o ambiente em fases, aumenta a pressão das anomalias próximas, e
muda a casa se for ignorada. Nenhuma das seis criaturas persiste entre noites.

### Recomendação

Entregar **dois invasores novos de verdade** (Observador, Hóspede) e, para os
três que colidem, **estender as criaturas existentes com os canais que faltam**
em vez de criar sósias — que é o que o §1 e o §29 do próprio documento pedem
("não há duplicação desnecessária de sistemas"). Assim o jogador ganha
comportamento novo sem ganhar dois monstros que fazem a mesma coisa com nomes
diferentes.

---

## 3 · O que não existe mesmo, e tem semente pronta

**Adoradores, facção e rituais não existem.** Zero ocorrências de "adorador",
"seita" ou "facção" no código.

Mas existe a semente, e ela é boa demais para ignorar: o temperamento
`supersticioso` de morador, com `ritual:true`, que já fala há versões:

> *"Minha avó falava disso. Eu achava história."*
> *"Deixa eu botar sal na soleira. Não custa nada."*

E o §44 já entregou o **documento do sal**, que transforma essa superstição em
regra que o Rastejante obedece. E `S.abrigo.some(p => temper(p).ritual)` já
desbloqueia uma ação de jogo.

A facção não deve nascer do zero: ela deve nascer **de onde essa crença veio**.
Isso é integração, não feature colada.

---

## 4 · O achado: 10 decisões de gameplay ainda sorteiam fora do gerador

A v66 consertou as duas primitivas (`sortear`, `chance`) e 71 sítios diretos.
Ela **não pegou a terceira grafia da mesma decisão**: `Math.floor(Math.random()*n)`.

Em três casos o sítio semeado e o não-semeado estão **na mesma linha**:

```js
const q = 1 + Math.floor(Math.random()*3);   // ← quanto material você acha
for(let i=0; i<(chance(.6)?1:2); i++){       // ← semeado
  const m = sortear(mats); darMat(m,q);      // ← semeado
```

O sorteio de saque é metade reproduzível.

| função | linha | o que decide |
|---|---:|---|
| `atirar` | 25744 | **a arma travar** — `if(Math.random()>conf)` |
| `anoitecer` | 21505 | **qual sentido fica cego na noite** (SOM/ODOR/VISUAL/METAL) |
| `vasculharPor` | 5837 | quanto material você acha |
| `roubarAlgo` | 27579-80 | quanto o ladrão leva de comida e de diesel |
| `abrirFuga` | 27526 | quantos turnos a fuga dura |
| `paciencia` | 10857 | quanto o visitante espera na porta |
| `tentarRecuperarLargada` | 20503 | quando a mochila perdida reaparece |
| `menuRuaCasas` | 7807 | quantas casas tem na rua |
| `sortearPesado` | 19844 | qual ilusão de sanidade sai |
| `responderEscuta` | 4493 | a ordem das opções na porta — e o embaralhamento está errado |

`atirar` e `anoitecer` são os graves: a arma travar decide se você sobrevive, e o
sentido cego da noite decide **qual criatura fica surda**. Nenhum dos dois
reproduz num save carregado.

Dos 171 `Math.random` do arquivo montado, os outros 161 são áudio e desenho —
cosméticos e declarados como tal pela política do `s30-nucleo.js`. Um caso a
registrar sem alarme: `S.semente` (linha 815) nasce de `Math.random`, é salva, e
alimenta só ruído visual.

### E o achado maior, que só apareceu porque eu fui testar o primeiro

Escrevendo o teste de reprodução, achei que o **elo final estava faltando**.

`salvar()` grava `d.rngEstado`. `carregar()` da base copia **toda** chave do save
para dentro de `S`, então `S.rngEstado` volta certo. Mas o gerador **vivo**
(`S.rng`) nunca era re-semeado a partir dele: `semearRNG()` roda uma vez, no
parse do bloco `s30-nucleo.js`, que acontece **antes** de `carregar()`; e `rng()`
só re-semeia se `S.rng` tiver sumido.

Medido, plantando `123456789` no save:

```
depois de carregar()    S.rngEstado = 123456789    gerador = 999
depois de semearRNG()   S.rngEstado = 123456789    gerador = 123456789
```

O estado era salvo, era restaurado, **e era ignorado**. Carregar um save retomava
o sorteio de onde o *boot* parou, não de onde o jogador parou.

A v66 fez as decisões passarem pelo gerador e gravou o estado. Faltava aplicar na
carga — e sem isso, tudo o que a v66 escreveu sobre reprodutibilidade valia só
dentro de uma sessão. Consertado com um embrulho de `carregar()` em
`s30-nucleo.js`, que semeia depois de a base copiar as chaves.

**Isto entra antes de qualquer invasor novo.** O §30 põe estabilidade e justiça
acima de identidade de ameaça, e o §22 é explícito.

---

## 5 · Riscos

1. **Peso.** `index.html` já tem 2,8 MB e 77 blocos. Cinco invasores, quatro
   arquétipos, facção, rituais e evidências dobrariam a camada de ameaça. O
   §23 pede performance; a resposta é estender estruturas existentes, não criar
   paralelas.
2. **`cena.modo` continua sobrecarregado** — declarado em aberto desde a v71.
   Rituais que alteram área vão querer um modo novo. Mexer nisso agora, junto
   com uma camada nova, repetiria o erro do passo em escala maior.
3. **Save.** O `salvar()` base tem 38 chaves e a regra é "bloco anexa, nunca
   cria". Cada sistema novo precisa do seu anexo, com a guarda `if(!S.nomeJogador)return`.
4. **Trava de colisão.** Ela já salvou quatro etapas. `ritual`, `evidencia`,
   `memoria`, `observar` e `hospede` são nomes prováveis de colisão — checar
   antes, não depois.

---

## 6 · O plano, em etapas

O usuário pediu explicitamente para não fazer tudo de uma vez, e cada etapa
fecha com teste verde e um trecho no site animado.

| etapa | o que entra | por que nesta ordem |
|---|---|---|
| **1** | as 10 decisões de volta pro gerador semeado, com trava de build para a terceira grafia | §30: estabilidade e justiça primeiro. Sem isso, nada do que vier reproduz |
| **2** | a camada de ameaça **estendida** (não paralela): memória entre noites, canais de percepção declarados por criatura, `RECUANDO`/`OCULTO` nos estados | fundação para os dois invasores |
| **3** | **O Observador** — o único que inverte o incentivo de olhar | o invasor mais barato e mais distinto |
| **4** | **O Hóspede** — ameaça persistente em fases, que muda a casa se ignorada | precisa da memória da etapa 2 |
| **5** | os três canais que faltavam ao `imitador`, `coro` e `rastejante`, em vez de três sósias | resolve o conflito sem duplicar |
| **6** | **adoradores**: os quatro arquétipos nascendo do `supersticioso` e do documento do sal | a parte genuinamente nova e maior |
| **7** | **facção com estados + rituais**, com os 7 sinais progressivos | depende de 6 |
| **8** | interação entre as três ameaças, evidências falsas, QA de estresse e a documentação `HORROR-V71` | o fecho |

Cada etapa: medir → construir envelopando → testar com recarga real da página →
site animado → commit.

---

## 7 · O que eu não vou fazer sem você dizer

Nada nesta auditoria é irreversível, mas **a recomendação da seção 2 muda o que
é construído**: entregar 2 invasores novos + 3 extensões, em vez de 5 invasores.

O ULTRA_PROMPT diz "crie pelo menos cinco invasores" e também diz "não crie uma
segunda versão paralela de sistemas já existentes". As duas frases se
contradizem para o Imitante, o Cata-vozes e o Rastejante de Parede. Eu escolhi a
segunda, porque o §29 e o §30 a colocam acima — mas a escolha é sua, e ela está
declarada aqui em vez de escondida no código.

A alternativa honesta, se você quiser os cinco separados mesmo: eles entram como
**variantes** das criaturas existentes, herdando `REGRA` e ganhando canal
próprio — cinco nomes, cinco comportamentos, uma fonte de verdade.
