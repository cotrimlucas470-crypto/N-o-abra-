# Testes

Harnesses de Playwright + Chromium headless, 390×844. Rodar da raiz do projeto,
depois de `node montar.js`:

    node tools/testes/expteste.mjs     # expedição transacional (19)
    node tools/testes/fugateste.mjs    # ciclo da invasão e fuga (30)
    node tools/testes/baktest.mjs      # backup do save (6)
    node tools/testes/nucleoteste.mjs  # núcleo de governança §30 (50)
    node tools/testes/orqteste.mjs     # orquestrador de tensão §31 (60)
    node tools/testes/memteste.mjs     # memória cognitiva da casa §32 (59)
    node tools/testes/fimteste.mjs     # o final §33 (18)
    node tools/testes/ouvteste.mjs     # o ouvido na porta §34 + dia 30 (20)
    node tools/testes/falasteste.mjs   # as falas da porta §35 (18)
    node tools/testes/itensteste.mjs   # os verbos das armas §36 (26)
    node tools/testes/saldoteste.mjs   # a linha de saldo §37 (26)
    node tools/testes/santeste.mjs     # a sanidade como sintoma §38 (30)
    node tools/testes/bugteste.mjs     # os consertos da v66 (24)
    node tools/testes/passoteste.mjs    # o passo custa §39 (30)
    node tools/testes/sinaisteste.mjs   # sinais como contrato §40 (33)
    node tools/testes/corpoteste.mjs    # um corpo só §41 (29)
    node tools/testes/pressaoteste.mjs  # pressão, luz e exposição §42 (31)
    node tools/testes/finalteste.mjs   # retorno, achados, cicatriz, tratamento §43-46 (39)
    node tools/testes/somteste.mjs     # o som mais perto da realidade §47 (35)
    node tools/testes/rngteste.mjs     # a terceira grafia e a carga do gerador §48 (26)
    node tools/testes/costurateste.mjs # as costuras: o que nunca esteve ali §49 (27)
    node tools/testes/costsiteteste.mjs # o site animado docs/as-costuras.html (16)
    node tools/testes/dirteste.mjs     # o diretor ganha ouvido §50 (33)
    node tools/testes/rostoteste.mjs   # o rosto de quem bate na porta (17)
    node tools/testes/cenateste.mjs    # os nove cômodos: desgaste, volume e camada da frente (17)
    node tools/testes/texteste.mjs     # texturas: veio, poro e risco §etapa 4 (18)
    node tools/testes/simulacao.mjs    # 250 noites simuladas, sem asserção de gosto (20)
    node tools/testes/labteste.mjs     # o site animado docs/laboratorio-de-som.html (26)
    node tools/testes/aberturateste.mjs # a abertura narrada e a guarda do save (14)

Fumaça no PACOTE, não na cópia de trabalho — descompacte o zip e aponte:

    PACOTE=/tmp/limpo node tools/testes/fumaca.mjs   # (13)
    node tools/testes/varre.mjs 5 400  # varredura ampla: estouros e invariantes
    node tools/testes/cacaexp.mjs 6 12 # caçador de estouros na expedição

`varre` e `cacaexp` embrulham **toda função global do jogo** num `try/catch` que
registra quem estourou. Foi assim que a colisão de `capacidade` apareceu: ela não
produz erro na carga, só na hora de jogar.

    node tools/colisoes.mjs            # lista colisões de nome de topo

A trava de colisão também roda dentro de `montar.js` e **quebra o build**.

## Notas de armadilha

- **Nunca troque acento por substituição cega no arquivo inteiro.** JS aceita
  acento em identificador, então `S.ruido → S.ruído` não dá erro de sintaxe:
  dá erro de comportamento, calado. `montar.js` agora quebra o build se achar
  acento em nome de campo ou variável.

- **Bloco ANEXA a um save; bloco nunca CRIA um save.** Onze blocos embrulham
  `salvar()` e gravavam com `JSON.parse(localStorage.getItem(CHAVE)||'{}')`.
  Esse `||'{}'` cria save de partida que não começou, e foi assim que a
  abertura narrada sumiu por várias versões sem dar erro nenhum.
