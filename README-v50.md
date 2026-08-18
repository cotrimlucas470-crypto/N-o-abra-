# NÃO ABRA — v50

Consolida tudo das versões anteriores e acrescenta ficha de personagem, armas
de fogo e equipamento corporal.

Leia antes: **`README-v49.md`** (chuva, luz, instalação, build) continua valendo
inteiro. Este arquivo cobre só o que é novo.

---

## 0. O que este projeto é — e o que a v50 não pôde fazer

**É** um jogo de terror em JavaScript puro, desenhado em `<canvas>` 2D,
distribuído como um arquivo HTML só. Sem engine, sem cena 3D, sem malha.

Boa parte do pedido da v50 descreve uma engine 3D: modelos com pivô e escala,
render pipeline, materiais, LOD, prefabs, draw calls, animações de mirar e
agachar, roda do mouse, suporte a controle. **Nada disso existe aqui**, e não
foi simulado nem maquiado. O que foi feito no lugar, item por item:

| pedido | o que existe nesta arquitetura |
|---|---|
| modelo 3D de cada arma/roupa | **arte vetorial de canvas**, uma função por item, a mesma técnica dos ~60 itens originais do jogo. Todos os 8 armas, 6 munições, 4 carregadores e 12 roupas têm desenho próprio |
| encaixe na mão, pivô, LOD | não se aplica: não há personagem 3D nem malha |
| animação de mirar/recarregar/agachar | o jogo é de menu e texto; a recarga tem **tempo em segundos** que a Destreza altera, mas não há animação |
| raycast / projétil físico | **decisão documentada**: o tiro é resolvido por probabilidade composta (dispersão, distância, estado da arma, Pontaria). Um raycast exigiria um mundo com colisores que o jogo não tem |
| roda do mouse, controle | teclado e toque; o jogo é feito para celular |

Onde a limitação é real, ela está escrita — aqui e na seção 9.

---

## 1. Atributos

Dez atributos, **0 a 10**, e **exatamente 10 pontos** para distribuir.

A regra que organiza tudo: **a tela não calcula nada.** Ela pergunta ao jogo
quanto vale cada coisa no nível atual e no seguinte, e mostra a diferença.
Texto e lógica não podem discordar porque só existe uma conta — `derivadas()`,
em `s19-ficha.js`.

### A curva

Todos os atributos passam por:

```js
function curva(n){ return Math.pow(trava(n,0,10)/10, 0.72); }
```

Retorno decrescente por desenho: **o 1º ponto de Força dá 3,8 kg de carga, o
10º dá 1,5 kg** (medido). Mexer no expoente é mexer no equilíbrio do jogo
inteiro, e é por isso que ele está numa linha só.

### O que cada um faz

| atributo | derivadas (fórmula em `derivadas()`) |
|---|---|
| **Força** | carga `24 + 20·c` kg · dano corpo a corpo `1 + 0,55·c` · arma pesada `1 + 0,40·c` · resistir a empurrão `0,50·c` · penalidade de peso `1 − 0,45·c` |
| **Velocidade** | corrida `1 + 0,45·c` · arranque `1 + 0,60·c` · abrir distância `0,55·c` |
| **Destreza** | interação `1 − 0,40·c` · sacar `1 − 0,45·c` · recarga `1 − 0,42·c` |
| **Furtividade** | ruído do passo `1 − 0,55·c` · rastro `1 − 0,50·c` · suspeita `1 − 0,45·c` |
| **Resistência** | fôlego `3 + 5·c` · gasto ao correr `1 − 0,45·c` · ao bater `1 − 0,40·c` |
| **Vitalidade** | vida `100 + 60·c` · gravidade da ferida `1 − 0,35·c` · tolerância `1 − 0,40·c` |
| **Percepção** | notar ameaça `0,65·c` · achar item `1 + 0,50·c` · ouvir `1 + 0,60·c` |
| **Pontaria** | dispersão `1 − 0,55·c` · recuo `1 − 0,50·c` · firmar `1 − 0,45·c` · **teto de acerto `0,55 + 0,35·c`** |
| **Sorte** | saque `1 + 0,35·c` · condição do achado `1 + 0,30·c` · evento `0,28·c` |
| **Inteligência** | fabricar `1 − 0,35·c` · reparo `1 + 0,55·c` · manutenção `1 + 0,50·c` · aproveitar `1 + 0,40·c` |

