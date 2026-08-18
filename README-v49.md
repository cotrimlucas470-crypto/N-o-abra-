# NÃO ABRA — v49

Versão consolidada. Reúne tudo que foi feito nas fases anteriores mais os dois
sistemas novos desta: a chuva com dono único e a luz de dentro da casa.

---

## 1. O que é este projeto, e o que ele não é

Antes de qualquer coisa, porque isso muda o que faz sentido pedir dele:

**É** um jogo de terror em **JavaScript puro**, desenhado em `<canvas>` 2D,
distribuído como **um arquivo HTML só** (`index.html`), instalável como PWA no
celular. Sem framework, sem build de bundler, sem servidor.

**Não é** um projeto de engine 3D. Não existem aqui — e portanto não há o que
ajustar em — *lightmaps*, *probes*, oclusão, sombras projetadas, materiais PBR,
*draw calls*, prefabs, LOD de malha, reflexos em poça ou vazamento de luz entre
cômodos. O jogo desenha **um cômodo por vez**; não há geometria pra luz
atravessar nem vizinho pra vazar. Onde o pedido citava esses termos, a seção
correspondente aqui explica o que foi feito em lugar deles.

---

## 2. Instalação e execução

Não há dependência para **rodar**. Abra `index.html` num navegador.

```bash
# opção 1: abrir direto
xdg-open index.html          # ou dê duplo clique

# opção 2: servir (necessário só pra testar o PWA/service worker)
python3 -m http.server 8000
# depois: http://localhost:8000
```

### Reconstruir o `index.html` a partir dos blocos

O jogo é publicado como um arquivo só, mas o código vive em blocos separados
pra dar pra ler e revisar. O `montar.js` injeta todos antes do `</body>` e
embute os MP3 como `data:` URI.

```bash
node montar.js
```

**Dependência:** Node.js 18 ou mais novo (testado em **Node 22.22.2**). Só o
`montar.js` precisa de Node — o jogo em si não. Nenhum pacote de npm é
necessário: `montar.js` usa apenas `fs`.

**A ordem em `BLOCOS` importa e não é arbitrária:**

```
v48-som-e-sanidade → s14 → abertura-narrada → corte-comodo → s9
                   → audio-manager → s15 → s16 → s17 → s18
```

Cada bloco embrulha funções que o anterior já embrulhou. A §15 precisa vir
depois do v48 (embrulha `melhorArma`, `ferirPor`, `descarregar`); a §16 depois
da §15; a §17 e a §18 depois do audio-manager. Trocar a ordem quebra a cadeia.

### Para desenvolver

```bash
node --check s17-chuva.js     # confere sintaxe de um bloco
node montar.js                # reconstrói index.html e troca o cache do sw.js
```

---

## 3. Arquivos

### Criados nesta versão

| arquivo | o que faz |
|---|---|
| `s17-chuva.js` | controlador único da chuva: áudio, partícula, névoa, janela, exposição |
| `s18-luz.js` | modelo de luz por cômodo: luminária, interruptor, energia, janela |
| `README-v49.md` | este arquivo |
| `TESTES-v49.md` | registro dos testes e resultados |

### Modificados nesta versão

| arquivo | mudança |
|---|---|
| `audio-manager.js` | corrigido `window.cena` → `cena` (5 ocorrências; a detecção de "está do lado de fora" nunca funcionou desde a fase 1) |
| `montar.js` | registra os blocos `s17` e `s18` |
| `index.html` | regerado pelo `montar.js` |

### De fases anteriores, incluídos e intactos

`v48-som-e-sanidade.js`, `s14-mochilas.js`, `abertura-narrada.js`,
`corte-comodo.js`, `s9-percepcao.js`, `audio-manager.js`, `s15-qualidade.js`,
`s16-armazenamento.js`.

### O que foi deixado de fora do pacote, e por quê

| deixado de fora | motivo |
|---|---|
| `anomalia/` (3,2 MB) | subprojeto separado, com `node_modules` — dependência regenerável e código de outro projeto |
| `tools/` | scripts de análise e dumps JSON; não fazem parte do jogo nem do build |
| `naoabra-v48.zip`, `a-anomalia-v8-completo.zip` | **zip dentro de zip**, explicitamente indesejado |
| `.git/` (20 MB) | histórico de versionamento |
| `fundo-abertura.mp3` (648 KB) | não é usado pelo build desde que a abertura passou a usar drone sintetizado |

