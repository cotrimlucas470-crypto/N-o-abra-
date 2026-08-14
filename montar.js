/* Injeta v48-som-e-sanidade.js dentro do index.html, antes de </body>.
   O jogo é distribuído como um HTML só, mas o bloco novo fica em
   arquivo separado pra dar pra ler e revisar. Rode:  node montar.js   */
const fs=require('fs');

const MARCA_INI='<!-- v48:inicio -->';
const MARCA_FIM='<!-- v48:fim -->';

let html=fs.readFileSync('index.html','utf8');
const bloco=fs.readFileSync('v48-som-e-sanidade.js','utf8');

// remove uma injeção anterior, se houver — assim dá pra rodar de novo
const ini=html.indexOf(MARCA_INI), fim=html.indexOf(MARCA_FIM);
if(ini>=0&&fim>ini) html=html.slice(0,ini)+html.slice(fim+MARCA_FIM.length);

const alvo='</body>';
const pos=html.lastIndexOf(alvo);
if(pos<0){ console.error('não achei </body>'); process.exit(1); }

html=html.slice(0,pos)
  +MARCA_INI+'\n<script>\n'+bloco+'\n</script>\n'+MARCA_FIM+'\n'
  +html.slice(pos);

html=html.replace('<div id="versao">v47</div>','<div id="versao">v48</div>');

fs.writeFileSync('index.html',html);

// o service worker precisa de nome de cache novo, senão o aparelho
// continua servindo a versão velha
let sw=fs.readFileSync('sw.js','utf8');
sw=sw.replace(/const VERSAO = '[^']*' \+ '[^']*';/,
  "const VERSAO = 'v48-' + '20260814a';");
fs.writeFileSync('sw.js',sw);

console.log('index.html: '+(html.length/1024).toFixed(0)+' KB');
console.log('bloco injetado: '+(bloco.length/1024).toFixed(0)+' KB');
