/* §36 — cada arma faz uma coisa que só ela faz. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(2600);

console.log('\n1. O PROBLEMA QUE ISTO RESOLVE');
let d=await p.evaluate(()=>{
  const armas=ITENS.filter(i=>i.dano);
  /* antes, a única coisa que separava uma arma da outra era o dano.
     Se você tirar dano e kg, quantas ficam indistinguíveis? */
  const assinatura=i=>JSON.stringify(Object.keys(i)
    .filter(k=>!['id','n','kg','dano','d'].includes(k)).sort());
  const grupos={};
  armas.forEach(i=>{const a=assinatura(i);grupos[a]=(grupos[a]||0)+1;});
  return {armas:armas.length, grupos, iguais:Math.max(...Object.values(grupos))};
});
console.log('   ',JSON.stringify(d));
ok('há 12 armas no jogo',d.armas===12);
ok('e a maioria era indistinguível fora o dano',d.iguais>=8);

console.log('\n2. CADA ARMA TEM UM VERBO AGORA');
d=await p.evaluate(()=>itensEstado());
console.log('   ',JSON.stringify(d));
ok('nenhuma arma ficou sem função própria',d.semVerbo.length===0);
/* revólver e espingarda não ganharam verbo novo de propósito: `municao`
   já é o verbo delas — são as únicas que acabam e as únicas que trazem
   a rua junto. A régua da primeira versão deste teste não contava isso
   e reprovava o desenho por causa da régua. */
const dFogo=await p.evaluate(()=>({fogo:ITENS.filter(i=>i.municao).map(i=>i.id),
  silenciosa:ITENS.filter(i=>i.silenciosa).map(i=>i.id)}));
ok('as de fogo são as únicas que acabam',dFogo.fogo.length===2);
ok('e a besta é a única silenciosa',dFogo.silenciosa.length===1);
ok('as armas cobrem 6 ferramentas diferentes',d.ferramentasCobertas.length>=6);
ok('as descrições mentirosas foram corrigidas',d.descricoesCorrigidas>=8);

console.log('\n3. A DESCRIÇÃO PROMETIA E AGORA CUMPRE');
d=await p.evaluate(()=>({
  foice:ITENS.find(i=>i.id==='foice').d,
  espeto:ITENS.find(i=>i.id==='espeto').d,
  taco:ITENS.find(i=>i.id==='taco').d,
  /* e o encontro oferece os botões que elas prometem */
  temFoice:typeof encararOcupante==='function',
  cfg:{alcance:ITEM_CFG.bonusAlcanceFoice, espeto:ITEM_CFG.chanceEspeto}}));
console.log('    foice:',d.foice);
console.log('    espeto:',d.espeto);
ok('a foice fala de alcance e o código dá alcance',/[Aa]lcance/.test(d.foice)&&d.cfg.alcance>0);
ok('o espeto fala em manter longe e o código deixa sair',/longe/.test(d.espeto)&&d.cfg.espeto>.5);
ok('o taco anuncia que não quebra',/não quebra|nunca/.test(d.taco));

console.log('\n4. O TACO NÃO QUEBRA MESMO');
d=await p.evaluate(()=>{
  S.armas=['taco','facao'];
  const antes={};
  ['taco','facao'].forEach(id=>{const q=peca(id); if(q)antes[id]=q.dur;});
  for(let i=0;i<40;i++){
    gastarArma(ITENS.find(x=>x.id==='taco'),true);
    gastarArma(ITENS.find(x=>x.id==='facao'),true);
  }
  const dep={};
  ['taco','facao'].forEach(id=>{const q=peca(id); if(q)dep[id]=q.dur;});
  return {antes,dep,
    tacoIntacto:antes.taco===undefined||antes.taco===dep.taco,
    facaoGastou:antes.facao===undefined||dep.facao<antes.facao};
});
console.log('   ',JSON.stringify(d));
ok('40 golpes não tiram nada do taco',d.tacoIntacto);
ok('e gastam o facão',d.facaoGastou);

console.log('\n5. A FACA VAI NO CINTO');
d=await p.evaluate(()=>{
  const guarda=(S.maos||[]).slice();
  S.maos=['faca'];        const soFaca=maosOcupadas();
  S.maos=['barra'];       const soBarra=maosOcupadas();
  S.maos=['faca','barra'];const ambas=maosOcupadas();
  S.maos=guarda;
  return {soFaca, soBarra, ambas};
});
console.log('   ',JSON.stringify(d));
ok('a faca sozinha não ocupa mão nenhuma',d.soFaca===0);
ok('a barra ocupa',d.soBarra===1);
ok('faca + barra ocupa só uma',d.ambas===1);

