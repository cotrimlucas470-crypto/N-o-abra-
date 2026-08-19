# CHANGELOG

## v52 — curva de dificuldade

Multiplicador **único e centralizado** em `s25-dificuldade.js`, com `DIF_CFG`.

    dia 1 → 0.60     sobe (smoothstep, 12 dias)     satura → 0.80

Nunca volta a 1.00, nunca passa de 0.80. A redução permanente de 20% é o teto;
os 40% do dia 1 são a rampa.

### Cinco pontos de aplicação, um embrulho cada

| função | o que controla | modo |
|---|---|---|
| `riscoInvasao` | frequência das anomalias | direto |
| `escassez` | escassez de recursos | direto |
| `pegarMal` | dano recebido (duração do mal) | direto |
| `gastoComida` | custo de fome | direto |
| `folegoPorta` | agressividade suportada | **inverso** |

**Por que `folegoPorta` é inverso:** ele diz quantos encontros você aguenta numa
invasão. Multiplicar por 0.60 ali teria deixado o jogo **mais difícil**, não
menos. Existe `difInverso()` separado, com nome diferente, pra ninguém aplicar o
errado por distração.

### Prova de que não há dupla aplicação

O teste instrumenta `dif()` e conta quantas vezes ela é chamada por invocação de
cada função embrulhada. **Todas devolvem exatamente 1.** Além disso
`embrulharUmaVez()` recusa um segundo embrulho e avisa no console — o teste
tenta embrulhar `escassez` de novo e prova que o valor não muda.

### Uma coisa que foi pedida e NÃO existe neste jogo

**"Tempo de reação exigido em eventos".** Não há nenhuma decisão com prazo: o
jogo é de menu e espera indefinidamente pelo toque. A varredura achou um único
`setTimeout` resolvendo promessa, e é o vigia anti-travamento. A tela do resgate
diz "você tem uns quarenta segundos pra decidir", mas é texto — não há contagem.
Está declarado em vez de fingido. Se um dia existir decisão com prazo, ela usa
`difInverso()` e nada mais precisa mudar.

### Um defeito que o teste achou

`dificuldadeNoDia(1e9)` saturava em 0.80 mas `dificuldadeNoDia(Infinity)` caía
em 0.60 — duas respostas opostas para "número absurdo". A regra virou explícita:
**não-número é save corrompido e cai no dia 1** (o mais fácil: diante de estado
quebrado o benefício é do jogador); **número válido, ainda que absurdo, satura**.

### Save

Nada a migrar. A dificuldade é função pura de `S.dia`, que todo save já tem.
Quem estava no dia 7 entra na curva no ponto do dia 7 — nem punido nem
presenteado. Guardar o multiplicador no save criaria um segundo lugar onde a
verdade mora, e um save velho ficaria preso numa curva antiga pra sempre.

### Debug

    difDia(20)     pula pro dia 20 e mostra o multiplicador na tela
    difTabela()    imprime a curva inteira
    difEstado()    dia, valor, inverso, config e os cinco pontos

### Testes

`difteste`: **24 verificações, 0 falhas**. Regressão: `fugateste`, `expteste`,
`v50`, `qual` — 0 falhas.

---

## v51 — auditoria, expedição transacional e fuga jogável

Quatro fases, quatro commits. O resumo do que quebrou, por que quebrou e o que
mudou.

---

### O que quebrou, e por quê

**O jogador saía pra rua, achava coisas, e voltava pra casa sem nada — com uma
tela dizendo "O jogo travou aqui".**

A causa não era o que parecia. Não era exceção no código de coleta, não era save
sobrescrito, não era sprite faltando (este jogo não usa sprite nenhum). Era uma
**colisão de nome global**.

O jogo é distribuído como um HTML só, e `montar.js` injeta 14 blocos `.js` dentro
dele. Todos compartilham **um escopo global único**: 1 200 nomes de topo num
espaço só. Quando dois blocos escolhem o mesmo nome sem saber um do outro, o
segundo apaga o primeiro — **sem erro nenhum na carga**.

Foi o que aconteceu duas vezes:

| nome | o que era | o que passou a ser |
|---|---|---|
| `capacidade` | quantos **quilos** você carrega na expedição, recebe o **parceiro** | quantos **slots** um baú tem, recebe o **id do baú** (§16) |
| `ficha` | desenha uma **linha de tela** `(nome, tag, texto)` | devolve a **ficha de personagem** `()` (§19) |

A primeira colisão fazia `etapaCarga` chamar `BAUS[parceiro].slots` na sua
primeira linha — antes até de `limpar()`. Por isso a tela nem trocava: o jogador
ficava olhando o texto do saque com a barra de ações vazia, até o vigia disparar
14 segundos depois. E como o saque só era creditado no **fim** de `recolher()`,
voltar pra casa pelo botão do vigia significava perder tudo.

Medido: **28 estouros em 63 expedições**. Praticamente toda saída pra rua que
chegava na tela de carga.

A segunda colisão era silenciosa de outro jeito: 20 e tantas listas do jogo
— gente no abrigo, itens do saque, bancada de armas — simplesmente **pararam de
desenhar**.

Nenhuma das duas apareceu em teste nenhum durante versões inteiras, porque
nenhuma produz erro.

---

### O que mudou

