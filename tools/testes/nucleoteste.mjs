/* FASE 1 — vocabulário canônico: RNG, schema, máquina de estados, âncoras. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8900/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','N'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);

console.log('\n1. RNG DETERMINÍSTICO');
let d=await p.evaluate(()=>{
  const a=criarRNG(12345), c=criarRNG(12345), e=criarRNG(99);
  const sa=[],sc=[],se=[];
  for(let i=0;i<200;i++){sa.push(a.next());sc.push(c.next());se.push(e.next());}
  /* distribuição: média perto de .5, e cobre os dez decis */
  const media=sa.reduce((x,y)=>x+y,0)/sa.length;
  const decis=new Set(sa.map(x=>Math.floor(x*10))).size;
  return {iguais:JSON.stringify(sa)===JSON.stringify(sc),
    diferentes:JSON.stringify(sa)!==JSON.stringify(se),
    media:+media.toFixed(3), decis,
    min:+Math.min(...sa).toFixed(4), max:+Math.max(...sa).toFixed(4),
    escolher:criarRNG(7).escolher(['a','b','c'])===criarRNG(7).escolher(['a','b','c']),
    pesado:criarRNG(7).pesado({x:1,y:0})==='x',
    vazio:criarRNG(1).escolher([])};
});
console.log('   ',JSON.stringify(d));
ok('mesma semente dá a mesma sequência',d.iguais);
ok('sementes diferentes dão sequências diferentes',d.diferentes);
ok('a distribuição cobre os dez decis',d.decis===10);
ok('a média fica perto de 0,5',Math.abs(d.media-.5)<.06);
ok('nunca sai fora de [0,1)',d.min>=0&&d.max<1);
ok('escolher() é determinístico',d.escolher);
ok('pesado() nunca devolve peso zero',d.pesado);
ok('lista vazia não quebra',d.vazio===null);

console.log('\n2. A SEMENTE VEM DE saveId + NOITE E VAI PRO SAVE');
d=await p.evaluate(()=>{
  S.saveId=null; S.dia=3; semearRNG();
  const s3=S.rngSemente;
  S.dia=4; semearRNG();
  const s4=S.rngSemente;
  S.dia=3; semearRNG();
  const s3b=S.rngSemente;
  salvarAgora();
  const disco=JSON.parse(localStorage.getItem(CHAVE)||'{}');
  return {s3,s4,s3b, mesmaNoiteMesmaSemente:s3===s3b, noiteMudaSemente:s3!==s4,
    salvouId:!!disco.saveId, salvouSemente:typeof disco.rngSemente==='number',
    salvouEstado:typeof disco.rngEstado==='number',
    rngNaoVaiSerializado:disco.rng===undefined};
});
console.log('   ',JSON.stringify(d));
ok('a mesma noite dá a mesma semente',d.mesmaNoiteMesmaSemente);
ok('outra noite dá outra semente',d.noiteMudaSemente);
ok('saveId, semente e estado vão pro save',d.salvouId&&d.salvouSemente&&d.salvouEstado);
ok('o objeto rng (com funções) NÃO vai pro save',d.rngNaoVaiSerializado);

console.log('\n3. REPLAY REPRODUZ IDÊNTICO');
d=await p.evaluate(()=>{
  window.__sorteio=()=>rng().inteiro(1000);
  const acoes=[{fn:'__sorteio'},{fn:'__sorteio'},{fn:'__sorteio'},{fn:'__sorteio'}];
  const a=S.debug.replay(4242,acoes);
  const c=S.debug.replay(4242,acoes);
  const e=S.debug.replay(777,acoes);
  return {iguais:JSON.stringify(a.saida)===JSON.stringify(c.saida),
    diferentes:JSON.stringify(a.saida)!==JSON.stringify(e.saida),
    estadoIgual:a.estadoFinal===c.estadoFinal,
    valores:a.saida.map(x=>x.valor),
    funcaoInexistente:S.debug.replay(1,[{fn:'nao_existe'}]).saida[0].ok};
});
console.log('   ',JSON.stringify(d));
ok('replay com a mesma semente dá a mesma saída',d.iguais&&d.estadoIgual);
ok('semente diferente dá saída diferente',d.diferentes);
ok('função inexistente não quebra o replay',d.funcaoInexistente===false);

