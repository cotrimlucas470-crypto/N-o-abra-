/**
 * Layout dos controles de toque como DADOS.
 *
 * Cada controle tem uma âncora (canto da tela) e um deslocamento em px
 * de CSS a partir dela. A área segura (notch/barra de gestos) é somada
 * automaticamente. Isto permite, numa etapa futura, uma tela de
 * "reposicionar botões" que só edita estes números e salva.
 */
import { readJson, writeJson } from '../../core/Storage';

export type Anchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ControlPlacement {
  anchor: Anchor;
  /** Distância horizontal a partir da borda da âncora (px CSS, sempre para dentro da tela). */
  x: number;
  /** Distância vertical a partir da borda da âncora (px CSS, sempre para dentro da tela). */
  y: number;
  /** Raio (joysticks/botões), px CSS antes da escala de UI. */
  size: number;
}

/** Controles existentes hoje. Ataque, recarregar etc. entram aqui nas próximas etapas. */
export type ControlId = 'moveStick' | 'aimStick' | 'sprint' | 'interact' | 'options' | 'attack' | 'reload' | 'inventory' | 'pause' | 'fullscreen';

export interface ControlsLayoutData {
  version: 1;
  controls: Record<ControlId, ControlPlacement>;
  /** Ajustes quando a tela está em pé (estreita): o que não couber ao lado vai para cima. */
  portrait: Partial<Record<ControlId, ControlPlacement>>;
}

export const DEFAULT_LAYOUT: ControlsLayoutData = {
  version: 1,
  controls: {
    moveStick: { anchor: 'bottom-left', x: 130, y: 120, size: 64 },
    aimStick: { anchor: 'bottom-right', x: 130, y: 120, size: 64 },
    sprint: { anchor: 'bottom-right', x: 262, y: 70, size: 32 },
    interact: { anchor: 'bottom-right', x: 250, y: 168, size: 34 },
    options: { anchor: 'bottom-right', x: 204, y: 224, size: 19 },
    attack: { anchor: 'bottom-right', x: 130, y: 236, size: 26 },
    reload: { anchor: 'bottom-right', x: 184, y: 290, size: 17 },
    inventory: { anchor: 'bottom-right', x: 46, y: 246, size: 25 },
    pause: { anchor: 'top-right', x: 34, y: 34, size: 22 },
    fullscreen: { anchor: 'top-right', x: 88, y: 34, size: 22 },
  },
  portrait: {
    sprint: { anchor: 'bottom-right', x: 70, y: 250, size: 32 },
    interact: { anchor: 'bottom-right', x: 152, y: 250, size: 34 },
    options: { anchor: 'bottom-right', x: 152, y: 322, size: 21 },
    attack: { anchor: 'bottom-right', x: 232, y: 250, size: 28 },
    reload: { anchor: 'bottom-right', x: 232, y: 322, size: 20 },
    inventory: { anchor: 'bottom-right', x: 70, y: 332, size: 25 },
  },
};

/** Posição efetiva de um controle, considerando a orientação da tela. */
export function placementFor(layout: ControlsLayoutData, id: ControlId, portrait: boolean): ControlPlacement {
  return (portrait ? layout.portrait[id] : undefined) ?? layout.controls[id];
}

export interface Insets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ResolvedControl {
  x: number;
  y: number;
  radius: number;
}

/**
 * Escala de UI conforme o tamanho da tela: celular pequeno encolhe um pouco,
 * tablet cresce um pouco. Sempre em px CSS.
 */
export function uiScaleFor(cssWidth: number, cssHeight: number): number {
  const short = Math.min(cssWidth, cssHeight);
  return Math.max(0.78, Math.min(1.35, short / 400));
}

export function resolvePlacement(
  p: ControlPlacement,
  cssWidth: number,
  cssHeight: number,
  insets: Insets,
  scale: number,
): ResolvedControl {
  const ox = p.x * scale;
  const oy = p.y * scale;
  const left = p.anchor.endsWith('left');
  const top = p.anchor.startsWith('top');
  const x = left ? insets.left + ox : cssWidth - insets.right - ox;
  const y = top ? insets.top + oy : cssHeight - insets.bottom - oy;
  return { x, y, radius: p.size * scale };
}

const STORAGE_KEY = 'controls.layout';

/** Carrega o layout salvo; qualquer controle ausente/inválido volta ao padrão. */
export function loadLayout(): ControlsLayoutData {
  const saved = readJson<Partial<ControlsLayoutData> | null>(STORAGE_KEY, null);
  const merged: ControlsLayoutData = structuredClone(DEFAULT_LAYOUT);
  if (!saved || saved.version !== 1 || !saved.controls) return merged;
  for (const id of Object.keys(merged.controls) as ControlId[]) {
    const c = saved.controls[id];
    if (c && isValidPlacement(c)) merged.controls[id] = { ...c };
    const p = saved.portrait?.[id];
    if (p && isValidPlacement(p)) merged.portrait[id] = { ...p };
  }
  return merged;
}

export function saveLayout(layout: ControlsLayoutData): boolean {
  return writeJson(STORAGE_KEY, layout);
}

function isValidPlacement(c: ControlPlacement): boolean {
  const anchors: Anchor[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  return (
    anchors.includes(c.anchor) &&
    [c.x, c.y, c.size].every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    c.size > 4 &&
    c.size < 200
  );
}
