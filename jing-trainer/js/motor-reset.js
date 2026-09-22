/* ============================================================
   js/motor-reset.js — QUEBRA DO ESPELHO
   O treino da mecânica que define a Jing.

   ------------------------------------------------------------
   DE ONDE VEM A MECÂNICA

   Não é invenção deste arquivo. O kit da Jing está em
   dados/herois/_habilidades.js, cruzado em duas buscas, e a passiva
   tem confiança ALTA — as duas buscas descrevem o mesmo mecanismo
   com os mesmos números:

     Usar habilidades invoca uma imagem espelhada. A Jing e a imagem
     aplicam marcas DIFERENTES. Quando o alvo tem as duas, elas se
     quebram: dano extra e ZERAM a recarga da Habilidade 1 e da 2.
     Depois de disparar, a passiva fica desligada por 5 s.

   É o reset que transforma a Jing num herói de explosão: quem
   aproveita a quebra solta a 1 e a 2 de novo na hora; quem demora
   joga a luta com metade do dano.

   ------------------------------------------------------------
   O QUE É TREINADO

   Duas habilidades separadas, e as duas são da Jing de verdade:

   1. PEGAR O RESET. O espelho quebra, a recarga da 1 e da 2 some — e
      o tempo até você apertar uma delas de novo é medido. Isso é
      percepção e resposta, com o sinal que o jogo dá.

   2. NÃO APERTAR SEM RESET. Nos 5 s em que a passiva está desligada,
      as marcas podem fechar de novo e NADA quebra. Apertar a 1 ou a 2
      aí é um toque perdido: a habilidade está em recarga, o jogo
      ignora, e o momento passa. O botão P mostra a trava correndo.
      Quem acompanha o P sabe se o próximo reset vem ou não — e
      prepara a mão; quem chuta, erra dos dois lados.

   Cada tentativa tem uma quebra de verdade (logo depois da sua
   abertura) e um segundo fechamento de marcas, que cai antes ou
   depois dos 5 s. Metade de cada, embaralhado. Nas dificuldades altas
   o segundo fechamento cai perto da fronteira dos 5 s, que é onde a
   decisão é difícil.

   ------------------------------------------------------------
   O QUE NESTA TELA É ILUSTRATIVO, E O QUE É DO JOGO

   · DO JOGO: a quebra zera a 1 e a 2; a passiva trava por 5 s.
   · ILUSTRATIVO: a duração da recarga da 1 e da 2 (o banco não tem
     esses números, e aqui ela é longa de propósito para nunca voltar
     sozinha e confundir o treino); o boneco-alvo; o desenho das marcas.
   · O QUE NÃO É SIMULADO: qual golpe exatamente completa a segunda
     marca. As buscas não deixam isso claro — a imagem copia as
     habilidades, e não está escrito se copia o ataque básico. Então
     o treino não finge saber: ele treina a REAÇÃO à quebra, que é o
     que você controla, e não a conta de qual golpe causou.
   ============================================================ */
