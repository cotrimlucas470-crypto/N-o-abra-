/* §48 — A TERCEIRA GRAFIA: decisões de gameplay de volta ao gerador.

   A v66 trocou `sortear` e `chance` pelo gerador semeado e varreu 71
   sítios diretos. Ela NÃO pegou `Math.floor(Math.random()*n)`, que
   decide a mesma coisa com outra cara — em três casos o sítio semeado e
   o não-semeado estavam na MESMA LINHA.

   Este harness prova duas coisas diferentes, e as duas importam:
     1. que as decisões PASSAM pelo gerador (espião em `_ale`);
     2. que a mesma semente devolve a mesma partida (reprodução). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Rng'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

/* espião: conta quantas vezes o gerador da partida foi consultado */
await p.evaluate(()=>{
  window.__base_ale=_ale;
  window.__n=0;
  window._ale=function(){ window.__n++; return window.__base_ale(); };
  window.__espiar=(fn)=>{ const a=window.__n; try{fn();}catch(e){ window.__erro=String(e).slice(0,90); }
    return window.__n-a; };
  window.__semear=(s)=>{ S.rng=criarRNG(s>>>0); S.rngEstado=undefined; };
});

console.log('\n1. AS PRIMITIVAS NOVAS EXISTEM E PASSAM PELO GERADOR');
{
  const d=await p.evaluate(()=>({
    temInteiro:typeof _inteiro==='function',
    temEmbaralhar:typeof _embaralhar==='function',
    usosInteiro:__espiar(()=>{for(let i=0;i<10;i++)_inteiro(5);}),
    usosEmbaralhar:__espiar(()=>_embaralhar([1,2,3,4,5,6])),
    faixa:(()=>{const v=[];for(let i=0;i<400;i++)v.push(_inteiro(3));
      return {min:Math.min(...v),max:Math.max(...v),distintos:new Set(v).size};})()
  }));
  console.log('    _inteiro(3) em 400 tiros: '+JSON.stringify(d.faixa));
  ok('_inteiro existe',                         d.temInteiro);
  ok('_embaralhar existe',                      d.temEmbaralhar);
  ok('_inteiro consulta o gerador toda vez',    d.usosInteiro===10);
  ok('_embaralhar também',                      d.usosEmbaralhar===5);
  ok('e a faixa é [0,n) como Math.floor era',   d.faixa.min===0&&d.faixa.max===2&&d.faixa.distintos===3);
}

console.log('\n2. O EMBARALHAMENTO É UM DE VERDADE');
{
  /* `sort(()=>Math.random()-.5)` nao e embaralhamento: o comparador nao
     e consistente e a ordem sai enviesada. Aqui a ordem e um tell.

     SOBRE O TAMANHO DA AMOSTRA: a primeira versao deste teste usava
     N=3000 com limite de 12%. Com 5 caixas isso da sigma relativo de
     3,65%, ou seja o limite ficava a 3,3 sigma — e o teste falhou uma
     vez sem que nada estivesse errado. Medido a 200 mil tiros, o desvio
     real e 1,01%. Com N=40000 o sigma relativo cai pra 0,9% e o limite
     de 4% vira 4,5 sigma: aperta mais E para de piscar. */
  const d=await p.evaluate(()=>{
    const N=40000, pos=[0,0,0,0,0];
    for(let i=0;i<N;i++) pos[_embaralhar([0,1,2,3,4]).indexOf(0)]++;
    const perdeu=(()=>{ for(let i=0;i<500;i++){
      const a=_embaralhar([1,2,3,4,5,6,7,8]);
      if(a.slice().sort((x,y)=>x-y).join()!=='1,2,3,4,5,6,7,8')return true; } return false; })();
    /* as 120 permutacoes de 5 elementos tem de aparecer TODAS */
    const vistas=new Set();
    for(let i=0;i<40000;i++) vistas.add(_embaralhar([0,1,2,3,4]).join(''));
    const esperado=N/5, desvio=Math.max(...pos.map(x=>Math.abs(x-esperado)/esperado));
    return {pos, desvio:+desvio.toFixed(4), perdeu, permutacoes:vistas.size};
  });
  console.log('    o 1º item caiu em cada posição: '+JSON.stringify(d.pos)+' · desvio máx '+(d.desvio*100).toFixed(2)+'%');
  console.log('    permutações distintas vistas: '+d.permutacoes+' de 120');
  ok('nenhum elemento se perde nem se duplica', d.perdeu===false);
  ok('toda posição é igualmente provável',      d.desvio<0.04);
  ok('e as 120 permutações saem',               d.permutacoes===120);
}

