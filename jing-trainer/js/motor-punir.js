/* ============================================================
   js/motor-punir.js — PUNIR NO TIRANO
   O treino do momento que decide objetivo na selva.

   ------------------------------------------------------------
   POR QUE ESTE TREINO EXISTE

   A Jing joga na selva, e o feitiço dela é o Punir (Smite) — as duas
   buscas da build deram o mesmo feitiço, confiança ALTA (aba Heróis,
   ficha da Jing). Na selva, Tirano e Soberano são decididos num
   instante: o Punir tira uma quantidade fixa de vida, e quem aperta
   primeiro quando a vida do monstro cabe nesse dano leva o objetivo.

   Os dois erros são simétricos e os dois custam o objetivo:
   · CEDO — a vida ainda não cabe no Punir. Ele sai, não mata, e
     entra em recarga. O caçador inimigo agora pune de graça.
   · TARDE — a vida já cabia e você não apertou. O caçador inimigo
     aperta primeiro e rouba.

   Isso é percepção e tempo de resposta sob pressão, com uma decisão
   de "ainda não / agora" em cima — exatamente o que dá para treinar
   fora do jogo.

   ------------------------------------------------------------
   O QUE É DO JOGO E O QUE É ILUSTRATIVO

   · DO JOGO: Jing usa Punir; o Punir tira vida fixa de monstro; a
     disputa com o caçador inimigo; Tirano e Soberano no rio.
   · ILUSTRATIVO: os números. O dano do Punir no jogo sobe com o
     nível do herói, e a vida dos monstros sobe com o tempo de
     partida — o banco não tem esses valores. Por isso o dano do
     Punir MUDA a cada tentativa e é mostrado na tela: o que se treina
     é comparar a vida com o seu dano e reagir, não decorar um número.
   · ILUSTRATIVO: a reação do caçador inimigo. Ela é um tempo sorteado
     em volta de um valor que cai com a dificuldade — de um jogador
     distraído a um que está com o dedo em cima do botão.

   ------------------------------------------------------------
   A DIFICULDADE MEXE EM QUATRO COISAS, UMA DE CADA VEZ
   · ritmo e tamanho dos golpes da equipe (janela mais curta);
   · a variação dos golpes (a vida pula por cima do limite);
   · se o caçador inimigo está lá e quão rápido ele é;
   · a ajuda visual: linha do Punir na barra (até dif 4), número da
     vida (até dif 7). Depois, só a barra — como no jogo.
   ============================================================ */
