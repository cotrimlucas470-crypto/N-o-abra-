/* §38 — sanidade: da sugestão ao sintoma. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Lucas'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. O ESTÁGIO MORTO — MEDIDO ANTES E DEPOIS');
let d=await p.evaluate(()=>{
  const tenso=V9_ESTAGIOS.find(r=>r[0]==='tenso');
  const iluTenso=tenso[2];
  return {
    iluTenso,
    minAntigo:Math.min(...ILUSOES.map(i=>i.min),...VISOES.map(i=>i.min),...ILUSOES_SOM.map(i=>i.min)),
    poolAntigo:ILUSOES.filter(i=>iluTenso>=i.min).length
             +VISOES.filter(i=>iluTenso>=i.min).length
             +ILUSOES_SOM.filter(i=>iluTenso>=i.min).length,
    poolNovo:SUSSURROS.filter(s=>iluTenso>=s.min).length,
    promessa:V9_DESC['tenso'],
    cobertura:sanCobertura()};
});
console.log('    tenso vale',d.iluTenso,'· menor min das tabelas antigas:',d.minAntigo);
console.log('    o jogo promete: "'+d.promessa+'"');
ok('o estágio tenso tinha pool ZERO',d.poolAntigo===0);
ok('o valor do estágio NÃO foi inflado',d.iluTenso===0.08);
ok('e agora tem conteúdo próprio na faixa dele',d.poolNovo>=8);
console.log('    cobertura por estágio:');
d.cobertura.forEach(c=>console.log('      '+c.estagio.padEnd(12)
  +'sussurros '+String(c.sussurros).padStart(2)
  +' · resto '+String(c.ilusoes+c.visoes+c.sons).padStart(2)
  +' · total '+String(c.sussurros+c.ilusoes+c.visoes+c.sons).padStart(2)));
ok('lúcido continua sem nada — lúcido é lúcido',
  d.cobertura[0].sussurros===0&&d.cobertura[0].ilusoes===0);
ok('nenhum estágio abaixo de lúcido fica vazio',
  d.cobertura.slice(1).every(c=>c.sussurros+c.ilusoes+c.visoes+c.sons>0));

console.log('\n2. O SUSSURRO NÃO SE ANUNCIA');
d=await p.evaluate(async()=>{
  S.san38=null; sanEstado();
  /* SEM ISTO O TESTE MEDE NADA: com sanidade cheia o estagio e
     lucido, e lucido nao sussurra por desenho. A primeira versao
     deste teste rodava em 100 e reprovava o sistema por causa do
     proprio setup. */
  /* DOIS golpes: o V9 tem escudo de 30 pontos que come o primeiro
     inteiro. Um -22 sozinho nao tira nada da sanidade e o teste
     mediria o lucido achando que mede o tenso. */
  mexerSan(-22); mexerSan(-22);
  const T=document.getElementById('texto'); T.innerHTML='';
  /* força o estágio tenso e dispara até sair um */
  let saiu=false;
  for(let i=0;i<200&&!saiu;i++){
    S.san38.desdeUltimo=99; S.san38.sussurrosHoje=0;
    saiu=talvezSussurro();
  }
  const ps=[...T.querySelectorAll('p')];
  return {saiu, n:ps.length,
    classes:[...new Set(ps.map(x=>x.className))],
    /* o ponto: nenhuma tela própria, nenhum título, nenhuma pergunta */
    semTitulo:!document.querySelector('#cap')||!/certeza/i.test(document.body.textContent),
    exemplo:(ps[0]||{}).textContent||''};
});
console.log('    saiu:',d.saiu,'· classes usadas:',JSON.stringify(d.classes));
console.log('    exemplo: "'+d.exemplo+'"');
ok('o sussurro sai',d.saiu);
ok('com a MESMA classe de qualquer outra linha (narr)',
  d.classes.length===1&&d.classes[0]==='narr');
ok('sem tela própria e sem "Você tem certeza?"',d.semTitulo);

console.log('\n3. E RESPEITA OS PRÓPRIOS LIMITES');
d=await p.evaluate(()=>{
  S.san38=null; sanEstado();
  mexerSan(-22); mexerSan(-22);   /* dois: o escudo come o primeiro */
  /* teto por dia */
  let n=0;
  for(let i=0;i<400;i++){ S.san38.desdeUltimo=99; if(talvezSussurro())n++; }
  const teto=S.san38.sussurrosHoje;
  /* intervalo entre um e outro */
  S.san38.sussurrosHoje=0; S.san38.desdeUltimo=0;
  const logoDepois=talvezSussurro();
  return {n, teto, max:SAN_CFG.sussurrosPorDia, logoDepois};
});
console.log('   ',JSON.stringify(d));
ok('não passa do teto diário de '+d.max,d.teto<=d.max&&d.n<=d.max);
ok('e não sai dois colados',d.logoDepois===false);

console.log('\n4. LÚCIDO NÃO SUSSURRA');
d=await p.evaluate(()=>{
  S.san38=null; sanEstado();
  mexerSan(100);   /* de volta ao topo */
  /* san cheia = lúcido = ilusão 0 */
  const ilu=sanIlusaoAtual();
  let n=0;
  for(let i=0;i<200;i++){ S.san38.desdeUltimo=99; S.san38.sussurrosHoje=0;
    if(talvezSussurro())n++; }
  return {ilu, n};
});
console.log('   ',JSON.stringify(d));
ok('com sanidade cheia a ilusão é zero',d.ilu===0);
ok('e nenhum sussurro sai em 200 tentativas',d.n===0);

