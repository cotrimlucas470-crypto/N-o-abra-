# Sobrevivência sandbox: desenho técnico (v0.6 → v0.11)

Pedido: dar **função real a todos os itens**, veículos saqueáveis, tempo/calendário/clima/temperatura,
ferimentos e estado físico, fabricação, construção e móveis. Referência de profundidade: Project Zomboid,
**sem copiar** nada. O mapa expandido não muda; tudo novo é estado (`WorldState`) ou camada.

Regras: lógica pura em módulos testáveis; Phaser só desenha. Nada aparece do nada (loot finito; natureza,
chuva e horta seguem o relógio). Tudo serializa. Nada de arquivo gigante.

## Módulos novos

| Pasta | O quê |
|---|---|
| `sim/Calendar.ts` | data do jogo (dia do mês, mês, dia da semana, estação), dias sobrevividos |
| `sim/Weather.ts` | clima por hora (determinístico pela semente): céu, chuva, vento, temperatura ambiente, previsão |
| `survival/Body.ts` | fome, sede, cansaço, temperatura corporal, molhado, doença, ânimo; estados com efeitos |
| `survival/Thermal.ts` | isolamento das roupas, abrigo, fogo, atividade → para onde a temperatura do corpo vai |
| `survival/Effects.ts` | junta corpo + ferimentos + carga em multiplicadores (velocidade, fôlego, ação, dano) |
| `health/` | partes do corpo, ferimentos, tratamentos, infecção, dor |
| `sim/Actions.ts` | ações com tempo (barra de progresso, cancelar ao andar, avanço rápido do relógio) |
| `items/Equipment.ts` (em `PlayerInventory`) | roupas vestidas por parte do corpo, item na mão, luz, móvel carregado |
| `combat/` | golpe corpo a corpo, tiro (munição na arma, recarga, emperrar, barulho), alvos destrutíveis |
| `vehicles/` | estado de cada carro (portas, porta-malas, capô, trancas, vidros, gasolina, bateria, motor, pneus, alarme) |
| `crafting/` | receitas como dados (entradas, ferramentas com desgaste, estação, tempo, habilidade) |
| `building/` | obras do jogador (paredes, portas, pisos, telhado, móveis), demolição, móveis do mapa carregados |
| `farming/` | canteiros, plantio, rega (chuva conta), crescimento lido pelo relógio |
| `skills/` | habilidades (carpintaria, mecânica, medicina, agricultura, eletrônica, culinária, armas, costura) |
| `save/` | save no aparelho (slot + backup automático + CONTINUAR); nunca apaga sem confirmar |

## Interface

- Painel do sobrevivente (botão da mochila) com abas: **ITENS** (inventário/saque, já existia),
  **CORPO** (roupas, ferimentos, tratamentos, estados), **FABRICAR**, **CONSTRUIR**, **TEMPO**
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
