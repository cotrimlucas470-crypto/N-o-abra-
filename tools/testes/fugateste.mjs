/* FASE 3 — fugir deixou de ser derrota. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message));
await p.goto('file:///home/user/N-o-abra-/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','F'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=5;fichaJogador().pontos.vitalidade=5;
    document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);

await p.evaluate(()=>{
  window.__espera=ms=>new Promise(r=>setTimeout(r,ms));
  window.__bs=()=>[...document.querySelectorAll('#acoes button')]
    .filter(x=>!x.disabled&&!x.classList.contains('sec-cab'));
  window.__clicar=async re=>{
    for(let i=0;i<60;i++){
      const b=__bs().find(x=>re.test(x.textContent));
      if(b){b.click();await __espera(250);return true;}
      await __espera(150);
    }
    return false;
  };
});

console.log('\n1. FUGIR NÃO ACABA MAIS A PARTIDA');
let d=await p.evaluate(async()=>{
  S.dia=3;S.hora=22;S.comida=8;S.diesel=40;S.remedio=2;S.muro=2;
  await invasao(1);
  await __espera(6000);                     /* a invasão tem muita pausa */
  const modoAntes=cena.modo;
  /* anda pro quintal — era isso que encerrava a run */
  await mover({escondido:false,ruidoEm:null,memoria:0,folego:3,bloqueio:null,
    bloqTurnos:0,acompanha:[],escondidos:[],bicho:{id:'x',n:'x',mem:2,vel:1}},8,false);
  await __espera(2500);
  return {modoAntes, modo:cena.modo, fim:cena.modo==='fim',
    fuga:fugaEstado(), texto:document.getElementById('texto').textContent.slice(-400)};
});
console.log('   ',JSON.stringify({modo:d.modo,fim:d.fim,fuga:d.fuga}));
ok('não caiu na tela de fim',!d.fim);
ok('entrou no estado de fuga',!!d.fuga);
ok('a fase começa em VASCULHANDO',d.fuga&&d.fuga.fase==='VASCULHANDO');
ok('e ela já decidiu por onde vai sair',d.fuga&&/fundos|frente/.test(d.fuga.saiPor));
ok('o jogador está numa área jogável',d.fuga&&/quintal|rua/.test(d.fuga.onde));

console.log('\n2. AS DUAS ÁREAS SÃO JOGÁVEIS E TÊM AÇÃO');
d=await p.evaluate(async()=>{
  const acoes=()=>__bs().map(x=>x.textContent.replace(/\s+/g,' ').trim().slice(0,40));
  const noQuintal=acoes();
  await __clicar(/pra rua/i);
  /* `turnoFora` é assíncrono e limpa a barra enquanto narra: espera a
     tela nova nascer em vez de medir no meio da transição */
  for(let i=0;i<60&&!__bs().length;i++)await __espera(200);
  const naRua=acoes();
  const ondeRua=fugaEstado().onde;
  await __clicar(/voltar pro quintal/i);
  return {noQuintal, naRua, ondeRua, ondeVolta:fugaEstado().onde};
});
console.log('   quintal:',JSON.stringify(d.noQuintal));
console.log('   rua:    ',JSON.stringify(d.naRua));
ok('o quintal tem ações',d.noQuintal.length>=4);
ok('dá pra ir pra rua',d.ondeRua==='rua');
ok('a rua tem ações próprias',d.naRua.length>=4);
ok('e dá pra voltar pro quintal',d.ondeVolta==='quintal');
ok('nenhuma tela fica sem ação (sem softlock)',d.noQuintal.length>0&&d.naRua.length>0);

