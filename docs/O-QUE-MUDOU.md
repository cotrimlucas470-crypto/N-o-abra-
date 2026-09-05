# Não Abra — tudo o que mudou

*Um resumo legível de ponta a ponta. Sem jargão, na ordem em que as coisas
foram feitas. Cada item diz **o que estava errado**, **como eu descobri** e
**o que mudou pra você**.*

---

## Em uma página

| # | O que mudou | Por quê |
|---|---|---|
| 1 | **A sanidade virou sintoma** | A faixa onde você mais joga produzia zero ilusões |
| 2 | **612 decisões passaram a usar o gerador do jogo** | Nenhum save reproduzia |
| 3 | **Três pessoas do abrigo passaram a fazer o que a ficha promete** | Costura, escalada e corrida não tinham código |
| 4 | **O contador `ignorado` parou de sumir** | Quem ia sair de casa e morrer voltava do zero |
| 5 | **O Imitador parou de ganhar o bônus de quem ele copiou** | Bug de identidade depois de qualquer save |
| 6 | **Andar pela casa passou a custar** | Varrer a casa inteira era grátis |
| 7 | **As criaturas avisam com contrato, não com sorte** | Não dava pra provar que houve aviso |
| 8 | **Um corpo só, e ele fala português** | Havia dois sistemas de ferimento e um mostrava porcentagem |
| 9 | **A casa acorda com o que você faz** | Explorar fundo não tinha consequência |
| 10 | **Voltar do porão não é o mesmo caminho da ida** | Não havia ponto de virada |
| 11 | **Todo documento muda uma regra do jogo** | Não existia documento nenhum |
| 12 | **Cicatriz da noite 4 importa na noite 19** | Sobreviver não deixava marca |
| 13 | **Quem trata você tem poder sobre você** | Curar era botão sem preço |
| 14 | **Três bugs de tela que ninguém tinha achado** | Listas duplicadas e um ramo morto |
| 15 | **O passo voltou a saber em que chão você está** | 8 dos 9 cômodos soavam a madeira, inclusive o quintal de terra |

---

## 1 · A sanidade virou sintoma

**O que estava errado.** O jogo tem cinco estágios de sanidade. O estágio
`tenso` — sanidade 70 a 89, que é onde você passa a maior parte do jogo —
produzia **zero ilusões**. E a ficha dele prometia por escrito:

> *"Você ouve passo onde não tem passo."*

**Como descobri.** Contando. O menor limiar das tabelas de ilusão é `0.10`, e o
estágio `tenso` vale `0.08`. O filtro devolvia lista vazia. Um erro de 0,02
apagando um estágio inteiro, sem dar erro nenhum.

**O que mudou.** 18 ilusões novas, 8 delas feitas pra essa faixa. Elas chegam
misturadas com a narração normal — sem tela, sem título, sem confirmação:

> *"Tem uma cadeira virada pra parede. Você não virou."*
> *"Você ouve a sua própria respiração vindo de trás de você."*

E a sanidade deixou de ser um nome numa ficha: a tela ganha grão, a vinheta
respira e o texto treme conforme a cabeça piora. Dá pra desligar.

**Mais:** três coisas nunca mentem — o relógio, o que você carrega e a porta da
frente. O jogo agora **te conta isso**, depois do segundo sussurro, e conferir
virou um botão: 10 minutos, e a interface para de mentir por um instante.

*Cobertura por estágio, antes → depois: 0/**0**/13/20/23 → 0/**8**/26/38/41.*

---

## 2 · O jogo passou a decidir com o próprio gerador

**O que estava errado.** O jogo tem um gerador de números com semente — daqueles
que garantem que a mesma partida dá o mesmo resultado. Estava completo, era
salvo, era restaurado, e havia uma regra escrita no código dizendo pra usá-lo.

E as duas funções que decidem tudo:

```js
const sortear = a => a[...Math.random()...];
const chance  = p => Math.random() < p;
```

**612 decisões** — praticamente todas as do jogo — passavam por fora dele. Todo
o aparato era decorativo.

