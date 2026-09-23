/* ============================================================
   js/cartas.js — CONHEÇA O INIMIGO
   Prática de recuperação espaçada sobre o conhecimento do jogo.

   ------------------------------------------------------------
   POR QUE ESTE É O TREINO COM A MELHOR EVIDÊNCIA DO APP

   Duas técnicas de aprendizagem saíram como "alta utilidade" na
   revisão mais citada da área (Dunlosky et al., 2013), que avaliou
   dez técnicas contra centenas de estudos: PRATICAR RECUPERANDO
   (tentar lembrar a resposta, em vez de reler) e ESPAÇAR (rever em
   intervalos crescentes, em vez de concentrar). As outras oito —
   reler, grifar, resumir… — saíram baixas ou moderadas.

   · Efeito de teste: tentar lembrar retém mais do que estudar de
     novo o mesmo tempo (Roediger & Karpicke, 2006). Meta-análises
     com centenas de comparações confirmam o efeito, médio, e maior
     quando a prova é devolvida com a resposta certa.
   · Espaçamento: com o mesmo tempo total, espalhar as revisões
     retém muito mais, e o intervalo ótimo cresce com o tempo que se
     quer reter (Cepeda et al., 2006; 2008).
   · Reaprendizagem sucessiva: errou, a carta volta na mesma sessão
     até sair certa uma vez, e depois é revista em sessões espaçadas
     (Rawson & Dunlosky, 2011). É a combinação das duas acima.
   · Resposta certa mostrada logo depois: sem ela, uma alternativa
     errada escolhida vira "lembrança" (Butler & Roediger, 2008).

   ------------------------------------------------------------
   O QUE ESTE TREINO NÃO PROMETE

   O efeito é sobre MEMÓRIA, e ali ele é dos mais sólidos da
   psicologia. Que saber o kit do inimigo melhore a sua decisão na
   partida é plausível — você não reage a um ultimate que não sabe
   que existe —, mas não foi testado para jogo nenhum. O app mede
   o que dá para medir: quanto você RETÉM depois de dias.

   ------------------------------------------------------------
   DE ONDE VÊM AS PERGUNTAS

   Só do banco, e só do que tem confiança alta ou média (aba Heróis).
   Nada é escrito à mão aqui, exceto cinco fatos da Jing tirados do
   texto de confiança ALTA da passiva e da build. Carta que vem de
   dado de confiança média diz isso na tela.
   ============================================================ */
