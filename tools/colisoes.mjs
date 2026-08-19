/* Acha nomes globais definidos duas vezes. O jogo é um escopo global só:
   todo bloco injetado divide o mesmo espaço de nomes com o index.html.
   Redefinir uma função não dá erro nenhum — a última simplesmente vence,
   em silêncio, e quem chamava a primeira passa a chamar outra coisa. */
import fs from 'fs';

const ORDEM=['index.html','v48-som-e-sanidade.js','s14-mochilas.js','abertura-narrada.js',
 'corte-comodo.js','s9-percepcao.js','audio-manager.js','s15-qualidade.js',
 's16-armazenamento.js','s17-chuva.js','s18-luz.js','s19-ficha.js','s20-armas.js',
 's21-corpo.js','s22-menu.js'];

/* onde cada bloco é injetado no index.html decide quem vence */
const html=fs.readFileSync('/home/user/N-o-abra-/index.html','utf8');

const defs=new Map();   /* nome -> [{arq, linha, tipo}] */
function registrar(nome,arq,linha,tipo){
  if(!defs.has(nome))defs.set(nome,[]);
  defs.get(nome).push({arq,linha,tipo});
}

/* só declarações de topo: coluna 0, sem indentação */
const RE_FN=/^function\s+([A-Za-z_$][\w$]*)\s*\(/;
const RE_VAR=/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/;

for(const arq of ORDEM){
  const caminho='/home/user/N-o-abra-/'+arq;
  if(!fs.existsSync(caminho))continue;
  /* pro index.html, ignora o que é bloco injetado (já contado pelo .js) */
  let txt=fs.readFileSync(caminho,'utf8');
  if(arq==='index.html'){
    txt=txt.replace(/<!-- (v48|s\d+|cine|corte|am):inicio -->[\s\S]*?<!-- \1:fim -->/g,
      m=>m.replace(/[^\n]/g,' '));
  }
  txt.split('\n').forEach((l,i)=>{
    let m=RE_FN.exec(l);
    if(m){ registrar(m[1],arq,i+1,'function'); return; }
    m=RE_VAR.exec(l);
    if(m)registrar(m[1],arq,i+1,'const/let');
  });
}

const colisoes=[...defs.entries()].filter(([n,v])=>v.length>1);
console.log('nomes de topo mapeados:',defs.size);
console.log('COLISÕES:',colisoes.length,'\n');
colisoes.sort((a,b)=>b[1].length-a[1].length).forEach(([n,v])=>{
  console.log(`  ${n}  (${v.length}×)`);
  v.forEach(d=>console.log(`      ${d.arq}:${d.linha}  ${d.tipo}`));
});

/* quem redefine função declarada com const/let estoura na carga */
const fatais=colisoes.filter(([n,v])=>v.some(d=>d.tipo==='const/let')&&v.length>1);
if(fatais.length){
  console.log('\n  ATENÇÃO — envolve const/let (reatribuir estoura TypeError):');
  fatais.forEach(([n])=>console.log('    '+n));
}
