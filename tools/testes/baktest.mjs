import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1200);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','B'); await p.click('#go');
{ await p.waitForTimeout(600);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=5; document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(600);} }
await p.waitForTimeout(21000);
console.log('BACKUP DO SAVE');
let d=await p.evaluate(async()=>{
  /* zera pra medir do começo: sem save anterior não há o que copiar */
  localStorage.removeItem(CHAVE); localStorage.removeItem(CHAVE_BAK);
  S.dia=3; S.diesel=42; salvarAgora();
  await new Promise(r=>setTimeout(r,50));
  /* primeiro save da vida: não existe geração anterior, então backup
     vazio é o correto — copiar o nada seria pior */
  const semBakNoPrimeiro=!localStorage.getItem(CHAVE_BAK);
  S.dia=4; S.diesel=77; salvarAgora();
  await new Promise(r=>setTimeout(r,50));
  const bak=JSON.parse(localStorage.getItem(CHAVE_BAK)||'{}');
  const pri=JSON.parse(localStorage.getItem(CHAVE)||'{}');
  /* quantas escritas o backup custa por save? */
  let escritas=0; const _si=localStorage.setItem.bind(localStorage);
  localStorage.setItem=function(k,v){ if(k===CHAVE_BAK)escritas++; return _si(k,v); };
  salvarAgora(); await new Promise(r=>setTimeout(r,50));
  localStorage.setItem=_si;
  return {semBakNoPrimeiro, bakDia:bak.dia, bakDiesel:bak.diesel,
    priDia:pri.dia, priDiesel:pri.diesel, escritasDeBackupPorSave:escritas};
});
console.log('   ',JSON.stringify(d));
ok('no primeiro save não há geração anterior pra copiar',d.semBakNoPrimeiro);
ok('do segundo save em diante o backup guarda a geração ANTERIOR',d.bakDia===3&&d.bakDiesel===42);
ok('e o principal tem a atual',d.priDia===4&&d.priDiesel===77);
ok('backup custa UMA escrita por save, não sete',d.escritasDeBackupPorSave===1);

d=await p.evaluate(()=>{
  /* corrompe o principal e vê se o utilizável cai no backup */
  localStorage.setItem(CHAVE,'{isso não é json');
  const u=saveUtilizavel();
  return {de:u.de, dia:u.dados&&u.dados.dia};
});
console.log('   ',JSON.stringify(d));
ok('save principal quebrado cai pro backup',d.de==='backup'&&typeof d.dia==='number');

d=await p.evaluate(()=>{
  localStorage.setItem(CHAVE,'{}');           /* json válido mas sem partida */
  const u=saveUtilizavel();
  return {de:u.de};
});
ok('objeto vazio não passa por save bom',d.de==='backup');
await b.close();
