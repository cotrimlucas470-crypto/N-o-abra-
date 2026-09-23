# Roteiro

Uma etapa por vez. Depois de cada etapa: verificar arquivos, procurar erros, corrigir bugs, checar desempenho
e controles, e garantir que o que já funcionava continua funcionando (`npm run verificar` + `npm run smoke`).

| # | Etapa | Estado |
|---|---|---|
| 1 | Projeto (Phaser 4 + TypeScript + Vite, estrutura, testes, pacote) | ✅ feito |
| 2 | Personagem (8 direções/analógico, aceleração, colisão, animação, fôlego, vida) | ✅ feito |
| 3 | Mapa (Setor 1: cruzamento, casas, abrigo, mercadinho, oficina, praça, estacionamento) | 🟡 base pronta |
| 4 | Câmera (segue com suavidade, olha à frente, zoom por aparelho) | 🟡 base pronta |
| 5 | Controles touch (2 joysticks, correr, pausa, tela cheia, layout em dados) | 🟡 base pronta |
| 6 | Primeiro zumbi (IA: parado → patrulha → ouve → investiga → persegue → ataca → procura → volta) | ⏳ |
| 7 | Combate (corpo a corpo e armas; ruído chama zumbis) | ⏳ |
| 8 | Loot (tabelas por tipo de local e cômodo, com probabilidade) | ⏳ |
| 9 | Inventário (slots, peso, categorias, empilhar, usar/equipar/descartar/transferir) | ⏳ |
| 10 | Primeiro interior "de verdade" (portas, cômodos com loot, áreas trancadas) | ⏳ |
| 11 | Dia e noite (iluminação dinâmica, lanterna, sombras que giram) | ⏳ |
| 12 | Base (melhorias, armazenamento, defesa) | ⏳ |
| 13 | Crafting (árvore com desbloqueio gradual) | ⏳ |
| 14 | Progressão (XP, nível, fome, sede, temperatura) | ⏳ |
| 15 | Regiões adicionais (centro, comercial, industrial, hospital, delegacia, militar...) | ⏳ |
| 16 | Chefes | ⏳ |
| 17 | Eventos (hordas, sobreviventes, rádio, chuva, queda de energia) | ⏳ |
| 18 | Polimento (som, partículas, clima, APK/Play Store) | ⏳ |

As etapas 3, 4 e 5 já têm a base funcionando (era preciso ter algo jogável na Etapa 2). Quando chegarmos
nelas, o trabalho é **aprofundar**: mais tipos de construção e ruas, ajustes finos de câmera, tela para
reposicionar botões e botões de ação.

## Decisões já tomadas

- Movimento analógico em 360° no joystick (inclui as 8 direções); teclado anda em 8 direções.
- Correr é um botão **liga/desliga** (com os dois polegares ocupados não dá para segurar um botão).
  Desliga sozinho ao soltar o joystick de movimento. Mirar impede correr.
- Telhados escondem os interiores até você entrar: o que tem dentro de uma casa é surpresa.
- Colisão justa para objetos tortos (carro batido vira uma fileira de círculos, e não uma caixa enorme).

## Ideias anotadas para depois

- Gerar o atlas procedural no build (PNG em cache) para abrir mais rápido em celulares fracos.
- Sombra do telhado com o formato do telhado de 4 águas.
- Janelas quebráveis; portas que abrem e fecham (com barulho).
