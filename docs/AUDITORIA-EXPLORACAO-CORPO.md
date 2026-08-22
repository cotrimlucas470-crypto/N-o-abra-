# Fase 0 — Auditoria: Exploração e Ferimentos

*Medido no jogo rodando, não lido e estimado. Nenhuma linha dos dois módulos foi
escrita. Conforme a instrução final do briefing, os conflitos com o código
existente estão na §7 com duas saídas cada, aguardando decisão.*

---

## Resumo em uma frase

> **A exploração é grátis e o corpo já existe — dividido em dois sistemas que
> não se conhecem.**

Andar pela casa inteira custa **exatamente zero** em tudo. E o Módulo B não é
terreno virgem: há um sistema de ferimentos nomeados (`MALES`, 19 entradas, com
custo por verbo, agravamento e tratamento) rodando **em paralelo** com um
contador único (`S.ferido`) que faz a mesma coisa pior.

---

## 1. EXPLORAÇÃO

### 1.1 O grafo

| | |
|---|---|
| nós | **9** |
| arestas | **12** |
| diâmetro | **4** |
| trancados/condicionais | **0** |

Grade 3×3 com adjacência de Manhattan. Campos de um cômodo:
`id · nome · gx · gy · esconde · porta · saida`.

```
SÓTÃO(2)   QUARTO(3)   DESPENSA(2)
OFICINA(3)  SALA(4)    COZINHA(3)
PORÃO(2)   ENTRADA(3)  QUINTAL(2)
```

A SALA é o miolo — nada fica a mais de 2 cômodos dela. `esconde:true` em 5
cômodos, `porta:true` na ENTRADA, `saida:true` no QUINTAL. **Nenhum cômodo é
trancado ou condicional.**

### 1.2 O custo de movimento — **falha crítica confirmada**

O briefing pede: *"O que hoje impede o jogador de varrer a casa inteira todo
turno? (Se nada: registre como falha crítica.)"*

Medido, atravessando 10 cômodos (a casa inteira e a volta):

```
              antes    depois    delta
hora            7        7         0
minutos         0        0         0
ruído           0        0         0
sanidade      100      100         0
diesel        100      100         0
```

**Zero em todas as cinco dimensões.** `irPara(id)` move o jogador, redesenha o
cômodo e lista quem está lá. Não chama `gastarHoras`, não chama `gastarRuido`,
não toca `S.minutos`, `mexerSan` nem bateria.

> **Registro formal: falha crítica.** Nada impede varrer a casa inteira todo
> turno. Os cinco custos do A2 não existem — nem um deles.

O custo do jogo mora em outro lugar: `acaoDia(horas, fn)` cobra horas por
**ação** e recusa se `S.hora+horas>19`. Ou seja, o jogo já tem economia de
tempo — ela só não sabe que andar é uma coisa.

### 1.3 Profundidade — não existe

Nenhum campo de cômodo se parece com camada, zona, nível ou risco. A planta é
plana. Existe `riscoDaArea()` — mas ela é dos **locais de rua** (expedição), não
dos cômodos da casa.

**A camada 4 do briefing ("Fora") já existe como sistema separado**: a expedição
(`s23-expedicao.js`, `S.exped`, `locaisDeHoje`, `etapaDentro`) tem locais com
`risco`, `riqueza`, afinidade de recurso e trilha. As camadas 0–3 é que não
existem.

### 1.4 Loot — melhor do que o briefing supõe

O A5 exige geração determinística e proíbe loot aleatório puro. Medido nas cinco
fontes existentes:

| fonte | `Math.random` | `_ale()` semeado | lê saqueado | lê escassez |
|---|---|---|---|---|
| `vasculharCasa` | não | **sim** | **sim** | não |
| `itensDoLocal` | não | **sim** | não | não |
| `etapaDentro` | não | **sim** | não | **sim** |
| `locaisDeHoje` | não | **sim** | não | não |
| `lootDoLocal` | não | delega | não | não |

**Nenhuma usa `Math.random`** — isso foi corrigido na v66. `vasculharCasa` já lê
`com.vasculhado` (a regra do saque) e `etapaDentro` já lê escassez.

O que falta do A5: `gerarAchado()` não existe; não há as 8 categorias (achado
hoje é recurso ou material); não há `Achado` como objeto com função de design.
**Documentos, atalhos, locais secretos e histórias não existem como categoria.**

### 1.5 O que já existe e serve de base