'use strict';
(function (U) {

  const TRAVA = 5000;           // passiva desligada depois da quebra — confiança alta
  const RECARGA = 9000;         // ilustrativa: longa para nunca voltar sozinha no meio

  class MotorReset extends U.E.MotorBase {
    constructor(hud, cfg, api) {
      super(hud, cfg, api);
      this.estado = 'ocioso';
      this.detalhe = [];
      this.kit = U.HE && U.HE.kitDoTreino ? U.HE.kitDoTreino('jing') : null;
      /* metade das segundas quebras é real, metade cai na trava —
         balanceado, senão chutar o lado mais comum já "acertaria" */
      const lista = [];
      for (let i = 0; i < this.n; i++) lista.push(i % 2 ? 'bloqueada' : 'real');
      this.ordem = U.shuffle(lista);
    }

    nome(k) {
      const b = this.kit && this.kit.botoes && this.kit.botoes[k];
      return b ? b.nome : ({ s1: 'Habilidade 1', s2: 'Habilidade 2', aa: 'ataque' })[k] || k;
    }

    iniciar() {
      this.hud.setAlvo(null);
      super.iniciar();
      this.loop();
    }
    parar() {
      super.parar();
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
    }

    /* As recargas giram de verdade, quadro a quadro, a partir de
       instantes guardados — nada de contador que atrasa com a aba. */
    loop() {
      const passo = () => {
        if (!this.ativo) return;
        const agora = U.now();
        const cd = (t0, dur) => (t0 == null ? 0 : U.clamp(1 - (agora - t0) / dur, 0, 1));
        this.hud.marcar('s1', { cd: cd(this.tS1, RECARGA) });
        this.hud.marcar('s2', { cd: cd(this.tS2, RECARGA) });
        /* a trava é o sinal que decide a segunda metade do treino: ela
           ganha contagem em segundos e aro vermelho, como a passiva
           travada aparece no jogo */
        const trava = cd(this.tTrava, TRAVA);
        this.hud.marcar('pass', { cd: trava, cdCor: '#ff8fa3',
          cdTxt: trava > 0 ? (trava * TRAVA / 1000).toFixed(1) : null });
        this._raf = requestAnimationFrame(passo);
      };
      this._raf = requestAnimationFrame(passo);
    }

    emRecarga(k) {
      const t0 = k === 's1' ? this.tS1 : k === 's2' ? this.tS2 : null;
      return t0 != null && U.now() - t0 < RECARGA;
    }
    travada() { return this.tTrava != null && U.now() - this.tTrava < TRAVA; }

    alvoPx() {
      const B = this.hud.box;
      return { x: B.x + this.alvo.x * B.w, y: B.y + this.alvo.y * B.h };
    }
    mostrarMarcas(jing, imagem) {
      this.hud.setAlvo({ ...this.alvo, r: 0.045, cor: '#c4b5fd',
                         rotulo: `${jing ? '◆' : '·'} ${imagem ? '◇' : '·'}` });
    }

    /* ============================================================
       UMA TENTATIVA
       ============================================================ */
    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++; this.placar();

      this.tipo2 = this.ordem[this.i - 1];
      this.r1 = null; this.r2 = null; this.rt1 = null; this.rt2 = null;
      this.antecipou = 0; this.gap = null;
      this.tS1 = null;
      /* a 2 já foi usada antes nesta luta: começa em recarga, para o
         reset ter o que zerar nela também */
      this.tS2 = U.now() - RECARGA * U.rnd(0.25, 0.45);
      this.tTrava = null;
      this.alvo = { x: 0.40, y: 0.42 };
      this.mostrarMarcas(false, false);

      this.estado = 'abertura';
      this.hud.limparMarcas();
      this.hud.marcar('s1', { destaque: true, cor: '#ffd479' });
      this.hud.setOverlay({
        texto: 'ABRA', sub: `1 › AA  ·  ${this.nome('s1')} e o ataque duplo`,
        cx: 0.40, cy: 0.16, tam: 0.11, cor: '#ffd479', fundo: false,
      });
      this.T.after(this.cfg.limiteAbertura ?? 4500, () => {
        if (this.estado === 'abertura' || this.estado === 'abertura2') this.quebrar1();
      });
    }

    press(e) {
      if (!this.ativo || !e || !e.id) return;
      const id = e.id, agora = U.now();

      if (this.estado === 'abertura' && id === 's1') {
        this.tS1 = agora;
        this.hud.marcar('s1', { destaque: false });
        this.hud.marcar('aa', { destaque: true, cor: '#ffd479', rotulo: 'AA×2' });
        this.mostrarMarcas(true, false);
        this.estado = 'abertura2';
        return;
      }
      if (this.estado === 'abertura2' && id === 'aa') {
        this.hud.marcar('aa', { destaque: false, rotulo: null });
        this.hud.setOverlay(null);
        this.mostrarMarcas(true, true);
        this.estado = 'espera1';
        this.T.clear();
        this.T.after(U.rnd(this.cfg.esperaMin ?? 250, this.cfg.esperaMax ?? 900), () => this.quebrar1());
        return;
      }

      const hab = id === 's1' || id === 's2';

      /* resposta à quebra real. O toque conta como a sequência do reset
         inteira — no jogo você solta a 1 e a 2 de novo, e as duas voltam
         a recarregar. Assim, na trava, NENHUMA das duas está pronta, como
         na luta: não existe "a outra que sobrou" para apertar sem custo. */
      if (this.estado === 'reset1' && hab) {
        this.rt1 = agora - this.tQuebra1; this.r1 = 'ok';
        this.usar(id);
        return this.intervalo();
      }
      if (this.estado === 'segunda' && hab) {
        this.rt2 = agora - this.tSegunda;
        this.r2 = this.tipo2 === 'real' ? 'ok' : 'recarga';
        if (this.tipo2 === 'real') this.usar(id); else { this.hud.erro(id); }
        return this.fechar();
      }

      /* apertar a 1 ou a 2 em recarga, antes de qualquer sinal: o jogo
         ignora, e o toque sai caro — é a mão chutando que o reset veio */
      if ((this.estado === 'intervalo' || this.estado === 'espera1') && hab && this.emRecarga(id)) {
        this.antecipou++;
        this.hud.erro(id);
        U.Haptic.bad();
      }
    }

    usar(id) {
      const agora = U.now();
      this.tS1 = agora; this.tS2 = agora;
      this.hud.pulsar(id);
      this.hud.pulsar(id === 's1' ? 's2' : 's1');
    }

    /* ---------- a quebra de verdade ---------- */
    quebrar1() {
      if (!this.ativo || this.estado === 'reset1') return;
      this.hud.marcar('s1', { destaque: false });
      this.hud.marcar('aa', { destaque: false, rotulo: null });
      this.hud.setOverlay(null);
      this.explodir();
      this.tQuebra1 = U.now();
      this.tTrava = this.tQuebra1;
      this.estado = 'reset1';
      this.T.clear();
      this.T.after(this.cfg.janela ?? 1100, () => {
        if (this.estado !== 'reset1') return;
        this.r1 = 'perdeu';
        this.intervalo();
      });
    }

    explodir() {
      const p = this.alvoPx();
      const n = this.cfg.estilhacos ?? 12;
      this.hud.caco(p.x, p.y, '#c4b5fd', n);
      this.hud.caco(p.x, p.y, '#7fd4ff', Math.ceil(n * 0.6));
      this.hud.efeitos.push({ t: 0, tipo: 'anel', x: p.x, y: p.y, r: this.hud.box.w * 0.04, cor: '#c4b5fd' });
      /* o reset aparece onde ele importa: nos botões */
      this.tS1 = null; this.tS2 = null;
      for (const k of ['s1', 's2']) {
        const q = this.hud.px(this.hud.hud[k]);
        this.hud.efeitos.push({ t: 0, tipo: 'anel', x: q.x, y: q.y, r: q.r, cor: '#ffd479' });
      }
      this.mostrarMarcas(false, false);
      U.Sfx.hit();
    }

    /* ---------- a janela da trava ---------- */
    intervalo() {
      if (!this.ativo) return;
      this.estado = 'intervalo';
      this.T.clear();
      const f = this.cfg.fronteira;
      /* Onde cai o segundo fechamento de marcas. Longe dos 5 s a decisão
         é fácil; perto deles é exatamente onde quem não acompanha a trava
         aperta cedo ou deixa passar. A dificuldade aproxima da fronteira. */
      this.gap = this.tipo2 === 'real'
        ? TRAVA + (f ? U.rnd(150, 900) : U.rnd(300, 1900))
        : (f ? TRAVA - U.rnd(150, 1200) : U.rnd(1400, TRAVA - 300));
      const falta = Math.max(200, this.tQuebra1 + this.gap - U.now());
      this.T.after(Math.max(120, falta - 700), () => this.mostrarMarcas(true, false));
      this.T.after(falta, () => this.segunda());
    }

    segunda() {
      if (!this.ativo || this.estado !== 'intervalo') return;
      this.tSegunda = U.now();
      if (this.tipo2 === 'real') {
        this.explodir();
        this.tTrava = this.tSegunda;
      } else {
        /* passiva travada: as marcas fecham e nada acontece — é assim no
           jogo, e é por isso que o erro é tão fácil de cometer */
        this.mostrarMarcas(true, true);
        this.T.after(420, () => { if (this.ativo) this.mostrarMarcas(false, false); });
      }
      this.estado = 'segunda';
      this.T.after(this.cfg.janela ?? 1100, () => {
        if (this.estado !== 'segunda') return;
        this.r2 = this.tipo2 === 'real' ? 'perdeu' : 'segurou';
        this.fechar();
      });
    }

    /* ============================================================
       CONTABILIDADE
       ============================================================ */
    fechar() {
      this.estado = 'fim';
      this.T.clear();
      const ok1 = this.r1 === 'ok';
      const ok2 = this.r2 === 'ok' || this.r2 === 'segurou';
      const ok = ok1 && ok2;
      const err = ok ? null
        : !ok1 ? 'reset'
        : this.r2 === 'recarga' ? 'recarga'
        : 'reset';

      this.detalhe.push({
        rt1: this.rt1, r1: this.r1, tipo2: this.tipo2, r2: this.r2, rt2: this.rt2,
        gap: this.gap, antecipou: this.antecipou, ok,
      });
      this.anota({
        k: 'reset', ok, err,
        rt: this.rt1, tot: ok1 ? this.rt1 : null,
        x: { r1: this.r1, t2: this.tipo2, r2: this.r2,
             rt2: this.rt2 != null ? Math.round(this.rt2) : null,
             gap: Math.round(this.gap), ant: this.antecipou || undefined },
      });

      ok ? (U.Sfx.perfect(), U.Haptic.good()) : (U.Sfx.miss(), U.Haptic.bad());
      this.placar();

      if (this.retorno) {
        const partes = [];
        partes.push(this.r1 === 'ok' ? `reset em ${Math.round(this.rt1)} ms` : 'perdeu o reset');
        partes.push(this.tipo2 === 'real'
          ? (this.r2 === 'ok' ? `2º reset em ${Math.round(this.rt2)} ms` : 'perdeu o 2º reset')
          : (this.r2 === 'segurou' ? 'segurou na trava' : 'apertou com a passiva travada'));
        if (this.antecipou) partes.push(`${this.antecipou} toque${this.antecipou > 1 ? 's' : ''} em recarga`);
        this.hud.setOverlay({
          texto: ok ? 'LIMPO' : 'ERROU', sub: partes.join(' · '),
          cx: 0.40, cy: 0.16, tam: 0.10, cor: ok ? '#6ee7a8' : '#ff8fa3', fundo: false,
        });
      }
      this.diz(ok ? 'reset limpo' : (err === 'recarga' ? 'passiva travada' : 'perdeu o reset'), ok ? 'ok' : 'erro');
      this.T.after(this.retorno ? (ok ? 1100 : 2000) : 500, () => {
        this.hud.setOverlay(null);
        this.proxima();
      });
    }

    extras() {
      const d = this.detalhe;
      if (!d.length) return { reset: { n: 0 } };
      const rts = [];
      let reais = 0, pegos = 0, bloq = 0, falsos = 0;
      for (const x of d) {
        reais++; if (x.r1 === 'ok') { pegos++; rts.push(x.rt1); }
        if (x.tipo2 === 'real') { reais++; if (x.r2 === 'ok') { pegos++; rts.push(x.rt2); } }
        else { bloq++; if (x.r2 === 'recarga') falsos++; }
      }
      /* perto dos 5 s é onde a trava decide; longe dela qualquer um acerta */
      const perto = d.filter(x => Math.abs(x.gap - TRAVA) <= 1200);
      const pertoOk = perto.filter(x => (x.tipo2 === 'real' && x.r2 === 'ok') ||
                                        (x.tipo2 === 'bloqueada' && x.r2 === 'segurou')).length;
      return {
        reset: {
          n: d.length,
          rt: rts.length ? U.median(rts) : null,
          rtIC: rts.length >= 3 ? U.S.bootMediana(rts) : null,
          pegos, reais, falsos, bloq,
          antecipou: d.reduce((s, x) => s + x.antecipou, 0),
          fronteira: perto.length ? { n: perto.length, ok: pertoOk } : null,
          janela: this.cfg.janela ?? 1100,
        },
      };
    }
  }

  U.E.MotorReset = MotorReset;
  U.E.RESET = { TRAVA, RECARGA };

})(window.U);
