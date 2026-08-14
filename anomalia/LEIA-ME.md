# A Anomalia — core

Dois subsistemas, em TypeScript puro, sem dependência de engine. A camada de
apresentação não é tocada por módulo nenhum daqui.

| | |
|---|---|
| `core/sanity/` + `data/sanity/` | **SANITY (V7)** — 27 testes |
| `core/anomaly/` + `data/anomalies/` | **ANOMALY (V8)** — 88 testes |

```
npm test            # 115 testes
npm run check       # tsc strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
```

---

# ANOMALY (V8)

12 anomalias, 16 armas brancas, 6 mochilas, 7 tabelas de contato, 5 mutações.
Nenhuma frase que o jogador lê nasce em `.ts` — §0 regra 7.

## As sete regras de §0 como teste, não como comentário

`tests/anomaly/regras.spec.ts` verifica cada uma:

- **regra 1 — anomalia não morre.** Não existe campo de vida, dano ou armadura
  em nenhuma definição, e o teste falha se alguém acrescentar um. Toda arma
  tem `delayTicks > 0` e uso secundário: ela compra segundos, não mata.
- **regra 2 — conjunto de regras de percepção.** O que ela percebe e o que ela
  ignora nunca se cruzam, e o que está em `blindTo` dá detecção zero mesmo com
  o estímulo em 100, encostado nela.
- **regra 3 — sempre avisa, em 3 camadas.** Detecção no talo desde o primeiro
  tick, para as 12: nenhuma chega em `CACA` sem ter emitido `ambient`, `audio`
  e `direct`. Mais o contrato de escrita de §5, aplicado a cada linha.
- **regra 4 — uma tela, 3 a 5 opções.** 12 anomalias × 25 sementes: sempre
  entre 3 e 5, sem opção repetida, e a escolha resolve na hora.
- **regra 5 — fraqueza descobrível.** Um teste por linha da tabela de §2, em
  `tests/anomaly/fraquezas.spec.ts`. E nenhum campo chamado `tutorial`,
  `weakness` ou `dica` em lugar nenhum.
- **regra 6 — determinismo.** `daySeed + encounterId` reproduz o encontro; o
  mesmo dia reproduz o mapa inteiro; sementes diferentes divergem.
- **regra 7 — dados em JSON.** Toda opção, todo telegraph e todo texto de
  encontro vêm do catálogo.

## A tabela de fraquezas de §2, executada

Uma fraqueza que só está escrita na tabela é promessa. Cada linha virou teste:

| Anomalia | O que o teste prova |
|---|---|
| A01 | som e voz em zero ⇒ detecção 0 em **todas** as distâncias, mesmo se mexendo com a lanterna acesa |
| A02 | imóvel por 2 ticks (20s) zera — **e correr antes não salva**: o corpo continua acima do limiar de calor |
| A03 | ferimento tratado ⇒ invisível; sem tratar, o rastro dura **35 ticks** |
| A04 | lanterna apagada ⇒ detecção 0; e é o rastro que some mais rápido do catálogo |
| A05 | metal em zero ⇒ passa livre; e a lâmina de vidro-osso passa sem largar nada |
| A06 | 30 ticks em `CACA` e a distância não muda um centímetro |
| A07 | calado ⇒ detecção 0; falou uma vez ⇒ ela acha |
| A08 | 40 dias de ecologia em tempo seco e ela não entra no mapa nenhuma vez |
| A09 | fecha menos de 2 m/tick — dá pra andar embora. A fome fecha mais |
| A10 | instancia duas, exatamente uma marcada como falsa |
| A11 | `blindTo` vazio, parado não adianta, e o preço de fugir é o mais alto |
| A12 | só ativa em `ABRIGO`, em 40 dias de ecologia |

E mais um: nenhuma das 12 lê o mundo igual a outra. Duas anomalias com a mesma
assinatura de sentidos seriam a mesma anomalia com dois nomes.

## Onde o documento se contradiz, e o que eu fiz

Sete pontos. Todos estão comentados no módulo onde moram.

**1. §4 "subir é fácil" × §0 regra 3.** Tomado ao pé da letra, uma detecção que
pula de 10 para 95 num tick leva `DORMENTE` direto a `CACA` e as três camadas
de aviso nunca saem — que é exatamente o que regra 3 chama de bug de design.
`escadaDeSubida` limita a subida a um degrau por tick. "Subir é fácil" continua
valendo (um tick por degrau, sem cooldown) e "descer é lento" também
(`persistence` ticks por degrau). Sem isso, 12 de 12 anomalias furavam a regra 3.

