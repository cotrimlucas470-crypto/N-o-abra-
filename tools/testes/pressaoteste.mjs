/* §42 — pressão, luz e exposição. Etapa 4 de 9. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Pressao'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\n1. A DIFICULDADE NAO FOI SOMBREADA');
{
  const d=await p.evaluate(()=>({dif:pressao(), exp:pressaoAgora(),
    difEhOutra:pressao()>=1, expEhFracao:pressaoAgora()>=0&&pressaoAgora()<=1}));
  console.log('    pressao() da dificuldade = '+d.dif.toFixed(2)+' · pressaoAgora() da exploração = '+d.exp);
  ok('pressao() continua sendo a da dificuldade', d.difEhOutra);
  ok('e a da exploracao e uma fracao separada',   d.expEhFracao);
}

console.log('\n2. SOBE FORA DO NUCLEO, DECAI SO NO NUCLEO');
{
  const d=await p.evaluate(()=>{
    S.exploracao=null; estadoExp().pressao=0;
    cena.casa={voce:4,monstro:null,visivel:false};
    const linha=[];
    [6,6,8,6,8].forEach(id=>{ cena.casa.voce=(id===6?3:7); irPara(id,true);
      linha.push({onde:PLANTA[id].nome,p:+pressaoAgora().toFixed(3)}); });
    const pico=pressaoAgora();
    /* volta pro nucleo varias vezes */
    for(let i=0;i<4;i++){ cena.casa.voce=5; irPara(4,true); }
    const depoisNucleo=pressaoAgora();
    /* e andar DENTRO do nucleo nao sobe */
    const a=pressaoAgora(); cena.casa.voce=4; irPara(1,true); const b2=pressaoAgora();
    return {linha,pico:+pico.toFixed(3),depoisNucleo:+depoisNucleo.toFixed(3),
      dentroSobe:b2>a};
  });
  d.linha.forEach(l=>console.log('    '+l.onde.padEnd(10)+l.p));
  ok('entrar em anexo sobe a pressao',  d.pico>0);
  ok('voltar ao nucleo alivia',         d.depoisNucleo<d.pico);
  ok('andar dentro do nucleo nao sobe', d.dentroSobe===false);
}

console.log('\n3. OS QUATRO DEGRAUS, E A CASA FALA UMA VEZ POR SUBIDA');
{
  const d=await p.evaluate(()=>{
    S.exploracao=null; estadoExp().pressao=0;
    const ditas=[]; const _diz=window.diz;
    window.diz=function(t,c){ ditas.push(String(t)); };
    const graus=[];
    for(let i=0;i<26;i++){ mexerPressao(.05); graus.push(grauDePressao()); }
    window.diz=_diz;
    const porGrau={};
    graus.forEach(g=>porGrau[g]=(porGrau[g]||0)+1);
    return {graus:[...new Set(graus)], falas:ditas.length, ditas:ditas.slice(0,4),
      final:+pressaoAgora().toFixed(2)};
  });
  d.ditas.forEach(t=>console.log('    "'+t.slice(0,72)+'"'));
  ok('os quatro degraus sao atravessados', d.graus.join()==='0,1,2,3');
  ok('a casa fala uma vez por degrau',     d.falas>=3&&d.falas<=6);
  ok('e nunca mostra numero',              !d.ditas.some(t=>/\d+\s*%|0\.\d/.test(t)));
}

console.log('\n4. PICO ABRE CREDITO, E TODO PICO TEM VALE DEPOIS');
{
  const d=await p.evaluate(()=>{
    S.exploracao=null; estadoExp().pressao=0;
    orqNovaNoite(true); const O=orq(); O.turno=5;
    const valesAntes=O.vales.length;
    const _diz=window.diz; window.diz=()=>{};
    mexerPressao(.85);                       /* cruza 0.8 */
    const abriu={pico:estadoExp().picoAberto, credito:O.creditoPressao|0};
    mexerPressao(-.4);                       /* cai abaixo de 0.6 */
    window.diz=_diz;
    const O2=orq();
    return {abriu, valesAntes, valesDepois:O2.vales.length,
      picoFechado:!estadoExp().picoAberto,
      valeNovoEhDePico:O2.vales.some(v=>v.dePico),
      picos:estadoExp().picos, valesPorPico:estadoExp().valesPorPico,
      creditoZerado:(O2.creditoPressao|0)===0};
  });
  console.log('    '+JSON.stringify(d));
  ok('cruzar 0.8 abre o pico',              d.abriu.pico===true);
  ok('e da credito ao orquestrador',        d.abriu.credito>0);
  ok('cair abaixo de 0.6 fecha o pico',     d.picoFechado);
  ok('TODO pico gera um vale',              d.valesPorPico===d.picos);
  ok('e o vale entra na lista do §31',      d.valesDepois===d.valesAntes+1&&d.valeNovoEhDePico);
  ok('o credito nao sobra depois do vale',  d.creditoZerado);
}