Nenhum cache, log, build temporário, credencial, token, chave ou dado pessoal
está no pacote.

---

## 4. A chuva

### O problema que existia

A chuva eram três coisas soltas que não se conheciam:

1. `desenharChuva` no canvas — 110 gotas fixas, sempre iguais, sem vento e sem
   relação nenhuma com o volume.
2. Dois leitos de áudio, `chuva_leve` e `chuva_pesada`, que o diretor de
   ambiente ligava e desligava. **Passar de chuva fraca pra forte trocava de
   FONTE**: parava um som e começava outro, fora de fase, com corte audível.
3. A calha, por conta própria.

E não havia nenhuma noção de estar dentro ou fora: a chuva soava igual no
quintal e no porão.

### Como funciona agora

Três regras, e o resto decorre delas:

**1. Uma fonte.** O som da chuva nasce uma vez e não para enquanto chove.
Intensidade e lugar mexem em ganho e filtro, **nunca** em `start`/`stop`. Não
existe reinício nem eco de duas cópias fora de fase, porque não existem duas
cópias.

**2. Duas saídas, mesmo relógio.** O crossfade entre "estou na chuva" e "estou
abrigado" usa dois **caminhos paralelos saindo da mesma fonte** — um aberto,
um abafado:

```
fonte única
   ├─→ realce de agudos ──→ ganho ABERTO  ─┐
   └─→ passa-baixas ─────→ ganho FECHADO ─┴→ canal AMBIENCE
```

Eles compartilham a linha do tempo **por construção**: não é sincronia mantida,
é sincronia impossível de perder. Não há dois `AudioBufferSourceNode` para
alinhar, então não há como sair de fase.

O crossfade é de **potência constante** (`sin`/`cos`), não linear. Somando dois
ganhos lineares, o meio do caminho ficaria 3 dB fundo — e é exatamente isso que
se ouve como "buraco" ao atravessar a porta.

**3. Um número só manda.** `intensidade` (o quanto chove) e `exposicao` (o
quanto disso te alcança) governam áudio, partícula, névoa e janela ao mesmo
tempo. Não dá pra ter chuva forte na tela e quase nada no ouvido.

### Dentro e fora

`exposicao` é uma escala de 0 a 1 por lugar, não um booleano:

| lugar | exposição |
|---|---|
| rua, mapa, frente da casa | 1,00 |
| quintal | 0,90 |
| **de pé na porta aberta** | 0,80 |
| entrada | 0,46 |
| sótão (telha na cabeça) | 0,34 |
| sala, cozinha | 0,20 |
| quarto (janela tapada) | 0,15 |
| despensa, oficina | 0,11 |
| porão | 0,04 |

Cada tábua pregada na porta desconta 0,03. Quem diz onde você está é
`cena.casa.voce` — **não** `cena.modo`, porque `irPara(id,true)`, o caminho que
o próprio jogo usa pra entrar na casa sem animação, mexe no cômodo e não mexe
no modo.

A transição usa constante de tempo de 0,65 s, então atravessar a porta rápido
não dá degrau: a exposição não chega a completar o caminho antes de você voltar.

### A chuva vista de dentro

Nenhuma gota é desenhada dentro do cômodo — a chuva não atravessa telhado
porque quem desenha por dentro é outra coisa: **água escorrendo no vidro**, no
lugar exato onde a janela daquele cômodo está desenhada. Porão, oficina e
despensa não têm janela e não mostram nada.

---

## 5. O MP3 da chuva

**Nenhum arquivo de chuva foi entregue.** Os áudios recebidos até aqui são uma
narração (em duas cópias), passos e o gerador a diesel — verificados por
análise espectral, não por suposição. Chuva tem cruzamento por zero alto
(> 2500 Hz) e envelope quase constante; nenhum dos cinco tem esse perfil.

