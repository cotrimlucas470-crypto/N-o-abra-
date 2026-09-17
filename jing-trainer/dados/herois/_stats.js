/* ============================================================
   dados/herois/_stats.js — a tabela 数据 do pvp.mcxssg.net
   ------------------------------------------------------------
   ORIGEM: a fonte prioritária, transcrita das capturas do site
   que você enviou. Data dos dados: 2026-09-16. Modo: 巅峰千强.

   O QUE CADA COLUNA É (o site publica em chinês):
     胜率     vitoria       taxa de vitória
     出场率   escolha       taxa de escolha
     禁用率   banimento     taxa de banimento
     BP率     bp            escolhido OU banido
     Q区国十  q10           pontuação de poder, top 10 nacional do Q
     参团率   participacao  presença em luta de equipe
     输出占比 dano          fatia do dano da equipe

   RESSALVAS QUE O PRÓPRIO SITE FAZ, no rodapé da tabela:
   · 巅峰千强 cobre os ~1000 melhores de cada rota nas duas regiões QQ;
   · todos os dados vêm de partidas públicas e são só referência;
   · com amostra de topo a taxa de vitória oscila bastante, e heróis
     de baixa escolha já vêm ocultos por padrão;
   · a taxa de vitória é calculada de forma contínua dentro da versão;
   · o site é ferramenta independente, sem relação com a Tencent.

   RESSALVA MINHA: isto é TRANSCRIÇÃO DE IMAGEM. Ler número pequeno
   de captura erra às vezes, e são 84 linhas com 7 números cada.
   Tudo vem com conferido: false.

   ATALHO QUE VOCÊ TEM E EU NÃO: essa tabela tem um botão
   导出表格 ("exportar tabela") no canto inferior direito. Baixar
   por ali e importar o arquivo substitui esta transcrição inteira
   por dado de primeira mão. É o caminho certo.

   LACUNA CONHECIDA: as posições 63 a 66 ficaram entre duas
   capturas e não foram lidas. Estão ausentes, não estimadas.
   ============================================================ */
