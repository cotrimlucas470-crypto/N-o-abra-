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
   · a lista está incompleta: as capturas cobrem de "Amble - Winter"
     até "Hunting Knife", em ordem alfabética. O que vem depois do H
     não foi enviado.

   PASSIVA/EFEITO (adicionado depois, por busca na web):
   32 dos 54 itens agora têm o campo 'efeito' — texto da passiva
   única, sempre com fonteEfeito:'busca_web', urlEfeito (a página
   usada) e confiancaEfeito ('alta'/'media'/'baixa'). Onde a busca
   não achou nada, ou achou fragmento demais pra confiar, o campo
   'efeito' fica ausente (ou vazio com nota) — nunca inventado. Onde
   o nome da busca não bateu exatamente com o nome da sua captura
   (ex.: "Ardent Dominion" vs. "Ardent Dominator"), o item ficou com
   o nome ORIGINAL da captura e um notaEfeito explicando a diferença.
   Itens sem passiva única conhecida (botas, itens básicos como
   Dagger/Cloth Jerkin) não têm o campo — não é lacuna, é porque não
   existe passiva pra esses.
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
    cobertura: 'A até H, em ordem alfabética. Passiva/efeito buscada na web para 32 dos 54 (os outros 22 não têm passiva única conhecida ou a busca não achou nada confiável).',
    lacunas: {
      nomeCn: 'A correspondência com o nome chinês do pvp.mcxssg.net não foi preenchida: nenhuma captura mostra os dois nomes juntos, e casar por semelhança seria invenção.',
      passiva: 'Passiva pesquisada por busca na web (não é o pvp.mcxssg.net, que também não publica isto) para 32 dos 54 itens — os que apareceram nas capturas com clareza e que a busca encontrou com alguma confiança. Os outros continuam sem passiva: item básico sem passiva única conhecida, ou busca que não achou nada. Nenhuma foi inventada; onde a busca não achou, o campo efeito fica ausente.',
      resto: 'Faltam os itens depois da letra H.',
    },
    lista:
