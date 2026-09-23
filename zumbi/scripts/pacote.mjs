/**
 * Empacota dist/ num .zip pronto para arrastar no Netlify Drop
 * (app.netlify.com/drop) ou instalar como app pelo Chrome.
 * Uso: npm run build && npm run pacote
 * Saída: pacote/toque-de-recolher.zip (nome fixo = link de download fixo no GitHub)
 *
 * Zip escrito à mão (zlib do Node), sem dependências.
 */
import { deflateRawSync } from 'node:zlib';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const outDir = join(root, 'pacote');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

let files;
try {
  files = walk(dist).sort();
} catch {
  console.error('dist/ não existe — rode "npm run build" antes.');
  process.exit(1);
}

const locals = [];
const centrals = [];
let offset = 0;
// Data fixa (1/1/2026): o mesmo build gera o mesmo zip.
const dosTime = 0;
const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;

for (const file of files) {
  const name = Buffer.from(relative(dist, file).split('\\').join('/'), 'utf8');
  const data = readFileSync(file);
  const comp = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6); // nomes em UTF-8
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt16LE(dosTime, 10);
  local.writeUInt16LE(dosDate, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comp.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);
  locals.push(local, name, comp);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(dosTime, 12);
  central.writeUInt16LE(dosDate, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(comp.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, name);
  offset += local.length + name.length + comp.length;
}

const centralSize = centrals.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'toque-de-recolher.zip');
writeFileSync(out, Buffer.concat([...locals, ...centrals, end]));
writeFileSync(join(outDir, 'VERSAO.txt'), `Toque de Recolher v${pkg.version}\nGerado de dist/ com ${files.length} arquivos.\n`);
console.log(`pacote: ${relative(root, out)} (${(statSync(out).size / 1024).toFixed(0)} KB, ${files.length} arquivos, v${pkg.version})`);
