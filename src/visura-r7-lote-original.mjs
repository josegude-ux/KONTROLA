// VISURA-215 LAB · Ensamblado de originales BC por LP (máximo 5 cargas).
// Vista preliminar de solo lectura: NO registra impresión ni modifica Storage.
export const MAX_ORIGINALES_LAB=5;

export async function componerLoteOriginalR7({rows,preparar,autorizado=()=>true,pdfLib=null}={}){
 if(!Array.isArray(rows)||!rows.length||rows.length>MAX_ORIGINALES_LAB||
   typeof preparar!=="function"||typeof autorizado!=="function")
   throw Error("Selecciona entre una y cinco cargas para revisión de originales BC.");
 const seen=new Set();
 for(const row of rows){
   const code=String(row?.codigo||"");
   if(!/^LP\d{2}-\d{4,6}$/.test(code)||seen.has(code)||row?.almacen!=="COR_01_COR")
     throw Error("LP repetida, inválida o procedente de otro almacén.");
   seen.add(code);
 }
 const engine=pdfLib||await import("../vendor/pdf-lib.min.mjs");
 if(!engine?.PDFDocument?.create||!engine?.PDFDocument?.load)
   throw Error("Motor de composición PDF no disponible.");
 const merged=await engine.PDFDocument.create();
 const paginasPorLP=[],avisos=[];
 for(const row of rows){
   if(!autorizado())throw Error("La sesión o el almacén ha cambiado durante la operación.");
   const result=await preparar(row);
   if(!autorizado())throw Error("La sesión o el almacén ha cambiado durante la operación.");
   if(!result?.bytes||result.codigo!==row.codigo)
     throw Error("El original preparado no corresponde a la LP solicitada.");
   const src=await engine.PDFDocument.load(result.bytes);
   const count=src.getPageCount();
   if(count<2||count%2!==0||merged.getPageCount()+count>140)
     throw Error("El PDF original de "+row.codigo+" no respeta la paridad dúplex o supera el límite de LAB.");
   const pages=await merged.copyPages(src,src.getPageIndices());
   pages.forEach(page=>merged.addPage(page));
   paginasPorLP.push({codigo:row.codigo,paginas:count,hojasFrio:result.hojasFrio||0});
   if(result.sinDestinoFrio)avisos.push(row.codigo+": ZFRIO sin destino CORUÑA acreditado; hoja individual omitida.");
 }
 if(!autorizado())throw Error("La sesión ha cambiado antes de entregar el documento.");
 return {bytes:await merged.save(),paginas:merged.getPageCount(),paginasPorLP,avisos};
}
