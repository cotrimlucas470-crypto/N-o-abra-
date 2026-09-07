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
| **2** | rosto: luz de lado, pálpebra, modelagem, cabelo com forma |
| **3** | cômodos: sombra projetada, desgaste, camada de primeiro plano |
| **4** | texturas: madeira com veio, concreto com poro, metal com risco |
| **5** | criaturas: silhueta própria por criatura |