console.log('\n4. SCHEMA: ANOMALIA SEM TELL É REJEITADA');
d=await p.evaluate(()=>{
  const base={id:'t1',nome:'T',categoria:'sonora',raridade:2,peso:5,
    precondicoes:[],incompativelCom:[],requerCriatura:null,duracaoTurnos:[1,3],
    tell:{tipo:'x',intensidade:.5,turnosAntes:1},resolucoes:['a'],custoErro:.2,
    consequencia(){},cicatriz:false,pesoMemoria:.1,versao:1};
  const r={};
  r.valida=validarAnomalia(base).length===0;
  r.semTell=validarAnomalia({...base,tell:null});
  r.tellSemAviso=validarAnomalia({...base,tell:{tipo:'x',intensidade:.5,turnosAntes:0}});
  r.semResolucao=validarAnomalia({...base,resolucoes:[]});
  r.categoriaRuim=validarAnomalia({...base,categoria:'inventada'});
  r.pesoZero=validarAnomalia({...base,peso:0});
  r.registrou=registrarAnomalia({...base,id:'t_ok'});
  r.recusou=registrarAnomalia({...base,id:'t_ruim',tell:null});
  return r;
});
console.log('   sem tell →',JSON.stringify(d.semTell));
ok('um registro completo passa',d.valida);
ok('SEM TELL é rejeitado, e a mensagem diz que é bug',
  d.semTell.length>0&&/SEM TELL/.test(d.semTell.join(' ')));
ok('tell com turnosAntes 0 é rejeitado',d.tellSemAviso.length>0);
ok('sem resolução é rejeitado',d.semResolucao.length>0);
ok('categoria fora do enum é rejeitada',d.categoriaRuim.length>0);
ok('peso zero é rejeitado',d.pesoZero.length>0);
ok('registrar aceita o bom e recusa o ruim',d.registrou===true&&d.recusou===false);

console.log('\n5. AS 21 GOVERNADAS');
d=await p.evaluate(()=>{
  const ids=Object.keys(CATALOGO_ANOM);
  const av=ids.filter(i=>i.startsWith('avaria_'));
  const bi=ids.filter(i=>i.startsWith('bicho_'));
  return {av:av.length, bi:bi.length,
    todasValidas:ids.every(i=>validarAnomalia(CATALOGO_ANOM[i]).length===0),
    todasComTell:ids.every(i=>!!CATALOGO_ANOM[i].tell),
    apontamPraFonte:av.concat(bi).every(i=>!!CATALOGO_ANOM[i].fonte),
    naoCopiaram:av.every(i=>CATALOGO_ANOM[i].fonte.tabela==='AVARIAS'),
    avariasOriginais:Object.keys(AVARIAS).length, bichosOriginais:BICHOS.length};
});
console.log('   ',JSON.stringify(d));
ok('as 15 avarias foram adaptadas',d.av===15&&d.avariasOriginais===15);
ok('as 6 criaturas foram adaptadas',d.bi===6&&d.bichosOriginais===6);
ok('todas passam no schema',d.todasValidas);
ok('nenhuma ficou sem tell',d.todasComTell);
ok('os registros APONTAM pra fonte em vez de copiá-la',d.apontamPraFonte&&d.naoCopiaram);

console.log('\n6. MÁQUINA DE ESTADOS: TRANSIÇÃO INVÁLIDA NÃO PASSA');
d=await p.evaluate(()=>{
  const a={id:'m1',estado:'dormente'};
  const r={};
  r.valida=transicionar(a,'armada');
  r.estado1=a.estado;
  r.invalida=transicionar(a,'cicatriz');
  r.estado2=a.estado;
  /* em modo dev, lança */
  nucleoDev(true);
  try{ transicionar(a,'cicatriz'); r.lancou=false; }catch(e){ r.lancou=true; }
  nucleoDev(false);
  /* cicatriz é terminal */
  const b2={id:'m2',estado:'cicatriz'};
  r.terminal=transicionar(b2,'dormente');
  return r;
});
console.log('   ',JSON.stringify(d));
ok('transição válida passa',d.valida&&d.estado1==='armada');
ok('transição inválida é recusada e não muda o estado',
  d.invalida===false&&d.estado2==='armada');
