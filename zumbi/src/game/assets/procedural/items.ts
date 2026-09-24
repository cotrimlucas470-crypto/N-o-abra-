/**
 * Ícones procedurais dos itens (arte provisória). Canvas de ITEM_ICON_SIZE px.
 * O mesmo ícone aparece no chão (pequeno, girado) e no inventário.
 * Luz vem de cima/esquerda, como no resto do jogo. Cada desenho já tem uma
 * sombra curta: o item parece "largado" no chão.
 *
 * Para trocar por PNG: registre `item.<id>` em public/assets/overrides.json.
 */
import { ball, circle, line, roundRect, shade, shadedBox, type Ctx } from './canvas';

export const ITEM_ICON_SIZE = 48;

type ItemDrawer = (ctx: Ctx, s: number) => void;

function withShadow(ctx: Ctx, draw: () => void): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1.5;
  ctx.shadowOffsetY = 2;
  draw();
  ctx.restore();
}

/** Desenha num sistema girado em torno do centro (itens compridos na diagonal). */
function diagonal(ctx: Ctx, s: number, deg: number, draw: () => void): void {
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.translate(-s / 2, -s / 2);
  draw();
  ctx.restore();
}

const bottle: ItemDrawer = (ctx, s) => {
  diagonal(ctx, s, -30, () => {
    withShadow(ctx, () => shadedBox(ctx, s * 0.36, s * 0.26, s * 0.28, s * 0.62, 5, '#8fc3dc', { light: 0.25, outline: '#3d6f86' }));
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(s * 0.4, s * 0.3, s * 0.05, s * 0.5);
    shadedBox(ctx, s * 0.36, s * 0.5, s * 0.28, s * 0.14, 1, '#e8eef0', { outline: null });
    shadedBox(ctx, s * 0.42, s * 0.12, s * 0.16, s * 0.16, 2, '#2f78c4', { outline: '#1c4a78' });
  });
};

function can(body: string, label: string, soda: boolean): ItemDrawer {
  return (ctx, s) => {
    withShadow(ctx, () => shadedBox(ctx, s * 0.28, s * 0.2, s * 0.44, s * 0.62, 6, body, { light: 0.2 }));
    ctx.fillStyle = label;
    ctx.fillRect(s * 0.28, s * (soda ? 0.36 : 0.34), s * 0.44, s * (soda ? 0.12 : 0.3));
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(s * 0.33, s * 0.22, s * 0.05, s * 0.58);
    // tampa (elipse)
    ctx.beginPath();
    ctx.ellipse(s * 0.5, s * 0.21, s * 0.21, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fillStyle = shade('#b8bcc0', 0.1);
    ctx.fill();
    ctx.strokeStyle = '#6b6f73';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (soda) circle(ctx, s * 0.56, s * 0.2, s * 0.035, '#7d8185');
  };
}

const biscuits: ItemDrawer = (ctx, s) => {
  diagonal(ctx, s, 12, () => {
    withShadow(ctx, () => shadedBox(ctx, s * 0.16, s * 0.3, s * 0.68, s * 0.42, 4, '#d9922e', { light: 0.2, outline: '#7a4d12' }));
    ctx.fillStyle = '#f3dfa9';
    roundRect(ctx, s * 0.28, s * 0.38, s * 0.3, s * 0.26, 3);
    ctx.fill();
    for (let i = 0; i < 3; i++) circle(ctx, s * (0.34 + i * 0.09), s * 0.51, s * 0.028, '#b0762a');
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(s * 0.64, s * 0.3, s * 0.08, s * 0.42);
  });
};

const bandage: ItemDrawer = (ctx, s) => {
  withShadow(ctx, () => ball(ctx, s * 0.44, s * 0.46, s * 0.24, '#eeeae0'));
  circle(ctx, s * 0.44, s * 0.46, s * 0.09, '#cfc8b8', '#a39c8c', 1);
  // ponta solta
  ctx.fillStyle = '#e6e1d4';
  ctx.beginPath();
  ctx.moveTo(s * 0.6, s * 0.62);
  ctx.lineTo(s * 0.86, s * 0.74);
  ctx.lineTo(s * 0.82, s * 0.84);
  ctx.lineTo(s * 0.54, s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a39c8c';
  ctx.lineWidth = 1;
  ctx.stroke();
};

const pills: ItemDrawer = (ctx, s) => {
  diagonal(ctx, s, -18, () => {
    withShadow(ctx, () => shadedBox(ctx, s * 0.2, s * 0.28, s * 0.6, s * 0.44, 5, '#c9ced3', { light: 0.3, outline: '#7c8187' }));
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const x = s * (0.3 + c * 0.13);
        const y = s * (0.41 + r * 0.18);
        if (r === 1 && c === 3) circle(ctx, x, y, s * 0.045, '#9aa0a6');
        else ball(ctx, x, y, s * 0.045, '#f4f4f0', false);
      }
    }
  });
};

