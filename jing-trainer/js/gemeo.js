/* ============================================================
   gemeo.js — modelo do seu jogo
   ------------------------------------------------------------
   A V2 media cinco coisas. Media bem, mas não RELACIONAVA nada:
   sabia que a velocidade subiu e que a precisão caiu, e não sabia
   que as duas coisas eram a mesma coisa.

   Aqui ficam os ACHADOS: padrões que só existem no cruzamento de
   duas medidas. Cada achado carrega a evidência que o sustenta, o
   tamanho da amostra, e — o mais importante — o que fazer com ele.
   É o que o treinador adversarial consome para montar o exercício
   que ataca a fraqueza em vez de treinar o que já está bom.

   Regra que vale para o arquivo inteiro: um achado sem amostra
   não é achado. Ele fica listado como "suspeita" e não pode
   disparar exercício.
   ============================================================ */
'use strict';
(function (U) {

  const S = U.S, MD = U.MD;

  /* Quanta amostra cada tipo de achado precisa para virar decisão. */
  const PISO = {
    tradeoff: 6,        // sets com tempo e acerto
    instavel: 20,       // acertos com ritmo medido
    dica: 25,           // tentativas com e sem destaque
    vies: 20,           // decisões
    perturbacao: 20,    // tentativas por fator (12 não sustenta a comparação corrigida)
    variante: 15,       // tentativas por variante
    troca: 12,          // tentativas de troca de plano
    confianca: 12,
  };

  /* ============================================================
     1) TROCA VELOCIDADE ↔ PRECISÃO
     O pedido explícito: "sua velocidade aumentou 8%, porém sua
     precisão caiu 11%".
     Aviso metodológico que mudou a implementação: medidas que
     juntam velocidade e acerto num número só (escore de eficiência
     inversa, taxa de acerto por segundo) são MENOS eficientes para
     recuperar exatamente este efeito, porque compensam mudanças
     opostas. Por isso aqui as duas ficam separadas e o achado é o
     PADRÃO CONJUNTO das duas tendências.
     ============================================================ */
  function tradeoff({ drill = 'rota', dias = 30 } = {}) {
    const sets = U.DB.load().sets
      .filter(x => x.mo === 'treino' && x.medTempo && x.acc != null && (!drill || x.drill === drill))
      .filter(x => Date.now() - x.t < dias * U.DAY);
    if (sets.length < PISO.tradeoff)
      return { id: 'tradeoff', ativo: false, n: sets.length, falta: PISO.tradeoff - sets.length };

    const tempos = sets.map(x => x.medTempo);
    const accs = sets.map(x => x.acc);
    const tT = S.inclinacao(tempos), tA = S.inclinacao(accs);

    const metade = Math.floor(sets.length / 2);
    const tIni = U.median(tempos.slice(0, metade)), tFim = U.median(tempos.slice(metade));
    const aIni = U.mean(accs.slice(0, metade)), aFim = U.mean(accs.slice(metade));
    const dT = tIni > 0 ? (tFim - tIni) / tIni : 0;        // negativo = mais rápido
    const dA = aIni > 0 ? (aFim - aIni) / aIni : 0;

    const acelerou = tT.direcao === 'desce' || dT < -0.05;
    const perdeu = tA.direcao === 'desce' || dA < -0.05;
    /* os dois lados são medianas/médias de metades: o teste de ruído
       precisa saber de quantos sets cada lado saiu. */
    const nIni = metade, nFim = sets.length - metade;
    const realT = S.mudancaReal(tempos, tFim - tIni, { n1: nIni, n2: nFim });
    const realA = S.mudancaReal(accs.map(x => x * 100), (aFim - aIni) * 100, { n1: nIni, n2: nFim });

    const ativo = acelerou && perdeu && (realA.real || realT.real);
    return {
      id: 'tradeoff', ativo, n: sets.length,
      dVel: -dT, dPrec: dA,
      tendVel: tT.direcao, tendAcc: tA.direcao,
      ruidoAcc: realA.motivo,
      texto: ativo
        ? `Sua velocidade subiu ${Math.round(-dT * 100)}% e o acerto caiu ${Math.round(-dA * 100)}% no mesmo período (${sets.length} sets). Isso não é progresso: é troca. O tempo que você ganhou está sendo pago em erro.`
        : acelerou && !perdeu
          ? `Velocidade subiu ${Math.round(-dT * 100)}% sem o acerto cair. Isso é ganho de verdade.`
          : `Sem troca detectável entre velocidade e acerto (${sets.length} sets).`,
      alvo: ativo ? { drill: 'rota', ajuste: 'segurar_tempo' } : null,
    };
  }

  /* ============================================================
     2) ACERTO INSTÁVEL — o "erro fantasma"
     Um acerto com ritmo irregular não é o mesmo acerto que um
     ritmo firme: ele passou raspando e vai falhar sob pressão.
     90% de acerto com metade dos acertos instáveis não é 90%.
     ============================================================ */
  function acertoInstavel({ dias = 21 } = {}) {
    const t = MD.filtrar({ k: 'rota', dias }).filter(x => x.ok && x.x && x.x.cvi != null);
    if (t.length < PISO.instavel)
      return { id: 'instavel', ativo: false, n: t.length, falta: PISO.instavel - t.length };
    const cvs = t.map(x => x.x.cvi);
    /* Referência: o próprio jogador, MAS não por quartil.
       A primeira versão cortava no 3º quartil dele mesmo, e isso se
       anulava: por construção nunca mais de 25% dos acertos podiam
       ser instáveis, e quanto PIOR ficava o ritmo mais o corte subia
       junto — a medida escondia exatamente o que devia detectar.
       O corte agora é a mediana multiplicada, com piso absoluto: sobe
       devagar com o jogador, não acompanha a piora, e num jogador
       regular o piso segura tudo em zero. */
    const corte = Math.max(0.22, 1.6 * U.median(cvs));
    const k = cvs.filter(v => v > corte).length;
    const w = S.wilson(k, t.length);
    const ativo = w.lo > 0.20;
    return {
      id: 'instavel', ativo, n: t.length, p: w.p, lo: w.lo, hi: w.hi, corte,
      texto: ativo
        ? `${Math.round(w.p * 100)}% dos seus acertos saem com ritmo irregular (intervalo ${Math.round(w.lo * 100)}–${Math.round(w.hi * 100)}%). São acertos que passaram raspando: o número diz que deu certo, a execução diz que quase não deu.`
        : `${Math.round(w.p * 100)}% dos acertos com ritmo irregular — dentro do esperado.`,
      alvo: ativo ? { drill: 'ritmo', ajuste: 'janela_estreita' } : null,
    };
  }

  /* ============================================================
     3) DEPENDÊNCIA DA DICA VISUAL
     Compara acerto com o botão aceso contra sem. Queda grande
     significa que a rota está presa à luz na tela, não à posição.
     ============================================================ */
  function dependenciaDica({ dias = 30 } = {}) {
    const com = MD.filtrar({ k: 'rota', mo: 'treino', dias }).filter(x => x.aj);
    const sem = MD.filtrar({ k: 'rota', mo: 'treino', dias }).filter(x => !x.aj);
    const n = Math.min(com.length, sem.length);
    if (n < PISO.dica) return { id: 'dica', ativo: false, n, falta: PISO.dica - n };
    const d = S.difProporcoes(com.filter(x => x.ok).length, com.length,
                              sem.filter(x => x.ok).length, sem.length);
    const ativo = d.distinguivel && d.dif > 0.15;
    return {
      id: 'dica', ativo, n, dif: d.dif, lo: d.lo, hi: d.hi,
      texto: ativo
        ? `Com o botão aceso você acerta ${Math.round(d.dif * 100)} pontos a mais (intervalo ${Math.round(d.lo * 100)}–${Math.round(d.hi * 100)}). A rota está presa à luz na tela — e em partida não existe luz.`
        : d.distinguivel
          ? `A dica visual muda pouco o seu acerto (${Math.round(d.dif * 100)} pontos). A rota está na posição, não na luz.`
          : `Ainda não dá para dizer se a dica visual muda o seu acerto (intervalo ${Math.round(d.lo * 100)} a ${Math.round(d.hi * 100)} inclui zero).`,
      alvo: ativo ? { drill: 'rota', ajuste: 'sem_dica' } : null,
    };
  }

  /* ============================================================
     4) VIÉS DE DECISÃO — entra cedo? recua demais?
     ============================================================ */
  function viesDecisao({ dias = 30 } = {}) {
    const t = MD.filtrar({ k: 'decisao', dias }).filter(x => x.x && x.x.certa && x.x.feita);
    if (t.length < PISO.vies) return { id: 'vies', ativo: false, n: t.length, falta: PISO.vies - t.length };
    const errados = t.filter(x => !x.ok);
    const total = errados.length;
    if (!total) return { id: 'vies', ativo: false, n: t.length, texto: 'Nenhuma decisão errada no período.' };
    /* CORREÇÃO DE UMA AVALIAÇÃO FALSA.
       A primeira versão contava qual opção dominava os erros e comparava
       com 1/3. Está errado: quando você erra, a opção certa está fora,
       sobram DUAS. Um jogador sem viés nenhum acerta 50% de cada lado, e
       o teste acusava viés em quase todo mundo.
       O certo é uma taxa condicional: quantas vezes você escolheu a opção
       errando, dividido por quantas vezes ela estava disponível como erro
       (ou seja, não era a resposta certa). O acaso aí é 0,5. */
    const conta = { entrar: { k: 0, n: 0 }, esperar: { k: 0, n: 0 }, recuar: { k: 0, n: 0 } };
    for (const x of errados) {
      for (const op in conta) if (op !== x.x.certa) conta[op].n++;
      if (conta[x.x.feita]) conta[x.x.feita].k++;
    }
    const cand = Object.entries(conta).filter(([, e]) => e.n >= 8)
      .map(([op, e]) => [op, e, S.wilson(e.k, e.n, S.zParaMuitas(3))]);
    if (!cand.length) return { id: 'vies', ativo: false, n: t.length, falta: 8,
                               texto: `Só ${total} decisões erradas no período — pouco para falar em viés.` };
    const [ladoMaior, eMaior, wMaior] = cand.sort((a, b) => b[2].p - a[2].p)[0];
    const maior = [ladoMaior, eMaior.k];
    const w = wMaior;
    const ativo = w.lo > 0.5 && total >= 12;
    const nomes = { entrar: 'ENTRAR quando não era para entrar',
                    esperar: 'ESPERAR quando dava para entrar',
                    recuar: 'RECUAR quando não precisava' };
    return {
      id: 'vies', ativo, n: t.length, lado: maior[0], p: w.p, lo: w.lo, hi: w.hi, erros: total,
      texto: ativo
        ? `Quando ${nomes[maior[0]].split(' quando')[0]} estava disponível como erro, você caiu nela em ${Math.round(w.p * 100)}% das vezes (intervalo ${Math.round(w.lo * 100)}–${Math.round(w.hi * 100)}%, ${maior[1]} de ${eMaior.n}). O acaso aqui é 50%: ${nomes[maior[0]]} é um viés seu, não falta de leitura genérica.`
        : `Seus erros se dividem entre as opções disponíveis perto do acaso de 50% (${total} erros). Sem viés detectável numa direção só.`,
      alvo: ativo ? { drill: 'lutar', ajuste: 'viesar_' + maior[0] } : null,
    };
  }

  /* ============================================================
     5) SENSIBILIDADE À PERTURBAÇÃO — o "caos controlado"
     Uma variável por vez, marcada na tentativa. É isso que permite
     dizer QUAL tipo de perturbação te derruba, em vez de "você vai
     mal sob pressão".
     ============================================================ */
  const PERTURBACOES = {
    nenhuma:   { nome: 'sem perturbação' },
    ritmo:     { nome: 'ritmo diferente',     o_que: 'o tempo-alvo muda no meio do set' },
    alvo:      { nome: 'alvo diferente',      o_que: 'a rota troca de botões mantendo a estrutura' },
    ordem:     { nome: 'ordem diferente',     o_que: 'a mesma rota vem embaralhada' },
    falso:     { nome: 'estímulo falso',      o_que: 'um sinal que parece perigo e não é' },
    janela:    { nome: 'janela menor',        o_que: 'menos tempo para executar' },
    ameaca:    { nome: 'ameaça inesperada',   o_que: 'um PARAR que não estava previsto' },
    incompleta:{ nome: 'informação incompleta', o_que: 'parte da rota não é mostrada' },
  };

  function sensibilidade({ dias = 30 } = {}) {
    const t = MD.filtrar({ dias }).filter(x => x.x && x.x.pert);
    /* Base de dentro do set: as tentativas limpas dos MESMOS sets que tiveram
       perturbação. É a comparação certa — mesmo dia, mesmo cansaço, mesma
       dificuldade. Só caio para a base geral (qualquer rota de treino sem
       perturbação, de qualquer dia) quando as de dentro do set ainda são
       poucas, e nesse caso digo que a comparação atravessa dias. */
    const dentro = t.filter(x => x.x.pert === 'nenhuma');
    const geral = MD.filtrar({ k: 'rota', mo: 'treino', dias })
                    .filter(x => !x.x || !x.x.pert);
    const base = dentro.length >= 25 ? dentro : geral;
    const baseDentro = base === dentro;
    const por = {};
    for (const x of t) {
      if (x.x.pert === 'nenhuma') continue;
      const e = por[x.x.pert] || (por[x.x.pert] = { k: 0, n: 0 });
      e.k += x.ok ? 1 : 0; e.n++;
    }
    const baseW = S.wilson(base.filter(x => x.ok).length, base.length);
    /* CORREÇÃO DE UMA AVALIAÇÃO FALSA.
       Eu comparo cada perturbação contra a base e depois anuncio a PIOR.
       Com sete fatores e intervalo de 95% em cada, a chance de pelo menos
       um parecer real sem ser é de quase um terço — e o teste pegou isso
       acontecendo: uma perturbação com 6 pontos de queda verdadeira
       apareceu com 22 e foi eleita a pior. Como o vencedor é escolhido
       entre m comparações, o intervalo dele precisa ser o de m
       comparações, não o de uma. */
    const comparados = Object.values(por).filter(e => e.n >= PISO.perturbacao).length;
    const zc = S.zParaMuitas(Math.max(1, comparados));
    const itens = Object.entries(por).map(([id, e]) => {
      const w = S.wilson(e.k, e.n);
      const d = base.length >= 25 && e.n >= PISO.perturbacao
        ? S.difProporcoes(base.filter(x => x.ok).length, base.length, e.k, e.n, zc) : null;
      return {
        id, nome: (PERTURBACOES[id] || {}).nome || id, o_que: (PERTURBACOES[id] || {}).o_que,
        p: w.p, lo: w.lo, hi: w.hi, n: e.n,
        queda: d ? d.dif : null, quedaLo: d ? d.lo : null, quedaHi: d ? d.hi : null,
        real: d ? d.distinguivel && d.dif > 0 : false,
      };
    }).sort((a, b) => (b.queda ?? -1) - (a.queda ?? -1));

    const pior = itens.find(x => x.real);
    const faltando = itens.filter(x => x.n < PISO.perturbacao);
    return {
      id: 'perturbacao', ativo: !!pior, itens, base: baseW, n: t.length, pior,
      comparados, z: zc, baseDentro, baseN: base.length,
      /* medido por simulação, não estimado no olho: com 30 tentativas por
         fator este teste acusa 4% das vezes em que não há nada, e encontra
         85% das quedas de 35 pontos. Quedas de 20 pontos ele só encontra
         em metade das vezes, mesmo com 45 tentativas por fator. Está dito
         aqui para que "nenhuma perturbação detectada" não seja lido como
         "nenhuma perturbação te atrapalha". */
      poder: 'Com ~30 tentativas por fator eu encontro quedas grandes (35 pontos) em 85% dos casos e quedas médias (20 pontos) em 40%. Nada acusado não quer dizer nada acontecendo — quer dizer que nada foi grande o bastante para sobreviver à comparação de vários fatores.',
      texto: pior
        ? `A perturbação que mais te derruba é <b>${pior.nome}</b>: o acerto cai ${Math.round(pior.queda * 100)} pontos (intervalo ${Math.round(pior.quedaLo * 100)}–${Math.round(pior.quedaHi * 100)}), em ${pior.n} tentativas. ` +
          (baseDentro
            ? `A comparação é contra as tentativas limpas dos mesmos sets — mesmo dia, mesmo cansaço.`
            : `A comparação ainda é contra rotas normais de outros dias, então parte da diferença pode ser o dia e não a perturbação.`) +
          ` O intervalo já está alargado para o fato de eu ter comparado ${comparados} fatores e escolhido o pior.`
        : itens.length
          ? `Nenhuma perturbação produziu queda maior que o ruído ainda${comparados > 1 ? ` — e como comparo ${comparados} fatores e anuncio só o pior, a barra é mais alta que a de uma comparação só` : ''}.${faltando.length ? ` Faltam tentativas em: ${faltando.map(x => `${x.nome} (${x.n}/${PISO.perturbacao})`).join(', ')}.` : ''}`
          : `Nenhuma perturbação testada ainda.`,
      alvo: pior ? { drill: 'rota', ajuste: 'perturbar_' + pior.id } : null,
    };
  }

  /* ============================================================
     6) ESPELHO QUEBRADO — habilidade ou padrão decorado?
     A mesma situação com a superfície trocada. Se o desempenho
     desaba na variante, o que foi aprendido foi a superfície.
     ============================================================ */
  function padraoDecorado({ dias = 45 } = {}) {
    const t = MD.filtrar({ dias }).filter(x => x.x && x.x.vr);
    const base = t.filter(x => x.x.vr === 'base');
    const vari = t.filter(x => x.x.vr && x.x.vr !== 'base');
    const n = Math.min(base.length, vari.length);
    if (n < PISO.variante) return { id: 'decorado', ativo: false, n, falta: PISO.variante - n };
    const d = S.difProporcoes(base.filter(x => x.ok).length, base.length,
                              vari.filter(x => x.ok).length, vari.length);
    const ativo = d.distinguivel && d.dif > 0.12;
    /* por tipo de variante: qual transformação dói mais */
    const por = {};
    for (const x of vari) {
      const e = por[x.x.vr] || (por[x.x.vr] = { k: 0, n: 0 });
      e.k += x.ok ? 1 : 0; e.n++;
    }
    return {
      id: 'decorado', ativo, n, dif: d.dif, lo: d.lo, hi: d.hi,
      porVariante: Object.entries(por).map(([id, e]) => ({ id, ...S.wilson(e.k, e.n) })),
      texto: ativo
        ? `Quando a situação muda de superfície mas mantém a regra, seu acerto cai ${Math.round(d.dif * 100)} pontos (intervalo ${Math.round(d.lo * 100)}–${Math.round(d.hi * 100)}). Isso indica padrão reconhecido, não regra entendida.`
        : d.distinguivel
          ? `Variar a superfície da situação quase não muda o seu acerto (${Math.round(d.dif * 100)} pontos). O que você aprendeu é a regra.`
          : `Ainda não dá para separar habilidade de padrão decorado (intervalo ${Math.round(d.lo * 100)} a ${Math.round(d.hi * 100)} inclui zero).`,
      alvo: ativo ? { drill: 'lutar', ajuste: 'so_variantes' } : null,
    };
  }

  /* ============================================================
     7) TROCA DE PLANO
     Custo de mudar de plano no meio da execução.
     Aviso metodológico: o escore clássico de custo de troca
     (troca menos repetição) tem confiabilidade bem menor que os
     tempos brutos. Por isso o número de topo aqui é o DESEMPENHO
     NAS TENTATIVAS DE TROCA, e a diferença vem depois, com o
     intervalo à mostra.
     ============================================================ */
  function trocaPlano({ dias = 30 } = {}) {
    const t = MD.filtrar({ dias }).filter(x => x.x && x.x.sw != null);
    const troca = t.filter(x => x.x.sw === 1);
    const rep = t.filter(x => x.x.sw === 0);
    if (troca.length < PISO.troca)
      return { id: 'troca', ativo: false, n: troca.length, falta: PISO.troca - troca.length };
    const wT = S.wilson(troca.filter(x => x.ok).length, troca.length);
    const lat = troca.filter(x => x.ok && x.x.lat != null).map(x => x.x.lat);
    const latIC = lat.length >= 3 ? S.bootMediana(lat) : null;
    const d = rep.length >= 12
      ? S.difProporcoes(rep.filter(x => x.ok).length, rep.length, troca.filter(x => x.ok).length, troca.length)
      : null;
    const ativo = wT.lo < 0.55;
    return {
      id: 'troca', ativo, n: troca.length, p: wT.p, lo: wT.lo, hi: wT.hi,
      latencia: latIC ? Math.round(latIC.v) : null,
      latLo: latIC && latIC.lo != null ? Math.round(latIC.lo) : null,
      latHi: latIC && latIC.hi != null ? Math.round(latIC.hi) : null,
      custo: d ? d.dif : null, custoReal: d ? d.distinguivel : false,
      texto: `Quando o plano muda no meio, você acerta ${Math.round(wT.p * 100)}% (intervalo ${Math.round(wT.lo * 100)}–${Math.round(wT.hi * 100)}, ${troca.length} tentativas)` +
        (latIC ? `, levando ${Math.round(latIC.v)} ms para largar o plano antigo` : '') + '.' +
        (d && d.distinguivel ? ` A queda em relação às tentativas sem troca é de ${Math.round(d.dif * 100)} pontos e é real.`
         : d ? ` A queda em relação às tentativas sem troca ainda não se separa do ruído.` : ''),
      alvo: ativo ? { drill: 'lutar', ajuste: 'mais_trocas' } : null,
    };
  }

  /* ============================================================
     8) CALIBRAÇÃO DA CONFIANÇA
     ============================================================ */
  function confianca({ dias = 45 } = {}) {
    const t = MD.filtrar({ dias }).filter(x => x.x && x.x.conf != null)
      .map(x => ({ conf: x.x.conf, ok: !!x.ok }));
    const c = S.calibracao(t);
    if (!c.ok) return { id: 'confianca', ativo: false, n: c.n, falta: c.falta };
    const ativo = Math.abs(c.vies) >= 0.12;
    return {
      id: 'confianca', ativo, n: c.n, vies: c.vies, conf: c.conf, acc: c.acc,
      faixas: c.faixas, resolucao: c.resolucao, leitura: c.leitura,
      texto: ativo
        ? (c.vies > 0
          ? `Você se declara certo em ${Math.round(c.conf * 100)}% e acerta ${Math.round(c.acc * 100)}%. Confiança ${Math.round(c.vies * 100)} pontos acima do acerto — em partida isso vira entrada que não devia ter acontecido.`
          : `Você acerta ${Math.round(c.acc * 100)}% e só se declara certo em ${Math.round(c.conf * 100)}%. Insegurança ${Math.round(-c.vies * 100)} pontos abaixo do acerto — em partida isso vira janela perdida.`)
        : `Sua confiança acompanha o seu acerto (${Math.round(c.conf * 100)}% contra ${Math.round(c.acc * 100)}%). Calibrado.`,
      alvo: ativo ? { drill: 'ler', ajuste: c.vies > 0 ? 'punir_chute' : 'premiar_decisao' } : null,
    };
  }

  /* ============================================================
     ACHADOS — tudo junto, ordenado pelo que mais importa agora
     ============================================================ */
  function achados(opts = {}) {
    const lista = [tradeoff(opts), acertoInstavel(opts), dependenciaDica(opts), viesDecisao(opts),
                   sensibilidade(opts), padraoDecorado(opts), trocaPlano(opts), confianca(opts)];
    const ativos = lista.filter(x => x.ativo);
    const suspeitas = lista.filter(x => !x.ativo && x.falta);
    return { lista, ativos, suspeitas,
             principal: ativos.length ? ativos[0] : null };
  }

  U.GM = { PERTURBACOES, PISO, tradeoff, acertoInstavel, dependenciaDica, viesDecisao,
           sensibilidade, padraoDecorado, trocaPlano, confianca, achados };

})(window.U);
