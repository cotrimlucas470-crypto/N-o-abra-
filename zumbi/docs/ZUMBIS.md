# Sistema de zumbis: desenho e integração

> Regra principal: **zumbis são pessoas infectadas e mortas-vivas deste mundo**, não monstros de jogo arcade.
> Nenhum zumbi é criado perto do jogador. Nenhuma horda aparece porque anoiteceu.
> A variedade vem de **aparência + origem + condição + ferimentos + capacidades + percepção + memória +
> comportamento + localização + equipamento**, não de "zumbi nº 3 com 250 HP".

Implementação na **Fase 5**, em subfases. A Fase 1 já prepara o terreno (ver §10).

---

## 1. Um zumbi é dado, não um sprite

```
ZombieState (puro, serializável)
├── id, origem (local onde "nasceu": hospital, mercado...), profissão
├── corpo: altura, massa, força, equilíbrio, alcance, decomposição (0..1)
├── regiões do corpo (11): cabeça, pescoço, tronco, braços, mãos, pernas, pés
│     └── integridade 0..1, ferimentos (corte, perfuração, fratura, amputação)
├── equipamento: capacete, colete, jaqueta, mochila, botas (proteção por região)
├── percepção: alcance/ângulo de visão, audição, "atenção"
├── mente: agressividade, memória (duração), tempo de busca, tendência de grupo
├── estado da IA + memória (último som, último avistamento, pontos de busca)
└── posição, velocidade, rota atual, chunk
```

- O **Phaser só desenha** zumbis próximos (um pool de visuais reaproveitados). Longe, o zumbi existe só como dado.
- Todo zumbi tem **id estável** e vive num chunk: é salvo, carregado e continua de onde parou.

## 2. Arquétipos → indivíduos

```ts
ZombieArchetype {
  id: 'civil' | 'medico' | 'policial' | 'militar' | 'mecanico' | ...
  roupas: tabela ponderada por região do corpo
  corpo: faixas (altura 1,55–1,95 m; massa; força...)
  decomposição: faixa típica
  mente: faixas de agressividade, memória, busca, grupo
  equipamento: chances (colete no policial, capacete no militar...)
}
```

Cada indivíduo é sorteado **dentro das faixas** do arquétipo com semente estável (mesmo id → mesmo zumbi).
As capacidades são **derivadas do corpo**, não sorteadas soltas:

- velocidade = f(pernas, pés, decomposição, massa, equilíbrio)
- força do agarrão = f(massa, braços, mãos, decomposição)
- resistência = f(massa, tronco, equipamento)

Assim um zumbi grande é mais forte e mais lento **porque é grande**, e não porque recebeu "×10 HP".

Os "tipos especiais" da especificação (rápido, forte, resistente, recente, muito deteriorado, policial,
militar, deformado) são **combinações de parâmetros**, não classes. Exemplo: "recente" = decomposição baixa,
então coordenação alta, corrida possível e aparência quase humana.

## 3. Onde nascem (população, sem spawn mágico)

- O mapa tem **densidade por região e por tipo de local** (hospital, delegacia, mercado, escola: mais gente).
- A população é criada **uma vez, ao gerar o mundo**, espalhada pelo mapa inteiro, e depois só se move.
- O arquétipo vem do local: hospital → médicos, enfermeiros, pacientes; oficina → mecânicos; delegacia →
  policiais, civis, suspeitos. Isso conta histórias sem texto.
- Opções de mundo controlam: população total, multiplicador por região, faixa de decomposição, velocidade.

## 4. Percepção

**Visão**: cone (ângulo e alcance próprios) × **nível de luz** × clima × postura/velocidade do jogador.
Precisa de **linha de visão** na grade de visão (paredes bloqueiam, janelas não).
A detecção **acumula** com o tempo (vulto no canto do olho ≠ jogador parado na frente), então dá para passar
despercebido de longe.

**Audição**: todo som é um evento `{posição, intensidade, alcance, tipo, duração}` no `NoiseSystem`.
Paredes atenuam. O zumbi ouve **um lugar**, não o jogador: ele vai investigar a origem do som.

| Som | Intensidade (alcance aproximado) |
|---|---|
| passo | baixo (2–3 tiles) |
| correr | médio (6–8) |
| porta | baixo/médio |
| golpe | baixo/médio |
| janela quebrada | alto (15–20) |
| tiro | muito alto (40+) |
| explosão | extremo |

**Memória**: último som e último avistamento, com validade própria de cada indivíduo. Perdeu o alvo →
vai ao último ponto conhecido → procura na área → depois fica por ali. **É assim que o jogador muda o mapa
com as próprias ações**: um tiro na rua leva zumbis para aquela rua, e eles ficam lá.

## 5. Comportamento (máquina de estados)

