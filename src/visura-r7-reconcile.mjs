// VISURA PREPARA 15/215 · Conciliación inversa R7 → VISURA, SOLO LECTURA.
// Ni este archivo ni su controlador ejecutan escrituras en Supabase.
// El historial de impresión del servidor identifica LP pero NO la revisión/hash del PDF.
const LP=/^LP\d{2}-\d{4,6}$/;
const SHA=/^[a-f0-9]{64}$/;
const RUTA=/^documentos\/(LP\d{2}-\d{4,6})\/([a-f0-9]{64})\.pdf$/;
const MAX_LOCAL_BYTES=12*1024*1024;
const MAX_LOCAL_ROWS=5000;

export function reconciliarGeneracionesR7({localJSON,compartidas,impresiones,hoy}={}){
  if(typeof hoy!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(hoy))
    throw Error("Fecha Madrid no acreditada para conciliar.");
  if(!Array.isArray(compartidas)||!(impresiones instanceof Map))
    throw Error("La consulta compartida de impresión no es válida.");
  const raw=localJSON??"[]";
  if(typeof raw!=="string"||raw.length>MAX_LOCAL_BYTES)throw Error("Estado local de R7 demasiado grande.");
  let local;
  try{local=JSON.parse(raw)}catch{throw Error("Estado local de R7 ilegible.");}
  if(!Array.isArray(local)||local.length>MAX_LOCAL_ROWS)throw Error("Registro local R7 no válido.");
  const mLocal=new Map(),mRemote=new Map();
  for(const row of local){
    if(!row||typeof row!=="object")throw Error("Fila local R7 inválida.");
    const code=String(row.id??"");
    if(!LP.test(code)||mLocal.has(code))throw Error("Identificadores R7 inválidos o duplicados.");
    mLocal.set(code,row);
  }
  for(const row of compartidas){
    if(!row||!LP.test(String(row.codigo??""))||row.almacen!=="COR_01_COR"||
      row.estado!=="publicada"||mRemote.has(row.codigo))
      throw Error("La consulta VISURA contiene una LP inválida o duplicada.");
    mRemote.set(row.codigo,row);
  }
  const items=[],counts={
    pendientes:0,bloqueoFecha:0,revisionDistinta:0,localInvalidado:0,
    servidorSinHash:0,soloServidor:0,fueraDePanel:0,pendienteImportar:0
  };
  const add=(codigo,estado,detail="")=>{items.push({codigo,estado,detail});counts[estado]++;};
  for(const row of compartidas){
    const local=mLocal.get(row.codigo);
    const attempts=Number(impresiones.get(row.codigo)??0);
    if(!Number.isInteger(attempts)||attempts<0)throw Error("Contador de impresión compartido inválido.");
    const match=RUTA.exec(String(row.documento_ruta??""));
    if(!match||match[1]!==row.codigo){
      add(row.codigo,"revisionDistinta","No se acredita la ruta del PDF actual en VISURA.");
      continue;
    }
    const serverHash=match[2];
    if(!local){
      if(attempts>0)add(row.codigo,"soloServidor","Generado en VISURA; no existe esta LP en R7 local.");
      else counts.pendienteImportar++;
      continue;
    }
    if(typeof local.pdfHash!=="string"||!SHA.test(local.pdfHash)||
       local.pdfHash!==serverHash){
      add(row.codigo,"revisionDistinta","El PDF local no coincide con la revisión publicada.");
      continue;
    }
    const marked=local.listadoGeneradoAt!=null||local.listadoGeneradoHash!=null;
    const complete=typeof local.listadoGeneradoAt==="string"&&
      !Number.isNaN(Date.parse(local.listadoGeneradoAt))&&
      local.listadoGeneradoHash===local.pdfHash;
    if(marked&&!complete){
      add(row.codigo,"localInvalidado","Marca local incompleta o de otra versión del PDF.");
      continue;
    }
    if(attempts>0){
      add(row.codigo,"servidorSinHash","VISURA registra "+attempts+
        " generación(es), pero su histórico no identifica la huella del PDF.");
      continue;
    }
    if(!complete){counts.pendienteImportar++;continue;}
    if(String(row.fecha??"").slice(0,10)!==hoy){
      add(row.codigo,"bloqueoFecha","La RPC actual exige fecha documental "+hoy+
        "; esta LP tiene "+String(row.fecha??"sin fecha")+".");
      continue;
    }
    add(row.codigo,"pendientes","Listado R7 generado localmente; pendiente de registrar en VISURA.");
  }
  for(const [code,local] of mLocal){
    if(mRemote.has(code))continue;
    if(SHA.test(String(local.pdfHash??""))&&local.listadoGeneradoHash===local.pdfHash&&
      typeof local.listadoGeneradoAt==="string"&&!Number.isNaN(Date.parse(local.listadoGeneradoAt)))
      add(code,"fueraDePanel","R7 tiene un listado generado sin LP publicada en el panel autorizado.");
  }
  return {counts,items,rowsServidor:compartidas.length,locales:local.length,
    // Intencionalmente no equivale a GO de escritura; fecha+hash no bastan sin RPC por versión.
    escrituraAutorizada:false};
}
