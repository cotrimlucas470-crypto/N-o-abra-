/* ============================================================
   dados/herois/jing.js
   ------------------------------------------------------------
   DE ONDE VEIO CADA COISA, sem misturar.

   1) DA FONTE PRIORITÁRIA (pvp.mcxssg.net), lida nas capturas de
      tela do próprio site que você enviou. A Jing aparece lá pelo
      nome chinês 镜 ("espelho"), que bate com o epíteto do app.
      · tier list 英雄梯度榜 de 2026-09-17: T0, pontuação 78.5
      · taxa de banimento no lado azul: 23.6% (lista 高禁用率英雄)
      Esses dois números foram LIDOS, não deduzidos.

   2) DAS SUAS CAPTURAS DO APP HOK PRO (fonte secundária, marcada
      como tal): epíteto, função e as listas de counter/sinergia.

   3) NADA MAIS. O que não está aqui não está porque não foi visto.

   O QUE A FONTE PRIORITÁRIA NÃO PUBLICA
   Depois de ver o site, ficou claro que ele é uma estação de
   ESTATÍSTICA, não um guia. Combo, arcana, descrição de habilidade
   e texto de estratégia não existem lá — em nenhuma das oito
   capturas. Então esses campos não estão "faltando coletar": a
   fonte não os tem, e o app diz isso na tela em vez de deixar você
   esperando por eles.

   A PÁGINA INDIVIDUAL DA JING (hero/584) não estava entre as
   capturas — a que veio é a do 元流之子(射手). Então os números
   dela (胜率/出场率/禁用率, itens por slot, counters com amostra)
   continuam vazios até você capturar aquela página com o extrator.
   ============================================================ */
'use strict';
(function (U) {
  U.HE.registrar({
    id: 'jing',
    name: 'Jing',
    nomeCn: '镜',
    titulo: 'Miragem Partida',
    role: ['selva'],

    /* ---- lido na fonte prioritária ---- */
    tier: {
      lista: 'T0',
      pontos: 78.5,
      data: '2026-09-17',
      escopo: '全部分路 (todas as rotas)',
      aviso: 'O próprio site marca esta tier list como 算法测试中 — algoritmo em teste. O número vem com essa ressalva de origem.',
      banimentoAzul: 23.6,
    },

    /* ---- lido nas capturas do HOK PRO (fonte secundária) ---- */
    counters: {
      forteContra: [{ nome: 'Nuwa' }, { nome: 'Agu' }],
      fracoContra: [{ nome: 'Kongming' }, { nome: 'Nezha' }],
      naoLidos: [
        { slot: 'melhor alvo', porque: 'cadeado no app de origem' },
        { slot: 'melhor counter', porque: 'cadeado no app de origem' },
      ],
      nota: 'Lista sem número: o HOK PRO mostra só os nomes. A fonte prioritária dá a MESMA informação com variação de vitória e número de partidas — é ela que deve substituir isto.',
    },
    synergies: {
      bons: [{ nome: 'Mai' }, { nome: 'Lapu Lapu' }],
      nota: 'Idem: sem amostra. A fonte prioritária publica 最佳搭档 com variação e nº de partidas.',
    },
    arcana: [
      { n: 8, nome: null }, { n: 2, nome: null }, { n: 5, nome: null },
      { n: 5, nome: null }, { n: 10, nome: null },
    ],

    source: 'hokpro_captura',
    lastUpdated: '2026-09-17',
    fontes: {
      nomeCn: 'pvp.mcxssg.net',
      tier: 'pvp.mcxssg.net',
      titulo: 'hokpro_captura',
      role: 'hokpro_captura',
      counters: 'hokpro_captura',
      synergies: 'hokpro_captura',
      arcana: 'hokpro_captura',
    },
    fontesUrl: {
      nomeCn: 'https://pvp.mcxssg.net/',
      tier: 'https://pvp.mcxssg.net/',
    },
    fontesData: {
      nomeCn: '2026-09-17', tier: '2026-09-17', titulo: '2026-09-17',
      role: '2026-09-17', counters: '2026-09-17', synergies: '2026-09-17', arcana: '2026-09-17',
    },

    lacunas: {
      estatisticas: 'A página individual dela (hero/584) não estava entre as capturas enviadas. Taxa de vitória, de escolha e de banimento continuam por capturar.',
      builds: 'Item por slot com % de uso existe na fonte, mas só na página do herói — que não foi capturada. As seis peças que aparecem no HOK PRO são ícones sem nome legível, e identificar item por ícone seria inventar a build.',
      abilities: 'A fonte prioritária não publica descrição de habilidade.',
      arcanaNomes: 'Só as quantidades estavam legíveis nas capturas do HOK PRO (8, 2, 5, 5, 10). Nome da arcana não foi lido, e não foi deduzido pela cor do ícone.',
    },
    notaFonte: 'Dois números (tier T0 78.5 e banimento 23.6%) vieram da fonte prioritária pelas suas capturas do site. O resto veio do HOK PRO e está marcado assim para ser substituído.',
    alvoUrl: 'https://pvp.mcxssg.net/hero/584',
  });
})(window.U);