const flashlight: ItemDrawer = (ctx, s) => {
  diagonal(ctx, s, -40, () => {
    withShadow(ctx, () => shadedBox(ctx, s * 0.4, s * 0.3, s * 0.2, s * 0.58, 4, '#2c2f33', { light: 0.25, outline: '#111' }));
    shadedBox(ctx, s * 0.34, s * 0.1, s * 0.32, s * 0.24, 4, '#e0b43c', { light: 0.2, outline: '#7a5d12' });
    circle(ctx, s * 0.5, s * 0.14, s * 0.1, '#fdf6d8', '#9a8a4a', 1);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(s * 0.46, s * 0.52, s * 0.08, s * 0.06);
  });
};

const batteries: ItemDrawer = (ctx, s) => {
  for (const [dx, rot] of [[-0.12, -12], [0.12, 8]] as const) {
    ctx.save();
    ctx.translate(s * (0.5 + dx), s * 0.5);
    ctx.rotate((rot * Math.PI) / 180);
    withShadow(ctx, () => shadedBox(ctx, -s * 0.09, -s * 0.3, s * 0.18, s * 0.6, 3, '#2a2c30', { light: 0.25, outline: '#0c0d0e' }));
    ctx.fillStyle = '#d98b2b';
    ctx.fillRect(-s * 0.09, -s * 0.3, s * 0.18, s * 0.2);
    ctx.fillStyle = '#b8bcc0';
    ctx.fillRect(-s * 0.04, -s * 0.35, s * 0.08, s * 0.05);
    ctx.restore();
  }
};

const hammer: ItemDrawer = (ctx, s) => {
  diagonal(ctx, s, 35, () => {
    withShadow(ctx, () => shadedBox(ctx, s * 0.45, s * 0.26, s * 0.1, s * 0.64, 3, '#8a5a32', { light: 0.2, outline: '#4a2e16' }));
    withShadow(ctx, () => shadedBox(ctx, s * 0.26, s * 0.12, s * 0.46, s * 0.16, 3, '#7c8288', { light: 0.3, outline: '#34383c' }));
    ctx.fillStyle = '#5a5f64';
    ctx.fillRect(s * 0.66, s * 0.13, s * 0.08, s * 0.14);
  });
};

const screwdriver: ItemDrawer = (ctx, s) => {
  diagonal(ctx, s, -45, () => {
    line(ctx, s * 0.5, s * 0.12, s * 0.5, s * 0.5, '#aeb4ba', s * 0.06, 'butt');
    line(ctx, s * 0.5, s * 0.1, s * 0.5, s * 0.14, '#6d7278', s * 0.08, 'butt');
    withShadow(ctx, () => shadedBox(ctx, s * 0.41, s * 0.5, s * 0.18, s * 0.38, 6, '#e3c02d', { light: 0.25, outline: '#7a6310' }));
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 3; i++) ctx.fillRect(s * (0.44 + i * 0.045), s * 0.56, s * 0.018, s * 0.26);
  });
};

const crowbar: ItemDrawer = (ctx, s) => {
  diagonal(ctx, s, 40, () => {
    withShadow(ctx, () => {
      line(ctx, s * 0.5, s * 0.16, s * 0.5, s * 0.9, '#b8322a', s * 0.085);
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.18);
      ctx.quadraticCurveTo(s * 0.5, s * 0.04, s * 0.36, s * 0.06);
      ctx.strokeStyle = '#b8322a';
      ctx.lineWidth = s * 0.085;
      ctx.lineCap = 'round';
      ctx.stroke();
    });
    line(ctx, s * 0.48, s * 0.2, s * 0.48, s * 0.86, 'rgba(255,255,255,0.28)', s * 0.02);
    line(ctx, s * 0.5, s * 0.86, s * 0.56, s * 0.93, '#7c2019', s * 0.07);
  });
};