`c` = `curva(nível)`. **Pontaria 10 dá teto de acerto de 90%, nunca 100%.**

### Onde eles tocam o jogo de verdade

Não são números soltos: cada um entra num sistema que já existia.

- **Força → `mochilaInfo()`**: a carga da mochila muda de fato (medido: 6 → 11 kg
  no exemplo do teste, com a mochila inicial).
- **Força → `melhorArma()`**: multiplica o dano, depois do desgaste do §15.
- **Furtividade → `v9Rastros()`**: encolhe o rastro que o §9 soma — **menos
  PRESENÇA**, que continua intocada. Furtividade 10 não é invisibilidade:
  medido, o rastro cai de 4,0 para 3,5 e **nunca chega a zero**.
- **Vitalidade → `ferirPor()`**: às vezes converte ferida em susto.
- **Velocidade e Resistência → `pesoFerido()`**, que é o número que o jogo já
  usa como "o quanto tudo que exige corpo fica pior".
- **Inteligência → `reparar()`** do §15.
- **Sorte → `acharComida()`**.

### Limite de 10, com as parcelas separadas

O efetivo é `investido + bônus do ofício`, **preso em 10**. A tela mostra as
duas parcelas: `9 inv +3 ofício` aparece como efetivo **10**, marcado como
cortado. Valor adulterado por código é preso na leitura, e a validação recusa
ficha com pontos sobrando, negativos ou acima do teto.

---

## 2. Os catorze ofícios

Sobrevivente, Soldado, Médico, Mecânico, Caçador, Explorador, Ladrão, Bombeiro,
Policial, Engenheiro, Segurança, Paramédico, Técnico e Civil.

Cada um tem bônus, **desvantagem real**, uma passiva própria e itens iniciais.
Nenhum tem só vantagem — testado: a suíte falha se algum tiver `mais` sem
`menos`. (O Sobrevivente foi corrigido durante o desenvolvimento justamente por
isso.)

Exemplos do que a passiva faz de verdade:

- **Soldado** — recuo 35% menor e recarga 20% mais rápida (entra em
  `tempoDeRecarga` e em `atirar`). Em troca: −2 Furtividade.
- **Técnico** — *Gambiarra*: o reparo **não encolhe o teto** da peça, que é a
  regra dura do §15. Em troca: −1 Vitalidade e −1 Resistência.
- **Engenheiro** — a bancada nasce um nível acima. Em troca: −2 Velocidade.
- **Civil** — sem modificador nenhum, e **dois pontos livres a mais** (12 em vez
  de 10). É a build aberta.

---

## 3. Armas de fogo

Sete categorias, oito armas: pistola, revólver, submetralhadora, espingarda,
carabina, rifle, rifle de precisão — mais a arma de exemplo (seção 4).

Seis calibres: `.38`, `9mm`, `.12`, `.22`, `.308`, `7.62`.

### O que é real

- **Munição por calibre**, contada em reserva (`S.municao`). 9mm não recarrega
  espingarda — testado, e a reserva de 9mm fica intacta na tentativa.
- **Carregador e câmara separados.** A câmara enche primeiro, porque é ela que
  dá o tiro seguinte. Uma pistola 12+1 mostra `1+12/12`.
- **Recarga completa, parcial e cartucho por cartucho.** `recarregar(id, n)`
  limita a quantidade — é o que faz a espingarda encher de um em um e a recarga
  poder ser interrompida sem deixar a arma num estado inválido.
