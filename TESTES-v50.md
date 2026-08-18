# v50 — registro dos testes

Playwright + Chromium headless, viewport 390×844, contra o `index.html`
construído. Cada execução escuta `pageerror`. Node 22.22.2.

**Resultado: 69 verificações, 0 falhas, nenhum erro de página.**

Os dois erros de console que aparecem durante o teste 13 são **propositais**:
é o teste registrando armas inválidas de propósito para provar que a validação
recusa com motivo legível.

---

## Saída completa da suíte

```
CRIAÇÃO DE PERSONAGEM
1. a tela aparece antes do jogo começar
  ok    a tela de ficha abriu no lugar do jogo
   10 de 10 pontos livres · 14 ofícios · abas: ofício/atributos/ficha
  ok    as 14 classes estão listadas
  ok    começa com 10 pontos livres
  ok    confirmar está travado com pontos sobrando
2. os limites: exatamente 10 pontos, teto 10 por atributo
   gastou 10 de 10 · força 10
  ok    não dá pra gastar mais de 10 pontos
  ok    valor adulterado é preso no teto
  ok    a validação recusa ficha com pontos sobrando
   pontaria 9 investida + 3 do ofício = efetivo 10
  ok    bônus de classe não passa de 10
  ok    as parcelas ficam separadas
3. a prévia numérica de cada ponto vem do próprio jogo
   força 0→1: Carga máxima 24 kg → 28 kg · Dano corpo a corpo 1.00× → 1.10× · Eficiência com arma pesada 1.00× → 1.08×
  ok    a prévia lista efeitos concretos
  ok    e bate com a conta real do jogo
  ok    carga sobe de verdade
4. as 14 classes são válidas e diferentes
  ok    todas têm passiva própria
  ok    todas têm itens iniciais existentes no catálogo
  ok    as roupas iniciais existem
   sem desvantagem: nenhuma
  ok    nenhuma classe tem só vantagem
5. confirmar aplica itens e ofício, uma vez só
   mochila: revolverx1, cartuchox2, kitx1 · vestindo: colete
  ok    a ficha valida com 10 gastos
  ok    os itens do Soldado entraram
  ok    a roupa da classe foi vestida
  ok    aplicar duas vezes não duplica
  ok    o jogo começou depois de confirmar
ATRIBUTOS
6. cada nível de 0 a 10 muda a conta, com retorno decrescente
   carga por nível: 24 27.8 30.3 32.4 34.3 36.1 37.8 39.5 41 42.5 44
  ok    sobe de 0 a 10 sem repetir
   ganho do 1º ponto 3.80 kg · do 10º 1.50 kg
  ok    retorno decrescente: o 10º ponto vale menos que o 1º
7. os atributos mexem em sistemas reais
   carga 6 → 11 kg · rastro 4.0 → 3.5
  ok    Força muda a carga da mochila de verdade
  ok    Furtividade reduz o rastro que o §9 soma
  ok    mas não zera: PRESENÇA continua
ARMAS DE FOGO
8. as sete categorias existem e são válidas
   {"pistola":2,"revolver":1,"smg":1,"espingarda":1,"carabina":1,"rifle":1,"precisao":1}
  ok    as 7 categorias estão cobertas
  ok    nenhuma arma inválida no catálogo
  ok    todas viraram item do jogo
  ok    todas têm desenho próprio (o "modelo" deste projeto)
9. munição, carregador e câmara
   carregou 13 · 1+12/12 · disparou 13 (travou 2x) · sobrou reserva 17
  ok    arma vazia não dispara
  ok    recarga enche câmara e carregador
  ok    a munição acaba: não é infinita
  ok    a reserva foi debitada
10. calibre incompatível e recarga parcial
   1 → 1 · +2 → 3 · completa → 1+5/5
  ok    9mm não recarrega espingarda
  ok    a reserva de 9mm ficou intacta
  ok    recarga de um em um funciona
  ok    recarga parcial de 2 funciona
  ok    completar enche até o limite
  ok    arma cheia recusa recarga
11. o disparo faz barulho e o barulho chama
   ruído 76 · S.ruido 26.6 · calor 41.8 · chance 55%
  ok    o tiro produz ruído alto
  ok    o ruído entra no medidor do jogo
  ok    e no rastro do §9, que é o que traz a coisa
  ok    a chance de acerto nunca é 100%
12. pontaria muda o acerto, e nem 10 acerta sempre
   pontaria 0: 55% · 10: 76% · longe: 19%
  ok    pontaria melhora o acerto
  ok    mesmo no 10 não é perfeito
  ok    longe demais degrada
13. arma nova entra sem tocar no núcleo
  ok    arma nova válida é aceita e vira item
  ok    e funciona de verdade (carregou e disparou)
  ok    arma sem campo obrigatório é recusada com erro
  ok    calibre inexistente é recusado
  ok    a arma de exemplo do fluxo existe, com desenho
CORPO E EQUIPAMENTO
14. slots, proteção por região e penalidades
   capacete → cabeça 35% · bota → pés 16% · bota no braço 0%
  ok    há 14 slots corporais
  ok    vestir ocupa slot
  ok    a proteção é POR REGIÃO: só a bota, o braço fica em 0
  ok    o capacete protege a cabeça
  ok    casaco grosso impede colete por cima
  ok    sem o casaco o colete entra
   penalidades: velocidade -3% · ruído +13%
  ok    armadura cobra velocidade e ruído
15. a proteção entra na ferida de verdade
   golpes segurados em 800: sem roupa 8 · vestido 46
  ok    a roupa segura mais golpes que a pele
  ok    mas não segura tudo
PERSISTÊNCIA
16. tudo isso sobrevive a salvar e recarregar
   ficha: cacador · arma: espingarda_20 2/5 · reserva .12: 4
  ok    a classe e os pontos foram gravados
  ok    a arma equipada foi gravada
  ok    o carregador parcial foi gravado
  ok    a munição reserva foi gravada
  ok    a roupa vestida foi gravada
17. save antigo sem ficha migra sem quebrar
   migrou para: civil com 0 pontos
  ok    o save antigo carrega
  ok    a ficha ausente vira Civil sem pontos
  ok    corpo e armas nascem vazios e válidos
erros: (nenhum)```

