/* ============================================================
   js/motor-antecipa.js — LEITURA DO INIMIGO
   Antecipação treinada por oclusão temporal DE MOVIMENTO.

   ------------------------------------------------------------
   O QUE A EVIDÊNCIA SUSTENTA, E O QUE ESTE MOTOR MUDA

   Oclusão temporal é a técnica de treino perceptivo com melhor
   sustentação no esporte: mostrar o adversário se preparando,
   CORTAR a imagem antes do golpe e obrigar a decidir com o que se
   viu. Meta-análises recentes encontram efeito sobre antecipação, e
   o ganho aparece também fora da tela (princípio "oclusao", aba
   Método). Mas o que se treina ali é ler o CORPO do adversário —
   a cinemática que vem antes da ação.

   O exercício de Leitura que já existia mostra um ÍCONE e corta.
   Isso treina reconhecer símbolo rápido, não ler movimento. Este
   motor é a versão fiel ao método:
   · o inimigo se prepara com o corpo: gira para mirar, recua a
     arma, agacha para saltar, vira as costas para fugir — e às
     vezes começa um golpe e desiste (finta);
   · a tela corta num ponto ANTES do golpe sair;
   · você responde com o que viu;
   · e aí vem a parte que ensina: a jogada é REPRISADA inteira,
     sem corte, com o desfecho. Nos estudos de oclusão, é ver o
     que aconteceu depois da decisão que corrige a leitura.

   ------------------------------------------------------------
   AS QUATRO LEITURAS E AS RESPOSTAS
   · TIRO — ele gira e mira um pouco acima ou abaixo de você (mira
     com antecedência, como no jogo). Desvie para o lado OPOSTO ao
     da mira: analógico para cima ou para baixo.
   · SALTO — ele gira para você e agacha. Recue: analógico para trás.
   · FUGA — ele vira as costas. Persiga com a 1 (Reflective Assault,
     o avanço da Jing).
   · FINTA — começa igual ao tiro e desiste. Não faça nada.

   ------------------------------------------------------------
   JANELAS DE CORTE
   Medidas em ms ANTES do golpe sair. A de −150 ms está em todas as
   dificuldades, sempre: é a régua fixa que deixa comparar esta
   semana com a passada. As outras desenham a curva de quanto antes
   você consegue ler.

   A DICA DE ONDE OLHAR (até a dificuldade 3) aponta a região do
   corpo, e não a regra: "olhe a arma e o giro". Descobrir a regra
   olhando o lugar certo é a descoberta guiada, que nos estudos de
   instrução para antecipação se manteve melhor sob pressão do que
   a regra dita pronta.

   O QUE É ILUSTRATIVO: o boneco, as distâncias e os tempos de
   preparação. Não é a animação de um herói real do jogo — o banco
   não tem animação nenhuma. O que é treinado é o processo: ler a
   preparação e decidir antes de ela terminar.
   ============================================================ */