#### Fase 0 — auditoria (`docs/AUDITORIA.md`)
Mapa da arquitetura, da máquina de estados, dos nove depósitos de inventário,
dos pontos de save, dos teleportes e dos acoplamentos indevidos. Nenhuma linha de
código alterada. Veredito das seis hipóteses do briefing: **H2 confirmada**, H1
confirmada em parte, H3/H4/H5/H6 descartadas como causa.

#### Fase 1 — a expedição parou de comer o saque
- `s16`: `capacidade` → **`capacidadeBau`**
- `s19`: `ficha()` → **`fichaJogador()`**
- **`montar.js` quebra o build** se um nome novo colidir. As cinco substituições
  deliberadas estão declaradas em `COLISAO_OK`, cada uma com o motivo escrito.
- **`s23-expedicao.js`** (novo): o saque virou transacional. O `levar` deixou de
  ser variável local e passou a ser `S.exped.levar`, **dentro do estado salvo**.
  Mesma referência de objeto, então a fuga que corta 40% e o susto que corta pela
  metade continuam funcionando sem uma linha alterada.
  - cada pegada marca o save: o que está na sua mão está no disco
  - travou no meio? na próxima abertura o saque volta com você
  - `socorro()` deixou de descartar trabalho: credita antes de levar pra casa
  - achado sem nome, sem quantidade ou com peso `NaN` é registrado e ignorado
  - erro parou de ser engolido: console com contexto + anel de 20 em `S.erros`

#### Fase 2 — varredura (`docs/BUGS.md`)
755 cliques aleatórios em 5 sementes, com toda função global embrulhada num
`try/catch` que denuncia quem estoura, e invariantes checados a cada 20 cliques.
Depois da Fase 1: **0 estouros, 0 invariantes violados, 0 travamentos**.
- **Backup do save**: eram 7 gravações por save, uma por bloco, sem nenhuma cópia
  de segurança. Agora o conteúdo anterior vai pra uma chave de sombra antes da
  primeira gravação (uma escrita por save, não sete), e a carga cai pro backup se
  o principal estiver ilegível.

#### Fase 3 — fugir deixou de ser derrota
`mover()` terminava com `if(PLANTA[dest].saida) return escapou(I)`, e `escapou()`
terminava em `fim('fuga')`. **Andar pro quintal durante uma invasão acabava a
partida.**

**`s24-fuga.js`** (novo) transforma isso num estado com fases legíveis:

```
INVADINDO → VASCULHANDO → SAINDO → SEGURO → RESET
```

- **Quintal e rua são áreas jogáveis**, cada uma com ações próprias: esperar e
  escutar, se enfiar mais fundo no esconderijo, trocar de área, espiar a casa por
  uma fresta, entrar.
- **A regra que faz isso ser jogo:** se ela sai **pelos fundos**, o quintal fica
  perigoso; se sai **pela frente**, a rua. Você ouve pra onde ela está indo e
  escolhe onde esperar.
- **A casa é desenhada de fora**, e a janela do cômodo em que ela está acende com
  a silhueta atravessando. É o "observar a silhueta se movendo" pela via que este
  projeto tem — não há mundo 3D aqui.
- **Nunca machuca sem avisar:** o primeiro erro é susto ("ela cheira o ar, você
  não respira, ela segue"). Só o segundo cobra, e mesmo assim fere e empurra pro
  outro lado — não mata.
- **Consequências em vez de derrota:** ela leva comida, diesel, remédio ou item
  da mochila; arrebenta muro, calha, tábua ou armadilha; acha quem ficou
  escondido. Ficar muito tempo fora custa sanidade, e a volta custa comida.
- **`FUGA_CFG`** concentra todo tempo, chance e custo, cada um comentado. Nenhum
  número solto no meio da lógica.

#### Fase 4 — testes
| suíte | verificações |
|---|---|
| `expteste` — expedição transacional | 19, 0 falhas |
| `fugateste` — ciclo da invasão e fuga | 30, 0 falhas (estável em 3 voltas) |
| `baktest` — backup do save | 6, 0 falhas |
| `varre` — varredura ampla | 0 estouros, 0 invariantes violados |
| regressão: `v50`, `v49`, `qual`, `equipteste`, `menuteste`, `corte`, `gerteste`, `am` | 0 falhas |

---

### Migração de save

Os campos novos (`exped`, `erros`, `fuga`) **não existem** num save antigo, e a
ausência já é o estado correto: ninguém estava no meio de uma expedição nem do
lado de fora de casa. Nada a converter, nada quebra.

---

### Mudanças que quebram compatibilidade de API

Se você tinha código ou teste chamando estes nomes, precisa atualizar:

| antes | agora |
|---|---|
| `capacidade(idDoBau)` | `capacidadeBau(idDoBau)` |
| `ficha()` (ficha de personagem) | `fichaJogador()` |

`capacidade(parceiro)` e `ficha(nome, tag, texto)` voltaram ao significado
original.

---

### O que ficou aberto

- **`cena.modo` é sobrecarregado.** `'vazio'` significa ao mesmo tempo "estou num
  cômodo" e "estou numa cena de corte". 28 pontos de escrita. Já causou três bugs
  distintos. Separar em `modo` + `jogavel` mexe em 28 lugares e o risco é maior
  que o ganho nesta rodada.
- **`sustoAntigo()` é código morto** (`index.html:10172`, começa com
  `if(true)return false`).
- **Não medido:** FPS e memória em sessão longa, outros navegadores, e se alguma
  colisão existe dentro de objetos (`X.metodo = ...`) — a trava só pega
  declarações de topo.
