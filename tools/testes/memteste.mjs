/* FASE 3 — memória cognitiva da casa: EMA, confiança, hostilidade,
   consolidação, e os três comportamentos exigidos. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','N'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);
const zerar=()=>p.evaluate(()=>{ S.memoriaAnomalias=null; memoria(); });

console.log('\n1. MÉDIA MÓVEL, NÃO CONTADOR');
await zerar();
let d=await p.evaluate(()=>{
  /* dez noites escondendo */
  const sobe=[];
  for(let i=0;i<10;i++){memAplicar('metodos','esconder',1);sobe.push(memoria().metodos.esconder.v);}
  const pico=memoria().metodos.esconder.v;
  /* e dez noites sem esconder: a média desce sozinha */
  const desce=[];
  for(let i=0;i<10;i++){memAplicar('metodos','esconder',0);desce.push(memoria().metodos.esconder.v);}
  const fim=memoria().metodos.esconder.v;
  /* meia-vida: quantas noites de 0 pra cair pela metade a partir do pico */
  memAplicar('metodos','x',1); for(let i=0;i<20;i++)memAplicar('metodos','x',1);
  const p2=memoria().metodos.x.v; let k=0;
  while(memoria().metodos.x.v>p2/2&&k<50){memAplicar('metodos','x',0);k++;}
  return {sobe:sobe.map(x=>+x.toFixed(3)), pico:+pico.toFixed(3),
    desce:desce.map(x=>+x.toFixed(3)), fim:+fim.toFixed(3), meiaVida:k,
    limite:memoria().metodos.esconder.n};
});
console.log('   ',JSON.stringify(d));
ok('a média sobe com o uso',d.sobe[0]<d.sobe[4]&&d.sobe[4]<d.pico);
ok('nunca passa de 1',d.pico<=1);
ok('parar de usar apaga sozinho (não é contador)',d.fim<.05);
ok('a meia-vida fica perto de 2 noites',d.meiaVida>=2&&d.meiaVida<=3);
ok('o número de observações tem teto',d.limite<=40);

console.log('\n2. A CASA SÓ AGE COM CERTEZA');
await zerar();
d=await p.evaluate(()=>{
  const passos=[];
  for(let i=1;i<=10;i++){
    memAplicar('metodos','correr',1);
    passos.push({n:i, conf:+memConf('metodos','correr').toFixed(3),
      le:+memLer('metodos','correr').toFixed(3)});
  }
  const primeiroQueLe=passos.find(x=>x.le>0);
  return {passos, primeiroQueLe, limiar:MEM_CFG.limiarConfianca,
    inexistente:memLer('metodos','nao_existe'),
    confInexistente:memConf('metodos','nao_existe')};
});
console.log('   ',JSON.stringify(d.passos));
ok('uma observação não faz a casa saber de nada',d.passos[0].le===0);
ok('a leitura só abre quando a confiança passa de '+d.limiar,
  d.primeiroQueLe&&d.primeiroQueLe.conf>d.limiar);
ok('antes disso o valor lido é ZERO, não "um pouco"',
  d.passos.filter(x=>x.conf<=d.limiar).every(x=>x.le===0));
ok('id que a casa nunca viu vale zero',d.inexistente===0&&d.confInexistente===0);

console.log('\n3. HOSTILIDADE TEM TETO E DECAI');
await zerar();
d=await p.evaluate(()=>{
  const sobe=[];
  for(let i=0;i<40;i++){
    memVer('pontosFortes','fuga'); memVer('pontosFortes','contra_magro');
    memFecharNoite(true); sobe.push(memoria().hostilidade);
  }
  const teto=memoria().hostilidade;
  /* apanhar derruba */
  memVer('fraquezas','contato'); memFecharNoite(true);
  const apanhou=memoria().hostilidade;
  /* e sem nada acontecer, volta pro zero sozinha */
  let k=0; while(memoria().hostilidade>0&&k<200){memFecharNoite(true);k++;}
  return {teto:+teto.toFixed(3), cfgTeto:MEM_CFG.hostilidadeTeto,
    apanhou:+apanhou.toFixed(3), noitesAteZerar:k,
    nuncaNegativa:memoria().hostilidade>=0,
    subiuDevagar:+sobe[0].toFixed(3)};
});
console.log('   ',JSON.stringify(d));
ok('a hostilidade para no teto',d.teto===d.cfgTeto);
ok('apanhar derruba a hostilidade',d.apanhou<d.teto);
ok('sem eventos ela volta pro zero',d.noitesAteZerar>0&&d.noitesAteZerar<30);
ok('nunca fica negativa',d.nuncaNegativa);

