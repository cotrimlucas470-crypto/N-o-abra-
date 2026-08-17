import { injectGuards, GuardState, ScriptTimeoutError } from './LoopGuard.js';
import { Mathf, Vec2 } from '../core/MathUtils.js';

/**
 * ScriptEngine — compila e executa os scripts do usuário.
 *
 * LINGUAGEM: JavaScript moderno, não C#. Rodar C# real dentro do navegador exigiria
 * um runtime .NET (Blazor/WASM), fora do escopo de um app leve para celular; a API
 * imita os nomes e o ciclo de vida de uma engine (start/update/fixedUpdate/...).
 *
 * SANDBOX: cada script é compilado como uma função cujos parâmetros sombreiam os
 * globais perigosos (window, document, fetch, localStorage, eval, Function...), então
 * o código do usuário não alcança o dispositivo por acidente. Isso NÃO é uma fronteira
 * de segurança contra código hostil (mesmo realm JS) — está documentado no README.
 *
 * PERFORMANCE: compilação única por asset (cache por versão). Nada é reinterpretado
 * por frame; o que roda no loop são as funções já compiladas.
 */

const HOOKS = ['start', 'update', 'fixedUpdate', 'lateUpdate', 'onDestroy',
  'onCollisionEnter', 'onCollisionExit', 'onTriggerEnter', 'onTriggerExit', 'onClick'];

const API_PARAMS = [
  'gameObject', 'transform', 'props', 'Time', 'Input', 'Debug', 'Screen', 'Physics',
  'Mathf', 'Vec2', 'Random', 'Color',
  'GetComponent', 'AddComponent', 'Instantiate', 'Destroy', 'Find', 'FindWithTag', 'FindAll',
  '__guard',
];

const SHADOWED_GLOBALS = [
  'window', 'document', 'globalThis', 'self', 'top', 'parent', 'frames', 'opener',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Worker', 'SharedWorker',
  'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'navigator', 'location',
  'history', 'screen', 'alert', 'confirm', 'prompt', 'open', 'postMessage',
  'Function', 'importScripts', 'require', 'process', 'module', 'exports',
  'setTimeout', 'setInterval', 'requestAnimationFrame', 'crypto', 'console',
];
/* `eval` e `arguments` não podem ser nomes de parâmetro em modo estrito, por isso não
   aparecem na lista acima. `eval` direto continua alcançável — está documentado no README
   junto do alcance real do sandbox. */

export class ScriptEngine {
  constructor({ assets, logger }) {
    this.assets = assets;
    this.logger = logger;
    this.guard = new GuardState(250);
    this._cache = new Map();      // assetId -> { version, factory, error }
    this._lineOffset = this._calibrate();
    this.stats = { compiled: 0, errors: 0, execMs: 0 };
  }

  /** Descobre quantas linhas o `new Function` adiciona antes do corpo neste motor JS. */
  _calibrate() {
    try {
      // eslint-disable-next-line no-new-func
      const f = new Function('"use strict";\nthrow new Error("probe");\n//# sourceURL=forge://probe.js');
      f();
    } catch (err) {
      const m = /probe\.js:(\d+)/.exec(err.stack || '');
      if (m) return Number(m[1]) - 2;   // a linha real do throw no corpo é 2
    }
    return 0;
  }

  /** Compila um asset de script. Retorna { factory } ou { error }. */
  compile(asset) {
    if (!asset) return { error: { message: 'Script não encontrado.' } };
    const cached = this._cache.get(asset.id);
    if (cached && cached.version === asset.updatedAt) return cached;

    const name = (asset.name || 'Script').replace(/[^\w.-]/g, '_');
    let result;
    try {
      const guarded = injectGuards(asset.content || '');
      const body =
        '"use strict";' + guarded +
        `\n;return {${HOOKS.map((h) => `${h}:typeof ${h}==="function"?${h}:null`).join(',')}};` +
        `\n//# sourceURL=forge://scripts/${name}`;
      // eslint-disable-next-line no-new-func
      const factory = new Function(...API_PARAMS, ...SHADOWED_GLOBALS, body);
      result = { version: asset.updatedAt, factory, error: null, name };
      this.stats.compiled++;
    } catch (err) {
      result = { version: asset.updatedAt, factory: null, error: this.describeError(err, name), name };
      this.stats.errors++;
    }
    this._cache.set(asset.id, result);
    return result;
  }

  invalidate(assetId) { if (assetId) this._cache.delete(assetId); else this._cache.clear(); }

  /** Converte um erro em { message, file, line, column }. */
  describeError(err, file = '') {
    const stack = err && err.stack ? String(err.stack) : '';
    const re = new RegExp(`scripts/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+):(\\d+)`);
    const m = re.exec(stack) || /forge:\/\/scripts\/([^:]+):(\d+):(\d+)/.exec(stack);
    let line = null, col = null;
    if (m) {
      if (m.length === 3) { line = Number(m[1]) - this._lineOffset; col = Number(m[2]); }
      else { file = m[1]; line = Number(m[2]) - this._lineOffset; col = Number(m[3]); }
    } else if (err && typeof err.lineNumber === 'number') {
      line = err.lineNumber - this._lineOffset;
    }
    return {
      message: (err && err.message) ? err.message : String(err),
      name: (err && err.name) || 'Error',
      file, line: line && line > 0 ? line : null, col,
      fatal: err instanceof ScriptTimeoutError,
    };
  }

