/* docs/as-costuras.html — o site animado das costuras.

   A pagina copia de `s49-costuras.js` o `COST_CFG`, o `COST_OBJ`, o
   `costEstabelecer`, o `costDesfazer` e a `costCoda` sem alterar regra.
   Este harness existe pra provar que ela continua demonstrando a REGRA
   do jogo, e nao uma imitacao dela que envelheceu em silencio — inclusive
   a lei que mantem a costura justa: nenhum contador se move.
   Ele tambem prova a proteccao por companhia de ponta a ponta, clicando. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1100,height:900}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,180)));
await p.goto('http://127.0.0.1:8901/docs/as-costuras.html');
await p.waitForTimeout(1200);

console.log('\n1. A PÁGINA ABRE E A CASA EXISTE');
ok('nove cômodos desenhados',  (await p.$$('.sala')).length===9);
ok('o diário já fala',          (await p.$$('.diario .l')).length>=1);
ok('nenhum erro',               erros.length===0);

console.log('\n2. ANDAR ESTABELECE OBJETOS');
{
  for(let v=0;v<4;v++) for(let i=0;i<9;i++){ await p.click('.sala[data-i="'+i+'"]'); }
  const d=await p.evaluate(()=>({postos:costEstado().postos.length, dia:S.dia}));
  console.log('    objetos estabelecidos: '+d.postos+' (dia '+d.dia+')');
  ok('objetos foram estabelecidos', d.postos>0);
  ok('e o texto deles aparece',     (await p.$$('.sala.tem')).length>0);
}

console.log('\n3. PASSAR O DIA E ANDAR DE NOVO FAZ SUMIR');
{
  const antesC=await p.evaluate(()=>contadoresAtuais());
  for(let dia=0;dia<6;dia++){
    await p.click('#bt-dia');
    for(let i=0;i<9;i++) await p.click('.sala[data-i="'+i+'"]');
  }
  const d=await p.evaluate(()=>({desfeitos:costEstado().desfeitos.length,
    contadores:contadoresAtuais()}));
  const mudou=Object.keys(antesC).filter(k=>antesC[k]!==d.contadores[k]);
  console.log('    costuras: '+d.desfeitos+' · contadores alterados: '+(mudou.length?mudou.join(', '):'nenhum'));
  ok('a casa desfez alguma coisa',      d.desfeitos>0);
  ok('NENHUM contador se moveu',        mudou.length===0);
  ok('e o cômodo mostra a ausência',    (await p.$$('.sala.sumiu')).length>0);
}

console.log('\n4. A REGRA DA COMPANHIA PROTEGE');
{
  await p.click('#bt-reset'); await p.waitForTimeout(200);
  await p.click('#bt-companhia');
  for(let v=0;v<3;v++) for(let i=0;i<9;i++) await p.click('.sala[data-i="'+i+'"]');
  const prot=await p.evaluate(()=>{
    const c=costEstado();
    return {postos:c.postos.length, protegidos:c.postos.filter(x=>x.protegido).length};
  });
  console.log('    postos: '+prot.postos+' · protegidos: '+prot.protegidos);
  ok('acompanhado, tudo que você vê fica protegido', prot.postos>0&&prot.protegidos===prot.postos);
  for(let dia=0;dia<8;dia++){
    await p.click('#bt-dia');
    for(let i=0;i<9;i++) await p.click('.sala[data-i="'+i+'"]');
  }
  const d=await p.evaluate(()=>costEstado().desfeitos.length);
  console.log('    costuras em 8 dias andando acompanhado: '+d);
  ok('e NADA some enquanto você anda acompanhado', d===0);
  ok('a marca verde aparece nos cômodos',          (await p.$$('.sala.protegida')).length>0);
}

console.log('\n5. A CODA SÓ EXISTE SE HOUVE COSTURA');
{
  const vazio=await p.evaluate(()=>{ S.costuras=null; costEstado(); return costCoda().length; });
  ok('sem costura, a coda é vazia', vazio===0);
  await p.evaluate(()=>{ S.costuras=null; costEstado();
    S.costuras.desfeitos=[{comodo:4,i:0,dia:9},{comodo:0,i:1,dia:12},{comodo:8,i:0,dia:20}]; });
  await p.click('#bt-coda'); await p.waitForTimeout(5200);
  const linhas=await p.$$eval('#coda .l',es=>es.map(e=>e.textContent));
  linhas.forEach(t=>console.log('    coda › '+t.slice(0,84)));
  ok('a coda abre com "Hora de acordar."', /Hora de acordar/.test(linhas[0]||''));
  ok('e fecha no objeto que sumiu',         linhas.some(t=>/pneu|prego|sofá|risco/i.test(t)));
  ok('e cita quantas vezes',                linhas.some(t=>/3 vezes/.test(t)));
}

console.log('\n6. NADA QUEBROU');
console.log('    erros: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await p.evaluate(()=>document.querySelector('[data-cap="a casa"]').scrollIntoView());
await p.waitForTimeout(800);
await p.screenshot({path:(process.env.FOTOS||'/tmp')+'/cost-casa.png'});
await b.close();
