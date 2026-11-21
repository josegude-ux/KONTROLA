// VISURA PREPARA 15/215 · CP014 · plan de sincronización sin escrituras.
// Recupera los candidatos de la conciliación existente. NO llama a ninguna RPC.
// Habilitar un envío requiere autorización, migración y E2E de dos dispositivos.
import {reconciliarGeneracionesR7} from "./visura-r7-reconcile.mjs";

const HASH=/^[a-f0-9]{64}$/;
const LP=/^LP\d{2}-\d{4,6}$/;
export const ESCRITURA_R7_HABILITADA=false;
export const MAX_PLAN_R7=5;

export function prepararSincronizacionR7({localJSON,compartidas,impresiones,hoy}={}){
  const audit=reconciliarGeneracionesR7({localJSON,compartidas,impresiones,hoy});
  const raw=JSON.parse(localJSON??"[]");
  const byId=new Map(raw.map(row=>[row.id,row]));
  const remote=new Map(compartidas.map(row=>[row.codigo,row]));
  const pendientes=audit.items.filter(item=>item.estado==="pendientes");
  const candidatos=[];
  for(const item of pendientes.slice(0,MAX_PLAN_R7)){
    const local=byId.get(item.codigo),server=remote.get(item.codigo);
    const hash=String(local?.pdfHash??"");
    if(!LP.test(item.codigo)||!HASH.test(hash)||
       local.listadoGeneradoHash!==hash||
       String(server?.documento_ruta)!=="documentos/"+item.codigo+"/"+hash+".pdf"||
       server?.almacen!=="COR_01_COR"||server?.estado!=="publicada"||
       !local.listadoGeneradoAt||Number.isNaN(Date.parse(local.listadoGeneradoAt)))
      throw Error("LP sin prueba suficiente para preparar el registro.");
    candidatos.push(Object.freeze({
      p_almacen:"COR_01_COR",
      p_codigo:item.codigo,
      p_documento_hash:hash,
      p_local_generado_en:new Date(local.listadoGeneradoAt).toISOString()
    }));
  }
  return Object.freeze({
    audit,
    candidatos,
    pendientesExtra:Math.max(0,pendientes.length-candidatos.length),
    rpcPrevista:"kontrola_registrar_generacion_r7",
    // Bloqueo incondicional; ninguna ruta de ejecución puede escribir en LAB.
    escrituraHabilitada:ESCRITURA_R7_HABILITADA,
    estado:"PLAN_SIN_EJECUCION"
  });
}
