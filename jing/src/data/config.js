/**
 * JING — SALÃO DE ESPELHOS FRAGMENTADOS
 * ------------------------------------------------------------------
 * ARQUIVO ÚNICO DE CONTEÚDO EDITÁVEL.
 *
 * Tudo que é texto, número exibido, etapa, combo, item ou rótulo mora aqui.
 * A interface lê deste arquivo — dá para atualizar o conteúdo sem tocar
 * em uma linha de layout, shader ou animação.
 *
 * REGRA DE HONESTIDADE (importante):
 * Esta é uma peça CONCEITUAL sobre recuperação mecânica. Nenhum número de
 * dano, frame, item ou patch de Honor of Kings é afirmado como oficial.
 * Todo campo que depende da versão atual do jogo está marcado com
 *   `editavel: true`  e/ou  `fonte: 'CAMPO EDITÁVEL'`
 * e aparece na interface com o selo "CAMPO EDITÁVEL".
 * Preencha com os dados reais da sua versão antes de publicar.
 */

export const IDENTIDADE = {
  titulo: 'JING',
  subtitulo: 'QUEBRE O PRÓPRIO ESPELHO',
  manifesto: ['Você não perdeu sua mecânica.', 'Você apenas precisa reconstruir o reflexo.'],
  cta: 'INICIAR RECUPERAÇÃO MECÂNICA',
  assinatura: 'SALÃO DE ESPELHOS FRAGMENTADOS',
};

/** Paleta — espelhada em CSS (src/styles/base.css) e usada pelos shaders. */
export const PALETA = {
  abismo: '#050814',
  profundo: '#080D1C',
  superficie: '#10172B',
  roxoEscuro: '#1A1235',
  espectral: '#7B61FF',
  ciano: '#00E5FF',
  prata: '#B8C4D8',
  prataBranca: '#E8F1FF',
  highlight: '#FFFFFF',
};

/**
 * Arte do personagem.
 * Se um arquivo existir em `public/jing/` e for apontado aqui, ele é carregado
 * como plano no centro da cena (com refração, eco temporal e dissolução).
 * Se `imagem` for null — ou se o arquivo não existir — a cena usa a
 * COMPOSIÇÃO DE PRESENÇA abstrata: coluna de luz + arco de fragmentos.
 * Nenhuma aparência é inventada para a personagem.
 */
export const PERSONAGEM = {
  imagem: null, // ex.: 'jing/jing.png'  (arquivo em public/jing/jing.png)
  alturaMundo: 7.2, // altura do plano em unidades de cena
  ecos: 3, // quantos reflexos temporais aparecem atrás
  legendaAusente: 'ESPAÇO RESERVADO — ARTE OFICIAL',
};

/** HUD discreto do canto. Números de leitura do "sistema", não do jogo. */
export const HUD = {
  sistema: 'JING // SYSTEM ONLINE',
  leituras: [
    { rotulo: 'REFLEXO', valor: 72, sufixo: '%' },
    { rotulo: 'CONTROLE', valor: 64, sufixo: '%' },
    { rotulo: 'PRECISÃO', valor: 81, sufixo: '%' },
    { rotulo: 'TEMPO DE REAÇÃO', valor: 0.31, sufixo: 's', casas: 2 },
  ],
  coordenadas: 'X 04.812 · Y -01.330 · Z 22.907',
  linhas: ['MIRROR HALL // SETOR 03', 'INTEGRIDADE DO DOMÍNIO ESTÁVEL', 'VARREDURA CONTÍNUA'],
};

export const INTRO = {
  passos: [
    { texto: 'REFLEXO DETECTADO', duracao: 1.3 },
    { texto: 'JING // SYSTEM ONLINE', duracao: 1.4 },
  ],
  pularRotulo: 'PULAR ABERTURA',
};

