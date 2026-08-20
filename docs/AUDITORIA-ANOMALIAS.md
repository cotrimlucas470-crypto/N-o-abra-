# FASE 0 — Auditoria do sistema de anomalias

Relatório antes de escrever qualquer linha da camada de governança. Nenhum
código foi alterado nesta fase.

---

## 0. Antes da tabela: **as "33 anomalias" não existem como um conjunto**

Isto precisa ser resolvido antes da Fase 1, porque o schema e o orquestrador
dependem de saber **o que exatamente** vai ser envelopado.

As **6 criaturas** batem exatamente: `BICHOS` (index.html:5220) tem
`magro, rastejante, coro, imitador, inchado, primordial`. ✅

Já **nenhuma tabela do projeto tem 33 entradas.** Contei por casamento de chaves,
não por estimativa:

| tabela | linha | entradas | o que é |
|---|---|---|---|
| `BICHOS` | 5220 | **6** | as criaturas da invasão |
| `ANOMALIAS` | 3647 | **12** | os defeitos do corpo vistos pelo olho mágico (olhos, brilho, piscar, boca, dentes, pescoço, pele, simetria, sombra, mãos, roupa, pés) |
| `AVARIAS` | 5499 | **15** | estragos da casa (calha, infiltração, rachadura, cano, alagado, telhado, goteira, fiação, curto, janela, aberta, cerca, torneira, porta emperrada, bomba) |
| `MALES` | 13545 | **19** | ferimentos e doenças |
| `CRIATURAS` | 8763 | **10** | catálogo de visitantes da porta |
| `DEFEITO_CRIATURA` | 15349 | **16** | tells por tipo de visitante |

**A única leitura que dá exatamente 33 é `ANOMALIAS (12) + AVARIAS (15) + BICHOS
(6)`** — mas isso inclui as 6 criaturas, que o briefing conta separado.

Preciso que você confirme **qual conjunto** a camada deve governar. As três
leituras plausíveis:

- **(A)** `ANOMALIAS` + `AVARIAS` = 27 — os defeitos do corpo e os estragos da
  casa. É o que mais parece "anomalia" no sentido do briefing.
- **(B)** `ANOMALIAS` + `AVARIAS` + `MALES` = 46 — inclui doença como anomalia.
- **(C)** Outra coisa que eu não encontrei.

**Não escolhi por você.** Governar o conjunto errado significaria envelopar
sistemas que não deviam ser envelopados — e o briefing proíbe destruir conteúdo
existente.

O resto do relatório cobre **as três tabelas candidatas** e as 6 criaturas.

---

## 1. Tabela das anomalias

Legenda: **tell** = existe aviso perceptível antes da punição.
**serial** = o estado sobrevive a save/load.

### 1.1 `ANOMALIAS` — os 12 defeitos do corpo (index.html:3647)

| id | gatilho | duração | resolução | tell | serial |
|---|---|---|---|---|---|
| `olhos` `brilho` `piscar` `boca` `dentes` `pescoco` `pele` `simetria` `sombra` `maos` `roupa` `pes` | visitante `mimico` na porta | a visita | olhar pelo olho mágico e recusar | **é o próprio tell** | ⚠️ ver §4 |

**Observação de design:** estas 12 não são "anomalias que acontecem com você" —
são **os avisos**. Elas já são, por construção, o `tell` de outro evento (abrir a
porta pra coisa errada). Enquadrá-las no `AnomaliaSchema` como se fossem eventos
com `tell` próprio seria erro de categoria: elas precisariam de um tell do tell.

### 1.2 `AVARIAS` — os 15 estragos da casa (index.html:5499)

| id | gatilho | duração | resolução | tell | serial |
|---|---|---|---|---|---|
| calha, infiltra, rachadura, cano, alagado, telhado, goteira, fiacao, curto, janela, aberta, cerca, torneira, porta_emperra, bomba | evento noturno / clima / invasão | **permanente até reparar** | `fecharAvaria(id)` por reparo com material | ⚠️ **parcial** — `ver:[...]` descreve o estrago, mas é mostrado **depois** que ele já existe | ✅ `S.avarias` está em `salvar()` |

**Estas são as melhores candidatas ao schema.** Têm id, gatilho, duração,
resolução explícita e persistência. Falta-lhes exatamente o que o briefing pede:
`tell` **antes**, `categoria`, `peso`, `incompativelCom`, `cicatriz`.

### 1.3 `BICHOS` — as 6 criaturas (index.html:5220)

