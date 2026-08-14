/* Injeta os blocos soltos dentro do index.html, antes de </body>.
   O jogo é distribuído como um HTML só, mas cada bloco novo fica em
   arquivo separado pra dar pra ler e revisar. Rode:  node montar.js

   A ordem da lista é a ordem de execução no navegador, e ela importa:
   cada bloco embrulha funções que o anterior já embrulhou. §14 lê o
   peso verdadeiro por baixo da mentira de sanidade que o v48 instala,
   então tem de vir depois dele. */
const fs=require('fs');

const BLOCOS=[
  {arq:'v48-som-e-sanidade.js', ini:'<!-- v48:inicio -->', fim:'<!-- v48:fim -->'},
  {arq:'s14-mochilas.js',       ini:'<!-- s14:inicio -->', fim:'<!-- s14:fim -->'},
];

let html=fs.readFileSync('index.html','utf8');

/* Remove injeções anteriores, se houver, pra dar pra rodar de novo.
   Consome também a quebra de linha que a injeção põe depois da marca
   final — sem isso cada execução deixava uma linha em branco a mais. */
for(const b of BLOCOS){
  const ini=html.indexOf(b.ini), fim=html.indexOf(b.fim);
  if(ini>=0&&fim>ini){
    let corte=fim+b.fim.length;
    if(html[corte]==='\n')corte++;
    html=html.slice(0,ini)+html.slice(corte);
  }
}

const alvo='</body>';
const pos=html.lastIndexOf(alvo);
if(pos<0){ console.error('não achei </body>'); process.exit(1); }

let injecao='';
for(const b of BLOCOS){
  const bloco=fs.readFileSync(b.arq,'utf8');
  injecao+=b.ini+'\n<script>\n'+bloco+'\n</script>\n'+b.fim+'\n';
  b.kb=(bloco.length/1024).toFixed(0);
}
html=html.slice(0,pos)+injecao+html.slice(pos);

html=html.replace('<div id="versao">v47</div>','<div id="versao">v48</div>');

fs.writeFileSync('index.html',html);

// o service worker precisa de nome de cache novo, senão o aparelho
// continua servindo a versão velha
let sw=fs.readFileSync('sw.js','utf8');
sw=sw.replace(/const VERSAO = '[^']*' \+ '[^']*';/,
  "const VERSAO = 'v48-' + '20260814b';");
fs.writeFileSync('sw.js',sw);

console.log('index.html: '+(html.length/1024).toFixed(0)+' KB');
for(const b of BLOCOS)console.log('  '+b.arq+': '+b.kb+' KB');
