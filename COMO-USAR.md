# NÃO ABRA — v48

Duas coisas: o motor de áudio novo e a sanidade que passa a mentir no ouvido.

## Arquivos

| arquivo | o que é |
|---|---|
| `index.html` | **o jogo.** É só isso que você publica. Já está com a v48 dentro. |
| `v48-som-e-sanidade.js` | o bloco novo, em arquivo separado pra dar pra ler |
| `montar.js` | injeta o bloco no `index.html`. `node montar.js` |
| `sw.js` | service worker (cache `v48-`, senão o celular serve a versão velha) |

Mexeu no `v48-som-e-sanidade.js`? Rode `node montar.js` de novo — ele
substitui a injeção anterior e sobe a versão do cache sozinho.

Pra gerar o pacote do Netlify Drop (o zip não fica no repositório porque é
derivado — refaça sempre que mudar o jogo):

```
node montar.js
zip -r naoabra-v48.zip index.html manifest.json sw.js icon-*.png
```

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

### O eco ficou audível
A sequela `eco` já repetia linha no log. Agora a fala volta atrasada, mais
baixa e mais grave.

---

## Ajuste fino

Tudo que é volume está no objeto `SOM`, no topo do bloco, e dá pra mexer
pelo console durante o jogo:

```js
SOM.gerador.vol  // .085  o motor ao fundo
SOM.mental.vol   // 1     o leito de sanidade
SOM.casa.vento   // .045
SOM.porta.vol    // .9
SOM.passos.vol   // 1.30
```

Teste rápido: `testarSom('morto')`, `'anomalo'`, `'porta'`, `'mental'`.

---

## O que foi medido

Renderizado em `OfflineAudioContext`, medido na saída final:

| caso | pico | RMS | estouros |
|---|---|---|---|
| gerador antigo | 0,165 | 0,038 | 0 |
| **gerador novo** | 0,257 | 0,092 | 0 |
| porta abrindo | 0,292 | 0,027 | 0 |
| passos | 0,374 | 0,019 | 0 |
| cova | 0,068 | 0,005 | 0 |
| cadeira | 0,325 | 0,034 | 0 |
| relógio | 0,039 | 0,002 | 0 |
| leito mental (ruptura) | 0,056 | 0,018 | 0 |
| **tudo junto** | 0,493 | 0,096 | 0 |

Zero amostras estouradas em todos os casos. O leito mental fica em RMS
0,018, bem abaixo do gerador — subliminar, que é a intenção.

No jogo rodando: as 10 ilusões abrem e resolvem nos dois caminhos, a
ponderação de trilho confere com a tabela acima, e o console fica limpo.
