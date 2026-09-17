/* ============================================================
   dados/itens/_catalogo.js — itens, em inglês, com preço
   ------------------------------------------------------------
   ORIGEM: HoK Stats — o OUTRO site das suas capturas, não o
   pvp.mcxssg.net. Está marcado assim de propósito.

   POR QUE ELE IMPORTA MESMO NÃO SENDO A FONTE PRIORITÁRIA:
   o pvp.mcxssg.net publica os itens em CHINÊS (末世, 闪电匕首,
   暗影战斧…). Sem uma tabela de nomes, importar a build de lá
   devolve caracteres que não dizem nada para você. Este catálogo
   é a ponte — e a ponte precisa ser construída com nomes reais,
   não com tradução minha de ícone.

   O QUE ESTE ARQUIVO AINDA NÃO TEM:
   · a correspondência chinês ↔ inglês. Ela NÃO está preenchida
     porque nenhuma captura mostra os dois nomes lado a lado, e
     casar "末世" com "Doomsday" por parecer plausível seria
     exatamente o tipo de invenção que este banco recusa. Cada
     item tem o campo nomeCn vazio, esperando confirmação;
   · passiva e atributos de cada item. As capturas mostram nome,
     ícone e preço. Passiva não aparece em nenhuma delas.

   A LISTA ESTÁ INCOMPLETA: as capturas cobrem de "Amble - Winter"
   até "Hunting Knife", em ordem alfabética. O que vem depois do H
   não foi enviado.
   ============================================================ */
'use strict';
(function (U) {
  U.HE.ITENS = {
    fonte: 'hokstats',
    fonteNome: 'HoK Stats (site das suas capturas, em inglês)',
    prioritaria: false,
    data: '2026-09-17',
    metodo: 'transcrito de captura de tela enviada por você',
    conferido: false,
    completo: false,
    cobertura: 'A até H, em ordem alfabética',
    lacunas: {
      nomeCn: 'A correspondência com o nome chinês do pvp.mcxssg.net não foi preenchida: nenhuma captura mostra os dois nomes juntos, e casar por semelhança seria invenção.',
      passiva: 'As capturas mostram nome, ícone e preço. Passiva e atributos não aparecem.',
      resto: 'Faltam os itens depois da letra H.',
    },
    lista:
[
  {
    "nome": "Amble - Winter",
    "preco": 3190
  },
  {
    "nome": "Ardent Dominion",
    "preco": 2040
  },
  {
    "nome": "Augur's Word",
    "preco": 2150
  },
  {
    "nome": "Axe of Torment",
    "preco": 2090
  },
  {
    "nome": "Belt of Might",
    "preco": 850
  },
  {
    "nome": "Blazing Cape",
    "preco": 2040
  },
  {
    "nome": "Blood Clan's Grimoire",
    "preco": 800
  },
  {
    "nome": "Blood Rage",
    "preco": 2180
  },
  {
    "nome": "Boots of Deftness",
    "preco": 700
  },
  {
    "nome": "Boots of Dexterity",
    "preco": 700
  },
  {
    "nome": "Boots of Fortitude",
    "preco": 700
  },
  {
    "nome": "Boots of Resistance",
    "preco": 700
  },
  {
    "nome": "Boots of the Arcane",
    "preco": 700
  },
  {
    "nome": "Boots of Tranquility",
    "preco": 700
  },
  {
    "nome": "Breakthrough Robe",
    "preco": 2120
  },
  {
    "nome": "Clandestine Cape",
    "preco": 800
  },
  {
    "nome": "Cloth Jerkin",
    "preco": 275
  },
  {
    "nome": "Cloud Piercer",
    "preco": 800
  },
  {
    "nome": "Crimson Shadow",
    "preco": 850
  },
  {
    "nome": "Crimson Shadow - Howl",
    "preco": 2080
  },
  {
    "nome": "Crimson Shadow - Radiance",
    "preco": 2080
  },
  {
    "nome": "Crimson Shadow - Redemption",
    "preco": 2080
  },
  {
    "nome": "Crimson Shadow - Starspring",
    "preco": 2080
  },
  {
    "nome": "Cuirass of Savagery",
    "preco": 2050
  },
  {
    "nome": "Cuirass of Swiftness",
    "preco": 800
  },
  {
    "nome": "Dagger",
    "preco": 300
  },
  {
    "nome": "Dawnlight",
    "preco": 2040
  },
  {
    "nome": "Daybreaker's Virtue",
    "preco": 2570
  },
  {
    "nome": "Deepfrost Siege",
    "preco": 2040
  },
  {
    "nome": "Demonsbane",
    "preco": 2060
  },
  {
    "nome": "Destiny",
    "preco": 2060
  },
  {
    "nome": "Doomsday",
    "preco": 2100
  },
  {
    "nome": "Dragon's Rage",
    "preco": 2040
  },
  {
    "nome": "Enigma - Moon Goddess",
    "preco": 3340
  },
  {
    "nome": "Eternity Blade",
    "preco": 2110
  },
  {
    "nome": "Eye of the Phoenix",
    "preco": 2020
  },
  {
    "nome": "Frigid Charge",
    "preco": 2030
  },
  {
    "nome": "Frosthold Targe",
    "preco": 750
  },
  {
    "nome": "Frostscar's Embrace",
    "preco": 2060
  },
  {
    "nome": "Frozen Breath",
    "preco": 2100
  },
  {
    "nome": "Giant's Grip",
    "preco": 2160
  },
  {
    "nome": "Glacial Buckler",
    "preco": 2040
  },
  {
    "nome": "Golden Blade",
    "preco": 2070
  },
  {
    "nome": "Grand Staff",
    "preco": 820
  },
  {
    "nome": "Guardian",
    "preco": 850
  },
  {
    "nome": "Guardian - Radiance",
    "preco": 2080
  },
  {
    "nome": "Guardian - Redemption",
    "preco": 2080
  },
  {
    "nome": "Guardian - Starspring",
    "preco": 2080
  },
  {
    "nome": "Guerrilla Machete",
    "preco": 700
  },
  {
    "nome": "Haste - Sunpool",
    "preco": 3320
  },
  {
    "nome": "Bloodsoul",
    "preco": null,
    "obs": "preço cortado na captura"
  },
  {
    "nome": "Bloodweeper",
    "preco": null,
    "obs": "preço cortado na captura"
  },
  {
    "nome": "Holy Grail",
    "preco": null,
    "obs": "preço cortado na captura"
  },
  {
    "nome": "Hunting Knife",
    "preco": null,
    "obs": "preço cortado na captura"
  }
]
  };
})(window.U);