ok('em modo dev, transição inválida lança',d.lancou);
ok('cicatriz é terminal',d.terminal===false);

console.log('\n7. WATCHDOG: SOFTLOCK É IMPOSSÍVEL POR CONSTRUÇÃO');
d=await p.evaluate(()=>{
  S.turnoGlobal=0;
  /* uma de cada estado, todas paradas há muito tempo */
  const lista=Object.keys(TETO_ESTADO).map((e,i)=>({id:'w'+i,estado:e,desdeTurno:0}));
  S.turnoGlobal=10000;
  const forcadas=vigiarEstados(lista);
  const finais={}; lista.forEach(a=>{finais[a.estado]=(finais[a.estado]||0)+1;});
  /* nenhuma sobrou parada num estado com teto */
  const presas=lista.filter(a=>isFinite(TETO_ESTADO[a.estado])
    &&(S.turnoGlobal-a.desdeTurno)>TETO_ESTADO[a.estado]);
  return {forcadas:forcadas.length, finais, presas:presas.map(a=>a.id+':'+a.estado)};
});
console.log('   ',JSON.stringify(d));
ok('o vigia força quem passou do teto',d.forcadas>0);
ok('ninguém sobra preso num estado com teto',d.presas.length===0);

console.log('\n8. ÂNCORAS DE PERCEPÇÃO');
d=await p.evaluate(()=>({
  ancoras:Object.keys(PERCEPCAO_INVIOLAVEL),
  congelado:Object.isFrozen(PERCEPCAO_INVIOLAVEL),
  relogio:podeFalsificar('relogio'),
  inventario:podeFalsificar('inventario'),
  porta:podeFalsificar('portaFrente'),
  outra:podeFalsificar('vozes')
}));
console.log('   ',JSON.stringify(d));
ok('as três âncoras existem e estão congeladas',d.ancoras.length===3&&d.congelado);
ok('relógio, inventário e porta da frente não podem ser falsificados',
  !d.relogio&&!d.inventario&&!d.porta);
ok('o resto pode',d.outra===true);

console.log('\n9. A INVASÃO VIRA DADO PURO');
d=await p.evaluate(()=>{
  cena.casa={voce:2,monstro:6,monstro2:null,visivel:false};
  const I={bicho:BICHOS[1],fase:'CACA',faseTurnos:2,ruidoEm:5,folego:3,
    trilha:[1,2,3],acompanha:[],escondidos:[],cooldown:0,
    _naoSerializar:()=>1, _dom:document.body};
  anomIniciar(I); I.fase='CACA'; I.ruidoEm=5;
  const d1=espelharInvasao(I);
  const json=JSON.stringify(d1);
  const temFuncao=/function|=>/.test(json);
  const I2=reidratarInvasao();
  return {salvouFase:d1.fase, bichoComoId:typeof d1.bicho==='string',
    semFuncao:!temFuncao, semDom:d1._dom===undefined,
    reidratouFase:I2&&I2.fase, reidratouBicho:I2&&I2.bicho&&I2.bicho.id,
    reidratouCasa:cena.casa.voce, temRngNoEspelho:typeof d1.rngEstado==='number'};
});
console.log('   ',JSON.stringify(d));
ok('o espelho guarda a fase',d.salvouFase==='CACA');
ok('o bicho vai como id, não como objeto',d.bichoComoId);
ok('NENHUMA função entra no estado',d.semFuncao);
ok('NENHUM nó de DOM entra no estado',d.semDom);
ok('reidratar devolve um I jogável',d.reidratouFase==='CACA'&&d.reidratouBicho==='rastejante');
ok('e o estado do RNG viaja junto',d.temRngNoEspelho);

