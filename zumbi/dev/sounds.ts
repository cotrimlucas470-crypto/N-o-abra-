// Gera WAV + espectrograma (PNG) dos sons, para conferir o conteúdo sem ouvir.
// Uso: npx rolldown dev/sounds.ts -o /tmp/sounds.mjs -p node && node /tmp/sounds.mjs <saida> [filtro,filtro]
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { Rng } from '../src/game/audio/dsp';
import { SOUNDS, variantSeed } from '../src/game/audio/SoundCatalog';

const [out, only] = process.argv.slice(2);
const filters = only ? only.split(',') : null;
mkdirSync(out!, { recursive: true });

function wav(data: Float32Array, sr: number): Buffer {
  const b = Buffer.alloc(44 + data.length * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + data.length * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(data[i]! * 32767))), 44 + i * 2);
  return b;
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]!) & 255]! ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Espectrograma: faixas de variações empilhadas; cima = agudo (até sr/2), log de magnitude. Com forma de onda embaixo. */
function spectro(list: Float32Array[], sr: number, seconds: number): Buffer {
  const N = 512;
  const hop = Math.max(32, Math.round((seconds * sr) / 500));
  const W = 500;
  const H = 128;
  const WAVE = 32;
  const rowH = H + WAVE + 4;
  const img = new Uint8Array(W * rowH * list.length * 3);
  const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  list.forEach((data, r) => {
    const base = r * rowH;
    for (let x = 0; x < W; x++) {
      const s0 = x * hop;
      // DFT só nas faixas desenhadas (128 linhas, log de 40 Hz a sr/2).
      for (let y = 0; y < H; y++) {
        const f = 40 * Math.pow(sr / 2 / 40, (H - 1 - y) / (H - 1));
        const k = (f / sr) * N;
        let re = 0;
        let im = 0;
        for (let i = 0; i < N; i++) {
          const v = (data[s0 + i] ?? 0) * win[i]!;
          const a = (2 * Math.PI * k * i) / N;
          re += v * Math.cos(a);
          im -= v * Math.sin(a);
        }
        const db = 20 * Math.log10(Math.hypot(re, im) / (N / 4) + 1e-7);
        const v = Math.max(0, Math.min(1, (db + 80) / 80));
        const o = ((base + y) * W + x) * 3;
        img[o] = Math.round(255 * Math.min(1, v * 1.8));
        img[o + 1] = Math.round(255 * Math.max(0, v * 1.6 - 0.5));
        img[o + 2] = Math.round(255 * Math.max(0, 0.6 - v) * (v > 0.05 ? 1 : 0));
      }
      let m = 0;
      for (let i = 0; i < hop; i++) m = Math.max(m, Math.abs(data[s0 + i] ?? 0));
      const hh = Math.round(m * WAVE);
      for (let y = 0; y < WAVE; y++) {
        const o = ((base + H + y) * W + x) * 3;
        const on = WAVE - 1 - y < hh;
        img[o] = on ? 120 : 20;
        img[o + 1] = on ? 200 : 20;
        img[o + 2] = on ? 120 : 20;
      }
    }
  });
  return png(W, rowH * list.length, img);
}

const summary: string[] = [];
for (const def of SOUNDS.values()) {
  if (filters && !filters.some((f) => def.id.includes(f))) continue;
  const list: Float32Array[] = [];
  let bytes = 0;
  const t0 = performance.now();
  for (let v = 0; v < Math.min(def.variants, 4); v++) {
    const d = def.make(new Rng(variantSeed(def.id, v)), def.sr);
    list.push(d);
    bytes += d.length * 4;
    if (v < 2) writeFileSync(`${out}/${def.id}.${v}.wav`, wav(d, def.sr));
  }
  const ms = (performance.now() - t0) / list.length;
  const longest = Math.max(...list.map((d) => d.length)) / def.sr;
  writeFileSync(`${out}/${def.id}.png`, spectro(list, def.sr, Math.max(0.25, longest)));
  summary.push(`${def.id.padEnd(34)} ${longest.toFixed(2)} s · ${(bytes / list.length / 1024).toFixed(0)} KB · ${ms.toFixed(1)} ms/variação`);
}
console.log(summary.join('\n'));