- **`S.trilha`** — por onde o jogador passou na expedição. É o precursor do
  `rastroSangue`. ⚠️ **não vai pro save.**
- **`I.trilha`** — a trilha dentro da invasão, e o `rastejante` já a segue.
- **`S.vistos`, `com.vasculhado`** — memória de lugar visitado/saqueado.
- **`S.memoriaAnomalias`** — o aprendizado da casa. *(O briefing chama
  `S.casaMemoria`; esse nome não existe.)*

---

## 2. FERIMENTOS

### 2.1 Já existe um sistema de ferimentos, e é bom

`MALES` — **19 entradas**, 9 feridas + 10 doenças. Campos:

```
n · tipo · grav(1–4) · dias · faz · custa · trata · pior · vem · urgente · pega · mata
```

Exemplo real:

```js
cortefundo:{ n:'corte fundo', tipo:'ferida', grav:3, dias:8,
  faz:'Não para de sangrar sozinho. Precisa fechar.',
  custa:{forca:.28, horas:1},
  trata:['linha','gaze'], pior:'infeccao', urgente:true,
  vem:'coisa cortando com força' }
```

Mapeando contra o schema do B2:

| campo do briefing | o que já existe | situação |
|---|---|---|
| `tipo` | a própria chave (`corte`, `fratura`, `torcao`, `queimadura`, `mordida`…) | **existe** |
| `gravidade` 0..1 | `grav` 1..4 | existe, escala diferente |
| `causa` | `porque` na instância + `vem` na tabela | **existe e é rastreável** |
| `infeccao` | `pior:'infeccao'` — o mal agrava para outro mal | **existe como progressão** |
| `tratado` | `tratado` na instância + `trata:[...]` | **existe** |
| **verbo perdido** | **`custa:{forca, fuga, horas, atencao, ruido, moral, agua}`** | **existe como multiplicador** |
| `parte` | — | **não existe** |
| `sangrando` / `dor` | — | não existe como relógio separado |
| `cicatriz` | — | não existe |
| esquerda/direita | `REGIOES=['cabeca','torso','bracos','pernas','pes']` (plural) | existe sem lateralidade |

Uma instância de mal é `{id, dias, tratado, porque}` — dado puro, sem função,
sem referência. Vai pro save via `S.males` e funciona.

`custoSaude(alvo)` soma os `custa` de todos os males com travas em
`.65 / .60 / .55` e `horas ≤ 3`. Serve para o jogador **e para os NPCs** — o
`alvo` é uma pessoa, não uma parte do corpo.

### 2.2 O defeito real: dois sistemas de ferimento coexistindo

`S.ferido` é um **inteiro único** — o "HP" que o briefing manda remover — e ele
roda em paralelo com `MALES`. Em 12 sítios o código faz
`S.ferido=(S.ferido||0)+n`, e em alguns deles **também** chama `ferirPor()`, que
cria um mal. A mesma pancada é contada duas vezes, em dois lugares, com duas
curas diferentes (`sararUmPouco` decrementa `S.ferido`; `passarSaude` conta
`dias` dos males).

`pesoFerido()` chegou a ser definido duas vezes: a primeira lê `S.ferido`, a
segunda (que vence) lê `custoSaude()`. O nome sobreviveu, a fonte mudou.

### 2.3 Fontes de dano existentes

| fonte | o que causa |
|---|---|
| `ferirPor('bicho')` | mordida, corte, corte fundo, pancada |
| `ferirPor('queda')` | torção, fratura, pancada, corte |
| `ferirPor('fogo')` | queimadura |
| `ferirPor('gente')` | corte, pancada, corte fundo |
| `ferirPor('mato')` | arranhão, bolha, piolho |
| `ferirPor('obra')` | corte, pancada, queimadura, fratura |
| `adoecerPor(...)` | 6 fontes → barriga, febre, desidratação, tosse, gripe, infecção, piolho, insônia, fome |
| direto em `S.ferido` | encontro de rua, saque, cerco, fuga, invasão |
| `mata:true` | **infecção** e **desidratação** matam |
| `pega:true` | febre, barriga, tosse, piolho, gripe **contagiam a casa** |

### 2.4 Parâmetros mortos encontrados

**`custa.atencao` — declarado, travado, mostrado, nunca aplicado.**
Quatro males cobram `atencao` (pancada .25, desidratação .30, dente .15, insônia
.35). A única coisa que o código faz com ela:

```js
c.atencao = trava(c.atencao, 0, .55);              // trava
if(c.atencao) l.push('atenção −'+...+'%');          // escreve na ficha
```

**Nenhuma regra de jogo lê.** O jogador lê "atenção −35%" na própria ficha e o
número não faz nada. É a família do `costura` da v66: promessa impressa na tela
com zero linhas atrás.

**`custa.agua` — sem leitor.** Só `barriga` cobra. Os `c.agua` que aparecem no
arquivo são dos canteiros da horta, outro `c`.

**`MALES.dente` — inalcançável.** Não está em nenhuma das tabelas de
`ferirPor`/`adoecerPor` nem em nenhuma chamada direta de `pegarMal`. Dos 19
males, **18 são alcançáveis e 1 não é.** É a família do estágio `tenso`.

**`S.trilha` não vai pro save.** O rastro do jogador — a base do `rastroSangue`
que o briefing pede — some ao recarregar.

### 2.5 Softlock — não há, e por construção

Forçando o pior caso possível (**todos os 19 males ao mesmo tempo**,
`S.ferido=99`, `doenteJog=9`):

```
forca  −0.65  →  sobra 35%
fuga   −0.60  →  sobra 40%
horas  −3     →  o dia encurta, não some
anda?  sim
```

As travas de `custoSaude` garantem que nenhuma ação chega a zero. **Nenhum
estado do corpo impede o jogador de agir.** Isso já satisfaz o B7 pela metade —
o que falta é o estado `incapacitado` e o watchdog, que não existem.

---

## 3. TELLS — o que já existe

| | total | com sinal |
|---|---|---|
| **Ameaças de rua** (`AMEACAS`) | 8 | **8 com `aviso`**, 4 com `som` |
| **Criaturas da casa** (`BICHOS`) | 6 | **6 com `ap`, 6 com `fraco`, 6 com `REGRA.dica`** |

E as seis têm **sentido declarado** — a que cada uma reage:

```
magro       → luz         rastejante → rastro
coro        → som         imitador   → resposta
inchado     → passagem    primordial → olhar
```

Com `REGRA[id].alvo(I,c)` já implementado: o rastejante segue a trilha, o coro e
o magro vão pro ruído.

**O que falta para a Tabela de Sinais do briefing:** não há `antecedenciaBase`
em turnos, não há `fase` (aproximação/iminência/contato), não há `canal`
declarado como dado, e não há regra de degradação por sanidade. Os avisos
existem como **texto solto**, não como contrato consultável.

> Ou seja: o entregável nº 9 tem 14 fontes de dano já com sinal escrito à mão, e
> nenhuma delas expõe o sinal como estrutura que outro módulo possa consultar
> antes de causar dano. A asserção "tell antes de dano" do 5.2.5 **não é
> verificável hoje**.

---

## 4. CUSTO POR TURNO — medido

500 turnos, dois males ativos, `performance.now()` embrulhando cada função:

```
total ............. 42,2 ms / 500 turnos
POR TURNO ......... 0,084 ms
```

| função | chamadas | ms |
|---|---:|---:|
| `pesoFerido` | 500 | 35,2 |
| `custoSaude` | 1000 | 2,0 |
| `saude` | 1500 | 0,6 |

`pesoFerido` domina porque foi redefinida para chamar `custoSaude` por dentro —
é aninhamento, não algoritmo.

**Orçamento:** um quadro de 60 fps são 16,6 ms, e o jogo é por turno, não por
quadro. Os sistemas que os dois módulos vão tocar gastam **0,5% de um quadro**.
Proponho o teto da Fase 5.10 em **2 ms por turno** — 24× o custo atual e ainda
12% de um quadro.

---

## 5. MIGRAÇÃO DE SAVE

O save tem **116 chaves**. Já lá dentro: `males`, `med`, `ferido`, `doenteJog`,
`corpo`, `exped`, `vistos`.

**Precisa migrar:**

| ramo novo | situação | plano |
|---|---|---|
| `S.exploracao` | nome livre | criar com todos os cômodos `visitado:true`, `saqueado:false`, pressão 0 |
| `S.conhecimento` | nome livre | derivar dos documentos já lidos no caderno |
| **`S.corpo`** | **OCUPADO** | ver conflito C1 |
| `S.trilha` | existe, **não é salvo** | entrar no save |
| `S.ferido` → ferimento | legado | virar **um** ferimento em `torso`, `causa:'legado'` |

