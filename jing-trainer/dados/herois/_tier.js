/* ============================================================
   dados/herois/_tier.js — 英雄梯度榜 de 2026-09-17
   ------------------------------------------------------------
   ORIGEM: pvp.mcxssg.net, a fonte prioritária, lida da captura de
   tela do site que você enviou. Escopo 全部分路 (todas as rotas).

   RESSALVA QUE O PRÓPRIO SITE FAZ: a tela traz o aviso 算法测试中
   — "algoritmo em teste". Está registrado junto com os números.

   RESSALVA MINHA, que é diferente e igualmente importante: isto é
   TRANSCRIÇÃO DE IMAGEM, não download. Ler número pequeno de
   captura de tela erra às vezes. Por isso cada entrada carrega
   conferido: false, a tela mostra esse estado, e importar a mesma
   lista pelo extrator sobrescreve tudo isto sem dó.

   Os nomes estão em chinês porque é assim que a fonte publica. O
   id ao lado só aparece onde dá para afirmar a correspondência;
   onde não dá, fica null e a tela mostra o nome chinês. Chutar
   qual herói internacional corresponde a 少司缘 renomearia o
   herói errado sem ninguém perceber.
   ============================================================ */
'use strict';
(function (U) {
  const HE = U.HE;
  const L = (cn, pts) => ({ nomeCn: cn, pontos: pts, id: HE.idDoNomeCn(cn) });

  U.HE.TIER = {
    fonte: 'pvp.mcxssg.net',
    fonteUrl: 'https://pvp.mcxssg.net/',
    data: '2026-09-17',
    escopo: '全部分路',
    avisoDaFonte: '算法测试中 — o site marca esta lista como algoritmo em teste.',
    metodo: 'transcrito de captura de tela enviada por você',
    conferido: false,
    faixas: [
      { id: 'T0', herois: [
        L('海月', 100.0), L('盾山', 98.9), L('元流之子(辅助)', 97.2), L('鲁班大师', 96.9),
        L('敖隐', 95.5), L('关羽', 94.7), L('少司缘', 88.4), L('马超', 79.4),
        L('镜', 78.5), L('裴擒虎', 74.9), L('大乔', 72.3),
      ] },
      { id: 'T0.5', herois: [
        L('沈梦溪', 68.8), L('女娲', 66.7), L('元流之子(射手)', 66.2), L('嫦娥', 61.9),
        L('元歌', 61.5), L('苏烈', 60.8), L('司空震', 60.6),
      ] },
      { id: 'T1', herois: [
        L('狂铁', 59.2), L('武则天', 58.3), L('阿古朵', 57.3), L('小乔', 56.6),
        L('公孙离', 56.4), L('不知火舞', 56.1), L('诸葛亮', 56.1), L('赵云', 56.0),
        L('百里守约', 55.8), L('夏洛特', 55.7), L('戈娅', 55.6), L('艾琳', 55.2),
        L('苍', 54.9), L('杨玉环', 54.1), L('杨戬', 53.9), L('露娜', 53.8),
        L('蒙恬', 53.8), L('影', 53.7), L('太乙真人', 53.2), L('曹操', 53.1),
        L('韩信', 52.7), L('蛮妃', 52.5), L('孙悟空', 52.4), L('罪', 52.0),
        L('西施', 51.5), L('百里玄策', 51.4), L('貂蝉', 51.0), L('孙尚香', 50.3),
        L('哪吒', 49.6),
      ] },
      { id: 'T2', herois: [
        L('老夫子', 41.5), L('张飞', 41.3), L('李信', 41.2), L('狄仁杰', 40.1),
        L('虞姬', 40.1), L('刘邦', 39.9), L('莱西奥', 37.7), L('花木兰', 37.1),
        L('大禹', 36.8), L('弈星', 36.8), L('空空儿', 36.3), L('墨子', 36.3),
        L('孙策', 36.1), L('上官婉儿', 35.9), L('鲁班七号', 35.7), L('后羿', 35.5),
        L('铠', 35.2), L('海诺', 35.2), L('达摩', 35.1), L('橘右京', 35.1),
        L('猪八戒', 34.9), L('云缨', 34.9), L('卢雅那', 34.8), L('大司命', 34.8),
        L('甄姬', 34.7), L('雅典娜', 34.4), L('宫本武藏', 34.3), L('高渐离', 34.2),
        L('亚瑟', 34.2), L('赵怀真', 34.0), L('姬小满', 34.0), L('李白', 33.9),
        L('司马懿', 33.6), L('心魔六耳', 33.5), L('芈月', 33.0), L('元流之子(刺客)', 32.9),
        L('孙权', 32.6), L('典韦', 32.6), L('扁鹊', 32.4), L('安琪拉', 32.3),
        L('李元芳', 32.2), L('桑启', 31.8), L('瑶', 31.8), L('云中君', 31.8),
        L('周瑜', 31.8), L('曜', 31.8), L('澜', 31.6), L('朵莉亚', 31.5),
      ] },
    ],
  };

  /* Empurra a faixa para dentro do registro de cada herói que o mapa
     de nomes conseguiu identificar. Herói sem correspondência não
     recebe nada — e aparece na lista de não mapeados na tela. */
  for (const f of U.HE.TIER.faixas)
    for (const h of f.herois) {
      if (!h.id) continue;
      const rec = U.HE.porId(h.id);
      if (!rec) continue;
      U.HE.aplicarTier(h.id, { lista: f.id, pontos: h.pontos, data: U.HE.TIER.data,
                               escopo: U.HE.TIER.escopo, aviso: U.HE.TIER.avisoDaFonte,
                               conferido: false });
    }
})(window.U);
