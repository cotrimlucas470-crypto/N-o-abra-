import { escapeHtml } from './ui/Modal.js';

/**
 * LEARN / HELP (regras 22 e 23): explicações curtas, conceitos e exemplos mínimos.
 * NÃO é um curso e não tem sequência obrigatória — o usuário aprende explorando.
 *
 * Sobre vídeos: nenhum vídeo é inventado. Linkamos canais/documentações oficiais e,
 * para temas específicos, uma busca pronta no YouTube — o que existir de fato aparece lá.
 */

const TOPICS = [
  {
    id: 'inicio',
    title: 'Começando',
    body: `
      <p>Forge Mobile é um <b>laboratório</b> de desenvolvimento de jogos. Não há aulas obrigatórias:
      crie objetos, mude propriedades, escreva scripts e aperte <b>Play</b>.</p>
      <h4>Fluxo típico</h4>
      <ol>
        <li><b>Hierarchy ＋</b> → crie um GameObject.</li>
        <li><b>Inspector ＋</b> → adicione <code>Sprite Renderer</code>, <code>Rigidbody</code> e <code>Collider</code>.</li>
        <li><b>Project</b> → <i>Novo script</i>, escreva o comportamento.</li>
        <li>Volte ao Inspector, adicione o componente <code>Script</code> e escolha o arquivo.</li>
        <li><b>▶ Play</b> → a cena executa de verdade na Game View.</li>
      </ol>
      <p>Tudo é salvo no aparelho (IndexedDB). Feche e reabra: seu projeto continua lá.</p>`,
  },
  {
    id: 'gameobject',
    title: 'GameObject e componentes',
    body: `
      <p>Um <b>GameObject</b> é um nó vazio com nome, tag e um <code>Transform</code>. O comportamento
      vem dos <b>componentes</b> que você adiciona.</p>
      <h4>Componentes disponíveis</h4>
      <ul>
        <li><code>Transform</code> — posição, rotação e escala (sempre presente).</li>
        <li><code>Sprite Renderer</code> — formas ou texturas 2D.</li>
        <li><code>Mesh Renderer</code> — primitivas com sombreamento simplificado.</li>
        <li><code>Rigidbody</code> + <code>Collider</code> — física e colisão.</li>
        <li><code>Camera</code>, <code>Light</code>, <code>Audio Source</code>.</li>
        <li><code>UI Element</code> — texto, botão, imagem, painel, slider, toggle e input.</li>
        <li><code>Script</code> — seu código.</li>
      </ul>
      <p>Objetos podem ter filhos: arraste uma linha da Hierarchy sobre outra para reparentar.</p>`,
  },
  {
    id: 'fisica',
    title: 'Física',
    body: `
      <p>Adicione <code>Rigidbody</code> + <code>Collider</code> em um objeto e um <code>Collider</code>
      no chão. Aperte Play: ele cai.</p>
      <h4>Conceitos</h4>
      <ul>
        <li><b>Massa</b> — resistência à força. <code>addForce</code> divide pela massa; <code>addImpulse</code> muda a velocidade na hora.</li>
        <li><b>Gravity Scale</b> — multiplicador da gravidade da cena.</li>
        <li><b>Bounciness</b> (restituição) e <b>Friction</b> — resposta ao contato.</li>
        <li><b>Is Trigger</b> — detecta sem empurrar (moedas, checkpoints).</li>
        <li><b>Sleeping</b> — corpos parados saem da simulação e voltam ao serem tocados.</li>
      </ul>
      <pre>function update() {
  const rb = GetComponent('Rigidbody');
  if (Input.jumpDown &amp;&amp; rb.grounded) rb.addImpulse(0, 8 * rb.mass);
}</pre>
      <p><i>Limitação:</i> colliders são alinhados aos eixos — girar o objeto muda o desenho, não a caixa de colisão.</p>`,
  },
  {
    id: 'scripting',
    title: 'Scripting',
    body: `
      <p>Os scripts são <b>JavaScript</b>, não C#. A API imita os nomes de uma engine moderna
      (ciclo <code>start/update/fixedUpdate/lateUpdate</code>), mas rodar C# de verdade exigiria
      um runtime .NET no navegador — fora do escopo de um app leve para celular.</p>
      <h4>Ciclo de vida</h4>
      <ul>
        <li><code>start()</code> — uma vez, quando a cena começa.</li>
        <li><code>update()</code> — todo frame (use <code>Time.deltaTime</code>).</li>
        <li><code>fixedUpdate()</code> — passo fixo da física.</li>
        <li><code>lateUpdate()</code> — depois de tudo (ideal para câmera).</li>
        <li><code>onCollisionEnter(other)</code>, <code>onTriggerEnter(other)</code>, <code>onClick()</code>.</li>
      </ul>
      <h4>API principal</h4>
      <pre>transform.position.x += 2 * Time.deltaTime;
transform.rotation.z += 90 * Time.deltaTime;
const rb = GetComponent('Rigidbody');
const h = Input.getAxis('Horizontal');
Debug.Log('valor: ' + h);
const inimigo = Find('Enemy');
Instantiate('Coin 1', 3, 2);
Destroy(gameObject, 1.5);</pre>
      <p><b>props</b>: valores definidos no Inspector chegam como <code>props.nome</code> — o mesmo script serve
      para vários objetos com números diferentes.</p>
      <p><b>Sandbox</b>: <code>window</code>, <code>document</code>, <code>fetch</code>, <code>localStorage</code> e afins
      estão bloqueados dentro dos scripts. Loops infinitos são interrompidos automaticamente.</p>`,
  },
  {
    id: 'ui',
    title: 'UI',
    body: `
      <p>Crie um GameObject e adicione <code>UI Element</code>. A UI é desenhada em espaço de tela,
      dentro da Game View, e responde ao toque de verdade.</p>
      <pre>// no script de um objeto qualquer
const ui = Find('Score UI').getComponent('UIElement');
ui.text = 'Moedas: ' + total;

// em um botão:
function start() {
  GetComponent('UIElement').onClick = () => Debug.Log('clicou!');
}</pre>
      <p>Âncoras (<code>top-left</code>, <code>center</code>, <code>bottom-center</code>…) mantêm o layout
      correto em retrato e paisagem.</p>`,
  },
  {
    id: 'performance',
    title: 'Performance no celular',
    body: `
      <p>Settings → Performance controla FPS, resolução interna, sombras, partículas, pós-processamento e overlay.</p>
      <ul>
        <li><b>Resolution Scale</b> — o custo de preencher pixels cai com o quadrado da escala. 0,85× ≈ 28% menos pixels.</li>
        <li><b>Dynamic Resolution</b> — ajusta sozinho para segurar o frame time no alvo.</li>
        <li><b>FPS Limit</b> — menos frames, menos calor e mais bateria. 120 Hz só compensa quando a carga permite.</li>
        <li><b>Performance Overlay</b> — FPS, 1% low, frame time, draw calls, objetos, física e resolução.</li>
        <li><b>Stress Test</b> — 100/500/1000 objetos com física e scripts, com números medidos.</li>
      </ul>
      <p>Referências de frame time: <b>16,67 ms</b> = 60 FPS · <b>11,11 ms</b> = 90 FPS · <b>8,33 ms</b> = 120 FPS.</p>`,
  },
  {
    id: 'limites',
    title: 'O que Forge Mobile não é',
    body: `
      <p>Forge Mobile <b>não é a Unity</b>, não abre projetos Unity e não executa C#. É um ambiente
      educacional inspirado em conceitos de engines modernas, com implementação própria.</p>
      <h4>Limitações honestas</h4>
      <ul>
        <li>Renderização 2D em Canvas; o Mesh Renderer é uma projeção simplificada, não um pipeline 3D.</li>
        <li>Colisores alinhados aos eixos (box/círculo), sem rotação de colisor nem joints.</li>
        <li>Prefabs guardam uma cópia do objeto; não há sincronização automática de instâncias já criadas.</li>
        <li>Modelos 3D (obj/gltf/fbx) são armazenados como arquivo, mas não são desenhados.</li>
        <li>O sandbox de scripts impede acessos acidentais ao dispositivo, mas não é barreira de segurança contra código hostil.</li>
      </ul>`,
  },
];