- Os harnesses agora falam com `http://127.0.0.1:8901`. Suba o servidor antes:
  `node tools/servidor.mjs . 8901`. Em `file://` o `fetch` é bloqueado e
  qualquer teste que leia mídia falha por motivo errado.
- Não use `pkill` aqui: ele casa com o processo do próprio shell da sessão.

- `chance` é `const arrow`, **não** é propriedade de `window`. Trocar
  `window.chance` não afeta nada. Pra forçar um resultado, mexa na config
  (`FUGA_CFG`), não na função.
- Várias telas são `async` e limpam a barra de ações enquanto narram. Esperar
  um tempo fixo dá teste instável; espere os botões aparecerem.
- Rodar oito harnesses em paralelo **starva o Chromium**: a abertura tem tempos
  fixos e `#nm` não chega a aparecer. Duas ou três em paralelo, no máximo — a
  falha parece regressão e não é.
- No `pedirPermissao` a ordem das barreiras importa pro teste: cooldown global
  vem antes do de categoria. Pra medir o de categoria isolado, zere o global à
  mão antes de pedir, senão o global mascara.
- A SALA é o miolo da planta: nada fica a mais de 2 cômodos dela, e o diâmetro
  da casa é 4. Teste que precisa de distância grande tem de escolher o par mais
  distante, não chutar dois números.
- `riscoDaArea()` é limitado a 0,9 de propósito: nada neste jogo é certeza.
  Teste que exige o encontro precisa insistir.

- Teste de sanidade **com sanidade cheia não prova nada**: `lúcido` produz zero
  por definição, e é o certo. Derrube a sanidade antes de medir qualquer coisa.
- `mexerSan(-22)` sozinho não muda estágio: `v9().escudo` são 30 pontos que
  absorvem a primeira queda inteira. Zere o escudo ou bata duas vezes.
- O jogo dobra letra de propósito em sanidade baixa ("mmais"). Isso **não** é
  bug de digitação — é a linha passando pelo mesmo filtro da narração real.

- **Wrapper de `salvar()` precisa repetir a guarda `if(!S.nomeJogador)return`.**
  A base tem essa guarda; wrapper que grava onde a base não gravaria anexa
  estado vazio a um save de sessão anterior durante o boot. É o save fantasma
  da v60 com outro nome, e o §39 o reintroduziu antes de o teste pegar.
- Wrapper de save **nunca** pode chamar função que CRIA estado (`estadoExp()`,
  `sanEstado()`, e parecidas). Grava só o que já existe.

- Guarda de build que fatia JS com string: o fim de um array é `];` em **início
  de linha**. Procurar o primeiro `];` solto corta no meio — `(S.abrigo||[])[0];`
  casa. A quarta guarda leu 14 de 24 sinais e acusou o inocente.
- `TELLS` é a tabela de sinais das criaturas. `SINAIS` (que já existia) é o
  cheiro de cada lugar da expedição. Nomes parecidos, conceitos opostos.

- `REGIOES`, `PARTES`, `MALES` e `TELLS` só existem **dentro** de `p.evaluate`.
  Usar um deles no escopo do Node dá `ReferenceError` — devolva a lista do
  navegador em vez de referenciá-la de fora.

- Asserção que fixa um estado **temporário** envelhece. `passoteste` afirmava
  que luz e exposição eram "zero declarado" — verdade na Etapa 1, falso depois
  que a Etapa 4 criou os consumidores delas. Teste que quebra porque o jogo
  melhorou precisa ser atualizado, não revertido.

- **Procure se o som já existe antes de escrever um novo.** Eu auditei o
  barramento inteiro e mesmo assim comecei a escrever um `somDePorta` de quatro
  camadas — `somPortaAbrindo` já existia, com **cinco**. Auditar a arquitetura
  não é auditar o catálogo. `grep -n 'function som' index.html` antes.