- **Travamento** por confiabilidade, piorada pelo desgaste, **sempre avisado**
  no HUD e destravável na bancada.
- **Munição finita.** Testado: 13 tiros com 13 carregados, `0/12` no fim, e a
  reserva debitada exatamente.
- **Desgaste** integrado ao §15: cada tiro gasta a peça, e arma quebrada não
  dispara.

### O tiro

**Decisão técnica:** probabilidade composta, não raycast. O jogo não tem mundo
com colisores — o combate é uma cena de menu. A conta:

```
chance = 1/(1 + dispersão·0,55) · (0,65 + 0,35·estado)
dispersão = disp_arma · disp_pontaria · (1 + max(0, dist − alcance)·0,35)
```

presa entre 5% e o **teto de acerto da Pontaria**. Medido: pistola a 2 de
distância dá 55% com Pontaria 0, 76% com Pontaria 10, e 19% a 9 de distância.

### O ruído, que é o preço

O disparo entra em **dois** sistemas que já existiam: `S.ruido` (o medidor da
noite) e `S.calor` (o rastro do §9, que é o que traz a coisa até você). Dentro
de casa ecoa 15% mais; a chuva cobre até 18%. Medido: carabina 7,62 gera ruído
76, `S.ruido` +26,6 e `S.calor` +41,8 num tiro só.

---

## 4. Como adicionar uma arma nova

Uma arma é **dados**. Nenhuma linha do núcleo muda:

```js
registrarArma({
  id:'minha_pistola',        // estável: não quebra save se o nome mudar
  nome:'Pistola do vizinho', // o nome visível pode mudar à vontade
  categoria:'pistola',       // pistola|revolver|smg|espingarda|carabina|rifle|precisao
  calibre:'9mm',             // tem de existir em CALIBRES
  capacidade:10, dano:3.4, peso:1.2,
  // tudo abaixo é opcional e tem padrão seguro:
  alcance:3.4, alcanceMax:7, dispersao:.95, recuoV:1.0, recuoH:.4,
  cadencia:2, modos:['semi'], tempoSaque:.9, tempoRecarga:2.3,
  confiabilidade:.96, porCartucho:false,
  d:'Antiga, cuidada, e alguém a escondeu com carinho.',
  desenho:s=>{ /* arte de canvas — o "modelo" deste projeto */ }
});
```

**Campos obrigatórios:** `id`, `nome`, `categoria`, `calibre`, `capacidade`,
`dano`, `peso`. Todo o resto tem padrão.

**A validação recusa com motivo legível** e o jogo continua de pé:

```
[§20] arma "quebrada" recusada:
  · falta o campo obrigatório "categoria"
  · falta o campo obrigatório "calibre"
[§20] arma "calibre_falso" recusada:
  · calibre ".50BMG" não existe em CALIBRES
```

Registrar faz sozinho: entra em `ARMAS_FOGO`, vira item do `CATALOGO` (com
peso, volume e raridade), ganha desenho e passa a poder ser achada, carregada,
guardada e disparada.

**A `pistola_mauser` no fim de `s20-armas.js` foi criada inteiramente por esse
fluxo** — é a prova de que a extensão funciona, e o teste confirma que ela
carrega e dispara.

Para munição e carregador novos: acrescente o calibre em `CALIBRES` e
`registrarMunicoes()` cria os itens correspondentes.

---

## 5. Roupas, armaduras e slots

**14 slots**: cabeça, rosto, tronco interno, tronco externo, armadura, mãos,
cintura, pernas, pés, costas, mochila, arma branca, arma de fogo, utilitário.

**12 peças** com desenho próprio: camiseta, camisa, calça, casaco, bota, tênis,
luva, capacete, máscara, joelheira, cinto de ferramenta e mochila pequena —
mais as três armaduras da v48 (colete, avental, jaqueta), agora com região.

