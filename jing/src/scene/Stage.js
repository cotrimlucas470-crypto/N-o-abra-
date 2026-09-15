import * as THREE from 'three';
import { gerarEnvMap, criarNevoa, criarFeixes, criarLuzes } from './ambiente.js';
import { Fragmentos } from './Fragmentos.js';
import { Particulas } from './Particulas.js';
import { Presenca } from './Presenca.js';
import { Corredor } from './Corredor.js';
import { EspelhoFinal } from './EspelhoFinal.js';
import { PosProcessamento } from './Pos.js';
import { CameraRig } from '../animations/cameraRig.js';
import { tempo } from '../animations/timeControl.js';
import { makeRandom, clamp, damp } from '../utils/math.js';
import { debounce } from '../utils/dom.js';

/**
 * O SALÃO INTEIRO.
 *
 * Um só loop de render, um só relógio (o CHRONO MIRROR), um só objeto de
 * estado compartilhado entre todos os subsistemas. Nada de DOM animado
 * individualmente onde WebGL resolve melhor.
 */
export class Stage {
  constructor({ canvas, perf }) {
    this.perf = perf;
    this.perfil = perf.perfil;
    this.rodando = false;
    this.pronto = false;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.perfil.tier >= 2,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setClearColor(0x050814, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.info.autoReset = true;

    this.cena = new THREE.Scene();
    this.cena.fog = new THREE.FogExp2(0x050814, 0.0165);

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);
    this.cena.add(this.camera);
    this.rig = new CameraRig(this.camera);

    this.estado = {
      scroll: 0,
      progresso: 0,
      onda: 0,
      dissolve: 0,
      escurecer: 0,
      rastro: 0,
      distorcao: 0,
      aberracao: 0.35,
      glitch: 0,
      foco: 12,
      fade: 0,
      presencaVisivel: true,
      tempoReal: 0,
      reduzirMovimento: perf.reduzirMovimento,
      mouse: new THREE.Vector2(),
    };

    this.mouseAlvo = new THREE.Vector2();
    this.estruturas = new Set();
    this.ganchos = new Set();
    this.escurecerAlvo = 0;
    this.dissolveAlvo = 0;

    this.envMap = gerarEnvMap(this.renderer, this.perfil.envRes);
    this.cena.environment = this.envMap;

    this._montar();

    this.pos = new PosProcessamento(this.renderer, this.cena, this.camera, this.perfil);
    this.redimensionar();

    this._onResize = debounce(() => this.redimensionar(), 140);
    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('orientationchange', this._onResize, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pausar();
      else this.retomar();
    });
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.rodando = false;
      document.documentElement.dataset.contexto = 'perdido';
    });
    canvas.addEventListener('webglcontextrestored', () => {
      document.documentElement.dataset.contexto = 'ok';
      this.retomar();
    });

    this.perf.onMudanca((perfil) => this.trocarPerfil(perfil));
    this._relogio = new THREE.Clock();
    this.pronto = true;
  }

  _montar() {
    const rnd = makeRandom(20250101);
    this.fragmentos = new Fragmentos({ envMap: this.envMap, perfil: this.perfil });
    this.cena.add(this.fragmentos.grupo);

    this.particulas = new Particulas({ perfil: this.perfil });
    this.cena.add(this.particulas.grupo);

    this.corredor = new Corredor({ envMap: this.envMap, perfil: this.perfil });
    this.cena.add(this.corredor.grupo);

    this.presenca = new Presenca({ envMap: this.envMap, perfil: this.perfil });
    this.cena.add(this.presenca.grupo);

    this.nevoa = criarNevoa(rnd, this.perfil.tier >= 2 ? 7 : 3);
    this.cena.add(this.nevoa);

    this.feixes = criarFeixes(rnd, this.perfil.tier >= 2 ? 5 : 2);
    this.cena.add(this.feixes);

    this.luzes = criarLuzes(this.cena);

    this.espelhoFinal = new EspelhoFinal({ envMap: this.envMap, perfil: this.perfil });
    this.camera.add(this.espelhoFinal.grupo);

    // container das estruturas holográficas — vivem no espaço da câmera
    this.ancoras = new THREE.Group();
    this.ancoras.name = 'ancoras';
    this.camera.add(this.ancoras);
  }

  trocarPerfil(perfil) {
    this.perfil = perfil;
    this.fragmentos.construir(perfil);
    this.particulas.construir(perfil);
    this.corredor.construir(perfil);
    this.espelhoFinal.construir(perfil);
    this.pos.definirPerfil(perfil);
    this.redimensionar();
  }

  /** Registra um callback por quadro: (dtReal, dtEscalado, tempoEscalado). */
  aoQuadro(fn) {
    this.ganchos.add(fn);
    return () => this.ganchos.delete(fn);
  }

  /** Escurece o salão quando o foco vai para um objeto específico. */
  escurecer(v) {
    this.escurecerAlvo = clamp(v, 0, 1);
  }

  registrarEstrutura(estrutura) {
    this.estruturas.add(estrutura);
    this.ancoras.add(estrutura.raiz);
    return () => {
      this.estruturas.delete(estrutura);
      this.ancoras.remove(estrutura.raiz);
      estrutura.destruir();
    };
  }

  redimensionar() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, this.perfil.maxPixelRatio);
    this.largura = w;
    this.altura = h;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // telas estreitas ganham um pouco mais de campo para o salão não sufocar
    this.rig.fovBase = w / h < 0.85 ? 62 : w / h < 1.3 ? 54 : 46;
    this.camera.updateProjectionMatrix();
    this.pos?.redimensionar(w, h, pr);
  }

  definirMouse(x, y) {
    this.mouseAlvo.set(x, y);
  }

  iniciar() {
    if (this.rodando) return;
    this.rodando = true;
    this._relogio.getDelta();
    const loop = () => {
      if (!this.rodando) return;
      this._raf = requestAnimationFrame(loop);
      this._quadro();
    };
    this._raf = requestAnimationFrame(loop);
  }

  pausar() {
    this.rodando = false;
    cancelAnimationFrame(this._raf);
  }

  retomar() {
    if (document.hidden) return;
    this._relogio.getDelta();
    this.iniciar();
  }

  _quadro() {
    const dtBruto = this._relogio.getDelta();
    // o dt da simulação é limitado (um quadro longo não pode teleportar a cena);
    // o dt bruto continua disponível para o que precisa de tempo de relógio.
    const dtReal = Math.min(dtBruto, 0.066);
    this.perf.amostrar(dtReal);

    const dt = tempo.passo(dtReal);
    const t = tempo.tempo;
    const e = this.estado;

    e.tempoReal = tempo.tempoReal;
    e.escurecer = damp(e.escurecer, this.escurecerAlvo, 0.004, dtReal);
    e.dissolve = damp(e.dissolve, this.dissolveAlvo, 0.004, dtReal);
    e.onda = tempo.onda;
    e.distorcao = tempo.distorcao;
    e.glitch = tempo.distorcao * 0.9 + tempo.onda * 0.5;
    e.aberracao = 0.3 + tempo.distorcao * 2.6 + tempo.onda * 2.2 + Math.abs(tempo.atual - 1) * 0.8;
    e.rastro = clamp(Math.max(0, tempo.atual - 1) * 0.8 + tempo.onda * 0.6, 0, 1.6);
    e.mouse.set(this.mouseAlvo.x, this.mouseAlvo.y);
    e.foco = this.rig.distanciaFoco;

    this.rig.mouse.copy(this.mouseAlvo);
    this.rig.atualizar(dtReal, e);

    this.fragmentos.mouse = this.mouseAlvo;
    this.particulas.mouse = this.mouseAlvo;
    this.presenca.mouse = this.mouseAlvo;

    this.fragmentos.atualizar(dt, t, e);
    this.particulas.atualizar(dt, t, e, this.camera.position);
    this.corredor.atualizar(dt, t, e);
    this.presenca.atualizar(dt, t, e);
    this.espelhoFinal.atualizar(dt, t, e);
    this.luzes.atualizar(t, this.camera.position.z);

    this.nevoa.userData.uniforms.uTempo.value = t;
    this.feixes.userData.uniforms.uTempo.value = t;
    // o escurecimento vale para a atmosfera também, não só para os sólidos
    this._atmos = damp(this._atmos ?? 1, 1 - e.escurecer * 0.82, 0.004, dtReal);
    this.nevoa.userData.uniforms.uOpacidade.value *= this._atmos;
    this.feixes.userData.uniforms.uForca.value *= this._atmos;
    for (const f of this.feixes.children) {
      f.position.x += dt * f.userData.vel;
      if (f.position.x > 24) f.position.x = -24;
      if (f.position.x < -24) f.position.x = 24;
    }

    for (const est of this.estruturas) {
      est.atualizar(dt, t, this.camera, this.largura, this.altura);
    }

    for (const fn of this.ganchos) fn(dtReal, dt, t, dtBruto);

    this.pos.render(dtReal, e);
  }

  dispose() {
    this.pausar();
    window.removeEventListener('resize', this._onResize);
    this.fragmentos.destruir();
    this.particulas.destruir();
    this.corredor.destruir();
    this.presenca.destruir();
    this.espelhoFinal.destruir();
    this.pos.dispose();
    this.renderer.dispose();
  }
}