- Medir o **máximo entre todos os filtros** esconde o filtro que você acabou de
  adicionar. O som da porta tem filtros mais agudos que o de ar, então o máximo
  mal se movia (2763 → 2652 Hz) e a asserção passava pelo motivo errado. Conte
  o filtro pela assinatura dele (lowpass com Q 0,4) e leia o valor desse.
- **Cronômetro de Web Audio mede acúmulo de nós, não código.** Cada som agendado
  deixa nós vivos no `AudioContext`, e a mesma chamada repetida fica mais cara a
  cada rodada: eu medi `1,70 · 2,35 · 4,83 · 4,68 · 6,24 · 6,24 ms` para código
  **idêntico**. Toda asserção de tempo aqui é frágil por construção. Prefira
  contagem de nós, que é determinística; se precisar de tempo, aqueça os dois
  caminhos, meça no **mesmo** contexto, intercalado, e tire a mediana.
- Consequência: eu publiquei que o passo tinha ficado **mais barato** (0,921 →
  0,357 ms) porque medi o `antes` num contexto sujo e o `depois` num limpo.
  Número de desempenho sem método é chute com casa decimal. Todo cronômetro saiu
  deste harness; o que ficou é contagem de nós.
- **`COLISAO_OK` é a lista das funções que existem DUAS vezes de propósito. Leia
  antes de medir qualquer uma delas.** Eu medi o passo contra `passo()` do
  `index.html`, que está morto — `audio-manager.js` declara outro depois, e o
  `montar.js` registra a troca com o motivo escrito ao lado. Testei contra o
  cadáver, concluí que o passo do jogo era pobre, e troquei o bom pelo meu, pior.
  Só o teste dentro do pacote me pegou. Antes de afirmar o que uma função faz:
  `grep -n 'function nome' index.html` — se aparecer duas vezes, **a segunda é a
  que vale**, e `montar.js` diz por quê.
- Asserção de custo com número mágico (`< 4 ms`) mede o jogo inteiro, não a sua
  mudança — mas trocá-la por uma **razão** de tempo (`longe < perto * 1.4`) não
  resolve: essa também passou uma vez e falhou na seguinte, sem regressão nenhuma
  no meio. O que sobrou de asserção é contagem: um filtro de ar por camada,
  nenhuma fonte a mais.

- **`COSMETICO` não é a mesma coisa que `_ale`.** A política do projeto permite
  `Math.random` em áudio e desenho — e permitir sem trava virou 11 decisões de
  gameplay sorteando fora do gerador, incluindo **a arma travar**. A 5ª trava de
  build proíbe as duas grafias que são sempre decisão
  (`Math.floor(Math.random()*n)` e `Math.random() > x`) e aceita o escape
  `/* cosmetico: por que */` — com o motivo escrito, não só a palavra.
- **Estado salvo não é estado aplicado.** `d.rngEstado` era gravado e restaurado
  pra dentro de `S` — e nunca chegava ao gerador vivo, porque `semearRNG()` roda
  no parse do bloco, antes de `carregar()`. Ao testar persistência, confira os
  **dois** lados: que o número volta, e que alguém o usa.
- **Sonda instalada com `addInitScript` + polling não alcança este jogo.** O
  `index.html` tem 2,8 MB; o parse segura a thread e `carregar()` roda antes.
  Medido: a sonda só ficou pronta 12,5 s depois do boot. Prefira medir o estado
  do armazenamento no instante zero e exercitar `carregar()` direto.
- **Dimensione a amostra antes de escolher o limite.** Meu teste de
  embaralhamento usava N=3000 com limite de 12% — que é 3,3 sigma, e falhou sem
  nada estar errado. A 200 mil tiros o desvio real é 1,01%. Com N=40000 o limite
  de 4% é 4,5 sigma: aperta mais **e** para de piscar.

- **O campo é `p.local`, não `p.comodo`.** Onde cada morador está mora em
  `p.local`, escrito por `espalharGente()`. Escrever `p.comodo` não dá erro
  nenhum: a regra simplesmente não funciona, em silêncio. Foi assim que a
  proteção das costuras nasceu morta.
