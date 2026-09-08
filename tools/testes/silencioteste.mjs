/* §52 — o silêncio vira estado do som.

   O ACHADO QUE MOTIVOU O BLOCO, medido turno a turno atravessando um
   vale de verdade: AMBIENCE 0.07943, leito 0.07, corte 260 Hz, mestre
   0.9 — IGUAL DENTRO E FORA DO VALE, byte por byte. O orquestrador
   agendava silêncio ("valeObrigatorio nao e ausencia de evento: e
   evento") e o áudio não sabia. `emVale()` só era consultado pelo
   `pedirPermissao`.

   DUAS ARMADILHAS NA PRIMEIRA MEDIÇÃO, as duas minhas:
   1. eu lia `AM.canais.AMBIENCE.gain`, mas o abaixamento sustentado NÃO
      mora ali — mora num nó MEU, inserido entre o canal e o mestre,
      justamente pra não brigar com o `amDuck`, que faz rampa de volta
      pro cheio e apagaria qualquer coisa que eu deixasse no canal;
   2. eu esperava 120 ms entre turnos com uma rampa de 3,4 s, então
      media sempre o meio da rampa. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Quieto'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

await p.evaluate(()=>{
  window.__foto=()=>{
    const e=silencioEstado();
    return {estado:e.estado, montado:e.montado, emVale:e.emVale,
      AMBIENCE:e.ganhos.AMBIENCE, MUSIC:e.ganhos.MUSIC,
      leito:e.leito?e.leito.ganho:null, corte:e.leito?e.leito.corte:null,
      canalSFX:+AM.canais.SFX.gain.value.toFixed(5),
      canalHORROR:+AM.canais.HORROR.gain.value.toFixed(5),
      canalAMB:+AM.canais.AMBIENCE.gain.value.toFixed(5),
      mestre:+A.master.gain.value.toFixed(4)};
  };
});

console.log('\n1. O INSERT EXISTE, E ESTÁ NO LUGAR CERTO');
{
  const d=await p.evaluate(()=>{
    silenMontar();
    const e=silencioEstado();
    /* o no do silencio tem de estar ENTRE o canal e o mestre, e nao
       ser o proprio canal — senao o amDuck o apaga na primeira rampa */
    const proprioCanal=SILEN.nos.AMBIENCE===AM.canais.AMBIENCE;
    return {montado:e.montado, canais:Object.keys(SILEN.nos).sort(),
      proprioCanal,
      temFuncoes:['silenAlvo','silenAplicar','silenAtualizar','silencioEstado']
        .every(n=>typeof window[n]==='function')};
  });
  console.log('    canais com insert: '+d.canais.join(', '));
  ok('o insert montou',                      d.montado);
  ok('só em AMBIENCE e MUSIC',               d.canais.join()==='AMBIENCE,MUSIC');
  ok('e ele NÃO é o ganho do próprio canal', !d.proprioCanal);
  ok('as funções do estado existem',         d.temFuncoes);
}

console.log('\n2. OS TRÊS ESTADOS SOAM DIFERENTE (depois da rampa acabar)');
{
  const d=await p.evaluate(async()=>{
    const espera=ms=>new Promise(r=>setTimeout(r,ms));
    const r={};
    for(const e of ['CHEIO','RAREFEITO','OCO']){
      silenForcar(e);
      await espera(400);          /* rampa forçada é de 50 ms */
      r[e]=__foto();
    }
    return r;
  });
  const l=(k)=>console.log('    '+k.padEnd(10)+' AMBIENCE '+String(d[k].AMBIENCE).padEnd(6)
    +' · MUSIC '+String(d[k].MUSIC).padEnd(6)+' · leito '+String(d[k].leito).padEnd(8)
    +' · corte '+String(d[k].corte).padStart(4)+' Hz');
  ['CHEIO','RAREFEITO','OCO'].forEach(l);
  ok('afunda de cheio pra rarefeito',
     d.RAREFEITO.AMBIENCE<d.CHEIO.AMBIENCE*.6&&d.RAREFEITO.leito<d.CHEIO.leito*.6);
  ok('e de rarefeito pra oco afunda mais',
     d.OCO.AMBIENCE<d.RAREFEITO.AMBIENCE*.6&&d.OCO.leito<d.RAREFEITO.leito*.6);
  ok('o corte FECHA junto (mais longe, não só mais baixo)',
     d.OCO.corte<d.RAREFEITO.corte&&d.RAREFEITO.corte<d.CHEIO.corte);
  ok('e o mestre não é tocado (isso é o silencioSubito, outro bicho)',
     d.CHEIO.mestre===d.OCO.mestre);
}

