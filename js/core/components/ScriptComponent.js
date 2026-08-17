import { Component, registerComponent } from '../Component.js';

/**
 * ScriptComponent — liga um asset de script a um GameObject.
 *
 * A compilação/instanciação é feita pelo ScriptRuntime no Play Mode (uma única vez
 * por asset, com cache): o componente guarda apenas a referência e as props.
 */
export class ScriptComponent extends Component {
  static type = 'Script';
  static label = 'Script';
  static icon = '𝄜';
  static unique = false;
  static schema = [
    { key: 'script', label: 'Script', type: 'asset', assetType: 'script' },
    { key: 'props', label: 'Props', type: 'props', hint: 'valores acessíveis via props.nome' },
  ];

  constructor(data = {}) {
    super(data);
    this.script = null;      // asset id
    this.props = {};         // objeto simples serializável

    /* runtime */
    this.instance = null;
    this.failed = false;
    this._startCalled = false;
  }

  onDestroy() {
    if (this.instance && typeof this.instance.onDestroy === 'function') {
      try { this.instance.onDestroy(); } catch (e) { /* reportado pelo runtime */ }
    }
    this.instance = null;
  }
}
registerComponent(ScriptComponent);
