import { Scene } from '../core/Scene.js';

/**
 * Stress Test (regra 46): gera N objetos com física, scripts e UI, executa por alguns
 * segundos e devolve números medidos — sem inventar métricas.
 *
 * O teste roda em uma cena temporária; a cena do editor é restaurada ao final.
 */

const SPINNER = `// StressSpin.js
let t = Random.value() * 6;
function update() {
  t += Time.deltaTime;
  transform.rotation.z += 90 * Time.deltaTime;
}
`;

export async function runStressTest(app, { count = 500, physics = true, scripts = true, ui = true, seconds = 6 } = {}) {
  const { engine, project, perf, logger } = app;
  const previousScene = app.scene;
  const wasPlaying = engine.isPlaying;
  if (wasPlaying) engine.stop();

  let scriptAsset = project.assets.all().find((a) => a.name === 'StressSpin.js');
  if (!scriptAsset) {
    scriptAsset = project.assets.add({ name: 'StressSpin.js', type: 'script', path: 'Assets/Scripts', content: SPINNER });
  }

  const scene = new Scene(`Stress Test (${count})`);
  scene.settings.gravity = { x: 0, y: -12 };
  scene.settings.backgroundColor = '#0d1016';

  const cam = scene.create('Main Camera');
  const camera = cam.addComponent('Camera');
  camera.orthographicSize = Math.max(8, Math.sqrt(count) * 0.9);
  cam.transform.position.y = 0;

  const ground = scene.create('Ground');
  const gm = ground.addComponent('MeshRenderer');
  gm.mesh = 'plane';
  gm.size = { x: camera.orthographicSize * 6, y: 1, z: 1 };
  gm.color = '#333b4a';
  ground.transform.position.y = -camera.orthographicSize;
  ground.addComponent('Collider').matchRenderer = true;

  const spread = camera.orthographicSize * 2;
  for (let i = 0; i < count; i++) {
    const go = scene.create(`Obj ${i}`);
    const sr = go.addComponent('SpriteRenderer');
    sr.shape = i % 3 === 0 ? 'circle' : 'rect';
    sr.color = `hsl(${(i * 37) % 360} 70% 60%)`;
    sr.size = { x: 0.35, y: 0.35 };
    go.transform.position.x = (Math.random() - 0.5) * spread;
    go.transform.position.y = (Math.random() - 0.5) * spread * 0.8 + camera.orthographicSize * 0.4;

    if (physics) {
      const rb = go.addComponent('Rigidbody');
      rb.mass = 0.5 + Math.random();
      rb.allowSleep = true;
      const col = go.addComponent('Collider');
      col.shape = sr.shape === 'circle' ? 'circle' : 'box';
      col.matchRenderer = true;
      col.bounciness = 0.25;
    }
    if (scripts && i % 4 === 0) {
      const sc = go.addComponent('Script');
      sc.script = scriptAsset.id;
    }
  }

  if (ui) {
    for (let i = 0; i < 8; i++) {
      const el = scene.create(`UI ${i}`);
      const u = el.addComponent('UIElement');
      u.kind = i % 2 ? 'text' : 'button';
      u.text = i % 2 ? `Stat ${i}` : `Btn ${i}`;
      u.anchor = 'top-left';
      u.x = 12; u.y = 12 + i * 34;
      u.width = 130; u.height = 30;
      u.fontSize = 13;
    }
  }

  logger.log(`⏱ Stress Test: ${count} objetos (física: ${physics ? 'on' : 'off'}, scripts: ${scripts ? 'on' : 'off'}).`);
  const loadStart = performance.now();
  app.setScene(scene, { temporary: true });
  const loadMs = performance.now() - loadStart;

  engine.play();
  const result = await perf.benchmark(seconds);
  const snap = perf.snapshot();
  engine.stop();

  app.setScene(previousScene, { temporary: true });
  if (wasPlaying) engine.play();

  const report = {
    count, physics, scripts, ui,
    sceneLoadMs: loadMs,
    avgFps: result ? result.avgFps : 0,
    low1Fps: result ? result.low1Fps : 0,
    avgFrameMs: result ? result.avgFrameMs : 0,
    worstFrameMs: result ? result.worstFrameMs : 0,
    drawCalls: snap.drawCalls,
    visible: snap.visible,
    bodies: snap.bodies,
    scripts: snap.scripts,
    memoryMB: snap.memoryMB,
    resScale: snap.resScale,
  };
  logger.log(`⏱ Resultado: ${report.avgFps.toFixed(1)} FPS médio, 1% low ${report.low1Fps.toFixed(1)}, frame ${report.avgFrameMs.toFixed(2)} ms, ${report.drawCalls} draw calls.`);
  return report;
}