```
IDLE ⇄ WANDER ⇄ WANDER_GROUP
  │  ruído
  ▼
HEAR_NOISE → INVESTIGATE → SEARCH → RETURN/IDLE
  │  avistou
  ▼
ALERT → CHASE → ATTACK / GRAB → (FOLLOW / LOSE_TARGET → SEARCH)
qualquer estado → STAGGER → FALL → GET_UP        (impacto, perna ferida, tropeço)
qualquer estado → DEAD → cadáver persistente
```

- Transições dependem de parâmetros individuais (agressividade, memória, busca).
- **Rotas** pela grade de navegação (A\* com orçamento por quadro, rota encurtada por linha de visão).
- **Muitos perseguindo o mesmo alvo** → campo de fluxo compartilhado (uma busca serve a todos).
- **Portas e janelas**: zumbi bate em porta fechada (faz barulho, pode quebrar), entra por janela quebrada.

## 6. Corpo, ferimentos e movimento

11 regiões com integridade própria. Consequências:

| Dano | Efeito |
|---|---|
| perna/pé | mancar, arrastar a perna, rastejar; velocidade e equilíbrio caem |
| braço/mão | agarrão e golpe mais fracos; não consegue agarrar com os dois braços |
| tronco | menos resistência a empurrões |
| cabeça | neutralização (dano crítico) |

Movimentos (andar irregular, mancar, arrastar, correr, tropeçar, cair, levantar) são **escolhidos pelo
estado do corpo**, não sorteados. `STAGGER/FALL/GET_UP` vêm de impacto e de equilíbrio.

## 7. Ataques e agarrão

Ataques com tempo de preparação (dá para ver e reagir): golpe, empurrão, **agarrão**, mordida, queda sobre o
jogador. Agarrão compara força do zumbi × força/fôlego/peso/ferimentos do jogador; o jogador escapa com
ação ativa (empurrar, golpear, correr gastando fôlego). Mordida e arranhão alimentam a **medicina (Fase 8)**.

## 8. Multidão e ambiente

- Cada zumbi continua **individual** dentro de um grupo (grupo é só uma relação de "seguir").
- **Separação** por grade espacial: empurram, bloqueiam, contornam, tropeçam; aglomerações surgem sozinhas.
- Nada atravessa sólido: mesma colisão do jogador.

## 9. Simulação por distância (desempenho)

| Nível | Onde | O que roda |
|---|---|---|
| 0 COMPLETO | chunks carregados perto do jogador | IA completa todo quadro, física, visual |
| 1 SIMPLIFICADO | anel seguinte | IA a ~4 Hz, sem física (desliza na grade de navegação), sem visual |
| 2 LONGE | resto da região | a cada poucos segundos: segue destino, reage só a sons muito altos |
| 3 POPULAÇÃO | muito longe | contadores por chunk; indivíduos "descongelam" quando o jogador se aproxima |

Os parâmetros que definem os níveis ficam nas opções de mundo. Orçamentos por quadro: nº de rotas, nº de
testes de visão, nº de zumbis em nível 0.

## 10. O que a Fase 1 já prepara

| Necessidade dos zumbis | Preparado na Fase 1 |
|---|---|
| não ver através de parede | **grade de visão** + raio (`SightGrid`) |
| andar pela cidade, entrar em prédios | **grade de navegação** dinâmica + **A\*** (`NavGrid`, `Pathfinder`) |
| existir longe do jogador | **chunks** (`ChunkGrid`, carga/descarga) e anéis de distância |
| memória, busca, decomposição com o tempo | **relógio do jogo** (`GameClock`) |
| população por local | cidade com **regiões e tipos de zona** |
| persistência | **ids estáveis** para tudo que está no mapa |
| ajuste central | **opções de mundo** (`Sandbox`) |
| ferramentas de inspeção | **painel de debug** extensível |

## 11. Subfases da Fase 5

1. **5.1 Núcleo**: `ZombieState`, arquétipos, gerador de indivíduos, população inicial por região, níveis
   por distância, pool de visuais, física de corpo, persistência por chunk. Visual simples.
2. **5.2 Percepção**: `NoiseSystem` (passos, corrida, portas), visão com linha de visão e acúmulo, memória.
3. **5.3 Comportamento**: máquina de estados completa, rotas, busca, retorno, grupos, separação de multidão.
4. **5.4 Corpo**: dano por região, movimentos derivados (mancar, arrastar, cair, levantar), cadáveres.
5. **5.5 Ataques**: golpe, empurrão, agarrão com fuga, mordida (efeito completo na Fase 8).
6. **5.6 Variedade visual**: roupas por profissão e origem, decomposição, sangue, sujeira, equipamento, tamanho.
7. **5.7 População viva**: migração por ruído, grupos atravessando o mapa, simulação longe.
8. **5.8 Debug**: selecionar zumbi; ver cone de visão, audição, estado, alvo, memória, rota, corpo, ruídos.

Prioridade dentro da fase: **comportamento e desempenho primeiro**, variedade visual depois.
