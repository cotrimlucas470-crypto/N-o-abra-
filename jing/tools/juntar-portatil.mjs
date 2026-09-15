/**
 * Costura o build portátil num único arquivo .html.
 *
 * O Vite já deixou tudo em dois arquivos (bundle.js e bundle.css) com as
 * fontes embutidas em base64. Aqui eles entram inline no HTML e a tag de
 * módulo vira script clássico — é o que permite abrir por file://.
 */
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(raiz, 'dist-portatil');
const alvo = join(raiz, 'JING-abrir-offline.html');

let html = readFileSync(join(dir, 'index.html'), 'utf8');
const js = readFileSync(join(dir, 'bundle.js'), 'utf8');
const css = existsSync(join(dir, 'bundle.css')) ? readFileSync(join(dir, 'bundle.css'), 'utf8') : '';

// o favicon também entra inline, senão o arquivo solto vira dependência
const svg = readFileSync(join(raiz, 'public', 'favicon.svg'), 'utf8');
const favicon = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

// ATENÇÃO: a substituição usa FUNÇÃO, nunca string. Um bundle minificado
// está cheio de $ e o replace com string interpretaria $&, $' e $` — o
// arquivo sairia silenciosamente corrompido.
html = html
  .replace(/<link rel="icon"[^>]*>/, () => `<link rel="icon" type="image/svg+xml" href="${favicon}" />`)
  .replace(/<link rel="stylesheet"[^>]*href="[^"]*bundle\.css"[^>]*>/, () => `<style>\n${css}\n</style>`)
  // o script de módulo vinha no <head> e era adiado pelo próprio type=module.
  // Inline e clássico ele roda na hora, então precisa ir para o fim do <body>,
  // senão o DOM ainda não existe quando o bundle procura o canvas.
  .replace(/<script type="module"[^>]*src="[^"]*bundle\.js"[^>]*><\/script>\s*/, '')
  .replace(/<\/body>/, () => `<script>\n${js}\n</script>\n</body>`);

// o guard olha as TAGS, não a string solta: o helper de preload do Vite
// carrega o nome do bundle como fallback de URL base e nunca o busca.
if (/(?:src|href)="[^"]*bundle\.(?:js|css)"/.test(html)) {
  console.error('ERRO: sobrou referência externa no HTML — o arquivo não é autônomo.');
  process.exit(1);
}
if (html.lastIndexOf('<script>') < html.indexOf('id="cena"')) {
  console.error('ERRO: o script inline ficou antes do canvas — rodaria sem DOM.');
  process.exit(1);
}

writeFileSync(alvo, html);
rmSync(dir, { recursive: true, force: true });
const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
console.log(`JING-abrir-offline.html pronto — ${mb} MB, autônomo.`);
