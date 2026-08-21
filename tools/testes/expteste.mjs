/* FASE 1 — prova que a perda de itens acabou.
   1. reproduz a causa raiz (colisão de nome) e mostra que ela sumiu
   2. expedição completa preserva 100% do que foi pego
   3. travamento no meio NÃO perde o que já estava na mão
   4. save/load depois de pegar
   5. achado inválido é ignorado, não derruba a tela            */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','E'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=6;fichaJogador().pontos.percepcao=4;
    document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);


/* ---- motorista de expedição: espera de verdade pelos botões ---- */
await p.evaluate(()=>{
  window.__espera=ms=>new Promise(r=>setTimeout(r,ms));
  window.__botoes=()=>[...document.querySelectorAll('#acoes button')]
    .filter(x=>!x.disabled&&!x.classList.contains('sec-cab'));
  /* espera até 12 s por uma tela com botões */
  window.__esperaBotoes=async(ms)=>{
    const fim=Date.now()+(ms||12000);
    while(Date.now()<fim){
      if(__botoes().length)return __botoes();
      await __espera(120);
    }
    return [];
  };
  /* sai em expedição e dirige até a tela de carga (ou até o fim) */
  window.__ateCarga=async(idx)=>{
    S.hora=7; S.esgotados={}; S.ruido=0;
    const L=poolDeLocais();
    escolherParceiro(L[idx%L.length]);
    let bs=await __esperaBotoes();
    const ir=bs.find(x=>/ir sozinho/i.test(x.textContent));
    if(!ir)return {ok:false,porque:'sem botão de sair'};
    ir.click();
    for(let i=0;i<60;i++){
      bs=await __esperaBotoes();
      if(!bs.length)return {ok:false,porque:'tela sem ação'};
      if(/travou aqui/.test(document.getElementById('texto').textContent))
        return {ok:false,porque:'travou'};
      if(cena.modo==='fim')return {ok:false,porque:'fim de partida'};
      const enc=bs.find(x=>/encher a mochila/i.test(x.textContent));
      if(enc){ enc.click(); await __espera(200); return {ok:true}; }
      const b2=bs.find(x=>/^(pela|pelo|seguir|limpar)/i.test(x.textContent))||bs[0];
      if(/recome|partida nova|salvar e recarregar/i.test(b2.textContent))
        return {ok:false,porque:'tela de socorro/fim'};
      b2.click();
      await __espera(150);
    }
    return {ok:false,porque:'não chegou na carga em 60 passos'};
  };
});

console.log('\n1. A CAUSA RAIZ (colisão de nome global)');
let d=await p.evaluate(()=>{
  const out={};
  /* capacidade da expedição: recebe o PARCEIRO, devolve QUILOS */
  try{ out.capSozinho=capacidade(null); }catch(e){ out.capErro=e.message; }
  try{ out.capComParceiro=capacidade({n:'X',hab:'escalada'}); }catch(e){ out.capErro2=e.message; }
  /* capacidade do baú tem nome próprio agora */
  out.temCapBau=typeof capacidadeBau==='function';
  try{ out.slotsBau=capacidadeBau(Object.keys(BAUS)[0]); }catch(e){ out.bauErro=e.message; }
  /* ficha: a de UI desenha linha; a de personagem tem nome próprio */
  const antes=document.querySelectorAll('#texto .gente').length;
  ficha('teste','tag','texto');
  out.desenhouLinha=document.querySelectorAll('#texto .gente').length>antes;
  out.temFichaJogador=typeof fichaJogador==='function';
  out.fichaJogadorTemPontos=!!(fichaJogador()&&fichaJogador().pontos);
  return out;
});
console.log('   ',JSON.stringify(d));
ok('capacidade(null) devolve quilos em vez de estourar',typeof d.capSozinho==='number'&&d.capSozinho>0);
ok('capacidade(parceiro) também',typeof d.capComParceiro==='number'&&d.capComParceiro>d.capSozinho);
ok('o baú ganhou nome próprio (capacidadeBau)',d.temCapBau&&typeof d.slotsBau==='number');
ok('ficha(nome,tag,texto) voltou a desenhar linha na tela',d.desenhouLinha);
ok('a ficha de personagem ganhou nome próprio (fichaJogador)',d.temFichaJogador&&d.fichaJogadorTemPontos);

