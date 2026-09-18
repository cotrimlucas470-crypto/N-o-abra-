/* ============================================================
   app.js — inicialização
   ============================================================ */
'use strict';
(function (U) {
  const { $, $$, el } = U;

  (function cacos() {
    const f = $('#fundo');
    for (let i = 0; i < 6; i++) {
      const s = U.rnd(90, 250);
      f.appendChild(el('div', { class: 'caco', style: {
        width: s + 'px', height: s + 'px',
        left: U.rnd(-5, 95) + '%', top: U.rnd(-10, 90) + '%',
        clipPath: `polygon(${U.ri(20,50)}% 0%, 100% ${U.ri(15,45)}%, ${U.ri(55,85)}% 100%, 0% ${U.ri(50,85)}%)`,
        animationDuration: U.ri(50, 110) + 's',
        animationDirection: i % 2 ? 'reverse' : 'normal',
      } }));
    }
  })();

  $$('.railbtn').forEach(b => b.addEventListener('click', () => { U.Sfx.unlock(); U.UI.ir(b.dataset.tela); }));

  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal' || e.target.hasAttribute('data-fecha')) U.UI.fecharModal();
  });

  function checarOrientacao() {
    $('#girar').classList.toggle('on', window.innerHeight > window.innerWidth * 1.05);
  }
  window.addEventListener('resize', checarOrientacao);
  window.addEventListener('orientationchange', () => setTimeout(checarOrientacao, 240));
  checarOrientacao();

  document.addEventListener('pointerdown', () => U.Sfx.unlock(), { once: false });

  let ultimoToque = 0;
  document.addEventListener('touchend', (e) => {
    const t = Date.now();
    if (t - ultimoToque < 320 && e.target && e.target.id === 'hudcv') e.preventDefault();
    ultimoToque = t;
  }, { passive: false });

  /* trilha acompanha a visibilidade do app */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) U.Musica.parar(false);
    else if (document.body.classList.contains('treinando') && U.T._St && U.T._St.drill) {
      U.Musica.paraExercicio(U.T._St.drill, U.T._St.cfg);
    }
  });

  /* sessão órfã: fecha sozinha depois de 4h sem atividade */
  (function orfa() {
    const d = U.DB.load();
    if (d.sessaoAtual && Date.now() - d.sessaoAtual.t > 4 * 3600e3) {
      if (d.sessaoAtual.blocos && d.sessaoAtual.blocos.length) {
        const s = d.sessaoAtual; s.fim = s.t + 3600e3;
        d.sessoes.push(s);
      }
      d.sessaoAtual = null; U.DB.save();
    }
  })();

  U.DB.load();
  U.HUD.getHud();
  U.CO.getRotas('jing'); U.CO.getRotas('luna');
  U.CT.avaliarFase();
  U.UI.render('agora');

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  window.addEventListener('resize', () => {
    clearTimeout(window.__rz);
    U.G.esconderDica();
    window.__rz = setTimeout(() => { if (!$('#treino').classList.contains('on')) U.UI.render(); }, 260);
  });

  console.log('ESPELHO v8 ·', U.D.DRILLS.length, 'exercícios ·',
    U.DS.REGRAS.length, 'regras ·', U.CI.PRINCIPIOS.length, 'princípios');
})(window.U);
