/* ============================================================
   dados/herois/_habilidades.js — passiva e habilidades

   DE ONDE ISTO VEIO, E POR QUE ISSO IMPORTA

   Você mandou três links: bittopup.com, hokstats.gg e
   honor-of-kings.fandom.com. Os TRÊS são recusados pelo proxy de
   saída desta sessão (403 no CONNECT). O mesmo vale para
   liquipedia.net e hokbuild.com, que apareceram na busca. Não é
   contornável de dentro do app, e eu não vou fingir que li.

   O que sobrou foi a BUSCA. Ela não devolve a página: devolve
   título, link e um resumo feito por máquina em cima de trechos.
   Isso é mais fraco do que ler a página, e erra de um jeito
   traiçoeiro — o resumo soa certo mesmo quando está errado. Um
   exemplo real desta sessão: a primeira busca sobre a Jing
   devolveu "Skill 3: Dimensional Shift" E "Ultimate: Mirror
   Domain" com descrições quase iguais. Uma das duas leituras está
   errada, e eu não sei qual.

   REGRA DESTE ARQUIVO
   · toda entrada guarda as URLs que a busca devolveu;
   · toda entrada nasce conferido:false;
   · quando duas buscas discordam, ficam AS DUAS leituras, com a
     discordância escrita — não se escolhe a mais bonita;
   · nome de habilidade que não apareceu em busca nenhuma NÃO é
     inventado. O campo fica ausente.

   O QUE TEM AQUI HOJE: 2 heróis de 117 — os seus. Cada herói custa
   duas buscas para cruzar, e cruzar é o que separa isto de chute.
   Jing e Luna estão cruzados. O resto do elenco entra quando você
   conseguir abrir um daqueles sites e colar, ou quando este app
   rodar num lugar sem esse bloqueio.
   ============================================================ */
