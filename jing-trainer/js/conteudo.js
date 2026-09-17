/* ============================================================
   conteudo.js — rotas, sinais e situações de luta
   ------------------------------------------------------------
   Mudança de fundo em relação à V1: os cenários de luta eram 8
   textos fixos. Depois de duas sessões o jogador decora a resposta
   e passa a treinar memória de cenário em vez de leitura de luta —
   o exercício continua parecendo bom e para de medir qualquer
   coisa. Aqui as situações são geradas por regra, e a explicação
   sai da mesma conta que define a resposta certa. Assim não existe
   gabarito para decorar, e a justificativa nunca contradiz a
   resposta.
   ============================================================ */
'use strict';
(function (U) {

  /* ============================================================
     ROTAS DA JING — nomeadas pela função, editáveis
     ============================================================ */
  const ROTAS = [
    { id: 'entrada',  nome: 'Entrada',        seq: ['s1', 'aa'], prio: 1,
      porque: 'O par mais repetido da partida. Se ele está lento, todo o resto herda o atraso.' },
    { id: 'marca',    nome: 'Marca',          seq: ['s1', 'aa', 's2'], prio: 2,
      porque: 'Entrada mais continuação. É a rota de referência do sistema: tudo é medido contra ela.' },
    { id: 'recorte',  nome: 'Recorte',        seq: ['aa', 's1', 'aa'], prio: 3,
      porque: 'Encaixar ataque entre habilidades. Aqui mora a diferença entre dano teórico e dano real.' },
    { id: 'reflexo',  nome: 'Reflexo',        seq: ['s2', 's1', 'aa'], prio: 4,
      porque: 'Posicionar antes de entrar. Rota de quem não quer chegar no lugar errado.' },
    { id: 'saida',    nome: 'Saída',          seq: ['s3', 's1'], prio: 5,
      porque: 'O percurso mais longo do polegar no seu HUD. Primeira coisa a enferrujar numa pausa.' },
    { id: 'execucao', nome: 'Execução',       seq: ['s1', 'aa', 's2', 'aa'], prio: 6,
      porque: 'Sequência de abate. Só vale depois que Entrada e Marca estiverem firmes.' },
    { id: 'completa', nome: 'Espelho Inteiro',seq: ['s2', 's1', 'aa', 's3', 'aa', 's1'], prio: 7,
      porque: 'A rota inteira. Por último de propósito: quase nunca é ela que perde a luta.' },
  ];

  const ROTAS_LUNA = [
    { id: 'l-elo',    nome: 'Elo',    seq: ['s1', 'aa', 's3'], prio: 1,
      porque: 'A unidade da cadeia: marcar, bater, saltar.' },
    { id: 'l-cadeia', nome: 'Cadeia', seq: ['s1', 'aa', 's3', 's1', 'aa', 's3', 's1', 'aa', 's3'], prio: 2,
      porque: 'Três elos sem erro. Um toque trocado quebra tudo — igual à partida.' },
  ];

  function getRotas(quem = 'jing') {
    const d = U.DB.load();
    const k = quem === 'luna' ? 'rotasLuna' : 'rotasJing';
    if (!d[k]) { d[k] = JSON.parse(JSON.stringify(quem === 'luna' ? ROTAS_LUNA : ROTAS)); U.DB.save(); }
    return d[k];
  }
  const rotaPorId = (id, quem = 'jing') => getRotas(quem).find(r => r.id === id);
  const seqs = (ids, quem = 'jing') => ids.map(i => (rotaPorId(i, quem) || { seq: ['s1'] }).seq);

  /* ============================================================
     SINAIS — leitura sob oclusão
     Quatro respostas possíveis. Duas provas de controle (nada a
     fazer) em cada bloco, porque reagir a tudo é o mesmo erro que
     não reagir a nada — e sem elas o exercício premia apertar.
     ============================================================ */
  const RESPOSTAS = {
    ult:    { botao: 's3',    rotulo: 'ULTIMATE' },
    inv:    { botao: 'flash', rotulo: 'INVOCADOR' },
    recuar: { botao: 'joy',   rotulo: 'RECUAR' },
    seguir: { botao: 'aa',    rotulo: 'SEGUIR' },
    nada:   { botao: null,    rotulo: 'NADA' },
  };

  const SINAIS = [
    { id: 'gancho', icone: '🪝', texto: 'Gancho saindo da lateral, você na linha', r: 'inv',
      porque: 'Projétil já lançado não se resolve com dano. Só deslocamento instantâneo sai da linha a tempo.' },
    { id: 'investida', icone: '🐂', texto: 'Tanque investindo de frente, controle em linha', r: 'recuar',
      porque: 'Sair da linha custa meio passo. Comer o controle custa a luta.' },
    { id: 'area', icone: '🔥', texto: 'Área acendeu no chão sob você', r: 'recuar',
      porque: 'Área de chão se resolve com passo. Gastar habilidade aqui é gastar duas vezes.' },
    { id: 'assassino', icone: '🗡', texto: 'Assassino apareceu ATRÁS de você', r: 'ult',
      porque: 'Precisa de reposicionamento imediato. Andar não vence a velocidade dele.' },
    { id: 'abate', icone: '💀', texto: 'Alvo com um fio de vida fugindo', r: 'seguir',
      porque: 'Não é ameaça, é conta. Hesitar aqui é o erro mais caro de quem voltou de uma pausa.' },
    { id: 'canal', icone: '🧊', texto: 'Controle em área sendo canalizado à sua frente', r: 'recuar',
      porque: 'Canalização tem aviso. Quem lê o aviso não gasta invocador.' },
    { id: 'sumidos', icone: '👻', texto: 'Dois inimigos sumiram do mapa, você empurrando sozinho', r: 'recuar',
      porque: 'Informação faltando é informação ruim. Você não perde por estar errado, perde por não saber.' },
    { id: 'escudo', icone: '🛡', texto: 'Suporte escudou o alvo e sua entrada já foi gasta', r: 'recuar',
      porque: 'Sem recurso e com escudo na frente, ficar não é coragem.' },
    { id: 'janela', icone: '⚡', texto: 'Seu invocador pronto, o do alvo já foi usado', r: 'seguir',
      porque: 'Vantagem de recurso é janela curta. Quem espera, devolve.' },
    { id: 'cerco', icone: '🌀', texto: 'Você no meio de três, ultimate pronta', r: 'ult',
      porque: 'A ultimate aqui é rota de saída, não ferramenta de dano. Cedo é melhor que perfeito.' },
    { id: 'torre', icone: '🕳', texto: 'Você sob a torre inimiga com metade da vida', r: 'recuar',
      porque: 'A torre não erra e não tem recarga. Nenhuma execução compensa a conta dela.' },
    { id: 'ultErrou', icone: '🧨', texto: 'O inimigo gastou a ultimate e errou', r: 'seguir',
      porque: 'A maior janela do jogo. Quem não entra agora entra depois, no pior momento.' },
    { id: 'encurralado', icone: '🏹', texto: 'Atirador virou para você e não há cobertura', r: 'ult',
      porque: 'Sem cobertura, andar só prolonga o tempo sob tiro.' },
    { id: 'iniciou', icone: '🟢', texto: 'Seu tanque iniciou e prendeu dois', r: 'seguir',
      porque: 'A entrada dele é a sua. Atrasar dois segundos vira empate.' },
    { id: 'nada1', icone: '✅', texto: 'Aliado usou habilidade perto de você. Nada mudou', r: 'nada',
      porque: 'Movimento na tela não é ameaça. Reagir a tudo é o mesmo que não ler nada.' },
    { id: 'nada2', icone: '🌿', texto: 'Um minion morreu ao seu lado', r: 'nada',
      porque: 'Se apertou aqui, o dedo está andando sozinho — e isso vira invocador jogado fora.' },
    { id: 'nada3', icone: '💠', texto: 'Seu próprio efeito de passiva acendeu', r: 'nada',
      porque: 'Estímulo seu não é estímulo do inimigo. Distinguir os dois é metade da leitura.' },
  ];

  /* ============================================================
     GERADOR DE SITUAÇÃO — regra, não gabarito
     ============================================================ */
  const PAPEIS = {
    atirador:  { icone: '🏹', nome: 'Atirador',  valor: 1.00, ameaca: 0.85, dureza: 0.25 },
    mago:      { icone: '🔮', nome: 'Mago',      valor: 0.95, ameaca: 0.90, dureza: 0.30 },
    assassino: { icone: '🗡', nome: 'Assassino', valor: 0.72, ameaca: 1.00, dureza: 0.40 },
    suporte:   { icone: '🛡', nome: 'Suporte',   valor: 0.45, ameaca: 0.55, dureza: 0.55 },
    tanque:    { icone: '🪨', nome: 'Tanque',    valor: 0.18, ameaca: 0.72, dureza: 1.00 },
  };

  const ESTADOS = [
    { id: 'limpo',     nota: '',                 valor: 1.00, ameaca: 1.00, risco: 1.00 },
    { id: 'semInv',    nota: 'sem invocador',    valor: 1.35, ameaca: 0.85, risco: 0.70 },
    { id: 'ultPronta', nota: 'ultimate pronta',  valor: 0.85, ameaca: 1.70, risco: 1.80 },
    { id: 'escudado',  nota: 'escudado',         valor: 0.50, ameaca: 1.00, risco: 1.10 },
    { id: 'preso',     nota: 'preso',            valor: 1.45, ameaca: 0.35, risco: 0.30 },
    { id: 'recuando',  nota: 'recuando',         valor: 0.80, ameaca: 0.60, risco: 0.60 },
    { id: 'naTorre',   nota: 'sob a torre',      valor: 0.55, ameaca: 1.05, risco: 2.00 },
  ];

  const DISTS = [
    { id: 'perto', nota: 'perto',  valor: 1.25, ameaca: 1.35 },
    { id: 'media', nota: 'média',  valor: 1.00, ameaca: 1.00 },
    { id: 'longe', nota: 'longe',  valor: 0.55, ameaca: 0.60 },
  ];

  /**
   * Gera uma situação com resposta calculada.
   * A incerteza cresce com a dificuldade: menos tempo de leitura,
   * mais unidades, e no topo algumas informações ficam ocultas —
   * decidir com o que dá para ver é o conteúdo, não um defeito.
   */
  /**
   * Sorteia uma situação com a resposta certa BALANCEADA.
   * Sem isso o gerador produzia "recuar" em ~62% das vezes — e um exercício
   * em que uma resposta é certa na maioria das vezes ensina a chutar essa
   * resposta e ainda entrega pontuação alta. Aqui a resposta-alvo é escolhida
   * primeiro, por baralho, e a situação é reamostrada até produzi-la.
   */
  let sacoResposta = [];
  function proximaResposta() {
    if (!sacoResposta.length) sacoResposta = U.shuffle(['entrar', 'esperar', 'recuar']);
    return sacoResposta.pop();
  }
  function gerarSituacao(dif, alvo) {
    const querida = alvo || proximaResposta();
    let s = null;
    for (let i = 0; i < 60; i++) {
      s = montarSituacao(dif);
      if (s.certa === querida) return s;
    }
    return s;   // desistiu de equilibrar: melhor uma situação válida que nenhuma
  }

  function montarSituacao(dif) {
    const d = U.clamp(dif, 1, 10);
    const nUnid = d < 4 ? 2 : d < 7 ? 3 : 4;
    const ocultar = d < 5 ? 0 : d < 8 ? 1 : 2;
    const papeis = U.shuffle(Object.keys(PAPEIS)).slice(0, nUnid);

    const unid = papeis.map((pa, i) => {
      const est = d < 3 ? ESTADOS[0] : U.pick(ESTADOS);
      const dist = U.pick(DISTS);
      const hp = U.rnd(0.15, 0.98);
      const P = PAPEIS[pa];
      return {
        id: 'u' + i, papel: pa, icone: P.icone, nome: P.nome,
        hp, est, dist, nota: [dist.nota, est.nota].filter(Boolean).join(' · '),
        /* quanto vale abater agora */
        vAbate: P.valor * (1.45 - hp) * dist.valor * est.valor,
        /* quanto pode te punir se você entrar */
        vAmeaca: P.ameaca * (0.55 + hp * 0.65) * dist.ameaca * est.ameaca,
        /* quanto custa encostar nele */
        vRisco: (P.ameaca * 0.6 + 0.4) * (0.5 + hp) * dist.ameaca * est.risco * (1 + P.dureza),
      };
    });

    /* No alto da escala, parte da informação some — é assim na partida. */
    const ocultos = U.shuffle(unid.slice()).slice(0, ocultar);
    for (const u of ocultos) { u.oculto = true; u.notaVisivel = '?'; }

    const somaAmeaca = unid.reduce((a, u) => a + u.vAmeaca, 0);
    const melhorAlvo = unid.slice().sort((a, b) => b.vAbate - a.vAbate)[0];
    const maiorRisco = unid.slice().sort((a, b) => b.vRisco - a.vRisco)[0];
    const meuHp = U.rnd(0.28, 0.95);
    const temInv = Math.random() < 0.6;
    const aliadoIniciou = Math.random() < 0.45;

    /* Conta da decisão: entrar vale quando o prêmio do melhor alvo
       supera a ameaça somada corrigida pela minha vida e recurso. */
    const forcaEntrada = melhorAlvo.vAbate * (aliadoIniciou ? 1.55 : 1.0) * (temInv ? 1.15 : 0.9);
    const custoEntrada = somaAmeaca * (1.5 - meuHp) * (temInv ? 0.85 : 1.15);
    const margem = forcaEntrada - custoEntrada;

    let certa, porque;
    if (margem > 0.35) {
      certa = 'entrar';
      porque = `${melhorAlvo.nome}${melhorAlvo.nota ? ' (' + melhorAlvo.nota + ')' : ''} com ${Math.round(melhorAlvo.hp * 100)}% de vida é o melhor retorno disponível, e ${aliadoIniciou ? 'o seu time já iniciou' : 'a ameaça somada está baixa'}. A janela não melhora — ela fecha.`;
    } else if (margem < -0.35) {
      certa = 'recuar';
      porque = `A ameaça somada${maiorRisco.est.id !== 'limpo' ? ' (com ' + maiorRisco.nome + ' ' + maiorRisco.est.nota + ')' : ''} supera o prêmio, e você está com ${Math.round(meuHp * 100)}% de vida${temInv ? '' : ' e sem invocador'}. Entrar aqui é execução perfeita de uma decisão ruim.`;
    } else {
      certa = 'esperar';
      porque = `A conta está quase empatada. ${aliadoIniciou ? '' : 'Sem o início do seu time, '}você seria o primeiro a entrar com o personagem mais frágil da composição. Segundo a entrar, primeiro a sair vivo.`;
    }

    const OPC = {
      entrar: { id: 'entrar', texto: 'ENTRAR', icone: '⚔', executa: true },
      esperar: { id: 'esperar', texto: 'ESPERAR', icone: '⏳', executa: false },
      recuar: { id: 'recuar', texto: 'RECUAR', icone: '↩', executa: false },
    };
    let opcoes = d < 4 ? [OPC.entrar, OPC.recuar] : [OPC.entrar, OPC.esperar, OPC.recuar];
    if (!opcoes.find(o => o.id === certa)) opcoes.push(OPC[certa]);
    opcoes = U.shuffle(opcoes);

    /* Reviravolta: a situação muda no meio da execução. Probabilidade
       e severidade crescem com a dificuldade. */
    let reviravolta = null;
    if (certa === 'entrar' && Math.random() < (0.25 + d * 0.045)) {
      const parar = Math.random() < 0.65;
      reviravolta = parar
        ? { parar: true,
            texto: U.pick(['O JUNGLE SAIU DA MATA ÀS SUAS COSTAS', 'SEU ALIADO MORREU — AGORA É 1 CONTRA 3', 'O SUPORTE CHEGOU E ESCUDOU O ALVO']),
            porque: `Com ${Math.round(meuHp * 100)}% de vida${temInv ? '' : ' e sem invocador'}, o abate deixou de valer o preço. Soltar a jogada no meio é uma habilidade, não desistência.` }
        : { parar: false,
            texto: U.pick(['O ALVO GASTOU O DESLOCAMENTO', 'SEU TANQUE PRENDEU O SUPORTE', 'O MAGO ERROU A ULTIMATE']),
            porque: 'A janela abriu mais. Continue.' };
    }

    const contexto = `Você: ${Math.round(meuHp * 100)}% de vida${temInv ? ', invocador pronto' : ', SEM invocador'}. ${aliadoIniciou ? 'Seu time já iniciou.' : 'Ninguém iniciou ainda.'}`;

    return {
      unid, opcoes, certa, porque, reviravolta, contexto,
      meuHp, temInv, aliadoIniciou, margem,
      melhorAlvo: melhorAlvo.id, maiorRisco: maiorRisco.id,
      rota: U.pick([['s1', 'aa', 's2'], ['s1', 'aa', 's2', 'aa'], ['s2', 's1', 'aa']]),
      ocultos: ocultar,
    };
  }

  U.CO = { ROTAS, ROTAS_LUNA, getRotas, rotaPorId, seqs, SINAIS, RESPOSTAS,
           PAPEIS, ESTADOS, DISTS, gerarSituacao };

})(window.U);
