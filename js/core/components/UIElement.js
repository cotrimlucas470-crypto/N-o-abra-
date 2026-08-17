import { Component, registerComponent } from '../Component.js';

/**
 * UIElement — UI em screen-space desenhada no mesmo canvas do jogo.
 *
 * Escolha deliberada: desenhar no canvas (e não em DOM) evita reflow por frame
 * e mantém a UI dentro da Game View em qualquer orientação. O hit-test acontece
 * em GameView/Renderer, então Button/Slider/Toggle/InputField funcionam de verdade.
 */
export class UIElement extends Component {
  static type = 'UIElement';
  static label = 'UI Element';
  static icon = '▤';
  static unique = true;
  static schema = [
    { key: 'kind', label: 'Type', type: 'select', options: ['text', 'button', 'image', 'panel', 'slider', 'toggle', 'input'] },
    { key: 'anchor', label: 'Anchor', type: 'select', options: ['top-left', 'top-center', 'top-right', 'middle-left', 'center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'] },
    { key: 'x', label: 'X (px)', type: 'number', step: 1 },
    { key: 'y', label: 'Y (px)', type: 'number', step: 1 },
    { key: 'width', label: 'Width', type: 'number', min: 1, step: 1 },
    { key: 'height', label: 'Height', type: 'number', min: 1, step: 1 },
    { key: 'text', label: 'Text', type: 'text' },
    { key: 'fontSize', label: 'Font Size', type: 'number', min: 6, step: 1 },
    { key: 'align', label: 'Align', type: 'select', options: ['left', 'center', 'right'] },
    { key: 'color', label: 'Text Color', type: 'color' },
    { key: 'background', label: 'Background', type: 'color' },
    { key: 'image', label: 'Image', type: 'asset', assetType: 'texture' },
    { key: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'radius', label: 'Corner Radius', type: 'number', min: 0, step: 1 },
    { key: 'value', label: 'Value', type: 'number', step: 0.01, hint: 'slider/toggle/input' },
    { key: 'min', label: 'Min', type: 'number', step: 0.1 },
    { key: 'max', label: 'Max', type: 'number', step: 0.1 },
    { key: 'interactable', label: 'Interactable', type: 'bool' },
  ];

  constructor(data = {}) {
    super(data);
    this.kind = 'text';
    this.anchor = 'top-left';
    this.x = 16; this.y = 16;
    this.width = 180; this.height = 40;
    this.text = 'Text';
    this.fontSize = 16;
    this.align = 'left';
    this.color = '#ffffff';
    this.background = '#1c2029';
    this.image = null;
    this.opacity = 1;
    this.radius = 8;
    this.value = 0;
    this.min = 0;
    this.max = 1;
    this.interactable = true;

    /* runtime */
    this.onClick = null;       // atribuído por scripts do usuário
    this.onValueChanged = null;
    this._rect = { x: 0, y: 0, w: 0, h: 0 };
    this._pressed = false;
  }

  /** Retângulo em pixels de tela, calculado a partir da âncora e do tamanho do viewport. */
  computeRect(viewW, viewH) {
    const [vy, vx] = this.anchor.split('-');
    let x = this.x, y = this.y;
    if (vx === 'center') x = (viewW - this.width) / 2 + this.x;
    else if (vx === 'right') x = viewW - this.width - this.x;
    if (vy === 'middle') y = (viewH - this.height) / 2 + this.y;
    else if (vy === 'bottom') y = viewH - this.height - this.y;
    const r = this._rect;
    r.x = x; r.y = y; r.w = this.width; r.h = this.height;
    return r;
  }

  contains(px, py) {
    const r = this._rect;
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  setValue(v) {
    const nv = this.kind === 'toggle' ? (v ? 1 : 0) : Math.max(this.min, Math.min(this.max, v));
    if (nv === this.value) return;
    this.value = nv;
    if (typeof this.onValueChanged === 'function') this.onValueChanged(nv);
  }
}
registerComponent(UIElement);
