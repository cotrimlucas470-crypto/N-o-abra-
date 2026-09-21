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
                    decisao: U.E.MotorDecisao, mapa: U.E.MotorMapa };

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
      });
    }
    St.surf.hud = H.getHud();
    requestAnimationFrame(() => St.surf.resize());
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
  function faixa(nome, chips) { $('#tf-nome').textContent = nome; $('#tf-chips').innerHTML = chips || ''; }
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
    return rot.filter(r => r.prio <= teto).slice(0, 3).map(r => r.id);
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
       ${modo === 'treino' ? ` · o sistema está mirando <b>${Math.round(alvo * 100)}% de acerto</b>:
         acima disso a dificuldade sobe, abaixo ela desce` : ' · nada se adapta aqui'}</div>
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
    St.surf.resize();
    if (St.cfg.mo === 'prova' || St.cfg.mo === 'retencao') U.Musica.tocar('foco');
    else U.Musica.paraExercicio(St.drill, St.cfg);

    const api = {
      info: ({ i, n, ok }) => {
        const base = $('#tf-chips').dataset.base || $('#tf-chips').innerHTML;
        $('#tf-chips').dataset.base = base;
        const pct = i > 1 ? Math.round(ok / (i - 1) * 100) : null;
        $('#tf-chips').innerHTML = base +
          `<span class="chip">${i}/${n}</span>` +
          (pct != null && St.cfg.mo === 'treino'
            ? `<span class="chip ${pct >= 75 ? 'ok' : pct >= 50 ? '' : 'bad'}">${pct}%</span>` : '');
      },
      mensagem,
      fim: (resumo) => finalizar(resumo),
    };
    const M = MOTORES[St.drill.motor];
    St.motor = new M(St.surf, St.cfg, api);
    contagem(() => St.motor && St.motor.iniciar());
  }

  function contagem(depois) {
    let k = 3;
    const passo = () => {
      if (!St.surf) return;
      if (k === 0) { St.surf.setOverlay(null); return depois(); }
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

    let ctrl = null;
    if (r.mo === 'treino') {
      ctrl = CT.ajustar(drill.id, { acertos: r.ok, n: r.n, erros: r.erros, cvRitmo: r.cv });
      if (drill.mede === 'execucao' && r.alvoMs) CT.registrarLimiar(drill.id, r.alvoMs, r.acc, r.n);
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
    return { rec, ctrl };
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

    const { rec, ctrl } = aplicarResultado(St.drill, r);
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
          ${r.medTempo ? `<div class="mini">tempo mediano <b>${r.medTempo}ms</b>${r.cv != null ? ` · variação <b>${Math.round(r.cv * 100)}%</b>` : ''}</div>` : ''}
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

      ${(r.extras || {}).mapa ? mapaTexto(r) : ''}

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
        <div class="xs" style="margin-top:4px">regra <code>${prox.regra}</code> · confiança: ${S.rotuloNivel(prox.confianca)}</div></div>` : ''}
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
      <div class="xs" style="margin-top:8px">regra <code>${dec.regra}</code> · confiança: ${S.rotuloNivel(dec.confianca)}</div>
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
        <div class="xs" style="margin-top:4px">regra <code>${prox.regra}</code> · confiança: ${S.rotuloNivel(prox.confianca)}</div></div>` : ''}
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

  U.T = { abrirBloco, sessaoGuiada, iniciarProva, iniciarRetencao, iniciarCego,
          mostrarPainelMedidas, mostrarRelatorio, fecharPalco, _St: St };

})(window.U);