const LINKS = [
  { label: 'MDN — Desenvolvimento de jogos na web', url: 'https://developer.mozilla.org/pt-BR/docs/Games' },
  { label: 'MDN — Canvas API', url: 'https://developer.mozilla.org/pt-BR/docs/Web/API/Canvas_API' },
  { label: 'MDN — requestAnimationFrame', url: 'https://developer.mozilla.org/pt-BR/docs/Web/API/Window/requestAnimationFrame' },
  { label: 'MDN — IndexedDB', url: 'https://developer.mozilla.org/pt-BR/docs/Web/API/IndexedDB_API' },
  { label: 'web.dev — Performance na web', url: 'https://web.dev/explore/fast' },
  { label: 'Unity Learn (conceitos de engine, site oficial)', url: 'https://learn.unity.com/' },
  { label: 'Canal oficial da Unity no YouTube', url: 'https://www.youtube.com/@unity' },
];

export class LearnPanel {
  constructor({ el, app }) {
    this.el = el;
    this.app = app;
    this.current = 'inicio';
  }

  render(topicId = this.current) {
    this.current = topicId;
    const topic = TOPICS.find((t) => t.id === topicId) || TOPICS[0];
    const nav = TOPICS.map((t) =>
      `<button class="btn sm${t.id === topic.id ? ' primary' : ''}" data-topic="${t.id}">${escapeHtml(t.title)}</button>`).join('');

    this.el.innerHTML =
      `<div class="learn-nav">${nav}</div>` +
      `<div class="learn-card"><h3>${escapeHtml(topic.title)}</h3>${topic.body}</div>` +
      `<div class="learn-card">
         <h3>Procurar vídeos e documentação</h3>
         <p style="font-size:12.5px">Digite um assunto (ex.: "física 2D", "game loop", "IndexedDB"). Abrimos uma busca
         real — nenhum vídeo é inventado aqui.</p>
         <div style="display:flex;gap:6px;margin:8px 0">
           <input type="search" id="learn-video-q" placeholder="assunto…">
           <button class="btn sm" id="learn-video-go">Buscar</button>
         </div>
         <ul>${LINKS.map((l) => `<li><a href="${l.url}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a></li>`).join('')}</ul>
       </div>`;

    this.el.querySelectorAll('[data-topic]').forEach((b) => {
      b.onclick = () => this.render(b.dataset.topic);
    });
    const input = this.el.querySelector('#learn-video-q');
    const go = () => {
      const q = (input.value || '').trim();
      if (!q) return;
      const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q + ' game development tutorial');
      window.open(url, '_blank', 'noopener');
      this.app.logger.log(`🔎 Busca aberta para "${q}" (requer internet).`);
    };
    this.el.querySelector('#learn-video-go').onclick = go;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }

  /** Usado pela busca global: retorna tópicos que casam com a consulta. */
  static search(query) {
    const q = query.toLowerCase();
    return TOPICS.filter((t) => t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q))
      .map((t) => ({ label: t.title, sub: 'Learn', topicId: t.id }));
  }
}