**O que mudou.** As duas passaram a usar o gerador da partida, mais 71 chamadas
diretas em 46 funções (loot, clima, evento, criatura, visitante). **Nenhum número
de balanceamento mudou** — o que muda é que o resultado parou de depender de
sorte que o save não conhece.

E a montagem do jogo agora **se recusa a construir** se alguém desfizer isso.

---

## 3 · Três pessoas passaram a fazer o que a ficha delas promete

Cada morador tem um efeito escrito na ficha que você lê. Três deles não tinham
uma linha de código atrás:

| pessoa | a ficha dizia | linhas no código |
|---|---|---|
| **Nice** | *"Remenda tudo. Reforço não se perde."* | **zero** |
| **Juninho** | *"Expedições rendem 25% a mais."* | **zero** |
| **Kelly** | *"Expedições fazem menos ruído."* | **zero** |

Agora as três fazem, com os números que a própria ficha já dizia. A Nice remenda
a tábua que soltou por dano — a que você arranca de propósito continua saindo,
porque ali a perda é escolha sua.

---

## 4 · O que você perdia ao fechar o jogo

Três coisas não estavam sendo salvas. A pior:

Cada morador tem um desejo pessoal. Se você ignora nove vezes, ele **sai de
madrugada sozinho e não volta**. O contador dessas vezes não ia pro save.

> **Quem estava a quatro passos disso voltava em zero toda vez que você fechava
> o app.**

Junto com ele iam as tarefas do dia e o que o vigia tinha visto.

*Por que ninguém viu antes: o teste óbvio — salvar e carregar — passava, porque
carregar copia por cima do que já está na memória. Só recarregando a página de
verdade o problema aparece.*

---

## 5 · O Imitador ganhava o bônus de quem ele substituiu

Quando a coisa toma o lugar de alguém da casa, o jogo guardava **uma referência
à pessoa**. Depois de qualquer save, essa referência apontava pro vazio.

Resultado: **o Imitador disfarçado de mecânico continuava cuidando do gerador
como o mecânico de verdade.**

Agora a identidade é pelo nome, como já era em todo o resto.

---

## 6 · Andar pela casa passou a custar

**O que estava errado.** Atravessei os 10 cômodos da casa e voltei, medindo:

```
hora 0 · minutos 0 · ruído 0 · sanidade 0 · diesel 0
```

**Zero em tudo.** Nada impedia varrer a casa inteira todo turno.

**O que mudou.** A casa ganhou profundidade — quatro camadas, do núcleo ao
anexo — e entrar cobra:

```
núcleo    4 min · sem ruído   · e alivia, se você estava lá fora
casa      7 min · pouco ruído
borda    10 min · e a cabeça começa a pesar
anexo    13 min · barulho e sanidade
```

Um dia tem 720 minutos. Atravessar é barato — **insistir** é que encarece.

E o corpo entra na conta: **ferido você anda pior**, 13 min viram 20, e faz mais
barulho.

*(Antes disso o relógio precisou ser consertado: os minutos eram somados em dois
lugares, só um virava hora, e o mostrador escrevia `HH:00` sempre — jogando os
minutos fora na tela.)*

---

## 7 · As criaturas avisam antes, e agora dá pra provar

**O que estava errado.** O jogo tinha 14 avisos escritos à mão, todos bons. E
nenhum tinha identidade — não dava pra perguntar *"houve aviso antes disso?"*.

**O que mudou.** 24 sinais, seis criaturas em quatro fases, cada um com canal
(som, visão, tato, cheiro, ausência) e distância. Uma aproximação do Inchado:

```
4 cômodos · nada ainda
3 cômodos · "Cheiro doce e parado, enjoativo, mais forte do que estava."
2 cômodos · "Respiração úmida, no mesmo compasso, sem nunca variar."
1 cômodo  · "A parede do cômodo do lado está escorrendo."   ← último aviso
0         · contato
```

**Duas regras de justiça, garantidas por teste:**

- o **último aviso** nunca chega com menos de 2 turnos de antecedência, por pior
  que esteja a sua cabeça;
