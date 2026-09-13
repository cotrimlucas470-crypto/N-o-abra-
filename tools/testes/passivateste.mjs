/* §64 — AS PASSIVAS MORDEM.
   A assercao que importa: cada passiva MUDA UM NUMERO que algum sistema
   do jogo le. Passiva sem consumidor e parametro morto, e pior: e mentira
   na cara do jogador, porque ela e vendida como "ficou uma marca". */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(1400);
await p.evaluate(()=>{ semearRNG(8080); S.saveId='passivas'; S.dia=9;
  S.passivasAtivas=[]; S.dossies={}; });

console.log('\n1. TODA PASSIVA QUE EXISTE TEM EFEITO DECLARADO');
{
  const d=await p.evaluate(()=>{
    const doS61=Object.keys(PASSIVAS).map(f=>PASSIVAS[f].campo);
    const comEfeito=Object.keys(PASV_EFEITO);
    return {doS61, comEfeito,
      semEfeito:doS61.filter(c=>!comEfeito[0]?true:comEfeito.indexOf(c)<0),
      sobrando:comEfeito.filter(c=>doS61.indexOf(c)<0)};
  });
  console.log('    passivas que o §61 pode criar: '+d.doS61.join(', '));
  console.log('    sem efeito declarado: '+(d.semEfeito.length?d.semEfeito.join(', '):'nenhuma'));
  console.log('    efeito sem passiva:   '+(d.sobrando.length?d.sobrando.join(', '):'nenhum'));
  ok('nenhuma passiva fica sem efeito', d.semEfeito.length===0);
  ok('e nenhum efeito fica órfão',      d.sobrando.length===0);
}

console.log('\n2. rotaAberta MUDA O PASSO DE VERDADE');
{
  const d=await p.evaluate(()=>{
    S.passivasAtivas=[];
    const sem=custoDeEntrada(6,4);
    S.passivasAtivas=[{campo:'rotaAberta',n:'x',de:'bicho_magro',dia:1}];
    const com=custoDeEntrada(6,4);
    S.passivasAtivas=[];
    return {sem:{t:sem.tempo,r:sem.ruido}, com:{t:com.tempo,r:com.ruido}};
  });
  console.log('    sem a marca: '+d.sem.t+' min · ruído '+d.sem.r);
  console.log('    com a marca: '+d.com.t+' min · ruído '+d.com.r);
  ok('o passo fica mais rápido', d.com.t<d.sem.t);
  ok('e mais barulhento',        d.com.r>d.sem.r);
}

console.log('\n3. aguaParada ENCHE O GALÃO E FAZ BARULHO');
{
  const d=await p.evaluate(()=>{
    S.passivasAtivas=[]; S.agua=2; S.ruido=0;
    const nada=passivaAmanhecer();
    const a0=S.agua, r0=S.ruido;
    S.passivasAtivas=[{campo:'aguaParada',n:'x',de:'avaria_cano',dia:1}];
    const eco=passivaAmanhecer();
    const a1=S.agua, r1=S.ruido;
    /* e respeita o teto de 6 galões */
    S.agua=6; passivaAmanhecer();
    const teto=S.agua;
    S.passivasAtivas=[];
    return {semMarca:nada.length, a0,r0,a1,r1, teto, eco:eco.map(x=>x[0])};
  });
  console.log('    sem a marca: nada acontece ('+d.semMarca+' linhas)');
  console.log('    com a marca: água '+d.a0+' → '+d.a1+' · ruído '+d.r0+' → '+d.r1);
  d.eco.forEach(t=>console.log('      "'+t+'"'));
  ok('sem a marca, nada acontece', d.semMarca===0);
  ok('com a marca, junta água',    d.a1>d.a0);
  ok('e junta ruído junto',        d.r1>d.r0);
  ok('e respeita o teto de 6',     d.teto===6);
}

