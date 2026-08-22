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
  {arq:'s22-menu.js',           ini:'<!-- s22:inicio -->',  fim:'<!-- s22:fim -->'},
  {arq:'s23-expedicao.js',      ini:'<!-- s23:inicio -->',  fim:'<!-- s23:fim -->'},
  {arq:'s24-fuga.js',           ini:'<!-- s24:inicio -->',  fim:'<!-- s24:fim -->'},
  {arq:'s25-dificuldade.js',    ini:'<!-- s25:inicio -->',  fim:'<!-- s25:fim -->'},
  {arq:'s26-anomalias.js',      ini:'<!-- s26:inicio -->',  fim:'<!-- s26:fim -->'},
  {arq:'s27-porta.js',          ini:'<!-- s27:inicio -->',  fim:'<!-- s27:fim -->'},
  {arq:'s28-progresso.js',      ini:'<!-- s28:inicio -->',  fim:'<!-- s28:fim -->'},
  {arq:'s29-rumo.js',           ini:'<!-- s29:inicio -->',  fim:'<!-- s29:fim -->'},
  {arq:'s30-nucleo.js',         ini:'<!-- s30:inicio -->',  fim:'<!-- s30:fim -->'},
  {arq:'s31-orquestrador.js',   ini:'<!-- s31:inicio -->',  fim:'<!-- s31:fim -->'},
  {arq:'s32-memoria.js',        ini:'<!-- s32:inicio -->',  fim:'<!-- s32:fim -->'},
  {arq:'s33-final.js',          ini:'<!-- s33:inicio -->',  fim:'<!-- s33:fim -->'},
  {arq:'s34-ouvido.js',         ini:'<!-- s34:inicio -->',  fim:'<!-- s34:fim -->'},
  {arq:'s35-porta-falas.js',    ini:'<!-- s35:inicio -->',  fim:'<!-- s35:fim -->'},
  {arq:'s36-itens.js',          ini:'<!-- s36:inicio -->',  fim:'<!-- s36:fim -->'},
  {arq:'s37-saldo.js',          ini:'<!-- s37:inicio -->',  fim:'<!-- s37:fim -->'},
  {arq:'s38-sanidade.js',       ini:'<!-- s38:inicio -->',  fim:'<!-- s38:fim -->'},
  {arq:'s39-passo.js',          ini:'<!-- s39:inicio -->', fim:'<!-- s39:fim -->'},
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

/* ============ TRAVA DE COLISÃO DE NOME ============
   O jogo é um escopo global só: index.html e os 14 blocos dividem os
   mesmos ~1200 nomes de topo. Redefinir um nome NÃO dá erro — o último
   vence, calado, e quem chamava o primeiro passa a chamar outra coisa.

   Foi assim que `capacidade` do baú (§16) apagou a `capacidade` da
   expedição e fez toda saída pra rua estourar na tela de carga, e assim
   que `ficha()` do §19 apagou a `ficha(nome,tag,texto)` que desenha
   linha de tela e deixou 20 e tantas listas do jogo em branco.

   Nenhum dos dois apareceu em teste nenhum durante versões inteiras,
   porque não produzem erro na carga. Então a checagem virou parte da
   montagem: colisão nova QUEBRA O BUILD.

   A lista abaixo são as substituições deliberadas — casos em que o
   index.html deixa um gancho vazio de propósito esperando o bloco. Pra
   acrescentar uma, escreva por que ela é intencional. */
const COLISAO_OK=new Set([
  'passo',       /* v48 troca o passo sintetizado pelo sistema de superfícies */
  'gastarArma',  /* index.html:4696 é stub {} que o §15 preenche */
  'chanceArma',  /* index.html:4697 é stub `return p` */
  'usarFerra',   /* index.html:4698 é stub `return true` */
  'vestir',      /* §15 só armadura → §21 com os 14 slots, sucessor legítimo */
]);

function nomesDeTopo(txt){
  const out=new Map();
  txt.split('\n').forEach((l,i)=>{
    let m=/^function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(l);
    if(m){ if(!out.has(m[1]))out.set(m[1],i+1); return; }
    m=/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/.exec(l);
    if(m&&!out.has(m[1]))out.set(m[1],i+1);
  });
  return out;
}
function checarColisoes(){
  const vistos=new Map();      /* nome -> 'arquivo:linha' */
  const ruins=[];
  /* o index.html conta sem os blocos já injetados */
  const base=fs.readFileSync('index.html','utf8')
    .replace(/<!-- (v48|s\d+|cine|corte|am):inicio -->[\s\S]*?<!-- \1:fim -->/g,
      m=>m.replace(/[^\n]/g,' '));
  const fontes=[['index.html',base]].concat(
    BLOCOS.map(b=>[b.arq,fs.readFileSync(b.arq,'utf8')]));
  for(const [arq,txt] of fontes){
    for(const [nome,linha] of nomesDeTopo(txt)){
      if(vistos.has(nome)&&!COLISAO_OK.has(nome))
        ruins.push(`  ${nome}\n      ${vistos.get(nome)}\n      ${arq}:${linha}`);
      else if(!vistos.has(nome))vistos.set(nome,arq+':'+linha);
    }
  }
  if(ruins.length){
    console.error('\nCOLISÃO DE NOME GLOBAL — o segundo apaga o primeiro em silêncio:\n');
    console.error(ruins.join('\n'));
    console.error('\nRenomeie um dos dois, ou registre em COLISAO_OK dizendo por quê.\n');
    process.exit(1);
  }
  console.log('sem colisão de nome ('+vistos.size+' nomes de topo, '
    +COLISAO_OK.size+' substituições declaradas)');
}
checarColisoes();

