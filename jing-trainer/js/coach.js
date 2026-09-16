/* ============================================================
   coach.js — o treinador
   Responde, a cada momento: "qual é o maior problema AGORA e
   qual exercício é o mais eficiente para corrigi-lo?"
   ============================================================ */
'use strict';
(function (U) {

  const M = U.M, D = U.D;

  /* ============================================================
     NÍVEIS DE RECUPERAÇÃO
     Sete, e cada um existe por um motivo mecânico diferente.
     Nenhum deles é decorativo.
     ============================================================ */
  const NIVEIS = [
    { n: 1, id: 'RECONEXAO', nome: 'Reconexão', lema: 'Reencontrar o HUD',
      porque: 'Depois de um mês, o que some primeiro não é a rota — é a certeza de onde o botão está. Aqui só se treina onde o dedo encosta.',
      porta: { precisao: 62, consistencia: 50 } },
    { n: 2, id: 'ESTABILIZACAO', nome: 'Estabilização', lema: 'Repetir igual',
      porque: 'Antes de acelerar é preciso parar de oscilar. Combo que varia é combo que falha justo na luta que importa.',
      porta: { consistencia: 68, precisao: 68 } },
    { n: 3, id: 'AUTOMATIZACAO', nome: 'Automatização', lema: 'Executar sem gastar atenção',
      porque: 'Uma rota que você executa PENSANDO trava quando a luta exige que você pense em outra coisa. Aqui a rota desce para o automático.',
      porta: { automatismo: 65, consistencia: 70 } },
    { n: 4, id: 'VELOCIDADE', nome: 'Velocidade', lema: 'Acelerar sem quebrar',
      porque: 'Só agora vale empurrar o tempo. Antes disso, velocidade só multiplica erro.',
      porta: { velocidade: 70, precisao: 72 } },
    { n: 5, id: 'PRESSAO', nome: 'Pressão', lema: 'Aguentar a luta',
      porque: 'Ruído, mudança repentina, sinal de perigo e consequência. A mecânica precisa sobreviver ao ambiente.',
      porta: { reflexo: 70, freio: 65 } },
    { n: 6, id: 'INTEGRACAO', nome: 'Integração', lema: 'Mão e cabeça juntas',
      porque: 'Executar certo a jogada errada continua sendo perder. Aqui a decisão pesa mais que a mecânica.',
      porta: { decisao: 72, media: 74 } },
    { n: 7, id: 'DOMINIO', nome: 'Domínio', lema: 'Manter e ultrapassar',
      porque: 'Recuperado. A partir daqui o sistema mantém o que já existe e ataca só o ponto mais fraco do dia.',
      porta: null },
  ];
  const nivelInfo = (n) => NIVEIS[U.clamp(n, 1, 7) - 1];

  /* Alvo esperado de cada eixo no nível atual. */
  function alvoEixo(eixo, nivel) {
    const base = Math.min(88, 48 + nivel * 6);
    for (let i = 0; i < nivel && i < NIVEIS.length; i++) {
      const p = NIVEIS[i].porta;
      if (p && p[eixo] != null) return Math.max(base, p[eixo]);
    }
    const prox = nivelInfo(nivel).porta;
    if (prox && prox[eixo] != null) return prox[eixo];
    return base;
  }

  /* ---------- estado por exercício ---------- */
  function estadoDrill(id) {
    const d = U.DB.load();
    if (!d.drills[id]) d.drills[id] = { dif: 3, scores: [], ultimo: 0, melhor: 0, sets: 0, travaVel: 0 };
    const e = d.drills[id];
    if (e.travaVel == null) e.travaVel = 0;
    return e;
  }

  /** Piso pessoal de intervalo entre toques: abaixo disso é pressa, não velocidade. */
  function pisoIki() {
    const sets = U.DB.load().sets.filter(s => s.ikis && s.ikis.length).slice(-14);
    const todos = sets.flatMap(s => s.ikis);
    if (todos.length < 12) return 110;
    return U.clamp(U.median(todos) * 0.55, 85, 220);
  }

  /* ============================================================
     ROTAS ATIVAS — quais rotas da Jing entram no treino de hoje
     Regra: no máximo 3 por sessão. Recuperar tudo ao mesmo tempo
     é a forma mais rápida de não recuperar nada.
     ============================================================ */
  function rotasAtivas(nivel = nivelAtual()) {
    const rotas = D.getRotas('jing');
    const mec = U.DB.load().mecanicas;
    const teto = nivel <= 1 ? 2 : nivel <= 3 ? 4 : nivel <= 5 ? 6 : 7;
    const disp = rotas.filter(r => r.prio <= teto);
    const pontua = (r) => {
      const m = mec[r.id];
      if (!m) return 100 - r.prio;                     // nunca medida: prioridade alta
      const peso = { perdida: 160, errando: 140, consciente: 120, instavel: 110, lenta: 90, automatica: 15 };
      return (peso[m.estado] ?? 80) - r.prio * 2;
    };
    return disp.sort((a, b) => pontua(b) - pontua(a)).slice(0, 3).map(r => r.id);
  }

  /* ============================================================
     NÍVEL
     ============================================================ */
  function nivelAtual() { return U.clamp(U.DB.load().nivel || 1, 1, 7); }

  function checarNivel() {
    const d = U.DB.load();
    const v = M.valores();
    let subiu = null;
    while (d.nivel < 7) {
      const p = nivelInfo(d.nivel).porta;
      if (!p) break;
      const media = U.mean(M.EIXO_IDS.map(k => v[k]));
      let ok = true;
      for (const k in p) {
        if (k === 'media') { if (media < p[k]) ok = false; }
        else if (v[k] < p[k]) ok = false;
      }
      // exige lastro mínimo de amostras para não subir de nível por sorte
      const amostras = U.DB.load().sets.length;
      if (ok && amostras >= d.nivel * 4) { d.nivel++; subiu = d.nivel; } else break;
    }
    // Luna abre quando a Jing está estável o bastante para dividir atenção
    if (!d.lunaLiberada && d.nivel >= 4 && v.precisao >= 68 && v.consistencia >= 68) {
      d.lunaLiberada = true;
    }
    U.DB.save();
    return subiu;
  }

  function faltaParaSubir() {
    const d = U.DB.load(), v = M.valores();
    const p = nivelInfo(d.nivel).porta;
    if (!p) return [];
    const media = U.mean(M.EIXO_IDS.map(k => v[k]));
    const falta = [];
    for (const k in p) {
      const atual = k === 'media' ? media : v[k];
      if (atual < p[k]) falta.push({ eixo: k, atual: Math.round(atual), alvo: p[k] });
    }
    return falta;
  }

  /* ============================================================
     AVALIAR UM SET
     ============================================================ */
  function avaliarSet(drill, g, cfgUsada) {
    const motor = motorPontuacao(drill, cfgUsada);
    const { score, parciais } = M.pontuar(motor, g, cfgUsada);
    const est = estadoDrill(drill.id);
    const difAntes = est.dif;
    const erros = g.contagemErros();
    const dom = g.erroDominante();

    /* --- freio de velocidade: precisão manda, sempre --- */
    let ajuste = 0, nota = '';
    if (score >= 92 && est.dif < 10) { ajuste = 2; nota = 'salto de dificuldade'; }
    else if (score >= 80 && est.dif < 10) { ajuste = 1; nota = 'subiu de dificuldade'; }
    else if (score >= 62) { ajuste = 0; nota = 'mantém a dificuldade'; }
    else { ajuste = -1; nota = 'baixou a dificuldade'; }

    const erroPressa = (erros.velocidade || 0) + (erros.antecipado || 0);
    if (erroPressa >= Math.max(2, g.n * 0.2) && g.acuracia < 0.80) {
      ajuste = Math.min(ajuste, -1);
      est.travaVel = 2;
      nota = 'freio de velocidade: a pressa está gerando erro, voltando o tempo';
    } else if (est.travaVel > 0) {
      est.travaVel--;
      ajuste = Math.min(ajuste, 0);
      if (ajuste === 0) nota = 'velocidade travada até a precisão estabilizar';
    }
    if ((erros.hud || 0) >= Math.max(2, g.n * 0.25)) {
      nota += ' · maioria dos erros veio do layout, não da sua mão';
    }

    est.dif = U.clamp(est.dif + ajuste, 1, 10);
    est.scores.push(score);
    if (est.scores.length > 30) est.scores = est.scores.slice(-30);
    est.melhor = Math.max(est.melhor || 0, score);
    est.ultimo = Date.now();
    est.sets = (est.sets || 0) + 1;

    M.aplicarSet(drill.treina, score, U.clamp(g.n / 10, 0.5, 1.2));

    const rec = {
      t: Date.now(), drill: drill.id, nome: drill.nome, heroi: drill.heroi || 'jing',
      dif: difAntes, difNova: est.dif, score, parciais,
      n: g.n, ok: g.acertos, acc: g.acuracia,
      erros, dom,
      rtMed: U.median(g.rts()), totalMed: U.median(g.totais()),
      cvInt: g.cvInterno(), cvExt: g.cvExterno(),
      prec: U.mean(g.precisoes()),
      ikis: g.ikisTodos().slice(0, 60),
      carga: cfgUsada.dupla ? 1 : 0,
      rotas: [...new Set(g.tentativas.map(t => t.alvo).filter(Boolean))],
      nota,
    };
    M.salvarSet(rec);
    atualizarPares(g);
    atualizarMecanicas(g, cfgUsada, score);
    const subiu = checarNivel();

    return { score, parciais, nota, difAntes, difNova: est.dif, rec, subiu, dom, erros };
  }

  function motorPontuacao(drill, cfg) {
    if (drill.motor !== 'sequencia') return drill.motor;
    if (cfg.freio) return 'freio';
    if (cfg.modo === 'compasso') return 'compasso';
    if (cfg.mover) return 'rastreio';
    return 'sequencia';
  }

  /** Tabela de percursos: quais transições do SEU HUD estão lentas. */
  function atualizarPares(g) {
    const d = U.DB.load();
    for (const t of g.tentativas) {
      if (!t.ok || !t.alvo || !t.iki) continue;
      const p = t.alvo.split('>');
      for (let i = 0; i < t.iki.length && i + 1 < p.length; i++) {
        const k = `${p[i]}>${p[i + 1]}`;
        const e = d.pares[k] || (d.pares[k] = { n: 0, med: 0, ult: 0 });
        e.med = e.n ? (e.med * e.n + t.iki[i]) / (e.n + 1) : t.iki[i];
        e.n++; e.ult = t.iki[i];
      }
    }
    U.DB.save();
  }

  /** Classificação de ferrugem por rota. */
  function atualizarMecanicas(g, cfg, score) {
    const d = U.DB.load();
    const porRota = {};
    for (const t of g.tentativas) {
      if (!t.alvo || t.alvo === 'decisao' || t.alvo === 'freio') continue;
      (porRota[t.alvo] || (porRota[t.alvo] = [])).push(t);
    }
    const todas = D.getRotas('jing').concat(D.getRotas('luna'));
    for (const chave in porRota) {
      const ts = porRota[chave];
      if (ts.length < 3) continue;
      const rota = todas.find(r => r.seq.join('>') === chave);
      if (!rota) continue;
      const acc = ts.filter(t => t.ok).length / ts.length;
      const ikis = ts.filter(t => t.ok && t.iki).flatMap(t => t.iki);
      const cvR = ikis.length >= 3 ? U.cv(U.trimmed(ikis, 0.1)) : 0.2;
      const alvoT = cfg.alvoMs || (rota.seq.length * 260);
      const totals = ts.filter(t => t.ok && t.total).map(t => t.total);
      const tempoRel = totals.length ? U.median(totals) / alvoT : 1;

      const prev = d.mecanicas[rota.id] || {};
      let queda = prev.quedaCarga ?? null;
      if (cfg.dupla) {
        const solo = prev.accSolo;
        if (solo != null && solo > 0) queda = U.clamp((solo - acc) / solo, -0.2, 1);
      } else {
        prev.accSolo = acc;
      }
      const erroDom = (() => {
        const c = {}; for (const t of ts) if (!t.ok && t.erro) c[t.erro] = (c[t.erro] || 0) + 1;
        let m = null, mv = 0; for (const k in c) if (c[k] > mv) { mv = c[k]; m = k; }
        return m;
      })();

      const estado = M.classificar({ acc, cvRitmo: cvR, tempoRel, quedaCarga: queda, erroDominante: erroDom });
      d.mecanicas[rota.id] = {
        ...prev, estado, acc, cv: cvR, tempoRel, quedaCarga: queda,
        erroDom, score, atualizado: Date.now(), nome: rota.nome,
      };
    }
    U.DB.save();
  }

  /* ============================================================
     ESCOLHA DO PRÓXIMO EXERCÍCIO
     ============================================================ */
  function candidatos() {
    const n = nivelAtual(), d = U.DB.load();
    return D.DRILLS.filter(dr => {
      if (dr.heroi === 'luna') return d.lunaLiberada && d.focoLuna;
      if (d.focoLuna) return false;
      return dr.fase <= n;
    });
  }

  function deficits() {
    const n = nivelAtual(), v = M.valores(), s = M.getSkills();
    const out = {};
    for (const k of M.EIXO_IDS) {
      const alvo = alvoEixo(k, n);
      const falta = Math.max(0, alvo - v[k]);
      const conf = s[k].conf;
      const parado = U.clamp(U.daysSince(s[k].ultimo || Date.now()) / 3, 0, 1.2);
      out[k] = {
        valor: v[k], alvo,
        bruto: falta,
        peso: falta / 40 + (1 - conf) * 0.55 + parado * 0.35,
      };
    }
    return out;
  }

  function proximo() {
    const d = U.DB.load();
    const def = deficits();
    const ultimos = d.sets.slice(-3).map(s => s.drill);
    const n = nivelAtual();
    const lista = candidatos();
    if (!lista.length) return null;

    let melhor = null, melhorP = -Infinity, motivoEixo = null;
    for (const dr of lista) {
      const est = estadoDrill(dr.id);
      let p = 0, topo = null, topoV = 0;
      for (const k in dr.treina) {
        const c = (def[k]?.peso || 0) * dr.treina[k];
        p += c;
        if (c > topoV) { topoV = c; topo = k; }
      }
      p *= (dr.fase === n) ? 1.18 : (dr.fase === n - 1 ? 1.0 : 0.82);
      if (!est.sets) p *= 1.35;                                   // nunca feito: precisamos de dado
      if (ultimos[ultimos.length - 1] === dr.id) p *= 0.45;       // não repetir em sequência
      else if (ultimos.includes(dr.id)) p *= 0.72;
      const dias = est.ultimo ? U.daysSince(est.ultimo) : 9;
      p *= 1 + U.clamp(dias / 6, 0, 0.5);
      const ult = est.scores.slice(-1)[0];
      if (ult != null && ult < 55) p *= 1.25;                      // ficou pendente: volta
      if (p > melhorP) { melhorP = p; melhor = dr; motivoEixo = topo; }
    }

    const est = estadoDrill(melhor.id);
    const dEixo = def[motivoEixo];
    const motivo = dEixo
      ? `Maior buraco agora: ${M.EIXOS[motivoEixo].nome} (${Math.round(dEixo.valor)} de ${dEixo.alvo}). Este exercício ataca isso de frente.`
      : 'Próximo passo da fase atual.';
    return { drill: melhor, dif: est.dif, motivo, eixo: motivoEixo };
  }

  /** Fila sugerida da sessão: 4 a 6 exercícios sem repetir. */
  function fila(tamanho = 5) {
    const out = [];
    const usados = new Set();
    const def = deficits();
    const n = nivelAtual();
    const lista = candidatos().slice();
    const pont = (dr) => {
      let p = 0;
      for (const k in dr.treina) p += (def[k]?.peso || 0) * dr.treina[k];
      p *= (dr.fase === n) ? 1.18 : (dr.fase === n - 1 ? 1.0 : 0.8);
      if (!estadoDrill(dr.id).sets) p *= 1.3;
      return p;
    };
    const ordenada = lista.sort((a, b) => pont(b) - pont(a));
    for (const dr of ordenada) {
      if (out.length >= tamanho) break;
      if (usados.has(dr.id)) continue;
      usados.add(dr.id);
      out.push({ drill: dr, dif: estadoDrill(dr.id).dif });
    }
    // garante ao menos um exercício de decisão quando o nível permite
    if (n >= 5 && !out.some(o => o.drill.motor === 'prioridade' || o.drill.motor === 'cenario')) {
      const dec = ordenada.find(dr => dr.motor === 'prioridade' || dr.motor === 'cenario');
      if (dec) out[out.length - 1] = { drill: dec, dif: estadoDrill(dec.id).dif };
    }
    return out;
  }

  /* ============================================================
     DIAGNÓSTICO
     ============================================================ */
  function diagnosticar(provas) {
    // provas: [{id, g, cfg}]
    const byId = {};
    for (const p of provas) byId[p.id] = p;

    const eixos = {};
    const notas = {};

    /* d1 — precisão e localização */
    if (byId.d1) {
      const g = byId.d1.g;
      const prec = U.mean(g.precisoes());
      const rt = U.median(g.rts());
      eixos.precisao = Math.round(U.clamp(prec * 118 - 8, 5, 100));
      notas.precisao = `Encosta a ${Math.round(prec * 100)}% do centro; localiza um botão em ${Math.round(rt)}ms.`;
      const porBotao = {};
      for (const t of g.tentativas) {
        const k = t.alvo;
        (porBotao[k] || (porBotao[k] = [])).push(t);
      }
      notas.botoes = Object.entries(porBotao).map(([k, ts]) => ({
        botao: k,
        acc: ts.filter(t => t.ok).length / ts.length,
        prec: U.mean(ts.filter(t => t.precisao != null).map(t => t.precisao)),
        rt: U.median(ts.filter(t => t.ok && t.rt != null).map(t => t.rt)),
      })).sort((a, b) => (a.prec || 0) - (b.prec || 0));
    }

    /* d2 — velocidade de percurso */
    if (byId.d2) {
      const g = byId.d2.g;
      const ikis = g.ikisTodos();
      const med = U.median(ikis) || 500;
      eixos.velocidade = Math.round(M.notaTempo(med, 230, 720));
      notas.velocidade = `Percurso mediano entre dois botões: ${Math.round(med)}ms.`;
      const pares = {};
      for (const t of g.tentativas) {
        if (!t.ok || !t.iki || !t.alvo) continue;
        const p = t.alvo.split('>');
        for (let i = 0; i < t.iki.length; i++) {
          const k = `${p[i]}>${p[i + 1]}`;
          (pares[k] || (pares[k] = [])).push(t.iki[i]);
        }
      }
      notas.pares = Object.entries(pares)
        .map(([k, vs]) => ({ par: k, med: U.median(vs), n: vs.length }))
        .sort((a, b) => b.med - a.med);
    }

    /* d3 — consistência */
    let accSolo = null;
    if (byId.d3) {
      const g = byId.d3.g;
      accSolo = g.acuracia;
      const cvI = g.cvInterno(), cvE = g.cvExterno();
      eixos.consistencia = Math.round(M.notaCV((cvI + cvE) / 2, 0.10, 0.45));
      notas.consistencia = `Variação do ritmo dentro do combo: ${(cvI * 100).toFixed(0)}%. Entre repetições: ${(cvE * 100).toFixed(0)}%.`;
      notas.rotaSolo = { acc: g.acuracia, total: U.median(g.totais()), cv: (cvI + cvE) / 2 };
    }

    /* d4 — automatismo (a prova mais importante) */
    let queda = null;
    if (byId.d4 && accSolo != null) {
      const g = byId.d4.g;
      const accDupla = g.acuracia;
      const tSolo = notas.rotaSolo?.total || 1;
      const tDupla = U.median(g.totais()) || tSolo;
      const quedaAcc = accSolo > 0 ? U.clamp((accSolo - accDupla) / accSolo, -0.2, 1) : 0;
      const quedaTempo = U.clamp((tDupla - tSolo) / Math.max(1, tSolo), -0.2, 1.5);
      queda = U.clamp(quedaAcc * 0.65 + quedaTempo * 0.35, 0, 1);
      eixos.automatismo = Math.round(U.clamp(100 - queda * 135, 5, 100));
      const secOk = g.tentativas.filter(t => t.extra && t.extra.secOk === true).length;
      notas.automatismo = `Com atenção dividida a rota caiu ${Math.round(queda * 100)}% (acerto ${Math.round(accSolo*100)}%→${Math.round(accDupla*100)}%, tempo ${Math.round(tSolo)}→${Math.round(tDupla)}ms). Leitura lateral: ${secOk}/${g.n}.`;
      notas.queda = queda;
    }

    /* d5 — reflexo e decisão */
    if (byId.d5) {
      const g = byId.d5.g;
      const rt = U.median(g.rts());
      const fa = g.tentativas.filter(t => t.erro === 'antecipado').length;
      eixos.reflexo = Math.round(0.55 * M.notaTempo(rt, 400, 1150) + 0.45 * g.acuracia * 100);
      eixos.decisao = Math.round(U.clamp(g.acuracia * 100 - fa * 6, 5, 100));
      notas.reflexo = `Reação com escolha: ${Math.round(rt)}ms, ${Math.round(g.acuracia * 100)}% de leituras certas.`;
      notas.decisao = fa
        ? `${fa} resposta(s) em situação que não pedia nada — dedo andando sozinho.`
        : 'Nenhuma resposta impulsiva nas provas de controle.';
    }

    /* d6 — freio */
    if (byId.d6) {
      const g = byId.d6.g;
      const par = g.tentativas.filter(t => t.extra && t.extra.tipo === 'parar');
      const seg = g.tentativas.filter(t => !t.extra || t.extra.tipo === 'seguir');
      const pAcc = par.length ? par.filter(t => t.ok).length / par.length : 0.5;
      const sAcc = seg.length ? seg.filter(t => t.ok).length / seg.length : 0.5;
      eixos.freio = Math.round(U.clamp(pAcc * 70 + sAcc * 30, 5, 100));
      notas.freio = `Conseguiu abortar em ${par.filter(t => t.ok).length} de ${par.length} sinais de perigo; manteve a execução em ${seg.filter(t => t.ok).length} de ${seg.length}.`;
    }

    eixos.movimento = 45;
    notas.movimento = 'Não medido no diagnóstico. Entra no exercício Combo Andando.';

    /* Erros agregados */
    const erros = {};
    for (const p of provas) {
      const c = p.g.contagemErros();
      for (const k in c) erros[k] = (erros[k] || 0) + c[k];
    }
    const errosOrd = Object.entries(erros).sort((a, b) => b[1] - a[1]);

    /* Estado da rota base */
    let estadoRota = null;
    if (byId.d3) {
      const g = byId.d3.g;
      estadoRota = M.classificar({
        acc: g.acuracia,
        cvRitmo: (g.cvInterno() + g.cvExterno()) / 2,
        tempoRel: (U.median(g.totais()) || 1100) / 1100,
        quedaCarga: queda,
        erroDominante: g.erroDominante(),
      });
    }

    /* Grava no vetor de habilidade com confiança alta */
    const s = M.getSkills();
    for (const k of M.EIXO_IDS) {
      if (eixos[k] == null) continue;
      s[k].valor = eixos[k];
      s[k].conf = k === 'movimento' ? 0.1 : 0.75;
      s[k].ultimo = Date.now();
      s[k].amostras = (s[k].amostras || 0) + 1;
    }

    const ord = M.EIXO_IDS.filter(k => eixos[k] != null && k !== 'movimento')
      .sort((a, b) => eixos[a] - eixos[b]);
    const fracos = ord.slice(0, 3);
    const fortes = ord.slice(-2).reverse();

    const d = U.DB.load();
    d.diagnostico = {
      t: Date.now(), eixos, notas, erros: errosOrd, estadoRota, queda, fracos, fortes,
    };
    d.nivel = Math.max(1, Math.min(6, sugereNivelInicial(eixos)));
    U.DB.save();

    const f = fila(5);
    d.diagnostico.fila = f.map(x => x.drill.id);
    U.DB.save();
    return d.diagnostico;
  }

  /** Onde começar. Um mês parado quase nunca significa voltar do zero. */
  function sugereNivelInicial(e) {
    const v = (k, def = 50) => e[k] ?? def;
    if (v('precisao') < 55 || v('consistencia') < 45) return 1;
    if (v('consistencia') < 65) return 2;
    if (v('automatismo') < 60) return 3;
    if (v('velocidade') < 68) return 4;
    if (v('reflexo') < 68 || v('freio') < 62) return 5;
    return 6;
  }

  /* ============================================================
     SESSÃO E RELATÓRIO
     ============================================================ */
  function abrirSessao() {
    M.aplicarDecaimento();
    const d = U.DB.load();
    const s = {
      t: Date.now(), fim: null, sets: [], antes: M.valores(), depois: null,
      nivelAntes: d.nivel, nivelDepois: null, heroi: d.focoLuna ? 'luna' : 'jing',
    };
    d.sessaoAtual = s;
    U.DB.save();
    return s;
  }

  function fecharSessao() {
    const d = U.DB.load();
    const s = d.sessaoAtual;
    if (!s || !s.sets.length) { d.sessaoAtual = null; U.DB.save(); return null; }
    s.fim = Date.now();
    s.depois = M.valores();
    s.nivelDepois = d.nivel;
    d.sessoes.push(s);
    if (d.sessoes.length > 120) d.sessoes = d.sessoes.slice(-120);
    d.sessaoAtual = null;

    const hoje = new Date().setHours(0, 0, 0, 0);
    if (d.streak.ultimo !== hoje) {
      d.streak.dias = (hoje - d.streak.ultimo === U.DAY) ? d.streak.dias + 1 : 1;
      d.streak.ultimo = hoje;
    }
    U.DB.save();
    return relatorio(s);
  }

  function relatorio(s) {
    const deltas = M.EIXO_IDS.map(k => ({
      eixo: k, nome: M.EIXOS[k].nome,
      antes: Math.round(s.antes[k]), depois: Math.round(s.depois[k]),
      delta: s.depois[k] - s.antes[k],
    })).filter(x => Math.abs(x.delta) > 0.4);
    deltas.sort((a, b) => b.delta - a.delta);

    const erros = {};
    for (const r of s.sets) for (const k in r.erros) erros[k] = (erros[k] || 0) + r.erros[k];
    const errosOrd = Object.entries(erros).sort((a, b) => b[1] - a[1]);

    const v = M.valores();
    const n = nivelAtual();
    const prontos = M.EIXO_IDS.filter(k => v[k] >= alvoEixo(k, n));
    const pendentes = M.EIXO_IDS.filter(k => v[k] < alvoEixo(k, n))
      .sort((a, b) => (alvoEixo(a, n) - v[a]) - (alvoEixo(b, n) - v[b])).reverse();

    const mec = U.DB.load().mecanicas;
    const rotas = Object.entries(mec).map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => (a.acc || 0) - (b.acc || 0));

    const prox = proximo();

    return {
      sessao: s,
      duracao: (s.fim - s.t),
      sets: s.sets.length,
      scoreMedio: Math.round(U.mean(s.sets.map(x => x.score))),
      melhorou: deltas.filter(d => d.delta > 0),
      piorou: deltas.filter(d => d.delta < 0),
      erroMaisComum: errosOrd[0] || null,
      errosOrd,
      prontos, pendentes, rotas,
      subiuNivel: s.nivelDepois > s.nivelAntes ? s.nivelDepois : null,
      proximo: prox,
      falta: faltaParaSubir(),
    };
  }

  function registrarSet(rec) {
    const d = U.DB.load();
    if (!d.sessaoAtual) abrirSessao();
    d.sessaoAtual.sets.push(rec);
    U.DB.save();
  }

  /* ---------- diagnóstico contínuo do HUD a partir dos erros ---------- */
  function culpaDoHud() {
    const sets = U.DB.load().sets.slice(-25);
    let hud = 0, total = 0;
    for (const s of sets) {
      for (const k in s.erros) { total += s.erros[k]; if (k === 'hud') hud += s.erros[k]; }
    }
    return { hud, total, frac: total ? hud / total : 0 };
  }

  U.C = {
    NIVEIS, nivelInfo, nivelAtual, checarNivel, faltaParaSubir, alvoEixo,
    estadoDrill, pisoIki, rotasAtivas, candidatos, deficits,
    avaliarSet, proximo, fila, diagnosticar, sugereNivelInicial,
    abrirSessao, fecharSessao, relatorio, registrarSet, culpaDoHud,
  };

})(window.U);
