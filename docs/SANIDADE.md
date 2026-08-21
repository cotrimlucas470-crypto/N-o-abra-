# A sanidade — tudo o que mudou

*Documento pedido: "outro arquivo me ditando todas as melhorias que você
colocou na sanidade". Aqui está, do começo ao fim, incluindo o que eu medi
antes de mexer em qualquer coisa.*

---

## 1. Antes de escrever, eu fui medir

Você disse duas coisas: **"muito sutil"** e **"sem sentido"**. As duas estavam
certas, e por motivos diferentes. Eu não quis adivinhar qual — fui contar.

### 1.1 Sutil: a conta das ilusões

O jogo tem **23 ilusões** no total:

| tabela | quantas | o que faz |
|---|---|---|
| `ILUSOES` | 6 | mentira de tela / de interface |
| `VISOES` | 8 | coisa vista na rua, na expedição |
| `ILUSOES_SOM` | 9 | som que não tem fonte |

`talvezIlusao()` é chamada **uma vez por dia**, tem **trava de uma por dia**, e
a chance de disparar é o próprio valor de ilusão do estágio.

Fazendo a conta numa campanha inteira de 12 a 30 dias:

> **O jogador vê entre DUAS e SEIS ilusões numa campanha inteira.**

Duas. Num jogo de terror sobre perder a cabeça. Você tinha razão, e a razão
era aritmética, não gosto.

### 1.2 Sutil, parte dois: o estágio morto

Aí eu achei uma coisa pior. O menor `min` das três tabelas é **0.10**. Olhe a
tabela de estágios:

```
estágio        san≥   ilusão   ilusões que passam no filtro
  lúcido         90     0.00        0     (correto — lúcido é lúcido)
  tenso          70     0.08        0     ←  MORTO
  fissurado      45     0.22       13
  rachado        20     0.40       20
  desfeito        0     0.55       23
```

```js
pool = ILUSOES.filter(i => 0.08 >= i.min)   //  →  []   lista vazia
```

**A faixa de sanidade 70 a 89 produzia exatamente zero ilusões.** E essa é a
faixa onde o jogador passa a maior parte do jogo — é onde você fica depois do
primeiro susto e antes de estar realmente mal.

Um erro de **0,02** apagando um estágio inteiro. E o estágio prometia, por
escrito, na tela do jogador:

```js
'tenso': 'Você ouve passo onde não tem passo.'
```

O jogo dizia que ia acontecer, e o filtro garantia que não acontecesse. Não
dava pra ser mais invisível: nada quebra, nada dá erro, nada aparece no
console. Só não acontece.

### 1.3 Sem sentido: não havia chão pra duvidar em cima

Numa versão anterior (§30) eu congelei três sinais que **nunca** são
falsificados pela casa: o relógio, o inventário e a porta da frente. Está lá,
funciona, é uma regra de verdade.

**O jogador nunca soube.** A tabela `PERCEPCAO_INVIOLAVEL` só era lida por uma
função de depuração. Ela nunca chegou a nenhuma tela.

E é aqui que mora o "sem sentido". Sem um chão firme que você **conhece pelo
nome**, duvidar não é jogar — é ruído. *"Nada aqui é confiável"* não é uma
regra: é a **ausência** de uma regra. Não dá pra jogar contra.

Com três âncoras conhecidas, a mesma dúvida vira trabalho: você tem onde pisar
pra medir o resto.

### 1.4 E as ilusões usavam crachá

A ilusão grande abria uma tela própria, com título:

> **"Você tem certeza?"**

Alucinação que chega anunciando que é alucinação não assusta ninguém. Ela vira
um evento de menu. O jogador aprende a reconhecer o formato em duas vezes e
para de sentir qualquer coisa.

---

## 2. O que entrou — as quatro mudanças

Tudo vive num arquivo novo, **`s38-sanidade.js`**. Nada foi apagado, nenhuma
das 33 anomalias foi reescrita, nenhum save antigo quebrou.

---

### Melhoria 1 · Os sussurros — 18 ilusões que não se anunciam

São **18 ilusões pequenas**, e **8 delas** foram desenhadas especificamente
para `min: 0.02` — a faixa que estava vazia.

Elas chegam ao jogador assim:

```js
diz(texto, 'narr')
```

`'narr'` é a **mesma classe de qualquer outra linha de narração do jogo**. E
isso é o ponto inteiro, não uma economia de código:

- não têm tela própria
- não têm título
- não têm botão de confirmar
- não têm som de alerta

Elas chegam **misturadas com a verdade**. O jogador só descobre que era mentira
se for conferir. Uma delas é indistinguível de uma linha real na tela — eu
verifiquei isso em captura de tela, lado a lado, e não dá pra separar.