console.log('\n3. O CICLO PERCORRE AS FASES ATÉ O FIM');
d=await p.evaluate(async()=>{
  /* roubar e quebrar são probabilísticos de propósito: numa fuga curta
     ela pode não achar nada, e a tela de volta até diz isso ("não
     levaram nada, isso é sorte, não é regra"). Pra o teste medir o
     MECANISMO em vez da sorte, força os dois em 1 e restaura depois. */
  const sR=FUGA_CFG.roubaPorTurno, sQ=FUGA_CFG.quebraPorTurno;
  FUGA_CFG.roubaPorTurno=1; FUGA_CFG.quebraPorTurno=1;
  S.comida=9; S.diesel=40; S.muro=2;
  const vistas=[]; const riscos=[];
  for(let i=0;i<24;i++){
    const F=fugaEstado();
    if(!F)break;
    if(vistas[vistas.length-1]!==F.fase)vistas.push(F.fase);
    riscos.push(F.risco);
    if(F.fase==='SEGURO')break;
    if(!await __clicar(/esperar e escutar/i))break;
  }
  const F=fugaEstado();
  FUGA_CFG.roubaPorTurno=sR; FUGA_CFG.quebraPorTurno=sQ;
  return {vistas, fase:F&&F.fase, turno:F&&F.turno,
    saiPor:F&&F.saiPor, levou:F&&F.levou, quebrou:F&&F.quebrou,
    riscoMax:Math.max(...riscos)};
});
console.log('   ',JSON.stringify(d));
ok('passou por VASCULHANDO',d.vistas.includes('VASCULHANDO'));
ok('passou por SAINDO',d.vistas.includes('SAINDO'));
ok('chegou em SEGURO',d.vistas.includes('SEGURO')||d.fase==='SEGURO');
ok('as fases vêm na ordem certa',
  JSON.stringify(d.vistas)===JSON.stringify(['VASCULHANDO','SAINDO','SEGURO']));
ok('ela mexeu na casa enquanto você não estava',
  (d.levou&&d.levou.length>0)||(d.quebrou&&d.quebrou.length>0));

console.log('\n4. O LADO ERRADO É PERIGOSO, O CERTO NÃO');
d=await p.evaluate(async()=>{
  const medir=(saiPor,onde)=>{
    S.fuga={fase:'SAINDO',turno:1,restam:1,saiPor,onde,avisos:0,levou:[],quebrou:[],
      comodoDela:4,escondidos:[],acompanha:[],bicho:null};
    return riscoDaArea();
  };
  return {
    fundosNoQuintal:medir('fundos','quintal'),   /* errado */
    fundosNaRua:    medir('fundos','rua'),       /* certo  */
    frenteNaRua:    medir('frente','rua'),       /* errado */
    frenteNoQuintal:medir('frente','quintal'),   /* certo  */
    cfgErrada:FUGA_CFG.riscoAreaErrada, cfgCerta:FUGA_CFG.riscoAreaCerta
  };
});
console.log('   ',JSON.stringify(d));
ok('sai pelos fundos → quintal é o lado errado',d.fundosNoQuintal>d.fundosNaRua);
ok('sai pela frente → rua é o lado errado',d.frenteNaRua>d.frenteNoQuintal);
ok('o lado certo nunca é risco zero (não vira lugar seguro de graça)',
  d.fundosNaRua>0&&d.frenteNoQuintal>0);
ok('os números vêm da config, não do meio da lógica',
  d.cfgErrada===0.34&&d.cfgCerta===0.04);

