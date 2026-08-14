# NÃO ABRA — v48

Duas coisas: o motor de áudio novo e a sanidade que passa a mentir no ouvido.

## Arquivos

| arquivo | o que é |
|---|---|
| `index.html` | **o jogo.** É só isso que você publica. Já está com tudo dentro. |
| `v48-som-e-sanidade.js` | o bloco do som e da sanidade, separado pra dar pra ler |
| `s14-mochilas.js` | o bloco de §14: sobrecarga, módulos, acesso rápido, descarte em fuga |
| `montar.js` | injeta os blocos no `index.html`. `node montar.js` |
| `sw.js` | service worker (cache `v48-`, senão o celular serve a versão velha) |

Mexeu num dos blocos? Rode `node montar.js` de novo — ele substitui as
injeções anteriores e sobe a versão do cache sozinho.

A **ordem da lista dentro do `montar.js` é a ordem de execução**, e ela
importa: cada bloco embrulha funções que o anterior já embrulhou. §14 lê o
peso verdadeiro por baixo da mentira de sanidade que o v48 instala, então
tem de vir depois dele.

Pra gerar o pacote do Netlify Drop (o zip não fica no repositório porque é
derivado — refaça sempre que mudar o jogo):

```
node montar.js
zip -r naoabra-v48.zip index.html manifest.json sw.js icon-*.png
```

---

## Parte C — as mochilas (§14)

O jogo já tinha as 7 mochilas com tier, ruído, furtividade e lentidão. O que
faltava de §14, e agora está em `s14-mochilas.js`:

**Sobrecarga.** Era o buraco principal: `cabe()` era sim/não, então passar do
teto era impossível e o dilema central da seção — *voltar rico e devagar ou
leve e com fome* — não podia acontecer. Agora o **peso é limite mole** e o
**volume continua duro**: espaço físico não dobra, ombro dobra. A escada é a
da tabela, sem conversão:

| carga | preço |
|---|---|
| até 70% | nada |
| 70–90% | `-1` velocidade, `+10` de ruído |
| 90–100% | `-2` velocidade, `+25` de ruído, `-1` de sanidade por saída |
| acima de 100% | `-4` velocidade, `+45` de ruído, 20% de deixar cair alguma coisa |

A alça arrebenta de vez em 135%.

**Os 6 módulos**, costurados na bancada. O jogo não tem tecido, couro, espuma
nem tinta — tem lona, fio, arame e vedante, que é fita. A receita é a mesma
coisa dita no vocabulário deste mundo. Bolso lateral `+2` de espaço, cinto
`+4 kg` e `+1` de acesso rápido, coldre tira a maior lâmina do volume e a
deixa à vista, forro corta metade do ruído e come 2 de espaço, alça reforçada
mata o rasgo, compartimento oculto esconde 2 armas e custa 1 acesso rápido.

**Acesso rápido virou número de verdade.** A tela mostrava "3 bolsos de acesso
rápido" e não contava nenhum. Agora é 1 rolagem = 1 item, e o contador zera a
cada encontro.

**Descarte em fuga.** Correndo com mais de 90% de carga, aparece a escolha:
largar a mochila e ganhar um degrau inteiro de chance, ou segurar tudo. A
mochila fica no local e volta em 55% das vezes se você buscar no dia seguinte.
Quando não volta, dias depois o rádio descreve ela na mão de outra pessoa.

**A sacola de pano rasga** em 4% das saídas, e a alça reforçada tira isso.

**A costurada à mão** existe: 26 kg, ruído zero, 4 bolsos rápidos. Só dá pra
costurar ela se você perdeu alguém — é a lona que a pessoa guardava. É âncora:
largá-la na fuga custa 30 de sanidade.

**O compartimento oculto** tem consequência real porque a revista humana deste
jogo são os saqueadores, que levam tudo que é de ferro. O que está costurado
entre o forro e o fundo eles não acham.

---

## Parte A — o som

**O gerador não estoura mais.** O som antigo tinha três defeitos:

1. Dente-de-serra de 42 Hz indo direto pra saída, sem filtro. Harmônicos
   até o topo da banda: zumbido, não motor.
2. Vibrato de ±10 Hz sobre 42 Hz — um quarto da fundamental. Isso é
   sintetizador desafinado.
3. **A causa do estouro:** onda quadrada de 9,6 Hz no "pistão". Abaixo da
   faixa audível, uma quadrada não é som — é um degrau de tensão que joga
   o cone do alto-falante de um extremo ao outro.

Agora é fundamental triangular + segunda ordem + zumbido de alternador,
com a combustão feita por ruído de banda modulado por um pulso arredondado
(o "tuc-tuc" do diesel, sem degraus), tudo passando por corte de subgraves
em 26 Hz, passa-baixa em 430 Hz, saturação suave e limitador. Tem partida
(pega, acelera demais, assenta), parada, e engasgo quando o diesel acaba.

**Porta:** ferrolho, rangido de dobradiça com envelope que prende e solta,
arrasto da madeira, lufada de fora e batente.