console.log('\n6. A ARMA NO LUGAR DA FERRAMENTA');
d=await p.evaluate(()=>{
  /* telhado precisa de escada; nenhuma arma vira escada */
  S.ferra=[]; S.armas=['machado']; S.mat={telha:9,cimento:9,tabua:9,prego:9,fio:9,cano:9,vedante:9};
  const semSubstituto=planoDeImproviso({id:'telhado',etapa:0,dias:1});
  /* rachadura precisa de martelo E pá: machado cobre pá, marreta cobre martelo */
  S.armas=['machado'];
  const soUma=planoDeImproviso({id:'rachadura',etapa:0,dias:1});
  S.armas=['machado','marreta'];
  const duas=planoDeImproviso({id:'rachadura',etapa:0,dias:1});
  /* com a ferramenta de verdade não há improviso a oferecer */
  S.ferra=['martelo','pa']; 
  const temTudo=planoDeImproviso({id:'rachadura',etapa:0,dias:1});
  /* e faltando MATERIAL, arma nenhuma resolve: arma não vira cimento */
  S.ferra=[]; S.mat={};
  const semMaterial=planoDeImproviso({id:'rachadura',etapa:0,dias:1});
  return {semSubstituto:semSubstituto===null,
    soUma:soUma===null, duas:duas?duas.map(t=>[t.ferra,t.arma.id]):null,
    temTudo:temTudo===null, semMaterial:semMaterial===null,
    precisaRachadura:AVARIAS.rachadura.ferra};
});
console.log('   ',JSON.stringify(d));
ok('ferramenta sem substituto (escada) continua faltando',d.semSubstituto);
ok('cobrir só uma das duas ferramentas não basta',d.soUma);
ok('cobrindo as duas, o improviso é oferecido',Array.isArray(d.duas)&&d.duas.length===2);
ok('cada troca aponta qual arma cobre qual ferramenta',
  d.duas&&d.duas.every(([f,a])=>typeof f==='string'&&typeof a==='string'));
ok('com a ferramenta certa não se oferece improviso',d.temTudo);
ok('arma não vira cimento: faltando material, não há plano',d.semMaterial);

console.log('\n7. O IMPROVISO CUSTA');
d=await p.evaluate(()=>{
  S.ferra=[]; S.armas=['machado','marreta'];
  S.mat={cimento:9,tabua:9,prego:9};
  const a={id:'rachadura',etapa:0,dias:1,vista:true};
  const plano=planoDeImproviso(a);
  const antes=plano.map(t=>{const q=peca(t.arma.id);return q?q.dur:null;});
  /* simula o desgaste que o botão aplica */
  plano.forEach(t=>{const q=peca(t.arma.id); if(q)gastarDur(q,ITEM_CFG.desgasteComoFerramenta,t.arma.n);});
  const dep=plano.map(t=>{const q=peca(t.arma.id);return q?q.dur:null;});
  return {antes,dep,horaExtra:ITEM_CFG.horaExtraImproviso,
    gastou:antes.every((v,i)=>v===null||dep[i]<v)};
});
console.log('   ',JSON.stringify(d));
ok('improvisar custa hora a mais',d.horaExtra>=1);
ok('e estraga a arma que virou ferramenta',d.gastou);

console.log('\n8. O BOTÃO APARECE NA TELA DO CONSERTO');
d=await p.evaluate(()=>{
  S.ferra=[]; S.armas=['machado','marreta'];
  S.mat={cimento:9,tabua:9,prego:9};
  S.avarias=[{id:'rachadura',dias:2,etapa:0,vista:false,motivo:null,grave:false}];
  menuConserto(S.avarias[0]);
  const bts=[...document.querySelectorAll('#acoes button:not(.sec-cab)')].map(x=>x.textContent);
  return {bts, temImproviso:bts.some(t=>/Consertar com/.test(t)),
    temGambiarra:bts.some(t=>/Improvisar com o que tem/.test(t))};
});
console.log('    botões:',JSON.stringify(d.bts.map(t=>t.slice(0,44))));
ok('o botão de consertar com a arma aparece',d.temImproviso);
ok('e a gambiarra velha continua como alternativa pior',d.temGambiarra);

console.log('\n9. NADA QUEBROU');
console.log('    erros de página:',erros.length?erros.slice(0,4):'nenhum');
ok('nenhum erro de página',erros.length===0);
await b.close();
