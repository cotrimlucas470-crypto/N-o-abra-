import { TimeService } from './Time.js';
import { InputService } from './Input.js';
import { Physics } from './Physics.js';
import { Scene } from './Scene.js';
import { GameObject } from './GameObject.js';
import { bus } from './EventBus.js';

/**
 * Engine — dono do único requestAnimationFrame do app.
 *
 * O loop separa UPDATE / PHYSICS / LATE / RENDER. A física roda em passo fixo
 * (acumulador) para não depender do FPS de renderização; o render é emitido como
 * evento para que Scene View e Game View decidam se precisam redesenhar.
 */
export class Engine {
  constructor({ scriptEngine, audio, logger }) {
    this.time = new TimeService();
    this.input = new InputService();
    this.physics = new Physics(null);
    this.scriptEngine = scriptEngine;
    this.audio = audio;
    this.logger = logger;

    this.editScene = null;      // cena do editor (fonte da verdade)
    this.runtimeScene = null;   // cópia executada no Play
    this.state = 'stopped';     // 'stopped' | 'playing' | 'paused'

    this.targetFps = 60;
    this.maxFixedStepsPerFrame = 5;
    this._accumulator = 0;
    this._lastTs = 0;
    this._lastFrameTs = 0;
    this._rafId = 0;
    this._destroyQueue = [];
    this._scripts = [];
    this._updatables = [];
    this.frameStats = { frameMs: 0, scriptMs: 0, physicsMs: 0, renderMs: 0, updateMs: 0 };

    this.physics.onCollision = (a, b, phase) => this._dispatchContact(a, b, phase, 'onCollision');
    this.physics.onTrigger = (a, b, phase) => this._dispatchContact(a, b, phase, 'onTrigger');
  }

  get scene() { return this.state === 'stopped' ? this.editScene : this.runtimeScene; }
  get isPlaying() { return this.state === 'playing'; }

  setEditScene(scene) {
    this.editScene = scene;
    if (this.state === 'stopped') this.physics.setScene(scene);
    if (scene) scene.audio = this.audio;
  }

  /* ------------------------------ loop ------------------------------ */

