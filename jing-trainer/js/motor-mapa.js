/* ============================================================
   js/motor-mapa.js — o motor do exercício de visão de mapa

   Uma tentativa tem cinco fases, nesta ordem:

     OBSERVAR    o mapa fica pequeno no canto, como no jogo. Sinais
                 piscam em intervalos sorteados. No meio disso, uma
                 tarefa secundária puxa o olho para o centro da tela.
     CONGELAR    tudo para, de uma vez, num momento que você não
                 sabe prever. É o congelamento que torna a tarefa
                 uma prova de memória e não de leitura.
     ONDE        o mapa cresce e vai para o meio. Você toca onde o
                 sinal estava. Sai daqui um erro em distância, não
                 um certo/errado.
     LEITURA     as cinco leituras viram cartas. Você escolhe a que
                 o sinal queria dizer. Sai daqui acerto e tempo.
     OBJETIVO    (da dificuldade 4 em diante) dentro da leitura que
                 você escolheu, qual objetivo exatamente.
     RETORNO     o mapa mostra o ponto real, o seu palpite e a reta
                 entre os dois. É aqui que o treino acontece: erro
                 espacial sem retorno imediato não calibra nada.

   O que cada fase grava está em `fechar()`, e o que o conjunto das
   tentativas vira está em `extras()`.
   ============================================================ */