console.log('\n4. CONSOLIDAÇÃO — LIMITE SEM APAGAR EM SILÊNCIO');
await zerar();
d=await p.evaluate(()=>{
  for(let i=0;i<40;i++)for(let k=0;k<3;k++)memAplicar('metodos','m'+i,i/40);
  const antes=Object.keys(memoria().metodos).length;
  memConsolidar();
  const b=memoria().metodos;
  const depois=Object.keys(b).length;
  const fortes=['m39','m38','m37'].filter(k=>b[k]).length;
  return {antes, depois, max:MEM_CFG.maxEntradas,
    temOutros:!!b.outros, massaOutros:b.outros?+b.outros.v.toFixed(3):null,
    fortesFicaram:fortes,
    idempotente:(()=>{memConsolidar();return Object.keys(memoria().metodos).length;})()};
});
console.log('   ',JSON.stringify(d));
ok('o balde cheio é cortado no limite',d.depois<=d.max&&d.antes>d.max);
ok('as entradas fracas viram uma só, `outros`',d.temOutros&&d.massaOutros>0);
ok('as fortes sobrevivem',d.fortesFicaram===3);
ok('consolidar de novo não muda nada',d.idempotente===d.depois);

console.log('\n5. COMPORTAMENTO 1 — ENCARECE, NÃO ELIMINA');
await zerar();
d=await p.evaluate(()=>{
  const alvo=MEM_CONTRA.esconder[0];
  const semMemoria=pesoDaMemoria(CATALOGO_ANOM[alvo]);
  /* ensina o hábito e liga a hostilidade */
  memEnsinar('metodos','esconder',12);
  const semHostil=pesoDaMemoria(CATALOGO_ANOM[alvo]);
  memoria().hostilidade=MEM_CFG.hostilidadeTeto;
  const comTudo=pesoDaMemoria(CATALOGO_ANOM[alvo]);
  /* o que NÃO é contra do método continua valendo 1 */
  const naoContra=Object.keys(CATALOGO_ANOM)
    .filter(i=>!Object.values(MEM_CONTRA).flat().includes(i))
    .map(i=>pesoDaMemoria(CATALOGO_ANOM[i]));
  /* nenhum peso de escolha vai a zero por causa da memória */
  const pesos=Object.keys(CATALOGO_ANOM).map(i=>pesoDaMemoria(CATALOGO_ANOM[i]));
  /* a rotina de cômodo puxa as avarias daquele cômodo, sem tabela escrita */
  memEnsinar('rotinas','comodo_5',12);
  const contras=memContras();
  const doComodo5=Object.keys(AVARIAS).filter(k=>AVARIAS[k].onde===5)
    .every(k=>contras['avaria_'+k]>0);
  return {semMemoria, semHostil, comTudo:+comTudo.toFixed(3),
    naoContraTodos1:naoContra.every(x=>x===1),
    minPeso:Math.min(...pesos), maxPeso:+Math.max(...pesos).toFixed(3),
    tetoTeorico:+(1+MEM_CFG.hostilidadeTeto*MEM_CFG.fatorContra).toFixed(3),
    doComodo5, contras};
});
console.log('   ',JSON.stringify({semMemoria:d.semMemoria,semHostil:d.semHostil,
  comTudo:d.comTudo,minPeso:d.minPeso,maxPeso:d.maxPeso,teto:d.tetoTeorico,
  doComodo5:d.doComodo5}));
ok('sem memória o multiplicador é neutro',d.semMemoria===1);
ok('sem hostilidade o hábito sozinho não encarece',d.semHostil===1);
ok('com hábito + hostilidade a contra fica mais provável',d.comTudo>1);
ok('o que não é contra do hábito continua em 1',d.naoContraTodos1);
ok('nada nunca é ELIMINADO: o multiplicador nunca desce de 1',d.minPeso>=1);
ok('e nunca passa do teto teórico',d.maxPeso<=d.tetoTeorico+1e-9);
ok('a rotina de cômodo puxa as avarias daquele cômodo, sem tabela nova',d.doComodo5);

