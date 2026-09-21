/* ============================================================
   js/emblema.js — o selo de cada herói

   ISTO NÃO É A ARTE DO JOGO, E NÃO FINGE SER.

   O app não consegue baixar imagem nenhuma: o proxy desta sessão
   recusa todos os domínios de fora. Colocar um retrato genérico
   de "herói" em 117 lugares seria pior que nada — daria a impressão
   de que o app conhece a cara do personagem.

   Então cada herói ganha um SELO GERADO: uma forma geométrica
   derivada do id dele. É decoração honesta. Ela não afirma nada
   sobre o personagem; ela só faz o Nezha parecer diferente do
   Nuwa quando você passa o olho por uma lista de sessenta linhas,
   que é exatamente o trabalho que uma lista longa de texto puro
   não faz.

   Propriedades que importam:
   · determinístico — o mesmo id devolve sempre o mesmo selo;
   · distinto — hue, glifo e rotação saem de bytes diferentes do
     hash, então ids parecidos não viram selos parecidos;
   · barato — SVG inline, sem rede, sem canvas, sem arquivo;
   · legível em 22px, que é o tamanho que a lista usa.
   ============================================================ */
'use strict';
(function (U) {

  /* FNV-1a. Espalha bem para string curta e é curto de escrever. */
  function hash(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  /* Tinta por rota: o selo carrega a informação que a lista já tem,
     de graça. Quem não tem rota lida fica na tinta neutra — e isso
     é visível, que é o ponto. */
  const TINTA = {
    top:   ['#d95926', '#f08a5d'],
    selva: ['#199e70', '#3fcf9a'],
    mid:   ['#9085e9', '#b7aef5'],
    sup:   ['#c98500', '#f0b53d'],
    adc:   ['#3987e5', '#6fb0ef'],
    _:     ['#4a5570', '#6d7a99'],
  };

  const GLIFOS = [
    /* 0 losango partido */ 'M12 2 L21 12 L12 22 L3 12 Z M12 2 L12 22',
    /* 1 tridente      */ 'M5 20 L12 4 L19 20 M12 4 L12 20',
    /* 2 arco          */ 'M4 19 A11 11 0 0 1 20 19 M12 8 L12 20',
    /* 3 estrela de 4  */ 'M12 2 Q13.5 10.5 22 12 Q13.5 13.5 12 22 Q10.5 13.5 2 12 Q10.5 10.5 12 2 Z',
    /* 4 hexágono      */ 'M12 2 L20 7 L20 17 L12 22 L4 17 L4 7 Z',
    /* 5 lua           */ 'M16 3 A10 10 0 1 0 16 21 A8 8 0 1 1 16 3 Z',
    /* 6 lâmina        */ 'M6 21 L18 3 L20 8 L9 22 Z M6 21 L9 22',
    /* 7 anel duplo    */ 'M12 3 A9 9 0 1 1 11.9 3 Z M12 8 A4 4 0 1 1 11.9 8 Z',
    /* 8 raio          */ 'M13 2 L6 13 L11 13 L10 22 L18 10 L13 10 Z',
    /* 9 escudo        */ 'M12 2 L20 6 V13 Q20 19 12 22 Q4 19 4 13 V6 Z',
    /* 10 espiral      */ 'M12 22 A10 10 0 1 1 22 12 A7 7 0 1 1 12 5 A4 4 0 1 1 16 9',
    /* 11 asa          */ 'M2 16 Q10 14 12 4 Q14 14 22 16 Q14 17 12 22 Q10 17 2 16 Z',
  ];

  function rota(h) {
    const r = (h && h.role && h.role[0]) ? String(h.role[0]).toLowerCase() : null;
    if (!r) return '_';
    if (TINTA[r]) return r;
    const m = { jungle: 'selva', jungler: 'selva', solo: 'top', clash: 'top',
                mago: 'mid', meio: 'mid', suporte: 'sup', support: 'sup', roam: 'sup',
                atirador: 'adc', marksman: 'adc', farm: 'adc' };
    return m[r] || '_';
  }

  /**
   * Selo SVG de um herói.
   * @param {object} h herói (usa h.id e h.role)
   * @param {number} px lado em pixels CSS
   */
  function selo(h, px = 22) {
    const id = (h && h.id) || '?';
    const n = hash(id);
    const g = GLIFOS[n % GLIFOS.length];
    const giro = ((n >>> 8) % 4) * 90;
    const t = TINTA[rota(h)];
    const claro = ((n >>> 16) % 2) === 0;
    const uid = 'e' + (n % 100000).toString(36);
    return `<svg class="selo" width="${px}" height="${px}" viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id="${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${claro ? t[1] : t[0]}" stop-opacity=".95"/>
        <stop offset="1" stop-color="${claro ? t[0] : t[1]}" stop-opacity=".55"/>
      </linearGradient></defs>
      <rect x=".8" y=".8" width="22.4" height="22.4" rx="6.4"
            fill="rgba(10,14,22,.85)" stroke="url(#${uid})" stroke-width="1.3"/>
      <g transform="rotate(${giro} 12 12)">
        <path d="${g}" fill="none" stroke="url(#${uid})" stroke-width="1.7"
              stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>`;
  }

  /* ============================================================
     SELO DE ITEM — mesma honestidade, informação diferente

     Vale tudo o que está escrito lá em cima: o proxy não baixa
     imagem nenhuma, então o ícone real do item não existe aqui e
     este selo NÃO finge ser ele.

     A diferença é o que o desenho carrega. No herói, o glifo é
     arbitrário (só precisa distinguir um do outro). No item, o
     glifo carrega a CATEGORIA: espada é físico, tomo é mágico,
     escudo é defesa, bota é movimento, presa é selva, estandarte é
     roaming, gema é componente. Isso é informação de verdade, e é
     a que você quer de relance ao correr o olho por 119 linhas.

     Para dois itens da mesma categoria não saírem idênticos, cada
     categoria tem TRÊS variantes de glifo, e o hash do nome escolhe
     qual. A tinta também é da categoria, com claro/escuro pelo
     hash. Item sem categoria (os das suas capturas, que não vinham
     com ela) cai na tinta neutra — e isso é visível de propósito.
     ============================================================ */
  const TINTA_ITEM = {
    fisico:     ['#d9534f', '#f0847f'],
    magico:     ['#7b68ee', '#a99bf5'],
    defesa:     ['#2f9e6e', '#5bcf9a'],
    movimento:  ['#2aa3c4', '#5fd0ec'],
    selva:      ['#8a9a2b', '#b9cc55'],
    roaming:    ['#c98500', '#f0b53d'],
    componente: ['#5a6480', '#8390ad'],
    _:          ['#4a5570', '#6d7a99'],
  };

  const GLIFOS_ITEM = {
    /* espada / lâmina / machado */
    fisico: ['M12 2 L14 8 L14 17 L12 21 L10 17 L10 8 Z M7 8 L17 8',
             'M5 19 L17 4 L20 7 L8 22 Z M5 19 L8 22',
             'M12 3 L12 21 M12 5 Q19 6 19 11 Q19 15 12 14 M12 5 Q5 6 5 11 Q5 15 12 14'],
    /* tomo / orbe / cajado */
    magico: ['M5 4 H16 Q19 4 19 7 V20 H8 Q5 20 5 17 Z M8 20 Q5 20 5 17 Q5 15 8 15 H19',
             'M12 3 A9 9 0 1 1 11.9 3 Z M6 9 Q12 13 18 9 M6 15 Q12 11 18 15',
             'M17 3 L7 21 M14 4 A3 3 0 1 1 13.9 4 Z'],
    /* escudo / couraça */
    defesa: ['M12 2 L20 6 V13 Q20 19 12 22 Q4 19 4 13 V6 Z',
             'M12 2 L20 6 V13 Q20 19 12 22 Q4 19 4 13 V6 Z M12 7 V16 M8 11 H16',
             'M4 5 H20 V11 Q20 19 12 22 Q4 19 4 11 Z M4 9 H20'],
    /* bota / asa */
    movimento: ['M8 3 V12 Q8 16 12 17 H19 V21 H7 Q4 21 4 18 V3 Z',
                'M3 16 Q11 14 13 4 Q15 14 21 16 Q14 17 13 22 Q11 17 3 16 Z',
                'M6 4 L6 14 Q6 18 11 19 L19 20 M6 9 L11 9 M6 13 L10 13'],
    /* presa / garra */
    selva: ['M6 3 Q12 10 12 21 Q12 10 18 3 M9 12 H15',
            'M4 4 Q10 8 11 21 M20 4 Q14 8 13 21 M11 21 H13',
            'M12 21 Q6 14 7 3 L12 9 L17 3 Q18 14 12 21 Z'],
    /* estandarte / olho / emblema */
    roaming: ['M7 3 H17 V16 L12 13 L7 16 Z M12 16 V22',
              'M2 12 Q7 5 12 5 Q17 5 22 12 Q17 19 12 19 Q7 19 2 12 Z M12 9 A3 3 0 1 1 11.9 9 Z',
              'M12 2 L20 7 V17 L12 22 L4 17 V7 Z M12 8 L16 10.5 V15 L12 17 L8 15 V10.5 Z'],
    /* gema / fragmento */
    componente: ['M12 3 L19 9 L12 21 L5 9 Z M5 9 H19 M12 3 L12 21',
                 'M8 3 H16 L21 10 L12 21 L3 10 Z',
                 'M12 4 L18 8 L16 18 H8 L6 8 Z'],
    /* sem categoria — os itens vindos das suas capturas, que não traziam
       ela. O glifo aqui NÃO significa nada (não dá para dizer a categoria
       de um item que não a tem); ele só varia para 54 linhas seguidas não
       saírem idênticas. Quem diz "categoria não lida" é a tinta cinza. */
    _: ['M12 4 L18 8 V16 L12 20 L6 16 V8 Z',
        'M12 3 A9 9 0 1 1 11.9 3 Z M12 8 A4 4 0 1 1 11.9 8 Z',
        'M5 5 H19 V19 H5 Z M5 5 L19 19 M19 5 L5 19'],
  };

  /**
   * Selo SVG de um item. Não é o ícone do jogo — ver o comentário acima.
   * @param {object} it item do catálogo (usa it.nome e it.categoriaItem)
   * @param {number} px lado em pixels CSS
   */
  function seloItem(it, px = 22) {
    const nome = (it && it.nome) || '?';
    const cat = (it && it.categoriaItem && TINTA_ITEM[it.categoriaItem]) ? it.categoriaItem : '_';
    const n = hash(nome);
    const fam = GLIFOS_ITEM[cat] || GLIFOS_ITEM._;
    const g = fam[n % fam.length];
    const t = TINTA_ITEM[cat];
    const claro = ((n >>> 16) % 2) === 0;
    const uid = 'i' + (n % 100000).toString(36);
    return `<svg class="selo" width="${px}" height="${px}" viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id="${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${claro ? t[1] : t[0]}" stop-opacity=".95"/>
        <stop offset="1" stop-color="${claro ? t[0] : t[1]}" stop-opacity=".55"/>
      </linearGradient></defs>
      <rect x=".8" y=".8" width="22.4" height="22.4" rx="6.4"
            fill="rgba(10,14,22,.85)" stroke="url(#${uid})" stroke-width="1.3"/>
      <path d="${g}" fill="none" stroke="url(#${uid})" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  U.EM = { selo, seloItem, hash, TINTA, TINTA_ITEM, rota };
})(window.U);
