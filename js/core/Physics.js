/**
 * Física 2D: gravidade, massa, forças, impulsos, colisão e resposta.
 *
 * Decisões de performance (regra 16 do prompt de otimização):
 *  - passo fixo, independente da taxa de render;
 *  - broad phase por sweep-and-prune no eixo X (O(n log n) no sort, quase linear no sweep);
 *  - sleeping: corpos parados saem da integração e do teste de pares;
 *  - zero alocação por par no caminho quente (vetores de contato reaproveitados).
 *
 * Limitação: colliders são axis-aligned (a rotação afeta o desenho, não a caixa de colisão).
 */
export class Physics {
  constructor(scene) {
    this.scene = scene;
    this.gravity = { x: 0, y: -9.81 };
    this.sleepVelocity = 0.06;
    this.sleepDelay = 0.5;
    this.maxSubStepPairs = 20000;   // trava de segurança contra explosão de pares
    this.onCollision = null;        // (a, b, phase) => void   phase: 'enter' | 'exit'
    this.onTrigger = null;

    this._colliders = [];
    this._active = [];
    this._pairKey = new Set();
    this._contact = { nx: 0, ny: 0, depth: 0 };
    this.stats = { bodies: 0, awake: 0, pairs: 0, checks: 0, ms: 0 };
  }

  setScene(scene) { this.scene = scene; this.syncSettings(); }

  syncSettings() {
    const g = this.scene && this.scene.settings && this.scene.settings.gravity;
    if (g) { this.gravity.x = g.x; this.gravity.y = g.y; }
  }