'use strict';
(function (U) {

  const MP = U.MP;

  /** Repete uma lista até dar n itens — mantém as condições balanceadas.
      Sem isso, sortear a retenção de cada tentativa independente daria
      3 tentativas num ponto da curva e 9 no outro, e a curva não
      significaria nada. */
  function ciclar(lista, n) {
    const r = [];
    for (let i = 0; i < n; i++) r.push(lista[i % lista.length]);
    return r;
  }

  class MotorMapa extends U.E.MotorBase {
    constructor(hud, cfg, api) {
      super(hud, cfg, api);
      this.estado = 'ocioso';
      this.pontos = 0;
      this.seq = 0;
      this.melhorSeq = 0;
      this.detalhe = [];
      this.sec = { ok: 0, n: 0, rts: [] };
      this.ordemRet = U.shuffle(ciclar(cfg.retencoes && cfg.retencoes.length ? cfg.retencoes : [2500, 5000, 8000], this.n));
      this.ordemNB = U.shuffle(ciclar(cfg.nBacks && cfg.nBacks.length ? cfg.nBacks : [0], this.n));
    }

    /* ---------- ciclo de vida ---------- */
    iniciar() {
      this.hud.ocultarBotoes = true;   // este exercício não usa o HUD de combate
      super.iniciar();
    }
    parar() {
      super.parar();
      this.hud.ocultarBotoes = false;
      this.hud.mapa = null;
    }

    /** Onde e de que tamanho o mapa fica em cada fase. */
    caixa(modo) {
      return modo === 'grande'
        ? { x: 0.455, y: 0.050, s: 0.330 }
        : { x: 0.025, y: 0.055, s: 0.255 };
    }

    /* ============================================================
       1) OBSERVAR
       ============================================================ */
    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++; this.placar();

      this.ret = this.ordemRet[this.i - 1];
      this.nb = this.ordemNB[this.i - 1];
      this.sinais = [];
      this.alvo = null;
      this.palpite = null; this.erro = null;
      this.leitura = null; this.rtLeitura = null;
      this.fino = null;
      this.secTent = { ok: 0, n: 0 };
      this.ganho = null;

      this.hud.limparMarcas();
      this.hud.campo = [];
      this.hud.setAlvo(null);
      this.hud.travado = false;
      this.hud.mapa = Object.assign(this.caixa('pequeno'), {
        sinais: [], marcas: [], linha: null,
        rotulos: !!this.cfg.rotulos, tocavel: false,
        painel: null, placar: this.linhaPlacar(),
      });

      this.estado = 'observando';
      this.diz(this.i === 1 ? 'olhe o mapa de canto de olho — a tela vai congelar sem avisar' : '', 'info');
      this.planejar();
      this.agendarSinais();
      if (this.cfg.secundaria) this.agendarSecundaria();
      this.T.after(this.tCongela, () => this.congelar());
    }

    /* ------------------------------------------------------------
       O ROTEIRO DA TENTATIVA

       Montado inteiro antes de começar, por dois motivos. Primeiro,
       assim dá para GARANTIR que os sinais que a pergunta precisa
       caibam na janela de retenção — sorteando ao vivo, uma sequência
       azarada deixaria a tentativa sem resposta possível. Segundo,
       o roteiro fica gravado junto com a tentativa, e sem ele não
       dava para saber depois quanta interferência aquela tentativa
       teve.
       ------------------------------------------------------------ */
    planejar() {
      const c = this.cfg;
      const isi = () => U.rnd(c.isiMin ?? 1000, c.isiMax ?? 6000);
      const dist = c.distratores || 0;
      const ev = [];
      let t = 0;

      const nPre = U.ri(c.preMin ?? 1, c.preMax ?? 3);
      for (let k = 0; k < nPre; k++) {
        t += isi(); ev.push({ t, aliado: false });
        if (dist && Math.random() < dist) { t += U.rnd(420, 900); ev.push({ t, aliado: true }); }
      }

      t += isi();
      const tAlvo = t;
      ev.push({ t, aliado: false, alvo: true });

      /* Sinais inimigos depois do alvo só existem quando o exercício
         pergunta pelo ANTERIOR ao último. Eles têm que caber na
         retenção, senão a pergunta não teria resposta. */
      const teto = this.nb > 0 ? Math.max(650, this.ret / (this.nb + 1)) : 0;
      for (let k = 0; k < this.nb; k++) { t += Math.min(isi(), teto); ev.push({ t, aliado: false }); }

      /* O resto da janela é preenchido por sinais de aliado, que não
         contam para a pergunta e existem para serem descartados. */
      if (dist) {
        let u = t;
        for (let g = 0; g < 6; g++) {
          u += U.rnd(700, 1800);
          if (u - tAlvo > this.ret - 450) break;
          if (Math.random() < dist) ev.push({ t: u, aliado: true });
        }
      }

      ev.sort((a, b) => a.t - b.t);
      this.plano = ev;
      this.tCongela = tAlvo + this.ret;
      this.depoisDoAlvo = ev.filter(e => e.t > tAlvo).length;
      this.antesDoAlvo = ev.filter(e => e.t < tAlvo).length;
    }

    agendarSinais() {
      for (const e of this.plano) {
        this.T.after(e.t, () => {
          if (this.estado !== 'observando') return;
          const s = MP.sortearSinal(this.cfg.zonas);
          s.t0 = U.now();
          s.dur = this.cfg.flash ?? 1200;
          s.aliado = !!e.aliado;
          if (e.aliado) { s.cor = '#d8e6ff'; s.zona = null; }
          this.sinais.push(s);
          if (e.alvo) this.alvo = s;
          this.hud.mapa.sinais = this.sinais.filter(x => U.now() - x.t0 < x.dur);
          e.aliado ? U.Sfx.tick() : U.Sfx.alert();
        });
      }
    }

    /* ------------------------------------------------------------
       TAREFA SECUNDÁRIA

       Um alvo acende no meio da tela e você tem que tocá-lo. Ele não
       está aqui para dar ponto — está aqui para tirar o seu olho do
       minimapa, que é a condição real. Consciência de mapa medida com
       o olho parado no mapa não é consciência de mapa.

       Ela é pontuada em separado justamente para flagrar a trapaça:
       acerto alto no mapa com a secundária no chão quer dizer que
       você ficou encarando, e o resultado escreve isso.
       ------------------------------------------------------------ */
    agendarSecundaria() {
      const c = this.cfg;
      const ciclo = () => {
        if (this.estado !== 'observando') return;
        const a = {
          x: U.rnd(0.40, 0.62), y: U.rnd(0.26, 0.66), r: 0.038,
          cor: '#ffd479', rotulo: '●', t0: U.now(), tocavel: true,
        };
        this.secAlvo = a;
        this.hud.setAlvo(a);
        this.secTent.n++; this.sec.n++;
        this.T.after(c.secVida ?? 1100, () => {
          if (this.secAlvo === a) { this.secAlvo = null; this.hud.setAlvo(null); }
        });
        this.T.after(U.rnd(c.secIsiMin ?? 1400, c.secIsiMax ?? 2600), ciclo);
      };
      this.T.after(U.rnd(700, 1600), ciclo);
    }

    /** Toque no alvo da tarefa secundária (ligado em treino.js). */
    alvoTocado() {
      if (this.estado !== 'observando' || !this.secAlvo) return;
      this.sec.rts.push(U.now() - this.secAlvo.t0);
      this.secTent.ok++; this.sec.ok++;
      this.pontos += MP.PESOS.secundaria;
      this.secAlvo = null; this.hud.setAlvo(null);
      U.Sfx.hit();
      if (this.hud.mapa) this.hud.mapa.placar = this.linhaPlacar();
    }

    /* ============================================================
       2) CONGELAR
       ============================================================ */
    congelar() {
      if (this.estado !== 'observando') return;
      this.estado = 'congelado';
      this.T.clear();
      this.hud.setAlvo(null); this.secAlvo = null;
      this.hud.mapa.sinais = [];
      U.Sfx.cue(); U.Haptic.tap();
      this.hud.mapa.painel = {
        titulo: 'CONGELOU', cor: '#7fd4ff',
        linhas: ['o mapa apagou — responda com o que ficou na cabeça'],
      };
      this.T.after(560, () => this.faseOnde());
    }

    /* ============================================================
       3) ONDE — relato contínuo
       ============================================================ */
    faseOnde() {
      if (!this.ativo) return;
      this.estado = 'onde';
      this.tOnde = U.now();
      Object.assign(this.hud.mapa, this.caixa('grande'), {
        sinais: [], marcas: [], linha: null, rotulos: false, tocavel: true,
        painel: {
          titulo: this.nb > 0 ? 'ONDE ESTAVA O ANTERIOR?' : 'ONDE ESTAVA?',
          cor: '#ffd479',
          linhas: this.nb > 0
            ? [`toque o lugar do sinal inimigo que veio ANTES do último`,
               `(${this.nb === 1 ? 'um sinal' : this.nb + ' sinais'} piscaram depois dele)`]
            : ['toque o lugar exato do último sinal inimigo',
               'sinais de aliado — losango branco — não contam'],
          relogio: { t0: U.now(), dur: this.cfg.tempoOnde ?? 6000 },
        },
      });
      this.T.after(this.cfg.tempoOnde ?? 6000, () => {
        if (this.estado === 'onde') this.responderOnde(null);
      });
    }

    /** Toque no mapa (ligado em treino.js). */
    mapaTocado(p) {
      if (this.estado !== 'onde') return;
      this.responderOnde(p);
    }

    responderOnde(p) {
      if (this.estado !== 'onde') return;
      this.T.clear();
      this.hud.mapa.tocavel = false;
      this.rtOnde = U.now() - this.tOnde;
      if (p && this.alvo) {
        this.palpite = { x: U.clamp(p.x, 0, 1), y: U.clamp(p.y, 0, 1) };
        this.erro = Math.hypot(this.palpite.x - this.alvo.x, this.palpite.y - this.alvo.y);
        this.zonaPalpite = MP.classificar(this.palpite.x, this.palpite.y);
        this.hud.mapa.marcas = [{ x: this.palpite.x, y: this.palpite.y, tipo: 'palpite' }];
        U.Sfx.tick(); U.Haptic.tap();
      }
      this.T.after(p ? 260 : 60, () => this.faseLeitura());
    }

    /* ============================================================
       4) LEITURA — a parte semântica
       ============================================================ */
    faseLeitura() {
      if (!this.ativo) return;
      this.estado = 'leitura';
      this.tLeitura = U.now();
      this.hud.mapa = null;                 // o mapa sai: aqui a pergunta é de sentido
      this.hud.campo = this.cartasZonas();
      this.hud.setOverlay({
        texto: '', sub: 'o que aquele sinal queria dizer?',
        cx: 0.5, cy: 0.115, tam: 0.01, fundo: false, subCor: '#ffd479',
      });
      this.T.after(this.cfg.tempoLeitura ?? 4200, () => {
        if (this.estado === 'leitura') this.responderLeitura(null);
      });
    }

    cartasZonas() {
      const larg = 0.180, gap = 0.014;
      const total = MP.ORDEM_ZONAS.length * larg + (MP.ORDEM_ZONAS.length - 1) * gap;
      const x0 = (1 - total) / 2;
      return MP.ORDEM_ZONAS.map((z, k) => {
        const Z = MP.ZONAS[z];
        return {
          id: 'z-' + z, zonaId: z, icone: Z.icone, titulo: Z.nome,
          nota: Z.onde, notaCor: Z.cor, marca: Z.cor,
          x: x0 + k * (larg + gap), y: 0.30, w: larg, h: 0.34,
        };
      });
    }

    responderLeitura(z) {
      if (this.estado !== 'leitura') return;
      this.T.clear();
      this.leitura = z;
      this.rtLeitura = U.now() - this.tLeitura;
      this.hud.campo = []; this.hud.setOverlay(null);
      if (z) U.Sfx.tick();
      if (this.cfg.objetivoFino && z) return this.faseFino();
      this.fechar();
    }

    /* ============================================================
       5) OBJETIVO — o detalhe dentro da leitura

       As opções saem da leitura que VOCÊ escolheu, não da verdadeira.
       Mostrar as opções da verdadeira entregaria a resposta anterior
       de graça; e, de todo modo, não faz sentido estar certo sobre
       qual objetivo se a categoria já estava errada.
       ============================================================ */
    faseFino() {
      this.estado = 'fino';
      this.tFino = U.now();
      const ops = MP.daZona(this.leitura);
      const larg = 0.215, gap = 0.028;
      const total = ops.length * larg + (ops.length - 1) * gap;
      const x0 = (1 - total) / 2;
      const Z = MP.ZONAS[this.leitura];
      this.hud.campo = ops.map((o, k) => ({
        id: 'f-' + o.id, objId: o.id, icone: Z.icone, titulo: o.curto,
        marca: Z.cor, x: x0 + k * (larg + gap), y: 0.34, w: larg, h: 0.28,
      }));
      this.hud.setOverlay({
        texto: '', sub: 'qual exatamente?', cx: 0.5, cy: 0.15,
        tam: 0.01, fundo: false, subCor: Z.cor,
      });
      this.T.after(this.cfg.tempoFino ?? 3000, () => {
        if (this.estado === 'fino') this.responderFino(null);
      });
    }

    responderFino(id) {
      if (this.estado !== 'fino') return;
      this.T.clear();
      this.fino = id;
      this.hud.campo = []; this.hud.setOverlay(null);
      if (id) U.Sfx.tick();
      this.fechar();
    }

    /** Toques nas cartas — o HudSurface entrega por aqui. */
    campo(e) {
      if (!e || !e.carta) return;
      if (this.estado === 'leitura' && e.carta.zonaId) return this.responderLeitura(e.carta.zonaId);
      if (this.estado === 'fino' && e.carta.objId) return this.responderFino(e.carta.objId);
    }

    /* ============================================================
       6) FECHAR — contabilidade e retorno
       ============================================================ */
    fechar() {
      this.estado = 'fechando';
      const alvo = this.alvo;
      const objReal = alvo ? MP.porId(alvo.obj) : null;
      const zonaReal = alvo ? alvo.zona : null;

      const zonaOk = !!(this.zonaPalpite && this.zonaPalpite.zona === zonaReal);
      const objOk = !!(this.zonaPalpite && this.zonaPalpite.obj.id === alvo.obj);
      const leituraOk = this.leitura === zonaReal;
      const finoOk = !!(this.cfg.objetivoFino && leituraOk && this.fino === alvo.obj);

      const ok = zonaOk && leituraOk;
      const err = ok ? null
        : (this.leitura == null && this.palpite == null) ? 'lento'
        : (zonaOk && !leituraOk) ? 'sentido'
        : (!zonaOk && leituraOk) ? 'posicao'
        : 'perdeu';

      /* pontos */
      const pPos = MP.pontosPosicao(this.erro);
      const pZona = zonaOk ? MP.PESOS.zona : 0;
      const pLeit = leituraOk ? MP.PESOS.leitura : 0;
      const lim = this.cfg.tempoLeitura ?? 4200;
      const pRap = leituraOk ? Math.round(MP.PESOS.rapidez * U.clamp(1 - this.rtLeitura / lim, 0, 1)) : 0;
      const pFino = finoOk ? MP.PESOS.fino : 0;
      const ganho = pPos + pZona + pLeit + pRap + pFino;
      this.pontos += ganho;
      this.ganho = { pos: pPos, zona: pZona, leitura: pLeit, rapidez: pRap, fino: pFino, total: ganho };

      this.seq = ok ? this.seq + 1 : 0;
      this.melhorSeq = Math.max(this.melhorSeq, this.seq);

      this.detalhe.push({
        ret: this.ret, nb: this.nb, zona: zonaReal, obj: alvo ? alvo.obj : null,
        erro: this.erro, zonaOk, objOk, leituraOk, finoOk, ok,
        rtOnde: this.rtOnde, rtLeitura: this.rtLeitura,
        antes: this.antesDoAlvo, depois: this.depoisDoAlvo,
        sec: { ok: this.secTent.ok, n: this.secTent.n },
        /* vetor do ponto real até o palpite — é daqui que sai o viés */
        vx: this.palpite ? this.palpite.x - alvo.x : null,
        vy: this.palpite ? this.palpite.y - alvo.y : null,
        ax: alvo ? alvo.x : null, ay: alvo ? alvo.y : null,
        pontos: ganho,
      });

      this.anota({
        k: 'mapa', ok, err,
        rt: this.rtLeitura, tot: ok ? this.rtLeitura : null,
        x: {
          ret: this.ret, nb: this.nb, z: zonaReal, o: alvo ? alvo.obj : null,
          e: this.erro != null ? +this.erro.toFixed(3) : null,
          zo: zonaOk ? 1 : 0, lo: leituraOk ? 1 : 0, fo: finoOk ? 1 : 0,
          itf: this.antesDoAlvo, pts: ganho,
        },
      });

      ok ? (U.Sfx.perfect(), U.Haptic.good()) : (U.Sfx.miss(), U.Haptic.bad());
      this.placar();
      this.mostrarRetorno(objReal, zonaReal, { zonaOk, leituraOk, finoOk, err });
    }

    /* ============================================================
       RETORNO — onde o treino de fato acontece

       Ver o erro em número não calibra memória espacial; ver a reta
       entre onde você apontou e onde era, sim. Por isso o retorno é
       desenhado no mapa e não escrito numa caixa de texto.

       Em modo prova este passo não existe: mostrar a resposta é
       ensinar, e prova não ensina.
       ============================================================ */
    mostrarRetorno(objReal, zonaReal, res) {
      if (!this.alvo) return this.T.after(300, () => this.proxima());
      const Z = MP.ZONAS[zonaReal];

      if (!this.retorno) {
        this.hud.mapa = null;
        this.hud.setOverlay({ texto: '·', tam: 0.10, cor: '#66748f', fundo: 'rgba(6,9,16,.35)' });
        return this.T.after(500, () => { this.hud.setOverlay(null); this.proxima(); });
      }

      const marcas = [{ x: this.alvo.x, y: this.alvo.y, tipo: 'certo', cor: Z.cor, rotulo: objReal.curto }];
      if (this.palpite) marcas.push({ x: this.palpite.x, y: this.palpite.y, tipo: 'palpite' });

      const linhas = [];
      linhas.push({ t: `${Z.icone}  ${Z.nome} — ${objReal.nome}`, cor: Z.cor, forte: true });
      linhas.push({ t: Z.leitura, cor: '#b9c8e4' });
      linhas.push({ t: Z.fazer, cor: '#8fa3c4' });
      linhas.push({ t: '', cor: null });
      linhas.push({
        t: this.erro == null
          ? 'Você não apontou a tempo.'
          : `Erro de ${Math.round(this.erro * 100)}% da largura do mapa — ${MP.bandaErro(this.erro, res.zonaOk)}.`,
        cor: this.erro != null && this.erro < 0.10 ? '#6ee7a8' : res.zonaOk ? '#ffd479' : '#ff8fa3',
      });
      linhas.push({
        t: res.leituraOk ? `Leitura certa em ${Math.round(this.rtLeitura)} ms.`
          : this.leitura ? `Você leu como "${MP.ZONAS[this.leitura].nome}".`
          : 'Você não escolheu a leitura.',
        cor: res.leituraOk ? '#6ee7a8' : '#ff8fa3',
      });
      if (this.cfg.objetivoFino && this.leitura) {
        linhas.push({
          t: res.finoOk ? 'Objetivo exato: certo.'
            : `Objetivo exato: ${this.fino ? MP.porId(this.fino).curto : 'sem resposta'} — era ${objReal.curto}.`,
          cor: res.finoOk ? '#6ee7a8' : '#ff8fa3',
        });
      }
      linhas.push({ t: '', cor: null });
      linhas.push({ t: `+${this.ganho.total} pontos   ·   ${this.pontos} no total`, cor: '#ffd479', forte: true });

      this.hud.mapa = Object.assign(this.caixa('grande'), {
        sinais: [], marcas, rotulos: false, tocavel: false,
        linha: this.palpite
          ? { x1: this.alvo.x, y1: this.alvo.y, x2: this.palpite.x, y2: this.palpite.y }
          : null,
        painel: {
          titulo: res.zonaOk && res.leituraOk ? 'CERTO' : ERROS[res.err] || 'ERROU',
          cor: res.zonaOk && res.leituraOk ? '#6ee7a8' : '#ff8fa3',
          linhas: linhas.map(l => l.t), cores: linhas.map(l => l.cor),
          fortes: linhas.map(l => !!l.forte),
        },
        placar: this.linhaPlacar(),
      });

      this.diz(res.zonaOk && res.leituraOk ? 'leu o mapa' : (ERROS[res.err] || 'errou'),
               res.zonaOk && res.leituraOk ? 'ok' : 'erro');
      this.T.after(this.cfg.tempoRetorno ?? 3400, () => this.proxima());
    }

    linhaPlacar() {
      return { pontos: this.pontos, seq: this.seq, i: this.i, n: this.n };
    }

    /* ============================================================
       O QUE O CONJUNTO DAS TENTATIVAS DIZ
       ============================================================ */
    extras() {
      const d = this.detalhe;
      if (!d.length) return {};
      const comErro = d.filter(x => x.erro != null);
      const med = (a) => (a.length ? U.median(a) : null);

      /* curva de esquecimento: acerto de zona e erro de posição por
         intervalo de retenção. É a razão de a retenção ser sorteada
         balanceada e não livre. */
      const porRet = {};
      for (const x of d) {
        const e = porRet[x.ret] || (porRet[x.ret] = { n: 0, zona: 0, leitura: 0, erros: [] });
        e.n++; e.zona += x.zonaOk ? 1 : 0; e.leitura += x.leituraOk ? 1 : 0;
        if (x.erro != null) e.erros.push(x.erro);
      }
      const curva = Object.entries(porRet).map(([ret, e]) => ({
        ret: +ret, n: e.n, zona: e.zona / e.n, leitura: e.leitura / e.n, erro: med(e.erros),
      })).sort((a, b) => a.ret - b.ret);

      /* pontos cegos: em que parte do mapa você não vê nada */
      const porZona = {};
      for (const x of d) {
        if (!x.zona) continue;
        const e = porZona[x.zona] || (porZona[x.zona] = { n: 0, ok: 0, erros: [] });
        e.n++; e.ok += x.zonaOk ? 1 : 0;
        if (x.erro != null) e.erros.push(x.erro);
      }
      for (const k in porZona) porZona[k].erro = med(porZona[k].erros);

      /* interferência: quantos sinais vieram ANTES do alvo naquela
         tentativa. Mais sinais antes = mais coisa competindo. */
      const porItf = {};
      for (const x of d) {
        const k = Math.min(x.antes, 4);
        const e = porItf[k] || (porItf[k] = { n: 0, ok: 0 });
        e.n++; e.ok += x.zonaOk ? 1 : 0;
      }
      const interferencia = Object.entries(porItf)
        .map(([antes, e]) => ({ antes: +antes, n: e.n, acc: e.ok / e.n }))
        .sort((a, b) => a.antes - b.antes);

      /* ------------------------------------------------------------
         VIÉS PARA O CENTRO

         Memória espacial não erra ao acaso: ela puxa o ponto lembrado
         para o meio da região a que ele pertence. Se isso estiver
         acontecendo com você, o erro médio vai ter uma direção, e não
         só um tamanho.

         Projeto cada vetor de erro na direção "ponto real → centro do
         mapa". Mediana positiva quer dizer que os seus palpites caem
         sistematicamente mais para o meio do que a verdade.
         ------------------------------------------------------------ */
      const projs = [];
      for (const x of comErro) {
        const dx = 0.5 - x.ax, dy = 0.5 - x.ay;
        const m = Math.hypot(dx, dy);
        if (m < 0.05) continue;                    // alvo já no centro: sem direção
        projs.push((x.vx * dx + x.vy * dy) / m);
      }
      const vies = projs.length >= 6
        ? { puxa: med(projs), n: projs.length }
        : { puxa: null, n: projs.length };

      return {
        mapa: {
          pontos: this.pontos, melhorSeq: this.melhorSeq,
          erro: med(comErro.map(x => x.erro)),
          semResposta: d.filter(x => x.erro == null).length,
          zonaAcc: d.filter(x => x.zonaOk).length / d.length,
          objAcc: d.filter(x => x.objOk).length / d.length,
          leituraAcc: d.filter(x => x.leituraOk).length / d.length,
          finoAcc: this.cfg.objetivoFino
            ? d.filter(x => x.finoOk).length / d.length : null,
          rtLeitura: med(d.filter(x => x.leituraOk).map(x => x.rtLeitura)),
          curva, porZona, interferencia, vies,
          secundaria: this.cfg.secundaria
            ? { ok: this.sec.ok, n: this.sec.n, rt: med(this.sec.rts) } : null,
          retencoes: this.cfg.retencoes || null,
        },
      };
    }
  }

  const ERROS = {
    sentido: 'lugar certo, leitura errada',
    posicao: 'leitura certa, lugar errado',
    perdeu: 'não ficou nada',
    lento: 'não respondeu a tempo',
  };

  U.E.MotorMapa = MotorMapa;
  U.E.ERROS_MAPA = ERROS;

})(window.U);