/** Seção CHRONO MIRROR — o domínio temporal. */
export const CHRONO = {
  titulo: 'CHRONO MIRROR',
  subtitulo: 'TEMPO DE RECUPERAÇÃO DO REFLEXO',
  descricao:
    'O salão não obedece ao relógio. Arraste a linha temporal: os fragmentos, as partículas e a própria câmera respondem — a cena inteira desacelera e acelera com você.',
  marcas: [
    { t: 0.12, rotulo: 'DILATAÇÃO' },
    { t: 0.4, rotulo: 'LEITURA' },
    { t: 0.62, rotulo: 'NORMAL' },
    { t: 0.85, rotulo: 'RESET' },
    { t: 1.0, rotulo: 'ACELERAÇÃO' },
  ],
  estados: [
    { limite: 0.35, nome: 'TEMPO DILATADO', nota: 'cada fragmento é legível' },
    { limite: 0.75, nome: 'LEITURA LENTA', nota: 'janela ampla de correção' },
    { limite: 1.15, nome: 'FLUXO NORMAL', nota: 'ritmo de partida' },
    { limite: 1.7, nome: 'PRESSÃO', nota: 'a mão precisa antecipar' },
    { limite: 99, nome: 'COLAPSO TEMPORAL', nota: 'só a memória muscular sobrevive' },
  ],
  quebrar: {
    rotulo: 'QUEBRAR O TEMPO',
    rotuloAtivo: 'TEMPO QUEBRADO',
    cooldown: 9, // segundos
    nota: 'Congela o salão inteiro. Cooldown visível.',
  },
};

/** Seção CRONÔMETRO DO DOMÍNIO — curva de aprendizado. */
export const CURVA = {
  titulo: 'CRONÔMETRO DO DOMÍNIO',
  subtitulo: 'A curva não é uma linha. É um espelho sendo remontado.',
  estagios: [
    {
      indice: '01',
      nome: 'MEMÓRIA MUSCULAR',
      foco: 'Combos 1 → 2 → Ataque Básico',
      tempo: '3–5 dias',
      progresso: 0.34,
      grafico: [0.08, 0.16, 0.27, 0.38, 0.47, 0.52, 0.55],
      nota: 'A mão volta antes da cabeça. Repetição sem plateia.',
      editavel: true,
    },
    {
      indice: '02',
      nome: 'RITMO DO ESPELHO',
      foco: 'Posicionamento + Habilidade 2/3',
      tempo: '1–2 semanas',
      progresso: 0.62,
      grafico: [0.2, 0.3, 0.36, 0.5, 0.58, 0.69, 0.74],
      nota: 'O intervalo entre as coisas passa a importar mais que as coisas.',
      editavel: true,
    },
    {
      indice: '03',
      nome: 'RESET PERFEITO',
      foco: 'Ultimate + troca de posição',
      tempo: '3+ semanas',
      progresso: 0.88,
      grafico: [0.3, 0.42, 0.55, 0.64, 0.76, 0.85, 0.93],
      nota: 'Estar em dois lugares no mesmo instante — e escolher o certo.',
      editavel: true,
    },
  ],
};

/**
 * Seção CALCULADORA.
 * Fórmula deliberadamente simples e explicável:
 *   dias = horasTotaisDoNivel / horasPorDia
 * As horas totais são ESTIMATIVAS DE PRÁTICA, não dados do jogo.
 */
export const CALCULADORA = {
  titulo: 'QUANTO TEMPO ATÉ O REFLEXO VOLTAR?',
  legenda: 'ESTIMATIVA DE RECUPERAÇÃO',
  rotuloInput: 'HORAS DE TREINO POR DIA',
  presets: [0.5, 1, 2, 3, 4],
  min: 0.25,
  max: 6,
  passo: 0.25,
  padrao: 1.5,
  formula: 'dias = horas totais estimadas ÷ horas de treino por dia',
  aviso: 'Estimativa conceitual de prática deliberada — não é dado oficial do jogo.',
  niveis: [
    {
      id: 'basica',
      nome: 'RECUPERAÇÃO BÁSICA',
      horas: 9,
      cor: '#00E5FF',
      descricao: 'Marcas, alcance, reset limpo. O controle mínimo de volta.',
      editavel: true,
    },
    {
      id: 'avancada',
      nome: 'RECUPERAÇÃO AVANÇADA',
      horas: 26,
      cor: '#7B61FF',
      descricao: 'Ritmo entre habilidades, posicionamento sob pressão.',
      editavel: true,
    },
    {
      id: 'alto',
      nome: 'REFLEXO DE ALTO NÍVEL',
      horas: 68,
      cor: '#E8F1FF',
      descricao: 'Decisão em tempo colapsado. O espelho responde antes de você pensar.',
      editavel: true,
    },
  ],
};

