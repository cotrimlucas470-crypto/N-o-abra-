import http from 'http'; import fs from 'fs'; import path from 'path';
const RAIZ=process.argv[2]||'/home/user/N-o-abra-';
const PORTA=+(process.argv[3]||8899);
const TIPO={'.html':'text/html;charset=utf-8','.js':'text/javascript','.mjs':'text/javascript',
 '.mp3':'audio/mpeg','.mp4':'video/mp4','.png':'image/png','.json':'application/json',
 '.webm':'video/webm','.css':'text/css'};
const calar=e=>{ if(e&&['ECONNRESET','EPIPE','ERR_STREAM_PREMATURE_CLOSE'].includes(e.code))return;
  console.error('servidor:',e&&e.message); };
process.on('uncaughtException',calar);
http.createServer((q,s)=>{
  s.on('error',calar); q.on('error',calar);
  const f=path.join(RAIZ,decodeURIComponent(q.url.split('?')[0]));
  if(!f.startsWith(RAIZ))return s.writeHead(403).end();
  fs.stat(f,(e,st)=>{
    if(e||!st.isFile())return s.writeHead(404).end('nao achei '+q.url);
    const t=TIPO[path.extname(f)]||'application/octet-stream';
    const faixa=q.headers.range;
    if(faixa){
      const m=/bytes=(\d*)-(\d*)/.exec(faixa);
      const ini=m[1]?+m[1]:0, fim=m[2]?+m[2]:st.size-1;
      s.writeHead(206,{'Content-Type':t,'Accept-Ranges':'bytes',
        'Content-Range':`bytes ${ini}-${fim}/${st.size}`,'Content-Length':fim-ini+1});
      const r=fs.createReadStream(f,{start:ini,end:fim}); r.on('error',calar);
      return r.pipe(s);
    }
    s.writeHead(200,{'Content-Type':t,'Content-Length':st.size,'Accept-Ranges':'bytes'});
    const r=fs.createReadStream(f); r.on('error',calar); r.pipe(s);
  });
}).listen(PORTA,()=>console.log('servindo '+RAIZ+' em http://127.0.0.1:'+PORTA));