const knife: ItemDrawer = (ctx, s) => {
  diagonal(ctx, s, -35, () => {
    withShadow(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(s * 0.44, s * 0.52);
      ctx.lineTo(s * 0.44, s * 0.16);
      ctx.quadraticCurveTo(s * 0.5, s * 0.06, s * 0.58, s * 0.12);
      ctx.lineTo(s * 0.56, s * 0.52);
      ctx.closePath();
      ctx.fillStyle = '#d4d9de';
      ctx.fill();
      ctx.strokeStyle = '#7d848b';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    shadedBox(ctx, s * 0.42, s * 0.52, s * 0.16, s * 0.34, 4, '#26282b', { light: 0.2, outline: '#0c0d0e' });
    circle(ctx, s * 0.5, s * 0.62, s * 0.02, '#b8bcc0');
    circle(ctx, s * 0.5, s * 0.76, s * 0.02, '#b8bcc0');
  });
};

const nails: ItemDrawer = (ctx, s) => {
  const spots = [
    [0.3, 0.34, 20],
    [0.52, 0.3, -30],
    [0.66, 0.5, 70],
    [0.4, 0.6, -60],
    [0.58, 0.7, 10],
    [0.28, 0.52, 95],
  ] as const;
  for (const [x, y, a] of spots) {
    ctx.save();
    ctx.translate(s * x, s * y);
    ctx.rotate((a * Math.PI) / 180);
    withShadow(ctx, () => line(ctx, 0, -s * 0.13, 0, s * 0.13, '#9aa1a8', s * 0.035, 'butt'));
    line(ctx, -s * 0.04, -s * 0.13, s * 0.04, -s * 0.13, '#6d737a', s * 0.03, 'round');
    ctx.restore();
  }
};

const plank: ItemDrawer = (ctx, s) => {
  diagonal(ctx, s, -38, () => {
    withShadow(ctx, () => shadedBox(ctx, s * 0.36, s * 0.04, s * 0.28, s * 0.92, 2, '#b38652', { light: 0.18, outline: '#6b4a24' }));
    ctx.strokeStyle = 'rgba(90,58,26,0.45)';
    ctx.lineWidth = 1;
    for (const x of [0.43, 0.5, 0.57]) {
      ctx.beginPath();
      ctx.moveTo(s * x, s * 0.08);
      ctx.bezierCurveTo(s * (x + 0.02), s * 0.35, s * (x - 0.02), s * 0.6, s * x, s * 0.92);
      ctx.stroke();
    }
    circle(ctx, s * 0.52, s * 0.4, s * 0.025, '#6b4a24');
  });
};

const tape: ItemDrawer = (ctx, s) => {
  withShadow(ctx, () => ball(ctx, s * 0.5, s * 0.5, s * 0.3, '#9ea3a8'));
  circle(ctx, s * 0.5, s * 0.5, s * 0.15, '#c9b48a', '#8a7650', 1.5);
  circle(ctx, s * 0.5, s * 0.5, s * 0.1, 'rgba(0,0,0,0.25)');
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.5, s * 0.24, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
};

export const ITEM_DRAWERS: Record<string, ItemDrawer> = {
  'item.agua': bottle,
  'item.refrigerante': can('#c8352c', '#f2f2f2', true),
  'item.feijao': can('#9aa0a6', '#7a4a2a', false),
  'item.biscoito': biscuits,
  'item.atadura': bandage,
  'item.analgesico': pills,
  'item.lanterna': flashlight,
  'item.pilhas': batteries,
  'item.martelo': hammer,
  'item.chaveFenda': screwdriver,
  'item.peDeCabra': crowbar,
  'item.faca': knife,
  'item.pregos': nails,
  'item.tabua': plank,
  'item.fita': tape,
};
