# Auditoria visual — o que o jogo desenha hoje

*Fase 1 do ULTRA PROMPT de reformulação visual. Medição e fotografia antes de
uma linha de código novo. Três rodadas seguidas desta sessão descobriram que a
coisa pedida já existia; aqui eu fotografei antes de opinar.*

---

## 1 · O que o briefing supõe, e o que a tela mostra

O documento diz: *"Área A: mesmo fundo. Área B: mesmo fundo com outra cor. Área
C: mesma estrutura. Isso é proibido."*

**Não é o que está acontecendo.** Cada cômodo tem um `CENAS[id]` próprio:

| cômodo | o que é desenhado |
|---|---|
| sótão | telhado em duas águas, quatro caibros, janelinha com vidro que muda de cor conforme a hora |
| despensa | três prateleiras com latas individuais |
| quintal | muro de blocos em fiadas, portão de barras verticais, chão de terra |
| sala | sofá, lampião com halo pulsante, piso em tábuas com fuga em perspectiva |

E o visitante da porta **não é um sprite**. `pintarVisitante` monta um rosto na
hora, semeado pelo nome da pessoa: pele, cabelo em quatro tipos, capuz, gola,
barba, sangue, sujeira, sobrancelhas, nariz, boca que abre ao falar, olhos que
piscam, brilho na pupila — e **12 anomalias** que deformam partes específicas.

## 2 · O que está mesmo faltando

Não é ausência de arte. É **volume e profundidade**:

- **Objeto é retângulo chapado.** O sofá é um `fillRect` translúcido: sem pé, sem
  almofada, sem sombra própria. As latas são quadrados coloridos.
- **Nada projeta sombra no chão.** Só o visitante tem sombra, e é uma elipse.
- **Não há camada de frente.** Tudo está no mesmo plano atrás do texto.
- **O rosto não tem luz batendo de lado.** Há um gradiente vertical e uma elipse
  escura de um lado — não há modelagem de maçã do rosto, pálpebra ou queixo.
- **O cabelo é uma elipse.** Um tipo dela tem duas mechas retangulares.
- **As paletas são estreitas:** 6 peles, 6 cabelos e 6 roupas. E **cinco dos seis
  cabelos são praticamente da mesma escuridão** (`#1A1418`, `#2B2019`, `#3E2C1E`,
  `#141014`, `#4A3A2A`), então na prática o cabelo é "escuro" quase sempre.

## 3 · O achado: treze sorteios enviesados

A causa medível de "tudo parece repetido" não é de arte. O jogo escolhe "pegue
alguns desta lista" com `.sort(()=>_ale()-.5)`, que **não é um embaralhamento**:
o comparador não é consistente e a ordem sai enviesada para o começo da lista.

Medido, 4000 sorteios de 2 anomalias entre 12:

| | antes | depois |
|---|---:|---:|
| `olhos` (1ª da lista) | 1183 | 697 |
| `maos` (10ª da lista) | 426 | 636 |
| **mais vista ÷ menos vista** | **2,78×** | **1,10×** |
| desvio máximo do esperado | +77% | 4,6% |

Nos seis visitantes fotografados antes do conserto, **os três mímicos tinham o
mesmo defeito nos olhos**. Depois, saíram olhos, dentes, roupa, pele e brilho —
e apareceu capuz.

E não era só a porta. Estava em **treze lugares**: os defeitos de respiração da
escuta na porta, as perguntas disponíveis, os locais do dia, os itens de um
esconderijo, as trocas oferecidas, os métodos de investigar anomalia, as âncoras
de sanidade, o pool de pessoas.

## 4 · O que o conserto revelou no teste

Corrigir o viés fez `expteste` falhar 1 vez em 8 — e o build antigo passava 12 de
12. Investigado até a causa em vez de declarado instável:

O caminhador do teste clica `bs[0]` quando não reconhece nenhuma opção. E
`bs[0]` pode ser **"▼neste cômodo"**, que é o cabeçalho de uma gaveta da
interface: abre e fecha sem agir. A trilha de uma falha mostra seis cliques
seguidos nele, queimando os 60 passos.

**O jogo não quebrou.** O teste passava por sorte: a ordem enviesada colocava uma
ação de verdade em primeiro lugar. Corrigido o embaralhamento, a sorte acabou. O
caminhador passou a ignorar cabeçalhos — 8 de 8 depois disso.

Descartei antes duas hipóteses, medindo:
- *ids de item inválidos escondidos pelo viés* — zero inválidos em 13 locais;
- *o local de índice 0 mudou* — o teste usa `poolDeLocais()[0]`, que não mudou.

## 5 · O plano visual, em etapas

