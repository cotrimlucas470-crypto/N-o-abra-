/* ============================================================
   treino.js — execução de blocos, sessão, Prova e retenção
   ------------------------------------------------------------
   Três modos, com regras diferentes de propósito:
     TREINO    retorno em toda tentativa, dificuldade adaptativa
     PROVA     nenhum retorno, condição fixa, nada se adapta
     RETENÇÃO  igual à Prova, 20h depois, 15 tentativas
   ============================================================ */
'use strict';
(function (U) {

  const { $, $$, el } = U;
  const MD = U.MD, CT = U.CT, DS = U.DS, D = U.D, H = U.HUD, S = U.S;

  const MOTORES = { sequencia: U.E.MotorSequencia, leitura: U.E.MotorLeitura,
                    decisao: U.E.MotorDecisao, mapa: U.E.MotorMapa, mira: U.E.MotorMira,
                    reset: U.E.MotorReset, punir: U.E.MotorPunir };

  const St = {
    surf: null, motor: null, drill: null, cfg: null, aberto: false,
    plano: null, idx: 0, prova: null, provaRes: [],
  };

  /* ---------- palco ---------- */
  function abrirPalco() {
    $('#treino').classList.add('on');
    document.body.classList.add('treinando');
    St.aberto = true;
    if (!St.surf) {
      St.surf = new H.HudSurface($('#hudcv'), {
        get drillId() { return St.cfg ? St.cfg.drillId : null; },
        onPress: (e) => St.motor && St.motor.press(e),
        onJoy: (e) => St.motor && St.motor.joy(e),
        onJoyStart: (e) => St.motor && St.motor.joy(e),
        onCampo: (e) => St.motor && St.motor.campo(e),
        onMapa: (e) => St.motor && St.motor.mapaTocado && St.motor.mapaTocado(e),
        onAlvo: () => St.motor && St.motor.alvoTocado && St.motor.alvoTocado(),
        onMiraInicio: (e) => St.motor && St.motor.miraInicio && St.motor.miraInicio(e),
        onMiraSolta: (e) => St.motor && St.motor.miraSolta && St.motor.miraSolta(e),
      });
    }
    St.surf.hud = H.getHud();
    requestAnimationFrame(() => St.surf && St.surf.resize());
    setTimeout(() => St.surf && St.surf.resize(), 120);
    abrirSessao();
  }
  function fecharPalco() {
    pararMotor();
    U.Musica.parar();
    if (St.surf) { St.surf.destroy(); St.surf = null; }
    $('#treino').classList.remove('on');
    document.body.classList.remove('treinando');
    $('#brief').classList.remove('on'); $('#res').classList.remove('on');
    St.aberto = false; St.plano = null; St.prova = null; St.provaRes = [];
    U.UI.render();
  }
  function pararMotor() { if (St.motor) { St.motor.parar(); St.motor = null; } }

  /* ---------- sessão ---------- */
  function abrirSessao() {
    const d = U.DB.load();
    if (d.sessaoAtual && Date.now() - d.sessaoAtual.t < 4 * 3600e3) return d.sessaoAtual;
    if (d.sessaoAtual) fecharSessao(true);
    d.sessaoAtual = { id: Date.now(), t: Date.now(), blocos: [] };
    U.DB.save();
    return d.sessaoAtual;
  }
  function fecharSessao(silencioso) {
    const d = U.DB.load();
    const s = d.sessaoAtual;
    if (!s) return null;
    d.sessaoAtual = null;
    if (!s.blocos.length) { U.DB.save(); return null; }
    s.fim = Date.now();
    s.fadiga = MD.fadiga(s.id);
    try { U.IX.registrar(); } catch (e) { /* índice é derivado: nunca impede fechar a sessão */ }
    d.sessoes.push(s);
    if (d.sessoes.length > 200) d.sessoes = d.sessoes.slice(-200);
    const hoje = new Date().setHours(0, 0, 0, 0);
    if (d.streak.ultimo !== hoje) {
      d.streak.dias = (hoje - d.streak.ultimo === U.DAY) ? d.streak.dias + 1 : 1;
      d.streak.ultimo = hoje;
    }
    U.DB.save();
    return s;
  }

  /* ---------- faixa superior ---------- */
  function faixa(nome, chips) {
    $('#tf-nome').textContent = nome;
    /* a base dos chips é regravada por bloco. Sem apagar a anterior, todo
       bloco depois do primeiro da sessão mostrava os chips do PRIMEIRO —
       outro exercício, outra dificuldade — no topo da tela */
    delete $('#tf-chips').dataset.base;
    $('#tf-chips').innerHTML = chips || '';
  }
  let fbT = null;
  function mensagem(txt, tipo, dica) {
    const f = $('#fb');
    if (!txt) { f.classList.remove('on'); $('#dica').classList.remove('on'); return; }
    f.textContent = txt; f.className = 'on ' + (tipo || '');
    clearTimeout(fbT); fbT = setTimeout(() => f.classList.remove('on'), 1100);
    const dd = $('#dica');
    if (dica) { dd.textContent = dica; dd.classList.add('on'); } else dd.classList.remove('on');
  }

  /* ---------- briefing ---------- */
  function brief(titulo, sub, passos, extra, aoIr, rotulo = 'Começar') {
    $('#brief-corpo').innerHTML = `
      <h2 style="margin:2px 0 3px;font-size:1rem">${titulo}</h2>
      <div class="mini" style="color:var(--gold);font-weight:700;margin-bottom:8px">${sub}</div>
      ${(passos || []).map((p, i) => `<div class="passo"><i>${i + 1}</i><div>${p}</div></div>`).join('')}
      ${extra || ''}`;
    $('#brief-ir').textContent = rotulo;
    $('#brief').classList.add('on'); $('#res').classList.remove('on');
    $('#brief-ir').onclick = () => { $('#brief').classList.remove('on'); U.Sfx.unlock(); aoIr(); };
    $$('#brief [data-princ]').forEach(b => b.addEventListener('click', (ev) => {
      ev.stopPropagation(); U.UI.verPrincipio(b.dataset.princ);
    }));
  }

  /* ============================================================
     BLOCO — a unidade de execução
     ============================================================ */
  function montarCfg(drill, dif, opts = {}) {
    const ctx = { rotas: rotasAtivas(drill) };
    const base = drill.cfg ? drill.cfg(dif, ctx) : {};
    const cfg = Object.assign({}, base, {
      drillId: drill.id, dif: +dif.toFixed(2), mo: opts.mo || 'treino',
      pisoIki: pisoIki(),
    }, opts.cfg || {});
    if (opts.ajuste) D.aplicarAjuste(cfg, opts.ajuste);
    return cfg;
  }

  function rotasAtivas(drill) {
    if (drill.heroi === 'luna') return null;
    const rot = U.CO.getRotas('jing');
    const fase = CT.fase();
    const teto = fase === 'reconexao' ? 3 : fase === 'consolidacao' ? 5 : 7;
    return rot.filter(r => r.prio <= teto).sort((a, b) => a.prio - b.prio).slice(0, 3).map(r => r.id);
  }

  function pisoIki() {
    const a = MD.filtrar({ k: 'rota', dias: 21 }).filter(x => x.ok && x.tot);
    if (a.length < 12) return 110;
    return U.clamp(U.median(a.map(x => x.tot)) / 3 * 0.55, 85, 220);
  }

  function abrirBloco(drill, dif, opts = {}) {
    abrirPalco();
    St.drill = drill;
    St.cfg = montarCfg(drill, dif, opts);
    St.opts = opts;

    const modo = St.cfg.mo;
    const esq = U.CI.ESQUEMAS[St.cfg.esquema];
    const aj = St.cfg.__ajuste ? D.AJUSTES[St.cfg.__ajuste] : null;
    const cat = drill.categoria && D.CATEGORIAS[drill.categoria];
    const chips = [
      modo === 'prova' ? '<span class="chip aviso">PROVA · sem retorno</span>'
      : modo === 'retencao' ? '<span class="chip aviso">RETENÇÃO · sem ajuda</span>'
      : modo === 'cego' ? '<span class="chip aviso">CEGO · inédito</span>'
      : `<span class="chip">dif ${dif.toFixed(1)}</span>`,
      cat ? `<span class="chip">${cat.nome}</span>` : '',
      aj ? `<span class="chip">${aj.nome}</span>` : '',
      esq && modo === 'treino' ? `<span class="chip">${esq.nome}</span>` : '',
    ].join('');
    faixa(drill.nome, chips);

    const rotasTxt = St.cfg.rotas
      ? [...new Set(St.cfg.rotas.map(r => r.map(k => (H.getHud()[k] || {}).curto || k).join(' › ')))].slice(0, 3).join('   ·   ')
      : null;
    const alvo = CT.alvoAtual();

    brief(drill.nome, drill.objetivo, drill.comoFunciona,
      `<div class="sep"></div>
       ${cat ? `<div class="mini"><b>Categoria:</b> <span style="color:var(--gold);font-weight:800">${cat.nome}</span>
         <span style="color:var(--dim2)"> — ${cat.descricao}</span></div>` : ''}
       ${rotasTxt ? `<div class="mini"><b>Rotas:</b> <span style="color:var(--gold);font-weight:800">${rotasTxt}</span></div>` : ''}
       <div class="mini" style="margin-top:5px"><b>${St.cfg.tentativas} tentativas</b>
       ${modo !== 'treino' ? ' · nada se adapta aqui'
         : St.cfg.escadaViva && CT.fase() !== 'reconexao'
           ? ` · <b>o limite se ajusta a cada tentativa</b> até parar no ponto em que você acerta
               ${Math.round(U.clamp(alvo, 0.80, 0.85) * 100)}%`
           : ` · o sistema está mirando <b>${Math.round(alvo * 100)}% de acerto</b>:
               acima disso a dificuldade sobe no próximo bloco, abaixo ela desce`}</div>
       ${modo === 'treino' && St.cfg.escadaViva && CT.fase() === 'reconexao'
         ? `<div class="xs" style="margin-top:4px">A adaptação a cada tentativa entra quando você sair da
            Reconexão. Aqui o objetivo é reencontrar a rota errando pouco, e uma escada só funciona errando:
            na simulação, com o alvo de ${Math.round(alvo * 100)}% desta fase ela errou o seu limiar em mais de
            90 ms. Por enquanto a dificuldade se ajusta entre um bloco e outro.</div>` : ''}
       ${drill.mede ? `<div class="mini" style="margin-top:4px">Alimenta a medida
         <b>${(MD.MEDIDAS[drill.mede] || MD.DERIVADAS[drill.mede] || {}).nome || drill.mede}</b>.</div>` : ''}
       ${aj ? `<div class="aviso" style="margin-top:8px"><b>Este bloco foi montado contra uma fraqueza detectada:</b>
         ${aj.o_que}. Só essa variável mudou — o resto do exercício é igual, senão não daria para saber o que
         causou a diferença.</div>` : ''}
       ${drill.porque ? `<div class="aviso" style="margin-top:8px"><b>Por que este exercício:</b> ${drill.porque}</div>` : ''}`,
      () => rodar());
  }

  function rodar() {
    pararMotor();
    U.Sfx.zerarSerie();
    if (St.surf) St.surf.setSerie(0);
    St.surf.resize();
    if (St.cfg.mo === 'prova' || St.cfg.mo === 'retencao') U.Musica.tocar('foco');
    else U.Musica.paraExercicio(St.drill, St.cfg);

    const api = {
      info: ({ i, n, ok, total }) => {
        /* acertos seguidos até agora — o contador do canto da tela.
           Só em treino: na Prova e na retenção não há retorno nenhum. */
        if (St.surf && St.motor && St.cfg.mo === 'treino' && !St.cfg.semRetorno) {
          const reg = St.motor.reg || [];
          let seq = 0;
          for (let k = reg.length - 1; k >= 0 && reg[k].ok; k--) seq++;
          St.surf.setSerie(seq);
        }
        const base = $('#tf-chips').dataset.base || $('#tf-chips').innerHTML;
        $('#tf-chips').dataset.base = base;
        /* o denominador é o que já foi anotado — e não "i − 1", que só vale
           para motor que atualiza o placar no começo da tentativa */
        const feitas = total != null ? total : i - 1;
        const pct = feitas > 0 ? Math.round(ok / feitas * 100) : null;
        $('#tf-chips').innerHTML = base +
          `<span class="chip">${i}/${n}</span>` +
          (pct != null && St.cfg.mo === 'treino'
            ? `<span class="chip ${pct >= 75 ? 'ok' : pct >= 50 ? '' : 'bad'}">${pct}%</span>` : '');
      },
      mensagem,
      fim: (resumo) => finalizar(resumo),
    };
    const M = MOTORES[St.drill.motor];
    const motor = new M(St.surf, St.cfg, api);
    St.motor = motor;
    /* a largada é DESTE motor: se o bloco foi fechado (ou trocado por
       outro) durante o 3-2-1, a contagem antiga morre calada em vez de
       dar a largada no bloco novo antes da hora dele */
    contagem(() => { if (St.motor === motor && !motor.ativo) motor.iniciar(); });
  }

  function contagem(depois) {
    let k = 3;
    const surf = St.surf;
    const passo = () => {
      if (!St.surf || St.surf !== surf) return;
      if (k === 0) { St.surf.setOverlay(null); U.Sfx.largada(); return depois(); }
      St.surf.setOverlay({ texto: String(k), tam: 0.3, cor: '#c4b5fd', fundo: 'rgba(5,8,14,.45)' });
      U.Sfx.tick(); k--;
      setTimeout(passo, 560);
    };
    passo();
  }

  /* ============================================================
     APLICAR RESULTADO
     ============================================================ */
  function aplicarResultado(drill, r) {
    const d = U.DB.load();
    const ex = r.extras || {};

    if (ex.toques || r.toques) registrarToques(r.toques || []);
    if (ex.trajetos) registrarTrajetos(ex.trajetos);
    if (ex.aborto) {
      d.aborto.push({ t: Date.now(), drill: drill.id, mo: r.mo, ...ex.aborto });
      if (d.aborto.length > 40) d.aborto = d.aborto.slice(-40);
    }

    let ctrl = null, escadaSes = null;
    if (r.mo === 'treino') {
      const ev = ex.escadaViva;
      if (ev) {
        /* Os vales deste bloco se somam aos da sessão; é o limiar da
           SESSÃO, e não o do bloco, que vira dificuldade e medida. */
        escadaSes = U.ES.registrarBloco(drill.id, ev);
        const base = escadaSes.ok ? escadaSes.v
                   : ev.ok ? ev.v
                   : (ev.teto || ev.piso) ? ev.valorFinal : null;
        const difAlvo = base != null && ev.faixa ? U.ES.difDoLimiar(base, ev.faixa) : null;
        ctrl = CT.ajustar(drill.id, { acertos: r.ok, n: r.n, erros: r.erros, cvRitmo: r.cv, difAlvo });
        if (drill.mede === 'execucao' && escadaSes.ok) CT.registrarLimiarEscada(drill.id, escadaSes);
      } else {
        ctrl = CT.ajustar(drill.id, { acertos: r.ok, n: r.n, erros: r.erros, cvRitmo: r.cv });
        if (drill.mede === 'execucao' && r.alvoMs) CT.registrarLimiar(drill.id, r.alvoMs, r.acc, r.n);
      }
    }

    const rec = {
      t: Date.now(), s: d.sessaoAtual ? d.sessaoAtual.id : 0,
      drill: drill.id, nome: drill.nome, mo: r.mo, dif: r.dif,
      n: r.n, ok: r.ok, acc: r.acc, erros: r.erros,
      ic: [+r.ic.lo.toFixed(3), +r.ic.hi.toFixed(3)],
      medTempo: r.medTempo ? Math.round(r.medTempo) : null,
      cv: r.cv != null ? +r.cv.toFixed(3) : null,
      alvoMs: r.alvoMs, ctrl,
    };
    d.sets.push(rec);
    if (d.sets.length > 400) d.sets = d.sets.slice(-400);
    if (d.sessaoAtual) d.sessaoAtual.blocos.push({ drill: drill.id, mo: r.mo, acc: r.acc, n: r.n });
    U.DB.save();
    CT.avaliarFase();
    return { rec, ctrl, escadaSes };
  }

  function registrarToques(lista) {
    if (!lista || !lista.length) return;
    const d = U.DB.load();
    for (const t of lista) {
      if (!t.id || t.dx == null) continue;
      const a = d.toques[t.id] || (d.toques[t.id] = []);
      /* a data entra aqui para que a precisão possa ter uma série de pontos
         independentes (uma média por dia) em vez de só um acumulado. Toques
         antigos não têm; o eixo detecta isso e se recusa a falar de
         tendência em vez de inventar uma. */
      a.push({ dx: +t.dx.toFixed(3), dy: +t.dy.toFixed(3), t: Date.now() });
      if (a.length > 120) d.toques[t.id] = a.slice(-120);
    }
  }
  function registrarTrajetos(lista) {
    const d = U.DB.load();
    for (const tr of lista) {
      for (let i = 0; i < tr.ikis.length && i + 1 < tr.rota.length; i++) {
        const k = `${tr.rota[i]}>${tr.rota[i + 1]}`;
        const e = d.pares[k] || (d.pares[k] = { n: 0, med: 0 });
        e.med = e.n ? (e.med * e.n + tr.ikis[i]) / (e.n + 1) : tr.ikis[i];
        e.n++;
      }
    }
  }

  /* ============================================================
     FIM DE BLOCO
     ============================================================ */
  function finalizar(r) {
    pararMotor();
    if (St.prova) return proximoBlocoProva(r);

    const { rec, ctrl, escadaSes } = aplicarResultado(St.drill, r);
    r.mo === 'treino' && r.acc >= 0.8 ? U.Sfx.done() : U.Sfx.cue();

    const eh = r.mo;
    const w = r.ic;
    const erros = Object.entries(r.erros).sort((a, b) => b[1] - a[1]);
    const prox = DS.decidir();
    const ab = (r.extras || {}).aborto;

    painel(`
      <div class="flex" style="gap:14px;align-items:flex-start">
        <div style="flex:1;min-width:0">
          <div style="font-size:1rem;font-weight:900">${St.drill.nome}${eh === 'retencao' ? ' · retenção' : ''}</div>
          <div class="numero">${r.ok}<span class="de">/${r.n}</span></div>
          <div class="mini">acerto <b>${Math.round(r.acc * 100)}%</b> ·
            intervalo <b>${Math.round(w.lo * 100)}–${Math.round(w.hi * 100)}%</b>
            <span class="xs">(${S.rotuloNivel(w.nivel)})</span></div>
          ${r.medTempo ? `<div class="mini">tempo mediano <b>${Math.round(r.medTempo)}ms</b>${r.cv != null ? ` · variação <b>${Math.round(r.cv * 100)}%</b>` : ''}</div>` : ''}
        </div>
      </div>

      ${ctrl ? `<div class="sep"></div>
        <div class="aviso ${ctrl.delta > 0.15 ? 'ok' : ctrl.delta < -0.15 ? '' : ''}">
          <b>Dificuldade ${ctrl.antes} → ${ctrl.depois}</b>
          <span class="xs">(alvo ${Math.round(ctrl.alvo * 100)}%)</span><br>
          ${ctrl.motivo}.
          ${ctrl.estavel ? '<br><b>Estabilizou:</b> a dificuldade parou de se mexer e o acerto está na margem do alvo. É deste ponto que sai a medida de execução.' : ''}
        </div>` : ''}

      ${eh === 'retencao' ? retencaoTexto() : ''}
      ${eh === 'cego' ? cegoTexto(r) : ''}

      ${ab ? `<div class="sep"></div>
        <div class="aviso ${ab.valido ? (ab.antecedencia <= 220 ? 'ok' : '') : 'bad'}">
          ${ab.valido
            ? `<b>Janela de aborto: ${ab.antecedencia} ms.</b><br>
               É com essa antecedência que o perigo precisa aparecer para você soltar a jogada
               metade das vezes. Seu intervalo entre toques neste set foi ${ab.ikiIr} ms e a
               taxa de parada ficou em ${Math.round(ab.taxa * 100)}%.`
            : `<b>Medida de freio não interpretável neste set.</b><br>${ab.porqueInvalido}.
               ${Math.abs(ab.proativa) >= 0.25 ? 'Você foi ficando mais lento ao longo do set — isso faz você parar mais, mas não porque freia melhor. O número seria mentira.' : 'Mais um set resolve.'}`}
        </div>` : ''}

      ${(r.extras || {}).escadaViva ? escadaTexto(r.extras.escadaViva, escadaSes, r.erros) : ''}
      ${(r.extras || {}).mapa ? mapaTexto(r) : ''}
      ${(r.extras || {}).mira ? miraTexto(r) : ''}
      ${(r.extras || {}).reset && r.extras.reset.n ? resetTexto(r.extras.reset) : ''}
      ${(r.extras || {}).punir && r.extras.punir.n ? punirTexto(r.extras.punir) : ''}

      ${erros.length ? `<div class="sep"></div>
        <div class="mini"><b>Onde os erros caíram</b></div>
        <div class="pilha" style="gap:5px;margin-top:5px">
          ${erros.map(([k, v]) => {
            const E = MD.ERROS[k] || { nome: k, o_que: '', acao: '' };
            return `<div class="mini"><span class="tag ${k === 'layout' ? 'bad' : 'warn'}">${E.nome} ×${v}</span>
              <div class="xs" style="margin-top:2px">${E.o_que} ${E.acao}</div></div>`;
          }).join('')}
        </div>` : `<div class="sep"></div><div class="aviso ok">Nenhum erro neste set.</div>`}

      ${prox ? `<div class="sep"></div>
        <div class="aviso"><b>Próximo: ${prox.titulo}</b><br>${prox.porque}
        <div class="xs" style="margin-top:4px">regra ${U.DS.rotuloRegra(prox.regra)} · confiança: ${S.rotuloNivel(prox.confianca)}</div></div>` : ''}
    `, botoesFim(prox));
  }

  /* ============================================================
     RESULTADO DO TREINO DE VISÃO DE MAPA

     Um bloco tem 12 tentativas divididas entre três tempos de espera:
     quatro em cada ponto. QUATRO TENTATIVAS NÃO SÃO UMA CURVA, e o
     painel não finge que são — a curva que ele apresenta é a
     ACUMULADA de todos os blocos, e o bloco de hoje aparece só como
     a linha de hoje. Com pouca amostra acumulada ele escreve que
     ainda não dá para falar de curva, em vez de desenhar uma.

     As três faixas de espera (até 3 s, 3 a 6 s, 6 a 10 s) são fixas
     de propósito: os tempos exatos mudam com a dificuldade, e agrupar
     pelo valor cru faria dezenas de pontos com duas tentativas cada.
     ============================================================ */
  const FAIXAS_MAPA = [
    { id: 'curta', nome: 'até 3 s', lo: 0, hi: 3000 },
    { id: 'media', nome: '3 a 6 s', lo: 3000, hi: 6000 },
    { id: 'longa', nome: '6 a 10 s', lo: 6000, hi: 99000 },
  ];

  function faixaDe(ret) {
    return FAIXAS_MAPA.find(f => ret > f.lo && ret <= f.hi) || FAIXAS_MAPA[2];
  }

  function barra(frac, cor, altura = 7) {
    return `<div style="height:${altura}px;background:rgba(255,255,255,.10);border-radius:3px;overflow:hidden">
      <div style="height:100%;width:${Math.round(U.clamp(frac, 0, 1) * 100)}%;background:${cor};border-radius:3px"></div></div>`;
  }

  function mapaTexto(r) {
    const m = r.extras.mapa;
    const pct = (v) => (v == null ? '—' : Math.round(v * 100) + '%');
    /* erro em % da largura do mapa: é a unidade que o jogador vê no
       retorno de cada tentativa, então é a mesma aqui */
    const errTxt = (e) => (e == null ? '—' : Math.round(e * 100) + '%');

    /* ---- histórico acumulado deste exercício ---- */
    const hist = MD.filtrar({ k: 'mapa', drill: St.drill.id }).filter(x => x.x && x.x.ret != null);
    const porFaixa = {};
    for (const t of hist) {
      const f = faixaDe(t.x.ret);
      const e = porFaixa[f.id] || (porFaixa[f.id] = { n: 0, zona: 0, leitura: 0, erros: [] });
      e.n++; e.zona += t.x.zo ? 1 : 0; e.leitura += t.x.lo ? 1 : 0;
      if (t.x.e != null) e.erros.push(t.x.e);
    }
    const temCurva = FAIXAS_MAPA.filter(f => (porFaixa[f.id] || {}).n >= S.MIN.proporcao.explorar).length >= 2;

    const linhasCurva = FAIXAS_MAPA.map(f => {
      const e = porFaixa[f.id];
      if (!e || !e.n) return `<div class="mini" style="opacity:.45">${f.nome} — sem tentativas ainda</div>`;
      const w = S.wilson(e.zona, e.n);
      return `<div style="margin-bottom:6px">
        <div class="flex" style="gap:6px;align-items:baseline">
          <span class="xs" style="width:58px;color:var(--dim2)">${f.nome}</span>
          <b style="font-size:.78rem">${Math.round(e.zona / e.n * 100)}%</b>
          <span class="xs" style="flex:1">na área certa · erro mediano ${errTxt(e.erros.length ? U.median(e.erros) : null)}
            <span style="opacity:.6">· ${e.n} tent. (${Math.round(w.lo * 100)}–${Math.round(w.hi * 100)}%)</span></span>
        </div>
        ${barra(e.zona / e.n, e.n < S.MIN.proporcao.explorar ? '#5b708f' : '#7fd4ff')}
      </div>`;
    }).join('');

    /* ---- pontos cegos ---- */
    const zs = Object.entries(m.porZona || {}).sort((a, b) => (a[1].ok / a[1].n) - (b[1].ok / b[1].n));
    const cegos = zs.map(([z, e]) => {
      const Z = U.MP.ZONAS[z];
      return `<div class="flex" style="gap:6px;align-items:center;margin-bottom:4px">
        <span style="width:9px;height:9px;border-radius:50%;background:${Z.cor};flex:none"></span>
        <span class="xs" style="flex:1">${Z.nome}</span>
        <b class="xs">${Math.round(e.ok / e.n * 100)}%</b>
        <span class="xs" style="opacity:.55">${e.n} tent.</span>
      </div>`;
    }).join('');

    /* ---- viés ---- */
    const v = m.vies || {};
    const viesTxt = v.puxa == null
      ? `<div class="xs" style="opacity:.6">Viés de posição: ainda sem amostra (${v.n || 0} de 6 tentativas com alvo fora do centro).</div>`
      : Math.abs(v.puxa) < 0.02
        ? `<div class="xs">Viés de posição: nenhum. Seus erros não têm direção — o que sobrou é imprecisão, não distorção.</div>`
        : `<div class="aviso ${v.puxa > 0 ? '' : 'ok'}" style="margin-top:6px">
            <b>Você puxa os palpites ${v.puxa > 0 ? 'para o centro' : 'para as bordas'} do mapa
            em ${Math.abs(Math.round(v.puxa * 100))}% da largura.</b><br>
            Memória espacial costuma arrastar o ponto lembrado para o meio da região a que ele pertence.
            Isso não é falta de atenção: é como a memória guarda lugar. Saber a direção do seu erro vale
            mais que saber o tamanho — dá para corrigir de propósito enquanto aponta.</div>`;

    /* ---- atenção dividida ---- */
    const sec = m.secundaria;
    const secTxt = !sec ? ''
      : sec.n === 0 ? ''
      : (() => {
          const acc = sec.ok / sec.n;
          const encarando = acc < 0.5 && m.zonaAcc > 0.7;
          return `<div class="aviso ${encarando ? 'bad' : acc > 0.8 ? 'ok' : ''}" style="margin-top:7px">
            <b>Atenção dividida: ${sec.ok}/${sec.n} alvos do centro da tela</b>
            ${sec.rt ? `<span class="xs">(${Math.round(sec.rt)} ms)</span>` : ''}<br>
            ${encarando
              ? 'Acerto alto no mapa com o alvo do centro no chão quer dizer que você ficou <b>encarando o minimapa</b>. Isso não é visão de mapa — numa partida esse tempo sai da sua luta. O número do mapa acima está inflado.'
              : acc > 0.8
                ? 'Você manteve o centro da tela e ainda leu o mapa. É esta a condição que interessa: o número do mapa acima foi conquistado de relance, não encarando.'
                : 'O alvo do centro existe para tirar o seu olho do mapa. Perder alguns é esperado; perder a maioria quer dizer que a dificuldade está acima do que dá para dividir hoje.'}</div>`;
        })();

    return `
      <div class="sep"></div>
      <div class="flex" style="gap:16px;align-items:flex-start">
        <div>
          <div class="numero" style="color:var(--gold)">${m.pontos}</div>
          <div class="xs">pontos${m.melhorSeq >= 2 ? ` · melhor sequência ${m.melhorSeq}` : ''}</div>
        </div>
        <div style="flex:1;min-width:0">
          <div class="mini"><b>Lugar</b> — ${pct(m.zonaAcc)} na área certa,
            ${pct(m.objAcc)} no objetivo exato.<br>
            Erro mediano de <b>${errTxt(m.erro)}</b> da largura do mapa
            <span class="xs">(${U.MP.bandaErro(m.erro, true)})</span>${m.semResposta ? `,
            ${m.semResposta} sem resposta` : ''}.</div>
          <div class="mini" style="margin-top:4px"><b>Leitura</b> — ${pct(m.leituraAcc)} certo${m.rtLeitura ? ` em ${Math.round(m.rtLeitura)} ms` : ''}${
            m.finoAcc != null ? ` · objetivo exato ${pct(m.finoAcc)}` : ''}.</div>
        </div>
      </div>

      <div class="sep"></div>
      <div class="mini"><b>Curva de esquecimento</b> <span class="xs">— acumulada de todos os blocos
        deste exercício (${hist.length} tentativas)</span></div>
      <div style="margin-top:7px">${linhasCurva}</div>
      ${temCurva
        ? `<div class="xs" style="margin-top:4px">É isto que a espera custa a você. Se a faixa curta está
             bem e a longa não, o problema é <b>segurar</b>, e treinar sinal mais rápido não resolve. Se as
             três estão igualmente baixas, o problema é <b>codificar</b>, e o caminho é baixar a dificuldade
             até o sinal piscar tempo suficiente para entrar.</div>`
        : `<div class="aviso" style="margin-top:6px">Ainda não é uma curva. Um bloco dá quatro tentativas por
             faixa, e quatro tentativas não sustentam conclusão nenhuma — as barras acima são o que aconteceu,
             não o que você é. A partir de ${S.MIN.proporcao.explorar} tentativas por faixa o painel passa a
             comparar as faixas entre si.</div>`}

      ${cegos ? `<div class="sep"></div>
        <div class="mini"><b>Por leitura, neste bloco</b>
          <span class="xs">— da pior para a melhor; poucas tentativas em cada uma</span></div>
        <div style="margin-top:6px">${cegos}</div>` : ''}

      <div class="sep"></div>
      ${viesTxt}
      ${secTxt}
    `;
  }

  /* ============================================================
     RESULTADO DA ESCADA VIVA

     O que mais convence de que a adaptação funciona é VER a escada:
     cada tentativa no nível em que aconteceu, verde se acertou,
     vermelha se errou. Dá para ver a descida rápida da fase grossa, a
     oscilação da fase fina em volta do seu nível, e os vales — os
     pontos circulados, de onde sai o limiar.

     O eixo vertical está invertido de propósito: MENOS ms por passo é
     mais difícil, e mais difícil fica em cima. Assim "subir" no
     gráfico é "ficar mais rápido", que é como a gente fala.
     ============================================================ */
  function trilhaSvg(ev) {
    const pts = ev.trilha || [];
    if (pts.length < 2) return '';
    /* 6:1 e altura travada: o painel de resultado é largo, e um SVG que
       escala só pela largura ficava com 220 px de altura e letra enorme */
    const W = 900, Hh = 150, ml = 46, mr = 12, mt = 14, mb = 22;
    /* A escala segue a TRILHA e o limiar — não o intervalo. Com dois
       vales só, o intervalo é honestamente enorme, e se ele ditasse a
       escala a trilha virava uma linha espremida no meio do gráfico. O
       intervalo é desenhado cortado nas bordas; o número dele está no
       texto logo abaixo. */
    const vs = pts.map(p => p.v).concat(ev.ok ? [ev.v] : []);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    const pad = Math.max(12, (hi - lo) * 0.12); lo -= pad; hi += pad;
    const corta = (v) => U.clamp(v, lo, hi);
    const X = (i) => ml + (W - ml - mr) * (pts.length === 1 ? 0.5 : i / (pts.length - 1));
    const Y = (v) => mt + (Hh - mt - mb) * (v - lo) / (hi - lo);     // menor ms em cima
    const linha = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
    const iFina = (ev.marcas || []).filter(m => !m.fina).length >= 2
      ? ((ev.marcas || []).filter(m => !m.fina)[1] || {}).i : null;
    const grade = [lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1]
      .map(v => `<line x1="${ml}" x2="${W - mr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="rgba(255,255,255,.07)"/>
                 <text x="${ml - 6}" y="${(Y(v) + 3).toFixed(1)}" fill="#66748f" font-size="10" text-anchor="end">${Math.round(v)}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${Hh}" width="100%" style="display:block;margin-top:6px;max-height:150px" role="img"
        aria-label="Trilha da escada: nível de cada tentativa">
      ${grade}
      ${ev.ok && ev.lo != null ? `<rect x="${ml}" width="${W - ml - mr}" y="${Y(corta(ev.lo)).toFixed(1)}"
          height="${Math.max(1, Y(corta(ev.hi)) - Y(corta(ev.lo))).toFixed(1)}" fill="rgba(255,212,121,.10)"/>` : ''}
      ${ev.ok ? `<line x1="${ml}" x2="${W - mr}" y1="${Y(ev.v).toFixed(1)}" y2="${Y(ev.v).toFixed(1)}"
          stroke="#ffd479" stroke-width="1.6" stroke-dasharray="6 4"/>` : ''}
      ${iFina != null ? `<line x1="${X(iFina).toFixed(1)}" x2="${X(iFina).toFixed(1)}" y1="${mt}" y2="${Hh - mb}"
          stroke="rgba(196,181,253,.35)" stroke-dasharray="2 4"/>
          <text x="${(X(iFina) + 4).toFixed(1)}" y="${mt + 9}" fill="#8f86c9" font-size="10">passo fino</text>` : ''}
      <path d="${linha}" fill="none" stroke="#5b708f" stroke-width="1.4"/>
      ${pts.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.6"
          fill="${p.ok ? '#6ee7a8' : '#ff8fa3'}"/>`).join('')}
      ${(ev.marcas || []).filter(m => m.fina && m.vale).map(m => `<circle cx="${X(m.i).toFixed(1)}"
          cy="${Y(m.v).toFixed(1)}" r="8" fill="none" stroke="#ffd479" stroke-width="1.8"/>`).join('')}
      <text x="${ml}" y="${Hh - 5}" fill="#66748f" font-size="10">tentativa →</text>
      <text x="${W - mr}" y="${Hh - 5}" fill="#66748f" font-size="10" text-anchor="end">ms por passo · mais rápido em cima</text>
    </svg>`;
  }

  function escadaTexto(ev, ses, erros = {}) {
    const ms = (v) => (v == null ? '—' : Math.round(v) + ' ms');
    const origem = {
      escada: 'de onde o seu último bloco terminou',
      tempos: 'dos seus tempos reais recentes',
      configuracao: 'do nível configurado — ainda não há tempo seu para partir',
    }[ev.origem] || '';
    const valesBloco = (ev.vales || []).length;

    return `
      <div class="sep"></div>
      <div class="mini"><b>Adaptação dentro do bloco</b>
        <span class="xs">— o limite mudou a cada tentativa para encontrar o ritmo que você sustenta a
        ${Math.round(ev.alvo * 100)}%</span></div>
      ${trilhaSvg(ev)}
      <div class="xs" style="margin-top:3px;color:var(--dim2)">
        <span style="color:#6ee7a8">●</span> acerto ·
        <span style="color:#ff8fa3">●</span> erro ·
        <span style="color:#ffd479">◯</span> vale, de onde sai o limiar ·
        <span style="color:#ffd479">- -</span> limiar e o intervalo dele</div>

      <div class="flex" style="gap:16px;align-items:flex-start;margin-top:9px">
        <div>
          <div class="numero" style="color:var(--gold)">${ses && ses.ok ? Math.round(ses.v) : ev.ok ? Math.round(ev.v) : '—'}</div>
          <div class="xs">ms por passo<br>${ses && ses.ok ? 'limiar da sessão' : ev.ok ? 'limiar do bloco' : 'sem limiar ainda'}</div>
        </div>
        <div class="mini" style="flex:1;min-width:0">
          ${ev.ok ? `Neste bloco: <b>${ms(ev.v)}</b> por passo
            ${ev.lo != null ? `<span class="xs">(intervalo ${ms(ev.lo)}–${ms(ev.hi)})</span>` : ''}
            — numa rota de três toques, <b>${ms(ev.v * 3)}</b>.`
          : `Neste bloco: ${U.esc(ev.motivo || 'sem limiar')}.`}
          ${ses && ses.ok && ses.blocos > 1 ? `<br>Somando os ${ses.blocos} blocos desta sessão
            (${ses.n} vales): <b>${ms(ses.v)}</b> por passo
            ${ses.lo != null ? `<span class="xs">(${ms(ses.lo)}–${ms(ses.hi)})</span>` : ''}.` : ''}
          ${!ev.ok && valesBloco ? `<br><span class="xs">O vale deste bloco entrou na conta da sessão —
            o próximo bloco retoma a escada daqui e completa.</span>` : ''}
          <div class="xs" style="margin-top:4px">Começou em ${ms(ev.inicio)} por passo, ${origem}.
            ${ev.taxaFina != null ? `Na fase fina você acertou ${Math.round(ev.taxaFina * 100)}% — perto dos
            ${Math.round(ev.alvo * 100)}% quer dizer que a escada achou o seu ponto; longe quer dizer que o bloco
            acabou antes.` : ''}</div>
        </div>
      </div>

      ${(() => {
        const tot = Object.values(erros).reduce((a, b) => a + b, 0);
        const lentos = erros.lento || 0;
        if (!tot) return '';
        return lentos / tot >= 0.6
          ? `<div class="xs" style="margin-top:6px">Os erros "fora do tempo" aqui são o esperado, não um problema: a
             escada procura exatamente o ponto em que cerca de ${Math.round((1 - ev.alvo) * 100)} de cada 100
             tentativas passam do limite. É assim que ela sabe onde o limite está.</div>`
          : `<div class="xs" style="margin-top:6px">Mais da metade dos erros <b>não</b> foi de tempo. A escada só
             mexe no tempo, então ela não resolve esses — veja o tipo abaixo.</div>`;
      })()}

      ${ev.teto ? `<div class="aviso ok" style="margin-top:7px"><b>Você chegou ao limite do exercício.</b>
        A escada bateu ${ev.bateuDificil} vezes no tempo mais curto que ele consegue pedir. O seu limiar está além
        disso, então o número acima é um piso, não uma medida — e os vales deste bloco ficaram fora da conta.</div>` : ''}
      ${ev.piso ? `<div class="aviso bad" style="margin-top:7px"><b>A escada bateu no limite fácil.</b>
        Mesmo com o tempo mais folgado que o exercício dá, os erros continuaram. Isso não é velocidade: olhe o
        tipo de erro abaixo — sequência errada e toque no botão vizinho não se resolvem com mais tempo.</div>` : ''}
    `;
  }

  /* ============================================================
     RESULTADO DA QUEBRA DO ESPELHO

     Três números, porque são três erros diferentes com três
     correções diferentes:
     · o TEMPO até soltar a 1 ou a 2 depois da quebra;
     · os resets que passaram sem você soltar nada;
     · os toques com a passiva travada — que é o erro de quem
       não olha o P e aperta no chute.
     ============================================================ */
  /* ============================================================
     RESULTADO DO PUNIR

     O número principal é o tempo entre a vida caber no dano e o
     Punir sair — é o que decide disputa. Os erros vêm separados por
     lado, porque a correção é oposta: quem erra CEDO precisa esperar
     a comparação; quem é ROUBADO precisa deixar o polegar pronto.
     ============================================================ */
  function punirTexto(m) {
    const d = m.disputas;
    const lado = m.cedo > m.roubados + m.tarde ? 'cedo'
               : (m.roubados + m.tarde) > m.cedo ? 'tarde' : null;
    return `
      <div class="sep"></div>
      <div class="flex" style="gap:16px;align-items:flex-start">
        <div>
          <div class="numero" style="color:var(--gold)">${m.lat != null ? Math.round(m.lat) : '—'}</div>
          <div class="xs">ms entre a vida<br>caber e o Punir</div>
        </div>
        <div style="flex:1;min-width:0">
          <div class="mini">Objetivos garantidos: <b>${m.garantidos} de ${m.n}</b>
            ${m.latIC && m.latIC.lo != null ? `<span class="xs">(tempo mediano, intervalo
              ${Math.round(m.latIC.lo)}–${Math.round(m.latIC.hi)} ms)</span>` : ''}.</div>
          <div class="mini" style="margin-top:4px">
            Cedo: <b>${m.cedo}</b>${m.sobraRel != null ? ` <span class="xs">(faltava em média ${Math.round(m.sobraRel * 100)}% do seu dano)</span>` : ''} ·
            roubados: <b>${m.roubados}</b> · sem Punir: <b>${m.tarde}</b></div>
          ${d ? `<div class="mini" style="margin-top:4px">Com caçador inimigo: <b>${d.ok} de ${d.n}</b>
            ${d.reacao ? `<span class="xs">— ele levava ~${Math.round(d.reacao)} ms para apertar</span>` : ''}.</div>` : ''}
        </div>
      </div>
      ${lado ? `<div class="aviso" style="margin-top:8px">${lado === 'cedo'
        ? '<b>O seu erro é de pressa.</b> A mão sai antes de o olho comparar a vida com o dano. Espere a barra passar do número — com a linha ligada, espere ela cruzar a linha roxa.'
        : '<b>O seu erro é de atraso.</b> A leitura está certa e a mão chega depois. Deixe o polegar parado em cima do PU quando a vida estiver perto do dano; o tempo que você tem é só o do olho.'}</div>` : ''}
      ${m.linha ? `<div class="xs" style="margin-top:6px">A linha roxa na barra é ajuda de dificuldade baixa: no jogo ela
        não existe. A partir da dificuldade 5 ela some, e o número da vida some a partir da 8.</div>` : ''}
    `;
  }

  function resetTexto(m) {
    const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : '—');
    const perdidos = m.reais - m.pegos;
    const fr = m.fronteira;
    return `
      <div class="sep"></div>
      <div class="flex" style="gap:16px;align-items:flex-start">
        <div>
          <div class="numero" style="color:var(--gold)">${m.rt != null ? Math.round(m.rt) : '—'}</div>
          <div class="xs">ms até soltar<br>depois da quebra</div>
        </div>
        <div style="flex:1;min-width:0">
          <div class="mini">Você pegou <b>${m.pegos} de ${m.reais}</b> resets
            ${m.rtIC && m.rtIC.lo != null ? `<span class="xs">(tempo mediano, intervalo
              ${Math.round(m.rtIC.lo)}–${Math.round(m.rtIC.hi)} ms)</span>` : ''}.
            ${perdidos ? `${perdidos} passaram sem você soltar nada dentro de ${m.janela} ms.` : 'Nenhum passou.'}</div>
          <div class="mini" style="margin-top:4px">Com a passiva travada, você apertou em
            <b>${m.falsos} de ${m.bloq}</b>${m.falsos ? ' — toques que o jogo ignora' : ''}.
            ${m.antecipou ? `E ${m.antecipou} toque${m.antecipou > 1 ? 's' : ''} em habilidade em recarga antes de
              qualquer sinal.` : ''}</div>
        </div>
      </div>
      ${fr && fr.n >= 3 ? `<div class="aviso ${fr.ok / fr.n >= 0.75 ? 'ok' : ''}" style="margin-top:8px">
        <b>Perto dos 5 s: ${fr.ok} de ${fr.n} certos (${pct(fr.ok, fr.n)}).</b>
        É ali que a trava decide — longe dela qualquer um acerta. ${fr.ok / fr.n >= 0.75
          ? 'Você está acompanhando a trava, não chutando.'
          : 'Abaixo de três em quatro, o mais provável é que você esteja adivinhando pelo tempo em vez de olhar o botão P.'}</div>` : ''}
      ${m.falsos > m.bloq * 0.4 && m.bloq >= 3 ? `<div class="xs" style="margin-top:6px">Muito toque com a passiva
        travada costuma ser a mão treinada para "quebrou, aperta" sem o olho conferir se quebrou mesmo. A correção
        é esperar ver a recarga sumir — perder 100 ms esperando custa menos que perder o toque inteiro.</div>` : ''}
    `;
  }

  /* ============================================================
     RESULTADO DO BLOCO DE MIRA

     Duas coisas separadas, porque melhoram por caminhos diferentes:

     · O TAMANHO do erro (mediana em graus) é precisão. Melhora
       repetindo devagar até o movimento ficar reproduzível.
     · A DIREÇÃO do erro (viés por setor) é desvio sistemático.
       Não melhora repetindo: melhora corrigindo de propósito, e
       só depois que alguém diz para que lado ele acontece.

     Juntar os dois num "% de acerto" apagaria justamente a
     diferença que diz o que fazer amanhã.
     ============================================================ */
  function miraTexto(r) {
    const m = r.extras.mira;
    if (!m || !m.n) return '';
    const g = (v) => (v == null ? '—' : Math.round(v) + '°');
    const hist = MD.mira({ dias: 60 });

    const setores = Object.entries(m.porSetor || {})
      .sort((a, b) => Math.abs(b[1].vies) - Math.abs(a[1].vies));

    /* roseta em texto: cada direção com o seu desvio e para que lado */
    const linhas = setores.map(([, e]) => {
      const forte = e.n >= 3 && Math.abs(e.vies) >= 6;
      const lado = e.vies > 0 ? 'horário' : 'anti-horário';
      return `<div class="flex" style="gap:6px;align-items:center;margin-bottom:3px">
        <span class="xs" style="width:104px;color:var(--dim2)">${U.esc(e.nome)}</span>
        <div style="flex:1;height:6px;background:rgba(255,255,255,.08);border-radius:3px;position:relative">
          <div style="position:absolute;left:50%;top:-2px;width:1px;height:10px;background:rgba(255,255,255,.28)"></div>
          <div style="position:absolute;top:0;height:6px;border-radius:3px;background:${forte ? 'var(--bad)' : 'var(--dim2)'};
            ${e.vies > 0 ? 'left:50%' : 'right:50%'};width:${Math.min(50, Math.abs(e.vies) / 45 * 50)}%"></div>
        </div>
        <b class="xs" style="width:62px;text-align:right;${forte ? 'color:var(--bad)' : ''}">${
          Math.abs(e.vies) < 1 ? '0°' : `${Math.abs(Math.round(e.vies))}° ${lado === 'horário' ? '↻' : '↺'}`}</b>
        <span class="xs" style="width:26px;opacity:.5">${e.n}</span>
      </div>`;
    }).join('');

    return `
      <div class="sep"></div>
      <div class="flex" style="gap:16px;align-items:flex-start">
        <div>
          <div class="numero" style="color:var(--gold)">${g(m.erro)}</div>
          <div class="xs">erro mediano<br>${m.pontos} pontos</div>
        </div>
        <div style="flex:1;min-width:0">
          <div class="mini">Metade dos seus tiros errou menos que <b>${g(m.erro)}</b>.
            ${Math.round(m.dentro * 100)}% ficaram dentro dos ${m.tolerancia}° que o bloco aceitava${
            m.rt ? `, em <b>${Math.round(m.rt)} ms</b>` : ''}.</div>
          ${m.erroParado != null && m.erroMovel != null ? `<div class="mini" style="margin-top:4px">
            Alvo parado <b>${g(m.erroParado)}</b> · alvo em movimento <b>${g(m.erroMovel)}</b>.
            ${m.erroMovel > m.erroParado * 1.4
              ? 'A diferença é antecipação, não mira: você aponta para onde ele <b>está</b>, não para onde ele vai estar.'
              : 'Você mantém a mira com o alvo andando — é aí que ela vale numa partida.'}</div>` : ''}
          ${m.semTiro ? `<div class="xs" style="margin-top:4px">${m.semTiro} tentativa${m.semTiro === 1 ? '' : 's'} sem tiro (botão errado, arrasto curto ou tempo esgotado).</div>` : ''}
        </div>
      </div>

      ${linhas ? `<div class="sep"></div>
        <div class="mini"><b>Para que lado você erra, por direção</b>
          <span class="xs">— barra para a direita é desvio no sentido horário; o número é a mediana do erro com sinal, e a última coluna é quantos tiros</span></div>
        <div style="margin-top:7px">${linhas}</div>` : ''}

      ${m.viesReal ? `<div class="aviso ${Math.abs(m.viesGeral) >= 10 ? 'bad' : ''}" style="margin-top:8px">
        <b>A sua mão inteira gira ${Math.abs(Math.round(m.viesGeral))}° no sentido
        ${m.viesGeral > 0 ? 'horário' : 'anti-horário'}</b>
        <span class="xs">(intervalo ${Math.round(m.viesLo)}° a ${Math.round(m.viesHi)}°, e ele não inclui o zero)</span><br>
        Não é em uma direção: é em todas. O polegar gira em torno da base da mão, então o arrasto sai torcido
        para o mesmo lado o tempo todo. Isso é anatomia, não desatenção, e não some repetindo — some
        compensando de propósito, mirando um tanto para ${m.viesGeral > 0 ? 'o anti-horário' : 'o horário'}
        até virar automático. É a correção com o melhor retorno deste exercício, porque conserta todos os
        tiros de uma vez.</div>` : ''}

      ${m.sistematico ? `<div class="aviso ${Math.abs(m.sistematico.vies) >= 10 ? 'bad' : ''}" style="margin-top:8px">
        <b>Desvio sistemático mirando para ${U.esc(m.sistematico.nome)}: ${Math.abs(Math.round(m.sistematico.vies))}°
        no sentido ${m.sistematico.vies > 0 ? 'horário' : 'anti-horário'}</b>
        <span class="xs">(${m.sistematico.n} tiros)</span><br>
        Erro com sinal constante não é tremor, é a mão pivotando sempre para o mesmo lado — o polegar gira em
        torno da base e as direções que pedem para abrir a mão saem curtas. Isso é anatomia, não desatenção, e
        não some repetindo: some compensando de propósito, mirando um pouco para
        ${m.sistematico.vies > 0 ? 'o lado anti-horário' : 'o lado horário'} nessa direção até virar automático.</div>`
      : `<div class="xs" style="margin-top:7px">Nenhuma direção com desvio sistemático neste bloco — o que sobrou
         é imprecisão espalhada, e essa melhora repetindo.</div>`}

      ${hist.ok && hist.n > m.n ? `<div class="sep"></div>
        <div class="mini">Acumulado de ${hist.n} tiros em ${hist.dias} dia${hist.dias === 1 ? '' : 's'}:
          erro mediano <b>${g(hist.v)}</b>
          <span class="xs">(intervalo ${g(hist.lo)}–${g(hist.hi)}, ${S.rotuloNivel(hist.nivel)})</span>.
          ${hist.sistematico
            ? `O desvio para <b>${U.esc(hist.sistematico.nome)}</b> aparece no histórico também, com ${hist.sistematico.n} tiros — não é coisa de hoje.`
            : 'Nenhum desvio sistemático sobrevive ao histórico inteiro.'}</div>` : ''}
    `;
  }

  /**
   * O bloco cego é o que mais convida a conclusão errada: oito situações
   * inéditas, sem retorno, e um número no fim. Se o painel não disser o que
   * ele é, esse número vira "o meu nível real" na cabeça de quem leu.
   */
  function cegoTexto(r) {
    const a = U.IX.calcularEixos().find(e => e.id === 'adaptacao');
    const w = r.ic;
    return `<div class="sep"></div>
      <div class="aviso">
        <b>Este bloco não vale mais que os outros.</b> Oito tentativas dão um intervalo de
        ${Math.round(w.lo * 100)} a ${Math.round(w.hi * 100)} pontos — largo demais para ser conclusão
        sobre qualquer coisa. Ele não mexe na dificuldade, não entra na medida de execução e não pesa
        mais na sua nota.<br><br>
        O que ele faz: alimenta o eixo de <b>Adaptação</b>, que responde quanto do seu desempenho
        sobra quando a situação muda de cara mas mantém a regra. É a diferença entre
        <b>estar melhorando</b> e <b>estar ficando bom neste exercício</b>.
        ${a && a.bruto != null
          ? `<br><br>Adaptação acumulada: <b>${Math.round(a.bruto)}% do normal</b>
             <span class="xs">(${a.n} variantes, ${S.rotuloNivel(a.nivel)})</span>.`
          : `<br><br>Ainda não há variantes suficientes para o eixo de Adaptação existir. Uma
             "última tentativa" sozinha não cria a medida — ela junta amostra ao longo das semanas.`}
      </div>`;
  }

  function retencaoTexto() {
    const ret = MD.retencao();
    const oQueE = `A retenção é a proporção da rota de referência que volta <b>sem ajuda nenhuma</b>,
      pelo menos um dia depois do treino. É a única medida do sistema que separa <b>aprendizado</b> do
      <b>desempenho do dia</b> — o desempenho sobe fácil com dica na tela e cai sozinho.`;
    if (ret.nivel === 'insuficiente')
      return `<div class="sep"></div><div class="aviso">
        ${oQueE}<br><br>Ainda faltam <b>${Math.max(0, S.MIN.proporcao.explorar - ret.n)}</b> tentativas
        para a primeira estimativa (${ret.n} até agora). Uma leitura isolada não é conclusão.</div>`;
    return `<div class="sep"></div>
      <div class="aviso ${ret.lo >= 70 ? 'ok' : ''}">
        <b>Retenção acumulada: ${ret.v}%</b>
        <span class="xs">(intervalo ${ret.lo}–${ret.hi}%, ${ret.n} tentativas, ${S.rotuloNivel(ret.nivel)})</span><br>
        ${oQueE}<br>
        ${ret.lo >= 70 ? 'O limite inferior passou de 70%: isso é aprendizado, não desempenho do dia.'
          : `Enquanto o limite inferior (${ret.lo}%) não passar de 70%, o que está sendo construído ainda não está ficando —
             e o sistema vai segurar a dificuldade em vez de acelerar.`}
        ${ret.tendencia === 'sobe' ? '<br>A série está subindo.'
          : ret.tendencia === 'desce' ? '<br><b>A série está descendo.</b>' : ''}
      </div>`;
  }

  function botoesFim(prox) {
    const bs = [];
    if (St.plano && St.idx + 1 < St.plano.length) {
      bs.push({ txt: 'Próximo bloco', cls: 'full', fn: () => avancarPlano() });
    } else if (prox && prox.acao.tipo === 'treino') {
      bs.push({ txt: 'Continuar', cls: 'full', fn: () => {
        $('#res').classList.remove('on');
        abrirBloco(D.porId(prox.acao.drill), prox.acao.dif);
      } });
    }
    bs.push({ txt: 'Repetir', cls: 'sec sm', fn: () => {
      $('#res').classList.remove('on');
      abrirBloco(St.drill, CT.estado(St.drill.id).dif, St.opts);
    } });
    bs.push({ txt: 'Encerrar', cls: 'sec sm', fn: () => encerrar() });
    return bs;
  }

  function painel(html, botoes) {
    $('#res-corpo').innerHTML = html;
    const pe = $('#res .pe'); pe.innerHTML = '';
    botoes.forEach(b => {
      const btn = el('button', { class: 'btn ' + (b.cls || ''), text: b.txt });
      btn.addEventListener('click', b.fn);
      pe.appendChild(btn);
    });
    $('#res').classList.add('on');
    $('#res-corpo').scrollTop = 0;
    $$('#res [data-princ]').forEach(b => b.addEventListener('click', () => U.UI.verPrincipio(b.dataset.princ)));
  }

  /* ============================================================
     SESSÃO GUIADA
     ============================================================ */
  function sessaoGuiada() {
    const p = DS.plano(4);
    if (!p.length) return U.UI.toast('Nada a fazer agora');
    St.plano = p; St.idx = 0;
    abrirPalco();
    const prim = p[0];
    if (prim.acao.tipo === 'parar') { St.plano = null; return mostrarParada(prim); }
    if (prim.acao.tipo === 'hud') { St.plano = null; fecharPalco(); return U.UI.ir('hud'); }

    brief('Sessão de hoje', `${p.length} bloco${p.length > 1 ? 's' : ''}, escolhidos pelas suas medidas`,
      p.map(b => `<b>${b.titulo}</b> — ${b.porque}`),
      `<div class="sep"></div>
       <div class="mini">A ordem não é uma lista fixa: depois de cada bloco o sistema recalcula. Se uma medida
       mudar no meio da sessão, o resto do plano muda junto.</div>`,
      () => executarBloco(0), 'Começar');
  }

  /* ============================================================
     SESSÃO DA JING — as quatro coisas que a Jing faz numa luta,
     INTERCALADAS, e não em blocos repetidos do mesmo exercício.

     Intercalar custa desempenho na hora e rende retenção depois:
     é o efeito de interferência contextual (Shea & Morgan, 1979),
     um dos achados mais repetidos de aprendizagem motora. Repetir
     o mesmo exercício dez vezes seguidas parece render mais, e é
     justamente essa sensação que engana.

     Cada bloco entra na dificuldade que o controlador já mediu
     para ele — a sessão não inventa nível nenhum.
     ============================================================ */
  function sessaoJing() {
    const blocos = [
      ['rota', 'Rota', 'a sequência de referência, com a escada achando o seu ritmo'],
      ['espelho', 'Quebra do Espelho', 'o reset da passiva, e não apertar com ela travada'],
      ['punir', 'Punir no Tirano', 'garantir objetivo: nem cedo, nem depois do caçador inimigo'],
      ['mira', 'Mira', 'as habilidades apontadas, em graus'],
    ].filter(([id]) => D.porId(id));
    St.plano = blocos.map(([id, titulo, porque]) => ({
      titulo, porque, acao: { tipo: 'bloco', drill: id, dif: CT.estado(id).dif },
    }));
    St.idx = 0;
    abrirPalco();
    brief('Sessão da Jing', `${St.plano.length} blocos intercalados · cerca de 12 minutos`,
      St.plano.map(b => `<b>${b.titulo}</b> — ${b.porque}`),
      `<div class="sep"></div>
       <div class="mini">Um exercício de cada, em vez de repetir o mesmo. Na hora rende um pouco menos — e
       fica mais no dia seguinte: é o efeito de interferência contextual, um dos resultados mais repetidos
       de aprendizagem motora.</div>`,
      () => executarBloco(0), 'Começar');
  }

  function executarBloco(i) {
    const b = St.plano[i];
    St.idx = i;
    if (!b) return encerrar();
    if (b.acao.tipo === 'parar') return mostrarParada(b);
    if (b.acao.tipo === 'hud') { fecharPalco(); return U.UI.ir('hud'); }
    if (b.acao.tipo === 'prova') return iniciarProva();
    if (b.acao.tipo === 'retencao') return iniciarRetencao();
    if (b.acao.tipo === 'cego') return iniciarCego();
    abrirBloco(D.porId(b.acao.drill), b.acao.dif, { ajuste: b.acao.ajuste });
  }
  function avancarPlano() {
    $('#res').classList.remove('on');
    executarBloco(St.idx + 1);
  }

  function mostrarParada(dec) {
    faixa('Recomendação', '');
    painel(`
      <h2 style="margin:0 0 6px;font-size:1rem;color:var(--warn)">${dec.titulo}</h2>
      <div class="mini">${dec.porque}</div>
      <div class="xs" style="margin-top:8px">regra ${U.DS.rotuloRegra(dec.regra)} · confiança: ${S.rotuloNivel(dec.confianca)}</div>
      <div class="sep"></div>
      <div class="mini">Você pode treinar assim mesmo — o sistema não bloqueia nada. Mas a recomendação é essa,
      e ela existe porque repetição de baixa qualidade não é neutra: ela grava o padrão pior.</div>
    `, [
      { txt: 'Treinar assim mesmo', cls: 'sec sm', fn: () => {
        $('#res').classList.remove('on');
        const c = DS.contexto(); c.fadiga = { estado: 'ignorada' }; c.sessoesHoje = 0;
        const alt = DS.decidir(c);
        alt && alt.acao.drill ? abrirBloco(D.porId(alt.acao.drill), alt.acao.dif) : fecharPalco();
      } },
      { txt: 'Encerrar', cls: 'full', fn: () => encerrar() },
    ]);
  }

  function encerrar() {
    const s = fecharSessao();
    St.plano = null;
    if (!s) return fecharPalco();
    mostrarRelatorio(s);
  }

  /* ============================================================
     PROVA
     ============================================================ */
  function iniciarProva() {
    abrirPalco();
    St.prova = { i: 0, res: [] };
    brief('Prova', 'condição fixa · sem retorno · ~10 minutos',
      [
        'Quatro blocos, sempre iguais. É o instrumento de medida do sistema, e ele não ensina nada.',
        'Não existe retorno por tentativa nem botão aceso. Você vai errar sem saber na hora — é assim que tem que ser.',
        'A amostra <b>acumula</b> entre provas. É por isso que as medidas saem de "provisório" com o tempo.',
        'Não tente ir bem. Vá como você está: medida inflada estraga o plano inteiro.',
      ],
      `<div class="sep"></div>
       <div class="pilha" style="gap:5px">
        ${D.PROVA.map((b, i) => `<div class="mini"><span class="tag vio">${i + 1}</span>
          <b style="margin-left:5px">${b.nome}</b> — ${b.explica}</div>`).join('')}
       </div>
       <div class="aviso" style="margin-top:9px">Uma Prova sozinha não é conclusão: são ~66 tentativas, e
       estimativas individuais confiáveis pedem bem mais. O sistema soma as provas e mostra o intervalo.
       <div><button class="btn sec sm" style="margin-top:7px;min-height:34px" data-princ="confiabilidade">por quê</button></div></div>`,
      () => rodarBlocoProva(0), 'Começar a Prova');
  }

  function rodarBlocoProva(i) {
    if (i >= D.PROVA.length) return fecharProva();
    St.prova.i = i;
    const b = D.PROVA[i];
    const drill = { id: 'prova-' + b.id, nome: b.nome, motor: b.motor, objetivo: b.explica, mede: null };
    St.drill = drill;
    St.cfg = Object.assign({}, b.cfg, { drillId: 'prova-' + b.id, mo: 'prova', dif: b.cfg.dif || 5, pisoIki: pisoIki() });
    faixa(`Prova ${i + 1}/4 · ${b.nome}`, '<span class="chip aviso">sem retorno</span>');
    brief(`Prova ${i + 1} de 4 — ${b.nome}`, b.explica,
      ['Sem retorno entre tentativas.', 'Sem botão aceso.', 'Condição fixa: não muda entre provas.'],
      '', () => rodar(), i === 0 ? 'Começar' : 'Continuar');
  }

  function proximoBlocoProva(r) {
    St.prova.res.push(r);
    const ex = r.extras || {};
    if (ex.toques || r.toques) registrarToques(r.toques || []);
    if (ex.trajetos) registrarTrajetos(ex.trajetos);
    if (ex.aborto) {
      const d = U.DB.load();
      d.aborto.push({ t: Date.now(), drill: 'prova', mo: 'prova', ...ex.aborto });
      U.DB.save();
    }
    const i = St.prova.i + 1;
    if (i >= D.PROVA.length) return fecharProva();
    U.Sfx.done();
    painel(`
      <div style="font-size:1rem;font-weight:900">Bloco ${St.prova.i + 1} concluído</div>
      <div class="mini" style="margin-top:6px">Faltam ${D.PROVA.length - i} blocos. A Prova só vale inteira —
      um bloco solto não produz medida comparável.</div>
      <div class="mini" style="margin-top:8px">Sem números por enquanto: mostrar o resultado bloco a bloco
      transformaria a Prova em treino.</div>
    `, [{ txt: `Bloco ${i + 1}: ${D.PROVA[i].nome}`, cls: 'full',
          fn: () => { $('#res').classList.remove('on'); rodarBlocoProva(i); } }]);
  }

  function fecharProva() {
    const d = U.DB.load();
    const total = St.prova.res.reduce((a, r) => a + r.n, 0);
    d.provas.push({ t: Date.now(), n: total, blocos: St.prova.res.map(r => ({ drill: r.drill, n: r.n, ok: r.ok })) });
    if (d.provas.length > 60) d.provas = d.provas.slice(-60);
    if (d.sessaoAtual) d.sessaoAtual.blocos.push({ drill: 'prova', mo: 'prova', n: total });
    U.DB.save();
    CT.definirBase(); CT.avaliarFase();
    St.prova = null;
    U.Sfx.level();
    mostrarPainelMedidas(true);
  }

  /* ============================================================
     ÚLTIMA TENTATIVA — bloco cego
     ============================================================ */
  function iniciarCego() {
    abrirPalco();
    const drill = { id: 'cego', nome: 'Última tentativa', motor: D.FINAL_CEGO.motor,
                    objetivo: 'Situações inéditas, sem retorno. Mede adaptação, não treino.', mede: 'adaptacao' };
    St.drill = drill;
    St.cfg = Object.assign({}, D.FINAL_CEGO.cfg, { drillId: 'cego', mo: 'cego', pisoIki: pisoIki() });
    faixa('Última tentativa', '<span class="chip aviso">inédito · sem retorno</span>');
    brief('Última tentativa', '8 situações · sem retorno · pista enganosa',
      [
        'Situações que você não treinou, com a pista mais visível apontando para o lado errado da conta.',
        'Nenhum retorno entre elas. Você vai saber como foi só no fim.',
        'Não é para ir bem. É para descobrir o que sobra quando o exercício não avisa nada.',
      ],
      `<div class="sep"></div>
       <div class="aviso">Este bloco <b>não vale mais</b> que os outros. Oito tentativas não sustentam uma
       conclusão sozinhas — ele entra como amostra do eixo de Adaptação e nada além disso.</div>`,
      () => rodar(), 'Começar');
  }

  /* ============================================================
     RETENÇÃO
     ============================================================ */
  function iniciarRetencao() {
    abrirPalco();
    const drill = { id: 'retencao', nome: 'Teste de retenção', motor: D.RETENCAO.motor,
                    objetivo: 'Medir o que ficou, sem ajuda nenhuma.', mede: 'retencao' };
    St.drill = drill;
    St.cfg = Object.assign({}, D.RETENCAO.cfg, { drillId: 'retencao', mo: 'retencao', dif: 5, pisoIki: pisoIki() });
    const ret = MD.retencao();
    faixa('Retenção', '<span class="chip aviso">sem ajuda</span>');
    brief('Teste de retenção', '15 tentativas · condição de referência · sem retorno',
      [
        'A rota de referência: <b>1 › AA › 2</b>, no tempo de referência.',
        'Sem botão aceso, sem retorno entre tentativas.',
        'O que você fez ontem foi desempenho. O que sobrou aparece agora.',
      ],
      `<div class="sep"></div>
       <div class="mini">${ret.nivel === 'insuficiente'
         ? 'Esta é uma das primeiras medições. O sistema vai somar as próximas antes de afirmar qualquer tendência.'
         : `Retenção acumulada até aqui: <b>${ret.v}%</b> (intervalo ${ret.lo}–${ret.hi}%, ${ret.n} tentativas).`}</div>
       <div class="aviso" style="margin-top:8px">É a medida que separa aprendizado de desempenho — e a única
       que o sistema usa para dizer quanto da sua rota de referência voltou.
       <div><button class="btn sec sm" style="margin-top:7px;min-height:34px" data-princ="retencao">por quê</button></div></div>`,
      () => rodar());
  }

  /* ============================================================
     RELATÓRIOS
     ============================================================ */
  function mostrarPainelMedidas(depoisDaProva) {
    if (!St.aberto) abrirPalco();
    pararMotor();
    faixa(depoisDaProva ? 'Prova concluída' : 'Suas medidas', '');
    const p = MD.painel();
    const rec = CT.recuperacao();
    painel(`
      ${depoisDaProva ? `<div class="aviso ok"><b>Prova registrada.</b> As medidas abaixo somam esta prova
        com as anteriores em condição idêntica.</div><div class="sep"></div>` : ''}
      <div class="mini" style="margin-bottom:8px"><b>Quanto da sua rota de referência voltou</b></div>
      <div class="aviso ${rec.estado === 'recuperado' ? 'ok' : ''}">${rec.texto}</div>
      <div class="sep"></div>
      ${U.UI.cartoesMedidas(p)}
      <div class="xs" style="margin-top:8px">Todo número acima vem com intervalo. Quando o intervalo é largo,
      é porque a amostra ainda é pequena — e nesse caso o sistema não decide com base nele.</div>
    `, [{ txt: 'Fechar', cls: 'sec sm', fn: () => fecharPalco() },
        { txt: 'Treinar', cls: 'full', fn: () => { $('#res').classList.remove('on'); sessaoGuiada(); } }]);
  }

  function mostrarRelatorio(s) {
    if (!St.aberto) abrirPalco();
    pararMotor();
    faixa('Fim da sessão', `<span class="chip">${s.blocos.length} blocos</span>`);
    const p = MD.painel();
    const fad = s.fadiga || { estado: 'sem_dados' };
    const erros = MD.perfilErros({ dias: 14 });
    const prox = DS.decidir();
    const rec = CT.recuperacao();

    painel(`
      <div style="font-size:1rem;font-weight:900">${U.dateTime(s.t)}</div>
      <div class="mini">${s.blocos.length} blocos · ${U.dur((s.fim || Date.now()) - s.t)}</div>

      <div class="sep"></div>
      <div class="mini"><b>Quanto voltou</b></div>
      <div class="aviso ${rec.estado === 'recuperado' ? 'ok' : ''}" style="margin-top:4px">${rec.texto}</div>

      <div class="sep"></div>
      <div class="mini"><b>Qualidade desta sessão</b></div>
      <div class="aviso ${fad.estado === 'alta' ? 'bad' : fad.estado === 'moderada' ? '' : 'ok'}" style="margin-top:4px">
        ${fad.estado === 'sem_dados'
          ? `Poucas tentativas para estimar fadiga${fad.falta ? ` (faltaram ${fad.falta})` : ''}. Sem dados, sem conclusão.`
          : fad.txt}
      </div>

      ${erros.total >= 6 ? `<div class="sep"></div>
        <div class="mini"><b>Onde os erros caem</b> <span class="xs">(${erros.total} erros, ${S.rotuloNivel(erros.nivel)})</span></div>
        <div class="pilha" style="gap:4px;margin-top:5px">
          ${erros.itens.slice(0, 4).map(x => `<div class="mini">
            <span class="tag ${x.id === 'layout' ? 'bad' : 'warn'}">${x.nome} ${Math.round(x.p * 100)}%</span>
            <span class="xs" style="margin-left:5px">intervalo ${Math.round(x.lo * 100)}–${Math.round(x.hi * 100)}% · ${x.acao}</span>
          </div>`).join('')}
        </div>` : ''}

      <div class="sep"></div>
      ${U.UI.cartoesMedidas(p, true)}

      ${prox ? `<div class="sep"></div>
        <div class="aviso"><b>Próxima sessão: ${prox.titulo}</b><br>${prox.porque}
        <div class="xs" style="margin-top:4px">regra ${U.DS.rotuloRegra(prox.regra)} · confiança: ${S.rotuloNivel(prox.confianca)}</div></div>` : ''}
    `, [{ txt: 'Concluir', cls: 'full', fn: () => fecharPalco() }]);
  }

  /* ---------- saída ---------- */
  $('#tf-sair').addEventListener('click', () => {
    if (St.prova) {
      return U.UI.modal(`<h2 style="margin:0 0 8px">Sair da Prova?</h2>
        <div class="mini">Os blocos já feitos são descartados. A Prova só vale inteira — blocos soltos não
        produzem medida comparável.</div>
        <div class="flex" style="margin-top:12px;gap:8px">
          <button class="btn sec full sm" data-fecha>Continuar</button>
          <button class="btn bad full sm" id="cf-sair">Sair</button></div>`,
        (cx) => cx.querySelector('#cf-sair').addEventListener('click', () => {
          U.UI.fecharModal(); St.prova = null; fecharPalco();
        }));
    }
    const d = U.DB.load();
    if (d.sessaoAtual && d.sessaoAtual.blocos.length) return encerrar();
    fecharPalco();
  });
  $('#brief-volta').addEventListener('click', () => { St.prova = null; St.plano = null; fecharPalco(); });

  U.T = { abrirBloco, sessaoGuiada, sessaoJing, iniciarProva, iniciarRetencao, iniciarCego,
          mostrarPainelMedidas, mostrarRelatorio, fecharPalco, _St: St };

})(window.U);