**2. §5 pede 12 palavras por linha; a linha do próprio documento tem 14.**
`"Ela para. Ergue o rosto que não tem. Cheira o ar onde você está."`, de §2, é
transcrição literal. Os quatro exemplos que §5 dá como aprovados são todos de
frases curtas, então a contagem é **por frase**. Com essa leitura a linha
transcrita passa e nenhum dos exemplos de §5 muda de veredito.

**3. §10 `MUT_SILENCIOSA` × regra 3.** A mutação apaga a camada de áudio; a
regra diz que o aviso é inegociável. Só cabem juntas de um jeito: o que a
mutação tira é o **canal**, não o aviso. Sem o arrastar, o que chega na camada
do meio é a camada vaga — pior de ler, e é esse o ponto da mutação.

**4. §6 diz "22% de perder a arma, 11% de contato" para Cortar passagem; §7
traz 11/7, 14/9 e 19/13 por classe.** Nenhum bate. Quem resolve é §7, porque é
o que está escrito como código; a linha de §6 ficou como o que o jogador *acha*
que sabe.

**5. §6 usa `ctx.hasLockableRoom` e `sanity.stage >= 'RACHADO'`.** `ctx` não
estava na assinatura — virou parâmetro. E a comparação de estágio, numa união
de literais, compara alfabeticamente: `'DESFEITO' >= 'RACHADO'` dá **false**, o
que desligaria a opção fantasma justamente em quem está pior. Virou comparação
de posto.

**6. §11 `adapt()` devolve ora `SenseProfile[]`, ora `{ persistence: '+6' }`.**
Não fecha em tipo nenhum porque são dois efeitos diferentes. `Adaptation`
carrega os dois.

**7. §7 chama o campo de `blade.weight` e conhece três classes; §13 chama de
`blade.class` e acrescenta IMPROVISADA e UTIL.** O campo é `class`, e
`classeDeAtraso` mapeia as duas novas para as três tabelas de §7. E onde §7
deriva o atraso da classe (3/4/6), §13 dá um por arma (estilete 2, faca 3, as
duas LEVE) — o da arma vence, que é o dado mais específico; a fórmula em volta
é a de §7, intacta.

## Duas decisões que não são reconciliação, são projeto

**O `decay` de §1 é da anomalia, não do mundo.** "Quanto o rastro persiste por
tick" só faz sentido como o que **ela** ainda tem do seu rastro depois que você
parou de produzi-lo. Por isso mora em `AnomalyInstance.residual`. É o que faz
ficar imóvel custar dois ticks contra quem lê movimento e nenhum contra quem lê
luz — e é o que dá peso à fraqueza do A03: 35 ticks de rastro de sangue.

**O bônus de `MARCADO` amplifica, não conjura.** §8 manda somar +25 em toda
detecção. Somado antes do teste de limiar, um jogador marcado e imóvel no
escuro seria achado por quem só lê movimento, e as fraquezas de §2 iriam junto.
O +25 entra só quando já existe rastro. `computeDetection` ganhou um quinto
parâmetro opcional para isso, então a chamada de quatro argumentos escrita em
§3 continua válida palavra por palavra.

## Três coisas que os testes acharam

1. **`MUT_SILENCIOSA` quebrava o jogo, não só a regra.** `emitTelegraph` fazia
   `pick([])` numa lista vazia e lançava. Toda instância mutada travava ao
   entrar em `BUSCA`.
2. **Reparar chega num ponto em que não vale mais.** Cada conserto come 1 de
   `maxDurability` e devolve 6; a partir de certa altura o restauro não cabe no
   que sobrou e a arma responde `JA_INTEIRA`. Não era intencional, é
   consequência da regra de §13, e é boa: virou teste.
3. **O rastro de sangue de A03 dura 35 ticks.** Passa dos 20 que eu tinha
   chutado no teste. Com `persistence 14`, um ferimento aberto significa ser
   caçado por quase seis minutos in-game. É caro e devia ser: virou número
   fixado em teste, não mais um efeito colateral.

## O que é do documento e o que é meu

