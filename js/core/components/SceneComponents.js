import { Component, registerComponent } from '../Component.js';

/** Camera — define o enquadramento da Game View. */
export class Camera extends Component {
  static type = 'Camera';
  static label = 'Camera';
  static icon = '🎥';
  static unique = true;
  static schema = [
    { key: 'isMain', label: 'Main Camera', type: 'bool' },
    { key: 'orthographicSize', label: 'Ortho Size', type: 'number', min: 0.5, step: 0.5, hint: 'metade da altura visível, em unidades' },
    { key: 'backgroundColor', label: 'Background', type: 'color' },
    { key: 'zoomToFit', label: 'Fit Width', type: 'bool', hint: 'ajusta ao aspecto em portrait' },
  ];

  constructor(data = {}) {
    super(data);
    this.isMain = true;
    this.orthographicSize = 5;
    this.backgroundColor = '#0e1116';
    this.zoomToFit = true;
  }
}
registerComponent(Camera);

/** Light — iluminação simplificada (ambiente, direcional, ponto) usada pelo renderer. */
export class Light extends Component {
  static type = 'Light';
  static label = 'Light';
  static icon = '☀';
  static unique = false;
  static schema = [
    { key: 'lightType', label: 'Type', type: 'select', options: ['point', 'directional', 'ambient'] },
    { key: 'color', label: 'Color', type: 'color' },
    { key: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 3, step: 0.05 },
    { key: 'range', label: 'Range', type: 'number', min: 0, step: 0.5, hint: 'point light, em unidades' },
    { key: 'angle', label: 'Angle', type: 'number', step: 5, hint: 'directional, em graus' },
  ];

  constructor(data = {}) {
    super(data);
    this.lightType = 'point';
    this.color = '#ffd9a0';
    this.intensity = 1;
    this.range = 6;
    this.angle = -60;
  }
}
registerComponent(Light);

/** AudioSource — usa a Web Audio API através do AudioManager. */
export class AudioSource extends Component {
  static type = 'AudioSource';
  static label = 'Audio Source';
  static icon = '♪';
  static unique = true;
  static schema = [
    { key: 'clip', label: 'Clip', type: 'asset', assetType: 'audio' },
    { key: 'volume', label: 'Volume', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'loop', label: 'Loop', type: 'bool' },
    { key: 'playOnAwake', label: 'Play On Awake', type: 'bool' },
    { key: 'pitch', label: 'Pitch', type: 'range', min: 0.25, max: 3, step: 0.05 },
  ];

  constructor(data = {}) {
    super(data);
    this.clip = null;
    this.volume = 0.8;
    this.loop = false;
    this.playOnAwake = false;
    this.pitch = 1;
    this._handle = null;
  }

  start() { if (this.playOnAwake) this.play(); }

  play() {
    if (!this.clip || !this.scene || !this.scene.audio) return;
    this.stop();
    this._handle = this.scene.audio.play(this.clip, { volume: this.volume, loop: this.loop, pitch: this.pitch });
  }

  stop() {
    if (this._handle && this.scene && this.scene.audio) this.scene.audio.stop(this._handle);
    this._handle = null;
  }

  onDestroy() { this.stop(); }
}
registerComponent(AudioSource);