  start() {
    if (this._rafId) return;
    this._lastTs = performance.now();
    const tick = (ts) => {
      this._rafId = requestAnimationFrame(tick);
      this._frame(ts);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  stopLoop() { cancelAnimationFrame(this._rafId); this._rafId = 0; }

  _frame(ts) {
    /* limitador de FPS: pula o trabalho, mantém o RAF vivo */
    const interval = 1000 / this.targetFps;
    if (ts - this._lastFrameTs < interval - 1.2) return;
    const frameStart = performance.now();
    const rawDt = Math.min((ts - this._lastTs) / 1000, 0.25);
    this._lastTs = ts;
    this._lastFrameTs = ts;

    const fs = this.frameStats;
    fs.scriptMs = 0; fs.physicsMs = 0; fs.updateMs = 0;

    if (this.state === 'playing') {
      this.time.advance(rawDt);
      const dt = this.time.deltaTime;

      const t0 = performance.now();
      this._callHook('update', dt);
      this._runUpdatables(dt);
      fs.updateMs = performance.now() - t0;

      /* física em passo fixo */
      const t1 = performance.now();
      this._accumulator += dt;
      const fixed = this.time.fixedDeltaTime;
      let steps = 0;
      while (this._accumulator >= fixed && steps < this.maxFixedStepsPerFrame) {
        this._callHook('fixedUpdate', fixed);
        this.physics.step(fixed);
        this._accumulator -= fixed;
        steps++;
      }
      if (steps === this.maxFixedStepsPerFrame) this._accumulator = 0;  // evita espiral da morte
      fs.physicsMs = performance.now() - t1;

      this._callHook('lateUpdate', dt);
      this._flushDestroyQueue(dt);
      this.input.endFrame();
      fs.scriptMs = this.scriptEngine ? this._scriptMsThisFrame() : 0;
    } else {
      this.input.endFrame();
    }

    bus.emit('engine:frame', { dt: rawDt, state: this.state });
    fs.frameMs = performance.now() - frameStart;
    bus.emit('engine:frameEnd', fs);
  }

  _scriptMsThisFrame() {
    const total = this.scriptEngine.stats.execMs;
    const delta = total - (this._lastScriptMs || 0);
    this._lastScriptMs = total;
    return delta;
  }

  /* ------------------------------ play mode ------------------------------ */

  play() {
    if (this.state === 'paused') { this.state = 'playing'; bus.emit('engine:state', this.state); return; }
    if (this.state === 'playing') return;
    if (!this.editScene) return;

    /* snapshot: STOP volta exatamente ao estado anterior */
    this._snapshot = this.editScene.serialize();
    this.runtimeScene = Scene.deserialize(this._snapshot, true);
    this.runtimeScene.audio = this.audio;
    this.runtimeScene.running = true;
    this.physics.setScene(this.runtimeScene);
    this.time.reset();
    this._accumulator = 0;
    this._destroyQueue.length = 0;
    this.input.clearHeld();

    this._collectScripts();
    for (const comp of this._scripts) {
      this.scriptEngine.instantiate(comp, this._services());
    }
    /* awake -> start */
    for (const go of this.runtimeScene.byId.values()) {
      for (const c of go.components) { try { c.awake(); } catch (e) { this.logger.error(String(e)); } }
    }
    this._callHook('start');
    for (const go of this.runtimeScene.byId.values()) {
      for (const c of go.components) {
        if (c.type === 'Script') continue;
        try { c.start(); } catch (e) { this.logger.error(String(e)); }
      }
    }

    this.state = 'playing';
    this.logger.log(`▶ Play — cena "${this.runtimeScene.name}" (${this.runtimeScene.objectCount} objetos, ${this._scripts.length} scripts).`);
    bus.emit('engine:state', this.state);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    bus.emit('engine:state', this.state);
  }

  stop() {
    if (this.state === 'stopped') return;
    this.audio && this.audio.stopAll();
    if (this.runtimeScene) this.runtimeScene.dispose();
    this.runtimeScene = null;
    this.state = 'stopped';
    this.physics.setScene(this.editScene);
    this.time.reset();
    this.input.clearHeld();
    this._scripts.length = 0;
    this.logger.log('■ Stop — estado do editor restaurado.');
    bus.emit('engine:state', this.state);
  }

  _collectScripts() {
    this._scripts.length = 0;
    for (const c of this.runtimeScene.components('Script')) {
      if (c.enabled && c.script) this._scripts.push(c);
    }
  }

  _callHook(hook, dt) {
    /* scripts do usuário */
    for (let i = 0; i < this._scripts.length; i++) {
      const comp = this._scripts[i];
      if (!comp.enabled || comp.failed || !comp.instance) continue;
      const go = comp.gameObject;
      if (!go || go._destroyed || !go.activeInHierarchy) continue;
      this.scriptEngine.invoke(comp, hook, dt);
    }
  }

  _runUpdatables(dt) {
    /* componentes nativos que precisam de update (ex.: AudioSource agendado) */
    for (const type of ['AudioSource']) {
      for (const c of this.runtimeScene.components(type)) {
        if (c.enabled && c.gameObject.activeInHierarchy) { try { c.update(dt); } catch (e) { this.logger.error(String(e)); } }
      }
    }
  }

  _dispatchContact(a, b, phase, kind) {
    const hook = kind === 'onTrigger'
      ? (phase === 'enter' ? 'onTriggerEnter' : 'onTriggerExit')
      : (phase === 'enter' ? 'onCollisionEnter' : 'onCollisionExit');
    this._invokeOn(a.gameObject, hook, b.gameObject);
    this._invokeOn(b.gameObject, hook, a.gameObject);
  }

  _invokeOn(go, hook, other) {
    if (!go || go._destroyed) return;
    for (const c of go.components) {
      if (c.type !== 'Script' || !c.instance || c.failed) continue;
      this.scriptEngine.invoke(c, hook, other);
    }
  }

  /* ------------------------------ API de runtime ------------------------------ */

  _services() {
    return {
      time: this.time,
      input: this.input,
      screen: { get width() { return window.innerWidth; }, get height() { return window.innerHeight; } },
      physics: {
        get gravity() { return this.__engine.physics.gravity; },
        __engine: this,
        setGravity: (x, y) => { this.physics.gravity.x = x; this.physics.gravity.y = y; },
        overlapPoint: (x, y) => this.physics.overlapPoint(x, y),
      },
      scene: () => this.scene,
      instantiate: (src, x, y) => this.instantiate(src, x, y),
      destroy: (target, delay) => this.destroy(target, delay),
    };
  }

  /** Instancia um clone de um GameObject (ou um novo objeto vazio por nome). */
  instantiate(src, x, y) {
    const scene = this.scene;
    if (!scene) return null;
    let go;
    if (typeof src === 'string') {
      const found = scene.find(src);
      go = found ? found.clone() : new GameObject(src);
    } else if (src && src.serialize) {
      go = src.clone();
    } else {
      go = new GameObject('GameObject');
    }
    scene.add(go);
    if (typeof x === 'number') go.transform.position.x = x;
    if (typeof y === 'number') go.transform.position.y = y;

    if (this.state === 'playing') {
      for (const c of go.components) {
        if (c.type === 'Script' && c.script) {
          this.scriptEngine.instantiate(c, this._services());
          this._scripts.push(c);
          this.scriptEngine.invoke(c, 'start');
        }
      }
    }
    return go;
  }

  destroy(target, delay = 0) {
    if (!target) return;
    if (delay > 0) { this._destroyQueue.push({ target, t: delay }); return; }
    this._removeScriptsOf(target);
    target.destroy();
  }

  _removeScriptsOf(go) {
    const drop = new Set();
    const walk = (g) => { for (const c of g.components) if (c.type === 'Script') drop.add(c); g.children.forEach(walk); };
    walk(go);
    if (drop.size) this._scripts = this._scripts.filter((c) => !drop.has(c));
  }

  _flushDestroyQueue(dt) {
    for (let i = this._destroyQueue.length - 1; i >= 0; i--) {
      const item = this._destroyQueue[i];
      item.t -= dt;
      if (item.t <= 0) {
        this._destroyQueue.splice(i, 1);
        if (item.target && !item.target._destroyed) { this._removeScriptsOf(item.target); item.target.destroy(); }
      }
    }
  }
}
