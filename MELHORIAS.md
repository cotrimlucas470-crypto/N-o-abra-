# Auditoria de sistemas — "A Anomalia"

Varredura completa do repositório, medição com simulador headless, diagnóstico
priorizado e correção dos achados de maior impacto por custo.

Ferramentas escritas para esta auditoria, ambas versionadas:

- `tools/mapear.mjs` — varredura estática: declara por bloco, conta referências
  cruzadas, aponta o que nunca é chamado.
- `tools/sim.mjs` — simulador headless. Carrega o jogo uma vez no Chromium e
  roda N runs de D dias chamando **a camada de decisão real** (as tabelas, os
  filtros e os pesos do próprio jogo), sem UI e sem pausa. Semente fixa.
  `node tools/sim.mjs 500 30 20260815 tools/frequencia-antes.json`

---

## 1. Inventário de sistemas

O jogo é um `index.html` só, com blocos injetados pelo `montar.js` na ordem em
que precisam embrulhar uns aos outros. 948 declarações no total.

| bloco | declarações | o que é | testes |
|---|---|---|---|
| base | 833 | jogo inteiro: porta, rádio, abrigo, expedição, casas, crafting, saqueadores, epílogo, save | via aceitação no navegador |
| v48 | 53 | motor de áudio e a sanidade mentindo no ouvido | medição de mix + aceitação |
| s14 | 22 | mochilas: sobrecarga, módulos, acesso rápido, descarte em fuga | 21 no core TS |
| cine | 13 | abertura narrada, presa às marcas de tempo do mp3 | 6 no navegador |
| corte | 7 | corte de 0,98 s entre cômodos, preso aos passos da gravação | 9 no navegador |
| s9 | 20 | V9: quatro medidores, filtro de percepção, remédios, rastro, sequelas | 35 no core TS + 19 no navegador |

Subsistemas e quem os aciona:

| subsistema | entrada principal | lê | escreve |
|---|---|---|---|
| sanidade / percepção | `cenaDia` → `passarSanidade`, `talvezIlusao` | `S.sanidade`, `S.realDebt`, `S.v9` | estágio, ilusões, dívida |
| anomalias na porta | `anoitecer` → `cenaPorta` | `ANOM`, `CRIATURAS`, `S.dia` | mortes, vozes roubadas |
| rastro / detecção | `anoitecer` → `v9Calor` | ruído, sangue, lanterna, ferro | `S.calor` → `riscoInvasao` |
| porta | `passarPorta`, `menuPortaManut` | `S.porta` | resistência, ruído |
| rádio | `cenaDia` → `radioFala`, `boletimRadio` | `BOLETIM`, hotspots | pistas, mentiras |
| inventário / carga | `s14` | `MOCHILAS`, módulos | peso, volume, ruído |
| armas brancas | `melhorArma`, contato | `S.armas` | atraso na fuga |
| eventos de caminho | `cenaDia` → `eventoDoDia` | `EVT` (44) | recursos, moral |
| abrigo | `menuMoradoras`, `verAbrigo` | `S.abrigo` | moral, mortes |
| crafting | `RECEITAS`, `FABRICO` | materiais | itens, módulos |
| epílogo / morte | `invasao`, `ruptura` | tudo | fim de run |
| save | `salvarAgora`, `carregar` | `S` | localStorage |

---

## 2. Relatório de frequência (antes)

500 runs × 30 dias = 15 000 dias-jogo, semente 20260815.
Relatório completo em `tools/frequencia-antes.json`.

**Tempo em cada estágio de sanidade** (por run, 30 dias):

| estágio | dias/run |
|---|---|
| tenso | 5,89 |
| fissurado | 4,89 |
| rachado | 2,77 |
| lúcido | 0,86 |
| desfeito | 0,25 |
| **em ruptura** | **0,00 — nunca alcançado** |

**Conteúdo por run:** 44 eventos de dia (todos aparecem), 8 noturnos (todos
aparecem), 30 anomalias na porta com distribuição de 0,22 a 0,97 por run,
9 ilusões sonoras de 0,15 a 0,35, 6 ilusões de texto.

**Uma correção de método vale registro.** A primeira rodada do simulador
acusou 2 dos 8 `NOTURNOS` como conteúdo morto. Não eram: `porao` exige
`S.cachorro.vivo` e `vulto` exige `S.abrigo.length > 0`, e meu estado
simulado tinha a casa vazia e nenhum cachorro. O simulador media a ausência
da minha própria simulação. Corrigido o estado, os 8 aparecem. Achado
descartado antes de virar conserto.

---

## 3. Achados priorizados

