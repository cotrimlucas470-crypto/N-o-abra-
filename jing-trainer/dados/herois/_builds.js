/* ============================================================
   dados/herois/_builds.js — itens por herói

   POR QUE ISTO NÃO ENTROU NO CAMPO 'builds' DO BANCO

   O campo hero.builds já existe, e ele é OUTRA COISA: foi feito
   para a fonte prioritária (pvp.mcxssg.net), que publica 出装推荐
   — item por slot COM PORCENTAGEM DE USO E EFEITO NA VITÓRIA.
   Aquilo é contagem: "68,4% compram este item no slot 1, e quem
   compra ganha 0,1 ponto a mais". É auditável.

   Isto aqui não é contagem. É OPINIÃO DE GUIA: alguém escreveu
   "os melhores itens da Jing são estes" e a busca me devolveu um
   resumo dessa frase. Misturar as duas coisas no mesmo campo faria
   a opinião herdar a autoridade da estatística — que é exatamente
   o tipo de mentira silenciosa que este banco recusa. Por isso ela
   mora num campo próprio, com o rótulo colado.

   REGRA DESTE ARQUIVO (a mesma de _habilidades.js)
   · duas buscas por herói, no mínimo;
   · o que as DUAS deram fica em 'concordam';
   · o que só UMA deu fica em 'soUmaBusca', marcado como tal — não
     sobe para 'concordam' por parecer razoável;
   · onde as duas se contradizem, ficam AS DUAS leituras em
     'divergem'. Não se escolhe a mais bonita, nem a mais recente;
   · nome de item que a busca escreveu diferente do nome do seu
     catálogo (Daybreaker × Daybreaker's Virtue) NÃO é "corrigido"
     por semelhança: fica o que a busca deu, com a diferença
     escrita no campo 'nota'.

   O QUE ISTO NÃO É: ordem de compra. Nenhuma das buscas devolveu
   uma ordem confiável de slot 1 → slot 6. Inventar uma ordem a
   partir de uma lista sem ordem seria invenção, então não tem.
   ============================================================ */