/** Seção PROTOCOLO DE RETORNO — timeline 3D. */
export const PROTOCOLO = {
  titulo: 'PROTOCOLO DE RETORNO',
  subtitulo: 'Três etapas. Uma superfície sendo remontada.',
  etapas: [
    {
      indice: '01',
      nome: 'O REAQUECIMENTO',
      quando: 'DIA 1',
      contexto: 'Modo Treino.',
      resumo: 'Recuperar o controle básico sem buscar velocidade máxima.',
      itens: [
        'marcas passivas',
        'alcance',
        'movimentação',
        'reset',
        'posicionamento',
        'jungle',
      ],
      objetivo: 'Recuperar o controle básico sem buscar velocidade máxima.',
      animacao: 'encaixe',
    },
    {
      indice: '02',
      nome: 'O RITMO DO ESPELHO',
      quando: 'DIAS 2–4',
      contexto: 'Partidas normais ou simulador.',
      resumo: 'O intervalo entre as ações vira o assunto.',
      itens: [
        'troca de posição',
        'ataques básicos',
        'tempo entre habilidades',
        'controle do clone',
        'não quebrar o ciclo',
      ],
      objetivo: 'Manter o ciclo inteiro sem interrupção.',
      animacao: 'ritmo',
    },
    {
      indice: '03',
      nome: 'RECOMPOSIÇÃO',
      quando: 'BUILD',
      contexto: 'Três slots holográficos.',
      resumo: 'A build é a última peça — e é a que mais muda entre versões.',
      itens: [],
      objetivo: 'Fechar a build de acordo com a versão atual do jogo.',
      animacao: 'build',
    },
  ],
  /**
   * SLOTS DE EQUIPAMENTO — 100% editáveis.
   * NENHUM item real, atributo ou número é afirmado aqui: os campos vêm
   * vazios de propósito, com o papel de cada slot descrito. Troque
   * `nome`, `atributo` e `icone` pelos itens reais da sua versão.
   */
  build: {
    aviso:
      'Itens dependem da versão atual de Honor of Kings. Os três slots abaixo descrevem FUNÇÃO, não itens confirmados — preencha em src/data/config.js › PROTOCOLO.build.slots.',
    slots: [
      {
        icone: '◇',
        nome: 'SLOT 01 — CAMPO EDITÁVEL',
        funcao: 'ACELERAÇÃO DE CICLO',
        atributo: 'ATRIBUTO — CAMPO EDITÁVEL',
        motivo: 'Encurtar o intervalo entre as ações do combo, para o ciclo não quebrar.',
        editavel: true,
      },
      {
        icone: '◈',
        nome: 'SLOT 02 — CAMPO EDITÁVEL',
        funcao: 'SOBREVIVÊNCIA NA TROCA',
        atributo: 'ATRIBUTO — CAMPO EDITÁVEL',
        motivo: 'Aguentar a janela em que você está exposto durante a troca de posição.',
        editavel: true,
      },
      {
        icone: '◆',
        nome: 'SLOT 03 — CAMPO EDITÁVEL',
        funcao: 'CONVERSÃO DE DANO',
        atributo: 'ATRIBUTO — CAMPO EDITÁVEL',
        motivo: 'Transformar o combo recuperado em resultado dentro da partida.',
        editavel: true,
      },
    ],
  },
};

/** Seção MAPA DO REFLEXO — mecânicas como objetos 3D. */
export const MECANICAS = {
  titulo: 'MAPA DO REFLEXO',
  subtitulo: 'Seis eixos. Selecione um e o salão escurece ao redor dele.',
  itens: [
    {
      id: 'mobilidade',
      nome: 'MOBILIDADE',
      simbolo: '⟢',
      resumo: 'Distância é decisão, não fuga.',
      texto:
        'Mobilidade em Jing não serve para sair — serve para escolher de onde a próxima ação acontece. Treine deslocamento COM intenção de destino, nunca com intenção de escapar.',
      pratica: 'Modo treino: chegue ao alvo por três rotas diferentes sem parar de se mover.',
    },
    {
      id: 'reset',
      nome: 'RESET',
      simbolo: '↺',
      resumo: 'O ciclo reinicia antes de terminar.',
      texto:
        'O reset é o que separa uma sequência de um combo. Você não espera a ação acabar: você prepara a próxima enquanto a atual ainda acontece.',
      pratica: 'Conte em voz alta o momento do reset até não precisar mais contar.',
    },
    {
      id: 'posicionamento',
      nome: 'POSICIONAMENTO',
      simbolo: '⌖',
      resumo: 'Onde você está decide o que você pode fazer.',
      texto:
        'Metade dos erros que parecem "mecânica perdida" são posicionamento. Antes de acusar a mão, olhe de onde a mão foi obrigada a jogar.',
      pratica: 'Revise uma partida só olhando sua posição no instante anterior a cada erro.',
    },
    {
      id: 'dano',
      nome: 'DANO',
      simbolo: '✧',
      resumo: 'Sequência completa vale mais que acerto isolado.',
      texto:
        'Dano aqui é consequência de ciclo inteiro. Um combo interrompido no meio custa mais do que um combo começado tarde.',
      pratica: 'Complete a sequência inteira mesmo quando o alvo já vai morrer.',
      nota: 'Valores numéricos dependem da versão — campo editável.',
    },
    {
      id: 'tempo',
      nome: 'TEMPO',
      simbolo: '◷',
      resumo: 'O intervalo é a habilidade.',
      texto:
        'Entre duas ações existe uma janela. Dominar Jing é dominar essa janela — não as ações. É por isso que o salão inteiro obedece ao seu controle de tempo.',
      pratica: 'Treine o mesmo combo em velocidade reduzida até o intervalo virar sensação.',
    },
    {
      id: 'controle',
      nome: 'CONTROLE',
      simbolo: '⬡',
      resumo: 'Calma é uma mecânica.',
      texto:
        'Controle é a mecânica que volta por último e some primeiro. Ela não é treinada em partidas difíceis: é treinada em repetições fáceis o bastante para você prestar atenção.',
      pratica: 'Sessões curtas. Pare antes de errar por cansaço.',
    },
  ],
};

