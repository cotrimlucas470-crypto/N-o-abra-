/* v66 — os consertos. Cada asserção prova UM bug morto. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
const abrir=async()=>{
  await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
  await p.click('#btn-boot'); await p.waitForTimeout(1300);
  {const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
  const nm=await p.$('#nm');
  if(nm){ await p.fill('#nm','Conserto'); await p.click('#go'); await p.waitForTimeout(700);
    if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
      fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
      await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
  await p.waitForTimeout(21000);
};
await abrir();

console.log('\n1. AS PRIMITIVAS DE DECISAO PASSAM PELO RNG SEMEADO');
{
  const d=await p.evaluate(()=>{
    const fonte={sortear:String(sortear), chance:String(chance)};
    /* mesma semente, mesma sequencia */
    /* a semente entra POR PARAMETRO. Na primeira versao deste teste o
       `seq()` resetava pra 12345 la dentro, entao a comparacao de
       "semente diferente" comparava a mesma semente com ela mesma e
       falhava por construcao. */
    const seq=s=>{ rng().estado=s;
      return Array.from({length:24},()=>sortear([0,1,2,3,4,5,6,7,8,9])).join(''); };
    const a=seq(12345), b2=seq(12345), c=seq(999);
    /* chance() e uniforme? */
    rng().estado=7; let n=0; for(let i=0;i<4000;i++) if(chance(.3))n++;
    return {fonte, a, b2, c, taxa:n/4000};
  });
  ok('sortear nao usa mais Math.random', !/Math\.random/.test(d.fonte.sortear));
  ok('chance nao usa mais Math.random',  !/Math\.random/.test(d.fonte.chance));
  ok('a mesma semente da a mesma sequencia', d.a===d.b2);
  console.log('    '+d.a);
  ok('semente diferente da sequencia diferente', d.a!==d.c);
  ok('chance(.3) continua ~30% ('+(d.taxa*100).toFixed(1)+'%)', Math.abs(d.taxa-.3)<.03);
}

console.log('\n2. PERSISTENCIA: O QUE MORRIA NUM RECARREGAMENTO');
{
  const antes=await p.evaluate(()=>{
    S.abrigo=PESSOAS.slice(0,4).map(x=>({...x,moral:60,lacos:{},doente:0,local:4}));
    S.dia=12;
    S.tarefas={}; S.abrigo.forEach((x,i)=>S.tarefas[x.n]=['porta','cozinha','agua','vigia'][i]);
    S.objetivos=[{dono:'Rafael',n:'a foto na oficina do pai',local:'ferrovelho',feito:false,ignorado:4}];
    S.vigiou={tipo:'monstro'};
    S.infiltrado=S.abrigo[1]; S.infiltrado.falso=true; S.infiltradoDesde=10;
    salvar();
    return {tarefas:Object.keys(S.tarefas).length, objetivos:S.objetivos.length,
      ignorado:S.objetivos[0].ignorado, vigiou:!!S.vigiou, inf:S.infiltrado.n};
  });
  await p.reload(); await p.waitForTimeout(1400);
  {const x=await p.$('#btn-voltar')||await p.$('#btn-boot'); if(x)await x.click();}
  await p.waitForTimeout(2600);
  const dep=await p.evaluate(()=>{
    carregar();
    return {tarefas:Object.keys(S.tarefas||{}).length, objetivos:(S.objetivos||[]).length,
      ignorado:(S.objetivos&&S.objetivos[0]||{}).ignorado, vigiou:!!S.vigiou,
      inf:S.infiltrado?S.infiltrado.n:null,
      infNoAbrigo:!!(S.infiltrado&&S.abrigo.includes(S.infiltrado))};
  });
  console.log('    antes  '+JSON.stringify(antes));
  console.log('    depois '+JSON.stringify(dep));
  ok('as tarefas do dia sobrevivem',            dep.tarefas===antes.tarefas);
  ok('os objetivos sobrevivem',                 dep.objetivos===antes.objetivos);
  ok('e o contador `ignorado` junto',           dep.ignorado===antes.ignorado);
  ok('o que o vigia viu sobrevive',             dep.vigiou===true);
  ok('o infiltrado volta pelo nome',            dep.inf===antes.inf);
  ok('e volta como objeto DO abrigo',           dep.infNoAbrigo===true);
}

