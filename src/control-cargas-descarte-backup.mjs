// VISURA PREPARA · Preparación de respaldo íntegro, FASE 1.
// No se invoca desde la PWA. Sin escrituras; no modifica IndexedDB ni localStorage.
// Incluye las versiones PDF, revisiones, operarios y la cola offline PRUEBA_3.
import {descarteKey,scopeValido} from "./control-cargas-descarte-model.mjs";

const SCOPED_PREFIXES=[
 "control_cargas_prueba_integrada_2",
 "control_cargas_operarios_prueba_2",
 "visura_control_revision_v1",
 "visura_prepara_descarte_v1"
];
const LIMIT_BYTES=256*1024*1024; // Si se excede, abortar; JAMÁS exportar un respaldo parcial.
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
const asBytes=async value=>{
 if(value instanceof Uint8Array)return value;
 if(value instanceof ArrayBuffer)return new Uint8Array(value);
 if(typeof Blob!=="undefined"&&value instanceof Blob)return new Uint8Array(await value.arrayBuffer());
 throw Error("El original PDF no se puede leer: no es un Blob/ArrayBuffer");
};
function base64(bytes){
 if(typeof btoa!=="function")throw Error("Codificación base64 no disponible");
 const segments=[];
 for(let i=0;i<bytes.length;i+=24576)segments.push(btoa(String.fromCharCode(...bytes.subarray(i,i+24576))));
 return segments.join("");
}
function unbase64(value){
 if(typeof atob!=="function")throw Error("Decodificación base64 no disponible");
 const b=atob(value),data=new Uint8Array(b.length);
 for(let i=0;i<b.length;i++)data[i]=b.charCodeAt(i);
 return data;
}
export async function leerBaseSoloLectura(dbName,stores,{factory=globalThis.indexedDB}={}){
 if(!factory||typeof factory.databases!=="function")
  throw Error("No se puede garantizar lectura sin crear bases IndexedDB; respaldo detenido");
 const known=await factory.databases();
 if(!known.some(db=>db.name===dbName))return {exists:false,stores:[]};
 const db=await new Promise((resolve,reject)=>{
  const req=factory.open(dbName);
  req.onupgradeneeded=()=>{req.transaction?.abort();reject(Error("IndexedDB intentó actualizar versión"))};
  req.onerror=()=>reject(req.error||Error("No se puede abrir IndexedDB"));
  req.onsuccess=()=>resolve(req.result);
 });
 try{
  const result=[];
  for(const storeName of stores){
   if(!db.objectStoreNames.contains(storeName)){
    result.push({name:storeName,exists:false,entries:[]});continue;
   }
   const records=await new Promise((resolve,reject)=>{
    const tx=db.transaction(storeName,"readonly"),store=tx.objectStore(storeName);
    const keysReq=store.getAllKeys(),valuesReq=store.getAll();
    tx.oncomplete=()=>resolve(keysReq.result.map((key,i)=>({key,value:valuesReq.result[i]})));
    tx.onerror=()=>reject(tx.error||Error("Lectura IndexedDB fallida"));
    tx.onabort=()=>reject(tx.error||Error("Lectura IndexedDB cancelada"));
   });
   result.push({name:storeName,exists:true,entries:records});
  }
  return {exists:true,stores:result};
 }finally{db.close();}
}
export async function prepararCopiaIntegra({scope,storage,readDatabase=leerBaseSoloLectura,subtle=globalThis.crypto?.subtle,now=new Date().toISOString()}){
 if(!scopeValido(scope))throw Error("Ámbito inválido");
 if(!storage||typeof storage.getItem!=="function"||typeof readDatabase!=="function"||!subtle)
  throw Error("Falta un lector o SHA-256 seguro");
 descarteKey(scope);
 const raw=Object.create(null);
 for(const prefix of SCOPED_PREFIXES){
  const k=prefix+scope;
  raw[k]=storage.getItem(k); // null significa ausencia; no inventar registros.
 }
 const dbs=[
  {name:"control_cargas_originales_prueba_integrada_2"+scope,stores:["originales"]},
  {name:"visura_p3_tiempos_"+scope.slice("_visura_".length),stores:["cola","cache"]}
 ];
 const documentEntries=[],dbEntries=[],files=[];
 let totalBytes=0;
 const digest=async data=>hex(new Uint8Array(await subtle.digest("SHA-256",data)));
 for(const spec of dbs){
  const db=await readDatabase(spec.name,spec.stores);
  if(!db||typeof db.exists!=="boolean"||!Array.isArray(db.stores))
   throw Error("Respuesta inválida del lector IndexedDB");
  const present=new Map(db.stores.map(s=>[s.name,s]));
  for(const storeName of spec.stores){
   const store=present.get(storeName);
   if(db.exists&&(!store||store.exists!==true))
    throw Error("Almacén IndexedDB obligatorio ausente: "+spec.name+"/"+storeName);
   for(const entry of store?.entries??[]){
    const key=String(entry.key);
    if(spec.stores[0]==="originales"){
     const bytes=await asBytes(entry.value);
     if(bytes.length===0)throw Error("PDF original vacío: "+key);
     totalBytes+=bytes.byteLength;
     if(totalBytes>LIMIT_BYTES)throw Error("Respaldo supera el límite de memoria; no se genera archivo parcial");
     const sha=await digest(bytes);
     const v=entry.value;
     files.push({database:spec.name,store:storeName,key,sha256:sha,bytes:bytes.length});
     documentEntries.push({database:spec.name,store:storeName,key,sha256:sha,bytes:bytes.length,
      name:typeof v?.name==="string"?v.name:null,type:typeof v?.type==="string"?v.type:null,
      lastModified:Number.isFinite(v?.lastModified)?v.lastModified:null,base64:base64(bytes)});
    }else{
     const json=JSON.stringify(entry.value);
     if(json===undefined)throw Error("Valor de cola/caché imposible de exportar: "+key);
     totalBytes+=json.length;
     if(totalBytes>LIMIT_BYTES)throw Error("Respaldo excede límite de memoria; no se genera archivo parcial");
     dbEntries.push({database:spec.name,store:storeName,key,value:JSON.parse(json),
      sha256:await digest(new TextEncoder().encode(json))});
    }
   }
  }
  if(!db.exists&&spec.stores[0]==="originales"&&storage.getItem("control_cargas_prueba_integrada_2"+scope))
   throw Error("No hay base de originales. No se acredita copia íntegra de las cargas locales");
 }
 const loads=JSON.parse(raw["control_cargas_prueba_integrada_2"+scope]||"[]");
 if(!Array.isArray(loads))throw Error("Lista local inválida");
 const originals=new Set(documentEntries.filter(e=>e.store==="originales").map(e=>e.key));
 const missing=loads.filter(x=>typeof x?.id==="string"&&!originals.has(x.id)).map(x=>x.id);
 if(missing.length)throw Error("Originales PDF no recuperables para: "+missing.slice(0,8).join(", "));
 const payload={schema:"visura-prepara-respaldo-local-v1",scope,creado_en:now,
  localStorage:raw,indexedDbFiles:documentEntries,indexedDbRecords:dbEntries};
 const json=JSON.stringify(payload),sha256=await digest(new TextEncoder().encode(json));
 return {payload,manifest:{schema:"visura-prepara-respaldo-manifiesto-v1",sha256,
  originals:files,registrosIdb:dbEntries.length,cargas:loads.length,
  alcance:"solo datos locales asociados al scope; los registros remotos se respaldan por separado",
  completo:true,soloLectura:true,aplicado:false}};
}
export async function comprobarCopiaIntegra({payload,manifest,subtle=globalThis.crypto?.subtle}){
 if(!subtle||!manifest||!payload||manifest.completo!==true)return false;
 const hash=async bytes=>hex(new Uint8Array(await subtle.digest("SHA-256",bytes)));
 if(await hash(new TextEncoder().encode(JSON.stringify(payload)))!==manifest.sha256)return false;
 for(const file of payload.indexedDbFiles||[]){
  const raw=unbase64(file.base64);
  if(raw.length!==file.bytes||await hash(raw)!==file.sha256)return false;
 }
 return true;
}