### A regra que evita o abuso do gênero

**Proteção é por região.** Cada peça declara `reg` e `prot` por tipo de dano, e
só vale ali. Testado: com **só a bota** vestida, os pés ficam em 16% de
proteção contra pancada e **os braços em 0%**.

O teto de proteção somada é 70% — nenhuma combinação fica imune. A proteção
encolhe com o desgaste da peça, e a peça que segura o golpe se gasta.

Toda peça cobra: peso, `veloc` e `ruido`. Armadura pesada protege e denuncia —
o ruído entra no rastro SOM e METAL do §9. Sobreposição tem regra: casaco
grosso **impede** colete por cima.

Medido em 800 golpes: 8% segurados sem roupa, 24% com o corpo coberto.

### Cada peça dá atributo — e cada uma cobra

Proteção sozinha não fazia diferença sentida: 6% a mais contra corte é um número
que não muda decisão nenhuma. Agora **toda peça mexe na ficha**, e quase toda
peça mexe nos dois sentidos — vestir vira escolha, não acumulação.

| peça | dá | cobra |
|---|---|---|
| Camiseta puída | +1 Velocidade | — |
| Camisa de manga | +1 Vitalidade | — |
| Calça de brim | +1 Resistência | — |
| Casaco pesado | +1 Vitalidade | −1 Velocidade |
| Bota de couro | +1 Resistência | −1 Furtividade |
| Tênis gasto | +1 Velocidade, +1 Furtividade | — |
| Luva de raspa | +1 Destreza | — |
| Capacete de obra | +1 Vitalidade | −1 Percepção |
| Máscara de pano | +1 Furtividade | — |
| Joelheira e caneleira | +1 Força | −1 Velocidade |
| Cinto de ferramenta | +1 Destreza | — |
| Mochila pequena | +1 Força | — |
| Colete improvisado | +1 Vitalidade | −1 Furtividade |
| Avental de couro | +1 Força | −1 Destreza |
| Jaqueta reforçada | +1 Vitalidade | — |

Duas regras que impedem isso de virar planilha:

1. **O teto de 10 continua valendo.** O equipamento entra como uma terceira
   parcela em `parcelas()`, ao lado do investido e do ofício, e o total é
   truncado em 10. Quem já tem Velocidade 10 não ganha nada de tênis.
2. **Peça quebrada não dá bônus.** Isso obrigou a corrigir um bug que estava lá
   desde a v48: **roupa não tinha durabilidade nenhuma.** O `§15` não tinha ramo
   para a categoria `roupa`, então `peca()` devolvia `null` — a proteção nunca
   decaía, a peça que segurava o golpe nunca sentia, e "quebrada não dá bônus"
   não tinha como valer. Agora tem, com taxa por peça: máscara de pano (7,0) e
   camiseta (6,5) rasgam depressa; capacete (1,8) e mochila (2,0) quase não. O
   conserto de roupa custa **lona e linha**, na mesma bancada.

O painel do corpo mostra a soma no topo e, ao abrir um slot, o que a peça
vestida dá e **o que a alternativa daria no lugar** — a comparação fica na tela
na hora de decidir.

---

## 6. HUD e painel

### O botão de equipamento

Antes só se chegava ao painel por um botão no **quarto**, e depois do §22 ele
ficava dentro da seção recolhida "você" — ou seja, ficou *menos* achável, não
mais. Agora há duas entradas:

1. **Um botão fixo** no canto de baixo à direita da cena, presente em **todo
   cômodo**. Dentro dele não vai um ícone genérico: vai a **mesma silhueta do
   painel**, com cada parte acendendo conforme o quanto ela está protegida — dá
   pra ver de relance que você está de bota e sem casaco. O selo conta as peças
   vestidas e vira `!` (com a borda mudando junto, nunca só cor) quando alguma
   está em pedaços.
