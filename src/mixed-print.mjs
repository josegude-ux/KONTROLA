// Solo se imprime un subconjunto documental de COR1, sin alterar el PDF BC.
// La librería queda empaquetada localmente en despliegue, también para uso offline.
export async function unirPaginasCor1YDetalle({original,numeroPaginasCor1,detalle},pdfLib=null){
 const source=original instanceof Uint8Array?original:new Uint8Array(original||[]);
 const detail=detalle instanceof Uint8Array?detalle:new Uint8Array(detalle||[]);
 const indexes=numeroPaginasCor1;
 if(!source.length||!detail.length||!Array.isArray(indexes)||!indexes.length||
   indexes.some(n=>!Number.isSafeInteger(n)||n<1)||new Set(indexes).size!==indexes.length)
   throw Error("No hay páginas originales COR1 verificadas y una hoja de detalle válida.");
 const {PDFDocument}=pdfLib||await import("../vendor/pdf-lib.min.mjs");
 const originalDoc=await PDFDocument.load(source),detailDoc=await PDFDocument.load(detail);
 if(indexes.some(n=>n>originalDoc.getPageCount()))
   throw Error("Páginas COR1 fuera del documento original: se ha cancelado la impresión.");
 if(!detailDoc.getPageCount())throw Error("La hoja de detalle está vacía.");
 const combined=await PDFDocument.create();
 // Primero páginas originales exclusivamente COR1, en su orden original.
 const selected=await combined.copyPages(originalDoc,indexes.map(n=>n-1));
 for(const page of selected)combined.addPage(page);
 // A continuación, la hoja de detalle procesada con el diseño VISURA PREPARA.
 const detailPages=await combined.copyPages(detailDoc,detailDoc.getPageIndices());
 for(const page of detailPages)combined.addPage(page);
 return combined.save();
}
