# O que mudou — em palavras simples

As imagens estão em `docs/imagens/`. O vídeo está em `docs/nao-abra-showcase.webm`.
Pra ver a demonstração rodando e mexer nela, abra `docs/showcase.html`.

---

## 1. A casa lembra do que aconteceu nela

Antes: a casa guardava tudo num caderno invisível. Se alguém morria num cômodo,
o jogo sabia — mas o cômodo continuava com a mesma cara.

Agora cada coisa que acontece tem um **peso**:

| o que aconteceu | quanto pesa |
|---|---|
| abriu a porta | 1 |
| alguém se arrastou | 2 |
| houve sangue | 3 |
| a casa cedeu | 4 |
| a costura desfez | 5 |
| o hóspede se instalou | 6 |
| houve invasão | 8 |
| **alguém morreu** | **10 (nunca some)** |
| ritual | 15 (nunca some) |
| anomalia forte | 20 |

O peso somado vira tinta no cômodo, em quatro camadas:

- **peso 4** — arranhão no chão
- **peso 10** — mancha que não sai
- **peso 18** — trinca na parede, com reboco solto
- **peso 32** — o cômodo abandonado: infiltração escorrendo do teto

E **morte deixa cicatriz que não cicatriza**: a sombra fica no chão, a marca
seca em volta, e a parede atrás nunca mais clareia. Passa 90 dias e continua lá.

O resto cicatriza 0,6 de peso por dia. Uma invasão desbota em 30 dias.

**Toda alteração sabe de onde veio** (aconteceu mesmo / a casa cedendo / alguém
da casa / alguma coisa fez / a anomalia mexeu / alguém contou / só na sua
cabeça), e dá pra investigar o cômodo pra descobrir — o jogo entrega a
**confiança** da origem, não a verdade. Onde já houve anomalia, a memória pode
mentir.

## 2. As texturas ganharam fundura

Sulco de verdade tem **luz numa quina e sombra logo abaixo**, a menos de um
pixel de distância. É isso que o cérebro lê como fundura.

- madeira: muda 38,8% do tecido
- metal escovado: 54,3%
- concreto: 3,2% — só as covas grandes, porque cova de meio pixel não tem
  dentro pra luz bater

Dá pra desligar o relevo e redesenhar (`texRelevo(false)`), que é como a
demonstração compara os dois lados sem truque de filtro.

## 3. Os rostos na porta

Cinco tipos bem diferentes: criança, adulto, velho (grisalho, com barba),
ferido (sangue seco), e o que **não é gente** — olhos em alturas diferentes,
pupila que devolve a luz do lampião, os dois lados do rosto idênticos.

Luz do lampião de cima e da esquerda, pálpebra, anel da íris, osso da bochecha,
cabelo com risca. E eles piscam.

## 4. As 15 silhuetas

Já existiam no código e **nunca chegavam à tela**. Agora aparecem no caderno.

## 5. Os dois invasores novos

- **O Observador** — inverte o incentivo. Olhar pra ele alimenta ele. Ignorar
  faz o interesse cair. Ele nunca encosta em você.
- **O Hóspede** — não ataca. Se instala num cômodo e, em quatro fases, o cômodo
  deixa de ser seu.

---

## O que NÃO tem

**Os adoradores não existem.** Estavam na etapa 6 do plano da v71 e nunca foram
construídos — zero ocorrências no código. A demonstração não inventa uma cena
pra eles. Se você quiser, é a próxima coisa que dá pra fazer.

---

# Parte 2 — as anomalias e a exploração

## 6. A anomalia agora tem passado, e MUDA porque você repetiu

Antes ela aparecia, resolvia e sumia. Na próxima vez era a primeira vez de novo.

Agora cada uma tem uma **ficha** no caderno: quantas vezes veio, por qual método
você a encerrou (e quantas vezes cada um), quantas vezes ela te pegou, o que ela
aprendeu, e a marca que deixou na casa.

**A mutação é causada por você.** Resolveu três vezes com o mesmo método? Ela
aprende contra aquele método — e aquele método **para de funcionar**.

| você repetiu | ela fecha | e abre no lugar |
|---|---|---|
| fugir | fugir | esconder |
| esconder | esconder | fugir |
| lutar | lutar | esconder |
| luz | luz | som |
| som | som | rastro |
| olhar | olhar | luz |
| desistir | desistir | fugir |
| reparar | reparar | selar |
| selar | selar | reparar |

Toda mutação **abre uma porta junto com a que fecha**, e fala as duas na tela.
Fechar sem abrir viraria beco sem saída, e beco sem saída não é dificuldade.

Isso deixa o jogo mais difícil **sem inflar número nenhum**: o que encolhe é o
seu repertório, não a vida dela.

## 7. Seis funções: o que cada uma FAZ

Antes, `categoria` só dizia por qual sentido ela chega. Agora tem um segundo
eixo — o que ela faz:

