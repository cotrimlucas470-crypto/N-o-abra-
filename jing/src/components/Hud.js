import { HUD, SECOES } from '../data/config.js';
import { $, el } from '../utils/dom.js';
import { tempo } from '../animations/timeControl.js';
import { round } from '../utils/math.js';

/**
 * HUD discreto: leituras do "sistema de análise", coordenadas fictícias,
 * escala temporal ao vivo e a trilha de seções com o progresso da travessia.
 */
export function montarHud({ perf, aoIrPara }) {
  const alvoLeituras = $('#hud-leituras');
  const trilha = $('#hud-trilha');

  $('#hud-sistema').textContent = HUD.sistema;
  $('#hud-linha-1').textContent = HUD.linhas[0] || '';
  $('#hud-linha-2').textContent = HUD.linhas[1] || '';
  $('#hud-coords').textContent = HUD.coordenadas;
  $('#hud-tier').textContent = `QUALIDADE ${perf.perfil.nome}`;

  const barras = [];
  for (const leitura of HUD.leituras) {
    const barra = el('span', { class: 'hud-barra' }, el('i'));
    const valor = el('b', { text: `${round(leitura.valor, leitura.casas ?? 0)}${leitura.sufixo}` });
    alvoLeituras.append(el('span', { class: 'hud-leitura' }, el('span', { text: leitura.rotulo }), barra, valor));
    const pct = leitura.sufixo === '%' ? leitura.valor : Math.min(100, (1 - leitura.valor) * 100);
    barras.push({ el: barra.firstElementChild, pct });
  }
  // preenche depois da abertura, para o HUD "ligar" junto com o salão
  setTimeout(() => barras.forEach((b, i) => setTimeout(() => (b.el.style.width = `${b.pct}%`), i * 160)), 400);

  // --- trilha de seções ---
  const botoes = SECOES.map((s) =>
    el(
      'button',
      {
        type: 'button',
        'data-secao': s.id,
        onclick: () => aoIrPara?.(s.id),
      },
      el('span', { text: s.rotulo }),
      el('i')
    )
  );
  trilha.append(...botoes);

  const elTempo = $('#hud-tempo');
  const elFps = $('#hud-fps');
  const elLinha2 = $('#hud-linha-2');
  const elTier = $('#hud-tier');
  let acumulado = 0;
  let atual = '';

  perf.onMudanca((perfil) => {
    elTier.textContent = `QUALIDADE ${perfil.nome}`;
  });

  return {
    marcarSecao(id) {
      if (id === atual) return;
      atual = id;
      for (const b of botoes) {
        const ativo = b.dataset.secao === id;
        b.setAttribute('aria-current', ativo ? 'true' : 'false');
        b.style.setProperty('--ativo', ativo ? '1' : '0');
      }
    },
    atualizar(dt) {
      acumulado += dt;
      if (acumulado < 0.2) return;
      acumulado = 0;
      elTempo.textContent = `ESCALA TEMPORAL ${tempo.atual.toFixed(2)}x`;
      elFps.textContent = `${Math.round(perf.fps)} FPS · ${HUD.linhas[2] || ''}`;
      if (tempo.quebrando) elLinha2.textContent = 'ANOMALIA TEMPORAL // CONGELAMENTO';
      else if (tempo.atual > 1.3) elLinha2.textContent = 'PRESSÃO ACIMA DO NOMINAL';
      else elLinha2.textContent = HUD.linhas[1] || '';
    },
  };
}