console.log('\n6. COMPORTAMENTO 2 — A ISCA');
await zerar();
d=await p.evaluate(()=>{
  S.dia=10; S.anomAtivasLista=[]; semearRNG();
  const naoDisponivel=iscaDisponivel();
  memEnsinar('metodos','luz',14);
  const disponivel=iscaDisponivel();
  /* precisa de calmaria: no meio do susto ela não arma */
  const O=orqNovaNoite(true); O.vales=[];
  /* o par mais distante da planta. A SALA não serve de origem: ela é o
     miolo da casa e nada fica a mais de 2 cômodos dela — quem passa a
     noite na sala nunca entra em calmaria, e isso é do desenho da casa,
     não do sistema. */
  const ids=Object.keys(PLANTA).map(Number);
  let eu=ids[0], longeDe4=ids[0], melhor=-1;
  ids.forEach(i=>ids.forEach(j=>{const v=distancia(i,j);
    if(v>melhor){melhor=v;eu=i;longeDe4=j;}}));
  cena.casa={voce:eu,monstro:longeDe4,monstro2:null,visivel:true};
  for(let i=0;i<MEM_CFG.turnosDeCalmaria+2;i++)orqTurno();
  O.cooldownGlobal=0; O.ultimoEvento=0;
  /* com a coisa colada em você não é calmaria, por mais parado que esteja */
  const perto=(()=>{ cena.casa.monstro=cena.casa.voce; return tensaoBaixa(); })();
  const diametro=melhor;
  cena.casa.monstro=longeDe4;
  /* evento agora mesmo também não é calmaria */
  const noSusto=(()=>{ O.ultimoEvento=O.turno; const v=tensaoBaixa();
    O.ultimoEvento=0; return v; })();
  const longe=distancia(cena.casa.voce,cena.casa.monstro);
  /* e não arma dentro do vale, que é reservado */
  O.vales=[{de:1,ate:99}]; O.ultimoEvento=0;
  for(let i=0;i<MEM_CFG.turnosDeCalmaria+2;i++)orqTurno();
  const noVale=tensaoBaixa();
  /* na calmaria fora do vale, arma — e arma SOZINHA, pelo tique do
     orquestrador. É assim que ela acontece de verdade: ninguém chama
     `talvezIsca` na mão durante a noite. */
  S.luzes={}; memoria().iscaEm=-99;
  O.vales=[]; O.ultimoEvento=0; S.anomAtivasLista=[];
  O.cooldownGlobal=0; CATEGORIAS.forEach(c=>O.cooldownCategoria[c]=0);
  const calmaria=tensaoBaixa();
  const acesasAntes=Object.keys(LUMINARIAS).filter(id=>interruptor(id)).length;
  const gastoAntes=O.gasto;
  const cicAntes=memoria().cicatrizes.length;
  let armou=false;
  for(let i=0;i<8&&!armou;i++){
    O.cooldownGlobal=0; O.ultimoEvento=0; S.anomAtivasLista=[];
    orqTurno();
    armou=Object.keys(LUMINARIAS).filter(id=>interruptor(id)).length<acesasAntes;
  }
  const acesasDepois=Object.keys(LUMINARIAS).filter(id=>interruptor(id)).length;
  const pagou=O.gasto>gastoAntes;
  /* cooldown longo: não arma de novo na mesma noite nem nas seguintes */
  O.cooldownGlobal=0; CATEGORIAS.forEach(c=>O.cooldownCategoria[c]=0);
  O.ultimoEvento=0; S.anomAtivasLista=[];
  const deNovo=talvezIsca();
  S.dia+=MEM_CFG.iscaCooldownNoites-1;
  const cedoDemais=iscaDisponivel();
  S.dia+=1;
  const depoisDoCooldown=iscaDisponivel();
  return {naoDisponivel, disponivel, perto, noSusto, longe, diametro, noVale, calmaria,
    armou, acesasAntes, acesasDepois, pagou, deNovo,
    cedoDemais, depoisDoCooldown,
    limiar:MEM_CFG.limiarIsca, limiarMetodo:MEM_CFG.limiarMetodo,
    cicatriz:memoria().cicatrizes.length>cicAntes
      &&memoria().cicatrizes[memoria().cicatrizes.length-1].o==='isca',
    peso:CATALOGO_ANOM.isca_escuridao.peso,
    tell:CATALOGO_ANOM.isca_escuridao.tell};
});
console.log('   ',JSON.stringify(d));
ok('sem o hábito da luz não existe isca',d.naoDisponivel===false);
ok('com o hábito acima de '+d.limiar+' ela fica disponível',d.disponivel);
ok('o limiar da isca é mais alto que o de encarecer',d.limiar>d.limiarMetodo);
ok('com a coisa no seu cômodo não é calmaria',d.perto===false);
ok('logo depois de um evento não é calmaria',d.noSusto===false);
ok('a calmaria exige a coisa longe: '+d.longe+' cômodos (diâmetro da casa: '
  +d.diametro+')',d.longe>=3&&d.calmaria);
