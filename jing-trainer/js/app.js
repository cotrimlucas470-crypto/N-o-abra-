/* ============================================================
   app.js — inicialização
   ============================================================ */
'use strict';
(function (U) {
  const { $, $$, el } = U;

  /* fundo de cacos */
  (function cacos() {
    const f = $('#fundo');
    for (let i = 0; i < 7; i++) {
      const s = U.rnd(90, 260);
      f.appendChild(el('div', {
        class: 'caco',
        style: {
          width: s + 'px', height: s + 'px',
          left: U.rnd(-5, 95) + '%', top: U.rnd(-10, 90) + '%',
          clipPath: `polygon(${U.ri(20,50)}% 0%, 100% ${U.ri(15,45)}%, ${U.ri(55,85)}% 100%, 0% ${U.ri(50,85)}%)`,
          animationDuration: U.ri(50, 110) + 's',
          animationDirection: i % 2 ? 'reverse' : 'normal',
        },
      }));
    }
  })();

  /* navegação */
  $$('.railbtn').forEach(b => b.addEventListener('click', () => {
    U.Sfx.unlock();
    U.UI.ir(b.dataset.tela);
  }));

  /* modal: fechar por fora ou por [data-fecha] */
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal' || e.target.hasAttribute('data-fecha')) U.UI.fecharModal();
  });

  /* orientação */
  function checarOrientacao() {
    const retrato = window.innerHeight > window.innerWidth * 1.05;
    $('#girar').classList.toggle('on', retrato);
  }
  window.addEventListener('resize', checarOrientacao);
  window.addEventListener('orientationchange', () => setTimeout(checarOrientacao, 240));
  checarOrientacao();

  /* primeiro toque: libera áudio e sugere tela cheia */
  let primeiro = true;
  const destrava = () => {
    U.Sfx.unlock();
    if (primeiro) {
      primeiro = false;
      const d = U.DB.load();
      if (!d.viuTelaCheia) {
        d.viuTelaCheia = true; U.DB.save();
        setTimeout(() => U.UI.toast('Dica: Config → tela cheia antes de treinar'), 1200);
      }
    }
  };
  document.addEventListener('pointerdown', destrava, { once: false });

  /* evita zoom por duplo toque atrapalhando um combo */
  let ultimoToque = 0;
  document.addEventListener('touchend', (e) => {
    const t = Date.now();
    if (t - ultimoToque < 320 && e.target && e.target.id === 'hudcv') e.preventDefault();
    ultimoToque = t;
  }, { passive: false });

  /* sessão interrompida por fechar o app: fecha sozinha depois de 6h */
  (function sessaoOrfa() {
    const d = U.DB.load();
    if (d.sessaoAtual && Date.now() - d.sessaoAtual.t > 6 * 3600e3) {
      if (d.sessaoAtual.sets.length) U.C.fecharSessao();
      else { d.sessaoAtual = null; U.DB.save(); }
    }
  })();

  /* trilha: para quando o app sai de vista, volta quando retorna ao treino */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) U.Musica.parar(false);
    else if (document.body.classList.contains('treinando') && U.T && U.T._S && U.T._S.drill) {
      U.Musica.paraExercicio(U.T._S.drill, U.T._S.cfg);
    }
  });

  /* decaimento por dias parados + boot */
  U.M.aplicarDecaimento();
  U.HUD.getHud();
  U.D.getRotas('jing'); U.D.getRotas('luna');
  U.UI.render('inicio');

  /* offline */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  /* recalcula gráficos ao virar a tela */
  window.addEventListener('resize', () => {
    clearTimeout(window.__rz);
    U.G.esconderDica();
    window.__rz = setTimeout(() => { if (!$('#treino').classList.contains('on')) U.UI.render(); }, 260);
  });

  console.log('ESPELHO pronto ·', U.D.DRILLS.length, 'exercícios ·', U.C.NIVEIS.length, 'níveis ·',
    U.CI.PRINCIPIOS.length, 'princípios aplicados');
})(window.U);