2. **`Roupa e equipamento` no menu**, agora em todos os cômodos, dentro de
   "você".

O botão vive num trilho à direita junto com o HUD de arma. Ele só aparece
**quando o menu de cômodo está na tela** — e isso não é detalhe de estilo:
fechar o painel volta chamando `menuComodo`, e num corte de noite ou no meio da
rua isso teleportaria o jogador pra dentro de casa. Aparecendo junto com o menu
do cômodo, o caminho de volta é sempre o certo. O cômodo de retorno vem de quem
desenhou o menu, não de `cena.casa.voce` — esse campo só é escrito por `irPara`.

Com o painel aberto, o trilho inteiro some.

- **Painel corporal** (`Roupa e equipamento`, em qualquer cômodo): slot a slot, com item,
  proteção declarada, estado da peça, e o que dá pra vestir da mochila. Mostra
  proteção por região em número — **estado nunca é dito só por cor**.
- **Bancada de armas** (na oficina): carregar, destravar, trocar modo, escolher
  qual arma vai na mão, e a munição guardada por calibre.
- **HUD de combate** (canto inferior direito, compacto): arma branca, arma de
  fogo, `câmara+carregador/capacidade`, reserva e calibre, modo, condição, e os
  avisos de TRAVADA / SEM MUNIÇÃO / sem reserva. **Só redesenha quando o
  conteúdo muda** (compara com o valor anterior antes de tocar no DOM).

O inventário em grade e os recipientes já existiam desde a v48 (§16), com
arrastar-e-soltar, busca, filtros, quatro ordenações e contador de espaços.

---

## 7. Saves

Grava: `ficha` (classe, pontos, versão), `fogo` (carregador, câmara, travamento
e modo por arma), `municao` (reserva por calibre), `armaFogo` (a equipada) e
`corpo` (todos os slots). Somado ao que a v48 e a v49 já gravavam.

### Migração de save antigo

Save anterior à v50 entra como **Civil, 0 pontos, `aplicada:true`** — e o
`aplicada:true` é deliberado: quem já tem um jogo em andamento não pode ganhar
kit inicial de brinde agora. Corpo e armas nascem vazios e válidos.

**Um bug real foi encontrado aqui pelos testes:** a condição de migração
testava só `!S.ficha`, mas o bloco cria `S.ficha` vazia ao carregar — o objeto
sempre existia e a migração nunca disparava, deixando o jogo sem ofício nenhum.
Agora o que decide é haver **classe válida**.

---

## 8. Arquivos

### Criados

| arquivo | conteúdo |
|---|---|
| `s19-ficha.js` | atributos, curvas, derivadas, 14 classes, tela de criação, integração e persistência |
| `s20-armas.js` | calibres, catálogo de armas, validação, registro, carregador/câmara, recarga, disparo, ruído, desenhos |
| `s21-corpo.js` | slots, roupas, proteção por região, penalidades, bônus de atributo, painel corporal, bancada de armas, HUD |
| `s22-menu.js` | agrupamento dos botões do menu de cômodo em seções recolhíveis |
| `README-v50.md` | este arquivo |

### Modificados

| arquivo | mudança |
|---|---|
| `montar.js` | registra `s19`, `s20`, `s21`, `s22` |
| `s15-qualidade.js` | roupa passa a ter durabilidade, taxa por peça e receita de conserto |
| `s19-ficha.js` | `parcelas()` ganha a parcela de equipamento |
| `index.html` | regerado |

Ordem de injeção (importa): `… → s17 → s18 → s19 → s20 → s21 → s22`. A §20
depende da §19 (derivadas) e do §15 (desgaste); a §21 depende das duas; a §22
embrulha `botao()` e por isso tem de ser a última.

---

## 9. Limitações — ditas com todas as letras