`schemaVersion` não existe em nenhum ramo atual. Vai entrar nos novos.

---

## 6. INVENTÁRIO DO QUE O BRIEFING PEDE E JÁ EXISTE

Levantado para cumprir a proibição nº 1 (envelopar, não reescrever):

| briefing | já existe? |
|---|---|
| A1 camadas 0–3 | **não** |
| A1 camada 4 (Fora) | **sim** — a expedição inteira |
| A2 custo tempo | existe por ação (`acaoDia`), **não por movimento** |
| A2 custo ruído | `gastarRuido` existe, **não ligado ao movimento** |
| A2 custo luz | bateria/lanterna existem |
| A2 custo sanidade | §38 completo |
| A2 exposição | `S.orquestrador` existe; `atencaoDaCasa` não |
| A3 pressão | **não** |
| A3 vale obrigatório | **sim** — `ORQ_CFG.valesPorNoite` já faz isso |
| A4 inspecionar da porta | **sim, parcial** — `escutarPorta` faz isso na porta da frente, com camadas e defeitos |
| A5 achados | recursos e materiais sim; as outras 6 categorias não |
| A6 documentos como regra | **não** — não há `S.conhecimento` |
| A7 iscas | **sim** — `talvezIsca` do §32, com teto `hostilidadeTeto` |
| A8 ponto de não retorno | **não** |
| B1 partes do corpo | `REGIOES` existe (5, sem lado) |
| B2 schema | 60% em `MALES` |
| B3 verbo perdido | **sim** — `custa`, com 2 chaves mortas |
| B4 três relógios | só um (`dias`) |
| B5 tratamento com preço | **sim, parcial** — `trata:[...]` e `MEDIC` |
| B5 cuidado por NPC | **sim** — `quem('enfermagem')` trata; e `S.infiltrado` já é o risco |
| B6 cicatrizes | **não** |
| B7 incapacitado + watchdog | **não** (mas não há softlock hoje) |

---

## 7. CONFLITOS — não improvisei, são decisões suas

### C1 · `S.corpo` já está ocupado

O briefing define `S.corpo = {partes, ferimentos, cicatrizes, dorTotal, ...}`.
Mas `S.corpo` **já existe** e é o mapa de equipamento do `s21-corpo.js`
(`{tronco:'casaco', cabeca:null, ...}`), com a função `corpo()` que o saneia e a
tela `telaCorpo()`. Colidir aqui apaga a roupa e a armadura de todo save
existente — é a família do bug `ficha()` que já derrubou 20 listas do jogo.

**Saída A** — o ferimento vira `S.ferimentos` (ramo novo, nome livre), e
`S.corpo` continua sendo equipamento. Zero risco em save antigo, mas o nome
diverge do documento.
**Saída B** — renomear o equipamento para `S.vestimenta` com migração, e
`S.corpo` passa a ser o corpo. Fica fiel ao documento, ao custo de tocar
`s21-corpo.js` inteiro e migrar todo save existente.

**Recomendo A.** O nome no documento vale menos que a roupa de quem já joga.

### C2 · "Remova qualquer noção de HP único" — há duas

`S.ferido` (inteiro) **e** `MALES` fazem a mesma coisa em paralelo, com curas
independentes.

**Saída A** — `S.ferido` vira função derivada de `MALES` (fachada de leitura),
os 12 sítios de escrita passam a criar males. Nada quebra, o número some da
verdade e vira consequência.
**Saída B** — arrancar `S.ferido` dos 12 sítios de uma vez. Mais limpo, mais
risco, e alguns sítios estão em caminhos raros (cerco, saque) mal cobertos por
teste.

**Recomendo A**, com os 12 sítios convertidos um a um e teste por sítio.

### C3 · "Zero `Math.random()`" — restam ~100, todas cosméticas

Depois da v66 as 612 decisões passam pelo RNG semeado. Sobram ~100 chamadas em
síntese de áudio, grão de tela e oscilação de sombra — **por política escrita**
em `s30-nucleo.js`, porque semear ruído visual passaria o RNG por dentro do laço
de desenho e faria a sequência do jogo depender de o som ter inicializado.

**Saída A** — o critério de aceite passa a ser "zero `Math.random` em código que
decide estado", verificado pela guarda de build que já existe.
**Saída B** — semear tudo, inclusive áudio e canvas.

**Recomendo A.** B tem custo real e nenhum ganho observável pelo jogador.

