# Plano de execução — Exploração + Ferimentos

*Uma etapa por vez. Cada etapa fecha sozinha: entra no jogo, tem teste que
prova, passa na regressão e é entregue. Nada de "meio sistema esperando o
próximo arquivo".*

---

## As oito decisões, resolvidas

Você deixou por minha conta. Ficam assim, e ficam registradas para poder ser
cobradas depois:

| # | conflito | decisão |
|---|---|---|
| **C1** | `S.corpo` ocupado pelo equipamento | **`S.ferimentos`** é o ramo novo. `S.corpo` continua sendo roupa. Ninguém perde a roupa de um save antigo por causa de um nome. |
| **C2** | dois sistemas de ferimento | `S.ferido` vira **fachada derivada** de `MALES`. Os 12 sítios de escrita passam a criar males, um a um, com teste por sítio. |
| **C3** | "zero `Math.random`" | Vale para **código que decide estado** — já garantido pela guarda de build da v66. As ~100 cosméticas de áudio e grão ficam, por política escrita. |
| **C5** | números de verbo na ficha | Viram **linguagem**: "o braço não fecha direito" no lugar de "força −28%". É o que faz o B3 valer. |
| **C6** | `grav` 1..4 × 0..1 | Fica **1..4** no dado, com `gravidade01()` derivada. Nenhum save migra por causa de escala. |
| **S1** | o Magro invertido | **A luz continua protegendo.** A tabela é que se ajusta. A inversão vira evolução de noite alta, usando o gancho do clique do interruptor que a própria tabela escreveu. |
| **S2** | Coro: duas bocas ou três | **Duas.** A dica que o jogador já aprendeu continua verdadeira. |
| **S3** | A4 × matriz de sinais falsos | **Dois escopos.** `inspecionar` é verbo deliberado e pago: **nunca mente**. Sinal ambiental, que chega sem pedir, pode ganhar falso pela matriz. |

---

## As etapas

### Etapa 1 — O passo custa  ← *começa agora*

A falha crítica. Hoje atravessar a casa inteira custa zero em tudo.

**Entra:** as camadas 0–3 na planta; um relógio de minutos que funciona;
`custoDeEntrada()`; e o passo cobrando **tempo, ruído e sanidade** — as três
dimensões que já têm consumidor no jogo.

**Não entra:** luz e exposição. Os consumidores delas (`atencaoDaCasa`,
gasto contínuo de luz) só existem na Etapa 4. Ligar agora criaria dois
parâmetros mortos, que é a regra nº 5 do seu próprio briefing.

**Prova:** andar do núcleo ao porão custa mais que andar dentro do núcleo;
o dia acaba mais cedo se você varrer a casa; o ferido faz mais barulho ao
andar; save antigo migra sem perder nada.

**Destrava:** tudo. Camada e núcleo seguro são a base de pressão, ponto de não
retorno, achado por profundidade e isca.

---

### Etapa 2 — Sinais viram contrato

Os 14 avisos que existem hoje (8 em `AMEACAS.aviso`, 6 em `REGRA.dica`) são
texto solto. Ninguém consegue perguntar *"houve sinal antes disso?"*.

**Entra:** `sinais.js` com `fase`, `canal`, `antecedencia`, `inconsistencia` e
a API `Sinais.emitir / foiEmitido / degradar / inconsistenciaDe`. A matriz de
degradação por sanidade, com as duas travas de justiça (iminência nunca abaixo
de 2 turnos; falso soma, nunca substitui).

**Prova:** `foiEmitido()` chamado antes de qualquer ferimento — retorno falso
**quebra a build**, não avisa.

**Por que antes do corpo:** para nenhum ferimento novo nascer sem poder provar
que foi anunciado.

---

### Etapa 3 — Um corpo só

**Entra:** `S.ferido` vira derivado; `parte` entra no ferimento; os três
parâmetros mortos morrem (`custa.atencao` ganha efeito ou sai, `custa.agua`
idem, `MALES.dente` fica alcançável); `S.trilha` entra no save; os números da
ficha viram linguagem (C5).

**Prova:** teste por sítio convertido; nenhum campo de `custa` sem leitor;
`MALES` 19/19 alcançáveis.

---

### Etapa 4 — Pressão, luz e exposição

**Entra:** `S.exploracao.pressao` com os quatro degraus diegéticos;
`atencaoDaCasa` ligada ao orçamento do §31; o custo de **luz** e **exposição**
do A2, agora com consumidor; o vale obrigatório depois do pico (o §31 já sabe
fazer vale — reuso, não reescrevo).

**Prova:** nenhum pico de pressão sem vale posterior; pressão só decai no
núcleo.

---

### Etapa 5 — O ponto de não retorno

**Entra:** A8. Entrar em camada ≥3 pergunta uma vez, e a volta muda.

**Prova:** voltar do porão é uma sequência diferente de ir até o porão.

---

### Etapa 6 — Achados e conhecimento

**Entra:** `gerarAchado()` com as 8 categorias; `S.conhecimento` com regras
verdadeiras e **uma** falsa por campanha; documentos que mudam regra de
sistema, não só texto. Aqui entra o sal — a regra que a Dona Lurdes já
sussurra há versões.

**Prova:** zero documento que não muda nada; zero achado que resolve 100% de
uma falta.

---

### Etapa 7 — Cicatrizes, e a casa mira nelas

**Entra:** cicatriz permanente com causa e noite; `S.memoriaAnomalias`
priorizando ameaça contra parte já quebrada; as seis evoluções da Tabela de
Sinais, que só agora têm de onde ler.

**Prova:** uma cicatriz da noite 4 ainda importa na noite 19.

---

### Etapa 8 — Tratamento e incapacitado

**Entra:** B5 completo (pano, costura, álcool, tala, descanso, e o NPC que
cuida de você e pode não ser ele mesmo); estado `incapacitado` com watchdog.

**Prova:** pior estado possível sempre tem ação ou desfecho. Zero softlock.

---

### Etapa 9 — Simulação e aceite

10.000 noites, as 11 métricas da Fase 5.1, os 10 testes do 5.2, e a Tabela de
Sinais preenchida como documento final.

---

## Regras que valem para todas as etapas

1. Cada etapa termina **verde na regressão inteira**, não só no teste dela.
2. Cada etapa entra com `schemaVersion` e migração idempotente.
3. Nenhum parâmetro entra sem consumidor **na mesma etapa**. Se o consumidor é
   de uma etapa posterior, o parâmetro espera.
4. Nada é reescrito onde dá para envelopar. `MALES`, `REGRA`, `BICHOS`,
   `AMEACAS`, `talvezIsca` e os vales do §31 já existem e são bons.
5. Se uma etapa descobrir que a decisão de cima estava errada, ela para e
   reporta — não improvisa.
