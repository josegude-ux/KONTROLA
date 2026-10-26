import test from "node:test";
import assert from "node:assert/strict";
import {PDFDocument} from "pdf-lib";
import {parseDocumentPages} from "../src/core.mjs";
import {analyzeDocument} from "../src/document-review.mjs";
import {buildPreparationReport} from "../src/report.mjs";
import {generarPdfHojas} from "../src/print-pdf.mjs";
import {unirPaginasCor1YDetalle} from "../src/mixed-print.mjs";

function page(warehouse,number,sku,qty){
 const cells=[
  ["Almacén: "+warehouse,20,12],["Fecha carga: 26/10/2026",20,30],
  ["M E R C A N C Í A",20,76],["A101-1 "+sku,80,108],
  ["Producto "+warehouse,310,108],[String(qty),700,108],
  ["CAJA",900,108],["Total referencias prod. 1",20,183],
  ["TOTAL:",500,183],[String(qty),700,183]
 ];
 return {number,width:1000,items:cells.map(([text,x,y])=>({text,x,y}))};
}
const pages=()=>[
 page("COR_02_NAR",1,"PRD0000002",5),
 page("COR_01_COR",2,"PRD0000001",3),
 page("COR_02_NAR",3,"PRD0000003",7)
];
test("F19711 es una ruta Ferrol pero prepara SOLO COR1",()=>{
 const parsed=parseDocumentPages(pages(),"F19711.pdf");
 assert.equal(parsed.id,"LP26-19711");
 assert.equal(parsed.warehouse,"COR_01_COR");
 assert.equal(parsed.mixedWarehouse,false);
 assert.deepEqual(parsed.pageNumbers,[2]);
 assert.deepEqual(parsed.products.map(x=>x.sku),["PRD0000001"]);
 assert.equal(parsed.actualTotal,3);
 assert.equal(analyzeDocument(parsed).some(x=>x.code==="mixed_warehouse"),false);
});
test("C19711 también prepara solo COR1",()=>{
 const p=parseDocumentPages(pages(),"C19711.pdf");
 assert.deepEqual(p.products.map(x=>x.sku),["PRD0000001"]);
 assert.equal(p.warehouse,"COR_01_COR");
});
test("el detalle COR2 se lee desde el mismo original sin crear otro LP",()=>{
 const main=parseDocumentPages(pages(),"F19711.pdf",{warehouse:"COR_01_COR"});
 const other=parseDocumentPages(pages(),"F19711.pdf",{warehouse:"COR_02_NAR"});
 assert.equal(main.id,other.id);
 assert.deepEqual(other.pageNumbers,[1,3]);
 assert.deepEqual(other.products.map(x=>x.sku),["PRD0000002","PRD0000003"]);
 assert.deepEqual(main.products.map(x=>x.sku),["PRD0000001"]);
 const info=buildPreparationReport({codigo:other.id,almacen:other.warehouse,productos:other.products},{informativoCor2:true});
 assert.match(info,/SOLO INFORMATIVA/);
 assert.match(info,/no se prepara ni se procesa/);
 assert.doesNotMatch(info,/PRD0000001/);
});
test("no se manda a preparación un archivo sin mercancía COR1",()=>{
 assert.throws(()=>parseDocumentPages([page("COR_02_NAR",1,"PRD0000002",5)],"F19711.pdf",{warehouse:"COR_01_COR"}),/no aparece|no contiene/);
});
test("combinar originales COR1 y hoja detallada no añade ninguna página de COR2",async()=>{
 const source=await PDFDocument.create();
 source.addPage([320,320]); // COR2
 source.addPage([490,670]); // COR1
 source.addPage([370,370]); // COR2
 const detail=generarPdfHojas([{tipo:"carga",titulo:"HOJA DE PREPARACIÓN POR PASILLOS",
  cabecera:["Almacén: COR_01_COR","Carga: LP26-19711"],pasillos:[
   {titulo:"Pasillo A",lineas:[{referencia:"PRD0000001",cantidad:3,unidad:"CAJA",descripcion:"Producto COR1",ubicacion:"A101-1"}]}
  ]}]);
 const result=await unirPaginasCor1YDetalle({original:await source.save(),numeroPaginasCor1:[2],detalle:detail},{PDFDocument});
 const merged=await PDFDocument.load(result);
 assert.equal(merged.getPageCount(),2);
 assert.equal(merged.getPage(0).getWidth(),490);
 assert.equal(merged.getPage(0).getHeight(),670);
 assert.ok(merged.getPage(1).getWidth()>590);
});
test("sin páginas COR1 verificadas no permite generar impresión",async()=>{
 await assert.rejects(()=>unirPaginasCor1YDetalle({original:new Uint8Array([1]),numeroPaginasCor1:[],detalle:new Uint8Array([1])},{PDFDocument}),/No hay páginas originales COR1/);
});
