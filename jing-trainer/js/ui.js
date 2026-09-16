/* ============================================================
   ui.js — telas, navegação, relatórios
   ============================================================ */
'use strict';
(function (U) {

  const { $, $$, el } = U;
  const M = U.M, C = U.C, D = U.D, H = U.HUD, G = U.G;

  const CURTOS = { precisao: 'PREC', velocidade: 'VEL', consistencia: 'CONS', automatismo: 'AUTO',
                   reflexo: 'REFL', decisao: 'DECI', freio: 'FREIO', movimento: 'MOV' };
  const EIXOS_RADAR = M.EIXO_IDS.map(id => ({ id, nome: M.EIXOS[id].nome, curto: CURTOS[id] }));

  /* ---------- utilidades de tela ---------- */
  let telaAtual = 'inicio';
  function ir(nome) {
    telaAtual = nome;
    $$('.tela').forEach(t => t.classList.toggle('on', t.id === 'tela-' + nome));
    $$('.railbtn').forEach(b => b.classList.toggle('on', b.dataset.tela === nome));
    render(nome);
  }

  let toastT = null;
  function toast(txt, tipo = '') {
    const t = $('#toast');
    t.textContent = txt; t.className = 'on ' + tipo;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.className = tipo; }, 2600);
  }

  function modal(html, onOpen) {
    $('#modal-cx').innerHTML = html;
    $('#modal').classList.add('on');
    onOpen && onOpen($('#modal-cx'));
  }
  function fecharModal() { $('#modal').classList.remove('on'); }

  /* ---------- peças reutilizáveis ---------- */
  function barrasEixos(valores, mostrarAlvo = true) {
    const n = C.nivelAtual();
    return M.EIXO_IDS.map(k => {
      const v = Math.round(valores[k]);
      const alvo = C.alvoEixo(k, n);
      const cor = v >= alvo ? 'linear-gradient(90deg,#2fae79,#3ddc97)'
                : v >= alvo - 12 ? 'linear-gradient(90deg,#a78bfa,#4ee0ff)'
                : 'linear-gradient(90deg,#c2364f,#ff8a5c)';
      return `<div class="linha">
        <div class="nome">${M.EIXOS[k].nome}</div>
        <div class="barra"><i style="width:${v}%;background:${cor}"></i>
          ${mostrarAlvo ? `<div class="alvo" style="left:${alvo}%"></div>` : ''}</div>
        <div class="val">${v}</div>
      </div>`;
    }).join('');
  }

  function kpi(v, k, cor) {
    return `<div class="kpi"><div class="v" ${cor ? `style="color:${cor}"` : ''}>${v}</div><div class="k">${k}</div></div>`;
  }

  function chipEstado(estado) {
    const e = M.ESTADOS[estado] || M.ESTADOS.lenta;
    return `<span class="est" style="color:${e.cor};background:${e.cor}22;border:1px solid ${e.cor}55">${e.nome}</span>`;
  }

  /* ============================================================
     TELA — BASE
     ============================================================ */
  function telaInicio() {
    const d = U.DB.load();
    const v = M.valores();
    const n = C.nivelAtual();
    const inf = C.nivelInfo(n);
    const temDiag = !!d.diagnostico;
    const prox = temDiag ? C.proximo() : null;
    const falta = C.faltaParaSubir();
    const ultima = d.sessoes[d.sessoes.length - 1];
    const mec = Object.entries(d.mecanicas || {});

    if (!temDiag) {
      return `
      <div class="topo"><h1>◈ ESPELHO</h1><span class="sub">recuperação de mecânica · Jing</span></div>
      <div class="rolagem pilha">
        <div class="painel frag">
          <h2>Antes de treinar, medir</h2>
          <p class="mini">Você ficou cerca de <b>${d.perfil.parado} dias</b> sem jogar. Isso quase nunca significa
          que você esqueceu a Jing — significa que ela ficou <b>lenta e instável</b>, e que algumas coisas que
          saíam sozinhas voltaram a exigir atenção.</p>
          <p class="mini" style="margin-top:6px">O diagnóstico são <b>6 provas curtas (~9 minutos)</b>. Ele separa o que
          você <b>não sabe mais fazer</b> do que você <b>sabe e está enferrujado</b> — e essas duas coisas
          pedem treinos opostos. Sem essa medida, qualquer plano seria chute.</p>
          <div class="sep"></div>
          <div class="grade g3">
            ${D.DIAGNOSTICO.slice(0,3).map(p=>`<div class="kpi" style="text-align:left"><div class="k" style="color:var(--vio)">${p.nome}</div><div class="mini xs" style="margin-top:3px">${p.mede}</div></div>`).join('')}
          </div>
          <div class="grade g3" style="margin-top:8px">
            ${D.DIAGNOSTICO.slice(3).map(p=>`<div class="kpi" style="text-align:left"><div class="k" style="color:var(--vio)">${p.nome}</div><div class="mini xs" style="margin-top:3px">${p.mede}</div></div>`).join('')}
          </div>
          <button class="btn full gold" id="ir-diag" style="margin-top:10px">Começar diagnóstico</button>
        </div>
        <div class="painel">
          <h2>Antes de começar</h2>
          <div class="mini">Confira se a réplica do HUD bate com o seu jogo. Se os botões não estiverem no
          lugar certo, todo o treino de precisão mede a coisa errada.</div>
          <button class="btn sec full sm" id="ir-mapa2" style="margin-top:8px">Ver e calibrar o HUD</button>
        </div>
      </div>`;
    }

    return `
    <div class="topo">
      <h1>◈ ESPELHO</h1>
      <span class="tag vio">Nível ${n} · ${inf.nome}</span>
      <div class="espaco"></div>
      <span class="sub">${inf.lema}</span>
    </div>
    <div class="rolagem pilha">

      <div class="painel frag">
        <div class="flex" style="align-items:flex-start;gap:12px">
          <div style="flex:1;min-width:0">
            <h2 style="margin-bottom:3px">Próximo exercício</h2>
            <div style="font-size:1.05rem;font-weight:900">${prox ? prox.drill.nome : '—'}</div>
            <div class="mini" style="margin-top:3px">${prox ? prox.motivo : ''}</div>
            <div class="mini xs" style="margin-top:4px">${prox ? prox.drill.objetivo : ''}</div>
          </div>
          <div style="flex:0 0 auto;text-align:center">
            <div class="tag">dif ${prox ? prox.dif : 1}/10</div>
          </div>
        </div>
        <div class="flex" style="margin-top:9px;gap:8px">
          <button class="btn" style="flex:2" id="ir-agora" data-drill="${prox ? prox.drill.id : ''}">Treinar agora</button>
          <button class="btn sec" style="flex:1" id="ir-sessao">Sessão guiada</button>
        </div>
      </div>

      <div class="grade g4">
        ${kpi(n, 'nível', 'var(--vio)')}
        ${kpi(d.sets.length, 'sets')}
        ${kpi(ultima ? Math.round(U.mean(ultima.sets.map(s => s.score))) : '—', 'últ. sessão')}
        ${kpi(d.streak.dias || 0, 'dias seguidos', 'var(--gold)')}
      </div>

      <div class="grade g2" style="align-items:start">
        <div class="painel">
          <h2>Estado atual</h2>
          ${barrasEixos(v)}
          <div class="xs" style="margin-top:6px">A marca dourada é o alvo do nível ${n}.</div>
        </div>
        <div class="painel">
          <h2>Perfil</h2>
          <canvas class="graf" id="radar-inicio" data-h="178"></canvas>
          <div class="xs flex wrap" style="gap:9px;margin-top:4px">
            <span style="color:var(--vio)">━ agora</span>
            <span style="color:#66748f">━ diagnóstico</span>
            <span style="color:var(--gold)">┄ alvo</span>
          </div>
        </div>
      </div>

      ${falta.length ? `<div class="painel">
        <h2>Para subir para o nível ${n + 1} — ${C.nivelInfo(n + 1).nome}</h2>
        <div class="mini">${C.nivelInfo(n + 1).porque}</div>
        <div class="flex wrap" style="margin-top:7px;gap:6px">
          ${falta.map(f => `<span class="tag warn">${M.EIXOS[f.eixo]?.nome || 'Média geral'} ${f.atual} → ${f.alvo}</span>`).join('')}
        </div>
      </div>` : `<div class="painel"><h2>Nível máximo</h2><div class="mini">${inf.porque}</div></div>`}

      ${mec.length ? `<div class="painel">
        <h2>Suas rotas agora</h2>
        <table class="tab"><thead><tr><th>Rota</th><th>Estado</th><th>Acerto</th><th>Leitura</th></tr></thead><tbody>
        ${mec.sort((a,b)=>(a[1].acc||0)-(b[1].acc||0)).slice(0,6).map(([id, m]) => `<tr>
          <td class="forte">${m.nome || id}</td>
          <td>${chipEstado(m.estado)}</td>
          <td>${Math.round((m.acc || 0) * 100)}%</td>
          <td class="mini" style="font-size:.6rem">${M.ESTADOS[m.estado]?.texto || ''}</td>
        </tr>`).join('')}
        </tbody></table>
      </div>` : ''}

    </div>`;
  }

  function depoisInicio() {
    const d = U.DB.load();
    if (!d.diagnostico) {
      $('#ir-diag')?.addEventListener('click', () => U.T.diagnostico());
      $('#ir-mapa2')?.addEventListener('click', () => ir('mapa'));
      return;
    }
    const cv = $('#radar-inicio');
    if (cv) {
      const alvos = {}; const n = C.nivelAtual();
      M.EIXO_IDS.forEach(k => alvos[k] = C.alvoEixo(k, n));
      const series = [];
      if (d.diagnostico) series.push({ valores: d.diagnostico.eixos, cor: '#66748f', preenche: false, grossura: 1.5, pontos: false });
      series.push({ valores: M.valores(), cor: '#a78bfa' });
      G.radar(cv, EIXOS_RADAR, series, alvos);
    }
    $('#ir-agora')?.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.drill;
      const dr = D.porId(id); if (!dr) return;
      U.T.abrir(dr, C.estadoDrill(id).dif);
    });
    $('#ir-sessao')?.addEventListener('click', () => U.T.sessaoGuiada());
  }

  /* ============================================================
     TELA — TREINO (catálogo)
     ============================================================ */
  function telaTreinar() {
    const d = U.DB.load();
    const n = C.nivelAtual();
    const f = d.diagnostico ? C.fila(5) : [];
    const porFase = {};
    for (const dr of D.DRILLS) {
      if (dr.heroi === 'luna') continue;
      (porFase[dr.fase] || (porFase[dr.fase] = [])).push(dr);
    }
    return `
    <div class="topo"><h1>⚔ Treino</h1><div class="espaco"></div>
      <span class="sub">liberado até a fase ${n}</span></div>
    <div class="rolagem pilha">
      ${!d.diagnostico ? `<div class="aviso">Faça o diagnóstico primeiro. Sem ele o sistema não sabe o que priorizar e o treino vira lista genérica.</div>` : ''}

      ${f.length ? `<div class="painel frag">
        <h2>Sessão de hoje — escolhida pelo sistema</h2>
        <div class="pilha" style="gap:6px">
          ${f.map((x, i) => `<div class="item destaque" data-drill="${x.drill.id}">
            <div class="ic">${i + 1}</div>
            <div class="txt"><b>${x.drill.nome}</b><span>${x.drill.objetivo}</span></div>
            <span class="tag">dif ${x.dif}</span>
          </div>`).join('')}
        </div>
        <button class="btn full" id="ir-sessao2" style="margin-top:9px">Rodar a sessão inteira</button>
      </div>` : ''}

      ${C.NIVEIS.slice(0, 6).map(nv => {
        const lista = porFase[nv.n] || [];
        if (!lista.length) return '';
        const bloq = nv.n > n;
        return `<div class="painel">
          <h2 style="color:${bloq ? 'var(--dim2)' : 'var(--vio)'}">Fase ${nv.n} · ${nv.nome} ${bloq ? '🔒' : ''}</h2>
          <div class="mini" style="margin-bottom:7px">${nv.porque}</div>
          <div class="pilha" style="gap:6px">
            ${lista.map(dr => {
              const e = C.estadoDrill(dr.id);
              return `<div class="item ${bloq ? 'bloq' : ''}" data-drill="${bloq ? '' : dr.id}">
                <div class="ic">${{sequencia:'⌁',escolha:'⚡',prioridade:'◎',cenario:'⛨'}[dr.motor] || '◆'}</div>
                <div class="txt"><b>${dr.nome}</b><span>${dr.objetivo}</span></div>
                <div style="text-align:right;flex:0 0 auto">
                  <div class="tag">dif ${e.dif}</div>
                  ${e.sets ? `<div class="xs" style="margin-top:2px">melhor ${Math.round(e.melhor)}</div>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function depoisTreinar() {
    $('#ir-sessao2')?.addEventListener('click', () => U.T.sessaoGuiada());
    $$('#tela-treinar .item[data-drill]').forEach(it => {
      const id = it.dataset.drill; if (!id) return;
      it.addEventListener('click', () => {
        const dr = D.porId(id); if (!dr) return;
        U.T.abrir(dr, C.estadoDrill(id).dif);
      });
    });
  }

  /* ============================================================
     TELA — HUD (análise ergonômica e calibração)
     ============================================================ */
  function telaMapa() {
    const hud = H.getHud();
    const a = H.analisarHud(hud);
    const culpa = C.culpaDoHud();
    const pares = Object.entries(U.DB.load().pares || {})
      .filter(([, e]) => e.n >= 3)
      .sort((x, y) => y[1].med - x[1].med).slice(0, 8);

    const riscosCriticos = a.riscos.filter(r => r.critico).slice(0, 5);

    return `
    <div class="topo"><h1>✥ Seu HUD</h1><div class="espaco"></div>
      <span class="sub">${a.telaMM.w.toFixed(0)} × ${a.telaMM.h.toFixed(0)} mm · Poco X7 Pro</span></div>
    <div class="rolagem pilha">

      <div class="painel">
        <h2>Mapa medido a partir do seu print</h2>
        <canvas id="mapacv"></canvas>
        <div class="flex wrap xs" style="gap:10px;margin-top:5px">
          <span style="color:var(--gold)">● habilidades</span>
          <span style="color:#9fb6d4">● ataque</span>
          <span style="color:var(--bad)">▬ corredor de risco</span>
          <span style="color:var(--cy)">● movimento</span>
        </div>
        <div class="flex" style="margin-top:8px;gap:8px">
          <button class="btn sec sm" id="calibrar">Calibrar arrastando</button>
          <button class="btn sec sm" id="resetHud">Voltar ao original</button>
        </div>
      </div>

      <div class="painel frag">
        <h2>O que eu encontrei no seu layout</h2>

        <div class="aviso bad">
          <b>1. O corredor Hab.1 → Ataque está congestionado.</b><br>
          Esse é o trajeto mais percorrido do jogo (${H.percurso(hud,'s1','aa').toFixed(1)} mm no seu aparelho) e
          ${a.corredor.length ? `há ${a.corredor.length} botão(ões) dentro dele. O pior é o
          <b>${H.NOMES[a.corredor[0].k]}</b>: a borda dele fica a
          <b>${a.corredor[0].dist <= 0.2 ? 'zero mm — encostada na linha' : a.corredor[0].dist.toFixed(1) + ' mm da linha'}</b>.` : 'ele está limpo.'}
          Um polegar adulto encosta num círculo de 9 a 13 mm. Qualquer coisa a menos de ~5 mm da linha vai ser
          tocada por engano nos combos rápidos.<br>
          <b>O que fazer:</b> afaste o item ~4 mm para baixo/direita. É um ajuste pequeno, não desmonta sua adaptação.
        </div>

        <div class="aviso" style="margin-top:7px">
          <b>2. A ultimate está longe.</b><br>
          Hab.1 → Ultimate são <b>${a.arco.toFixed(1)} mm</b> de percurso de polegar. É a maior distância do seu HUD
          e é exatamente a mecânica que mais enferruja depois de uma pausa — porque depende de um movimento
          amplo, não de um toque.<br>
          <b>O que fazer:</b> <u>não mexa agora</u>. Trate isso como treino, não como configuração: o exercício
          <b>Pontes</b> existe para esse trajeto. Reavalie o arco só a partir do nível 4, quando sua precisão
          estiver estável — mexer no meio da recuperação apaga a adaptação que você ainda tem.
        </div>

        ${riscosCriticos.length ? `<div class="aviso ${riscosCriticos[0].folga < 3 ? 'bad' : ''}" style="margin-top:7px">
          <b>3. Pares de botões com pouca folga entre as bordas:</b><br>
          ${riscosCriticos.map(r => `${H.NOMES[r.a]} ↔ ${H.NOMES[r.b]}: <b>${r.folga.toFixed(1)} mm</b>`).join(' · ')}<br>
          Abaixo de 2,5 mm o erro é praticamente inevitável em execução rápida. O sistema já separa esses
          toques como <b>erro de HUD</b> e não conta contra a sua memória.
        </div>` : ''}

        <div class="aviso ${culpa.frac > 0.25 ? 'bad' : 'ok'}" style="margin-top:7px">
          <b>4. Quanto dos seus erros é culpa do layout:</b>
          ${culpa.total ? `${culpa.hud} de ${culpa.total} erros recentes (${Math.round(culpa.frac * 100)}%).
          ${culpa.frac > 0.25 ? 'Isso é alto. Vale mexer no HUD antes de insistir no treino.'
            : 'Dentro do normal. O problema atual não é o layout.'}`
          : 'Ainda sem dados. Esta conta aparece depois dos primeiros exercícios.'}
        </div>

        <div class="aviso ok" style="margin-top:7px">
          <b>5. O que está bom e não deve ser mexido:</b><br>
          O analógico a ${(hud.joy.x*a.telaMM.w).toFixed(0)} mm da borda esquerda dá folga para o polegar sem
          disputar espaço com a barra de navegação. Retornar e Recuperar estão longe da zona de combate —
          é exatamente onde precisam ficar. O ataque no canto inferior direito é o ponto mais confortável do
          aparelho e está sendo usado pela ação mais frequente.
        </div>
      </div>

      ${pares.length ? `<div class="painel">
        <h2>Percursos mais lentos do seu polegar</h2>
        <div class="mini" style="margin-bottom:6px">Medido nos seus próprios toques. Os trajetos do topo são os que o exercício <b>Pontes</b> vai priorizar.</div>
        <canvas class="graf" id="graf-pares"></canvas>
      </div>` : ''}

      <div class="painel">
        <h2>Pergunta de configuração</h2>
        <div class="mini">Se o seu analógico for <b>fixo</b>, considere testar o modo <b>"segue o dedo"</b> em partida
        casual. Com combo longo, o analógico fixo força o polegar esquerdo a voltar ao centro entre uma direção e
        outra — e é aí que nasce o "combo parado". Não mude nada no meio da recuperação: anote e teste depois do nível 3.</div>
      </div>
    </div>`;
  }

  let mapaSurf = null;
  function depoisMapa() {
    const cv = $('#mapacv');
    if (cv) {
      mapaSurf && mapaSurf.destroy();
      mapaSurf = new H.HudSurface(cv, {
        onCalibrado: () => { toast('HUD atualizado', 'ok'); },
      });
      // desenha o corredor de risco por cima
      const orig = mapaSurf.draw.bind(mapaSurf);
      mapaSurf.draw = function () {
        orig();
        const c = this.ctx, B = this.box, hud = this.hud;
        const A = this.px(hud.s1), Z = this.px(hud.aa);
        c.save();
        c.strokeStyle = 'rgba(255,84,112,.55)'; c.lineWidth = Math.max(8, B.h * 0.045);
        c.lineCap = 'round'; c.globalAlpha = .45;
        c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(Z.x, Z.y); c.stroke();
        const S = this.px(hud.s3);
        c.strokeStyle = 'rgba(232,196,106,.5)'; c.lineWidth = 3; c.setLineDash([6, 5]); c.globalAlpha = .8;
        c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(S.x, S.y); c.stroke();
        c.restore();
      };
      setTimeout(() => mapaSurf.resize(), 60);
    }
    $('#calibrar')?.addEventListener('click', (e) => {
      if (!mapaSurf) return;
      mapaSurf.calibrando = !mapaSurf.calibrando;
      $('#mapacv').classList.toggle('grande', mapaSurf.calibrando);
      setTimeout(() => mapaSurf && mapaSurf.resize(), 60);
      e.currentTarget.textContent = mapaSurf.calibrando ? 'Concluir calibração' : 'Calibrar arrastando';
      e.currentTarget.classList.toggle('gold', mapaSurf.calibrando);
      if (!mapaSurf.calibrando) { toast('Calibração salva', 'ok'); render('mapa'); }
    });
    $('#resetHud')?.addEventListener('click', () => {
      H.resetHud(); toast('HUD restaurado ao print original'); render('mapa');
    });
    const gp = $('#graf-pares');
    if (gp) {
      const pares = Object.entries(U.DB.load().pares || {}).filter(([, e]) => e.n >= 3)
        .sort((x, y) => y[1].med - x[1].med).slice(0, 8);
      G.barras(gp, pares.map(([k, e]) => ({
        nome: k.split('>').map(x => H.getHud()[x]?.curto || x).join('→'),
        valor: e.med, cor: e.med > 500 ? '#ff5470' : e.med > 380 ? '#ffd479' : '#3ddc97',
      })), { fmt: v => Math.round(v) + 'ms', ml: 60 });
    }
  }

  /* ============================================================
     TELA — DADOS
     ============================================================ */
  function telaRel() {
    const d = U.DB.load();
    const sess = d.sessoes.slice(-14);
    const diag = d.diagnostico;
    const erros = {};
    for (const s of d.sets.slice(-40)) for (const k in s.erros) erros[k] = (erros[k] || 0) + s.erros[k];
    const errosOrd = Object.entries(erros).sort((a, b) => b[1] - a[1]);
    const mec = Object.entries(d.mecanicas || {});

    if (!d.sets.length) {
      return `<div class="topo"><h1>▤ Dados</h1></div>
      <div class="rolagem"><div class="painel"><h2>Sem dados ainda</h2>
      <div class="mini">Faça o diagnóstico e alguns exercícios. Esta tela compara sessões, mostra o que melhorou,
      o que piorou e qual erro mais se repete.</div></div></div>`;
    }

    return `
    <div class="topo"><h1>▤ Dados</h1><div class="espaco"></div>
      <span class="sub">${d.sets.length} sets · ${d.sessoes.length} sessões</span></div>
    <div class="rolagem pilha">

      ${sess.length >= 2 ? `<div class="painel">
        <h2>Evolução por sessão</h2>
        <canvas class="graf" id="g-sess" data-h="140"></canvas>
        <div class="xs flex wrap" style="gap:9px;margin-top:4px">
          <span style="color:var(--vio)">━ pontuação média</span>
          <span style="color:var(--cy)">━ acerto</span>
        </div>
      </div>` : ''}

      <div class="grade g2" style="align-items:start">
        <div class="painel">
          <h2>Agora × diagnóstico</h2>
          <canvas class="graf" id="g-radar2" data-h="180"></canvas>
        </div>
        <div class="painel">
          <h2>Seus erros (últimos 40 sets)</h2>
          ${errosOrd.length ? `<canvas class="graf" id="g-erros"></canvas>
          <div class="mini" style="margin-top:6px"><b>${M.ERROS[errosOrd[0][0]]?.nome || errosOrd[0][0]}</b> —
          ${M.ERROS[errosOrd[0][0]]?.dica || ''}</div>` : '<div class="mini">Nenhum erro registrado.</div>'}
        </div>
      </div>

      ${mec.length ? `<div class="painel">
        <h2>Estado de cada mecânica</h2>
        <table class="tab"><thead><tr><th>Rota</th><th>Estado</th><th>Acerto</th><th>Ritmo</th><th>Sob carga</th></tr></thead><tbody>
        ${mec.map(([id, m]) => `<tr>
          <td class="forte">${m.nome || id}</td>
          <td>${chipEstado(m.estado)}</td>
          <td>${Math.round((m.acc || 0) * 100)}%</td>
          <td>±${Math.round((m.cv || 0) * 100)}%</td>
          <td>${m.quedaCarga != null ? (m.quedaCarga > 0.26 ? `<span style="color:var(--bad)">-${Math.round(m.quedaCarga*100)}%</span>` : `<span style="color:var(--ok)">-${Math.round(Math.max(0,m.quedaCarga)*100)}%</span>`) : '—'}</td>
        </tr>`).join('')}
        </tbody></table>
        <div class="xs" style="margin-top:6px">"Sob carga" é quanto a rota piora quando você precisa ler a tela ao mesmo tempo.
        Acima de 26% significa que ela ainda é consciente, não automática.</div>
      </div>` : ''}

      <div class="painel">
        <h2>Histórico de sessões</h2>
        <div class="pilha" style="gap:5px">
          ${d.sessoes.slice().reverse().slice(0, 12).map((s, i) => {
            const idx = d.sessoes.length - 1 - i;
            const md = Math.round(U.mean(s.sets.map(x => x.score)));
            return `<div class="item" data-sess="${idx}">
              <div class="ic">${s.heroi === 'luna' ? '☾' : '◈'}</div>
              <div class="txt"><b>${U.dateTime(s.t)}</b><span>${s.sets.length} exercícios · nível ${s.nivelDepois}</span></div>
              <span class="tag ${md >= 78 ? 'ok' : md >= 60 ? '' : 'bad'}">${md}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      ${diag ? `<div class="painel">
        <h2>Diagnóstico inicial · ${U.dateTime(diag.t)}</h2>
        <div class="mini">${diag.notas.automatismo || ''}</div>
        <button class="btn sec sm full" id="ver-diag" style="margin-top:7px">Ver o diagnóstico completo</button>
        <button class="btn sec sm full" id="refazer-diag" style="margin-top:6px">Refazer diagnóstico</button>
      </div>` : ''}
    </div>`;
  }

  function depoisRel() {
    const d = U.DB.load();
    const sess = d.sessoes.slice(-14);
    if (sess.length >= 2 && $('#g-sess')) {
      G.linha($('#g-sess'),
        [{ dados: sess.map(s => U.mean(s.sets.map(x => x.score))), cor: '#a78bfa', area: true },
         { dados: sess.map(s => U.mean(s.sets.map(x => x.acc)) * 100), cor: '#4ee0ff' }],
        sess.map(s => U.dateShort(s.t)));
    }
    if ($('#g-radar2')) {
      const series = [];
      if (d.diagnostico) series.push({ valores: d.diagnostico.eixos, cor: '#66748f', preenche: false, grossura: 1.5, pontos: false });
      series.push({ valores: M.valores(), cor: '#a78bfa' });
      const alvos = {}; const n = C.nivelAtual();
      M.EIXO_IDS.forEach(k => alvos[k] = C.alvoEixo(k, n));
      G.radar($('#g-radar2'), EIXOS_RADAR, series, alvos);
    }
    if ($('#g-erros')) {
      const erros = {};
      for (const s of d.sets.slice(-40)) for (const k in s.erros) erros[k] = (erros[k] || 0) + s.erros[k];
      const cores = { hud: '#ff5470', velocidade: '#ffd479', memoria: '#a78bfa', decisao: '#4ee0ff',
                      freio: '#ff8a5c', posicionamento: '#3ddc97', lento: '#7fa8d0', antecipado: '#c4b5fd', mira: '#66748f' };
      G.barras($('#g-erros'), Object.entries(erros).sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ nome: M.ERROS[k]?.nome || k, valor: v, cor: cores[k] || '#a78bfa' })), { ml: 74 });
    }
    $$('#tela-rel .item[data-sess]').forEach(it => it.addEventListener('click', () => {
      const s = U.DB.load().sessoes[+it.dataset.sess];
      if (s) U.T.mostrarRelatorio(C.relatorio(s), true);
    }));
    $('#ver-diag')?.addEventListener('click', () => U.T.mostrarDiagnostico(U.DB.load().diagnostico));
    $('#refazer-diag')?.addEventListener('click', () => {
      modal(`<h2 style="margin:0 0 8px">Refazer o diagnóstico?</h2>
        <div class="mini">Isso substitui a medição atual. Seu histórico de sessões continua salvo.</div>
        <div class="flex" style="margin-top:12px;gap:8px">
          <button class="btn sec full sm" data-fecha>Cancelar</button>
          <button class="btn full sm" id="cf-diag">Refazer</button></div>`,
        (cx) => {
          cx.querySelector('#cf-diag').addEventListener('click', () => { fecharModal(); U.T.diagnostico(); });
        });
    });
  }

  /* ============================================================
     TELA — LUNA
     ============================================================ */
  function telaLuna() {
    const d = U.DB.load();
    const v = M.valores();
    const lib = d.lunaLiberada;
    const drills = D.DRILLS.filter(x => x.heroi === 'luna');

    if (!lib) {
      return `
      <div class="topo"><h1>☾ Luna</h1><div class="espaco"></div><span class="sub">ainda fechado</span></div>
      <div class="rolagem pilha">
        <div class="painel frag">
          <h2>Por que a Luna ainda não abriu</h2>
          <p class="mini">Você está enferrujado nas duas. Tentar recuperar as duas ao mesmo tempo é a forma mais
          confiável de não recuperar nenhuma: as heroínas competem pela mesma coisa — o mapa de posições do seu
          polegar direito. Enquanto esse mapa estiver instável, treinar Luna <b>atrasa</b> a Jing em vez de somar.</p>
          <p class="mini" style="margin-top:6px">A Luna abre quando a Jing chegar ao <b>nível 4</b> com
          <b>precisão ≥ 68</b> e <b>consistência ≥ 68</b>. Nesse ponto o mapa de botões já está fixo, e o que a
          Luna exige a mais (cadeia longa, ritmo, escolha de alvo no salto) passa a somar em vez de competir.</p>
          <div class="sep"></div>
          <div class="grade g3">
            ${kpi(C.nivelAtual() + '/4', 'nível', C.nivelAtual() >= 4 ? 'var(--ok)' : 'var(--warn)')}
            ${kpi(Math.round(v.precisao) + '/68', 'precisão', v.precisao >= 68 ? 'var(--ok)' : 'var(--warn)')}
            ${kpi(Math.round(v.consistencia) + '/68', 'consistência', v.consistencia >= 68 ? 'var(--ok)' : 'var(--warn)')}
          </div>
        </div>
        <div class="painel">
          <h2>O que vai te esperar aqui</h2>
          <div class="pilha" style="gap:6px">
            ${drills.map(dr => `<div class="item bloq"><div class="ic">☾</div>
              <div class="txt"><b>${dr.nome}</b><span>${dr.objetivo}</span></div></div>`).join('')}
          </div>
        </div>
      </div>`;
    }

    return `
    <div class="topo"><h1>☾ Luna</h1><div class="espaco"></div>
      <span class="tag ${d.focoLuna ? 'ok' : ''}">${d.focoLuna ? 'foco ativo' : 'foco na Jing'}</span></div>
    <div class="rolagem pilha">
      <div class="painel frag">
        <h2>Área liberada</h2>
        <div class="mini">A base da Jing está estável o suficiente. A Luna entra agora como <b>treino paralelo</b>,
        não como substituição: o recomendado é 2 exercícios de Luna a cada 5 da Jing enquanto a Jing não chegar ao nível 6.</div>
        <button class="btn full ${d.focoLuna ? 'sec' : 'gold'}" id="tog-luna" style="margin-top:9px">
          ${d.focoLuna ? 'Voltar o foco para a Jing' : 'Colocar o foco na Luna'}</button>
      </div>
      <div class="painel">
        <h2>Exercícios</h2>
        <div class="pilha" style="gap:6px">
          ${drills.map(dr => {
            const e = C.estadoDrill(dr.id);
            return `<div class="item" data-drill="${dr.id}"><div class="ic">☾</div>
              <div class="txt"><b>${dr.nome}</b><span>${dr.objetivo}</span></div>
              <span class="tag">dif ${e.dif}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div class="painel">
        <h2>A diferença entre as duas</h2>
        <div class="mini">A Jing perdoa um erro no meio do combo — você reposiciona e continua. A Luna não: um
        toque trocado quebra a cadeia e você fica parado no meio do time inimigo. Por isso o treino dela é de
        <b>não-erro</b>, não de velocidade. A faixa de tempo aperta, mas o critério que manda é sempre a taxa de acerto.</div>
      </div>
    </div>`;
  }

  function depoisLuna() {
    $('#tog-luna')?.addEventListener('click', () => {
      const d = U.DB.load(); d.focoLuna = !d.focoLuna; U.DB.save();
      toast(d.focoLuna ? 'Foco na Luna' : 'Foco na Jing', 'ok'); render('luna');
    });
    $$('#tela-luna .item[data-drill]').forEach(it => it.addEventListener('click', () => {
      const dr = D.porId(it.dataset.drill); if (!dr) return;
      U.T.abrir(dr, C.estadoDrill(dr.id).dif);
    }));
  }

  /* ============================================================
     TELA — CONFIG
     ============================================================ */
  function telaAjustes() {
    const d = U.DB.load();
    const o = d.opts;
    const rotas = D.getRotas('jing');
    return `
    <div class="topo"><h1>⚙ Configurações</h1></div>
    <div class="rolagem pilha">
      <div class="painel">
        <h2>Aparelho</h2>
        <button class="btn sec full sm" id="fs">Tela cheia + travar em paisagem</button>
        <div class="xs" style="margin-top:5px">Recomendado antes de treinar: evita que a barra de gestos entre no caminho do polegar.</div>
      </div>
      <div class="grade g3">
        <button class="btn ${o.som ? '' : 'sec'} sm" id="o-som">Som ${o.som ? 'ligado' : 'desligado'}</button>
        <button class="btn ${o.vibra ? '' : 'sec'} sm" id="o-vibra">Vibração ${o.vibra ? 'ligada' : 'desligada'}</button>
        <button class="btn ${o.fx === 'alto' ? '' : 'sec'} sm" id="o-fx">Efeitos ${o.fx === 'alto' ? 'completos' : 'reduzidos'}</button>
      </div>

      <div class="painel">
        <h2>Rotas da Jing</h2>
        <div class="mini" style="margin-bottom:7px">As rotas foram nomeadas pela função. Se a sua build ou o patch
        mudarem a ordem, edite aqui — todo o treino passa a usar a sequência nova imediatamente.</div>
        <div class="pilha" style="gap:6px">
          ${rotas.map(r => `<div class="item" data-rota="${r.id}">
            <div class="ic">${r.prio}</div>
            <div class="txt"><b>${r.nome} — ${r.seq.map(k => H.getHud()[k]?.curto || k).join(' › ')}</b><span>${r.porque}</span></div>
            <span class="tag">editar</span>
          </div>`).join('')}
        </div>
      </div>

      <div class="painel">
        <h2>Seus dados</h2>
        <div class="grade g2">
          <button class="btn sec sm" id="exp">Exportar backup</button>
          <button class="btn sec sm" id="imp">Importar backup</button>
        </div>
        <button class="btn bad sm full" id="zerar" style="margin-top:8px">Apagar tudo e recomeçar</button>
        <div class="xs" style="margin-top:6px">Tudo fica salvo só no seu aparelho. Nada sai daqui.</div>
      </div>

      <div class="painel">
        <h2>Como este sistema decide</h2>
        <div class="mini">Cada exercício alimenta oito eixos. A cada set o sistema compara onde você está com o
        alvo do seu nível, soma o tempo que cada eixo ficou sem treino e escolhe o exercício que cobre o maior
        buraco — e não o próximo da lista. Se a sua velocidade estiver gerando erro, o tempo <b>volta</b>
        automaticamente até a precisão estabilizar. Se uma mecânica já estiver automática, ela sai do rodízio.</div>
      </div>
    </div>`;
  }

  function depoisAjustes() {
    const d = U.DB.load();
    $('#fs')?.addEventListener('click', () => { U.Screen.fullscreen(); U.Sfx.unlock(); toast('Tela cheia'); });
    const alt = (k, v) => { d.opts[k] = v; U.DB.save(); render('ajustes'); };
    $('#o-som')?.addEventListener('click', () => { alt('som', !d.opts.som); U.Sfx.unlock(); U.Sfx.hit(); });
    $('#o-vibra')?.addEventListener('click', () => { alt('vibra', !d.opts.vibra); U.Haptic.good(); });
    $('#o-fx')?.addEventListener('click', () => alt('fx', d.opts.fx === 'alto' ? 'baixo' : 'alto'));

    $$('#tela-ajustes .item[data-rota]').forEach(it => it.addEventListener('click', () => editarRota(it.dataset.rota)));

    $('#exp')?.addEventListener('click', () => {
      const blob = new Blob([U.DB.export()], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: `espelho-backup-${new Date().toISOString().slice(0,10)}.json` });
      document.body.appendChild(a); a.click(); a.remove();
      toast('Backup gerado', 'ok');
    });
    $('#imp')?.addEventListener('click', () => {
      const inp = el('input', { type: 'file', accept: 'application/json' });
      inp.addEventListener('change', () => {
        const f = inp.files[0]; if (!f) return;
        const fr = new FileReader();
        fr.onload = () => {
          try { U.DB.import(fr.result); toast('Backup restaurado', 'ok'); ir('inicio'); }
          catch (e) { toast('Arquivo inválido'); }
        };
        fr.readAsText(f);
      });
      inp.click();
    });
    $('#zerar')?.addEventListener('click', () => {
      modal(`<h2 style="margin:0 0 8px;color:var(--bad)">Apagar tudo?</h2>
        <div class="mini">Diagnóstico, histórico, níveis e calibração do HUD serão perdidos. Não dá para desfazer.</div>
        <div class="flex" style="margin-top:12px;gap:8px">
          <button class="btn full sm" data-fecha>Cancelar</button>
          <button class="btn bad full sm" id="cf-zerar">Apagar</button></div>`,
        (cx) => cx.querySelector('#cf-zerar').addEventListener('click', () => {
          U.DB.reset(); fecharModal(); toast('Tudo zerado'); ir('inicio');
        }));
    });
  }

  function editarRota(id) {
    const rota = D.rotaPorId(id);
    if (!rota) return;
    let seq = rota.seq.slice();
    const botoes = ['s1', 's2', 's3', 'aa', 'flash', 'it1', 'it2'];
    const desenha = (cx) => {
      cx.querySelector('#seq').innerHTML = seq.length
        ? seq.map((k, i) => `<button class="btn sec sm" data-rm="${i}">${H.getHud()[k]?.curto || k} ✕</button>`).join('')
        : '<span class="mini">sequência vazia</span>';
      cx.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => {
        seq.splice(+b.dataset.rm, 1); desenha(cx);
      }));
    };
    modal(`
      <h2 style="margin:0 0 4px">${rota.nome}</h2>
      <div class="mini" style="margin-bottom:9px">${rota.porque}</div>
      <div class="mini"><b>Sequência</b></div>
      <div class="flex wrap" id="seq" style="gap:6px;margin:6px 0 10px;min-height:44px"></div>
      <div class="mini"><b>Adicionar</b></div>
      <div class="flex wrap" style="gap:6px;margin-top:6px">
        ${botoes.map(k => `<button class="btn sm" data-add="${k}">${H.getHud()[k]?.curto || k}</button>`).join('')}
      </div>
      <div class="flex" style="margin-top:12px;gap:8px">
        <button class="btn sec full sm" data-fecha>Cancelar</button>
        <button class="btn full sm" id="salvar-rota">Salvar</button>
      </div>`,
      (cx) => {
        desenha(cx);
        cx.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
          if (seq.length >= 12) return;
          seq.push(b.dataset.add); desenha(cx);
        }));
        cx.querySelector('#salvar-rota').addEventListener('click', () => {
          if (seq.length < 1) return toast('A rota precisa de ao menos um toque');
          rota.seq = seq; U.DB.save(); fecharModal(); toast('Rota salva', 'ok'); render('ajustes');
        });
      });
  }

  /* ============================================================
     Router
     ============================================================ */
  const TELAS = {
    inicio: [telaInicio, depoisInicio],
    treinar: [telaTreinar, depoisTreinar],
    mapa: [telaMapa, depoisMapa],
    rel: [telaRel, depoisRel],
    luna: [telaLuna, depoisLuna],
    ajustes: [telaAjustes, depoisAjustes],
  };

  function render(nome = telaAtual) {
    const [tpl, depois] = TELAS[nome] || TELAS.inicio;
    if (nome !== 'mapa' && mapaSurf) { mapaSurf.destroy(); mapaSurf = null; }
    const alvo = $('#tela-' + nome);
    if (!alvo) return;
    alvo.innerHTML = tpl();
    depois && depois();
  }

  U.UI = { ir, render, toast, modal, fecharModal, barrasEixos, kpi, chipEstado, EIXOS_RADAR, CURTOS, get telaAtual() { return telaAtual; } };

})(window.U);
