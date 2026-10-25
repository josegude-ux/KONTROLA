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
          aviso:"Se han leído únicamente las claves del almacén, NO los archivos PDF ni su contenido. Las huellas almacenadas en la clave no se han recalculado."});
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
