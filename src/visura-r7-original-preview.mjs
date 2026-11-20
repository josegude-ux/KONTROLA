// Adaptador LAB R7: descarga privada y comprobación de integridad del original BC.
// La autorización se aplica por la RLS existente de Supabase Storage.
import {parsePdfFile} from "./pdf.mjs";
import {buildPreparationReport} from "./report.mjs";
import {generarPdfHojas,extraerHojasDeInforme} from "./print-pdf.mjs";
import {recortarMercanciaCor1,crearVistaOriginalCor1R7} from "./visura-r7-corte-mercancia.mjs";

export function comprobarRutaOriginalCor1(row){
  if(row?.almacen!=="COR_01_COR"||!/^LP\d{2}-\d{4,6}$/.test(String(row?.codigo||"")))
    throw Error("La carga no pertenece a COR1 o carece de LP acreditada.");
  const path=String(row?.documento_ruta||"");
  if(!/^documentos\/LP\d{2}-\d{4,6}\/[a-f0-9]{64}\.pdf$/.test(path)||
    path.split("/")[1]!==row.codigo)throw Error("Ruta del original no acreditada.");
  return {path,hash:path.split("/")[2].slice(0,64)};
}

export async function prepararVistaOriginalR7({client,bucket,row}){
  if(!client||!bucket||!row)throw Error("Faltan parámetros autorizados.");
  const {path,hash}=comprobarRutaOriginalCor1(row);
  const {data,error}=await client.storage.from(bucket).download(path);
  if(error)throw error;
  if(!data||!data.size||data.size>26214400)throw Error("PDF original ausente o demasiado grande.");
  const file=new File([data],row.codigo+".pdf",{type:"application/pdf"});
  const digest=[...new Uint8Array(await crypto.subtle.digest("SHA-256",await file.arrayBuffer()))]
    .map(value=>value.toString(16).padStart(2,"0")).join("");
  if(digest!==hash)throw Error("La huella del PDF original no coincide con la ruta almacenada.");
  const parsed=await parsePdfFile(file,{warehouse:"COR_01_COR"});
  if(parsed.id!==row.codigo||parsed.warehouse!=="COR_01_COR"||
    !Array.isArray(parsed.pageNumbers)||!parsed.pageNumbers.length)
    throw Error("El original no acredita COR1 y el código LP seleccionado.");
  // El recortador falla cerrado si no localiza el fin real de MERCANCÍA
  // o si detecta otra sección de almacén en las páginas seleccionadas.
  const pages=await recortarMercanciaCor1(file,parsed.pageNumbers);
  const wrapper=document.createElement("div");
  wrapper.innerHTML=buildPreparationReport(row);
  const detail=generarPdfHojas(extraerHojasDeInforme(wrapper));
  const bytes=await crearVistaOriginalCor1R7({paginas:pages,detalle:detail,codigo:row.codigo});
  return {bytes,paginasOriginales:pages.length,codigo:row.codigo};
}