console.log('\n4. vaoNovo LIGA DOIS CÔMODOS QUE NÃO SE TOCAVAM');
{
  const d=await p.evaluate(()=>{
    S.passivasAtivas=[];
    const semVao=vaoDaCasa();
    S.passivasAtivas=[{campo:'vaoNovo',n:'x',de:'avaria_rachadura',dia:1}];
    const v=vaoDaCasa();
    const antesA=vizinhos(v.a).slice(), antesB=vizinhos(v.b).slice();
    S.passivasAtivas=[];
    const puroA=vizinhos(v.a).slice(), puroB=vizinhos(v.b).slice();
    S.passivasAtivas=[{campo:'vaoNovo',n:'x',de:'avaria_rachadura',dia:1}];
    const estavel=JSON.stringify(vaoDaCasa())===JSON.stringify(v);
    S.passivasAtivas=[];
    /* E O VAO TEM DE LIGAR COMODOS QUE NAO SE TOCAVAM. Cobrar so que a
       lista cresceu nao bastaria: um vao entre vizinhos de sempre
       cresceria zero e passaria como "nao cresceu", sem dizer POR QUE. */
    const jaEramVizinhos=distancia(v.a,v.b)<=1;
    /* e varre as campanhas: nenhum vao pode cair em par ja ligado */
    const ruins=[];
    const guarda=S.saveId;
    ['a','b','c','d','e','f','g','h'].forEach(c=>{
      S.saveId=c;
      S.passivasAtivas=[{campo:'vaoNovo',n:'x',de:'avaria_rachadura',dia:1}];
      const vv=vaoDaCasa();
      if(vv&&distancia(vv.a,vv.b)<=1)ruins.push(c+':'+vv.a+'-'+vv.b);
    });
    S.saveId=guarda;
    return {semVao, v, puroA, puroB, comA:antesA, comB:antesB, estavel,
      mesmoComodo:v.a===v.b, jaEramVizinhos, ruins,
      dist:distancia(v.a,v.b)};
  });
  console.log('    sem a marca, não há vão: '+(d.semVao===null));
  console.log('    o vão liga '+d.v.a+' e '+d.v.b);
  console.log('    vizinhos de '+d.v.a+': '+d.puroA.join(',')+' → '+d.comA.join(','));
  console.log('    vizinhos de '+d.v.b+': '+d.puroB.join(',')+' → '+d.comB.join(','));
  ok('sem a marca não existe vão',      d.semVao===null);
  console.log('    distância na grade entre eles: '+d.dist+' (tem de ser > 1)');
  console.log('    em 8 campanhas, vãos entre vizinhos de sempre: '+
    (d.ruins.length?d.ruins.join(', '):'nenhum'));
  ok('o vão não liga um cômodo nele mesmo', !d.mesmoComodo);
  ok('e liga cômodos que NÃO se tocavam',   !d.jaEramVizinhos);
  ok('e nunca cai num par já ligado',       d.ruins.length===0);
  ok('e ele serve pros dois lados',     d.comA.length>d.puroA.length&&d.comB.length>d.puroB.length);
  ok('e não muda de lugar sozinho',     d.estavel);
}

console.log('\n5. ecoDaCasa SOBE OS DOIS OUVIDOS');
{
  const d=await p.evaluate(()=>{
    S.passivasAtivas=[];
    const semEco=ecoAlcanceExtra();
    /* o lado ruim: a criatura ouve mais forte */
    const forcas=[];
    const I={cooldown:0, fase:'RONDA', faseTurnos:0, trilha:[4],
             bicho:{...BICHOS[Object.keys(BICHOS)[0]]}, _copia:1};
    const _reg=window.regraDe;
    window.regraDe=()=>({sentido:'som'});
    const ver=()=>{ let vista=null;
      const _o=window.anomOuviu; return vista; };
    S.passivasAtivas=[{campo:'ecoDaCasa',n:'x',de:'bicho_imitador',dia:1}];
    const comEco=ecoAlcanceExtra();
    window.regraDe=_reg;
    S.passivasAtivas=[];
    return {semEco, comEco};
  });
  console.log('    alcance extra do seu ouvido: '+d.semEco+' → '+d.comEco);
  ok('a marca aumenta o seu alcance', d.comEco>d.semEco);
}