ok('dentro do vale de silêncio não é calmaria',d.noVale===false);
ok('na calmaria fora do vale, sim',d.calmaria);
ok('a isca arma sozinha no tique do orquestrador e apaga uma luz',
  d.armou&&d.acesasDepois===d.acesasAntes-1);
ok('e paga orçamento como todo mundo',d.pagou);
ok('tem tell antes: piscada, não punição seca',d.tell&&d.tell.turnosAntes>=1);
ok('não arma duas vezes seguidas',d.deNovo===false);
ok('o cooldown é de '+5+' noites',d.cedoDemais===false&&d.depoisDoCooldown);
ok('a isca deixa cicatriz — o jogador pode reconstruir depois',d.cicatriz);

console.log('\n7. COMPORTAMENTO 3 — O CICLO QUEBRADO');
await zerar();
d=await p.evaluate(()=>{
  S.dia=20; semearRNG();
  const M=memoria();
  const semRitmo=memCicloQuebravel();
  /* quatro noites seguidas de invasão ensinam o ritmo */
  for(let i=0;i<MEM_CFG.cicloParaQuebrar;i++){M._teveInvasao=1;memFecharNoite(true);}
  const seguidas=M.seguidasComInvasao;
  const quebravel=memCicloQuebravel();
  const O=orqNovaNoite(true);
  const quebrou=!!O.noiteQuebrada;
  const noiteInteiraVale=O.vales.length===1&&O.vales[0].de<=1&&O.vales[0].ate>=24;
  /* nessa noite NADA é concedido */
  let concedidos=0;
  for(let t=0;t<24;t++){ orqTurno(); if(orqTentar(Object.keys(CATALOGO_ANOM)))concedidos++; }
  /* e não acontece duas noites seguidas */
  S.dia++; const logoDepois=orqNovaNoite(true).noiteQuebrada;
  /* uma noite sem invasão zera o ritmo */
  memFecharNoite(false);
  const ritmoQuebrado=memoria().seguidasComInvasao;
  S.dia+=MEM_CFG.cicloCooldownNoites;
  const semRitmoDeNovo=memCicloQuebravel();
  return {semRitmo, seguidas, quebravel, quebrou, noiteInteiraVale, concedidos,
    logoDepois, ritmoQuebrado, semRitmoDeNovo,
    precisa:MEM_CFG.cicloParaQuebrar, cd:MEM_CFG.cicloCooldownNoites};
});
console.log('   ',JSON.stringify(d));
ok('sem ritmo aprendido não há ritmo pra quebrar',d.semRitmo===false);
ok(d.precisa+' noites seguidas de invasão ensinam o ritmo',d.seguidas>=d.precisa&&d.quebravel);
ok('a noite seguinte vira silêncio por decisão',d.quebrou&&d.noiteInteiraVale);
ok('e nela NADA é concedido — nenhum susto',d.concedidos===0);
ok('não acontece duas noites seguidas',d.logoDepois===false);
ok('uma noite sem invasão zera o ritmo',d.ritmoQuebrado===0);
ok('e sem ritmo, o cooldown vencido não basta',d.semRitmoDeNovo===false);

console.log('\n8. A NOITE VAZIA POR DECISÃO NÃO É NOITE VAZIA POR AZAR');
d=await p.evaluate(()=>{
  S.memoriaAnomalias=null; memoria();
  const r=orqHistograma(10000,20260820);
  return r;
});
p.on('console',m=>{});
ok('nenhuma noite vazia por acidente',d.zeradas===0);
ok('nenhum estouro de orçamento',d.estouros===0);
ok('a média continua na faixa alvo '+d.faixaAlvo.join('–'),d.dentroDaFaixa);
console.log('    média',d.media,'· min',d.min,'· p50',d.p50,'· max',d.max,
  '· zeradas',d.zeradas,'· por decisão',d.quebradas);
