# CHANGELOG

## v66 — os consertos

Pedido: *"resolva todos os bugs do jogo, absolutamente tudo."* Fui atrás por
medição, não por leitura. O que segue é o que estava quebrado, com a prova.

### O bug de raiz: 612 decisões fora do gerador da partida

O jogo tem um RNG semeado completo. `criarRNG` com `next`, `inteiro`,
`escolher` e `pesado`. `semearRNG()` deriva a semente de `(saveId, dia)`. O
estado vai pro save em `d.rngEstado` e volta na carga. E `s30-nucleo.js` declara
a política por escrito:

> *"RNG SEMEADO no que decide jogo; cosmético fica com `Math.random`."*

Máquina inteira montada, testada, persistida. E então:

```js
const sortear = a => a[Math.floor(Math.random()*a.length)];
const chance  = p => Math.random() < p;
```

**As duas portas de entrada nunca foram ligadas nela.** São 397 chamadas de
`chance()` e 215 de `sortear()` — **612 decisões**, praticamente todas as do
jogo — passando por `Math.random()`, enquanto o gerador determinístico rodava ao
lado sem ninguém chamar.

É exatamente a forma do estágio `tenso` da sanidade: a promessa escrita no
código e o código garantindo que ela não vale.

Agora as duas passam por `_ale()`, que usa o gerador da partida e cai em
`Math.random` só enquanto o `rng` ainda não existe (os blocos são injetados no
fim do body). Mais 71 chamadas diretas em 46 funções que decidem estado — loot,
clima, evento, criatura, visitante, quem some do mundo. A distribuição é
idêntica: **nenhum número de balanceamento mudou.** O que muda é que o resultado
para de depender de sorte que o save não conhece.

Uma ficou de fora de propósito, e está comentada no código: a cauda de reverb em
`gerarImpulso` gera dezenas de milhares de amostras por chamada. Passar isso pelo
gerador gastaria o RNG num laço de áudio e faria a sequência do jogo depender de
o som ter inicializado.

**Guarda de build nova.** Essa regressão seria um caractere, sem erro, sem teste
vermelho, e só apareceria como "esse save não reproduz". Então o `montar.js`
agora quebra a build se `sortear`, `chance` ou `_ale` saírem da forma semeada —
verificado plantando a regressão de propósito.

### Perda de progresso: três estados morriam no recarregamento

Este precisou de duas medições, porque a primeira **passou pelo motivo errado**.

`carregar()` não reconstrói o `S`: copia as chaves do save por cima do `S` que já
está na memória. Então `salvar(); carregar()` na mesma página preserva tudo —
inclusive o que nunca foi gravado. Só um `page.reload()` de verdade mostra:

```
ANTES   tarefas:4  objetivos:1  ignorado:4  vigiou:true  infiltrado:"Rafael"
DEPOIS  tarefas:0  objetivos:0  ignorado:—  vigiou:false infiltrado:null
```

A pior é `objetivos`, porque ela carrega o contador `ignorado` — e é ele que
decide se a pessoa sai de madrugada atrás do que quer e morre. **Alguém a quatro
passos disso voltava em zero toda vez que o jogador fechava o app.**

### O Imitador disfarçado de mecânico ganhava o bônus do mecânico

`S.infiltrado` era uma **referência** pra dentro de `S.abrigo`. Depois de
qualquer ida-e-volta por JSON, o abrigo tem objetos novos e a referência aponta
pra um fantasma. Nada reclama.

Havia remendo dentro de `pistaDoDia` — `p.falso` como backup, com o comentário
explicando. Mas só valia ali. Em `desgastarGerador`:

```js
if(tem('mecânica') && quem('mecânica')!==S.infiltrado) d*=.55;
```

Depois de um recarregamento esse `!==` é sempre verdadeiro, e **a coisa que
substituiu o Rafael continuava cuidando do gerador como o Rafael.**

Agora a chave é o nome, como já era em tarefas, laços e dono.

### Três habilidades prometiam na ficha e não tinham uma linha de código

`ef` é o texto que o jogador lê na ficha da pessoa. Para três das doze, o texto
prometia algo que o jogo nunca fazia. Verificado por busca dos pontos de consulta
(`tem('x')` / `quem('x')`):

| pessoa | habilidade | o que a ficha promete | consultas |
|---|---|---|---|
| **Nice** | `costura` | *"Remenda tudo. Reforço não se perde."* | **0** |
| **Juninho** | `escalada` | *"Expedições rendem 25% a mais."* | **0** |
| **Kelly** | `corrida` | *"Expedições fazem menos ruído."* | **0** |

As três agora fazem o que está escrito, com os números que já estavam escritos —
os 25% são os 25% da ficha. A Nice remenda a tábua que soltou por dano; a que o
jogador arranca de propósito pra virar material continua saindo, porque ali a
perda é escolha dele.

### Dois parâmetros mortos

**`p.mem`** — as doze pessoas carregam um campo com aquilo de que sentem falta:
*"a igreja da praça"*, *"a oficina do pai dele"*, *"o cachorro dele, Pipoca"*, *"a
viatura 14"*. **Lido zero vezes no jogo inteiro.** O material mais rico do
arquivo de dados dos NPCs, inerte desde sempre.

**`p.escondeu`** — a pessoa desmoralizada desvia lata da despensa, o contador
sobe, e ninguém nunca lê. Ela podia desviar a campanha toda sem consequência
nenhuma: nem pra ela, nem pra despensa, nem pro jogador.

Agora o esconderijo é real — o terceiro desvio é descoberto e custa laço, e o que
ela guardou volta pra casa quando ela morre.

E `p.mem` virou a rotina **`saudade`**, que existe por dois motivos medidos:

> Numa campanha de 30 dias o jogador via **5 das 16 rotinas**. Não é sorte:
> `conserta` pede avaria, `horta` pede canteiro, `ajuda` pede doente, `lembra`
> pede morto. Numa casa sem crise o poço seca para
> `{organiza, cozinha, vigia, ensina, reza}` — que são exatamente as cinco
> medidas.

`saudade` não pede nada da casa e vale em toda faixa de moral. É variedade na
casa calma sem mexer no peso de ninguém.

### Vazamentos

- **Objetivo órfão.** `cobrarObjetivos` fazia `return` quando o dono tinha saído
  do abrigo, e a meta ficava na lista pra sempre — sem dono, sem prazo, contando
  `ignorado` que ninguém ia cobrar. Agora encerra junto com a pessoa.
- **`local` fora da planta.** A pessoa some de todo cômodo e continua viva: não
  aparece em lugar nenhum, não dá erro, e o jogador acha que ela sumiu. Era
  saneado só no `carregar()`, então quem recebesse um local ruim durante a
  partida ficava invisível até fechar e reabrir o jogo.

### Verificação

`tools/testes/bugteste.mjs` — 24 asserções, uma por conserto, incluindo o
recarregamento de página de verdade.

Registro de método: a primeira rodada do teste de determinismo **falhou por bug
meu** — o gerador de sequência resetava a semente lá dentro, então a comparação
de "semente diferente" comparava a mesma semente com ela mesma. Corrigido no
teste; o código estava certo.


## v65 — a sanidade vira sintoma

### O pedido

*"Quero melhorias gigantescas na parte da sanidade e ilusões, elas tão muito
sutis e sem sentido."*

Os dois adjetivos estavam certos, e por motivos diferentes. Fui medir antes de
escrever qualquer linha.

### Sutil: o estágio onde o jogador mais vive produzia zero

O jogo tem 23 ilusões (6 de tela, 8 de rua, 9 de som). `talvezIlusao` roda uma
vez por dia, com trava de uma por dia, e a chance é o próprio valor de ilusão
do estágio. Numa campanha inteira de 12 a 30 dias o jogador vê **entre duas e
seis**.

Isso já é pouco. O que estava embaixo é pior:

```
estágio        san≥   ilusão   ilusões no pool
  lúcido         90     0.00        0   (correto — lúcido é lúcido)
  tenso          70     0.08        0   ← MORTO
  fissurado      45     0.22       13
  rachado        20     0.40       20
  desfeito        0     0.55       23
```

O menor `min` das três tabelas é `0.10`. O estágio `tenso` vale `0.08`.

```js
pool = ILUSOES.filter(i => 0.08 >= i.min)   //  →  []
```

**Um off-by-0.02 apagava a faixa inteira de sanidade 70–89** — que é onde o
jogador passa a maior parte do jogo. E o estágio prometia por escrito, na
tela dele:

```js
'tenso': 'Você ouve passo onde não tem passo.'
```

O jogo dizia que ia acontecer e o filtro garantia que não acontecesse.

### Sem sentido: não havia chão pra duvidar em cima

O §30 congelou três coisas que **nunca** mentem — o relógio, o inventário e a
porta da frente. Está lá, funciona, e o jogador nunca soube: a tabela
`PERCEPCAO_INVIOLAVEL` só era lida por função de depuração.