  /** Um passo de simulação com dt fixo. */
  step(dt) {
    const t0 = performance.now();
    const scene = this.scene;
    if (!scene) return;

    const colliders = scene.activeComponents('Collider', this._colliders);
    const stats = this.stats;
    stats.bodies = 0; stats.awake = 0; stats.pairs = 0; stats.checks = 0;

    /* 1. integração */
    for (let i = 0; i < colliders.length; i++) {
      const col = colliders[i];
      const rb = col.gameObject.getComponent('Rigidbody');
      col._rb = rb && rb.enabled ? rb : null;
      if (col._rb) {
        stats.bodies++;
        this._integrate(col._rb, dt);
        if (!col._rb.sleeping) stats.awake++;
      }
      col.updateBounds();
      col._bounds.col = col;
    }

    /* 2. broad phase: sweep and prune em X */
    const list = this._active;
    list.length = 0;
    for (let i = 0; i < colliders.length; i++) list.push(colliders[i]);
    list.sort(byMinX);

    const seen = this._pairKey;
    seen.clear();

    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      const ab = a._bounds;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const bb = b._bounds;
        if (bb.minX > ab.maxX) break;               // sweep: nada mais pode tocar A
        if (ab.minY > bb.maxY || ab.maxY < bb.minY) continue;
        if (!a._rb && !b._rb) continue;             // estático vs estático: ignora
        if (a._rb && b._rb && a._rb.sleeping && b._rb.sleeping) continue;
        stats.checks++;
        if (stats.checks > this.maxSubStepPairs) break;

        if (this._narrow(a, b)) {
          stats.pairs++;
          const key = a.gameObject.id < b.gameObject.id ? a.gameObject.id + '|' + b.gameObject.id
                                                        : b.gameObject.id + '|' + a.gameObject.id;
          seen.add(key);
          const isTrigger = a.isTrigger || b.isTrigger;
          if (!a._contacts.has(b)) {
            a._contacts.add(b); b._contacts.add(a);
            if (isTrigger) this.onTrigger && this.onTrigger(a, b, 'enter');
            else this.onCollision && this.onCollision(a, b, 'enter');
          }
          if (!isTrigger) this._resolve(a, b);
        }
      }
    }

    /* 3. contatos que terminaram */
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a._contacts.size) continue;
      for (const b of Array.from(a._contacts)) {
        if (b.gameObject._destroyed) { a._contacts.delete(b); continue; }
        const key = a.gameObject.id < b.gameObject.id ? a.gameObject.id + '|' + b.gameObject.id
                                                      : b.gameObject.id + '|' + a.gameObject.id;
        if (!seen.has(key)) {
          a._contacts.delete(b); b._contacts.delete(a);
          if (a.isTrigger || b.isTrigger) this.onTrigger && this.onTrigger(a, b, 'exit');
          else this.onCollision && this.onCollision(a, b, 'exit');
        }
      }
    }

    stats.ms = performance.now() - t0;
  }

  _integrate(rb, dt) {
    if (rb.bodyType !== 'dynamic') { rb.velocity.x = rb.velocity.y = 0; return; }
    if (rb.sleeping) { rb._force.x = rb._force.y = 0; return; }

    const invM = rb.invMass;
    let ax = rb._force.x * invM;
    let ay = rb._force.y * invM;
    if (rb.useGravity) { ax += this.gravity.x * rb.gravityScale; ay += this.gravity.y * rb.gravityScale; }
    rb._force.x = rb._force.y = 0;

    rb.velocity.x += ax * dt;
    rb.velocity.y += ay * dt;

    const damp = 1 / (1 + rb.drag * dt);
    rb.velocity.x *= damp;
    rb.velocity.y *= damp;

    const t = rb.transform;
    t.position.x += rb.velocity.x * dt;
    t.position.y += rb.velocity.y * dt;
    if (!rb.freezeRotation && rb.angularVelocity) t.rotation.z += rb.angularVelocity * dt;

    rb.grounded = false;

    /* sleeping */
    if (rb.allowSleep) {
      const speed2 = rb.velocity.x * rb.velocity.x + rb.velocity.y * rb.velocity.y;
      if (speed2 < this.sleepVelocity * this.sleepVelocity) {
        rb._sleepTimer += dt;
        if (rb._sleepTimer > this.sleepDelay) { rb.sleeping = true; rb.velocity.x = rb.velocity.y = 0; }
      } else {
        rb._sleepTimer = 0;
      }
    }
  }

  /** Narrow phase. Preenche this._contact com normal + profundidade. */
  _narrow(a, b) {
    const ab = a._bounds, bb = b._bounds;
    const aCircle = a.shape === 'circle', bCircle = b.shape === 'circle';
    const c = this._contact;

    if (aCircle && bCircle) {
      const dx = bb.cx - ab.cx, dy = bb.cy - ab.cy;
      const r = ab.hw + bb.hw;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) return false;
      const d = Math.sqrt(d2) || 1e-6;
      c.nx = dx / d; c.ny = dy / d; c.depth = r - d;
      return true;
    }

    if (aCircle !== bCircle) {
      const circ = aCircle ? ab : bb;
      const box = aCircle ? bb : ab;
      const cx = Math.max(box.cx - box.hw, Math.min(circ.cx, box.cx + box.hw));
      const cy = Math.max(box.cy - box.hh, Math.min(circ.cy, box.cy + box.hh));
      let dx = circ.cx - cx, dy = circ.cy - cy;
      let d2 = dx * dx + dy * dy;
      const r = circ.hw;
      if (d2 > r * r) return false;
      let nx, ny, depth;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        nx = dx / d; ny = dy / d; depth = r - d;
      } else {
        // centro dentro da caixa: empurra pelo eixo de menor penetração
        const ox = box.hw - Math.abs(circ.cx - box.cx);
        const oy = box.hh - Math.abs(circ.cy - box.cy);
        if (ox < oy) { nx = Math.sign(circ.cx - box.cx) || 1; ny = 0; depth = ox + r; }
        else { nx = 0; ny = Math.sign(circ.cy - box.cy) || 1; depth = oy + r; }
      }
      // normal aponta de A para B
      if (aCircle) { c.nx = -nx; c.ny = -ny; } else { c.nx = nx; c.ny = ny; }
      c.depth = depth;
      return true;
    }

    /* box vs box (AABB) */
    const ox = (ab.hw + bb.hw) - Math.abs(bb.cx - ab.cx);
    if (ox <= 0) return false;
    const oy = (ab.hh + bb.hh) - Math.abs(bb.cy - ab.cy);
    if (oy <= 0) return false;
    if (ox < oy) { c.nx = Math.sign(bb.cx - ab.cx) || 1; c.ny = 0; c.depth = ox; }
    else { c.nx = 0; c.ny = Math.sign(bb.cy - ab.cy) || 1; c.depth = oy; }
    return true;
  }

  _resolve(a, b) {
    const ra = a._rb && a._rb.isDynamic && !a._rb.sleeping ? a._rb : null;
    const rb = b._rb && b._rb.isDynamic && !b._rb.sleeping ? b._rb : null;
    if (!ra && !rb) {
      // ambos dormindo/estáticos: nada a fazer, mas acorda se houver penetração grande
      if (a._rb && a._rb.sleeping && this._contact.depth > 0.05) a._rb.wake();
      if (b._rb && b._rb.sleeping && this._contact.depth > 0.05) b._rb.wake();
      return;
    }
    const c = this._contact;
    const imA = ra ? ra.invMass : 0;
    const imB = rb ? rb.invMass : 0;
    const imSum = imA + imB || 1;

    /* correção posicional (com slack para não vibrar) */
    const slop = 0.005;
    const corr = Math.max(c.depth - slop, 0) / imSum * 0.8;
    if (ra) { ra.transform.position.x -= c.nx * corr * imA; ra.transform.position.y -= c.ny * corr * imA; }
    if (rb) { rb.transform.position.x += c.nx * corr * imB; rb.transform.position.y += c.ny * corr * imB; }

    /* impulso normal */
    const vax = ra ? ra.velocity.x : 0, vay = ra ? ra.velocity.y : 0;
    const vbx = rb ? rb.velocity.x : 0, vby = rb ? rb.velocity.y : 0;
    const rvx = vbx - vax, rvy = vby - vay;
    const vn = rvx * c.nx + rvy * c.ny;
    if (vn > 0) return;   // já se separando

    const e = Math.min(a.bounciness, b.bounciness);
    const j = -(1 + e) * vn / imSum;
    const jx = j * c.nx, jy = j * c.ny;
    if (ra) { ra.velocity.x -= jx * imA; ra.velocity.y -= jy * imA; }
    if (rb) { rb.velocity.x += jx * imB; rb.velocity.y += jy * imB; }

    /* atrito (Coulomb simplificado) */
    const tx = -c.ny, ty = c.nx;
    const vt = (vbx - vax) * tx + (vby - vay) * ty;
    const mu = (a.friction + b.friction) * 0.5;
    const jt = -vt / imSum * mu;
    if (ra) { ra.velocity.x -= jt * tx * imA; ra.velocity.y -= jt * ty * imA; }
    if (rb) { rb.velocity.x += jt * tx * imB; rb.velocity.y += jt * ty * imB; }

    /* grounded: normal apontando "para cima" a partir do corpo */
    if (ra && c.ny > 0.5) ra.grounded = true;
    if (rb && c.ny < -0.5) rb.grounded = true;

    if (ra) { ra._sleepTimer = 0; }
    if (rb) { rb._sleepTimer = 0; }
  }

  /** Raycast vertical simples usado por scripts (`Physics.groundCheck`). */
  overlapPoint(x, y) {
    const out = [];
    for (const col of this.scene.components('Collider')) {
      const b = col._bounds;
      if (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY) out.push(col);
    }
    return out;
  }
}

function byMinX(a, b) { return a._bounds.minX - b._bounds.minX; }