O campo `fonte` marca cada entrada. Do documento, literais: o bloco de tipos de
§1, `computeDetection` e `ENV_PRESETS` de §3, a tabela de limiares, `tick` de
§4, `emitTelegraph` de §5, a montagem de pool de §6, `resolveBladeDelay` e as
três tabelas de §7, `CT_LACERANTE` inteira de §8, `assignDailyAnomalies` de §9,
os cinco patches de §10, `adapt` de §11, a tabela de §12, as 16 armas de §13,
as 6 mochilas, os 6 módulos e `overloadPenalty` de §14, e a definição completa
de `A03_FARO`.

Projetado: os `SenseProfile` e os telegraphs das outras 11 anomalias (a tabela
de §2 dá id, apelido, o que percebe, para o que é cega e a fraqueza; os números
foram escritos para cumprir essa linha), as outras 6 tabelas de contato, os
textos das opções canônicas e das fantasmas.

---

# SANITY (V7)

## O documento chegou cortado

As duas versões que recebi param no mesmo ponto: **§3.3, na linha "Morador do
ab"**. O campo `fonte` de cada entrada marca `"spec"` ou `"projetado"`.

**Transcrito, sem alteração:** o bloco de §1 (`SanityState`, `Anchor`,
`MentalSequela`), as seis faixas de §2, as 13 perdas por exposição e as 13 por
encontro de §3.1 e §3.2 com modificadores e o atraso do alívio tardio, e o
corpo de `applyLoss` incluindo o clamp em `[0, softCap]`.

**Projetado:** §3.3 (abrigo e vínculo), ganhos, fármacos, catálogo de ilusões,
vozes noturnas, verificação de realidade e o `softCap` — que §1 declara
apontando para uma "§6" que não chegou. Lido como: teto que a causa segura.
Enquanto houver sequela, infecção, âncora contaminada ou dívida acumulada,
dormir não devolve 100. Piso em 35 para não virar espiral sem saída (regra 5).

## As regras de §0 como teste

- **regra 1** — a sanidade nunca sai de `[0, softCap]`; ruptura não mata.
- **regra 3** — toda perda escreve log com causa e com quanto o buffer comeu.
- **regra 4** — `assertCatalogSano()` falha se qualquer ilusão ou voz entrar
  sem tell utilizável. Ilusão sem tell é bug de design, então é bug de build.
- **regra 5** — pity entrega depois de 12 rodadas secas; sequelas têm teto de
  3; abstinência sempre termina; `softCap` tem piso.
- **regra 6** — o mesmo `daySeed` reproduz 20 períodos idênticos, e os canais
  são independentes: mexer em ilusões não muda o replay de um bug de vozes.

## Três coisas que os testes acharam

1. **A pity era um beco sem saída.** §2 dá 2% de ilusão em Lúcido, mas nenhuma
   ilusão do catálogo era elegível nesse estágio. Entrou uma de nível Lúcido e
   um fallback para o degrau mais baixo.
2. **Dormir pagava buffer duas vezes** — a regra de §1 (2 por hora) mais o
   `buffer` das entradas de sono. As entradas foram zeradas.
3. **Um teste meu media a coisa errada** — a sanidade final depois de ganhar
   uma sequela embute a queda de `softCap` que a própria sequela causa. Passou
   a medir pelo log.

---

## Onde os dois se encostam

§12 do V8, inteiro em `core/anomaly/sanityLink.ts`:

| Estágio | Efeito sobre anomalias |
|---|---|
| Lúcido | telegraphs 100% verdadeiros |
| Tenso | 8% falso |
| Fissurado | 18% falso; distância exibida erra ±2 |
| Rachado | 30% falso; opção fantasma na tela |
| Desfeito | 45% falso; anomalias inexistentes com telegraph completo |
| Ruptura | encontro sem opção de fuga |

Mais: o contato de §8 passa por `applyLoss` do V7, então o `stressBuffer`
amortece — encontrar uma anomalia com a cabeça descansada custa menos que
encontrar a mesma anomalia no fim de um dia ruim. E a mochila costurada à mão
de §14 é âncora do V5: destruída, custa 30 de sanidade.

## O que ainda falta você me mandar

Do V7, **"Morador do ab"** em diante. Quando chegar, tudo que estiver marcado
como `"projetado"` é candidato a ser substituído — o campo existe para tornar
essa reconciliação mecânica.

Pontos onde eu chutei no V7 e que provavelmente têm resposta no trecho que
falta: o limiar de Ruptura por `realityDebt` (usei 60), quantas rodadas secas
até a pity (12), teto de sequelas por run (3), a fórmula do `softCap` (§6), e
se `paranoia` e `realityDebt` decaem sozinhos.

Do V8, o documento chegou inteiro — §0 a §14.