Sem um chão firme conhecido, duvidar não é jogar — é ruído. *"Nada é
confiável"* não é uma regra, é a ausência de uma. Com três âncoras que o
jogador conhece pelo nome, a dúvida vira trabalho: você tem onde pisar pra
medir o resto.

E as ilusões grandes **se anunciavam**: abriam uma tela com o título "Você tem
certeza?". Alucinação que chega com crachá de alucinação não assusta ninguém.

### O que entrou — `s38-sanidade.js`

**1 · Os sussurros.** 18 ilusões pequenas, 8 delas desenhadas para `min: 0.02`,
que é a faixa do `tenso`. Elas chegam ao jogador por `diz(..., 'narr')` — a
**mesma classe de qualquer outra linha de narração**, de propósito. Não têm
tela, não têm título, não têm confirmação. Chegam ao trocar de cômodo, que é o
batimento natural do jogo dentro de casa, com teto de 5 por dia e 2 turnos de
intervalo.

O número do estágio **não foi inflado**: `tenso` continua valendo 0.08. O que
mudou é que agora existe conteúdo desenhado pra essa faixa.

```
estágio        antes   agora
  lúcido           0       0     (continua correto)
  tenso            0       8     ← a promessa escrita virou verdade
  fissurado       13      26
  rachado         20      38
  desfeito        23      41
```

**2 · As três âncoras chegam ao jogador, e viram verbo.** `CHAO_FIRME` — o
relógio, o inventário e a porta. `ensinarAncoras()` conta pro jogador uma vez
só, depois do segundo sussurro, quando ele já tem motivo pra querer saber.
Depois disso, `conferirAncora()` é um botão no cômodo: custa **10 minutos** do
relógio, devolve **2 pontos** de sanidade e liga `S._verdade` por 1,8s — que é
o intervalo em que a interface para de mentir.

Não cura. O preço é tempo, e o tempo é o recurso que o jogo cobra mais caro.
Conferir é escolher não fazer outra coisa.

*(O nome não é `ANCORAS`: o jogo já tem uma tabela com esse nome e com o
sentido **oposto** — as âncoras afetivas, que são justamente as que se
contaminam. Duas tabelas com o mesmo nome, num escopo global de 1445 nomes, é
uma delas sumir em silêncio.)*

**3 · A sanidade vira sintoma na tela.** Antes ela era o nome de um estágio
numa ficha. Agora `sanIntensidade()` mapeia sanidade 82→15 em 0→1 e um véu
`#san-veu` responde a isso continuamente: grão, vinheta que fecha, pulso que
desacelera, e acima de 0.30 um tremor de 1,4px no texto. O jogador vê a
sanidade cair **antes** de ir olhar o número.

Tem chave de desligar (`S.semSintoma`), porque tremor de tela não é opcional
pra quem precisa que não seja.

**4 · A ilusão fala do seu cômodo.** A ilusão passa a ler onde o jogador está.
"Alguém falou o seu nome em outro cômodo" é uma frase; a mesma frase quando
você sabe que só tem você na casa é outra coisa.

### Regra de ouro

Nada aqui é aleatório de graça. Sussurro só chega em estágio que o jogo já
disse que produz sussurro; a âncora sempre diz a verdade e o jogador sabe
disso; o véu é função contínua da sanidade e de mais nada. Se o jogador for
conferir depois, tudo tem explicação.

### Verificação

`tools/testes/santeste.mjs` — 30 asserções, incluindo a medição do pool vazio
antes e depois. Regressão completa: **506 asserções, 0 falhas, 18 harnesses.**

Um aviso do processo, que ficou anotado no `LEIA-ME` dos testes: as primeiras
rodadas passavam sem provar nada porque estavam sendo feitas **com sanidade
cheia**, onde `lúcido` não produz nada por definição. E `mexerSan(-22)` sozinho
não muda estágio nenhum — `v9().escudo` são 30 pontos que absorvem a primeira
queda inteira.


## v64 — a linha de saldo

### A medição contradisse a suspeita óbvia

A queixa era: *"quase toda hora enquanto eu jogo, é difícil de entender o que
acontece pela forma que é dita."* A suspeita natural é frase comprida. Fui
medir as 851 falas do jogo:

```
mediana ........ 10 palavras
p90 ............ 16 palavras
acima de 28 .... 4 falas (e três delas são o tutorial)
```

As frases são **curtas**. O problema é outro, e é bem maior:

> **239 falas — 28% do total — acontecem coladas a uma mudança de recurso e
> não dizem o número.**

Você lê "A febre cedeu." e não sabe se gastou remédio, quanto, nem quanto
sobrou. Lê "Ele saiu de madrugada sozinho." e não sabe se perdeu uma pessoa.
A frase conta a **cena** e esconde a **conta**.

### O conserto não é reescrever a prosa

Reescrever 851 falas pra encaixar número em cada uma mataria o sentimento — e
o pedido foi explícito: mais fácil de entender **sem tirar** o sentimento.

Então a prosa fica intacta e o jogo mostra o saldo numa linha separada, em
fonte de mostrador, logo abaixo:

> A febre de Marlene cedeu de madrugada.
> `−1 remédio`
>
> Damião chegou no fim da tarde. Trouxe o que tinha nos bolsos.
> `+2 latas · +Damião`

A prosa é o que aconteceu com as pessoas. O saldo é o que aconteceu com a
casa. Duas vozes, dois trabalhos.

**Como ele sabe:** não perguntando a ninguém. Fotografa os recursos e mostra a
diferença quando a foto muda. Isso pega **toda** mudança, inclusive as que
acontecem em código que ninguém lembra que existe — e é por isso que é assim,
e não uma chamada manual em 239 lugares.

**A cor segue o significado, não o sinal.** Ganhar comida é dourado; ganhar
ruído é vermelho, mesmo sendo "+". Perder ruído é dourado, mesmo sendo "−".

**Quem chega e quem morre aparece pelo nome**, não como número.

Mudança pequena demais não vira linha (ruído sobe de 1 em 1 o tempo todo, e
virar linha a cada ponto transformaria o registro em chuvisco — que é o
problema de origem). Dá pra desligar, e a escolha vai pro save.

### O guia, uma ideia por linha

As quatro falas que passam de 28 palavras são quase todas da tela de ajuda,
que empacotava três regras numa frase só. Aqui a reescrita é certa e é a única
do jogo: isto é texto de **instrução**, não de história. A prosa da casa
continua intocada — ela não está explicando nada, está contando.

Média caiu pra **9 palavras por linha**, nenhuma acima de 14.

### Uma trava nova, porque eu me queimei

Troquei acentos por script e a substituição cega não distinguiu o **texto** que
o jogador lê do **identificador** que o código usa:

```
S.ruido          → S.ruído
{k:'remedio'}    → {k:'remédio'}
minimo:{ruido:3} → minimo:{ruído:3}
cena.casa.voce   → cena.casa.você     ← derrubava o Voltar da ajuda
```

JavaScript **aceita** acento em identificador, então nada disso deu erro de
sintaxe: deu erro de comportamento, calado, longe de onde foi escrito. O saldo
simplesmente parou de reportar remédio, água e ruído, e o teste pegou.

Virou trava de build: `montar.js` agora **quebra** se achar acento em nome de
campo ou de variável. Texto acentuado dentro de string continua livre — é lá
que o acento tem de estar.

### Testes

`tools/testes/saldoteste.mjs` — 26 asserções.

476 asserções em 17 harnesses, 0 falhas.

## v63 — cada arma faz uma coisa que só ela faz

### O problema, medido

São 12 armas. Nove delas diferem em `dano` e `kg` — e mais nada. Tirando esses
dois campos, ficam **indistinguíveis**. E o jogo consulta todas por uma função
só:

```js
melhorArma() → a de maior dano
```

Existe **uma** arma útil por vez, e as outras onze são peso. Achar um facão
depois de já ter uma marreta não era achado, era lixo.

### Duas descrições prometiam mecânica que não existia

| item | dizia | fazia |
|---|---|---|
| foice | "Alcance bom e corta o que encostar." | nada além de dano 3 |
| espeto | "Feita em casa. Mantém a coisa longe." | nada além de dano 2,2 |

Promessa escrita e não cumprida é a forma mais barata de mentir pro jogador.
Agora as duas cumprem, e as descrições de todas as nove foram reescritas pra
dizer o que a coisa faz de verdade.

### Os verbos

**A arma serve de ferramenta.** Nove armas cobrem seis ferramentas. Sai do que
a coisa É, não de tabela inventada: machado corta como serrote e cava como pá,
barra faz alavanca, faca tem ponta fina de chave de fenda.

Antes, faltando o serrote, você só tinha "Improvisar com o que tem" — **24% de
dar certo**. Agora tem um conserto de verdade, com preço: uma hora a mais, e a
arma sai pior do que entrou.

