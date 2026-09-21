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
      <span class="sub">${d.legado ? 'v12 · dados anteriores preservados' : 'v12'}</span>
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
          ${(() => {
            if (!acao || !acao.drill) return '';
            const dr = D.porId(acao.drill);
            const cat = dr && dr.categoria && D.CATEGORIAS[dr.categoria];
            return cat ? `<span class="tag vio">treina: ${U.esc(cat.nome)}</span>` : '';
          })()}
        </div>
        <div class="flex" style="margin-top:10px;gap:8px">
          <button class="btn" style="flex:2" id="ir-agora">${rotulo}</button>
          <button class="btn sec" style="flex:1" id="ir-sessao">Sessão inteira</button>
        </div>
        <div class="xs" style="margin-top:6px">${fase.objetivo}</div>
      </div>

      <div class="painel">
        <h2>Quanto da sua rota de referência voltou</h2>
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
        ${!res.pivo.confiavel ? `<br><br><b style="color:var(--warn)">Este ponto ainda não é confiável</b>, e
        não entra em conta nenhuma: ${U.esc(res.pivo.porqueNaoConfiavel || 'a estimativa está larga demais')}.
        Numa calibração com 200 jogadores simulados, quando o app barra assim o erro chega a 22 mm no
        percentil 90 — longe demais para apontar um ponto na sua tela.`
        : `<br><br><b style="color:var(--ok)">Estimativa dentro da faixa utilizável.</b> Na mesma calibração,
        quando o app libera assim o erro fica em 11 mm no percentil 90, e nenhum caso passou de 18 mm.`}</div>
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
        <div class="xs" style="margin-top:6px">${U.esc(r.avisoModelo)}</div>
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
        <h2>O que o sistema treina</h2>
        <div class="mini">Não existe uma lista de exercícios para você escolher — quem escolhe é o treinador,
        olhando o que está mais atrasado agora (ver "Como o sistema decide", na Config). Mas cada exercício treina
        UMA coisa com nome, e são estas ${Object.keys(D.CATEGORIAS).length}:</div>
        <div class="pilha" style="gap:8px;margin-top:9px">
          ${Object.entries(D.CATEGORIAS).map(([id, c]) => {
            const drills = D.DRILLS.filter(x => x.categoria === id);
            return `<div class="medida">
              <div class="flex" style="gap:7px;align-items:baseline">
                <span class="mt" style="flex:1">${U.esc(c.nome)}</span>
                <span class="xs">${drills.length} exercício${drills.length === 1 ? '' : 's'}</span>
              </div>
              <div class="mini" style="margin-top:3px">${U.esc(c.descricao)}</div>
              <div class="flex wrap" style="gap:4px;margin-top:6px">
                ${drills.map(x => `<span class="tag${x.heroi ? ' vio' : ''}" style="font-size:.56rem">${U.esc(x.nome)}</span>`).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
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

      ${(() => {
        const kit = U.HE && U.HE.kitDoTreino ? U.HE.kitDoTreino() : null;
        /* o botão continua sendo 1/2/3 — é o que o polegar aperta —
           mas ao lado dele vem o nome de verdade, quando o banco tem */
        const nomeDe = (k) => kit && kit.botoes[k] ? kit.botoes[k].nome : null;
        return `<div class="painel">
        <h2>Rotas de combo — Jing</h2>
        <div class="mini" style="margin-bottom:7px">As oito categorias de treino (Mecânica, Precisão, Percepção,
        Reflexo, Movimentação e as outras — ver a aba Método) valem para o sistema inteiro. Esta lista é o que é
        necessariamente por herói: a sequência de botões que o exercício de Mecânica/Precisão pratica quando o
        herói ativo é a Jing. Nomeadas pela função para continuarem válidas se a build ou o
        patch mudarem. A rota <b>Marca</b> é a de referência: mexer nela reinicia a comparação histórica.</div>
        <div class="pilha" style="gap:6px">
          ${rotas.map(r => `<div class="item" data-rota="${r.id}">
            <div class="ic">${r.prio}</div>
            <div class="txt"><b>${r.nome} — ${r.seq.map(k => (H.getHud()[k] || {}).curto || k).join(' › ')}</b><span>${r.porque}</span></div>
            <span class="tag">${r.id === 'marca' ? 'referência' : 'editar'}</span>
          </div>`).join('')}
        </div>
        ${kit ? `<div class="sep"></div>
          <div class="mt">Que botão é que, no ${U.esc(kit.nome)}</div>
          <div class="grade" style="grid-template-columns:repeat(2,1fr);gap:6px;margin-top:6px">
            ${['pass', 's1', 's2', 's3'].filter(k => kit.botoes[k]).map(k => `<div class="medida" style="padding:7px 9px">
              <div class="flex" style="gap:7px;align-items:baseline">
                <span class="tag" style="font-size:.56rem">${(H.getHud()[k] || {}).curto || k}</span>
                <span class="mini" style="color:var(--txt);font-weight:700;flex:1">${U.esc(kit.botoes[k].nome)}</span>
                ${kit.botoes[k].disputa ? '<span class="tag warn" style="font-size:.5rem">em disputa</span>' : ''}
              </div>
            </div>`).join('')}
          </div>
          ${kit.soltas.length ? `<div class="aviso ${kit.ordemIncerta ? 'bad' : ''}" style="margin-top:7px">
            <b>${kit.ordemIncerta
              ? 'Não dá para dizer qual botão é qual neste herói.'
              : 'Este herói tem quatro habilidades ativas.'}</b>
            ${U.esc(kit.porqueSoltas)}, então
            ${kit.soltas.map(x => `<b>${U.esc(x.nome || 'a habilidade ' + x.slot)}</b>`).join(' e ')}
            ${kit.soltas.length > 1 ? 'ficaram' : 'ficou'} sem botão para casar.
            Forçar um casamento aqui faria o treino medir o toque errado.</div>` : ''}
          <div class="xs" style="margin-top:6px">Nome vindo do banco de heróis (busca na web, não lida de página).
          O treino continua medindo o BOTÃO — o nome é só para você não ter que traduzir "habilidade 2" de cabeça
          enquanto joga.</div>` : ''}
      </div>`;
      })()}

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

  /* ============================================================
     HERÓIS — a central de dados
     ------------------------------------------------------------
     A primeira versão desta tela abria com um muro de texto sobre
     proxy, 403 e transcrição. Isso é problema MEU, não seu, e
     estava ocupando o lugar do que você veio ver. Você disse que
     não entendeu nada, e estava certo.

     Regra desta versão: o que interessa primeiro. Quem está forte,
     como está o seu herói, quem banir. A procedência de cada
     número continua inteira — ela só desceu para o fim, onde quem
     quiser auditar encontra.
     ============================================================ */
  let hf = { f: null, q: '', ord: 'bp', dir: -1, aba: 'ranking', iord: 'nome', soKit: false, icat: null };

  const COL = {
    vitoria:    { nome: 'Vitória',    curto: 'VIT', get: h => h.estatisticas && h.estatisticas.vitoria.v,
                  ref: 50, sufixo: '%', ajuda: 'De cada 100 partidas com ele, quantas terminam em vitória. 50% é o equilíbrio.' },
    escolha:    { nome: 'Escolha',    curto: 'ESC', get: h => h.estatisticas && h.estatisticas.escolha.v,
                  sufixo: '%', ajuda: 'Em quantas partidas ele é escolhido. Alto quer dizer popular, não quer dizer bom.' },
    banimento:  { nome: 'Banimento',  curto: 'BAN', get: h => h.estatisticas && h.estatisticas.banimento.v,
                  sufixo: '%', ajuda: 'Em quantas partidas ele é banido. É o que o jogo de alto nível teme.' },
    bp:         { nome: 'Escolhido ou banido', curto: 'BP', get: h => h.estatisticas && h.estatisticas.bp,
                  sufixo: '%', ajuda: 'Escolhido OU banido. É a medida de quanto ele importa na fase de escolha — a mais próxima de "está forte agora".' },
    participacao:{ nome: 'Presença em luta', curto: 'LUTA', get: h => h.estatisticas && h.estatisticas.participacao,
                  sufixo: '%', ajuda: 'Em quantas mortes da equipe ele estava presente.' },
    dano:       { nome: 'Fatia do dano', curto: 'DANO', get: h => h.estatisticas && h.estatisticas.dano,
                  sufixo: '%', ajuda: 'Quanto do dano da equipe sai dele.' },
    tier:       { nome: 'Tier',       curto: 'TIER', get: h => h.tier && h.tier.pontos,
                  sufixo: '', ajuda: 'Pontuação da tier list do site. O próprio site marca essa lista como algoritmo em teste.' },
  };
  const ORDEM_TIER = { 'T0': 0, 'T0.5': 1, 'T1': 2, 'T2': 3, 'T3': 4 };

  function comDados() {
    return U.HE.todos().filter(h => h.estatisticas || h.tier);
  }
  function listaFiltrada() {
    const HE = U.HE;
    let l = hf.q ? HE.buscar(hf.q) : HE.todos();
    if (hf.f) l = l.filter(h => HE.temFuncao(h, hf.f));
    l = l.filter(h => h.estatisticas || h.tier);
    if (hf.soKit) l = l.filter(h => (h.abilities || []).length);
    const c = COL[hf.ord];
    l.sort((a, b) => {
      const va = c.get(a), vb = c.get(b);
      if (va == null && vb == null) return a.name.localeCompare(b.name, 'pt');
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * hf.dir;
    });
    return l;
  }

  /** Barra de magnitude: um hue só, com marca de referência quando faz sentido. */
  function barra(v, max, ref) {
    const pct = U.clamp((v / max) * 100, 0, 100);
    const refPct = ref != null ? U.clamp((ref / max) * 100, 0, 100) : null;
    return `<div class="barh">
      <div class="barh-v" style="width:${pct.toFixed(1)}%"></div>
      ${refPct != null ? `<div class="barh-ref" style="left:${refPct.toFixed(1)}%"></div>` : ''}
    </div>`;
  }

  /* Taxa de vitória vive entre 45% e 55%. Barra a partir do zero
     nesse intervalo desenha sessenta barras iguais e esconde
     justamente a diferença que interessa. Onde a métrica tem um
     ponto de equilíbrio declarado — 50% quer dizer "nem ganha nem
     perde" —, a barra passa a medir o desvio em relação a ele,
     para os dois lados do mesmo risco. Isso não é barra cortada:
     é outra grandeza, a distância até o equilíbrio. */
  function barraDesvio(v, ref, amp) {
    const d = U.clamp((v - ref) / (amp || 1), -1, 1);
    const larg = Math.abs(d) * 50;
    const esq = d >= 0 ? 50 : 50 - larg;
    return `<div class="barh dv">
      <div class="barh-v ${d < 0 ? 'neg' : ''}" style="left:${esq.toFixed(1)}%;width:${larg.toFixed(1)}%"></div>
      <div class="barh-ref" style="left:50%"></div>
    </div>`;
  }

  /** Escolhe a codificação certa para a métrica k. */
  function barraDe(k, v, ctx) {
    const c = COL[k];
    if (c.ref != null && ctx.amp != null) return barraDesvio(v, c.ref, ctx.amp);
    return barra(v, ctx.max, c.ref);
  }

  /** Contexto de escala de uma métrica dentro de um universo de heróis. */
  function escala(k, univ) {
    const vs = univ.map(h => COL[k].get(h)).filter(v => v != null);
    const max = vs.length ? Math.max(...vs) : 100;
    const amp = COL[k].ref != null && vs.length
      ? Math.max(...vs.map(v => Math.abs(v - COL[k].ref))) : null;
    return { max, amp, media: vs.length ? U.mean(vs) : null, n: vs.length };
  }

  /* Uma barra só para as três sub-telas. Antes cada uma tinha o seu
     próprio jeito de voltar, e de Itens não dava para chegar em Dados
     sem passar pelo meio — que é como se perde alguém numa aba. */
  function cabecalhoH(atual, sub) {
    const A = [['ranking', 'Heróis'], ['itens', 'Itens'], ['importar', 'Dados']];
    const cur = A.find(a => a[0] === atual) || A[0];
    return `<div class="topo"><h1>❖ ${cur[1]}</h1>
      ${sub ? `<span class="sub">${sub}</span>` : ''}
      <div class="espaco"></div>
      <div class="flex" style="gap:6px">
        ${A.filter(a => a[0] !== atual).map(a =>
          `<button class="btn sec sm" data-haba="${a[0]}">${a[1]}</button>`).join('')}
      </div></div>`;
  }

  function telaHerois() {
    const HE = U.HE, E = U.esc;
    if (!HE) return '<div class="painel"><div class="mini">Módulo de heróis não carregou.</div></div>';
    if (hf.aba === 'importar') return telaImportar(HE.panorama());
    if (hf.aba === 'itens') return telaItens();

    const meus = HE.noTreino().map(x => HE.porId(x.id)).filter(Boolean);
    const destaque = meus[0] || HE.porId('jing');
    const lista = listaFiltrada();
    const todosComEst = comDados().filter(h => h.estatisticas);
    const esc = {};
    for (const k in COL) esc[k] = escala(k, todosComEst);
    /* a coluna da direita mostra outra coisa: repetir a métrica que já
       está na barra gasta espaço para dizer o que já foi dito */
    const extras = ['vitoria', 'banimento', 'escolha'].filter(k => k !== hf.ord).slice(0, 2);
    const comKit = comDados().filter(h => (h.abilities || []).length);

    return `
    ${cabecalhoH('ranking')}
    <div class="rolagem pilha">

      ${destaque ? fichaRapida(destaque, todosComEst) : ''}

      ${destaques(todosComEst)}

      <div class="painel">
        <div class="flex" style="gap:8px;align-items:center">
          <h2 style="margin:0">Ranking</h2><div class="espaco"></div>
          <span class="xs">${lista.length} ${lista.length === 1 ? 'herói' : 'heróis'} com dado</span>
        </div>
        <div class="xs" style="margin-top:3px">Toque em qualquer linha para abrir a ficha do herói.</div>
        <input class="campo" id="hero-busca" placeholder="Buscar herói…" value="${E(hf.q)}" style="margin-top:8px">
        <div class="grade" style="grid-template-columns:repeat(6,1fr);gap:5px;margin-top:7px">
          <button class="btn sec sm ${!hf.f ? 'gold' : ''}" data-hfun="">TODOS</button>
          ${HE.FUNCOES.map(f => `<button class="btn sec sm ${hf.f === f.id ? 'gold' : ''}" data-hfun="${f.id}">${f.nome}</button>`).join('')}
        </div>
        <div class="flex" style="gap:5px;margin-top:7px">
          <button class="btn sec sm ${hf.soKit ? 'gold' : ''}" data-hkit="1"
            style="padding:0 10px;font-size:.66rem">${hf.soKit ? '✓ ' : ''}só com kit</button>
          <span class="xs" style="flex:1;align-self:center">${comKit.length} de ${comDados().length} heróis com habilidade no banco</span>
        </div>
        <div class="flex" style="gap:4px;flex-wrap:wrap;margin-top:7px">
          ${Object.entries(COL).map(([k, c]) =>
            `<button class="btn sec sm ${hf.ord === k ? 'gold' : ''}" data-hord="${k}"
               style="padding:4px 8px;font-size:.62rem">${c.curto}${hf.ord === k ? (hf.dir < 0 ? ' ↓' : ' ↑') : ''}</button>`).join('')}
        </div>
        <div class="xs" style="margin-top:6px">${E(COL[hf.ord].ajuda)}
          ${COL[hf.ord].ref != null
            ? `<br>A barra mede a <b>distância até ${COL[hf.ord].ref}${COL[hf.ord].sufixo}</b>:
               para a direita quem está acima, para a esquerda quem está abaixo.`
            : `<br>A barra é o valor em si, do zero até o maior da lista
               (${U.num(esc[hf.ord].max, 1)}${COL[hf.ord].sufixo}).`}</div>

        <div class="tabh" style="margin-top:9px">
          ${lista.slice(0, 60).map((h, i) => {
            const e = h.estatisticas;
            const v = COL[hf.ord].get(h);
            return `<div class="linh" data-heroi="${E(h.id)}">
              <div class="linh-n">${i + 1}</div>
              <div class="linh-selo">${U.EM.selo(h, 24)}</div>
              <div class="linh-nome">
                <div class="flex" style="gap:5px;align-items:baseline">
                  <div class="mt" style="font-size:.74rem">${E(h.name)}</div>
                  ${(h.abilities || []).length ? '<span class="pk" title="tem habilidades no banco">kit</span>' : ''}
                </div>
                <div class="xs">${(() => {
                  const ob = hf.q ? HE.ondeBateu(h, hf.q) : null;
                  if (ob) return `achou em <b style="color:var(--gold)">${E(ob.a.nome || 'habilidade ' + ob.a.slot)}</b>`;
                  return (h.role || []).map(r => (HE.FUNCOES.find(f => f.alt.includes(r)) || { nome: r }).nome).join(' · ') || '—';
                })()}</div>
              </div>
              ${h.tier ? `<span class="tierb t${(h.tier.lista || '').replace('.', '')}">${E(h.tier.lista)}</span>` : '<span class="tierb vazio">—</span>'}
              <div class="linh-bar">
                ${v != null ? barraDe(hf.ord, v, esc[hf.ord]) : '<div class="barh"></div>'}
                <div class="linh-num">${v != null ? U.num(v, 1) + COL[hf.ord].sufixo : '—'}</div>
              </div>
              ${e ? `<div class="linh-extra">
                ${extras.map(k => { const ev = COL[k].get(h);
                  return `<span>${ev == null ? '—' : U.num(ev, 1)}<i>${COL[k].curto.toLowerCase()}</i></span>`;
                }).join('')}
              </div>` : '<div class="linh-extra"></div>'}
            </div>`;
          }).join('')}
        </div>
        ${lista.length > 60 ? `<div class="xs" style="margin-top:7px">Mostrando os 60 primeiros de ${lista.length}. Use a busca ou o filtro de rota.</div>` : ''}
        ${!lista.length ? `<div class="aviso" style="margin-top:8px">Nenhum herói com dado nesse filtro.
          ${hf.f ? 'A função só está preenchida onde foi lida da fonte — quem está sem função não aparece em filtro de rota.' : ''}</div>` : ''}
      </div>

      ${tierVisual()}

      <div class="painel">
        <h2>De onde vêm estes números</h2>
        <div class="mini">Tudo o que você viu acima veio do <b>pvp.mcxssg.net</b>, o site que você indicou —
        transcrito das capturas de tela que você enviou, porque a máquina onde este app foi montado não
        consegue abrir aquele domínio. Dados de <b>${E(HE.STATS ? HE.STATS.data : '—')}</b>, modo
        <b>${E(HE.STATS ? HE.STATS.modo : '—')}</b>.
        <br><br>Transcrição de imagem erra às vezes, então nada aqui está marcado como conferido. A tela de
        <b>Dados</b> tem o caminho para substituir tudo isto por dado de primeira mão — inclusive o botão de
        exportar que existe no próprio site.</div>
        <button class="btn sec sm full" data-haba="importar" style="margin-top:9px">Ver procedência e importar</button>
      </div>
    </div>`;
  }

  /* ---- o seu herói, em cima de tudo ---- */
  function fichaRapida(h, universo) {
    const E = U.esc, e = h.estatisticas;
    const pos = (k) => {
      if (!e) return null;
      const v = COL[k].get(h);
      if (v == null) return null;
      const ord = universo.map(x => COL[k].get(x)).filter(x => x != null).sort((a, b) => b - a);
      return { r: ord.indexOf(v) + 1, de: ord.length };
    };
    return `
      <div class="painel hero">
        <div class="flex" style="gap:10px;align-items:flex-start">
          <div style="flex:0 0 auto">${U.EM.selo(h, 46)}</div>
          <div style="flex:1;min-width:0">
            <div class="mini" style="color:var(--gold);font-weight:800;letter-spacing:.08em;text-transform:uppercase">O seu herói</div>
            <h2 class="heroT" style="margin-top:1px">${E(h.name)}${h.nomeCn ? ` <span style="font-size:.7em;opacity:.6">${E(h.nomeCn)}</span>` : ''}</h2>
            <div class="mini">${h.titulo ? E(h.titulo) + ' · ' : ''}${(h.role || []).map(r =>
              (U.HE.FUNCOES.find(f => f.alt.includes(r)) || { nome: r }).nome).join(' · ')}</div>
          </div>
          ${h.tier ? `<div style="text-align:center">
            <div class="tierb t${(h.tier.lista || '').replace('.', '')}" style="font-size:.9rem;padding:5px 11px">${E(h.tier.lista)}</div>
            <div class="xs" style="margin-top:3px">${U.num(h.tier.pontos, 1)} pts</div>
          </div>` : ''}
        </div>
        ${e ? `${[['vitoria', 'vitória'], ['escolha', 'escolha'], ['banimento', 'banimento'],
                   ['bp', 'esc. ou ban.'], ['participacao', 'presença em luta'], ['dano', 'fatia do dano']]
            .reduce((acc, x, i) => { (acc[i < 3 ? 0 : 1] = acc[i < 3 ? 0 : 1] || []).push(x); return acc; }, [])
            .map((linha, li) => `<div class="grade g3" style="margin-top:${li ? 6 : 10}px">
              ${linha.map(([k, rot]) => { const p = pos(k), v = COL[k].get(h);
                return `<div class="kpi">
                  <div class="v"${li ? ' style="font-size:1rem"' : ''}>${U.num(v, 1)}<span class="de">%</span></div>
                  <div class="k">${rot}</div>
                  <div class="xs">${p ? `${p.r}º de ${p.de}` : '&nbsp;'}</div></div>`;
              }).join('')}
            </div>`).join('')}
          <div class="xs" style="margin-top:7px">Posição <b>${e.posicao}º</b> na tabela do site por
          escolhido-ou-banido · dados de ${E(e.data)}</div>`
        : `<div class="aviso" style="margin-top:9px">Ainda não tenho os números deste herói.
           A página individual dele no site não foi capturada.</div>`}
        <button class="btn full sm" data-heroi="${E(h.id)}" style="margin-top:10px">Abrir ficha completa</button>
      </div>`;
  }

  /* ---- leituras rápidas ---- */
  function destaques(univ) {
    if (univ.length < 5) return '';
    const E = U.esc;
    const top = (k, n = 3) => univ.slice().sort((a, b) => COL[k].get(b) - COL[k].get(a)).slice(0, n);
    const bloco = (titulo, k, porque) => `<div>
      <div class="mt" style="font-size:.7rem">${titulo}</div>
      <div class="pilha" style="gap:3px;margin-top:4px">
        ${top(k).map(h => `<div class="flex" style="gap:6px;align-items:center;cursor:pointer" data-heroi="${E(h.id)}">
          ${U.EM.selo(h, 18)}
          <span class="mini" style="flex:1">${E(h.name)}</span>
          <span class="xs"><b>${U.num(COL[k].get(h), 1)}%</b></span>
        </div>`).join('')}
      </div>
      <div class="xs" style="margin-top:4px;opacity:.8">${porque}</div>
    </div>`;
    return `<div class="painel">
      <h2>O que está pesando agora</h2>
      <div class="grade g3" style="margin-top:7px;gap:10px">
        ${bloco('Mais banidos', 'banimento', 'O que o jogo de alto nível prefere não enfrentar.')}
        ${bloco('Mais escolhidos', 'escolha', 'Popularidade. Não é o mesmo que força.')}
        ${bloco('Maior vitória', 'vitoria', 'Cuidado: quem é pouco escolhido oscila mais.')}
      </div>
    </div>`;
  }

  /* ---- tier list ----
     Era uma nuvem de etiquetas: 95 nomes embolados, sem ordem
     visível dentro da faixa, sem dizer o que separa T0 de T1, e
     sem jeito de achar os seus. Agora cada faixa é uma faixa de
     verdade — diz quantos tem e de quanto a quanto vai a pontuação
     — e dentro dela os heróis vêm ordenados por ponto, com o selo
     da rota. O filtro de rota do ranking vale aqui também. */
  function tierVisual() {
    const T = U.HE.TIER; if (!T) return '';
    const E = U.esc, HE = U.HE;
    const meus = new Set(HE.noTreino().map(x => x.id));
    const filtrar = (x) => {
      if (!hf.f) return true;
      const h = x.id && HE.porId(x.id);
      return h ? HE.temFuncao(h, hf.f) : false;
    };
    const faixas = T.faixas.map(f => {
      const l = f.herois.filter(filtrar).slice().sort((a, b) => b.pontos - a.pontos);
      return { ...f, l };
    });
    const total = faixas.reduce((a, f) => a + f.l.length, 0);
    const todosPts = T.faixas.flatMap(f => f.herois.map(x => x.pontos));
    const maxPts = Math.max(...todosPts), minPts = Math.min(...todosPts);

    return `<div class="painel">
      <div class="flex" style="gap:8px;align-items:baseline">
        <h2 style="margin:0">Tier list</h2><div class="espaco"></div>
        <span class="xs">${E(T.data)} · ${total} ${total === 1 ? 'herói' : 'heróis'}${hf.f ? ' nesta rota' : ''}</span>
      </div>
      <div class="xs" style="margin-top:4px">${E(T.avisoDaFonte)}</div>
      ${!total ? '<div class="aviso" style="margin-top:8px">Nenhum herói desta rota aparece na tier list — a rota só está preenchida onde foi lida da fonte.</div>' : ''}
      ${faixas.filter(f => f.l.length).map(f => {
        const pts = f.l.map(x => x.pontos);
        const lo = Math.min(...pts), hi = Math.max(...pts);
        return `<div class="faixa">
          <div class="faixa-c">
            <span class="tierb t${f.id.replace('.', '')}" style="font-size:.7rem;padding:4px 9px">${E(f.id)}</span>
            <div class="xs" style="margin-top:4px;text-align:center">${f.l.length}</div>
            <div class="xs" style="text-align:center;opacity:.75">${U.num(lo, 1)}–${U.num(hi, 1)}</div>
          </div>
          <div class="faixa-l">
            ${f.l.map(x => {
              const h = x.id && HE.porId(x.id);
              const forca = U.clamp((x.pontos - minPts) / Math.max(1, maxPts - minPts), 0, 1);
              if (!h) return `<span class="chipH cn" title="nome da fonte sem correspondência na sua lista">
                <span class="chipH-n">${E(x.nomeCn)}</span><b>${U.num(x.pontos, 1)}</b></span>`;
              return `<span class="chipH ${meus.has(h.id) ? 'meu' : ''}" data-heroi="${E(h.id)}">
                ${U.EM.selo(h, 18)}
                <span class="chipH-n">${E(h.name)}</span><b>${U.num(x.pontos, 1)}</b>
                <i style="width:${(forca * 100).toFixed(0)}%"></i></span>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
      <div class="xs" style="margin-top:9px">A barrinha embaixo de cada nome é a pontuação dentro do intervalo
      inteiro da lista (${U.num(minPts, 1)} a ${U.num(maxPts, 1)}) — serve para comparar dentro da faixa, onde
      o selo T0 sozinho não separa ninguém. Os nomes em chinês, sem selo, existem na fonte e não na sua lista:
      adivinhar o nome internacional deles renomearia o herói errado.</div>
    </div>`;
  }

  /* ---- itens ----
     Com nome, preço, passiva, categoria e procedência, cartão grande
     seria nove rolagens. Aqui é lista compacta, ordenável e filtrável,
     com barra de preço — porque o que se faz com preço é comparar.
     A passiva abre embaixo da linha, junto da fonte e da confiança. */
  const CAT_ITEM = { fisico: 'Físico', magico: 'Mágico', defesa: 'Defesa', movimento: 'Botas',
                     selva: 'Selva', roaming: 'Roaming', componente: 'Componente' };

  function telaItens() {
    const I = U.HE.ITENS, E = U.esc;
    if (!I) return '<div class="painel"><div class="mini">Catálogo não carregou.</div></div>';
    const q = (hf.q || '').toLowerCase();
    let lista = I.lista.slice();
    if (hf.icat) lista = lista.filter(x => x.categoriaItem === hf.icat);
    if (q) lista = lista.filter(x => x.nome.toLowerCase().includes(q)
      || (x.efeito || '').toLowerCase().includes(q));
    if (hf.iord === 'preco') {
      lista.sort((a, b) => (b.preco == null ? -1 : b.preco) - (a.preco == null ? -1 : a.preco));
    } else {
      lista.sort((a, b) => a.nome.localeCompare(b.nome, 'en'));
    }
    const precos = I.lista.map(x => x.preco).filter(v => v != null);
    const maxP = precos.length ? Math.max(...precos) : 1;
    const semPreco = I.lista.length - precos.length;
    const comCat = Object.keys(CAT_ITEM).filter(c => I.lista.some(x => x.categoriaItem === c));

    return `
    ${cabecalhoH('itens')}
    <div class="rolagem pilha">
      <div class="painel">
        <div class="flex" style="gap:8px;align-items:center">
          <h2 style="margin:0">${I.lista.length} itens</h2><div class="espaco"></div>
          <span class="xs">${E(I.cobertura)}</span>
        </div>
        <input class="campo" id="hero-busca" placeholder="Buscar item ou efeito…" value="${E(hf.q)}">
        <div class="flex wrap" style="gap:5px;margin-top:7px">
          <button class="btn sec sm ${hf.iord !== 'preco' ? 'gold' : ''}" data-hiord="nome" style="padding:0 10px">A–Z</button>
          <button class="btn sec sm ${hf.iord === 'preco' ? 'gold' : ''}" data-hiord="preco" style="padding:0 10px">Mais caro primeiro</button>
          <div class="espaco"></div>
          <span class="xs">${lista.length} na lista${semPreco ? ` · ${semPreco} sem preço lido` : ''} · ${I.lista.filter(x => x.efeito).length} com passiva encontrada</span>
        </div>
        <div class="flex wrap" style="gap:5px;margin-top:6px">
          <button class="btn sec sm ${!hf.icat ? 'gold' : ''}" data-icat="" style="padding:0 10px">Todos</button>
          ${comCat.map(c => `<button class="btn sec sm ${hf.icat === c ? 'gold' : ''}" data-icat="${c}" style="padding:0 10px">${CAT_ITEM[c]}</button>`).join('')}
          <div class="espaco"></div>
          <span class="xs">categoria só existe nos ${I.lista.filter(x => x.categoriaItem).length} achados por busca — os das suas capturas não vinham com ela</span>
        </div>
        <div class="tabh" style="margin-top:9px">
          ${lista.map(it => {
            const confCls = { alta: 'ok', media: 'warn', baixa: 'bad' }[it.confiancaEfeito] || '';
            const dominio = it.urlEfeito ? it.urlEfeito.replace(/^https?:\/\//, '').split('/')[0] : '';
            return `<div class="lini" style="${it.efeito ? 'height:auto' : ''}">
            <div class="lini-nome">${E(it.nome)}</div>
            <div class="linh-bar">
              ${it.preco != null ? barra(it.preco, maxP, null) : '<div class="barh"></div>'}
              <div class="linh-num">${it.preco != null ? U.num(it.preco) : '—'}</div>
            </div>
            <div class="xs" style="text-align:right">
              ${it.categoriaItem ? `<span class="tag" style="font-size:.5rem">${CAT_ITEM[it.categoriaItem] || it.categoriaItem}</span>` : ''}
              ${it.fonteItem === 'busca_web' ? '<span class="tag warn" style="font-size:.5rem">da busca</span>' : ''}
              ${it.obs ? E(it.obs) : ''}</div>
            ${it.efeito ? `<div class="xs" style="grid-column:1/-1;margin-top:4px;padding-top:6px;border-top:1px solid rgba(190,215,255,.08)">
              <span class="tag ${confCls}" style="font-size:.5rem">passiva · confiança ${E(it.confiancaEfeito)}</span>
              <div class="mini" style="margin-top:3px">${E(it.efeito)}</div>
              ${it.notaEfeito ? `<div class="xs" style="margin-top:3px;opacity:.85">${E(it.notaEfeito)}</div>` : ''}
              ${dominio ? `<div class="xs" style="margin-top:3px">fonte: <a href="${E(it.urlEfeito)}" target="_blank" rel="noopener"><code style="font-size:.9em">${E(dominio)}</code></a></div>` : ''}
            </div>` : ''}
          </div>`; }).join('')}
        </div>
        ${!lista.length ? '<div class="aviso" style="margin-top:8px">Nenhum item com esse nome.</div>' : ''}
        <div class="xs" style="margin-top:8px">A barra é o preço em ouro, do zero até o item mais caro
        catalogado (${U.num(maxP)}).</div>
      </div>
      <div class="painel">
        <h2>O que falta neste catálogo</h2>
        <div class="pilha" style="gap:5px">
          ${Object.values(I.lacunas).map(v => `<div class="mini">· ${E(v)}</div>`).join('')}
        </div>
        <div class="xs" style="margin-top:7px">Fonte: <b>${E(I.fonteNome)}</b> — não é a fonte prioritária,
        e está marcado assim.</div>
      </div>
    </div>`;
  }

  /* ============================================================
     DADOS — a tela honesta
     Tudo o que antes abria a aba de heróis está aqui: de onde vem
     cada número, o que a fonte não publica, quem existe lá e não
     na sua lista, e como trocar transcrição por dado de primeira
     mão. Continua inteiro. Só deixou de ser a primeira coisa que
     você vê ao procurar a taxa de vitória da Jing.
     ============================================================ */
  function telaImportar(pan) {
    const HE = U.HE, E = U.esc;
    const fora = HE.foraDoBanco();
    return `
    ${cabecalhoH('importar', `${pan.n} no banco · ${pan.comAlgo} com algum dado`)}
    <div class="rolagem pilha">

      <div class="painel ${pan.daPrioritaria ? '' : 'hero'}">
        <h2>Estado da fonte</h2>
        <div class="aviso ${pan.baixado ? 'ok' : 'bad'}" style="margin-top:8px">
          <b>${E(HE.FONTE_ALVO.nome)}</b> — <b>nada foi baixado de lá.</b>
          ${E(HE.FONTE_ALVO.porque)}
        </div>
        <div class="mini" style="margin-top:7px">
          ${pan.daPrioritaria ? `O que existe da fonte prioritária hoje — <b>${pan.daPrioritaria}
          ${pan.daPrioritaria === 1 ? 'herói' : 'heróis'}</b> — foi <b>transcrito das capturas de tela que
          você enviou</b>. Transcrição de imagem erra às vezes, então está marcado como não conferido e
          qualquer importação substitui.<br><br>` : ''}
          O que <b>não</b> existe: a página individual de cada herói, que é onde moram itens por slot e
          counters com número de amostra. Isso precisa ser capturado página por página.
          <br><br>Enquanto não for, cada campo mostra <b>"${E(HE.SEM_DADO)}"</b> em vez de um palpite.
        </div>
        <div class="grade g3" style="margin-top:9px">
          <div class="kpi"><div class="v">${pan.n}</div><div class="k">heróis</div></div>
          <div class="kpi"><div class="v" style="color:${pan.comAlgo ? 'var(--gold)' : 'var(--dim2)'}">${pan.comAlgo}</div><div class="k">com algum dado</div></div>
          <div class="kpi"><div class="v" style="color:${pan.daPrioritaria ? 'var(--ok)' : 'var(--bad)'}">${pan.daPrioritaria}</div><div class="k">da fonte prioritária</div></div>
        </div>
      </div>

      ${(() => {
        const H = U.HE.HABILIDADES; if (!H) return '';
        const ids = Object.keys(H).filter(k => H[k] && (H[k].lista || H[k].leituras));
        const ok = ids.filter(k => H[k].lista), conf = ids.filter(k => H[k].conflitoTotal);
        const total = U.HE.todos().length;
        return `<div class="painel">
        <h2>Habilidades e passivas — o estado real</h2>
        <div class="aviso bad" style="margin-top:8px">
          <b>Os três links que você mandou estão bloqueados aqui.</b>
          bittopup.com, hokstats.gg e honor-of-kings.fandom.com devolvem 403 no proxy desta sessão.
          liquipedia.net e hokbuild.com também. Não é contornável de dentro do app.
        </div>
        <div class="mini" style="margin-top:7px">O que sobrou foi a <b>busca</b>. Ela não devolve a página:
        devolve título, link e um resumo que a máquina faz dos trechos. É mais fraco do que ler a página, e
        erra de um jeito traiçoeiro — o resumo soa certo mesmo quando está errado. Por isso cada herói aqui
        precisa de <b>duas buscas</b> que concordem, e quando elas discordam o app guarda as duas.</div>
        <div class="grade g3" style="margin-top:9px">
          <div class="kpi"><div class="v" style="color:var(--ok)">${ok.length}</div><div class="k">com kit montado</div></div>
          <div class="kpi"><div class="v" style="color:var(--bad)">${conf.length}</div><div class="k">com leituras que brigam</div></div>
          <div class="kpi"><div class="v" style="color:var(--dim2)">${total - ids.length}</div><div class="k">sem nada ainda</div></div>
        </div>
        <div class="pilha" style="gap:4px;margin-top:9px">
          ${ids.map(k => { const h = U.HE.porId(k); const e = H[k];
            return `<div class="flex" style="gap:7px;align-items:center">
              ${h ? U.EM.selo(h, 18) : ''}
              <span class="mini" style="flex:0 0 5.5rem;color:var(--txt)">${E(h ? h.name : k)}</span>
              <span class="tag ${e.conflitoTotal ? 'bad' : e.lista ? 'ok' : 'warn'}" style="font-size:.52rem">${
                e.conflitoTotal ? 'conflito' : `${e.lista.length} habilidades`}</span>
              <span class="xs" style="flex:1">${e.alerta ? E(e.alerta.slice(0, 90)) + '…' : `cruzado em ${e.buscas} buscas`}</span>
            </div>`; }).join('')}
        </div>
        <div class="xs" style="margin-top:9px"><b>Por que não estão os 117:</b> cada herói custa duas buscas
        para cruzar, e cruzar é o que separa isto de chute. Fazer os 117 no chute levaria um minuto e
        encheria o app de habilidade inventada — que é exatamente o que você proibiu. Se você conseguir
        abrir um daqueles sites e colar o texto na tela de importar, entra na hora e com fonte melhor.</div>
      </div>`;
      })()}

      ${(() => {
        const B = U.HE.BUILDS; if (!B) return '';
        const ids = Object.keys(B.porHeroi);
        const cruz = ids.filter(k => B.porHeroi[k].cruzado);
        const briga = cruz.reduce((a, k) => a + B.porHeroi[k].divergem.length, 0);
        const ressalva = ids.filter(k => B.porHeroi[k].nota);
        return `<div class="painel">
        <h2>Itens por herói — e por que não estão no mesmo lugar dos números</h2>
        <div class="aviso warn" style="margin-top:8px"><b>Isto é opinião de guia, não estatística.</b>
        ${E(B.aviso)}</div>
        <div class="grade g3" style="margin-top:9px">
          <div class="kpi"><div class="v" style="color:var(--ok)">${cruz.length}</div><div class="k">cruzados em 2 buscas</div></div>
          <div class="kpi"><div class="v" style="color:var(--warn)">${ids.length - cruz.length}</div><div class="k">com uma busca só</div></div>
          <div class="kpi"><div class="v" style="color:var(--bad)">${briga + ressalva.length}</div><div class="k">com disputa ou ressalva</div></div>
        </div>
        <div class="mini" style="margin-top:9px"><b>Os cruzados — duas buscas cada</b></div>
        <div class="pilha" style="gap:4px;margin-top:5px">
          ${cruz.map(k => { const h2 = HE.porId(k), b = B.porHeroi[k];
            return `<div class="flex" style="gap:7px;align-items:center">
              ${h2 ? U.EM.selo(h2, 18) : ''}
              <span class="mini" style="flex:0 0 5.5rem;color:var(--txt)">${E(h2 ? h2.name : k)}</span>
              <span class="tag ok" style="font-size:.52rem">${b.concordam.length} confirmados</span>
              ${b.divergem.length ? `<span class="tag bad" style="font-size:.52rem">${b.divergem.length} em disputa</span>` : ''}
              <span class="xs" style="flex:1">cruzado em ${b.buscas} buscas</span>
            </div>`; }).join('')}
        </div>
        ${ressalva.length ? `<div class="mini" style="margin-top:9px"><b>Onde o resumo da busca se atrapalhou</b>
          <span class="xs">— registrado, não limpo</span></div>
          <div class="pilha" style="gap:4px;margin-top:5px">
            ${ressalva.map(k => { const h2 = HE.porId(k);
              return `<div class="xs">• <b style="color:var(--txt)">${E(h2 ? h2.name : k)}</b> — ${E(B.porHeroi[k].nota.slice(0, 120))}…</div>`;
            }).join('')}
          </div>` : ''}
        <div class="xs" style="margin-top:9px"><b>Por que 114 têm uma busca só:</b> você pediu todos os
        personagens. 117 heróis × 2 buscas não cabia, então eles entraram com uma cada — e cada ficha diz
        "uma busca só" em vez de deixar parecer que têm o mesmo lastro dos três cruzados.
        <br><br>${E(B.semOrdem)} O campo <code>builds</code> do banco continua
        VAZIO de propósito: ele é o lugar do 出装推荐 da fonte prioritária, que vem com % de uso e efeito na
        vitória. Enchê-lo com isto faria opinião virar contagem.</div>
      </div>`;
      })()}

      <div class="painel">
        <h2>O que esta fonte não publica</h2>
        <div class="mini" style="margin-top:5px">Nenhuma captura vai trazer os campos abaixo, porque eles
        não existem lá. Estão ditos aqui em vez de virarem campo que nunca preenche:</div>
        <div class="pilha" style="gap:4px;margin-top:7px">
          ${Object.entries(HE.FONTE_ALVO.naoPublica).map(([k, v]) =>
            `<div class="xs"><b style="color:var(--warn)">${E(k)}</b> — ${E(v)}</div>`).join('')}
        </div>
        <div class="xs" style="margin-top:7px">Eu tinha suposto que o site fosse um guia de builds e combos.
        As suas capturas mostraram que ele é uma <b>estação de estatística</b>: ele conta partidas. Isso é
        melhor para auditar e pior para quem queria combo pronto.</div>
      </div>

      ${fora.length ? `<div class="painel">
        <h2>Na fonte, fora da sua lista</h2>
        <div class="mini" style="margin-bottom:6px"><b>${fora.length} heróis</b> aparecem no pvp.mcxssg.net e
        não estão na lista que você me passou. Ficam listados em chinês, sem id inventado — porque foi
        exatamente esse o erro que eu cometi e os testes pegaram: mapear <code>少司缘</code> para um
        <code>shaosiyuan</code> que não existia, e com isso jogar o dado da fonte num herói fantasma.
        Quando você me disser o nome internacional de cada um, eles entram.</div>
        <div class="flex" style="gap:4px;flex-wrap:wrap">
          ${fora.slice(0, 60).map(x => `<span class="tag warn">${E(x.nomeCn)}</span>`).join('')}
        </div>
      </div>` : ''}

      <div class="painel hero">
        <h2 class="heroT">Atalho que você tem e eu não</h2>
        <div class="mini" style="margin-top:5px">A tabela <b>数据</b> do site tem um botão
        <b>导出表格</b> — "exportar tabela" — no canto inferior direito. Baixar por ali e me mandar o
        arquivo vale mais do que qualquer script: é dado de primeira mão, sem transcrição no meio.
        <br><br>Hoje o app tem essa tabela transcrita das suas capturas, com 84 das 88 linhas — as posições
        63 a 66 ficaram entre duas imagens e estão <b>ausentes, não estimadas</b>.</div>
      </div>

      <div class="painel">
        <h2>Passo 1 — capturar a página de um herói</h2>
        <div class="mini">Abra <b>${E(HE.FONTE_ALVO.url)}hero/584</b> no navegador, abra o console (F12),
        cole o script abaixo e dê Enter. Ele baixa um <code>.json</code>.
        <br><br>O script foi escrito em cima dos cabeçalhos <b>reais</b> do site, que apareceram nas suas
        capturas — 胜率, 出场率, 禁用率, 克制的英雄, 被克制的英雄, 最佳搭档, 大家常出, 第N件装备,
        装备胜率, 时段胜率. Ele lê o texto da página, que sobrevive a mudança de CSS.</div>
        <textarea class="campo" id="hero-extrator" readonly style="height:110px;font-family:ui-monospace,monospace;font-size:.62rem;margin-top:8px">${E(HE.EXTRATOR)}</textarea>
        <button class="btn sec sm full" id="hero-copiar" style="margin-top:7px">Copiar script</button>
      </div>

      <div class="painel">
        <h2>Passo 2 — colar o JSON</h2>
        <div class="mini">O app <b>confere antes de aceitar</b>: registro sem <code>id</code>, sem
        <code>name</code>, ou com conteúdo sem <code>source</code> declarado é recusado com o motivo.
        Build sem origem não entra.</div>
        <textarea class="campo" id="hero-json" placeholder='{"id":"jing","name":"Jing","builds":[…],"source":"pvp.mcxssg.net","sourceUrl":"https://pvp.mcxssg.net/hero/584","lastUpdated":"2026-09-17"}' style="height:110px;font-family:ui-monospace,monospace;font-size:.66rem;margin-top:8px"></textarea>
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
  "estatisticas": { "vitoria":{"v":51.7}, "escolha":{"v":21.0},
                    "banimento":{"v":40.2}, "bp":61.1,
                    "participacao":64.2, "dano":21.2,
                    "posicao":10, "data":"2026-09-16", "escopo":"巅峰千强" },
  "tier": { "lista":"T0", "pontos":78.5, "data":"2026-09-17" },
  "builds": [ {
      "tipo": "chinesa",           // chinesa | profissional | alternativa | situacional
      "itens": ["…","…"],          // na ORDEM de compra
      "source": "pvp.mcxssg.net",  // obrigatório em toda build
      "sourceUrl": "https://pvp.mcxssg.net/hero/584",
      "lastUpdated": "2026-09-17" } ],
  "arcana": [ { "nome":"…", "n":10 } ],
  "counters": { "forteContra":[{"nome":"…","delta":2.1,"n":900}],
                "fracoContra":[{"nome":"…","delta":-1.8,"n":740}] },
  "synergies": { "bons":[{"nome":"…","delta":1.4}] },
  "source": "pvp.mcxssg.net",
  "sourceUrl": "https://pvp.mcxssg.net/hero/584",
  "lastUpdated": "2026-09-17",
  "fontes": { "builds":"pvp.mcxssg.net", "counters":"pvp.mcxssg.net" }
}</pre>
        <div class="xs" style="margin-top:7px"><code>fontes</code> permite origem diferente por campo — é o
        que deixa você importar a build de um lugar e os counters de outro sem que o app misture os dois na
        hora de dizer de onde veio cada coisa.</div>
      </div>

      <div class="painel">
        <h2>Como este banco se relaciona com o seu treino</h2>
        <div class="mini">Os dois não se misturam, de propósito, e por isso ficam em armazenamentos
        separados:<br><br>
        <b>DADOS DO HERÓI</b> — o que se sabe sobre o personagem. Vem de fora. Vale para qualquer jogador.<br>
        <b>SEU TREINO</b> — as rotas que você pratica e a dificuldade que o sistema mirou.<br>
        <b>SEU DESEMPENHO</b> — os toques, tempos e erros que você produziu.<br>
        <b>SUA MAESTRIA</b> — as medidas e o índice que saem do seu desempenho.<br><br>
        Uma build importada nunca entra numa medida sua; um tempo seu nunca vira dado do herói. O botão
        <b>Adicionar ao treino</b> só cria uma referência por id entre os dois lados.</div>
        ${HE.noTreino().length ? `<div class="mt" style="margin-top:9px">No treino agora</div>
          <div class="flex" style="gap:6px;flex-wrap:wrap;margin-top:5px">
            ${HE.noTreino().map(x => `<span class="tag nome">${E(x.nome)}</span>`).join('')}
          </div>` : ''}
      </div>
    </div>`;
  }

  /* ============================================================
     FICHA DO HERÓI
     Antes eram oito abas, e seis delas diziam "não encontrado".
     Clicar seis vezes para descobrir que não tem nada é castigo.
     Agora é uma rolagem só: o que existe aparece, e o que falta
     fica resumido no fim, numa linha — não em seis telas vazias.
     ============================================================ */
  function abrirHeroi(id) {
    const HE = U.HE, E = U.esc, h = HE.porId(id);
    if (!h) return;
    const univ = HE.todos().filter(x => x.estatisticas);
    const e = h.estatisticas;
    const noTreino = HE.estaNoTreino(id);

    const rank = (k) => {
      if (!e) return null;
      const v = COL[k].get(h); if (v == null) return null;
      const ord = univ.map(x => COL[k].get(x)).filter(x => x != null).sort((a, b) => b - a);
      return { r: ord.indexOf(v) + 1, de: ord.length };
    };
    const linhaNum = (k) => {
      const v = COL[k].get(h); if (v == null) return '';
      const sc = escala(k, univ), r = rank(k);
      return `<div style="margin-top:9px">
        <div class="flex" style="gap:6px;align-items:baseline">
          <span class="mini" style="flex:1">${COL[k].nome}</span>
          <span class="numero" style="font-size:1.05rem">${U.num(v, 1)}<span class="de">${COL[k].sufixo}</span></span>
          ${r ? `<span class="xs">${r.r}º/${r.de}</span>` : ''}
        </div>
        ${sc.amp != null ? barraDesvio(v, COL[k].ref, sc.amp) : barra(v, Math.max(sc.max, v), sc.media)}
        <div class="xs" style="margin-top:2px">${sc.amp != null
          ? `equilíbrio em ${COL[k].ref}${COL[k].sufixo} · ${v >= COL[k].ref ? 'acima' : 'abaixo'} dele por ${U.num(Math.abs(v - COL[k].ref), 1)} ponto${Math.abs(v - COL[k].ref) > 1 ? 's' : ''}`
          : sc.media != null ? `média dos ${sc.n} heróis com dado: ${U.num(sc.media, 1)}${COL[k].sufixo}` : ''}</div>
      </div>`;
    };

    /* o que a fonte não publica x o que ainda não foi capturado */
    const naoPublica = HE.FONTE_ALVO.naoPublica;
    const semDado = [];
    for (const k of ['builds', 'combos', 'arcana', 'abilities', 'strategy', 'counters', 'synergies']) {
      const c = HE.campo(h, k);
      if (c.tem) continue;
      semDado.push({ k, fonte: !!naoPublica[k], porque: naoPublica[k] || (h.lacunas && h.lacunas[k]) || null });
    }
    const rotulo = { builds: 'itens', combos: 'combos', arcana: 'arcana', abilities: 'habilidades',
                     strategy: 'estratégia', counters: 'counters', synergies: 'sinergias' };

    const cnt = HE.campo(h, 'counters'), sin = HE.campo(h, 'synergies'), arc = HE.campo(h, 'arcana');
    const hab = HE.campo(h, 'abilities'), hm = h.habilidadesMeta || {};

    /* O kit vem antes dos números. Você voltou depois de um mês: o
       que a habilidade faz importa mais do que a taxa de banimento
       dela. E a confiança de cada linha fica escrita AO LADO da
       linha, não num rodapé que ninguém lê. */
    const rotuloSlot = (a) => a.slot === 'passiva' ? 'PASSIVA' : a.ult ? 'ULT' : a.slot;
    const habBruto = (HE.HABILIDADES || {})[h.id] || null;

    /* Conflito total: existe informação, e ela se contradiz. Isso
       não é "sem dado" nem "com dado" — é um terceiro estado, e
       fingir que é um dos outros dois é que seria mentira. */
    const blocoConflito = () => {
      if (!habBruto || !habBruto.conflitoTotal) return '';
      return `<div class="sep"></div>
      <div class="flex" style="gap:7px;align-items:baseline">
        <div class="mt" style="flex:1">O kit</div>
        <span class="tag bad" style="font-size:.52rem">duas leituras que não batem</span>
      </div>
      <div class="aviso bad" style="margin-top:7px">${E(habBruto.alerta)}</div>
      <div class="grade" style="grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px">
        ${habBruto.leituras.map(L => `<div class="medida">
          <div class="mt">${E(L.de)}</div>
          <div class="pilha" style="gap:5px;margin-top:5px">
            ${Object.entries(L.slots).map(([k, v]) => `<div class="xs">
              <b style="color:var(--txt)">${k === 'passiva' ? 'P' : k}</b> — ${E(v)}</div>`).join('')}
          </div>
        </div>`).join('')}
      </div>
      <div class="xs" style="margin-top:7px">Montar um kit a partir disto seria escolher uma das duas por
      gosto. As duas ficam à vista até você abrir o jogo e dizer qual é.</div>`;
    };

    const blocoHab = () => {
      if (!hab.tem) return blocoConflito();
      return `<div class="sep"></div>
      <div class="flex" style="gap:7px;align-items:baseline">
        <div class="mt" style="flex:1">O kit</div>
        <span class="tag ${hm.cruzado ? 'ok' : 'warn'}" style="font-size:.52rem">${
          hm.cruzado ? `cruzado em ${hm.buscas} buscas` : 'uma busca só'}</span>
      </div>
      ${habBruto && habBruto.alerta ? `<div class="aviso ${habBruto.ordemIncerta ? 'bad' : ''}" style="margin-top:7px">${E(habBruto.alerta)}</div>` : ''}
      <div class="pilha" style="gap:6px;margin-top:7px">
        ${hab.v.map(a => `<div class="hab ${a.slot === 'passiva' ? 'p' : ''}${a.ult ? ' u' : ''}">
          <div class="hab-t">${E(rotuloSlot(a))}</div>
          <div style="min-width:0">
            <div class="flex" style="gap:6px;align-items:baseline">
              <span class="hab-n">${a.nome ? E(a.nome)
                : '<i style="font-style:normal;font-weight:700;color:var(--dim2)">nome não confirmado</i>'}</span>
              ${a.confianca === 'media' ? '<span class="tag warn" style="font-size:.5rem">leitura em disputa</span>' : ''}
            </div>
            <div class="mini" style="margin-top:2px">${E(a.texto)}</div>
            ${a.variante ? `<div class="varf">
              <span class="tag" style="font-size:.5rem">forma ${E(a.variante.forma)}</span>
              <span class="mini" style="color:var(--txt);font-weight:700">${E(a.variante.nome)}</span>
              <span class="xs" style="flex:1">${E(a.variante.texto)}</span>
            </div>` : ''}
            ${a.numeros ? `<div class="xs" style="margin-top:3px"><b style="color:var(--dim)">Números:</b> ${E(a.numeros)}</div>` : ''}
            ${a.nota ? `<div class="xs" style="margin-top:3px">${E(a.nota)}</div>` : ''}
            ${a.disputa ? `<div class="aviso" style="margin-top:5px;font-size:.62rem">
              <b>Duas leituras, e eu não sei qual está certa.</b>
              <div class="xs" style="margin-top:3px">A — ${E(a.disputa.leituraA)}</div>
              <div class="xs" style="margin-top:2px">B — ${E(a.disputa.leituraB)}</div>
              <div class="xs" style="margin-top:3px">${E(a.disputa.porQueNaoEscolhi)}</div>
            </div>` : ''}
          </div>
        </div>`).join('')}
      </div>
      ${hm.ordemDeUpar ? `<div class="xs" style="margin-top:6px"><b>Ordem de upar:</b>
        ${E(hm.ordemDeUpar.texto)} — ${E(hm.ordemDeUpar.nota || '')}</div>` : ''}
      <div class="xs" style="margin-top:7px">Isto NÃO veio do pvp.mcxssg.net, que não publica habilidade.
      Veio de <b>busca na web</b> — resumo de trechos, não leitura de página, porque os três sites que você
      mandou estão bloqueados aqui. Páginas que a busca apontou:
      ${(hm.urls || []).map(u => `<code style="font-size:.9em">${E(u.replace(/^https?:\/\//, '').split('/')[0])}</code>`).join(' · ')}.</div>`;
    };
    /* Build: opinião de guia, e o rótulo disso fica colado na
       seção inteira. Cada item que existe no catálogo abre a
       passiva dele ali mesmo — que é o ponto de ter os dois
       bancos. O que não existe no catálogo diz que não existe,
       em vez de sumir. */
    const blocoBuild = () => {
      const B = U.HE.BUILDS;
      const b = B && B.porHeroi ? B.porHeroi[h.id] : null;
      if (!b) return '';
      const doCatalogo = (nome) => ((U.HE.ITENS || {}).lista || []).find(x => x.nome === nome) || null;

      const linhaItem = (it, marca) => {
        const cat = it.noCatalogo === true ? doCatalogo(it.nome) : null;
        return `<div class="medida" style="padding:7px 9px">
          <div class="flex" style="gap:6px;align-items:baseline">
            <span class="mini" style="color:var(--txt);font-weight:700;flex:1">${E(it.nome)}</span>
            ${marca ? `<span class="tag warn" style="font-size:.5rem">${E(marca)}</span>` : ''}
            ${it.noCatalogo === false ? '<span class="tag" style="font-size:.5rem">fora do catálogo</span>' : ''}
            ${it.noCatalogo === null ? '<span class="tag bad" style="font-size:.5rem">nome não casa</span>' : ''}
            ${cat && cat.preco != null ? `<span class="xs">${U.num(cat.preco)} ouro</span>` : ''}
          </div>
          <div class="xs" style="margin-top:2px">${E(it.papel)}</div>
          ${cat && cat.efeito ? `<div class="mini" style="margin-top:4px"><b style="color:var(--dim)">Passiva:</b> ${E(cat.efeito)}</div>` : ''}
          ${it.nota ? `<div class="xs" style="margin-top:3px;opacity:.85">${E(it.nota)}</div>` : ''}
        </div>`;
      };

      /* nome solto (herói de uma busca só) vira a mesma linha,
         com o catálogo consultado pelo nome exato */
      const linhaNome = (nome, marca) => {
        const cat = doCatalogo(nome);
        return linhaItem({ nome, papel: cat && cat.categoriaItem ? CAT_ITEM[cat.categoriaItem] || '' : '',
                           noCatalogo: cat ? true : false,
                           nota: cat ? null : 'Não está no seu catálogo de 97 itens.' }, marca);
      };

      const cab = `<div class="sep"></div>
      <div class="flex wrap" style="gap:7px;align-items:baseline">
        <div class="mt" style="flex:1">Itens</div>
        <span class="tag ${b.cruzado ? 'ok' : 'warn'}" style="font-size:.52rem">${
          b.cruzado ? `cruzado em ${b.buscas} buscas` : 'uma busca só'}</span>
        <span class="tag warn" style="font-size:.52rem">opinião de guia</span>
      </div>
      <div class="aviso" style="margin-top:7px">${E(B.aviso)}</div>
      ${b.alerta ? `<div class="aviso" style="margin-top:6px">${E(b.alerta)}</div>` : ''}
      ${b.nota ? `<div class="aviso bad" style="margin-top:6px">${E(b.nota)}</div>` : ''}`;

      const pe = `<div class="xs" style="margin-top:8px"><b>Sem ordem de compra:</b> ${E(B.semOrdem)}
      Páginas que a busca apontou:
      ${(b.urls || []).map(u => `<code style="font-size:.9em">${E(u.replace(/^https?:\/\//, '').split('/')[0])}</code>`).join(' · ')}.</div>`;

      /* herói de UMA busca: lista simples, sem fingir cruzamento */
      if (!b.cruzado) {
        return `${cab}
        ${b.itens && b.itens.length ? `
          <div class="mini" style="margin-top:9px"><b>O que a busca deu como núcleo</b></div>
          <div class="pilha" style="gap:5px;margin-top:5px">
            ${b.itens.map(n => linhaNome(n, null)).join('')}
          </div>` : `<div class="aviso" style="margin-top:8px">A busca não devolveu lista de itens para este herói.</div>`}
        ${b.extras && b.extras.length ? `
          <div class="mini" style="margin-top:9px"><b>Situacionais</b>
            <span class="xs">— a busca chamou de "conforme o confronto"</span></div>
          <div class="flex wrap" style="gap:4px;margin-top:5px">
            ${b.extras.map(n => `<span class="tag nome">${E(n)}</span>`).join('')}
          </div>` : ''}
        <div class="grade" style="grid-template-columns:repeat(3,1fr);gap:8px;margin-top:9px">
          <div class="medida"><div class="mt">Início</div>
            <div class="mini" style="margin-top:3px;color:var(--txt);font-weight:700">${b.inicio ? E(b.inicio) : '<span style="color:var(--dim2);font-weight:400">não veio na busca</span>'}</div></div>
          <div class="medida"><div class="mt">Feitiço</div>
            <div class="mini" style="margin-top:3px;color:var(--txt);font-weight:700">${b.feitico ? E(b.feitico) : '<span style="color:var(--dim2);font-weight:400">não veio na busca</span>'}</div></div>
          <div class="medida"><div class="mt">Arcana</div>
            <div class="mini" style="margin-top:3px;color:var(--txt);font-weight:700">${b.arcana ? E(b.arcana) : '<span style="color:var(--dim2);font-weight:400">não veio na busca</span>'}</div>
            ${b.arcanaNota ? `<div class="xs" style="margin-top:3px">${E(b.arcanaNota)}</div>` : ''}</div>
        </div>
        ${pe}`;
      }

      return `${cab}
      <div class="mini" style="margin-top:9px"><b>As duas buscas deram estes</b></div>
      <div class="pilha" style="gap:5px;margin-top:5px">
        ${b.concordam.map(it => linhaItem(it, null)).join('')}
      </div>

      ${b.soUmaBusca && b.soUmaBusca.length ? `
        <div class="mini" style="margin-top:9px"><b>Só uma busca deu estes</b>
          <span class="xs">— ficam separados de propósito: uma leitura não é cruzamento</span></div>
        <div class="pilha" style="gap:5px;margin-top:5px">
          ${b.soUmaBusca.map(it => linhaItem(it, 'uma busca só')).join('')}
        </div>` : ''}

      ${b.divergem && b.divergem.length ? b.divergem.map(dv => `
        <div class="aviso bad" style="margin-top:8px;font-size:.62rem">
          <b>As duas buscas brigam: ${E(dv.oQue)}.</b>
          <div class="xs" style="margin-top:3px">A — ${E(dv.leituraA)}</div>
          <div class="xs" style="margin-top:2px">B — ${E(dv.leituraB)}</div>
          <div class="xs" style="margin-top:3px">${E(dv.porQueNaoEscolhi)}</div>
        </div>`).join('') : ''}

      <div class="grade" style="grid-template-columns:repeat(2,1fr);gap:8px;margin-top:9px">
        <div class="medida">
          <div class="mt">Feitiço</div>
          <div class="mini" style="margin-top:3px;color:var(--txt);font-weight:700">${E(b.feitico.nome)}</div>
          <div class="xs" style="margin-top:2px">confiança ${E(b.feitico.confianca)} — ${E(b.feitico.nota)}</div>
        </div>
        <div class="medida">
          <div class="mt">Arcana</div>
          <div class="mini" style="margin-top:3px;color:var(--txt);font-weight:700">${E(b.arcana.leitura)}</div>
          <div class="xs" style="margin-top:2px">confiança ${E(b.arcana.confianca)} — ${E(b.arcana.nota)}</div>
          ${b.arcana.conflitoComSuasCapturas ? `<div class="aviso bad" style="margin-top:5px;font-size:.6rem">${E(b.arcana.conflitoComSuasCapturas)}</div>` : ''}
        </div>
      </div>
      ${pe}`;
    };

    /* Nome de adversário que existe na sua lista vira atalho: ler
       "perde para Nezha" e não conseguir abrir o Nezha ali mesmo é
       a mesma frustração de antes em escala menor. Quem não está na
       lista fica como texto — inventar o id renomearia outro herói. */
    const listaAdv = (arr, cls) => {
      const l = (arr && arr.itens) || arr || [];
      if (!l.length) return `<span class="xs">sem dado</span>`;
      return l.map(x => {
        const rot = x.nome || HE.rotularCn(x.nomeCn);
        const alvo = x.id ? HE.porId(x.id) : (HE.buscar(rot) || []).find(y => y.name.toLowerCase() === String(rot).toLowerCase());
        const num = x.delta != null ? ` <b>${x.delta > 0 ? '+' : ''}${U.num(x.delta, 2)}%</b>` : '';
        return alvo
          ? `<span class="tag nome ${cls} liga" data-hx="${E(alvo.id)}">${E(rot)}${num}</span>`
          : `<span class="tag nome ${cls}">${E(rot)}${num}</span>`;
      }).join(' ');
    };

    modal(`
      <div class="flex" style="gap:10px;align-items:flex-start">
        <div style="flex:0 0 auto">${U.EM.selo(h, 42)}</div>
        <div style="flex:1;min-width:0">
          <h2 style="margin:0">${E(h.name)}${h.nomeCn ? ` <span class="xs" style="opacity:.7">${E(h.nomeCn)}</span>` : ''}</h2>
          <div class="mini">${h.titulo ? E(h.titulo) : ''}</div>
          <div class="flex" style="gap:5px;margin-top:5px;flex-wrap:wrap">
            ${(h.role || []).map(r => `<span class="tag">${(HE.FUNCOES.find(f => f.alt.includes(r)) || { nome: r }).nome}</span>`).join('')
              || '<span class="tag warn">função não lida</span>'}
          </div>
        </div>
        ${h.tier ? `<div style="text-align:center">
          <div class="tierb t${(h.tier.lista || '').replace('.', '')}" style="font-size:.85rem;padding:5px 10px">${E(h.tier.lista)}</div>
          <div class="xs" style="margin-top:3px">${U.num(h.tier.pontos, 1)} pts</div></div>` : ''}
      </div>

      ${blocoHab()}

      ${blocoBuild()}

      ${e ? `<div class="sep"></div>
        <div class="mt">Os números</div>
        ${['vitoria', 'escolha', 'banimento', 'bp', 'participacao', 'dano'].map(linhaNum).join('')}
        <div class="xs" style="margin-top:8px">O risco vertical é a referência: o equilíbrio de 50%, na vitória;
        a média dos ${univ.length} heróis com dado, no resto. Fonte: pvp.mcxssg.net, ${E(e.data)}, modo ${E(e.escopo)}.</div>`
        : `<div class="sep"></div><div class="aviso">Ainda não tenho os números deste herói — a página
           individual dele no site não foi capturada.</div>`}

      ${arc.tem && arc.v.length ? `<div class="sep"></div>
        <div class="mt">Arcana</div>
        <div class="flex" style="gap:5px;flex-wrap:wrap;margin-top:5px">
          ${arc.v.map(a => `<span class="tag nome">${a.nome ? E(a.nome) : '<i style="font-style:normal;color:var(--dim2)">nome não lido</i>'} <b>${a.n}</b></span>`).join('')}
        </div>
        <div class="xs" style="margin-top:5px">${arc.v.every(a => !a.nome)
          ? 'A captura mostrava a quantidade de cada peça, não o nome legível dela. A contagem está aqui porque foi lida; o nome não está porque não foi.'
          : ''} Fonte: ${E((arc.fonte && arc.fonte.nome) || arc.fonteId || '—')}.</div>` : ''}

      ${cnt.tem || sin.tem ? `<div class="sep"></div>
        <div class="mt">Confrontos</div>
        ${cnt.tem ? `<div class="mini" style="margin-top:6px">Vence com mais facilidade</div>
          <div class="flex" style="gap:4px;flex-wrap:wrap;margin-top:3px">${listaAdv(cnt.v.forteContra, 'ok')}</div>
          <div class="mini" style="margin-top:7px">Perde com mais facilidade</div>
          <div class="flex" style="gap:4px;flex-wrap:wrap;margin-top:3px">${listaAdv(cnt.v.fracoContra, 'bad')}</div>` : ''}
        ${sin.tem ? `<div class="mini" style="margin-top:7px">Combina com</div>
          <div class="flex" style="gap:4px;flex-wrap:wrap;margin-top:3px">${listaAdv(sin.v.bons || sin.v, 'vio')}</div>` : ''}
        ${cnt.tem && !cnt.prioritaria ? `<div class="xs" style="margin-top:6px">Esta lista veio do app HOK PRO,
          sem número de amostra. O pvp.mcxssg.net publica a mesma coisa com variação de vitória e nº de
          partidas — quando você capturar a página dele, isto é substituído.</div>` : ''}` : ''}

      <div class="sep"></div>
      <div class="mt">O que ainda não tenho deste herói</div>
      <div class="pilha" style="gap:4px;margin-top:5px">
        ${semDado.map(x => `<div class="xs">
          <b>${rotulo[x.k]}</b> — ${x.fonte
            ? `<span style="color:var(--warn)">a fonte não publica isto.</span> ${E(x.porque)}`
            : `falta capturar.${x.porque ? ' ' + E(x.porque) : ''}`}</div>`).join('')
          || '<div class="xs">Nada — este herói está completo.</div>'}
      </div>

      <div class="sep"></div>
      <div class="flex" style="gap:8px">
        <button class="btn sm" id="h-treino" style="flex:1">${noTreino ? 'Remover do treino' : 'Adicionar ao treino'}</button>
        <button class="btn sec sm" data-fecha>Fechar</button>
      </div>
      <div id="h-treino-res" style="margin-top:7px"></div>`,
      (cx) => {
        cx.querySelectorAll('[data-hx]').forEach(el => el.addEventListener('click', () => {
          fecharModal(); setTimeout(() => abrirHeroi(el.dataset.hx), 60);
        }));
        cx.querySelector('#h-treino')?.addEventListener('click', () => {
          if (HE.estaNoTreino(id)) { HE.removerDoTreino(id); toast('Removido do treino'); fecharModal(); render('herois'); return; }
          const r = HE.adicionarAoTreino(id);
          const el = cx.querySelector('#h-treino-res');
          if (!r.ok) { el.innerHTML = `<div class="aviso">${E(r.motivo)}</div>`; return; }
          el.innerHTML = r.aviso
            ? `<div class="aviso bad">${E(r.aviso)}</div>`
            : `<div class="aviso ok"><b>${E(r.herói)}</b> entrou no treino com ${HE.rotasDoTreino(id).n} rotas já definidas.</div>`;
        });
      });
  }

  function depoisHerois() {
    const HE = U.HE;
    $('#hero-busca')?.addEventListener('input', U.debounce((ev) => {
      hf.q = ev.target.value; render('herois');
      const el = $('#hero-busca');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 280));
    $$('[data-hfun]').forEach(b => b.addEventListener('click', () => {
      hf.f = b.dataset.hfun || null; render('herois');
    }));
    $('[data-hkit]')?.addEventListener('click', () => { hf.soKit = !hf.soKit; render('herois'); });
    $$('[data-hiord]').forEach(b => b.addEventListener('click', () => {
      hf.iord = b.dataset.hiord; render('herois');
    }));
    $$('[data-icat]').forEach(b => b.addEventListener('click', () => {
      hf.icat = b.dataset.icat || null; render('herois');
    }));
    $$('[data-hord]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.hord;
      if (hf.ord === k) hf.dir = -hf.dir; else { hf.ord = k; hf.dir = -1; }
      render('herois');
    }));
    $$('[data-haba]').forEach(b => b.addEventListener('click', () => {
      hf.aba = b.dataset.haba; hf.q = ''; render('herois');
    }));
    $$('[data-heroi]').forEach(b => b.addEventListener('click', (ev) => {
      ev.stopPropagation(); abrirHeroi(b.dataset.heroi);
    }));

    $('#hero-copiar')?.addEventListener('click', async () => {
      const t = $('#hero-extrator');
      try { await navigator.clipboard.writeText(t.value); toast('Script copiado', 'ok'); }
      catch (e) { t.select(); toast('Selecionado — copie com Ctrl+C'); }
    });
    $('#hero-importar')?.addEventListener('click', () => {
      const r = HE.importar($('#hero-json').value);
      const el = $('#hero-res');
      if (r.erro) { el.innerHTML = `<div class="aviso bad"><b>Não importei nada.</b> ${U.esc(r.erro)}</div>`; return; }
      el.innerHTML = `
        ${r.aceitos.length ? `<div class="aviso ok"><b>${r.aceitos.length} aceito(s):</b> ${r.aceitos.map(U.esc).join(', ')}</div>` : ''}
        ${r.recusados.length ? `<div class="aviso bad" style="margin-top:6px"><b>${r.recusados.length} recusado(s).</b>
          ${r.recusados.map(x => `<br><b>${U.esc(x.id || '(sem id)')}</b>: ${U.esc(x.erros.join('; '))}`).join('')}
          <br><br>Recusar é o comportamento certo: o que entra sem origem declarada vira, depois, um número
          que ninguém consegue auditar.</div>` : ''}`;
      if (r.aceitos.length) setTimeout(() => render('herois'), 1400);
    });
    $('#hero-exportar')?.addEventListener('click', () => {
      const b = new Blob([HE.exportar()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'espelho-herois.json';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Banco exportado', 'ok');
    });
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
