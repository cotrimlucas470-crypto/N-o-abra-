/* ============================================================
   js/mapa.js — VISÃO DE MAPA
   O minimapa, as cinco zonas de sinal e o motor do exercício.

   ------------------------------------------------------------
   O QUE ISTO É, E O QUE NÃO É

   Isto é um ESQUEMA do mapa do Honor of Kings, não uma cópia
   dele. O proxy desta sessão não baixa imagem nenhuma, então não
   existe aqui o minimapa de verdade e este desenho não finge ser
   ele. O que está correto, e é o que o treino precisa que esteja,
   são as RELAÇÕES:

     · as duas bases em cantos opostos — a sua embaixo à esquerda,
       a deles em cima à direita;
     · três rotas ligando as bases: a de cima arqueia para o canto
       superior esquerdo, a de baixo para o inferior direito, a do
       meio vai reto na diagonal;
     · o rio atravessando na perpendicular à rota do meio, do canto
       superior esquerdo ao inferior direito — e é ele, não a rota
       do meio, que separa o seu território do deles;
     · Soberano na ponta de cima do rio, Tirano na de baixo;
     · quatro áreas de selva entre as rotas: duas suas (do lado de
       baixo do rio), duas deles.

   Um pixel daqui não é um pixel do jogo. Mas "o sinal piscou na
   minha selva de baixo" é a mesma frase nos dois, e é essa frase
   que o treino está ensinando você a produzir rápido.

   ------------------------------------------------------------
   POR QUE O EXERCÍCIO É ASSIM

   Consciência de mapa não é "olhar mais o minimapa". É conseguir,
   numa relanceada de meio segundo, CODIFICAR o que apareceu e
   ainda ter aquilo na cabeça cinco segundos depois, enquanto a
   sua mão continua fazendo outra coisa. São três habilidades
   separadas, e o exercício mede as três separadas:

   1. CODIFICAR — o sinal pisca por pouco tempo (1,2 s no começo,
      menos conforme sobe a dificuldade). Piscar rápido é o que
      força a relanceada em vez do olhar parado.

   2. SEGURAR — entre o sinal e a pergunta passa um intervalo que
      o exercício controla de propósito (2,5 s / 5 s / 8 s,
      embaralhados). Isso não é enfeite: é o que permite desenhar
      a sua CURVA DE ESQUECIMENTO e dizer "aos 8 segundos você já
      perdeu metade" em vez de um "% de acerto" que mistura tudo.
      No meio desse intervalo continuam chegando outros sinais —
      a interferência é o que torna a tarefa parecida com a
      partida, onde a informação nova não espera você processar a
      velha.

   3. RELATAR — e aqui são duas perguntas, não uma, porque são
      duas memórias diferentes:
        · ONDE (você toca o mapa) devolve um ERRO CONTÍNUO em
          unidades de mapa. Certo/errado joga fora quase toda a
          informação; a distância do seu palpite até o ponto real
          separa "lembrei mal" de "não lembrei".
        · O QUÊ (você escolhe entre as cinco leituras) devolve a
          parte semântica, que decai mais devagar que a espacial.
          Quando as duas discordam — lugar certo, leitura errada,
          ou o contrário — isso vira um tipo de erro com nome.

   O relato é o único momento em que o mapa aparece grande. Durante
   a observação ele fica pequeno e no canto superior esquerdo, que
   é onde ele está no jogo; na hora de responder ele cresce e vai
   para o meio. Isso é de propósito: o que está sendo medido é a
   memória, e mapa pequeno na hora de apontar mediria também o
   tremor do seu dedo, que não interessa.

   ------------------------------------------------------------
   O QUE O EXERCÍCIO NÃO CONSEGUE MEDIR

   · Ele não sabe se você OLHOU para o minimapa. Ele sabe se você
     acertou. Alguém que fica encarando o mapa e ignora a tarefa
     secundária acerta muito e não aprende nada — por isso a
     tarefa secundária é pontuada e aparece no resultado em
     separado. Acerto alto com tarefa secundária no chão não é
     visão de mapa, é olhar parado, e o resultado diz isso.
   · Ele não mede transferência para partida. Nenhum exercício
     deste app mede. O que ele mede é se a sua memória de mapa
     está melhor do que estava, na mesma condição.
   ============================================================ */