'use strict';
(function (U) {

  const ROTULO = {
    tiro: 'Tiro', avanco: 'Salto', fuga: 'Fuga', finta: 'Finta',
  };
  const RESP = {
    cima: 'desviar para cima', baixo: 'desviar para baixo', tras: 'recuar',
    frente: 'avançar', s1: 'perseguir com a 1', nada: 'não fazer nada',
  };
  const ease = (k) => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  const faixa = (k, a, b) => ease((k - a) / (b - a));

  class MotorAntecipa extends U.E.MotorBase {
    constructor(hud, cfg, api) {
      super(hud, cfg, api);
      this.estado = 'ocioso';
      this.detalhe = [];
      /* janelas balanceadas e embaralhadas; a de −150 sempre presente */
      const js = cfg.janelas && cfg.janelas.length ? cfg.janelas : [0, -150, -300];
      this.ordemJanela = U.shuffle(Array.from({ length: this.n }, (_, i) => js[i % js.length]));
      /* ações balanceadas: 40% tiro, 20% cada uma das outras */
      const acoes = cfg.finta ? ['tiro', 'tiro', 'avanco', 'fuga', 'finta'] : ['tiro', 'tiro', 'avanco', 'fuga'];
      this.ordemAcao = U.shuffle(Array.from({ length: this.n }, (_, i) => acoes[i % acoes.length]));
    }

    iniciar() {
      this.hud.setAlvo(null);
      this.hud.cena = (c, B) => this.desenhar(c, B);
      super.iniciar();
    }
    parar() { super.parar(); this.hud.cena = null; }

    /* ---------- geometria (fração da caixa) ---------- */
    get pJing() { return { x: 0.25, y: 0.46 }; }
    get pInim() { return { x: 0.60, y: 0.46 }; }
    angParaJing() {
      const B = this.hud.box, a = this.pInim, j = this.pJing;
      return Math.atan2((j.y - a.y) * B.h, (j.x - a.x) * B.w);
    }

    /* ============================================================
       UMA TENTATIVA
       ============================================================ */
    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++; this.placar();
      const c = this.cfg;
      this.acao = this.ordemAcao[this.i - 1];
      this.janela = this.ordemJanela[this.i - 1];      // null = sem corte
      this.Tp = c.preparo ?? 650;
      this.tp0 = U.rnd(500, 1100);                     // quando a preparação começa
      this.tr = this.tp0 + this.Tp;                    // quando o golpe sai
      /* o lado da mira, em ângulo de tela (y cresce para baixo): com o
         inimigo à direita, +1 gira a mira para CIMA de você — desvie
         para baixo; −1 mira abaixo — desvie para cima */
      this.lado = Math.random() < 0.5 ? 1 : -1;
      const off = (c.desvio ?? 14) * Math.PI / 180;
      this.thAlvo = this.acao === 'fuga'
        ? this.angParaJing() + Math.PI + U.rnd(-0.5, 0.5)
        : this.acao === 'avanco' ? this.angParaJing()
        : this.angParaJing() + this.lado * off;
      /* começa olhando para um lado qualquer — o início não entrega nada */
      this.th0 = this.angParaJing() + U.rnd(-1.2, 1.2) + (Math.random() < 0.3 ? Math.PI : 0);
      this.resposta = null; this.tResp = null;
      this.replay = false; this.resultado = null;
      this.t0 = U.now();
      this.estado = 'cena';
      this.hud.limparMarcas();
      this.hud.setOverlay(null);
      if (c.dica) {
        this.hud.setOverlay({ texto: '', sub: 'olhe a arma e o giro do corpo', cx: 0.6, cy: 0.12,
                              tam: 0.05, fundo: false, subCor: 'rgba(200,214,236,.75)' });
      }
      const lim = c.limite ?? 800;
      this.T.after(this.tr + lim, () => this.resolver(null));
    }

    relogio() { return U.now() - this.t0; }

    /* ---------- respostas ---------- */
    responder(r) {
      if (!this.ativo || this.estado !== 'cena' || this.resposta) return;
      const s = this.relogio();
      this.resposta = r; this.tResp = s;
      this.resolver(r);
    }
    press(e) {
      if (!e || !e.id) return;
      if (e.id === 's1') this.responder('s1');
    }
    joy(j) {
      if (!j || !(j.mag > 0.55)) return;
      const a = j.ang;
      const r = a > -2.356 && a < -0.785 ? 'cima'
              : a > 0.785 && a < 2.356 ? 'baixo'
              : Math.abs(a) >= 2.356 ? 'tras' : 'frente';
      this.responder(r);
    }

    certa() {
      return this.acao === 'tiro' ? (this.lado > 0 ? 'baixo' : 'cima')
           : this.acao === 'avanco' ? 'tras'
           : this.acao === 'fuga' ? 's1' : 'nada';
    }

    resolver(r) {
      if (this.estado !== 'cena') return;
      this.estado = 'reprise';
      this.T.clear();
      const s = this.tResp;
      const resp = r || 'nada';
      const certa = this.certa();
      const ok = resp === certa;
      let err = null;
      if (!ok) {
        if (r && s != null && s < this.tp0) err = 'pressa';
        else if (this.acao === 'finta') err = 'finta';
        else if (!r) err = 'lento';
        else if (this.acao === 'tiro' && (resp === 'cima' || resp === 'baixo')) err = 'lado';
        else err = 'leitura';
      }
      /* tempo da decisão relativo ao golpe: negativo = decidiu antes de
         ele sair, que é o que antecipação quer dizer */
      const rel = r && s != null ? Math.round(s - this.tr) : null;
      this.resultado = { ok, err, resp, certa, rel };
      this.detalhe.push({ acao: this.acao, janela: this.janela, ok, err, resp, rel });
      this.anota({
        k: 'antecipa', ok, err, rt: rel, tot: null,
        x: { a: this.acao, j: this.janela, r: resp },
      });
      ok ? (U.Sfx.perfect(), U.Haptic.good()) : (U.Sfx.miss(), U.Haptic.bad());
      this.placar();

      /* a reprise: a jogada inteira, sem corte, desde um pouco antes da
         preparação — é o desfecho visto que corrige a leitura */
      this.replay = true;
      this.t0 = U.now() - (this.tp0 - 250);
      this.hud.setOverlay(null);
      const txt = ok ? 'LEU CERTO' : ({ pressa: 'CHUTOU', finta: 'CAIU NA FINTA', lento: 'NÃO DECIDIU',
        lado: 'LADO ERRADO', leitura: 'LEU ERRADO' })[err];
      const sub = `era ${ROTULO[this.acao].toLowerCase()} — ${RESP[certa]}` +
        (!ok && r ? ` · você: ${RESP[resp]}` : '') +
        (rel != null ? ` · ${rel <= 0 ? `${-rel} ms antes do golpe` : `${rel} ms depois`}` : '');
      this.T.after(250, () => {
        if (!this.ativo) return;
        this.hud.setOverlay({ texto: txt, sub, cx: 0.42, cy: 0.1, tam: 0.075,
                              cor: ok ? '#6ee7a8' : '#ff8fa3', fundo: false });
      });
      this.diz(ok ? 'leu certo' : txt.toLowerCase(), ok ? 'ok' : 'erro');
      const dur = 250 + this.Tp + 1000 + (ok ? 300 : 900);
      this.T.after(dur, () => { this.hud.setOverlay(null); this.proxima(); });
    }

    /* ============================================================
       POSE — onde está e como está o inimigo no instante s
       ============================================================ */
    pose(s) {
      const B = this.hud.box;
      const P = { x: this.pInim.x, y: this.pInim.y, th: this.th0, lean: 0, sqx: 1, sqy: 1,
                  recuo: 0, brilho: 0, arma: 1 };
      const idle = Math.sin(s / 260) * 0.08;
      if (s < this.tp0) { P.th = this.th0 + idle; return P; }
      const k = (s - this.tp0) / this.Tp;
      const gira = (ate) => this.th0 + (this.thAlvo - this.th0) * faixa(k, 0, ate);
      const dirJ = this.angParaJing();
      if (this.acao === 'tiro' || this.acao === 'finta') {
        if (this.acao === 'finta' && k > 0.55) {
          /* desiste: afrouxa a arma, o brilho some e o corpo volta */
          const d = faixa(k, 0.55, 1);
          P.th = this.thAlvo + (this.th0 - this.thAlvo) * d * 0.45;
          P.recuo = faixa(0.55, 0.3, 0.8) * (1 - d);
          P.brilho = faixa(0.55, 0.5, 1) * (1 - d);
        } else {
          P.th = gira(0.5);
          P.recuo = faixa(k, 0.3, 0.8);
          P.brilho = faixa(k, 0.5, 1);
        }
      } else if (this.acao === 'avanco') {
        P.th = gira(0.4);
        const ag = faixa(k, 0.3, 1);
        P.sqx = 1 + 0.14 * ag; P.sqy = 1 - 0.2 * ag;
        P.lean = -0.25 * ag;                           // pende para trás, carregando o salto
      } else if (this.acao === 'fuga') {
        P.th = gira(0.6);
        P.lean = 0.35 * faixa(k, 0.4, 1);              // pende para o lado de fora
        P.arma = 1 - 0.5 * faixa(k, 0.3, 0.9);
      }
      if (s >= this.tr && this.acao !== 'finta') {
        const u = (s - this.tr) / 700;
        if (this.acao === 'avanco') {
          const alvoX = this.pJing.x + 0.06, d = ease(Math.min(1, u * 2.2));
          const pare = this.resultado && this.resultado.resp === 'tras' ? 0.75 : 1;
          P.x = this.pInim.x + (alvoX - this.pInim.x) * d * pare;
          P.sqx = 1; P.sqy = 1; P.lean = 0;
        } else if (this.acao === 'fuga') {
          P.x = this.pInim.x + 0.3 * ease(Math.min(1, u * 1.6)) * Math.cos(this.thAlvo);
          P.y = this.pInim.y + 0.3 * ease(Math.min(1, u * 1.6)) * Math.sin(this.thAlvo) * (B.w / B.h);
          if (this.resultado && this.resultado.resp === 's1') P.x -= 0.05 * ease(Math.max(0, u - 0.4) * 2);
        } else if (this.acao === 'tiro') {
          P.recuo = Math.max(0, 1 - u * 5); P.brilho = Math.max(0, 1 - u * 4);
        }
      }
      return P;
    }

    /** Onde a Jing está: parada, ou saindo conforme a resposta dada. */
    poseJing(s) {
      const J = { x: this.pJing.x, y: this.pJing.y };
      const R = this.resultado || (this.resposta ? { resp: this.resposta } : null);
      if (!R || !R.resp || R.resp === 'nada') return J;
      /* ela só se move depois de ter respondido — e na reprise, no
         mesmo instante em que respondeu */
      const tResp = this.tResp != null ? this.tResp : this.tr;
      const u = ease((s - tResp) / 260);
      if (u <= 0) return J;
      const B = this.hud.box, dy = 0.22 * u, dx = 0.07 * u * (B.h / B.w) * 2.2;
      if (R.resp === 'cima') J.y -= dy;
      else if (R.resp === 'baixo') J.y += dy;
      else if (R.resp === 'tras') J.x -= dx;
      else if (R.resp === 'frente') J.x += dx;
      else if (R.resp === 's1') J.x += 0.12 * u;
      return J;
    }

    /* ============================================================
       DESENHO
       ============================================================ */
    desenhar(c, B) {
      if (this.estado === 'ocioso' || this.acao == null) return;
      const s = this.relogio();
      const P = this.pose(s), J = this.poseJing(s);
      const X = (x) => B.x + x * B.w, Y = (y) => B.y + y * B.h;
      const r = B.h * 0.075;

      /* o golpe de tiro: uma onda larga ao longo da mira */
      if (this.acao === 'tiro' && s >= this.tr) {
        const u = (s - this.tr) / 520;
        if (u < 1.4) {
          const L = Math.hypot((this.pJing.x - this.pInim.x) * B.w, 0) / Math.cos(this.thAlvo - this.angParaJing());
          const ox = X(this.pInim.x), oy = Y(this.pInim.y);
          const dist = Math.min(1.3, u) * L * 1.25;
          const lat = Math.abs(Math.tan(this.thAlvo - this.angParaJing())) * Math.abs(X(this.pJing.x) - ox);
          const larg = 2 * lat + B.h * 0.1;
          c.save();
          c.translate(ox, oy); c.rotate(this.thAlvo);
          /* a área do golpe (larga e apagada) e o núcleo brilhante na frente */
          const g = c.createLinearGradient(0, 0, dist, 0);
          g.addColorStop(0, 'rgba(255,90,110,0)'); g.addColorStop(0.75, 'rgba(255,90,110,.16)'); g.addColorStop(1, 'rgba(255,160,175,.42)');
          c.globalCompositeOperation = 'lighter';
          c.fillStyle = g;
          c.fillRect(0, -larg / 2, dist, larg);
          c.strokeStyle = 'rgba(255,120,140,.55)'; c.lineWidth = 1.5; c.setLineDash([6, 6]);
          c.beginPath(); c.moveTo(0, -larg / 2); c.lineTo(dist, -larg / 2); c.moveTo(0, larg / 2); c.lineTo(dist, larg / 2); c.stroke();
          c.setLineDash([]);
          const fr = c.createRadialGradient(dist, 0, 0, dist, 0, larg * 0.5);
          fr.addColorStop(0, 'rgba(255,235,240,.9)'); fr.addColorStop(1, 'rgba(255,90,110,0)');
          c.fillStyle = fr; c.beginPath(); c.ellipse(dist, 0, larg * 0.18, larg * 0.5, 0, 0, 6.2832); c.fill();
          c.restore();
        }
      }

      /* ---------- a Jing ---------- */
      this.boneco(c, X(J.x), Y(J.y), r * 0.9, {
        cor: '#a78bfa', cor2: '#e2d9ff', th: 0, arma: 0.7, rotulo: 'Jing',
      });

      /* ---------- o inimigo ---------- */
      this.boneco(c, X(P.x), Y(P.y), r, {
        cor: '#ff5470', cor2: '#ffb3c0', th: P.th, lean: P.lean, sqx: P.sqx, sqy: P.sqy,
        recuo: P.recuo, brilho: P.brilho, arma: P.arma, rotulo: 'inimigo',
      });

      /* ---------- o corte ---------- */
      const corta = !this.replay && this.janela != null && s >= this.tr + this.janela;
      if (corta) {
        c.save();
        c.fillStyle = '#05070c';
        c.fillRect(B.x, B.y, B.w, B.h);
        c.fillStyle = 'rgba(160,175,205,.55)';
        c.font = `800 ${Math.round(B.h * 0.06)}px ui-rounded, system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('decida com o que viu', X(0.42), Y(0.45));
        c.font = `600 ${Math.round(B.h * 0.035)}px system-ui, sans-serif`;
        c.fillStyle = 'rgba(160,175,205,.4)';
        c.fillText('analógico: cima · baixo · trás   ·   1: perseguir   ·   nada: finta', X(0.42), Y(0.53));
        c.restore();
      }
      if (this.replay) {
        c.save();
        c.font = `800 ${Math.round(B.h * 0.03)}px system-ui, sans-serif`;
        c.fillStyle = 'rgba(200,214,236,.55)'; c.textAlign = 'left'; c.textBaseline = 'top';
        c.fillText('REPRISE — sem corte', B.x + B.w * 0.02, B.y + B.h * 0.03);
        c.restore();
      }
    }

    /** Um boneco de cima: corpo, ombros, nariz de direção e arma. */
    boneco(c, x, y, r, o) {
      c.save();
      c.fillStyle = 'rgba(0,0,0,.35)';
      c.beginPath(); c.ellipse(x, y + r * 0.95, r * 0.95, r * 0.26, 0, 0, 6.2832); c.fill();
      const th = o.th || 0;
      /* pender: desloca o tronco na direção da mira (+) ou oposta (−) */
      const lx = Math.cos(th) * r * (o.lean || 0), ly = Math.sin(th) * r * (o.lean || 0);
      c.translate(x + lx, y + ly);
      c.rotate(th);
      c.scale(o.sqy || 1, o.sqx || 1);
      // arma: sai da mão da frente; recua quando carrega
      const comp = r * 1.55 * (o.arma ?? 1), rec = (o.recuo || 0) * r * 0.55;
      c.strokeStyle = '#d7dbe6'; c.lineWidth = Math.max(3, r * 0.16); c.lineCap = 'round';
      c.beginPath(); c.moveTo(r * 0.35 - rec, r * 0.45); c.lineTo(r * 0.35 - rec + comp, r * 0.3); c.stroke();
      if (o.brilho > 0) {
        const bx = r * 0.35 - rec + comp, by = r * 0.3;
        const g = c.createRadialGradient(bx, by, 0, bx, by, r * 0.7 * o.brilho + 1);
        g.addColorStop(0, `rgba(255,240,200,${0.95 * o.brilho})`); g.addColorStop(1, 'rgba(255,90,110,0)');
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = g; c.beginPath(); c.arc(bx, by, r * 0.7 * o.brilho + 1, 0, 6.2832); c.fill();
        c.globalCompositeOperation = 'source-over';
      }
      // ombros
      c.fillStyle = this.hud.mix(o.cor2, 0.9);
      c.beginPath(); c.arc(r * 0.05, -r * 0.62, r * 0.3, 0, 6.2832); c.fill();
      c.beginPath(); c.arc(r * 0.05, r * 0.62, r * 0.3, 0, 6.2832); c.fill();
      // corpo
      const g = c.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
      g.addColorStop(0, this.hud.mix(o.cor2, 0.95)); g.addColorStop(1, this.hud.mix(o.cor, 0.9));
      c.fillStyle = g; c.shadowColor = o.cor; c.shadowBlur = 12;
      c.beginPath(); c.arc(0, 0, r * 0.62, 0, 6.2832); c.fill();
      c.shadowBlur = 0;
      // nariz: para onde está virado
      c.fillStyle = '#ffffff';
      c.beginPath(); c.moveTo(r * 0.72, 0); c.lineTo(r * 0.42, -r * 0.16); c.lineTo(r * 0.42, r * 0.16); c.closePath(); c.fill();
      c.restore();
      if (o.rotulo) {
        c.save();
        c.font = `700 ${Math.round(r * 0.36)}px system-ui, sans-serif`;
        c.fillStyle = 'rgba(214,226,246,.7)'; c.textAlign = 'center'; c.textBaseline = 'top';
        c.fillText(o.rotulo, x, y + r * 1.25);
        c.restore();
      }
    }

    /* ============================================================
       RESUMO — a curva por janela é a medida
       ============================================================ */
    extras() {
      const d = this.detalhe;
      if (!d.length) return { antecipa: { n: 0 } };
      const porJanela = {};
      for (const x of d) {
        const k = x.janela == null ? 'sem' : String(x.janela);
        const e = porJanela[k] || (porJanela[k] = { n: 0, ok: 0 });
        e.n++; if (x.ok) e.ok++;
      }
      const porAcao = {};
      for (const x of d) {
        const e = porAcao[x.acao] || (porAcao[x.acao] = { n: 0, ok: 0, erros: {} });
        e.n++; if (x.ok) e.ok++; else e.erros[x.err] = (e.erros[x.err] || 0) + 1;
      }
      const rels = d.filter(x => x.ok && x.rel != null).map(x => x.rel);
      /* a janela mais cedo em que você ainda acerta 3 de 4 (com 4+ tentativas) */
      const cedo = Object.entries(porJanela).filter(([k, e]) => k !== 'sem' && e.n >= 4 && e.ok / e.n >= 0.75)
        .map(([k]) => +k).sort((a, b) => a - b)[0];
      return {
        antecipa: {
          n: d.length, porJanela, porAcao,
          rel: rels.length ? U.median(rels) : null,
          leCedo: cedo != null ? cedo : null,
          dica: !!this.cfg.dica,
        },
      };
    }
  }

  U.E.MotorAntecipa = MotorAntecipa;
  U.E.ANTECIPA = { ROTULO, RESP };

})(window.U);