'use strict';
(function (U) {
  const { $, $$, esc } = U;

  /* dias até a próxima revisão, por caixa (Leitner, intervalos crescentes) */
  const INTERVALOS = [0, 1, 3, 7, 14, 30, 60];
  const MAX_NOVAS = 6;
  const MAX_SESSAO = 18;
  const TIER_PRIO = { T0: 1, T1: 2, T2: 3 };

  const curto = (t, n = 170) => {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    return t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n - 1) > n * 0.6 ? t.lastIndexOf(' ', n - 1) : n - 1) + '…';
  };
  /* a pergunta "de quem é" não pode trazer a resposta no texto */
  const semNome = (t, nome) => String(t).replace(new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[herói]');
  const nomeHeroi = (id) => { const h = U.HE.porId && U.HE.porId(id); return h ? h.name : id; };
  const rotuloSlot = (s) => s.slot === 'passiva' ? 'a passiva'
    : (s.ult || s.slot === '3') ? 'a ultimate' : `a habilidade ${s.slot}`;

  /* ============================================================
     O BARALHO — gerado do banco a cada abertura
     ============================================================ */
  let _baralho = null;
  function baralho() {
    if (_baralho) return _baralho;
    const out = [];
    const H = (U.HE && U.HE.HABILIDADES) || {};
    const kits = Object.entries(H).filter(([, v]) => v && Array.isArray(v.lista));
    const conf = (c) => c === 'alta' || c === 'media';
    const prioHeroi = (id) => {
      if (id === 'jing') return 0;
      const h = U.HE.porId && U.HE.porId(id);
      return (h && h.tier && TIER_PRIO[h.tier.lista]) || 4;
    };
    const roles = (id) => { const h = U.HE.porId && U.HE.porId(id); return (h && h.role) || []; };

    for (const [id, kit] of kits) {
      const nome = nomeHeroi(id), prio = prioHeroi(id);
      /* distratores: heróis com kit, os de função parecida primeiro —
         errar entre dois assassinos da selva ensina mais que entre um
         assassino e um suporte */
      const outros = kits.map(([k]) => k).filter(k => k !== id);
      const parecidos = outros.slice().sort((a, b) =>
        roles(b).filter(r => roles(id).includes(r)).length - roles(a).filter(r => roles(id).includes(r)).length);

      for (const s of kit.lista) {
        if (!conf(s.confianca) || !s.nome || !s.texto) continue;
        /* textos da mesma posição em outros heróis, cada um sem o nome do
           próprio dono — senão o nome no texto entrega qual é a errada */
        const mesmoSlot = kits.filter(([k]) => k !== id)
          .map(([k, v]) => { const x = v.lista.find(y => y.slot === s.slot && conf(y.confianca) && y.texto);
                             return x ? curto(semNome(x.texto, nomeHeroi(k)), 150) : null; })
          .filter(Boolean);
        out.push({
          id: `quem:${id}:${s.slot}`, tipo: 'quem', heroi: id, prio, conf: s.confianca,
          pergunta: 'De quem é esta habilidade?',
          detalhe: `<b>${esc(s.nome)}</b> — ${esc(curto(semNome(s.texto, nome), 190))}`,
          certa: nome, distr: parecidos.map(nomeHeroi),
          explica: `É ${rotuloSlot(s)} de <b>${esc(nome)}</b>.`,
        });
        if (mesmoSlot.length >= 3) {
          out.push({
            id: `faz:${id}:${s.slot}`, tipo: 'faz', heroi: id, prio: prio + 0.5, conf: s.confianca,
            pergunta: `O que faz ${rotuloSlot(s)} de ${esc(nome)}?`,
            detalhe: `<b>${esc(s.nome)}</b>`,
            certa: curto(semNome(s.texto, nome), 150), distr: mesmoSlot,
            explica: esc(s.texto),
          });
        }
      }
      const ult = kit.lista.find(s => (s.ult || s.slot === '3') && conf(s.confianca) && s.nome);
      const ultsOutros = kits.filter(([k]) => k !== id)
        .map(([, v]) => v.lista.find(s => (s.ult || s.slot === '3') && s.nome)).filter(Boolean).map(s => s.nome);
      if (ult && ultsOutros.length >= 3) {
        out.push({
          id: `ult:${id}`, tipo: 'ult', heroi: id, prio: prio + 0.2, conf: ult.confianca,
          pergunta: `Qual é o ultimate de ${esc(nome)}?`, detalhe: '',
          certa: ult.nome, distr: ultsOutros,
          explica: `<b>${esc(ult.nome)}</b>: ${esc(curto(ult.texto, 220))}`,
        });
      }
    }

    /* itens: "que item faz isto?" — o que decide a compra contra quem */
    const itens = ((U.HE.ITENS || {}).lista || []).filter(x => x.efeito && conf(x.confiancaEfeito));
    for (const it of itens) {
      const n = it.nomePt || it.nome;
      out.push({
        id: `item:${it.nome}`, tipo: 'item', prio: 5, conf: it.confiancaEfeito,
        pergunta: 'Que item faz isto?',
        detalhe: esc(curto(it.efeito, 200)),
        certa: n, distr: itens.filter(x => x !== it).map(x => x.nomePt || x.nome),
        explica: `<b>${esc(n)}</b>${it.nomePt && it.nome !== it.nomePt ? ` (${esc(it.nome)})` : ''}${it.preco ? ` · ${it.preco} de ouro` : ''}.`,
      });
    }

    /* cinco fatos da Jing: do texto de confiança ALTA da passiva e da build */
    const pas = (H.jing && H.jing.lista || []).find(s => s.slot === 'passiva' && s.confianca === 'alta');
    if (pas) {
      const fatos = [
        ['trava', 'Depois que as marcas quebram, a passiva da Jing fica desligada por quanto tempo?', '5 segundos', ['2 segundos', '3 segundos', '8 segundos']],
        ['trava-ult', 'E se as marcas quebrarem DURANTE a ultimate, a passiva fica desligada por quanto tempo?', '2 segundos', ['5 segundos', '1 segundo', 'não desliga']],
        ['reset', 'A quebra das marcas zera a recarga de quais habilidades?', 'Da 1 e da 2 (Reflective Assault e Shattered Illusions)', ['Só da 1', 'Da 1, da 2 e da ultimate', 'Só da ultimate']],
        ['dano', 'A quebra das marcas causa dano igual a…', '4% da vida que FALTA no alvo', ['4% da vida máxima do alvo', '10% da vida que falta no alvo', 'um valor fixo, sem depender do alvo']],
      ];
      for (const [k, p, c, d] of fatos) {
        out.push({ id: `jing:${k}`, tipo: 'jing', heroi: 'jing', prio: 0, conf: 'alta',
                   pergunta: p, detalhe: '', certa: c, distr: d, explica: esc(pas.texto) });
      }
    }
    const bj = U.HE.BUILDS && U.HE.BUILDS.porHeroi && U.HE.BUILDS.porHeroi.jing;
    const fe = bj && bj.feitico;
    if (fe && fe.confianca === 'alta') {
      out.push({ id: 'jing:feitico', tipo: 'jing', heroi: 'jing', prio: 0, conf: 'alta',
                 pergunta: 'Qual feitiço de batalha a Jing leva?', detalhe: '',
                 certa: 'Punir (Smite)', distr: ['Flash', 'Purificar', 'Executar'],
                 explica: 'As duas buscas da build deram o mesmo feitiço: Punir. Ela joga na selva.' });
    }
    out.sort((a, b) => a.prio - b.prio);
    _baralho = out;
    return out;
  }

  /* ============================================================
     AGENDA — Leitner com intervalos crescentes
     ============================================================ */
  const DIA = 86400e3;
  const inicioDoDia = (t = Date.now()) => new Date(t).setHours(0, 0, 0, 0);
  function estado() {
    const d = U.DB.load();
    if (!d.cartas) d.cartas = {};
    if (!d.cartasLog) d.cartasLog = [];
    return d;
  }

  function vencidas(agora = Date.now()) {
    const d = estado(), ids = new Set(baralho().map(c => c.id));
    return Object.entries(d.cartas).filter(([id, s]) => ids.has(id) && s.due <= agora).map(([id]) => id);
  }
  function novasDisponiveis() {
    const d = estado();
    return baralho().filter(c => !d.cartas[c.id]);
  }

  /** Aplica a resposta à agenda. Devolve o novo estado da carta. */
  function agendar(id, ok, primeira) {
    const d = estado();
    const s = d.cartas[id] || { b: 0, n: 0, ok: 0 };
    const antes = s.b, nova = !d.cartas[id];
    if (primeira) {
      s.n++;
      if (ok) {
        /* acertou de primeira: sobe uma caixa (a nova, que já sabia,
           começa na 2 — três dias) */
        s.b = nova ? 2 : Math.min(INTERVALOS.length - 1, s.b + 1);
        s.ok++;
      } else {
        s.b = 1;
      }
      /* um pouco de folga aleatória (±10%) para as revisões não
         caírem todas no mesmo dia */
      const dias = INTERVALOS[s.b] * (s.b >= 3 ? U.rnd(0.9, 1.1) : 1);
      s.due = inicioDoDia() + Math.round(dias * DIA) + 4 * 3600e3;
      s.ult = Date.now();
      d.cartas[id] = s;
      d.cartasLog.push({ t: Date.now(), id, ok: ok ? 1 : 0, b: antes, rev: nova ? 0 : 1 });
      if (d.cartasLog.length > 2000) d.cartasLog = d.cartasLog.slice(-2000);
      U.DB.save();
    }
    return s;
  }

  /* ============================================================
     A MEDIDA: RETENÇÃO DE VERDADE
     Só conta revisão de carta que estava na caixa 2 ou acima — ou
     seja, que ficou pelo menos três dias sem ser vista. Acerto logo
     depois de aprender é desempenho; acerto dias depois é memória.
     ============================================================ */
  function medidas() {
    const d = estado();
    const ids = new Set(baralho().map(c => c.id));
    const rev = d.cartasLog.filter(x => x.rev && x.b >= 2 && ids.has(x.id));
    const ultimas = rev.slice(-60);
    const acertos = ultimas.filter(x => x.ok).length;
    const w = ultimas.length ? U.S.wilson(acertos, ultimas.length) : null;
    const est = Object.entries(d.cartas).filter(([id]) => ids.has(id)).map(([, s]) => s);
    return {
      total: ids.size, vistas: est.length,
      dominadas: est.filter(s => s.b >= 4).length,
      vencidas: vencidas().length,
      retencao: w && ultimas.length >= 10 ? { p: acertos / ultimas.length, lo: w.lo, hi: w.hi, n: ultimas.length } : null,
      nRev: rev.length,
      proxima: est.length ? Math.min(...est.map(s => s.due)) : null,
    };
  }

  /* ============================================================
     A SESSÃO
     ============================================================ */
  let S = null;

  function montarFila() {
    const B = baralho(), porId = new Map(B.map(c => [c.id, c]));
    const d = estado();
    const venc = vencidas().map(id => porId.get(id))
      .sort((a, b) => d.cartas[a.id].due - d.cartas[b.id].due || d.cartas[a.id].b - d.cartas[b.id].b)
      .slice(0, MAX_SESSAO);
    const novas = venc.length < MAX_SESSAO ? novasDisponiveis().slice(0, Math.min(MAX_NOVAS, MAX_SESSAO - venc.length)) : [];
    /* intercala as novas entre as revisões (uma a cada duas) */
    const fila = [];
    let i = 0, j = 0;
    while (i < venc.length || j < novas.length) {
      if (i < venc.length) fila.push({ c: venc[i++], primeira: true });
      if (i < venc.length) fila.push({ c: venc[i++], primeira: true });
      if (j < novas.length) fila.push({ c: novas[j++], primeira: true });
    }
    return fila;
  }

  function opcoes(c) {
    const pool = [...new Set(c.distr.filter(x => x && x !== c.certa))];
    const tres = U.shuffle(pool.slice(0, Math.max(6, Math.min(pool.length, 8)))).slice(0, 3);
    return U.shuffle([c.certa, ...tres]);
  }

  function iniciar(aoFim) {
    const fila = montarFila();
    if (!fila.length) {
      const m = medidas();
      if (!aoFim) U.UI.toast(m.proxima ? `Nenhuma carta vencida. A próxima vence ${quando(m.proxima)}.` : 'Nenhuma carta disponível.');
      return false;
    }
    S = { fila, pos: 0, feitas: 0, primeiras: 0, acertosPrimeira: 0, reaprendidas: 0, aoFim,
          vistasNaSessao: new Set(), inicio: Date.now(), tempos: [] };
    U.T.palco.abrir();
    U.T.palco.faixa('Conheça o inimigo', '<span class="chip">cartas</span>');
    mostrar();
    return true;
  }

  function quando(t) {
    const dias = Math.round((inicioDoDia(t) - inicioDoDia()) / DIA);
    return dias <= 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`;
  }

  function mostrar() {
    if (S.pos >= S.fila.length) return fim();
    const item = S.fila[S.pos], c = item.c;
    const st = estado().cartas[c.id];
    item.ops = opcoes(c);
    item.t0 = U.now();
    const tag = !item.primeira ? '<span class="tag bad">reaprendendo</span>'
      : !st ? '<span class="tag vio">nova</span>'
      : `<span class="tag">revisão · caixa ${st.b}</span>`;
    U.T.palco.painel(`
      <div class="carta">
        <div class="flex" style="gap:6px;align-items:center;flex-wrap:wrap">
          <span class="xs">Carta ${S.pos + 1} de ${S.fila.length}</span> ${tag}
          ${c.conf === 'media' ? '<span class="tag warn" title="dado de confiança média no banco">dado de confiança média</span>' : ''}
        </div>
        <h2 class="carta-p">${c.pergunta}</h2>
        ${c.detalhe ? `<div class="carta-d">${c.detalhe}</div>` : ''}
        <div class="carta-ops">
          ${item.ops.map((o, i) => `<button class="carta-op" data-op="${i}"><i>${'ABCD'[i]}</i><span>${esc(o)}</span></button>`).join('')}
        </div>
        <div id="carta-fb"></div>
      </div>`, [{ txt: 'Parar aqui', cls: 'sec sm', fn: () => fim(true) }]);
    $$('#res .carta-op').forEach(b => b.addEventListener('click', () => responder(+b.dataset.op)));
  }

  function responder(i) {
    const item = S.fila[S.pos];
    if (!item || item.respondida) return;
    item.respondida = true;
    const c = item.c, escolha = item.ops[i], ok = escolha === c.certa;
    const lat = U.now() - item.t0;
    S.tempos.push(lat);
    S.feitas++;
    if (item.primeira) { S.primeiras++; if (ok) S.acertosPrimeira++; }
    const antes = estado().cartas[c.id];
    const s = agendar(c.id, ok, item.primeira);
    ok ? (U.Sfx.perfect(), U.Haptic.good()) : (U.Sfx.miss(), U.Haptic.bad());

    $$('#res .carta-op').forEach((b, k) => {
      b.disabled = true;
      if (item.ops[k] === c.certa) b.classList.add('ok');
      else if (k === i) b.classList.add('bad');
    });

    /* errou: a carta volta três cartas depois, até sair certa uma vez */
    if (!ok) {
      const at = Math.min(S.fila.length, S.pos + 4);
      S.fila.splice(at, 0, { c, primeira: false });
      if (item.primeira) S.reaprendidas++;
    }
    const prox = ok && item.primeira ? `próxima revisão ${quando(s.due)}`
      : ok ? 'reaprendida — volta amanhã'
      : 'volta daqui a pouco nesta sessão, e amanhã de novo';
    $('#carta-fb').innerHTML = `
      <div class="aviso ${ok ? 'ok' : 'bad'}" style="margin-top:8px">
        <b>${ok ? 'Certo.' : 'Não.'}</b> ${c.explica}
        <div class="xs" style="margin-top:4px">${prox}${antes && item.primeira && ok ? ` · caixa ${antes.b} → ${s.b}` : ''}</div>
      </div>`;
    const pe = $('#res .pe'); pe.innerHTML = '';
    const btn = U.el('button', { class: 'btn full', text: S.pos + 1 < S.fila.length ? 'Próxima' : 'Ver resultado' });
    btn.addEventListener('click', () => { S.pos++; mostrar(); });
    pe.appendChild(btn);
    const sair = U.el('button', { class: 'btn sec sm', text: 'Parar aqui' });
    sair.addEventListener('click', () => fim(true));
    pe.appendChild(sair);
    btn.focus();
  }

  function fim(interrompida) {
    const m = medidas();
    const pct = S.primeiras ? Math.round(S.acertosPrimeira / S.primeiras * 100) : null;
    const amanha = Object.values(estado().cartas).filter(s => s.due <= inicioDoDia() + 2 * DIA).length;
    const d = U.DB.load();
    if (d.sessaoAtual) {
      d.sessaoAtual.blocos.push({ drill: 'cartas', mo: 'treino', acc: pct != null ? pct / 100 : null, n: S.primeiras });
      U.DB.save();
    }
    const aoFim = S.aoFim;
    const botoes = [];
    if (aoFim) botoes.push({ txt: 'Continuar', cls: 'full', fn: () => aoFim(m) });
    botoes.push({ txt: 'Encerrar', cls: aoFim ? 'sec sm' : 'full', fn: () => U.T.palco.fechar() });
    U.T.palco.painel(`
      <h2 style="margin:0 0 4px">Conheça o inimigo</h2>
      <div class="flex" style="gap:16px;align-items:flex-start;margin-top:6px">
        <div>
          <div class="numero" style="color:var(--gold)">${pct != null ? pct + '%' : '—'}</div>
          <div class="xs">certas na primeira<br>tentativa (${S.acertosPrimeira}/${S.primeiras})</div>
        </div>
        <div style="flex:1;min-width:0">
          <div class="mini">${S.reaprendidas ? `<b>${S.reaprendidas}</b> carta${S.reaprendidas > 1 ? 's' : ''} errada${S.reaprendidas > 1 ? 's' : ''} voltou até sair certa — e volta amanhã de novo.`
            : 'Nenhuma precisou ser reaprendida.'}${interrompida ? ' Sessão interrompida: o que foi respondido já está agendado.' : ''}</div>
          <div class="mini" style="margin-top:4px">Você já viu <b>${m.vistas} de ${m.total}</b> cartas;
            <b>${m.dominadas}</b> estão dominadas (duas semanas ou mais sem esquecer).
            ${amanha ? `<b>${amanha}</b> ${amanha > 1 ? 'vencem' : 'vence'} até amanhã.` : ''}</div>
          ${m.retencao ? `<div class="mini" style="margin-top:4px">Retenção de verdade — cartas revistas depois de 3 dias
            ou mais: <b>${Math.round(m.retencao.p * 100)}%</b>
            <span class="xs">(intervalo ${Math.round(m.retencao.lo * 100)}–${Math.round(m.retencao.hi * 100)}%, ${m.retencao.n} revisões)</span></div>`
            : `<div class="xs" style="margin-top:4px">A retenção de verdade aparece com 10 revisões de cartas que ficaram 3 dias
            ou mais sem ser vistas (${m.nRev} até agora). Acerto logo depois de aprender é desempenho, não memória.</div>`}
        </div>
      </div>
      <div class="aviso" style="margin-top:9px"><b>Não revise antes da hora.</b> O esquecimento parcial entre uma revisão e
        outra é o que faz a próxima lembrança fixar mais — rever cedo demais rende menos pelo mesmo tempo. O app só traz
        a carta quando ela vence.</div>
      <button class="btn sec sm" style="margin-top:8px" data-princ="recuperacao">Por que isso funciona</button>`, botoes);
    S = null;
  }

  U.CA = { baralho, vencidas, novasDisponiveis, medidas, iniciar, agendar, INTERVALOS,
           _resetBaralho: () => { _baralho = null; } };

})(window.U);
