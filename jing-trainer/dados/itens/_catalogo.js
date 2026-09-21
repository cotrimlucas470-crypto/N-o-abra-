/* ============================================================
   dados/itens/_catalogo.js — itens, em inglês, com preço
   ------------------------------------------------------------
   DUAS ORIGENS, E CADA ITEM DIZ A SUA (campo fonteItem):

   · "captura"   — os 54 primeiros, transcritos das suas capturas
                   do HoK Stats. Têm PREÇO, porque a tela mostrava.
                   Cobrem de "Amble - Winter" até "Hunting Knife".
   · "busca_web" — os 43 seguintes, achados por busca depois que
                   você pediu "todos os equipamentos". Quase nenhum
                   tem preço, porque a busca raramente devolve isso.
                   Têm categoriaItem (físico/mágico/defesa/movimento/
                   selva/roaming/componente), que a busca devolve bem.

   · terceiro lote: 22 itens que ENTRARAM PORQUE AS BUILDS CITAVAM.
                   Depois de montar os itens dos 117 heróis, sobraram
                   23 nomes citados que não existiam aqui. Entraram
                   com citadoEmBuild:true. Quase nenhum trouxe
                   passiva: a busca confirmou que o item EXISTE sem
                   dizer o que ele FAZ, e o campo ficou vazio em vez
                   de receber um texto plausível.

   São 119 itens. Uma das buscas disse que o jogo tem 107; aqui há
   mais, porque alguns nomes podem ser o MESMO item escrito de dois
   jeitos — Daybreaker × Daybreaker's Virtue, Frostscar's Grip ×
   Frostscar's Embrace, Cloud Piercing Bow × Cloud Piercer. Eles NÃO
   foram fundidos: fundir por semelhança é o chute que este arquivo
   recusa. Cada um carrega a dúvida escrita na nota.

   O QUE ISSO DESTRAVOU: 100% dos itens citados nas builds dos 117
   heróis existem aqui. A ficha do herói mostra preço, categoria e
   passiva de cada item da build, em vez de só o nome solto.

   TRÊS PREÇOS QUE BRIGAM (não foram "harmonizados"):
   · Guardian — a sua captura diz 850, a busca diz 900;
   · Crimson Shadow — a sua captura diz 850, a busca diz 900;
   · Hunting Knife — a sua captura cortou o preço, a busca diz 250.
   Em todos, o preço da CAPTURA ficou, porque é o que você viu na
   sua versão do jogo. A leitura da busca está registrada na nota.
   Pode ser diferença de patch, pode ser erro de uma das duas.

   ORIGEM DE FUNDO: HoK Stats — o OUTRO site das suas capturas, não
   o pvp.mcxssg.net. Está marcado assim de propósito.

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
     exatamente o tipo de invenção que este banco recusa;
   · preço dos 43 itens achados por busca;
   · os ~10 itens que faltam para fechar os 107.

   PASSIVA/EFEITO: 54 dos 97 itens têm o campo 'efeito' — texto da
   passiva única, sempre com fonteEfeito, urlEfeito (a página usada)
   e confiancaEfeito ('alta'/'media'/'baixa'). Onde a busca não achou
   nada, ou achou fragmento demais pra confiar, o campo fica AUSENTE
   — nunca inventado. Onde a busca devolveu só a categoria do item
   ("item mágico avançado que dá muito ataque mágico") ou a receita
   dele, isso NÃO virou passiva: categoria não é efeito, receita não
   é efeito, e os dois foram para a nota.

   NOMES QUE NÃO BATEM não são "corrigidos" por semelhança. Ficam os
   dois, com a diferença escrita: Ardent Dominion × Ardent Dominator,
   Haste - Sunpool × Sunpool, Starspring × Crimson Shadow - Starspring
   × Guardian - Starspring.

   Itens de base (Dagger, Cloth Jerkin, botas, os 11 componentes) não
   têm passiva — não é lacuna, é que não existe passiva para eles.
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
    cobertura: '119 itens: 54 das suas capturas (com preço), 43 achados por busca e 22 que entraram porque as builds dos heróis citavam. Passiva encontrada para 58. Todos os itens citados nas 117 builds existem aqui.',
    totalNoJogo: 107,
    totalAqui: 119,
    cobreAsBuilds: true,
    lacunas: {
      nomeCn: 'A correspondência com o nome chinês do pvp.mcxssg.net não foi preenchida: nenhuma captura mostra os dois nomes juntos, e casar por semelhança seria invenção.',
      passiva: 'Passiva encontrada para 58 dos 119 itens. Os outros 61 se dividem em dois casos que NÃO são a mesma coisa: item de base e componente (botas, Dagger, Spell Tome…), que não têm passiva única — isso não é lacuna; e item avançado cuja passiva a busca não devolveu (Spikemail, Succubus Cloak, Wings of Redemption, Extreme Shadow, Guardian\'s Glory, Longnight Guardian, Lightfoot Shoes, Runic Blade, Meteor, Sage\'s Tome, Stone of Sorcery e a maior parte do lote citado em builds) — isso é lacuna de verdade, e está marcada com confiança baixa.',
      preco: 'A maioria dos itens achados por busca está sem preço: a busca devolve efeito muito mais do que devolve custo. Onde ela devolveu (Runeblade 2160, Rapacious Bite 2160, Relentless Blade 700, Stormchaser 900, Sage\'s Tome 2610, Stone of Sorcery 800, Nettle Gauntlet 750), o preço entrou.',
      resto: 'Uma busca diz que o jogo tem 107 itens; aqui há 119. A diferença não é sobra: alguns nomes podem ser o mesmo item escrito de dois jeitos (Daybreaker e Daybreaker\'s Virtue, Frostscar\'s Grip e Frostscar\'s Embrace, Cloud Piercing Bow e Cloud Piercer), e não foram fundidos por semelhança. Existe ainda "Overlord\'s Might", citado em 7 builds, que a busca dedicada não achou como item — pode ser item real não indexado, ou erro dos resumos que o citaram.',
      precosQueBrigam: 'Guardian e Crimson Shadow: a sua captura diz 850, a busca diz 900. Hunting Knife: a captura cortou, a busca diz 250. Ficou o preço da captura, porque é o que você viu. A outra leitura está na nota do item.',
    },
    lista:
[
  {
    nome: "Amble - Winter",
    nomePt: "Passo Leve - Inverno",
    fontePt: "eu?",
    notaPt: "\"Amble\" é andar sem pressa. O item tem prefixo com traço, como as variantes de roaming.",
    preco: 3190,
    fonteItem: "captura"
  },
  {
    nome: "Ardent Dominion",
    nomePt: "Domínio Ardente",
    fontePt: "eu?",
    notaPt: "O nome já estava em dúvida: a busca achou o efeito sob \"Ardent Dominator\".",
    preco: 2040,
    fonteItem: "captura",
    efeito: "Com a vida abaixo de 30%, remove todo controle de grupo em você e ganha um escudo que absorve (500 +150% de algo não especificado na busca) de dano, mais 30% de velocidade de movimento, por 4 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/ardent-domination-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca achou este efeito sob o nome \"Ardent Dominator\", não \"Ardent Dominion\" — pode ser variação de tradução do mesmo item ou item diferente. Guardado aqui porque o preço (2040) e a categoria batem com o que a sua captura mostrou."
  },
  {
    nome: "Augur's Word",
    nomePt: "Palavra do Áugure",
    fontePt: "eu",
    preco: 2150,
    fonteItem: "captura",
    efeito: "Subir de nível recupera 20% de vida e mana em 3 s. Dá defesa física e mágica proporcional a 40% do ataque mágico, até 230.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/augurs-word-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Axe of Torment",
    nomePt: "Machado do Tormento",
    fontePt: "eu",
    preco: 2090,
    fonteItem: "captura",
    efeito: "Habilidade que acerta lentifica em 10% por 3 s o primeiro herói inimigo atingido; recarga de 8 s. Dá 58 a 170 de perfuração física.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Axe_of_Torment",
    confiancaEfeito: "alta"
  },
  {
    nome: "Belt of Might",
    nomePt: "Cinto do Poder",
    fontePt: "eu",
    preco: 850,
    fonteItem: "captura"
  },
  {
    nome: "Blazing Cape",
    nomePt: "Manto Flamejante",
    fontePt: "eu",
    preco: 2040,
    fonteItem: "captura",
    efeito: "Inflige queimadura em inimigos num raio de 300, causando 28–56 (+3% da vida deles) de dano mágico por segundo. Ataque básico, habilidade ou a própria queimadura reduzem a recuperação de vida e o roubo de vida do alvo em 35%, por 3 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/blazing-cape-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Blood Clan's Grimoire",
    nomePt: "Grimório do Clã de Sangue",
    fontePt: "eu",
    preco: 800,
    fonteItem: "captura"
  },
  {
    nome: "Blood Rage",
    nomePt: "Fúria Sanguínea",
    fontePt: "eu",
    preco: 2180,
    fonteItem: "captura",
    efeito: "Passiva \"Apoplexy\": ataque básico causa dano físico extra igual a 1,5% da vida máxima do alvo; esse extra sobe para 25%–50% quando a sua vida está abaixo de 50%.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Blood_Rage",
    confiancaEfeito: "alta"
  },
  {
    nome: "Boots of Deftness",
    nomePt: "Botas da Agilidade",
    fontePt: "eu",
    preco: 700,
    fonteItem: "captura"
  },
  {
    nome: "Boots of Dexterity",
    nomePt: "Botas da Destreza",
    fontePt: "br",
    notaPt: "Nome visto em guia brasileiro.",
    preco: 700,
    fonteItem: "captura"
  },
  {
    nome: "Boots of Fortitude",
    nomePt: "Botas da Fortitude",
    fontePt: "br",
    notaPt: "Nome visto em guia brasileiro — que mantém \"Fortitude\" sem traduzir.",
    preco: 700,
    fonteItem: "captura"
  },
  {
    nome: "Boots of Resistance",
    nomePt: "Botas da Resistência",
    fontePt: "br",
    notaPt: "Aparece nas notas de atualização em português da App Store.",
    preco: 700,
    fonteItem: "captura"
  },
  {
    nome: "Boots of the Arcane",
    nomePt: "Botas do Arcano",
    fontePt: "eu",
    preco: 700,
    fonteItem: "captura"
  },
  {
    nome: "Boots of Tranquility",
    nomePt: "Botas da Tranquilidade",
    fontePt: "eu",
    preco: 700,
    fonteItem: "captura"
  },
  {
    nome: "Breakthrough Robe",
    nomePt: "Manto da Ruptura",
    fontePt: "eu",
    preco: 2120,
    fonteItem: "captura",
    efeito: "Converte vida em perfuração mágica: dá 4% da vida em ataque mágico extra (até 100), e 7% da vida em perfuração mágica extra (até 175).",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Breakthrough_Robe",
    confiancaEfeito: "alta"
  },
  {
    nome: "Clandestine Cape",
    nomePt: "Capa Clandestina",
    fontePt: "eu",
    preco: 800,
    fonteItem: "captura"
  },
  {
    nome: "Cloth Jerkin",
    nomePt: "Gibão de Pano",
    fontePt: "eu",
    preco: 275,
    fonteItem: "captura"
  },
  {
    nome: "Cloud Piercer",
    nomePt: "Perfura-Nuvens",
    fontePt: "eu",
    preco: 800,
    fonteItem: "captura"
  },
  {
    nome: "Crimson Shadow",
    nomePt: "Sombra Carmesim",
    fontePt: "eu",
    preco: 850,
    fonteItem: "captura",
    efeito: "Item de suporte/roaming avançado: aliados dentro de 800 de alcance ganham 8% de velocidade de ataque, 8% de redução de recarga e 10 de mana a cada 5 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/crimson-shadow-hok",
    confiancaEfeito: "alta",
    notaEfeito: "PREÇO EM DISPUTA: a sua captura diz 850, a busca diz 900. Ficou o da captura."
  },
  {
    nome: "Crimson Shadow - Howl",
    nomePt: "Sombra Carmesim - Uivo",
    fontePt: "eu",
    preco: 2080,
    fonteItem: "captura",
    efeito: "Herda o efeito-base do Crimson Shadow (velocidade de ataque, redução de recarga e mana para o time perto). O que esta forma avançada acrescenta além disso não foi encontrado.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/crimson-shadow-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Crimson Shadow - Radiance",
    nomePt: "Sombra Carmesim - Fulgor",
    fontePt: "eu",
    preco: 2080,
    fonteItem: "captura",
    efeito: "Herda o efeito-base do Crimson Shadow. O acréscimo desta forma avançada não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/crimson-shadow-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Crimson Shadow - Redemption",
    nomePt: "Sombra Carmesim - Redenção",
    fontePt: "eu",
    preco: 2080,
    fonteItem: "captura",
    efeito: "Herda o efeito-base do Crimson Shadow. O acréscimo desta forma avançada não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/crimson-shadow-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Crimson Shadow - Starspring",
    nomePt: "Sombra Carmesim - Fonte Estelar",
    fontePt: "eu",
    preco: 2080,
    fonteItem: "captura",
    efeito: "Herda o efeito-base do Crimson Shadow. O acréscimo desta forma avançada não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/crimson-shadow-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Cuirass of Savagery",
    nomePt: "Couraça da Selvageria",
    fontePt: "eu",
    preco: 2050,
    fonteItem: "captura",
    efeito: "Ao levar dano, ganha 2% de dano causado e 1% de velocidade de movimento por 3 s, até 5 cargas.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/cuirass-of-savagery-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Cuirass of Swiftness",
    nomePt: "Couraça da Rapidez",
    fontePt: "eu",
    preco: 800,
    fonteItem: "captura"
  },
  {
    nome: "Dagger",
    nomePt: "Adaga",
    fontePt: "eu",
    preco: 300,
    fonteItem: "captura"
  },
  {
    nome: "Dawnlight",
    nomePt: "Alvorada",
    fontePt: "br",
    notaPt: "ATENÇÃO: \"Alvorada\" aparece nas notas em português, mas o inglês tem DOIS itens que podem virar isso — Dawnlight e Daybreaker. Coloquei no Dawnlight por ser tradução mais direta, e o aviso fica aqui porque pode estar no item errado.",
    preco: 2040,
    fonteItem: "captura",
    efeito: "Causar dano com ataque básico ou habilidade em herói inimigo dá um escudo que anula 120–260 (+2% da sua vida) de dano, para você e o aliado com menos vida por perto, por 3 s. Recarga de 10 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/dawnlight-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Daybreaker's Virtue",
    nomePt: "Virtude do Alvorecer",
    fontePt: "eu?",
    notaPt: "Cuidado: \"Alvorada\" (nome oficial visto em português) pode ser ESTE item e não o Dawnlight.",
    preco: 2570,
    fonteItem: "captura",
    efeito: "Não encontrado na fonte.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/daybreaker-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Uma busca devolveu só \"+25 de dano de ataque básico\" a partir de uma nota de patch — fragmento demais para guardar como a passiva inteira. O texto ficou vazio de propósito."
  },
  {
    nome: "Deepfrost Siege",
    nomePt: "Cerco do Gelo Profundo",
    fontePt: "eu",
    preco: 2040,
    fonteItem: "captura",
    efeito: "Ataque básico reduz a velocidade de movimento do alvo em 3% por 2 s, até 5 cargas. No máximo de cargas, o próximo orbe de ataque básico causa 30% de dano extra.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/deepfrost-siege-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Demonsbane",
    nomePt: "Flagelo dos Demônios",
    fontePt: "eu",
    preco: 2060,
    fonteItem: "captura",
    efeito: "Passiva \"Anti-Mago\": ganha ataque físico igual a 50% da sua defesa mágica, até 250.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Demonsbane",
    confiancaEfeito: "alta"
  },
  {
    nome: "Destiny",
    nomePt: "Destino",
    fontePt: "eu",
    preco: 2060,
    fonteItem: "captura"
  },
  {
    nome: "Doomsday",
    nomePt: "Fim do Mundo",
    fontePt: "eu?",
    notaPt: "O nome chinês na fonte prioritária é 末世, que é literalmente \"fim do mundo\" — isso reforça a tradução, mas o chinês e o inglês nunca foram casados oficialmente aqui.",
    preco: 2100,
    fonteItem: "captura",
    efeito: "Ataque básico causa dano físico extra igual a 8% da vida ATUAL do alvo (até 80 de dano em monstro).",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/doomsday-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Dragon's Rage",
    nomePt: "Fúria do Dragão",
    fontePt: "eu",
    preco: 2040,
    fonteItem: "captura"
  },
  {
    nome: "Enigma - Moon Goddess",
    nomePt: "Enigma - Deusa da Lua",
    fontePt: "eu",
    preco: 3340,
    fonteItem: "captura"
  },
  {
    nome: "Eternity Blade",
    nomePt: "Lâmina Eterna",
    fontePt: "br",
    notaPt: "Nome visto em guia brasileiro.",
    preco: 2110,
    fonteItem: "captura",
    efeito: "Ganha 20% de dano crítico de saída; cada 2% de chance crítica extra que você tiver dá mais 1% de dano crítico, até 50%.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Eternity_Blade",
    confiancaEfeito: "alta"
  },
  {
    nome: "Eye of the Phoenix",
    nomePt: "Olho da Fênix",
    fontePt: "eu",
    preco: 2020,
    fonteItem: "captura",
    efeito: "Dá +1200 de vida máxima. Passiva \"Bloodline\": para cada 10% de vida máxima que falta, a cura recebida de habilidade sobe 6%.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honorofkingsapk.com/equipment/eye-of-the-phoenix/",
    confiancaEfeito: "alta"
  },
  {
    nome: "Frigid Charge",
    nomePt: "Carga Gélida",
    fontePt: "eu",
    preco: 2030,
    fonteItem: "captura"
  },
  {
    nome: "Frosthold Targe",
    nomePt: "Broquel do Forte Gelado",
    fontePt: "eu",
    preco: 750,
    fonteItem: "captura"
  },
  {
    nome: "Frostscar's Embrace",
    nomePt: "Abraço da Cicatriz Gélida",
    fontePt: "eu",
    preco: 2060,
    fonteItem: "captura",
    efeito: "O próximo ataque básico em até 5 s depois de usar uma habilidade causa 140–420 de dano físico extra a quem estiver perto, e reduz a velocidade de movimento do alvo em 30% (20% se ele for de longo alcance) por 0,5 s. Recarga de 1,2 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/frostscars-embrace-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Frozen Breath",
    nomePt: "Sopro Congelante",
    fontePt: "eu",
    preco: 2100,
    fonteItem: "captura",
    efeito: "Habilidade que acerta reduz a velocidade de movimento do alvo em 20% por 2 s; enquanto isso, habilidades causam 120–400 de dano mágico extra nesse alvo.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/frozen-breath-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Giant's Grip",
    nomePt: "Garra do Gigante",
    fontePt: "eu?",
    notaPt: "Um guia brasileiro cita \"Armadura do Gigante\" entre os itens de caça — pode ser este item com outro nome em inglês, ou outro item. Não casei.",
    preco: 2160,
    fonteItem: "captura",
    efeito: "Ataque básico ou habilidade que acerta monstro de selva causa 75 (+5% do ataque físico) de dano verdadeiro extra a cada 0,5 s durante 2 s. Em herói, esse extra vale só 20%.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/jungling-items/giants-grip-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Glacial Buckler",
    nomePt: "Broquel Glacial",
    fontePt: "eu",
    preco: 2040,
    fonteItem: "captura",
    efeito: "Item defensivo avançado: reflete parte do dano recebido e lentifica quem te acerta de perto.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/glacial-buckler-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca só deu o resumo do mecanismo, sem os números de reflexo/lentidão."
  },
  {
    nome: "Golden Blade",
    nomePt: "Lâmina Dourada",
    fontePt: "eu",
    preco: 2070,
    fonteItem: "captura",
    efeito: "Ataque básico que acerta dá 10% de velocidade de ataque por 5 s, até 2 cargas; no máximo de cargas, o ataque básico causa 30% do ataque mágico em dano mágico extra.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Golden_Blade",
    confiancaEfeito: "alta"
  },
  {
    nome: "Grand Staff",
    nomePt: "Grande Cajado",
    fontePt: "eu",
    preco: 820,
    fonteItem: "captura"
  },
  {
    nome: "Guardian",
    nomePt: "Guardião",
    fontePt: "eu",
    preco: 850,
    fonteItem: "captura",
    efeito: "Dá +500 de vida máxima e +6% de velocidade de movimento. Aliados dentro de 800 de alcance ganham 32–60 de defesa física e mágica, e +200–400 de vida máxima e +20–40 no atributo de ataque principal. Também dá 5 de ouro e experiência a cada 3 s, com um bônus separado de 25%–50% de ouro/XP que atinge o teto aos 20:00 de partida.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/guardian-hok",
    confiancaEfeito: "alta",
    notaEfeito: "Efeito-base do item de suporte/roaming. As variantes Radiance/Redemption/Starspring são formas avançadas dele — a busca não achou o que cada uma acrescenta além disso. PREÇO EM DISPUTA: a sua captura diz 850, a busca diz 900. Ficou o da captura."
  },
  {
    nome: "Guardian - Radiance",
    nomePt: "Guardião - Fulgor",
    fontePt: "eu",
    preco: 2080,
    fonteItem: "captura",
    efeito: "Herda o efeito-base do Guardian (vida, velocidade, defesa e ouro/XP para o time perto). O que esta forma avançada acrescenta especificamente não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/guardian-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Guardian - Redemption",
    nomePt: "Guardião - Redenção",
    fontePt: "eu",
    preco: 2080,
    fonteItem: "captura",
    efeito: "Herda o efeito-base do Guardian (vida, velocidade, defesa e ouro/XP para o time perto). O que esta forma avançada acrescenta especificamente não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Guardian_-_Redemption",
    confiancaEfeito: "media"
  },
  {
    nome: "Guardian - Starspring",
    nomePt: "Guardião - Fonte Estelar",
    fontePt: "eu",
    preco: 2080,
    fonteItem: "captura",
    efeito: "Herda o efeito-base do Guardian (vida, velocidade, defesa e ouro/XP para o time perto). O que esta forma avançada acrescenta especificamente não foi encontrado na busca.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/guardian-hok",
    confiancaEfeito: "media"
  },
  {
    nome: "Guerrilla Machete",
    nomePt: "Facão de Guerrilha",
    fontePt: "eu",
    preco: 700,
    fonteItem: "captura",
    efeito: "Ataque básico ou habilidade que acerta monstro de selva causa 70 (+25% do ataque mágico) de dano extra a cada 0,5 s durante 2 s (herói recebe só 10% disso). Matar monstro — você ou aliado a 700 de distância — dá 6 de ataque mágico, até 15 cargas.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Guerrilla_Machete",
    confiancaEfeito: "alta"
  },
  {
    nome: "Haste - Sunpool",
    nomePt: "Pressa - Lago Solar",
    fontePt: "eu?",
    notaPt: "O nome já estava em dúvida: a busca achou este item como \"Sunpool\", sem o prefixo.",
    preco: 3320,
    fonteItem: "captura",
    efeito: "Aumenta o alcance do ataque básico em 150% e a velocidade de movimento em 40%; dá 30% de dano extra num inimigo perto do alvo, por 5 s. O alcance e o dano bônus só valem para herói de ataque à distância.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/sunpool-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca achou este item como \"Sunpool\", sem o prefixo \"Haste -\" que está na sua captura. Pode ser o mesmo item com nome parcial na tela, ou uma variante. Guardado pelo preço (3320) batendo com item avançado de marksman."
  },
  {
    nome: "Bloodsoul",
    nomePt: "Alma de Sangue",
    fontePt: "eu",
    preco: null,
    obs: "preço cortado na captura",
    fonteItem: "captura"
  },
  {
    nome: "Bloodweeper",
    nomePt: "Chora-Sangue",
    fontePt: "eu?",
    notaPt: "\"weeper\" é quem chora. Tradução desconfortável, mas o literal.",
    preco: null,
    obs: "preço cortado na captura",
    fonteItem: "captura",
    efeito: "Quando a sua vida cai abaixo de 30%, recupera 400–610 de vida em 5 s. Recarga de 20 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/bloodweeper-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Holy Grail",
    nomePt: "Santo Graal",
    fontePt: "eu",
    preco: null,
    obs: "preço cortado na captura",
    fonteItem: "captura",
    efeito: "Recupera 1,5% da mana máxima por segundo. Com a mana cheia, recupera 1% da vida máxima por segundo no lugar.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/holy-grail-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Hunting Knife",
    nomePt: "Faca de Caça",
    fontePt: "eu",
    preco: null,
    obs: "preço cortado na captura",
    fonteItem: "captura",
    efeito: "Item inicial de selva. As formas avançadas dele são Relentless Blade, Runeblade, Rapacious Bite e Giant's Grip.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/jungling-items/novice-jungling-items-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca dá o preço dele como 250 — mas a sua captura cortou esse número, então o campo preco continua null em vez de receber um valor de outra fonte sem aviso."
  },
  {
    nome: "Master Sword",
    nomePt: "Espada Mestra",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "fisico",
    efeito: "Usar uma habilidade dá 12% de velocidade de movimento por 2 s e faz o próximo ataque básico, dentro de 5 s, causar 80% de dano físico a mais. Recarga de 3 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Master_Sword",
    confiancaEfeito: "alta"
  },
  {
    nome: "Siege Breaker",
    nomePt: "Quebra-Cerco",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "fisico",
    efeito: "Dá 150 de ataque físico e 5% de redução de recarga. Passiva: 30% de dano a mais em inimigo com menos de 50% de vida.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Siege_Breaker",
    confiancaEfeito: "alta"
  },
  {
    nome: "Storm Sword",
    nomePt: "Espada da Tempestade",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "fisico",
    efeito: "Dá 100 de ataque físico, 10% de redução de recarga e 500 de vida máxima.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://gaminggblog.com/honor-of-kings-equipment/",
    confiancaEfeito: "media",
    notaEfeito: "A busca deu só os atributos. Se este item tem passiva única, ela não apareceu — o campo não foi preenchido com invenção."
  },
  {
    nome: "Shadow Ripper",
    nomePt: "Rasga-Sombras",
    fontePt: "eu?",
    notaPt: "Um guia brasileiro cita \"Foice das Sombras\" — pode ser este item ou o Vampiric Scythe. Não casei.",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "fisico",
    efeito: "Dá 40 de dano de ataque básico. Depois de um crítico, ganha 20% de velocidade de ataque e 5% de velocidade de movimento por 3 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/shadow-ripper-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Sunchaser",
    nomePt: "Caça-Sol",
    fontePt: "eu?",
    notaPt: "Um guia brasileiro cita \"Arco Solar\" — pode ser este item ou outro. Não casei.",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "fisico",
    efeito: "Dá 50 de dano de ataque básico. Aumenta o alcance do ataque básico em 150 (só para herói de ataque à distância) e a velocidade de movimento em 20% por 5 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/sunchaser-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Pure Sky",
    nomePt: "Céu Limpo",
    fontePt: "br",
    notaPt: "Confirmado duas vezes: o nome aparece nas notas em português E a passiva descrita lá (\"Mutilação\": lentidão de 30% e 20% menos dano do alvo) bate com a que este catálogo já tinha. Nome e efeito cruzados.",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "fisico",
    efeito: "Habilidade que acerta lentifica em 30% o primeiro herói inimigo atingido e reduz em 20% o dano que você toma dele, por 3 s; recarga de 8 s. Ativo: 35% de redução de dano por 3 s, usável mesmo sob controle de grupo, com recarga de 90 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/pure-sku-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Sky Dome",
    nomePt: "Cúpula Celeste",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "fisico",
    efeito: "Mesma passiva do Pure Sky (lentidão de 30% e 20% menos dano do alvo, por 3 s, recarga de 8 s). Ativo: 40% de redução de dano e 30% de velocidade de movimento ignorando terreno, por 3 s — matar herói inimigo renova a duração.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/sky-dome-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Sparkforged Dagger",
    nomePt: "Adaga Forjada em Faísca",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "fisico",
    efeito: "Passiva \"Arco Elétrico\": o ataque básico tem 30% de chance de disparar um arco que causa (120 + 30% do ataque físico) de dano mágico. O arco pode dar crítico.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Sparkforged_Dagger",
    confiancaEfeito: "alta"
  },
  {
    nome: "Runic Blade",
    nomePt: "Lâmina Rúnica",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/runic-blade-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "A busca só disse que é um item físico avançado que dá defesa mágica e muito dano. Isso é categoria, não passiva — então o campo de efeito ficou vazio de propósito."
  },
  {
    nome: "Void Staff",
    nomePt: "Cajado do Vazio",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "magico",
    efeito: "Dá 45% de perfuração mágica e 240 de ataque mágico.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/void-staff-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Scepter of Reverberation",
    nomePt: "Cetro da Reverberação",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "magico",
    efeito: "Habilidade que acerta dispara uma explosão pequena, causando (120 + 40% do ataque mágico) de dano. Recarga de 5 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Scepter_of_Reverberation",
    confiancaEfeito: "alta"
  },
  {
    nome: "Mask of Agony",
    nomePt: "Máscara da Agonia",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "magico",
    efeito: "Habilidade que acerta causa dano mágico igual a 3% da vida ATUAL do alvo, 4 vezes ao longo de 3 s (no máximo 200 em monstro).",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/mask-of-agony-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Twilight Stream",
    nomePt: "Corrente do Crepúsculo",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "magico",
    efeito: "Causar dano em herói dá de 16 a 30 de perfuração mágica por 4 s, acumulando até 10 vezes.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/twilight-stream-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Stave of Sorcery",
    nomePt: "Bordão da Feitiçaria",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "magico",
    efeito: "O próximo ataque básico, em até 5 s depois de usar uma habilidade, causa (30% de dano físico + 70% de dano mágico). Recarga de 3 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/stave-of-sorcery-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Savant's Wrath",
    nomePt: "Ira do Sábio",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "magico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/savants-wrath-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca disse que é item mágico avançado que sobe muito o ataque mágico, e que se monta com Grand Staff + 2 Spell Tome. Receita não é passiva — o campo de efeito ficou vazio."
  },
  {
    nome: "Insatiable Tome",
    nomePt: "Tomo Insaciável",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "magico",
    efeito: "Dá roubo de vida ao causar dano mágico. Uma busca sobre a Luna detalhou: 180 de ataque mágico, 10% de redução de recarga, 1000 de vida máxima e 25% de roubo de vida mágico.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/insatiable-tome-stats",
    confiancaEfeito: "media",
    notaEfeito: "Os números vieram de uma busca sobre a build da Luna, não da página do item. Monta-se com Blood Clan's Grimoire + Spell Tome + Resilient Agate."
  },
  {
    nome: "Tome of Wisdom",
    nomePt: "Tomo da Sabedoria",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "magico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/tome-of-wisdom-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca disse que é item mágico avançado de ataque mágico muito alto, montado com 2 Grand Staff + Sage's Codex. Sem passiva nomeada."
  },
  {
    nome: "Overlord's Platemail",
    nomePt: "Armadura do Soberano",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "defesa",
    efeito: "Em combate, recupera 1% da vida que falta a cada 2 s. Fora de combate, recupera 3% da vida máxima por segundo e dá 30 de velocidade de movimento.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Overlord's_Platemail",
    confiancaEfeito: "alta",
    notaEfeito: "Uma segunda busca, feita depois, trouxe os números que a primeira não tinha. Não é o mesmo item que o \"Overlord's Might\" que sete builds citam — aquele a busca não achou."
  },
  {
    nome: "Ominous Premonition",
    nomePt: "Premonição Sinistra",
    fontePt: "br",
    notaPt: "Nome visto em guia brasileiro.",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "defesa",
    efeito: "Item defensivo avançado que lentifica quem causa dano em você.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/ominous-premonition-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca deu o mecanismo sem os números."
  },
  {
    nome: "Spikemail",
    nomePt: "Cota de Espinhos",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "defesa",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/spikemail-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Aparece nas listas de item defensivo, mas nenhuma busca devolveu a passiva."
  },
  {
    nome: "Succubus Cloak",
    nomePt: "Manto da Súcubo",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "defesa",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/succubus-cloak-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Aparece nas listas de item defensivo, mas nenhuma busca devolveu a passiva."
  },
  {
    nome: "Longnight Guardian",
    nomePt: "Guardião da Noite Longa",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "defesa",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Category:Defense_items",
    confiancaEfeito: "baixa",
    notaEfeito: "Aparece nas listas de item defensivo, mas nenhuma busca devolveu a passiva."
  },
  {
    nome: "Lightfoot Shoes",
    nomePt: "Sapatos de Pé Leve",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "movimento",
    fonteEfeito: "busca_web",
    urlEfeito: "https://gamingonphone.com/guides/honor-of-kings-the-complete-equipment-guide-and-tips/",
    confiancaEfeito: "baixa",
    notaEfeito: "É a sétima bota do jogo — as outras seis estão no seu catálogo. A passiva não apareceu em busca nenhuma."
  },
  {
    nome: "Runeblade",
    nomePt: "Lâmina Rúnica de Caça",
    fontePt: "eu?",
    notaPt: "Cuidado: existe também \"Runic Blade\", que traduzi como \"Lâmina Rúnica\". São itens diferentes em inglês (um é de selva, outro físico) e ficaram com nomes parecidos em português. Acrescentei \"de Caça\" para separar.",
    preco: 2160,
    fonteItem: "busca_web",
    categoriaItem: "selva",
    efeito: "Dá 150 de ataque mágico, 5% de redução de recarga e 7% de velocidade de movimento. Matar monstro — você ou um aliado — aumenta o ataque mágico e a redução de recarga.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/jungling-items/runeblade-hok",
    confiancaEfeito: "alta"
  },
  {
    nome: "Rapacious Bite",
    nomePt: "Mordida Voraz",
    fontePt: "eu",
    preco: 2160,
    fonteItem: "busca_web",
    categoriaItem: "selva",
    efeito: "Aumenta o ataque físico ao matar monstro de selva.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/jungling-items/rapacious-bite-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca deu o mecanismo e o preço, sem os números do ganho por marca."
  },
  {
    nome: "Relentless Blade",
    nomePt: "Lâmina Implacável",
    fontePt: "eu",
    preco: 700,
    fonteItem: "busca_web",
    categoriaItem: "selva",
    efeito: "Aumenta o ataque físico depois de matar monstro de selva.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/jungling-items/novice-jungling-items-hok",
    confiancaEfeito: "media",
    notaEfeito: "Item intermediário de selva. A busca deu o mecanismo e o preço, sem os números."
  },
  {
    nome: "Stormchaser",
    nomePt: "Caça-Tempestade",
    fontePt: "eu",
    preco: 900,
    fonteItem: "busca_web",
    categoriaItem: "roaming",
    efeito: "Item de roaming avançado que dá velocidade de movimento e aumenta o atributo de ataque principal do time.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/stormchaser-hok",
    confiancaEfeito: "media",
    notaEfeito: "A busca deu o mecanismo e o preço, sem os números."
  },
  {
    nome: "Howling Emblem",
    nomePt: "Emblema Uivante",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "roaming",
    efeito: "Ao ser usado, aumenta muito a velocidade de movimento; o efeito cai quando você causa ou recebe dano.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://gamingonphone.com/guides/honor-of-kings-the-complete-equipment-guide-and-tips/",
    confiancaEfeito: "media"
  },
  {
    nome: "Starspring",
    nomePt: "Fonte Estelar",
    fontePt: "eu?",
    notaPt: "Existem três coisas com \"Starspring\" no catálogo. Não foram casadas.",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "roaming",
    efeito: "Recupera vida e mana do aliado alvo e de você.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://gamingonphone.com/guides/honor-of-kings-the-complete-equipment-guide-and-tips/",
    confiancaEfeito: "media",
    notaEfeito: "O seu catálogo já tem \"Crimson Shadow - Starspring\" e \"Guardian - Starspring\" (2080 cada). Este aqui aparece na busca como item de roaming com nome solto. Não casei os três: nome parecido não é prova de ser o mesmo item."
  },
  {
    nome: "Wings of Redemption",
    nomePt: "Asas da Redenção",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "roaming",
    fonteEfeito: "busca_web",
    urlEfeito: "https://www.bluestacks.com/blog/game-guides/honor-of-kings/hok-equipment-guide-en.html",
    confiancaEfeito: "baixa",
    notaEfeito: "Aparece nas listas de roaming, mas nenhuma busca devolveu o efeito."
  },
  {
    nome: "Extreme Shadow",
    nomePt: "Sombra Extrema",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "roaming",
    fonteEfeito: "busca_web",
    urlEfeito: "https://www.bluestacks.com/blog/game-guides/honor-of-kings/hok-equipment-guide-en.html",
    confiancaEfeito: "baixa",
    notaEfeito: "Aparece nas listas de roaming, mas nenhuma busca devolveu o efeito."
  },
  {
    nome: "Guardian's Glory",
    nomePt: "Glória do Guardião",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "roaming",
    fonteEfeito: "busca_web",
    urlEfeito: "https://www.bluestacks.com/blog/game-guides/honor-of-kings/hok-equipment-guide-en.html",
    confiancaEfeito: "baixa",
    notaEfeito: "Aparece nas listas de roaming, mas nenhuma busca devolveu o efeito."
  },
  {
    nome: "Pugilist's Gauntlet",
    nomePt: "Manopla do Pugilista",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/novice-physical-items-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente de item físico. Item de base quase sempre não tem passiva única."
  },
  {
    nome: "Iron Sword",
    nomePt: "Espada de Ferro",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/novice-physical-items-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente de item físico."
  },
  {
    nome: "Vampiric Scythe",
    nomePt: "Foice Vampírica",
    fontePt: "eu?",
    notaPt: "Um guia brasileiro cita \"Foice das Sombras\" — pode ser este item ou o Shadow Ripper. Não casei.",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/novice-physical-items-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente de item físico."
  },
  {
    nome: "Anti-magic Cloak",
    nomePt: "Manto Antimagia",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/novice-defense-items-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente de item defensivo."
  },
  {
    nome: "Resilient Agate",
    nomePt: "Ágata Resiliente",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/novice-defense-items-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente de item defensivo e mágico."
  },
  {
    nome: "Sparkling Sapphire",
    nomePt: "Safira Cintilante",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/novice-defense-items-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente de item defensivo e mágico."
  },
  {
    nome: "Revitalizing Crystal",
    nomePt: "Cristal Revitalizante",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/defense-items/novice-defense-items-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente de item defensivo."
  },
  {
    nome: "Spell Tome",
    nomePt: "Tomo de Feitiços",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/novice-magical-items-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente de item mágico."
  },
  {
    nome: "Sage's Codex",
    nomePt: "Códice do Sábio",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/novice-magical-items-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente de item mágico."
  },
  {
    nome: "Alchemist's Amulet",
    nomePt: "Amuleto do Alquimista",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/magical-items/novice-magical-items-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente de item mágico."
  },
  {
    nome: "Knowledge Gem",
    nomePt: "Gema do Conhecimento",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/roaming-items/knowledge-gem-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente de item de roaming — entra no Guardian, por exemplo."
  },
  {
    nome: "Venomous Staff",
    nomePt: "Cajado Venenoso",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "magico",
    efeito: "Ataque básico ou habilidade que acerta reduz em 35% a recuperação de vida e o roubo de vida do alvo, por 3 s.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Venomous_Staff",
    confiancaEfeito: "alta",
    notaEfeito: "Monta-se com Grand Staff + Sage’s Codex + Spell Tome. Note que o efeito é o mesmo trecho que aparece na passiva do Blazing Cape — as duas fontes descrevem o mesmo tipo de corte de cura, e isso não foi \"resolvido\" aqui."
  },
  {
    nome: "Sage's Tome",
    nomePt: "Tomo do Sábio",
    fontePt: "eu?",
    notaPt: "Parecido com \"Sage’s Codex\" (Códice do Sábio) e \"Sage’s Sanctuary\" (Santuário do Sábio). São três itens distintos em inglês.",
    preco: 2610,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "magico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "Preço (2610) veio da busca. A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Stone of Sorcery",
    nomePt: "Pedra da Feitiçaria",
    fontePt: "eu",
    preco: 800,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "magico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "Preço (800) veio da busca. A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Nettle Gauntlet",
    nomePt: "Manopla de Urtiga",
    fontePt: "eu",
    preco: 750,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "defesa",
    efeito: "Dá 150 de defesa física e 35 de ataque físico.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Nettle_Gauntlet",
    confiancaEfeito: "media",
    notaEfeito: "A busca deu atributos e preço. Se tem passiva única, ela não apareceu."
  },
  {
    nome: "Starbreaker",
    nomePt: "Quebra-Estrelas",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    efeito: "Dá 40% de perfuração física.",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/starbreaker-hok",
    confiancaEfeito: "media",
    notaEfeito: "Monta-se com Meteor + Lance of Swiftness. A busca deu o atributo principal; se há passiva além disso, não apareceu."
  },
  {
    nome: "Meteor",
    nomePt: "Meteoro",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Meteor",
    confiancaEfeito: "baixa",
    notaEfeito: "Aparece em 7 builds e é componente do Starbreaker. A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Overlord's Might",
    nomePt: "Poderio do Soberano",
    fontePt: "eu?",
    notaPt: "Este item já tinha dúvida: 7 builds citam, mas a busca dedicada não o achou. Parecido com \"Overlord’s Platemail\" (Armadura do Soberano), que é outro.",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "Aparece em 7 builds, mas a busca dedicada NÃO encontrou item com este nome — achou \"Overlord’s Platemail\", que é outro (defesa). Pode ser item real que a busca não indexou, ou erro dos resumos que citaram. Fica registrado com a dúvida, não apagado nem casado com o Platemail."
  },
  {
    nome: "Sage's Sanctuary",
    nomePt: "Santuário do Sábio",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "magico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "Citado em 5 builds. A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Thunderclap Brand",
    nomePt: "Marca do Trovão",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "Citado em 4 builds como item INICIAL. A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Daybreaker",
    nomePt: "Alvorecer",
    fontePt: "eu?",
    notaPt: "ATENÇÃO: \"Alvorada\", nome oficial visto em português, pode ser ESTE item — e não o Dawnlight, onde eu coloquei. Os dois carregam o aviso.",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://zilliongamer.com/honor-of-kings/c/physical-items/daybreaker-hok",
    confiancaEfeito: "baixa",
    notaEfeito: "ATENÇÃO: o seu catálogo já tem \"Daybreaker’s Virtue\" (2570, das suas capturas). As buscas de build escrevem só \"Daybreaker\". Pode ser o mesmo item com o nome cortado. NÃO foram casados — os dois ficam, e a dúvida fica escrita. Uma busca deu para ele 50 de ataque físico, 35% de velocidade de ataque, 20% de crítico e 40% de perfuração física."
  },
  {
    nome: "Frostscar's Grip",
    nomePt: "Garra da Cicatriz Gélida",
    fontePt: "eu?",
    notaPt: "Já estava em dúvida com \"Frostscar’s Embrace\" (Abraço da Cicatriz Gélida).",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "Mesma situação do Daybreaker: o seu catálogo tem \"Frostscar’s Embrace\" (2060). As buscas escrevem \"Grip\". Não casados."
  },
  {
    nome: "Twinblades of Destruction",
    nomePt: "Lâminas Gêmeas da Destruição",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Category:Physical_items",
    confiancaEfeito: "baixa",
    notaEfeito: "A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Mortal Punisher",
    nomePt: "Punidor Mortal",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Category:Physical_items",
    confiancaEfeito: "baixa",
    notaEfeito: "A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Tempest",
    nomePt: "Tempestade",
    fontePt: "eu?",
    notaPt: "Uma busca escreveu \"Dreamforged - Tempest\". E \"Storm Sword\" virou \"Espada da Tempestade\" — nomes vizinhos em português para itens diferentes em inglês.",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://honor-of-kings.fandom.com/wiki/Category:Physical_items",
    confiancaEfeito: "baixa",
    notaEfeito: "Uma busca escreveu \"Dreamforged - Tempest\", outra só \"Tempest\". A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Nebulon Wood",
    nomePt: "Madeira Nebulosa",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "magico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Splendor",
    nomePt: "Esplendor",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "magico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Twilight Bow",
    nomePt: "Arco do Crepúsculo",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Protector's Cuirass",
    nomePt: "Couraça do Protetor",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "defesa",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Cloud Piercing Bow",
    nomePt: "Arco Perfura-Nuvens",
    fontePt: "eu?",
    notaPt: "Parecido com \"Cloud Piercer\" (Perfura-Nuvens), que é outro item. Não casei.",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "O seu catálogo tem \"Cloud Piercer\" (800). Nome parecido, não casado. A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Sunglow Striker",
    nomePt: "Golpeador do Brilho Solar",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "fisico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "Citado como item inicial da Mulan. A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Moon Soul",
    nomePt: "Alma Lunar",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "magico",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "A busca devolveu o item (existe, e as builds citam), mas NÃO devolveu a passiva dele. O campo ficou vazio em vez de receber um texto plausível."
  },
  {
    nome: "Lance of Swiftness",
    nomePt: "Lança da Rapidez",
    fontePt: "eu",
    preco: null,
    fonteItem: "busca_web",
    citadoEmBuild: true,
    categoriaItem: "componente",
    fonteEfeito: "busca_web",
    urlEfeito: "https://hokstats.gg/items/",
    confiancaEfeito: "baixa",
    notaEfeito: "Componente do Starbreaker, segundo a busca. Item de base costuma não ter passiva."
  }
]
  };
})(window.U);