'use strict';
(function (U) {

  U.HE.BUILDS = {
    fonte: 'busca_web',
    fonteNome: 'busca na web (resumo de trechos, não leitura de página)',
    prioritaria: false,
    conferido: false,
    tipo: 'opiniao_de_guia',
    quando: '2026-09-19',
    aviso: 'Isto é opinião de guia, não estatística de partida. A fonte prioritária (pvp.mcxssg.net) publica item por slot com % de uso e efeito na vitória — e ela continua bloqueada nesta sessão. Quando ela entrar, estes números caem fora e os de lá entram.',
    cobertura: '3 de 117 heróis: Jing e Luna (os seus) e Marco Polo (que você apontou como faltando).',
    semOrdem: 'Nenhuma busca devolveu ordem de compra confiável. As listas abaixo são conjuntos, não sequências.',

    porHeroi: {

      jing: {
        cruzado: true,
        buscas: 2,
        urls: [
          'https://www.sportskeeda.com/esports/best-jing-build-honor-kings-equipment-arcanas-battle-spell-skill-combo',
          'https://hokbuild.com/hero/jing/',
          'https://zathong.com/honor-of-kings-jing/',
          'https://gamingonphone.com/guides/honor-of-kings-jing-guide-gameplay-tips/',
        ],
        alerta: 'As duas buscas concordam nos três itens de dano e brigam nas botas: uma diz Boots of Dexterity, a outra Boots of Resistance. As duas ficam registradas. Note que só um dos itens confirmados (Axe of Torment) existe no seu catálogo — o catálogo vai de A até H, e Master Sword e Siege Breaker ficam depois do H.',
        concordam: [
          { nome: 'Axe of Torment', papel: 'perfuração física', noCatalogo: true },
          { nome: 'Master Sword', papel: 'dano físico', noCatalogo: false,
            nota: 'Não está no seu catálogo: ele cobre de A até H e este item vem depois.' },
          { nome: 'Siege Breaker', papel: 'dano físico', noCatalogo: false,
            nota: 'Não está no seu catálogo: ele cobre de A até H e este item vem depois.' },
        ],
        soUmaBusca: [
          { nome: 'Rapacious Bite', papel: 'primeiro item de selva', noCatalogo: false, busca: 'A',
            nota: 'Só a primeira busca citou, e como PRIMEIRO item do core. Item de selva com esse nome não aparece no seu catálogo (que vai só até o H).' },
          { nome: 'Hunting Knife', papel: 'item inicial de selva', noCatalogo: true, busca: 'B',
            nota: 'Só a segunda busca citou, como item de início. Este existe no seu catálogo, com o preço cortado na captura.' },
        ],
        divergem: [
          {
            oQue: 'qual bota',
            leituraA: 'Boots of Dexterity (velocidade de ataque)',
            leituraB: 'Boots of Resistance (defesa mágica e resistência a controle)',
            porQueNaoEscolhi: 'As duas botas existem no seu catálogo e custam o mesmo (700). A escolha entre elas depende da composição inimiga, e nenhuma das duas buscas disse contra o quê. Escolher uma aqui seria dar cara de dado a um chute meu.',
          },
        ],
        feitico: { nome: 'Smite', confianca: 'alta',
          nota: 'As duas buscas deram o mesmo feitiço de batalha.' },
        arcana: {
          leitura: '10 Mutation · 10 Eagle Eye · 10 Concealment',
          confianca: 'alta',
          nota: 'As duas buscas deram exatamente a mesma trinca.',
          conflitoComSuasCapturas: 'ATENÇÃO: o banco já tem uma arcana da Jing vinda das SUAS capturas do HOK PRO, com as contagens 8/2/5/5/10 e sem nomes. Aquilo é o que você tem; isto é o que o guia recomenda. São coisas diferentes e nenhuma das duas foi apagada para caber a outra.',
        },
      },

      luna: {
        cruzado: true,
        buscas: 2,
        urls: [
          'https://zathong.com/honor-of-kings-luna/',
          'https://hokbuild.com/hero/luna/',
          'https://sportskeeda.com/esports/honor-kings-luna-build-guide-best-equipment-arcanas-battle-spell-skill-combos',
          'https://gaminggblog.com/honor-of-kings-luna-build/',
        ],
        alerta: 'Quatro itens saíram iguais nas duas buscas. O quinto briga: uma diz Runeblade, a outra Savant\'s Wrath. A terceira arcana também briga (Red Moon × Nightmare). Só dois dos itens confirmados estão no seu catálogo — os outros ficam depois do H.',
        concordam: [
          { nome: 'Boots of Resistance', papel: 'botas, resistência a controle', noCatalogo: true },
          { nome: "Augur's Word", papel: 'ataque mágico e defesa', noCatalogo: true,
            nota: 'A segunda busca escreveu "Angur\'s Word". Tratei como erro de digitação da própria fonte, e não como item diferente, porque o resto do texto descreve o mesmo item. Fica registrado que a grafia veio torta de lá.' },
          { nome: 'Insatiable Tome', papel: 'ataque mágico, recarga e roubo de vida mágico', noCatalogo: false,
            nota: 'Não está no seu catálogo: ele cobre de A até H.' },
          { nome: 'Void Staff', papel: 'perfuração mágica', noCatalogo: false,
            nota: 'Não está no seu catálogo: ele cobre de A até H.' },
        ],
        soUmaBusca: [
          { nome: 'Breakthrough Robe', papel: 'vida virando perfuração mágica', noCatalogo: true, busca: 'A',
            nota: 'Só a primeira busca citou. Este existe no seu catálogo, com a passiva encontrada.' },
          { nome: 'Hunting Knife', papel: 'item inicial de selva', noCatalogo: true, busca: 'A',
            nota: 'Só a primeira busca citou, e ela também chama a Luna de selva — o que bate com o feitiço Smite da segunda busca.' },
        ],
        divergem: [
          {
            oQue: 'o item de ataque mágico do meio da build',
            leituraA: 'Runeblade (150 de ataque mágico, 5% de recarga, 7% de velocidade de movimento; sobe quando você ou um aliado mata monstro)',
            leituraB: "Savant's Wrath",
            porQueNaoEscolhi: 'A primeira busca descreveu o item com números; a segunda só deu o nome. Ter mais detalhe não torna uma leitura mais certa que a outra — pode só significar que uma fonte escreve mais. Nenhum dos dois está no seu catálogo para eu conferir pelo preço.',
          },
          {
            oQue: 'a terceira arcana',
            leituraA: '10 Red Moon',
            leituraB: 'Nightmare',
            porQueNaoEscolhi: 'As duas buscas concordam nas outras duas (Hunter e Mind\'s Eye) e divergem só nesta. Sem uma terceira leitura, é 1 contra 1.',
          },
        ],
        feitico: { nome: 'Smite', confianca: 'media',
          nota: 'Só a segunda busca nomeou o feitiço. A primeira falou de selva sem dizer qual feitiço, o que é compatível mas não é confirmação.' },
        arcana: {
          leitura: 'Hunter · Mind\'s Eye · (a terceira está em disputa — ver divergem)',
          confianca: 'media',
          nota: 'Duas das três confirmadas em duas buscas. A terceira briga.',
        },
      },

      'marco-polo': {
        cruzado: true,
        buscas: 2,
        urls: [
          'https://sportskeeda.com/esports/marco-polo-build-honor-kings-best-equipment-arcanas-battle-spell-skill-combo',
          'https://hokbuild.com/hero/marco-polo/',
          'https://zathong.com/honor-of-kings-marco-polo/',
          'https://www.gamewitted.com/gaming/honor-of-kings-marco-polo-build-items-counters-and-arcanas',
        ],
        alerta: 'Este é o herói com a melhor concordância dos três: quatro itens saíram iguais nas duas buscas. Mas DOIS nomes batem só por aproximação com o seu catálogo — "Daybreaker" × "Daybreaker\'s Virtue" e "Frostscar\'s Grip" × "Frostscar\'s Embrace". Eu NÃO casei os nomes: ficou o que a busca deu, com a diferença anotada.',
        concordam: [
          { nome: 'Boots of Dexterity', papel: 'botas, velocidade de ataque', noCatalogo: true },
          { nome: 'Doomsday', papel: 'dano por vida do alvo', noCatalogo: true },
          { nome: 'Sparkforged Dagger', papel: 'velocidade de ataque e dano mágico no básico', noCatalogo: false,
            nota: 'Não está no seu catálogo: ele cobre de A até H.' },
          { nome: 'Daybreaker', papel: 'ataque, velocidade de ataque, crítico e perfuração', noCatalogo: null,
            nota: 'O seu catálogo tem "Daybreaker\'s Virtue" (2570 de ouro). As buscas escreveram só "Daybreaker". Pode ser o mesmo item com o nome cortado, pode ser outro. Não casei os dois — é por isso que noCatalogo está nulo em vez de true.' },
        ],
        soUmaBusca: [
          { nome: 'Siege Breaker', papel: 'dano físico', noCatalogo: false, busca: 'A' },
          { nome: "Frostscar's Grip", papel: 'dano extra no básico depois de habilidade', noCatalogo: null, busca: 'A',
            nota: 'O seu catálogo tem "Frostscar\'s Embrace" (2060). Mesma ressalva do Daybreaker: nome parecido não é prova de ser o mesmo item.' },
          { nome: 'Thunderclap Brand', papel: 'item inicial', noCatalogo: false, busca: 'A' },
        ],
        divergem: [],
        feitico: { nome: 'Flash ou Purify', confianca: 'baixa',
          nota: 'Só a primeira busca deu feitiço, e deu DOIS sem dizer quando usar cada um. Fica como está: dois nomes, sem critério.' },
        arcana: {
          leitura: '10 Red Moon · 10 Eagle Eye · 10 Reaver',
          confianca: 'baixa',
          nota: 'Só a primeira busca deu arcana. Uma busca só não é cruzamento — por isso a confiança é baixa, mesmo o dado parecendo redondo.',
        },
      },

    },
  };

})(window.U);