| ID | Arquivo:linha | Categoria | Evidência | Impacto no jogador | Custo | Risco |
|---|---|---|---|---|---|---|
| **A01** | `anomalia/core/**` | órfão | 0 bytes carregados pelo jogo; única menção é um comentário | nenhum direto — mas é onde vivem 171 testes | — | — |
| **A02** | `s9-percepcao.js` | morto + silencioso | `checarRealidade()` declarada, 0 referências | a Checagem de Realidade, pilar do V9, não existia para o jogador | baixo | baixo |
| **A04** | `s9-percepcao.js` | regra quebrada | lia `S.ilusaoNoAr`, escrita em lugar nenhum do repositório | mesmo se chamada, responderia sempre igual: certeza de graça | baixo | baixo |
| A03 | `index.html:17953` | raro | ilusão do quintal a 0,026/run vs 0,27–0,70 das irmãs | uma das 6 ilusões é praticamente invisível | médio | médio |
| A05 | `index.html` | sempre igual | estágio `em ruptura` nunca alcançado em 15 000 dias | o último estágio da tabela é decorativo | médio | alto |
| A06 | `index.html` | morto | 16 declarações sem referência (ver `tools/mapa.json`) | nenhum — inclui ferramentas de console documentadas | baixo | baixo |
| A07 | vários | número mágico | limiares espalhados sem constante nomeada | nenhum direto | alto | alto |

Ordenado por impacto ÷ custo, **A02 e A04 são o mesmo conserto** e ficaram em
primeiro: é o único achado em que um pilar declarado do design não existia no
jogo jogável.

---

## 4. O que foi corrigido

### A02 + A04 — a Checagem de Realidade passou a existir

`checarRealidade()` estava escrita, testada no núcleo e **nunca chamada**. Pior:
lia `S.ilusaoNoAr`, uma variável que nada no repositório inteiro escrevia — se
alguém a chamasse, ela responderia sempre a mesma coisa.

A pergunta agora tem verdade de verdade por baixo: *a tela está te enganando
neste momento?* A resposta certa é `estagio().uiLie > 0`, que é exatamente o
que o jogador não pode ver.

- Botão em "Conferir o que é real": **1 hora do dia + 4 de estresse**, e erra
  1 em cada 5.
- **Uma vez por dia.** Poder repetir até gostar da resposta transformaria 80%
  de acerto em certeza de graça — que é o que a regra proíbe.
- Acertar abate 3 de dívida de realidade; errar não avisa que errou.

Medido no jogo: 78,2% de acerto em 4 000 chamadas, gasta 1 hora, escudo 30→26,
paranoia 0→1,6, e o segundo clique no mesmo dia não gasta nada.

---

## 5. Frequência (depois) e comparativo

Mesma semente, mesmas 15 000 dias-jogo. Nenhuma categoria mudou de contagem —
o conserto adiciona uma escolha ao jogador sem deslocar nenhuma distribuição
de conteúdo, que era o resultado desejado.

**Ainda abaixo de 2% por run**, todos por desenho (faixa `unico` e
`muitoraro`, com trava de dia mínimo):

| evento | por run |
|---|---|
| Às quatro da manhã todo som do mundo parou | 0,006 |
| Às três da manhã, todas as casas transmitiram a mesma frase | 0,008 |
| Alguém enfiou um papel por baixo da porta | 0,010 |
| Um caminhão do exército parou na esquina | 0,012 |
| Um helicóptero passou baixo, duas vezes | 0,016 |

Estes cinco são a faixa `unico`/`muitoraro`, que existe para ser rara. Não
mexi: são 24 aparições de `unico` em 500 runs, e o valor deles é justamente
não caberem numa run típica.

Suíte completa: **171 testes do núcleo**, 5 de áudio, 9 de travamento,
19 do V9, 4 da checagem — todos passando.

---

## 6. Decisões pendentes

1. **A01 — o núcleo TypeScript.** 28 arquivos e 171 testes que o jogo nunca
   carrega. Não é zumbi: é a implementação de referência onde as regras são
   verificáveis, e os blocos do jogo são a tradução dela. Mas hoje o V9 existe
   duas vezes — `core/v9/` e `s9-percepcao.js` — e nada garante que continuem
   iguais. **Pedido de decisão:** manter como referência testada (e aceitar a
   duplicação), ou gerar o bloco a partir do core na montagem?
2. **A05 — `em ruptura` nunca acontece.** O estágio existe na tabela do V9 que
   você passou, com ilusão 1.00 e mentira 0.90, e exige leitura efetiva abaixo
   de 1. Em 15 000 dias não aconteceu uma vez. Alcançá-lo pede mexer no balanço
   de perda de sanidade — mudança de dificuldade, não de código. Sua chamada.
3. **A03 — a ilusão do quintal a 2,6%.** Baixar o `min` dela a aproximaria das
   irmãs, mas muda a curva de quando cada ilusão entra.
4. **A07 — números mágicos.** A missão pede `/config/balance.ts`. O jogo é um
   HTML de 2 MB em JS puro: um `.ts` não carregaria, e extrair os limiares
   espalhados por 833 declarações tem risco de regressão alto para ganho
   nenhum de jogo. Proponho extrair só por sistema, quando um sistema for
   mexido — foi o que fiz com `CHECAGEM`.
5. **A fórmula de contato do V9** (relatada na entrega anterior): qualquer
   lâmina de `delaySec ≥ 2` torna a morte impossível. Está fixado em teste.
