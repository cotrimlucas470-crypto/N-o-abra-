/* ============================================================
   otimiza.js — o HUD que sai dos seus dados
   ------------------------------------------------------------
   A pergunta: dado onde o seu dedo cai, o tamanho do seu contato,
   o quanto você paga por bit de dificuldade e QUAIS trajetos você
   realmente faz, existe um arranjo de botões melhor que o atual?

   O que este arquivo NÃO faz, de propósito:
   · não promete que o HUD proposto melhora o seu jogo. Ele
     minimiza um custo modelado. Modelo é modelo;
   · não move nada sozinho. Ele propõe, mostra a conta, e você
     decide — inclusive porque parte dos botões o jogo pode não
     deixar você mover para onde a conta quer;
   · não fala quando os dados não sustentam. Sem a sua reta de
     Fitts e sem nuvem medida em pelo menos meia dúzia de botões,
     a resposta é "ainda não sei", e não um layout bonito.
   ============================================================ */
'use strict';
(function (U) {

  const H = U.HUD, TQ = U.TQ, S = U.S, MM = U.HUD.TELA_MM;

  /* Quanto cada botão pode se afastar de onde está hoje (mm).
     O jogo tem limites e o seu dedo tem memória: um HUD proposto
     que joga tudo longe é inútil mesmo quando a conta fecha. */
  const DESLOC_MAX = 9;
  /* Folga mínima entre bordas. O piso real não é um número bonito: é o
     tamanho do SEU contato. Se o dedo encosta num círculo de 9 mm, dois
     botões separados por 2 mm são um botão só na prática. Quando há
     medida de contato, ela manda; senão, 3,5 mm. */
  const FOLGA_MIN = 3.5;

  /* Piso de dispersão para a conta de erro.
     A nuvem medida sai de exercício: parado, sem ninguém te matando,
     olhando para o botão. Em luta ela é maior. Usar a dispersão do
     treino faz o otimizador concluir que pode espremer tudo, porque no
     modelo o dedo nunca erra — e foi exatamente o que ele concluiu num
     teste com dedo de 0,9 mm de desvio. Este piso é suposição declarada,
     não medida, e está aqui para que ela apareça em vez de ficar
     escondida no resultado. */
  const SD_PISO = 2.0;
  const MOVEIS = ['s1', 's2', 's3', 'aa', 'flash', 'it1', 'it2', 'cura', 'volta'];

  /* ============================================================
     CUSTO
     ------------------------------------------------------------
     J = tempo esperado de trajeto  +  penalidade de erro  +  ergonomia
     Cada parcela em MILISSEGUNDOS, para que somar faça sentido:
     o erro entra como o tempo que ele custa quando acontece.
     ============================================================ */

  /** Quanto custa um toque errado, em ms. Um botão errado numa luta
      não é "mais 200 ms": é a jogada perdida. 900 ms é conservador. */
  const CUSTO_ERRO = 900;

  function frequencias({ dias = 90 } = {}) {
    const d = U.DB.load();
    const pares = d.pares || {};
    const f = {};
    let total = 0;
    for (const k in pares) {
      const [de, para] = k.split('>');
      if (!de || !para) continue;
      const n = pares[k].n || 0;
      if (!n) continue;
      f[k] = { de, para, n };
      total += n;
    }
    /* trajetos vindos do toque cru, que tem os que o par não pegou */
    for (const t of TQ.toques({ dias })) {
      if (!t.de || !t.b || t.de === t.b) continue;
      const k = t.de + '>' + t.b;
      if (!f[k]) { f[k] = { de: t.de, para: t.b, n: 0 }; }
      f[k].n += 1; total += 1;
    }
    return { pares: Object.values(f), total };
  }

  /** A nuvem do treino, alargada para o piso de luta. Ver SD_PISO. */
  function inflar(r) {
    const k = 2.4477;
    const a = Math.max(r.elipse.a, SD_PISO * k), b = Math.max(r.elipse.b, SD_PISO * k);
    if (a === r.elipse.a && b === r.elipse.b) return r;
    return { ...r, elipse: { ...r.elipse, a, b } };
  }

  function custoLayout(hud, ctx) {
    const { freq, fitts, retratos, pivo, folgaMin = FOLGA_MIN } = ctx;
    let tempo = 0, erro = 0, ergo = 0;

    /* 1) tempo de trajeto, ponderado pela frequência real */
    for (const p of freq.pares) {
      const A = hud[p.de], B = hud[p.para];
      if (!A || !B) continue;
      const amp = H.distMM(A, B), W = 2 * B.r * MM.w;
      tempo += p.n * fitts.prever(Math.max(2, amp), W);
    }

    /* 2) erro: probabilidade de o toque cair mais perto do vizinho,
          usando a nuvem medida naquele botão transportada para a
          posição proposta. É por isso que a nuvem foi guardada em
          mm — ela viaja junto com o botão. */
    for (const r of retratos) {
      const b = hud[r.id];
      if (!b) continue;
      const risco = TQ.riscoVizinho(inflar(r), hud, 320);
      if (risco) erro += (r.n || 1) * risco.p * CUSTO_ERRO;
    }

    /* 3) RESTRIÇÕES DURAS.
          Elas NÃO têm preço. A versão anterior cobrava uma multa por
          encostar um botão no outro, e a busca simplesmente pagou a
          multa: num teste ela comprou 60 ms de tempo de trajeto deixando
          a menor folga do HUD ir de 2,1 mm para -0,2 mm, ou seja,
          sobrepondo botões. Milissegundo não compra sobreposição. Layout
          que viola a restrição não é um layout caro, é um layout que não
          existe — e agora custa infinito.
          Aqui morava uma penalidade de "arco confortável do polegar",
          com um pivô e uma faixa de 42 a 78 mm escritos no código na V1
          para gerar texto de conselho. Nenhum dos três números foi medido
          em ninguém. Enquanto eram texto, eram opinião declarada. Virando
          objetivo de otimização, viravam outra coisa: com o pivô ao lado
          do botão de ataque, quase todo botão do HUD real cai ABAIXO de
          42 mm, e a penalidade empurrava o layout inteiro para fora para
          satisfazer uma régua que ninguém calibrou.
          O que o alcance tem de real já está medido em outro lugar: se
          esticar o dedo piora a sua precisão, isso aparece na nuvem
          daquele botão, e a nuvem já entra na parcela de erro. Somar uma
          penalidade inventada por cima seria contar duas vezes, sendo que
          uma delas é chute.
          Ficam as restrições duras: não encostar, não sair da tela. */
    const ids = Object.keys(hud).filter(k => hud[k].tipo !== 'joy');
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const g = H.folgaMM(hud[ids[i]], hud[ids[j]]);
        /* Catraca: onde o HUD atual já respeita a folga mínima, o proposto
           também respeita. Onde ele já está apertado demais (e o HUD real
           está, entre invocador e recuperar), o proposto no mínimo não
           aperta mais — e ganha ponto se afrouxar. */
        const piso = Math.min(folgaMin, ctx.folgaBase ? ctx.folgaBase[ids[i] + '|' + ids[j]] : folgaMin);
        if (g < piso - 1e-9) return { total: Infinity, tempo, erro, ergo: Infinity, viola: true };
        if (g < folgaMin) ergo += (folgaMin - g) * 40;    // só para desempatar
      }
    for (const id of ids) {
      const b = hud[id]; if (!b) continue;
      const ry = b.r * (MM.w / MM.h);
      if (b.x - b.r < 0.02 || b.x + b.r > 0.995) return { total: Infinity, tempo, erro, ergo: Infinity, viola: true };
      if (b.y - ry < 0.03 || b.y + ry > 0.995) return { total: Infinity, tempo, erro, ergo: Infinity, viola: true };
    }
    return { total: tempo + erro + ergo, tempo, erro, ergo, viola: false };
  }

  /* ============================================================
     BUSCA — recozimento simulado e depois polimento local
     ============================================================ */
  function copiar(hud) {
    const o = {};
    for (const k in hud) o[k] = { ...hud[k] };
    return o;
  }

  function otimizar({ dias = 90, passos = 2600, deslocMax = DESLOC_MAX, moveis = MOVEIS } = {}) {
    const base = H.getHud();
    const fitts = TQ.fitts({ dias });
    if (!fitts.ok)
      return { ok: false, motivo: `preciso da sua reta de Fitts — faltam ${fitts.falta} trajetos medidos`,
               precisa: 'fitts' };
    if (fitts.r2 < 0.18)
      return { ok: false, motivo: `a sua reta de Fitts explica só ${Math.round(fitts.r2 * 100)}% dos tempos. Sem ela, qualquer layout que eu propusesse seria chute com casas decimais`,
               precisa: 'fitts_fraco', fitts };

    const retratos = Object.keys(base).filter(k => base[k].tipo !== 'joy')
      .map(id => TQ.porBotao(id, { dias })).filter(r => r.ok);
    if (retratos.length < 5)
      return { ok: false, motivo: `preciso da nuvem de toque de pelo menos 5 botões (tenho ${retratos.length})`,
               precisa: 'nuvem', retratos };

    const freq = frequencias({ dias });
    if (freq.total < 60)
      return { ok: false, motivo: `preciso de pelo menos 60 trajetos para saber quais você realmente faz (tenho ${freq.total})`,
               precisa: 'trajetos' };

    const pv = TQ.pivoEstimado({ dias });
    const pivo = pv.ok && pv.confiavel ? pv.pivo : H.PIVO;
    const comContato = retratos.filter(r => r.contato);
    const contatoMM = comContato.length
      ? U.mean(comContato.map(r => Math.max(r.contato.rx, r.contato.ry))) : null;
    const folgaMin = contatoMM ? U.clamp(contatoMM * 0.9, FOLGA_MIN, 7) : FOLGA_MIN;
    /* folga de cada par HOJE: é o piso da catraca */
    const folgaBase = {};
    const todos = Object.keys(base).filter(k => base[k].tipo !== 'joy');
    for (let i = 0; i < todos.length; i++)
      for (let j = i + 1; j < todos.length; j++)
        folgaBase[todos[i] + '|' + todos[j]] = H.folgaMM(base[todos[i]], base[todos[j]]);
    const ctx = { freq, fitts, retratos, pivo, folgaMin, folgaBase };

    /* Limitar cada eixo por separado deixava a diagonal passar de 9 para
       12,7 mm. A restrição é de DISTÂNCIA, então é aplicada como
       distância. */
    const limitar = (b, o) => {
      const dx = (b.x - o.x) * MM.w, dy = (b.y - o.y) * MM.h;
      const d = Math.hypot(dx, dy);
      if (d <= deslocMax) return;
      const f = deslocMax / d;
      b.x = o.x + (dx * f) / MM.w;
      b.y = o.y + (dy * f) / MM.h;
    };
    const orig = copiar(base);
    let atual = copiar(base);
    let cAtual = custoLayout(atual, ctx);
    let melhor = copiar(atual), cMelhor = cAtual;
    const lista = moveis.filter(id => base[id]);

    for (let i = 0; i < passos; i++) {
      const T = 1 - i / passos;
      const temp = 0.0016 * T * T;
      const cand = copiar(atual);
      const id = lista[(Math.random() * lista.length) | 0];
      const b = cand[id], o = orig[id];
      const amp = (0.4 + 0.6 * T);
      b.x += (Math.random() - 0.5) * 0.030 * amp;
      b.y += (Math.random() - 0.5) * 0.060 * amp;
      limitar(b, o);
      const c = custoLayout(cand, ctx);
      if (!isFinite(c.total)) continue;                 // layout impossível
      const d = c.total - cAtual.total;
      if (d < 0 || Math.random() < Math.exp(-d / (Math.abs(cAtual.total) * temp + 1e-9))) {
        atual = cand; cAtual = c;
        if (c.total < cMelhor.total) { melhor = copiar(cand); cMelhor = c; }
      }
    }
    /* polimento: descidas pequenas até parar de melhorar */
    for (let r = 0; r < 4; r++) {
      let mexeu = false;
      for (const id of lista) {
        for (const [dx, dy] of [[0.004,0],[-0.004,0],[0,0.008],[0,-0.008],[0.003,0.006],[-0.003,-0.006]]) {
          const cand = copiar(melhor), b = cand[id], o = orig[id];
          b.x += dx; b.y += dy;
          limitar(b, o);
          const c = custoLayout(cand, ctx);
          if (isFinite(c.total) && c.total < cMelhor.total - 1) { melhor = cand; cMelhor = c; mexeu = true; }
        }
      }
      if (!mexeu) break;
    }

    const cBase = custoLayout(base, ctx);
    const mudancas = lista.map(id => ({
      id, nome: H.NOMES[id] || id,
      mm: Math.hypot((melhor[id].x - base[id].x) * MM.w, (melhor[id].y - base[id].y) * MM.h),
      dx: (melhor[id].x - base[id].x) * MM.w, dy: (melhor[id].y - base[id].y) * MM.h,
      de: { ...base[id] }, para: { ...melhor[id] },
    })).filter(m => m.mm >= 0.8).sort((a, b) => b.mm - a.mm);

    const nTrajetos = freq.total;
    /* ERRO DE UNIDADE, CORRIGIDO.
       A penalidade ergonômica é uma restrição em unidade arbitrária —
       ela existe para a busca não produzir layout impossível, e não quer
       dizer milissegundo nenhum. Somá-la ao tempo e dividir tudo pelo
       número de trajetos produzia uma manchete em "ms por trajeto" que
       não era ms de coisa nenhuma: num HUD que eu nem tinha estragado o
       sistema prometia 77 ms de ganho. A manchete agora sai só das duas
       parcelas que estão mesmo em milissegundos, e a ergonomia aparece
       do lado, em milímetros de folga, que é a unidade dela. */
    const ganhoTempo = (cBase.tempo - cMelhor.tempo) / Math.max(1, nTrajetos);
    const ganhoErro = (cBase.erro - cMelhor.erro) / Math.max(1, nTrajetos);
    const ganhoMs = ganhoTempo + ganhoErro;
    const menorFolga = (h) => {
      const ks = Object.keys(h).filter(k => h[k].tipo !== 'joy');
      let m = Infinity;
      for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++)
        m = Math.min(m, H.folgaMM(h[ks[i]], h[ks[j]]));
      return m;
    };
    const folga = { antes: menorFolga(base), depois: menorFolga(melhor), min: folgaMin };
    /* pares mais apertados que o dedo: achado por si só, independente de
       o otimizador propor qualquer coisa */
    const apertados = [];
    for (let i = 0; i < todos.length; i++)
      for (let j = i + 1; j < todos.length; j++) {
        const g = folgaBase[todos[i] + '|' + todos[j]];
        if (g < folgaMin) apertados.push({ a: todos[i], b: todos[j], folga: g,
          nomeA: H.NOMES[todos[i]] || todos[i], nomeB: H.NOMES[todos[j]] || todos[j],
          depois: H.folgaMM(melhor[todos[i]], melhor[todos[j]]) });
      }
    apertados.sort((x, y) => x.folga - y.folga);

    return {
      ok: true, hud: melhor, base, mudancas, pivo, pivoMedido: pv,
      custo: { base: cBase, novo: cMelhor },
      ganhoMs, ganhoTempo, ganhoErro, nTrajetos, fitts, retratos, folga, apertados,
      contatoMM, sdPiso: SD_PISO,
      /* só "vale" quando o ganho passa do próprio erro de medida da reta
         de Fitts. Abaixo disso o número existe, mas não se distingue da
         variação de um dia para o outro. */
      vale: (ganhoMs >= 8 && ganhoMs > fitts.erro * 0.25 && mudancas.length > 0) ||
            (folga.depois > folga.antes && folga.antes < folgaMin),
      incerteza: fitts.erro,
      leitura: leitura(ganhoMs, ganhoTempo, ganhoErro, fitts, mudancas, folga),
    };
  }

  function leitura(ganho, gT, gE, fitts, mud, folga) {
    const folgaTxt = (folga && folga.antes < folga.min)
      ? ` <b>Além do tempo:</b> hoje os dois botões mais próximos têm ${folga.antes.toFixed(1)} mm de folga entre as bordas, e o seu dedo encosta num círculo maior que isso — na proposta ficam ${folga.depois.toFixed(1)} mm. Esse é o tipo de conserto que não aparece em milissegundo e aparece em toque errado.`
      : '';
    if (!mud.length)
      return 'O seu HUD já está no melhor arranjo que esta conta consegue encontrar. Não é elogio: quer dizer que mexer nos botões não é o que está te segurando.';
    if (ganho < 8 || ganho <= fitts.erro * 0.25)
      return `A melhor mudança que encontrei vale cerca de ${ganho.toFixed(0)} ms por trajeto, e o seu próprio tempo varia ±${Math.round(fitts.erro)} ms de uma repetição para outra. Mexer no HUD por isso é trocar memória de dedo por ruído.${folgaTxt}`;
    const parte = gE > gT
      ? `A maior parte do ganho não é velocidade: é toque errado que deixa de acontecer (${gE.toFixed(0)} ms de ${ganho.toFixed(0)}).`
      : `A maior parte do ganho é distância percorrida (${gT.toFixed(0)} ms de ${ganho.toFixed(0)}).`;
    return `Cerca de <b>${ganho.toFixed(0)} ms por trajeto</b>, mexendo ${mud.length} ${mud.length === 1 ? 'botão' : 'botões'}. ${parte}${folgaTxt} Isto é previsão de um modelo ajustado em você, não medida: o jeito de saber se vale é mudar, treinar uma semana e comparar o tempo de rota — o sistema faz essa comparação sozinho depois que você aplicar.`;
  }

  /* ============================================================
     APLICAR — com volta atrás, porque HUD é memória muscular
     ============================================================ */
  function aplicar(novo) {
    const d = U.DB.load();
    d.hudAnterior = { hud: JSON.parse(JSON.stringify(H.getHud())), t: Date.now() };
    d.hud = JSON.parse(JSON.stringify(novo));
    d.hudMudouEm = Date.now();
    if (!Array.isArray(d.hudHist)) d.hudHist = [];
    d.hudHist.push({ t: Date.now(), hud: JSON.parse(JSON.stringify(novo)) });
    if (d.hudHist.length > 12) d.hudHist = d.hudHist.slice(-12);
    U.DB.save();
  }
  function desfazer() {
    const d = U.DB.load();
    if (!d.hudAnterior) return false;
    d.hud = JSON.parse(JSON.stringify(d.hudAnterior.hud));
    d.hudAnterior = null; d.hudMudouEm = Date.now();
    U.DB.save();
    return true;
  }

  /**
   * O HUD mudou. O que aconteceu com o tempo de rota depois?
   * É a única resposta honesta sobre se a mudança valeu — e ela
   * só existe depois de treinar com o layout novo.
   */
  function efeitoDaMudanca() {
    const d = U.DB.load();
    if (!d.hudMudouEm) return { ok: false, motivo: 'o HUD ainda não mudou desde que o sistema passou a acompanhar' };
    const antes = (d.limiar || []).filter(x => x.t < d.hudMudouEm).slice(-10).map(x => x.ms);
    const depois = (d.limiar || []).filter(x => x.t >= d.hudMudouEm).map(x => x.ms);
    if (antes.length < 4 || depois.length < 4)
      return { ok: false, motivo: `preciso de 4 sets de cada lado da mudança (tenho ${antes.length} antes e ${depois.length} depois)`,
               antes: antes.length, depois: depois.length, desde: d.hudMudouEm };
    const serie = antes.concat(depois);
    const delta = U.mean(depois) - U.mean(antes);
    const mr = S.mudancaReal(serie, delta, { n1: antes.length, n2: depois.length });
    return {
      ok: true, antes: U.mean(antes), depois: U.mean(depois), delta,
      nAntes: antes.length, nDepois: depois.length, real: mr.real, motivo: mr.motivo,
      desde: d.hudMudouEm,
      texto: mr.real
        ? (delta < 0
          ? `Depois da mudança de HUD o seu tempo de rota caiu ${Math.abs(delta).toFixed(0)} ms, e a queda passa do ruído. O layout novo está pagando.`
          : `Depois da mudança de HUD o seu tempo de rota subiu ${delta.toFixed(0)} ms, e a subida passa do ruído. Pode ser o layout, pode ser a readaptação do dedo — se não voltar ao normal em uma semana, é o layout.`)
        : `Ainda não dá para dizer se a mudança de HUD valeu: a diferença de ${delta.toFixed(0)} ms está dentro do ruído (${mr.motivo}).`,
    };
  }

  U.OT = { MOVEIS, DESLOC_MAX, FOLGA_MIN, CUSTO_ERRO, otimizar, custoLayout,
           frequencias, aplicar, desfazer, efeitoDaMudanca };

})(window.U);
