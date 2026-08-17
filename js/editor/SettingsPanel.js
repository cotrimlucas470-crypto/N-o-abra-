import { openModal, escapeHtml, toast } from './ui/Modal.js';
import { POWER_MODES, GRAPHICS_PRESETS } from '../perf/Quality.js';
import { device } from '../perf/Device.js';

/**
 * Settings → Performance (regra 59) + Interface + Projeto.
 * Toda opção aqui altera o comportamento real da engine — nada é enfeite.
 */
export function openSettings(app) {
  const q = app.quality;
  const s = q.settings;
  const wrap = document.createElement('div');

  const group = (title) => {
    const g = document.createElement('div');
    g.className = 'settings-group';
    g.innerHTML = `<h4>${escapeHtml(title)}</h4>`;
    wrap.appendChild(g);
    return g;
  };

  const field = (parent, label, control, hint) => {
    const f = document.createElement('div');
    f.className = 'field';
    const l = document.createElement('label');
    l.textContent = label;
    const holder = document.createElement('div');
    holder.appendChild(control);
    f.append(l, holder);
    parent.appendChild(f);
    if (hint) {
      const h = document.createElement('div');
      h.className = 'field-hint';
      h.textContent = hint;
      parent.appendChild(h);
    }
    return control;
  };

  const select = (options, value, onChange) => {
    const el = document.createElement('select');
    for (const [val, label] of options) {
      const o = document.createElement('option');
      o.value = val; o.textContent = label;
      el.appendChild(o);
    }
    el.value = value;
    el.onchange = () => onChange(el.value);
    return el;
  };

  const checkbox = (value, onChange) => {
    const el = document.createElement('input');
    el.type = 'checkbox';
    el.checked = !!value;
    el.onchange = () => onChange(el.checked);
    return el;
  };

  const range = (min, max, step, value, onChange, fmt = (v) => v) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:center';
    const el = document.createElement('input');
    el.type = 'range'; el.min = min; el.max = max; el.step = step; el.value = value;
    const out = document.createElement('span');
    out.style.cssText = 'font-size:11px;color:var(--fg-2);min-width:44px;text-align:right';
    out.textContent = fmt(value);
    el.oninput = () => { out.textContent = fmt(el.value); onChange(parseFloat(el.value)); };
    row.append(el, out);
    return row;
  };

  /* ---------- Performance ---------- */
  const perf = group('Performance');

  field(perf, 'Power Mode',
    select(Object.entries(POWER_MODES).map(([k, v]) => [k, `${v.label} (${v.fps} FPS)`]), s.powerMode, (v) => {
      q.set('powerMode', v);
      app.applyQuality();
      fpsSel.value = String(q.settings.fpsLimit);
    }),
    'Battery 30 · Balanced 60 · Performance 90 · Ultra 120');

  const fpsSel = field(perf, 'FPS Limit',
    select([[30, '30'], [60, '60'], [90, '90'], [120, '120']].map(([a, b]) => [String(a), b]), String(s.fpsLimit), (v) => {
      q.set('fpsLimit', Number(v));
      app.applyQuality();
    }),
    `Tela detectada: ${device.refreshHz ? device.refreshHz + ' Hz' : 'medindo…'} — o limite nunca ultrapassa a taxa real.`);

  field(perf, 'Graphics',
    select(Object.keys(GRAPHICS_PRESETS).map((k) => [k, k.toUpperCase()]), s.graphics, (v) => {
      q.set('graphics', v);
      app.applyQuality();
      toast(`Preset ${v.toUpperCase()} aplicado.`);
    }));

  field(perf, 'Resolution Scale',
    range(0.5, 1, 0.05, s.resolutionScale, (v) => { q.set('resolutionScale', v); app.applyQuality(); }, (v) => `${Math.round(v * 100)}%`),
    'Menos pixels = menos GPU. O custo cai com o quadrado da escala.');

  field(perf, 'Dynamic Resolution', checkbox(s.dynamicResolution, (v) => { q.set('dynamicResolution', v); app.applyQuality(); }),
    'Ajusta a escala sozinho para segurar o frame time no alvo.');

  field(perf, 'Shadows', select([['off', 'Off'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], s.shadows,
    (v) => { q.set('shadows', v); app.applyQuality(); }));

  field(perf, 'Particles (máx.)', range(50, 2000, 50, s.particles, (v) => q.set('particles', v)),
    'Limite usado por sistemas de partículas e pelo Stress Test.');

  field(perf, 'Post Processing', checkbox(s.postProcessing, (v) => { q.set('postProcessing', v); app.applyQuality(); }),
    'Desligado por padrão: é o item que mais custa overdraw em GPU móvel.');

  field(perf, 'Anti-Aliasing', select([['off', 'Off'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], s.antiAlias,
    (v) => { q.set('antiAlias', v); app.applyQuality(); }));

  field(perf, 'Texture Quality', select([['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra']], s.textureQuality,
    (v) => q.set('textureQuality', v)));

  field(perf, 'Object Pooling', checkbox(s.objectPooling, (v) => q.set('objectPooling', v)));
  field(perf, 'Lazy Loading', checkbox(s.lazyLoading, (v) => q.set('lazyLoading', v)));
  field(perf, 'Performance Overlay', checkbox(s.performanceOverlay, (v) => { q.set('performanceOverlay', v); app.perf.setEnabled(v); }));
  field(perf, 'Debug Mode', checkbox(s.debugOverlay, (v) => { q.set('debugOverlay', v); app.applyQuality(); }),
    'Mostra gizmos extras e checagens adicionais.');
  field(perf, 'Editor Priority', checkbox(s.editorPriority, (v) => q.set('editorPriority', v)),
    'Reduz a resolução da Scene View durante o arrasto para manter o toque fluido.');

  const perfBtns = document.createElement('div');
  perfBtns.className = 'insp-actions';
  perfBtns.append(
    btn('Auto Quality (medir e sugerir)', async () => {
      const r = await app.runBenchmark(4);
      if (!r) return;
      const suggestion = q.suggestFromBenchmark(r.avgFps, r.avgFrameMs);
      openModal({
        title: 'Auto Quality',
        body: `<p>Medição: <b>${r.avgFps.toFixed(1)} FPS</b> médios, 1% low <b>${r.low1Fps.toFixed(1)}</b>,
               frame <b>${r.avgFrameMs.toFixed(2)} ms</b>.</p>
               <p>Sugestão: preset <b>${suggestion.toUpperCase()}</b>. Você decide — nada é aplicado sem confirmar.</p>`,
        actions: [
          { label: 'Manter atual' },
          { label: `Aplicar ${suggestion.toUpperCase()}`, primary: true, onClick: () => { q.set('graphics', suggestion); app.applyQuality(); } },
        ],
      });
    }),
    btn('Stress Test', () => app.openStressTest()),
    btn('Perfil recomendado', () => {
      const name = q.applyRecommendedProfile();
      app.applyQuality();
      toast(`Perfil aplicado: ${name}`, 'ok');
    }),
  );
  perf.appendChild(perfBtns);

  /* ---------- Interface ---------- */
  const ui = group('Interface e acessibilidade');
  field(ui, 'Reduzir animações', checkbox(s.reduceMotion, (v) => {
    q.set('reduceMotion', v);
    document.body.dataset.reduceMotion = v ? '1' : '0';
  }));
  field(ui, 'Grid na Scene View', checkbox(app.sceneView.showGrid, (v) => { app.sceneView.showGrid = v; app.sceneView.markDirty(); }));
  field(ui, 'Gizmos', checkbox(app.sceneView.showGizmos, (v) => { app.sceneView.showGizmos = v; app.sceneView.markDirty(); }));
  field(ui, 'Controles touch no jogo', checkbox(app.gameView.showControls, (v) => app.gameView.setControlsVisible(v)));
  field(ui, 'Limite de logs', select([['1000', '1000'], ['5000', '5000'], ['10000', '10000']], String(s.consoleLimit), (v) => {
    q.set('consoleLimit', Number(v));
    app.logger.limit = Number(v);
  }));
  field(ui, 'Áudio', checkbox(!app.audio.muted, (v) => app.audio.setMuted(!v)));

  /* ---------- Projeto ---------- */
  const proj = group('Projeto');
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = app.project.name;
  nameInput.onchange = () => { app.project.name = nameInput.value.trim() || app.project.name; app.updateTitle(); app.project.markDirty(); };
  field(proj, 'Nome', nameInput);

  const projBtns = document.createElement('div');
  projBtns.className = 'insp-actions';
  projBtns.append(
    btn('Salvar agora', () => app.saveAll()),
    btn('Exportar .zip', () => app.exportProject('zip')),
    btn('Exportar .json', () => app.exportProject('json')),
    btn('Importar projeto', () => app.importProject()),
    btn('Novo projeto', () => app.newProjectDialog()),
    btn('Abrir projeto', () => app.openProjectDialog()),
  );
  proj.appendChild(projBtns);

  /* ---------- Dispositivo ---------- */
  const dev = group('Dispositivo');
  const grid = document.createElement('div');
  grid.className = 'stat-grid';
  const info = device.summary();
  for (const [k, v] of Object.entries(info)) {
    grid.innerHTML += `<div class="k">${escapeHtml(k)}</div><div>${escapeHtml(String(v))}</div>`;
  }
  dev.appendChild(grid);
  const storageNote = document.createElement('div');
  storageNote.className = 'field-hint';
  storageNote.textContent = 'Perfil ativo: ' + (q.profileName || 'padrão');
  dev.appendChild(storageNote);
  app.storage.estimate().then((est) => {
    if (!est) return;
    storageNote.textContent += ` · Armazenamento: ${(est.usage / 1048576).toFixed(1)} MB usados de ${(est.quota / 1048576).toFixed(0)} MB disponíveis`;
  });

  openModal({ title: 'Configurações', body: wrap, wide: true });

  function btn(label, onClick) {
    const b = document.createElement('button');
    b.className = 'btn sm';
    b.textContent = label;
    b.onclick = onClick;
    return b;
  }
}

/** Diálogo do Stress Test com escolha de carga. */
export function openStressTestDialog(app) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p style="font-size:13px;color:var(--fg-1)">
    Gera objetos com física, scripts e UI, executa por alguns segundos e mostra números medidos.
  </p>`;
  const row = document.createElement('div');
  row.className = 'insp-actions';
  for (const n of [100, 500, 1000]) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = `${n} objetos`;
    b.onclick = async () => {
      m.close();
      const report = await app.runStressTest(n);
      showReport(app, report);
    };
    row.appendChild(b);
  }
  wrap.appendChild(row);
  const m = openModal({ title: 'Stress Test', body: wrap });
}

export function showReport(app, r) {
  if (!r) return;
  const rows = [
    ['Objetos', r.count],
    ['FPS médio', r.avgFps.toFixed(1)],
    ['1% low', r.low1Fps.toFixed(1)],
    ['Frame time médio', r.avgFrameMs.toFixed(2) + ' ms'],
    ['Pior frame', r.worstFrameMs.toFixed(2) + ' ms'],
    ['Carregamento da cena', r.sceneLoadMs.toFixed(1) + ' ms'],
    ['Draw calls', r.drawCalls],
    ['Objetos visíveis', r.visible],
    ['Corpos físicos', r.bodies],
    ['Scripts ativos', r.scripts],
    ['Resolution scale', (r.resScale * 100).toFixed(0) + '%'],
    ['Memória JS', r.memoryMB != null ? r.memoryMB.toFixed(0) + ' MB' : 'não exposta pelo navegador'],
  ];
  openModal({
    title: 'Resultado do Stress Test',
    body: `<div class="stat-grid">${rows.map(([k, v]) => `<div class="k">${k}</div><div>${v}</div>`).join('')}</div>
           <p class="field-hint" style="margin-top:10px">Referências: 16,67 ms ≈ 60 FPS · 11,11 ms ≈ 90 FPS · 8,33 ms ≈ 120 FPS.</p>`,
  });
}
