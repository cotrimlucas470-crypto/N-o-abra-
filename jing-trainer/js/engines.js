/* ============================================================
   engines.js — motores de exercício (V2)
   Sequencia · Leitura · Decisao
   ------------------------------------------------------------
   Mudanças de fundo em relação à V1:

   · Retorno desvanecido REMOVIDO. A meta-análise de 2022 sobre
     frequência reduzida de retorno não sustenta a hipótese da
     orientação. Manter um mecanismo que confunde a leitura do
     jogador sem evidência a favor é custo sem benefício.

   · O retorno virou binário e explícito: TREINO tem retorno,
     PROVA não tem. Isso é o que separa ensinar de medir.

   · Os dois motores de decisão da V1 (Prioridade e Cenário) eram
     a mesma tarefa com telas diferentes. Viraram um só.

   · Toda tentativa é gravada crua. As medidas são calculadas
     depois, o que permite recalcular tudo quando o método muda.
   ============================================================ */
'use strict';
(function (U) {

  const H = U.HUD, MD = U.MD, CO = U.CO, S = U.S;

  class MotorBase {
    constructor(hud, cfg, api) {
      this.hud = hud; this.cfg = cfg; this.api = api;
      this.T = new U.Timers();
      this.ativo = false; this.i = 0;
      this.n = cfg.tentativas || 10;
      this.mo = cfg.mo || 'treino';
      this.ref = !!cfg.ref;
      this.retorno = !cfg.semRetorno;
      this.toques = [];
      this.reg = [];                 // resumo das tentativas deste set
    }
    iniciar() { this.ativo = true; this.hud.limparMarcas(); this.hud.travado = false; this.proxima(); }
    parar() {
      this.ativo = false; this.T.clear();
      this.hud.limparMarcas(); this.hud.setOverlay(null); this.hud.setAlvo(null);
      this.hud.quadrantes = false; this.hud.quadAceso = -1;
      this.hud.campo = []; this.hud.trilhas = [];
      this.hud.nuvem = null;
    }
    concluir() { this.parar(); this.api.fim(this.resumo()); }
    placar() { this.api.info({ i: this.i, n: this.n, ok: this.acertos, total: this.reg.length }); }
    get acertos() { return this.reg.filter(x => x.ok).length; }
    /** Grava a tentativa crua e guarda o resumo do set. */
    anota(t) {
      const linha = { ok: !!t.ok, err: t.err || null, rt: t.rt ?? null, tot: t.tot ?? null, x: t.x || null };
      this.reg.push(linha);
      MD.gravar({
        d: this.cfg.drillId, mo: this.mo, k: t.k, ok: t.ok,
        rt: t.rt, tot: t.tot, err: t.err, dif: this.cfg.dif,
        aj: this.cfg.mostrarRota === 'sempre', ref: this.ref, x: t.x,
      });
    }
    /** Retorno por tentativa — só existe em treino. */
    diz(txt, tipo, dica) {
      if (!this.retorno) { this.api.mensagem('', 'mudo'); return; }
      this.api.mensagem(txt, tipo, dica);
    }
    resumo() {
      const okN = this.acertos, n = this.reg.length;
      const erros = {};
      for (const r of this.reg) if (!r.ok && r.err) erros[r.err] = (erros[r.err] || 0) + 1;
      const tempos = this.reg.filter(r => r.ok && r.tot).map(r => r.tot);
      return {
        drill: this.cfg.drillId, mo: this.mo, ref: this.ref, dif: this.cfg.dif,
        n, ok: okN, acc: n ? okN / n : 0, erros,
        ic: S.wilson(okN, n), tempos,
        cv: S.cv(tempos), medTempo: tempos.length ? U.median(tempos) : null,
        alvoMs: this.cfg.alvoMs || null,
        toques: this.toques,
        extras: this.extras(),
        linhas: this.reg,
      };
    }
    extras() { return {}; }

    /* ------------------------------------------------------------
       CONFIANÇA — três níveis, tocados no campo.
       Só CALIBRAÇÃO (a sensação bate com o acerto?) entra no
       sistema. Sensibilidade metacognitiva ficou de fora: tem
       confiabilidade teste-reteste ruim e é confundida com o
       próprio desempenho em tarefa onde dá para chutar. Seria
       precisão inventada.
       ------------------------------------------------------------ */
    perguntarConfianca(depois) {
      if (!this.cfg.confianca) return depois(null);
      this.estado = 'confianca';
      const ops = [
        { id: 'cf0', titulo: 'CHUTEI', v: 0.15, icone: '🤷' },
        { id: 'cf1', titulo: 'ACHO QUE SIM', v: 0.55, icone: '🤔' },
        { id: 'cf2', titulo: 'CERTEZA', v: 0.90, icone: '💡' },
      ];
      const larg = 0.165, gap = 0.03;
      const total = ops.length * larg + (ops.length - 1) * gap;
      const x0 = 0.05 + (0.60 - total) / 2;
      this.hud.campo = ops.map((o, k) => ({
        id: o.id, icone: o.icone, titulo: o.titulo, conf: o.v,
        x: x0 + k * (larg + gap), y: 0.42, w: larg, h: 0.30, marca: '#5b708f',
      }));
      this.hud.setOverlay({ texto: '', sub: 'quanta certeza você tinha?', cx: 0.36, cy: 0.16,
                            tam: 0.01, fundo: false, subCor: '#8fa3c4' });
      this._confCb = depois;
      this.T.after(this.cfg.tempoConfianca || 2200, () => {
        if (this.estado === 'confianca') this.responderConfianca(null);
      });
    }
    responderConfianca(v) {
      if (this.estado !== 'confianca') return;
      this.hud.campo = []; this.hud.setOverlay(null);
      const cb = this._confCb; this._confCb = null;
      U.Sfx.tick();
      cb && cb(v);
    }

    press() {} joy() {} campo() {}
  }

  /* ============================================================
     1) SEQUÊNCIA — rota, ritmo, movimento, carga, freio
     ============================================================ */
  class MotorSequencia extends MotorBase {
    constructor(hud, cfg, api) {
      super(hud, cfg, api);
      this.estado = 'ocioso';
      this.pisoIki = cfg.pisoIki || 110;
      this.rotas = (cfg.rotas && cfg.rotas.length) ? cfg.rotas : [['s1']];
      this.esquema = cfg.esquema || 'aleatorio';
      this.ordem = U.CI.ordenarRotas(this.rotas, this.n, this.esquema);
      this.escada = cfg.freio ? new U.CI.Escada(cfg.ssdInicial ?? 0, cfg.ssdPasso ?? 50) : null;
      this.ikisIr = [];         // intervalos em tentativas SEM sinal de parada
      this.ikisSet = [];
      this.ordemIkis = [];      // para detectar lentidão proativa
      this.trajetos = [];       // {rota, ikis} — alimenta a reta de Fitts
      /* Caos controlado: UMA variável perturbada por vez, marcada na
         tentativa, e misturada com tentativas normais dentro do MESMO
         set. Comparar dentro do set controla o efeito de dia, de humor
         e de aquecimento — comparar entre sets não controla nada. */
      this.pert = cfg.perturbacao || null;
      this.pertProb = cfg.pertProb ?? 0.4;
      this.variante = cfg.variante ? (cfg.varianteProb ?? 0.4) : 0;
      this.trocaProb = cfg.troca || 0;

      /* ------------------------------------------------------------
         ESCADA VIVA — adaptação DENTRO do bloco (ver js/escada.js).

         Só em treino: prova e retenção são condição fixa por definição.
         E só fora da Reconexão: lá o alvo é 92%, e a simulação mostrou
         a escada quebrando nesse alvo (viés de +90 a +150 ms, limiar em
         menos de metade dos blocos) — com erro tão raro quase não há
         vales. Além disso a Reconexão existe para você errar pouco
         enquanto reencontra a rota, e uma escada vive de erro. Lá quem
         adapta é o controlador entre blocos, que mira 92% sem problema.
         ------------------------------------------------------------ */
      this.escadaViva = null;
      this.escadaOrigem = null;
      if (cfg.escadaViva && U.ES && this.mo === 'treino' && U.CT.fase() !== 'reconexao') {
        const ev = cfg.escadaViva;
        const salvo = U.ES.inicioSalvo(cfg.drillId);
        const recente = salvo ? null : this.inicioPelosTempos(cfg.drillId);
        const inicio = salvo ? salvo.valor : recente != null ? recente : ev.inicio;
        this.escadaOrigem = salvo ? 'escada' : recente != null ? 'tempos' : 'configuracao';
        this.escadaViva = new U.ES.EscadaPonderada({
          inicio, passo: ev.passo ?? 25, passoFino: ev.passoFino ?? 12,
          min: ev.min, max: ev.max, dificilE: 'menor',
          alvo: U.clamp(U.CT.alvoAtual(), 0.80, 0.85),
        });
      }

      if (cfg.dispersao) {
        const ids = [...new Set(this.rotas.flat())];
        this.hud.nuvem = null;
        this.hud.semearNuvem(ids);
      }
    }

    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++; this.placar();

      this.rota = (this.ordem[this.i - 1] || this.rotas[0]).slice();
      this.rotaOriginal = this.rota.slice();
      this.pertAtual = 'nenhuma'; this.vrAtual = 'base';
      this.trocaFeita = false; this.tTroca = 0; this.latTroca = null;
      this.deadlineExtra = 1;

      /* variante: mesma estrutura, botões trocados — testa se o que
         foi aprendido é a regra ou a superfície */
      if (this.variante && Math.random() < this.variante) {
        this.rota = transformarRota(this.rota);
        this.vrAtual = 'trocado';
      }
      /* perturbação da tentativa */
      if (this.pert && Math.random() < this.pertProb) {
        this.pertAtual = this.pert;
        this.aplicarPerturbacao();
      }
      this.passo = 0; this.marcas = []; this.ikis = []; this.desvios = null;
      this.deveParar = false; this.tParada = 0; this.paradaReg = false;
      this.semSinal = false; this.sinalSaiu = false; this.timerStop = null;
      this.secOk = null; this.secRt = null; this.secEsperado = -1; this.secT = 0;
      this.amostrasMov = [];

      this.hud.limparMarcas();
      this.hud.quadrantes = !!this.cfg.dupla;
      this.hud.quadAceso = -1;

      const c = this.cfg;
      const mostra = c.mostrarRota !== 'nunca';
      if (mostra) {
        const vis = this.ocultarUltimo ? this.rota.slice(0, -1).concat(['?']) : this.rota;
        this.hud.setOverlay({
          texto: vis.map(k => k === '?' ? '?' : ((H.getHud()[k] || {}).curto || k)).join(' › '),
          sub: (c.mostrarRota === 'antes' ? 'memorize — vai sumir' : 'execute nesta ordem')
               + (this.escadaViva ? ` · limite ${this.alvoTentativa()} ms` : ''),
          tam: 0.15, cor: '#c4b5fd',
        });
      } else if (this.i === 1) {
        this.hud.setOverlay({ texto: 'DE MEMÓRIA',
          sub: 'a rota não vai mais aparecer' + (this.escadaViva ? ` · limite ${this.alvoTentativa()} ms` : ''),
          tam: 0.12, cor: '#ffd479' });
      }
      this.estado = 'preparo';
      this.T.after(mostra ? (c.tempoLeitura || 1000) : (this.i === 1 ? 1600 : 350), () => this.armar());
    }

    armar() {
      if (!this.ativo) return;
      this.hud.setOverlay(null);
      if (this.cfg.mostrarRota === 'sempre') this.destacar();
      this.estado = 'esperando';
      this.T.after(U.rnd(this.cfg.isiMin ?? 400, this.cfg.isiMax ?? 1100), () => this.ir());
    }

    ir() {
      if (!this.ativo) return;
      this.estado = 'executando';
      this.t0 = U.now(); this.tUltimo = this.t0;
      U.Sfx.cue();
      this.hud.setOverlay({ texto: 'VAI', tam: 0.14, cor: '#6ee7a8', fundo: 'rgba(5,8,14,.22)' });
      this.T.after(200, () => { if (this.estado === 'executando') this.hud.setOverlay(null); });
      this.destacar();
      const c = this.cfg;

      if (c.modo === 'compasso') {
        this.beats = [];
        for (let k = 0; k < this.rota.length; k++) {
          this.beats.push(this.t0 + (k + 1) * c.beat);
          this.T.after((k + 1) * c.beat, () => {
            if (this.estado !== 'executando') return;
            k === 0 ? U.Sfx.beatStrong() : U.Sfx.beat();
          });
        }
      }

      if (c.mover) {
        this.dirAlvo = U.ri(0, 7);
        this.hud.marcar('joy', { destaque: true, dirAlvo: this.dirAlvo });
        this.T.every(70, () => {
          if (this.estado !== 'executando') return;
          const j = this.hud.joyInfo();
          let dentro = 0;
          if (j.mag > 0.35 && j.dir != null) {
            const dd = Math.min(Math.abs(j.dir - this.dirAlvo), 8 - Math.abs(j.dir - this.dirAlvo));
            dentro = dd <= (c.tolDir ?? 1) ? 1 : 0;
          }
          this.amostrasMov.push(dentro);
        });
        if (c.mover === 'mudando') {
          this.T.after(U.rnd(500, 1100), () => {
            if (this.estado !== 'executando') return;
            this.dirAlvo = (this.dirAlvo + U.ri(2, 5)) % 8;
            this.hud.marcar('joy', { destaque: true, dirAlvo: this.dirAlvo });
            U.Sfx.tick();
          });
        }
      }

      if (c.dupla) {
        this.T.after(U.rnd(180, Math.max(400, (this.alvoTentativa() || 1200) * 0.7)), () => {
          if (this.estado !== 'executando') return;
          this.secEsperado = U.ri(0, 3); this.secT = U.now();
          this.hud.quadAceso = this.secEsperado; U.Sfx.tick();
          this.T.after(c.duplaVisivel ?? 420, () => { this.hud.quadAceso = -1; });
        });
      }

      if (c.ruido) {
        this.T.every(Math.max(140, 420 - c.ruido * 90), () => {
          if (this.estado === 'executando') this.hud.ruido(c.ruido);
        });
      }

      /* Sinal de parada: agendado a partir do início, no momento em
         que o passo-alvo deveria ser pedido, mais/menos o atraso da
         escada. O atraso pode ser negativo — sem essa metade, quem
         freia mais devagar que um intervalo entre toques nunca para
         e a medida trava em zero. */
      this.ensaioParada = !!(c.freio && Math.random() < c.freio);
      this.stopStep = this.ensaioParada ? U.ri(1, Math.max(1, this.rota.length - 1)) : -1;
      this.ssdAtual = this.escada ? this.escada.ssd : 0;
      if (this.ensaioParada) {
        const atraso = Math.max(0, this.stopStep * this.ikiEstimado() + this.ssdAtual);
        this.timerStop = this.T.after(atraso, () => {
          if (this.estado !== 'executando' || this.deveParar) return;
          this.sinalSaiu = true; this.dispararFreio();
        });
      }

      /* estímulo falso: parece perigo e não é. Continuar é o certo. */
      if (this.pertAtual === 'falso') {
        this.T.after(U.rnd(250, 700), () => {
          if (this.estado !== 'executando') return;
          U.Sfx.alert();
          this.hud.setOverlay({ texto: 'ATENÇÃO', sub: 'aliado entrou na luta — siga',
                                tam: 0.15, cor: '#ffd479', fundo: 'rgba(40,32,4,.40)' });
          this.T.after(620, () => { if (this.estado === 'executando') this.hud.setOverlay(null); });
        });
      }
      /* ameaça inesperada: um PARAR num exercício que normalmente não tem */
      if (this.pertAtual === 'ameaca' && !this.ensaioParadaForcada) {
        this.ensaioParadaForcada = true;
        this.T.after(U.rnd(400, 1000), () => {
          if (this.estado !== 'executando' || this.deveParar) return;
          this.sinalSaiu = true; this.ensaioParada = true; this.dispararFreio();
        });
      }
      /* troca de plano: no meio, a rota restante muda */
      if (this.trocaProb && Math.random() < this.trocaProb && this.rota.length >= 3) {
        this.trocaNoPasso = U.ri(1, this.rota.length - 2);
      } else this.trocaNoPasso = -1;

      const lim = (this.prazoTentativa() || (c.modo === 'compasso'
        ? (this.rota.length + 1.6) * c.beat : 900 + this.rota.length * 900)) * this.deadlineExtra;
      this.T.after(lim, () => {
        if (this.estado !== 'executando') return;
        this.encerrar(false, this.deveParar ? null : 'lento');
      });
    }

    /** Aplica a perturbação da tentativa. Uma variável, marcada. */
    aplicarPerturbacao() {
      const c = this.cfg;
      switch (this.pertAtual) {
        case 'ordem':
          this.rota = U.shuffle(this.rota.slice());
          break;
        case 'alvo':
          this.rota = transformarRota(this.rota);
          this.vrAtual = 'trocado';
          break;
        case 'janela':
          this.deadlineExtra = 0.72;
          break;
        case 'ritmo':
          this.deadlineExtra = Math.random() < 0.5 ? 0.8 : 1.3;
          break;
        case 'incompleta':
          this.ocultarUltimo = true;
          break;
        /* 'falso' e 'ameaca' são agendados dentro de ir() */
      }
    }

    ikiEstimado() {
      if (this.ikisSet.length >= 4) return U.median(this.ikisSet);
      const alvo = this.alvoTentativa();
      if (alvo && this.rota) return alvo / Math.max(1, this.rota.length);
      return 320;
    }

    /* Tempo-alvo e prazo DESTA tentativa. Com a escada viva eles saem
       do nível atual dela, em ms por passo, vezes o tamanho da rota
       sorteada — rotas de tamanhos diferentes no mesmo bloco pedem o
       mesmo ritmo, não o mesmo total. Sem escada, valem os do bloco. */
    alvoTentativa() {
      if (this.escadaViva && this.rota) return Math.round(this.escadaViva.valor * this.rota.length);
      return this.cfg.alvoMs;
    }
    prazoTentativa() {
      if (this.escadaViva && this.rota) return Math.round(this.escadaViva.valor * this.rota.length * 1.7 + 500);
      return this.cfg.deadline;
    }

    /**
     * Onde a escada começa quando não há escada anterior salva: um pouco
     * acima dos seus tempos reais recentes. Na simulação, partir dos seus
     * tempos (mesmo com 20% de erro) deixou o limiar existir em 69% dos
     * blocos, contra 48% partindo do nível configurado — que não sabe
     * nada de você.
     */
    inicioPelosTempos(drillId) {
      const pega = (f) => MD.filtrar({ k: 'rota', dias: 21 })
        .filter(x => x.ok && x.tot && x.x && x.x.passos >= 2 && f(x))
        .map(x => x.tot / x.x.passos);
      let a = pega(x => x.d === drillId);
      if (a.length < 8) a = pega(x => x.d === 'rota' || x.d === 'trajeto');
      if (a.length < 8) return null;
      return U.median(a) * 1.15;
    }

    destacar() {
      if (this.cfg.mostrarRota !== 'sempre') return;
      this.hud.limparMarcas();
      if (this.cfg.mover && this.dirAlvo != null) this.hud.marcar('joy', { destaque: true, dirAlvo: this.dirAlvo });
      const k = this.rota[this.passo];
      if (k) this.hud.marcar(k, { destaque: true, cor: '#ffd479' });
    }

    dispararFreio() {
      this.deveParar = true; this.tParada = U.now();
      U.Sfx.stop(); U.Haptic.stop();
      this.hud.limparMarcas();
      this.hud.setOverlay({
        texto: 'PARAR', sub: U.pick(this.cfg.motivosFreio || ['perigo']),
        tam: 0.20, cor: '#ff5470', fundo: 'rgba(40,4,12,.55)',
      });
      this.T.after(this.cfg.janelaFreio ?? 750, () => {
        if (this.estado !== 'executando' || !this.deveParar) return;
        this.regParada(true);
        this.hud.setOverlay(null);
        this.encerrar(true, null, { tipo: 'parar' });
      });
      this.T.after(60, () => this.hud.marcar('joy', { destaque: true, dirAlvo: 4 }));
    }
    regParada(parou) {
      if (!this.escada || this.paradaReg) return;
      this.paradaReg = true; this.escada.registrar(parou);
    }

    press(e) {
      if (!this.ativo) return;
      if (this.estado === 'esperando' || this.estado === 'preparo') {
        if (e.id && e.id.startsWith('q')) return;
        U.Sfx.miss(); this.hud.erro(e.id);
        return this.encerrar(false, 'pressa');
      }
      if (this.estado !== 'executando') return;

      if (e.id && e.id.startsWith('q')) {
        if (this.secEsperado < 0) { this.secOk = false; return; }
        if (this.secOk == null) {
          this.secOk = (Number(e.id.slice(1)) === this.secEsperado);
          this.secRt = U.now() - this.secT; U.Sfx.tick();
        }
        return;
      }

      const t = U.now();
      if (this.deveParar) {
        this.regParada(false);
        this.hud.erro(e.id); U.Sfx.miss();
        return this.encerrar(false, 'freio', { tipo: 'parar', atraso: t - this.tParada });
      }

      const esperado = this.rota[this.passo];
      const iki = t - this.tUltimo;
      if (e.dx != null) {
        this.toques.push({ id: e.id, dx: e.dx, dy: e.dy });
        /* ------------------------------------------------------------
           A NUVEM AO VIVO

           O app já media a dispersão do polegar com elipse, viés e teste
           de significância — e nunca mostrava nada disso enquanto você
           treinava. Repetir um toque sem ver ONDE ele caiu não corrige
           nada: o que ajusta um movimento é saber o erro dele, e "acertou
           o botão" não é o erro, é o resultado.

           Só o exercício de precisão liga isso. Nos outros, a nuvem
           dividiria a atenção com a tarefa que eles estão medindo.
           ------------------------------------------------------------ */
        if (this.cfg.dispersao) this.hud.anotarNuvem(e.id, e.dx, e.dy);
      }

      if (e.id !== esperado) {
        this.hud.erro(e.id); U.Sfx.miss(); U.Haptic.bad();
        return this.encerrar(false, this.classificar(e, esperado, iki));
      }

      this.marcas.push({ id: e.id, t, precisao: e.precisao, iki });
      if (this.passo > 0) {
        this.ikis.push(iki); this.ikisSet.push(iki);
        if (!this.ensaioParada) { this.ikisIr.push(iki); this.ordemIkis.push({ i: this.i, v: iki }); }
      }
      this.tUltimo = t;

      if (this.cfg.modo === 'compasso') {
        const desvio = t - this.beats[this.passo];
        const j = this.cfg.janela || 140;
        if (Math.abs(desvio) > j * 1.9) {
          this.hud.erro(e.id); U.Sfx.miss();
          return this.encerrar(false, desvio < 0 ? 'pressa' : 'lento', { desvio });
        }
        (this.desvios || (this.desvios = [])).push(desvio);
        Math.abs(desvio) <= j * 0.45 ? U.Sfx.perfect() : U.Sfx.hit();
      } else U.Sfx.hit();

      this.hud.acerto(e.id); U.Haptic.good();
      this.passo++;

      if (this.passo === this.trocaNoPasso && !this.trocaFeita) {
        this.trocaFeita = true; this.tTroca = t;
        const resto = this.rota.slice(this.passo);
        const novo = transformarRota(resto, true);
        this.rota = this.rota.slice(0, this.passo).concat(novo);
        U.Sfx.alert(); U.Haptic.stop();
        this.hud.setOverlay({ texto: 'TROCA', sub: novo.map(k => (H.getHud()[k] || {}).curto || k).join(' › '),
                              tam: 0.13, cor: '#ffd479', fundo: 'rgba(40,32,4,.42)' });
        this.T.after(700, () => { if (this.estado === 'executando') this.hud.setOverlay(null); });
        this.destacar();
        return;
      }

      if (this.passo >= this.rota.length) {
        if (this.ensaioParada && !this.sinalSaiu) {
          if (this.timerStop != null) { this.T.cancel(this.timerStop); this.timerStop = null; }
          this.regParada(false); this.semSinal = true;
        }
        const total = t - this.t0;
        const alvoT = this.alvoTentativa();
        if (alvoT && total > alvoT) return this.encerrar(false, 'lento', { total });
        return this.encerrar(true, null, { total });
      }
      this.destacar();
    }

    classificar(e, esperado, iki) {
      if (!e.id) return (e.perto && e.rel < 2.4) ? 'layout' : 'sequencia';
      const hud = H.getHud();
      const a = hud[esperado], b = hud[e.id];
      if (a && b) {
        if (H.folgaMM(a, b) < 5.2) return 'layout';
        if (H.ARMADILHAS.includes(e.id) && e.rel > 0.55) return 'layout';
      }
      if (iki < this.pisoIki) return 'pressa';
      if (this.cfg.mover) {
        const j = this.hud.joyInfo();
        if (!j.ativo || j.mag < 0.3) return 'movimento';
      }
      return 'sequencia';
    }

    encerrar(ok, err, extra = {}) {
      if (this.estado === 'fim' || this.estado === 'ocioso') return;
      this.estado = 'fim'; this.T.clear();
      this.timerStop = null; this.paradaReg = false;
      this.hud.limparMarcas(); this.hud.setOverlay(null); this.hud.quadAceso = -1;

      const total = extra.total ?? (this.t0 ? U.now() - this.t0 : null);
      const mov = this.amostrasMov.length ? U.mean(this.amostrasMov) : null;
      let okF = ok, e2 = err;
      if (this.cfg.dupla && okF && this.secEsperado >= 0 && this.secOk !== true) { okF = false; e2 = 'leitura'; }
      if (this.cfg.mover && okF && mov != null && mov < (this.cfg.movMin ?? 0.55)) { okF = false; e2 = 'movimento'; }

      const tipoParada = this.ensaioParada && !this.semSinal;
      if (okF && this.ikis.length && this.vrAtual === 'base' && this.pertAtual === 'nenhuma')
        this.trajetos.push({ rota: this.rota.slice(), ikis: this.ikis.slice() });
      /* regularidade DENTRO da tentativa: é o que separa um acerto
         firme de um acerto que passou raspando */
      const cvi = this.ikis.length >= 2 ? S.cv(this.ikis) : null;
      if (this.trocaFeita && okF && this.marcas.length > this.trocaNoPasso)
        this.latTroca = this.marcas[this.trocaNoPasso].t - this.tTroca;
      this.anota({
        k: this.cfg.integra ? 'integra' : 'rota', ok: okF, err: e2,
        tot: okF ? total : null,
        rt: this.ikis.length ? this.ikis[0] : total,
        x: {
          parada: tipoParada || undefined, ssd: tipoParada ? this.ssdAtual : undefined,
          mov: mov != null ? +mov.toFixed(2) : undefined,
          sec: this.secOk == null ? undefined : (this.secOk ? 1 : 0),
          desvio: this.desvios ? Math.round(U.mean(this.desvios.map(Math.abs))) : undefined,
          cvi: cvi != null ? +cvi.toFixed(3) : undefined,
          passos: this.rota.length,
          /* Num set COM perturbação configurada, as tentativas limpas também
             são marcadas ('nenhuma'). São elas a linha de base da comparação:
             mesmo set, mesmo dia, mesmo cansaço. Sem essa marca a única base
             disponível eram tentativas de outros dias, e aí a comparação
             media também o dia. Set sem perturbação nenhuma continua sem marca. */
          pert: this.pert ? this.pertAtual : undefined,
          vr: this.vrAtual,
          sw: this.trocaNoPasso > 0 ? (this.trocaFeita ? 1 : 0) : undefined,
          lat: this.latTroca != null ? Math.round(this.latTroca) : undefined,
          /* o nível da escada NESTA tentativa, em ms por passo: sem ele não
             dá para reconstruir depois a trilha nem conferir o limiar */
          esc: this.escadaViva ? Math.round(this.escadaViva.valor) : undefined,
        },
      });

      /* Só entra na escada o que testou o seu ritmo. Toque no botão colado
         testou o layout; tentativa perturbada ou com botões trocados testou
         outra coisa de propósito; tentativa de parada testou o freio.
         Deixar qualquer uma delas mover a escada culparia o tempo por um
         erro que não é dele. */
      if (this.escadaViva) {
        const conta = this.pertAtual === 'nenhuma' && this.vrAtual === 'base'
                      && e2 !== 'layout' && !tipoParada;
        if (conta) this.escadaViva.registrar(okF);
      }

      const msg = okF
        ? (this.cfg.modo === 'compasso' ? 'no compasso' : total ? `${Math.round(total)}ms` : 'certo')
        : (MD.ERROS[e2] ? MD.ERROS[e2].nome : 'erro');
      this.diz(msg, okF ? 'ok' : 'erro', e2 && MD.ERROS[e2] ? MD.ERROS[e2].o_que : null);
      if (okF && this.retorno) U.Sfx.perfect();

      this.placar();
      this.T.after(okF ? 480 : 820, () => this.proxima());
    }

    extras() {
      const o = { trajetos: this.trajetos };
      if (this.escada && this.escada.historico.length) {
        const ssd50 = this.escada.ssd50();
        const iki = this.ikisIr.length ? U.median(this.ikisIr) : null;
        /* Lentidão proativa: se o jogador vai ficando mais lento ao
           longo do set, a medida deixa de ser interpretável. */
        let proativa = 0;
        if (this.ordemIkis.length >= 10) {
          const k = Math.floor(this.ordemIkis.length / 3);
          const a = U.median(this.ordemIkis.slice(0, k).map(x => x.v));
          const b = U.median(this.ordemIkis.slice(-k).map(x => x.v));
          proativa = a > 0 ? (b - a) / a : 0;
        }
        const taxa = this.escada.taxaParada();
        const nP = this.escada.historico.length;
        o.aborto = {
          antecedencia: iki != null ? Math.round(iki - ssd50) : null,
          ssd50: Math.round(ssd50), ikiIr: iki != null ? Math.round(iki) : null,
          taxa, nParada: nP, escada: this.escada.historico.slice(-40),
          proativa: +proativa.toFixed(2),
          valido: nP >= 6 && taxa >= 0.25 && taxa <= 0.75 && Math.abs(proativa) < 0.25,
          porqueInvalido: nP < 6 ? 'poucas tentativas de parada'
            : (taxa < 0.25 || taxa > 0.75) ? 'a escada não achou o ponto de equilíbrio'
            : Math.abs(proativa) >= 0.25 ? 'você foi ficando mais lento durante o set — isso falsifica a medida'
            : null,
        };
      }
      if (this.desviosSet) o.compasso = U.mean(this.desviosSet);
      if (this.escadaViva) {
        o.escadaViva = { ...this.escadaViva.limiar(), origem: this.escadaOrigem,
                         faixa: (this.cfg.escadaViva || {}).faixa || null };
      }
      return o;
    }
  }

  /* ------------------------------------------------------------
     Transforma uma rota mantendo a ESTRUTURA e trocando os botões.
     É o "espelho quebrado" do lado mecânico: se o desempenho desaba
     aqui, o que foi aprendido foi a sequência específica e não o
     padrão de movimento.
     ------------------------------------------------------------ */
  const TROCA = { s1: 's2', s2: 's1', s3: 's3', aa: 'aa', flash: 'flash' };
  const TROCA2 = { s1: 's3', s3: 's1', s2: 's2', aa: 'aa', flash: 'flash' };
  function transformarRota(rota, agressiva) {
    const mapa = agressiva ? (Math.random() < 0.5 ? TROCA : TROCA2) : TROCA;
    const nova = rota.map(k => mapa[k] || k);
    return nova.join('') === rota.join('') ? rota.map(k => TROCA2[k] || k) : nova;
  }

  /* ============================================================
     2) LEITURA — oclusão temporal
     ============================================================ */
  class MotorLeitura extends MotorBase {
    constructor(hud, cfg, api) {
      super(hud, cfg, api);
      this.estado = 'ocioso';
      this.sorteio = U.dealer(cfg.sinais);
      const js = cfg.janelas || [300];
      const lista = [];
      for (let i = 0; i < this.n; i++) lista.push(js[i % js.length]);
      this.ordemJanela = U.shuffle(lista);
    }
    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++; this.placar();
      this.hud.limparMarcas(); this.hud.setOverlay(null);
      this.sinal = this.sorteio();
      this.janela = this.ordemJanela[this.i - 1];
      this.estado = 'esperando';
      this.T.after(U.rnd(this.cfg.isiMin ?? 650, this.cfg.isiMax ?? 2000), () => this.mostrar());
    }
    mostrar() {
      if (!this.ativo) return;
      this.estado = 'ativo'; this.tSinal = U.now();
      U.Sfx.alert();
      this.hud.setOverlay({ texto: this.sinal.icone, sub: this.sinal.texto,
                            tam: 0.28, cor: '#ff8fa3', fundo: 'rgba(6,9,16,.45)' });
      this.T.after(this.janela, () => {
        if (this.estado !== 'ativo') return;
        this.hud.setOverlay({ texto: '▚▚▚', sub: 'decida com o que viu', tam: 0.16,
                              cor: '#8fa3c4', fundo: 'rgba(6,9,16,.58)' });
      });
      const lim = this.cfg.limite ?? 1700;
      this.T.after(lim, () => {
        if (this.estado !== 'ativo') return;
        const esperava = this.sinal.r === 'nada';
        this.resolver(esperava, esperava ? null : 'lento', lim);
      });
    }
    responder(tipo) {
      if (this.estado === 'esperando') return this.resolver(false, 'pressa', 0);
      if (this.estado !== 'ativo') return;
      const rt = U.now() - this.tSinal;
      const ok = tipo === this.sinal.r;
      this.resolver(ok, ok ? null : (this.sinal.r === 'nada' ? 'pressa' : 'leitura'), rt, tipo);
    }
    press(e) {
      if (!this.ativo || !e.id) return;
      if (e.dx != null) this.toques.push({ id: e.id, dx: e.dx, dy: e.dy });
      if (e.id === 's3') return this.responder('ult');
      if (e.id === 'flash') return this.responder('inv');
      if (e.id === 'aa' || e.id === 's1') return this.responder('seguir');
    }
    joy(j) {
      if (!this.ativo) return;
      if (j.mag > 0.55 && j.dir != null && j.dir >= 3 && j.dir <= 5) this.responder('recuar');
    }
    resolver(ok, err, rt, dado) {
      if (this.estado === 'fim' || this.estado === 'confianca') return;
      this.T.clear();
      this._pend = { ok, err, rt, dado };
      if (this.cfg.confianca) {
        this.hud.setOverlay(null);
        return this.perguntarConfianca((conf) => this.fecharLeitura(conf));
      }
      this.fecharLeitura(null);
    }
    campo(e) {
      if (this.estado === 'confianca' && e.carta && e.carta.conf != null)
        this.responderConfianca(e.carta.conf);
    }
    fecharLeitura(conf) {
      const { ok, err, rt, dado } = this._pend;
      this.estado = 'fim';
      this.anota({ k: 'leitura', ok, err, rt: ok ? rt : null,
                   x: { j: this.janela, s: this.sinal.id, r: dado || null,
                        conf: conf != null ? conf : undefined } });
      ok ? (U.Sfx.perfect(), U.Haptic.good()) : (U.Sfx.miss(), U.Haptic.bad());
      if (this.retorno) {
        this.hud.setOverlay({
          texto: ok ? `${Math.round(rt)}ms` : CO.RESPOSTAS[this.sinal.r].rotulo,
          sub: ok ? this.sinal.porque : `Certo era ${CO.RESPOSTAS[this.sinal.r].rotulo}. ${this.sinal.porque}`,
          tam: 0.12, cor: ok ? '#6ee7a8' : '#ff8fa3', fundo: 'rgba(6,9,16,.62)',
        });
      } else {
        this.hud.setOverlay({ texto: '·', tam: 0.10, cor: '#66748f', fundo: 'rgba(6,9,16,.35)' });
      }
      this.diz(ok ? 'leitura certa' : 'leitura errada', ok ? 'ok' : 'erro',
               this.retorno ? this.sinal.porque : null);
      this.placar();
      this.T.after(this.retorno ? (ok ? 850 : 1700) : 500, () => this.proxima());
    }
    extras() {
      const por = {};
      for (const r of this.reg) {
        const j = r.x && r.x.j; if (!j) continue;
        const e = por[j] || (por[j] = { k: 0, n: 0 });
        e.k += r.ok ? 1 : 0; e.n++;
      }
      return { curva: Object.entries(por).map(([j, e]) => ({ janela: +j, acc: e.k / e.n, n: e.n }))
                        .sort((a, b) => b.janela - a.janela) };
    }
  }

  /* ============================================================
     3) DECISÃO — perceber · interpretar · decidir · executar · reavaliar
     ============================================================ */
  class MotorDecisao extends MotorBase {
    constructor(hud, cfg, api) {
      super(hud, cfg, api);
      this.dif = cfg.dif || 5;
      this.estado = 'ocioso';
      this.decisoes = [];
    }

    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++; this.placar();
      this.sit = CO.gerarSituacao(this.dif, null,
        this.cfg.soArmadilhas ? { armadilha: true } : {});
      if (this.cfg.rotaFixa) this.sit.rota = this.cfg.rotaFixa.slice();
      this.hud.limparMarcas(); this.hud.campo = [];
      this.fasePercepcao();
    }

    /* 1 — percepção com oclusão */
    fasePercepcao() {
      this.estado = 'percepcao';
      this.montarTabuleiro(this.sit.unid, false);
      this.hud.setOverlay({ texto: '', sub: this.sit.contexto, cx: 0.36, cy: 0.09,
                            tam: 0.01, fundo: false, subCor: '#c4b5fd' });
      this.T.after(this.cfg.leitura ?? 2000, () => {
        if (this.estado !== 'percepcao') return;
        /* a cena some: a decisão é com o que ficou na cabeça */
        for (const c of this.hud.campo) { c.mascarado = true; c.nota = '···'; }
        this.faseDecisao();
      });
    }

    montarTabuleiro(lista, mascarado) {
      const larg = 0.115, alt = 0.32, gap = 0.022;
      const total = lista.length * larg + (lista.length - 1) * gap;
      const x0 = 0.05 + (0.60 - total) / 2;
      this.hud.campo = lista.map((u, k) => ({
        id: u.id, icone: u.oculto ? '❔' : u.icone,
        titulo: u.oculto ? '???' : u.nome,
        hp: u.oculto ? null : u.hp,
        nota: mascarado ? '···' : (u.oculto ? 'estado desconhecido' : u.nota),
        notaCor: u.oculto ? '#8fa3c4' : (u.est.id === 'ultPronta' ? '#ffd479' : '#ff8fa3'),
        x: x0 + k * (larg + gap), y: 0.20, w: larg, h: alt,
        marca: u.oculto ? '#5b708f' : null, dados: u,
      }));
    }

    /* 2 — decisão */
    faseDecisao() {
      this.estado = 'decisao';
      this.tDec = U.now();
      const ops = this.sit.opcoes;
      const larg = 0.155, gap = 0.028;
      const total = ops.length * larg + (ops.length - 1) * gap;
      const x0 = 0.05 + (0.60 - total) / 2;
      this.hud.campo = this.hud.campo.concat(ops.map((o, k) => ({
        id: 'op' + k, icone: o.icone, titulo: o.texto, opcao: o,
        x: x0 + k * (larg + gap), y: 0.60, w: larg, h: 0.26, marca: '#e8c46a',
      })));
      this.hud.setOverlay({ texto: '', sub: 'entrar, esperar ou recuar?', cx: 0.36, cy: 0.09,
                            tam: 0.01, fundo: false, subCor: '#ffd479' });
      this.T.after(this.cfg.tempoDecisao ?? 2600, () => {
        if (this.estado === 'decisao') this.escolher(null);
      });
    }

    campo(e) {
      if (this.estado === 'confianca' && e.carta && e.carta.conf != null)
        return this.responderConfianca(e.carta.conf);
      if (this.estado === 'decisao' && e.carta.opcao) return this.escolher(e.carta);
    }

    escolher(carta) {
      if (this.estado !== 'decisao') return;
      this.estado = 'resolvendo'; this.T.clear();
      const rt = U.now() - this.tDec;
      const escolha = carta ? carta.opcao.id : null;
      const decOk = escolha === this.sit.certa;
      this.decOk = decOk; this.decRt = rt; this.escolha = escolha;
      this.decisoes.push({ ok: decOk, rt, certa: this.sit.certa, feita: escolha });
      this._decisao = { decOk, rt, escolha, carta };
      decOk ? U.Sfx.perfect() : U.Sfx.miss();
      this.hud.campo = this.hud.campo.filter(c => !c.opcao || c === carta);
      this.hud.setOverlay(null);
      if (this.cfg.confianca) return this.perguntarConfianca((cf) => this.aposConfianca(cf));
      this.aposConfianca(null);
    }

    aposConfianca(conf) {
      const { decOk, rt, escolha, carta } = this._decisao;
      this.confAtual = conf;
      MD.gravar({ d: this.cfg.drillId, mo: this.mo, k: 'decisao', ok: decOk, rt,
                  err: decOk ? null : 'leitura', dif: this.dif, ref: this.ref,
                  x: { certa: this.sit.certa, feita: escolha, ocultos: this.sit.ocultos,
                       vr: this.sit.variante, pista: this.sit.pista,
                       conf: conf != null ? conf : undefined } });
      if (this.sit.ocultos > 0 && this.retorno) return this.revelar();
      this.seguirDepoisDaDecisao();
    }

    /* ------------------------------------------------------------
       REVELAÇÃO — o passo que faltava no fluxo.
       Perceber → interpretar → decidir → EXECUTAR → revelar o resto.
       Mostrar depois o que estava escondido é o que permite separar
       "decidi errado" de "decidi bem com o que dava para ver".
       ------------------------------------------------------------ */
    revelar() {
      this.estado = 'revelando';
      const ocultos = this.sit.unid.filter(u => u.oculto);
      for (const c of this.hud.campo) {
        const u = c.dados;
        if (!u || !u.oculto) continue;
        c.icone = u.icone; c.titulo = u.nome; c.hp = u.hp;
        c.nota = u.nota || 'sem estado'; c.marca = '#c98500'; c.pulso = 1;
      }
      const mudava = ocultos.some(u => u.vAmeaca > 1.1 || u.vAbate > 1.1);
      this.hud.setOverlay({
        texto: '', cx: 0.36, cy: 0.80, tam: 0.01, fundo: false, subCor: '#ffd479',
        sub: mudava
          ? `O que estava escondido importava: ${ocultos.map(u => u.nome).join(' e ')}.`
          : `O que estava escondido não mudava a conta.`,
      });
      U.Sfx.tick();
      this.T.after(1500, () => { this.hud.setOverlay(null); this.seguirDepoisDaDecisao(); });
    }

    seguirDepoisDaDecisao() {
      const { decOk, rt, escolha, carta } = this._decisao;
      const vaiExecutar = decOk && this.sit.certa === 'entrar';
      if (this.cfg.explicaNaHora !== false && this.retorno) {
        this.hud.setOverlay({
          texto: decOk ? '✔' : '✘',
          sub: carta ? this.sit.porque : 'Não decidir também é decidir — e tarde demais.',
          tam: 0.13, cor: decOk ? '#6ee7a8' : '#ff8fa3', fundo: 'rgba(6,9,16,.58)', cx: 0.36, cy: 0.78,
        });
      }
      if (!vaiExecutar) {
        this.anota({ k: 'integra', ok: decOk, err: decOk ? null : 'leitura', rt,
                     x: { fase: 'so_decisao', decOk: decOk ? 1 : 0, vr: this.sit.variante,
                          conf: this.confAtual != null ? this.confAtual : undefined } });
        this.placar();
        return this.T.after(this.retorno ? 1600 : 700, () => { this.hud.campo = []; this.proxima(); });
      }
      this.T.after(this.retorno ? 1300 : 600, () => { this.hud.setOverlay(null); this.faseExecucao(); });
    }

    /* 3 — execução */
    faseExecucao() {
      this.estado = 'execucao';
      this.hud.campo = this.hud.campo.filter(c => !c.opcao);
      this.rota = this.sit.rota.slice();
      this.passo = 0; this.t0 = U.now();
      this.deveParar = false; this.revFeita = false;
      this.gatilhoRev = Math.max(1, Math.floor(this.rota.length / 2));
      this.hud.limparMarcas();
      this.hud.marcar(this.rota[0], { destaque: true, cor: '#ffd479' });
      this.hud.setOverlay({ texto: 'EXECUTE', sub: this.rota.map(k => (H.getHud()[k] || {}).curto || k).join(' › '),
                            tam: 0.11, cor: '#c4b5fd', fundo: 'rgba(5,8,14,.26)' });
      this.T.after(480, () => { if (this.estado === 'execucao') this.hud.setOverlay(null); });
      if (this.sit.reviravolta) {
        this.T.after(U.rnd(1500, 2300), () => {
          if (this.estado === 'execucao' && !this.revFeita) this.reviravolta();
        });
      }
      this.T.after(1200 + this.rota.length * 1100, () => {
        if (this.estado === 'execucao') this.fimExec(false, 'lento');
      });
    }

    /* 4 — reavaliação */
    reviravolta() {
      if (this.revFeita) return;
      this.revFeita = true;
      const r = this.sit.reviravolta;
      this.deveParar = r.parar; this.tParada = U.now();
      U.Sfx.alert(); U.Haptic.stop();
      this.hud.setOverlay({ texto: r.parar ? 'PARAR' : 'SEGUE', sub: r.texto, tam: 0.16,
                            cor: r.parar ? '#ff5470' : '#6ee7a8',
                            fundo: r.parar ? 'rgba(40,4,12,.52)' : 'rgba(4,28,18,.42)' });
      if (r.parar) {
        this.hud.limparMarcas();
        this.hud.marcar('joy', { destaque: true, dirAlvo: 4 });
        this.T.after(this.cfg.janelaFreio ?? 800, () => {
          if (this.estado !== 'execucao' || !this.deveParar) return;
          this.estado = 'fim'; this.T.clear();
          this.anota({ k: 'integra', ok: true, rt: this.cfg.janelaFreio ?? 800,
                       x: { fase: 'freio', decOk: 1 } });
          U.Sfx.perfect();
          if (this.retorno) this.hud.setOverlay({ texto: '✔ PAROU', sub: r.porque, tam: 0.12,
                                                  cor: '#6ee7a8', fundo: 'rgba(6,9,16,.58)' });
          this.diz('freio certo', 'ok', r.porque);
          this.placar();
          this.T.after(this.retorno ? 1700 : 700, () => { this.hud.campo = []; this.proxima(); });
        });
      } else {
        this.T.after(700, () => {
          if (this.estado !== 'execucao') return;
          this.hud.setOverlay(null);
          if (this.passo < this.rota.length) this.hud.marcar(this.rota[this.passo], { destaque: true, cor: '#ffd479' });
          else this.fimExec(true, null);
        });
      }
    }

    press(e) {
      if (this.estado !== 'execucao' || !e.id || e.id.startsWith('q')) return;
      if (e.dx != null) this.toques.push({ id: e.id, dx: e.dx, dy: e.dy });
      if (this.deveParar) {
        const r = this.sit.reviravolta;
        this.hud.erro(e.id); U.Sfx.miss(); U.Haptic.bad();
        this.estado = 'fim'; this.T.clear();
        this.anota({ k: 'integra', ok: false, err: 'freio', rt: U.now() - this.tParada,
                     x: { fase: 'freio', decOk: 1 } });
        this.diz('continuou após o sinal', 'erro', r.porque);
        if (this.retorno) this.hud.setOverlay({ texto: '✘', sub: r.porque, tam: 0.13,
                                                cor: '#ff8fa3', fundo: 'rgba(6,9,16,.58)' });
        this.placar();
        return this.T.after(this.retorno ? 2000 : 800, () => { this.hud.campo = []; this.proxima(); });
      }
      const esperado = this.rota[this.passo];
      if (e.id !== esperado) { this.hud.erro(e.id); U.Sfx.miss(); return this.fimExec(false, 'sequencia'); }
      this.hud.acerto(e.id); U.Sfx.hit();
      this.passo++;
      this.hud.limparMarcas();
      if (this.sit.reviravolta && !this.revFeita && this.passo >= this.gatilhoRev) return this.reviravolta();
      if (this.passo < this.rota.length) this.hud.marcar(this.rota[this.passo], { destaque: true, cor: '#ffd479' });
      else this.fimExec(true, null);
    }

    fimExec(ok, err) {
      if (this.estado !== 'execucao') return;
      this.estado = 'fim'; this.T.clear();
      const total = U.now() - this.t0;
      this.anota({ k: 'integra', ok, err, tot: ok ? total : null, rt: total,
                   x: { fase: 'execucao', decOk: 1, vr: this.sit.variante,
                        conf: this.confAtual != null ? this.confAtual : undefined } });
      ok ? U.Sfx.perfect() : U.Sfx.miss();
      if (this.retorno) {
        this.hud.setOverlay({ texto: ok ? `✔ ${Math.round(total)}ms` : '✘ execução falhou',
                              sub: ok ? 'Decisão certa e execução limpa.' : 'A decisão estava certa; a mão não acompanhou.',
                              tam: 0.12, cor: ok ? '#6ee7a8' : '#ff8fa3', fundo: 'rgba(6,9,16,.55)' });
      }
      this.diz(ok ? 'execução limpa' : 'execução falhou', ok ? 'ok' : 'erro');
      this.placar();
      this.T.after(this.retorno ? 1500 : 650, () => { this.hud.campo = []; this.proxima(); });
    }

    extras() {
      const n = this.decisoes.length;
      if (!n) return {};
      const k = this.decisoes.filter(x => x.ok).length;
      return { decisao: { ...S.wilson(k, n), rt: U.median(this.decisoes.filter(x => x.ok).map(x => x.rt)) } };
    }
  }

  U.E = { MotorBase, MotorSequencia, MotorLeitura, MotorDecisao };

})(window.U);
