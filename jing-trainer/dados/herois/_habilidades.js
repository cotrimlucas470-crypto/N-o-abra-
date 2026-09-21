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
    cobertura: '25 de 117 heróis com kit montado + 1 com conflito total registrado (Nezha).',

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
        { slot: 'passiva', tecla: 'P', nome: 'Hidden Dragon',
          texto: 'As Almas de Dragão das duas últimas habilidades usadas mudam o ataque básico, que passa a causar dano físico em até dois inimigos. Cada habilidade usada dá 1 marca, até 3. O ataque básico gasta todas as marcas de uma vez, batendo uma vez por marca.',
          confianca: 'alta',
          nota: 'O nome ficou em disputa numa rodada anterior — uma busca disse que não encontrou nada com esse nome. Uma TERCEIRA busca, perguntada de novo e direto, confirmou "Hidden Dragon" de forma explícita. Resolvido: 2 confirmações contra 1 não-achado.' },
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
          confianca: 'alta', nota: 'O nome tinha aparecido numa busca só. Uma TERCEIRA busca, feita depois, confirmou "The Great Sage" de novo, de forma independente.' },
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
      alerta: 'Quatro problemas agora, não três. (1) O jogo usa DOIS nomes para ele — Zhao Yun e Zilong — e as fontes misturam. (2) "Soaring Dragon" aparece ora como estágio da passiva, ora como habilidade ativa. (3) Não deu para estabelecer qual ativa é a 1 e qual é a 2. (4) Numa busca posterior, "Thunderbreaker" — que as duas primeiras buscas deram como ULTIMATE — apareceu como habilidade 1, ao lado de um nome novo ("Stormpiercer") para a 2. Mais pesquisa não reduziu a confusão deste herói, aumentou. Por isso o app NÃO casa as habilidades 1 e 2 com os botões do treino: só a ultimate, e com confiança rebaixada.',
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
          confianca: 'media',
          nota: 'Duas buscas confirmam este texto como a ultimate. Uma TERCEIRA busca, numa rodada depois, chamou "Thunderbreaker" de HABILIDADE 1 e deu "Stormpiercer" como habilidade 2 — nomes que não batem com nada registrado aqui. Isso não resolve nada: só confirma que este é o herói com a pesquisa mais inconsistente do banco, e por isso a confiança caiu de "alta" para "média" em vez de subir.' },
      ],
    },

    /* ------------------------------------------------------------
       CHARLOTTE — passiva e ultimate cruzadas; 1 e 2 de uma busca.
       ------------------------------------------------------------ */
    charlotte: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Charlotte',
             'https://honor-of-kings.fandom.com/wiki/Charlotte',
             'https://hokstats.gg/heroes/charlotte/',
             'https://itemlevel.net/honor-of-kings-complete-charlotte-guide/'],
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Splash Gradation',
          texto: 'Quando uma habilidade acerta, a próxima vem melhorada como golpe de sequência e ela ganha uma marca por 4 s. Com 3 marcas, o próximo ataque básico vira o golpe Seven-Star Radiant Sword, que trava num inimigo e bate 7 vezes.',
          confianca: 'alta',
          nota: 'Ela é herói de encadear: cada acerto prepara o seguinte. Parar de acertar zera a cadeia.' },
        { slot: '1', tecla: '1', nome: 'Tri-Slash',
          texto: 'Não encontrado na fonte.',
          confianca: 'media', nota: 'Só o nome, e de uma busca só. A outra não nomeou as habilidades 1 e 2.' },
        { slot: '2', tecla: '2', nome: 'Splash Fount',
          texto: 'Não encontrado na fonte.',
          confianca: 'media', nota: 'Idem: nome de uma busca, sem descrição em nenhuma das duas.' },
        { slot: '3', tecla: '3', ult: true, nome: 'Power Gradation',
          texto: 'Desenha uma estrela de sete pontas em volta dela, causando dano e lentidão em quem estiver dentro. Depois ela ganha imunidade e redução de dano.',
          confianca: 'alta' },
      ],
    },

    /* ------------------------------------------------------------
       ERIN — nomes cruzados, com apelidos regionais registrados.
       ------------------------------------------------------------ */
    erin: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Erin',
             'https://honor-of-kings.fandom.com/wiki/Erin',
             'https://hokstats.gg/heroes/erin/',
             'https://gaminggblog.com/honor-of-kings-erin-build/'],
      alerta: 'As duas buscas dizem que esta heroína tem nomes ALTERNATIVOS por região/tradução, e trazem os dois. Aqui fica o nome mais repetido, com o alternativo ao lado — não é divergência de fonte, é o jogo publicando em mais de um idioma.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Elf Dance',
          texto: 'Ela usa Energia no lugar de mana, e o ataque básico enche a barra. No máximo de Energia ela acelera, ganha uma marca de Louro e o próximo ataque básico vem melhorado.',
          confianca: 'alta', nota: 'Apelido regional: "Fairy Dance". O Louro é o recurso que abre a ultimate.' },
        { slot: '1', tecla: '1', nome: 'Dance - Leaf Greeting',
          texto: 'Atira uma folha que causa dano e rende marcas. A folha depois forma um círculo, causando dano e lentidão.',
          confianca: 'alta', nota: 'Apelido regional: "Greeting of Leaves".' },
        { slot: '2', tecla: '2', nome: 'Twirl - Forest Whisper',
          texto: 'Ganha velocidade de ataque e imunidade a lentidão. Ganha 2 marcas de Louro na hora e enche a Energia, disparando a passiva.',
          confianca: 'alta', nota: 'Apelido regional: "Spinning Song".' },
        { slot: '3', tecla: '3', ult: true, nome: 'Waltz - Laurel Blossom',
          texto: 'Só pode ser usada com 6 marcas de Louro. Ganha velocidade de movimento e entra num estado em que gasta cada marca disparando rápido em quem estiver perto.',
          confianca: 'alta', nota: 'Apelido regional: "Laurel Bloom". Contar as marcas dela é contar quando a ultimate vem.' },
      ],
    },

    /* ------------------------------------------------------------
       YAO — três de quatro cruzados; o 2 tem dois nomes.
       ------------------------------------------------------------ */
    yao: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Yao',
             'https://honor-of-kings.fandom.com/wiki/Yao',
             'https://hokstats.gg/heroes/yao/',
             'https://www.vcgamers.com/news/en/yao-skill-and-build-explanation-in-honor-of-kings/'],
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Gift of the Stars',
          texto: 'Recupera vida ao acertar habilidade. Usar três habilidades quaisquer melhora a próxima, e usar a melhorada melhora o ataque básico seguinte. Parte do dano que ele leva vira Redução Estelar depois de um atraso curto.',
          confianca: 'media',
          nota: 'As duas buscas descrevem PARTES diferentes da passiva — uma fala da cura e do encadeamento, a outra da Redução Estelar. Juntei as duas porque não se contradizem; se uma delas for de outro herói ou de outro patch, isto está errado e eu não teria como saber.' },
        { slot: '1', tecla: '1', nome: 'Starlight Slice',
          texto: 'Causa dano a quem estiver perto.',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Starburn',
          texto: 'Move-se rápido, causando dano e lentificando quem estiver no caminho.',
          confianca: 'media',
          disputa: { oQue: 'o nome desta habilidade',
            leituraA: 'Starburn (primeira busca).',
            leituraB: 'Star Rush (segunda busca, que menciona "também chamada Starburn em algumas fontes").',
            porQueNaoEscolhi: 'A segunda busca reconhece os dois nomes em vez de escolher. A descrição é a mesma nas duas.' } },
        { slot: '3', tecla: '3', ult: true, nome: 'Return to Dust',
          texto: 'Volta para onde ele estava 2 s atrás, remove a Redução Estelar e causa dano a quem estiver no caminho.',
          confianca: 'alta',
          nota: 'Voltar no tempo é o que faz ele sobreviver a uma entrada que deu errado — e é o que você precisa prever ao caçá-lo.' },
      ],
    },

    /* ------------------------------------------------------------
       MAI SHIRANUI — o mais completo do lote: nomes, descrições e
       números cruzados nas duas buscas.
       ------------------------------------------------------------ */
    'mai-shiranui': {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Mai_Shiranui',
             'https://honor-of-kings.fandom.com/wiki/Mai_Shiranui',
             'https://hokstats.gg/heroes/mai-shiranui/',
             'https://itemlevel.net/honor-of-kings-complete-mai-shiranui-guide/'],
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Hissatsu Shinobi-Bachi',
          texto: 'A cada 5 s o ataque básico vem melhorado: causa dano mágico, empurra e devolve 10 de Energia. Dá para deslizar com a alavanca de movimento durante o ataque básico ou durante uma habilidade, ganhando 50% de velocidade que some em 0,5 s.',
          numeros: '100 (+100% de ataque mágico).',
          confianca: 'alta' },
        { slot: '1', tecla: '1', nome: 'Hishou Ryuuenjin',
          texto: 'Avança na direção alvo e termina com um chute voador, causando dano mágico e lançando quem estiver no alcance por 0,75 s. Devolve 25 de Energia se acertar.',
          numeros: '600 (+80% de ataque mágico).',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Kachousen',
          texto: 'Joga o leque na direção alvo, causando dano mágico no primeiro inimigo atingido, lentificando em 90% por 0,5 s e reduzindo a defesa mágica dele em 50 por 3 s. Devolve 10 de Energia e bate também na unidade logo atrás (metade contra heróis).',
          numeros: '450 (+90% de ataque mágico).',
          confianca: 'alta' },
        { slot: '3', tecla: '3', ult: true, nome: 'Chou Hissatsu Shinobi-Bachi',
          texto: 'Avança na direção alvo, derruba todos no caminho, reduz o ataque físico deles em 20% por 2,5 s e causa dano mágico. Devolve 25 de Energia por inimigo atingido.',
          numeros: '800 (+110% de ataque mágico).',
          confianca: 'alta' },
      ],
    },

    /* ------------------------------------------------------------
       YUHUAN — quatro ativas, nomes todos cruzados. O que diverge
       é como as fontes chamam os DOIS MODOS da passiva.
       ------------------------------------------------------------ */
    yuhuan: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Yuhuan',
             'https://honor-of-kings.fandom.com/wiki/Yuhuan',
             'https://hokstats.gg/heroes/yuhuan/',
             'https://onlinegamingph.com/honor-of-kings-yuhuan-guide/'],
      alerta: 'Quatro habilidades ativas. Os quatro nomes bateram nas duas buscas — o que diverge é como cada fonte chama os DOIS MODOS da passiva: uma diz "Tragic Beauty" e "Melody of Peace", a outra diz simplesmente "Guerra" e "Paz". E esses mesmos nomes aparecem também como habilidade 1 e como ultimate, o que confunde a leitura.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Poignant Melodies',
          texto: 'Ela troca de melodia, e a melodia muda o que as habilidades fazem. No modo de dano, cada habilidade lançada causa dano mágico a quem estiver perto. No modo de cura, cada habilidade cura os aliados por perto (até cinco heróis) e cura ela também.',
          numeros: 'dano 90–180 (+15% de ataque mágico) em 800 de alcance; cura 35–70 (+6% de ataque mágico), mais 5% de vida extra nela.',
          confianca: 'alta',
          nota: 'Saber em que modo ela está é metade da luta contra ela — e os nomes dos modos mudam conforme a fonte.' },
        { slot: '1', tecla: '1', nome: 'Tragic Beauty',
          texto: 'Causa dano e lentidão em quem estiver perto. O próximo ataque básico bate mais forte.',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Mournful Tempo',
          texto: 'Ganha velocidade de movimento e, depois de um atraso curto, causa dano e atordoa na área alvo.',
          confianca: 'alta' },
        { slot: '3', tecla: '3', nome: 'Unending Sorrow',
          texto: 'Fica sem poder ser alvo e, depois de um atraso curto, cura os aliados no alcance e causa dano nos inimigos.',
          confianca: 'alta' },
        { slot: '4', tecla: '4', ult: true, nome: 'Melody of Peace',
          texto: 'Salta no ar tocando o instrumento — sem poder ser alvo e removendo todo controle nesse tempo. Ao terminar, cura a si mesma, cura os aliados no alcance de 500 pela metade desse valor, e causa dano mágico aos inimigos na área.',
          numeros: 'cura 750/1125/1500 (+100% de ataque mágico) (+5% da vida máxima); dano 500/750/1000 (+75% de ataque mágico).',
          confianca: 'alta' },
      ],
    },

    /* ------------------------------------------------------------
       MUSASHI — as ativas batem; a passiva e a ultimate trocam de
       lugar entre as buscas.
       ------------------------------------------------------------ */
    musashi: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Musashi',
             'https://honor-of-kings.fandom.com/wiki/Musashi',
             'https://hokstats.gg/heroes/musashi/',
             'https://gamingonphone.com/guides/honor-of-kings-musashi-guide-gameplay-tips/'],
      alerta: '"Niten Ichiryu" aparece como ULTIMATE numa busca e como PASSIVA na outra. As habilidades 1 e 2 batem nas duas. Enquanto isso não se resolve, o nome fica marcado em disputa nos dois lugares.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: null,
          texto: 'Depois de usar uma habilidade ele acumula uma carga; cada ataque básico gasta uma carga e ganha um efeito diferente.',
          confianca: 'media',
          disputa: { oQue: 'o nome da passiva',
            leituraA: '"Oni Hunter" (primeira busca).',
            leituraB: '"Niten Ichiryuu" (segunda busca) — que é o nome que a PRIMEIRA busca deu para a ultimate. A segunda, perguntada direto, disse que não achou nada chamado "Oni Hunter".',
            porQueNaoEscolhi: 'Um nome não pode ser passiva numa fonte e ultimate na outra sem que uma delas esteja errada. O mecanismo (carga por habilidade, gasta no básico) apareceu igual nas duas e está guardado; o nome fica em branco.' } },
        { slot: '1', tecla: '1', nome: 'Illuminating Slash',
          texto: 'Solta energia de espada na direção alvo, causando dano a quem estiver no caminho e derrubando projéteis.',
          confianca: 'alta', nota: 'Apelido que apareceu numa das buscas: "Sky Cleave".' },
        { slot: '2', tecla: '2', nome: 'Extreme Speed',
          texto: 'Avança para a frente causando dano físico a quem estiver no caminho.',
          numeros: '180/216/252/288/324/360 (+40% de ataque físico).',
          confianca: 'alta' },
        { slot: '3', tecla: '3', ult: true, nome: 'Niten Ichiryu',
          texto: 'Trava num herói inimigo, avança até a área dele causando dano físico e lançando por 1 s. Depois desafia o alvo para um duelo de 5 s, em que toda cura recebida pelo alvo fica adiada.',
          numeros: '350/475/600 (+70% de ataque físico).',
          confianca: 'media',
          disputa: { oQue: 'se este nome é da ultimate ou da passiva',
            leituraA: 'É a ultimate — primeira busca, com descrição e números completos.',
            leituraB: 'É a PASSIVA — segunda busca, que não descreve a ultimate.',
            porQueNaoEscolhi: 'Só a primeira busca descreveu um efeito de ultimate, e é um efeito de ultimate (trava alvo, duelo de 5 s). Guardei aqui por isso, mas com a ressalva à vista.' } },
      ],
    },

    /* ------------------------------------------------------------
       ATHENA — a primeira busca trouxe os nomes SEM saber em que
       slot cada um ficava; a segunda resolveu, e as descrições
       batem com a ordem que ela deu.
       ------------------------------------------------------------ */
    athena: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Athena',
             'https://honor-of-kings.fandom.com/wiki/Athena',
             'https://hokstats.gg/heroes/athena/',
             'https://gamingonphone.com/guides/honor-of-kings-athena-guide-gameplay-tips/'],
      alerta: 'A primeira busca devolveu os três nomes de ativa e disse, com todas as letras, que não sabia qual era qual. A segunda deu a ordem, e as descrições da primeira encaixam nessa ordem — por isso este kit está montado. Se a ordem da segunda estiver errada, tudo aqui desloca junto.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Divine Awakening',
          texto: 'Depois de morrer ela continua se movendo em forma verdadeira e, ao ressuscitar, causa dano e lança para o alto quem estiver no alcance — com dano extra em unidades que não são heróis.',
          confianca: 'media', nota: 'O nome veio de uma busca só; o mecanismo, das duas.' },
        { slot: '1', tecla: '1', nome: 'Holy Advance',
          texto: 'Avança com o escudo à frente, empurrando e causando dano, e ganha um escudo que dá imunidade a controle.',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Unstoppable Spear',
          texto: 'Desloca-se na direção alvo e melhora o próximo ataque básico, que avança e causa dano. Acertar o MESMO alvo três vezes seguidas causa dano extra proporcional à vida que falta nele.',
          confianca: 'alta' },
        { slot: '3', tecla: '3', ult: true, nome: 'Immovable Aegis',
          texto: 'Ergue um escudo que dá imunidade a controle.',
          confianca: 'media', nota: 'A descrição que as buscas devolveram é curta assim. Não completei o resto por dedução.' },
      ],
    },

    /* ------------------------------------------------------------
       ARTHUR — limpo, e com números na segunda busca.
       ------------------------------------------------------------ */
    arthur: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Arthur_(Honor_of_Kings)',
             'https://honor-of-kings.fandom.com/wiki/Arthur',
             'https://hokstats.gg/heroes/arthur/',
             'https://gaminggblog.com/honor-of-kings-arthur/'],
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Holy Vanguard',
          texto: 'Recupera 2% da vida máxima a cada 2 s. Se a velocidade de movimento dele estiver reduzida, a recuperação dobra.',
          confianca: 'alta',
          nota: 'Curar mais justamente quando está lentificado é o que faz ele aguentar ser perseguido.' },
        { slot: '1', tecla: '1', nome: 'Valiant Charge',
          texto: 'Melhora o próximo ataque básico, que passa a avançar, causar dano extra e silenciar.',
          confianca: 'media',
          disputa: { oQue: 'o que exatamente a habilidade faz além do avanço',
            leituraA: 'Dá +30% de velocidade por 3 s, e o próximo básico vira um salto com dano físico e silêncio de 1,25 s.',
            leituraB: 'O básico melhorado também MARCA o alvo, e a marca rende dano mágico extra no básico ou habilidade seguinte.',
            porQueNaoEscolhi: 'As duas podem ser partes da mesma habilidade em patches diferentes. A marca muda como se joga contra ele, então não juntei as duas como se fossem uma leitura só.' } },
        { slot: '2', tecla: '2', nome: 'Whirling Strike',
          texto: 'Invoca o escudo sagrado, causando dano físico por segundo a quem estiver no alcance durante 5 s.',
          numeros: '145 (+80% de ataque físico) por segundo.',
          confianca: 'alta' },
        { slot: '3', tecla: '3', ult: true, nome: 'Might of Excalibur',
          texto: 'Salta até o herói inimigo alvo causando dano mágico igual a 16% da vida máxima dele e deixando um selo sagrado no chão. O salto lança para o alto os heróis no alcance do selo por 0,5 s. O selo dura 5 s, causando dano mágico por segundo a quem estiver dentro.',
          numeros: '16% da vida máxima no impacto; 85 de dano mágico por segundo no selo.',
          confianca: 'alta' },
      ],
    },

    /* ------------------------------------------------------------
       LADY SUN — quatro nomes cruzados, com um número suspeito.
       ------------------------------------------------------------ */
    'lady-sun': {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Lady_Sun',
             'https://honor-of-kings.fandom.com/wiki/Lady_Sun',
             'https://hokstats.gg/heroes/lady-sun/',
             'https://gamingonphone.com/guides/honor-of-kings-lady-sun-guide-gameplay-tips/'],
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Energy Burst',
          texto: 'Cada ataque básico que acerta reduz em 0,5 s a recarga da habilidade 1.',
          confianca: 'alta',
          nota: 'Por isso ela rola tanto: bater de básico é o que devolve o rolamento.' },
        { slot: '1', tecla: '1', nome: 'Rolling Raid',
          texto: 'Rola na direção indicada, e o próximo ataque básico vira um tiro carregado que causa dano físico em linha. Ganha velocidade de movimento se houver herói inimigo por perto depois do rolamento.',
          numeros: '270/290/310/330/350/370 (+100% de ataque físico).',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Frag Grenade',
          texto: 'Joga uma granada no local alvo, causando dano e MARCANDO quem for atingido. O ataque básico dela bate mais forte em alvo marcado.',
          confianca: 'alta',
          nota: 'Sobre o efeito na defesa do alvo as duas buscas divergem no detalhe: uma fala em "quebrar defesa", a outra em reduzir 10% da defesa física. O mecanismo da marca é o mesmo.' },
        { slot: '3', tecla: '3', ult: true, nome: 'Ultimate Shell',
          texto: 'Dispara um tiro forte na direção alvo, causando dano físico pesado no primeiro inimigo atingido; depois o tiro explode no ar e atinge quem estiver num leque além do ponto da explosão.',
          confianca: 'media',
          nota: 'A segunda busca dá "757% do dano" para a parte em leque. Isso não parece um número de jogo — provavelmente é 75,7%, ou um erro da fonte. Guardei o mecanismo e NÃO guardei esse número, porque um número errado é pior que nenhum.' },
      ],
    },

    /* ------------------------------------------------------------
       SHOUYUE — as três ativas batem; a passiva vem com dois
       mecanismos diferentes, não só dois nomes.
       ------------------------------------------------------------ */
    shouyue: {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Shouyue',
             'https://honor-of-kings.fandom.com/wiki/Shouyue',
             'https://hokstats.gg/heroes/shouyue/',
             'https://itemlevel.net/honor-of-kings-complete-shouyue-guide/'],
      alerta: 'As três ativas batem nas duas buscas. A passiva parecia ter duas descrições incompatíveis — uma TERCEIRA busca mostrou que não eram incompatíveis: são duas partes da mesma passiva, e por isso o texto foi reescrito juntando as duas.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Accuracy',
          texto: 'Ataques básicos causam dano extra, e a taxa de crítico dele é convertida em ataque físico — crítico a mais vira mais dano de básico direto, sem depender de acertar o crítico. Fora de combate, junto de uma parede, ele ganha camuflagem e velocidade de movimento; fora de combate ele também acumula marcas que aumentam penetração física e dano do básico, e acertar herói consome as marcas.',
          confianca: 'alta',
          nota: 'Duas buscas anteriores pareciam descrever passivas DIFERENTES — uma falava só da conversão de crítico, a outra só das marcas fora de combate. Uma terceira busca trouxe as duas partes juntas, com o mesmo nome ("Accuracy") cobrindo tudo. Não era divergência: era descrição parcial nas duas primeiras.' },
        { slot: '1', tecla: '1', nome: 'The Tranquil Eye',
          texto: 'Coloca um aparelho que dá visão na área em volta. Fora de combate, ele ganha camuflagem e mais velocidade de movimento e de ataque perto de terreno natural ou dentro da área do aparelho.',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Wild Wind',
          texto: 'Dá um tiro de precisão na direção alvo, causando dano e lentidão. Fica melhorada quando a velocidade de ataque passa de certos limiares.',
          confianca: 'alta' },
        { slot: '3', tecla: '3', ult: true, nome: 'Getaway',
          texto: 'Salta para trás e atira na direção alvo, causando dano e lentidão em quem acertar, e ganhando velocidade de movimento. Divide a munição com Wild Wind e aumenta o alcance do ataque básico.',
          confianca: 'alta',
          nota: 'Dividir munição com a habilidade 2 é o detalhe que decide a luta contra ele: se ele gastou no tiro, não tem a fuga.' },
      ],
    },

    /* ------------------------------------------------------------
       MARCO POLO — pedido nomeado. Nomes e ordem cruzados nas duas
       buscas; o efeito de "mais dano perto de herói inimigo" aparece
       preso à passiva numa busca e à habilidade 2 na outra.
       ------------------------------------------------------------ */
    'marco-polo': {
      cruzado: true, buscas: 2,
      urls: ['https://liquipedia.net/honorofkings/Marco_Polo',
             'https://honor-of-kings.fandom.com/wiki/Marco_Polo',
             'https://hokstats.gg/heroes/marco-polo/',
             'https://hokmeta.com/learn/marco-polo-guide/'],
      alerta: 'Um efeito aparece em dois lugares diferentes entre as buscas: "mais dano e velocidade perto de herói inimigo" está descrito dentro da PASSIVA numa busca, e dentro da habilidade 2 (Roaming Gun) na outra. Pode ser o mesmo texto duplicado na hora de resumir, ou a passiva realmente ativar via a habilidade 2. Guardei na passiva, que é onde apareceu com mais detalhe, e deixei a ressalva na habilidade 2.',
      lista: [
        { slot: 'passiva', tecla: 'P', nome: 'Chain Reaction',
          texto: 'Com herói inimigo a 500 de distância, o dano dele sobe 20% e a velocidade de movimento sobe 15–30% (escala com nível). Ataque básico e dano de habilidade aplicam uma marca de Corrosão de Armadura no alvo (5 marcas de uma vez em minion). Com 10 marcas, ele recupera 30 de energia e o alvo entra em Corrosão: cada acerto seguinte causa dano verdadeiro extra.',
          numeros: '+40 (+35% de ataque físico) de dano verdadeiro extra por acerto durante a Corrosão.',
          confianca: 'alta' },
        { slot: '1', tecla: '1', nome: 'Resplendent Revolver',
          texto: 'Atira na direção alvo por um tempo, ganhando velocidade de movimento enquanto atira.',
          confianca: 'alta' },
        { slot: '2', tecla: '2', nome: 'Roaming Gun',
          texto: 'Desloca-se (blink) na direção alvo.',
          confianca: 'media',
          nota: 'Uma das buscas repete aqui o mesmo texto de "mais dano e velocidade perto de herói inimigo" que também apareceu na passiva. Guardado só na passiva — ver o aviso deste herói.' },
        { slot: '3', tecla: '3', ult: true, nome: 'Fevered Barrage',
          texto: 'Desloca-se (blink) na direção alvo e passa a se mover devagar nessa direção atirando rajadas nos inimigos por perto durante 3 s. A cadência da rajada segue a velocidade de ataque; a cada 3 rajadas conta como 1 ataque básico.',
          numeros: '213 (170 + 25% de ataque físico) por rajada.',
          confianca: 'alta' },
      ],
    },
  };

  /* A camada de habilidade entra como as outras camadas do banco
     (função, tier, estatística): sem sobrescrever o que o herói já
     trouxe de uma fonte melhor, e sem inventar herói novo. */
})(window.U);
