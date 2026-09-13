/* FUMACA NO PACOTE DESCOMPACTADO — nao na copia de trabalho.
   E a unica forma de saber que o que a pessoa baixa e o que foi testado. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const PORTA=process.argv[2]||'8920';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; 
p.on('pageerror',e=>erros.push(e.message));
p.on('console',m=>{ if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))
  erros.push('console: '+m.text()); });
await p.goto('http://127.0.0.1:'+PORTA+'/index.html'); await p.waitForTimeout(1200);
await p.click('#btn-boot'); await p.waitForTimeout(1400);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Pacote'); await p.click('#go');
{ await p.waitForTimeout(700);
  if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
    fichaJogador().pontos.forca=6;fichaJogador().pontos.percepcao=4;
    document.querySelector('#ficha .ok').disabled=false;});
    await p.click('#ficha .ok'); await p.waitForTimeout(700);} }
await p.waitForTimeout(21000);
for(let i=0;i<6;i++){
  const passou=await p.evaluate(()=>{
    const b=[...document.querySelectorAll('#acoes button')]
      .find(x=>/Come.ar|pular as dicas|Entendi|Continuar/i.test(x.textContent)&&!x.disabled);
    if(b){b.click(); return true;} return false;});
  await p.waitForTimeout(1500); if(!passou)break;
}
await p.waitForTimeout(2500);

console.log('\n1. OS BLOCOS NOVOS CARREGARAM NO PACOTE');
{
  const d=await p.evaluate(()=>({
    dossi:typeof dossiEstado==='function'?dossiEstado():null,
    coisas:typeof coisasEstado==='function'?coisasEstado():null,
    dentro:typeof dentroEstado==='function'?dentroEstado():null,
    passivas:typeof passivasEstado==='function'?passivasEstado():null,
    envolver:typeof envolver
  }));
  console.log('    §61 dossiê: '+(d.dossi?Object.keys(d.dossi.porFuncao).length+' funções':'AUSENTE'));
  console.log('    §62 coisas: '+(d.coisas?d.coisas.total+' objetos':'AUSENTE'));
  console.log('    §63 dentro: '+(d.dentro?d.dentro.lugares+' lugares, '+d.dentro.formas+' plantas':'AUSENTE'));
  console.log('    §64 passivas: '+(d.passivas?d.passivas.comEfeito.length+' efeitos':'AUSENTE'));
  ok('§61 carregou', !!d.dossi);
  ok('§62 carregou', !!d.coisas&&d.coisas.total===35);
  ok('§63 carregou', !!d.dentro&&d.dentro.lugares===18);
  ok('§64 carregou', !!d.passivas&&d.passivas.semConsumidor.length===0);
  ok('e o envelope com rede existe', d.envolver==='function');
}

console.log('\n2. O JOGO ABRE E RESPONDE');
{
  /* ESPERA O MENU APARECER. Ler a tela num instante de transicao devolve
     zero botoes, e zero botoes parece "o botao sumiu". */
  for(let i=0;i<25;i++){
    const pronto=await p.evaluate(()=>[...document.querySelectorAll('#acoes button')]
      .some(x=>/Olhar as coisas daqui/i.test(x.textContent)&&!x.disabled));
    if(pronto)break;
    await p.waitForTimeout(400);
  }
  const d=await p.evaluate(()=>({
    comodo:(typeof cena!=='undefined'&&cena.casa)?cena.casa.voce:null,
    dia:S.dia, hora:S.hora,
    botoes:[...document.querySelectorAll('#acoes button')].filter(x=>!x.disabled).length,
    temCoisas:[...document.querySelectorAll('#acoes button')]
      .some(x=>/Olhar as coisas daqui/i.test(x.textContent))
  }));
  console.log('    dia '+d.dia+' · '+d.hora+'h · cômodo '+d.comodo+' · '+d.botoes+' botões');
  ok('entrou na casa',              d.comodo!=null);
  ok('e o botão das coisas está lá', d.temCoisas);
}

console.log('\n3. ANDA E MEXE NAS COISAS, DE VERDADE');
{
  const passos=[];
  for(let i=0;i<14;i++){
    const fez=await p.evaluate(()=>{
      const bs=[...document.querySelectorAll('#acoes button')]
        .filter(x=>!x.disabled&&!/^[▼▶]/.test(x.textContent.trim()));
      if(!bs.length)return null;
      const alvo=bs.find(x=>/Olhar as coisas daqui/i.test(x.textContent))
        ||bs.find(x=>/^(Olhar|Encostar o ouvido|Abrir|Arrastar)/i.test(x.textContent))
        ||bs.find(x=>/^Ir para /i.test(x.textContent))
        ||bs[0];
      const t=alvo.textContent.trim().slice(0,34);
      alvo.click(); return t;
    });
    if(fez)passos.push(fez);
    await p.waitForTimeout(750);
  }
  passos.forEach(t=>console.log('    · '+t));
  const d=await p.evaluate(()=>({
    mexidas:Object.keys(S.coisas||{}).length,
    vistas:Object.values(S.coisas||{}).filter(x=>x.visto>0).length
  }));
  console.log('    coisas tocadas: '+d.mexidas+' · olhadas: '+d.vistas);
  /* NENHUMA ACAO GRATUITA PODE SER CLICAVEL PRA SEMPRE.
     Foi assim que dois defeitos iguais apareceram: "Escutar antes de ir"
     na expedicao (o expteste queimou 60 passos nele) e "Olhar" nas
     coisas da casa (o caminhador daqui clicou ONZE VEZES seguidas).
     Acao que devolve sempre a mesma frase e nao anda tem de sair da
     tela depois de usada. */
  const cont={}; passos.forEach(t=>{ const k=t.replace(/\d.*$/,'').trim();
    cont[k]=(cont[k]||0)+1; });
  const repetido=Object.entries(cont).filter(([,n])=>n>=5);
  console.log('    ação repetida 5+ vezes seguidas: '+
    (repetido.length?repetido.map(([k,n])=>'"'+k+'" '+n+'x').join(', '):'nenhuma'));
  ok('o jogo aceitou 14 cliques sem travar', passos.length>=10);
  ok('e alguma coisa foi mexida',            d.mexidas>0);
  ok('e nenhuma ação grátis vira laço',      repetido.length===0);
}

console.log('\n4. NADA QUEBROU NO PACOTE');
console.log('    erros: '+(erros.length?erros.slice(0,4).join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