console.log('\n5. NUNCA MATA SEM TER AVISADO');
d=await p.evaluate(async()=>{
  S.fuga={fase:'SAINDO',turno:1,restam:1,saiPor:'fundos',onde:'quintal',
    avisos:0,levou:[],quebrou:[],comodoDela:4,escondidos:[],acompanha:[],bicho:null};
  /* `chance` é const arrow — NÃO é propriedade de window, então trocar
     window.chance não afeta nada (o stub da primeira versão deste teste
     não pegava). Forço pelo caminho real: risco alto na config.
     Mesmo assim `riscoDaArea` limita em 0,9 de propósito — nada neste
     jogo é certeza — então o encontro pode não sair na primeira. O
     teste insiste até sair, preservando o contador de avisos. */
  const salvo=FUGA_CFG.riscoAreaErrada;
  FUGA_CFG.riscoAreaErrada=1;
  const antesSan=S.san;
  let tentativas=0;
  const novaRodada=av=>{ S.fuga={fase:'SAINDO',turno:1,restam:1,saiPor:'fundos',
    onde:'quintal',avisos:av,levou:[],quebrou:[],comodoDela:4,
    escondidos:[],acompanha:[],bicho:null}; };
  while(tentativas<20&&(!fugaEstado()||fugaEstado().avisos<1)){
    novaRodada(fugaEstado()?fugaEstado().avisos:0);
    await turnoFora('esperar');
    for(let i=0;i<60&&!__bs().length;i++)await __espera(200);
    tentativas++;
  }
  const depoisDoPrimeiro={avisos:fugaEstado()?fugaEstado().avisos:null,
    tentativas, modo:cena.modo, fim:cena.modo==='fim', san:S.san, antesSan};
  FUGA_CFG.riscoAreaErrada=salvo;
  /* depois do susto a tela de fora é redesenhada e escreve mais coisa,
     então o aviso não fica no rabo do texto: procura no texto inteiro */
  return {depoisDoPrimeiro, cfgAvisos:FUGA_CFG.avisosAntesDoDano,
    texto:document.getElementById('texto').textContent};
});
console.log('   ',JSON.stringify(d.depoisDoPrimeiro));
ok('o primeiro erro é susto, não dano',d.depoisDoPrimeiro.avisos===1);
ok('e não acabou a partida',!d.depoisDoPrimeiro.fim);
ok('o aviso está escrito na tela',/cheira o ar|não respira/i.test(d.texto));

console.log('\n6. VOLTAR PRA CASA FUNCIONA E COBRA O PREÇO');
d=await p.evaluate(async()=>{
  S.comida=8; S.muro=2;
  S.fuga={fase:'SEGURO',turno:5,restam:1,saiPor:'fundos',onde:'quintal',avisos:0,
    levou:['2 de comida'],quebrou:['um trecho do muro'],
    comodoDela:4,escondidos:[],acompanha:[],bicho:null};
  const antes={comida:S.comida};
  await telaFora(); await __espera(400);
  const temBotaoVoltar=__bs().some(x=>/voltar pra dentro/i.test(x.textContent));
  await __clicar(/voltar pra dentro/i);
  /* a volta narra por uns 5 s antes de oferecer "Continuar" */
  for(let i=0;i<80&&!__bs().length;i++)await __espera(200);
  return {temBotaoVoltar, modo:cena.modo, fim:cena.modo==='fim',
    fugaAberta:!!fugaEstado(), comodo:cena.casa&&cena.casa.voce,
    monstro:cena.casa&&cena.casa.monstro,
    antes, comida:S.comida,
    temAcao:__bs().length>0,
    texto:document.getElementById('texto').textContent.slice(-500)};
});
console.log('   ',JSON.stringify({...d,texto:undefined}));
ok('na fase SEGURO aparece o botão de voltar',d.temBotaoVoltar);
ok('voltar não acaba a partida',!d.fim&&d.modo==='casa');
ok('a fuga fecha ao voltar',!d.fugaAberta);
ok('a casa fica sem monstro dentro',d.monstro===null);
ok('a volta cobra comida',d.comida<d.antes.comida);
ok('a tela de volta diz o que sumiu',/faltam coisas|arrebentaram/i.test(d.texto));
ok('e continua clicável',d.temAcao);

console.log('\n7. A FUGA SOBREVIVE A SAVE/LOAD');
d=await p.evaluate(async()=>{
  S.fuga={fase:'VASCULHANDO',turno:2,restam:3,saiPor:'frente',onde:'rua',avisos:0,
    levou:['um remédio'],quebrou:[],comodoDela:5,escondidos:[],acompanha:[],bicho:null};
  salvarAgora();
  const disco=JSON.parse(localStorage.getItem(CHAVE)||'{}');
  return {salvou:!!(disco.fuga&&disco.fuga.fase==='VASCULHANDO'),
    saiPor:disco.fuga&&disco.fuga.saiPor, onde:disco.fuga&&disco.fuga.onde,
    levou:disco.fuga&&disco.fuga.levou};
});
console.log('   ',JSON.stringify(d));
ok('o estado da fuga vai pro disco inteiro',
  d.salvou&&d.saiPor==='frente'&&d.onde==='rua'&&d.levou.length===1);

console.log('\nerros de página:',erros.filter(e=>!/ERR_|file:/.test(e)).length?erros:'(nenhum)');
await b.close();
