/* ============================================================
   ui.js — telas (V2)
   ------------------------------------------------------------
   Cinco telas em vez de sete, organizadas na ordem em que a
   cabeça precisa delas:
     AGORA      o que fazer, por quê, e o que o sistema ainda não sabe
     PROGRESSO  o que ficou (e o que é só desempenho do dia)
     HUD        o que o seu aparelho impõe
     MÉTODO     por que o sistema é assim, com as fontes
     CONFIG     ajustes e dados
   ============================================================ */
'use strict';
(function (U) {

  const { $, $$, el } = U;
  const MD = U.MD, CT = U.CT, DS = U.DS, D = U.D, H = U.HUD, G = U.G, S = U.S, CO = U.CO;

  let telaAtual = 'agora';
  function ir(nome) {
    telaAtual = nome;
    $$('.tela').forEach(t => t.classList.toggle('on', t.id === 'tela-' + nome));
    $$('.railbtn').forEach(b => b.classList.toggle('on', b.dataset.tela === nome));
    render(nome);
  }

  let toastT = null;
  function toast(txt, tipo = '') {
    const t = $('#toast'); t.textContent = txt; t.className = 'on ' + tipo;
    clearTimeout(toastT); toastT = setTimeout(() => { t.className = tipo; }, 2600);
  }
  function modal(html, onOpen) {
    $('#modal-cx').innerHTML = html; $('#modal').classList.add('on');
    onOpen && onOpen($('#modal-cx'));
  }
  const fecharModal = () => $('#modal').classList.remove('on');

  /* ============================================================
     Peças
     ============================================================ */
  const NIVEL_CLASSE = { insuficiente: 'bad', provisorio: 'warn', razoavel: '', firme: 'ok' };

  function cartaoMedida(m, opts = {}) {
    const semDado = m.v == null || m.nivel === 'insuficiente';
    const piso = opts.piso;
    return `<div class="medida ${semDado ? 'vazia' : ''}">
      <div class="flex" style="gap:6px;align-items:baseline">
        <div class="mt">${m.nome}</div>
        <div class="espaco"></div>
        <span class="tag ${NIVEL_CLASSE[m.nivel] || ''}">${S.rotuloNivel(m.nivel)}</span>
      </div>
      ${semDado
        ? `<div class="mv vazio">—</div>
           <div class="mini">${m.n ? `${m.n} tentativa${m.n > 1 ? 's' : ''} até agora.` : 'Ainda sem tentativas.'}
           Faltam ${Math.max(0, (S.MIN[opts.tipo || 'proporcao'].explorar) - m.n)} para a primeira estimativa.</div>`
        : `<div class="mv">${m.v}<span class="mu">${m.unidade || ''}</span></div>
           <canvas class="graf" data-medidor="${m.id}"></canvas>
           <div class="mini">intervalo <b>${m.lo}–${m.hi}</b> · ${m.n} tentativas
             ${m.tendencia && m.tendencia !== 'indefinida' && m.tendencia !== 'estavel'
               ? `· <span style="color:${(m.tendencia === 'sobe') === (m.melhor === 'maior') ? 'var(--ok)' : 'var(--bad)'}">${m.tendencia === 'sobe' ? 'subindo' : 'descendo'}</span>` : ''}
           </div>`}
      <div class="xs" style="margin-top:4px">${m.pergunta}</div>
    </div>`;
  }

  function cartoesMedidas(p, compacto) {
    const ordem = ['retencao', 'execucao', 'estabilidade', 'leitura', 'aborto'];
    const pisos = { retencao: 70, leitura: 55 };
    return `<div class="grade g3 medidas">
      ${ordem.map(k => cartaoMedida(p[k], { piso: pisos[k], tipo: (k === 'execucao' || k === 'estabilidade' || k === 'aborto') ? 'tempo' : 'proporcao' })).join('')}
      ${p.custoDecisao.nivel !== 'insuficiente' ? cartaoMedida(p.custoDecisao, { tipo: 'diferenca' }) : ''}
    </div>`;
  }

  function desenharMedidores(raiz) {
    const p = MD.painel();
    $$('canvas[data-medidor]', raiz || document).forEach(cv => {
      const m = p[cv.dataset.medidor];
      if (!m || m.v == null) return;
      const cfgs = {
        retencao: { min: 0, max: 100, piso: 70, cor: G.T.serie[0] },
        leitura: { min: 0, max: 100, piso: 55, cor: G.T.serie[0] },
        execucao: { min: 400, max: 2000, cor: G.T.serie[2] },
        estabilidade: { min: 0, max: 45, cor: G.T.serie[2] },
        aborto: { min: 0, max: 500, cor: G.T.serie[1] },
        custoDecisao: { min: -20, max: 60, cor: G.T.serie[1] },
      };
      G.medidor(cv, m, cfgs[cv.dataset.medidor] || {});
    });
  }

  /* ============================================================
     TELA — AGORA
     ============================================================ */
  function telaAgora() {
    const d = U.DB.load();
    const sit = DS.situacao();
    const dec = sit.proxima;
    const rec = sit.recuperacao;
    const fase = CT.FASES[sit.fase];
    const p = MD.painel();
    const esp = U.CI.sessoesHoje();

    const acao = dec ? dec.acao : null;
    const rotulo = !acao ? '—'
      : acao.tipo === 'prova' ? 'Fazer a Prova'
      : acao.tipo === 'retencao' ? 'Fazer o teste de retenção'
      : acao.tipo === 'hud' ? 'Abrir a aba HUD'
      : acao.tipo === 'parar' ? 'Entendi'
      : 'Começar';

    return `
    <div class="topo">
      <h1>◈ ESPELHO</h1>
      <span class="tag vio">${fase.nome}</span>
      <div class="espaco"></div>
      <span class="sub">${d.legado ? 'v5 · dados anteriores preservados' : 'v5'}</span>
    </div>
    <div class="rolagem pilha">

      <div class="painel hero">
        <div class="mini" style="color:var(--gold);font-weight:800;letter-spacing:.08em;text-transform:uppercase">O que fazer agora</div>
        <h2 class="heroT">${dec ? dec.titulo : 'Nada pendente'}</h2>
        <div class="mini" style="margin-top:4px">${dec ? dec.porque : ''}</div>
        <div class="flex wrap" style="gap:6px;margin-top:8px">
          <span class="tag">regra <code>${dec ? dec.regra : '—'}</code></span>
          <span class="tag ${NIVEL_CLASSE[dec ? dec.confianca : ''] || ''}">confiança: ${dec ? S.rotuloNivel(dec.confianca) : '—'}</span>
          ${acao && acao.drill ? `<span class="tag">dificuldade ${acao.dif.toFixed(1)}</span>` : ''}
        </div>
        <div class="flex" style="margin-top:10px;gap:8px">
          <button class="btn" style="flex:2" id="ir-agora">${rotulo}</button>
          <button class="btn sec" style="flex:1" id="ir-sessao">Sessão inteira</button>
        </div>
        <div class="xs" style="margin-top:6px">${fase.objetivo}</div>
      </div>

      <div class="painel">
        <h2>Quanto da sua Jing voltou</h2>
        <div class="aviso ${rec.estado === 'recuperado' ? 'ok' : rec.estado === 'medindo' ? '' : ''}">${rec.texto}</div>
        ${rec.pct != null ? `<div class="flex" style="gap:10px;margin-top:8px;align-items:center">
          <div class="numero" style="font-size:1.6rem">${rec.pct}<span class="de">%</span></div>
          <div class="mini" style="flex:1">da rota de referência volta no dia seguinte, sem ajuda.
          Intervalo ${rec.lo}–${rec.hi}% em ${rec.n} tentativas.
          ${rec.base != null && rec.base !== rec.pct ? `Primeira medição: ${rec.base}%.` : ''}</div>
        </div>` : ''}
      </div>

      ${sit.fadiga.estado === 'alta' || sit.fadiga.estado === 'moderada' ? `<div class="aviso ${sit.fadiga.estado === 'alta' ? 'bad' : ''}">
        <b>Qualidade da sessão:</b> ${sit.fadiga.txt}
        <div><button class="btn sec sm" style="margin-top:7px;min-height:34px" data-princ="fadiga">como isso é estimado</button></div>
      </div>` : ''}

      ${esp >= 2 ? `<div class="aviso ${esp >= 3 ? 'bad' : ''}">
        <b>${esp}ª sessão hoje.</b> Com o mesmo tempo total, sessões espalhadas em dias diferentes retêm muito
        mais que empilhadas num dia.
        <div><button class="btn sec sm" style="margin-top:7px;min-height:34px" data-princ="espacamento">por quê</button></div>
      </div>` : ''}

      <div class="painel">
        <h2>Suas medidas</h2>
        ${cartoesMedidas(p)}
      </div>

      ${sit.coletando.length ? `<div class="painel">
        <h2>O que o sistema ainda NÃO sabe</h2>
        <div class="mini" style="margin-bottom:6px">Isto não é falha: é o estado honesto da amostra. Doze
        tentativas não são uma medida, e o sistema é proibido de decidir com base nas linhas abaixo.</div>
        <div class="pilha" style="gap:5px">
          ${sit.coletando.map(m => `<div class="mini">• <b>${m.nome}</b> —
            ${m.n} tentativa${m.n === 1 ? '' : 's'} (${S.rotuloNivel(m.nivel)}). ${m.pergunta}</div>`).join('')}
        </div>
        <button class="btn sec sm full" id="ir-prova" style="margin-top:9px">Fazer a Prova — é o que preenche isso</button>
      </div>` : ''}
    </div>`;
  }

  function depoisAgora() {
    desenharMedidores($('#tela-agora'));
    const sit = DS.situacao();
    const dec = sit.proxima;
    $('#ir-agora')?.addEventListener('click', () => {
      if (!dec) return;
      const a = dec.acao;
      if (a.tipo === 'hud') return ir('hud');
      if (a.tipo === 'parar') return toast('Recomendação registrada');
      if (a.tipo === 'prova') return U.T.iniciarProva();
      if (a.tipo === 'retencao') return U.T.iniciarRetencao();
      const dr = D.porId(a.drill); if (dr) U.T.abrirBloco(dr, a.dif);
    });
    $('#ir-sessao')?.addEventListener('click', () => U.T.sessaoGuiada());
    $('#ir-prova')?.addEventListener('click', () => U.T.iniciarProva());
    $$('#tela-agora [data-princ]').forEach(b => b.addEventListener('click', () => verPrincipio(b.dataset.princ)));
  }

  /* ============================================================
     TELA — PROGRESSO
     ============================================================ */
  function telaProgresso() {
    const d = U.DB.load();
    const ret = MD.retencao();
    const exec = MD.execucao();
    const curva = MD.curvaLeitura();
    const erros = MD.perfilErros({ dias: 30 });
    const temAlgo = d.tentativas.length > 0;

    if (!temAlgo) {
      return `<div class="topo"><h1>▤ Progresso</h1><div class="espaco"></div>
        <span class="sub">nenhuma tentativa registrada</span></div>
      <div class="rolagem pilha">
        <div class="painel frag">
          <h2>Ainda não há nada para mostrar — e isso é informação</h2>
          <div class="mini">Esta tela separa o que você <b>aprendeu</b> do que apenas executou bem no dia.
          As duas coisas se parecem durante o treino e divergem no dia seguinte, que é quando a primeira
          aparece e a segunda some.</div>
          <div class="sep"></div>
          <div class="mini"><b>O que vai aparecer aqui</b></div>
          <div class="pilha" style="gap:5px;margin-top:5px">
            <div class="mini">• <b>Retenção</b> — quanto da rota volta sem ajuda, um dia depois. A medida que conta.</div>
            <div class="mini">• <b>Limiar de execução</b> — o tempo de rota que você sustenta, em ms.</div>
            <div class="mini">• <b>Leitura por janela</b> — a partir de quanta informação você ainda decide certo.</div>
            <div class="mini">• <b>Onde os erros caem</b> — layout, sequência, pressa, leitura ou freio.</div>
          </div>
          <button class="btn full gold" id="ir-prova2" style="margin-top:10px">Fazer a Prova — é o que cria a linha de base</button>
        </div>
        ${blocoPartidas(d)}
        ${d.legado ? blocoLegado(d) : ''}
      </div>`;
    }

    return `
    <div class="topo"><h1>▤ Progresso</h1><div class="espaco"></div>
      <span class="sub">${d.tentativas.length} tentativas · ${d.provas.length} prova${d.provas.length === 1 ? '' : 's'}</span></div>
    <div class="rolagem pilha">

      <div class="painel">
        <h2>Retenção — a medida que conta</h2>
        <div class="mini" style="margin-bottom:7px">Proporção da rota de referência que volta no dia seguinte,
        sem ajuda. A faixa clara é o intervalo de confiança: quando ela é larga, a amostra ainda é pequena e
        a subida ou descida pode ser só ruído.</div>
        <canvas class="graf" id="g-ret" data-h="150"></canvas>
        <div class="mini" style="margin-top:6px">
          ${ret.nivel === 'insuficiente'
            ? `Ainda sem estimativa (${ret.n} tentativas). ${S.MIN.proporcao.explorar - ret.n > 0 ? `Faltam ${S.MIN.proporcao.explorar - ret.n}.` : ''}`
            : `<b>${ret.v}%</b> (intervalo ${ret.lo}–${ret.hi}%, ${ret.n} tentativas, ${S.rotuloNivel(ret.nivel)}).
               ${ret.tendencia === 'sobe' ? 'A série está subindo.'
                 : ret.tendencia === 'desce' ? '<b>A série está descendo.</b>'
                 : 'A série está estável — ou a amostra ainda não permite dizer.'}`}
        </div>
      </div>

      <div class="grade g2" style="align-items:start">
        <div class="painel">
          <h2>Limiar de execução</h2>
          <div class="mini" style="margin-bottom:6px">O tempo de rota que você sustenta com o acerto no alvo.
          Menor é melhor. Só entram sets em que a dificuldade parou de se mexer.</div>
          <canvas class="graf" id="g-lim" data-h="140"></canvas>
          <div class="mini" style="margin-top:5px">${exec.nivel === 'insuficiente'
            ? 'Nenhum set estabilizou ainda. Isso leva alguns sets do exercício Rota.'
            : `<b>${exec.v} ms</b> (intervalo ${exec.lo}–${exec.hi}, ${exec.n} sets estáveis).`}</div>
        </div>
        <div class="painel">
          <h2>Leitura por janela</h2>
          <div class="mini" style="margin-bottom:6px">Acerto por quantidade de informação. O ponto dourado é a
          janela fixa de 300 ms — a única comparável entre sessões.</div>
          <canvas class="graf" id="g-oclu" data-h="155"></canvas>
        </div>
      </div>

      <div class="painel">
        <h2>Onde os erros caem</h2>
        <div class="mini" style="margin-bottom:6px">Últimos 30 dias. A barra fina é o intervalo: com poucos erros
        no total, a composição varia muito de sessão para sessão.</div>
        <canvas class="graf" id="g-err"></canvas>
        ${erros.total ? `<div class="mini" style="margin-top:6px">
          <b>${erros.itens[0].nome}</b> é o mais frequente. ${erros.itens[0].acao}</div>` : ''}
      </div>

      ${blocoPartidas(d)}

      <div class="painel">
        <h2>Sessões</h2>
        <div class="pilha" style="gap:5px">
          ${d.sessoes.slice().reverse().slice(0, 10).map(s => `<div class="item">
            <div class="ic">${s.blocos.some(b => b.mo === 'prova') ? '◎' : '◈'}</div>
            <div class="txt"><b>${U.dateTime(s.t)}</b><span>${s.blocos.length} blocos
              ${s.fadiga && s.fadiga.estado === 'alta' ? '· terminou com fadiga alta' : ''}</span></div>
            <span class="tag">${U.dur((s.fim || s.t) - s.t)}</span>
          </div>`).join('')}
        </div>
      </div>

      ${d.legado ? blocoLegado(d) : ''}
    </div>`;
  }

  function blocoLegado(d) {
    const L = d.legado;
    return `<div class="painel">
      <h2>Histórico da versão 1</h2>
      <div class="mini">Guardado e não apagado: ${L.sets.length} sets e ${L.sessoes.length} sessões da versão
      anterior.<br><b>Não entra nos gráficos acima de propósito.</b> A V1 media com outro instrumento e sem
      condição de referência fixa; juntar as duas séries produziria uma tendência falsa — que é justamente o
      erro que esta versão existe para corrigir.</div>
      <button class="btn sec sm full" id="ver-legado" style="margin-top:8px">Ver o que ficou guardado</button>
    </div>`;
  }

  function blocoPartidas(d) {
    const ps = d.partidas || [];
    const cortes = ps.length >= 6 ? analisarPartidas(ps) : null;
    return `<div class="painel">
      <h2>Partidas de verdade</h2>
      <div class="mini">Nenhum sistema como este consegue provar que melhora o seu jogo — a transferência de
      treino auxiliar para partida é uma lacuna aberta na literatura. O que dá para fazer é você anotar o que
      aconteceu e o próprio sistema comparar, avisando que é observação sua e não experimento.
      <div><button class="btn sec sm" style="margin-top:7px;min-height:34px" data-princ="transferencia">o que a literatura diz</button></div></div>
      <button class="btn sec sm full" id="add-partida" style="margin-top:9px">Registrar uma partida</button>
      ${ps.length ? `<div class="sep"></div>
        <div class="mini"><b>${ps.length} partidas registradas</b></div>
        ${cortes ? `<div class="aviso ${cortes.distinguivel ? 'ok' : ''}" style="margin-top:6px">
          Execução que você mesmo notou: <b>${cortes.antes.toFixed(1)}</b> antes → <b>${cortes.depois.toFixed(1)}</b> depois
          (escala 1-5, ${cortes.nAntes} e ${cortes.nDepois} partidas).
          ${cortes.distinguivel
            ? 'A diferença é maior que a variação entre partidas — mas continua sendo a sua própria impressão, não uma medida cega.'
            : 'A diferença ainda não é maior que a variação normal entre partidas. Não dá para chamar isso de melhora.'}
        </div>` : '<div class="mini" style="margin-top:5px">A partir de 6 partidas o sistema compara os períodos.</div>'}
        <div class="pilha" style="gap:4px;margin-top:7px">
          ${ps.slice().reverse().slice(0, 5).map(x => `<div class="mini">
            ${U.dateShort(x.t)} · ${x.res === 'v' ? '<span style="color:var(--ok)">vitória</span>' : '<span style="color:var(--bad)">derrota</span>'}
            · execução ${x.exec}/5 · decisão ${x.dec}/5${x.obs ? ` · <span class="xs">${x.obs}</span>` : ''}</div>`).join('')}
        </div>` : ''}
    </div>`;
  }

  function analisarPartidas(ps) {
    const meio = Math.floor(ps.length / 2);
    const a = ps.slice(0, meio), b = ps.slice(meio);
    const mA = U.mean(a.map(x => x.exec)), mB = U.mean(b.map(x => x.exec));
    const icA = S.mediaIC(a.map(x => x.exec)), icB = S.mediaIC(b.map(x => x.exec));
    const dist = icA.hi != null && icB.lo != null && (icB.lo > icA.hi || icA.lo > icB.hi);
    return { antes: mA, depois: mB, nAntes: a.length, nDepois: b.length, distinguivel: dist };
  }

  function depoisProgresso() {
    const d = U.DB.load();
    if ($('#g-ret')) {
      const ret = MD.retencao();
      const pts = (ret.serie || []).map(x => {
        const w = S.wilson(Math.round(x.p * x.n), x.n);
        return { rot: U.dateShort(x.t), v: +(w.p * 100).toFixed(0),
                 lo: +(w.lo * 100).toFixed(0), hi: +(w.hi * 100).toFixed(0), n: x.n };
      });
      G.linhaIC($('#g-ret'), pts, { max: 100, piso: 70, pisoTxt: 'piso de 70%', nome: 'retenção',
                                    fmt: v => Math.round(v) + '%', vazio: 'nenhum teste de retenção ainda' });
    }
    if ($('#g-lim')) {
      const ex = MD.execucao();
      const pts = (ex.porSet || []).map(x => ({ rot: U.dateShort(x.t), v: x.ms, n: x.n }));
      G.linhaIC($('#g-lim'), pts, { nome: 'limiar', fmt: v => Math.round(v) + 'ms',
                                    min: 0, vazio: 'nenhum set estabilizado ainda', cor: G.T.serie[2] });
    }
    if ($('#g-oclu')) G.curvaIC($('#g-oclu'), MD.curvaLeitura(), { ref: 300 });
    if ($('#g-err')) {
      const e = MD.perfilErros({ dias: 30 });
      G.barrasIC($('#g-err'), e.itens.map(x => ({
        nome: x.nome, p: x.p, lo: x.lo, hi: x.hi, n: x.n,
        status: x.id === 'layout' ? 'critico' : null, acao: x.acao,
      })));
    }
    $('#add-partida')?.addEventListener('click', formPartida);
    $('#ir-prova2')?.addEventListener('click', () => U.T.iniciarProva());
    $('#ver-legado')?.addEventListener('click', () => {
      const L = U.DB.load().legado;
      modal(`<h2 style="margin:0 0 8px">Histórico da v1</h2>
        <div class="mini">${L.sessoes.length} sessões, ${L.sets.length} sets, nível ${L.nivel || '—'}.
        ${L.diagnostico ? 'Diagnóstico inicial preservado.' : ''}
        ${L.ssrt && L.ssrt.length ? `${L.ssrt.length} medições de freio pelo método antigo.` : ''}</div>
        <div class="sep"></div>
        <div class="mini">Está tudo no backup exportável em Config. Não entra nas medidas novas porque foi
        colhido com outro instrumento — misturar séries de instrumentos diferentes é a forma mais comum de
        inventar uma tendência que não existe.</div>
        <button class="btn full sm" style="margin-top:12px" data-fecha>Fechar</button>`);
    });
    $$('#tela-progresso [data-princ]').forEach(b => b.addEventListener('click', () => verPrincipio(b.dataset.princ)));
  }

  function formPartida() {
    const nota = (id, lbl) => `<div class="mini" style="margin-top:8px"><b>${lbl}</b></div>
      <div class="flex" style="gap:5px;margin-top:4px">
        ${[1, 2, 3, 4, 5].map(v => `<button class="btn sec sm nota" data-g="${id}" data-v="${v}" style="flex:1">${v}</button>`).join('')}
      </div>`;
    modal(`
      <h2 style="margin:0 0 4px">Registrar partida</h2>
      <div class="mini">Anote logo depois de jogar, enquanto lembra. Impressão sua é dado fraco — mas é o único
      dado de partida que existe aqui, e o sistema trata como tal.</div>
      <div class="mini" style="margin-top:9px"><b>Resultado</b></div>
      <div class="flex" style="gap:6px;margin-top:4px">
        <button class="btn sec sm nota" data-g="res" data-v="v" style="flex:1">Vitória</button>
        <button class="btn sec sm nota" data-g="res" data-v="d" style="flex:1">Derrota</button>
      </div>
      ${nota('exec', 'Execução: os combos saíram como você queria? (1 a 5)')}
      ${nota('dec', 'Decisão: você entrou e saiu na hora certa? (1 a 5)')}
      <div class="mini" style="margin-top:9px"><b>O que mais te atrapalhou</b> (opcional)</div>
      <input id="p-obs" class="campo" maxlength="60" placeholder="ex: errei a ultimate duas vezes">
      <div class="flex" style="margin-top:12px;gap:8px">
        <button class="btn sec full sm" data-fecha>Cancelar</button>
        <button class="btn full sm" id="salvar-partida">Salvar</button>
      </div>`,
      (cx) => {
        const sel = { res: null, exec: null, dec: null };
        cx.querySelectorAll('.nota').forEach(b => b.addEventListener('click', () => {
          const g = b.dataset.g;
          sel[g] = b.dataset.v;
          cx.querySelectorAll(`.nota[data-g="${g}"]`).forEach(o => o.classList.toggle('sec', o !== b));
        }));
        cx.querySelector('#salvar-partida').addEventListener('click', () => {
          if (!sel.res || !sel.exec || !sel.dec) return toast('Faltou preencher');
          const d = U.DB.load();
          d.partidas.push({ t: Date.now(), res: sel.res, exec: +sel.exec, dec: +sel.dec,
                            obs: (cx.querySelector('#p-obs').value || '').slice(0, 60) });
          if (d.partidas.length > 300) d.partidas = d.partidas.slice(-300);
          U.DB.save(); fecharModal(); toast('Partida registrada', 'ok'); render('progresso');
        });
      });
  }

  /* ============================================================
     TELA — HUD
     ============================================================ */
  function telaHud() {
    const hud = H.getHud();
    const a = H.analisarHud(hud);
    const al = H.analisarAlcance(hud);
    const d = U.DB.load();
    const fit = fittsAjuste();
    const disp = dispersaoToques();
    const erros = MD.perfilErros({ dias: 21 });
    const layout = erros.itens.find(x => x.id === 'layout');
    const riscos = a.riscos.filter(r => r.critico).slice(0, 4);

    return `
    <div class="topo"><h1>✥ Seu HUD</h1><div class="espaco"></div>
      <span class="sub">${a.telaMM.w.toFixed(0)} × ${a.telaMM.h.toFixed(0)} mm · Poco X7 Pro</span></div>
    <div class="rolagem pilha">

      ${!d.hudConferido ? `<div class="aviso bad">
        <b>Confirme que a réplica bate com o seu jogo.</b> Todos os números do sistema saem de toques sobre
        ela. Se um botão estiver fora do lugar, tudo depois mede a coisa errada.
        <div class="flex" style="gap:8px;margin-top:8px">
          <button class="btn sm" id="confere-ok">Está igual ao meu jogo</button>
          <button class="btn sec sm" id="confere-cal">Preciso ajustar</button>
        </div>
      </div>` : ''}

      <div class="painel">
        <h2>Mapa medido do seu print</h2>
        <canvas id="mapacv"></canvas>
        <div class="leg" style="justify-content:center">
          <span><i style="background:#e8c46a"></i>habilidades</span>
          <span><i style="background:#9fb6d4"></i>ataque</span>
          <span><i style="background:#d03b3b"></i>corredor de risco</span>
        </div>
        <div class="flex" style="margin-top:8px;gap:8px">
          <button class="btn sec sm" id="calibrar">Calibrar arrastando</button>
          <button class="btn sec sm" id="resetHud">Voltar ao original</button>
        </div>
      </div>

      <div class="painel frag">
        <h2>O que o layout impõe</h2>
        <div class="aviso bad">
          <b>1. O corredor Hab.1 → Ataque está congestionado.</b><br>
          É o trajeto mais percorrido do jogo (${H.percurso(hud, 's1', 'aa').toFixed(1)} mm) e
          ${a.corredor.length ? `a borda do <b>${H.NOMES[a.corredor[0].k]}</b> fica a
          <b>${a.corredor[0].dist <= 0.2 ? 'zero mm — encostada na linha' : a.corredor[0].dist.toFixed(1) + ' mm'}</b>.`
          : 'ele está limpo.'}
          Um polegar cobre um círculo de 9 a 13 mm.<br>
          <b>Ação:</b> afastar o item uns 4 mm. É o único ajuste que eu recomendo fazer agora.
        </div>
        <div class="aviso" style="margin-top:7px">
          <b>2. Hab.1 → Ultimate são ${a.arco.toFixed(1)} mm</b> — a maior distância do layout e a mecânica que
          mais enferruja numa pausa, porque depende de movimento amplo e não de toque.<br>
          <b>Ação:</b> não mexer. Isto é treino, não configuração.
        </div>
        ${riscos.length ? `<div class="aviso" style="margin-top:7px">
          <b>3. Folga pequena entre bordas:</b>
          ${riscos.map(r => `${H.NOMES[r.a]} ↔ ${H.NOMES[r.b]} <b>${r.folga.toFixed(1)}mm</b>`).join(' · ')}.
          O sistema já separa esses toques como erro de layout e não conta contra a sua memória.
        </div>` : ''}
        <div class="aviso ${layout && layout.lo >= 0.35 ? 'bad' : 'ok'}" style="margin-top:7px">
          <b>4. Quanto dos seus erros é layout:</b>
          ${layout ? `${Math.round(layout.p * 100)}% (intervalo ${Math.round(layout.lo * 100)}–${Math.round(layout.hi * 100)}%, ${erros.total} erros).
            ${layout.lo >= 0.35 ? 'Alto o bastante para o treinador mandar você mexer no HUD antes de treinar.'
              : 'Dentro do normal — o problema atual não é o layout.'}`
          : 'Sem erros registrados ainda.'}
        </div>
      </div>

      <div class="painel">
        <h2>Alcance do polegar</h2>
        <div class="mini" style="margin-bottom:7px">Heurística, e declarada como tal: o polegar direito gira em
        torno de um ponto perto do canto inferior direito. Longe demais exige trocar a pegada; perto demais
        exige dobrar. <b>Isto sozinho não conclui nada</b> — vira conclusão só quando coincide com dispersão
        alta nos seus próprios toques.</div>
        <table class="tab"><thead><tr><th>Botão</th><th>Extensão</th><th>Zona</th><th>Seus toques</th></tr></thead><tbody>
        ${al.itens.map(x => `<tr>
          <td class="forte">${x.nome}</td>
          <td>${x.mm.toFixed(0)} mm</td>
          <td>${{ confortavel: '<span style="color:var(--ok)">confortável</span>',
                  esticado: '<span style="color:var(--warn)">esticado</span>',
                  troca_pegada: '<span style="color:var(--bad)">troca a pegada</span>',
                  dobrado: '<span style="color:var(--warn)">muito dobrado</span>' }[x.zona]}</td>
          <td>${x.dispersao != null ? `±${Math.round(x.dispersao * 100)}% <span class="xs">(${x.nToques})</span>`
                                    : '<span class="xs">sem dados</span>'}</td>
        </tr>`).join('')}
        </tbody></table>
        ${al.suspeitos.length ? `<div class="aviso" style="margin-top:8px">
          <b>Limitado pelo alcance, não por treino:</b>
          ${al.suspeitos.map(x => `<b>${x.nome}</b> (${x.mm.toFixed(0)}mm, dispersão ±${Math.round(x.dispersao * 100)}%)`).join(', ')}.
          Treinar mais não conserta distância física — aproximar o botão sim.
        </div>` : `<div class="mini" style="margin-top:7px">Nenhum botão junta extensão desconfortável
          <b>e</b> dispersão alta. Sem essa coincidência, não dá para culpar o alcance.</div>`}
      </div>

      ${fit && fit.valido ? `<div class="painel">
        <h2>Layout ou habilidade?</h2>
        <div class="mini" style="margin-bottom:6px">A linha tracejada é o que o seu layout impõe. Em cima dela =
        limite do HUD. Acima dela = treino sobrando.</div>
        <canvas class="graf" id="g-fitts" data-h="180"></canvas>
        ${(() => {
          const acima = fit.pontos.filter(x => x.z > 0.9).sort((a2, b2) => b2.resid - a2.resid);
          return acima.length
            ? `<div class="aviso" style="margin-top:8px"><b>Treine estes trajetos</b> —
               ${acima.slice(0, 3).map(x => `<b>${x.rotulo}</b> (+${Math.round(x.resid)}ms)`).join(', ')}.</div>`
            : `<div class="aviso ok" style="margin-top:8px">Nenhum trajeto muito acima da reta. O tempo que
               sobra é do layout — o que dá para ganhar aqui é mexendo no HUD.</div>`;
        })()}
        <div class="xs" style="margin-top:5px">${fit.n} trajetos · ${fit.amostras} toques · R² ${fit.r2.toFixed(2)}</div>
      </div>` : `<div class="painel">
        <h2>Layout ou habilidade? — ainda coletando</h2>
        <div class="mini">Para separar limite do HUD de limite seu preciso de 5 trajetos com 25 toques no total
        e inclinação positiva${fit ? ` (tenho ${fit.n} trajetos e ${fit.amostras} toques)` : ''}.
        Um ou dois sets de <b>Ancoragem</b> resolvem.</div>
      </div>`}

      ${disp.length ? `<div class="painel">
        <h2>Onde o seu dedo cai</h2>
        <div class="mini" style="margin-bottom:6px">Cada ponto é um toque seu, medido dentro do botão. Centro
        deslocado é erro sistemático de mira — corrige-se mirando o lado oposto, não treinando mais.</div>
        <canvas class="graf" id="g-toq" data-h="170"></canvas>
      </div>` : ''}

      ${laboratorio()}
    </div>`;
  }

  /* ============================================================
     LABORATÓRIO DO POLEGAR
     Tudo o que sai da medição em milímetros: o mapa da tela, a
     nuvem de cada botão, o pivô estimado, os trajetos caros e o
     layout que a conta propõe.
     ============================================================ */
  function laboratorio() {
    const TQ = U.TQ, OT = U.OT, PR = U.PR;
    if (!TQ) return '';
    const hud = H.getHud();
    const res = TQ.resumo({});
    const mapa = TQ.mapaCalor({});
    const lim = TQ.MIN;
    const ef = OT ? OT.efeitoDaMudanca() : { ok: false };
    const tc = PR ? PR.trajetosCaros({}) : { ok: false, itens: [] };
    const esq = PR ? PR.curvaEsquecimento({}) : { ok: false };

    return `
      <div class="painel hero">
        <div class="mini" style="color:var(--gold);font-weight:800;letter-spacing:.08em;text-transform:uppercase">Laboratório do polegar</div>
        <h2 class="heroT" style="margin-top:2px">${res.n} toques medidos em milímetro</h2>
        <div class="mini" style="margin-top:4px">A versão anterior guardava o toque como fração do raio do
        botão, o que muda de significado quando o botão muda de tamanho. Agora cada toque guarda posição
        absoluta na tela, deslocamento em <b>mm</b>, tamanho do contato do dedo, de onde o dedo veio e quanto
        tempo levou. É isso que permite responder "onde eu de fato toco" em vez de só "quanto errei do centro".
        ${res.dedoMM ? `<br><br>O seu contato mede cerca de <b>${(res.dedoMM).toFixed(1)} mm</b> de raio médio —
        medido, não suposto. É a régua que decide se dois botões estão longe o bastante um do outro.` : ''}</div>
      </div>

      <div class="painel">
        <h2>Onde você mais toca — a tela inteira</h2>
        <div class="mini" style="margin-bottom:6px">Densidade dos seus toques sobre a réplica. Não é contagem
        por botão: é a tela toda, e é assim que aparece quando você bate sistematicamente ao lado de um botão
        em vez de dentro dele.</div>
        ${mapa.ok
          ? `<canvas class="graf" id="g-calor" data-h="250"></canvas>`
          : `<div class="aviso">Faltam <b>${mapa.falta}</b> toques para o mapa sair. Um set de Ancoragem resolve.</div>`}
      </div>

      ${res.retratos.length ? `<div class="painel">
        <h2>A nuvem de cada botão</h2>
        <div class="mini" style="margin-bottom:6px">A elipse contém 95% dos seus toques naquele botão. A seta
        só aparece quando o deslocamento do centro é <b>real</b> — testado, não olhado. Nuvem grande se
        conserta treinando ou com botão maior; centro deslocado se conserta <b>movendo o botão</b>. São
        problemas diferentes e é por isso que são dois desenhos.</div>
        <canvas class="graf" id="g-nuvem" data-h="250"></canvas>
        ${res.comVies.length ? `<div class="aviso" style="margin-top:8px">
          <b>Deslocamento sistemático detectado:</b>
          ${res.comVies.slice(0, 3).map(r => `${r.nome} <b>${r.vies.mm.toFixed(1)} mm</b> para ${r.vies.x > 0 ? 'a direita' : 'a esquerda'}${Math.abs(r.vies.y) > 0.5 ? ` e ${r.vies.y > 0 ? 'para baixo' : 'para cima'}` : ''}`).join(' · ')}.
          Isto não é falta de treino: é o botão não estar onde o seu dedo acha que ele está.</div>` : ''}
        ${res.piorRisco ? `<div class="aviso bad" style="margin-top:7px">
          <b>Risco de tocar o vizinho:</b> em <b>${res.piorRisco.nome}</b>, ${Math.round(res.piorRisco.p * 100)}% dos
          seus toques cairiam mais perto de outro botão${res.piorRisco.pior ? ` (normalmente <b>${H.NOMES[res.piorRisco.pior.id] || res.piorRisco.pior.id}</b>)` : ''}.
          </div>` : ''}
      </div>` : ''}

      ${res.pivo.ok ? `<div class="painel">
        <h2>Onde o seu polegar gira</h2>
        <div class="mini">O pivô do polegar não está mais escrito no código: sai dos seus dados. O
        deslocamento de cada botão aponta ao longo da linha que liga o botão ao ponto em torno do qual o dedo
        gira, e o pivô é o ponto que melhor explica todos eles ao mesmo tempo.
        <br><br>Estimado a partir de <b>${res.pivo.botoes} botões</b> e ${res.pivo.n} toques, com incerteza de
        <b>±${res.pivo.incertezaMM.toFixed(0)} mm</b>. Fica <b>${res.pivo.desvioDoPadrao.toFixed(0)} mm</b> do
        ponto que a versão anterior supunha.
        ${!res.pivo.confiavel ? '<br><b>Ainda não é confiável o bastante</b> para eu usar em conta nenhuma — precisa de mais botões com deslocamento mensurável.' : ''}</div>
      </div>` : ''}

      ${tc.ok && tc.itens.length ? `<div class="painel">
        <h2>Trajetos que custam mais do que deviam</h2>
        <div class="mini" style="margin-bottom:6px">O traço vertical é o tempo que a distância entre os dois
        botões pede, pela sua própria reta. A barra é o que você leva. Quando a barra passa do traço com
        folga, aquele pedaço não é limite físico — é pedaço mal aprendido, e repetição rende nele.</div>
        <canvas class="graf" id="g-traj" data-h="${Math.min(170, 26 + tc.itens.length * 20)}"></canvas>
        <div class="aviso" style="margin-top:8px">${tc.texto}</div>
      </div>` : tc.motivo ? `<div class="painel">
        <h2>Trajetos que custam mais do que deviam</h2>
        <div class="mini">${tc.motivo}.</div>
      </div>` : ''}

      ${esq.ok ? `<div class="painel">
        <h2>A sua curva de esquecimento</h2>
        <div class="mini" style="margin-bottom:6px">Acerto na rota de referência contra as horas desde o
        último treino. Não é uma curva de livro: é a sua, medida em ${esq.n} tentativas.</div>
        <canvas class="graf" id="g-esq" data-h="150"></canvas>
        <div class="aviso ${esq.estado === 'agora' ? 'ok' : esq.estado === 'tarde' ? '' : ''}" style="margin-top:8px">
          ${esq.texto}
          ${esq.horasDesde != null ? `<br><br>Agora faz <b>${Math.round(esq.horasDesde)} h</b> desde o último
          treino de rota — ${esq.estado === 'cedo' ? 'ainda é cedo: revisar agora é fácil demais e rende menos'
            : esq.estado === 'agora' ? '<b>a janela está aberta</b>'
            : 'já passou da janela, então hoje vai ser mais reaprender que fixar'}.` : ''}
        </div>
      </div>` : ''}

      <div class="painel">
        <h2>O HUD que sai dos seus dados</h2>
        <div id="otim-area">
          <div class="mini">Com a sua nuvem de toque, o seu contato, a sua reta de tempo por distância e os
          trajetos que você realmente faz, dá para procurar um arranjo de botões com menos tempo de percurso
          e menos risco de tocar o vizinho.
          <br><br><b>O que isto não é:</b> não é promessa de que você vai jogar melhor. É a minimização de um
          custo modelado, e o modelo é meu. O que ele não sabe, ele não inventa — e depois que você aplicar,
          o sistema mede o efeito de verdade no seu tempo de rota e te conta.</div>
          <button class="btn full sm" id="btn-otim" style="margin-top:10px">Procurar um layout melhor</button>
        </div>
      </div>

      ${ef.ok ? `<div class="painel">
        <h2>A última mudança de HUD valeu?</h2>
        <div class="aviso ${ef.real && ef.delta < 0 ? 'ok' : ef.real ? 'bad' : ''}">${ef.texto}</div>
        <div class="xs" style="margin-top:5px">${ef.nAntes} sets antes (${Math.round(ef.antes)} ms) ·
          ${ef.nDepois} sets depois (${Math.round(ef.depois)} ms) · mudança feita em ${U.dateShort(ef.desde)}</div>
      </div>` : (U.DB.load().hudMudouEm ? `<div class="painel">
        <h2>A última mudança de HUD valeu?</h2>
        <div class="mini">${ef.motivo}. É a única resposta honesta sobre a mudança, e ela só existe depois de
        treinar com o layout novo.</div>
      </div>` : '')}`;
  }

  function fittsAjuste() {
    const hud = H.getHud(), pares = U.DB.load().pares || {};
    const pts = [];
    for (const k in pares) {
      const e = pares[k];
      if (e.n < 2) continue;
      const [a, b] = k.split('>');
      if (!hud[a] || !hud[b]) continue;
      pts.push({ id: U.CI.indiceDificuldade(H.distMM(hud[a], hud[b]), 2 * hud[b].r * H.TELA_MM.w),
                 mt: e.med, n: e.n, rotulo: `${hud[a].curto}→${hud[b].curto}` });
    }
    const aj = U.CI.ajusteFitts(pts);
    if (!aj) return null;
    aj.amostras = pts.reduce((s, x) => s + x.n, 0);
    aj.valido = aj.n >= 5 && aj.amostras >= 25 && aj.b > 0 && aj.r2 >= 0.25;
    return aj;
  }
  function dispersaoToques() {
    const t = U.DB.load().toques || {};
    return Object.entries(t).filter(([, v]) => v.length >= 5)
      .map(([id, pontos]) => ({ id, nome: (H.getHud()[id] || {}).curto || id, pontos }));
  }

  let mapaSurf = null;
  function depoisHud() {
    const cv = $('#mapacv');
    if (cv) {
      mapaSurf && mapaSurf.destroy();
      mapaSurf = new H.HudSurface(cv, { semRegistro: true, onCalibrado: () => toast('HUD atualizado', 'ok') });
      const orig = mapaSurf.draw.bind(mapaSurf);
      mapaSurf.draw = function () {
        orig();
        const c = this.ctx, B = this.box, hud = this.hud;
        const A = this.px(hud.s1), Z = this.px(hud.aa), S3 = this.px(hud.s3);
        c.save();
        c.strokeStyle = 'rgba(208,59,59,.55)'; c.lineWidth = Math.max(8, B.h * 0.045);
        c.lineCap = 'round'; c.globalAlpha = .45;
        c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(Z.x, Z.y); c.stroke();
        c.strokeStyle = 'rgba(232,196,106,.5)'; c.lineWidth = 3; c.setLineDash([6, 5]); c.globalAlpha = .8;
        c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(S3.x, S3.y); c.stroke();
        c.restore();
      };
      setTimeout(() => mapaSurf && mapaSurf.resize(), 60);
    }
    $('#confere-ok')?.addEventListener('click', () => {
      U.DB.load().hudConferido = true; U.DB.save(); toast('HUD confirmado', 'ok'); render('hud');
    });
    $('#confere-cal')?.addEventListener('click', () => $('#calibrar').click());
    $('#calibrar')?.addEventListener('click', (e) => {
      if (!mapaSurf) return;
      mapaSurf.calibrando = !mapaSurf.calibrando;
      $('#mapacv').classList.toggle('grande', mapaSurf.calibrando);
      setTimeout(() => mapaSurf && mapaSurf.resize(), 60);
      e.currentTarget.textContent = mapaSurf.calibrando ? 'Concluir calibração' : 'Calibrar arrastando';
      e.currentTarget.classList.toggle('gold', mapaSurf.calibrando);
      if (!mapaSurf.calibrando) {
        U.DB.load().hudConferido = true; U.DB.save();
        toast('Calibração salva', 'ok'); render('hud');
      }
    });
    $('#resetHud')?.addEventListener('click', () => { H.resetHud(); toast('HUD restaurado'); render('hud'); });
    if ($('#g-fitts')) G.fitts($('#g-fitts'), fittsAjuste());
    if ($('#g-toq')) G.toques($('#g-toq'), dispersaoToques());
    desenharLaboratorio();
  }

  function desenharLaboratorio() {
    const TQ = U.TQ, PR = U.PR;
    if (!TQ) return;
    const hud = H.getHud();
    if ($('#g-calor')) {
      const mapa = TQ.mapaCalor({});
      const contagem = {};
      for (const t of TQ.toques({ dias: 90 })) if (t.b) contagem[t.b] = (contagem[t.b] || 0) + 1;
      G.mapaToque($('#g-calor'), mapa, hud, { contagem });
    }
    if ($('#g-nuvem')) {
      const res = TQ.resumo({});
      G.dispersao($('#g-nuvem'), res.retratos, hud);
    }
    if ($('#g-traj') && PR) {
      const tc = PR.trajetosCaros({});
      if (tc.ok) G.trajetos($('#g-traj'), tc.itens);
    }
    if ($('#g-esq') && PR) {
      const e = PR.curvaEsquecimento({});
      if (e.ok) G.curvaIC($('#g-esq'), e.faixas.map(f => ({
        janela: Math.round(f.h), p: f.p, lo: f.lo, hi: f.hi, n: f.n,
      })), { rotX: 'horas desde o último treino de rota →', semAcaso: true,
             /* a faixa só é desenhada quando a janela existe de verdade —
                senão o desenho contradiz o texto logo abaixo dele */
             faixa: !!e.janela, unidade: 'h', oQue: 'depois', xProporcional: true });
    }
    $('#btn-otim')?.addEventListener('click', rodarOtimizador);
  }

  function rodarOtimizador() {
    const area = $('#otim-area');
    if (!area) return;
    area.innerHTML = '<div class="mini">Procurando… isso testa alguns milhares de arranjos.</div>';
    /* fora da pintura, senão a tela trava durante a busca */
    setTimeout(() => {
      let r;
      try { r = U.OT.otimizar({}); } catch (e) { r = { ok: false, motivo: 'erro no cálculo: ' + e.message }; }
      if (!r.ok) {
        area.innerHTML = `<div class="aviso"><b>Ainda não dá.</b> ${r.motivo}.
          <br><br>O que falta se resolve treinando: <b>Ancoragem</b> alimenta a nuvem de cada botão e
          <b>Rota</b> alimenta os trajetos. Nenhum atalho aqui seria honesto — sem esses dados eu estaria
          propondo um layout por chute com casas decimais.</div>`;
        return;
      }
      area.innerHTML = `
        <canvas class="graf" id="g-layout" data-h="250"></canvas>
        <div class="grade g3" style="margin-top:8px">
          <div class="kpi"><div class="v">${r.ganhoMs > 0 ? '−' : '+'}${Math.abs(r.ganhoMs).toFixed(0)}<span class="de">ms</span></div><div class="k">por trajeto</div></div>
          <div class="kpi"><div class="v">${r.mudancas.length}</div><div class="k">botões movidos</div></div>
          <div class="kpi"><div class="v" style="color:${r.folga.depois >= r.folga.min ? 'var(--ok)' : 'var(--warn)'}">${r.folga.depois.toFixed(1)}<span class="de">mm</span></div><div class="k">menor folga (era ${r.folga.antes.toFixed(1)})</div></div>
        </div>
        <div class="aviso" style="margin-top:8px">${r.leitura}</div>
        ${r.apertados.length ? `<div class="aviso ${r.folga.antes < r.folga.min ? 'bad' : ''}" style="margin-top:7px">
          <b>Botões mais apertados que o seu dedo:</b>
          ${r.apertados.slice(0, 3).map(a => `${a.nomeA} ↔ ${a.nomeB} <b>${a.folga.toFixed(1)}mm</b> → ${a.depois.toFixed(1)}mm`).join(' · ')}.
          ${r.contatoMM ? `O seu contato tem ${r.contatoMM.toFixed(1)} mm de raio.` : ''}</div>` : ''}
        ${r.mudancas.length ? `<div class="pilha" style="gap:5px;margin-top:8px">
          ${r.mudancas.slice(0, 6).map(m => `<div class="mini"><b>${m.nome}</b>: ${m.mm.toFixed(1)} mm
            ${Math.abs(m.dx) > 0.4 ? (m.dx > 0 ? 'para a direita' : 'para a esquerda') : ''}
            ${Math.abs(m.dy) > 0.4 ? (m.dy > 0 ? 'para baixo' : 'para cima') : ''}</div>`).join('')}
        </div>` : ''}
        <div class="xs" style="margin-top:6px">Ajustado com ${r.nTrajetos} trajetos e ${r.retratos.length} nuvens de botão.
          A conta de erro usa uma dispersão de pelo menos ${r.sdPiso} mm, porque a sua nuvem foi medida em
          exercício e em luta ela é maior — suposição minha, declarada aqui.</div>
        <div class="flex" style="gap:8px;margin-top:10px">
          <button class="btn sm" id="otim-aplicar">Aplicar este layout</button>
          <button class="btn sec sm" id="otim-fechar">Fechar</button>
        </div>
        <div class="xs" style="margin-top:6px">Aplicar aqui muda a réplica do treino. Você ainda precisa fazer
          a mesma mudança dentro do jogo — e dá para desfazer.</div>`;
      G.layoutComparado($('#g-layout'), r.base, r.hud, r.mudancas);
      $('#otim-aplicar')?.addEventListener('click', () => {
        U.OT.aplicar(r.hud);
        toast('Layout aplicado — o sistema vai medir o efeito', 'ok');
        render('hud');
      });
      $('#otim-fechar')?.addEventListener('click', () => render('hud'));
    }, 30);
  }

  /* ============================================================
     TELA — ESTADO (índice de evolução)
     ============================================================ */
  function telaEstado() {
    const IX = U.IX, GM = U.GM;
    const eixos = IX.calcularEixos();
    const g = IX.global(eixos);
    const hist = U.DB.load().indiceHist || [];
    const ach = GM.achados({});
    const lim = IX.limite({});

    return `
    <div class="topo"><h1>◈ Estado Jing</h1><div class="espaco"></div>
      <span class="sub">${g.eixosUsados || 0} de ${g.total} eixos medidos · ${hist.length} pontos</span></div>
    <div class="rolagem pilha">

      <div class="painel hero">
        <div class="mini" style="color:var(--gold);font-weight:800;letter-spacing:.08em;text-transform:uppercase">Nível de desempenho confiável</div>
        ${g.v == null
          ? `<h2 class="heroT">Ainda não dá</h2><div class="mini" style="margin-top:4px">${g.texto}</div>`
          : `<div class="flex" style="gap:14px;align-items:flex-end;margin-top:2px">
              <div class="numero" style="font-size:2.6rem">${g.v}<span class="de">/100</span></div>
              <div class="mini" style="flex:1;padding-bottom:6px">
                ${g.lo != null ? `intervalo <b>${g.lo}–${g.hi}</b> · ` : ''}${S.rotuloNivel(g.nivel)}
                <br>média simples seria ${g.aritmetica}${g.diferencaParaMedia > 2
                  ? ` — <b>${g.diferencaParaMedia} pontos acima</b>, e é por isso que o índice não é a média` : ''}
              </div>
            </div>
            <div class="mini" style="margin-top:6px">Não é a média das notas: é uma média <b>harmônica</b> ponderada
            pela confiabilidade de cada eixo. Numa luta o desempenho é limitado pelo elo mais fraco — dedo rápido
            não compensa leitura lenta — e a harmônica pune o componente fraco muito mais do que a aritmética
            premia o forte. O peso de cada eixo é a própria confiabilidade dele, não um juízo meu sobre importância.</div>
            ${g.gargalo ? `<div class="aviso" style="margin-top:8px"><b>O que está segurando o índice:</b>
              ${g.puxandoBaixo.map(e => `<b>${e.nome}</b> (${e.nota})`).join(', ') || `<b>${g.gargalo.nome}</b> (${g.gargalo.nota})`}.
              ${g.puxandoCima.length ? `Puxando para cima: ${g.puxandoCima.map(e => `${e.nome} (${e.nota})`).join(', ')}.` : ''}</div>` : ''}`}
      </div>

      ${ach.ativos.length ? `<div class="painel">
        <h2>O que o sistema encontrou em você</h2>
        <div class="mini" style="margin-bottom:7px">Padrões que só existem no cruzamento de duas medidas. Cada um
        traz a amostra que o sustenta — sem amostra, fica listado como suspeita e não dispara exercício.</div>
        <div class="pilha" style="gap:7px">
          ${ach.ativos.map(a => `<div class="aviso ${a.id === 'tradeoff' || a.id === 'decorado' ? 'bad' : ''}">
            <b>${{ tradeoff: 'Troca velocidade × precisão', instavel: 'Acertos instáveis',
                   dica: 'Dependência da dica visual', vies: 'Viés de decisão',
                   perturbacao: 'Perturbação que derruba', decorado: 'Padrão decorado',
                   troca: 'Custo de trocar de plano', confianca: 'Confiança descalibrada' }[a.id] || a.id}</b><br>
            ${a.texto}
            <div class="xs" style="margin-top:3px">${a.n} tentativas${a.alvo ? ` · vira o exercício <code>${a.alvo.drill}</code> com ajuste <code>${a.alvo.ajuste}</code>` : ''}</div>
          </div>`).join('')}
        </div>
        ${(() => { const sp = ach.lista.find(x => x.id === 'perturbacao');
          return sp && sp.poder ? `<div class="xs" style="margin-top:8px"><b>O que eu não consigo ver:</b> ${sp.poder}</div>` : ''; })()}
      </div>` : `<div class="painel">
        <h2>O que o sistema encontrou em você</h2>
        <div class="mini">Nenhum padrão com amostra suficiente ainda.
        ${ach.suspeitas.length ? `Faltam tentativas para: ${ach.suspeitas.map(x => `<b>${x.id}</b> (${x.falta})`).join(', ')}.` : ''}</div>
        ${(() => { const sp = ach.lista.find(x => x.id === 'perturbacao');
          return sp && sp.poder ? `<div class="xs" style="margin-top:8px"><b>E o que eu não consigo ver mesmo com dados:</b> ${sp.poder}</div>` : ''; })()}
      </div>`}

      <div class="painel">
        <h2>Os dez eixos</h2>
        <div class="mini" style="margin-bottom:8px">A nota 0-100 é uma <b>convenção de leitura</b>. O dado é o número
        com unidade embaixo dela. Toda nota nova é puxada na direção da anterior com peso proporcional à amostra —
        é isso que impede uma sessão excepcional de distorcer o nível.</div>
        <div class="grade g2 medidas">
          ${eixos.map(e => cartaoEixo(e)).join('')}
        </div>
      </div>

      ${(() => {
        const comN = hist.filter(x => x.nEixos != null);
        if (comN.length < 4) return '';
        const ini = comN[0].nEixos, fim = comN[comN.length - 1].nEixos;
        if (fim === ini) return '';
        return `<div class="painel"><div class="aviso"><b>Sobre comparar o índice com o do mês passado:</b>
          no começo do histórico ele saía de <b>${ini}</b> eixos e hoje sai de <b>${fim}</b>. Eixo novo entrando
          na conta mexe no número por um motivo que não é o seu desempenho. Para saber o que mudou em você,
          o lugar certo é o eixo, um por um, logo abaixo — cada um é comparado só consigo mesmo.</div></div>`;
      })()}

      ${hist.length >= 3 ? `<div class="painel">
        <h2>Mapa de evolução</h2>
        <div class="mini" style="margin-bottom:6px">Cada coluna é um ponto do histórico; cada linha, um eixo.
        A cor é o <b>estado</b>, e nunca sai de uma comparação entre duas sessões: a mudança precisa passar do erro
        típico da medida, ter tamanho útil, e a soma cumulativa precisa confirmar que é persistente. Toque numa
        célula para ver o ponto.</div>
        <canvas class="graf" id="g-matriz"></canvas>
        <div class="leg" style="margin-top:7px">
          <span><i style="background:${G.COR_ESTADO.evolucao}"></i>evolução</span>
          <span><i style="background:${G.COR_ESTADO.estavel}"></i>estabilidade</span>
          <span><i style="background:${G.COR_ESTADO.suspeita}"></i>queda suspeita</span>
          <span><i style="background:${G.COR_ESTADO.queda}"></i>queda consistente</span>
          <span><i style="background:${G.COR_ESTADO.semDados}"></i>sem dados</span>
        </div>
      </div>` : `<div class="painel"><h2>Mapa de evolução</h2>
        <div class="mini">Aparece a partir de 3 sessões registradas (tenho ${hist.length}). Antes disso qualquer
        linha seria ruído desenhado com capricho.</div></div>`}

      <div class="painel">
        <h2>Seu limite de performance</h2>
        <div class="mini" style="margin-bottom:6px">Onde você é consistente, onde começa a oscilar e onde quebra —
        estimado ajustando acerto contra dificuldade. O ajuste inclui uma <b>taxa de lapso</b>: sem ela, um punhado
        de falhas sem relação com a dificuldade envieza os três números.</div>
        ${lim.ok ? `
          <canvas class="graf" id="g-psico" data-h="185"></canvas>
          <div class="grade g3" style="margin-top:8px">
            <div class="kpi"><div class="v" style="color:var(--ok)">${lim.consistente != null ? lim.consistente.toFixed(1) : '—'}</div><div class="k">consistente</div></div>
            <div class="kpi"><div class="v" style="color:var(--warn)">${lim.oscila != null ? lim.oscila.toFixed(1) : '—'}</div><div class="k">começa a oscilar</div></div>
            <div class="kpi"><div class="v" style="color:var(--bad)">${lim.quebra != null ? lim.quebra.toFixed(1) : '—'}</div><div class="k">quebra</div></div>
          </div>
          ${lim.msConsistente ? `<div class="mini" style="margin-top:7px">Em tempo de rota: você sustenta
            <b>${lim.msConsistente} ms</b>, começa a oscilar em <b>${lim.msOscila} ms</b> e quebra em
            <b>${lim.msQuebra} ms</b>.</div>` : ''}
          <div class="aviso" style="margin-top:8px">${lim.lapsoTexto}<br>${lim.inclinacaoTexto}</div>
          <div class="xs" style="margin-top:5px">Ajustado com ${lim.n} tentativas em ${lim.niveis} níveis de dificuldade.</div>
        ` : `<div class="aviso">${lim.motivo}. O limite só aparece quando o exercício Rota tiver passado por
          faixas de dificuldade suficientes — o que acontece sozinho conforme o controlador sobe e desce.</div>`}
      </div>
    </div>`;
  }

  function cartaoEixo(e) {
    const IX = U.IX;
    const rel = e.nota != null ? IX.relatorioEixo(e.id) : null;
    const dir = rel && rel.direcao;
    const v7 = rel && rel.v7;
    const semDado = e.nota == null || e.nivel === 'insuficiente';
    const fmt = (v) => e.unidade === '' ? (v != null ? v.toFixed(2) : '—') : (v != null ? Math.round(v) : '—');
    return `<div class="medida ${semDado ? 'vazia' : ''}" data-eixo="${e.id}">
      <div class="flex" style="gap:6px;align-items:baseline">
        <div class="mt">${e.nome}</div><div class="espaco"></div>
        <span class="tag ${NIVEL_CLASSE[e.nivel] || ''}">${S.rotuloNivel(e.nivel)}</span>
      </div>
      ${semDado
        ? `<div class="mv vazio">—</div><div class="mini">${e.n ? `${e.n} amostras, ainda insuficiente.` : 'Sem amostra.'}</div>`
        : `<div class="flex" style="align-items:baseline;gap:7px">
             <div class="mv">${e.nota}</div>
             ${dir && dir.estado !== 'semDados' ? `<span class="tag ${dir.estado === 'evolucao' ? 'ok' : dir.estado === 'queda' ? 'bad' : dir.estado === 'suspeita' ? 'warn' : ''}">${dir.cor} ${dir.nome}</span>` : ''}
           </div>
           <div class="mini"><b>${fmt(e.bruto)}${e.unidade}</b> — ${e.fonte || ''}</div>
           ${v7 ? `<div class="mini">7 dias: <b>${v7.delta > 0 ? '+' : ''}${Math.round(v7.delta)}</b>
             ${v7.real ? '<span style="color:var(--ok)">(real)</span>' : `<span class="xs">(${v7.motivo})</span>`}</div>` : ''}
           ${e.nef ? `<div class="xs">confiabilidade ${Math.round((e.peso || 0) * 100)}% — ${e.nef} ${e.nef === e.n ? 'amostras' : `estimativas independentes (de ${e.n} tentativas)`}</div>` : ''}
           ${e.encolhido ? `<div class="xs">nota puxada ${e.puxou > 0 ? '+' : ''}${e.puxou} na direção do histórico — amostra ainda pequena</div>` : ''}`}
      <div class="xs" style="margin-top:4px">${e.pergunta}</div>
    </div>`;
  }

  function depoisEstado() {
    const IX = U.IX;
    const hist = U.DB.load().indiceHist || [];
    if ($('#g-matriz') && hist.length >= 3) {
      const rotulos = hist.map(x => U.dateShort(x.t));
      const linhas = IX.EIXOS.map(E => {
        /* o mapa é de TENDÊNCIA, então usa a série crua quando ela existe —
           a encolhida sobe sozinha enquanto o estimador converge */
        const temCru = hist.filter(x => x.crus && x.crus[E.id] != null).length >= 5;
        const valores = hist.map(x => (temCru ? (x.crus && x.crus[E.id]) : x.eixos[E.id]) ?? null);
        const estados = valores.map((v, i) => {
          if (v == null) return 'semDados';
          const ate = valores.slice(0, i + 1).filter(y => y != null);
          return IX.direcao(ate).estado;
        });
        return { id: E.id, nome: E.nome, valores, estados };
      });
      G.matriz($('#g-matriz'), linhas, rotulos);
      $('#g-matriz').addEventListener('pointerdown', (ev) => {
        const cv = ev.currentTarget, r = cv.getBoundingClientRect();
        const x = ev.clientX - r.left;
        const ml = 96, mr = 38, cw = Math.max(4, (cv.clientWidth - ml - mr) / Math.max(1, rotulos.length));
        const i = Math.floor((x - ml) / cw);
        if (i < 0 || i >= hist.length) return;
        abrirPonto(hist[i]);
      });
    }
    if ($('#g-psico')) G.psicometrica($('#g-psico'), IX.limite({}));
    $$('#tela-estado [data-eixo]').forEach(el2 => el2.addEventListener('click', () => abrirEixo(el2.dataset.eixo)));
  }

  function abrirPonto(reg) {
    const d = U.DB.load();
    const s = d.sessoes.find(x => x.id === reg.sessao);
    const eixos = Object.entries(reg.eixos).sort((a, b) => a[1] - b[1]);
    modal(`
      <h2 style="margin:0 0 4px">${U.dateTime(reg.t)}</h2>
      <div class="mini">Índice global: <b>${reg.global ?? '—'}</b>${s ? ` · ${s.blocos.length} blocos nesta sessão` : ''}</div>
      ${s ? `<div class="mini" style="margin-top:6px">${s.blocos.map(b => `${b.drill}${b.mo !== 'treino' ? ` (${b.mo})` : ''}`).join(' · ')}</div>` : ''}
      <div class="sep"></div>
      <div class="mini"><b>Eixos neste ponto</b> (do mais fraco ao mais forte)</div>
      <div class="pilha" style="gap:3px;margin-top:5px">
        ${eixos.map(([id, v]) => {
          const E = U.IX.porId(id);
          const bruto = reg.brutos && reg.brutos[id];
          return `<div class="mini">${v} — <b>${E ? E.nome : id}</b>${bruto != null ? ` <span class="xs">(${bruto}${E ? E.unidade : ''})</span>` : ''}</div>`;
        }).join('')}
      </div>
      <button class="btn full sm" style="margin-top:12px" data-fecha>Fechar</button>`);
  }

  function abrirEixo(id) {
    const rel = U.IX.relatorioEixo(id);
    const E = rel.eixo, a = rel.atual, d = rel.direcao;
    modal(`
      <h2 style="margin:0 0 4px">${E.nome}</h2>
      <div class="mini">${E.pergunta}</div>
      ${a && a.nota != null ? `
        <div class="flex" style="gap:12px;align-items:baseline;margin-top:8px">
          <div class="numero" style="font-size:1.8rem">${a.nota}<span class="de">/100</span></div>
          <div class="mini" style="flex:1">${a.bruto != null ? `<b>${E.unidade === '' ? a.bruto.toFixed(2) : Math.round(a.bruto)}${E.unidade}</b> medidos · ` : ''}${a.n} amostras · ${S.rotuloNivel(a.nivel)}</div>
        </div>
        ${rel.serie.length >= 3 ? `<canvas class="graf" id="m-eixo" data-h="130" style="margin-top:8px"></canvas>` : ''}
        ${d.mudancas && d.mudancas.ok ? `
          <div class="mt" style="margin-top:10px">Quando alguma coisa mudou</div>
          <div class="xs" style="margin-bottom:4px">A linha fina é o medido; a grossa é o nível estimado
          depois de tirar o ruído de leitura. Os tracinhos verticais são degraus — dias em que a série
          mudou de patamar, e não só balançou.</div>
          <canvas class="graf" id="m-mud" data-h="130"></canvas>` : ''}
        ${d.curva && d.curva.ok ? `
          <div class="mt" style="margin-top:10px">A sua curva neste eixo</div>
          <div class="xs" style="margin-bottom:4px">${d.curva.leitura}</div>
          <canvas class="graf" id="m-curva" data-h="140"></canvas>
          ${d.curva.melhorQueReta ? `<div class="xs" style="margin-top:4px">Platô estimado deste ciclo:
            <b>${Math.round(d.curva.plato)}</b> · você está a <b>${(d.curva.pctDoPlato * 100).toFixed(0)}%</b>
            do caminho até ele.</div>` : ''}` : ''}
        ${d.leituraRuido ? `<div class="xs" style="margin-top:8px">${d.leituraRuido}</div>` : ''}
        <div class="sep"></div>
        ${(() => {
          const janela = (v, rot) => v
            ? `<div class="mini">${rot}: <b>${v.delta > 0 ? '+' : ''}${Math.round(v.delta)}</b>
                 ${v.real ? '<span style="color:var(--ok)">real</span>'
                          : `<span class="xs">(${v.motivo})</span>`}
                 <span class="xs"><br>média de ${v.nAntes} pontos antes contra ${v.nDepois} depois</span></div>`
            : `<div class="mini">${rot}: <b>—</b> <span class="xs">(preciso de pelo menos 2 pontos dos dois lados)</span></div>`;
          return `<div class="grade g2">
          ${janela(rel.v7, '7 dias')}
          ${janela(rel.v30, '30 dias')}
          <div class="mini">Melhor / pior: <b>${rel.melhor ?? '—'}</b> / <b>${rel.pior ?? '—'}</b></div>
          <div class="mini">Desde a sessão anterior: <b>${rel.ultimo != null ? (rel.ultimo > 0 ? '+' : '') + rel.ultimo : '—'}</b>
            <span class="xs"><br>dois pontos soltos: isto é ruído até prova em contrário, e nunca entra em nenhuma conclusão</span></div>
        </div>`; })()}
        <div class="aviso ${d.estado === 'queda' ? 'bad' : d.estado === 'evolucao' ? 'ok' : ''}" style="margin-top:8px">
          <b>${d.cor} ${d.nome}</b> — ${d.o_que}.
          ${d.et != null ? `<br>Erro típico de uma medida deste eixo: ±${d.et.toFixed(1)}. Comparando as duas metades
          da série (${d.n} pontos), a mudança precisa passar de <b>${d.ruido != null ? d.ruido.toFixed(1) : '—'}</b>
          para não ser ruído, e de ${d.swc.toFixed(1)} para ter tamanho que importe. A sua foi
          ${d.delta > 0 ? '+' : ''}${d.delta.toFixed(1)}.` : ''}
        </div>
        ${d.estado === 'queda' || d.estado === 'suspeita' ? causaProvavel(id) : ''}
      ` : `<div class="aviso" style="margin-top:8px">Sem amostra suficiente para este eixo.</div>`}
      <div class="xs" style="margin-top:8px"><b>Régua:</b> ${E.ancoraNota}</div>
      <button class="btn full sm" style="margin-top:12px" data-fecha>Fechar</button>`,
      (cx) => {
        const cv = cx.querySelector('#m-eixo');
        if (cv) setTimeout(() => G.linhaIC(cv, rel.serie.map((v, i) => ({ rot: String(i + 1), v })),
                                           { max: 100, nome: E.nome }), 40);
        const cm = cx.querySelector('#m-mud');
        if (cm && d.mudancas) setTimeout(() => G.linhaMudancas(cm, rel.serie, d.mudancas, d.suave), 60);
        const cc = cx.querySelector('#m-curva');
        if (cc && d.curva) setTimeout(() => G.curvaAprend(cc, rel.serie, d.curva), 80);
      });
  }

  /** Quando um eixo cai, tenta dizer por quê — com as evidências que existem. */
  function causaProvavel(id) {
    const GM = U.GM;
    const d = U.DB.load();
    const causas = [];
    const fad = d.sessoes.slice(-3).filter(s => s.fadiga && s.fadiga.estado === 'alta').length;
    if (fad >= 2) causas.push(`<b>Fadiga:</b> ${fad} das últimas 3 sessões terminaram com sinais de cansaço.`);
    const ret = MD.retencao();
    if (ret.nivel !== 'insuficiente' && ret.lo < 60)
      causas.push(`<b>Perda de retenção:</b> só ${ret.v}% volta no dia seguinte (piso ${ret.lo}%).`);
    const ach = GM.achados({});
    for (const a of ach.ativos.slice(0, 2)) causas.push(`<b>Padrão detectado:</b> ${a.texto}`);
    const erros = MD.perfilErros({ dias: 14 });
    if (erros.itens.length && erros.itens[0].p > 0.4)
      causas.push(`<b>Erro concentrado:</b> ${Math.round(erros.itens[0].p * 100)}% dos erros recentes são do tipo ${erros.itens[0].nome}.`);
    const difs = d.sets.slice(-6).filter(x => x.mo === 'treino').map(x => x.dif);
    if (difs.length >= 4 && difs[difs.length - 1] - difs[0] > 1.2)
      causas.push(`<b>Dificuldade:</b> ela subiu ${(difs[difs.length - 1] - difs[0]).toFixed(1)} pontos nos últimos sets — parte da queda pode ser só isso.`);
    return `<div class="aviso" style="margin-top:7px"><b>Causas possíveis, com o que dá para checar:</b>
      ${causas.length ? '<br>' + causas.join('<br>') : ' nenhuma evidência clara nos dados. Pode ser variação normal.'}</div>`;
  }

  /* ============================================================
     TELA — MÉTODO
     ============================================================ */
  function telaMetodo() {
    const CI = U.CI;
    return `
    <div class="topo"><h1>✎ Método</h1><div class="espaco"></div>
      <span class="sub">${CI.PRINCIPIOS.length} decisões · ${CI.AUDITORIA.length} mudanças da v1</span></div>
    <div class="rolagem pilha">
      <div class="painel frag">
        <h2>A pergunta que este sistema tenta responder</h2>
        <div class="mini">Qual é o seu maior problema agora, e qual exercício corrige isso mais rápido — sem
        afirmar mais do que os dados sustentam. Onde a evidência é fraca, está escrito. Onde ela foi <b>contra</b>
        o que já estava construído, o recurso foi removido e isso também está escrito.</div>
      </div>

      <div class="painel">
        <h2>O que mudou de versão para versão</h2>
        <div class="pilha" style="gap:7px">
          ${CI.AUDITORIA.map(a => `<div class="mini">
            <span class="tag ${a.veredito === 'removido' ? 'bad' : a.veredito === 'rebaixado' ? 'warn' : ''}">${a.veredito}</span>
            <b style="margin-left:5px">${a.alvo}</b><div class="xs" style="margin-top:2px">${a.porque}</div>
          </div>`).join('')}
        </div>
      </div>

      ${CI.PRINCIPIOS.map(pr => `
        <div class="painel princ">
          <h3>${pr.titulo}</h3>
          <div class="flex wrap" style="gap:5px;margin-top:4px">
            <span class="tag ${pr.forca === 'forte' ? 'ok' : pr.forca === 'contra' ? 'bad' : 'warn'}">${CI.FORCA[pr.forca].nome}</span>
            ${pr.novo ? '<span class="tag vio">novo</span>' : ''}
            ${pr.removido ? '<span class="tag bad">recurso removido</span>' : ''}
            ${pr.rebaixa ? '<span class="tag warn">afirmação rebaixada</span>' : ''}
            ${pr.naoUsado ? '<span class="tag">deliberadamente não usado</span>' : ''}
          </div>
          <div class="mini" style="margin-top:7px">${pr.achado}</div>
          <div class="aviso ok" style="margin-top:7px"><b>O que isso mudou aqui:</b> ${pr.aplico}</div>
          <div class="xs" style="margin-top:6px">${pr.fontes.map(f =>
            `<a href="${f.u}" target="_blank" rel="noopener" style="color:var(--cy);display:block;margin-top:2px">↗ ${f.t}</a>`).join('')}</div>
        </div>`).join('')}
    </div>`;
  }

  function verPrincipio(id) {
    const pr = U.CI.PRINCIPIOS.find(x => x.id === id);
    if (!pr) return;
    modal(`
      <span class="tag ${pr.forca === 'forte' ? 'ok' : pr.forca === 'contra' ? 'bad' : 'warn'}">${U.CI.FORCA[pr.forca].nome}</span>
      <h2 style="margin:8px 0 6px;font-size:.95rem;color:var(--txt);text-transform:none;letter-spacing:0">${pr.titulo}</h2>
      <div class="mini">${pr.achado}</div>
      <div class="aviso ok" style="margin-top:8px"><b>O que isso mudou aqui:</b> ${pr.aplico}</div>
      <div class="xs" style="margin-top:8px">${pr.fontes.map(f =>
        `<a href="${f.u}" target="_blank" rel="noopener" style="color:var(--cy);display:block;margin-top:3px">↗ ${f.t}</a>`).join('')}</div>
      <button class="btn full sm" style="margin-top:12px" data-fecha>Fechar</button>`);
  }

  /* ============================================================
     TELA — CONFIG
     ============================================================ */
  function telaConfig() {
    const d = U.DB.load();
    const o = d.opts;
    const rotas = CO.getRotas('jing');
    const luna = d.luna || {};
    const p = MD.painel();
    const podeLuna = p.retencao.nivel !== 'insuficiente' && p.retencao.lo >= 70 && p.estabilidade.hi <= 22;
    return `
    <div class="topo"><h1>⚙ Config</h1></div>
    <div class="rolagem pilha">
      <div class="painel">
        <h2>Aparelho</h2>
        <button class="btn sec full sm" id="fs">Tela cheia + travar em paisagem</button>
        <div class="xs" style="margin-top:5px">Antes de treinar: evita que a barra de gestos entre na faixa do ataque.</div>
      </div>

      <div class="painel">
        <h2>Som</h2>
        <div class="grade g2">
          <button class="btn ${o.musica !== false ? '' : 'sec'} sm" id="o-musica">Trilha ${o.musica !== false ? 'ligada' : 'desligada'}</button>
          <button class="btn ${o.som ? '' : 'sec'} sm" id="o-som">Efeitos ${o.som ? 'ligados' : 'desligados'}</button>
        </div>
        <div class="flex" style="margin-top:8px;gap:9px;align-items:center">
          <span class="mini" style="flex:0 0 4.4rem">Trilha</span>
          <input type="range" id="v-mus" min="0" max="100" value="${Math.round((o.volMusica ?? .5) * 100)}">
          <span class="mini" id="v-mus-n" style="flex:0 0 2.2rem;text-align:right">${Math.round((o.volMusica ?? .5) * 100)}%</span>
        </div>
        <div class="flex" style="gap:9px;align-items:center">
          <span class="mini" style="flex:0 0 4.4rem">Efeitos</span>
          <input type="range" id="v-sfx" min="0" max="100" value="${Math.round((o.volSfx ?? .6) * 100)}">
          <span class="mini" id="v-sfx-n" style="flex:0 0 2.2rem;text-align:right">${Math.round((o.volSfx ?? .6) * 100)}%</span>
        </div>
        <div class="grade g2" style="margin-top:8px">
          <button class="btn ${o.vibra ? '' : 'sec'} sm" id="o-vibra">Vibração ${o.vibra ? 'ligada' : 'desligada'}</button>
          <button class="btn ${o.fx === 'alto' ? '' : 'sec'} sm" id="o-fx">Efeitos visuais ${o.fx === 'alto' ? 'completos' : 'reduzidos'}</button>
        </div>
        <div class="xs" style="margin-top:6px">Na Prova a trilha fica mínima de propósito: medir com trilha cheia
        acrescenta variação que não tem nada a ver com você.</div>
      </div>

      <div class="painel">
        <h2>Luna</h2>
        <div class="mini">${podeLuna
          ? 'A Jing sustenta os pisos de retenção e estabilidade. A Luna pode entrar como módulo secundário — recomendado no máximo 1 bloco a cada 4 da Jing.'
          : `Fechada por enquanto. As duas competem pelo mesmo mapa de polegar; enquanto a Jing não sustentar
             retenção com limite inferior acima de 70% e variação abaixo de 22%, treinar Luna atrasa a Jing.
             Agora: retenção ${p.retencao.v ?? '—'}${p.retencao.lo != null ? ` (piso ${p.retencao.lo})` : ''},
             variação ${p.estabilidade.v ?? '—'}${p.estabilidade.hi != null ? ` (teto ${p.estabilidade.hi})` : ''}.`}</div>
        ${podeLuna ? `<div class="grade g2" style="margin-top:8px">
          ${D.deLuna().map(x => `<button class="btn sec sm" data-luna="${x.id}">${x.nome}</button>`).join('')}
        </div>` : ''}
      </div>

      <div class="painel">
        <h2>Rotas da Jing</h2>
        <div class="mini" style="margin-bottom:7px">Nomeadas pela função para continuarem válidas se a build ou o
        patch mudarem. A rota <b>Marca</b> é a de referência: mexer nela reinicia a comparação histórica.</div>
        <div class="pilha" style="gap:6px">
          ${rotas.map(r => `<div class="item" data-rota="${r.id}">
            <div class="ic">${r.prio}</div>
            <div class="txt"><b>${r.nome} — ${r.seq.map(k => (H.getHud()[k] || {}).curto || k).join(' › ')}</b><span>${r.porque}</span></div>
            <span class="tag">${r.id === 'marca' ? 'referência' : 'editar'}</span>
          </div>`).join('')}
        </div>
      </div>

      <div class="painel">
        <h2>Seus dados</h2>
        <div class="mini">${d.tentativas.length} tentativas · ${d.sets.length} sets · ${d.sessoes.length} sessões
        · ${d.provas.length} provas · ${U.DB.tamanho()} KB${d.legado ? ' · histórico da v1 preservado' : ''}.
        ${U.DB.falhouAoSalvar() ? '<br><b style="color:var(--bad)">O último salvamento falhou</b> — exporte um backup agora.' : ''}</div>
        <div class="grade g2" style="margin-top:8px">
          <button class="btn sec sm" id="exp">Exportar backup</button>
          <button class="btn sec sm" id="imp">Importar backup</button>
        </div>
        <button class="btn bad sm full" id="zerar" style="margin-top:8px">Apagar tudo</button>
        <div class="xs" style="margin-top:6px">Fica tudo no seu aparelho. Limpar os dados do site no Chrome
        apaga o histórico — exporte de vez em quando.</div>
      </div>

      <div class="painel">
        <h2>Como o sistema decide</h2>
        <div class="mini">Uma lista de regras avaliada em ordem; a primeira que dispara decide. Sem pesos
        ocultos. Cada recomendação mostra a regra e o número que a fez disparar, para você poder discordar
        com argumento.</div>
        <div class="pilha" style="gap:3px;margin-top:7px">
          ${DS.REGRAS.map((r, i) => `<div class="mini"><span class="xs" style="color:var(--dim2)">${i + 1}.</span>
            <code>${r.id}</code> — ${r.titulo}</div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function depoisConfig() {
    const d = U.DB.load();
    const alt = (k, v) => { d.opts[k] = v; U.DB.save(); render('config'); };
    $('#fs')?.addEventListener('click', () => { U.Screen.fullscreen(); U.Sfx.unlock(); toast('Tela cheia'); });
    $('#o-som')?.addEventListener('click', () => { alt('som', !d.opts.som); U.Sfx.unlock(); U.Sfx.hit(); });
    $('#o-vibra')?.addEventListener('click', () => { alt('vibra', !d.opts.vibra); U.Haptic.good(); });
    $('#o-fx')?.addEventListener('click', () => alt('fx', d.opts.fx === 'alto' ? 'baixo' : 'alto'));
    $('#o-musica')?.addEventListener('click', () => {
      d.opts.musica = d.opts.musica === false; U.DB.save(); U.Sfx.unlock();
      d.opts.musica ? U.Musica.tocar('espelho') : U.Musica.parar();
      render('config');
    });
    const liga = (id, chave, fn) => {
      const e = $(id); if (!e) return;
      e.addEventListener('input', () => {
        d.opts[chave] = e.value / 100; U.DB.save();
        const n = $(id + '-n'); if (n) n.textContent = e.value + '%';
        fn && fn();
      });
    };
    liga('#v-mus', 'volMusica', () => { U.Sfx.unlock(); U.Musica.atualizarVolume(); });
    liga('#v-sfx', 'volSfx', () => { U.Sfx.unlock(); U.Sfx.atualizarVolume(); U.Sfx.hit(); });
    $$('#tela-config [data-luna]').forEach(b => b.addEventListener('click', () => {
      const dr = D.porId(b.dataset.luna); if (dr) U.T.abrirBloco(dr, CT.estado(dr.id).dif);
    }));
    $$('#tela-config .item[data-rota]').forEach(it => it.addEventListener('click', () => editarRota(it.dataset.rota)));
    $('#exp')?.addEventListener('click', () => {
      const blob = new Blob([U.DB.export()], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: `espelho-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.appendChild(a); a.click(); a.remove(); toast('Backup gerado', 'ok');
    });
    $('#imp')?.addEventListener('click', () => {
      const inp = el('input', { type: 'file', accept: 'application/json' });
      inp.addEventListener('change', () => {
        const f = inp.files[0]; if (!f) return;
        const fr = new FileReader();
        fr.onload = () => { try { U.DB.import(fr.result); toast('Backup restaurado', 'ok'); ir('agora'); }
                            catch (e) { toast('Arquivo inválido'); } };
        fr.readAsText(f);
      });
      inp.click();
    });
    $('#zerar')?.addEventListener('click', () => {
      modal(`<h2 style="margin:0 0 8px;color:var(--bad)">Apagar tudo?</h2>
        <div class="mini">Tentativas, medidas, calibração e histórico da v1. Não dá para desfazer.
        Exporte um backup antes se tiver qualquer dúvida.</div>
        <div class="flex" style="margin-top:12px;gap:8px">
          <button class="btn full sm" data-fecha>Cancelar</button>
          <button class="btn bad full sm" id="cf-zerar">Apagar</button></div>`,
        (cx) => cx.querySelector('#cf-zerar').addEventListener('click', () => {
          U.DB.reset(); fecharModal(); toast('Tudo zerado'); ir('agora');
        }));
    });
  }

  function editarRota(id) {
    const rota = CO.rotaPorId(id);
    if (!rota) return;
    let seq = rota.seq.slice();
    const botoes = ['s1', 's2', 's3', 'aa', 'flash', 'it1', 'it2'];
    const desenha = (cx) => {
      cx.querySelector('#seq').innerHTML = seq.length
        ? seq.map((k, i) => `<button class="btn sec sm" data-rm="${i}">${(H.getHud()[k] || {}).curto || k} ✕</button>`).join('')
        : '<span class="mini">vazia</span>';
      cx.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { seq.splice(+b.dataset.rm, 1); desenha(cx); }));
    };
    modal(`
      <h2 style="margin:0 0 4px">${rota.nome}</h2>
      <div class="mini" style="margin-bottom:8px">${rota.porque}</div>
      ${id === 'marca' ? `<div class="aviso bad">Esta é a rota de referência das medidas. Mudar a sequência
        torna as medidas antigas incomparáveis com as novas — o sistema vai avisar, mas a série anterior
        perde o sentido.</div>` : ''}
      <div class="mini" style="margin-top:8px"><b>Sequência</b></div>
      <div class="flex wrap" id="seq" style="gap:6px;margin:6px 0 10px;min-height:44px"></div>
      <div class="mini"><b>Adicionar</b></div>
      <div class="flex wrap" style="gap:6px;margin-top:6px">
        ${botoes.map(k => `<button class="btn sm" data-add="${k}">${(H.getHud()[k] || {}).curto || k}</button>`).join('')}
      </div>
      <div class="flex" style="margin-top:12px;gap:8px">
        <button class="btn sec full sm" data-fecha>Cancelar</button>
        <button class="btn full sm" id="salvar-rota">Salvar</button>
      </div>`,
      (cx) => {
        desenha(cx);
        cx.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
          if (seq.length >= 12) return; seq.push(b.dataset.add); desenha(cx);
        }));
        cx.querySelector('#salvar-rota').addEventListener('click', () => {
          if (!seq.length) return toast('Precisa de ao menos um toque');
          rota.seq = seq; U.DB.save(); fecharModal(); toast('Rota salva', 'ok'); render('config');
        });
      });
  }

  /* ============================================================
     HERÓIS — central de dados, separada do treino
     ============================================================ */
  let heroFiltro = { f: null, q: '', pag: 1, aba: 'lista' };
  const POR_PAG = 20;

  function telaHerois() {
    const HE = U.HE;
    if (!HE) return '<div class="painel"><div class="mini">Módulo de heróis não carregou.</div></div>';
    const pan = HE.panorama();
    if (heroFiltro.aba === 'importar') return telaImportar(pan);

    let lista = heroFiltro.q ? HE.buscar(heroFiltro.q) : HE.todos();
    if (heroFiltro.f) lista = lista.filter(h => HE.temFuncao(h, heroFiltro.f));
    const pags = Math.max(1, Math.ceil(lista.length / POR_PAG));
    heroFiltro.pag = U.clamp(heroFiltro.pag, 1, pags);
    const pagina = lista.slice((heroFiltro.pag - 1) * POR_PAG, heroFiltro.pag * POR_PAG);

    return `
    <div class="topo"><h1>❖ Heróis</h1><div class="espaco"></div>
      <span class="sub">${pan.n} no banco · ${pan.comAlgo} com algum dado</span></div>
    <div class="rolagem pilha">

      <div class="painel ${pan.daPrioritaria ? '' : 'hero'}">
        <div class="flex" style="gap:8px;align-items:center">
          <h2 style="margin:0">Estado da fonte</h2><div class="espaco"></div>
          <button class="btn sec sm" data-haba="importar">Importar dados</button>
        </div>
        <div class="aviso ${pan.baixado ? 'ok' : 'bad'}" style="margin-top:8px">
          <b>${U.esc(HE.FONTE_ALVO.nome)}</b> — <b>nada foi baixado de lá.</b>
          ${U.esc(HE.FONTE_ALVO.porque)}
        </div>
        <div class="mini" style="margin-top:7px">
          ${pan.daPrioritaria ? `O que existe da fonte prioritária hoje — <b>${pan.daPrioritaria}
          ${pan.daPrioritaria === 1 ? 'herói' : 'heróis'}</b> — foi <b>transcrito das capturas de tela que você
          enviou</b>, e é só a tier list geral. Transcrição de imagem erra às vezes, então ela está marcada
          como não conferida e qualquer importação a substitui.<br><br>` : ''}
          O que <b>não</b> existe: a página individual de cada herói, que é onde moram taxa de vitória, itens
          por slot e counters com amostra. Isso precisa ser capturado página por página.
          <br><br>Enquanto não for, cada campo mostra <b>"${U.esc(HE.SEM_DADO)}"</b> em vez de um palpite.
          Toque em <b>Importar dados</b> para o passo a passo.
        </div>
        <div class="aviso" style="margin-top:8px">
          <b>O que esta fonte não publica, e nenhuma captura vai trazer:</b>
          ${Object.entries(HE.FONTE_ALVO.naoPublica).map(([k, v]) =>
            `<div class="xs" style="margin-top:3px"><b>${U.esc(k)}</b> — ${U.esc(v)}</div>`).join('')}
          <div class="xs" style="margin-top:5px">Eu tinha suposto que o site fosse um guia de builds e combos.
          As suas capturas mostraram que ele é uma <b>estação de estatística</b>: ele conta partidas. Isso é
          melhor para auditar e pior para quem queria combo pronto — e está dito aqui em vez de virar um campo
          que nunca preenche.</div>
        </div>
        <div class="grade g3" style="margin-top:9px">
          <div class="kpi"><div class="v">${pan.n}</div><div class="k">heróis</div></div>
          <div class="kpi"><div class="v" style="color:${pan.comAlgo ? 'var(--gold)' : 'var(--dim2)'}">${pan.comAlgo}</div><div class="k">com algum dado</div></div>
          <div class="kpi"><div class="v" style="color:${pan.daPrioritaria ? 'var(--ok)' : 'var(--bad)'}">${pan.daPrioritaria}</div><div class="k">da fonte prioritária</div></div>
        </div>
      </div>

      <div class="painel">
        <input class="campo" id="hero-busca" placeholder="Buscar herói…" value="${U.esc(heroFiltro.q)}">
        <div class="grade" style="grid-template-columns:repeat(6,1fr);gap:6px;margin-top:8px">
          <button class="btn sec sm ${!heroFiltro.f ? 'gold' : ''}" data-hfun="">TODOS</button>
          ${HE.FUNCOES.map(f => `<button class="btn sec sm ${heroFiltro.f === f.id ? 'gold' : ''}" data-hfun="${f.id}">${f.nome}</button>`).join('')}
        </div>
        <div class="xs" style="margin-top:6px">${lista.length} ${lista.length === 1 ? 'herói' : 'heróis'}${heroFiltro.f
          ? ` com função conhecida <b>${(HE.FUNCOES.find(x => x.id === heroFiltro.f) || {}).nome}</b>. A função só está preenchida onde ela foi lida de algum lugar — quem está sem função não aparece em filtro nenhum, e isso é de propósito.`
          : '.'}</div>
      </div>

      <div class="painel">
        <div class="grade" style="grid-template-columns:repeat(5,1fr);gap:7px">
          ${pagina.map(h => {
            const c = HE.completude(h);
            const cor = c.daPrioritaria ? 'var(--ok)' : c.vazio ? 'var(--dim2)' : 'var(--gold)';
            const e = h.estatisticas;
            return `<div class="medida" data-heroi="${U.esc(h.id)}" style="cursor:pointer;padding:8px 6px">
              <div class="flex" style="gap:4px;align-items:baseline">
                <div class="mt" style="font-size:.72rem;line-height:1.15;flex:1;min-width:0">${U.esc(h.name)}</div>
                ${h.tier ? `<span class="xs" style="color:var(--gold);font-weight:800">${U.esc(h.tier.lista)}</span>` : ''}
              </div>
              <div class="xs" style="margin-top:3px">${h.role && h.role.length
                ? h.role.map(r => (HE.FUNCOES.find(f => f.alt.includes(r)) || { nome: r }).nome).join(' · ')
                : '<span style="opacity:.55">função não lida</span>'}</div>
              ${e && e.vitoria ? `<div class="xs" style="margin-top:4px">
                  <b style="color:${e.vitoria.v >= 50 ? 'var(--ok)' : 'var(--bad)'}">${U.num(e.vitoria.v, 1)}%</b>
                  <span style="opacity:.7"> vit · ${U.num(e.escolha.v, 1)}% esc</span></div>`
                : `<div class="xs" style="margin-top:4px;color:${cor}">${c.vazio ? 'sem dados' : `${c.cheios}/${c.total} campos`}</div>`}
            </div>`;
          }).join('')}
        </div>
        ${pags > 1 ? `<div class="flex" style="gap:6px;justify-content:center;margin-top:10px">
          ${Array.from({ length: pags }, (_, i) => i + 1).map(n =>
            `<button class="btn sec sm ${n === heroFiltro.pag ? 'gold' : ''}" data-hpag="${n}" style="min-width:34px">${n}</button>`).join('')}
        </div>` : ''}
      </div>

      ${(() => {
        const fora = HE.foraDoBanco();
        if (!fora.length) return '';
        return `<div class="painel">
          <h2>Na fonte, fora da sua lista</h2>
          <div class="mini" style="margin-bottom:6px"><b>${fora.length} heróis</b> aparecem no
          pvp.mcxssg.net e não estão na lista que você me passou. Eles ficam listados em chinês, sem id
          inventado — porque foi exatamente esse o erro que eu cometi e os testes pegaram: mapear
          <code>少司缘</code> para um <code>shaosiyuan</code> que não existia, e com isso jogar o dado da
          fonte num herói fantasma. Quando você me disser o nome internacional de cada um, eles entram.</div>
          <div class="flex" style="gap:4px;flex-wrap:wrap">
            ${fora.slice(0, 60).map(x => `<span class="tag warn">${U.esc(x.nomeCn)}</span>`).join('')}
          </div>
        </div>`;
      })()}

      ${U.HE.ITENS ? `<div class="painel">
        <h2>Itens · ${U.HE.ITENS.lista.length} catalogados</h2>
        <div class="mini" style="margin-bottom:6px">Nome em inglês e preço, das suas capturas do
        <b>HoK Stats</b> — que <b>não</b> é a fonte prioritária, e está marcado assim.
        ${U.esc(U.HE.ITENS.lacunas.nomeCn)}</div>
        <div class="grade" style="grid-template-columns:repeat(4,1fr);gap:5px">
          ${U.HE.ITENS.lista.slice(0, 24).map(it => `<div class="medida" style="padding:6px">
            <div class="xs" style="font-weight:700;line-height:1.2">${U.esc(it.nome)}</div>
            <div class="xs" style="color:var(--gold);margin-top:2px">${it.preco != null ? U.num(it.preco) : '—'}</div>
          </div>`).join('')}
        </div>
        <div class="xs" style="margin-top:7px">Mostrando 24 de ${U.HE.ITENS.lista.length}.
        Cobertura: ${U.esc(U.HE.ITENS.cobertura)}. ${U.esc(U.HE.ITENS.lacunas.passiva)}</div>
      </div>` : ''}

      ${U.HE.TIER ? `<div class="painel">
        <h2>Tier list da fonte · ${U.esc(U.HE.TIER.data)}</h2>
        <div class="mini" style="margin-bottom:6px">Transcrita da captura do site. ${U.esc(U.HE.TIER.avisoDaFonte)}
        Ainda <b>não conferida</b> — importar pelo extrator substitui.</div>
        ${U.HE.TIER.faixas.map(f => `<div style="margin-top:7px">
          <div class="flex" style="gap:6px;align-items:baseline">
            <span class="tag gold">${U.esc(f.id)}</span>
            <span class="xs">${f.herois.length} heróis · ${f.herois.filter(x => x.id).length} reconhecidos pelo mapa de nomes</span>
          </div>
          <div class="flex" style="gap:4px;flex-wrap:wrap;margin-top:4px">
            ${f.herois.map(x => `<span class="tag ${x.id ? '' : 'warn'}" ${x.id ? `data-heroi="${U.esc(x.id)}" style="cursor:pointer"` : ''}>${
              U.esc(x.id ? (U.HE.porId(x.id) || {}).name || x.nomeCn : x.nomeCn)} <b>${U.num(x.pontos, 1)}</b></span>`).join('')}
          </div>
        </div>`).join('')}
        <div class="xs" style="margin-top:8px">Os que estão em amarelo e em chinês são os que o mapa de nomes
        não soube converter. Ficam assim de propósito: adivinhar qual herói internacional corresponde a cada
        nome renomearia o errado sem ninguém perceber.</div>
      </div>` : ''}

      <div class="painel">
        <h2>Como este banco se relaciona com o seu treino</h2>
        <div class="mini">Os dois não se misturam, de propósito, e é por isso que ficam em armazenamentos
        separados:<br><br>
        <b>DADOS DO HERÓI</b> — o que se sabe sobre o personagem. Vem de fora. Vale para qualquer jogador.<br>
        <b>SEU TREINO</b> — as rotas que você pratica e a dificuldade que o sistema mirou.<br>
        <b>SEU DESEMPENHO</b> — os toques, tempos e erros que você produziu.<br>
        <b>SUA MAESTRIA</b> — as medidas e o índice que saem do seu desempenho.<br><br>
        Uma build importada nunca entra numa medida sua; um tempo seu nunca vira dado do herói. O botão
        <b>Adicionar ao treino</b> só cria uma referência por id entre os dois lados.</div>
        ${HE.noTreino().length ? `<div class="mt" style="margin-top:9px">No treino agora</div>
          <div class="flex" style="gap:6px;flex-wrap:wrap;margin-top:5px">
            ${HE.noTreino().map(x => `<span class="tag">${U.esc(x.nome)}</span>`).join('')}
          </div>` : ''}
      </div>
    </div>`;
  }

  function telaImportar(pan) {
    const HE = U.HE;
    return `
    <div class="topo"><h1>❖ Importar dados</h1><div class="espaco"></div>
      <button class="btn sec sm" data-haba="lista">Voltar</button></div>
    <div class="rolagem pilha">
      <div class="painel hero">
        <h2 class="heroT">Por que a importação existe</h2>
        <div class="mini" style="margin-top:5px">A fonte que você definiu — <b>${HE.FONTE_ALVO.url}</b> — não
        pôde ser lida por quem montou esta versão: o proxy de saída da sessão recusa o domínio. Duas saídas
        eram possíveis. A primeira era preencher com build plausível e escrever "fonte: pvp.mcxssg.net"
        embaixo. Você proibiu isso três vezes no seu pedido, e estaria certo: build inventada com carimbo de
        fonte é pior que campo vazio, porque campo vazio você desconfia.
        <br><br>A segunda é esta: você alcança o site, então o app recebe o dado de você, confere e guarda.</div>
      </div>

      <div class="painel">
        <h2>Passo 1 — capturar a página</h2>
        <div class="mini">Abra <b>${HE.FONTE_ALVO.url}hero/584</b> no navegador, abra o console (F12), cole
        o script abaixo e dê Enter. Ele baixa um <code>.json</code>.
        <br><br>O script foi escrito em cima dos cabeçalhos <b>reais</b> do site, que apareceram nas capturas
        que você mandou — 胜率, 出场率, 禁用率, 克制的英雄, 被克制的英雄, 最佳搭档, 较差搭档,
        大家常出, 第N件装备, 装备胜率, 时段胜率. Ele lê o texto da página, que sobrevive a mudança de
        CSS, e também guarda o estado bruto para o que os padrões não pegarem.</div>
        <textarea class="campo" id="hero-extrator" readonly style="height:120px;font-family:ui-monospace,monospace;font-size:.62rem;margin-top:8px">${HE.EXTRATOR}</textarea>
        <button class="btn sec sm full" id="hero-copiar" style="margin-top:7px">Copiar script</button>
      </div>

      <div class="painel hero">
        <h2 class="heroT">Atalho que você tem e eu não</h2>
        <div class="mini" style="margin-top:5px">A tabela <b>数据</b> do site (a aba "dados", com taxa de
        vitória, escolha e banimento de todos os heróis) tem um botão <b>导出表格</b> — "exportar tabela" —
        no canto inferior direito. Baixar por ali e me mandar o arquivo vale mais do que qualquer script:
        é dado de primeira mão, sem transcrição no meio.
        <br><br>Hoje o app tem essa tabela <b>transcrita das suas capturas</b>, com 84 das 88 linhas (as
        posições 63 a 66 ficaram entre duas imagens e estão ausentes, não estimadas). Tudo marcado como
        não conferido.</div>
      </div>

      <div class="painel">
        <h2>Passo 2 — colar o JSON já no formato do banco</h2>
        <div class="mini">Se você já tiver o dado no formato deste banco, cole aqui. Um objeto ou uma lista.
        O app <b>confere antes de aceitar</b>: registro sem <code>id</code>, sem <code>name</code>, ou com
        conteúdo sem <code>source</code> declarado é recusado com o motivo. Build sem origem não entra.</div>
        <textarea class="campo" id="hero-json" placeholder='{"id":"jing","name":"Jing","builds":[…],"source":"pvp.mcxssg.net","sourceUrl":"https://pvp.mcxssg.net/hero/584","lastUpdated":"2026-09-17"}' style="height:130px;font-family:ui-monospace,monospace;font-size:.66rem;margin-top:8px"></textarea>
        <div class="flex" style="gap:8px;margin-top:8px">
          <button class="btn sm" id="hero-importar">Conferir e importar</button>
          <button class="btn sec sm" id="hero-exportar">Exportar o banco atual</button>
        </div>
        <div id="hero-res" style="margin-top:8px"></div>
      </div>

      <div class="painel">
        <h2>O formato que o banco aceita</h2>
        <pre class="xs" style="white-space:pre-wrap;line-height:1.5;margin:0">{
  "id": "jing",                    // minúsculo, sem espaço — obrigatório
  "name": "Jing",                  // obrigatório
  "titulo": "Miragem Partida",
  "role": ["selva"],
  "dificuldade": "alta",
  "abilities": [ { "tecla":"1", "nome":"…", "descricao":"…", "recarga":"…" } ],
  "builds": [ {
      "tipo": "chinesa",           // chinesa | profissional | alternativa | situacional
      "itens": ["…","…"],          // na ORDEM de compra
      "talento": "…", "feitico": "…",
      "source": "pvp.mcxssg.net",  // obrigatório em toda build
      "sourceUrl": "https://pvp.mcxssg.net/hero/584",
      "patch": "…", "lastUpdated": "2026-09-17" } ],
  "arcana": [ { "nome":"…", "n":10 } ],
  "combos": [ { "seq":["1","2","aa","3"], "finalidade":"…",
                "dificuldade":"…", "situacao":"…", "obs":"…" } ],
  "counters": { "forteContra":[{"nome":"…"}], "fracoContra":[{"nome":"…"}] },
  "synergies": [ { "nome":"…", "porque":"…" } ],
  "strategy": { "cedo":"…", "meio":"…", "tarde":"…", "dicas":["…"] },
  "source": "pvp.mcxssg.net",
  "sourceUrl": "https://pvp.mcxssg.net/hero/584",
  "patch": "…",
  "lastUpdated": "2026-09-17",
  "fontes": { "builds":"pvp.mcxssg.net", "combos":"pvp.mcxssg.net" }
}</pre>
        <div class="xs" style="margin-top:7px"><code>fontes</code> permite origem diferente por campo — é
        o que deixa você importar a build de um lugar e os counters de outro sem que o app misture os dois
        na hora de dizer de onde veio cada coisa.</div>
      </div>
    </div>`;
  }

  function depoisHerois() {
    const HE = U.HE;
    $('#hero-busca')?.addEventListener('input', U.debounce((e) => {
      heroFiltro.q = e.target.value; heroFiltro.pag = 1; render('herois');
      const el = $('#hero-busca');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 280));
    $$('[data-hfun]').forEach(b => b.addEventListener('click', () => {
      heroFiltro.f = b.dataset.hfun || null; heroFiltro.pag = 1; render('herois');
    }));
    $$('[data-hpag]').forEach(b => b.addEventListener('click', () => {
      heroFiltro.pag = +b.dataset.hpag; render('herois');
    }));
    $$('[data-haba]').forEach(b => b.addEventListener('click', () => {
      heroFiltro.aba = b.dataset.haba; render('herois');
    }));
    $$('[data-heroi]').forEach(b => b.addEventListener('click', () => abrirHeroi(b.dataset.heroi)));

    $('#hero-copiar')?.addEventListener('click', async () => {
      const t = $('#hero-extrator');
      try { await navigator.clipboard.writeText(t.value); toast('Script copiado', 'ok'); }
      catch (e) { t.select(); toast('Selecionado — copie com Ctrl+C'); }
    });
    $('#hero-importar')?.addEventListener('click', () => {
      const r = HE.importar($('#hero-json').value);
      const el = $('#hero-res');
      if (r.erro) { el.innerHTML = `<div class="aviso bad"><b>Não importei nada.</b> ${r.erro}</div>`; return; }
      el.innerHTML = `
        ${r.aceitos.length ? `<div class="aviso ok"><b>${r.aceitos.length} aceito(s):</b> ${r.aceitos.join(', ')}</div>` : ''}
        ${r.recusados.length ? `<div class="aviso bad" style="margin-top:6px"><b>${r.recusados.length} recusado(s).</b>
          ${r.recusados.map(x => `<br><b>${x.id || '(sem id)'}</b>: ${x.erros.join('; ')}`).join('')}
          <br><br>Recusar é o comportamento certo aqui: o que entra sem origem declarada vira, depois, um
          número que ninguém consegue auditar.</div>` : ''}`;
      if (r.aceitos.length) setTimeout(() => render('herois'), 1400);
    });
    $('#hero-exportar')?.addEventListener('click', () => {
      const txt = HE.exportar();
      const b = new Blob([txt], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'espelho-herois.json';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Banco exportado', 'ok');
    });
  }

  /* ---- ficha do herói: as sete seções ---- */
  let heroAba = 'geral';
  function abrirHeroi(id) {
    const HE = U.HE, h = HE.porId(id);
    if (!h) return;
    heroAba = 'geral';
    const pintar = () => {
      const c = HE.completude(h);
      const sec = HE.SECOES.find(s => s.id === heroAba) || HE.SECOES[0];
      const noTreino = HE.estaNoTreino(id);
      modal(`
        <div class="flex" style="gap:10px;align-items:flex-start">
          <div style="flex:1;min-width:0">
            <h2 style="margin:0">${U.esc(h.name)}${h.nomeCn ? ` <span class="xs" style="opacity:.75">${U.esc(h.nomeCn)}</span>` : ''}</h2>
            <div class="mini">${h.titulo ? U.esc(h.titulo) : `<span style="opacity:.6">${HE.SEM_DADO}</span>`}</div>
            <div class="flex" style="gap:5px;margin-top:5px;flex-wrap:wrap">
              ${(h.role || []).map(r => `<span class="tag">${(HE.FUNCOES.find(f => f.alt.includes(r)) || { nome: r }).nome}</span>`).join('')
                || '<span class="tag bad">função não lida</span>'}
              <span class="tag ${c.daPrioritaria ? 'ok' : c.vazio ? 'bad' : 'warn'}">${c.cheios}/${c.total} campos</span>
            </div>
          </div>
        </div>
        <div class="flex" style="gap:4px;flex-wrap:wrap;margin-top:10px">
          ${HE.SECOES.map(s => {
            const cs = c.secoes.find(x => x.id === s.id);
            return `<button class="btn sec sm ${s.id === heroAba ? 'gold' : ''}" data-hsec="${s.id}"
              style="flex:1 1 auto;min-width:0;padding:5px 7px;font-size:.62rem">${s.nome}${cs.tem ? '' : ' ·'}</button>`;
          }).join('')}
        </div>
        <div class="sep"></div>
        ${secaoHeroi(h, sec)}
        <div class="sep"></div>
        <div class="flex" style="gap:8px">
          <button class="btn sm" id="h-treino" style="flex:1">${noTreino ? 'Remover do treino' : 'Adicionar ao treino'}</button>
          <button class="btn sec sm" data-fecha>Fechar</button>
        </div>
        <div id="h-treino-res" style="margin-top:7px"></div>
        <div class="xs" style="margin-top:8px">${h.notaFonte || ''}
          ${h.alvoUrl ? `<br>Fonte prioritária pretendida: <b>${h.alvoUrl}</b>.` : ''}</div>`,
        (cx) => {
          cx.querySelectorAll('[data-hsec]').forEach(b => b.addEventListener('click', () => { heroAba = b.dataset.hsec; pintar(); }));
          cx.querySelector('#h-treino')?.addEventListener('click', () => {
            if (HE.estaNoTreino(id)) { HE.removerDoTreino(id); toast('Removido do treino'); pintar(); return; }
            const r = HE.adicionarAoTreino(id);
            const el = cx.querySelector('#h-treino-res');
            if (!r.ok) { el.innerHTML = `<div class="aviso">${r.motivo}</div>`; return; }
            el.innerHTML = r.aviso
              ? `<div class="aviso bad">${r.aviso}</div>`
              : `<div class="aviso ok"><b>${r.herói}</b> entrou no treino com ${HE.rotasDoTreino(id).n} rotas já definidas.</div>`;
            pintar();
          });
        }, h.name);
    };
    pintar();
  }

  function secaoHeroi(h, sec) {
    const HE = U.HE, E = U.esc;
    const naoPublica = HE.FONTE_ALVO.naoPublica;
    const falta = (k) => {
      /* Três casos diferentes, e misturá-los é o erro que este app
         existe para não cometer:
         · a fonte NÃO PUBLICA aquilo — não adianta esperar;
         · a fonte publica e ainda não foi capturado;
         · foi capturado e veio vazio.                               */
      if (naoPublica[k]) return `<div class="aviso"><b>A fonte não publica isto.</b>
        <div class="xs" style="margin-top:4px">${E(naoPublica[k])} Isso é diferente de "faltou coletar":
        capturar a página de novo não vai trazer este campo. Se você quiser ter isto no app, vai ter que vir
        de outra fonte — e aí vai aparecer marcado com o nome dela.</div></div>`;
      const porque = h.lacunas && h.lacunas[k];
      return `<div class="aviso"><b>${HE.SEM_DADO}</b>${porque
        ? `<div class="xs" style="margin-top:4px">${E(porque)}</div>` : ''}</div>`;
    };
    const selo = (c) => c.tem ? `<div class="xs" style="margin-top:7px">Fonte: <b>${E(c.fonte ? c.fonte.nome : c.fonteId)}</b>${
      c.quando ? ` · ${E(c.quando)}` : ''}${c.prioritaria ? '' : ' · <span style="color:var(--warn)">não é a fonte prioritária</span>'}</div>` : '';
    const pctCor = (d) => d > 0 ? 'var(--ok)' : d < 0 ? 'var(--bad)' : 'var(--dim)';
    const sinal = (d) => (d > 0 ? '+' : '') + U.num(d, 2);

    if (sec.id === 'geral') {
      const st = HE.campo(h, 'estatisticas'), ti = HE.campo(h, 'tier');
      return `
        ${ti.tem ? `<div class="medida">
          <div class="flex" style="gap:8px;align-items:baseline">
            <span class="tag gold" style="font-size:.8rem">${E(ti.v.lista)}</span>
            <div class="numero" style="font-size:1.4rem">${U.num(ti.v.pontos, 1)}</div>
            <div class="espaco"></div><span class="xs">${E(ti.v.data || '')} · ${E(ti.v.escopo || '')}</span>
          </div>
          ${ti.v.banimentoAzul != null ? `<div class="mini" style="margin-top:5px">Taxa de banimento no lado azul:
            <b>${U.num(ti.v.banimentoAzul, 1)}%</b></div>` : ''}
          ${ti.v.aviso ? `<div class="xs" style="margin-top:5px;color:var(--warn)">${E(ti.v.aviso)}</div>` : ''}
          ${ti.v.conferido === false ? `<div class="xs" style="margin-top:3px">Transcrito de captura de tela e
            <b>não conferido</b>. Importar pelo extrator substitui.</div>` : ''}
          ${selo(ti)}
        </div>` : falta('tier')}

        <div class="mt" style="margin-top:11px">Taxas da fonte</div>
        ${st.tem ? `<div class="grade g3" style="margin-top:5px">
            ${[['vitoria', 'vitória'], ['escolha', 'escolha'], ['banimento', 'banimento']].map(([k, r]) => {
              const x = st.v[k]; if (!x) return '';
              return `<div class="kpi"><div class="v">${U.num(x.v, 2)}<span class="de">%</span></div>
                <div class="k">${r}</div>${x.delta != null
                  ? `<div class="xs" style="color:${pctCor(x.delta)}">${sinal(x.delta)}</div>` : ''}</div>`;
            }).join('')}
          </div>
          <div class="xs" style="margin-top:6px">${E(st.v.escopo || '')} ${st.v.data ? `· dados de ${E(st.v.data)}` : ''}</div>
          ${selo(st)}` : falta('estatisticas')}`;
    }

    if (sec.id === 'build') {
      const b = HE.campo(h, 'builds');
      if (!b.tem) return falta('builds');
      const v = b.v;
      return `
        ${(v.comuns || []).length ? `<div class="mt">O que a maioria compra</div>
          <div class="flex" style="gap:5px;flex-wrap:wrap;margin-top:5px">
            ${v.comuns.map(x => `<span class="tag">${E(x.item || x.itemCn)} <b>${U.num(x.uso, 1)}%</b></span>`).join('')}
          </div>` : ''}
        ${(v.porSlot || []).length ? `<div class="mt" style="margin-top:11px">Por slot de compra</div>
          <div class="xs" style="margin-bottom:5px">Percentual é quantos jogadores compram aquilo naquele slot;
          o número ao lado é o efeito na taxa de vitória de quem compra. É contagem, não recomendação de
          ninguém — e é por isso que dá para auditar.</div>
          <div class="pilha" style="gap:7px">
            ${v.porSlot.map(sl => `<div class="medida">
              <div class="mt" style="font-size:.7rem">${sl.slot}ª peça</div>
              <div class="pilha" style="gap:3px;margin-top:4px">
                ${sl.opcoes.map(o => `<div class="flex" style="gap:6px;align-items:baseline">
                  <span class="mini" style="flex:1">${E(o.item || o.itemCn)}</span>
                  <span class="xs"><b>${U.num(o.uso, 1)}%</b></span>
                  <span class="xs" style="color:${pctCor(o.deltaVitoria)};min-width:44px;text-align:right">${
                    o.deltaVitoria == null ? '—' : sinal(o.deltaVitoria)}</span>
                </div>`).join('')}
              </div>
            </div>`).join('')}
          </div>` : ''}
        ${(v.itensVitoria || []).length ? `<div class="mt" style="margin-top:11px">Vitória por item</div>
          <div class="pilha" style="gap:3px;margin-top:4px">
            ${v.itensVitoria.map(x => `<div class="flex" style="gap:6px;align-items:baseline">
              <span class="mini" style="flex:1">${E(x.item || x.itemCn)}</span>
              <span class="xs">uso ${U.num(x.uso, 1)}%</span>
              <span class="xs"><b>${U.num(x.vitoria, 1)}%</b></span></div>`).join('')}
          </div>` : ''}
        ${selo(b)}`;
    }

    if (sec.id === 'counters') {
      const c = HE.campo(h, 'counters');
      if (!c.tem) return falta('counters');
      const bloco = (t, arr, cls) => {
        const lista = (arr && arr.itens) || arr || [];
        return `<div class="mt" style="margin-top:9px">${t}</div>
        ${lista.length ? `<div class="pilha" style="gap:3px;margin-top:4px">
          ${lista.map(x => `<div class="flex" style="gap:6px;align-items:baseline">
            <span class="tag ${cls}">${E(x.nome || HE.rotularCn(x.nomeCn))}</span>
            <div class="espaco"></div>
            ${x.delta != null ? `<span class="xs" style="color:${pctCor(x.delta)}"><b>${sinal(x.delta)}%</b></span>` : ''}
            ${x.partidas != null ? `<span class="xs">${U.num(x.partidas)} partidas</span>` : ''}
          </div>`).join('')}</div>`
        : `<div class="xs" style="margin-top:3px">${HE.SEM_DADO}</div>`}`;
      };
      const naoMap = HE.nomesNaoMapeados([...(c.v.forteContra && c.v.forteContra.itens || []),
                                          ...(c.v.fracoContra && c.v.fracoContra.itens || [])]);
      return `${bloco('Forte contra · 克制的英雄', c.v.forteContra, 'ok')}
        ${bloco('Fraco contra · 被克制的英雄', c.v.fracoContra, 'bad')}
        ${c.v.nota ? `<div class="xs" style="margin-top:8px">${E(c.v.nota)}</div>` : ''}
        ${(c.v.naoLidos || []).length ? `<div class="aviso" style="margin-top:8px"><b>Lacunas conhecidas:</b>
          ${c.v.naoLidos.map(x => `${E(x.slot)} (${E(x.porque)})`).join(' · ')}.</div>` : ''}
        ${naoMap.length ? `<div class="aviso" style="margin-top:8px"><b>Nomes que o mapa não reconheceu:</b>
          ${naoMap.map(E).join(' · ')}.
          <div class="xs" style="margin-top:4px">Ficam em chinês de propósito. Adivinhar a correspondência
          renomearia o herói errado e ninguém perceberia.</div></div>` : ''}
        ${selo(c)}`;
    }

    if (sec.id === 'sinergia') {
      const s2 = HE.campo(h, 'synergies');
      if (!s2.tem) return falta('synergies');
      const v = s2.v;
      const bloco = (t, arr, cls) => {
        const lista = (arr && arr.itens) || arr || [];
        if (!lista.length) return '';
        return `<div class="mt" style="margin-top:9px">${t}</div>
          <div class="pilha" style="gap:3px;margin-top:4px">
            ${lista.map(x => `<div class="flex" style="gap:6px;align-items:baseline">
              <span class="tag ${cls}">${E(x.nome || HE.rotularCn(x.nomeCn))}</span><div class="espaco"></div>
              ${x.delta != null ? `<span class="xs" style="color:${pctCor(x.delta)}"><b>${sinal(x.delta)}%</b></span>` : ''}
              ${x.partidas != null ? `<span class="xs">${U.num(x.partidas)} partidas</span>` : ''}
            </div>`).join('')}</div>`;
      };
      return `${bloco('Combina com · 最佳搭档', v.bons || v, 'vio')}
        ${bloco('Combina mal · 较差搭档', v.ruins, 'bad')}
        ${v.nota ? `<div class="xs" style="margin-top:8px">${E(v.nota)}</div>` : ''}
        ${selo(s2)}`;
    }

    if (sec.id === 'duracao') {
      const d = HE.campo(h, 'duracao');
      if (!d.tem) return falta('duracao');
      const v = d.v;
      return `
        ${v.mediaVitoria || v.mediaDerrota ? `<div class="grade g2">
          <div class="kpi"><div class="v" style="color:var(--ok)">${E(v.mediaVitoria || '—')}</div><div class="k">média quando vence</div></div>
          <div class="kpi"><div class="v" style="color:var(--bad)">${E(v.mediaDerrota || '—')}</div><div class="k">média quando perde</div></div>
        </div>` : ''}
        ${(v.faixas || []).length ? `<div class="pilha" style="gap:5px;margin-top:9px">
          ${v.faixas.map(f => `<div>
            <div class="flex" style="gap:6px;align-items:baseline">
              <span class="mini" style="flex:1">${E(f.faixa)}</span>
              <span class="xs">vitória <b>${U.num(f.vitoria, 1)}%</b></span>
              <span class="xs">${U.num(f.fatia, 1)}% das partidas</span>
            </div>
            <div style="height:5px;border-radius:3px;background:var(--line);margin-top:3px;overflow:hidden">
              <div style="height:100%;width:${U.clamp(f.vitoria, 0, 100)}%;background:#3987e5"></div>
            </div>
          </div>`).join('')}</div>` : ''}
        ${selo(d)}`;
    }

    if (sec.id === 'combos') {
      const c = HE.campo(h, 'combos');
      if (!c.tem) return falta('combos');
      return `<div class="pilha" style="gap:8px">${c.v.map(cb => `<div class="medida">
        <div class="flex" style="gap:4px;flex-wrap:wrap;align-items:center">
          ${(cb.seq || []).map((p, i) => `${i ? '<span class="xs" style="opacity:.5">→</span>' : ''}<span class="tag">${E(p)}</span>`).join('')}
        </div>
        ${cb.finalidade ? `<div class="mini" style="margin-top:5px">${E(cb.finalidade)}</div>` : ''}
        <div class="xs" style="margin-top:4px">${cb.dificuldade ? `Dificuldade: <b>${E(cb.dificuldade)}</b> · ` : ''}${cb.situacao ? E(cb.situacao) : ''}</div>
        ${cb.obs ? `<div class="xs" style="margin-top:3px;opacity:.8">${E(cb.obs)}</div>` : ''}
      </div>`).join('')}${selo(c)}</div>`;
    }

    if (sec.id === 'arcana') {
      const a = HE.campo(h, 'arcana');
      if (!a.tem) return falta('arcana');
      const semNome = a.v.filter(x => !x.nome).length;
      return `<div class="flex" style="gap:7px;flex-wrap:wrap">
          ${a.v.map(x => `<div class="kpi" style="min-width:72px"><div class="v">${x.n != null ? x.n : '—'}</div>
            <div class="k">${x.nome ? E(x.nome) : 'sem nome'}</div></div>`).join('')}
        </div>
        ${semNome ? `<div class="aviso" style="margin-top:8px"><b>${semNome} de ${a.v.length} sem nome.</b>
          <div class="xs" style="margin-top:4px">${E((h.lacunas && h.lacunas.arcanaNomes) || '')}</div></div>` : ''}
        <div class="xs" style="margin-top:7px">A fonte prioritária não publica arcana — isto veio de outro
        lugar e está marcado assim.</div>
        ${selo(a)}`;
    }

    if (sec.id === 'estrategia') {
      const ab = HE.campo(h, 'abilities'), e = HE.campo(h, 'strategy');
      return `
        <div class="mt">Habilidades</div>
        ${ab.tem ? `<div class="pilha" style="gap:6px;margin-top:4px">${ab.v.map(a => `<div class="mini">
            <b>${a.tecla ? E(a.tecla) + ' · ' : ''}${E(a.nome || '—')}</b>
            ${a.descricao ? `<div class="xs">${E(a.descricao)}</div>` : ''}</div>`).join('')}</div>${selo(ab)}`
          : falta('abilities')}
        <div class="mt" style="margin-top:11px">Estratégia</div>
        ${e.tem ? `${['cedo', 'meio', 'tarde'].map(f => e.v[f]
            ? `<div class="mini" style="margin-top:5px"><b>${{ cedo: 'Começo', meio: 'Meio', tarde: 'Fim' }[f]}:</b> ${E(e.v[f])}</div>` : '').join('')}
          ${(e.v.dicas || []).length ? `<div class="pilha" style="gap:3px;margin-top:6px">${e.v.dicas.map(d => `<div class="mini">· ${E(d)}</div>`).join('')}</div>` : ''}
          ${selo(e)}` : falta('strategy')}`;
    }
    return '';
  }

  /* ============================================================ */
  const TELAS = {
    agora: [telaAgora, depoisAgora],
    herois: [telaHerois, depoisHerois],
    estado: [telaEstado, depoisEstado],
    progresso: [telaProgresso, depoisProgresso],
    hud: [telaHud, depoisHud],
    metodo: [telaMetodo, () => {}],
    config: [telaConfig, depoisConfig],
  };

  function render(nome = telaAtual) {
    const [tpl, depois] = TELAS[nome] || TELAS.agora;
    if (nome !== 'hud' && mapaSurf) { mapaSurf.destroy(); mapaSurf = null; }
    U.G.esconderDica();
    const alvo = $('#tela-' + nome);
    if (!alvo) return;
    alvo.innerHTML = tpl();
    depois && depois();
  }

  U.UI = { ir, render, toast, modal, fecharModal, verPrincipio, cartoesMedidas, desenharMedidores,
           abrirEixo, abrirPonto,
           get telaAtual() { return telaAtual; } };

})(window.U);
