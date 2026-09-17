/* ============================================================
   controlador.js — dificuldade adaptativa
   ------------------------------------------------------------
   A V1 movia a dificuldade por degraus inteiros a partir de faixas
   de pontuação inventadas (>=80 sobe, <62 desce). Isso produz o
   ciclo que o jogador reclama: fácil → difícil demais → frustrante.

   Aqui a dificuldade é contínua e existe um alvo de taxa de acerto.
   O alvo de 85% vem de um resultado formal para aprendizes que
   aprendem por gradiente — derivado para decisão binária, não para
   habilidade motora, então é uma âncora e não uma lei. Ele coincide
   com a ideia de ponto ótimo de desafio: dificuldade funcional
   moderada maximiza o que dá para aprender.

   Começa mais fácil de propósito: reduzir erro na fase inicial
   produz habilidade mais resistente à fadiga e melhor retida. O
   alvo sobe de 95% para 85% conforme a execução estabiliza.
   ============================================================ */
'use strict';
(function (U) {

  const S = U.S;

  const FASES = {
    reconexao: {
      nome: 'Reconexão', alvo: 0.92,
      objetivo: 'Reencontrar a rota com pouco erro. Erro demais cedo atrapalha mais do que ensina.',
    },
    consolidacao: {
      nome: 'Consolidação', alvo: 0.85,
      objetivo: 'Repetir igual. Regularidade antes de velocidade.',
    },
    velocidade: {
      nome: 'Velocidade', alvo: 0.85,
      objetivo: 'Empurrar o limiar de tempo sem soltar o acerto.',
    },
    integracao: {
      nome: 'Integração', alvo: 0.80,
      objetivo: 'Executar decidindo. Aqui o erro faz parte: a incerteza é o conteúdo.',
    },
    manutencao: {
      nome: 'Manutenção', alvo: 0.85,
      objetivo: 'Segurar o que voltou e atacar o ponto mais fraco do dia.',
    },
  };

  const LIM = {
    difMin: 1, difMax: 10,
    passoBase: 0.85,          // ganho do controlador no primeiro set
    passoMin: 0.18,           // piso: nunca para de se ajustar
    maxPorSet: 1.4,           // trava anti-oscilação
    estavelDelta: 0.35,       // variação máxima para considerar estabilizado
    estavelSets: 3,
    nMinimo: 6,               // abaixo disso o set quase não move a dificuldade
  };

  /* ---------- estado por exercício ---------- */
  function estado(id) {
    const d = U.DB.load();
    if (!d.dif) d.dif = {};
    if (!d.dif[id]) d.dif[id] = { dif: 3, hist: [], sets: 0, travaVel: 0, melhorLimiar: null };
    const e = d.dif[id];
    if (!Array.isArray(e.hist)) e.hist = [];
    return e;
  }

  function fase() {
    const d = U.DB.load();
    return d.fase && FASES[d.fase] ? d.fase : 'reconexao';
  }
  const alvoAtual = () => FASES[fase()].alvo;

  /**
   * Ajusta a dificuldade de um exercício a partir do resultado do set.
   * Devolve o que mudou E por quê — a explicação é parte do produto.
   */
  function ajustar(drillId, { acertos, n, erros = {}, cvRitmo = null, alvo = null }) {
    const e = estado(drillId);
    const antes = e.dif;
    const meta = alvo != null ? alvo : alvoAtual();

    /* Tentativa perdida por toque em botão colado não testou a habilidade —
       testou o layout. Deixá-la na conta faz a dificuldade despencar por um
       problema que nenhuma dificuldade resolve. Ela sai do denominador do
       controlador (e continua contando no perfil de erro, onde importa). */
    const nLayout = erros.layout || 0;
    const nEfetivo = Math.max(1, n - nLayout);
    const w = S.wilson(acertos, nEfetivo);
    const taxa = w.p;
    const wBruto = S.wilson(acertos, n);

    /* passo decai com a experiência: cedo explora, depois refina */
    let passo = Math.max(LIM.passoMin, LIM.passoBase / (1 + e.sets * 0.16));
    if (n < LIM.nMinimo) passo *= 0.5;

    let delta = passo * (taxa - meta) * 10;
    let motivo;

    if (w.lo > meta) motivo = 'acerto acima do alvo com folga — sobe';
    else if (w.hi < meta) motivo = 'acerto abaixo do alvo com folga — desce';
    else { delta *= 0.45; motivo = 'acerto dentro da margem do alvo — ajuste fino'; }

    /* Pressa antes de consistência: o pedido explícito do jogador.
       Se o erro dominante é pressa, subir dificuldade só multiplica erro. */
    const totalErros = Object.values(erros).reduce((a, b) => a + b, 0);
    const fracPressa = totalErros ? (erros.pressa || 0) / totalErros : 0;
    let travou = false;
    if (fracPressa >= 0.30 && totalErros >= 3) {
      delta = Math.min(delta, -0.35);
      e.travaVel = 2;
      motivo = 'a maior parte dos erros é pressa — o tempo volta até o ritmo firmar';
      travou = true;
    } else if (e.travaVel > 0) {
      e.travaVel--;
      delta = Math.min(delta, 0);
      if (delta === 0) motivo = 'velocidade travada mais um set até a precisão confirmar';
      travou = true;
    }

    if (nLayout >= 2) {
      motivo += ` · ${nLayout} tentativa${nLayout > 1 ? 's' : ''} perdida${nLayout > 1 ? 's' : ''} por toque em botão vizinho ficou fora desta conta`;
    }

    delta = U.clamp(delta, -LIM.maxPorSet, LIM.maxPorSet);
    e.dif = U.clamp(antes + delta, LIM.difMin, LIM.difMax);
    e.sets++;
    e.hist.push({ t: Date.now(), dif: +e.dif.toFixed(2), taxa: +taxa.toFixed(3), n,
                  lo: +w.lo.toFixed(3), hi: +w.hi.toFixed(3), cv: cvRitmo });
    if (e.hist.length > 60) e.hist = e.hist.slice(-60);

    const est = estavel(drillId);
    U.DB.save();
    return { antes: +antes.toFixed(2), depois: +e.dif.toFixed(2), delta: +delta.toFixed(2),
             motivo, taxa, taxaBruta: wBruto.p, nLayout,
             ic: [w.lo, w.hi], alvo: meta, estavel: est.sim, travou };
  }

  /** Estabilizado = a dificuldade parou de se mexer E o acerto bate o alvo. */
  function estavel(drillId) {
    const e = estado(drillId);
    const h = e.hist.slice(-LIM.estavelSets - 1);
    if (h.length <= LIM.estavelSets) return { sim: false, motivo: 'poucos sets' };
    let maxD = 0;
    for (let i = 1; i < h.length; i++) maxD = Math.max(maxD, Math.abs(h[i].dif - h[i - 1].dif));
    const k = h.reduce((s, x) => s + Math.round(x.taxa * x.n), 0);
    const n = h.reduce((s, x) => s + x.n, 0);
    const w = S.wilson(k, n);
    const meta = alvoAtual();
    const dentro = w.lo <= meta && w.hi >= meta;
    return {
      sim: maxD <= LIM.estavelDelta && dentro && n >= S.MIN.proporcao.decidir,
      maxD, n, ic: [w.lo, w.hi], dentro,
      motivo: maxD > LIM.estavelDelta ? 'dificuldade ainda se mexendo'
            : !dentro ? 'acerto ainda fora da margem do alvo'
            : n < S.MIN.proporcao.decidir ? 'ainda faltam tentativas para ter certeza'
            : 'estabilizado',
    };
  }

  /* ------------------------------------------------------------
     LIMIAR — o número que vira a medida "Execução".
     Registrado só quando o set foi estável: um limiar tirado de um
     set instável não significa nada.
     ------------------------------------------------------------ */
  function registrarLimiar(drillId, alvoMs, taxa, n) {
    const est = estavel(drillId);
    if (!est.sim) return null;
    const d = U.DB.load();
    if (!d.limiar) d.limiar = [];
    const ult = d.limiar[d.limiar.length - 1];
    if (ult && Date.now() - ult.t < 6 * 3600e3 && ult.drill === drillId) return null;
    const reg = { t: Date.now(), drill: drillId, ms: Math.round(alvoMs), taxa: +taxa.toFixed(2), n };
    d.limiar.push(reg);
    if (d.limiar.length > 80) d.limiar = d.limiar.slice(-80);
    const e = estado(drillId);
    if (e.melhorLimiar == null || alvoMs < e.melhorLimiar) e.melhorLimiar = Math.round(alvoMs);
    U.DB.save();
    return reg;
  }

  /* ------------------------------------------------------------
     FASE — decidida pelas MEDIDAS, não por pontos acumulados.
     É isto que responde "quanto da minha Jing voltou?" sem contar
     dias: a fase de recuperação termina quando a retenção sustenta
     o limite inferior, não quando passa uma semana.
     ------------------------------------------------------------ */
  function avaliarFase() {
    const p = U.MD.painel();
    const d = U.DB.load();
    const antes = fase();
    let nova = antes, porque = '';

    const retOk = p.retencao.n >= S.MIN.proporcao.decidir && p.retencao.lo >= 70;
    const retMedida = p.retencao.n >= S.MIN.proporcao.explorar;
    const estOk = p.estabilidade.v != null && p.estabilidade.hi <= 22;
    const execMedida = p.execucao.nivel !== 'insuficiente';
    const leituraOk = p.leitura.n >= S.MIN.proporcao.decidir && p.leitura.lo >= 55;

    if (!retMedida || !execMedida) {
      nova = 'reconexao';
      porque = 'Ainda não há medida de retenção nem limiar de execução. Primeiro descobrir o que voltou.';
    } else if (!retOk || !estOk) {
      nova = 'consolidacao';
      porque = !retOk
        ? `A retenção ainda não sustenta o piso: ${p.retencao.v}% com intervalo de ${p.retencao.lo}% a ${p.retencao.hi}%. Enquanto o limite inferior não passar de 70%, acelerar é construir sobre areia.`
        : `A variação do ritmo ainda pode chegar a ${p.estabilidade.hi}%. Regularidade antes de velocidade.`;
    } else if (!leituraOk) {
      nova = 'velocidade';
      porque = 'Execução retida e estável. Agora dá para empurrar o limiar de tempo e trabalhar leitura.';
    } else {
      nova = 'integracao';
      porque = 'Execução, estabilidade e leitura sustentam os pisos isoladamente. O que falta é fazer as três ao mesmo tempo.';
    }

    if (nova !== antes) {
      d.fase = nova;
      if (!d.faseHist) d.faseHist = [];
      d.faseHist.push({ t: Date.now(), de: antes, para: nova, porque });
      U.DB.save();
      return { mudou: true, de: antes, para: nova, porque };
    }
    return { mudou: false, fase: nova, porque };
  }

  /** "Quanto da minha Jing voltou?" — uma resposta, com incerteza. */
  function recuperacao() {
    const p = U.MD.painel();
    const d = U.DB.load();
    const base = d.baseRecuperacao;

    if (p.retencao.nivel === 'insuficiente' || !base) {
      return {
        estado: 'medindo',
        texto: base
          ? `Faltam ${Math.max(0, S.MIN.proporcao.explorar - p.retencao.n)} tentativas de retenção para a primeira estimativa.`
          : 'A primeira Prova ainda não foi feita. Sem uma linha de base, "quanto voltou" não tem contra o quê comparar.',
        pct: null,
      };
    }
    const agora = p.retencao.v, lo = p.retencao.lo, hi = p.retencao.hi;
    const pronto = lo >= 70 && p.retencao.nivel !== 'insuficiente' && p.retencao.nivel !== 'provisorio';
    return {
      estado: pronto ? 'recuperado' : 'em_curso',
      pct: agora, lo, hi, n: p.retencao.n, nivel: p.retencao.nivel,
      base: base.retencao,
      execAgora: p.execucao.v, execBase: base.execucao,
      texto: pronto
        ? `A rota base volta em ${agora}% das vezes no dia seguinte, sem ajuda (intervalo ${lo}–${hi}%). Isso é recuperação, não desempenho de treino.`
        : `${agora}% da rota base volta no dia seguinte (intervalo ${lo}–${hi}%). ${lo < 70 ? 'O limite inferior ainda não passou de 70%, então ainda não dá para dizer que voltou.' : ''}`,
    };
  }

  function definirBase() {
    const d = U.DB.load();
    if (d.baseRecuperacao) return d.baseRecuperacao;
    const p = U.MD.painel();
    if (p.retencao.nivel === 'insuficiente' && p.execucao.nivel === 'insuficiente') return null;
    d.baseRecuperacao = { t: Date.now(), retencao: p.retencao.v, execucao: p.execucao.v, leitura: p.leitura.v };
    U.DB.save();
    return d.baseRecuperacao;
  }

  U.CT = { FASES, LIM, estado, fase, alvoAtual, ajustar, estavel,
           registrarLimiar, avaliarFase, recuperacao, definirBase };

})(window.U);
