/* FASE 1/2 — varre o index.html montado, separa por bloco de origem,
   lista funções e constantes e conta quem chama quem. Estático: não
   roda o jogo, só lê. */
import {readFileSync,writeFileSync} from 'node:fs';
const h=readFileSync('index.html','utf8');
const L=h.split('\n');

const MARCAS=[['base',0],['v48',18773],['s14',19993],['cine',20396],['corte',20760],['s9',20928]];
const blocoDe=(ln)=>{ let b='base'; for(const [n,i] of MARCAS) if(ln>=i) b=n; return b; };

// --- declarações ---
const decl=new Map();  // nome -> {tipo, linha, bloco}
const add=(nome,tipo,ln)=>{ if(!decl.has(nome)) decl.set(nome,{nome,tipo,linha:ln,bloco:blocoDe(ln),chamadas:0,refs:[]}); };
L.forEach((l,i)=>{
  const ln=i+1;
  let m;
  if((m=/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(l))) add(m[1],'func',ln);
  if((m=/^\s*window\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function/.exec(l))) add(m[1],'func',ln);
  if((m=/^\s*const\s+([A-Z][A-Z0-9_]{2,})\s*=/.exec(l))) add(m[1],'CONST',ln);
});

// --- referências ---
for(const d of decl.values()){
  const re=new RegExp('(?<![\\w$.])'+d.nome.replace(/\$/g,'\\$')+'(?![\\w$])','g');
  let n=0, linhas=[];
  L.forEach((l,i)=>{
    if(i+1===d.linha) return;
    const hits=(l.match(re)||[]).length;
    if(hits){ n+=hits; if(linhas.length<4) linhas.push(i+1); }
  });
  d.chamadas=n; d.refs=linhas;
}

const mortos=[...decl.values()].filter(d=>d.chamadas===0).sort((a,b)=>a.linha-b.linha);
const porBloco={};
for(const d of decl.values()) (porBloco[d.bloco]=porBloco[d.bloco]||{n:0,mortos:0}), porBloco[d.bloco].n++, d.chamadas===0&&porBloco[d.bloco].mortos++;

console.log('=== declarações por bloco ===');
for(const [b,v] of Object.entries(porBloco)) console.log(`  ${b.padEnd(7)} ${String(v.n).padStart(4)} declarações, ${v.mortos} sem nenhuma referência`);
console.log('\n=== NUNCA REFERENCIADO (candidatos a morto) ===');
for(const d of mortos) console.log(`  ${String(d.linha).padStart(6)}  ${d.bloco.padEnd(6)} ${d.tipo.padEnd(5)} ${d.nome}`);
writeFileSync('tools/mapa.json',JSON.stringify([...decl.values()],null,1));
console.log('\ntotal de declarações:',decl.size,'| nunca referenciadas:',mortos.length);