Cada etapa fecha com fotos de antes e depois.

| etapa | o que entra |
|---|---|
| **1** | os treze embaralhamentos (feito) e as paletas de aparência mais largas |
| **2** | rosto: luz de lado, pálpebra, modelagem, cabelo com forma (feito) |
| **3** | cômodos: sombra projetada, desgaste, camada de primeiro plano |
| **4** | texturas: madeira com veio, concreto com poro, metal com risco |
| **5** | criaturas: silhueta própria por criatura |

---

## 6 · Etapa 2 — o rosto (feito)

### O que era

Cabeça: uma elipse chapada com uma faixa de sombra vertical. Olho: círculo
branco com ponto preto, sem pálpebra nem órbita. Nariz: três traços formando a
letra **L**. Boca: uma barra escura. Cabelo: meia elipse pousada como tigela.
Sujeira: dez quadradinhos.

### O que é agora

- **Luz com direção**, quente, de cima e da esquerda — de onde vem o lampião.
  Medido no desenho: lado claro **64**, lado escuro **37**.
- **Olho**: órbita afundada, sombra da pálpebra superior caindo dentro do olho,
  íris com anel, pálpebra inferior e canto interno escuro.
- **Nariz**: dorso com luz de um lado e sombra do outro, narina, e a sombra que
  ele projeta na bochecha.
- **Boca**: lábio superior mais escuro, inferior com volume e brilho.
- **Cabelo**: massa com franja, cinco mechas, raiz escura e brilho no topo —
  tudo recortado dentro da própria massa.
- **Maçã do rosto e queixo** com modelagem; sujeira em manchas irregulares.
- **Pescoço** ganhou cor de pele. Era da cor da camisa.

### Dois erros meus, corrigidos antes da entrega

1. **O cabelo virou uma tábua retangular** pousada na cabeça: eu desenhei a linha
   do cabelo como um polígono solto em vez de recortá-lo na massa.
2. **Uma faixa horizontal dura** atravessava o rosto na altura dos olhos — o
   `fillRect` do gradiente da órbita terminava em `cyy` e o corte virava borda.

### O que foi provado, não achado

`tools/testes/rostoteste.mjs` — 17 asserções. O retrato desenha **nove** dos 12
defeitos (`maos`, `roupa` e `pes` são de outro sistema), e os nove continuam
legíveis:

| defeito | muda o retrato | onde |
|---|---:|---|
| pescoço | 40,6% | embaixo |
| pele | 22,2% | rosto inteiro |
| sombra | 7,7% | atrás |
| olhos | 5,6% | metade de cima |
| simetria | 3,9% | rosto inteiro |
| boca | 0,9% | metade de baixo |
| dentes | 0,7% | metade de baixo |
| brilho | 1,2% **da faixa dos olhos** | as pupilas |
| piscar | — | **no tempo** |

`piscar` significa "nunca pisca": num quadro parado ele é idêntico ao rosto
normal, e isso é o certo. Medido ao longo de 600 quadros: o rosto normal fecha o
olho **47 vezes**, o defeituoso **zero**.

Custo: **0,07 ms** por rosto, contra um orçamento de 16 ms por quadro.

### Uma restrição que o briefing não menciona

A lente do olho mágico procura cada defeito numa **posição fixa de tela**
(`olhos` .38, `boca` .55, `pescoco` .70). Mover uma feição quebraria a caçada —
que é gameplay, não enfeite. As âncoras `cyy`, `oyB`, `by` e `sep` são as mesmas
de antes; o que mudou foi a pintura em cima delas.

---

## 7 · Etapa 3 — os nove cômodos (feito)

### O que era

`paredeBase` desenhava um degradê vertical, quarenta riscos de reboco, o piso em
tábuas e o rodapé. **As mesmas sementes fixas em todos os nove cômodos**, então
as nove paredes saíam com a mesma marca no mesmo lugar — só mudava a paleta. Os
móveis eram `fillRect` chapado: sem aresta iluminada, sem lado na sombra e sem
sombra no chão. Um `fillRect` sem sombra de contato **flutua**, e era o caso dos
nove cômodos.

### O que é agora

**A parede tem idade, e a idade é dela.** Manchas de umidade que descem do teto,
placas de reboco descascado, trincas finas e a sujeira que sobe do rodapé. Todas
as sementes deslocadas por `d = cômodo*17+3`, então continua determinístico — a
mesma parede tem sempre a mesma marca — mas cada cômodo tem a sua.

