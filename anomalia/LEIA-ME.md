# A Anomalia — subsistema SANITY (V7)

Core em TypeScript puro, sem dependência de engine (§0 regra 7). A camada de
apresentação não é tocada por nenhum módulo daqui.

```
node --experimental-strip-types --test tests/sanity/*.spec.ts   # 27 testes
npx tsc --noEmit -p tsconfig.json                               # strict
```

## O documento chegou cortado

As duas versões que recebi param no mesmo ponto: **§3.3, na linha "Morador do
ab"**. Então existem duas naturezas de conteúdo aqui, e elas estão marcadas no
campo `fonte` de cada entrada de dado — `"spec"` ou `"projetado"`.

**Transcrito do documento, sem alteração:**

| Onde | O quê |
|---|---|
| §1 | `SanityState`, `Anchor`, `MentalSequela` — literais |
| §2 | as seis faixas, chance de ilusão, confiabilidade da UI, bloco de efeitos |
| §3.1 | as 13 perdas por exposição |
| §3.2 | as 13 perdas por encontro, com modificadores e o atraso do alívio tardio |
| §3.1 | o corpo de `applyLoss`, incluindo o clamp em `[0, softCap]` |

**Projetado por mim, porque veio depois do corte:** §3.3 (abrigo e vínculo),
o catálogo de ganhos, os fármacos, o catálogo de ilusões, as vozes noturnas,
a verificação de realidade e o `softCap` — que §1 declara apontando para uma
"§6" que não chegou.

O `softCap` foi lido como: teto que a causa segura. Enquanto houver sequela,
infecção, âncora contaminada ou dívida acumulada, dormir não devolve 100. Tem
piso em 35 para não virar espiral sem saída (regra 5).

## As regras de §0 como teste, não como comentário

`tests/sanity/regras.spec.ts` verifica cada uma:

- **regra 1** — a sanidade nunca sai de `[0, softCap]`; ruptura não mata.
- **regra 3** — toda perda escreve log com causa e com quanto o buffer comeu.
- **regra 4** — `assertCatalogSano()` falha se qualquer ilusão ou voz entrar
  sem tell utilizável. Ilusão sem tell é bug de design, então é bug de build.
- **regra 5** — pity entrega depois de 12 rodadas secas; sequelas têm teto de
  3; abstinência sempre termina; `softCap` tem piso.
- **regra 6** — o mesmo `daySeed` reproduz 20 períodos idênticos; sementes
  diferentes divergem; e os canais são independentes, para que mexer em
  ilusões não mude o replay de um bug de vozes.

## Três coisas que os testes acharam

1. **A pity era um beco sem saída.** §2 dá 2% de ilusão em Lúcido, mas nenhuma
   ilusão do catálogo era elegível nesse estágio — a pity acumulava para
   sempre e nunca entregava. Entrou uma ilusão de nível Lúcido e um fallback
   para o degrau mais baixo.
2. **Dormir pagava buffer duas vezes:** a regra de §1 (2 por hora) mais o
   `buffer` das entradas de sono no catálogo. As entradas foram zeradas; a
   regra do documento é a única fonte.
3. **Um teste meu media a coisa errada** — a sanidade final depois de ganhar
   uma sequela embute a queda de `softCap` que a própria sequela causa, o que
   escondia o modificador de §3.2. Passou a medir pelo log.

## O que falta você me mandar

Do **"Morador do ab"** em diante. Quando chegar, o que eu projetei e o que o
documento disser vão divergir em algum ponto — o campo `fonte` existe para
tornar essa reconciliação mecânica: tudo que estiver como `"projetado"` é
candidato a ser substituído.

Pontos onde eu chutei e que provavelmente têm resposta no trecho que falta:

- o limiar de Ruptura por `realityDebt` (usei 60)
- quantas rodadas secas até a pity (usei 12)
- teto de sequelas por run (usei 3)
- a fórmula do `softCap` inteira (§6)
- se `paranoia` e `realityDebt` decaem sozinhos com o tempo