### C4 · `S.casaMemoria` não existe

O nome real é **`S.memoriaAnomalias`** (`s32-memoria.js`), com `talvezIsca`,
`pesoDaMemoria` e `hostilidadeTeto` já implementados. Uso o nome real, e não
crio um apelido — dois nomes para a mesma coisa num escopo global de 1447 nomes
é como uma delas some em silêncio.

### C5 · "Em nenhum momento o jogo mostra um número de vida"

Hoje a ficha mostra **`força −28%`, `fuga −30%`, `atenção −35%`**. Não é uma
barra de HP, mas é número de estado do corpo na tela.

**Saída A** — trocar por linguagem qualitativa ("o braço não fecha direito").
**Saída B** — manter; o critério fala de *barra de vida*, e porcentagem de verbo
é outra coisa.

Preciso da sua leitura. **Inclino para A**, porque é o que faz o B3 valer: o
jogador tem de conseguir descrever o ferimento sem abrir a ficha.

### C6 · Escala de gravidade

`MALES.grav` é inteiro 1..4; o briefing pede 0..1. Converter a tabela quebra
comparações existentes; manter diverge do schema. **Recomendo manter 1..4 e
expor `gravidade01()` derivada** — nenhum dado migra, e quem quiser 0..1 tem.

---

## 8. Ordem de ataque proposta

Da medição, não do sumário do briefing:

1. **Custo de movimento** (§1.2). É a falha crítica e é a base de tudo: sem
   ela, camada, pressão e ponto de não retorno não têm em que se apoiar.
2. **Unificar o corpo** (C2) antes de acrescentar qualquer coisa nova. Dois
   sistemas de ferimento é o que precisa morrer primeiro.
3. **Matar os três parâmetros mortos** (`custa.atencao`, `custa.agua`,
   `MALES.dente`) — são pequenos e são a regra nº 5 do próprio briefing.
4. **`S.trilha` no save**, que é pré-requisito do `rastroSangue`.
5. **Tabela de Sinais como estrutura**, não texto — sem isso a asserção "tell
   antes de dano" não é verificável, e ela é o que separa horror de punição.
6. Só então camadas, pressão, achados e cicatrizes.

---

## 9. Riscos registrados antes de começar

- **Escopo global de 1447 nomes.** `corpo`, `REGIOES`, `SLOTS`, `MALES`,
  `saude`, `trilha` estão todos ocupados. A guarda de colisão do `montar.js`
  quebra a build em redefinição — bom — mas só para nomes de topo dos blocos.
- **Acento em identificador quebra a build de propósito.** O schema do briefing
  não tem acentos; o texto que o jogador lê pode ter. Manter essa separação.
- **`S.trilha` × `I.trilha` × `S.trilho`** são três coisas diferentes: o rastro
  da expedição, o rastro dentro da invasão e a trilha moral. Nomes parecidos em
  escopo global é como o bug do `capacidade` nasceu.
- **A mensagem do briefing chegou cortada** — a Tabela de Sinais termina no meio
  do Imitador (fase Contato), e faltam **Inchado** e **Primordial**. Não bloqueia
  a Fase 0. Vou precisar antes do entregável nº 9.

---

*Fim da Fase 0. Nenhuma linha dos Módulos A ou B foi escrita.*

---

# ADENDO — A Tabela de Sinais contra o código

*Escrito depois de receber a metade que faltava (Imitador/contato, Inchado,
Primordial, matriz de degradação, regras de isca e a API `Sinais`). Isto fecha o
buraco que eu tinha registrado no §9. Continua sendo Fase 0: nenhuma linha
escrita.*

## A1. As seis, lado a lado

O jogo já declara, para cada criatura, **a que ela reage** (`REGRA[id].sentido`),
**o que a segura** (`BICHOS[id].fraco`) e **como conta isso ao jogador**
(`REGRA[id].dica`). Comparando com a tabela nova:

| criatura | `sentido` no código | `dica` que o jogador lê | veredito |
|---|---|---|---|
| **Magro** | `luz` | *"Ele para na porta de cômodo aceso e não entra."* | **CONFLITO — ver S1** |
| **Rastejante** | `rastro` | *"Não segue o barulho. Segue por onde você pisou."* | **bate** |
| **Coro** | `som` | *"As duas metades vão pro mesmo barulho. Dois barulhos separam elas."* | **bate, com divergência de aridade — ver S2** |
| **Imitador** | `resposta` | *"Quem anda depois de ouvir se entrega."* | **bate com precisão** |
| **Inchado** | `passagem` | *"Não passa em vão apertado sem perder tempo."* | **bate** |
| **Primordial** | `olhar` | (`fraco`: *"Nada que você tem funciona. Só a saída dos fundos."*) | **bate** |