**Os móveis pousam.** Duas ferramentas novas: `pousar(x,y,larg,força)` (a sombra
de contato) e `bloco(x,y,larg,alt,cor,op)` (retângulo com luz em cima, lado na
sombra, aresta de espessura e a sombra que ele joga no chão). Aplicadas ao sofá
e à estante da sala, às prateleiras da despensa, à bancada e ao painel da
oficina e ao gerador do porão.

**Tem uma camada na frente.** `frente(w,h,tipo)` — viga, batente, fio, cortina ou
mato — entre o jogador e o cômodo, chamada nas nove cenas. É o que separa "uma
imagem atrás do jogador" de "um lugar em que o jogador está".

### Dois erros meus, achados de jeitos diferentes

**O chão virou tapete cinza — e nenhuma asserção reclamou.** A vinheta do piso
ia de `rgba(255,236,200,.05)` até `rgba(0,0,0,.40)` num degradê só. No canvas a
cor e a opacidade interpolam juntas, então o meio do caminho é **cinza a 22%**:
em vez de escurecer a beirada, pintou bruma no chão inteiro. Medido: brilho médio
do piso **14,88 → 25,61 (+72%)**, e nos cômodos 2, 5 e 6 o chão ficou **mais
claro que a parede**. As seis seções do harness passavam. O defeito apareceu ao
olhar a grade dos nove cômodos lado a lado, não no teste. Corrigido em duas
passadas — o brilho quente sai da própria cor quente, o escurecimento sai de
preto transparente. Piso de volta a **14,44**, e agora com vinheta de verdade
(miolo 19,67 contra beirada 8,64, onde o original era quase plano: 16,00 e 13,64).

**O reboco descascado parecia bolha de sabão.** Elipse perfeita com brilho
chapado. Reboco cai em placa de borda rasgada: o contorno virou polígono
irregular semeado e a placa exposta ganhou degradê. Custo do quadro subiu de
0,069 para 0,094 ms — irrelevante contra os 16 ms.

### Três erros no meu próprio teste

1. **Comparei "sob o móvel" com "ao lado do móvel".** Isso mede a vinheta do
   piso, não a sombra: o piso é claro no meio de propósito e o móvel fica no
   meio, então o "sob" ganha sempre. Foi por isso que as duas asserções deram o
   contrário do esperado. O certo é desligar o `pousar` e comparar **os mesmos
   pixels**.
2. **Uma asserção passava com o conjunto vazio.** Com a sombra desligada os
   contadores de faixa ficavam no valor inicial e `alto > .55` passava com ZERO
   pixels. Só apareceu porque plantei a regressão para conferir o teste.
3. **Dois contadores mediam o brilho da cena, não o efeito.** "Escureceu 4,95
   pontos" caiu para 3,58 quando consertei o chão — em piso escuro a mesma
   sombra subtrai menos em valor absoluto. Trocado pela **fração** da luz comida.
   O mesmo com o desgaste: o contador por limiar `>16` perdeu as manchas quando
   o chão escureceu. Trocado por fatia alterada e pico.

### O que foi provado, não achado

`tools/testes/cenateste.mjs`, 17 asserções, e cada trava conferida plantando a
regressão que ela existe para pegar:

| medida | número |
|---|---|
| pares de cômodos comparados | 36, diferença média 59,2%, o mais parecido 32,1% |
| mesma parede duas vezes | 0% de diferença |
| desgaste entre cômodos de mesma paleta | muda 4,3–5,4% da parede, pico 30–43 |
| sombra de contato (oficina / porão / sala) | come 17,3% / 38,2% / 30,1% da luz |
| a sombra clareou algum ponto? | nenhum, nos três cômodos |
| chão mais claro que a parede | nenhum cômodo |
| vinheta do chão | miolo 19,67 · beirada 8,64 |
| camada da frente escurece a borda | 9 de 9 cômodos |
| custo por cômodo | média 0,094 ms · pior 0,135 ms (quadro de 16 ms) |

Regressões plantadas e pegas: desgaste sem deslocamento por cômodo (fatia cai de
4,3–5,4% para 0,3–0,8%), `pousar` desligado (3 asserções caem), e a bruma cinza
de volta (as 3 asserções do chão caem).

Regressão do resto do jogo: **28 harnesses, todos verdes**. `expteste` falhou uma
vez em nove sob carga (3 Chromium mais 2 servidores extras) e não reproduziu em 8
rodadas seguintes, 2 delas na mesma condição paralela — as 4 asserções que caíram
eram todas depois da mesma tela abrir. Está anotado como instabilidade de tempo,
não como conserto.

---

## 8 · Etapa 4 — as texturas (feito)

### O que era

Medido antes de escrever uma linha, com a razão de anisotropia (a variação de
brilho pro vizinho de lado dividida pela variação pro vizinho de baixo):