console.log('\n3. O SUSTO NÃO É ABAFADO JUNTO');
{
  /* A primeira versao desta secao lia `AM.canais.SFX.gain`, que por
     desenho NUNCA e tocado pelo silencio — entao ela passava sempre,
     inclusive na regressao plantada em que eu DE PROPOSITO pus insert
     em SFX e HORROR. Assercao que nao pode falhar nao e assercao.
     O que vale e o ganho EFETIVO do caminho: o ganho do canal vezes o
     do insert, se houver insert. */
  const d=await p.evaluate(async()=>{
    const espera=ms=>new Promise(r=>setTimeout(r,ms));
    const efetivo=c=>{
      const g=AM.canais[c]?AM.canais[c].gain.value:0;
      const i=SILEN.nos[c]?SILEN.nos[c].gain.value:1;
      return +(g*i).toFixed(6);
    };
    const tira=()=>({SFX:efetivo('SFX'), HORROR:efetivo('HORROR'),
                     AMBIENCE:efetivo('AMBIENCE'), MUSIC:efetivo('MUSIC')});
    silenForcar('CHEIO'); await espera(300); const a=tira();
    silenForcar('OCO');   await espera(300); const b2=tira();
    return {a,b2, insertsIndevidos:['SFX','HORROR'].filter(c=>!!SILEN.nos[c])};
  });
  const l=c=>console.log('    '+c.padEnd(9)+' cheio '+String(d.a[c]).padEnd(9)
    +' → oco '+d.b2[c]+(d.a[c]===d.b2[c]?'   (intacto)':'   (abaixou)'));
  ['SFX','HORROR','AMBIENCE','MUSIC'].forEach(l);
  ok('nenhum insert foi parar em SFX ou HORROR', d.insertsIndevidos.length===0);
  ok('o ganho efetivo do SFX não muda no silêncio',    d.a.SFX===d.b2.SFX);
  ok('nem o do HORROR',                                d.a.HORROR===d.b2.HORROR);
  ok('enquanto o do ambiente muda mesmo',              d.b2.AMBIENCE<d.a.AMBIENCE*.3);
}

console.log('\n4. O ESTADO SEGUE O VALE E A PRESSÃO');
{
  const d=await p.evaluate(()=>{
    orqNovaNoite(true);
    const O=orqEstado();
    const r=[];
    /* pressao baixa: dentro do vale tem de dar RAREFEITO */
    try{ estadoExp().pressao=0.1; }catch(e){}
    for(let i=0;i<14;i++){
      orqTurno();
      const e=silencioEstado();
      r.push({t:orqEstado().turno, vale:e.emVale, alvo:e.alvo});
    }
    /* pressao alta: dentro do vale tem de dar OCO */
    orqNovaNoite(true);
    try{ estadoExp().pressao=0.9; }catch(e){}
    const r2=[];
    for(let i=0;i<14;i++){
      orqTurno();
      const e=silencioEstado();
      r2.push({t:orqEstado().turno, vale:e.emVale, alvo:e.alvo});
    }
    return {baixa:r, alta:r2};
  });
  const resumo=l=>{
    const dentro=[...new Set(l.filter(x=>x.vale).map(x=>x.alvo))];
    const fora=[...new Set(l.filter(x=>!x.vale).map(x=>x.alvo))];
    return {dentro,fora, nDentro:l.filter(x=>x.vale).length};
  };
  const B=resumo(d.baixa), A2=resumo(d.alta);
  console.log('    pressão baixa: dentro do vale → '+B.dentro.join('/')+' · fora → '+B.fora.join('/')
    +'  ('+B.nDentro+' turnos em vale)');
  console.log('    pressão alta:  dentro do vale → '+A2.dentro.join('/')+' · fora → '+A2.fora.join('/')
    +'  ('+A2.nDentro+' turnos em vale)');
  ok('fora do vale é sempre CHEIO',        B.fora.join()==='CHEIO'&&A2.fora.join()==='CHEIO');
  ok('com pressão baixa o vale é RAREFEITO', B.dentro.join()==='RAREFEITO');
  ok('com pressão alta o mesmo vale vira OCO', A2.dentro.join()==='OCO');
}