**Passos:** quatro superfícies (madeira, escada, concreto, terra), marcha
irregular, panorâmica alternada, modos aproximando/afastando — e
`desumano: true`, que tira toda a variação de tempo e força. É o mesmo tell
do ritmo de metrônomo nas batidas: gente nunca mantém o tempo exato.

**A casa ficou quieta.** Sem grilo, sem gotejo, sem roçado. Sobra o gerador
ao fundo e, raramente e só sob tensão alta, um estalo.

```js
transicaoPassos({ texto:'Passos no corredor.', aproximando:true,
                  superficie:'madeira', aoFim:()=>desenharCena() });
```
Escurece → 1 s de breu → passos → `aoFim()` ainda no escuro → revela.

---

## Parte B — a sanidade mente no ouvido

O jogo inteiro é sobre vozes imitadas, mas a loucura só acontecia em número
e em letra dobrada. Agora ela acontece onde dói.

### O leito mental
Zumbido de ouvido, pressão de sub e um sopro sem direção, que crescem com o
estágio. Nunca é anunciado no texto — a pessoa só percebe quando some.

### Ilusões sonoras
São 10, e a diferença pro catálogo antigo é que **o som toca e o log não diz
nada**. Não existe frase confirmando que você ouviu. Ir conferir gasta ruído;
ignorar deixa a dúvida. É o único lugar do jogo onde a informação chega só
pelo ouvido.

E o ouvido apodrece junto: quanto pior a cabeça, menor a chance de o som ser
real. É exatamente quando você mais precisa dele que ele para de servir.

### Os trilhos passaram a valer
`trilhoDominante()` era usado numa linha só do colapso. Agora ele escolhe as
ilusões — o trilho dominante pesa 3× no sorteio:

| dominante | paranoia | culpa | dissociação |
|---|---|---|---|
| nenhum | 40% | 30% | 31% |
| paranoia | **69%** | 16% | 16% |
| culpa | 26% | **55%** | 19% |
| dissociação | 26% | 18% | **55%** |

Culpa tinha uma ilusão só (a voz do morto) — e é o trilho que mais sobe, 9
por morador enterrado. Ganhou mais duas: a terra sendo remexida no quintal e
a cadeira arrastando no cômodo onde alguém morreu.

### A voz de quem morreu
Usa a síntese de fala que o jogo já carrega, com o timbre puxado pra baixo,
um sopro subindo antes e sussurro por baixo — o mesmo truque do mímico,
aplicado à própria cabeça do jogador.

### Escutar a casa
Ação nova em "Conferir o que é real": 1 hora, o par auditivo do "observar a
sombra". Lúcido, dá +2 de sanidade (uma vez por dia) e você pode confiar no
que ouviu. Fissurado pra baixo, a casa insere uma linha falsa no meio de
coisas verdadeiras — e o texto não te conta qual era.

### Barra da cabeça no painel
Quarto medidor, junto de Diesel/Ruído/Porta, com a cor mudando por estágio
(verde → âmbar → laranja → ferrugem). Mostra o valor real: `menuRealidade`
já era honesto sobre a sanidade, então a barra também é.

### O eco ficou audível
A sequela `eco` já repetia linha no log. Agora a fala volta atrasada, mais
baixa e mais grave.

---

## O que a v48 tinha quebrado sem avisar

A v48 trocou duas peças por baixo do jogo e não avisou os lugares que já
usavam as peças velhas. Nos dois casos o sintoma não parecia som: parecia o
jogo travando.

**O gerador.** O motor novo é feito de outros nós — o volume virou `mestre`,
a rotação virou `oRot`, o pulso da combustão virou `oAM`. Três lugares do
jogo antigo continuavam abrindo a caixa velha (`g`, `o`, `pist_o`):

- `somDoComodo` — **estourava em toda troca de cômodo**, e é daí que vinha o
  "O jogo travou aqui" logo depois de clicar em *Ir para OFICINA*. Não era
  travamento: o erro cortava `irPara` no meio, a barra de ações ficava vazia
  por um instante e a rede de segurança acusava o que não tinha acontecido.
  Alguns milissegundos depois o menu voltava sozinho — e a linha vermelha
  ficava lá, mentindo.
- `desgastarGerador` — estourava sempre que o motor se gastava.
- `abaixarAmbiente` / `devolverAmbiente` — esse não estourava, só parava de
  funcionar em silêncio: o gerador deixou de abaixar enquanto alguém fala.

Agora quem mexe no motor de fora pergunta a `gerVolume()`, `gerRotacao()` e
`gerPulso()` em vez de abrir a caixa, e não quebra na próxima vez que ela
mudar.

**Os passos.** A assinatura virou `passo(instante, opções)`, mas o jogo
chamava `passo(proximidade, pan)` em **13 lugares** — do mímico no corredor
ao vizinho na rua. A chamada antiga entrava na nova sem reclamar: `op.forca`
vinha `undefined`, o ganho virava `NaN`, o navegador recusava o passo. Todo
passo do jogo antigo estava mudo, cada um deixando um erro solto para trás.
As duas formas entram pela mesma porta agora, e a antiga ainda ganhou o piso
certo — concreto na rua, terra no quintal, escada no porão e no sótão.

