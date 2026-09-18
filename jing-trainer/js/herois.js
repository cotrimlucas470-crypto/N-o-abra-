/* ============================================================
   herois.js — central de dados dos heróis
   ------------------------------------------------------------
   Isto é um BANCO DE DADOS, não uma tela. A tela lê daqui; os
   registros moram em arquivos separados em dados/herois/.

   REGRA QUE MANDA NO ARQUIVO INTEIRO
   Todo campo carrega a origem dele. Campo sem origem não existe:
   ele é devolvido como "Não encontrado na fonte." e a tela mostra
   isso, em vez de mostrar um palpite com cara de dado.

   Se algum dia este arquivo inventar uma build, ele deixou de
   servir para o que foi feito.

   SOBRE A FONTE PEDIDA
   A fonte prioritária definida por você é pvp.mcxssg.net. Ela não
   pôde ser lida por quem montou este arquivo: o acesso à rede
   desta sessão recusa esse domínio (403 do proxy de saída), tanto
   por download direto quanto por leitor de página. Então os campos
   que só existem lá estão vazios, marcados como vazios, e existe
   um caminho de importação para você preenchê-los — ver IMPORTAR.
   ============================================================ */
'use strict';
(function (U) {

  /* ============================================================
     A FONTE, E O QUE ELA É DE VERDADE
     ------------------------------------------------------------
     Correção importante, feita depois de ver as suas capturas do
     site: eu tinha suposto que pvp.mcxssg.net fosse um guia — com
     build recomendada, combo escrito, dica de estratégia. NÃO É.

     É o 天元之弈数据站, uma ESTAÇÃO DE DADOS. O que ela publica é
     estatística de partida:

       胜率 / 出场率 / 禁用率  taxa de vitória, de escolha, de banimento
       克制的英雄 / 被克制的英雄  contra quem sobe e contra quem cai a sua
                                 taxa de vitória, com o tamanho da amostra
       最佳搭档 / 较差搭档        com quem combina e com quem não
       出装推荐                   item por slot, com % de uso e efeito na vitória
       装备胜率                   taxa de vitória por item
       英雄梯度榜                 tier list com pontuação
       时段胜率                   vitória por duração de partida
       英雄BP                     ordem de escolha e banimento

     Isso muda o que faz sentido guardar aqui, e muda para melhor:
     "68,4% dos jogadores compram Fim do Mundo no primeiro slot, e
     quem compra ganha 0,1 ponto a mais" é MUITO mais auditável do
     que "a build recomendada é esta". Um é contagem, o outro é
     opinião de alguém.

     E muda o que NÃO existe lá. Nas suas capturas não aparece, em
     lugar nenhum do site: combo, arcana/inscrição, descrição de
     habilidade, texto de estratégia. Então esses campos não são
     "não encontrados": são coisas que ESTA FONTE NÃO PUBLICA, e o
     app diz isso com todas as letras em vez de deixar você achar
     que faltou coletar.
     ============================================================ */
  const FONTE_ALVO = {
    id: 'pvp.mcxssg.net',
    nome: '天元之弈数据站 (pvp.mcxssg.net)',
    url: 'https://pvp.mcxssg.net/',
    prioridade: 1,
    tipo: 'estatistica',
    estado: 'inacessivel_nesta_sessao',
    porque: 'O proxy de saída desta sessão recusa o domínio (403). Nenhum dado foi lido de lá por download — o que existe no app veio das suas capturas de tela.',
    idioma: 'zh',
    /* O que a fonte publica, pelo que se vê nas suas capturas. */
    publica: ['estatisticas', 'counters', 'synergies', 'builds', 'itens', 'tier', 'bp', 'duracao'],
    naoPublica: {
      combos: 'Não existe seção de combo no site. Ele conta partidas, não ensina sequência de botão.',
      arcana: 'Não aparece seção de arcana/inscrição em nenhuma das capturas do site.',
      abilities: 'Não aparece descrição de habilidade — só o ícone do herói. (Isto vale para ESTA fonte; habilidade agora vem de outro lugar, marcado como tal.)',
      strategy: 'Não há texto de estratégia. O site publica número, não conselho.',
    },
  };

  const FONTES = {
    'pvp.mcxssg.net': FONTE_ALVO,
    'hokpro_captura': {
      id: 'hokpro_captura', nome: 'Captura de tela do app HOK PRO enviada por você',
      url: null, prioridade: 2,
      porque: 'Dado lido diretamente das imagens que você enviou. NÃO é a fonte prioritária; fica marcado assim de propósito para você poder substituí-lo quando importar de pvp.mcxssg.net.',
    },
    'usuario': {
      id: 'usuario', nome: 'Você', url: null, prioridade: 0,
      porque: 'Informado ou editado por você dentro do app.',
    },
    /* Fonte fraca, e marcada como fraca de propósito.
       Os sites de habilidade que você mandou (fandom, hokstats.gg,
       bittopup) também são recusados pelo proxy desta sessão. O que
       restou foi a BUSCA: ela devolve título, link e um resumo feito
       por máquina em cima de trechos — não o texto da página.
       Resumo de trecho erra, e erra de um jeito perigoso: ele soa
       certo. Por isso todo campo que vem daqui guarda as URLs que
       apareceram na busca, fica com conferido:false, e quando duas
       buscas discordam o app guarda AS DUAS leituras em vez de
       escolher uma. */
    'busca_web': {
      id: 'busca_web', nome: 'Busca na web (resumo de trechos)',
      url: null, prioridade: 3, fraca: true,
      porque: 'Não é leitura de página: é o resumo que o buscador faz dos trechos. As páginas de origem estão listadas em cada campo. Trate como pista forte, não como transcrição.',
    },
  };

  const SEM_DADO = 'Não encontrado na fonte.';

  /* ============================================================
     ESQUEMA
     Cada campo diz o que é e de que fonte ele PRECISA vir. A
     conferência roda de verdade — ver validar().
     ============================================================ */
  const CAMPOS = [
    { k: 'id',        tipo: 'texto',  req: true },
    { k: 'name',      tipo: 'texto',  req: true },
    { k: 'nomeCn',    tipo: 'texto',  req: false, rotulo: 'Nome na fonte' },
    { k: 'titulo',    tipo: 'texto',  req: false },
    { k: 'role',      tipo: 'lista',  req: false, rotulo: 'Função' },
    { k: 'dificuldade', tipo: 'texto', req: false },
    { k: 'portrait',  tipo: 'texto',  req: false },
    { k: 'estatisticas', tipo: 'objeto', req: false, rotulo: 'Estatísticas' },
    { k: 'tier',      tipo: 'objeto', req: false, rotulo: 'Tier' },
    { k: 'abilities', tipo: 'lista',  req: false, rotulo: 'Habilidades' },
    { k: 'builds',    tipo: 'objeto', req: false, rotulo: 'Itens' },
    { k: 'arcana',    tipo: 'lista',  req: false, rotulo: 'Arcanas' },
    { k: 'combos',    tipo: 'lista',  req: false, rotulo: 'Combos' },
    { k: 'counters',  tipo: 'objeto', req: false, rotulo: 'Counters' },
    { k: 'synergies', tipo: 'objeto', req: false, rotulo: 'Sinergias' },
    { k: 'strategy',  tipo: 'objeto', req: false, rotulo: 'Estratégia' },
    { k: 'duracao',   tipo: 'objeto', req: false, rotulo: 'Por duração' },
  ];
  const SECOES = [
    { id: 'geral',      nome: 'Números',    campos: ['estatisticas', 'tier'] },
    { id: 'build',      nome: 'Itens',      campos: ['builds'] },
    { id: 'counters',   nome: 'Counters',   campos: ['counters'] },
    { id: 'sinergia',   nome: 'Sinergia',   campos: ['synergies'] },
    { id: 'duracao',    nome: 'Duração',    campos: ['duracao'] },
    { id: 'combos',     nome: 'Combos',     campos: ['combos'] },
    { id: 'arcana',     nome: 'Arcana',     campos: ['arcana'] },
    { id: 'estrategia', nome: 'Estratégia', campos: ['abilities', 'strategy'] },
  ];

  const TIPOS_BUILD = ['chinesa', 'profissional', 'alternativa', 'situacional'];

  /* ============================================================
     REGISTRO
     Os arquivos em dados/herois/ chamam registrar(). Eles são JS e
     não JSON de propósito: o app precisa abrir direto do
     index.html, sem servidor, e fetch() de arquivo local é
     bloqueado pelo navegador nesse modo. O conteúdo continua sendo
     um objeto de dados puro, num arquivo separado, que é o que
     importa.
     ============================================================ */
  const _base = new Map();     // registros que vêm com o app
  let _pedidos = 0, _ok = 0;

  function registrar(rec) {
    _pedidos++;
    const v = validar(rec);
    if (!v.ok) { console.warn('[herois] registro recusado:', rec && rec.id, v.erros); return false; }
    _base.set(rec.id, congelar(rec));
    _ok++;
    return true;
  }
  function registrarLista(lista) { (lista || []).forEach(registrar); }

  function congelar(o) {
    if (o && typeof o === 'object') { Object.values(o).forEach(congelar); Object.freeze(o); }
    return o;
  }

  function validar(rec) {
    const erros = [];
    if (!rec || typeof rec !== 'object') return { ok: false, erros: ['não é um objeto'] };
    for (const c of CAMPOS)
      if (c.req && !rec[c.k]) erros.push(`falta ${c.k}`);
    if (rec.id && !/^[a-z0-9_-]+$/.test(rec.id)) erros.push('id deve ser minúsculo, sem espaço');
    /* Conferência que importa: dado sem origem não entra. */
    for (const c of CAMPOS) {
      if (c.k === 'id' || c.k === 'name') continue;
      const v = rec[c.k];
      if (v == null) continue;
      const vazio = Array.isArray(v) ? v.length === 0 : (typeof v === 'object' ? !Object.keys(v).length : false);
      if (vazio) continue;
      const f = (rec.fontes && rec.fontes[c.k]) || rec.source;
      if (!f) erros.push(`${c.k} tem conteúdo mas não tem fonte declarada`);
      else if (!FONTES[f]) erros.push(`${c.k} declara uma fonte desconhecida: ${f}`);
    }
    if (Array.isArray(rec.builds))
      rec.builds.forEach((b, i) => {
        if (!b.tipo) erros.push(`builds[${i}] sem tipo`);
        else if (!TIPOS_BUILD.includes(b.tipo)) erros.push(`builds[${i}] tipo desconhecido: ${b.tipo}`);
        if (!b.source) erros.push(`builds[${i}] sem source — build sem origem não entra`);
      });
    return { ok: !erros.length, erros };
  }

  /* ============================================================
     LEITURA
     ============================================================ */
  function guardados() {
    const d = U.DB.load();
    if (!d.herois || typeof d.herois !== 'object') d.herois = {};
    return d.herois;
  }

  /** O registro final: o que veio no app, sobreposto pelo que você importou. */
  function porId(id) {
    const base = _base.get(id) || null;
    const meu = guardados()[id] || null;
    if (!base && !meu) return null;
    const comCamadas = camadas(base || { id }, id);
    if (!meu) return comCamadas;
    /* o que VOCÊ importou manda em cima de tudo */
    const out = Object.assign({}, comCamadas, meu);
    out.fontes = Object.assign({}, (base && base.fontes) || {}, meu.fontes || {});
    out._importado = true;
    return out;
  }

  /* Camadas que vêm dos arquivos de lista (tier, stats, funções) e são
     escritas em cima do registro base sem apagá-lo. Elas ficam separadas
     do que foi importado por você, que tem precedência sobre as duas. */
  const _tier = new Map(), _stats = new Map(), _func = new Map();
  function aplicarTier(id, t) { _tier.set(id, t); }
  function aplicarStats(id, e) { _stats.set(id, e); }
  function aplicarFuncao(id, role, nomeCn) { _func.set(id, { role, nomeCn }); }

  /** Junta as camadas num registro só, na ordem certa de precedência. */
  function camadas(base, id) {
    const c = Object.assign({}, base);
    const f = _func.get(id);
    if (f) {
      c.role = f.role;
      if (!c.nomeCn) c.nomeCn = f.nomeCn;
      c.fontes = Object.assign({}, c.fontes || {}, { role: 'pvp.mcxssg.net' });
      c.fontesData = Object.assign({}, c.fontesData || {}, { role: '2026-09-17' });
    }
    const t = _tier.get(id);
    if (t && !c.tier) {
      c.tier = t;
      c.fontes = Object.assign({}, c.fontes || {}, { tier: 'pvp.mcxssg.net' });
    }
    const e = _stats.get(id);
    if (e && !c.estatisticas) {
      c.estatisticas = e;
      c.fontes = Object.assign({}, c.fontes || {}, { estatisticas: 'pvp.mcxssg.net' });
      c.fontesData = Object.assign({}, c.fontesData || {}, { estatisticas: e.data });
    }
    /* habilidade: camada mais fraca de todas (resumo de busca), então
       só entra onde ainda não há nada, e leva a origem grudada */
    const ab = U.HE.HABILIDADES && U.HE.HABILIDADES[id];
    if (ab && ab.lista && ab.lista.length && !(c.abilities && c.abilities.length)) {
      c.abilities = ab.lista;
      c.habilidadesMeta = { cruzado: !!ab.cruzado, buscas: ab.buscas || 0, urls: ab.urls || [],
                            ordemDeUpar: ab.ordemDeUpar || null };
      c.fontes = Object.assign({}, c.fontes || {}, { abilities: 'busca_web' });
      c.fontesUrl = Object.assign({}, c.fontesUrl || {}, { abilities: (ab.urls || [])[0] || null });
      c.fontesData = Object.assign({}, c.fontesData || {}, { abilities: U.HE.HABILIDADES.quando });
    }
    return c;
  }

  function todos() {
    const ids = new Set([..._base.keys(), ...Object.keys(guardados())]);
    return [...ids].map(porId).filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }

  const FUNCOES = [
    { id: 'top',   nome: 'TOP',   alt: ['top', 'solo', 'clash', 'lane superior'] },
    { id: 'selva', nome: 'SELVA', alt: ['selva', 'jungle', 'jungler'] },
    { id: 'mid',   nome: 'MID',   alt: ['mid', 'meio', 'mago'] },
    { id: 'sup',   nome: 'SUP',   alt: ['sup', 'suporte', 'support', 'roam'] },
    { id: 'adc',   nome: 'ADC',   alt: ['adc', 'atirador', 'marksman', 'farm'] },
  ];
  function temFuncao(h, f) {
    if (!h.role || !h.role.length) return false;
    const alvo = FUNCOES.find(x => x.id === f);
    if (!alvo) return false;
    return h.role.some(r => alvo.alt.includes(String(r).toLowerCase()));
  }
  function porFuncao(f) { return todos().filter(h => temFuncao(h, f)); }

  function buscar(q) {
    const s = (q || '').trim().toLowerCase();
    if (!s) return todos();
    return todos().filter(h =>
      h.name.toLowerCase().includes(s) ||
      (h.nomePt || '').toLowerCase().includes(s) ||
      (h.titulo || '').toLowerCase().includes(s) ||
      h.id.includes(s));
  }

  /* ============================================================
     O ACESSO QUE FAZ A REGRA VALER
     Nada na tela lê hero.builds direto. Tudo passa por aqui, e
     aqui um campo vazio devolve o aviso em vez de devolver nada —
     que é como um campo vazio vira, sem querer, uma tela que
     parece completa.
     ============================================================ */
  function campo(h, k) {
    if (!h) return { tem: false, texto: SEM_DADO, v: null };
    const v = h[k];
    const vazio = v == null || (Array.isArray(v) && !v.length) ||
                  (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) ||
                  v === '';
    if (vazio) return { tem: false, texto: SEM_DADO, v: null, campo: k };
    const fid = (h.fontes && h.fontes[k]) || h.source;
    const f = FONTES[fid] || null;
    return {
      tem: true, v, campo: k,
      fonte: f, fonteId: fid,
      url: (h.fontesUrl && h.fontesUrl[k]) || h.sourceUrl || (f && f.url) || null,
      quando: (h.fontesData && h.fontesData[k]) || h.lastUpdated || null,
      patch: h.patch || null,
      prioritaria: fid === FONTE_ALVO.id,
    };
  }

  /** O que este herói tem e o que falta — para a tela poder ser honesta. */
  function completude(h) {
    const secoes = SECOES.map(s => {
      const campos = s.campos.map(k => ({ k, ...campo(h, k) }));
      return { ...s, campos, tem: campos.some(c => c.tem), faltam: campos.filter(c => !c.tem).map(c => c.k) };
    });
    const total = SECOES.reduce((a, s) => a + s.campos.length, 0);
    const cheios = secoes.reduce((a, s) => a + s.campos.filter(c => c.tem).length, 0);
    return {
      secoes, total, cheios, pct: total ? cheios / total : 0,
      daPrioritaria: secoes.reduce((a, s) => a + s.campos.filter(c => c.tem && c.prioritaria).length, 0),
      vazio: cheios === 0,
    };
  }

  function panorama() {
    const hs = todos();
    const com = hs.map(h => ({ h, c: completude(h) }));
    /* "baixado" fica falso até alguma coisa vir por download de verdade.
       Transcrição de captura de tela é dado da fonte, mas não é coleta —
       e confundir os dois deixaria o app dizendo que está sincronizado. */
    const d = U.DB.load();
    return {
      n: hs.length,
      baixado: Object.values(d.herois || {}).some(h => h.viaExtrator === true),
      comAlgo: com.filter(x => !x.c.vazio).length,
      daPrioritaria: com.filter(x => x.c.daPrioritaria > 0).length,
      vazios: com.filter(x => x.c.vazio).length,
      registros: { pedidos: _pedidos, aceitos: _ok },
      fonteAlvo: FONTE_ALVO,
    };
  }

  /* ============================================================
     IMPORTAR
     Você alcança pvp.mcxssg.net; esta sessão não alcança. Então o
     caminho honesto é este: você traz o dado, o app confere e
     guarda. Nada aqui preenche sozinho.
     ============================================================ */
  function importar(texto) {
    let dados;
    try { dados = typeof texto === 'string' ? JSON.parse(texto) : texto; }
    catch (e) { return { ok: false, erro: 'Não é JSON válido: ' + e.message }; }
    const lista = Array.isArray(dados) ? dados : [dados];
    const aceitos = [], recusados = [];
    for (const rec of lista) {
      const v = validar(rec);
      if (!v.ok) { recusados.push({ id: rec && rec.id, erros: v.erros }); continue; }
      const d = U.DB.load();
      if (!d.herois) d.herois = {};
      const antigo = d.herois[rec.id] || {};
      d.herois[rec.id] = Object.assign({}, antigo, rec, {
        importadoEm: Date.now(),
        fontes: Object.assign({}, antigo.fontes || {}, rec.fontes || {}),
      });
      aceitos.push(rec.id);
    }
    if (aceitos.length) U.DB.save();
    return { ok: aceitos.length > 0, aceitos, recusados };
  }

  function exportar(ids) {
    const lista = (ids && ids.length ? ids.map(porId) : todos()).filter(Boolean);
    return JSON.stringify(lista, null, 2);
  }

  function esquecerImportado(id) {
    const d = U.DB.load();
    if (d.herois && d.herois[id]) { delete d.herois[id]; U.DB.save(); return true; }
    return false;
  }

  /* ============================================================
     O EXTRATOR
     Script para VOCÊ rodar no console do navegador, aberto em
     pvp.mcxssg.net/hero/584. Ele não sabe a estrutura daquele
     site — quem escreveu isto nunca conseguiu abri-lo — então ele
     não tenta adivinhar campo por campo: ele captura tudo que o
     site já entrega em forma de dado (estado da aplicação, JSON
     embutido, JSON-LD) mais um recorte do texto da página, e
     baixa num arquivo. Adivinhar o seletor de cada campo sem ver
     a página seria exatamente o tipo de invenção que você pediu
     para não existir aqui.
     ============================================================ */
  const EXTRATOR = `(function(){
  /* Extrator do 天元之弈数据站 (pvp.mcxssg.net).
     Escrito em cima dos cabeçalhos REAIS do site — 胜率, 克制的英雄,
     各格子热门单件, 第N件装备 e companhia — e não em cima de uma
     suposição sobre onde cada campo estaria. Ele lê o texto da página,
     que é o que sobrevive a mudança de classe CSS.
     Rode com a página do herói aberta. Baixa um .json. */
  const T = (e)=> (e && (e.innerText||e.textContent) || '').replace(/\\s+/g,' ').trim();
  const NUM = (s)=>{ const m=String(s).match(/-?\\d+(?:\\.\\d+)?/); return m?parseFloat(m[0]):null; };
  const todos = [...document.querySelectorAll('*')];
  /* menor elemento que contém um texto — evita pegar a página inteira */
  const bloco = (rot)=>{
    const c = todos.filter(e=>{
      const t=T(e); if(!t.includes(rot)) return false;
      return ![...e.children].some(ch=>T(ch).includes(rot));
    });
    if(!c.length) return null;
    let e=c[0];
    for(let i=0;i<6 && e.parentElement;i++){ if(T(e).length>80) break; e=e.parentElement; }
    return e;
  };
  const out = { fonte:'pvp.mcxssg.net', url: location.href, capturadoEm: new Date().toISOString() };

  /* nome, epíteto e rota */
  const h1 = document.querySelector('h1') || todos.find(e=>/^h[12]$/i.test(e.tagName));
  out.nomeCn = h1 ? T(h1) : null;
  const topo = T(document.querySelector('main') || document.body).slice(0,400);
  out.topo = topo;

  /* 胜率 / 出场率 / 禁用率 */
  out.estatisticas = {};
  for (const [k,rot] of [['vitoria','胜率'],['escolha','出场率'],['banimento','禁用率']]) {
    const b = bloco(rot); if(!b) continue;
    const t = T(b);
    const m = t.match(new RegExp(rot+'\\\\s*(-?\\\\d+(?:\\\\.\\\\d+)?)\\\\s*%'));
    if (m) out.estatisticas[k] = { v: parseFloat(m[1]), bruto: t.slice(0,140) };
  }
  const dt = (document.body.innerText.match(/数据截至[:：]?\\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/)||[])[1];
  if (dt) out.estatisticas.data = dt;
  const esc2 = (document.body.innerText.match(/(巅峰千强|全部分路|[^\\n]{0,10}分路)/)||[])[1];
  if (esc2) out.estatisticas.escopo = esc2;

  /* 克制 / 被克制 / 搭档 — nome, variação de vitória e nº de partidas */
  const listaPares = (rot)=>{
    const b = bloco(rot); if(!b) return null;
    const t = T(b).split(rot)[1] || '';
    const re = /([\\u4e00-\\u9fa5A-Za-z0-9·()（）]+)\\s*(↑|↓|\\+|-)\\s*(\\d+(?:\\.\\d+)?)%\\s*(\\d+)场/g;
    const arr = []; let m;
    while((m = re.exec(t))) arr.push({ nomeCn:m[1], delta:(m[2]==='↓'||m[2]==='-'?-1:1)*parseFloat(m[3]), partidas:+m[4] });
    return { itens: arr, bruto: t.slice(0, 900) };
  };
  out.counters = { forteContra: listaPares('克制的英雄'), fracoContra: listaPares('被克制的英雄') };
  out.synergies = { bons: listaPares('最佳搭档'), ruins: listaPares('较差搭档') };

  /* 出装推荐: 大家常出 + 各格子热门单件 (第1..6件装备) */
  out.builds = { comuns: [], porSlot: [], itensVitoria: [] };
  const bc = bloco('大家常出');
  if (bc) { const t=T(bc).split('大家常出')[1]||'';
    const re=/([\\u4e00-\\u9fa5·]+)\\s*出场率\\s*(\\d+(?:\\.\\d+)?)%/g; let m;
    while((m=re.exec(t))) out.builds.comuns.push({ itemCn:m[1], uso:parseFloat(m[2]) }); }
  for (let i=1;i<=6;i++){
    const b = bloco('第'+i+'件装备'); if(!b) continue;
    const t = T(b).split('第'+i+'件装备')[1]||'';
    const re=/([\\u4e00-\\u9fa5·]+)\\s*占比\\s*(\\d+(?:\\.\\d+)?)%\\s*胜率\\s*(不变|--|[+-]?\\d+(?:\\.\\d+)?%?)/g;
    const op=[]; let m;
    while((m=re.exec(t))) op.push({ itemCn:m[1], uso:parseFloat(m[2]),
      deltaVitoria: /不变|--/.test(m[3]) ? 0 : NUM(m[3]) });
    if(op.length) out.builds.porSlot.push({ slot:i, opcoes:op });
  }
  const bv = bloco('装备胜率');
  if (bv){ const t=T(bv).split('装备胜率')[1]||'';
    const re=/([\\u4e00-\\u9fa5·]+)\\s*出场率\\s*胜率\\s*(\\d+(?:\\.\\d+)?)%\\s*(\\d+(?:\\.\\d+)?)%/g; let m;
    while((m=re.exec(t))) out.builds.itensVitoria.push({ itemCn:m[1], uso:parseFloat(m[2]), vitoria:parseFloat(m[3]) }); }

  /* 时段胜率 */
  const bd = bloco('时段胜率');
  if (bd){ const t=T(bd);
    out.duracao = { bruto: t.slice(0,600), faixas: [] };
    const re=/([\\d]+-[\\d]+分钟|\\d+分钟\\+)\\s*胜率\\s*(\\d+(?:\\.\\d+)?)%\\s*占比\\s*(\\d+(?:\\.\\d+)?)%/g; let m;
    while((m=re.exec(t))) out.duracao.faixas.push({ faixa:m[1], vitoria:parseFloat(m[2]), fatia:parseFloat(m[3]) });
    const mv=t.match(/胜场平均时长\\s*([\\d:]+)/), md=t.match(/败场平均时长\\s*([\\d:]+)/);
    if(mv) out.duracao.mediaVitoria=mv[1]; if(md) out.duracao.mediaDerrota=md[1]; }

  /* estado bruto, para o que os padrões acima não pegarem */
  out.bruto = { texto: (document.body.innerText||'').slice(0,120000), estados:{} };
  for (const k of ['__NEXT_DATA__','__NUXT__','__INITIAL_STATE__','pageData'])
    { try{ if(window[k]) out.bruto.estados[k]=JSON.parse(JSON.stringify(window[k])); }catch(e){} }

  const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='mcxssg'+location.pathname.replace(/\\W+/g,'-')+'.json';
  document.body.appendChild(a); a.click(); a.remove();
  console.log('[espelho] captura pronta', out);
  return out;
})()`;

  /* ============================================================
     NOMES: o site é em chinês
     ------------------------------------------------------------
     Sem este mapa, importar de lá devolve 镜 e o app não sabe que
     isso é a Jing. O mapa está seedado só com o que dá para
     confirmar cruzando as suas capturas com a lista que você me
     deu. Nome que eu não tenho certeza NÃO entra aqui — entra como
     desconhecido, aparece na tela em chinês, e você confirma. Um
     mapa errado é pior que um mapa curto: ele renomeia o herói
     errado e ninguém percebe.
     ============================================================ */
  const NOMES_CN = {
    '镜': 'jing', '露娜': 'luna', '韩信': 'han-xin', '关羽': 'guan-yu',
    '张飞': 'zhang-fei', '诸葛亮': 'kongming', '女娲': 'nuwa', '哪吒': 'nezha',
    '貂蝉': 'diaochan', '墨子': 'mozi', '孙悟空': 'sun-wukong', '李白': 'li-bai',
    '达摩': 'dharma', '亚瑟': 'arthur', '后羿': 'hou-yi', '孙尚香': 'lady-sun',
    '甄姬': 'lady-zhen', '刘邦': 'liu-bang', '典韦': 'dian-wei', '雅典娜': 'athena',
    '花木兰': 'mulan', '狄仁杰': 'di-renjie', '虞姬': 'consort-yu', '芈月': 'mi-yue',
    '上官婉儿': 'shangguan', '鲁班七号': 'luban-no7', '百里守约': 'shouyue',
    '百里玄策': 'xuance', '杨玉环': 'yuhuan', '杨戬': 'yang-jian', '大乔': 'da-qiao',
    '小乔': 'xiao-qiao', '不知火舞': 'mai-shiranui', '橘右京': 'ukyo-tachibana',
    '敖隐': 'aoyin', '盾山': 'dun', '裴擒虎': 'pei', '老夫子': 'fuzi',
    '周瑜': 'zhou-yu', '孙策': 'sun-ce', '孙膑': 'sun-bin',
    '庄周': 'zhuangzi', '姜子牙': 'ziya', '廉颇': 'lian-po', '刘备': 'liu-bei',
    '刘禅': 'liu-shan', '吕布': 'lu-bu', '马可波罗': 'marco-polo', '黄忠': 'huang-zhong',
    '蔡文姬': 'cai-yan', '大司命': 'dyadia', '司马懿': 'sima-yi', '赵云': 'zhao-yun',
    '东皇太一': 'donghuang', '扁鹊': 'dr-bian', '娜可露露': 'nakoruru',
    '宫本武藏': 'musashi', '鬼谷子': 'guiguzi', '曜': 'yao',
    /* ampliado depois das capturas do seletor de herói, que deram as
       cinco listas de rota e permitiram cruzar com a sua lista. Só entrou
       o que dá para afirmar. */
    '妲己': 'daji', '嬴政': 'ying', '安琪拉': 'angela', '王昭君': 'wang-zhaojun',
    '张良': 'zhang-liang', '米莱狄': 'milady', '金蝉': 'shi',
    '伽罗': 'garo', '蒙犽': 'menki', '戈娅': 'gao',
    '廉颇': 'lian-po', '庄周': 'zhuangzi', '刘禅': 'liu-shan', '孙膑': 'sun-bin',
    '朵莉亚': 'dolia', '蔡文姬': 'cai-yan',
    '东皇太一': 'donghuang',
    '明世隐': 'ming', '桑启': 'sakeer',
    '阿轲': 'arke', '兰陵王': 'lam', '刘备': 'liu-bei',
    '阿古朵': 'agudo',
    '白起': 'bai-qi', '吕布': 'lu-bu',
    '孙尚香': 'lady-sun', '马可波罗': 'marco-polo', '艾琳': 'erin', '黄忠': 'huang-zhong',
    '莱西奥': 'lorion', '卢雅那': 'luara',
    '虞姬': 'consort-yu', '海诺': 'heino', '海月': 'mayene',
    '小乔': 'xiao-qiao',
    '甄姬': 'lady-zhen', '弈星': 'yixing', '周瑜': 'zhou-yu',
    '姜子牙': 'ziya', '不知火舞': 'mai-shiranui', '杨玉环': 'yuhuan',
    '老夫子': 'fuzi', '项羽': 'xiang-yu',
    '孙策': 'sun-ce', '夏洛特': 'charlotte',
    '裴擒虎': 'pei', '盾山': 'dun',
    '鲁班七号': 'luban-no7', '敖隐': 'aoyin',
    '雅典娜': 'athena', '大司命': 'dyadia', '橘右京': 'ukyo-tachibana',
    '娜可露露': 'nakoruru', '百里守约': 'shouyue',
    '百里玄策': 'xuance', '李信': 'li-xin',
    '花木兰': 'mulan', '达摩': 'dharma', '关羽': 'guan-yu', '芈月': 'mi-yue',
    '上官婉儿': 'shangguan', '司马懿': 'sima-yi', '孙悟空': 'sun-wukong',
    '韩信': 'han-xin', '露娜': 'luna', '李白': 'li-bai', '典韦': 'dian-wei',
    '赵云': 'zhao-yun', '诸葛亮': 'kongming', '杨戬': 'yang-jian', '哪吒': 'nezha',
    '女娲': 'nuwa', '貂蝉': 'diaochan', '墨子': 'mozi', '张飞': 'zhang-fei',
    '刘邦': 'liu-bang', '狄仁杰': 'di-renjie', '后羿': 'hou-yi', '亚瑟': 'arthur',
    '大乔': 'da-qiao', '扁鹊': 'dr-bian',
  };
  /* leitura ao contrário, montada uma vez */
  const CN_POR_ID = {};
  for (const cn in NOMES_CN) CN_POR_ID[NOMES_CN[cn]] = cn;

  /**
   * CONFERÊNCIA DO MAPA, e por que ela existe.
   *
   * Ao ampliar o mapa com as capturas do seletor de herói, eu mapeei 42
   * nomes chineses para ids que NÃO existem na sua lista — 少司缘 para
   * 'shaosiyuan', 马超 para 'ma-chao', e assim por diante. Nenhum desses
   * heróis está na lista que você me deu. Eu tinha inventado o id junto
   * com o mapeamento, e um mapa assim é pior que mapa curto: ele faz o
   * dado da fonte cair num herói que não existe, e some sem avisar.
   *
   * O teste pegou. Os 42 saíram. E ficou esta trava, que roda de verdade
   * e devolve a lista de sobras — porque errar de novo é fácil e a única
   * defesa que funciona é a que roda sozinha.
   */
  function conferirMapa() {
    const existentes = new Set([..._base.keys(), ...Object.keys(guardados())]);
    const orfaos = [];
    for (const cn in NOMES_CN) if (!existentes.has(NOMES_CN[cn])) orfaos.push({ cn, id: NOMES_CN[cn] });
    return { ok: !orfaos.length, orfaos };
  }

  /** Nomes que a fonte publica e que o banco não conhece. */
  function foraDoBanco() {
    const vistos = new Map();
    const juntar = (lista, de) => (lista || []).forEach(x => {
      const cn = x.nomeCn; if (!cn || idDoNomeCn(cn)) return;
      if (!vistos.has(cn)) vistos.set(cn, { nomeCn: cn, onde: new Set() });
      vistos.get(cn).onde.add(de);
    });
    if (U.HE.STATS) juntar(U.HE.STATS.linhas, 'tabela de dados');
    if (U.HE.FUNCOES_FONTE) juntar(U.HE.FUNCOES_FONTE.linhas, 'seletor de herói');
    if (U.HE.TIER) U.HE.TIER.faixas.forEach(f => juntar(f.herois, 'tier list'));
    return [...vistos.values()].map(x => ({ nomeCn: x.nomeCn, onde: [...x.onde] }));
  }

  /** Traduz um nome chinês para o id do banco, ou devolve o que não deu. */
  function idDoNomeCn(cn) {
    if (!cn) return null;
    const limpo = String(cn).trim();
    if (NOMES_CN[limpo]) return NOMES_CN[limpo];
    /* 元流之子(射手) e parentes: o site separa por função */
    const base = limpo.replace(/[（(].*?[)）]/g, '').trim();
    if (NOMES_CN[base]) return NOMES_CN[base];
    return null;
  }
  function rotularCn(cn) {
    const id = idDoNomeCn(cn);
    const h = id && porId(id);
    return h ? h.name : cn;
  }
  function nomesNaoMapeados(lista) {
    return [...new Set((lista || []).map(x => x.nomeCn).filter(c => c && !idDoNomeCn(c)))];
  }

  /* ============================================================
     LIGAÇÃO COM O TREINO
     Separado de propósito. O que está aqui é CONHECIMENTO sobre o
     herói; o que está no resto do app é o SEU desempenho. Os dois
     nunca se misturam no mesmo registro — só se referenciam por id.
     ============================================================ */
  function noTreino() {
    const d = U.DB.load();
    if (!Array.isArray(d.treinoHerois)) d.treinoHerois = [];
    return d.treinoHerois;
  }
  function estaNoTreino(id) { return noTreino().some(x => x.id === id); }

  function adicionarAoTreino(id) {
    const h = porId(id);
    if (!h) return { ok: false, motivo: 'herói não está no banco' };
    if (estaNoTreino(id)) return { ok: false, motivo: 'já está no treino' };
    const d = U.DB.load();
    if (!Array.isArray(d.treinoHerois)) d.treinoHerois = [];
    const rotas = rotasDoTreino(id);
    d.treinoHerois.push({ id, nome: h.name, em: Date.now(), rotas: rotas.chave });
    U.DB.save();
    return {
      ok: true, herói: h.name, temRotas: rotas.tem, chave: rotas.chave,
      aviso: rotas.tem ? null
        : `O treino mede rotas de botão, e ${h.name} ainda não tem rota definida. Sem isso o sistema não tem o que medir — defina as rotas em Config antes do primeiro set. Nada foi inventado para preencher esse espaço.`,
    };
  }
  function removerDoTreino(id) {
    const d = U.DB.load();
    d.treinoHerois = noTreino().filter(x => x.id !== id);
    U.DB.save();
  }
  /** Quais rotas o sistema de treino já tem para este herói. */
  function rotasDoTreino(id) {
    if (id === 'jing') return { tem: true, chave: 'jing', n: U.CO.getRotas('jing').length };
    if (id === 'luna') return { tem: true, chave: 'luna', n: U.CO.getRotas('luna').length };
    const d = U.DB.load();
    const k = 'rotas_' + id;
    return { tem: Array.isArray(d[k]) && d[k].length > 0, chave: k, n: (d[k] || []).length };
  }

  /* ============================================================
     A PONTE ENTRE O BANCO E O TREINO
     O treino fala em s1/s2/s3/pass porque é disso que ele mede o
     toque. O banco agora sabe o NOME da habilidade que mora em
     cada um desses botões. Juntar as duas coisas é uma consulta
     por id — não é misturar armazenamento, e é o que faz o
     briefing dizer "Crescent Slice" em vez de "Habilidade 1".

     Se o herói do treino não tem kit no banco, isto devolve null e
     a tela cai no rótulo genérico. Rótulo genérico é feio; rótulo
     inventado é pior.
     ============================================================ */
  const BOTAO_POR_SLOT = { passiva: 'pass', '1': 's1', '2': 's2', '3': 's3' };

  function kitDoTreino(id) {
    const alvo = id || (noTreino()[0] && noTreino()[0].id) || 'jing';
    const h = porId(alvo);
    if (!h || !h.abilities || !h.abilities.length) return null;
    const m = {};
    for (const a of h.abilities) {
      const b = BOTAO_POR_SLOT[a.slot];
      if (b) m[b] = { nome: a.nome, texto: a.texto, confianca: a.confianca || 'alta', disputa: !!a.disputa };
    }
    if (!Object.keys(m).length) return null;
    return { heroi: alvo, nome: h.name, botoes: m,
             meta: h.habilidadesMeta || {}, fonte: (h.fontes && h.fontes.abilities) || null };
  }

  /** Rótulo curto de um botão, com o nome real quando existe. */
  function rotuloBotao(k, kit) {
    const a = kit && kit.botoes && kit.botoes[k];
    return a ? a.nome : null;
  }

  U.HE = {
    FONTE_ALVO, FONTES, SEM_DADO, CAMPOS, SECOES, TIPOS_BUILD, FUNCOES, EXTRATOR,
    kitDoTreino, rotuloBotao, BOTAO_POR_SLOT,
    NOMES_CN, CN_POR_ID, idDoNomeCn, rotularCn, nomesNaoMapeados, conferirMapa, foraDoBanco,
    registrar, registrarLista, validar, porId, todos, buscar, porFuncao, temFuncao,
    aplicarTier, aplicarStats, aplicarFuncao,
    campo, completude, panorama, importar, exportar, esquecerImportado,
    noTreino, estaNoTreino, adicionarAoTreino, removerDoTreino, rotasDoTreino,
  };

})(window.U);