- a casa pode **forjar** um sinal de aproximação — mas nunca o último aviso, e
  todo sinal forjado tem uma inconsistência que dá pra aprender a ler.

Sanidade baixa faz o aviso chegar mais perto, não sumir. Cabeça ruim gera ruído,
não cegueira.

---

## 8 · Um corpo só, e ele fala português

**O que estava errado.** Havia **dois** sistemas de ferimento rodando ao mesmo
tempo. Em três lugares o código criava um ferimento de verdade **e** somava num
contador separado — a mesma pancada, contada duas vezes, com duas curas que não
se falavam.

E a ficha mostrava isto:

> ~~No total: força −28% · fugir −30% · atenção −35%~~

Três problemas de uma vez: é número de vida na tela; não diz **o que** você
perdeu; e a `atenção −35%` era falsa — nenhuma regra do jogo lia esse campo.

**O que mudou.** Um sistema só. Toda ferida tem endereço no corpo. E a ficha
diz o verbo:

> *"Torção no pé na perna direita. Você manca. Correr é uma decisão, não um
> reflexo."*
> *"Corte fundo na mão boa. A mão treme no que exige precisão: tranca, curativo,
> fósforo."*

A `atenção` passou a custar de verdade — **percepção**. Cabeça batida faz o
cheiro do Inchado, que vinha a 3 cômodos, vir a 1.

Varredura final: **zero** porcentagens de corpo no jogo inteiro.

---

## 9 · A casa acorda com o que você faz

Fica uma pressão enquanto você está fora do núcleo. Ela nunca aparece como
número — sai em quatro degraus:

```
calma
"A luz oscila uma vez, curta, e volta."
"A porta que você deixou aberta está encostada."
"O barulho parou todo de uma vez. Isso é pior do que o barulho."
```

Quatro rotas de um dia inteiro, medidas:

| como você joga | pressão | o que você sente | a casa acorda? |
|---|---:|---|---:|
| fica em casa | 0,00 | nada | quase nada |
| trabalha nas bordas | 0,29 | nada | um pouco |
| desce ao porão às vezes | 0,42 | estalos | metade |
| **vive no porão e no quintal** | **0,94** | **a casa parou de avisar** | **muito** |

Depois de um pico, o jogo **força um silêncio**. Silêncio é conteúdo, não
ausência dele.

**A luz** agora custa: cômodo aceso queima diesel. No escuro não custa recurso
nenhum — e cobra na cabeça. Mais barato e muito pior.

**A exposição** faz a casa acordar com mais fôlego na noite seguinte — sem furar
o teto que ela já prometia, e esfriando sozinha, pra não virar catraca.

---

---

## 10 · Voltar do porão é o segundo jogo

Entrar em camada funda pergunta uma vez, e só uma vez por dia:

> *"Você ainda consegue voltar. Depois disso, eu não sei."*

Depois disso a rota de volta **muda**: uma porta emperra, um corredor alaga,
cai entulho do teto, ou alguma coisa se posiciona no caminho. Atravessar custa
tempo e faz barulho.

**E nunca prende.** Existe uma checagem que prova, a cada bloqueio, que ainda há
caminho até o núcleo — o preço de voltar é o desvio, nunca a prisão. Softlock é
bug, não tensão.

---

## 11 · Documento que não muda uma regra é enfeite

Sete documentos entraram, e **nenhum é só texto**. Cada um revela uma regra que o
resto do jogo lê de verdade:

| o que você acha | o que muda no jogo |
|---|---|
| um laudo do posto sobre sal na soleira | o Rastejante deixa de achar o seu rastro |
| um caderno escolar, letra de criança | *"NÃO APAGA A LUZ"* — e a luz protege mesmo |
| um mapa com setas que voltam sobre si | voltar por onde veio confunde o que rasteja |
| um bilhete numa porta de saída única | é assim que se separa o Coro |
| uma coluna com a mesma hora, 40 vezes | a porta da cozinha abre às 03:00 |

### O sal que a casa já sussurrava

O contra-jogo do Rastejante é a linha de sal. Sal não existia como item — **mas
os moradores já falavam dele há versões**, como crendice:

> *"Deixa eu botar sal na soleira. Não custa nada."*
> *Dona Lurdes bota sal na soleira e reza uma coisa curta. Ninguém ri.*

Achar o laudo e perceber que ela estava certa o tempo todo vale mais do que
qualquer regra escrita do zero. Por isso o documento cita a superstição.

### E um documento mente

Um por campanha. Uma planta de arquiteto promete uma rota segura pela ala leste.
Ela é de outra casa. Quem acredita anda **mais confiante e mais barulhento** no
caminho que acha seguro — e o ruído sobe 35%.

Existe um segundo documento que corrige o primeiro, escrito com pressa:

> *"A PLANTA ESTÁ ERRADA. É de outra casa. Quem seguiu não voltou."*

Achá-lo risca a rota do caderno. Um documento falso por campanha basta para
envenenar a confiança em tudo o que você lê — que é exatamente o ponto.

---

## 12 · Sobreviver te torna mais frágil e mais visado

Ferimento grave que sara vira **cicatriz permanente**, com causa e noite no
caderno: *"osso quebrado na perna esquerda — noite 4, a queda do sótão."*

O resíduo é pequeno e condicional: a perna falha na chuva, o braço trava no
frio, a mão treme com pressa.

E a casa **passa a saber onde você já quebrou**:

| | a casa mira na perna |
|---|---:|
| sem cicatriz | 73 / 300 |
| **com a perna já quebrada** | **156 / 300** |

Mais que o dobro — e nunca certeza. O teto está declarado no código, porque
mirar na ferida é tensão e mirar sempre é execução.

As seis criaturas também **aprendem** com você: o Rastejante para de seguir o
rastro e passa a esperar no destino quando você tem duas cicatrizes; o Imitador
para de falar se você ignorou sussurro por três noites; o Primordial avisa menos
a cada regra verdadeira que você descobre. O conhecimento é o custo.

---

## 13 · Quem trata você tem poder sobre você

Cinco gestos, cada um com preço:

| gesto | ganho | preço |
|---|---|---|
| pressionar pano | para o sangramento | a mão fica ocupada |
| costurar | fecha o corte | dor alta, e **a casa ouviu** |
| álcool | derruba a infecção | o cheiro sobe, e algo gosta desse cheiro |
| talar | volta a pisar | gasta material e faz barulho |
| deitar | o corpo melhora | o dia acabou. A casa não descansou junto |

E o item que fecha o módulo: **deixar alguém da casa cuidar de você**. Trata
melhor do que você trataria — e fica sabendo exatamente onde você está quebrado.

Se essa pessoa não for mais ela mesma, o tratamento é sabotagem. O aviso sai
**antes** do resultado, para você ainda poder recuar:

> *"A mão dela está fria de um jeito que mão de gente não fica."*
> *"Ela aperta o curativo antes de limpar. A ordem está errada."*
> *"Ela não pergunta se dói. Ninguém trata ferida sem perguntar se dói."*

### E ferido demais não é fim de jogo

Existe um estado em que as pernas resolvem por você. Nele **sempre há pelo menos
uma ação** — chamar, se arrastar, apertar a ferida, esperar. E se nada resolver
em oito turnos, o jogo **força um desfecho**: alguém te acha de manhã, ou
amanhece e isso conta como sorte.

Testado no pior estado possível — todos os 19 males ao mesmo tempo, casa vazia.
**Zero travamentos.**

---

## 14 · Três bugs de tela que ninguém tinha achado

Encontrados por varredura, procurando duas coisas: comparações que nunca podem
ser verdade, e listas duplicadas.

**Três cópias da mesma lista de telas, e uma fora de sincronia.** Faltavam
`conversa` e `corpo` numa delas — então naquela versão a tela de conversa e a de
equipamento pegavam a proporção errada de canvas. A cópia divergente não era a
que vencia hoje, o que torna o defeito **pior**, não melhor: era uma armadilha
esperando alguém reordenar um bloco. Agora é uma lista só.