console.log('\n2. EXPEDIÇÃO INTEIRA PRESERVA O QUE FOI PEGO');
d=await p.evaluate(async()=>{
  S.diesel=10; S.comida=2;
  const r=await __ateCarga(0);
  if(!r.ok)return {falhou:r.porque};
  const naMao=JSON.parse(JSON.stringify(S.exped.levar));
  const antes={diesel:S.diesel,comida:S.comida};
  /* vai embora e deixa a expedição terminar sozinha */
  let bs=__botoes();
  const ir=bs.find(x=>/ir embora com isso/i.test(x.textContent));
  if(ir)ir.click();
  for(let i=0;i<40;i++){
    bs=await __esperaBotoes(9000);
    if(!bs.length)break;
    if(cena.modo==='casa'||cena.modo==='vazio')break;
    const b2=bs.find(x=>/^(pela|pelo|correr|recuar|ficar)/i.test(x.textContent))||bs[0];
    if(/recome|partida nova|salvar e recarregar|continuar o dia/i.test(b2.textContent))break;
    b2.click(); await __espera(150);
  }
  /* `recolher` continua rodando depois de pôr o jogador em casa (tem
     pausa, encontro de gente, painel). O livro fecha no fim dela — então
     espera ela acabar de verdade em vez de medir no meio. */
  const fim=Date.now()+12000;
  while(Date.now()<fim&&S.exped&&S.exped.ativa)await __espera(200);
  return {naMao, antes, depois:{diesel:S.diesel,comida:S.comida},
    livroFechado:!(S.exped&&S.exped.ativa), modo:cena.modo};
});
console.log('   ',JSON.stringify(d));
ok('a tela "O que você carrega" abre sem travar',!d.falhou);
ok('e ela registra o que foi pego',d.naMao&&Object.values(d.naMao).some(v=>v>0));
ok('os recursos aumentaram na volta',d.depois&&(d.depois.diesel>d.antes.diesel||d.depois.comida>d.antes.comida));
ok('o livro da expedição fecha no fim',d.livroFechado);

console.log('\n3. TRAVAMENTO NO MEIO NÃO PERDE O QUE ESTAVA NA MÃO');
d=await p.evaluate(async()=>{
  S.diesel=5; S.comida=1;
  let r=null;
  for(let t=1;t<=4&&!(r&&r.ok);t++) r=await __ateCarga(t);
  if(!r.ok)return {falhou:r.porque};
  const antes={diesel:S.diesel,comida:S.comida};
  const naMao=JSON.parse(JSON.stringify(S.exped.levar));
  salvarAgora();
  const disco=JSON.parse(localStorage.getItem(CHAVE)||'{}');
  /* AGORA O TRAVAMENTO: o vigia dispara no meio da rua */
  socorro();
  await __espera(500);
  return {naMao, antes, depois:{diesel:S.diesel,comida:S.comida},
    salvouLivro:!!(disco.exped&&disco.exped.ativa),
    discoLevar:disco.exped?disco.exped.levar:null,
    livroFechado:!(S.exped&&S.exped.ativa),
    texto:document.getElementById('texto').textContent};
});
console.log('   ',JSON.stringify({...d,texto:undefined}).slice(0,400));
ok('chegou na carga com coisa na mão',!d.falhou&&Object.values(d.naMao||{}).some(v=>v>0));
ok('o que estava na mão já estava salvo no disco',d.salvouLivro&&Object.values(d.discoLevar||{}).some(v=>v>0));
ok('o socorro CREDITA em vez de descartar',d.depois&&(d.depois.diesel>d.antes.diesel||d.depois.comida>d.antes.comida));
ok('e diz na tela que não se perdeu',/não se perde|veio junto/i.test(d.texto||''));
ok('o livro fecha depois de creditado',d.livroFechado);

console.log('\n4. ACHADO INVÁLIDO NÃO DERRUBA A TELA');
d=await p.evaluate(()=>{
  const antes=(S.erros||[]).length;
  const ctx={l:{id:'teste'},par:null,achados:[
    {n:'diesel',q:3,kg:1},
    null,                                  /* nulo */
    {n:'',q:2,kg:1},                       /* sem nome */
    {n:'comida',q:0,kg:1.5},               /* quantidade zero */
    {n:'lata',q:2,kg:NaN},                 /* peso inválido */
    {n:'faca',q:1,kg:.4,item:{n:'faca'}}   /* item sem id */
  ]};
  let estourou=null;
  try{ etapaCarga(ETAPAS.rua7||Object.values(ETAPAS)[0], ctx); }
  catch(e){ estourou=e.message; }
  return {estourou, sobraram:ctx.achados.length,
    nomes:ctx.achados.map(a=>a&&a.n),
    errosNovos:(S.erros||[]).length-antes,
    temBotoes:document.querySelectorAll('#acoes button').length>0};
});
console.log('   ',JSON.stringify(d));
ok('não estoura com achado nulo/sem nome/peso NaN',!d.estourou);
ok('só o achado bom sobra',d.sobraram===1&&d.nomes[0]==='diesel');
ok('os inválidos viram registro de erro, não silêncio',d.errosNovos>=5);
ok('a tela continua clicável',d.temBotoes);

console.log('\n5. O ERRO PAROU DE SER ENGOLIDO');
d=await p.evaluate(()=>{
  S.erros=[];
  registrarErro(new Error('erro de mentira'),'teste');
  const e=(S.erros||[])[0]||{};
  return {n:(S.erros||[]).length, onde:e.onde, msg:e.msg, temPilha:!!e.pilha, temDia:e.dia!==undefined};
});
console.log('   ',JSON.stringify(d));
ok('o erro fica registrado com origem, mensagem e pilha',
  d.n===1&&d.onde==='teste'&&/mentira/.test(d.msg)&&d.temPilha&&d.temDia);

console.log('\nerros de página:',erros.filter(e=>!/ERR_|file:/.test(e)).length?erros:'(nenhum)');
await b.close();