/**
 * Seção ARQUIVO DE COMBOS.
 * IMPORTANTE: `timing` e `janela` são DESCRIÇÕES QUALITATIVAS.
 * Nenhum frame ou milissegundo é afirmado. Troque por valores medidos
 * na sua versão se quiser precisão numérica.
 */
export const COMBOS = {
  titulo: 'ARQUIVO DE COMBOS',
  subtitulo: 'Sequências temporais. Passe o mouse — ou toque — em cada passo.',
  aviso: 'Timings descritivos — sem frames exatos. Campos editáveis.',
  lista: [
    {
      id: 'reaquecimento',
      nome: 'SEQUÊNCIA DE REAQUECIMENTO',
      contexto: 'Modo treino, sem pressa.',
      passos: [
        {
          tipo: 'HABILIDADE',
          rotulo: 'ABERTURA',
          timing: 'sem pressa — confirme o alcance antes',
          janela: 'ampla',
          erro: 'começar longe demais e perder a sequência inteira',
          dica: 'olhe o alcance, não o inimigo',
          editavel: true,
        },
        {
          tipo: 'MOVIMENTO',
          rotulo: 'APROXIMAÇÃO',
          timing: 'imediatamente após a abertura',
          janela: 'média',
          erro: 'parar de se mover para "mirar"',
          dica: 'o deslocamento faz parte do combo',
          editavel: true,
        },
        {
          tipo: 'ATAQUE',
          rotulo: 'BÁSICO',
          timing: 'no encaixe do movimento',
          janela: 'curta',
          erro: 'pular o básico e ir direto para a próxima habilidade',
          dica: 'o básico é o que sustenta o ritmo',
          editavel: true,
        },
        {
          tipo: 'RESET',
          rotulo: 'REINÍCIO',
          timing: 'antes da sequência terminar',
          janela: 'curta',
          erro: 'esperar a animação acabar',
          dica: 'prepare a próxima enquanto a atual acontece',
          editavel: true,
        },
      ],
    },
    {
      id: 'ritmo',
      nome: 'CICLO DO ESPELHO',
      contexto: 'Partidas normais. Ritmo acima de velocidade.',
      passos: [
        {
          tipo: 'HABILIDADE',
          rotulo: 'MARCAÇÃO',
          timing: 'com o alvo já dentro da rota',
          janela: 'média',
          erro: 'marcar por reflexo, sem plano de saída',
          dica: 'decida a saída antes da entrada',
          editavel: true,
        },
        {
          tipo: 'MOVIMENTO',
          rotulo: 'TROCA DE POSIÇÃO',
          timing: 'assim que a marcação confirma',
          janela: 'curta',
          erro: 'trocar tarde e ficar exposto na volta',
          dica: 'a troca é a parte perigosa — ensaie ela isolada',
          editavel: true,
        },
        {
          tipo: 'ATAQUE',
          rotulo: 'ENCADEAMENTO',
          timing: 'durante o deslocamento, não depois',
          janela: 'curta',
          erro: 'quebrar o ciclo para "confirmar" visualmente',
          dica: 'confie na sequência: olhar trava a mão',
          editavel: true,
        },
        {
          tipo: 'RESET',
          rotulo: 'CICLO',
          timing: 'no fim do encadeamento',
          janela: 'muito curta',
          erro: 'resetar cedo demais e perder o dano acumulado',
          dica: 'o reset fecha o ciclo, não o interrompe',
          editavel: true,
        },
      ],
    },
    {
      id: 'reset-perfeito',
      nome: 'RESET PERFEITO',
      contexto: 'Alto nível. Duas posições no mesmo instante.',
      passos: [
        {
          tipo: 'HABILIDADE',
          rotulo: 'PREPARO',
          timing: 'fora da visão do alvo, se possível',
          janela: 'ampla',
          erro: 'preparar dentro do alcance de resposta do inimigo',
          dica: 'a melhor entrada começa antes de ser vista',
          editavel: true,
        },
        {
          tipo: 'ULTIMATE',
          rotulo: 'DOMÍNIO',
          timing: 'quando a rota de saída já existe',
          janela: 'média',
          erro: 'usar como entrada desesperada',
          dica: 'ultimate não é entrada: é troca de estado',
          editavel: true,
        },
        {
          tipo: 'MOVIMENTO',
          rotulo: 'TROCA',
          timing: 'imediatamente após o domínio',
          janela: 'muito curta',
          erro: 'hesitar meio segundo e perder as duas posições',
          dica: 'a hesitação custa mais que o erro',
          editavel: true,
        },
        {
          tipo: 'ATAQUE',
          rotulo: 'CONVERSÃO',
          timing: 'na chegada da troca',
          janela: 'curta',
          erro: 'chegar e recomeçar do zero',
          dica: 'você chegou no meio do combo, não no começo',
          editavel: true,
        },
        {
          tipo: 'RESET',
          rotulo: 'SAÍDA',
          timing: 'antes da resposta do time inimigo',
          janela: 'curta',
          erro: 'ficar para ver o resultado',
          dica: 'sair é parte do combo',
          editavel: true,
        },
      ],
    },
  ],
};