Então o sistema **procura `audio/chuva.mp3`, usa se achar, e cai numa síntese
de chuva enquanto não achar**. A síntese não é um marcador: é uma fonte de
ruído única com duas camadas tiradas dela por filtro (o chiado das gotas e o
corpo da massa de água), e a intensidade move filtro e proporção.

### Como trocar o MP3 sem quebrar a sincronia

1. Copie o arquivo para `audio/chuva.mp3`.
2. Recarregue. Ele entra **na próxima chuva** — nunca cortando a que está
   tocando.

Só isso. Não há sincronia a preservar manualmente, porque não existem duas
fontes para alinhar: o mesmo nó alimenta os dois caminhos do crossfade.

**Se o seu MP3 não for um laço perfeito**, ajuste em `s17-chuva.js`:

```js
const CHUVA={
  arquivo:'chuva.mp3',
  laco:null,        // null = laça o buffer inteiro
  // laco:[0.05, 6.04],   // [início,fim] em SEGUNDOS
```

Os pontos vão **em segundos, nunca em amostras**: o navegador reamostra o
arquivo para a taxa do contexto de áudio (44,1 ou 48 kHz conforme o aparelho),
e um valor em amostras deixaria de valer. Se o MP3 foi codificado com LAME sem
tag de *gapless*, ele carrega ~50 ms de atraso do encoder no começo — comece o
laço depois disso. (O gerador, em `audio-manager.js`, é um exemplo pronto
dessa conta: `laco:[0.0501134, 6.0452154]`.)

---

## 6. A luz da casa

### O problema que existia

Três coisas somadas, na ordem de gravidade:

1. **A luz não vinha de lugar nenhum.** `lampiao()` era chamado nos 11 cômodos
   com posição e força **fixas**, sem olhar gerador, hora, diesel ou
   interruptor. Ligar o gerador não clareava um pixel: a "luz acesa" era
   desenho, não estado.
2. **A luz não iluminava o cômodo.** O gradiente era um véu quente por cima do
   quadro; a parede continuava com a cor que tinha no escuro. Era brilho *na*
   lâmpada, não luz *sobre* a sala.
3. **`aplicarTom` comia o resto.** Ele roda **depois** do cômodo e da lâmpada e,
   à noite, pinta `rgba(6,7,16,.60)` sobre o quadro inteiro, porque
   `luzAgora().f` cai pra 0,16. Nenhuma lâmpada vencia isso.

O item 3 era a causa raiz de "escuro mesmo com as luzes ligadas".

### Como funciona agora

A curva do dia é a luz **de fora**. Dentro de casa, com a luminária acesa, quem
manda é ela — então o fator vira o maior dos dois, e a cor caminha do azul da
noite para o tom da lâmpada na medida em que a lâmpada domina. De dia, ou com
tudo apagado, a conta devolve exatamente o que o v48 já fazia.

A luz entra em duas camadas, como luz real:

- **facho** — a luz direta da luminária, com direção e queda. É o que dá forma.
- **rebote** — o que a parede devolve. É o que tira o preto absoluto do canto.

O rebote usa composição `screen`, que levanta a sombra sem estourar o que já é
claro — somar com `lighter` lavaria a imagem. E a vinheta cede na mesma medida
em que a luz sobe, em vez de devolver a borda pro preto.

**Medido:** sala à noite com o gerador ligado, luminância média **38**; a mesma
sala com a luz apagada, **15,3**. Duas vezes e meia mais clara, com os cantos
ainda escuros — legível, sem ficar chapada.

### Cada cômodo tem a sua luminária

| cômodo | luminária | caráter |
|---|---|---|
| SÓTÃO | lâmpada pendurada na viga | fraca, quente |
| QUARTO | abajur na cabeceira | baixa, quente, confortável |
| DESPENSA | lâmpada da despensa | funcional |
| OFICINA | luminária da bancada | forte, fria, focada no serviço |
| SALA | lâmpada do teto | ampla, quente |
| COZINHA | lâmpada da cozinha | a mais forte, branca — aqui se corta e se cozinha |
| PORÃO | bocal na viga | fraca, sem janela |
| ENTRADA | luz da entrada | média, pega a fechadura |
| QUINTAL | lâmpada do batente | externa, fraca |

### Fontes de luz, e a regra