  /**
   * Instancia o script em um ScriptComponent. Retorna true em caso de sucesso.
   * `services` traz Time/Input/Screen/Physics/scene/instantiate compartilhados.
   */
  instantiate(comp, services) {
    const asset = this.assets.get(comp.script);
    if (!asset) { comp.failed = true; return false; }
    const compiled = this.compile(asset);
    if (compiled.error) {
      this.logger.error(`${compiled.error.name}: ${compiled.error.message}`, { file: compiled.name, line: compiled.error.line });
      comp.failed = true;
      return false;
    }

    const go = comp.gameObject;
    const api = this._buildAPI(go, comp, services, compiled.name);
    try {
      this.guard.begin(500);
      const inst = compiled.factory(...API_PARAMS.map((k) => api[k]), ...SHADOWED_GLOBALS.map(() => undefined));
      this.guard.end();
      comp.instance = inst;
      comp.failed = false;
      comp._scriptName = compiled.name;
      return true;
    } catch (err) {
      this.guard.end();
      const info = this.describeError(err, compiled.name);
      this.logger.error(`${info.name}: ${info.message}`, { file: compiled.name, line: info.line, assetId: asset.id });
      comp.failed = true;
      return false;
    }
  }

  /** Executa um hook com orçamento de tempo e tratamento de erro. */
  invoke(comp, hook, arg) {
    const inst = comp.instance;
    if (!inst || comp.failed) return;
    const fn = inst[hook];
    if (typeof fn !== 'function') return;
    const t0 = performance.now();
    try {
      this.guard.begin();
      fn(arg);
    } catch (err) {
      const info = this.describeError(err, comp._scriptName || '');
      this.logger.error(`${info.name} em ${hook}(): ${info.message}`, {
        file: comp._scriptName, line: info.line, assetId: comp.script,
      });
      comp.failed = true;   // desliga o script para não inundar o console
      this.logger.warn(`Script "${comp._scriptName}" desativado em ${comp.gameObject?.name} após erro.`);
    } finally {
      this.guard.end();
      this.stats.execMs += performance.now() - t0;
    }
  }

  /**
   * Descobre arquivo/linha da chamada atual de Debug.* para o botão "localizar código".
   * Uma Error por log é barata perto do custo de renderizar a linha no console; ainda
   * assim, o resultado é memoizado por chamada para não formatar a stack duas vezes.
   */
  _here(scriptName, comp) {
    let line = null;
    try {
      const stack = new Error().stack || '';
      const re = new RegExp(`scripts/${scriptName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}:(\\d+):`);
      const m = re.exec(stack);
      if (m) line = Number(m[1]) - this._lineOffset;
    } catch { /* stack indisponível neste motor */ }
    return { file: scriptName, line: line && line > 0 ? line : null, assetId: comp.script };
  }

  _buildAPI(go, comp, services, scriptName) {
    const logger = this.logger;
    const scene = () => comp.scene || services.scene();
    return {
      gameObject: go,
      transform: go.transform,
      props: comp.props,
      Time: services.time,
      Input: services.input,
      Screen: services.screen,
      Physics: services.physics,
      Mathf,
      Vec2,
      Color: { white: '#ffffff', black: '#000000', red: '#ff5f56', green: '#3ddc84', blue: '#4aa8ff', yellow: '#ffc44d' },
      Random: {
        value: () => Math.random(),
        range: (a, b) => a + Math.random() * (b - a),
        int: (a, b) => Math.floor(a + Math.random() * (b - a)),
        sign: () => (Math.random() < 0.5 ? -1 : 1),
      },
      Debug: {
        Log: (...a) => logger.log(fmt(a), this._here(scriptName, comp)),
        log: (...a) => logger.log(fmt(a), this._here(scriptName, comp)),
        LogWarning: (...a) => logger.warn(fmt(a), this._here(scriptName, comp)),
        LogError: (...a) => logger.error(fmt(a), this._here(scriptName, comp)),
      },
      GetComponent: (type) => go.getComponent(type),
      AddComponent: (type) => go.addComponent(type),
      Instantiate: (src, x, y) => services.instantiate(src, x, y),
      Destroy: (target, delay) => services.destroy(target || go, delay),
      Find: (name) => scene().find(name),
      FindWithTag: (tag) => scene().findWithTag(tag),
      FindAll: (type) => Array.from(scene().components(type)),
      __guard: this.guard.guard,
    };
  }
}

function fmt(args) {
  return args.map((a) => {
    if (typeof a === 'string') return a;
    if (a === undefined) return 'undefined';
    if (a === null) return 'null';
    if (typeof a === 'object') {
      try { return JSON.stringify(a, replacer, 0); } catch { return String(a); }
    }
    return String(a);
  }).join(' ');
}

function replacer(key, value) {
  if (key === 'gameObject' || key === 'scene' || key === 'parent' || key === 'components') return undefined;
  return value;
}