[
  {
    nome: "Amble - Winter",
    preco: 3190
  },
  {
    nome: "Ardent Dominion",
    preco: 2040,
    efeito: "Com a vida abaixo de 30%, remove todo controle de grupo em você e ganha um escudo que absorve (500 +150% de algo não especificado na busca) de dano, mais 30% de velocidade de movimento, por 4 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/ardent-domination-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca achou este efeito sob o nome \"Ardent Dominator\", não \"Ardent Dominion\" — pode ser variação de tradução do mesmo item ou item diferente. Guardado aqui porque o preço (2040) e a categoria batem com o que a sua captura mostrou."
  },
  {
    nome: "Augur's Word",
    preco: 2150,
    efeito: "Subir de nível recupera 20% de vida e mana em 3 s. Dá defesa física e mágica proporcional a 40% do ataque mágico, até 230.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/augurs-word-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Axe of Torment",
    preco: 2090,
    efeito: "Habilidade que acerta lentifica em 10% por 3 s o primeiro herói inimigo atingido; recarga de 8 s. Dá 58 a 170 de perfuração física.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Axe_of_Torment",
    confiancaEfeito: "alta"
  },
  {
    nome: "Belt of Might",
    preco: 850
  },
  {
    nome: "Blazing Cape",
    preco: 2040,
    efeito: "Inflige queimadura em inimigos num raio de 300, causando 28–56 (+3% da vida deles) de dano mágico por segundo. Ataque básico, habilidade ou a própria queimadura reduzem a recuperação de vida e o roubo de vida do alvo em 35%, por 3 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/blazing-cape-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Blood Clan's Grimoire",
    preco: 800
  },
  {
    nome: "Blood Rage",
    preco: 2180,
    efeito: "Passiva \"Apoplexy\": ataque básico causa dano físico extra igual a 1,5% da vida máxima do alvo; esse extra sobe para 25%–50% quando a sua vida está abaixo de 50%.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Blood_Rage",
    confiancaEfeito: "alta"
  },
  {
    nome: "Boots of Deftness",
    preco: 700
  },
  {
    nome: "Boots of Dexterity",
    preco: 700
  },
  {
    nome: "Boots of Fortitude",
    preco: 700
  },
  {
    nome: "Boots of Resistance",
    preco: 700
  },
  {
    nome: "Boots of the Arcane",
    preco: 700
  },
  {
    nome: "Boots of Tranquility",
    preco: 700
  },
  {
    nome: "Breakthrough Robe",
    preco: 2120,
    efeito: "Converte vida em perfuração mágica: dá 4% da vida em ataque mágico extra (até 100), e 7% da vida em perfuração mágica extra (até 175).",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Breakthrough_Robe",
    confiancaEfeito: "alta"
  },
  {
    nome: "Clandestine Cape",
    preco: 800
  },
  {
    nome: "Cloth Jerkin",
    preco: 275
  },
  {
    nome: "Cloud Piercer",
    preco: 800
  },
  {
    nome: "Crimson Shadow",
    preco: 850,
    efeito: "Item de suporte/roaming avançado: aliados dentro de 800 de alcance ganham 8% de velocidade de ataque, 8% de redução de recarga e 10 de mana a cada 5 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/crimson-shadow-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Crimson Shadow - Howl",
    preco: 2080,
    efeito: "Herda o efeito-base do Crimson Shadow (velocidade de ataque, redução de recarga e mana para o time perto). O que esta forma avançada acrescenta além disso não foi encontrado.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/crimson-shadow-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Crimson Shadow - Radiance",
    preco: 2080,
    efeito: "Herda o efeito-base do Crimson Shadow. O acréscimo desta forma avançada não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/crimson-shadow-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Crimson Shadow - Redemption",
    preco: 2080,
    efeito: "Herda o efeito-base do Crimson Shadow. O acréscimo desta forma avançada não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/crimson-shadow-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Crimson Shadow - Starspring",
    preco: 2080,
    efeito: "Herda o efeito-base do Crimson Shadow. O acréscimo desta forma avançada não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/crimson-shadow-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Cuirass of Savagery",
    preco: 2050,
    efeito: "Ao levar dano, ganha 2% de dano causado e 1% de velocidade de movimento por 3 s, até 5 cargas.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/cuirass-of-savagery-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Cuirass of Swiftness",
    preco: 800
  },
  {
    nome: "Dagger",
    preco: 300
  },
  {
    nome: "Dawnlight",
    preco: 2040,
    efeito: "Causar dano com ataque básico ou habilidade em herói inimigo dá um escudo que anula 120–260 (+2% da sua vida) de dano, para você e o aliado com menos vida por perto, por 3 s. Recarga de 10 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/dawnlight-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Daybreaker's Virtue",
    preco: 2570,
    efeito: "Não encontrado na fonte.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/daybreaker-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Uma busca devolveu só \"+25 de dano de ataque básico\" a partir de uma nota de patch — fragmento demais para guardar como a passiva inteira. O texto ficou vazio de propósito."
  },
  {
    nome: "Deepfrost Siege",
    preco: 2040,
    efeito: "Ataque básico reduz a velocidade de movimento do alvo em 3% por 2 s, até 5 cargas. No máximo de cargas, o próximo orbe de ataque básico causa 30% de dano extra.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/deepfrost-siege-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Demonsbane",
    preco: 2060,
    efeito: "Passiva \"Anti-Mago\": ganha ataque físico igual a 50% da sua defesa mágica, até 250.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Demonsbane",
    confiancaEfeito: "alta"
  },
  {
    nome: "Destiny",
    preco: 2060
  },
  {
    nome: "Doomsday",
    preco: 2100,
    efeito: "Ataque básico causa dano físico extra igual a 8% da vida ATUAL do alvo (até 80 de dano em monstro).",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/doomsday-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Dragon's Rage",
    preco: 2040
  },
  {
    nome: "Enigma - Moon Goddess",
    preco: 3340
  },
  {
    nome: "Eternity Blade",
    preco: 2110,
    efeito: "Ganha 20% de dano crítico de saída; cada 2% de chance crítica extra que você tiver dá mais 1% de dano crítico, até 50%.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Eternity_Blade",
    confiancaEfeito: "alta"
  },
  {
    nome: "Eye of the Phoenix",
    preco: 2020,
    efeito: "Dá +1200 de vida máxima. Passiva \"Bloodline\": para cada 10% de vida máxima que falta, a cura recebida de habilidade sobe 6%.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honorofkingsapk.com/equipment/eye-of-the-phoenix/",
    confiancaEfeito: "alta"
  },
  {
    nome: "Frigid Charge",
    preco: 2030
  },
  {
    nome: "Frosthold Targe",
    preco: 750
  },
  {
    nome: "Frostscar's Embrace",
    preco: 2060,
    efeito: "O próximo ataque básico em até 5 s depois de usar uma habilidade causa 140–420 de dano físico extra a quem estiver perto, e reduz a velocidade de movimento do alvo em 30% (20% se ele for de longo alcance) por 0,5 s. Recarga de 1,2 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/frostscars-embrace-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Frozen Breath",
    preco: 2100,
    efeito: "Habilidade que acerta reduz a velocidade de movimento do alvo em 20% por 2 s; enquanto isso, habilidades causam 120–400 de dano mágico extra nesse alvo.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/frozen-breath-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Giant's Grip",
    preco: 2160,
    efeito: "Ataque básico ou habilidade que acerta monstro de selva causa 75 (+5% do ataque físico) de dano verdadeiro extra a cada 0,5 s durante 2 s. Em herói, esse extra vale só 20%.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/jungling-items/giants-grip-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Glacial Buckler",
    preco: 2040,
    efeito: "Item defensivo avançado: reflete parte do dano recebido e lentifica quem te acerta de perto.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/glacial-buckler-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca só deu o resumo do mecanismo, sem os números de reflexo/lentidão."
  },
  {
    nome: "Golden Blade",
    preco: 2070,
    efeito: "Ataque básico que acerta dá 10% de velocidade de ataque por 5 s, até 2 cargas; no máximo de cargas, o ataque básico causa 30% do ataque mágico em dano mágico extra.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Golden_Blade",
    confiancaEfeito: "alta"
  },
  {
    nome: "Grand Staff",
    preco: 820
  },
  {
    nome: "Guardian",
    preco: 850,
    efeito: "Dá +500 de vida máxima e +6% de velocidade de movimento. Aliados dentro de 800 de alcance ganham 32–60 de defesa física e mágica, e +200–400 de vida máxima e +20–40 no atributo de ataque principal. Também dá 5 de ouro e experiência a cada 3 s, com um bônus separado de 25%–50% de ouro/XP que atinge o teto aos 20:00 de partida.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/guardian-hok",
    confiancaEfeito: "alta",
    notaEfeito: "Efeito-base do item de suporte/roaming. As variantes Radiance/Redemption/Starspring são formas avançadas dele — a busca não achou o que cada uma acrescenta além disso."
  },
  {
    nome: "Guardian - Radiance",
    preco: 2080,
    efeito: "Herda o efeito-base do Guardian (vida, velocidade, defesa e ouro/XP para o time perto). O que esta forma avançada acrescenta especificamente não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/guardian-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Guardian - Redemption",
    preco: 2080,
    efeito: "Herda o efeito-base do Guardian (vida, velocidade, defesa e ouro/XP para o time perto). O que esta forma avançada acrescenta especificamente não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Guardian_-_Redemption",
    confiancaEfeito: "media"
  },
  {
    nome: "Guardian - Starspring",
    preco: 2080,
    efeito: "Herda o efeito-base do Guardian (vida, velocidade, defesa e ouro/XP para o time perto). O que esta forma avançada acrescenta especificamente não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/guardian-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Guerrilla Machete",
    preco: 700,
    efeito: "Ataque básico ou habilidade que acerta monstro de selva causa 70 (+25% do ataque mágico) de dano extra a cada 0,5 s durante 2 s (herói recebe só 10% disso). Matar monstro — você ou aliado a 700 de distância — dá 6 de ataque mágico, até 15 cargas.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Guerrilla_Machete",
    confiancaEfeito: "alta"
  },
  {
    nome: "Haste - Sunpool",
    preco: 3320,
    efeito: "Aumenta o alcance do ataque básico em 150% e a velocidade de movimento em 40%; dá 30% de dano extra num inimigo perto do alvo, por 5 s. O alcance e o dano bônus só valem para herói de ataque à distância.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/sunpool-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca achou este item como \"Sunpool\", sem o prefixo \"Haste -\" que está na sua captura. Pode ser o mesmo item com nome parcial na tela, ou uma variante. Guardado pelo preço (3320) batendo com item avançado de marksman."
  },
  {
    nome: "Bloodsoul",
    preco: null,
    obs: "preço cortado na captura"
  },
  {
    nome: "Bloodweeper",
    preco: null,
    obs: "preço cortado na captura",
    efeito: "Quando a sua vida cai abaixo de 30%, recupera 400–610 de vida em 5 s. Recarga de 20 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/bloodweeper-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Holy Grail",
    preco: null,
    obs: "preço cortado na captura",
    efeito: "Recupera 1,5% da mana máxima por segundo. Com a mana cheia, recupera 1% da vida máxima por segundo no lugar.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/holy-grail-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Hunting Knife",
    preco: null,
    obs: "preço cortado na captura"
  }
]
  };
})(window.U);
