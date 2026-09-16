/* ============================================================
   engines.js — motores de exercício
   Sequencia | Escolha | Prioridade | Cenario
   Todos falam a mesma língua: Gravador -> pontuar() -> Coach
   ============================================================ */
'use strict';
(function (U) {

  const H = U.HUD, M = U.M;

  class MotorBase {
    constructor(hud, cfg, api) {
      this.hud = hud;
      this.cfg = cfg;
      this.api = api;                   // {fim, info, mensagem, dica}
      this.T = new U.Timers();
      this.g = new M.Gravador(cfg.drillId, cfg);
      this.ativo = false;
      this.i = 0;
      this.n = cfg.tentativas || 10;
    }
    iniciar() {
      this.ativo = true;
      this.hud.limparMarcas();
      this.hud.travado = false;
      this.proxima();
    }
    parar() {
      this.ativo = false;
      this.T.clear();
      this.hud.limparMarcas();
      this.hud.setOverlay(null);
      this.hud.setAlvo(null);
      this.hud.quadrantes = false;
      this.hud.quadAceso = -1;
      this.hud.campo = [];
      this.hud.trilhas = [];
    }
    concluir() { this.parar(); this.api.fim(this.g); }
    placar() {
      this.api.info({ i: this.i, n: this.n, ok: this.g.acertos, acc: this.g.acuracia });
    }
    /* eventos vindos da HudSurface */
    press() {}
    joy() {}
    campo() {}
  }

  /* ============================================================
     1) MOTOR SEQUÊNCIA
     Cobre: toque único, pontes de transição, rotas, compasso,
     janela de consistência, movimento, dupla tarefa, ruído,
     rota mutante e freio.
     ============================================================ */
  class MotorSequencia extends MotorBase {
    constructor(hud, cfg, api) {
      super(hud, cfg, api);
      this.estado = 'ocioso';
      this.pisoIki = cfg.pisoIki || 105;
      this.rotas = cfg.rotas && cfg.rotas.length ? cfg.rotas : [cfg.rota || ['s1']];
      this.sorteio = U.dealer(this.rotas);
      this.amostrasMov = [];
    }

    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++;
      this.placar();

      this.rota = this.sorteio().slice();
      this.passo = 0;
      this.marcas = [];
      this.erroTrial = null;
      this.deveParar = false;
      this.tParada = 0;
      this.secOk = null; this.secRt = null; this.secEsperado = -1; this.secT = 0;
      this.amostrasMov = [];
      this.trocou = false;

      this.hud.limparMarcas();
      this.hud.quadrantes = !!this.cfg.dupla;
      this.hud.quadAceso = -1;

      const c = this.cfg;
      const mostra = c.mostrarRota === 'nunca' ? false
                   : c.mostrarRota === 'antes' ? true
                   : true;
      if (mostra) {
        this.hud.setOverlay({
          texto: this.rota.map(k => H.NOMES[k] ? (H.getHud()[k].curto) : k).join(' › '),
          sub: c.mostrarRota === 'antes' ? 'memorize — vai sumir' : 'execute nesta ordem',
          tam: 0.15, cor: '#c4b5fd',
        });
      }
      const espera = mostra ? (c.tempoLeitura || 1200) : 350;
      this.estado = 'preparo';
      this.T.after(espera, () => this.armar());
    }

    armar() {
      if (!this.ativo) return;
      this.hud.setOverlay(null);
      if (this.cfg.mostrarRota === 'sempre') this.destacarProximo();
      this.estado = 'esperando';
      const isi = U.rnd(this.cfg.isiMin ?? 400, this.cfg.isiMax ?? 1150);
      this.T.after(isi, () => this.ir());
    }

    ir() {
      if (!this.ativo) return;
      this.estado = 'executando';
      this.t0 = U.now();
      this.tUltimo = this.t0;
      this.ikis = [];
      U.Sfx.cue();
      this.hud.setOverlay({ texto: 'VAI', tam: 0.14, cor: '#6ee7a8', fundo: 'rgba(5,8,14,.25)' });
      this.T.after(220, () => { if (this.estado === 'executando') this.hud.setOverlay(null); });
      this.destacarProximo();

      const c = this.cfg;

      /* compasso: batidas audíveis, uma por passo */
      if (c.modo === 'compasso') {
        this.beats = [];
        for (let k = 0; k < this.rota.length; k++) {
          const tb = this.t0 + (k + 1) * c.beat;
          this.beats.push(tb);
          this.T.after((k + 1) * c.beat, () => {
            if (this.estado !== 'executando') return;
            k === 0 ? U.Sfx.beatStrong() : U.Sfx.beat();
          });
        }
      }

      /* movimento obrigatório durante a execução */
      if (c.mover) {
        this.dirAlvo = U.ri(0, 7);
        this.hud.marcar('joy', { destaque: true, dirAlvo: this.dirAlvo });
        this.amostrador = this.T.every(70, () => {
          if (this.estado !== 'executando') return;
          const j = this.hud.joyInfo();
          let dentro = 0;
          if (j.mag > 0.35 && j.dir != null) {
            const d = Math.min(Math.abs(j.dir - this.dirAlvo), 8 - Math.abs(j.dir - this.dirAlvo));
            dentro = d <= (c.tolDir ?? 1) ? 1 : 0;
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

      /* dupla tarefa: ameaça pisca num quadrante da mão esquerda */
      if (c.dupla) {
        const quando = U.rnd(180, Math.max(400, (c.alvoMs || 1200) * 0.7));
        this.T.after(quando, () => {
          if (this.estado !== 'executando') return;
          this.secEsperado = U.ri(0, 3);
          this.secT = U.now();
          this.hud.quadAceso = this.secEsperado;
          U.Sfx.tick();
          this.T.after(c.duplaVisivel ?? 420, () => { this.hud.quadAceso = -1; });
        });
      }

      /* ruído visual */
      if (c.ruido) {
        this.T.every(Math.max(120, 420 - c.ruido * 90), () => {
          if (this.estado === 'executando') this.hud.ruido(c.ruido);
        });
      }

      /* rota mutante */
      if (c.mutante && Math.random() < c.mutante) {
        const quando = U.rnd(250, 900);
        this.T.after(quando, () => {
          if (this.estado !== 'executando' || this.passo >= this.rota.length - 1) return;
          const resto = this.rota.slice(this.passo);
          const novo = U.shuffle(['s1', 's2', 's3', 'aa']).filter(k => k !== resto[0]).slice(0, resto.length);
          this.rota = this.rota.slice(0, this.passo).concat(novo);
          this.trocou = true;
          U.Sfx.alert();
          this.hud.setOverlay({ texto: 'TROCA', sub: novo.map(k => H.getHud()[k].curto).join(' › '),
                                tam: 0.11, cor: '#ffd479', fundo: 'rgba(5,8,14,.30)' });
          this.T.after(620, () => { if (this.estado === 'executando') this.hud.setOverlay(null); });
          this.destacarProximo();
        });
      }

      /* freio: sinal de perigo no meio da rota */
      if (c.freio && Math.random() < c.freio) {
        const passoAlvo = U.ri(1, Math.max(1, this.rota.length - 1));
        this.freioNoPasso = passoAlvo;
      } else {
        this.freioNoPasso = -1;
      }

      const lim = c.deadline || (c.modo === 'compasso'
        ? (this.rota.length + 1.6) * c.beat
        : 900 + this.rota.length * 900);
      this.T.after(lim, () => {
        if (this.estado !== 'executando') return;
        this.encerrar(false, this.deveParar ? null : 'lento');
      });
    }

    destacarProximo() {
      if (this.cfg.mostrarRota !== 'sempre') return;
      this.hud.limparMarcas();
      if (this.cfg.mover && this.dirAlvo != null) this.hud.marcar('joy', { destaque: true, dirAlvo: this.dirAlvo });
      const k = this.rota[this.passo];
      if (k) this.hud.marcar(k, { destaque: true, cor: '#ffd479' });
    }

    dispararFreio() {
      this.deveParar = true;
      this.tParada = U.now();
      U.Sfx.stop(); U.Haptic.stop();
      this.hud.limparMarcas();
      this.hud.setOverlay({
        texto: 'PARAR', sub: U.pick(this.cfg.motivosFreio || ['3 inimigos pela lateral', 'sua ultimate não sai a tempo', 'o suporte está em cima de você']),
        tam: 0.20, cor: '#ff5470', fundo: 'rgba(40,4,12,.55)',
      });
      this.T.after(this.cfg.janelaFreio ?? 750, () => {
        if (this.estado !== 'executando' || !this.deveParar) return;
        // segurou: acerto
        this.hud.setOverlay(null);
        this.encerrar(true, null, { tipo: 'parar', latencia: this.cfg.janelaFreio ?? 750 });
      });
      // recuo com o analógico dá bônus de precisão
      this.T.after(60, () => { this.hud.marcar('joy', { destaque: true, dirAlvo: 4 }); });
    }

    press(e) {
      if (!this.ativo) return;
      if (this.estado === 'esperando' || this.estado === 'preparo') {
        if (e.id && e.id.startsWith('q')) return;
        U.Sfx.miss(); this.hud.erro(e.id);
        return this.encerrar(false, 'antecipado');
      }
      if (this.estado !== 'executando') return;

      /* resposta da tarefa secundária (mão esquerda) */
      if (e.id && e.id.startsWith('q')) {
        if (this.secEsperado < 0) { this.secOk = false; return; }
        if (this.secOk == null) {
          this.secOk = (Number(e.id.slice(1)) === this.secEsperado);
          this.secRt = U.now() - this.secT;
          U.Sfx.tick();
        }
        return;
      }

      const t = U.now();

      /* estamos no modo "parar": qualquer habilidade é erro de freio */
      if (this.deveParar) {
        this.hud.erro(e.id); U.Sfx.miss();
        return this.encerrar(false, 'freio', { tipo: 'parar', latencia: t - this.tParada });
      }

      const esperado = this.rota[this.passo];
      const iki = t - this.tUltimo;

      if (e.id !== esperado) {
        this.hud.erro(e.id); U.Sfx.miss(); U.Haptic.bad();
        return this.encerrar(false, this.classificarErro(e, esperado, iki));
      }

      /* acerto de passo */
      this.marcas.push({ id: e.id, t, precisao: e.precisao, iki, rel: e.rel });
      if (this.passo > 0) this.ikis.push(iki);
      this.tUltimo = t;

      let desvio = null;
      if (this.cfg.modo === 'compasso') {
        desvio = t - this.beats[this.passo];
        const j = this.cfg.janela || 140;
        if (Math.abs(desvio) > j * 1.9) {
          this.hud.erro(e.id); U.Sfx.miss();
          return this.encerrar(false, desvio < 0 ? 'antecipado' : 'lento', { desvio });
        }
        this.desvios = this.desvios || [];
        this.desvios.push(desvio);
        Math.abs(desvio) <= j * 0.45 ? U.Sfx.perfect() : U.Sfx.hit();
      } else {
        U.Sfx.hit();
      }
      this.hud.acerto(e.id); U.Haptic.good();
      this.passo++;

      if (this.passo === this.freioNoPasso) { this.dispararFreio(); return; }

      if (this.passo >= this.rota.length) {
        if (this.cfg.modo === 'janela') {
          const total = t - this.t0;
          const [lo, hi] = this.cfg.faixa || [700, 1100];
          const dentro = total >= lo && total <= hi;
          return this.encerrar(dentro, dentro ? null : (total < lo ? 'velocidade' : 'lento'), { total });
        }
        return this.encerrar(true, null);
      }
      this.destacarProximo();
    }

    classificarErro(e, esperado, iki) {
      if (!e.id) {
        return (e.perto && e.rel < 2.4) ? 'hud' : 'mira';
      }
      const hud = H.getHud();
      const a = hud[esperado], b = hud[e.id];
      if (a && b) {
        const folga = H.folgaMM(a, b);
        if (folga < 5.2) return 'hud';               // botões colados: culpa do layout
        if (H.ARMADILHAS.includes(e.id) && e.rel > 0.55) return 'hud';
      }
      if (iki < this.pisoIki) return 'velocidade';
      if (this.cfg.mover) {
        const j = this.hud.joyInfo();
        if (!j.ativo || j.mag < 0.3) return 'posicionamento';
      }
      return 'memoria';
    }

    encerrar(ok, erro, extra = {}) {
      if (this.estado === 'fim' || this.estado === 'ocioso') return;
      this.estado = 'fim';
      this.T.clear();
      this.hud.limparMarcas();
      this.hud.setOverlay(null);
      this.hud.quadAceso = -1;

      const total = extra.total ?? (this.t0 ? U.now() - this.t0 : null);
      const movDentro = this.amostrasMov.length ? U.mean(this.amostrasMov) : null;
      const precisao = this.marcas.length ? U.mean(this.marcas.map(m => m.precisao)) : null;

      /* na dupla tarefa, errar a leitura também conta como falha */
      let okFinal = ok;
      if (this.cfg.dupla && ok && this.secEsperado >= 0 && this.secOk !== true) {
        okFinal = false; erro = erro || 'decisao';
      }
      if (this.cfg.mover && okFinal && movDentro != null && movDentro < (this.cfg.movMin ?? 0.55)) {
        okFinal = false; erro = 'posicionamento';
      }

      this.g.add({
        ok: okFinal, erro,
        total: okFinal ? total : null,
        iki: this.ikis && this.ikis.length ? this.ikis : null,
        rt: extra.latencia != null ? extra.latencia : (this.ikis && this.ikis.length ? this.ikis[0] : total),
        precisao,
        alvo: this.rota.join('>'),
        carga: this.cfg.dupla ? 1 : 0,
        extra: {
          ...extra,
          tipo: extra.tipo || 'seguir',
          desvio: this.desvios && this.desvios.length ? U.mean(this.desvios.map(Math.abs)) : (extra.desvio ?? null),
          dentro: movDentro,
          secOk: this.secOk, secRt: this.secRt,
          trocou: this.trocou,
          passos: this.passo,
        },
      });
      this.desvios = null;

      const msg = okFinal
        ? (this.cfg.modo === 'compasso' ? 'no compasso' : total ? `${Math.round(total)}ms` : 'certo')
        : (M.ERROS[erro]?.nome || 'erro');
      this.api.mensagem(msg, okFinal ? 'ok' : 'erro', erro ? M.ERROS[erro]?.dica : null);
      okFinal ? U.Sfx.perfect() : null;

      this.placar();
      this.T.after(okFinal ? 520 : 900, () => this.proxima());
    }
  }

  /* ============================================================
     2) MOTOR ESCOLHA — reflexo com decisão, não cliques rápidos
     ============================================================ */
  const RESPOSTAS = {
    ult:     { id: 's3',    rotulo: 'ULT',      texto: 'Ultimate' },
    inv:     { id: 'flash', rotulo: 'INV',      texto: 'Invocador' },
    recuar:  { id: 'joy',   rotulo: 'RECUAR',   texto: 'Analógico para trás' },
    seguir:  { id: 'aa',    rotulo: 'SEGUIR',   texto: 'Continuar a pressão' },
    nada:    { id: null,    rotulo: 'NADA',     texto: 'Não responder' },
  };

  class MotorEscolha extends MotorBase {
    constructor(hud, cfg, api) {
      super(hud, cfg, api);
      this.estado = 'ocioso';
      this.sorteio = U.dealer(cfg.sinais);
    }
    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++; this.placar();
      this.hud.limparMarcas();
      this.hud.setOverlay(null);
      this.respondido = false;

      /* botões válidos ficam visíveis — o exercício é escolher, não caçar */
      for (const k of ['s3', 'flash', 'aa']) this.hud.marcar(k, { destaque: false });
      this.sinal = this.sorteio();
      this.estado = 'esperando';
      this.T.after(U.rnd(this.cfg.isiMin ?? 700, this.cfg.isiMax ?? 2100), () => this.mostrar());
    }
    mostrar() {
      if (!this.ativo) return;
      this.estado = 'ativo';
      this.tSinal = U.now();
      U.Sfx.alert();
      this.hud.setOverlay({
        texto: this.sinal.icone, sub: this.sinal.texto,
        tam: 0.30, cor: this.sinal.cor || '#ff5470', fundo: 'rgba(6,9,16,.45)',
      });
      if (this.cfg.mascara) {
        this.T.after(this.cfg.mascara, () => {
          if (this.estado !== 'ativo') return;
          this.hud.setOverlay({ texto: '?', sub: 'decida com o que viu', tam: 0.26, cor: '#8fa3c4', fundo: 'rgba(6,9,16,.45)' });
        });
      }
      const lim = this.cfg.limite ?? 1500;
      this.T.after(lim, () => {
        if (this.estado !== 'ativo') return;
        const esperava = this.sinal.resposta === 'nada';
        this.resolver(esperava, esperava ? null : 'lento', lim);
      });
    }
    responder(tipo) {
      if (this.estado !== 'ativo') {
        if (this.estado === 'esperando') { this.resolver(false, 'antecipado', 0); }
        return;
      }
      const rt = U.now() - this.tSinal;
      const ok = tipo === this.sinal.resposta;
      this.resolver(ok, ok ? null : (this.sinal.resposta === 'nada' ? 'antecipado' : 'decisao'), rt, tipo);
    }
    press(e) {
      if (!this.ativo || !e.id) return;
      if (e.id === 's3') return this.responder('ult');
      if (e.id === 'flash') return this.responder('inv');
      if (e.id === 'aa' || e.id === 's1') return this.responder('seguir');
    }
    joy(j) {
      if (!this.ativo) return;
      if (j.mag > 0.55 && j.dir != null && (j.dir === 3 || j.dir === 4 || j.dir === 5)) this.responder('recuar');
    }
    resolver(ok, erro, rt, dado) {
      if (this.estado === 'fim') return;
      this.estado = 'fim';
      this.T.clear();
      this.g.add({
        ok, erro, rt: ok ? rt : (erro === 'antecipado' ? null : rt),
        alvo: this.sinal.id, feito: dado || null,
        extra: { esperado: this.sinal.resposta, tipo: this.sinal.resposta === 'nada' ? 'parar' : 'seguir' },
      });
      ok ? (U.Sfx.perfect(), U.Haptic.good()) : (U.Sfx.miss(), U.Haptic.bad());
      this.hud.setOverlay({
        texto: ok ? `${Math.round(rt)}ms` : RESPOSTAS[this.sinal.resposta].rotulo,
        sub: ok ? this.sinal.porque : `Certo era: ${RESPOSTAS[this.sinal.resposta].texto}. ${this.sinal.porque}`,
        tam: 0.13, cor: ok ? '#6ee7a8' : '#ff8fa3', fundo: 'rgba(6,9,16,.60)',
      });
      this.placar();
      this.api.mensagem(ok ? 'leitura certa' : 'leitura errada', ok ? 'ok' : 'erro', this.sinal.porque);
      this.T.after(ok ? 900 : 1700, () => this.proxima());
    }
  }

  /* ============================================================
     3) MOTOR PRIORIDADE — quem morre primeiro, quem se respeita
     ============================================================ */
  const PAPEIS = {
    atirador: { icone: '🏹', abate: 1.00, ameaca: 0.85, nome: 'Atirador' },
    mago:     { icone: '🔮', abate: 0.95, ameaca: 0.90, nome: 'Mago' },
    assassino:{ icone: '🗡', abate: 0.72, ameaca: 1.00, nome: 'Assassino' },
    suporte:  { icone: '🛡', abate: 0.45, ameaca: 0.55, nome: 'Suporte' },
    tanque:   { icone: '🪨', abate: 0.18, ameaca: 0.72, nome: 'Tanque' },
  };
  const ESTADOS_ALVO = [
    { id: 'semInv',   nota: 'sem invocador', abate: 1.35, ameaca: 0.85, perigo: 0.7 },
    { id: 'ultPronta',nota: 'ultimate pronta', abate: 0.85, ameaca: 1.70, perigo: 1.8 },
    { id: 'escudado', nota: 'escudado',      abate: 0.50, ameaca: 1.00, perigo: 1.1 },
    { id: 'controlado',nota:'controlado',    abate: 1.45, ameaca: 0.35, perigo: 0.3 },
    { id: 'recuando', nota: 'recuando',      abate: 0.80, ameaca: 0.60, perigo: 0.6 },
    { id: 'naTorre',  nota: 'sob a torre',   abate: 0.55, ameaca: 1.05, perigo: 2.0 },
    { id: 'limpo',    nota: '',              abate: 1.00, ameaca: 1.00, perigo: 1.0 },
  ];
  const DISTS = [
    { id: 'perto', nota: 'perto',  abate: 1.25, ameaca: 1.35 },
    { id: 'media', nota: 'média',  abate: 1.00, ameaca: 1.00 },
    { id: 'longe', nota: 'longe',  abate: 0.55, ameaca: 0.60 },
  ];
  const PERGUNTAS = [
    { id: 'abate',   texto: 'Quem você abate primeiro?',        chave: 'abate'  },
    { id: 'respeito',texto: 'Quem você precisa respeitar AGORA?',chave: 'ameaca' },
    { id: 'evitar',  texto: 'Em quem você NÃO pode encostar?',   chave: 'perigo' },
  ];

  class MotorPrioridade extends MotorBase {
    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++; this.placar();
      this.hud.setOverlay(null);
      this.gerar();
      this.estado = 'ativo';
      this.tSinal = U.now();
      const lim = this.cfg.limite ?? 3500;
      this.T.after(lim, () => { if (this.estado === 'ativo') this.resolver(null, lim); });
    }

    gerar() {
      const nc = this.cfg.cartas ?? 3;
      const papeis = U.shuffle(Object.keys(PAPEIS)).slice(0, nc);
      this.pergunta = U.pick(this.cfg.perguntas
        ? PERGUNTAS.filter(p => this.cfg.perguntas.includes(p.id)) : PERGUNTAS);
      const cartas = papeis.map((p, k) => {
        const est = U.pick(this.cfg.semEstado ? [ESTADOS_ALVO[6]] : ESTADOS_ALVO);
        const dist = U.pick(DISTS);
        const hp = U.rnd(0.12, 0.98);
        return {
          id: 'c' + k, papel: p, estado: est, dist, hp,
          icone: PAPEIS[p].icone,
          titulo: PAPEIS[p].nome,
          nota: [dist.nota, est.nota].filter(Boolean).join(' · '),
          notaCor: est.id === 'ultPronta' ? '#ffd479' : est.id === 'controlado' ? '#6ee7a8' : '#8fa3c4',
        };
      });
      for (const c of cartas) {
        const P = PAPEIS[c.papel];
        c.pAbate  = P.abate * (1.45 - c.hp) * c.dist.abate * c.estado.abate;
        c.pAmeaca = P.ameaca * (0.55 + c.hp * 0.65) * c.dist.ameaca * c.estado.ameaca;
        c.pPerigo = (P.ameaca * 0.6 + 0.4) * (0.5 + c.hp) * c.dist.ameaca * c.estado.perigo;
      }
      const chave = { abate: 'pAbate', respeito: 'pAmeaca', evitar: 'pPerigo' }[this.pergunta.id];
      this.chave = chave;
      let melhor = cartas[0];
      for (const c of cartas) if (c[chave] > melhor[chave]) melhor = c;
      this.certo = melhor.id;

      /* posiciona as cartas na metade esquerda/central do campo */
      const larg = 0.135, alt = 0.46, gap = 0.028;
      const total = cartas.length * larg + (cartas.length - 1) * gap;
      const x0 = 0.05 + (0.62 - total) / 2;
      cartas.forEach((c, k) => { c.x = x0 + k * (larg + gap); c.y = 0.28; c.w = larg; c.h = alt; });
      this.hud.campo = cartas;
      this.hud.setOverlay({ texto: '', sub: this.pergunta.texto, cx: 0.36, cy: 0.13, tam: 0.01, fundo: false, subCor: '#ffd479' });
    }

    campo(e) {
      if (this.estado !== 'ativo') return;
      this.resolver(e.id, U.now() - this.tSinal);
    }

    resolver(escolha, rt) {
      this.estado = 'fim';
      this.T.clear();
      const ok = escolha === this.certo;
      const alvo = this.hud.campo.find(c => c.id === this.certo);
      for (const c of this.hud.campo) {
        c.marca = c.id === this.certo ? '#3ddc97' : (c.id === escolha ? '#ff5470' : null);
        c.selecionado = c.id === escolha;
      }
      this.g.add({ ok, erro: ok ? null : (escolha ? 'decisao' : 'lento'), rt, alvo: this.certo, feito: escolha,
                   extra: { pergunta: this.pergunta.id } });
      ok ? U.Sfx.perfect() : U.Sfx.miss();
      const P = PAPEIS[alvo.papel];
      const porque = this.pergunta.id === 'abate'
        ? `${P.nome} ${alvo.nota ? '(' + alvo.nota + ')' : ''} com ${Math.round(alvo.hp * 100)}% de vida é o melhor retorno por segundo de execução.`
        : this.pergunta.id === 'respeito'
        ? `${P.nome} ${alvo.nota ? '(' + alvo.nota + ')' : ''} é quem pode te punir primeiro se você entrar agora.`
        : `${P.nome} ${alvo.nota ? '(' + alvo.nota + ')' : ''}: encostar nele é dar o tempo que o time dele precisa.`;
      this.hud.setOverlay({ texto: ok ? '✔' : '✘', sub: porque, tam: 0.16,
                            cor: ok ? '#6ee7a8' : '#ff8fa3', fundo: 'rgba(6,9,16,.55)', cx: 0.36, cy: 0.80 });
      this.api.mensagem(ok ? 'prioridade certa' : 'prioridade errada', ok ? 'ok' : 'erro', porque);
      this.placar();
      this.T.after(ok ? 1400 : 2400, () => { this.hud.campo = []; this.proxima(); });
    }
  }

  /* ============================================================
     4) MOTOR CENÁRIO — luta inteira: ler, decidir, executar, frear
     ============================================================ */
  class MotorCenario extends MotorBase {
    constructor(hud, cfg, api) {
      super(hud, cfg, api);
      this.sorteio = U.dealer(cfg.cenarios);
      this.n = cfg.tentativas || cfg.cenarios.length;
    }
    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++; this.placar();
      this.cen = this.sorteio();
      this.faseLeitura();
    }

    faseLeitura() {
      this.hud.limparMarcas();
      this.hud.campo = [];
      this.montarTabuleiro(this.cen.inicio);
      this.hud.setOverlay({ texto: '', sub: this.cen.contexto, cx: 0.36, cy: 0.10, tam: 0.01, fundo: false, subCor: '#c4b5fd' });
      this.estado = 'leitura';
      this.T.after(this.cfg.leitura ?? 2200, () => this.faseDecisao());
    }

    montarTabuleiro(lista) {
      const larg = 0.115, alt = 0.34, gap = 0.022;
      const total = lista.length * larg + (lista.length - 1) * gap;
      const x0 = 0.05 + (0.60 - total) / 2;
      this.hud.campo = lista.map((u, k) => ({
        id: u.id || ('u' + k), icone: u.icone, titulo: u.nome, hp: u.hp,
        nota: u.nota || '', notaCor: u.aliado ? '#7fd4ff' : '#ff8fa3',
        x: x0 + k * (larg + gap), y: 0.22, w: larg, h: alt,
        marca: u.aliado ? '#2f6f9f' : null, dados: u,
      }));
    }

    faseDecisao() {
      this.estado = 'decisao';
      this.tDec = U.now();
      const ops = this.cen.opcoes;
      const larg = 0.16, gap = 0.03;
      const total = ops.length * larg + (ops.length - 1) * gap;
      const x0 = 0.05 + (0.60 - total) / 2;
      this.hud.campo = this.hud.campo.concat(ops.map((o, k) => ({
        id: 'op' + k, icone: o.icone || '›', titulo: o.texto, opcao: o,
        x: x0 + k * (larg + gap), y: 0.63, w: larg, h: 0.26,
        marca: '#e8c46a',
      })));
      this.hud.setOverlay({ texto: '', sub: this.cen.pergunta, cx: 0.36, cy: 0.10, tam: 0.01, fundo: false, subCor: '#ffd479' });
      this.T.after(this.cfg.tempoDecisao ?? 2600, () => {
        if (this.estado === 'decisao') this.escolher(null);
      });
    }

    campo(e) {
      if (this.estado === 'decisao' && e.carta.opcao) return this.escolher(e.carta);
      if (this.estado === 'alvo' && e.carta.dados && !e.carta.dados.aliado) return this.escolherAlvo(e.carta);
    }

    escolher(carta) {
      this.estado = 'resolvendo';
      this.T.clear();
      const rt = U.now() - this.tDec;
      const ok = !!carta && carta.opcao.certo;
      this.g.add({ ok, erro: ok ? null : (carta ? 'decisao' : 'lento'), rt,
                   alvo: 'decisao', feito: carta ? carta.opcao.texto : null, extra: { fase: 'decisao' } });
      ok ? U.Sfx.perfect() : U.Sfx.miss();
      this.hud.campo = this.hud.campo.filter(c => !c.opcao || c === carta);
      this.hud.setOverlay({
        texto: ok ? '✔' : '✘',
        sub: (carta ? carta.opcao.porque : 'Demorou demais. Em luta, não decidir já é decidir errado.'),
        tam: 0.14, cor: ok ? '#6ee7a8' : '#ff8fa3', fundo: 'rgba(6,9,16,.55)', cx: 0.36, cy: 0.80,
      });
      this.placar();
      const executa = ok && carta && carta.opcao.executa;
      this.T.after(1700, () => {
        this.hud.setOverlay(null);
        if (executa) this.faseExecucao(carta.opcao);
        else this.T.after(200, () => { this.hud.campo = []; this.proxima(); });
      });
    }

    faseExecucao(op) {
      this.estado = 'execucao';
      this.hud.campo = this.hud.campo.filter(c => !c.opcao);
      this.rota = op.rota || this.cen.rota || ['s1', 'aa', 's2'];
      this.passo = 0;
      this.t0 = U.now();
      this.deveParar = false;
      this.revFeita = false;
      // dispara no meio da rota: assim uma execução rápida não escapa do evento
      this.gatilhoRev = Math.max(1, Math.floor(this.rota.length / 2));
      this.hud.limparMarcas();
      this.hud.marcar(this.rota[0], { destaque: true, cor: '#ffd479' });
      this.hud.setOverlay({ texto: 'EXECUTE', sub: this.rota.map(k => H.getHud()[k].curto).join(' › '),
                            tam: 0.11, cor: '#c4b5fd', fundo: 'rgba(5,8,14,.28)' });
      this.T.after(500, () => { if (this.estado === 'execucao') this.hud.setOverlay(null); });

      if (this.cen.reviravolta) {
        // rede de segurança: se ele congelar e não tocar em nada, o evento vem assim mesmo
        this.T.after(U.rnd(1600, 2400), () => {
          if (this.estado !== 'execucao' || this.revFeita) return;
          this.reviravolta();
        });
      }
      this.T.after(1200 + this.rota.length * 1100, () => {
        if (this.estado === 'execucao') this.fimExecucao(false, 'lento');
      });
    }

    reviravolta() {
      if (this.revFeita) return;
      this.revFeita = true;
      const r = this.cen.reviravolta;
      this.deveParar = r.parar;
      this.tParada = U.now();
      U.Sfx.alert(); U.Haptic.stop();
      if (r.novo) {
        this.hud.campo.push({ id: 'novo', icone: r.novo.icone, titulo: r.novo.nome, hp: r.novo.hp,
                              nota: r.novo.nota, notaCor: '#ff5470', x: 0.52, y: 0.22, w: 0.115, h: 0.34, marca: '#ff5470' });
      }
      this.hud.setOverlay({ texto: r.parar ? 'PARAR' : 'SEGUE', sub: r.texto,
                            tam: 0.17, cor: r.parar ? '#ff5470' : '#6ee7a8',
                            fundo: r.parar ? 'rgba(40,4,12,.50)' : 'rgba(4,28,18,.40)' });
      if (r.parar) {
        this.hud.limparMarcas();
        this.hud.marcar('joy', { destaque: true, dirAlvo: 4 });
        this.T.after(this.cfg.janelaFreio ?? 800, () => {
          if (this.estado !== 'execucao' || !this.deveParar) return;
          this.g.add({ ok: true, rt: this.cfg.janelaFreio ?? 800, alvo: 'freio',
                       extra: { fase: 'freio', tipo: 'parar' } });
          U.Sfx.perfect();
          this.hud.setOverlay({ texto: '✔ PAROU', sub: r.porque, tam: 0.13, cor: '#6ee7a8', fundo: 'rgba(6,9,16,.55)' });
          this.api.mensagem('freio certo', 'ok', r.porque);
          this.placar();
          this.estado = 'fim';
          this.T.after(1800, () => { this.hud.campo = []; this.proxima(); });
        });
      } else {
        this.T.after(700, () => {
          if (this.estado !== 'execucao') return;
          this.hud.setOverlay(null);
          if (this.passo < this.rota.length) this.hud.marcar(this.rota[this.passo], { destaque: true, cor: '#ffd479' });
          else this.fimExecucao(true, null);
        });
      }
    }

    press(e) {
      if (this.estado !== 'execucao' || !e.id || e.id.startsWith('q')) return;
      if (this.deveParar) {
        this.hud.erro(e.id); U.Sfx.miss(); U.Haptic.bad();
        const r = this.cen.reviravolta;
        this.g.add({ ok: false, erro: 'freio', rt: U.now() - this.tParada, alvo: 'freio',
                     extra: { fase: 'freio', tipo: 'parar' } });
        this.api.mensagem('continuou depois do sinal', 'erro', r.porque);
        this.estado = 'fim'; this.T.clear(); this.placar();
        this.hud.setOverlay({ texto: '✘', sub: r.porque, tam: 0.14, cor: '#ff8fa3', fundo: 'rgba(6,9,16,.55)' });
        this.T.after(2200, () => { this.hud.campo = []; this.proxima(); });
        return;
      }
      const esperado = this.rota[this.passo];
      if (e.id !== esperado) {
        this.hud.erro(e.id); U.Sfx.miss();
        return this.fimExecucao(false, 'memoria');
      }
      this.hud.acerto(e.id); U.Sfx.hit();
      this.passo++;
      this.hud.limparMarcas();
      if (this.cen.reviravolta && !this.revFeita && this.passo >= this.gatilhoRev) return this.reviravolta();
      if (this.passo < this.rota.length) this.hud.marcar(this.rota[this.passo], { destaque: true, cor: '#ffd479' });
      else this.fimExecucao(true, null);
    }

    fimExecucao(ok, erro) {
      if (this.estado !== 'execucao') return;
      this.estado = 'fim';
      this.T.clear();
      const total = U.now() - this.t0;
      this.g.add({ ok, erro, total: ok ? total : null, rt: total, alvo: this.rota.join('>'), extra: { fase: 'execucao' } });
      ok ? U.Sfx.perfect() : U.Sfx.miss();
      this.hud.setOverlay({ texto: ok ? `✔ ${Math.round(total)}ms` : '✘ execução falhou',
                            sub: ok ? (this.cen.fecho || 'Entrada limpa.') : 'A decisão estava certa; a mão não acompanhou.',
                            tam: 0.12, cor: ok ? '#6ee7a8' : '#ff8fa3', fundo: 'rgba(6,9,16,.55)' });
      this.api.mensagem(ok ? 'execução limpa' : 'execução falhou', ok ? 'ok' : 'erro');
      this.placar();
      this.T.after(1700, () => { this.hud.campo = []; this.proxima(); });
    }
  }

  U.E = { MotorBase, MotorSequencia, MotorEscolha, MotorPrioridade, MotorCenario, RESPOSTAS, PAPEIS };

})(window.U);
