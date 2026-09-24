# Sobrevivência sandbox: desenho técnico (v0.6 → v0.11)

Pedido: dar **função real a todos os itens**, veículos saqueáveis, tempo/calendário/clima/temperatura,
ferimentos e estado físico, fabricação, construção e móveis. Referência de profundidade: Project Zomboid,
**sem copiar** nada. O mapa expandido não muda; tudo novo é estado (`WorldState`) ou camada.

Regras: lógica pura em módulos testáveis; Phaser só desenha. Nada aparece do nada (loot finito; natureza,
chuva e horta seguem o relógio). Tudo serializa. Nada de arquivo gigante.

## Módulos (como ficaram)

| Pasta | O quê |
|---|---|
| `sim/Calendar.ts`, `sim/Weather.ts` | data, estação, clima por hora (determinístico), previsão |
| `survival/` | `Body` (fome, sede, cansaço, temperatura, molhado, enjoo, ânimo), `Effects` (multiplicadores), `Sleep`, `Hazards` (vidro, tropeço, fogo), `Survivor` (junta corpo, saúde, habilidades, roupas, aparelhos), `SurvivalLoop` (laço por quadro) |
| `health/` | partes do corpo, ferimentos, tratamentos, infecção, dor |
| `sim/Actions.ts` | ações com tempo (barra, cancelar ao andar, relógio acelerado) |
| `items/PlayerInventory.ts` | roupas por lugar do corpo, item na mão, mochila, bolsos |
| `items/consumables.ts` | o que sobra (garrafa, galão, caneca), isqueiro/fósforo |
| `interaction/itemActions/` | ações de item por registro: básicas, medicina, equipamento, fabricação/reparo |
| `combat/` | golpe, tiro, alvos destrutíveis (móveis, portas, janelas) |
| `vehicles/` | estado de cada carro e o que dá para fazer com ele |
| `crafting/` | `Recipes` (dados), `Crafting` (conferir/gastar/entregar), `CraftService` (estações, encaixe, modo construir) |
| `build/` | `StructureCatalog` (peças), `Structures` (estado), `StructureGeometry` (encaixe), `Fire`/`FireSystem`, `Farm`, `BuildSystem` (coletor e horta pelo relógio), `WallCuts` (vãos em paredes do mapa) |
| `skills/` | 9 habilidades (carpintaria, mecânica, medicina, agricultura, eletrônica, culinária, pesca, armas, costura) |
| `save/` | save no aparelho (slot + backup + arquivo do jogo antigo); nunca apaga sem confirmar |

## Interface

- Painel do sobrevivente (botão da mochila) com abas: **ITENS** (inventário/saque), **FABRICAR**
  (receitas e construção), **CORPO** (roupas, ferimentos, tratamentos, estados, habilidades), **TEMPO**
  (calendário, clima, previsão se tiver rádio).
- Botão **Interagir** faz a ação principal; botão **⋯ Opções** lista todas as ações do alvo
  (carro: abrir cada porta, porta-malas, examinar...; móvel: abrir, desmontar, carregar, sentar, dormir).
- Botão **Atacar** (golpe ou tiro) e **Recarregar** quando há arma de fogo na mão.
- Barra de ação em andamento (com CANCELAR). Modo construir: fantasma + GIRAR / CONSTRUIR / SAIR.
- HUD: estados do corpo em pílulas (Fome, Sede, Sono, Frio, Dor, Sangrando...), data, hora e clima.

## Números (ajustáveis em `config/SurvivalTuning.ts` e `Sandbox`)

- Fome enche ~100 em 36 h, sede em 24 h, cansaço em 18 h acordado; dormir tira ~12/h.
- Temperatura do corpo 37 °C; frio abaixo de 36,3; hipotermia 35; calor 37,8; hipertermia 39,5.
- Ações curtas levam 1–8 s reais com o relógio acelerado (o tempo do jogo passa de verdade).

## Fabricação e construção (números em `config/CraftTuning.ts` e `config/BuildTuning.ts`)

- Lenha: ~50 min de fogo por kg de madeira (galho 25 min, lenha 1 h, tora 5 h); papel/capim 6 min.
- Acender: com isca 90%, com acelerante 100%, só lenha 30%. Chuva forte apaga fogo com menos de 25 min.
- Água da rua: 12 dias; gás: 18 dias (`Sandbox.utilities`). Caixa da descarga: 6 doses, suja.
- Paredes: madeira 300, tijolo 900, chapa 1200 de resistência (os zumbis vão usar isso).
- Derrubar parede do mapa: 45 min, cansaço +8, barulho de 750 px, rende 3 tijolos.
- Horta: `Sandbox.farming.growthSpeed` = 4 (tomate 15 dias); 2 dias sem água param, 5 matam.