console.log('\n5. TEM TELL — O JOGADOR CONSEGUE EXPLICAR DEPOIS');
{
  /* DE NOVO O `limpar()`: ele nao apaga, marca o que passou com a
     classe `passado`. A primeira versao desta secao contava as falas
     com `p.fraco` e pegava as da secao 4 junto — dizia "entrou 0x" e
     ainda assim listava duas falas. Mesmo tropeco do caderno, no mesmo
     dia. Aqui so conta `p.fraco:not(.passado)`. */
  const d=await p.evaluate(()=>{
    limpar();
    SILEN.estado='CHEIO'; SILEN.avisado=-1;
    /* a ORDEM importa: `orqNovaNoite` zera a pressao da noite, entao
       botar a pressao antes dela nao vale nada. A primeira versao desta
       secao fazia isso e a trilha saiu inteira em RAREFEITO — o vale
       acontecia e nunca afundava. A secao 4 passava porque la a ordem
       estava certa por acaso. */
    orqNovaNoite(true);
    try{ estadoExp().pressao=0.9; }catch(e){}
    const trilha=[];
    let entrou=0, saiu=0;
    for(let i=0;i<20;i++){
      const antes=SILEN.estado;
      orqTurno();
      const dep=SILEN.estado;
      trilha.push((silencioEstado().emVale?'v':'-')+dep[0]);
      if(antes!=='OCO'&&dep==='OCO')entrou++;
      if(antes==='OCO'&&dep!=='OCO')saiu++;
    }
    const ditas=Array.from(T.querySelectorAll('p.fraco:not(.passado)'))
      .map(e=>e.textContent);
    const doSil=ditas.filter(t=>SILEN_FALAS.indexOf(t)>=0||SILEN_VOLTA.indexOf(t)>=0);
    const deEntrada=ditas.filter(t=>SILEN_FALAS.indexOf(t)>=0).length;
    const deVolta=ditas.filter(t=>SILEN_VOLTA.indexOf(t)>=0).length;
    return {entrou, saiu, doSil, deEntrada, deVolta, trilha:trilha.join(' ')};
  });
  console.log('    trilha (v=em vale · C/R/O = estado): '+d.trilha);
  console.log('    entrou no OCO '+d.entrou+'× · saiu '+d.saiu+'×'
    +' · falou de entrada '+d.deEntrada+'× · de volta '+d.deVolta+'×');
  d.doSil.forEach(t=>console.log('      · "'+t+'"'));
  ok('o vale de fato afundou no OCO',          d.entrou>0);
  ok('afundar no silêncio diz alguma coisa',   d.deEntrada>0);
  ok('e voltar também',                        d.deVolta>0);
  ok('uma fala por afundada, não mais',        d.deEntrada<=d.entrou);
  ok('uma fala por volta, não mais',           d.deVolta<=d.saiu);
}

console.log('\n6. O SILÊNCIO NÃO GASTA O GERADOR DO JOGO');
{
  /* Achado caro: a primeira versao escolhia a fala com `sortear`, que
     consome o gerador semeado compartilhado. Cada fala empurrava a
     sequencia um passo e TODO sorteio seguinte da noite mudava. O
     `dirteste` reprovou tres asserções; o build anterior passava nas
     mesmas tres. Coisa cosmetica nao gasta gerador de jogo. */
  const d=await p.evaluate(()=>{
    const ler=()=>S.rngEstado;
    SILEN.estado='CHEIO'; SILEN.avisado=-1;
    orqNovaNoite(true);
    try{ estadoExp().pressao=0.9; }catch(e){}
    /* anda ate cair num vale, entao chama o atualizador sozinho */
    let achou=false;
    for(let i=0;i<20&&!achou;i++){ orqTurno(); achou=!!silencioEstado().emVale; }
    const antes=ler();
    SILEN.estado='CHEIO'; SILEN.avisado=-1;
    const mudou=silenAtualizar();       /* isto tem de FALAR e nao gastar */
    const depois=ler();
    const falou=T.querySelectorAll('p.fraco:not(.passado)').length;
    return {antes, depois, mudou, achou, falou};
  });
  console.log('    estado do gerador antes '+d.antes+' · depois '+d.depois
    +' · o silêncio mudou pra '+d.mudou);
  ok('o teste chegou mesmo dentro de um vale', d.achou);
  ok('e o silêncio mexeu no estado',           d.mudou==='OCO'||d.mudou==='RAREFEITO');
  ok('sem consumir um passo do gerador',       d.antes===d.depois);
}

console.log('\n7. NADA QUEBROU');
{
  const d=await p.evaluate(()=>{
    const bruto=localStorage.getItem(CHAVE)||'';
    let campos=[];
    try{ campos=Object.keys(JSON.parse(bruto)); }catch(e){}
    return {temSave:!!bruto, sujou:campos.filter(k=>/^silen/i.test(k))};
  });
  console.log('    campos de silêncio gravados no save: '
    +(d.sujou.length?d.sujou.join(', '):'nenhum (o estado é derivado)'));
  ok('o bloco não inventou campo no save', d.sujou.length===0);
}
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
