import { Scene } from '../../core/Scene.js';

/**
 * Projeto de demonstração "Mini Adventure" (regra 21).
 * Cobre: player com física, chão, inimigo, moedas (trigger), câmera que segue,
 * iluminação, scripts, UI e logs no console.
 */

const PLAYER_SCRIPT = `// PlayerController.js — movimento, pulo e coleta
let speed = props.speed || 6;
let jumpForce = props.jumpForce || 8;
let coins = 0;
let rb, label;

function start() {
  rb = GetComponent('Rigidbody');
  label = Find('Score UI');
  Debug.Log('Mini Adventure iniciado. Mova com A/D ou joystick, pule com espaço/⤒.');
}

function update() {
  const h = Input.getAxis('Horizontal');
  if (h !== 0) rb.wake();
  rb.velocity.x = h * speed;

  if (Input.jumpDown && rb.grounded) {
    rb.addImpulse(0, jumpForce * rb.mass);
    rb.grounded = false;
  }

  // caiu do mundo: volta ao início
  if (transform.position.y < -8) respawn();
}

function onTriggerEnter(other) {
  if (other.tag === 'Coin') {
    coins++;
    Destroy(other);
    Debug.Log('Moeda coletada: ' + coins);
    if (label) label.getComponent('UIElement').text = 'Moedas: ' + coins;
  }
}

function onCollisionEnter(other) {
  if (other.tag === 'Enemy') {
    Debug.LogWarning('Você encostou no inimigo!');
    respawn();
  }
}

function respawn() {
  transform.position.x = -6;
  transform.position.y = 2;
  rb.setVelocity(0, 0);
}
`;

const CAMERA_SCRIPT = `// CameraFollow.js — segue o alvo suavemente
let target = null;
const smooth = props.smooth || 6;

function start() {
  target = Find(props.target || 'Player');
  if (!target) Debug.LogWarning('CameraFollow: alvo não encontrado.');
}

function lateUpdate() {
  if (!target) return;
  const t = target.transform.position;
  const p = transform.position;
  p.x = Mathf.lerp(p.x, t.x, Time.deltaTime * smooth);
  p.y = Mathf.lerp(p.y, t.y + 1, Time.deltaTime * smooth * 0.6);
}
`;

const ENEMY_SCRIPT = `// EnemyPatrol.js — vai e volta entre dois limites
const speed = props.speed || 2;
const range = props.range || 3;
let origin = 0;
let dir = 1;

function start() {
  origin = transform.position.x;
}

function update() {
  transform.position.x += dir * speed * Time.deltaTime;
  if (transform.position.x > origin + range) dir = -1;
  if (transform.position.x < origin - range) dir = 1;
}
`;

const COIN_SCRIPT = `// CoinSpin.js — gira e flutua
const spin = props.spin || 140;
let t = 0;
let baseY = 0;

function start() { baseY = transform.position.y; }

function update() {
  t += Time.deltaTime;
  transform.rotation.z += spin * Time.deltaTime;
  transform.position.y = baseY + Mathf.sin(t * 2) * 0.15;
}
`;