---

## `menuteste` — organização dos botões e bônus de roupa

13 verificações, 0 falhas.

```
BOTÕES
   SÓTÃO     21 botões → 10 visíveis · neste cômodo(7) ir para(3) você(5)▸ a casa(3)▸ saber(3)▸
   QUARTO    21 botões →  8 visíveis · neste cômodo(4) ir para(4) você(7)▸ a casa(3)▸ saber(3)▸
   DESPENSA  19 botões →  8 visíveis · neste cômodo(5) ir para(3) você(5)▸ a casa(3)▸ saber(3)▸
   OFICINA   24 botões → 13 visíveis · neste cômodo(8) ir para(5) você(5)▸ a casa(3)▸ saber(3)▸
   SALA      22 botões →  7 visíveis · neste cômodo(2) ir para(5) você(5)▸ a casa(4)▸ saber(6)▸
   COZINHA   19 botões →  8 visíveis · neste cômodo(4) ir para(4) você(5)▸ a casa(3)▸ saber(3)▸
   PORÃO     22 botões → 11 visíveis · neste cômodo(8) ir para(3) você(5)▸ a casa(3)▸ saber(3)▸
   ENTRADA   20 botões →  9 visíveis · neste cômodo(5) ir para(4) você(5)▸ a casa(3)▸ saber(3)▸
   QUINTAL   23 botões → 12 visíveis · neste cômodo(8) ir para(4) você(5)▸ a casa(3)▸ saber(3)▸
   TOTAL 191 botões · 86 visíveis de saída (45%)
  ok    todos os cômodos ficaram organizados em seções
  ok    a maioria dos botões começa recolhida
  ok    o que é do cômodo fica aberto
  ok    nada se perdeu: a soma bate com os 191 do diagnóstico

2. abrir e fechar uma seção funciona
   visíveis: 7 → 12 → 7
  ok    abrir mostra mais botões
  ok    fechar volta ao que era

ROUPA DÁ ATRIBUTO
   nu: vel 0 furt 0 dest 0 carga 24kg
   tênis+luva+mochila: vel 1 furt 1 dest 1 carga 27.8kg
  ok    tênis dá velocidade e furtividade
  ok    luva dá destreza
  ok    a mochila dá força, e a força vira carga
  ok    a parcela aparece separada na ficha
   trocando tênis por bota: vel 0 furt 0
  ok    bota troca velocidade por resistência e custa furtividade
  ok    nem com roupa passa de 10
  ok    peça quebrada não dá bônus

erros: (nenhum)
```