**A faixa do `tenso` (min 0.02) — as oito:**

> Alguém falou o seu nome em outro cômodo. Baixinho.
> Passo no assoalho, do outro lado da parede. Um só.
> A porta que você fechou está encostada.
> Você sente cheiro de fósforo queimado. Ninguém acendeu nada.
> Alguma coisa raspou na parede lá fora, na altura da sua cabeça.
> Você ouve a sua própria respiração vindo de trás de você.
> Uma tábua estala como se alguém tivesse acabado de sair dali.
> Tem uma cadeira virada pra parede. Você não virou.

**A partir de `fissurado` (min 0.18) — cinco:**

> *(nome de alguém do abrigo)* te chamou. Quando você olha, ela está dormindo.
> A luz do corredor estava acesa. Agora não estava.
> Você conta as pessoas da casa duas vezes e dá números diferentes.
> Tem terra molhada no chão, vindo da porta até onde você está.
> O gerador engasgou e voltou. Ninguém mais comentou.

**De `rachado` pra baixo (min 0.34) — cinco:**

> Você acabou de fazer isso. Você tem certeza de que acabou de fazer isso.
> Tem alguém do outro lado da porta imitando a sua respiração. No mesmo tempo.
> Você ouviu a voz de *(alguém que morreu)*. Curta. Do lado de dentro.
> A sua sombra na parede levou meio segundo a mais pra parar.
> Você olha pra sua mão e conta os dedos. Dá certo. Você conta de novo.

**Quando chegam:** ao trocar de cômodo — que é o batimento natural do jogo
dentro de casa, e não um relógio separado que o jogador não vê.

**Com que frequência:** chance = ilusão do estágio × 2.4, limitada a 45%. Em
`tenso` isso dá ~19% por cômodo. Teto de **5 por dia** e **2 turnos de
intervalo** entre um e outro, pra não virar chuvisco.

**Em `lúcido` não acontece nada.** Zero. Lúcido é lúcido — isso não é um bug
igual ao do `tenso`, é a regra.

---

### Melhoria 2 · As três âncoras chegam ao jogador, e viram verbo

`CHAO_FIRME` — o relógio, o que você carrega, a porta da frente.

**O jogo ensina, uma vez só**, e no momento certo: depois do **segundo**
sussurro pegar. Não no tutorial, quando seria mais uma regra decorada. Depois
de a casa mentir pra você duas vezes, quando a informação passa a valer alguma
coisa:

> Você para no meio do corredor e faz o que o rádio mandou fazer, semanas atrás.
> Três coisas nesta casa nunca vão te enganar, por pior que fique:
> **o relógio, o que você carrega, e a porta da frente.**
> Tudo o mais pode. Confira essas três quando a cabeça pesar, e volte delas.

**Depois disso vira botão no cômodo.** `Conferir o relógio` · *10 min · isso
nunca mente*.

O que conferir faz:

| | |
|---|---|
| **custa** | 10 minutos do relógio |
| **devolve** | 2 pontos de sanidade |
| **e mais** | liga `S._verdade` por 1,8 segundos — o intervalo em que a interface para de mentir |

**Não cura.** Dois pontos é pouco de propósito. A âncora não é remédio, é
bússola. E o preço é **tempo**, que é o recurso que este jogo cobra mais caro:
conferir é escolher não fazer outra coisa.

O texto de cada uma é o fato, sem literatura:

> São 03:40. Dia 12. Esse número nunca mentiu pra você e não vai mentir.
> *Isso é o que é. Não tem outra leitura.*

**Sobre o nome:** o jogo já tem uma tabela chamada `ANCORAS` — a foto dobrada,
o relógio que não anda, a música que você lembra inteira. Aquelas são âncoras
**afetivas**, e o jogo as **contamina**: elas passam a mentir conforme você
piora. São o oposto exato destas.

E esse contraste é o desenho, vale dizer em voz alta:

> **O que você ama te trai. O que é só fato, não.**

Por isso as três novas não se chamam âncora — se chamam **chão firme**. (Além
do mais: num escopo global de 1445 nomes, duas tabelas com o mesmo nome é uma
delas sumir em silêncio, sem erro nenhum.)

---

### Melhoria 3 · A sanidade vira sintoma na tela

Antes, sanidade era **o nome de um estágio numa ficha**. Você tinha que ir
olhar pra saber.

Agora ela é uma coisa que o jogador **vê sem ler**. `sanIntensidade()` mapeia
sanidade 82 → 15 no intervalo 0 → 1, e a tela responde continuamente:

- **grão** por cima de tudo, tremendo em 3 passos
- **vinheta** que fecha e **respira** num ciclo de 7 segundos
- acima de 0.30, **o texto treme** — 1,4px, de vez em quando, como quem lê com
  a vista cansada