- **`S.abrigo` está VAZIO logo depois da ficha.** Teste que reposiciona quem
  existe não coloca ninguém, e aí acusa o código de um bug que é do cenário.
  Se o teste precisa de gente, o teste põe a gente.

- **Estado DERIVADO não se força com um setter.** `dirForcar('POS_CLIMAX')` era
  desfeito pelo primeiro `orqNovaNoite()` de dentro de `orqSimular`, porque o
  estado do diretor é recalculado a cada noite. O teste media 5,78 idêntico nos
  três estados e passava. Force a **entrada** (a pressão), não a conclusão.
- **Separe as alavancas antes de dizer que o sistema funciona.** Comparar
  "com diretor" contra "sem diretor" não diz qual parte agiu. Medido separando:
  o recuo pós-clímax vale 0,7 evento/noite; o fio da pressão vale 0,02. Eu ia
  declarar vitória em cima do segundo.
- **Média dentro da faixa não quer dizer noite dentro da faixa.** A primeira
  versão do §50 deixava a média em 5,96 (faixa [4,8], tudo certo) e ao mesmo
  tempo jogava **12% das noites acima de 8** — contra 0,05% sem ele. Olhe a
  cauda, não só a média.

- **Caminhador de teste não pode clicar `bs[0]` cego.** O `bs[0]` da tela do jogo
  pode ser **"▼neste cômodo"** — o cabeçalho de uma gaveta que abre e fecha sem
  agir. Uma falha do `expteste` mostrou seis cliques seguidos nele, queimando os
  60 passos. Filtre cabeçalhos (`/^[▼▶]/`) antes do fallback.
- **Teste que passa por sorte de ordenação quebra quando você conserta a
  ordenação.** O `expteste` passava 12 de 12 porque o embaralhamento enviesado
  colocava uma ação de verdade em primeiro lugar. Corrigido o viés, passou a
  falhar 1 em 8 — e o culpado era o teste, não o jogo.
- **Antes de chamar uma falha de instabilidade, rode o build ANTIGO.** 0 falhas
  em 12 rodadas antes contra 1 em 8 depois foi o que provou que era o meu
  conserto, e não azar de tempo.

- **Não cobre de um desenho o que ele não desenha.** `pintarVisitante` faz NOVE
  dos 12 defeitos do visitante; `maos`, `roupa` e `pes` são de outro sistema. O
  primeiro teste do rosto acusava o retrato de não desenhar o que nunca foi dele.
- **Sinal de tempo não se mede num quadro parado.** `piscar` significa "nunca
  pisca": num instante só, o rosto normal também está de olho aberto e os dois
  desenhos são idênticos. Meça ao longo de muitos `t` — 47 piscadas em 600
  quadros no rosto normal, zero no defeituoso.
- **E cuidado com o instante escolhido:** medi o brilho da pupila num `t` em que
  o rosto estava piscando. De olho fechado o brilho não tem como aparecer, e o
  teste acusava o desenho.
- **A zona da lente é fração da tela DO JOGO.** Numa tela de teste com outra
  proporção o centro da zona não cai na feição — a boca ficava 72 px fora da
  própria zona. Para checagem espacial em tela de teste, use faixas da imagem.
- **Limite global esconde sinal pequeno.** `brilho` acende só as pupilas: 0,2% do
  retrato inteiro, 1,2% da faixa dos olhos. Meça onde o sinal acontece.

- **Degradê de cor clara até preto NÃO escurece: ele acinzenta.** No canvas a
  cor e a opacidade interpolam juntas, então `rgba(255,236,200,.05)` →
  `rgba(0,0,0,.40)` passa por cinza a 22% no meio do caminho. Eu usei isso como
  vinheta de piso e o chão quase preto virou tapete: brilho médio de **14,88
  para 25,61 (+72%)**, e em três cômodos o CHÃO ficou mais claro que a PAREDE.
  Escurecimento sai de **preto transparente** para preto opaco, sempre. Brilho
  é uma passada separada, saindo da própria cor quente.
