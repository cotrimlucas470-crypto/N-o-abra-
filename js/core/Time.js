/** Relógio da engine. Exposto aos scripts como `Time`. */
export class TimeService {
  constructor() {
    this.deltaTime = 0;            // segundos, já com timeScale
    this.unscaledDeltaTime = 0;
    this.fixedDeltaTime = 1 / 60;  // passo fixo da física
    this.time = 0;                 // tempo desde o Play
    this.unscaledTime = 0;
    this.timeScale = 1;
    this.frameCount = 0;
    this.maxDeltaTime = 0.1;       // evita "túnel" após o app ficar em background
  }

  reset() {
    this.deltaTime = this.unscaledDeltaTime = 0;
    this.time = this.unscaledTime = 0;
    this.frameCount = 0;
    this.timeScale = 1;
  }

  advance(rawDt) {
    const dt = Math.min(rawDt, this.maxDeltaTime);
    this.unscaledDeltaTime = dt;
    this.deltaTime = dt * this.timeScale;
    this.unscaledTime += dt;
    this.time += this.deltaTime;
    this.frameCount++;
  }
}