/* ============ TRAVA DE ACENTO EM IDENTIFICADOR ============
   Trocar acento por script e tentador e perigoso: uma substituicao
   cega de "ruido" por "ruido-com-acento" nao distingue o TEXTO que o
   jogador le do IDENTIFICADOR que o codigo usa. Foi assim que
   `S.ruido` virou `S.ruido-acentuado`, `{k:'remedio'}` virou
   `{k:'remedio-acentuado'}` e `cena.casa.voce` virou
   `cena.casa.voce-acentuado` — este ultimo derrubava o botao Voltar
   da tela de ajuda.

   JavaScript ACEITA acento em identificador, entao nada disso da erro
   de sintaxe: da erro de comportamento, calado, longe do lugar onde
   foi escrito. Por isso vira trava de build.

   O resto do jogo usa identificador em ASCII. Texto acentuado dentro
   de string continua livre — e e la que o acento tem de estar. */
function acentuadoNoCodigo(txt){
  const semTexto=txt
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/(^|[^:])\/\/[^\n]*/g,'$1')
    .replace(/'(?:\\.|[^'\\])*'/g,"''")
    .replace(/"(?:\\.|[^"\\])*"/g,'""')
    .replace(/`(?:\\.|[^`\\])*`/g,'``');
  const re=/[.\[]\s*([A-Za-z_$][\w$]*[áéíóúâêôãõàçÁÉÍÓÚÂÊÔÃÕÀÇ][\w$áéíóúâêôãõàçÁÉÍÓÚÂÊÔÃÕÀÇ]*)/g;
  const achados=new Set();
  let g; while((g=re.exec(semTexto)))achados.add(g[1]);
  return [...achados];
}
function checarAcentos(){
  const ruins=[];
  for(const b of BLOCOS){
    const a=acentuadoNoCodigo(fs.readFileSync(b.arq,'utf8'));
    if(a.length)ruins.push('  '+b.arq+': '+a.join(', '));
  }
  if(ruins.length){
    console.error('\nACENTO EM IDENTIFICADOR — o JS aceita e o comportamento quebra calado:\n');
    console.error(ruins.join('\n'));
    console.error('\nTexto acentuado vai DENTRO de string. Nome de campo e de variavel, nao.\n');
    process.exit(1);
  }
  console.log('sem acento em identificador');
}
checarAcentos();

/* ================= 3a GUARDA: AS PRIMITIVAS DE DECISAO =================
   `sortear` e `chance` carregam 612 das decisoes do jogo. Ate a v65 as
   duas eram `Math.random()` puro, com o RNG semeado montado ao lado,
   salvo em `d.rngEstado`, restaurado na carga — e nunca ligado. A
   politica estava escrita em s30-nucleo.js e o codigo garantia que ela
   nao valia.

   Nao da pra confiar em revisao pra isso nao voltar: a regressao seria
   um caractere, sem erro, sem teste vermelho, e so apareceria como
   "esse save nao reproduz". Entao a build quebra.

   Cosmetico continua livre: `_ale` so e exigido nas duas primitivas. */
function checarPrimitivas(){
  const h=fs.readFileSync('index.html','utf8');
  const erros=[];
  const casos=[
    [/const\s+sortear\s*=\s*a\s*=>\s*a\[Math\.floor\(_ale\(\)\*a\.length\)\]/, 'sortear'],
    [/const\s+chance\s*=\s*p\s*=>\s*_ale\(\)\s*<\s*p/,                          'chance'],
    [/function\s+_ale\(\)/,                                                     '_ale']
  ];
  for(const [re,nome] of casos)
    if(!re.test(h))erros.push('  '+nome+' nao esta na forma semeada esperada');
  if(erros.length){
    console.error('\nPRIMITIVA DE DECISAO FORA DO RNG SEMEADO:\n');
    console.error(erros.join('\n'));
    console.error('\n`sortear` e `chance` decidem 612 coisas. As duas passam por _ale().\n');
    process.exit(1);
  }
  console.log('sortear e chance passam pelo RNG semeado');
}
checarPrimitivas();


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
  "const VERSAO = 'v48-' + '20260821a';");
fs.writeFileSync('sw.js',sw);

console.log('index.html: '+(html.length/1024).toFixed(0)+' KB');
for(const b of BLOCOS){
  console.log('  '+b.arq+': '+b.kb+' KB');
  if(b.embutiu)for(const e of b.embutiu)console.log('      embutido: '+e);
}
