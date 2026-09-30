/** Helper para editar posições/tamanhos do HUD em tempo real (desenvolvimento). */

export interface HudEdit {
  path: string; // e.g., "drive.width", "statusPanel.rows.0.y"
  value: number;
}

const deepSet = (obj: any, path: string, value: number): void => {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current)) current[part] = {};
    current = current[part];
  }
  current[parts[parts.length - 1]!] = value;
};

export function applyHudEdit(layout: any, edit: HudEdit): void {
  deepSet(layout, edit.path, edit.value);
}

export function createHudEditCommand(layout: any): (cmd: string) => void {
  return (cmd: string) => {
    // Parse: "drive.width 280" ou "minimap.height +10" ou "statusPanel.rows.0.y -5"
    const match = cmd.trim().match(/^([\w.]+)\s*([-+]?\d+)$/);
    if (!match) {
      console.log('Uso: "campo valor" (ex: "drive.width 280" ou "minimap.height +10")');
      return;
    }
    const [, path, valStr] = match;
    const val = parseInt(valStr!, 10);

    if (valStr!.startsWith('+') || valStr!.startsWith('-')) {
      // Relativo
      const current = deepGet(layout, path!);
      applyHudEdit(layout, { path: path!, value: current + val });
    } else {
      // Absoluto
      applyHudEdit(layout, { path: path!, value: val });
    }
    console.log(`✓ ${path} = ${deepGet(layout, path!)}`);
  };
}

const deepGet = (obj: any, path: string): number => {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    current = current[part];
  }
  return current as number;
};

// Atalho para importar em DebugScene
export function setupHudDebug(layout: any): void {
  (globalThis as any).hud = createHudEditCommand(layout);
  console.log('🎮 HUD Editor ativo. Use: hud("drive.width 290")');
}
