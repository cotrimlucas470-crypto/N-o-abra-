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
    cobertura: '3 de 117 heróis com kit montado (Jing, Luna, Nuwa) + 1 com conflito total registrado (Nezha).',

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
          slot: '3', tecla: '3', nome: 'Mirror Domain',
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
          slot: '3', tecla: '3', nome: 'New Moon',
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
          slot: '3', tecla: '3', nome: 'Incantation - Ruin',
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
  };

  /* A camada de habilidade entra como as outras camadas do banco
     (função, tier, estatística): sem sobrescrever o que o herói já
     trouxe de uma fonte melhor, e sem inventar herói novo. */
})(window.U);