Cinco de seis se encaixam sem torcer nada. O Imitador chega a bater linha por
linha: `alvo(I,c){ return I.respondeu ? c.voce : I.ruidoEm }` — ele **só sabe
onde você está se você se moveu depois do chamado**. É literalmente o
*"o gatilho é a sua confiança"* da tabela, já rodando.

## A2. O item do checklist que já passa

> *"Nenhum contra-jogo é 'atacar'. Todos são posicionamento, preparo ou
> desistência."*

Medido: as opções que a invasão oferece contra as seis são

```
Ficar completamente parado · Recuar devagar, de costas
Jogar alguma coisa pro outro lado · Correr agora
```

**Não existe botão de atacar contra nenhuma das seis.** O combate do jogo é
contra ocupante humano na expedição, nunca contra elas. Este item do aceite
já está satisfeito hoje — e por desenho, não por acaso.

## A3. Um presente que estava escondido

O contra-jogo do Rastejante na tabela é a regra `sal_barra_rastejante`. **Sal não
existe como item nem como mecânica** — mas os moradores da casa já falam dele,
como superstição, em duas falas que já estão escritas:

```
'"Deixa eu botar sal na soleira. Não custa nada."'
`${p.n} bota sal na soleira e reza uma coisa curta. Ninguém ri.`
```

Ou seja: a regra que o jogador vai descobrir num documento **já está sendo
sussurrada pelas pessoas da casa há versões**, tratada como crendice. Descobrir
o laudo e perceber que a Dona Lurdes estava certa o tempo todo é melhor do que
qualquer coisa que eu escreveria do zero. Registro como oportunidade, não
conflito — e sugiro que o documento que revela a regra cite a superstição.

---

## Conflitos novos, com duas saídas cada

### S1 · O Magro está invertido

**O maior desta rodada.** A tabela diz que ele *"reage à luz direta"*, que é
*"o único que espera você olhar"*, e que o contra-jogo é **apagar a fonte de
luz** antes da iminência.

No jogo entregue, a luz é **proteção**:

```js
magro:{ sentido:'luz', dica:'Ele para na porta de cômodo aceso e não entra.',
        evita(id){ return luzLigadaEm(id); } }
```

Apagar a luz hoje **abre** o cômodo pra ele. E a `dica` é texto que o jogador já
leu e já usou para sobreviver. Inverter isso não é mudar um número: é ensinar
uma regra e depois puni-la — o contrário exato da Regra de Ouro.

**Saída A** — manter a regra do jogo (luz protege) e reescrever a linha da
tabela: os sinais e as fases continuam, só o contra-jogo vira *"acender antes
da iminência / manter o cômodo aceso"*. Zero risco, tabela diverge do documento.
**Saída B** — inverter no jogo, e tratar a inversão como **evolução declarada**:
o Magro aprende a odiar o clique do interruptor (que é o que a própria tabela já
propõe em *"sinal de que ele aprendeu"*). Fica fiel ao documento e é bonito, mas
exige avisar o jogador dentro da ficção, senão é traição de regra.

**Recomendo A** para a v67 e **B como evolução de noite alta**, usando o gancho
que a sua própria tabela já escreveu.

### S2 · O Coro tem duas bocas, não três

Código: `dois:true`, e a dica ensina *"as duas metades"*, *"dois barulhos separam
elas"*. Tabela: três vozes, contagem caindo 3 → 2.

**Saída A** — a tabela passa a 2 → 1. A mecânica de separar por dois ruídos
continua valendo e a dica já escrita continua verdadeira.
**Saída B** — o jogo passa a três, e a contagem vira informação nova (mais rica,
combina com *"a contagem é a informação"*), ao custo de mexer no `dois:true` e
na dica que o jogador já aprendeu.

**Recomendo A.**

### S3 · A matriz de degradação contradiz o A4 do seu próprio briefing

A4 diz, com todas as letras:

> *"Sanidade baixa degrada a pista (some detalhe), **não inventa pista falsa**.
> Perceber menos é diferente de perceber errado. Escolha perceber menos."*