| id | peso | vel | mem | fôlego | regra própria (§26) | tell | serial |
|---|---|---|---|---|---|---|---|
| magro | 30 | 1 | 2 | 0 | luz — não entra em cômodo aceso | ✅ | ❌ |
| rastejante | 22 | .6 | 4 | 0 | rastro — segue por onde você pisou | ✅ | ❌ |
| coro | 14 | 1 | 2 | 0 | som — **regra sem efeito, ver §2** | ✅ | ❌ |
| imitador | 20 | 1 | 3 | 0 | resposta — andar após o chamado entrega você | ✅ | ❌ |
| inchado | 11 | .7 | 2 | 1 | passagem — perde turno em vão apertado | ✅ | ❌ |
| primordial | 3 | 1.2 | 6 | 2 | olhar — olhar o aproxima | ✅ | ❌ |

Os tells foram acrescentados na v53 e são obrigatórios ali: um turno antes do
contato, texto próprio por criatura. **Isso já cumpre a regra dura do briefing.**

---

## 2. Parâmetros mortos

O briefing pediu foco no **Coro** e no **Magro**. O foco estava certo: é
exatamente onde estão os dois piores casos, e **os dois são meus, da v53**.

| parâmetro | onde é escrito | onde é lido | veredito |
|---|---|---|---|
| **`I.divididas`** (Coro) | `s26:149` (`anomIniciar`), `s26:364` (`bloquear`) | **em lugar nenhum** | ☠️ **MORTO.** `ANOM_CFG.coroDivideTurnos` não tem efeito observável. Pior: o jogo **escreve na tela** *"o estrondo pega as duas metades em cômodos diferentes. Elas se desencontram."* — e **nada se desencontra**. É mentira ao jogador, que é o pecado exato da Regra de Ouro |
| **`I.recuo`** (Magro) | `s26:146`, `s26:391` (`usarLanterna`) | **em lugar nenhum** | ☠️ **MORTO.** `ANOM_CFG.magroRecuaTurnos` não tem efeito. O Magro *é* afastado, mas por `I.fase='PERDEU'` na linha de baixo — o parâmetro não dirige nada |
| **`BICHOS.raro`** (primordial) | declarado em `index.html:5225` | os dois `.raro` que existem (8841, 8851) são de `CRIATURAS`, outra tabela | ☠️ **MORTO.** `sortearBicho` decide o primordial por `b.id==='primordial'` cravado no código |
| **`BICHOS.mem` / `I.memoria`** | escrito em 16702-16717, decrementado em 16755 | **meu `moverMonstro` do §26 ignora**; sobra **um** uso: `chanceEsconder` em 16771 | ⚠️ **MEIO-MORTO.** `mem` existia pra dirigir a perseguição; hoje dirige só 14% de chance de esconder. O rastejante tem `mem:4` contra `mem:2` do magro e isso **quase não significa mais nada** |
| **chamado do imitador** | `index.html:16797` (original) **e** `s26:295` (meu) | ambos executam | 🐛 **DUPLICADO.** Dois chamados podem sair no mesmo turno, um sem marcar `chamouEm` e outro marcando |

---

## 3. Todos os pontos de `Math.random()`

**266 chamadas.** Não é uma limpeza pontual: é uma reescrita transversal.

| arquivo | chamadas |
|---|---|
| `index.html` | **224** |
| `v48-som-e-sanidade.js` | 19 |
| `s17-chuva.js` | 7 |
| `audio-manager.js` | 6 |
| `s24-fuga.js` | 3 |
| `s14-mochilas.js` | 1 |
| `s20-armas.js` | 1 |
| `s27-porta.js` | 1 |
| `s9-percepcao.js` | 1 |

**Uma distinção que precisa entrar na decisão:** boa parte dessas chamadas é
**cosmética, não de jogo** — jitter de áudio, posição de grão na tela, oscilação
de sombra, variação de partícula. Semear essas não muda nada que o jogador possa
explicar, e engessa o `replay` a reproduzir ruído visual.

Proposta: **RNG semeado obrigatório para tudo que altera estado ou decisão**
(`index.html`, `s14`, `s20`, `s24`, `s9` = 230 chamadas), e `Math.random()`
permitido **apenas** em áudio e desenho puro (`v48` áudio, `s17` chuva,
`audio-manager`, `s27` oscilação = 33 chamadas), com uma trava de build que
proíbe `Math.random()` fora dessa lista. Se você quiser 100% semeado, faço — mas
quero que a escolha seja sua, porque a segunda opção é ~7× mais barata e cobre
tudo que é auditável.