- **A foto pegou o que o teste não pegava.** Nenhuma asserção reclamou do chão
  acinzentado — as seis seções passavam. O defeito apareceu ao olhar a grade dos
  nove cômodos lado a lado. Tire a foto antes de dizer que está pronto.
- **Comparar "sob o móvel" com "ao lado do móvel" mede a vinheta do piso, não a
  sombra de contato.** O piso é claro no meio e escuro na beirada de propósito,
  e o móvel fica no meio — o "sob" ganha sempre. Para isolar um efeito, desligue
  o efeito e compare **os mesmos pixels**: `window.pousar=()=>{}`, redesenhe,
  subtraia.
- **Conjunto vazio passa em asserção de posição.** Com a sombra desligada, os
  contadores de faixa ficavam no valor inicial (`y0=1`) e `alto>.55` passava com
  ZERO pixels. Devolva `-1` quando não há amostra, e confirme plantando a
  regressão — foi assim que esse buraco apareceu.
- **Contador por limiar mede o brilho da cena, não o efeito.** "Escureceu 4,95
  pontos" caiu para 3,58 só porque consertei o chão: em piso escuro a mesma
  sombra subtrai menos em valor absoluto. Meça a **fração** da luz comida
  (17–38%), que não depende de quão claro está o fundo. Mesmo erro na versão
  por limiar `>16` do desgaste: com o chão escuro de volta, a mesma mancha
  passou a somar menos de 16 e sumiu da conta.
- **Média dilui marca localizada.** O desgaste da parede dava média 1,3–1,7 (não
  parece nada) mas muda **4–5,8% da parede** com pico 30–43. O par de MENOR
  média era o de MAIOR fatia alterada. Para diferença esparsa, use fatia e pico.
- **`expteste` falhou 1 vez em 9 sob carga (3 Chromium + 2 servidores extras).**
  Não reproduziu em 8 rodadas seguintes, incluindo 2 na mesma condição paralela.
  As 4 asserções que caíram eram todas depois da mesma tela abrir — instabilidade
  de tempo, não regressão. Se reaparecer fora de carga, aí é outra coisa.

- **Limite fixo que não separa não é teste.** A primeira versão do `texteste`
  exigia razão de anisotropia > 1,3 pra provar veio de madeira. Plantei a
  regressão (desliguei o `material`) e a asserção **passou assim mesmo**:
  degradê dentro de retângulo mais duas arestas já dão 1,32–1,41 sozinhos. O que
  separa é o **grão** medido com o tecido ligado e desligado: 1,048 → 1,591.
  Antes de confiar num limite, meça os dois lados dele.
- **Interruptor é requisito de teste, não luxo.** O veio do chão nasceu como
  código solto dentro do `paredeBase`. Sem nome não há como desligar só ele, e a
  primeira versão do teste acabou medindo as JUNTAS das tábuas, que sempre
  convergiram: apaguei o veio inteiro e o teste passou (32/21/9 linhas, vão de
  11 a 28px, convergindo lindamente). Virou `veioDoPiso()` por isso.
- **Medir material exige mirar no material.** A faixa que eu usava pro gerador
  pegava o painel afundado e o mostrador redondo, que são lisos de propósito, e
  diluía o metal escovado: razão 1,32 em vez de 1,54. A régua estava certa, o
  alvo é que estava errado.
- **A ampliação mostra o que o tamanho normal esconde.** A primeira textura de
  metal, vista a 3×, era papel milimetrado: 130 riscos indo de ponta a ponta,
  metade deitados e metade em pé, formando grade. Na tela do jogo passava batido.
  Renderize o tecido sozinho e amplie antes de aceitar.
- **Duas hipóteses minhas sobre o `semente` estavam erradas, e medi-las custou
  menos que reescrever.** Achei que a trama diagonal vinha de correlação entre
  `semente(281,i)` e `semente(283,i)` (medido: −0,06, não é) e depois do
  quase-período de 4,37 amostras do `sin` (autocorrelação medida em nove
  defasagens: tudo abaixo de 0,04, não é). O `semente` é limpo; o defeito estava
  no meu desenho do metal.
