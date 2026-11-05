/** VISURA PREPARA 15 / Recepción R1/L4. Servidor ESTÁTICO SOLO LOOPBACK.
 * Sin endpoints de escritura, credenciales de empresa, Business Central ni Supabase.
 * Iniciar: node lab/servidor-recepcion.mjs 4175
 * Abrir: http://127.0.0.1:4175/?visura15_recepcion_lab=1
 */
import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.argv[2]||4175);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Puerto LAB fuera de rango');
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml',
 '.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  const send=(code,message)=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(message);};
  if(req.method!=='GET'&&req.method!=='HEAD')return send(405,'Servidor LAB SOLO lectura');
  let url;try{url=new URL(req.url,'http://127.0.0.1');}catch{return send(400,'URL inválida');}
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return send(400,'Ruta inválida');}
  if(pathname==='/'||pathname==='')pathname='/index.html';
  if(pathname.includes('\\')||pathname.split('/').includes('..')||pathname.startsWith('/.'))return send(403,'Ruta restringida');
  const path=resolve(root,pathname.slice(1));
  if(path!==root&&!path.startsWith(root+sep))return send(403,'Ruta fuera de LAB');
  if(!types[extname(path)])return send(403,'Tipo de archivo no expuesto');
  if(path.includes('/RESPALDO_')||path.includes('/tests/')||path.includes('/scripts/')||path.includes('/.github/'))return send(403,'Archivo reservado');
  try{
    const actual=await realpath(path);
    if(!actual.startsWith(root+sep))return send(403,'Enlace externo no permitido');
    const info=await stat(actual);if(!info.isFile())return send(404,'No encontrado');
    const content=await readFile(actual);
    res.writeHead(200,{'Content-Type':types[extname(actual)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:content);
  }catch{return send(404,'No encontrado');}
});
server.listen(port,'127.0.0.1',()=>{
  console.log(`VISURA 15 LAB recepción sintética — http://127.0.0.1:${port}/?visura15_recepcion_lab=1`);
  console.log('SIN conexiones empresariales, SIN endpoints de escritura. Ctrl+C para detener.');
});