---

## 4. Estado que NÃO sobrevive a save/load

### 4.1 O achado grave: **a invasão inteira é local**

O objeto `I` — que carrega `fase`, `faseTurnos`, `ruidoEm`, `trilha`, `bicho`,
`folego`, `bloqueio`, `acompanha`, `escondidos`, `avisou`, `cooldown` — é uma
**variável local** de `invasao()`, passada de função em função. `grep "S.I="`
não devolve nada.

**Consequência:** fechar o app no meio de uma invasão e reabrir perde a invasão
inteira. O jogador volta pra casa sem monstro e sem noite. Isso viola diretamente
a proibição nº 4 do briefing pelo avesso: o estado não é dado puro **porque não
é estado nenhum** — é escopo de função.

### 4.2 Campos que existem mas não são salvos

| campo | salvo? | usos |
|---|---|---|
| `S.marcasCasa` | ✅ (v53, `s26`) | 4 |
| `S.vistosMonstro` | ❌ **não está em `salvar()`** | 5 |
| `S.anomAtivas` | ✅ | 2 |
| `S.anomalos` | ✅ | 3 |
| `S.memAnom` | ✅ | 3 |
| `S.dentroCasa` | ✅ | 9 |

`S.vistosMonstro` marca em que locais do mapa você já viu criatura — o mapa
desenha isso circulado. **Recarregar apaga os círculos.**

---

## 5. Riscos de softlock

O jogo tem um vigia global (`socorro()`, index.html:14853) que dispara depois de
14 s sem ação na tela. Ele **cobre** o softlock, mas por fora e por sorte — é
rede, não construção, exatamente como o briefing critica.

| risco | onde | estado |
|---|---|---|
| invasão sem saída | `turnoJogador` sempre oferece mover/esconder/escutar | ✅ baixo |
| `moverMonstro` sem opções | `if(!opts.length)return pos` | ✅ tratado |
| Magro cercado de luz | `s26:229` — se todos os vizinhos estão acesos, ele fica parado **indefinidamente** | ⚠️ **real**: não trava a tela, mas trava a criatura. Com a casa toda acesa o Magro nunca chega. É exploit, não softlock |
| fase presa | teto de turnos em `CACA`, `cooldown` em `RONDA` | ✅ coberto e testado (2000 turnos × 6 criaturas) |
| avaria sem material | `AVARIAS` exige material que pode não existir | ⚠️ **real**: uma avaria pode ficar aberta pra sempre se o material nunca aparecer. Não trava a tela, mas nunca resolve |
| promessa não resolvida | `index.html:19681` tem vigia próprio de 900 ms | ✅ tratado |

---

## 6. O que eu preciso que você decida antes da Fase 1

1. **Qual é o conjunto das "33"?** (§0) Sem isso não sei o que envelopar.
2. **RNG: 100% semeado ou só o que decide jogo?** (§3) Recomendo o segundo, com
   trava de build.
3. **As 12 de `ANOMALIAS` entram no schema?** Elas já *são* tells de outro
   evento; enquadrá-las como anomalias com tell próprio é erro de categoria.
4. **A invasão vira estado serializável?** (§4.1) É a maior mudança estrutural do
   projeto todo e mexe em `invasao`, `turnoJogador`, `turnoMonstro`, `mover`,
   `esconder`, `bloquear`, `escutar` e no §26 inteiro. É a coisa certa a fazer, e
   é grande — quero seu aval explícito.

---

## 7. Uma coisa do briefing que não se aplica como está escrita

> *"NÃO use `Math.random()` em nenhum lugar do sistema de anomalias."*

Concordo pro que decide jogo. Mas o `s27-porta.js` usa `Math.random()` para o
**tremor da sombra debaixo da porta** — ruído visual de um quadro, que não altera
estado nenhum e não é observável como decisão. Semear isso faria o `replay`
reproduzir pixel a pixel um chiado que ninguém consegue explicar nem contestar,
ao custo de passar o RNG por dentro do laço de desenho.

Vou tratar como cosmético a menos que você mande o contrário — e a trava de build
vai deixar explícito, por arquivo, o que é permitido.

---

**Parado aqui, conforme pedido.** Nenhuma linha do jogo foi alterada. Aguardo sua
confirmação sobre os quatro pontos do §6.
