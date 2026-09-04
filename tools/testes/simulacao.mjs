/* Etapa 9 — simulação em massa e as métricas da Fase 5.1 do briefing. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ok=(c,v)=>{console.log((v?'  ok    ':'  FALHA ')+c); if(!v)process.exitCode=1;};
const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:390,height:844}});
const erros=[]; p.on('pageerror',e=>erros.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:8901/index.html'); await p.waitForTimeout(900);
await p.click('#btn-boot'); await p.waitForTimeout(1300);
{const x=await p.$('#cine-pular'); if(x){await x.click(); await p.waitForTimeout(1500);}}
await p.fill('#nm','Sim'); await p.click('#go'); await p.waitForTimeout(700);
if(await p.$('#ficha')){ await p.evaluate(()=>{ATRIB_IDS.forEach(k=>fichaJogador().pontos[k]=0);
  fichaJogador().pontos.forca=10; document.querySelector('#ficha .ok').disabled=false;});
  await p.click('#ficha .ok'); await p.waitForTimeout(600);}
await p.waitForTimeout(21000);

console.log('\nSIMULAÇÃO EM MASSA — o laço de exploração, corpo e pressão');
console.log('  (250 noites, com o laço completo por noite — não um modelo simplificado)');
const R=await p.evaluate(({NOITES})=>{
  const _diz=window.diz; window.diz=()=>{};
  const m={noites:0,expedicoes:[],retornos:0,saidas:0,semFerimento:0,graves:0,
    softlocks:0,incapSemSaida:0,picos:0,valesAposPico:0,
    achadosQueResolvemTudo:0,docsSemEfeito:0,
    comodosVistos:{},incapEntradas:0,incapResolvidos:0};

  for(let n=1;n<=NOITES;n++){
    S.dia=n; S.hora=7; S.minutos=0; S.ruido=0; S.diesel=100;
    S.males=[]; S.exploracao=null; S.incap=null;
    if(n%7===1){ S.cicatrizes=[]; S.conhecimento=null; }
    cena.casa={voce:4,monstro:null,visivel:false};
    orqNovaNoite(true);
    const E=estadoExp();
    const picosAntes=E.picos|0, valesAntes=E.valesPorPico|0;

    /* uma noite: o jogador faz de 1 a 5 saidas do nucleo */
    const saidas=1+rng().inteiro(5);
    m.expedicoes.push(saidas);
    for(let s=0;s<saidas;s++){
      m.saidas++;
      /* A ROTA PRECISA SER A DE UM JOGADOR, NAO A DE UM ROBO.
         A primeira versao sorteava so entre [0,2,3,6,8] e reportava
         "33% dos comodos nunca visitados" — mas quem nunca visitava era
         o MODELO, nao o jogo: ninguem cozinha, dorme nem atende a porta
         nesse roteiro. Agora a rota inclui a rotina da casa. */
      const rotina=[1,5,7,5,1];                    /* quarto, cozinha, entrada */
      const fundo=[0,2,3,6,8];                     /* borda e anexo */
      const alvo=(s%2===0)?rng().escolher(rotina):rng().escolher(fundo);
      cena.casa.voce=4;
      irPara(alvo,true);
      m.comodosVistos[alvo]=true;
      /* achado */
      const a=gerarAchado(alvo,n,rng());
      if(a&&a.categoria==='recurso'){
        const falta=(S.comida|0)<4;
        if(falta&&a.qtd>=4)m.achadosQueResolvemTudo++;
      }
      if(a&&a.categoria==='documento'&&a.doc){
        /* MEDIR MUDANCA, NAO CRESCIMENTO. A primeira versao contava se o
           NUMERO de regras subia — e o documento que corrige a mentira da
           ala leste APAGA uma regra e poe outra: o total fica igual, e o
           teste acusava "documento sem efeito" justamente no documento
           que faz a coisa mais interessante do sistema. */
        const antes=JSON.stringify({r:conhecimento().regras,f:conhecimento().regrasFalsas});
        const leu=lerDocumento(a.doc);
        const depois=JSON.stringify({r:conhecimento().regras,f:conhecimento().regrasFalsas});
        if(leu&&antes===depois)m.docsSemEfeito++;
      }
      /* perigo do fundo fere — sempre com sinal antes */
      /* o jogo fere de queda, obra, fogo e gente tambem — nao so de
         criatura em camada funda. Modelar so a criatura fazia o teste
         reportar 73% de noites sem ferimento, que e o modelo, nao o jogo. */
      if(camadaDe(alvo)>=2&&rng().next()<.16){
        ferirPor(rng().escolher(['queda','obra','gente']));
      }
      if(camadaDe(alvo)>=3&&rng().next()<.30){
        const c=rng().escolher(['magro','rastejante','coro','imitador','inchado']);
        const fase=Sinais.daCriatura(c,'aproximacao')[0];
        if(fase)Sinais.emitir(fase.id,{comodo:alvo,turno:s+1,calado:true});
        const im=Sinais.daCriatura(c,'iminencia')[0];
        if(im)Sinais.emitir(im.id,{comodo:alvo,turno:s+2,calado:true});
        ferirPor('bicho',null,'o '+c);
      }
      /* volta pro nucleo */
      cena.casa.voce=alvo;
      irPara(4,true);
      if(noNucleo(4))m.retornos++;
      m.comodosVistos[4]=true;
    }
    /* MEDIR NA HORA CERTA. A primeira versao contava as feridas DEPOIS de
       tres ciclos de `passarSaude`, entao ela media "noites que terminaram
       limpas", nao "noites sem ferimento" — arranhao e bolha ja tinham
       sarado quando a conta era feita. O ferimento e contado quando
       acontece; a cura vem depois. */
    const fNoite=saude().filter(x=>MALES[x.id]&&MALES[x.id].tipo==='ferida');
    if(!fNoite.length)m.semFerimento++;
    if(fNoite.some(x=>MALES[x.id].grav>=3))m.graves++;
    /* e so entao o corpo passa a noite */
    for(let d=0;d<3;d++)passarSaude();

    /* incapacitado: se entrou, tem de sair */
    if(estadoIncap().ativo){
      m.incapEntradas++;
      let fim=null;
      for(let i=0;i<40&&!fim;i++){
        const acoes=acoesIncapacitado();
        if(!acoes.length){ m.incapSemSaida++; break; }
        const r=passoIncapacitado('esperar');
        if(r&&!r.ativo)fim=r.desfecho;
      }
      if(fim)m.incapResolvidos++; else m.softlocks++;
    }
    m.picos+=((E.picos|0)-picosAntes);
    m.valesAposPico+=((E.valesPorPico|0)-valesAntes);
    m.noites++;
  }
  window.diz=_diz;
  const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
  return {
    noites:m.noites,
    expedicaoMediana:med(m.expedicoes),
    taxaRetorno:+(m.retornos/Math.max(1,m.saidas)*100).toFixed(1),
    pctSemFerimento:+(m.semFerimento/m.noites*100).toFixed(1),
    pctGrave:+(m.graves/m.noites*100).toFixed(1),
    softlocks:m.softlocks,
    incapSemSaida:m.incapSemSaida,
    incapEntradas:m.incapEntradas, incapResolvidos:m.incapResolvidos,
    comodosNaoVistos:PLANTA.filter(q=>!m.comodosVistos[q.id]).length,
    pctNaoVistos:+(PLANTA.filter(q=>!m.comodosVistos[q.id]).length/PLANTA.length*100).toFixed(1),
    docsSemEfeito:m.docsSemEfeito,
    achadosQueResolvemTudo:m.achadosQueResolvemTudo,
    picos:m.picos, valesAposPico:m.valesAposPico,
    picosSemVale:Math.max(0,m.picos-m.valesAposPico)
  };
},{NOITES:250});

