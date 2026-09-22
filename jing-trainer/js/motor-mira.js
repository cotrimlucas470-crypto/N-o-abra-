/* ============================================================
   js/motor-mira.js — MIRA

   ------------------------------------------------------------
   POR QUE ESTE EXERCÍCIO EXISTE

   No Honor of Kings quase toda habilidade de dano é apontada
   segurando o botão dela e arrastando: a direção do arrasto vira a
   direção do tiro. É a habilidade mecânica mais usada do jogo — e
   era a única grande que este app não treinava nem media. O HUD
   nem registrava arrasto a partir de um botão; soltar devolvia a
   duração e mais nada.

   O que a mira exige não é o que a rota exige. Rota é SEQUÊNCIA:
   a ordem certa no tempo certo. Mira é MAPEAMENTO: o polegar
   arrasta alguns milímetros num canto da tela e a consequência
   acontece a trinta centímetros dali, num referencial que não é o
   do dedo. Treinar sequência não melhora mapeamento, e é por isso
   que ela é exercício próprio e não um parâmetro de outro.

   ------------------------------------------------------------
   O QUE ELE MEDE, E POR QUE ASSIM

   ERRO ANGULAR EM GRAUS, contínuo. Não "acertou / errou": um tiro
   que passa 4° do alvo e um que passa 40° são a mesma coisa para
   um placar binário e coisas completamente diferentes para quem
   está tentando melhorar. O grau também é comparável entre
   distâncias, o que a distância em pixels não seria.

   VIÉS POR SETOR. Arrasto de polegar tem erro sistemático: a mão
   pivota no polegar e as direções que exigem abrir a mão saem
   curtas. Isso não é falta de atenção, é anatomia — e é corrigível
   de propósito, mas só se alguém disser em que direção acontece. O
   exercício guarda o erro COM SINAL por setor de direção, então
   ele consegue dizer "você puxa 11° no sentido horário quando mira
   para cima e para a esquerda" em vez de "sua mira está 11° ruim".

   TEMPO ATÉ SOLTAR, separado do erro. Mirar devagar e acertar é
   diferente de mirar rápido e acertar, e as duas coisas melhoram
   por caminhos diferentes.

   ------------------------------------------------------------
   O QUE ELE NÃO MEDE

   Não mede se você acertaria a habilidade numa partida. Lá o alvo
   desvia, tem terreno no caminho e você está sendo atacado. Aqui
   ele mede o mapeamento entre o arrasto e a direção, que é a parte
   que dá para isolar — e que, quando está ruim, nenhuma leitura de
   jogo salva.
   ============================================================ */