'use strict';
(function (U) {
  U.HE.STATS = {
    fonte: 'pvp.mcxssg.net',
    fonteUrl: 'https://pvp.mcxssg.net/',
    data: '2026-09-16',
    modo: '巅峰千强',
    metodo: 'transcrito de captura de tela enviada por você',
    conferido: false,
    faltam: [63, 64, 65, 66],
    colunas: {
      vitoria: '胜率', escolha: '出场率', banimento: '禁用率', bp: 'BP率',
      q10: 'Q区国十', participacao: '参团率', dano: '输出占比',
    },
    avisoDaFonte: 'O site declara: amostra de topo faz a taxa de vitória oscilar; heróis de baixa escolha vêm ocultos; dados de partidas públicas, só para referência.',
    linhas:
[
  {
    "pos": 1,
    "nomeCn": "海月",
    "rotaCn": "中路",
    "vitoria": 51.1,
    "escolha": 7.4,
    "banimento": 90.0,
    "bp": 97.5,
    "q10": 17.776,
    "participacao": 56.5,
    "dano": 21.6
  },
  {
    "pos": 2,
    "nomeCn": "盾山",
    "rotaCn": "游走",
    "vitoria": 55.0,
    "escolha": 13.9,
    "banimento": 80.2,
    "bp": 94.1,
    "q10": 17.455,
    "participacao": 71.7,
    "dano": 8.8
  },
  {
    "pos": 3,
    "nomeCn": "敖隐",
    "rotaCn": "发育路",
    "vitoria": 50.2,
    "escolha": 41.3,
    "banimento": 52.7,
    "bp": 94.1,
    "q10": 18.657,
    "participacao": 56.6,
    "dano": 22.7
  },
  {
    "pos": 4,
    "nomeCn": "元流之子(辅助)",
    "rotaCn": "游走",
    "vitoria": 50.2,
    "escolha": 23.4,
    "banimento": 68.5,
    "bp": 91.9,
    "q10": 18.48,
    "participacao": 74.2,
    "dano": 13.2
  },
  {
    "pos": 5,
    "nomeCn": "鲁班大师",
    "rotaCn": "游走",
    "vitoria": 50.9,
    "escolha": 29.1,
    "banimento": 62.5,
    "bp": 91.6,
    "q10": 18.395,
    "participacao": 75.5,
    "dano": 10.5
  },
  {
    "pos": 6,
    "nomeCn": "关羽",
    "rotaCn": "对抗路",
    "vitoria": 53.9,
    "escolha": 15.2,
    "banimento": 75.2,
    "bp": 90.5,
    "q10": 18.428,
    "participacao": 54.3,
    "dano": 15.1
  },
  {
    "pos": 7,
    "nomeCn": "少司缘",
    "rotaCn": "游走",
    "vitoria": 50.9,
    "escolha": 36.6,
    "banimento": 42.8,
    "bp": 79.4,
    "q10": 19.172,
    "participacao": 75.2,
    "dano": 11.8
  },
  {
    "pos": 8,
    "nomeCn": "马超",
    "rotaCn": "打野/对抗路",
    "vitoria": 51.0,
    "escolha": 31.8,
    "banimento": 33.4,
    "bp": 65.2,
    "q10": 18.556,
    "participacao": 62.8,
    "dano": 21.5
  },
  {
    "pos": 9,
    "nomeCn": "裴擒虎",
    "rotaCn": "打野",
    "vitoria": 49.4,
    "escolha": 23.2,
    "banimento": 38.2,
    "bp": 61.4,
    "q10": 18.419,
    "participacao": 65.2,
    "dano": 20.7
  },
  {
    "pos": 10,
    "nomeCn": "镜",
    "rotaCn": "打野",
    "vitoria": 51.7,
    "escolha": 21.0,
    "banimento": 40.2,
    "bp": 61.1,
    "q10": 18.529,
    "participacao": 64.2,
    "dano": 21.2
  },
  {
    "pos": 11,
    "nomeCn": "元流之子(射手)",
    "rotaCn": "发育路",
    "vitoria": 48.4,
    "escolha": 24.2,
    "banimento": 34.7,
    "bp": 58.9,
    "q10": 18.523,
    "participacao": 57.0,
    "dano": 27.2
  },
  {
    "pos": 12,
    "nomeCn": "女娲",
    "rotaCn": "中路",
    "vitoria": 49.6,
    "escolha": 22.0,
    "banimento": 33.9,
    "bp": 55.9,
    "q10": 18.291,
    "participacao": 71.8,
    "dano": 27.1
  },
  {
    "pos": 13,
    "nomeCn": "沈梦溪",
    "rotaCn": "中路",
    "vitoria": 47.7,
    "escolha": 27.0,
    "banimento": 28.6,
    "bp": 55.6,
    "q10": 18.291,
    "participacao": 68.3,
    "dano": 29.6
  },
  {
    "pos": 14,
    "nomeCn": "大乔",
    "rotaCn": "中路/游走",
    "vitoria": 53.4,
    "escolha": 19.0,
    "banimento": 35.4,
    "bp": 54.4,
    "q10": 18.252,
    "participacao": 71.9,
    "dano": 21.5
  },
  {
    "pos": 15,
    "nomeCn": "嫦娥",
    "rotaCn": "中路",
    "vitoria": 51.2,
    "escolha": 17.2,
    "banimento": 21.2,
    "bp": 38.4,
    "q10": 18.059,
    "participacao": 67.0,
    "dano": 24.8
  },
  {
    "pos": 16,
    "nomeCn": "武则天",
    "rotaCn": "中路",
    "vitoria": 49.8,
    "escolha": 11.3,
    "banimento": 24.9,
    "bp": 36.2,
    "q10": 17.918,
    "participacao": 68.8,
    "dano": 21.7
  },
  {
    "pos": 17,
    "nomeCn": "苏烈",
    "rotaCn": "游走",
    "vitoria": 51.3,
    "escolha": 19.3,
    "banimento": 14.2,
    "bp": 33.5,
    "q10": 17.641,
    "participacao": 71.6,
    "dano": 10.3
  },
  {
    "pos": 18,
    "nomeCn": "司空震",
    "rotaCn": "对抗路/发育路",
    "vitoria": 48.6,
    "escolha": 18.5,
    "banimento": 13.8,
    "bp": 32.4,
    "q10": 18.114,
    "participacao": 53.0,
    "dano": 21.2
  },
  {
    "pos": 19,
    "nomeCn": "元歌",
    "rotaCn": "对抗路",
    "vitoria": 51.8,
    "escolha": 17.0,
    "banimento": 14.8,
    "bp": 31.9,
    "q10": 17.934,
    "participacao": 56.8,
    "dano": 21.2
  },
  {
    "pos": 20,
    "nomeCn": "哪吒",
    "rotaCn": "对抗路/打野",
    "vitoria": 49.6,
    "escolha": 16.6,
    "banimento": 10.7,
    "bp": 27.2,
    "q10": 16.961,
    "participacao": 65.1,
    "dano": 19.6
  },
  {
    "pos": 21,
    "nomeCn": "狂铁",
    "rotaCn": "对抗路",
    "vitoria": 48.9,
    "escolha": 19.7,
    "banimento": 6.1,
    "bp": 25.8,
    "q10": 18.078,
    "participacao": 53.2,
    "dano": 16.7
  },
  {
    "pos": 22,
    "nomeCn": "老夫子",
    "rotaCn": "对抗路",
    "vitoria": 49.1,
    "escolha": 7.2,
    "banimento": 18.0,
    "bp": 25.1,
    "q10": 16.979,
    "participacao": 49.2,
    "dano": 12.4
  },
  {
    "pos": 23,
    "nomeCn": "阿古朵",
    "rotaCn": "打野",
    "vitoria": 52.4,
    "escolha": 13.1,
    "banimento": 11.6,
    "bp": 24.7,
    "q10": 17.632,
    "participacao": 68.9,
    "dano": 24.5
  },
  {
    "pos": 24,
    "nomeCn": "公孙离",
    "rotaCn": "发育路",
    "vitoria": 51.3,
    "escolha": 12.0,
    "banimento": 10.5,
    "bp": 22.5,
    "q10": 18.715,
    "participacao": 58.1,
    "dano": 22.7
  },
  {
    "pos": 25,
    "nomeCn": "百里守约",
    "rotaCn": "发育路",
    "vitoria": 48.3,
    "escolha": 13.9,
    "banimento": 8.1,
    "bp": 22.1,
    "q10": 17.812,
    "participacao": 56.5,
    "dano": 24.4
  },
  {
    "pos": 26,
    "nomeCn": "戈娅",
    "rotaCn": "发育路",
    "vitoria": 50.9,
    "escolha": 13.3,
    "banimento": 8.7,
    "bp": 22.0,
    "q10": 18.257,
    "participacao": 62.4,
    "dano": 25.1
  },
  {
    "pos": 27,
    "nomeCn": "艾琳",
    "rotaCn": "发育路",
    "vitoria": 50.1,
    "escolha": 11.4,
    "banimento": 7.9,
    "bp": 19.3,
    "q10": 18.203,
    "participacao": 59.4,
    "dano": 27.8
  },
  {
    "pos": 28,
    "nomeCn": "赵云",
    "rotaCn": "打野",
    "vitoria": 48.1,
    "escolha": 14.5,
    "banimento": 4.3,
    "bp": 18.7,
    "q10": 17.41,
    "participacao": 61.4,
    "dano": 18.3
  },
  {
    "pos": 29,
    "nomeCn": "小乔",
    "rotaCn": "中路",
    "vitoria": 48.5,
    "escolha": 15.0,
    "banimento": 3.7,
    "bp": 18.7,
    "q10": 18.16,
    "participacao": 63.0,
    "dano": 23.0
  },
  {
    "pos": 30,
    "nomeCn": "不知火舞",
    "rotaCn": "中路",
    "vitoria": 51.1,
    "escolha": 14.0,
    "banimento": 4.5,
    "bp": 18.5,
    "q10": 17.989,
    "participacao": 61.7,
    "dano": 20.4
  },
  {
    "pos": 31,
    "nomeCn": "诸葛亮",
    "rotaCn": "中路/打野",
    "vitoria": 51.9,
    "escolha": 16.0,
    "banimento": 0.9,
    "bp": 17.0,
    "q10": 18.017,
    "participacao": 62.5,
    "dano": 27.8
  },
  {
    "pos": 32,
    "nomeCn": "张飞",
    "rotaCn": "游走",
    "vitoria": 47.1,
    "escolha": 10.1,
    "banimento": 6.1,
    "bp": 16.2,
    "q10": 16.989,
    "participacao": 66.5,
    "dano": 7.1
  },
  {
    "pos": 33,
    "nomeCn": "虞姬",
    "rotaCn": "发育路",
    "vitoria": 49.8,
    "escolha": 8.9,
    "banimento": 6.8,
    "bp": 15.7,
    "q10": 17.071,
    "participacao": 54.1,
    "dano": 23.6
  },
  {
    "pos": 34,
    "nomeCn": "苍",
    "rotaCn": "发育路",
    "vitoria": 50.5,
    "escolha": 13.6,
    "banimento": 2.0,
    "bp": 15.6,
    "q10": 17.64,
    "participacao": 56.3,
    "dano": 25.1
  },
  {
    "pos": 35,
    "nomeCn": "狄仁杰",
    "rotaCn": "发育路",
    "vitoria": 51.1,
    "escolha": 7.9,
    "banimento": 7.6,
    "bp": 15.5,
    "q10": 16.538,
    "participacao": 59.5,
    "dano": 25.9
  },
  {
    "pos": 36,
    "nomeCn": "影",
    "rotaCn": "对抗路",
    "vitoria": 48.0,
    "escolha": 9.9,
    "banimento": 4.8,
    "bp": 14.7,
    "q10": 18.334,
    "participacao": 53.7,
    "dano": 22.3
  },
  {
    "pos": 37,
    "nomeCn": "蒙恬",
    "rotaCn": "对抗路",
    "vitoria": 52.8,
    "escolha": 9.4,
    "banimento": 5.2,
    "bp": 14.6,
    "q10": 17.33,
    "participacao": 53.1,
    "dano": 19.2
  },
  {
    "pos": 38,
    "nomeCn": "夏洛特",
    "rotaCn": "对抗路",
    "vitoria": 49.8,
    "escolha": 13.1,
    "banimento": 0.6,
    "bp": 13.7,
    "q10": 17.486,
    "participacao": 50.3,
    "dano": 19.6
  },
  {
    "pos": 39,
    "nomeCn": "露娜",
    "rotaCn": "打野",
    "vitoria": 53.0,
    "escolha": 9.4,
    "banimento": 3.6,
    "bp": 13.0,
    "q10": 17.818,
    "participacao": 60.4,
    "dano": 21.8
  },
  {
    "pos": 40,
    "nomeCn": "杨戬",
    "rotaCn": "打野/对抗路",
    "vitoria": 48.6,
    "escolha": 11.0,
    "banimento": 1.9,
    "bp": 12.9,
    "q10": 17.114,
    "participacao": 59.0,
    "dano": 21.1
  },
  {
    "pos": 41,
    "nomeCn": "杨玉环",
    "rotaCn": "中路/游走",
    "vitoria": 50.1,
    "escolha": 12.5,
    "banimento": 0.2,
    "bp": 12.7,
    "q10": 17.874,
    "participacao": 71.5,
    "dano": 21.6
  },
  {
    "pos": 42,
    "nomeCn": "太乙真人",
    "rotaCn": "游走/中路",
    "vitoria": 53.0,
    "escolha": 9.7,
    "banimento": 2.2,
    "bp": 11.9,
    "q10": 17.141,
    "participacao": 70.2,
    "dano": 9.6
  },
  {
    "pos": 43,
    "nomeCn": "李信",
    "rotaCn": "发育路/对抗路",
    "vitoria": 50.2,
    "escolha": 10.7,
    "banimento": 1.1,
    "bp": 11.8,
    "q10": 16.965,
    "participacao": 49.8,
    "dano": 25.0
  },
  {
    "pos": 44,
    "nomeCn": "曹操",
    "rotaCn": "对抗路",
    "vitoria": 48.7,
    "escolha": 10.8,
    "banimento": 0.2,
    "bp": 10.9,
    "q10": 17.586,
    "participacao": 52.2,
    "dano": 20.2
  },
  {
    "pos": 45,
    "nomeCn": "刘邦",
    "rotaCn": "游走",
    "vitoria": 50.2,
    "escolha": 9.8,
    "banimento": 1.1,
    "bp": 10.9,
    "q10": 17.016,
    "participacao": 74.2,
    "dano": 12.1
  },
  {
    "pos": 46,
    "nomeCn": "韩信",
    "rotaCn": "打野",
    "vitoria": 50.1,
    "escolha": 10.2,
    "banimento": 0.5,
    "bp": 10.7,
    "q10": 17.452,
    "participacao": 62.0,
    "dano": 19.0
  },
  {
    "pos": 47,
    "nomeCn": "孙悟空",
    "rotaCn": "打野",
    "vitoria": 49.5,
    "escolha": 8.5,
    "banimento": 1.9,
    "bp": 10.4,
    "q10": 17.309,
    "participacao": 59.2,
    "dano": 18.6
  },
  {
    "pos": 48,
    "nomeCn": "蛮妃",
    "rotaCn": "发育路/对抗路",
    "vitoria": 51.3,
    "escolha": 8.8,
    "banimento": 1.5,
    "bp": 10.3,
    "q10": 18.108,
    "participacao": 54.4,
    "dano": 22.3
  },
  {
    "pos": 49,
    "nomeCn": "西施",
    "rotaCn": "中路",
    "vitoria": 49.8,
    "escolha": 6.8,
    "banimento": 2.5,
    "bp": 9.2,
    "q10": 17.257,
    "participacao": 64.9,
    "dano": 17.7
  },
  {
    "pos": 50,
    "nomeCn": "百里玄策",
    "rotaCn": "打野",
    "vitoria": 50.6,
    "escolha": 6.4,
    "banimento": 2.2,
    "bp": 8.6,
    "q10": 17.202,
    "participacao": 62.6,
    "dano": 16.5
  },
  {
    "pos": 51,
    "nomeCn": "罪",
    "rotaCn": "打野",
    "vitoria": 48.0,
    "escolha": 7.9,
    "banimento": 0.6,
    "bp": 8.4,
    "q10": 17.437,
    "participacao": 65.9,
    "dano": 21.2
  },
  {
    "pos": 52,
    "nomeCn": "大禹",
    "rotaCn": "游走",
    "vitoria": 47.2,
    "escolha": 6.7,
    "banimento": 1.0,
    "bp": 7.7,
    "q10": 16.818,
    "participacao": 75.6,
    "dano": 8.3
  },
  {
    "pos": 53,
    "nomeCn": "花木兰",
    "rotaCn": "对抗路",
    "vitoria": 50.9,
    "escolha": 7.3,
    "banimento": 0.2,
    "bp": 7.5,
    "q10": 16.961,
    "participacao": 53.5,
    "dano": 19.2
  },
  {
    "pos": 54,
    "nomeCn": "莱西奥",
    "rotaCn": "发育路",
    "vitoria": 49.3,
    "escolha": 7.0,
    "banimento": 0.4,
    "bp": 7.4,
    "q10": 17.266,
    "participacao": 56.4,
    "dano": 25.6
  },
  {
    "pos": 55,
    "nomeCn": "貂蝉",
    "rotaCn": "中路",
    "vitoria": 52.5,
    "escolha": 6.3,
    "banimento": 1.1,
    "bp": 7.4,
    "q10": 17.355,
    "participacao": 58.8,
    "dano": 25.6
  },
  {
    "pos": 56,
    "nomeCn": "墨子",
    "rotaCn": "游走",
    "vitoria": 48.3,
    "escolha": 6.3,
    "banimento": 0.8,
    "bp": 7.1,
    "q10": 16.397,
    "participacao": 72.2,
    "dano": 15.9
  },
  {
    "pos": 57,
    "nomeCn": "弈星",
    "rotaCn": "中路",
    "vitoria": 46.2,
    "escolha": 6.4,
    "banimento": 0.2,
    "bp": 6.5,
    "q10": 16.845,
    "participacao": 73.8,
    "dano": 21.0
  },
  {
    "pos": 58,
    "nomeCn": "空空儿",
    "rotaCn": "游走",
    "vitoria": 47.1,
    "escolha": 5.8,
    "banimento": 0.6,
    "bp": 6.4,
    "q10": 17.011,
    "participacao": 74.4,
    "dano": 15.5
  },
  {
    "pos": 59,
    "nomeCn": "后羿",
    "rotaCn": "发育路",
    "vitoria": 51.2,
    "escolha": 5.2,
    "banimento": 1.1,
    "bp": 6.3,
    "q10": 16.483,
    "participacao": 57.3,
    "dano": 20.3
  },
  {
    "pos": 60,
    "nomeCn": "海诺",
    "rotaCn": "中路/对抗路",
    "vitoria": 48.4,
    "escolha": 5.0,
    "banimento": 1.1,
    "bp": 6.0,
    "q10": 17.062,
    "participacao": 53.2,
    "dano": 28.7
  },
  {
    "pos": 61,
    "nomeCn": "孙策",
    "rotaCn": "对抗路",
    "vitoria": 53.0,
    "escolha": 5.9,
    "banimento": 0.1,
    "bp": 6.0,
    "q10": 16.498,
    "participacao": 62.4,
    "dano": 14.7
  },
  {
    "pos": 62,
    "nomeCn": "鲁班七号",
    "rotaCn": "发育路",
    "vitoria": 53.9,
    "escolha": 4.7,
    "banimento": 1.2,
    "bp": 5.9,
    "q10": 16.309,
    "participacao": 62.5,
    "dano": 27.6
  },
  {
    "pos": 67,
    "nomeCn": "上官婉儿",
    "rotaCn": "中路",
    "vitoria": 53.1,
    "escolha": 5.4,
    "banimento": 0.1,
    "bp": 5.5,
    "q10": 16.702,
    "participacao": 62.9,
    "dano": 24.6
  },
  {
    "pos": 68,
    "nomeCn": "达摩",
    "rotaCn": "对抗路",
    "vitoria": 50.0,
    "escolha": 5.2,
    "banimento": 0.1,
    "bp": 5.3,
    "q10": 16.44,
    "participacao": 53.8,
    "dano": 14.6
  },
  {
    "pos": 69,
    "nomeCn": "卢雅那",
    "rotaCn": "发育路",
    "vitoria": 48.0,
    "escolha": 4.5,
    "banimento": 0.6,
    "bp": 5.2,
    "q10": 16.949,
    "participacao": 57.7,
    "dano": 25.3
  },
  {
    "pos": 70,
    "nomeCn": "甄姬",
    "rotaCn": "中路",
    "vitoria": 46.7,
    "escolha": 4.2,
    "banimento": 0.8,
    "bp": 5.0,
    "q10": 16.525,
    "participacao": 60.4,
    "dano": 27.4
  },
  {
    "pos": 71,
    "nomeCn": "猪八戒",
    "rotaCn": "打野/对抗路",
    "vitoria": 48.2,
    "escolha": 4.6,
    "banimento": 0.3,
    "bp": 5.0,
    "q10": 16.44,
    "participacao": 53.0,
    "dano": 16.3
  },
  {
    "pos": 72,
    "nomeCn": "白起",
    "rotaCn": "对抗路",
    "vitoria": 45.6,
    "escolha": 4.2,
    "banimento": 0.7,
    "bp": 4.8,
    "q10": 15.991,
    "participacao": 53.9,
    "dano": 13.8
  },
  {
    "pos": 73,
    "nomeCn": "项羽",
    "rotaCn": "对抗路",
    "vitoria": 48.2,
    "escolha": 4.7,
    "banimento": 0.1,
    "bp": 4.8,
    "q10": 15.714,
    "participacao": 55.5,
    "dano": 14.6
  },
  {
    "pos": 74,
    "nomeCn": "钟馗",
    "rotaCn": "游走",
    "vitoria": 45.9,
    "escolha": 4.3,
    "banimento": 0.4,
    "bp": 4.7,
    "q10": 15.979,
    "participacao": 71.3,
    "dano": 10.7
  },
  {
    "pos": 75,
    "nomeCn": "橘右京",
    "rotaCn": "打野",
    "vitoria": 50.0,
    "escolha": 4.6,
    "banimento": 0.1,
    "bp": 4.7,
    "q10": 16.873,
    "participacao": 61.8,
    "dano": 20.1
  },
  {
    "pos": 76,
    "nomeCn": "大司命",
    "rotaCn": "打野",
    "vitoria": 52.1,
    "escolha": 4.3,
    "banimento": 0.3,
    "bp": 4.7,
    "q10": 16.807,
    "participacao": 61.2,
    "dano": 24.5
  },
  {
    "pos": 77,
    "nomeCn": "雅典娜",
    "rotaCn": "打野",
    "vitoria": 51.6,
    "escolha": 4.0,
    "banimento": 0.0,
    "bp": 4.0,
    "q10": 16.275,
    "participacao": 60.9,
    "dano": 20.2
  },
  {
    "pos": 78,
    "nomeCn": "姬小满",
    "rotaCn": "对抗路",
    "vitoria": 50.4,
    "escolha": 3.8,
    "banimento": 0.1,
    "bp": 3.9,
    "q10": 16.854,
    "participacao": 53.0,
    "dano": 15.6
  },
  {
    "pos": 79,
    "nomeCn": "赵怀真",
    "rotaCn": "游走/对抗路",
    "vitoria": 47.3,
    "escolha": 3.6,
    "banimento": 0.3,
    "bp": 3.9,
    "q10": 16.205,
    "participacao": 63.1,
    "dano": 11.9
  },
  {
    "pos": 80,
    "nomeCn": "心魔六耳",
    "rotaCn": "打野/对抗路",
    "vitoria": 44.4,
    "escolha": 3.1,
    "banimento": 0.7,
    "bp": 3.9,
    "q10": 16.864,
    "participacao": 57.0,
    "dano": 21.2
  },
  {
    "pos": 81,
    "nomeCn": "高渐离",
    "rotaCn": "中路",
    "vitoria": 51.0,
    "escolha": 3.7,
    "banimento": 0.1,
    "bp": 3.8,
    "q10": 16.549,
    "participacao": 64.4,
    "dano": 26.0
  },
  {
    "pos": 82,
    "nomeCn": "亚瑟",
    "rotaCn": "对抗路/游走",
    "vitoria": 51.7,
    "escolha": 3.7,
    "banimento": 0.1,
    "bp": 3.8,
    "q10": 16.391,
    "participacao": 64.9,
    "dano": 15.6
  },
  {
    "pos": 83,
    "nomeCn": "司马懿",
    "rotaCn": "打野",
    "vitoria": 51.1,
    "escolha": 3.3,
    "banimento": 0.2,
    "bp": 3.5,
    "q10": 16.909,
    "participacao": 68.0,
    "dano": 21.3
  },
  {
    "pos": 84,
    "nomeCn": "李白",
    "rotaCn": "打野",
    "vitoria": 51.5,
    "escolha": 3.2,
    "banimento": 0.2,
    "bp": 3.3,
    "q10": 17.275,
    "participacao": 62.1,
    "dano": 22.6
  },
  {
    "pos": 85,
    "nomeCn": "钟无艳",
    "rotaCn": "对抗路",
    "vitoria": 50.2,
    "escolha": 3.1,
    "banimento": 0.1,
    "bp": 3.2,
    "q10": 16.043,
    "participacao": 55.7,
    "dano": 18.4
  },
  {
    "pos": 86,
    "nomeCn": "芈月",
    "rotaCn": "对抗路",
    "vitoria": 51.6,
    "escolha": 2.8,
    "banimento": 0.2,
    "bp": 3.0,
    "q10": 17.104,
    "participacao": 47.4,
    "dano": 22.0
  },
  {
    "pos": 87,
    "nomeCn": "廉颇",
    "rotaCn": "游走/对抗路",
    "vitoria": 44.7,
    "escolha": 2.8,
    "banimento": 0.0,
    "bp": 2.8,
    "q10": 16.083,
    "participacao": 63.3,
    "dano": 14.6
  },
  {
    "pos": 88,
    "nomeCn": "元流之子(刺客)",
    "rotaCn": "打野",
    "vitoria": 47.1,
    "escolha": 2.6,
    "banimento": 0.1,
    "bp": 2.7,
    "q10": 16.318,
    "participacao": 64.5,
    "dano": 19.6
  }
]
  };

  /* joga cada linha para dentro do herói que o mapa de nomes reconhece */
  for (const r of U.HE.STATS.linhas) {
    const id = U.HE.idDoNomeCn(r.nomeCn);
    if (!id || !U.HE.porId(id)) continue;
    U.HE.aplicarStats(id, {
      posicao: r.pos,
      vitoria: { v: r.vitoria }, escolha: { v: r.escolha }, banimento: { v: r.banimento },
      bp: r.bp, q10: r.q10, participacao: r.participacao, dano: r.dano,
      rotaCn: r.rotaCn, data: U.HE.STATS.data, escopo: U.HE.STATS.modo,
      conferido: false,
    });
  }
})(window.U);
