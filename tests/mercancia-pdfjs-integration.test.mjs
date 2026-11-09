import test from "node:test";
import assert from "node:assert/strict";
import {PDFDocument,StandardFonts} from "pdf-lib";
import {getDocument} from "pdfjs-dist/legacy/build/pdf.mjs";
import {planificarRecortesMercancia} from "../src/mercancia-v056.mjs";

test("PDF ficticio real: recorte de MERCANCIA por coordenadas excluye CONTROL ENVASES",async()=>{
 const doc=await PDFDocument.create();
 const font=await doc.embedFont(StandardFonts.Helvetica);
 const draw=(page,text,y)=>page.drawText(text,{x:36,y,size:12,font});
 const a=doc.addPage([595,842]);
 draw(a,"Almacen: COR_01_COR",795);draw(a,"MERCANCIA",735);
 draw(a,"PRD0000001",655);draw(a,"Total referencias prod.: 1",222);
 draw(a,"CONTROL ENVASES",155);draw(a,"PALETS",105);
 const b=doc.addPage([595,842]);
 draw(b,"Almacen: COR_02_NAR",795);draw(b,"MERCANCIA",735);
 draw(b,"PRD0000002",655);draw(b,"Total referencias prod.: 1",222);
 draw(b,"CONTROL ENVASES",155);
 const bytes=await doc.save();
 const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true,disableFontFace:true});
 try{
  const pdf=await task.promise;
  const pages=[];
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),v=page.getViewport({scale:1}),items=(await page.getTextContent()).items;
   pages.push({number:n,height:v.height,items:items.map(x=>({text:x.str,x:x.transform?.[4]??0,y:v.height-(x.transform?.[5]??0)}))});
  }
  const cor=planificarRecortesMercancia(pages,{warehouse:"COR_01_COR"});
  const fer=planificarRecortesMercancia(pages,{warehouse:"COR_02_NAR"});
  assert.deepEqual(cor.pages.map(p=>p.pageNumber),[1]);
  assert.deepEqual(fer.pages.map(p=>p.pageNumber),[2]);
  const ctrl=pages[0].items.find(x=>x.text.includes("CONTROL ENVASES"));
  const total=pages[0].items.find(x=>x.text.includes("Total referencias"));
  assert.ok(total&&ctrl);
  assert.ok(cor.pages[0].bottom>total.y,"Incluye el total de referencias");
  assert.ok(cor.pages[0].bottom<ctrl.y,"No incluye envases");
  assert.ok(cor.pages[0].bottom<pages[0].items.find(x=>x.text==="PALETS").y,"No incluye palets");
 }finally{await task.destroy();}
});
