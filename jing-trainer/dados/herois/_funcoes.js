/* ============================================================
   dados/herois/_funcoes.js — a rota de cada herói, pela fonte
   ------------------------------------------------------------
   ORIGEM: pvp.mcxssg.net, lido das capturas do seletor de herói
   que você enviou, filtro por filtro:

     对抗路 → top      打野 → selva     中路 → mid
     发育路 → adc      游走 → sup

   Um herói pode aparecer em mais de uma lista, e aqui ele fica
   com as duas — é assim que o site publica.

   Isto SUBSTITUI a função que antes vinha das capturas do HOK PRO:
   agora ela vem da fonte prioritária, que é o que você pediu.

   Transcrição de imagem, então conferido: false. E, de novo: nome
   que o mapa não reconhece fica em chinês em vez de virar palpite.
   ============================================================ */
'use strict';
(function (U) {
  U.HE.FUNCOES_FONTE = {
    fonte: 'pvp.mcxssg.net',
    data: '2026-09-17',
    metodo: 'transcrito das capturas do seletor de herói',
    conferido: false,
    linhas:
[
  {
    "nomeCn": "上官婉儿",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "不知火舞",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "东皇太一",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "云中君",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "云缨",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "亚瑟",
    "role": [
      "top",
      "sup"
    ]
  },
  {
    "nomeCn": "亚连",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "伽罗",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "元歌",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "元流之子(刺客)",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "元流之子(坦克)",
    "role": [
      "top",
      "selva",
      "sup"
    ]
  },
  {
    "nomeCn": "元流之子(射手)",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "元流之子(法师)",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "元流之子(辅助)",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "公孙离",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "兰陵王",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "关羽",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "典韦",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "刘备",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "刘禅",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "刘邦",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "卢雅那",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "司空震",
    "role": [
      "top",
      "adc"
    ]
  },
  {
    "nomeCn": "司马懿",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "后羿",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "吕布",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "周瑜",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "哪吒",
    "role": [
      "top",
      "selva"
    ]
  },
  {
    "nomeCn": "墨子",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "夏侯惇",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "夏洛特",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "大乔",
    "role": [
      "mid",
      "sup"
    ]
  },
  {
    "nomeCn": "大司命",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "大禹",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "太乙真人",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "女娲",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "妲己",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "姜子牙",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "姬小满",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "娜可露露",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "嫦娥",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "嬴政",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "孙尚香",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "孙悟空",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "孙权",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "孙策",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "孙膑",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "安琪拉",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "宫本武藏",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "小乔",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "少司缘",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "干将莫邪",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "庄周",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "廉颇",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "弈星",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "张良",
    "role": [
      "mid",
      "sup"
    ]
  },
  {
    "nomeCn": "张飞",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "影",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "心魔六耳",
    "role": [
      "top",
      "selva"
    ]
  },
  {
    "nomeCn": "戈娅",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "扁鹊",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "敖隐",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "明世隐",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "曜",
    "role": [
      "top",
      "selva"
    ]
  },
  {
    "nomeCn": "曹操",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "朵莉亚",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "李信",
    "role": [
      "top",
      "adc"
    ]
  },
  {
    "nomeCn": "李元芳",
    "role": [
      "selva",
      "adc"
    ]
  },
  {
    "nomeCn": "李白",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "杨戬",
    "role": [
      "top",
      "selva"
    ]
  },
  {
    "nomeCn": "杨玉环",
    "role": [
      "mid",
      "sup"
    ]
  },
  {
    "nomeCn": "桑启",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "梦奇",
    "role": [
      "top",
      "selva"
    ]
  },
  {
    "nomeCn": "橘右京",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "武则天",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "沈梦溪",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "海月",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "海诺",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "澜",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "牛魔",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "狂铁",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "狄仁杰",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "猪八戒",
    "role": [
      "top",
      "selva"
    ]
  },
  {
    "nomeCn": "王昭君",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "瑶",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "甄姬",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "白起",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "百里守约",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "百里玄策",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "盘古",
    "role": [
      "top",
      "selva"
    ]
  },
  {
    "nomeCn": "盾山",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "程咬金",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "空空儿",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "米莱狄",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "罪",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "老夫子",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "艾琳",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "芈月",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "花木兰",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "苍",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "苏烈",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "莱西奥",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "蒙恬",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "蒙犽",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "蔡文姬",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "虞姬",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "蛮妃",
    "role": [
      "top",
      "adc"
    ]
  },
  {
    "nomeCn": "裴擒虎",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "西施",
    "role": [
      "mid",
      "sup"
    ]
  },
  {
    "nomeCn": "诸葛亮",
    "role": [
      "selva",
      "mid"
    ]
  },
  {
    "nomeCn": "貂蝉",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "赵云",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "赵怀真",
    "role": [
      "top",
      "sup"
    ]
  },
  {
    "nomeCn": "达摩",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "金蝉",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "钟无艳",
    "role": [
      "top"
    ]
  },
  {
    "nomeCn": "钟馗",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "铠",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "镜",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "阿古朵",
    "role": [
      "selva",
      "adc"
    ]
  },
  {
    "nomeCn": "阿轲",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "雅典娜",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "露娜",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "韩信",
    "role": [
      "selva"
    ]
  },
  {
    "nomeCn": "项羽",
    "role": [
      "top",
      "sup"
    ]
  },
  {
    "nomeCn": "马可波罗",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "马超",
    "role": [
      "top",
      "selva"
    ]
  },
  {
    "nomeCn": "高渐离",
    "role": [
      "mid"
    ]
  },
  {
    "nomeCn": "鬼谷子",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "鲁班七号",
    "role": [
      "adc"
    ]
  },
  {
    "nomeCn": "鲁班大师",
    "role": [
      "sup"
    ]
  },
  {
    "nomeCn": "黄忠",
    "role": [
      "adc"
    ]
  }
]
  };
  for (const r of U.HE.FUNCOES_FONTE.linhas) {
    const id = U.HE.idDoNomeCn(r.nomeCn);
    if (!id || !U.HE.porId(id)) continue;
    U.HE.aplicarFuncao(id, r.role, r.nomeCn);
  }
})(window.U);
