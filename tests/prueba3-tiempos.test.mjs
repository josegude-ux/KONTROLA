import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../src/prueba3-tiempos.mjs",import.meta.url),"utf8");
function section(start,end){
 const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
 assert.ok(i>=0 && j>i,"No se encuentra el bloque "+start);
 return source.slice(i,j);
}

test("PRUEBA_3: al iniciar otra carga confirma el cierre y envía una sola asignación al servidor",async()=>{
 const calls=[],opened=[];
 const active=new Map([["anterior",{almacen:"COR_01_COR",operario_id:"op-a",estado:"en_preparacion",codigo:"LP24-001234"}]]);
 let confirmed=0;
 const fn=new Function("state","status","picker","confirm","command","W",
   section("async function beforeOpen(r,open){","async function reassign(r){")+"return beforeOpen;"
 )(active,()=> "Sin iniciar",async()=> "op-a",()=>{confirmed++;return true;},
   async (...args)=>{calls.push(args);return true;},"COR_01_COR");
 const next={id:"LP24-005678"};
 await fn(next,()=>opened.push(next.id));
 assert.equal(confirmed,1,"Debe pedir confirmación si ese operario tiene otra carga");
 assert.equal(calls.length,1,"El cierre y nuevo inicio dependen de una sola llamada de servidor");
 assert.equal(calls[0][0],next);
 assert.deepEqual(calls[0].slice(1),["iniciar","op-a",true]);
 assert.deepEqual(opened,[next.id]);
 assert.match(source,/client\.rpc\("visura_p3_comando",item\.args\)/,"El cliente debe delegar el cambio atómico en un RPC");
});

test("PRUEBA_3: controlada cierra por RPC; una finalizada no vuelve a cerrar",async()=>{
 const calls=[];
 let confirmCount=0;
 const fn=new Function("status","confirm","command",
   section("async function controlled(r){","function remoteOpen(r){")+"return controlled;"
 )(r=>r.estado==="finalizada"?"Finalizada":"En preparación",()=>{
   confirmCount++;return true;
 },async(...args)=>calls.push(args));
 const load={id:"LP24-009999"};
 await fn(load);
 assert.equal(confirmCount,1);
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],load);
 assert.equal(calls[0][1],"controlada");
 await fn({...load,estado:"finalizada"});
 assert.equal(calls.length,1,"No repetir cierres confirmados");
});

test("PRUEBA_3: reintentos de cola conservan el mismo UUID de operación",async()=>{
 const id="11111111-1111-4111-8111-111111111111";
 const queued={id,at:1,args:{p_operacion:id,p_tipo:"iniciar"}};
 const pending=new Map([[id,queued]]);
 const seen=[];
 const fn=new Function("navigator","pending","send","notice",
   "let busy=false;\n"+section("async function flush(){","async function picker(){")+"return flush;"
 )({onLine:true},pending,async item=>{
   seen.push(item.args.p_operacion);
   throw Error("Sin red");
 },()=>{});
 await fn();
 await fn();
 assert.deepEqual(seen,[id,id],"La cola debe reutilizar el identificador sin generar otro");
 assert.match(source,/p_operacion:crypto\.randomUUID\(\)/,"El UUID se genera al crear una operación");
 const command=section("async function command(r,type,operator=null,confirmation=false){","async function flush(){");
 assert.ok(command.indexOf("await saveCommand(item)")<command.indexOf("await send(item)"),
   "Guardar en IndexedDB antes de enviar");
 assert.match(source,/client\.rpc\("visura_p3_comando",item\.args\)/,
   "El reenvío debe usar los argumentos persistidos");
});