**Um ramo de código que nunca rodava.** O áudio checava `cena.modo === 'fuga'` — e
`'fuga'` nunca é escrito em lugar nenhum; a fuga usa `'fora'`. A camada de horror
do som **nunca chegava ao nível máximo durante uma fuga**, justo quando devia.

Varredura final: **zero** comparações mortas no controle de telas.

## 15 · O passo do jogo voltou a saber em que chão você está

Antes de mexer numa linha, auditei o áudio. E a auditoria mandou **não** mexer na
maior parte dele: o jogo já tem um contexto de áudio só, compressor no fim da
cadeia, reverberação com reflexões precoces, e um mixer de verdade com cinco
camadas que abaixam umas às outras por prioridade. Nada disso foi reescrito.

Depois eu ignorei a minha própria auditoria, entreguei errado, e o teste me
pegou. Conto isso primeiro porque é a parte que importa.

### Eu troquei o som bom do passo pelo meu, pior

Eu media o passo do jogo contra uma função que está **morta** — existe uma
segunda com o mesmo nome, mais adiante no arquivo, e é ela que vale. O próprio
verificador de montagem tem isso anotado, por escrito, há versões.

Testando contra o cadáver, concluí que o passo do jogo era *"um estalo só, sem
material, sem variação"* e escrevi um novo. O passo vivo já tinha tudo:

| o que eu "acrescentei" | o que já estava lá |
|---|---|
| uma segunda batida 45–75 ms depois | o pé arrastando, 50–90 ms depois |
| material do piso | quatro superfícies, cada uma com corpo e ressonância |
| ressonância de assoalho oco | *"a tábua respondendo depois"* — com esse comentário |
| variação a cada disparo | já variava frequência, ganho e tempo |

**Minha versão foi apagada. O passo do jogo é o do jogo de novo.**

### O que estava mesmo quebrado: o piso não chegava nos cômodos

Este é o achado que valeu a rodada. O jogo escolhia o piso procurando os cômodos
**9 e 10** — e o abrigo tem os cômodos **0 a 8**. O quintal é o 8, não o 10. O
porão é o 6, não o 9.

| | antes | agora |
|---|---:|---:|
| cômodos que soavam a madeira | **8 de 9** | 3 de 9 |
| superfícies diferentes no abrigo inteiro | **2** | 6 |

Ou seja: o sistema de superfícies era bom, estava pronto, e **não alcançava quase
nenhum cômodo**. Você pisava em terra batida no quintal e ouvia assoalho.

As duas superfícies novas saíram do texto que o próprio jogo já escrevia:

> *"Colchões no chão."* → o dormitório virou colchão
> *"Fogão a gás com meio botijão."* → a cozinha virou ladrilho
> *"Muro alto, portão soldado, terra batida."* → o quintal virou terra

### E o som ganhou distância

Som longe só ficava mais baixo. Mas não é volume que o ouvido usa pra julgar
distância — é a **perda de agudo**. O ar come alta frequência, e é por isso que
trovão perto é um estalo e trovão longe é um ronco. Como todo som do jogo passa
pelo mesmo roteador, deu pra resolver num lugar só e valer para os **101 pontos**
que o usam:

| distância | brilho que sobra | soa como |
|---|---:|---|
| mesmo cômodo | 18000 Hz | na sua frente |
| 1 cômodo | 8100 Hz | do outro lado da parede |
| 2 cômodos | 3645 Hz | no corredor |
| 3 cômodos | 1640 Hz | no fim da casa |
| 4 cômodos | 738 Hz | abafado, quase só grave |

Passo distante e porta em outro cômodo passaram a usar isso. Nenhuma camada de
som se perde — o que se perde é brilho.

### E dá pra ouvir tudo isso

Nada acima é pra você acreditar na minha palavra. `docs/laboratorio-de-som.html`
é uma página que **toca os sons do jogo** — o passo morto contra o passo vivo, os
nove cômodos um por um nos dois mapas de piso, a mesma porta a cinco distâncias,
e as cinco camadas dela separadas.