E os limites são duros, porque sem limite isso viraria chave-mestra:

- ferramenta sem substituto (a **escada**) continua faltando;
- cobrir só uma das duas ferramentas **não basta**;
- **arma não vira cimento** — faltando material, não há plano.

**A faca vai no cinto.** É a única arma que não ocupa a mão, e mão ocupada
atrapalha tudo que exige mão livre. É por isso que ela vale, com dano 1.

**O taco não quebra.** Madeira maciça, sem fio pra perder. 40 golpes e ele está
igual — enquanto o facão, nos mesmos 40, foi de 100 a 0.

**A foice chega antes.** Alcance vira vantagem na chance de acertar.

**O espeto não mata — te tira de lá.** 82% de sair inteiro, com tudo, sem
barulho. É uma vitória diferente, e às vezes melhor.

### Revólver e espingarda não ganharam verbo, de propósito

`municao` **já é** o verbo delas: são as únicas armas que acabam, e as únicas
que trazem o resto da rua junto (+14 de ruído no tiro dentro de casa). Alto,
finito e definitivo separa mais uma arma das outras do que qualquer coisa que
eu pendurasse por cima. A primeira versão do meu teste não contava isso e
reprovou o desenho por causa da régua — a régua é que estava errada.

### Testes

`tools/testes/itensteste.mjs` — 26 asserções. A primeira delas **mede o
problema**: tira `dano` e `kg` de cada arma e conta quantas sobram idênticas.

450 asserções em 16 harnesses, 0 falhas.

## v62 — mais fôlego nas falas da porta

### Medi antes de reescrever

A queixa era que as frases soam robotizadas. Fui olhar, e o problema não é a
qualidade do que está escrito — é a **quantidade**:

```
antes:  16 perguntas · 38 respostas boas · 45 ruins
depois: 16 perguntas · 86 respostas boas · 77 ruins
```

Com 2 respostas boas por pergunta, você vê a **mesma frase certa** na segunda
vez que faz a mesma pergunta. E resposta certa repetida é pior que errada
repetida, porque a certa é a que você mais ouve: quem sobrevive faz muita
pergunta e abre pouco.

Então nada foi reescrito. Foi **acrescentado**: +3 boas e +2 ruins por
pergunta, no mesmo tom do que já existia. Nenhuma pergunta ficou com menos de
4 de cada.

### O que faz uma resposta errada ser boa

Ela tem de ser explicável **depois**. O jogador erra, abre a porta, e no dia
seguinte consegue dizer em voz alta o que deixou passar. Os moldes que o jogo
já usava e que eu segui: espelho, vago, preciso demais, nega o universal, sabe
da casa, a frase quebra.

O molde novo: **responde outra pergunta.**

> — Encosta a mão na fresta, com a palma pra cima.
> — *Ele põe a mão, e a palma está virada pro chão.*
> ⚠ Você pediu palma pra cima. Ela ouviu o som do pedido, não o pedido.

### O morto que já bateu aqui estourava

`gerarVisitante` tem um ramo raro e bonito — alguém que já bateu na sua porta,
morreu, e volta:

```js
v2.respostas[k]={txt: errado ? sortear(PERG[k].ruim(ant))
                             : sortear(PERG[k].bom(ant)), …}
```

`ruim` é **array**, não função. E `bom` **não existe** — o campo se chama `ok`.
Duas chamadas de função em cima de coisas que não são função.

Sobreviveu tanto tempo porque o ramo só roda com 6% de chance, e só depois que
alguém que já visitou morreu. Quando acontecia, o jogador via a porta
simplesmente não responder.

Provado em teste antes de consertar (`typeof PERG[k].ruim === 'object'`,
`typeof PERG[k].bom === 'undefined'`), e depois: **200 visitantes gerados, 0
estouros**, todos com respostas montadas e as erradas com a explicação junto.

### Testes

`tools/testes/falasteste.mjs` — 18 asserções. Uma delas confere que **toda**
resposta errada explica por que estava errada; outra, que nenhuma fala repete
literalmente dentro da mesma pergunta; outra, que aplicar o bloco duas vezes
não infla a lista.

424 asserções em 17 harnesses, 0 falhas.

## v61 — o ouvido na porta, e o final no dia 30

### "Eu não escuto nada, e mesmo quando escuto não significa nada"

As duas metades da queixa estavam certas, e por motivos diferentes.

**Não escuto nada.** São 12 s de respiração sintetizada, num celular, com o
gerador roncando por baixo. O som existe e é bem feito — mas depender só dele
é apostar o miolo do jogo no alto-falante do aparelho.

Agora o que se ouve também se **vê**: um traço desenhado a partir do *mesmo
perfil* que gera o som. Não é legenda — é o mesmo dado, noutro sentido.

| no som | no traço |
|---|---|
| respiração | onda, com a régua pontilhada de "como é gente" atrás |
| passo | barra com altura de peso — sem peso, vira toco vermelho |
| roupa | o risco ao lado do passo; sem roupa, o risco some |
| engolir, fungar, tossir | pontos no alto; corpo mudo não desenha nenhum |
| ar sem peito atrás | a onda vira linha oca |

**Não significa nada.** Três defeitos de desenho, todos reais:

1. **O original sorteava 3 das 4 camadas pra perguntar.** Medido em 4.000
   sorteios: em **22,6% dos casos** o único defeito do mímico caía justamente
   na camada que ficou de fora — a resposta certa *não existia na tela*. Isso
   não é dificuldade, é armadilha, e é o que a regra de ouro proíbe.
   Agora as quatro camadas aparecem sempre.
2. **Não havia referência.** "Rápida demais" comparada com o quê? Agora existe
   um botão que lembra como é gente respirando, de graça — cobrar por isso
   seria cobrar pra ler a regra do jogo.
3. **Uma escuta só, julgada de memória.** Agora dá pra ouvir de novo quantas
   vezes quiser, a +3 de ruído cada. É decisão, não brinde: quem fica com a
   cara colada na porta ouve o jogo dizer que lá fora sabem disso.

E a ordem dos botões parou de ser sorteada a cada vez. Embaralhar as opções
impedia o jogador de aprender onde as coisas ficam.

### A variação é de tempo, não só de altura

Na primeira versão do traço a variação da respiração só mexia na **altura** do
pico — e no papel "gente de verdade" e "metrônomo" saíram quase idênticos. O
defeito existia no som e não existia no desenho.

Gente nunca repete o mesmo intervalo entre duas respiradas; metrônomo repete
sempre. Agora cada ciclo tem duração própria, e o **espaçamento desigual** é a
primeira coisa que o olho pega.

### O final também acontece no dia 30

A fuga no Opala é uma saída; chegar até o dia 30 é outra. Quem nunca achou o
carro também merece o final — e depois de um mês trancado nessa casa, é o
final que faz sentido: não houve mês nenhum.

`S.viuFinal` é dado puro e vai no save, então fechar o app no meio não faz o
final repetir na próxima abertura.

### Testes

`tools/testes/ouvteste.mjs` — 20 asserções, incluindo a medição dos 22,6% de
respostas impossíveis do desenho antigo.

406 asserções em 16 harnesses, 0 falhas.

## v60 — o final, e a abertura de volta

### O final

`s33-final.js` + `final/`. O jogo tinha fim; não tinha final. `fimOpala`
levava direto pra tela de estatística — você fugia e o jogo te mostrava
números. Entre uma coisa e a outra agora tem a história inteira: a irmã que
sai buscar comida, o mês contando coisas que não aconteceram, as três batidas,
a voz certa demais, a luz — e o hospital.

### Alinhar 274 s de narração sem poder ouvi-los

A narração são 274 s contínuos e eu não escuto áudio. Os tempos das 46 frases
saíram de **medir**: o mp3 foi decodificado no Chromium (Web Audio tem
decodificador de verdade), reduzido a um envelope de RMS a cada 20 ms, e as 46
frases foram encaixadas nas 95 pausas detectadas por **programação dinâmica** —
custo = (tempo previsto pela contagem de letras − tempo da pausa)².

Erro médio de **1,09 s**, máximo 3,12 s. E o erro é o teste: se a hipótese
sobre qual texto foi narrado estivesse errada, ele explodiria.

### A trilha sai da mesma linha do tempo que os quadros

Uma lista só manda na tela e no áudio. Duas listas que pudessem discordar era
o jeito garantido de a voz entrar por cima da narração.

Nada de ganho no olho: cada arquivo foi medido e o alvo é em LUFS.

| arquivo | RMS medido | tratamento |
|---|---|---|
| narração | −21,3 dB | loudnorm −19 |
| gravações de celular | −41,6 a −47,7 dB | passa-alta 95 Hz + redutor de ruído + loudnorm −17 |
| áudio do vídeo | −43,0 dB | loudnorm −23 |

As gravações estavam **20 a 26 dB** abaixo da narração. Subir 26 dB de um mp3
de WhatsApp sobe o chiado junto, por isso o passa-alta e o redutor vêm antes.

