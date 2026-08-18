# v49 — registro dos testes

Todos executados com Playwright + Chromium headless, num viewport de 390×844
(o alvo do jogo é celular), contra o `index.html` construído. Cada execução
escuta `pageerror`; "erros: (nenhum)" abaixo significa zero exceção em tempo
de execução.

Node 22.22.2 · Playwright/Chromium · `--autoplay-policy=no-user-gesture-required`
(o navegador headless não tem gesto de usuário para liberar o áudio).

---

## Chuva e luz — 33 verificações, 0 falhas

### 1. Um controlador só, uma fonte só
- a chuva está tocando — **ok**
- nenhum leito antigo (`chuva_leve`/`chuva_pesada`) ficou tocando junto — **ok**
- a fonte é única e identificada — **ok**

Estado medido: `{fonte:"sintese", fontes:3, i:0.974, ganho:0.9689}`.
As 3 "fontes" são os nós da síntese (2 de ruído + 1 LFO) alimentando **um**
barramento — não são três cópias do som.

### 2. Entrar e sair de casa 6 vezes (12 transições)
- a **mesma** fonte atravessou as 12 transições — **ok**
  (a fonte é marcada com um id na primeira leitura; o id é idêntico no fim)
- lá fora a exposição é alta — **ok** — `0.9` nas 6 medições
- lá dentro a exposição cai — **ok** — `0.2` nas 6 medições
- o corte do passa-baixas segue o lugar — **ok** — fora **1379 Hz**, dentro **579 Hz**

Este é o teste central: prova que entrar e sair repetidamente **não reinicia,
não duplica e não dessincroniza**, porque a fonte nunca é recriada.

### 3. Crossfade sem buraco na porta
Potência (`√(aberto² + fechado²)`) amostrada 10× durante a travessia:
`0.799 0.796 0.794 0.793 0.792 0.791 0.791 0.791 0.791 0.791`
- não some no meio do caminho — **ok**

Variação total de 1%. Com crossfade linear, o meio do caminho cairia 3 dB.

### 4. Atravessar rápido (quintal ↔ porão, 120 ms entre trocas)
Exposição suavizada: `0.05 0.89 0.05 0.89 ...`
- a suavização segura o salto — **ok** — maior degrau **0.59** (de um alcance de 0,85)

### 5. Porta e tábuas
- entrada fechada **0.43** · de pé na porta **0.77** · com 6 tábuas **0.62**
- porta aberta aumenta a presença da chuva — **ok**
- tábuas na porta abafam mais — **ok**

### 6. Mudar a intensidade não troca de fonte
- chuva fraca `i=0.553 ganho=0.5544` · tempestade `i=0.997 ganho=0.9959`
- a fonte é a mesma nas duas intensidades — **ok**
- a tempestade toca mais alto — **ok**

### 7. Parar a chuva e voltar
- parada: ganho **0.0026** — **ok**
- voltou a tocar: ganho **0.945** — **ok**

### 8. Pausa, retomada e laço longo
- atravessou `visibilitychange` + 5 s de laço sem recriar fonte — **ok**
- continua tocando — **ok**

### 9. Salvar e carregar
- o clima foi restaurado (`tempestade`) — **ok**
- o áudio **não entra de uma vez**: logo após carregar `i=0.216`, subindo — **ok**
- e chega na intensidade certa: `i=0.971` — **ok**

### 10. Nenhum cômodo em breu com a luz acesa (noite, tempestade, gerador ligado)

| cômodo | nível | fontes | luminária |
|---|---|---|---|
| SÓTÃO | 0.725 | gerador+lampiao | lâmpada pendurada na viga |
| QUARTO | 0.805 | gerador+lampiao | abajur na cabeceira |
| DESPENSA | 0.885 | gerador+lampiao | lâmpada da despensa |
| OFICINA | 1.055 | gerador+lampiao | luminária da bancada |
| SALA | 0.955 | gerador+lampiao | lâmpada do teto da sala |
| COZINHA | 1.105 | gerador+lampiao | lâmpada da cozinha |
| PORÃO | 0.765 | gerador+lampiao | lâmpada do porão |
| ENTRADA | 0.825 | gerador+lampiao | luz da entrada |
| QUINTAL | 0.685 | gerador+lampiao | lâmpada do quintal |