export async function buildMiniAdventure(assets) {
  const script = (name, content) =>
    assets.add({ name, type: 'script', path: 'Assets/Scripts', content });

  const playerScript = script('PlayerController.js', PLAYER_SCRIPT);
  const cameraScript = script('CameraFollow.js', CAMERA_SCRIPT);
  const enemyScript = script('EnemyPatrol.js', ENEMY_SCRIPT);
  const coinScript = script('CoinSpin.js', COIN_SCRIPT);

  const groundMat = assets.add({
    name: 'Ground.fgmat', type: 'material', path: 'Assets/Materials',
    data: { color: '#3a4353', opacity: 1, roughness: 0.8, emission: 0, texture: null },
  });
  const playerMat = assets.add({
    name: 'Player.fgmat', type: 'material', path: 'Assets/Materials',
    data: { color: '#ff8f4d', opacity: 1, roughness: 0.4, emission: 0.15, texture: null },
  });

  const scene = new Scene('Mini Adventure');
  scene.settings.backgroundColor = '#0f1219';
  scene.settings.gravity = { x: 0, y: -18 };
  scene.settings.ambientIntensity = 0.7;

  /* --- câmera --- */
  const cam = scene.create('Main Camera');
  cam.transform.position.y = 1.5;
  const camera = cam.addComponent('Camera');
  camera.orthographicSize = 6;
  camera.backgroundColor = '#0f1219';
  const camScript = cam.addComponent('Script');
  camScript.script = cameraScript.id;
  camScript.props = { target: 'Player', smooth: 6 };

  /* --- luz --- */
  const light = scene.create('Point Light');
  light.transform.position.x = 0;
  light.transform.position.y = 4;
  const l = light.addComponent('Light');
  l.lightType = 'point';
  l.color = '#ffd9a0';
  l.intensity = 1.1;
  l.range = 14;

  /* --- chão --- */
  const ground = scene.create('Ground');
  ground.tag = 'Ground';
  ground.transform.position.y = -3;
  const gm = ground.addComponent('MeshRenderer');
  gm.mesh = 'plane';
  gm.material = groundMat.id;
  gm.size = { x: 30, y: 1, z: 1 };
  const gc = ground.addComponent('Collider');
  gc.matchRenderer = true;
  gc.friction = 0.4;

  const platform = scene.create('Platform');
  platform.transform.position.x = 5;
  platform.transform.position.y = -0.5;
  const pm = platform.addComponent('MeshRenderer');
  pm.mesh = 'cube';
  pm.material = groundMat.id;
  pm.size = { x: 4, y: 0.6, z: 0.6 };
  platform.addComponent('Collider').matchRenderer = true;

  /* --- player --- */
  const player = scene.create('Player');
  player.tag = 'Player';
  player.transform.position.x = -6;
  player.transform.position.y = 2;
  const psr = player.addComponent('SpriteRenderer');
  psr.shape = 'capsule';
  psr.color = '#ff8f4d';
  psr.size = { x: 0.9, y: 1.4 };
  psr.sortingOrder = 5;
  const prb = player.addComponent('Rigidbody');
  prb.mass = 1.2;
  prb.drag = 0.2;
  prb.allowSleep = false;
  const pc = player.addComponent('Collider');
  pc.matchRenderer = true;
  pc.friction = 0.1;
  const ps = player.addComponent('Script');
  ps.script = playerScript.id;
  ps.props = { speed: 6, jumpForce: 8 };

  /* olho do player: mostra hierarquia pai/filho */
  const eye = scene.create('Eye', player);
  eye.transform.position.x = 0.2;
  eye.transform.position.y = 0.35;
  const esr = eye.addComponent('SpriteRenderer');
  esr.shape = 'circle';
  esr.color = '#1a1d24';
  esr.size = { x: 0.22, y: 0.22 };
  esr.sortingOrder = 6;

  /* --- inimigo --- */
  const enemy = scene.create('Enemy');
  enemy.tag = 'Enemy';
  enemy.transform.position.x = 2;
  enemy.transform.position.y = -2.1;
  const esr2 = enemy.addComponent('SpriteRenderer');
  esr2.shape = 'triangle';
  esr2.color = '#ff5f56';
  esr2.size = { x: 1, y: 1 };
  esr2.sortingOrder = 4;
  enemy.addComponent('Collider').matchRenderer = true;
  const es = enemy.addComponent('Script');
  es.script = enemyScript.id;
  es.props = { speed: 2.2, range: 3 };

  /* --- moedas (triggers) --- */
  const coinPositions = [[-3, -1.6], [0.5, -1.6], [5, 0.6]];
  coinPositions.forEach(([x, y], i) => {
    const coin = scene.create(`Coin ${i + 1}`);
    coin.tag = 'Coin';
    coin.transform.position.x = x;
    coin.transform.position.y = y;
    const sr = coin.addComponent('SpriteRenderer');
    sr.shape = 'circle';
    sr.color = '#ffc44d';
    sr.size = { x: 0.5, y: 0.5 };
    sr.sortingOrder = 3;
    const col = coin.addComponent('Collider');
    col.matchRenderer = true;
    col.isTrigger = true;
    const cs = coin.addComponent('Script');
    cs.script = coinScript.id;
    cs.props = { spin: 140 };
  });

  /* --- UI --- */
  const scoreUI = scene.create('Score UI');
  const su = scoreUI.addComponent('UIElement');
  su.kind = 'text';
  su.text = 'Moedas: 0';
  su.anchor = 'top-left';
  su.x = 16; su.y = 14;
  su.width = 220; su.height = 30;
  su.fontSize = 20;
  su.color = '#ffd9a0';

  const hintUI = scene.create('Hint UI');
  const hu = hintUI.addComponent('UIElement');
  hu.kind = 'text';
  hu.text = 'A/D ou joystick • espaço para pular';
  hu.anchor = 'bottom-center';
  hu.x = 0; hu.y = 96;
  hu.width = 320; hu.height = 24;
  hu.fontSize = 13;
  hu.align = 'center';
  hu.color = '#8f98a8';

  /* prefab de exemplo */
  assets.add({
    name: 'Coin.fgprefab', type: 'prefab', path: 'Assets/Prefabs',
    data: scene.find('Coin 1').serialize(),
  });

  /* material do player fica referenciado para o usuário explorar */
  assets.update(playerMat.id, {});

  return scene;
}
