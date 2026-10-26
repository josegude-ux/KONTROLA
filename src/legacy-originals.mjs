// Inventario estrictamente de lectura del almacenamiento local del Control de Cargas original.
// Solo funciona en el MISMO origen y contenedor de almacenamiento. En iOS las PWA pueden
// estar aisladas de Safari y unas de otras. No convierte la ausencia en pérdida de archivos.
const DATABASE="control_cargas_movil_originales",STORE="originales";
const CODE=/^LP[0-9]{2}-[0-9]{4,6}$/;
const REVISION=/^(LP[0-9]{2}-[0-9]{4,6})::([a-f0-9]{64})$/i;
export function clasificarClaveOriginal(key){
  if(typeof key!=="string")return {tipo:"desconocida",codigo:null};
  if(CODE.test(key))return {tipo:"vigente",codigo:key};
  const match=REVISION.exec(key);
  if(match)return {tipo:"version",codigo:match[1],huellaEnClave:match[2].toLowerCase()};
  return {tipo:"desconocida",codigo:null};
}
export function resumirClavesOriginales(keys=[]){
  const rows=keys.map(key=>({clave:key,...clasificarClaveOriginal(key)}));
  const active=new Set(rows.filter(x=>x.tipo==="vigente").map(x=>x.codigo));
  const versions=new Map();
  for(const row of rows.filter(x=>x.tipo==="version")){
    versions.set(row.codigo,(versions.get(row.codigo)||0)+1);
  }
  return {total:rows.length,vigentes:active.size,versiones:rows.filter(x=>x.tipo==="version").length,
    desconocidas:rows.filter(x=>x.tipo==="desconocida").length,
    codigos:[...new Set([...active,...versions.keys()])].sort(),
    porCarga:[...new Set([...active,...versions.keys()])].sort()
      .map(codigo=>({codigo,vigente:active.has(codigo),versiones:versions.get(codigo)||0}))};
}
export function inventariarOriginalesLocales(indexedDb=globalThis.indexedDB){
  if(!indexedDb?.open)return Promise.resolve({
    disponible:false,razon:"Este navegador no permite consultar IndexedDB."
  });
  return new Promise((resolve,reject)=>{
    let upgrade=false,finished=false;
    const done=value=>{if(!finished){finished=true;resolve(value);}};
    const fail=error=>{if(!finished){finished=true;reject(error instanceof Error?error:Error("No se pudo leer el almacén local."));}};
    let request;
    try{request=indexedDb.open(DATABASE);}catch(error){fail(error);return;}
    request.onupgradeneeded=()=>{
      // Si la base NO EXISTE, abortar el alta: jamás crear una BD nueva.
      upgrade=true;request.transaction?.abort();
    };
    request.onerror=()=>{
      if(upgrade)return done({disponible:false,razon:"No existe ese almacén local en este navegador o PWA. Puede seguir en el móvil original."});
      fail(request.error||Error("No se pudo abrir IndexedDB."));
    };
    request.onsuccess=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE)){
        db.close();done({disponible:false,razon:"La base local no contiene el almacén de PDF esperado."});return;
      }
      let rows=[],truncado=false,contador=0;
      const tx=db.transaction(STORE,"readonly");
      tx.oncomplete=()=>{
        db.close();
        done({disponible:true,cantidad:contador,truncado,...resumirClavesOriginales(rows),
          claves:rows.filter(key=>clasificarClaveOriginal(key).tipo!=="desconocida")
            .map(key=>({clave:key,...clasificarClaveOriginal(key)})),
          aviso:"El inventario lee solo las claves. Para guardar un PDF se requiere pulsar su botón expresamente; no se envía a ningún servidor."});
      };
      tx.onerror=()=>{db.close();fail(tx.error||Error("Error al consultar originales locales."));};
      tx.onabort=()=>{db.close();fail(tx.error||Error("Lectura interrumpida."));};
      const cursorRequest=tx.objectStore(STORE).openKeyCursor();
      cursorRequest.onerror=()=>fail(cursorRequest.error);
      cursorRequest.onsuccess=()=>{
        const cursor=cursorRequest.result;
        if(!cursor)return;
        contador++;
        if(rows.length<5000)rows.push(cursor.key);
        else truncado=true;
        cursor.continue();
      };
    };
  });
}


// Recuperación solicitada expresamente: lee UN PDF de IndexedDB con transacción
// READONLY, verifica la cabecera y su SHA-256 antes de ofrecer una copia local.
// Nunca elimina la entrada antigua ni la sube a un servicio.
export async function recuperarPdfOriginalLocal(
  clave,indexedDb=globalThis.indexedDB,cryptoApi=globalThis.crypto
){
  const parsed=clasificarClaveOriginal(clave);
  if(parsed.tipo==="desconocida")throw Error("Clave de PDF no válida.");
  if(!indexedDb?.open)throw Error("IndexedDB no está disponible en esta aplicación.");
  const blob=await new Promise((resolve,reject)=>{
    let request,upgrade=false;
    try{request=indexedDb.open(DATABASE);}catch(error){reject(error);return;}
    request.onupgradeneeded=()=>{upgrade=true;request.transaction?.abort();};
    request.onerror=()=>reject(Error(upgrade
      ?"Los originales no están disponibles en este contenedor del navegador."
      :"No se pudo abrir el almacenamiento local de PDF."));
    request.onsuccess=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE)){
        db.close();reject(Error("El almacén local de originales no existe."));return;
      }
      let file;
      const tx=db.transaction(STORE,"readonly");
      tx.onerror=()=>{db.close();reject(tx.error||Error("Error de lectura del PDF."));};
      tx.onabort=()=>{db.close();reject(tx.error||Error("Lectura cancelada."));};
      const read=tx.objectStore(STORE).get(clave);
      read.onsuccess=()=>{file=read.result;};
      read.onerror=()=>reject(read.error||Error("No se pudo leer el PDF."));
      tx.oncomplete=()=>{
        db.close();
        if(!file)reject(Error("Ese PDF ya no aparece en el almacenamiento local."));
        else resolve(file);
      };
    };
  });
  if(!(blob instanceof Blob)||blob.size===0||blob.size>50*1024*1024)
    throw Error("El original no es un PDF válido o supera 50 MB.");
  const start=String.fromCharCode(...new Uint8Array(await blob.slice(0,5).arrayBuffer()));
  if(start!=="%PDF-")throw Error("El archivo guardado no tiene cabecera PDF.");
  if(!cryptoApi?.subtle?.digest)throw Error("No se puede verificar la huella del PDF.");
  const hash=[...new Uint8Array(await cryptoApi.subtle.digest("SHA-256",await blob.arrayBuffer()))]
    .map(value=>value.toString(16).padStart(2,"0")).join("");
  if(parsed.tipo==="version"&&hash!==parsed.huellaEnClave)
    throw Error("La huella SHA-256 no coincide con la revisión guardada. No se ha descargado el archivo.");
  return {blob,codigo:parsed.codigo,hash,tipo:parsed.tipo};
}