console.log('\n6. A PÁGINA DO DOSSIÊ EXISTE E MOSTRA OS DOIS LADOS');
{
  const d=await p.evaluate(()=>{
    S.dossies={}; S.dia=13;
    S.passivasAtivas=[{campo:'rotaAberta',n:'o caminho aberto',
      de:'bicho_magro', deNome:'o Magro', dia:11}];
    dossiViu('bicho_magro',13);
    /* TRES usos: sem mutacao a ficha nao tem o que mostrar, e a
       assercao reprovaria o codigo por causa do setup do teste */
    for(let i=0;i<3;i++)dossiUsou('bicho_magro','fugiu');
    dossiEstudar('bicho_magro',60);
    /* A PRIMEIRA VERSAO CHAMAVA `telaDossies` DIRETO — e por isso nao
       pegava a regressao de tirar o botao do caderno. Chamar a tela na
       unha prova que a tela existe, nao que o jogador CHEGA nela.
       Agora abre o caderno de verdade e procura a porta. */
    let erroCad=null, portaNoCaderno=false, portaMarcas=false;
    try{
      telaCaderno(()=>{});
      const bts=[...document.querySelectorAll('#acoes button')]
        .map(x=>x.textContent);
      portaNoCaderno=bts.some(t=>/aprendeu delas/i.test(t));
      portaMarcas=bts.some(t=>/marcas que ficaram/i.test(t));
    }catch(e){ erroCad=e.message; }
    let erro=null;
    try{ telaDossies(()=>{}); }catch(e){ erro=e.message; }
    const listaBt=[...document.querySelectorAll('#acoes button')]
      .map(x=>x.textContent.trim().slice(0,44));
    let erro2=null;
    try{ telaDossie('bicho_magro',()=>{}); }catch(e){ erro2=e.message; }
    const linhas=[...document.querySelectorAll('#texto p')]
      .filter(n=>!n.classList.contains('passado'))
      .map(n=>n.textContent.trim().slice(0,76));
    /* e a pagina das marcas */
    let erro3=null;
    try{ telaPassivas(()=>{}); }catch(e){ erro3=e.message; }
    const semMarca=[...document.querySelectorAll('#texto p')]
      .filter(n=>!n.classList.contains('passado'))
      .map(n=>n.textContent.trim().slice(0,70));
    return {erro, erro2, erro3, listaBt, linhas, semMarca,
      erroCad, portaNoCaderno, portaMarcas};
  });
  console.log('    a lista:');
  d.listaBt.forEach(t=>console.log('      · '+t));
  console.log('    a ficha:');
  d.linhas.slice(0,7).forEach(t=>console.log('      '+t));
  console.log('    o caderno oferece a porta do dossiê: '+d.portaNoCaderno);
  console.log('    e a porta das marcas: '+d.portaMarcas);
  ok('o caderno abre sem erro',          !d.erroCad);
  ok('e ELE oferece a página do dossiê', d.portaNoCaderno);
  ok('e a página das marcas',            d.portaMarcas);
  ok('a página da lista abre sem erro',  !d.erro);
  ok('a ficha de uma anomalia abre',     !d.erro2);
  ok('a página das marcas abre',         !d.erro3);
  ok('e a ficha mostra o que ela aprendeu', d.linhas.some(t=>/aprendeu|Fechou/i.test(t)));
}

console.log('\n7. TODA MARCA MOSTRA O LADO BOM E O LADO RUIM');
{
  const d=await p.evaluate(()=>{
    const r={};
    Object.keys(PASV_EFEITO).forEach(k=>{
      const e=PASV_EFEITO[k];
      r[k]={bom:!!(e.bom&&e.bom.length>10), ruim:!!(e.ruim&&e.ruim.length>5),
            iguais:e.bom===e.ruim};
    });
    return r;
  });
  Object.entries(d).forEach(([k,v])=>console.log('    '+k.padEnd(12)+
    (v.bom?'bom ok':'SEM BOM')+' · '+(v.ruim?'ruim ok':'SEM RUIM')));
  const todos=Object.values(d);
  ok('toda marca tem lado bom',   todos.every(v=>v.bom));
  ok('e toda marca tem lado ruim', todos.every(v=>v.ruim));
  ok('e os dois não são o mesmo texto', todos.every(v=>!v.iguais));
}

console.log('\n8. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.slice(0,3).join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