- todos os 9 acima do piso de legibilidade — **ok**
- todos com luz elétrica quando o gerador roda — **ok**
- cada cômodo tem luminária própria (9 nomes distintos) — **ok**
- cozinha e oficina mais claras que quarto e sala — **ok**

### 11. Interruptor
- aceso **0.955** → apagado **0.42**
- apagar tira a fonte elétrica — **ok**
- o cômodo continua legível pelo lampião — **ok**
- o interruptor sobrevive a andar pela casa — **ok**
- e é gravado no salvamento — **ok**

### 12. Sem gerador
- nenhuma luminária elétrica acesa — **ok**
- nada em breu mesmo assim (todos em 0.42) — **ok**

### 13. Luz de dia pela janela
- sala **0.545** · porão **0** · quintal **0.873**
- a sala recebe luz de dia — **ok**
- o porão não recebe luz nenhuma pela janela — **ok**
- o quintal recebe mais que a sala — **ok**

---

## Medição de luminância (prova visual da iluminação)

Luminância média do canvas (`0.2126R + 0.7152G + 0.0722B`), noite, gerador
ligado:

| cena | luminância |
|---|---|
| SALA, luz acesa | **38.0** |
| SALA, luz apagada (só lampião) | **15.3** |
| COZINHA, luz acesa (fria/forte) | **38.8** |
| SALA, tempestade, chuva na janela | **38.5** |

Duas vezes e meia mais clara com a luz acesa, e os cantos continuam escuros —
o objetivo era legibilidade **sem** perder profundidade.

Um ajuste intermediário chegou a `rebote:0.30` e a sala ficou legível e
**chapada** (luminância 50,5, sem contraste). Foi revertido para 0,16 com o
facho mais forte, que ilumina com direção em vez de lavar.

---

## Regressão das fases anteriores

| suíte | resultado |
|---|---|
| Qualidade de itens e armazenamento (`qual`) | **59 verificações, 0 falhas**, erros: nenhum |
| Gerador a diesel (`gerteste`) | **0 falhas**, erros: nenhum |
| AudioManager fase 1 (`am`) | **0 falhas**, erros: nenhum |
| Corte entre cômodos (`corte`) | **0 falhas** nesta execução, erros: nenhum |
| Mixagem (`mixtest`) | **24 de 25** sons dentro de ±3 dB · espalhamento 23,1 dB · pico mais alto −4,2 dBFS · erros: nenhum |
| Fuzzer aleatório (semente 21, 140 cliques) | chegou ao dia 1, erros: nenhum |

O espalhamento subiu de 19,8 para 23,1 dB em relação à versão anterior porque
a chuva **passou a tocar de verdade** pelo canal AMBIENCE. O pico mais alto
continua com folga de 4 dB para o teto.

---

## O que não foi testado, e por quê

- **Resoluções e dispositivos variados.** Só foi testado no viewport de
  390×844. O jogo é responsivo por construção (tudo em fração de `w`/`h`), mas
  isso é argumento, não medição.
- **FPS e memória em chuva longa.** Não há instrumentação de quadro no
  projeto. O que dá pra afirmar com base no código: o pool de gotas é fixo, não
  há alocação por quadro, e o controlador roda a cada 250 ms.
- **`audio/chuva.mp3`.** O caminho do arquivo não pôde ser testado com um
  arquivo real porque nenhum foi entregue. O caminho equivalente **está**
  testado em produção pelo gerador, que usa a mesma mecânica de laço em
  segundos e passou os 5 blocos de `gerteste`.