A matriz nova diz **2–3 sinais falsos por noite** abaixo de 0,29, e o schema
lista `degradacao: "falsificar"` — usado no Coro e no Imitador.

Isso é resolvível, e o jogo entregue já sugere como. Ele **já mente**, de forma
escalonada e com chão:

```
V9_ESTAGIOS: [nome, min, ilusão, MENTIRA DE INTERFACE]
  lúcido 0.00 · tenso 0.02 · fissurado 0.12 · rachado 0.28
  desfeito 0.50 · em ruptura 0.90
```

E `PERCEPCAO_INVIOLAVEL` (§30) protege relógio, inventário e porta da frente —
com o §38 dando ao jogador o verbo de conferir os três.

**Saída A (a que eu proponho)** — dois escopos explícitos:
`inspecionarDaPorta`, que é um **verbo deliberado e pago**, nunca mente (A4
vale); os sinais **ambientais**, que chegam sem o jogador pedir, podem ganhar
falsos conforme a matriz. Custa uma linha no documento e reconcilia tudo.
**Saída B** — matriz vence em tudo, e o A4 é revogado por escrito.

Preciso da sua palavra: **A4 vale só para a inspeção, ou para tudo?**

### S4 · Metade dos "sinais de que ela aprendeu" depende de coisas que não existem

Cada criatura tem uma linha de evolução ligada a um campo real — e o checklist
exige isso. Situação de cada gancho:

| criatura | gancho | existe? |
|---|---|---|
| Magro | clique do interruptor | `interruptor()` **sim** |
| Rastejante | `S.corpo.cicatrizes.length >= 2` | **não** (cicatrizes não existem) |
| Coro | jogador prefere cômodo de saída única | grau do nó **sim**, preferência **não** |
| Imitador | ignorar sussurros por 3 noites | **não** (não há contador) |
| Inchado | `S.exploracao.atalhosDescobertos` | **não** |
| Primordial | `S.conhecimento.regras` | **não** |

Não é conflito — é a ordem de construção. Só registro para deixar claro que **a
Tabela de Sinais não pode ser o primeiro arquivo**: quatro das seis evoluções
dependem de `S.exploracao`, `S.conhecimento` e das cicatrizes. Ela é o
**contrato**, e entra cedo; as **evoluções** entram depois dos ramos que elas
leem.

### S5 · A API `Sinais` e o `foiEmitido` como falha de build

A asserção pré-dano é a peça mais valiosa do documento, e hoje **não é
verificável**: os 14 avisos existentes (8 em `AMEACAS.aviso`, 6 em `REGRA.dica`)
são texto solto, sem `fase`, `canal`, `antecedencia` nem id. Nada consegue
perguntar "houve sinal antes".

Isso não conflita com nada — é trabalho novo, e é pequeno: os textos já estão
escritos, falta dar estrutura a eles. Proponho que `sinais.js` venha **antes** de
`corpo.js`, para que nenhum ferimento novo nasça sem poder provar que foi
anunciado.

---

## Ordem de ataque, revisada com a tabela em mãos

1. **Custo de movimento** — a falha crítica; base de camada, pressão e A8.
2. **Unificar o corpo** (C2) — `S.ferido` vira derivado de `MALES`.
3. **`sinais.js`** — dar estrutura aos 14 avisos que já existem, com
   `foiEmitido` quebrando a build. Sem isto, "tell antes de dano" é promessa.
4. Parâmetros mortos (`custa.atencao`, `custa.agua`, `MALES.dente`) e
   `S.trilha` no save.
5. `S.exploracao` (camadas, pressão, achados) e `S.conhecimento`.
6. Cicatrizes, e só então as seis evoluções do S4.

---

## O que ainda trava a Fase 1

Nenhuma linha de código pode começar antes destas decisões:

- **C1** — `S.corpo` ocupado (recomendo `S.ferimentos`)
- **C2** — dois sistemas de ferimento (recomendo fachada derivada)
- **C3** — "zero `Math.random`" × as ~100 cosméticas de política escrita
- **C5** — os números de verbo na ficha × "nenhum número de vida"
- **C6** — `grav` 1..4 × `gravidade` 0..1
- **S1** — **o Magro está invertido** ← o mais urgente
- **S2** — Coro com duas bocas ou três
- **S3** — **A4 vale só para a inspeção, ou para tudo?** ← o mais estrutural

*(C4 não precisa de decisão: uso `S.memoriaAnomalias`, que é o nome real.)*
