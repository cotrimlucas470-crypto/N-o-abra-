# NÃO ABRA — v48

Duas coisas: o motor de áudio novo e a sanidade que passa a mentir no ouvido.

## Arquivos

| arquivo | o que é |
|---|---|
| `index.html` | **o jogo.** É só isso que você publica. Já está com tudo dentro. |
| `v48-som-e-sanidade.js` | o bloco do som e da sanidade, separado pra dar pra ler |
| `s14-mochilas.js` | o bloco de §14: sobrecarga, módulos, acesso rápido, descarte em fuga |
| `abertura-narrada.js` | a abertura contada em voz alta, com as marcas de tempo da narração |
| `abertura.mp3` | a voz. O `montar.js` embute ela no `index.html` como `data:` |
| `fundo-abertura.mp3` | a segunda gravação, que vira presença por baixo da narração |
| `corte-comodo.js` | o corte de 0,98 s entre cômodos, preso aos passos da gravação |
| `passos.mp3` | os passos. Também embutido pelo `montar.js` |
| `s9-percepcao.js` | o V9 no jogo: os quatro medidores, o filtro, os remédios, o rastro |
| `anomalia/core/v9/` | o núcleo do V9 em TypeScript, com 35 testes |
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

## A abertura narrada

O jogo começava no pedido de nome. Agora começa com a história sendo contada
em voz alta, no escuro, e as palavras entrando no ritmo da voz.

**As marcas de tempo não foram chutadas.** Saíram de medir o próprio arquivo:
envelope RMS em janelas de 20 ms, corte de silêncio em 6% do pico. A medição
acha **24 blocos de fala** separados por respiradas de 0,38 s a 0,80 s — e
esses 24 blocos caem exatamente nos 8 parágrafos do texto, o que confirmou a
divisão sem precisar de tentativa e erro. Cada parágrafo guarda a lista dos
blocos em que é dito, então as palavras param nas respiradas do meio da frase
junto com a narração, em vez de escorrer num ritmo constante por cima dela.

**Quem manda no relógio é o áudio.** A cada quadro a tela pergunta a
`currentTime` da voz. Num aparelho lento, ou se a decodificação engasgar, o
texto anda com o que está de fato saindo pelo alto-falante em vez de
desgarrar. Se o áudio não puder tocar, um relógio de parede assume e a
história é contada muda — dá pra ler, que é o que importa.

**O fundo** é construído no motor de áudio que o jogo já carrega, sem nenhum
arquivo a mais: pressão de sub descendo de 38 pra 31 Hz, ar parado respirando
a 0,075 Hz, e os toques casados com o que a voz está dizendo — **o gerador
liga na frase que fala dele** (e continua ligado, é o mesmo motor que estará
rodando quando o jogo começar), a batida na porta cai logo depois de *"E de
noite alguém bate"*, e os sussurros entram debaixo de *"uma coisa que
aprendeu a voz de alguém que morreu"*. O leito mede pico 0,157 na saída do
jogo, contra 0,405 da voz: o fundo nunca disputa com a narração.

**A presença por baixo.** A segunda gravação foi medida antes de ser usada:
41,22 s, mono, pico 0,291 e **15 blocos de fala separados por pausas de
frase**. Não é ambiente — é outra narração. Tocada como está, por baixo da
primeira, seriam duas pessoas falando ao mesmo tempo.

Ela dá lugar à voz em vez de brigar com ela. Chegar aqui custou dois erros
meus, e os dois só apareceram na medição:

**Errado 1 — esconder.** Passa-baixa em 320 Hz e ganho baixo. Funcionou
demais: a coisa sumiu, e presença que ninguém percebe não é presença.

**Errado 2 — subir o volume.** Medindo a saída, o nível durante a fala e o
nível nos vãos deram praticamente igual (rms 0,0513 contra 0,0548). O motivo
não era ganho: era **o gerador**. Ele é passa-baixa em 430 Hz, toca do
segundo 4,7 até o fim, e mascarava a presença dentro da faixa dela.

**Certo — mudar de lugar e ocupar os vãos.** Uma janela de **380 a 1500 Hz**,
acima do teto do motor: voz do outro lado da parede, com cadência e peso, sem
sibilância e sem palavra que dispute atenção. E o ganho é automatizado contra
as **24 marcas de fala** que este bloco já conhecia: ela recua durante cada
linha e volta em cada respirada.

