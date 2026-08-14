# Melhorias de áudio — NÃO ABRA

O repositório estava vazio e o código que você colou veio cortado no meio (parou
dentro de `estalo()`). Por isso as melhorias vieram como **arquivo aditivo**: ele
redefine as funções de som por cima das originais em vez de editar o `index.html`.

## Instalação

Coloque `audio-melhorias.js` na mesma pasta do `index.html` e adicione **uma linha**,
logo antes de `</body>` — precisa ser **depois** do `<script>` principal do jogo:

```html
  <script src="audio-melhorias.js"></script>
</body>
```

Se você distribui o jogo como arquivo único, cole o conteúdo do `.js` dentro de um
segundo `<script>` no fim do `<body>`. Não apague nada do que já existe.

## O que foi trocado

Estas funções passam a ter a versão nova (as originais continuam no arquivo, só
deixam de ser usadas):

| Função | Mudança |
|---|---|
| `ligarGerador()` | motor diesel novo, com partida |
| `ajustarGerador(pct)` | rotação e timbre respondem ao diesel |
| `desligarGerador()` | o motor morre em vez de sumir |
| `ligarAmbiente()` | vento quase inaudível |
| `agendarInquietacao()` | a casa cala a boca |

`estalo`, `grilo`, `gotejo`, `passoDistante` e `rocado` deixam de ser chamados.

## Funções novas

```js
somPortaAbrindo()      // ferrolho, rangido de dobradiça, lufada de fora, batente
somPortaFechando()     // rangido + baque + tranca
somPassos({...})       // pisadas
transicaoPassos({...}) // tela preta + passos  (devolve uma Promise)
acalmarCasa()          // baixa o ambiente em cena
testarSom('porta')     // atalho de teste pelo console
```

### A transição que você pediu

```js
transicaoPassos({
  texto: 'Passos no corredor.',   // opcional, aparece no escuro
  aproximando: true,              // vêm chegando: mais alto, menos eco
  passos: 6,
  superficie: 'madeira',          // madeira | escada | concreto | terra
  aoFim: () => desenharCena()     // roda ainda no escuro, antes de revelar
});
```

Sequência: escurece (0,3 s) → **1 segundo de breu** → os passos → `aoFim()` → volta.
Com 6 passos dá ~4,9 s no total. Para encurtar, use menos passos ou
`escuro: 600`. Durante o escuro o toque na tela fica bloqueado.

Outras opções: `afastando: true`, `ritmo` (segundos entre passos, padrão `.46`),
`forca`, `pan`, `sobra` (ms de silêncio depois do último passo).

## Ajuste fino

Tudo que é volume está no objeto `SOM`, no topo do arquivo:

```js
SOM.gerador.vol   // .085  — o motor ao fundo
SOM.casa.vento    // .045  — o leito de ar da casa
SOM.casa.inquietacao // .25 — chance de um estalo; 0 desliga de vez
SOM.porta.vol     // .9
SOM.passos.vol    // 1.30
```

Dá para mexer em tempo real pelo console durante o jogo.

## Por que o gerador estourava

Três causas no som antigo, todas resolvidas:

1. **Dente-de-serra de 42 Hz indo direto para a saída.** Essa forma de onda tem
   harmônicos até o topo da banda; sem filtro depois dela, o que se ouvia era
   zumbido áspero, não motor.
2. **Vibrato de ±10 Hz sobre 42 Hz.** Isso é um quarto da fundamental — soa como
   sintetizador desafinado, não como rotação.
3. **Onda quadrada de 9,6 Hz no "pistão".** Abaixo da faixa audível, uma quadrada
   não é som: é um degrau de tensão que empurra o cone do alto-falante para os
   extremos. É daí que vinha o estouro no celular.

O motor novo é fundamental triangular + segunda ordem + um zumbido fino de
alternador, com a combustão feita por ruído de banda modulado em amplitude por um
pulso arredondado e limitado em banda (o "tuc-tuc" do diesel, sem os degraus). Todo
o conjunto passa por um barramento com corte de subgraves em 26 Hz, passa-baixa em
430 Hz, saturação suave e limitador.

## Medições

Renderizado em `OfflineAudioContext` e medido na saída final (pico de amostra e RMS):

| caso | pico | RMS | amostras estouradas |
|---|---|---|---|
| gerador antigo | 0,165 | 0,038 | 0 |
| **gerador novo** | 0,252 | 0,093 | 0 |
| desligando | 0,205 | 0,012 | 0 |
| porta abrindo | 0,217 | 0,030 | 0 |
| porta fechando | 0,474 | 0,031 | 0 |
| passos (chegando) | 0,383 | 0,019 | 0 |
| casa parada | 0,033 | **0,007** | 0 |
| **tudo junto** | 0,479 | 0,100 | 0 |

A casa parada em RMS 0,007 é o "mais quieta" que você pediu: sobra o gerador e
mais nada. O pior caso (gerador + ambiente + porta + passos ao mesmo tempo) fica em
pico 0,48, com folga de mais de 6 dB até o teto.