- a opacidade sobe por `i^0.75`, ou seja **sobe mais rápido no começo**: quem
  está em `tenso` tem de ver que está

Isso é o conserto direto do "muito sutil". A primeira versão que eu fiz ainda
estava tímida — eu tirei foto de tela em quatro níveis de sanidade, olhei em
sequência, e subi sete parâmetros até a progressão ficar legível:

| | antes | agora |
|---|---|---|
| opacidade do grão | .5 | 1 |
| alfa dos pontos | .05 / .06 | .16 / .22 |
| vinheta (raio) | 120% / 78% / 34% | 108% / 70% / 22% |
| vinheta (escuro) | .85 | .97 |
| piso do pulso | .55 | .42 |
| tremor do texto | .6px | 1,4px |
| limiar do tremor | .45 | .30 |

**Dá pra desligar.** `S.semSintoma` desliga o véu inteiro, e o CSS respeita
`prefers-reduced-motion`. Isso é acessibilidade, não teimosia: tremor de tela
não pode ser obrigatório pra quem não pode com ele.

---

### Melhoria 4 · A ilusão passa a usar a sua rotina

A ilusão agora lê onde você está e quem está com você.

*"Alguém falou o seu nome em outro cômodo"* é uma frase. A mesma frase quando
você sabe que só tem você acordado nesta casa é outra coisa. As ilusões que
citam gente usam quem está no seu abrigo e quem morreu na sua partida — não uma
lista fixa.

---

## 3. O resultado, em número

Cobertura por estágio — quantas ilusões existem na faixa:

| estágio | antes | agora |
|---|---:|---:|
| lúcido | 0 | **0** (continua correto) |
| **tenso** | **0** | **8** |
| fissurado | 13 | **26** |
| rachado | 20 | **38** |
| desfeito | 23 | **41** |

E é importante dizer o que **não** foi feito:

> **O número do estágio `tenso` continua valendo 0.08.**

Eu não inflei nada. Não multipliquei chance, não baixei limiar, não dobrei
frequência. O que mudou é que **passou a existir conteúdo desenhado pra aquela
faixa** — o pool deixou de ser vazio, e a promessa que já estava escrita na
tela virou verdade.

Isso é a diferença entre consertar o jogo e falsear dificuldade.

---

## 4. A regra de ouro, aplicada aqui

> *"O jogador nunca deve sentir aleatoriedade. Ele deve sentir intenção."*

Conferindo item por item:

- **sussurro** só chega em estágio que o jogo já disse, por escrito, que
  produz sussurro. Se o jogador for ler a ficha depois, bate.
- **âncora** sempre diz a verdade, e o jogador sabe disso porque o jogo
  contou. Nunca há um caso em que conferir engana.
- **o véu** é função contínua da sanidade e de mais nada. Piorou, escureceu.
  Conferiu, aliviou.
- **nada usa `Math.random()`** solto: passa pelo `rng` da partida.

Se o jogador for reconstruir depois por que uma coisa aconteceu, ele consegue.
Esse era o teste.

---

## 5. Como conferir você mesmo

Dentro do jogo, no console:

```js
san38Estado()
```

Devolve o estágio atual, a intensidade do sintoma na tela, quantos sussurros
pegaram hoje, se você já aprendeu as âncoras, quantas vezes conferiu, e a
tabela de cobertura completa.

E o teste automático:

```
node tools/servidor.mjs . 8901
node tools/testes/santeste.mjs      # 30 asserções
```

Regressão completa depois da mudança: **506 asserções, 0 falhas, 18 harnesses.**

---

## 6. Duas coisas que eu errei no caminho, pra ficar registrado

**Eu testei sanidade com a sanidade cheia.** As primeiras rodadas passavam
lindamente e não provavam nada, porque em `lúcido` não sai ilusão nenhuma —
por definição, e corretamente. Teste que passa pelo motivo errado é pior do que
teste que falha.

**E `mexerSan(-22)` sozinho não muda estágio nenhum.** O `v9().escudo` são 30
pontos que absorvem a primeira queda inteira. Eu bati uma vez, medi, não mudou
nada, e quase fui procurar bug onde não tinha. As três armadilhas estão anotadas
no `tools/testes/LEIA-ME.md` pra não pegarem de novo.

**E uma que não era erro:** numa captura de tela apareceu "mmais", com dois
emes. Eu fui atrás achando que era typo. Não era — o jogo dobra letra de
propósito em sanidade baixa, como quem digitou tremendo. Foi a melhor
confirmação que eu podia ter de que os sussurros passam pelo mesmo cano da
narração real: o filtro de sanidade pegou o sussurro sem saber que era sussurro.