Os números do ducking são os do pacote de áudio, que pede *"ducking de ~6–10 dB;
restaurar em 1–2 s"*: **8,0 dB medidos** de atenuação, descida de 250 ms (pra
estar fora do caminho antes da voz entrar) e subida de 1,2 s. Como a subida é
lenta e os vãos vão de 0,36 s a 0,80 s, ela **só floresce nos vãos longos** — o
que é respiração em vez de gate. Medido: 0,44 de ganho durante a fala, pico
0,742 nos vãos.

**Um defeito de sincronia que a medição pegou.** A presença era agendada a
partir do fim da decodificação, não do início da narração. Decodificar quase
um mega de mp3 leva algumas centenas de milissegundos, e isso punha o padrão
inteiro atrasado: ela subia em cima da fala e recuava no silêncio, o oposto do
desenhado. Agora, quando o buffer fica pronto, ela entra **já no ponto** —
começa de dentro do arquivo, no trecho correspondente ao tempo que passou, e o
envelope é agendado contra o início da narração.

**E uma correção de método:** todos os picos que eu vinha reportando nesta
seção foram medidos em `A.master`, que é **antes** do ganho de compensação e
do teto `tanh`. Os números relativos continuam valendo (leito contra leito),
mas o pico absoluto real se mede em `A._saidaV48.teto`. Lá o leito completo
com a presença dá pico 0,883, abaixo do teto de 0,95.

Na última frase a sala muda de cor — o lampião vira ferrugem.

**Pular** está sempre no canto. E quem volta pra uma casa que já existe não
ouve de novo: a história só é contada em partida nova.

**A voz vai embutida** no `index.html` como `data:` URI. O jogo é um arquivo
só — é o que você publica e o que o celular guarda — então o `montar.js`
converte o mp3 na hora da montagem e o bloco continua legível no
repositório. Custa 1,01 MB, e é por isso que o `index.html` passou de 862 KB
para 1,9 MB.

**A abertura escrita parou de repetir a narração.** O texto que a voz diz é,
palavra por palavra, o mesmo que a `abertura()` escrevia linha a linha depois
do pedido de nome — quem ouvisse os 49 s ia ler tudo de novo por mais 13 s.
Agora: ouviu até o fim, a abertura escrita guarda só o fecho e a escolha do
guia, que é a única coisa dela que decide alguma coisa. Pulou, ela roda
inteira — quem pulou não perde a história.

---

## O corte entre cômodos

Trocar de cômodo era um piscar: o texto sumia e o outro cômodo já estava
escrito. Agora existe o caminho — escurece, você ouve os passos, e a casa
volta no último deles.

**As marcas saíram de medir a gravação.** O arquivo tem 3,082 s e 10 passos
numa cadência firme de ~0,27 s, com impactos em 0,295 0,600 0,870 1,180
1,430 1,705 1,945 2,225 2,490 2,755. A janela usada é **0,295 → 1,275**:
quatro passos, **0,980 s**. Ela começa exatamente num impacto — sem aquele
instante de silêncio no começo que denuncia o corte — e termina no vão depois
do quarto passo, antes do quinto, então nada é cortado no meio. Os 20 ms que
sobram do orçamento de 1 s ficam de folga.

Dentro da janela os pés batem em **0, 0,305, 0,575 e 0,885**, e a tela é
presa neles:

| quando | o que acontece |
|---|---|
| 0 → 120 ms | escurece, em cima do primeiro passo |
| 140 ms | **o cômodo troca**, no escuro, sem ninguém ver |
| 800 → 980 ms | a volta, terminando junto com o quarto pé no chão |

A casa aparece **com** o passo, não depois dele. A volta usa
`cubic-bezier(.16,.84,.44,1)` — desce rápido e alonga no fim — e o `#app`
assenta de `scale(1.028)` para `1` junto, então a casa se acomoda em vez de
simplesmente aparecer. Medido: a opacidade passa por 15 valores intermediários
na volta, não é um salto.