'use strict';
(function (U) {

  const TAU = Math.PI * 2;

  /** Diferença angular menor, com sinal, em radianos (-π, π]. */
  function difAng(a, b) {
    let d = (a - b) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d <= -Math.PI) d += TAU;
    return d;
  }
  const grau = (rad) => rad * 180 / Math.PI;

  /* Oito setores nomeados em português, para o viés poder ser dito
     em palavras e não em radianos. O eixo y da tela cresce para
     BAIXO, então "cima" é ângulo negativo. */
  const SETORES = [
    { id: 'd', nome: 'direita', ang: 0 },
    { id: 'bd', nome: 'baixo-direita', ang: Math.PI / 4 },
    { id: 'b', nome: 'baixo', ang: Math.PI / 2 },
    { id: 'be', nome: 'baixo-esquerda', ang: 3 * Math.PI / 4 },
    { id: 'e', nome: 'esquerda', ang: Math.PI },
    { id: 'ce', nome: 'cima-esquerda', ang: -3 * Math.PI / 4 },
    { id: 'c', nome: 'cima', ang: -Math.PI / 2 },
    { id: 'cd', nome: 'cima-direita', ang: -Math.PI / 4 },
  ];
  const setorDe = (ang) => SETORES[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];

  class MotorMira extends U.E.MotorBase {
    constructor(hud, cfg, api) {
      super(hud, cfg, api);
      this.estado = 'ocioso';
      this.pontos = 0;
      this.detalhe = [];
      this.botoes = cfg.botoes || ['s1', 's2', 's3'];
      /* Os oito setores entram em quantidade igual: sem isso o viés
         por direção sairia de três tentativas num setor e onze em
         outro, e a comparação entre eles não significaria nada. */
      const lista = [];
      for (let i = 0; i < this.n; i++) lista.push(SETORES[i % SETORES.length]);
      this.ordemSetor = U.shuffle(lista);
    }

    iniciar() {
      this.hud.mira = null;
      super.iniciar();
    }
    parar() {
      super.parar();
      this.hud.mira = null;
      this.hud.arrastoMira = null;
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
    }

    /* ============================================================
       UMA TENTATIVA
       ============================================================ */
    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++; this.placar();

      const c = this.cfg;
      this.botao = U.pick(this.botoes);
      this.heroi = { x: c.heroiX ?? 0.34, y: c.heroiY ?? 0.52 };
      this.alcance = c.alcance ?? 0.26;

      /* o setor é balanceado; o ângulo exato dentro dele é sorteado,
         senão o exercício viraria oito respostas decoradas */
      const s = this.ordemSetor[this.i - 1];
      this.anguloAlvo = s.ang + U.rnd(-Math.PI / 8, Math.PI / 8);
      this.setor = s;
      this.dist = U.rnd(c.distMin ?? 0.17, c.distMax ?? 0.30);

      /* alvo móvel: a direção certa passa a ser onde ele VAI estar */
      this.vel = c.movimento ? U.rnd(c.velMin ?? 0.05, c.velMax ?? 0.13) : 0;
      this.dirMov = this.anguloAlvo + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2)
                    + U.rnd(-0.5, 0.5);
      this.voo = c.voo ?? 0.35;         // segundos até o tiro chegar

      this.soltou = null; this.erro = null; this.rt = null;
      this.hud.limparMarcas();
      this.hud.campo = [];
      this.hud.setOverlay(null);
      this.hud.mira = {
        heroi: this.heroi, alvo: null, alcance: this.alcance,
        tolerancia: (c.tolerancia ?? 14) * Math.PI / 180,
        certo: null, solto: null,
      };

      this.estado = 'preparo';
      /* a habilidade a usar aparece antes do alvo: no jogo você já
         sabe qual botão vai apertar quando o alvo surge */
      this.hud.marcar(this.botao, { destaque: true, cor: '#ffd479' });
      this.hud.setOverlay({
        texto: (U.HUD.getHud()[this.botao] || {}).curto || this.botao,
        sub: 'segure e arraste na direção do alvo',
        cx: 0.50, cy: 0.16, tam: 0.12, cor: '#ffd479', fundo: false,
      });
      this.T.after(c.tempoLeitura ?? 900, () => this.mostrar());
    }

    mostrar() {
      if (!this.ativo) return;
      this.estado = 'mirando';
      this.hud.setOverlay(null);
      this.t0 = U.now();
      this.pos0 = {
        x: this.heroi.x + Math.cos(this.anguloAlvo) * this.dist,
        y: this.heroi.y + Math.sin(this.anguloAlvo) * this.dist * this.razaoY(),
      };
      this.hud.mira.alvo = { ...this.pos0, r: this.cfg.raioAlvo ?? 0.024, cor: '#ff5470' };
      U.Sfx.cue();

      if (this.vel) this.animar();

      this.T.after(this.cfg.limite ?? 2600, () => {
        if (this.estado === 'mirando') this.resolver(null);
      });
    }

    /** A caixa do jogo é 20:9; sem corrigir, um ângulo no referencial
        normalizado não é o ângulo que o olho vê na tela. */
    razaoY() {
      const B = this.hud.box;
      return B && B.h ? B.w / B.h : 1;
    }

    animar() {
      const passo = () => {
        if (this.estado !== 'mirando' || !this.hud.mira) return;
        const t = (U.now() - this.t0) / 1000;
        const a = this.hud.mira.alvo;
        a.x = U.clamp(this.pos0.x + Math.cos(this.dirMov) * this.vel * t, 0.06, 0.94);
        a.y = U.clamp(this.pos0.y + Math.sin(this.dirMov) * this.vel * t * this.razaoY(), 0.08, 0.92);
        this._raf = requestAnimationFrame(passo);
      };
      this._raf = requestAnimationFrame(passo);
    }

    /* ------------------------------------------------------------
       A DIREÇÃO CERTA

       Com alvo parado é o ângulo do herói até ele. Com alvo em
       movimento é o ângulo até onde ele ESTARÁ quando o tiro chegar
       — que é a habilidade de verdade, e a razão de o alvo se mexer
       a partir da dificuldade 8. O app não simula interceptação
       exata: usa a posição prevista no tempo de voo, que é a
       aproximação que um jogador faz de cabeça.
       ------------------------------------------------------------ */
    direcaoCerta() {
      const a = this.hud.mira.alvo;
      const px = a.x + Math.cos(this.dirMov) * this.vel * this.voo;
      const py = a.y + Math.sin(this.dirMov) * this.vel * this.voo * this.razaoY();
      return Math.atan2((py - this.heroi.y) / this.razaoY(), px - this.heroi.x);
    }

    /* ---------- entrada vinda do HudSurface ---------- */
    miraInicio() {
      if (this.estado !== 'mirando') return;
      this.tPegou = U.now();
    }
    miraSolta(e) {
      if (this.estado !== 'mirando') return;
      if (e.id !== this.botao) return this.resolver(null, 'botao');
      if (!e.moveu || e.mag < (this.cfg.magMin ?? 0.35)) return this.resolver(null, 'curto');
      this.resolver(e);
    }

    press(e) {
      /* botão tocado sem arrastar, ou botão errado: as duas coisas são
         erro de mira e ficam registradas como tal em vez de silêncio */
      if (this.estado !== 'mirando') return;
      if (e && e.id && e.id !== this.botao) this.resolver(null, 'botao');
    }

    resolver(e, motivo) {
      if (this.estado !== 'mirando') return;
      this.estado = 'fim';
      this.T.clear();
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }

      const certo = this.direcaoCerta();
      const c = this.cfg;
      const tolRad = (c.tolerancia ?? 14) * Math.PI / 180;

      let ok = false, err = motivo || 'lento', dif = null;
      if (e) {
        this.soltou = e.ang;
        dif = difAng(e.ang, certo);
        this.erro = Math.abs(grau(dif));
        this.rt = U.now() - this.t0;
        ok = Math.abs(dif) <= tolRad;
        err = ok ? null : 'mira';
      }

      const ganho = ok
        ? Math.round(40 + 40 * (1 - Math.abs(dif) / tolRad)
                     + 20 * U.clamp(1 - this.rt / (c.limite ?? 2600), 0, 1))
        : 0;
      this.pontos += ganho;

      this.detalhe.push({
        setor: this.setor.id, nomeSetor: this.setor.nome,
        alvoAng: this.anguloAlvo, certo, solto: this.soltou,
        erro: this.erro, dif: dif != null ? grau(dif) : null,
        ok, err, rt: this.rt, dist: this.dist, movel: !!this.vel,
        botao: this.botao, pontos: ganho,
      });

      this.anota({
        k: 'mira', ok, err, rt: this.rt, tot: ok ? this.rt : null,
        x: { st: this.setor.id, e: this.erro != null ? +this.erro.toFixed(1) : null,
             d: dif != null ? +grau(dif).toFixed(1) : null,
             mv: this.vel ? 1 : 0, b: this.botao, tol: c.tolerancia ?? 14, pts: ganho },
      });

      ok ? (U.Sfx.perfect(), U.Haptic.good()) : (U.Sfx.miss(), U.Haptic.bad());
      this.hud.mira.certo = certo;
      this.hud.mira.solto = this.soltou;
      this.placar();

      if (this.retorno) {
        /* O texto vai para o ALTO e sem véu por cima do campo. O
           conteúdo do retorno são as duas linhas — a verde do certo e a
           vermelha do seu tiro — e escurecer ou tapar o campo esconderia
           exatamente a comparação que corrige a mira. */
        this.hud.setOverlay({
          texto: this.erro != null ? `${Math.round(this.erro)}°` : '—',
          sub: this.erro != null
            ? (ok ? `dentro dos ${c.tolerancia ?? 14}° · ${Math.round(this.rt)} ms`
                  : `${Math.round(this.erro)}° fora — verde era o certo, vermelho foi o seu`)
            : (err === 'botao' ? 'botão errado'
              : err === 'curto' ? 'arraste mais longe para a direção contar'
              : 'não soltou a tempo'),
          cx: 0.50, cy: 0.13, tam: 0.11,
          cor: ok ? '#6ee7a8' : '#ff8fa3', fundo: false,
        });
      }
      this.diz(ok ? 'mira certa' : (err === 'mira' ? `${Math.round(this.erro)}° fora` : 'sem tiro'),
               ok ? 'ok' : 'erro');
      this.T.after(this.retorno ? (ok ? 900 : 1700) : 420, () => {
        this.hud.setOverlay(null);
        this.proxima();
      });
    }

    /* ============================================================
       O QUE O BLOCO DIZ
       ============================================================ */
    extras() {
      const d = this.detalhe.filter(x => x.erro != null);
      if (!d.length) return { mira: { pontos: this.pontos, n: 0 } };

      /* viés por setor: mediana do erro COM SINAL. Um setor com erro
         grande e sinal alternado é imprecisão; com sinal constante é
         desvio sistemático, que se corrige de propósito. */
      const porSetor = {};
      for (const x of d) {
        const e = porSetor[x.setor] || (porSetor[x.setor] = { nome: x.nomeSetor, difs: [], ok: 0, n: 0 });
        e.difs.push(x.dif); e.n++; e.ok += x.ok ? 1 : 0;
      }
      for (const k in porSetor) {
        const e = porSetor[k];
        e.vies = U.median(e.difs);
        e.erro = U.median(e.difs.map(Math.abs));
      }

      const sistem = Object.entries(porSetor)
        .filter(([, e]) => e.n >= 3 && Math.abs(e.vies) >= 6)
        .sort((a, b) => Math.abs(b[1].vies) - Math.abs(a[1].vies));

      /* ------------------------------------------------------------
         O VIÉS GERAL É O ACHADO QUE CABE NUM BLOCO.

         Por setor, um desvio só vira afirmação com cinco tiros em cada
         um — o que, com oito setores, pede quarenta tiros e portanto
         três blocos. Mas o padrão que o pivô do polegar produz não é
         de um setor: é a mão inteira girando para o mesmo lado, em
         todas as direções. Esse aparece com dezesseis tiros.

         O intervalo vem de reamostragem da mediana, e o desvio só é
         declarado quando o intervalo NÃO inclui o zero. Sem isso,
         qualquer bloco com ruído assimétrico viraria "você puxa para
         a direita".
         ------------------------------------------------------------ */
      const difs = d.map(x => x.dif);
      const bg = U.S.bootMediana(difs);
      const viesReal = bg.lo > 0 || bg.hi < 0;

      return {
        mira: {
          pontos: this.pontos, n: d.length,
          erro: U.median(d.map(x => x.erro)),
          erroParado: (() => { const a = d.filter(x => !x.movel).map(x => x.erro); return a.length ? U.median(a) : null; })(),
          erroMovel: (() => { const a = d.filter(x => x.movel).map(x => x.erro); return a.length ? U.median(a) : null; })(),
          dentro: d.filter(x => x.ok).length / d.length,
          rt: (() => { const a = d.filter(x => x.ok).map(x => x.rt); return a.length ? U.median(a) : null; })(),
          viesGeral: bg.v, viesLo: bg.lo, viesHi: bg.hi, viesReal,
          porSetor,
          sistematico: sistem.length ? { setor: sistem[0][0], ...sistem[0][1] } : null,
          semTiro: this.detalhe.filter(x => x.erro == null).length,
          tolerancia: this.cfg.tolerancia ?? 14,
        },
      };
    }
  }

  U.E.MotorMira = MotorMira;
  U.E.MIRA = { SETORES, setorDe, difAng, grau };

})(window.U);