export const FINAL = {
  linhas: [
    'VOCÊ NÃO ESTÁ COMEÇANDO DO ZERO.',
    'Seu reflexo ainda está aí.',
    'Agora encontre-o novamente.',
  ],
  cta: 'RETORNAR AO CAMPO',
  rodape: 'Peça conceitual de fã. Sem dados oficiais de balanceamento.',
};

/**
 * ÁUDIO — a estrutura aceita arquivos reais em `public/audio/`.
 * Se o arquivo não existir, o AudioManager cai numa síntese WebAudio
 * equivalente (sem quebrar e sem console error). Basta soltar os .mp3
 * com os nomes abaixo para o som real assumir o lugar.
 */
export const AUDIO = {
  rotulo: 'SOM',
  padraoLigado: false,
  faixas: {
    ambiente: { arquivo: 'audio/ambiente.mp3', loop: true, volume: 0.32, sintese: 'drone' },
    vento: { arquivo: 'audio/vento.mp3', loop: true, volume: 0.18, sintese: 'vento' },
    vidro: { arquivo: 'audio/vidro.mp3', loop: false, volume: 0.5, sintese: 'vidro' },
    impacto: { arquivo: 'audio/impacto.mp3', loop: false, volume: 0.55, sintese: 'impacto' },
    metal: { arquivo: 'audio/metal.mp3', loop: false, volume: 0.4, sintese: 'metal' },
    transicao: { arquivo: 'audio/transicao.mp3', loop: false, volume: 0.45, sintese: 'transicao' },
    pulso: { arquivo: 'audio/pulso.mp3', loop: false, volume: 0.6, sintese: 'pulso' },
  },
};

/** Seções na ordem do scroll — dirigem a câmera e as transições. */
export const SECOES = [
  { id: 'hero', rotulo: 'HERO' },
  { id: 'chrono', rotulo: 'CHRONO MIRROR' },
  { id: 'curva', rotulo: 'DOMÍNIO' },
  { id: 'calculadora', rotulo: 'ESTIMATIVA' },
  { id: 'protocolo', rotulo: 'PROTOCOLO' },
  { id: 'mecanicas', rotulo: 'MAPA' },
  { id: 'combos', rotulo: 'COMBOS' },
  { id: 'final', rotulo: 'RETORNO' },
];

export default {
  IDENTIDADE,
  PALETA,
  PERSONAGEM,
  HUD,
  INTRO,
  CHRONO,
  CURVA,
  CALCULADORA,
  PROTOCOLO,
  MECANICAS,
  COMBOS,
  FINAL,
  AUDIO,
  SECOES,
};