'use strict';
(function (U) {

  /* ============================================================
     GEOMETRIA — tudo em fração 0..1 do lado do minimapa,
     x para a direita, y para BAIXO (canto 0,0 = superior esquerdo).
     ============================================================ */

  const BASE_ALIADA  = { x: 0.105, y: 0.895 };   // canto inferior esquerdo
  const BASE_INIMIGA = { x: 0.895, y: 0.105 };   // canto superior direito

  /* As três rotas, como polilinhas. A do meio é a diagonal x+y=1; as
     outras duas arqueiam para os cantos livres.

     Elas NÃO encostam nas bases, e isso não é estética. A classificação
     de um toque é por distância à forma mais próxima, então uma rota que
     entrasse na base roubaria os pontos dela: um sinal sorteado dentro
     da sua base cairia a 2% de uma rota e a 4% do centro da base, e
     seria lido como "limpando a rota". Mantendo cada rota a mais de
     duas vezes o raio da base de distância, todo ponto sorteado dentro
     da base se classifica na base. */
  const ROTA_CIMA = [[0.095, 0.755], [0.088, 0.42], [0.098, 0.20], [0.185, 0.102], [0.52, 0.088], [0.755, 0.095]];

  /* A rota de baixo é a de cima girada meia-volta em torno do centro,
     e não uma segunda lista escrita à mão. Girar o mapa 180° troca as
     duas bases de lugar; se as duas rotas não forem uma o giro da
     outra, um dos lados fica com a selva mais apertada que o outro e
     o exercício passa a ser mais difícil num canto do mapa do que no
     outro — por causa do desenho, não da sua visão. */
  const girar = (p) => p.map(([x, y]) => [+(1 - x).toFixed(4), +(1 - y).toFixed(4)]).reverse();

  const ROTAS = {
    cima: ROTA_CIMA,
    meio: [[0.200, 0.800], [0.50, 0.50], [0.800, 0.200]],
    baixo: girar(ROTA_CIMA),
  };

  /* O rio: perpendicular à rota do meio, na diagonal y=x. É ELE que
     divide os territórios — y > x é seu, y < x é deles. */
  const RIO = [[0.165, 0.165], [0.835, 0.835]];

  /** Lado do mapa a que um ponto pertence. */
  const ladoDe = (x, y) => (y > x ? 'aliado' : 'inimigo');

  /* Ligações base ↔ começo de rota. Só desenho. */
  const ENTRADAS = [];
  for (const k in ROTAS) {
    const p = ROTAS[k];
    ENTRADAS.push([BASE_ALIADA.x, BASE_ALIADA.y, p[0][0], p[0][1]]);
    ENTRADAS.push([BASE_INIMIGA.x, BASE_INIMIGA.y, p[p.length - 1][0], p[p.length - 1][1]]);
  }

  /* ============================================================
     OS ONZE OBJETIVOS

     Cada um pertence a uma das cinco zonas de sinal. A zona dá a
     COR e a leitura; o objetivo dá o detalhe — e é o detalhe que
     separa "vi amarelo" de "vi Tirano", que são coisas diferentes
     na hora de decidir se você rotaciona.

     `forma` diz como o ponto é sorteado e como um toque é medido
     até ele: 'blob' = disco em volta do centro, 'rota' = faixa ao
     longo do miolo da polilinha.
     ============================================================ */
  const OBJETIVOS = [
    /* As quatro selvas ficam nos quatro "meios de borda" do losango que
       as rotas formam. Elas são deslocadas para longe das rotas de
       propósito: um raio maior seria mais fiel ao tamanho da selva no
       jogo, mas faria parte dos sinais sorteados caírem mais perto de
       uma rota do que do próprio centro da selva — e aí um sinal de
       invasão seria lido como "limpando a rota", marcando errada uma
       resposta certa. Fidelidade que quebra a medida não vale. */
    { id: 'selva-a-cima',  zona: 'vermelho', nome: 'Sua selva · lado de cima',
      curto: 'Selva sua (cima)',  forma: 'blob', x: 0.245, y: 0.505, r: 0.070 },
    { id: 'selva-a-baixo', zona: 'vermelho', nome: 'Sua selva · lado de baixo',
      curto: 'Selva sua (baixo)', forma: 'blob', x: 0.495, y: 0.755, r: 0.070 },

    { id: 'selva-i-cima',  zona: 'azul', nome: 'Selva deles · lado de cima',
      curto: 'Selva deles (cima)',  forma: 'blob', x: 0.505, y: 0.245, r: 0.070 },
    { id: 'selva-i-baixo', zona: 'azul', nome: 'Selva deles · lado de baixo',
      curto: 'Selva deles (baixo)', forma: 'blob', x: 0.755, y: 0.495, r: 0.070 },

    { id: 'soberano', zona: 'amarelo', nome: 'Soberano', curto: 'Soberano',
      forma: 'blob', x: 0.30, y: 0.30, r: 0.055 },
    { id: 'tirano',   zona: 'amarelo', nome: 'Tirano',   curto: 'Tirano',
      forma: 'blob', x: 0.70, y: 0.70, r: 0.055 },

    { id: 'rota-cima',  zona: 'roxo', nome: 'Rota de cima',  curto: 'Rota de cima',
      forma: 'rota', rota: 'cima',  x: 0.147, y: 0.145 },
    { id: 'rota-meio',  zona: 'roxo', nome: 'Rota do meio',  curto: 'Rota do meio',
      forma: 'rota', rota: 'meio',  x: 0.50,  y: 0.50 },
    { id: 'rota-baixo', zona: 'roxo', nome: 'Rota de baixo', curto: 'Rota de baixo',
      forma: 'rota', rota: 'baixo', x: 0.853, y: 0.855 },

    { id: 'base-i', zona: 'verde', nome: 'Base deles', curto: 'Base deles',
      forma: 'blob', x: BASE_INIMIGA.x, y: BASE_INIMIGA.y, r: 0.05 },
    { id: 'base-a', zona: 'verde', nome: 'Sua base',   curto: 'Sua base',
      forma: 'blob', x: BASE_ALIADA.x,  y: BASE_ALIADA.y,  r: 0.05 },
  ];

  /* ============================================================
     AS CINCO ZONAS

     `leitura` é a frase que o sinal quer dizer. `fazer` é o que ela
     pede de você — sem isso o exercício vira jogo de memória, e a
     parte que interessa numa partida é justamente o "e daí".
     ============================================================ */
  const ZONAS = {
    vermelho: {
      id: 'vermelho', nome: 'Invasão na sua selva', cor: '#ff4d5a', corFraca: 'rgba(255,77,90,.20)',
      rotulo: 'INVASÃO', icone: '⚔',
      onde: 'no seu lado do mapa',
      leitura: 'o caçador inimigo entrou na SUA selva para roubar recurso.',
      fazer: 'Perdeu o campo e ainda deu vantagem. Alguém perto vira para contestar; ninguém perto, troca objetivo em vez de correr atrás.',
    },
    azul: {
      id: 'azul', nome: 'Farm na selva deles', cor: '#3d9dff', corFraca: 'rgba(61,157,255,.20)',
      rotulo: 'FARM', icone: '🌿',
      onde: 'no lado deles',
      leitura: 'o caçador adversário está na própria selva, fazendo o farm normal.',
      fazer: 'É a informação mais barata do jogo: enquanto ele está ali, ele NÃO está na sua rota. Essa é a janela para avançar ou fazer objetivo.',
    },
    amarelo: {
      id: 'amarelo', nome: 'Objetivo no rio', cor: '#ffc93c', corFraca: 'rgba(255,201,60,.20)',
      rotulo: 'OBJETIVO', icone: '🐲',
      onde: 'no rio',
      leitura: 'a equipe inimiga está fazendo Tirano ou Soberano.',
      fazer: 'É o único sinal com relógio correndo. Ou você chega para contestar, ou troca por algo do outro lado do mapa — ficar no meio do caminho perde as duas coisas.',
    },
    roxo: {
      id: 'roxo', nome: 'Limpando a rota', cor: '#a970ff', corFraca: 'rgba(169,112,255,.20)',
      rotulo: 'ROTA', icone: '⚑',
      onde: 'no miolo de uma rota',
      leitura: 'estão empurrando os soldados para ganhar controle de mapa.',
      fazer: 'Enquanto limpa, está preso ali e visível. Vale mais avançar em OUTRO lugar do que ir encontrar quem está empurrando.',
    },
    verde: {
      id: 'verde', nome: 'Recuo / base', cor: '#3ddc84', corFraca: 'rgba(61,220,132,.20)',
      rotulo: 'BASE', icone: '⌂',
      onde: 'numa das bases',
      leitura: 'recuaram para curar ou defender.',
      fazer: 'Vida cheia chegando em alguns segundos. Ou você usa a janela agora, ou recua antes de encontrar o time deles inteiro.',
    },
  };

  const ORDEM_ZONAS = ['vermelho', 'azul', 'amarelo', 'roxo', 'verde'];
  const porId = (id) => OBJETIVOS.find(o => o.id === id) || null;
  const daZona = (z) => OBJETIVOS.filter(o => o.zona === z);

  /* ============================================================
     DISTÂNCIA A UM OBJETIVO

     Blob é distância ao centro. Rota é distância à polilinha — e
     tem que ser à polilinha mesmo, não ao "centro da rota": a rota
     de cima é uma faixa fina colada na borda, e medir pelo centro
     faria um toque em cima dela cair na selva vizinha.
     ============================================================ */
  function distSegmento(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const L2 = vx * vx + vy * vy;
    const t = L2 ? U.clamp(((px - ax) * vx + (py - ay) * vy) / L2, 0, 1) : 0;
    return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
  }
  function distPolilinha(px, py, poly) {
    let m = Infinity;
    for (let i = 0; i + 1 < poly.length; i++) {
      m = Math.min(m, distSegmento(px, py, poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1]));
    }
    return m;
  }
  function distAte(x, y, obj) {
    return obj.forma === 'rota'
      ? distPolilinha(x, y, ROTAS[obj.rota])
      : Math.hypot(x - obj.x, y - obj.y);
  }

  /**
   * A que objetivo um ponto do mapa pertence. Sempre devolve um —
   * todo pixel do mapa é de alguém, e "nenhum" não seria resposta
   * para o palpite de ninguém.
   */
  function classificar(x, y) {
    let melhor = OBJETIVOS[0], dm = Infinity;
    for (const o of OBJETIVOS) {
      const d = distAte(x, y, o);
      if (d < dm) { dm = d; melhor = o; }
    }
    return { obj: melhor, zona: melhor.zona, dist: dm };
  }

  /* ---------- sorteio de um ponto dentro de um objetivo ---------- */
  function pontoEm(obj) {
    if (obj.forma === 'rota') {
      /* miolo da rota: onde os soldados se encontram. As pontas são
         torre e base, que são outra leitura. */
      const p = aoLongo(ROTAS[obj.rota], U.rnd(0.33, 0.67));
      const ang = Math.random() * 6.2832, raio = U.rnd(0, 0.022);
      return { x: U.clamp(p.x + Math.cos(ang) * raio, 0.04, 0.96),
               y: U.clamp(p.y + Math.sin(ang) * raio, 0.04, 0.96) };
    }
    /* disco com raiz da uniforme, senão o sorteio se acumula no meio */
    const ang = Math.random() * 6.2832, raio = obj.r * Math.sqrt(Math.random());
    return { x: U.clamp(obj.x + Math.cos(ang) * raio, 0.04, 0.96),
             y: U.clamp(obj.y + Math.sin(ang) * raio, 0.04, 0.96) };
  }

  /** Ponto a uma fração t do comprimento de uma polilinha. */
  function aoLongo(poly, t) {
    const segs = [];
    let total = 0;
    for (let i = 0; i + 1 < poly.length; i++) {
      const L = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]);
      segs.push(L); total += L;
    }
    let alvo = U.clamp(t, 0, 1) * total;
    for (let i = 0; i < segs.length; i++) {
      if (alvo <= segs[i] || i === segs.length - 1) {
        const f = segs[i] ? alvo / segs[i] : 0;
        return { x: poly[i][0] + (poly[i + 1][0] - poly[i][0]) * f,
                 y: poly[i][1] + (poly[i + 1][1] - poly[i][1]) * f };
      }
      alvo -= segs[i];
    }
    return { x: poly[0][0], y: poly[0][1] };
  }

  /** Sorteia um sinal: uma zona, um objetivo dela, um ponto nele. */
  function sortearSinal(zonasPermitidas) {
    const zs = (zonasPermitidas && zonasPermitidas.length) ? zonasPermitidas : ORDEM_ZONAS;
    const z = U.pick(zs);
    const obj = U.pick(daZona(z));
    const p = pontoEm(obj);
    return { zona: z, obj: obj.id, nome: obj.nome, x: p.x, y: p.y, cor: ZONAS[z].cor };
  }

  /* ============================================================
     PONTOS DE CENÁRIO — torres, campos de selva.
     Não entram em nenhuma resposta; existem para o mapa não ser
     um quadrado vazio, e para dar referência visual na hora de
     apontar (é mais fácil lembrar "entre a torre e o rio" do que
     um par de coordenadas — e usar referência é exatamente o que
     um jogador bom faz).
     ============================================================ */
  const TORRES = [];
  for (const [rota, ts] of [['cima', [0.20, 0.33, 0.44]], ['meio', [0.20, 0.33, 0.44]], ['baixo', [0.20, 0.33, 0.44]]]) {
    for (const t of ts) {
      TORRES.push({ ...aoLongo(ROTAS[rota], t), lado: 'aliado' });
      TORRES.push({ ...aoLongo(ROTAS[rota], 1 - t), lado: 'inimigo' });
    }
  }

  const CAMPOS = [];
  for (const o of OBJETIVOS) {
    if (o.zona !== 'vermelho' && o.zona !== 'azul') continue;
    for (const [dx, dy] of [[-0.055, -0.03], [0.05, -0.045], [0.015, 0.058], [-0.03, 0.035]]) {
      CAMPOS.push({ x: o.x + dx, y: o.y + dy, lado: o.zona === 'vermelho' ? 'aliado' : 'inimigo' });
    }
  }

  /* ============================================================
     DESENHO
     `r` é o retângulo em pixels {x,y,s} — o mapa é sempre quadrado.
     ============================================================ */
  function desenhar(c, r, est) {
    const est_ = est || {};
    const X = (u) => r.x + u * r.s, Y = (v) => r.y + v * r.s, S = (u) => u * r.s;

    c.save();
    /* moldura e recorte */
    caminhoArred(c, r.x, r.y, r.s, r.s, S(0.06));
    c.save(); c.clip();

    c.fillStyle = '#0a1a14'; c.fillRect(r.x, r.y, r.s, r.s);

    /* territórios: seu lado ganha um azul de fundo, o deles um
       vermelho. É a informação mais usada do mapa e ela não deveria
       depender de você lembrar qual canto é qual. */
    c.globalAlpha = 0.5;
    c.fillStyle = '#123049';
    c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(1), Y(1)); c.lineTo(X(0), Y(1)); c.closePath(); c.fill();
    c.fillStyle = '#3d1620';
    c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(1), Y(1)); c.lineTo(X(1), Y(0)); c.closePath(); c.fill();
    c.globalAlpha = 1;

    /* rio — estreito de propósito. Ele precisa ser reconhecível como a
       divisa entre os dois lados, mas quem tem que dominar o desenho
       são as rotas: é nelas que o olho se orienta. */
    c.strokeStyle = 'rgba(58,150,165,.34)'; c.lineWidth = S(0.070); c.lineCap = 'round';
    c.beginPath(); c.moveTo(X(RIO[0][0]), Y(RIO[0][1])); c.lineTo(X(RIO[1][0]), Y(RIO[1][1])); c.stroke();
    c.strokeStyle = 'rgba(120,225,235,.14)'; c.lineWidth = S(0.026);
    c.beginPath(); c.moveTo(X(RIO[0][0]), Y(RIO[0][1])); c.lineTo(X(RIO[1][0]), Y(RIO[1][1])); c.stroke();

    /* rotas. Os trechos entre a base e o começo de cada rota são
       desenhados à parte: eles existem para o mapa não ficar com três
       buracos em volta de cada base, e de propósito NÃO entram na
       classificação — ver o comentário em ROTAS. */
    for (const [ax, ay, bx, by] of ENTRADAS) {
      c.strokeStyle = 'rgba(196,172,110,.26)'; c.lineWidth = S(0.040); c.lineCap = 'round';
      c.beginPath(); c.moveTo(X(ax), Y(ay)); c.lineTo(X(bx), Y(by)); c.stroke();
    }
    for (const k in ROTAS) {
      tracarRota(c, ROTAS[k], X, Y, S(0.052), 'rgba(196,172,110,.34)');
      tracarRota(c, ROTAS[k], X, Y, S(0.022), 'rgba(226,206,150,.50)');
    }

    /* campos de selva */
    for (const cp of CAMPOS) {
      c.fillStyle = cp.lado === 'aliado' ? 'rgba(110,200,150,.45)' : 'rgba(210,130,130,.45)';
      c.beginPath(); c.arc(X(cp.x), Y(cp.y), S(0.011), 0, 6.2832); c.fill();
    }

    /* torres */
    for (const t of TORRES) {
      const w = S(0.026);
      c.fillStyle = t.lado === 'aliado' ? 'rgba(90,170,240,.80)' : 'rgba(240,110,110,.80)';
      c.fillRect(X(t.x) - w / 2, Y(t.y) - w / 2, w, w);
    }

    /* Soberano e Tirano */
    fosso(c, X(0.30), Y(0.30), S(0.042), '#b98cff', 'S');
    fosso(c, X(0.70), Y(0.70), S(0.042), '#ff9a3c', 'T');

    /* bases */
    cristal(c, X(BASE_ALIADA.x), Y(BASE_ALIADA.y), S(0.062), '#4da6ff');
    cristal(c, X(BASE_INIMIGA.x), Y(BASE_INIMIGA.y), S(0.062), '#ff5a5a');

    /* ANDAIME das dificuldades baixas: cada zona ganha o tom da sua
       cor no lugar onde ela acontece.

       A primeira versão escrevia o nome de cada uma por cima do mapa.
       Num minimapa de 390 px, onze rótulos se atropelam e vazam para
       fora da moldura — e o desenho que você precisa ler fica coberto
       justamente pelo texto que deveria ajudar a lê-lo. O tom faz o
       mesmo trabalho (ensinar qual parte do mapa é de que cor) sem
       tapar nada, e some sozinho quando a dificuldade sobe. Quem diz
       o nome de cada cor é a tela de leitura, que vem logo depois. */
    if (est_.rotulos) {
      c.save();
      for (const o of OBJETIVOS) {
        c.fillStyle = ZONAS[o.zona].corFraca;
        if (o.forma === 'rota') {
          const a = aoLongo(ROTAS[o.rota], 0.32), m = aoLongo(ROTAS[o.rota], 0.50), z = aoLongo(ROTAS[o.rota], 0.68);
          c.strokeStyle = ZONAS[o.zona].corFraca;
          c.lineWidth = S(0.070); c.lineCap = 'round'; c.lineJoin = 'round';
          c.beginPath(); c.moveTo(X(a.x), Y(a.y)); c.lineTo(X(m.x), Y(m.y)); c.lineTo(X(z.x), Y(z.y)); c.stroke();
        } else {
          c.beginPath(); c.arc(X(o.x), Y(o.y), S(o.r), 0, 6.2832); c.fill();
        }
      }
      c.restore();
    }

    /* sinais ativos */
    const agora = U.now();
    for (const s of (est_.sinais || [])) {
      const f = U.clamp((agora - s.t0) / s.dur, 0, 1);
      if (f >= 1) continue;
      pingar(c, X(s.x), Y(s.y), r.s, f, s.aliado ? '#d8e6ff' : s.cor, !!s.aliado);
    }

    /* marcas de retorno */
    for (const m of (est_.marcas || [])) marcar(c, X(m.x), Y(m.y), r, m);
    if (est_.linha) {
      const a = est_.linha;
      c.save();
      c.strokeStyle = 'rgba(255,255,255,.62)'; c.lineWidth = Math.max(1.2, S(0.008));
      c.setLineDash([S(0.022), S(0.018)]);
      c.beginPath(); c.moveTo(X(a.x1), Y(a.y1)); c.lineTo(X(a.x2), Y(a.y2)); c.stroke();
      c.restore();
    }

    c.restore();  /* fim do clip */

    /* moldura por cima */
    caminhoArred(c, r.x, r.y, r.s, r.s, S(0.06));
    c.strokeStyle = est_.tocavel ? 'rgba(160,210,255,.90)' : 'rgba(120,150,190,.48)';
    c.lineWidth = est_.tocavel ? 2.6 : 1.5;
    c.stroke();
    c.restore();
  }

  function tracarRota(c, poly, X, Y, larg, cor) {
    c.strokeStyle = cor; c.lineWidth = larg; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(X(poly[0][0]), Y(poly[0][1]));
    for (let i = 1; i < poly.length; i++) c.lineTo(X(poly[i][0]), Y(poly[i][1]));
    c.stroke();
  }

  function fosso(c, x, y, r, cor, letra) {
    c.save();
    c.fillStyle = 'rgba(8,14,20,.80)';
    c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
    c.strokeStyle = cor; c.lineWidth = Math.max(1.3, r * 0.26);
    c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.stroke();
    c.fillStyle = cor; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 ${Math.max(7, Math.round(r * 1.05))}px system-ui`;
    c.fillText(letra, x, y + r * 0.04);
    c.restore();
  }

  function cristal(c, x, y, r, cor) {
    c.save();
    c.fillStyle = 'rgba(6,10,16,.78)';
    c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
    c.strokeStyle = cor; c.lineWidth = Math.max(1.4, r * 0.22);
    c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.stroke();
    c.fillStyle = cor;
    c.beginPath();
    c.moveTo(x, y - r * 0.52); c.lineTo(x + r * 0.42, y); c.lineTo(x, y + r * 0.52); c.lineTo(x - r * 0.42, y);
    c.closePath(); c.fill();
    c.restore();
  }

  /** O piscar. Ponto cheio + dois anéis abrindo, sumindo no fim. */
  function pingar(c, x, y, s, f, cor, aliado) {
    c.save();
    const vida = f < 0.18 ? f / 0.18 : 1 - (f - 0.18) / 0.82;
    c.globalAlpha = U.clamp(vida, 0, 1);
    for (let k = 0; k < 2; k++) {
      const ff = U.clamp(f * 1.35 - k * 0.22, 0, 1);
      if (ff <= 0) continue;
      c.globalAlpha = U.clamp(vida, 0, 1) * (1 - ff) * 0.85;
      c.strokeStyle = cor; c.lineWidth = Math.max(1.2, s * 0.010);
      c.beginPath(); c.arc(x, y, s * (0.020 + ff * 0.070), 0, 6.2832); c.stroke();
    }
    c.globalAlpha = U.clamp(vida, 0, 1);
    c.fillStyle = cor;
    if (aliado) {
      /* sinal de aliado: losango vazado, para dar para descartar no
         canto do olho sem precisar ler a cor */
      c.strokeStyle = cor; c.lineWidth = Math.max(1.2, s * 0.009);
      const t = s * 0.030;
      c.beginPath(); c.moveTo(x, y - t); c.lineTo(x + t, y); c.lineTo(x, y + t); c.lineTo(x - t, y);
      c.closePath(); c.stroke();
    } else {
      c.beginPath(); c.arc(x, y, s * 0.024, 0, 6.2832); c.fill();
      c.globalAlpha = U.clamp(vida, 0, 1) * 0.35;
      c.beginPath(); c.arc(x, y, s * 0.045, 0, 6.2832); c.fill();
    }
    c.restore();
  }

  function marcar(c, x, y, r, m) {
    const s = r.s;
    c.save();
    const t = s * 0.030;
    if (m.tipo === 'palpite') {
      c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(1.6, s * 0.011);
      c.beginPath(); c.moveTo(x - t, y - t); c.lineTo(x + t, y + t);
      c.moveTo(x + t, y - t); c.lineTo(x - t, y + t); c.stroke();
    } else {
      c.fillStyle = m.cor || '#6ee7a8';
      c.beginPath(); c.arc(x, y, s * 0.022, 0, 6.2832); c.fill();
      c.strokeStyle = m.cor || '#6ee7a8'; c.lineWidth = Math.max(1.5, s * 0.010);
      c.beginPath(); c.arc(x, y, s * 0.052, 0, 6.2832); c.stroke();
    }
    if (m.rotulo) {
      c.font = `800 ${Math.max(7, Math.round(s * 0.052))}px system-ui`;
      c.textAlign = 'center';
      /* O rótulo é escrito dentro do mapa, que é recortado: sem prender
         o x à moldura, um ponto perto da borda sai com o nome cortado
         ao meio — que é exatamente o nome que você precisa ler. */
      const meia = c.measureText(m.rotulo).width / 2 + s * 0.02;
      const tx = U.clamp(x, r.x + meia, r.x + s - meia);
      /* e vai por cima do ponto, salvo quando o ponto está colado no
         topo do mapa e não sobra espaço lá */
      const cima = (y - r.y) > s * 0.18;
      const ty = y + (cima ? -s * 0.075 : s * 0.075);
      c.textBaseline = cima ? 'bottom' : 'top';
      c.strokeStyle = 'rgba(4,8,14,.92)'; c.lineWidth = Math.max(3, s * 0.012);
      c.strokeText(m.rotulo, tx, ty);
      c.fillStyle = '#eef4ff';
      c.fillText(m.rotulo, tx, ty);
    }
    c.restore();
  }

  function caminhoArred(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ============================================================
     PAINEL LATERAL

     A pergunta, o relógio e o retorno ficam ao LADO do mapa, nunca
     por cima. Texto sobre o mapa competiria com o próprio desenho
     que você precisa ler, e na hora de apontar tamparia parte da
     área que você tem que tocar.
     ============================================================ */
  function desenharPainel(c, cx, cy, cw, ch, p) {
    if (!p) return;
    c.save();
    c.textAlign = 'left';
    const T = Math.max(9, Math.round(ch * 0.052));

    let y = cy;
    if (p.titulo) {
      c.fillStyle = p.cor || '#e8eefc';
      c.font = `900 ${Math.round(T * 1.32)}px system-ui`;
      c.textBaseline = 'top';
      c.fillText(p.titulo, cx, y);
      y += T * 1.75;
    }

    if (p.relogio) {
      const f = U.clamp((U.now() - p.relogio.t0) / p.relogio.dur, 0, 1);
      const h = Math.max(3, ch * 0.016);
      c.fillStyle = 'rgba(255,255,255,.14)';
      c.fillRect(cx, y, cw, h);
      c.fillStyle = f > 0.75 ? '#ff5470' : f > 0.5 ? '#ffd479' : '#6ee7a8';
      c.fillRect(cx, y, cw * (1 - f), h);
      y += h + T * 0.85;
    }

    const linhas = p.linhas || [];
    for (let i = 0; i < linhas.length; i++) {
      const txt = linhas[i];
      if (!txt) { y += T * 0.55; continue; }
      const forte = p.fortes && p.fortes[i];
      c.fillStyle = (p.cores && p.cores[i]) || '#b9c8e4';
      c.font = `${forte ? 800 : 600} ${Math.round(T * (forte ? 1.04 : 0.94))}px system-ui`;
      y = quebrar(c, txt, cx, y, cw, T * 1.18);
      y += T * 0.22;
      if (y > cy + ch) break;
    }
    c.restore();
  }

  /** Escreve quebrando por palavra. Devolve o y depois da última linha. */
  function quebrar(c, txt, x, y, larg, alt) {
    const pal = String(txt).split(' ');
    let linha = '';
    for (const w of pal) {
      const teste = linha ? linha + ' ' + w : w;
      if (c.measureText(teste).width > larg && linha) {
        c.fillText(linha, x, y); y += alt; linha = w;
      } else linha = teste;
    }
    if (linha) { c.fillText(linha, x, y); y += alt; }
    return y;
  }

  /** Pontuação corrida. Fica sempre visível: o placar é o retorno
      mais barato que existe, e some da tela quando você mais precisa
      dele se ficar só na caixa de resultado do fim. */
  function desenharPlacar(c, x, y, s, pl) {
    if (!pl) return;
    c.save();
    c.textAlign = 'left'; c.textBaseline = 'top';
    const T = Math.max(9, Math.round(s * 0.085));
    c.fillStyle = '#ffd479';
    c.font = `900 ${Math.round(T * 1.18)}px system-ui`;
    c.fillText(String(pl.pontos), x, y);
    const w = c.measureText(String(pl.pontos)).width;
    c.fillStyle = '#8fa3c4';
    c.font = `700 ${Math.round(T * 0.72)}px system-ui`;
    c.fillText('pts', x + w + T * 0.28, y + T * 0.42);
    if (pl.seq >= 2) {
      c.fillStyle = '#6ee7a8';
      c.font = `800 ${Math.round(T * 0.72)}px system-ui`;
      c.fillText(`${pl.seq} seguidos`, x, y + T * 1.35);
    }
    c.restore();
  }

  /* ============================================================
     PONTUAÇÃO

     Os números não são arbitrários: cada parcela vale mais ou menos
     conforme o quanto ela diz sobre a habilidade.

     · ONDE vale mais que tudo (até 60) porque é a única parcela
       contínua — ela distingue "errei por um dedo" de "não fazia
       ideia", e as outras não.
     · ACERTAR A ZONA (20) é separado de acertar o ponto: cair na
       área certa já muda a decisão na partida, mesmo sem precisão.
     · A LEITURA (25 + até 15 por rapidez) tem bônus de tempo
       porque informação de mapa que chega tarde é informação
       perdida.
     · O OBJETIVO FINO (20) só existe a partir da dificuldade 4, e
       só conta se a leitura também estiver certa — não dá para
       estar certo sobre QUAL objetivo se você errou a categoria.
     · A TAREFA SECUNDÁRIA (4 por acerto) é pouca coisa de
       propósito. Ela não está lá para dar ponto; está lá para
       ocupar o seu olho. Quem a ignora para encarar o mapa vê isso
       no resultado, em separado.
     ============================================================ */
  const PESOS = { onde: 60, zona: 20, leitura: 25, rapidez: 15, fino: 20, secundaria: 4 };
  const TOLERANCIA = 0.30;   // acima disso o palpite não vale ponto de posição

  function pontosPosicao(erro) {
    if (erro == null) return 0;
    return Math.round(PESOS.onde * Math.max(0, 1 - erro / TOLERANCIA));
  }

  /** Como chamar um erro de posição, em português e sem inventar precisão. */
  function bandaErro(erro, zonaOk) {
    if (erro == null) return 'sem resposta';
    if (erro < 0.05) return 'no ponto';
    if (erro < 0.10) return 'muito perto';
    if (zonaOk) return 'na área certa';
    if (erro < 0.22) return 'área vizinha';
    return 'longe';
  }

  U.MP = {
    OBJETIVOS, ZONAS, ORDEM_ZONAS, ROTAS, RIO, TORRES, CAMPOS,
    BASE_ALIADA, BASE_INIMIGA, PESOS, TOLERANCIA,
    porId, daZona, classificar, distAte, distPolilinha, aoLongo, pontoEm,
    sortearSinal, ladoDe, desenhar, desenharPainel, desenharPlacar,
    pontosPosicao, bandaErro,
  };

})(window.U);