Toda luz visível tem origem: **gerador** (elétrica, só com o motor rodando,
diesel > 0 e não quebrado), **lampião** (querosene — fraco, quente, tremido),
**lanterna** (foco frio, só com pilha e sem energia) e **janela** (de dia,
descontando clima e chuva pela `luzAgora()` que o jogo já tinha).

- **Lâmpada apagada não brilha**: o corpo da lâmpada só é desenhado quando a
  luminária está de fato acesa.
- **Nenhum cômodo fica em breu**: o lampião é o piso, porque uma casa
  habitada não fica sem nenhuma luz — e o pedido é explícito em evitar preto
  absoluto.
- **O interruptor é por cômodo**, aparece no menu do cômodo, faz som, muda a
  cena na hora, sobrevive a andar pela casa e é gravado no salvamento.
- Sem gerador, o interruptor dá clique e avisa que não há energia.

---

## 7. Parâmetros ajustáveis

Todos centralizados no topo de cada bloco.

### Chuva — `s17-chuva.js`, objeto `CHUVA`

| parâmetro | padrão | o que faz |
|---|---|---|
| `arquivo` | `'chuva.mp3'` | nome dentro de `audio/` |
| `laco` | `null` | `[início,fim]` do laço, em segundos |
| `tempoIntensidade` | `1.6` | constante de tempo pra começar/engrossar/parar (s) |
| `tempoExposicao` | `0.65` | constante de tempo pra entrar/sair de casa (s) |
| `volumeFora` | `1.00` | nível do caminho aberto |
| `volumeDentro` | `0.62` | nível do caminho abafado |
| `corteFechado` | `340` | passa-baixas no lugar mais fechado (Hz) |
| `corteAberto` | `1500` | passa-baixas no lugar mais aberto (Hz) |
| `exposicao.*` | ver tabela | quanto cada lugar é alcançado |
| `naPorta` | `0.34` | somado quando a porta está aberta |
| `porTabua` | `0.03` | quanto cada tábua abafa |
| `gotasMax` | `150` | gotas na qualidade alta |
| `respingoMax` | `7` | respingos por quadro |
| `nevoaMax` | `0.16` | névoa na tempestade |
| `janelaMax` | `0.55` | presença da chuva no vidro, visto de dentro |

**Mais abafado dentro de casa:** baixe `corteFechado` e `volumeDentro`.
**Transição mais lenta na porta:** suba `tempoExposicao`.

### Luz — `s18-luz.js`, objeto `LUZ`

| parâmetro | padrão | o que faz |
|---|---|---|
| `rebote` | `0.16` | quanto a luz levanta o cômodo inteiro |
| `facho` | `0.62` | a luz direta da luminária |
| `cedeVinheta` | `0.42` | quanto a vinheta cede com luz |
| `minimo` | `0.16` | piso de legibilidade: nunca preto absoluto |
| `transicao` | `0.9` | segundos pra acender e apagar |
| `gerador` | `1.00` | força da luz elétrica |
| `lampiao` | `0.42` | força do lampião |
| `lanterna` | `0.30` | força da lanterna |
| `diaJanela` | `0.55` | sol entrando ao meio-dia |
| `chuvaCorta` | `0.45` | quanto a chuva tira da luz do dia |

**Casa mais clara:** suba `rebote` — mas com moderação. Aos 0,30 o cômodo fica
legível e **chapado**, sem contraste. O trabalho pesado é do `facho`, que tem
direção.
**Mais atmosfera, menos visibilidade:** baixe `cedeVinheta`.

Intensidade, alcance, cor e posição de cada luminária ficam na tabela
`LUMINARIAS`, uma linha por cômodo:

```js
4:{nome:'lâmpada do teto da sala', x:.50,y:.20, alcance:1.05, forca:.85,
   cor:[255,224,168], janela:true, d:'Centro do teto. Pega a sala inteira.'},
```

`cor` é RGB 0–255 (temperatura), `alcance` é fração da altura da tela, `forca`
multiplica a intensidade, `janela` diz se o cômodo vê o céu.

### Mixagem de áudio — `audio-manager.js`