| superfície | razão | grão |
|---|---|---|
| bancada (madeira) | 1,32 | 1,048 |
| tábuas do chão | 1,07 | 1,055 |
| porta (madeira) | 1,04 | 1,031 |
| gerador (metal) | 1,30 | 1,297 |
| parede do porão | 1,02 | 1,260 |
| muro do quintal | 1,16 | 0,769 |

**Nenhuma superfície tinha direção.** Madeira, metal e concreto davam a mesma
razão: a bancada era tão lisa quanto a parede do porão. Degradê não é textura.

### O que é agora

Três tecidos: `texVeio` (veio de madeira, com nó, deitado ou em pé), `texPoro`
(poro de concreto — cova com borda de luz em cima) e `texRisco` (metal escovado).
Cada um é desenhado **uma vez** num canvas fora da tela e repetido como padrão,
então por quadro sobra um `fillRect`. O cache mora fora do save — nó de DOM não
entra em estado serializável. As ondas do veio usam seno de período inteiro, então
o ladrilho encosta nele mesmo sem emenda.

`material(x,y,w,h,tipo,força)` aplica um tecido, e `bloco()` ganhou `op.material`
— o tecido entra **antes** da luz, senão a textura apaga o volume.

O chão é o caso à parte: o piso foge em perspectiva e padrão repetido não
converge junto, viraria tapete estampado. O veio das tábuas é desenhado na mesma
geometria das juntas, por `veioDoPiso()`.

| superfície | grão sem tecido → com tecido | razão |
|---|---|---|
| bancada (madeira) | 1,048 → **1,591** | 1,32 → 1,40 |
| muro (madeira) | 1,049 → **1,699** | 1,41 → 1,95 |
| gerador (metal) | 1,049 → **1,703** | 1,28 → 1,54 |
| parede do porão (poro) | 1,260 → **1,488** | 1,02 → 1,03 |
| parede da sala (poro) | 1,202 → **1,424** | 1,03 → 1,04 |
| porta (veios) | 0,984 → **1,204** | 1,05 → 1,37 |

O poro continua sem direção de propósito: poro é isotrópico, o que tem de subir
nele é o grão. O chão: vão entre linhas de 11px para **4,1px** no fundo e de 28px
para **15,3px** na frente, ou seja o veio existe e acompanha a fuga.

### Uma coisa que já existia, e eu quase reescrevi

A porta **já tinha veio** — 46 riscos, desde sempre, pelo `veios()`. A minha
medição não achou porque eu amostrei onde os **painéis rebaixados** são
desenhados por cima, cobrindo o veio justamente no miolo da folha. Não troquei o
sistema: estendi o mesmo `veios()` para dentro dos painéis. É a terceira vez
nesta reformulação que a coisa pedida já existia.

### Dois erros meus

**O metal era papel milimetrado.** 130 riscos indo de ponta a ponta, metade
deitados e metade em pé, formando grade. Na tela do jogo passava batido; só
apareceu quando renderizei o tecido sozinho e ampliei 3×. Metal escovado é fio
fino e comprido numa direção só, mais meia dúzia de arranhões soltos com sombra
de um lado, mais ponto de ferrugem.

**Duas hipóteses erradas sobre o `semente`, e medi-las foi mais barato que
reescrever.** Achei que a trama vinha de correlação entre `semente(281,i)` e
`semente(283,i)` — medido, −0,06, não é. Depois achei que era o quase-período de
4,37 amostras do `sin` — autocorrelação medida em nove defasagens, tudo abaixo de
0,04, não é. O `semente` do jogo é limpo; o defeito era meu.

### Três erros no meu próprio teste

1. **Limite fixo que não separa não é teste.** Exigi razão > 1,3 pra provar veio;
   plantei a regressão e a asserção passou do mesmo jeito, porque o retângulo sem
   textura já dá 1,32–1,41. Trocado pelo grão medido ligado contra desligado.
2. **Sem interruptor, o teste mede outra coisa.** O veio do chão era código solto
   dentro do `paredeBase`. Apaguei o veio inteiro e o teste passou — estava
   contando as **juntas** das tábuas, que sempre convergiram. Virou
   `veioDoPiso()` só pra ter como desligar.
3. **A régua certa no alvo errado.** A faixa que eu media do gerador pegava o
   painel afundado e o mostrador, lisos de propósito, e diluía o metal: 1,32 em
   vez de 1,54.

### O que foi provado