'use strict';
(function (U) {
  const F = 'busca_web';

  U.HE.HABILIDADES = {
    fonte: F,
    conferido: false,
    quando: '2026-09-18',
    aviso: 'Resumo de busca, não leitura de página. Os três sites que você mandou estão bloqueados nesta sessão.',
    cobertura: '14 de 117 heróis com kit montado + 1 com conflito total registrado (Nezha).',

    jing: {
      cruzado: true,
      buscas: 2,
      urls: [
        'https://liquipedia.net/honorofkings/Jing',
        'https://honor-of-kings.fandom.com/wiki/Jing',
        'https://gamingonphone.com/guides/honor-of-kings-jing-guide-gameplay-tips/',
        'https://www.sportskeeda.com/esports/best-jing-build-honor-kings-equipment-arcanas-battle-spell-skill-combo',
      ],
      lista: [
        {
          slot: 'passiva', tecla: 'P', nome: 'Lethal Reflections',
          texto: 'Usar habilidades invoca uma imagem espelhada por um curto período. A Jing e a imagem aplicam marcas DIFERENTES ao causar dano. Quando o alvo tem as duas marcas, elas se quebram: causam dano físico igual a 4% da vida que falta no alvo e zeram a recarga de Reflective Assault e Shattered Illusions. Depois de disparar, a passiva fica desligada por 5 s (2 s durante a ultimate).',
          confianca: 'alta', nota: 'As duas buscas descrevem o mesmo mecanismo, com o mesmo número (4% da vida faltante) e os mesmos tempos.',
        },
        {
          slot: '1', tecla: '1', nome: 'Reflective Assault',
          texto: 'Avança na direção alvo causando dano a quem estiver no caminho. Melhora o próximo ataque básico, que passa a bater duas vezes. Se não houver imagem espelhada, esta habilidade cria uma. A imagem copia as habilidades dela, menos a ultimate.',
          confianca: 'alta',
        },
        {
          slot: '2', tecla: '2', nome: 'Shattered Illusions',
          texto: 'A Jing e a imagem causam dano em volta. Recupera vida e ganha velocidade de movimento. Se não houver imagem, cria uma e usa a habilidade junto.',
          confianca: 'alta',
        },
        {
          slot: '3', tecla: '3', ult: true, nome: 'Mirror Domain',
          texto: 'Avança e fica sem poder ser alvo, puxando os inimigos para dentro da área e prendendo. Recebe menos dano enquanto está na área. Depois pode trocar de lugar com a imagem espelhada e recuperar vida.',
          confianca: 'media',
          disputa: {
            oQue: 'o nome e o número desta habilidade',
            leituraA: 'Mirror Domain é a ultimate (habilidade 3). Uma busca direta perguntando qual das duas é a ultimate respondeu isto.',
            leituraB: 'Dimensional Shift seria a habilidade 3 e Mirror Domain a ultimate — ou seja, quatro habilidades ativas. A primeira busca devolveu as duas com descrição quase idêntica.',
            porQueNaoEscolhi: 'A descrição das duas leituras é a mesma: avançar, ficar intocável, puxar, prender, trocar de lugar com a imagem. O mais provável é que "Dimensional Shift" seja o SEGUNDO toque da mesma ultimate (a troca de lugar) e que um dos resumos tenha separado em duas. Provável não é lido. Fica registrado assim até você confirmar no jogo.',
          },
        },
      ],
    },

    luna: {
      cruzado: true,
      buscas: 2,
      urls: [
        'https://liquipedia.net/honorofkings/Luna',
        'https://honor-of-kings.fandom.com/wiki/Luna',
        'https://hokstats.gg/heroes/luna/',
        'https://sportskeeda.com/esports/honor-kings-luna-build-guide-best-equipment-arcanas-battle-spell-skill-combos',
      ],
      lista: [
        {
          slot: 'passiva', tecla: 'P', nome: 'Moonlight Dance',
          texto: 'O ataque básico tem duas formas, corpo a corpo e à distância. O primeiro ataque básico na forma corpo a corpo avança na direção do alvo, e o terceiro causa dano extra. Ataque básico melhorado e dano de habilidade MARCAM o inimigo.',
          confianca: 'alta', nota: 'A marca é o eixo do herói: tudo gira em torno de marcar e depois acertar quem está marcado.',
        },
        {
          slot: '1', tecla: '1', nome: 'Crescent Slice',
          texto: 'Solta uma onda de choque na direção alvo, causando dano e marcando quem for atingido.',
          confianca: 'alta',
        },
        {
          slot: '2', tecla: '2', nome: 'Searing Stab',
          texto: 'Ganha escudo e puxa os inimigos próximos, causando dano, atordoando, lentificando e marcando.',
          confianca: 'alta',
        },
        {
          slot: '3', tecla: '3', ult: true, nome: 'New Moon',
          texto: 'Avança na direção alvo causando dano a quem estiver no caminho. Se acertar um inimigo MARCADO, a recarga desta habilidade é zerada.',
          confianca: 'alta',
          nota: 'É este reset que cria a corrente infinita da Luna: marcar, avançar, marcar de novo, avançar de novo. Duas buscas independentes descrevem o mesmo reset.',
        },
      ],
      ordemDeUpar: { texto: 'Habilidade 1 antes da 2.', confianca: 'media', nota: 'Apareceu numa busca só, como "skill priority". Não foi cruzado.' },
    },

    /* ------------------------------------------------------------
       NUWA — nomes cruzados, descrições de uma busca só, e um
       aviso que muda tudo: apareceu "Nuwa rework" na Temporada 8.
       Se o rework já entrou, os números abaixo são do kit ANTIGO.
       Não dá para saber qual é qual pelo resumo de busca.
       ------------------------------------------------------------ */
    nuwa: {
      cruzado: true,
      buscas: 2,
      urls: [
        'https://liquipedia.net/honorofkings/Nuwa',
        'https://honor-of-kings.fandom.com/wiki/Nuwa',
        'https://itemlevel.net/honor-of-kings-complete-nuwa-guide/',
        'https://www.gosugamers.net/honor-of-kings/news/74104-honor-of-kings-season-8-update-nuwa-rework-and-confirmed-hero-mechanic-upgrades',
      ],
      alerta: 'Uma das buscas devolveu uma notícia de REWORK da Nuwa na Temporada 8. Se o rework já está no ar, a descrição e os números abaixo são do kit antigo. Confirme no jogo antes de estudar por aqui.',
      lista: [
        {
          slot: 'passiva', tecla: 'P', nome: 'Guiding Light',
          texto: 'A cada nível, aumenta o alcance de visão em 2% (até 42%) e o alcance do ataque básico e das habilidades em 2% (até 28%).',
          confianca: 'media', nota: 'Apareceu numa busca só. A segunda busca não trouxe a passiva.',
        },
        {
          slot: '1', tecla: '1', nome: 'Incantation - Resplendence',
          texto: 'Solta energia numa direção causando dano mágico com empurrão. Depois de acertar, desacelera e se abre em cruz, causando dano de novo a quem for atingido.',
          confianca: 'alta',
          numeros: '280/325/370/415 (+30% AP) no primeiro golpe; 250/290/330/370 (+36% AP) na cruz.',
          nota: 'O nome bateu nas duas buscas. Os números vieram de uma só — e podem ser de antes do rework.',
        },
        {
          slot: '2', tecla: '2', nome: 'Incantation - Creation',
          texto: 'Cria um espaço/matriz no local indicado que impede inimigos de passar. Some depois de 3 s; ao sumir — ou quando outra habilidade dela encosta nele — explode, causando dano mágico em volta. Bloqueia o movimento de heróis inimigos e pode ser fundido duas vezes.',
          confianca: 'alta',
          numeros: '540/610/680/750 (+65% AP) na explosão.',
        },
        {
          slot: '3', tecla: '3', ult: true, nome: 'Incantation - Ruin',
          texto: 'Depois de um atraso curto, libera energia pura numa direção, causando dano mágico pesado a quem estiver no caminho.',
          confianca: 'media', nota: 'Só uma das buscas nomeou a ultimate.',
        },
      ],
    },

    /* ------------------------------------------------------------
       NEZHA — o exemplo de por que este arquivo existe.
       Duas buscas, e elas discordam em TODAS as habilidades. Não é
       uma divergência de detalhe: são nomes completamente
       diferentes para os mesmos slots. Escolher uma das duas aqui
       seria dar ao chute a aparência de dado.
       Fica sem kit montado, com as duas leituras lado a lado.
       ------------------------------------------------------------ */
    nezha: {
      cruzado: true,
      buscas: 2,
      conflitoTotal: true,
      urls: [
        'https://liquipedia.net/honorofkings/Nezha',
        'https://honor-of-kings.fandom.com/wiki/Nezha',
        'https://hokstats.gg/heroes/nezha/',
        'https://topuplist.com/blogs/detail/honor-of-kings-nezha-guide',
      ],
      alerta: 'As duas buscas deram nomes DIFERENTES para as três habilidades. Nenhuma confirmou o nome da passiva. Por isso este herói fica sem kit montado.',
      leituras: [
        { de: 'busca 1', slots: {
            passiva: '(sem nome) — ganha velocidade de movimento e escudo que anula dano verdadeiro ao atacar herói inimigo; acumula até 5 vezes',
            '1': 'Fire-tipped Spear – Sweep',
            '2': '(sem nome) — vira para trás do alvo e causa dano; depois de acertar, libera Universe Ring – Skyfall em 3 s',
            '3': '(sem nome) — voa até o alvo, causa dano e empurra; ganha redução de dano ao chegar' } },
        { de: 'busca 2', slots: {
            passiva: '(sem nome confirmado) — escudo verdadeiro ao causar dano com habilidade, mais roda de fogo que dá velocidade',
            '1': 'Scorching Ember',
            '2': 'Red Armillary Sash – Bind',
            '3': 'Universe Ring – Skyfall' } },
      ],
    },

    /* ------------------------------------------------------------
       KONGMING — nomes quase todos cruzados. O 1 não.
       ------------------------------------------------------------ */
    kongming: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Kongming',
             'https://honor-of-kings.fandom.com/wiki/Kongming',
             'https://hokstats.gg/heroes/kongming/',
             'https://gaminggblog.com/honor-of-kings-kong-ming-build/'],
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Time for Tactics',
          texto: 'Habilidade que acerta inimigo acumula marca. Com 5 marcas, aparecem 5 orbes mágicos que atacam sozinhos quem estiver perto, causando 135 (+25% de ataque mágico) de dano mágico. Os orbes preferem heróis inimigos e não atacam monstro fora de combate. Dano em monstro cai 40%; em minion sobe 40%.',
          confianca: 'media',
          nota: 'O mecanismo e os números batem nas duas buscas. O NOME não: apareceu como "Time for Tactics", "Time of Tactics" e "Moment of Intrigue". Guardei o mais repetido.' },
        { slot: '1', tecla: '1', nome: 'Arcane Shift',
          texto: 'Dispara 3 prismas num cone, causando dano a quem for atingido.',
          confianca: 'media',
          disputa: { oQue: 'o nome desta habilidade',
            leituraA: 'Arcane Shift (primeira busca).',
            leituraB: 'Arcane Assault (segunda busca).',
            porQueNaoEscolhi: 'A descrição é idêntica nas duas — três prismas em cone. Só o nome muda, e as duas buscas apontam para as mesmas páginas. Pode ser tradução diferente ou mudança de patch. Confirme no jogo.' } },
        { slot: '2', tecla: '2', nome: 'Time Shift',
          texto: 'Teleporta na direção alvo, causando dano a quem estiver perto do ponto de partida e do ponto de chegada.',
          confianca: 'alta' },
        { slot: '3', tecla: '3', ult: true, nome: 'Winning Strategy',
          texto: 'Canaliza um instante e solta uma bomba espiritual no inimigo alvo, causando dano letal. Se a bomba abate um herói, a recarga é zerada. Para cada 1% de vida que falta no alvo, o dano sobe 2%.',
          confianca: 'alta',
          nota: 'É por isso que o Kongming é counter da Jing: quanto mais machucada você está, mais forte fica a bomba dele.' },
      ],
    },

    /* ------------------------------------------------------------
       MAYENE — a mais banida da tabela (90%). Nomes cruzados.
       ------------------------------------------------------------ */
    mayene: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Mayene',
             'https://honor-of-kings.fandom.com/wiki/Mayene',
             'https://itemlevel.net/honor-of-kings-complete-mayene-guide/',
             'https://hokstats.gg/heroes/mayene/'],
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Slack Off',
          texto: 'Recupera Força e vida enquanto está parada. Não recupera se ataca, apanha, se move ou está no estado Sério. Parada e sem levar dano, ela senta e acelera a recuperação de Força em 25%; enquanto folga, come petiscos e recupera vida de vez em quando.',
          confianca: 'alta',
          nota: 'As habilidades dela gastam Força. Toda a luta contra a Mayene é sobre não deixar ela recarregar.' },
        { slot: '1', tecla: '1', nome: 'Whatever (I)',
          texto: 'Custa 1 de Força de Soco. Salta e dá um golpe forte, causando dano em volta. Quem está no centro leva mais, e ela recebe redução de dano enquanto usa.',
          confianca: 'media',
          disputa: { oQue: 'o que a habilidade faz',
            leituraA: 'Salta e golpeia, dano maior no centro, com redução de dano (segunda busca, mais detalhada).',
            leituraB: 'Puxa os inimigos num cone e causa dano em cone (primeira busca).',
            porQueNaoEscolhi: 'Puxar e saltar são coisas diferentes, e isso muda como você se posiciona contra ela. Guardei a leitura mais detalhada em cima e a outra aqui.' } },
        { slot: '2', tecla: '2', nome: 'Whatever (II)',
          texto: 'Custa 1 de Força de Chute. Salta no inimigo e depois gira na direção alvo, causando dano e recuperando vida. Fica sem poder ser alvo durante o uso.',
          confianca: 'alta' },
        { slot: '3', tecla: '3', ult: true, nome: 'Get Serious',
          texto: 'Causa dano físico em todos os inimigos perto. Recupera uma unidade de Soco e uma de Chute e sobe o limite de acúmulo para 3. Ganha 20% de velocidade de movimento e reduz lentidão em 50%, por 10 s.',
          confianca: 'alta' },
      ],
    },

    /* ------------------------------------------------------------
       DUN — nomes de uma busca, descrições de outra. As duas
       concordam na ultimate, que é o ponto de apoio.
       ------------------------------------------------------------ */
    dun: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Dun',
             'https://honor-of-kings.fandom.com/wiki/Dun',
             'https://hokstats.gg/heroes/dun/',
             'https://onlinegamingph.com/honor-of-kings-dun-guide/'],
      alerta: 'As duas buscas se completaram em vez de se repetirem: a primeira trouxe as descrições sem nome, a segunda os nomes sem descrição. Só a ultimate apareceu nas duas com nome. O casamento entre nome e descrição é meu, e pode estar trocado entre a 1 e a 2.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Unyielding Might',
          texto: 'Quando a vida cai demais, levar dano fortalece o Dun. Fortalecido, acertos de habilidade e de ataque básico recuperam vida.',
          confianca: 'media', nota: 'Nome de uma busca, descrição da outra.' },
        { slot: '1', tecla: '1', nome: 'Wind Slash',
          texto: 'Não encontrado na fonte.',
          confianca: 'media', nota: 'Só o nome apareceu. Nenhuma das buscas descreveu esta habilidade.' },
        { slot: '2', tecla: '2', nome: "Gale's Benediction",
          texto: 'Gera escudo em volta dele, proporcional à vida máxima, e causa dano mágico a quem estiver perto. Depois, os três ataques seguintes causam dano verdadeiro, reduzem a recarga da ultimate e batem mais forte em monstro de selva.',
          confianca: 'media', nota: 'Nome de uma busca, descrição da outra.' },
        { slot: '3', tecla: '3', ult: true, nome: 'Unruly Blade',
          texto: 'Se acertar um herói inimigo, pode ser usada de novo antes de entrar em recarga, causando dano e lançando os inimigos no alcance.',
          confianca: 'alta', nota: 'Único campo dele confirmado nas duas buscas, nome e efeito.' },
      ],
    },

    /* ------------------------------------------------------------
       GUAN YU — o mais limpo do lote: quatro nomes, duas buscas,
       zero divergência.
       ------------------------------------------------------------ */
    'guan-yu': {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Guan_Yu',
             'https://honor-of-kings.fandom.com/wiki/Guan_Yu',
             'https://hokstats.gg/heroes/guan-yu/',
             'https://sportskeeda.com/mobile-games/guan-yu-honor-kings-skills-stats'],
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Rider of Triumph',
          texto: 'Ganha 2% de velocidade de movimento a cada 200 unidades percorridas, e entra em Postura de Carga depois de 2.000 unidades. Em Carga, o próximo ataque básico avança, causa dano físico e empurra quem estiver no caminho; ganha mais 20% de velocidade indo na direção de heróis inimigos.',
          confianca: 'alta',
          nota: 'Herói de duas posturas: quase tudo nele muda conforme ele já andou ou não.' },
        { slot: '1', tecla: '1', nome: 'Heroic Charge',
          texto: 'Na postura normal, causa dano a quem estiver no alcance. Em Carga, avança empurrando quem estiver no caminho e causando dano.',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Soaring Green Dragon',
          texto: 'Na postura normal, remove controle de grupo e ganha velocidade. Em Carga, remove controle, salta para frente, empurra quem estiver na área de queda e causa dano.',
          confianca: 'alta' },
        { slot: '3', tecla: '3', ult: true, nome: 'Razor Cavalry',
          texto: 'Não encontrado na fonte.',
          confianca: 'media', nota: 'O NOME apareceu nas duas buscas. A descrição não apareceu em nenhuma das duas de forma completa, e eu não vou preencher por dedução.' },
      ],
    },

    /* ------------------------------------------------------------
       AO'YIN — quatro habilidades ativas, não três. As duas buscas
       concordam nisso. O nome da passiva, não.
       ------------------------------------------------------------ */
    aoyin: {
      cruzado: true, buscas: 2,
      urls: ["https://liquipedia.net/honorofkings/Ao'yin",
             "https://honor-of-kings.fandom.com/wiki/Ao'yin",
             'https://hokstats.gg/heroes/aoyin/',
             'https://grokipedia.com/page/Ao_Yin_Honor_of_Kings'],
      alerta: 'Este herói tem QUATRO habilidades ativas, não três — as duas buscas concordam nisso. O treino do app mede três botões de habilidade, então a quarta não tem botão para casar.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: null,
          texto: 'As Almas de Dragão das duas últimas habilidades usadas mudam o ataque básico, que passa a causar dano físico em até dois inimigos. Cada habilidade usada dá 1 marca, até 3. O ataque básico gasta todas as marcas de uma vez, batendo uma vez por marca.',
          confianca: 'media',
          disputa: { oQue: 'o nome da passiva',
            leituraA: '"Hidden Dragon" (primeira busca).',
            leituraB: 'A segunda busca, perguntada diretamente, disse que NÃO encontrou nenhuma passiva com esse nome.',
            porQueNaoEscolhi: 'Uma busca afirmando e outra negando não é confirmação. O mecanismo (Almas de Dragão, marcas) apareceu nas duas e está guardado; o nome fica em branco.' } },
        { slot: '1', tecla: '1', nome: 'Flaming Palm',
          texto: 'Causa dano físico e dano verdadeiro. Prende uma Alma de Dragão de Fogo à espada: com ela, o ataque básico bate mais forte, causando dano físico e verdadeiro.',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Downpour',
          texto: 'Causa dano físico e recupera vida ao acertar. Prende uma Alma de Dragão de Água: com ela, o ataque básico devolve vida e mana — menos vida quando acerta o que não é herói.',
          confianca: 'alta' },
        { slot: '3', tecla: '3', nome: 'Riding the Wind',
          texto: 'Ganha velocidade de movimento que vai caindo com o tempo, causa dano físico e empurra. Prende uma Alma de Dragão de Vento.',
          confianca: 'alta' },
        { slot: '4', tecla: '4', ult: true, nome: 'Infinite Vastness',
          texto: 'Sobe ao céu por até 4,5 s — sem poder ser alvo, ignorando terreno e sem poder atacar — e depois mergulha para a frente, causando dano e lentificando quem estiver no caminho.',
          confianca: 'alta' },
      ],
    },

    /* ------------------------------------------------------------
       PEI — duas formas, e cada habilidade tem duas versões.
       ------------------------------------------------------------ */
    pei: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Pei',
             'https://honor-of-kings.fandom.com/wiki/Pei',
             'https://itemlevel.net/honor-of-kings-complete-pei-guide/',
             'https://hokstats.gg/heroes/pei/'],
      alerta: 'Herói de DUAS FORMAS. As habilidades 1 e 2 têm uma versão em forma humana e outra em forma de tigre; a ultimate é a troca de forma. As duas buscas concordam nessa estrutura.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Blast',
          texto: 'Na forma humana, o alcance do ataque básico aumenta e o ataque causa 16 de dano mágico a mais. Esse extra acumula ao longo de 3 s, até três vezes o valor base. Cada ataque que acerta devolve 5 de energia.',
          confianca: 'alta' },
        { slot: '1', tecla: '1', nome: 'Striker Stance',
          texto: 'Solta energia Qi causando dano mágico a quem estiver no caminho, mais 8% da vida atual do alvo como dano mágico, e reduz a velocidade dele em 50% por 1,5 s. Acertar devolve 20 de energia.',
          numeros: '250/300/350/400/450/500 (+115% de ataque físico bônus).',
          variante: { forma: 'tigre', nome: 'Roaring Tiger Stance', texto: 'Não encontrado na fonte.' },
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Guarding Stance',
          texto: 'Cria uma aura de Qi em volta dele, causando dano mágico perto, formando escudo e subindo a velocidade de ataque em 30%.',
          numeros: '100/150/200/250/300/350 (+70% de ataque físico bônus) de dano; escudo de 400 (+150% de ataque físico bônus).',
          variante: { forma: 'tigre', nome: 'Leaping Tiger Stance', texto: 'Não encontrado na fonte.' },
          confianca: 'alta' },
        { slot: '3', tecla: '3', ult: true, nome: 'Tiger Form',
          texto: 'Troca para a forma de tigre: +30% de velocidade por 1 s e os dois próximos ataques básicos ficam melhorados por 7 s. O primeiro salta no alvo causando dano físico e lentidão de 90% por 1 s; o segundo, usado em até 5 s, causa dano mágico à frente.',
          numeros: '20/110/200/290 (+100% de ataque físico) em cada um dos dois golpes.',
          confianca: 'alta' },
      ],
    },

    /* ------------------------------------------------------------
       DA QIAO — nomes cruzados, passiva contraditória.
       ------------------------------------------------------------ */
    'da-qiao': {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Da_Qiao',
             'https://honor-of-kings.fandom.com/wiki/Da_Qiao',
             'https://hokstats.gg/heroes/da-qiao/',
             'https://gaminggblog.com/hok-da-qiao-build/'],
      alerta: 'Quatro habilidades ativas. Os cinco nomes bateram nas duas buscas; a DESCRIÇÃO DA PASSIVA se contradiz entre elas.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Law of Infinity',
          texto: 'Não encontrado na fonte.',
          confianca: 'media',
          disputa: { oQue: 'quem ganha o bônus da passiva',
            leituraA: 'Ela E o aliado mais próximo dentro de 600 de alcance ganham 40–60 de velocidade de movimento.',
            leituraB: 'Ela ganha 30–60 de velocidade e NÃO passa nada para o time; o que escala com ataque mágico é o alcance de Leaping Koi Tide e Severing Surge.',
            porQueNaoEscolhi: 'As duas leituras dizem coisas opostas sobre a coisa mais importante do herói — se ele acelera o time ou não. Isso decide se vale ficar colado nela. Não dá para arbitrar por aqui.' } },
        { slot: '1', tecla: '1', nome: 'Leaping Koi Tide',
          texto: 'Lança e causa dano numa linha à frente, deixando uma maré que continua causando dano.',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Sea of Fate',
          texto: 'Cria um portal que deixa um aliado voltar para a base e retornar.',
          confianca: 'alta' },
        { slot: '3', tecla: '3', nome: 'Severing Surge',
          texto: 'Lança os inimigos à frente e causa dano.',
          confianca: 'alta' },
        { slot: '4', tecla: '4', ult: true, nome: 'Eye of the Whirlpool',
          texto: 'Cria um círculo mágico que causa dano, deixa os aliados se teleportarem até ele e dá escudo.',
          confianca: 'media',
          nota: 'As duas buscas concordam que é teleporte de time. Divergem no acessório: uma fala em velocidade de ataque para os aliados, a outra em escudo. O núcleo — portal para o time — é o mesmo.' },
      ],
    },

    /* ------------------------------------------------------------
       HAN XIN — limpo: quatro nomes, duas buscas, sem divergência.
       ------------------------------------------------------------ */
    'han-xin': {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Han_Xin',
             'https://honor-of-kings.fandom.com/wiki/Han_Xin',
             'https://hokstats.gg/heroes/han-xin/',
             'https://gaminggblog.com/han-xin-builds/'],
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Killing Spear',
          texto: 'A cada 4º ataque básico, lança o alvo para o alto. Acertos de habilidade e ataques básicos melhorados dão velocidade de ataque.',
          confianca: 'alta' },
        { slot: '1', tecla: '1', nome: 'Ruthless Assault',
          texto: 'Salta até o local alvo causando dano e lançando o inimigo.',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Fight or Die!',
          texto: 'Causa dano pesado enquanto recua.',
          confianca: 'alta',
          nota: 'A descrição que a busca devolveu é curta assim mesmo. Não completei o resto por dedução.' },
        { slot: '3', tecla: '3', ult: true, nome: 'The Unrivaled Spear',
          texto: 'Solta um combo de quatro golpes em leque, cada um com dano físico pesado, lançando os inimigos no último. Durante a ultimate ele fica em super armadura e ganha 30% de redução de dano.',
          confianca: 'alta' },
      ],
    },

    /* ------------------------------------------------------------
       XIAO QIAO — limpo: nomes E descrições cruzados.
       ------------------------------------------------------------ */
    'xiao-qiao': {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Xiao_Qiao',
             'https://honor-of-kings.fandom.com/wiki/Xiao_Qiao',
             'https://hokstats.gg/heroes/xiao-qiao/',
             'https://gaminggblog.com/honor-of-kings-breezy-builds/'],
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Encouraging Thoughts',
          texto: 'Acertar um inimigo com habilidade dá 25% de velocidade de movimento por 2 s.',
          confianca: 'alta' },
        { slot: '1', tecla: '1', nome: 'Blossoming Fan',
          texto: 'Joga o leque na direção alvo; ao chegar no alcance máximo ele volta, causando dano na ida e na volta.',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Honeysweet Breeze',
          texto: 'Causa dano na área alvo e lança os inimigos para o alto.',
          confianca: 'alta' },
        { slot: '3', tecla: '3', ult: true, nome: 'Meteor Storm',
          texto: 'Invoca meteoros que caem sem parar sobre os inimigos por perto durante 6 s. Cada meteoro causa dano mágico, e cada inimigo pode ser atingido até 4 vezes.',
          numeros: '400/500/600 (+100% de poder mágico) por meteoro.',
          confianca: 'alta' },
      ],
    },

    /* ------------------------------------------------------------
       WUKONG — uma busca se contradiz DENTRO DELA MESMA sobre o
       nome da habilidade 1.
       ------------------------------------------------------------ */
    'sun-wukong': {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Wukong',
             'https://honor-of-kings.fandom.com/wiki/Wukong',
             'https://hokstats.gg/heroes/wukong/',
             'https://gamingonphone.com/guides/honor-of-kings-wukong-guide-gameplay-tips/'],
      alerta: 'A segunda busca se contradisse sozinha: no meio do texto chamou a habilidade 1 de "Fortification Spell" e, ao listar o conjunto, de "Protective Shroud". Não é divergência entre fontes; é a mesma resposta discordando dela mesma.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'The Great Sage',
          texto: 'Usar habilidade melhora o próximo ataque básico, que vira um golpe com avanço e causa dano extra. Ele tem taxa de crítico base mais alta e dano crítico base mais baixo que os outros heróis.',
          confianca: 'media', nota: 'O nome apareceu numa busca só; o mecanismo, nas duas.' },
        { slot: '1', tecla: '1', nome: 'Fortification Spell',
          texto: 'Ganha velocidade de movimento e bloqueia o dano e os efeitos da próxima habilidade inimiga. Bloqueando com sucesso, ganha dano temporário, invulnerabilidade a habilidade e escudo.',
          confianca: 'media',
          disputa: { oQue: 'o nome desta habilidade',
            leituraA: 'Fortification Spell — como as duas buscas escreveram ao descrever o efeito.',
            leituraB: 'Protective Shroud — como a segunda busca escreveu ao listar o conjunto completo, na mesma resposta.',
            porQueNaoEscolhi: 'A mesma resposta usou os dois nomes para a mesma habilidade. Guardei o que aparece junto da descrição, e deixei o outro aqui.' } },
        { slot: '2', tecla: '2', nome: 'Furious Advance',
          texto: 'Desloca-se na direção alvo. Acertar unidades durante o deslocamento dispara outro deslocamento e dá velocidade de movimento.',
          confianca: 'alta' },
        { slot: '3', tecla: '3', ult: true, nome: 'Golden Cudgel',
          texto: 'Lança para o alto os inimigos no alcance, causando dano e aplicando 3 marcas. Disparar as marcas rende dano adicional.',
          confianca: 'media', nota: 'Nome numa busca só; o efeito (controle + 3 marcas) apareceu nas duas.' },
      ],
    },

    /* ------------------------------------------------------------
       ZHAO YUN — o caso mais embaralhado depois do Nezha.
       ------------------------------------------------------------ */
    'zhao-yun': {
      cruzado: true, buscas: 2,
      ordemIncerta: true,
      urls: ['https://honor-of-kings.fandom.com/wiki/Zilong',
             'https://liquipedia.net/honorofkings/Zhao_Huaizhen',
             'https://hokstats.gg/heroes/zilong/',
             'https://gaminggblog.com/honor-of-kings-zilong-build/'],
      alerta: 'Três problemas de uma vez. (1) O jogo usa DOIS nomes para ele — Zhao Yun e Zilong — e as fontes misturam. (2) "Soaring Dragon" aparece ora como estágio da passiva, ora como habilidade ativa. (3) Não deu para estabelecer qual ativa é a 1 e qual é a 2. Por isso o app NÃO casa as habilidades 1 e 2 com os botões do treino deste herói: só a ultimate.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: null,
          texto: 'A redução de dano cresce conforme a vida cai. Uma das leituras detalha três estágios: acima de 66% de vida, 5% de redução; entre 33% e 66%, 10% e mais alcance no avanço; abaixo de 33%, 20% e mais golpes com a lança.',
          confianca: 'media',
          disputa: { oQue: 'o nome da passiva',
            leituraA: 'A passiva tem três estágios chamados Hidden Dragon, Rising Dragon e Soaring Dragon.',
            leituraB: 'A passiva se chama "Roar of Protection".',
            porQueNaoEscolhi: 'Pior ainda: "Soaring Dragon" aparece também como nome de uma habilidade ATIVA na mesma busca. Se o mesmo nome está em dois lugares, uma das leituras está errada e eu não sei qual.' } },
        { slot: '1', tecla: '1', nome: 'Soaring Dragon',
          texto: 'Lança o inimigo para o alto.',
          confianca: 'media',
          nota: 'A ORDEM não está estabelecida: as buscas citam "Soaring Dragon" e "Cloud-Piercing Dragon" como as duas ativas, sem dizer qual é a 1 e qual é a 2. Pode estar trocado com a linha de baixo.' },
        { slot: '2', tecla: '2', nome: 'Cloud-Piercing Dragon',
          texto: 'É a habilidade de dano da sequência, usada depois do lançamento.',
          confianca: 'media',
          nota: 'Mesma ressalva da habilidade 1: a ordem entre as duas não foi confirmada.' },
        { slot: '3', tecla: '3', ult: true, nome: 'Thunderbreaker',
          texto: 'Salta no ar e desce com um golpe de trovão, derrubando quem estiver na área por 1 s e causando dano físico.',
          numeros: '550/825/1100 (+1150% de ataque físico bônus).',
          confianca: 'alta',
          nota: 'Único campo dele confirmado nas duas buscas. O número de escala (+1150%) é o que a busca devolveu; parece alto e não foi conferido.' },
      ],
    },
  };

  /* A camada de habilidade entra como as outras camadas do banco
     (função, tier, estatística): sem sobrescrever o que o herói já
     trouxe de uma fonte melhor, e sem inventar herói novo. */
})(window.U);
