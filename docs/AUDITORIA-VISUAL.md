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