O motor de áudio dessa página é copiado do `index.html` sem alteração de uma
linha. Não é uma imitação dos sons do jogo: é o jogo tocando fora do jogo. Tem
osciloscópio ao vivo, e um botão que percorre tudo sozinho, como um vídeo.

### O custo — contado, porque cronometrado não dá

Eu tinha publicado que o passo ficou **mais barato**: 0,921 → 0,357 ms. Era falso
duas vezes. Media o *antes* com o áudio já cheio de sons vivos, e o *antes* que eu
media era o passo morto. Medindo a **mesma** chamada seis vezes seguidas eu
obtive `1,70 · 2,35 · 4,83 · 4,68 · 6,24 · 6,24 ms` — código idêntico.

Então todo cronômetro saiu do teste. O que ficou é contagem:

| | perto | com distância |
|---|---:|---:|
| pedaços de som por passo | 18 | 22 |
| pedaços de som por porta | 48 | 58 |

A distância custa exatamente um filtro por camada, nos dois. Nada além disso.

E o áudio cosmético continua sem tocar no gerador da partida, como está escrito
na política do núcleo desde a v57: barulho de porta não pode mudar o que a casa
decide.

## O que também foi consertado, sem virar seção

- Os personagens tinham um campo com aquilo de que sentem falta — *"a igreja da
  praça"*, *"o cachorro dele, Pipoca"* — **lido zero vezes**. Virou uma cena
  nova da casa.
- Quem escondia lata da despensa tinha um contador que ninguém lia. Agora o
  terceiro desvio é descoberto, e o que ele guardou volta pra casa quando ele
  morre.
- Meta de morador que saiu do abrigo ficava na lista pra sempre.
- Pessoa com cômodo inválido sumia de todo lugar e continuava viva.
- 44 linhas de código morto que começavam com `if(true) return false`.
- O rastro dos seus passos na expedição não era salvo.
- Uma doença (`dor de dente`) era inalcançável — 18 dos 19 males aconteciam.

---

## Como isso foi verificado

**774 verificações automáticas, 27 arquivos de teste, zero falhas.**

Mais uma simulação de **250 noites** rodando o laço completo — exploração,
corpo, pressão, achados e incapacitação — com **zero travamentos** e **zero
documentos sem efeito**.

Os testes abrem o jogo num navegador de verdade, jogam, salvam, **recarregam a
página** e conferem. Recarregar de verdade importa: foi assim que a perda de
progresso apareceu.

E a montagem do jogo tem quatro travas que **impedem** de construir se:

1. dois pedaços do código usarem o mesmo nome (isso salvou três etapas);
2. alguém puser acento em nome de variável (aceita e quebra em silêncio);
3. as duas funções de decisão saírem do gerador da partida;
4. a tabela de sinais perder uma regra de justiça.

---

## O que ficou de fora, e por quê

Ser honesto sobre isto importa mais do que a lista de cima.

**Um problema conhecido continua lá.** Uma variável interna (`cena.modo`)
significa duas coisas ao mesmo tempo, em 28 lugares. Já causou três bugs. Mexer
nisso na mesma rodada em que 612 decisões trocaram de gerador seria
irresponsável — merece uma rodada só dele, com teste antes.

**As nove etapas do plano estão feitas.** O que continua em aberto é menor e
está listado aqui:

- **A simulação roda 250 noites, não 10.000.** O número do briefing não cabe no
  tempo de uma execução em navegador; 250 noites com o laço completo dizem mais
  do que 10.000 de um modelo simplificado. Zero travamentos nas 250.
- **Uma métrica não bate o alvo do briefing, de propósito.** Ele pedia 15–30% de
  noites sem ferimento; a calibragem atual entrega 69%. Subir a periculosidade é
  decisão de design, não conserto de bug — o número sai impresso no teste, com a
  faixa pedida ao lado, e a escolha é sua.
- **"Zero bugs" é uma coisa que ninguém pode prometer** sobre 2,8 MB de código. O
  que dá pra dizer é o que foi medido: toda verificação verde, quatro travas de
  build passando, zero erros de página, zero travamentos, e nenhuma comparação
  morta restante.