**A rede de segurança parou de gritar antes da hora.** Ela acusava travamento
400 ms depois de qualquer erro solto, se a barra estivesse vazia naquele
instante. Mas o jogo tem transições em que a barra fica vazia de propósito.
Agora a suspeita espera 6 s e só vira acusação se, no fim da espera, continuar
sem nenhuma ação na tela **e** ninguém tiver pedido pausa nesse meio-tempo.
Travamento de verdade passa pelas duas peneiras e dispara igual — está no
teste.

---

## Dois bugs do jogo, anteriores à v48

**O alarme falso de travamento.** O vigia acusa travamento depois de 14 s
sem nenhum botão na tela. A abertura do dia 1 fica **13,1 s** sem botão — a
0,9 s do limite. Num aparelho mais lento, ou com as fontes vindo da rede,
ela passa e o jogo se acusa de travar sem ter travado. Medido: v47 e v48
dão os mesmos 13132 ms, não era coisa da v48.

Em vez de afrouxar o limite, que enfraqueceria a rede de segurança, o vigia
passou a saber a diferença entre estar parado e estar esperando: toda pausa
deliberada renova o relógio dele. Travamento de verdade — em que ninguém
chama `pausa()` — continua disparando o socorro, e isso está no teste.

**As barras nunca apareceram.** Nenhuma delas, nem a do diesel: tinham 2 px
de largura. `#relogio` tinha `grid-row` definido e coluna automática, e pelas
regras de posicionamento do grid isso o coloca antes dos itens totalmente
automáticos — ele ficava com a coluna de 254 px e os quatro medidores se
espremiam nos 98 px restantes, onde rótulo (48) + valor (30) + vãos (18) já
somam 96. Coluna explícita para o relógio: as barras foram de 2 px para
182 px.

---

## O mix estava baixo demais

O som mais alto do jogo — a batida na porta — chegava a **0,46 de pico**:
metade do teto disponível. A causa não era ganho, era o compressor da saída,
com `threshold -14 dB` e `knee` no padrão de **30 dB**. Isso faz a compressão
começar em -29 dB (0,035 linear), então ele nivelava o mix inteiro o tempo
todo em vez de só segurar pico — por isso subir o volume mestre rendia quase
nada.

A saída virou o que devia ser: ganho de compensação de 2,4×, um limitador que
só age perto do teto, e um **teto matemático** — uma curva `tanh` que satura
em 0,95 e não passa disso para nenhuma entrada. O limitador sozinho não
bastava: com ataque de 2 ms o transiente da batida passava por baixo dele e o
mix chegava a 1,002, com 29 amostras estouradas. A garantia agora não depende
de tempo de reação.

O gerador desceu de `.085` para `.055` no mesmo movimento: ele toca o tempo
todo, e num mix mais alto engoliria as pistas das ilusões.

Volume geral ajustável em tempo real pelo console: `volumeGeral(2.8)`.

---

## Ajuste fino

Tudo que é volume está no objeto `SOM`, no topo do bloco, e dá pra mexer
pelo console durante o jogo:

```js
SOM.mestre.vol   // 2.4   ganho geral (ou volumeGeral(x))
SOM.gerador.vol  // .055  o motor ao fundo
SOM.mental.vol   // 1     o leito de sanidade
SOM.casa.vento   // .070
SOM.porta.vol    // .9
SOM.passos.vol   // 1.30
```

Teste rápido: `testarSom('morto')`, `'anomalo'`, `'porta'`, `'mental'`.

---

## O que foi medido

Renderizado em `OfflineAudioContext`, medido na saída final:

Pico e RMS na saída final, antes e depois do conserto do mix:

| caso | antes | depois | estouros |
|---|---|---|---|
| batida na porta | 0,462 / 0,030 | **0,890 / 0,089** | 0 |
| gerador | 0,256 / 0,093 | 0,648 / 0,214 | 0 |
| porta abrindo | 0,215 / 0,028 | 0,749 / 0,097 | 0 |
| passos | 0,340 / 0,018 | 0,829 / 0,063 | 0 |
| cova | 0,044 / 0,004 | 0,344 / 0,027 | 0 |
| relógio | 0,039 / 0,002 | 0,322 / 0,013 | 0 |
| casa parada | 0,037 / 0,007 | 0,194 / 0,038 | 0 |
| leito mental | — | 0,194 / 0,063 | 0 |
| **tudo junto** | 0,552 / 0,099 | **0,889 / 0,237** | 0 |

Zero amostras estouradas em todos os casos, incluindo cinco batidas a plena
força somadas à porta abrindo — que era exatamente o caso que estourava antes
do teto entrar.

No jogo rodando: as 10 ilusões abrem e resolvem nos dois caminhos, a
ponderação de trilho confere com a tabela acima, e o console fica limpo.