console.log('\n5. LUZ: ENXERGAR CUSTA, O ESCURO CUSTA OUTRA COISA');
{
  const d=await p.evaluate(()=>{
    S.males=[];
    const orig=window.comodoAceso;
    window.comodoAceso=()=>true;   const aceso=custoDeEntrada(6,3);
    window.comodoAceso=()=>false;  const escuro=custoDeEntrada(6,3);
    window.comodoAceso=orig;
    return {aceso:{luz:aceso.luz,san:aceso.sanidade,exp:aceso.exposicao},
      escuro:{luz:escuro.luz,san:escuro.sanidade,exp:escuro.exposicao,marcado:!!escuro.escuro},
      semZeroDeclarado:aceso.porQueZero===undefined};
  });
  console.log('    aceso  '+JSON.stringify(d.aceso));
  console.log('    escuro '+JSON.stringify(d.escuro));
  ok('comodo aceso queima diesel',           d.aceso.luz>0);
  ok('no escuro nao custa recurso',          d.escuro.luz===0);
  ok('mas custa mais sanidade',              d.escuro.san<d.aceso.san);
  ok('luz e exposicao deixaram de ser zero declarado', d.semZeroDeclarado);
  ok('exposicao cobra de verdade',           d.aceso.exp>0);
}
{
  const d=await p.evaluate(()=>{
    S.diesel=100; S.exploracao=null;
    const orig=window.comodoAceso; window.comodoAceso=()=>true;
    cena.casa={voce:3,monstro:null,visivel:false};
    for(let i=0;i<6;i++){ cena.casa.voce=(i%2?3:7); irPara(6,true); }
    window.comodoAceso=orig;
    return {diesel:+S.diesel.toFixed(2)};
  });
  ok('andar aceso gasta diesel de verdade ('+d.diesel+')', d.diesel<100);
}

console.log('\n6. EXPOSICAO: A CASA ACORDA COM O QUE VIU');
{
  const d=await p.evaluate(()=>{
    S.exploracao=null; const E=estadoExp();
    cena.casa={voce:4,monstro:null,visivel:false};
    for(let i=0;i<10;i++){ cena.casa.voce=(i%2?3:7); irPara(6,true); }
    const at=E.atencaoDaCasa;
    S.dia=6;
    const O=orqNovaNoite(true);
    const depois=estadoExp().atencaoDaCasa;
    /* casa quieta, mesma noite, pra comparar */
    S.exploracao=null; estadoExp().atencaoDaCasa=0; S.dia=6;
    const O2=orqNovaNoite(true);
    return {atencao:+at.toFixed(3), extra:O.porAtencao|0,
      orcAcordada:O.orcamentoNoite, orcQuieta:O2.orcamentoNoite,
      esfriou:depois<at, teto:ORQ_CFG.orcamentoTeto};
  });
  console.log('    atenção '+d.atencao+' → +'+d.extra+' de orçamento ('+d.orcQuieta+' → '+d.orcAcordada+')');
  ok('explorar fundo acorda a casa',         d.atencao>0);
  ok('e a noite seguinte tem mais orcamento', d.orcAcordada>d.orcQuieta);
  ok('sem furar o teto do §31',              d.orcAcordada<=d.teto);
  ok('a atencao esfria sozinha',             d.esfriou);
}

console.log('\n7. QUATRO PERFIS DE JOGADOR, UM DIA CADA');
{
  const d=await p.evaluate(()=>{
    const _diz=window.diz; window.diz=()=>{};
    const rotas={
      caseiro:      [5,4,1,4,5,4,1,4,5,4],
      trabalhador:  [3,4,2,4,3,4,2,5,4,3,4,2],
      fucador:      [4,5,2,4,3,6,3,4,1,4,5,2,6,4],
      obsessivo:    [6,3,6,4,8,7,8,4,6,3,6,4,8,7,8,4]
    };
    const out={};
    Object.entries(rotas).forEach(([nome,rota])=>{
      S.exploracao=null; S.diesel=100; S.hora=7; S.minutos=0; S.ruido=0; S.males=[];
      cena.casa={voce:4,monstro:null,visivel:false};
      const orig=window.comodoAceso; window.comodoAceso=()=>true;
      rota.forEach(id=>irPara(id,true));
      window.comodoAceso=orig;
      out[nome]={min:(S.hora-7)*60+(S.minutos|0), p:+pressaoAgora().toFixed(2),
        grau:grauDePressao(), at:+(estadoExp().atencaoDaCasa||0).toFixed(2),
        picos:estadoExp().picos|0};
    });
    window.diz=_diz;
    return out;
  });
  Object.entries(d).forEach(([k,v])=>console.log('    '+k.padEnd(13)
    +v.min+'min · pressão '+v.p+' (grau '+v.grau+') · atenção '+v.at+' · picos '+v.picos));
  ok('quem fica em casa nao sente pressao',        d.caseiro.grau===0&&d.caseiro.p<.1);
  ok('quem trabalha nas bordas sente pouco',       d.trabalhador.grau<=1);
  ok('quem desce ao porao de vez em quando sente', d.fucador.grau>=1);
  ok('quem vive no fundo chega no ultimo degrau',  d.obsessivo.grau===3&&d.obsessivo.picos>=1);
  ok('e a curva e monotona entre os perfis',
     d.caseiro.p<d.trabalhador.p&&d.trabalhador.p<d.fucador.p&&d.fucador.p<d.obsessivo.p);
  ok('nenhum perfil come o dia so andando',        Object.values(d).every(v=>v.min<300));
}

console.log('\n8. NADA QUEBROU');
console.log('    erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