- **predador** — vai atrás de você
- **parasita** — come um recurso seu, devagar
- **arquiteto** — muda a casa de lugar
- **testemunha** — repete o que você fez
- **semente** — gera outra
- **guardião** — tranca alguma coisa

As 23 do catálogo estão mapeadas, e as seis são usadas. Até as avarias se
separam: calha **come**, rachadura **abre**, porta emperrada **tranca**.

## 8. A semente gera filha — e a filha herda

Uma anomalia SEMENTE gera cria na terceira aparição. A cria **nasce com as
mutações da mãe** e com metade do estudo dela. É aí que repetir método cobra
juros: o hábito que fechou uma porta na mãe já nasce fechado na filha.

## 9. As marcas que ficam na casa

Resolver uma anomalia deixa uma marca permanente. Toda marca tem **os dois
lados**:

| a marca | o lado bom | o lado ruim |
|---|---|---|
| o caminho aberto | o passo custa 22% menos tempo | e faz 35% mais barulho |
| o cano que aprendeu a vazar | +1 galão de água por dia | e +0,6 de ruído por dia |
| a parede que não voltou | dois cômodos ficaram ligados | o vão serve pros dois lados |
| o eco que ficou | você ouve um cômodo mais longe | e o que caça ouve 25% melhor |
| a ninhada | as crias nascem já conhecidas | porque elas nascem |
| a tranca que sobrou | o passo custa um minuto a menos | e 30% mais ruído |

Marca só-boa seria prêmio por respirar; só-ruim, castigo por ter jogado. As duas
pontas fazem você **escolher qual anomalia deixar viva mais tempo**.

---

## 10. O cômodo ganhou coisas dentro

**O problema, medido:** a tela principal tinha 22 botões, e 16 eram menu e
leitura. A única coisa que dava pra FAZER num cômodo era "Vasculhar o cômodo · 1
hora", genérico, igual nos nove.

Agora são **35 coisas com nome próprio** — o armário do quarto, a tábua solta do
sótão, a caixa de fusíveis da oficina, a gaveta que não abre — e **seis verbos**
que custam diferente:

| verbo | custo | barulho |
|---|---|---|
| olhar | de graça | 0 |
| encostar o ouvido | de graça | 0 |
| abrir | 1 hora | 3 |
| arrastar | 1 hora | 7 |
| forçar | 1 hora | 14 |
| pregar por cima | 2 horas + tábua e prego | 9 |

O que você abriu fica aberto. O que você pregou fica pregado. Para sempre.

## 11. E o fio que liga tudo: o FOCO

**Toda anomalia ativa ancora numa coisa da sua casa.**

- **Olhar** a coisa certa te dá uma insinuação
- **Encostar o ouvido** entrega: "isso é o foco da Coisa de Muitas Bocas"
- **Pregar tábua por cima** do foco **resolve de vez**

O foco não é sorteado: ele segue a **categoria** da anomalia — sonora ancora no
que conduz som (a pia, a cisterna), espacial no que abre passagem (a escada, o
muro), cognitiva no que guarda memória de gente (o retrato, a caixa de fotos).
Quem entendeu a regra procura no lugar certo.

Antes disto, exploração e anomalia eram dois jogos que nunca se tocavam: a
anomalia era de noite, a exploração de dia. Agora **de dia você caça a âncora, de
noite ela vem**.

## 12. A expedição ganhou chão

**O problema, medido:** uma expedição inteira eram três decisões — por onde
entra (2 opções), o que procura (2), por onde sai (2). Oito permutações por
lugar, e cada opção era a mesma coisa por dentro: `+1 risco` ou `×1.2 saque`.

Agora você **anda pra dentro do lugar**. Cada lugar tem 3 a 5 pontos, do raso ao
fundo:

```
a soleira → o pátio → o estoque → o fundo do prédio
fundura 0     1           2            4
rende 7      19          61          136
```

O fundo rende **20x** a soleira. E custa:

- **luz** — lanterna com pilha de sobra chega na fundura 3; sem lanterna você não
  passa da entrada. E a caminhada **queima uma pilha**.
- **risco** — sobe a cada ponto
- **a luz acabar** — você sai no escuro e deixa 25% do saque cair pelo caminho

**Escutar antes de ir é de graça** e diz o que tem no próximo ponto. O aviso vem
antes do perigo, sempre.

**O ponto que você esvaziou fica vazio** na próxima visita. Voltar ao mesmo lugar
vira decisão em vez de repetir a mesma roleta.

## 13. O ninho — a razão de ir fundo que não é saque

Um ponto fundo pode guardar **o que explica uma anomalia que está na SUA casa**.
Não é saque: é papel, e o papel fala de uma coisa que você conhece. Ler rende 34
pontos de estudo na ficha dela.

Cada anomalia tem UM lugar na cidade onde o ninho dela mora.
