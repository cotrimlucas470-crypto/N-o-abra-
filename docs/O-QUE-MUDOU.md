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
