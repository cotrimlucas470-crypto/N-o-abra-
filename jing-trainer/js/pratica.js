/* ============================================================
   pratica.js — treinar a coisa certa, na hora certa
   ------------------------------------------------------------
   Duas perguntas que o sistema tinha como responder e não
   respondia, porque não tinha os dados:

   1) QUAL PEDAÇO treinar. Um combo não falha por inteiro: falha
      num trajeto. Agora existe a sua reta de Fitts, e com ela dá
      para achar os trajetos que demoram MAIS DO QUE DEVIAM para
      a distância que têm — esses não são limite físico, são
      pedaço mal aprendido. É neles que repetição rende.

   2) QUANDO revisar. Espaçar rende mais que amontoar, mas "duas
      vezes por semana" é palpite. A retenção medida em função do
      tempo desde o último treino dá a SUA curva de esquecimento,
      e dela sai o intervalo em que revisar ainda é difícil (que é
      quando rende) sem já ter sido esquecido.
   ============================================================ */
'use strict';
(function (U) {

  const S = U.S, H = U.HUD, TQ = U.TQ, MD = U.MD;

  /* ============================================================
     1) OS TRAJETOS QUE CUSTAM MAIS DO QUE DEVIAM
     ============================================================ */
  const MIN_PAR = 6;

  function trajetosCaros({ dias = 60, max = 4 } = {}) {
    const f = TQ.fitts({ dias });
    if (!f.ok) return { ok: false, motivo: `preciso da sua reta de trajeto (faltam ${f.falta || 0} medidas)`, itens: [] };
    if (f.r2 < 0.18)
      return { ok: false, itens: [],
               motivo: `a sua reta de trajeto explica só ${Math.round(f.r2 * 100)}% dos tempos — sem ela eu não sei o que é "mais do que devia"` };

    /* excesso = tempo medido menos tempo previsto pela SUA reta.
       Positivo quer dizer: para a distância e o tamanho daquele botão,
       você demora mais do que demora nos outros trajetos. */
    const itens = f.pares.filter(p => p.n >= MIN_PAR).map(p => {
      const amostras = TQ.toques({ dias }).filter(t => t.de === p.de && t.b === p.para && t.mt != null && t.ok);
      const ic = amostras.length >= 5 ? S.mediaIC(amostras.map(t => t.mt)) : null;
      return {
        ...p,
        nomeDe: H.NOMES[p.de] || p.de, nomePara: H.NOMES[p.para] || p.para,
        lo: ic ? ic.lo - p.esperado : null, hi: ic ? ic.hi - p.esperado : null,
        /* só conta como caro se o intervalo inteiro estiver acima do previsto */
        real: ic ? (ic.lo - p.esperado) > 0 : false,
      };
    }).filter(p => p.excesso > 0).sort((a, b) => b.excesso - a.excesso);

    const reais = itens.filter(p => p.real).slice(0, max);
    return {
      ok: true, itens, reais, fitts: f,
      /* rotas de duas teclas para o exercício: exatamente os trajetos caros */
      rotas: reais.map(p => [p.de, p.para]),
      texto: reais.length
        ? `${reais.length} ${reais.length === 1 ? 'trajeto seu é' : 'trajetos seus são'} mais ${reais.length === 1 ? 'lento' : 'lentos'} do que a distância explica. O pior é <b>${reais[0].nomeDe} → ${reais[0].nomePara}</b>: ${Math.round(reais[0].excesso)} ms acima do previsto pela sua própria reta (intervalo ${Math.round(reais[0].lo)}–${Math.round(reais[0].hi)} ms, ${reais[0].n} medidas). Isso não é o seu dedo sendo lento: é este pedaço não estando pronto.`
        : `Nenhum trajeto seu destoa da sua própria reta. Quer dizer que o tempo que você leva entre dois botões é o tempo que a distância entre eles pede — o que sobra para melhorar está na decisão, não no percurso.`,
    };
  }

  /* ============================================================
     2) A SUA CURVA DE ESQUECIMENTO
     ------------------------------------------------------------
     Acerto em condição de referência contra horas desde o último
     treino de rota. Ajusta um decaimento e devolve o intervalo em
     que revisar ainda custa esforço — que é onde revisar rende.
     ============================================================ */
  const FAIXAS_H = [[0, 16], [16, 30], [30, 54], [54, 96], [96, 168], [168, 1e9]];

  function curvaEsquecimento({ dias = 120 } = {}) {
    const t = MD.filtrar({ k: 'rota', dias }).filter(x => x.ref && !x.aj && x.hDesde != null);
    if (t.length < 30) return { ok: false, n: t.length, falta: 30 - t.length,
      motivo: `preciso de 30 tentativas de referência com o intervalo registrado (tenho ${t.length})` };

    const faixas = FAIXAS_H.map(([a, b]) => {
      const g = t.filter(x => x.hDesde >= a && x.hDesde < b);
      const w = S.wilson(g.filter(x => x.ok).length, g.length);
      return { a, b, n: g.length, p: w.p, lo: w.lo, hi: w.hi,
               h: g.length ? U.median(g.map(x => x.hDesde)) : (a + Math.min(b, a * 2 + 24)) / 2 };
    }).filter(f => f.n >= 5);
    if (faixas.length < 3) return { ok: false, faixas, motivo: 'preciso de pelo menos 3 faixas de intervalo com amostra' };

    /* decaimento exponencial para um piso: p(h) = piso + (p0-piso)·e^(-h/tau) */
    let melhor = { sse: Infinity };
    for (let piso = 0.15; piso <= 0.75; piso += 0.05)
      for (let tau = 6; tau <= 400; tau *= 1.25) {
        let sxy = 0, sxx = 0;
        for (const f of faixas) { const e = Math.exp(-f.h / tau); sxy += e * (f.p - piso) * f.n; sxx += e * e * f.n; }
        if (sxx < 1e-9) continue;
        const A = sxy / sxx;
        let sse = 0;
        for (const f of faixas) sse += f.n * (f.p - (piso + A * Math.exp(-f.h / tau))) ** 2;
        if (sse < melhor.sse) melhor = { sse, piso, tau, A };
      }
    if (!isFinite(melhor.sse)) return { ok: false, faixas, motivo: 'não consegui ajustar a curva' };

    const prever = (h) => U.clamp(melhor.piso + melhor.A * Math.exp(-h / melhor.tau), 0, 1);
    const horasPara = (alvo) => {
      if (melhor.A <= 0) return null;
      const arg = (alvo - melhor.piso) / melhor.A;
      if (arg <= 0 || arg >= 1) return null;
      return -melhor.tau * Math.log(arg);
    };
    /* janela de revisão: entre 90% e 80% de recuperação prevista.
       Acima de 90% a revisão é fácil demais e rende pouco; abaixo de
       80% você já esqueceu e a sessão vira reaprender. */
    let jIni = horasPara(0.90), jFim = horasPara(0.80);
    /* NÃO EXTRAPOLAR ABAIXO DO OBSERVADO.
       O mesmo erro que a reta de trajeto já cometia: a curva ajustada
       continua existindo para 2 h, mas eu nunca testei você com 2 h de
       intervalo. Dizer "revise em 4 h" a partir de dados que começam em
       11 h é inventar o pedaço da curva que eu não vi. Quando a janela cai
       abaixo do menor intervalo medido, ela é reportada como "antes do que
       eu consigo medir" em vez de um número. */
    const hMin = Math.min(...faixas.map(f => f.h));
    const hMax = Math.max(...faixas.map(f => f.h));
    const foraDeAlcance = jIni != null && jIni < hMin;
    if (foraDeAlcance) jIni = hMin;
    if (jFim != null && jFim > hMax * 1.6) jFim = null;
    const agora = horasDesde();

    return {
      ok: true, n: t.length, faixas, tau: melhor.tau, piso: melhor.piso, prever,
      meiaVida: horasPara(melhor.piso + melhor.A / 2),
      janela: (jIni != null && jFim != null) ? [jIni, jFim] : null,
      horasDesde: agora,
      agoraPrevisto: agora != null ? prever(agora) : null,
      estado: (jIni == null || agora == null) ? 'indefinido'
            : agora < jIni ? 'cedo' : agora <= jFim ? 'agora' : 'tarde',
      foraDeAlcance, hMin, hMax,
      texto: (jIni != null && jFim != null)
        ? (foraDeAlcance
          ? `Pelo seu decaimento, você ainda está acima de 90% de recuperação no menor intervalo que eu já medi (<b>${Math.round(hMin)} h</b>), e cai para 80% por volta de <b>${Math.round(jFim)} h</b>. Ou seja: a janela começa em algum ponto antes de ${Math.round(hMin)} h que eu não tenho como saber — treinar com intervalos mais curtos é o que me deixaria fechar esse lado.`
          : `Pelo seu próprio decaimento, a rota fica em 90% de recuperação por volta de <b>${Math.round(jIni)} h</b> e cai para 80% por volta de <b>${Math.round(jFim)} h</b>. Revisar dentro dessa janela é o que custa esforço sem virar reaprendizado — e esforço na recuperação é o que fixa.`)
        : `Ainda não consigo fechar a janela de revisão: medi de ${Math.round(hMin)} h a ${Math.round(hMax)} h e nessa faixa o decaimento não tem forma suficiente para marcar os dois lados.`,
    };
  }

  function horasDesde() {
    const t = MD.filtrar({ k: 'rota', mo: 'treino' });
    if (!t.length) return null;
    return (Date.now() - t[t.length - 1].t) / 3600e3;
  }

  /* ============================================================
     3) O QUE ISSO VIRA NA PRÁTICA
     ============================================================ */
  function recomendacao() {
    const tc = trajetosCaros({});
    const ce = curvaEsquecimento({});
    const out = [];
    if (tc.ok && tc.reais.length)
      out.push({ tipo: 'trajeto', peso: 3, drill: 'trajeto', rotas: tc.rotas,
                 titulo: `Trajeto caro: ${tc.reais[0].nomeDe} → ${tc.reais[0].nomePara}`,
                 porque: tc.texto });
    if (ce.ok && ce.estado === 'agora')
      out.push({ tipo: 'revisao', peso: 4, drill: 'rota',
                 titulo: 'Janela de revisão aberta',
                 porque: `Faz ${Math.round(ce.horasDesde)} h desde o último treino de rota, e a sua curva diz que agora a recuperação está entre 80% e 90%. ${ce.texto}` });
    if (ce.ok && ce.estado === 'tarde')
      out.push({ tipo: 'revisao', peso: 2, drill: 'rota',
                 titulo: 'Passou da janela',
                 porque: `Faz ${Math.round(ce.horasDesde)} h. Pela sua curva você já está abaixo de 80% de recuperação, então a sessão de hoje vai ser mais reaprender do que fixar. Não é perda — é só mais cara.` });
    return { itens: out.sort((a, b) => b.peso - a.peso), trajetos: tc, esquecimento: ce };
  }

  U.PR = { MIN_PAR, trajetosCaros, curvaEsquecimento, horasDesde, recomendacao };

})(window.U);
