/* ============================================================
   js/escada.js — ADAPTAÇÃO DE DIFICULDADE DENTRO DO BLOCO

   ------------------------------------------------------------
   O QUE HAVIA ANTES, E POR QUE NÃO BASTAVA

   A dificuldade só mudava ENTRE blocos. Um bloco de dezesseis
   tentativas rodava inteiro num nível só — e se esse nível estava
   errado, a maior parte das tentativas não ensinava nem media nada:
   fáceis demais viram repetição sem desafio, difíceis demais viram
   erro em série. E o limiar de execução só era registrado depois de
   QUATRO blocos seguidos com a dificuldade parada. Uma sessão ruim
   no meio e a conta recomeçava.

   A única escada que existia (a do Freio) sobe um passo no erro e
   desce um passo no acerto. Isso converge para 50% de acerto — que
   é o certo para medir freio, e o errado para treinar execução,
   onde o sistema inteiro mira 85%.

   ------------------------------------------------------------
   O QUE ESTA ESCADA FAZ

   É uma escada ponderada (Kaernbach, 1991). A cada acerto o
   exercício fica um passo mais difícil; a cada erro ele fica mais
   fácil por um passo MAIOR. A razão entre os dois passos decide
   onde a escada assenta:

        passo no erro     alvo
        ─────────────  = ──────        85% → razão 5,67
        passo no acerto   1 − alvo

   No equilíbrio, os acertos puxam para baixo exatamente o quanto os
   erros empurram para cima — e isso só acontece quando você está
   acertando 85%. A escada não precisa saber qual é o seu nível: ela
   o encontra.

   O passo começa GROSSO e fica fino depois das duas primeiras
   reversões (cada vez que a escada muda de sentido). Grosso para
   chegar perto rápido; fino para estimar com precisão.

   ------------------------------------------------------------
   O NÚMERO QUE SAI — ESCOLHIDO POR SIMULAÇÃO, NÃO POR LIVRO

   O estimador clássico é a média de todos os pontos de reversão.
   Antes de ligar esta escada em qualquer exercício, ela foi rodada
   contra quatro jogadores simulados com limiar conhecido, 2.500
   blocos cada. O clássico errou para o lado FÁCIL em 35 a 55 ms por
   passo, e o intervalo dele cobria o valor verdadeiro em só 61 a 91%
   das vezes (deveria ser 95%). O motivo é a própria ponderação: o
   passo depois do erro é 5,7 vezes maior, então os picos ficam longe
   do limiar e puxam a média para cima.

   O estimador que ficou é a média dos VALES: o nível em que você
   errou depois de uma sequência de acertos. Na mesma simulação ele
   errou entre −5 e +2 ms em equilíbrio, teve o menor erro típico dos
   quatro candidatos e o intervalo cobriu o verdadeiro em 91 a 95%.

   MEIO PASSO FINO DE CORREÇÃO. Uma segunda rodada, com sete
   jogadores (quatro de tempo normal e três de curva logística, do
   rápido e firme ao lento e irregular) e no uso real — dois blocos
   de 24 somados, o segundo retomando o primeiro —, mostrou que o
   vale cru fica um pouco do lado DIFÍCIL do limiar: até 8,5% abaixo,
   ou seja, o app diria que você é mais rápido do que é. A razão é
   geométrica: a escada desce em passos finos até errar, então o
   erro cai em algum ponto do último passo, e em média meio passo
   além do limiar. Somar meio passo fino de volta baixou o pior
   viés de 8,5% para 6,2%, sem mexer na cobertura do intervalo
   (mínimo de 90% nos sete). Um passo inteiro ou três quartos
   pioraram o pior caso — meio passo é o que a geometria pede e o
   que a simulação confirmou.

   Na mesma rodada ficou decidido:
   · passo grosso de 25 ms, e não 40 — o maior dobrou o viés, porque
     o salto depois do primeiro erro passava de 200 ms;
   · dois vales bastam; exigir três derrubou a disponibilidade de 70%
     para 16% dos blocos sem melhorar o erro;
   · os vales de TODOS os blocos da mesma sessão entram juntos no
     limiar. Um bloco retoma a escada de onde o anterior parou, então
     juntar os vales é exatamente o mesmo que ter rodado uma escada
     mais longa — e nenhum bloco é desperdiçado por ter saído com um
     vale só.

   O valor final da escada NÃO é usado para nada além de saber onde
   o próximo bloco começa: ele é uma amostra só, e a mais ruidosa.

   ------------------------------------------------------------
   O QUE ELA SE RECUSA A DIZER

   · Com menos de dois vales na fase fina, não há limiar. Há um
     valor provisório, marcado como tal.
   · Se a escada bateu no limite DIFÍCIL do exercício mais de uma
     vez, o seu limiar está além do que ele consegue pedir — e o
     número que sair é um piso, não uma medida.
   · Se bateu no limite FÁCIL, o exercício está difícil demais em
     qualquer ponto da faixa, e o problema não é velocidade.

   ------------------------------------------------------------
   ONDE ELA NÃO ENTRA, DE PROPÓSITO

   · Visão de mapa e Leitura: lá o ESPALHAMENTO dos níveis é a
     medida (curva de esquecimento, curva por janela). Uma escada
     concentraria todas as tentativas perto de um nível só e
     destruiria exatamente a curva que esses exercícios desenham.
   · Freio: já tem a escada certa para ele, que mira 50%.
   · Ritmo, Carga e Andando: o acerto neles depende de outra coisa
     além do tempo (a batida, a tarefa secundária, o analógico). Uma
     escada no tempo culparia o tempo por um erro que não é dele.
   · Mira: cada tiro já devolve um número contínuo, o erro em graus.
     Escada serve para caçar um limiar escondido atrás de respostas
     de acertou/errou; quando a própria resposta é a medida, não há
     o que caçar — e apertar o cone só mediria o cone.
   · Fase de Reconexão: lá o sistema mira 92% de acerto. Com esse
     alvo a razão entre os passos passa de 11, um erro solto joga a
     escada lá para cima e os vales ficam raros demais para medir.
     A escada só liga das fases seguintes em diante, com alvo entre
     80% e 85%.
   ============================================================ */
