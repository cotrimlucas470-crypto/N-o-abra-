# Roteiro

A especificação completa e as decisões por trás deste roteiro estão em [PLANO-GERAL.md](PLANO-GERAL.md).
O desenho do sistema de zumbis está em [ZUMBIS.md](ZUMBIS.md). O que cada fase entregou está em [FASES.md](FASES.md).

Regra de cada fase: implementar → testar → procurar bugs → corrigir → medir desempenho → confirmar que o
que já existia continua funcionando → documentar → só então avançar.

| Fase | Conteúdo | Estado |
|---|---|---|
| — | Protótipo (projeto, personagem, mapa inicial, câmera, toque) | ✅ v0.2.0 |
| **1** | **Arquitetura + mapa + câmera + movimento + colisões** | ✅ v0.3.0 |
| 2 | Interação + objetos + portas + containers + inventário (+ save básico) | ⏳ próxima |
| 3 | Sobrevivência básica (fome, sede, energia, sono) | ⏳ |
| 4 | Loot contextual | ⏳ |
| 5 | Zumbis + percepção + IA (+ sistema de ruído) | ⏳ (desenho pronto em ZUMBIS.md) |
| 6 | Combate corpo a corpo | ⏳ |
| 7 | Armas de fogo + munição | ⏳ |
| 8 | Ferimentos + medicina | ⏳ |
| 9 | Crafting + bancadas | ⏳ |
| 10 | Construção + base | ⏳ |
| 11 | Dia/noite + clima + temperatura | ⏳ |
| 12 | Água + energia + geradores | ⏳ |
| 13 | Agricultura | ⏳ |
| 14 | Veículos | ⏳ |
| 15 | NPCs e sistemas sociais | ⏳ |
| 16 | Save/load completo (slots, backups, migração) | ⏳ |
| 17 | Configurações + customização dos controles | ⏳ |
| 18 | Performance e otimização Android (APK) | ⏳ |
| 19 | Polimento visual, animações, áudio | ⏳ |

## Decisões já tomadas

- Movimento analógico em 360° no joystick; teclado em 8 direções.
- Correr é botão liga/desliga; desliga ao soltar o joystick de movimento; mirar impede correr.
- Telhados escondem os interiores até você entrar.
- Objetos girados colidem como fileiras de círculos, e não como caixas gigantes.
- Mundo em **chunks de 16×16 tiles**; só os chunks perto da câmera existem no Phaser.
- Cidade em **setores de 72×56 tiles** com a mesma malha de avenida, rua e becos.
- Navegação em células de 32 px; visão em células de 16 px (janela deixa ver, não deixa passar).
- Tudo o que ajusta uma partida mora em `config/Sandbox.ts` (opções de mundo).

## Ideias anotadas para depois

- Gerar o atlas procedural no build (PNG em cache) para abrir mais rápido em celulares fracos.
- Sombra do telhado com o formato do telhado de 4 águas.
- Mais plantas: escola, hospital, delegacia, igreja, posto, prédio de apartamentos (entram com o loot, Fase 4).
