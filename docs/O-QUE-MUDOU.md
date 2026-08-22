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

**660 verificações automáticas, 23 arquivos de teste, zero falhas.**

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

**O plano tem nove etapas e quatro estão feitas.** Faltam: o ponto de não
retorno (a volta do porão ser diferente da ida), os achados e documentos que
revelam regras, as cicatrizes que a casa passa a mirar, o tratamento com escolha
difícil, e a simulação de 10.000 noites.

O jogo está inteiro e jogável do jeito que está. O que falta é o que ainda não
começou — não o que ficou pela metade.
