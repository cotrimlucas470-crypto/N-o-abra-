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
  {arq:'abertura-narrada.js',   ini:'<!-- cine:inicio -->',fim:'<!-- cine:fim -->'},
  {arq:'corte-comodo.js',       ini:'<!-- corte:inicio -->',fim:'<!-- corte:fim -->'},
  {arq:'s9-percepcao.js',       ini:'<!-- s9:inicio -->',   fim:'<!-- s9:fim -->'},
  {arq:'audio-manager.js',      ini:'<!-- am:inicio -->',   fim:'<!-- am:fim -->'},
  {arq:'s15-qualidade.js',      ini:'<!-- s15:inicio -->',  fim:'<!-- s15:fim -->'},
  {arq:'s16-armazenamento.js',  ini:'<!-- s16:inicio -->',  fim:'<!-- s16:fim -->'},
  {arq:'s17-chuva.js',          ini:'<!-- s17:inicio -->',  fim:'<!-- s17:fim -->'},
  {arq:'s18-luz.js',            ini:'<!-- s18:inicio -->',  fim:'<!-- s18:fim -->'},
  {arq:'s19-ficha.js',          ini:'<!-- s19:inicio -->',  fim:'<!-- s19:fim -->'},
  {arq:'s20-armas.js',          ini:'<!-- s20:inicio -->',  fim:'<!-- s20:fim -->'},
  {arq:'s21-corpo.js',          ini:'<!-- s21:inicio -->',  fim:'<!-- s21:fim -->'},
];

/* A voz da abertura entra embutida. O jogo é um arquivo só — é o que a
   pessoa publica e o que o celular guarda — então o mp3 vira data: URI
   aqui, na montagem, e o bloco continua legível no repositório. */
const EMBUTIR={
  '@@VOZ_ABERTURA@@':{arq:'abertura.mp3', tipo:'audio/mpeg'},
  '@@PASSOS_CORTE@@':{arq:'passos.mp3',   tipo:'audio/mpeg'},
  /* o gerador é gravação de verdade, cortada num laço de 6 s e
     recodificada a 48 kbps mono. 35 KB pra um som que fica tocando
     metade do jogo é barato — e é o único jeito de ele existir num
     HTML só, que é como o jogo é publicado. */
  '@@GERADOR@@':{arq:'gerador.mp3', tipo:'audio/mpeg'},
  /* a chuva é um laço de 5,76 s sem trovão nenhum; os dois trovões da
     mesma gravação entram como disparo avulso, não no laço */
  '@@CHUVA@@':{arq:'chuva.mp3', tipo:'audio/mpeg'},
  '@@TROVAO_PERTO@@':{arq:'trovao-perto.mp3', tipo:'audio/mpeg'},
  '@@TROVAO_LONGE@@':{arq:'trovao-longe.mp3', tipo:'audio/mpeg'},
  /* fundo-abertura.mp3 ficou fora: a abertura usa drone sintetizado, e
     embutir 0,84 MB de base64 que ninguém toca era peso morto no HTML.
     O arquivo continua no repositório caso a voz volte. */
};

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
  let bloco=fs.readFileSync(b.arq,'utf8');
  for(const [marca,emb] of Object.entries(EMBUTIR)){
    if(!bloco.includes(marca))continue;
    const dados=fs.readFileSync(emb.arq).toString('base64');
    bloco=bloco.replace(marca,'data:'+emb.tipo+';base64,'+dados);
    b.embutiu=(b.embutiu||[]).concat(emb.arq+' ('+(dados.length/1024/1024).toFixed(2)+' MB em base64)');
  }
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
  "const VERSAO = 'v48-' + '20260815a';");
fs.writeFileSync('sw.js',sw);

console.log('index.html: '+(html.length/1024).toFixed(0)+' KB');
for(const b of BLOCOS){
  console.log('  '+b.arq+': '+b.kb+' KB');
  if(b.embutiu)for(const e of b.embutiu)console.log('      embutido: '+e);
}