/* e com o ritmo aprendido a simulação passa a ter noites vazias — todas
   contadas como decisão, nenhuma como acidente */
let e=await p.evaluate(()=>{
  S.memoriaAnomalias=null; memoria();
  memoria().seguidasComInvasao=MEM_CFG.cicloParaQuebrar+2;
  const r=orqSimular(3000,777);
  return {zeradas:r.zeradas, quebradas:r.quebradas, media:r.media, min:r.min};
});
console.log('   ',JSON.stringify(e));
ok('com o ritmo aprendido aparecem noites vazias',e.quebradas>0);
ok('e nenhuma delas conta como acidente',e.zeradas===0);
await p.evaluate(()=>{S.memoriaAnomalias=null;memoria();});

console.log('\n9. ESTADO PURO, SAVE E SAVE LEGADO');
d=await p.evaluate(()=>{
  memEnsinar('metodos','esconder',8);
  memEnsinar('rotinas','comodo_4',8);
  memCicatriz('teste','x');
  salvarAgora();
  const disco=JSON.parse(localStorage.getItem(CHAVE)||'{}');
  const txt=JSON.stringify(disco.memoriaAnomalias||{});
  const semSujeira=txt.indexOf('function')<0&&txt.indexOf('[object')<0;
  const ida=JSON.stringify(S.memoriaAnomalias);
  const volta=JSON.stringify(JSON.parse(ida));
  /* save legado: nenhuma memória gravada */
  const guarda=localStorage.getItem(CHAVE);
  const velho=JSON.parse(guarda); delete velho.memoriaAnomalias;
  localStorage.setItem(CHAVE,JSON.stringify(velho));
  S.memoriaAnomalias=null;
  let erro=null; try{ carregar(); memoria(); }catch(e){ erro=e.message; }
  const zerada=memoria().noites===0&&memoria().hostilidade===0;
  const jogavel=pesoDaMemoria(CATALOGO_ANOM[Object.keys(CATALOGO_ANOM)[0]])===1;
  /* versão diferente: reinicia em vez de quebrar */
  S.memoriaAnomalias={versao:0,lixo:1};
  const migrou=memoria().versao===MEM_CFG.versao;
  localStorage.setItem(CHAVE,guarda);
  return {salvou:!!disco.memoriaAnomalias, semSujeira, ciclo:ida===volta,
    erro, zerada, jogavel, migrou,
    cicatrizesLimitadas:(()=>{for(let i=0;i<50;i++)memCicatriz('x',i);
      return memoria().cicatrizes.length<=MEM_CFG.maxCicatrizes;})()};
});
console.log('   ',JSON.stringify(d));
ok('a memória vai pro save',d.salvou);
ok('nenhuma função nem DOM no estado',d.semSujeira);
ok('sobrevive a JSON ida e volta',d.ciclo);
ok('save sem memória carrega sem erro',d.erro===null);
ok('e a casa começa sem saber nada de você',d.zerada&&d.jogavel);
ok('memória de versão velha reinicia em vez de quebrar',d.migrou);
ok('as cicatrizes têm limite',d.cicatrizesLimitadas);

console.log('\n10. NADA DE Math.random NO CAMINHO');
d=await p.evaluate(()=>{
  const guarda=Math.random; let usos=0;
  Math.random=function(){usos++;return guarda.apply(this,arguments);};
  try{
    S.memoriaAnomalias=null; memoria(); S.dia=9; semearRNG();
    memEnsinar('metodos','luz',14); memEnsinar('metodos','esconder',10);
    memoria().hostilidade=.5;
    orqNovaNoite(true);
    for(let t=0;t<24;t++){orqTurno();orqTentar(Object.keys(CATALOGO_ANOM));}
    memContras(); pesoDaMemoria(CATALOGO_ANOM.bicho_imitador);
    memFecharNoite(true); memConsolidar(); memEstado();
  } finally { Math.random=guarda; }
  return {usos};
});
console.log('   ',JSON.stringify(d));
ok('o sistema de memória não chama Math.random nenhuma vez',d.usos===0);

console.log('\n11. NADA QUEBROU');
console.log('    erros de página:',erros.length?erros.slice(0,6):'nenhum');
ok('nenhum erro de página',erros.length===0);
await b.close();
