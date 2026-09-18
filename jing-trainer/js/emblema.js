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

  U.EM = { selo, hash, TINTA, rota };
})(window.U);