'use strict';
(function (U) {

  const MONSTROS = {
    tirano:   { nome: 'TIRANO',   cor: '#ff7a45', cor2: '#ffb36b', hp: [7000, 9000] },
    soberano: { nome: 'SOBERANO', cor: '#a78bfa', cor2: '#d8c8ff', hp: [9500, 12000] },
  };
  const fmt = (v) => Math.max(0, Math.round(v)).toLocaleString('pt-BR');

  class MotorPunir extends U.E.MotorBase {
    constructor(hud, cfg, api) {
      super(hud, cfg, api);
      this.estado = 'ocioso';
      this.detalhe = [];
      /* disputa balanceada: a fração pedida, embaralhada — senão o
         jogador aprende a sequência em vez de olhar a tela */
      const nInim = Math.round(this.n * (cfg.fracInimigo ?? 0));
      this.ordem = U.shuffle(Array.from({ length: this.n }, (_, k) => k < nInim));
    }

    iniciar() {
      this.hud.setAlvo(null);
      this.hud.cena = (c, B) => this.desenhar(c, B);
      super.iniciar();
    }
    parar() {
      super.parar();
      this.hud.cena = null;
    }

    /* ============================================================
       UMA TENTATIVA
       ============================================================ */
    proxima() {
      if (!this.ativo) return;
      if (this.i >= this.n) return this.concluir();
      this.i++; this.placar();
      const c = this.cfg;
      this.mon = c.soberano && Math.random() < 0.5 ? 'soberano' : 'tirano';
      const M = MONSTROS[this.mon];
      this.hpMax = U.ri(M.hp[0], M.hp[1]);
      this.P = Math.round(U.rnd(900, 1700) / 10) * 10;
      this.hp = this.hpMax * U.rnd(0.28, 0.42);
      this.hpFantasma = this.hp;
      this.inimigo = this.ordem[this.i - 1];
      this.tEntrou = null; this.hpEntrou = null;
      this.golpes = 0;
      this.flashGolpe = 0; this.raio = null; this.morte = null;
      this.estado = 'luta';
      this.hud.limparMarcas();
      this.hud.marcar('flash', { rotulo: 'PU' });
      this.T.after(U.rnd(600, 1100), () => this.golpe());
    }

    /** Um golpe da equipe no monstro. */
    golpe() {
      if (!this.ativo || this.estado !== 'luta') return;
      const c = this.cfg;
      const vari = c.variacao ?? 0.3;
      let dano = (c.danoMedio ?? 300) * U.rnd(1 - vari, 1 + vari);
      const pico = Math.random() < (c.pico ?? 0);
      if (pico) dano *= 2.1;                       // o combo da Jing entrando
      /* Caçador inimigo nunca deixa o monstro morrer na mão da sua
         equipe: se o próximo golpe mata, ele aperta antes. Sem isto,
         numa disputa a equipe às vezes matava primeiro e o treino
         dava de graça um objetivo que na partida seria roubado. */
      if (this.inimigo && this.tEntrou != null && this.hp - dano <= 0) return this.roubar();
      /* Toda tentativa tem janela: um golpe só nunca leva a vida de
         acima do Punir direto a zero. Sem isto um pico grande às vezes
         matava o monstro sem a vida ter passado pelo alcance do Punir,
         e a tentativa contava erro sem ter existido chance. */
      if (this.tEntrou == null && this.hp - dano <= 0) {
        dano = this.hp - U.rnd(0.3, 0.85) * Math.min(this.P, this.hp);
      }
      this.hp -= dano;
      this.golpes++;
      this.flashGolpe = 1;
      const p = this.monPx();
      this.hud.flutuar(p.x + U.rnd(-p.r * 0.6, p.r * 0.6), p.y - p.r * 0.2,
                       fmt(dano), pico ? '#ffd479' : '#ffffff', pico ? 0.062 : 0.044);
      U.Sfx.pancada(pico);

      if (this.tEntrou == null && this.hp <= this.P) {
        this.tEntrou = U.now(); this.hpEntrou = this.hp;
        if (this.inimigo) {
          const r = (c.reacaoInimigo ?? 700) * U.rnd(0.8, 1.2);
          this.reacaoSorteada = r;
          this.T.after(r, () => this.roubar());
        }
      }
      if (this.hp <= 0) return this.fechar('tarde', null);
      this.T.after((c.ritmo ?? 450) * U.rnd(0.7, 1.3), () => this.golpe());
    }

    press(e) {
      if (!this.ativo || !e || e.id !== 'flash' || this.estado !== 'luta') return;
      const agora = U.now();
      U.Sfx.punir();
      this.raio = { t0: this.hud.tempo, cor: '#b9a4ff', de: 'cima' };
      const p = this.monPx();
      if (this.hp > this.P) {
        /* cedo: o Punir sai, tira o dano dele, e não mata */
        const sobra = this.hp - this.P;
        this.hp -= this.P;
        this.hud.flutuar(p.x, p.y - p.r * 0.55, fmt(this.P), '#c4b5fd', 0.06);
        return this.fechar('cedo', { sobra });
      }
      this.hud.flutuar(p.x, p.y - p.r * 0.55, fmt(this.P), '#c4b5fd', 0.07);
      const hpNaHora = this.hp;
      this.hp = 0;
      this.fechar('ok', { lat: agora - this.tEntrou, hpNaHora });
    }

    roubar() {
      if (!this.ativo || this.estado !== 'luta') return;
      this.raio = { t0: this.hud.tempo, cor: '#ff5470', de: 'direita' };
      U.Sfx.roubado();
      this.hp = 0;
      this.fechar('roubado', null);
    }

    monPx() {
      const B = this.hud.box;
      return { x: B.x + B.w * 0.42, y: B.y + B.h * 0.58, r: B.h * 0.13 };
    }

    /* ============================================================
       CONTABILIDADE
       ============================================================ */
    fechar(res, info) {
      if (this.estado !== 'luta') return;
      this.estado = 'fim';
      this.T.clear();
      const ok = res === 'ok';
      const err = ok ? null : res;
      const lat = info && info.lat != null ? info.lat : null;
      const p = this.monPx();

      if (ok || res === 'roubado' || res === 'tarde') {
        this.morte = { t0: this.hud.tempo };
        this.hud.caco(p.x, p.y, ok ? '#ffd479' : '#ff8fa3', 22);
        this.hud.faisca(p.x, p.y, ok ? '#fff1c9' : '#ffb3c0', 16);
      }
      if (ok) { U.Sfx.abate(); U.Haptic.good(); }
      else { U.Sfx.miss(); U.Haptic.bad(); if (res === 'cedo') this.hud.tremor = 0.8; }

      this.detalhe.push({
        mon: this.mon, P: this.P, inimigo: this.inimigo, res, lat,
        sobra: info && info.sobra != null ? info.sobra : null,
        reacao: this.inimigo ? this.reacaoSorteada ?? null : null,
      });
      this.anota({
        k: 'punir', ok, err, rt: lat, tot: null,
        x: { m: this.mon, P: this.P, ini: this.inimigo ? 1 : 0, res,
             sobra: info && info.sobra != null ? Math.round(info.sobra) : undefined },
      });
      this.placar();

      if (this.retorno) {
        const t = {
          ok: ['GARANTIDO', `Punir ${Math.round(lat)} ms depois de a vida caber no dano`, '#6ee7a8'],
          cedo: ['CEDO', `faltavam ${fmt(info && info.sobra)} de vida — o Punir não matou`, '#ffd479'],
          roubado: ['ROUBADO', 'o caçador inimigo apertou primeiro', '#ff8fa3'],
          tarde: ['SEM PUNIR', 'a vida coube no dano e o botão não saiu', '#ff8fa3'],
        }[res];
        this.hud.setOverlay({ texto: t[0], sub: t[1], cx: 0.42, cy: 0.1, tam: 0.085, cor: t[2], fundo: false });
      }
      this.diz(ok ? 'objetivo garantido' : ({ cedo: 'Punir cedo', roubado: 'roubado', tarde: 'não usou o Punir' })[res],
               ok ? 'ok' : 'erro');
      this.T.after(this.retorno ? (ok ? 1300 : 2100) : 600, () => {
        this.hud.setOverlay(null);
        this.proxima();
      });
    }

    extras() {
      const d = this.detalhe;
      if (!d.length) return { punir: { n: 0 } };
      const lats = d.filter(x => x.res === 'ok').map(x => x.lat);
      const disp = d.filter(x => x.inimigo);
      const sobras = d.filter(x => x.res === 'cedo').map(x => x.sobra / x.P);
      return {
        punir: {
          n: d.length,
          garantidos: lats.length,
          cedo: d.filter(x => x.res === 'cedo').length,
          roubados: d.filter(x => x.res === 'roubado').length,
          tarde: d.filter(x => x.res === 'tarde').length,
          lat: lats.length ? U.median(lats) : null,
          latIC: lats.length >= 3 ? U.S.bootMediana(lats) : null,
          sobraRel: sobras.length ? U.median(sobras) : null,
          disputas: disp.length ? { n: disp.length, ok: disp.filter(x => x.res === 'ok').length,
                                     reacao: U.median(disp.map(x => x.reacao).filter(x => x != null)) } : null,
          linha: !!this.cfg.linha,
        },
      };
    }

    /* ============================================================
       DESENHO — o monstro, a barra de vida e o raio
       ============================================================ */
    desenhar(c, B) {
      const M = MONSTROS[this.mon || 'tirano'];
      const p = this.monPx(), t = this.hud.tempo, dt = this.hud.dt || 16.7;
      if (this.estado === 'ocioso' || this.hp == null) return;
      this.flashGolpe = Math.max(0, (this.flashGolpe || 0) - dt / 140);
      /* barra "fantasma": a parte que acabou de sair fica branca um
         instante e desce devagar — é como o olho lê o tamanho do golpe */
      this.hpFantasma = Math.max(Math.max(0, this.hp), this.hpFantasma - this.hpMax * dt / 2200);

      let esc = 1, alfa = 1;
      if (this.morte) {
        const k = U.clamp((t - this.morte.t0) / 450, 0, 1);
        esc = 1 - 0.35 * k; alfa = 1 - k;
      }
      c.save();

      // o fosso do rio
      const fosso = c.createRadialGradient(p.x, p.y + p.r * 0.7, p.r * 0.2, p.x, p.y + p.r * 0.7, p.r * 2);
      fosso.addColorStop(0, this.hud.mix(M.cor, 0.16)); fosso.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = fosso;
      c.beginPath(); c.ellipse(p.x, p.y + p.r * 0.75, p.r * 2, p.r * 0.6, 0, 0, 6.2832); c.fill();
      c.strokeStyle = this.hud.mix(M.cor, 0.25); c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(p.x, p.y + p.r * 0.75, p.r * 1.7, p.r * 0.48, 0, 0, 6.2832); c.stroke();

      // o monstro
      c.globalAlpha = alfa;
      const resp = 1 + Math.sin(t / 420) * 0.025;
      const recuo = this.flashGolpe * p.r * 0.05;
      c.translate(p.x, p.y - recuo); c.scale(esc * resp, esc * resp);
      const r = p.r;
      c.fillStyle = 'rgba(0,0,0,.4)';
      c.beginPath(); c.ellipse(0, r * 0.92, r * 0.9, r * 0.2, 0, 0, 6.2832); c.fill();
      // chifres
      c.fillStyle = M.cor2;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(s * r * 0.45, -r * 0.62); c.quadraticCurveTo(s * r * 0.95, -r * 1.25, s * r * 0.35, -r * 1.35);
        c.quadraticCurveTo(s * r * 0.55, -r * 0.95, s * r * 0.18, -r * 0.8); c.closePath(); c.fill();
      }
      // corpo
      const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      g.addColorStop(0, this.hud.mix(M.cor2, 0.95)); g.addColorStop(0.55, this.hud.mix(M.cor, 0.9));
      g.addColorStop(1, 'rgba(30,12,20,.95)');
      c.fillStyle = g;
      c.shadowColor = M.cor; c.shadowBlur = 22;
      c.beginPath(); c.arc(0, 0, r * 0.82, 0, 6.2832); c.fill();
      c.shadowBlur = 0;
      // escamas
      c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        c.beginPath(); c.arc(0, r * 0.1 + k * r * 0.14, r * (0.55 - k * 0.08), 0.35, Math.PI - 0.35); c.stroke();
      }
      // olhos
      c.fillStyle = '#fff6d6'; c.shadowColor = '#ffec9a'; c.shadowBlur = 12;
      for (const s of [-1, 1]) {
        c.beginPath(); c.ellipse(s * r * 0.3, -r * 0.2, r * 0.11, r * 0.06, s * 0.35, 0, 6.2832); c.fill();
      }
      c.shadowBlur = 0;
      if (this.flashGolpe > 0) {
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = `rgba(255,255,255,${0.35 * this.flashGolpe})`;
        c.beginPath(); c.arc(0, 0, r * 0.82, 0, 6.2832); c.fill();
        c.globalCompositeOperation = 'source-over';
      }
      c.restore();

      /* ---------- barra de vida ---------- */
      const bw = B.w * 0.30, bh = B.h * 0.034, bx = p.x - bw / 2, by = p.y - p.r * 2.05;
      const cabe = this.hp <= this.P && this.hp > 0;
      c.save();
      c.font = `900 ${Math.round(B.h * 0.034)}px ui-rounded, system-ui, sans-serif`;
      c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.fillStyle = M.cor2; c.fillText(M.nome, bx, by - B.h * 0.008);
      /* o dano do seu Punir, acima da barra: o número que você compara com a vida */
      c.textAlign = 'right'; c.fillStyle = '#c4b5fd';
      c.font = `800 ${Math.round(B.h * 0.03)}px system-ui, sans-serif`;
      c.fillText(`seu Punir tira ${fmt(this.P)}`, bx + bw, by - B.h * 0.008);
      c.textAlign = 'center';
      c.fillStyle = 'rgba(5,7,12,.85)'; c.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      const frac = (v) => U.clamp(v / this.hpMax, 0, 1);
      c.fillStyle = 'rgba(255,255,255,.75)';
      c.fillRect(bx, by, bw * frac(this.hpFantasma), bh);
      const gv = c.createLinearGradient(0, by, 0, by + bh);
      gv.addColorStop(0, '#ff7b7b'); gv.addColorStop(1, '#c0283c');
      c.fillStyle = gv;
      c.fillRect(bx, by, bw * frac(this.hp), bh);
      /* marcas a cada 1.000 de vida, como na barra do jogo */
      c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1;
      for (let v = 1000; v < this.hpMax; v += 1000) {
        const x = bx + bw * v / this.hpMax;
        c.beginPath(); c.moveTo(x, by); c.lineTo(x, by + bh * (v % 5000 ? 0.5 : 1)); c.stroke();
      }
      /* ajuda visual da dificuldade baixa: onde o Punir mata */
      if (this.cfg.linha) {
        const x = bx + bw * frac(this.P);
        c.strokeStyle = '#c4b5fd'; c.lineWidth = 2.4; c.shadowColor = '#c4b5fd'; c.shadowBlur = 8;
        c.beginPath(); c.moveTo(x, by - bh * 0.5); c.lineTo(x, by + bh * 1.5); c.stroke();
        c.shadowBlur = 0;
        if (cabe) {
          c.strokeStyle = '#c4b5fd'; c.lineWidth = 2;
          c.strokeRect(bx - 3, by - 3, bw + 6, bh + 6);
        }
      }
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1;
      c.strokeRect(bx, by, bw, bh);
      if (this.cfg.numeroHp) {
        c.font = `800 ${Math.round(bh * 0.78)}px system-ui, sans-serif`;
        c.textBaseline = 'middle'; c.fillStyle = '#ffffff';
        c.shadowColor = 'rgba(0,0,0,.9)'; c.shadowBlur = 3;
        c.fillText(fmt(this.hp), p.x, by + bh / 2 + 1);
        c.shadowBlur = 0;
      }

      /* caçador inimigo por perto: você o vê, como no jogo */
      if (this.inimigo && !this.morte) {
        const ix = p.x + p.r * 2.25, iy = p.y - p.r * 0.1, ir = p.r * 0.28;
        const pul = 0.6 + 0.4 * Math.sin(this.hud.tempo / 200);
        c.globalAlpha = 0.9;
        c.fillStyle = 'rgba(80,10,20,.9)'; c.strokeStyle = '#ff5470'; c.lineWidth = 2.5;
        c.shadowColor = '#ff5470'; c.shadowBlur = 14 * pul;
        c.beginPath(); c.arc(ix, iy, ir, 0, 6.2832); c.fill(); c.stroke();
        c.shadowBlur = 0;
        c.fillStyle = '#ffd0d8'; c.font = `900 ${Math.round(ir * 1.1)}px system-ui`;
        c.textBaseline = 'middle'; c.fillText('!', ix, iy + 1);
        c.font = `700 ${Math.round(B.h * 0.026)}px system-ui`; c.fillStyle = '#ff8fa3';
        c.textBaseline = 'top'; c.fillText('caçador inimigo', ix, iy + ir + 4);
      }
      c.restore();

      /* ---------- o raio do Punir ---------- */
      if (this.raio) {
        const k = (t - this.raio.t0) / 320;
        if (k >= 1) this.raio = null;
        else {
          const x0 = this.raio.de === 'cima' ? p.x + U.rnd(-6, 6) : B.x + B.w * 0.98;
          const y0 = this.raio.de === 'cima' ? B.y : p.y - p.r * 0.4;
          c.save();
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - k;
          c.strokeStyle = this.raio.cor; c.lineWidth = 4 * (1 - k) + 1.5; c.lineJoin = 'miter';
          c.shadowColor = this.raio.cor; c.shadowBlur = 22;
          c.beginPath(); c.moveTo(x0, y0);
          const passos = 7;
          for (let s = 1; s <= passos; s++) {
            const f = s / passos;
            const x = x0 + (p.x - x0) * f + (s < passos ? U.rnd(-1, 1) * p.r * 0.25 : 0);
            const y = y0 + (p.y - y0) * f + (s < passos ? U.rnd(-1, 1) * p.r * 0.12 : 0);
            c.lineTo(x, y);
          }
          c.stroke();
          c.restore();
        }
      }
    }
  }

  U.E.MotorPunir = MotorPunir;

})(window.U);