Música em **dois movimentos**, com silêncio entre eles: ela sai antes da porta
e volta quando a porta abre. As três batidas precisam cair no silêncio.

### Verificar por medida, já que não dá por escuta

```
cada pedaço no seu lugar ......... 16/16
voz no mesmo peso da narração .... 5/5 (dentro de 5 dB)
clipe ............................ nenhum (pico 0,896)
buraco de silêncio ............... nenhum
```

### A abertura narrada tinha sumido — e a culpa era minha

Você notou. Estava certo, e a causa é do §31.

`orqNovaNoite()` roda na carga da página pra preparar o orçamento da primeira
noite, e chama `marcarSujo()`. O save debounced disparava 1,2 s depois e
**gravava um save antes de o jogador digitar o nome**. Aí `temSave()` dizia que
havia partida, o boot mostrava "Tem uma casa esperando" na **primeira vez que
alguém abria o jogo**, e a abertura nunca tocava.

Nenhum erro. Nenhum aviso. Só a abertura sumindo.

**Não era um bloco: eram onze.** Todo bloco que embrulha `salvar()` escrevia
direto no localStorage com `JSON.parse(localStorage.getItem(CHAVE)||'{}')` — e
esse `||'{}'` é justamente a licença pra criar um save do nada. A regra agora é
uma frase:

> **Bloco ANEXA a um save. Bloco nunca CRIA um save.**

Mais duas guardas: `salvar()` desiste sem `S.nomeJogador`, e `temSave()` trata
save sem nome como lixo e apaga — quem já pegou a versão com o defeito não
fica preso na tela de "Voltar pra lá" com uma casa que nunca existiu.

`tools/testes/aberturateste.mjs` — 14 asserções, e a primeira delas é
"nada é escrito no localStorage antes de a partida começar".

### Dois defeitos que só os quadros renderizados pegaram

- `bloco()` recebia `cor` e **nunca aplicava `fillStyle`**: o texto herdava a
  cor do último gradiente pintado e ficava roxo-escuro sobre roxo-escuro.
- grão e vinheta eram pintados **por último**, ou seja, por cima das letras. A
  narração inteira estava ilegível.

### O caminho do iframe foi removido, não esquecido

A ideia era abrir `final/final.html` num iframe por cima do jogo. Dentro da
página do jogo o iframe **nunca completava a carga** — nenhum erro, nenhum
aviso, nem o evento `load`. Fora do jogo, a mesma página carrega em 1,5 s. Não
achei a causa, e caminho que só funciona no teste é pior que caminho nenhum.

O final dentro do jogo é a mesma cena lida na tela, com os mesmos tempos. O
filme existe à parte, como arquivo de vídeo.

### Três falas sem gravação

Dois pares de arquivos enviados eram **byte a byte idênticos** (mesmo md5).
Faltam "A comida tá acabando…", "Eu também vou." e "Mas…". Elas aparecem
escritas com o tempo respeitado — é só largar o mp3 na pasta e apontar em
`FALAS`.

### Testes

383 asserções em 15 harnesses, 0 falhas.

## v59 — memória cognitiva da casa (Fase 3)

`s32-memoria.js`. A casa passa a lembrar de **como** você joga — e a cobrar
por isso. Nada aqui é conteúdo novo: os três comportamentos são feitos com o
que o jogo já tinha, e o único registro novo (a isca) existe porque o
comportamento pedido precisava de um.

### Média móvel, não contador

Contador é injusto duas vezes: nunca esquece e nunca perdoa. Quem se escondeu
trinta vezes no dia 3 continuaria sendo "o que se esconde" no dia 20. A média
móvel exponencial (α = 0,28, **meia-vida de ~2 noites** medida em teste)
resolve os dois — e o esquecimento **é** a própria média sendo alimentada com
zero nas noites em que o método não apareceu. Não existe um segundo mecanismo
de decaimento pra discordar deste.

### A casa só age com certeza

`memLer` é a **única** porta de leitura e devolve **zero** — não "um pouco" —
enquanto a confiança não passa de 0,6. Confiança é `n/(n+4)`: **seis noites de
evidência** antes de a casa mexer uma palha. Sem isso ela reagiria a
coincidência, e perseguição sem causa é aleatoriedade com outro nome.

| n | 1 | 3 | 6 | 7 |
|---|---|---|---|---|
| confiança | 0,20 | 0,43 | 0,60 | **0,64** |
| lido | 0 | 0 | 0 | **0,90** |

### Os três comportamentos

**1 · Encarece, não elimina.** Método usado sempre torna a contra-anomalia dele
mais provável. O multiplicador é **sempre ≥ 1** e tem teto (1 + 0,70 × 1,4 =
1,98): no máximo dobra o peso de escolha, nunca zera nenhum outro. Testado em
todo o catálogo — mínimo 1,0, máximo 1,961.

A tabela `MEM_CONTRA` tem sete linhas e cada uma aponta pro conteúdo que já
existe: quem resolve com luz acesa fica mais sujeito a `avaria_fiacao` e
`avaria_curto`; quem se esconde, ao Imitador e ao Rastejante; quem corre, ao
Coro. Onde o jogo não tem contra pro método, a linha não existe — inventar uma
seria conteúdo novo disfarçado de balanceamento.

A rotina de cômodo não tem tabela nenhuma: **o cômodo mais pisado é o que
estraga**, lido do `AVARIAS[k].onde` que o jogo já tinha escrito.

**2 · A isca.** Quem resolve tudo com luz acesa nunca precisou do escuro. Com
`metodos.luz > 0,75` e confiança, numa calmaria, a casa apaga uma luminária
perto de você. Tem piscada antes (`tell`), paga orçamento pelo orquestrador
como qualquer evento, deixa cicatriz, e não volta antes de 5 noites.

Calmaria neste jogo **não** é "não há bicho na casa": fora da invasão o jogador
nem anda pela casa. É o bicho **longe** — 3 cômodos ou mais, num casarão de
diâmetro 4 — no meio da noite, sem evento nos últimos 4 turnos e fora do vale.
A primeira versão barrava qualquer coisa no ar e com isso a isca ficou
**inalcançável em jogo real**: o teste passava porque montava o estado à mão.
Comportamento que nenhum caminho real alcança é comportamento morto.

**3 · O ciclo quebrado.** Quatro noites seguidas de invasão ensinam um ritmo.
Na quinta a casa não faz nada:

> Nada bateu na porta.
> **Nenhum susto. Só silêncio.**
> Você fica acordado até de manhã esperando o que não veio.

A noite inteira vira vale, nada pede permissão porque nada é concedido, e não
acontece duas vezes seguidas (cooldown de 8 noites). Só dispara com o ritmo
**aprendido** — quebrar um ritmo que ninguém percebeu é bug com nome bonito.
Uma única noite sem invasão zera a contagem.

### Vazia por decisão ≠ vazia por azar

`orqSimular` passou a separar as duas. Com a memória limpa: 10.000 noites, 0
zeradas, 0 por decisão. Com o ritmo aprendido: 3.000 noites, **4 por decisão, 0
zeradas**. A única noite sem eventos é a que a casa escolheu esvaziar.

### Hostilidade com teto

Sobe quando você ganha a noite (+0,12 por ponto forte), desce quando a casa
acerta, decai 0,06 por noite sozinha, e **para em 0,70**. Por melhor que você
jogue, existe um limite de quanto a casa aperta — jogar bem nunca vira punição
infinita.

### Consolidação sem apagar em silêncio

Balde cheio (16 entradas) não apaga o passado: as mais fracas viram uma só,
`outros`, que carrega a massa delas. A casa deixa de saber **qual** era e
continua sabendo **quanto** era.

### Testes

`tools/testes/memteste.mjs` — 59 asserções, 0 falhas. Inclui a prova de que
**nada no sistema de memória chama `Math.random`** (contador instalado por cima
de `Math.random` durante uma noite inteira simulada: 0 usos), que o estado é
dado puro que sobrevive a JSON ida e volta, e que save legado carrega com a
casa sem saber nada de você — que é o estado correto.

Regressão completa depois do §32: 354 asserções em 11 harnesses, 0 falhas,
varredura ampla com 0 estouros e 0 invariantes violados.

### De quebra: `diasAteTeto` não queria dizer o que dizia

A fumaça no pacote pegou. O comentário do §25 prometia que `dia >= diasAteTeto`
devolve o teto; a conta dividia por `diasAteTeto` e o teto só chegava no **dia
13**. O erro sobreviveu a uma suíte inteira porque a asserção que "provava" a
saturação era:

```js
ok('satura em 0.80', d.t[d.diasAteTeto]===0.80 || d.t[d.diasAteTeto-1+1]===0.80);
```

Os dois lados são o **mesmo índice**. Ela passava sempre e não media nada.

