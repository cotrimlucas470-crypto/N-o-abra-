/* ============================================================
   metrics.js — medição, pontuação, diagnóstico de ferrugem
   ============================================================ */
'use strict';
(function (U) {

  /* Eixos treináveis. Tudo no sistema é medido e gasto nesta moeda. */
  const EIXOS = {
    precisao:     { nome: 'Precisão',      desc: 'Onde o dedo encosta dentro do botão' },
    velocidade:   { nome: 'Velocidade',    desc: 'Tempo entre um comando e o próximo' },
    consistencia: { nome: 'Consistência',  desc: 'Repetir igual, não repetir rápido' },
    automatismo:  { nome: 'Automatismo',   desc: 'Executar sem gastar atenção' },
    reflexo:      { nome: 'Reflexo',       desc: 'Perceber e responder certo' },
    decisao:      { nome: 'Decisão',       desc: 'Escolher o alvo e o momento' },
    freio:        { nome: 'Freio',         desc: 'Interromper uma jogada já iniciada' },
    movimento:    { nome: 'Movimento',     desc: 'Andar enquanto executa' },
  };
  const EIXO_IDS = Object.keys(EIXOS);

  /* Tipos de erro — a classificação que responde "de quem é a culpa" */
  const ERROS = {
    velocidade:    { nome: 'Pressa',         dica: 'Você errou indo mais rápido que o seu próprio ritmo estável.' },
    memoria:       { nome: 'Memória',        dica: 'Botão errado na sequência: a rota ainda não está gravada.' },
    hud:           { nome: 'HUD',            dica: 'O dedo caiu num botão vizinho. Isso é layout, não é habilidade.' },
    posicionamento:{ nome: 'Posicionamento', dica: 'Executou parado ou na direção errada.' },
    decisao:       { nome: 'Decisão',        dica: 'A execução estava certa; a escolha não.' },
    freio:         { nome: 'Freio',          dica: 'Continuou a jogada depois do sinal de perigo.' },
    lento:         { nome: 'Lentidão',       dica: 'Resposta correta, mas fora da janela útil.' },
    antecipado:    { nome: 'Antecipação',    dica: 'Apertou antes do sinal — chute, não leitura.' },
    mira:          { nome: 'Mira',           dica: 'Direção do golpe errada.' },
  };

  /* ---------- Vetor de habilidade ---------- */
  function vetorNovo(base = 40) {
    const v = {};
    for (const k of EIXO_IDS) v[k] = { valor: base, conf: 0, ultimo: 0, amostras: 0 };
    return v;
  }
  function getSkills() {
    const d = U.DB.load();
    if (!d.skills) d.skills = vetorNovo();
    for (const k of EIXO_IDS) if (!d.skills[k]) d.skills[k] = { valor: 40, conf: 0, ultimo: 0, amostras: 0 };
    return d.skills;
  }
  const valores = (s = getSkills()) => {
    const o = {}; for (const k of EIXO_IDS) o[k] = s[k].valor; return o;
  };

  /**
   * Decaimento por tempo parado. Um mês sem jogar não apaga a habilidade;
   * torna ela lenta e instável. Por isso precisão/decisão decaem devagar,
   * e velocidade/automatismo decaem rápido — é exatamente o que se perde.
   */
  const TAXA_DECAI = {
    precisao: 0.35, velocidade: 0.95, consistencia: 0.80, automatismo: 1.15,
    reflexo: 0.70, decisao: 0.40, freio: 0.60, movimento: 0.75,
  };
  function aplicarDecaimento() {
    const s = getSkills();
    const agora = Date.now();
    for (const k of EIXO_IDS) {
      const e = s[k];
      if (!e.ultimo) continue;
      const dias = (agora - e.ultimo) / U.DAY;
      if (dias < 1) continue;
      const perda = Math.min(22, dias * TAXA_DECAI[k]);
      e.valor = U.clamp(e.valor - perda, 8, 100);
      e.conf = U.clamp(e.conf - dias * 0.04, 0, 1);
      e.ultimo = agora;
    }
    U.DB.save();
  }

  /** Atualiza o vetor com o resultado de um set. */
  function aplicarSet(pesos, score, peso = 1) {
    const s = getSkills();
    const alpha = 0.42 * peso;
    for (const k in pesos) {
      if (!s[k]) continue;
      const w = pesos[k];
      if (!w) continue;
      const e = s[k];
      e.valor = U.clamp(e.valor + alpha * w * (score - e.valor), 5, 100);
      e.conf = U.clamp(e.conf + 0.16 * w, 0, 1);
      e.amostras += 1;
      e.ultimo = Date.now();
    }
    U.DB.save();
  }

  /* ============================================================
     Gravador de set — cada tentativa vira um registro comparável
     ============================================================ */
  class Gravador {
    constructor(drillId, meta = {}) {
      this.drillId = drillId;
      this.meta = meta;
      this.inicio = Date.now();
      this.t0 = U.now();
      this.tentativas = [];
      this.eventos = [];
    }
    /**
     * @param {object} a
     *  ok:boolean, rt:number|null, iki:number[]|null, precisao:number|null,
     *  erro:string|null, alvo:string, feito:string, extra:object
     */
    add(a) {
      this.tentativas.push({
        i: this.tentativas.length,
        t: U.now() - this.t0,
        ok: !!a.ok,
        rt: a.rt ?? null,
        iki: a.iki ?? null,
        total: a.total ?? null,
        precisao: a.precisao ?? null,
        erro: a.erro ?? null,
        alvo: a.alvo ?? null,
        feito: a.feito ?? null,
        carga: a.carga ?? 0,      // 0 = solo, 1 = dupla tarefa
        extra: a.extra ?? null,
      });
    }
    get n() { return this.tentativas.length; }
    get acertos() { return this.tentativas.filter(t => t.ok).length; }
    get acuracia() { return this.n ? this.acertos / this.n : 0; }
    rts(soOk = true) { return this.tentativas.filter(t => t.rt != null && (!soOk || t.ok)).map(t => t.rt); }
    totais(soOk = true) { return this.tentativas.filter(t => t.total != null && (!soOk || t.ok)).map(t => t.total); }
    precisoes() { return this.tentativas.filter(t => t.precisao != null).map(t => t.precisao); }
    ikisTodos() { return this.tentativas.filter(t => t.ok && t.iki).flatMap(t => t.iki); }
    /** CV médio DENTRO de cada tentativa: mede regularidade do ritmo do combo. */
    cvInterno() {
      const vs = this.tentativas.filter(t => t.ok && t.iki && t.iki.length >= 2).map(t => U.cv(t.iki));
      return vs.length ? U.mean(vs) : 0;
    }
    /** CV ENTRE tentativas: mede se você repete o mesmo combo do mesmo jeito. */
    cvExterno() {
      const ts = this.totais();
      return ts.length >= 3 ? U.cv(U.trimmed(ts, 0.12)) : 0;
    }
    contagemErros() {
      const c = {};
      for (const t of this.tentativas) if (!t.ok && t.erro) c[t.erro] = (c[t.erro] || 0) + 1;
      return c;
    }
    erroDominante() {
      const c = this.contagemErros();
      let m = null, mv = 0;
      for (const k in c) if (c[k] > mv) { mv = c[k]; m = k; }
      return m;
    }
  }

  /* ============================================================
     Pontuação por tipo de motor
     ============================================================ */

  /** Converte tempo em nota: `bom` vale 100, `ruim` vale 0.
   *  Sem amostra (t nulo ou zero) a nota é 0: ausência de dado não é mérito. */
  const notaTempo = (t, bom, ruim) => (!t || t <= 0) ? 0 : 100 * U.clamp((ruim - t) / (ruim - bom), 0, 1);
  /** Converte CV em nota: cvBom vale 100, cvRuim vale 0. */
  const notaCV = (c, bom = 0.10, ruim = 0.42) => 100 * U.clamp((ruim - c) / (ruim - bom), 0, 1);
  /** Regularidade só existe se houve repetição bem-sucedida suficiente. */
  const notaRitmo = (amostras, c, bom, ruim) => amostras < 2 ? 0 : notaCV(c, bom, ruim);

  function pontuar(motor, g, cfg = {}) {
    const acc = g.acuracia;
    const prec = U.mean(g.precisoes()) * 100;
    const parciais = {};
    let score = 0;

    switch (motor) {
      case 'tap': {
        const rts = g.rts();
        parciais.acuracia = acc * 100;
        parciais.precisao = prec;
        parciais.tempo = notaTempo(U.median(rts), cfg.rtBom ?? 300, cfg.rtRuim ?? 760);
        parciais.consistencia = notaRitmo(rts.length, U.cv(U.trimmed(rts, 0.1)), 0.12, 0.45);
        score = 0.32 * parciais.acuracia + 0.26 * parciais.precisao
              + 0.26 * parciais.tempo + 0.16 * parciais.consistencia;
        break;
      }
      case 'sequencia': {
        const tots = g.totais();
        parciais.acuracia = acc * 100;
        parciais.precisao = prec;
        parciais.tempo = notaTempo(U.median(tots), cfg.alvoMs ?? 900, (cfg.alvoMs ?? 900) * 2.4);
        parciais.consistencia = notaRitmo(tots.length, g.cvInterno() * 0.5 + g.cvExterno() * 0.5, 0.10, 0.40);
        if (cfg.foco === 'precisao') {
          score = 0.40 * parciais.acuracia + 0.30 * parciais.precisao
                + 0.10 * parciais.tempo + 0.20 * parciais.consistencia;
        } else if (cfg.foco === 'consistencia') {
          score = 0.32 * parciais.acuracia + 0.16 * parciais.precisao
                + 0.10 * parciais.tempo + 0.42 * parciais.consistencia;
        } else {
          score = 0.34 * parciais.acuracia + 0.16 * parciais.precisao
                + 0.32 * parciais.tempo + 0.18 * parciais.consistencia;
        }
        break;
      }
      case 'compasso': {
        // erro absoluto de sincronia com o metrônomo
        const errs = g.tentativas.filter(t => t.ok && t.extra && t.extra.desvio != null).map(t => Math.abs(t.extra.desvio));
        const e = U.mean(errs);
        parciais.acuracia = acc * 100;
        parciais.sincronia = errs.length ? 100 * U.clamp(1 - e / (cfg.janela ?? 140), 0, 1) : 0;
        parciais.precisao = prec;
        parciais.consistencia = notaRitmo(errs.length, U.cv(errs.map(v => v + 40)), 0.15, 0.7);
        score = 0.34 * parciais.acuracia + 0.34 * parciais.sincronia
              + 0.18 * parciais.precisao + 0.14 * parciais.consistencia;
        break;
      }
      case 'escolha': {
        const rts = g.rts();
        const fa = g.tentativas.filter(t => t.erro === 'antecipado').length / Math.max(1, g.n);
        parciais.acuracia = acc * 100;
        parciais.tempo = notaTempo(U.median(rts), cfg.rtBom ?? 420, cfg.rtRuim ?? 1100);
        parciais.disciplina = 100 * U.clamp(1 - fa * 3, 0, 1);
        parciais.consistencia = notaRitmo(rts.length, U.cv(U.trimmed(rts, 0.1)), 0.14, 0.5);
        score = 0.40 * parciais.acuracia + 0.30 * parciais.tempo
              + 0.16 * parciais.disciplina + 0.14 * parciais.consistencia;
        break;
      }
      case 'freio': {
        const go = g.tentativas.filter(t => t.extra && t.extra.tipo === 'seguir');
        const no = g.tentativas.filter(t => t.extra && t.extra.tipo === 'parar');
        const goAcc = go.length ? go.filter(t => t.ok).length / go.length : 1;
        const noAcc = no.length ? no.filter(t => t.ok).length / no.length : 1;
        const lat = U.median(no.filter(t => t.ok && t.rt != null).map(t => t.rt));
        parciais.execucao = goAcc * 100;
        parciais.interrupcao = noAcc * 100;
        parciais.latenciaFreio = notaTempo(lat || 900, cfg.rtBom ?? 330, cfg.rtRuim ?? 900);
        // Parar sempre (nunca executar) não é habilidade: as duas metades pesam.
        score = 0.26 * parciais.execucao + 0.44 * parciais.interrupcao + 0.30 * parciais.latenciaFreio;
        break;
      }
      case 'prioridade': {
        const rts = g.rts();
        parciais.acuracia = acc * 100;
        parciais.tempo = notaTempo(U.median(rts), cfg.rtBom ?? 1300, cfg.rtRuim ?? 4200);
        parciais.consistencia = notaRitmo(rts.length, U.cv(U.trimmed(rts, 0.1)), 0.2, 0.7);
        score = 0.60 * parciais.acuracia + 0.28 * parciais.tempo + 0.12 * parciais.consistencia;
        break;
      }
      case 'cenario': {
        const dec = g.tentativas.filter(t => t.extra && t.extra.fase === 'decisao');
        const exe = g.tentativas.filter(t => t.extra && t.extra.fase === 'execucao');
        const frs = g.tentativas.filter(t => t.extra && t.extra.fase === 'freio');
        const p = (arr) => arr.length ? arr.filter(t => t.ok).length / arr.length * 100 : null;
        parciais.decisao = p(dec) ?? 0;
        parciais.execucao = p(exe) ?? 0;
        parciais.adaptacao = p(frs) ?? parciais.decisao;
        score = 0.44 * parciais.decisao + 0.30 * parciais.execucao + 0.26 * parciais.adaptacao;
        break;
      }
      case 'rastreio': {
        const dentro = U.mean(g.tentativas.map(t => (t.extra && t.extra.dentro) || 0)) * 100;
        parciais.acuracia = acc * 100;
        parciais.movimento = dentro;
        parciais.precisao = prec;
        score = 0.36 * parciais.acuracia + 0.40 * parciais.movimento + 0.24 * parciais.precisao;
        break;
      }
      default:
        score = acc * 100;
    }
    return { score: U.clamp(Math.round(score), 0, 100), parciais };
  }

  /* ============================================================
     Diagnóstico de ferrugem
     A pergunta central: "não sei fazer" ou "sei fazer e está lento"?
     ============================================================ */
  const ESTADOS = {
    automatica:   { nome: 'Automática',  cor: '#3ddc97', texto: 'Sai sozinha. Não gaste tempo repetindo.' },
    consciente:   { nome: 'Consciente',  cor: '#7fd4ff', texto: 'Você acerta pensando. Em luta, isso trava. Precisa de carga dupla.' },
    lenta:        { nome: 'Lenta',       cor: '#ffd479', texto: 'Está certa, só devagar. Ferrugem clássica: recupera rápido.' },
    instavel:     { nome: 'Instável',    cor: '#ffa057', texto: 'Às vezes perfeita, às vezes não. Falta regularidade, não força.' },
    errando:      { nome: 'Errando',     cor: '#ff8a5c', texto: 'O padrão existe mas sai trocado. Voltar ao passo lento.' },
    perdida:      { nome: 'Perdida',     cor: '#ff5470', texto: 'Precisa reaprender a sequência, não acelerar.' },
  };

  /**
   * Classifica uma mecânica a partir de medidas brutas.
   * quedaCarga = quanto a performance cai sob dupla tarefa (0..1).
   */
  function classificar({ acc, cvRitmo, tempoRel, quedaCarga, erroDominante }) {
    if (acc < 0.38) return 'perdida';
    if (acc < 0.65) return erroDominante === 'memoria' ? 'perdida' : 'errando';
    if (quedaCarga != null && quedaCarga > 0.26) return 'consciente';
    if (cvRitmo > 0.30) return 'instavel';
    if (tempoRel > 1.32) return 'lenta';
    if (acc >= 0.88 && cvRitmo <= 0.20 && (quedaCarga == null || quedaCarga <= 0.14)) return 'automatica';
    return 'lenta';
  }

  /** Frase honesta para o jogador. */
  function leitura(estado) {
    return ESTADOS[estado] || ESTADOS.lenta;
  }

  /* ---------- Registro de sets e sessões ---------- */
  function salvarSet(rec) {
    const d = U.DB.load();
    d.sets.push(rec);
    if (d.sets.length > 800) d.sets = d.sets.slice(-800);
    U.DB.save();
  }

  function setsDoDrill(drillId, n = 8) {
    return U.DB.load().sets.filter(s => s.drill === drillId).slice(-n);
  }

  /** Tendência simples: média dos últimos 3 menos média dos 3 anteriores. */
  function tendencia(arr, k = 3) {
    if (arr.length < k * 2) return null;
    const a = U.mean(arr.slice(-k)), b = U.mean(arr.slice(-k * 2, -k));
    return a - b;
  }

  U.M = {
    EIXOS, EIXO_IDS, ERROS, ESTADOS,
    vetorNovo, getSkills, valores, aplicarDecaimento, aplicarSet,
    Gravador, pontuar, notaTempo, notaCV, notaRitmo,
    classificar, leitura, salvarSet, setsDoDrill, tendencia,
  };

})(window.U);
