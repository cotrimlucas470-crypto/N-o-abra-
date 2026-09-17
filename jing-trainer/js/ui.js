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
      <span class="sub">${d.legado ? 'v2 · dados da v1 preservados' : 'v2'}</span>
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
    </div>`;
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
      mapaSurf = new H.HudSurface(cv, { onCalibrado: () => toast('HUD atualizado', 'ok') });
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
        <h2>O que mudou da v1 para a v2</h2>
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
            ${pr.novo ? '<span class="tag vio">novo na v2</span>' : ''}
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

  /* ============================================================ */
  const TELAS = {
    agora: [telaAgora, depoisAgora],
    progresso: [telaProgresso, depoisProgresso],
    hud: [telaHud, depoisHud],
    metodo: [telaMetodo, () => {}],
    config: [telaConfig, depoisConfig],
  };

  function render(nome = telaAtual) {
    const [tpl, depois] = TELAS[nome] || TELAS.agora;
    if (nome !== 'hud' && mapaSurf) { mapaSurf.destroy(); mapaSurf = null; }
    const alvo = $('#tela-' + nome);
    if (!alvo) return;
    alvo.innerHTML = tpl();
    depois && depois();
  }

  U.UI = { ir, render, toast, modal, fecharModal, verPrincipio, cartoesMedidas, desenharMedidores,
           get telaAtual() { return telaAtual; } };

})(window.U);