Agora a conta divide por `diasAteTeto-1` e o dia 12 devolve exatamente 0,80 —
nome, comentário e código dizendo a mesma coisa. E o teste passou a conferir
**dois** pontos: que o dia 12 chegou no teto e que o dia 11 ainda não.

| dia | 1 | 5 | 9 | 11 | **12** | 13 | 40 |
|---|---|---|---|---|---|---|---|
| multiplicador | 0,600 | 0,660 | 0,764 | 0,795 | **0,800** | 0,800 | 0,800 |

### Pacote

`v59.zip` — 65 arquivos, 2,8 MB, validado em diretório limpo: descompacta,
`node montar.js` reconstrói o `index.html` sozinho, e o jogo abre e joga a
partir do que saiu do zip (13 asserções de fumaça sobre o pacote, não sobre a
cópia de trabalho).

## v58 — orquestrador de tensão (Fase 2)

`s31-orquestrador.js`. A camada que faltava: até aqui cada sistema sorteava
sozinho, e o jogador vivia a soma de dados independentes — às vezes três
sustos colados, às vezes uma noite morta. Isso **é** aleatoriedade, que é o
que a regra de ouro proíbe. Agora existe **um** lugar que autoriza evento.

### O silêncio é conteúdo

Os vales de silêncio são agendados **antes** de qualquer permissão ser pedida.
Não é o que sobra da noite: é o que foi reservado dela. Dentro do vale nada
passa — nem o primordial. É o único bloqueio absoluto do sistema, porque
silêncio que qualquer prioridade fura deixa de ser silêncio reservado.

Fora de invasão o relógio de turnos não anda, e turno 0 não é vale: a casa
continua podendo estragar de dia. Sem essa porta, uma noite que acabasse
dentro de um vale deixaria a casa congelada até a noite seguinte.

### Critério de aceite — 10.000 noites simuladas

```
[orq] 10000 noites · média 5.91 · min 3 · p50 6 · p90 7 · max 9
[orq] noites zeradas: 0 · estouros de orçamento: 0 · faixa alvo 4–8 · DENTRO
  3 eventos | # 20
  4 eventos | ##### 461
  5 eventos | ############################# 2711
  6 eventos | ############################################## 4293
  7 eventos | ######################## 2227
  8 eventos | ### 282
  9 eventos | # 6
```

`orqHistograma(n, semente)` no console imprime isso a qualquer hora.

### Noite zerada é impossível por construção, não por sorte

No turno 1 de uma noite nova não há cooldown, não há vale (o primeiro começa
no turno 3) e o orçamento está inteiro. O primeiro candidato elegível **sempre**
passa. Um teste de 500 noites confere justamente isso — e foi ele que pegou o
defeito: `orqTentar` desistia do turno inteiro quando o sorteio caía num
candidato de precondição falha. Agora a negativa **do candidato** (precondição,
incompatibilidade) tira ele do pool e o turno segue; só a negativa **do turno**
(vale, cooldown, orçamento) encerra a tentativa.

### A autoridade é real — ninguém fura a fila

| quem | como pede |
|---|---|
| invasão | `checarInvasao` pede permissão pelo bicho sorteado |
| avaria espontânea | `abrirAvaria` pede permissão antes de inserir |
| avaria de cadeia | **não pede** — foi ganha pelo descuido, negá-la apagaria consequência |

A linha 1 do `checarInvasao` original é um segundo sorteio que passaria por
cima da negativa. Ele é silenciado zerando `riscoInvasao` enquanto o original
decide (`chance(0)` é falso sempre). Sem isso o orquestrador não seria
autoridade, seria sugestão.

### Nada se perde, nada se empilha

Evento negado volta ao pool com peso maior (+0,45 por negativa, teto 1,8), uma
entrada por id — não uma por negativa — e some da fila quando é concedido. A
janela de repetição encarece o que acabou de sair (×0,25) sem proibir.

### As cinco faixas de prioridade, agora com conteúdo em todas

A primeira versão de `classeDe` olhava `duracaoTurnos[1]>=20` e classificava
**toda** avaria como persistente: duas das cinco faixas ficavam vazias —
parâmetro morto travestido de design. A faixa agora sai do que a coisa custa ao
jogador, lida dos dados que a `AVARIAS` já tem:

| faixa | prioridade | quantos | regra |
|---|---|---|---|
| primordial | 100 | 1 | o primordial |
| criatura | 80 | 5 | as outras criaturas |
| persistente | 55 | 11 | avaria com `pior` (piora sozinha) ou `efeito` (cobra toda noite) |
| comum | 30 | 2 | avaria terminal de cadeia, mas inerte por noite |
| ambiental | 10 | 2 | avaria que não piora nem cobra: textura |

Preempção só acontece com Δprioridade ≥ 25 (`ORQ_CFG.deltaPreempcao`): trocar
um evento por outro quase igual confunde mais do que ajuda.

**Desvio declarado:** o prompt chamava a faixa mais baixa de "clima ambiental".
O clima e os ruídos ambientes da casa **não** passam pelo orquestrador — o
`RUIDOS_CASA` é desenho de som contínuo, e fazê-lo pedir permissão calaria a
casa. A faixa existe e tem conteúdo (avaria inerte), mas não é o clima.

### Ciclo de vida do que está no ar

`S.anomAtivasLista` agora fecha o ciclo: criatura sai ao fim da invasão (em
`finally`, dê no que der — fuga, morte, amanhecer) e no início de cada noite;
avaria sai quando é reparada e **fica** quando não é, porque ela é a casa
quebrada. Sem isso um id de criatura pendurado barraria as outras cinco pra
sempre — cada uma lista as outras em `incompativelCom`.

### Testes

`tools/testes/orqteste.mjs` — 51 asserções, 0 falhas. Orçamento como teto,
cooldown global e de categoria isolados um do outro, matriz de coexistência
simétrica nos 420 pares, preempção, fila de adiados, vales, as 10.000 noites,
determinismo por semente, estado puro no save, save legado sem orquestrador, e
a autoridade não sendo furada.

## v57 — núcleo de governança (Fase 1)

`s30-nucleo.js`. Contrato, não conteúdo: schema, máquina de estados, RNG
determinístico e âncoras de percepção. **Nenhuma das anomalias existentes foi
reescrita** — elas são envelopadas por adaptadores que apontam pra fonte.

### As quatro decisões que tomei

| pergunta | decisão |
|---|---|
| qual é o conjunto das "33"? | **15 AVARIAS + 6 criaturas = 21 eventos governados.** As 12 de `ANOMALIAS` ficam fora: elas já **são** os tells da porta. 12+15+6=33 é de onde veio o número |
| RNG 100% semeado? | **não.** Semeado no que decide jogo; cosmético (jitter de áudio, grão, oscilação) fica com `Math.random` |
| as 12 entram no schema? | **não** — erro de categoria: precisariam de um tell do tell |
| a invasão vira serializável? | **sim.** Era variável local; fechar o app perdia a noite |

### O que o núcleo entrega

- **`criarRNG(seed)`** — mulberry32. Estado é **um número**, então cabe no save.
  `next`, `inteiro`, `escolher`, `pesado`, `chance`. Semente de `saveId + noite`.
- **`S.debug.replay(seed, acoes)`** — reproduz uma sessão idêntica. Ações são
  dado puro (`{fn, args}`), nunca closure.
- **`validarAnomalia`** — **anomalia sem `tell` é rejeitada**, e a mensagem diz
  "SEM TELL — anomalia sem aviso é bug".
- **`transicionar`** com as 10 fases e validação: transição inválida lança em
  modo dev, registra em produção, e **não muda o estado**.
- **`vigiarEstados`** — teto de turnos por estado. Softlock deixa de depender de
  sorte.
- **`PERCEPCAO_INVIOLAVEL`** congelado: relógio, inventário e porta da frente
  nunca são falsificados. Sem âncora, o jogador conclui que nada é confiável e
  **para de investigar**.
- **`espelharInvasao` / `reidratarInvasao`** — o `I` vira dado puro em `S.inv`.
  Função e nó de DOM são **filtrados na saída**, não confiados ao chamador.

### Os parâmetros mortos da auditoria, agora implementados

| era | virou |
|---|---|
| `I.divididas` (Coro) — escrito 2×, lido 0× | as metades **realmente** param de convergir enquanto divididas |
| `I.recuo` (Magro) — escrito 2×, lido 0× | ele **anda pra longe** de você enquanto recua |
| `BICHOS.raro` — declarado, nunca lido | o campo manda; `estreia` também. O id deixou de estar cravado |
| chamado do imitador duplicado | o do jogo base fica calado enquanto o mecânico fala |

### O achado que me fez mudar o design do Magro

Ao testar `I.recuo` descobri que **a casa começa com todas as luminárias
acesas**. O filtro "não entra em cômodo aceso" esvaziava as opções toda vez e
`moverMonstro` devolvia a posição atual: **o Magro nunca andava.** Inerte no jogo
normal — o mesmo defeito do imitador e do rastejante, e eu tinha subestimado como
"exploit de borda" na auditoria.