'use strict';
(function (U) {

  /* ------------------------------------------------------------
     INTERVALO DOS VALES — alargado por 1,5.

     Os vales de uma escada não são independentes: cada um depende de
     onde a escada estava depois do anterior. O intervalo comum, que
     supõe independência, cobriu o valor verdadeiro em só 81 a 89% das
     sessões simuladas, quando deveria cobrir 95%. O fator 1,5 foi o
     menor que levou a cobertura a 90–95% na sessão e 92–98% num bloco
     só, nos quatro jogadores simulados. Errar para o lado largo é
     escolha: um intervalo estreito demais faria o app anunciar
     melhora que é ruído.
     ------------------------------------------------------------ */
  const INFLA_IC = 1.5;
  function icVales(vales) {
    const ic = U.S.mediaIC(vales);
    if (ic.lo == null) return { v: ic.v, lo: null, hi: null };
    return { v: ic.v, lo: ic.v - INFLA_IC * (ic.v - ic.lo), hi: ic.v + INFLA_IC * (ic.hi - ic.v) };
  }

  class EscadaPonderada {
    /**
     * @param {object} o
     * @param {number} o.inicio      valor inicial do parâmetro
     * @param {number} o.passo       passo da fase grossa, depois de um ACERTO
     * @param {number} [o.passoFino] passo da fase fina (padrão: metade)
     * @param {number} o.min         menor valor permitido
     * @param {number} o.max         maior valor permitido
     * @param {'menor'|'maior'} [o.dificilE] que lado é o difícil
     * @param {number} [o.alvo]      taxa de acerto em que ela assenta
     * @param {number} [o.reversoesGrossas]
     */
    constructor(o) {
      this.alvo = U.clamp(o.alvo ?? 0.85, 0.55, 0.95);
      this.razao = this.alvo / (1 - this.alvo);
      this.inicio = o.inicio;
      this.valor = U.clamp(o.inicio, o.min, o.max);
      this.passoGrosso = o.passo;
      this.passoFino = o.passoFino ?? o.passo / 2;
      this.min = o.min;
      this.max = o.max;
      this.dificilE = o.dificilE || 'menor';
      this.nGrossas = o.reversoesGrossas ?? 2;
      this.hist = [];
      this.reversoes = [];
      this.dir = 0;
      this.bateuDificil = 0;
      this.bateuFacil = 0;
    }

    get fase() { return this.reversoes.length < this.nGrossas ? 'grossa' : 'fina'; }
    get passo() { return this.fase === 'grossa' ? this.passoGrosso : this.passoFino; }

    /** Registra uma tentativa e devolve o próximo valor. */
    registrar(ok) {
      const antes = this.valor;
      this.hist.push({ valor: antes, ok: !!ok, fase: this.fase });

      /* +1 = indo para o difícil (acertou), -1 = indo para o fácil */
      const nova = ok ? 1 : -1;
      if (this.dir !== 0 && nova !== this.dir) {
        this.reversoes.push({ valor: antes, i: this.hist.length - 1,
                              fina: this.reversoes.length >= this.nGrossas });
      }
      this.dir = nova;

      const p = this.passo;
      const dificil = this.dificilE === 'menor' ? -1 : 1;
      const mov = ok ? dificil * p : -dificil * p * this.razao;
      let v = antes + mov;

      const limDificil = this.dificilE === 'menor' ? this.min : this.max;
      const limFacil = this.dificilE === 'menor' ? this.max : this.min;
      if ((dificil < 0 && v <= limDificil) || (dificil > 0 && v >= limDificil)) {
        v = limDificil;
        if (ok) this.bateuDificil++;
      }
      if ((dificil < 0 && v >= limFacil) || (dificil > 0 && v <= limFacil)) {
        v = limFacil;
        if (!ok) this.bateuFacil++;
      }
      this.valor = v;
      return v;
    }

    /** Vales da fase fina: o nível em que um erro interrompeu uma
        sequência de acertos. Ver o cabeçalho sobre por que estes. */
    vales() {
      /* meio passo fino de volta para o lado fácil — ver o cabeçalho */
      const meio = (this.dificilE === 'menor' ? 1 : -1) * this.passoFino / 2;
      return this.reversoes
        .filter(r => r.fina && !this.hist[r.i].ok)
        .map(r => r.valor + meio);
    }

    /** O limiar deste bloco, com a honestidade que a amostra permite. */
    limiar() {
      const finas = this.reversoes.filter(r => r.fina);
      const vales = this.vales();
      const naFina = this.hist.filter(h => h.fase === 'fina');
      const taxaFina = naFina.length ? naFina.filter(h => h.ok).length / naFina.length : null;
      const base = {
        n: this.hist.length, reversoes: this.reversoes.length, finas: finas.length,
        vales, taxaFina, alvo: this.alvo,
        bateuDificil: this.bateuDificil, bateuFacil: this.bateuFacil,
        teto: this.bateuDificil >= 2, piso: this.bateuFacil >= 2,
        valorFinal: this.valor, inicio: this.inicio,
        trilha: this.hist.map(h => ({ v: h.valor, ok: h.ok })),
        marcas: this.reversoes.map(r => ({ i: r.i, v: r.valor, vale: !this.hist[r.i].ok, fina: r.fina })),
      };

      if (vales.length < 2) {
        return {
          ...base, ok: false,
          provisorio: vales.length ? vales[0] : null,
          motivo: vales.length
            ? 'um vale só neste bloco — ele entra na conta da sessão, mas sozinho não é limiar'
            : 'a escada ainda não oscilou em volta do seu nível',
        };
      }

      const ic = icVales(vales);
      return {
        ...base, ok: true, v: ic.v, lo: ic.lo, hi: ic.hi,
        motivo: base.teto
          ? 'a escada bateu no limite difícil do exercício: o seu limiar está além do que ele consegue pedir, e este número é um piso'
          : base.piso
            ? 'a escada bateu no limite fácil: o exercício está difícil demais em qualquer ponto da faixa'
            : null,
      };
    }
  }

  /* ------------------------------------------------------------
     Onde o próximo bloco começa.

     Sem isto, toda escada recomeçaria do zero e gastaria a fase
     grossa inteira reencontrando um nível que o bloco anterior já
     tinha achado. Começar do último limiar faz a fase grossa virar
     só um ajuste — e sobra mais tentativa para a fase fina, que é a
     que mede.

     Começa um pouco do lado FÁCIL do último limiar, e não em cima
     dele: assim as primeiras tentativas são acertos, a escada desce
     com passo grosso até o seu nível e a primeira reversão acontece
     perto dele — em vez de o bloco abrir com uma sequência de erros.
     ------------------------------------------------------------ */
  function inicioSalvo(drillId, { maxDias = 21, folga = 0.12, dificilE = 'menor' } = {}) {
    const e = U.CT.estado(drillId);
    const s = e.escada;
    if (!s || s.valor == null || Date.now() - s.t > maxDias * U.DAY) return null;
    return { valor: dificilE === 'menor' ? s.valor * (1 + folga) : s.valor * (1 - folga),
             de: 'escada', dias: (Date.now() - s.t) / U.DAY };
  }

  const JANELA_SESSAO = 6 * 3600e3;

  /**
   * Guarda o que um bloco deixou: de onde o próximo retoma, e os vales,
   * que se somam aos dos outros blocos da mesma sessão.
   *
   * Vales de um bloco que bateu no teto ou no piso NÃO entram: foram
   * cortados pelo limite do exercício, e não pelo seu nível.
   */
  function registrarBloco(drillId, L) {
    if (!L) return null;
    const e = U.CT.estado(drillId);
    const agora = Date.now();
    if (!e.escadaSessao || agora - e.escadaSessao.t0 > JANELA_SESSAO) {
      e.escadaSessao = { t0: agora, vales: [], blocos: 0 };
    }
    if (!L.teto && !L.piso) e.escadaSessao.vales.push(...(L.vales || []));
    e.escadaSessao.blocos++;
    const retomar = L.ok ? L.v : (L.vales && L.vales.length ? L.vales[0] : L.valorFinal);
    e.escada = { valor: retomar, t: agora };
    U.DB.save();
    return limiarSessao(drillId);
  }

  /** Limiar da sessão: todos os vales dos blocos das últimas 6 horas. */
  function limiarSessao(drillId) {
    const s = U.CT.estado(drillId).escadaSessao;
    if (!s || Date.now() - s.t0 > JANELA_SESSAO || s.vales.length < 2) {
      return { ok: false, n: s ? s.vales.length : 0, blocos: s ? s.blocos : 0 };
    }
    const ic = icVales(s.vales);
    return { ok: true, v: ic.v, lo: ic.lo, hi: ic.hi, n: s.vales.length,
             blocos: s.blocos, t0: s.t0 };
  }

  /**
   * Nível de dificuldade (1..10) que um limiar implica, dada a faixa que
   * o exercício percorre de dif 1 a dif 10. É o que devolve ao
   * controlador entre blocos a informação que a escada mediu: sem isto
   * o acerto ficaria preso em 85% por construção, o controlador nunca
   * mexeria a dificuldade, e ajuda, variante e perturbação — que também
   * dependem dela — congelariam onde estão.
   */
  function difDoLimiar(v, faixa) {
    const [facil, dificil] = faixa;
    return U.clamp(1 + 9 * (facil - v) / (facil - dificil), 1, 10);
  }

  U.ES = { EscadaPonderada, inicioSalvo, registrarBloco, limiarSessao, difDoLimiar, icVales, INFLA_IC, JANELA_SESSAO };

})(window.U);
