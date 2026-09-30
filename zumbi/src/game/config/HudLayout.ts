/** Posições e tamanhos de todos os elementos do HUD (editável em tempo real). */

export const HUD_LAYOUT = {
  // Drive HUD (painel do carro)
  drive: {
    width: 300,
    height: 74,
    // Posições relativas ao painel (scale s aplicado depois)
    speedometer: { cx: 44, cy: 40, radius: 30, arcStart: Math.PI * 0.8, arcRange: Math.PI * 1.4 },
    bars: {
      startX: 150,
      labelX: 88,
      rows: [
        { y: 14, label: 'GASOLINA' },
        { y: 31, label: 'MOTOR' },
        { y: 48, label: 'LATARIA' },
      ],
      height: 6,
      spacing: 17,
    },
    warnings: { y: 62 },
    help: { y: 65 },
    buttons: { exitY: 70, hornY: 70 },
    cornerRadius: 12,
  },

  // Status Panel (painel de status: vida, fome, etc)
  statusPanel: {
    width: 140,
    height: 88,
    cornerRadius: 8,
    rows: [
      { label: 'VIDA', y: 10 },
      { label: 'FOME', y: 26 },
      { label: 'SED', y: 42 },
      { label: 'CANSAÇO', y: 58 },
      { label: 'TEMP', y: 74 },
    ],
    barWidth: 100,
    barHeight: 4,
    labelX: 6,
    barStartX: 35,
  },

  // Inventory Panel (painel de inventário)
  inventoryPanel: {
    width: 200,
    height: 300,
    cornerRadius: 8,
    padding: 10,
    cellSize: 40,
    cellSpacing: 4,
  },

  // Minimap
  minimap: {
    width: 120,
    height: 120,
    cornerRadius: 6,
    toggleButtonSize: 20,
    toggleButtonX: 4,
    toggleButtonY: 4,
  },

  // Full Map
  fullMap: {
    width: 280,
    height: 400,
    cornerRadius: 8,
    padding: 8,
  },

  // Action Bar (barra de ações)
  actionBar: {
    buttonSize: 50,
    buttonSpacing: 12,
    cornerRadius: 6,
  },

  // Threat UI (indicador de ameaça)
  threatUi: {
    width: 120,
    height: 40,
    cornerRadius: 6,
    barHeight: 8,
  },

  // Sleep Picker (seletor de sono)
  sleepPicker: {
    width: 160,
    height: 180,
    cornerRadius: 8,
    padding: 12,
  },

  // Text Prompt (caixa de texto)
  textPrompt: {
    width: 280,
    minHeight: 120,
    cornerRadius: 8,
    padding: 16,
  },

  // Toast (notificação)
  toast: {
    width: 200,
    height: 50,
    cornerRadius: 6,
    padding: 12,
  },

  // Build Bar (barra de construção)
  buildBar: {
    width: 240,
    height: 60,
    cornerRadius: 8,
    padding: 8,
  },

  // Info Card (card de informação)
  infoCard: {
    width: 180,
    minHeight: 80,
    cornerRadius: 8,
    padding: 12,
  },

  // Character Screen (tela de personagem)
  characterScreen: {
    panelWidth: 300,
    panelHeight: 400,
    cornerRadius: 8,
    padding: 16,
    tabHeight: 40,
  },

  // Summary Card (card de resumo)
  summaryCard: {
    width: 320,
    minHeight: 200,
    cornerRadius: 8,
    padding: 16,
  },

  // State Pills (pílulas de estado)
  statePills: {
    height: 28,
    spacing: 8,
    cornerRadius: 4,
    padding: 6,
  },

  // Options Menu (menu de opções)
  optionsMenu: {
    width: 200,
    itemHeight: 40,
    cornerRadius: 6,
    padding: 8,
  },

  // Action Feedback (feedback de ação)
  actionFeedback: {
    fontSize: 14,
    offsetY: 20,
    duration: 1200,
  },

  // UI Button (botão genérico)
  button: {
    minWidth: 80,
    height: 36,
    cornerRadius: 6,
    padding: 8,
    fontSize: 12,
  },
} as const;