console.log('\n10. OS PARÂMETROS MORTOS DA AUDITORIA');
d=await p.evaluate(()=>{
  const r={};
  /* Coro: divididas agora é LIDO */
  {cena.casa={voce:0,monstro:4,visivel:false};
   const I={bicho:BICHOS.find(x=>x.id==='coro'),acompanha:[],escondidos:[],bloqueio:null,bloqTurnos:0};
   anomIniciar(I); I.fase='CACA'; I.ruidoEm=0; I.divididas=2;
   const antes=I.divididas;
   moverMonstro(4,I);
   r.coro={antes, depois:I.divididas, consumiu:I.divididas<antes};}
  /* Magro: recuo agora é LIDO e afasta */
  {cena.casa={voce:0,monstro:1,visivel:false};
   const I={bicho:BICHOS.find(x=>x.id==='magro'),acompanha:[],escondidos:[],bloqueio:null,bloqTurnos:0};
   anomIniciar(I); I.fase='CACA'; I.ruidoEm=0; I.recuo=3;
   /* apaga tudo: senão o Magro paga o pedágio da luz e nem chega no
      bloco do recuo — foi assim que a auditoria descobriu que ele
      ficava inerte com a casa acesa */
   const _int=window.interruptor; window.interruptor=()=>false;
   const dAntes=distancia(1,0);
   const novo=moverMonstro(1,I);
   window.interruptor=_int;
   r.magro={recuoDepois:I.recuo, dAntes, dNovo:distancia(novo,0),
     afastou:distancia(novo,0)>=dAntes};}
  /* e a correção da inércia: com tudo aceso ele NÃO fica parado pra sempre */
  {cena.casa={voce:0,monstro:1,visivel:false};
   const I={bicho:BICHOS.find(x=>x.id==='magro'),acompanha:[],escondidos:[],bloqueio:null,bloqTurnos:0};
   anomIniciar(I); I.fase='CACA'; I.ruidoEm=0;
   const posicoes=[]; let pos=1;
   for(let t=0;t<8;t++){ pos=moverMonstro(pos,I); posicoes.push(pos); }
   r.magroAceso={posicoes, andou:new Set(posicoes).size>1};}
  /* raro: agora o campo manda, não o id */
  /* `sortearBicho` está embrulhado pelo §26, então ler o texto-fonte
     mostra o embrulho, não o original. Testa COMPORTAMENTO: marca uma
     criatura comum como rara e vê se ela some antes do dia 7. */
  {const alvo=BICHOS.find(x=>x.id==='inchado');
   const salvo=alvo.raro;
   const conta=(dia)=>{ S.dia=dia; const c={};
     for(let i=0;i<400;i++){const b2=sortearBicho(); c[b2.id]=(c[b2.id]||0)+1;} return c; };
   const antes=conta(5);
   alvo.raro=true;
   const depois=conta(5);
   alvo.raro=salvo;
   r.raro={semRaro:antes.inchado>0, comRaro:(depois.inchado||0)===0};}
  return r;
});
console.log('   ',JSON.stringify(d));
ok('Coro: divididas é consumido de verdade',d.coro.consumiu);
ok('Magro: recuo é consumido e ele SE AFASTA',
  d.magro.recuoDepois===2&&d.magro.afastou);
ok('Magro com a casa toda acesa NÃO fica inerte (a luz atrasa, não congela)',
  d.magroAceso.andou);
ok('raro virou campo: marcar uma comum como rara a some antes do dia 7',
  d.raro.semRaro&&d.raro.comRaro);

console.log('\n11. SAVE ANTIGO CARREGA E JOGA');
d=await p.evaluate(()=>{
  /* simula save legado: sem saveId, sem rng, sem inv */
  delete S.saveId; delete S.rngSemente; delete S.rngEstado;
  S.inv=undefined; S.turnoGlobal=undefined;
  const dia=S.dia;
  semearRNG();
  return {temSaveId:!!S.saveId, temSemente:typeof S.rngSemente==='number',
    sorteia:typeof rng().next()==='number', diaIntacto:S.dia===dia,
    invNulo:!S.inv};
});
console.log('   ',JSON.stringify(d));
ok('save sem saveId ganha um e continua',d.temSaveId&&d.temSemente);
ok('o RNG funciona depois da migração',d.sorteia);
ok('o dia do jogador não é tocado',d.diaIntacto);
ok('sem invasão em curso é o estado neutro',d.invNulo);

console.log('\nerros de página:',erros.filter(e=>!/ERR_|file:/.test(e)).length?erros:'(nenhum)');
await b.close();