console.log('\n3. AS TRES HABILIDADES QUE PROMETIAM E NAO FAZIAM');
{
  const d=await p.evaluate(()=>{
    const semNinguem=()=>{S.abrigo=[];};
    const com=h=>{S.abrigo=[{...PESSOAS.find(x=>x.hab===h),moral:60,lacos:{},doente:0,local:4}];};
    const l={comida:[2,2],diesel:[4,4],id:'x'};
    /* escalada: +25% */
    semNinguem(); const base=ajusteRecurso(l);
    com('escalada');  const esc=ajusteRecurso(l);
    /* corrida: menos ruido, e SO com expedicao aberta */
    semNinguem(); S.exped=null; S.ruido=0; gastarRuido(9); const rSem=S.ruido;
    com('corrida'); S.exped={ativa:1}; S.ruido=0; gastarRuido(9); const rExp=S.ruido;
    com('corrida'); S.exped=null;      S.ruido=0; gastarRuido(9); const rCasa=S.ruido;
    /* costura: a tabua remendada */
    S.exped=null;
    semNinguem(); S.porta={reforco:3,tranca:false,olho:false,dano:0}; perderReforco(1);
    const semNice=S.porta.reforco;
    com('costura'); S.porta={reforco:3,tranca:false,olho:false,dano:0}; perderReforco(1);
    const comNice=S.porta.reforco;
    /* e a tabua que o JOGADOR arranca de proposito continua saindo */
    com('costura'); S.porta={reforco:3,tranca:false,olho:false,dano:0};
    const tirou=(typeof desmontar==='function')?null:S.porta.reforco;
    return {base:base.comida, esc:esc.comida, rSem, rExp, rCasa, semNice, comNice, tirou};
  });
  console.log('    '+JSON.stringify(d));
  ok('escalada rende 25% a mais, como a ficha diz', Math.abs(d.esc/d.base-1.25)<.001);
  ok('corrida faz menos ruido na expedicao',        d.rExp<d.rSem);
  ok('e nao muda nada dentro de casa',              d.rCasa===d.rSem);
  ok('sem a Nice a tabua cai',                      d.semNice===2);
  ok('com a Nice o reforco nao se perde',           d.comNice===3);
}

console.log('\n4. VAZAMENTOS E ESTADO INVALIDO');
{
  const d=await p.evaluate(()=>{
    /* objetivo orfao: o dono saiu do abrigo */
    S.abrigo=PESSOAS.slice(0,2).map(x=>({...x,moral:60,lacos:{},doente:0,local:4}));
    S.objetivos=[{dono:'NinguemAqui',n:'coisa',local:'x',feito:false,ignorado:0}];
    cobrarObjetivos(); cobrarObjetivos();
    const orfao=S.objetivos.filter(o=>!o.feito).length;
    /* local invalido durante a partida */
    S.abrigo=PESSOAS.slice(0,3).map(x=>({...x,moral:60,lacos:{},doente:0,local:99}));
    espalharGente();
    const somem=S.abrigo.filter(x=>!PLANTA[x.local]).length;
    return {orfao, somem};
  });
  ok('objetivo sem dono encerra, nao vaza',  d.orfao===0);
  ok('ninguem fica com local fora da planta', d.somem===0);
}

console.log('\n5. OS PARAMETROS MORTOS');
{
  const d=await p.evaluate(()=>{
    /* p.mem: a rotina saudade existe e usa o campo */
    const sd=ROTINAS.find(r=>r.id==='saudade');
    const pes={...PESSOAS[0],moral:60,lacos:{},doente:0,local:4};
    const txt=sd?sd.faz(pes):null;
    const usaMem=!!(txt&&txt.includes(pes.mem));
    /* saudade nao pede nada da casa: vale na casa calma */
    S.abrigo=[pes]; S.comida=0; S.agua=0; S.mortos=[];
    const alcanca=[10,30,50,70,90].map(m=>{ pes.moral=m;
      return ROTINAS.filter(r=>m>=r.moral[0]&&m<=r.moral[1]&&(!r.precisa||r.precisa(pes))).length; });
    /* p.escondeu: agora tem consequencia */
    const q={...PESSOAS[1],moral:20,lacos:{},doente:0,local:4,escondeu:2};
    S.abrigo=[q]; S.comida=9;
    const esc=ROTINAS.find(r=>r.id==='esconde');
    const t2=esc.faz(q);
    S.comida=0; const antesC=S.comida;
    morreuAlguem(q,'teste');
    return {usaMem, mem:pes.mem, alcanca, achou:!!(t2&&t2.includes('embaixo do colchão')),
      voltou:S.comida-antesC, zerou:q.escondeu};
  });
  console.log('    '+JSON.stringify(d));
  ok('p.mem deixou de ser morto: a saudade usa o campo', d.usaMem);
  ok('e vale em toda faixa de moral, sem pedir nada',    d.alcanca.every(n=>n>=1));
  console.log('    rotinas alcancaveis na casa calma por moral 10/30/50/70/90: '+d.alcanca.join(' · '));
  ok('o terceiro desvio de lata e descoberto',           d.achou);
  ok('e o que foi escondido volta pra casa',             d.voltou===3);
  ok('o esconderijo zera junto',                         d.zerou===0);
}

console.log('\n6. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
