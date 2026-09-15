import { INTRO } from '../data/config.js';
import { $ } from '../utils/dom.js';
import { audio } from '../utils/audio.js';

/**
 * ABERTURA CINEMATOGRÁFICA.
 *
 * Tela preta → um ponto ciano → "REFLEXO DETECTADO" → linha que rasga a tela
 * → "JING // SYSTEM ONLINE" → o preto se abre e a câmera atravessa os cacos
 * até o hero. Nada de fade-in simples.
 */
export function montarIntro({ gsap, stage, perf, aoTerminar }) {
  const capa = $('#abertura');
  const ponto = capa?.querySelector('.abertura-ponto');
  const linha = capa?.querySelector('.abertura-linha');
  const texto = $('#abertura-texto');
  const medidor = capa?.querySelector('.abertura-medidor i');
  const pular = $('#pular-abertura');
  const hud = $('#hud');

  if (!capa) {
    aoTerminar?.();
    return { pular() {} };
  }

  document.body.dataset.travado = 'sim';
  stage.rig.intro = 1;

  const reduzido = perf.reduzirMovimento;
  const escala = reduzido ? 0.35 : 1;

  let terminou = false;
  const finalizar = () => {
    if (terminou) return;
    terminou = true;
    clearTimeout(cordaDeSeguranca);
    capa.hidden = true;
    capa.style.pointerEvents = 'none';
    delete document.body.dataset.travado;
    document.documentElement.dataset.abertura = 'concluida';
    aoTerminar?.();
  };

  // corda de segurança: a página NUNCA fica travada, mesmo que a linha do
  // tempo da abertura seja interrompida por qualquer motivo.
  const cordaDeSeguranca = setTimeout(finalizar, reduzido ? 4000 : 16000);

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: finalizar,
  });

  // 1. o ponto
  tl.set(texto, { textContent: '' })
    .to(ponto, { scale: 1, duration: 0.9 * escala, ease: 'power2.out' })
    .to(ponto, { scale: 1.6, opacity: 0.7, duration: 0.45 * escala, yoyo: true, repeat: 1 }, '>-0.1');

  // 2. primeiro texto
  INTRO.passos.forEach((passo, i) => {
    tl.call(() => {
      if (texto) texto.textContent = passo.texto;
      audio.tocar(i === 0 ? 'vidro' : 'metal', { volume: 0.4 });
    })
      .fromTo(
        texto,
        { opacity: 0, letterSpacing: '1.4em', filter: 'blur(9px)' },
        { opacity: 1, letterSpacing: '0.56em', filter: 'blur(0px)', duration: 1.0 * escala }
      )
      .to(texto, { opacity: 0.85, duration: (passo.duracao - 0.6) * escala });

    if (i === 0) {
      tl.to(linha, { opacity: 1, scaleX: 1, duration: 1.1 * escala, ease: 'expo.out' }, '<-0.6')
        .to(ponto, { opacity: 0, duration: 0.6 * escala }, '<');
    }
  });

  // 3. o medidor de varredura
  tl.to(medidor, { width: '100%', duration: 1.4 * escala, ease: 'power1.inOut' }, '<-1.2');

  // 4. o preto se abre: a câmera atravessa os cacos até o hero
  tl.call(() => {
    audio.tocar('transicao', { volume: 0.7 });
    // a partir daqui a capa está saindo: ela não pode mais bloquear cliques
    capa.style.pointerEvents = 'none';
  })
    .to([texto, linha, medidor?.parentElement], { opacity: 0, duration: 0.6 * escala }, '>-0.2')
    .to(capa, { opacity: 0, duration: 1.5 * escala, ease: 'power2.inOut' }, '<')
    .to(
      stage.rig,
      { intro: 0, duration: reduzido ? 1.2 : 3.2, ease: 'power2.inOut' },
      '<-0.4'
    )
    .call(() => {
      stage.presenca.revelar(gsap);
      audio.tocar('pulso', { volume: 0.7 });
    }, null, '<+0.6')
    .to(hud, { opacity: 1, duration: 1.4 }, '<+1.2')
    .to({}, { duration: reduzido ? 0.1 : 0.4 });

  pular?.addEventListener('click', () => {
    tl.progress(0.82);
    tl.timeScale(4);
  });

  // clique/tecla também aceleram
  const acelerar = (e) => {
    if (e.type === 'keydown' && !['Escape', 'Enter', ' '].includes(e.key)) return;
    if (tl.progress() < 0.8) {
      tl.timeScale(2.6);
    }
  };
  window.addEventListener('keydown', acelerar);
  tl.eventCallback('onComplete', () => {
    window.removeEventListener('keydown', acelerar);
    finalizar();
  });

  return {
    pular() {
      tl.progress(1);
    },
  };
}