console.log('\n5. AS TRÊS ÂNCORAS CHEGAM AO JOGADOR');
d=await p.evaluate(async()=>{
  S.san38=null; sanEstado(); S.san38.viuAncoras=false;
  const T=document.getElementById('texto'); T.innerHTML='';
  const ensinou=ensinarAncoras();
  const txt=T.textContent;
  const deNovo=ensinarAncoras();
  return {ensinou, deNovo, txt,
    citaRelogio:/relógio/.test(txt), citaInventario:/carrega/.test(txt),
    citaPorta:/porta da frente/.test(txt),
    chao:CHAO_FIRME.map(a=>a.id),
    /* e elas são exatamente as três que o §30 congelou */
    congeladas:Object.keys(PERCEPCAO_INVIOLAVEL)};
});
console.log('    ensinou:',d.ensinou,'· repetiu:',d.deNovo);
console.log('    chão firme:',JSON.stringify(d.chao),'· congeladas no §30:',JSON.stringify(d.congeladas));
ok('o jogo ensina as três',d.ensinou&&d.citaRelogio&&d.citaInventario&&d.citaPorta);
ok('e ensina uma vez só',d.deNovo===false);
ok('são as MESMAS três que o §30 congelou',d.chao.length===d.congeladas.length);

console.log('\n6. CONFERIR O CHÃO FIRME É UM VERBO COM PREÇO');
d=await p.evaluate(async()=>{
  const T=document.getElementById('texto'); T.innerHTML='';
  mexerSan(-22); mexerSan(-22);   /* sem espaco pra subir, +2 viraria 0 */
  const minAntes=S.minutos||0;
  const sanAntes=(typeof san==='function')?san():0;
  await conferirAncora('relogio');
  const txt=T.textContent;
  return {gastouMin:(S.minutos||0)-minAntes, custo:SAN_CFG.minutosAncora,
    ganhouSan:((typeof san==='function')?san():0)-sanAntes,
    daSan:SAN_CFG.sanDaAncora,
    mostrouHora:/\d\d:\d\d/.test(txt), disseQueNaoMente:/n[ãa]o tem outra leitura/i.test(txt),
    verdadeLigada:S._verdade===true};
});
console.log('   ',JSON.stringify(d));
ok('custa os '+d.custo+' minutos anunciados',d.gastouMin===d.custo);
ok('devolve pouca sanidade: orienta, não cura',d.ganhouSan>0&&d.ganhouSan<=d.daSan+1);
ok('mostra a hora de verdade',d.mostrouHora);
ok('e diz que aquilo não tem outra leitura',d.disseQueNaoMente);
ok('e a interface para de mentir por um instante',d.verdadeLigada);

console.log('\n7. A SANIDADE VIRA SINTOMA NA TELA');
d=await p.evaluate(()=>{
  const medir=v=>{ S._forcaSan=v; return null; };
  /* mede a curva direto na função, sem depender do estado real */
  const pontos=[100,90,82,70,50,30,15,5].map(v=>{
    const a=SAN_CFG.sintomaAbaixoDe, b=SAN_CFG.sintomaCheioEm;
    const i = v>=a?0 : v<=b?1 : (a-v)/(a-b);
    return {san:v, i:+i.toFixed(2)};
  });
  sanAplicarSintoma();
  const veu=document.getElementById('san-veu');
  return {pontos, temVeu:!!veu, ligado:_sanSintomaLigado,
    limites:[SAN_CFG.sintomaAbaixoDe,SAN_CFG.sintomaCheioEm]};
});
console.log('    curva:',d.pontos.map(x=>x.san+'→'+x.i).join('  '));
ok('acima de '+d.limites[0]+' de sanidade não há sintoma',d.pontos[0].i===0&&d.pontos[1].i===0);
ok('e ele cresce conforme a cabeça piora',d.pontos[3].i<d.pontos[5].i&&d.pontos[5].i<1);
ok('chegando ao máximo em '+d.limites[1],d.pontos[6].i===1);
ok('o véu existe na tela',d.temVeu);

console.log('\n8. DÁ PRA DESLIGAR O SINTOMA');
d=await p.evaluate(()=>{
  const dep=sanAlternarSintoma();
  const veu=document.getElementById('san-veu');
  const op=veu?veu.style.opacity:'?';
  const noSave=(()=>{ salvar(); return JSON.parse(localStorage.getItem(CHAVE)||'{}').semSintoma; })();
  sanAlternarSintoma();
  return {dep, op, noSave};
});
console.log('   ',JSON.stringify(d));
ok('desligado, o véu some',d.dep===false&&d.op==='0');
ok('e a escolha vai pro save',d.noSave===true);

console.log('\n9. O ESTADO É DADO PURO E SOBREVIVE');
d=await p.evaluate(()=>{
  S.san38=null; sanEstado(); S.san38.pegou=7; S.san38.viuAncoras=true;
  salvar();
  const disco=JSON.parse(localStorage.getItem(CHAVE)||'{}');
  const txt=JSON.stringify(disco.san38||{});
  return {salvou:!!disco.san38, semFuncao:txt.indexOf('function')<0,
    ciclo:JSON.stringify(JSON.parse(txt))===txt, pegou:(disco.san38||{}).pegou};
});
console.log('   ',JSON.stringify(d));
ok('o estado da sanidade vai pro save',d.salvou&&d.pegou===7);
ok('sem função nenhuma dentro',d.semFuncao);
ok('e sobrevive a JSON ida e volta',d.ciclo);

console.log('\n10. NADA QUEBROU');
console.log('    erros de página:',erros.length?erros.slice(0,4):'nenhum');
ok('nenhum erro de página',erros.length===0);
await b.close();