`AM_DB` (teto por canal), `AM_BRUTO` (pico medido de cada síntese) e `AM_NIVEL`
(quanto cada som toca dentro do canal). O procedimento de remedição está no
`COMO-USAR.md`.

### Qualidade gráfica — `S.cfg.qualidade`

`'baixo'`, `'medio'`, `'alto'` ou `'ultra'`. Escala o que custa caro sem
mudar o que é o efeito:

| nível | gotas | respingo | névoa | água no vidro | facho de luz | tremor |
|---|---|---|---|---|---|---|
| baixo | 28% | não | não | 50% | não | não |
| médio | 55% | 50% | 60% | 80% | sim | não |
| alto | 100% | 100% | 100% | 100% | sim | sim |
| ultra | 100% | 100% | 100% | 100% | sim | sim |

---

## 8. Desempenho

O que foi feito, na medida em que faz sentido num jogo 2D em canvas:

- **Emissão limitada e reaproveitada.** As gotas são um pool fixo
  (`_pingos`), criado uma vez e reciclado — a gota que sai por baixo volta por
  cima. Nada é alocado por quadro.
- **Densidade escalonada** por qualidade **e** por intensidade: chuva fraca
  desenha menos gota, não a mesma quantidade mais transparente.
- **Nada é desenhado fora de vista.** A chuva só entra nas cenas de fora e no
  quintal; dentro, o que existe é a água no vidro, e só nos cômodos que têm
  janela.
- **Trabalho por intervalo, não por quadro.** O controlador da chuva roda a
  cada 250 ms — rápido o bastante pra atravessar uma porta sem degrau, barato
  o bastante pra não pesar. Nenhum *raycast* por gota.
- **Um controlador só.** `chuvaComecar()` é idempotente: recarregar cena não
  cria um segundo pulso.
- **Fonte de áudio única**, ligada quando a chuva começa e desligada só quando
  o ganho já chegou perto de zero de verdade — nunca por prazo fixo.
- **Sem vazamento**: os leitos de ambiente ficam fora de `AM.fontes`
  justamente porque `amInvalidar` roda a cada troca de cômodo.

---

## 9. Limitações conhecidas

Ditas com todas as letras, porque valem mais que o contrário:

1. **Não há MP3 de chuva.** O sistema roda em síntese até que
   `audio/chuva.mp3` exista. Toda a cadeia (laço, crossfade, filtro, exposição)
   já está pronta e testada para receber o arquivo — a troca é copiar e
   recarregar.

2. **Respingo por material não foi implementado.** O jogo não tem noção de
   material de superfície; inventar uma só pra isso seria criar um sistema
   inteiro por um detalhe. O respingo é único, no chão.

3. **Poças e reflexos não existem.** O cômodo é arte 2D desenhada por função,
   não uma cena com geometria. Um reflexo plausível exigiria repintar as nove
   cenas.

4. **Sombra projetada não existe.** A luz é gradiente radial sobre arte 2D; não
   há objeto com volume pra projetar sombra. O que existe é queda de luz com a
   distância e a vinheta, que dão a profundidade.

5. **Uma asserção do teste de corte de cômodo é instável** — a troca de cômodo
   cai 4 a 10 ms antes do quadro ler opacidade ≥ 0,99. **Já confirmado que
   falha igual sem nenhuma mudança minha**; é folga de composição do
   navegador, não regressão.

6. **`porta_batida` varia ±3 dB entre execuções**, porque a síntese randomiza o
   tempo das três pancadas de propósito.

7. **A revisão da casa foi de coerência funcional, não de mobiliário.** Não há
   móveis com transform, colisor e escala pra alinhar: cada cômodo é uma função
   que desenha a cena. O que foi revisado: cada um dos nove cômodos tem
   luminária com caráter próprio, exposição à chuva coerente com sua posição na
   planta, e janela só onde a planta justifica.

---

## 10. Testes

O registro completo, com números, está em **`TESTES-v49.md`**.

Resumo: **33 verificações** de chuva e luz, **59** do sistema de itens e baú,
a mixagem em **24 de 25** sons dentro de ±3 dB do alvo, o AudioManager e o
gerador sem falhas, e o *fuzzer* limpo. Nenhum erro de página em nenhuma
execução.