A asserção que mais importa aqui é a quarta: **nada se perdeu.** É fácil
"organizar" um menu perdendo botão pelo caminho — a seção some, a ação some
junto, e ninguém percebe até precisar dela. O teste soma os botões dentro de
todas as seções de todos os 9 cômodos e compara com os 191 contados antes de
qualquer agrupamento existir.

A penúltima cobre o teto: com Velocidade já em 10, tênis não adiciona um
décimo-primeiro ponto. A última cobre a regra que dá sentido ao desgaste — peça
quebrada é peso morto, não bônus.

---

## Regressão das versões anteriores

| suíte | resultado |
|---|---|
| `v49` — chuva e luz (33 verificações) | 0 falhas, erros: nenhum |
| `qual` — qualidade de itens e baú (59) | 0 falhas, erros: nenhum |
| `am` — AudioManager | 0 falhas, erros: nenhum |
| `gerteste` — gerador a diesel | 0 falhas, erros: nenhum |
| `corte` — corte entre cômodos | 0 falhas, erros: nenhum |
| `fuzz` — passeio aleatório (semente 42, 126 cliques) | erros: nenhum |

### Duas asserções antigas precisaram ser atualizadas — e por quê

Nenhuma das duas era regressão; as duas mediam algo que a v50 mudou de
propósito:

1. **`qual` · "o dano cai 35%"** — a suíte comparava o dano da faca contra o
   valor do catálogo. Na v50 a **Força multiplica o dano corpo a corpo**, e o
   harness distribuía 3 pontos. A asserção passou a zerar a ficha antes de
   medir só o efeito do desgaste.

2. **`am` · "timers e fontes foram limpos"** — media `AM.timers.size === 0`
   depois de `amInvalidar()`. O controlador de chuva da v49 tem pulso próprio de
   250 ms e pode agendar o desligamento da calha nesse intervalo. Esse timer é
   de sistema **vivo**, não de cena morta. O que `amInvalidar` promete é que
   nada da geração antiga nasça depois — e é isso que a asserção mede agora
   (`fontes === 0`).

### Um problema real que os testes acharam nos harnesses

Os 12 harnesses de teste clicavam `#go` e esperavam o jogo começar. Com a tela
de criação de personagem no caminho, **o fuzzer executou 0 cliques** e o `qual`
travou por timeout. Se eu tivesse lido só o "erros: (nenhum)" teria declarado
uma regressão limpa que não tinha rodado. Todos os harnesses foram ensinados a
distribuir os pontos e confirmar a ficha antes de seguir.

---

## Bugs encontrados e corrigidos durante a v50

| bug | onde | correção |
|---|---|---|
| **Migração de save nunca disparava** | `s19-ficha.js` | a condição testava `!S.ficha`, mas o bloco cria `S.ficha` vazia ao carregar — o objeto sempre existia. Save antigo ficava **sem ofício nenhum**. Agora o que decide é haver classe válida |
| **Interceptação da tela de criação não pegava** | `s19-ficha.js` | embrulhar `pedirNome` não funcionava: a tela é montada por `innerHTML` e o `onclick` é atribuído lá dentro, depois. Trocado por listener em **fase de captura** no documento |
| **Classe sem desvantagem** | `s19-ficha.js` | o Sobrevivente tinha `mais` e nenhum `menos`. Ganhou −1 Inteligência e −1 Pontaria |
| **Itens iniciais inexistentes** | `s19-ficha.js` | Médico e Paramédico começavam com `alcool` e `gaze`, que são entradas de `REMEDIOS` e **não existem no `CATALOGO`** |
| **Roupa não tinha durabilidade nenhuma** | `s15-qualidade.js` | achado ao implementar "peça quebrada não dá bônus": `fichaDesg` não tinha ramo para a categoria `roupa`, então `peca()` devolvia `null` para camiseta e bota. **A proteção nunca decaía**, a peça que segurava o golpe nunca sentia, e a regra nova não tinha como valer. Ganhou taxa por peça e receita de conserto (lona e linha) |

---

## O que não foi testado, e por quê

- **Resoluções e escalas de interface variadas.** Só 390×844. A interface é
  responsiva por construção, mas isso é argumento, não medição.
- **FPS e memória em sessão longa.** Não há instrumentação de quadro no projeto.
- **Modos de disparo `rajada` e `auto`.** Existem nos dados e no HUD, mas o
  disparo resolve um tiro por vez — não há o que medir além do que o teste 8 já
  cobre.