**Só corta quando o cômodo muda de verdade.** Os vários botões *Voltar* da
casa chamam `irPara` com o cômodo em que você já está; escurecer a tela pra
continuar no mesmo lugar seria mentira. Nesse caso a volta é imediata — 18 ms
medidos, sem um quadro escuro.

Os passos sintetizados que tocavam nessa hora saíram do caminho: o jogo já
dizia a direção do passo um instante antes de trocar de cômodo, então agora
essa direção é guardada e o corte toca a gravação com a panorâmica certa, em
vez de somar dois sons de passo por cima um do outro.

Um detalhe que custou caro: a volta era **instantânea** na primeira versão.
Tirar a classe do preto e pôr a da volta com um reflow no meio faz a
opacidade saltar pra 0 antes de a transição começar. A volta agora **soma**
uma classe em vez de trocar — dois seletores juntos pesam mais que um — e não
há reflow entre as duas.

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
sem nenhuma ação na tela **e** não houver espera em curso. Travamento de
verdade passa pelas duas peneiras e dispara igual — está no teste.

**E o vigia passou a saber quando a espera ainda está correndo.** A v48 já
tinha ensinado a ele que pausa deliberada não é travamento, mas só marcava a
*hora em que a pausa começou*. A escuta na porta passa de 20 s numa pausa só:
o alarme disparava no meio dela, com o jogador de ouvido na madeira. Agora
cada espera se declara enquanto corre — `pausa()` do jogo e `esperaS()` das
transições de tela preta — e o relógio do vigia anda junto. Espera que nunca
termina não conta, senão seria um jeito de desligar o vigia.

---

## Quatro travamentos de verdade, que ninguém tinha achado

Varrendo o jogo com cliques automáticos — umas duas mil escolhas ao acaso —
apareceram quatro becos sem saída antigos, sem relação nenhuma com a v48.
Todos têm a mesma raiz: **`botao()` desabilita a barra inteira antes de
executar a ação**, pra ninguém clicar duas vezes. Se a ação não redesenha a
tela, aqueles botões ficam mortos para sempre e não sobra saída a não ser
recarregar.

- **"O monte no canto"**, no quintal, abria com `menuAltar()` sem dizer para
  onde voltar — e o *Voltar* dessa tela é justamente o argumento que faltava.
  Clicar nele estourava, e o estouro impedia qualquer redesenho.
- **"Salvar agora"**, nos Ajustes, escrevia *Salvo.* e mais nada. Todos os
  outros botões daquela tela terminam redesenhando os Ajustes; esse não.
  Salvar o jogo matava a tela de configurações junto, *Voltar* incluído.
- **"Riscar um fósforo"**, em Conferir o que é real, limpava a tela *antes*
  de conferir se você tinha fósforo. Sem fósforo e sem lanterna, sobrava uma
  tela vazia.
- **"Enfrentar com a arma"**, no encontro com bicho dentro de casa, fazia o
  mesmo: limpava a tela e só então descobria que a arma estava descarregada.
  A opção de sair de fininho ia junto.

E o vigia não via nada de errado em nenhum deles, porque contava botões sem
olhar se davam pra clicar.

Cinco consertos, do específico ao geral:

1. O monte abre com `menuAltar(()=>menuComodo(8))`. Uma varredura conferiu
   que **nenhum outro menu do jogo** é chamado com argumentos de menos.
2. *Salvar agora* redesenha os Ajustes, como os vizinhos dele.
3. Nos dois casos de recusa, a checagem vem **antes** de limpar a tela.
4. **A rede geral:** quando a poeira do clique baixa, se não sobrou nenhuma
   ação viva na tela, `botao()` devolve as que ainda estão lá. Quem
   redesenhou já pôs botões novos e não é tocado. Ação que não redesenha
   deixou de poder travar o jogo — inclusive as que ninguém achou ainda.
5. O vigia conta só as ações que dá pra usar. Tela cheia de botão morto e
   parada agora é o que sempre foi: travamento.

---

## E as vozes roubadas, que estavam quebradas nos dois lugares

`S.vozesRoubadas` guarda `{p, noite, como}` — a pessoa, a noite em que a voz
foi levada, e como. Dois lugares esqueceram o `.p` e foram buscar o dado
direto no registro:

- **A abertura do ecoador**, na cena da porta, pegava `.frase` do registro em
  vez de `.p.frase`. Vinha `undefined`, e a fala estourava **dentro da cena
  da porta** — que já tinha limpado a barra de ações. A noite acabava ali,
  sem botão nenhum. Era o travamento mais grave dos que apareceram, porque
  cai justo na cena central do jogo.
- **A resposta da pergunta "Fala o nome de alguém que você perdeu"** pegava
  `.n` em vez de `.p.n`. A coisa do outro lado da porta respondia
  *"undefined. Eu perdi undefined."* Agora responde *"Kelly. Eu perdi
  Kelly."* — o nome de alguém de dentro da casa, que é exatamente o arrepio
  que a cena foi escrita pra dar.

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

---

## V9 — a sanidade vira filtro, a anomalia vira conta

O núcleo em TypeScript está em `anomalia/core/v9/`, com **35 testes**, e o
bloco que leva isso pro jogo é `s9-percepcao.js`, com **17 verificações no
navegador**. Os números são os do documento, sem tradução.

### Os quatro medidores

Antes existia uma barra e uma função que sacudia número solto. Agora são
quatro medidores, três deles ocultos:

| medidor | o que é |
|---|---|
| sanidade | a verdade. Continua em `S.sanidade`, então o save antigo abre |
| escudo | 0..30, absorve o golpe antes da verdade |
| paranoia | 0..100, decide pra que lado o número mente |
| dívida | 0..100, o que a mentira acumulou e cobra em cena |
| abstinência | 0..100, o preço de ter se curado |

**O estágio não olha a barra.** Olha `sanidade − dívida×0,3 − abstinência×0,2`.
Medido no jogo: com a barra em 80, dívida 40 e abstinência 60, a leitura
efetiva é 56 — a barra diz *tenso* e você está *fissurado*.

**O escudo absorve, a paranoia não.** Um susto de 6 com escudo em 10 não move
a barra um ponto, mas sobe 2,4 de paranoia. É a diferença entre aguentar o
susto e não ter sentido ele. E só `ANOMALY_CONTACT` acumula dívida: susto
comum não.

### O filtro

Nada chega ao jogador sem passar por `perceber()`. Medido: lúcido mente 0%,
fissurado 12,2%, desfeito 49,5% — batendo com a tabela.

O deslocamento é **proporcional ao valor**: 4 latas viram 3 ou 5, 40 latas
viram 28 ou 52. O erro cresce junto com o que está em jogo e é sempre
plausível — mentira implausível não engana ninguém.

### Curar demais quebra você

Cada dose vale menos que a anterior (`heal × (1 − abstinência/130)`) e empurra
a abstinência pra cima. Medido com o chá: 8 → 7,82 → 7,63 → 7,45.

O amarelo é o extremo. Três doses levam a abstinência a 100, e acima de 70 o
corpo passa a somar dívida sozinho. Medido: **partindo de 95 de sanidade,
seis doses deixam a barra em 100 e a leitura efetiva em 68** — de *lúcido*
para *fissurado*, curando.

### Sequelas

Três noites com leitura abaixo de 20 travam uma sequela permanente, na ordem
tremor → surdez parcial → cegueira noturna. Nada as remove. Uma noite acima
zera a contagem. A surdez morde onde dói: a escuta na porta passa a perder
uma camada em metade das vezes.

### Você não é visto — você é somado

Detecção deixa de ser linha de visão. Ruído, sangue, dias sem lavar, lanterna
e ferro na mochila viram rastro, e o rastro entra numa conta que só desce
quando você para de produzir. Não existe "sair do campo de visão": existe
parar de emitir e esperar o esquecimento comer.

**Não existe desaparecer.** Parado, limpo, no escuro e sem nada de ferro, você
ainda emite `PRESENCA` 3. Medido: só sobra ela.

**Cada noite a coisa que ronda tem um ponto cego** — som, cheiro, visão ou
metal — e ele é absoluto: rastro que cai no ponto cego não soma nada, por
mais forte que seja. O jogo nunca diz qual é.

### A checagem de realidade

8 minutos e 4 de estresse, e acerta 80% das vezes. Medido: 80,0%. Os 20%
restantes **não devolvem "não sei"** — devolvem a resposta errada com a mesma
cara de certeza. Uma checagem que avisasse quando falhou seria de 100%.