Luz agora **deter, não paralisa**: ele prefere o escuro e paga um turno pra
atravessar o aceso, com aviso na tela. O contra-jogo fica melhor — atrasar é
diferente de congelar, e congelar é o que dava exploit.

### E uma contradição minha que o teste pegou

`resolvida` tinha teto finito **e** era isenta do vigia. Ou tem teto e o vigia
age, ou é terminal. `resolvida` é descanso, não fim: agora volta pra `dormente`,
senão a anomalia nunca mais dispara. Só `cicatriz` é terminal.

### Testes

`nucleoteste`: **50 verificações, 0 falhas**. Regressão: `anomteste`,
`rumoteste`, `progteste`, `difteste`, `fugateste`, `v50` — 0 falhas. `varre`: 0
estouros, 0 invariantes violados.

### Ainda não feito

Fase 2 (orquestrador de tensão) e Fase 3 (memória cognitiva da casa).

---

## v56 — marcos e o Opala

`s29-rumo.js`, com `RUMO_CFG`. Duas coisas que se cruzam de propósito.

### Marcos: o mundo muda a cada 4 dias

O jogo **já tinha** uma "virada do meio" (`VIRADAS`, index.html:2039) que dispara
uma vez entre os dias 6 e 7. Não dupliquei: generalizei. Os marcos são periódicos
e reusam as mesmas três forças.

| marco | sinal para o jogador | efeito |
|---|---|---|
| A cidade esvaziou mais | *"O rádio não pega mais ninguém no dial de sempre."* | −7% de rendimento no saque, teto −28% |
| Elas ficaram mais ousadas | *"Bateram antes de escurecer."* + rugido | +5% no risco de invasão, teto +20% |
| Chegou alguém | o evento é o sinal | 55% alguém entra no abrigo; 45% um grupo passa e repara na casa |

Primeiro marco no dia 5, no máximo 5 por partida, e os três tipos aparecem antes
de qualquer um repetir.

**Marco não é o multiplicador do §25.** O marco **soma** no risco; o §25
**multiplica**. Eixos separados, e o teste prova medindo a diferença.

### O objetivo final: o Opala

**Antes de escolher: já existia um.** `telaResgate()` no dia 12 — o caminhão do
Exército, com quatro finais. Não joguei fora; seria destruir um final que
funciona por engano de leitura.

O Opala é um **segundo caminho**, e ele existe porque o primeiro tem um problema:
o caminhão **acontece com você**. Você não faz nada pra merecê-lo. O Opala só sai
se você construir.

| exigência | como se cumpre |
|---|---|
| 2 peças de motor | **só aparecem em oficina e comércio** — expedição específica |
| 55 de diesel guardado | acúmulo, competindo com o gerador |
| 4 noites depois de descobrir | o motor precisa de tempo parado |

**Descoberto no jogo, não anunciado:** você entra no quintal e levanta a lona — e
só repara que dá pra mexer nele se tiver oficina. **Checklist rastreável:** a
entrada "O Opala" aparece no quintal e diz o que falta, item a item. **Final
próprio:** cena `saida`, desenhada por função — a estrada fugindo, as faixas
passando, e a casa encolhendo no retrovisor com a luz ainda acesa.

Narrativamente distinto dos dois lados: no caminhão alguém te salva; no Opala
você sai por conta, e a cidade fica com o que você deixou.

### A prova de que o objetivo continua alcançável

Com **200 marcos de cada tipo** (muito além do teto de 5):

1. rendimento do saque para em **0,72** — nunca chega a zero
2. os dois locais que têm a peça **continuam existindo**
3. risco de invasão no pior caso possível: **0,88** — nunca chega a 1, sempre dá
   pra passar a noite
4. o diesel exigido (55) cabe no máximo que o tanque guarda (100)
5. as noites exigidas passam sozinhas com o tempo

### Três defeitos que os testes acharam

1. **`industrial` não existe.** Eu escrevi que a peça apareceria em "oficina e
   industrial"; os tipos de casa deste jogo são `simples, abandonada, boa, sitio,
   comercio, oficina, tocada`. A peça estava indo pra **uma fonte só**, e a
   promessa de "expedições específicas" ficava vazia. Corrigido pra oficina e
   comércio.
2. **Uma asserção varria scrollback compartilhado.** O teste do final procurava a
   *ausência* da palavra "morreu" em `#texto` — e ela estava lá, escrita por
   outro teste no mesmo buffer. Trocada por afirmar a identidade do final.
3. **`RUMO_CFG` referenciado fora da página** no próprio teste.

### Testes

`rumoteste`: **30 verificações, 0 falhas**. Regressão: `progteste`, `portateste`,
`anomteste`, `difteste`, `fugateste`, `expteste`, `v50`, `qual`, `baktest` — 0
falhas. `varre`: 0 estouros, 0 invariantes violados.

---

## v55 — experiência por uso

`s28-progresso.js`, com `PROG_CFG`. Nada de XP por abate.

| atributo | sobe ao | quanto |
|---|---|---|
| Velocidade | correr | 9 por cômodo **novo** na invasão |
| Força | carregar peso | 0,55 por (kg−6) × hora |
| Destreza | consertar | 26 por reparo |
| Furtividade | escapar sem ser visto | 60 por fuga limpa |

**Usa `S.ficha.pontos` e `parcelas()` do §19.** Não existe objeto novo de
atributo nem contador paralelo — `S.prog` guarda **só o progresso parcial** rumo
ao próximo ponto; quando fecha, o ponto entra em `S.ficha.pontos`, o mesmo lugar
de sempre.

### A curva desacelera

`custo(n) = 100 × n^1,55`. Do 1º ao 8º ponto: **100 → 293 → 549 → 857 → 1212 →
1607 → 2041 → 2511**. O salto também cresce, não só o custo.

### Os quatro anti-exploits, um por atributo

| exploit | proteção | medido |
|---|---|---|
| correr em círculo | só conta cômodo **novo** na invasão | 40 idas e vindas entre 2 cômodos = 18 de XP (os 2 primeiros), não 360 |
| largar/pegar o mesmo objeto | o crédito é por **hora**, e hora só passa em `gastarHoras` | 60 ciclos = **0** |
| consertar/quebrar o mesmo item | um item conta **uma vez por dia** | 30 reparos da mesma faca = 26, o de um |
| re-disparar a mesma fuga | uma vez por fuga, e só com `avisos === 0` | 20 disparos = 60, o de uma. Fuga com detecção = 0 |

Mais um teto diário de 140 por atributo, pra sessão longa não virar corrida de
paciência.

### O teto de 10, provado em quatro caminhos

Doação gigante de uma vez, ganho ao longo de 400 dias, quem já está em 10, e o
caso de o **efetivo** estar em 10 por roupa enquanto o **investido** está baixo —
nesse ainda faz sentido treinar, porque tirar a roupa não pode derrubar o que
você treinou.

### Duas correções ao pedido, ditas em vez de fingidas

