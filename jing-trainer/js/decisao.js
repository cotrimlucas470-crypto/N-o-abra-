/* ============================================================
   decisao.js — o treinador
   ------------------------------------------------------------
   A V1 escolhia o próximo exercício por soma ponderada de déficits
   em 8 eixos. Isso tem dois defeitos: os pesos eram inventados, e
   o resultado não era explicável — não dava para saber POR QUE ele
   escolheu, nem para discordar.

   Aqui é uma lista de regras avaliada em ordem. A primeira que
   dispara decide. Cada regra diz o número que a fez disparar e o
   quanto esse número é confiável. Se nenhuma regra tem dado
   suficiente, o sistema diz que está coletando, em vez de fingir
   uma recomendação informada.
   ============================================================ */
'use strict';
(function (U) {

  const S = U.S, MD = U.MD, CT = U.CT, GM = U.GM;

  /* Pisos de decisão. Cada um existe por um motivo, não por estética. */
  const PISO = {
    layoutDominante: 0.35,   // acima disso, o problema é o HUD
    pressaDominante: 0.30,
    retencaoMinima: 70,      // limite INFERIOR do intervalo, não o ponto
    leituraMinima: 55,       // acaso é 25%; 55 é o piso para chamar de leitura
    estabilidadeTeto: 22,    // CV em %
    provaValidaDias: 8,
    retencaoHoras: 20,       // intervalo mínimo para o teste medir retenção
    sessoesDia: 3,
  };

  function contexto() {
    const d = U.DB.load();
    const p = MD.painel();
    const ult = d.sessoes[d.sessoes.length - 1];
    const ultProva = (d.provas || [])[(d.provas || []).length - 1];
    const hoje = new Date().setHours(0, 0, 0, 0);
    const rotaRecente = MD.filtrar({ k: 'rota', mo: 'treino', dias: 5 });
    const ultimaRota = rotaRecente.length ? rotaRecente[rotaRecente.length - 1].t : 0;
    let ach = { ativos: [], lista: [], suspeitas: [], principal: null };
    try { ach = GM.achados({}); } catch (e) { /* sem dados ainda */ }
    return {
      d, p, ach, fase: CT.fase(), faseInfo: CT.FASES[CT.fase()],
      erros: MD.perfilErros({ dias: 14 }),
      fadiga: MD.fadiga(),
      sessoesHoje: d.sessoes.filter(s => new Date(s.t).setHours(0, 0, 0, 0) === hoje).length,
      horasUltSessao: ult ? (Date.now() - (ult.fim || ult.t)) / 3600e3 : 9999,
      horasUltRota: ultimaRota ? (Date.now() - ultimaRota) / 3600e3 : 9999,
      diasUltProva: ultProva ? (Date.now() - ultProva.t) / U.DAY : 9999,
      fezRetencaoHoje: (d.tentativas || []).some(x => x.mo === 'retencao' && new Date(x.t).setHours(0, 0, 0, 0) === hoje),
      temProva: !!ultProva,
    };
  }

  /* ------------------------------------------------------------
     As regras, em ordem. A primeira que dispara decide.
     ------------------------------------------------------------ */
  const REGRAS = [
    {
      id: 'sem_hud',
      titulo: 'Confira o HUD antes de medir qualquer coisa',
      quando: (c) => !c.d.hudConferido,
      acao: () => ({ tipo: 'hud' }),
      porque: () => 'Todos os números deste sistema saem de toques sobre a réplica do seu HUD. Se ela não bate com o seu jogo, tudo o que vier depois mede a coisa errada. É uma conferência de 30 segundos e acontece uma vez.',
      confianca: () => 'certa',
    },
    {
      id: 'fadiga',
      titulo: 'Pare por hoje',
      quando: (c) => c.fadiga.estado === 'alta',
      acao: () => ({ tipo: 'parar' }),
      porque: (c) => `${c.fadiga.txt} Repetição de baixa qualidade não é neutra: ela grava o padrão pior.`,
      confianca: (c) => c.fadiga.n >= 24 ? 'razoavel' : 'provisoria',
    },
    {
      id: 'espacamento',
      titulo: 'Volte amanhã',
      quando: (c) => c.sessoesHoje >= PISO.sessoesDia,
      acao: () => ({ tipo: 'parar' }),
      porque: (c) => `${c.sessoesHoje}ª sessão hoje. Com o mesmo tempo total, sessões espalhadas em dias diferentes retêm muito mais que empilhadas num dia. O melhor uso do seu tempo agora é fechar o app.`,
      confianca: () => 'razoavel',
    },
    {
      id: 'layout',
      titulo: 'O problema agora é o layout, não o treino',
      quando: (c) => {
        const l = c.erros.itens.find(x => x.id === 'layout');
        return l && c.erros.total >= 12 && l.lo >= PISO.layoutDominante;
      },
      acao: () => ({ tipo: 'hud' }),
      porque: (c) => {
        const l = c.erros.itens.find(x => x.id === 'layout');
        return `${Math.round(l.p * 100)}% dos seus erros recentes (intervalo ${Math.round(l.lo * 100)}–${Math.round(l.hi * 100)}%) são toques que caíram num botão colado no pretendido. Isso não melhora treinando — melhora afastando o botão. Treinar por cima disso só ensina a errar com mais confiança.`;
      },
      confianca: (c) => c.erros.nivel,
    },
    {
      id: 'prova_inicial',
      titulo: 'Prova inicial',
      quando: (c) => !c.temProva,
      acao: () => ({ tipo: 'prova' }),
      porque: () => 'Sem uma medida em condição fixa não existe linha de base, e sem linha de base "quanto voltou" não tem contra o quê comparar. A Prova não ensina nada: ela mede. Sem retorno por tentativa, sem botão aceso, sempre igual.',
      confianca: () => 'certa',
    },
    {
      id: 'retencao',
      titulo: 'Teste de retenção',
      quando: (c) => !c.fezRetencaoHoje && c.horasUltRota >= PISO.retencaoHoras && c.horasUltRota < 30 * 24,
      acao: () => ({ tipo: 'retencao' }),
      porque: (c) => `Você treinou a rota há ${Math.round(c.horasUltRota)}h. O que você fez naquele dia foi desempenho — inflado por dica na tela e repetição. O que sobrou disso só aparece agora, sem ajuda. São 15 tentativas e é a medida mais importante do sistema.`,
      confianca: () => 'certa',
    },
    {
      id: 'prova_vencida',
      titulo: 'Prova',
      quando: (c) => c.diasUltProva > PISO.provaValidaDias ||
                     (c.p.leitura.nivel === 'insuficiente' && c.p.retencao.nivel !== 'insuficiente'),
      acao: () => ({ tipo: 'prova' }),
      porque: (c) => c.diasUltProva > PISO.provaValidaDias
        ? `A última Prova foi há ${Math.round(c.diasUltProva)} dias. As medidas em condição fixa envelhecem — e comparar treino de hoje com prova de duas semanas atrás produz conclusão errada.`
        : 'Falta amostra em condição fixa para a medida de leitura. A Prova coleta isso de um jeito comparável.',
      confianca: () => 'certa',
    },
    {
      /* ------------------------------------------------------------
         TREINADOR ADVERSARIAL
         Quando o gêmeo motor encontra um padrão com amostra suficiente,
         ele passa na frente das regras genéricas de déficit: atacar a
         fraqueza identificada rende mais do que treinar o eixo que está
         numericamente mais baixo, porque o eixo baixo às vezes é
         consequência do padrão e não causa.
         ------------------------------------------------------------ */
      id: 'adversarial',
      titulo: 'Exercício montado contra a sua fraqueza',
      quando: (c) => !!(c.ach.principal && c.ach.principal.alvo),
      acao: (c) => {
        const a = c.ach.principal.alvo;
        return { tipo: 'treino', drill: a.drill, ajuste: a.ajuste };
      },
      porque: (c) => {
        const a = c.ach.principal;
        const A = U.D.AJUSTES[a.alvo.ajuste];
        return `${a.texto} ${A ? `Este bloco é montado para atacar isso: ${A.o_que}.` : ''}`;
      },
      confianca: (c) => {
        const n = c.ach.principal.n || 0;
        return n >= 40 ? 'razoavel' : n >= 20 ? 'provisoria' : 'coletando';
      },
    },
    {
      id: 'pressa',
      titulo: 'Rota — segurando o tempo',
      quando: (c) => {
        const x = c.erros.itens.find(y => y.id === 'pressa');
        return x && c.erros.total >= 10 && x.p >= PISO.pressaDominante;
      },
      acao: () => ({ tipo: 'treino', drill: 'rota' }),
      porque: (c) => {
        const x = c.erros.itens.find(y => y.id === 'pressa');
        return `${Math.round(x.p * 100)}% dos seus erros acontecem logo depois de um intervalo mais curto que o seu próprio ritmo estável. Você está tentando comprar velocidade antes de ter consistência. O controlador já devolveu o tempo; este set é para confirmar que o acerto volta.`;
      },
      confianca: (c) => c.erros.nivel === 'insuficiente' ? 'provisoria' : 'razoavel',
    },
    {
      id: 'sem_dados_execucao',
      titulo: 'Rota — coletando',
      quando: (c) => c.p.execucao.nivel === 'insuficiente',
      acao: () => ({ tipo: 'treino', drill: 'rota' }),
      porque: () => 'Ainda não há sets estáveis suficientes para dizer qual tempo de rota você sustenta. Isso não é um diagnóstico, é coleta: o sistema precisa ver a dificuldade parar de se mexer antes de afirmar qualquer coisa.',
      confianca: () => 'coletando',
    },
    {
      id: 'estabilidade',
      titulo: 'Ritmo',
      quando: (c) => c.p.estabilidade.v != null && c.p.estabilidade.hi > PISO.estabilidadeTeto,
      acao: () => ({ tipo: 'treino', drill: 'ritmo' }),
      porque: (c) => `O seu ritmo varia ${c.p.estabilidade.v}% entre repetições (intervalo ${c.p.estabilidade.lo}–${c.p.estabilidade.hi}%). Combo que sai diferente toda vez é combo que falha sob pressão. O metrônomo existe para tirar essa variação antes de qualquer aceleração.`,
      confianca: (c) => c.p.estabilidade.nivel,
    },
    {
      id: 'retencao_baixa',
      titulo: 'Rota — sem ajuda',
      quando: (c) => c.p.retencao.nivel !== 'insuficiente' && c.p.retencao.lo < PISO.retencaoMinima,
      acao: () => ({ tipo: 'treino', drill: 'rota', cfg: { ajuda: false } }),
      porque: (c) => `A rota volta em ${c.p.retencao.v}% das vezes no dia seguinte (intervalo ${c.p.retencao.lo}–${c.p.retencao.hi}%). Enquanto o limite inferior não passar de ${PISO.retencaoMinima}%, o que está sendo construído não está ficando. Treinar sem o botão aceso aproxima a prática da condição em que ela é cobrada.`,
      confianca: (c) => c.p.retencao.nivel,
    },
    {
      id: 'leitura',
      titulo: 'Leitura',
      quando: (c) => c.p.leitura.nivel !== 'insuficiente' && c.p.leitura.lo < PISO.leituraMinima,
      acao: () => ({ tipo: 'treino', drill: 'ler' }),
      porque: (c) => `Com 300 ms de informação você acerta ${c.p.leitura.v}% (intervalo ${c.p.leitura.lo}–${c.p.leitura.hi}%, acaso é 25%). Em luta a informação vem sempre incompleta, e é a leitura que decide se a mecânica vai ser usada na hora certa.`,
      confianca: (c) => c.p.leitura.nivel,
    },
    {
      id: 'aborto',
      titulo: 'Freio',
      quando: (c) => c.p.aborto.nivel === 'insuficiente' || (c.p.aborto.v != null && c.p.aborto.v > 260),
      acao: () => ({ tipo: 'treino', drill: 'frear' }),
      porque: (c) => c.p.aborto.nivel === 'insuficiente'
        ? 'Ainda não sei com quanta antecedência você consegue cancelar uma jogada. É a habilidade que mais custa vida quando falta.'
        : `O perigo precisa aparecer ${c.p.aborto.v} ms antes do toque para você conseguir soltar a jogada. Quanto maior esse número, mais cedo a luta precisa avisar — e ela raramente avisa cedo.`,
      confianca: (c) => c.p.aborto.nivel,
    },
    {
      id: 'integrar',
      titulo: 'Luta',
      quando: (c) => c.fase === 'integracao' || c.fase === 'manutencao',
      acao: () => ({ tipo: 'treino', drill: 'lutar' }),
      porque: (c) => c.p.custoDecisao.nivel === 'insuficiente'
        ? 'As três coisas sustentam o piso isoladamente. Falta descobrir quanto elas custam uma à outra quando acontecem juntas — que é como acontecem numa partida.'
        : `Quando precisa decidir junto, a sua execução cai ${c.p.custoDecisao.v} pontos (intervalo ${c.p.custoDecisao.lo}–${c.p.custoDecisao.hi}). ${c.p.custoDecisao.distinguivel ? 'Essa queda é real e é o que dá para atacar agora.' : 'Ainda não dá para dizer que essa queda é real — falta amostra.'}`,
      confianca: (c) => c.p.custoDecisao.nivel,
    },
    {
      id: 'manutencao',
      titulo: 'Rodízio',
      quando: () => true,
      acao: (c) => {
        const cands = ['rota', 'ritmo', 'ler', 'frear', 'movimento', 'carga'];
        const ultimos = (c.d.sets || []).slice(-4).map(x => x.drill);
        const livre = cands.filter(x => !ultimos.includes(x));
        return { tipo: 'treino', drill: livre[0] || cands[0] };
      },
      porque: () => 'Nenhuma medida está abaixo do piso. O sistema mantém o rodízio para não deixar nenhuma envelhecer — e o que envelhece primeiro é sempre o automatismo.',
      confianca: () => 'razoavel',
    },
  ];

  /* ------------------------------------------------------------ */
  function decidir(ctx) {
    const c = ctx || contexto();
    for (const r of REGRAS) {
      let disparou = false;
      try { disparou = r.quando(c); } catch (e) { disparou = false; }
      if (!disparou) continue;
      const acao = r.acao(c);
      if (acao.tipo === 'treino' && acao.drill) {
        acao.dif = CT.estado(acao.drill).dif;
      }
      return {
        regra: r.id, titulo: r.titulo, acao,
        porque: r.porque(c), confianca: r.confianca(c),
        fase: c.fase, faseInfo: c.faseInfo, ctx: c,
      };
    }
    return null;
  }

  /**
   * Plano da sessão. Não é uma lista fixa: cada bloco é decidido,
   * o bloco é marcado como "já visto" e a decisão roda de novo.
   * Blocos de parada encerram o plano ali mesmo.
   */
  function plano(maxBlocos = 4) {
    const c = contexto();
    const vistos = new Set();
    const out = [];
    for (let i = 0; i < maxBlocos; i++) {
      const dec = decidir(c);
      if (!dec) break;
      if (dec.acao.tipo === 'parar' || dec.acao.tipo === 'hud') { out.push(dec); break; }
      const chave = dec.acao.tipo + ':' + (dec.acao.drill || '');
      if (vistos.has(chave)) {
        c.__pular = (c.__pular || new Set()).add(dec.regra);
        const alt = alternativa(c, vistos);
        if (!alt) break;
        out.push(alt); vistos.add(alt.acao.tipo + ':' + (alt.acao.drill || ''));
        continue;
      }
      vistos.add(chave);
      out.push(dec);
      /* simula que este bloco já foi feito, para o próximo não repetir */
      if (dec.acao.tipo === 'prova') { c.temProva = true; c.diasUltProva = 0; }
      if (dec.acao.tipo === 'retencao') c.fezRetencaoHoje = true;
      if (dec.acao.tipo === 'treino') c.__feitos = (c.__feitos || []).concat(dec.acao.drill);
    }
    /* Última tentativa: só quando houve treino de verdade antes E o eixo
       de adaptação ainda tem pouca amostra. Não entra em toda sessão —
       um teste cego que vira rotina deixa de ser cego. */
    const treinos = out.filter(x => x.acao.tipo === 'treino').length;
    const adapt = MD.filtrar({ dias: 60 }).filter(x => x.x && x.x.vr && x.x.vr !== 'base').length;
    if (treinos >= 2 && adapt < 60 && !out.some(x => x.acao.tipo === 'cego')) {
      out.push({
        regra: 'final_cego', titulo: 'Última tentativa',
        acao: { tipo: 'cego' },
        porque: 'Oito situações inéditas, com a pista saliente apontando para o lado errado, sem retorno nenhum. É o bloco que separa "aprendi a regra" de "fiquei bom neste exercício". Ele não vale mais que os outros: vale como amostra do eixo de Adaptação, e só.',
        confianca: 'certa',
      });
    }
    return out;
  }

  function alternativa(c, vistos) {
    const cands = ['rota', 'ritmo', 'ler', 'frear', 'movimento', 'carga'];
    const feitos = new Set((c.__feitos || []).concat([...vistos].map(x => x.split(':')[1])));
    const livre = cands.find(x => !feitos.has(x));
    if (!livre) return null;
    return {
      regra: 'rodizio', titulo: 'Rodízio',
      acao: { tipo: 'treino', drill: livre, dif: CT.estado(livre).dif },
      porque: 'Bloco de variação para não repetir o mesmo exercício na mesma sessão.',
      confianca: 'razoavel', fase: c.fase, faseInfo: c.faseInfo,
    };
  }

  /** O que o sistema sabe e o que ainda não sabe — em uma tela. */
  function situacao() {
    const c = contexto();
    const p = c.p;
    const medidas = ['execucao', 'estabilidade', 'leitura', 'aborto', 'retencao']
      .map(k => p[k]);
    const sabendo = medidas.filter(m => m.nivel === 'razoavel' || m.nivel === 'firme');
    const coletando = medidas.filter(m => m.nivel === 'insuficiente' || m.nivel === 'provisorio');
    return {
      fase: c.fase, faseInfo: c.faseInfo,
      recuperacao: CT.recuperacao(),
      medidas, sabendo, coletando,
      fadiga: c.fadiga, erros: c.erros,
      proxima: decidir(c),
    };
  }

  U.DS = { PISO, REGRAS, contexto, decidir, plano, situacao };

})(window.U);
