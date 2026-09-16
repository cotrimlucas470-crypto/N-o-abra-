/* ============================================================
   treino.js — executor de exercício, diagnóstico e relatórios
   ============================================================ */
'use strict';
(function (U) {

  const { $, $$, el } = U;
  const M = U.M, C = U.C, D = U.D, H = U.HUD, G = U.G, UI = U.UI;

  const S = {
    surf: null, motor: null, drill: null, dif: 1, cfg: null,
    fila: null, idx: 0, diag: null, provas: [], aberto: false,
    ultimoRel: null, modoRetencao: null, aquecido: false,
  };

  /* ---------- superfície ---------- */
  function abrirPalco() {
    $('#treino').classList.add('on');
    document.body.classList.add('treinando');
    S.aberto = true;
    if (!S.surf) {
      S.surf = new H.HudSurface($('#hudcv'), {
        onPress: (e) => S.motor && S.motor.press(e),
        onJoy:   (e) => S.motor && S.motor.joy(e),
        onJoyStart: (e) => S.motor && S.motor.joy(e),
        onCampo: (e) => S.motor && S.motor.campo(e),
      });
    }
    S.surf.hud = H.getHud();
    requestAnimationFrame(() => S.surf.resize());
    setTimeout(() => S.surf && S.surf.resize(), 120);
  }

  function fecharPalco() {
    pararMotor();
    if (S.surf) { S.surf.destroy(); S.surf = null; }
    U.Musica.parar();
    $('#treino').classList.remove('on');
    document.body.classList.remove('treinando');
    $('#brief').classList.remove('on');
    $('#res').classList.remove('on');
    S.aberto = false; S.fila = null; S.diag = null; S.provas = [];
    UI.render();
  }

  function pararMotor() { if (S.motor) { S.motor.parar(); S.motor = null; } }

  /* ---------- faixa superior ---------- */
  function faixa(nome, chips) {
    $('#tf-nome').textContent = nome;
    $('#tf-chips').innerHTML = chips;
  }
  function chipsPadrao(i, n, ok, acc) {
    const a = Math.round((acc || 0) * 100);
    return `<span class="chip">${i}/${n}</span>
            <span class="chip ${a >= 80 ? 'ok' : a >= 55 ? '' : 'bad'}">${ok} certos · ${a}%</span>`;
  }

  let fbT = null;
  function mensagem(txt, tipo, dica) {
    const f = $('#fb');
    f.textContent = txt; f.className = 'on ' + (tipo || '');
    clearTimeout(fbT);
    fbT = setTimeout(() => f.classList.remove('on'), 1100);
    const d = $('#dica');
    if (dica) { d.textContent = dica; d.classList.add('on'); }
    else d.classList.remove('on');
  }

  /* ============================================================
     BRIEFING
     ============================================================ */
  function brief(titulo, subtitulo, passos, extra, aoIr, rotuloIr = 'Começar') {
    $('#brief-corpo').innerHTML = `
      <h2 style="margin:2px 0 3px;font-size:1rem">${titulo}</h2>
      <div class="mini" style="color:var(--gold);font-weight:700;margin-bottom:8px">${subtitulo}</div>
      ${passos.map((p, i) => `<div class="passo"><i>${i + 1}</i><div>${p}</div></div>`).join('')}
      ${extra || ''}`;
    $('#brief-ir').textContent = rotuloIr;
    $('#brief').classList.add('on');
    $('#res').classList.remove('on');
    $('#brief-ir').onclick = () => { $('#brief').classList.remove('on'); U.Sfx.unlock(); aoIr(); };
  }

  /* ============================================================
     ABRIR UM EXERCÍCIO
     ============================================================ */
  function abrir(drill, dif, opts = {}) {
    abrirPalco();
    S.drill = drill; S.dif = U.clamp(dif, 1, 10); S.diag = null;
    const ctx = { rotasAtivas: drill.heroi === 'luna' ? null : C.rotasAtivas(), esquema: C.esquemaAtual() };
    S.cfg = Object.assign({}, drill.cfg(S.dif, ctx), {
      drillId: drill.id, pisoIki: C.pisoIki(), feedback: C.fracaoFeedback(S.dif),
    });
    if (S.cfg.freio && S.cfg.ssdInicial == null) S.cfg.ssdInicial = C.ssdInicial();
    if (opts.cfg) Object.assign(S.cfg, opts.cfg);
    S.modoRetencao = opts.retencao || null;

    const rotasTxt = S.cfg.rotas
      ? [...new Set(S.cfg.rotas.map(r => r.map(k => H.getHud()[k]?.curto || k).join(' › ')))].slice(0, 4).join('   ·   ')
      : null;

    const esq = U.CI.ESQUEMAS[S.cfg.esquema];
    faixa(drill.nome, `<span class="chip">dif ${S.dif}/10</span>` + (esq ? `<span class="chip">${esq.nome}</span>` : ''));
    brief(drill.nome, drill.objetivo, drill.explicacao,
      `<div class="sep"></div>
       ${rotasTxt ? `<div class="mini"><b>Rotas desta rodada:</b> <span style="color:var(--gold);font-weight:800">${rotasTxt}</span></div>` : ''}
       ${esq ? `<div class="mini" style="margin-top:5px"><b>Esquema:</b> ${esq.nome} — ${esq.desc}</div>` : ''}
       <div class="mini" style="margin-top:5px"><b>Tentativas:</b> ${S.cfg.tentativas} ·
       <b>Treina:</b> ${Object.keys(drill.treina).map(k => M.EIXOS[k].nome).join(', ')}
       ${S.cfg.feedback < 1 ? ' · <b>retorno em 2 de cada 3 tentativas</b>' : ''}</div>
       ${drill.pesquisa ? `<div class="aviso" style="margin-top:8px"><b>Por que este exercício:</b> ${drill.pesquisa.nota}
         <div><button class="btn sec sm" style="margin-top:7px;min-height:34px" data-princ="${drill.pesquisa.principio}">ver a pesquisa</button></div></div>` : ''}
       <div class="mini" style="margin-top:5px"><b>Para avançar de dificuldade:</b> 80 pontos.
       Abaixo de 62 o sistema baixa a dificuldade sozinho — e isso é parte do método, não um castigo.</div>`,
      () => rodar());
    $$('#brief [data-princ]').forEach(b => b.addEventListener('click', (ev) => {
      ev.stopPropagation(); UI.verPrincipio(b.dataset.princ);
    }));
  }

  function rodar() {
    pararMotor();
    S.surf.resize();
    U.Musica.paraExercicio(S.drill, S.cfg);
    const api = {
      info: ({ i, n, ok, acc }) => faixa(S.drill.nome, `<span class="chip">dif ${S.dif}</span>` + chipsPadrao(i, n, ok, acc)),
      mensagem,
      fim: (g) => finalizarSet(g, S.motor ? S.motor.extras() : {}),
    };
    const Motor = { sequencia: U.E.MotorSequencia, escolha: U.E.MotorEscolha,
                    prioridade: U.E.MotorPrioridade, cenario: U.E.MotorCenario }[S.drill.motor];
    S.motor = new Motor(S.surf, S.cfg, api);
    contagem(() => S.motor && S.motor.iniciar());
  }

  function contagem(depois) {
    let k = 3;
    const passo = () => {
      if (!S.surf) return;
      if (k === 0) { S.surf.setOverlay(null); return depois(); }
      S.surf.setOverlay({ texto: String(k), tam: 0.3, cor: '#c4b5fd', fundo: 'rgba(5,8,14,.45)' });
      U.Sfx.tick();
      k--;
      setTimeout(passo, 600);
    };
    passo();
  }

  /* ============================================================
     FIM DE SET
     ============================================================ */
  function finalizarSet(g, extras = {}) {
    const ex = extras || {};
    pararMotor();
    if (S.diag) return proximaProva(g, ex);
    if (S.modoRetencao) return finalizarRetencao(g, ex);

    const r = C.avaliarSet(S.drill, g, S.cfg, ex);
    C.registrarSet(r.rec);
    S.dif = r.difNova;

    r.score >= 80 ? U.Sfx.done() : U.Sfx.cue();
    if (r.subiu) setTimeout(() => { U.Sfx.level(); UI.toast(`Nível ${r.subiu} · ${C.nivelInfo(r.subiu).nome}`, 'gold'); }, 700);

    const prox = C.proximo();
    const parciais = Object.entries(r.parciais || {});
    const errosOrd = Object.entries(r.erros || {}).sort((a, b) => b[1] - a[1]);
    const mec = U.DB.load().mecanicas;
    const rotasSet = (r.rec.rotas || []).map(chave => {
      const rota = D.getRotas('jing').concat(D.getRotas('luna')).find(x => x.seq.join('>') === chave);
      return rota && mec[rota.id] ? { nome: rota.nome, ...mec[rota.id] } : null;
    }).filter(Boolean);

    painelFinal(`
      <div class="flex" style="gap:14px;align-items:center">
        ${anel(r.score)}
        <div style="flex:1;min-width:0">
          <div style="font-size:.95rem;font-weight:900">${S.drill.nome}</div>
          <div class="mini">${r.rec.ok}/${r.rec.n} tentativas certas ·
            ${r.rec.totalMed ? Math.round(r.rec.totalMed) + 'ms médios' : ''}
            ${r.rec.prec ? ' · precisão ' + Math.round(r.rec.prec * 100) + '%' : ''}</div>
          <div class="flex wrap" style="gap:6px;margin-top:6px">
            <span class="tag ${r.difNova > r.difAntes ? 'ok' : r.difNova < r.difAntes ? 'bad' : ''}">
              dif ${r.difAntes} → ${r.difNova}</span>
            <span class="tag ${r.score >= 80 ? 'ok' : r.score >= 62 ? 'warn' : 'bad'}">${r.nota}</span>
          </div>
        </div>
      </div>

      <div class="sep"></div>
      <div class="grade g2" style="align-items:start">
        <div>
          <div class="mini"><b>Onde a nota veio</b></div>
          ${parciais.map(([k, v]) => `<div class="linha">
            <div class="nome" style="flex-basis:5.2rem">${rotuloParcial(k)}</div>
            <div class="barra"><i style="width:${U.clamp(v,0,100)}%"></i></div>
            <div class="val">${Math.round(v)}</div></div>`).join('')}
        </div>
        <div>
          ${errosOrd.length ? `<div class="mini"><b>Seus erros aqui</b></div>
            <div class="pilha" style="gap:4px;margin-top:4px">
            ${errosOrd.map(([k, v]) => `<div class="mini">
              <span class="tag ${k === 'hud' ? 'bad' : 'warn'}">${M.ERROS[k]?.nome || k} ×${v}</span>
              <div class="xs" style="margin-top:2px">${M.ERROS[k]?.dica || ''}</div></div>`).join('')}
            </div>`
          : `<div class="aviso ok"><b>Nenhum erro neste set.</b> Se isso se repetir, a dificuldade sobe — é assim que o sistema encontra o seu teto.</div>`}
        </div>
      </div>

      ${rotasSet.length ? `<div class="sep"></div>
        <div class="mini"><b>Estado das rotas depois deste set</b></div>
        <div class="pilha" style="gap:5px;margin-top:5px">
          ${rotasSet.map(x => `<div class="mini">${UI.chipEstado(x.estado)}
            <b style="margin-left:5px">${x.nome}</b> — ${M.ESTADOS[x.estado]?.texto || ''}</div>`).join('')}
        </div>` : ''}

      ${r.rec.ssrt != null ? `<div class="sep"></div>
        <div class="aviso ${!r.rec.ssrtConfiavel ? '' : r.rec.ssrt < 260 ? 'ok' : r.rec.ssrt < 340 ? '' : 'bad'}">
        <b>Seu tempo de frenagem (SSRT): ${r.rec.ssrt} ms.</b><br>
        É quanto tempo leva, do sinal de perigo até a jogada realmente parar. O atraso de equilíbrio da escada
        ficou em ${r.rec.ssd50} ms com ${Math.round((r.rec.taxaParada || 0) * 100)}% de paradas —
        perto de 50% é o que torna a medida válida.<br>
        ${!r.rec.ssrtConfiavel
          ? '<b>Ainda não confie neste número:</b> a taxa de parada ficou longe de 50%, então a escada não encontrou o ponto de equilíbrio. Faça mais um set deste exercício.'
          : r.rec.ssrt < 260 ? 'Está dentro da faixa típica de adultos (~200-250 ms).'
          : r.rec.ssrt < 340 ? 'Um pouco acima da faixa típica: dá para melhorar.'
          : 'Bem acima da faixa típica — é o seu maior gargalo em luta, não a velocidade do combo.'}
        </div>` : ''}

      ${prox ? `<div class="sep"></div>
        <div class="aviso"><b>Próximo:</b> ${prox.drill.nome} (dif ${prox.dif})<br>${prox.motivo}</div>` : ''}
    `, [
      { txt: 'Repetir', cls: 'sec sm', fn: () => {
          $('#res').classList.remove('on');
          const ctx = { rotasAtivas: S.drill.heroi === 'luna' ? null : C.rotasAtivas(), esquema: C.esquemaAtual() };
          S.cfg = Object.assign({}, S.drill.cfg(S.dif, ctx),
            { drillId: S.drill.id, pisoIki: C.pisoIki(), feedback: C.fracaoFeedback(S.dif) });
          rodar();
        } },
      { txt: S.fila ? 'Próximo da sessão' : 'Próximo exercício', cls: 'full', fn: () => avancar(prox) },
      { txt: 'Encerrar', cls: 'sec sm', fn: () => encerrarSessao() },
    ]);
  }

  function rotuloParcial(k) {
    return { acuracia: 'Acerto', precisao: 'Precisão', tempo: 'Tempo', consistencia: 'Regularidade',
             sincronia: 'Compasso', disciplina: 'Disciplina', execucao: 'Execução', interrupcao: 'Freio',
             latenciaFreio: 'Reação ao freio', decisao: 'Decisão', adaptacao: 'Adaptação',
             movimento: 'Movimento' }[k] || k;
  }

  function anel(score) {
    const r = 38, circ = 2 * Math.PI * r;
    const cor = score >= 80 ? '#3ddc97' : score >= 62 ? '#e8c46a' : '#ff5470';
    return `<div class="anel">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="7"/>
        <circle cx="44" cy="44" r="${r}" fill="none" stroke="${cor}" stroke-width="7" stroke-linecap="round"
          stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - score / 100)}"/>
      </svg>
      <div class="n" style="color:${cor}">${score}</div></div>`;
  }

  function painelFinal(html, botoes) {
    $('#res-corpo').innerHTML = html;
    const pe = $('#res .pe');
    pe.innerHTML = '';
    botoes.forEach(b => {
      const btn = el('button', { class: 'btn ' + (b.cls || ''), text: b.txt });
      btn.addEventListener('click', b.fn);
      pe.appendChild(btn);
    });
    $('#res').classList.add('on');
    $('#res-corpo').scrollTop = 0;
  }

  function avancar(prox) {
    $('#res').classList.remove('on');
    if (S.fila && S.idx + 1 < S.fila.length) {
      S.idx++;
      const x = S.fila[S.idx];
      return abrir(x.drill, x.dif);
    }
    if (S.fila) { S.fila = null; return encerrarSessao(); }
    if (prox) return abrir(prox.drill, prox.dif);
    fecharPalco();
  }

  /* ============================================================
     SESSÃO GUIADA
     ============================================================ */
  function sessaoGuiada() {
    const f = C.fila(5);
    if (!f.length) return UI.toast('Faça o diagnóstico primeiro');
    S.fila = f; S.idx = 0;
    C.abrirSessao();
    abrirPalco();
    const esq = U.CI.ESQUEMAS[C.esquemaAtual()];
    const ret = C.alvoRetencao();
    const esp = U.CI.conselhoEspacamento();
    brief('Sessão de hoje', `${f.length} exercícios escolhidos pelo seu estado atual`,
      f.map((x) => `<b>${x.drill.nome}</b> (dif ${x.dif}) — ${x.drill.objetivo}`),
      `<div class="sep"></div>
       ${ret ? `<div class="aviso ok"><b>Antes de treinar: teste de retenção.</b><br>
         5 tentativas de <b>${ret.drill.nome}</b> na dificuldade ${ret.dif}, sem retorno e sem botão aceso,
         ${Math.round(ret.horas)}h depois da última sessão. Essa nota não entra no treino: ela existe para
         medir o que ficou. O que você faz durante a prática é desempenho; aprendizado só aparece num teste
         assim, depois e sem ajuda.</div>` : ''}
       ${esp.aviso ? `<div class="aviso ${esp.ok ? '' : 'bad'}" style="margin-top:7px">${esp.txt}</div>` : ''}
       <div class="mini" style="margin-top:7px"><b>Esquema de hoje: ${esq.nome}</b> — ${esq.desc}.</div>
       <div class="mini" style="margin-top:5px">A ordem não é aleatória: precisão e regularidade vêm antes de
       qualquer coisa que exija velocidade, porque velocidade construída sobre execução instável só multiplica erro.</div>
       <div class="mini" style="margin-top:5px">A dificuldade de cada um se ajusta durante a sessão. Se um exercício
       ficar fácil demais ele sobe na hora; se te derrubar, ele desce.</div>`,
      () => ret ? abrirRetencao(ret) : abrir(f[0].drill, f[0].dif), 'Começar sessão');
  }

  /* ============================================================
     TESTE DE RETENÇÃO — mede aprendizado, não desempenho
     ============================================================ */
  function abrirRetencao(ret) {
    abrir(ret.drill, ret.dif, {
      retencao: ret,
      cfg: { tentativas: 5, mostrarRota: 'antes', feedback: 0, esquema: 'bloco', tempoLeitura: 800 },
    });
  }

  function finalizarRetencao(g, ex) {
    const ret = S.modoRetencao;
    S.modoRetencao = null;
    const motor = S.cfg.modo === 'compasso' ? 'compasso' : S.cfg.freio ? 'freio' : 'sequencia';
    const { score } = M.pontuar(motor, g, S.cfg);
    const anteriores = C.serieRetencao().filter(r => r.drill === ret.drill.id);
    const ant = anteriores.length ? anteriores[anteriores.length - 1].score : null;
    const rec = {
      t: Date.now(), drill: ret.drill.id, nome: ret.drill.nome, dif: ret.dif,
      score, acc: g.acuracia, horas: Math.round(ret.horas),
      scoreTreino: ret.scoreAnterior,
    };
    C.registrarRetencao(rec);
    M.aplicarSet(ret.drill.treina, score, 0.5);       // medida limpa, peso menor (só 5 tentativas)
    M.registrarToques(ex.toques);
    U.Sfx.done();

    const delta = ret.scoreAnterior != null ? score - ret.scoreAnterior : null;
    painelFinal(`
      <div class="flex" style="gap:14px;align-items:center">
        ${anel(score)}
        <div style="flex:1;min-width:0">
          <div style="font-size:.95rem;font-weight:900">Teste de retenção — ${ret.drill.nome}</div>
          <div class="mini">${g.acertos}/${g.n} certas, ${Math.round(ret.horas)}h depois da última sessão,
          sem retorno por tentativa e sem botão aceso.</div>
        </div>
      </div>
      <div class="sep"></div>
      <div class="aviso ${delta == null ? '' : delta >= -6 ? 'ok' : 'bad'}">
        ${delta == null
          ? 'Primeira medição deste exercício. A partir da próxima sessão isso vira uma linha no gráfico de retenção.'
          : `Na sessão passada, treinando, você fez <b>${Math.round(ret.scoreAnterior)}</b>. Hoje, sem ajuda nenhuma,
             <b>${score}</b> (${delta >= 0 ? '+' : ''}${Math.round(delta)}).<br>
             ${delta >= -6
               ? 'Isso é aprendizado de verdade: o que você fez ontem ficou. Segue o plano.'
               : 'A queda mostra que boa parte do desempenho de ontem vinha das dicas na tela. Não é regressão — é a medida honesta. O sistema vai insistir mais nesse exercício.'}`}
      </div>
      ${ant != null ? `<div class="mini" style="margin-top:7px">Retenção anterior deste exercício:
        <b>${Math.round(ant)}</b> → <b>${score}</b> (${score - ant >= 0 ? '+' : ''}${Math.round(score - ant)}).</div>` : ''}
      <div class="mini" style="margin-top:8px">Agora começa a sessão de treino.</div>
    `, [{ txt: 'Começar treino', cls: 'full', fn: () => {
      $('#res').classList.remove('on');
      const x = S.fila ? S.fila[0] : null;
      x ? abrir(x.drill, x.dif) : fecharPalco();
    } }]);
  }

  function encerrarSessao() {
    const rel = C.fecharSessao();
    S.fila = null;
    if (!rel) { fecharPalco(); return; }
    S.ultimoRel = rel;
    mostrarRelatorio(rel);
  }

  /* ============================================================
     RELATÓRIO DE SESSÃO
     ============================================================ */
  function mostrarRelatorio(rel, soLeitura) {
    if (!S.aberto) abrirPalco();
    pararMotor();
    if (S.surf) { S.surf.limparMarcas(); S.surf.setOverlay(null); S.surf.campo = []; }
    faixa('Relatório da sessão', `<span class="chip">${rel.sets} exercícios</span>`);

    const mel = rel.melhorou, pio = rel.piorou;
    const enferrujadas = rel.rotas.filter(r => r.estado !== 'automatica');
    const prontas = rel.rotas.filter(r => r.estado === 'automatica');

    painelFinal(`
      <div class="flex" style="gap:14px;align-items:center">
        ${anel(rel.scoreMedio)}
        <div style="flex:1">
          <div style="font-size:.95rem;font-weight:900">${U.dateTime(rel.sessao.t)}</div>
          <div class="mini">${rel.sets} exercícios · ${U.dur(rel.duracao)} de treino</div>
          ${rel.subiuNivel ? `<div class="tag ok" style="margin-top:5px">Subiu para o nível ${rel.subiuNivel} · ${C.nivelInfo(rel.subiuNivel).nome}</div>` : ''}
        </div>
      </div>

      <div class="sep"></div>
      <div class="grade g2" style="align-items:start">
        <div>
          <div class="mini" style="color:var(--ok)"><b>O que melhorou</b></div>
          ${mel.length ? mel.map(d => `<div class="mini">▲ <b>${d.nome}</b> ${d.antes} → ${d.depois}
            <span style="color:var(--ok)">(+${d.delta.toFixed(1)})</span></div>`).join('')
            : '<div class="mini">Nada subiu nesta sessão. Sessão de manutenção conta — só não conta como progresso.</div>'}
          <div class="mini" style="color:var(--bad);margin-top:8px"><b>O que piorou</b></div>
          ${pio.length ? pio.map(d => `<div class="mini">▼ <b>${d.nome}</b> ${d.antes} → ${d.depois}
            <span style="color:var(--bad)">(${d.delta.toFixed(1)})</span></div>`).join('')
            : '<div class="mini">Nada caiu.</div>'}
        </div>
        <div>
          <div class="mini"><b>Erro mais frequente</b></div>
          ${rel.erroMaisComum ? `<div class="aviso ${rel.erroMaisComum[0] === 'hud' ? 'bad' : ''}" style="margin-top:4px">
            <b>${M.ERROS[rel.erroMaisComum[0]]?.nome || rel.erroMaisComum[0]}</b> — ${rel.erroMaisComum[1]} vezes.<br>
            ${M.ERROS[rel.erroMaisComum[0]]?.dica || ''}
            ${rel.erroMaisComum[0] === 'hud' ? '<br><b>Ação:</b> abra a aba HUD. O problema hoje é layout, não treino.' : ''}
          </div>` : '<div class="mini">Nenhum erro dominante.</div>'}
          <canvas class="graf" id="rel-erros" style="margin-top:7px"></canvas>
        </div>
      </div>

      <div class="sep"></div>
      <div class="grade g2" style="align-items:start">
        <div>
          <div class="mini" style="color:var(--ok)"><b>Pronto para avançar</b></div>
          ${rel.prontos.length ? rel.prontos.map(k => `<span class="tag ok" style="margin:2px 3px 0 0">${M.EIXOS[k].nome}</span>`).join('')
            : '<div class="mini">Nenhum eixo atingiu o alvo do nível ainda.</div>'}
          ${prontas.length ? `<div class="mini" style="margin-top:6px">Rotas já automáticas:
            ${prontas.map(r => `<b>${r.nome}</b>`).join(', ')}. Saíram do rodízio — não vou gastar seu tempo com elas.</div>` : ''}
        </div>
        <div>
          <div class="mini" style="color:var(--warn)"><b>Continua enferrujado</b></div>
          ${rel.pendentes.slice(0, 4).map(k => `<div class="mini">• <b>${M.EIXOS[k].nome}</b> — falta ${Math.round(C.alvoEixo(k, C.nivelAtual()) - M.valores()[k])} pontos</div>`).join('')}
          ${enferrujadas.length ? `<div class="mini" style="margin-top:6px">
            ${enferrujadas.slice(0, 3).map(r => `${UI.chipEstado(r.estado)} <b>${r.nome}</b>`).join('<br>')}</div>` : ''}
        </div>
      </div>

      ${rel.proximo ? `<div class="sep"></div>
        <div class="aviso"><b>Próximo treino recomendado:</b> ${rel.proximo.drill.nome} (dif ${rel.proximo.dif})<br>
        ${rel.proximo.motivo}</div>` : ''}

      ${rel.falta.length ? `<div class="aviso" style="margin-top:7px"><b>Para subir de nível falta:</b>
        ${rel.falta.map(f => `${M.EIXOS[f.eixo]?.nome || 'média geral'} ${f.atual}→${f.alvo}`).join(' · ')}</div>` : ''}
    `, soLeitura
      ? [{ txt: 'Fechar', cls: 'full', fn: () => fecharPalco() }]
      : [
        { txt: 'Continuar treinando', cls: 'sec sm', fn: () => { const p = C.proximo(); $('#res').classList.remove('on'); p ? abrir(p.drill, p.dif) : fecharPalco(); } },
        { txt: 'Concluir', cls: 'full', fn: () => fecharPalco() },
      ]);

    const cv = $('#rel-erros');
    if (cv && rel.errosOrd.length) {
      const cores = { hud: '#ff5470', velocidade: '#ffd479', memoria: '#a78bfa', decisao: '#4ee0ff',
                      freio: '#ff8a5c', posicionamento: '#3ddc97', lento: '#7fa8d0', antecipado: '#c4b5fd', mira: '#66748f' };
      setTimeout(() => G.barras(cv, rel.errosOrd.map(([k, v]) =>
        ({ nome: M.ERROS[k]?.nome || k, valor: v, cor: cores[k] || '#a78bfa' })), { ml: 70 }), 40);
    }
  }

  /* ============================================================
     DIAGNÓSTICO
     ============================================================ */
  function diagnostico() {
    abrirPalco();
    S.diag = { i: 0 }; S.provas = []; S.modoRetencao = null; S.fila = null;
    brief('Diagnóstico de recuperação',
      '6 provas curtas · cerca de 10 minutos',
      [
        'Não tente ir bem. Tente ir <b>como você está hoje</b> — uma medida inflada estraga o plano inteiro.',
        'As provas 3 e 4 usam <b>a mesma rota</b> de propósito. A prova 4 acrescenta uma leitura simultânea.',
        'A diferença entre as duas é a coisa mais importante daqui: ela separa o que você executa <b>pensando</b> do que executa <b>sozinho</b>.',
        'A prova 5 mostra a situação por janelas curtas e depois mascara: é assim que se mede antecipação.',
        'A prova 6 é um teste de sinal de parada com escada — o sinal vai chegar cada vez mais tarde até você falhar metade das vezes. Isso é proposital.',
        'Segure o celular como você joga. Use os dois polegares.',
        'Não pause entre as provas. Fadiga faz parte da medida.',
      ],
      `<div class="sep"></div>
       <div class="pilha" style="gap:5px">
       ${D.DIAGNOSTICO.map((p, i) => `<div class="mini"><span class="tag vio">${i + 1}</span>
         <b style="margin-left:5px">${p.nome}</b> — ${p.mede}</div>`).join('')}
       </div>
       <div class="aviso" style="margin-top:9px">Antes de começar, confirme na aba <b>HUD</b> que a réplica dos
       botões bate com o seu jogo. Se estiver fora do lugar, o diagnóstico mede a coisa errada.</div>`,
      () => rodarProva(0), 'Começar');
  }

  function rodarProva(i) {
    if (i >= D.DIAGNOSTICO.length) return fecharDiagnostico();
    S.diag.i = i;
    const p = D.DIAGNOSTICO[i];
    const drill = D.porId(p.drill);
    S.drill = drill;
    S.cfg = Object.assign({}, p.cfg, { drillId: 'diag-' + p.id, pisoIki: 110 });
    faixa(`Prova ${i + 1}/6 · ${p.nome}`, `<span class="chip">diagnóstico</span>`);
    brief(`Prova ${i + 1} de 6 — ${p.nome}`, p.mede,
      drill.explicacao,
      `<div class="sep"></div><div class="aviso">${p.explica}</div>`,
      () => {
        pararMotor();
        S.surf.resize();
        const api = {
          info: ({ i: k, n, ok, acc }) => faixa(`Prova ${i + 1}/6 · ${p.nome}`, chipsPadrao(k, n, ok, acc)),
          mensagem,
          fim: (g) => finalizarSet(g),
        };
        const Motor = { sequencia: U.E.MotorSequencia, escolha: U.E.MotorEscolha,
                        prioridade: U.E.MotorPrioridade, cenario: U.E.MotorCenario }[drill.motor];
        S.motor = new Motor(S.surf, S.cfg, api);
        contagem(() => S.motor && S.motor.iniciar());
      }, i === 0 ? 'Começar prova 1' : 'Começar');
  }

  function proximaProva(g, ex = {}) {
    const p = D.DIAGNOSTICO[S.diag.i];
    S.provas.push({ id: p.id, g, cfg: S.cfg, extras: ex });
    M.registrarToques(ex.toques);
    U.Sfx.done();
    const i = S.diag.i + 1;
    if (i >= D.DIAGNOSTICO.length) return fecharDiagnostico();

    painelFinal(`
      <div class="flex" style="gap:12px;align-items:center">
        ${anel(Math.round(g.acuracia * 100))}
        <div style="flex:1">
          <div style="font-size:.95rem;font-weight:900">Prova ${S.diag.i + 1} concluída — ${p.nome}</div>
          <div class="mini">${g.acertos}/${g.n} certas${g.rts().length ? ' · ' + Math.round(U.median(g.rts())) + 'ms medianos' : ''}</div>
          <div class="mini" style="margin-top:4px">Faltam ${D.DIAGNOSTICO.length - i} provas. Não pare agora — a medida
          só faz sentido inteira.</div>
        </div>
      </div>`,
      [{ txt: `Prova ${i + 1}: ${D.DIAGNOSTICO[i].nome}`, cls: 'full', fn: () => { $('#res').classList.remove('on'); rodarProva(i); } }]);
  }

  function fecharDiagnostico() {
    const diag = C.diagnosticar(S.provas);
    S.diag = null; S.provas = [];
    U.Sfx.level();
    mostrarDiagnostico(diag, true);
  }

  function mostrarDiagnostico(diag, primeira) {
    if (!diag) return;
    if (!S.aberto) abrirPalco();
    pararMotor();
    faixa('Diagnóstico', `<span class="chip">${U.dateTime(diag.t)}</span>`);

    const n = diag.eixos;
    const est = diag.estadoRota ? M.ESTADOS[diag.estadoRota] : null;
    const q = diag.queda;
    const fila = (diag.fila || []).map(id => D.porId(id)).filter(Boolean);
    const paresLentos = (diag.notas.pares || []).slice(0, 4);
    const botoesFracos = (diag.notas.botoes || []).slice(0, 3);

    const veredito = (() => {
      if (!est) return '';
      if (diag.estadoRota === 'automatica')
        return 'Sua rota base <b>sobreviveu à pausa</b>. O que você perdeu é velocidade e confiança, não memória. A recuperação vai ser rápida.';
      if (diag.estadoRota === 'consciente')
        return 'Você <b>sabe fazer</b> — mas está executando com atenção, não por automatismo. É o padrão clássico de quem parou um mês: a sequência voltou, o automatismo não. O treino certo aqui é carga dupla, não repetição lenta.';
      if (diag.estadoRota === 'lenta')
        return 'Você <b>sabe fazer e está lento</b>. Isso é ferrugem pura e é a melhor notícia possível: não precisa reaprender nada, precisa recuperar ritmo.';
      if (diag.estadoRota === 'instavel')
        return 'Você acerta, mas <b>de um jeito diferente a cada vez</b>. O problema não é força nem memória: é regularidade. Velocidade agora só pioraria.';
      if (diag.estadoRota === 'errando')
        return 'A sequência ainda sai trocada com frequência. Não é catástrofe, mas <b>acelerar agora seria o pior caminho possível</b>. Voltamos ao passo lento com compasso.';
      return 'A rota base precisa ser reconstruída do começo. Um mês foi suficiente para desfazer a ordem. Não é grave, mas é o ponto de partida real.';
    })();

    painelFinal(`
      <h2 style="margin:0 0 3px;font-size:1rem">Diagnóstico ${primeira ? 'inicial' : ''}</h2>
      <div class="mini" style="margin-bottom:9px">Sete medidas, feitas nos seus próprios dedos e no seu próprio HUD.</div>

      <div class="grade g2" style="align-items:start">
        <div>
          ${UI.barrasEixos(n)}
        </div>
        <div>
          <canvas class="graf" id="diag-radar" data-h="188"></canvas>
        </div>
      </div>

      <div class="sep"></div>
      <div class="aviso ${diag.estadoRota === 'perdida' || diag.estadoRota === 'errando' ? 'bad' : diag.estadoRota === 'automatica' ? 'ok' : ''}">
        <b>Veredito sobre a rota base ${est ? '— ' + est.nome : ''}:</b><br>${veredito}
      </div>

      ${q != null ? `<div class="aviso" style="margin-top:7px">
        <b>A medida que mais importa — execução sob atenção dividida:</b><br>
        ${diag.notas.automatismo}<br>
        ${q > 0.26
          ? 'Queda acima de 26%: a rota <b>consome atenção</b>. Em luta, essa atenção é exatamente a que você precisa para ler o inimigo. É por isso que a fase de Automatização existe e por que ela vem antes de Velocidade.'
          : 'Queda baixa: a rota realmente sai sozinha. Podemos pular direto para velocidade e pressão.'}
      </div>` : ''}

      <div class="sep"></div>
      <div class="grade g2" style="align-items:start">
        <div>
          <div class="mini" style="color:var(--ok)"><b>Continua forte</b></div>
          ${diag.fortes.map(k => `<div class="mini">▲ <b>${M.EIXOS[k].nome}</b> ${n[k]} — ${diag.notas[k] || M.EIXOS[k].desc}</div>`).join('')}
        </div>
        <div>
          <div class="mini" style="color:var(--bad)"><b>Fraquezas principais</b></div>
          ${diag.fracos.map(k => `<div class="mini">▼ <b>${M.EIXOS[k].nome}</b> ${n[k]} — ${diag.notas[k] || M.EIXOS[k].desc}</div>`).join('')}
        </div>
      </div>

      ${diag.notas.ssrt != null ? `<div class="sep"></div>
        <div class="aviso ${diag.notas.ssrt < 260 ? 'ok' : diag.notas.ssrt < 340 ? '' : 'bad'}">
          <b>Tempo de frenagem (SSRT): ${diag.notas.ssrt} ms.</b><br>${diag.notas.freio}<br>
          ${!diag.notas.ssrtConfiavel ? 'Atenção: a taxa de parada ficou longe de 50%, então este número ainda é aproximado — o exercício Freio de Mão vai refiná-lo.'
            : diag.notas.ssrt < 260 ? 'Dentro da faixa típica. Seu freio não é o gargalo.'
            : diag.notas.ssrt < 340 ? 'Acima da faixa típica: existe ganho real aqui.'
            : 'Bem acima da faixa típica. Numa luta isso aparece como "eu vi e mesmo assim continuei" — e é provavelmente o que mais te mata.'}
        </div>` : ''}

      ${diag.notas.antecipacao ? `<div class="sep"></div>
        <div class="mini"><b>Sua curva de antecipação</b> — acerto por quantidade de informação</div>
        <canvas class="graf" id="diag-ant" data-h="140" style="margin-top:5px"></canvas>
        <div class="xs" style="margin-top:4px">Onde a linha desaba é a janela mínima em que você ainda lê a
        situação. O exercício Antecipação empurra esse ponto.</div>` : ''}

      ${botoesFracos.length ? `<div class="sep"></div>
        <div class="mini"><b>Botões onde seu dedo encosta pior</b></div>
        <div class="mini" style="margin-top:3px">
        ${botoesFracos.map(b => `<b>${H.getHud()[b.botao]?.nome || b.botao}</b>: ${Math.round((b.prec || 0) * 100)}% de centralidade, ${Math.round(b.rt || 0)}ms para achar`).join(' · ')}</div>` : ''}

      ${paresLentos.length ? `<div class="mini" style="margin-top:6px"><b>Trajetos mais lentos do seu polegar</b></div>
        <div class="mini">${paresLentos.map(p => `${p.par.split('>').map(k => H.getHud()[k]?.curto || k).join('→')} <b>${Math.round(p.med)}ms</b>`).join(' · ')}</div>
        <div class="xs" style="margin-top:3px">O exercício Pontes vai priorizar exatamente esses.</div>` : ''}

      ${diag.erros.length ? `<div class="sep"></div>
        <div class="mini"><b>Natureza dos seus erros</b></div>
        <div class="pilha" style="gap:3px;margin-top:4px">
        ${diag.erros.slice(0, 4).map(([k, v]) => `<div class="mini">
          <span class="tag ${k === 'hud' ? 'bad' : 'warn'}">${M.ERROS[k]?.nome || k} ×${v}</span>
          <span class="xs" style="margin-left:5px">${M.ERROS[k]?.dica || ''}</span></div>`).join('')}
        </div>` : ''}

      <div class="sep"></div>
      <div class="aviso ok">
        <b>Seu ponto de partida: nível ${U.DB.load().nivel} — ${C.nivelInfo(U.DB.load().nivel).nome}.</b><br>
        ${C.nivelInfo(U.DB.load().nivel).porque}
      </div>

      <div class="mini" style="margin-top:9px"><b>Sua sequência inicial, nesta ordem:</b></div>
      <div class="pilha" style="gap:5px;margin-top:5px">
        ${fila.map((dr, i) => `<div class="item"><div class="ic">${i + 1}</div>
          <div class="txt"><b>${dr.nome}</b><span>${dr.objetivo}</span></div></div>`).join('')}
      </div>
      <div class="xs" style="margin-top:6px">Esta ordem não é fixa: depois de cada exercício o sistema recalcula
      qual é o seu maior buraco e pode trocar o próximo.</div>
    `, [
      { txt: 'Fechar', cls: 'sec sm', fn: () => fecharPalco() },
      { txt: 'Começar a sessão', cls: 'full', fn: () => { $('#res').classList.remove('on'); sessaoGuiada(); } },
    ]);

    setTimeout(() => {
      const cv = $('#diag-radar');
      if (cv) {
        const alvos = {}; const nv = C.nivelAtual();
        M.EIXO_IDS.forEach(k => alvos[k] = C.alvoEixo(k, nv));
        G.radar(cv, UI.EIXOS_RADAR, [{ valores: diag.eixos, cor: G.T.serie[0], nome: 'você' }], alvos);
      }
      if ($('#diag-ant') && diag.notas.antecipacao) G.antecipacao($('#diag-ant'), diag.notas.antecipacao);
    }, 50);
  }

  /* ---------- sair ---------- */
  $('#tf-sair').addEventListener('click', () => {
    if (S.diag) {
      UI.modal(`<h2 style="margin:0 0 8px">Sair do diagnóstico?</h2>
        <div class="mini">As provas já feitas serão descartadas. A medida só vale completa.</div>
        <div class="flex" style="margin-top:12px;gap:8px">
          <button class="btn sec full sm" data-fecha>Continuar</button>
          <button class="btn bad full sm" id="cf-sair">Sair</button></div>`,
        (cx) => cx.querySelector('#cf-sair').addEventListener('click', () => { UI.fecharModal(); fecharPalco(); }));
      return;
    }
    const d = U.DB.load();
    if (d.sessaoAtual && d.sessaoAtual.sets.length) return encerrarSessao();
    fecharPalco();
  });
  $('#brief-volta').addEventListener('click', () => {
    if (S.diag) { S.diag = null; S.provas = []; }
    fecharPalco();
  });

  U.T = { abrir, rodar, sessaoGuiada, diagnostico, mostrarDiagnostico, mostrarRelatorio, fecharPalco, _S: S };

})(window.U);