1. **A barra de progresso é DOM, não canvas.** Foi pedida "desenhada por função
   no canvas". A ficha deste jogo **não é canvas**: `telaFicha` monta um `<div
   id="ficha">` com innerHTML (§19:476). Desenhar em canvas exigiria uma segunda
   tela de ficha só pra barra — mais código, duas telas pra manter, zero ganho.
   A barra fica onde o número do atributo já está. (O §19 ganhou um `data-atr`
   por atributo, que é a âncora — a lista era string montada, sem elemento por
   atributo.)
2. **O teste do teto de 10 estava errado, não o código.** A primeira versão
   esperava que uma doação gigante de uma vez chegasse a 10; o teto **diário**
   morde antes, e está certo — uma doação gigante não pode furar o limite do dia.
   O teste agora prova as duas coisas separadamente.

### Um teste que era sorteio

`portateste` exigia `custo > 0` na medição de desempenho da silhueta. O efeito é
~0,04 ms e o ruído da bancada é ~0,5 ms: afirmar o **sinal** de algo 25× menor
que o ruído não é teste. Agora ele mede o ruído (diferença entre duas leituras da
mesma condição) e afirma o que dá pra afirmar: **o custo é menor que o ruído**.

### Migração

Save antigo não tem `prog`. O valor neutro é **zero progresso parcial**: não zera
atributo nenhum (o que foi investido na criação continua em `S.ficha.pontos`) e
não presenteia com XP por um passado que ninguém mediu.

### Testes

`progteste`: **28 verificações, 0 falhas**. Regressão: `portateste`, `anomteste`,
`difteste`, `v50`, `qual` — 0 falhas.

### Ainda não feito deste prompt

Partes 2 (objetivo final) e 3 (marcos intermediários). O objetivo final **já
existe** — `telaResgate()` no dia 12, o caminhão do Exército, com quatro finais.
Aprofundar isso é trabalho separado e não foi começado.

---

## v54 — a silhueta debaixo da porta

`s27-porta.js`, com `PORTA_CFG`.

### A tensão de design, dita em voz alta

Foi pedido que cada anomalia fosse **"reconhecível de relance"**. Ao pé da letra,
isso **mata o jogo**: a dúvida na porta é o coração dele, e se dá pra identificar
a coisa num relance não existe dilema — é só olhar e decidir.

O que fiz no lugar: a sombra dá **categoria, não identidade**. Você vê que tem
coisa alta demais, ou baixa e comprida, ou larga demais pro vão, ou mais de uma.
É o bastante pra desconfiar e escolher olhar; não é o bastante pra ter certeza.

**Quinze criaturas caem em seis formas**, e compartilhar é de propósito.

| forma | criaturas | como se lê |
|---|---|---|
| gente | vizinho, mae, casca, fome | duas manchas de sapato |
| alto demais | alto, magro, dobra | manchas estreitas, sombra longa no chão |
| baixo e comprido | rastejo, raiz | a fresta some quase inteira |
| largo demais | inchado, batedor | vai de um batente ao outro |
| mais de um | matilhaC, crianca | mais pés do que cabe numa pessoa |
| não dá pra dizer | fundo, aquilo | não fecha formato nenhum |

### O que não foi mexido

O olho mágico **já tinha** revelação progressiva por zonas, e as 15 criaturas
**já tinham** defeitos próprios (`DEFEITO_CRIATURA`). Isso funciona e ficou como
estava. O que faltava era a sombra debaixo da porta — a primeira coisa que você
vê, antes de decidir se vale gastar o olho mágico — que era retângulo preto igual
pra todo mundo.

### Ritmo de batida por forma

Largo bate forte e devagar (`0s 0.9s`, força 1.5); rastejo bate fraco e miúdo
(`0s .16s .30s .52s`, força .55); "errado" bate fora de qualquer tempo
(`0s .31s .37s 1.1s`). Seis compassos, nenhum repetido.

### Escala relativa, verificada

Medido em **320, 390, 540, 768 e 1080 px**: nenhuma forma sai do canvas e nenhuma
escapa do enquadramento da porta, nem no pior caso do balanço.

### Galeria

    portaGaleria()          as seis formas lado a lado, no canvas do jogo
    portaMostrar('inchado') põe aquela criatura na porta agora

A galeria é **no canvas do jogo**, não numa página separada — página separada
teria de copiar a tabela `FORMA`, e cópia diverge do original no primeiro ajuste.

### Dois defeitos que os testes acharam

1. **Eu chutei a geometria da porta.** A primeira versão usava `w*.52` e `h*.12`;
   os valores reais são `Math.min(w*.60,h*.52)` e `h*.055`, com `chao=h*.90`. A
   mancha saía deslocada. Agora está copiada linha por linha do original, com o
   endereço no comentário.
2. **A medição de custo deu número negativo** (−0,8 ms: desenhar com a sombra
   "mais rápido" que sem). Era aquecimento de JIT. Com aquecimento e medindo nas
   duas ordens: **0,024 ms**, dentro do próprio ruído das amostras — o que é uma
   afirmação mais forte que "menos de 1 ms".

**Isto é proxy, não medição em celular.** Não há instrumentação de quadro no
projeto e eu meço em Chromium headless num servidor.

### Testes

`portateste`: **17 verificações, 0 falhas**. Regressão: `anomteste`, `difteste`,
`fugateste`, `v50` — 0 falhas. `varre`: 184 cliques, 0 estouros.

---

## v53 — as anomalias viram a ameaça

`s26-anomalias.js`, com `ANOM_CFG`. A dificuldade vem do §25 — este bloco
**não cria multiplicador próprio**, como foi pedido.

### O que existia

Seis criaturas com nome, aparência e uma frase de fraqueza — e **uma perseguição
só para todas**: `moverMonstro` andava pro vizinho mais perto de `I.ruidoEm`
enquanto `I.memoria > 0`, senão sorteava. `vel` e `mem` só mudavam números dentro
dessa mesma regra, e o campo `fraco` era **texto exibido, nunca regra**.

### Ciclo de estado explícito

```
RONDA → SUSPEITA → CACA → PERDEU → (volta a RONDA)
```

`PERDEU` é fase de verdade: ela vasculha **em volta** do último lugar conhecido
antes de desistir. Há teto de turnos em `CACA` — nenhuma perseguição é eterna — e
`cooldown` depois de desistir, que é a janela de respiro do jogador.

### Regra única por criatura, com contra-jogo descobrível

| criatura | reage a | contra-jogo |
|---|---|---|
| o Magro | **luz** | não entra em cômodo aceso; a lanterna o afasta |
| o que Rasteja | **rastro** | ignora barulho, segue por onde você pisou |
| Muitas Bocas | **som** | barulho alto separa as duas metades |
| o que Chama | **resposta** | sem resposta vai pro barulho; responder entrega sua posição exata |
| o Inchado | **passagem** | perde turno em cômodo apertado |
| aquilo | **olhar** | olhar direto o aproxima e custa sanidade |

A dica de cada uma aparece em **"Escutar onde ele está"** — descoberta jogando,
sem wiki.

### Aviso antes do dano, garantido

Um turno antes de encostar, a criatura é **obrigada** a emitir sinal, com texto
próprio por criatura. `ANOM_CFG.distanciaAviso` nunca pode ser zero.

### Presença fora do combate

Cada criatura deixa uma marca diferente na casa, e a marca **ainda está lá dias
depois** — aparece ao entrar no cômodo, com quanto tempo faz. Teto de 6 marcas.

### Dois bugs que o teste de 2000 turnos achou — e que teriam passado

O teste roda cada criatura por 2000 turnos e acusa se alguma passa 200 turnos
seguidos na mesma fase. Ele pegou **duas criaturas completamente inertes**:

1. **O imitador ficava preso em RONDA pra sempre.** A primeira versão fazia ele
   ignorar ruído enquanto `respondeu` fosse falso — e nada no jogo jamais setava
   esse campo. Corrigido: ele ouve como as outras, e o que a resposta muda é a
   **precisão** (barulho vs. sua posição exata). O chamado também virou mecânica
   de verdade: antes era só texto de clima dentro de `turnoMonstro`, sem marcar
   nada.
2. **O rastejante ficava preso em RONDA pela mesma razão estrutural.** Ele recusa
   som (certo) e não tinha nenhuma outra porta de entrada (errado). Ganhou
   `anomPisou()`: quem lê o chão acorda quando você anda, não quando você faz
   barulho.

Uma criatura que nunca sai de ronda é uma criatura que não existe. As duas teriam
sido publicadas inofensivas.

### Debug

    anomInvocar('coro')    começa uma invasão com aquela criatura
    anomEstado(I)          fase, turnos, trilha, cooldown, marcas

### Testes

`anomteste`: **28 verificações, 0 falhas**. Regressão: `difteste`, `fugateste`,
`expteste`, `v50`, `qual` — 0 falhas. `varre`: 205 cliques, 0 estouros.

---

## v52 — curva de dificuldade

Multiplicador **único e centralizado** em `s25-dificuldade.js`, com `DIF_CFG`.

    dia 1 → 0.60     sobe (smoothstep, 12 dias)     satura → 0.80

Nunca volta a 1.00, nunca passa de 0.80. A redução permanente de 20% é o teto;
os 40% do dia 1 são a rampa.

### Cinco pontos de aplicação, um embrulho cada

| função | o que controla | modo |
|---|---|---|
| `riscoInvasao` | frequência das anomalias | direto |
| `escassez` | escassez de recursos | direto |
| `pegarMal` | dano recebido (duração do mal) | direto |
| `gastoComida` | custo de fome | direto |
| `folegoPorta` | agressividade suportada | **inverso** |

**Por que `folegoPorta` é inverso:** ele diz quantos encontros você aguenta numa
invasão. Multiplicar por 0.60 ali teria deixado o jogo **mais difícil**, não
menos. Existe `difInverso()` separado, com nome diferente, pra ninguém aplicar o
errado por distração.

### Prova de que não há dupla aplicação

O teste instrumenta `dif()` e conta quantas vezes ela é chamada por invocação de
cada função embrulhada. **Todas devolvem exatamente 1.** Além disso
`embrulharUmaVez()` recusa um segundo embrulho e avisa no console — o teste
tenta embrulhar `escassez` de novo e prova que o valor não muda.

### Uma coisa que foi pedida e NÃO existe neste jogo

**"Tempo de reação exigido em eventos".** Não há nenhuma decisão com prazo: o
jogo é de menu e espera indefinidamente pelo toque. A varredura achou um único
`setTimeout` resolvendo promessa, e é o vigia anti-travamento. A tela do resgate
diz "você tem uns quarenta segundos pra decidir", mas é texto — não há contagem.
Está declarado em vez de fingido. Se um dia existir decisão com prazo, ela usa
`difInverso()` e nada mais precisa mudar.

### Um defeito que o teste achou

`dificuldadeNoDia(1e9)` saturava em 0.80 mas `dificuldadeNoDia(Infinity)` caía
em 0.60 — duas respostas opostas para "número absurdo". A regra virou explícita:
**não-número é save corrompido e cai no dia 1** (o mais fácil: diante de estado
quebrado o benefício é do jogador); **número válido, ainda que absurdo, satura**.

### Save

Nada a migrar. A dificuldade é função pura de `S.dia`, que todo save já tem.
Quem estava no dia 7 entra na curva no ponto do dia 7 — nem punido nem
presenteado. Guardar o multiplicador no save criaria um segundo lugar onde a
verdade mora, e um save velho ficaria preso numa curva antiga pra sempre.

### Debug

    difDia(20)     pula pro dia 20 e mostra o multiplicador na tela
    difTabela()    imprime a curva inteira
    difEstado()    dia, valor, inverso, config e os cinco pontos

### Testes

`difteste`: **24 verificações, 0 falhas**. Regressão: `fugateste`, `expteste`,
`v50`, `qual` — 0 falhas.

---

## v51 — auditoria, expedição transacional e fuga jogável

Quatro fases, quatro commits. O resumo do que quebrou, por que quebrou e o que
mudou.

---

### O que quebrou, e por quê

**O jogador saía pra rua, achava coisas, e voltava pra casa sem nada — com uma
tela dizendo "O jogo travou aqui".**

A causa não era o que parecia. Não era exceção no código de coleta, não era save
sobrescrito, não era sprite faltando (este jogo não usa sprite nenhum). Era uma
**colisão de nome global**.

O jogo é distribuído como um HTML só, e `montar.js` injeta 14 blocos `.js` dentro
dele. Todos compartilham **um escopo global único**: 1 200 nomes de topo num
espaço só. Quando dois blocos escolhem o mesmo nome sem saber um do outro, o
segundo apaga o primeiro — **sem erro nenhum na carga**.

Foi o que aconteceu duas vezes:

| nome | o que era | o que passou a ser |
|---|---|---|
| `capacidade` | quantos **quilos** você carrega na expedição, recebe o **parceiro** | quantos **slots** um baú tem, recebe o **id do baú** (§16) |
| `ficha` | desenha uma **linha de tela** `(nome, tag, texto)` | devolve a **ficha de personagem** `()` (§19) |

A primeira colisão fazia `etapaCarga` chamar `BAUS[parceiro].slots` na sua
primeira linha — antes até de `limpar()`. Por isso a tela nem trocava: o jogador
ficava olhando o texto do saque com a barra de ações vazia, até o vigia disparar
14 segundos depois. E como o saque só era creditado no **fim** de `recolher()`,
voltar pra casa pelo botão do vigia significava perder tudo.

Medido: **28 estouros em 63 expedições**. Praticamente toda saída pra rua que
chegava na tela de carga.

A segunda colisão era silenciosa de outro jeito: 20 e tantas listas do jogo
— gente no abrigo, itens do saque, bancada de armas — simplesmente **pararam de
desenhar**.

Nenhuma das duas apareceu em teste nenhum durante versões inteiras, porque
nenhuma produz erro.

---

### O que mudou

#### Fase 0 — auditoria (`docs/AUDITORIA.md`)
Mapa da arquitetura, da máquina de estados, dos nove depósitos de inventário,
dos pontos de save, dos teleportes e dos acoplamentos indevidos. Nenhuma linha de
código alterada. Veredito das seis hipóteses do briefing: **H2 confirmada**, H1
confirmada em parte, H3/H4/H5/H6 descartadas como causa.

#### Fase 1 — a expedição parou de comer o saque
- `s16`: `capacidade` → **`capacidadeBau`**
- `s19`: `ficha()` → **`fichaJogador()`**
- **`montar.js` quebra o build** se um nome novo colidir. As cinco substituições
  deliberadas estão declaradas em `COLISAO_OK`, cada uma com o motivo escrito.
- **`s23-expedicao.js`** (novo): o saque virou transacional. O `levar` deixou de
  ser variável local e passou a ser `S.exped.levar`, **dentro do estado salvo**.
  Mesma referência de objeto, então a fuga que corta 40% e o susto que corta pela
  metade continuam funcionando sem uma linha alterada.
  - cada pegada marca o save: o que está na sua mão está no disco
  - travou no meio? na próxima abertura o saque volta com você
  - `socorro()` deixou de descartar trabalho: credita antes de levar pra casa
  - achado sem nome, sem quantidade ou com peso `NaN` é registrado e ignorado
  - erro parou de ser engolido: console com contexto + anel de 20 em `S.erros`

#### Fase 2 — varredura (`docs/BUGS.md`)
755 cliques aleatórios em 5 sementes, com toda função global embrulhada num
`try/catch` que denuncia quem estoura, e invariantes checados a cada 20 cliques.
Depois da Fase 1: **0 estouros, 0 invariantes violados, 0 travamentos**.
- **Backup do save**: eram 7 gravações por save, uma por bloco, sem nenhuma cópia
  de segurança. Agora o conteúdo anterior vai pra uma chave de sombra antes da
  primeira gravação (uma escrita por save, não sete), e a carga cai pro backup se
  o principal estiver ilegível.

#### Fase 3 — fugir deixou de ser derrota
`mover()` terminava com `if(PLANTA[dest].saida) return escapou(I)`, e `escapou()`
terminava em `fim('fuga')`. **Andar pro quintal durante uma invasão acabava a
partida.**

**`s24-fuga.js`** (novo) transforma isso num estado com fases legíveis:

```
INVADINDO → VASCULHANDO → SAINDO → SEGURO → RESET
```

- **Quintal e rua são áreas jogáveis**, cada uma com ações próprias: esperar e
  escutar, se enfiar mais fundo no esconderijo, trocar de área, espiar a casa por
  uma fresta, entrar.
- **A regra que faz isso ser jogo:** se ela sai **pelos fundos**, o quintal fica
  perigoso; se sai **pela frente**, a rua. Você ouve pra onde ela está indo e
  escolhe onde esperar.
- **A casa é desenhada de fora**, e a janela do cômodo em que ela está acende com
  a silhueta atravessando. É o "observar a silhueta se movendo" pela via que este
  projeto tem — não há mundo 3D aqui.
- **Nunca machuca sem avisar:** o primeiro erro é susto ("ela cheira o ar, você
  não respira, ela segue"). Só o segundo cobra, e mesmo assim fere e empurra pro
  outro lado — não mata.
- **Consequências em vez de derrota:** ela leva comida, diesel, remédio ou item
  da mochila; arrebenta muro, calha, tábua ou armadilha; acha quem ficou
  escondido. Ficar muito tempo fora custa sanidade, e a volta custa comida.
- **`FUGA_CFG`** concentra todo tempo, chance e custo, cada um comentado. Nenhum
  número solto no meio da lógica.

#### Fase 4 — testes
| suíte | verificações |
|---|---|
| `expteste` — expedição transacional | 19, 0 falhas |
| `fugateste` — ciclo da invasão e fuga | 30, 0 falhas (estável em 3 voltas) |
| `baktest` — backup do save | 6, 0 falhas |
| `varre` — varredura ampla | 0 estouros, 0 invariantes violados |
| regressão: `v50`, `v49`, `qual`, `equipteste`, `menuteste`, `corte`, `gerteste`, `am` | 0 falhas |

---

### Migração de save

Os campos novos (`exped`, `erros`, `fuga`) **não existem** num save antigo, e a
ausência já é o estado correto: ninguém estava no meio de uma expedição nem do
lado de fora de casa. Nada a converter, nada quebra.

---

### Mudanças que quebram compatibilidade de API

Se você tinha código ou teste chamando estes nomes, precisa atualizar:

| antes | agora |
|---|---|
| `capacidade(idDoBau)` | `capacidadeBau(idDoBau)` |
| `ficha()` (ficha de personagem) | `fichaJogador()` |

`capacidade(parceiro)` e `ficha(nome, tag, texto)` voltaram ao significado
original.

---

### O que ficou aberto

- **`cena.modo` é sobrecarregado.** `'vazio'` significa ao mesmo tempo "estou num
  cômodo" e "estou numa cena de corte". 28 pontos de escrita. Já causou três bugs
  distintos. Separar em `modo` + `jogavel` mexe em 28 lugares e o risco é maior
  que o ganho nesta rodada.
- **`sustoAntigo()` é código morto** (`index.html:10172`, começa com
  `if(true)return false`).
- **Não medido:** FPS e memória em sessão longa, outros navegadores, e se alguma
  colisão existe dentro de objetos (`X.metodo = ...`) — a trava só pega
  declarações de topo.
