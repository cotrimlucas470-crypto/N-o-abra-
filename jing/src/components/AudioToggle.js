import { audio } from '../utils/audio.js';
import { AUDIO } from '../data/config.js';
import { $ } from '../utils/dom.js';

/** Botão SOM: ON/OFF. Nunca inicia sozinho. */
export function montarAudio() {
  const botao = $('#botao-som');
  const estado = $('#som-estado');
  if (!botao) return audio;

  const pintar = (ligado) => {
    botao.setAttribute('aria-pressed', ligado ? 'true' : 'false');
    if (estado) estado.textContent = ligado ? 'ON' : 'OFF';
    botao.setAttribute('aria-label', `Som ${ligado ? 'ligado' : 'desligado'}`);
  };

  botao.addEventListener('click', async () => {
    botao.disabled = true;
    try {
      const ligado = await audio.alternar();
      pintar(ligado);
      if (ligado) audio.tocar('transicao', { volume: 0.6 });
    } finally {
      botao.disabled = false;
    }
  });

  pintar(AUDIO.padraoLigado && audio.ligado);
  return audio;
}