1. **Não há modelo 3D, porque não há 3D.** Os equipamentos têm arte vetorial de
   canvas, que é o pipeline real deste projeto. Não é um cubo genérico nem um
   ícone reaproveitado, mas também não é uma malha — e nenhuma quantidade de
   trabalho aqui transformaria este jogo num projeto 3D.
2. **Sem animação de mirar, recarregar ou agachar.** O jogo é de menu. A recarga
   tem duração em segundos e a Destreza a altera, mas não há quadro animado.
3. **Sem raycast, sem penetração de parede, sem cápsula caindo.** Decisão
   documentada na seção 3.
4. **A progressão pós-criação é arquitetura, não conteúdo.** Os atributos são
   salvos separadamente e prontos para ganhar experiência, mas **não há sistema
   de XP ligado** — preferi não forçar progressão artificial e desbalancear o
   jogo. Adicionar depois é mexer em `S.ficha.pontos` por uma regra nova.
5. **Modos `rajada` e `auto` existem nos dados** (a SMG e a carabina os têm) e o
   HUD os mostra, **mas o disparo resolve um tiro por vez.** Num combate de menu
   não há o que uma rajada faça de diferente sem inventar um sistema de tempo
   real. Está declarado em vez de fingido.
6. **Ferramentas de depuração de IA (cone de visão, raio auditivo)** não foram
   feitas: não há mundo espacial para desenhar cone. O `§9` já expõe
   `v9Rastros()` e `S.calor`, que é a informação equivalente aqui.
7. **Não testado**: resoluções variadas, FPS/memória em sessão longa, e
   plataformas além do viewport 390×844.

---

## 10. Organização dos botões (§22)

**Diagnóstico, medido antes de mexer:** 191 botões espalhados por 9 cômodos,
média de 21 por tela. Numa tela de celular isso é uma parede — a ação que você
quer está sempre a seis rolagens de distância, e as três ou quatro que importam
naquele cômodo ficam misturadas com "Ajustes" e "O caderno".

O conserto **não é esconder botão**, é separar o que é *deste* cômodo do que
está sempre disponível em qualquer lugar:

| seção | começa | por quê |
|---|---|---|
| **neste cômodo** | aberta | é a razão de você estar nessa tela |
| **ir para** | aberta, em grade de 2 colunas | atalhos curtos, cabem lado a lado |
| **você** | recolhida | mochila, roupa, machucados — acessível de qualquer lugar |
| **a casa** | recolhida | conversar, cobrar, observar quem está junto |
| **saber** | recolhida | caderno, diário, ajustes, como as coisas funcionam |

Resultado medido, cômodo a cômodo:

```
SÓTÃO     21 → 10 · QUARTO   21 →  8 · DESPENSA 19 → 8
OFICINA   24 → 13 · SALA     22 →  7 · COZINHA  19 → 8
PORÃO     22 → 11 · ENTRADA  20 →  9 · QUINTAL  23 → 12
TOTAL 191 botões · 86 visíveis de saída (45%)
```

Nada sumiu: os 191 continuam lá, e o teste soma os botões dentro das seções pra
provar isso. O que o jogador deixa aberto fica gravado em `S.cfg.grupos`, junto
com o resto das preferências que a v48 já salva.

**A classificação erra pro lado seguro.** O padrão é `aqui`; só sai da primeira
seção o que casa com um padrão conhecido. Assim, botão novo que qualquer bloco
futuro acrescente aparece no cômodo por omissão, em vez de sumir numa gaveta.
Quem quiser mandar explicitamente passa `botao(txt, fn, {grupo:'saber'})`.

Telas com menos de 8 botões não viram seções — não há o que organizar ali.

---

## 11. Testes

**69 verificações em `v50`, 0 falhas.** Registro completo em `TESTES-v50.md`.
Regressão: v49 (chuva e luz), qualidade/baú, AudioManager, gerador, corte e
fuzzer — todos limpos. O `menuteste` cobre agrupamento e bônus de roupa: **13
verificações, 0 falhas.**
