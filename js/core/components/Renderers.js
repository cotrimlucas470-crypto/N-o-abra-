import { Component, registerComponent } from '../Component.js';

/**
 * SpriteRenderer — desenha uma forma primitiva ou uma textura importada.
 * Todas as propriedades abaixo são lidas pelo Renderer (nenhuma é decorativa).
 */
export class SpriteRenderer extends Component {
  static type = 'SpriteRenderer';
  static label = 'Sprite Renderer';
  static icon = '▣';
  static unique = true;
  static schema = [
    { key: 'shape', label: 'Shape', type: 'select', options: ['rect', 'circle', 'triangle', 'capsule'] },
    { key: 'sprite', label: 'Sprite', type: 'asset', assetType: 'texture', hint: 'Textura substitui a forma' },
    { key: 'color', label: 'Color', type: 'color' },
    { key: 'size', label: 'Size', type: 'vec2', step: 0.1 },
    { key: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'flipX', label: 'Flip X', type: 'bool' },
    { key: 'flipY', label: 'Flip Y', type: 'bool' },
    { key: 'sortingOrder', label: 'Sorting Order', type: 'number', step: 1 },
    { key: 'outline', label: 'Outline', type: 'bool' },
  ];

  constructor(data = {}) {
    super(data);
    this.shape = 'rect';
    this.sprite = null;        // id do asset de textura
    this.color = '#ff8f4d';
    this.size = { x: 1, y: 1 };
    this.opacity = 1;
    this.flipX = false;
    this.flipY = false;
    this.sortingOrder = 0;
    this.outline = false;
  }

  getLocalBounds() {
    const s = this.transform.getWorldScale();
    return { w: Math.abs(this.size.x * s.x), h: Math.abs(this.size.y * s.y) };
  }
}
registerComponent(SpriteRenderer);

/**
 * MeshRenderer (simplificado) — projeção pseudo-3D em 2D.
 * Não é um pipeline 3D real: desenha primitivas com faces sombreadas de acordo com
 * as luzes da cena. Limitação documentada no README (regra 46).
 */
export class MeshRenderer extends Component {
  static type = 'MeshRenderer';
  static label = 'Mesh Renderer (simplificado)';
  static icon = '⬛';
  static unique = true;
  static schema = [
    { key: 'mesh', label: 'Mesh', type: 'select', options: ['cube', 'plane', 'sphere', 'pyramid'] },
    { key: 'material', label: 'Material', type: 'asset', assetType: 'material' },
    { key: 'color', label: 'Color', type: 'color', hint: 'usado se não houver material' },
    { key: 'size', label: 'Size', type: 'vec3', step: 0.1 },
    { key: 'receiveLight', label: 'Receive Light', type: 'bool' },
    { key: 'sortingOrder', label: 'Sorting Order', type: 'number', step: 1 },
  ];

  constructor(data = {}) {
    super(data);
    this.mesh = 'cube';
    this.material = null;
    this.color = '#7f8ea3';
    this.size = { x: 1, y: 1, z: 1 };
    this.receiveLight = true;
    this.sortingOrder = 0;
  }

  getLocalBounds() {
    const s = this.transform.getWorldScale();
    return { w: Math.abs(this.size.x * s.x), h: Math.abs(this.size.y * s.y) };
  }
}
registerComponent(MeshRenderer);