console.log('\n3. AS 11 DECISÕES PASSARAM A CONSULTAR O GERADOR');
{
  const d=await p.evaluate(()=>{
    const v={tipo:'humano',mimico:false,sinais:[]};
    const r={};
    r.batidaDe   = __espiar(()=>{ const x={tipo:'humano',mimico:true,sinais:[]}; batidaDe(x); });
    r.paciencia  = __espiar(()=>{ const x={tipo:'humano',mimico:false}; paciencia(x); });
    r.sortearPesado = (typeof sortearPesado==='function')
      ? __espiar(()=>sortearPesado([{trilho:'a'},{trilho:'b'},{trilho:'c'}])) : -1;
    return {r, erro:window.__erro||null};
  });
  console.log('    consultas ao gerador: '+JSON.stringify(d.r));
  ok('batidaDe (o padrão da batida é um tell)', d.r.batidaDe>=1);
  ok('paciencia (quanto o visitante espera)',   d.r.paciencia>=1);
  ok('sortearPesado (qual ilusão sai)',         d.r.sortearPesado>=1);
}
{
  /* estes moram em funcoes grandes; conferimos pelo TEXTO do fonte, que
     e o que a 5a trava de build tambem checa — mas aqui com o arquivo
     montado que o navegador carregou de verdade. */
  const d=await p.evaluate(async()=>{
    const txt=await (await fetch('/index.html')).text();
    const acha=(re)=>re.test(txt);
    return {
      atirar:      acha(/if\(_ale\(\)>conf\)\{ e\.travada=true/),
      cego:        acha(/S\.cegoDaNoite=\[sortear\(cegos\)\]/),
      vasculhar:   acha(/const q=1\+_inteiro\(3\)/),
      roubaComida: acha(/1\+_inteiro\(2\)\);S\.comida-=q/),
      roubaDiesel: acha(/2\+_inteiro\(4\)\);S\.diesel-=q/),
      fuga:        acha(/restam:v\.min\+_inteiro\(v\.max-v\.min\+1\)/),
      mochila:     acha(/quando:S\.dia\+2\+_inteiro\(4\)/),
      rua:         acha(/const n=3\+_inteiro\(2\)/),
      escuta:      acha(/_embaralhar\(p\.op\.slice\(\)\)/),
      /* e o que NAO pode mais existir */
      sobrouArma:  acha(/Math\.random\(\)>conf/),
      sobrouCego:  acha(/cegos\[Math\.floor\(Math\.random/)
    };
  });
  console.log('    '+JSON.stringify(d));
  ok('a arma travar usa o gerador',              d.atirar&&!d.sobrouArma);
  ok('o sentido cego da noite usa o gerador',    d.cego&&!d.sobrouCego);
  ok('quanto material você acha',                d.vasculhar);
  ok('quanto o ladrão leva de comida e diesel',  d.roubaComida&&d.roubaDiesel);
  ok('quantos turnos a fuga dura',               d.fuga);
  ok('quando a mochila perdida volta',           d.mochila);
  ok('quantas casas tem na rua',                 d.rua);
  ok('a ordem das opções da escuta',             d.escuta);
}

console.log('\n4. A MESMA SEMENTE DEVOLVE A MESMA PARTIDA');
{
  const d=await p.evaluate(()=>{
    const rodada=()=>{
      __semear(20260905);
      const saida=[];
      for(let i=0;i<40;i++) saida.push(_inteiro(6));
      saida.push(_embaralhar([1,2,3,4,5]).join(''));
      const x={tipo:'humano',mimico:true,sinais:[]}; saida.push(batidaDe(x));
      const y={tipo:'silente',mimico:false}; saida.push(paciencia(y));
      return saida.join('|');
    };
    const a=rodada(), b2=rodada();
    __semear(1);           const c=(()=>{const s=[];for(let i=0;i<40;i++)s.push(_inteiro(6));return s.join('|');})();
    __semear(20260905);    const e=(()=>{const s=[];for(let i=0;i<40;i++)s.push(_inteiro(6));return s.join('|');})();
    return {igual:a===b2, sementeOutraDifere:c!==e, amostra:a.slice(0,44)};
  });
  console.log('    amostra: '+d.amostra+'…');
  ok('duas rodadas da mesma semente são idênticas', d.igual===true);
  ok('e outra semente dá outra partida',            d.sementeOutraDifere===true);
}

console.log('\n5. E SOBREVIVE A UMA RECARGA DE VERDADE');
{
  /* DUAS VERSOES ANTERIORES DESTA SECAO ESTAVAM ERRADAS, e as duas do
     mesmo jeito: mediam DEPOIS do boot.

       1a: comparava o estado do gerador salvo com o estado apos a
           recarga e 21s de jogo. Claro que tinha andado: o boot consome
           sorteios, e deve consumir.
       2a: comparava com o valor em localStorage DEPOIS do boot. Também
           tinha mudado — porque o jogo salva de novo enquanto joga, que
           também é correto.

     Nas duas o teste acusava o jogo de um bug que era do teste. A
     propriedade que importa acontece num instante só: o instante em que
     `carregar()` roda. Então a sonda entra ANTES da página, espera
     `carregar` existir, e fotografa os dois lados da restauração. */
  const antes=await p.evaluate(()=>{
    __semear(777001);
    for(let i=0;i<17;i++)_inteiro(9);
    S.rngEstado=rngEstadoPuro();
    salvar();
    const cru=JSON.parse(localStorage.getItem(CHAVE)||'{}');
    const clone=criarRNG(1); clone.estado=S.rngEstado>>>0;
    const prev=[]; for(let i=0;i<8;i++)prev.push(clone.inteiro(9));
    return {estado:S.rngEstado, gravado:cru.rngEstado, previsto:prev.join('')};
  });
  console.log('    salvo: '+antes.estado+' · gravado no localStorage: '+antes.gravado);
  ok('salvar() grava o estado do gerador',      antes.gravado===antes.estado);

  /* POR QUE NAO HA GANCHO EM `carregar()` AQUI.
     Tentei tres. O ultimo instalava uma sonda antes da pagina e esperava
     `carregar` existir — e nunca armou a tempo: o index.html tem 2,8 MB,
     o parse segura a thread, e `carregar()` roda antes de qualquer
     polling alcancar. Medido: a sonda so ficou pronta 12,5s depois do
     boot, com a carga ja feita.

     A propriedade se prova sem gancho, em duas medidas diretas:
       (a) no INSTANTE ZERO da pagina nova, antes de qualquer script do
           jogo rodar, o localStorage tem o que a sessao anterior gravou;
       (b) `carregar()` restaura o gerador a partir desse numero. */

  /* (a) o numero existe no armazenamento antes de a pagina viver.
     Nao da pra exigir que seja o MESMO que eu acabei de gravar: o jogo
     continua vivo entre o `salvar()` e o `reload()`, e salvar de novo e
     comportamento certo. O que se exige e que exista e seja um numero. */
  await p.addInitScript(()=>{
    try{ window.__aoNascer=JSON.parse(localStorage.getItem('naoabra_v5')||'{}').rngEstado; }
    catch(e){ window.__aoNascer=null; }
  });
  await p.reload(); await p.waitForTimeout(1200);
  const nasceu=await p.evaluate(()=>window.__aoNascer);
  console.log('    no instante zero da página nova, o save já trazia: '+nasceu);
  ok('o estado do gerador atravessa a recarga', typeof nasceu==='number'&&nasceu>0);

  await p.click('#btn-boot'); await p.waitForTimeout(1300);
  {const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1200);}}
  await p.waitForTimeout(9000);

  /* (b) o caminho de restauracao, exercitado de verdade */
  const d=await p.evaluate((esperado)=>{
    const cru=JSON.parse(localStorage.getItem(CHAVE)||'{}');
    cru.rngEstado=esperado>>>0;                    /* planta o numero salvo */
    localStorage.setItem(CHAVE,JSON.stringify(cru));
    S.rng=criarRNG(999);                           /* suja o gerador de proposito */
    const sujo=rng().estado>>>0;
    carregar();                                    /* o caminho real de carga */
    const apos=rng().estado>>>0;
    const saida=[]; for(let i=0;i<8;i++)saida.push(_inteiro(9));
    return {sujo, apos, restaurou:apos===(esperado>>>0), reproduzido:saida.join('')};
  }, antes.estado);
  console.log('    gerador sujo em '+d.sujo+' → depois de carregar(): '+d.apos);
  console.log('    sequência prevista antes: '+antes.previsto+' · reproduzida depois: '+d.reproduzido);
  ok('carregar() aplica o estado no gerador vivo', d.restaurou===true);
  ok('e a sequência seguinte é a mesma',           d.reproduzido===antes.previsto);
}

console.log('\n6. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