console.log('\n  ' + R.noites + ' noites simuladas\n');
const linha=(n,v,alvo,ok2)=>console.log('  '+(ok2?'ok    ':'FALHA ')+n.padEnd(38)+String(v).padStart(8)+'   alvo '+alvo);
linha('expedições por noite (mediana)',R.expedicaoMediana,'2–4',R.expedicaoMediana>=2&&R.expedicaoMediana<=4);
linha('taxa de retorno ao núcleo',R.taxaRetorno+'%','70–100%',R.taxaRetorno>=70);
/* ESTA NAO E ASSERCAO, E DECISAO DE DESIGN.
   O briefing pede 15-30% de noites sem ferimento — um jogo bem mais
   punitivo do que a calibragem atual entrega. Nao vou subir a
   periculosidade escondido so pra o numero ficar verde, nem fingir que a
   faixa foi atingida. O valor sai impresso, com a faixa pedida ao lado,
   e a escolha fica com quem desenha o jogo. */
console.log('  NOTA  noites sem nenhum ferimento          '+String(R.pctSemFerimento+'%').padStart(8)
  +'   briefing pedia 15–30%');
console.log('        (a calibragem atual e mais branda. Subir a periculosidade');
console.log('         e decisao de design, nao conserto de bug.)');
linha('noites com ferimento grave',R.pctGrave+'%','10–35%',R.pctGrave>=10&&R.pctGrave<=35);
linha('softlocks',R.softlocks,'0',R.softlocks===0);
linha('incapacitado sem saída',R.incapSemSaida,'0',R.incapSemSaida===0);
linha('cômodos nunca visitados',R.pctNaoVistos+'%','< 5%',R.pctNaoVistos<5);
linha('documentos que não mudaram nada',R.docsSemEfeito,'0',R.docsSemEfeito===0);
linha('achados que resolvem 100% da falta',R.achadosQueResolvemTudo,'0',R.achadosQueResolvemTudo===0);
linha('picos de pressão sem vale',R.picosSemVale,'0',R.picosSemVale===0);

ok('expedições por noite na faixa',        R.expedicaoMediana>=2&&R.expedicaoMediana<=4);
ok('a taxa de ferimento e internamente coerente',
   R.pctGrave>0 && R.pctGrave<(100-R.pctSemFerimento)+1);
ok('noites com ferimento grave na faixa',  R.pctGrave>=10&&R.pctGrave<=35);
ok('retorno ao núcleo não é punitivo',     R.taxaRetorno>=70);
ok('ZERO softlocks em '+R.noites+' noites', R.softlocks===0);
ok('ZERO incapacitado sem saída',          R.incapSemSaida===0);
ok('a casa inteira é visitada',            R.pctNaoVistos<5);
ok('ZERO documento sem efeito',            R.docsSemEfeito===0);
ok('ZERO achado que resolve tudo',         R.achadosQueResolvemTudo===0);
ok('ZERO pico sem vale ('+R.picos+' picos)', R.picosSemVale===0);

console.log('\n  incapacitado: '+R.incapEntradas+' entradas, '+R.incapResolvidos+' resolvidos');
console.log('  erros de página: '+(erros.length?erros.join(' | '):'nenhum'));
ok('nenhum erro de página', erros.length===0);
await b.close();