`tools/testes/texteste.mjs`, 18 asserções. Regressões plantadas e pegas:
`material()` desligado (5 asserções caem) e `veioDoPiso()` apagado (1 cai, e o
log mostra 85 → 32 linhas). Custo por cômodo: média **0,174 ms**, pior 0,252 ms,
contra um quadro de 16 ms. Regressão geral: 14 harnesses verdes, incluindo o
`cenateste` da etapa 3 — o chão subiu de 14,44 para 14,66 de brilho com a
textura, e a parede está em 30,12, então a trava "o chão nunca fica mais claro
que a parede" continua de pé.

---

## 9 · Etapa 5 — as criaturas (feito)

### A auditoria achou o contrário do que a etapa pedia

O briefing pede "silhueta própria por criatura". A medição encontrou:

- **16 criaturas, 16 silhuetas** — uma para cada, animadas, com pele por família
  (`falsa` tem brilho oleoso e emenda, `aberta` tem greta e nervura, `surda` tem
  a sua). São ~400 linhas em três camadas: `desSilhueta` mais dois envelopes.
- **E `desSilhueta` não era chamada em lugar nenhum.** Zero call sites no arquivo
  inteiro. O jogador nunca viu nenhuma delas.

Então o trabalho não era desenhar silhueta. Era **ligar** a que já estava
desenhada, no lugar certo. É a quarta vez nesta reformulação que a coisa pedida
já existia.

### Onde é o lugar certo, e por que não é a porta

Na porta o jogador vê só a sombra dos pés na fresta, e isso é deliberado: a
tabela `FORMA` tem **seis formas para dezesseis criaturas**, e o comentário dela
diz o porquê — *"compartilhar é de propósito: a forma estreita o palpite, não
entrega a resposta"*. Pôr a silhueta inteira na porta mataria a dedução, que é o
miolo do jogo.

O lugar é **o caderno**. Lá o jogador só vê o que já encontrou, então a silhueta
vira recompensa por ter deduzido em vez de atalho para deduzir.

### Um bug de verdade, achado na mesma auditoria

`coro2` — "o Coro" — não tinha entrada em `FORMA_DE`. A descrição dele é *"cinco,
seis silhuetas em fila, sem se mexer, olhando pra porta"* e a sombra que ele fazia
embaixo da porta era o fallback: **dois pés de gente**. Agora é `varios`, quatro
manchas fora de compasso.

### Quatro erros meus, e como cada um apareceu

1. **`source-atop` precisa de fundo transparente.** A camada de pele recorta na
   própria silhueta. Medi num rascunho pintado de branco e a pele lambeu o fundo
   inteiro: quatro pares de silhuetas saíram byte a byte idênticos. A foto
   mostrou que eram claramente diferentes. **O número estava errado e a imagem
   estava certa.**
2. **O envelope do caderno estava quebrado na segunda abertura.** `limpar()` não
   apaga o texto — a base o reescreveu para esmaecer o passado e deixar rolar,
   marcando com a classe `passado`. Meu código casava a lista de vistos contra
   fichas velhas: com 1 criatura vista, 4 fichas e 4 desenhos, e os novos ficavam
   sem nada. A regressão plantada confirma: sem o filtro, a ficha nova recebe
   **zero** desenhos.
3. **Inventei marcação em vez de usar a da casa.** Criei um `.silcard` e o enfiei
   dentro do `.gente`, que é um flex de três filhos — o quarto espremeu a
   descrição para uma palavra por linha. O `fichaRosto` já resolvia isso desde
   sempre: `com-rosto` + `.gente-txt` + canvas ao lado.
4. **Preto sobre preto.** A silhueta era desenhada em `#0B0910`, a cor certa
   contra a luz da fresta e invisível no fundo do caderno. A asserção "o desenho
   tem tinta" passava, porque tinta havia. A captura mostrou o retângulo vazio.
   Agora é giz claro numa página escura.

### O que foi provado

`tools/testes/silteste.mjs`, 15 asserções.

| medida | número |
|---|---|
| criaturas / silhuetas distintas | 16 / 16 |
| silhuetas que não desenham | 1 — `nenhuma`, que promete ser vazia |
| par mais parecido, em % do corpo | `fome` × `inchada`, 10% |
| forma do Coro | `varios`, 4 manchas (era 2 pelo fallback) |
| fichas vistas que ganharam desenho | 3 de 3, com a legenda certa em cada |
| a cena do jogo depois de 8 desenhos | 0 pixels diferentes |
| custo das 16 silhuetas do caderno | 12,5 ms, uma vez, ao abrir |

Regressões plantadas e pegas: sem o filtro `:not(.passado)` (a ficha nova fica com
zero desenhos) e sem a forma do Coro (2 asserções caem). Regressão geral: 12
harnesses verdes.
